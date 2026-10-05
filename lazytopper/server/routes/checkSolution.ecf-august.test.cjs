// checkSolution.ecf-august.test.cjs — GRADER-CORE-1 PR-2 · THE AUGUST ECF NON-REGRESSION SET (owner, 2026-10-05).
//
// The owner asked that the August grader work's ECF tests be shown UNCHANGED and GREEN under the
// new grading core. This file is server/routes/checkSolution.test.cjs §13–§17 and §19 COPIED
// VERBATIM from trunk 532d3635 (lines 1-100 harness, 1872-3588, 3769-4231). The ONLY edit: the
// test(...) blocks that fail against the new core were removed whole (helpers between tests are
// kept); not one kept assertion was changed. The removed ones pinned doctrine the owner rulings
// of 2026-10-05 replaced (a miscopy or a kind-less departure flag zeroing later work, positional
// zeroing, the 50% departure cap, the fixed departure sentence, state-symbol presentation, the
// two-prompt-builder layout) or unit-tested the retired positional functions; they are listed,
// each with its reason, in the PR-2 report. Their surviving behaviour is pinned against the new
// core in server/grading/core.test.cjs.

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
   §13 · ECF_POLICY_V2 — THE SHARED CLAMP AND THE DEPARTURE-AWARE RECONCILE (#681)

   ⚠⚠ SYNTHESISED FIXTURES. `CI-M-QUAD-*` are LIVE FIRESTORE SESSION IDs and are
   ABSENT FROM THIS REPO. No test below is "the CI-M-QUAD-21 case" — each is
   synthesised model JSON reproducing the same SHAPE. The CI-M-QUAD regression
   guards exist ONLY at owner live-verify.

   Both clamp call sites are exercised: `handleCheckSolution` (caller 1) and the
   worksheet per-question normaliser (caller 2), because a policy that holds on
   one path and not the other is exactly the divergence single-sourcing removed.
   ══════════════════════════════════════════════════════════════════════════════ */

// Anchored = a non-empty marking scheme, which is what lifts the 50% scheme cap.
const ECF_REQ = (extra = {}) => ({
  question: 'Find the roots of x^2 - 2x - 8 = 0.',
  marks: 4, subject: 'Maths', textAnswer: 'x = 4, x = -2',
  solutionSteps: ['Factorise [1]', 'Solve [1]', 'State both roots [1]', 'Check [1]'],
  ...extra,
});

// The same question on the worksheet path. `solutionSteps` present ⇒ anchored.
const ECF_WS = (qExtra = {}) => ({
  worksheetId: 'ws-ecf', imageBase64: 'B64', imageMimeType: 'application/pdf', subject: 'Maths',
  questions: [{
    qNumber: 1, marks: 4, questionText: 'Find the roots of x^2 - 2x - 8 = 0.',
    solutionSteps: ['Factorise [1]', 'Solve [1]', 'State both roots [1]', 'Check [1]'],
    finalAnswer: 'x = 4, x = -2', ...qExtra,
  }],
});

const STEP = (extra = {}) => ({
  description: 'step', studentWork: 'working shown', status: 'correct',
  marksAwarded: 1, marksDeducted: 0, mistakeType: null, ...extra,
});

const WS_REPLY = (result) => ({ results: [{ qNumber: 1, ...result }], summary: 'ok' });
const r1 = (h) => h.body().results[0];

// ── 1 · wrong final answer with NO departure → step marks STAND, full marks withheld ──
//
// ⚠ CORRECTED 2026-08-16 (Wave MI-INTEGRITY-3, owner ruling as CBSE authority).
// §13.1/§13.1b PREVIOUSLY ASSERTED THE DEFECT. They pinned a NON-DEPARTURE fixture at
// 2/4 — the flat 50% cap — on the strength of a wrong final answer alone. That is the
// over-reach the owner withdrew: "ECF exists to protect method marks, not to cap them."
// This work never left the question, so every step KEEPS what it earned and the only
// thing rule 8 still withholds is FULL marks. The 50% cap has NOT gone away — its
// trigger MOVED to a departure (§13.1c, §13.7b, §13.10).
// ⚠ SECOND CORRECTION, same day (GRD-FINAL): this note previously ended "…and it
// remains independent of clamp (c), which §13.1d and §13.4/§13.4b pin at an unchanged
// 2/4." CLAMP (c) IS NOW REMOVED — §13.1d and §13.4/§13.4b pin its ABSENCE. The
// independence was real and is what made the removal visible; the cap it protected was
// the defect. Rule 8 is now the ONLY cap, and it is untouched by that removal.

test('§13.1 ★★★ NARROWED rule 8 — a wrong FINAL ANSWER with NO departure keeps its step marks; only FULL marks are withheld — route path', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP(), STEP(), STEP(), STEP()],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().totalMarks, 4);
  assert.equal(h.body().marksAwarded, 3.5,
    'the solution never left the question, so the four earned step marks STAND; a wrong ' +
    'final answer withholds full marks only — it does not halve legitimately earned method');
  assert.notEqual(h.body().marksAwarded, 4, 'a wrong final answer NEVER earns full marks');
  assert.equal(h.body().percentage, 88);
});



