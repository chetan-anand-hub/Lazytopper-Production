// Client twin of `server/routes/objectiveScoring.cjs`. Quick Practice grades MCQs
// client-side (in the browser, zero API cost), so it must use the EXACT same
// normalise/compare semantics as the server graders — otherwise a surface could
// diverge. This file MUST stay behaviourally identical to the .cjs module; a parity
// unit test (`objectiveScoring.parity.test.ts`) asserts it across a SHARED fixture table
// (`server/grading/objectiveParity.fixtures.json`) that the server suite reads too.
//
// Only the pure compare helpers live here (the clamp / mistake-type guard are
// server-grader concerns). Keep the bodies byte-for-byte with the .cjs equivalents.

export function normaliseOption(s: unknown): string {
  return normaliseOptionKeepCase(s).toLowerCase();
}

/** The same collapse WITHOUT folding case. */
export function normaliseOptionKeepCase(s: unknown): string {
  return String(s == null ? "" : s)
    .replace(/[()[\]{}.,:;!?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * C5 (GRADER-CORE-1) · case matters only when the options say so: genetics MCQs offer
 * "TTWW" / "TTww" / "TtWW" / "TtWw", which fold to ONE string, so a folded compare scored
 * every option full. Compare case-sensitively exactly when two options differ only by case.
 */
export function optionsDifferOnlyByCase(options: readonly string[] | undefined): boolean {
  const opts = Array.isArray(options) ? options : [];
  for (let i = 0; i < opts.length; i += 1) {
    for (let j = i + 1; j < opts.length; j += 1) {
      const a = normaliseOptionKeepCase(opts[i]);
      const b = normaliseOptionKeepCase(opts[j]);
      if (a && a !== b && a.toLowerCase() === b.toLowerCase()) return true;
    }
  }
  return false;
}

function optionNormaliser(options: readonly string[] | undefined): (s: unknown) => string {
  return optionsDifferOnlyByCase(options) ? normaliseOptionKeepCase : normaliseOption;
}

function letterIndex(norm: string): number {
  return /^[a-h]$/.test(norm) ? norm.charCodeAt(0) - 97 : -1;
}

/** Map a pick (letter OR option text) to the index of the matching option, or -1. */
export function resolveOptionIndex(pick: unknown, options: readonly string[] | undefined): number {
  const opts = Array.isArray(options) ? options : [];
  const N = optionNormaliser(opts);
  const norm = N(pick);
  if (!norm) return -1;
  const li = letterIndex(norm.toLowerCase());
  if (li >= 0 && li < opts.length) return li;
  if (opts.length === 0) return -1;
  const exact = opts.findIndex((o) => N(o) === norm);
  if (exact >= 0) return exact;
  return opts.findIndex((o) => {
    const no = N(o);
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
  const N = optionNormaliser(args.options);
  const keyNorm = N(args.answerKey);
  const pickNorm = N(args.studentPick);
  if (!keyNorm || !pickNorm) return { marksAwarded: 0, correct: false, resolved: false };
  if (keyNorm === pickNorm) return { marksAwarded: full, correct: true, resolved: true };
  const opts = Array.isArray(args.options) ? args.options : [];
  const keyIdx = resolveOptionIndex(args.answerKey, opts);
  const pickIdx = resolveOptionIndex(args.studentPick, opts);
  if (keyIdx >= 0 && pickIdx >= 0) {
    const correct = keyIdx === pickIdx;
    return { marksAwarded: correct ? full : 0, correct, resolved: true };
  }
  const keyLetter = letterIndex(keyNorm.toLowerCase());
  const pickLetter = letterIndex(pickNorm.toLowerCase());
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
