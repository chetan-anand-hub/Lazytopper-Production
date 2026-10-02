/**
 * studentActivity — POST /api/activity (STUDENT-ACTIVITY-1, PR-1: recording).
 *
 * Records WHICH PARTS of LazyTopper a signed-in student used on each IST day, as
 * counts, so the owner can see it on an admin page (PR-2). Owner ruling 2026-10-01,
 * built with every safeguard that ruling names:
 *
 *   - FIRST-PARTY ONLY. Written by this server, through the Admin SDK, into our own
 *     Firestore. Nothing here talks to Google Analytics, Vercel or any third party.
 *   - ADMIN-ONLY. The collection is undeclared in firestore.rules, so every browser
 *     read or write falls through to the deny-all `match /{document=**}` catch-all.
 *     Only the Admin SDK (this file, erasure, export, and PR-2's admin page) reaches it.
 *   - NAMES ONLY. A day document holds exactly: `firstSeenMs`, `lastSeenMs`,
 *     `sections` (count per section name), `events` (count per event name) and
 *     `expireAt` — and, since ACTIVITY-DETAIL-1 (owner ruling 2026-10-02), `pages`
 *     (count per ALLOWLISTED page name, encoded "/"->"~"), `feed` (an ordered list of
 *     `{ t, k, n }`: a time, "page"|"event", and an allowlisted name; at most
 *     MAX_FEED_PER_DAY per day, enforced here) and `feedTruncated` (true once capped).
 *     The request body may carry ONLY allowlisted names, small integer counts and feed
 *     times; every other byte of it is ignored. No question text, answer, image, free
 *     text, question id, score, device, IP, user agent, raw path or URL is ever stored.
 *   - 90-DAY RETENTION. `expireAt` is a Firestore TIMESTAMP (a TTL policy ignores a
 *     number): the instant the IST day began, plus 90 days.
 *   - SIGNED-IN STUDENTS ONLY. The uid comes from a VERIFIED Firebase ID token and from
 *     nowhere else. No token, no write. An anonymous Firebase session is refused.
 *   - ERASED AND EXPORTED WITH THE ACCOUNT, through STUDENT_DATA_MAP (the map is the
 *     spec; accountErasure / accountExport walk it).
 *
 * ★★ RESURRECTION (controller decision D4). A batch the browser flushes AFTER the
 * student erased their account carries an ID token that is still cryptographically
 * valid for up to an hour. Accepting it would re-create `activityLog/{uid}` for a
 * deleted child. So the token is verified with `checkRevoked = true`, which makes the
 * Admin SDK look the user up: a deleted user (`auth/user-not-found`), a disabled one
 * (`auth/user-disabled`) or a revoked session (`auth/id-token-revoked`) is refused
 * with 401 before anything is read or written.
 *
 * ★★ THE ERASURE RACE (controller decision D10). checkRevoked closes every batch that
 * ARRIVES after the erasure, but not one verified a moment BEFORE it whose write lands
 * after erasure has already swept activityDays. Two halves close it together:
 *   1. HERE: after the write commits, the Auth account is looked up again
 *      (`getUser`). If it no longer exists, the document just written is deleted
 *      and the request answers 401. This catches every write whose re-check runs
 *      AFTER the erasure deleted the Auth account.
 *   2. accountErasure.cjs sweeps ACTIVITY_DAYS_PATH_TEMPLATE a SECOND time, AFTER it
 *      has deleted the Auth account. This catches every write whose re-check ran
 *      BEFORE that deletion: such a write committed before the re-check, so before
 *      the Auth deletion, so before the second sweep.
 * For any batch, the re-check runs either after the Auth deletion (half 1 removes
 * the write) or before it (then the write precedes the second sweep and half 2
 * removes it). No marker or tombstone is kept, so nothing about the erased child
 * survives the erasure.
 *
 * ★ Fire-and-forget from the student's side: the client ignores every response, so a
 * failure here can never affect a student. Every path below answers; none throws.
 */

const { istDayKey } = require('../services/rateLimiter.cjs');

const STUDENT_ACTIVITY_PATH = '/api/activity';

