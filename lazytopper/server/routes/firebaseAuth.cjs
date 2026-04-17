function createFirebaseAuthRoute(deps) {
  const { sendJson, readJson, firebaseAdmin } = deps;

  async function handleFirebaseToken(req, res) {
    if (!firebaseAdmin) {
      return sendJson(res, 503, {
        ok: false,
        error: 'Firebase Admin not configured. Set VITE_FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY.',
      });
    }

    let payload;
    try {
      payload = await readJson(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }

    const uid = String(payload.uid || '').trim();
    if (!uid || uid.length > 128) {
      return sendJson(res, 400, { ok: false, error: 'Missing or invalid uid' });
    }

    try {
      const customToken = await firebaseAdmin.auth().createCustomToken(uid);
      return sendJson(res, 200, { ok: true, token: customToken });
    } catch (err) {
      const msg = err?.message || String(err);
      console.error('[firebase-auth] createCustomToken failed for uid=%s: %s', uid, msg);
      if (msg.includes('credential') || msg.includes('service account')) {
        return sendJson(res, 503, {
          ok: false,
          error: 'Firebase service account credentials required. Set FIREBASE_SERVICE_ACCOUNT_KEY.',
        });
      }
      return sendJson(res, 500, { ok: false, error: 'Failed to create Firebase token' });
    }
  }

  return { handleFirebaseToken };
}

module.exports = { createFirebaseAuthRoute };
