// Server-side entitlement enforcement for the paid AI endpoints (GATE-1).
//
// ────────────────────────────────────────────────────────────────────────────
// ★ THE DEFECT THIS CLOSES
// ────────────────────────────────────────────────────────────────────────────
// Every route under server/routes/ checked rate limits and NOTHING checked plan.
// `firestore.rules` already protects `subscriptions/{uid}` — a free student cannot
// WRITE `tier:"premium"` — so the RECORD of entitlement was secure while the
// ENFORCEMENT of it did not exist. A free account simply called the endpoint.
// `src/services/featureGates.ts` holds the right model and runs in the BROWSER.
//
// ────────────────────────────────────────────────────────────────────────────
// ★★ THE EFFECTIVE TIER IS NOT THE STORED `tier` FIELD. READ THIS BEFORE EDITING.
// ────────────────────────────────────────────────────────────────────────────
// It is tempting to read `subscriptions/{uid}.tier` and compare it to "premium".
// That is WRONG IN BOTH DIRECTIONS, and one of the two directions re-opens the
// exact hole this file exists to close:
//
//   1. A stored `tier:"trial"` whose window has ELAPSED is effectively `free`.
//      The client derives that in `subscriptionService.applyExpiry` — the trial
//      END is never stored, it is derived from `trialStartDate + TRIAL_DAYS`
//      (storing it is [FU-TRIAL-ENDDATE-CLIENT-FORGEABLE], closed by SEC-2).
//      → Trusting the raw field would serve every student whose trial ran out,
//        i.e. it would leave "free access past day 7" WIDE OPEN while this file
//        reported as installed. That is the whole P0.
//
//   2. A stored `{tier:"free", plan:"trial_7day", trialStartDate:<Timestamp>}`
//      with an UNELAPSED start is effectively `trial`, i.e. premium. That shape
//      is real and live — it is what the activation defect wrote for every new
//      signup, and `subscriptionService.repairInterruptedTrial` re-derives it on
//      every cloud read.
//      → Trusting the raw field would LOCK OUT students who are mid-trial.
//
// So the derivation below is a faithful port of the client's own composition,
// quoted verbatim from `hydrateSubscriptionFromCloud`:
//
//     applyExpiry(repairInterruptedTrial(cloud.data, cloud.startIsServerPinned))
//
// ORDER IS LOAD-BEARING — repair first, expiry second. Then, and only then, the
// premium test from `featureGates.canAccessFeature`:
//
//     tier === "premium" || tier === "trial"
//
// ★ WHY THIS IS A DUPLICATION AND NOT A SHARED IMPORT. The source of truth is
// TypeScript ESM (`src/services/subscriptionService.ts`) and this is CJS loaded
// by a plain `node` process. index.cjs does install a `require.extensions['.ts']`
// transpiler, but subscriptionService.ts imports `firebase/firestore` and
// `./firebaseClient` at module scope — the BROWSER SDK — which cannot be loaded
// server-side. Extracting the pure derivation into a shared module would be the
// real fix and it is a refactor of a file this lane is not scoped to touch.
// The duplication is therefore DELIBERATE and DOCUMENTED, which beats a silent
// one. → [FU-ENTITLEMENT-TIER-DERIVATION-DUPLICATED]
//
// ────────────────────────────────────────────────────────────────────────────
// ★★ FAIL-SAFE, AND IT HAS AN OBSERVABLE WITNESS
// ────────────────────────────────────────────────────────────────────────────
// If the entitlement read fails — network, Firestore outage, absent credentials —
// the request is SERVED. Denial requires a POSITIVE read of a non-entitled tier,
// never the absence of a successful read. This mirrors `verifiedCaller.cjs`,
// which degrades to the header rather than to the anonymous bucket: a student who
// paid must never be locked out by an infrastructure blip.
//
// ★ AND THE PART THAT MAKES IT MORE THAN A COMMENT. If firebase-admin credentials
// are absent on Railway, EVERY read fails, EVERY request is served, and this
// module reports as installed while enforcing nothing — green tests, green CI,
// open paywall. A fail-safe you cannot observe firing is indistinguishable from
// no gate at all. So every fail-open emits a console.warn AND increments a
// counter, and the counters are visible through /api/admin/token-telemetry.
// WATCH `entitlement.fail_open` IN PRODUCTION: a non-trivial rate there means the
// paywall is open, not that the fail-safe is working.