const ACTIVITY_COLLECTION = 'activityLog';
// A SUBcollection, held as a property (like usageLedger's LEDGER_SEGMENTS.days) so the
// studentDataMap drift scanner — which reads every `.collection(NAME)` as a TOP-LEVEL
// collection — sees `activityLog` and not a phantom top-level `activityDays`.
const ACTIVITY_SEGMENTS = Object.freeze({ days: 'activityDays' });
/** The STUDENT_DATA_MAP path of the day documents. accountErasure.cjs reads this to
 *  sweep it again after the Auth account is gone (D10, see the header). */
const ACTIVITY_DAYS_PATH_TEMPLATE = 'activityLog/{uid}/activityDays/{dayKey}';

/**
 * ★ THE ALLOWLISTS. Mirrored in src/services/activityClient.ts; the vitest file
 * src/services/activityClient.test.ts requires THIS module and fails if the two lists
 * differ, and fails if ACTIVITY_EVENTS stops being exactly the event names
 * analytics.ts can send.
 */
const ACTIVITY_SECTIONS = Object.freeze([
  'home',
  'check-improve',
  'practice',
  'chapter-test',
  'full-mock',
  'worksheets',
  'notes',
  'topic-hub',
  'me-progress',
  'pricing',
  'cbse',
  'other',
]);

const ACTIVITY_EVENTS = Object.freeze([
  'sign_up',
  'free_check_used_block',
  'free_check_signup',
  'free_check_trial_start',
  'trial_start',
  'check_question_read',
  'check_answer_added',
  'check_graded',
]);

/**
 * ★★ THE PAGE ALLOWLIST (ACTIVITY-DETAIL-1, owner ruling 2026-10-02, F1). Built from the
 * same parts, in the same order, as src/services/activityPages.ts ACTIVITY_PAGE_NAMES —
 * src/services/activityPages.test.ts requires THIS module and fails if the two lists
 * differ, and fails if App.tsx gains a route the client has not classified.
 *
 * A page name is a route pattern plus, where the route has one, a CONTENT slug from a
 * fixed list (a chapter of the app's topic registry, a subject, a legal page) — or the
 * literal `other`. Never an id, token, uid, email, attempt or query string: no list can
 * hold one, and a name outside the list refuses the WHOLE batch.
 *
 * ★ STORED ENCODED: "/" becomes "~" so a name is a safe Firestore map key (`pages`), over
 * the strict charset [a-z0-9-~]. The feed's `n` carries the same encoded key. Only the
 * admin view decodes it.
 */
