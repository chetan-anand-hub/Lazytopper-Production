/**
 * visitMetrics.cjs - POST /api/metrics/visit (QUICK-LEAVE-1, owner YES 26 Nov 2026)
 *
 * The real "left without engaging" rate. The client (src/analytics/quickLeave.ts) sends ONE small beacon per visit:
 * `{ path, source, engaged, inApp, device }` (+ `late: true` when a visit already reported as a leave later engaged).
 * No auth (a signed-out visitor sends it). Stores COUNTERS ONLY, never a record of a visitor:
 *
 *   visitDaily/{IST yyyy-mm-dd}  { counts: { "<source>|<path>|<engaged 0/1>|<inApp 0/1>": FieldValue.increment(n) } }
 *
 *   - strict whitelist: an unknown field, an unknown source / device, a non-boolean flag, a path outside the charset or over
 *     200 chars is a 400; nothing is trimmed or "fixed". Paths keep their first two segments (bounds the key space);
 *   - bots (empty or crawler / headless / tool user agents) get 204 and write nothing;
 *   - rate-limited per client IP (in memory, never stored, never logged); over the cap -> 429;
 *   - `late: true` moves one visit from "left" to "engaged": +1 engaged key, -1 left key;
 *   - firestore.rules does not name visitDaily: browsers hit the deny-all catch-all; only the Admin SDK writes / reads it;
 *   - KILL SWITCH VISIT_METRICS_DISABLED=1 -> 204, nothing written.
 */

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

/** The first two path segments only (bounds how many distinct keys a day can hold). */
function capPath(path) {
  const parts = path.split('/').filter((s, i) => i > 0 && s !== '');
  return '/' + parts.slice(0, 2).join('/');
}

/** PURE. -> { ok: true, data } | { ok: false, error }. */
function validateBeacon(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be an object' };
  for (const k of Object.keys(body)) if (!ALLOWED_KEYS.has(k)) return { ok: false, error: `unknown field: ${k}` };
  if (typeof body.path !== 'string' || body.path.length === 0 || body.path.length > PATH_MAX || !PATH_CHARSET.test(body.path)) return { ok: false, error: 'bad path' };
  if (!SOURCES.includes(body.source)) return { ok: false, error: 'bad source' };
  if (!DEVICES.includes(body.device)) return { ok: false, error: 'bad device' };
  if (typeof body.engaged !== 'boolean' || typeof body.inApp !== 'boolean') return { ok: false, error: 'bad flag' };
  if (body.late !== undefined && body.late !== true) return { ok: false, error: 'bad late' };
  if (body.late === true && body.engaged !== true) return { ok: false, error: 'late needs engaged' };
  return { ok: true, data: { path: capPath(body.path), source: body.source, engaged: body.engaged, inApp: body.inApp, late: body.late === true } };
}

function counterKey(source, path, engaged, inApp) {
  return `${source}|${path}|${engaged ? 1 : 0}|${inApp ? 1 : 0}`;
}

/** PURE. The counter increments one validated beacon makes: [[key, n], ...]. */
function incrementsFor(d) {
  const out = [[counterKey(d.source, d.path, d.engaged, d.inApp), 1]];
  if (d.late) out.push([counterKey(d.source, d.path, false, d.inApp), -1]);
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

  function clientKey(req) {
    const fwd = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
    return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
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
      const checked = validateBeacon(read.body);
      if (!checked.ok) return sendJson(res, 400, { ok: false, error: checked.error });
      const FV = firebaseAdmin && firebaseAdmin.firestore && firebaseAdmin.firestore.FieldValue;
      if (!FV || typeof FV.increment !== 'function') return sendJson(res, 503, { ok: false, error: 'unavailable' });
      const counts = {};
      for (const [key, n] of incrementsFor(checked.data)) counts[key] = FV.increment(n);
      await adminFirestore.collection(VISIT_DAILY_COLLECTION).doc(istDayKey(nowMs)).set({ counts }, { merge: true });
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
  capPath,
  isVisitMetricsDisabled,
  VISIT_METRICS_PATH,
  VISIT_DAILY_COLLECTION,
  SOURCES,
  RATE_MAX,
};
