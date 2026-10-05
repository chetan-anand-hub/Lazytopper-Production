'use strict';
// server/grading/core.test.cjs — GRADER-CORE-1 PR-2: the ONE grading core, pinned end to end.
//
// Drives the REAL route adapters (server/routes/checkSolution.cjs) over the REAL core
// (server/grading/*.cjs) with a stubbed callGemini: no network, no model call, a fixed fence
// nonce unless a test says otherwise, deterministic fixtures only. Sections:
//   §C1 one core, one prompt builder — a single question is a set of one
//   §C2 ECF and departures (owner rulings 2 and 3, scoped per PART)
//   §C3 unattempted, withdrawn, state symbols, comments made true (rulings 4, 5, 7)
//   §C4 deterministic verification after the model (arithmetic, stored final answer)
//   §C5 objective scoring (case collisions, hedges, last declaration, recorded pick)
//   §C6 per-request fences and the injected-instruction withhold
//   §C7 the acceptsV2 opt-in, single-question couldNotRead, marksLostByType
//   §P0 OR-LIVE R5: an unanswered question never earns scheme-copied marks
//   §C3b answer-question mismatch (evidence-gated)
//   §MODEL the grading-only model, its thinking budget, the counted fallback, the header
//   §ROUTER per-question routing (owner configuration (c))
// Every section carries at least one CONTROL: the same fixture without the trigger behaves
// differently, so the assertion is able to fail. This file replaces checkSolution.test.cjs
// §13–§17 (port) and §19, which pinned the retired two-prompt / positional-departure doctrine.
//
// Run: node --test server/grading/core.test.cjs   (from lazytopper/)

const test = require('node:test');
const assert = require('node:assert/strict');

const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const grading = require('./index.cjs');
const O = require('../routes/objectiveScoring.cjs');
const { falseEqualities, compareFinalAnswer } = require('./verify.cjs');
const { copiesScheme } = require('./postprocess.cjs');
const { chooseNonce } = require('./fence.cjs');
const { resolveGradingModel, isModelUnavailable } = require('./modelConfig.cjs');
const FIXTURES = require('./objectiveParity.fixtures.json');

/* ── harness ──────────────────────────────────────────────────────────────── */

function lenientExtract(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ replies?: Array, reply?: Function, deps?: object }} opts
 *   replies: one model reply per call (last repeats); an Error instance is thrown.
 *   reply:   ({ model, contents, genConfig, prompt }) => reply | Error, for routed tests.
 */
function harness({ replies = [{}], reply = null, deps = {} } = {}) {
  const calls = [];
  const counters = [];
  const headers = {};
  let captured = null;
  const textOf = (contents) => contents[0].parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
  const route = createCheckSolutionRoute({
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async (model, contents, genConfig) => {
      calls.push({ model, contents, genConfig });
      const r = reply ? reply({ model, contents, genConfig, prompt: textOf(contents) }) : replies[Math.min(calls.length - 1, replies.length - 1)];
      if (r instanceof Error) throw r;
      return { text: typeof r === 'string' ? r : JSON.stringify(r), raw: {} };
    },
    GEMINI_MODEL: 'test-model',
    ACTIVE_PROVIDER: 'test',
    isStubMode: () => false,
    extractJsonObjectFromText: lenientExtract,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce',
    telemetry: { increment: (k, v) => counters.push([k, v]) },
    ...deps,
  });
  const res = { setHeader: (k, v) => { headers[k] = v; } };
  return {
    calls, counters, headers,
    single: async (p) => { captured = null; await route.handleCheckSolution(p, res); return captured; },
    sheet: async (p) => { captured = null; await route.handleGradeWorksheet(p, res); return captured; },
    prompt: (i = 0) => textOf(calls[i].contents),
  };
}

const QT = 'Solve x^2 - 2x - 8 = 0 by factorisation.';
const TOPIC = 'Quadratic Equations';
const TYPED = 'x^2 - 4x + 2x - 8 = 0, so (x - 4)(x + 2) = 0, x = 4 or x = -2';
const S = (o = {}) => ({ description: 'Step', studentWork: 'x = 4', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'Good.', mistakeType: null, correctedWorking: null, ...o });
const R = (qNumber, annotatedSteps, o = {}) => ({ qNumber, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps, teacherNote: 'Note.', ...o });
const REPLY = (...results) => ({ results, summary: 'Summary.' });
const single = (o = {}) => ({ question: QT, marks: 3, subject: 'Maths', topic: TOPIC, textAnswer: TYPED, ...o });
const sq = (qNumber, o = {}) => ({ qNumber, marks: 3, topic: TOPIC, topicLabel: TOPIC, questionText: QT, textAnswer: TYPED, ...o });
const sheet = (questions, o = {}) => ({ worksheetId: 'ws', subject: 'Maths', questions, ...o });
const PHOTO = { imageBase64: 'UEhPVE8=', imageMimeType: 'image/jpeg' };
const V2_KEYS = ['answerMismatch', 'departureKind', 'marksLostByType', 'rubric', 'objectiveResolved'];
const lostSum = (m) => Object.values(m).reduce((a, b) => a + b, 0);
const GENOTYPES = ['TTWW', 'TTww', 'TtWW', 'TtWw'];
const MCQ = (o = {}) => sq(1, { marks: 1, section: 'A', format: 'mcq', questionText: 'Which option is correct for this cross?', options: GENOTYPES, answer: 'TtWW', textAnswer: 'typed working', ...o });

/* ══ §C1 · ONE CORE — a single question is a set of one ══════════════════════ */

// Departure in part (ii), an arithmetic slip in part (i): post-processing changes the marks,
// so identical outputs below prove both endpoints ran the SAME post-processing.
const PARITY_STEPS = [
  S({ part: '(i)', description: 'Forms the equation', studentWork: 'x^2 - 2x - 8 = 0' }),
  S({ part: '(i)', description: 'Splits the middle term', studentWork: '1232/308 = 8' }),
  S({ part: '(ii)', description: 'Solves', studentWork: 'Solves x^2 + 2x - 8 = 0 instead', status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'conceptual', isDeparture: true, departureKind: 'different-problem' }),
  S({ part: '(ii)', description: 'Concludes', studentWork: 'x = 2' }),
];

test('§C1.1 a typed one-question input reaches the model as BYTE-IDENTICAL contents through both endpoints', async () => {
  const h = harness({ replies: [REPLY(R(1, PARITY_STEPS))] });
  await h.single(single({ marks: 4 }));
  await h.sheet(sheet([sq(1, { marks: 4 })]));
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls[0].contents, h.calls[1].contents);
  assert.equal(h.calls[0].genConfig.responseSchema, h.calls[1].genConfig.responseSchema, 'ONE schema object');
  assert.equal(h.calls[0].genConfig.temperature, 0);
  // CONTROL: a different subject changes the subject checklist, so equality is not a constant.
  await h.sheet(sheet([sq(1, { marks: 4 })], { subject: 'Science' }));
  assert.notDeepEqual(h.calls[0].contents, h.calls[2].contents);
});

test('§C1.2 PARITY: identical marksAwarded, step marks/statuses, mistakeSummary and note on both endpoints (legacy and v2)', async () => {
  for (const acceptsV2 of [false, true]) {
    const h = harness({ replies: [REPLY(R(1, PARITY_STEPS))] });
    const a = (await h.single(single({ marks: 4, acceptsV2 }))).body;
    const b = (await h.sheet(sheet([sq(1, { marks: 4 })], { acceptsV2 }))).body.results[0];
    assert.equal(a.marksAwarded, 1, 'model sum 3; the departure zeroes 1 and the arithmetic flag 1');
    for (const k of ['marksAwarded', 'totalMarks', 'percentage', 'annotatedSteps', 'mistakeSummary', 'teacherNote', 'questionDepartureError', 'objective']) {
      assert.deepEqual(a[k], b[k], k + ' differs between endpoints (acceptsV2=' + acceptsV2 + ')');
    }
    if (acceptsV2) for (const k of V2_KEYS) assert.deepEqual(a[k], b[k], k);
    assert.deepEqual(a.annotatedSteps.map((s) => [s.status, s.marksAwarded]), [['correct', 1], ['incorrect', 0], ['incorrect', 0], ['correct', 0]]);
    assert.deepEqual(a.mistakeSummary, { conceptual: 1, calculation: 1, silly: 0, presentation: 0, departure: 1 });
  }
});

