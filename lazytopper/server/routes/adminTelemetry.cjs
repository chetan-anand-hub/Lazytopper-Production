// Admin-gated READ path for the token + rate-limit telemetry.
//
// ★ WHY THIS EXISTS. #540 records per-call-class token counters into
// `server/telemetry.cjs` and a bounded ring buffer, and NOTHING serves either.
// The instrumentation MEASURES and does not REPORT: `snapshot()` and
// `getTokenTelemetry()` had no reader anywhere in the repo, so every number it
// collected went into a void from the day it merged. Until this endpoint exists,
// every thinking-budget decision and the subscription price are being modelled
// from estimates while the real figures sit in memory on Railway, unreachable.
//
// It is a READ path only. It computes nothing, stores nothing, and changes no
// limit.
//
// ────────────────────────────────────────────────────────────────────────────
// ★ THE CONTENT FIREWALL — the property that must survive every future edit.
// ────────────────────────────────────────────────────────────────────────────
// #540's record builder is deliberately written with an explicit named
// allowlist: no spread, no Object.assign, no key iteration, so a field Google
// adds to `usageMetadata` tomorrow cannot silently appear in a record. THIS FILE
// PRESERVES THAT PROPERTY ON THE WAY OUT, and it has to, because a read endpoint
// is where the consequence of losing it would actually be paid.
//
// Concretely: the counter map is keyed dynamically (`gemini_tokens.<metric>.<class>`),
// so the response is NOT built by walking it. It is built by iterating two CLOSED
// SETS — the known call classes and a named list of metrics — and looking each
// combination up. No key from the snapshot is ever copied into the response, and
// every value is coerced through Number(). The single dynamic-label surface,
// `byModel`, is filtered through a strict pattern on the way out as well as being
// sanitised on the way in.
//
// The tests poison the snapshot with a content-shaped key and assert it cannot
// reach the response.

/** Call classes #540 records against, plus its honest fallback label. */
const REPORTED_CALL_CLASSES = Object.freeze([
  'vision',
  'tutor',
  'practice',
  'visual',
  'unclassified',
]);

/**
 * The rate limiter's class vocabulary. It OVERLAPS the Gemini one on the four
 * endpoint classes and then diverges: it has no `unclassified` (every limited
 * path has a class by construction) and it adds `anonymous` and `global`, which
 * are buckets rather than call kinds.
 *
 * ★ These two lists are deliberately SEPARATE. Reusing REPORTED_CALL_CLASSES for
 * both silently dropped `rate_limit.hard_block.anonymous` — i.e. it hid the
 * signed-out lockout counter, which is precisely the thing the anon-key
 * diagnostic below exists to detect. Caught by the test, not by review.
 */
const RATE_LIMIT_CLASSES = Object.freeze([
  'vision',
  'tutor',
  'practice',
  'visual',
  'anonymous',
  'global',
]);

/**
 * counter suffix -> response field. A CLOSED, NAMED SET: the response can only
 * ever contain these keys, whatever the counter map happens to hold.
 */
const TOKEN_METRICS = Object.freeze({
  call: 'calls',
  prompt: 'promptTokenCount',
  candidates: 'candidatesTokenCount',
  // The critical one: thinking bills at OUTPUT rates and is invisible in any
  // estimate derived from prompt structure. It is the single number most likely
  // to be wrong in a spreadsheet built without this endpoint.
  thoughts: 'thoughtsTokenCount',
  total: 'totalTokenCount',
  latency_ms: 'latencyMsTotal',
  retry: 'retryCount',
  fallback: 'fallbackCount',
});

/** Rate-limiter counters worth reading back, same closed-set discipline. */
const RATE_LIMIT_METRICS = Object.freeze({
  call: 'calls',
  hard_block: 'hardBlocks',
  soft_breach: 'softBreaches',
});

/**
 * A model id as `sanitiseModelLabel` in geminiClient.cjs already constrains it.
 * Re-applied here as defence in depth: the write side is one edit away from
 * changing, and this is the side that leaves the process.
 */
const MODEL_LABEL_RE = /^[a-z0-9._-]{1,64}$/;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Fold the flat counter map into per-call-class aggregates.
 *
 * Note the direction of travel: we ASK for `${prefix}.${metric}.${klass}` for
 * every (closed-set metric × closed-set class) pair. We never enumerate what the
 * snapshot contains. That is what makes an unexpected counter key — including a
 * maliciously named one — structurally unable to reach the output.
 */
function aggregateByClass(counters, prefix, metrics, classes) {
  const out = {};
  for (const klass of classes) {
    const row = {};
    let present = false;
    for (const [suffix, field] of Object.entries(metrics)) {
      const value = toNumber(counters[`${prefix}.${suffix}.${klass}`]);
      row[field] = value;
      if (value > 0) present = true;
    }
    // Only report a class that has actually been exercised. An all-zero row is
    // noise in a cost read-out, and its absence is itself information.
    if (present) out[klass] = row;
  }
  return out;
}

function sumRows(rows) {
  const total = {};
  for (const row of Object.values(rows)) {
    for (const [field, value] of Object.entries(row)) {
      total[field] = (total[field] || 0) + value;
    }
  }
  return total;
}

