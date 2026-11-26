/**
 * aiCostDaily.cjs — COST-TRUTH-1. A GLOBAL, per-IST-day ledger of what Gemini calls really cost.
 *
 * WHY IT EXISTS. The per-student meter (usageLedger.cjs) answers "what was this student charged"
 * and, by design, skips calls with no uid, uncounted re-checks (fraction 0) and calls that
 * failed. Google bills all of those. This ledger is independent of uid and of the meter
 * fraction: ONE fire-and-forget increment per Gemini call, however it ended.
 *
 *   aiCostDaily/{IST day key}                       (one doc per IST day)
 *     calls, promptTokens, cachedTokens, outputTokens, thoughtsTokens, costMicroInr,
 *     unknownUsageCalls   — failed/aborted calls with NO usageMetadata (count only; their cost is
 *                           unknown, never guessed, so costMicroInr does not include them)
 *     estimatedCalls      — calls whose token numbers are a flagged estimate (stream with no usage)
 *     unpricedCalls       — calls whose model has no row in modelPrices.cjs (cost 0, counted)
 *     byWorkload.{workloadClass}.{callClass}.{same fields}
 *
 * ★ Written with the Admin SDK, which bypasses firestore.rules, exactly as usageLedger.cjs does;
 *   firestore.rules is NOT changed (clients are denied by default, which is what we want).
 * ★ Cost is computed with usageLedger.buildLedgerIncrement (same formula, same price-in-force at the
 *   call's own clock, same LT_USD_INR), so the two ledgers can only differ by what they COVER.
 * ★ NEVER throws, NEVER awaited by a caller. Kill switch: AI_COST_DAILY_DISABLED=1 writes nothing.
 * ★ Numbers and closed-set labels only (the caller passes the firewalled telemetry record).
 */

const { istDayKey } = require('./rateLimiter.cjs');
const { buildLedgerIncrement } = require('./usageLedger.cjs');

const AI_COST_DAILY_COLLECTION = 'aiCostDaily';
const AI_COST_DAILY_DISABLED_ENV = 'AI_COST_DAILY_DISABLED';
const FIELDS = Object.freeze([
  'calls',
  'promptTokens',
  'cachedTokens',
  'outputTokens',
  'thoughtsTokens',
  'costMicroInr',
  'unknownUsageCalls',
  'estimatedCalls',
  'unpricedCalls',
]);

function defaultResolveFirestore() {
  try {
    const admin = require('firebase-admin');
    if (!admin || !Array.isArray(admin.apps) || admin.apps.length === 0) return null;
    const FieldValue = admin.firestore && admin.firestore.FieldValue;
    if (!FieldValue || typeof FieldValue.increment !== 'function') return null;
    return { db: admin.firestore(), FieldValue };
  } catch {
    return null;
  }
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function label(value) {
  const s = typeof value === 'string' ? value.replace(/[^a-zA-Z0-9_-]/g, '') : '';
  return s ? s.slice(0, 48) : 'unclassified';
}

/** The numbers one call adds. `usageKnown:false` = count only (cost unknown, never guessed). */
function buildDailyIncrement(record, usageKnown, opts = {}) {
  if (!usageKnown) {
    return { calls: 1, promptTokens: 0, cachedTokens: 0, outputTokens: 0, thoughtsTokens: 0, costMicroInr: 0, unknownUsageCalls: 1, estimatedCalls: 0, unpricedCalls: 0 };
  }
  const { increment, priced } = buildLedgerIncrement(record, opts);
  const prompt = toCount(record && record.promptTokenCount);
  return {
    calls: 1,
    promptTokens: prompt,
    cachedTokens: Math.min(prompt, toCount(record && record.cachedContentTokenCount)),
    outputTokens: increment.outputTokens,
    thoughtsTokens: increment.thoughtsTokens,
    costMicroInr: increment.costMicroInr,
    unknownUsageCalls: 0,
    estimatedCalls: record && record.estimated === true ? 1 : 0,
    unpricedCalls: priced ? 0 : 1,
  };
}

function createAiCostDaily(deps = {}) {
  const resolveFirestore = deps.resolveFirestore || defaultResolveFirestore;
  const now = deps.now || Date.now;
  const env = deps.env || process.env;
  const pending = new Set();

  function disabled() {
    return String((deps.env || process.env)[AI_COST_DAILY_DISABLED_ENV] || '').trim() === '1';
  }

  /**
   * @param record      the firewalled token-telemetry record (model, workloadClass, callClass, token counts)
   * @param usageKnown  false for a failed call that returned no usageMetadata
   * @returns a settlement promise that never rejects, or null when nothing was written
   */
  function recordCall(record, usageKnown) {
    try {
      if (disabled()) return null;
      const fs = resolveFirestore();
      if (!fs || !fs.db || !fs.FieldValue) return null;
      const nowMs = now();
      const inc = buildDailyIncrement(record, usageKnown !== false, { nowMs, env });
      const data = {};
      const bucket = {};
      for (const f of FIELDS) {
        data[f] = fs.FieldValue.increment(inc[f]);
        bucket[f] = fs.FieldValue.increment(inc[f]);
      }
      data.byWorkload = { [label(record && record.workloadClass)]: { [label(record && record.callClass)]: bucket } };
      const p = Promise.resolve()
        .then(() => fs.db.collection(AI_COST_DAILY_COLLECTION).doc(istDayKey(nowMs)).set(data, { merge: true }))
        .catch(() => {})
        .then(() => { pending.delete(p); });
      pending.add(p);
      return p;
    } catch {
      return null;
    }
  }

  return { recordCall, pendingWrites: () => [...pending] };
}

module.exports = {
  createAiCostDaily,
  buildDailyIncrement,
  AI_COST_DAILY_COLLECTION,
  AI_COST_DAILY_DISABLED_ENV,
  FIELDS,
};
