/**
 * adminExtendPremium — ADMIN-EXTEND-1: POST /api/admin/extend-premium
 *
 *   body: { uid, days?, reason?, requestId }   days 1-30 (default 7),
 *                                              reason default "feedback call reward"
 *   200 { ok, replayed, extension }   400 bad input   409 nothing to extend
 *   401 / 403 / 503 from the admin gate
 *
 * ★★ ADMIN-ONLY, THROUGH THE ONE SHARED GATE. `requireAdmin` is handed in by index.cjs as
 * `adminTelemetryRoutes.requireFirebaseAdmin` — the ADMIN_FIREBASE_UIDS gate the admin
 * Students page (adminStudents.cjs) already uses: 503 when the env or firebase-admin is
 * missing, 401 without a valid Bearer ID token, 403 for a valid uid not on the allowlist.
 * It runs FIRST, before the body is read. A missing `requireAdmin` is a 503, so this
 * route cannot fall open by being mounted wrong.
 *
 * Why not the PASS_ADMIN_SECRET X-Admin-Key that /api/admin/grant-pass uses: that route
 * is curl-only owner tooling, and a shared secret cannot live in a browser page. This
 * action is used from the admin page, so it takes the browser-safe admin identity —
 * a signed-in Firebase user on the allowlist — and records WHICH admin did it.
 *
 * ★ NOTHING THAT DECIDES TIME OR MONEY COMES FROM THE BODY beyond the day count (bounded
 * 1-30). The new end and the price (always 0) are computed in premiumExtension.cjs; a
 * body carrying `passEnd`, `pricePaidInr` or `tier` is ignored, not obeyed.
 */

const {
  extendPremium,
  ExtensionInputError,
  ExtensionRefusedError,
} = require('../services/premiumExtension.cjs');

const ADMIN_EXTEND_PREMIUM_PATH = '/api/admin/extend-premium';
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

function createAdminExtendPremiumRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, readJson, adminFirestore, requireAdmin, now = () => Date.now() } = deps;

  function send(res, status, body) {
    if (typeof sendJsonWithHeaders === 'function') return sendJsonWithHeaders(res, status, body, NO_STORE);
    return sendJson(res, status, body);
  }

  async function handle(req, res) {
    try {
      // ★ THE GATE RUNS FIRST — before the body is read or anything is touched.
      if (typeof requireAdmin !== 'function') {
        return send(res, 503, { ok: false, error: 'Admin endpoints disabled: admin gate not configured' });
      }
      const auth = await requireAdmin(req);
      if (!auth || !auth.ok || !auth.uid) {
        return send(res, (auth && auth.status) || 503, { ok: false, error: (auth && auth.error) || 'Admin auth unavailable' });
      }
      if (!adminFirestore) {
        return send(res, 503, { ok: false, error: 'firebase-admin Firestore is not initialised on this deploy' });
      }
      let body;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { ok: false, error: 'Invalid JSON' });
      }
      const b = body && typeof body === 'object' ? body : {};
      const result = await extendPremium(
        { uid: b.uid, days: b.days, reason: b.reason, requestId: b.requestId, adminUid: auth.uid, now: now() },
        { firestore: adminFirestore },
      );
      return send(res, 200, { ok: true, replayed: result.replayed, extension: result.extension });
    } catch (e) {
      if (e instanceof ExtensionInputError) return send(res, 400, { ok: false, error: e.message });
      if (e instanceof ExtensionRefusedError) return send(res, 409, { ok: false, error: e.message, code: e.code });
      console.error('[extend-premium] failed:', e && e.message);
      return send(res, 500, { ok: false, error: 'Premium extension failed' });
    }
  }

  return { handle };
}

/** The ONE-LINE mount used by server/index.cjs, built once on the first request. */
let mounted = null;
function handleAdminExtendPremium(req, res, deps) {
  if (!mounted) mounted = createAdminExtendPremiumRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = {
  createAdminExtendPremiumRoutes,
  handleAdminExtendPremium,
  ADMIN_EXTEND_PREMIUM_PATH,
};
