// src/lib/desktop/conceptSetTarget.ts
//
// WEAK-AREA-DIRECT - the EXACT served bank rows behind one of Me's concept rows. Loaded ONLY through
// conceptSetPath's `resolveConceptSetPath` (dynamic import at click time): it reads the bank id
// index (~411KB of ids and tags, no question content), which Home and Quick Practice do not load.
//
//   - mapped row (label = an Exam Trends concept name): conceptPractiseTarget, the Topic Hub's exact
//     path, with the row's own concept as the only key - the rows Me counts under that label;
//   - unmapped row (label = a kept bank subtopic): the chapter's rows whose subtopic IS the label and
//     resolves to no concept (a mapped subtopic is counted under its concept in Me, not here);
//   - fewer than MIN_CONCEPT_PRACTISE_ROWS rows either way: none (the caller's honest fallback).

import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";
import { conceptForSubtopic } from "../../data/concepts/conceptLabelMap";
import { canonicalSlugMatches } from "../../data/syllabus/canonicalTopicSlug";
import {
  CONCEPT_PRACTISE_MAX_COUNT,
  MIN_CONCEPT_PRACTISE_ROWS,
  conceptPractiseTarget,
} from "./conceptPractice";
import type { ConceptSetTarget } from "./conceptSetPath";

/** Served ids of `chapterSlug` whose (unmapped) subtopic is exactly `label`. */
export function unmappedSubtopicBankIds(chapterSlug: string, label: string): string[] {
  const want = label.trim();
  if (!want) return [];
  const ids: string[] = [];
  for (const [id, meta] of bankIndexEntries()) {
    const sub = meta.subtopic.trim();
    if (sub !== want) continue;
    // Chapter match through the ONE canonical topic-key authority (topickey Guard B).
    if (!canonicalSlugMatches(meta.topicKey, chapterSlug)) continue;
    if (conceptForSubtopic(chapterSlug, sub) !== undefined) continue;
    ids.push(id);
  }
  return ids;
}

export function conceptSetTarget(chapterSlug: string, label: string): ConceptSetTarget {
  const mapped = conceptPractiseTarget(chapterSlug, { name: label, oneLineUse: "", marks: "", conceptKeys: [label] });
  if (mapped.kind === "exact") return mapped;
  const ids = unmappedSubtopicBankIds(chapterSlug, label);
  if (ids.length < MIN_CONCEPT_PRACTISE_ROWS) return { kind: "none" };
  return { kind: "exact", ids, count: Math.min(ids.length, CONCEPT_PRACTISE_MAX_COUNT) };
}
