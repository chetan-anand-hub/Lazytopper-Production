/**
 * fairUse.cjs — FAIR-USE-1. Fair limits on GRADING, decided on the server.
 *
 * WHAT IT DECIDES
 * ---------------
 * Only the two grading endpoints (/api/check-solution, /api/grade-worksheet), only for
 * a VERIFIED uid, only for an EFFECTIVE tier of `trial` or `premium`:
 *
 *   U2 trial   — per IST day: 5 answer checks (quick-practice + check-improve, counted
 *                PER QUESTION) and 1 chapter test; per rolling 7 IST days: 1 full mock
 *                and 1 worksheet grading. A request needing more than remain -> 409
 *                { error: "trial_limit", remaining, resetAt } and NOTHING is graded.
 *   U3 premium — real cost from the METER-1 ledger: ₹84 per rolling 7 IST days, ₹38
 *                per IST day, ₹25 per rolling 5 IST hours. At a cap -> 429
 *                { error: "usage_limit", window, resetAt }. Checked BEFORE the model
 *                call, so one request may overrun a cap by its own cost, never more.
 *   U5         — GET /api/usage/me: remaining allowances and PERCENTAGES. Never rupees.
 *   U8         — refusals happen ONLY when env FAIR_USE_ENFORCE=1. Otherwise the
 *                request is served, the counters still move, and the would-be refusal
 *                is counted as `fair_use.would_refuse.<rule>`.
 *
 * Everything else — free callers, the free check, anonymous callers, header-only
 * uids, the entitlement deny paths, and grading itself — is untouched (U6): this
 * module either lets the request through unchanged or, when enforcing, answers it
 * before any route handler runs.
 *
 * ★ EVERY NUMBER COMES FROM THE ENVIRONMENT, never from the request. The request
 * contributes exactly three things: the surface header (untrusted, see resolveSurface),
 * a paper pass (X-Lazytopper-Paper, believed only when it VERIFIES — see below) and,
 * for /api/grade-worksheet, the question count the grader will grade.
 *
 * FAIR-USE-2 — SERVER-ISSUED PAPER PASSES (closes FU-FAIR-USE-SURFACE-UNVERIFIABLE)
 * ---------------------------------------------------------------------------------
 *   F1  POST /api/usage/paper { surface, paperKey } — for the VERIFIED uid, a paper
 *       surface only — returns a pass signed with HMAC-SHA256 over
 *       `uid|surface|paperKey|issuedAt` (env FAIR_USE_PAPER_SECRET; unset -> 503, and
 *       every paper grade falls back to per-question counting). For a TRIAL caller the
 *       mint is what spends the paper allowance; re-minting the same paperKey within
 *       24 h hands back the SAME pass and spends nothing. Premium / free check: no spend.
 *   F2  A grading request is a paper ONLY with a pass that verifies (timing-safe),
 *       was minted for this caller's uid and the surface it claims, is < 24 h old and,
 *       where the body is read, names the same paper (paperKey === worksheetId).
 *       Anything else is counted per question as check-improve. The bare surface
 *       header no longer buys a paper allowance; it stays telemetry.
 *   The idempotency record lives on the EXISTING ledger day document
 *   (usageLedger/{uid}/days/{istDayKey}, field `paperPasses`: { <sha256 id>: issuedAtMs })
 *   — numbers under a HASHED key, never the paper id itself, and no new location for
 *   DPDP erasure / export to miss.
 *
 * ★ FAILS OPEN. A tier that cannot be read, or a ledger that cannot be read, serves
 * the request (and is counted). A refusal needs a POSITIVE read — the same doctrine
 * as entitlement.cjs: a student who paid is never refused by an infrastructure blip.
 *
 * ★ THE TIER IS entitlement.cjs's, not a copy. The effective tier comes from
 * `createEntitlementGate(...).resolve` -> `deriveEffectiveTier` (STORED-RATE-1:
 * trial expiry, interrupted-trial repair, and pass expiry at `passEnd`). A SEPARATE,
 * silent gate instance is used so that reading the tier here never double-counts the
 * `entitlement.allow` / `entitlement.deny` counters the owner reads.
 */

const crypto = require('node:crypto');
const { istDayKey, nextIstMidnightIso } = require('./rateLimiter.cjs');
const {
  createUsageLedger,
  istHourKey,
  LEDGER_HOUR_FIELD,
  LEDGER_SEGMENTS,
  TRIAL_COUNTER_FIELDS,
  USAGE_LEDGER_COLLECTION,
} = require('./usageLedger.cjs');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** Rolling windows, in whole IST buckets: today + the 6 days before it; this hour + the 4 before it. */
const WEEK_DAYS = 7;
const FIVE_HOURS = 5;

/* ── Surfaces (U1) ─────────────────────────────────────────────────────────── */

