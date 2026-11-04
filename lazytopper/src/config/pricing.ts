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

/** Founding-member price — while `foundingOfferOpen(now)`. */
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
 * PRICE-FIXED-1 (owner ruling, 31 Oct 2026; revised 21:12 IST): the Board Pass (`till_boards`) is a FIXED amount - it
 * no longer shrinks month by month and is not a percentage of the monthly price. It is TILL_BOARDS_FOUNDING_INR until
 * the founding deadline (`FOUNDING_OFFER_CLOSES_AT_ISO`) and TILL_BOARDS_AFTER_FOUNDING_INR from that instant on.
 * The SERVER decides which applies from its own clock; the client only shows it. The server mirrors both constants in
 * `server/services/passPricing.cjs`; `passPricing.parity.test.ts` proves they agree. (The after-founding price is
 * PROVISIONAL: the owner may change it - this is the ONE constant, used everywhere.)
 */
export const TILL_BOARDS_FOUNDING_INR = 1917;
export const TILL_BOARDS_AFTER_FOUNDING_INR = 2499;
/** The Board Pass price (rupees) at `now`. PURE: the clock is an argument. */
export function tillBoardsPriceInr(now: Date | number = Date.now()): number {
  return foundingOfferOpen(now) ? TILL_BOARDS_FOUNDING_INR : TILL_BOARDS_AFTER_FOUNDING_INR;
}

/**
 * GST-EXCL-1 (owner ruling, 4 Nov 2026, 18:12-18:20 IST): the company is GST-registered and the Board Pass is priced
 * TAX-EXCLUSIVE from 00:00 IST on 5 Nov 2026 - "actual price plus GST, which will be deducted during Razorpay payment".
 * The base prices above do not change; from this instant the amount CHARGED is base + 18% GST, rounded to the rupee
 * (₹1,917 -> ₹2,262 founding; ₹2,499 -> ₹2,949 from 1 Dec). Before it, every figure is byte-identical to today's.
 * Board Pass ONLY: PDF packs stay all-in. The SERVER mirrors these in `server/services/passPricing.cjs` and decides
 * what is charged on its own clock; `passPricing.parity.test.ts` proves the two agree.
 * ★ CONSUMER LAW (E-Commerce Rules 2020, CCPA dark-pattern guidelines 2023): the TOTAL incl. tax is shown before Razorpay
 * opens. Owner (4 Nov 18:20 IST): price tags read only "₹1,917 + GST"; every Pay button names the TOTAL ("Pay ₹2,262");
 * the checkout step shows the breakup "₹1,917 + ₹345 GST (18%) = ₹2,262". Never a base price alone on a Pay button.
 */
export const GST_RATE_PERCENT = 18;
export const GST_RATE = GST_RATE_PERCENT / 100;
export const GST_EXCLUSIVE_FROM_ISO = "2026-11-05T00:00:00+05:30";
export const GST_EXCLUSIVE_FROM_MS = Date.parse(GST_EXCLUSIVE_FROM_ISO);

/** Is the Board Pass priced "+ GST" at the instant `now`? PURE: the clock is an argument. */
export function boardPassGstExclusive(now: Date | number = Date.now()): boolean {
  const ms = now instanceof Date ? now.getTime() : now;
  return Number.isFinite(ms) && ms >= GST_EXCLUSIVE_FROM_MS;
}

/** base + 18% GST, rounded to the rupee. Integer arithmetic (1917 * 118 / 100), so no binary-fraction drift. */
export function withGstInr(baseInr: number): number {
  return Math.round((baseInr * (100 + GST_RATE_PERCENT)) / 100);
}

/** What one Board Pass costs at `now`: the base price, the GST on it, and the TOTAL the student is charged. */
export interface BoardPassCharge {
  baseInr: number;
  /** 0 before the GST cut-off (the price was all-in). */
  gstInr: number;
  /** What Razorpay is asked for (before any server-side pack credit). */
  totalInr: number;
  /** 0.18 from the cut-off, 0 before it. */
  gstRate: number;
  gstExclusive: boolean;
}

/**
 * THE ONE RULE for EVERY paid product (owner scope, 4 Nov 18:23 IST: the Board Pass, every PDF pack incl. CBQ, top-ups):
 * the charge for an item whose BASE price is `baseInr` at `now`. PURE. Mirrored by passPricing.cjs `chargeFor`.
 */
