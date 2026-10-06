/**
 * usageLedger.cjs — METER-1. Record what each student's AI use actually costs.
 *
 * RECORDS ONLY. Nothing here limits, refuses, or renders anything. FAIR-USE-1
 * (services/fairUse.cjs) reads the ledger back through `readDays` below and decides;
 * this module only stores and returns numbers.
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
 *       hourCostMicroInr — FAIR-USE-1 hour buckets: a map { "HH": costMicroInr } keyed
 *                          by the IST hour, so the rolling 5-hour premium window is
 *                          read from the SAME document (no new location to erase)
 *
 * and, written by FAIR-USE-1 (recordTrialUse), never by a model call:
 *       trialChecks / trialChapterTests / trialMocks / trialWorksheets — the durable
 *       trial allowance counters (U2), one increment per graded question / paper.
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

/**
 * ★ The ONLY per-call NUMBERS a model call writes. Pinned by the tests. A call's
 * write also carries LEDGER_HOUR_FIELD (the same cost, by IST hour); the day
 * document additionally holds TRIAL_COUNTER_FIELDS, written by FAIR-USE-1 only.
 */
const LEDGER_FIELDS = Object.freeze([
  'calls',
  'promptTokens',
  'outputTokens',
  'thoughtsTokens',
  'costMicroInr',
]);

/**
 * FAIR-USE-1 hour buckets. A MAP field on the day document, keyed by the IST hour
 * ("00".."23"), holding that hour's costMicroInr. Kept in the day document on
 * purpose: DPDP erasure and export already walk `days`, so a new subcollection
 * would be a location they silently miss.
 */
const LEDGER_HOUR_FIELD = 'hourCostMicroInr';

/**
 * A17 J0-FIXUP (audit FU-A17-METER-SPEND-VISIBILITY). Since A17 ruling 5, `costMicroInr` on a GRADING
 * call is the METER (scaled by the chargeable share; 0 for a not-attempted question), no longer what
 * the provider billed — and the admin Students panel reads `costMicroInr` as "₹ spent". So every
 * grading call ALSO adds its REAL, unscaled cost here, at the moment it returns. Fair use never reads
 * this field (it reads `costMicroInr` and the hour buckets), so the meter is unchanged. A number only,
 * like every other ledger field. (An admin view that should show real spend reads this field — that
 * view is outside this lane: FU-A17-ADMIN-SPEND-FIELD.)
 */
const LEDGER_SPEND_FIELD = 'providerSpendMicroInr';

/** FAIR-USE-1 (U2) trial counters, stored on the same IST day document. */
const TRIAL_COUNTER_FIELDS = Object.freeze({
  checks: 'trialChecks',
  chapterTests: 'trialChapterTests',
  mocks: 'trialMocks',
  worksheets: 'trialWorksheets',
});

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The IST hour ("00".."23") of an instant — the hour-bucket key inside its IST day. */
function istHourKey(nowMs) {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(11, 13);
}

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

/* ── A17 owner ruling 5 · GRADED-ONLY METERING (GRADING-JOBS-1 J0) ────────────
 * The premium meter counts ONLY questions that were graded. A grading model call does not know,
 * when it returns, whether the questions it graded will turn out graded, not attempted, unread, a
 * mismatch or "not graded". So the grading core (server/grading/core.cjs) runs each call — every
 * chunk attempt, every chunk retry, every scheme-cache generation — inside a METER GROUP:
 *   • recordUsage, called by geminiClient as before, HOLDS the call's record in the group instead
 *     of writing it (no new hook in geminiClient: the meter decides here);
 *   • once the request's results are known, the core SETTLES each group with the CHARGEABLE SHARE
 *     of the questions that call graded (chargeable / questions, grading/charge.cjs isChargeable);
 *   • every held record is then written with its cost and tokens scaled by that share — a share of
 *     0 (all notGraded / couldNotRead / mismatch / not attempted) writes NOTHING;
 *   • a record that arrives AFTER its group settled (a call still finishing in the background) is
 *     written at the settled share; a group that is never settled (the request failed outright —
 *     nothing was graded) writes nothing.
 * Outside a group (every non-grading call: tutor, detect, step solution …) nothing changes. */

/** A new, unsettled meter group. */
function createMeterGroup() {
  return { settled: false, fraction: null, held: [] };
}

/** Run `fn` with `group` as the meter group of every model call it makes (the uid is kept). */
function runInMeterGroup(group, fn) {
  const store = requestContext.getStore();
  if (!store || !group) return fn();
  return requestContext.run({ ...store, meter: group }, fn);
}

