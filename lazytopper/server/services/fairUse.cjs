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
 *   (usageLedger/{uid}/days/{istDayKey}, field `paperPasses`, keyed by a HASHED id, never
 *   the paper id itself) — no new location for DPDP erasure / export to miss.
 *
 * FAIR-USE-3 — LAZY REFUND, ONE-TRANSACTION MINT, LIMITS FROM THE SERVER
 * ----------------------------------------------------------------------
 *   R1  A minted pass counts against its paper allowance ONLY while it is < 24 h old, or
 *       once a grade has landed on it. No refund job: an ungraded pass simply stops
 *       counting at issuedAt + 24 h. The allowance is COMPUTED FROM THE MAP, never from a
 *       counter bumped at mint. A mint now writes
 *           paperPasses.<id> = { issuedAtMs, surface }
 *       and the first 2xx grade that carries the verified pass adds `gradedAtMs` to it.
 *       ★ OLD DOCS KEEP WORKING: a legacy entry is a plain issuedAtMs NUMBER, and its
 *       mint bumped trialChapterTests / trialMocks / trialWorksheets at the time. Those
 *       counters are still read exactly as before (so a legacy spend still counts, as it
 *       did), and a legacy number is never counted from the map as well (no double count)
 *       and never rewritten by the graded mark.
 *   R2  The mint reads the window and writes today's entry in ONE Firestore transaction,
 *       so two tabs minting at once spend once (FU-FAIR-USE-MINT-RACE).
 *   R3  GET /api/usage/me carries trial.limits { checksPerDay, chapterTestsPerDay,
 *       mocksPerWeek, worksheetsPerWeek } — the env-resolved numbers, so the client's
 *       limit copy never hard-codes one.
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
/**
 * The ledger-day map of minted passes — the re-mint record AND (FAIR-USE-3 R1) the paper
 * allowance itself. An entry is `{ issuedAtMs, surface, gradedAtMs? }`, or, written before
 * FAIR-USE-3, a plain issuedAtMs number (a LEGACY entry — see readPassEntry).
 */
const PAPER_PASSES_FIELD = 'paperPasses';

/** The trial counter a legacy (pre-FAIR-USE-3) mint of each paper surface bumped. */
const PAPER_COUNTER_BY_SURFACE = Object.freeze({
  [SURFACES.CHAPTER_TEST]: TRIAL_COUNTER_FIELDS.chapterTests,
  [SURFACES.FULL_MOCK]: TRIAL_COUNTER_FIELDS.mocks,
  [SURFACES.WORKSHEET]: TRIAL_COUNTER_FIELDS.worksheets,
});

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

/**
 * One `paperPasses` entry, either shape, or null when it is not a usable entry.
 *   legacy (pre-FAIR-USE-3): a plain issuedAtMs number -> { legacy: true, issuedAtMs }
 *     Its spend lives in the trial counter its mint bumped; the map never counts it.
 *   current: { issuedAtMs, surface, gradedAtMs? } -> { legacy: false, issuedAtMs,
 *     surface (a paper surface, or null), gradedAtMs (a number, or null) }
 */
function readPassEntry(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isInteger(value) ? { legacy: true, issuedAtMs: value, surface: null, gradedAtMs: null } : null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const issuedAtMs = Number(value.issuedAtMs);
  if (!Number.isFinite(issuedAtMs) || !Number.isInteger(issuedAtMs)) return null;
  const graded = value.gradedAtMs === undefined || value.gradedAtMs === null ? NaN : Number(value.gradedAtMs);
  return {
    legacy: false,
    issuedAtMs,
    surface: PAPER_SURFACES.has(value.surface) ? value.surface : null,
    gradedAtMs: Number.isFinite(graded) ? graded : null,
  };
}

function passesOf(data) {
  const passes = data && data[PAPER_PASSES_FIELD];
  return passes && typeof passes === 'object' && !Array.isArray(passes) ? passes : null;
}

/**
 * R1 — does this (current-shape) pass still count against its allowance? Only if a grade
 * landed on it, or it is < 24 h old. A legacy entry is never counted HERE (its counter is).
 *
 * MUTATION FU3-MUT-1 target ("count ungraded passes forever" -> the R1 tests go RED).
 */