function createAdminTelemetryRoutes(deps) {
  const { sendJson, firebaseAdmin, telemetry, getTokenTelemetry } = deps;

  function adminUids() {
    return String(process.env.ADMIN_FIREBASE_UIDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Fail-closed admin gate. Behaviourally identical to the one in
   * `routes/adminSolutionCache.cjs` (same statuses, same order, same messages):
   * 503 when the machinery is unconfigured so a misconfigured deploy can never
   * fall open, 401 on a missing/invalid token, 403 on a valid non-allowlisted uid.
   *
   * NOTE — there are now TWO copies of this gate in the tree. Duplicating a
   * security check is a real hazard (one gets fixed, the other does not), but
   * unifying them means editing a live, reviewed admin path in a PR that is about
   * telemetry. Logged as a follow-up instead of done as a drive-by.
   */
  async function requireFirebaseAdmin(req) {
    if (!firebaseAdmin) {
      return { ok: false, status: 503, error: 'Admin auth unavailable: firebase-admin not initialised' };
    }
    const allow = adminUids();
    if (allow.length === 0) {
      return { ok: false, status: 503, error: 'Admin endpoints disabled: ADMIN_FIREBASE_UIDS not configured' };
    }
    const authHeader = String(req.headers['authorization'] || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return { ok: false, status: 401, error: 'Unauthorized: Bearer ID token required' };
    }
    let decoded;
    try {
      decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch {
      return { ok: false, status: 401, error: 'Unauthorized: invalid ID token' };
    }
    if (!decoded || !decoded.uid || !allow.includes(decoded.uid)) {
      return { ok: false, status: 403, error: 'Forbidden: not an admin uid' };
    }
    return { ok: true, uid: decoded.uid };
  }

  /** Build the payload. Separated from the handler so tests can assert the shape directly. */
  function buildTelemetryPayload() {
    const counters =
      telemetry && typeof telemetry.snapshot === 'function' ? telemetry.snapshot() || {} : {};

    const byCallClass = aggregateByClass(
      counters, 'gemini_tokens', TOKEN_METRICS, REPORTED_CALL_CLASSES,
    );
    const rateLimitByClass = aggregateByClass(
      counters, 'rate_limit', RATE_LIMIT_METRICS, RATE_LIMIT_CLASSES,
    );

    // Dynamic label surface — filtered, never trusted.
    const byModel = {};
    for (const [key, value] of Object.entries(counters)) {
      if (!key.startsWith('gemini_tokens.model.')) continue;
      const label = key.slice('gemini_tokens.model.'.length);
      if (!MODEL_LABEL_RE.test(label)) continue;
      byModel[label] = toNumber(value);
    }

    // The ring is per-call granularity. Only its SIZE is reported: the records
    // themselves are already content-free, but shipping 200 of them turns a cost
    // read-out into a request log, and this endpoint has no reason to be one.
    let recentSampleSize = 0;
    try {
      const ring = typeof getTokenTelemetry === 'function' ? getTokenTelemetry() : [];
      recentSampleSize = Array.isArray(ring) ? ring.length : 0;
    } catch {
      recentSampleSize = 0;
    }

    return {
      ok: true,
      // Counters are PROCESS-LIFETIME, not daily: telemetry.cjs never rolls them,
      // and Railway restarts reset them to zero. A reader comparing two pulls must
      // know whether a restart happened in between, so say so rather than let the
      // numbers imply a window they do not have.
      windowNote:
        'Counters are cumulative for the current server process and reset on restart. '
        + 'uptimeSeconds bounds the window they cover.',
      uptimeSeconds: Math.floor(process.uptime()),
      byCallClass,
      totals: sumRows(byCallClass),
      byModel,
      rateLimit: {
        byClass: rateLimitByClass,
        shedVision: toNumber(counters['rate_limit.shed.vision']),
        totalCalls: toNumber(counters['rate_limit.call.total']),
        // ★ The anon-key shape diagnostic (see rateLimiter.cjs). `loopback` means
        // x-forwarded-for did NOT survive the Vercel -> Railway -> proxy hops, so
        // every signed-out caller collapsed into ONE shared 3/day bucket. It fails
        // CLOSED, so there is no billing risk — but it is an invisible outage for
        // signed-out visitors, who can legitimately reach generate-visual and
        // generate-diagram from the free practice surfaces.
        //
        // This is reported HERE on purpose: a diagnostic with no reader is the
        // exact failure this whole endpoint exists to fix.
        anonKey: {
          client: toNumber(counters['rate_limit.anon_key.client']),
          loopback: toNumber(counters['rate_limit.anon_key.loopback']),
        },
        // ★ Which identity actually keyed the bucket — the migration signal for
        // [FU-VERIFY-UID-ON-AI-ENDPOINTS]. `verified` means the uid came from a
        // Firebase ID token firebase-admin checked, so the cap is ENFORCED for
        // that caller. `header` means it came from the spoofable
        // X-Lazytopper-Uid, so the cap is still only ADVISORY there.
        // `unverified` means a token WAS presented and failed to verify —
        // non-zero with a healthy client is the interesting case: expired
        // tokens, clock skew, or a deploy missing Firebase config.
        // Surfaced here because a counter with no reader is not a diagnostic,
        // which is the mistake this whole endpoint exists to correct.
        uidSource: {
          verified: toNumber(counters['rate_limit.uid_source.verified']),
          header: toNumber(counters['rate_limit.uid_source.header']),
          unverified: toNumber(counters['rate_limit.uid_source.unverified']),
        },
      },
      recentSampleSize,
    };
  }

  // GET /api/admin/token-telemetry
  async function handleGetTokenTelemetry(req, res) {
    const auth = await requireFirebaseAdmin(req);
    if (!auth.ok) return sendJson(res, auth.status, { ok: false, error: auth.error });
    return sendJson(res, 200, buildTelemetryPayload());
  }

  return { handleGetTokenTelemetry, buildTelemetryPayload, requireFirebaseAdmin };
}

module.exports = {
  createAdminTelemetryRoutes,
  REPORTED_CALL_CLASSES,
  RATE_LIMIT_CLASSES,
  TOKEN_METRICS,
  RATE_LIMIT_METRICS,
};