const ACTIVITY_TOPIC_SLUGS = Object.freeze([
  'real-numbers',
  'polynomials',
  'pair-of-linear-equations',
  'quadratic-equations',
  'arithmetic-progression',
  'triangles',
  'coordinate-geometry',
  'trigonometry',
  'circles',
  'areas-related-to-circles',
  'surface-areas-and-volumes',
  'statistics',
  'probability',
  'chemical-reactions-and-equations',
  'acids-bases-and-salts',
  'metals-and-non-metals',
  'carbon-and-its-compounds',
  'light-reflection-and-refraction',
  'human-eye-and-colourful-world',
  'electricity',
  'magnetic-effects-of-electric-current',
  'life-processes',
  'control-and-coordination',
  'how-do-organisms-reproduce',
  'heredity',
  'our-environment',
]);
const ACTIVITY_SUBJECTS = Object.freeze(['maths', 'science']);
const ACTIVITY_LEGAL_SLUGS = Object.freeze(['privacy', 'terms', 'refund']);
const OTHER_VALUE = 'other';
const ACTIVITY_STATIC_PAGES = Object.freeze([
  'home',
  'welcome',
  'browse',
  'intent',
  'pricing',
  'cbse/class-10',
  'teacher',
  'onboarding',
  'topic-hub',
  'highly-probable',
  'exam-simulation',
  'practice-hub',
  'practice/worksheets',
  'practice/worksheets/ready',
  'weak-area-practice',
  'check-improve',
  'exam-trends',
  'me',
  'mock-paper/other',
]);
const TOPIC_VALUES = [...ACTIVITY_TOPIC_SLUGS, OTHER_VALUE];
const SUBJECT_VALUES = [...ACTIVITY_SUBJECTS, OTHER_VALUE];
const ACTIVITY_PAGE_NAMES = Object.freeze([
  ...ACTIVITY_STATIC_PAGES,
  ...[...ACTIVITY_LEGAL_SLUGS, OTHER_VALUE].map((v) => `legal/${v}`),
  ...[...ACTIVITY_SUBJECTS, ...TOPIC_VALUES].map((v) => `topic-hub/${v}`),
  ...TOPIC_VALUES.map((v) => `notes/${v}`),
  ...TOPIC_VALUES.map((v) => `chapter-test/${v}`),
  ...[...ACTIVITY_SUBJECTS, ...TOPIC_VALUES].map((v) => `tutor/${v}`),
  ...SUBJECT_VALUES.map((v) => `full-mock/${v}`),
  ...SUBJECT_VALUES.map((v) => `highly-probable/${v}`),
  ...SUBJECT_VALUES.map((v) => `practice/${v}`),
]);
/** "/" -> "~" (the one stored form) and back. */
const encodePageKey = (name) => String(name).split('/').join('~');
const decodePageKey = (key) => String(key).split('~').join('/');
const ACTIVITY_PAGE_KEYS = Object.freeze(ACTIVITY_PAGE_NAMES.map(encodePageKey));
/** Belt and braces on top of the list: the only characters a stored key may hold. */
const PAGE_KEY_CHARSET = /^[a-z0-9-]+(~[a-z0-9-]+)*$/;
function isPageKey(key) {
  return typeof key === 'string' && PAGE_KEY_CHARSET.test(key) && ACTIVITY_PAGE_KEYS.includes(key);
}

/* ── The ordered feed (ACTIVITY-DETAIL-1, F2). ───────────────────────────────── */
/** ★★ The day's feed holds at most this many entries — enforced HERE, never trusted to the
 *  client. Counts (`sections` / `events` / `pages`) stay exact beyond it; the day is then
 *  marked `feedTruncated: true`. */
const MAX_FEED_PER_DAY = 300;
/** Entries in one batch; the client sends at most this many (a batch covers ~30 s). */
const MAX_FEED_PER_BATCH = 100;
const FEED_KINDS = Object.freeze(['page', 'event']);

/* ── Abuse bounds (D7). Conservative; each is pinned by a test. ─────────────── */
/**
 * B-7's batch was ~600 bytes (20 names). ACTIVITY-DETAIL-1 adds up to MAX_PAGE_NAMES_PER_BATCH
 * page counts (~35 bytes each) and MAX_FEED_PER_BATCH feed entries (~65 bytes each), so
 * the largest legal body is under 10 KB; 16 KB leaves room and still refuses a flood.
 */
const MAX_BODY_BYTES = 16384;
/** Distinct page names in one batch (a batch covers ~30 s). */
const MAX_PAGE_NAMES_PER_BATCH = 60;
/** Every allowlisted name at once is 12 + 8 = 20. */
const MAX_NAMES_PER_BATCH = ACTIVITY_SECTIONS.length + ACTIVITY_EVENTS.length;
/** The client clamps to the same value; a batch covers at most ~30 seconds. */
const MAX_COUNT_PER_NAME = 50;
/** Per-uid batch cap: the client sends at most one timed batch per 30 s, plus a
 *  flush when the page is hidden. 40 per 10 minutes is roughly double that. */
const MAX_BATCHES_PER_WINDOW = 40;
const BATCH_WINDOW_MS = 10 * 60 * 1000;
/** Memory bound on the per-uid counter map. */
const MAX_TRACKED_UIDS = 10000;

const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ★ The exact `expireAt` definition: the UTC instant at which the IST day `dayKey`
 * BEGAN (00:00 +05:30), plus 90 x 24 h. Every write to one day document computes the
 * same value, so the document expires 90 days after its day — never 90 days after its
 * last write.
 *   2026-10-01 -> 2026-09-30T18:30:00.000Z + 90 d = 2026-12-29T18:30:00.000Z
 */
