// Uniform OBJECTIVE (MCQ / Assertion-Reason / Section A) scoring — the SINGLE
// source of truth for the invariant every grading surface must obey:
//
//   THE INVARIANT: an OBJECTIVE question scores 0 or FULL marks — never a fraction,
//   never step-distributed. CBSE defines no step marking for MCQs. Working, when a
//   student supplies it, is analysed ONLY to classify the mistake type (Mistake
//   Intelligence); it NEVER affects the marks.
//
// Every helper here is PURE (no I/O, no network, no clock) so the two grader
// functions in `checkSolution.cjs` (handleCheckSolution AND normaliseStructuredResult)
// call the exact same logic — the clamp + guard cannot drift between them because
// there is only ONE implementation. The client (Quick Practice) mirrors the
// normalise/compare semantics in a TS twin (`src/lib/objectiveScoring.ts`) pinned by
// a parity unit test, so no surface can diverge.
//
// Answer-key shape (verified against the banks in STEP 0): the canonical banks store
// the correct answer in `q.answer` as the OPTION TEXT (e.g. "7", "Acidic solution",
// "Both A and R are true, ..."), matching one of `q.options[]` — NOT a bare letter.
// A student's handwritten pick, however, may be a LETTER ("(b)", "B") or the option
// text. So the compare must bridge both shapes via `q.options`.

const { isObjectiveType } = require('../services/serverUtils.cjs');

// isObjective(q): delegate to the canonical classifier — never fork the rule so the
// worksheet grader, the per-question grader and Quick Practice all agree.
function isObjective(q) {
  if (!q) return false;
  return isObjectiveType(q.qType || q.format, q.section);
}