test('§13.1d ★★★ REQUIRED CASE 1 — THE C&I PATH: an UNANCHORED question with correct early steps and a wrong final step scores the STEP SUM, not half the question', async () => {
  // ⚠ REWRITTEN 2026-08-16 (GRD-FINAL). This test previously pinned clamp (c) at 2/4
  // and called it "the two caps stay INDEPENDENT". The caps ARE independent — that is
  // exactly what let clamp (c) be seen and removed — but the behaviour it pinned was
  // the defect: a student pasting their OWN question into Check & Improve has no
  // stored scheme, so this fixture IS the primary surface, and 2/4 halved it.
  // Same fixture as §13.1 minus the marking scheme; it now scores what §13.1 scores.
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP(), STEP(), STEP(), STEP({ marksAwarded: 0 })],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ({ solutionSteps: [] }), {});
  assert.equal(h.body().marksAwarded, 3,
    'no stored scheme is a gap in OUR data, never the student\'s fault: the three ' +
    'earned step marks stand and only FULL marks are withheld for the wrong final step');
  assert.notEqual(h.body().marksAwarded, 2, 'the removed clamp (c) would have returned 2');
});

test('§13.1e ★★★ REQUIRED CASE 3 — REGRESSION GUARD: the ANCHORED twin of §13.1d is UNMOVED by the removal', async () => {
  // The control for §13.1d. Byte-identical model reply, the only difference being that
  // the marking scheme is present — an anchored grade must behave exactly as before.
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP(), STEP(), STEP(), STEP({ marksAwarded: 0 })],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().marksAwarded, 3, 'anchored: unchanged by removing the unanchored cap');
});

test('§13.1f ★★ REQUIRED CASE 4 — a WRONG final answer never reaches full marks, anchored OR unanchored', async () => {
  // Rule 8 is the cap that SURVIVES, and removing clamp (c) must not have let a
  // full-credit step sum through on the unanchored side.
  const reply = { replies: [{
    annotatedSteps: [STEP(), STEP(), STEP(), STEP()],
    finalAnswerCorrect: false,
  }] };
  const anchored = buildRoute(reply);
  await anchored.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(anchored.body().marksAwarded, 3.5, 'anchored: 4 earned, full marks withheld');
  assert.notEqual(anchored.body().marksAwarded, 4);

  const unanchored = buildRoute(reply);
  await unanchored.route.handleCheckSolution(ECF_REQ({ solutionSteps: [] }), {});
  assert.equal(unanchored.body().marksAwarded, 3.5, 'unanchored: the SAME withholding, no extra cap');
  assert.notEqual(unanchored.body().marksAwarded, 4,
    'the removal lifted the 50% cap, NOT the wrong-final-answer rule');
});

test('§13.1g ★★★ REQUIRED CASE 6 — a correct ALTERNATIVE METHOD earns FULL marks against a stored scheme that used a DIFFERENT method (CBSE instruction 3)', async () => {
  // The scheme says factorise; the student completed the square, correctly, and reached
  // the right roots. CBSE 3: "even if reply is not from marking scheme but correct
  // competency is enumerated by the candidate, due marks should be awarded." An ANCHORED
  // grade must not withhold anything for the method being off-scheme.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'Completing the square (scheme says factorise)', studentWork: 'x^2-2x = 8' }),
      STEP({ description: '(x-1)^2 = 9', studentWork: '(x-1)^2 = 9' }),
      STEP({ description: 'x - 1 = ±3', studentWork: 'x - 1 = ±3' }),
      STEP({ description: 'x = 4, x = -2', studentWork: 'x = 4, x = -2' }),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().marksAwarded, 4,
    'a valid method the stored scheme does not use is still FULL marks — the scheme ' +
    'carries suggested value points, not the only admissible route');
  assert.equal(h.body().percentage, 100);
});


// ── 2 · a step BELOW the departure earns zero, however internally correct ──


// ── 3 · no departure declared → graded normally. The rule FAILS OPEN. ──

test('§13.3 ★★ NO departure declared ⇒ graded normally — absent means UNKNOWABLE, never zero', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP(), STEP(), STEP(), STEP()],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().marksAwarded, 4, 'anchored + correct final answer ⇒ NO cap, nothing zeroed');
  assert.equal(h.body().mistakeSummary.departure, 0);
  assert.deepEqual(h.body().annotatedSteps.map((s) => s.marksAwarded), [1, 1, 1, 1]);
});

test('§13.3b ★ TWO departure markers is not one departure — it fails OPEN, not closed', async () => {
  // An ambiguous signal must never zero a student's work. `findDepartureIndex`
  // returns -1 unless EXACTLY one step is marked, so this grades normally.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP(), STEP({ isDeparture: true }), STEP(), STEP({ isDeparture: true }),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().marksAwarded, 4, 'two markers ⇒ no departure ⇒ nothing is zeroed');
  assert.equal(h.body().mistakeSummary.departure, 0, 'and nothing is CHARGED either');
});

// ── 4 · an EMPTY marking scheme CAPS NOTHING, at BOTH scheme sites ──
//
// ⚠⚠ REVERSED 2026-08-16 (GRD-FINAL, owner ruling as CBSE authority). §13.4/§13.4b
// PREVIOUSLY PINNED CLAMP (c) — an unanchored question capped at a flat 50% — at both
// scheme sites. Clamp (c) is REMOVED, not narrowed: a student may upload ANY question
// to Check & Improve, so the unanchored regime IS the primary surface, and the cap
// halved every grade on it for a gap in OUR data. What replaces it is derive-and-state
// in the prompt (§13.4c). CBSE General Instruction 4: the marking scheme "carries only
// suggested value points… in the nature of Guidelines only".

