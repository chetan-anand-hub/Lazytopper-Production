/**
 * freeCheck.cjs — FREE-CHECK-1a: one free marked upload for a signed-out visitor.
 *
 * ★ DARK BY DEFAULT. Nothing here does anything unless the server env
 * `FREE_CHECK_ENABLED` is on. With it unset or off, `isFreeCheckRequest` returns
 * false before it reads a single header, index.cjs takes its existing branch, and
 * every existing path — the P2 `anonymous` 402, the P3 `uid-header-no-token` 402,
 * signed-in grading — is behaviourally unchanged (spec R11, invariant (d)).
 *
 * WHAT A FREE-CHECK REQUEST IS (N2, exact — every clause must hold):
 *   1. NO `Authorization: Bearer` token AND NO `x-lazytopper-uid` header. That is
 *      the P2 shape exactly. ★ It is NOT `resolveCaller().anonymous`: that also
 *      counts a caller whose bearer token FAILED to verify, and entitlement.cjs
 *      fails that caller OPEN. A marker on a failed-bearer caller is never admitted.
 *   2. The path is one of FREE_CHECK_PATHS. The client sends paid headers from 11
 *      call sites, including generate-visual and generate-diagram, so the marker
 *      alone must never be enough.
 *   3. The marker header FREE_CHECK_MARKER_HEADER carries FREE_CHECK_MARKER_VALUE.
 *   4. `FREE_CHECK_ENABLED` is on.
 * Then `admit` decides, in this order, each refusal carrying its own reason:
 *   a. firebase-admin / Firestore handles present — else refuse `unavailable`.
 *      ★ FAIL CLOSED (N3). This is deliberately the OPPOSITE of entitlement.cjs's
 *      fail-open: that fail-open protects a PAYING student from a blip; there is no
 *      paying student here to protect, only a budget.
 *   b. a valid Firebase App Check token in `X-Firebase-AppCheck`, verified with
 *      `admin.appCheck().verifyToken()` — else `app_check_missing` / `app_check_invalid`.
 *   c. R5: today's all-class `global:<day>` count is below
 *      `Math.floor(limits.global.hard * 0.6)` — else `budget`. Derived from HARD,
 *      never soft (soft is independently env-overridable). The band between 60% and
 *      the 80% vision shed is reserved for paying students (OR-4a).
 *   d. R3: the durable daily ceiling — else `ceiling_reached`.
 *
 * R3 — THE DURABLE CEILING. The limiter's counts live in a process-local Map that
 * resets on every deploy (P8), so the ceiling lives in Firestore instead:
 *   collection FREE_CHECK_COLLECTION, document id = istDayKey(now) (the IST day).
 *   The document holds ONLY the four COUNTER_FIELDS. No uid, no IP, no App Check
 *   app id — nothing that identifies anyone (DPDP §9(3)); `studentDataMap.ts`
 *   exempts the collection as a non-student aggregate on exactly that basis.
 *   `served` is incremented inside a transaction, once per upload, on the GRADING
 *   call only (check-solution / grade-worksheet). A marked detect-question is
 *   checked against the cap but never counted (N4).
 *
 * The refusal counters are also written through a transaction. They are
 * best-effort: a failed counter write never changes the refusal the caller gets.
 *
 * WIRE CONTRACT (for lane 1b):
 *   request  — marker header `X-Lazytopper-Free-Check: 1` + `X-Firebase-AppCheck: <token>`,
 *              and NO Authorization / X-Lazytopper-Uid header.
 *   refusal  — HTTP 403, JSON `{ error: "free_check_refused", reason: <REASONS value>,
 *              message, resetAt? }`. 403 and `free_check_refused` are distinct from
 *              `402 premium_required` and `429 daily_limit`; `reason` is not one of
 *              httpUtils' DIAGNOSTIC_KEYS, so sendJson passes it through untouched.
 */

const { extractBearerToken } = require('./verifiedCaller.cjs');
const { istDayKey, nextIstMidnightIso } = require('./rateLimiter.cjs');

/** Wire name of the marker header (1b sends it). Node delivers it lower-cased. */
const FREE_CHECK_MARKER_HEADER = 'X-Lazytopper-Free-Check';
/** The only marker value that counts. */
const FREE_CHECK_MARKER_VALUE = '1';
/** Wire name of the App Check header the Firebase Web SDK convention uses. */
const APP_CHECK_HEADER = 'X-Firebase-AppCheck';

/** The only paths a free check may use. */
const FREE_CHECK_PATHS = Object.freeze([
  '/api/check-solution',
  '/api/grade-worksheet',
  '/api/detect-question',
]);
/** The grading calls — the only ones R3 counts as `served`. */
const GRADING_PATHS = Object.freeze(['/api/check-solution', '/api/grade-worksheet']);