const SURFACE_HEADER = 'x-lazytopper-surface';
const SURFACES = Object.freeze({
  QUICK_PRACTICE: 'quick-practice',
  CHECK_IMPROVE: 'check-improve',
  CHAPTER_TEST: 'chapter-test',
  FULL_MOCK: 'full-mock',
  WORKSHEET: 'worksheet',
});
/** Missing / unknown / not-believed surface -> this, counted per question. */
const FALLBACK_SURFACE = SURFACES.CHECK_IMPROVE;
const PER_QUESTION_SURFACES = new Set([SURFACES.QUICK_PRACTICE, SURFACES.CHECK_IMPROVE]);
const ALL_SURFACES = new Set(Object.values(SURFACES));

const PAPER_SURFACES = new Set([SURFACES.CHAPTER_TEST, SURFACES.FULL_MOCK, SURFACES.WORKSHEET]);

const CHECK_SOLUTION_PATH = '/api/check-solution';
const GRADE_WORKSHEET_PATH = '/api/grade-worksheet';
const USAGE_ME_PATH = '/api/usage/me';
/** FAIR-USE-2 (F1): the paper-pass mint. */
const USAGE_PAPER_PATH = '/api/usage/paper';

/* ── Paper passes (FAIR-USE-2) ─────────────────────────────────────────────── */

/** F2: the header a paper grade carries its pass in. */
const PAPER_HEADER = 'x-lazytopper-paper';
/** F1: the HMAC key. Unset -> no pass is ever minted or believed. */
const PAPER_SECRET_ENV = 'FAIR_USE_PAPER_SECRET';
const PAPER_PASS_VERSION = 'v1';
/** A pass is good for 24 h from issue; a re-mint inside that window is free. */
const PAPER_PASS_TTL_MS = 24 * 60 * 60 * 1000;
/** Tolerated server clock skew for an issuedAt slightly in the future (multi-instance). */
const PAPER_PASS_SKEW_MS = 5 * 60 * 1000;
const PAPER_KEY_MAX = 200;
const PAPER_TOKEN_MAX = 1024;
const PAPER_MINT_MAX_BYTES = 4 * 1024;
/** The ledger-day map holding { <paperPassId>: issuedAtMs } — the re-mint record. */
const PAPER_PASSES_FIELD = 'paperPasses';

/**
 * Which surfaces each grading endpoint can really serve. /api/check-solution grades
 * ONE question, so only a per-question surface is believed there — a paper-shaped
 * value on it falls back to check-improve instead of spending a weekly allowance.
 */
const SURFACES_BY_PATH = Object.freeze({
  [CHECK_SOLUTION_PATH]: PER_QUESTION_SURFACES,
  [GRADE_WORKSHEET_PATH]: ALL_SURFACES,
});

/** Mirrors handleGradeWorksheet's own body cap (checkSolution.cjs), so the pre-read refuses nothing the handler would accept. */
const GRADE_WORKSHEET_MAX_BYTES = 8 * 1024 * 1024;

/* ── Limits (every one env-tunable; the spec's numbers are the defaults) ───── */

const DEFAULT_LIMITS = Object.freeze({
  trialChecksPerDay: 5,
  trialChapterTestsPerDay: 1,
  trialMocksPerWeek: 1,
  trialWorksheetsPerWeek: 1,
  premiumWeekInr: 84,
  premiumDayInr: 38,
  premiumFiveHourInr: 25,
});

const LIMIT_ENV = Object.freeze({
  trialChecksPerDay: 'FAIR_USE_TRIAL_CHECKS_PER_DAY',
  trialChapterTestsPerDay: 'FAIR_USE_TRIAL_CHAPTER_TESTS_PER_DAY',
  trialMocksPerWeek: 'FAIR_USE_TRIAL_MOCKS_PER_WEEK',
  trialWorksheetsPerWeek: 'FAIR_USE_TRIAL_WORKSHEETS_PER_WEEK',
  premiumWeekInr: 'FAIR_USE_PREMIUM_WEEK_INR',
  premiumDayInr: 'FAIR_USE_PREMIUM_DAY_INR',
  premiumFiveHourInr: 'FAIR_USE_PREMIUM_FIVE_HOUR_INR',
});

const ENFORCE_ENV = 'FAIR_USE_ENFORCE';

function envPositive(env, name, fallback, integer) {
  const raw = env ? env[name] : undefined;
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return integer ? Math.floor(n) : n;
}

/** The limits in force, from `env` ONLY. Rupee caps are returned in micro-rupees (the ledger's unit). */
function resolveLimits(env) {
  const e = env || {};
  const inr = (key) => Math.round(envPositive(e, LIMIT_ENV[key], DEFAULT_LIMITS[key], false) * 1e6);
  const int = (key) => envPositive(e, LIMIT_ENV[key], DEFAULT_LIMITS[key], true);
  return {
    trial: {
      checksPerDay: int('trialChecksPerDay'),
      chapterTestsPerDay: int('trialChapterTestsPerDay'),
      mocksPerWeek: int('trialMocksPerWeek'),
      worksheetsPerWeek: int('trialWorksheetsPerWeek'),
    },
    premium: {
      weekMicroInr: inr('premiumWeekInr'),
      dayMicroInr: inr('premiumDayInr'),
      fiveHourMicroInr: inr('premiumFiveHourInr'),
    },
  };
}

