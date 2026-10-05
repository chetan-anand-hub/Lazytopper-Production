// checkSolution.ecf-august.test.cjs — GRADER-CORE-1 PR-2 · THE AUGUST ECF NON-REGRESSION SET (owner, 2026-10-05).
//
// WHAT THIS FILE IS. server/routes/checkSolution.test.cjs §13–§17 and §19 COPIED from trunk dd338130
// (= 532d3635 for these lines; harness 1-100, helpers 774-793, tests 1872-3588 and 3769-4231: the 96
// "August ECF" tests), run against the ONE grading core. Restored after the independent ECF retirement
// audit (Desktop/diff/a15/ECF_RETIREMENT_AUDIT.md, controller decision D24) and controller decision D26.
//
// THE EDITS, AND ONLY THESE (each listed by test id in the PR-2 continuation report):
//   - 13 tests stay RETIRED because an owner ruling contradicts the doctrine they pin: 13.7b, 16.1, 16.3,
//     16.4, 16.S3, 16.S5, 16.D1, 16.D3 (a miscopy / wrong value / wrong premise as a departure, rulings 2
//     and 3), 17.1, 17.5, 17.7, 17.8 (the two-prompt layout, ruling 1), 19.17 (its caller is gone, ruling 1).
//   - Every isDeparture: true carries departureKind: 'different-problem' — ruling 3 zeroes later work only
//     for a departure WITH a kind (this also makes the kept 13.3b, 15.6 and 19.9b able to fail again).
//   - Prompt needles point at the restored wording in server/grading/rules.cjs. Where the new core had
//     DROPPED an August instruction with no ruling behind it, the instruction was RESTORED in rules.cjs
//     (D26: never re-point a test to bless an unruled change); where a ruling or spec item changed it, the
//     named assertion changed and says which ruling.
//   - PARTLY tests (14.4, 16.0, 16.2, 16.6, 16.8, 16.S2, 16.S4, 16.S3v4, 16.D0, 16.13, 16.14, 16.15, 17.2,
//     17.4, 17.6, 17.9, 19.1, 19.2): only the assertions a ruling changes were changed, each marked
//     "RULING" in place.

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

test('§13.1b ★★★ the SAME narrowed rule on the worksheet path — one doctrine, two call sites', async () => {
  const h = buildImageRoute({ replies: [WS_REPLY({
    annotatedSteps: [STEP(), STEP(), STEP(), STEP()],
    finalAnswerCorrect: false,
  })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});
  assert.equal(r1(h).totalMarks, 4);
  assert.equal(r1(h).marksAwarded, 3.5,
    'the worksheet normaliser applies the identical NARROWED rule-8 withholding');
  assert.notEqual(r1(h).marksAwarded, 4, 'a wrong final answer NEVER earns full marks');
  assert.equal(r1(h).percentage, 88);
});

test('§13.1c ★★★ a DEPARTURE fixture still zeroes the work below it (ruling 3, different-problem) — the control proving the narrowing MOVED the rule rather than removed it', async () => {
  // Identical to §13.1 but for ONE flag: the first step declares the departure. Rule 4
  // leaves that step its own mark, rule 5 zeroes the three below it, and rule 8's half
  // cap is still armed because the solution DID leave the question.
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP({ isDeparture: true, departureKind: 'different-problem' }), STEP(), STEP(), STEP()],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(h.body().totalMarks, 4);
  assert.deepEqual(h.body().annotatedSteps.map((s) => s.marksAwarded), [1, 0, 0, 0]);
  assert.equal(h.body().marksAwarded, 1,
    'departure at step 1: it keeps its own 1, the three below are zeroed, and the ' +
    'half cap (2) stays armed above that sum — the narrowing did not disarm it');
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

test('§13.1h ★★ the PROMPT carries CBSE\'s own General Instructions VERBATIM, on BOTH grading paths', async () => {
  // The doctrine is single-sourced in ECF_POLICY_V2_PROMPT, so it must arrive at both
  // prompts. These are quotations from the board — assert the board's words, not ours.
  const single = buildRoute({ replies: [{ annotatedSteps: [STEP()] }] });
  await single.route.handleCheckSolution(ECF_REQ(), {});
  const batch = buildImageRoute({ replies: [WS_REPLY({ annotatedSteps: [STEP()] })] });
  await batch.route.handleGradeWorksheet(ECF_WS(), {});

  for (const [name, text] of [['single-question', textOf(single)], ['worksheet', textOf(batch)]]) {
    assert.ok(text.includes('No marks to be deducted for the cumulative effect of an error. It should be penalized only once.'),
      'CBSE 11 must be quoted verbatim in the ' + name + ' prompt');
    assert.ok(text.includes('even if reply is not from marking scheme but correct competency is enumerated by the candidate, due marks should be awarded.'),
      'CBSE 3 (method freedom) must be quoted verbatim in the ' + name + ' prompt');
    assert.ok(text.includes('Please do not hesitate to award full marks if the answer deserves it.'),
      'CBSE 12 must be quoted verbatim in the ' + name + ' prompt');
    assert.ok(text.includes('if the answer is found to be totally incorrect, it should be marked as cross and awarded zero.'),
      'CBSE 15 must be quoted verbatim in the ' + name + ' prompt');
    assert.ok(/METHOD FREEDOM[\s\S]{0,400}EVEN WHEN a marking scheme IS supplied/.test(text),
      'method freedom must be stated to apply in the ANCHORED regime too (' + name + ')');
  }
});

// ── 2 · a step BELOW the departure earns zero, however internally correct ──

test('§13.2 ★★ rule 5 — every step below the departure is ZEROED, however correct', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'still the question', marksAwarded: 1 }),
      STEP({ description: 'the departure', isDeparture: true, departureKind: 'different-problem', marksAwarded: 0.5 }),
      STEP({ description: 'arithmetically perfect, wrong equation', marksAwarded: 1 }),
      STEP({ description: 'also perfect, also wrong equation', marksAwarded: 1 }),
    ],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const s = h.body().annotatedSteps;
  assert.equal(s[0].marksAwarded, 1, 'before the departure: ECF applies normally (rule 3)');
  assert.equal(s[1].marksAwarded, 0.5, 'rule 4 — the departure step KEEPS what it independently earned');
  assert.equal(s[2].marksAwarded, 0, 'rule 5 — work below a different-problem departure earns nothing (ruling 3)');
  assert.equal(s[3].marksAwarded, 0, 'rule 5 applies to EVERY step below, not just the next one');
});

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
      STEP(), STEP({ isDeparture: true, departureKind: 'different-problem' }), STEP(), STEP({ isDeparture: true, departureKind: 'different-problem' }),
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

test('§13.4b ★★★ the removal holds at the OTHER scheme site — worksheet question with no scheme', async () => {
  const h = buildImageRoute({ replies: [WS_REPLY({
    annotatedSteps: [STEP(), STEP(), STEP(), STEP()],
    finalAnswerCorrect: true,
  })] });
  await h.route.handleGradeWorksheet(ECF_WS({ solutionSteps: [] }), {});
  assert.equal(r1(h).marksAwarded, 4,
    'the removal is a property of the DOCTRINE, not of one handler — as the cap was');
  assert.notEqual(r1(h).marksAwarded, 2);
});

test('§13.4c ★★★ what REPLACES the cap: the prompt tells the grader to DERIVE the value points, STATE them, and derive them from the QUESTION — on BOTH paths', async () => {
  // The cap is gone; the fabrication risk it was reaching for is answered by an
  // instruction instead. Deriving the scheme from the STUDENT'S ANSWER would make
  // every answer self-justifying, so the prompt must forbid exactly that.
  const single = buildRoute({ replies: [{ annotatedSteps: [STEP()] }] });
  await single.route.handleCheckSolution(ECF_REQ({ solutionSteps: [] }), {});
  const batch = buildImageRoute({ replies: [WS_REPLY({ annotatedSteps: [STEP()] })] });
  await batch.route.handleGradeWorksheet(ECF_WS({ solutionSteps: [] }), {});

  for (const [name, text] of [['single-question', textOf(single)], ['worksheet', textOf(batch)]]) {
    assert.ok(/NO MARKING SCHEME SUPPLIED — DERIVE ONE, AND STATE IT/.test(text),
      'the derive-and-state instruction must reach the ' + name + ' prompt');
    assert.ok(/do NOT withhold marks for its absence and do NOT cap the question/.test(text),
      'the ' + name + ' prompt must say the absence of a scheme costs the student nothing');
    assert.ok(/MUST sum to the question's stated mark value/.test(text),
      'the derived scheme must be required to sum to the question marks (' + name + ')');
    assert.ok(/NEVER FROM THE STUDENT'S ANSWER/.test(text),
      'the fabrication risk must be named in the ' + name + ' prompt');
    assert.ok(/self-justifying/.test(text),
      'and named in those terms — deriving from the answer makes every answer correct (' + name + ')');
    // SPEC C7: the derived value points now travel in the "rubric" field, not inside teacherNote
    // (a legacy client still sees them, prefixed "Marked against:", by the server).
    assert.ok(/Return them in "rubric" as a list of \{ "point", "marks" \} — NOT inside "teacherNote"/.test(text),
      'the student must be able to see what they were marked against (' + name + ')');
  }
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

test('§13.8 ★★★ a departure is charged ONCE, under `departure`, NEVER under `silly`', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP(),
      STEP({ isDeparture: true, departureKind: 'different-problem', mistakeType: 'conceptual', marksAwarded: 0.5 }),
      STEP({ status: 'incorrect', marksAwarded: 1, mistakeType: 'silly' }),
      STEP({ status: 'incorrect', marksAwarded: 1, mistakeType: 'silly' }),
    ],
    // The model re-charges the one departure against every line below it — the
    // exact regression the owner saw (one departure recorded as three mistakes).
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 3, presentation: 0 },
    teacherNote: 'Well set out.',
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;
  assert.equal(m.departure, 1, 'ONE departure ⇒ exactly one charge');
  assert.equal(m.silly, 0,
    '`silly` is what drives "the method is there; show every step" — they DID show every step');
  // SPEC C3: the departure sentence is said only for its kind (one line per kind).
  assert.ok(h.body().teacherNote.includes('From this step on your working answers a different question from the one set'),
    'the departure carries its own coaching line, not the careless-slip copy');
});

test('§13.8b ★ the departure line is APPENDED to the model note, never replaces it', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [STEP(), STEP({ isDeparture: true, departureKind: 'different-problem' }), STEP(), STEP()],
    teacherNote: 'Well set out.',
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.ok(h.body().teacherNote.startsWith('Well set out.'), 'the model’s own note survives');
  assert.ok(h.body().teacherNote.includes('check each line against the question as you go'));
});

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

test('§13.10 ★★★ the departure shape: partial · departure · zeroed below ⇒ 50%, ONE mistake', async () => {
  // ⚠ SYNTHESISED. This reproduces the SHAPE of the owner's Q7 photograph; it is
  // not that session, which lives in Firestore and not in this repo.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'partial credit, still the question', status: 'partial', marksAwarded: 0.5 }),
      STEP({ description: 'the departure', isDeparture: true, departureKind: 'different-problem', marksAwarded: 0.5, mistakeType: 'conceptual' }),
      STEP({ description: 'zeroed', marksAwarded: 1, mistakeType: 'calculation' }),
      STEP({ description: 'arithmetically CORRECT, still zeroed', marksAwarded: 1 }),
    ],
    mistakeSummary: { conceptual: 1, calculation: 1, silly: 1, presentation: 0 },
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ({ marks: 2 }), {});
  assert.equal(h.body().totalMarks, 2);
  assert.equal(h.body().marksAwarded, 1, '0.5 + 0.5 survives; everything below the departure is zero');
  assert.equal(h.body().percentage, 50);
  const m = h.body().mistakeSummary;
  // ⚠ UPDATED BY DEPARTURE-COUNT-AND-RETURN. This assertion previously summed the four
  // type counts TOGETHER WITH `departure` and demanded 1 — which only held because the
  // four counts were ALL ZERO. It was therefore pinning the defect: the departure step
  // is `conceptual` here and the student was shown four zeros. The rule it was reaching
  // for — ONE departure is not three mistakes — is now stated on the two ledgers
  // separately, which is the only way to state it without the zeros hiding inside it.
  assert.equal(m.conceptual, 1, 'the departure step is counted, under ITS OWN type');
  assert.equal(m.calculation + m.silly + m.presentation, 0,
    'and the two steps BELOW it are still uncounted — rule 6, one departure is not three mistakes');
  assert.equal(m.departure, 1, 'charged ONCE — the internal marker, never a rendered bucket');
});

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

