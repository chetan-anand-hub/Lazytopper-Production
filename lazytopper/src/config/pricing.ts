/**
 * Pricing — THE single source of truth for every published price.
 *
 * WHY THIS FILE EXISTS
 * Four surfaces independently hard-coded a retired ₹149/month claim and drifted
 * apart from the pricing page: the practice-limit gate, the mock-view gate, the
 * Home marketing block, and the Home JSON-LD `Offer` schema. A student who hit
 * the daily practice limit was quoted a different price from the one on
 * /pricing — at the exact moment of upgrade intent. Fixing the four instances
 * would have left the CAUSE in place, so every surface now reads from here and
 * a guard test (`pricing.guard.test.ts`) forbids price literals anywhere else
 * under `src/`.
 *
 * TWO RULES FOR EDITING THIS FILE
 *  1. Change a price in ONE place — the `*_INR` constants below. Everything
 *     else, including the saving and all display strings, is DERIVED.
 *  2. Never hardcode a derived value. `ANNUAL_SAVING_INR` is computed, not
 *     typed, so the arithmetic cannot drift out of step with the prices it is
 *     derived from. A derived number written down as a literal outlives the
 *     facts it came from and nothing re-checks it.
 */

// ---------------------------------------------------------------------------
// Owner-final prices. These are the ONLY numbers a price change should touch.
// ---------------------------------------------------------------------------

export const PRICE_FREE_INR = 0;
export const PRICE_MONTHLY_INR = 599;
export const PRICE_ANNUAL_INR = 4999;

/** A "board year" is a full twelve months of access through the exams. */
export const MONTHS_PER_BOARD_YEAR = 12;

// ---------------------------------------------------------------------------
// Derived. Never hardcode these — they must move when a price above moves.
// ---------------------------------------------------------------------------

/** What twelve months at the monthly rate would cost. */
export const ANNUAL_AT_MONTHLY_RATE_INR = PRICE_MONTHLY_INR * MONTHS_PER_BOARD_YEAR;

/** What the board year saves against paying monthly. */
export const ANNUAL_SAVING_INR = ANNUAL_AT_MONTHLY_RATE_INR - PRICE_ANNUAL_INR;

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

/**
 * Format an amount in rupees with Indian digit grouping (last three digits,
 * then pairs: 1,00,000). Implemented explicitly rather than via
 * `toLocaleString("en-IN")` so the rendered price cannot vary with the host's
 * ICU build — a price is not something to leave to environment detection.
 */
export function formatInr(amount: number): string {
  const rounded = Math.round(Math.abs(amount));
  const digits = rounded.toString();
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`
    : last3;
  return `${amount < 0 ? "-" : ""}₹${grouped}`;
}

export const PRICE_FREE_DISPLAY = formatInr(PRICE_FREE_INR);
export const PRICE_MONTHLY_DISPLAY = formatInr(PRICE_MONTHLY_INR);
export const PRICE_ANNUAL_DISPLAY = formatInr(PRICE_ANNUAL_INR);
export const ANNUAL_AT_MONTHLY_RATE_DISPLAY = formatInr(ANNUAL_AT_MONTHLY_RATE_INR);
export const ANNUAL_SAVING_DISPLAY = formatInr(ANNUAL_SAVING_INR);

// ---------------------------------------------------------------------------
// Period labels + reusable copy fragments
// ---------------------------------------------------------------------------

export const PERIOD_FREE_LABEL = "/ forever";
export const PERIOD_MONTHLY_LABEL = "/ month";
export const PERIOD_ANNUAL_LABEL = "/ board year";

/** Compact inline form for upgrade prompts and SEO copy: "₹599/month". */
export const MONTHLY_INLINE = `${PRICE_MONTHLY_DISPLAY}/month`;

/** Hero sub-line on the pricing page. Sentence case, owner-ruled. */
export const ANNUAL_SAVING_SUBLINE = `save ${ANNUAL_SAVING_DISPLAY}`;

/**
 * Value anchor for the MONTHLY price. Owner-ruled: it still holds at
 * ₹599 — a single tuition class in most Indian cities costs more.
 */
export const TUITION_ANCHOR = "less than one tuition session";

// ---------------------------------------------------------------------------
// Structured data (JSON-LD `Offer`)
//
// schema.org wants a bare numeric string, with no currency symbol. This is the
// single most drift-prone surface in the app — it is invisible in the UI, and
// Google indexes and displays it — so it reads from the same constants as the
// rendered page rather than being exempted from the guard.
// ---------------------------------------------------------------------------

export const PRICE_CURRENCY = "INR";
export const PRICE_FREE_JSONLD = String(PRICE_FREE_INR);
export const PRICE_MONTHLY_JSONLD = String(PRICE_MONTHLY_INR);
export const PRICE_ANNUAL_JSONLD = String(PRICE_ANNUAL_INR);

/** schema.org unit code for a month. The board year is 12 of these. */
export const BILLING_UNIT_MONTH = "MON";
export const BILLING_INCREMENT_MONTHLY = 1;
export const BILLING_INCREMENT_ANNUAL = MONTHS_PER_BOARD_YEAR;