export function chargeFor(baseInr: number, now: Date | number = Date.now()): BoardPassCharge {
  if (!boardPassGstExclusive(now)) return { baseInr, gstInr: 0, totalInr: baseInr, gstRate: 0, gstExclusive: false };
  const totalInr = withGstInr(baseInr);
  return { baseInr, gstInr: totalInr - baseInr, totalInr, gstRate: GST_RATE, gstExclusive: true };
}
/** The rupees CHARGED for a base price at `now` (base before the cut-off; base + 18% GST from it). */
export function priceWithGst(baseInr: number, now: Date | number = Date.now()): number {
  return chargeFor(baseInr, now).totalInr;
}
/** A base price as a price TAG at `now`: "₹49" before the cut-off; "₹49 + GST" from it. Never on a Pay/Buy button. */
export function displayPlusGst(baseInr: number, now: Date | number = Date.now()): string {
  return boardPassGstExclusive(now) ? `${formatInr(baseInr)} + GST` : formatInr(baseInr);
}
/** What a Pay/Buy button names for a base price at `now`: the amount CHARGED ("₹58" for ₹49 from the cut-off). */
export function payDisplay(baseInr: number, now: Date | number = Date.now()): string {
  return formatInr(priceWithGst(baseInr, now));
}
/** The checkout-step breakup for a base price at `now`: "₹49 + ₹9 GST (18%) = ₹58". Null before the cut-off. */
export function gstBreakdownFor(baseInr: number, now: Date | number = Date.now()): string | null {
  const c = chargeFor(baseInr, now);
  return c.gstExclusive ? `${formatInr(c.baseInr)} + ${formatInr(c.gstInr)} GST (${GST_RATE_PERCENT}%) = ${formatInr(c.totalInr)}` : null;
}

/** The Board Pass charge at `now`. PURE. */
export function boardPassCharge(now: Date | number = Date.now()): BoardPassCharge {
  return chargeFor(tillBoardsPriceInr(now), now);
}

/** The rupees the student is CHARGED for a Board Pass at `now` (base + GST from the cut-off). */
export function boardPassTotalInr(now: Date | number = Date.now()): number {
  return boardPassCharge(now).totalInr;
}

/**
 * PRICE-FIXED-1 (owner ruling, 31 Oct 2026): from this instant the MONTH pass is no longer sold to an account that
 * has never bought one ("from tomorrow, remove the option of per month"). A fixed UTC+05:30 instant. The SERVER
 * enforces it on its own clock and from its own records; the client only decides what to SHOW.
 */
export const MONTH_PASS_RETIRED_AT_ISO = "2026-11-01T00:00:00+05:30";
export const MONTH_PASS_RETIRED_AT_MS = Date.parse(MONTH_PASS_RETIRED_AT_ISO);

/** Has the month pass been retired for new buyers at the instant `now`? PURE. */
export function monthPassRetired(now: Date | number = Date.now()): boolean {
  const ms = now instanceof Date ? now.getTime() : now;
  return Number.isFinite(ms) && ms >= MONTH_PASS_RETIRED_AT_MS;
}

/** Mirror of the server rule: a prior month buyer always may; everyone else only before the retirement instant. */
export function monthPassAvailable(now: Date | number, hasPriorMonthOrder: boolean): boolean {
  return hasPriorMonthOrder === true || !monthPassRetired(now);
}

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
/** A Board Pass base price as a price TAG at `now`: "₹2,499", or "₹2,499 + GST" from the GST cut-off (GST-EXCL-1). */
export function boardPassTagFor(baseInr: number, now: Date | number = Date.now()): string {
  return displayPlusGst(baseInr, now);
}
/**
 * The Board Pass price at `now`, as a price TAG ("₹1,917" until the GST cut-off; "₹1,917 + GST" from it; "₹2,499 + GST"
 * from 1 Dec). Read at RENDER time. ⚠ NEVER on a Pay button - a button names what is CHARGED: `boardPassPayDisplay`.
 */
export function boardPassPriceDisplay(now: Date | number = Date.now()): string {
  return boardPassTagFor(tillBoardsPriceInr(now), now);
}
/** GST-EXCL-1 - the amount CHARGED, formatted ("₹1,917" before the cut-off; "₹2,262" from it). Every Pay button reads this. */
export function boardPassPayDisplay(now: Date | number = Date.now()): string {
  return formatInr(boardPassTotalInr(now));
}
/**
 * GST-EXCL-1 - the breakup a checkout sheet shows before Razorpay opens: "₹1,917 + ₹345 GST (18%) = ₹2,262".
 * Null before the cut-off.
 */
export function boardPassGstBreakdown(now: Date | number = Date.now()): string | null {
  return gstBreakdownFor(tillBoardsPriceInr(now), now);
}
/**
 * "₹1,917 \u2014 one payment till your boards" - the ONE price line every surface shows (PRICE-FIXED-1). From the GST
 * cut-off: "₹1,917 + GST \u2014 one payment till your boards" (owner, 4 Nov 18:20 IST: the TOTAL appears only at the
 * checkout step and on Pay buttons - boardPassGstBreakdown / boardPassPayDisplay).
 */