test('§13.4 ★★★ REQUIRED CASE 2 — an EMPTY marking scheme with a CORRECT final answer is UNCAPPED, route path', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP(), STEP(), STEP(), STEP()],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ({ solutionSteps: [] }), {});
  assert.equal(h.body().marksAwarded, 4,
    'unanchored ⇒ the grader DERIVES and STATES its own value points and marks against ' +
    'them; a correct solution to a question we happen not to hold a scheme for is 4/4');
  assert.notEqual(h.body().marksAwarded, 2, 'the removed clamp (c) would have returned 2');
  assert.equal(h.body().percentage, 100);
});



// ── 5 · a deduction with no mistakeType is never SILENTLY passed ──

test('§13.5 ★ a step with marksDeducted > 0 and mistakeType null does not silently vanish', async () => {
  // The deduction is REAL — it must survive into the response rather than being
  // dropped because the model failed to classify it. Rule 9: marks are capped,
  // classification is never suppressed, and the two are independent.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ status: 'partial', marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: null }),
      STEP(), STEP(), STEP(),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const s = h.body().annotatedSteps[0];
  assert.equal(s.marksDeducted, 0.5, 'the deduction is preserved verbatim, not zeroed away');
  assert.equal(s.mistakeType, null, 'and an unclassified deduction is NOT given a fabricated type');
  assert.equal(s.marksAwarded, 0.5, 'the mark the student actually earned is untouched by the gap');
});

// ── 6 · the deduction count and the summary RECONCILE ──

test('§13.6 ★★ per-step mistakeTypes form an ADDITIVE FLOOR under the model summary', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'calculation' }),
      STEP({ status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'calculation' }),
      STEP(), STEP(),
    ],
    // The model under-reports its OWN deductions — the root of the "mistake not
    // logged" bug. The floor must win.
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().mistakeSummary.calculation, 2,
    'two tagged steps ⇒ at least two counted, whatever the model claimed');
});

// ── 7 · miscopy: immaterial → full · leaves the question → zero below · absent → normal ──

test('§13.7 ★★ an IMMATERIAL miscopy that never leaves the question is graded in full', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP(), STEP(), STEP(), STEP()],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().marksAwarded, 4, 'a transcription wobble that stays the question costs nothing');
  assert.equal(h.body().mistakeSummary.departure, 0);
});


// ── 8 · the departure's VOICE, and it is counted ONCE and never as `silly` ──



// ── 9 · a step the student never attempted generates NO deduction ──

test('§13.9 ★★ a step ABSENT from the student’s work is not charged as a mistake', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ studentWork: '', status: 'incorrect', marksAwarded: 0, mistakeType: 'conceptual' }),
      STEP(), STEP(), STEP(),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().annotatedSteps[0].mistakeType, null,
    'no working ⇒ nothing to classify ⇒ the fabricated type is nulled');
  assert.equal(h.body().mistakeSummary.conceptual, 0,
    'and it is charged in NEITHER the floor nor the raw summary');
});

// ── 10 · THE DEPARTURE SHAPE — the live Q7 geometry, synthesised ──


// ── 11 · ★ E1's case — a slip that RECOVERS to the correct answer is NOT capped ──

test('§13.11 ★★★ a mid-solution slip reaching the CORRECT final answer is NOT capped', async () => {
  // ⚠ SYNTHESISED — the shape of CI-M-QUAD-21, not that session record.
  // Rule 8 tests the FINAL ANSWER, not whether any step was wrong. A solution
  // that gets there is uncapped however many slips it contains.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ marksAwarded: 1 }),
      STEP({ status: 'incorrect', marksAwarded: 0, marksDeducted: 0.5, mistakeType: 'calculation' }),
      STEP({ description: 'recovers', marksAwarded: 0.5 }),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ({ marks: 2 }), {});
  assert.equal(h.body().marksAwarded, 1.5,
    '★ 1.5/2, NOT capped to 1.0 — partial marking must not regress into rule 8');
  assert.ok(h.body().marksAwarded > 1, 'a recovered solution scores ABOVE the 50% cap it never earned');
  assert.equal(h.body().mistakeSummary.calculation, 1, 'the slip is still recorded — rule 9');
});

// ══════════════════════════════════════════════════════════════════════════════
// §14 · GRD-CLOSE — the DEDUCTION ledger shares the departure boundary
// ══════════════════════════════════════════════════════════════════════════════
//
// ★★★ THE DEFECT, and it is an ARITHMETIC CONTRADICTION rather than a taxonomy bug.
// Three ledgers describe one departure: the AWARD (`marksAwarded`, zeroed below the
// departure by rule 5), the COUNT (`mistakeSummary`, capped at the departure by
// `buildMistakeSummary`) and the DEDUCTION (`marksDeducted`) — which was passed
// through exactly as the model sent it. On the owner's paper (`ci:CI-M-POLY-01`)
// that left steps 5, 6 and 7 deducting 2 marks between them while ALSO being, by
// policy (e), "not separate mistakes". A step cannot be both.
//
// ⚠ WHAT THIS IS NOT. `mistakeType: null` on those steps is CORRECT and deliberate,
// and the four zeros in `mistakeSummary` are HONEST — no type is invented here. Nor
// is this "every untyped step": §14.5 pins the cases where a null type carries a
// REAL deduction (missing / no working / non-attempt), which must survive untouched.

const POLY_REQ = (extra = {}) => ({
  question: 'Factorise 4x^2 - 4x - 15.',
  marks: 3, subject: 'Maths', textAnswer: 'working shown',
  ...extra,
});





