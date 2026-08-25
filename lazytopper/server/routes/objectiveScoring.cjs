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

// ─── THE PICK MUST BE THE PICK ────────────────────────────────────────────────
// extractOptionPick(steps, options) → { pick, stepIndex }
//
// The student's CHOSEN OPTION, read from the per-step `studentWork`. An objective
// answer IS an option, so ONLY an option may be read as one.
//
// ⚠⚠ THIS REPLACES `firstStudentPick`, WHICH TOOK THE FIRST NON-EMPTY WORKING LINE.
// On an upload whose first line is `D = b^2 - 4ac`, that string became the "pick";
// the key compare then could not normalise it, returned `resolved: false`, and the
// ANSWER KEY WAS ABANDONED — uploaded working defeated a correct answer even where a
// key was sent. That is the invariant at the top of this file violated by its own
// input. A student's working must never be mistaken for their answer.
//
// Recognised forms, in order of confidence:
//   1. the WHOLE line is a bare option letter — "a", "(b)", "C.";
//   2. the WHOLE line is an option's text (the bank shape) — "7", "Acidic solution";
//   3. an explicit declaration inside a longer line — "Answer: (a)", "Ans = b",
//      "Option c", "I picked d", "chose (b)";
//   4. a declaration whose value is an option's TEXT — "Answer: 7".
// ⚠ NOTHING ELSE. When no option can be identified we return an EMPTY pick and let
// the caller decide honestly — we NEVER fall back to an arbitrary working line.
// ★ `stepIndex` is the step the pick was read from: THE ANSWER STEP. It is the only
// step whose status the clamp may align (see clampObjectiveResult).
const OPTION_DECLARATION_LETTER =
  /(?:\banswer\b|\bans\b|\boption\b|\bopt\b|\bpicked\b|\bpick\b|\bchose\b|\bchoose\b|\bchoice\b|\bselected\b|\bselect\b)\s*(?:is\s*)?(?:[=:\-–—]\s*)?\(?\s*([a-hA-H])\s*\)?(?![a-zA-Z0-9])/i;
const OPTION_DECLARATION_VALUE =
  /(?:\banswer\b|\bans\b|\boption\b|\bopt\b)\s*(?:is\s*)?(?:[=:\-–—]\s*)?(.+)$/i;

function extractOptionPick(steps, options) {
  const list = Array.isArray(steps) ? steps : [];
  const opts = Array.isArray(options) ? options : [];
  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    const w = s && s.studentWork != null ? String(s.studentWork).trim() : '';
    if (!w) continue;
    const norm = normaliseOption(w);
    if (!norm) continue;
    // (1) whole line is a bare option letter.
    if (/^[a-h]$/.test(norm)) return { pick: norm, stepIndex: i };
    // (2) whole line is an option's text.
    if (opts.some((o) => normaliseOption(o) === norm)) return { pick: w, stepIndex: i };
    // (3) an explicit letter declaration inside a longer line.
    const ml = OPTION_DECLARATION_LETTER.exec(w);
    if (ml) return { pick: ml[1].toLowerCase(), stepIndex: i };
    // (4) a declaration whose value is an option's text.
    const mv = OPTION_DECLARATION_VALUE.exec(w);
    if (mv) {
      const cand = mv[1].trim();
      if (cand && opts.some((o) => normaliseOption(o) === normaliseOption(cand))) {
        return { pick: cand, stepIndex: i };
      }
    }
  }
  return { pick: '', stepIndex: -1 };
}

// modelStatedAnswerCorrect(v): the model's OWN stated verdict on the student's final
// answer (`finalAnswerCorrect`), as a TRI-STATE — true / false / null for "not stated".
// ⚠⚠ THIS REPLACES `modelSaysObjectiveCorrect`, WHICH DERIVED THE VERDICT FROM THE
// PER-STEP STATUSES (`list.every((s) => s.status === 'correct')`). One flagged step in
// an upload destroyed the mark — the invariant at the top of this file violated in a
// single line. ★ A STEP'S STATUS MUST NEVER CONTRIBUTE TO AN OBJECTIVE MARK, BY ANY
// PATH, so the deriving function is GONE rather than merely unused: there is no longer
// anything in this module that can turn a step status into a mark.
// ★ ABSENT MEANS UNKNOWABLE, NOT WRONG — a null here yields an honest could-not-read
// outcome at the clamp, never a fabricated 0 and never a fabricated full mark.
function modelStatedAnswerCorrect(v) {
  if (v === true || v === 'true') return true;
  if (v === false || v === 'false') return false;
  return null;
}

