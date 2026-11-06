// STORED-RATE-1 — the SERVER's price and board date for a pass.
//
// ★ WHY A MIRROR AND NOT AN IMPORT. The source of truth is TypeScript ESM:
//   `src/config/pricing.ts`          PRICE_MONTHLY_FOUNDING_INR, PRICE_MONTHLY_LIST_INR,
//                                    FOUNDING_OFFER_CLOSES_AT_ISO, foundingOfferOpen(), TILL_BOARDS_PAY_FRACTION,
//                                    tillBoardsQuote()
//   `src/services/cbseExamDate.ts`   predictCbseExamDate()
// `predictCbseExamDate` reads the clock itself (`new Date()`), so the server cannot ask
// it "what is the board date at THIS instant" — a grant must be computed at the `now`
// it is given, not at whatever time the module is evaluated. The server therefore
// carries a small, pure CJS copy with the clock as an argument.
//
// ★★ THE COPY IS NOT TRUSTED — IT IS PROVED. `src/config/passPricing.parity.test.ts`
// loads THIS file next to the real `pricing.ts` / `cbseExamDate.ts` and asserts they
// agree on every constant and on dated cases across month ends and the board day. A
// price change in pricing.ts that is not made here turns that suite red, which is the
// only thing that makes a duplicated number safe.
//
// ★ IST, NOT HOST TIME. The client predictor uses the DEVICE's local calendar date; a
// grant must not depend on where the server happens to run, so this copy uses the
// Asia/Kolkata calendar date (fixed UTC+05:30, no DST) — the same convention
// `tillBoardsQuote` already uses. For a student in India the two are the same date.

/** Mirror of pricing.ts PRICE_MONTHLY_LIST_INR. */
const PRICE_MONTHLY_LIST_INR = 999;
/** Mirror of pricing.ts PRICE_MONTHLY_FOUNDING_INR. */
const PRICE_MONTHLY_FOUNDING_INR = 599;
/**
 * Mirror of pricing.ts FOUNDING_OFFER_CLOSES_AT_ISO (PRICING-1): the first instant the
 * founding offer is CLOSED — 00:00 on 1 Dec 2026 IST. The SERVER decides what is charged,
 * so it evaluates this against its OWN clock (`foundingOfferOpen(nowMs)`), per request.
 */
const FOUNDING_OFFER_CLOSES_AT_ISO = '2026-12-01T00:00:00+05:30';
const FOUNDING_OFFER_CLOSES_AT_MS = Date.parse(FOUNDING_OFFER_CLOSES_AT_ISO);

/** Mirror of pricing.ts foundingOfferOpen(now). PURE: the instant is an argument. */
function foundingOfferOpen(now) {
  const ms = now instanceof Date ? now.getTime() : now;
  return typeof ms === 'number' && Number.isFinite(ms) && ms < FOUNDING_OFFER_CLOSES_AT_MS;
}
/**
 * Mirror of pricing.ts TILL_BOARDS_FOUNDING_INR / TILL_BOARDS_AFTER_FOUNDING_INR (PRICE-FIXED-1, owner ruling
 * 31 Oct 2026, revised 21:12 IST): the Board Pass is a FIXED amount - it does not shrink month by month.
 * It is 1917 until the founding deadline (FOUNDING_OFFER_CLOSES_AT_ISO) and 2499 from that instant on.
 * The SERVER picks which applies from ITS OWN clock; the client's date is never trusted.
 * (2499 is provisional: the owner may change it - it is this ONE constant, used everywhere.)
 */
