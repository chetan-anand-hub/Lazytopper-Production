'use strict';
// server/grading/secondLook.test.cjs — GRADE-SECOND-LOOK-1 (owner, 25 Nov 2026).
// Drives the REAL route adapters over the REAL core with a stubbed model (no network). Every rescue rule has
// a CONTROL that keeps the first reading. Sections:
//   §L1 when the second look runs (and when it never does)
//   §L2 what it may rescue: content-matched, out-of-order, own-numbered answers
//   §L3 the guards: an answer already used, "does not address", no first line, two questions one answer
//   §L4 time, kill switch, telemetry, every surface
// Run: node --test server/grading/secondLook.test.cjs   (from lazytopper/)

// LOCATE-FIRST-1: this harness stubs the model with a queue of GRADING replies; the locate call (one per one-document
// paper) would consume one of them. The locate step is tested in locate.test.cjs; here it is switched OFF explicitly,
// which restores the trunk request byte-for-byte (the kill switch).
process.env.GRADING_LOCATE_DISABLED = '1';
const test = require('node:test');
const assert = require('node:assert/strict');

const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const gt = require('./gradeTiming.cjs');
const L = require('./secondLook.cjs');

function lenient(text) { try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; } }

function harness({ replies, deps = {} }) {
  const calls = [];
  let captured = null;
  const textOf = (contents) => contents[0].parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
  const route = createCheckSolutionRoute({
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async (model, contents, genConfig) => {
      calls.push({ model, contents, genConfig });
      const r = replies[Math.min(calls.length - 1, replies.length - 1)];
      if (r instanceof Error) throw r;
      return { text: JSON.stringify(r), raw: {} };
    },
    GEMINI_MODEL: 'test-model', ACTIVE_PROVIDER: 'test', isStubMode: () => false,
    extractJsonObjectFromText: lenient,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce',
    telemetry: { increment: () => {} },
    ...deps,
  });
  const res = { setHeader: () => {} };
  return {
    calls,
    sheet: async (p) => { captured = null; await route.handleGradeWorksheet(p, res); return captured; },
    prompt: (i) => textOf(calls[i].contents),
  };
}

// A trig paper: Q5–Q8, the student answers Q8 FIRST, then Q5, labels them 1) and 2), and skips Q6/Q7.
const Q = (n, text, marks) => ({ qNumber: n, marks, topic: 'Trigonometry', topicLabel: 'Trigonometry', questionText: text, textAnswer: '' });
const PAPER = () => [
  Q(5, 'If tan θ + cot θ = 4√3/3, find tan² θ + cot² θ.', 1),
  Q(6, 'Given 15 cot A = 8, find sin A and sec A.', 2),
  Q(7, 'If 3 cot A = 4, prove (1 − tan² A)/(1 + tan² A) = cos² A − sin² A.', 2),
  Q(8, 'Given sin A = 3/5, find the other trigonometric ratios of A.', 3),
];
const DOC = { imageBase64: 'UERG', imageMimeType: 'application/pdf' };
const sheet = (o = {}) => ({ worksheetId: 'ws', subject: 'Maths', questions: PAPER(), ...DOC, ...o });
const S = (work, o = {}) => ({ description: 'Step', studentWork: work, status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null, correctedWorking: null, ...o });
const R = (n, steps, o = {}) => ({ qNumber: n, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: steps, teacherNote: 'Note.', ...o });
const NF = (n) => ({ qNumber: n, couldNotRead: true, note: 'not found on the uploaded pages' });
const INV = (...e) => e.map(([n, line], i) => ({ page: i + 1, questionsSeen: [{ qNumber: n, firstLine: line }] }));
const REPLY = (inv, ...results) => ({ pageInventory: inv, results, summary: 'Summary.' });
const UNPLACED = (reply, lines) => ({ ...reply, unplacedAnswers: lines });

