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

import { ensureBankSubject, getBankRowsForSubject, isAiGeneratedBankId } from "../../data/bankChapters/loader";
import { stableHash8 } from "../../services/sessionRecords";
import { desktopTopicBySlug } from "../../lib/desktop/topics";
import type { DesktopSubject } from "../../lib/desktop/navigation";

/** The bank fields this picker reads (any served CanonicalQuestion fits). */
export interface BoardTryRow {
  id?: unknown;
  subject?: unknown;
  topicKey?: unknown;
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

const WRITTEN_FORMAT = /^(short|vsa)$/i;
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
 * True for a written (non-MCQ) Section B/C board question of 2-3 marks that a student can read
 * as plain text: a served row from a CBSE board paper (a `pyqYear` and a "PYQ ..." paper
 * reference), no options, no figure / table / choice, clean text, step-marked solution.
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
  if (!["B", "C"].includes(String(row.section ?? "").trim())) return false;
  const marks = Number(row.marks);
  if (marks !== 2 && marks !== 3) return false;
  if (!WRITTEN_FORMAT.test(String(row.format ?? "").trim())) return false;
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
  const pool = rows.filter(isBoardTryRow);
  if (pool.length === 0) return null;
  const fresh = pool.filter((r) => !exclude.has(String(r.id)));
  const from = fresh.length > 0 ? fresh : pool;
  const rank = (r: BoardTryRow): number => parseInt(stableHash8(`${String(r.id)}|${rotation}`), 16);
  return [...from].sort((a, b) => rank(a) - rank(b) || String(a.id).localeCompare(String(b.id)))[0] ?? null;
}

/**
 * One board question for `subject` from the SERVED rows (withheld rows are never in
 * getBankRowsForSubject), or null when the subject has none. AI-pack rows are dropped here.
 */
export async function pickBoardTryQuestion(args: {
  subject: DesktopSubject;
  exclude?: ReadonlySet<string>;
  rotation: number;
}): Promise<BoardTryQuestion | null> {
  await ensureBankSubject(args.subject);
  const rows = (getBankRowsForSubject(args.subject) as unknown as BoardTryRow[]).filter(
    (r) => String(r.subject ?? "") === args.subject && !isAiGeneratedBankId(String(r.id ?? "")),
  );
  const row = chooseBoardTryRow(rows, args.exclude ?? new Set(), args.rotation);
  if (!row) return null;
  return { id: String(row.id), subject: args.subject, text: boardTryText(row), label: boardTryLabel(row) };
}