/** R3 / R10 durable day documents. Server-only; see studentDataMap.ts NON_STUDENT_COLLECTIONS. */
const FREE_CHECK_COLLECTION = 'freeCheckDaily';
/** ★ The ONLY fields ever written to a day document. */
const COUNTER_FIELDS = Object.freeze(['served', 'refused_quota', 'refused_budget', 'refused_appcheck']);

const DEFAULT_DAILY_CAP = 100;
/** R5: free checks stop at this fraction of limits.global.hard. */
const BUDGET_FRACTION = 0.6;

const REFUSAL_STATUS = 403;
const REFUSAL_ERROR = 'free_check_refused';
/** The body key the reason travels under. Outside httpUtils DIAGNOSTIC_KEYS. */
const REFUSAL_REASON_KEY = 'reason';
const REASONS = Object.freeze({
  CEILING: 'ceiling_reached',
  BUDGET: 'budget',
  APP_CHECK_MISSING: 'app_check_missing',
  APP_CHECK_INVALID: 'app_check_invalid',
  UNAVAILABLE: 'unavailable',
});

const MESSAGES = Object.freeze({
  [REASONS.CEILING]: "Today's free checks are all used up. Come back tomorrow.",
  [REASONS.BUDGET]: "Today's free checks are all used up. Come back tomorrow.",
  [REASONS.APP_CHECK_MISSING]: "We couldn't start a free check in this browser.",
  [REASONS.APP_CHECK_INVALID]: "We couldn't start a free check in this browser.",
  [REASONS.UNAVAILABLE]: 'Free checks are not available right now.',
});

/** Which refusal counter each reason increments. `unavailable` has none: there is no store to write to. */
const COUNTER_FOR_REASON = Object.freeze({
  [REASONS.CEILING]: 'refused_quota',
  [REASONS.BUDGET]: 'refused_budget',
  [REASONS.APP_CHECK_MISSING]: 'refused_appcheck',
  [REASONS.APP_CHECK_INVALID]: 'refused_appcheck',
});

/** `FREE_CHECK_ENABLED` — read on every request so the switch needs no redeploy of code. */
function isFreeCheckEnabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.FREE_CHECK_ENABLED) || '').trim());
}

/** `LT_FREECHECK_DAILY`, default 100. 0 is honoured (closes free checks without the flag). */
function freeCheckDailyCap(env = process.env) {
  const raw = env ? env.LT_FREECHECK_DAILY : undefined;
  if (raw === undefined || String(raw).trim() === '') return DEFAULT_DAILY_CAP;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_DAILY_CAP;
}

