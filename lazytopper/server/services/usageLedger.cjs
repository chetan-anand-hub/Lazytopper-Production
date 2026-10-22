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

/* ── Pending writes (GRACEFUL-DEPLOY round 2) ─────────────────────────────────
 * Every ledger write here is fire-and-forget: a request path never awaits it. On a redeploy the
 * gateway drains and then exits (services/gracefulDrain.cjs), so a write still on the wire at that
 * moment would be lost: a graded row left uncharged. Each write's settlement promise is therefore
 * TRACKED (module-wide, so every createUsageLedger instance and fairUse's markPaperGraded share one
 * set) and the drain waits for pendingWrites() to reach 0 — bounded by its own deadline — before it
 * exits. Tracking changes WHAT is written in no way: it only observes the promise. */
const pendingWriteSet = new Set();

/** Track a write's settlement promise until it settles (success OR failure). Returns `p` unchanged. */
function trackWrite(p) {
  if (!p || typeof p.then !== 'function') return p;
  pendingWriteSet.add(p);
  const drop = () => { pendingWriteSet.delete(p); };
  p.then(drop, drop);
  return p;
}

/** How many tracked ledger writes have not settled yet. */
function pendingWrites() {
  return pendingWriteSet.size;
}

/** Resolves once every write pending NOW has settled (never rejects). */
function settledWrites() {
  return Promise.allSettled([...pendingWriteSet]).then(() => undefined);
}


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

/**
 * GRADING-JOBS-1 J1 (D12) — carry THIS request's context into work that outlives the request. A
 * grading job answers 202 and keeps grading; a job that had to QUEUE starts later, from whichever
 * job freed its slot — i.e. inside ANOTHER request's async chain, whose store names another student.
 * The job therefore captures its own store at submit and runs inside it, so the premium meter (meter
 * groups included) charges the student who submitted it, and nobody else. Returns a runner; with no
 * store (outside a request) the runner just calls `fn` — exactly what a call outside a request does.
 */
function captureRequestContext() {
  const store = requestContext.getStore();
  if (!store) return (fn) => fn();
  return (fn) => requestContext.run(store, fn);
}

/**
 * TOPUP-1 - mark THIS request as served from extra-usage CREDIT (its plan window was at cap). Every model
 * call it makes (and every grading job that captured its context) is then charged to credit, not to the window.
 * `holdId` is the admission hold (usageCredit.reserveCredit) the charges draw down (FU-TOPUP-RACE).
 * Returns true when a request context exists.
 */
