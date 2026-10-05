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
 *        the same question collapse to ONE key → one Firestore doc → counted once).
 *        // superseded by owner ruling 2026-10-05: re-grade replaces (verifier N2, controller
 *        // fix round 2026-10-05) — proven on the LIVE practice-card paths: the contexts are the
 *        // ones the card's MCQ click and its SolutionChecker build (their source is read), keyed
 *        // by the REAL functions, and the REAL upsertAttempt keeps ONE attempt, latest wins. The
 *        // two gate-built "negative controls" (old mode-in-key / score-in-key formulas compared
 *        // with themselves) could not fail on any product change (verifier N4): replaced by
 *        // CONTROLS on the real functions.
 *        // superseded by owner ruling 2026-10-05: re-grade replaces — the key was
 *        // SCORE-DISTINCT ("0/1 and 1/1 never collapse"); it is now the SUBMISSION's identity:
 *        // a re-grade of the SAME submission keeps ONE key and the stored attempt is REPLACED
 *        // (latest wins, `upsertAttempt`); a NEW submission gets a new key; the score is never
 *        // in the key (SCORECARD-MI-1 PR-2, H1 / GA-17, controller ruling A2). Negative control:
 *        // the superseded score-in-key formula is reconstructed and shown to SPLIT a re-grade.
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
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAZY = path.join(__dirname, '..', '..');

