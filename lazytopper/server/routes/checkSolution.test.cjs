// Targeted regression tests for the grader — `server/routes/checkSolution.cjs`.
//
// ★ WHY THIS FILE EXISTS. `checkSolution.cjs` was a blanket-FORBIDDEN path in two
// acceptance gates (`check_improve_convergence_acceptance.mjs` and
// `check_improve_overlay_additive_acceptance.mjs`). The owner named it directly as
// untouchable, for a real reason. Two lanes now need to edit it (the responseSchema
// lane, then Quick Practice batch grading), so — following the #519 precedent that
// lifted the DesktopShell.tsx ban — the protection CHANGES FORM rather than
// disappearing: the blanket ban is replaced by these targeted tests.
//
// ★ NOT PINNED HERE, DELIBERATELY: the OBJECTIVE EXCEPTION (MCQ / Assertion-Reason /
// Section A never step-marked; whole mark or zero). It is already pinned — with
// negative controls, against the real route module, on BOTH grader functions — by
// `lazytopper/scripts/ops/objective_dedup_acceptance.mjs` (npm script
// `test:objective:dedup`). Duplicating it would create two places to update and one
// to forget. Look there, not here.
//
// ★★ THE C2 CONTRACT (§6). The parser is far LOOSER than the grading prompt asks for:
// only a top-level `annotatedSteps` array and a per-step `description` are
// structurally required; everything else is optional, defaulted, nullable or coerced.
// A `responseSchema` must be EXACTLY AS LOOSE AS THE PARSER, NEVER TIGHTER — a
// tighter schema constrains the MARKING ITSELF (a fixed step count, or a
// non-nullable mistakeType, would forbid the nulls that grading rules 4/5/6/7 all
// depend on). §6 asserts that accepted range, so "no tighter than the parser" is an
// executable rule rather than a sentence in a spec. Tighten the schema past the
// parser and §6 goes red.

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCheckSolutionRoute } = require('./checkSolution.cjs');

// ── Harness ────────────────────────────────────────────────────────────────────
// `extractJsonObjectFromText` mirrors the real one's CONTRACT: a parsed object, or
// null when the text is not recoverable JSON. Returning null (not throwing) is what
// makes a "parse miss" reach the retry gate instead of the outer catch.
function lenientExtract(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

/**
 * @param replies  array of model reply bodies, one per callGemini invocation. A
 *                 string is sent verbatim (use for unparseable text); an object is
 *                 JSON-stringified. The LAST entry repeats if more calls are made.
 */
function buildRoute({ replies = [{}], stub = false, depOverrides = {} } = {}) {
  const calls = [];
  let captured = null;
  const deps = {
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async (model, contents, genConfig) => {
      const i = Math.min(calls.length, replies.length - 1);
      calls.push({ model, contents, genConfig });
      const r = replies[i];
      return { text: typeof r === 'string' ? r : JSON.stringify(r), raw: {} };
    },
    GEMINI_MODEL: 'test-model',
    ACTIVE_PROVIDER: 'test',
    isStubMode: () => stub,
    extractJsonObjectFromText: lenientExtract,
    buildGeminiImagePart: () => ({ inlineData: {} }),
    validateMentorImagePayload: () => ({ ok: true }),
    // BATCH-1 (§7) needs an image part that CARRIES its base64, and a validator it
    // can make fail. Every other suite passes no overrides and is unaffected.
    ...depOverrides,
  };
  return { route: createCheckSolutionRoute(deps), calls, body: () => captured && captured.body,
    status: () => captured && captured.status };
}

// A minimal well-formed grade. `annotatedSteps` present ⇒ passes the parse gate.
const GOOD_GRADE = {
  totalMarks: 3,
  marksAwarded: 2,
  annotatedSteps: [
    { description: 'Formula stated', studentWork: 'v = u + at', status: 'correct',
      marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'ok', mistakeType: null, correctedWorking: null },
  ],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: 'Good.',
};
// Valid JSON that MISSES the parse gate: no `annotatedSteps` array.
const PARSE_MISS = { totalMarks: 3, teacherNote: 'oops' };

const SUBJECTIVE_REQ = () => ({
  question: 'Find the roots of x^2 - 2x - 8 = 0.',
  marks: 3, subject: 'Maths', textAnswer: 'x = 4, x = -2',
});

const WORKSHEET_REQ = (questions) => ({
  worksheetId: 'ws1', imageBase64: 'BASE64', imageMimeType: 'application/pdf', subject: 'Maths',
  questions,
});

/* ══════════════════════════════════════════════════════════════════════════════
   §1 · handleCheckSolution — the parse gate and the retry-once
   ══════════════════════════════════════════════════════════════════════════════ */

test('§1.1 CONTROL: a good parse on attempt 1 issues EXACTLY ONE model call (the retry is not always firing)', async () => {
  const h = buildRoute({ replies: [GOOD_GRADE] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.calls.length, 1);
  assert.equal(h.body().ok, true);
});

test('§1.2 a parse miss retries ONCE and the retry\'s grade is what ships', async () => {
  const h = buildRoute({ replies: [PARSE_MISS, GOOD_GRADE] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.calls.length, 2, 'expected exactly one retry');
  assert.equal(h.body().ok, true);
  assert.equal(h.body().annotatedSteps[0].description, 'Formula stated');
});

test('§1.3 both attempts miss → EXACTLY TWO calls (no loop) and an honest 200 ok:false', async () => {
  const h = buildRoute({ replies: [PARSE_MISS, PARSE_MISS] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.calls.length, 2, 'the retry must not loop — its outcome is final');
  assert.equal(h.status(), 200);
  assert.equal(h.body().ok, false);
  assert.match(h.body().error, /couldn't read the grading/);
});

test('§1.4 the parse gate is `Array.isArray(annotatedSteps)` — an EMPTY array passes it (no retry)', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [], teacherNote: 'nothing readable' }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.calls.length, 1, 'an empty steps array is a GOOD parse — it must not trigger a retry');
  assert.equal(h.body().ok, true);
});

test('§1.5 unparseable TEXT (not JSON) also reaches the retry gate, not the 500 catch', async () => {
  const h = buildRoute({ replies: ['```json\n{"annotatedSteps": [ truncated', GOOD_GRADE] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.calls.length, 2);
  assert.equal(h.status(), 200);
  assert.equal(h.body().ok, true);
});

/* ══════════════════════════════════════════════════════════════════════════════
   §2 · gradeStructuredSet (worksheet) — a SEPARATE retry with a DIFFERENT gate
   ★ The two retry paths do NOT share a parse gate: this one keys on `results`,
     §1 keys on `annotatedSteps`. C2 therefore needs TWO response schemas, not one.
   ══════════════════════════════════════════════════════════════════════════════ */

const WS_GOOD = { results: [{ qNumber: 1, annotatedSteps: [{ description: 'step', studentWork: 'w', status: 'correct', marksAwarded: 1 }] }], summary: 'ok' };

test('§2.1 CONTROL: a good worksheet parse issues exactly one model call', async () => {
  const h = buildRoute({ replies: [WS_GOOD] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 1, questionText: 'Q1' }]), {});
  assert.equal(h.calls.length, 1);
  assert.equal(h.body().ok, true);
});

test('§2.2 a worksheet parse miss retries ONCE, then gives up (exactly two calls)', async () => {
  const h = buildRoute({ replies: [{ summary: 'no results key' }, { summary: 'still none' }] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 1, questionText: 'Q1' }]), {});
  assert.equal(h.calls.length, 2);
  assert.equal(h.body().ok, false);
});

test('§2.3 ★ the worksheet gate keys on `results`, NOT `annotatedSteps` — the gates are not interchangeable', async () => {
  // A payload shaped for the SINGLE-question gate must MISS the worksheet gate.
  const h = buildRoute({ replies: [GOOD_GRADE, WS_GOOD] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 1, questionText: 'Q1' }]), {});
  assert.equal(h.calls.length, 2, 'annotatedSteps-shaped JSON is a MISS for the worksheet gate');
  assert.equal(h.body().ok, true);
});

test('§2.4 normaliseStructuredResult is a PURE normaliser — N questions still cost ONE model call', async () => {
  const many = { results: [1, 2, 3].map((n) => ({ qNumber: n, annotatedSteps: [{ description: 's', studentWork: 'w', status: 'correct', marksAwarded: 1 }] })), summary: 'ok' };
  const h = buildRoute({ replies: [many] });
  await h.route.handleGradeWorksheet(
    WORKSHEET_REQ([1, 2, 3].map((n) => ({ qNumber: n, marks: 1, questionText: `Q${n}` }))), {});
  assert.equal(h.calls.length, 1, 'normalisation must never be a network path');
  assert.equal(h.body().results.length, 3);
});

