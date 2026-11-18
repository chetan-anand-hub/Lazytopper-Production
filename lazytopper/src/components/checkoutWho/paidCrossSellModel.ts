/**
 * paidCrossSellModel - PAID-XSELL-1 (owner ruling 19 Nov 2026, 00:03 IST). "Goes well with what you just bought": after a
 * server-verified payment, the "Payment received" pop-up names at most TWO other products, best first, so one purchase helps sell
 * the others (never cancels one). PURE: no React, no I/O.
 *
 *   bought the Test Series  -> (1) the Board Pass  (2) the PDF Packs (the Bundle)
 *   bought a PDF pack       -> (1) the Test Series (2) the CBQ Packs
 *   bought a CBQ Pack       -> (1) the Test Series (2) the PDF Packs (the Bundle)
 *   bought a pass           -> the PDF Packs (the Bundle). The CBQ Packs offer stays the existing PassOwnerOffer (pass_success),
 *                              which the pass host already passes below the who-card. NEVER the Test Series: a pass includes it.
 *
 * Never something the student owns: the caller passes the SERVER's owned list (`/api/packs/mine`) and the paid-Premium status;
 * an unknown (loading / failed) answer is `null` and the item it decides is simply not offered (no flash, no wrong offer). A paid
 * pass counts as owning the Test Series. A paused Test Series (VITE_TS_PACK_DISABLED) is never offered. Every price is an existing
 * helper's: the pack price tags, the Board Pass tag, or - for a Test Series buyer - the SERVER's own `payInr` (nothing subtracted here).
 */
import { BOARD_PASS_NAME, boardPassGstExclusive, boardPassPriceDisplay, formatInr } from "../../config/pricing";
import { BOARD_PASS_BUY_PATH } from "../pricing/boardPassBuy";
import { BUNDLE_NAME } from "../../lib/packs/packLabels";
import { TEST_SERIES_BUY_PATH, seriesTotals } from "../../lib/testSeries/testSeries";
import {
  PACK_SUBJECTS,
  TEST_SERIES_CHECKS_PER_PAPER,
  isAlreadyOwned,
  ownsCbq,
  ownsTestSeries,
  packPriceLabel,
  subjectLabel,
  type BoardPassCredit,
  type PackSubject,
} from "../../services/packs";

/** What the pop-up was opened for. */
export type BoughtKind = "test_series" | "pdf" | "cbq" | "pass";

/** The suggestion ids (also the analytics `item` values). */
export type CrossSellId = "board_pass" | "test_series" | "pdf_packs" | "cbq_packs";

export interface CrossSellItem {
  id: CrossSellId;
  title: string;
  /** What the product ADDS - never overlap wording. */
  benefit: string;
  price: string;
  cta: string;
  /** An existing internal buy entry (a fixed path, never taken from the URL). */
  href: string;
}

export const PAID_XSELL_HEADING = "Goes well with what you just bought";
export const PAID_XSELL_MAX = 3;

export const BOARD_PASS_XSELL_BENEFIT = "Your personal tutor on every lost mark, Answer Checker for any question, Mistake Intelligence across all your practice";
export const PDF_XSELL_BENEFIT = "Printed papers with answer explanations for offline revision";
export const CBQ_XSELL_BENEFIT = "Case-based questions in print, for the competency part of the board paper";
/** Every figure is the code's own: the series paper count and the per-paper check limit. */
export function testSeriesXsellBenefit(): string {
  return `Get your written answers checked step by step, ${TEST_SERIES_CHECKS_PER_PAPER} checks per paper, ${seriesTotals().total} board-pattern tests`;
}

/** The one PDF-pack buy entry the pop-up suggests: the Bundle's one-tap /packs path (PacksShop's ?buy= resume contract). */
export const PDF_XSELL_HREF = "/packs?buy=pack_bundle";
/** Both CBQ subjects unowned: the CBQ Packs page (both subjects side by side). */
export const CBQ_PAGE_HREF = "/cbq-packs";

/** The pass host's item names (PassCheckout) and the pack host's names (parentPackName). */
const PASS_NAMES: readonly string[] = ["the Board Pass", "the monthly pass"];
const PDF_NAME = /^(?:(?:Maths|Science) (?:Mock|Subject) Pack|Maths \+ Science Bundle|.+ Chapter Pack|Chapter Pack)$/;
const CBQ_NAME = /^(?:Maths|Science) CBQ Pack$/;

/**
 * What was bought, from the props the hosts already pass the pop-up (itemKind + the plain item name). Anything not recognised
 * (e.g. the "PDF pack" fallback name) is null: nothing is suggested rather than a guess.
 */
export function classifyBought(itemKind: "pack" | "pass", itemName: string): BoughtKind | null {
  const name = (itemName || "").trim();
  if (itemKind === "pass") return PASS_NAMES.includes(name) ? "pass" : null;
  if (name === "Test Series Pack") return "test_series";
  if (CBQ_NAME.test(name)) return "cbq";
  if (PDF_NAME.test(name)) return "pdf";
  return null;
}

