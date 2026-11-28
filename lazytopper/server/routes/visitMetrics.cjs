/**
 * visitMetrics.cjs - POST /api/metrics/visit (QUICK-LEAVE-1, owner YES 26 Nov 2026)
 *
 * The real "left without engaging" rate. The client (src/analytics/quickLeave.ts) sends ONE small beacon per visit:
 * `{ path, source, engaged, inApp, device }` (+ `late: true` when a visit already reported as a leave later engaged).
 * No auth (a signed-out visitor sends it). Stores COUNTERS ONLY, never a record of a visitor:
 *
 *   visitDaily/{IST yyyy-mm-dd}  { counts: { "<source>|<path>|<engaged 0/1>|<inApp 0/1>": FieldValue.increment(n) } }
 *
 *   - strict whitelist: an unknown field, an unknown source / device or a non-boolean flag is a 400; nothing is trimmed or "fixed".
 *     The PATH is mapped to a bounded canonical set (see canonicalPath: real route prefixes, capped slug second segments,
 *     everything else "/other"), so one day's document cannot grow without limit;
 *   - bots (empty or crawler / headless / tool user agents) get 204 and write nothing;
 *   - rate-limited per client IP (emailCode.cjs clientIp: the trusted right-hand X-Forwarded-For entry; in memory, never stored or logged); over the cap -> 429;
 *   - `late: true` moves one visit from "left" to "engaged": +1 engaged key, and -1 on the same key's left bucket only when it is above zero (read in a transaction);
 *   - firestore.rules does not name visitDaily: browsers hit the deny-all catch-all; only the Admin SDK writes / reads it;
 *   - KILL SWITCH VISIT_METRICS_DISABLED=1 -> 204, nothing written.
 */

const { clientIp, resolveTrustedHops } = require('../services/emailCode.cjs');

const VISIT_METRICS_PATH = '/api/metrics/visit';
const VISIT_DAILY_COLLECTION = 'visitDaily';
const MAX_BODY_BYTES = 512;
const PATH_MAX = 200;
const PATH_CHARSET = /^\/[A-Za-z0-9_\-./:]*$/;
const SOURCES = Object.freeze(['google_ads', 'google_organic', 'meta', 'youtube', 'llm', 'direct', 'other']);
const DEVICES = Object.freeze(['mobile', 'desktop']);
const ALLOWED_KEYS = new Set(['path', 'source', 'engaged', 'inApp', 'device', 'late']);
const IST_OFFSET_MS = 330 * 60 * 1000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 120;
const MAX_TRACKED_IPS = 20000;
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|node-fetch|axios|go-http|java\/|httpclient|scrapy|monitor|uptime/i;

function isVisitMetricsDisabled(env) {
  return /^(1|true|on|yes)$/i.test(String((env && env.VISIT_METRICS_DISABLED) || '').trim());
}