const Q5_LINE = 'tan θ + cot θ = 4√3/3';
const Q5_WORK = [S(Q5_LINE, { marksAwarded: 0.5 }), S('tan²θ + cot²θ = 16/3 − 2 = 10/3', { marksAwarded: 0.5 })];
const Q8_LINE = 'sin A = 3/5, sides 3, 4, 5';
const Q8_WORK = [S(Q8_LINE), S('cos A = 4/5, tan A = 3/4'), S('cosec A = 5/3, sec A = 5/4, cot A = 4/3')];
const Q6_LINE = '15 cot A = 8 so cot A = 8/15';
const Q6_WORK = [S(Q6_LINE), S('sin A = 15/17, sec A = 17/8')];
// First reading: only Q5 found; it saw the answer labelled 1) (Q8's) but could not place it.
const FIRST = UNPLACED(REPLY(INV([5, Q5_LINE]), R(5, Q5_WORK), NF(6), NF(7), NF(8)), ['1) ' + Q8_LINE]);
// The same reading of a student who really SKIPPED Q6–Q8: nothing on the page is unplaced.
const FIRST_SKIPPED = REPLY(INV([5, Q5_LINE]), R(5, Q5_WORK), NF(6), NF(7), NF(8));
const marksOf = (body) => body.results.map((r) => (r.couldNotRead ? 'nf' : r.marksAwarded));

/* ══ §L1 · when it runs ══════════════════════════════════════════════════════ */

test('§L1.1 a one-document paper with questions not found makes ONE second look, for those questions only', async () => {
  const h = harness({ replies: [FIRST, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK), NF(6), NF(7))] });
  const body = (await h.sheet(sheet({ acceptsV2: true }))).body;
  assert.equal(h.calls.length, 2, 'first reading + one second look');
  const p = h.prompt(1);
  assert.ok(p.includes('SECOND LOOK'), 'the second call is the second look');
  assert.ok(p.includes('DIFFERENT ORDER') && p.includes('their OWN way'), 'it names out-of-order and own-numbered answers');
  assert.ok(/This request marks ONLY the 3 questions listed below \(Q6, Q7, Q8\)/.test(p), 'only the missing questions are asked for');
  assert.ok(!/ {2}Q5\. \[/.test(p), 'Q5 (graded) is not re-asked');
  assert.ok(p.includes('<<<ALREADY MATCHED ANSWER testnonce>>>\n' + Q5_LINE), 'Q5\'s answer is fenced as already matched');
  assert.ok(p.includes('<<<UNMATCHED ANSWER testnonce>>>\n1) ' + Q8_LINE), 'the unplaced answer is shown, fenced');
  assert.ok(!h.prompt(0).includes('SECOND LOOK'), 'CONTROL: the first reading carries no second-look text');
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 3], 'Q8 rescued (3/3); Q6/Q7 still honestly not found; Q5 untouched');
});

test('§L1.2 CONTROL: nothing missing → no second look (cost and time unchanged)', async () => {
  const all = REPLY(INV([5, Q5_LINE], [6, Q6_LINE], [8, Q8_LINE], [7, '']), R(5, Q5_WORK), R(6, Q6_WORK), R(7, [S('', { status: 'unattempted', marksAwarded: 0 })]), R(8, Q8_WORK));
  const h = harness({ replies: [all] });
  const body = (await h.sheet(sheet())).body;
  assert.equal(h.calls.length, 1);
  assert.equal(body.results[2].marksAwarded, 0, 'a blank the student really left is never second-looked');
});

test('§L1.2b G0 (cost): questions the student simply SKIPPED (nothing unplaced on the page) → no second look', async () => {
  const h = harness({ replies: [FIRST_SKIPPED, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK))] });
  const body = (await h.sheet(sheet())).body;
  assert.equal(h.calls.length, 1, 'a skipped question costs no extra call');
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 'nf']);
  // an "unplaced" line that is really part of the graded Q5 answer is not an open answer either
  const h2 = harness({ replies: [UNPLACED(FIRST_SKIPPED, [Q5_LINE, '  ']), REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK))] });
  await h2.sheet(sheet());
  assert.equal(h2.calls.length, 1);
});

