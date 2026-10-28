/**
 * packLine - PACK-BASIC-ONLY-1 (owner ruling, 28 Oct 2026, final): the "Not ready for the Board Pass yet?"
 * pack line is the cheaper, less capable step for any student who has not paid. It shows to every
 * non-paid student (every trial day, and Basic); paid Premium never sees it, and nothing shows while the
 * status is unknown, so a paid student never sees a flash. The words say it is printed, no marking.
 *
 * Tiny and pure on purpose: the scorecard line, the upgrade sheet and the fair-use panel (all lazy
 * chunks) share it, and it pulls nothing heavy into the entry chunk. No clock is read.
 */
import { CHAPTER_PACK_PRICE_INR } from "../../lib/packs/packEntry";
import type { SubscriptionStatus } from "../../services/subscriptionService";

/**
 * True for a KNOWN student who is not on a paid pass: Basic (tier "free") or a trial. Paid Premium, a
 * missing status or an unhydrated record hide it - when unsure the Board Pass stays the only signal.
 */
export function showPackLine(status: Pick<SubscriptionStatus, "tier"> | null | undefined, hydrated = true): boolean {
  return Boolean(status) && hydrated && (status?.tier === "free" || status?.tier === "trial");
}

/** Where the line goes: the packs strip on /pricing (PacksStrip carries id="packs"). */
export const PACK_LINE_HREF = "/pricing#packs";

/** The ONE line, on every surface. The price is the catalogue's cheapest pack (packEntry), never a literal. */
export const PACK_LINE_TEXT = `Not ready for the Board Pass yet? Try our PDF packs from \u20b9${CHAPTER_PACK_PRICE_INR} \u2014 printed questions with answer keys, no marking \u2192`;
