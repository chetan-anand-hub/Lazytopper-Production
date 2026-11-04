/**
 * packEnded - REDOWNLOAD-ENFORCE-1: the honest "ended" state of a pack whose re-download date has passed.
 *
 * The SERVER decides (server/services/packTerms.cjs, its own clock): GET /api/packs/mine moves such a pack out of `packs`
 * (so no Download button can be built for it) into `endedPacks`. This module only READS that list and words the line.
 * PURE and tiny: no bank, no services. Nothing here decides access, and nothing is stored.
 */

export interface EndedPack {
  packId: string;
  sku: string;
  target: string;
  /** "31 March 2027" / "31 May 2027", exactly as the server sends it. */
  redownloadUntil: string;
}

const DATE_WORDS = /^\d{1,2} [A-Z][a-z]+ \d{4}$/;

/** The server's `endedPacks`, cleaned. Anything malformed is dropped (an unreadable entry shows nothing, never a guess). */
export function readEndedPacks(raw: unknown): EndedPack[] {
  if (!Array.isArray(raw)) return [];
  const out: EndedPack[] = [];
  const seen = new Set<string>();
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    if (typeof r.packId !== "string" || !r.packId || seen.has(r.packId)) continue;
    if (typeof r.sku !== "string" || typeof r.target !== "string") continue;
    if (typeof r.redownloadUntil !== "string" || !DATE_WORDS.test(r.redownloadUntil)) continue;
    seen.add(r.packId);
    out.push({ packId: r.packId, sku: r.sku, target: r.target, redownloadUntil: r.redownloadUntil });
  }
  return out;
}

/** "Your re-download window for <pack> ended on <date>." */
export function endedPackMessage(title: string, e: Pick<EndedPack, "redownloadUntil">): string {
  return `Your re-download window for ${title} ended on ${e.redownloadUntil}.`;
}
