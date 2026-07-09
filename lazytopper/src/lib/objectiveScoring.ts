// Client twin of `server/routes/objectiveScoring.cjs`. Quick Practice grades MCQs
// client-side (in the browser, zero API cost), so it must use the EXACT same
// normalise/compare semantics as the server graders — otherwise a surface could
// diverge. This file MUST stay behaviourally identical to the .cjs module; a parity
// unit test (`objectiveScoring.parity.test.ts`) asserts it across a case table.
//
// Only the pure compare helpers live here (the clamp / mistake-type guard are
// server-grader concerns). Keep the bodies byte-for-byte with the .cjs equivalents.

export function normaliseOption(s: unknown): string {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[()[\]{}.,:;!?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function letterIndex(norm: string): number {
  return /^[a-h]$/.test(norm) ? norm.charCodeAt(0) - 97 : -1;
}

/** Map a pick (letter OR option text) to the index of the matching option, or -1. */
export function resolveOptionIndex(pick: unknown, options: readonly string[] | undefined): number {
  const opts = Array.isArray(options) ? options : [];
  const norm = normaliseOption(pick);
  if (!norm) return -1;
  const li = letterIndex(norm);
  if (li >= 0 && li < opts.length) return li;
  if (opts.length === 0) return -1;
  const exact = opts.findIndex((o) => normaliseOption(o) === norm);
  if (exact >= 0) return exact;
  return opts.findIndex((o) => {
    const no = normaliseOption(o);
    if (no.length === 0) return false;
    if (no.length >= 3 && norm.includes(no)) return true;
    if (norm.length >= 3 && no.includes(norm)) return true;
    return false;
  });
}

export interface ObjectiveScore {
  marksAwarded: number;
  correct: boolean;
  resolved: boolean;
}

/** 0/full deterministic score — NEVER a fraction. `resolved` false → cannot decide. */
export function scoreObjective(args: {
  answerKey: unknown;
  studentPick: unknown;
  options?: readonly string[];
  totalMarks: number;
}): ObjectiveScore {
  const full = Number(args.totalMarks) > 0 ? Number(args.totalMarks) : 1;
  const keyNorm = normaliseOption(args.answerKey);
  const pickNorm = normaliseOption(args.studentPick);
  if (!keyNorm || !pickNorm) return { marksAwarded: 0, correct: false, resolved: false };
  if (keyNorm === pickNorm) return { marksAwarded: full, correct: true, resolved: true };
  const opts = Array.isArray(args.options) ? args.options : [];
  const keyIdx = resolveOptionIndex(args.answerKey, opts);
  const pickIdx = resolveOptionIndex(args.studentPick, opts);
  if (keyIdx >= 0 && pickIdx >= 0) {
    const correct = keyIdx === pickIdx;
    return { marksAwarded: correct ? full : 0, correct, resolved: true };
  }
  const keyLetter = letterIndex(keyNorm);
  const pickLetter = letterIndex(pickNorm);
  if (keyLetter >= 0 && pickLetter >= 0) {
    const correct = keyLetter === pickLetter;
    return { marksAwarded: correct ? full : 0, correct, resolved: true };
  }
  return { marksAwarded: 0, correct: false, resolved: false };
}

/**
 * The canonical correct-option index for an MCQ, for Quick Practice's client-side
 * grading. Precedence mirrors the original PracticeQuestionCard logic: a legacy
 * `correctOption` letter first, then the bank `answer` (option text / letter),
 * resolved against `options`. Returns -1 when it cannot be determined so grading
 * stays honest (no guess). Uses the SAME `resolveOptionIndex` the server uses.
 */
export function resolveCorrectOptionIndex(
  correctOption: string | undefined,
  answer: string | undefined,
  options: readonly string[] | undefined,
): number {
  const opts = Array.isArray(options) ? options : [];
  if (correctOption) {
    const idx = resolveOptionIndex(correctOption, opts);
    if (idx >= 0) return idx;
  }
  if (answer) {
    const idx = resolveOptionIndex(answer, opts);
    if (idx >= 0) return idx;
  }
  return -1;
}