function istDayKey(nowMs) {
  return new Date(nowMs + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * BOUNDED KEYS. visitDaily/{day}.counts is ONE document (1 MiB cap), so the path part of every key must come from a small closed
 * set. First segment: only the app's real top-level routes (App.tsx's route table); anything else -> "/other". A second segment is
 * kept ONLY for the prefixes whose pages are slugs, only when it matches SLUG, and only while fewer than MAX_SLUG_PATHS distinct
 * slug paths have been seen today by this process (beyond that the slug is dropped to the prefix). Worst case per day:
 * |ROUTE_PREFIXES| + 1 + MAX_SLUG_PATHS distinct paths x 7 sources x 4 flag keys, far below the document cap.
 */
const ROUTE_PREFIXES = Object.freeze([
  'admin', 'ai-mentor', 'board-pass', 'browse', 'cbq-class-10', 'cbq-packs', 'cbse', 'cbse-marking-scheme-class-10', 'chapter-test',
  'check-improve', 'check-your-answer', 'contact', 'exam-simulation', 'exam-trends', 'for-parents', 'free-mcq-class-10', 'full-mock',
  'highly-probable', 'important-question-of-the-day', 'intent', 'invoice-details', 'legal', 'login', 'me', 'mentor', 'mock-builder',
  'mock-paper', 'mock-test-class-10', 'ncert-class-10', 'ncert-exemplar', 'ncert-solutions', 'notes', 'onboarding', 'packs', 'practice',
  'practice-hub', 'pricing', 'profile', 'question-bank-class-10', 'sample-paper-class-10', 'sign-up', 'teacher', 'test-series', 'topic-hub', 'topic-mock', 'tutor',
  'u', 'weak-area-practice', 'welcome',
]);
const SLUG_PREFIXES = Object.freeze(['cbq-class-10', 'free-mcq-class-10', 'important-question-of-the-day', 'legal', 'mock-paper', 'ncert-exemplar', 'ncert-solutions', 'notes']);
const SLUG = /^[a-z0-9-]{1,60}$/;
const MAX_SLUG_PATHS = 200;
const OTHER_PATH = '/other';
const ROUTE_SET = new Set(ROUTE_PREFIXES);
const SLUG_SET = new Set(SLUG_PREFIXES);

/** PURE (plus the caller-owned `seen` set). Raw client path -> one of the bounded canonical paths. Never throws. */
function canonicalPath(raw, seen) {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > PATH_MAX || !PATH_CHARSET.test(raw)) return OTHER_PATH;
  const parts = raw.split('/').filter((x, i) => i > 0 && x !== '');
  if (parts.length === 0) return '/';
  const first = parts[0];
  if (!ROUTE_SET.has(first)) return OTHER_PATH;
  const base = '/' + first;
  const second = parts[1];
  if (second && SLUG_SET.has(first) && SLUG.test(second)) {
    const full = `${base}/${second}`;
    if (!seen) return full;
    if (seen.has(full)) return full;
    if (seen.size < MAX_SLUG_PATHS) {
      seen.add(full);
      return full;
    }
  }
  return base;
}

/** PURE. -> { ok: true, data } | { ok: false, error }. */
function validateBeacon(body, seen) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be an object' };
  for (const k of Object.keys(body)) if (!ALLOWED_KEYS.has(k)) return { ok: false, error: `unknown field: ${k}` };
  if (typeof body.path !== 'string') return { ok: false, error: 'bad path' };
  if (!SOURCES.includes(body.source)) return { ok: false, error: 'bad source' };
  if (!DEVICES.includes(body.device)) return { ok: false, error: 'bad device' };
  if (typeof body.engaged !== 'boolean' || typeof body.inApp !== 'boolean') return { ok: false, error: 'bad flag' };
  if (body.late !== undefined && body.late !== true) return { ok: false, error: 'bad late' };
  if (body.late === true && body.engaged !== true) return { ok: false, error: 'late needs engaged' };
  return { ok: true, data: { path: canonicalPath(body.path, seen), source: body.source, engaged: body.engaged, inApp: body.inApp, late: body.late === true } };
}

function counterKey(source, path, engaged, inApp) {
  return `${source}|${path}|${engaged ? 1 : 0}|${inApp ? 1 : 0}`;
}

/**
 * PURE. The counter increments one validated beacon makes: [[key, n], ...]. A late correction moves a visit from "left" to
 * "engaged": it decrements the SAME key's left bucket only when `leftNow` (that bucket's current count) is above zero, so a
 * bucket never goes below zero; without a positive left count it only adds the engaged visit.
 */
