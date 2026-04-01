// NOTE: FinalEnrichment retired (Jan 2026). Use topicHubV2Enrichment as the single enrichment/override layer.
// src/utils/topicHubV2Store.ts
// Runtime accessor for baked TopicHubV2 content (main branch friendly).
// Keeps src/utils/getTopicV2Content.ts as type/interface-only to avoid circular-import issues.

import { topicHubV2Content } from "../data/topicHubV2Full";
import { topicHubV2Enrichment } from "../data/topicHubV2Enrichment";
import type { TopicHubV2Content } from "./getTopicV2Content";

import { normalizeTopicKey, resolveRuntimeTopicKey } from "./topicResolver";
export { normalizeTopicKey, resolveRuntimeTopicKey };

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function deepMergeUnknown(base: unknown, enrich: unknown): unknown {
  if (Array.isArray(base) && Array.isArray(enrich)) return enrich;
  if (!isPlainObject(base) || !isPlainObject(enrich)) return enrich ?? base;

  const out: Record<string, unknown> = { ...base };
  for (const [key, enrichValue] of Object.entries(enrich)) {
    const baseValue = out[key];
    if (enrichValue === undefined) continue;
    if (Array.isArray(baseValue) && Array.isArray(enrichValue)) {
      out[key] = enrichValue;
      continue;
    }
    if (isPlainObject(baseValue) && isPlainObject(enrichValue)) {
      out[key] = deepMergeUnknown(baseValue, enrichValue);
      continue;
    }
    out[key] = enrichValue;
  }
  return out;
}

/**
 * Deep-merge that:
 * - merges plain objects recursively
 * - arrays: enrichment overrides base if provided (keeps things predictable)
 * - primitives: enrichment overrides base
 */
function deepMerge<T>(base: T, enrich: Partial<T>): T {
  return deepMergeUnknown(base, enrich) as T;
}

/**
 * Returns baked TopicHubV2 content (base + optional enrichment), or null if not found.
 */
export function getTopicV2Content(topicKey: string): TopicHubV2Content | null {
  const contentMap = topicHubV2Content as Record<string, TopicHubV2Content>;
  const enrichmentMap = topicHubV2Enrichment as Record<string, Partial<TopicHubV2Content>>;

  const canonicalKey = normalizeTopicKey(topicKey);
  const runtimeKey = resolveRuntimeTopicKey(
    canonicalKey || topicKey,
    Object.keys(contentMap)
  );

  const base =
    contentMap[runtimeKey] ??
    contentMap[canonicalKey] ??
    contentMap[topicKey] ??
    null;

  if (!base) return null;

  const enrich =
    enrichmentMap[runtimeKey] ??
    enrichmentMap[canonicalKey] ??
    enrichmentMap[topicKey] ??
    {};

  return deepMerge(base, enrich);
}
