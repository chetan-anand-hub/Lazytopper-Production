// src/data/bankQuery.ts
//
// THE ONE shared bank-query helper (P0 [FU-TOPICKEY-UNIVERSAL]). Selects
// questions from the canonical bank by topic, resolving BOTH the incoming topic
// keys AND each question's `topicKey` to canonical `topics.ts` slugs before
// comparing — so a chosen chapter is never zero-matched by a spelling mismatch.
//
// The canonical resolver lives in `./syllabus/canonicalTopicSlug` (bank-free, so
// services can import it without pulling the whole bank). It is re-exported here
// for ergonomics: bank-facing callers reach for `bankQuery`, and get both the
// query and the resolver from one place.
//
// BANK-SPLIT-1 PR-2 (L4): rows come from the per-chapter cache, not the aggregator. The
// route awaits ensureBankChapters([...topicKeys]) first; asking for a chapter that is
// not loaded throws BankChapterNotLoadedError (never a silent []).

import type { CanonicalQuestion } from "./predictionTypes";
import { getBankRows } from "./bankChapters/loader";
import {
  resolveCanonicalSlug,
  resolveCanonicalSlugSet,
  canonicalSlugMatches,
} from "./syllabus/canonicalTopicSlug";

export { resolveCanonicalSlug, resolveCanonicalSlugSet, canonicalSlugMatches };

export interface SelectBankArgs {
  subject?: "Maths" | "Science";
  /** Any spelling(s); resolved to canonical slugs internally. */
  topicKeys: string[];
  section?: string;
  format?: string;
  difficulty?: string;
  /** Exact numeric mark-range filter (inclusive). Never the coarse fused buckets. */
  marksMin?: number;
  marksMax?: number;
}

/**
 * Select questions from the canonical bank by topic, resolving BOTH the incoming
 * topic keys AND each question's `topicKey` to canonical slugs before comparing.
 * This is the ONE place a surface should reach the full bank by topic.
 */
export function selectBankQuestions(args: SelectBankArgs): CanonicalQuestion[] {
  const wanted = resolveCanonicalSlugSet(args.topicKeys);
  if (wanted.size === 0) return [];
  // getBankRows returns the wanted chapters' rows in aggregator order, so the result is
  // exactly what filtering the whole served bank gave.
  return getBankRows(wanted).filter((q) => {
    if (args.subject && q.subject !== args.subject) return false;
    if (!wanted.has(resolveCanonicalSlug(q.topicKey))) return false;
    if (args.section && q.section !== args.section) return false;
    if (args.format && q.format !== args.format) return false;
    if (args.difficulty && q.difficulty !== args.difficulty) return false;
    if (args.marksMin != null && q.marks < args.marksMin) return false;
    if (args.marksMax != null && q.marks > args.marksMax) return false;
    return true;
  });
}
