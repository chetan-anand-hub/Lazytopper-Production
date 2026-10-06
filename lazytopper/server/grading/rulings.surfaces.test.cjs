'use strict';
// server/grading/rulings.surfaces.test.cjs — A17 OWNER RULINGS 1-5 (GRADING-JOBS-1 J0), proven on
// EVERY grading surface (the spec's product-wide rule).
//
// THE SURFACES. On the server every grading surface is one of two handlers; what differs is the
// REQUEST each client sends. Each surface below is driven with ITS OWN live request shape — the
// golden planner's job for that call site (eval/golden/shapes/callsites.json, P15: the fields each
// client sends, read from the client code), through the REAL handlers, with only the model stubbed:
//   /api/check-solution  : C&I single (+ the QR hand-off and the Tutor overlay, identical body),
//                          HPQ / SolutionChecker, the free check (single)
//   /api/grade-worksheet : C&I paper (ONE document), Quick Practice batch (typed + pick + photos),
//                          Chapter Test, Full Mock, Worksheets (bank fields + ONE PDF), free-check paper
// The free check sends the SAME body as C&I (only headers differ, and the handler never reads them),
// so its rows run the C&I bodies; what it charges is decided before the handler (services/freeCheck.cjs).
//
// Each surface's TARGET is its first subjective question (the request's own question; its text is
// replaced only where a ruling needs a particular kind of question — a quantity for units). The
// stubbed model answers every question; the target carries the scenario under test, every other
// question a plain correct grade.
//
// Run: node --test server/grading/rulings.surfaces.test.cjs (also loaded by core.test.cjs, so it
// runs in CI under test:server:grading-core).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const { chargeableCountOf } = require('./charge.cjs');
const R = require('./rules.cjs');
const ledgerLib = require('../services/usageLedger.cjs');
const { buildPlan } = require('../eval/golden/lib/planner.cjs');

const PLAN = Object.fromEntries(buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
// call site id → planner job (shapes/callsites.json `planJob`) — the free check reuses C&I's bodies.
const SURFACES = [
  { id: 'ci-single', job: 'S.CI.GS-M04-a' },
  { id: 'hpq-solution-checker', job: 'S.HPQ.GS-M12-a' },
  { id: 'free-check-single', job: 'S.CI.GS-M04-a' },
  { id: 'ci-multi', job: 'W.CIM.CMM' },
  { id: 'quick-practice-batch', job: 'W.QP.QPM' },
  { id: 'chapter-test', job: 'W.CT.CT1' },
  { id: 'full-mock', job: 'W.FM.FM1' },
  { id: 'worksheets', job: 'W.WS.WS1' },
  { id: 'free-check-paper', job: 'W.CIM.CMM' },
];
const VOL_Q = 'A solid toy is a hemisphere of radius 3.5 cm surmounted by a cone of height 12 cm. Find the volume of the toy.';
const CALL_USAGE = { model: 'gemini-2.5-flash', promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 };
const CALL_COST = ledgerLib.buildLedgerIncrement(CALL_USAGE, { env: {} }).increment.costMicroInr;

function lenientExtract(text) { try { return JSON.parse(text); } catch { return null; } }

/** The surface's request (a deep copy) and its target question. */
function surfaceRequest(s, mutateTarget) {
  const job = PLAN[s.job];
  assert.ok(job, 'planner job ' + s.job + ' for ' + s.id);
  const req = JSON.parse(JSON.stringify(job.request));
  const single = job.handler === 'handleCheckSolution';
  const subjective = (q) => !(q.objective === true) && !/^a$/i.test(String(q.section || '')) && !(Array.isArray(q.options) && q.options.length);
  const target = single ? null : (req.questions || []).find(subjective);
  if (!single) assert.ok(target, s.id + ': no subjective question in the request');
  const view = single
    ? { get marks() { return Number(req.marks) || 1; }, set questionText(t) { req.question = t; }, set textAnswer(t) { if ('textAnswer' in req) req.textAnswer = t; }, set finalAnswer(v) { if ('finalAnswer' in req) req.finalAnswer = v; }, qNumber: 1 }
    : target;
  if (mutateTarget) mutateTarget(view, req);
  return { req, single, targetQ: single ? 1 : target.qNumber, targetMarks: single ? Number(req.marks) || 1 : Number(target.marks) || 1, handler: job.handler };
}

/** One request through the real handler, inside a bound student request (for the meter). */
async function drive(s, { mutateTarget, targetSteps, otherSteps, acceptsV2 = false, uid = 'stu-a17' } = {}) {
  const { req, single, targetQ, targetMarks, handler } = surfaceRequest(s, mutateTarget);
  if (acceptsV2) req.acceptsV2 = true;
  const writes = [];
  const ledger = ledgerLib.createUsageLedger({
    resolveFirestore: () => ({
      db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: (data) => { writes.push(data); return Promise.resolve(); } }) }) }) }) },
      FieldValue: { increment: (n) => n },
    }),
    telemetry: { increment() {} },
    env: {},
  });
  const calls = [];
  const resultFor = (n, marks) => {
    const steps = Number(n) === Number(targetQ) ? targetSteps(marks) : (otherSteps ? otherSteps(marks) : [{ description: 'Answer', studentWork: 'worked answer', status: 'correct', marksAwarded: marks, marksDeducted: 0, teacherAnnotation: '✓ Correct.', mistakeType: null }]);
    return { qNumber: Number(n), couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: steps, finalAnswerCorrect: true, teacherNote: 'Note.' };
  };
  const marksOf = (n) => (single ? targetMarks : Number((req.questions.find((q) => Number(q.qNumber) === Number(n)) || {}).marks) || 1);
  let captured = null;
  const route = createCheckSolutionRoute({
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (r) => r,
    callGemini: async (model, contents, genConfig) => {
      calls.push({ model, genConfig, prompt: contents[0].parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('') });
      ledger.recordUsage(CALL_USAGE); // what geminiClient does after every successful call
      const nums = single ? [1] : req.questions.map((q) => q.qNumber);
      return { text: JSON.stringify({ results: nums.map((n) => resultFor(n, marksOf(n))), summary: 'S.' }), raw: {} };
    },
    GEMINI_MODEL: 'test-model',
    ACTIVE_PROVIDER: 'test',
    isStubMode: () => false,
    extractJsonObjectFromText: lenientExtract,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }),
    validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce',
    telemetry: { increment() {} },
  });
  const res = { setHeader() {} };
  const reqPath = single ? '/api/check-solution' : '/api/grade-worksheet';
  await ledgerLib.runWithRequestContext(async () => {
    ledgerLib.bindRequestUid(uid, reqPath);
    await route[handler](req, res);
  });
  await new Promise((r) => setImmediate(r));
  const body = captured && captured.body;
  const result = single ? body : body.results.find((r) => Number(r.qNumber) === Number(targetQ));
  const costWritten = writes.reduce((a, w) => a + (Number(w.costMicroInr) || 0), 0);
  return { body, result, res, calls, writes, costWritten, single, targetQ, targetMarks, total: single ? 1 : req.questions.length };
}

