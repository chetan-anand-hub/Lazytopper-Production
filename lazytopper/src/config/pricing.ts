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
 * TWO PRICE TIERS, AND WHY THE SHAPE IS HONEST
 * There is a LIST price and a FOUNDING price, and both are published from day
 * one. Founding members — the first `FOUNDING_COHORT_SIZE` students — pay less
 * because they took a risk on an unproven product. When the cohort fills, the
 * OFFER CLOSES; it is not repriced. That is categorically different from
 * launching low and raising the price later, and the copy must keep saying so.
 *
 * ⚠ SCOPE THE PROMISE TO AN ACTIVE SUBSCRIPTION, NOT TO PUBLISHED PRICES.
 * The supportable claim is "we never change the price of an active
 * subscription". The broader-sounding "we never raise anyone's price" is a claim
 * about PUBLISHED prices and this product cannot support it: a fixed board-year
 * price was published at two different figures one day apart (#539 → #548), and
 * PRICING-TB-1 then retired that plan altogether. Published prices are
 * provisional pending the cost model; a subscriber's own rate is not. Keep the
 * two apart in copy — see [FU-ANNUAL-PRICE-ROSE-POST-539].
 *
 * The list price is therefore not aspirational — it is the real, published,
 * currently-charged price for student 201 onwards. Do not describe it as a
 * "was" price or a discount-anchor; it is struck on the page to show which of
 * two LIVE prices applies, not to mark a retired one.
 *
 * THREE RULES FOR EDITING THIS FILE
 *  1. Change a price in ONE place — the `*_INR` constants below. Everything
 *     else, including both savings and all display strings, is DERIVED.
 *  2. Never hardcode a derived value. The savings are computed, not typed, so
 *     the arithmetic cannot drift out of step with the prices it comes from. A
 *     derived number written down as a literal outlives the facts it came from
 *     and nothing re-checks it.
 *  3. Every constant names its TIER. There is no bare `PRICE_MONTHLY_INR` any
 *     more, deliberately: with two live tiers an unqualified name is a coin
 *     flip at the call site, and the one thing this module exists to prevent is
 *     a surface quoting a price the student will not actually be charged.
 */

// ---------------------------------------------------------------------------
// Owner-final prices. These are the ONLY numbers a price change should touch.
// ---------------------------------------------------------------------------

export const PRICE_FREE_INR = 0;

/** Regular published price — what student 201 onwards pays. */
export const PRICE_MONTHLY_LIST_INR = 999;

/** Founding-member price — the first `FOUNDING_COHORT_SIZE` students. */
export const PRICE_MONTHLY_FOUNDING_INR = 599;

// NOTE (PRICING-TB-1): there is deliberately NO fixed board-year price any more.
// The board-year plan (a list and a founding figure, a "/ board year" label, a
// derived saving and two JSON-LD strings) was retired by owner ruling on
// 2026-09-26 and replaced by "till boards" — one payment covering every month
// until the first board paper, 20% under the monthly rate. That price depends on
// TODAY'S DATE, so it cannot be a constant here: see `tillBoardsQuote()` below.

/**
 * How many students the founding rate is open to. The offer closes when this
 * many have taken it; existing members keep their rate.
 *
 * NOTE: closing the cohort is currently a MANUAL operation — nothing in the
 * product counts subscribers or flips this off. Tracked as
 * [FU-PRICING-FOUNDING-COHORT]. Until that mechanism exists, this number is a
 * published promise the product cannot itself enforce.
 */
export const FOUNDING_COHORT_SIZE = 200;

/**
 * Is the founding offer still open?
 *
 * This module already carries offer-SHAPED values, not just numbers —
 * `FOUNDING_COHORT_SIZE`, `FOUNDING_LABEL`, `FOUNDING_LOCK_COPY`,
 * `FOUNDING_COHORT_COPY` and `AVAILABILITY_LIMITED` all describe the offer
 * rather than a price — so the flag that says whether that offer is live
 * belongs beside them. Splitting it into its own module would put the offer's
 * state one import away from every string that describes it, which is the drift
 * this file exists to prevent.
 *
 * ★★ IT IS A BOOLEAN, AND IT MUST STAY ONE. Never a remaining-seats number.
 * "First 200 students" is a true claim about the OFFER; "43 places left" is a
 * claim about DEMAND. A live count that does not move for a month reads as
 * "nobody is buying" — worse than silence — and a hand-tuned one is fabrication.
 * Do not widen this to a count, and do not add a sibling that could become one.
 *
 * Owner-edited, deliberately: a build-time constant cannot fail at runtime, and
 * closing the cohort is already a manual operation ([FU-PRICING-FOUNDING-COHORT]
 * — nothing in the product counts subscribers). A Firestore-backed toggle is a
 * later change, not this one.
 *
 * ⚠ FLIPPING THIS TO `false` IS NOT THE WHOLE SWITCH. `MONTHLY_INLINE` below is
 * bound to the FOUNDING rate and is NOT derived from this flag — the two gates
 * that render it would keep quoting a closed price. See the warning on that
 * constant.
 */
export const FOUNDING_OFFER_OPEN = true;

/**
 * Till boards pays this fraction of the monthly total — i.e. 20% off. Owner
 * ruling, PRICING-TB-1 (2026-09-26). The percentage shown in copy is DERIVED
 * from this (`TILL_BOARDS_SAVING_PERCENT`), never typed beside it.
 */
export const TILL_BOARDS_PAY_FRACTION = 0.8;
export const TILL_BOARDS_SAVING_PERCENT = Math.round((1 - TILL_BOARDS_PAY_FRACTION) * 100);

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

export const PRICE_MONTHLY_LIST_DISPLAY = formatInr(PRICE_MONTHLY_LIST_INR);
export const PRICE_MONTHLY_FOUNDING_DISPLAY = formatInr(PRICE_MONTHLY_FOUNDING_INR);

// ---------------------------------------------------------------------------
// Period labels + reusable copy fragments
// ---------------------------------------------------------------------------

export const PERIOD_FREE_LABEL = "/ forever";
export const PERIOD_MONTHLY_LABEL = "/ month";

/**
 * Compact inline form for upgrade prompts: "₹599/month".
 *
 * Bound to the FOUNDING rate on purpose. This string is rendered at the moment
 * of upgrade intent (the practice-limit gate and the mock-view gate), where the
 * only honest number is the one the student would actually be charged today —
 * and while the cohort is open, that is the founding rate.
 *
 * ⚠ WHEN THE FOUNDING COHORT CLOSES this must move to
 * `PRICE_MONTHLY_LIST_DISPLAY`, or both gates will quote a price that is no
 * longer available. Those two files import nothing else from this module, so
 * this one line is the entire switch. See [FU-PRICING-FOUNDING-COHORT].
 */
export const MONTHLY_INLINE = `${PRICE_MONTHLY_FOUNDING_DISPLAY}/month`;

/**
 * Till-boards copy that carries NO rupee figure. These are the only till-boards
 * strings allowed in static markup (prerendered/*.html, the sign-in strip, the
 * FAQ): the figures themselves depend on today's date, so they exist only after
 * the page mounts in a browser. See `tillBoardsQuote()`.
 */
export const TILL_BOARDS_LINE = `Or pay once till your boards — ${TILL_BOARDS_SAVING_PERCENT}% off.`;
export const TILL_BOARDS_INLINE = `or pay once till boards — ${TILL_BOARDS_SAVING_PERCENT}% off`;
export const TILL_BOARDS_SAVING_LABEL = `save ${TILL_BOARDS_SAVING_PERCENT}%`;

/**
 * Value anchor for the MONTHLY price. Owner-ruled: it still holds at
 * ₹599 — a single tuition class in most Indian cities costs more.
 */
export const TUITION_ANCHOR = "less than one tuition session";

/**
 * The founding offer, stated in full. Kept here rather than inline in a page so
 * the two claims that make the offer honest — the rate is LOCKED, and the offer
 * CLOSES rather than the price rising — cannot be dropped by an edit to one
 * surface's copy while another keeps promising them.
 */
export const FOUNDING_LABEL = "Founding member";
export const FOUNDING_LOCK_COPY = "Locked for as long as you stay subscribed.";
export const FOUNDING_COHORT_COPY = `First ${FOUNDING_COHORT_SIZE} students.`;

// NOTE: there is deliberately no `FOUNDING_REGULAR_PRICE_COPY` constant. A first
// draft exported one and nothing ever consumed it — the "Regular price ⟨x⟩" line
// is assembled in the page so the figure can sit inside an <s> element, which a
// flat string cannot express. An exported constant that no surface renders is
// invisible to every gate and reads like a protection that is not there.

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
export const PRICE_MONTHLY_LIST_JSONLD = String(PRICE_MONTHLY_LIST_INR);
export const PRICE_MONTHLY_FOUNDING_JSONLD = String(PRICE_MONTHLY_FOUNDING_INR);
// NOTE (PRICING-TB-1, OR-P2): the board-year `*_JSONLD` strings and
// `BILLING_INCREMENT_ANNUAL` were deleted, not repointed. Nothing emits pricing
// JSON-LD today ([FU-PRICING-JSONLD-NO-EMITTER]), and the till-boards price is
// clock-derived, so it must never be written into structured data at all.

/**
 * schema.org availability for the founding offers. `LimitedAvailability` is the
 * standard vocabulary term for an offer with a bounded supply, and it is the
 * ONLY structured signal used for the cohort.
 *
 * The cohort SIZE is deliberately not expressed in the schema. `eligibleQuantity`
 * means units per order, not seats remaining, so using it for "200 students"
 * would be an invented semantic — and Google ignores or flags invented Offer
 * properties. The same reasoning rules out publishing the SAVING: schema.org has
 * no field for it. Both live in visible copy, where they are true and readable.
 */
export const AVAILABILITY_LIMITED = "https://schema.org/LimitedAvailability";
export const AVAILABILITY_IN_STOCK = "https://schema.org/InStock";

/** schema.org unit code for a month. */
export const BILLING_UNIT_MONTH = "MON";
export const BILLING_INCREMENT_MONTHLY = 1;

// ---------------------------------------------------------------------------
// Till boards — one payment, until the first board paper (PRICING-TB-1)
// ---------------------------------------------------------------------------

/** IST is a fixed UTC+05:30 — India observes no daylight saving. */
const IST_OFFSET_MINUTES = 5 * 60 + 30;

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** A calendar date with a 0-based month, compared field by field. */
interface CalendarDate {
  y: number;
  m: number;
  d: number;
}

/**
 * The calendar date in Asia/Kolkata at the instant `now`. Computed from the
 * fixed offset rather than `Intl` so the result cannot vary with the host's ICU
 * build or time zone — the same reason `formatInr` avoids `toLocaleString`.
 */
function istCalendarDate(now: Date): CalendarDate {
  const shifted = new Date(now.getTime() + IST_OFFSET_MINUTES * 60_000);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

function parseIsoDate(iso: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/**
 * `date + k` calendar months. A day past the end of the target month is clamped
 * to that month's last day (31 Jan + 1 month = 28/29 Feb), never rolled into the
 * month after — rolling would make "one month" longer than a month.
 */
function addCalendarMonths(date: CalendarDate, k: number): CalendarDate {
  const total = date.m + k;
  const y = date.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

/** Hard ceiling on the month search — the predictor never looks > ~18 months out. */
const TILL_BOARDS_MAX_MONTHS = 36;

export interface TillBoardsQuote {
  /** Smallest k >= 1 with (today in IST) + k calendar months >= the board date. */
  monthsLeft: number;
  /** The monthly rate the quote is built from (founding while open, else list). */
  monthlyInr: number;
  /** monthly × monthsLeft — shown struck through. */
  fullInr: number;
  /** Math.round(full × TILL_BOARDS_PAY_FRACTION) — the one-time price. */
  priceInr: number;
  fullDisplay: string;
  priceDisplay: string;
  /** "till your boards (Feb 2027)" — the month and year of the board date. */
  untilLabel: string;
  /** "save 20%". */
  savingLabel: string;
}

/**
 * The till-boards price for a given instant and board date. PURE: the clock is
 * an argument (`now`), never read here, so a test can pin any day and the
 * prerendered capture — which never mounts the component that calls this with
 * the real clock — cannot bake a figure. Returns null for an unparseable date.
 *
 * `boardIso` is `predictCbseExamDate("10")` at the call site — the same date the
 * landing countdown uses — so the two surfaces cannot disagree about when the
 * boards are.
 *
 * `foundingOpen` defaults to the shipped flag; it is a parameter so the closed
 * state can be tested without mocking this module (nothing may `vi.mock`
 * src/config — see gradingLimits.guard.test.ts).
 */
export function tillBoardsQuote(
  now: Date,
  boardIso: string,
  foundingOpen: boolean = FOUNDING_OFFER_OPEN,
): TillBoardsQuote | null {
  const board = parseIsoDate(boardIso);
  if (!board || Number.isNaN(now.getTime())) return null;
  const today = istCalendarDate(now);

  // k starts at 1: on the day of the first paper itself (k = 0 would already
  // satisfy the inequality) the plan still covers one month, never zero.
  let monthsLeft = 1;
  while (
    monthsLeft < TILL_BOARDS_MAX_MONTHS &&
    compareDates(addCalendarMonths(today, monthsLeft), board) < 0
  ) {
    monthsLeft += 1;
  }

  const monthlyInr = foundingOpen ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR;
  const fullInr = monthlyInr * monthsLeft;
  const priceInr = Math.round(fullInr * TILL_BOARDS_PAY_FRACTION);
  return {
    monthsLeft,
    monthlyInr,
    fullInr,
    priceInr,
    fullDisplay: formatInr(fullInr),
    priceDisplay: formatInr(priceInr),
    untilLabel: `till your boards (${MONTH_SHORT[board.m]} ${board.y})`,
    savingLabel: TILL_BOARDS_SAVING_LABEL,
  };
}