test('§L1.3 CONTROL: typed answers and per-question photos have no page inventory → never a second look', async () => {
  const typed = harness({ replies: [REPLY(null, R(5, Q5_WORK))] });
  await typed.sheet({ worksheetId: 'ws', subject: 'Maths', questions: [{ ...PAPER()[0], textAnswer: 'tan θ + cot θ = 4√3/3 …' }] });
  assert.equal(typed.calls.length, 1);
  const photos = harness({ replies: [REPLY(null, R(5, Q5_WORK), NF(6))] });
  await photos.sheet({ worksheetId: 'ws', subject: 'Maths', questions: PAPER().slice(0, 2), uploads: [{ qNumber: 5, imageBase64: 'UA==', imageMimeType: 'image/jpeg' }, { qNumber: 6, imageBase64: 'UA==', imageMimeType: 'image/jpeg' }] });
  assert.equal(photos.calls.length, 1);
});

/* ══ §L2 · what it may rescue ═════════════════════════════════════════════════ */

test('§L2.1 "no working attached" (listed, empty work — the 25 Nov demo Q8) is second-looked and rescued', async () => {
  const first = REPLY(INV([5, Q5_LINE], [8, Q8_LINE]), R(5, Q5_WORK), NF(6), NF(7), R(8, [S('', { status: 'unattempted', marksAwarded: 0 })]));
  const h = harness({ replies: [first, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK), NF(6), NF(7))] });
  const body = (await h.sheet(sheet())).body;
  assert.equal(h.calls.length, 2);
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 3]);
});

test('§L2.2 answers in any order: Q8 and Q6 both found on the second look, each by its own content', async () => {
  const look = REPLY(INV([8, Q8_LINE], [6, Q6_LINE]), R(8, Q8_WORK), R(6, Q6_WORK), NF(7));
  const h = harness({ replies: [FIRST, look] });
  const body = (await h.sheet(sheet())).body;
  assert.deepEqual(marksOf(body), [1, 2, 'nf', 3]);
});

/* ══ §L3 · the guards ═════════════════════════════════════════════════════════ */

test('§L3.1 G4: an answer the first reading already graded for Q5 can NEVER be re-used for Q6', async () => {
  const look = REPLY(INV([6, Q5_LINE]), R(6, [S(Q5_LINE), S('tan²θ + cot²θ = 10/3')]), NF(7), NF(8));
  const body = (await harness({ replies: [FIRST, look] }).sheet(sheet())).body;
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 'nf'], 'Q6 keeps "not found" — never Q5\'s marks twice');
});

test('§L3.2 G3: work the model says does not address the question is not rescued', async () => {
  const look = REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK, { addressesQuestion: 'no', mismatchEvidence: { question: 'sin A = 3/5', work: 'sides' } }), NF(6), NF(7));
  const body = (await harness({ replies: [FIRST, look] }).sheet(sheet())).body;
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 'nf']);
});

test('§L3.3 G2: a second-look answer whose quoted first line is not in its own work is not rescued (strict)', async () => {
  const look = REPLY(INV([8, 'Mendel crossed tall pea plants']), R(8, Q8_WORK), NF(6), NF(7));
  const body = (await harness({ replies: [FIRST, look] }).sheet(sheet())).body;
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 'nf']);
  // CONTROL: the same reply with its true first line is rescued
  const ok = REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK), NF(6), NF(7));
  assert.deepEqual(marksOf((await harness({ replies: [FIRST, ok] }).sheet(sheet())).body), [1, 'nf', 'nf', 3]);
});

test('§L3.4 G4: two missing questions quoting the SAME answer are both kept as not found', async () => {
  const look = REPLY(INV([6, Q8_LINE], [8, Q8_LINE]), R(6, Q8_WORK), R(8, Q8_WORK), NF(7));
  const body = (await harness({ replies: [FIRST, look] }).sheet(sheet())).body;
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 'nf']);
});

test('§L3.5 G2: a second look with no inventory at all, or a couldNotRead, changes nothing', async () => {
  const noInv = { results: [R(8, Q8_WORK)], summary: 's' };
  assert.deepEqual(marksOf((await harness({ replies: [FIRST, noInv] }).sheet(sheet())).body), [1, 'nf', 'nf', 'nf']);
  const err = harness({ replies: [FIRST, new Error('HTTP 500')] });
  assert.deepEqual(marksOf((await err.sheet(sheet())).body), [1, 'nf', 'nf', 'nf'], 'a failed second look keeps the first reading');
});