test('§14.1 ★★★ a PROPAGATED step (mistakeType null, below the departure) has its deduction normalised to 0', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ marksAwarded: 0.5 }),
      STEP({ description: 'answers a different problem', isDeparture: true, departureKind: 'different-problem', status: 'incorrect',
        marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'calculation' }),
      STEP({ description: 'propagated', status: 'incorrect',
        marksAwarded: 0, marksDeducted: 1, mistakeType: null }),
    ],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(POLY_REQ(), {});
  const steps = h.body().annotatedSteps;
  assert.equal(steps[2].marksDeducted, 0,
    'a step the policy says is NOT a separate mistake cannot carry a separate charge');
  assert.equal(steps[2].mistakeType, null,
    '⚠ and NO type is invented to justify the zero — the null is the honest answer');
});

test('§14.2 ★★ the DEPARTURE step keeps BOTH its mistakeType and its deduction', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ marksAwarded: 0.5 }),
      STEP({ description: 'answers a different problem', isDeparture: true, departureKind: 'different-problem', status: 'incorrect',
        marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'calculation' }),
      STEP({ description: 'propagated', status: 'incorrect',
        marksAwarded: 0, marksDeducted: 1, mistakeType: null }),
    ],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(POLY_REQ(), {});
  const dep = h.body().annotatedSteps[1];
  assert.equal(dep.marksDeducted, 0.5, 'the ONE thing being penalised keeps its charge');
  assert.equal(dep.mistakeType, 'calculation', 'and keeps its classification — rule 9');
  assert.equal(h.body().mistakeSummary.departure, 1, 'penalised ONCE — CBSE 11');
});

test('§14.3 ★★ a GENUINE separate mistake ABOVE the departure keeps its deduction', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'a real, independent slip', status: 'incorrect',
        marksAwarded: 0, marksDeducted: 0.5, mistakeType: 'calculation' }),
      STEP({ description: 'departs here', isDeparture: true, departureKind: 'different-problem', status: 'incorrect',
        marksAwarded: 0, marksDeducted: 0.5, mistakeType: 'conceptual' }),
      STEP({ description: 'propagated', status: 'incorrect',
        marksAwarded: 0, marksDeducted: 0.5, mistakeType: null }),
    ],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(POLY_REQ(), {});
  const steps = h.body().annotatedSteps;
  assert.equal(steps[0].marksDeducted, 0.5,
    '★ THE STUDENT\'S OWN, INDEPENDENT MISTAKE IS STILL CHARGED — this change narrows nothing above the departure');
  assert.equal(steps[1].marksDeducted, 0.5, 'the departure itself is untouched');
  assert.equal(steps[2].marksDeducted, 0, 'only what is BELOW the departure is cleared');
  assert.equal(h.body().mistakeSummary.calculation, 1,
    'and the independent mistake is still COUNTED — the count boundary is unchanged');
});

test('§14.4 ★★★ REGRESSION — the owner\'s paper `ci:CI-M-POLY-01`: the departure carries the ONLY deduction', async () => {
  // The live Firestore document, reproduced step for step: 3 marks, departure at
  // step 3, steps 4-7 propagated with mistakeType null and 0 / 1 / 0.5 / 0.5 deducted.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'step 1', marksAwarded: 0.5 }),
      STEP({ description: 'step 2', marksAwarded: 0.5 }),
      // RULINGS 3/7: a wrong grouping is performed wrongly (calculation) with ECF — NOT a departure.
      STEP({ description: 'step 3 — wrong grouping', isDeparture: false, status: 'incorrect',
        marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'calculation' }),
      STEP({ description: 'step 4', status: 'incorrect', marksAwarded: 0, marksDeducted: 0, mistakeType: null }),
      STEP({ description: 'step 5', status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: null }),
      STEP({ description: 'step 6', status: 'incorrect', marksAwarded: 0, marksDeducted: 0.5, mistakeType: null }),
      STEP({ description: 'step 7', status: 'incorrect', marksAwarded: 0, marksDeducted: 0.5, mistakeType: null }),
    ],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(POLY_REQ(), {});
  const steps = h.body().annotatedSteps;

  // ★ BEFORE this change these four summed to 2. That was the contradiction.
  const propagatedTotal = steps.slice(3).reduce((n, s) => n + s.marksDeducted, 0);
  assert.equal(propagatedTotal, 0, 'steps 4-7 deduct NOTHING between them');
  for (const i of [3, 4, 5, 6]) {
    assert.equal(steps[i].marksDeducted, 0, 'step ' + (i + 1) + ' deducts 0');
    assert.equal(steps[i].mistakeType, null, 'step ' + (i + 1) + ' stays honestly unclassified');
  }
  assert.equal(steps[2].marksDeducted, 0.5, 'the original slip carries the only deduction');

  const sum = h.body().mistakeSummary;
  // RULINGS 3/7: no departure any more; CBSE 11 now holds through ECF — the slip is penalised once.
  assert.equal(sum.departure, 0, 'departure 0 — a wrong grouping is a calculation slip with ECF (rulings 3/7)');
  // ⚠⚠ CORRECTED BY DEPARTURE-COUNT-AND-RETURN, AND THIS IS THE CORRECTION THAT MATTERS
  // MOST IN THE FILE. This block previously asserted `sum.calculation === 0` under the
  // comment "the four type counts stay 0 — THE ZEROS WERE ALWAYS HONEST". They were not.
  // This fixture IS the owner's paper, its departure step at index 2 carries
  // `mistakeType: 'calculation'`, and the graded sheet showed that type to the student —
  // while the scorecard showed CONCEPTUAL 0 · CALCULATION 0 · SILLY 0 · PRESENTATION 0.
  // A test asserted the defect as doctrine, with a confident sentence beside it.
  assert.equal(sum.calculation, 1,
    'the departure step IS counted, under the type its own sheet already showed the student');
  assert.equal(sum.conceptual, 0);
  assert.equal(sum.silly, 0);
  assert.equal(sum.presentation, 0);
  assert.equal(sum.conceptual + sum.calculation + sum.silly + sum.presentation, 1,
    'and it is counted exactly ONCE — steps 4-7 below it contribute nothing (rule 6)');
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

test('§14.7 ★★★ single-question path: the rubric instruction precedes the student\'s work AND the grading rules', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: [STEP()] }] });
  await h.route.handleCheckSolution(POLY_REQ({ textAnswer: '4x^2 - 4x - 15 = (2x-5)(2x+3)' }), {});
  const text = textOf(h);

  const rubricAt = text.indexOf(RUBRIC_HEAD);
  const workAt = text.indexOf('The student\'s typed answer is:');
  const rulesAt = text.indexOf('GRADING RULES:');

  assert.ok(rubricAt >= 0, 'the rubric instruction must reach the single-question prompt');
  assert.ok(workAt >= 0, 'CONTROL — the student\'s work must actually be in this prompt');
  assert.ok(rulesAt >= 0, 'CONTROL — the grading rules must actually be in this prompt');
  assert.ok(rubricAt < workAt,
    '★★★ THE WHOLE OF CHANGE 2: the scheme is fixed BEFORE the work is presented, not after');
  assert.ok(rubricAt < rulesAt,
    'and before `gradingRules`, which is where it used to live — appended LAST');
  assert.equal(text.split(RUBRIC_HEAD).length - 1, 1,
    'emitted EXACTLY ONCE — clause (i) back-references it rather than restating it');
});

test('§14.8 ★★ the SAME question at the SAME marks builds the SAME rubric block whatever the student wrote', async () => {
  // Two runs, two different answers and two different segmentations. The rubric the
  // model is handed must be identical, and must precede the work in both.
  // SPEC C6: the question is fenced with a RANDOM per-request nonce, so the comparison pins one.
  const nonce = { depOverrides: { makeFenceNonce: () => 'fixednonce14x8' } };
  const a = buildRoute({ replies: [{ annotatedSteps: [STEP()] }], ...nonce });
  await a.route.handleCheckSolution(POLY_REQ({ textAnswer: 'one line only' }), {});
  const b = buildRoute({ replies: [{ annotatedSteps: [STEP(), STEP(), STEP()] }], ...nonce });
  await b.route.handleCheckSolution(POLY_REQ({ textAnswer: 'step 1\nstep 2\nstep 3\nstep 4' }), {});

  const sliceRubric = (t) => t.slice(t.indexOf(RUBRIC_HEAD), t.indexOf('The student\'s typed answer is:'));
  const ra = sliceRubric(textOf(a));
  const rb = sliceRubric(textOf(b));
  assert.ok(ra.length > 200, 'CONTROL — the slice actually captured the rubric block');
  assert.equal(ra, rb,
    '★ the marking scheme handed to the grader does not vary with how the student segmented their working');
  assert.ok(/MUST NOT vary with how the student segmented their working/i.test(ra),
    'and the instruction says so in as many words');
});

test('§14.9 ★★ worksheet path: the rubric instruction precedes the questions in BOTH assemblies', async () => {
  // (a) the single-image worksheet assembly
  const flat = buildImageRoute({ replies: [WS_OK([1])] });
  await flat.route.handleGradeWorksheet(WORKSHEET_REQ([Q(1)]), {});
  const flatText = textOf(flat);
  assert.ok(flatText.indexOf(RUBRIC_HEAD) >= 0, 'it must reach the worksheet prompt');
  assert.ok(flatText.indexOf(RUBRIC_HEAD) < flatText.indexOf('QUESTIONS AND MARKING SCHEMES:'),
    'before the question blocks');

  // (b) ★ THE INTERLEAVED assembly — each answer photo follows its OWN question, so
  //     the ONLY position before all of the student's work is the LEADING text part.
  const woven = buildImageRoute({ replies: [WS_OK([1, 2])] });
  await woven.route.handleGradeWorksheet(
    { ...WORKSHEET_REQ([Q(1), Q(2)]), uploads: [UP(1), UP(2)] }, {});
  const parts = partsOf(woven);
  const firstImageAt = parts.findIndex(isImage);
  const rubricPartAt = parts.findIndex((p) => typeof p.text === 'string' && p.text.includes(RUBRIC_HEAD));
  assert.ok(firstImageAt > 0, 'CONTROL — an answer photo really is interleaved into these parts');
  assert.equal(rubricPartAt, 0, 'the rubric is in the LEADING text part');
  assert.ok(rubricPartAt < firstImageAt,
    '★ so it is read before the first photograph of the student\'s work');
});

