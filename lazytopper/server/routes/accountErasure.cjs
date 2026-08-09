/**
 * Account erasure route — a student erases their OWN account.
 *
 *   POST /api/account/erase   (AUTH REQUIRED, OWNER-SCOPED)
 *
 * ★★ THE UID COMES FROM THE VERIFIED TOKEN AND FROM NOWHERE ELSE. Not the body,
 * not a query parameter, not `X-Lazytopper-Uid`. There is deliberately no "erase
 * uid X" input on this route: a destructive endpoint that accepts a uid is the
 * account-takeover version of this feature. `accountErasure.test.cjs` sends a
 * request carrying somebody else's uid in all three of those places and asserts
 * that only the token's uid is erased.
 *
 * ★ AUTH IS CONSUMED, NOT BUILT. `services/verifiedCaller.cjs` is already
 * fail-closed: no token, no admin SDK, unverified, expired, forged, network down —
 * every path returns `""`, and it never consults a header. This route adds the one
 * thing that was missing, which is a caller that REFUSES an empty uid. Nothing in
 * `verifiedCaller` changes; the fail-open behaviour was always in its callers.
 *
 * ★ THE HEADER IS UNREACHABLE FROM HERE, and that is load-bearing. `rateLimiter`'s
 * `resolveCaller` falls back to the spoofable `X-Lazytopper-Uid` when the verified
 * uid is empty — correct for a limiter, catastrophic for a destructive route. The
 * 401 fires BEFORE the limiter, so the limiter on this path only ever sees a
 * verified uid and the spoofable tier cannot be reached.
 *
 * ⚠ NOT FIXED HERE, and logged rather than widened into this PR:
 * `[FU-DPDP-GATEWAY-SPOOFABLE-UID-HEADER]` — `verifiedCaller.cjs` and
 * `rateLimiter.cjs` both still read `X-Lazytopper-Uid` on other paths.
 */

const { createRateLimiter } = require('../services/rateLimiter.cjs');

/** The one path this route answers. Exported so index.cjs cannot drift from it. */
const ACCOUNT_ERASE_PATH = '/api/account/erase';

/** The limiter class this route bills against. Its own name, not a paid-LLM class. */
const ERASURE_CLASS = 'erasure';

/**
 * ★ A TIGHT CAP ON A DESTRUCTIVE ROUTE. Three a day per VERIFIED uid: erasure is
 * idempotent, so a student who hits a partial failure must be able to retry, but
 * nothing legitimate needs a fourth. Soft fires at 1 so the owner sees the very
 * first erasure of the day in telemetry rather than discovering it from a support
 * mail. The env names match the existing `LT_CAP_*` convention.
 *
 * ★ This CONSUMES the existing limiter (`services/rateLimiter.cjs`) rather than
 * modifying it: `createRateLimiter` already takes `paidEndpoints` and `limits`, so
 * a dedicated instance needs no edit to a module 27 other tests depend on, and
 * cannot shift an LLM billing bucket by accident.
 */
const ERASURE_PAID_ENDPOINTS = Object.freeze({ [ACCOUNT_ERASE_PATH]: ERASURE_CLASS });
const ERASURE_LIMITS = Object.freeze({
  [ERASURE_CLASS]: Object.freeze({
    soft: Number(process.env.LT_CAP_ERASURE_SOFT || 1),
    hard: Number(process.env.LT_CAP_ERASURE_HARD || 3),
  }),
});

function createAccountErasureRoutes(deps) {
  const { sendJson, verifiedCaller, accountErasure, telemetry } = deps;

  const rateLimiter =
    deps.rateLimiter ||
    createRateLimiter({
      telemetry,
      paidEndpoints: ERASURE_PAID_ENDPOINTS,
      limits: ERASURE_LIMITS,
    });

  async function handleErase(req, res) {
    // ── 1. Identity. Fail closed. ────────────────────────────────────────────
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) {
      return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    }

    // ── 2. Cap, keyed on that verified uid only. ─────────────────────────────
    const verdict = rateLimiter.check(req, ACCOUNT_ERASE_PATH, uid);
    if (!verdict.allowed) {
      return sendJson(res, verdict.status, verdict.body);
    }

    // ── 3. Honest unavailability, never a silent partial run. ────────────────
    if (!accountErasure.isAvailable()) {
      return sendJson(res, 503, {
        ok: false,
        error: 'Account erasure is unavailable right now.',
        reason: accountErasure.unavailableReason(),
      });
    }

    // ── 4. Walk the map. ─────────────────────────────────────────────────────
    let result;
    try {
      result = await accountErasure.eraseAccount(uid);
    } catch (e) {
      if (telemetry && typeof telemetry.increment === 'function') {
        telemetry.increment('account_erasure.run_failed', 1);
      }
      return sendJson(res, 500, {
        ok: false,
        error: 'Account erasure failed.',
        details: e && e.message ? e.message : String(e),
      });
    }

    if (telemetry && typeof telemetry.increment === 'function') {
      telemetry.increment(result.ok ? 'account_erasure.ok' : 'account_erasure.partial', 1);
    }

    // ★ A PARTIAL RUN IS NOT A 200. `ok:false` carries `remaining`, naming every
    // location the server did not erase and why, so a caller cannot render "your
    // account was deleted" over a run that erased 27 of 29.
    return sendJson(res, result.ok ? 200 : 207, result);
  }

  return { handleErase };
}

module.exports = {
  createAccountErasureRoutes,
  ACCOUNT_ERASE_PATH,
  ERASURE_CLASS,
  ERASURE_PAID_ENDPOINTS,
  ERASURE_LIMITS,
};
