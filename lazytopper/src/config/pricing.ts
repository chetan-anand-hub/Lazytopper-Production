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
 * one. Founding members pay less because they took a risk on an unproven
 * product. When the founding offer ends, the OFFER CLOSES; it is not repriced. That is categorically different from
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
 * currently-charged price once the founding offer closes. Do not describe it as a
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

/** Regular published price — what new members pay once the founding offer closes. */
export const PRICE_MONTHLY_LIST_INR = 999;

/** Founding-member price — while `FOUNDING_OFFER_OPEN`. */
export const PRICE_MONTHLY_FOUNDING_INR = 599;

// NOTE (PRICING-TB-1): there is deliberately NO fixed board-year price any more.
// The board-year plan (a list and a founding figure, a "/ board year" label, a
// derived saving and two JSON-LD strings) was retired by owner ruling on
// 2026-09-26 and replaced by "till boards" — one payment covering every month
// until the first board paper, 20% under the monthly rate. That price depends on
// TODAY'S DATE, so it cannot be a constant here: see `tillBoardsQuote()` below.

// NOTE (PARENTS-CTA-1, owner ruling 2026-10-19): there is deliberately NO seat
// count any more. `FOUNDING_COHORT_SIZE` and the visible "First N
// students." line it fed were removed: the badge now reads "Founding member offer" and no
// surface publishes a number of seats. Closing the offer is now DATE-DRIVEN (PRICING-1, 30 Nov 2026) — nothing in the
// product counts subscribers. See [FU-PRICING-FOUNDING-COHORT]. Do not reintroduce a seat number
// in copy without an owner ruling: a number the product cannot enforce is a
// published promise it cannot keep.

/**
 * The first instant the founding offer is CLOSED: 00:00 on 1 December 2026, IST
 * (owner ruling, PRICING-1, 25 Oct 2026: "the founding price ends on last day of
 * November 2026, december will start with 999/month"). A fixed UTC+05:30 offset,
 * not the host's zone — a student's device clock zone must not move the switch.
 * The server mirrors this instant in `server/services/passPricing.cjs`, and
 * `passPricing.parity.test.ts` proves the two agree.
 */
export const FOUNDING_OFFER_CLOSES_AT_ISO = "2026-12-01T00:00:00+05:30";
export const FOUNDING_OFFER_CLOSES_AT_MS = Date.parse(FOUNDING_OFFER_CLOSES_AT_ISO);

/**
 * The last day the founding price is charged, as copy ("30 November"). DERIVED from
 * `FOUNDING_OFFER_CLOSES_AT_ISO` (the day before the closing instant, in IST), so the date a
 * student reads and the instant the offer closes cannot drift apart. A real date, never a countdown.
 */
export const FOUNDING_OFFER_LAST_DAY_LABEL = (() => {
  const lastDay = new Date(FOUNDING_OFFER_CLOSES_AT_MS - 1 + 5.5 * 3_600_000);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${lastDay.getUTCDate()} ${months[lastDay.getUTCMonth()]}`;
})();
/** The first day of the list price, as copy ("1 December"). Derived the same way. */
export const FOUNDING_OFFER_LIST_FROM_LABEL = (() => {
  const first = new Date(FOUNDING_OFFER_CLOSES_AT_MS + 5.5 * 3_600_000);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${first.getUTCDate()} ${months[first.getUTCMonth()]}`;
})();

/** Is the founding offer open at the instant `now`? PURE: the clock is an argument. */
export function foundingOfferOpen(now: Date | number = Date.now()): boolean {
  const ms = now instanceof Date ? now.getTime() : now;
  return Number.isFinite(ms) && ms < FOUNDING_OFFER_CLOSES_AT_MS;
}

/**
 * Is the founding offer still open?
 *
 * This module already carries offer-SHAPED values, not just numbers —
 * `FOUNDING_LABEL`, `FOUNDING_OFFER_BADGE`, `FOUNDING_LOCK_COPY` and
 * `AVAILABILITY_LIMITED` all describe the offer
 * rather than a price — so the flag that says whether that offer is live
 * belongs beside them. Splitting it into its own module would put the offer's
 * state one import away from every string that describes it, which is the drift
 * this file exists to prevent.
 *
 * ★★ IT IS A BOOLEAN, AND IT MUST STAY ONE. Never a remaining-seats number.
 * "Founding member offer" is a claim about the OFFER; "43 places left" is a
 * claim about DEMAND. A live count that does not move for a month reads as
 * "nobody is buying" — worse than silence — and a hand-tuned one is fabrication.
 * Do not widen this to a count, and do not add a sibling that could become one.
 *
 * PRICING-1 (owner, 25 Oct 2026): the offer's state now comes from the CALENDAR — open until
 * 23:59:59 IST on 30 Nov 2026 — through the pure `foundingOfferOpen(now)` above. NO module
 * in this file reads the clock when it loads: a component asks at RENDER time
 * (`foundingOfferOpen(Date.now())`), so a tab left open across the midnight is right on its
 * next render and nothing is baked into a bundle or a test import. The SERVER, which decides
 * what is charged, re-reads its own clock on every order and grant, and an order keeps the
 * offer it was priced with (grantPass reads `order.offerKey`).
 *
 * A student who already holds the founding rate (`foundingMember` on their subscription) keeps
 * it: use `foundingRateApplies(now, founder)` for any label that quotes THEIR price.
 */
