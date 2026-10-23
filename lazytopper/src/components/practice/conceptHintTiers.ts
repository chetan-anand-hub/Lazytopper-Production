// src/components/practice/conceptHintTiers.ts
//
// QP-CONCEPT-1 — which rows of a chapter a concept entry (`?focus=` / `?subtopicHint=`) means.
//
// The Tutor's "Practise this", HPQ's "More like this" and a Topic Hub card without `conceptKeys` send a
// CONCEPT as `focus` / `subtopicHint`. The builder only REORDERED the engine's count-sized draw by a
// substring of the hint, so a concept the draw happened to miss was never served (Tutor count 3: 0.87
// on-concept per set; the Real Numbers "Irrationality" card served 10 HCF questions). The page now
// draws such a set from the chapter's WHOLE served pool, in three tiers:
//   1. on-concept — the rows the concept names, through the concept lookup Me, the Tutor brief and the
//      Topic Hub cards already share (conceptForSubtopic / conceptKindOf; a Topic Hub card's
//      `conceptKeys`, or its `practiseConceptKeys` when it has none). No new matcher: the only addition
//      is a case-insensitive fallback over the SAME names (HPQ writes "Sum of n terms" for the concept
//      "Sum of n Terms").
//   2. related — the old soft rule over the whole pool: the row's subtopic contains the hint.
//   3. the rest — the draw as before.
// Selection only: nothing here grades, and nothing changes a row.
//
// QP-CONCEPT-2:
//   F1 — an HPQ label that names no concept resolves through lib/practice/hpqConceptAliases.ts (hand-
//        mapped to existing concept names) before the raw-label fallback.
//   F3 — a Topic Hub card stands for a coarse 2–3-concept bucket, so sibling cards served the SAME set.
//        A card's own `practiseKeywords` now rank first inside the on-concept tier: the rows whose
//        subtopic or question text contains one of them (the `keyword` tier).

import {
  CONCEPT_BY_LABEL,
  EXAM_TRENDS_CONCEPTS,
  conceptForSubtopic,
  conceptKindOf,
} from "../../data/concepts/conceptLabelMap";
import { TRACKING_CONCEPTS } from "../../data/concepts/trackingConcepts";
import { resolveCanonicalSlug } from "../../data/syllabus/canonicalTopicSlug";
import { hpqConceptAlias } from "../../lib/practice/hpqConceptAliases";

/** A Topic Hub concept card as the resolver needs it (BoardConcept's name, keys and keywords). */
export interface HintCard {
  name: string;
  conceptKeys?: readonly string[];
  practiseConceptKeys?: readonly string[];
  practiseKeywords?: readonly string[];
}

/** What a hint resolves to: concept names (rows whose subtopic maps to one), or a raw bank label. */
export type ConceptHintTarget =
  | { kind: "concepts"; keys: string[] }
  | { kind: "label"; label: string };

const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const fold = (s: string) => s.trim().toLowerCase();
const cardKeys = (c: HintCard): readonly string[] =>
  c.conceptKeys && c.conceptKeys.length > 0 ? c.conceptKeys : c.practiseConceptKeys ?? [];

function chapterConceptNames(slug: string): string[] {
  const et = hasOwn(EXAM_TRENDS_CONCEPTS, slug) ? (EXAM_TRENDS_CONCEPTS as Record<string, readonly string[]>)[slug] : [];
  const tr = hasOwn(TRACKING_CONCEPTS, slug) ? (TRACKING_CONCEPTS as Record<string, readonly string[]>)[slug] : [];
  return [...et, ...tr];
}

/**
 * Resolve ONE hint for one chapter. Order: a concept name verbatim; a Topic Hub card's name (its
 * keys); a bank label verbatim (its concept); then the same three case-insensitively; else the hint
 * is a raw label (rows whose subtopic IS it, case-insensitively).
 */
export function resolveConceptHint(
  chapterSlug: string,
  hint: string | null | undefined,
  cards: readonly HintCard[] = [],
): ConceptHintTarget | null {
  const h = String(hint ?? "").trim();
  if (!chapterSlug || !h) return null;
  if (conceptKindOf(chapterSlug, h)) return { kind: "concepts", keys: [h] };
  const card = cards.find((c) => c.name.trim() === h && cardKeys(c).length > 0);
  if (card) return { kind: "concepts", keys: [...cardKeys(card)] };
  const mapped = conceptForSubtopic(chapterSlug, h);
  if (mapped) return { kind: "concepts", keys: [mapped] };

  const f = fold(h);
  const name = chapterConceptNames(chapterSlug).find((n) => fold(n) === f);
  if (name) return { kind: "concepts", keys: [name] };
  const cardCi = cards.find((c) => fold(c.name) === f && cardKeys(c).length > 0);
  if (cardCi) return { kind: "concepts", keys: [...cardKeys(cardCi)] };
  const labels = hasOwn(CONCEPT_BY_LABEL, chapterSlug)
    ? (CONCEPT_BY_LABEL as Record<string, Readonly<Record<string, string>>>)[chapterSlug]
    : {};
  const label = Object.keys(labels).find((l) => fold(l) === f);
  if (label) return { kind: "concepts", keys: [labels[label]] };
  const alias = hpqConceptAlias(chapterSlug, h);
  if (alias && alias.length > 0) return { kind: "concepts", keys: [...alias] };
  return { kind: "label", label: h };
}

/**
 * Resolve the entry's hints in order (`focus` first, then `subtopicHint`): the first that names a
 * concept wins; else the first non-empty hint as a raw label.
 */
