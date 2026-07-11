// src/data/syllabus/canonicalTopicSlug.ts
//
// THE single canonical topic-key authority (P0 [FU-TOPICKEY-UNIVERSAL]).
//
// Resolves ANY topic-key spelling — bank variant, Title-Case, camelCase, legacy
// alias, URL param, stored MI record — to its ONE canonical `topics.ts` slug.
// Every bank-match comparison and every weak-area/write-path canonicalisation in
// the product goes through here so ONE vocabulary is the sole authority.
//
// Authority: `desktopTopicForWeakAreaKey()` in `lib/desktop/topics.ts` — the
// resolver the syllabus guard, the notes validator, and the desktop Topic Hub
// already trust; it maps all 51 known bank spellings to a topics.ts slug with
// zero orphans (verified). `topicAliasMap.resolveCanonicalTopicKey` is
// DELIBERATELY NOT the authority — it resolves to a different vocabulary
// (`reproduction`, `heredity-and-evolution`, a merged light+human-eye key) that
// is not the canonical registry and includes a doctrine-banned key. It survives
// only as a subordinate normaliser for legacy inputs (see `topicResolver.ts`).
//
// This module is deliberately bank-free (imports no question data) so services
// and data files can resolve a slug without pulling the whole question bank.

import { desktopTopicForWeakAreaKey } from "../../lib/desktop/topics";
import { normalizeTopicSlug } from "./topicAliasMap";

/**
 * Resolve ANY topic-key spelling to its ONE canonical `topics.ts` slug.
 *
 * Every known spelling resolves (all 51 bank variants have a topics.ts slug —
 * verified 0 orphans). A genuinely-unknown key falls back to its normalised slug
 * so callers still get a stable, comparable string; Commit-3 Guard A rejects any
 * non-registry key that reaches `questionBanks/**`, so the fallback can never
 * mask a bad key in the bank data.
 */
export function resolveCanonicalSlug(raw: string | null | undefined): string {
  const key = String(raw ?? "");
  const meta = desktopTopicForWeakAreaKey(key);
  if (meta) return meta.slug;
  return normalizeTopicSlug(key);
}

/** Resolve a list of topic-key spellings to a Set of canonical slugs (empties dropped). */
export function resolveCanonicalSlugSet(keys: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const k of keys) {
    const slug = resolveCanonicalSlug(k);
    if (slug) out.add(slug);
  }
  return out;
}

/**
 * True when two topic-key spellings denote the same canonical chapter. Use in
 * place of every raw `q.topicKey === chosenKey` / `set.has(q.topicKey)` compare.
 */
export function canonicalSlugMatches(a: string, b: string): boolean {
  const ra = resolveCanonicalSlug(a);
  return !!ra && ra === resolveCanonicalSlug(b);
}