test('§C1.3 ONE rulebook: every shared rule ships verbatim on the typed, per-question-photo and document transports', async () => {
  const h = harness({ replies: [REPLY(R(1, [S()]))] });
  await h.single(single());
  await h.single(single({ textAnswer: '', ...PHOTO }));
  await h.sheet(sheet([sq(1, { textAnswer: '' })], { imageBase64: 'UERG', imageMimeType: 'application/pdf' }));
  for (let i = 0; i < 3; i += 1) {
    for (const rule of ['MISTAKE_TAXONOMY_PROMPT', 'READING_FIDELITY_PROMPT', 'ECF_RULES_PROMPT', 'DEPARTURE_RULES_PROMPT', 'PARTS_PROMPT', 'UNATTEMPTED_AND_WITHDRAWN_PROMPT', 'ANSWER_MISMATCH_PROMPT', 'PRESENTATION_PROMPT', 'OBJECTIVE_PROMPT', 'COMMENTS_TRUTH_PROMPT']) {
      assert.ok(h.prompt(i).includes(grading[rule]), rule + ' missing from call ' + i);
    }
  }
});

test('§C1.4 the bare single-question reply shape is accepted on the SINGLE endpoint only', async () => {
  const bare = { annotatedSteps: [S()], teacherNote: 'Note.' };
  const h = harness({ replies: [bare] });
  assert.equal((await h.single(single())).body.ok, true);
  assert.equal(h.calls.length, 1);
  // CONTROL: the set endpoint gates on results[], so the same reply is a parse miss twice.
  const w = await h.sheet(sheet([sq(1)]));
  assert.equal(h.calls.length, 3);
  assert.equal(w.body.ok, false);
});

/* ══ §C2 · ECF AND DEPARTURES (rulings 2 and 3, per PART) ════════════════════ */

const PART_STEPS = (fourthPart) => [
  S({ part: '(i)', studentWork: 'x^2 - 2x - 8 = 0' }),
  S({ part: '(i)', studentWork: 'Explains respiration instead', status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'conceptual', isDeparture: true, departureKind: 'different-problem' }),
  S({ part: '(i)', studentWork: 'x = 4' }),
  S({ part: fourthPart, studentWork: 'x = -2' }),
];

test('§C2.1 a departure in part (i) zeroes the later (i) step and NOT the later part (ii) step', async () => {
  const h = harness({ replies: [REPLY(R(1, PART_STEPS('(ii)')))] });
  const r = (await h.single(single({ marks: 4, acceptsV2: true }))).body;
  assert.deepEqual(r.annotatedSteps.map((s) => s.marksAwarded), [1, 0, 0, 1]);
  assert.equal(r.marksAwarded, 2);
  assert.equal(r.departureKind, 'different-problem');
  assert.equal(r.questionDepartureError, true);
  assert.ok(r.teacherNote.endsWith(grading.DEPARTURE_LINES['different-problem']));
  assert.deepEqual(r.annotatedSteps.map((s) => s.part), ['(i)', '(i)', '(i)', '(ii)']);
});

test('§C2.2 CONTROL: the same fourth step labelled part (i) IS zeroed', async () => {
  const h = harness({ replies: [REPLY(R(1, PART_STEPS('(i)')))] });
  const r = (await h.single(single({ marks: 4 }))).body;
  assert.deepEqual(r.annotatedSteps.map((s) => s.marksAwarded), [1, 0, 0, 0]);
  assert.equal(r.marksAwarded, 1);
});

const MISCOPY = (dep = {}) => [
  S({ description: 'Copies the equation', studentWork: 'x^2 - 2x - 5 = 0', status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'silly', ...dep }),
  S({ description: 'Applies the formula', studentWork: 'x = (2 ± √24)/2' }),
  S({ description: 'Simplifies', studentWork: 'x = 1 ± √6' }),
  S({ description: 'States roots', studentWork: 'x = 1 + √6 or x = 1 - √6' }),
];

test('§C2.3 a miscopied value is ONE silly mistake; the later correct ECF steps keep every mark', async () => {
  const h = harness({ replies: [REPLY(R(1, MISCOPY(), { finalAnswerCorrect: false }))] });
  const r = (await h.single(single({ marks: 4, acceptsV2: true }))).body;
  assert.deepEqual(r.annotatedSteps.map((s) => s.marksAwarded), [0, 1, 1, 1]);
  assert.equal(r.marksAwarded, 3);
  assert.deepEqual(r.mistakeSummary, { conceptual: 0, calculation: 0, silly: 1, presentation: 0, departure: 0 });
  assert.equal(r.questionDepartureError, false);
  assert.deepEqual(r.marksLostByType, { conceptual: 0, calculation: 0, silly: 1, presentation: 0, unattempted: 0, untyped: 0 });
});

test('§C2.4 a departure flag WITHOUT a valid kind (absent, or "miscopy") zeroes nothing and says nothing', async () => {
  for (const dep of [{ isDeparture: true }, { isDeparture: true, departureKind: 'miscopy' }]) {
    const h = harness({ replies: [REPLY(R(1, MISCOPY(dep), { finalAnswerCorrect: false }))] });
    const r = (await h.single(single({ marks: 4, acceptsV2: true }))).body;
    assert.equal(r.marksAwarded, 3, JSON.stringify(dep));
    assert.equal(r.departureKind, null);
    assert.equal(r.questionDepartureError, false);
    assert.ok(!r.teacherNote.includes(grading.DEPARTURE_LINES['different-problem']));
  }
});

test('§C2.5 CONTROL: the same step with departureKind "different-problem" zeroes the later steps', async () => {
  const h = harness({ replies: [REPLY(R(1, MISCOPY({ isDeparture: true, departureKind: 'different-problem' }), { finalAnswerCorrect: false }))] });
  const r = (await h.single(single({ marks: 4, acceptsV2: true }))).body;
  assert.deepEqual(r.annotatedSteps.map((s) => s.marksAwarded), [0, 0, 0, 0]);
  assert.equal(r.departureKind, 'different-problem');
  // the departure is charged ONCE, on its own step: zeroed steps carry no deduction or count
  assert.deepEqual(r.annotatedSteps.map((s) => s.marksDeducted), [1, 0, 0, 0]);
  assert.equal(r.mistakeSummary.departure, 1);
});

test('§C2.6 a return (isReturn) restores marks from that step on, and the note uses the RETURN sentence for its kind', async () => {
  const steps = MISCOPY({ isDeparture: true, departureKind: 'invalid-method' });
  steps[2] = { ...steps[2], isReturn: true };
  const h = harness({ replies: [REPLY(R(1, steps, { finalAnswerCorrect: false }))] });
  const r = (await h.single(single({ marks: 4, acceptsV2: true }))).body;
  assert.deepEqual(r.annotatedSteps.map((s) => s.marksAwarded), [0, 0, 1, 1]);
  assert.equal(r.departureKind, 'invalid-method');
  assert.ok(r.teacherNote.endsWith(grading.DEPARTURE_RETURN_LINES['invalid-method']));
  assert.notEqual(grading.DEPARTURE_LINES['invalid-method'], grading.DEPARTURE_LINES['different-problem']);
});

test('§C2.7 two departures in ONE part are a contradiction and fail safe to no departure in that part', async () => {
  const steps = MISCOPY({ isDeparture: true, departureKind: 'different-problem' });
  steps[2] = { ...steps[2], isDeparture: true, departureKind: 'invalid-method' };
  const h = harness({ replies: [REPLY(R(1, steps, { finalAnswerCorrect: false }))] });
  const r = (await h.single(single({ marks: 4, acceptsV2: true }))).body;
  assert.equal(r.marksAwarded, 3);
  assert.equal(r.departureKind, null);
});

