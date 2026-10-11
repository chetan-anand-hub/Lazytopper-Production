// src/services/mistakeConcept.ts
//
// MI-CONCEPT-1 — resolve a mistake log entry's CONCEPT from a bank question id.
//
// ★★ THIS DELIBERATELY DOES NOT BUILD A SECOND INDEX.
// `progressBankIndex.ts` already owns the memoised, lazily-built id→subtopic Map
// over `canonicalQuestionBank`, and it is ALREADY the concept source the /me
// progress concept rungs read (`progressStore.getWindowedProgress`). Building a
// parallel index here would give the mistake log a SECOND concept vocabulary that
// could drift from the one the page ranks on — which is exactly the failure
// [FU-PROG-TOPIC-KEY-MISMATCH] records. One index, one vocabulary.
//
// This module is the thin, shared policy layer on top of it, so the four write
// sites that need a concept cannot each invent their own rule.
//
// THE RULES (owner-ruled):
//   1. Pure read, memoised, built once — inherited from progressBankIndex. It never
//      writes and never mutates a persisted shape.
//   2. The subtopic is returned VERBATIM. It is NEVER re-derived, slugified,
//      case-folded or otherwise tidied. `resolveCanonicalSlug` is deliberately NOT
//      imported here. A second resolution is a second vocabulary.
//   3. An unresolvable id yields NO concept — never a guess, never a topic-level
//      fallback. Withheld questions, deleted questions, free-typed Check & Improve
//      answers and surface-scoped synthetic attempt ids (`ws:`/`fm:`/`ct:`/`ci:`)
//      all resolve to `undefined`. Absent is honest; approximate is not.
//   4. A chapter-echo subtopic ("General", "Chapter Practice — …") is a
//      whole-chapter placeholder, not a concept. Returning it would present a
//      topic-level bucket AS a concept — the approximation rule 3 forbids — and it
//      would disagree with the /me concept rung, which already suppresses it.
//      Suppressed here for the same reason, by the SAME predicate.
//      (Recoverable either way: the entry also persists `questionId`, so a reader
//      can always re-resolve.)
//
// ME-CONCEPT-1 — THE ONE EXAM TRENDS RESOLVER. `examConceptOf` is the ONLY place a bank row's
// (topicKey, subtopic) becomes an Exam Trends concept (`conceptForSubtopic`, the reviewed map).
// The progress concept rung (progressStore, through its lazy bank lookup), the read model's
// per-concept mistakes and the Tutor brief all resolve through it. It is READ-TIME only: the
// `concept` string a writer stored on a mistake entry (the verbatim subtopic above) is never
// rewritten. `conceptForBankQuestionId` — the WRITE-side rule — is unchanged.
//
// BANK-LEAN-1: progressStore and progressReadModel reach this module ONLY with `await import()`.

import { conceptForQuestionId, isChapterEchoSubtopic } from "./progressBankIndex";
import { conceptRowRef, type BankConcept, type ConceptRowRef } from "./progressBankShape";
// TYPE-ONLY (erased): the concept map itself is loaded with `import()` — see loadExamConceptResolvers.
import type { conceptForSubtopic as ConceptForSubtopicFn } from "../data/concepts/conceptLabelMap";

type ConceptForSubtopic = typeof ConceptForSubtopicFn;

/**
 * Resolve a BANK question id → its concept (the bank row's `subtopic`), verbatim.
 *
 * Returns `undefined` — never a fallback — when the id is empty, is not a bank id,
 * or resolves to a chapter-echo placeholder.
 *
 * ⚠ Pass the BANK id, not a surface-scoped attempt id. Worksheet / full-mock /
 * chapter-test namespace their attempt ids (`ws:`/`fm:`/`ct:`) and those never
 * resolve; those call sites must pass the persisted `PersistedWorksheetQuestion.id`.
 */
export function conceptForBankQuestionId(id: string | null | undefined): string | undefined {
  const hit = conceptForQuestionId(id);
  if (!hit) return undefined;
  // VERBATIM — no trim, no case fold, no slug. Do not "tidy" this line.
  const subtopic = hit.subtopic;
  if (!subtopic) return undefined;
  if (isChapterEchoSubtopic(subtopic)) return undefined;
  return subtopic;
}

/** ME-CONCEPT-1 — the Exam Trends resolvers, built over the concept map once it is loaded. */
export interface ExamConceptResolvers {
  /**
   * THE resolver: the Exam Trends concept of a bank row — (topicKey, subtopic) through the
   * reviewed concept map, VERBATIM. `undefined` — never a fallback — for an unmapped label, a
   * chapter-echo, or no row. The only place this resolution happens.
   */
  examConceptOf: (c: Pick<BankConcept, "topicKey" | "subtopic"> | null | undefined) => string | undefined;
  /** `examConceptOf` for a BANK question id (synthetic ids never resolve). */
  examConceptForBankQuestionId: (id: string | null | undefined) => string | undefined;
  /** The concept ROW of a bank row (`conceptRowRef` over `examConceptOf`). */
  conceptRowOf: (c: BankConcept | null | undefined) => ConceptRowRef | null;
  /** The concept ROW of a BANK question id, or null (synthetic / unknown id). */
  conceptRowForBankQuestionId: (id: string | null | undefined) => ConceptRowRef | null;
}

/** Build the resolvers over a `conceptForSubtopic` (the concept map's verbatim lookup). */
export function examConceptResolvers(conceptForSubtopic: ConceptForSubtopic): ExamConceptResolvers {
  const examConceptOf: ExamConceptResolvers["examConceptOf"] = (c) =>
    c ? conceptForSubtopic(c.topicKey, c.subtopic) : undefined;
  const conceptRowOf: ExamConceptResolvers["conceptRowOf"] = (c) => conceptRowRef(c, examConceptOf(c));
  return {
    examConceptOf,
    examConceptForBankQuestionId: (id) => examConceptOf(conceptForQuestionId(id)),
    conceptRowOf,
    conceptRowForBankQuestionId: (id) => conceptRowOf(conceptForQuestionId(id)),
  };
}

let _resolvers: Promise<ExamConceptResolvers> | null = null;

/**
 * ME-CONCEPT-1 — load the Exam Trends resolvers ON DEMAND. BANK-LEAN-1: this module sits in the
 * Me chunk (MeProgressPage → mistakeRetry → here) and in the three grade services; the concept
 * map (~195 KB of labels and review notes) is fetched with `import()` only by a READ that needs
 * a concept row, never by a page that merely imports this file. Memoised; a failed load REJECTS
 * (every caller degrades to naming no concept) and is retried on the next call.
 */
export function loadExamConceptResolvers(): Promise<ExamConceptResolvers> {
  if (!_resolvers) {
    _resolvers = import("../data/concepts/conceptLabelMap").then(
      (m) => examConceptResolvers(m.conceptForSubtopic),
      (err: unknown) => {
        _resolvers = null;
        throw err;
      },
    );
  }
  return _resolvers;
}
