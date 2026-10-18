// src/components/checkimprove/boardQuestionPick.ts
//
// ACTIVATION-2 D — "Try a board question" on Check & Improve: ONE real CBSE board question
// from the canonical bank, as plain text the page's own read step uses.
//
// ⚠ LOAD THIS MODULE WITH `import()` ONLY — it reaches the question bank, and
// /check-improve must stay bank-free in its static graph (src/config/bankReach.guard.test.ts).
//
// Real bank rows only: no AI pack row, no LazyTopper-generated or authored row, no row whose
// source could not be confirmed (`sourceOverride: "others"`), nothing invented, nothing graded
// in advance. The row's own text is filled into the question box; the student still taps
// "Read the question", writes an answer and taps Grade — so nothing is spent until they do.

import { bankChaptersForSubject, ensureBankChapters, getBankRows, isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { isGeneratedOrAuthoredRow, syllabusExclusion } from "../../lib/boardQuestions/selectionRule";
import { stableHash8 } from "../../services/sessionRecords";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import type { DesktopSubject } from "../../lib/desktop/navigation";

/** The bank fields this picker reads (any served CanonicalQuestion fits). */
export interface BoardTryRow {
  id?: unknown;
  subject?: unknown;
  topicKey?: unknown;
  subtopic?: unknown;
  section?: unknown;
  marks?: unknown;
  format?: unknown;
  questionText?: unknown;
  options?: unknown;
  solutionSteps?: unknown;
  pyqYear?: unknown;
  ncertRef?: unknown;
  sourceOverride?: unknown;
  requiresDiagram?: unknown;
  [key: string]: unknown;
}

/** What the page fills in: the question as the student will see it, and its honest source line. */
export interface BoardTryQuestion {
  id: string;
  subject: DesktopSubject;
  /** The bank row's text plus its real marks in the page's own "[3]" convention. */
  text: string;
  /** e.g. "CBSE board question (2025) · Electricity" */
  label: string;
}

/**
 * The written shapes on offer: a Section B/C short answer of 2-3 marks, or (BOARD-TRY-WIDEN-1,
 * owner ruling (b) 2026-10-18) a Section D long answer of 5 marks. Every other rule below applies
 * to both shapes unchanged — the same 400-character cap and the same "[N mark]" step marking.
 */
const WRITTEN_SHAPES: ReadonlyArray<{ sections: readonly string[]; marks: readonly number[]; format: RegExp }> = [
  { sections: ["B", "C"], marks: [2, 3], format: /^(short|vsa)$/i },
  { sections: ["D"], marks: [5], format: /^long$/i },
];
/** A figure, table or drawing the box cannot carry. */
const NEEDS_VISUAL = /\bfig(?:ure|\.)|diagram|\bshown\b|set-up|\bgraph\b|\btable\b|\bdraw\b|following (?:distribution|data)/i;
/** An internal choice ("OR", "Attempt either") — a first try should be ONE question. */
const HAS_CHOICE = /\bOR\b|attempt either/i;
/** A mark number bled into the text by the paper's layout ("... 15 cm. 3 Use the lens formula"). */
const MARK_BLEED = /[.:?]\s*[1-5]\s+(?:\(|[A-Z])/;
/** Every solution step carries its "[N mark]" prefix — the step-marked (repaired) rows. */
const STEP_MARK = /^\[\d+(?:\.\d+)? marks?\]/;
/** U+FFFD, the decoder's "unreadable byte" mark (built from its code so no source byte is one). */
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/**
 * True for a written (non-MCQ) Section B/C board question of 2-3 marks, or a Section D long
 * answer of 5 marks, that a student can read as plain text: a served row from a CBSE board paper
 * (a `pyqYear` and a "PYQ ..." paper reference), no options, no figure / table / choice, clean
 * text of at most 400 characters, step-marked solution.
 */
export function isBoardTryRow(row: BoardTryRow): boolean {
  const id = String(row.id ?? "");
  if (!id) return false;
  // A board-paper row: a board year and a "PYQ ..." paper reference, and a source that was
  // confirmed (BANK-FIX-1 `sourceOverride: "others"` rows are never shown as board questions).
  // Generated / authored rows carry no board year (pinned in boardQuestionPick.test.ts against
  // the live bank), so the internal provenance fields are not read here (GEN-THIN-1 guard).
  if (row.sourceOverride === "others") return false;
  if (!String(row.pyqYear ?? "").trim() || !/^PYQ\b/.test(String(row.ncertRef ?? ""))) return false;
  const section = String(row.section ?? "").trim();
  const marks = Number(row.marks);
  const format = String(row.format ?? "").trim();
  if (!WRITTEN_SHAPES.some((s) => s.sections.includes(section) && s.marks.includes(marks) && s.format.test(format))) return false;
  if (Array.isArray(row.options) && row.options.length > 0) return false;
  if (row.requiresDiagram || row.image || row.imageUrl || row.diagram || row.figure) return false;
  const text = String(row.questionText ?? "").trim();
  if (text.length < 20 || text.length > 400 || text.includes(REPLACEMENT_CHAR)) return false;
  if (NEEDS_VISUAL.test(text) || HAS_CHOICE.test(text) || MARK_BLEED.test(text)) return false;
  const steps = Array.isArray(row.solutionSteps) ? row.solutionSteps.map((s) => String(s ?? "")) : [];
  return steps.length > 0 && steps.every((s) => STEP_MARK.test(s.trim()));
}

/** The honest source line: board paper year + the chapter the bank files it under. */
export function boardTryLabel(row: BoardTryRow): string {
  const year = String(row.pyqYear ?? "").trim();
  const chapter = desktopTopicBySlug(String(row.topicKey ?? ""))?.name;
  return `CBSE board question (${year})${chapter ? ` · ${chapter}` : ""}`;
}

/** The text filled into the box: the row's own words, then its real marks as "[N]". */
export function boardTryText(row: BoardTryRow): string {
  return `${String(row.questionText ?? "").trim()} [${Number(row.marks)}]`;
}

/**
 * Choose one row from `rows` (already one subject). Never one in `exclude` while another is
 * left; the tie-break is a hash of the id and `rotation`, never Math.random (CLAUDE.md §7).
 */
export function chooseBoardTryRow(
  rows: readonly BoardTryRow[],
  exclude: ReadonlySet<string>,
  rotation: number,
): BoardTryRow | null {
  const pool = rows.filter(isOfferableRow);
  if (pool.length === 0) return null;
  const fresh = pool.filter((r) => !exclude.has(String(r.id)));
  const from = fresh.length > 0 ? fresh : pool;
  const rank = (r: BoardTryRow): number => parseInt(stableHash8(`${String(r.id)}|${rotation}`), 16);
  return [...from].sort((a, b) => rank(a) - rank(b) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

/**
 * The full RUNTIME rule: the shape rule above, never a LazyTopper-generated or authored row,
 * and inside the 2026-27 syllabus by the notes' own board-question recogniser (the same helpers
 * boardQuestionPick.test.ts pins against the live bank).
 */
export function isOfferableRow(row: BoardTryRow): boolean {
  return (
    isBoardTryRow(row) &&
    !isGeneratedOrAuthoredRow(row) &&
    syllabusExclusion({
      topicKey: String(row.topicKey ?? ""),
      subtopic: typeof row.subtopic === "string" ? row.subtopic : undefined,
      questionText: String(row.questionText ?? ""),
    }) === null
  );
}

const toQuestion = (row: BoardTryRow, subject: DesktopSubject): BoardTryQuestion => ({
  id: String(row.id),
  subject,
  text: boardTryText(row),
  label: boardTryLabel(row),
});

/**
 * One board question for `subject`, loading ONE chapter at a time (not the whole subject): the
 * starting chapter is a deterministic rotation over the subject's static chapter list, and a
 * chapter with nothing to offer (or only ids already offered) moves on to the next. Served rows
 * only (withheld rows are never in getBankRows); AI-pack rows are dropped. Null when the whole
 * subject has nothing; an already-offered question is repeated only when nothing fresh is left.
 */
export async function pickBoardTryQuestion(args: {
  subject: DesktopSubject;
  exclude?: ReadonlySet<string>;
  rotation: number;
}): Promise<BoardTryQuestion | null> {
  const chapters = bankChaptersForSubject(args.subject);
  if (chapters.length === 0) return null;
  const exclude = args.exclude ?? new Set<string>();
  const start = Math.abs(Math.floor(args.rotation)) % chapters.length;
  let repeat: BoardTryRow | null = null;
  for (let i = 0; i < chapters.length; i += 1) {
    const slug = chapters[(start + i) % chapters.length];
    await ensureBankChapters([slug]);
    const rows = (getBankRows([slug]) as unknown as BoardTryRow[]).filter(
      (r) => String(r.subject ?? "") === args.subject && !isAiGeneratedBankId(String(r.id ?? "")),
    );
    const row = chooseBoardTryRow(rows, exclude, args.rotation);
    if (!row) continue;
    if (!exclude.has(String(row.id))) return toQuestion(row, args.subject);
    repeat ??= row;
  }
  return repeat ? toQuestion(repeat, args.subject) : null;
}