/* ══════════════════════════════════════════════════════════════════════════════
   §3 · THE THREE generationConfigs ARE SEPARATE MECHANISMS
   ★ Three distinct caps for three distinct reasons, and `thinkingBudget: 0` is set
     on exactly ONE of them. Folding them into one shared constant would break the
     reason each exists. DO NOT LOWER THESE — the caps are headroom against
     MAX_TOKENS truncation, and the grader's thinking is deliberately UNCAPPED.
   ══════════════════════════════════════════════════════════════════════════════ */

test('§3.1 the GRADING call: maxOutputTokens 16000, JSON mime, and NO thinking cap', async () => {
  const h = buildRoute({ replies: [GOOD_GRADE] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  const cfg = h.calls[0].genConfig;
  assert.equal(cfg.maxOutputTokens, 16000, 'headroom for long multi-step grades — do not lower');
  assert.equal(cfg.responseMimeType, 'application/json');
  assert.equal(cfg.thinkingConfig, undefined,
    'grading thinking is deliberately dynamic/uncapped — see [FU-EFF-THINKING-BUDGET]');
});

test('§3.2 the DETECT call: maxOutputTokens 4096 AND thinkingBudget 0 (a different fix, different cause)', async () => {
  const h = buildRoute({ replies: [{ detectedMarks: 3, marksSource: 'stated', detectedSubject: 'Maths' }] });
  await h.route.handleDetectQuestion({ question: 'What is the value of x?' }, {});
  const cfg = h.calls[0].genConfig;
  assert.equal(cfg.maxOutputTokens, 4096);
  assert.deepEqual(cfg.thinkingConfig, { thinkingBudget: 0 },
    'thinking off here: at a 400-token cap the thoughts ate the budget and the JSON truncated');
});

test('§3.3 the WORKSHEET call: maxOutputTokens 32000, no thinking cap', async () => {
  const h = buildRoute({ replies: [WS_GOOD] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 1, questionText: 'Q1' }]), {});
  const cfg = h.calls[0].genConfig;
  assert.equal(cfg.maxOutputTokens, 32000);
  assert.equal(cfg.thinkingConfig, undefined);
});

test('§3.4 ★ the three caps are pairwise DISTINCT (one shared constant would fail this)', async () => {
  const grade = buildRoute({ replies: [GOOD_GRADE] });
  await grade.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  const detect = buildRoute({ replies: [{ detectedMarks: 3 }] });
  await detect.route.handleDetectQuestion({ question: 'q' }, {});
  const ws = buildRoute({ replies: [WS_GOOD] });
  await ws.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 1, questionText: 'Q1' }]), {});

  const caps = [grade.calls[0].genConfig.maxOutputTokens, detect.calls[0].genConfig.maxOutputTokens,
    ws.calls[0].genConfig.maxOutputTokens];
  assert.equal(new Set(caps).size, 3, `three separate mechanisms, three caps — got ${JSON.stringify(caps)}`);
});

test('§3.5 ★ DETECT DOES NOT RETRY — a parse miss costs ONE call, unlike the two grade paths', async () => {
  const h = buildRoute({ replies: ['not json at all', { detectedMarks: 3 }] });
  await h.route.handleDetectQuestion({ question: 'What is the value of x?' }, {});
  assert.equal(h.calls.length, 1, 'the retry belongs to the GRADE paths, not to detect');
  assert.equal(h.body().ok, false);
  assert.match(h.body().error, /couldn't read the question/);
});

/* ══════════════════════════════════════════════════════════════════════════════
   §4 · NO WORKING SHOWN → mistakeType null — and the reconcile that makes it stick
   ★ Three layers, and the prompt rule is the weakest. The ENFORCEMENT is
     applyObjectiveMistakeGuard; the layer that makes it OBSERVABLE is the
     `rawAdjusted` subtraction, without which the nulled type walks straight back in
     through the model's own mistakeSummary.
   ══════════════════════════════════════════════════════════════════════════════ */

const noWorkingGrade = (summary) => ({
  totalMarks: 3, marksAwarded: 0,
  annotatedSteps: [
    { description: 'Final answer only', studentWork: '', status: 'incorrect',
      marksAwarded: 0, marksDeducted: 3, teacherAnnotation: 'wrong', mistakeType: 'conceptual' },
  ],
  mistakeSummary: summary,
  teacherNote: 'n',
});

test('§4.1 an INCORRECT step with no working has its fabricated mistakeType nulled', async () => {
  const h = buildRoute({ replies: [noWorkingGrade({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 })] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().annotatedSteps[0].mistakeType, null);
  assert.equal(h.body().annotatedSteps[0].status, 'incorrect', 'the marks are still not earned — only the TYPE is null');
});

test('§4.2 ★★ THE RECONCILE: the model ALSO reporting conceptual:1 must not re-introduce the nulled type', async () => {
  // Without `rawAdjusted` subtracting noWorkingNulled, max(rawSummary, stepFloor)
  // would surface conceptual:1 even though the per-step type was nulled.
  const h = buildRoute({ replies: [noWorkingGrade({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 })] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().annotatedSteps[0].mistakeType, null);
  assert.equal(h.body().mistakeSummary.conceptual, 0,
    'the no-working guard must drive the bucket to 0 from BOTH sources');
});

test('§4.3 NEGATIVE CONTROL: an incorrect step WITH working KEEPS its type and its count', async () => {
  const withWorking = noWorkingGrade({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 });
  withWorking.annotatedSteps[0].studentWork = 'x = 2 and x = 8 read off the coefficients';
  const h = buildRoute({ replies: [withWorking] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().annotatedSteps[0].mistakeType, 'conceptual', 'MI must still learn from real working');
  assert.equal(h.body().mistakeSummary.conceptual, 1);
});

test('§4.4 the guard is NARROW: it fires only on status "incorrect" — a PARTIAL step keeps its type', async () => {
  const partial = noWorkingGrade({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
  partial.annotatedSteps[0].status = 'partial';
  const h = buildRoute({ replies: [partial] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().annotatedSteps[0].mistakeType, 'conceptual',
    'documented behaviour: applyObjectiveMistakeGuard keys on `status === "incorrect"`');
});

test('§4.5 the ADDITIVE FLOOR still lifts a summary the model left at zero', async () => {
  const tagged = {
    totalMarks: 3, marksAwarded: 1,
    annotatedSteps: [{ description: 'Arithmetic', studentWork: '12 x 1.73 = 20.16', status: 'incorrect',
      marksAwarded: 0, marksDeducted: 1, teacherAnnotation: 'a', mistakeType: 'calculation' }],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: 'n',
  };
  const h = buildRoute({ replies: [tagged] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().mistakeSummary.calculation, 1,
    'the LLM leaves counters at 0 while tagging steps — the floor is the fix');
});

test('§4.6 the worksheet path mirrors §4.2 (the two graders are kept in sync)', async () => {
  const h = buildRoute({ replies: [{ results: [{ qNumber: 1,
    annotatedSteps: [{ description: 'Answer only', studentWork: '', status: 'incorrect', marksAwarded: 0, mistakeType: 'silly' }],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 } }], summary: 's' }] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 3, questionText: 'Q1' }]), {});
  const r = h.body().results[0];
  assert.equal(r.annotatedSteps[0].mistakeType, null);
  assert.equal(r.mistakeSummary.silly, 0);
});

/* ══════════════════════════════════════════════════════════════════════════════
   §5 · ★★ PARSER LOOSENESS — THE responseSchema CONTRACT
   Every assertion here states a shape the parser ACCEPTS. A responseSchema that
   forbids any of them is TIGHTER THAN THE PARSER, which is the one thing C2 must
   never do. MUTATION TARGET: tighten the schema and these go red.
   ══════════════════════════════════════════════════════════════════════════════ */

test('§5.1 a step carrying ONLY `description` is accepted and fully defaulted', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [{ description: 'Bare step' }] }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.deepEqual(h.body().annotatedSteps[0], {
    stepNumber: 1, description: 'Bare step', studentWork: '', status: 'partial',
    marksAwarded: 0, marksDeducted: 0, teacherAnnotation: '', mistakeType: null, correctedWorking: null,
  }, 'description is the ONLY structurally required step field');
});

test('§5.2 a step with NO description is DROPPED, and stepNumber is RE-INDEXED (model numbering discarded)', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [
    { stepNumber: 99, description: 'kept A', studentWork: 'w', status: 'correct', marksAwarded: 1 },
    { stepNumber: 7, studentWork: 'no description', status: 'correct', marksAwarded: 1 },
    { stepNumber: 42, description: 'kept B', studentWork: 'w', status: 'correct', marksAwarded: 1 },
  ] }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  const steps = h.body().annotatedSteps;
  assert.equal(steps.length, 2, 'the description-less step is filtered out');
  assert.deepEqual(steps.map((s) => s.stepNumber), [1, 2], 'renumbered 1..n');
  assert.deepEqual(steps.map((s) => s.description), ['kept A', 'kept B']);
});

test('§5.3 unknown enum values are COERCED, never rejected (status → "partial", mistakeType → null)', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [
    { description: 'odd', studentWork: 'w', status: 'brilliant', mistakeType: 'careless' },
  ] }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().annotatedSteps[0].status, 'partial');
  assert.equal(h.body().annotatedSteps[0].mistakeType, null);
});