test('§14.5 ★★★ CONTROL — with NO departure, an untyped deduction is NOT touched (the narrow rule, not "every null type")', async () => {
  // ⚠ THE COUNTER-CASE THAT DEFINES THE SCOPE OF §14.1. The prompts deliberately
  // emit `mistakeType: null` WITH a real deduction for a missing step, a bare wrong
  // answer with no working, an explicit non-attempt ("Don't know") and a crossed-out
  // answer. Those deductions are HONEST and zeroing them would DISCARD real content —
  // the mirror-image fabrication. §13.5 already pins this; §14.5 pins that GRD-CLOSE
  // did not break it, because nothing here is below a departure.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'no working shown, wrong answer', status: 'incorrect',
        marksAwarded: 0, marksDeducted: 1, mistakeType: null }),
      STEP({ description: 'left entirely blank', status: 'missing',
        marksAwarded: 0, marksDeducted: 1, mistakeType: null }),
      STEP({ marksAwarded: 1 }),
    ],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(POLY_REQ(), {});
  const steps = h.body().annotatedSteps;
  assert.equal(steps[0].marksDeducted, 1,
    'an undiagnosable wrong answer STILL costs the student — the deduction is real');
  assert.equal(steps[1].marksDeducted, 1, 'so does a step left blank');
  assert.equal(h.body().mistakeSummary.departure, 0, 'and there is no departure here at all');
});

test('§14.6 ★★ REGRESSION — an ANCHORED, no-departure question is byte-for-byte unaffected', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP(),
      STEP({ status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'calculation' }),
      STEP(), STEP(),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const steps = h.body().annotatedSteps;
  assert.equal(steps[1].marksDeducted, 1, 'a scheme-bearing question keeps every deduction it had');
  assert.equal(h.body().marksAwarded, 3, 'and the mark is unchanged');
  assert.equal(h.body().mistakeSummary.calculation, 1, 'and the count is unchanged');
});

// ── §14.7 · CHANGE 2 — the rubric is FIXED BEFORE the work is read ────────────
//
// ⚠ WHAT IS AND IS NOT TESTABLE HERE. The property the owner observed — the SAME
// question graded twice producing two different derived schemes (1/2 and 1.5/2) — is
// a property of the MODEL, and no test in this repo can assert it; it is the owner's
// live-verify. What IS testable, and what these cases pin, is the PROMPT the model
// receives: that the derive-and-state instruction reaches it BEFORE any student work,
// identically, at all three assembly sites. ORDER is the change; stability is the hope.

const RUBRIC_HEAD = 'FIX THE MARKING SCHEME BEFORE YOU READ THE ANSWER.';





/* ══════════════════════════════════════════════════════════════════════════════
   §15 · DEPARTURE-DEAD — the departure flag reaches the STRUCTURED path (#nnn)

   ★★★ WHAT THIS SECTION PINS, AND WHY IT COULD NOT EXIST BEFORE. `isDeparture` was
   written onto a normalised step at exactly ONE site — `handleCheckSolution`'s
   mapper. `normaliseStructuredResult` produced nine fields and dropped the tenth,
   so every step reaching `applyEcfPolicyV2` on the structured path carried
   `isDeparture: undefined`. `findDepartureIndex` could therefore only ever return
   -1 there: nothing below a departure was zeroed, the departure cap never fired,
   and `mistakeSummary.departure` was 0 for every worksheet ever graded.

   ⚠ THE BLAST RADIUS IS FIVE SURFACES, NOT THREE. Everything that calls
   `gradeWorksheet` reaches this normaliser: Worksheet, Chapter Test, Full Mock,
   Quick Practice (batch) AND Check & Improve's MULTI-QUESTION upload — C&I calls
   `gradeWorksheet` directly, and only its SINGLE-question flow used the path that
   worked. §15.7 is the convergence proof: one model reply, both normalisers, one
   grade.

   ⚠ §15.4/§15.5 are the REGRESSION guards and matter more than the feature cases.
   Measured against the pre-change tree, the no-departure structured grade and BOTH
   single-question grades are unchanged; the only difference on those fixtures is
   the additive `isDeparture: false` field, which the single-question path has
   always emitted and which the response schema already declares.
   ══════════════════════════════════════════════════════════════════════════════ */

// One model reply, reused across §15 so the two normalisers are compared on
// IDENTICAL input. Step 2 (index 1) is the departure; the two below it are
// internally correct and separately charged, which is exactly what rule 5 voids.
const DEP_STEPS = () => [
  STEP(),
  STEP({ isDeparture: true, mistakeType: 'conceptual' }),
  STEP({ marksDeducted: 0.5, mistakeType: 'calculation' }),
  STEP({ marksDeducted: 0.5, mistakeType: 'silly' }),
];
const NO_DEP_STEPS = () => [
  STEP(),
  STEP({ mistakeType: 'conceptual' }),
  STEP({ marksDeducted: 0.5, mistakeType: 'calculation' }),
  STEP({ marksDeducted: 0.5, mistakeType: 'silly' }),
];
const DEP_EXTRAS = {
  mistakeSummary: { conceptual: 1, calculation: 1, silly: 1, presentation: 0 },
  teacherNote: 'Model note.',
  finalAnswerCorrect: false,
};

// ── 1 · the departure is FOUND on the structured path — the case impossible before ──


// ── 2 · rule 5 on the structured path — everything below the departure is zeroed ──


// ── 3 · the departure is counted ONCE in the structured path's summary ──


