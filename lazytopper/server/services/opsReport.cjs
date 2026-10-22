/**
 * opsReport.cjs — OPS-REPORT-1 (owner, 22 Oct 2026): ONE plain daily health email to the owner,
 * sent by our own server at 08:00 IST about YESTERDAY (the IST day). No PC, no Claude, no new
 * third-party token: it reuses the trial email's Resend key (RESEND_API_KEY) and REST call.
 *
 *   ★ DARK BY DEFAULT, exactly like TRIAL-END-1. Nothing is scheduled unless OPS_REPORT_ENABLED
 *     is set. Enabled, it is a DRY RUN (logs the report, writes nothing, sends nothing) until the
 *     owner ALSO sets OPS_REPORT_DRY_RUN=0 — and a real send further needs RESEND_API_KEY, a
 *     sender (OPS_REPORT_FROM, else TRIAL_EMAIL_FROM) and OPS_REPORT_TO. Missing one, it stays a
 *     dry run and says which is missing.
 *
 *   ★ ONE SEND PER IST DATE, ACROSS RESTARTS AND INSTANCES. Before sending, the job CLAIMS
 *     `opsReports/{YYYY-MM-DD}` (the IST send date) in a Firestore TRANSACTION. A second instance
 *     or an overlapping deploy finds the claim and does nothing. A crash between claim and send
 *     leaves the claim: at most once, never twice. Only a send that certainly did NOT go out
 *     (HTTP 429/5xx, network) releases the claim, and the retry carries the same provider
 *     Idempotency-Key. The document holds only the day, a status and timestamps — no uid, no
 *     numbers, nothing about a student (studentDataMap NON_STUDENT_COLLECTIONS). Admin SDK only;
 *     no client rule matches it, so firestore.rules' deny-all covers it unchanged.
 *
 *   ★ EVERY NUMBER IS A REAL READ. A source that cannot be read says "couldn't read (<code>)" and
 *     is listed under "⚠ Look at this"; it is never printed as 0. Process counters (fair-use
 *     refusals, payment errors) are labelled "since server start" with the uptime, because they
 *     are not stored per day.
 *
 *   ★ PRIVATE. The email goes to OPS_REPORT_TO only. Students appear as the first 6 characters
 *     of their uid; no email, name, phone or answer text is read into the report.
 *
 *   ★ BOUNDED READS — see WORST_CASE_READS below (stated in the PR).
 */

const { istDayKey } = require('./rateLimiter.cjs');
const {
  USAGE_LEDGER_COLLECTION,
  LEDGER_SEGMENTS,
  ledgerDayCost,
  microInrToInr,
} = require('./usageLedger.cjs');
const { isTopupProduct } = require('./passPricing.cjs');
const {
  RESEND_ENDPOINT,
  TRIAL_EMAILS_COLLECTION,
  TRIAL_EMAIL_DAILY_COLLECTION,
} = require('./trialEndingEmail.cjs');

/** The claim ledger: one document per IST send date. Uid-free (NON_STUDENT_COLLECTIONS). */
const OPS_REPORTS_COLLECTION = 'opsReports';
const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const SESSION_RECORDS_COLLECTION = 'sessionRecords';
const PAY_ORDERS_COLLECTION = 'payOrders';
// Subcollections held as PROPERTIES (the studentDataMap drift-scanner convention).
const SESSION_RECORDS_SEGMENTS = Object.freeze({ records: 'records' });

const OPS_REPORT_SEND_NOW_PATH = '/api/admin/ops-report/send-now';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const IST_OFFSET_MS = 5.5 * HOUR_MS;
/** 08:00 IST. */
const RUN_HOUR_IST = 8;
const FIRST_RUN_DELAY_MS = 2 * MINUTE_MS;
const RETRY_DELAY_MS = 30 * MINUTE_MS;
const MAX_ATTEMPTS = 3;
const SEND_TIMEOUT_MS = 15 * 1000;
const MANUAL_COOLDOWN_MS = 60 * 1000;

// ── Read bounds ──────────────────────────────────────────────────────────────────────────
const AUTH_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 10;
const GRADING_MAX_STUDENTS = 300;
const GRADING_PER_STUDENT_LIMIT = 40;
const COST_MAX_STUDENTS = 300;
/** Yesterday + the 7 IST days before it. */
const COST_DAYS = 8;
const PAY_ORDERS_LIMIT = 200;
const GET_ALL_CHUNK = 100;
const READ_CONCURRENCY = 8;
/** count() bills one read per 1000 index entries; at our scale each count is 1 read. */
const COUNT_QUERIES = 2 /* trials */ + 2 /* trial emails sent / failed */;
const DOC_GETS = 1 /* trialEmailDaily */ + 1 /* the claim transaction */;

/**
 * Worst-case Firestore document reads for ONE report (Auth listUsers is not a Firestore read):
 *   gradings 300 students x 40 records + AI cost 300 x 8 ledger days + 2 x 200 payment orders
 *   + 4 counts + 2 document gets = 14,806.
 */
const WORST_CASE_READS =
  GRADING_MAX_STUDENTS * GRADING_PER_STUDENT_LIMIT +
  COST_MAX_STUDENTS * COST_DAYS +
  2 * PAY_ORDERS_LIMIT +
  COUNT_QUERIES +
  DOC_GETS;

