/**
 * packLine - PACK-BASIC-ONLY-1 (owner ruling, 28 Oct 2026): the "Prefer practising on paper?" pack line
 * is for BASIC students only (trial over, or never trialled; not paid). A trial student sees only the
 * Board Pass; paid Premium sees nothing. The words say it is printed self-check practice, not marking.
 *
 * Tiny and pure on purpose: the scorecard line, the upgrade sheet and the fair-use panel (all lazy
 * chunks) share it, and it pulls nothing heavy into the entry chunk.
 */
import { CHAPTER_PACK_PRICE_INR } from "../../lib/packs/packEntry";
import type { SubscriptionStatus } from "../../services/subscriptionService";

/**
 * True only for a KNOWN Basic student: tier "free" (applyExpiry turns an ended trial into "free") on a
 * record that is known (hydrated). A trial, paid Premium, a missing status or an unhydrated record all
 * hide the line - when unsure, the Board Pass stays the only signal.
 */
export function showPackLine(status: Pick<SubscriptionStatus, "tier"> | null | undefined, hydrated = true): boolean {
  return Boolean(status) && hydrated && status?.tier === "free";
}

export type PackLineKind = "chapter" | "mock" | "general";

const TAIL = "printed questions with answer keys";

/** The ONE source of the pack line's words. `priceLabel` is the catalogue display price ("₹49"). */
export function packLineText(kind: PackLineKind, priceLabel: string): string {
  const prefix = "Prefer practising on paper?";
  if (kind === "chapter") return `${prefix} Chapter Pack ${priceLabel} — ${TAIL} →`;
  if (kind === "mock") return `${prefix} Mock Pack ${priceLabel} — printed papers with answer keys →`;
  return `${prefix} PDF packs from ${priceLabel} — printed, with answer keys →`;
}

/** The pack's kind, read from the label paperPackLine() sets. */
export function packKindOf(pack: { label: string }): PackLineKind {
  return pack.label === "Chapter Pack" ? "chapter" : pack.label === "Mock Pack" ? "mock" : "general";
}

/** Words for a PaperPackLine; the plain /packs link (no price of its own) names the cheapest pack's price. */
export function packLineTextFor(pack: { label: string; priceLabel: string }): string {
  return packLineText(packKindOf(pack), pack.priceLabel || `₹${CHAPTER_PACK_PRICE_INR}`);
}
