'use strict';
// graderEval.parity.test.cjs — P10 (GRADER-CORE-1 PR-1): the eval harness carries NO rules
// of its own. Zero model calls.
//
// WHY THIS FILE CHANGED: the harness used to assemble its own copy of the grading rules
// (`buildGradingRules`, a local mistake taxonomy, a local normaliser) and this file pinned
// that copy clause by clause against the shipped strings. A copy pinned to its source is
// still a copy: it carried a different rule 1, no couldNotRead head, no fence clause, no
// isReturn and no responseSchema, so it measured a grader no student meets. The harness now
// sends a Quick Practice typed-batch request through the REAL handleGradeWorksheet, and
// this file proves it BYTE FOR BYTE: the prompt the harness would send equals the prompt
// production sends for the same request, built here INDEPENDENTLY of the harness.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { CASES, buildRequest, renderPrompt, evaluateCase } = require('./graderEval.cjs');
const { createCheckSolutionRoute } = require('../routes/checkSolution.cjs');
const { createHttpUtils, extractJsonObjectFromText } = require('../services/httpUtils.cjs');
const { buildGeminiImagePart, validateMentorImagePayload } = require('../mentorImageSupport.cjs');

// Production's prompt for a request, captured from the shipped handler with a stub model.
// Built from the route module directly — NOT through the harness or its driver — so the
// comparison is harness vs product, never harness vs itself.
async function productionPrompt(request) {
  let captured = null;
  const { sendJson } = createHttpUtils('*');
  const routes = createCheckSolutionRoute({
    sendJson,
    readJson: async (req) => req.body,
    callGemini: async (_m, contents) => { captured = captured || contents; return { text: '{"results":[]}', raw: {} }; },
    GEMINI_MODEL: 'gemini-2.5-flash',
    ACTIVE_PROVIDER: 'gemini',
    isStubMode: () => false,
    extractJsonObjectFromText,
    buildGeminiImagePart,
    validateMentorImagePayload,
  });
  const res = { writeHead() {}, setHeader() {}, end() {} };
  await routes.handleGradeWorksheet({ body: JSON.parse(JSON.stringify(request)) }, res);
  return captured;
}

// The fixed input: ALL FIVE harness cases as one batch, spelled out as a Quick Practice
// typed batch (quickPracticeSessionService.ts:458-488) — written here by hand, not by
// calling the harness's buildRequest.
function independentRequest() {
  return {
    worksheetId: 'eval-grader',
    subject: 'Maths',
    questions: CASES.map((c) => {
      const q = c.question;
      const o = { qNumber: q.qNumber, marks: q.marks, questionText: q.questionText, topicLabel: q.topic };
      if (q.section) o.section = q.section;
      if (q.qType) o.qType = q.qType;
      if (q.solutionSteps) o.solutionSteps = q.solutionSteps;
      if (q.finalAnswer) o.finalAnswer = q.finalAnswer;
      if (q.correctOption) o.correctOption = q.correctOption;
      o.textAnswer = q.studentWork;
      return o;
    }),
  };
}

test('§1 BYTE EQUALITY — the harness renders exactly the prompt production sends (fixed input, 0 calls)', async () => {
  const questions = CASES.map((c, i) => ({ ...c.question, qNumber: i + 1 }));
  const req = independentRequest();
  req.questions.forEach((q, i) => { q.qNumber = i + 1; });
  const harness = await renderPrompt(questions, 'Maths');
  const product = await productionPrompt(req);
  assert.ok(Array.isArray(product) && product.length > 0, 'CONTROL: production rendered no contents — the comparison would be vacuous');
  assert.ok(Array.isArray(harness) && harness.length > 0, 'the harness rendered no contents');
  const a = JSON.stringify(harness);
  const b = JSON.stringify(product);
  if (a !== b) {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i += 1;
    assert.fail('harness prompt != production prompt at byte ' + i + ':\n  harness: …' + a.slice(Math.max(0, i - 60), i + 80) + '\n  product: …' + b.slice(Math.max(0, i - 60), i + 80));
  }
  assert.ok(b.length > 5000, 'CONTROL: the production prompt is implausibly short (' + b.length + ' bytes)');
});