/** R5 threshold, from HARD. */
function budgetThreshold(globalHard) {
  return Math.floor(globalHard * BUDGET_FRACTION);
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function headerOf(req, name) {
  return String((req && req.headers && req.headers[name.toLowerCase()]) || '').trim();
}

/**
 * @param deps.firebaseAdmin     initialised firebase-admin, or null (=> refuse `unavailable`).
 * @param deps.adminFirestore    admin Firestore handle (P12), or null (=> refuse `unavailable`).
 * @param deps.globalCountToday  () => today's all-class `global:<day>` count (the limiter's accessor).
 * @param deps.globalHardLimit   () => limits.global.hard.
 * @param deps.env               defaults to process.env; read per request.
 */
function createFreeCheckGate(deps = {}) {
  const {
    firebaseAdmin = null,
    adminFirestore = null,
    telemetry = null,
    logger = console,
    env = process.env,
    now = () => Date.now(),
    globalCountToday = null,
    globalHardLimit = null,
  } = deps;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a diagnostic must never fail a request */
    }
  }

  /** N2, exact. Synchronous, and false before any header is read when the flag is off. */
  function isFreeCheckRequest(req, reqPath, verifiedUid) {
    if (!isFreeCheckEnabled(env)) return false;
    if (!FREE_CHECK_PATHS.includes(reqPath)) return false;
    if (typeof verifiedUid === 'string' && verifiedUid.trim()) return false;
    if (extractBearerToken(req)) return false;
    if (headerOf(req, 'x-lazytopper-uid')) return false;
    return headerOf(req, FREE_CHECK_MARKER_HEADER) === FREE_CHECK_MARKER_VALUE;
  }

  function dayRef(nowMs) {
    return adminFirestore.collection(FREE_CHECK_COLLECTION).doc(istDayKey(nowMs));
  }

  /** Best-effort refusal counter. Never throws; never changes the refusal. */
  async function countRefusal(field, nowMs) {
    try {
      const ref = dayRef(nowMs);
      await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = (snap && snap.exists && snap.data()) || {};
        tx.set(ref, { [field]: toCount(data[field]) + 1 }, { merge: true });
      });
    } catch (e) {
      emit('free_check.counter_write_failed');
      try { logger.warn(`[free-check] refusal counter write failed (${field}): ${e && e.message}`); } catch {}
    }
  }

  function refusal(reason, nowMs) {
    emit(`free_check.refused.${reason}`);
    const body = { error: REFUSAL_ERROR, [REFUSAL_REASON_KEY]: reason, message: MESSAGES[reason] };
    if (reason === REASONS.CEILING || reason === REASONS.BUDGET) body.resetAt = nextIstMidnightIso(nowMs);
    return { admitted: false, status: REFUSAL_STATUS, body };
  }

  async function refuseAndCount(reason, nowMs) {
    const field = COUNTER_FOR_REASON[reason];
    if (field) await countRefusal(field, nowMs);
    return refusal(reason, nowMs);
  }

  /**
   * Decide a request `isFreeCheckRequest` already classified. Returns
   * `{ admitted: true }` or `{ admitted: false, status, body }` to send verbatim.
   */
  async function admit(req, reqPath) {
    const nowMs = now();

    // (a) FAIL CLOSED on missing handles.
    if (
      !firebaseAdmin || typeof firebaseAdmin.appCheck !== 'function' ||
      !adminFirestore || typeof adminFirestore.collection !== 'function' ||
      typeof adminFirestore.runTransaction !== 'function' ||
      typeof globalCountToday !== 'function' || typeof globalHardLimit !== 'function'
    ) {
      return refusal(REASONS.UNAVAILABLE, nowMs);
    }

    // (b) App Check.
    const token = headerOf(req, APP_CHECK_HEADER);
    if (!token) return refuseAndCount(REASONS.APP_CHECK_MISSING, nowMs);
    let verifier;
    try {
      verifier = firebaseAdmin.appCheck();
    } catch {
      return refusal(REASONS.UNAVAILABLE, nowMs);
    }
    let verified = false;
    try {
      const claims = await verifier.verifyToken(token);
      verified = !!(claims && typeof claims.appId === 'string' && claims.appId);
    } catch {
      verified = false;
    }
    if (!verified) return refuseAndCount(REASONS.APP_CHECK_INVALID, nowMs);

    // (c) R5 — the all-class global count against 60% of HARD.
    const hard = Number(globalHardLimit());
    const soFar = Number(globalCountToday());
    if (!Number.isFinite(hard) || !Number.isFinite(soFar)) return refusal(REASONS.UNAVAILABLE, nowMs);
    if (soFar >= budgetThreshold(hard)) return refuseAndCount(REASONS.BUDGET, nowMs);

    // (d) R3 — the durable ceiling, checked and (for grading) incremented in ONE transaction.
    const cap = freeCheckDailyCap(env);
    const grading = GRADING_PATHS.includes(reqPath);
    let outcome;
    try {
      const ref = dayRef(nowMs);
      outcome = await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = (snap && snap.exists && snap.data()) || {};
        const served = toCount(data.served);
        if (served >= cap) {
          tx.set(ref, { refused_quota: toCount(data.refused_quota) + 1 }, { merge: true });
          return 'full';
        }
        if (grading) tx.set(ref, { served: served + 1 }, { merge: true });
        return 'ok';
      });
    } catch (e) {
      try { logger.warn(`[free-check] FAIL-CLOSED: ceiling transaction failed: ${e && e.message}`); } catch {}
      return refusal(REASONS.UNAVAILABLE, nowMs);
    }
    if (outcome === 'full') return refusal(REASONS.CEILING, nowMs);

    emit(grading ? 'free_check.admitted.grading' : 'free_check.admitted.detect');
    return { admitted: true };
  }

  return { isFreeCheckRequest, admit };
}

module.exports = {
  createFreeCheckGate,
  isFreeCheckEnabled,
  freeCheckDailyCap,
  budgetThreshold,
  FREE_CHECK_MARKER_HEADER,
  FREE_CHECK_MARKER_VALUE,
  APP_CHECK_HEADER,
  FREE_CHECK_PATHS,
  GRADING_PATHS,
  FREE_CHECK_COLLECTION,
  COUNTER_FIELDS,
  DEFAULT_DAILY_CAP,
  BUDGET_FRACTION,
  REFUSAL_STATUS,
  REFUSAL_ERROR,
  REFUSAL_REASON_KEY,
  REASONS,
};
