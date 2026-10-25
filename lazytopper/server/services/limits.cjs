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
 *   ★ IDEMPOTENT: re-minting the same paperKey within 24 h spends nothing (a double tap, a
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

const USAGE_LEDGER_COLLECTION = 'usageLedger';
// An object member (not a bare constant) on purpose, like usageLedger.cjs LEDGER_SEGMENTS: this is a
// SUBcollection, and the studentDataMap drift scanner reads a bare `.collection(CONST)` as top-level.
const LIMITS_SEGMENTS = Object.freeze({ limits: 'limits' });
const STATE_DOC = 'state';

const USAGE_LIMITS_PATH = '/api/usage/limits';
const USAGE_LIMITS_DOWNLOAD_PATH = '/api/usage/limits/download';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 7 * DAY_MS;
/** A re-mint of the same paper inside this window spends nothing. */
const IDEMPOTENT_MS = DAY_MS;
const PAPER_KEY_MAX = 200;
const MINT_MAX_BYTES = 4 * 1024;
/** Hard bound on stored entries: a runaway client cannot grow the document. */
const MAX_ENTRIES = 60;

/**
 * Trial metering applies to accounts created on/after this instant: 25 Oct 2026 00:00 IST.
 * The constant lives HERE and is returned by GET /api/usage/limits, so the client never decides.
 */
const TRIAL_COHORT_START_MS = LIMITS_CONFIG.trialCohortStartMs;

const DOWNLOAD_KINDS = new Set(['worksheet', 'chapter-test', 'full-mock', 'practice-set']);

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
function decideDownload({ metered, limit, entries, firstFreeUsed, paperKey, nowMs }) {
  const id = entryId(paperKey);
  const live = (Array.isArray(entries) ? entries : []).filter(
    (e) => e && Number.isFinite(e.at) && e.at <= nowMs + 5 * 60 * 1000 && nowMs - e.at < WINDOW_MS,
  );
  const prior = live.find((e) => e.id === id && nowMs - e.at < IDEMPOTENT_MS);
  const counted = live.filter((e) => !e.free);
  const used = counted.length;
  const oldestCounted = counted.reduce((min, e) => (min === null || e.at < min ? e.at : min), null);
  const resetAt = oldestCounted === null ? null : new Date(oldestCounted + WINDOW_MS).toISOString();

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
    resetAt: new Date((oldestCounted === null ? nowMs : oldestCounted) + WINDOW_MS).toISOString(),
    entries: live,
    id,
  };
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

function readState(snap) {
  if (!snap || typeof snap.exists === 'undefined') throw new Error('limits: no snapshot');
  const data = snap.exists && typeof snap.data === 'function' ? snap.data() : null;
  const d = data && typeof data === 'object' ? data : {};
  const dl = Array.isArray(d.dl)
    ? d.dl
        .filter((e) => e && typeof e === 'object' && Number.isFinite(e.at) && typeof e.id === 'string')
        .map((e) => ({ at: e.at, id: e.id, free: e.free === true }))
    : [];
  const ff = d.firstFree && typeof d.firstFree === 'object' ? d.firstFree : {};
  return { dl, firstFree: { ...ff }, cohortMs: Number.isFinite(d.cohortMs) ? d.cohortMs : null };
}

/**
 * @param deps.adminFirestore  firebase-admin Firestore (tier reads), or null.
 * @param deps.tierOf          (uid, req) => Promise<tier|null> — overrides the tier read (tests).
 * @param deps.getCreationMs   (uid) => Promise<ms|null> — overrides the Auth creationTime read (tests).
 * @param deps.resolveFirestore () => ({ db } | null) — the ledger Firestore (tests).
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
  async function planFor(uid, req) {
    const tier = await tierFor(uid, req);
    const limits = resolveLimits(env);
    if (tier === 'premium') return { tier, metered: false, limit: null };
    if (tier === 'free') return { tier, metered: true, limit: limits.basicDownloadsPerWeek };
    if (tier === 'trial') {
      const createdMs = await creationOf(uid);
      if (createdMs === null) return null;
      if (createdMs < TRIAL_COHORT_START_MS) return { tier, metered: false, limit: null, createdMs };
      return { tier, metered: true, limit: limits.trialDownloadsPerWeek, createdMs };
    }
    return null;
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
      tx.set(ref, {
        cohortMs: plan.createdMs !== undefined ? plan.createdMs : state.cohortMs,
        dl: entries,
        firstFree: { ...state.firstFree, download: true },
        updatedMs: nowMs,
      });
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
      });
    } catch {
      emit('limits.fail_open');
      return sendJson(res, 200, { ...base, tier: plan.tier, download: null });
    }
  }

  return { handleDownloadMint, handleLimitsMe };
}

module.exports = {
  createLimits,
  decideDownload,
  entryId,
  isEnforced,
  resolveLimits,
  USAGE_LIMITS_PATH,
  USAGE_LIMITS_DOWNLOAD_PATH,
  TRIAL_COHORT_START_MS,
  WINDOW_MS,
  IDEMPOTENT_MS,
  DOWNLOAD_KINDS,
  DEFAULTS,
};