test('§2 NO THIRD COPY — graderEval.cjs contains none of the grading rule text it used to copy', () => {
  const evalSrc = fs.readFileSync(path.join(__dirname, 'graderEval.cjs'), 'utf8');
  const routeSrc = fs.readFileSync(path.join(__dirname, '..', 'routes', 'checkSolution.cjs'), 'utf8');
  const markers = [
    'function buildGradingRules',
    'STRUCTURED_MISTAKE_TAXONOMY',
    'For each mistake choose the type by the CAUSE',
    'GRADING RULES:',
    'function normaliseStructuredResult',
    'ERROR CARRIED FORWARD',
  ];
  for (const m of markers) {
    if (m !== 'function buildGradingRules') {
      assert.ok(routeSrc.includes(m), 'CONTROL: the route no longer contains "' + m + '" — the absence check below would be vacuous');
    }
    assert.ok(!evalSrc.includes(m), 'graderEval.cjs carries a copy of production grading text: "' + m + '"');
  }
});

test('§3 the rendered prompt carries production-only rules the old copy never had', async () => {
  const product = JSON.stringify(await productionPrompt(independentRequest()));
  // TYPED-3 typed-only HONEST READ head and the FENCE-1 clause (rule 17) — both absent
  // from the retired copy (its §4 pinned them OUT). Their presence proves this is the
  // product's typed-batch prompt, not a reconstruction.
  assert.ok(/couldNotRead\\" DOES NOT APPLY|couldNotRead" DOES NOT APPLY/.test(product), 'typed-only rule 6 head missing');
  assert.ok(product.includes('STUDENT\'S OWN WORK') || product.includes('STUDENT\\\'S OWN WORK') || product.includes("STUDENT'S OWN WORK"), 'fence clause (rule 17) missing');
  assert.ok(product.includes('isReturn'), 'the isReturn field (absent from the old copy) is missing');
});

test('§4 CONTROL — a divergent prompt is detected (the equality check can fail)', async () => {
  const product = await productionPrompt(independentRequest());
  const divergent = JSON.parse(JSON.stringify(product));
  const last = divergent[0].parts[divergent[0].parts.length - 1];
  last.text += '\n18. An extra harness-only rule.';
  assert.notStrictEqual(JSON.stringify(divergent), JSON.stringify(product), 'a one-rule divergence must change the bytes');
});

test('§5 CONTROL — a deliberately wrong expected value makes the case FAIL', () => {
  const fullMarks = {
    qNumber: 1, couldNotRead: false, marksAwarded: 2, totalMarks: 2,
    annotatedSteps: [{ stepNumber: 1, description: 'd', status: 'correct', marksAwarded: 2, marksDeducted: 0, mistakeType: null }],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  };
  assert.deepEqual(evaluateCase({ name: 'honest', expect: { status: 'correct' } }, fullMarks), []);
  const failures = evaluateCase({ name: 'deliberately wrong', expect: { status: 'incorrect' } }, fullMarks);
  assert.ok(failures.length > 0, 'THE HARNESS CANNOT FAIL — it is not measuring anything');
  assert.ok(/expected/i.test(failures.join(' | ')) && /2\/2|correct/.test(failures.join(' | ')), 'failure text must name expected and actual: ' + failures.join(' | '));
});

test('§6 every case carries a label and an expectation; buildRequest sends the working as textAnswer', () => {
  for (const c of CASES) {
    assert.ok(typeof c.name === 'string' && c.name.length > 0, 'a case with no label cannot be reported as a miss');
    assert.ok(c.expect && Object.keys(c.expect).length > 0, 'case "' + c.name + '" carries no expectation');
  }
  const req = buildRequest([CASES[0].question]);
  assert.strictEqual(req.questions[0].textAnswer, CASES[0].question.studentWork);
  assert.ok(!('studentWork' in req.questions[0]), 'studentWork is not a field the server reads; it must travel as textAnswer');
});