const SURFACES = Object.freeze(['check-improve', 'worksheet', 'chapter-test', 'full-mock', 'quick-practice']);
const SURFACE_LABELS = Object.freeze({
  'check-improve': 'Check & Improve',
  worksheet: 'Worksheet',
  'chapter-test': 'Chapter Test',
  'full-mock': 'Full Mock',
  'quick-practice': 'Quick Practice',
});

const GRPC_CODE_NAMES = Object.freeze({
  1: 'cancelled', 2: 'unknown', 3: 'invalid-argument', 4: 'deadline-exceeded', 5: 'not-found',
  6: 'already-exists', 7: 'permission-denied', 8: 'resource-exhausted', 9: 'failed-precondition',
  10: 'aborted', 11: 'out-of-range', 12: 'unimplemented', 13: 'internal', 14: 'unavailable',
  15: 'data-loss', 16: 'unauthenticated',
});

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Config ───────────────────────────────────────────────────────────────────────────────

function isOnFlag(v) {
  return typeof v === 'string' && /^(1|true|yes|on)$/i.test(v.trim());
}
function isOffFlag(v) {
  return typeof v === 'string' && /^(0|false|no|off)$/i.test(v.trim());
}
const EMAIL_RE = /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/;

/**
 * Resolve every switch. PURE. `mode`: off | dry-run | misconfigured | send (as TRIAL-END-1).
 * `canSend` ignores OPS_REPORT_ENABLED: the admin send-now may test the email before the
 * schedule is switched on, but never while the dry run is on or a setting is missing.
 */
function resolveOpsReportConfig(env = process.env) {
  const e = env || {};
  const str = (k) => (typeof e[k] === 'string' ? e[k].trim() : '');
  const enabled = isOnFlag(e.OPS_REPORT_ENABLED);
  const dryRun = !isOffFlag(e.OPS_REPORT_DRY_RUN);
  const apiKey = str('RESEND_API_KEY');
  const from = str('OPS_REPORT_FROM') || str('TRIAL_EMAIL_FROM');
  const toRaw = str('OPS_REPORT_TO');
  const to = EMAIL_RE.test(toRaw) ? toRaw : '';
  const missing = [];
  if (!apiKey) missing.push('RESEND_API_KEY');
  if (!from) missing.push('OPS_REPORT_FROM');
  if (!to) missing.push('OPS_REPORT_TO');
  let mode = 'off';
  if (enabled) mode = dryRun ? 'dry-run' : missing.length ? 'misconfigured' : 'send';
  return { enabled, dryRun, mode, missing, apiKey, from, to, canSend: !dryRun && missing.length === 0 };
}

/** The one boot log line. Never prints the key or the recipient address. */
function describeConfig(config) {
  if (config.mode === 'off') return '[ops-report] OFF (OPS_REPORT_ENABLED not set) - no daily report, nothing scheduled.';
  if (config.mode === 'dry-run') return '[ops-report] DRY RUN - logs the daily report at 08:00 IST; sends and writes nothing. Set OPS_REPORT_DRY_RUN=0 to send.';
  if (config.mode === 'misconfigured') return `[ops-report] DRY RUN (misconfigured: missing ${config.missing.join(', ')}) - nothing is sent until these are set.`;
  return '[ops-report] SENDING the daily report via Resend at 08:00 IST to OPS_REPORT_TO.';
}

// ── Time (pure) ──────────────────────────────────────────────────────────────────────────