export interface CrossSellInput {
  bought: BoughtKind | null;
  /** The SERVER's owned packs; null while unknown (loading / failed). */
  packs: ReadonlyArray<{ packId: string }> | null;
  /** The server's `ownsTestSeries` flag from /api/packs/mine (true only for the literal true). */
  ownsTestSeriesFlag?: boolean;
  /** Paid Premium (a pass or an admin grant); null while unknown. A trial is NOT paid. */
  paidPremium: boolean | null;
  /** The server's Board Pass credit, or null. */
  credit: BoardPassCredit | null;
  /** Packs can be bought on this build (VITE_PACKS_ENABLED). */
  packsOn: boolean;
  /** The Test Series is on sale (not VITE_TS_PACK_DISABLED). */
  tsOffered: boolean;
  /** The Board Pass can be bought on this build (VITE_PAYMENTS_ENABLED). */
  paymentsOn: boolean;
  now: number;
}

/** "Upgrade for ₹X" from the SERVER's payInr (already incl. GST after the GST cut-off, as PassCheckout's credit line says). */
export function boardPassXsellPrice(credit: BoardPassCredit | null, now: number): string {
  if (credit && credit.payInr > 0 && credit.expiresAtMs > now) {
    return `Upgrade for ${formatInr(credit.payInr)}${boardPassGstExclusive(now) ? " incl. GST" : ""}`;
  }
  return `${boardPassPriceDisplay(now)} till your boards`;
}

function boardPassItem(i: CrossSellInput): CrossSellItem | null {
  if (!i.paymentsOn || i.paidPremium !== false) return null;
  // Only a Test Series buyer is shown the server's credited figure; a pack buyer sees the normal price (pack credit wound down).
  const credit = i.bought === "test_series" ? i.credit : null;
  return { id: "board_pass", title: BOARD_PASS_NAME, benefit: BOARD_PASS_XSELL_BENEFIT, price: boardPassXsellPrice(credit, i.now), cta: "Upgrade to the Board Pass", href: BOARD_PASS_BUY_PATH };
}

function testSeriesItem(i: CrossSellInput): CrossSellItem | null {
  if (!i.packsOn || !i.tsOffered || i.packs === null || i.paidPremium !== false) return null;
  if (i.ownsTestSeriesFlag === true || ownsTestSeries(i.packs)) return null;
  return { id: "test_series", title: "Test Series", benefit: testSeriesXsellBenefit(), price: packPriceLabel("test_series", i.now), cta: "Add the Test Series", href: TEST_SERIES_BUY_PATH };
}

function pdfItem(i: CrossSellInput): CrossSellItem | null {
  if (!i.packsOn || i.packs === null || isAlreadyOwned(i.packs, "pack_bundle")) return null;
  return { id: "pdf_packs", title: `PDF Packs · ${BUNDLE_NAME}`, benefit: PDF_XSELL_BENEFIT, price: packPriceLabel("pack_bundle", i.now), cta: "Get the PDF Packs", href: PDF_XSELL_HREF };
}

function cbqItem(i: CrossSellInput): CrossSellItem | null {
  if (!i.packsOn || i.packs === null) return null;
  const packs = i.packs;
  const open = PACK_SUBJECTS.filter((s) => !ownsCbq(packs, s));
  if (open.length === 0) return null;
  const price = packPriceLabel("pack_cbq", i.now);
  if (open.length === 2) return { id: "cbq_packs", title: "CBQ Packs", benefit: CBQ_XSELL_BENEFIT, price: `${price} per subject`, cta: "Get the CBQ Packs", href: CBQ_PAGE_HREF };
  const s: PackSubject = open[0];
  return { id: "cbq_packs", title: `${subjectLabel(s)} CBQ Pack`, benefit: CBQ_XSELL_BENEFIT, price, cta: `Get the ${subjectLabel(s)} CBQ Pack`, href: `/packs?buy=pack_cbq&t=${s}` };
}

/** The suggestions for this purchase, best first, at most PAID_XSELL_MAX; [] when nothing honest is left to suggest. */
export function pickPaidCrossSell(i: CrossSellInput): CrossSellItem[] {
  let ordered: Array<CrossSellItem | null>;
  switch (i.bought) {
    case "test_series":
      ordered = [boardPassItem(i), pdfItem(i), cbqItem(i)];
      break;
    case "pdf":
      ordered = [testSeriesItem(i), boardPassItem(i), cbqItem(i)];
      break;
    case "cbq":
      ordered = [testSeriesItem(i), boardPassItem(i), pdfItem(i)];
      break;
    case "pass":
      ordered = [pdfItem(i), cbqItem(i)];
      break;
    default:
      ordered = [];
  }
  return ordered.filter((x): x is CrossSellItem => x !== null).slice(0, PAID_XSELL_MAX);
}
