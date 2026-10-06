/**
 * modelPrices.cjs — METER-1 (M2). The price table the usage ledger costs a call with.
 *
 * DATA ONLY. No I/O, no clock, no telemetry: `usageLedger.cjs` reads this table and
 * owns the arithmetic, so a price change is a one-line diff here and nothing else.
 *
 * ★ UNITS. Prices are US DOLLARS PER 1,000,000 TOKENS, exactly as Google publishes
 * them. `tokens * usdPerMillion` is therefore MICRO-dollars, and multiplying by the
 * USD->INR rate gives MICRO-rupees (1 rupee = 1,000,000) — the integer the ledger
 * stores as `costMicroInr`.
 *
 * ★ THINKING BILLS AT THE OUTPUT RATE. `outputUsdPerMillion` applies to
 * `candidatesTokenCount + thoughtsTokenCount`. Thinking tokens are invisible in any
 * estimate derived from prompt structure and are the single largest line on a
 * grading call, so costing them at the input rate would under-count by ~8x.
 *
 * ★ AN UNKNOWN MODEL IS NEVER GUESSED. A model id absent from this table costs 0 and
 * the ledger counts `usage.unpriced_model` — a visible zero, never an invented number.
 * Keys are the SANITISED model label (lowercase, `[a-z0-9._-]`) that
 * `buildTokenTelemetryRecord` produces, so they must be written that way here.
 *
 * ★ EVERY MODEL GRADING CAN CALL HAS A ROW (A-17 J1b METER-PRICE-1, owner 2026-10-07:
 * "grading must count its real cost against premium fair-use caps"). From #937 to this
 * row, gemini-3.8-flash — production's grading model — was unpriced, so every grading
 * call cost 0 on the premium meter. usageLedger.test.cjs fails if any configured grading
 * model (primary, light, fallback, detect / scheme generation) lacks a row here.
 *
 * ★ DATE-EFFECTIVE PRICES. `MODEL_PRICES` is the list price in force TODAY. A published
 * future change goes in `PRICE_CHANGES` with the instant it takes effect; `priceFor(model,
 * atMs)` returns the price in force at `atMs` (the ledger passes the call's own clock), so
 * a scheduled change is metered from its first minute without a deploy.
 */

const MODEL_PRICES = Object.freeze({
  'gemini-2.5-flash': Object.freeze({
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 2.5,
  }),
  // GRADER-CORE-1 PR-2 (server/grading/modelConfig.cjs DEFAULT_GRADING_MODEL). Source: the
  // eval scorer's PRICES (server/eval/golden/lib/score.cjs), Google's published list price,
  // https://ai.google.dev/gemini-api/docs/pricing , paid tier standard, prompts <= 200k,
  // fetched 2026-10-05: $0.75 in / $3.75 out per 1M through 2026-12-31. The change on
  // 2027-01-01 is in PRICE_CHANGES below.
  'gemini-3.8-flash': Object.freeze({
    inputUsdPerMillion: 0.75,
    outputUsdPerMillion: 3.75,
  }),
});

/** 2027-01-01 00:00 IST (= 2026-12-31 18:30 UTC). IST because the ledger's days are IST days. */
const IST_2027_01_01_MS = Date.UTC(2026, 11, 31, 18, 30, 0);

/**
 * Scheduled list-price changes, oldest first: from `fromMs` on, the row replaces the price.
 * gemini-3.8-flash doubles on 2027-01-01 — same source as its row above ("From 2027-01-01
 * the page lists $1.50 in / $7.50 out"; FU-GRADER-2027-PRICE).
 */
const PRICE_CHANGES = Object.freeze({
  'gemini-3.8-flash': Object.freeze([
    Object.freeze({ fromMs: IST_2027_01_01_MS, inputUsdPerMillion: 1.5, outputUsdPerMillion: 7.5 }),
  ]),
});

/** USD->INR when `LT_USD_INR` is unset or not a positive finite number. */
const DEFAULT_USD_INR = 88;

/** Env var the owner sets to move the conversion rate without a deploy. */
const USD_INR_ENV = 'LT_USD_INR';

/**
 * The price of `model` in force at `atMs` (epoch ms), or null for an unpriced model.
 * Without a finite `atMs` it is today's row in MODEL_PRICES; the ledger always passes one.
 */
function priceFor(model, atMs) {
  if (typeof model !== 'string') return null;
  if (!Object.prototype.hasOwnProperty.call(MODEL_PRICES, model)) return null;
  let price = MODEL_PRICES[model];
  if (Number.isFinite(atMs) && Object.prototype.hasOwnProperty.call(PRICE_CHANGES, model)) {
    for (const change of PRICE_CHANGES[model]) {
      if (atMs >= change.fromMs) {
        price = { inputUsdPerMillion: change.inputUsdPerMillion, outputUsdPerMillion: change.outputUsdPerMillion };
      }
    }
  }
  return price;
}

function usdInrRate(env) {
  const raw = env && env[USD_INR_ENV];
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(n) && n > 0 ? n : DEFAULT_USD_INR;
}

module.exports = {
  MODEL_PRICES,
  PRICE_CHANGES,
  IST_2027_01_01_MS,
  DEFAULT_USD_INR,
  USD_INR_ENV,
  priceFor,
  usdInrRate,
};
