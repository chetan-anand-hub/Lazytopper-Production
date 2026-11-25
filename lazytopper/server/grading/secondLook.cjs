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
//       quoted first line is in its own work — the strict test: partial = false); G2b: and it must have an ANCHOR,
//       a quotable quoted first line found in its own work — objective questions too (presence is not enough);
//   G3  the model must say the work addresses THIS question ("yes" / "partly"); G3b: an anchor that reproduces a
//       printed question of the paper is never an answer;
//   G4  its anchor must not be the same writing as any answer the first reading already GRADED for another question,
//       nor may most of its credited working be (G4b); two rescued questions may not share an anchor or working either.
//       "Same writing" folds LaTeX/Unicode and accepts a reordered transcription; a line under 10 characters
//       ("Given:") can never prove it;
//   G5  a printed number that repeats in the paper is never second-looked (the number would be ambiguous).
//   G0  (cost) a "not found" question is looked for again ONLY when the first reading reported an answer on the
//       pages it could not place (`unplacedAnswers`); a question the student simply skipped costs nothing.
// Anything that fails a guard keeps its first-reading result, unchanged.

const { gramContainment, stripAnswerLabel, firstLineInWork, delatex, compactText } = require('./postprocess.cjs');

/** Reasons the second look may revisit (G1).
 *  couldNotRead: the model itself said "not found on the uploaded pages" (or could not read it) — on one document that is
 *  the same miss seen from the model's side (live 25 Nov: Q6/Q7). answerMismatch: on ONE document the answer the model took
 *  for this question (by its LABEL) is another question's — 25 Nov eval: a student numbering a shuffled paper 1), 2), 3)…
 *  had 4 of 5 correct answers zeroed this way. A timed-out / failed call and a withheld injection are NOT revisited. */
const SECOND_LOOK_REASONS = Object.freeze(['notInInventory', 'firstLineNotInWork', 'couldNotRead', 'answerMismatch']);
/** Minimum time that must be left before a second look starts, and its own cap. */
const SECOND_LOOK_MIN_MS = 20000;
// 90 s: the 25 Nov eval's one second look capped at 60 s timed out on a 4-question mixed paper and lost 2 rescues.
const SECOND_LOOK_MAX_MS = 90000;

const quotable = (l) => String(stripAnswerLabel(String(l == null ? '' : l))).replace(/\s+/g, '').length >= 4;

/** One notation for both sides (LaTeX vs Unicode, superscripts), as postprocess's firstLineInWork folds them. */
const SUPER = { '²': '^2', '³': '^3' };
const fold = (s) => delatex(String(s == null ? '' : s)).replace(/[²³]/g, (c) => SUPER[c]);
/** A line must be at least this long (folded, compacted) before it can PROVE two answers are the same writing:
 *  "Given:", "To prove:", "Let …" open many different answers (review #7). */
const PROOF_MIN = 10;

/** Are `line` and some text inside `work` the SAME writing? Strict on purpose (a false "same" drops a real rescue; a false
 *  "different" double-credits): folded notation, then whole-line inclusion, >= 80% of its 4-grams, or >= 85% of its
 *  words (>= 3 letters each, in any order — a reordered transcription). Digit-only tokens never count as words. */
function sameWriting(line, work, minLen = PROOF_MIN) {
  const l = fold(stripAnswerLabel(String(line || '')));
  const w = fold(work);
  const cl = compactText(l);
  if (cl.length < minLen || !String(w).trim()) return false;
  if (compactText(w).includes(cl)) return true;
  if (gramContainment(l, w) >= 0.8) return true;
  const words = l.normalize('NFKC').toLowerCase().split(/[^a-zα-ω]+/).filter((x) => x.length >= 3);
  if (words.length < 3) return false;
  const cw = compactText(w);
  return words.filter((x) => cw.includes(x)).length / words.length >= 0.85;
}

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

/** The credited lines of a result: the studentWork of every step that earned marks (quotable ones). */
function creditedLines(result) {
  const steps = Array.isArray(result && result.annotatedSteps) ? result.annotatedSteps : [];
  return steps.filter((s) => s && (Number(s.marksAwarded) || 0) > 0 && quotable(s.studentWork)).map((s) => String(s.studentWork));
}