// normaliseOption(s): collapse an option letter or option text to a comparable form
// — lowercase, punctuation → space, whitespace squeezed, trimmed. So "(a)", "A",
// "a", "a." all become "a"; option text compares case/space/punctuation-insensitively.
function normaliseOption(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[()[\]{}.,:;!?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// A single option letter a–h (after normalisation), else -1.
function letterIndex(norm) {
  return /^[a-h]$/.test(norm) ? norm.charCodeAt(0) - 97 : -1;
}

// resolveOptionIndex(pick, options): map a pick (letter OR option text) to the index
// of the matching option, or -1 if it cannot be resolved. Handles both shapes the
// banks and handwriting use. Mirrors the client PracticeQuestionCard resolution
// (parity-tested): letter → position; exact text → index; partial text → index.
function resolveOptionIndex(pick, options) {
  const opts = Array.isArray(options) ? options : [];
  const norm = normaliseOption(pick);
  if (!norm) return -1;
  // Letter form, but only when we actually have that many options.
  const li = letterIndex(norm);
  if (li >= 0 && li < opts.length) return li;
  if (opts.length === 0) return -1;
  // Exact option-text match.
  const exact = opts.findIndex((o) => normaliseOption(o) === norm);
  if (exact >= 0) return exact;
  // Partial match (handwriting may carry extra words) — mirrors the client fallback,
  // but the CONTAINED string must be ≥3 chars so a short token (e.g. a 1-digit numeric
  // option "1", or a corrupt key fragment) can't spuriously match inside unrelated
  // text. Corrupt keys that match nothing return -1 → scoreObjective defers to the model.
  return opts.findIndex((o) => {
    const no = normaliseOption(o);
    if (no.length === 0) return false;
    if (no.length >= 3 && norm.includes(no)) return true;
    if (norm.length >= 3 && no.includes(norm)) return true;
    return false;
  });
}

// scoreObjective({ answerKey, studentPick, options, totalMarks })
//   → { marksAwarded: 0 | totalMarks, correct: boolean, resolved: boolean }
// NEVER returns a fraction. We only claim `resolved: true` when we are CONFIDENT:
//   • a direct normalised match (letter==letter or text==text)              → correct, OR
//   • both the key and the pick map to a distinct valid option index        → compare.
// Everything else — a missing key/pick, an unbridgeable letter↔text gap, a corrupt
// answer key that matches no option (~86 broken `.pyq` rows), or an assertion-reason
// question with no options[] (15 rows) — returns `resolved: false` so the caller falls
// back to the model's BINARY verdict (still clamped to 0/full). We NEVER force a wrong
// 0 on data we could not confidently score.
function scoreObjective({ answerKey, studentPick, options, totalMarks }) {
  const full = Number(totalMarks) > 0 ? Number(totalMarks) : 1;
  const keyNorm = normaliseOption(answerKey);
  const pickNorm = normaliseOption(studentPick);

  if (!keyNorm || !pickNorm) return { marksAwarded: 0, correct: false, resolved: false };

  // A direct normalised match is always trustworthy (handles bare-letter banks where
  // answer + options are BOTH letters, and exact option-text picks).
  if (keyNorm === pickNorm) return { marksAwarded: full, correct: true, resolved: true };

  const opts = Array.isArray(options) ? options : [];
  const keyIdx = resolveOptionIndex(answerKey, opts);
  const pickIdx = resolveOptionIndex(studentPick, opts);
  // Both map to a valid option index → authoritative compare (bridges letter↔text).
  if (keyIdx >= 0 && pickIdx >= 0) {
    const correct = keyIdx === pickIdx;
    return { marksAwarded: correct ? full : 0, correct, resolved: true };
  }

  // Both sides are clean single letters — directly comparable even with no options[]
  // (e.g. a letter answer key vs a letter pick). "a" vs "b" is a confident MISS.
  const keyLetter = letterIndex(keyNorm);
  const pickLetter = letterIndex(pickNorm);
  if (keyLetter >= 0 && pickLetter >= 0) {
    const correct = keyLetter === pickLetter;
    return { marksAwarded: correct ? full : 0, correct, resolved: true };
  }

  // Cannot confidently decide (corrupt key, letter↔text with no options to bridge, or
  // garbled pick) → let the model's binary verdict stand; the clamp keeps it 0/full.
  return { marksAwarded: 0, correct: false, resolved: false };
}

// The student's chosen option, read from the model's per-step `studentWork` (the
// first non-empty one). Empty when the student left the objective answer blank.
function firstStudentPick(steps) {
  const list = Array.isArray(steps) ? steps : [];
  for (const s of list) {
    const w = s && s.studentWork != null ? String(s.studentWork).trim() : '';
    if (w) return w;
  }
  return '';
}

// The model's BINARY verdict for an objective question, derived from its per-step
// statuses — used when there is no answer key (external C&I / tutor upload) or when
// the key compare was unresolved. Correct iff every listed step is "correct" (a
// single answer step in the normal MCQ case); any non-correct step → wrong.
function modelSaysObjectiveCorrect(steps) {
  const list = (Array.isArray(steps) ? steps : []).filter(Boolean);
  if (list.length === 0) return false;
  return list.every((s) => s.status === 'correct');
}

// clampObjectiveResult(question, steps, totalMarks) → { marksAwarded, correct }
// THE deterministic post-model clamp (defense-in-depth; independent of the prompt).
// For an objective question it collapses the model's per-step awards into ONE
// whole-question verdict: marksAwarded is `totalMarks` (correct) or `0` (incorrect) —
// NEVER a fraction, NEVER totalMarks/steps.length. It MUTATES `steps` in place to
// strip per-step marks (objective steps carry NO marks) and align each step's status
// to the verdict, so the ✓/✗ display and the (later) mistake-type guard both see a
// consistent status. The whole-question mark lives at the question level, not in the
// steps.
//
// Correctness is decided by (in order):
//   1. the deterministic key compare (scoreObjective) when an answer key + a readable
//      pick are present — authoritative, OVERRIDES the model;
//   2. otherwise the model's binary verdict (no key, or unresolved compare).
function clampObjectiveResult(question, steps, totalMarks) {
  const full = Number(totalMarks) > 0 ? Number(totalMarks) : 1;
  const q = question || {};
  const answerKey =
    q.answer != null && String(q.answer).trim()
      ? String(q.answer).trim()
      : q.correctOption != null
        ? String(q.correctOption).trim()
        : '';
  const studentPick = firstStudentPick(steps);

  let correct;
  if (answerKey && studentPick) {
    const scored = scoreObjective({ answerKey, studentPick, options: q.options, totalMarks: full });
    correct = scored.resolved ? scored.correct : modelSaysObjectiveCorrect(steps);
  } else {
    correct = modelSaysObjectiveCorrect(steps);
  }

  // Strip per-step marks and align status — objective steps carry NO marks.
  const list = Array.isArray(steps) ? steps : [];
  for (const s of list) {
    if (!s) continue;
    s.marksAwarded = 0;
    s.marksDeducted = 0;
    // Align the answer step's status to the verdict (only flip a decisive status so a
    // "missing" / blank step stays honest). A correct verdict → "correct"; an
    // incorrect verdict on an attempted step → "incorrect" (drives the MI guard).
    if (s.status === 'correct' || s.status === 'incorrect' || s.status === 'partial') {
      s.status = correct ? 'correct' : 'incorrect';
    }
  }

  return { marksAwarded: correct ? full : 0, correct };
}

// objectiveHasWorking(studentWork, options): does the objective answer carry actual
// WORKING (reasoning) beyond the bare option pick? A bare pick — an option letter or
// the option text and nothing more — has nothing to classify, so a wrong bare pick
// must NEVER carry a fabricated mistake type (MI honesty doctrine). Reasoning written
// alongside a wrong pick DOES carry a classifiable mistake — that is the feature.
function objectiveHasWorking(studentWork, options) {
  const norm = normaliseOption(studentWork);
  if (!norm) return false; // blank → no working
  if (/^[a-h]$/.test(norm)) return false; // bare letter pick: "a", "(b)", "c."
  const opts = Array.isArray(options) ? options : [];
  if (opts.some((o) => normaliseOption(o) === norm)) return false; // bare text pick
  return true; // substantive text beyond a pick → working (prompt handles compound picks)
}

// applyObjectiveMistakeGuard(steps, { objective, options }) → noWorkingNulled tally.
// The SHARED mistake-type honesty guard both grader functions run (so they are
// byte-aligned by construction). It nulls a fabricated mistakeType ONLY when there is
// no working to classify:
//   • any question:  an empty studentWork (undiagnosable — mirror of the old guard);
//   • objective:     a bare option pick (letter or option text, nothing more).
// A wrong objective answer WITH real written working KEEPS its type so MI can learn.
// Marks are NOT touched here — they are already fixed (objective by clampObjectiveResult,
// subjective by the step sum). Returns the per-category count of the types it nulled so
// the caller's additive-floor reconcile can subtract them from the model's raw summary.
function applyObjectiveMistakeGuard(steps, opts) {
  const objective = Boolean(opts && opts.objective);
  const options = opts && opts.options;
  const noWorkingNulled = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  const list = Array.isArray(steps) ? steps : [];
  for (const s of list) {
    if (!s) continue;
    const hasWorking = objective
      ? objectiveHasWorking(s.studentWork, options)
      : Boolean(s.studentWork && String(s.studentWork).trim());
    if (s.status === 'incorrect' && !hasWorking) {
      if (s.mistakeType && Object.prototype.hasOwnProperty.call(noWorkingNulled, s.mistakeType)) {
        noWorkingNulled[s.mistakeType] += 1;
      }
      s.mistakeType = null;
    }
  }
  return noWorkingNulled;
}

module.exports = {
  isObjective,
  normaliseOption,
  letterIndex,
  resolveOptionIndex,
  scoreObjective,
  firstStudentPick,
  modelSaysObjectiveCorrect,
  clampObjectiveResult,
  objectiveHasWorking,
  applyObjectiveMistakeGuard,
};