test('§C2.8 a wrongly FORMED equation then solved: forming mark lost, solving marks kept; the prompt says so and the retired doctrine is gone', async () => {
  const steps = [
    S({ description: 'Forms the equation', studentWork: 'x + (x + 2) = 30', status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'conceptual' }),
    S({ description: 'Solves it', studentWork: '2x = 28, x = 14' }),
    S({ description: 'States the numbers', studentWork: 'The numbers are 14 and 16' }),
  ];
  const h = harness({ replies: [REPLY(R(1, steps, { finalAnswerCorrect: false }))] });
  const r = (await h.single(single())).body;
  assert.deepEqual(r.annotatedSteps.map((s) => s.marksAwarded), [0, 1, 1]);
  assert.equal(r.marksAwarded, 2);
  const p = h.prompt();
  assert.ok(p.includes('(c) FORMED WRONGLY'));
  assert.ok(p.includes('A miscopy is NEVER a departure and never zeroes later work.'));
  assert.ok(p.includes('DEPARTURE — ONLY TWO KINDS ZERO LATER WORK'));
  for (const retired of ['ECF_POLICY_V2', 'QUESTION MISCOPY', 'award ZERO for every step below it']) assert.ok(!p.includes(retired), retired);
});

/* ══ §C3 · UNATTEMPTED, WITHDRAWN, STATE SYMBOLS, COMMENTS MADE TRUE ═════════ */

const WITHDRAWN_STEPS = [
  S({ part: '(i)', studentWork: 'x = 7 (struck through)', status: 'withdrawn', marksAwarded: 1, marksDeducted: 1, mistakeType: 'calculation' }),
  S({ part: '(i)', studentWork: 'x = 4', marksAwarded: 2 }),
  S({ part: '(ii)', studentWork: "Don't know", status: 'unattempted', marksAwarded: 1, marksAvailable: 1, mistakeType: 'conceptual' }),
];

test('§C3.1 v2: a withdrawn step is shown with 0/0/0 and never assessed; an unattempted step is "unattempted", untyped, unearned', async () => {
  const h = harness({ replies: [REPLY(R(1, WITHDRAWN_STEPS))] });
  const r = (await h.single(single({ acceptsV2: true }))).body;
  assert.deepEqual(r.annotatedSteps.map((s) => s.status), ['withdrawn', 'correct', 'unattempted']);
  const [w, , u] = r.annotatedSteps;
  assert.deepEqual([w.marksAvailable, w.marksAwarded, w.marksDeducted, w.mistakeType], [0, 0, 0, null]);
  assert.deepEqual([u.marksAwarded, u.marksDeducted, u.mistakeType], [0, 1, null]);
  assert.equal(r.marksAwarded, 2);
  assert.deepEqual(r.mistakeSummary, { conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });
  assert.equal(r.marksLostByType.unattempted, 1);
});

test('§C3.2 legacy: the withdrawn step is ABSENT (re-indexed) and "unattempted" is mapped to "missing"', async () => {
  const h = harness({ replies: [REPLY(R(1, WITHDRAWN_STEPS))] });
  const r = (await h.single(single())).body;
  assert.deepEqual(r.annotatedSteps.map((s) => [s.stepNumber, s.status]), [[1, 'correct'], [2, 'missing']]);
  assert.equal(r.marksAwarded, 2);
});

test('§C3.3 the one rulebook carries the non-attempt, crossed-out and state-symbol rules on BOTH endpoints', async () => {
  const h = harness({ replies: [REPLY(R(1, [S()]))] });
  await h.single(single());
  await h.sheet(sheet([sq(1, { textAnswer: '' })], { imageBase64: 'UERG', imageMimeType: 'application/pdf' }));
  for (const i of [0, 1]) {
    const p = h.prompt(i);
    assert.ok(p.includes('"Don\'t know"'));
    assert.ok(p.includes('crossed out completely with nothing written in its place'));
    assert.ok(p.includes('WITHDRAWN: work the student crossed out'));
    assert.ok(p.includes('STATE SYMBOLS (s/l/g/aq): NEVER deduct for their absence'));
    assert.ok(!/state symbols? (?:earn|loses?|costs?) [0-9½]/i.test(p), 'no rule may charge for state symbols');
  }
});

test('§C3.4 comments are made true: a tick on a step that lost marks is replaced; a scheme-leak sentence is scrubbed', async () => {
  const steps = [S({ studentWork: 'x = 4', status: 'partial', marksAwarded: 0.5, marksDeducted: 0.5, teacherAnnotation: '✓ Well done.' }), S()];
  const h = harness({ replies: [REPLY(R(1, steps, { teacherNote: 'Good start. The stored marking scheme had an error here. Check the last line.' }))] });
  const r = (await h.single(single({ marks: 2 }))).body;
  assert.equal(r.annotatedSteps[0].teacherAnnotation, '½ Well done.');
  assert.equal(r.teacherNote, 'Good start. Check the last line.');
  // CONTROL: a tick on a step that lost nothing is left alone.
  assert.equal(r.annotatedSteps[1].teacherAnnotation, 'Good.');
});

test('§C3.5 rubric: v2 returns it only when it sums to the total; legacy leads the note with it', async () => {
  const rubric = [{ point: 'Factorises', marks: 2 }, { point: 'States roots', marks: 1 }];
  const h = harness({ replies: [REPLY(R(1, [S({ marksAwarded: 3 })], { rubric }))] });
  assert.deepEqual((await h.single(single({ acceptsV2: true }))).body.rubric, rubric);
  assert.ok((await h.single(single())).body.teacherNote.startsWith('Marked against: Factorises 2, States roots 1.'));
  const bad = harness({ replies: [REPLY(R(1, [S({ marksAwarded: 3 })], { rubric: [{ point: 'Factorises', marks: 2 }] }))] });
  assert.equal((await bad.single(single({ acceptsV2: true }))).body.rubric, null, 'CONTROL: a rubric summing to 2 of 3 is dropped');
});

/* ══ §C4 · VERIFICATION AFTER THE MODEL ══════════════════════════════════════ */

// The model over-awards (2 + 1 + 1 = 4 for a 3-mark question) and calls a false line correct.
const ARITH_STEPS = (line) => [
  S({ description: 'Sets up', studentWork: 'Boxes = 1232 divided by 308', marksAwarded: 2 }),
  S({ description: 'Divides', studentWork: line }),
  S({ description: 'Concludes', studentWork: 'Answer: x boxes' }),
];

test('§C4.1 "1232/308 = 8" in a step marked correct is flagged and full marks are withheld', async () => {
  const h = harness({ replies: [REPLY(R(1, ARITH_STEPS('1232/308 = 8'), { finalAnswerCorrect: true }))] });
  const r = (await h.single(single())).body;
  const s = r.annotatedSteps[1];
  assert.equal(s.status, 'incorrect');
  assert.equal(s.mistakeType, 'calculation');
  assert.equal(s.marksAwarded, 0);
  assert.equal(s.teacherAnnotation, '× Check the arithmetic here: 1232/308 is not 8.');
  assert.equal(r.marksAwarded, 2.5, 'never full marks after an arithmetic flag');
});

test('§C4.2 CONTROL: the same fixture with true arithmetic ("1232/308 = 4") reaches full marks', async () => {
  const h = harness({ replies: [REPLY(R(1, ARITH_STEPS('1232/308 = 4'), { finalAnswerCorrect: true }))] });
  const r = (await h.single(single())).body;
  assert.equal(r.marksAwarded, 3);
  assert.equal(r.annotatedSteps[1].status, 'correct');
});

test('§C4.3 rounding is NOT an arithmetic mistake: "3(√3 + 1) = 3 × 2.73 = 8.19" and "22/7 = 3.14" stand', async () => {
  assert.deepEqual(falseEqualities('3(√3 + 1) = 3 × 2.73 = 8.19'), []);
  assert.deepEqual(falseEqualities('22/7 = 3.14'), []);
  assert.equal(falseEqualities('22/7 = 3.24').length, 1, 'CONTROL: a wrong rounding is flagged');
  const h = harness({ replies: [REPLY(R(1, [S({ studentWork: '3(√3 + 1) = 3 × 2.73 = 8.19', marksAwarded: 2 }), S({ studentWork: '22/7 = 3.14' })], { finalAnswerCorrect: true }))] });
  assert.equal((await h.single(single())).body.marksAwarded, 3);
});

