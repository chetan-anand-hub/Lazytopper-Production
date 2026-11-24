/**
 * MISTAKE-SPLIT-1 — GET /api/admin/mistake-split
 *
 * The share of each mistake type (calculation, conceptual, silly, presentation) across
 * every student's saved mistake logs, for outreach and press copy ("which kind of mistake
 * costs Class 10 students the most?").
 *
 * ★★ ADMIN-ONLY, THROUGH THE ONE SHARED GATE. `requireAdmin` is handed in by index.cjs as
 * adminTelemetry's `requireFirebaseAdmin` (ADMIN_FIREBASE_UIDS). It runs FIRST; a missing
 * gate is a 503, so this route cannot fall open by being mounted wrong.
 *
 * ★★ READ-ONLY, COUNTS ONLY. One collection-group read of `mistakeLogs` with a field
 * `select` (mistakeCounts, subject, timestamp). No question text, answer, uid or any other
 * per-student value is returned: only totals.
 *
 * ★ BOUNDED. At most MAX_LOGS documents are read; `truncated: true` says so when hit.
 */

const ADMIN_MISTAKE_SPLIT_PATH = '/api/admin/mistake-split';
const MISTAKE_LOGS_SEGMENT = 'mistakeLogs';
const MISTAKE_TYPES = Object.freeze(['calculation', 'conceptual', 'silly', 'presentation']);
const MAX_LOGS = 50000;
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

/** Pure: totals from an array of plain log objects (and their owner ids). */
function summariseMistakeLogs(logs) {
  const counts = { calculation: 0, conceptual: 0, silly: 0, presentation: 0 };
  const logsWith = { calculation: 0, conceptual: 0, silly: 0, presentation: 0 };
  const bySubject = {};
  const students = new Set();
  let logsWithAnyMistake = 0;
  let first = null;
  let last = null;
  for (const entry of logs) {
    const log = entry && entry.data;
    const mc = log && log.mistakeCounts;
    if (!mc || typeof mc !== 'object') continue;
    let any = false;
    const subject = typeof log.subject === 'string' && log.subject ? log.subject.toLowerCase() : 'unknown';
    if (!bySubject[subject]) bySubject[subject] = { calculation: 0, conceptual: 0, silly: 0, presentation: 0 };
    for (const t of MISTAKE_TYPES) {
      const n = Number(mc[t]);
      if (!Number.isFinite(n) || n <= 0) continue;
      counts[t] += n;
      logsWith[t] += 1;
      bySubject[subject][t] += n;
      any = true;
    }
    if (!any) continue;
    logsWithAnyMistake += 1;
    if (entry.owner) students.add(entry.owner);
    const ts = typeof log.timestamp === 'string' ? log.timestamp : null;
    if (ts) {
      if (!first || ts < first) first = ts;
      if (!last || ts > last) last = ts;
    }
  }
  const total = MISTAKE_TYPES.reduce((s, t) => s + counts[t], 0);
  const share = {};
  for (const t of MISTAKE_TYPES) share[t] = total > 0 ? Math.round((counts[t] / total) * 1000) / 10 : null;
  return { totalMistakes: total, counts, share, logsWith, logsWithAnyMistake, students: students.size, bySubject, firstLog: first, lastLog: last };
}

function createAdminMistakeSplitRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, adminFirestore, requireAdmin } = deps;

  function send(res, status, body) {
    if (typeof sendJsonWithHeaders === 'function') return sendJsonWithHeaders(res, status, body, NO_STORE);
    return sendJson(res, status, body);
  }

  async function handle(req, res) {
    try {
      // ★ THE GATE RUNS FIRST — before anything is read.
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
      const snap = await adminFirestore
        .collectionGroup(MISTAKE_LOGS_SEGMENT)
        .select('mistakeCounts', 'subject', 'timestamp')
        .limit(MAX_LOGS)
        .get();
      const logs = snap.docs.map((d) => ({
        data: d.data(),
        owner: d.ref && d.ref.parent && d.ref.parent.parent ? d.ref.parent.parent.id : null,
      }));
      const summary = summariseMistakeLogs(logs);
      return send(res, 200, { ok: true, logsRead: logs.length, truncated: logs.length >= MAX_LOGS, ...summary });
    } catch (e) {
      console.error('[mistake-split] failed:', e && e.message);
      return send(res, 500, { ok: false, error: 'Mistake split failed' });
    }
  }

  return { handle };
}

/** The ONE-LINE mount used by server/index.cjs, built once on the first request. */
let mounted = null;
function handleAdminMistakeSplit(req, res, deps) {
  if (!mounted) mounted = createAdminMistakeSplitRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = {
  createAdminMistakeSplitRoutes,
  handleAdminMistakeSplit,
  summariseMistakeLogs,
  ADMIN_MISTAKE_SPLIT_PATH,
  MAX_LOGS,
};
