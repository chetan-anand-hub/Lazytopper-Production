'use strict';
// server/grading/secondLook.test.cjs — GRADE-SECOND-LOOK-1 (owner, 25 Nov 2026).
// Drives the REAL route adapters over the REAL core with a stubbed model (no network). Every rescue rule has
// a CONTROL that keeps the first reading. Sections:
//   §L1 when the second look runs (and when it never does)
//   §L2 what it may rescue: content-matched, out-of-order, own-numbered answers
//   §L3 the guards: an answer already used, "does not address", no first line, two questions one answer
//   §L4 time, kill switch, telemetry, every surface
// Run: node --test server/grading/secondLook.test.cjs   (from lazytopper/)

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

const Q5_LINE = 'tan θ + cot θ = 4√3/3';
const Q5_WORK = [S(Q5_LINE, { marksAwarded: 0.5 }), S('tan²θ + cot²θ = 16/3 − 2 = 10/3', { marksAwarded: 0.5 })];
const Q8_LINE = 'sin A = 3/5, sides 3, 4, 5';
const Q8_WORK = [S(Q8_LINE), S('cos A = 4/5, tan A = 3/4'), S('cosec A = 5/3, sec A = 5/4, cot A = 4/3')];
const Q6_LINE = '15 cot A = 8 so cot A = 8/15';
const Q6_WORK = [S(Q6_LINE), S('sin A = 15/17, sec A = 17/8')];
// First reading: only Q5 found (by its label 2) it could not match Q8's label 1) to Q8).
const FIRST = REPLY(INV([5, Q5_LINE]), R(5, Q5_WORK), NF(6), NF(7), NF(8));
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
  assert.deepEqual(rec.secondLook, { asked: 3, rescued: 1, skipped: 0 });
});

test('§L4.4 every one-document surface reaches it: the same paper through each surface header', async () => {
  for (const surface of ['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']) {
    const h = harness({ replies: [FIRST, REPLY(INV([8, Q8_LINE]), R(8, Q8_WORK), NF(6), NF(7))] });
    const body = (await h.sheet(sheet({ headers: { 'x-lazytopper-surface': surface } }))).body;
    assert.equal(h.calls.length, 2, surface);
    assert.deepEqual(marksOf(body), [1, 'nf', 'nf', 3], surface);
  }
});
