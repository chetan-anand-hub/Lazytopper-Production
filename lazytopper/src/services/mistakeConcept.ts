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

import { conceptForQuestionId, isChapterEchoSubtopic } from "./progressBankIndex";

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
