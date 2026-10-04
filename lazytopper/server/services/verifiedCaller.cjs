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
// So this module NEVER decides that a caller is anonymous. It returns a uid, or
// "" together with the REASON there is none (resolveVerifiedCaller): no token,
// a token that did not verify, or a deploy that cannot verify anything. The
// callers decide what each reason means (AUTHGATE-FIX-1):
//   - a token that did not verify is answered 401 `reauth_required` on the
//     entitlement-checked routes, and the client refreshes its token and retries
//     once, so an expired token costs a real student nothing;
//   - the rate limiter does not trust the uid header for such a request;
//   - only "verifier unavailable" (a server fault) is served without a check,
//     and that is logged at error level and counted on its own.
//
// ★ IT ALSO CANNOT THROW AND CANNOT BLOCK A CALL. Every path is inside one
// try/catch. A telemetry or verification fault must never fail a student's
// request — the same hard constraint geminiClient's emitTokenTelemetry carries.

/** Header the paid client sends since #552. */
const BEARER_PREFIX = "Bearer ";

/** Emitted when a token was PRESENT and verification failed — see below. */
const UNVERIFIED_EVENT = "rate_limit.uid_source.unverified";
/** Of those: the token itself did not verify. */
const INVALID_EVENT = "auth.token.invalid";
/** Of those: this deploy could not check any token (firebase-admin missing / unconfigured). */
const UNAVAILABLE_EVENT = "auth.token.verifier_unavailable";

/** Why resolveVerifiedCaller did or did not produce a uid. */
const REASON_VERIFIED = "verified";
const REASON_NO_TOKEN = "no-token";
const REASON_INVALID = "invalid";
const REASON_UNAVAILABLE = "unavailable";

/** firebase-admin's code for "no project id / credential", raised before the token is read. */
const ADMIN_NOT_CONFIGURED_CODE = "auth/invalid-credential";

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
   * The verified uid for this request AND why there is or is not one.
   *
   *   { uid, reason: VERIFIED }     the token verified
   *   { uid: "", reason: NO_TOKEN }    no bearer token on the request
   *   { uid: "", reason: INVALID }     a token was offered and did not verify
   *   { uid: "", reason: UNAVAILABLE } a token was offered and this deploy cannot
   *                                    check it (firebase-admin missing or not
   *                                    configured) — a server fault, not the caller's
   *
   * The reason exists so a caller can tell a server fault from a credential that is
   * simply wrong. Only UNAVAILABLE may be treated as "serve anyway"; INVALID is a
   * rejection the client answers by refreshing its token and retrying.
   */
  async function resolveVerifiedCaller(req) {
    try {
      const token = extractBearerToken(req);
      if (!token) return { uid: "", reason: REASON_NO_TOKEN };
      if (!firebaseAdmin || typeof firebaseAdmin.auth !== "function") {
        // A token was offered and we are structurally unable to check it. That
        // is worth seeing: it means the deploy is missing Firebase config while
        // clients are sending credentials.
        emit(UNVERIFIED_EVENT);
        emit(UNAVAILABLE_EVENT);
        return { uid: "", reason: REASON_UNAVAILABLE };
      }
      let decoded;
      try {
        decoded = await firebaseAdmin.auth().verifyIdToken(token);
      } catch (e) {
        emit(UNVERIFIED_EVENT);
        // A project-id / credential fault is raised before the token is even read,
        // so it says nothing about the caller: it is this deploy that cannot verify.
        if (e && e.code === ADMIN_NOT_CONFIGURED_CODE) {
          emit(UNAVAILABLE_EVENT);
          return { uid: "", reason: REASON_UNAVAILABLE };
        }
        emit(INVALID_EVENT);
        return { uid: "", reason: REASON_INVALID };
      }
      const uid = decoded && typeof decoded.uid === "string" ? decoded.uid.trim() : "";
      if (uid) return { uid, reason: REASON_VERIFIED };
      emit(UNVERIFIED_EVENT);
      emit(INVALID_EVENT);
      return { uid: "", reason: REASON_INVALID };
    } catch {
      // Defensive: nothing above should throw, but this function never may.
      return { uid: "", reason: REASON_INVALID };
    }
  }

  /**
   * The verified uid for this request, or "" if there isn't one. Kept for every
   * caller that only needs the uid (payments, account export/erasure, usage) and
   * already refuses "" — those are fail-closed and unchanged.
   */
  async function resolveVerifiedUid(req) {
    return (await resolveVerifiedCaller(req)).uid;
  }

  return { resolveVerifiedUid, resolveVerifiedCaller };
}

module.exports = {
  createVerifiedCaller,
  extractBearerToken,
  UNVERIFIED_EVENT,
  INVALID_EVENT,
  UNAVAILABLE_EVENT,
  REASON_VERIFIED,
  REASON_NO_TOKEN,
  REASON_INVALID,
  REASON_UNAVAILABLE,
};