// A bank question's stored final answer is compared on its own (verify.cjs compareFinalAnswer) and can cap
// the mark independently of units; the unit tests take it out of play (the field stays, null).
const noKey = (q) => { if (Object.getOwnPropertyDescriptor(q, 'finalAnswer') || 'finalAnswer' in q) q.finalAnswer = null; };

const unitSteps = (marks) => [
  { description: 'Formula and substitution', studentWork: 'V = (2/3)πr³ + (1/3)πr²h', status: 'correct', marksAwarded: marks - 1, marksDeducted: 0, teacherAnnotation: '✓ Correct.', mistakeType: null },
  { description: 'Final answer', studentWork: '= 243.83', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation',
    teacherAnnotation: '½ Correct value, but missing cubic units (cm³).', correctedWorking: '243.83 cm³' },
];
const dontKnowSteps = (marks) => [
  // the model's typical wrong report of a "Don't know": an incorrect, TYPED step
  { description: 'Answer', studentWork: "Don't know", status: 'incorrect', marksAwarded: 0, marksDeducted: marks, teacherAnnotation: '× No method shown.', mistakeType: 'conceptual' },
];
const hinglishSteps = (marks) => [
  { description: 'Working', studentWork: 'Ye answer sahi hai kyunki ...', status: 'correct', marksAwarded: marks - 1, marksDeducted: 0, teacherAnnotation: '✓ Correct.', mistakeType: null },
  { description: 'Conclusion', studentWork: 'isliye answer yahi hai', status: 'partial', marksAvailable: 1, marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: 'presentation',
    teacherAnnotation: '½ Correct content, but the answer is code-mixed and colloquially written.' },
];
const termSteps = (marks) => [
  { description: 'Working', studentWork: 'Food goes down the food pipe by peristalsis', status: 'partial', marksAvailable: marks, marksAwarded: marks - 0.5, marksDeducted: 0.5, mistakeType: 'presentation',
    teacherAnnotation: '½ Correct idea, but the exact technical term is oesophagus, not food pipe (written in Hinglish).' },
];