test('§L3.6 G5: a printed number that repeats in the paper is never second-looked', () => {
  const qs = [{ qNumber: 1 }, { qNumber: 1 }, { qNumber: 2 }];
  const res = [1, 2, 3].map(() => { const o = {}; Object.defineProperty(o, '_reason', { value: 'notInInventory' }); return o; });
  assert.deepEqual(L.missedIndices(qs, res), [2]);
});

/* ══ §L4 · time, switch, telemetry ═════════════════════════════════════════════ */

test('§L4.1 the kill switch GRADING_SECOND_LOOK_DISABLED=1 restores the first reading exactly', async () => {
  const old = process.env.GRADING_SECOND_LOOK_DISABLED;
  process.env.GRADING_SECOND_LOOK_DISABLED = '1';
  try {
    const h = harness({ replies: [FIRST, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK))] });
    const body = (await h.sheet(sheet())).body;
    assert.equal(h.calls.length, 1);
    assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 'nf']);
  } finally {
    if (old === undefined) delete process.env.GRADING_SECOND_LOOK_DISABLED; else process.env.GRADING_SECOND_LOOK_DISABLED = old;
  }
});

test('§L4.2 too little time left → no second look; its own call is capped', async () => {
  const h = harness({ replies: [FIRST, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK))], deps: { gradingTimingOverride: { deadlineMs: 15000 } } });
  const body = (await h.sheet(sheet())).body;
  assert.equal(h.calls.length, 1, 'under SECOND_LOOK_MIN_MS left, the first reading stands');
  assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 'nf']);
  const h2 = harness({ replies: [FIRST, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK))] });
  await h2.sheet(sheet());
  assert.ok(h2.calls[1].genConfig.timeoutMs <= L.SECOND_LOOK_MAX_MS, 'the second look never waits longer than its cap');
});

test('§L4.3 the [grade-timing] line records asked / rescued, and outcomes AFTER the rescue', () => {
  const sink = gt.createTimingSink();
  sink.secondLook = { asked: 3, rescued: 1, skipped: 0, note: 'Q8 text' };
  const line = gt.formatGradeTimingLine({ route: '/api/grade-worksheet', mode: 'job', surface: 'check-improve', preMs: null, sink, totalMs: 1 });
  const rec = JSON.parse(line.slice('[grade-timing] '.length));
  assert.deepEqual(rec.secondLook, { asked: 3, rescued: 1, skipped: 0, failed: 0, reassigned: 0 });
});

test('§L4.4 every one-document surface reaches it: the same paper through each surface header', async () => {
  for (const surface of ['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']) {
    const h = harness({ replies: [FIRST, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK), NF(6), NF(7))] });
    const body = (await h.sheet(sheet({ headers: { 'x-lazytopper-surface': surface } }))).body;
    assert.equal(h.calls.length, 2, surface);
    assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 3], surface);
  }
});

test('§L2.3 the student\'s OWN numbering collides with the paper\'s (answer to Q3 labelled "1)"): the label-matched answer is an answer MISMATCH, and the second look re-matches both by content', async () => {
  const qs = [
    { qNumber: 1, marks: 2, topic: 'Polynomials', questionText: 'Find the zeroes of the quadratic polynomial x² − 5x + 6.', textAnswer: '' },
    { qNumber: 3, marks: 3, topic: 'Arithmetic Progressions', questionText: 'Find the 10th term of the AP 2, 7, 12, …', textAnswer: '' },
  ];
  const AP1 = '1) a = 2, d = 7 − 2 = 5';
  const ZE1 = '2) x² − 5x + 6 = (x − 2)(x − 3)';
  const apWork = [S(AP1), S('a10 = 2 + 9 × 5 = 47', { marksAwarded: 2 })];
  const zeWork = [S(ZE1), S('Zeroes are 2 and 3.')];
  const first = UNPLACED(REPLY(INV([1, AP1]),
    R(1, [S(AP1, { status: 'incorrect', marksAwarded: 0, marksDeducted: 1 })], { addressesQuestion: 'no', mismatchEvidence: { question: 'zeroes of the quadratic polynomial', work: 'd = 7 − 2 = 5' } }),
    NF(3)), [ZE1]);
  const look = REPLY(INV([1, ZE1], [3, AP1]), R(1, zeWork), R(3, apWork));
  const h = harness({ replies: [first, look] });
  const body = (await h.sheet({ worksheetId: 'ws', subject: 'Maths', questions: qs, ...DOC, acceptsV2: true })).body;
  assert.equal(h.calls.length, 2);
  assert.deepEqual(marksOf(body), [2, 3], 'both correct answers are marked under their own questions');
  // CONTROL: with the second look off, the first reading stands — Q1 zeroed as "does not address", Q3 not found
  const old = process.env.GRADING_SECOND_LOOK_DISABLED;
  process.env.GRADING_SECOND_LOOK_DISABLED = '1';
  try {
    const off = (await harness({ replies: [first, look] }).sheet({ worksheetId: 'ws', subject: 'Maths', questions: qs, ...DOC, acceptsV2: true })).body;
    assert.deepEqual(marksOf(off), [0, 'nf']);
    assert.equal(off.results[0].answerMismatch, true);
  } finally {
    if (old === undefined) delete process.env.GRADING_SECOND_LOOK_DISABLED; else process.env.GRADING_SECOND_LOOK_DISABLED = old;
  }
});