function incrementsFor(d, leftNow) {
  const out = [[counterKey(d.source, d.path, d.engaged, d.inApp), 1]];
  if (d.late && Number(leftNow) > 0) out.push([counterKey(d.source, d.path, false, d.inApp), -1]);
  return out;
}

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
    if (Number.isFinite(declared) && declared > maxBytes) return finish({ tooLarge: true });
    const chunks = [];
    let bytes = 0;
    req.on('data', (chunk) => {
      if (done) return;
      bytes += chunk.length;
      if (bytes > maxBytes) return finish({ tooLarge: true });
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

function createVisitMetricsRoutes(deps = {}) {
  const { sendJson, adminFirestore, firebaseAdmin } = deps;
  const env = deps.env || process.env;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const hits = new Map();
  const trustedHops = resolveTrustedHops(env);
  let slugDay = '';
  let slugSeen = new Set();

  /** The hardened client IP (emailCode.cjs): only the TRUSTED-proxy entry at the right of X-Forwarded-For counts, so a forged left-most entry cannot change the key. */
  function clientKey(req) {
    return clientIp(req, trustedHops);
  }
  function slugSetFor(day) {
    if (day !== slugDay) {
      slugDay = day;
      slugSeen = new Set();
    }
    return slugSeen;
  }
  function overCap(key, nowMs) {
    let e = hits.get(key);
    if (!e || nowMs - e.start >= RATE_WINDOW_MS) {
      if (!e && hits.size >= MAX_TRACKED_IPS) hits.clear();
      e = { start: nowMs, count: 0 };
      hits.set(key, e);
    }
    e.count += 1;
    return e.count > RATE_MAX;
  }
  function noContent(res) {
    res.statusCode = 204;
    return res.end();
  }

  async function handle(req, res) {
    try {
      if (isVisitMetricsDisabled(env)) return noContent(res);
      const ua = String((req.headers && req.headers['user-agent']) || '');
      if (!ua || BOT_UA.test(ua)) return noContent(res);
      const nowMs = now();
      if (overCap(clientKey(req), nowMs)) return sendJson(res, 429, { ok: false, error: 'too many requests' });
      if (!adminFirestore || typeof adminFirestore.collection !== 'function') return sendJson(res, 503, { ok: false, error: 'unavailable' });
      const read = await readBoundedJson(req, MAX_BODY_BYTES);
      if (read.tooLarge) return sendJson(res, 413, { ok: false, error: 'body too large' });
      if (read.invalid) return sendJson(res, 400, { ok: false, error: 'invalid JSON' });
      const day = istDayKey(nowMs);
      const checked = validateBeacon(read.body, slugSetFor(day));
      if (!checked.ok) return sendJson(res, 400, { ok: false, error: checked.error });
      const FV = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.FieldValue;
      if (!FV || typeof FV.increment !== 'function') return sendJson(res, 503, { ok: false, error: 'unavailable' });
      const ref = adminFirestore.collection(VISIT_DAILY_COLLECTION).doc(day);
      const write = (leftNow) => {
        const counts = {};
        for (const [key, n] of incrementsFor(checked.data, leftNow)) counts[key] = FV.increment(n);
        return { counts };
      };
      if (checked.data.late && typeof adminFirestore.runTransaction === 'function') {
        // The correction reads the left bucket first so it never decrements below zero (the only write that needs a read).
        const leftKey = counterKey(checked.data.source, checked.data.path, false, checked.data.inApp);
        await adminFirestore.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          const row = snap && snap.exists ? snap.data() || {} : {};
          const leftNow = row.counts && typeof row.counts === 'object' ? Number(row.counts[leftKey]) : 0;
          tx.set(ref, write(leftNow), { merge: true });
        });
      } else {
        await ref.set(write(0), { merge: true });
      }
      return noContent(res);
    } catch {
      return sendJson(res, 500, { ok: false, error: 'not recorded' });
    }
  }
  return { handle };
}

let mounted = null;
/** The ONE-LINE mount used by server/index.cjs; built once, on the first request. */
function handleVisitMetricsRequest(req, res, deps) {
  if (!mounted) mounted = createVisitMetricsRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = {
  createVisitMetricsRoutes,
  handleVisitMetricsRequest,
  validateBeacon,
  incrementsFor,
  counterKey,
  istDayKey,
  canonicalPath,
  ROUTE_PREFIXES,
  MAX_SLUG_PATHS,
  isVisitMetricsDisabled,
  VISIT_METRICS_PATH,
  VISIT_DAILY_COLLECTION,
  SOURCES,
  RATE_MAX,
};