/** U8: refusals only when FAIR_USE_ENFORCE is exactly "1". Anything else is dark. */
function isEnforced(env) {
  return String((env && env[ENFORCE_ENV]) || '').trim() === '1';
}

/* ── Paper-pass crypto (F1 / F2) ───────────────────────────────────────────── */

/** The pass secret from `env`, or '' (the dark / unconfigured state). */
function paperPassSecret(env) {
  return String((env && env[PAPER_SECRET_ENV]) || '').trim();
}

function toBase64Url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64 + '='.repeat((4 - (b64.length % 4)) % 4), 'base64');
}

/** F1: HMAC-SHA256 over `uid|surface|paperKey|issuedAt`, base64url. */
function signPaperPass(secret, uid, surface, paperKey, issuedAt) {
  return toBase64Url(
    crypto.createHmac('sha256', secret).update(`${uid}|${surface}|${paperKey}|${issuedAt}`).digest()
  );
}

/** The pass a client carries: `v1.<issuedAt>.<surface>.<base64url paperKey>.<sig>`. */
function encodePaperPass(secret, uid, surface, paperKey, issuedAt) {
  return [
    PAPER_PASS_VERSION,
    String(issuedAt),
    surface,
    toBase64Url(Buffer.from(paperKey, 'utf8')),
    signPaperPass(secret, uid, surface, paperKey, issuedAt),
  ].join('.');
}

/**
 * F2: the pass, if and only if it verifies for THIS uid and THIS claimed surface and is
 * under 24 h old. Returns { surface, paperKey, issuedAt } or null. NEVER THROWS — a
 * malformed pass is simply not a pass (per-question counting), never a 500.
 *
 * ★ The signature compare is crypto.timingSafeEqual, and nothing else. A `===` on the
 * signature would leak, byte by byte, how much of a forged signature is right.
 */
function verifyPaperPass(token, { uid, surface, nowMs, secret }) {
  try {
    if (!secret || typeof token !== 'string' || !uid) return null;
    const raw = token.trim();
    if (!raw || raw.length > PAPER_TOKEN_MAX) return null;
    const parts = raw.split('.');
    if (parts.length !== 5 || parts[0] !== PAPER_PASS_VERSION) return null;
    const [, issuedRaw, passSurface, keyB64, sig] = parts;
    if (!PAPER_SURFACES.has(passSurface) || passSurface !== surface) return null;
    if (!/^\d{1,16}$/.test(issuedRaw)) return null;
    const issuedAt = Number(issuedRaw);
    const age = nowMs - issuedAt;
    if (!(age >= -PAPER_PASS_SKEW_MS && age < PAPER_PASS_TTL_MS)) return null;
    if (!/^[A-Za-z0-9_-]+$/.test(keyB64) || !/^[A-Za-z0-9_-]+$/.test(sig)) return null;
    const paperKey = fromBase64Url(keyB64).toString('utf8');
    if (!paperKey || paperKey.length > PAPER_KEY_MAX) return null;
    const expected = Buffer.from(signPaperPass(secret, uid, passSurface, paperKey, issuedAt), 'utf8');
    const given = Buffer.from(sig, 'utf8');
    if (given.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(given, expected)) return null;
    return { surface: passSurface, paperKey, issuedAt };
  } catch {
    return null;
  }
}

/** The re-mint record key: a hash, so the ledger never holds the paper id itself. */
function paperPassId(surface, paperKey) {
  return crypto.createHash('sha256').update(`${surface}|${paperKey}`).digest('hex').slice(0, 32);
}

/** The issuedAt of this paper's pass if one was minted < 24 h ago (the latest), else null. */
function priorPaperPassIssuedAt(days, passId, nowMs) {
  let best = null;
  for (const data of days.values()) {
    const passes = data && data[PAPER_PASSES_FIELD] && typeof data[PAPER_PASSES_FIELD] === 'object'
      ? data[PAPER_PASSES_FIELD]
      : null;
    if (!passes) continue;
    const v = Number(passes[passId]);
    if (!Number.isFinite(v) || !Number.isInteger(v)) continue;
    const age = nowMs - v;
    if (age >= -PAPER_PASS_SKEW_MS && age < PAPER_PASS_TTL_MS && (best === null || v > best)) best = v;
  }
  return best;
}

/* ── Reading the request ───────────────────────────────────────────────────── */

/**
 * The surface this grading request is counted as.
 *
 * ★ THE HEADER IS UNTRUSTED INPUT. It can only choose among the surfaces the endpoint
 * really serves; anything else — missing, unknown, mis-cased junk, a paper surface on
 * the single-question endpoint — is `check-improve`, counted per question. And a
 * request carrying the C&I / Quick Practice worksheet id shape (`ci:` / `qp:`, minted
 * by those two surfaces only) is never believed to be a paper.
 *
 * ★★ FAIR-USE-2 (F2): a PAPER surface is believed ONLY when `pass` — a paper pass that
 * already VERIFIED for this uid (readPaperPass) — was minted for that same surface. A
 * header alone, however well-formed, is counted per question. This closed
 * [FU-FAIR-USE-SURFACE-UNVERIFIABLE]; `fair_use.surface.<surface>` still watches it.
 * Callers from before FAIR-USE-2 send the header and no pass: they are GRADED, as
 * check-improve (OR-LIVE: never a 4xx for a missing pass).
 */
