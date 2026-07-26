/**
 * rateLimiter.cjs — anti-catastrophe daily caps on the LLM-backed endpoints.
 *
 * WHAT THIS IS FOR
 * ----------------
 * This is a backstop, not a product rule. It exists so that a runaway client
 * loop, an accidental refresh-storm, or casual abuse cannot turn into an
 * unbounded Gemini bill overnight. The PRODUCT rule (who may use Check &
 * Improve, who may generate worksheets) is enforced by the client gates. This
 * module is deliberately TIER-BLIND: the server does not know whether a caller
 * is free, trial or premium, and finding out would cost a Firestore read on
 * every single request. Keep that separation — do not read subscriptions here.
 *
 * SOFT / HARD
 * -----------
 * Each class carries TWO thresholds:
 *   soft — the "this is more than a real student does in a day" line. Crossing
 *          it emits telemetry and NOTHING ELSE. The request goes through.
 *   hard — the "no human is doing this" line. Crossing it returns 429.
 * The gap between them is deliberate: a paying student must never hit a wall
 * because a guessed number was too tight. The soft counter is how the owner
 * discovers what the real numbers should be, from real usage, without ever
 * having charged a student for the privilege of being rate-limited.
 *
 * IDENTITY
 * --------
 * Callers are keyed on the `X-Lazytopper-Uid` header. That header is UNVERIFIED
 * and trivially spoofable — accepted for v1, because the threat this module
 * addresses is a loop, not an adversary. Verifying the Firebase ID token is
 * tracked as [FU-VERIFY-UID-ON-AI-ENDPOINTS].
 *
 * Uid is provider-agnostic by construction: Firebase issues one for phone-only
 * and email-only accounts alike. Nothing here may ever branch on an email
 * address or a phone number.
 *
 * DURABILITY
 * ----------
 * Counters live in a process-local Map. A Railway restart, or a second
 * instance, resets them. That is GENEROUS rather than dangerous — the failure
 * mode is "a student gets more calls than the table says", never "a student is
 * locked out". Tracked as [FU-RATE-LIMIT-IN-MEMORY].
 *
 * DAY BOUNDARY
 * ------------
 * Days roll over at midnight IST, not UTC. The 429 body tells a student their
 * limit "resets tomorrow"; for an Indian student that sentence is only true on
 * an IST boundary.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30, no DST

/* ────────────────────────────────────────────────────────────────────────────
   Paid endpoints — the ONLY paths this module may ever limit.

   Verified route-by-route against index.cjs `handleRequest` and the per-route
   Gemini/Claude call sites. Every path below reaches a model; every path NOT
   below must keep working at the limit (progress sync in particular — a
   student at their tutor cap must still not lose their streak).

   NOTE: /api/mentor is NOT here. It does not exist: Retirement PR-2 deleted the
   route (index.cjs:124) and `mentorResponseBuilder.cjs` is now an orphan that
   nothing requires. If /api/mentor is ever revived it must be added here.
   ──────────────────────────────────────────────────────────────────────────── */
const PAID_ENDPOINTS = Object.freeze({
  // Gemini VISION — by far the most expensive class (maxOutputTokens 16000).
  "/api/check-solution": "vision",
  "/api/detect-question": "vision",
  "/api/grade-worksheet": "vision",
  // Conversational tutor.
  "/api/tutor": "tutor",
  // Per-question help.
  "/api/step-solution": "practice",
  "/api/more-like-this": "practice",
  // Diagram / visual generation.
  "/api/generate-diagram": "visual",
  "/api/generate-visual": "visual",
});

/* ────────────────────────────────────────────────────────────────────────────
   The cap table. ONE object — every tunable number lives here, none are
   scattered as literals through the logic.

   These numbers are GUESSES. They are meant to be replaced by the owner from
   the telemetry this module emits, after a week of real usage. Every one is
   env-overridable so a wall can be lifted without a deploy.
   ──────────────────────────────────────────────────────────────────────────── */

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/* ────────────────────────────────────────────────────────────────────────────
   ★ THE BUDGET IS THE ONLY INPUT. Everything below is DERIVED from it.
   ────────────────────────────────────────────────────────────────────────────

   `LT_MONTHLY_BUDGET_INR` **MUST MATCH the spend cap set on the Google AI Studio
   / Cloud billing project.** It is the one number a human maintains, and it is
   the reason nothing else here is a literal: a ceiling hardcoded in this file,
   or pinned in a test, while the real figure lives in a billing console is not a
   safety margin — it is two numbers that drift apart silently until the day the
   spend cap fires and every student is locked out until the 1st.

   Change the cap in the console and this env var together. Nothing else moves.

   Sizing rule for the cap itself:

       monthly cap  ≈  ₹350 × active premium students  +  ₹500 baseline

   so ₹20,000/month is coherent at roughly 55 active premium students.

   ★ THE ORDERING IS THE WHOLE POINT. The derived ceiling must trip BEFORE the
   billing cap. If billing goes first, it is disabled project-wide and everyone
   is locked out until the 1st of next month. If this ceiling goes first,
   everyone is restored at the next IST midnight. A bad day beats a bad month.
   ──────────────────────────────────────────────────────────────────────────── */