function markCreditMode(holdId) {
  const store = requestContext.getStore();
  if (!store) return false;
  store.creditMode = true;
  store.creditHoldId = typeof holdId === 'string' && holdId ? holdId : null;
  return true;
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
 * costMicroInr = round(((prompt - cached) * inputUsd/M + cached * cachedInputUsd/M
 *                        + (output + thoughts) * outputUsd/M) * usdInr)
 * — `tokens * usdPerMillion` is micro-dollars; times the rate it is micro-rupees.
 * ★ CACHED INPUT AT THE CACHED RATE (METER-AUDIT-1). `cached` is usageMetadata.cachedContentTokenCount,
 *   a SUBSET of promptTokenCount (clamped to it). A model with no cached rate in its price row keeps
 *   the full input rate for those tokens — never a guessed discount. `promptTokens` stays the full prompt.
 * ★ THINKING IS COSTED AT THE OUTPUT RATE.
 * ★ THE PRICE IN FORCE AT `opts.nowMs` (the ledger's clock; Date.now() when absent), so a
 *   scheduled list-price change (modelPrices.cjs PRICE_CHANGES) is metered from its first minute.
 */
function buildLedgerIncrement(record, opts = {}) {
  const r = record && typeof record === 'object' ? record : {};
  const promptTokens = toCount(r.promptTokenCount);
  const outputTokens = toCount(r.candidatesTokenCount);
  const thoughtsTokens = toCount(r.thoughtsTokenCount);
  const cachedTokens = Math.min(promptTokens, toCount(r.cachedContentTokenCount));
  const atMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const price = priceFor(r.model, atMs);
  let costMicroInr = 0;
  if (price) {
    const cachedRate = Number.isFinite(price.cachedInputUsdPerMillion) ? price.cachedInputUsdPerMillion : price.inputUsdPerMillion;
    const microUsd =
      (promptTokens - cachedTokens) * price.inputUsdPerMillion +
      cachedTokens * cachedRate +
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
      // TOPUP-1: false, or { holdId } - the admission hold this request's credit charges draw down.
      const credit = store && store.creditMode ? { holdId: store.creditHoldId || null } : false;
      if (meter) {
        writeSpend(uid, record);
        if (!meter.settled) {
          meter.held.push((fraction) => writeUsage(uid, record, fraction, credit));
          return null;
        }
        return writeUsage(uid, record, meter.fraction, credit);
      }
      return writeUsage(uid, record, 1, credit);
    } catch {
      count(TELEMETRY.ERROR);
      return null;
    }
  }

  /** Write one call's usage for `uid`, its cost and tokens scaled by `fraction` (0 writes nothing). */
  function writeUsage(uid, record, fraction, credit = false) {
    try {
      if (!(fraction > 0)) return null;
      const nowMs = now();
      const built = buildLedgerIncrement(record, { env, nowMs });
      const { priced } = built;
      const increment = fraction >= 1 ? built.increment : scaleIncrement(built.increment, fraction);
      if (!priced) count(TELEMETRY.UNPRICED_MODEL);

      const fs = resolveFirestore();
      if (!fs || !fs.db || !fs.FieldValue) {
        count(TELEMETRY.UNAVAILABLE);
        return null;
      }
      const { db, FieldValue } = fs;
      const ref = dayRef(db, uid, istDayKey(nowMs));

      const data = {
        calls: FieldValue.increment(increment.calls),
        promptTokens: FieldValue.increment(increment.promptTokens),
        outputTokens: FieldValue.increment(increment.outputTokens),
        thoughtsTokens: FieldValue.increment(increment.thoughtsTokens),
      };
      if (credit) {
        // TOPUP-1: served from extra-usage credit. The window bars stay as they are (the cost is NOT added to
        // costMicroInr or the hour bucket); the same cost goes to the credit balance instead.
        if (increment.costMicroInr > 0) {
          const amountMicroInr = increment.costMicroInr;
          const holdId = credit && typeof credit === 'object' ? credit.holdId : null;
          trackWrite(Promise.resolve()
            .then(() => require('./usageCredit.cjs').chargeCredit({ uid, amountMicroInr, nowMs, holdId }, { firestore: db }))
            .then(() => true, () => { count(TELEMETRY.WRITE_FAILED); return false; }));
        }
      } else {
        data.costMicroInr = FieldValue.increment(increment.costMicroInr);
        // FAIR-USE-1: the same cost, bucketed by IST hour for the rolling 5-hour cap.
        // Same instant as the day key above, so the bucket always sits in its own day.
        data[LEDGER_HOUR_FIELD] = { [istHourKey(nowMs)]: FieldValue.increment(increment.costMicroInr) };
      }

      // ★ NOT AWAITED. Promise.resolve().then() also moves a synchronously-throwing
      // `set` off this stack, so it lands in the same counted rejection path.
      return trackWrite(Promise.resolve()
        .then(() => ref.set(data, { merge: true }))
        .then(
          () => true,
          () => {
            count(TELEMETRY.WRITE_FAILED);
            return false;
          }
        ));
    } catch {
      count(TELEMETRY.ERROR);
      return null;
    }
  }

  /** A grading call's REAL cost, unscaled, into LEDGER_SPEND_FIELD (never read by fair use). */
  function writeSpend(uid, record) {
    try {
      const nowMs = now();
      const { increment } = buildLedgerIncrement(record, { env, nowMs });
      if (!(increment.costMicroInr > 0)) return null;
      const fs = resolveFirestore();
      if (!fs || !fs.db || !fs.FieldValue) return null;
      const ref = dayRef(fs.db, uid, istDayKey(nowMs));
      return trackWrite(Promise.resolve()
        .then(() => ref.set({ [LEDGER_SPEND_FIELD]: fs.FieldValue.increment(increment.costMicroInr) }, { merge: true }))
        .then(() => true, () => { count(TELEMETRY.WRITE_FAILED); return false; }));
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
      return trackWrite(Promise.resolve()
        .then(() => ref.set(data, { merge: true }))
        .then(
          () => true,
          () => {
            count(TELEMETRY.WRITE_FAILED);
            return false;
          }
        ));
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

/* ── COST-1 read helpers (pure; nothing here reads or writes Firestore) ───────
 * The admin Students page totals AI cost from day documents it has already read. These
 * helpers are the ONE place that says which ledger field is "AI cost", so the list column,
 * the detail table and the summary can never disagree.
 *
 * ★ WHAT "AI COST" IS. `costMicroInr` — the meter, at list prices (modelPrices.cjs). For a
 *   non-grading call (tutor, detect, step solution …) it is the call's full cost. For a
 *   GRADING call it is scaled by the graded share of the questions (A17 ruling 5), so a
 *   question that was not attempted / could not be read adds 0 here. The unscaled cost of
 *   grading calls is kept apart in LEDGER_SPEND_FIELD (since #957), which covers grading
 *   calls ONLY — it is NOT a total of all AI spend, so it is never summed in as one.
 * ★ NOT RECORDED IS NOT ZERO. A day with no document is absent; a field a document does
 *   not hold is null here (unknown), never 0. `sumLedgerCost` of no documents is null.
 */

function finiteNonNegative(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

/** One day document's cost numbers. `costMicroInr` / `providerSpendMicroInr` null = not recorded. */
function ledgerDayCost(data) {
  const d = data && typeof data === 'object' ? data : {};
  return {
    calls: toCount(d.calls),
    costMicroInr: finiteNonNegative(d.costMicroInr),
    providerSpendMicroInr: finiteNonNegative(d[LEDGER_SPEND_FIELD]),
  };
}

/**
 * Sum the cost of the day documents that EXIST (pass only existing documents' data).
 * `costMicroInr` is null when no document was given (no ledger in the window = not recorded);
 * a document that exists but holds no cost field (only trial counters) adds 0 — the day was
 * recorded and nothing was metered. `providerSpendMicroInr` is null when no document held it.
 */
function sumLedgerCost(dayDatas) {
  const list = Array.isArray(dayDatas) ? dayDatas : [];
  if (list.length === 0) return { days: 0, calls: 0, costMicroInr: null, providerSpendMicroInr: null };
  let calls = 0;
  let cost = 0;
  let spend = null;
  for (const data of list) {
    const c = ledgerDayCost(data);
    calls += c.calls;
    cost += c.costMicroInr === null ? 0 : c.costMicroInr;
    if (c.providerSpendMicroInr !== null) spend = (spend === null ? 0 : spend) + c.providerSpendMicroInr;
  }
  return { days: list.length, calls, costMicroInr: cost, providerSpendMicroInr: spend };
}

/** Micro-rupees -> rupees at 2 decimals (null stays null). */
function microInrToInr(micro) {
  return typeof micro === 'number' && Number.isFinite(micro) ? Math.round(micro / 10000) / 100 : null;
}

module.exports = {
  createUsageLedger,
  buildLedgerIncrement,
  runWithRequestContext,
  bindRequestUid,
  markCreditMode,
  currentUid,
  captureRequestContext,
  createMeterGroup,
  runInMeterGroup,
  settleMeterGroup,
  trackWrite,
  pendingWrites,
  settledWrites,
  USAGE_LEDGER_COLLECTION,
  LEDGER_SEGMENTS,
  LEDGER_FIELDS,
  LEDGER_HOUR_FIELD,
  LEDGER_SPEND_FIELD,
  TRIAL_COUNTER_FIELDS,
  istHourKey,
  TELEMETRY,
  ledgerDayCost,
  sumLedgerCost,
  microInrToInr,
};
