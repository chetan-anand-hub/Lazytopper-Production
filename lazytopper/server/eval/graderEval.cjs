/* eslint-disable no-console */
// graderEval.cjs — standalone grader eval harness (TEST INFRASTRUCTURE ONLY).
//
// WHY: every prompt-only grading change used to require the owner to generate
// worksheets, handwrite answers, photograph + upload them, three times over.
// This script removes the human from that loop: it drives the WORKSHEET grader
// against the live Gemini model with FIXED synthetic inputs and asserts the JSON.
//
// HOW (GRADER-CORE-1 PR-1, P10 — "the eval harness carries its own rules" is retired):
// it no longer keeps ANY copy of the grading rules, the mistake taxonomy or the
// post-processing. It builds the request a Quick Practice student who TYPED their
// working sends (quickPracticeSessionService.ts buildBatchQuestionInput: question
// fields + `textAnswer`) and runs it through the REAL `handleGradeWorksheet` from
// routes/checkSolution.cjs (via server/eval/golden/lib/driver.cjs), so the prompt the
// model sees and every normaliser / clamp / reconcile is the code that ships. The
// prompt-equality test (graderEval.parity.test.cjs) byte-compares the harness's
// rendered prompt against production's on a fixed input.
//
// Run with:  pnpm --filter lazytopper run eval:grader   (MANUAL: real model calls)
// The wider, owner-target golden evaluation is server/eval/golden/ (G1 runs in CI with
// zero model calls; goldenLive.cjs runs it live).

// Force the direct-Gemini provider before config resolves (spec: AI_PROVIDER=gemini).
if (require.main === module) process.env.AI_PROVIDER = 'gemini';

const { createDriver } = require('./golden/lib/driver.cjs');

// ── Fixed synthetic test cases ────────────────────────────────────────────────
const CASES = [
  {
    name: 'Case 1 — "Don\'t know" non-attempt',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Real Numbers',
      questionText: 'Find the HCF of 6 and 20.',
      solutionSteps: ['[1 mark] Prime factorise: 6 = 2 × 3, 20 = 2² × 5', '[1 mark] HCF = common factors = 2'],
      finalAnswer: 'HCF = 2',
      studentWork: "Don't know",
    },
    expect: { status: 'incorrect', mistakeTypeNull: true, allBucketsZero: true },
  },
  {
    name: 'Case 2 — Wrong MCQ option (objective, no working)',
    question: {
      qNumber: 1, marks: 1, section: 'A', qType: 'mcq', topic: 'Light — Refraction',
      questionText: 'The second law of refraction is also known as: (a) Snell\'s law (b) Newton\'s law (c) Ohm\'s law (d) Hooke\'s law',
      finalAnswer: "(a) Snell's law",
      correctOption: '(a)',
      studentWork: '(d)',
    },
    expect: { status: 'incorrect', mistakeTypeNull: true, allBucketsZero: true },
  },
  {
    name: 'Case 3 — Partial credit (step 1 correct, step 2 wrong)',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Quadratic Equations',
      questionText: 'Find the value(s) of k for which 2x² + kx + 3 = 0 has equal roots.',
      solutionSteps: ['[1 mark] Set discriminant D = 0: k² − 4(2)(3) = k² − 24 = 0', '[1 mark] k = ±2√6'],
      finalAnswer: 'k = ±2√6',
      studentWork: 'D = k² − 24 = 0, so k² = 24, k = 2√6',
    },
    expect: { status: 'partial' },
  },
  {
    name: 'Case 4 — Correct answer, full marks',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Quadratic Equations',
      questionText: 'Solve x² − 7x + 12 = 0.',
      solutionSteps: ['[1 mark] Factorise: (x − 4)(x − 3) = 0', '[1 mark] x = 4 or x = 3'],
      finalAnswer: 'x = 4 or x = 3',
      studentWork: 'x² − 7x + 12 = (x − 4)(x − 3), so x = 4 or x = 3',
    },
    expect: { status: 'correct' },
  },
  {
    name: 'Case 5 — Worked wrong answer (should get a mistake type)',
    question: {
      qNumber: 1, marks: 2, section: 'B', qType: 'vsa', topic: 'Real Numbers',
      questionText: 'Find the LCM of 6 and 20.',
      solutionSteps: ['[1 mark] Prime factorise: 6 = 2 × 3, 20 = 2² × 5', '[1 mark] LCM = 2² × 3 × 5 = 60'],
      finalAnswer: 'LCM = 60',
      studentWork: '6 = 2×3, 20 = 2²×5, LCM = 2 × 3 × 5 = 30',
    },
    // The student SHOWED working (factorisation step 1 correct, step 2 dropped the
    // 2² → wrong). The invariant under test is the contrast with Case 2: because
    // working is visible, the honesty guard must NOT fire and a mistakeType must
    // survive. CBSE step-marking correctly awards step 1 → partial credit, so we
    // assert "not full marks" (the answer is wrong) rather than a hard 0.
    expect: { notFullMarks: true, mistakeTypePresent: true },
  },
];

