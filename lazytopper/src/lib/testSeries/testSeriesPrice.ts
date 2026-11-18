/**
 * TEST-SERIES-1 — the /test-series CTA price line, from the Board Pass's own date-driven helper (founding price before 1 Dec 2026,
 * the list price from 00:00 IST 1 Dec, "+ GST" from the GST cut-off). Nothing is typed here. The page computes it AFTER mount, inside
 * the `till-boards-figures` node the prerender capture strips, so no build-day figure is frozen into the static file.
 */
import { boardPassPriceDisplay } from "../../config/pricing";

/** "₹1,917 + GST till your boards" (founding) / "₹2,499 + GST till your boards" (from 1 Dec). */
export function testSeriesPriceLine(now: Date | number = Date.now()): string {
  return `${boardPassPriceDisplay(now)} till your boards`;
}