// Reused rather than re-implemented: the bearer-token shape must not drift between
// the module that verifies it and the module that reports why verification produced
// nothing. Same header, one definition.
const { extractBearerToken } = require('./verifiedCaller.cjs');

/** Mirror of subscriptionService.TRIAL_DAYS. A constant in code, never a stored field. */
const TRIAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_MS = TRIAL_DAYS * DAY_MS;

/**
 * Mirror of subscriptionService.CLOCK_SKEW_TOLERANCE_MS. A server-pinned start is
 * `request.time` from Google's clock and routinely sits slightly ahead of the
 * reader. Within the tolerance the start is CLAMPED to now rather than trusted
 * forward, so the loosened bound buys a forger exactly zero extra time.
 */
const CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

const FIRESTORE_COLLECTION = 'subscriptions';

/** Cache POSITIVES only — see createEntitlementGate for why that is the whole design. */
const DEFAULT_CACHE_TTL_MS = 60 * 1000;

/** Counter names. Read them at /api/admin/token-telemetry. */
const ALLOW_EVENT = 'entitlement.allow';
const DENY_EVENT = 'entitlement.deny';
const FAIL_OPEN_EVENT = 'entitlement.fail_open';
const FAIL_OPEN_NO_ADMIN = 'entitlement.fail_open.no_admin';
const FAIL_OPEN_READ_ERROR = 'entitlement.fail_open.read_error';
/**
 * A token WAS offered and did not yield a uid. THIS IS THE CREDENTIALS-BROKEN
 * SIGNAL — clients are sending credentials and this deploy cannot verify them.
 */
const FAIL_OPEN_NO_UID = 'entitlement.fail_open.no_uid';
/**
 * No token was offered at all — an ordinary signed-out caller.
 *
 * ★ SPLIT FROM no_uid DELIBERATELY. Collapsing the two would bury the one signal
 * that matters (verification is failing, so the paywall is open) inside routine
 * signed-out traffic, and a witness you cannot read is not a witness.
 */
const FAIL_OPEN_NO_CREDENTIAL = 'entitlement.fail_open.no_credential';

/**
 * ★ COPY REGISTER — owner constraint. A locked feature is NOT a mistake the
 * student made. These strings land on fifteen-year-olds who liked the product
 * enough to keep using it past their trial, so nothing here may read as an error,
 * a fault, or a refusal: no "denied", no "unauthorised", no error code, no
 * jargon, nothing red. The register to aim at is plain product description —
 * "Check my answer is a Premium feature."
 *
 * The raw `error: "premium_required"` code is still sent for the CLIENT to branch
 * on; it is never what a student reads. See aiClient.ts's 402 branch.
 */
const GATED_ROUTES = {
  '/api/check-solution': {
    feature: 'check-solution',
    message: "Checking your answer is a Premium feature. You can unlock it whenever you're ready.",
  },
  '/api/grade-worksheet': {
    feature: 'grade-worksheet',
    message: "Grading a full worksheet is a Premium feature. You can unlock it whenever you're ready.",
  },
  '/api/tutor': {
    feature: 'tutor',
    message: "The AI tutor is a Premium feature. You can unlock it whenever you're ready.",
  },
};

/**
 * ★ /api/step-solution IS DELIBERATELY ABSENT FROM GATED_ROUTES.
 *
 * "Show steps" is mostly FREE and must stay free: `PracticeQuestionCard` renders
 * `q.solutionSteps` straight from the bank and `PracticePage` calls the API only
 * when the bank has none. Gating the endpoint would gate a feature students
 * rightly expect. Only the GENERATION branch — cache missed AND the bank had
 * nothing, so this request is about to spend money at Gemini — is gated, from
 * inside the handler. See stepSolution.cjs.
 */
const STEP_SOLUTION_PATH = '/api/step-solution';
const STEP_SOLUTION_FEATURE = {
  feature: 'step-solution-generation',
  message:
    "A worked solution for this particular question is a Premium feature. You can unlock it whenever you're ready.",
};