test('§C4.4 a stored final answer the student\'s value does not contain blocks full marks and flags the final step', async () => {
  const steps = [S({ studentWork: 'HCF of 825, 675 and 450', marksAwarded: 2 }), S({ description: 'Final answer', studentWork: 'Length = 65 cm' })];
  const h = harness({ replies: [REPLY(R(1, steps, { finalAnswerCorrect: true, studentFinalAnswer: '65 cm' }))] });
  const r = (await h.single(single({ finalAnswer: '75 cm' }))).body;
  assert.equal(r.marksAwarded, 2.5);
  assert.equal(r.annotatedSteps[1].teacherAnnotation, '½ Your final answer does not match the correct value — re-check this step.');
  assert.equal(compareFinalAnswer('65 cm', '75 cm'), 'mismatch');
  // CONTROL: the matching value earns full marks.
  const ok = harness({ replies: [REPLY(R(1, steps, { finalAnswerCorrect: true, studentFinalAnswer: '75 cm' }))] });
  assert.equal((await ok.single(single({ finalAnswer: '75 cm' }))).body.marksAwarded, 3);
});

test('§C4.5 a correctedWorking that is itself arithmetically false is never shown', async () => {
  const steps = [S({ status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'calculation', studentWork: '12 × 1.73 = 20.16', correctedWorking: '12 × 1.73 = 21.76' }),
    S({ status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'calculation', studentWork: '19 × 4 = 72', correctedWorking: '19 × 4 = 76' })];
  const h = harness({ replies: [REPLY(R(1, steps))] });
  const r = (await h.single(single({ marks: 2 }))).body;
  assert.equal(r.annotatedSteps[0].correctedWorking, null);
  assert.equal(r.annotatedSteps[1].correctedWorking, '19 × 4 = 76', 'CONTROL: a true correction is kept');
});

/* ══ §C5 · OBJECTIVE SCORING ═════════════════════════════════════════════════ */

test('§C5.1 the shared fixture table: the server module returns each row\'s ruled verdict', () => {
  assert.ok(FIXTURES.rows.length >= 15);
  for (const row of FIXTURES.rows) {
    assert.deepEqual(O.scoreObjective({ answerKey: row.answerKey, studentPick: row.studentPick, options: row.options, totalMarks: 1 }), row.expect, row.id);
  }
  for (const set of FIXTURES.optionSets) assert.equal(O.optionsDifferOnlyByCase(set.options), set.differOnlyByCase, JSON.stringify(set.options));
});

test('§C5.2 case-collision MCQ through the grader: recorded pick "TTww" vs key "TtWW" scores 0, "TtWW" scores full', async () => {
  const verdict = async (pickedOption) => {
    const h = harness({ replies: [REPLY(R(1, [S({ description: 'Option chosen', studentWork: pickedOption })], { finalAnswerCorrect: true }))] });
    return (await h.sheet(sheet([MCQ({ pickedOption })], { acceptsV2: true }))).body.results[0];
  };
  const wrong = await verdict('TTww');
  assert.deepEqual([wrong.marksAwarded, wrong.objectiveResolved], [0, true]);
  assert.equal((await verdict('TtWW')).marksAwarded, 1);
  // CONTROL: folding would have made every genotype the same string.
  assert.equal(O.normaliseOption('TTww'), O.normaliseOption('TtWW'));
});

test('§C5.3 a normal row still folds case: key "Coincident", option written "coincident", resolves full', async () => {
  const h = harness({ replies: [REPLY(R(1, [S({ studentWork: 'coincident' })], { finalAnswerCorrect: false }))] });
  const q = MCQ({ options: ['Coincident', 'Parallel', 'Intersecting'], answer: 'Coincident', textAnswer: 'coincident' });
  assert.equal((await h.sheet(sheet([q]))).body.results[0].marksAwarded, 1, 'the key compare outranks the model verdict');
});

const LETTER_MCQ = (o) => MCQ({ options: ['Parallel', 'Intersecting', 'Coincident', 'Skew'], answer: 'Parallel', ...o });

test('§C5.4 a hedge "(a) or (c)" scores 0 (resolved) even when one option is right and the model says correct', async () => {
  const h = harness({ replies: [REPLY(R(1, [S({ studentWork: '(a) or (c)' })], { finalAnswerCorrect: true }))] });
  const r = (await h.sheet(sheet([LETTER_MCQ()], { acceptsV2: true }))).body.results[0];
  assert.deepEqual([r.marksAwarded, r.objectiveResolved, r.couldNotRead], [0, true, false]);
  const ok = harness({ replies: [REPLY(R(1, [S({ studentWork: '(a)' })], { finalAnswerCorrect: false }))] });
  assert.equal((await ok.sheet(sheet([LETTER_MCQ()]))).body.results[0].marksAwarded, 1, 'CONTROL: "(a)" alone is full');
});

test('§C5.5 the LAST declared option wins: "c" then "a" scores as "a"', async () => {
  const h = harness({ replies: [REPLY(R(1, [S({ studentWork: 'c' }), S({ studentWork: 'a' })], { finalAnswerCorrect: false }))] });
  assert.equal((await h.sheet(sheet([LETTER_MCQ()]))).body.results[0].marksAwarded, 1);
  // CONTROL: the reverse order scores as "c".
  const rev = harness({ replies: [REPLY(R(1, [S({ studentWork: 'a' }), S({ studentWork: 'c' })], { finalAnswerCorrect: true }))] });
  assert.equal((await rev.sheet(sheet([LETTER_MCQ()]))).body.results[0].marksAwarded, 0);
});

test('§C5.6 the LAST declared option wins: "c" then "no wait, a" scores as "a"', async () => {
  assert.equal(O.extractOptionPick([{ studentWork: 'c' }, { studentWork: 'no wait, a' }], ['Parallel', 'Intersecting', 'Coincident', 'Skew']).pick, 'a');
  const h = harness({ replies: [REPLY(R(1, [S({ studentWork: 'c' }), S({ studentWork: 'no wait, a' })], { finalAnswerCorrect: false }))] });
  assert.equal((await h.sheet(sheet([LETTER_MCQ()]))).body.results[0].marksAwarded, 1);
});

test('§C5.7 the UI-recorded pickedOption takes precedence over the model\'s reading of the work', async () => {
  const h = harness({ replies: [REPLY(R(1, [S({ studentWork: '(c)' })], { finalAnswerCorrect: false }))] });
  assert.equal((await h.sheet(sheet([LETTER_MCQ({ pickedOption: 'a' })]))).body.results[0].marksAwarded, 1);
  assert.equal((await h.sheet(sheet([LETTER_MCQ()]))).body.results[0].marksAwarded, 0, 'CONTROL: without the recorded pick "(c)" is read');
});

test('§C5.8 an UNRESOLVED objective: legacy keeps a graded 0; v2 is not graded (couldNotRead + objectiveResolved false)', async () => {
  const q = LETTER_MCQ({ answer: null, textAnswer: 'I think the lines meet somewhere' });
  const raw = REPLY(R(1, [S({ studentWork: 'I think the lines meet somewhere', status: 'partial' })]));
  const legacy = (await harness({ replies: [raw] }).sheet(sheet([q]))).body;
  assert.deepEqual([legacy.results[0].couldNotRead, legacy.results[0].marksAwarded, legacy.gradedCount], [false, 0, 1]);
  const v2 = (await harness({ replies: [raw] }).sheet(sheet([q], { acceptsV2: true }))).body;
  assert.deepEqual([v2.results[0].couldNotRead, v2.results[0].objectiveResolved, v2.gradedCount, v2.pendingCount], [true, false, 0, 1]);
  assert.equal(v2.results[0].note, grading.UNREAD_OPTION_NOTE);
});

/* ══ §C6 · FENCES AND THE INJECTED-INSTRUCTION WITHHOLD ══════════════════════ */

