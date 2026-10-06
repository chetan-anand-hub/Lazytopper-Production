'use strict';
// routes/gradingJobs.cjs — GET /api/grade-worksheet/jobs/:jobId (GRADING-JOBS-1 J1, controller D11).
//
// The status check for a background grading job (server/grading/jobs.cjs).
//
// ★ SELF-GATING, because a GET runs NONE of the POST pipeline in server/index.cjs (verification,
//   idempotency, limiter, entitlement and fair use are all inside `if (req.method === 'POST')`):
//   • the uid comes from the VERIFIED Bearer token and from nowhere else (verifiedCaller — the same
//     rule as the account export route). No token, or one that does not verify → 401.
//   • OWNER-SCOPED BY PATH: the job is read only at gradingResults/{THAT uid}/attempts/{jobId}. A job
//     of another account, an unknown id, a malformed id and an expired (24 h) job are all the same
//     404 — the route cannot tell anyone that someone else's job exists.
//   • ITS OWN CAP: POLL_CAP_PER_MINUTE polls per verified uid per minute → 429 with Retry-After.
//     A client polls every ~2.5 s (≈ 24/min); the cap leaves room for two tabs and stops a loop.
// ★ It never charges: reading a job spends nothing (the job charges once, when it ENDS). Reading a
//   job that died with its process ENDS it (interrupted) — that settle is jobs.cjs's, exactly once.
// ★ The body is written directly, not through sendJson: a finished job's `final` is spliced in as
//   the stored bytes of the synchronous body (already passed through sendJson's redaction once).
//   Error bodies DO go through sendJson.

const { JOB_POLL_PATH_RE } = require('../grading/jobs.cjs');

const POLL_CAP_PER_MINUTE = 60;
const WINDOW_MS = 60 * 1000;

function createGradingJobsRoutes(deps) {
  const { sendJson, verifiedCaller, gradingJobs } = deps;
  const corsOrigin = deps.corsOrigin || '*';
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const cap = Number.isFinite(deps.pollCapPerMinute) && deps.pollCapPerMinute > 0 ? deps.pollCapPerMinute : POLL_CAP_PER_MINUTE;
  const telemetry = deps.telemetry || null;
  /** uid → { windowStart, count } — a fixed one-minute window per verified uid. */
  const windows = new Map();

  function emit(event) {
    try {
      if (telemetry && typeof telemetry.increment === 'function') telemetry.increment(event, 1);
    } catch { /* never fails a request */ }
  }

  /** Returns 0 when this poll may proceed, else the ms until the window resets. */
  function overCap(uid) {
    const t = now();
    if (windows.size > 10000) {
      for (const [k, w] of windows) if (t - w.windowStart >= WINDOW_MS) windows.delete(k);
    }
    let w = windows.get(uid);
    if (!w || t - w.windowStart >= WINDOW_MS) {
      w = { windowStart: t, count: 0 };
      windows.set(uid, w);
    }
    w.count += 1;
    return w.count > cap ? Math.max(1, w.windowStart + WINDOW_MS - t) : 0;
  }

  async function handlePoll(req, res, jobIdRaw) {
    const uid = await verifiedCaller.resolveVerifiedUid(req);
    if (!uid) return sendJson(res, 401, { ok: false, error: 'unauthenticated' });

    const waitMs = overCap(uid);
    if (waitMs > 0) {
      emit('grading_jobs.poll_capped');
      res.writeHead(429, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
        'Retry-After': String(Math.ceil(waitMs / 1000)),
      });
      return res.end(JSON.stringify({ ok: false, error: 'poll_rate_limited', retryAfterMs: waitMs }));
    }

    let jobId = '';
    try { jobId = decodeURIComponent(String(jobIdRaw || '')); } catch { jobId = ''; }
    const found = await gradingJobs.read(uid, jobId);
    if (found.status === 503) return sendJson(res, 503, { ok: false, error: 'job_store_unavailable' });
    if (found.status !== 200) return sendJson(res, 404, { ok: false, error: 'job_not_found' });

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': corsOrigin,
      'Cache-Control': 'no-store',
    };
    // The model that graded, on the DONE poll (a 202 could not carry it).
    if (found.state === 'done' && found.model) {
      headers['X-Grading-Model'] = String(found.model);
      headers['Access-Control-Expose-Headers'] = 'X-Grading-Model';
    }
    res.writeHead(200, headers);
    return res.end(found.body);
  }

  return { handlePoll };
}

module.exports = { createGradingJobsRoutes, JOB_POLL_PATH_RE, POLL_CAP_PER_MINUTE };