test('§14.10 ★★★ PROMPT/CODE PARITY — the no-deduction-below-the-departure rule is stated to the model too, on BOTH paths', async () => {
  // ⚠ THE SILENT-FAILURE MODE THIS GUARDS. A prompt is a SECOND IMPLEMENTATION of the
  // same rule. `applyEcfPolicyV2` now clears `marksDeducted` below the departure in
  // CODE; if the prompt never said so, the model would keep emitting deductions the
  // server silently erased, and the two would drift with nothing to notice. The rule
  // is single-sourced in ECF_POLICY_V2_PROMPT, which BOTH prompts carry — so this
  // asserts it ARRIVES at both, not merely that the constant contains it.
  const single = buildRoute({ replies: [{ annotatedSteps: [STEP()] }] });
  await single.route.handleCheckSolution(ECF_REQ({ solutionSteps: [] }), {});
  const batch = buildImageRoute({ replies: [WS_REPLY({ annotatedSteps: [STEP()] })] });
  await batch.route.handleGradeWorksheet(ECF_WS({ solutionSteps: [] }), {});

  for (const [name, text] of [['single-question', textOf(single)], ['worksheet', textOf(batch)]]) {
    assert.ok(/SET "marksDeducted": 0 ON EVERY STEP BELOW THE DEPARTURE/.test(text),
      'the ' + name + ' prompt must carry the same rule the code enforces');
    assert.ok(/penalized only once/.test(text),
      'and cite CBSE 11, which is the authority for it (' + name + ')');
  }
});

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
  STEP({ isDeparture: true, departureKind: 'different-problem', mistakeType: 'conceptual' }),
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

