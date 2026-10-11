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
// Required, not restated, for the same reason: the name this endpoint reads must be
// the name entitlement.cjs emits.
const {
  DENY_UID_HEADER_NO_TOKEN,
  DENY_REAUTH_REQUIRED,
  FAIL_OPEN_VERIFIER_UNAVAILABLE,
} = require('../services/entitlement.cjs');

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

/* ═════════════════════════════════════════════════════════════════════════════
   HARDEN-1 PR-2 · THE "GRADER HEALTH" CARD — GET /api/admin/token-telemetry?view=grader-health

   READ-ONLY, behind the same requireFirebaseAdmin gate as the rest of this file. It is
   served from THIS path (a query view) so no route has to be added to index.cjs.

   ★ EVERY NUMBER COMES FROM SOMETHING THE SERVER ALREADY STORES OR COUNTS. Nothing is
   estimated, and nothing new is recorded by this lane:
     • per-day numbers (grades by model, grades not completed, answer–question mismatches)
       are read from the stored grade records, gradingResults/{uid}/attempts/{id}
       (services/fairUse.cjs idempotency + grading/jobs.cjs). Each stored reply already
       carries `model` and, per question, `notGraded` / `couldNotRead` / `answerMismatch`.
     • `grading.model_fallback` and the sign-in refresh denials are the existing in-process
       counters. They are cumulative since the server process started, never per day, and
       the payload says so (uptimeSeconds).
   ★ WHAT THE RECORDS CANNOT SEE, SAID ON THE CARD: only a grade sent with an
   Idempotency-Key by a signed-in student is stored (never the signed-out free check);
   only a 2xx reply is stored (a 500 is not); and every record carries a 24 h expiry
   (`expiresAt`), so a Firestore TTL policy may already have deleted older ones. The 7-day
   column therefore counts the records still stored, and says so.
   ★ IST DAY BOUNDARIES. A record belongs to the IST calendar day of its completion time
   (rateLimiter.istDayKey): 18:29Z and 18:31Z are different IST days.
   ★ BOUNDED READS. Auth listUsers (not a Firestore read) up to GH_MAX_AUTH_PAGES x 1000;
   then ONE query per student whose last token refresh is inside the window (a student
   who graded must have held a fresh ID token), at most GH_MAX_STUDENTS students x
   GH_PER_STUDENT_LIMIT records. The response says when either cap was hit.
   ═════════════════════════════════════════════════════════════════════════════ */

const GRADER_HEALTH_VIEW = 'grader-health';
const GH_WINDOW_DAYS = 7;
const GH_MAX_STUDENTS = 500;
const GH_PER_STUDENT_LIMIT = 100;
const GH_MAX_AUTH_PAGES = 10;
const GH_AUTH_PAGE_SIZE = 1000;
const GH_DAY_MS = 24 * 60 * 60 * 1000;
const GH_HOUR_MS = 60 * 60 * 1000;
const GH_IST_OFFSET_MS = 5.5 * GH_HOUR_MS;
/** A grade not completed, by reason. The card shows each with "charged: 0". */
const NOT_COMPLETED_REASONS = Object.freeze(['timeout', 'unreadable', 'error', 'interrupted']);
/**
 * ★ "charged: 0" is the CHARGING RULE, not a guess: grading/charge.cjs `isChargeable` is
 * false for every result that was not graded (couldn't read, timed out, failed,
 * interrupted), and the meter writes nothing for a share of 0 (usageLedger meter groups).
 * The stored reply cannot carry the non-enumerable `_reason` charge.cjs reads, so the
 * value is stated from the rule, and pinned by a test.
 */
const NOT_COMPLETED_CHARGED = 0;
const UNRECORDED_MODEL = 'not-recorded';
const OTHER_MODEL = 'other';

const { istDayKey } = require('../services/rateLimiter.cjs');
const {
  GRADING_RESULTS_COLLECTION,
  GRADING_RESULTS_SEGMENTS,
} = require('../services/fairUse.cjs');
const { resolveGradingModel, GRADING_FALLBACK_MODEL } = require('../grading/modelConfig.cjs');

/** The UTC instant at which IST day `key` (yyyy-mm-dd) began. */
function ghIstDayStartMs(key) {
  return Date.parse(`${key}T00:00:00.000Z`) - GH_IST_OFFSET_MS;
}

function ghAddIstDays(key, n) {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + n * GH_DAY_MS).toISOString().slice(0, 10);
}