function resolveSurface(req, reqPath, body, pass) {
  const allowed = SURFACES_BY_PATH[reqPath] || PER_QUESTION_SURFACES;
  const raw = String((req && req.headers && req.headers[SURFACE_HEADER]) || '').trim().toLowerCase();
  let surface = allowed.has(raw) ? raw : FALLBACK_SURFACE;
  if (!PER_QUESTION_SURFACES.has(surface) && !(pass && pass.surface === surface)) surface = FALLBACK_SURFACE;
  const worksheetId = body && typeof body === 'object' ? String(body.worksheetId || '').trim() : '';
  if (!PER_QUESTION_SURFACES.has(surface) && /^(ci|qp):/i.test(worksheetId)) surface = FALLBACK_SURFACE;
  return surface;
}

/**
 * How many questions this request asks the grader to grade.
 * /api/check-solution grades exactly one. /api/grade-worksheet grades every entry that
 * survives the handler's own filter (checkSolution.cjs handleGradeWorksheet:
 * `qNumber > 0 && questionText`) — mirrored here so the count is what gets graded.
 */
function countQuestions(reqPath, body) {
  if (reqPath === CHECK_SOLUTION_PATH) return 1;
  const list = body && typeof body === 'object' && Array.isArray(body.questions) ? body.questions : [];
  return list.filter((q) => (Number(q && q.qNumber) || 0) > 0 && String((q && q.questionText) || '').trim()).length;
}

/* ── The body, read once ───────────────────────────────────────────────────── */

/**
 * To count a batch's questions BEFORE the grader runs, the body is read here; the route
 * handler must then get the SAME parse instead of waiting on a stream that has already
 * ended. `cachedReadJson` wraps the routes' readJson: when a pre-read happened it hands
 * back that promise (resolved OR rejected — a bad body still earns the handler's own
 * 400, word for word); otherwise it is the original readJson, untouched.
 */
const BODY_KEY = Symbol('lazytopper.fairUse.body');

function cachedReadJson(readJsonImpl) {
  return function readJsonOnce(req, maxBytes) {
    if (req && req[BODY_KEY]) return req[BODY_KEY];
    return readJsonImpl(req, maxBytes);
  };
}

function defaultReadJson() {
  return require('./httpUtils.cjs').readJson;
}

/* ── IST buckets ───────────────────────────────────────────────────────────── */

function istBucketStartMs(ms, sizeMs) {
  return Math.floor((ms + IST_OFFSET_MS) / sizeMs) * sizeMs - IST_OFFSET_MS;
}