// The request a typed Quick Practice batch sends for these questions
// (quickPracticeSessionService.ts:458-488 buildBatchQuestionInput; :752 grade(...)).
// Every field below is one handleGradeWorksheet's whitelist (checkSolution.cjs, the
// `payload.questions` mapper) reads; the student's working travels as `textAnswer`.
function buildRequest(questions, subject) {
  return {
    worksheetId: 'eval-grader',
    subject: subject || 'Maths',
    questions: questions.map((q) => {
      const out = { qNumber: q.qNumber, marks: q.marks, questionText: q.questionText, topicLabel: q.topic };
      if (q.section) out.section = q.section;
      if (q.qType) out.qType = q.qType;
      if (Array.isArray(q.solutionSteps) && q.solutionSteps.length) out.solutionSteps = q.solutionSteps;
      if (q.finalAnswer) out.finalAnswer = q.finalAnswer;
      if (q.correctOption) out.correctOption = q.correctOption;
      out.textAnswer = String(q.studentWork || '').trim();
      return out;
    }),
  };
}

const job = (request) => ({ handler: 'handleGradeWorksheet', request });

/** The EXACT `contents` production's handleGradeWorksheet would send to the model for
 *  these questions — captured from the real handler with a stubbed model (0 calls). */
async function renderPrompt(questions, subject, opts = {}) {
  let captured = null;
  const driver = createDriver({
    makeFenceNonce: opts.makeFenceNonce,
    callGemini: async (_model, contents) => {
      captured = captured || contents;
      return { text: JSON.stringify({ results: questions.map((q) => ({ qNumber: q.qNumber, couldNotRead: true })) }), raw: {} };
    },
  });
  await driver.run(job(buildRequest(questions, subject)));
  return captured;
}

// Live client (lazy, so requiring this module for the parity test spends nothing).
let _client = null;
function requireGeminiClient() {
  const { resolveConfig } = require('./../services/serverConfig.cjs');
  const { createGeminiClient } = require('./../services/geminiClient.cjs');
  const config = resolveConfig();
  console.log('API_KEY: ' + (config.GEMINI_API_KEY ? 'PRESENT' : 'MISSING'));
  console.log('GEMINI_MODEL: ' + config.GEMINI_MODEL);
  console.log('');
  if (!config.GEMINI_API_KEY) {
    console.error('No Gemini key resolved. Set API_KEY with AI_PROVIDER=gemini, then re-run. Refusing to run the eval against the stub.');
    process.exit(1);
  }
  if (!_client) {
    _client = { config, gem: createGeminiClient({
      GEMINI_API_KEY: config.GEMINI_API_KEY,
      HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
      REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
      REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
      DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
      GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
      GEMINI_TIMEOUT_MS: config.GEMINI_TIMEOUT_MS,
    }) };
  }
  return _client;
}

/** Grade questions through the REAL handler with the live model. */
async function gradeCases(questions, subject) {
  const { config, gem } = requireGeminiClient();
  const driver = createDriver({ callGemini: (m, c, cfg) => gem.callGemini(m, c, cfg), model: config.GEMINI_MODEL });
  const r = await driver.run(job(buildRequest(questions, subject)));
  return r.body || { ok: false };
}