const TILL_BOARDS_FOUNDING_INR = 1917;
const TILL_BOARDS_AFTER_FOUNDING_INR = 2499;
/** The Board Pass price (rupees) at `now`: founding until the deadline, the after-founding price from it. */
function tillBoardsPriceInr(now) {
  return foundingOfferOpen(toMsLoose(now)) ? TILL_BOARDS_FOUNDING_INR : TILL_BOARDS_AFTER_FOUNDING_INR;
}
function toMsLoose(now) {
  return now instanceof Date ? now.getTime() : now;
}
/**
 * Mirror of pricing.ts GST_RATE_PERCENT / GST_EXCLUSIVE_FROM_ISO / boardPassGstExclusive / withGstInr / boardPassCharge
 * (GST-EXCL-1, owner ruling 4 Nov 2026; moment moved to 7 Nov by owner ruling 6 Nov 18:52 IST): from 00:00 IST on 7 Nov 2026 the Board Pass is priced "+ 18% GST" and the
 * amount CHARGED is base + GST rounded to the rupee (1917 -> 2262; 2499 -> 2949). The SERVER evaluates the cut-off on
 * ITS OWN clock when an order is created; an order created before it keeps its all-in amount. Every paid product.
 */
const GST_RATE_PERCENT = 18;
const GST_RATE = GST_RATE_PERCENT / 100;
const GST_EXCLUSIVE_FROM_ISO = '2026-11-07T00:00:00+05:30';
const GST_EXCLUSIVE_FROM_MS = Date.parse(GST_EXCLUSIVE_FROM_ISO);
/** Is the Board Pass priced "+ GST" at `now`? PURE. */
function boardPassGstExclusive(now) {
  const ms = toMsLoose(now);
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= GST_EXCLUSIVE_FROM_MS;
}
/** base + 18% GST, rounded to the rupee (integer arithmetic). */
function withGstInr(baseInr) {
  return Math.round((baseInr * (100 + GST_RATE_PERCENT)) / 100);
}
/**
 * Mirror of pricing.ts chargeFor(base, now) - the ONE rule for EVERY paid product (owner scope, 4 Nov 18:23 IST: Board Pass,
 * every PDF pack, top-ups). The charge for an item whose BASE price is `baseInr`, for an order created at `now`:
 * { baseInr, gstInr, totalInr, gstRate, gstExclusive }. Before the cut-off: gstInr 0, totalInr = baseInr, gstRate 0.
 */
function chargeFor(baseInr, now) {
  if (!boardPassGstExclusive(now)) return { baseInr, gstInr: 0, totalInr: baseInr, gstRate: 0, gstExclusive: false };
  const totalInr = withGstInr(baseInr);
  return { baseInr, gstInr: totalInr - baseInr, totalInr, gstRate: GST_RATE, gstExclusive: true };
}
/** Mirror of pricing.ts priceWithGst(base, now): the rupees CHARGED for a base price at `now`. */
function priceWithGst(baseInr, now) {
  return chargeFor(baseInr, now).totalInr;
}
const boardPassChargeFor = chargeFor;
/** Mirror of pricing.ts formatInr: "₹1,917" with Indian grouping, independent of the host's ICU. */
function formatInr(amount) {
  const rounded = Math.round(Math.abs(amount));
  const digits = rounded.toString();
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `${amount < 0 ? '-' : ''}₹${grouped}`;
}
/** Mirror of pricing.ts displayPlusGst: a price TAG ("₹49"; "₹49 + GST" from the cut-off). For email copy. */
function displayPlusGst(baseInr, now) {
  return boardPassGstExclusive(now) ? `${formatInr(baseInr)} + GST` : formatInr(baseInr);
}
/** Mirror of pricing.ts gstBreakdownFor: "₹49 + ₹9 GST (18%) = ₹58" from the cut-off; null before it. */
function gstBreakdownFor(baseInr, now) {
  const c = chargeFor(baseInr, now);
  return c.gstExclusive ? `${formatInr(c.baseInr)} + ${formatInr(c.gstInr)} GST (${GST_RATE_PERCENT}%) = ${formatInr(c.totalInr)}` : null;
}
/** The breakup a STORED order carries ({ baseInr, gstInr, amountPaise }), or null for an order created before the cut-off. */
function orderGstBreakdown(order) {
  if (!order || !Number.isInteger(order.baseInr) || !Number.isInteger(order.gstInr) || !(order.gstInr > 0)) return null;
  const total = Number.isInteger(order.totalInr) ? order.totalInr : order.baseInr + order.gstInr;
  return `${formatInr(order.baseInr)} + ${formatInr(order.gstInr)} GST (${GST_RATE_PERCENT}%) = ${formatInr(total)}`;
}
/** Does a stored order's amount equal `baseInr` as charged when it was created (all-in before the cut-off, + GST after)? */
function orderAmountMatchesBase(order, baseInr) {
  if (!order || !Number.isInteger(order.amountPaise) || !Number.isInteger(baseInr)) return false;
  if (order.amountPaise === baseInr * 100) return true; // an order created before the cut-off
  return order.baseInr === baseInr && Number.isInteger(order.gstInr) && order.amountPaise === withGstInr(baseInr) * 100
    && order.gstInr === withGstInr(baseInr) - baseInr;
}
/** Mirror of pricing.ts boardPassCharge(now): the charge for the Board Pass price at `now`. */
function boardPassCharge(now) {
  return boardPassChargeFor(tillBoardsPriceInr(now), now);
}
/**
 * Mirror of pricing.ts MONTH_PASS_RETIRED_AT_ISO (PRICE-FIXED-1): from this instant the month pass is no
 * longer sold to an account that has never bought one. The SERVER evaluates it against its OWN clock.
 */