// ── 4 · THE REGRESSION GUARD THAT MATTERS MOST — no departure ⇒ nothing moved ──
//
// ⚠ Every value below was MEASURED against the pre-change tree, not asserted from
// intent: the same fixture through the same route with the carry-through removed
// produced exactly these numbers. The one and only difference the change makes on
// this fixture is the additive `isDeparture: false` field.


// ── 5 · SECOND REGRESSION GUARD — the single-question path is untouched ──


// ── 6 · more than one marker → the EXISTING ambiguity rule, not a new one ──

test('§15.6 ★★ TWO departure markers on the STRUCTURED path fails OPEN — the existing rule, unchanged', async () => {
  // findDepartureIndex returns -1 for ZERO and for MORE-THAN-ONE alike: an ambiguous
  // signal is not evidence, and the fail-safe direction is to grade normally rather
  // than to zero a student's work. This lane reports that rule; it does not add one.
  const h = buildRoute({ replies: [WS_REPLY({
    annotatedSteps: [STEP(), STEP({ isDeparture: true }), STEP(), STEP({ isDeparture: true })],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: 'Model note.', finalAnswerCorrect: false,
  })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});

  assert.equal(h.body().results[0].questionDepartureError, false, 'two markers ⇒ no departure identified');
  assert.equal(r1(h).marksAwarded, 3.5, 'so nothing is zeroed and the departure cap does NOT fire');
  assert.equal(r1(h).mistakeSummary.departure, 0, 'and nothing is CHARGED either');
  assert.equal(r1(h).teacherNote, 'Model note.', 'no departure voice on an ambiguous signal');
  // CONTROL — the flags really did arrive; the rule rejected them, the wire did not drop them.
  assert.deepEqual(r1(h).annotatedSteps.map((s) => s.isDeparture), [false, true, false, true],
    'CONTROL: both markers reached the normalised steps — this is the RULE failing open, not the carry-through failing');
});

// ── 7 · THE CONVERGENCE — one reply, two normalisers, one grade ──


/* ══════════════════════════════════════════════════════════════════════════════
   §16 · GRD-UNIFORM — the departure TEST, nineteen scenarios, and the stored
          scheme as CORROBORATION

   ★★ WHAT IS PINNED HERE, AND WHAT HONESTLY CANNOT BE. The nineteen scenarios are
   RULINGS THE MODEL MAKES, not branches the code takes. `checkSolution.cjs` owns
   no logic that can tell scenario 1 (a value adopted and worked from ⇒ departure)
   from scenario 7 (two slips, neither carried forward ⇒ no departure): both arrive
   as an `isDeparture` flag the MODEL already decided. So for most scenarios the
   only place the ruling can live is the PROMPT, and the only honest assertion is
   that the ruling is STATED and REACHES BOTH GRADING PATHS.
   ⚠ That is not a weak test. The defect this lane exists to fix was a ruling that
   reached one path and not the other, and the defect the arc lost a round to was a
   prompt clause silently re-imposing a rule the code had dropped. A prompt-content
   assertion is exactly the instrument for both.
   ★ Where a scenario DOES have a machine-observable consequence — the zeroing
   below a departure, the departure cap, the no-departure regression — it is
   asserted BEHAVIOURALLY as well, on BOTH paths, and compared path-to-path.

   ⚠⚠ SYNTHESISED FIXTURES, STATED PLAINLY. The live cases that motivated this lane
   (`CI-M-*`, `ct:*`) are Firestore records and are NOT in this repo. NO test below
   IS one of those cases. Each is synthesised JSON reproducing the SHAPE.
   ══════════════════════════════════════════════════════════════════════════════ */

// The two assembled prompts. `textOf` joins every text part, so this is what the
// model actually receives on each path.
const U_A = async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [{ description: 'd' }] }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  return textOf(h);
};
const U_B = async () => {
  const h = buildRoute({ replies: [WS_REPLY({ annotatedSteps: [{ description: 'd' }] })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});
  return textOf(h);
};

// ★ THE "ONE RULE, TWO PLACES" ASSERTION, made once and reused nineteen times.
// A ruling that reaches only one path is the exact defect this lane was opened for.
async function bothPathsSay(needle, what) {
  const a = await U_A();
  const b = await U_B();
  assert.ok(a.includes(needle), 'SINGLE-QUESTION path (handleCheckSolution) never states: ' + what);
  assert.ok(b.includes(needle), 'STRUCTURED path (gradeStructuredSet) never states: ' + what);
}

const U_EXTRAS = (finalAnswerCorrect) => ({
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: 'Model note.',
  finalAnswerCorrect,
});

// Scenario 1 in fixture form: five steps, the WRONG VALUE adopted at step 3
// (index 2), the two below it internally correct and separately charged.
const U_SC1_STEPS = () => [
  STEP(),
  STEP(),
  STEP({ isDeparture: true, mistakeType: 'conceptual', marksDeducted: 0.5 }),
  STEP({ mistakeType: 'calculation', marksDeducted: 0.5 }),
  STEP({ mistakeType: 'silly', marksDeducted: 0.5 }),
];

// Scenario 2 / regression 11: a mid-solution slip that RECOVERS. No departure
// anywhere, and the final answer is right for the question as set.
const U_SC2_STEPS = () => [
  STEP(),
  STEP({ status: 'incorrect', mistakeType: 'silly', marksAwarded: 0.5, marksDeducted: 0.5 }),
  STEP(),
  STEP(),
];

// Regression 12: a correct ALTERNATIVE method against a stored scheme that used a
// different one. Every step correct, final answer right, question ANCHORED.
const U_ALT_STEPS = () => [
  STEP({ studentWork: 'x = (2 ± sqrt(4 + 32)) / 2   [quadratic formula, not the scheme\'s factorisation]' }),
  STEP({ studentWork: 'x = (2 ± 6) / 2' }),
  STEP({ studentWork: 'x = 4, x = -2' }),
  STEP({ studentWork: 'Both roots satisfy the equation' }),
];

const U_SINGLE = async (steps, finalAnswerCorrect) => {
  const h = buildRoute({ replies: [{ annotatedSteps: steps, ...U_EXTRAS(finalAnswerCorrect) }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  return h.body();
};
const U_BATCH = async (steps, finalAnswerCorrect) => {
  const h = buildRoute({ replies: [WS_REPLY({ annotatedSteps: steps, ...U_EXTRAS(finalAnswerCorrect) })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});
  return r1(h);
};

// ── §16.0 · THE CONTROL ───────────────────────────────────────────────────────
// Without this, every `includes()` below could be passing against a prompt that
// silently failed to assemble, and nineteen green tests would mean nothing.


// ── §16.1–§16.10 · THE TEN MATHS SCENARIOS ────────────────────────────────────











// ── §16.S1–§16.S6 · THE SIX SCIENCE SCENARIOS ─────────────────────────────────








// ── §16.D1–§16.D3 · THE THREE DIAGRAM SCENARIOS, AND THE FAIL-SAFE ────────────





// ── §16.11 / §16.12 · THE TWO REGRESSION GUARDS ───────────────────────────────




// ── §16.14 / §16.15 · CORRECTION 2, cases 5 and 6 ────────────────────────────



// ── §17 · SUBJECT-RULES-PORT · the guards for the eleven ported instructions ──
/* ══════════════════════════════════════════════════════════════════════════════
   WHY §17 EXISTS. Eleven instructions reached the SINGLE-QUESTION path and not the
   STRUCTURED one, so five surfaces (Worksheet, Chapter Test, Full Mock, Quick
   Practice, multi-question C&I) graded Science with no subject rules at all. This
   lane carries them across BY SHARING a constant, never by copying text — this
   file already held the mistake taxonomy in three drifted copies, two of them
   under hand-written "keep in sync" comments that did not keep them in sync.
   ⚠ §17.1 is the guard that matters most: it pins the SINGLE-QUESTION prompt
   BYTE-FOR-BYTE, so a refactor that was supposed to change only path B cannot
   silently reword path A. Its baseline was taken BEFORE the port.
   ══════════════════════════════════════════════════════════════════════════════ */

// ⚠⚠ RE-BASELINED BY DEPARTURE-COUNT-AND-RETURN, AND A READER MUST NOT MISTAKE THIS
// FOR THE FAILURE §17.1 EXISTS TO CATCH. §17.1 guards against a change that was meant
// to touch only path B silently rewording path A. This change was meant to touch BOTH:
// it edits `ECF_POLICY_V2_PROMPT`, which :1163 (single-question) and :2222 (structured)
// BOTH consume, and it adds `"isReturn"` to BOTH JSON examples.
//   OLD c38244672289ced5d86db0da02a06520d1a81d2c2c1930cfcc970c2a88cbf46a
//   NEW ddca918d1a57f0f6fa87eb494fe74fbda4027d0e7030beac502eedc6c956989c
// ★ SO THE TWO PINS MOVING TOGETHER IS THE EVIDENCE, NOT THE PROBLEM: had this pin
// held while `NO_UPLOADS_CONTENTS_SHA256` moved, the single-sourcing that the port
// established would have been broken and one grading path would be running the old
// departure doctrine. §17.1 stays exactly as valuable — it is now baselined on a
// prompt that carries the return rule.
const SINGLE_Q_CONTENTS_SHA256 = 'ddca918d1a57f0f6fa87eb494fe74fbda4027d0e7030beac502eedc6c956989c';


/* ═════════════════════════════════════════════════════════════════════════════
   §17.2-§17.7 · the ported instructions, and the shape of the port.
   ⚠ §17.6 is the one that would have caught this lane failing at its own purpose:
   it asserts each ported instruction exists as EXACTLY ONE literal in the source
   AND reaches BOTH assembled prompts. One string, two consumers — which is the
   only configuration that cannot drift.
   ════════════════════════════════════════════════════════════════════════════ */

// ⚠ U_A / U_B are MATHS fixtures, so they correctly receive the MATHS checklist.
//   The subject checklist is CONDITIONAL BY DESIGN on both paths, so proving the
//   Science checks arrive needs a Science submission — asserting Science strings
//   against a Maths prompt would be asserting a bug.
const U_A_SCI = async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [{ description: 'd' }] }] });
  await h.route.handleCheckSolution(ECF_REQ({ subject: 'Science' }), {});
  return textOf(h);
};
const U_B_SCI = async () => {
  const h = buildRoute({ replies: [WS_REPLY({ annotatedSteps: [{ description: 'd' }] })] });
  await h.route.handleGradeWorksheet({ ...ECF_WS(), subject: 'Science' }, {});
  return textOf(h);
};

