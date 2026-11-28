/**
 * topup - TOPUP-GO-1 (owner, 26 Nov 2026): the two usage top-ups a Board Pass holder can buy when a fair-use cap is reached.
 *
 * ★ A MIRROR, LIKE pricing.ts. The SERVER is the only authority on what a top-up costs and credits
 *   (server/services/passPricing.cjs TOPUP_PRODUCTS): the browser sends only the pack KEY, the server prices the order, and
 *   `confirmServerPrice` re-checks the total before Razorpay opens. These numbers only DRAW the sheet; src/config/topup.parity.test.ts
 *   turns red when they drift from the server's table.
 *
 * ★ PRICES. Each pack is shown "₹X + GST" with the GST-inclusive total on the Pay button, through the SAME chargeFor rule as the
 *   Board Pass and every PDF pack (config/pricing.ts). The base prices below are the server's `priceInr`.
 *
 * ★ WHAT A PACK BUYS (the "about N" lines). The credit is rupees of real model cost, spent only after the plan's own window is full.
 *   The per-activity costs are the server's TOPUP_ACTIVITIES (METER-AUDIT-2 measured for an answer check; the paper rows are
 *   ESTIMATES = graded questions x ₹0.11, so a Chapter Test = 15 questions and a Full Mock = 38 questions). They are metered at the
 *   price of the grading model IN FORCE, and that price doubles on 2027-01-01 (server/services/modelPrices.cjs). A top-up is bought
 *   mostly for the January rush and valid till the boards, so the sheet shows the count AT THE DOUBLED PRICE: the lower number, so a
 *   student is never promised more than a pack buys after 1 January. It is not a stored or guaranteed number - every line says "about".
 *   No rupee figure of credit is ever shown to a student (TOPUP-1 §2.5).
 *
 * ★ DARK. `isTopupClientEnabled()` needs VITE_TOPUP_ENABLED on AND payments on (the server ANDs TOPUP_ENABLED with PAYMENTS_ENABLED).
 *   With it off nothing in components/topup renders and every host is byte-identical to before.
 */
import { chargeFor, formatInr, GST_RATE_PERCENT, type BoardPassCharge } from "./pricing";
import { isPaymentsClientEnabled } from "../services/checkout";

export type TopupKey = "topup_49" | "topup_149";

export interface TopupPack {
  key: TopupKey;
  /** The BASE price in rupees (the server's `priceInr`); the charge adds GST. */
  baseInr: number;
  /** The base credit in rupees of model cost (the server's `creditInr`). Never shown to a student. */
  creditInr: number;
}

export const TOPUP_PACKS: readonly TopupPack[] = Object.freeze([
  Object.freeze({ key: "topup_49" as const, baseInr: 49, creditInr: 35 }),
  Object.freeze({ key: "topup_149" as const, baseInr: 149, creditInr: 110 }),
]);

/** Cost of one unit of each activity in rupees, at TODAY'S grading-model price (server TOPUP_ACTIVITIES). */
export const TOPUP_COST_INR = Object.freeze({
  answerCheck: 2.05, // measured (METER-AUDIT-2)
  chapterTest: 1.65, // estimate: 15 questions x 0.11
  fullMock: 4.18, // estimate: 38 questions x 0.11
});

/** gemini-3.8-flash's price doubles on 2027-01-01 (server/services/modelPrices.cjs PRICE_CHANGES); every row above runs on it. */
export const TOPUP_GRADING_PRICE_FACTOR_FROM_2027 = 2;

const MICRO = 1_000_000;

export interface TopupLine {
  /** Plain words after "about N": "answer checks", "Chapter Tests marked", "full mocks marked". */
  label: string;
  about: number;
  /** The paper rows are estimates, not measurements; the copy already says "about" for all of them. */
  estimate: boolean;
}

function aboutFor(creditInr: number, costInr: number): number {
  const costMicro = Math.ceil(Math.round(costInr * MICRO) * TOPUP_GRADING_PRICE_FACTOR_FROM_2027);
  return Math.floor((creditInr * MICRO) / costMicro);
}

/** PURE. What one pack buys, as the three "about N" lines the sheet draws (at the doubled grading price, see above). */
export function topupLines(pack: TopupPack): TopupLine[] {
  return [
    { label: "full mocks marked", about: aboutFor(pack.creditInr, TOPUP_COST_INR.fullMock), estimate: true },
    { label: "Chapter Tests marked", about: aboutFor(pack.creditInr, TOPUP_COST_INR.chapterTest), estimate: true },
    { label: "answer checks", about: aboutFor(pack.creditInr, TOPUP_COST_INR.answerCheck), estimate: false },
  ];
}

/** "about 9 full mocks marked" - PURE. */
export function topupLineText(line: TopupLine): string {
  return `about ${line.about} ${line.label}`;
}

/** The price block of a pack at `now`: the base shown "₹X + GST", and the total the Pay button names. */
export interface TopupPrice {
  charge: BoardPassCharge;
  /** "₹49 + GST" (before the GST cut-off: "₹49"). */
  priceText: string;
  /** "₹58" - what Razorpay will ask for. */
  totalText: string;
  /** "₹49 + ₹9 GST (18%) = ₹58", or null before the cut-off. */
  breakupText: string | null;
}

export function topupPrice(pack: TopupPack, now: Date | number = Date.now()): TopupPrice {
  const charge = chargeFor(pack.baseInr, now);
  return {
    charge,
    priceText: charge.gstExclusive ? `${formatInr(charge.baseInr)} + GST` : formatInr(charge.baseInr),
    totalText: formatInr(charge.totalInr),
    breakupText: charge.gstExclusive ? `${formatInr(charge.baseInr)} + ${formatInr(charge.gstInr)} GST (${GST_RATE_PERCENT}%) = ${formatInr(charge.totalInr)}` : null,
  };
}

/** Same literal-read rule as every VITE flag (Vite and Vitest rewrite this exact expression). */
function readTopupFlag(): string {
  try {
    const raw: unknown = import.meta.env.VITE_TOPUP_ENABLED;
    return raw === undefined || raw === null ? "" : String(raw).trim();
  } catch {
    return "";
  }
}

/** The CLIENT switch: top-ups need VITE_TOPUP_ENABLED and payments on. Off -> nothing top-up renders anywhere. */
export function isTopupClientEnabled(): boolean {
  return isPaymentsClientEnabled() && /^(1|true|on|yes)$/i.test(readTopupFlag());
}

/* ── Copy (owner rules: no "AI", no "answer key", no refund promise, "+ GST", Board Pass holders only) ── */
export const TOPUP_ACTION_LIMIT = "Top up to keep going";
export const TOPUP_ACTION_WARN = "Add extra usage";
export const TOPUP_ACTION_MENU = "Buy extra usage";
export const TOPUP_SHEET_TITLE = "Buy extra usage";
export const TOPUP_SHEET_LEAD = "Extra usage is used only after your Board Pass usage for the month is full. It stays valid till your boards.";
export const TOPUP_ESTIMATE_NOTE = "These are estimates; real use varies with the paper.";
export const TOPUP_PAID_COPY = "Done. Your extra usage is added. You can carry on now.";
export const TOPUP_FAILED_COPY = "Payment didn't go through. You haven't been charged twice. Try again.";
export const TOPUP_CONFIRMING_COPY = "We're still confirming your payment with your bank. If money left your account, your extra usage is added automatically.";