// clampObjectiveResult(question, steps, totalMarks, modelFinalAnswerCorrect)
//   -> { marksAwarded, correct, resolved }
// THE deterministic post-model clamp (defense-in-depth; independent of the prompt).
// For an objective question it collapses the model's per-step awards into ONE
// whole-question verdict: marksAwarded is `totalMarks` (correct) or `0` (incorrect) -
// NEVER a fraction, NEVER totalMarks/steps.length. It MUTATES `steps` in place to
// strip per-step marks (objective steps carry NO marks) and to align THE ANSWER STEP's
// status to the verdict. The whole-question mark lives at the question level.
//
// THE OWNER'S BINDING RULING, which is also this file's own written invariant:
// AN OBJECTIVE QUESTION IS SCORED 0 OR FULL ON THE ANSWER ALONE, exactly as in a real
// CBSE exam. The uploaded solution exists ONLY so a student can see the gap in their
// understanding. IT MUST NEVER CHANGE THE MARK - it may neither DESTROY a correct
// answer's mark nor RESCUE a wrong one.
//
// Correctness is decided by (in order):
//   1. the deterministic key compare (scoreObjective) against the EXTRACTED OPTION,
//      when an answer key + a readable option pick are present - authoritative;
//   2. otherwise the model's OWN STATED verdict on the final answer
//      (`finalAnswerCorrect`), passed in by the caller;
//   3. otherwise NOTHING - `resolved: false`, an honest "we could not read the answer".
//      We do NOT infer a verdict from the step statuses. That inference WAS step 2
//      and it is the whole defect: one flagged line of working scored a correct MCQ 0.
//
// `modelFinalAnswerCorrect` must be the model's RAW stated value - never the output
// of `resolveFinalAnswerCorrect`, which falls back to the LAST STEP'S STATUS. Routing
// the derivation through that helper would reinstate the defect by another door.
function clampObjectiveResult(question, steps, totalMarks, modelFinalAnswerCorrect) {
  const full = Number(totalMarks) > 0 ? Number(totalMarks) : 1;
  const q = question || {};
  const answerKey =
    q.answer != null && String(q.answer).trim()
      ? String(q.answer).trim()
      : q.correctOption != null
        ? String(q.correctOption).trim()
        : '';
  const { pick: studentPick, stepIndex: answerStepIndex } = extractOptionPick(steps, q.options);

  let correct = false;
  let resolved = false;

  // 1. The answer key, compared against the EXTRACTED OPTION (never a working line).
  if (answerKey && studentPick) {
    const scored = scoreObjective({ answerKey, studentPick, options: q.options, totalMarks: full });
    if (scored.resolved) {
      correct = scored.correct;
      resolved = true;
    }
  }

  // 2. The model's own stated final-answer verdict. Tri-state: absent leaves us unresolved.
  if (!resolved) {
    const stated = modelStatedAnswerCorrect(modelFinalAnswerCorrect);
    if (stated !== null) {
      correct = stated;
      resolved = true;
    }
  }

  // Strip per-step marks - objective steps carry NO marks, resolved or not.
  const list = Array.isArray(steps) ? steps : [];
  for (const s of list) {
    if (!s) continue;
    s.marksAwarded = 0;
    s.marksDeducted = 0;
  }

  // Align ONLY THE ANSWER STEP's status to the verdict.
  // Every OTHER step keeps the status the model reported. They are DIAGNOSTIC: they
  // carry no marks and their annotations are true. Overwriting them all is what put
  // `Incorrect` beside a teacher annotation reading "Correct formula" - two opposite
  // verdicts on one line. A step annotated correct must never be displayed as incorrect.
  // Only a DECISIVE status is flipped, so a "missing" / blank step stays honest.
  if (resolved && answerStepIndex >= 0) {
    const s = list[answerStepIndex];
    if (s && (s.status === 'correct' || s.status === 'incorrect' || s.status === 'partial')) {
      s.status = correct ? 'correct' : 'incorrect';
    }
  }

  // 3. Could not read the answer. Honest: no mark, and `resolved: false` so a caller
  // can say so rather than presenting a derived 0 as a graded one.
  if (!resolved) return { marksAwarded: 0, correct: false, resolved: false };

  return { marksAwarded: correct ? full : 0, correct, resolved: true };
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
  extractOptionPick,
  modelStatedAnswerCorrect,
  clampObjectiveResult,
  objectiveHasWorking,
  applyObjectiveMistakeGuard,
};