const SPEND_MODEL = (() => {
  const MONTHLY_BUDGET_INR = envInt("LT_MONTHLY_BUDGET_INR", 20000);
  const INR_PER_USD = 88;
  const DAYS_PER_MONTH = 30;
  const BLENDED_USD_PER_CALL = 0.005;
  // FX headroom. The ceiling is derived at ₹88/USD but must stay safe across the
  // ₹83–₹90 band: at ₹90 the same rupee budget buys ~2% fewer dollars, and the
  // blended per-call cost is itself an estimate. 0.86 covers both with room.
  // This factor is load-bearing — the stress test asserts it, so shrinking it to
  // 1.0 turns the suite red rather than quietly removing the margin.
  const FX_HEADROOM = 0.86;
  // The worst rate the headroom is required to survive.
  const FX_STRESS_INR_PER_USD = 90;

  const dailyUsd = MONTHLY_BUDGET_INR / INR_PER_USD / DAYS_PER_MONTH;
  // Left EXACT (not floored) so the headroom multiplies the true figure and there
  // is exactly ONE rounding step, at the very end, in the derivation below.
  const impliedCeiling = dailyUsd / BLENDED_USD_PER_CALL;

  return Object.freeze({
    MONTHLY_BUDGET_INR,
    INR_PER_USD,
    DAYS_PER_MONTH,
    BLENDED_USD_PER_CALL,
    FX_HEADROOM,
    FX_STRESS_INR_PER_USD,
    dailyUsd,
    impliedCeiling,
    /** Daily budget in USD at an arbitrary rate — used by the FX stress test. */
    dailyUsdAt: (inrPerUsd) => MONTHLY_BUDGET_INR / inrPerUsd / DAYS_PER_MONTH,
  });
})();

/**
 * The global daily ceiling — DERIVED, not chosen.
 *
 *   ₹20,000 / 88 / 30                    =  $7.58 / day
 *   $7.58 / $0.005                       =  1,515.15 calls implied
 *   floor(1,515.15 × 0.86 FX headroom)   =  1,303 calls / day  ← shipped
 *
 * `LT_CAP_GLOBAL_HARD` exists only as an emergency override. Setting it does NOT
 * relax the invariant: the stress test still asserts the EFFECTIVE ceiling against
 * the budget, so an override that outruns the cap turns the suite red.
 */
const GLOBAL_DAILY_HARD_CALLS = envInt(
  "LT_CAP_GLOBAL_HARD",
  Math.floor(SPEND_MODEL.impliedCeiling * SPEND_MODEL.FX_HEADROOM),
);

/** Documentation of the load this was sized against; feeds nothing. */
const EXPECTED_DAILY_STUDENTS = envInt("LT_EXPECTED_DAILY_STUDENTS", 50);

/**
 * No single caller may hold more than this share of the whole day. A per-uid
 * ceiling large relative to the global one is a dead letter: the breaker fires
 * first and blacks out everybody, including students who made two calls.
 */
const MAX_SINGLE_UID_SHARE_OF_GLOBAL = 0.2;

/**
 * The PRODUCT's advertised Premium allowance, mirrored here for ONE purpose: to
 * assert that the server never refuses what the pricing page sells. The quota
 * itself is enforced client-side in the C&I surface — this constant is not a
 * limit, it is the floor the server's `vision` cap must clear.
 *
 * 70 solution checks per rolling week, with a 25/day sub-cap.
 */
const ADVERTISED_VISION_DAILY_SUBCAP = 25;

/**
 * Class-aware circuit breaker. At this fraction of the global ceiling the
 * EXPENSIVE class is shed first and everything else keeps serving, so a busy day
 * degrades one feature instead of blacking out the product. Full 429 at 100%.
 */
const VISION_SHED_FRACTION = 0.8;

