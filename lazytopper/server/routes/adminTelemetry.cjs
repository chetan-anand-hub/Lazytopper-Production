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

/**
 * The WORKLOAD axis (TELEMETRY-1) — what the model actually DID, as opposed to
 * which billing bucket it consumed. Kept in sync with geminiClient's
 * WORKLOAD_CLASSES by requiring it rather than re-declaring it: two hand-copied
 * lists that drift is how the signed-out lockout counter went missing above.
 */
const {
  WORKLOAD_CLASSES,
  UNCLASSIFIED_WORKLOAD,
} = require('../services/geminiClient.cjs');

const REPORTED_WORKLOAD_CLASSES = Object.freeze([
  ...WORKLOAD_CLASSES,
  UNCLASSIFIED_WORKLOAD,
]);

/**
 * ★ THE OUTPUT RATE IS NOT A HARDCODED CURRENCY FIGURE. Google bills THINKING at
 * the OUTPUT rate, which is what makes an input-side optimisation target ~2.5% of
 * a bill that is 98% output tokens. The rate itself changes and is not this
 * repo's to assert, so it is read from the environment and the response says
 * WHICH source it came from. A default is supplied so the endpoint is useful out
 * of the box, and it is labelled `assumed-default` so no reader can mistake it
 * for a measurement.
 *
 * USD per million tokens, matching how the rate is published. No INR conversion
 * is performed: an FX rate invented here would be a second unverified number
 * multiplying the first.
 */
const DEFAULT_OUTPUT_RATE_USD_PER_MTOK = 2.5;
const DEFAULT_INPUT_RATE_USD_PER_MTOK = 0.3;

function envRate(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return { value: fallback, source: 'assumed-default' };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { value: fallback, source: 'assumed-default' };
  return { value: n, source: 'env' };
}

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

/**
 * Cost estimate for one aggregate row.
 *
 * ★ THINKING IS CHARGED WITH OUTPUT, and that single line is the reason this
 * whole endpoint exists: 98% of the 2026-08 increase was one SKU, "Generate
 * content OUTPUT token count", and thinking is invisible in any estimate derived
 * from prompt structure. `thoughtsTokenCount + candidatesTokenCount` is therefore
 * the billable-at-output-rate quantity, not `candidatesTokenCount` alone.
 */
