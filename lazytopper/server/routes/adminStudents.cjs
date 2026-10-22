/**
 * adminStudents — the admin "Students" page's READ API (STUDENT-ACTIVITY-1, PR-2).
 *
 *   GET /api/admin/students            the list: newest sign-ups first, 50 per page
 *   GET /api/admin/students/summary    the summary cards for a sign-up period
 *   GET /api/admin/students/ai-cost    COST-1: AI cost from the usage ledger for a spend window
 *   GET /api/admin/students/{uid}      one student's day-by-day timeline
 *
 * ★★ ADMIN-ONLY, THROUGH THE ONE SHARED GATE. Every endpoint runs `requireAdmin` FIRST,
 * before it parses a parameter or reads anything. `requireAdmin` is not a copy: index.cjs
 * hands in `adminTelemetryRoutes.requireFirebaseAdmin`, the P2 ADMIN_FIREBASE_UIDS gate
 * (503 when the env or firebase-admin is missing, 401 without a valid Bearer ID token,
 * 403 for a valid uid that is not allowlisted). A missing `requireAdmin` is itself a 503:
 * this module cannot fall open by being mounted wrong. Student data reaches a browser
 * ONLY through this gated API; the page holds none of it.
 *
 * ★★ READ-ONLY. This file calls only: Auth `listUsers` / `getUser`; Firestore
 * `collection` / `doc` / `where` / `orderBy` / `limit` / `select` / `get` / `getAll` /
 * `count`. No set, update, delete, create, batch or transaction exists in it; the tests
 * run every endpoint against fakes whose write methods THROW.
 *
 * ★★ NAMES AND COUNTS ONLY. Every value in a response is copied field-by-field from an
 * explicit list below (no spread of a stored document). No question text, answer, title,
 * question id, image or free text from any source is ever returned, even where the stored
 * document holds one (sessionRecords `title` / `questionIds`, practice attempt topics).
 *
 * ★★ HONEST DATA. Each source began recording on a known day (DATA_SOURCES). A metric is
 * reported only where its source could have seen it: a student who signed up before a
 * source existed gets `coverage: "partial"` and the UI says so; a summary metric counts
 * only students whose whole window lies inside the source's coverage, and returns the
 * eligible count beside it. Nothing is ever reported as 0 merely because it was not
 * recorded. A read that fails is `null` (unknown), never 0.
 *
 * ★ BOUNDED READS (worst case per request, Firestore document reads; a query that matches
 * nothing still bills 1, a count() bills 1 per 1000 index entries):
 *   list    : 50 rows x 6 = 300            (+ up to MAX_PLAN_SCAN = 1000 with a plan filter)
 *             (the 6th is signupSources/{uid} — SOURCE-1, one getAll document read per row)
 *             + COST-1: up to 30 ledger day documents per row = at most 1500 more
 *             (fewer for a new account: its window starts on its sign-up day)
 *   summary : up to MAX_SUMMARY_STUDENTS = 500 subscriptions + 3 per eligible student
 *             = at most 2000
 *   ai-cost : COST-1, loaded on request: up to MAX_COST_STUDENTS = 500 subscriptions +
 *             500 x MAX_COST_DAYS (30) ledger day documents = at most 15,500; the response
 *             returns the exact count in `reads`
 *   detail  : 1 + 20 + 120 + 120 + 100 + 200 + 50 = 611 (the 30-day AI cost reuses the
 *             ledger days already read — no extra read)
 * Auth `listUsers` is not a Firestore read; it is capped at MAX_AUTH_PAGES x 1000 users and
 * the response says when the cap was hit. No endpoint loops over every user's
 * subcollections.
 */

const { deriveEffectiveTier, toMillis } = require('../services/entitlement.cjs');
const { istDayKey } = require('../services/rateLimiter.cjs');
const {
  ACTIVITY_COLLECTION,
  ACTIVITY_SEGMENTS,
  ACTIVITY_EVENTS,
  MAX_FEED_PER_DAY,
  isPageKey,
} = require('./studentActivity.cjs');
const {
  USAGE_LEDGER_COLLECTION,
  LEDGER_SEGMENTS,
  TRIAL_COUNTER_FIELDS,
  LEDGER_SPEND_FIELD,
  sumLedgerCost,
  microInrToInr,
} = require('../services/usageLedger.cjs');
const { AI_TRIAL_COUNTER_FIELDS } = require('../services/fairUse.cjs');
const { SIGNUP_SOURCES_COLLECTION } = require('./signupSource.cjs');

const ADMIN_STUDENTS_PATH = '/api/admin/students';
const ADMIN_STUDENTS_SUMMARY_PATH = '/api/admin/students/summary';
/** COST-1: the AI-cost summary (loaded on request by the page; see handleAiCost). */
const ADMIN_STUDENTS_AI_COST_PATH = '/api/admin/students/ai-cost';

/* Top-level collections, named as constants so the studentDataMap drift guard sees them
 * (every one is already mapped). Subcollections are held as PROPERTIES, never as a
 * top-level `.collection(CONST)` shape, exactly like usageLedger's LEDGER_SEGMENTS. */
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const SESSION_RECORDS_COLLECTION = 'sessionRecords';
const PRACTICE_INSIGHTS_COLLECTION = 'practiceInsights';
const MOCK_SCORE_HISTORY_COLLECTION = 'mockScoreHistory';
const READ_SEGMENTS = Object.freeze({
  payments: 'payments',
  records: 'records',
  attempts: 'attempts',
  entries: 'entries',
});

/**
 * ★ WHEN EACH SOURCE BEGAN RECORDING (IST day of the merge of the PR that added its
 * writer; a deploy can lag a merge by minutes, so the first day may be partial).
 *   activityLog     #893  441a9274  2026-10-01 23:28Z = 2 Oct 2026 IST
 *   usageLedger     #842  91d7d1a8  2026-09-27
 *   sessionRecords  #338  d704b1cb  2026-07-06
 *   practice attempts + mock entries subcollections  #321  c5b4de6f  2026-07-01
 */
const DATA_SOURCES = Object.freeze({
  activityLog: Object.freeze({ since: '2026-10-02', pr: 893 }),
  usageLedger: Object.freeze({ since: '2026-09-27', pr: 842 }),
  sessionRecords: Object.freeze({ since: '2026-07-06', pr: 338 }),
  practiceAttempts: Object.freeze({ since: '2026-07-01', pr: 321 }),
  mockEntries: Object.freeze({ since: '2026-07-01', pr: 321 }),
});