const MONTH_PASS_RETIRED_AT_ISO = '2026-11-01T00:00:00+05:30';
const MONTH_PASS_RETIRED_AT_MS = Date.parse(MONTH_PASS_RETIRED_AT_ISO);
/** Mirror of pricing.ts monthPassRetired(now). PURE: the instant is an argument. */
function monthPassRetired(now) {
  const ms = now instanceof Date ? now.getTime() : now;
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= MONTH_PASS_RETIRED_AT_MS;
}
/** Mirror of pricing.ts monthPassAvailable(now, hasPriorMonthOrder). */
function monthPassAvailable(now, hasPriorMonthOrder) {
  return hasPriorMonthOrder === true || !monthPassRetired(now);
}
/**
 * Mirror of pricing.ts TILL_BOARDS_PAY_FRACTION. RETIRED as a price rule by PRICE-FIXED-1: kept ONLY because
 * the quote still reports the legacy monthly-times-months figure (`fullInr`) for the ops/admin readers.
 */
const TILL_BOARDS_PAY_FRACTION = 0.8;
/** Mirror of pricing.ts TILL_BOARDS_MAX_MONTHS. */
const TILL_BOARDS_MAX_MONTHS = 36;

/** Mirror of cbseExamDate.ts predictCbseExamDate's `officialDates` table (class 10). */
const OFFICIAL_BOARD_DATES_CLASS10 = { '2025-26': '2026-02-17' };
/** Mirror of cbseExamDate.ts predictCbseExamDate's `tentativeDay` (17 February). */
const TENTATIVE_BOARD_DAY = 17;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function toMs(now) {
  if (now instanceof Date) return now.getTime();
  if (typeof now === 'number') return now;
  return NaN;
}