test('§15.1 ★★★ a departure marked by the model on the STRUCTURED path is FOUND — impossible before this lane', async () => {
  const h = buildRoute({ replies: [WS_REPLY({ annotatedSteps: DEP_STEPS(), ...DEP_EXTRAS })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});

  // `questionDepartureError` IS `policy.departureIndex >= 0` — the direct observable
  // of findDepartureIndex having located the step. Pre-change this was false here.
  assert.equal(r1(h).questionDepartureError, true,
    'the structured normaliser must carry isDeparture through so findDepartureIndex can see it');
  assert.equal(r1(h).annotatedSteps[1].isDeparture, true,
    'and the flag must survive onto the normalised step the client persists');
  // The departure cap (rule 8 with a departure) is what MOVES the mark: 4 -> 2.
  assert.equal(r1(h).marksAwarded, 2,
    'the 50% departure cap now fires on this path — pre-change this graded 3.5/4');
});

// ── 2 · rule 5 on the structured path — everything below the departure is zeroed ──

test('§15.2 ★★ every step BELOW the departure is zeroed on the STRUCTURED path, award AND deduction', async () => {
  const h = buildRoute({ replies: [WS_REPLY({ annotatedSteps: DEP_STEPS(), ...DEP_EXTRAS })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});
  const s = r1(h).annotatedSteps;

  assert.equal(s[0].marksAwarded, 1, 'above the departure: graded normally (rule 3)');
  assert.equal(s[1].marksAwarded, 1, 'rule 4 — the departure step KEEPS what it independently earned');
  assert.deepEqual(s.map((x) => x.marksAwarded), [1, 1, 0, 0],
    'rule 5 — work below a different-problem departure earns nothing (ruling 3)');
  assert.deepEqual(s.map((x) => x.marksDeducted), [0, 0, 0, 0],
    'a step below the departure is not a separate mistake, so it carries no separate charge');
});

// ── 3 · the departure is counted ONCE in the structured path's summary ──

test('§15.3 ★★ the departure is counted ONCE in the STRUCTURED path summary, and not as `silly`', async () => {
  const h = buildRoute({ replies: [WS_REPLY({ annotatedSteps: DEP_STEPS(), ...DEP_EXTRAS })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});
  const m = r1(h).mistakeSummary;

  assert.equal(m.departure, 1, 'ONE departure ⇒ exactly one charge');
  // ★★ `silly` STAYS 0 HERE, AND FOR THE RIGHT REASON — which is the whole owner ruling.
  // The departure step in DEP_STEPS carries `conceptual`, so it is counted as
  // `conceptual`. It is NOT force-filed into `silly`, and step 3 below it — which the
  // model DID mark `silly` — is still uncounted. ⚠ Before this change `silly` was also 0,
  // but for the WRONG reason: nothing was counted at all. This assertion could not tell
  // those two states apart, which is why the one below it is now split in two.
  assert.equal(m.silly, 0, 'never force-filed into the careless bucket — that copy is the wrong lesson');
  assert.equal(m.conceptual, 1, 'counted under the type the departure step actually carries');
  assert.equal(m.conceptual + m.calculation + m.silly + m.presentation, 1,
    'EXACTLY ONE counted mistake — the model self-reported three and the two BELOW the departure are DISCARDED');
  // SPEC C3: one departure sentence per kind.
  assert.match(r1(h).teacherNote, /From this step on your working answers a different question from the one set/,
    'the departure carries its own voice, appended to the model note');
});

// ── 4 · THE REGRESSION GUARD THAT MATTERS MOST — no departure ⇒ nothing moved ──
//
// ⚠ Every value below was MEASURED against the pre-change tree, not asserted from
// intent: the same fixture through the same route with the carry-through removed
// produced exactly these numbers. The one and only difference the change makes on
// this fixture is the additive `isDeparture: false` field.

test('§15.4 ★★★ REGRESSION — a STRUCTURED response with NO departure is graded exactly as before', async () => {
  const h = buildRoute({ replies: [WS_REPLY({ annotatedSteps: NO_DEP_STEPS(), ...DEP_EXTRAS })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});
  const g = r1(h);

  assert.equal(g.marksAwarded, 3.5, 'rule 8 without a departure still only withholds FULL marks');
  assert.equal(g.percentage, 88);
  // ★ THE GUARD'S POINT, UNCHANGED: no departure ⇒ nothing is zeroed; rule 8 only withholds FULL marks.
  assert.ok(g.annotatedSteps.every((s) => s.marksAwarded > 0), 'nothing is zeroed');
  // CHANGED, AND WHY (not a ruling-free drift): the shown steps now sum to the mark (audit GA-25, closed by
  // this lane) — the withheld half comes off the last step — and the deductions sum to the loss.
  assert.deepEqual(g.annotatedSteps.map((s) => s.marksAwarded), [1, 1, 1, 0.5], 'the steps shown sum to the mark (GA-25)');
  assert.equal(g.annotatedSteps.reduce((n, s) => n + s.marksDeducted, 0), 0.5, 'the deductions explain exactly the half mark lost');
  // RULING 7 (+ audit GA-15): a step the model marked correct with full marks and no deduction carries no
  // mistake type, so its "conceptual" is not counted; the two typed deductions are.
  assert.deepEqual(g.mistakeSummary, { conceptual: 0, calculation: 1, silly: 1, presentation: 0, departure: 0 },
    'only steps that lost marks are counted');
  assert.equal(g.teacherNote, 'Model note.', 'no departure line is appended');
  assert.equal(g.questionDepartureError, false);
  // The ONE intended difference, stated so it can never be mistaken for a regression.
  assert.deepEqual(g.annotatedSteps.map((s) => s.isDeparture), [false, false, false, false],
    'the field is present and a REAL boolean — Firestore rejects undefined, and the single-question path has always emitted it');
});

// ── 5 · SECOND REGRESSION GUARD — the single-question path is untouched ──

test('§15.5 ★★★ REGRESSION — the SINGLE-QUESTION path is byte-identical, with and without a departure', async () => {
  // With a departure: this path always worked, and must still produce the same grade.
  const dep = buildRoute({ replies: [{ annotatedSteps: DEP_STEPS(), ...DEP_EXTRAS }] });
  await dep.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(dep.body().marksAwarded, 2);
  assert.deepEqual(dep.body().annotatedSteps.map((s) => s.marksAwarded), [1, 1, 0, 0]);
  assert.equal(dep.body().mistakeSummary.departure, 1);
  assert.equal(dep.body().questionDepartureError, true);

  // Without one: the ordinary grade, unmoved.
  const plain = buildRoute({ replies: [{ annotatedSteps: NO_DEP_STEPS(), ...DEP_EXTRAS }] });
  await plain.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(plain.body().marksAwarded, 3.5);
  // GA-25 + RULING 7, exactly as §15.4 (the structured twin): nothing zeroed; steps sum to the mark.
  assert.deepEqual(plain.body().annotatedSteps.map((s) => s.marksAwarded), [1, 1, 1, 0.5]);
  assert.deepEqual(plain.body().mistakeSummary,
    { conceptual: 0, calculation: 1, silly: 1, presentation: 0, departure: 0 });
  assert.equal(plain.body().questionDepartureError, false);
});

// ── 6 · more than one marker → the EXISTING ambiguity rule, not a new one ──

test('§15.6 ★★ TWO departure markers on the STRUCTURED path fails OPEN — the existing rule, unchanged', async () => {
  // findDepartureIndex returns -1 for ZERO and for MORE-THAN-ONE alike: an ambiguous
  // signal is not evidence, and the fail-safe direction is to grade normally rather
  // than to zero a student's work. This lane reports that rule; it does not add one.
  const h = buildRoute({ replies: [WS_REPLY({
    annotatedSteps: [STEP(), STEP({ isDeparture: true, departureKind: 'different-problem' }), STEP(), STEP({ isDeparture: true, departureKind: 'different-problem' })],
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

test('§15.7 ★★★ THE ARC\'S ACCEPTANCE TEST IN CODE — the SAME departure reply now grades IDENTICALLY on both paths', async () => {
  // ★★ This is the assertion the whole grader arc was built toward and the one that
  // could not be written before: a paper that departs the question earns the same
  // mark whether a student uploads it to Check & Improve (single-question) or to a
  // Worksheet / Chapter Test / Full Mock / Quick Practice batch (structured).
  // ⚠ It is deliberately a COMPARISON, not two copies of a hardcoded number: if a
  // future change moves one path, this goes red even if the new value looks right.
  const single = buildRoute({ replies: [{ annotatedSteps: DEP_STEPS(), ...DEP_EXTRAS }] });
  await single.route.handleCheckSolution(ECF_REQ(), {});
  const batch = buildRoute({ replies: [WS_REPLY({ annotatedSteps: DEP_STEPS(), ...DEP_EXTRAS })] });
  await batch.route.handleGradeWorksheet(ECF_WS(), {});

  const s = single.body();
  const b = r1(batch);

  assert.equal(b.marksAwarded, s.marksAwarded, 'the same work must earn the same mark on both paths');
  assert.equal(b.totalMarks, s.totalMarks);
  assert.deepEqual(b.mistakeSummary, s.mistakeSummary, 'and be counted as the same ONE mistake');
  assert.equal(b.questionDepartureError, s.questionDepartureError);
  assert.deepEqual(
    b.annotatedSteps.map((x) => [x.marksAwarded, x.marksDeducted, x.isDeparture]),
    s.annotatedSteps.map((x) => [x.marksAwarded, x.marksDeducted, x.isDeparture]),
    'step for step, award and deduction and departure marker alike');
  assert.equal(b.teacherNote, s.teacherNote, 'and be told the same thing about why');

  // CONTROL — the fixture really does depart, so the equality above is not two
  // no-ops agreeing. A non-departure fixture must NOT produce this grade.
  assert.equal(s.questionDepartureError, true, 'CONTROL: the shared fixture genuinely declares a departure');
  assert.notEqual(s.marksAwarded, s.totalMarks, 'CONTROL: and the departure actually cost marks');
});

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
  STEP({ isDeparture: true, departureKind: 'different-problem', mistakeType: 'conceptual', marksDeducted: 0.5 }),
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

test('§16.0 ★★ CONTROL — both prompts assemble, and a phrase that is NOT in them is NOT found', async () => {
  const a = await U_A();
  const b = await U_B();
  assert.ok(a.length > 2000, 'the single-question prompt did not assemble');
  assert.ok(b.length > 2000, 'the structured prompt did not assemble');
  // A negative control: the matcher really can say no.
  const absent = 'THIS SENTENCE IS NOT IN EITHER GRADING PROMPT';
  assert.ok(!a.includes(absent) && !b.includes(absent),
    'the includes() probe reports true for text that is absent — every §16 assertion is worthless');
  // And the OLD tell-tale that keyed on the question stem is GONE as the sole test.
  // RULINGS 2/3: the "adopted a wrong value = departure" test is replaced by the two departure kinds.
  await bothPathsSay('DEPARTURE — ONLY TWO KINDS ZERO LATER WORK',
    'the owner\'s departure test');
});

// ── §16.1–§16.10 · THE TEN MATHS SCENARIOS ────────────────────────────────────


test('§16.2 ★★ SCENARIO 2 — a slip the student CORRECTS is NOT a departure; the marks are kept', async () => {
  await bothPathsSay('2. A slip the student then CORRECTS', 'scenario 2, the recovered slip');
  await bothPathsSay('The marks are KEPT; deduct only for the slip itself',
    'that a recovered slip keeps its marks');
  // RULING 4: a slip that is struck through and replaced is withdrawn work — not assessed, no deduction.
  await bothPathsSay('where the slip is struck through and replaced, it is withdrawn work and is not assessed at all',
    'that a struck-through slip is not deducted at all');

  const s = await U_SINGLE(U_SC2_STEPS(), true);
  const b = await U_BATCH(U_SC2_STEPS(), true);
  for (const grade of [s, b]) {
    assert.equal(grade.questionDepartureError, false, 'a recovered slip is NOT a departure');
    assert.equal(grade.marksAwarded, 3.5, 'the slip costs its half mark and nothing else is zeroed or capped');
  }
  assert.equal(b.marksAwarded, s.marksAwarded, 'and both surfaces agree');
});



test('§16.5 ★ SCENARIO 5 — an IMMATERIAL miscopy earns FULL MARKS', async () => {
  await bothPathsSay('5. A miscopy that is IMMATERIAL', 'scenario 5');
  await bothPathsSay('NO value point ' , 'the value-point test that makes a miscopy immaterial');
  await bothPathsSay('Not every misreading is a departure',
    'the explicit guard against over-firing the departure test');
});

test('§16.6 ★★ SCENARIO 6 — an INDEPENDENT sub-part is marked on its own merits; a DEPENDENT one carries the error', async () => {
  await bothPathsSay('6. A departure in ONE SUB-PART', 'scenario 6');
  await bothPathsSay('is a question in its own right and is marked ON ITS OWN MERITS',
    'that an independent sub-part survives a departure elsewhere');
  // RULING 3 (per PART) + ECF: a departure never crosses a part; a later part that uses an earlier value
  // carries it forward with ECF (the old "a dependent part is deducted" / "relatedness decides" is replaced).
  await bothPathsSay('A departure NEVER reaches into another part', 'that a departure stops at its own part');
  await bothPathsSay('carries that value forward (ECF) and is marked on its own method',
    'that a dependent later part earns ECF');
  const a6 = await U_A();
  assert.ok(!a6.includes('CONSUMES a value from the departed part'), 'the retired dependent-part deduction is gone');
});

test('§16.7 SCENARIO 7 — two separate slips, neither carried forward, are TWO ORDINARY MISTAKES and no departure', async () => {
  await bothPathsSay('7. TWO SEPARATE SLIPS', 'scenario 7');
  await bothPathsSay('Nothing was adopted, so nothing was left behind',
    'WHY two uncarried slips are not a departure');
});

test('§16.8 ★★ SCENARIO 8 — the right answer by an INVALID method, and it FAILS SAFE', async () => {
  await bothPathsSay('8. The RIGHT ANSWER reached by an INVALID method', 'scenario 8');
  // RULING 3 + controller decision D26: an invalid method scores 0 for the part, the answer mark included,
  // unless the item's own CBSE scheme awards the answer mark independently.
  await bothPathsSay('it scores 0 for that part, the answer mark included', 'the invalid-method ruling');
  const a8 = await U_A();
  assert.ok(!a8.includes('award the ANSWER mark ONLY'), 'the retired answer-mark-only ruling is gone');
  // ★ The fail-safe is the half that protects students, and it is the half most
  // likely to be dropped by a future edit.
  await bothPathsSay('if you cannot DEMONSTRATE that the method is invalid',
    'the FAIL-SAFE on scenario 8');
  await bothPathsSay('show that it fails IN GENERAL, not merely that it is not the scheme',
    'the standard of proof for calling a method invalid');
  await bothPathsSay('treat it as a VALID ALTERNATIVE and award IN FULL',
    'what to do when invalidity cannot be demonstrated');
});

test('§16.9 SCENARIO 9 — an answer with NO working is UNDIAGNOSABLE and never a departure', async () => {
  await bothPathsSay('9. AN ANSWER ONLY, with no working', 'scenario 9');
  await bothPathsSay('Never fabricate a type, and never call a bare wrong answer a departure',
    'the anti-fabrication half of scenario 9');
});

test('§16.10 ★★★ SCENARIO 10 — a student who RETURNS to the real question ends the departure there', async () => {
  // ⚠⚠ THIS COMMENT WAS CORRECTED BY DEPARTURE-COUNT-AND-RETURN, AND THE CORRECTION IS
  // THE POINT OF THAT LANE. It previously read: "This is the scenario the machinery
  // CANNOT express: `applyEcfPolicyV2` zeroes everything below a departure index, full
  // stop." That was TRUE WHEN WRITTEN and is now FALSE — `applyEcfPolicyV2` stops
  // zeroing at a step marked `isReturn`, and §19.4 exercises it end to end.
  // ★ The workaround the sentence describes — "so the model must decide not to set the
  // flag at all" — SURVIVES DELIBERATELY as the safe fallback, and case 10 still tells
  // the model to use it where the excursion left nothing behind. What changed is that a
  // marked departure is no longer a one-way door.
  // ★ This test remains a PROMPT test and still earns its place: the machinery can only
  // act on a marker the model actually emits, so the instruction is still the thing
  // most likely to be lost by a future edit.
  await bothPathsSay('10. A departure after which the student RETURNS TO THE REAL QUESTION', 'scenario 10');
  await bothPathsSay('THE DEPARTURE ENDS THERE', 'that returning ends the departure');
  await bothPathsSay('Later correct work on the question as set EARNS ITS MARKS',
    'that work after a return is paid');
  await bothPathsSay('do not mark a departure at all', 'what the model must do when the student returns');
});

// ── §16.S1–§16.S6 · THE SIX SCIENCE SCENARIOS ─────────────────────────────────

test('§16.S1 SCIENCE — answering a DIFFERENT question is a departure at the first line', async () => {
  await bothPathsSay('S1. Answering a DIFFERENT QUESTION', 'Science scenario S1');
  await bothPathsSay('The whole answer is a different question', 'the S1 ruling');
});

test('§16.S2 ★★ SCIENCE — the wrong ORGAN/LAW/PRINCIPLE named then described correctly is a DEPARTURE', async () => {
  await bothPathsSay('S2. Naming the WRONG ORGAN, LAW or PRINCIPLE', 'Science scenario S2');
  // RULING 2: the Maths wrong value is now a slip with ECF, so S2 is no longer "the same rule" as it, and
  // the old subject-neutral adoption test goes with it. S2 stays a different-problem departure.
  await bothPathsSay('the answer describes a different organ, law or process from the one asked',
    'that S2 is a different-problem departure');
  const aS2 = await U_A();
  assert.ok(!aS2.includes('Identical in shape to the Maths wrong-value case'), 'the retired Maths analogy is gone');
});


test('§16.S4 ★★★ SCIENCE — UNBALANCED is NOT presentation: three faults, three buckets, decided by WHAT FIXES IT', async () => {
  // ⚠⚠ THIS CORRECTS A DEFECT THAT PREDATES THIS LANE. The taxonomy clause lumped
  // "a correct reaction left UNBALANCED, missing state symbols" into PRESENTATION as a
  // single item. Those are TWO different defects with two different remedies and two
  // different mark costs, and only ONE of them is presentation.
  // ★ THE TEST IS THE REMEDY: ask what the student must LEARN to stop getting it wrong.
  //   unbalanced when balancing was ASKED FOR -> learn conservation of mass  -> conceptual
  //   wrong coefficients while balancing      -> recount the atoms           -> calculation
  //   balanced, state symbols missing         -> learn the board format      -> presentation
  // ⚠ MARK-SIZE CROSS-CHECK: CBSE typically pays 1 mark for species and 1 for balancing,
  // so mis-bucketing unbalanced-as-presentation costs HALF the question. Presentation
  // deductions are never that size.
  await bothPathsSay('S4. A CORRECT reaction left UNBALANCED', 'Science scenario S4');
  await bothPathsSay('NOT A DEPARTURE', 'that an unbalanced equation does not change the question');

  // (a) UNBALANCED when a balanced equation was asked for => CONCEPTUAL
  await bothPathsSay('S4a. UNBALANCED when the question ASKED for a balanced equation',
    'S4a, the conceptual case');
  await bothPathsSay('The fix is learning that equations ',
    'the REMEDY that makes S4a conceptual');

  // (b) wrong coefficients while genuinely balancing => CALCULATION
  await bothPathsSay('S4b. WRONG COEFFICIENTS while genuinely attempting to balance',
    'S4b, the calculation case');
  await bothPathsSay('The fix is to recount the atoms', 'the REMEDY that makes S4b calculation');

  // RULING 5: missing state symbols cost NOTHING — S4c ("missing state symbols ⇒ presentation") is gone.
  await bothPathsSay('MISSING STATE SYMBOLS cost NOTHING — never a deduction and never a fault',
    'that missing state symbols are never a fault');
  const aS4 = await U_A();
  assert.ok(!aS4.includes('S4c. BALANCED correctly but MISSING STATE SYMBOLS'), 'the retired S4c is gone');

  // ★★ THE GOVERNING LINE. Without it the three cases read as arbitrary and a future
  // edit re-merges them; with it, the boundary is derivable.
  await bothPathsSay('ANYTHING THAT CHANGES WHETHER THE CHEMISTRY OR MATHEMATICS IS RIGHT IS NOT PRESENTATION',
    'the rule that NARROWS presentation to format only');
  await bothPathsSay('MARK-SIZE SANITY CHECK', 'the mark-size cross-check for edge cases');

  // NEGATIVE CONTROL — the OLD, WRONG rule must be gone from BOTH prompts. This is the
  // assertion that would have caught the defect in the first place.
  const a = await U_A();
  const b = await U_B();
  for (const [name, t] of [['single-question', a], ['structured', b]]) {
    assert.ok(!t.includes('A correct but unbalanced equation is PRESENTATION'),
      name + ': the old unbalanced-is-presentation rule must NOT survive');
    assert.ok(!t.includes('a correct reaction left UNBALANCED, missing state symbols'),
      name + ': unbalanced and missing-state-symbols must NOT be one lumped item');
  }
});

test('§16.S3v4 ★★★ THE KEYSTROKE — S3 and S4 are distinguished IN WORDS, not merely implied', async () => {
  // ⚠ In a student's answer a wrong reactant and an unbalanced equation are one
  // keystroke apart and grade OPPOSITELY. A prompt that only implies the
  // distinction will not hold under a real paper, so the contrast is pinned as a
  // single explicit sentence rather than inferred from S3 and S4 sitting near
  // each other.
  await bothPathsSay('ONE KEYSTROKE APART', 'that S3 and S4 are one keystroke apart');
  // RULING 3: a wrong reactant is FORMED WRONGLY (conceptual), not a departure.
  await bothPathsSay('A WRONG REACTANT IS A CONCEPTUAL ERROR IN FORMING THE EQUATION, NOT A DEPARTURE',
    'the wrong-reactant half of the contrast');
  const aS34 = await U_A();
  assert.ok(!aS34.includes('A WRONG REACTANT CHANGES THE QUESTION AND IS A DEPARTURE'), 'the retired departure half is gone');
  await bothPathsSay('AN UNBALANCED EQUATION DOES NOT CHANGE THE QUESTION AND IS NOT A DEPARTURE',
    'the non-departure half of the contrast');
  // ⚠ The contrast is about DEPARTURE vs NOT-a-departure. It is NOT about the bucket:
  // an unbalanced equation is not a departure AND is not presentation (see §16.S4).
  // RULING 5: S4c is gone, so the contrast defers to S4a/S4b.
  await bothPathsSay('it is graded by S4a/S4b',
    'that the contrast defers the BUCKET to S4a/S4b rather than asserting presentation');
  await bothPathsSay('Check WHICH SPECIES are written before you check whether the coefficients balance',
    'the ORDER OF CHECKS that separates the two');
});


test('§16.S6 SCIENCE — a correct answer with the diagram absent or unlabelled is PRESENTATION', async () => {
  await bothPathsSay('S6. A CORRECT answer with a required DIAGRAM ABSENT', 'Science scenario S6');
});

// ── §16.D1–§16.D3 · THE THREE DIAGRAM SCENARIOS, AND THE FAIL-SAFE ────────────


test('§16.D2 ★★ DIAGRAM — an ABSENT required figure is PRESENTATION *and* the lost figure mark: TWO deductions', async () => {
  await bothPathsSay('D2. A required diagram ABSENT', 'diagram scenario D2');
  await bothPathsSay('That is TWO deductions, not one',
    'that D2 costs the presentation deduction AND the figure mark');
  await bothPathsSay('CBSE awards the figure as its own value point', 'why the figure mark is separate');
});


test('§16.D0 ★★★ THE DIAGRAM FAIL-SAFE — an unreadable figure must NEVER produce an invented departure', async () => {
  // ⚠⚠ The image reaches the model as native base64 with no OCR step, and nobody
  // has established that a HAND-DRAWN figure is read reliably. D1 and D3 both zero
  // a student's work on the strength of what the grader believes it saw. Without
  // this clause the failure mode is a confident departure invented from a smudge.
  // ★ "Absent means unknowable" is already the rule for departures generally
  // (clause (f)); this applies the same principle to FIGURES.
  await bothPathsSay('THE DIAGRAM FAIL-SAFE', 'that the fail-safe exists at all');
  await bothPathsSay('IF YOU CANNOT ESTABLISH WHAT THE DRAWING SHOWS, YOU MUST NOT INVENT A DEPARTURE FROM IT',
    'the fail-safe itself');
  // RULING 3: D1/D3 are no longer departures; the positive-evidence standard now governs any figure fault.
  await bothPathsSay('a figure fault is marked ONLY on POSITIVE evidence about what was actually drawn',
    'that a figure fault requires positive evidence');
  await bothPathsSay('GRADE THE WRITTEN WORK NORMALLY and never zero a step for a figure you could not read',
    'what to do instead when the figure is illegible');
});

// ── §16.11 / §16.12 · THE TWO REGRESSION GUARDS ───────────────────────────────

test('§16.11 ★★★ REGRESSION — a mid-solution slip that RECOVERS is NOT capped and NOT zeroed', async () => {
  // ⚠ This is the guard that matters more than any feature case above. The whole
  // lane pushes the grader toward zeroing more work; this pins the boundary that
  // must NOT move. A student who slips and recovers keeps their marks.
  const s = await U_SINGLE(U_SC2_STEPS(), true);
  const b = await U_BATCH(U_SC2_STEPS(), true);

  for (const [name, g] of [['single-question', s], ['structured', b]]) {
    assert.equal(g.questionDepartureError, false, name + ': a recovery is not a departure');
    assert.equal(g.marksAwarded, 3.5, name + ': 3.5 of 4 — nothing capped, nothing zeroed');
    assert.equal(g.annotatedSteps[2].marksAwarded, 1, name + ': the step AFTER the slip still earns');
    assert.equal(g.annotatedSteps[3].marksAwarded, 1, name + ': and so does the final step');
  }
  // CONTROL — the same fixture WITH a departure really does grade differently, so
  // the equalities above are not two no-ops agreeing.
  const departed = await U_SINGLE(U_SC1_STEPS(), false);
  assert.notEqual(departed.marksAwarded, s.marksAwarded,
    'CONTROL: a departed solution must NOT grade the same as a recovered one');
});

test('§16.12 ★★★ REGRESSION — a correct ALTERNATIVE method against a stored scheme earns FULL MARKS (CBSE 3)', async () => {
  // ★ The stored scheme for ECF_WS/ECF_REQ factorises. This student used the
  // quadratic formula. CBSE instruction 3 protects that, and a stored scheme must
  // never be the reason it loses a mark.
  await bothPathsSay('IT IS NEVER AUTHORITY ON METHOD', 'the scheme-corroboration ruling');
  await bothPathsSay('CORROBORATES THE MARK DISTRIBUTION', 'what the stored scheme IS for');
  await bothPathsSay('A stored scheme must NEVER be the reason a correct alternative method loses marks',
    'the method-freedom guarantee');
  await bothPathsSay('WHERE YOUR DERIVATION AND THE STORED SCHEME DISAGREE',
    'that a scheme/derivation divergence is decided by the derivation (SPEC C3 / golden T09: and never mentioned to the student)');
  await bothPathsSay('A STORED SCHEME MAY NEVER BE THE REASON A REQUIRED ELEMENT GOES UNCHECKED',
    'that a silent scheme does not excuse a required element');

  // ★★ THE AUTHORITY WORDING IS GONE from the single-question scheme block. It read
  // "OFFICIAL CBSE MARKING SCHEME (use this as your reference for grading)" and told
  // the model to grade "against these official steps" — that is authority on METHOD,
  // and it contradicted clause (j) in the same prompt.
  const a = await U_A();
  assert.ok(!a.includes('OFFICIAL CBSE MARKING SCHEME'),
    'the stored scheme must not be presented to the model as OFFICIAL');
  assert.ok(!a.includes('against these official steps'),
    'the model must not be told to grade step-by-step against the stored scheme as authority');
  assert.ok(a.includes('STORED MARKING SCHEME'), 'and it must still be supplied, as corroboration');
  const b = await U_B();
  assert.ok(b.includes('CORROBORATION only - never authority on method'),
    'the structured path labels its stored scheme the same way');

  // BEHAVIOURAL: an anchored question, every step correct by a different method,
  // final answer right ⇒ FULL marks on both paths, no cap, no departure.
  for (const [name, g] of [['single-question', await U_SINGLE(U_ALT_STEPS(), true)],
    ['structured', await U_BATCH(U_ALT_STEPS(), true)]]) {
    assert.equal(g.questionDepartureError, false, name + ': an alternative method is not a departure');
    assert.equal(g.marksAwarded, 4, name + ': a correct alternative method earns FULL marks');
    assert.equal(g.marksAwarded, g.totalMarks, name + ': full is full');
  }
});

test('§16.13 ★★ THE UNIFORMITY PROOF — every §2 ruling reaches BOTH grading paths, enumerated', async () => {
  // ⚠ "Both grading paths must receive every change" is the trap this arc has
  // already lost a round to. Rather than trust that `ECF_POLICY_V2_PROMPT` is
  // shared, this walks the whole ruling set and fails naming the one that drifted.
  const a = await U_A();
  const b = await U_B();
  const RULINGS = [
    // RULINGS 2/3: the adoption test, cases 1/3/4, S3, S5, D1, D3 are re-stated (no longer departures);
    // RULING 5: S4c is gone. Their entries are removed; the replacement doctrine is enumerated instead.
    'DEPARTURE — ONLY TWO KINDS ZERO LATER WORK',
    '2. A slip the student then CORRECTS',
    '5. A miscopy that is IMMATERIAL',
    '6. A departure in ONE SUB-PART',
    '7. TWO SEPARATE SLIPS',
    '8. The RIGHT ANSWER reached by an INVALID method',
    '9. AN ANSWER ONLY, with no working',
    '10. A departure after which the student RETURNS TO THE REAL QUESTION',
    'S1. Answering a DIFFERENT QUESTION',
    'S2. Naming the WRONG ORGAN, LAW or PRINCIPLE',
    'S4. A CORRECT reaction left UNBALANCED',
    'S4a. UNBALANCED when the question ASKED for a balanced equation',
    'S4b. WRONG COEFFICIENTS while genuinely attempting to balance',
    'ANYTHING THAT CHANGES WHETHER THE CHEMISTRY OR MATHEMATICS IS RIGHT IS NOT PRESENTATION',
    'UNITS. A CORRECT answer written WITHOUT ITS UNIT',
    'MULTI-PART QUESTIONS AND THE UNATTEMPTED SUB-PART',
    'ONE KEYSTROKE APART',
    'S6. A CORRECT answer with a required DIAGRAM ABSENT',
    'D2. A required diagram ABSENT',
    'IF YOU CANNOT ESTABLISH WHAT THE DRAWING SHOWS',
    'CORROBORATES THE MARK DISTRIBUTION',
    'IT IS NEVER AUTHORITY ON METHOD',
  ];
  const missingA = RULINGS.filter((r) => !a.includes(r));
  const missingB = RULINGS.filter((r) => !b.includes(r));
  assert.deepEqual(missingA, [], 'rulings absent from the SINGLE-QUESTION prompt');
  assert.deepEqual(missingB, [], 'rulings absent from the STRUCTURED prompt');
  // 32 → 22: eleven entries retired by rulings 2/3/5 (listed above), one replacement entry added.
  assert.equal(RULINGS.length, 22, 'the enumeration itself must not silently shrink');
});

// ── §16.14 / §16.15 · CORRECTION 2, cases 5 and 6 ────────────────────────────

test('§16.14 ★★ UNITS — a correct answer with no unit is PRESENTATION, never conceptual or calculation', async () => {
  // ★ The cleanest illustration of the narrowed boundary: a missing unit does NOT
  // change whether the mathematics is right, so it cannot leave the presentation
  // bucket. CLAUDE.md §13 already pins the size of it (half a mark).
  await bothPathsSay('UNITS. A CORRECT answer written WITHOUT ITS UNIT', 'the units case');
  await bothPathsSay('IT IS NEVER "conceptual" AND NEVER "calculation": THE STUDENT DID THE MATHEMATICS',
    'that a missing unit never leaves the presentation bucket');
  await bothPathsSay('A missing unit does not change whether the mathematics is right',
    'WHY it is presentation — the governing boundary, applied');

  // ★★ THIS CASE CLOSES A REAL PATH-B GAP, not just a wording gap. The
  // "PRESENTATION vs MISSING" rule that covered missing units existed ONLY in
  // handleCheckSolution's numbered rules; gradeStructuredSet never had it. Putting
  // the case in the SHARED constant is what gives the structured path the rule at all.
  const b = await U_B();
  // ⚠⚠ THIS CONTROL WAS INVERTED BY SUBJECT-RULES-PORT, DELIBERATELY AND WITH ITS
  //    REASON RECORDED. It previously asserted that the structured path had NO
  //    numbered PRESENTATION-vs-MISSING rule — which is to say it PINNED THE DEFECT
  //    this lane was opened to remove. A control that asserts the structure it is
  //    meant to detect will pass forever and block the fix. The units ruling still
  //    arrives via the shared ECF constant (asserted above, unchanged); what changed
  //    is that the numbered rule now reaches path B too, from ONE shared string.
  assert.ok(b.includes('PRESENTATION vs MISSING'),
    'the structured path must NOW carry the numbered PRESENTATION-vs-MISSING rule');
  // RULING 6: Maths deducts for a missing unit only where the question or its scheme pays it.
  await bothPathsSay('Maths — ONLY where the question asks for the unit or the scheme pays it; where the question is silent, NO deduction',
    'the Maths units ruling');
  assert.ok(b.includes('UNITS. A CORRECT answer written WITHOUT ITS UNIT'),
    'the shared constant still carries the units ruling to the structured path');
});

test('§16.15 ★★★ MULTI-PART — a SKIPPED sub-part is UNATTEMPTED: never typed, never counted, never a departure, never invisible', async () => {
  // ⚠ This is the owner's existing unattempted ruling applied to SUB-PARTS, and it
  // needs stating because a blank sub-part could otherwise read as a DEPARTURE or as
  // a missing step that earns a mistake type — and this lane just switched the
  // departure machinery on across four more surfaces.
  await bothPathsSay('MULTI-PART QUESTIONS AND THE UNATTEMPTED SUB-PART', 'the multi-part case');
  await bothPathsSay('never count it as a mistake', 'that it stays out of the mistake counts');
  await bothPathsSay('never treat it as a wrong answer that scored zero', 'that it is never scored 0');

  // ★★★ THE DEPARTURE INTERACTION — the reason this case is in THIS lane.
  await bothPathsSay('AND IT IS NOT A DEPARTURE', 'that a blank sub-part is not a departure');
  await bothPathsSay('they wrote NOTHING, so there is nothing to have been adopted',
    'WHY a blank sub-part cannot be a departure');
  await bothPathsSay('never zero the parts below it because of one',
    'that a blank sub-part must not zero the work below it');

  // ★★ UNCOUNTED IS NOT UNREPORTED. Two rulings meet here and the distinction is the
  // SURFACE: the skipped part must stay OUT of the mistake taxonomy and MI, but must
  // stay VISIBLE to the student. A prompt that only said "uncounted" would invite the
  // model to omit it entirely.
  await bothPathsSay('REPORT the skipped part as a step with status', 'that it must still be reported');
  await bothPathsSay('Uncounted is not the same as unreported', 'the distinction stated in terms');
  await bothPathsSay('THE PART THEY DID ANSWER IS MARKED ON ITS OWN MERITS',
    'that the answered part is marked on its merits');

  // ★ The blank-vs-written contrast, so "DK" is not swept into unattempted.
  // RULING 7 + owner key Q6: "Don't know" is unattempted too (the old blank-vs-written line is replaced).
  await bothPathsSay('A part answered only "Don\'t know" or "DK" is unattempted too', 'the non-attempt line');
  const a15 = await U_A();
  assert.ok(!a15.includes('Blank is unattempted; written is attempted'), 'the retired blank-vs-written line is gone');

  // BEHAVIOURAL: the representation the prompt asks for is one the CODE already
  // honours end-to-end — status "missing" + mistakeType null survives normalisation,
  // is REPORTED, and contributes NOTHING to the mistake summary, on BOTH paths.
  // ⚠ Nothing was invented: STEP_STATUS_VALUES has no "unattempted" member.
  const STEPS = () => [
    STEP(),
    STEP({ status: 'missing', studentWork: '', marksAwarded: 0, marksDeducted: 0, mistakeType: null }),
  ];
  for (const [name, g] of [['single-question', await U_SINGLE(STEPS(), true)],
    ['structured', await U_BATCH(STEPS(), true)]]) {
    const skipped = g.annotatedSteps[1];
    assert.equal(skipped.status, 'missing', name + ': the skipped part keeps status missing');
    assert.equal(skipped.mistakeType, null, name + ': and is NEVER given a mistake type');
    // SPEC C7 / unattempted is a fourth state: its marks are recorded as NOT EARNED (untyped, uncounted).
    assert.equal(skipped.marksDeducted, 3, name + ': its marks are recorded as not earned, untyped');
    assert.equal(skipped.isDeparture, false, name + ': and is NEVER a departure');
    assert.equal(g.questionDepartureError, false, name + ': a blank sub-part must not trip the departure path');
    assert.equal(g.annotatedSteps.length, 2, name + ': it is REPORTED, not dropped from the response');
    const m = g.mistakeSummary;
    assert.equal(m.conceptual + m.calculation + m.silly + m.presentation, 0,
      name + ': an unattempted part contributes NOTHING to the mistake summary (so nothing reaches MI)');
    assert.equal(g.annotatedSteps[0].marksAwarded, 1, name + ': the ANSWERED part keeps its marks');
  }
});

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

// RULING 1: every instruction now lives in the ONE core (server/grading/*.cjs, tests excluded).
const GRADER_SOURCE = require('node:fs').readdirSync(require('node:path').join(__dirname, '..', 'grading'))
  .filter((f) => f.endsWith('.cjs') && !f.endsWith('.test.cjs'))
  .map((f) => require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'grading', f), 'utf8'))
  .join('\n');

// The eleven ported instructions, by a distinctive fragment of each.
const PORTED = [
  ['is STILL EXPECTED even if this scheme is silent about it', 'a demanded element survives the scheme\'s silence'],
  ['Assess for each value point whether the student hit it', 'per-value-point assessment'],
  ['Where your derived rubric and this stored scheme DISAGREE', 'the derived-vs-stored rule'],
  ['Identify EVERY step', 'step enumeration'],
  ['PRESENTATION vs MISSING', 'the presentation-vs-missing rule'],
  ['"correctedWorking": for incorrect/partial steps ONLY', 'the correctedWorking instruction'],
  ['Attribute a type PER STEP; never blanket-label', 'per-step attribution'],
  ['This includes a verification/check step that only', 'the ECF verification clause'],
  ['Do NOT manufacture extra "missing" steps', 'the anti-fabrication clause'],
  ['WHAT THE ERROR REVEALS ABOUT THE STUDENT', 'systemPrompt cause-reasoning'],
];

test('§17.2 ★★★ THE LANE — a SCIENCE set on the STRUCTURED path is checked for balanced equations and state symbols', async () => {
  // ⚠ IMPOSSIBLE BEFORE THIS LANE, and the reason it exists: Worksheet, Chapter
  //   Test, Full Mock, Quick Practice and multi-question C&I graded Science with
  //   no subject rules at all.
  const b = await U_B_SCI();
  assert.ok(b.includes('balanced equations'), 'the structured prompt never asks for balanced equations');
  // RULING 5: state symbols are NOT required — the checklist says so instead of demanding them.
  assert.ok(b.includes('state symbols are not required'), 'the structured prompt must say state symbols are not required');
  assert.ok(b.includes('NCERT-standard language'), 'the structured prompt never asks for NCERT terminology');
  assert.ok(b.includes('diagrams labelled'), 'the structured prompt never asks for labelled diagrams');
});

test('§17.3 ★★ the scheme-assessment directives reach BOTH paths — the owner\'s 8b bug', async () => {
  // ★★★ THE DECISIVE ONE. Path B emitted the stored scheme and said "grade against
  //     ITS OWN scheme", then never said what comparing MEANT — so a scheme silent
  //     about balancing read as permission, and a wrong coefficient was marked
  //     Correct with the right equation rendered beside it on the same screen.
  await bothPathsSay('is STILL EXPECTED even if this scheme is silent about it',
    'that a demanded element survives the scheme\'s silence');
  await bothPathsSay('Assess for each value point whether the student hit it',
    'that each value point is assessed individually');
  await bothPathsSay('Where your derived rubric and this stored scheme DISAGREE',
    'what to do when the derived rubric and the stored scheme disagree');
  // ★ TWO independent clauses name a balanced equation, and neither reached path B.
  const b = await U_B();
  assert.ok(b.includes('a balanced equation'), 'the structured path must name a balanced equation as a demanded element');
});

test('§17.4 the subject checklist reaches BOTH paths, for BOTH subjects', async () => {
  // MATHS — U_A / U_B are Maths fixtures.
  await bothPathsSay('formula, substitution, calculation, proper notation', 'the Maths subject checklist');
  // SCIENCE — the same instruction, the same shared atoms, a Science submission.
  const aSci = await U_A_SCI();
  const bSci = await U_B_SCI();
  // RULING 5: 'state symbols (s/l/g/aq)' (a demand) → 'state symbols are not required'.
  for (const needle of ['terminology, balanced equations', 'state symbols are not required', 'NCERT-standard language', 'diagrams labelled']) {
    assert.ok(aSci.includes(needle), 'SINGLE-QUESTION Science prompt lost: ' + needle);
    assert.ok(bSci.includes(needle), 'STRUCTURED Science prompt never states: ' + needle);
  }
  // ★ THE CONTROL — the checklist is CONDITIONAL, not unconditional. A Maths
  //   submission must NOT be told to check state symbols, on either path.
  const a = await U_A();
  const b = await U_B();
  assert.ok(!a.includes('NCERT-standard language'), 'CONTROL: a MATHS single-question prompt must not carry the Science checks');
  assert.ok(!b.includes('NCERT-standard language'), 'CONTROL: a MATHS structured prompt must not carry the Science checks');
});


test('§17.6 ★★★ ONE LITERAL, TWO CONSUMERS — no ported instruction exists in more than one copy', async () => {
  /* ★ RESCOPED, and the reason is worth stating. As first written this case read
     'no instruction exists in more than one literal copy', and it was FALSE ON
     TRUNK BEFORE ANY EDIT — it would have gone red on arrival. The owner rescoped
     it to: no instruction exists in more than one literal copy, EXCEPT where the
     copies differ only in rule numbering, and this lane single-sources those.
     ★★ THE PAIRS WERE NOT BYTE-IDENTICAL. They differed in exactly one field — the
     rule number — which is WORSE than identical: a naive duplicate scan finds
     nothing and the pair looks distinct to every tool, while 2,080 characters of
     grading doctrine sit there with nothing holding them together. */
  const a = await U_A();
  const b = await U_B();
  for (const [needle, what] of PORTED) {
    const copies = GRADER_SOURCE.split(needle).length - 1;
    assert.equal(copies, 1, what + ': expected exactly ONE literal copy in server/grading/*.cjs, found ' + copies);
    assert.ok(a.includes(needle), what + ': absent from the SINGLE-QUESTION prompt');
    assert.ok(b.includes(needle), what + ': absent from the STRUCTURED prompt');
  }
  // The subject checklist atoms: ONE literal each, and each reaches both paths on
  // a submission of its own subject (§17.4 asserts the reach; this asserts the
  // single-sourcing, which is what stops path A's TWO framings drifting apart).
  for (const [needle, what] of [
    // RULING 5: the atom no longer demands state symbols.
    ['terminology, balanced equations (check the species first; state symbols are not required)', 'the SCIENCE checklist atom'],
    ['formula, substitution, calculation, proper notation', 'the MATHS checklist atom'],
  ]) {
    assert.equal(GRADER_SOURCE.split(needle).length - 1, 1,
      what + ' must exist as exactly ONE literal — it was previously written twice inside path A alone');
  }
});



test('§17.9 ★★★ CORRECTED CASE 2 — the THREE-WAY chemistry distinction, in the RIGHT bucket, on BOTH paths', async () => {
  /* ⚠ THIS CRITERION ARRIVED AFTER THE BUILD (owner's corrected §3 case 2,
     2026-08-19). It is asserted here AS WRITTEN against what was actually built —
     the code was NOT adjusted to fit it. It passes because trunk's CORRECTION 2
     already expresses all three buckets on both paths; this lane did not touch
     the taxonomy (:1059-:1062 is TAXONOMY-3BUCKET's, held under ruling ①).
     ★ THE INSTRUMENT IS SCOPED TO THE TAXONOMY BLOCK ON PURPOSE. The bucket
     markers also occur inside ECF_POLICY_V2_PROMPT, so a whole-prompt "last
     marker before the clause" scan reports `presentation` for ALL THREE clauses —
     a broken instrument that looks like a finding. The marker-count assertion
     below is what stops this test silently degrading into that. */
  // INSTRUMENT RETARGETED (ruling 1: one taxonomy, "MISTAKE TYPE — choose by the CAUSE", bucket markers
  // '"x" ='). The scan now takes the NEAREST preceding marker, since the one taxonomy lists silly first.
  const order = ['"conceptual" =', '"calculation" =', '"silly" =', '"presentation" ='];
  const taxOf = (p) => {
    const s = p.indexOf('MISTAKE TYPE — choose by the CAUSE');
    return s < 0 ? '' : p.slice(s, p.indexOf('READING FIDELITY', s));
  };
  const bucketOf = (tax, clause) => {
    const idx = tax.indexOf(clause);
    if (idx < 0) return 'ABSENT';
    let cur = 'NONE'; let at = -1;
    for (const b of order) { const bi = tax.indexOf(b); if (bi >= 0 && bi < idx && bi > at) { at = bi; cur = b.replace(/[" =]/g, ''); } }
    return cur;
  };
  const CLAUSES = [
    ['AN EQUATION LEFT UNBALANCED WHEN THE QUESTION ASKED FOR A BALANCED EQUATION', 'conceptual'],
    ['WRONG COEFFICIENTS while genuinely attempting to balance', 'calculation'],
    // RULING 5: missing state symbols are no longer a presentation fault — the presentation clause now
    // EXCLUDES them, and the old "balanced but missing state symbols ⇒ presentation" clause is gone.
    ['NEVER for missing state symbols', 'presentation'],
  ];
  for (const [label, prompt] of [['SINGLE-QUESTION', await U_A_SCI()], ['STRUCTURED', await U_B_SCI()]]) {
    const tax = taxOf(prompt);
    assert.ok(tax.length > 500, label + ': the taxonomy block was not located');
    for (const b of order) {
      assert.equal(tax.split(b).length - 1, 1,
        label + ': INSTRUMENT CHECK — ' + b + ' must appear exactly ONCE inside the taxonomy block, or the bucket scan is meaningless');
    }
    for (const [clause, want] of CLAUSES) {
      assert.equal(bucketOf(tax, clause), want,
        label + ': "' + clause.slice(0, 44) + '..." must be ' + want);
    }
    assert.ok(!tax.includes('a correctly BALANCED equation MISSING STATE SYMBOLS'), label + ': the retired S4c clause is gone (ruling 5)');
  }
});


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
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'silly', isDeparture: true, departureKind: 'different-problem',
    ...departureExtra }),
  STEP({ description: 'works consistently from 9 — internally correct, wrong question',
    marksAwarded: 1, marksDeducted: 0.5, mistakeType: 'calculation', ...tailExtra }),
];

/* ── CASE 1 ─ the defect the owner actually saw ───────────────────────────── */

test('§19.1 ★★★ THE OWNER\'S PAPER — a departure marked `silly` produces `silly: 1`, not four zeros', async () => {
  // RULING 2: the owner's c = 6 → 9 paper is a MISCOPY — penalised once (silly) with ECF, NOT a departure.
  // Re-cast: no departure flag, and the step below it is an ECF step with no type of its own.
  const h = buildRoute({ replies: [{
    annotatedSteps: OWNER_PAPER({ isDeparture: false, departureKind: null }, { mistakeType: null }),
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;

  // ⚠ BEFORE THIS LANE every one of these four was 0 while the graded sheet beside them
  // said `silly`. That is the whole bug, in four assertions.
  assert.equal(m.silly, 1, 'the miscopy step is counted under the type its own sheet showed');
  assert.equal(m.conceptual, 0, 'and NOT re-filed as a knowledge gap — a copying slip is not a concept gap');
  assert.equal(m.calculation, 0);
  assert.equal(m.presentation, 0);
  assert.equal(m.departure, 0, 'RULING 2: a miscopy is not a departure');
  assert.equal(m.conceptual + m.calculation + m.silly + m.presentation, 1,
    'ONE counted mistake — the student sees one careless slip, not four zeros and not three mistakes');
});

/* ── CASE 2 ─ no fixed bucket: the departure carries its OWN type ─────────── */

test('§19.2 ★★ a departure marked `conceptual` produces `conceptual: 1` — there is NO fixed departure bucket', async () => {
  const h = buildRoute({ replies: [{
    // RULING 3: a wrong formula is method misunderstood (conceptual) with ECF — NOT a departure.
    annotatedSteps: OWNER_PAPER({ mistakeType: 'conceptual', isDeparture: false, departureKind: null }, { mistakeType: null }),
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;
  assert.equal(m.conceptual, 1, 'a wrong formula is a conceptual mistake');
  assert.equal(m.silly, 0, '★ THE SAME FIXTURE, ONE FIELD CHANGED, LANDS IN A DIFFERENT BUCKET —');
  assert.equal(m.departure, 0, 'RULING 3: not a departure — "no fifth category": the step\'s own type is what is counted');
});

test('§19.2b ★ and a departure marked `calculation` lands there too — a miscount while balancing', async () => {
  const h = buildRoute({ replies: [{
    annotatedSteps: OWNER_PAPER({ mistakeType: 'calculation' }),
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;
  assert.equal(m.calculation, 1);
  assert.equal(m.conceptual + m.silly + m.presentation, 0);
});

/* ── CASE 3 ─ rule 6 regression guard: BELOW the departure stays uncounted ── */

test('§19.3 ★★★ RULE 6 REGRESSION GUARD — the steps BELOW the departure are still UNCOUNTED', async () => {
  // ⚠ THE BOUND MOVED BY EXACTLY ONE STEP AND MUST NOT HAVE MOVED BY TWO. The fixture's
  // step at index 4 is explicitly `mistakeType: 'calculation'` and sits below the
  // departure; if the new bound over-reached it would show up here as calculation 1.
  const h = buildRoute({ replies: [{
    annotatedSteps: OWNER_PAPER(),
    mistakeSummary: { conceptual: 3, calculation: 3, silly: 3, presentation: 3 },
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;
  assert.equal(m.calculation, 0,
    'the `calculation` step BELOW the departure is not a separate mistake — CBSE 11, penalised once');
  assert.equal(m.conceptual + m.calculation + m.silly + m.presentation, 1,
    'and the model\'s self-reported 3/3/3/3 is DISCARDED, not max\'d in');
});

/* ── CASE 4 ─ the return: zeroing stops, later work earns ─────────────────── */

// ★★ THE CONTRAST IS THE ASSERTION. These two fixtures are byte-identical apart from a
// single `isReturn: true`, so the difference between them IS the feature, and neither
// number alone could establish it.
const RETURN_STEPS = (withReturn) => [
  STEP({ description: 'still the question', marksAwarded: 1 }),
  STEP({ description: 'THE DEPARTURE', isDeparture: true, departureKind: 'different-problem', status: 'incorrect',
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'silly' }),
  STEP({ description: 'worked from the wrong value — zeroed either way', marksAwarded: 1,
    marksDeducted: 0.5, mistakeType: 'calculation' }),
  STEP({ description: 'CAUGHT IT — back on the question as set', marksAwarded: 1,
    ...(withReturn ? { isReturn: true } : {}) }),
];

test('§19.4 ★★★ A MARKED RETURN — the steps between are zeroed, the work from the return EARNS', async () => {
  const withRet = buildRoute({ replies: [{ annotatedSteps: RETURN_STEPS(true), finalAnswerCorrect: true }] });
  await withRet.route.handleCheckSolution(ECF_REQ(), {});
  const rs = withRet.body().annotatedSteps;

  assert.equal(rs[0].marksAwarded, 1, 'above the departure: untouched (rule 3)');
  assert.equal(rs[1].marksAwarded, 0.5, 'the departure keeps what it independently earned (rule 4)');
  assert.equal(rs[2].marksAwarded, 0, 'BETWEEN departure and return: zeroed (rule 5)');
  assert.equal(rs[2].marksDeducted, 0, 'and carries no separate charge — one departure, one penalty');
  assert.equal(rs[3].marksAwarded, 1, '★★★ FROM THE RETURN: EARNS NORMALLY — the product no longer punishes catching your own mistake');
  assert.equal(withRet.body().marksAwarded, 2.5, '1 + 0.5 + 0 + 1');

  // ── the SAME fixture without the marker ──
  const noRet = buildRoute({ replies: [{ annotatedSteps: RETURN_STEPS(false), finalAnswerCorrect: true }] });
  await noRet.route.handleCheckSolution(ECF_REQ(), {});
  assert.equal(noRet.body().annotatedSteps[3].marksAwarded, 0, 'without the marker that same step is zeroed');
  assert.equal(noRet.body().marksAwarded, 1.5, 'the ONE marker is worth exactly the 1 mark it restores');
  assert.equal(withRet.body().marksAwarded - noRet.body().marksAwarded, 1,
    '★ THE CONTRAST IS THE FEATURE — one field, one mark, everything else held constant');
});

test('§19.4b ★★ the RETURN also changes the student\'s teacher note — it no longer says they never came back', async () => {
  const withRet = buildRoute({ replies: [{ annotatedSteps: RETURN_STEPS(true), finalAnswerCorrect: true }] });
  await withRet.route.handleCheckSolution(ECF_REQ(), {});
  assert.match(withRet.body().teacherNote, /caught it yourself and came back/,
    'a student who recovered is told so, on the same page that pays them for recovering');
  // SPEC C3: one departure sentence per kind.
  assert.doesNotMatch(withRet.body().teacherNote, /From this step on your working answers a different question/,
    'and is NOT told "from this step on your working answers a different question" — that is now false of them');

  const noRet = buildRoute({ replies: [{ annotatedSteps: RETURN_STEPS(false), finalAnswerCorrect: true }] });
  await noRet.route.handleCheckSolution(ECF_REQ(), {});
  assert.match(noRet.body().teacherNote, /From this step on your working answers a different question/,
    'CONTROL — with no return the departure line for its kind is said');
});

/* ── CASE 5 ─ FAIL-SAFE 1: no return ⇒ zero to the end, answer included ───── */

test('§19.5 ★★★ FAIL-SAFE 1 — a departure with NO return zeroes EVERYTHING below it, THE FINAL ANSWER INCLUDED', async () => {
  // ⚠⚠ EVEN THOUGH THAT FINAL ANSWER IS CORRECT FOR THE QUESTION AS SET. Owner ruling:
  // an answer reached from a different problem is coincidence, not work, and CBSE pays
  // for demonstrated method, not for landing on the right number.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'still the question', marksAwarded: 1 }),
      STEP({ description: 'THE DEPARTURE', isDeparture: true, departureKind: 'different-problem', status: 'incorrect',
        marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'conceptual' }),
      STEP({ description: 'worked from the wrong value', marksAwarded: 1 }),
      STEP({ description: 'final answer — CORRECT for the question as set', status: 'correct',
        marksAwarded: 1 }),
    ],
    finalAnswerCorrect: true,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const st = h.body().annotatedSteps;
  assert.equal(st[3].marksAwarded, 0,
    '★★★ THE FINAL ANSWER EARNS NOTHING — this is the assertion the owner ruling turns on');
  assert.equal(st[2].marksAwarded, 0);
  assert.equal(h.body().marksAwarded, 1.5, 'only the work that was still the question is paid');
});

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

test('§19.8 ★★★ FAIL-SAFE 1 — a model that emits NO `isReturn` field at all grades exactly as before', async () => {
  // ⚠ THE OLDER-BACKEND CASE. The field is absent from the JSON entirely, not false.
  const bare = [
    { description: 'still the question', status: 'correct', marksAwarded: 1 },
    { description: 'THE DEPARTURE', status: 'incorrect', marksAwarded: 0.5, mistakeType: 'silly', isDeparture: true, departureKind: 'different-problem' },
    { description: 'below', status: 'correct', marksAwarded: 1 },
    { description: 'below', status: 'correct', marksAwarded: 1 },
  ];
  const h = buildRoute({ replies: [{ annotatedSteps: bare, finalAnswerCorrect: false }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.deepEqual(h.body().annotatedSteps.map((x) => x.marksAwarded), [1, 0.5, 0, 0],
    'absent ⇒ zero to the end, which is the PRE-CHANGE behaviour byte for byte');
  assert.equal(h.body().annotatedSteps.every((x) => x.isReturn === false), true,
    'and the absent field is coerced to a real boolean, never left undefined (Firestore rejects undefined)');
});

test('§19.9 ★★★ FAIL-SAFE 1 — a return marked AT or ABOVE the departure is IGNORED, not obeyed', async () => {
  // ⚠ A marker in a meaningless position must not restore marks. "Before the departure"
  // is not a return from anything, and a model that mislabels must fail toward today's
  // behaviour — never toward paying for work that left the question.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ description: 'marked isReturn ABOVE the departure', marksAwarded: 1, isReturn: true }),
      STEP({ description: 'THE DEPARTURE, also marked isReturn', isDeparture: true, departureKind: 'different-problem', isReturn: true,
        status: 'incorrect', marksAwarded: 0.5, mistakeType: 'silly' }),
      STEP({ description: 'below — must still be zeroed', marksAwarded: 1 }),
      STEP({ description: 'below — must still be zeroed', marksAwarded: 1 }),
    ],
    finalAnswerCorrect: false,
  }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  assert.deepEqual(h.body().annotatedSteps.map((x) => x.marksAwarded), [1, 0.5, 0, 0],
    'neither marker is a return, so zeroing runs to the end');
});

test('§19.9b ★ TWO returns below one departure — the FIRST ends the excursion', async () => {
  // ★ DELIBERATELY UNLIKE `findDepartureIndex`, WHICH FAILS SAFE ON AMBIGUITY. A second
  // departure is a contradiction that must void the first; a second RETURN is describing
  // work that is already being paid, and rule 10 says the departure ends at the return.
  const h = buildRoute({ replies: [{
    annotatedSteps: [
      STEP({ marksAwarded: 1 }),
      STEP({ isDeparture: true, departureKind: 'different-problem', status: 'incorrect', marksAwarded: 0.5, mistakeType: 'silly' }),
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

test('§19.10 ★★★ FAIL-SAFE 2 — the prompt demands POSITIVE EVIDENCE and restates "no departure ⇒ grade normally"', async () => {
  // ⚠⚠ THIS IS THE ASSERTION THAT PROTECTS STUDENTS FROM CHANGE 2. A false departure now
  // costs the WHOLE question, so the only defence is that the model never marks one on
  // suspicion. That defence is prompt text, and prompt text is what a future edit drops.
  await bothPathsSay('MARK A DEPARTURE ONLY ON POSITIVE EVIDENCE',
    'the positive-evidence standard for calling a departure');
  await bothPathsSay('NEVER on suspicion', 'that suspicion is not evidence');
  await bothPathsSay('NEVER because you cannot follow it',
    'that illegible or unfamiliar work is not a departure');
  await bothPathsSay('NO DEPARTURE IDENTIFIED ⇒ GRADE NORMALLY',
    'clause (f) restated BESIDE the return rule so the two are read together');
  await bothPathsSay('WHEN IN DOUBT THERE IS NO DEPARTURE', 'the direction the rule fails in');
  await bothPathsSay('costs the student EVERY step below it',
    'WHY the standard is now this high — the cost of being wrong changed');
});

test('§19.11 ★★ the prompt tells the model HOW to mark a return, and what happens if it never does', async () => {
  await bothPathsSay('"isReturn": true on the FIRST step that is working the question AS SET again',
    'the return marker instruction');
  await bothPathsSay('NEVER set it on a step at or above the departure',
    'the positional constraint the code also enforces');
  await bothPathsSay('IF THE STUDENT NEVER RETURNS, MARK NO RETURN AT ALL',
    'the no-return instruction');
  await bothPathsSay('THE FINAL ANSWER INCLUDED, EVEN IF THAT ANSWER HAPPENS TO BE CORRECT',
    'that a coincidentally-correct answer earns nothing');
  await bothPathsSay('"isReturn": false | true',
    'the field in the JSON example — an instruction the model cannot obey without the shape');
});

/* ── PARITY — the structured path is not a second implementation ──────────── */

test('§19.12 ★★★ STRUCTURED-PATH PARITY — the return works on the worksheet grader too', async () => {
  // ⚠ THE DEPARTURE MARKER ITSELF SHIPPED BROKEN ON THIS PATH ONCE (§15): the normaliser
  // dropped the field, so `findDepartureIndex` could only ever return -1 there. The
  // return marker is exactly as droppable, and this is the assertion that would catch it.
  const h = buildRoute({ replies: [WS_REPLY({
    annotatedSteps: RETURN_STEPS(true),
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: 'Model note.',
    finalAnswerCorrect: true,
  })] });
  await h.route.handleGradeWorksheet(ECF_WS(), {});
  const g = r1(h);
  assert.deepEqual(g.annotatedSteps.map((x) => x.marksAwarded), [1, 0.5, 0, 1],
    'the structured normaliser carries `isReturn` through so findReturnIndex can see it');
  assert.equal(g.mistakeSummary.silly, 1, 'and the departure is counted on this path too');
  assert.equal(g.mistakeSummary.departure, 1);
  assert.match(g.teacherNote, /caught it yourself and came back/);
});

/* ── THE UNIT BOUNDARY, asserted directly ────────────────────────────────── */

test('§19.13 ★ `findReturnIndex` — the fail-safe stated as a unit, every uncertain case is -1', async () => {
  // RULING 1: the positional findReturnIndex is gone; the SAME fail-safe now lives in the one core's
  // acceptedDepartures. This adapter asks it the August question: where does the departure at index d end?
  const { acceptedDepartures } = require('../grading/postprocess.cjs');
  const findReturnIndex = (steps, d) => {
    if (!Array.isArray(steps) || !(d >= 0) || d >= steps.length) return acceptedDepartures(steps).length === 0 ? -1 : NaN;
    const marked = steps.map((st, i) => (i === d ? { ...st, isDeparture: true, departureKind: 'different-problem' } : st));
    const dep = acceptedDepartures(marked);
    return dep.length === 1 ? dep[0].returnIndex : -1;
  };
  const S = (isReturn) => ({ description: 'x', isReturn });
  assert.equal(findReturnIndex([S(false), S(false), S(true)], 1), 2, 'the marked step below the departure');
  assert.equal(findReturnIndex([S(false), S(false), S(true)], -1), -1, 'no departure ⇒ no return');
  assert.equal(findReturnIndex([S(true), S(false), S(false)], 1), -1, 'a marker ABOVE the departure ⇒ -1');
  assert.equal(findReturnIndex([S(false), S(true), S(false)], 1), -1, 'a marker ON the departure ⇒ -1');
  assert.equal(findReturnIndex([S(false), S(false), S(false)], 1), -1, 'nothing marked ⇒ -1');
  assert.equal(findReturnIndex([], 1), -1, 'no steps ⇒ -1');
  assert.equal(findReturnIndex(null, 1), -1, 'not an array ⇒ -1');
  assert.equal(findReturnIndex([S(false), S(false), { description: 'x' }], 1), -1,
    'an ABSENT field is not a return — only `=== true` counts');
  assert.equal(findReturnIndex([S(false), S(false), { description: 'x', isReturn: 'yes' }], 1), -1,
    'and a truthy non-boolean is not a return either');
});

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
  STEP({ description: 'THE DEPARTURE', isDeparture: true, departureKind: 'different-problem', status: 'incorrect',
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'silly' }),
  STEP({ description: 'BETWEEN departure and return', marksAwarded: 1,
    marksDeducted: 0.5, mistakeType: 'presentation' }),
  STEP({ description: 'THE RETURN — back on the question as set', marksAwarded: 1,
    ...(withReturn ? { isReturn: true } : {}) }),
  STEP({ description: 'AFTER the return — a genuine, separate slip', status: 'partial',
    marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'calculation' }),
  STEP({ description: 'after the return, clean', marksAwarded: 1 }),
];

test('§19.14 ★★★ Q1 — a mistake AFTER the return IS COUNTED, and one BETWEEN departure and return is NOT', async () => {
  const h = buildRoute({ replies: [{ annotatedSteps: Q1_STEPS(true), finalAnswerCorrect: true }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;

  assert.equal(m.silly, 1, 'the DEPARTURE step still counts once, under its own type (change 1, unchanged)');
  assert.equal(m.presentation, 0,
    '★ RULE 6 UNCHANGED — the step BETWEEN departure and return is not a separate mistake');
  assert.equal(m.calculation, 1,
    '★★★ THE RULING — after the return the student is back on the question, so this slip is REAL and COUNTS');
  assert.equal(m.conceptual, 0, 'and nothing gained a type it did not already carry');
  assert.equal(m.departure, 1, '`departure` stays the internal marker — still never a bucket');
});

test('§19.15 ★★★ Q1 SYMMETRY — the counted window and the ZEROED window share ONE boundary', async () => {
  // ⚠ THIS IS THE ASSERTION THE RULING ACTUALLY TURNS ON. Marks and counts must agree
  // step for step: a step that EARNS must be COUNTABLE, and a step that is zeroed must
  // be uncounted. Before Q1 step 4 was paid 0.5, deducted 0.5, and named nowhere.
  const h = buildRoute({ replies: [{ annotatedSteps: Q1_STEPS(true), finalAnswerCorrect: true }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const st = h.body().annotatedSteps;

  assert.deepEqual(st.map((x) => x.marksAwarded), [1, 0.5, 0, 1, 0.5, 1],
    'zeroed BETWEEN departure and return only');
  assert.equal(st[4].marksAwarded, 0.5, 'step 4 EARNS');
  assert.equal(st[4].marksDeducted, 0.5, 'step 4 is DEDUCTED on');
  assert.equal(h.body().mistakeSummary.calculation, 1,
    '⇒ and step 4 is therefore NAMED. Paid, charged and unnamed was the defect');
  assert.equal(st[2].marksAwarded, 0, 'step 2 is zeroed');
  assert.equal(st[2].marksDeducted, 0, 'carries no charge');
  assert.equal(h.body().mistakeSummary.presentation, 0, '⇒ and is correspondingly unnamed');
});

test('§19.16 ★★★ Q1 FAIL-SAFE 1 IS UNTOUCHED — with NO return, everything below is zeroed AND uncounted, to the end', async () => {
  // ⚠⚠ THE SAME SIX-STEP FIXTURE, ONE FIELD REMOVED. The Q1 rule must apply ONLY when a
  // return is marked; a missing marker must never restore a COUNT any more than a MARK.
  const h = buildRoute({ replies: [{ annotatedSteps: Q1_STEPS(false), finalAnswerCorrect: true }] });
  await h.route.handleCheckSolution(ECF_REQ(), {});
  const m = h.body().mistakeSummary;

  assert.deepEqual(h.body().annotatedSteps.map((x) => x.marksAwarded), [1, 0.5, 0, 0, 0, 0],
    'no return ⇒ zeroed to the end of the list');
  assert.equal(m.silly, 1, 'only the departure step is counted');
  assert.equal(m.calculation, 0, '★ the SAME step 4 that §19.14 counts is UNCOUNTED here — the marker is the whole difference');
  assert.equal(m.presentation, 0);
  assert.equal(m.conceptual, 0);
  assert.equal(m.conceptual + m.calculation + m.silly + m.presentation, 1,
    'exactly the pre-Q1 behaviour, byte for byte');
});


// ─────────────────────────────────────────────────────────────────────────────