/* ══ §L5 · independent review findings (25 Nov) — each with its control ═══════════════════════════════ */

test('§L5.1 (review #1) the SAME answer in LaTeX vs Unicode, or reordered, is the same writing; different answers are not', () => {
  assert.equal(L.sameWriting('α + β = 5/2, αβ = 3', '\\alpha + \\beta = \\frac{5}{2}, \\alpha\\beta = 3'), true);
  assert.equal(L.sameWriting('Let the number be x and its square', 'Let x be the number and its square'), true);
  assert.equal(L.sameWriting('x² − 5x + 6 = (x − 2)(x − 3)', 'a = 2, d = 7 − 2 = 5\na10 = 2 + 9 × 5 = 47'), false, 'CONTROL: different answers');
  assert.equal(L.sameWriting('Given:', 'Given: AB = 5 cm'), false, '(review #7) a short generic line can never prove "same"');
});

test('§L5.2 (review #1b) a rescue that GRADES another question\'s working is refused even with an unclaimed first line', () => {
  const claimedWork = Q5_WORK.map((x) => x.studentWork).join('\n');
  const res = { annotatedSteps: [S('scribble beside the margin note'), S(Q5_WORK[0].studentWork), S(Q5_WORK[1].studentWork)] };
  Object.defineProperty(res, '_reason', { value: 'graded' });
  const cand = [{ index: 1, raw: { addressesQuestion: 'yes' }, result: res, firstLines: ['scribble beside the margin note'] }];
  assert.deepEqual(L.acceptedRescues(cand, [claimedWork]), []);
  assert.deepEqual(L.acceptedRescues(cand, ['an unrelated answer about acids and bases']), [1], 'CONTROL: no claimed work reused');
});

test('§L5.3 (review #2) a label-matched extra line in the inventory does not make two real rescues clash', () => {
  const AP1 = '1) a = 2, d = 7 − 2 = 5';
  const ZE1 = '2) x² − 5x + 6 = (x − 2)(x − 3)';
  const mk = (steps) => { const r = { annotatedSteps: steps }; Object.defineProperty(r, '_reason', { value: 'graded' }); return r; };
  const q1 = { index: 0, raw: { addressesQuestion: 'yes' }, result: mk([S(ZE1), S('Zeroes are 2 and 3.')]), firstLines: [AP1, ZE1] };
  const q3 = { index: 1, raw: { addressesQuestion: 'yes' }, result: mk([S(AP1), S('a10 = 2 + 9 × 5 = 47')]), firstLines: [AP1] };
  assert.deepEqual(L.acceptedRescues([q1, q3], []), [0, 1]);
});

test('§L5.4 (review #3) the printed question is never an answer, nor an "unplaced" one', () => {
  const qt = 'Given sin A = 3/5, find the other trigonometric ratios of the angle A.';
  const mk = (steps) => { const r = { annotatedSteps: steps }; Object.defineProperty(r, '_reason', { value: 'graded' }); return r; };
  const cand = [{ index: 3, raw: { addressesQuestion: 'yes' }, result: mk([S(qt), S('cos A = 4/5')]), firstLines: [qt] }];
  assert.deepEqual(L.acceptedRescues(cand, [], [qt]), []);
  assert.deepEqual(L.openUnplaced([qt, Q8_LINE], [], [qt]), [Q8_LINE]);
});