for (const s of SURFACES) {
  test('A17 ruling 1 (units) — ' + s.id + ': a missing unit on the final answer costs EXACTLY ½, typed presentation, with the one fixed comment', async () => {
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: (q) => { q.questionText = VOL_Q; noKey(q); }, targetSteps: unitSteps, acceptsV2 });
      const out = r.result;
      assert.equal(out.marksAwarded, r.targetMarks - 0.5, s.id + ' v2=' + acceptsV2);
      const unitStep = out.annotatedSteps.find((st) => /write the unit/.test(st.teacherAnnotation));
      assert.ok(unitStep, s.id + ': the unit step');
      assert.equal(unitStep.teacherAnnotation, R.unitComment('cm³'));
      assert.equal(unitStep.teacherAnnotation, '−½: write the unit (cm³) with your final answer.');
      assert.deepEqual([unitStep.marksDeducted, unitStep.mistakeType], [0.5, 'presentation']);
      assert.equal(out.mistakeSummary.presentation, 1);
      if (acceptsV2) assert.equal(out.marksLostByType.presentation, 0.5);
    }
    // the rule is in the prompt this surface sends — Maths AND Science
    const p = (await drive(s, { targetSteps: unitSteps })).calls[0].prompt;
    assert.ok(p.includes('in MATHS AND IN SCIENCE ALIKE') && p.includes('NEVER for a PURE NUMBER'), s.id + ': the units rule reaches the prompt');
  });

  test('A17 ruling 1 (units) — ' + s.id + ': NEVER on a pure number (a probability): the deduction is given back', async () => {
    const r = await drive(s, { mutateTarget: (q) => { q.questionText = 'A die is thrown once. Find the probability of getting a prime number.'; noKey(q); }, targetSteps: unitSteps });
    assert.equal(r.result.marksAwarded, r.targetMarks, s.id);
    assert.ok(r.result.annotatedSteps.every((st) => st.mistakeType === null), s.id + ': no type left');
  });

  test('A17 ruling 2 ("Don\'t know") — ' + s.id + ': a SUBJECTIVE "Don\'t know" is NOT ATTEMPTED — 0, no mistake type, NOT charged, NOT metered', async () => {
    for (const acceptsV2 of [false, true]) {
      const r = await drive(s, { mutateTarget: (q) => { q.textAnswer = "Don't know"; }, targetSteps: dontKnowSteps, acceptsV2 });
      const out = r.result;
      assert.equal(out.marksAwarded, 0, s.id);
      assert.equal(out.teacherNote, R.NOT_ATTEMPTED_NOTE, s.id + ': the not-attempted note');
      assert.ok(out.annotatedSteps.every((st) => st.mistakeType === null), s.id + ': never a mistake type');
      assert.deepEqual(out.mistakeSummary, { conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 }, s.id + ': no MI entry implied');
      if (acceptsV2) {
        assert.equal(out.annotatedSteps[0].status, 'unattempted');
        assert.equal(out.marksLostByType.unattempted, r.targetMarks);
        if (!r.single) assert.equal(out.notGraded, null);
      }
      // trial / paper-pass charge = chargeableCountOf(res) (fairUse.cjs servedCommit): the DK is never in it
      assert.equal(chargeableCountOf(r.res), r.total - 1, s.id + ': charged only the graded questions');
    }
    // the premium meter: a request whose every question is "Don't know" writes NOTHING
    const all = await drive(s, { mutateTarget: (q) => { q.textAnswer = "Don't know"; }, targetSteps: dontKnowSteps, otherSteps: dontKnowSteps });
    assert.equal(chargeableCountOf(all.res), 0, s.id + ': nothing charged');
    assert.equal(all.writes.length, 0, s.id + ': nothing metered');
  });

  test('A17 ruling 3 (language) — ' + s.id + ': a mixed-language / colloquial deduction is given back; a TERMINOLOGY deduction stands', async () => {
    const r = await drive(s, { targetSteps: hinglishSteps });
    assert.equal(r.result.marksAwarded, r.targetMarks, s.id + ': no mark for the language');
    assert.equal(r.result.annotatedSteps[1].teacherAnnotation.endsWith(R.LANGUAGE_NOT_MARKED_ANNOTATION), true);
    const t = await drive(s, { targetSteps: termSteps });
    assert.equal(t.result.marksAwarded, t.targetMarks - 0.5, s.id + ': the exact CBSE term is still marked (CLAUDE.md §13)');
    const p = r.calls[0].prompt;
    assert.ok(p.includes('LANGUAGE IS NEVER MARKED') && p.includes('TERMINOLOGY STILL COUNTS'), s.id + ': the language rule reaches the prompt');
    assert.ok(!p.includes('NCERT-standard language'), s.id + ': the checklist never asks for "NCERT-standard language"');
  });

  test('A17 ruling 4 (immaterial miscopy) — ' + s.id + ': the "silly" definition itself carries the immaterial-miscopy exception in this surface\'s prompt', async () => {
    const p = (await drive(s, { targetSteps: unitSteps })).calls[0].prompt;
    const silly = p.slice(p.indexOf('"silly" = COPIED WRONGLY'), p.indexOf('"calculation" = PERFORMED WRONGLY'));
    assert.ok(silly.includes('IMMATERIAL') && silly.includes('NOT silly and NOT a mistake at all'), s.id + ': the definition agrees with case law 5');
  });

  test('A17 ruling 5 (premium meter) — ' + s.id + ': each call is metered by the CHARGEABLE share of the questions it graded', async () => {
    // all graded: every call metered in full
    const full = await drive(s, { targetSteps: (m) => [{ description: 'Answer', studentWork: 'right', status: 'correct', marksAwarded: m, marksDeducted: 0, teacherAnnotation: '✓', mistakeType: null }] });
    assert.equal(full.writes.length, full.calls.length, s.id + ': one write per call');
    assert.equal(full.costWritten, CALL_COST * full.calls.length, s.id + ': full cost');
    // the target "Don't know": its call is metered at (graded questions in that call) / (questions in that call)
    const dk = await drive(s, { mutateTarget: (q) => { q.textAnswer = "Don't know"; }, targetSteps: dontKnowSteps });
    let expected = 0;
    for (const c of dk.calls) {
      const ids = String(c.genConfig.chunkKey || '').split('+').filter(Boolean);
      const n = ids.length || 1;
      const targetIn = dk.single || ids.some((id) => Number(id.slice(1)) === dk.body.results.findIndex((x) => Number(x.qNumber) === Number(dk.targetQ)));
      expected += Math.round(CALL_COST * ((targetIn ? n - 1 : n) / n));
    }
    assert.equal(dk.costWritten, expected, s.id + ': the not-attempted share is never metered');
    assert.ok(dk.costWritten < full.costWritten, s.id + ': strictly less than a fully graded request');
  });
}

