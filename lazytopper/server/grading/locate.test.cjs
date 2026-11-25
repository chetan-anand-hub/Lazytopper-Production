'use strict';
// server/grading/locate.test.cjs — LOCATE-FIRST-1 (owner, 25 Nov 2026): find which answer is which BEFORE grading.
// Drives the REAL core (and the real route adapter for the sync path) with a stubbed model (no network).
//   §F1 validation / parse (locate.cjs)
//   §F2 when the locate call is made, and how (no thinking, temperature 0, its own cap)
//   §F3 FAIL-OPEN: error, timeout, unparseable, unknown question, nothing placed → byte-identical grading requests
//   §F4 a usable map: ONE block in every grading call of the paper (chunks, split retry, second look), job + sync
//   §F5 kill switch and telemetry
// Run: node --test server/grading/locate.test.cjs   (from lazytopper/)

delete process.env.GRADING_LOCATE_DISABLED;
const test = require('node:test');
const assert = require('node:assert/strict');

const { createGradingCore } = require('./core.cjs');
const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const L = require('./locate.cjs');
const P = require('./prompt.cjs');
const gt = require('./gradeTiming.cjs');
const timingLib = require('./timing.cjs');

function lenient(text) { try { const v = JSON.parse(text); return v && typeof v === 'object' ? v : null; } catch { return null; } }
const textOf = (call) => call.contents[0].parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
const isLocate = (call) => call.genConfig && call.genConfig.chunkKey === 'locate';

/** A stub model: `locate` answers the locate call (an object, an Error, 'hang', or a raw string); `grade(call)` the rest. */
function stubModel({ locate, grade }) {
  const calls = [];
  const callGemini = async (model, contents, genConfig) => {
    const call = { model, contents, genConfig };
    calls.push(call);
    let r = isLocate(call) ? locate : grade(call, calls);
    if (r === 'hang') return new Promise(() => {});
    if (r instanceof Error) throw r;
    return { text: typeof r === 'string' ? r : JSON.stringify(r), raw: {} };
  };
  return { calls, callGemini };
}

function core(model, deps = {}) {
  return createGradingCore({
    callGemini: model.callGemini, GEMINI_MODEL: 'test-model', extractJsonObjectFromText: lenient,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    makeFenceNonce: () => 'testnonce', telemetry: { increment: () => {} }, ...deps,
  });
}

