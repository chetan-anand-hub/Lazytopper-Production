// Derive the caller's uid from a VERIFIED Firebase ID token.
//
// ★ WHY THIS EXISTS. rateLimiter's `resolveCaller` keyed its buckets on the
// client-supplied `X-Lazytopper-Uid` header, which is trivially spoofable — so
// the daily caps were ADVISORY: anyone could mint a fresh allowance by changing
// a string. #552 made every paid client call send `Authorization: Bearer <id
// token>` alongside that header, so the verifiable credential is now present at
// every call site with no further client change. This turns the caps from
// advisory into ENFORCED. Closes the server half of
// [FU-VERIFY-UID-ON-AI-ENDPOINTS].
//
// ────────────────────────────────────────────────────────────────────────────
// ★ THE FAILURE MODE THAT WOULD RE-CREATE A LAUNCH BLOCKER
// ────────────────────────────────────────────────────────────────────────────
// It is tempting to treat "token missing or invalid" as "not signed in". DO NOT.
// The anonymous hard cap is 3/day. An expired token, a clock skew, a transient
// firebase-admin failure, or an unconfigured deploy would then drop a real
// signed-in student into the anonymous bucket — precisely the defect #552 fixed,
// re-introduced through the back door and visible only to whoever was unlucky.
//
// So this module NEVER decides that a caller is anonymous. It returns a uid or
// it returns `""`, and `resolveCaller` falls back to the header exactly as
// before. The change can only TIGHTEN identity, never shrink a real student's
// allowance. Being strictly-better-or-equal is what makes it safe to ship
// without a live rollback plan.
//
// ★ IT ALSO CANNOT THROW AND CANNOT BLOCK A CALL. Every path is inside one
// try/catch. A telemetry or verification fault must never fail a student's
// request — the same hard constraint geminiClient's emitTokenTelemetry carries.

/** Header the paid client sends since #552. */
const BEARER_PREFIX = "Bearer ";

/** Emitted when a token was PRESENT and verification failed — see below. */
const UNVERIFIED_EVENT = "rate_limit.uid_source.unverified";

/** Pull the raw ID token out of the Authorization header. "" when absent. */
function extractBearerToken(req) {
  const header = String(req?.headers?.["authorization"] || "");
  if (!header.startsWith(BEARER_PREFIX)) return "";
  return header.slice(BEARER_PREFIX.length).trim();
}

/**
 * @param deps.firebaseAdmin  initialised firebase-admin, or null. Null is a
 *                            normal state (no VITE_FIREBASE_PROJECT_ID) and must
 *                            degrade silently to the header fallback.
 * @param deps.telemetry      optional sink; absent is fine.
 */
function createVerifiedCaller(deps = {}) {
  const { firebaseAdmin, telemetry } = deps;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === "function") {
        telemetry.increment(event, 1);
      }
    } catch {
      /* a diagnostic must never fail a request */
    }
  }

  /**
   * The verified uid for this request, or "" if there isn't one.
   *
   * "" is returned for BOTH "no token was offered" and "a token was offered and
   * did not verify". Only the second emits — the first is the ordinary state for
   * any non-browser caller and counting it would drown the signal.
   */
  async function resolveVerifiedUid(req) {
    try {
      const token = extractBearerToken(req);
      if (!token) return "";
      if (!firebaseAdmin || typeof firebaseAdmin.auth !== "function") {
        // A token was offered and we are structurally unable to check it. That
        // is worth seeing: it means the deploy is missing Firebase config while
        // clients are sending credentials.
        emit(UNVERIFIED_EVENT);
        return "";
      }
      const decoded = await firebaseAdmin.auth().verifyIdToken(token);
      const uid = decoded && typeof decoded.uid === "string" ? decoded.uid.trim() : "";
      if (uid) return uid;
      emit(UNVERIFIED_EVENT);
      return "";
    } catch {
      // Expired, forged, clock-skewed, or the network to Google is down. Return
      // "" — this function NEVER reads the header. resolveCaller in rateLimiter.cjs
      // is what falls back to it, so a caller that refuses "" (the DPDP erasure
      // route) is fail-closed and the header cannot reach it.
      emit(UNVERIFIED_EVENT);
      return "";
    }
  }

  return { resolveVerifiedUid };
}

module.exports = {
  createVerifiedCaller,
  extractBearerToken,
  UNVERIFIED_EVENT,
};
