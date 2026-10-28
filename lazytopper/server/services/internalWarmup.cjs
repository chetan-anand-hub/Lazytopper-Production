'use strict';
// server/services/internalWarmup.cjs — GRADE-SPEED-1 (4): the deploy-time solution-cache warm-up must not
// spend a student's, the anonymous, or the global daily budget.
//
// THE CALLER. artifacts/api-server/src/index.ts spawns lazytopper/scripts/warmup-solution-cache.mjs 45 s after
// every deploy (and every 6 h). That script POSTs each bank question to THIS gateway's /api/step-solution over
// loopback, with no credential. The gateway therefore classed every call as an ANONYMOUS caller (a shared
// `ip:127.0.0.1` bucket), and after 3 calls the anonymous cap answered "HTTP 429 daily_limit" (Railway logs
// 10:06 and 10:32 IST) — the warm-up failed itself AND charged the anonymous/global counters real visitors share.
//
// THE FIX. The api-server creates a random per-process secret (WARMUP_INTERNAL_KEY) before it spawns either the
// gateway or the warm-up, so only those two processes hold it. The warm-up sends it in HEADER; the gateway's
// edge (index.cjs) skips the HTTP rate limiter for a request that proves ALL of:
//   1. path is /api/step-solution (the only route the script calls);
//   2. the socket peer is loopback;
//   3. there is no X-Forwarded-For (a request relayed from outside always carries one);
//   4. the header equals the secret (constant-time compare), and the secret is set and long enough.
// Anything else — no secret configured, a wrong or missing header, a non-loopback peer — is judged by the
// limiter exactly as before. The bypass skips ONLY rateLimiter.check (so nothing is counted against any
// student, the anonymous class, the per-IP bucket or global:<day>); every other gate runs unchanged, so a
// warm-up request that would need a model generation still meets the entitlement gate (anonymous -> 402).

const crypto = require('crypto');

const WARMUP_HEADER = 'x-lt-internal-warmup';
const WARMUP_SECRET_ENV = 'WARMUP_INTERNAL_KEY';
const WARMUP_PATH = '/api/step-solution';
const MIN_SECRET_LENGTH = 16;
const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const digest = (v) => crypto.createHash('sha256').update(String(v)).digest();

function isInternalWarmupRequest(req, reqPath, env = process.env) {
  try {
    if (reqPath !== WARMUP_PATH) return false;
    const secret = String((env && env[WARMUP_SECRET_ENV]) || '');
    if (secret.length < MIN_SECRET_LENGTH) return false;
    const headers = (req && req.headers) || {};
    const offered = headers[WARMUP_HEADER];
    if (typeof offered !== 'string' || offered.length === 0) return false;
    if (headers['x-forwarded-for'] !== undefined || headers['forwarded'] !== undefined) return false;
    const peer = String((req.socket && req.socket.remoteAddress) || '');
    if (!LOOPBACK.has(peer)) return false;
    return crypto.timingSafeEqual(digest(offered), digest(secret));
  } catch {
    return false;
  }
}

const INTERNAL_VERDICT = Object.freeze({ allowed: true, class: null, internal: true });

/**
 * The edge's limiter step. `compute` is the ordinary rateLimiter.check(...) call; it is NEVER invoked for an
 * internal warm-up, so nothing is counted against any caller class, per-IP bucket or global:<day>.
 */
function verdictFor(internal, compute) {
  return internal === true ? INTERNAL_VERDICT : compute();
}

module.exports = { isInternalWarmupRequest, verdictFor, INTERNAL_VERDICT, WARMUP_HEADER, WARMUP_SECRET_ENV, WARMUP_PATH };