function expireAtMsForDay(dayKey) {
  return Date.parse(`${dayKey}T00:00:00.000+05:30`) + RETENTION_DAYS * DAY_MS;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Validate a batch. Reads ONLY `sections`, `events`, `pages`, `feed` and `feedTruncated`;
 * anything else in the body (a `uid`, a raw path, a question) is never looked at, so it
 * can never be stored. One unknown name, one out-of-range count or one malformed feed
 * entry refuses the WHOLE batch. A feed entry is REBUILT as `{ t, k, n }` — any other
 * field on it is dropped, never stored.
 */
function validateBatch(body) {
  if (!isPlainObject(body)) return { ok: false, error: 'body must be a JSON object' };
  const out = { sections: {}, events: {}, pages: {}, feed: [], feedTruncated: body.feedTruncated === true };
  let names = 0;
  let pageNames = 0;
  for (const [field, allow] of [['sections', ACTIVITY_SECTIONS], ['events', ACTIVITY_EVENTS]]) {
    const value = body[field];
    if (value === undefined) continue;
    if (!isPlainObject(value)) return { ok: false, error: `${field} must be an object` };
    for (const [name, count] of Object.entries(value)) {
      if (!allow.includes(name)) return { ok: false, error: `unknown ${field} name` };
      if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT_PER_NAME) {
        return { ok: false, error: `count out of range` };
      }
      names += 1;
      if (names > MAX_NAMES_PER_BATCH) return { ok: false, error: 'too many names in one batch' };
      out[field][name] = count;
    }
  }
  if (body.pages !== undefined) {
    if (!isPlainObject(body.pages)) return { ok: false, error: 'pages must be an object' };
    for (const [key, count] of Object.entries(body.pages)) {
      if (!isPageKey(key)) return { ok: false, error: 'unknown page name' };
      if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT_PER_NAME) {
        return { ok: false, error: `count out of range` };
      }
      pageNames += 1;
      if (pageNames > MAX_PAGE_NAMES_PER_BATCH) return { ok: false, error: 'too many page names in one batch' };
      out.pages[key] = count;
    }
  }
  if (body.feed !== undefined) {
    if (!Array.isArray(body.feed)) return { ok: false, error: 'feed must be an array' };
    if (body.feed.length > MAX_FEED_PER_BATCH) return { ok: false, error: 'feed too long for one batch' };
    for (const entry of body.feed) {
      if (!isPlainObject(entry)) return { ok: false, error: 'feed entry must be an object' };
      const { t, k, n } = entry;
      if (!Number.isSafeInteger(t) || t <= 0) return { ok: false, error: 'feed time out of range' };
      if (!FEED_KINDS.includes(k)) return { ok: false, error: 'unknown feed kind' };
      if (k === 'page' ? !isPageKey(n) : !ACTIVITY_EVENTS.includes(n)) {
        return { ok: false, error: 'unknown feed name' };
      }
      out.feed.push({ t, k, n });
    }
  }
  if (names === 0) return { ok: false, error: 'empty batch' };
  return { ok: true, ...out };
}

/** The UTC instant at which the IST day `dayKey` began. */
function istDayStartMs(dayKey) {
  return Date.parse(`${dayKey}T00:00:00.000+05:30`);
}

/**
 * ★ A feed time is the CLIENT's clock, so it is never trusted as is: it is clamped into
 * the batch's server-day window — [start of the IST day the batch is filed under, server
 * now]. A far-future or far-past `t` (a wrong device clock, a forged body) becomes the
 * window's edge; it can never place an entry on another day or after the write.
 */
function clampFeedTime(t, dayStart, nowMs) {
  return Math.min(Math.max(t, dayStart), nowMs);
}

function extractBearerToken(req) {
  const header = String((req && req.headers && req.headers['authorization']) || '');
  if (!header.startsWith('Bearer ')) return '';
  return header.slice(7).trim();
}

