'use strict';
// FREE-RES-1 - the free chapter practice downloads (MCQ banks, later notes), published by CI under `free/` in the private bucket.
//
//   GET  /api/free-resources       PUBLIC. The list (never a storage path) + the zip entries. `{ ok: true, resources: [] }` when nothing
//                                  is published: an honest empty state, never a placeholder.
//   POST /api/free-resources/link  body { id }. A VERIFIED uid (401 otherwise). Returns a 15-minute v4 signed URL served as an attachment.
//
// No licensee stamping, no Firestore reads or writes, no entitlement check: these are free to every signed-in account. The only gate is
// the sign-in (standing rule: a signed-out visitor gets no download), plus a per-uid rate limit.
//
// ★ A STORAGE PATH NEVER LEAVES THIS FILE except inside a signed URL. The list is rebuilt from an allow-list of fields, and a manifest
//   entry whose path is not exactly free/files/<sha256>.pdf (or free/zips/<sha256>/<group>.zip) is dropped, so a hand-edited current.json
//   cannot make the server sign another object.

const { readRawBody } = require('./payments.cjs');

const FREE_LIST_PATH = '/api/free-resources';
const FREE_LINK_PATH = '/api/free-resources/link';
const CURRENT_PATH = 'free/current.json';
const MAX_JSON_BYTES = 2 * 1024;
const LINK_TTL_MS = 15 * 60 * 1000;
const CACHE_MS = 10 * 60 * 1000;
const ABSENT_CACHE_MS = 60 * 1000;
const LINKS_PER_HOUR = 60;
const ZIPS_PER_HOUR = 6;
const MAX_MANIFEST_BYTES = 256 * 1024;

const KINDS = ['mcq_bank', 'notes', 'kit'];
const SUBJECTS = ['Maths', 'Science', 'All']; // 'All' only for a kit
const GROUPS = ['maths', 'science', 'all'];
const ID_RE = /^[a-z0-9][a-z0-9-]{0,80}$/;
const FILE_PATH_RE = /^free\/files\/[0-9a-f]{64}\.pdf$/;
const ZIP_PATH_RE = /^free\/zips\/[0-9a-f]{64}\/(maths|science|all)\.zip$/;

const headerSafe = (s) => String(s).replace(/[^A-Za-z0-9._ -]/g, '');
const isRecord = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isCount = (v) => typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Keep only well-formed entries, with ONLY the fields the server uses. Anything else in the file is ignored. */
function parseCurrent(raw) {
  if (!isRecord(raw) || raw.version !== 1) return { resources: [], zips: [] };
  const seen = new Set();
  const resources = [];
  for (const r of Array.isArray(raw.resources) ? raw.resources : []) {
    if (!isRecord(r)) continue;
    const ok =
      typeof r.id === 'string' && ID_RE.test(r.id) && !seen.has(r.id) &&
      KINDS.includes(r.kind) && SUBJECTS.includes(r.subject) && (r.subject !== 'All' || r.kind === 'kit') &&
      typeof r.chapter === 'string' && r.chapter && typeof r.title === 'string' && r.title &&
      typeof r.path === 'string' && FILE_PATH_RE.test(r.path) &&
      typeof r.filename === 'string' && headerSafe(r.filename) && isCount(r.bytes) && isCount(r.pages) &&
      (r.questions === null || isCount(r.questions));
    if (!ok) continue;
    seen.add(r.id);
    resources.push({ id: r.id, kind: r.kind, subject: r.subject, chapter: r.chapter, title: r.title, bytes: r.bytes, pages: r.pages, questions: r.questions, path: r.path, filename: r.filename });
  }
  const zips = [];
  for (const z of Array.isArray(raw.zips) ? raw.zips : []) {
    if (!isRecord(z)) continue;
    const ok =
      typeof z.id === 'string' && ID_RE.test(z.id) && !seen.has(z.id) && GROUPS.includes(z.group) && z.id === `zip-${z.group}` &&
      typeof z.path === 'string' && ZIP_PATH_RE.test(z.path) && z.path.endsWith(`/${z.group}.zip`) &&
      isCount(z.bytes) && isCount(z.count) && typeof z.filename === 'string' && headerSafe(z.filename);
    if (!ok) continue;
    seen.add(z.id);
    zips.push({ id: z.id, group: z.group, bytes: z.bytes, count: z.count, path: z.path, filename: z.filename });
  }
  return { resources, zips };
}

