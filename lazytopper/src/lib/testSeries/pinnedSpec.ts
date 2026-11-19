/**
 * TS-PIN-1 - how a Test Series page finds its PINNED paper: the committed question ids (seriesPaperIds.json, a client copy of the
 * server manifest's ids plus each question's section) instead of a fresh seeded draw. LAZY-ONLY: the pages dynamic-import the
 * builders, which import this; the JSON is a separate chunk that only a series paper loads (never the landing pages).
 *
 * Kill switch: VITE_TS_PIN_DISABLED (any value but "", "0", "false") -> every page uses today's seeded draw, byte-identical.
 */
import type { SeriesPaperIds, SeriesPinnedSpec } from "./paperManifest";
import pinnedIds from "./seriesPaperIds.json";
import { isTsMorePaperKey, tsPinDisabled, tsPinDisabledFor } from "./tsPinFlag";

export { isTsMorePaperKey, tsPinDisabled, tsPinDisabledFor };

const ALL = pinnedIds as unknown as SeriesPaperIds;

/** A spec is usable only when its ids and section letters line up (a malformed entry falls back to the seeded draw, never a blank page). */
export function isUsableSpec(spec: SeriesPinnedSpec | null | undefined): spec is SeriesPinnedSpec {
  return (
    !!spec &&
    Array.isArray(spec.ids) &&
    spec.ids.length > 0 &&
    typeof spec.sections === "string" &&
    spec.sections.length === spec.ids.length &&
    /^[A-E]+$/.test(spec.sections) &&
    new Set(spec.ids).size === spec.ids.length
  );
}

/** The pinned spec of a paper key ("TS-CT-M01", "TS-FM-S8"), or null when the file has none (caller falls back to the seeded draw). */
export function pinnedSpecOf(paperKey: string): SeriesPinnedSpec | null {
  const spec = ALL[paperKey];
  return isUsableSpec(spec) ? spec : null;
}

/** Async wrapper kept so the lazy builders read the same on every page. */
export async function loadPinnedSpec(paperKey: string): Promise<SeriesPinnedSpec | null> {
  return pinnedSpecOf(paperKey);
}

/** Every pinned paper's spec (tests; the kill-switch path's earlier-papers list). */
export function allPinnedSpecs(): SeriesPaperIds {
  return ALL;
}

export interface PinnedResult<T> {
  drawn: T;
  /**
   * Pinned ids that exist in NEITHER the served bank NOR the raw bank. Each is LEFT OUT of the paper (never swapped for another
   * question) and the page says so. Empty for every paper today.
   */
  missingIds: string[];
}