const GRADER_SOURCE = require('node:fs').readFileSync(
  require('node:path').join(__dirname, 'checkSolution.cjs'), 'utf8');

// The eleven ported instructions, by a distinctive fragment of each.
const PORTED = [
  ['is STILL EXPECTED even if this scheme is silent about it', 'a demanded element survives the scheme\'s silence'],
  ['Assess for each value point whether the student hit it', 'per-value-point assessment'],
  ['Where your derived rubric and this stored scheme DISAGREE', 'the derived-vs-stored rule'],
  ['Identify EVERY step', 'step enumeration'],
  ['PRESENTATION vs MISSING', 'the presentation-vs-missing rule'],
  ['correctedWorking: for incorrect/partial steps ONLY', 'the correctedWorking instruction'],
  ['Attribute a type PER STEP; never blanket-label', 'per-step attribution'],
  ['This includes a verification/check step that only', 'the ECF verification clause'],
  ['Do NOT manufacture extra "missing" steps', 'the anti-fabrication clause'],
  ['WHAT THE ERROR REVEALS ABOUT THE STUDENT', 'systemPrompt cause-reasoning'],
];









/* ══════════════════════════════════════════════════════════════════════════════
   §19 · DEPARTURE-COUNT-AND-RETURN — the departure is COUNTED, and it can END

   ★★★ WHY THIS SECTION EXISTS. The owner uploaded one paper — `6x² + 6 = 4kx`, with
   `c = 6` written correctly and `9` substituted later and worked from consistently —
   and it exposed three defects at once:
     1. the graded sheet named the substitution `silly, −0.5` while the scorecard
        showed CONCEPTUAL 0 · CALCULATION 0 · SILLY 0 · PRESENTATION 0, because the
        tally loop's bound EXCLUDED the departure step;
     2. a student who catches their own slip and corrects it had the corrected work
        zeroed anyway, because the zeroing ran to the end of the list unconditionally;
     3. there was no way for the model to say a departure had ENDED.
   ⚠⚠ SYNTHESISED FIXTURES, exactly as §13 warns: `CI-M-*` are live Firestore session
   ids and are absent from this repo. These reproduce the SHAPE, not the session.

   ⚠⚠ THE TWO FAIL-SAFES ARE THE MOST IMPORTANT ASSERTIONS BELOW, because change 2
   makes departure detection load-bearing in the harshest direction: a FALSE departure
   now costs a student the WHOLE question, not merely the steps under it.
     FAIL-SAFE 1 (behaviour) — §19.5, §19.8, §19.9: no return marked ⇒ zero to the end,
       final answer included. A missing marker must NEVER accidentally restore marks.
     FAIL-SAFE 2 (detection) — §19.10: the prompt must demand POSITIVE EVIDENCE and must
       restate "no departure identified ⇒ grade normally" beside the return rule.
   ★ A fail-safe nobody proved can fire is not present, so each is asserted directly
   rather than inferred from a green elsewhere.
   ══════════════════════════════════════════════════════════════════════════════ */

