/**
 * adminStudents — the admin "Students" page's READ API (STUDENT-ACTIVITY-1, PR-2).
 *
 *   GET /api/admin/students            the list: newest sign-ups first, 50 per page
 *   GET /api/admin/students/summary    the summary cards for a sign-up period
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
 *   list    : 50 rows x 5 = 250            (+ up to MAX_PLAN_SCAN = 1000 with a plan filter)
 *   summary : up to MAX_SUMMARY_STUDENTS = 500 subscriptions + 3 per eligible student
 *             = at most 2000
 *   detail  : 1 + 20 + 120 + 120 + 100 + 200 + 50 = 611
 * Auth `listUsers` is not a Firestore read; it is capped at MAX_AUTH_PAGES x 1000 users and
 * the response says when the cap was hit. No endpoint loops over every user's
 * subcollections.
 */

const { deriveEffectiveTier, toMillis } = require('../services/entitlement.cjs');
const { istDayKey } = require('../services/rateLimiter.cjs');
const { ACTIVITY_COLLECTION, ACTIVITY_SEGMENTS } = require('./studentActivity.cjs');
const {
  USAGE_LEDGER_COLLECTION,
  LEDGER_SEGMENTS,
  TRIAL_COUNTER_FIELDS,
} = require('../services/usageLedger.cjs');

const ADMIN_STUDENTS_PATH = '/api/admin/students';
const ADMIN_STUDENTS_SUMMARY_PATH = '/api/admin/students/summary';

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

  function documentIdPath() {
    const fs = firebaseAdmin && firebaseAdmin.firestore;
    return fs && fs.FieldPath && typeof fs.FieldPath.documentId === 'function' ? fs.FieldPath.documentId() : null;
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

  function activityDays(uid) {
    return db().collection(ACTIVITY_COLLECTION).doc(uid).collection(ACTIVITY_SEGMENTS.days);
  }
  function sessionRecords(uid) {
    return db().collection(SESSION_RECORDS_COLLECTION).doc(uid).collection(READ_SEGMENTS.records);
  }

  /** The four per-row numbers of the list, 4 reads. */
  async function rowActivity(row) {
    const [daysActive, lastDocs, checks, tests] = await Promise.all([
      safeCount(activityDays(row.uid)),
      safeDocs(activityDays(row.uid).orderBy('lastSeenMs', 'desc').limit(1).select('lastSeenMs')),
      safeCount(sessionRecords(row.uid).where('surface', '==', CHECK_SURFACE)),
      safeCount(sessionRecords(row.uid).where('surface', 'in', [...TEST_SURFACES])),
    ]);
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

    const rows = await Promise.all(
      pageRows.map(async (r) => ({
        ...r,
        plan: planOf(subs[r.uid], nowMs),
        ...(await rowActivity(r)),
      }))
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
    const docId = documentIdPath();

    const [subSnap, payments, actDays, usageDays, sessions, attempts, mocks] = await Promise.all([
      studentDoc(SUBSCRIPTIONS_COLLECTION).get().then((s) => (s && s.exists ? s.data() || {} : undefined)).catch(() => null),
      safeDocs(studentDoc(SUBSCRIPTIONS_COLLECTION).collection(READ_SEGMENTS.payments)
        .orderBy('grantedAt', 'desc').limit(DETAIL_LIMITS.payments).select('passType', 'pricePaidInr', 'grantedAt')),
      safeDocs(activityDays(uid).orderBy('firstSeenMs', 'desc').limit(DETAIL_LIMITS.activityDays)
        .select('firstSeenMs', 'lastSeenMs', 'sections', 'events')),
      safeDocs(
        (docId
          ? studentDoc(USAGE_LEDGER_COLLECTION).collection(LEDGER_SEGMENTS.days).orderBy(docId, 'desc')
          : studentDoc(USAGE_LEDGER_COLLECTION).collection(LEDGER_SEGMENTS.days))
          .limit(DETAIL_LIMITS.usageDays)
          .select('calls', 'costMicroInr', ...Object.values(TRIAL_COUNTER_FIELDS))
      ),
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
      };
    }

    for (const d of usageDays || []) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.id)) continue;
      const v = d.data() || {};
      const ai = { calls: countOf(v.calls), costInr: Math.round(countOf(v.costMicroInr) / 10000) / 100 };
      for (const [name, field] of Object.entries(TRIAL_COUNTER_FIELDS)) ai[name] = countOf(v[field]);
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

    return send(res, 200, {
      ok: true,
      generatedAtMs: nowMs,
      student: { ...profile, plan: planOf(raw, nowMs) },
      timeline,
      sources: DATA_SOURCES,
      reads: {
        activityLog: truncatedSource(actDays, DETAIL_LIMITS.activityDays),
        usageLedger: truncatedSource(usageDays, DETAIL_LIMITS.usageDays),
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
  DATA_SOURCES,
  PAGE_SIZE,
  MAX_AUTH_PAGES,
  MAX_PLAN_SCAN,
  MAX_SUMMARY_STUDENTS,
  DETAIL_LIMITS,
};