test('§5.4 `mistakeType: null` must be ACCEPTED — the schema enum has to be NULLABLE', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [
    { description: 'right', studentWork: 'w', status: 'correct', marksAwarded: 1, mistakeType: null },
  ] }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().annotatedSteps[0].mistakeType, null,
    'rules 4/5/6/7 all REQUIRE null — a non-nullable enum would constrain the marking itself');
  assert.deepEqual(h.body().mistakeSummary, { conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
});

test('§5.5 marks are half-mark quantised and floored at 0 (never negative, never finer than 1/2)', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [
    { description: 'a', studentWork: 'w', status: 'partial', marksAwarded: 0.7, marksDeducted: -5 },
    { description: 'b', studentWork: 'w', status: 'partial', marksAwarded: 0.8, marksDeducted: 0 },
  ] }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  const steps = h.body().annotatedSteps;
  assert.equal(steps[0].marksAwarded, 0.5);
  assert.equal(steps[0].marksDeducted, 0, 'negative deductions clamp to 0');
  assert.equal(steps[1].marksAwarded, 1);
});

test('§5.6 top-level `mistakeSummary` and `teacherNote` are OPTIONAL', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [{ description: 'only field present' }] }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().ok, true);
  assert.equal(h.body().teacherNote, '');
  assert.deepEqual(h.body().mistakeSummary, { conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
});

test('§5.7 ★ THE CONTRACT, stated once: `{ annotatedSteps: [{ description }] }` alone is a COMPLETE valid grade', async () => {
  // If a future responseSchema marks ANY other field `required`, this goes red.
  const h = buildRoute({ replies: [{ annotatedSteps: [{ description: 'x' }] }] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().ok, true);
  assert.equal(h.status(), 200);
});

test('§5.8 the step COUNT is free — 1 step and 9 steps are both accepted for the same 3-mark question', async () => {
  // A schema pinning a fixed step count would trade grading quality for format.
  for (const n of [1, 9]) {
    const h = buildRoute({ replies: [{ annotatedSteps: Array.from({ length: n },
      (_, i) => ({ description: `s${i}`, studentWork: 'w', status: 'correct', marksAwarded: 0 })) }] });
    await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
    assert.equal(h.body().annotatedSteps.length, n, `step count ${n} must be accepted`);
  }
});

test('§5.9 autoDetect: detectedMarks OUT of the 1..6 band degrades honestly to marksSource "fallback"', async () => {
  const h = buildRoute({ replies: [{ ...GOOD_GRADE, detectedMarks: 7, marksSource: 'stated' }] });
  await h.route.handleCheckSolution({ ...SUBJECTIVE_REQ(), detectMarks: true }, {});
  assert.equal(h.body().marksSource, 'fallback', 'never present a blind default as a confident detection');
  assert.equal(h.body().totalMarks, 3, 'falls back to the caller hint');
});

test('§5.10 the auto-detect fields are absent on the trusted-marks path — one fixed schema cannot require them', async () => {
  const h = buildRoute({ replies: [GOOD_GRADE] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.body().marksSource, null);
  assert.equal(h.body().detectedSubject, null);
  assert.equal(h.body().detectedTopic, null);
});

test('§5.11 worksheet: `couldNotRead` is an honest failure — never fabricated as a 0', async () => {
  const h = buildRoute({ replies: [{ results: [{ qNumber: 1, couldNotRead: true }], summary: 's' }] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 5, questionText: 'Q1' }]), {});
  const r = h.body().results[0];
  assert.equal(r.couldNotRead, true);
  assert.equal(r.marksAwarded, undefined, 'no mark is invented for an unreadable answer');
  assert.equal(r.totalMarks, 5);
});

test('§5.12 worksheet: a question the model OMITTED becomes couldNotRead, never a silent zero', async () => {
  const h = buildRoute({ replies: [{ results: [{ qNumber: 1, annotatedSteps: [{ description: 's' }] }], summary: 's' }] });
  await h.route.handleGradeWorksheet(
    WORKSHEET_REQ([{ qNumber: 1, marks: 1, questionText: 'Q1' }, { qNumber: 2, marks: 5, questionText: 'Q2' }]), {});
  const r2 = h.body().results.find((r) => r.qNumber === 2);
  assert.equal(r2.couldNotRead, true);
});

/* ══════════════════════════════════════════════════════════════════════════════
   §6 · ★★ THE responseSchema CONTRACT, MADE EXECUTABLE (PR-C2)

   §5 above states, in prose and in behaviour, what the PARSER accepts. This section
   asserts that the SCHEMA accepts it too. The link between them is `validate()`
   below: every payload §5 proves the parser takes is run THROUGH the schema, so
   "exactly as loose as the parser, never tighter" stops being a sentence in a spec
   and becomes a thing that goes red.

   ★ MUTATION TARGET. Tighten any schema past its parser — add a `required`, drop a
   `nullable`, bound the step count — and §6 fails. Each mutation and its observed
   failure is recorded in the PR report.
   ══════════════════════════════════════════════════════════════════════════════ */

const {
  GRADE_RESPONSE_SCHEMA,
  DETECT_RESPONSE_SCHEMA,
  WORKSHEET_RESPONSE_SCHEMA,
} = require('./checkSolution.cjs');

/**
 * A minimal validator for the subset of the Gemini responseSchema dialect these
 * schemas use: type / nullable / enum / properties / items / required.
 *
 * It is deliberately STRICT about the two things that matter to this lane — a
 * missing `required` key and a null in a non-nullable field — because those are
 * exactly the ways a schema silently narrows the marking. Returns an array of
 * human-readable errors; empty means valid.
 */
function validate(schema, value, path = '$') {
  const errs = [];
  if (value === null || value === undefined) {
    if (!schema.nullable) errs.push(`${path}: null/absent but schema is not nullable`);
    return errs;
  }
  switch (schema.type) {
    case 'OBJECT': {
      if (typeof value !== 'object' || Array.isArray(value)) {
        errs.push(`${path}: expected OBJECT, got ${Array.isArray(value) ? 'ARRAY' : typeof value}`);
        break;
      }
      for (const key of schema.required || []) {
        if (!Object.prototype.hasOwnProperty.call(value, key) || value[key] === undefined) {
          errs.push(`${path}.${key}: REQUIRED by the schema but absent from the payload`);
        }
      }
      for (const [key, sub] of Object.entries(schema.properties || {})) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          errs.push(...validate(sub, value[key], `${path}.${key}`));
        }
      }
      break;
    }
    case 'ARRAY': {
      if (!Array.isArray(value)) { errs.push(`${path}: expected ARRAY`); break; }
      if (schema.minItems != null && value.length < schema.minItems) {
        errs.push(`${path}: ${value.length} items < minItems ${schema.minItems}`);
      }
      if (schema.maxItems != null && value.length > schema.maxItems) {
        errs.push(`${path}: ${value.length} items > maxItems ${schema.maxItems}`);
      }
      value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
      break;
    }
    case 'STRING':
      if (typeof value !== 'string') errs.push(`${path}: expected STRING, got ${typeof value}`);
      else if (schema.enum && !schema.enum.includes(value)) {
        errs.push(`${path}: "${value}" is not in enum [${schema.enum.join(', ')}]`);
      }
      break;
    case 'NUMBER':
      if (typeof value !== 'number') errs.push(`${path}: expected NUMBER, got ${typeof value}`);
      break;
    case 'INTEGER':
      if (!Number.isInteger(value)) errs.push(`${path}: expected INTEGER, got ${value}`);
      break;
    case 'BOOLEAN':
      if (typeof value !== 'boolean') errs.push(`${path}: expected BOOLEAN, got ${typeof value}`);
      break;
    default:
      errs.push(`${path}: unknown schema type ${schema.type}`);
  }
  return errs;
}

const schemaAccepts = (schema, payload, why) =>
  assert.deepEqual(validate(schema, payload), [], `${why} — schema is TIGHTER than the parser`);