function createFreeResourceRoutes(deps = {}) {
  const { sendJson, verifiedCaller, bucket, telemetry, now = () => Date.now() } = deps;

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch {
      /* a counter must never fail a request */
    }
  }

  function theBucket() {
    return typeof bucket === 'function' ? bucket() : bucket;
  }

  let cached = null; // { at, ttl, value: { resources, zips } }
  async function readCurrent() {
    if (cached && now() - cached.at < cached.ttl) return cached.value;
    let value = { resources: [], zips: [] };
    let ttl = ABSENT_CACHE_MS;
    try {
      const b = theBucket();
      if (b) {
        const file = b.file(CURRENT_PATH);
        const [exists] = await file.exists();
        if (exists) {
          const [buf] = await file.download();
          if (buf && buf.length <= MAX_MANIFEST_BYTES) {
            value = parseCurrent(JSON.parse(Buffer.from(buf).toString('utf8')));
            ttl = CACHE_MS;
          }
        }
      }
    } catch {
      /* absent or unreadable: the honest empty list */
    }
    cached = { at: now(), ttl, value };
    return value;
  }

  async function handleList(_req, res) {
    const { resources, zips } = await readCurrent();
    return sendJson(res, 200, {
      ok: true,
      resources: resources.map(({ id, kind, subject, chapter, title, bytes, pages, questions }) => ({ id, kind, subject, chapter, title, bytes, pages, questions })),
      zips: zips.map(({ id, group, bytes, count }) => ({ id, group, bytes, count })),
    });
  }

  const hits = new Map();
  function limited(key, max) {
    const t = now();
    const recent = (hits.get(key) || []).filter((x) => t - x < 60 * 60 * 1000);
    recent.push(t);
    hits.delete(key);
    hits.set(key, recent); // most recently used last
    while (hits.size > 5000) hits.delete(hits.keys().next().value);
    return recent.length > max;
  }

  async function readBody(req, res) {
    try {
      const buf = await readRawBody(req, MAX_JSON_BYTES);
      const parsed = JSON.parse(buf.length ? buf.toString('utf8') : '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      return parsed;
    } catch {
      sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
      return null;
    }
  }

  async function handleLink(req, res) {
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) {
      emit('free.link.unauth');
      return sendJson(res, 401, { ok: false, error: 'unauthenticated' });
    }
    const body = await readBody(req, res);
    if (!body) return undefined;
    if (typeof body.id !== 'string' || body.id.length > 100) return sendJson(res, 400, { ok: false, error: 'bad_request' });
    const { resources, zips } = await readCurrent();
    const entry = resources.find((r) => r.id === body.id) || zips.find((z) => z.id === body.id);
    if (!entry) {
      emit('free.link.unknown');
      return sendJson(res, 404, { ok: false, error: 'unknown_id' });
    }
    const isZip = ZIP_PATH_RE.test(entry.path);
    if (limited(`${isZip ? 'z' : 'l'}:${uid}`, isZip ? ZIPS_PER_HOUR : LINKS_PER_HOUR)) return sendJson(res, 429, { ok: false, error: 'too_many_requests' });
    try {
      const b = theBucket();
      if (!b) return sendJson(res, 503, { ok: false, error: 'not_ready' });
      const expiresAtMs = now() + LINK_TTL_MS;
      const [url] = await b.file(entry.path).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAtMs,
        responseDisposition: `attachment; filename="${headerSafe(entry.filename)}"`,
        responseType: isZip ? 'application/zip' : 'application/pdf',
      });
      emit(isZip ? 'free.zip.ok' : 'free.link.ok');
      return sendJson(res, 200, { ok: true, url, filename: entry.filename, kind: isZip ? 'zip' : 'file', expiresAtMs });
    } catch (e) {
      emit('free.link.failed');
      console.error('[free-resources/link] failed:', e && e.message);
      return sendJson(res, 500, { ok: false, error: 'Could not prepare your file.' });
    }
  }

  return { handleList, handleLink };
}

module.exports = { createFreeResourceRoutes, parseCurrent, FREE_LIST_PATH, FREE_LINK_PATH, CURRENT_PATH, LINK_TTL_MS };
