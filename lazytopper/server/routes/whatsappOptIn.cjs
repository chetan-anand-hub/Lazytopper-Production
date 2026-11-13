/**
 * whatsappOptIn.cjs - POST /api/whatsapp/optin (WHATSAPP-OPTIN-1, owner 13 Nov 2026)
 *
 * A visitor (no account, no sign-in) on a free pack sample ticked "Send me updates on WhatsApp" and gave a mobile number so the
 * pack's link can be sent to them. Body `{ phone, consent: true, packId, consentVersion }`.
 *
 *   - 400 on an invalid Indian mobile, on consent !== true, on an unknown pack sample key, or an unknown consentVersion;
 *   - rate-limited per client IP with the product's ONE limiter (rateLimiter.cjs), as guest pay does;
 *   - writes `waOptIns/{sha256(E.164)}` through the Admin SDK ONLY: { phone, packIds (union), consentText (the server's constant
 *     label), consentVersion, firstAt, lastAt, source: 'sample' }. firestore.rules does not name the collection, so a browser
 *     hits the deny-all catch-all; no client code reads or writes it;
 *   - the number is NEVER logged (no console call here carries it) and never goes to analytics; the response echoes nothing;
 *   - WA_OPTIN_DISABLED=1 -> 404.
 */

const { createRateLimiter, ANONYMOUS_CLASS } = require('../services/rateLimiter.cjs');
const { parseSampleKey } = require('../services/sampleFollowup.cjs');
const { WA_OPTIN_LABEL, WA_OPTIN_VERSION, WA_OPTIN_COLLECTION, isWaOptInDisabled, readOptIn, optInDocId } = require('../services/waOptIn.cjs');

const WA_OPTIN_PATH = '/api/whatsapp/optin';
const MAX_BODY_BYTES = 512;
const MAX_CALLS_PER_CLIENT_PER_DAY = 20;
const MAX_PACK_IDS = 20;

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

/** PURE. -> { ok: true, phone, packId } | { ok: false, error }. The error text never carries the number. */
function validateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'body must be an object' };
  if (body.consent !== true) return { ok: false, error: 'consent required' };
  if (typeof body.consentVersion === 'string' && body.consentVersion !== WA_OPTIN_VERSION) return { ok: false, error: 'unknown consent version' };
  const optIn = readOptIn(body);
  if (!optIn) return { ok: false, error: 'invalid phone' };
  if (!parseSampleKey(body.packId)) return { ok: false, error: 'unknown pack' };
  return { ok: true, phone: optIn.phone, packId: body.packId };
}

function createWhatsappOptInRoutes(deps = {}) {
  const { sendJson, adminFirestore, telemetry } = deps;
  const env = deps.env || process.env;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const limiter = createRateLimiter({
    telemetry,
    now,
    paidEndpoints: { [WA_OPTIN_PATH]: 'waOptIn' },
    limits: { [ANONYMOUS_CLASS]: { soft: Math.ceil(MAX_CALLS_PER_CLIENT_PER_DAY / 2), hard: MAX_CALLS_PER_CLIENT_PER_DAY } },
  });

  async function handle(req, res) {
    try {
      if (isWaOptInDisabled(env)) return sendJson(res, 404, { ok: false, error: 'Not found' });
      const verdict = limiter.check(req, WA_OPTIN_PATH, '', { signedOut: true });
      if (!verdict.allowed) return sendJson(res, 429, { ok: false, error: 'Too many attempts. Please try again tomorrow.' });
      if (!adminFirestore || typeof adminFirestore.collection !== 'function') return sendJson(res, 503, { ok: false, error: 'unavailable' });

      const read = await readBoundedJson(req, MAX_BODY_BYTES);
      if (read.tooLarge) return sendJson(res, 413, { ok: false, error: 'body too large' });
      if (read.invalid) return sendJson(res, 400, { ok: false, error: 'invalid JSON' });
      const checked = validateBody(read.body);
      if (!checked.ok) return sendJson(res, 400, { ok: false, error: checked.error });

      const ref = adminFirestore.collection(WA_OPTIN_COLLECTION).doc(optInDocId(checked.phone));
      const nowMs = now();
      const write = async (get, set) => {
        const snap = await get();
        const row = snap && snap.exists ? snap.data() || {} : {};
        const ids = Array.isArray(row.packIds) ? row.packIds.filter((x) => typeof x === 'string') : [];
        if (!ids.includes(checked.packId) && ids.length < MAX_PACK_IDS) ids.push(checked.packId);
        set({
          phone: checked.phone,
          packIds: ids,
          consentText: WA_OPTIN_LABEL,
          consentVersion: WA_OPTIN_VERSION,
          firstAt: typeof row.firstAt === 'number' ? row.firstAt : nowMs,
          lastAt: nowMs,
          source: 'sample',
        });
      };
      if (typeof adminFirestore.runTransaction === 'function') {
        await adminFirestore.runTransaction((tx) => write(() => tx.get(ref), (doc) => tx.set(ref, doc, { merge: true })));
      } else {
        await write(() => ref.get(), (doc) => ref.set(doc, { merge: true }));
      }
      return sendJson(res, 200, { ok: true });
    } catch {
      // Deliberately nothing from the request or the error: the number must never reach a log.
      console.error('[whatsapp/optin] not stored');
      return sendJson(res, 500, { ok: false, error: 'not saved' });
    }
  }

  return { handle };
}

let mounted = null;
/** The ONE-LINE mount used by server/index.cjs; built once, on the first request. */
function handleWhatsappOptInRequest(req, res, deps) {
  if (!mounted) mounted = createWhatsappOptInRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = { createWhatsappOptInRoutes, handleWhatsappOptInRequest, validateBody, WA_OPTIN_PATH, MAX_BODY_BYTES, MAX_CALLS_PER_CLIENT_PER_DAY };