/** The Asia/Kolkata calendar date at an instant; `m` is 0-based. */
function istCalendarDate(nowMs) {
  const shifted = new Date(nowMs + IST_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/** `date + k` calendar months, end-of-month CLAMPED (31 Jan + 1 = 28/29 Feb). */
function addCalendarMonths(date, k) {
  const total = date.m + k;
  const y = date.y + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return { y, m, d: Math.min(date.d, daysInMonth(y, m)) };
}

function compareDates(a, b) {
  return a.y - b.y || a.m - b.m || a.d - b.d;
}

function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  if (m < 0 || m > 11 || d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}


/**
 * Mirror of cbseExamDate.ts `predictCbseExamDate("10")`, evaluated at `now` on the
 * IST calendar. Returns "YYYY-MM-DD".
 */
function predictBoardDateIso(now) {
  const nowMs = toMs(now);
  if (!Number.isFinite(nowMs)) return null;
  const today = istCalendarDate(nowMs);
  const month = today.m + 1;
  const todayUtc = Date.UTC(today.y, today.m, today.d);

  const academicYear = month >= 4 ? today.y : today.y - 1;
  const sessionKey = `${academicYear}-${String(academicYear + 1).slice(2)}`;
  const official = OFFICIAL_BOARD_DATES_CLASS10[sessionKey];
  if (official) {
    const officialUtc = new Date(`${official}T00:00:00Z`).getTime();
    if (officialUtc >= todayUtc) return official;
  }

  let year = month >= 8 ? today.y + 1 : today.y;
  let examUtc = Date.UTC(year, 1, TENTATIVE_BOARD_DAY);
  if (examUtc < todayUtc) {
    year += 1;
    examUtc = Date.UTC(year, 1, TENTATIVE_BOARD_DAY);
  }
  return new Date(examUtc).toISOString().slice(0, 10);
}

/** Monthly rate for an offer. */
function monthlyInrFor(foundingOpen) {
  return foundingOpen ? PRICE_MONTHLY_FOUNDING_INR : PRICE_MONTHLY_LIST_INR;
}

/**
 * Mirror of pricing.ts `tillBoardsQuote(now, boardIso, foundingOpen)` — the numeric
 * half only (display strings are the client's business). Null for an unparseable date.
 */
function tillBoardsQuote(now, boardIso, foundingOpen) {
  const nowMs = toMs(now);
  if (foundingOpen === undefined) foundingOpen = foundingOfferOpen(nowMs);
  const board = parseIsoDate(boardIso);
  if (!board || !Number.isFinite(nowMs)) return null;
  const today = istCalendarDate(nowMs);

  let monthsLeft = 1;
  while (
    monthsLeft < TILL_BOARDS_MAX_MONTHS &&
    compareDates(addCalendarMonths(today, monthsLeft), board) < 0
  ) {
    monthsLeft += 1;
  }

  const monthlyInr = monthlyInrFor(foundingOpen);
  const fullInr = monthlyInr * monthsLeft;
  // PRICE-FIXED-1: the charged amount is the Board Pass price for the server's date (founding, then after-founding). It follows the DATE only: the founding-member stickiness is a month-pass lock.
  return { monthsLeft, monthlyInr, fullInr, priceInr: tillBoardsPriceInr(nowMs) };
}

/**
 * The instant a month pass that starts at `startMs` ends: the same IST wall-clock
 * time one calendar month later, end-of-month clamped.
 */
function addOneCalendarMonthIst(startMs) {
  const shifted = new Date(startMs + IST_OFFSET_MS);
  const date = { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
  const next = addCalendarMonths(date, 1);
  const wall = Date.UTC(
    next.y, next.m, next.d,
    shifted.getUTCHours(), shifted.getUTCMinutes(), shifted.getUTCSeconds(), shifted.getUTCMilliseconds(),
  );
  return wall - IST_OFFSET_MS;
}

/** The last millisecond of an IST calendar day given as "YYYY-MM-DD". */
function endOfIstDayMs(iso) {
  const date = parseIsoDate(iso);
  if (!date) return null;
  return Date.UTC(date.y, date.m, date.d + 1) - IST_OFFSET_MS - 1;
}

/* ── TOPUP-1 · extra-usage packs (the SERVER's price table; the client never sends an amount) ──────────
   A pack is a one-time payment that adds AI-usage CREDIT, spent only after the plan's own window is at cap.
   `priceInr` is what the student pays (GST included). `creditInr` is the BASE credit in rupees of AI COST (a launch bonus is added by topupCreditFor).
   THE ARITHMETIC (OWNER DECISION 22 Oct 2026 - supersedes the 10 Oct 20 / 65 figures):
     49  incl. 18% GST -> 49 / 1.18  = 41.53 net;  less the Razorpay fee (~2% + 18% GST ~ 2.4%) ~ 40.5
                                                                              ->  credit 25  (~62% of net)
     149 incl. 18% GST -> 149 / 1.18 = 126.27 net; less the fee ~ 123.3     ->  credit 80  (~65% of net)
   Credit is held in MICRO-INR (1 rupee = 1,000,000), the unit usageLedger.cjs already meters in.
   ★ The student NEVER sees the credit in rupees - only "about N answer checks / Tutor messages ..."
     (topupBreakdownFor / usageCredit.creditView). The rupee figure is server-internal.
   ★ Credit is metered at the REAL model cost in force at the call (modelPrices.priceFor), so when
     gemini-3.8-flash doubles on 2027-01-01 a pack buys about half as many GRADING calls. The
     "about N" figures are therefore computed at the VIEW instant (activityCostMicroInr), never stored. */
const MICRO_INR_PER_INR = 1_000_000;
const TOPUP_PRODUCTS = Object.freeze({
  topup_49: Object.freeze({ priceInr: 49, creditInr: 25 }),
  topup_149: Object.freeze({ priceInr: 149, creditInr: 80 }),
});

/**
 * BONUS OFFER (owner 11 Oct 00:13 IST, TOPUP-1 v1.3): BUILT BUT OFF at launch. `TOPUP_BONUS_PERCENT` is 0, so
 * a pack credits its base amount and no offer text exists anywhere. The owner plans +25% near the boards
 * (around December) as a one-constant change in a later small PR - never an env var set by an agent.
 * `TOPUP_BONUS_ENDS_ISO` is an optional last day (IST, "YYYY-MM-DD") after which the bonus stops by itself.
 * It is NOT tied to the founding offer: the founding price is a different thing and is untouched here.
 * When on (e.g. +25%): 49 -> 25 + 6, 149 -> 80 + 20 (the bonus is floored to a whole rupee), recorded
 * SEPARATELY from the base. Owner 22 Oct 2026: NO bonus at launch - the percent stays 0.
 */
const TOPUP_BONUS_PERCENT = 0;
const TOPUP_BONUS_ENDS_ISO = null;

/** Is the bonus running at `nowMs`? (percent > 0, and not past its optional last IST day) */
function topupBonusActive(nowMs, percent = TOPUP_BONUS_PERCENT, endsIso = TOPUP_BONUS_ENDS_ISO) {
  if (!(Number.isFinite(percent) && percent > 0)) return false;
  if (endsIso == null) return true;
  const end = endOfIstDayMs(endsIso);
  return end !== null && Number.isFinite(nowMs) && nowMs <= end;
}

/**
 * What a pack credits at `nowMs`: `{ baseMicroInr, bonusMicroInr, totalMicroInr, bonusPercent }`. Null for an
 * unknown product. `bonus` overrides the two constants (a test seam; production passes nothing).
 */
function topupCreditFor(key, nowMs, bonus) {
  if (!isTopupProduct(key)) return null;
  const p = TOPUP_PRODUCTS[key];
  const percent = bonus && bonus.percent !== undefined ? bonus.percent : TOPUP_BONUS_PERCENT;
  const endsIso = bonus && bonus.endsIso !== undefined ? bonus.endsIso : TOPUP_BONUS_ENDS_ISO;
  const pct = topupBonusActive(nowMs, percent, endsIso) ? percent : 0;
  const bonusInr = Math.floor((p.creditInr * pct) / 100);
  const baseMicroInr = p.creditInr * MICRO_INR_PER_INR;
  const bonusMicroInr = bonusInr * MICRO_INR_PER_INR;
  return { baseMicroInr, bonusMicroInr, totalMicroInr: baseMicroInr + bonusMicroInr, bonusPercent: pct };
}

/**
 * What ONE activity costs, in rupees of AI cost, for the pack breakdown and the admission estimate (TOPUP-1 §2.5).
 * ★ P12 is UNVERIFIED for the paper rows: the first four are METER-AUDIT-2's measured figures (Desktop\\diff\\a17\\
 * report-meter-audit-2-2026-10-07.md §1-§2, ₹ at 96.5/$); the three paper rows are ESTIMATES (₹0.11 per graded question =
 * METER-AUDIT-2's 38-question paper ≈ ₹4.1, times a typical paper size) until the owner-run ledger export (P12) replaces them.
 * The sheet's "about N" is floor(credit / cost), computed here - never typed into the client.
 *
 * ★ `estimate: true` marks the three PAPER rows (D97): the client must read them as "about N" ESTIMATES.
 *   (Every row is an "about" figure; the paper rows are additionally not measured.)
 * ★ `model` is the model whose LIST PRICE the measured `costInr` was taken at (today's MODEL_PRICES row):
 *   grading runs DEFAULT_GRADING_MODEL (gemini-3.8-flash, server/grading/modelConfig.cjs); the Tutor,
 *   detection and More-like-this run GEMINI_MODEL's default (gemini-2.5-flash, serverConfig.cjs). The cost
 *   at any instant is `costInr` scaled by priceFor(model, at) / priceFor(model) - see activityCostMicroInr.
 */
const GRADING_PRICE_MODEL = "gemini-3.8-flash";
const GENERAL_PRICE_MODEL = "gemini-2.5-flash";
const TOPUP_ACTIVITIES = Object.freeze({
  answer_check: Object.freeze({ label: "answer checks", costInr: 2.05, model: GRADING_PRICE_MODEL, estimate: false, source: "METER-AUDIT-2" }),
  tutor_message: Object.freeze({ label: "Tutor messages", costInr: 0.357, model: GENERAL_PRICE_MODEL, estimate: false, source: "METER-AUDIT-2" }),
  question_detection: Object.freeze({ label: "question readings", costInr: 0.1, model: GENERAL_PRICE_MODEL, estimate: false, source: "METER-AUDIT-2" }),
  more_like_this: Object.freeze({ label: "More like this sets", costInr: 0.5, model: GENERAL_PRICE_MODEL, estimate: false, source: "METER-AUDIT-2" }),
  chapter_test_grading: Object.freeze({ label: "Chapter Test gradings", costInr: 1.65, model: GRADING_PRICE_MODEL, estimate: true, source: "ESTIMATE (15 Q x 0.11)" }),
  full_mock_grading: Object.freeze({ label: "Full Mock gradings", costInr: 4.18, model: GRADING_PRICE_MODEL, estimate: true, source: "ESTIMATE (38 Q x 0.11)" }),
  worksheet_grading: Object.freeze({ label: "Worksheet gradings", costInr: 1.1, model: GRADING_PRICE_MODEL, estimate: true, source: "ESTIMATE (10 Q x 0.11)" }),
});
/** Per graded question, for the admission estimate of a paper (ESTIMATE, see above; a grading cost). */
const TOPUP_PER_QUESTION_COST_INR = 0.11;

/**
 * How much `model`'s list price at `atMs` is of its price today (1 = unchanged; 2 = doubled). Uses the
 * OUTPUT rate: thinking bills at the output rate and is the largest line on every call (modelPrices.cjs).
 * An unpriced model, or no finite instant, is 1 - never a guessed multiplier.
 */
function priceMultiplierAt(model, atMs) {
  const { priceFor } = require("./modelPrices.cjs");
  const today = priceFor(model);
  const then = Number.isFinite(atMs) ? priceFor(model, atMs) : today;
  if (!today || !then || !(today.outputUsdPerMillion > 0) || !(then.outputUsdPerMillion > 0)) return 1;
  return then.outputUsdPerMillion / today.outputUsdPerMillion;
}

/** One activity's expected cost in micro-INR at `atMs` (the price in force then). Unknown activity -> answer_check. */
function activityCostMicroInr(activity, atMs) {
  const a = Object.prototype.hasOwnProperty.call(TOPUP_ACTIVITIES, activity) ? TOPUP_ACTIVITIES[activity] : TOPUP_ACTIVITIES.answer_check;
  // Integer micro-INR first (2.05 * 1e6 is not exact in binary), then the multiplier.
  return Math.ceil(Math.round(a.costInr * MICRO_INR_PER_INR) * priceMultiplierAt(a.model, atMs));
}

/**
 * What a request is expected to cost in micro-INR at `atMs`, to decide whether credit COVERS it and how much to
 * HOLD (the actual metered cost is what is charged).
 */
function creditEstimateMicroInr(activity, questionCount, atMs) {
  if (activity === "papers") {
    const n = Math.max(1, Math.floor(Number(questionCount) || 1));
    return Math.ceil(Math.round(TOPUP_PER_QUESTION_COST_INR * MICRO_INR_PER_INR) * n * priceMultiplierAt(GRADING_PRICE_MODEL, atMs));
  }
  return activityCostMicroInr(activity, atMs);
}

/** "about N" of `activity` that `microInr` of credit buys at `atMs`. */
function aboutCountFor(microInr, activity, atMs) {
  const cost = activityCostMicroInr(activity, atMs);
  return cost > 0 ? Math.floor(Math.max(0, Number(microInr) || 0) / cost) : 0;
}

/**
 * The honest breakdown of one pack at `nowMs`: for every activity, "about N" = floor(credit / that activity's cost
 * AT nowMs). Null for an unknown product. The bonus (0 at launch) is included when running, so the numbers follow it.
 * No rupee figure of credit is in the result - only the pack's price.
 */
function topupBreakdownFor(key, nowMs, bonus) {
  const credit = topupCreditFor(key, nowMs, bonus);
  if (!credit) return null;
  const rows = Object.entries(TOPUP_ACTIVITIES).map(([activity, a]) => ({
    activity,
    label: a.label,
    about: aboutCountFor(credit.totalMicroInr, activity, nowMs),
    estimate: a.estimate,
  }));
  return { key, priceInr: TOPUP_PRODUCTS[key].priceInr, bonusPercent: credit.bonusPercent, rows };
}

/** True for a key of the closed top-up table. */
function isTopupProduct(key) {
  return typeof key === 'string' && Object.prototype.hasOwnProperty.call(TOPUP_PRODUCTS, key);
}

module.exports = {
  MICRO_INR_PER_INR,
  TOPUP_PRODUCTS,
  TOPUP_BONUS_PERCENT,
  TOPUP_BONUS_ENDS_ISO,
  topupBonusActive,
  topupCreditFor,
  TOPUP_ACTIVITIES,
  TOPUP_PER_QUESTION_COST_INR,
  priceMultiplierAt,
  activityCostMicroInr,
  aboutCountFor,
  creditEstimateMicroInr,
  topupBreakdownFor,
  isTopupProduct,
  PRICE_MONTHLY_LIST_INR,
  PRICE_MONTHLY_FOUNDING_INR,
  FOUNDING_OFFER_CLOSES_AT_ISO,
  FOUNDING_OFFER_CLOSES_AT_MS,
  foundingOfferOpen,
  TILL_BOARDS_PAY_FRACTION,
  TILL_BOARDS_FOUNDING_INR,
  TILL_BOARDS_AFTER_FOUNDING_INR,
  tillBoardsPriceInr,
  GST_RATE_PERCENT,
  GST_RATE,
  GST_EXCLUSIVE_FROM_ISO,
  GST_EXCLUSIVE_FROM_MS,
  boardPassGstExclusive,
  withGstInr,
  boardPassChargeFor,
  boardPassCharge,
  chargeFor,
  priceWithGst,
  formatInr,
  displayPlusGst,
  gstBreakdownFor,
  orderGstBreakdown,
  orderAmountMatchesBase,
  MONTH_PASS_RETIRED_AT_ISO,
  MONTH_PASS_RETIRED_AT_MS,
  monthPassRetired,
  monthPassAvailable,
  TILL_BOARDS_MAX_MONTHS,
  IST_OFFSET_MS,
  predictBoardDateIso,
  tillBoardsQuote,
  monthlyInrFor,
  addOneCalendarMonthIst,
  endOfIstDayMs,
  istCalendarDate,
};
