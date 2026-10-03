// src/utils/questionKey.ts
//
// THE set-level identity of a question (BANK-SPLIT-1 PR-1, owner + cofounder rulings
// 2026-10-03): no Practice, Chapter Test, Full Mock or worksheet set may contain the
// same question twice. Two rows are "the same question" in a set when their stems AND
// their option sets are equal after N1 normalisation:
//
//   questionKey(q) = N1(stem) + "|" + N1(each option), sorted, joined by "|"
//
// Marks are deliberately NOT part of the key: the same proof filed at 2 and at 3 marks
// is one question to a student, so it may appear once per set. Options ARE part of the
// key: two different MCQs that share a generic stem ("Which of the following is
// correct?") are different questions and may both appear.
//
// N1 is the scout's strict normalisation (report-bank-split-scout-1, §2 P11): Unicode
// NFKC, lower case, drop LaTeX command names (\frac, \sqrt, \text …), then drop every
// character that is not a Unicode letter or digit (spacing, punctuation, $ { } ^ _).
// Because N1 removes "|", the separator can never be forged by row content.
//
// Pure and bank-free: no data import, so any builder can use it without pulling the
// question bank into its chunk.

/** The fields the key reads. Every builder's row shape satisfies this. */
export interface QuestionKeyInput {
  id?: unknown;
  questionText?: unknown;
  text?: unknown;
  options?: unknown;
}

/** The scout's N1 normalisation. */
export function normaliseN1(s: unknown): string {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\[a-z]+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * The set-level identity of a question. A row with no stem text at all (none exists in
 * the bank today) falls back to its id, so two blank rows are never merged into one.
 */
export function questionKey(q: QuestionKeyInput): string {
  const stem = normaliseN1(q.questionText ?? q.text);
  const options = Array.isArray(q.options) ? q.options.map(normaliseN1).sort() : [];
  if (!stem && options.length === 0) return `id:${String(q.id ?? "")}`;
  return `${stem}|${options.join("|")}`;
}
