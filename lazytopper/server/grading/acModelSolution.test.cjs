'use strict';
// AC-SOLUTION-1 — the complete correct solution is DISPLAY ONLY. Run: node --test server/grading/acModelSolution.test.cjs
process.env.GRADING_LOCATE_DISABLED = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const stepSolution = require('../routes/stepSolution.cjs');
const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const { extractJsonObjectFromText } = require('../services/httpUtils.cjs');

const FIELDS = { question: 'Find the roots of x^2 - 5x + 6 = 0.', marks: 3, subject: 'Maths', topic: 'Quadratic Equations', qType: 'short', section: 'C', isObjective: false };
const SOLUTION = { totalMarks: 3, steps: [
  { stepNumber: 1, description: 'Formula', working: 'x^2-5x+6=0', marks: 1 },
  { stepNumber: 2, description: 'Factorise', working: '(x-2)(x-3)=0', marks: 1 },
  { stepNumber: 3, description: 'Roots', working: 'x=2,3', marks: 1 },
  { stepNumber: 4, description: 'Teaching aside', working: 'a zero-mark remark', marks: 0 }], commonMistakes: [], examTip: 'x' };
const EXPECTED = [
  { description: 'Formula', working: 'x^2-5x+6=0', marks: 1 },
  { description: 'Factorise', working: '(x-2)(x-3)=0', marks: 1 },
  { description: 'Roots', working: 'x=2,3', marks: 1 },
];

function deps() {
  return { GEMINI_MODEL: 'm', ACTIVE_PROVIDER: 'test', extractJsonObjectFromText, telemetry: { increment() {} },
    callGemini: async () => ({ text: JSON.stringify({ ...SOLUTION, steps: SOLUTION.steps.slice(0, 3) }), finishReason: 'STOP' }) };
}

test('solutionSteps come back from a fresh generation (marks > 0 only) and from the cache, identical to schemeSteps', async () => {
  let stored = null;
  stepSolution.__setPoolForTests({ query: async (sql, params) => {
    if (/^SELECT/i.test(sql)) return { rows: stored ? [stored] : [] };
    if (/^INSERT/i.test(sql)) { stored = { solution_json: SOLUTION }; return { rows: [] }; }
    return { rows: [] };
  } });
  try {
    const fresh = await stepSolution.getOrCreateModelSolution(FIELDS, deps());
    assert.deepEqual(fresh.solutionSteps, EXPECTED);
    assert.equal(fresh.schemeSteps.length, EXPECTED.length, 'the prompt strings are unchanged in count');
    assert.equal(fresh.fromCache, false);
    const cached = await stepSolution.getOrCreateModelSolution(FIELDS, deps());
    assert.equal(cached.fromCache, true);
    assert.deepEqual(cached.solutionSteps, EXPECTED);
    assert.deepEqual(cached.schemeSteps, fresh.schemeSteps);
  } finally { stepSolution.__setPoolForTests(null); }
});

/* ── the grade is identical with and without the field; the kill switch removes it ── */
const STEPS = [
  { description: 'Forms the equation', studentWork: 'x^2-5x+6=0', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'Good.', mistakeType: null, correctedWorking: null },
  { description: 'Roots', studentWork: 'x = 1, 6', status: 'incorrect', marksAwarded: 0, marksDeducted: 2, teacherAnnotation: 'Check.', mistakeType: 'calculation', correctedWorking: 'x = 2, 3' },
];
const REPLY = { results: [{ qNumber: 1, couldNotRead: false, addressesQuestion: 'yes', annotatedSteps: STEPS, teacherNote: 'Note.' }], summary: 'S.' };