function estimateCostUsd(row, outputRate, inputRate) {
  if (!row) return null;
  const outputBilled =
    toNumber(row.thoughtsTokenCount) + toNumber(row.candidatesTokenCount);
  const inputBilled = toNumber(row.promptTokenCount);
  const usd =
    (outputBilled * outputRate) / 1e6 + (inputBilled * inputRate) / 1e6;
  const calls = toNumber(row.calls);
  return {
    outputRateTokens: outputBilled,
    inputRateTokens: inputBilled,
    // Six decimals: a single call costs on the order of $0.001-$0.01, so two
    // would round most real rows to zero.
    estUsd: Number(usd.toFixed(6)),
    estUsdPerCall: calls > 0 ? Number((usd / calls).toFixed(6)) : null,
  };
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

    /* ── The WORKLOAD axis (TELEMETRY-1) ─────────────────────────────────────
       Aggregates come from the counter map, by the same closed-set iteration as
       everything above — the content firewall is preserved on this axis too.
       Percentiles come from the sample store in telemetry.cjs, because a
       percentile cannot be recovered from a sum. */
    const byWorkload = aggregateByClass(
      counters, 'gemini_workload', TOKEN_METRICS, REPORTED_WORKLOAD_CLASSES,
    );

    const outputRate = envRate('GEMINI_OUTPUT_RATE_USD_PER_MTOK', DEFAULT_OUTPUT_RATE_USD_PER_MTOK);
    const inputRate = envRate('GEMINI_INPUT_RATE_USD_PER_MTOK', DEFAULT_INPUT_RATE_USD_PER_MTOK);

    let workloadStats = { byWorkload: {}, byMarksBand: {} };
    try {
      if (telemetry && typeof telemetry.workloadStats === 'function') {
        workloadStats = telemetry.workloadStats() || workloadStats;
      }
    } catch {
      workloadStats = { byWorkload: {}, byMarksBand: {} };
    }

    // Attach percentiles + a cost estimate to each exercised workload row.
    //
    // ★ ABSENT, NEVER ZERO-FILLED. A workload with no samples gets NO
    // `thoughtsPercentiles` key at all rather than a triple of zeroes, and a
    // marks band nobody has graded simply does not appear. A zero p90 in a
    // budgeting input is indistinguishable from a measured one, and the whole
    // failure this lane corrects is a proxy standing in for the thing.
    const workloadDetail = {};
    for (const [klass, row] of Object.entries(byWorkload)) {
      const stats = workloadStats.byWorkload && workloadStats.byWorkload[klass];
      const detail = {
        ...row,
        cost: estimateCostUsd(row, outputRate.value, inputRate.value),
      };
      if (stats) {
        detail.sampleSize = toNumber(stats.sampleSize);
        if (stats.thoughtsPercentiles) detail.thoughtsPercentiles = stats.thoughtsPercentiles;
        if (stats.latencyMsPercentiles) detail.latencyMsPercentiles = stats.latencyMsPercentiles;
      }
      workloadDetail[klass] = detail;
    }

    // Per-marks-band percentiles — the specific ask, because a 5-mark answer with
    // photographed working thinks far more than a 1-marker and a single budget
    // across both is either wasteful or damaging.
    //
    // ★ ONE BAND PER MARK VALUE. Deliberately NOT the product's coarse
    // "1"/"23"/"5"/"4" buckets, which FUSE 2- and 3-mark questions.
    const byMarksBand = {};
    for (const [klass, bands] of Object.entries(workloadStats.byMarksBand || {})) {
      if (!REPORTED_WORKLOAD_CLASSES.includes(klass)) continue;
      const out = {};
      for (const [band, stats] of Object.entries(bands || {})) {
        if (!stats) continue;
        const row = {
          calls: toNumber(stats.calls),
          promptTokenCount: toNumber(stats.promptTokenCount),
          candidatesTokenCount: toNumber(stats.candidatesTokenCount),
          thoughtsTokenCount: toNumber(stats.thoughtsTokenCount),
          totalTokenCount: toNumber(stats.totalTokenCount),
          latencyMsTotal: toNumber(stats.latencyMsTotal),
          sampleSize: toNumber(stats.sampleSize),
        };
        row.cost = estimateCostUsd(row, outputRate.value, inputRate.value);
        if (stats.thoughtsPercentiles) row.thoughtsPercentiles = stats.thoughtsPercentiles;
        if (stats.latencyMsPercentiles) row.latencyMsPercentiles = stats.latencyMsPercentiles;
        out[band] = row;
      }
      if (Object.keys(out).length > 0) byMarksBand[klass] = out;
    }

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
      // ── The workload axis (TELEMETRY-1) ──────────────────────────────────
      // `byCallClass` answers "which billing bucket"; this answers "what did the
      // model actually do". `vision` alone covered grading, detect-question AND
      // worksheet, so a grade could not be told from a warm-pool generation —
      // and budgeting the grader off that mixed sample budgets the wrong
      // workload.
      byWorkload: workloadDetail,
      // Present ONLY for (workload, band) pairs actually observed. An absent band
      // means NOT MEASURED, which is the true answer when it is true.
      byMarksBandNote:
        'Bands are the question\'s actual mark value, one band per value. A band is '
        + 'present only where calls carrying that mark value were recorded; absence '
        + 'means not measured, never zero. Only single-question grading carries marks '
        + '(see marksAvailability).',
      byMarksBand,
      // ★ Which workloads can be banded AT ALL — this is what decides whether a
      // banded budget is possible, so it is stated rather than left to be
      // inferred from an empty object.
      marksAvailability: {
        banded: ['grade-single'],
        unbanded: {
          'detect-question': 'determining the marks is what this call is FOR — nothing upstream knows them',
          worksheet: 'grades a SET of questions with differing marks; no single band describes it',
          'grade-batch': 'grades a SET of questions with differing marks; no single band describes it',
          'step-solution': 'generation is keyed on question+marks but the call is not request-banded here',
          'warm-pool': 'generates questions rather than grading one; marks are an input, not a property of a student answer',
        },
      },
      costModel: {
        note:
          'Google bills THINKING at the OUTPUT rate, so estUsd charges '
          + '(thoughtsTokenCount + candidatesTokenCount) at the output rate. Rates are '
          + 'USD per million tokens. No INR conversion is applied.',
        outputRateUsdPerMTok: outputRate.value,
        outputRateSource: outputRate.source,
        inputRateUsdPerMTok: inputRate.value,
        inputRateSource: inputRate.source,
      },
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
  REPORTED_WORKLOAD_CLASSES,
  estimateCostUsd,
};