const DEFAULT_LIMITS = Object.freeze({
  // soft = alert only (request passes) · hard = 429
  // vision hard MUST stay above ADVERTISED_VISION_DAILY_SUBCAP — see the guard.
  vision: Object.freeze({ soft: envInt("LT_CAP_VISION_SOFT", 20), hard: envInt("LT_CAP_VISION_HARD", 30) }),
  tutor: Object.freeze({ soft: envInt("LT_CAP_TUTOR_SOFT", 40), hard: envInt("LT_CAP_TUTOR_HARD", 60) }),
  practice: Object.freeze({ soft: envInt("LT_CAP_PRACTICE_SOFT", 40), hard: envInt("LT_CAP_PRACTICE_HARD", 80) }),
  visual: Object.freeze({ soft: envInt("LT_CAP_VISUAL_SOFT", 10), hard: envInt("LT_CAP_VISUAL_HARD", 25) }),
  // Signed-out callers, keyed on IP, ONE bucket across all paid endpoints.
  // The owner set this as a single number (3) rather than a soft/hard pair: an
  // anonymous caller has no account to lose and no trial to protect, so blocking
  // early is the correct product behaviour here rather than a regression. Soft
  // sits one below purely so the alert still fires before the wall.
  anonymous: Object.freeze({ soft: envInt("LT_CAP_ANON_SOFT", 2), hard: envInt("LT_CAP_ANON_HARD", 3) }),
  // The circuit breaker: all callers, all paid endpoints, one day. Spend-derived
  // (see above) — soft fires at 60% so the owner is warned with room to act,
  // rather than finding out when students start seeing 429s.
  global: Object.freeze({
    soft: envInt("LT_CAP_GLOBAL_SOFT", Math.floor(GLOBAL_DAILY_HARD_CALLS * 0.6)),
    hard: GLOBAL_DAILY_HARD_CALLS,
  }),
});

const ANONYMOUS_CLASS = "anonymous";
const GLOBAL_CLASS = "global";

/* ────────────────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────────────────── */