/* ── 6a · CONTROL: the validator can actually fail ─────────────────────────────
   A validator that returned [] for everything would make all of §6 vacuous. */
test('§6.0 CONTROL: validate() rejects a payload the schema really does forbid', () => {
  const errs = validate(GRADE_RESPONSE_SCHEMA, { teacherNote: 'no steps here' });
  assert.equal(errs.length, 1, `expected exactly one error, got ${JSON.stringify(errs)}`);
  assert.match(errs[0], /annotatedSteps: REQUIRED/);
  // ...and a null in a non-nullable slot is caught too.
  assert.match(
    validate(GRADE_RESPONSE_SCHEMA, { annotatedSteps: [{ description: null }] }).join(),
    /description: null\/absent but schema is not nullable/,
  );
});

/* ── 6b · every shape §5 proves the PARSER accepts must pass the SCHEMA ──────── */

test('§6.1 (mirrors §5.7/§5.1) `{annotatedSteps:[{description}]}` alone validates', () => {
  schemaAccepts(GRADE_RESPONSE_SCHEMA, { annotatedSteps: [{ description: 'Bare step' }] },
    'the parser calls this a complete grade');
});

test('§6.2 ★ (mirrors §5.4) `mistakeType: null` validates — rules 4/5/6/7 need it', () => {
  schemaAccepts(GRADE_RESPONSE_SCHEMA, { annotatedSteps: [
    { description: 'right', studentWork: 'w', status: 'correct', marksAwarded: 1,
      mistakeType: null, correctedWorking: null },
  ] }, 'a non-nullable mistakeType would constrain the marking itself');
  assert.equal(GRADE_RESPONSE_SCHEMA.properties.annotatedSteps.items
    .properties.mistakeType.nullable, true);
});

test('§6.3 ★ mistakeType carries NO enum — a nullable enum risks forcing a value', () => {
  const mt = GRADE_RESPONSE_SCHEMA.properties.annotatedSteps.items.properties.mistakeType;
  assert.equal(mt.enum, undefined,
    'the parser already enforces the four types at :378, so an enum here buys nothing ' +
    'and risks the model being forced to pick one — see [FU-C2-MISTAKETYPE-NULL-LIVE-VERIFY]');
});

test('§6.4 (mirrors §5.6/§5.10) every OPTIONAL top-level field is optional in the schema', () => {
  // mistakeSummary, teacherNote, totalMarks, marksAwarded and all four auto-detect
  // fields are absent here — the parser defaults every one of them.
  schemaAccepts(GRADE_RESPONSE_SCHEMA, { annotatedSteps: [{ description: 'only field present' }] },
    'the parser defaults all of these');
  assert.deepEqual(GRADE_RESPONSE_SCHEMA.required, ['annotatedSteps'],
    'the parse gate at :314 is the ONLY structural requirement');
});

test('§6.5 (mirrors §5.8/§1.4) the step COUNT is unbounded — no minItems/maxItems', () => {
  for (const n of [1, 9]) {
    schemaAccepts(GRADE_RESPONSE_SCHEMA, { annotatedSteps: Array.from({ length: n },
      (_, i) => ({ description: `s${i}`, studentWork: 'w', status: 'correct', marksAwarded: 0 })) },
      `step count ${n} must validate`);
  }
  const arr = GRADE_RESPONSE_SCHEMA.properties.annotatedSteps;
  assert.equal(arr.minItems, undefined, 'a pinned step count would trade marking for format');
  assert.equal(arr.maxItems, undefined);
  // §1.4's empty-array case is a GOOD parse — it must validate too.
  schemaAccepts(GRADE_RESPONSE_SCHEMA, { annotatedSteps: [] }, 'an empty steps array is a good parse');
});

test('§6.6 the four step statuses are EXACTLY the parser\'s accepted set', () => {
  const status = GRADE_RESPONSE_SCHEMA.properties.annotatedSteps.items.properties.status;
  assert.deepEqual(status.enum.slice().sort(), ['correct', 'incorrect', 'missing', 'partial'],
    'the enum must mirror :374 exactly — no more, no fewer');
  for (const s of ['correct', 'partial', 'incorrect', 'missing']) {
    schemaAccepts(GRADE_RESPONSE_SCHEMA, { annotatedSteps: [{ description: 'd', status: s }] },
      `status "${s}" is accepted by the parser`);
  }
  // ...and status is NOT required — the parser defaults a missing one to 'partial'.
  assert.equal((GRADE_RESPONSE_SCHEMA.properties.annotatedSteps.items.required || [])
    .includes('status'), false);
});

test('§6.7 (mirrors §5.9/§5.10) the auto-detect payload validates, and so does its absence', () => {
  schemaAccepts(GRADE_RESPONSE_SCHEMA, {
    detectedSubject: 'Maths', detectedTopic: 'quadratic-equations', detectedMarks: 3,
    marksSource: 'stated', totalMarks: 3, marksAwarded: 2,
    annotatedSteps: [{ description: 'd' }],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: 'Good.',
  }, 'the full auto-detect grade');
  // detectedTopic null is the documented "none clearly fits" case (:359-:363).
  schemaAccepts(GRADE_RESPONSE_SCHEMA, { detectedTopic: null, detectedSubject: null,
    annotatedSteps: [{ description: 'd' }] }, 'null topic/subject are parser-accepted');
});

/* ── 6c · the WORKSHEET schema is a DIFFERENT schema, for a load-bearing reason ─ */

test('§6.8 ★★ (mirrors §5.11) worksheet: `{qNumber, couldNotRead}` validates with NO steps', () => {
  schemaAccepts(WORKSHEET_RESPONSE_SCHEMA, { results: [{ qNumber: 1, couldNotRead: true }], summary: 's' },
    'requiring annotatedSteps here would FORCE FABRICATION for an unreadable answer');
  const entry = WORKSHEET_RESPONSE_SCHEMA.properties.results.items;
  assert.deepEqual(entry.required, ['qNumber'],
    'qNumber only — :1040 discards an entry without it, so requiring it PROTECTS grades');
});

test('§6.9 ★★ the two grade schemas are NOT interchangeable (the §2.3 property, in schema form)', () => {
  // annotatedSteps: REQUIRED in the per-question schema, OPTIONAL in the worksheet one.
  assert.ok(GRADE_RESPONSE_SCHEMA.required.includes('annotatedSteps'));
  assert.ok(!(WORKSHEET_RESPONSE_SCHEMA.properties.results.items.required || [])
    .includes('annotatedSteps'));
  // A worksheet-shaped payload must FAIL the per-question schema and vice versa.
  assert.ok(validate(GRADE_RESPONSE_SCHEMA, { results: [] }).length > 0,
    'worksheet JSON is not a valid per-question grade');
  assert.ok(validate(WORKSHEET_RESPONSE_SCHEMA, { annotatedSteps: [] }).length > 0,
    'per-question JSON is not a valid worksheet grade');
});

test('§6.10 worksheet: a full graded entry validates, and `summary` stays optional', () => {
  schemaAccepts(WORKSHEET_RESPONSE_SCHEMA, { results: [{ qNumber: 1, couldNotRead: false, marksAwarded: 1,
    annotatedSteps: [{ description: 'step', studentWork: 'w', status: 'correct', marksAwarded: 1 }],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: 't' }] }, 'summary omitted — :1045 defaults it');
});

/* ── 6d · the DETECT schema ────────────────────────────────────────────────── */

test('§6.11 detect: a bare `{}` validates — the gate at :603 is only `if (!parsed)`', () => {
  schemaAccepts(DETECT_RESPONSE_SCHEMA, {}, 'every field degrades through its own fallback');
  assert.equal(DETECT_RESPONSE_SCHEMA.required, undefined,
    'detect has NO structural requirement at all');
});

test('§6.12 detect: the multi-question array validates; questionText is the one thing required', () => {
  schemaAccepts(DETECT_RESPONSE_SCHEMA, { detectedMarks: 3, marksSource: 'inferred', detectedSubject: 'Maths',
    detectedTopic: null, detectedObjective: false,
    questions: [{ questionNumber: 1, questionText: 'Q1', marks: 3, marksSource: 'stated', objective: true }] },
    'the documented detect payload');
  assert.deepEqual(DETECT_RESPONSE_SCHEMA.properties.questions.items.required, ['questionText'],
    ':659 DROPS a textless entry, so requiring it prevents silent question loss');
});

/* ── 6e · ★ THE ANTI-TIGHTENING SWEEP ──────────────────────────────────────────
   A generic walk over all three schemas. Any `required` added anywhere in future —
   in a field nobody thought to write a test for — turns this red on its own. This is
   the assertion that keeps the contract enforced after everyone has forgotten it. */

