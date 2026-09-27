/**
 * usageLedger.cjs — METER-1. Record what each student's AI use actually costs.
 *
 * RECORDS ONLY. Nothing here limits, refuses, or renders anything. FAIR-USE-1 reads
 * the ledger this module writes; this module never reads it back.
 *
 * THE SHAPE. One document per student per IST day:
 *
 *     usageLedger/{uid}/days/{istDayKey}
 *       calls          — successful callGemini invocations
 *       promptTokens   — usageMetadata.promptTokenCount
 *       outputTokens   — usageMetadata.candidatesTokenCount (visible output)
 *       thoughtsTokens — usageMetadata.thoughtsTokenCount   (thinking)
 *       costMicroInr   — integer; 1 rupee = 1,000,000
 *
 * Every field is written with FieldValue.increment, so concurrent calls from one
 * student never lose a count to a read-modify-write race, and there is no read.
 * `usageLedger/{uid}` itself is never written (a Firestore "missing" parent); the
 * erasure and export walkers enumerate `days` with listDocuments(), which sees it.
 *
 * ★★ FIVE NAMED NUMBERS AND NOTHING ELSE. `buildLedgerIncrement` copies explicitly
 * named fields of the P3 telemetry record (itself the content firewall — see
 * `buildTokenTelemetryRecord` in geminiClient.cjs). No spread, no key iteration: no
 * prompt, no response, no model text can reach a student's ledger document.
 *
 * ★★ WHO IS CHARGED — the request context (M1).
 * `index.cjs` runs every request inside `runWithRequestContext`, an AsyncLocalStorage
 * whose store starts EMPTY. `bindRequestUid` puts a uid into it only when ALL hold:
 *   - it is the VERIFIED uid — the value `verifiedCaller.resolveVerifiedUid` returned,
 *     the same one index.cjs hands the rate limiter. Never a header. This function has
 *     no `req` parameter on purpose: there is no header in reach to fall back to.
 *   - the request was NOT admitted as a free check (a signed-out visitor: there is no
 *     student to charge, and the free-check budget is metered by freeCheck.cjs).
 *   - the path is a PAID endpoint (rateLimiter PAID_ENDPOINTS). The only other POST
 *     routes that reach Gemini are admin tools (solution-cache regenerate, warm pool),
 *     and maintenance spend is not a student's use.
 * A call with no uid in context records NOTHING: anonymous callers, failed tokens,
 * the startup / interval warm pool (never inside a request), offline scripts, evals.
 *
 * ★★ FIRE-AND-FORGET (M3). `recordUsage` returns synchronously and never throws. The
 * Firestore write is started and NOT awaited; its failure is counted
 * (`usage.ledger_write_failed`) and swallowed. A student's graded answer must never
 * wait on, or be lost to, a cost counter.
 */

const { AsyncLocalStorage } = require('node:async_hooks');
const { PAID_ENDPOINTS, istDayKey } = require('./rateLimiter.cjs');
const { priceFor, usdInrRate } = require('./modelPrices.cjs');

/** Top-level collection. Named as a constant so the studentDataMap drift guard sees it. */
const USAGE_LEDGER_COLLECTION = 'usageLedger';
/** Subcollection segment, deliberately NOT a top-level `.collection(CONST)` shape. */
const LEDGER_SEGMENTS = Object.freeze({ days: 'days' });

/** ★ The ONLY fields a ledger day document ever holds. Pinned by the tests. */
const LEDGER_FIELDS = Object.freeze([
  'calls',
  'promptTokens',
  'outputTokens',
  'thoughtsTokens',
  'costMicroInr',
]);

const TELEMETRY = Object.freeze({
  UNPRICED_MODEL: 'usage.unpriced_model',
  WRITE_FAILED: 'usage.ledger_write_failed',
  UNAVAILABLE: 'usage.ledger_unavailable',
  ERROR: 'usage.ledger_error',
});

/* ── Request context ─────────────────────────────────────────────────────── */

const requestContext = new AsyncLocalStorage();

/** Run `fn` inside a fresh, EMPTY request context. Returns what `fn` returns. */
function runWithRequestContext(fn) {
  return requestContext.run({ uid: '' }, fn);
}

/**
 * Bind the student this request is charged to. See the header for the three
 * conditions. Returns the uid bound, or '' when nothing was bound.
 */
function bindRequestUid(verifiedUid, reqPath, opts = {}) {
  const store = requestContext.getStore();
  if (!store) return '';
  if (opts && opts.freeCheck === true) return '';
  if (!Object.prototype.hasOwnProperty.call(PAID_ENDPOINTS, String(reqPath || ''))) return '';
  const uid = typeof verifiedUid === 'string' ? verifiedUid.trim() : '';
  if (!uid) return '';
  store.uid = uid;
  return uid;
}