export function boardPassPriceLine(now: Date | number = Date.now()): string {
  return `${boardPassPriceDisplay(now)} \u2014 one payment till your boards`;
}
/**
 * The founding label (owner, 21:20 IST 31 Oct 2026): before the deadline the Board Pass price is called, exactly,
 * "Founding member offer" - ONE shared string (`FOUNDING_OFFER_BADGE`), so every surface says it the same way.
 * From the deadline on it is null: the label disappears and the surface shows only the current price.
 */
export function boardPassFoundingLabel(now: Date | number = Date.now()): string | null {
  return foundingOfferOpen(now) ? FOUNDING_OFFER_BADGE : null;
}
/**
 * The one honest deadline line (owner, 21:12 + 21:20 IST 31 Oct 2026): no crossed-out price, no saving claim, no
 * countdown. While the founding offer is open: "Founding member offer ends 30 November. From 1 December: ₹2,499."
 * From the deadline on it is null.
 */
export function boardPassDeadlineLine(now: Date | number = Date.now()): string | null {
  if (!foundingOfferOpen(now)) return null;
  return `${FOUNDING_OFFER_BADGE} ends ${FOUNDING_OFFER_LAST_DAY_LABEL}. From ${FOUNDING_OFFER_LIST_FROM_LABEL}: ${boardPassTagFor(TILL_BOARDS_AFTER_FOUNDING_INR, now)}.`;
}
/**
 * OFFERS-V2 - the short line under a Pay button: "One payment · ₹2,499 from 1 Dec" while the founding offer is open. DERIVED from the same
 * constants as boardPassDeadlineLine (so the date and the figure cannot drift from it); from the deadline on it is the plain "One payment,
 * no renewals". No crossed-out price, no saving claim.
 */
export function boardPassFromLine(now: Date | number = Date.now()): string {
  if (!boardPassDeadlineLine(now)) return "One payment, no renewals";
  const [day = "", month = ""] = FOUNDING_OFFER_LIST_FROM_LABEL.split(" ");
  return `One payment \u00b7 ${boardPassTagFor(TILL_BOARDS_AFTER_FOUNDING_INR, now)} from ${day} ${month.slice(0, 3)}`;
}
/** The Board Pass LEADS (PRICING-1). Number-free so it may sit in static markup; no "saving" claim against a monthly price (PRICE-FIXED-1). */
export const TILL_BOARDS_LINE = "One payment, till your board exam.";
export const TILL_BOARDS_INLINE = `or pay once till boards`;

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
export const FOUNDING_LOCK_COPY = "Your founding month price stays locked for every month pass you buy.";
/**
 * The founding badge, word for word (PARENTS-CTA-1, owner ruling 2026-10-19):
 * "Founding member offer" — NO seat count. Replaces the retired
 * `FOUNDING_COHORT_COPY` (a "First N students." seat line).
 */
export const FOUNDING_OFFER_BADGE = `${FOUNDING_LABEL} offer`;
/**
 * PRICING-1: the real end date, beside the badge. Plain words, a calendar date, no
 * timer. After the close nothing renders it (the badge and this line are gated on
 * `foundingOfferOpen(Date.now())`).
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
  /** Smallest k >= 1 with (today in IST) + k calendar months >= the board date. Informational only. */
  monthsLeft: number;
  /** The fixed one-time BASE price (PRICE-FIXED-1). GST-EXCL-1: from the GST cut-off GST is added on top - see totalInr. */
  priceInr: number;
  /** The price TAG ("₹1,917", or "₹1,917 + GST" from the GST cut-off). Never on a Pay button. */
  priceDisplay: string;
  /** GST-EXCL-1 - the amount CHARGED (base + GST from the cut-off; = priceInr before it). */
  totalInr: number;
  /** "₹2,262" - what a Pay button names. */
  totalDisplay: string;
  /** "till your boards (Feb 2027)" — the month and year of the board date. */
  untilLabel: string;
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
  // PRICE-FIXED-1: accepted and IGNORED - the Board Pass price follows the DATE (the server's rule), never a flag.
  _foundingOpen: boolean = foundingOfferOpen(now),
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

  return {
    monthsLeft,
    priceInr: tillBoardsPriceInr(now),
    priceDisplay: boardPassPriceDisplay(now),
    totalInr: boardPassTotalInr(now),
    totalDisplay: boardPassPayDisplay(now),
    untilLabel: `till your boards (${MONTH_SHORT[board.m]} ${board.y})`,
  };
}