test('§6.13 ★ NO schema requires anything beyond the five parser-derived gates', () => {
  const found = [];
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return;
    for (const key of node.required || []) found.push(`${path}.required:${key}`);
    if (node.minItems != null) found.push(`${path}.minItems`);
    if (node.maxItems != null) found.push(`${path}.maxItems`);
    for (const [k, v] of Object.entries(node.properties || {})) walk(v, `${path}.${k}`);
    if (node.items) walk(node.items, `${path}[]`);
  };
  walk(GRADE_RESPONSE_SCHEMA, 'grade');
  walk(DETECT_RESPONSE_SCHEMA, 'detect');
  walk(WORKSHEET_RESPONSE_SCHEMA, 'worksheet');

  assert.deepEqual(found.sort(), [
    'detect.questions[].required:questionText', // :659 textless entries are dropped
    'grade.annotatedSteps[].required:description', // :369 description-less steps are dropped
    'grade.required:annotatedSteps', // :314 the per-question parse gate
    'worksheet.required:results', // :1009 the worksheet parse gate
    // :727 — the worksheet path applies the IDENTICAL `.filter((s) => s && s.description)`
    // as :369, because it reuses the same step schema. Found by this sweep, not by a
    // hand-written test: it is the entry the author forgot to enumerate.
    'worksheet.results[].annotatedSteps[].required:description',
    'worksheet.results[].required:qNumber', // :1040 entries without one are discarded
  ], 'EVERY entry here must name the parser line that makes it structural. ' +
     'A new one means the schema now demands something the parser does not — which ' +
     'constrains the marking. Justify it against the parser or remove it.');
});

/* ── 6f · the schema actually reaches the model call ───────────────────────────
   Presence in the genConfig. The stronger CONTROL — that it reaches the outgoing
   HTTP BODY — lives in geminiClient.test.cjs, because that is where the body is
   built and where a silent drop would actually happen. */

test('§6.14 all three grading calls carry their OWN schema in the genConfig', async () => {
  const grade = buildRoute({ replies: [GOOD_GRADE] });
  await grade.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(grade.calls[0].genConfig.responseSchema, GRADE_RESPONSE_SCHEMA);

  const detect = buildRoute({ replies: [{ detectedMarks: 3 }] });
  await detect.route.handleDetectQuestion({ question: 'q' }, {});
  assert.equal(detect.calls[0].genConfig.responseSchema, DETECT_RESPONSE_SCHEMA);

  const ws = buildRoute({ replies: [WS_GOOD] });
  await ws.route.handleGradeWorksheet(WORKSHEET_REQ([{ qNumber: 1, marks: 1, questionText: 'Q1' }]), {});
  assert.equal(ws.calls[0].genConfig.responseSchema, WORKSHEET_RESPONSE_SCHEMA);

  // ★ THREE DISTINCT SCHEMAS — the mirror of §3.4's three-distinct-caps assertion.
  // One shared schema would fail this, and §6.9 says why that would be a bug.
  assert.equal(new Set([grade.calls[0].genConfig.responseSchema,
    detect.calls[0].genConfig.responseSchema, ws.calls[0].genConfig.responseSchema]).size, 3);
});

test('§6.15 the caps and the mime type are UNCHANGED by PR-C2 (additive only)', async () => {
  const grade = buildRoute({ replies: [GOOD_GRADE] });
  await grade.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(grade.calls[0].genConfig.maxOutputTokens, 16000);
  assert.equal(grade.calls[0].genConfig.responseMimeType, 'application/json');
  assert.equal(grade.calls[0].genConfig.thinkingConfig, undefined);
});

test('§6.16 ★ the retry path SURVIVES the schema — a parse miss still retries exactly once', async () => {
  // The schema is not a licence to delete the safety net: it cannot prevent a
  // MAX_TOKENS truncation, which the grader documents as the DOMINANT parse-miss
  // cause. Removing the retry in the same PR that changes the output contract is
  // how you find that out in production.
  const h = buildRoute({ replies: [PARSE_MISS, GOOD_GRADE] });
  await h.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(h.calls.length, 2, 'the retry must still fire');
  assert.equal(h.calls[1].genConfig.responseSchema, GRADE_RESPONSE_SCHEMA,
    'and the RETRY must carry the schema too');
  assert.equal(h.body().ok, true);
});

test('§6.17 the schemas are deep-frozen — one request cannot mutate the next request\'s schema', () => {
  assert.ok(Object.isFrozen(GRADE_RESPONSE_SCHEMA));
  assert.ok(Object.isFrozen(GRADE_RESPONSE_SCHEMA.properties.annotatedSteps.items.properties));
  assert.ok(Object.isFrozen(WORKSHEET_RESPONSE_SCHEMA.properties.results.items));
});

/* ══════════════════════════════════════════════════════════════════════════════
   §7 · BATCH-1 · PER-QUESTION ANSWER IMAGES IN THE BATCH GRADER
   ★★ THE PATH UNDER TEST IS THE ONE FOUR LIVE SURFACES ALREADY USE. `gradeWorksheet`
      → handleGradeWorksheet → gradeStructuredSet is the grade path for WORKSHEETS,
      CHAPTER TESTS, FULL MOCKS *and* multi-question CHECK & IMPROVE
      (DesktopCheckImprovePage calls gradeWorksheet directly). A regression here is a
      regression in four shipped surfaces at once, which is why §7.1 — "no `uploads`
      ⇒ byte-identical `contents`" — is the acceptance test for the whole change and
      not a nicety.
   ★ NOTHING IS STITCHED. Each answer photo is its OWN part immediately after its own
      question's block. The model is never asked to FIND a question number inside a
      document, so there is no locate step to get wrong.
   ══════════════════════════════════════════════════════════════════════════════ */

const crypto = require('node:crypto');

// An image part that CARRIES its payload, so a test can prove WHICH image landed
// where. The shape mirrors the real `buildGeminiImagePart`.
const REAL_SHAPE_IMAGE_PART = ({ mimeType, base64 }) => ({ inline_data: { mime_type: mimeType, data: base64 } });

const buildImageRoute = (opts = {}) =>
  buildRoute({ ...opts, depOverrides: { buildGeminiImagePart: REAL_SHAPE_IMAGE_PART, ...(opts.depOverrides || {}) } });

const Q = (n, extra = {}) => ({ qNumber: n, marks: 1, questionText: 'Q' + n + ' text', ...extra });
const UP = (n, data) => ({ qNumber: n, imageBase64: data || ('IMG' + n), imageMimeType: 'image/jpeg' });

const WS_OK = (nums) => ({
  results: nums.map((n) => ({ qNumber: n, annotatedSteps: [{ description: 's', studentWork: 'w', status: 'correct', marksAwarded: 1 }] })),
  summary: 'ok',
});

const partsOf = (h) => h.calls[0].contents[0].parts;
const isImage = (p) => Boolean(p && p.inline_data);
const textOf = (h) => partsOf(h).filter((p) => typeof p.text === 'string').map((p) => p.text).join('');

// ── §7.1 · THE ACCEPTANCE TEST ────────────────────────────────────────────────

// The SHA-256 of `JSON.stringify(contents)` for a fixed no-uploads request, taken
// from `checkSolution.cjs` AS IT STOOD ON TRUNK BEFORE BATCH-1. It is not a
// decoration: it is the only assertion that can see a one-character drift in the
// worksheet prompt, and a one-character drift there reaches worksheets, chapter
// tests, full mocks and multi-question C&I simultaneously.
//
// ⚠ IF THIS GOES RED you have changed the prompt EVERY EXISTING SURFACE sends.
// That may be intentional — but it must be intentional. Re-pin it only in a PR
// whose title says it is changing the worksheet grading prompt.
const NO_UPLOADS_CONTENTS_SHA256 = 'a7f85f477093976ecac3e9922e8e9ca8943fe310d4f6063ed34db9e85a75eb64';

const PINNED_REQ = () => ({
  worksheetId: 'ws-pin',
  imageBase64: 'PINNEDBASE64',
  imageMimeType: 'application/pdf',
  subject: 'Maths',
  questions: [
    { qNumber: 1, marks: 3, questionText: 'Find the roots of x^2 - 2x - 8 = 0.', topicLabel: 'Quadratic Equations',
      solutionSteps: ['Factorise [1]', 'Solve [1]', 'State both roots [1]'], finalAnswer: 'x = 4, x = -2' },
    { qNumber: 2, marks: 1, questionText: 'Which of these is irrational?', section: 'A',
      options: ['2', 'root 2'], answer: 'root 2' },
  ],
});