/** Is any line of `lines` the same writing as something in `work`? */
function sharesAnswer(lines, work) {
  if (!String(work || '').trim()) return false;
  return (Array.isArray(lines) ? lines : []).some((l) => quotable(l) && sameWriting(l, work));
}

/** Does `line` reproduce a printed question of the paper (G3b: never an answer)? */
function isPrintedQuestion(line, questionTexts) {
  const l = fold(stripAnswerLabel(String(line || '')));
  if (compactText(l).length < PROOF_MIN) return false;
  return (questionTexts || []).some((t) => String(t || '').trim() && gramContainment(l, fold(t)) >= 0.8);
}

/** Do most of `result`'s credited lines come from `work`? (G4b: the same WORKING graded twice, whatever the first line.) */
function reusesWork(result, work) {
  const lines = creditedLines(result);
  if (lines.length === 0 || !String(work || '').trim()) return false;
  return lines.filter((l) => sameWriting(l, work)).length * 2 >= lines.length;
}

/** G0: the first reading's unplaced answers that are not part of any answer it graded nor a printed question. */
function openUnplaced(unplaced, claimedWorks, questionTexts = []) {
  const seen = new Set();
  const out = [];
  for (const l of Array.isArray(unplaced) ? unplaced : []) {
    const line = String(l || '').trim();
    if (!quotable(line) || seen.has(line)) continue;
    seen.add(line);
    if (claimedWorks.some((w) => sharesAnswer([line], w))) continue;
    if (isPrintedQuestion(line, questionTexts)) continue;
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

/**
 * Decide each candidate rescue (G2–G4). `candidates`: [{ index, raw, result, firstLines }] from the second look;
 * `claimedWorks`: the work of every answer the first reading GRADED; `questionTexts`: every printed question of the paper.
 * Only a candidate's ANCHOR lines — its quoted first lines that are really in its own work — count (review #2: the
 * inventory may also list a label-matched line that is not its answer). Returns the indices accepted.
 */
function acceptedRescues(candidates, claimedWorks, questionTexts = []) {
  const ok = [];
  for (const c of candidates) {
    if (!c || !c.result || c.result._reason !== 'graded') continue; // G2
    const addr = String((c.raw && c.raw.addressesQuestion) || '').trim().toLowerCase();
    if (addr !== 'yes' && addr !== 'partly') continue; // G3
    const own = workOf(c.result);
    // G2b: an anchor line that is really in its own work — objective questions included (presence alone is not enough here).
    // Strict (sameWriting), not postprocess's tolerant test: a 60% bag of digits matches a different answer's line.
    const anchors = (c.firstLines || []).filter((l) => quotable(l) && firstLineInWork(l, own) && sameWriting(l, own, 4));
    if (anchors.length === 0) continue;
    if (anchors.some((l) => isPrintedQuestion(l, questionTexts))) continue; // G3b: the printed question is never an answer
    if (claimedWorks.some((w) => sharesAnswer(anchors, w) || reusesWork(c.result, w))) continue; // G4: an answer already used
    ok.push({ ...c, anchors, own });
  }
  // G4 (between rescues): two rescued questions quoting or grading the same answer are both dropped.
  const clash = new Set();
  for (let a = 0; a < ok.length; a += 1) {
    for (let b = a + 1; b < ok.length; b += 1) {
      if (sharesAnswer(ok[a].anchors, ok[b].own) || sharesAnswer(ok[b].anchors, ok[a].own)
        || reusesWork(ok[a].result, ok[b].own) || reusesWork(ok[b].result, ok[a].own)) {
        clash.add(a);
        clash.add(b);
      }
    }
  }
  return ok.filter((_, i) => !clash.has(i)).map((c) => c.index);
}

module.exports = {
  openUnplaced,
  worthALook,
  sameWriting,
  isPrintedQuestion,
  reusesWork,
  SECOND_LOOK_REASONS,
  SECOND_LOOK_MIN_MS,
  SECOND_LOOK_MAX_MS,
  secondLookDisabled,
  missedIndices,
  workOf,
  sharesAnswer,
  acceptedRescues,
};