function questionStatus(r) {
  if (r.couldNotRead) return 'couldNotRead';
  if (r.marksAwarded >= r.totalMarks) return 'correct';
  if (r.marksAwarded <= 0) return 'incorrect';
  return 'partial';
}
function bucketSum(r) {
  const m = r.mistakeSummary || {};
  return (m.conceptual || 0) + (m.calculation || 0) + (m.silly || 0) + (m.presentation || 0);
}

function evaluateCase(c, r) {
  const failures = [];
  const status = questionStatus(r);
  const buckets = bucketSum(r);
  const e = c.expect;

  if (r.couldNotRead) {
    failures.push('couldNotRead=true (a typed text answer should always be readable)');
  }

  if (e.status) {
    if (e.status === 'partial') {
      if (!(r.marksAwarded > 0 && r.marksAwarded < r.totalMarks)) {
        failures.push(`expected PARTIAL (0 < marks < ${r.totalMarks}), got ${r.marksAwarded}/${r.totalMarks}`);
      }
    } else if (status !== e.status) {
      failures.push(`expected status "${e.status}", got "${status}" (${r.marksAwarded}/${r.totalMarks})`);
    }
  }
  if (e.notFullMarks && r.marksAwarded >= r.totalMarks) {
    failures.push(`expected NOT full marks (answer is wrong), got ${r.marksAwarded}/${r.totalMarks}`);
  }
  if (e.allBucketsZero && buckets !== 0) {
    failures.push(`expected all mistake buckets 0, got sum ${buckets} (${JSON.stringify(r.mistakeSummary)})`);
  }
  if (e.mistakeTypeNull) {
    const anyTyped = (r.annotatedSteps || []).some((s) => s.mistakeType !== null);
    if (anyTyped || buckets !== 0) {
      failures.push(`expected mistakeType null everywhere, got steps=${JSON.stringify((r.annotatedSteps || []).map((s) => s.mistakeType))} buckets=${JSON.stringify(r.mistakeSummary)}`);
    }
  }
  if (e.mistakeTypePresent && buckets < 1) {
    failures.push(`expected a mistakeType (calculation/conceptual), got none (${JSON.stringify(r.mistakeSummary)})`);
  }

  return failures;
}

async function main() {
  let passed = 0;
  for (let i = 0; i < CASES.length; i++) {
    const c = CASES[i];
    let body;
    try {
      body = await gradeCases([c.question]);
    } catch (err) {
      console.log(`FAIL — ${c.name}`);
      console.log(`   threw: ${err && err.message ? err.message : err}`);
      console.log('');
      continue;
    }
    if (!body.ok || !Array.isArray(body.results) || !body.results[0]) {
      console.log(`FAIL — ${c.name}`);
      console.log('   grader returned no parseable result (ok=false / empty results)');
      console.log('');
      continue;
    }
    const r = body.results[0];
    const failures = evaluateCase(c, r);
    const status = questionStatus(r);
    if (failures.length === 0) {
      passed++;
      console.log(`PASS — ${c.name}`);
      console.log(`   actual: status=${status} marks=${r.marksAwarded}/${r.totalMarks} buckets=${JSON.stringify(r.mistakeSummary)}`);
    } else {
      console.log(`FAIL — ${c.name}`);
      console.log(`   actual: status=${status} marks=${r.marksAwarded}/${r.totalMarks} buckets=${JSON.stringify(r.mistakeSummary)}`);
      for (const f of failures) console.log(`   ✗ ${f}`);
    }
    console.log('');
  }

  console.log(`EVAL: ${passed}/${CASES.length} passed`);
  process.exit(passed === CASES.length ? 0 : 1);
}

// ── ENTRY ────────────────────────────────────────────────────────────────────
// MANUAL ONLY. It calls a REAL model and consumes quota, so it is deliberately NOT
// wired into test:matrix:all, any workflow or any hook. Guarded on require.main so
// that requiring this module for the prompt-parity test neither spends a call nor
// exits the process.
if (require.main === module) {
  main().catch((err) => {
    console.error('EVAL harness crashed:', err && err.stack ? err.stack : err);
    process.exit(1);
  });
}

module.exports = {
  // Exported for server/eval/graderEval.parity.test.cjs (prompt equality, 0 calls).
  CASES,
  buildRequest,
  renderPrompt,
  evaluateCase,
  questionStatus,
};