const PAGE_SIZE = 50;
const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 10;
const MAX_PLAN_SCAN = 1000;
const MAX_SUMMARY_STUDENTS = 500;
const GET_ALL_CHUNK = 100;
const DETAIL_LIMITS = Object.freeze({
  payments: 20,
  activityDays: 120,
  usageDays: 120,
  sessions: 100,
  attempts: 200,
  mockEntries: 50,
});
const MAX_TOPICS_PER_SESSION = 5;

/**
 * COST-1 — AI cost from the usage ledger, by DAY KEY (the keyed getAll path fair use and the
 * detail already use; never a days query — see readUsageDays for why).
 *   ROW_COST_DAYS      the list column's window: the last 30 IST days, today included.
 *   MAX_COST_DAYS      the summary's longest window; "all" is the ledger's start, capped here.
 *   MAX_COST_STUDENTS  the summary reads the newest this many accounts (flagged when cut).
 * Every window starts no earlier than the ledger's first day or the student's sign-up day, so
 * a new account costs only its own days.
 */
const ROW_COST_DAYS = 30;
const MAX_COST_DAYS = 30;
const MAX_COST_STUDENTS = 500;
const COST_TOP_N = 10;
const COST_READ_CONCURRENCY = 4;
const COST_PLANS = Object.freeze(['trial', 'premium', 'basic', 'unknown']);

const PERIODS = Object.freeze({ all: null, 1: 1, 7: 7, 30: 30 });
const PLAN_FILTERS = Object.freeze(['all', 'trial', 'premium', 'basic']);
const TEST_SURFACES = Object.freeze(['chapter-test', 'full-mock']);
const CHECK_SURFACE = 'check-improve';
const SESSION_SURFACES = Object.freeze(['worksheet', 'chapter-test', 'full-mock', 'check-improve', 'quick-practice']);
const SESSION_STATUSES = Object.freeze(['graded', 'pending-upload', 'partial']);
const CHECK_GRADED_EVENT = 'check_graded';

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const UID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

/* ── Pure helpers ─────────────────────────────────────────────────────────── */

/** The UTC instant at which IST day `key` (yyyy-mm-dd) began. */
function istDayStartMs(key) {
  return Date.parse(`${key}T00:00:00.000Z`) - IST_OFFSET_MS;
}

