/**
 * signupSource.cjs — POST /api/signup-source (SOURCE-1)
 *
 * Records, ONCE, where a brand-new account came from: the coarse landing source the
 * client kept in this tab's sessionStorage (src/analytics/visitSource.ts) and sends right
 * after sign-up. Read by the admin Students page (adminStudents.cjs) as the Source column.
 *
 * ★★ OWNER RULING 12 Oct 2026 13:16 IST (DECISION 107c): a single-visit source capture is
 * a narrow exception to the cookieless rule. This is the SERVER half of its limits:
 *   - it accepts ONLY the coarse fields below; an unknown key is a 400, and so is a gclid /
 *     fbclid VALUE (they are booleans — a click id is never stored);
 *   - it is keyed on the VERIFIED uid, never a body field, and only for an Auth account
 *     created <= 15 minutes ago (Auth metadata `creationTime`), so the source of an old
 *     account cannot be written, or rewritten, later;
 *   - the write is CREATE-ONLY: a second call for the same uid changes nothing;
 *   - `signupSources` is server-only. firestore.rules does NOT name it, so browsers are
 *     denied by the deny-all catch-all; only the Admin SDK reaches it.
 * It is student data (a doc per uid): mapped in studentDataMap.ts, erased and exported.
 *
 * The token is verified through the shared verifiedCaller (never parsed by hand here).
 */

const SIGNUP_SOURCE_PATH = '/api/signup-source';
const SIGNUP_SOURCES_COLLECTION = 'signupSources';

/** An account older than this can no longer have its source recorded. */
const MAX_ACCOUNT_AGE_MS = 15 * 60 * 1000;
/** A tiny body: eight coarse fields. */
const MAX_BODY_BYTES = 1024;
const MAX_CALLS_PER_WINDOW = 5;
const CALL_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_UIDS = 10000;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
const ALLOWED_KEYS = new Set(['ref', ...UTM_KEYS, 'landing', 'gclid', 'fbclid']);
const UTM_MAX = 64;
const UTM_CHARSET = /^[A-Za-z0-9_.\-{}]+$/;
const HOST_CHARSET = /^[a-z0-9.-]{1,253}$/;
const LANDING_CHARSET = /^\/[A-Za-z0-9_\-./:]*$/;
const LANDING_MAX = 200;

/**
 * Validate the body. Returns `{ ok: true, data }` (every field present, normalised) or
 * `{ ok: false, error }`. Strict by design: it does not trim, truncate or "fix" anything.
 */
function validateSource(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'body must be an object' };
  }
  for (const key of Object.keys(body)) {
    if (!ALLOWED_KEYS.has(key)) return { ok: false, error: `unknown field: ${key}` };
  }
  const data = {};

  const ref = body.ref === undefined ? null : body.ref;
  if (ref !== null && (typeof ref !== 'string' || !HOST_CHARSET.test(ref))) {
    return { ok: false, error: 'ref must be a hostname or null' };
  }
  data.ref = ref;

  for (const key of UTM_KEYS) {
    const v = body[key] === undefined ? null : body[key];
    if (v !== null && (typeof v !== 'string' || v.length === 0 || v.length > UTM_MAX || !UTM_CHARSET.test(v))) {
      return { ok: false, error: `${key} must be up to ${UTM_MAX} characters of [A-Za-z0-9_.-{}] or null` };
    }
    data[key] = v;
  }

  const landing = body.landing === undefined ? '/' : body.landing;
  if (typeof landing !== 'string' || landing.length > LANDING_MAX || !LANDING_CHARSET.test(landing)) {
    return { ok: false, error: 'landing must be a path without query or hash' };
  }
  data.landing = landing;

  for (const key of ['gclid', 'fbclid']) {
    const v = body[key] === undefined ? false : body[key];
    if (typeof v !== 'boolean') return { ok: false, error: `${key} must be a boolean (never the value)` };
    data[key] = v;
  }
  return { ok: true, data };
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

