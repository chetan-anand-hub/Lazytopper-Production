// STORED-RATE-1 — the SERVER's price and board date for a pass.
//
// ★ WHY A MIRROR AND NOT AN IMPORT. The source of truth is TypeScript ESM:
//   `src/config/pricing.ts`          PRICE_MONTHLY_FOUNDING_INR, PRICE_MONTHLY_LIST_INR,
//                                    FOUNDING_OFFER_OPEN, TILL_BOARDS_PAY_FRACTION,
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
/** Mirror of pricing.ts FOUNDING_OFFER_OPEN. */
const FOUNDING_OFFER_OPEN = true;
/** Mirror of pricing.ts TILL_BOARDS_PAY_FRACTION. */
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
function tillBoardsQuote(now, boardIso, foundingOpen = FOUNDING_OFFER_OPEN) {
  const nowMs = toMs(now);
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
  const priceInr = Math.round(fullInr * TILL_BOARDS_PAY_FRACTION);
  return { monthsLeft, monthlyInr, fullInr, priceInr };
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

module.exports = {
  PRICE_MONTHLY_LIST_INR,
  PRICE_MONTHLY_FOUNDING_INR,
  FOUNDING_OFFER_OPEN,
  TILL_BOARDS_PAY_FRACTION,
  TILL_BOARDS_MAX_MONTHS,
  IST_OFFSET_MS,
  predictBoardDateIso,
  tillBoardsQuote,
  monthlyInrFor,
  addOneCalendarMonthIst,
  endOfIstDayMs,
  istCalendarDate,
};