async function grade(solutionCache, paper = false, wsId = 'ci:CI-1', timing = null) {
  let captured = null; const prompts = [];
  const route = createCheckSolutionRoute({
    sendJson: (_r, status, body) => { captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async (_m, contents) => { prompts.push(JSON.stringify(contents)); return { text: JSON.stringify(REPLY), raw: {} }; },
    GEMINI_MODEL: 'm', ACTIVE_PROVIDER: 'test', isStubMode: () => false,
    extractJsonObjectFromText: (t) => { try { return JSON.parse(t); } catch { return null; } },
    buildGeminiImagePart: () => ({}), validateMentorImagePayload: () => ({ ok: true }),
    makeFenceNonce: () => 'n', telemetry: { increment() {} }, solutionCache,
    ...(timing ? { gradingTimingOverride: timing } : {}),
  });
  if (paper) {
    await route.handleGradeWorksheet({ worksheetId: wsId, subject: 'Maths', acceptsV2: true, questions: [{ qNumber: 1, marks: 3, topic: 'Quadratic Equations', topicLabel: 'Quadratic Equations', questionText: FIELDS.question, textAnswer: 'x = 1, 6' }] }, { setHeader() {} });
    return { body: captured.body.results[0], prompt: prompts[0] };
  }
  await route.handleCheckSolution({ question: FIELDS.question, marks: 3, subject: 'Maths', topic: 'Quadratic Equations', textAnswer: 'x = 1, 6', acceptsV2: true }, { setHeader() {} });
  return { body: captured.body, prompt: prompts[0] };
}
const withSteps = { getOrCreateModelSolution: async () => ({ schemeSteps: ['Formula: x [1 mark]'], solutionSteps: EXPECTED, fromCache: true, hash: 'abcdef012345' }) };
const withoutSteps = { getOrCreateModelSolution: async () => ({ schemeSteps: ['Formula: x [1 mark]'], fromCache: true, hash: 'abcdef012345' }) };

test('single-question grade: modelSolution rides along; score, steps, mistake summary and the PROMPT are identical with and without it', async () => {
  const a = await grade(withSteps);
  const b = await grade(withoutSteps);
  assert.deepEqual(a.body.modelSolution, { steps: EXPECTED, totalMarks: 3 });
  assert.equal(b.body.modelSolution, undefined, 'absent when the server had no structured steps — never an empty placeholder');
  const { modelSolution, ...rest } = a.body;
  assert.deepEqual(rest, b.body, 'deep-equal minus modelSolution');
  assert.equal(a.prompt, b.prompt, 'the grading prompt is byte-identical');
  assert.equal(a.body.marksAwarded, b.body.marksAwarded);
});

test('AC_MODEL_SOLUTION_DISABLED=1 -> the field is never sent', async () => {
  process.env.AC_MODEL_SOLUTION_DISABLED = '1';
  try {
    const a = await grade(withSteps);
    assert.equal(a.body.modelSolution, undefined);
    assert.equal(a.body.marksAwarded, (await grade(withoutSteps)).body.marksAwarded);
  } finally { delete process.env.AC_MODEL_SOLUTION_DISABLED; }
});

test('paper grade: the same field per question, same grade with and without it', async () => {
  const a = await grade(withSteps, true);
  const b = await grade(withoutSteps, true);
  assert.deepEqual(a.body.modelSolution, { steps: EXPECTED, totalMarks: 3 });
  assert.equal(b.body.modelSolution, undefined);
  const { modelSolution, ...rest } = a.body;
  assert.deepEqual(rest, b.body);
  assert.equal(a.prompt, b.prompt);
});

test('other surfaces (Worksheet / Chapter Test / Full Mock / Quick Practice ids) are unchanged: no modelSolution', async () => {
  for (const id of ['ws-1', 'ct:abc', 'fm:abc', 'qp:abc']) {
    const r = await grade(withSteps, true, id);
    assert.equal(r.body.modelSolution, undefined, id);
  }
  assert.ok((await grade(withSteps, true, 'ci:X')).body.modelSolution, 'control: the Answer Checker paper has it');
});

test('a scheme that arrives AFTER the time budget never reaches the card', async () => {
  const late = { getOrCreateModelSolution: () => new Promise((res) => setTimeout(() => res({ schemeSteps: ['Formula: x [1 mark]'], solutionSteps: EXPECTED, fromCache: false, hash: 'abcdef012345' }), 400)) };
  const a = await grade(late, false, 'x', { cacheBudgetMs: 20 });
  assert.equal(a.body.modelSolution, undefined);
  assert.ok(a.body.marksAwarded >= 0);
  assert.ok((await grade(late)).body.modelSolution, 'control: the same slow scheme within the default budget does reach the card');
});

test('kill switch accepts 1/true/yes/on in any case', async () => {
  for (const v of ['1', 'true', 'YES', 'On']) {
    process.env.AC_MODEL_SOLUTION_DISABLED = v;
    try { assert.equal((await grade(withSteps)).body.modelSolution, undefined, v); } finally { delete process.env.AC_MODEL_SOLUTION_DISABLED; }
  }
  assert.ok((await grade(withSteps)).body.modelSolution, 'control: unset -> present');
});