/** Read the body with a hard byte cap. Resolves `{ tooLarge }`, `{ invalid }` or `{ body }`. */
function readBoundedJson(req, maxBytes) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (!done) {
        done = true;
        resolve(v);
      }
    };
    const declared = Number(req.headers && req.headers['content-length']);
    if (Number.isFinite(declared) && declared > maxBytes) {
      finish({ tooLarge: true });
      return;
    }
    const chunks = [];
    let bytes = 0;
    req.on('data', (chunk) => {
      if (done) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        finish({ tooLarge: true });
        return;
      }
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      if (done) return;
      try {
        finish({ body: JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null') });
      } catch {
        finish({ invalid: true });
      }
    });
    req.on('error', () => finish({ invalid: true }));
  });
}

/**
 * @param deps.sendJson        (res, status, body) => void
 * @param deps.firebaseAdmin   initialised firebase-admin, or null (-> 503)
 * @param deps.adminFirestore  admin Firestore, or null (-> 503)
 * @param deps.now             test seam; server time in ms
 */
function createStudentActivityRoutes(deps = {}) {
  const { sendJson, firebaseAdmin, adminFirestore } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const batchesByUid = new Map();

  function overBatchCap(uid, nowMs) {
    let entry = batchesByUid.get(uid);
    if (!entry || nowMs - entry.start >= BATCH_WINDOW_MS) {
      if (!entry && batchesByUid.size >= MAX_TRACKED_UIDS) {
        for (const [k, v] of batchesByUid) {
          if (nowMs - v.start >= BATCH_WINDOW_MS) batchesByUid.delete(k);
        }
        if (batchesByUid.size >= MAX_TRACKED_UIDS) batchesByUid.clear();
      }
      entry = { start: nowMs, count: 0 };
      batchesByUid.set(uid, entry);
    }
    entry.count += 1;
    return entry.count > MAX_BATCHES_PER_WINDOW;
  }

  async function writeBatch(uid, batch, nowMs) {
    const fs = firebaseAdmin.firestore;
    const FieldValue = fs && fs.FieldValue;
    const Timestamp = fs && fs.Timestamp;
    if (!FieldValue || !Timestamp) throw new Error('firestore FieldValue/Timestamp unavailable');
    const dayKey = istDayKey(nowMs);
    const ref = adminFirestore
      .collection(ACTIVITY_COLLECTION)
      .doc(uid)
      .collection(ACTIVITY_SEGMENTS.days)
      .doc(dayKey);

    const data = {
      lastSeenMs: nowMs,
      expireAt: Timestamp.fromMillis(expireAtMsForDay(dayKey)),
    };
    const sections = Object.entries(batch.sections);
    const events = Object.entries(batch.events);
    if (sections.length) {
      data.sections = Object.fromEntries(sections.map(([k, n]) => [k, FieldValue.increment(n)]));
    }
    if (events.length) {
      data.events = Object.fromEntries(events.map(([k, n]) => [k, FieldValue.increment(n)]));
    }
    const pages = Object.entries(batch.pages || {});
    if (pages.length) {
      data.pages = Object.fromEntries(pages.map(([k, n]) => [k, FieldValue.increment(n)]));
    }
    const dayStart = istDayStartMs(dayKey);
    const incoming = (batch.feed || []).map((e) => ({ t: clampFeedTime(e.t, dayStart, nowMs), k: e.k, n: e.n }));

    // ONE merge write per batch, inside a transaction. The read exists so `firstSeenMs`
    // is set once, on the day's first batch, and — ACTIVITY-DETAIL-1 — so the ordered
    // feed is a read-modify-write: arrayUnion would drop a repeated `{t,k,n}` and cannot
    // enforce the day cap. A concurrent second tab retries the transaction, so neither
    // batch's entries are lost and the cap holds across both.
    await adminFirestore.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const exists = Boolean(snap && snap.exists);
      const write = exists ? { ...data } : { ...data, firstSeenMs: nowMs };
      if (incoming.length || batch.feedTruncated) {
        // A day written before this change (B-7 shape) has no `feed`: it starts empty.
        const prev = exists ? snap.data() || {} : {};
        const prevFeed = Array.isArray(prev.feed) ? prev.feed : [];
        const room = Math.max(0, MAX_FEED_PER_DAY - prevFeed.length);
        const added = incoming.slice(0, room);
        if (added.length) write.feed = [...prevFeed, ...added];
        if (incoming.length > room || batch.feedTruncated) write.feedTruncated = true;
      }
      tx.set(ref, write, { merge: true });
    });
    return ref;
  }

  /**
   * D10, half 1: is the Auth account still there AFTER the write? If it was erased
   * while this batch was in flight, delete what was just written. Returns true when
   * the account is gone. Any other lookup failure leaves the write alone (it cannot
   * tell "erased" from "network blip"); half 2, in accountErasure.cjs, covers that case.
   */
  async function undoIfAccountErased(uid, ref) {
    try {
      await firebaseAdmin.auth().getUser(uid);
      return false;
    } catch (e) {
      if (!e || e.code !== 'auth/user-not-found') return false;
      await ref.delete();
      return true;
    }
  }

  async function handleActivity(req, res) {
    try {
      if (!firebaseAdmin || typeof firebaseAdmin.auth !== 'function' || !adminFirestore) {
        return sendJson(res, 503, { ok: false, error: 'activity recording unavailable' });
      }
      const token = extractBearerToken(req);
      if (!token) return sendJson(res, 401, { ok: false, error: 'Unauthorized: Bearer ID token required' });

      let decoded;
      try {
        // ★ checkRevoked = true — the resurrection guard (D4). See the header.
        decoded = await firebaseAdmin.auth().verifyIdToken(token, true);
      } catch {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized: invalid ID token' });
      }
      const uid = decoded && typeof decoded.uid === 'string' ? decoded.uid.trim() : '';
      if (!uid) return sendJson(res, 401, { ok: false, error: 'Unauthorized: invalid ID token' });
      const provider = decoded.firebase && decoded.firebase.sign_in_provider;
      if (provider === 'anonymous') {
        return sendJson(res, 403, { ok: false, error: 'Forbidden: signed-in students only' });
      }

      const nowMs = now();
      if (overBatchCap(uid, nowMs)) return sendJson(res, 429, { ok: false, error: 'too many batches' });

      const read = await readBoundedJson(req, MAX_BODY_BYTES);
      if (read.tooLarge) return sendJson(res, 413, { ok: false, error: 'body too large' });
      if (read.invalid) return sendJson(res, 400, { ok: false, error: 'invalid JSON' });

      const batch = validateBatch(read.body);
      if (!batch.ok) return sendJson(res, 400, { ok: false, error: batch.error });

      const ref = await writeBatch(uid, batch, nowMs);
      if (await undoIfAccountErased(uid, ref)) {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized: account no longer exists' });
      }
      return sendJson(res, 200, { ok: true });
    } catch {
      return sendJson(res, 500, { ok: false, error: 'activity not recorded' });
    }
  }

  return { handleActivity };
}

