/**
 * SPEED-CI-3 (review of #1641) — start loading the buying block's pack rows (OffersBlock's lazy OfferRows chunk) as soon
 * as a student taps the demo, so they are almost always in by the time the verdict shows (YouTube in-app on 4G is the
 * main audience: a rows chunk landing late used to push the page once). Same module OffersBlock's lazy() loads, so the
 * request is shared. Packs switch off: nothing. Once per page; a failed load may be retried by a later tap.
 */
import { isPacksEntryEnabled } from "../../lib/packs/packEntryLazy";

let started = false;

export function prefetchOfferRows(): void {
  if (started || !isPacksEntryEnabled()) return;
  started = true;
  void import("../packs/OfferRows").catch(() => {
    started = false;
  });
}

/** Test seam. */
export function __resetOfferRowsPrefetchForTests(): void {
  started = false;
}
