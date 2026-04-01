// src/utils/topicResolver.ts
//
// Canonical-first topic resolver with alias compatibility.
// Canonical topic key format: hyphen-slug (e.g. "acids-bases-and-salts").
// Runtime datasets can still use legacy/prefixed keys through alias mapping.

export type SubjectKey = "Maths" | "Science";

import { getCanonicalChapterBySlug } from "../data/syllabus/cbse10Canonical";
import {
  getRuntimeTopicCandidates,
  normalizeTopicSlug,
  resolveCanonicalTopicKey,
} from "../data/syllabus/topicAliasMap";

export interface ResolveTopicKeyArgs {
  subjectKey?: string; // often 'maths' | 'science' in older code paths
  topicParam: string;
  /** Optional explicit topicKey coming from navigation/query state */
  topicKey?: string | null;
}

/** Strip a UTF-8 BOM if present (common source of invisible mismatches). */
export function stripBom(input: string): string {
  return input?.startsWith("\ufeff") ? input.slice(1) : input;
}

/** Canonical topic key normalization + alias collapse. */
export function normalizeTopicKey(raw: string): string {
  const noBom = stripBom(String(raw ?? ""));
  return resolveCanonicalTopicKey(noBom);
}

/**
 * Bridge to Prompt-D practice packs (underscore keys).
 * Example: "acids-bases-salts" -> "acids_bases_salts"
 */
export function toPracticePackKey(canonicalTopicKey: string): string {
  return normalizeTopicSlug(canonicalTopicKey).replace(/-/g, "_");
}

/**
 * Legacy-friendly resolver: returns canonical hyphen-slug.
 * Accepts either a slug or a display string.
 */
export function resolveTopicKey(args: ResolveTopicKeyArgs): string {
  const explicit = args.topicKey ? String(args.topicKey) : "";
  if (explicit) return normalizeTopicKey(explicit);
  return normalizeTopicKey(args.topicParam);
}

/**
 * Resolve the canonical topic key to a runtime dataset key using available keys.
 * If no available set is provided, returns canonical topic key.
 */
export function resolveRuntimeTopicKey(
  rawTopicKey: string,
  availableTopicKeys?: Iterable<string>
): string {
  const candidates = getRuntimeTopicCandidates(rawTopicKey);
  if (!availableTopicKeys) return candidates[0] || normalizeTopicKey(rawTopicKey);
  const available = new Set<string>();
  for (const key of availableTopicKeys) {
    available.add(String(key));
  }
  for (const candidate of candidates) {
    if (available.has(candidate)) return candidate;
  }
  return candidates[0] || normalizeTopicKey(rawTopicKey);
}

/**
 * Convert a canonical topic key (slug) into a display name.
 * Example: "pair-of-linear-equations" -> "Pair Of Linear Equations"
 */
export function resolveTopicDisplayName(_subjectKey: string, topicKey: string): string {
  const chapter = getCanonicalChapterBySlug(topicKey);
  if (chapter?.title) return chapter.title;
  const withSpaces = normalizeTopicSlug(topicKey).replace(/-+/g, " ");
  return withSpaces.replace(/\b\w/g, (char) => char.toUpperCase());
}