// superseded by owner ruling 2026-10-05: re-grade replaces — the live-path pins (verifier N2) read
// product source COMMENT-STRIPPED, so a comment can never stand in for the code it names.
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/([^:])\/\/[^\n"'`]*$/gm, '$1');
}

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
// §4b · attempt-dedup key — mode-independence on the LIVE practice-card paths + ONE attempt per
//        submission, latest wins (superseded by owner ruling 2026-10-05: re-grade replaces)
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
  // superseded by owner ruling 2026-10-05: re-grade replaces — `upsertAttempt` (latest wins) is
  // required from the same REAL module so §4b proves the replacement, not only the key.
  const { attemptDedupKey, upsertAttempt, practiceCardAttemptIdentity } = require(path.join(out, 'services/attemptDedupKey.js'));

  const uid = 'u1';
  // ── superseded by owner ruling 2026-10-05: re-grade replaces (verifier N2, controller fix round).
  // WAS: a FIXTURE pair ({ questionId: 'bank-q-1', mode: 'mcq' } vs mode 'graded') that NO live path
  // produced any more — the card's click recorded as surface "practice-mcq" + its option and its
  // SolutionChecker as "solution-checker", so a click and a written check of ONE practice question
  // were TWO attempts again (the double count this pin exists for). NOW: the LIVE call sites are
  // read from source, and their contexts are keyed by the REAL functions.
  const srcOf = (rel) => stripComments(readFileSync(path.join(LAZY, rel), 'utf8'));
  const cardSrc = srcOf('src/components/practice/PracticeQuestionCard.tsx');
  const scSrc = srcOf('src/components/question/SolutionChecker.tsx');
  const clickCall = (cardSrc.match(/recordAttempt\(user, \{[\s\S]*?\n\s*\}\);/) || [''])[0];
  check('LIVE (click): the practice card\'s MCQ click records under the card\'s ONE identity — ...practiceCardAttemptIdentity(qId), mode "mcq", no surface / answer / question id of its own (superseded by owner ruling 2026-10-05: re-grade replaces)',
    /\.\.\.practiceCardAttemptIdentity\(qId\)/.test(clickCall) && /mode: "mcq"/.test(clickCall)
      && !/surface:|answerKey:|questionId:/.test(clickCall),
    clickCall.slice(0, 240) || 'no recordAttempt call found in PracticeQuestionCard.tsx');
  check('LIVE (written check): the card hands its SolutionChecker the SAME identity, and the checker records its fresh grade AND its cache-restore under it (superseded by owner ruling 2026-10-05: re-grade replaces)',
    /attemptIdentity=\{practiceCardAttemptIdentity\(String\(q\.id\)\)\}/.test(cardSrc)
      && (scSrc.match(/\.\.\.\(attemptIdentity \?\? \{ surface: "solution-checker", questionId, answerKey(: savedAnswerKey)? \}\)/g) || []).length === 2);
  // The contexts those two live paths build (mode passed to prove the key ignores it).
  const clickCtx = { ...practiceCardAttemptIdentity('bank-q-1'), mode: 'mcq' };
  const gradedCtx = { ...practiceCardAttemptIdentity('bank-q-1'), mode: 'graded' };

  const clickKey = attemptDedupKey(uid, clickCtx);
  const gradedKey = attemptDedupKey(uid, gradedCtx);

  check('a click and a written check of the SAME practice question are ONE key (the live contexts, the REAL key) — superseded by owner ruling 2026-10-05: re-grade replaces',
    clickKey === gradedKey, `click=${clickKey} graded=${gradedKey}`);
  check('the key contains NO trace of mode ("mcq"/"graded")',
    !clickKey.includes('mcq') && !clickKey.includes('graded'), clickKey);
  // superseded by owner ruling 2026-10-05: re-grade replaces — ONE attempt across the two surfaces.
  const viaClick = { id: clickKey, marksScored: 0, marksAvailable: 1 };
  const viaCheck = { id: gradedKey, marksScored: 1, marksAvailable: 1 };
  const acrossSurfaces = upsertAttempt(upsertAttempt([], viaClick).attempts, viaCheck);
  check('ONE attempt, latest wins: a wrong click then a right written check of the same practice question → one attempt holding the check, never counted twice (the REAL upsertAttempt)',
    acrossSurfaces.outcome === 'replaced' && acrossSurfaces.attempts.length === 1 && acrossSurfaces.attempts[0].marksScored === 1,
    JSON.stringify(acrossSurfaces));

  // ── superseded by owner ruling 2026-10-05: re-grade replaces (SCORECARD-MI-1 PR-2, H1 / GA-17).
  // WAS (one check): '0/1 and 1/1 on the same question stay DISTINCT (score is in the key)' —
  // `wrong !== right`. A re-grade of the SAME submission that changed the score therefore added a
  // SECOND attempt. REPLACED by the pins below on the new behaviour (identity rule A2): one key
  // per submission, latest wins, a new submission is a new key, the score is never in the key.
  const sub = { questionId: 'ws:ws-1:q1', surface: 'worksheet', submissionId: 'ws-1' };
  const firstGrade = attemptDedupKey(uid, { ...sub, marksScored: 0, marksAvailable: 1 }, 0, 1);
  const reGrade = attemptDedupKey(uid, { ...sub, marksScored: 1, marksAvailable: 1 }, 1, 1);
  check('a re-grade of the SAME submission keeps ONE key (0/1 then 1/1 on ws-1 Q1 → the same key) — superseded by owner ruling 2026-10-05: re-grade replaces',
    firstGrade === reGrade, `first=${firstGrade} regrade=${reGrade}`);
  check('the score is NEVER in the key (no "s/a" segment, and the function takes no score argument)',
    !/\d+\/\d+/.test(firstGrade) && attemptDedupKey.length === 2, `key=${firstGrade} arity=${attemptDedupKey.length}`);
  check('a NEW submission gets a NEW key (the same question on another worksheet)',
    attemptDedupKey(uid, { ...sub, submissionId: 'ws-2' }) !== firstGrade);
  check('a NEW answer where one context allows several (a retry) gets a NEW key',
    attemptDedupKey(uid, { ...sub, answerKey: 'o:1' }) !== attemptDedupKey(uid, { ...sub, answerKey: 'o:2' }));
  // Latest wins — the REAL store function, not a re-derivation.
  const stale = { id: 'k1', marksScored: 0, marksAvailable: 1 };
  const latest = { id: 'k1', marksScored: 1, marksAvailable: 1 };
  const otherSub = { id: 'k2', marksScored: 1, marksAvailable: 1 };
  const replaced = upsertAttempt([otherSub, stale], latest);
  check('latest wins: a re-grade REPLACES the stored attempt in place (still one attempt per submission, the new score)',
    replaced.outcome === 'replaced' && replaced.attempts.length === 2
      && replaced.attempts[1].marksScored === 1 && replaced.attempts[0] === otherSub,
    JSON.stringify(replaced));
  check('the SAME outcome again writes nothing ("duplicate" — a cache-restore is a no-op)',
    upsertAttempt([latest], { ...latest }).outcome === 'duplicate');
  check('a NEW submission is appended ("recorded")',
    (() => { const r = upsertAttempt([latest], otherSub); return r.outcome === 'recorded' && r.attempts.length === 2; })());
  // superseded by owner ruling 2026-10-05: re-grade replaces — WAS a "negative control" comparing two
  // strings this gate built itself (the old score-in-key formula), which no product change could
  // turn red (verifier N4). NOW a CONTROL on the REAL functions: the one identity still keeps two
  // practice questions apart — a product change that dropped the question from it goes red here.
  const keyQ1 = attemptDedupKey(uid, { ...practiceCardAttemptIdentity('bank-q-1'), mode: 'mcq' });
  const keyQ2 = attemptDedupKey(uid, { ...practiceCardAttemptIdentity('bank-q-2'), mode: 'mcq' });
  const twoQuestions = upsertAttempt([{ id: keyQ1, marksScored: 1, marksAvailable: 1 }], { id: keyQ2, marksScored: 1, marksAvailable: 1 });
  check('CONTROL: two DIFFERENT practice questions stay TWO attempts (the REAL identity + the REAL upsertAttempt)',
    keyQ1 !== keyQ2 && twoQuestions.outcome === 'recorded' && twoQuestions.attempts.length === 2,
    `q1=${keyQ1} q2=${keyQ2} outcome=${twoQuestions.outcome}`);
  check('different questions stay distinct',
    attemptDedupKey(uid, { questionId: 'q-A' }, 1, 1) !== attemptDedupKey(uid, { questionId: 'q-B' }, 1, 1));
  check('different users stay distinct',
    attemptDedupKey('u1', { questionId: 'q' }, 1, 1) !== attemptDedupKey('u2', { questionId: 'q' }, 1, 1));
  // No stable id → hashed question text, still mode-independent.
  check('free-typed (no questionId) is also mode-independent',
    attemptDedupKey(uid, { question: 'Prove √2 irrational', mode: 'mcq' }, 3, 3)
    === attemptDedupKey(uid, { question: 'Prove √2 irrational', mode: 'graded' }, 3, 3));

  // superseded by owner ruling 2026-10-05: re-grade replaces — WAS a "negative control" comparing the
  // OLD mode-in-key formula with itself (built in this gate; it could not fail — verifier N4). NOW a
  // CONTROL on the REAL key: the identity DOES carry the surface, so the practice card and another
  // host of the same bank question (the standalone SolutionChecker, same empty submission) stay two
  // attempts — a product change that dropped the surface from the identity goes red here.
  check('CONTROL: the REAL key keeps the surface — the same question on the practice card and on the standalone SolutionChecker are TWO keys',
    attemptDedupKey(uid, { ...practiceCardAttemptIdentity('bank-q-1'), mode: 'mcq' })
      !== attemptDedupKey(uid, { surface: 'solution-checker', questionId: 'bank-q-1', mode: 'graded' }));
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