/** IST day key `n` days after `key`. */
function addIstDays(key, n) {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function finiteOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function countOf(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** gRPC status numbers -> the names Firestore errors carry (google.rpc.Code). */
const GRPC_CODE_NAMES = Object.freeze({
  1: 'cancelled', 2: 'unknown', 3: 'invalid-argument', 4: 'deadline-exceeded', 5: 'not-found',
  6: 'already-exists', 7: 'permission-denied', 8: 'resource-exhausted', 9: 'failed-precondition',
  10: 'aborted', 11: 'out-of-range', 12: 'unimplemented', 13: 'internal', 14: 'unavailable',
  15: 'data-loss', 16: 'unauthenticated',
});

/**
 * COST-1 — a read failure's CODE only, safe to return to the admin page: a known gRPC name
 * ("permission-denied", "failed-precondition" …) or "error". Never the message (it can carry a
 * document path, i.e. a uid).
 */
function readErrorCode(err) {
  const code = err && err.code;
  if (typeof code === 'number' && Object.prototype.hasOwnProperty.call(GRPC_CODE_NAMES, code)) return GRPC_CODE_NAMES[code];
  if (typeof code === 'string') {
    const name = code.toLowerCase().replace(/_/g, '-');
    if (Object.values(GRPC_CODE_NAMES).includes(name)) return name;
  }
  return 'error';
}

/**
 * ACTIVITY-DETAIL-1 — a day's `pages` map, copied key by key: ONLY a key in the server's
 * page allowlist (studentActivity.cjs isPageKey) survives, still in its stored "~" form
 * (the admin view decodes it). `null` when the day has no `pages` field — a day recorded
 * before this change — so the view can say "not recorded", never "none".
 */
function activityPagesOf(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const pages = {};
  for (const [k, n] of Object.entries(value)) {
    if (isPageKey(k)) pages[k] = countOf(n);
  }
  return pages;
}

/**
 * ACTIVITY-DETAIL-1 — a day's ordered `feed`, rebuilt entry by entry as `{ t, k, n }`
 * with an allowlisted name only; anything else on an entry is never returned. At most
 * MAX_FEED_PER_DAY entries (the writer's own cap). `null` when the day has no feed.
 */
function activityFeedOf(value) {
  if (!Array.isArray(value)) return null;
  const feed = [];
  for (const e of value.slice(0, MAX_FEED_PER_DAY)) {
    if (!e || typeof e !== 'object') continue;
    const t = finiteOrNull(e.t);
    if (t === null) continue;
    if (e.k === 'page' && isPageKey(e.n)) feed.push({ t, k: 'page', n: e.n });
    else if (e.k === 'event' && ACTIVITY_EVENTS.includes(e.n)) feed.push({ t, k: 'event', n: e.n });
  }
  return feed;
}

function parseAuthTime(value) {
  if (!value) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

const METHOD_NAMES = Object.freeze({
  'google.com': 'google',
  password: 'email',
  phone: 'phone',
});

/** Firebase Auth user record -> the fields this page shows. Explicit; nothing else. */
function authRow(user) {
  const u = user || {};
  const meta = u.metadata || {};
  const providers = Array.isArray(u.providerData) ? u.providerData : [];
  const methods = [];
  for (const p of providers) {
    const id = p && typeof p.providerId === 'string' ? p.providerId : '';
    const name = Object.prototype.hasOwnProperty.call(METHOD_NAMES, id) ? METHOD_NAMES[id] : 'other';
    if (!methods.includes(name)) methods.push(name);
  }
  if (methods.length === 0) methods.push('anonymous');
  return {
    uid: String(u.uid || ''),
    email: typeof u.email === 'string' ? u.email : null,
    phone: typeof u.phoneNumber === 'string' ? u.phoneNumber : null,
    emailVerified: u.emailVerified === true,
    disabled: u.disabled === true,
    signInMethods: methods,
    createdMs: parseAuthTime(meta.creationTime),
    lastSignInMs: parseAuthTime(meta.lastSignInTime),
  };
}

/** Newest sign-up first; a missing creation time sorts last; uid breaks ties. */
function compareNewestFirst(a, b) {
  const am = a.createdMs === null ? -Infinity : a.createdMs;
  const bm = b.createdMs === null ? -Infinity : b.createdMs;
  if (am !== bm) return bm - am;
  return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0;
}

/** Rolling window: signed up within the last N x 24 h. `all` keeps everyone. */
function inPeriod(row, periodDays, nowMs) {
  if (periodDays === null) return true;
  return row.createdMs !== null && row.createdMs >= nowMs - periodDays * DAY_MS && row.createdMs <= nowMs;
}

/**
 * The plan, through entitlement.cjs's own derivation (never re-derived here).
 * `raw` undefined means "no document" (Basic); `null` means the read FAILED (unknown).
 */
function planOf(raw, nowMs) {
  if (raw === null) return { kind: 'unknown' };
  const { tier, trialEndsAtMs, passEndsAtMs } = deriveEffectiveTier(raw || {}, nowMs);
  if (tier === 'trial') {
    const left = trialEndsAtMs === null ? null : Math.max(0, Math.ceil((trialEndsAtMs - nowMs) / DAY_MS));
    return { kind: 'trial', trialEndsAtMs, daysLeft: left };
  }
  if (tier === 'premium') return { kind: 'premium', premiumUntilMs: passEndsAtMs };
  return { kind: 'basic' };
}

function coverageFor(source, createdMs) {
  if (createdMs === null) return 'partial';
  return createdMs >= istDayStartMs(DATA_SOURCES[source].since) ? 'full' : 'partial';
}

/**
 * COST-1 — the IST day keys one student's AI cost is read from: the window
 * [windowFirst .. todayKey], starting no earlier than the ledger's first day or the student's
 * sign-up day. `coverage` is "partial" when the window reaches back before the ledger existed
 * for a student who was already signed up then (days the ledger could not have seen).
 */
function costKeysFor(todayKey, windowFirst, createdMs) {
  const floors = [windowFirst, DATA_SOURCES.usageLedger.since];
  const signupKey = createdMs !== null && Number.isFinite(createdMs) ? istDayKey(createdMs) : null;
  if (signupKey) floors.push(signupKey);
  const first = floors.sort()[floors.length - 1];
  const keys = [];
  for (let k = first; k <= todayKey && keys.length < MAX_COST_DAYS; k = addIstDays(k, 1)) keys.push(k);
  const ledgerSince = DATA_SOURCES.usageLedger.since;
  const coverage = windowFirst < ledgerSince && (signupKey === null || signupKey < ledgerSince) ? 'partial' : 'full';
  return { keys, coverage };
}

/** Median of a non-empty list of numbers (the mean of the middle two for an even count). */
function medianOf(values) {
  const v = [...values].sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}

function parseListQuery(searchParams) {
  const period = searchParams.get('period') || 'all';
  if (!Object.prototype.hasOwnProperty.call(PERIODS, period)) return { error: 'invalid period' };
  const plan = searchParams.get('plan') || 'all';
  if (!PLAN_FILTERS.includes(plan)) return { error: 'invalid plan' };
  const pageRaw = searchParams.get('page') || '1';
  if (!/^[1-9][0-9]{0,4}$/.test(pageRaw)) return { error: 'invalid page' };
  return { period, periodDays: PERIODS[period], plan, page: Number(pageRaw) };
}

/* ── The routes ───────────────────────────────────────────────────────────── */

function createAdminStudentsRoutes(deps = {}) {
  const {
    sendJson,
    sendJsonWithHeaders,
    firebaseAdmin,
    adminFirestore,
    requireAdmin,
    now = () => Date.now(),
  } = deps;

  function send(res, status, body) {
    if (typeof sendJsonWithHeaders === 'function') return sendJsonWithHeaders(res, status, body, NO_STORE);
    return sendJson(res, status, body);
  }

  /** The P2 gate. Fails CLOSED if it was not handed in. */
  async function gate(req) {
    if (typeof requireAdmin !== 'function') {
      return { ok: false, status: 503, error: 'Admin endpoints disabled: admin gate not configured' };
    }
    return requireAdmin(req);
  }

  /* ── Firestore reads (each returns null on failure: unknown, never 0) ──── */

  const db = () => adminFirestore;

  /**
   * TUTOR-FIX-2 T8 — one student's usage-ledger days, read by DAY KEY.
   *
   * ★ WHY NOT A QUERY. The detail used to run
   *   usageLedger/{uid}/days .orderBy(documentId,'desc').limit(120).select(...)
   * and production answered "usageLedger: could not be read" for students — safeDocs returns null
   * ONLY when the query rejects, so that query rejected there (the exact server error was never
   * logged; the in-repo Firestore fake cannot reproduce it). Fair use already reads these SAME
   * day documents by key on every metered call (usageLedger.cjs readDays), so a keyed read is the
   * proven path. The window is the IST days from max(sign-up day, ledger start, today-119) to
   * today: a new account costs a handful of reads, and a day that has no document is simply
   * absent — an empty ledger is [] ("No tutor use yet"), never "unavailable".
   * Returns { docs, capped } or null when a read genuinely fails (logged, never thrown).
   */
  async function readUsageDays(uid, nowMs, createdMs) {
    const today = istDayKey(nowMs);
    const windowStart = addIstDays(today, -(DETAIL_LIMITS.usageDays - 1));
    const floors = [DATA_SOURCES.usageLedger.since];
    if (createdMs !== null && Number.isFinite(createdMs)) floors.push(istDayKey(createdMs));
    const floor = floors.sort()[floors.length - 1];
    const capped = floor < windowStart;
    const first = capped ? windowStart : floor;
    const keys = [];
    for (let k = first; k <= today && keys.length < DETAIL_LIMITS.usageDays; k = addIstDays(k, 1)) keys.push(k);
    try {
      const daysRef = db().collection(USAGE_LEDGER_COLLECTION).doc(uid).collection(LEDGER_SEGMENTS.days);
      const docs = [];
      for (let i = 0; i < keys.length; i += GET_ALL_CHUNK) {
        const refs = keys.slice(i, i + GET_ALL_CHUNK).map((k) => daysRef.doc(k));
        const snaps = await db().getAll(...refs);
        for (const s of snaps) if (s && s.exists) docs.push({ id: s.id, data: () => (typeof s.data === 'function' ? s.data() : null) });
      }
      return { docs, capped };
    } catch (err) {
      // COST-1: the failure's Firestore CODE (never its message) is returned beside the
      // "unavailable" state, so the next "usageLedger: could not be read" names its cause.
      const errorCode = readErrorCode(err);
      console.warn('[adminStudents] usage ledger read failed:', errorCode);
      return { docs: null, capped: false, errorCode };
    }
  }

  /**
   * COST-1 — many students' ledger days, by DAY KEY, in getAll chunks of GET_ALL_CHUNK
   * (COST_READ_CONCURRENCY chunks in flight). `entries` = [{ uid, keys }].
   * Returns { byUid, reads, failures, errorCode }: byUid[uid] is sumLedgerCost of the days that
   * EXIST, or null when any chunk holding that student's keys failed (unknown, never 0).
   * `reads` = document reads requested (a missing day document is still billed as one read).
   */
  async function readLedgerCosts(entries) {
    const pairs = [];
    for (const e of entries) for (const k of e.keys) pairs.push({ uid: e.uid, key: k });
    const datas = Object.create(null);
    const failed = Object.create(null);
    for (const e of entries) datas[e.uid] = [];
    let failures = 0;
    let errorCode = null;
    const chunks = [];
    for (let i = 0; i < pairs.length; i += GET_ALL_CHUNK) chunks.push(pairs.slice(i, i + GET_ALL_CHUNK));
    let next = 0;
    async function worker() {
      while (next < chunks.length) {
        const chunk = chunks[next];
        next += 1;
        try {
          const refs = chunk.map((p) =>
            db().collection(USAGE_LEDGER_COLLECTION).doc(p.uid).collection(LEDGER_SEGMENTS.days).doc(p.key));
          const snaps = await db().getAll(...refs);
          chunk.forEach((p, j) => {
            const s = snaps[j];
            if (s && s.exists) {
              const data = typeof s.data === 'function' ? s.data() : null;
              datas[p.uid].push(data && typeof data === 'object' ? data : {});
            }
          });
        } catch (err) {
          failures += 1;
          if (errorCode === null) errorCode = readErrorCode(err);
          for (const p of chunk) failed[p.uid] = true;
        }
      }
    }
    const workers = [];
    for (let w = 0; w < Math.min(COST_READ_CONCURRENCY, chunks.length); w += 1) workers.push(worker());
    await Promise.all(workers);
    if (failures > 0) console.warn('[adminStudents] ledger cost read failed:', errorCode, `(${failures} chunk(s))`);
    const byUid = Object.create(null);
    for (const e of entries) byUid[e.uid] = failed[e.uid] ? null : sumLedgerCost(datas[e.uid]);
    return { byUid, reads: pairs.length, failures, errorCode };
  }

  async function safeCount(query) {
    try {
      const snap = await query.count().get();
      const data = snap && typeof snap.data === 'function' ? snap.data() : null;
      return data ? countOf(data.count) : null;
    } catch {
      return null;
    }
  }

  async function safeDocs(query) {
    try {
      const snap = await query.get();
      return snap && Array.isArray(snap.docs) ? snap.docs : [];
    } catch {
      return null;
    }
  }

  /** subscriptions/{uid} for many uids: { uid: data | undefined (absent) | null (failed) }.
   *  Plain objects, not Maps, throughout this file: the no-writes source scan then finds
   *  no `.set(` of any kind in it. */
  async function readSubscriptions(uids) {
    const out = Object.create(null);
    for (let i = 0; i < uids.length; i += GET_ALL_CHUNK) {
      const chunk = uids.slice(i, i + GET_ALL_CHUNK);
      const refs = chunk.map((uid) => db().collection(SUBSCRIPTIONS_COLLECTION).doc(uid));
      try {
        const snaps = await db().getAll(...refs);
        chunk.forEach((uid, j) => {
          const s = snaps[j];
          out[uid] = s && s.exists ? s.data() || {} : undefined;
        });
      } catch {
        for (const uid of chunk) out[uid] = null;
      }
    }
    return out;
  }

  /** The coarse fields of signupSources/{uid} the Source column shows; nothing else leaves. */
  function sourceFields(data) {
    const d = data || {};
    const str = (v) => (typeof v === 'string' ? v : null);
    return {
      ref: str(d.ref),
      utm_source: str(d.utm_source),
      utm_medium: str(d.utm_medium),
      utm_campaign: str(d.utm_campaign),
      utm_content: str(d.utm_content),
      landing: str(d.landing),
      gclid: d.gclid === true,
      fbclid: d.fbclid === true,
    };
  }

  /** signupSources/{uid} for many uids: { uid: fields | null } — null = no doc (an account
   *  from before SOURCE-1) OR a failed read; the page shows both as "—", never a guess. */
  async function readSignupSources(uids) {
    const out = Object.create(null);
    for (let i = 0; i < uids.length; i += GET_ALL_CHUNK) {
      const chunk = uids.slice(i, i + GET_ALL_CHUNK);
      const refs = chunk.map((uid) => db().collection(SIGNUP_SOURCES_COLLECTION).doc(uid));
      try {
        const snaps = await db().getAll(...refs);
        chunk.forEach((uid, j) => {
          const snap = snaps[j];
          out[uid] = snap && snap.exists ? sourceFields(snap.data()) : null;
        });
      } catch {
        for (const uid of chunk) out[uid] = null;
      }
    }
    return out;
  }

  function activityDays(uid) {
    return db().collection(ACTIVITY_COLLECTION).doc(uid).collection(ACTIVITY_SEGMENTS.days);
  }
  function sessionRecords(uid) {
    return db().collection(SESSION_RECORDS_COLLECTION).doc(uid).collection(READ_SEGMENTS.records);
  }

  /** The four per-row numbers of the list, 6 reads (2 of them: pending-upload papers to subtract). */
  async function rowActivity(row) {
    const [daysActive, lastDocs, checks, allTests, ...pendingTests] = await Promise.all([
      safeCount(activityDays(row.uid)),
      safeDocs(activityDays(row.uid).orderBy('lastSeenMs', 'desc').limit(1).select('lastSeenMs')),
      safeCount(sessionRecords(row.uid).where('surface', '==', CHECK_SURFACE)),
      safeCount(sessionRecords(row.uid).where('surface', 'in', [...TEST_SURFACES])),
      // AWAIT-1-PAPERS: a downloaded paper writes a `pending-upload` record before anything is
      // answered; it is not a test taken. SUBTRACTED (equality-only counts, no composite index)
      // rather than filtered with `!=`, which would also drop legacy records that carry no status.
      ...TEST_SURFACES.map((s) =>
        safeCount(sessionRecords(row.uid).where('surface', '==', s).where('status', '==', 'pending-upload')),
      ),
    ]);
    const tests =
      allTests === null || pendingTests.some((n) => n === null)
        ? null
        : Math.max(0, allTests - pendingTests.reduce((a, n) => a + n, 0));
    let lastActiveMs = null;
    if (lastDocs && lastDocs.length > 0) {
      const d = lastDocs[0].data() || {};
      lastActiveMs = finiteOrNull(d.lastSeenMs);
    }
    return {
      activity: {
        source: 'activityLog',
        coverage: coverageFor('activityLog', row.createdMs),
        daysActive,
        lastActiveMs: lastDocs === null ? null : lastActiveMs,
      },
      answerChecks: { source: 'sessionRecords', coverage: coverageFor('sessionRecords', row.createdMs), count: checks },
      testsTaken: { source: 'sessionRecords', coverage: coverageFor('sessionRecords', row.createdMs), count: tests },
    };
  }

  /* ── Auth ─────────────────────────────────────────────────────────────── */

  async function listAuthUsers() {
    const auth = firebaseAdmin.auth();
    const rows = [];
    let pageToken;
    let pages = 0;
    do {
      const result = await auth.listUsers(AUTH_PAGE_SIZE, pageToken);
      for (const u of (result && result.users) || []) rows.push(authRow(u));
      pageToken = result && result.pageToken ? result.pageToken : undefined;
      pages += 1;
    } while (pageToken && pages < MAX_AUTH_PAGES);
    return { rows, truncated: Boolean(pageToken) };
  }

  /* ── GET /api/admin/students ──────────────────────────────────────────── */

  async function handleList(req, res, searchParams) {
    const q = parseListQuery(searchParams);
    if (q.error) return send(res, 400, { ok: false, error: q.error });
    const nowMs = now();

    const { rows: all, truncated: authTruncated } = await listAuthUsers();
    let candidates = all.filter((r) => inPeriod(r, q.periodDays, nowMs)).sort(compareNewestFirst);

    let subs = Object.create(null);
    let planScanTruncated = false;
    if (q.plan !== 'all') {
      if (candidates.length > MAX_PLAN_SCAN) {
        planScanTruncated = true;
        candidates = candidates.slice(0, MAX_PLAN_SCAN);
      }
      subs = await readSubscriptions(candidates.map((r) => r.uid));
      candidates = candidates.filter((r) => planOf(subs[r.uid], nowMs).kind === q.plan);
    }

    const total = candidates.length;
    const pageRows = candidates.slice((q.page - 1) * PAGE_SIZE, q.page * PAGE_SIZE);
    const missing = pageRows.map((r) => r.uid).filter((uid) => !(uid in subs));
    if (missing.length > 0) {
      const more = await readSubscriptions(missing);
      Object.assign(subs, more);
    }

    const sources = await readSignupSources(pageRows.map((r) => r.uid));

    // COST-1: each row's AI cost over the last ROW_COST_DAYS IST days, by day key.
    const todayKey = istDayKey(nowMs);
    const rowWindowFirst = addIstDays(todayKey, -(ROW_COST_DAYS - 1));
    const costPlans = Object.create(null);
    for (const r of pageRows) costPlans[r.uid] = costKeysFor(todayKey, rowWindowFirst, r.createdMs);
    const costs = await readLedgerCosts(pageRows.map((r) => ({ uid: r.uid, keys: costPlans[r.uid].keys })));

    const rows = await Promise.all(
      pageRows.map(async (r) => {
        const c = costs.byUid[r.uid];
        return {
          ...r,
          plan: planOf(subs[r.uid], nowMs),
          source: sources[r.uid] || null,
          ...(await rowActivity(r)),
          aiCost: {
            source: 'usageLedger',
            days: ROW_COST_DAYS,
            coverage: costPlans[r.uid].coverage,
            costInr: c ? microInrToInr(c.costMicroInr) : null,
            readFailed: c === null,
          },
        };
      })
    );

    return send(res, 200, {
      ok: true,
      generatedAtMs: nowMs,
      period: q.period,
      plan: q.plan,
      page: q.page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      rows,
      sources: DATA_SOURCES,
      limits: {
        authUsersScanned: all.length,
        authTruncated,
        planScanTruncated,
        maxPlanScan: MAX_PLAN_SCAN,
        ledgerDayReads: costs.reads,
      },
    });
  }

  /* ── GET /api/admin/students/ai-cost (COST-1) ─────────────────────────── */

  /**
   * AI cost for a SPEND window (not a sign-up cohort: a student who signed up months ago and
   * used the tutor today is in today's cost). period 1 = today (IST), 7 / 30 = the last 7 / 30
   * IST days, all = the ledger's first day, capped at MAX_COST_DAYS (flagged).
   * Reads: subscriptions/{uid} for the newest MAX_COST_STUDENTS accounts (plan split) + one
   * ledger day document per student per day in the window from the later of the window start,
   * the ledger's start and the student's sign-up day. Worst case 500 + 500 x 30 = 15,500; the
   * response states the exact count it read.
   */
  async function handleAiCost(req, res, searchParams) {
    const period = searchParams.get('period') || 'all';
    if (!Object.prototype.hasOwnProperty.call(PERIODS, period)) return send(res, 400, { ok: false, error: 'invalid period' });
    const nowMs = now();
    const todayKey = istDayKey(nowMs);
    const ledgerSince = DATA_SOURCES.usageLedger.since;
    const wanted = PERIODS[period];
    let windowFirst;
    let capped = false;
    if (wanted === null) {
      const capFirst = addIstDays(todayKey, -(MAX_COST_DAYS - 1));
      capped = ledgerSince < capFirst;
      windowFirst = capped ? capFirst : ledgerSince;
    } else {
      windowFirst = addIstDays(todayKey, -(Math.min(wanted, MAX_COST_DAYS) - 1));
    }

    const { rows: all, truncated: authTruncated } = await listAuthUsers();
    const everyone = [...all].sort(compareNewestFirst);
    const scanned = everyone.slice(0, MAX_COST_STUDENTS);
    const subs = await readSubscriptions(scanned.map((r) => r.uid));
    const plans = Object.create(null);
    for (const r of scanned) plans[r.uid] = costKeysFor(todayKey, windowFirst, r.createdMs);
    const costs = await readLedgerCosts(scanned.map((r) => ({ uid: r.uid, keys: plans[r.uid].keys })));

    let total = 0;
    let unknown = 0;
    let partial = 0;
    const spenders = [];
    const byPlan = Object.create(null);
    for (const p of COST_PLANS) byPlan[p] = { costMicroInr: 0, studentsWithCost: 0 };
    for (const r of scanned) {
      const c = costs.byUid[r.uid];
      if (c === null) {
        unknown += 1;
        continue;
      }
      if (plans[r.uid].coverage === 'partial') partial += 1;
      const micro = c.costMicroInr === null ? 0 : c.costMicroInr;
      if (!(micro > 0)) continue;
      total += micro;
      const plan = planOf(subs[r.uid], nowMs);
      const bucket = COST_PLANS.includes(plan.kind) ? plan.kind : 'unknown';
      byPlan[bucket].costMicroInr += micro;
      byPlan[bucket].studentsWithCost += 1;
      spenders.push({ row: r, plan, micro });
    }
    spenders.sort((a, b) => (b.micro !== a.micro ? b.micro - a.micro : compareNewestFirst(a.row, b.row)));
    const n = spenders.length;

    const planOut = {};
    for (const p of COST_PLANS) planOut[p] = { costInr: microInrToInr(byPlan[p].costMicroInr), studentsWithCost: byPlan[p].studentsWithCost };

    return send(res, 200, {
      ok: true,
      generatedAtMs: nowMs,
      period,
      window: { from: windowFirst < ledgerSince ? ledgerSince : windowFirst, to: todayKey, capped, maxDays: MAX_COST_DAYS },
      totalInr: microInrToInr(total),
      studentsWithCost: n,
      averageInr: n === 0 ? null : microInrToInr(Math.round(total / n)),
      medianInr: n === 0 ? null : microInrToInr(medianOf(spenders.map((s) => s.micro))),
      top: spenders.slice(0, COST_TOP_N).map((s) => ({
        uid: s.row.uid,
        email: s.row.email,
        phone: s.row.phone,
        plan: s.plan,
        costInr: microInrToInr(s.micro),
      })),
      byPlan: planOut,
      // Signed-out free checks have no uid to charge (usageLedger.cjs bindRequestUid), so the
      // ledger holds none of their cost; it is never shown as 0.
      signedOut: { ledgered: false },
      studentsScanned: scanned.length,
      studentsUnknown: unknown,
      studentsPartialCoverage: partial,
      reads: { subscriptions: scanned.length, ledgerDays: costs.reads, total: scanned.length + costs.reads },
      readErrors: costs.errorCode ? { usageLedger: costs.errorCode } : {},
      sources: DATA_SOURCES,
      limits: {
        authUsersScanned: all.length,
        authTruncated,
        studentsTruncated: everyone.length > scanned.length,
        maxStudents: MAX_COST_STUDENTS,
        maxDays: MAX_COST_DAYS,
      },
    });
  }

  /* ── GET /api/admin/students/summary ──────────────────────────────────── */

  async function handleSummary(req, res, searchParams) {
    const q = parseListQuery(searchParams);
    if (q.error) return send(res, 400, { ok: false, error: q.error });
    const nowMs = now();
    const todayKey = istDayKey(nowMs);
    const activitySince = DATA_SOURCES.activityLog.since;

    const { rows: all, truncated: authTruncated } = await listAuthUsers();
    const inWindow = all.filter((r) => inPeriod(r, q.periodDays, nowMs)).sort(compareNewestFirst);
    const scanned = inWindow.slice(0, MAX_SUMMARY_STUDENTS);
    const subs = await readSubscriptions(scanned.map((r) => r.uid));

    let trialStarts = 0;
    let subsUnknown = 0;
    for (const r of scanned) {
      const raw = subs[r.uid];
      if (raw === null) subsUnknown += 1;
      else if (raw && toMillis(raw.trialStartDate) !== null) trialStarts += 1;
    }

    const active = { count: 0, unknown: 0 };
    const day2 = { returned: 0, eligible: 0, unknown: 0 };
    const within7 = { returned: 0, eligible: 0, unknown: 0 };

    await Promise.all(
      scanned.map(async (r) => {
        if (r.createdMs === null) return;
        const signupKey = istDayKey(r.createdMs);
        const nextKey = addIstDays(signupKey, 1);
        const tasks = [];

        tasks.push(
          safeCount(activityDays(r.uid).where(`events.${CHECK_GRADED_EVENT}`, '>', 0)).then((n) => {
            if (n === null) active.unknown += 1;
            else if (n > 0) active.count += 1;
          })
        );

        // Day 2 = the IST calendar day after the sign-up day. Measurable only when that
        // day is inside activityLog coverage AND has finished.
        if (nextKey >= activitySince && nextKey < todayKey) {
          day2.eligible += 1;
          tasks.push(
            safeCount(activityDays(r.uid).where('firstSeenMs', '>=', istDayStartMs(nextKey))
              .where('firstSeenMs', '<', istDayStartMs(addIstDays(nextKey, 1)))).then((n) => {
              if (n === null) day2.unknown += 1;
              else if (n > 0) day2.returned += 1;
            })
          );
        }

        // Within 7 days = any of the 7 IST days after the sign-up day. Measurable only
        // when that whole window is inside coverage AND has finished.
        if (nextKey >= activitySince && addIstDays(signupKey, 7) < todayKey) {
          within7.eligible += 1;
          tasks.push(
            safeCount(activityDays(r.uid).where('firstSeenMs', '>=', istDayStartMs(nextKey))
              .where('firstSeenMs', '<', istDayStartMs(addIstDays(signupKey, 8)))).then((n) => {
              if (n === null) within7.unknown += 1;
              else if (n > 0) within7.returned += 1;
            })
          );
        }
        await Promise.all(tasks);
      })
    );

    return send(res, 200, {
      ok: true,
      generatedAtMs: nowMs,
      period: q.period,
      signUps: inWindow.length,
      studentsMeasured: scanned.length,
      trialStarts: { count: trialStarts, unknown: subsUnknown, source: 'subscriptions' },
      activeStudents: { ...active, source: 'activityLog', since: activitySince },
      returnedDay2: { ...day2, source: 'activityLog', since: activitySince },
      returnedWithin7Days: { ...within7, source: 'activityLog', since: activitySince },
      sources: DATA_SOURCES,
      limits: {
        authUsersScanned: all.length,
        authTruncated,
        summaryTruncated: inWindow.length > scanned.length,
        maxSummaryStudents: MAX_SUMMARY_STUDENTS,
      },
    });
  }

  /* ── GET /api/admin/students/{uid} ────────────────────────────────────── */

  async function handleDetail(req, res, uid) {
    if (!UID_PATTERN.test(uid)) return send(res, 400, { ok: false, error: 'invalid uid' });
    const nowMs = now();

    let user;
    try {
      user = await firebaseAdmin.auth().getUser(uid);
    } catch (err) {
      if (err && err.code === 'auth/user-not-found') return send(res, 404, { ok: false, error: 'no such student' });
      throw err;
    }
    const profile = authRow(user);
    const studentDoc = (name) => db().collection(name).doc(uid);

    const [subSnap, payments, actDays, usageDays, sessions, attempts, mocks] = await Promise.all([
      studentDoc(SUBSCRIPTIONS_COLLECTION).get().then((s) => (s && s.exists ? s.data() || {} : undefined)).catch(() => null),
      safeDocs(studentDoc(SUBSCRIPTIONS_COLLECTION).collection(READ_SEGMENTS.payments)
        .orderBy('grantedAt', 'desc').limit(DETAIL_LIMITS.payments).select('passType', 'pricePaidInr', 'grantedAt')),
      safeDocs(activityDays(uid).orderBy('firstSeenMs', 'desc').limit(DETAIL_LIMITS.activityDays)
        .select('firstSeenMs', 'lastSeenMs', 'sections', 'events', 'pages', 'feed', 'feedTruncated')),
      // TUTOR-FIX-2 T8: by DAY KEY, not a query (see readUsageDays).
      readUsageDays(uid, nowMs, profile.createdMs),
      safeDocs(sessionRecords(uid).orderBy('gradedAt', 'desc').limit(DETAIL_LIMITS.sessions)
        .select('surface', 'subject', 'topicKeys', 'marksAwarded', 'marksTotal', 'status', 'gradedAt')),
      safeDocs(studentDoc(PRACTICE_INSIGHTS_COLLECTION).collection(READ_SEGMENTS.attempts)
        .orderBy('timestamp', 'desc').limit(DETAIL_LIMITS.attempts)
        .select('timestamp', 'marksScored', 'marksAvailable', 'correct')),
      safeDocs(studentDoc(MOCK_SCORE_HISTORY_COLLECTION).collection(READ_SEGMENTS.entries)
        .orderBy('timestamp', 'desc').limit(DETAIL_LIMITS.mockEntries)
        .select('subject', 'totalMarks', 'maxMarks', 'percent', 'timestamp')),
    ]);

    const days = Object.create(null);
    const dayOf = (key) => {
      if (!(key in days)) {
        days[key] = {
          day: key,
          activity: null,
          ai: null,
          sessions: [],
          practice: null,
          mocks: [],
          plan: [],
        };
      }
      return days[key];
    };
    const keyOfMs = (ms) => (Number.isFinite(ms) ? istDayKey(ms) : null);

    for (const d of actDays || []) {
      const v = d.data() || {};
      const sections = {};
      for (const [k, n] of Object.entries(v.sections && typeof v.sections === 'object' ? v.sections : {})) {
        if (/^[a-z][a-z0-9-]{0,40}$/.test(k)) sections[k] = countOf(n);
      }
      const events = {};
      for (const [k, n] of Object.entries(v.events && typeof v.events === 'object' ? v.events : {})) {
        if (/^[a-z][a-z0-9_]{0,40}$/.test(k)) events[k] = countOf(n);
      }
      const key = /^\d{4}-\d{2}-\d{2}$/.test(d.id) ? d.id : keyOfMs(finiteOrNull(v.firstSeenMs));
      if (!key) continue;
      dayOf(key).activity = {
        firstSeenMs: finiteOrNull(v.firstSeenMs),
        lastSeenMs: finiteOrNull(v.lastSeenMs),
        sections,
        events,
        // ACTIVITY-DETAIL-1: pages visited + the ordered feed (null = not recorded that day).
        pages: activityPagesOf(v.pages),
        feed: activityFeedOf(v.feed),
        feedTruncated: v.feedTruncated === true,
      };
    }

    for (const d of (usageDays && usageDays.docs) || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.id)) continue;
      const v = d.data() || {};
      // HARDEN-1 PR-2 (FU-A17-ADMIN-SPEND-FIELD): TWO separate numbers, never one copied into
      // the other. `costInr` is the USAGE METER (costMicroInr — graded share only; what counts
      // against the premium cap). `providerSpendInr` is the ACTUAL AI SPEND
      // (providerSpendMicroInr — what the provider billed, written since #957). A day recorded
      // before #957 has no spend field: null = "not recorded", never 0 and never the meter.
      const spendRaw = v[LEDGER_SPEND_FIELD];
      const providerSpendInr =
        typeof spendRaw === 'number' && Number.isFinite(spendRaw) && spendRaw >= 0
          ? Math.round(spendRaw / 10000) / 100
          : null;
      const ai = { calls: countOf(v.calls), costInr: Math.round(countOf(v.costMicroInr) / 10000) / 100, providerSpendInr };
      for (const [name, field] of Object.entries(TRIAL_COUNTER_FIELDS)) ai[name] = countOf(v[field]);
      // TUTOR-FIX-2 T8: tutor messages that day, from the same document (fair use's trial tutor
      // counter). Written for trial-tier calls only, so a day without it is null = not recorded,
      // never 0 (a Premium student's tutor calls are inside `calls`).
      const tutorRaw = v[AI_TRIAL_COUNTER_FIELDS.tutor];
      ai.tutorMessages = typeof tutorRaw === 'number' && Number.isFinite(tutorRaw) && tutorRaw >= 0 ? countOf(tutorRaw) : null;
      dayOf(d.id).ai = ai;
    }

    for (const d of sessions || []) {
      const v = d.data() || {};
      const at = finiteOrNull(v.gradedAt);
      const key = keyOfMs(at);
      if (!key) continue;
      dayOf(key).sessions.push({
        surface: SESSION_SURFACES.includes(v.surface) ? v.surface : 'other',
        subject: v.subject === 'maths' || v.subject === 'science' ? v.subject : null,
        topics: Array.isArray(v.topicKeys)
          ? v.topicKeys.filter((t) => typeof t === 'string' && /^[a-z0-9-]{1,60}$/.test(t)).slice(0, MAX_TOPICS_PER_SESSION)
          : [],
        marksAwarded: finiteOrNull(v.marksAwarded),
        marksTotal: finiteOrNull(v.marksTotal),
        status: SESSION_STATUSES.includes(v.status) ? v.status : null,
        atMs: at,
      });
    }

    for (const d of attempts || []) {
      const v = d.data() || {};
      const key = keyOfMs(finiteOrNull(v.timestamp));
      if (!key) continue;
      const day = dayOf(key);
      if (!day.practice) day.practice = { attempts: 0, correct: 0, marksScored: 0, marksAvailable: 0 };
      day.practice.attempts += 1;
      if (v.correct === true) day.practice.correct += 1;
      day.practice.marksScored += finiteOrNull(v.marksScored) || 0;
      day.practice.marksAvailable += finiteOrNull(v.marksAvailable) || 0;
    }

    for (const d of mocks || []) {
      const v = d.data() || {};
      const at = finiteOrNull(v.timestamp);
      const key = keyOfMs(at);
      if (!key) continue;
      dayOf(key).mocks.push({
        subject: v.subject === 'Maths' || v.subject === 'Science' ? v.subject : null,
        totalMarks: finiteOrNull(v.totalMarks),
        maxMarks: finiteOrNull(v.maxMarks),
        percent: finiteOrNull(v.percent),
        atMs: at,
      });
    }

    // Plan events: ONLY what the stored timestamps support. subscriptions/{uid} keeps no
    // history, so the current plan plus these instants is the whole truth.
    const raw = subSnap;
    const planEvents = [];
    const addPlan = (kind, ms, extra) => {
      if (ms === null || !Number.isFinite(ms)) return;
      planEvents.push({ kind, atMs: ms, ...(extra || {}) });
    };
    if (profile.createdMs !== null) addPlan('signed-up', profile.createdMs);
    if (raw) {
      const trialStart = toMillis(raw.trialStartDate);
      addPlan('trial-started', trialStart);
      if (trialStart !== null) {
        const { trialEndsAtMs } = deriveEffectiveTier(raw, nowMs);
        if (trialEndsAtMs !== null && trialEndsAtMs <= nowMs) addPlan('trial-ended', trialEndsAtMs);
      }
      addPlan('premium-since', toMillis(raw.premiumSince));
      addPlan('pass-started', toMillis(raw.passStart), {
        passType: typeof raw.passType === 'string' ? raw.passType : null,
      });
      const passEnd = toMillis(raw.passEnd);
      if (passEnd !== null && passEnd <= nowMs) addPlan('pass-ended', passEnd);
    }
    for (const d of payments || []) {
      const v = d.data() || {};
      addPlan('payment', toMillis(v.grantedAt), {
        passType: typeof v.passType === 'string' ? v.passType : null,
        pricePaidInr: finiteOrNull(v.pricePaidInr),
      });
    }
    for (const ev of planEvents) dayOf(istDayKey(ev.atMs)).plan.push(ev);

    const signupKey = profile.createdMs === null ? null : istDayKey(profile.createdMs);
    const timeline = Object.values(days)
      .sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0))
      .map((d) => ({
        ...d,
        dayNumber: signupKey ? Math.round((Date.parse(d.day) - Date.parse(signupKey)) / DAY_MS) + 1 : null,
      }));

    const truncatedSource = (list, cap) => (list === null ? 'unavailable' : list.length >= cap ? 'truncated' : 'complete');

    // COST-1: the student's AI cost over the last ROW_COST_DAYS IST days, from the ledger days
    // already read above (no extra read). null = could not be read / no ledger in the window.
    const todayKey = istDayKey(nowMs);
    const window30 = costKeysFor(todayKey, addIstDays(todayKey, -(ROW_COST_DAYS - 1)), profile.createdMs);
    const inWindow = Object.create(null);
    for (const k of window30.keys) inWindow[k] = true;
    const usageOk = usageDays && usageDays.docs !== null;
    const windowDatas = usageOk ? usageDays.docs.filter((d) => inWindow[d.id] === true).map((d) => d.data() || {}) : [];
    const cost30 = usageOk ? sumLedgerCost(windowDatas) : null;
    const aiCost30d = {
      source: 'usageLedger',
      days: ROW_COST_DAYS,
      from: window30.keys.length > 0 ? window30.keys[0] : todayKey,
      to: todayKey,
      coverage: window30.coverage,
      costInr: cost30 ? microInrToInr(cost30.costMicroInr) : null,
      gradingFullCostInr: cost30 ? microInrToInr(cost30.providerSpendMicroInr) : null,
      calls: cost30 ? cost30.calls : null,
      readFailed: !usageOk,
      breakdown: 'not-recorded',
    };
    const readErrors = {};
    if (!usageOk && usageDays && usageDays.errorCode) readErrors.usageLedger = usageDays.errorCode;

    return send(res, 200, {
      ok: true,
      generatedAtMs: nowMs,
      student: { ...profile, plan: planOf(raw, nowMs) },
      timeline,
      aiCost30d,
      readErrors,
      sources: DATA_SOURCES,
      reads: {
        activityLog: truncatedSource(actDays, DETAIL_LIMITS.activityDays),
        usageLedger: !usageDays || usageDays.docs === null ? 'unavailable' : usageDays.capped ? 'truncated' : 'complete',
        sessionRecords: truncatedSource(sessions, DETAIL_LIMITS.sessions),
        practiceAttempts: truncatedSource(attempts, DETAIL_LIMITS.attempts),
        mockEntries: truncatedSource(mocks, DETAIL_LIMITS.mockEntries),
        payments: truncatedSource(payments, DETAIL_LIMITS.payments),
        subscription: raw === null ? 'unavailable' : 'complete',
      },
      limits: DETAIL_LIMITS,
    });
  }

  /* ── Dispatch ─────────────────────────────────────────────────────────── */

  async function handle(req, res) {
    try {
      // ★ THE GATE RUNS FIRST — before the path is parsed or anything is read.
      const auth = await gate(req);
      if (!auth || !auth.ok) {
        return send(res, (auth && auth.status) || 503, { ok: false, error: (auth && auth.error) || 'Admin auth unavailable' });
      }
      if (!adminFirestore || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function') {
        return send(res, 503, { ok: false, error: 'Admin data unavailable: firebase-admin not initialised' });
      }
      const url = new URL(String(req.url || ''), 'http://local');
      const path = url.pathname.replace(/\/+$/, '');
      if (path === ADMIN_STUDENTS_PATH) return await handleList(req, res, url.searchParams);
      if (path === ADMIN_STUDENTS_SUMMARY_PATH) return await handleSummary(req, res, url.searchParams);
      // COST-1: matched BEFORE the {uid} prefix ("ai-cost" would otherwise read as a uid).
      if (path === ADMIN_STUDENTS_AI_COST_PATH) return await handleAiCost(req, res, url.searchParams);
      const prefix = `${ADMIN_STUDENTS_PATH}/`;
      if (path.startsWith(prefix)) {
        let uid;
        try {
          uid = decodeURIComponent(path.slice(prefix.length));
        } catch {
          return send(res, 400, { ok: false, error: 'invalid uid' });
        }
        return await handleDetail(req, res, uid);
      }
      return send(res, 404, { ok: false, error: 'Not Found' });
    } catch {
      return send(res, 500, { ok: false, error: 'students read failed' });
    }
  }

  return { handle };
}

/**
 * The ONE-LINE mount used by server/index.cjs. Built once, on the first request, from
 * the deps that line passes (the studentActivity.cjs pattern).
 */
let mounted = null;
function handleAdminStudents(req, res, deps) {
  if (!mounted) mounted = createAdminStudentsRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = {
  createAdminStudentsRoutes,
  handleAdminStudents,
  authRow,
  planOf,
  compareNewestFirst,
  inPeriod,
  istDayStartMs,
  addIstDays,
  ADMIN_STUDENTS_PATH,
  ADMIN_STUDENTS_SUMMARY_PATH,
  ADMIN_STUDENTS_AI_COST_PATH,
  costKeysFor,
  medianOf,
  readErrorCode,
  ROW_COST_DAYS,
  MAX_COST_DAYS,
  MAX_COST_STUDENTS,
  DATA_SOURCES,
  PAGE_SIZE,
  MAX_AUTH_PAGES,
  MAX_PLAN_SCAN,
  MAX_SUMMARY_STUDENTS,
  DETAIL_LIMITS,
};