test('§7.1 ★★ ACCEPTANCE — the batch path with NO `uploads` builds BYTE-IDENTICAL `contents`', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await h.route.handleGradeWorksheet(PINNED_REQ(), {});
  const sha = crypto.createHash('sha256').update(JSON.stringify(h.calls[0].contents)).digest('hex');
  assert.equal(sha, NO_UPLOADS_CONTENTS_SHA256,
    'the no-uploads worksheet prompt has changed — see the comment above this constant');
});

test('§7.2 an ABSENT `uploads` and an EMPTY `uploads: []` build the SAME contents', async () => {
  // The empty array must NOT flip the branch: a client that always sends the key
  // and sometimes has nothing to send is the likeliest real-world shape.
  const a = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await a.route.handleGradeWorksheet(PINNED_REQ(), {});
  const b = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await b.route.handleGradeWorksheet({ ...PINNED_REQ(), uploads: [] }, {});
  assert.deepEqual(b.calls[0].contents, a.calls[0].contents);
});

test('§7.3 CONTROL — with no uploads the prompt still says LOCATE, and says nothing about per-question images', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1])] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([Q(1)]), {});
  const text = textOf(h);
  assert.ok(text.includes('locate that numbered answer in the PDF'), 'rule 1 must be unchanged');
  assert.ok(text.includes("CANNOT confidently locate or read a question's answer in the upload"), 'rule 6 must be unchanged');
  assert.ok(!text.includes('followed IMMEDIATELY by the image'), 'the batch wording must not leak into the PDF path');
  assert.equal(partsOf(h).length, 2, 'one text part + one image part, exactly as before');
});

// ── §7.4–§7.7 · THE INTERLEAVE — nothing is stitched ──────────────────────────

test("§7.4 ★ each image is its OWN part IMMEDIATELY after its own question's block", async () => {
  const h = buildImageRoute({ replies: [WS_OK([1, 2, 3])] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ([Q(1), Q(2), Q(3)]), uploads: [UP(1), UP(2), UP(3)] }, {});
  const parts = partsOf(h);
  // header, [Q1 block, img1], [Q2 block, img2], [Q3 block, img3], footer
  assert.equal(parts.length, 8);
  for (const n of [1, 2, 3]) {
    const i = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q' + n + ' text'));
    assert.ok(i > 0, 'Q' + n + ' block must be its own part');
    assert.ok(isImage(parts[i + 1]), 'Q' + n + "'s image must be the VERY NEXT part");
    assert.equal(parts[i + 1].inline_data.data, 'IMG' + n,
      'Q' + n + ' must carry its OWN image — an off-by-one here IS the stitching bug this design exists to prevent');
  }
});

test("§7.5 ★ a question with NO upload gets NO image — the next question's image never slides up to it", async () => {
  const h = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ([Q(1), Q(2)]), uploads: [UP(2)] }, {});
  const parts = partsOf(h);
  const i1 = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q1 text'));
  assert.ok(!isImage(parts[i1 + 1]), 'Q1 photographed nothing, so nothing follows its block');
  const i2 = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q2 text'));
  assert.equal(parts[i2 + 1].inline_data.data, 'IMG2');
  assert.equal(parts.filter(isImage).length, 1, 'exactly one image was sent');
});

test('§7.6 the four batch prompt strings are present, and the LOCATE wording is gone', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1])] });
  await h.route.handleGradeWorksheet({ ...WORKSHEET_REQ([Q(1)]), uploads: [UP(1)] }, {});
  const text = textOf(h);
  assert.ok(text.includes("followed IMMEDIATELY by the image of the student's handwritten answer to THAT question"));
  assert.ok(text.includes("using the image that immediately follows that question's block"));
  assert.ok(text.includes('CANNOT confidently READ the image supplied for a question'));
  assert.ok(text.includes('followed by exactly one image of that answer, in the order listed'));
  assert.ok(!text.includes('locate that numbered answer in the PDF'),
    'telling the model to LOCATE is exactly what this shape must not do');
  assert.ok(!text.includes('CANNOT confidently locate or read'));
});

test('§7.7 N uploads still cost exactly ONE model call — this is a batch, not a fan-out', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1, 2, 3, 4])] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ([Q(1), Q(2), Q(3), Q(4)]), uploads: [UP(1), UP(2), UP(3), UP(4)] }, {});
  assert.equal(h.calls.length, 1);
  assert.equal(h.body().results.length, 4);
});

// ── §7.8 · M2, REWRITTEN (owner ruling, 2026-07-31) ───────────────────────────

test('§7.8 ★★ the result set is built from the SENT questions, never from what the model returned', async () => {
  // ★ WHAT THIS PROTECTS, quoted from `gradeStructuredSet`:
  //     const results = questions.map((q) =>
  //       normaliseStructuredResult(q, byNumber.get(Number(q.qNumber)) || null),
  //     );
  // The output is built by mapping over the KNOWN set, so a qNumber the model
  // invented lands in `byNumber` and is never read, and a question the model
  // dropped still appears — as couldNotRead, never silently zeroed.
  //
  // ★★ THIS ASSERTION IS UNCONDITIONALLY TRUE TODAY, AND THAT IS THE POINT. It is
  // not here to prove the property holds; it is here to FAIL WHEN SOMEONE REMOVES
  // THE STRUCTURE THAT MAKES IT HOLD. Mutate the map DIRECTION — iterate
  // `parsed.results` instead of `questions` — and this test goes red. A guarantee
  // that holds structurally still needs a test.
  const strayAndMissing = {
    results: [
      { qNumber: 1, annotatedSteps: [{ description: 's', studentWork: 'w', status: 'correct', marksAwarded: 1 }] },
      { qNumber: 99, annotatedSteps: [{ description: 'hallucinated', studentWork: 'x', status: 'correct', marksAwarded: 1 }] },
    ],
    summary: 'ok',
  };
  const h = buildImageRoute({ replies: [strayAndMissing] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ([Q(1), Q(2)]), uploads: [UP(1), UP(2)] }, {});
  const nums = h.body().results.map((r) => Number(r.qNumber)).sort((a, b) => a - b);
  assert.deepEqual(nums, [1, 2], 'exactly the SENT set — the stray 99 is absent and the dropped Q2 is present');
  assert.equal(h.body().results.find((r) => Number(r.qNumber) === 2).couldNotRead, true,
    'a question the model omitted is honestly pending, never a silent zero');
});

// ── §7.9 · INCLUSION IS BY EVIDENCE, NEVER BY TYPE ────────────────────────────

test('§7.9 ★★ an OBJECTIVE question with a photo gets its image; a SUBJECTIVE one without a photo gets none', async () => {
  // Batch inclusion answers ONE question — "is there written working saved for
  // this question?" — and never "what type is it?". Nothing in the request path
  // reads section/format/objective to decide what to attach, and this pins that:
  // a Section-A MCQ the student showed working for is photographed and graded like
  // anything else, and a subjective question with nothing saved is not.
  const h = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await h.route.handleGradeWorksheet({
    ...WORKSHEET_REQ([
      Q(1, { section: 'A', format: 'mcq', objective: true, options: ['a', 'b'], answer: 'b' }),
      Q(2, { marks: 3 }),
    ]),
    uploads: [UP(1)],
  }, {});
  const parts = partsOf(h);
  const i1 = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q1 text'));
  assert.equal(parts[i1 + 1].inline_data.data, 'IMG1', 'the objective question DID have working saved — it is in the batch');
  const i2 = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q2 text'));
  assert.ok(!isImage(parts[i2 + 1]), 'the subjective question had nothing saved — no image, no fabrication');
  assert.equal(h.body().results.length, 2, 'both questions are still GRADED — inclusion decides the IMAGE, not the grade');
});

// ── §7.10–§7.14 · THE REQUEST GUARDS ──────────────────────────────────────────

test('§7.10 an upload for an UNKNOWN question number is dropped, never sent', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1])] });
  await h.route.handleGradeWorksheet({ ...WORKSHEET_REQ([Q(1)]), uploads: [UP(1), UP(7)] }, {});
  const images = partsOf(h).filter(isImage);
  assert.equal(images.length, 1);
  assert.equal(images[0].inline_data.data, 'IMG1');
});

test('§7.11 a DUPLICATE qNumber sends exactly one image (the first), never two', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1])] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ([Q(1)]), uploads: [UP(1, 'FIRST'), UP(1, 'SECOND')] }, {});
  const images = partsOf(h).filter(isImage);
  assert.equal(images.length, 1, 'two images after one question block would break the position-IS-the-pairing invariant');
  assert.equal(images[0].inline_data.data, 'FIRST');
});