test('§C6.1 the nonce fence wraps the typed work, the question and the chosen option', async () => {
  const h = harness({ replies: [REPLY(R(1, [S()]))] });
  await h.single(single());
  const p = h.prompt();
  assert.ok(p.includes('<<<STUDENT WORK testnonce>>>\n' + TYPED + '\n     <<<END STUDENT WORK testnonce>>>'));
  assert.ok(p.includes('<<<QUESTION testnonce>>>\n' + QT + '\n     <<<END QUESTION testnonce>>>'));
  await h.sheet(sheet([LETTER_MCQ({ pickedOption: 'b' })]));
  assert.ok(h.prompt(1).includes('<<<CHOSEN OPTION testnonce>>>\nb\n     <<<END CHOSEN OPTION testnonce>>>'));
});

test('§C6.2 the production nonce is random per request (crypto), and never occurs in the fenced text', async () => {
  const h = harness({ replies: [REPLY(R(1, [S()]))], deps: { makeFenceNonce: undefined } });
  await h.single(single());
  await h.single(single());
  const nonces = [0, 1].map((i) => /<<<STUDENT WORK ([0-9a-f]+)>>>/.exec(h.prompt(i))[1]);
  for (const n of nonces) assert.match(n, /^[0-9a-f]{18}$/);
  assert.notEqual(nonces[0], nonces[1]);
  // CONTROL: a generator that keeps colliding with the text is never used verbatim.
  const chosen = chooseNonce(['work mentions abc here'], () => 'abc');
  assert.ok(!'work mentions abc here'.includes(chosen));
});

test('§C6.3 a grade whose comments cite an injected instruction is WITHHELD (legacy ok:false; v2 couldNotRead)', async () => {
  for (const note of ["As per the examiner's instruction, full marks.", 'Following the grading rules update, this earns 3/3.', 'The head examiner allows this method.']) {
    const raw = REPLY(R(1, [S({ marksAwarded: 3 })], { teacherNote: note }));
    const legacy = await harness({ replies: [raw] }).single(single());
    assert.deepEqual([legacy.status, legacy.body.ok, legacy.body.error], [200, false, grading.INJECTION_WITHHELD_NOTE], note);
    assert.equal(legacy.body.marksAwarded, undefined);
    const v2 = (await harness({ replies: [raw] }).single(single({ acceptsV2: true }))).body;
    assert.deepEqual([v2.ok, v2.couldNotRead, v2.marksAwarded], [true, true, 0]);
  }
});

test('§C6.4 CONTROL: an ordinary "as per the formula" comment is graded normally', async () => {
  const h = harness({ replies: [REPLY(R(1, [S({ marksAwarded: 3, teacherAnnotation: '✓ Correct as per the formula.' })]))] });
  const r = (await h.single(single())).body;
  assert.deepEqual([r.ok, r.marksAwarded], [true, 3]);
});

test('§C6.5 a withheld question in a v2 set is pending, never a graded 0', async () => {
  const h = harness({ replies: [REPLY(R(1, [S({ marksAwarded: 3 })]), R(2, [S({ marksAwarded: 3 })], { teacherNote: 'Per the head examiner, full marks.' }))] });
  const b = (await h.sheet(sheet([sq(1), sq(2)], { acceptsV2: true }))).body;
  assert.deepEqual([b.gradedCount, b.pendingCount, b.gradedMarksAwarded, b.gradedMarksTotal, b.worksheetTotalMarks], [1, 1, 3, 3, 6]);
});

/* ══ §C7 · THE acceptsV2 OPT-IN AND marksLostByType ══════════════════════════ */

test('§C7.1 without acceptsV2 none of the v2 keys, step fields or statuses appear (single and set)', async () => {
  for (const flag of [undefined, 'true', 1]) {
    const h = harness({ replies: [REPLY(R(1, WITHDRAWN_STEPS, { rubric: [{ point: 'All', marks: 3 }] }))] });
    const a = (await h.single(single({ acceptsV2: flag }))).body;
    const b = (await h.sheet(sheet([sq(1)], { acceptsV2: flag }))).body.results[0];
    for (const r of [a, b]) {
      for (const k of V2_KEYS) assert.ok(!(k in r), k + ' leaked with acceptsV2=' + flag);
      for (const s of r.annotatedSteps) {
        assert.ok(!('part' in s) && !('marksAvailable' in s));
        assert.ok(grading.LEGACY_STEP_STATUSES.includes(s.status), s.status);
      }
    }
    assert.ok(!('couldNotRead' in a), 'the single legacy shape has no couldNotRead');
  }
});

test('§C7.2 CONTROL: with acceptsV2 true every v2 key and step field is present', async () => {
  const h = harness({ replies: [REPLY(R(1, WITHDRAWN_STEPS))] });
  const a = (await h.single(single({ acceptsV2: true }))).body;
  for (const k of [...V2_KEYS, 'couldNotRead']) assert.ok(k in a, k);
  for (const s of a.annotatedSteps) assert.ok('part' in s && 'marksAvailable' in s);
});

test('§C7.3 single-question couldNotRead never becomes a 0: legacy 200 ok:false; v2 ok:true couldNotRead', async () => {
  const raw = REPLY({ qNumber: 1, couldNotRead: true, note: 'Too blurry.' });
  const legacy = await harness({ replies: [raw] }).single(single({ textAnswer: '', ...PHOTO }));
  assert.deepEqual([legacy.status, legacy.body.ok, legacy.body.error], [200, false, grading.SINGLE_COULD_NOT_READ_MESSAGE]);
  for (const k of ['marksAwarded', 'percentage', 'annotatedSteps']) assert.ok(!(k in legacy.body), k);
  const v2 = (await harness({ replies: [raw] }).single(single({ textAnswer: '', ...PHOTO, acceptsV2: true }))).body;
  assert.deepEqual([v2.ok, v2.couldNotRead, v2.marksAwarded, v2.annotatedSteps.length], [true, true, 0, 0]);
  // CONTROL: the same photo graded returns a mark.
  const graded = (await harness({ replies: [REPLY(R(1, [S()]))] }).single(single({ textAnswer: '', ...PHOTO }))).body;
  assert.deepEqual([graded.ok, graded.marksAwarded], [true, 1]);
});

test('§C7.4 a typed single answer the model refused or omitted gets the TYPED sentence, never photo advice', async () => {
  for (const raw of [REPLY({ qNumber: 1, couldNotRead: true, note: 'Please re-upload a clearer photo.' }), REPLY()]) {
    const out = await harness({ replies: [raw] }).single(single());
    assert.deepEqual([out.body.ok, out.body.error], [false, grading.TYPED_PENDING_NOTE]);
  }
});

// Each row: a sent question, the model's entry, the expected mark and loss by type.
const LOST_TABLE = [
  ['plain loss', sq(1), R(1, [S(), S({ status: 'partial', marksDeducted: 1, mistakeType: 'presentation' })]), 2, { presentation: 1 }],
  ['departure with zeroed steps', sq(2), R(2, [S(), S({ status: 'incorrect', marksAwarded: 0, marksDeducted: 1, mistakeType: 'conceptual', isDeparture: true, departureKind: 'invalid-method' }), S()]), 1, { conceptual: 2 }],
  ['unattempted part', sq(3, { marks: 4 }), R(3, [S({ part: '(i)', marksAwarded: 2, marksAvailable: 2 }), S({ part: '(ii)', status: 'unattempted', marksAwarded: 0, marksAvailable: 2, mistakeType: 'conceptual' })]), 2, { unattempted: 2 }],
  ['objective wrong, bare pick', LETTER_MCQ({ qNumber: 4, textAnswer: '(c)' }), R(4, [S({ studentWork: '(c)', status: 'incorrect', marksAwarded: 0, mistakeType: 'conceptual' })]), 0, { untyped: 1 }],
  ['objective wrong, with working', LETTER_MCQ({ qNumber: 5, textAnswer: 'Answer: (c) since the slopes match' }), R(5, [S({ studentWork: 'Answer: (c) since the slopes match', status: 'incorrect', marksAwarded: 0, mistakeType: 'conceptual' })]), 0, { conceptual: 1 }],
  ['objective right', LETTER_MCQ({ qNumber: 6, textAnswer: '(a)' }), R(6, [S({ studentWork: '(a)', mistakeType: 'silly' })]), 1, {}],
  ['arithmetic flag', sq(7, { marks: 2 }), R(7, [S(), S({ studentWork: '1232/308 = 8' })]), 1, { calculation: 1 }],
  ['key mismatch cap', sq(8, { marks: 2, finalAnswer: '75 cm' }), R(8, [S(), S({ studentWork: 'Length = 65 cm' })], { finalAnswerCorrect: true, studentFinalAnswer: '65 cm' }), 1.5, { untyped: 0.5 }],
];
const MISMATCH_Q = (n) => sq(n, { textAnswer: 'Photosynthesis makes glucose in the leaves.' });
const MISMATCH_R = (n) => R(n, [S({ status: 'incorrect', marksAwarded: 0, marksDeducted: 3 })], { addressesQuestion: 'no', mismatchEvidence: { question: 'x^2 - 2x - 8 = 0', work: 'Photosynthesis makes glucose' } });

