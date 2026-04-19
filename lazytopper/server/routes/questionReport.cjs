'use strict';

/**
 * questionReport.cjs — Student question error reporting.
 *
 * Routes (called from index.cjs):
 *   POST  /api/questions/report              → student submits a report (requires X-User-ID)
 *   GET   /api/admin/question-reports        → admin lists unresolved reports (x-internal-admin)
 *   PATCH /api/admin/question-reports/:id/resolve → admin resolves a report (x-internal-admin)
 *
 * DB: question_reports table created on first call (CREATE TABLE IF NOT EXISTS).
 * Rate-limit: max 5 reports per uid per hour (in-memory).
 */

let _pool = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (_pool) return _pool;
  try {
    const pg = require('pg');
    const Pool = pg.Pool || pg.default?.Pool;
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _pool.on('error', (err) => console.warn('[question-report] pool error:', err.message));
    return _pool;
  } catch (e) {
    console.warn('[question-report] pg unavailable:', e.message);
    return null;
  }
}

let _tableReady = false;

async function ensureTable() {
  if (_tableReady) return;
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS question_reports (
        id            SERIAL PRIMARY KEY,
        question_id   TEXT NOT NULL,
        report_type   TEXT NOT NULL,
        comment       TEXT,
        subject       TEXT,
        topic_key     TEXT,
        reporter_uid  TEXT,
        created_at    TIMESTAMP DEFAULT NOW(),
        resolved      BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    _tableReady = true;
    console.info('[question-report] table ready');
  } catch (e) {
    console.warn('[question-report] ensureTable failed:', e.message);
  }
}

// ---------------------------------------------------------------------------
// In-memory rate limiter: max 5 reports per uid per hour
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const _rateLimitMap = new Map();

function isRateLimited(uid) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const times = (_rateLimitMap.get(uid) || []).filter((t) => t > cutoff);
  if (times.length >= RATE_LIMIT_MAX) return true;
  times.push(now);
  _rateLimitMap.set(uid, times);
  return false;
}

// ---------------------------------------------------------------------------
// Allowed report types
// ---------------------------------------------------------------------------
const ALLOWED_TYPES = [
  'Wrong answer given',
  'Wrong solution steps',
  'Question text has a typo or is unclear',
  'Other',
];

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handlePostReport(req, res, { sendJson, readJson }) {
  const uid = (req.headers['x-user-id'] || '').trim();
  if (!uid) return sendJson(res, 400, { ok: false, error: 'X-User-ID header required' });

  let body = {};
  try { body = await readJson(req); } catch (_) {}

  const { questionId, reportType, comment = '', topicKey = '', subject = '' } = body;
  if (!questionId) return sendJson(res, 400, { ok: false, error: 'questionId is required' });
  if (!ALLOWED_TYPES.includes(reportType)) {
    return sendJson(res, 400, { ok: false, error: `reportType must be one of: ${ALLOWED_TYPES.join(', ')}` });
  }

  if (isRateLimited(uid)) {
    return sendJson(res, 429, { ok: false, error: 'Too many reports submitted. Please wait before reporting again.' });
  }

  await ensureTable();
  const pool = getPool();
  if (!pool) return sendJson(res, 503, { ok: false, error: 'Database unavailable' });

  try {
    await pool.query(
      `INSERT INTO question_reports (question_id, report_type, comment, subject, topic_key, reporter_uid)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        String(questionId),
        reportType,
        String(comment || '').slice(0, 200),
        String(subject || ''),
        String(topicKey || ''),
        uid,
      ]
    );
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.error('[question-report] insert error:', e.message);
    return sendJson(res, 500, { ok: false, error: 'Failed to save report' });
  }
}

async function handleGetReports(req, res, { sendJson }) {
  if (req.headers['x-internal-admin'] !== '1') {
    return sendJson(res, 401, { ok: false, error: 'Admin access required' });
  }

  await ensureTable();
  const pool = getPool();
  if (!pool) return sendJson(res, 503, { ok: false, error: 'Database unavailable' });

  try {
    const { rows } = await pool.query(
      `SELECT id, question_id, report_type, comment, subject, topic_key, reporter_uid, created_at, resolved
       FROM question_reports
       WHERE resolved = FALSE
       ORDER BY topic_key, created_at DESC`
    );
    return sendJson(res, 200, { ok: true, reports: rows });
  } catch (e) {
    console.error('[question-report] select error:', e.message);
    return sendJson(res, 500, { ok: false, error: 'Failed to fetch reports' });
  }
}

async function handleResolveReport(req, res, { sendJson }, reportId) {
  if (req.headers['x-internal-admin'] !== '1') {
    return sendJson(res, 401, { ok: false, error: 'Admin access required' });
  }

  const id = parseInt(reportId, 10);
  if (!id || isNaN(id)) return sendJson(res, 400, { ok: false, error: 'Invalid report id' });

  await ensureTable();
  const pool = getPool();
  if (!pool) return sendJson(res, 503, { ok: false, error: 'Database unavailable' });

  try {
    const { rowCount } = await pool.query(
      `UPDATE question_reports SET resolved = TRUE WHERE id = $1`,
      [id]
    );
    if (rowCount === 0) return sendJson(res, 404, { ok: false, error: 'Report not found' });
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.error('[question-report] update error:', e.message);
    return sendJson(res, 500, { ok: false, error: 'Failed to resolve report' });
  }
}

function createQuestionReportRoutes(deps) {
  return {
    handlePostReport: (req, res) => handlePostReport(req, res, deps),
    handleGetReports: (req, res) => handleGetReports(req, res, deps),
    handleResolveReport: (req, res, reportId) => handleResolveReport(req, res, deps, reportId),
  };
}

module.exports = { createQuestionReportRoutes };