test('§7.12 an uploads-ONLY request is accepted; a request with NEITHER upload form is refused', async () => {
  const ok = buildImageRoute({ replies: [WS_OK([1])] });
  await ok.route.handleGradeWorksheet(
    { worksheetId: 'w', subject: 'Maths', questions: [Q(1)], uploads: [UP(1)] }, {});
  assert.equal(ok.body().ok, true);
  assert.equal(ok.calls.length, 1);

  const none = buildImageRoute({ replies: [WS_OK([1])] });
  await none.route.handleGradeWorksheet({ worksheetId: 'w', subject: 'Maths', questions: [Q(1)] }, {});
  assert.equal(none.status(), 400);
  assert.equal(none.calls.length, 0, 'a request with nothing to grade must never reach the model');
});

test('§7.13 more than 12 answer photos is REFUSED with a clear message, never silently truncated', async () => {
  const many = Array.from({ length: 13 }, (_, i) => i + 1);
  const h = buildImageRoute({ replies: [WS_OK(many)] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ(many.map((n) => Q(n))), uploads: many.map((n) => UP(n)) }, {});
  assert.equal(h.status(), 400);
  assert.match(h.body().error, /at most 12/);
  assert.equal(h.calls.length, 0, 'a partial grade presented as complete is the failure mode this prevents');
  // CONTROL: exactly 12 is accepted, so the cap is a boundary and not a blanket ban.
  const at = buildImageRoute({ replies: [WS_OK(many.slice(0, 12))] });
  await at.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ(many.slice(0, 12).map((n) => Q(n))), uploads: many.slice(0, 12).map((n) => UP(n)) }, {});
  assert.equal(at.body().ok, true);
});

test('§7.14 EVERY per-question upload goes through the image validator — one bad photo refuses the batch', async () => {
  const seen = [];
  const h = buildImageRoute({
    replies: [WS_OK([1, 2])],
    depOverrides: {
      validateMentorImagePayload: (p) => {
        seen.push(p.imageBase64);
        return p.imageBase64 === 'IMG2' ? { ok: false, error: 'Image is too large. Max size is 3 MB.' } : { ok: true };
      },
    },
  });
  await h.route.handleGradeWorksheet(
    { worksheetId: 'w', subject: 'Maths', questions: [Q(1), Q(2)], uploads: [UP(1), UP(2)] }, {});
  assert.equal(h.status(), 400);
  assert.equal(h.body().error, 'Image is too large. Max size is 3 MB.');
  assert.deepEqual(seen, ['IMG1', 'IMG2'], 'each photo is validated in turn — not just the first');
  assert.equal(h.calls.length, 0);
});

/* ══════════════════════════════════════════════════════════════════════════════
   §8 · TELEMETRY-1 — every grading call site is TAGGED, and the tag is a
   TELEMETRY HINT that cannot reach the wire.

   ★ WHY THESE ASSERT ON `genConfig` AND NOT ON A COUNTER. The harness replaces
   `callGemini` wholesale, so no real telemetry runs here. What this file CAN
   prove — and what nothing else can — is that each of the three endpoints hands
   DOWN a distinct, correct label. Whether that label is then recorded is proven
   in geminiClient.test.cjs, and whether it is reported is proven in
   adminTelemetry.test.cjs. Three files, three links, no gap.
   ══════════════════════════════════════════════════════════════════════════════ */

const { WORKLOAD_CLASSES } = require('../services/geminiClient.cjs');

test('§8.1 ★ the GRADING call is tagged grade-single AND carries the marks', async () => {
  const h = buildRoute({ replies: [GOOD_GRADE] });
  await h.route.handleCheckSolution({ ...SUBJECTIVE_REQ(), marks: 5 }, {});
  const cfg = h.calls[0].genConfig;
  assert.equal(cfg.workloadClass, 'grade-single');
  assert.equal(cfg.marks, 5,
    'marks ARE available at this call site — this is what makes a banded budget possible');
});

test('§8.2 ★ a grading call and a detect-question call land in DIFFERENT classes', async () => {
  const grade = buildRoute({ replies: [GOOD_GRADE] });
  await grade.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  const detect = buildRoute({ replies: [{ detectedMarks: 3, detectedSubject: 'Maths' }] });
  await detect.route.handleDetectQuestion({ question: 'What is x?' }, {});

  assert.equal(grade.calls[0].genConfig.workloadClass, 'grade-single');
  assert.equal(detect.calls[0].genConfig.workloadClass, 'detect-question');
  assert.notEqual(
    grade.calls[0].genConfig.workloadClass,
    detect.calls[0].genConfig.workloadClass,
    'both were `vision` before this lane, which is why a grade could not be told from a detect',
  );
});

test('§8.3 ★ DETECT carries NO marks — determining them is what the call is FOR', async () => {
  const h = buildRoute({ replies: [{ detectedMarks: 3, detectedSubject: 'Maths' }] });
  await h.route.handleDetectQuestion({ question: 'What is x?', marks: 3 }, {});
  assert.equal(h.calls[0].genConfig.marks, undefined,
    'a band here would be fabricated from the answer the call has not produced yet');
});

test('§8.4 ★ ONE call site, TWO workloads: uploads => grade-batch, no uploads => worksheet', async () => {
  const ws = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await ws.route.handleGradeWorksheet(PINNED_REQ(), {});
  assert.equal(ws.calls[0].genConfig.workloadClass, 'worksheet');

  const batch = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await batch.route.handleGradeWorksheet({ ...PINNED_REQ(), uploads: [UP(1)] }, {});
  assert.equal(batch.calls[0].genConfig.workloadClass, 'grade-batch',
    'N answer photos is a different read from one PDF — derived from the request, not guessed');
});

test('§8.5 ★ the SET graders carry NO marks — a set of differing marks has no single band', async () => {
  const ws = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await ws.route.handleGradeWorksheet(PINNED_REQ(), {});
  assert.equal(ws.calls[0].genConfig.marks, undefined,
    'PINNED_REQ mixes a 3-mark and a 1-mark question — banding it on either would be a fabrication');
});

test('§8.6 ★ NO grading call site falls through to unclassified by accident', async () => {
  const grade = buildRoute({ replies: [GOOD_GRADE] });
  await grade.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  const detect = buildRoute({ replies: [{ detectedMarks: 3, detectedSubject: 'Maths' }] });
  await detect.route.handleDetectQuestion({ question: 'q' }, {});
  const ws = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await ws.route.handleGradeWorksheet(PINNED_REQ(), {});

  const tags = [grade, detect, ws].map((h) => h.calls[0].genConfig.workloadClass);
  for (const tag of tags) {
    assert.ok(tag, 'a missing tag falls to `unclassified`, which is what 83 of 84 calls read on 2026-08-05');
    assert.ok(WORKLOAD_CLASSES.includes(tag), `"${tag}" is not in the closed set`);
  }
  assert.equal(new Set(tags).size, 3, `three endpoints, three classes — got ${JSON.stringify(tags)}`);
});

test('§8.7 ★★ CONTROL — the tags are TELEMETRY-ONLY and change NOTHING about the request', async () => {
  // The properties #578 and PR-C2 pin, re-asserted with the tags present. If a tag
  // had leaked into a generationConfig field, one of these would move.
  const grade = buildRoute({ replies: [GOOD_GRADE] });
  await grade.route.handleCheckSolution(SUBJECTIVE_REQ(), {});
  assert.equal(grade.calls[0].genConfig.maxOutputTokens, 16000);
  assert.equal(grade.calls[0].genConfig.thinkingConfig, undefined,
    'THIS LANE IS OBSERVATION, NOT CONTROL — no thinking budget is introduced here');
  assert.equal(grade.calls[0].genConfig.responseSchema, GRADE_RESPONSE_SCHEMA);

  const detect = buildRoute({ replies: [{ detectedMarks: 3, detectedSubject: 'Maths' }] });
  await detect.route.handleDetectQuestion({ question: 'q' }, {});
  assert.deepEqual(detect.calls[0].genConfig.thinkingConfig, { thinkingBudget: 0 },
    'the ONE pre-existing budget in the server is untouched');
});

/* ══════════════════════════════════════════════════════════════════════════════
   §9 · TYPED-1 — a CHANNEL for the student's TYPED working.

   ★★ THE GAP. Rule 1's batch branch has always told the model to "grade the typed
      answer given in its block IF ONE IS SHOWN". No block ever showed one: that
      clause and `blockFor` were born in the SAME commit (c5570592, BATCH-1) and the
      guard has never once been met. A student who types instead of photographing —
      the free-tier path, no camera to hand or working on a laptop — had NO channel
      into a batch grade at all.

   ★★ WHY THE CONDITION IS THE WHOLE DESIGN. `blockFor` feeds BOTH prompt paths, and
      the no-uploads one is pinned BYTE-IDENTICAL by §7.1's sha256 across four live
      surfaces. So the emission is conditional on a non-empty `textAnswer`: §9.3
      proves the absent case is unchanged, and §9.5 proves — as a POSITIVE CONTROL —
      that the pin CAN still see this field when it IS present. An "unchanged" claim
      from an assertion that could not have detected a change is worth nothing.

   ★ IT ADDS NO PART. The typed text goes inside the question's OWN existing text
      part, so `buildUploadParts` still emits one text part per question and one
      image part per upload. §9.4 proves the interleave's pairing is unmoved rather
      than assuming it.
   ══════════════════════════════════════════════════════════════════════════════ */