/* ────────────────────────────────────────────────────────────────────────────
   Pure derivation — no I/O, no clock of its own. `nowMs` is always injected so
   every boundary in here is directly testable.
   ──────────────────────────────────────────────────────────────────────────── */

/** Firestore Timestamp | ISO string | {seconds} -> epoch ms, or null. */
function toMillis(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        const d = value.toDate();
        const ms = d && typeof d.getTime === 'function' ? d.getTime() : NaN;
        return Number.isFinite(ms) ? ms : null;
      } catch {
        return null;
      }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return null;
}

/**
 * Mirror of subscriptionService.isFirestoreTimestamp.
 *
 * ★ THIS IS A SECURITY BOUNDARY, not a type check. firestore.rules pin
 * `trialStartDate` to `request.time` on first set, so a Timestamp in this
 * document is server-set BY CONSTRUCTION. A plain ISO *string* is the shape a
 * client could have written (and what a legacy pre-SEC-2 document carries), so it
 * never counts as proof and never triggers the repair below.
 */
function isServerPinnedStart(value) {
  if (!value || typeof value !== 'object') return false;
  return typeof value.toDate === 'function' || typeof value.seconds === 'number';
}

/**
 * Mirror of subscriptionService.trialStartMs. A start beyond the skew tolerance is
 * not a start — that is the shape a forged value takes — so it is treated as
 * unprovable, i.e. expired. Fails closed.
 */
function trialStartMs(rawStart, nowMs) {
  const ms = toMillis(rawStart);
  if (ms === null) return null;
  if (ms > nowMs + CLOCK_SKEW_TOLERANCE_MS) return null;
  return Math.min(ms, nowMs);
}

/**
 * The EFFECTIVE tier for a raw `subscriptions/{uid}` document.
 *
 * Faithful port of `applyExpiry(repairInterruptedTrial(data, startIsServerPinned))`.
 * Returns the derived tier plus the derived trial end (never a stored field).
 */
function deriveEffectiveTier(raw, nowMs) {
  const doc = raw && typeof raw === 'object' ? raw : {};
  const storedTier = typeof doc.tier === 'string' ? doc.tier : 'free';
  const plan = typeof doc.plan === 'string' ? doc.plan : null;
  const premiumSince = doc.premiumSince || null;
  const startRaw = doc.trialStartDate;

  const startPinned = isServerPinnedStart(startRaw);
  const start = trialStartMs(startRaw, nowMs);
  const trialEndsAtMs = start === null ? null : start + TRIAL_MS;

  let tier = storedTier;

  // repairInterruptedTrial — FIRST. Deliberately narrow: only free + trial_7day +
  // no premiumSince + a SERVER-PINNED, unelapsed start. It never invents a plan
  // and never touches premium.
  if (
    startPinned &&
    tier === 'free' &&
    plan === 'trial_7day' &&
    !premiumSince &&
    start !== null &&
    start + TRIAL_MS >= nowMs
  ) {
    tier = 'trial';
  }

  // applyExpiry — SECOND. A `trial` that cannot prove when it began has not begun.
  if (tier === 'trial') {
    if (start === null || start + TRIAL_MS < nowMs) tier = 'free';
  }

  return { tier, trialEndsAtMs };
}

/**
 * The premium test, kept byte-aligned with featureGates.canAccessFeature's
 * `requiredTier === "premium"` clause: `tier === "premium" || tier === "trial"`.
 * A TRIAL STUDENT IS A PREMIUM STUDENT.
 */
function isEntitled(tier) {
  return tier === 'premium' || tier === 'trial';
}

/* ────────────────────────────────────────────────────────────────────────────
   The gate
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * @param deps.adminFirestore  firebase-admin Firestore, or null. Null is the
 *                             credentials-absent case and MUST fail open loudly.
 * @param deps.telemetry       counter sink (server/telemetry.cjs shape).
 * @param deps.sendJson        (res, status, body) => void.
 * @param deps.now             injectable clock.
 * @param deps.logger          injectable console.
 * @param deps.cacheTtlMs      0 disables the positive cache.
 */
