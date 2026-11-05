// src/components/results/sectionTypeLens.ts
//
// SCORECARD-SECTION-TYPE-1 — the ONE place the scorecard's "By section" (A-E: scored / out of / lost)
// and "By question type" lenses are derived, for all six grading surfaces, live AND restored.
//
// PRESENTATION ONLY. Nothing here reads or changes a mark, a mistake type, a prompt or the grader.
// It reads two optional CLIENT-STAMPED fields on each graded row (`section`, `format`; see
// WorksheetQuestionGrade) and adds up the marks the grade already carries.
//
// ★ HONEST-OR-SILENT. A question with no known section / type sits in NO row (it still counts in the
// hero total, exactly as the old lens treated an unmapped mark). Nothing is guessed from the mark
// value: the old chapter-test band proxy (1→A · 2→B · 3→C · 5→D, E folded into D) is gone. The note
// under a lens says so when some questions are left out, and says "as read from your paper" when the
// section came from the student's own paper rather than the question bank.
//
// PURE and bank-free (no data/ import) so the Answer Checker chunk never pulls the bank index.

import type { WorksheetGradeResponse, WorksheetQuestionGrade } from "../../ai/aiClient";
import { isGradedQuestion } from "../../lib/mistakeDisplay";

export const SECTION_LETTERS = ["A", "B", "C", "D", "E"] as const;

/** The CBSE board-paper section names (2026-27 pattern: A objective, B VSA, C SA, D LA, E case). */
export const SECTION_LABEL: Readonly<Record<string, string>> = {
  A: "Objective",
  B: "Very short",
  C: "Short",
  D: "Long",
  E: "Case study",
};

/** "C", "c", "Section C" → "C"; anything else → null (never a guess). */
export function normaliseSectionLetter(v: unknown): string | null {
  if (v == null) return null;
  const m = /^\s*(?:section\s*[-:]?\s*)?([A-Ea-e])\s*$/i.exec(String(v));
  return m ? m[1].toUpperCase() : null;
}

export type SectionBasis = "bank" | "read" | "check";

/** One row of the by-section table. `lost` = total - awarded (never below 0). */
export interface SectionLensRow {
  section: string;
  label: string;
  awarded: number;
  total: number;
  lost: number;
  /** Graded questions in this section. */
  count: number;
  /** True when at least one of the section's questions was only INFERRED by the paper read
   *  (GRADE-SECTION-1): the row carries a "check" chip. */
  check: boolean;
}

export interface SectionLens {
  rows: SectionLensRow[];
  /** The honest line under the table, or null. */
  note: string | null;
}

/** One row of the by-question-type table. */
export interface TypeLensRow {
  key: TypeKey;
  label: string;
  awarded: number;
  total: number;
  lost: number;
  count: number;
}

export interface TypeLens {
  rows: TypeLensRow[];
  note: string | null;
}

export type TypeKey = "mcq" | "ar" | "vsa" | "short" | "long" | "case" | "objective" | "written";

const TYPE_LABEL: Readonly<Record<TypeKey, string>> = {
  mcq: "MCQ",
  ar: "Assertion-Reason",
  vsa: "Very short",
  short: "Short answer",
  long: "Long answer",
  case: "Case-based",
  objective: "MCQ / Assertion-Reason",
  written: "Written",
};

const BANK_TYPE_ORDER: readonly TypeKey[] = ["mcq", "ar", "vsa", "short", "long", "case"];
const PAPER_TYPE_ORDER: readonly TypeKey[] = ["objective", "written"];

/** A stored `format` → its type key; null for anything not known (never a guess). The bank's
 *  QuestionFormat values, the predicted-question kinds, and the Answer Checker's two read values. */