test('§C7.5 marksLostByType sums to totalMarks − marksAwarded on every graded fixture, with the exact split', async () => {
  const h = harness({ replies: [REPLY(...LOST_TABLE.map((row) => row[2]), MISMATCH_R(9))] });
  const b = (await h.sheet(sheet([...LOST_TABLE.map((row) => row[1]), MISMATCH_Q(9)], { acceptsV2: true }))).body;
  LOST_TABLE.forEach(([name, , , awarded, split], i) => {
    const r = b.results[i];
    assert.equal(r.marksAwarded, awarded, name);
    assert.equal(lostSum(r.marksLostByType), r.totalMarks - r.marksAwarded, name);
    assert.deepEqual(r.marksLostByType, { ...grading.zeroLost(), ...split }, name);
  });
  // answer mismatch: not graded, so nothing is "lost" and every bucket is zero.
  assert.equal(b.results[8].answerMismatch, true);
  assert.deepEqual(b.results[8].marksLostByType, grading.zeroLost());
  assert.deepEqual([b.gradedCount, b.pendingCount], [8, 1]);
});

test('§C7.6 an INCONSISTENT model ledger (step availabilities above the total) is capped at the real loss, bucket by bucket', async () => {
  // A 3-mark question whose model claims 2 + 2 + 2 available. The departure step (kind
  // different-problem, typed conceptual) earned its 2; the two steps after it are zeroed. Only
  // 1 mark was actually lost, so exactly 1 is attributed — to the departure's own type — and
  // never the 4 the model's own availabilities would imply. (Found by mutation M13: every
  // other fixture has a consistent ledger, so the cap was never exercised.)
  const steps = [
    S({ marksAwarded: 2, marksAvailable: 2, mistakeType: 'conceptual', status: 'partial', isDeparture: true, departureKind: 'different-problem' }),
    S({ marksAwarded: 2, marksAvailable: 2 }),
    S({ marksAwarded: 2, marksAvailable: 2 }),
  ];
  const h = harness({ replies: [REPLY(R(1, steps, { finalAnswerCorrect: false }))] });
  const r = (await h.sheet(sheet([sq(1, { marks: 3 })], { acceptsV2: true }))).body.results[0];
  assert.equal(r.marksAwarded, 2);
  assert.deepEqual(r.marksLostByType, { ...grading.zeroLost(), conceptual: 1 });
  assert.equal(lostSum(r.marksLostByType), r.totalMarks - r.marksAwarded);
});

/* ══ §P0 · OR-LIVE R5 — NO SCHEME-COPIED MARKS FOR AN UNANSWERED QUESTION ════ */

const R5_SCHEME = ['[1 mark] Identifies and reasons that the length of the longest ruler should be equal to the HCF of the three lengths.', '[1 mark] Finds the HCF of the three numbers, working in centimetres: 825 = 3 × 5² × 11, 675 = 3³ × 5², 450 = 2 × 3² × 5², so the highest common factor is 3 × 5² = 75. Mentions the length of the longest ruler as 75 cm or 0.75 m. (The rubric awards 0.5 marks if the length is correct but the unit is incorrect.)'];
const R5_Q = (n, o = {}) => sq(n, { marks: 2, questionText: 'Three rods are 825 cm, 675 cm and 450 cm long. Find the length of the longest ruler that measures each rod exactly.', solutionSteps: R5_SCHEME, finalAnswer: '75 cm', textAnswer: '', ...o });
const PROSE_COPY = 'Finds the HCF of the three numbers, working in centimetres: 825 = 3 × 5² × 11, 675 = 3³ × 5², 450 = 2 × 3² × 5², so the highest common factor is 3 × 5² = 75.';
const PARAPHRASE = '825 = 3 x 5^2 x 11, 675 = 3^3 x 5^2, 450 = 2 x 3^2 x 5^2. HCF = 3 x 5^2 = 75.';
const FULL = (n, work2) => R(n, [S({ studentWork: 'Longest ruler = HCF of the lengths' }), S({ studentWork: work2 })], { finalAnswerCorrect: true, studentFinalAnswer: '75 cm' });

test('§P0.1 typed-only set: a question with no typed text is UNATTEMPTED whatever the model returned', async () => {
  const raw = REPLY(R(1, [S({ marksAwarded: 3 })]), R(2, [S({ marksAwarded: 3 })]));
  const legacy = (await harness({ replies: [raw] }).sheet(sheet([sq(1), sq(2, { textAnswer: '' })]))).body;
  assert.equal(legacy.results[0].marksAwarded, 3, 'CONTROL: the answered question keeps its grade');
  const u = legacy.results[1];
  assert.deepEqual([u.marksAwarded, u.annotatedSteps[0].status, u.annotatedSteps[0].mistakeType, u.teacherNote], [0, 'missing', null, grading.NO_ANSWER_SUBMITTED_NOTE]);
  const v2 = (await harness({ replies: [raw] }).sheet(sheet([sq(1), sq(2, { textAnswer: '' })], { acceptsV2: true }))).body.results[1];
  assert.equal(v2.annotatedSteps[0].status, 'unattempted');
  assert.deepEqual(v2.marksLostByType, { ...grading.zeroLost(), unattempted: 3 });
});

test('§P0.2 per-question-photo set: no photo and no text is unattempted; ONE whole-set document is not (the server cannot tell)', async () => {
  const raw = REPLY(R(1, [S({ marksAwarded: 3 })]), R(2, [S({ marksAwarded: 3 })]));
  const photos = (await harness({ replies: [raw] }).sheet(sheet([sq(1, { textAnswer: '' }), sq(2, { textAnswer: '' })], { uploads: [{ qNumber: 1, ...PHOTO }] }))).body;
  assert.deepEqual(photos.results.map((r) => r.marksAwarded), [3, 0]);
  // CONTROL: with one document holding every answer the model's grade stands.
  const doc = (await harness({ replies: [raw] }).sheet(sheet([sq(1, { textAnswer: '' }), sq(2, { textAnswer: '' })], { imageBase64: 'UERG', imageMimeType: 'application/pdf' }))).body;
  assert.deepEqual(doc.results.map((r) => r.marksAwarded), [3, 3]);
});

test('§P0.3 credited "working" carrying the scheme\'s mark bracket makes the question unattempted', async () => {
  const raw = REPLY(FULL(1, R5_SCHEME[1]));
  const r = (await harness({ replies: [raw] }).sheet(sheet([R5_Q(1)], { uploads: [{ qNumber: 1, ...PHOTO }] }))).body.results[0];
  assert.deepEqual([r.marksAwarded, r.teacherNote], [0, grading.NO_ANSWER_ON_PAGE_NOTE]);
});

test('§P0.4 scheme PROSE reproduced near-verbatim (no bracket) also trips; a minority of copied steps does not', async () => {
  assert.equal(copiesScheme(PROSE_COPY, R5_Q(1)), true);
  const r = (await harness({ replies: [REPLY(FULL(1, PROSE_COPY))] }).sheet(sheet([R5_Q(1)], { uploads: [{ qNumber: 1, ...PHOTO }] }))).body.results[0];
  assert.equal(r.marksAwarded, 0);
  // CONTROL: 1 copied of 3 credited steps is below half — the grade stands.
  const three = R(1, [S({ studentWork: 'Longest ruler = HCF of the lengths', marksAwarded: 0.5 }), S({ studentWork: 'Prime factors found for each length', marksAwarded: 0.5 }), S({ studentWork: PROSE_COPY })], { finalAnswerCorrect: true, studentFinalAnswer: '75 cm' });
  const kept = (await harness({ replies: [REPLY(three)] }).sheet(sheet([R5_Q(1)], { uploads: [{ qNumber: 1, ...PHOTO }] }))).body.results[0];
  assert.equal(kept.marksAwarded, 2);
});

