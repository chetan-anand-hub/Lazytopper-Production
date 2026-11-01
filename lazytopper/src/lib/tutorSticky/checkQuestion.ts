/**
 * TUTOR-STICKY-1 — the tutor's one-tap check: after an explanation, ONE similar objective question from the
 * bank, graded instantly on the device. No model call, no network beyond the bank chapter the tutor already
 * loads, no stored grade.
 *
 * Pure over a list of bank rows (the caller passes `selectBankQuestions(...)`):
 *   - only an auto-gradeable MCQ (its key resolves against its own options: the #352 bar every objective
 *     surface uses) — so "right" and "wrong" are never a guess;
 *   - never a question that needs a figure, never the anchor question the thread is already about, never one
 *     already offered in this thread;
 *   - same CONCEPT (the bank row's `subtopic`) when the concept is known and an objective sibling exists;
 *     otherwise another objective question from the same chapter, and `sameConcept` says so, so the card
 *     never claims more than it knows;
 *   - deterministic (no Math.random): the next candidate in bank order, rotated by how many were offered.
 */
import { isAutoGradeableObjective } from "../../components/practice/autoGradeableObjective";
import { resolveCorrectOptionIndex, scoreObjective } from "../objectiveScoring";

export interface CheckBankRow {
  id?: unknown;
  questionText?: unknown;
  format?: unknown;
  options?: unknown;
  answer?: unknown;
  correctOption?: unknown;
  explanation?: unknown;
  subtopic?: unknown;
  requiresDiagram?: unknown;
}

export interface CheckQuestion {
  id: string;
  questionText: string;
  options: string[];
  /** Index into `options` of the official key. */
  correctIndex: number;
  /** The bank's own one-line explanation, when it has one. */
  explanation: string | null;
  /** True when the question is on the same concept (subtopic) the tutor is on. */
  sameConcept: boolean;
  subtopic: string;
}

const LETTERS = "ABCDEFGH";
const MAX_TEXT = 360;

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const norm = (v: unknown): string => str(v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const NEEDS_FIGURE = /\b(figure|diagram|graph shown|shown below|given below|image)\b/i;

export function letterOf(i: number): string {
  return LETTERS[i] ?? "";
}

export function selectCheckQuestion(args: {
  rows: readonly CheckBankRow[];
  /** The concept the tutor is on (URL `concept`, else the anchor question's subtopic). */
  concept?: string | null;
  excludeIds?: readonly string[];
}): CheckQuestion | null {
  const exclude = new Set((args.excludeIds ?? []).map(String));
  const usable: CheckQuestion[] = [];
  const want = norm(args.concept);
  for (const r of args.rows) {
    const id = str(r.id);
    const text = str(r.questionText);
    if (!id || !text || exclude.has(id)) continue;
    if (r.format !== "MCQ" || r.requiresDiagram === true || NEEDS_FIGURE.test(text)) continue;
    const options = Array.isArray(r.options) ? r.options.map((o) => String(o ?? "").trim()) : [];
    if (options.length < 2 || options.length > LETTERS.length || options.some((o) => !o)) continue;
    if (!isAutoGradeableObjective({ options, answer: str(r.answer) })) continue;
    const correctIndex = resolveCorrectOptionIndex(str(r.correctOption) || undefined, str(r.answer) || undefined, options);
    if (correctIndex < 0) continue;
    const sub = norm(r.subtopic);
    const sameConcept = Boolean(want && sub && (sub.includes(want) || want.includes(sub)));
    usable.push({
      id,
      questionText: text,
      options,
      correctIndex,
      explanation: str(r.explanation) || null,
      sameConcept,
      subtopic: str(r.subtopic),
    });
  }
  if (usable.length === 0) return null;
  const pool = (list: CheckQuestion[]) => {
    const short = list.filter((q) => q.questionText.length <= MAX_TEXT);
    return short.length > 0 ? short : list;
  };
  const same = usable.filter((q) => q.sameConcept);
  const candidates = pool(same.length > 0 ? same : usable);
  return candidates[exclude.size % candidates.length];
}

/** Instant, deterministic 0-or-full grade of one pick (the shared objective scorer). */
export function gradeCheckPick(q: CheckQuestion, pickIndex: number): boolean {
  const pick = q.options[pickIndex];
  if (pick === undefined) return false;
  return scoreObjective({ answerKey: q.options[q.correctIndex], studentPick: pick, options: q.options, totalMarks: 1 }).correct;
}
