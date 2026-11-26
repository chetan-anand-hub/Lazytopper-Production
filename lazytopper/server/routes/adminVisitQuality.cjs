/**
 * adminVisitQuality.cjs - GET /api/admin/visit-quality?days=7 (QUICK-LEAVE-1)
 *
 * Reads the last N IST days of visitDaily/{yyyy-mm-dd} (written by routes/visitMetrics.cjs) and returns source x landing-page
 * rows: visits, quickLeaves, quickLeavePct, plus an in-app (Facebook / Instagram browser) split and totals. Counts only.
 * ADMIN-ONLY through the shared requireAdmin gate (ADMIN_FIREBASE_UIDS), which runs FIRST. Read-only.
 * Quick-leave = visits that left without engaging; visits = engaged + left.
 */
const { VISIT_DAILY_COLLECTION, istDayKey } = require('./visitMetrics.cjs');

const ADMIN_VISIT_QUALITY_PATH = '/api/admin/visit-quality';
const MAX_DAYS = 31;
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

const pct = (q, v) => (v > 0 ? Math.round((q / v) * 1000) / 10 : null);

/** PURE. docs = array of the `counts` maps. -> { rows, totals, bySource }. */
function aggregateVisitDaily(docs) {
  const map = new Map();
  for (const counts of docs) {
    if (!counts || typeof counts !== 'object') continue;
    for (const [key, raw] of Object.entries(counts)) {
      const n = Number(raw);
      if (!Number.isFinite(n)) continue;
      const parts = key.split('|');
      if (parts.length !== 4) continue;
      const [source, path, eng, app] = parts;
      const rk = `${source}|${path}`;
      let r = map.get(rk);
      if (!r) {
        r = { source, path, engaged: 0, left: 0, inAppEngaged: 0, inAppLeft: 0 };
        map.set(rk, r);
      }
      if (eng === '1') {
        r.engaged += n;
        if (app === '1') r.inAppEngaged += n;
      } else {
        r.left += n;
        if (app === '1') r.inAppLeft += n;
      }
    }
  }
  const finish = (r) => {
    const left = Math.max(0, r.left);
    const engaged = Math.max(0, r.engaged);
    const visits = left + engaged;
    const inAppLeft = Math.max(0, r.inAppLeft);
    const inAppVisits = inAppLeft + Math.max(0, r.inAppEngaged);
    return { ...r, engaged, left, visits, quickLeaves: left, quickLeavePct: pct(left, visits), inAppVisits, inAppQuickLeaves: inAppLeft, inAppQuickLeavePct: pct(inAppLeft, inAppVisits) };
  };
  const rows = [...map.values()].map(finish).filter((r) => r.visits > 0);
  rows.sort((a, b) => b.visits - a.visits || (a.source + a.path < b.source + b.path ? -1 : 1));
  const sum = (list) => list.reduce((t, r) => ({ visits: t.visits + r.visits, quickLeaves: t.quickLeaves + r.quickLeaves }), { visits: 0, quickLeaves: 0 });
  const t = sum(rows);
  const bySrc = new Map();
  for (const r of rows) {
    const s = bySrc.get(r.source) || { source: r.source, visits: 0, quickLeaves: 0 };
    s.visits += r.visits;
    s.quickLeaves += r.quickLeaves;
    bySrc.set(r.source, s);
  }
  const bySource = [...bySrc.values()].map((s) => ({ ...s, quickLeavePct: pct(s.quickLeaves, s.visits) })).sort((a, b) => b.visits - a.visits);
  return { rows: rows.map(({ engaged, left, inAppEngaged, inAppLeft, ...keep }) => keep), totals: { ...t, quickLeavePct: pct(t.quickLeaves, t.visits) }, bySource };
}

function parseDays(url) {
  let d = 7;
  try {
    const raw = new URL(String(url || ''), 'http://x').searchParams.get('days');
    if (raw !== null) d = Math.floor(Number(raw));
  } catch {
    d = 7;
  }
  if (!Number.isFinite(d) || d < 1) d = 7;
  return Math.min(d, MAX_DAYS);
}

function dayKeys(nowMs, days) {
  const out = [];
  for (let i = 0; i < days; i += 1) out.push(istDayKey(nowMs - i * 86400000));
  return out;
}

function createAdminVisitQualityRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, adminFirestore, requireAdmin } = deps;
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const send = (res, status, body) => (typeof sendJsonWithHeaders === 'function' ? sendJsonWithHeaders(res, status, body, NO_STORE) : sendJson(res, status, body));

  async function handle(req, res) {
    try {
      if (typeof requireAdmin !== 'function') return send(res, 503, { ok: false, error: 'Admin endpoints disabled: admin gate not configured' });
      const auth = await requireAdmin(req);
      if (!auth || !auth.ok || !auth.uid) return send(res, (auth && auth.status) || 503, { ok: false, error: (auth && auth.error) || 'Admin auth unavailable' });
      if (!adminFirestore) return send(res, 503, { ok: false, error: 'firebase-admin Firestore is not initialised on this deploy' });
      const days = parseDays(req.url);
      const keys = dayKeys(now(), days);
      const snaps = await Promise.all(keys.map((k) => adminFirestore.collection(VISIT_DAILY_COLLECTION).doc(k).get()));
      const docs = snaps.filter((s) => s && s.exists).map((s) => (s.data() || {}).counts);
      return send(res, 200, { ok: true, days, from: keys[keys.length - 1], to: keys[0], ...aggregateVisitDaily(docs) });
    } catch {
      return send(res, 500, { ok: false, error: 'Visit quality failed' });
    }
  }
  return { handle };
}

let mounted = null;
function handleAdminVisitQuality(req, res, deps) {
  if (!mounted) mounted = createAdminVisitQualityRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = { createAdminVisitQualityRoutes, handleAdminVisitQuality, aggregateVisitDaily, parseDays, ADMIN_VISIT_QUALITY_PATH };
