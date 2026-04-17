const jwksRsa = require('jwks-rsa');
const jwt = require('jsonwebtoken');

function deriveClerkConfig() {
  const key = String(process.env.VITE_CLERK_PUBLISHABLE_KEY || '').trim();
  const b64 = key.replace(/^pk_(test|live)_/, '');
  if (!b64) return null;
  try {
    const domain = Buffer.from(b64, 'base64').toString('utf8').replace(/\$$/, '');
    if (!domain || !domain.includes('.')) return null;
    return {
      jwksUri: `https://${domain}/.well-known/jwks.json`,
      issuer: `https://${domain}`,
    };
  } catch {
    return null;
  }
}

function createFirebaseAuthRoute(deps) {
  const { sendJson, firebaseAdmin } = deps;

  const clerkConfig = deriveClerkConfig();
  const jwksClient = clerkConfig
    ? jwksRsa({ jwksUri: clerkConfig.jwksUri, cache: true, cacheMaxAge: 600_000, rateLimit: true })
    : null;

  if (clerkConfig) {
    console.log('[firebase-auth] Clerk JWKS URI:', clerkConfig.jwksUri, '| issuer:', clerkConfig.issuer);
  } else {
    console.warn('[firebase-auth] VITE_CLERK_PUBLISHABLE_KEY not set — Clerk JWT verification disabled');
  }

  async function verifyClerkJwt(token) {
    if (!jwksClient || !clerkConfig) {
      throw new Error('Clerk JWKS client not configured (missing VITE_CLERK_PUBLISHABLE_KEY)');
    }
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid JWT: missing kid header');
    }
    const kid = decoded.header.kid;
    const signingKey = await new Promise((resolve, reject) => {
      jwksClient.getSigningKey(kid, (err, key) => {
        if (err) { reject(err); return; }
        resolve(key.getPublicKey());
      });
    });
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        signingKey,
        { algorithms: ['RS256'], issuer: clerkConfig.issuer },
        (err, payload) => {
          if (err) { reject(err); return; }
          resolve(payload);
        }
      );
    });
  }

  async function handleFirebaseToken(req, res) {
    if (!firebaseAdmin) {
      return sendJson(res, 503, {
        ok: false,
        error: 'Firebase Admin not configured. Set VITE_FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY.',
      });
    }

    const authHeader = String(req.headers['authorization'] || '');
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerToken) {
      return sendJson(res, 401, { ok: false, error: 'Missing Authorization: Bearer <clerk-session-token>' });
    }

    let uid;
    try {
      const payload = await verifyClerkJwt(bearerToken);
      uid = String(payload.sub || '').trim();
      if (!uid) throw new Error('Missing sub claim in verified Clerk token');
    } catch (err) {
      console.error('[firebase-auth] Clerk JWT verification failed:', err?.message || String(err));
      return sendJson(res, 401, { ok: false, error: 'Invalid or expired session token' });
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
