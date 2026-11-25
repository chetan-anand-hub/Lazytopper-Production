'use strict';
// server/grading/secondLook.cjs — GRADE-SECOND-LOOK-1 (owner, 25 Nov 2026).
//
// THE PROBLEM. On ONE uploaded document for many questions (Answer Checker multi, Worksheet, Chapter Test,
// Full Mock, a Quick Practice paper upload) the first reading can come back with a question "not found"
// (page inventory: no answer under its number) or "no working" (listed, but its quoted first line is not in
// its own work). Live, 25 Nov demo: 2 of 3 answers on a student's sheet were dropped and the student had to
// re-upload them one by one. Students answer out of order, number answers their own way (1, 2, 3 for a
// paper's Q5, Q6, Q8) or not at all, and the first reading matches answers by their LABEL.
//
// THE FIX. ONE extra call, ONLY for those questions, ONLY on such a paper, that finds each answer by its
// CONTENT (prompt.cjs secondLookBlock). It is held to the SAME normaliser as the first reading, plus the
// guards below, so it can only ever turn a "not found"/"no working" into a grade backed by work on the page:
//   G1  it never touches a question the first reading graded, left blank, or marked any other way;
//   G2  a rescued question must be GRADED by the one normaliser (its own page inventory lists it and its
//       quoted first line is in its own work — the strict test: partial = false);
//   G3  the model must say the work addresses THIS question ("yes" / "partly");
//   G4  its first line must NOT be in any answer the first reading already graded for another question
//       (no double use of one answer), and two rescued questions may not share an answer either;
//   G5  a printed number that repeats in the paper is never second-looked (the number would be ambiguous).
//   G0  (cost) a "not found" question is looked for again ONLY when the first reading reported an answer on the
//       pages it could not place (`unplacedAnswers`); a question the student simply skipped costs nothing.
// Anything that fails a guard keeps its first-reading result, unchanged.

const { gramContainment, stripAnswerLabel } = require('./postprocess.cjs');

/** Reasons the second look may revisit (G1). */
// couldNotRead: the model itself said "not found on the uploaded pages" (or could not read it) — on one
// document that is the same miss seen from the model's side (live 25 Nov: Q6/Q7). A timed-out or failed call
// ('timeout' / 'failed') and a withheld injection are NOT revisited.
// answerMismatch: on ONE document the answer the model took for this question (by its LABEL) is another question's
// — the 25 Nov eval: a student numbering a shuffled paper 1), 2), 3)… had 4 of 5 correct answers zeroed this way.
const SECOND_LOOK_REASONS = Object.freeze(['notInInventory', 'firstLineNotInWork', 'couldNotRead', 'answerMismatch']);
/** Minimum time that must be left before a second look starts, and its own cap. */
const SECOND_LOOK_MIN_MS = 20000;
const SECOND_LOOK_MAX_MS = 60000;

const quotable = (l) => String(stripAnswerLabel(String(l == null ? '' : l))).replace(/\s+/g, '').length >= 4;

/** Kill switch: GRADING_SECOND_LOOK_DISABLED=1 (or true) turns it off without a deploy of code. */
function secondLookDisabled(env = process.env) {
  const v = String((env && env.GRADING_SECOND_LOOK_DISABLED) || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Which result indices to revisit (G1, G5). `questions` and `results` are parallel arrays. */
function missedIndices(questions, results) {
  const counts = new Map();
  for (const q of questions) {
    const n = Number(q && q.qNumber);
    counts.set(n, (counts.get(n) || 0) + 1);
  }
  const out = [];
  results.forEach((r, i) => {
    if (!r || !SECOND_LOOK_REASONS.includes(r._reason)) return;
    if (counts.get(Number(questions[i] && questions[i].qNumber)) !== 1) return; // G5
    out.push(i);
  });
  return out;
}

/** The student's work of a graded result (all its steps' studentWork + its final answer quote). */
function workOf(result) {
  const steps = Array.isArray(result && result.annotatedSteps) ? result.annotatedSteps : [];
  return steps.map((s) => String((s && s.studentWork) || '')).concat([String((result && result.studentFinalAnswer) || '')]).join('\n');
}

/** Is any quotable line of `lines` the SAME writing as a line inside `work`? Strict on purpose (>= 80% of the line's
 *  4-grams, label stripped): postprocess's tolerant first-line test also accepts a 60% word bag, which two DIFFERENT
 *  answers sharing a few digits can pass — here a false "same answer" would wrongly drop a rescue. */
const SAME_ANSWER_MIN = 0.8;
function sharesAnswer(lines, work) {
  if (!String(work || '').trim()) return false;
  return (Array.isArray(lines) ? lines : []).some((l) => quotable(l) && gramContainment(stripAnswerLabel(String(l)), work) >= SAME_ANSWER_MIN);
}

/**
 * Decide each candidate rescue (G2–G4). `candidates`: [{ index, raw, result, firstLines }] from the second
 * look; `claimedWorks`: the work of every answer the first reading GRADED. Returns the indices accepted.
 */
function acceptedRescues(candidates, claimedWorks) {
  const ok = candidates.filter((c) => {
    if (!c || !c.result || c.result._reason !== 'graded') return false; // G2
    const addr = String((c.raw && c.raw.addressesQuestion) || '').trim().toLowerCase();
    if (addr !== 'yes' && addr !== 'partly') return false; // G3
    const lines = (c.firstLines || []).filter(quotable);
    if (lines.length === 0) return false; // nothing to tie the answer to the page
    if (claimedWorks.some((w) => sharesAnswer(lines, w))) return false; // G4: an answer already used
    return true;
  });
  // G4 (between rescues): two rescued questions quoting the same answer are both dropped.
  const clash = new Set();
  for (let a = 0; a < ok.length; a += 1) {
    for (let b = a + 1; b < ok.length; b += 1) {
      const la = (ok[a].firstLines || []).filter(quotable);
      const lb = (ok[b].firstLines || []).filter(quotable);
      if (sharesAnswer(la, workOf(ok[b].result)) || sharesAnswer(lb, workOf(ok[a].result))) {
        clash.add(a);
        clash.add(b);
      }
    }
  }
  return ok.filter((_, i) => !clash.has(i)).map((c) => c.index);
}

/** G0: the first reading's unplaced answers that are not part of any answer it graded (quotable lines only). */
function openUnplaced(unplaced, claimedWorks) {
  const seen = new Set();
  const out = [];
  for (const l of Array.isArray(unplaced) ? unplaced : []) {
    const line = String(l || '').trim();
    if (!quotable(line) || seen.has(line)) continue;
    seen.add(line);
    if (claimedWorks.some((w) => sharesAnswer([line], w))) continue;
    out.push(line);
  }
  return out.slice(0, 12);
}

/** G0: which candidates are worth one more call — "no working" (the model SAW the question) and an answer to another
 *  question (a label pointing at the wrong answer) always; "not found" / couldNotRead only when an answer on the page
 *  is still unplaced. */
function worthALook(candidates, results, open) {
  const anyOpen = Array.isArray(open) && open.length > 0;
  const strong = new Set(['firstLineNotInWork', 'answerMismatch']);
  return candidates.filter((i) => results[i] && (strong.has(results[i]._reason) || anyOpen));
}

module.exports = {
  openUnplaced,
  worthALook,
  SECOND_LOOK_REASONS,
  SECOND_LOOK_MIN_MS,
  SECOND_LOOK_MAX_MS,
  secondLookDisabled,
  missedIndices,
  workOf,
  sharesAnswer,
  acceptedRescues,
};