const TYPED = 'Let x be the smaller root.\nx^2 - 2x - 8 = 0 -> (x-4)(x+2) = 0\nSo x = 4 or x = -2.';
const shaOf = (h) => crypto.createHash('sha256').update(JSON.stringify(h.calls[0].contents)).digest('hex');

test("§9.1 ★ NO-UPLOADS path: a typed answer is EMITTED in that question's block", async () => {
  const h = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await h.route.handleGradeWorksheet(
    WORKSHEET_REQ([Q(1, { textAnswer: TYPED }), Q(2)]), {});
  const text = textOf(h);
  assert.ok(text.includes("The student's typed answer is:"),
    'rule 1 promises the model a typed answer "if one is shown" — this is the showing');
  assert.ok(text.includes('(x-4)(x+2) = 0'), "the student's OWN working must reach the model verbatim");
  // POSITIVE: it sits inside Q1's block, not appended to the end of the prompt.
  const q1 = text.slice(text.indexOf('Q1 text'), text.indexOf('Q2 text'));
  assert.ok(q1.includes("The student's typed answer is:"),
    'the typed answer belongs to the question it was typed for');
  // NEGATIVE: Q2 typed nothing, so Q2's block must claim nothing.
  const q2 = text.slice(text.indexOf('Q2 text'));
  assert.ok(!q2.includes("The student's typed answer is:"),
    'a question with no typed answer must not be given one');
});

test('§9.2 ★ UPLOADS path: the SAME emission happens at the interleave call site', async () => {
  // `blockFor` has exactly TWO call sites — `questions.map(blockFor)` and the push
  // inside `buildUploadParts`. Emitting at only one is mutation M2, and this is the
  // assertion that catches it.
  const h = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ([Q(1, { textAnswer: TYPED }), Q(2)]), uploads: [UP(2)] }, {});
  const parts = partsOf(h);
  const i1 = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q1 text'));
  assert.ok(parts[i1].text.includes("The student's typed answer is:"),
    'Q1 typed its working and photographed nothing — the batch path must carry the typing');
  assert.ok(parts[i1].text.includes('(x-4)(x+2) = 0'));
});

test('§9.3 ★★ ABSENT typed answer ⇒ the block is BYTE-IDENTICAL to before the field existed', async () => {
  // Three spellings of "nothing typed" must produce the same bytes as omitting the
  // key entirely: empty string, whitespace only, and null. A client that always
  // sends the key is the likeliest real shape — §7.2 made the same argument for
  // `uploads: []`.
  const base = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await base.route.handleGradeWorksheet(PINNED_REQ(), {});
  for (const [label, value] of [['empty string', ''], ['whitespace only', '   \n  '], ['null', null]]) {
    const req = PINNED_REQ();
    req.questions = req.questions.map((q) => ({ ...q, textAnswer: value }));
    const h = buildImageRoute({ replies: [WS_OK([1, 2])] });
    await h.route.handleGradeWorksheet(req, {});
    assert.deepEqual(h.calls[0].contents, base.calls[0].contents, `"${label}" must not change one byte`);
  }
  // And the same on the uploads path, where the block is its own part.
  const u0 = buildImageRoute({ replies: [WS_OK([1])] });
  await u0.route.handleGradeWorksheet({ ...WORKSHEET_REQ([Q(1)]), uploads: [UP(1)] }, {});
  const u1 = buildImageRoute({ replies: [WS_OK([1])] });
  await u1.route.handleGradeWorksheet({ ...WORKSHEET_REQ([Q(1, { textAnswer: '  ' })]), uploads: [UP(1)] }, {});
  assert.deepEqual(u1.calls[0].contents, u0.calls[0].contents);
});

test('§9.4 ★ the IMAGE-PAIRING invariant survives — a typed block shifts NO image', async () => {
  // The failure this guards against: if the typed answer were pushed as its OWN
  // part, every image after it would slide one question along and Q2 would be graded
  // against Q1's photo. Q1 and Q3 type; Q2 does not; all three photograph.
  const h = buildImageRoute({ replies: [WS_OK([1, 2, 3])] });
  await h.route.handleGradeWorksheet({
    ...WORKSHEET_REQ([Q(1, { textAnswer: TYPED }), Q(2), Q(3, { textAnswer: 'x = 7' })]),
    uploads: [UP(1), UP(2), UP(3)],
  }, {});
  const parts = partsOf(h);
  assert.equal(parts.length, 8, 'header + 3x(block,image) + footer — the typed text added NO part');
  for (const n of [1, 2, 3]) {
    const i = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q' + n + ' text'));
    assert.ok(isImage(parts[i + 1]), 'Q' + n + "'s image must still be the VERY NEXT part");
    assert.equal(parts[i + 1].inline_data.data, 'IMG' + n,
      'Q' + n + ' must still carry its OWN image — an off-by-one here IS the stitching bug');
  }
  // A question may carry BOTH typed working AND a photo; neither suppresses the other.
  const i1 = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes('Q1 text'));
  assert.ok(parts[i1].text.includes("The student's typed answer is:"));
  assert.equal(parts.filter(isImage).length, 3);
});

test("§9.5 ★★ POSITIVE CONTROL — a PRESENT typed answer DOES move §7.1's sha256; an ABSENT one does not", async () => {
  // §7.1 asserts a fixed hash and passes. On its own that is equally consistent with
  // a pin that has gone BLIND to this field. This proves it has not: the same
  // fixture with one typed answer added hashes DIFFERENTLY. That is what makes
  // §7.1's green evidence rather than decoration.
  const absent = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await absent.route.handleGradeWorksheet(PINNED_REQ(), {});
  assert.equal(shaOf(absent), NO_UPLOADS_CONTENTS_SHA256, 'absent ⇒ the pinned prompt, unchanged');

  const req = PINNED_REQ();
  req.questions[0] = { ...req.questions[0], textAnswer: TYPED };
  const present = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await present.route.handleGradeWorksheet(req, {});
  assert.notEqual(shaOf(present), NO_UPLOADS_CONTENTS_SHA256,
    'were these equal, the typed answer never reached the model and §9.1 is testing a mirage');
});

test('§9.6 ★ the typed working is FENCED and its newlines are PRESERVED', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1])] });
  await h.route.handleGradeWorksheet(WORKSHEET_REQ([Q(1, { textAnswer: TYPED })]), {});
  const text = textOf(h);
  assert.ok(text.includes('"""\n' + TYPED + '\n'),
    'the working sits inside the same """ fence the SINGLE-question grader has used since 57224f49');
  assert.ok(text.includes('\nSo x = 4 or x = -2.'),
    "collapsing the student's newlines would merge their steps into one line and lose the step marking");
});

test('§9.7 ★ a typed answer alone reaches the model — the free-tier path is not a 400', async () => {
  const h = buildImageRoute({ replies: [WS_OK([1])] });
  await h.route.handleGradeWorksheet(
    { worksheetId: 'w', subject: 'Maths', imageBase64: 'PDFB64', imageMimeType: 'application/pdf',
      questions: [Q(1, { textAnswer: TYPED })] }, {});
  assert.equal(h.body().ok, true);
  assert.equal(h.calls.length, 1);
  assert.ok(textOf(h).includes('So x = 4 or x = -2.'));
});

test('§9.8 ★ the CAP the client can now read is the SAME number the server refuses above', async () => {
  // `src/config/gradingLimits.ts` exports 12 as a UI hint. The hint must never
  // BECOME the guard: this re-asserts the server's own 400 with typed working
  // present, so a future lane that "moves the check to the client" turns it red.
  // The two numbers are pinned equal by `src/config/gradingLimits.guard.test.ts`,
  // which reads this very file.
  const many = Array.from({ length: 13 }, (_, i) => i + 1);
  const h = buildImageRoute({ replies: [WS_OK(many)] });
  await h.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ(many.map((n) => Q(n, { textAnswer: 'typed' }))), uploads: many.map((n) => UP(n)) }, {});
  assert.equal(h.status(), 400, 'typed working does not buy a way past the upload cap');
  assert.match(h.body().error, /at most 12/);
  assert.equal(h.calls.length, 0);
});
