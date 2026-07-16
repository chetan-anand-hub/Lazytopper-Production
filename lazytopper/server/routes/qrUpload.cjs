/**
 * QR answer-handoff routes — the delivery path for "solved it on paper".
 *
 *   POST /api/qr-upload/new              (DESKTOP, AUTH REQUIRED) mint a slot
 *   GET  /api/qr-upload/:token/status    (PHONE,  token only)     liveness only
 *   POST /api/qr-upload/:token           (PHONE,  token only)     write ONE image
 *   GET  /api/qr-upload/pickup/:token    (DESKTOP, token only)    read once, destroy
 *
 * AUTH SPLIT (owner-decided — see qrUploadChannel.cjs for the full rationale):
 * MINT requires a Firebase ID token (the desktop student is already signed in and
 * must be signed in to grade anyway, so this costs no real user; it also ties every
 * stored object to a real uid and makes caps PER-UID rather than per-IP — per-IP
 * would throttle a whole school behind one NAT). UPLOAD requires only the token:
 * the phone is a different device, and a login wall there is precisely the friction
 * this feature exists to remove.
 *
 * The grader is untouched. Nothing here grades — the desktop drops the delivered
 * image into the same answer box the file input fills, and grades exactly as today.
 *
 * NEVER LOG THE PAYLOAD. No base64, no token, no filename reaches a log line: this
 * is a minor's handwritten work in flight.
 */

// 256-bit tokens, base64url-encoded => 43 chars of [A-Za-z0-9_-]. The bound is
// generous but keeps absurd inputs from ever reaching Firestore.
const TOKEN_RE = /^[A-Za-z0-9_-]{20,100}$/;

function createQrUploadRoutes(deps) {
  const { sendJson, readJson, firebaseAdmin, qrUploadChannel } = deps;

  // Fail-closed and HONEST: if the machinery is unconfigured the student gets a
  // real error, never a silent hang. This is the surface that would fire if
  // firebase-admin lacked a usable service-account credential.
  function unavailable(res) {
    return sendJson(res, 503, {
      ok: false,
      error: 'Phone upload is unavailable right now. Please upload from this device.',
    });
  }

  async function requireUid(req) {
    if (!firebaseAdmin) {
      return { ok: false, status: 503, error: 'Auth unavailable: firebase-admin not initialised' };
    }
    const authHeader = String(req.headers['authorization'] || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return { ok: false, status: 401, error: 'Unauthorized: Bearer ID token required' };
    }
    let decoded;
    try {
      decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch (_e) {
      return { ok: false, status: 401, error: 'Unauthorized: invalid ID token' };
    }
    if (!decoded || !decoded.uid) {
      return { ok: false, status: 401, error: 'Unauthorized: invalid ID token' };
    }
    return { ok: true, uid: decoded.uid };
  }

  // POST /api/qr-upload/new -> { ok, uploadToken, pickupToken, expiresAt }
  // ONLY uploadToken may go into the QR. pickupToken must never leave the desktop.
  async function handleMint(req, res) {
    if (!qrUploadChannel.isAvailable()) return unavailable(res);

    const auth = await requireUid(req);
    if (!auth.ok) return sendJson(res, auth.status, { ok: false, error: auth.error });

    // The host surface tells us which shape it wants ('document' | 'photo') so the
    // PHONE can lead with the right words. The channel validates + defaults it.
    let variant;
    try {
      const body = await readJson(req);
      variant = body && body.variant;
    } catch (_e) {
      variant = undefined; // A bodyless/!json mint is fine — the channel defaults it.
    }

    try {
      const slot = await qrUploadChannel.mintSlot(auth.uid, variant);
      return sendJson(res, 200, { ok: true, ...slot });
    } catch (e) {
      console.warn('[qr-upload] mint failed:', e && e.message);
      return unavailable(res);
    }
  }

  // GET /api/qr-upload/:uploadToken/status -> liveness ONLY (no student content).
  // Lets the phone say "expired" BEFORE the student photographs 3MB.
  async function handleStatus(req, res, uploadToken) {
    if (!qrUploadChannel.isAvailable()) return unavailable(res);
    if (!TOKEN_RE.test(uploadToken)) {
      return sendJson(res, 404, { ok: false, reason: 'expired' });
    }
    try {
      const result = await qrUploadChannel.peekSlot(uploadToken);
      if (!result.ok) return sendJson(res, 404, { ok: false, reason: result.reason });
      // `variant` = which words the phone should lead with. No student content.
      return sendJson(res, 200, { ok: true, state: result.state, variant: result.variant });
    } catch (e) {
      console.warn('[qr-upload] status failed:', e && e.message);
      return unavailable(res);
    }
  }

  // POST /api/qr-upload/:uploadToken  { imageBase64, imageMimeType } -> { ok:true }
  // Returns NOTHING but ok. This is the write-only half of the capability.
  async function handleUpload(req, res, uploadToken) {
    if (!qrUploadChannel.isAvailable()) return unavailable(res);
    if (!TOKEN_RE.test(uploadToken)) {
      return sendJson(res, 404, { ok: false, reason: 'expired' });
    }

    let payload;
    try {
      payload = await readJson(req);
    } catch (_e) {
      return sendJson(res, 400, { ok: false, reason: 'invalid', error: 'Invalid JSON' });
    }

    try {
      const result = await qrUploadChannel.putBlob(uploadToken, payload);
      if (!result.ok) {
        const status = result.reason === 'invalid' ? 400 : 404;
        return sendJson(res, status, { ok: false, reason: result.reason, error: result.error });
      }
      return sendJson(res, 200, { ok: true });
    } catch (e) {
      console.warn('[qr-upload] upload failed:', e && e.message);
      return unavailable(res);
    }
  }

  // GET /api/qr-upload/pickup/:pickupToken
  //   -> { ok:true, status:'waiting' }                        nothing yet
  //   -> { ok:true, status:'ready', imageBase64, imageMimeType } and DESTROYS it
  //   -> 404 { status:'expired' }                             honest, never a hang
  async function handlePickup(req, res, pickupToken) {
    if (!qrUploadChannel.isAvailable()) return unavailable(res);
    if (!TOKEN_RE.test(pickupToken)) {
      return sendJson(res, 404, { ok: false, status: 'expired' });
    }
    try {
      const result = await qrUploadChannel.consumeSlot(pickupToken);
      if (result.ok) {
        return sendJson(res, 200, {
          ok: true,
          status: 'ready',
          imageBase64: result.imageBase64,
          imageMimeType: result.imageMimeType,
        });
      }
      if (result.reason === 'waiting') return sendJson(res, 200, { ok: true, status: 'waiting' });
      if (result.reason === 'error') return unavailable(res);
      return sendJson(res, 404, { ok: false, status: 'expired' });
    } catch (e) {
      console.warn('[qr-upload] pickup failed:', e && e.message);
      return unavailable(res);
    }
  }

  return { handleMint, handleStatus, handleUpload, handlePickup };
}

module.exports = { createQrUploadRoutes, TOKEN_RE };
