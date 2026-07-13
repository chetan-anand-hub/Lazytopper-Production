// C&I PR-3 · Gate 2b — admin invalidation/eviction for the model-solution cache.
// The "a bad answer slipped through, pull it now" lever: evict one question_hash
// from the shared step_solutions Postgres cache, or force-regenerate + overwrite
// it (saveSolutionForce). Complements the CACHE_VERSION bump, which handles
// prompt drift by busting ALL entries; these endpoints handle INDIVIDUAL bad
// entries.
//
// Admin identity is ADMIN_FIREBASE_UIDS (comma-separated Firebase uid allowlist)
// verified from a `Authorization: Bearer <idToken>` header via firebase-admin —
// deliberately the identity-based check named by product doctrine, NOT the weaker
// X-Admin-Key shared-secret pattern of the legacy warm-pool route. Fail-closed:
// no firebase-admin, no configured allowlist, no/invalid token, or a non-admin
// uid → the endpoints do nothing. Server-side only; nothing here is ever exposed
// to a client bundle, and no student data is involved (the cache is
// student-agnostic by construction).
const defaultSolutionCacheLib = require('./stepSolution.cjs');

const HASH_RE = /^[0-9a-f]{64}$/i;

function createAdminSolutionCacheRoutes(deps) {
  const {
    sendJson,
    readJson,
    firebaseAdmin,
    callGemini,
    GEMINI_MODEL,
    ACTIVE_PROVIDER,
    isObjectiveType,
    extractJsonObjectFromText,
    // Test seam: vitest's module graph can instantiate stepSolution.cjs twice
    // (ESM-imported by the test vs CJS-required here), which would split the
    // pool seam across instances — tests inject THEIR instance; production
    // omits it and gets the plain require above.
    solutionCacheLib,
  } = deps;
  const {
    deleteSolution,
    saveSolutionForce,
    generateModelSolution,
    validateSolutionQuality,
    computeQuestionHash,
  } = solutionCacheLib || defaultSolutionCacheLib;

  function adminUids() {
    return String(process.env.ADMIN_FIREBASE_UIDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Fail-closed admin gate: 503 when the machinery is unconfigured (so a
  // misconfigured deploy can never fall open), 401 on a missing/invalid token,
  // 403 on a valid token whose uid is not allowlisted.
  async function requireFirebaseAdmin(req) {
    if (!firebaseAdmin) {
      return { ok: false, status: 503, error: 'Admin auth unavailable: firebase-admin not initialised' };
    }
    const allow = adminUids();
    if (allow.length === 0) {
      return { ok: false, status: 503, error: 'Admin endpoints disabled: ADMIN_FIREBASE_UIDS not configured' };
    }
    const authHeader = String(req.headers['authorization'] || '');
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!idToken) {
      return { ok: false, status: 401, error: 'Unauthorized: Bearer ID token required' };
    }
    let decoded;
    try {
      decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
    } catch (e) {
      return { ok: false, status: 401, error: 'Unauthorized: invalid ID token' };
    }
    if (!decoded || !decoded.uid || !allow.includes(decoded.uid)) {
      return { ok: false, status: 403, error: 'Forbidden: not an admin uid' };
    }
    return { ok: true, uid: decoded.uid };
  }

  // POST /api/admin/solution-cache/evict  { hash }
  // Deletes the cached solution for one question_hash. The next student who hits
  // that question regenerates fresh (through the Gate-2a quality gate).
  async function handleEvict(req, res) {
    const auth = await requireFirebaseAdmin(req);
    if (!auth.ok) return sendJson(res, auth.status, { ok: false, error: auth.error });
    let payload;
    try {
      payload = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const hash = String(payload.hash || '').trim();
    if (!HASH_RE.test(hash)) {
      return sendJson(res, 400, { ok: false, error: 'Provide the 64-hex question_hash to evict' });
    }
    const deleted = await deleteSolution(hash);
    console.log('[admin-solution-cache] evict by', auth.uid, '-', hash, deleted ? 'deleted' : 'not-found');
    return sendJson(res, 200, { ok: true, hash, deleted });
  }

  // POST /api/admin/solution-cache/regenerate
  //   { question, marks, subject?, topic?, type?, section? }
  // Regenerates the model solution fresh from the question text and — ONLY if it
  // passes the same Gate-2a quality check — force-overwrites the cached entry
  // (saveSolutionForce). A failing regeneration NEVER touches the cache (422).
  async function handleRegenerate(req, res) {
    const auth = await requireFirebaseAdmin(req);
    if (!auth.ok) return sendJson(res, auth.status, { ok: false, error: auth.error });
    let payload;
    try {
      payload = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Invalid JSON' });
    }
    const question = String(payload.question || '').trim();
    const marks = Number(payload.marks) || 0;
    const subject = String(payload.subject || 'Maths').trim();
    const topic = String(payload.topic || '').trim();
    const qType = String(payload.type || '').trim();
    const section = String(payload.section || '').trim();
    if (!question || marks < 1) {
      return sendJson(res, 400, { ok: false, error: 'Provide the question text and its marks' });
    }
    const isObj = isObjectiveType ? isObjectiveType(qType, section) : false;

    let gen;
    try {
      gen = await generateModelSolution(
        { question, marks, subject, topic, qType, section, existingAnswer: '', existingExplanation: '', isObjective: isObj },
        { callGemini, GEMINI_MODEL, ACTIVE_PROVIDER, extractJsonObjectFromText }
      );
    } catch (e) {
      console.error('[admin-solution-cache] regenerate failed:', e.message);
      return sendJson(res, 502, { ok: false, error: 'Generation failed - cache not modified' });
    }
    if (!gen) {
      return sendJson(res, 502, { ok: false, error: 'Model returned no usable solution - cache not modified' });
    }
    const quality = validateSolutionQuality(gen.solution, marks, isObj);
    if (!quality.ok || !gen.cacheable) {
      return sendJson(res, 422, {
        ok: false,
        error: 'Generated solution failed the quality gate - cache NOT overwritten',
        reasons: quality.reasons,
      });
    }
    const hash = computeQuestionHash(question, marks);
    await saveSolutionForce(hash, gen.solution);
    console.log('[admin-solution-cache] regenerate by', auth.uid, '-', hash);
    return sendJson(res, 200, { ok: true, hash });
  }

  return { handleEvict, handleRegenerate };
}

module.exports = { createAdminSolutionCacheRoutes };