test('A17 ruling 5 — a chunk RETRY and a scheme-cache GENERATION follow the same rule (0 when their questions are not graded)', async () => {
  const writes = [];
  const ledger = ledgerLib.createUsageLedger({
    resolveFirestore: () => ({ db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: (d) => { writes.push(d); return Promise.resolve(); } }) }) }) }) }, FieldValue: { increment: (n) => n } }),
    telemetry: { increment() {} }, env: {},
  });
  let n = 0;
  const reply = (steps) => JSON.stringify({ results: [{ qNumber: 1, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: steps, teacherNote: 'N.' }] });
  const route = createCheckSolutionRoute({
    sendJson: () => {}, readJson: async (r) => r,
    callGemini: async () => { n += 1; ledger.recordUsage(CALL_USAGE); return { text: n === 1 ? 'not json' : reply(dontKnowSteps(3)), raw: {} }; },
    GEMINI_MODEL: 'test-model', ACTIVE_PROVIDER: 'test', isStubMode: () => false, extractJsonObjectFromText: lenientExtract,
    buildGeminiImagePart: ({ mimeType, base64 }) => ({ inlineData: { mimeType, data: base64 } }), validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce', telemetry: { increment() {} },
    solutionCache: { getOrCreateModelSolution: async () => { ledger.recordUsage(CALL_USAGE); return { schemeSteps: ['Factorise [1]', 'Solve [2]'] }; } },
  });
  const res = { setHeader() {} };
  await ledgerLib.runWithRequestContext(async () => {
    ledgerLib.bindRequestUid('stu-a17', '/api/check-solution');
    await route.handleCheckSolution({ question: 'Solve x^2 - 2x - 8 = 0.', marks: 3, subject: 'Maths', topic: 'Quadratic Equations', textAnswer: "Don't know" }, res);
  });
  await new Promise((r) => setImmediate(r));
  assert.equal(n, 2, 'a parse miss and its retry');
  assert.equal(chargeableCountOf(res), 0);
  assert.equal(writes.length, 0, 'the first attempt, the retry and the cache generation all record 0 for a not-attempted question');
});
