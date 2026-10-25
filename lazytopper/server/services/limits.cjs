/**
 * limits.cjs — LIMITS-1 PR-1. Download limits, decided on the SERVER.
 *
 * WHAT IT DECIDES
 * ---------------
 * One question: "may this signed-in student build one more paper PDF right now?"
 *
 *   Basic (tier `free`)   1 counted download per rolling 7 days; the very first ever is free.
 *                         Applies to EVERY Basic account (owner ruling 25 Oct 07:48).
 *   Trial                 2 counted downloads per rolling 7 days; the first ever is free.
 *                         ONLY for accounts created on/after 2026-10-25 00:00 IST
 *                         (2026-10-24T18:30:00Z); older trial accounts are not metered.
 *   Premium               unlimited. Never counted, never refused.
 *
 * A "download" is a counted kind (question paper, practice set, solutions/answer key). A
 * paper and its own solutions share ONE paperKey and so ONE spend. The student's own graded
 * report, notes, and upload packing are not downloads here and never call this.
 *
 * HOW (a copy of the FAIR-USE paper-pass mint, minus the HMAC: the PDF is built in the
 * browser, so there is no downstream request that needs to carry a token)
 * -------------------------------------------------------------------------------
 *   POST /api/usage/limits/download { kind, paperKey }
 *     200 { ok, counted, free, reused, enforced, limit, used, remaining, resetAt }
 *     409 { error: "download_limit", window: "7d", limit, resetAt }   (enforced only)
 *     401 sign_in_required · 400 invalid_limits_request
 *   GET  /api/usage/limits   -> the caller's own counters, for the chips. Counts and a time,
 *                               never rupees, never another student's number.
 *
 *   ★ ONE DOCUMENT: usageLedger/{uid}/limits/state. The read, the decision and the write run in
 *     ONE Firestore transaction, so two tabs minting at once spend once (the R2 race lesson,
 *     fairUse.cjs). It lives under the usageLedger tree, written ONLY by the Admin SDK, so
 *     firestore.rules is untouched (its deny-all catch-all already covers it); it is mapped in
 *     studentDataMap.ts so export and erasure walk it.
 *   ★ IDEMPOTENT: re-minting the same paperKey while it is still in the 7-day window spends nothing (a double tap, a
 *     failed PDF build, the solutions of the same paper). Entries hold a HASH of the paperKey.
 *   ★ SWITCH: refusals happen ONLY when env LIMITS_ENFORCE=1. Otherwise the request is served,
 *     the honest count still moves, and the would-be refusal is counted as
 *     `limits.download.would_refuse`. Same shape as FAIR_USE_ENFORCE. The owner flips it.
 *   ★ FAILS OPEN. An unknown tier, an unreadable ledger or a failed transaction serves the
 *     request (counted `limits.fail_open`): a student is never blocked by an infrastructure
 *     blip. A refusal needs a POSITIVE read.
 *   ★ THE TIER IS entitlement.cjs's (deriveEffectiveTier), via a separate silent gate.
 *   ★ SERVER TIME ONLY. Nothing a client sends moves a clock.
 */

const crypto = require('node:crypto');
const { LIMITS_CONFIG } = require('./limitsConfig.cjs');
const { chargeableCountOf } = require('../grading/charge.cjs');
const { PACK_CHAPTERS, PACK_SUBJECTS, ownsChapter, ownsMocks } = require('./packProducts.cjs');

const USAGE_LEDGER_COLLECTION = 'usageLedger';
// An object member (not a bare constant) on purpose, like usageLedger.cjs LEDGER_SEGMENTS: this is a
// SUBcollection, and the studentDataMap drift scanner reads a bare `.collection(CONST)` as top-level.
const LIMITS_SEGMENTS = Object.freeze({ limits: 'limits' });
const STATE_DOC = 'state';

const USAGE_LIMITS_PATH = '/api/usage/limits';
const USAGE_LIMITS_DOWNLOAD_PATH = '/api/usage/limits/download';
const USAGE_LIMITS_QP_PATH = '/api/usage/limits/qp';
const USAGE_LIMITS_DETAIL_PATH = '/api/usage/limits/detail';
const CHECK_SOLUTION_PATH = '/api/check-solution';
const GRADE_WORKSHEET_PATH = '/api/grade-worksheet';
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 7 * DAY_MS;
const PAPER_KEY_MAX = 200;
const MINT_MAX_BYTES = 4 * 1024;
// PACKS-LIMIT-1: the owned-pack lookup never holds a student's download hostage.
const PACKS_READ_TIMEOUT_MS = 1500;
const COVER_MAX_CHAPTERS = 26;

/**
 * PACKS-LIMIT-1: strict validation of the optional `cover` a client sends with a mint.
 * Returns `{ chapters, subject }` (either may be null) or null when ANYTHING is off - an unknown
 * key, a non-array, an unknown slug, more than 26 chapters, a subject outside the enum. A null
 * result means "ignore the cover and count as today".
 */
function parseCover(raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length === 0 || keys.some((k) => k !== 'chapters' && k !== 'subject')) return null;
  let chapters = null;
  let subject = null;
  if (raw.chapters !== undefined) {
    if (!Array.isArray(raw.chapters) || raw.chapters.length === 0 || raw.chapters.length > COVER_MAX_CHAPTERS) return null;
    for (const c of raw.chapters) {
      if (typeof c !== 'string' || !Object.prototype.hasOwnProperty.call(PACK_CHAPTERS, c)) return null;
    }
    chapters = Array.from(new Set(raw.chapters));
  }
  if (raw.subject !== undefined) {
    if (typeof raw.subject !== 'string' || !PACK_SUBJECTS.includes(raw.subject)) return null;
    subject = raw.subject;
  }
  return { chapters, subject };
}