test('§L5.5 (review #4) an objective rescue needs an anchor in its own work like any other', () => {
  const mk = (steps) => { const r = { annotatedSteps: steps }; Object.defineProperty(r, '_reason', { value: 'graded' }); return r; };
  const loose = [{ index: 0, raw: { addressesQuestion: 'yes' }, result: mk([S('(b)')]), firstLines: ['Ans (b) the value is 10/3'] }];
  assert.deepEqual(L.acceptedRescues(loose, []), [], 'its quoted line is not in its work');
  const tied = [{ index: 0, raw: { addressesQuestion: 'yes' }, result: mk([S('Ans (b) the value is 10/3')]), firstLines: ['Ans (b) the value is 10/3'] }];
  assert.deepEqual(L.acceptedRescues(tied, []), [0]);
});

test('§L5.6 (review #5) on the job path, a row the second look may change is never published as final', async () => {
  const rows = [];
  const route = require('../routes/checkSolution.cjs');
  const { createGradingCore } = require('./core.cjs');
  let n = 0;
  const core = createGradingCore({
    callGemini: async () => { n += 1; return { text: JSON.stringify(n === 1 ? FIRST : REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK), NF(6), NF(7))), raw: {} }; },
    GEMINI_MODEL: 'test-model', extractJsonObjectFromText: lenient, buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    makeFenceNonce: () => 'testnonce', telemetry: { increment: () => {} },
  });
  void route;
  const gt2 = require('./gradeTiming.cjs');
  const sink = gt2.createTimingSink();
  const out = await core.gradeSet({ questions: PAPER(), document: { imageBase64: 'UERG', imageMimeType: 'application/pdf' }, subject: 'Maths', acceptsV2: true,
    jobTiming: { wallMs: 180000, perCallMs: 120000, chunkQuestions: 8 }, onPartSettled: (r) => rows.push(...r), timingSink: sink });
  const finalOf = (i) => rows.filter((r) => r.index === i).map((r) => r.final);
  assert.deepEqual(finalOf(0), [true], 'Q5 graded first time: final at once');
  assert.deepEqual(finalOf(3), [false], 'Q8 not found yet: not final while a second look may rescue it');
  assert.equal(out.results[3].marksAwarded, 3, 'the finished paper carries the rescue');
  assert.deepEqual(sink.secondLook, { asked: 3, rescued: 1, skipped: 0, failed: 0, reassigned: 0 }, 'gradeSet fills the telemetry');
  assert.equal(sink.outcomes.graded, 2, 'outcomes are counted AFTER the rescue');
});

