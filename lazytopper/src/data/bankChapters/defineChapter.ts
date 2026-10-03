// src/data/bankChapters/defineChapter.ts
//
// BANK-SPLIT-1 PR-2 (L3). The ONE runtime helper every generated chapter module calls.
// Bank-free on purpose: it imports only the pure slug resolver, never a pack or the
// aggregator, so a chapter chunk carries exactly the pack files its generator listed.
//
// A chapter module hands in the SAME arrays the aggregator spreads into
// RAW_CANONICAL_QUESTION_BANK, each tagged with its spread position there. This keeps
// one source of truth for every row (no copy of row data anywhere) and lets the loader
// put rows from several chapters back into the exact aggregator order (Full Mock and
// the seeded draws depend on that order).

import type { CanonicalQuestion } from "../predictionTypes";
import { resolveCanonicalSlug } from "../syllabus/canonicalTopicSlug";

/** [spread position in RAW_CANONICAL_QUESTION_BANK, the spread array, is it an AI pack]. */
export type ChapterSource = readonly [number, readonly CanonicalQuestion[], boolean];

export interface BankChapter {
  /** Canonical topics.ts slug. */
  slug: string;
  /** Served rows of this chapter, in aggregator order (withheld rows removed). */
  rows: readonly CanonicalQuestion[];
  /** Aggregator order key of each row (same index as `rows`); ascending. */
  order: readonly number[];
  /**
   * Ids of this chapter's rows that come from an AI pack (withheld rows included, so the
   * union over all chapters equals AI_GENERATED_QUESTION_IDS exactly).
   */
  aiIds: ReadonlySet<string>;
}

/** Order key = spreadIndex * ROW_ORDER_STRIDE + index within that array. */
export const ROW_ORDER_STRIDE = 1_000_000;

export function defineChapter(
  slug: string,
  sources: readonly ChapterSource[],
  withheld: readonly string[],
): BankChapter {
  const withheldSet = new Set(withheld);
  const rows: CanonicalQuestion[] = [];
  const order: number[] = [];
  const aiIds = new Set<string>();
  for (const [spreadIndex, array, ai] of sources) {
    for (let i = 0; i < array.length; i += 1) {
      const q = array[i];
      if (resolveCanonicalSlug(q.topicKey) !== slug) continue;
      if (ai) aiIds.add(q.id);
      if (withheldSet.has(q.id)) continue;
      rows.push(q);
      order.push(spreadIndex * ROW_ORDER_STRIDE + i);
    }
  }
  return { slug, rows, order, aiIds };
}
