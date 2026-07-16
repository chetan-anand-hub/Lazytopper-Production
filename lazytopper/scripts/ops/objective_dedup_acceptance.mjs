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
 * Drives the REAL modules — the dedup key via transpile-then-require of the actual
 * client TS (never a text scan), the grader via its dep-injection seam with a canned
 * grade / stub mode (no live LLM, no Firebase, no network).
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

function buildRoute({ stub }) {
  let captured = null;
  const deps = {
    sendJson: (_res, status, body) => { captured = { status, body }; },
    readJson: async (req) => req,
    callGemini: async () => ({ text: JSON.stringify(cannedCorrect), raw: {} }),
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

// ── normaliseStructuredResult (worksheet / C&I multi-question path) via handleGradeWorksheet
//    in STUB mode, which routes every question through normaliseStructuredResult. ──
{
  const { route, get } = buildRoute({ stub: true });
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

console.log(
  failures === 0
    ? '\n✅ objective-flag + attempt-dedup acceptance PASSED\n'
    : `\n❌ objective-flag + attempt-dedup acceptance FAILED (${failures} check(s))\n`,
);
process.exit(failures === 0 ? 0 : 1);