function passCounts(entry, nowMs) {
  if (!entry || entry.legacy) return false;
  if (entry.gradedAtMs !== null) return true;
  return nowMs - entry.issuedAtMs < PAPER_PASS_TTL_MS;
}

/** The issuedAt of this paper's pass if one was minted < 24 h ago (the latest), else null. Either entry shape. */
function priorPaperPassIssuedAt(days, passId, nowMs) {
  let best = null;
  for (const data of days.values()) {
    const passes = passesOf(data);
    if (!passes) continue;
    const entry = readPassEntry(passes[passId]);
    if (!entry) continue;
    const v = entry.issuedAtMs;
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

/**
 * R1 — every use of one PAPER allowance still counting inside the last `spanDays` IST
 * days, as { n, expiresMs }: when that use stops counting.
 *   - a legacy counter on a day document (pre-FAIR-USE-3 mint, or FAIR-USE-1 grade):
 *     counts until its day leaves the window — exactly as before;
 *   - a GRADED pass: the same;
 *   - an UNGRADED pass < 24 h old: until issuedAt + 24 h (or the window edge, if sooner);
 *   - an ungraded pass >= 24 h old, or a legacy map number: nothing.
 */
function paperUses(days, nowMs, surface, spanDays) {
  const field = PAPER_COUNTER_BY_SURFACE[surface];
  const uses = [];
  for (let k = spanDays - 1; k >= 0; k -= 1) {
    const t = nowMs - k * DAY_MS;
    const data = days.get(istDayKey(t)) || {};
    const leavesWindowMs = istBucketStartMs(t, DAY_MS) + spanDays * DAY_MS;
    const legacy = num(data[field]);
    if (legacy > 0) uses.push({ n: legacy, expiresMs: leavesWindowMs });
    const passes = passesOf(data);
    if (!passes) continue;
    for (const value of Object.values(passes)) {
      const entry = readPassEntry(value);
      if (!entry || entry.legacy || entry.surface !== surface || !passCounts(entry, nowMs)) continue;
      const expiresMs = entry.gradedAtMs !== null
        ? leavesWindowMs
        : Math.min(leavesWindowMs, entry.issuedAtMs + PAPER_PASS_TTL_MS);
      uses.push({ n: 1, expiresMs });
    }
  }
  return uses;
}

/** When a rolling paper allowance next frees room — rollingResetAt's rule, over uses ordered by when each stops counting. */
function paperResetAt(uses, limit) {
  const ordered = [...uses].sort((a, b) => a.expiresMs - b.expiresMs);
  let total = ordered.reduce((s, u) => s + u.n, 0);
  if (total <= 0) return null;
  const atLimit = total >= limit;
  for (const u of ordered) {
    total -= u.n;
    if (!atLimit || total < limit) return new Date(u.expiresMs).toISOString();
  }
  return null;
}

function trialState(days, nowMs, limits) {
  const t = limits.trial;
  const today = days.get(istDayKey(nowMs)) || {};
  const checksUsed = num(today[TRIAL_COUNTER_FIELDS.checks]);
  const chapterTests = paperUses(days, nowMs, SURFACES.CHAPTER_TEST, 1);
  const mocks = paperUses(days, nowMs, SURFACES.FULL_MOCK, WEEK_DAYS);
  const worksheets = paperUses(days, nowMs, SURFACES.WORKSHEET, WEEK_DAYS);
  const used = (uses) => uses.reduce((s, u) => s + u.n, 0);
  const midnight = nextIstMidnightIso(nowMs);
  return {
    checksLeftToday: Math.max(0, t.checksPerDay - checksUsed),
    chapterTestsLeftToday: Math.max(0, t.chapterTestsPerDay - used(chapterTests)),
    mocksLeft: Math.max(0, t.mocksPerWeek - used(mocks)),
    worksheetsLeft: Math.max(0, t.worksheetsPerWeek - used(worksheets)),
    resets: {
      checks: midnight,
      chapterTests: midnight,
      mocks: paperResetAt(mocks, t.mocksPerWeek),
      worksheets: paperResetAt(worksheets, t.worksheetsPerWeek),
    },
    // R3: the limits in force, from env — so no client copy ever hard-codes a number.
    limits: {
      checksPerDay: t.checksPerDay,
      chapterTestsPerDay: t.chapterTestsPerDay,
      mocksPerWeek: t.mocksPerWeek,
      worksheetsPerWeek: t.worksheetsPerWeek,
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

/** usageLedger/{uid}/days/{dayKey} — the SAME document METER-1 and FAIR-USE-1 write. */
function ledgerDayRef(db, uid, dayKey) {
  return db.collection(USAGE_LEDGER_COLLECTION).doc(uid).collection(LEDGER_SEGMENTS.days).doc(dayKey);
}

/** A snapshot's data, {} for a missing document. THROWS on something that is not a snapshot (-> fail open). */
function snapshotData(snap) {
  if (!snap || typeof snap.exists === 'undefined') throw new Error('fairUse: no snapshot');
  const data = snap.exists && typeof snap.data === 'function' ? snap.data() : null;
  return data && typeof data === 'object' ? data : {};
}

/**
 * @param deps.adminFirestore   firebase-admin Firestore (tier reads), or null.
 * @param deps.tierOf           (uid, req) => Promise<tier|null> — overrides the tier read (tests).
 * @param deps.ledger           { readDays, recordTrialUse } — defaults to METER-1's ledger.
 * @param deps.verifiedCaller   { resolveVerifiedUid(req) } — for GET /api/usage/me.
 * @param deps.readJson         the RAW readJson (httpUtils) used for the one pre-read.
 * @param deps.resolveFirestore () => ({ db } | null) — the ledger Firestore the F1 mint
 *                              transaction (R2) and the R1 graded mark run on; defaults to
 *                              firebase-admin, the same resolution usageLedger.cjs uses.
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
  const resolveFirestore = typeof deps.resolveFirestore === 'function' ? deps.resolveFirestore : defaultResolveFirestore;

  function ledgerDb() {
    try {
      const fs = resolveFirestore();
      return fs && fs.db ? fs.db : null;
    } catch {
      return null;
    }
  }

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

    // F1/F2: a TRIAL paper with a verified pass was already counted when the pass was
    // minted. Grading it (or re-grading it inside the pass's 24 h) spends nothing more.
    // FAIR-USE-3 R1 (P7): this is where a grade lands ON a pass — the first 2xx marks the
    // pass graded, so it keeps counting after its 24 h instead of lapsing.
    if (tier === 'trial' && PAPER_SURFACES.has(surface)) {
      if (res && typeof res.once === 'function') {
        res.once('finish', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) void markPaperGraded(uid, pass);
        });
      }
      return false;
    }

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
   *   TRIAL, allowance left   -> pass; today's `paperPasses` entry is written, which
   *                              counts for 24 h, and for good once graded (R1)
   *   TRIAL, allowance spent  -> FAIR_USE_ENFORCE=1: 409 trial_limit, nothing written;
   *                              otherwise served + `fair_use.would_refuse.<rule>`, and
   *                              the honest count still moves (U8)
   *   (R2: the read, the decision and the write are ONE Firestore transaction)
   *   premium / free / unknown tier -> pass; nothing spent (premium is metered by cost)
   *   ledger / transaction error -> FAIL OPEN: pass, and the spend is still recorded
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
    const enforced = isEnforced(env);
    const limits = resolveLimits(env);
    const entry = { issuedAtMs: nowMs, surface };
    const db = ledgerDb();

    /**
     * R2 — the whole mint decision, run INSIDE one transaction: read the window, then
     * reuse / refuse / write today's entry. Pure apart from `tx`, so a transaction retry
     * re-runs it cleanly; telemetry is emitted once, after it settles.
     */
    async function mintBody(tx) {
      const refs = windowDayKeys(nowMs).map((key) => ledgerDayRef(db, uid, key));
      const snaps = typeof tx.getAll === 'function' ? await tx.getAll(...refs) : await Promise.all(refs.map((r) => tx.get(r)));
      const days = new Map();
      windowDayKeys(nowMs).forEach((key, i) => days.set(key, snapshotData(snaps[i])));
      const prior = priorPaperPassIssuedAt(days, passId, nowMs);
      if (prior !== null) return { kind: 'reused', issuedAt: prior };
      const decision = decide({ tier, surface, questionCount: 0, days, nowMs, limits });
      if (!decision.allowed && enforced) return { kind: 'refused', decision };
      tx.set(ledgerDayRef(db, uid, istDayKey(nowMs)), { [PAPER_PASSES_FIELD]: { [passId]: entry } }, { merge: true });
      return { kind: 'minted', wouldRefuse: decision.allowed ? null : decision.rule };
    }

    let outcome = null;
    if (db && typeof db.runTransaction === 'function') {
      try {
        // MUTATION FU3-MUT-2 target ("mint without the transaction" -> the race tests go RED).
        outcome = await db.runTransaction((tx) => mintBody(tx));
      } catch {
        outcome = null;
      }
    }

    if (outcome && outcome.kind === 'reused') {
      emit('fair_use.paper_pass.reused');
      return issue(outcome.issuedAt, true);
    }
    if (outcome && outcome.kind === 'refused') {
      emit(`fair_use.refused.${outcome.decision.rule}`);
      return sendJson(res, outcome.decision.status, outcome.decision.body);
    }
    if (outcome) {
      if (outcome.wouldRefuse) emit(`fair_use.would_refuse.${outcome.wouldRefuse}`);
      emit('fair_use.paper_pass.minted');
      return issue(nowMs, false);
    }

    // FAIL OPEN — exactly today's (FAIR-USE-2) behaviour on a Firestore error: the ledger
    // could not be read, so nothing is refused; the pass is issued and the spend is still
    // recorded (one plain merge, outside any transaction). A write that fails too is
    // counted, and the pass is STILL issued — the graded mark records it if it is graded.
    emit('fair_use.ledger_unreadable');
    let recorded = false;
    try {
      if (db) {
        await ledgerDayRef(db, uid, istDayKey(nowMs)).set({ [PAPER_PASSES_FIELD]: { [passId]: entry } }, { merge: true });
        recorded = true;
      }
    } catch {
      recorded = false;
    }
    if (!recorded) emit('fair_use.paper_pass.record_failed');
    emit('fair_use.paper_pass.minted');
    return issue(nowMs, false);
  }

  /**
   * R1 (P7) — a 2xx grade landed on this VERIFIED trial pass: mark it graded, so it keeps
   * counting after its 24 h. One transaction on the pass's own day document:
   *   current entry, not yet graded -> gradedAtMs added (issuedAtMs / surface kept)
   *   already graded                 -> nothing (the FIRST grade is the one recorded)
   *   legacy number                  -> nothing: its mint bumped the counter, which still
   *                                     counts it; rewriting it would count it twice
   *   no entry (its mint's record failed) -> the whole entry, graded: a graded paper counts
   * Fire-and-forget from the response's `finish`: never awaited by a request, never rejects.
   */
  async function markPaperGraded(uid, pass) {
    try {
      const db = ledgerDb();
      if (!db || typeof db.runTransaction !== 'function' || !pass) throw new Error('fairUse: ledger unavailable');
      const passId = paperPassId(pass.surface, pass.paperKey);
      const ref = ledgerDayRef(db, uid, istDayKey(pass.issuedAt));
      const gradedAtMs = now();
      const result = await db.runTransaction(async (tx) => {
        const data = snapshotData(await tx.get(ref));
        const passes = passesOf(data);
        const entry = readPassEntry(passes ? passes[passId] : undefined);
        if (entry && entry.legacy) return 'legacy';
        if (entry && entry.gradedAtMs !== null) return 'already';
        const issuedAtMs = entry ? entry.issuedAtMs : pass.issuedAt;
        tx.set(ref, { [PAPER_PASSES_FIELD]: { [passId]: { issuedAtMs, surface: pass.surface, gradedAtMs } } }, { merge: true });
        return 'graded';
      });
      emit(`fair_use.paper_pass.graded_${result}`);
      return result;
    } catch {
      emit('fair_use.paper_pass.graded_record_failed');
      return null;
    }
  }

  return { applyToRequest, handleUsageMe, handlePaperPass, isPremium, markPaperGraded };
}

/* ══════════════════════════════════════════════════════════════════════════
   LOW-END-1 R4 · IDEMPOTENT GRADING — a retried check is never graded or charged twice
   ══════════════════════════════════════════════════════════════════════════

   The client (src/ai/gradingTransport.ts) sends ONE `Idempotency-Key` per check attempt
   and the SAME key on every retry of it. For a VERIFIED uid on a grading endpoint:

     · same uid + same endpoint + same key within 24 h, result stored -> the stored
       status and body are returned, byte-for-byte. Nothing is graded, and nothing is
       charged: the replay is answered BEFORE the limiter, entitlement and fair use, so
       no allowance, cap or ledger hook ever sees it.
     · IN FLIGHT (the lost-reply case: the client gave up at 90 s and retried while the
       first attempt is still grading) -> a transactional PENDING marker. Exactly one
       request can create it (runTransaction re-runs on a concurrent write), so exactly
       one grades. A duplicate that finds it waits, re-reading every second, up to 75 s
       (inside the client's 90 s), and returns the first result the moment it is stored.
       Still grading at 75 s -> 503 `grading_in_progress`, which the client retries with
       the same key. A marker older than 5 min is a dead attempt and may be re-claimed.
     · STORED ONLY WHEN THE GRADE WAS SERVED: a 2xx — exactly the condition fair use
       charges on (applyToRequest's `finish` hooks), so "charged" and "stored" can never
       disagree. Any other status (a refusal, a 4xx, a 500, a 503) releases the marker:
       not stored, not charged, and a retry grades afresh. The body is captured when the
       handler calls res.end(), so a reply the network then loses is still stored.
     · No key, a malformed key, no verified uid (the free check, anonymous callers), a
       non-grading path or no Firestore -> null: the request runs EXACTLY as before.
       A Firestore error fails OPEN to that same path (no worse than before this lane).

   WHERE: gradingResults/{uid}/attempts/{sha256(path|key)} — uid-scoped, so DPDP erasure
   and export reach it (mapped in src/services/studentDataMap.ts). Each record carries
   `expiresAtMs` (checked by the read path ITSELF) and `expiresAt` (a Date, for a Firestore
   TTL policy to delete the document; enabling that policy is a platform action, not code).
*/

/** R3: the request header (Node lower-cases header names). */
const IDEMPOTENCY_HEADER = 'idempotency-key';
/** A UUID, or any similar opaque token: 16-64 of [A-Za-z0-9-]. Anything else is ignored. */
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9-]{16,64}$/;
const GRADING_RESULTS_COLLECTION = 'gradingResults';
const GRADING_RESULTS_SEGMENTS = Object.freeze({ attempts: 'attempts' });
const IDEMPOTENT_PATHS = new Set([CHECK_SOLUTION_PATH, GRADE_WORKSHEET_PATH]);
/** R4: a stored result is returned for 24 h from the first attempt. */
const IDEMPOTENCY_TTL_MS = 24 * HOUR_MS;
/** A pending marker older than this belongs to an attempt that died; it may be re-claimed. */
const IDEMPOTENCY_PENDING_STALE_MS = 5 * 60 * 1000;
/** How long a duplicate waits for the first attempt — under the client's 90 s timeout. */
const IDEMPOTENCY_WAIT_MS = 75 * 1000;
const IDEMPOTENCY_POLL_MS = 1000;
/** Firestore's document cap is 1 MiB; a larger body is served but not stored. */
const IDEMPOTENCY_MAX_BODY_BYTES = 900 * 1024;
/** The 503 a duplicate gets when the first attempt is still grading at the end of its wait. */
const GRADING_IN_PROGRESS_BODY = Object.freeze({
  ok: false,
  code: 'grading_in_progress',
  error: 'Your answer is still being graded. Please wait a moment and try again.',
});

/** The idempotency key on this request: a valid string, null (absent) or false (malformed). */
function idempotencyKeyOf(req) {
  const raw = req && req.headers ? req.headers[IDEMPOTENCY_HEADER] : undefined;
  if (raw === undefined || raw === null) return null;
  const key = String(Array.isArray(raw) ? raw[0] : raw).trim();
  if (!key) return null;
  return IDEMPOTENCY_KEY_RE.test(key) ? key : false;
}

/** The document id: the key never sits in a path as itself, and the endpoint is part of it. */
function idempotencyAttemptId(reqPath, key) {
  return crypto.createHash('sha256').update(`${reqPath}|${key}`).digest('hex').slice(0, 40);
}

/**
 * What a stored record means at `nowMs`:
 *   'done'    — a live stored result (replay it)
 *   'pending' — a live, fresh marker (another attempt is grading: wait)
 *   'free'    — absent, expired, stale or malformed (this request may claim it)
 * ★ The expiry is checked HERE, on every read — never left to a TTL policy firing.
 */
function classifyIdempotencyRecord(data, nowMs, staleMs = IDEMPOTENCY_PENDING_STALE_MS) {
  if (!data || typeof data !== 'object') return 'free';
  const expiresAtMs = Number(data.expiresAtMs);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return 'free';
  if (data.state === 'done' && Number.isInteger(data.status) && typeof data.body === 'string') return 'done';
  if (data.state === 'pending') {
    const claimedAtMs = Number(data.claimedAtMs);
    return Number.isFinite(claimedAtMs) && nowMs - claimedAtMs < staleMs ? 'pending' : 'free';
  }
  return 'free';
}

/**
 * @param deps.resolveFirestore () => ({ db } | null) — defaults to firebase-admin.
 * @param deps.corsOrigin       the Access-Control-Allow-Origin a replay carries (as sendJson's).
 * @param deps.telemetry, deps.now, deps.sleep, deps.waitMs, deps.pollMs, deps.staleMs
 */
function createGradingIdempotency(deps = {}) {
  const {
    telemetry = null,
    corsOrigin = '*',
    now = () => Date.now(),
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    waitMs = IDEMPOTENCY_WAIT_MS,
    pollMs = IDEMPOTENCY_POLL_MS,
    staleMs = IDEMPOTENCY_PENDING_STALE_MS,
  } = deps;
  const resolveFirestore = typeof deps.resolveFirestore === 'function' ? deps.resolveFirestore : defaultResolveFirestore;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }

  function database() {
    try {
      const fs = resolveFirestore();
      return fs && fs.db ? fs.db : null;
    } catch {
      return null;
    }
  }

  /** One transaction: replay a stored result, report a live marker, or claim the record. */
  function claimOrRead(db, ref, claimId) {
    return db.runTransaction(async (tx) => {
      const nowMs = now();
      const snap = await tx.get(ref);
      const data = snap && snap.exists && typeof snap.data === 'function' ? snap.data() : null;
      const kind = classifyIdempotencyRecord(data, nowMs, staleMs);
      if (kind === 'done') return { kind: 'replay', status: data.status, body: data.body };
      if (kind === 'pending') return { kind: 'wait' };
      const expiresAtMs = nowMs + IDEMPOTENCY_TTL_MS;
      tx.set(ref, { state: 'pending', claimId, claimedAtMs: nowMs, expiresAtMs, expiresAt: new Date(expiresAtMs) });
      return { kind: 'claimed' };
    });
  }

  /** Store a served (2xx) result, or release this attempt's marker. Never rejects. */
  async function settle(db, ref, claimId, status, body) {
    const served = status >= 200 && status < 300 && typeof body === 'string';
    const storable = served && Buffer.byteLength(body, 'utf8') <= IDEMPOTENCY_MAX_BODY_BYTES;
    if (served && !storable) emit('idempotency.too_large');
    try {
      const outcome = await db.runTransaction(async (tx) => {
        const nowMs = now();
        const snap = await tx.get(ref);
        const data = snap && snap.exists && typeof snap.data === 'function' ? snap.data() : null;
        // A result already stands (a stale-marker re-claim that finished first): keep it.
        if (classifyIdempotencyRecord(data, nowMs, staleMs) === 'done') return 'kept';
        const mine = !!data && data.claimId === claimId;
        if (storable) {
          const expiresAtMs = mine && Number.isFinite(Number(data.expiresAtMs))
            ? Number(data.expiresAtMs)
            : nowMs + IDEMPOTENCY_TTL_MS;
          tx.set(ref, { state: 'done', claimId, status, body, completedAtMs: nowMs, expiresAtMs, expiresAt: new Date(expiresAtMs) });
          return 'stored';
        }
        if (mine) {
          tx.delete(ref);
          return 'released';
        }
        return 'kept';
      });
      emit(`idempotency.${outcome}`);
    } catch {
      emit('idempotency.settle_failed');
    }
  }

  /** Capture what the handler sends; settle once, when it sends it (or when it never does). */
  function attach(res, db, ref, claimId) {
    let settled = false;
    const end = res.end;
    res.end = function idempotentEnd(chunk) {
      if (!settled) {
        settled = true;
        let body = null;
        if (typeof chunk === 'string') body = chunk;
        else if (Buffer.isBuffer(chunk)) body = chunk.toString('utf8');
        void settle(db, ref, claimId, Number(res.statusCode) || 0, body);
      }
      return end.apply(this, arguments);
    };
    if (typeof res.once === 'function') {
      res.once('close', () => {
        if (settled) return;
        settled = true;
        void settle(db, ref, claimId, 0, null); // the handler never answered: release
      });
    }
  }

  /**
   * The route-boundary step. Call once per POST, after the uid is verified and BEFORE the
   * limiter / entitlement / fair use. Returns:
   *   null                         — not idempotent: run the request exactly as before
   *   { replay: { status, body } } — answer with replay() and stop
   *   { busy: true }               — answer GRADING_IN_PROGRESS_BODY (503) and stop
   *   { claimed: true }            — this request grades; its response has been hooked
   */
  async function begin(req, res, reqPath, verifiedUid) {
    if (!IDEMPOTENT_PATHS.has(reqPath)) return null;
    const key = idempotencyKeyOf(req);
    if (key === null) return null;
    if (key === false) {
      emit('idempotency.key_invalid');
      return null;
    }
    const uid = typeof verifiedUid === 'string' ? verifiedUid.trim() : '';
    if (!uid) {
      emit('idempotency.no_uid');
      return null;
    }
    const db = database();
    if (!db) {
      emit('idempotency.unavailable');
      return null;
    }
    const ref = db
      .collection(GRADING_RESULTS_COLLECTION)
      .doc(uid)
      .collection(GRADING_RESULTS_SEGMENTS.attempts)
      .doc(idempotencyAttemptId(reqPath, key));
    const claimId = crypto.randomUUID();
    const deadline = now() + waitMs;
    let waited = false;
    for (;;) {
      let step;
      try {
        step = await claimOrRead(db, ref, claimId);
      } catch {
        emit('idempotency.error');
        return null; // fail open: no worse than before this lane
      }
      if (step.kind === 'replay') {
        emit(waited ? 'idempotency.replay_after_wait' : 'idempotency.replay');
        return { replay: { status: step.status, body: step.body } };
      }
      if (step.kind === 'claimed') {
        emit('idempotency.claimed');
        attach(res, db, ref, claimId);
        return { claimed: true };
      }
      waited = true;
      if (now() >= deadline) {
        emit('idempotency.busy');
        return { busy: true };
      }
      await sleep(pollMs);
    }
  }

  /** Send a stored result exactly as it was first sent (sendJson's headers, the same bytes). */
  function replay(res, stored) {
    res.writeHead(stored.status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      'Idempotent-Replayed': 'true',
    });
    res.end(stored.body);
  }

  return { begin, replay };
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
  readPassEntry,
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
  createGradingIdempotency,
  classifyIdempotencyRecord,
  idempotencyKeyOf,
  idempotencyAttemptId,
  IDEMPOTENCY_HEADER,
  IDEMPOTENCY_TTL_MS,
  IDEMPOTENCY_PENDING_STALE_MS,
  IDEMPOTENCY_WAIT_MS,
  GRADING_RESULTS_COLLECTION,
  GRADING_RESULTS_SEGMENTS,
  GRADING_IN_PROGRESS_BODY,
};
