// src/services/paperRebuild.ts
//
// PAPER-REBUILD-1 (cofounder DECISIONs 102/103) — an "Awaiting sheet" paper with no saved copy is
// rebuilt from its OWN record, or not at all.
//
// Every paper record stores `questionIds` in paper order (sessionRecords.ts). A WORKSHEET has no
// grade input besides the uploaded sheet, so its paper is exactly those ids, in that order, mapped
// through the SAME bank-row -> question map the generator uses (`worksheetQuestionFromBankRow`).
//   • No re-draw, no substitution, no top-up. Every id must resolve to a served bank row; one that
//     does not (withheld or retired since, D103c) means NO paper — the honest path, never a partial.
//   • The count is `questionIds.length` (D103b): every paper question is a bank row and every bank
//     row has a non-empty id (pinned by the raw-bank guard in paperRebuild.test.ts), so the record's
//     `.filter(Boolean)` drops nothing.
//   • The text is TODAY's bank text for those ids (a row repaired since shows its corrected form);
//     grading uses the same text the student sees.
// A CHAPTER TEST or FULL MOCK is never rebuilt (D103a): its Section A result frozen at submit lives
// only in its paper snapshot, and rebuilding without it would invent grade inputs.
import type { CanonicalQuestion } from "../data/predictionTypes";
import type { SessionRecord } from "./sessionRecords";
import type { PersistedWorksheet, PersistedWorksheetQuestion } from "./worksheetSessionStore";
import { sectionScopeLabel } from "../components/practice/worksheetGenerator";

const ALL_SECTIONS = ["A", "B", "C", "D", "E"];

/** The ONE bank-row -> worksheet question map (P12): the generator's draw and the rebuild both use it. */
export function worksheetQuestionFromBankRow(
  q: CanonicalQuestion,
  qNumber: number,
  topicLabel: string,
): PersistedWorksheetQuestion {
  return {
    qNumber,
    id: q.id,
    subject: String(q.subject),
    topicKey: q.topicKey,
    topicLabel,
    section: String(q.section || "").toUpperCase(),
    marks: Number(q.marks) || 1,
    questionText: q.questionText,
    options: q.options,
    solutionSteps: q.solutionSteps,
    finalAnswer: q.finalAnswer,
    answer: q.answer,
  };
}

/**
 * Pure: the worksheet a record describes, or null. `rowFor` returns the served bank row for an id
 * (null when it is not served); `labelFor` is the generator's topic label for a topic key.
 */
export function rebuildPaperFromRecord(
  record: SessionRecord,
  rowFor: (id: string) => CanonicalQuestion | null,
  labelFor: (topicKey: string) => string,
): PersistedWorksheet | null {
  if (record.surface !== "worksheet") return null; // D103a: CT / FM are never rebuilt
  const ids = Array.isArray(record.questionIds) ? record.questionIds : [];
  if (ids.length === 0 || !record.worksheetId) return null;
  const rows = ids.map((id) => rowFor(String(id))).filter((row, i): row is CanonicalQuestion => !!row && row.id === ids[i]);
  // THE COUNT CHECK (D103b/c): every id must resolve, so the paper has exactly the record's
  // question count. One unresolved id (withheld or retired since) -> no paper, never a partial one.
  if (rows.length !== ids.length) return null;
  const questions = rows.map((row, i) => worksheetQuestionFromBankRow(row, i + 1, labelFor(row.topicKey)));
  const sections = ALL_SECTIONS.filter((s) => questions.some((q) => q.section === s));
  return {
    worksheetId: record.worksheetId,
    createdAt: new Date(record.gradedAt).toISOString(),
    title: record.title,
    subject: record.subject === "science" ? "Science" : "Maths",
    grade: "10",
    // Display only: the original filter is not on the record, so it names the sections present.
    sectionFilter: sectionScopeLabel(sections.length === ALL_SECTIONS.length ? "All" : sections),
    totalMarks: questions.reduce((s, q) => s + q.marks, 0),
    questions,
    code: record.id,
  };
}

/** The served bank lookups, loaded on demand (BANK-LEAN-1: never in the page's static chunk). */
export async function loadWorksheetRebuild(
  record: SessionRecord,
  labelFor: (topicKey: string) => string,
): Promise<PersistedWorksheet | null> {
  if (record.surface !== "worksheet") return null;
  const [{ bankRowMeta }, loader] = await Promise.all([
    import("../data/bankChapters/bankIdIndex"),
    import("../data/bankChapters/loader"),
  ]);
  const ids = Array.isArray(record.questionIds) ? record.questionIds : [];
  // Load the chapters of the ids that ARE served; an unserved id simply finds no row and the count
  // check in `rebuildPaperFromRecord` (the ONE gate) returns null.
  const topicKeys = [...new Set(ids.map((id) => bankRowMeta(id)?.topicKey).filter((k): k is string => !!k))];
  if (topicKeys.length === 0) return null;
  await loader.ensureBankChapters(topicKeys);
  const byId = new Map<string, CanonicalQuestion>();
  for (const q of loader.getBankRows(loader.bankChaptersFor(topicKeys))) byId.set(q.id, q);
  return rebuildPaperFromRecord(record, (id) => byId.get(id) ?? null, labelFor);
}