function istDayKey(nowMs) {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** ISO timestamp of the next IST midnight — what the client renders as "resets tomorrow". */
function nextIstMidnightIso(nowMs) {
  const shifted = nowMs + IST_OFFSET_MS;
  const dayStart = Math.floor(shifted / 86400000) * 86400000;
  return new Date(dayStart + 86400000 - IST_OFFSET_MS).toISOString();
}

/**
 * Caller identity. Uid first; falls back to the client IP for signed-out
 * callers. Behind Railway's proxy `remoteAddress` is the proxy itself, so the
 * first X-Forwarded-For hop is the only usable client address — without it
 * every anonymous caller would share one bucket and three requests would lock
 * out the world. XFF is spoofable, exactly like the uid header, and accepted on
 * the same v1 terms.
 */
function resolveCaller(req) {
  const uid = String(req?.headers?.["x-lazytopper-uid"] || "").trim();
  if (uid) return { id: uid, anonymous: false };

  const xff = String(req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  const ip = xff || String(req?.socket?.remoteAddress || "").trim() || "unknown";
  return { id: `ip:${ip}`, anonymous: true };
}

/* ────────────────────────────────────────────────────────────────────────────
   The limiter
   ──────────────────────────────────────────────────────────────────────────── */

function createRateLimiter(options = {}) {
  const {
    now = () => Date.now(),
    telemetry = null,
    limits = DEFAULT_LIMITS,
    paidEndpoints = PAID_ENDPOINTS,
  } = options;

  /** key -> count, for the current IST day only. */
  const counts = new Map();
  /** classes that have already emitted a soft-breach event today (emit once, not per call). */
  const softAnnounced = new Set();
  let currentDay = null;

  function emit(event, value) {
    if (telemetry && typeof telemetry.increment === "function") {
      telemetry.increment(event, value === undefined ? 1 : value);
    }
  }

  function rollIfNeeded(nowMs) {
    const day = istDayKey(nowMs);
    if (day !== currentDay) {
      // A new IST day: drop yesterday wholesale. This is both the reset and the
      // only memory bound the Map has.
      counts.clear();
      softAnnounced.clear();
      currentDay = day;
    }
    return day;
  }

  function classify(reqPath) {
    return Object.prototype.hasOwnProperty.call(paidEndpoints, reqPath)
      ? paidEndpoints[reqPath]
      : null;
  }

  function limitsFor(klass) {
    return limits[klass] || null;
  }

  function denial(klass, nowMs, message) {
    return {
      allowed: false,
      status: 429,
      body: {
        error: "daily_limit",
        message: message || "You've hit today's limit for this. It resets tomorrow.",
        class: klass,
        resetAt: nextIstMidnightIso(nowMs),
      },
    };
  }

  /**
   * Decide whether this request may proceed, and commit its cost if so.
   *
   * Returns { allowed: true, class } for anything not paid or under the hard
   * ceilings, or { allowed: false, status, body } to be sent verbatim.
   *
   * A DENIED request commits nothing — being blocked must not push a caller
   * further from their reset.
   */
  function check(req, reqPath) {
    const nowMs = now();
    const endpointClass = classify(reqPath);

    // Not a paid endpoint. Progress sync, share tokens, health, QR handoff and
    // the question-report path are never limited, at any count, for any caller.
    if (!endpointClass) return { allowed: true, class: null };

    const day = rollIfNeeded(nowMs);
    const caller = resolveCaller(req);

    // Signed-out callers collapse into ONE tight bucket spanning every paid
    // endpoint, rather than getting a fresh allowance per class.
    const klass = caller.anonymous ? ANONYMOUS_CLASS : endpointClass;
    const rules = limitsFor(klass);
    const globalRules = limitsFor(GLOBAL_CLASS);

    const callerKey = `${caller.id}:${klass}:${day}`;
    const globalKey = `${GLOBAL_CLASS}:${day}`;

    const callerSoFar = counts.get(callerKey) || 0;
    const globalSoFar = counts.get(globalKey) || 0;

    // ── HARD ceilings: block. Per-caller first, so the student gets the more
    //    specific (and more actionable) of the two messages.
    if (rules && callerSoFar + 1 > rules.hard) {
      emit(`rate_limit.hard_block.${klass}`);
      return denial(klass, nowMs);
    }
    if (globalRules && globalSoFar + 1 > globalRules.hard) {
      // The circuit breaker at 100%. Loud, because it means something is very
      // wrong: either far more students than expected, or something is scripting us.
      emit("rate_limit.hard_block.global");
      return denial(GLOBAL_CLASS, nowMs);
    }

    // ── CLASS-AWARE SHED at 80% of the global ceiling.
    //
    // A busy day should cost the product ONE feature, not all of them. `vision`
    // is both the most expensive class and the most substitutable — a student
    // shut out of photo-grading can still ask the tutor and still practise. So
    // the last 20% of the daily budget is reserved for everything else.
    //
    // Only `vision` is shed. Anonymous callers are never singled out here; they
    // already have their own tight bucket, and a signed-out visitor hitting a
    // vision endpoint is exactly who the tight bucket is for.
    if (
      globalRules &&
      endpointClass === "vision" &&
      globalSoFar + 1 > Math.floor(globalRules.hard * VISION_SHED_FRACTION)
    ) {
      emit("rate_limit.shed.vision");
      return denial(
        "vision",
        nowMs,
        "Photo checking is paused for today while we keep the tutor and practice running. It resets tomorrow.",
      );
    }

    // ── Allowed. Commit.
    const callerCount = callerSoFar + 1;
    const globalCount = globalSoFar + 1;
    counts.set(callerKey, callerCount);
    counts.set(globalKey, globalCount);

    // ── Calibration signal. THIS is the point of the whole table: the numbers
    //    above are guesses until these counters say otherwise.
    emit(`rate_limit.call.${endpointClass}`);
    emit("rate_limit.call.total");

    // ── SOFT thresholds: alert, never block. Announced once per class per day.
    if (rules && callerCount > rules.soft && !softAnnounced.has(callerKey)) {
      softAnnounced.add(callerKey);
      emit(`rate_limit.soft_breach.${klass}`);
    }
    if (globalRules && globalCount > globalRules.soft && !softAnnounced.has(globalKey)) {
      softAnnounced.add(globalKey);
      emit("rate_limit.soft_breach.global");
    }

    return { allowed: true, class: endpointClass };
  }

  /** Test/ops seam: current counters, for assertions and for a future ops read-out. */
  function snapshot() {
    const out = {};
    counts.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  return { check, snapshot, limits, paidEndpoints };
}

module.exports = {
  createRateLimiter,
  PAID_ENDPOINTS,
  DEFAULT_LIMITS,
  SPEND_MODEL,
  EXPECTED_DAILY_STUDENTS,
  ADVERTISED_VISION_DAILY_SUBCAP,
  VISION_SHED_FRACTION,
  MAX_SINGLE_UID_SHARE_OF_GLOBAL,
  ANONYMOUS_CLASS,
  GLOBAL_CLASS,
  istDayKey,
  nextIstMidnightIso,
  resolveCaller,
};