/** The UTC instant at which IST day `key` (yyyy-mm-dd) began. */
function istDayStartMs(key) {
  return Date.parse(`${key}T00:00:00.000Z`) - IST_OFFSET_MS;
}
function addIstDays(key, n) {
  return new Date(Date.parse(`${key}T00:00:00.000Z`) + n * DAY_MS).toISOString().slice(0, 10);
}
/** Is the IST time of day at `nowMs` at or after 08:00? */
function isDueAt(nowMs) {
  const istMs = nowMs + IST_OFFSET_MS;
  const sinceMidnight = istMs - Math.floor(istMs / DAY_MS) * DAY_MS;
  return sinceMidnight >= RUN_HOUR_IST * HOUR_MS;
}
/** Milliseconds from `nowMs` to the NEXT 08:00 IST strictly after it (> 0). */
function msUntilNextRun(nowMs) {
  const istMs = nowMs + IST_OFFSET_MS;
  const target = Math.floor(istMs / DAY_MS) * DAY_MS + RUN_HOUR_IST * HOUR_MS;
  return istMs < target ? target - istMs : target + DAY_MS - istMs;
}
/** "Wed 21 Oct 2026" for an IST day key. */
function formatDayKey(key) {
  const d = new Date(`${key}T00:00:00.000Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────

function readErrorCode(err) {
  const code = err && err.code;
  if (typeof code === 'number' && Object.prototype.hasOwnProperty.call(GRPC_CODE_NAMES, code)) return GRPC_CODE_NAMES[code];
  if (typeof code === 'string') {
    if (/^auth\/[a-z-]{1,60}$/.test(code)) return code;
    const name = code.toLowerCase().replace(/_/g, '-');
    if (Object.values(GRPC_CODE_NAMES).includes(name)) return name;
  }
  return 'error';
}
function toCount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function msOfStamp(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (v instanceof Date) return v.getTime();
  if (v && typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v === 'string') {
    const n = Date.parse(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function uidPrefix(uid) {
  return String(uid || '').slice(0, 6);
}
async function mapPool(items, limit, fn) {
  let next = 0;
  const workers = [];
  for (let w = 0; w < Math.min(limit, items.length); w += 1) {
    workers.push((async () => {
      while (next < items.length) {
        const i = next;
        next += 1;
        await fn(items[i], i);
      }
    })());
  }
  await Promise.all(workers);
}
function fail(err) {
  return { ok: false, code: readErrorCode(err) };
}
function inr(micro) {
  const r = microInrToInr(micro);
  if (r === null) return '?';
  return `₹${r.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function rupees(n) {
  return `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}
function avg1(total, days) {
  return Math.round((total / days) * 10) / 10;
}
function hours1(seconds) {
  return `${Math.round((seconds / 3600) * 10) / 10} h`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ── Data collection (every source isolated; one failing never blanks another) ───────────

/**
 * Read yesterday's numbers. Never throws. Each section is { ok: true, ... } or
 * { ok: false, code }. `reads` counts Firestore document reads actually billed.
 */
async function collectReportData({ adminFirestore: db, firebaseAdmin, telemetry, env = process.env, nowMs, uptimeSeconds }) {
  const sendDay = istDayKey(nowMs);
  const reportDay = addIstDays(sendDay, -1);
  const ys = istDayStartMs(reportDay);
  const ye = istDayStartMs(sendDay);
  const ws = ys - 7 * DAY_MS; // the 7 IST days before yesterday: [ws, ys)
  let reads = 0;
  const T = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.Timestamp;
  const stamp = (ms) => (T && typeof T.fromMillis === 'function' ? T.fromMillis(ms) : new Date(ms));
  const noDb = { ok: false, code: 'firestore-unavailable' };

  async function countOf(query) {
    const snap = await query.count().get();
    reads += 1;
    const data = snap && typeof snap.data === 'function' ? snap.data() : null;
    if (!data || typeof data.count !== 'number') throw Object.assign(new Error('no count'), { code: 2 });
    return data.count;
  }

  // a. Auth users (not a Firestore read): sign-ups + who could have used AI.
  let users = null;
  let authTruncated = false;
  let signups;
  try {
    if (!firebaseAdmin || typeof firebaseAdmin.auth !== 'function') throw Object.assign(new Error('no auth'), { code: 'auth/unavailable' });
    users = [];
    let pageToken;
    let pages = 0;
    do {
      const result = await firebaseAdmin.auth().listUsers(AUTH_PAGE_SIZE, pageToken);
      for (const u of (result && result.users) || []) {
        if (!u || typeof u.uid !== 'string' || !u.uid) continue;
        const meta = u.metadata || {};
        users.push({ uid: u.uid, createdMs: msOfStamp(meta.creationTime), refreshedMs: msOfStamp(meta.lastRefreshTime) });
      }
      pageToken = result && result.pageToken ? result.pageToken : undefined;
      pages += 1;
    } while (pageToken && pages < MAX_AUTH_PAGES);
    authTruncated = Boolean(pageToken);
    const yesterday = users.filter((u) => u.createdMs !== null && u.createdMs >= ys && u.createdMs < ye).length;
    const prev7 = users.filter((u) => u.createdMs !== null && u.createdMs >= ws && u.createdMs < ys).length;
    signups = { ok: true, yesterday, prev7Avg: avg1(prev7, 7), truncated: authTruncated };
  } catch (e) {
    users = null;
    signups = fail(e);
  }

  // Trials started: server-pinned subscriptions.trialStartDate Timestamps (single-field range).
  let trials;
  try {
    if (!db) throw Object.assign(new Error('no db'), { code: 14 });
    const col = db.collection(SUBSCRIPTIONS_COLLECTION);
    const yesterday = await countOf(col.where('trialStartDate', '>=', stamp(ys)).where('trialStartDate', '<', stamp(ye)));
    const prev7 = await countOf(col.where('trialStartDate', '>=', stamp(ws)).where('trialStartDate', '<', stamp(ys)));
    trials = { ok: true, yesterday, prev7Avg: avg1(prev7, 7) };
  } catch (e) {
    trials = db ? fail(e) : noDb;
  }

  /** Users whose last token refresh could cover activity from `sinceMs` (unknown refresh kept). */
  function activeSince(sinceMs, max) {
    const floor = sinceMs - HOUR_MS; // a verified call needs an ID token refreshed within the hour
    const list = (users || []).filter((u) => u.refreshedMs === null || u.refreshedMs >= floor);
    list.sort((a, b) => (b.refreshedMs === null ? -Infinity : b.refreshedMs) - (a.refreshedMs === null ? -Infinity : a.refreshedMs));
    return { scanned: list.slice(0, max), truncated: list.length > max, inWindow: list.length };
  }

  // b. Gradings: sessionRecords/{uid}/records saved yesterday (gradedAt, ms), by surface.
  let gradings;
  if (!users) gradings = { ok: false, code: signups.code, dependsOn: 'sign-in list' };
  else if (!db) gradings = noDb;
  else {
    const { scanned, truncated } = activeSince(ys, GRADING_MAX_STUDENTS);
    const bySurface = {};
    for (const s of SURFACES) bySurface[s] = 0;
    let total = 0;
    let other = 0;
    let pendingExcluded = 0;
    let capped = 0;
    let failed = 0;
    let code = null;
    await mapPool(scanned, READ_CONCURRENCY, async (u) => {
      try {
        const snap = await db
          .collection(SESSION_RECORDS_COLLECTION)
          .doc(u.uid)
          .collection(SESSION_RECORDS_SEGMENTS.records)
          .where('gradedAt', '>=', ys)
          .where('gradedAt', '<', ye)
          .limit(GRADING_PER_STUDENT_LIMIT)
          .select('surface', 'status')
          .get();
        const docs = snap && Array.isArray(snap.docs) ? snap.docs : [];
        reads += Math.max(1, docs.length);
        if (docs.length >= GRADING_PER_STUDENT_LIMIT) capped += 1;
        for (const d of docs) {
          const r = typeof d.data === 'function' ? d.data() || {} : {};
          if (r.status === 'pending-upload') {
            pendingExcluded += 1;
            continue;
          }
          total += 1;
          if (Object.prototype.hasOwnProperty.call(bySurface, r.surface)) bySurface[r.surface] += 1;
          else other += 1;
        }
      } catch (e) {
        failed += 1;
        if (code === null) code = readErrorCode(e);
      }
    });
    gradings = failed > 0
      ? { ok: false, code, failedStudents: failed }
      : { ok: true, total, bySurface, other, pendingExcluded, studentsScanned: scanned.length, truncated: truncated || authTruncated, capped };
  }

  // d. AI cost: usageLedger/{uid}/days/{key} (COST-1 helpers), yesterday vs the 7 days before.
  let aiCost;
  if (!users) aiCost = { ok: false, code: signups.code, dependsOn: 'sign-in list' };
  else if (!db) aiCost = noDb;
  else {
    const { scanned, truncated } = activeSince(ws, COST_MAX_STUDENTS);
    const keys = [];
    for (let i = 0; i < COST_DAYS; i += 1) keys.push(addIstDays(reportDay, -i)); // [yesterday, ..., D-7]
    const pairs = [];
    for (const u of scanned) for (const k of keys) pairs.push({ uid: u.uid, key: k });
    const chunks = [];
    for (let i = 0; i < pairs.length; i += GET_ALL_CHUNK) chunks.push(pairs.slice(i, i + GET_ALL_CHUNK));
    let yesterdayMicro = 0;
    let prevMicro = 0;
    let daysSeen = 0;
    const perUid = Object.create(null);
    let failed = 0;
    let code = null;
    await mapPool(chunks, 4, async (chunk) => {
      try {
        const refs = chunk.map((p) => db.collection(USAGE_LEDGER_COLLECTION).doc(p.uid).collection(LEDGER_SEGMENTS.days).doc(p.key));
        const snaps = await db.getAll(...refs);
        reads += refs.length;
        chunk.forEach((p, j) => {
          const s = snaps[j];
          if (!s || !s.exists) return;
          daysSeen += 1;
          const c = ledgerDayCost(typeof s.data === 'function' ? s.data() : null);
          const micro = c.costMicroInr === null ? 0 : c.costMicroInr;
          if (p.key === reportDay) {
            yesterdayMicro += micro;
            if (micro > 0) perUid[p.uid] = (perUid[p.uid] || 0) + micro;
          } else {
            prevMicro += micro;
          }
        });
      } catch (e) {
        failed += 1;
        if (code === null) code = readErrorCode(e);
      }
    });
    const top = Object.entries(perUid)
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, 3)
      .map(([uid, micro]) => ({ uidPrefix: uidPrefix(uid), micro }));
    aiCost = failed > 0
      ? { ok: false, code, failedChunks: failed }
      : {
        ok: true,
        yesterdayMicro,
        prev7AvgMicro: Math.round(prevMicro / 7),
        daysSeen,
        top,
        studentsScanned: scanned.length,
        truncated: truncated || authTruncated,
      };
  }

  // c. Payments: payOrders written by the server (read-only; never Razorpay).
  let payments;
  try {
    if (!db) throw Object.assign(new Error('no db'), { code: 14 });
    const col = db.collection(PAY_ORDERS_COLLECTION);
    const paidSnap = await col.where('paidAt', '>=', new Date(ys)).where('paidAt', '<', new Date(ye)).limit(PAY_ORDERS_LIMIT).get();
    const paidDocs = paidSnap && Array.isArray(paidSnap.docs) ? paidSnap.docs : [];
    reads += Math.max(1, paidDocs.length);
    const createdSnap = await col.where('createdAt', '>=', new Date(ys)).where('createdAt', '<', new Date(ye)).limit(PAY_ORDERS_LIMIT).get();
    const createdDocs = createdSnap && Array.isArray(createdSnap.docs) ? createdSnap.docs : [];
    reads += Math.max(1, createdDocs.length);
    let passes = 0;
    let passInr = 0;
    let topups = 0;
    let topupInr = 0;
    for (const d of paidDocs) {
      const o = typeof d.data === 'function' ? d.data() || {} : {};
      if (o.status !== 'paid') continue;
      const amountInr = Number.isInteger(o.amountPaise) && o.amountPaise > 0 ? o.amountPaise / 100 : 0;
      if (isTopupProduct(o.passType)) {
        topups += 1;
        topupInr += amountInr;
      } else {
        passes += 1;
        passInr += amountInr;
      }
    }
    let unpaid = 0;
    for (const d of createdDocs) {
      const o = typeof d.data === 'function' ? d.data() || {} : {};
      if (o.status !== 'paid') unpaid += 1;
    }
    payments = {
      ok: true,
      passes,
      passInr,
      topups,
      topupInr,
      ordersCreated: createdDocs.length,
      ordersUnpaid: unpaid,
      capped: paidDocs.length >= PAY_ORDERS_LIMIT || createdDocs.length >= PAY_ORDERS_LIMIT,
    };
  } catch (e) {
    payments = db ? fail(e) : noDb;
  }

  // e + payment errors: in-process counters (not stored per day) — labelled "since server start".
  const counters = (() => {
    try {
      return telemetry && typeof telemetry.snapshot === 'function' ? telemetry.snapshot() || {} : {};
    } catch {
      return {};
    }
  })();
  const LABEL = /^[a-z0-9_-]{1,40}$/;
  const refused = {};
  const wouldRefuse = {};
  const paymentErrors = {};
  let rateLimitHardBlocks = 0;
  for (const [key, value] of Object.entries(counters)) {
    const n = toCount(value);
    if (n === 0) continue;
    let m;
    if ((m = /^fair_use\.refused\.(.+)$/.exec(key)) && LABEL.test(m[1])) refused[m[1]] = n;
    else if ((m = /^fair_use\.would_refuse\.(.+)$/.exec(key)) && LABEL.test(m[1])) wouldRefuse[m[1]] = n;
    else if (/^rate_limit\.hard_block\.[a-z]{1,20}$/.test(key)) rateLimitHardBlocks += n;
    else if (/^payments\.[a-z0-9_.]{1,60}\.(grant_failed|store_failed|store_read_failed)$/.test(key)) paymentErrors[key] = n;
  }
  const sinceBoot = { ok: true, refused, wouldRefuse, rateLimitHardBlocks, paymentErrors, uptimeSeconds };

  // f. Trial emails: the durable day cap counter + the ledger's sent / failed stamps.
  let trialEmail;
  try {
    if (!db) throw Object.assign(new Error('no db'), { code: 14 });
    const daily = await db.collection(TRIAL_EMAIL_DAILY_COLLECTION).doc(reportDay).get();
    reads += 1;
    const claimed = daily && daily.exists ? toCount((daily.data() || {}).count) : 0;
    const col = db.collection(TRIAL_EMAILS_COLLECTION);
    const sent = await countOf(col.where('sentAt', '>=', stamp(ys)).where('sentAt', '<', stamp(ye)));
    const failedN = await countOf(col.where('failedAt', '>=', stamp(ys)).where('failedAt', '<', stamp(ye)));
    const mode = (() => {
      const e = env || {};
      if (!isOnFlag(e.TRIAL_EMAIL_ENABLED)) return 'off';
      return isOffFlag(e.TRIAL_EMAIL_DRY_RUN) ? 'sending' : 'dry-run';
    })();
    trialEmail = { ok: true, claimed, sent, failed: failedN, mode };
  } catch (e) {
    trialEmail = db ? fail(e) : noDb;
  }

  // g. Server.
  const e = env || {};
  const shaRaw = String(e.RAILWAY_GIT_COMMIT_SHA || e.GIT_COMMIT_SHA || e.SOURCE_COMMIT || '').trim();
  const version = /^[0-9a-f]{7,40}$/i.test(shaRaw) ? shaRaw.slice(0, 12) : null;
  const server = { uptimeSeconds, version, node: process.version };

  return { sendDay, reportDay, generatedAtMs: nowMs, signups, trials, gradings, aiCost, payments, sinceBoot, trialEmail, server, reads };
}

// ── The report (PURE) ────────────────────────────────────────────────────────────────────

function couldnt(section) {
  return `couldn't read (${section.code || 'error'})`;
}

/** Fixed rules only. Returns the "⚠ Look at this" lines. */
function lookAtThis(d) {
  const out = [];
  const sections = [
    ['Sign-ups', d.signups],
    ['Trials started', d.trials],
    ['Gradings', d.gradings],
    ['AI cost', d.aiCost],
    ['Payments', d.payments],
    ['Trial emails', d.trialEmail],
  ];
  for (const [name, s] of sections) if (!s || !s.ok) out.push(`${name}: ${couldnt(s || {})}.`);
  if (d.aiCost && d.aiCost.ok && d.aiCost.prev7AvgMicro > 0 && d.aiCost.yesterdayMicro > 2 * d.aiCost.prev7AvgMicro) {
    out.push(`AI cost ${inr(d.aiCost.yesterdayMicro)} is more than 2x the 7-day average (${inr(d.aiCost.prev7AvgMicro)}).`);
  }
  if (d.gradings && d.gradings.ok && d.gradings.total === 0) out.push('0 gradings yesterday.');
  const payErr = d.sinceBoot ? Object.values(d.sinceBoot.paymentErrors).reduce((a, b) => a + b, 0) : 0;
  if (payErr > 0) out.push(`${payErr} payment error(s) since server start (${Object.keys(d.sinceBoot.paymentErrors).join(', ')}) - check the logs.`);
  if (d.trialEmail && d.trialEmail.ok && d.trialEmail.failed > 0) out.push(`${d.trialEmail.failed} trial email(s) failed yesterday.`);
  const capped = [];
  if (d.signups && d.signups.ok && d.signups.truncated) capped.push('sign-in list');
  if (d.gradings && d.gradings.ok && (d.gradings.truncated || d.gradings.capped > 0)) capped.push('gradings');
  if (d.aiCost && d.aiCost.ok && d.aiCost.truncated) capped.push('AI cost');
  if (d.payments && d.payments.ok && d.payments.capped) capped.push('payments');
  if (capped.length) out.push(`A read cap was hit (${capped.join(', ')}): those numbers are lower bounds.`);
  return out;
}

function ruleCounts(map) {
  const entries = Object.entries(map || {});
  if (!entries.length) return '';
  return ` (${entries.map(([k, v]) => `${k} ${v}`).join(', ')})`;
}
function sumValues(map) {
  return Object.values(map || {}).reduce((a, b) => a + b, 0);
}

/** Build { subject, text, html, warnings } from collected data. PURE. */
function buildOpsReport(d) {
  const day = formatDayKey(d.reportDay);
  const warnings = lookAtThis(d);
  const rows = []; // [label, yesterday, comparison]

  rows.push(['Sign-ups', d.signups.ok ? String(d.signups.yesterday) : couldnt(d.signups), d.signups.ok ? `7-day avg ${d.signups.prev7Avg}` : '']);
  rows.push(['Trials started', d.trials.ok ? String(d.trials.yesterday) : couldnt(d.trials), d.trials.ok ? `7-day avg ${d.trials.prev7Avg}` : '']);
  if (d.gradings.ok) {
    const parts = SURFACES.filter((s) => d.gradings.bySurface[s] > 0).map((s) => `${SURFACE_LABELS[s]} ${d.gradings.bySurface[s]}`);
    if (d.gradings.other > 0) parts.push(`other ${d.gradings.other}`);
    rows.push(['Graded sessions', String(d.gradings.total), parts.join(' · ') || 'none']);
  } else rows.push(['Graded sessions', couldnt(d.gradings), '']);
  if (d.aiCost.ok) {
    rows.push(['AI cost', inr(d.aiCost.yesterdayMicro), `7-day avg ${inr(d.aiCost.prev7AvgMicro)}`]);
    const top = d.aiCost.top.map((t) => `${t.uidPrefix} ${inr(t.micro)}`).join(' · ');
    rows.push(['Top students by cost', top || 'none', 'uid prefix']);
  } else rows.push(['AI cost', couldnt(d.aiCost), '']);
  if (d.payments.ok) {
    rows.push(['Premium passes', `${d.payments.passes} (${rupees(d.payments.passInr)})`, '']);
    rows.push(['Top-ups', `${d.payments.topups} (${rupees(d.payments.topupInr)})`, '']);
    rows.push(['Orders created', String(d.payments.ordersCreated), `${d.payments.ordersUnpaid} not paid`]);
  } else rows.push(['Payments', couldnt(d.payments), '']);
  const sb = d.sinceBoot;
  rows.push([
    'Fair-use refusals',
    `${sumValues(sb.refused)}${ruleCounts(sb.refused)}`,
    `since server start (${hours1(sb.uptimeSeconds)}); would-refuse ${sumValues(sb.wouldRefuse)}; rate-limit blocks ${sb.rateLimitHardBlocks}`,
  ]);
  rows.push(['Payment errors', String(sumValues(sb.paymentErrors)), `since server start (${hours1(sb.uptimeSeconds)})`]);
  rows.push([
    'Trial emails',
    d.trialEmail.ok ? `${d.trialEmail.sent} sent · ${d.trialEmail.failed} failed · ${d.trialEmail.claimed} claimed` : couldnt(d.trialEmail),
    d.trialEmail.ok ? `job ${d.trialEmail.mode}` : '',
  ]);
  rows.push(['Server', `up ${hours1(d.server.uptimeSeconds)}`, `version ${d.server.version || 'not exposed by this deploy'} · node ${d.server.node}`]);

  const signups = d.signups.ok ? String(d.signups.yesterday) : '?';
  const graded = d.gradings.ok ? String(d.gradings.total) : '?';
  const cost = d.aiCost.ok ? inr(d.aiCost.yesterdayMicro) : '₹?';
  const subject = `LazyTopper daily — ${day}: ${signups} sign-ups, ${graded} graded, ${cost} AI`;

  const notes = [
    'Notes: sign-ups are Firebase accounts created that IST day; trials count server-pinned trial starts;',
    'graded sessions are signed-in students\' saved sessions (pending uploads excluded); AI cost is the',
    'metered cost of signed-in use (signed-out free checks are not ledgered); payments are server pay',
    'orders (admin grants not included). Counters marked "since server start" reset on restart.',
  ];
  const lines = [`LazyTopper daily — ${day} (IST)`, '', '⚠ Look at this'];
  if (warnings.length) for (const w of warnings) lines.push(`- ${w}`);
  else lines.push('- Nothing unusual by the fixed rules.');
  lines.push('');
  for (const [label, value, cmp] of rows) lines.push(`${label}: ${value}${cmp ? ` — ${cmp}` : ''}`);
  lines.push('', `Firestore reads used: ${d.reads} (worst case ${WORST_CASE_READS.toLocaleString('en-IN')}).`, '', ...notes);
  const text = lines.join('\n');

  const td = 'padding:4px 8px;border-bottom:1px solid #e3e8ef;font-size:13px;vertical-align:top';
  const html = [
    '<!doctype html><html><body style="margin:0;padding:16px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1b2a3a">',
    `<h1 style="font-size:16px;margin:0 0 10px">LazyTopper daily — ${escapeHtml(day)} (IST)</h1>`,
    '<p style="margin:0 0 4px;font-weight:700">⚠ Look at this</p><ul style="margin:0 0 12px;padding-left:18px;font-size:13px">',
    ...(warnings.length ? warnings : ['Nothing unusual by the fixed rules.']).map((w) => `<li>${escapeHtml(w)}</li>`),
    '</ul><table style="border-collapse:collapse;background:#fff">',
    ...rows.map(([l, v, c]) => `<tr><td style="${td};font-weight:600">${escapeHtml(l)}</td><td style="${td}">${escapeHtml(v)}</td><td style="${td};color:#5b6b7c">${escapeHtml(c)}</td></tr>`),
    '</table>',
    `<p style="font-size:12px;color:#5b6b7c">Firestore reads used: ${d.reads} (worst case ${WORST_CASE_READS}). ${escapeHtml(notes.join(' '))}</p>`,
    '</body></html>',
  ].join('');
  return { subject, text, html, warnings };
}

// ── Provider ─────────────────────────────────────────────────────────────────────────────

/** One POST to Resend (same REST call as the trial email; no SDK). */
async function sendViaResend({ fetchImpl, apiKey, from, to, subject, text, html, idempotencyKey }) {
  try {
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ from, to: [to], subject, text, html, tags: [{ name: 'category', value: 'ops_report' }] }),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(SEND_TIMEOUT_MS) : undefined,
    });
    if (res && res.ok) {
      let id = null;
      try {
        const json = await res.json();
        id = json && typeof json.id === 'string' ? json.id : null;
      } catch {
        /* sent */
      }
      return { ok: true, id };
    }
    const status = res ? res.status : 0;
    return { ok: false, retryable: status === 429 || status >= 500, code: `http_${status}` };
  } catch (e) {
    return { ok: false, retryable: true, code: e && e.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

// ── The job ──────────────────────────────────────────────────────────────────────────────

function createOpsReporter(deps = {}) {
  const config = deps.config || resolveOpsReportConfig(deps.env || process.env);
  const env = deps.env || process.env;
  const { adminFirestore, firebaseAdmin, telemetry } = deps;
  const fetchImpl = deps.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const uptime = typeof deps.uptime === 'function' ? deps.uptime : () => Math.floor(process.uptime());
  const log = typeof deps.log === 'function' ? deps.log : (line) => console.info(line);
  const setTimeoutFn = deps.setTimeoutFn || setTimeout;

  let running = false;
  let doneDay = null;
  let dryRunLoggedDay = null;
  let attempts = { day: null, n: 0 };
  let lastManualMs = -Infinity;

  function serverTimestamp() {
    const FV = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.FieldValue;
    return FV && typeof FV.serverTimestamp === 'function' ? FV.serverTimestamp() : new Date(now());
  }

  async function buildFor(nowMs) {
    const data = await collectReportData({ adminFirestore, firebaseAdmin, telemetry, env, nowMs, uptimeSeconds: uptime() });
    return { data, report: buildOpsReport(data) };
  }

  /** ★ The claim: one transaction on opsReports/{sendDay}. 'claimed' | 'already-<status>'. */
  async function claim(sendDay, reportDay) {
    const ref = adminFirestore.collection(OPS_REPORTS_COLLECTION).doc(sendDay);
    return adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) {
        const status = (snap.data() || {}).status;
        if (status !== 'released') return `already-${status || 'recorded'}`;
      }
      tx.set(ref, { dayKey: sendDay, reportDay, status: 'claimed', claimedAt: serverTimestamp() });
      return 'claimed';
    });
  }
  async function release(sendDay) {
    const ref = adminFirestore.collection(OPS_REPORTS_COLLECTION).doc(sendDay);
    return adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists || (snap.data() || {}).status !== 'claimed') return false;
      tx.set(ref, { status: 'released', releasedAt: serverTimestamp() }, { merge: true });
      return true;
    });
  }

  /** The 08:00 IST run. Never throws. */
  async function runScheduled() {
    if (config.mode === 'off') return { ran: false, reason: 'off' };
    const nowMs = now();
    if (!isDueAt(nowMs)) return { ran: false, reason: 'not-due' };
    const sendDay = istDayKey(nowMs);
    if (doneDay === sendDay) return { ran: false, reason: 'done-today' };
    if (running) return { ran: false, reason: 'already-running' };
    running = true;
    try {
      if (config.mode !== 'send') {
        if (dryRunLoggedDay === sendDay) return { ran: false, reason: 'dry-run-logged' };
        dryRunLoggedDay = sendDay;
        const { report } = await buildFor(nowMs);
        log(`[ops-report] dry-run (${config.mode}): would email OPS_REPORT_TO\nSubject: ${report.subject}\n${report.text}`);
        return { ran: true, mode: config.mode, sent: false, subject: report.subject };
      }
      if (!adminFirestore || typeof adminFirestore.runTransaction !== 'function') {
        log('[ops-report] skipped - firebase-admin Firestore not initialised on this deploy.');
        return { ran: false, reason: 'no-admin' };
      }
      const reportDay = addIstDays(sendDay, -1);
      let claimed;
      try {
        claimed = await claim(sendDay, reportDay);
      } catch (e) {
        log(`[ops-report] claim failed: ${readErrorCode(e)}`);
        return { ran: false, reason: 'claim-error' };
      }
      if (claimed !== 'claimed') {
        doneDay = sendDay;
        return { ran: false, reason: claimed };
      }
      const { report } = await buildFor(nowMs);
      const result = fetchImpl
        ? await sendViaResend({ fetchImpl, apiKey: config.apiKey, from: config.from, to: config.to, subject: report.subject, text: report.text, html: report.html, idempotencyKey: `ops-report-${sendDay}` })
        : { ok: false, retryable: false, code: 'no-fetch' };
      const ref = adminFirestore.collection(OPS_REPORTS_COLLECTION).doc(sendDay);
      try {
        if (result.ok) await ref.set({ status: 'sent', sentAt: serverTimestamp(), providerMessageId: result.id || null }, { merge: true });
        else if (result.retryable) await release(sendDay);
        else await ref.set({ status: 'failed', failedAt: serverTimestamp(), error: result.code }, { merge: true });
      } catch {
        /* the claim stays: at most once */
      }
      if (result.ok) {
        doneDay = sendDay;
        log(`[ops-report] ops_report_sent day=${sendDay} warnings=${report.warnings.length}`);
        return { ran: true, mode: 'send', sent: true, subject: report.subject };
      }
      log(`[ops-report] send failed day=${sendDay} code=${result.code} retry=${result.retryable ? 'yes' : 'never'}`);
      if (!result.retryable) doneDay = sendDay;
      else {
        if (attempts.day !== sendDay) attempts = { day: sendDay, n: 0 };
        attempts.n += 1;
        if (attempts.n < MAX_ATTEMPTS) {
          const t = setTimeoutFn(() => { void runScheduled(); }, RETRY_DELAY_MS);
          if (t && typeof t.unref === 'function') t.unref();
        }
      }
      return { ran: true, mode: 'send', sent: false, code: result.code };
    } catch (e) {
      log(`[ops-report] run failed: ${e && e.message ? e.message : 'error'}`);
      return { ran: false, reason: 'error' };
    } finally {
      running = false;
    }
  }

  /** Arm the daily job: a boot catch-up (if already past 08:00 IST), then every 08:00 IST. */
  function schedule() {
    log(describeConfig(config));
    if (config.mode === 'off') return null;
    const timers = {};
    const arm = () => {
      const t = setTimeoutFn(() => {
        void runScheduled().finally(arm);
      }, msUntilNextRun(now()));
      if (t && typeof t.unref === 'function') t.unref();
      timers.next = t;
    };
    const first = setTimeoutFn(() => { void runScheduled(); }, FIRST_RUN_DELAY_MS);
    if (first && typeof first.unref === 'function') first.unref();
    timers.first = first;
    arm();
    return timers;
  }

  /**
   * Admin send-now. Sends to OPS_REPORT_TO only, never records the daily claim (so it cannot
   * block the 08:00 send). Without a sendable config it returns the rendered report instead.
   */
  async function sendNow() {
    const nowMs = now();
    if (nowMs - lastManualMs < MANUAL_COOLDOWN_MS) return { status: 429, body: { ok: false, error: 'Wait a minute between test sends.' } };
    lastManualMs = nowMs;
    const { report } = await buildFor(nowMs);
    if (!config.canSend || !fetchImpl) {
      return {
        status: 200,
        body: { ok: true, sent: false, mode: config.mode, missing: config.missing, dryRun: config.dryRun, subject: report.subject, preview: report.text },
      };
    }
    const result = await sendViaResend({
      fetchImpl, apiKey: config.apiKey, from: config.from, to: config.to,
      subject: report.subject, text: report.text, html: report.html,
      idempotencyKey: `ops-report-manual-${nowMs}`,
    });
    log(`[ops-report] manual send ${result.ok ? 'ok' : `failed code=${result.code}`}`);
    if (!result.ok) return { status: 502, body: { ok: false, sent: false, error: `Send failed (${result.code})` } };
    return { status: 200, body: { ok: true, sent: true, subject: report.subject, warnings: report.warnings.length } };
  }

  /** POST /api/admin/ops-report/send-now — behind the shared ADMIN_FIREBASE_UIDS gate. */
  async function handleSendNow(req, res, { sendJson, requireAdmin }) {
    const auth = typeof requireAdmin === 'function' ? await requireAdmin(req) : { ok: false, status: 503, error: 'Admin gate unavailable' };
    if (!auth.ok) return sendJson(res, auth.status, { ok: false, error: auth.error });
    try {
      const out = await sendNow();
      return sendJson(res, out.status, out.body);
    } catch (e) {
      log(`[ops-report] manual send error: ${e && e.message ? e.message : 'error'}`);
      return sendJson(res, 500, { ok: false, error: 'Report failed' });
    }
  }

  return { config, runScheduled, schedule, sendNow, handleSendNow };
}

module.exports = {
  createOpsReporter,
  resolveOpsReportConfig,
  describeConfig,
  collectReportData,
  buildOpsReport,
  lookAtThis,
  sendViaResend,
  isDueAt,
  msUntilNextRun,
  istDayStartMs,
  addIstDays,
  formatDayKey,
  readErrorCode,
  OPS_REPORTS_COLLECTION,
  OPS_REPORT_SEND_NOW_PATH,
  WORST_CASE_READS,
  FIRST_RUN_DELAY_MS,
  RETRY_DELAY_MS,
  GRADING_MAX_STUDENTS,
  GRADING_PER_STUDENT_LIMIT,
  COST_MAX_STUDENTS,
  COST_DAYS,
  PAY_ORDERS_LIMIT,
};