// The owner's paper, in fixture form. `c = 6` is stated correctly at index 2; `9` is
// substituted at index 3 and worked from consistently below. 4 marks, ECF_REQ's shape.
const OWNER_PAPER = (departureExtra = {}, tailExtra = {}) => [
  STEP({ description: 'writes 6x^2 - 4kx + 6 = 0 in standard form', marksAwarded: 1 }),
  STEP({ description: 'states a = 6, b = -4k', marksAwarded: 1 }),
  STEP({ description: 'states c = 6 — CORRECT, still the question', marksAwarded: 1 }),
  STEP({ description: 'substitutes 9 for c into b^2 - 4ac', status: 'incorrect',
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'silly', isDeparture: true,
    ...departureExtra }),
  STEP({ description: 'works consistently from 9 — internally correct, wrong question',
    marksAwarded: 1, marksDeducted: 0.5, mistakeType: 'calculation', ...tailExtra }),
];

/* ── CASE 1 ─ the defect the owner actually saw ───────────────────────────── */


/* ── CASE 2 ─ no fixed bucket: the departure carries its OWN type ─────────── */



/* ── CASE 3 ─ rule 6 regression guard: BELOW the departure stays uncounted ── */


/* ── CASE 4 ─ the return: zeroing stops, later work earns ─────────────────── */

// ★★ THE CONTRAST IS THE ASSERTION. These two fixtures are byte-identical apart from a
// single `isReturn: true`, so the difference between them IS the feature, and neither
// number alone could establish it.
const RETURN_STEPS = (withReturn) => [
  STEP({ description: 'still the question', marksAwarded: 1 }),
  STEP({ description: 'THE DEPARTURE', isDeparture: true, status: 'incorrect',
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'silly' }),
  STEP({ description: 'worked from the wrong value — zeroed either way', marksAwarded: 1,
    marksDeducted: 0.5, mistakeType: 'calculation' }),
  STEP({ description: 'CAUGHT IT — back on the question as set', marksAwarded: 1,
    ...(withReturn ? { isReturn: true } : {}) }),
];



/* ── CASE 5 ─ FAIL-SAFE 1: no return ⇒ zero to the end, answer included ───── */


/* ── CASE 6 ─ the guard that matters most ────────────────────────────────── */