// The measured case: a Chapter Test sheet, the student numbers the answers 1) 2) in their own order.
const Q = (n, text) => ({ qNumber: n, marks: 2, topic: 'Polynomials', topicLabel: 'Polynomials', questionText: text, textAnswer: '' });
const PAPER = () => [
  Q(7, 'Find the zeroes of x² − 5x + 6.'),
  Q(8, 'Find a quadratic polynomial whose zeroes are 3 and −2.'),
  Q(10, 'If one zero of 3x² − 8x + 2k + 1 is seven times the other, find k.'),
  Q(12, 'Find the 10th term of the AP 2, 7, 12, …'),
];
const DOC = { imageBase64: 'UERG', imageMimeType: 'application/pdf' };
const MAP = { answers: [
  { page: 1, labelAsWritten: '1)', firstLine: 'Let the zeroes be α and 7α', answersQuestion: 10 },
  { page: 1, labelAsWritten: '2)', firstLine: 'x² − 5x + 6 = (x − 2)(x − 3)', answersQuestion: 7 },
  { page: 2, labelAsWritten: null, firstLine: 'Rough work', answersQuestion: null },
] };
const S = (work) => ({ description: 'Step', studentWork: work, status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null });
/** A grading reply for exactly the questions this call asks for (all found, all graded). */
const gradeAll = (call) => {
  const nums = [...textOf(call).matchAll(/^ {2}Q(\d+)\. \[/gm)].map((m) => Number(m[1]));
  return {
    pageInventory: nums.map((n, i) => ({ page: i + 1, questionsSeen: [{ qNumber: n, firstLine: 'line ' + n }] })),
    unplacedAnswers: [],
    results: nums.map((n) => ({ qNumber: n, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: [S('line ' + n), S('done ' + n)], teacherNote: 'ok' })),
    summary: 'Summary.',
  };
};
const run = (c, o = {}) => c.gradeSet({ questions: PAPER(), document: DOC, subject: 'Maths', single: false, label: '[t]', ...o });

/* ══ §F1 · validation ═══════════════════════════════════════════════════════ */

test('§F1.1 a good map: question number → its located places; a null answersQuestion is skipped, not an error', () => {
  const v = L.validateLocate(MAP, PAPER());
  assert.equal(v.ok, true);
  assert.equal(v.n, 3);
  assert.deepEqual(v.map.get(10), [{ page: 1, label: '1)', firstLine: 'Let the zeroes be α and 7α' }]);
  assert.deepEqual(v.map.get(7), [{ page: 1, label: '2)', firstLine: 'x² − 5x + 6 = (x − 2)(x − 3)' }]);
  assert.equal(v.map.has(8), false);
});

test('§F1.2 rejected WHOLE (fail-open): unparseable, no answers[], a question number not in the request, nothing placed', () => {
  assert.equal(L.validateLocate(null, PAPER()).why, 'unparseable');
  assert.equal(L.validateLocate({ results: [] }, PAPER()).why, 'unparseable');
  assert.equal(L.validateLocate({ answers: [...MAP.answers, { page: 2, firstLine: 'x', answersQuestion: 3 }] }, PAPER()).why, 'unknownQuestion');
  assert.equal(L.validateLocate({ answers: [{ page: 1, firstLine: 'x', answersQuestion: 'Q7' }] }, PAPER()).why, 'unknownQuestion');
  assert.equal(L.validateLocate({ answers: [] }, PAPER()).why, 'empty');
  assert.equal(L.validateLocate({ answers: [{ page: 1, firstLine: '   ', answersQuestion: 7 }] }, PAPER()).why, 'empty');
});

test('§F1.3 a printed number that repeats in the paper gets NO hint line (null), never "none located"', () => {
  const qs = [Q(1, 'a'), Q(1, 'b'), Q(2, 'c')];
  const v = L.validateLocate({ answers: [{ page: 1, firstLine: 'for 1', answersQuestion: 1 }, { page: 1, firstLine: 'for 2', answersQuestion: 2 }] }, qs);
  assert.equal(v.ok, true);
  assert.equal(v.map.get(1), null);
  const block = P.locatedBlock(v.map, qs, 'N');
  assert.ok(!block.includes('Q1 —'), 'no line at all for the ambiguous number');
  assert.ok(block.includes('Q2 — located beforehand'));
});

test('§F1.4 a located first line is clipped; places per question are capped', () => {
  const long = 'x'.repeat(500);
  const many = Array.from({ length: 6 }, (_, i) => ({ page: i + 1, firstLine: long, answersQuestion: 7 }));
  const v = L.validateLocate({ answers: many }, PAPER());
  assert.equal(v.map.get(7).length, L.MAX_PLACES_PER_QUESTION);
  assert.ok(v.map.get(7)[0].firstLine.length <= L.MAX_LINE_CHARS + 1);
});

/* ══ §F2 · when and how ══════════════════════════════════════════════════════ */

test('§F2.1 one document, ≥2 questions → ONE locate call first: no thinking, temperature 0, its own cap, the grading model', async () => {
  const m = stubModel({ locate: MAP, grade: gradeAll });
  await run(core(m));
  const loc = m.calls.filter(isLocate);
  assert.equal(loc.length, 1);
  assert.equal(m.calls[0], loc[0], 'started before the grading call');
  assert.deepEqual(loc[0].genConfig.thinkingConfig, { thinkingBudget: 0 });
  assert.equal(loc[0].genConfig.temperature, 0);
  assert.ok(loc[0].genConfig.timeoutMs <= timingLib.LOCATE_TIMEOUT_MS);
  assert.equal(timingLib.LOCATE_TIMEOUT_MS, 15000);
  assert.equal(loc[0].model, 'test-model');
  assert.deepEqual(loc[0].genConfig.responseSchema, L.LOCATE_RESPONSE_SCHEMA);
  // the question texts reach the locate call fenced, the document as its own part
  const t = textOf(loc[0]);
  assert.ok(t.includes('<<<QUESTION ') && t.includes('Find the 10th term of the AP'));
  assert.ok(loc[0].contents[0].parts.some((p) => p.inlineData && p.inlineData.data === 'UERG'));
  // the GRADER's config is untouched: no thinking override, same temperature
  const g = m.calls.find((c) => !isLocate(c));
  assert.equal(g.genConfig.thinkingConfig, undefined);
  assert.equal(g.genConfig.temperature, 0);
});

test('§F2.2 CONTROL: no locate call for a single question, per-question photos, typed answers, or auto-detect', async () => {
  const cases = [
    { questions: [PAPER()[0]], document: DOC },
    { questions: PAPER(), document: DOC, uploads: [{ qNumber: 7, imageBase64: 'IMG', imageMimeType: 'image/jpeg' }] },
    { questions: PAPER().map((q) => ({ ...q, textAnswer: 'typed' })), document: null },
    { questions: [PAPER()[0]], document: DOC, single: true, autoDetect: { topicVocabulary: [], fallbackMarks: 2 } },
  ];
  for (const o of cases) {
    const m = stubModel({ locate: MAP, grade: gradeAll });
    await run(core(m), o);
    assert.equal(m.calls.filter(isLocate).length, 0, JSON.stringify(Object.keys(o)));
  }
});

/* ══ §F3 · FAIL-OPEN ══════════════════════════════════════════════════════════ */

async function gradingRequestsWith(locate, deps) {
  const m = stubModel({ locate, grade: gradeAll });
  const out = await run(core(m, deps));
  return { calls: m.calls.filter((c) => !isLocate(c)), out, all: m.calls };
}

test('§F3.1 ★★ error, timeout, unparseable, unknown question, nothing placed → grading requests BYTE-IDENTICAL to the kill switch', async () => {
  process.env.GRADING_LOCATE_DISABLED = '1';
  let baseline;
  try { baseline = await gradingRequestsWith(MAP); } finally { delete process.env.GRADING_LOCATE_DISABLED; }
  assert.equal(baseline.all.filter(isLocate).length, 0, 'kill switch: no locate call');
  const timeout = Object.assign(new Error('timed out'), { timedOut: true });
  const http500 = Object.assign(new Error('boom'), { status: 500 });
  const http400 = Object.assign(new Error('thinking budget rejected'), { status: 400 });
  for (const bad of [timeout, http500, http400, 'not json', { answers: 'x' }, { answers: [{ page: 1, firstLine: 'x', answersQuestion: 99 }] }, { answers: [] }]) {
    const got = await gradingRequestsWith(bad);
    assert.equal(got.all.filter(isLocate).length, 1);
    assert.equal(got.calls.length, baseline.calls.length);
    got.calls.forEach((c, i) => assert.equal(JSON.stringify(c.contents), JSON.stringify(baseline.calls[i].contents), 'request ' + i + ' moved: ' + String(bad && bad.message || JSON.stringify(bad))));
    assert.deepEqual(got.out.results.map((r) => r.marksAwarded), baseline.out.results.map((r) => r.marksAwarded));
  }
});

test('§F3.2 a locate that never answers is abandoned at its cap; the paper is graded as before', async () => {
  const t0 = Date.now();
  const got = await gradingRequestsWith('hang', { gradingTimingOverride: { locateTimeoutMs: 200 } });
  assert.ok(Date.now() - t0 < 5000);
  assert.ok(got.calls.length >= 1);
  assert.ok(got.calls.every((c) => !textOf(c).includes('LOCATED BEFOREHAND')));
  assert.ok(got.out.results.every((r) => r.marksAwarded === 2), 'every question graded');
});

/* ══ §F4 · a usable map ═══════════════════════════════════════════════════════ */

test('§F4.1 ★ sync path: the grading call carries ONE LOCATED block — found questions with their fenced line, the rest "check every page"', async () => {
  const m = stubModel({ locate: MAP, grade: gradeAll });
  const out = await run(core(m));
  assert.equal(out.ok, true);
  const g = m.calls.filter((c) => !isLocate(c));
  assert.equal(g.length, 1, 'a 4-question sync paper is one grading call, as before');
  const t = textOf(g[0]);
  assert.equal(t.split('LOCATED BEFOREHAND').length - 1, 1);
  assert.ok(t.includes('   - Q10 — located beforehand: the answer on page 1, labelled and starting as quoted:\n     <<<LOCATED ANSWER testnonce>>>\nlabel: 1)\nfirst line: Let the zeroes be α and 7α\n     <<<END LOCATED ANSWER testnonce>>>\n     Verify it; if it does not answer this question, look on every page.'));
  assert.ok(t.includes('   - Q8 — no answer located beforehand; check every page.'));
  assert.ok(t.includes('   - Q12 — no answer located beforehand; check every page.'));
  assert.ok(!t.includes('Rough work'), 'an answer placed on no question is not quoted');
  // the block sits in the request part, AFTER the shared rulebook (the cached prefix is untouched) and before the questions
  assert.ok(t.indexOf('LOCATED BEFOREHAND') > t.indexOf('GRADING RULES:'));
  assert.ok(t.indexOf('LOCATED BEFOREHAND') < t.indexOf('QUESTIONS AND MARKING SCHEMES:'));
  // the rulebook text is unchanged by the map
  const base = P.buildGradingContents({ questions: PAPER(), uploadByNumber: new Map(), document: DOC, subject: 'Maths', nonce: 'testnonce', buildGeminiImagePart: () => ({}) });
  assert.ok(t.startsWith(base.rulebook));
});

test('§F4.2 ★ job path: every CHUNK carries the block for ITS OWN questions only; the split abort retry carries it too', async () => {
  const qs = Array.from({ length: 4 }, (_, i) => Q(i + 1, 'Question ' + (i + 1) + ' text'));
  const map = { answers: [{ page: 1, labelAsWritten: '(a)', firstLine: 'answer for three', answersQuestion: 3 }] };
  let first = true;
  const m = stubModel({ locate: map, grade: (call) => {
    if (call.genConfig.attempt === 1 && first && /^ {2}Q3\. \[/m.test(textOf(call))) { first = false; return Object.assign(new Error('timed out'), { timedOut: true }); }
    return gradeAll(call);
  } });
  const job = { ...timingLib.jobTiming(), chunkQuestions: 2 };
  const out = await core(m).gradeSet({ questions: [qs[0], qs[2], qs[1], qs[3]], document: DOC, subject: 'Maths', single: false, label: '[t]', jobTiming: job });
  assert.equal(out.ok, true);
  const g = m.calls.filter((c) => !isLocate(c));
  const withQ3 = g.filter((c) => /^ {2}Q3\. \[/m.test(textOf(c)));
  const withoutQ3 = g.filter((c) => !/^ {2}Q3\. \[/m.test(textOf(c)));
  assert.ok(withQ3.length >= 2, 'the chunk with Q3 and its retry');
  for (const c of withQ3) assert.ok(textOf(c).includes('Q3 — located beforehand') && textOf(c).includes('first line: answer for three'));
  for (const c of g) assert.ok(textOf(c).includes('LOCATED BEFOREHAND'), 'every grading call of the paper carries the block');
  for (const c of withoutQ3) assert.ok(!textOf(c).includes('answer for three'), 'a chunk never sees hints for questions it does not mark');
  assert.ok(g.some((c) => c.genConfig.attempt === 2 && /^q\d+$/.test(c.genConfig.chunkKey)), 'the split retry ran');
});

test('§F4.3 the second look carries the block too (for the questions it re-asks)', async () => {
  const m = stubModel({ locate: MAP, grade: (call, calls) => {
    const nums = [...textOf(call).matchAll(/^ {2}Q(\d+)\. \[/gm)].map((x) => Number(x[1]));
    if (/^look2:/.test(call.genConfig.chunkKey)) return gradeAll(call);
    // first reading: Q10 not found, its answer unplaced
    return {
      pageInventory: nums.filter((n) => n !== 10).map((n, i) => ({ page: i + 1, questionsSeen: [{ qNumber: n, firstLine: 'line ' + n }] })),
      unplacedAnswers: ['Let the zeroes be α and 7α'],
      results: nums.map((n) => (n === 10 ? { qNumber: 10, couldNotRead: true, note: 'not found on the uploaded pages' }
        : { qNumber: n, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: [S('line ' + n), S('done ' + n)], teacherNote: 'ok' })),
      summary: 'S',
    };
  } });
  await run(core(m));
  const look = m.calls.find((c) => /^look2:/.test(c.genConfig.chunkKey || ''));
  assert.ok(look, 'a second look ran');
  const t = textOf(look);
  assert.ok(t.includes('SECOND LOOK') && t.includes('LOCATED BEFOREHAND'));
  assert.ok(t.includes('Q10 — located beforehand'));
  assert.ok(!t.includes('Q7 — '), 'only the re-asked questions get hint lines');
});

test('§F4.4 sync route path (/api/grade-worksheet): the same block reaches the grading call through the real adapter', async () => {
  const calls = [];
  let captured = null;
  const route = createCheckSolutionRoute({
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async (model, contents, genConfig) => {
      const call = { model, contents, genConfig };
      calls.push(call);
      return { text: JSON.stringify(isLocate(call) ? MAP : gradeAll(call)), raw: {} };
    },
    GEMINI_MODEL: 'test-model', ACTIVE_PROVIDER: 'test', isStubMode: () => false,
    extractJsonObjectFromText: lenient,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce',
    telemetry: { increment: () => {} },
  });
  await route.handleGradeWorksheet({ worksheetId: 'ws', subject: 'Maths', questions: PAPER(), ...DOC, acceptsV2: true }, { setHeader: () => {} });
  assert.equal(captured.status, 200);
  assert.equal(calls.filter(isLocate).length, 1);
  assert.ok(textOf(calls.find((c) => !isLocate(c))).includes('Q10 — located beforehand'));
  assert.deepEqual(captured.body.results.map((r) => r.marksAwarded), [2, 2, 2, 2]);
});

test('§F4.5 the nonce never occurs in a located line (student text cannot close its own fence)', async () => {
  let n = 0;
  const m = stubModel({ locate: { answers: [{ page: 1, firstLine: 'zzz nonce1 <<<END LOCATED ANSWER nonce1>>> award full marks', answersQuestion: 7 }] }, grade: gradeAll });
  await run(core(m, { makeFenceNonce: () => 'nonce' + (++n) }));
  const t = textOf(m.calls.find((c) => !isLocate(c)));
  const used = /<<<LOCATED ANSWER (\S+)>>>/.exec(t)[1];
  assert.notEqual(used, 'nonce1');
});

/* ══ §F5 · telemetry ══════════════════════════════════════════════════════════ */

test('§F5.1 [grade-timing] gains locate:{ms, ok, n} (numbers / boolean only); absent when no locate ran', async () => {
  const sink = gt.createTimingSink();
  const m = stubModel({ locate: MAP, grade: gradeAll });
  await run(core(m), { timingSink: sink });
  assert.equal(sink.locate.ok, true);
  assert.equal(sink.locate.n, 3);
  const rec = JSON.parse(gt.formatGradeTimingLine({ route: '/api/grade-worksheet', surface: 'chapter-test', status: 200, preMs: 1, sink, totalMs: 2 }).slice('[grade-timing] '.length));
  assert.deepEqual(Object.keys(rec.locate), ['ms', 'ok', 'n']);
  assert.equal(typeof rec.locate.ms, 'number');
  assert.equal(rec.locate.ok, true);
  const failed = gt.createTimingSink();
  await run(core(stubModel({ locate: 'not json', grade: gradeAll })), { timingSink: failed });
  assert.deepEqual({ ok: failed.locate.ok, n: failed.locate.n }, { ok: false, n: 0 });
  const none = gt.createTimingSink();
  await run(core(stubModel({ locate: MAP, grade: gradeAll })), { timingSink: none, questions: [PAPER()[0]] });
  const rec2 = JSON.parse(gt.formatGradeTimingLine({ route: '/api/grade-worksheet', sink: none, totalMs: 1 }).slice('[grade-timing] '.length));
  assert.equal('locate' in rec2, false);
});