/** Settle a group: write its held records scaled by `fraction` (clamped to [0, 1]). Once only. */
function settleMeterGroup(group, fraction) {
  if (!group || group.settled) return;
  const f = Number(fraction);
  group.fraction = Number.isFinite(f) ? Math.min(1, Math.max(0, f)) : 0;
  group.settled = true;
  const held = group.held;
  group.held = [];
  for (const write of held) {
    try { write(group.fraction); } catch { /* a counter must never fail anything */ }
  }
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
      // A17 ruling 5: a grading call inside a meter group is held until its share is known.
      const store = requestContext.getStore();
      const meter = store && store.meter;
      if (meter) {
        writeSpend(uid, record);
        if (!meter.settled) {
          meter.held.push((fraction) => writeUsage(uid, record, fraction));
          return null;
        }
        return writeUsage(uid, record, meter.fraction);
      }
      return writeUsage(uid, record, 1);
    } catch {
      count(TELEMETRY.ERROR);
      return null;
    }
  }

  /** Write one call's usage for `uid`, its cost and tokens scaled by `fraction` (0 writes nothing). */
  function writeUsage(uid, record, fraction) {
    try {
      if (!(fraction > 0)) return null;
      const built = buildLedgerIncrement(record, { env });
      const { priced } = built;
      const increment = fraction >= 1 ? built.increment : scaleIncrement(built.increment, fraction);
      if (!priced) count(TELEMETRY.UNPRICED_MODEL);

      const fs = resolveFirestore();
      if (!fs || !fs.db || !fs.FieldValue) {
        count(TELEMETRY.UNAVAILABLE);
        return null;
      }
      const { db, FieldValue } = fs;
      const nowMs = now();
      const ref = dayRef(db, uid, istDayKey(nowMs));

      const data = {
        calls: FieldValue.increment(increment.calls),
        promptTokens: FieldValue.increment(increment.promptTokens),
        outputTokens: FieldValue.increment(increment.outputTokens),
        thoughtsTokens: FieldValue.increment(increment.thoughtsTokens),
        costMicroInr: FieldValue.increment(increment.costMicroInr),
        // FAIR-USE-1: the same cost, bucketed by IST hour for the rolling 5-hour cap.
        // Same instant as the day key above, so the bucket always sits in its own day.
        [LEDGER_HOUR_FIELD]: { [istHourKey(nowMs)]: FieldValue.increment(increment.costMicroInr) },
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

  /** A grading call's REAL cost, unscaled, into LEDGER_SPEND_FIELD (never read by fair use). */
  function writeSpend(uid, record) {
    try {
      const { increment } = buildLedgerIncrement(record, { env });
      if (!(increment.costMicroInr > 0)) return null;
      const fs = resolveFirestore();
      if (!fs || !fs.db || !fs.FieldValue) return null;
      const ref = dayRef(fs.db, uid, istDayKey(now()));
      return Promise.resolve()
        .then(() => ref.set({ [LEDGER_SPEND_FIELD]: fs.FieldValue.increment(increment.costMicroInr) }, { merge: true }))
        .then(() => true, () => { count(TELEMETRY.WRITE_FAILED); return false; });
    } catch {
      count(TELEMETRY.ERROR);
      return null;
    }
  }

  function scaleIncrement(inc, fraction) {
    return {
      calls: inc.calls,
      promptTokens: Math.round(inc.promptTokens * fraction),
      outputTokens: Math.round(inc.outputTokens * fraction),
      thoughtsTokens: Math.round(inc.thoughtsTokens * fraction),
      costMicroInr: Math.round(inc.costMicroInr * fraction),
    };
  }

  function dayRef(db, uid, dayKey) {
    return db
      .collection(USAGE_LEDGER_COLLECTION)
      .doc(uid)
      .collection(LEDGER_SEGMENTS.days)
      .doc(dayKey);
  }

  /**
   * FAIR-USE-1 (U2): add a trial caller's graded use to TODAY's ledger document.
   * `counts` maps a TRIAL_COUNTER_FIELDS key (checks | chapterTests | mocks |
   * worksheets) to a positive integer. Same contract as recordUsage: synchronous,
   * never throws, never awaited by a request path; returns null when nothing was
   * written, else a settlement promise that never rejects.
   */
  function recordTrialUse(uid, counts) {
    try {
      const id = typeof uid === 'string' ? uid.trim() : '';
      if (!id) return null;
      const fs = resolveFirestore();
      if (!fs || !fs.db || !fs.FieldValue) {
        count(TELEMETRY.UNAVAILABLE);
        return null;
      }
      const data = {};
      for (const [key, field] of Object.entries(TRIAL_COUNTER_FIELDS)) {
        const n = toCount(counts && counts[key]);
        if (n > 0) data[field] = fs.FieldValue.increment(n);
      }
      if (Object.keys(data).length === 0) return null;
      const ref = dayRef(fs.db, id, istDayKey(now()));
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

  /**
   * FAIR-USE-1: read a student's day documents. Resolves to a Map dayKey -> plain data
   * object ({} for a day with no document). REJECTS when the ledger cannot be read —
   * the caller (fairUse.cjs) decides what an unreadable ledger means, and it fails
   * OPEN: a refusal needs a POSITIVE read.
   */
  async function readDays(uid, dayKeys) {
    const id = typeof uid === 'string' ? uid.trim() : '';
    if (!id) throw new Error('readDays: no uid');
    const fs = resolveFirestore();
    if (!fs || !fs.db) throw new Error('readDays: ledger unavailable');
    const keys = Array.isArray(dayKeys) ? dayKeys : [];
    const snaps = await Promise.all(keys.map((k) => dayRef(fs.db, id, k).get()));
    const out = new Map();
    keys.forEach((k, i) => {
      const snap = snaps[i];
      if (!snap || typeof snap.exists === 'undefined') throw new Error('readDays: no snapshot');
      const data = snap.exists && typeof snap.data === 'function' ? snap.data() : null;
      out.set(k, data && typeof data === 'object' ? data : {});
    });
    return out;
  }

  return { recordUsage, recordTrialUse, readDays };
}

module.exports = {
  createUsageLedger,
  buildLedgerIncrement,
  runWithRequestContext,
  bindRequestUid,
  currentUid,
  createMeterGroup,
  runInMeterGroup,
  settleMeterGroup,
  USAGE_LEDGER_COLLECTION,
  LEDGER_SEGMENTS,
  LEDGER_FIELDS,
  LEDGER_HOUR_FIELD,
  LEDGER_SPEND_FIELD,
  TRIAL_COUNTER_FIELDS,
  istHourKey,
  TELEMETRY,
};