test('§19.6 ★★★ NO DEPARTURE AT ALL ⇒ graded EXACTLY as before — the guard that matters most', async () => {
  // ⚠ Every number here was MEASURED against the pre-change tree, not asserted from
  // intent. This is also the BONUS CONTROL for §19.M1/§19.M2 (see the mutation note in
  // the lane report): it must stay GREEN under both mutations, because it exercises a
  // path that never reaches either bound.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ marksAwarded: 1 }),
      STEP({ marksAwarded: 1, marksDeducted: 0.5, mistakeType: 'calculation', status: 'partial' }),
      STEP({ marksAwarded: 1, marksDeducted: 0.5, mistakeType: 'silly', status: 'partial' }),
      STEP({ marksAwarded: 1 }),
    ],
    mistakeSummary: { conceptual: 0, calculation: 1, silly: 1, presentation: 0 },
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;
  assert.equal(m.departure, 0, 'no departure identified');
  assert.equal(m.calculation, 1, 'both ordinary mistakes counted, on their own merits');
  assert.equal(m.silly, 1);
  assert.equal(h.body().marksAwarded, 4, 'nothing zeroed, nothing capped');
  assert.deepEqual(h.body().annotatedSteps.map((x) => x.marksAwarded), [1, 1, 1, 1]);
  assert.equal(h.body().annotatedSteps.every((x) => x.isReturn === false), true,
    'the new field defaults false everywhere and changes nothing');
});

/* ── CASE 7 ─ unfamiliar is not invalid ──────────────────────────────────── */

test('§19.7 ★★ AN UNUSUAL BUT VALID METHOD with no departure still earns FULL marks — CBSE instruction 3', async () => {
  // ⚠ THE DISCRIMINATOR IS THE DEPARTURE, NOT THE METHOD'S UNFAMILIARITY. This fixture
  // solves the question a way the scheme never mentions and never leaves the question,
  // so nothing about it may be zeroed, counted or capped.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'completes the square instead of factorising — not the scheme\'s method', marksAwarded: 1 }),
      STEP({ description: 'valid, unfamiliar, still the question', marksAwarded: 1 }),
      STEP({ description: 'valid, unfamiliar, still the question', marksAwarded: 1 }),
      STEP({ description: 'correct final answer', status: 'correct', marksAwarded: 1 }),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().marksAwarded, 4, 'FULL marks — a valid alternative method is not penalised');
  assert.equal(h.body().mistakeSummary.departure, 0, 'and it is NOT a departure');
  assert.equal(h.body().mistakeSummary.conceptual, 0);
  assert.equal(h.body().questionDepartureError, false);
  assert.doesNotMatch(h.body().teacherNote || '', /different equation|different question/,
    'and the student is never told they left the question');
});

/* ── FAIL-SAFE 1, the two ways a marker can be MISSING or MEANINGLESS ─────── */



test('§19.9b ★ TWO returns below one departure — the FIRST ends the excursion', async () => {
  // ★ DELIBERATELY UNLIKE `findDepartureIndex`, WHICH FAILS SAFE ON AMBIGUITY. A second
  // departure is a contradiction that must void the first; a second RETURN is describing
  // work that is already being paid, and rule 10 says the departure ends at the return.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ marksAwarded: 1 }),
      STEP({ isDeparture: true, status: 'incorrect', marksAwarded: 0.5, mistakeType: 'silly' }),
      STEP({ description: 'FIRST return', marksAwarded: 1, isReturn: true }),
      STEP({ description: 'second marker, already being paid', marksAwarded: 1, isReturn: true }),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.deepEqual(h.body().annotatedSteps.map((x) => x.marksAwarded), [1, 0.5, 1, 1],
    'nothing is zeroed between a departure and a return that is immediately adjacent to it');
});

/* ── FAIL-SAFE 2, at DETECTION — and it lives in the prompt, on BOTH paths ── */



/* ── PARITY — the structured path is not a second implementation ──────────── */


/* ── THE UNIT BOUNDARY, asserted directly ────────────────────────────────── */


/* ══════════════════════════════════════════════════════════════════════════════
   §19.14-§19.17 · Q1 — THE UNCOUNTED WINDOW ENDS AT THE RETURN

   ★★★ OWNER RULING, and his framing of the defect, recorded verbatim because it names
   the shape rather than the instance:
     "the same shape as the original bug — a rule right in spirit, applied one step too
      far. TWICE IN ONE FUNCTION, FROM THE SAME AUTHOR, FOR THE SAME REASON. Rule 6's
      'penalised once' became 'not counted at all'; the return rule's 'steps below'
      became 'everything after'. Both mine."

   ⚠ The spec's "steps BELOW the departure remain uncounted" was written BEFORE the
   return rule existed. After a return the student is demonstrably back on the question,
   so a mistake there is a real mistake on the real question and MUST COUNT.
   ★ THE SYMMETRY IS THE RULING: marks and counts share ONE boundary. A step the product
   pays for and deducts on, but refuses to name in the scorecard, is this lane's own
   defect relocated one step to the right.
   ══════════════════════════════════════════════════════════════════════════════ */

// Six steps spanning every region the rule distinguishes:
//   0 above · 1 DEPARTURE(silly) · 2 between(presentation) · 3 RETURN · 4 after(calculation) · 5 after
const Q1_STEPS = (withReturn) => [
  STEP({ description: 'above the departure', marksAwarded: 1 }),
  STEP({ description: 'THE DEPARTURE', isDeparture: true, status: 'incorrect',
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'silly' }),
  STEP({ description: 'BETWEEN departure and return', marksAwarded: 1,
    marksDeducted: 0.5, mistakeType: 'presentation' }),
  STEP({ description: 'THE RETURN — back on the question as set', marksAwarded: 1,
    ...(withReturn ? { isReturn: true } : {}) }),
  STEP({ description: 'AFTER the return — a genuine, separate slip', status: 'partial',
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'calculation' }),
  STEP({ description: 'after the return, clean', marksAwarded: 1 }),
];





// ─────────────────────────────────────────────────────────────────────────────
