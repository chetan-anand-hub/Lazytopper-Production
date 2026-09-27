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
 */

const MODEL_PRICES = Object.freeze({
  'gemini-2.5-flash': Object.freeze({
    inputUsdPerMillion: 0.3,
    outputUsdPerMillion: 2.5,
  }),
});

/** USD->INR when `LT_USD_INR` is unset or not a positive finite number. */
const DEFAULT_USD_INR = 88;

/** Env var the owner sets to move the conversion rate without a deploy. */
const USD_INR_ENV = 'LT_USD_INR';

function priceFor(model) {
  if (typeof model !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(MODEL_PRICES, model) ? MODEL_PRICES[model] : null;
}

function usdInrRate(env) {
  const raw = env && env[USD_INR_ENV];
  const n = Number(raw);
  return raw !== undefined && raw !== '' && Number.isFinite(n) && n > 0 ? n : DEFAULT_USD_INR;
}

module.exports = {
  MODEL_PRICES,
  DEFAULT_USD_INR,
  USD_INR_ENV,
  priceFor,
  usdInrRate,
};
