/**
 * Objective-flag + attempt-dedup acceptance gate  (PR: grader objective flag + §4b dedup)
 *
 * WHY THIS IS A CI GATE AND NOT A vitest FILE: vitest is linux-pinned and does not run
 * on a Windows dev box, and CI runs the MATRICES, not the general vitest suite — so a
 * vitest file asserting these properties would never actually run anywhere that blocks a
 * merge. Both properties below are load-bearing on live surfaces (progress counting and
 * the grader's per-step display), so they are proven here, in the matrix, on every PR.
 *
 * What it pins:
 *   §4b  the attempt-dedup key is MODE-INDEPENDENT (a click and a graded typed answer to
 *        the same question at the same score collapse to ONE key → one Firestore doc →
 *        counted once) and SCORE-DISTINCT (0/1 and 1/1 never collapse). Negative control:
 *        the OLD mode-in-key formula is reconstructed inline and shown to DIVERGE for the
 *        click∪graded pair — so a regression that re-adds `mode` goes red here.
 *   §2   BOTH grader functions (handleCheckSolution AND normaliseStructuredResult — the
 *        keep-in-sync pair) emit `objective`, correctly true for an objective question
 *        (Section A) and falsy for a subjective one, and the objective clamp zeroes every
 *        per-step mark (the reason the view must suppress the chip). Negative control: a
 *        subjective question keeps its per-step marks AND reports objective falsy.
 *
 *   §2b  STUB-503 · a GRADING path with no provider credential REFUSES (HTTP 503) and
 *        emits no mark, no annotatedSteps and no fabricated studentWork. Negative
 *        control: question DETECTION, which is NOT grading, still answers 200.
 *
 * Drives the REAL modules — the dedup key via transpile-then-require of the actual
 * client TS (never a text scan), the grader via its dep-injection seam with a CANNED
 * MODEL REPLY (no live LLM, no Firebase, no network).
 *
 * ⚠⚠ STUB-503 — WHY §2 NO LONGER USES `stub: true`. Until this change, the
 * normaliseStructuredResult half of §2 drove handleGradeWorksheet in STUB mode, because
 * that was the cheap way to push questions through the normaliser without a model. Stub
 * mode returned an INVENTED grade — a 60%, a `studentWork: 'Attempted'` the student
 * never wrote, and an alternating conceptual/presentation mistakeType — so THIS GATE WAS
 * FIXTURED ON THE DEFECT: it required the grader to fabricate in order to go green, and
 * it went red on the fix. It now drives the same normaliser with a CANNED WORKSHEET
 * REPLY, which is what §2 always meant to test, and §2b pins the refusal.
 * ★ A GATE WHOSE FIXTURE IS THE BUG WILL DEFEND THE BUG. Encode the fix, not the defect.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZY = path.join(__dirname, '..', '..');

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §4b · attempt-dedup key — mode-independence + score-distinctness
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n§4b · attempt-dedup key (the REAL function, transpiled from src):');
{
  const out = mkdtempSync(path.join(tmpdir(), 'lt-dedup-'));
  execFileSync('node', [
    path.join(LAZY, 'node_modules/typescript/bin/tsc'),
    'src/services/attemptDedupKey.ts',
    '--outDir', out, '--rootDir', 'src',
    '--module', 'commonjs', '--target', 'es2020',
    '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop',
  ], { cwd: LAZY, stdio: ['ignore', 'ignore', 'inherit'] });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const { attemptDedupKey } = require(path.join(out, 'services/attemptDedupKey.js'));

  const uid = 'u1';
  // The two live paths that record the SAME MCQ: a click (mode "mcq") and a graded typed
  // answer (mode "graded"). Extra `mode` field is passed to prove the function ignores it.
  const clickCtx = { questionId: 'bank-q-1', mode: 'mcq' };
  const gradedCtx = { questionId: 'bank-q-1', mode: 'graded' };

  const clickKey = attemptDedupKey(uid, clickCtx, 1, 1);
  const gradedKey = attemptDedupKey(uid, gradedCtx, 1, 1);

  check('a wrong-click-then-grade pair (same q, same 1/1) collapses to ONE key',
    clickKey === gradedKey, `click=${clickKey} graded=${gradedKey}`);
  check('the key contains NO trace of mode ("mcq"/"graded")',
    !clickKey.includes('mcq') && !clickKey.includes('graded'), clickKey);

  // Score-distinctness: a genuinely different result must NOT collapse.
  const wrong = attemptDedupKey(uid, { questionId: 'bank-q-1' }, 0, 1);
  const right = attemptDedupKey(uid, { questionId: 'bank-q-1' }, 1, 1);
  check('0/1 and 1/1 on the same question stay DISTINCT (score is in the key)',
    wrong !== right, `wrong=${wrong} right=${right}`);
  check('different questions stay distinct',
    attemptDedupKey(uid, { questionId: 'q-A' }, 1, 1) !== attemptDedupKey(uid, { questionId: 'q-B' }, 1, 1));
  check('different users stay distinct',
    attemptDedupKey('u1', { questionId: 'q' }, 1, 1) !== attemptDedupKey('u2', { questionId: 'q' }, 1, 1));
  // No stable id → hashed question text, still mode-independent.
  check('free-typed (no questionId) is also mode-independent',
    attemptDedupKey(uid, { question: 'Prove √2 irrational', mode: 'mcq' }, 3, 3)
    === attemptDedupKey(uid, { question: 'Prove √2 irrational', mode: 'graded' }, 3, 3));

  // ★ NEGATIVE CONTROL — reconstruct the OLD mode-in-key formula and show it DIVERGED
  // for exactly the click∪graded pair the fix collapses. If a future edit re-adds `mode`
  // to the real key, clickKey===gradedKey above flips false and this gate goes red.
  const oldKey = (u, ctx, s, a) => {
    const qid = ctx.questionId && ctx.questionId.trim()
      ? ctx.questionId.trim() : `t:${ctx.question || ctx.topic || ''}`;
    return [u, qid, `${s}/${a}`, ctx.mode].join('::');
  };
  check('negative control: the OLD (mode-in-key) formula DID double-count this pair',
    oldKey(uid, clickCtx, 1, 1) !== oldKey(uid, gradedCtx, 1, 1),
    'if these were equal the bug never existed and the test proves nothing');
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 · the grader emits `objective` from BOTH functions (keep-in-sync pair)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n§2 · grader objective flag (the REAL route module):');
const { createCheckSolutionRoute } = require(path.join(LAZY, 'server', 'routes', 'checkSolution.cjs'));

// A canned "correct" grade whose steps carry NONZERO marks — so the objective clamp
// zeroing them is observable, not a no-op.
const cannedCorrect = {
  totalMarks: 1,
  marksAwarded: 1,
  annotatedSteps: [
    { stepNumber: 1, description: 'Picks option B', studentWork: 'B', status: 'correct',
      marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'right', mistakeType: null, correctedWorking: null },
  ],
  mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
  teacherNote: 'ok',
};

// The worksheet-shaped twin of `cannedCorrect`, for the STRUCTURED path. Same
// principle: q1's step carries a NONZERO mark so the objective clamp zeroing it is
// observable rather than a no-op, and q2 stays subjective as the negative control.
const cannedWorksheetCorrect = {
  results: [
    {
      qNumber: 1,
      marksAwarded: 1,
      annotatedSteps: [
        { stepNumber: 1, description: 'Picks option B', studentWork: 'B', status: 'correct',
          marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'right', mistakeType: null, correctedWorking: null },
      ],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
      teacherNote: 'ok',
    },
    {
      qNumber: 2,
      marksAwarded: 3,
      annotatedSteps: [
        { stepNumber: 1, description: 'Method and substitution', studentWork: 'x = 4', status: 'partial',
          marksAwarded: 3, marksDeducted: 2, teacherAnnotation: 'ok', mistakeType: 'calculation', correctedWorking: null },
      ],
      mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
      teacherNote: 'ok',
    },
  ],
  summary: 'ok',
};

function buildRoute({ stub, reply = cannedCorrect }) {
  let captured = null;
  const deps = {
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async () => ({ text: JSON.stringify(reply), raw: {} }),
    GEMINI_MODEL: 'test-model',
    ACTIVE_PROVIDER: 'test',
    isStubMode: () => stub,
    extractJsonObjectFromText: (t) => JSON.parse(t),
    buildGeminiImagePart: () => ({}),
    validateMentorImagePayload: () => ({ ok: true }),
  };
  const route = createCheckSolutionRoute(deps);
  return { route, get: () => captured };
}

// ── handleCheckSolution (single-question path) ──
{
  const { route, get } = buildRoute({ stub: false });

  // Objective: a Section-A 1-mark question. section:"A" alone makes it objective.
  await route.handleCheckSolution(
    { question: 'Which is a factor of 78?', marks: 1, subject: 'Maths', section: 'A',
      answer: 'B', options: ['A', 'B', 'C', 'D'], textAnswer: 'B' }, {});
  const obj = get().body;
  check('handleCheckSolution: objective === true for a Section-A question', obj.objective === true,
    `objective=${JSON.stringify(obj.objective)}`);
  check('handleCheckSolution: the clamp zeroed every per-step mark on the objective question',
    Array.isArray(obj.annotatedSteps) && obj.annotatedSteps.every((s) => s.marksAwarded === 0),
    JSON.stringify(obj.annotatedSteps?.map((s) => s.marksAwarded)));
  check('handleCheckSolution: the whole mark survives at answer level (1/1, not per-step)',
    obj.marksAwarded === 1 && obj.totalMarks === 1);

  // Subjective control: a 5-mark question, no objective signals.
  await route.handleCheckSolution(
    { question: 'Prove the two triangles are similar.', marks: 5, subject: 'Maths', textAnswer: 'proof...' }, {});
  const subj = get().body;
  check('handleCheckSolution: objective is FALSY for a subjective question', !subj.objective,
    `objective=${JSON.stringify(subj.objective)}`);
  check('negative control: the subjective question KEEPS its per-step mark (clamp did NOT run)',
    Array.isArray(subj.annotatedSteps) && subj.annotatedSteps.some((s) => s.marksAwarded > 0),
    JSON.stringify(subj.annotatedSteps?.map((s) => s.marksAwarded)));
}

// ── normaliseStructuredResult (worksheet / C&I multi-question path) via
//    handleGradeWorksheet, which routes every question through normaliseStructuredResult.
//    ⚠ STUB-503: `stub: false` + a canned worksheet reply. This block used to pass
//    `stub: true`; see the header. THE FOUR ASSERTIONS BELOW ARE UNCHANGED — only the way
//    the results are produced changed, from a fabricated grade to a mocked model reply. ──
{
  const { route, get } = buildRoute({ stub: false, reply: cannedWorksheetCorrect });
  await route.handleGradeWorksheet(
    { worksheetId: 'ws1', imageBase64: 'x', imageMimeType: 'application/pdf', subject: 'Maths',
      questions: [
        { qNumber: 1, marks: 1, section: 'A', questionText: 'MCQ item', answer: 'B', options: ['A', 'B', 'C', 'D'] },
        { qNumber: 2, marks: 5, questionText: 'Long subjective item' },
      ] }, {});
  const body = get().body;
  const r1 = (body.results || []).find((r) => r.qNumber === 1);
  const r2 = (body.results || []).find((r) => r.qNumber === 2);
  check('normaliseStructuredResult: objective === true for the Section-A question', r1 && r1.objective === true,
    JSON.stringify(r1 && r1.objective));
  check('normaliseStructuredResult: the clamp zeroed its per-step marks',
    r1 && Array.isArray(r1.annotatedSteps) && r1.annotatedSteps.every((s) => s.marksAwarded === 0));
  check('normaliseStructuredResult: objective is FALSY for the subjective question', r2 && !r2.objective,
    JSON.stringify(r2 && r2.objective));
  check('both grader functions emit the field (keep-in-sync invariant holds)',
    get().body && r1 && 'objective' in r1);
}

// ─────────────────────────────────────────────────────────────────────────────
// §2b · STUB-503 · a GRADING path with no provider credential REFUSES
// ─────────────────────────────────────────────────────────────────────────────
// ★★ THIS IS THE BLOCK THAT MAKES THIS GATE FIRE. Re-fixturing §2 off stub mode removes
// the false red, but on its own it would leave the matrix with NOTHING asserting the
// refusal — a gate that merely stopped failing. These checks go red the moment either
// fabricator is wired back into a grading path.
console.log('\n§2b · STUB-503 — a credential outage refuses instead of inventing a grade:');
{
  // (a) the SINGLE-QUESTION grading path
  const { route, get } = buildRoute({ stub: true });
  await route.handleCheckSolution(
    { question: 'Find the roots of x^2 - 2x - 8 = 0.', marks: 3, subject: 'Maths', textAnswer: 'x = 4, x = -2' }, {});
  const single = get();
  check('handleCheckSolution: stub mode REFUSES with a non-2xx (503), never a grade',
    single && single.status === 503, 'status=' + (single && single.status));
  const singleBody = JSON.stringify(single && single.body);
  for (const t of ['marksAwarded', 'percentage', 'annotatedSteps', 'mistakeType', 'studentWork', 'Written correctly']) {
    check('handleCheckSolution: the refusal carries NO ' + t, !singleBody.includes(t));
  }
  check('handleCheckSolution: the refusal carries a human-readable sentence, not a bare code',
    single && typeof single.body.error === 'string' && single.body.error.length > 40 && /unavailable/i.test(single.body.error),
    JSON.stringify(single && single.body && single.body.error));
}
{
  // (b) the STRUCTURED / worksheet grading path — the one that feeds Worksheet, Chapter
  //     Test, Full Mock and multi-question Check & Improve, all four at once.
  const { route, get } = buildRoute({ stub: true });
  await route.handleGradeWorksheet(
    { worksheetId: 'ws1', imageBase64: 'x', imageMimeType: 'application/pdf', subject: 'Maths',
      questions: [
        { qNumber: 1, marks: 1, section: 'A', questionText: 'MCQ item', answer: 'B', options: ['A', 'B', 'C', 'D'] },
        { qNumber: 2, marks: 5, questionText: 'Long subjective item' },
      ] }, {});
  const ws = get();
  check('handleGradeWorksheet: stub mode REFUSES with a non-2xx (503), never a grade',
    ws && ws.status === 503, 'status=' + (ws && ws.status));
  const wsBody = JSON.stringify(ws && ws.body);
  for (const t of ['marksAwarded', 'results', 'annotatedSteps', 'mistakeType', 'studentWork', 'Attempted']) {
    check('handleGradeWorksheet: the refusal carries NO ' + t, !wsBody.includes(t));
  }
}
{
  // (c) NEGATIVE CONTROL — question DETECTION is NOT grading. It awards nothing, so its
  //     stub invents no grade and must be LEFT ALONE. Without this check, "turn every
  //     isStubMode() site into a 503" would look correct.
  const { route, get } = buildRoute({ stub: true });
  await route.handleDetectQuestion({ question: 'Find the roots of x^2 - 2x - 8 = 0.' }, {});
  const det = get();
  check('negative control: question DETECTION is not grading and still answers 200',
    det && det.status === 200 && det.body && det.body.ok === true, 'status=' + (det && det.status));
  check('negative control: and it awards nothing, which is why leaving it alone is correct',
    det && !JSON.stringify(det.body).includes('marksAwarded'));
}

console.log(
  failures === 0
    ? '\n✅ objective-flag + attempt-dedup acceptance PASSED\n'
    : `\n❌ objective-flag + attempt-dedup acceptance FAILED (${failures} check(s))\n`,
);
process.exit(failures === 0 ? 0 : 1);
