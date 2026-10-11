// src/lib/desktop/conceptPractice.ts
//
// CONCEPT-MAP-FILL-1 PR-2 — the EXACT set of served bank rows behind a Topic Hub concept card.
//
// A card's `conceptKeys` name the concept(s) it stands for (Exam Trends or tracking concepts, from
// conceptLabelMap.ts). The rows are the served bank ids whose (chapter, subtopic) resolve to one of
// those concepts through conceptForSubtopic — the SAME lookup Me, the Tutor brief and Weak Area
// Practice use, so a card, a Me row and a Practise button all mean the same rows.
//
// Reads the bank-free id index only (ids and tags, never question content).

import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";
import { conceptForSubtopic } from "../../data/concepts/conceptLabelMap";
import type { BoardConcept } from "./topicHubContent";

/** Fewer served rows than this: the card shows an honest note instead of a Practise button. */
export const MIN_CONCEPT_PRACTISE_ROWS = 5;
/** Practice's own cap on one set (PracticePage COUNT_SOFT_MAX). */
export const CONCEPT_PRACTISE_MAX_COUNT = 50;

/** Served bank ids (aggregator order) whose label resolves to one of `conceptKeys` in `chapterSlug`. */
export function conceptBankIds(chapterSlug: string, conceptKeys: readonly string[]): string[] {
  const keys = new Set(conceptKeys);
  const ids: string[] = [];
  for (const [id, meta] of bankIndexEntries()) {
    if (meta.topicKey !== chapterSlug) continue;
    const concept = conceptForSubtopic(chapterSlug, meta.subtopic.trim());
    if (concept !== undefined && keys.has(concept)) ids.push(id);
  }
  return ids;
}

/**
 * How a card's Practise behaves:
 *   - `legacy`: the card carries no `conceptKeys` — unchanged (concept name + mark band, as before).
 *   - `exact`: serve exactly these ids (strict focus, count = the whole set up to Practice's cap).
 *   - `too-few`: the concept has fewer than MIN_CONCEPT_PRACTISE_ROWS served rows — no button, a note.
 */
export type ConceptPractiseTarget =
  | { kind: "legacy" }
  | { kind: "exact"; ids: string[]; count: number }
  | { kind: "too-few"; rows: number };

export function conceptPractiseTarget(chapterSlug: string, concept: BoardConcept): ConceptPractiseTarget {
  if (!concept.conceptKeys || concept.conceptKeys.length === 0) return { kind: "legacy" };
  const ids = conceptBankIds(chapterSlug, concept.conceptKeys);
  if (ids.length < MIN_CONCEPT_PRACTISE_ROWS) return { kind: "too-few", rows: ids.length };
  return { kind: "exact", ids, count: Math.min(ids.length, CONCEPT_PRACTISE_MAX_COUNT) };
}