test('§L5.7 (eval 25 Nov) an answer under the WRONG number is still looking for its question: the not-found question is asked too', async () => {
  const qs = [
    { qNumber: 1, marks: 2, topic: 'Polynomials', questionText: 'Find the zeroes of the quadratic polynomial x² − 5x + 6.', textAnswer: '' },
    { qNumber: 5, marks: 3, topic: 'Real Numbers', questionText: 'Find the HCF and LCM of 96 and 404 by the prime factorisation method.', textAnswer: '' },
  ];
  const H1 = '1) 96 = 2^5 × 3, 404 = 2^2 × 101';
  const hcf = [S(H1), S('HCF = 4', { marksAwarded: 1 }), S('LCM = 9696')];
  // the student numbered Q5's answer "1)" and skipped Q1; nothing is "unplaced" — the line sits under Q1
  const first = REPLY(INV([1, H1]),
    R(1, [S(H1, { status: 'incorrect', marksAwarded: 0, marksDeducted: 2 })], { addressesQuestion: 'no', mismatchEvidence: { question: 'zeroes of the quadratic polynomial', work: '404 = 2^2 × 101' } }),
    NF(5));
  const look = REPLY(INV([5, H1]), NF(1), R(5, hcf));
  const h = harness({ replies: [first, look] });
  const body = (await h.sheet({ worksheetId: 'ws', subject: 'Maths', questions: qs, ...DOC, acceptsV2: true })).body;
  assert.equal(h.calls.length, 2);
  const p = h.prompt(1);
  assert.ok(p.includes('SECOND LOOK') && /  Q1\. \[/.test(p) && /  Q5\. \[/.test(p), 'both the mismatched Q1 and the not-found Q5 are looked for');
  assert.deepEqual(marksOf(body), ['nf', 3], 'Q5 gets its answer; Q1 (skipped) now reads "not found", not "does not address"');
  assert.notEqual(body.results[0].answerMismatch, true, 'no longer "does not address"');
});

test('§L5.8 (re-review A) SHORT working lines already credited to another question are not credited again', () => {
  const claimed = 'sin A = 3/5\ncos A = 4/5\ntan A = 3/4\nsec A = 5/4';
  const mk = (steps) => { const r = { annotatedSteps: steps }; Object.defineProperty(r, '_reason', { value: 'graded' }); return r; };
  const dup = [{ index: 5, raw: { addressesQuestion: 'yes' }, result: mk([S('rough: 3,4,5 triangle'), S('cos A = 4/5'), S('tan A = 3/4'), S('sec A = 5/4')]), firstLines: ['rough: 3,4,5 triangle'] }];
  assert.deepEqual(L.acceptedRescues(dup, [claimed]), []);
  const latex = [{ index: 5, raw: { addressesQuestion: 'yes' }, result: mk([S('rough: 3,4,5 triangle'), S('\\cos A = \\frac{4}{5}'), S('\\tan A = \\frac{3}{4}')]), firstLines: ['rough: 3,4,5 triangle'] }];
  assert.deepEqual(L.acceptedRescues(latex, [claimed]), []);
  // CONTROL: different short working is a real rescue
  const real = [{ index: 6, raw: { addressesQuestion: 'yes' }, result: mk([S('15 cot A = 8 so cot A = 8/15'), S('sin A = 15/17'), S('sec A = 17/8')]), firstLines: ['15 cot A = 8 so cot A = 8/15'] }];
  assert.deepEqual(L.acceptedRescues(real, [claimed]), [6]);
});

test('§L5.9 (re-review B) an answer that opens by restating the given is the student\'s own line, not the printed question', () => {
  const qt = 'Given sin A = 3/5, find the other trigonometric ratios of the angle A.';
  assert.equal(L.isPrintedQuestion('Given: sin A = 3/5', [qt]), false);
  assert.equal(L.isPrintedQuestion(qt, [qt]), true, 'CONTROL: the question copied out is still refused');
  assert.deepEqual(L.openUnplaced(['Given: sin A = 3/5'], [], [qt]), ['Given: sin A = 3/5']);
  const mk = (steps) => { const r = { annotatedSteps: steps }; Object.defineProperty(r, '_reason', { value: 'graded' }); return r; };
  const c = [{ index: 3, raw: { addressesQuestion: 'yes' }, result: mk([S('Given: sin A = 3/5'), S('base = 4k, cos A = 4/5')]), firstLines: [qt, 'Given: sin A = 3/5'] }];
  assert.deepEqual(L.acceptedRescues(c, [], [qt]), [3], 'a genuine anchor beside a printed-question line still rescues');
});

test('§L5.10 (live 25 Nov) after a rescue the paper summary is the second look\'s, never the first reading\'s "no marks" note', async () => {
  const first = { ...FIRST, summary: 'Answers 6 to 8 were not found, so they cannot be awarded marks.' };
  const look = { ...REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK), NF(6), NF(7)), summary: 'Good work on Q8 — label each answer with the paper\'s question number.' };
  const body = (await harness({ replies: [first, look] }).sheet(sheet())).body;
  assert.equal(body.results[3].marksAwarded, 3);
  assert.match(String(body.summary || body.overallSummary || ''), /label each answer/);
  // CONTROL: no rescue → the first reading's summary stands
  const none = (await harness({ replies: [{ ...FIRST_SKIPPED, summary: 'Keep going.' }] }).sheet(sheet())).body;
  assert.match(String(none.summary || none.overallSummary || ''), /Keep going/);
});
