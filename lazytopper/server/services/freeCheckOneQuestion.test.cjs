// FREECHECK-ONEQ-1 - a signed-out FREE CHECK on /api/grade-worksheet grades ONE question.
//
// Pins: the truncation (3 -> 1 + the freeCheckGradedOf field), the kill switch (3 -> 3, byte-identical), a
// signed-in / non-admitted request (never reaches the service, so unchanged), a single-question body, the
// first-in-the-body's-own-order rule, and the wiring in index.cjs (admitted + grade-worksheet ONLY, so
// /api/check-solution and every signed-in path are untouched). The handler is the REAL route module with a
// stubbed model, so "1 graded" is proven by what the grader was actually shown, not by the array alone.
//
// MUTATION (applied, seen red, reverted - see the PR): delete the `payload.questions = [...]` line in
// truncatePayload() and the "grades ONLY the first" and "freeCheckGradedOf" tests go red.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const oneq = require('./freeCheckOneQuestion.cjs');
const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');

const THREE = () => ([
  { qNumber: 1, marks: 2, questionText: 'FIRST-QUESTION-TEXT' },
  { qNumber: 2, marks: 3, questionText: 'SECOND-QUESTION-TEXT' },
  { qNumber: 3, marks: 1, questionText: 'THIRD-QUESTION-TEXT' },
]);
const REQ = (questions) => ({ worksheetId: 'ws1', imageBase64: 'BASE64', imageMimeType: 'application/pdf', subject: 'Maths', questions });
const WS_GOOD = { results: [{ qNumber: 1, annotatedSteps: [{ description: 'step', studentWork: 'w', status: 'correct', marksAwarded: 1 }] }], summary: 'ok' };

function route() {
  const calls = [];
  let captured = null;
  const r = createCheckSolutionRoute({
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (req) => req, // the SAME object the service mutates, exactly as the cached pre-read hands it on
    callGemini: async (model, contents) => { calls.push(contents); return { text: JSON.stringify(WS_GOOD), raw: {} }; },
    GEMINI_MODEL: 'test-model', ACTIVE_PROVIDER: 'test', isStubMode: () => false,
    extractJsonObjectFromText: (t) => { try { return JSON.parse(t); } catch { return null; } },
    buildGeminiImagePart: () => ({ inlineData: {} }), validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'testnonce',
  });
  const promptText = () => calls.flatMap((c) => c[0].parts).filter((p) => typeof p.text === 'string').map((p) => p.text).join('');
  return { handle: r.handleGradeWorksheet, body: () => captured.body, promptText };
}

test('admitted free check, 3 questions: the grader is shown ONLY the first, and the body says 1 of 3', async () => {
  const h = route();
  const req = REQ(THREE());
  assert.equal(await oneq.apply(req, async (r) => r, {}), true);
  await h.handle(req, {});
  const text = h.promptText();
  assert.match(text, /FIRST-QUESTION-TEXT/);
  assert.doesNotMatch(text, /SECOND-QUESTION-TEXT/);
  assert.doesNotMatch(text, /THIRD-QUESTION-TEXT/);
  assert.equal(h.body().ok, true);
  assert.deepEqual(h.body().freeCheckGradedOf, { graded: 1, total: 3 });
  assert.equal(h.body().totalQuestions, 1);
});

test('kill switch FREE_CHECK_ONE_QUESTION_DISABLED=1: all 3 reach the grader and the body is byte-identical to today', async () => {
  const off = route();
  const reqOff = REQ(THREE());
  assert.equal(await oneq.apply(reqOff, async (r) => r, { FREE_CHECK_ONE_QUESTION_DISABLED: '1' }), false);
  await off.handle(reqOff, {});
  assert.match(off.promptText(), /SECOND-QUESTION-TEXT/);
  assert.match(off.promptText(), /THIRD-QUESTION-TEXT/);
  assert.equal('freeCheckGradedOf' in off.body(), false);
  const never = route(); // a request the service never touched = "today"
  await never.handle(REQ(THREE()), {});
  assert.equal(JSON.stringify(off.body()), JSON.stringify(never.body()));
});

test('a non-admitted / signed-in request never reaches the service: 3 questions grade as before, no field', async () => {
  const h = route();
  await h.handle(REQ(THREE()), {});
  assert.match(h.promptText(), /THIRD-QUESTION-TEXT/);
  assert.equal('freeCheckGradedOf' in h.body(), false);
});

test('a one-question body is left alone (no field)', async () => {
  const h = route();
  const req = REQ([THREE()[0]]);
  assert.equal(await oneq.apply(req, async (r) => r, {}), false);
  await h.handle(req, {});
  assert.equal('freeCheckGradedOf' in h.body(), false);
});

test('"first" is the first question in the body\'s own order that the handler would keep', () => {
  const p = REQ([{ qNumber: 0, questionText: 'dropped' }, { qNumber: 7, marks: 1, questionText: 'KEPT' }, { qNumber: 2, marks: 1, questionText: 'later' }]);
  assert.equal(oneq.truncatePayload(p, {}), true);
  assert.deepEqual(p.questions.map((q) => q.qNumber), [7]);
  assert.deepEqual(oneq.fieldFor(p), { freeCheckGradedOf: { graded: 1, total: 3 } });
  const reordered = REQ([{ qNumber: 5, marks: 1, questionText: 'five' }, { qNumber: 1, marks: 1, questionText: 'one' }]);
  oneq.truncatePayload(reordered, {});
  assert.deepEqual(reordered.questions.map((q) => q.qNumber), [5]); // body order, not numeric order
});

test('a body that cannot be read is left to the handler (no throw, no truncation)', async () => {
  assert.equal(await oneq.apply({}, async () => { throw new Error('bad json'); }, {}), false);
  assert.equal(await oneq.apply({}, async () => null, {}), false);
  assert.deepEqual(oneq.fieldFor(null), {});
});

test('kill-switch grammar matches the other flags (1 / true / on / yes); unset and 0 leave it ON', () => {
  for (const v of ['1', 'true', 'ON', 'yes']) assert.equal(oneq.isDisabled({ FREE_CHECK_ONE_QUESTION_DISABLED: v }), true);
  for (const v of [undefined, '', '0', 'false']) assert.equal(oneq.isDisabled({ FREE_CHECK_ONE_QUESTION_DISABLED: v }), false);
});

test('index.cjs wiring: ONLY an admitted free check on /api/grade-worksheet, after the gates; check-solution is not touched', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');
  const lines = src.split('\n').filter((l) => l.includes('freeCheckOneQuestion.apply('));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /freeCheckAdmitted && reqPath === '\/api\/grade-worksheet'/);
  assert.doesNotMatch(src, /check-solution'[^\n]*freeCheckOneQuestion/);
  // After fair use (the last gate) and before the route dispatch.
  assert.ok(src.indexOf('fairUse.applyToRequest(req, res, reqPath, verifiedUid, { freeCheck: freeCheckAdmitted })') < src.indexOf('freeCheckOneQuestion.apply('));
  assert.ok(src.indexOf('freeCheckOneQuestion.apply(') < src.indexOf("questionRoutes.handleGradeWorksheet(req, res)"));
});