function createEntitlementGate(deps = {}) {
  const {
    adminFirestore = null,
    telemetry = null,
    sendJson = null,
    now = () => Date.now(),
    logger = console,
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  } = deps;

  /**
   * ★ POSITIVES ONLY, AND THAT IS THE WHOLE DESIGN — not an optimisation detail.
   *
   * The constraint is "a cache must not outlive an upgrade": a student who pays
   * must not wait out a TTL. There is no payment webhook to invalidate on
   * (payment is deferred), so a two-sided cache CANNOT honour that and would have
   * to be omitted entirely.
   *
   * Caching only ENTITLED decisions honours it exactly and provably: a DENIAL is
   * never stored, so the very next call after an upgrade reads Firestore fresh
   * and serves. An upgrade is never delayed by even one request. The only staleness
   * possible is in the harmless direction — a student who downgrades or whose trial
   * elapses keeps access for at most the TTL, which is a downgrade lag, not a
   * revenue hole.
   *
   * It also removes most of the reads, because entitled students make most of the
   * paid calls.
   */
  const positiveCache = new Map();

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a diagnostic must never fail a request */
    }
  }

  /**
   * Serve the request and SAY SO. Both halves are required: the counter is what
   * makes a silently-open paywall visible, the log is what makes it diagnosable.
   */
  function failOpen(reasonEvent, detail) {
    emit(FAIL_OPEN_EVENT);
    emit(reasonEvent);
    try {
      logger.warn(
        `[entitlement] FAIL-OPEN (${detail}) — request SERVED without an entitlement check. ` +
          'The paywall is not being enforced for this call. If this is frequent, firebase-admin ' +
          'credentials or Firestore access are missing on this deploy.',
      );
    } catch {
      /* logging must never fail a request */
    }
    return { entitled: true, tier: null, trialEndsAtMs: null, outcome: 'fail-open', reason: detail };
  }

  /**
   * Resolve entitlement for a verified uid. NEVER throws.
   *
   * Outcomes: 'cache' | 'read' (document found) | 'absent' (read succeeded, no
   * document -> free) | 'fail-open'.
   */
  async function resolve(uid, req) {
    const id = typeof uid === 'string' ? uid.trim() : '';

    // No verified uid. This is NOT a positive read of a non-entitled tier — it is
    // an expired token, a clock skew, or firebase-admin being unable to verify —
    // so it fails OPEN, exactly as verifiedCaller.cjs refuses to conclude
    // "anonymous" from a verification failure. The two reasons are reported
    // separately so the credentials-broken case stays legible.
    if (!id) {
      const offered = req ? extractBearerToken(req) : '';
      return offered
        ? failOpen(FAIL_OPEN_NO_UID, 'a bearer token was offered and did not verify')
        : failOpen(FAIL_OPEN_NO_CREDENTIAL, 'no bearer token on the request');
    }

    // Credentials absent. THE case §3C exists for.
    if (!adminFirestore || typeof adminFirestore.collection !== 'function') {
      return failOpen(FAIL_OPEN_NO_ADMIN, 'firebase-admin Firestore unavailable');
    }

    const nowMs = now();

    if (cacheTtlMs > 0) {
      const hit = positiveCache.get(id);
      if (hit && hit.expiresAt > nowMs) {
        emit(ALLOW_EVENT);
        return { entitled: true, tier: hit.tier, trialEndsAtMs: hit.trialEndsAtMs, outcome: 'cache' };
      }
      if (hit) positiveCache.delete(id);
    }

    let snap;
    try {
      snap = await adminFirestore.collection(FIRESTORE_COLLECTION).doc(id).get();
    } catch (e) {
      return failOpen(FAIL_OPEN_READ_ERROR, `Firestore read threw: ${(e && e.message) || e}`);
    }

    // A read that returned nothing at all is not a read.
    if (!snap || typeof snap.exists === 'undefined') {
      return failOpen(FAIL_OPEN_READ_ERROR, 'Firestore returned no snapshot');
    }

    // ABSENT is a SUCCESSFUL read: nobody issued this student anything -> free.
    // Distinct from a failed read, and the distinction is the difference between
    // a gate and an outage.
    if (!snap.exists) {
      emit(DENY_EVENT);
      return { entitled: false, tier: 'free', trialEndsAtMs: null, outcome: 'absent' };
    }

    let raw;
    try {
      raw = typeof snap.data === 'function' ? snap.data() : null;
    } catch (e) {
      return failOpen(FAIL_OPEN_READ_ERROR, `snapshot.data() threw: ${(e && e.message) || e}`);
    }

    const { tier, trialEndsAtMs } = deriveEffectiveTier(raw, nowMs);
    const entitled = isEntitled(tier);

    if (entitled) {
      emit(ALLOW_EVENT);
      if (cacheTtlMs > 0) positiveCache.set(id, { tier, trialEndsAtMs, expiresAt: nowMs + cacheTtlMs });
    } else {
      emit(DENY_EVENT);
    }

    return { entitled, tier, trialEndsAtMs, outcome: 'read' };
  }

  /** The 402 body. `error` is for the client to branch on; `message` is for the student. */
  function denialBody(featureSpec, decision) {
    const body = {
      error: 'premium_required',
      feature: featureSpec.feature,
      tier: (decision && decision.tier) || 'free',
      message: featureSpec.message,
    };
    if (decision && decision.trialEndsAtMs) {
      body.trialEndedAt = new Date(decision.trialEndsAtMs).toISOString();
    }
    return body;
  }

  /**
   * The ROUTE-BOUNDARY gate. Call once per POST, before dispatch.
   *
   * ★ WHY THE BOUNDARY AND NOT THE HANDLERS. `checkSolution.test.cjs` is 997 lines
   * and 64 tests with 29 direct invocations of handleCheckSolution /
   * gradeStructuredSet, none of which stubs a subscription document — an absent
   * document is `free`, so a check INSIDE the handlers would turn all 64 red. The
   * handlers are reachable ONLY through the single dispatch in index.cjs
   * (verified: every other reference is the factory, a comment, or a test that
   * calls the handler directly and never traverses a route), so gating the
   * boundary is both complete and non-disruptive.
   *
   * @returns true when it has already responded (402) and the caller must return.
   */
  async function applyToRequest(req, res, reqPath, verifiedUid) {
    // /api/step-solution: attach a LAZY resolver and gate nothing here. Lazy is
    // load-bearing — the bank-backed and cache-backed paths must not pay for a
    // Firestore read they will never consult.
    if (reqPath === STEP_SOLUTION_PATH) {
      req.lazytopperEntitlement = {
        async requireForGeneration() {
          const decision = await resolve(verifiedUid, req);
          return decision.entitled ? null : denialBody(STEP_SOLUTION_FEATURE, decision);
        },
      };
      return false;
    }

    const featureSpec = GATED_ROUTES[reqPath];
    if (!featureSpec) return false;

    const decision = await resolve(verifiedUid, req);
    if (decision.entitled) return false;

    if (typeof sendJson === 'function') {
      // 402 Payment Required, NEVER 403. The client must be able to tell "you
      // cannot" from "you have not paid" — only 402 may surface an upgrade path.
      sendJson(res, 402, denialBody(featureSpec, decision));
    }
    return true;
  }

  return {
    resolve,
    applyToRequest,
    denialBody,
    /** test-only visibility into the positive cache */
    _cacheSize: () => positiveCache.size,
  };
}

module.exports = {
  createEntitlementGate,
  deriveEffectiveTier,
  isEntitled,
  trialStartMs,
  isServerPinnedStart,
  toMillis,
  GATED_ROUTES,
  STEP_SOLUTION_PATH,
  STEP_SOLUTION_FEATURE,
  TRIAL_DAYS,
  TRIAL_MS,
  CLOCK_SKEW_TOLERANCE_MS,
  ALLOW_EVENT,
  DENY_EVENT,
  FAIL_OPEN_EVENT,
  FAIL_OPEN_NO_ADMIN,
  FAIL_OPEN_NO_UID,
  FAIL_OPEN_NO_CREDENTIAL,
  FAIL_OPEN_READ_ERROR,
};