function safeJson(text) {
  if (typeof text !== 'string' || text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function modelLabelOf(value) {
  if (typeof value !== 'string' || value === '') return UNRECORDED_MODEL;
  return MODEL_LABEL_RE.test(value) ? value : OTHER_MODEL;
}

/** One stored per-question result -> its not-completed reason, or null when it was graded. */
function notCompletedReasonOf(r) {
  if (!r || typeof r !== 'object') return null;
  if (r.notGraded === 'timeout' || r.notGraded === 'error' || r.notGraded === 'interrupted') return r.notGraded;
  if (r.notGraded === 'unreadable' || r.couldNotRead === true) return 'unreadable';
  return null;
}

/**
 * ONE stored grade record -> what the card counts. Pure. Reads only named fields; nothing
 * from a reply (no question, answer, note or summary text) is ever returned.
 *
 *   null                              — not a finished grade (a pending marker, a job still
 *                                       running, an unparseable or unknown shape)
 *   { atMs, model, notCompleted, mismatches, questions }
 *
 * Shapes (services/fairUse.cjs settle + grading/jobs.cjs):
 *   synchronous grade : { state:'done', status, body:<JSON reply>, completedAtMs }
 *   background job    : { ..., job:{ state:'done', final:<JSON reply>, model, doneAtMs } }
 *                       { ..., job:{ state:'interrupted', results:[<JSON row>], interruptedAtMs } }
 * A reply `{ ok:false }` (the grader's reply could not be used, or the job failed) is one
 * grade not completed with reason "error".
 */
function summariseGradeRecord(data) {
  if (!data || typeof data !== 'object') return null;
  const notCompleted = { timeout: 0, unreadable: 0, error: 0, interrupted: 0 };
  let mismatches = 0;
  let questions = 0;
  const addRow = (r) => {
    if (!r || typeof r !== 'object') return;
    questions += 1;
    const reason = notCompletedReasonOf(r);
    if (reason) notCompleted[reason] += 1;
    else if (r.answerMismatch === true) mismatches += 1;
  };
  const addReply = (reply) => {
    if (!reply || typeof reply !== 'object') return false;
    if (reply.ok !== true) {
      questions += 1;
      notCompleted.error += 1;
      return true;
    }
    if (Array.isArray(reply.results)) reply.results.forEach(addRow);
    else addRow(reply); // a single check: the reply IS the one question's result
    return true;
  };

  const job = data.job && typeof data.job === 'object' ? data.job : null;
  if (job) {
    if (job.state === 'done') {
      const atMs = Number(job.doneAtMs);
      if (!Number.isFinite(atMs)) return null;
      const reply = safeJson(job.final);
      if (!addReply(reply)) return null;
      const model = job.model || (reply && reply.model) || null;
      return { atMs, model: modelLabelOf(model), notCompleted, mismatches, questions };
    }
    if (job.state === 'interrupted') {
      const atMs = Number(job.interruptedAtMs);
      if (!Number.isFinite(atMs) || !Array.isArray(job.results)) return null;
      for (const raw of job.results) addRow(safeJson(raw));
      return { atMs, model: modelLabelOf(job.model), notCompleted, mismatches, questions };
    }
    return null; // queued / running: not finished, not counted
  }

  if (data.state !== 'done') return null;
  const atMs = Number(data.completedAtMs);
  if (!Number.isFinite(atMs)) return null;
  const reply = safeJson(data.body);
  if (!addReply(reply)) return null;
  return { atMs, model: modelLabelOf(reply.model), notCompleted, mismatches, questions };
}

function emptyWindow() {
  const notCompleted = {};
  for (const reason of NOT_COMPLETED_REASONS) notCompleted[reason] = { count: 0, charged: NOT_COMPLETED_CHARGED };
  return { records: 0, questions: 0, gradesByModel: {}, notCompleted, answerMismatches: 0 };
}

function addToWindow(win, s) {
  win.records += 1;
  win.questions += s.questions;
  win.gradesByModel[s.model] = (win.gradesByModel[s.model] || 0) + 1;
  for (const reason of NOT_COMPLETED_REASONS) win.notCompleted[reason].count += s.notCompleted[reason] || 0;
  win.answerMismatches += s.mismatches;
}

/**
 * Fold summarised records into the two IST windows. Pure (now is passed in).
 * `today` = the IST calendar day of `nowMs`; `last7Days` = today and the 6 IST days before.
 */
function foldGradeWindows(summaries, nowMs) {
  const todayKey = istDayKey(nowMs);
  const windowStartKey = ghAddIstDays(todayKey, -(GH_WINDOW_DAYS - 1));
  const today = emptyWindow();
  const last7Days = emptyWindow();
  let oldestRecordMs = null;
  for (const s of summaries) {
    if (!s) continue;
    const key = istDayKey(s.atMs);
    if (key < windowStartKey || key > todayKey) continue;
    addToWindow(last7Days, s);
    if (key === todayKey) addToWindow(today, s);
    if (oldestRecordMs === null || s.atMs < oldestRecordMs) oldestRecordMs = s.atMs;
  }
  return { todayKey, windowStartKey, today, last7Days, oldestRecordMs };
}

function createAdminTelemetryRoutes(deps) {
  const { sendJson, firebaseAdmin, telemetry, getTokenTelemetry } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();

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
      // GRADER-CORE-1 PR-2 (owner-ordered alert, D20): grading calls served by the FALLBACK
      // model because the configured grading model was unavailable to this key. Any value
      // above zero means grading quality may have silently dropped — check GRADING_MODEL.
      gradingModelFallback: {
        count: Number(counters['grading.model_fallback']) || 0,
        note: 'Grading calls served by the fallback model because the configured grading model '
          + 'was unavailable (HTTP 403/404 or a model-specific 400). Non-zero = a possible silent '
          + 'quality drop; check the grading model\'s access for this key.',
      },
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
        // FU-GLOBAL-SHED: how much of the P = 0.25 margin paying students actually used, and how often the
        // site-wide ceiling refused anyone (busy_today). Read these before raising the monthly budget.
        globalOverflowPremium: toNumber(counters['rate_limit.global_overflow.premium']),
        hardBlockGlobal: toNumber(counters['rate_limit.hard_block.global']),
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
      // ★ UID-HEADER-CLOSE-1 — a uid header that arrived with no bearer token, now
      // DENIED. Until that lane it was served and counted with a failed token under
      // one name, so the two could not be told apart. The other entitlement counters
      // not listed here are [FU-ENTITLEMENT-COUNTERS-NO-READER].
      entitlement: {
        denyUidHeaderNoToken: toNumber(counters[DENY_UID_HEADER_NO_TOKEN]),
        // AUTHGATE-FIX-1: a bearer token that did not verify, refused 401.
        denyReauthRequired: toNumber(counters[DENY_REAUTH_REQUIRED]),
        // AUTHGATE-FIX-1: served without a check because this deploy could not verify
        // any token. Should read 0; anything else is a server configuration fault.
        failOpenVerifierUnavailable: toNumber(counters[FAIL_OPEN_VERIFIER_UNAVAILABLE]),
      },
      recentSampleSize,
    };
  }

  /* ── HARDEN-1 PR-2 · grader health (read-only) ─────────────────────────── */

  function graderHealthFirestore() {
    if (deps.adminFirestore) return deps.adminFirestore;
    try {
      return firebaseAdmin && typeof firebaseAdmin.firestore === 'function' ? firebaseAdmin.firestore() : null;
    } catch {
      return null;
    }
  }

  /**
   * The stored grade records of the window, read-only. Returns
   * { summaries, studentsScanned, studentsInWindow, studentsTruncated, recordsTruncated,
   *   readsFailed, authTruncated } — or null when Auth or Firestore is unavailable.
   */
  async function readGradeRecords(nowMs, windowStartKey) {
    const db = graderHealthFirestore();
    if (!db || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function') return null;
    const sinceMs = ghIstDayStartMs(windowStartKey);
    // A student who graded inside the window held an ID token refreshed within the hour
    // before that grade. An account with no refresh time on record is kept (never dropped).
    const refreshFloorMs = sinceMs - GH_HOUR_MS;

    const candidates = [];
    let pageToken;
    let pages = 0;
    do {
      const result = await firebaseAdmin.auth().listUsers(GH_AUTH_PAGE_SIZE, pageToken);
      for (const u of (result && result.users) || []) {
        const uid = u && typeof u.uid === 'string' ? u.uid : '';
        if (!uid) continue;
        const refreshed = Date.parse(String((u.metadata && u.metadata.lastRefreshTime) || ''));
        const refreshedMs = Number.isFinite(refreshed) ? refreshed : null;
        if (refreshedMs !== null && refreshedMs < refreshFloorMs) continue;
        candidates.push({ uid, refreshedMs });
      }
      pageToken = result && result.pageToken ? result.pageToken : undefined;
      pages += 1;
    } while (pageToken && pages < GH_MAX_AUTH_PAGES);
    candidates.sort((a, b) => (b.refreshedMs === null ? -Infinity : b.refreshedMs) - (a.refreshedMs === null ? -Infinity : a.refreshedMs));
    const scanned = candidates.slice(0, GH_MAX_STUDENTS);

    const summaries = [];
    let readsFailed = 0;
    let recordsTruncated = 0;
    await Promise.all(
      scanned.map(async ({ uid }) => {
        try {
          const snap = await db
            .collection(GRADING_RESULTS_COLLECTION)
            .doc(uid)
            .collection(GRADING_RESULTS_SEGMENTS.attempts)
            .where('completedAtMs', '>=', sinceMs)
            .orderBy('completedAtMs', 'desc')
            .limit(GH_PER_STUDENT_LIMIT)
            .get();
          const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
          if (docs.length >= GH_PER_STUDENT_LIMIT) recordsTruncated += 1;
          for (const d of docs) summaries.push(summariseGradeRecord(typeof d.data === 'function' ? d.data() : null));
        } catch {
          readsFailed += 1;
        }
      })
    );
    return {
      summaries,
      studentsInWindow: candidates.length,
      studentsScanned: scanned.length,
      studentsTruncated: candidates.length > scanned.length,
      recordsTruncated,
      readsFailed,
      authTruncated: Boolean(pageToken),
    };
  }

  /** The card's payload. Counts only; no student identity, no reply text. */
  async function buildGraderHealthPayload() {
    const nowMs = now();
    const counters =
      telemetry && typeof telemetry.snapshot === 'function' ? telemetry.snapshot() || {} : {};
    const todayKey = istDayKey(nowMs);
    const windowStartKey = ghAddIstDays(todayKey, -(GH_WINDOW_DAYS - 1));

    let read = null;
    try {
      read = await readGradeRecords(nowMs, windowStartKey);
    } catch {
      read = null;
    }
    let records;
    if (read === null) {
      records = { available: false };
    } else {
      const folded = foldGradeWindows(read.summaries, nowMs);
      records = {
        available: true,
        today: folded.today,
        last7Days: folded.last7Days,
        oldestRecordMs: folded.oldestRecordMs,
        studentsInWindow: read.studentsInWindow,
        studentsScanned: read.studentsScanned,
        studentsTruncated: read.studentsTruncated,
        studentsWithRecordsTruncated: read.recordsTruncated,
        perStudentLimit: GH_PER_STUDENT_LIMIT,
        readsFailed: read.readsFailed,
        authTruncated: read.authTruncated,
      };
    }

    return {
      ok: true,
      view: GRADER_HEALTH_VIEW,
      generatedAtMs: nowMs,
      timeZone: 'Asia/Kolkata',
      todayKey,
      windowStartKey,
      windowDays: GH_WINDOW_DAYS,
      models: {
        configured: modelLabelOf(resolveGradingModel().model),
        fallback: modelLabelOf(GRADING_FALLBACK_MODEL),
      },
      records,
      counters: {
        uptimeSeconds: Math.floor(process.uptime()),
        gradingModelFallback: toNumber(counters['grading.model_fallback']),
        signInRefreshDenials: toNumber(counters[DENY_REAUTH_REQUIRED]),
      },
    };
  }

  // GET /api/admin/token-telemetry  (and ?view=grader-health — HARDEN-1 PR-2)
  async function handleGetTokenTelemetry(req, res) {
    const auth = await requireFirebaseAdmin(req);
    if (!auth.ok) return sendJson(res, auth.status, { ok: false, error: auth.error });
    let view = '';
    try {
      view = new URL(String((req && req.url) || ''), 'http://local').searchParams.get('view') || '';
    } catch {
      view = '';
    }
    if (view === GRADER_HEALTH_VIEW) return sendJson(res, 200, await buildGraderHealthPayload());
    return sendJson(res, 200, buildTelemetryPayload());
  }

  return { handleGetTokenTelemetry, buildTelemetryPayload, buildGraderHealthPayload, requireFirebaseAdmin };
}

module.exports = {
  createAdminTelemetryRoutes,
  REPORTED_CALL_CLASSES,
  RATE_LIMIT_CLASSES,
  TOKEN_METRICS,
  RATE_LIMIT_METRICS,
  REPORTED_WORKLOAD_CLASSES,
  estimateCostUsd,
  GRADER_HEALTH_VIEW,
  NOT_COMPLETED_REASONS,
  summariseGradeRecord,
  foldGradeWindows,
};