/** Pure: is this paper wholly covered by what the student owns? (contract section 3, owner ruling 25 Oct) */
function coverIsOwned(kind, cover, packs) {
  if (!cover) return false;
  if (kind === 'full-mock') return cover.subject !== null && ownsMocks(packs, cover.subject);
  if (kind === 'chapter-test' || kind === 'worksheet') {
    return cover.chapters !== null && cover.chapters.every((slug) => ownsChapter(packs, slug));
  }
  return false; // practice-set is not a pack product
}
/** Hard bound on stored entries: a runaway client cannot grow the document. */
const MAX_ENTRIES = 60;

/**
 * Trial metering applies to accounts created on/after this instant: 25 Oct 2026 00:00 IST.
 * The constant lives HERE and is returned by GET /api/usage/limits, so the client never decides.
 */
const TRIAL_COHORT_START_MS = LIMITS_CONFIG.trialCohortStartMs;

const DOWNLOAD_KINDS = new Set(['worksheet', 'chapter-test', 'full-mock', 'practice-set']);
/** The five surfaces whose scorecard detail can be locked (and whose graded result is a "kind"). */
const DETAIL_KINDS = new Set(['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']);
/** LLM-graded kinds the grading gate meters. Quick Practice is metered by the QP mint, not here. */
const GRADE_KINDS = new Set(['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']);
/** GRADE_KINDS that live in a `gr:<kind>` weekly bucket (Quick Practice spends the daily `qp` bucket instead). */
const GR_BUCKET_KINDS = [...GRADE_KINDS].filter((k) => k !== 'quick-practice');
/** A grading reservation not confirmed or released within this long is dropped (a crash must not hold a slot forever). */
const RESERVATION_TTL_MS = 30 * 60 * 1000;
const TRIAL_GRADE_LIMIT_KEY = Object.freeze({
  'quick-practice': 'quickPracticeGradedPerDay',
  'check-improve': 'checkImprovePerWeek',
  worksheet: 'worksheetGradedPerWeek',
  'chapter-test': 'chapterTestGradedPerWeek',
  'full-mock': 'fullMockGradedPerWeek',
});

// Every number lives in limitsConfig.cjs (owner can tune there); env vars still override per deploy.
const DEFAULTS = Object.freeze({
  basicDownloadsPerWeek: LIMITS_CONFIG.basic.downloadsPerWeek,
  trialDownloadsPerWeek: LIMITS_CONFIG.trial.downloadsPerWeek,
});
const LIMIT_ENV = Object.freeze({
  basicDownloadsPerWeek: 'LIMITS_BASIC_DOWNLOADS_PER_WEEK',
  trialDownloadsPerWeek: 'LIMITS_TRIAL_DOWNLOADS_PER_WEEK',
});

function isEnforced(env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.LIMITS_ENFORCE) || '').trim());
}

function positiveInt(raw, fallback) {
  const n = Number.parseInt(String(raw === undefined || raw === null ? '' : raw).trim(), 10);
  return Number.isFinite(n) && n >= 1 && n <= 1000 ? n : fallback;
}

function resolveLimits(env) {
  const e = env || {};
  return {
    basicDownloadsPerWeek: positiveInt(e[LIMIT_ENV.basicDownloadsPerWeek], DEFAULTS.basicDownloadsPerWeek),
    trialDownloadsPerWeek: positiveInt(e[LIMIT_ENV.trialDownloadsPerWeek], DEFAULTS.trialDownloadsPerWeek),
  };
}

/** The hashed id an entry is stored under: never the paper id itself. */
function entryId(paperKey) {
  return crypto.createHash('sha256').update(`download|${paperKey}`).digest('hex').slice(0, 24);
}

/**
 * PURE. The decision for ONE tier and ONE state document.
 *
 *   metered        false -> this caller has no download cap (premium, pre-cohort trial)
 *   limit          counted downloads allowed per rolling 7 days
 *   entries        the stored `dl` list [{ at, id, free }]
 *   -> { kind: 'reused' | 'allowed' | 'refused', free, used, remaining, resetAt, entries }
 *
 * `used` counts only non-free entries inside the window. The first-ever download is free: it
 * is recorded (so it is idempotent) but never counted. `resetAt` is the instant the OLDEST
 * counted entry leaves the window, which is when one allowance frees up.
 */
function decideCounted({ metered, limit, entries, firstFreeUsed, id, nowMs, window }) {
  const win = window || { kind: 'rolling', ms: WINDOW_MS };
  let inWindow;
  let resetFor;
  if (win.kind === 'istDay') {
    const start = istDayStartMs(nowMs);
    inWindow = (e) => e.at >= start;
    resetFor = () => new Date(start + DAY_MS).toISOString();
  } else {
    inWindow = (e) => nowMs - e.at < win.ms;
    resetFor = (oldest) => new Date(oldest + win.ms).toISOString();
  }
  const live = (Array.isArray(entries) ? entries : []).filter(
    (e) => e && Number.isFinite(e.at) && e.at <= nowMs + 5 * 60 * 1000 && inWindow(e),
  );
  // A paper and its answer key are ONE spend: any re-mint of the same id inside the live window
  // (paper on day 1, key on day 5) is a reuse and spends nothing.
  const prior = live.find((e) => e.id === id);
  const counted = live.filter((e) => !e.free);
  const used = counted.length;
  const oldestCounted = counted.reduce((min, e) => (min === null || e.at < min ? e.at : min), null);
  const resetAt = oldestCounted === null ? null : resetFor(oldestCounted);

  if (!metered) {
    return { kind: 'allowed', free: false, counted: false, used, remaining: null, resetAt: null, entries: live, id };
  }
  if (prior) {
    return { kind: 'reused', free: Boolean(prior.free), counted: false, used, remaining: Math.max(0, limit - used), resetAt, entries: live, id };
  }
  if (!firstFreeUsed) {
    return { kind: 'allowed', free: true, counted: false, used, remaining: Math.max(0, limit - used), resetAt, entries: live, id };
  }
  if (used >= limit) {
    return { kind: 'refused', free: false, counted: false, used, remaining: 0, resetAt, entries: live, id };
  }
  const nextUsed = used + 1;
  return {
    kind: 'allowed',
    free: false,
    counted: true,
    used: nextUsed,
    remaining: Math.max(0, limit - nextUsed),
    resetAt: resetFor(oldestCounted === null ? nowMs : oldestCounted),
    entries: live,
    id,
  };
}