/**
 * The ONE-LINE mount used by server/index.cjs. The routes are built once, on the first
 * request, from the deps that line passes.
 */
let mounted = null;
function handleStudentActivity(req, res, deps) {
  if (!mounted) mounted = createStudentActivityRoutes(deps);
  return mounted.handleActivity(req, res);
}

module.exports = {
  createStudentActivityRoutes,
  handleStudentActivity,
  validateBatch,
  expireAtMsForDay,
  STUDENT_ACTIVITY_PATH,
  ACTIVITY_COLLECTION,
  ACTIVITY_SEGMENTS,
  ACTIVITY_DAYS_PATH_TEMPLATE,
  ACTIVITY_SECTIONS,
  ACTIVITY_EVENTS,
  ACTIVITY_TOPIC_SLUGS,
  ACTIVITY_SUBJECTS,
  ACTIVITY_LEGAL_SLUGS,
  ACTIVITY_STATIC_PAGES,
  ACTIVITY_PAGE_NAMES,
  ACTIVITY_PAGE_KEYS,
  encodePageKey,
  decodePageKey,
  isPageKey,
  clampFeedTime,
  MAX_FEED_PER_DAY,
  MAX_FEED_PER_BATCH,
  MAX_PAGE_NAMES_PER_BATCH,
  MAX_BODY_BYTES,
  MAX_NAMES_PER_BATCH,
  MAX_COUNT_PER_NAME,
  MAX_BATCHES_PER_WINDOW,
  BATCH_WINDOW_MS,
  RETENTION_DAYS,
};
