'use strict';

/**
 * userProgress.cjs — PostgreSQL-backed student progress persistence.
 *
 * Routes:
 *   GET  /api/user/progress                → fetch full progress row for user
 *   POST /api/user/progress/sync           → bulk upsert all fields
 *   POST /api/user/progress/xp             → update XP only
 *   POST /api/user/progress/streak         → update streak only
 *   POST /api/user/progress/focus          → replace focus_daily records
 *   POST /api/user/progress/mastery        → merge one topic into topic_mastery
 *   POST /api/user/progress/mission        → merge one key into mission_progress
 *
 * User identity comes from the X-User-ID header (Firebase uid).
 * Gracefully returns 503 when DATABASE_URL is not configured.
 */

let _pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    try {
      const pg = require('pg');
      const Pool = pg.Pool || pg.default?.Pool;
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _pool.on('error', (err) => console.warn('[user-progress] pool error:', err.message));
    } catch (e) {
      console.warn('[user-progress] pg unavailable:', e.message);
      return null;
    }
  }
  return _pool;
}

let _tableReady = false;

async function ensureTable() {
  if (_tableReady) return;
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_progress (
        uid             TEXT PRIMARY KEY,
        xp              INTEGER NOT NULL DEFAULT 0,
        streak          INTEGER NOT NULL DEFAULT 0,
        focus_daily     JSONB   NOT NULL DEFAULT '[]'::jsonb,
        topic_mastery   JSONB   NOT NULL DEFAULT '{}'::jsonb,
        snapshot        JSONB   NOT NULL DEFAULT '{}'::jsonb,
        mission_progress JSONB  NOT NULL DEFAULT '{}'::jsonb,
        updated_at      TIMESTAMP DEFAULT NOW()
      )
    `);
    _tableReady = true;
    console.info('[user-progress] table ready');
  } catch (e) {
    console.warn('[user-progress] ensureTable failed:', e.message);
  }
}

// Resolve the caller's Firebase uid. Prefer a verified `Authorization: Bearer <idToken>`
// (survives the Vercel->Railway proxy rewrite, which drops the custom X-User-ID header)
// and fall back to the X-User-ID header for local/dev and defensive coverage.
async function resolveUid(req, firebaseAdmin) {
  const authHeader = String(req.headers['authorization'] || '');
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (idToken && firebaseAdmin) {
    try {
      const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
      if (decoded && decoded.uid) return decoded.uid;
    } catch (_verifyErr) {}
  }
  return (req.headers['x-user-id'] || '').trim();
}

function noDb(res, sendJson) {
  return sendJson(res, 503, { ok: false, error: 'Database unavailable' });
}

function badUid(res, sendJson) {
  return sendJson(res, 400, { ok: false, error: 'X-User-ID header required' });
}

async function handleGet(req, res, { sendJson, firebaseAdmin }) {
  const uid = await resolveUid(req, firebaseAdmin);
  if (!uid) return badUid(res, sendJson);
  await ensureTable();
  const pool = getPool();
  if (!pool) return noDb(res, sendJson);
  try {
    const result = await pool.query('SELECT * FROM user_progress WHERE uid = $1', [uid]);
    const row = result.rows[0] ?? null;
    return sendJson(res, 200, { ok: true, data: row });
  } catch (e) {
    console.warn('[user-progress] GET failed:', e.message);
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}

async function handleSync(req, res, { sendJson, readJson, firebaseAdmin }) {
  const uid = await resolveUid(req, firebaseAdmin);
  if (!uid) return badUid(res, sendJson);
  await ensureTable();
  const pool = getPool();
  if (!pool) return noDb(res, sendJson);
  try {
    const body = await readJson(req);
    const { xp, streak, focus_daily, topic_mastery, mission_progress, snapshot } = body;
    await pool.query(`
      INSERT INTO user_progress
        (uid, xp, streak, focus_daily, topic_mastery, mission_progress, snapshot, updated_at)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, NOW())
      ON CONFLICT (uid) DO UPDATE SET
        xp               = EXCLUDED.xp,
        streak           = EXCLUDED.streak,
        focus_daily      = EXCLUDED.focus_daily,
        topic_mastery    = EXCLUDED.topic_mastery,
        mission_progress = EXCLUDED.mission_progress,
        snapshot         = EXCLUDED.snapshot,
        updated_at       = NOW()
    `, [
      uid,
      Number(xp) || 0,
      Number(streak) || 0,
      JSON.stringify(focus_daily   ?? []),
      JSON.stringify(topic_mastery ?? {}),
      JSON.stringify(mission_progress ?? {}),
      JSON.stringify(snapshot      ?? {}),
    ]);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.warn('[user-progress] sync failed:', e.message);
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}

async function handleXP(req, res, { sendJson, readJson, firebaseAdmin }) {
  const uid = await resolveUid(req, firebaseAdmin);
  if (!uid) return badUid(res, sendJson);
  await ensureTable();
  const pool = getPool();
  if (!pool) return noDb(res, sendJson);
  try {
    const { xp } = await readJson(req);
    await pool.query(`
      INSERT INTO user_progress (uid, xp, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (uid) DO UPDATE SET xp = EXCLUDED.xp, updated_at = NOW()
    `, [uid, Number(xp) || 0]);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.warn('[user-progress] xp update failed:', e.message);
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}

async function handleStreak(req, res, { sendJson, readJson, firebaseAdmin }) {
  const uid = await resolveUid(req, firebaseAdmin);
  if (!uid) return badUid(res, sendJson);
  await ensureTable();
  const pool = getPool();
  if (!pool) return noDb(res, sendJson);
  try {
    const { streak } = await readJson(req);
    await pool.query(`
      INSERT INTO user_progress (uid, streak, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (uid) DO UPDATE SET streak = EXCLUDED.streak, updated_at = NOW()
    `, [uid, Number(streak) || 0]);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.warn('[user-progress] streak update failed:', e.message);
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}

async function handleFocus(req, res, { sendJson, readJson, firebaseAdmin }) {
  const uid = await resolveUid(req, firebaseAdmin);
  if (!uid) return badUid(res, sendJson);
  await ensureTable();
  const pool = getPool();
  if (!pool) return noDb(res, sendJson);
  try {
    const { records } = await readJson(req);
    if (!Array.isArray(records)) {
      return sendJson(res, 400, { ok: false, error: 'records must be an array' });
    }
    await pool.query(`
      INSERT INTO user_progress (uid, focus_daily, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (uid) DO UPDATE SET
        focus_daily = EXCLUDED.focus_daily,
        updated_at  = NOW()
    `, [uid, JSON.stringify(records)]);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.warn('[user-progress] focus update failed:', e.message);
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}

async function handleMastery(req, res, { sendJson, readJson, firebaseAdmin }) {
  const uid = await resolveUid(req, firebaseAdmin);
  if (!uid) return badUid(res, sendJson);
  await ensureTable();
  const pool = getPool();
  if (!pool) return noDb(res, sendJson);
  try {
    const { topicKey, masteryData } = await readJson(req);
    if (!topicKey) return sendJson(res, 400, { ok: false, error: 'topicKey required' });
    const patch = JSON.stringify({ [topicKey]: masteryData });
    await pool.query(`
      INSERT INTO user_progress (uid, topic_mastery, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (uid) DO UPDATE SET
        topic_mastery = user_progress.topic_mastery || $2::jsonb,
        updated_at    = NOW()
    `, [uid, patch]);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.warn('[user-progress] mastery update failed:', e.message);
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}

async function handleMission(req, res, { sendJson, readJson, firebaseAdmin }) {
  const uid = await resolveUid(req, firebaseAdmin);
  if (!uid) return badUid(res, sendJson);
  await ensureTable();
  const pool = getPool();
  if (!pool) return noDb(res, sendJson);
  try {
    const { missionKey, progress } = await readJson(req);
    if (!missionKey) return sendJson(res, 400, { ok: false, error: 'missionKey required' });
    const patch = JSON.stringify({ [missionKey]: progress });
    await pool.query(`
      INSERT INTO user_progress (uid, mission_progress, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (uid) DO UPDATE SET
        mission_progress = user_progress.mission_progress || $2::jsonb,
        updated_at       = NOW()
    `, [uid, patch]);
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.warn('[user-progress] mission update failed:', e.message);
    return sendJson(res, 500, { ok: false, error: e.message });
  }
}

function createUserProgressRoutes(deps) {
  const { sendJson, readJson, firebaseAdmin } = deps;
  const wrap = (fn) => (req, res) => fn(req, res, { sendJson, readJson, firebaseAdmin });
  return {
    handleGet:     wrap(handleGet),
    handleSync:    wrap(handleSync),
    handleXP:      wrap(handleXP),
    handleStreak:  wrap(handleStreak),
    handleFocus:   wrap(handleFocus),
    handleMastery: wrap(handleMastery),
    handleMission: wrap(handleMission),
  };
}

module.exports = { createUserProgressRoutes };