/** Start (UTC ms) of the IST calendar day containing `nowMs`. */
function istDayStartMs(nowMs) {
  return Math.floor((nowMs + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;
}

/** Download wrapper: the rolling-7-day decision keyed on the hashed paperKey. */
function decideDownload({ metered, limit, entries, firstFreeUsed, paperKey, nowMs }) {
  return decideCounted({ metered, limit, entries, firstFreeUsed, id: entryId(paperKey), nowMs, window: { kind: 'rolling', ms: WINDOW_MS } });
}

function defaultResolveFirestore() {
  try {
    const admin = require('firebase-admin');
    if (!admin || !Array.isArray(admin.apps) || admin.apps.length === 0) return null;
    return { db: admin.firestore() };
  } catch {
    return null;
  }
}

/** Auth `metadata.creationTime` of a uid, in ms, or null. One Admin SDK call. */
async function defaultGetCreationMs(uid) {
  try {
    const admin = require('firebase-admin');
    if (!admin || !Array.isArray(admin.apps) || admin.apps.length === 0) return null;
    const user = await admin.auth().getUser(uid);
    const ms = Date.parse(user && user.metadata && user.metadata.creationTime);
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

function stateRef(db, uid) {
  return db.collection(USAGE_LEDGER_COLLECTION).doc(uid).collection(LIMITS_SEGMENTS.limits).doc(STATE_DOC);
}

function cleanEntries(list) {
  return Array.isArray(list)
    ? list
        .filter((e) => e && typeof e === 'object' && Number.isFinite(e.at) && typeof e.id === 'string')
        .map((e) => ({ at: e.at, id: e.id, free: e.free === true, ...(e.p === 1 ? { p: 1 } : {}), ...(e.g === 1 ? { g: 1 } : {}) }))
    : [];
}

function readState(snap) {
  if (!snap || typeof snap.exists === 'undefined') throw new Error('limits: no snapshot');
  const data = snap.exists && typeof snap.data === 'function' ? snap.data() : null;
  const d = data && typeof data === 'object' ? data : {};
  const ff = d.firstFree && typeof d.firstFree === 'object' ? d.firstFree : {};
  const grade = {};
  const gr = {};
  for (const kind of GR_BUCKET_KINDS) {
    gr[kind] = cleanEntries(d.gr && d.gr[kind]);
    if (ff.grade && ff.grade[kind] === true) grade[kind] = true;
  }
  const detail = {};
  for (const kind of DETAIL_KINDS) {
    if (d.detail && typeof d.detail[kind] === 'string') detail[kind] = d.detail[kind];
  }
  return {
    dl: cleanEntries(d.dl),
    qp: cleanEntries(d.qp),
    gr,
    firstFree: { download: ff.download === true, qp: ff.qp === true, grade },
    detail,
    cohortMs: Number.isFinite(d.cohortMs) ? d.cohortMs : null,
  };
}

/** The ONE document shape every mutation writes back whole (a partial set would drop the rest). */
function serializeState(state, nowMs, cohortMs) {
  const gr = {};
  for (const kind of GR_BUCKET_KINDS) if (state.gr[kind] && state.gr[kind].length) gr[kind] = state.gr[kind];
  return {
    cohortMs: cohortMs !== undefined && cohortMs !== null ? cohortMs : state.cohortMs,
    dl: state.dl,
    qp: state.qp,
    gr,
    firstFree: { download: state.firstFree.download === true, qp: state.firstFree.qp === true, grade: { ...state.firstFree.grade } },
    detail: { ...state.detail },
    updatedMs: nowMs,
  };
}

/** A counted bucket: 'dl' (downloads, 7d), 'qp' (Quick Practice, IST day), or 'gr:<kind>' (graded, 7d). */
function bucketOf(state, bucket) {
  if (bucket === 'dl') return state.dl;
  if (bucket === 'qp') return state.qp;
  return state.gr[bucket.slice(3)] || [];
}
function setBucket(state, bucket, list) {
  if (bucket === 'dl') state.dl = list;
  else if (bucket === 'qp') state.qp = list;
  else state.gr[bucket.slice(3)] = list;
}
function firstFreeOf(state, bucket) {
  if (bucket === 'dl') return state.firstFree.download === true;
  if (bucket === 'qp') return state.firstFree.qp === true;
  return state.firstFree.grade[bucket.slice(3)] === true;
}
function markFirstFree(state, bucket) {
  if (bucket === 'dl') state.firstFree.download = true;
  else if (bucket === 'qp') state.firstFree.qp = true;
  else state.firstFree.grade[bucket.slice(3)] = true;
}
function unmarkFirstFree(state, bucket) {
  if (bucket === 'dl') state.firstFree.download = false;
  else if (bucket === 'qp') state.firstFree.qp = false;
  else delete state.firstFree.grade[bucket.slice(3)];
}
function windowOf(bucket) {
  return bucket === 'qp' ? { kind: 'istDay' } : { kind: 'rolling', ms: WINDOW_MS };
}

function hashKey(scope, key) {
  return crypto.createHash('sha256').update(`${scope}|${key}`).digest('hex').slice(0, 24);
}

/** The reservation a grading request took, as plain data a background job can persist (see settleDeferred). */
const LIMITS_DEFERRED = Symbol.for('lazytopper.limits.deferred');
function setLimitsDeferred(res, ref) {
  if (!res || (typeof res !== 'object' && typeof res !== 'function')) return;
  try {
    Object.defineProperty(res, LIMITS_DEFERRED, { value: ref, enumerable: false, configurable: true, writable: true });
  } catch { /* a frozen test double */ }
}
function limitsDeferredOf(res) {
  const d = res && (typeof res === 'object' || typeof res === 'function') ? res[LIMITS_DEFERRED] : undefined;
  return d && typeof d === 'object' ? {
    uid: d.uid, bucket: d.bucket, id: d.id,
    // Firestore rejects a nested undefined (a free/Basic account has no createdMs): omit the key.
    ...(Number.isFinite(d.createdMs) ? { createdMs: d.createdMs } : {}),
  } : null;
}

/**
 * @param deps.adminFirestore  firebase-admin Firestore (tier reads), or null.
 * @param deps.tierOf          (uid, req) => Promise<tier|null> — overrides the tier read (tests).
 * @param deps.getCreationMs   (uid) => Promise<ms|null> — overrides the Auth creationTime read (tests).
 * @param deps.resolveFirestore () => ({ db } | null) — the ledger Firestore (tests).
 * @param deps.listPacks       (uid) => Promise<pack[]> — overrides the owned-packs read (tests).
 */
function createLimits(deps = {}) {
  const {
    adminFirestore = null,
    telemetry = null,
    sendJson = null,
    verifiedCaller = null,
    readJson = null,
    now = () => Date.now(),
    env = process.env,
  } = deps;
  const resolveFirestore = typeof deps.resolveFirestore === 'function' ? deps.resolveFirestore : defaultResolveFirestore;
  const getCreationMs = typeof deps.getCreationMs === 'function' ? deps.getCreationMs : defaultGetCreationMs;

  let tierOf = deps.tierOf;
  if (typeof tierOf !== 'function') {
    // A SEPARATE, SILENT entitlement gate (same derivation as fairUse.cjs): reading the tier
    // here never moves the owner's entitlement counters.
    const { createEntitlementGate } = require('./entitlement.cjs');
    const tiers = createEntitlementGate({
      adminFirestore,
      telemetry: null,
      sendJson: null,
      logger: { log() {}, warn() {}, error() {}, info() {} },
    });
    tierOf = async (uid, req) => (await tiers.resolve(uid, req)).tier;
  }

  // PACKS-LIMIT-1: the student's owned packs (server/services/packGrant.cjs), injectable for tests.
  const readPacks = typeof deps.listPacks === 'function'
    ? deps.listPacks
    : async (uid) => {
        if (!adminFirestore) throw new Error('no_firestore');
        return require('./packGrant.cjs').listPacks(adminFirestore, uid);
      };

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }

  function ledgerDb() {
    try {
      const fs = resolveFirestore();
      return fs && fs.db ? fs.db : null;
    } catch {
      return null;
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

  async function verifiedUidOf(req) {
    try {
      return verifiedCaller && typeof verifiedCaller.resolveVerifiedUid === 'function'
        ? String((await verifiedCaller.resolveVerifiedUid(req)) || '').trim()
        : '';
    } catch {
      return '';
    }
  }

  /** Account creation never changes, so one Admin SDK read per uid per process is enough. */
  const creationMemo = new Map();
  async function creationOf(uid) {
    if (creationMemo.has(uid)) return creationMemo.get(uid);
    let ms = null;
    try {
      ms = await getCreationMs(uid);
    } catch {
      ms = null;
    }
    if (Number.isFinite(ms)) {
      if (creationMemo.size >= 5000) creationMemo.delete(creationMemo.keys().next().value);
      creationMemo.set(uid, ms);
      return ms;
    }
    return null;
  }

  /**
   * Is this caller metered, and at what limit? `null` -> unknown (fail open).
   * Premium and pre-cohort trial accounts are not metered.
   */
  async function tierInfo(uid, req) {
    const tier = await tierFor(uid, req);
    if (tier === 'premium') return { tier, metered: false };
    if (tier === 'free') return { tier, metered: true };
    if (tier === 'trial') {
      const createdMs = await creationOf(uid);
      if (createdMs === null) return null;
      if (createdMs < TRIAL_COHORT_START_MS) return { tier, metered: false, createdMs };
      return { tier, metered: true, createdMs };
    }
    return null;
  }

  async function planFor(uid, req) {
    const info = await tierInfo(uid, req);
    if (!info) return null;
    const limits = resolveLimits(env);
    if (!info.metered) return { ...info, limit: null };
    return { ...info, limit: info.tier === 'free' ? limits.basicDownloadsPerWeek : limits.trialDownloadsPerWeek };
  }

  /** Never throws: any failure (no Firestore, a read error, a slow read) is "not owned". */
  async function ownsCover(uid, kind, cover) {
    let timer = null;
    try {
      const packs = await Promise.race([
        Promise.resolve().then(() => readPacks(uid)),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('packs_timeout')), PACKS_READ_TIMEOUT_MS); }),
      ]);
      return coverIsOwned(kind, cover, packs);
    } catch {
      emit('limits.download.pack_read_failed');
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function sendOk(res, plan, decision, enforced, reused) {
    return sendJson(res, 200, {
      ok: true,
      counted: decision.counted,
      free: decision.free,
      reused: Boolean(reused),
      enforced,
      limit: plan.limit,
      used: decision.used,
      remaining: decision.remaining,
      resetAt: decision.resetAt,
    });
  }

  function failOpen(res, plan, enforced) {
    emit('limits.fail_open');
    return sendJson(res, 200, {
      ok: true,
      counted: false,
      free: false,
      reused: false,
      enforced,
      limit: plan ? plan.limit : null,
      used: null,
      remaining: null,
      resetAt: null,
      failOpen: true,
    });
  }

  /** POST /api/usage/limits/download */
  async function handleDownloadMint(req, res) {
    const uid = await verifiedUidOf(req);
    if (!uid) return sendJson(res, 401, { error: 'sign_in_required' });

    let body;
    try {
      body = await readJson(req, MINT_MAX_BYTES);
    } catch {
      return sendJson(res, 400, { error: 'invalid_limits_request' });
    }
    const kind = body && typeof body === 'object' && typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : '';
    const paperKey = body && typeof body === 'object' && typeof body.paperKey === 'string' ? body.paperKey.trim() : '';
    if (!DOWNLOAD_KINDS.has(kind) || !paperKey || paperKey.length > PAPER_KEY_MAX) {
      return sendJson(res, 400, { error: 'invalid_limits_request' });
    }

    const enforced = isEnforced(env);
    const plan = await planFor(uid, req);
    if (!plan) return failOpen(res, null, enforced);
    if (!plan.metered) {
      emit('limits.download.unmetered');
      return sendJson(res, 200, {
        ok: true, counted: false, free: false, reused: false, enforced, limit: null, used: null, remaining: null, resetAt: null,
      });
    }

    // PACKS-LIMIT-1: a paper wholly covered by packs the student owns is not a counted download.
    // Runs BEFORE the ledger transaction and writes nothing. A bad cover or a failed / slow packs
    // read changes nothing: the request falls through to today's counting (never a refusal, never a 500).
    const cover = kind !== 'practice-set' ? parseCover(body.cover) : null;
    if (cover && (await ownsCover(uid, kind, cover))) {
      emit('limits.download.pack_owned');
      return sendJson(res, 200, {
        ok: true, counted: false, free: false, reused: false, packOwned: true, enforced, limit: plan.limit, used: null, remaining: null, resetAt: null,
      });
    }

    const db = ledgerDb();
    if (!db || typeof db.runTransaction !== 'function') return failOpen(res, plan, enforced);
    const nowMs = now();

    async function mintBody(tx) {
      const ref = stateRef(db, uid);
      const state = readState(await tx.get(ref));
      const decision = decideDownload({
        metered: true,
        limit: plan.limit,
        entries: state.dl,
        firstFreeUsed: state.firstFree.download === true,
        paperKey,
        nowMs,
      });
      if (decision.kind === 'refused' && enforced) return { decision, wrote: false };
      if (decision.kind === 'reused') return { decision, wrote: false };
      const entries = decision.entries
        .concat([{ at: nowMs, id: decision.id, free: decision.free }])
        .sort((a, b) => a.at - b.at)
        .slice(-MAX_ENTRIES);
      const next = { ...state, dl: entries, firstFree: { ...state.firstFree, download: true } };
      tx.set(ref, serializeState(next, nowMs, plan.createdMs));
      return { decision, wrote: true };
    }

    let outcome;
    try {
      // MUTATION LIM-MUT-1 target ("mint without the transaction" -> the race test goes RED).
      outcome = await db.runTransaction((tx) => mintBody(tx));
    } catch {
      return failOpen(res, plan, enforced);
    }

    const { decision } = outcome;
    if (decision.kind === 'refused' && enforced) {
      emit('limits.download.refused');
      return sendJson(res, 409, {
        error: 'download_limit',
        tier: plan.tier,
        window: '7d',
        limit: plan.limit,
        used: decision.used,
        remaining: 0,
        resetAt: decision.resetAt,
      });
    }
    if (decision.kind === 'refused') emit('limits.download.would_refuse');
    emit(decision.kind === 'reused' ? 'limits.download.reused' : 'limits.download.minted');
    return sendOk(res, plan, decision.kind === 'refused' ? { ...decision, counted: true } : decision, enforced, decision.kind === 'reused');
  }


  /**
   * ONE transaction: decide on `bucket`, and write the entry unless it is a refusal-while-enforced
   * or a reuse. `markFree` records the first-free flag even when the entry is a reuse of nothing.
   */
  async function spendIn(db, uid, { bucket, id, limit, createdMs, enforced, nowMs, claimGrade }) {
    return db.runTransaction(async (tx) => {
      const ref = stateRef(db, uid);
      const state = readState(await tx.get(ref));
      let list = bucketOf(state, bucket);
      let claimed = false;
      if (claimGrade && !list.some((e) => e.id === id)) {
        // A written-answer grade of this set already spent the allowance (grading runs BEFORE the scorecard):
        // adopt that entry as this set's spend instead of charging the set twice.
        const start = istDayStartMs(nowMs);
        const g = list.find((e) => e.g === 1 && e.p !== 1 && e.at >= start);
        if (g) {
          list = list.map((e) => (e === g ? { at: e.at, id, free: e.free } : e));
          claimed = true;
        }
      }
      const decision = decideCounted({
        metered: true, limit, entries: list, firstFreeUsed: firstFreeOf(state, bucket), id, nowMs, window: windowOf(bucket),
      });
      if (claimed) {
        setBucket(state, bucket, list);
        tx.set(ref, serializeState(state, nowMs, createdMs));
        return { decision, wrote: true };
      }
      if (decision.kind === 'reused' || (decision.kind === 'refused' && enforced)) return { decision, wrote: false };
      const entries = decision.entries.concat([{ at: nowMs, id: decision.id, free: decision.free }]).sort((a, b) => a.at - b.at).slice(-MAX_ENTRIES);
      setBucket(state, bucket, entries);
      markFirstFree(state, bucket);
      tx.set(ref, serializeState(state, nowMs, createdMs));
      return { decision, wrote: true };
    });
  }

  /** POST /api/usage/limits/qp { paperKey } — one graded Quick Practice set. */
  async function handleQpMint(req, res) {
    const uid = await verifiedUidOf(req);
    if (!uid) return sendJson(res, 401, { error: 'sign_in_required' });
    let body;
    try {
      body = await readJson(req, MINT_MAX_BYTES);
    } catch {
      return sendJson(res, 400, { error: 'invalid_limits_request' });
    }
    const paperKey = body && typeof body === 'object' && typeof body.paperKey === 'string' ? body.paperKey.trim() : '';
    if (!paperKey || paperKey.length > PAPER_KEY_MAX) return sendJson(res, 400, { error: 'invalid_limits_request' });

    const enforced = isEnforced(env);
    const info = await tierInfo(uid, req);
    if (!info) return failOpen(res, null, enforced);
    const cfg = LIMITS_CONFIG;
    const limit = info.tier === 'free' ? cfg.basic.quickPracticeGradedPerDay : cfg.trial.quickPracticeGradedPerDay;
    const plan = { ...info, limit };
    if (!info.metered) {
      emit('limits.qp.unmetered');
      return sendJson(res, 200, { ok: true, counted: false, free: false, reused: false, enforced, limit: null, used: null, remaining: null, resetAt: null });
    }
    const db = ledgerDb();
    if (!db || typeof db.runTransaction !== 'function') return failOpen(res, plan, enforced);
    let outcome;
    try {
      outcome = await spendIn(db, uid, { bucket: 'qp', id: hashKey('qp', paperKey), limit, createdMs: info.createdMs, enforced, nowMs: now(), claimGrade: true });
    } catch {
      return failOpen(res, plan, enforced);
    }
    const { decision } = outcome;
    if (decision.kind === 'refused' && enforced) {
      emit('limits.qp.refused');
      return sendJson(res, 409, {
        error: 'qp_limit', tier: info.tier, window: '1d', limit, used: decision.used, remaining: 0, resetAt: decision.resetAt,
      });
    }
    if (decision.kind === 'refused') emit('limits.qp.would_refuse');
    emit(decision.kind === 'reused' ? 'limits.qp.reused' : 'limits.qp.minted');
    return sendOk(res, plan, decision.kind === 'refused' ? { ...decision, counted: true } : decision, enforced, decision.kind === 'reused');
  }

  /**
   * POST /api/usage/limits/detail { kind, resultKey } -> { unlocked }
   * The scorecard's per-answer breakdown is locked for Basic after the FIRST result of each kind.
   * Premium, trial and any failure are unlocked (fail open); not enforced -> unlocked.
   */
  async function handleDetailClaim(req, res) {
    const uid = await verifiedUidOf(req);
    if (!uid) return sendJson(res, 401, { error: 'sign_in_required' });
    let body;
    try {
      body = await readJson(req, MINT_MAX_BYTES);
    } catch {
      return sendJson(res, 400, { error: 'invalid_limits_request' });
    }
    const kind = body && typeof body === 'object' && typeof body.kind === 'string' ? body.kind.trim().toLowerCase() : '';
    const resultKey = body && typeof body === 'object' && typeof body.resultKey === 'string' ? body.resultKey.trim() : '';
    if (!DETAIL_KINDS.has(kind) || !resultKey || resultKey.length > PAPER_KEY_MAX) {
      return sendJson(res, 400, { error: 'invalid_limits_request' });
    }
    const enforced = isEnforced(env);
    const open = (extra) => sendJson(res, 200, { ok: true, enforced, unlocked: true, ...extra });
    if (!enforced || !LIMITS_CONFIG.basic.scorecardBreakdownLocked) return open({});
    const info = await tierInfo(uid, req);
    if (!info || info.tier !== 'free') return open({});
    const db = ledgerDb();
    if (!db || typeof db.runTransaction !== 'function') {
      emit('limits.fail_open');
      return open({ failOpen: true });
    }
    const keyId = hashKey(`detail|${kind}`, resultKey);
    let unlocked;
    try {
      unlocked = await db.runTransaction(async (tx) => {
        const ref = stateRef(db, uid);
        const state = readState(await tx.get(ref));
        const held = state.detail[kind];
        if (held === undefined) {
          state.detail[kind] = keyId;
          tx.set(ref, serializeState(state, now(), info.createdMs));
          return true;
        }
        return held === keyId;
      });
    } catch {
      emit('limits.fail_open');
      return open({ failOpen: true });
    }
    emit(unlocked ? 'limits.detail.open' : 'limits.detail.locked');
    return sendJson(res, 200, { ok: true, enforced, unlocked, tier: 'free' });
  }

  /**
   * The LLM grading gate (check-improve, worksheet, chapter-test, full-mock). Called by index.cjs
   * BEFORE the entitlement gate, only when LIMITS_ENFORCE=1 (otherwise it does nothing at all).
   *   -> { refused: true }            a 409 `trial_limit` / was sent
   *   -> { bypassEntitlement: true }  Basic's first free grade of this kind: skip the 402 once
   *   -> {}                           carry on exactly as before
   * A 2xx finish records the spend (so a failed grade costs nothing). The kind comes from the
   * path and the (untrusted) surface header; the worst a forged header can do is claim the
   * one first-free grade of a kind, never more.
   */
  async function gradingGate(req, res, reqPath, uid, opts = {}) {
    const none = {};
    try {
      if (!isEnforced(env) || !uid) return none;
      if (reqPath !== CHECK_SOLUTION_PATH && reqPath !== GRADE_WORKSHEET_PATH) return none;
      const raw = String((req && req.headers && req.headers['x-lazytopper-surface']) || '').trim().toLowerCase();
      // /api/check-solution is ONE single-question check: whatever surface a client claims, it is metered as
      // Check & Improve (the real Quick Practice client sends the header here from SolutionChecker, per
      // question, which is not a graded SET; the QP allowance is spent by the set's grade-worksheet call or
      // its scorecard mint). An unknown surface on grade-worksheet is Check & Improve, as fair use counts it.
      const kind = reqPath === CHECK_SOLUTION_PATH ? 'check-improve' : (GRADE_KINDS.has(raw) ? raw : 'check-improve');
      const info = await tierInfo(uid, req);
      if (!info || !info.metered) return none;
      const db = ledgerDb();
      if (!db || typeof db.runTransaction !== 'function') {
        emit('limits.fail_open');
        return none;
      }
      const bucket = kind === 'quick-practice' ? 'qp' : `gr:${kind}`;
      const passKey = typeof opts.paperKeyOf === 'function' ? opts.paperKeyOf(req, kind) : null;
      const idemKey = String((req.headers && req.headers['idempotency-key']) || '').trim();
      const id = hashKey(`grade|${kind}`, passKey || idemKey || crypto.randomUUID());
      const limit = info.tier === 'free' ? 1 : resolveGradeLimit(kind);

      // ONE transaction: read the bucket, decide and RESERVE the slot. Parallel requests (different
      // idempotency keys) serialise on the document, so the cap cannot be passed.
      const r = await reserveGrade(db, uid, { bucket, id, limit, tier: info.tier, createdMs: info.createdMs, nowMs: now() });
      if (r.kind === 'none') return none; // Basic, first free already used: the ordinary 402 follows
      if (r.kind === 'refused') {
        emit('limits.grade.refused');
        sendJson(res, 409, {
          error: 'trial_limit', source: 'limits', tier: 'trial', surface: kind, window: kind === 'quick-practice' ? '1d' : '7d', limit,
          used: r.used, remaining: 0, resetAt: r.resetAt,
        });
        return { refused: true };
      }
      if (r.kind === 'reserved') {
        const ref = { uid, bucket, id, createdMs: info.createdMs };
        setLimitsDeferred(res, ref);
        let settled = false;
        const settle = (ok) => {
          if (settled) return;
          settled = true;
          (ok ? confirmGrade(db, uid, ref) : releaseGrade(db, uid, ref)).then(
            () => emit(ok ? 'limits.grade.recorded' : 'limits.grade.released'),
            () => emit('limits.fail_open'),
          );
        };
        res.once('finish', () => {
          // 202 = a background job: the job settles the reservation when it ends (see settleDeferred).
          if (res.statusCode === 202) { settled = true; return; }
          // Charge only a served grade that read at least one question; everything else gives the slot back.
          settle(res.statusCode >= 200 && res.statusCode < 300 && chargeableCountOf(res) !== 0);
        });
        res.once('close', () => { if (!res.writableFinished) settle(false); });
      }
      return info.tier === 'free' ? { bypassEntitlement: true } : none;
    } catch {
      emit('limits.fail_open');
      return none;
    }
  }

  /** The decision + the reservation in ONE transaction. */
  function reserveGrade(db, uid, { bucket, id, limit, tier, createdMs, nowMs }) {
    return db.runTransaction(async (tx) => {
      const ref = stateRef(db, uid);
      const state = readState(await tx.get(ref));
      const all = bucketOf(state, bucket);
      const isStale = (e) => e.p === 1 && nowMs - e.at > RESERVATION_TTL_MS;
      const held = all.filter((e) => !isStale(e));
      // A pruned reservation that held the student's one free grade gives it back (a lost job must not burn it).
      if (all.some((e) => isStale(e) && e.free === true)) unmarkFirstFree(state, bucket);
      const ffUsed = firstFreeOf(state, bucket);
      let entries;
      let free;
      if (tier === 'free') {
        if (ffUsed) return { kind: 'none' };
        entries = held;
        free = true;
      } else {
        const d = decideCounted({ metered: true, limit, entries: held, firstFreeUsed: ffUsed, id, nowMs, window: windowOf(bucket) });
        if (d.kind === 'refused') return { kind: 'refused', used: d.used, resetAt: d.resetAt };
        if (d.kind === 'reused') return { kind: 'reused' };
        entries = d.entries;
        free = d.free;
      }
      const entry = { at: nowMs, id, free, p: 1, ...(bucket === 'qp' ? { g: 1 } : {}) };
      setBucket(state, bucket, entries.concat([entry]).sort((x, y) => x.at - y.at).slice(-MAX_ENTRIES));
      markFirstFree(state, bucket);
      tx.set(ref, serializeState(state, nowMs, createdMs));
      return { kind: 'reserved', free };
    });
  }

  /** A graded result was delivered: the reservation becomes a plain spend (re-added if its TTL lapsed). */
  function confirmGrade(db, uid, { bucket, id, createdMs }) {
    return db.runTransaction(async (tx) => {
      const ref = stateRef(db, uid);
      const state = readState(await tx.get(ref));
      const list = bucketOf(state, bucket);
      const hit = list.find((e) => e.id === id);
      const next = hit
        ? list.map((e) => (e === hit ? { at: e.at, id: e.id, free: e.free, ...(e.g === 1 ? { g: 1 } : {}) } : e))
        : list.concat([{ at: now(), id, free: false, ...(bucket === 'qp' ? { g: 1 } : {}) }]);
      setBucket(state, bucket, next.slice(-MAX_ENTRIES));
      tx.set(ref, serializeState(state, now(), createdMs));
    });
  }

  /** Nothing was delivered (error, refusal downstream, every question unreadable): give the slot back. */
  function releaseGrade(db, uid, { bucket, id, createdMs }) {
    return db.runTransaction(async (tx) => {
      const ref = stateRef(db, uid);
      const state = readState(await tx.get(ref));
      const list = bucketOf(state, bucket);
      const hit = list.find((e) => e.id === id && e.p === 1);
      if (!hit) return;
      setBucket(state, bucket, list.filter((e) => e !== hit));
      if (hit.free) unmarkFirstFree(state, bucket);
      tx.set(ref, serializeState(state, now(), createdMs));
    });
  }

  /**
   * A background grading job ended (grading/jobs.cjs commitDeferred): confirm the reservation when at
   * least one question was graded, release it otherwise. Never throws.
   */
  function settleDeferred(deferred, graded) {
    try {
      const ref = deferred && typeof deferred === 'object' ? deferred.limits : null;
      if (!ref || typeof ref.uid !== 'string' || typeof ref.bucket !== 'string' || typeof ref.id !== 'string') return;
      const db = ledgerDb();
      if (!db || typeof db.runTransaction !== 'function') return;
      const ok = Math.floor(Number(graded) || 0) > 0;
      (ok ? confirmGrade(db, ref.uid, ref) : releaseGrade(db, ref.uid, ref)).then(
        () => emit(ok ? 'limits.grade.recorded' : 'limits.grade.released'),
        () => emit('limits.fail_open'),
      );
    } catch {
      emit('limits.fail_open');
    }
  }

  function resolveGradeLimit(kind) {
    return LIMITS_CONFIG.trial[TRIAL_GRADE_LIMIT_KEY[kind]];
  }

  /** The QP + graded + detail counters of one caller (pure reads of an already-read state). */
  function summaryExtras(state, info, nowMs) {
    const counter = (bucket, limit) => {
      const d = decideCounted({ metered: true, limit, entries: bucketOf(state, bucket), firstFreeUsed: firstFreeOf(state, bucket), id: '', nowMs, window: windowOf(bucket) });
      const used = d.kind === 'allowed' && d.counted ? d.used - 1 : d.used;
      return { limit, used, remaining: Math.max(0, limit - used), firstFreeAvailable: !firstFreeOf(state, bucket), resetAt: used >= limit ? d.resetAt : null };
    };
    const qpLimit = info.tier === 'free' ? LIMITS_CONFIG.basic.quickPracticeGradedPerDay : LIMITS_CONFIG.trial.quickPracticeGradedPerDay;
    const grade = {};
    for (const kind of GR_BUCKET_KINDS) {
      grade[kind] = info.tier === 'free'
        ? { limit: 0, used: 0, remaining: 0, firstFreeAvailable: !firstFreeOf(state, `gr:${kind}`), resetAt: null }
        : counter(`gr:${kind}`, resolveGradeLimit(kind));
    }
    return {
      qp: { metered: true, window: '1d', ...counter('qp', qpLimit) },
      grade,
      detailLocked: info.tier === 'free' && LIMITS_CONFIG.basic.scorecardBreakdownLocked === true,
    };
  }

  /** GET /api/usage/limits */
  async function handleLimitsMe(req, res) {
    const uid = await verifiedUidOf(req);
    if (!uid) return sendJson(res, 401, { error: 'sign_in_required' });
    const enforced = isEnforced(env);
    const base = { ok: true, enforced, trialCohortStartMs: TRIAL_COHORT_START_MS, window: '7d' };
    const plan = await planFor(uid, req);
    if (!plan) return sendJson(res, 200, { ...base, tier: null, download: null });
    if (!plan.metered) {
      return sendJson(res, 200, { ...base, tier: plan.tier, download: { metered: false, limit: null, used: 0, remaining: null, firstFreeAvailable: false, resetAt: null } });
    }
    const db = ledgerDb();
    if (!db) return sendJson(res, 200, { ...base, tier: plan.tier, download: null });
    try {
      const state = readState(await stateRef(db, uid).get());
      const nowMs = now();
      const d = decideDownload({
        metered: true, limit: plan.limit, entries: state.dl, firstFreeUsed: state.firstFree.download === true, paperKey: '', nowMs,
      });
      const firstFreeAvailable = state.firstFree.download !== true;
      // decideDownload with an empty key never matches a prior entry; its `used` is the window count.
      const used = d.kind === 'allowed' && d.counted ? d.used - 1 : d.used;
      return sendJson(res, 200, {
        ...base,
        tier: plan.tier,
        download: {
          metered: true,
          limit: plan.limit,
          used,
          remaining: Math.max(0, plan.limit - used),
          firstFreeAvailable,
          resetAt: used >= plan.limit ? d.resetAt : null,
        },
        ...summaryExtras(state, plan, nowMs),
      });
    } catch {
      emit('limits.fail_open');
      return sendJson(res, 200, { ...base, tier: plan.tier, download: null });
    }
  }

  return { handleDownloadMint, handleLimitsMe, handleQpMint, handleDetailClaim, gradingGate, settleDeferred };
}

module.exports = {
  createLimits,
  limitsDeferredOf,
  decideDownload,
  parseCover,
  coverIsOwned,
  entryId,
  isEnforced,
  resolveLimits,
  USAGE_LIMITS_PATH,
  USAGE_LIMITS_DOWNLOAD_PATH,
  USAGE_LIMITS_QP_PATH,
  USAGE_LIMITS_DETAIL_PATH,
  decideCounted,
  istDayStartMs,
  TRIAL_COHORT_START_MS,
  WINDOW_MS,
  DOWNLOAD_KINDS,
  DEFAULTS,
};