test('§P0.5 a genuine TYPED line containing the scheme\'s mathematics (even its prose) is the student\'s own and is not tripped', async () => {
  const q = R5_Q(1, { textAnswer: PROSE_COPY + ' So the longest ruler is 75 cm.' });
  assert.equal(copiesScheme(PROSE_COPY, q), false);
  const r = (await harness({ replies: [REPLY(FULL(1, PROSE_COPY))] }).sheet(sheet([q]))).body.results[0];
  assert.equal(r.marksAwarded, 2);
});

test('§P0.6 THE STATED LIMIT: the paraphrased R5 line is NOT caught by the deterministic defence', async () => {
  // OR-LIVE R5 returned a paraphrase of the scheme. It carries no mark bracket and no scheme
  // prose words, so copiesScheme cannot tell it from a genuine answer; only the prompt rule
  // and, where the server knows there was no answer input, §P0.1/§P0.2 cover it.
  assert.equal(copiesScheme(PARAPHRASE, R5_Q(1)), false);
  const r = (await harness({ replies: [REPLY(FULL(1, PARAPHRASE))] }).sheet(sheet([R5_Q(1)], { uploads: [{ qNumber: 1, ...PHOTO }] }))).body.results[0];
  assert.equal(r.marksAwarded, 2);
});

/* ══ §C3b · ANSWER–QUESTION MISMATCH ═════════════════════════════════════════ */

test('§C3b.1 evidence-backed "no" → answerMismatch: 0 marks, no steps, the does-not-address note (v2 and legacy wording)', async () => {
  const v2 = (await harness({ replies: [REPLY(MISMATCH_R(1))] }).single(single({ textAnswer: MISMATCH_Q(1).textAnswer, acceptsV2: true }))).body;
  assert.deepEqual([v2.answerMismatch, v2.marksAwarded, v2.annotatedSteps.length, v2.teacherNote], [true, 0, 0, grading.MISMATCH_NOTE_V2]);
  assert.match(v2.teacherNote, /does not address the question/);
  const legacy = (await harness({ replies: [REPLY(MISMATCH_R(1))] }).single(single({ textAnswer: MISMATCH_Q(1).textAnswer }))).body;
  assert.deepEqual([legacy.ok, legacy.marksAwarded, legacy.teacherNote, 'answerMismatch' in legacy], [true, 0, grading.MISMATCH_NOTE_LEGACY, false]);
});

test('§C3b.2 set totals: v2 treats a mismatch exactly like couldNotRead; legacy counts it as a graded 0', async () => {
  const raw = REPLY(R(1, [S({ marksAwarded: 2, status: 'partial', marksDeducted: 1 })]), MISMATCH_R(2));
  const pick = (b) => [b.gradedCount, b.pendingCount, b.gradedMarksAwarded, b.gradedMarksTotal, b.worksheetTotalMarks];
  assert.deepEqual(pick((await harness({ replies: [raw] }).sheet(sheet([sq(1), MISMATCH_Q(2)], { acceptsV2: true }))).body), [1, 1, 2, 3, 6]);
  assert.deepEqual(pick((await harness({ replies: [raw] }).sheet(sheet([sq(1), MISMATCH_Q(2)]))).body), [2, 0, 2, 6, 6]);
});

test('§C3b.3 CONTROLS: a quote not in the question, a work quote not in the typed answer, or a credited correct step → no mismatch', async () => {
  const variants = [
    { mismatchEvidence: { question: 'Find the area of a circle', work: 'Photosynthesis makes glucose' } },
    { mismatchEvidence: { question: 'x^2 - 2x - 8 = 0', work: 'Respiration releases energy' } },
    { annotatedSteps: [S({ studentWork: 'Photosynthesis makes glucose' })] },
  ];
  for (const v of variants) {
    const r = (await harness({ replies: [REPLY({ ...MISMATCH_R(1), ...v })] }).single(single({ textAnswer: MISMATCH_Q(1).textAnswer, acceptsV2: true }))).body;
    assert.equal(r.answerMismatch, false, JSON.stringify(v));
    assert.ok(r.annotatedSteps.length > 0);
  }
});

test('§C3b.4 a placeholder question (topic name, "Submitted question", short chapter name) never yields a mismatch verdict', async () => {
  for (const question of [TOPIC, 'Submitted question', 'Real Numbers', 'Light Reflection And Refraction']) {
    const r = (await harness({ replies: [REPLY(MISMATCH_R(1))] }).single(single({ question, textAnswer: MISMATCH_Q(1).textAnswer, acceptsV2: true }))).body;
    assert.equal(r.answerMismatch, null, question);
  }
  // A label with a digit and an instruction word is caught only by the label-equality rule.
  // The evidence quote is taken from that label, so only the placeholder rule can stop it.
  const label = 'Chapter 5: find the nth term of an AP';
  const labelR = { ...MISMATCH_R(1), mismatchEvidence: { question: 'nth term', work: 'Photosynthesis makes glucose' } };
  const byLabel = (await harness({ replies: [REPLY(labelR)] }).single(single({ question: label, topic: label, textAnswer: MISMATCH_Q(1).textAnswer, acceptsV2: true }))).body;
  assert.equal(byLabel.answerMismatch, null);
  const addr = async (a) => (await harness({ replies: [REPLY(R(1, [S()], { addressesQuestion: a }))] }).single(single({ acceptsV2: true }))).body.answerMismatch;
  assert.deepEqual([await addr('yes'), await addr('partly'), await addr('unknown')], [false, false, null]);
});

/* ══ §MODEL · THE GRADING MODEL, ITS BUDGET, THE COUNTED FALLBACK ════════════ */

const STRONG = { GRADING_MODEL: 'strong-model', GRADING_THINKING_BUDGET: 2048 };
const unavailable = (status, message) => Object.assign(new Error(message), { status });
const quietWarn = async (fn) => {
  const orig = console.warn;
  const seen = [];
  console.warn = (...a) => { seen.push(a.join(' ')); };
  try { await fn(); } finally { console.warn = orig; }
  return seen;
};

test('§MODEL.1 GRADING_MODEL is used, its thinkingBudget rides only on it, and X-Grading-Model names it', async () => {
  const h = harness({ replies: [REPLY(R(1, [S()]))], deps: STRONG });
  await h.single(single());
  assert.equal(h.calls[0].model, 'strong-model');
  assert.deepEqual(h.calls[0].genConfig.thinkingConfig, { thinkingBudget: 2048 });
  assert.equal(h.headers['X-Grading-Model'], 'strong-model');
  assert.deepEqual(h.counters, []);
  // CONTROL: without GRADING_MODEL the base model grades and no thinking cap is sent.
  const base = harness({ replies: [REPLY(R(1, [S()]))], deps: { GRADING_THINKING_BUDGET: 2048 } });
  await base.sheet(sheet([sq(1)]));
  assert.equal(base.calls[0].model, 'test-model');
  assert.equal(base.calls[0].genConfig.thinkingConfig, undefined);
  assert.equal(base.headers['X-Grading-Model'], 'test-model');
});