/** The uid bound to the current async chain, or '' outside a bound request. */
function currentUid() {
  const store = requestContext.getStore();
  return store && typeof store.uid === 'string' ? store.uid : '';
}

/* ── Cost ────────────────────────────────────────────────────────────────── */

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * The five numbers one call adds to the ledger, plus whether its model was priced.
 *
 * costMicroInr = round((prompt * inputUsd/M + (output + thoughts) * outputUsd/M) * usdInr)
 * — `tokens * usdPerMillion` is micro-dollars; times the rate it is micro-rupees.
 * ★ THINKING IS COSTED AT THE OUTPUT RATE.
 */
function buildLedgerIncrement(record, opts = {}) {
  const r = record && typeof record === 'object' ? record : {};
  const promptTokens = toCount(r.promptTokenCount);
  const outputTokens = toCount(r.candidatesTokenCount);
  const thoughtsTokens = toCount(r.thoughtsTokenCount);
  const price = priceFor(r.model);
  let costMicroInr = 0;
  if (price) {
    const microUsd =
      promptTokens * price.inputUsdPerMillion +
      (outputTokens + thoughtsTokens) * price.outputUsdPerMillion;
    costMicroInr = Math.round(microUsd * usdInrRate(opts.env || process.env));
  }
  return {
    increment: { calls: 1, promptTokens, outputTokens, thoughtsTokens, costMicroInr },
    priced: Boolean(price),
  };
}

/* ── Ledger ──────────────────────────────────────────────────────────────── */

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

function defaultResolveTelemetry() {
  try {
    return require('../telemetry.cjs');
  } catch {
    return null;
  }
}

/**
 * @param {{
 *   resolveFirestore?: () => ({ db, FieldValue } | null),
 *   telemetry?: { increment: Function },
 *   now?: () => number,
 *   env?: object,
 * }} deps — every dependency is injectable; the defaults are the production ones.
 */
function createUsageLedger(deps = {}) {
  const resolveFirestore = deps.resolveFirestore || defaultResolveFirestore;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const env = deps.env || process.env;
  let telemetrySink = deps.telemetry;
  let telemetryResolved = telemetrySink !== undefined;

  function count(event) {
    try {
      if (!telemetryResolved) {
        telemetryResolved = true;
        telemetrySink = defaultResolveTelemetry();
      }
      if (telemetrySink && typeof telemetrySink.increment === 'function') {
        telemetrySink.increment(event, 1);
      }
    } catch {
      /* a counter must never fail anything */
    }
  }

  /**
   * Add one call's usage to the ledger of the uid bound to this request.
   * SYNCHRONOUS, NEVER THROWS, NEVER AWAITS THE WRITE.
   *
   * Returns `null` when nothing was written (why is counted, not thrown), else the
   * write's settlement promise — which NEVER rejects (true = written, false = the
   * failure was counted). It is returned so a test can observe the write land.
   * ★ A REQUEST PATH MUST NOT AWAIT IT: callGemini's latency would then include a
   * Firestore round-trip, which is the exact coupling M3 forbids (pinned by the
   * latency test in usageLedger.test.cjs).
   */
  function recordUsage(record) {
    try {
      const uid = currentUid();
      if (!uid) return null;

      const { increment, priced } = buildLedgerIncrement(record, { env });
      if (!priced) count(TELEMETRY.UNPRICED_MODEL);

      const fs = resolveFirestore();
      if (!fs || !fs.db || !fs.FieldValue) {
        count(TELEMETRY.UNAVAILABLE);
        return null;
      }
      const { db, FieldValue } = fs;
      const ref = db
        .collection(USAGE_LEDGER_COLLECTION)
        .doc(uid)
        .collection(LEDGER_SEGMENTS.days)
        .doc(istDayKey(now()));

      const data = {
        calls: FieldValue.increment(increment.calls),
        promptTokens: FieldValue.increment(increment.promptTokens),
        outputTokens: FieldValue.increment(increment.outputTokens),
        thoughtsTokens: FieldValue.increment(increment.thoughtsTokens),
        costMicroInr: FieldValue.increment(increment.costMicroInr),
      };

      // ★ NOT AWAITED. Promise.resolve().then() also moves a synchronously-throwing
      // `set` off this stack, so it lands in the same counted rejection path.
      return Promise.resolve()
        .then(() => ref.set(data, { merge: true }))
        .then(
          () => true,
          () => {
            count(TELEMETRY.WRITE_FAILED);
            return false;
          }
        );
    } catch {
      count(TELEMETRY.ERROR);
      return null;
    }
  }

  return { recordUsage };
}

module.exports = {
  createUsageLedger,
  buildLedgerIncrement,
  runWithRequestContext,
  bindRequestUid,
  currentUid,
  USAGE_LEDGER_COLLECTION,
  LEDGER_SEGMENTS,
  LEDGER_FIELDS,
  TELEMETRY,
};