export function foundingRateApplies(now: Date | number, founder?: boolean | null): boolean {
  return founder === true || foundingOfferOpen(now);
}

/**
 * @deprecated Frozen at `true`; it no longer follows the date. Kept ONLY because
 * `src/pages/Welcome.tsx` (forbidden to this lane, CLAUDE.md §4) still imports it. Welcome
 * must switch to `foundingOfferOpen(Date.now())` BEFORE 1 Dec 2026 or the landing keeps
 * quoting the founding price after the offer closes. Nothing else may read it.
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
// PRICING-TB-1 · OR-P6 (owner, 2026-09-26): billing is ONE-TIME PASSES ONLY, with no
// auto-renew. A "/month" slash reads as a recurring charge, so the period is worded
// "for a month". Every consumer composes "<price> for a month".
export const PERIOD_MONTHLY_LABEL = "for a month";

/**
 * Compact inline form for upgrade prompts: "₹599 for a month" (OR-P6: never "/month").
 *
 * Rendered at the moment of upgrade intent (the practice-limit gate, the mock-view gate, the
 * upgrade sheet, the trial lines), where the only honest number is the one the student would
 * actually be charged. PRICING-1: a FUNCTION of the offer state, evaluated at render — never a
 * module constant — so 1 Dec 2026 moves every surface to the list price with no edit and no
 * module-load clock read. Pass `foundingRateApplies(Date.now(), founder)`.
 */
export function monthlyInline(foundingRate: boolean = foundingOfferOpen(Date.now())): string {
  return `${foundingRate ? PRICE_MONTHLY_FOUNDING_DISPLAY : PRICE_MONTHLY_LIST_DISPLAY} for a month`;
}

/**
 * Till-boards copy that carries NO rupee figure. These are the only till-boards
 * strings allowed in static markup (prerendered/*.html, the sign-in strip, the
 * FAQ): the figures themselves depend on today's date, so they exist only after
 * the page mounts in a browser. See `tillBoardsQuote()`.
 */
export const BOARD_PASS_NAME = "Board Pass";
/** PRICING-1 (owner, 25 Oct 2026) — the Board Pass LEADS; this line states it first, number-free except the saving. */
export const TILL_BOARDS_LINE = `One payment, till your board exam — ${TILL_BOARDS_SAVING_PERCENT}% off paying monthly.`;
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
export const FOUNDING_LOCK_COPY = "Your founding price stays locked for every pass you buy.";
/**
 * The founding badge, word for word (PARENTS-CTA-1, owner ruling 2026-10-19):
 * "Founding member offer" — NO seat count. Replaces the retired
 * `FOUNDING_COHORT_COPY` (a "First N students." seat line).
 */
export const FOUNDING_OFFER_BADGE = `${FOUNDING_LABEL} offer`;
/**
 * PRICING-1: the real end date, beside the badge. Plain words, a calendar date, no
 * timer. After the close nothing renders it (the badge and this line are gated on
 * `FOUNDING_OFFER_OPEN`).
 */
export const FOUNDING_OFFER_UNTIL_COPY = `Founding price until ${FOUNDING_OFFER_LAST_DAY_LABEL}. From ${FOUNDING_OFFER_LIST_FROM_LABEL}, Premium is ${PRICE_MONTHLY_LIST_DISPLAY} for a month.`;

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
 * means units per order, not seats remaining, so using it for a cohort size
 * would be an invented semantic — and Google ignores or flags invented Offer
 * properties. The same reasoning rules out publishing the SAVING: schema.org has
 * no field for it. The saving lives in visible copy; no seat count is published
 * anywhere (PARENTS-CTA-1).
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
 * `foundingOpen` defaults to the calendar at `now` (`foundingOfferOpen(now)`, the same rule the server mirrors); it is a parameter so the closed
 * state can be tested without mocking this module (nothing may `vi.mock`
 * src/config — see gradingLimits.guard.test.ts).
 */
export function tillBoardsQuote(
  now: Date,
  boardIso: string,
  foundingOpen: boolean = foundingOfferOpen(now),
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