export function typeKeyOf(format: unknown): TypeKey | null {
  if (typeof format !== "string") return null;
  switch (format.trim().toLowerCase()) {
    case "mcq":
      return "mcq";
    case "assertion-reasoning":
    case "assertion-reason":
    case "assertion reasoning":
      return "ar";
    case "vsa":
      return "vsa";
    case "short":
      return "short";
    case "long":
      return "long";
    case "case-based":
    case "case based":
      return "case";
    case "objective":
      return "objective";
    case "written":
      return "written";
    default:
      return null;
  }
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/* ── derive ─────────────────────────────────────────────────────────────────── */

/**
 * The by-section table over a response's GRADED questions, from each row's stamped `section`.
 * Null when no graded question carries a section (the lens is then simply absent).
 */
export function deriveSectionLens(response: Pick<WorksheetGradeResponse, "results"> | null | undefined): SectionLens | null {
  if (!response || !Array.isArray(response.results)) return null;
  const buckets = new Map<string, { awarded: number; total: number; count: number; check: boolean }>();
  let unplaced = 0;
  let sawRead = false;
  let sawCheck = false;
  for (const r of response.results) {
    if (!isGradedQuestion(r)) continue; // not graded (unreadable / mismatch) is never a 0
    const sec = normaliseSectionLetter(r.section);
    if (!sec) {
      unplaced += 1;
      continue;
    }
    const b = buckets.get(sec) ?? { awarded: 0, total: 0, count: 0, check: false };
    b.awarded = r2(b.awarded + (Number(r.marksAwarded) || 0));
    b.total = r2(b.total + (Number(r.totalMarks) || 0));
    b.count += 1;
    if (r.sectionBasis === "check") {
      b.check = true;
      sawCheck = true;
    }
    if (r.sectionBasis === "read" || r.sectionBasis === "check") sawRead = true;
    buckets.set(sec, b);
  }
  const rows: SectionLensRow[] = SECTION_LETTERS.filter((s) => buckets.has(s)).map((s) => {
    const b = buckets.get(s)!;
    return {
      section: s,
      label: `${s} · ${SECTION_LABEL[s]}`,
      awarded: b.awarded,
      total: b.total,
      lost: r2(Math.max(0, b.total - b.awarded)),
      count: b.count,
      check: b.check,
    };
  });
  if (rows.length === 0) return null;
  const parts: string[] = [];
  if (sawRead) parts.push("Sections as read from your paper.");
  if (sawCheck) parts.push("The read wasn't sure of the rows marked “check”, so check those sections against your paper.");
  if (unplaced > 0) {
    parts.push(
      `${plural(unplaced, "question has", "questions have")} no section on record, so ${unplaced === 1 ? "it is" : "they are"} in your total but not in this table.`,
    );
  }
  return { rows, note: parts.length > 0 ? parts.join(" ") : null };
}

/**
 * The by-question-type table, from each graded row's stamped `format`. Shown only when the type is
 * actually KNOWN: at least two graded questions with a known type AND at least two distinct types
 * (a breakdown of one is not a breakdown). On the Answer Checker the only known types are
 * "MCQ / Assertion-Reason" vs "Written", as the paper read reported them.
 */
export function deriveTypeLens(response: Pick<WorksheetGradeResponse, "results"> | null | undefined): TypeLens | null {
  if (!response || !Array.isArray(response.results)) return null;
  const known: Array<{ key: TypeKey; r: WorksheetQuestionGrade }> = [];
  let unknown = 0;
  for (const r of response.results) {
    if (!isGradedQuestion(r)) continue;
    const key = typeKeyOf(r.format);
    if (key) known.push({ key, r });
    else unknown += 1;
  }
  if (known.length < 2) return null;
  // One scheme per paper: the bank's six, or the paper read's two. (They never mix on one response.)
  const bank = known.some((k) => BANK_TYPE_ORDER.includes(k.key));
  const order = bank ? BANK_TYPE_ORDER : PAPER_TYPE_ORDER;
  const used = known.filter((k) => order.includes(k.key));
  const buckets = new Map<TypeKey, { awarded: number; total: number; count: number }>();
  for (const { key, r } of used) {
    const b = buckets.get(key) ?? { awarded: 0, total: 0, count: 0 };
    b.awarded = r2(b.awarded + (Number(r.marksAwarded) || 0));
    b.total = r2(b.total + (Number(r.totalMarks) || 0));
    b.count += 1;
    buckets.set(key, b);
  }
  const rows: TypeLensRow[] = order
    .filter((k) => buckets.has(k))
    .map((k) => {
      const b = buckets.get(k)!;
      return {
        key: k,
        label: TYPE_LABEL[k],
        awarded: b.awarded,
        total: b.total,
        lost: r2(Math.max(0, b.total - b.awarded)),
        count: b.count,
      };
    });
  if (rows.length < 2) return null;
  const parts: string[] = [];
  if (!bank) parts.push("As read from your paper.");
  if (unknown > 0) {
    parts.push(
      `${plural(unknown, "question has", "questions have")} no type on record, so ${unknown === 1 ? "it is" : "they are"} in your total but not in this table.`,
    );
  }
  return { rows, note: parts.length > 0 ? parts.join(" ") : null };
}

/* ── stamp ──────────────────────────────────────────────────────────────────── */

export interface LensStamp {
  section?: string | null;
  sectionBasis?: SectionBasis | null;
  format?: string | null;
}

/**
 * A copy of `response` whose graded rows carry the given stamps. Only fills GAPS: a row that already
 * carries its own `section` / `format` keeps it (a stamp made at grading time beats a later join).
 * Pure; marks, steps, mistake types and counts pass through untouched, and a response nothing is
 * stamped on is returned as the SAME object.
 */
export function stampLens(
  response: WorksheetGradeResponse,
  stampFor: (r: WorksheetQuestionGrade, index: number) => LensStamp | null | undefined,
): WorksheetGradeResponse {
  let changed = false;
  const results = response.results.map((r, i) => {
    const s = stampFor(r, i);
    if (!s) return r;
    const next: WorksheetQuestionGrade = { ...r };
    let touched = false;
    const sec = normaliseSectionLetter(s.section);
    if (sec && !normaliseSectionLetter(r.section)) {
      next.section = sec;
      next.sectionBasis = s.sectionBasis ?? "bank";
      touched = true;
    }
    if (s.format && !typeKeyOf(r.format) && typeKeyOf(s.format)) {
      next.format = s.format;
      touched = true;
    }
    if (!touched) return r;
    changed = true;
    return next;
  });
  return changed ? { ...response, results } : response;
}

/** The slice of a drawn paper question the stamp needs (structurally a PersistedWorksheetQuestion). */
export interface PaperLensQuestion {
  qNumber: number;
  /** The paper's own section slot (a worksheet's is the bank's; a mock's is the blueprint slot). */
  section?: string;
  /** The bank row's OWN section (Chapter Test / Full Mock papers drawn after this lane). */
  bankSection?: string;
  format?: string;
}

/**
 * Stamp a bank-paper response from the paper's questions, joined on `qNumber`.
 * `blueprintFallback` lets a surface whose paper section IS the row's section (Worksheet) or whose
 * slot is exact by construction (Full Mock) fall back to it when the paper predates `bankSection`;
 * Chapter Test passes false (its slot is a marks band, so it uses the bank id index instead).
 */
export function stampFromPaper(
  response: WorksheetGradeResponse,
  questions: ReadonlyArray<PaperLensQuestion> | null | undefined,
  opts: { blueprintFallback: boolean },
): WorksheetGradeResponse {
  if (!questions || questions.length === 0) return response;
  const byNumber = new Map<number, PaperLensQuestion>();
  for (const q of questions) byNumber.set(q.qNumber, q);
  return stampLens(response, (r) => {
    const q = byNumber.get(r.qNumber);
    if (!q) return null;
    const section = normaliseSectionLetter(q.bankSection) ?? (opts.blueprintFallback ? normaliseSectionLetter(q.section) : null);
    return { section, sectionBasis: "bank", format: q.format ?? null };
  });
}

/** The basis of a section the paid read found, from the source the READ reported for the question's marks
 *  (detect has no per-question section source yet: see the follow-up). Only a read that was SURE
 *  (printed / section / stated) is "read"; inferred, fallback, user or unknown are "check". */
export function sectionBasisOfRead(readSource: string | null | undefined): "read" | "check" {
  return readSource === "printed" || readSource === "section" || readSource === "stated" ? "read" : "check";
}

/** The two honest values the Answer Checker's paper read can report for a question's type. */
export function readTypeOf(objective: boolean | null | undefined): "objective" | "written" | null {
  if (objective === true) return "objective";
  if (objective === false) return "written";
  return null;
}