export function resolveConceptHints(
  chapterSlug: string,
  hints: ReadonlyArray<string | null | undefined>,
  cards: readonly HintCard[] = [],
): ConceptHintTarget | null {
  let fallback: ConceptHintTarget | null = null;
  for (const h of hints) {
    const t = resolveConceptHint(chapterSlug, h, cards);
    if (!t) continue;
    if (t.kind === "concepts") return t;
    fallback = fallback ?? t;
  }
  return fallback;
}

interface HintRow {
  id?: unknown;
  subtopic?: unknown;
  questionText?: unknown;
}

/** The tiers of one entry: `keyword` ⊆ `onConcept` (the card's own keywords), then `related`. */
export interface ConceptHintTierSets {
  keyword: Set<string>;
  onConcept: Set<string>;
  related: Set<string>;
}

/** Is this row on the resolved target? (The concept lookup itself, or the raw label.) */
export function rowOnTarget(chapterSlug: string, target: ConceptHintTarget, subtopic: unknown): boolean {
  const sub = String(subtopic ?? "");
  if (target.kind === "label") return fold(sub) !== "" && fold(sub) === fold(target.label);
  const c = conceptForSubtopic(chapterSlug, sub.trim()) ?? conceptForSubtopic(chapterSlug, sub);
  return c !== undefined && target.keys.includes(c);
}

/** The Topic Hub card one of the hints names (exact, then case-insensitive), if any. */
export function hintCard(
  hints: ReadonlyArray<string | null | undefined>,
  cards: readonly HintCard[],
): HintCard | undefined {
  for (const h of hints) {
    const s = String(h ?? "").trim();
    if (!s) continue;
    const c = cards.find((x) => x.name.trim() === s) ?? cards.find((x) => fold(x.name) === fold(s));
    if (c) return c;
  }
  return undefined;
}

/** Does the row's subtopic or question text contain one of the keywords (case-insensitive)? */
export function rowHasKeyword(row: HintRow, keywords: readonly string[]): boolean {
  if (keywords.length === 0) return false;
  const text = `${String(row.subtopic ?? "")}\n${String(row.questionText ?? "")}`.toLowerCase();
  // Not trimmed: a keyword's spaces are part of it ("ph " must not match "phosphate", "sec " not "second").
  return keywords.some((k) => k.trim() !== "" && text.includes(k.toLowerCase()));
}

/** The ids of `rows` in each tier for the entry's hints. */
export function conceptHintTiers(
  rows: readonly HintRow[],
  chapterSlug: string,
  hints: ReadonlyArray<string | null | undefined>,
  cards: readonly HintCard[] = [],
): ConceptHintTierSets {
  const keyword = new Set<string>();
  const onConcept = new Set<string>();
  const related = new Set<string>();
  const target = resolveConceptHints(chapterSlug, hints, cards);
  if (!target) return { keyword, onConcept, related };
  const keywords = hintCard(hints, cards)?.practiseKeywords ?? [];
  // The related tier is the old soft rule: the subtopic contains the `subtopicHint` (last hint).
  const soft = fold(String(hints[hints.length - 1] ?? ""));
  for (const q of rows) {
    const id = String(q.id ?? "");
    if (!id) continue;
    const sub = String(q.subtopic ?? "");
    if (rowOnTarget(chapterSlug, target, sub)) {
      onConcept.add(id);
      if (rowHasKeyword(q, keywords)) keyword.add(id);
    } else if (soft && sub && fold(sub).includes(soft)) related.add(id);
  }
  return { keyword, onConcept, related };
}

/**
 * True when the Topic Hub cards are worth loading: unless the first hint is already a concept name
 * verbatim, it may be a card's name (whose keys and keywords live in the hub content).
 */
export function hintsNeedCards(chapterSlug: string, hints: ReadonlyArray<string | null | undefined>): boolean {
  const first = hints.map((h) => String(h ?? "").trim()).find((h) => h !== "");
  if (!first) return false;
  return !conceptKindOf(chapterSlug, first);
}

/**
 * The tiers for the page's built pool (`topic` is the page's topic label or slug). The Topic Hub cards
 * (~90KB of hub copy that Quick Practice does not otherwise load) are imported only when a hint may
 * name one.
 */
export async function loadConceptHintTiers(
  rows: readonly HintRow[],
  topic: string,
  hints: ReadonlyArray<string | null | undefined>,
): Promise<ConceptHintTierSets> {
  const chapterSlug = resolveCanonicalSlug(topic);
  let cards: readonly HintCard[] = [];
  if (hintsNeedCards(chapterSlug, hints)) {
    try {
      const { buildActionableDesktopTopicHubContent } = await import("../../lib/desktop/topicHubContent");
      cards = buildActionableDesktopTopicHubContent(chapterSlug)?.boardEssentials ?? [];
    } catch {
      cards = [];
    }
  }
  return conceptHintTiers(rows, chapterSlug, hints, cards);
}

/**
 * F2 — how many of the displayed rows (a prefix, since the tiers lead) are on the concept or related.
 * The page shows the honest "rest are from the same chapter" note after them when it is short of the set.
 */
export function conceptRowsShown(
  displayed: ReadonlyArray<{ id?: unknown }>,
  tiers: ReadonlyArray<ReadonlySet<string>> | undefined,
): number {
  if (!tiers) return displayed.length;
  let n = 0;
  for (const q of displayed) {
    const id = String(q.id ?? "");
    if (tiers.some((t) => t.has(id))) n += 1;
    else break;
  }
  return n;
}

/** F2 — the honest note's words (owner-review wording, after #1297's bank-end note). */
export const conceptEndNote = (concept: string, shown: number): string =>
  shown > 0
    ? `That's every question we have on ${concept} for now — the rest are from the same chapter.`
    : `We don't have questions on ${concept} yet — these are from the same chapter.`;