function isAlreadyExists(e) {
  if (!e) return false;
  return e.code === 6 || e.code === 'already-exists' || /already exists/i.test(String(e.message || ''));
}

function createSignupSourceRoutes(deps = {}) {
  const { sendJson, verifiedCaller, firebaseAdmin, adminFirestore } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const callsByUid = new Map();

  function overCap(uid, nowMs) {
    let entry = callsByUid.get(uid);
    if (!entry || nowMs - entry.start >= CALL_WINDOW_MS) {
      if (!entry && callsByUid.size >= MAX_TRACKED_UIDS) {
        for (const [k, v] of callsByUid) {
          if (nowMs - v.start >= CALL_WINDOW_MS) callsByUid.delete(k);
        }
        if (callsByUid.size >= MAX_TRACKED_UIDS) callsByUid.clear();
      }
      entry = { start: nowMs, count: 0 };
      callsByUid.set(uid, entry);
    }
    entry.count += 1;
    return entry.count > MAX_CALLS_PER_WINDOW;
  }

  async function handleSignupSource(req, res) {
    try {
      if (!verifiedCaller || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function' || !adminFirestore) {
        return sendJson(res, 503, { ok: false, error: 'source recording unavailable' });
      }
      const verification = await verifiedCaller.resolveVerifiedCaller(req);
      const uid = verification && typeof verification.uid === 'string' ? verification.uid.trim() : '';
      if (!uid) return sendJson(res, 401, { ok: false, error: 'Unauthorized: valid ID token required' });

      const nowMs = now();
      if (overCap(uid, nowMs)) return sendJson(res, 429, { ok: false, error: 'too many requests' });

      const read = await readBoundedJson(req, MAX_BODY_BYTES);
      if (read.tooLarge) return sendJson(res, 413, { ok: false, error: 'body too large' });
      if (read.invalid) return sendJson(res, 400, { ok: false, error: 'invalid JSON' });
      const checked = validateSource(read.body);
      if (!checked.ok) return sendJson(res, 400, { ok: false, error: checked.error });

      // ★ THE AGE CHECK — what stops an old account's source being written later.
      let createdMs = NaN;
      try {
        const user = await firebaseAdmin.auth().getUser(uid);
        createdMs = Date.parse(user && user.metadata && user.metadata.creationTime);
      } catch {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized: account not found' });
      }
      const age = nowMs - createdMs;
      if (!Number.isFinite(age) || age > MAX_ACCOUNT_AGE_MS) {
        return sendJson(res, 409, { ok: false, error: 'account too old to record a source' });
      }

      const FieldValue = firebaseAdmin.firestore && firebaseAdmin.firestore.FieldValue;
      if (!FieldValue) throw new Error('firestore FieldValue unavailable');
      try {
        // ★ CREATE-ONLY: an existing doc is never overwritten.
        await adminFirestore
          .collection(SIGNUP_SOURCES_COLLECTION)
          .doc(uid)
          .create({ ...checked.data, capturedAt: FieldValue.serverTimestamp() });
      } catch (e) {
        if (!isAlreadyExists(e)) throw e;
      }
      res.statusCode = 204;
      return res.end();
    } catch {
      return sendJson(res, 500, { ok: false, error: 'source not recorded' });
    }
  }

  return { handleSignupSource };
}

/** The ONE-LINE mount used by server/index.cjs; built once, on the first request. */
let mounted = null;
function handleSignupSourceRequest(req, res, deps) {
  if (!mounted) mounted = createSignupSourceRoutes(deps);
  return mounted.handleSignupSource(req, res);
}

module.exports = {
  createSignupSourceRoutes,
  handleSignupSourceRequest,
  validateSource,
  SIGNUP_SOURCE_PATH,
  SIGNUP_SOURCES_COLLECTION,
  MAX_ACCOUNT_AGE_MS,
  MAX_BODY_BYTES,
  MAX_CALLS_PER_WINDOW,
};