/** Today's IST day key and the six before it, oldest first. */
function windowDayKeys(nowMs) {
  const keys = [];
  for (let k = WEEK_DAYS - 1; k >= 0; k -= 1) keys.push(istDayKey(nowMs - k * DAY_MS));
  return keys;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Day buckets for a field, oldest first: { startMs, value }. */
function dayBuckets(days, nowMs, field) {
  const out = [];
  for (let k = WEEK_DAYS - 1; k >= 0; k -= 1) {
    const t = nowMs - k * DAY_MS;
    const data = days.get(istDayKey(t)) || {};
    out.push({ startMs: istBucketStartMs(t, DAY_MS), value: num(data[field]) });
  }
  return out;
}

/** The five IST hour buckets of cost, oldest first. The window may reach into yesterday's document. */
function hourBuckets(days, nowMs) {
  const out = [];
  for (let k = FIVE_HOURS - 1; k >= 0; k -= 1) {
    const t = nowMs - k * HOUR_MS;
    const data = days.get(istDayKey(t)) || {};
    const hours = data[LEDGER_HOUR_FIELD] && typeof data[LEDGER_HOUR_FIELD] === 'object' ? data[LEDGER_HOUR_FIELD] : {};
    out.push({ startMs: istBucketStartMs(t, HOUR_MS), value: num(hours[istHourKey(t)]) });
  }
  return out;
}

const sum = (buckets) => buckets.reduce((s, b) => s + b.value, 0);

/**
 * When a rolling window next frees room. At or over `limit`: the first instant the
 * total drops BELOW it, as the oldest buckets leave. Under it: when the oldest counted
 * use leaves. Nothing counted: null — there is nothing to reset, and inventing a time
 * would be a fake number.
 */
function rollingResetAt(buckets, limit, spanMs) {
  let total = sum(buckets);
  if (total <= 0) return null;
  const atLimit = total >= limit;
  for (const b of buckets) {
    if (b.value <= 0) continue;
    total -= b.value;
    if (!atLimit || total < limit) return new Date(b.startMs + spanMs).toISOString();
  }
  return null;
}

function pct(used, cap) {
  if (!(cap > 0)) return 0;
  return Math.min(100, Math.floor((used * 100) / cap));
}

/* ── State ─────────────────────────────────────────────────────────────────── */

function trialState(days, nowMs, limits) {
  const t = limits.trial;
  const today = days.get(istDayKey(nowMs)) || {};
  const checksUsed = num(today[TRIAL_COUNTER_FIELDS.checks]);
  const chapterTestsUsed = num(today[TRIAL_COUNTER_FIELDS.chapterTests]);
  const mocks = dayBuckets(days, nowMs, TRIAL_COUNTER_FIELDS.mocks);
  const worksheets = dayBuckets(days, nowMs, TRIAL_COUNTER_FIELDS.worksheets);
  const midnight = nextIstMidnightIso(nowMs);
  return {
    checksLeftToday: Math.max(0, t.checksPerDay - checksUsed),
    chapterTestsLeftToday: Math.max(0, t.chapterTestsPerDay - chapterTestsUsed),
    mocksLeft: Math.max(0, t.mocksPerWeek - sum(mocks)),
    worksheetsLeft: Math.max(0, t.worksheetsPerWeek - sum(worksheets)),
    resets: {
      checks: midnight,
      chapterTests: midnight,
      mocks: rollingResetAt(mocks, t.mocksPerWeek, WEEK_DAYS * DAY_MS),
      worksheets: rollingResetAt(worksheets, t.worksheetsPerWeek, WEEK_DAYS * DAY_MS),
    },
  };
}

function premiumState(days, nowMs, limits) {
  const p = limits.premium;
  const five = hourBuckets(days, nowMs);
  const week = dayBuckets(days, nowMs, 'costMicroInr');
  const dayUsed = num((days.get(istDayKey(nowMs)) || {}).costMicroInr);
  const fiveUsed = sum(five);
  const weekUsed = sum(week);
  const resets = {
    fiveHour: rollingResetAt(five, p.fiveHourMicroInr, FIVE_HOURS * HOUR_MS),
    day: nextIstMidnightIso(nowMs),
    week: rollingResetAt(week, p.weekMicroInr, WEEK_DAYS * DAY_MS),
  };
  // Longest window first: when more than one cap is reached, the one reported is the
  // one that actually decides when the student is served again.
  let atCap = null;
  if (weekUsed >= p.weekMicroInr) atCap = 'week';
  else if (dayUsed >= p.dayMicroInr) atCap = 'day';
  else if (fiveUsed >= p.fiveHourMicroInr) atCap = 'fiveHour';
  return {
    view: {
      fiveHourPct: pct(fiveUsed, p.fiveHourMicroInr),
      dayPct: pct(dayUsed, p.dayMicroInr),
      weekPct: pct(weekUsed, p.weekMicroInr),
      resets,
    },
    atCap,
  };
}

/** The trial counters one served grade adds: per QUESTION for a per-question surface, one paper otherwise. */
function trialCommitFor(surface, questionCount) {
  if (PER_QUESTION_SURFACES.has(surface)) return { checks: Math.max(0, Math.floor(questionCount) || 0) };
  if (surface === SURFACES.CHAPTER_TEST) return { chapterTests: 1 };
  if (surface === SURFACES.FULL_MOCK) return { mocks: 1 };
  if (surface === SURFACES.WORKSHEET) return { worksheets: 1 };
  return undefined;
}

const PREMIUM_RULE = Object.freeze({ fiveHour: 'premium_five_hour', day: 'premium_day', week: 'premium_week' });

/**
 * The pure decision. `days` is the ledger read (Map dayKey -> data); `limits` came from
 * the environment. Returns { allowed, rule?, status?, body?, commit? } where `commit`
 * is the trial counters to add once the grade is actually served (only ever reached for
 * a refusal when enforcement is dark and the request is served anyway).
 */
function decide({ tier, surface, questionCount, days, nowMs, limits }) {
  if (tier === 'trial') {
    const st = trialState(days, nowMs, limits);
    // A refusal still carries the use it WOULD have spent: while enforcement is dark
    // (U8) the request is served, and a served grade is counted like any other.
    const refuse = (rule, remaining, resetAt) => ({
      allowed: false,
      rule,
      status: 409,
      body: { error: 'trial_limit', remaining, resetAt },
      commit: trialCommitFor(surface, questionCount),
    });
    if (PER_QUESTION_SURFACES.has(surface)) {
      const need = Math.max(0, Math.floor(questionCount) || 0);
      if (need > st.checksLeftToday) return refuse('trial_checks', st.checksLeftToday, st.resets.checks);
      return { allowed: true, commit: { checks: need } };
    }
    if (surface === SURFACES.CHAPTER_TEST) {
      if (st.chapterTestsLeftToday < 1) return refuse('trial_chapter_test', 0, st.resets.chapterTests);
      return { allowed: true, commit: { chapterTests: 1 } };
    }
    if (surface === SURFACES.FULL_MOCK) {
      if (st.mocksLeft < 1) return refuse('trial_full_mock', 0, st.resets.mocks);
      return { allowed: true, commit: { mocks: 1 } };
    }
    if (surface === SURFACES.WORKSHEET) {
      if (st.worksheetsLeft < 1) return refuse('trial_worksheet', 0, st.resets.worksheets);
      return { allowed: true, commit: { worksheets: 1 } };
    }
    return { allowed: true };
  }
  if (tier === 'premium') {
    const ps = premiumState(days, nowMs, limits);
    if (ps.atCap) {
      return {
        allowed: false,
        rule: PREMIUM_RULE[ps.atCap],
        status: 429,
        body: { error: 'usage_limit', window: ps.atCap, resetAt: ps.view.resets[ps.atCap] },
      };
    }
    return { allowed: true };
  }
  return { allowed: true };
}

/* ── The gate ──────────────────────────────────────────────────────────────── */

const SILENT_LOGGER = Object.freeze({ warn() {}, info() {}, log() {}, error() {} });

/** firebase-admin's Firestore + FieldValue, or null — the same resolution usageLedger.cjs uses. */
function defaultResolveFirestore() {
  try {
    const admin = require('firebase-admin');
    if (!admin || !Array.isArray(admin.apps) || admin.apps.length === 0) return null;
    const FieldValue = admin.firestore && admin.firestore.FieldValue;
    if (!FieldValue || typeof FieldValue.increment !== 'function') return null;
    return { db: admin.firestore(), FieldValue };
  } catch {
    return null;
  }
}

/**
 * F1: write one mint to TODAY's ledger day document, in ONE merge: the re-mint record
 * `paperPasses.<id> = issuedAtMs` AND the trial paper counter it spends. One write, so
 * a mint can never be recorded as spent without its re-mint record (or the reverse).
 * Resolves true / false; never rejects.
 */
function createPaperPassRecorder(resolveFirestore) {
  return async function recordPaperPass(uid, { passId, issuedAtMs, counts }) {
    const fs = resolveFirestore();
    if (!fs || !fs.db || !fs.FieldValue) return false;
    const data = { [PAPER_PASSES_FIELD]: { [passId]: issuedAtMs } };
    for (const [key, field] of Object.entries(TRIAL_COUNTER_FIELDS)) {
      const n = Math.floor(Number(counts && counts[key]) || 0);
      if (n > 0) data[field] = fs.FieldValue.increment(n);
    }
    await fs.db
      .collection(USAGE_LEDGER_COLLECTION)
      .doc(uid)
      .collection(LEDGER_SEGMENTS.days)
      .doc(istDayKey(issuedAtMs))
      .set(data, { merge: true });
    return true;
  };
}

/**
 * @param deps.adminFirestore  firebase-admin Firestore (tier reads), or null.
 * @param deps.tierOf          (uid, req) => Promise<tier|null> — overrides the tier read (tests).
 * @param deps.ledger          { readDays, recordTrialUse } — defaults to METER-1's ledger.
 * @param deps.verifiedCaller  { resolveVerifiedUid(req) } — for GET /api/usage/me.
 * @param deps.readJson        the RAW readJson (httpUtils) used for the one pre-read.
 * @param deps.recordPaperPass (uid, { passId, issuedAtMs, counts }) => Promise<boolean> —
 *                             the F1 mint write; defaults to the ledger day document.
 * @param deps.sendJson, deps.telemetry, deps.now, deps.env
 */
function createFairUse(deps = {}) {
  const {
    adminFirestore = null,
    telemetry = null,
    sendJson = null,
    verifiedCaller = null,
    now = () => Date.now(),
    env = process.env,
  } = deps;
  const ledger = deps.ledger || createUsageLedger();
  const readJson = deps.readJson || defaultReadJson();
  const recordPaperPass = typeof deps.recordPaperPass === 'function'
    ? deps.recordPaperPass
    : createPaperPassRecorder(defaultResolveFirestore);

  let tierOf = deps.tierOf;
  if (typeof tierOf !== 'function') {
    // A SEPARATE, SILENT entitlement gate: same derivation, same positive cache
    // behaviour, but its reads never touch the owner's entitlement counters.
    const { createEntitlementGate } = require('./entitlement.cjs');
    const tiers = createEntitlementGate({ adminFirestore, telemetry: null, sendJson: null, logger: SILENT_LOGGER });
    tierOf = async (uid, req) => (await tiers.resolve(uid, req)).tier;
  }

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }

  async function tierFor(uid, req) {
    try {
      const tier = await tierOf(uid, req);
      return typeof tier === 'string' ? tier : null;
    } catch {
      return null;
    }
  }

  /** U4: is this VERIFIED caller premium? Asked by index.cjs only when the shed is about to fire. */
  async function isPremium(verifiedUid, req) {
    const uid = typeof verifiedUid === 'string' ? verifiedUid.trim() : '';
    if (!uid) return false;
    return (await tierFor(uid, req)) === 'premium';
  }

  /**
   * F2: the verified paper pass on this grading request, or null. Absent header -> null
   * silently (every per-question grade, and every pre-FAIR-USE-2 client). A header that
   * does not verify — wrong uid, wrong surface, expired, forged, malformed, secret unset,
   * or (where the body was read) a pass for a DIFFERENT paper — is counted, then ignored.
   */
  function readPaperPass(req, uid, body, nowMs) {
    const token = req && req.headers ? req.headers[PAPER_HEADER] : undefined;
    if (typeof token !== 'string' || !token.trim()) return null;
    const claimed = String((req.headers && req.headers[SURFACE_HEADER]) || '').trim().toLowerCase();
    const pass = verifyPaperPass(token, { uid, surface: claimed, nowMs, secret: paperPassSecret(env) });
    const worksheetId = body && typeof body === 'object' ? String(body.worksheetId || '').trim() : null;
    if (!pass || (worksheetId !== null && pass.paperKey !== worksheetId)) {
      emit('fair_use.paper_pass.rejected');
      return null;
    }
    emit('fair_use.paper_pass.accepted');
    return pass;
  }

  /**
   * The route-boundary check for the two grading endpoints. Call once per POST, after
   * entitlement. Returns true only when it has already answered (enforced refusal).
   */
  async function applyToRequest(req, res, reqPath, verifiedUid, options) {
    if (!Object.prototype.hasOwnProperty.call(SURFACES_BY_PATH, reqPath)) return false;
    if (options && options.freeCheck === true) return false;
    const uid = typeof verifiedUid === 'string' ? verifiedUid.trim() : '';
    if (!uid) return false;

    const tier = await tierFor(uid, req);
    if (tier !== 'trial' && tier !== 'premium') {
      if (tier === null) emit('fair_use.tier_unknown');
      return false;
    }

    let body = null;
    if (tier === 'trial' && reqPath === GRADE_WORKSHEET_PATH) {
      const pending = readJson(req, GRADE_WORKSHEET_MAX_BYTES);
      pending.catch(() => {});
      req[BODY_KEY] = pending;
      try {
        body = await pending;
      } catch {
        // The handler answers its own 400 from the same rejected read. Nothing is graded,
        // so nothing is counted.
        return false;
      }
    }

    const nowMs = now();
    const pass = readPaperPass(req, uid, body, nowMs);
    const surface = resolveSurface(req, reqPath, body, pass);
    emit(`fair_use.surface.${surface}`);

    // F1/F2: a TRIAL paper with a verified pass was already paid for when the pass was
    // minted. Grading it (or re-grading it inside the pass's 24 h) spends nothing more.
    if (tier === 'trial' && PAPER_SURFACES.has(surface)) return false;

    let days;
    try {
      days = await ledger.readDays(uid, windowDayKeys(nowMs));
    } catch {
      emit('fair_use.ledger_unreadable');
      days = null;
    }

    let decision;
    if (days) {
      decision = decide({
        tier,
        surface,
        questionCount: countQuestions(reqPath, body),
        days,
        nowMs,
        limits: resolveLimits(env),
      });
    } else {
      // Fail OPEN: an unreadable ledger is not a positive read of a spent allowance.
      // The trial use is still recorded, so the count stays honest once reads recover.
      decision = { allowed: true, commit: tier === 'trial' ? trialCommitFor(surface, countQuestions(reqPath, body)) : undefined };
    }

    if (!decision.allowed) {
      if (isEnforced(env)) {
        emit(`fair_use.refused.${decision.rule}`);
        if (typeof sendJson === 'function') sendJson(res, decision.status, decision.body);
        return true;
      }
      emit(`fair_use.would_refuse.${decision.rule}`);
    }

    if (decision.commit && res && typeof res.once === 'function') {
      const commit = decision.commit;
      // Counted only once the grade was actually SERVED (2xx). A request that failed,
      // or was refused further down, costs the student nothing.
      res.once('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) ledger.recordTrialUse(uid, commit);
      });
    }
    return false;
  }

  /** U5: GET /api/usage/me — the VERIFIED caller's own allowances. Percentages only, never rupees. */
  async function handleUsageMe(req, res) {
    const uid = await verifiedUidOf(req);
    if (!uid) return sendJson(res, 401, { error: 'sign_in_required' });

    // F5: whether limits are actually refused right now — additive, so the UI stays
    // dark exactly as long as the server does.
    const enforced = isEnforced(env);
    const tier = await tierFor(uid, req);
    if (tier === null) return sendJson(res, 503, { error: 'usage_unavailable' });
    if (tier !== 'trial' && tier !== 'premium') return sendJson(res, 200, { tier, trial: null, premium: null, enforced });

    const nowMs = now();
    let days;
    try {
      days = await ledger.readDays(uid, windowDayKeys(nowMs));
    } catch {
      emit('fair_use.ledger_unreadable');
      return sendJson(res, 503, { error: 'usage_unavailable' });
    }
    const limits = resolveLimits(env);
    return sendJson(res, 200, {
      tier,
      trial: tier === 'trial' ? trialState(days, nowMs, limits) : null,
      premium: tier === 'premium' ? premiumState(days, nowMs, limits).view : null,
      enforced,
    });
  }

  async function verifiedUidOf(req) {
    return verifiedCaller && typeof verifiedCaller.resolveVerifiedUid === 'function'
      ? String((await verifiedCaller.resolveVerifiedUid(req)) || '').trim()
      : '';
  }

  /**
   * F1: POST /api/usage/paper { surface, paperKey } — mint (or re-issue) the VERIFIED
   * caller's pass for one paper.
   *
   *   secret unset            -> 503 paper_pass_unavailable (the client grades without
   *                              a pass: per-question counting, and dark refuses nothing)
   *   no verified uid         -> 401 sign_in_required (never a header uid)
   *   not a paper surface / bad paperKey / bad body -> 400 invalid_paper_pass_request
   *   TRIAL, same paperKey minted < 24 h ago -> that SAME pass again; nothing spent
   *   TRIAL, allowance left   -> pass; the paper allowance is spent NOW (one write)
   *   TRIAL, allowance spent  -> FAIR_USE_ENFORCE=1: 409 trial_limit, nothing written;
   *                              otherwise served + `fair_use.would_refuse.<rule>`, and
   *                              the honest count still moves (U8)
   *   premium / free / unknown tier -> pass; nothing spent (premium is metered by cost)
   *   ledger unreadable       -> FAIL OPEN: pass, and the spend is still recorded
   */
  async function handlePaperPass(req, res) {
    const secret = paperPassSecret(env);
    if (!secret) {
      emit('fair_use.paper_pass.unavailable');
      return sendJson(res, 503, { error: 'paper_pass_unavailable' });
    }
    const uid = await verifiedUidOf(req);
    if (!uid) return sendJson(res, 401, { error: 'sign_in_required' });

    let body;
    try {
      body = await readJson(req, PAPER_MINT_MAX_BYTES);
    } catch {
      return sendJson(res, 400, { error: 'invalid_paper_pass_request' });
    }
    const surface = body && typeof body === 'object' && typeof body.surface === 'string'
      ? body.surface.trim().toLowerCase()
      : '';
    const paperKey = body && typeof body === 'object' && typeof body.paperKey === 'string'
      ? body.paperKey.trim()
      : '';
    if (!PAPER_SURFACES.has(surface) || !paperKey || paperKey.length > PAPER_KEY_MAX) {
      return sendJson(res, 400, { error: 'invalid_paper_pass_request' });
    }

    const nowMs = now();
    const issue = (issuedAt, reused) => sendJson(res, 200, {
      token: encodePaperPass(secret, uid, surface, paperKey, issuedAt),
      surface,
      issuedAt: new Date(issuedAt).toISOString(),
      expiresAt: new Date(issuedAt + PAPER_PASS_TTL_MS).toISOString(),
      reused,
    });

    const tier = await tierFor(uid, req);
    if (tier !== 'trial') {
      emit('fair_use.paper_pass.minted');
      return issue(nowMs, false);
    }

    const passId = paperPassId(surface, paperKey);
    let days = null;
    try {
      days = await ledger.readDays(uid, windowDayKeys(nowMs));
    } catch {
      emit('fair_use.ledger_unreadable');
    }
    if (days) {
      const prior = priorPaperPassIssuedAt(days, passId, nowMs);
      if (prior !== null) {
        emit('fair_use.paper_pass.reused');
        return issue(prior, true);
      }
      const decision = decide({ tier, surface, questionCount: 0, days, nowMs, limits: resolveLimits(env) });
      if (!decision.allowed) {
        if (isEnforced(env)) {
          emit(`fair_use.refused.${decision.rule}`);
          return sendJson(res, decision.status, decision.body);
        }
        emit(`fair_use.would_refuse.${decision.rule}`);
      }
    }

    let recorded = false;
    try {
      recorded = await recordPaperPass(uid, { passId, issuedAtMs: nowMs, counts: trialCommitFor(surface, 0) });
    } catch {
      recorded = false;
    }
    if (!recorded) emit('fair_use.paper_pass.record_failed');
    emit('fair_use.paper_pass.minted');
    return issue(nowMs, false);
  }

  return { applyToRequest, handleUsageMe, handlePaperPass, isPremium };
}

module.exports = {
  createFairUse,
  cachedReadJson,
  decide,
  resolveSurface,
  verifyPaperPass,
  encodePaperPass,
  signPaperPass,
  paperPassId,
  countQuestions,
  resolveLimits,
  isEnforced,
  trialState,
  premiumState,
  windowDayKeys,
  SURFACES,
  SURFACE_HEADER,
  FALLBACK_SURFACE,
  DEFAULT_LIMITS,
  LIMIT_ENV,
  ENFORCE_ENV,
  CHECK_SOLUTION_PATH,
  GRADE_WORKSHEET_PATH,
  GRADE_WORKSHEET_MAX_BYTES,
  USAGE_ME_PATH,
  USAGE_PAPER_PATH,
  PAPER_HEADER,
  PAPER_SECRET_ENV,
  PAPER_PASS_TTL_MS,
  PAPER_PASSES_FIELD,
};
