/**
 * packSampleSeen.cjs - POST /api/pack-sample-seen (SAMPLE-FOLLOWUP-1, owner approved 4 Nov 2026)
 *
 * A SIGNED-IN student saved a pack's free sample page. Records, ONCE per student per pack, WHEN (the server's clock) in the
 * student's own `nudgeEmails/{uid}` ledger row, so the nudge job (services/nudgeEmail.cjs runSampleFollowup, services/
 * sampleFollowup.cjs) can consider ONE follow-up email ~24 h later. A signed-out visitor never calls this: the page sends
 * nothing without a signed-in user, and this route refuses a request with no valid ID token (401).
 *
 *   - body `{ pack: "<sku>:<subject|all>" }` and nothing else: a sample key from the closed list (parseSampleKey), else 400;
 *   - keyed on the VERIFIED uid (verifiedCaller), never a body field;
 *   - FIRST WRITE WINS: a second call for the same pack changes nothing (the 24 h clock does not restart);
 *   - writes `nudgeEmails/{uid}.sampleSeenAt_<pack> = ms`; it holds no email address, name or phone;
 *   - `nudgeEmails` is server-only (firestore.rules does not name it; browsers hit the deny-all catch-all) and is erased with the
 *     account and included in the export (studentDataMap.ts "nudgeEmails").
 */

const { parseSampleKey, seenField } = require('../services/sampleFollowup.cjs');

const PACK_SAMPLE_SEEN_PATH = '/api/pack-sample-seen';
const NUDGE_EMAILS_COLLECTION = 'nudgeEmails';
const MAX_BODY_BYTES = 256;
const MAX_CALLS_PER_WINDOW = 20;
const CALL_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_UIDS = 10000;

/** Validate the body: exactly `{ pack }`, a known sample key. PURE. */
function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be an object' };
  for (const key of Object.keys(body)) if (key !== 'pack') return { ok: false, error: `unknown field: ${key}` };
  if (!parseSampleKey(body.pack)) return { ok: false, error: 'unknown pack sample' };
  return { ok: true, pack: body.pack };
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

function createPackSampleSeenRoutes(deps = {}) {
  const { sendJson, verifiedCaller, firebaseAdmin, adminFirestore } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const callsByUid = new Map();

  function overCap(uid, nowMs) {
    let entry = callsByUid.get(uid);
    if (!entry || nowMs - entry.start >= CALL_WINDOW_MS) {
      if (!entry && callsByUid.size >= MAX_TRACKED_UIDS) callsByUid.clear();
      entry = { start: nowMs, count: 0 };
      callsByUid.set(uid, entry);
    }
    entry.count += 1;
    return entry.count > MAX_CALLS_PER_WINDOW;
  }

  async function handle(req, res) {
    try {
      if (!verifiedCaller || !firebaseAdmin || typeof firebaseAdmin.auth !== 'function' || !adminFirestore) {
        return sendJson(res, 503, { ok: false, error: 'sample recording unavailable' });
      }
      const verification = await verifiedCaller.resolveVerifiedCaller(req);
      const uid = verification && typeof verification.uid === 'string' ? verification.uid.trim() : '';
      if (!uid) return sendJson(res, 401, { ok: false, error: 'Unauthorized: valid ID token required' });
      const nowMs = now();
      if (overCap(uid, nowMs)) return sendJson(res, 429, { ok: false, error: 'too many requests' });

      const read = await readBoundedJson(req, MAX_BODY_BYTES);
      if (read.tooLarge) return sendJson(res, 413, { ok: false, error: 'body too large' });
      if (read.invalid) return sendJson(res, 400, { ok: false, error: 'invalid JSON' });
      const checked = validateBody(read.body);
      if (!checked.ok) return sendJson(res, 400, { ok: false, error: checked.error });

      const ref = adminFirestore.collection(NUDGE_EMAILS_COLLECTION).doc(uid);
      // FIRST WRITE WINS, decided inside a transaction so two taps at once cannot restart the 24 h clock.
      const field = seenField(checked.pack);
      await adminFirestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const row = snap.exists ? snap.data() || {} : {};
        if (typeof row[field] === 'number') return;
        tx.set(ref, { [field]: nowMs }, { merge: true });
      });

      // The ERASURE RACE (the signupSource pattern): an account erased while this request was in flight must not keep the row.
      try {
        await firebaseAdmin.auth().getUser(uid);
      } catch (e) {
        if (e && e.code === 'auth/user-not-found') await ref.delete();
      }
      res.statusCode = 204;
      return res.end();
    } catch {
      return sendJson(res, 500, { ok: false, error: 'sample not recorded' });
    }
  }

  return { handle };
}

/** The ONE-LINE mount used by server/index.cjs; built once, on the first request. */
let mounted = null;
function handlePackSampleSeenRequest(req, res, deps) {
  if (!mounted) mounted = createPackSampleSeenRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = { createPackSampleSeenRoutes, handlePackSampleSeenRequest, validateBody, PACK_SAMPLE_SEEN_PATH, MAX_BODY_BYTES, MAX_CALLS_PER_WINDOW };