test('§MODEL.2 an unavailable model (404) retries ONCE on gemini-2.5-flash, counted, logged once, header names the fallback', async () => {
  const h = harness({ reply: ({ model }) => (model === 'strong-model' ? unavailable(404, 'models/strong-model is not found') : REPLY(R(1, [S()]))), deps: STRONG });
  const warns = await quietWarn(async () => {
    const out = await h.single(single());
    assert.equal(out.body.ok, true);
    assert.deepEqual(h.calls.map((c) => c.model), ['strong-model', 'gemini-2.5-flash']);
    assert.equal(h.calls[1].genConfig.thinkingConfig, undefined);
    assert.equal(h.headers['X-Grading-Model'], 'gemini-2.5-flash');
    assert.deepEqual(h.counters, [['grading.model_fallback', 1]]);
    // Later calls go straight to the fallback and are EACH counted (set endpoint too).
    await h.sheet(sheet([sq(1)]));
    assert.deepEqual(h.calls.map((c) => c.model), ['strong-model', 'gemini-2.5-flash', 'gemini-2.5-flash']);
    assert.equal(h.counters.length, 2);
    assert.equal(h.headers['X-Grading-Model'], 'gemini-2.5-flash');
  });
  assert.equal(warns.filter((w) => w.includes('[grading] model strong-model unavailable')).length, 1);
});

test('§MODEL.2b two CONCURRENT first requests that both hit the unavailable model: both counted, logged once', async () => {
  const h = harness({ reply: ({ model }) => (model === 'strong-model' ? unavailable(404, 'not found') : REPLY(R(1, [S()]))), deps: STRONG });
  const warns = await quietWarn(() => Promise.all([h.single(single()), h.single(single())]));
  assert.deepEqual(h.calls.map((c) => c.model), ['strong-model', 'strong-model', 'gemini-2.5-flash', 'gemini-2.5-flash']);
  assert.equal(h.counters.length, 2);
  assert.equal(warns.filter((w) => w.includes('[grading] model strong-model unavailable')).length, 1);
});

test('§MODEL.3 a 403, and a 400 naming the thinking budget, also fall back; a plain 400 and a 500 do NOT', async () => {
  for (const err of [unavailable(403, 'permission denied'), unavailable(400, 'thinking budget is not supported for this model')]) {
    const h = harness({ reply: ({ model }) => (model === 'strong-model' ? err : REPLY(R(1, [S()]))), deps: STRONG });
    await quietWarn(() => h.single(single()));
    assert.equal(h.counters.length, 1, err.message);
  }
  for (const err of [unavailable(400, 'Invalid JSON payload received'), unavailable(500, 'internal error')]) {
    const h = harness({ reply: () => err, deps: STRONG });
    const origError = console.error;
    console.error = () => {}; // the route logs the provider error before its 500
    try { h.out = await h.single(single()); } finally { console.error = origError; }
    assert.equal(h.out.status, 500, err.message);
    assert.deepEqual([h.calls.length, h.counters.length], [1, 0]);
  }
  assert.equal(isModelUnavailable({ status: 404 }), true);
  assert.equal(isModelUnavailable({ status: 400, message: 'contents must not be empty' }), false);
});

test('§MODEL.4 resolveGradingModel reads the environment and falls back to the code defaults', () => {
  assert.deepEqual(resolveGradingModel({}), { model: 'gemini-2.5-flash', thinkingBudget: null, mode: 'single', lightModel: 'gemini-2.5-flash' });
  assert.deepEqual(resolveGradingModel({ GRADING_MODEL: 'm', GRADING_THINKING_BUDGET: '2048', GRADING_MODE: 'ROUTER', GRADING_LIGHT_MODEL: 'l' }), { model: 'm', thinkingBudget: 2048, mode: 'router', lightModel: 'l' });
  assert.deepEqual([resolveGradingModel({ GRADING_THINKING_BUDGET: '-1' }).thinkingBudget, resolveGradingModel({ GRADING_MODE: 'fast' }).mode], [null, 'single']);
});

/* ══ §ROUTER · PER-QUESTION ROUTING (owner configuration (c)) ════════════════ */

const ROUTER = { GRADING_MODE: 'router', GRADING_MODEL: 'strong-model', GRADING_THINKING_BUDGET: 2048, GRADING_LIGHT_MODEL: 'light-model' };
const qNumsIn = (prompt) => [...prompt.matchAll(/^ {2}Q(\d+)\. \[/gm)].map((m) => Number(m[1]));
const echoReply = ({ prompt }) => REPLY(...qNumsIn(prompt).map((n) => R(n, [S({ marksAwarded: 1 })])));
const ROUTED_SET = [
  LETTER_MCQ({ qNumber: 1, pickedOption: 'a' }), // objective, known pick + key -> no model
  sq(2, { marks: 2 }), // typed 2-mark -> light
  sq(3, { marks: 3 }), // typed 3-mark -> strong
  sq(4, { marks: 2, questionText: 'Prove that √2 is irrational.' }), // proof -> strong
  sq(5, { marks: 1, textAnswer: '' }), // photographed -> strong
  LETTER_MCQ({ qNumber: 6, textAnswer: '' }), // objective, photographed pick -> light
];

test('§ROUTER.1 each model group is ONE call carrying only its questions; a known objective pick costs no call', async () => {
  const h = harness({ reply: echoReply, deps: ROUTER });
  const b = (await h.sheet(sheet(ROUTED_SET, { uploads: [{ qNumber: 5, ...PHOTO }, { qNumber: 6, ...PHOTO }] }))).body;
  assert.equal(h.calls.length, 2);
  const byModel = Object.fromEntries(h.calls.map((c, i) => [c.model, qNumsIn(h.prompt(i))]));
  assert.deepEqual(byModel, { 'light-model': [2, 6], 'strong-model': [3, 4, 5] });
  assert.equal(h.headers['X-Grading-Model'], 'light-model+strong-model');
  const strongCall = h.calls.find((c) => c.model === 'strong-model');
  const lightCall = h.calls.find((c) => c.model === 'light-model');
  assert.deepEqual(strongCall.genConfig.thinkingConfig, { thinkingBudget: 2048 });
  assert.equal(lightCall.genConfig.thinkingConfig, undefined);
  // the photo travels only with its own group
  assert.equal(lightCall.contents[0].parts.filter((p) => p.inlineData).length, 1);
  assert.equal(strongCall.contents[0].parts.filter((p) => p.inlineData).length, 1);
  assert.equal(b.results[0].marksAwarded, 1, 'Q1 scored deterministically: recorded "a" = key "Parallel"');
});

test('§ROUTER.2 deterministic objectives: a wrong recorded pick scores 0 and a typed bare letter needs no call', async () => {
  const h = harness({ reply: echoReply, deps: ROUTER });
  const b = (await h.sheet(sheet([LETTER_MCQ({ qNumber: 1, pickedOption: 'c' }), LETTER_MCQ({ qNumber: 2, textAnswer: '(a)' })]))).body;
  assert.equal(h.calls.length, 0);
  assert.deepEqual(b.results.map((r) => r.marksAwarded), [0, 1]);
  assert.equal(h.headers['X-Grading-Model'], 'none');
  // CONTROL: the same objective with NO key cannot be scored without a model (light).
  const nokey = harness({ reply: echoReply, deps: ROUTER });
  await nokey.sheet(sheet([LETTER_MCQ({ qNumber: 1, pickedOption: 'c', answer: null })]));
  assert.deepEqual(nokey.calls.map((c) => c.model), ['light-model']);
});

test('§ROUTER.3 a group whose reply is unparseable twice makes ONLY its own questions couldNotRead', async () => {
  const h = harness({ reply: (a) => (a.model === 'light-model' ? 'not json' : echoReply(a)), deps: ROUTER });
  await quietWarn(async () => { h.out = await h.sheet(sheet([sq(2, { marks: 2 }), sq(3, { marks: 3 })])); });
  const b = h.out.body;
  assert.deepEqual(h.calls.map((c) => c.model).sort(), ['light-model', 'light-model', 'strong-model']);
  assert.deepEqual(b.results.map((r) => r.couldNotRead), [true, false]);
  assert.deepEqual([b.gradedCount, b.pendingCount], [1, 1]);
});

test('§ROUTER.4 CONTROL: single mode sends the same set as ONE call on the grading model', async () => {
  const h = harness({ reply: echoReply, deps: STRONG });
  await h.sheet(sheet(ROUTED_SET, { uploads: [{ qNumber: 5, ...PHOTO }, { qNumber: 6, ...PHOTO }] }));
  assert.deepEqual(h.calls.map((c) => c.model), ['strong-model']);
  assert.deepEqual(qNumsIn(h.prompt()), [1, 2, 3, 4, 5, 6]);
});
