/**
 * COST-TRUTH-1 — GET /api/admin/ai-cost-daily?days=30
 *
 * The true daily AI cost from the global ledger (aiCostDaily/{IST day}, written by
 * services/aiCostDaily.cjs for EVERY Gemini call). Per-day totals and a per-workload split.
 *
 * ★ ADMIN-ONLY through the one shared gate (`requireAdmin` = adminTelemetry's requireFirebaseAdmin,
 *   ADMIN_FIREBASE_UIDS); it runs FIRST and a missing gate is a 503.
 * ★ READ-ONLY, NUMBERS ONLY. Reads at most MAX_DAYS day documents by id; writes nothing.
 * ★ Days with no document are reported with `recorded:false` — never as a measured zero.
 */

const { AI_COST_DAILY_COLLECTION } = require('../services/aiCostDaily.cjs');
const { istDayKey } = require('../services/rateLimiter.cjs');
const { usdInrRate } = require('../services/modelPrices.cjs');

const ADMIN_AI_COST_DAILY_PATH = '/api/admin/ai-cost-daily';
const DEFAULT_DAYS = 30;
const MAX_DAYS = 92;
const DAY_MS = 86400000;
const NO_STORE = Object.freeze({ 'Cache-Control': 'no-store' });

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function inr(micro) {
  return Math.round((num(micro) / 1e6) * 100) / 100;
}
function parseDays(url) {
  let raw = null;
  try {
    raw = new URL(url || '', 'http://x').searchParams.get('days');
  } catch {
    raw = null;
  }
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(n, MAX_DAYS);
}

/** The last `days` IST day keys, newest first. */
function dayKeys(nowMs, days) {
  const keys = [];
  for (let i = 0; i < days; i += 1) keys.push(istDayKey(nowMs - i * DAY_MS));
  return keys;
}

/** Pure: one stored day document (or undefined) -> the response row. */
function summariseDay(day, data) {
  if (!data || typeof data !== 'object') return { day, recorded: false };
  const byWorkload = {};
  const bw = data.byWorkload && typeof data.byWorkload === 'object' ? data.byWorkload : {};
  for (const work of Object.keys(bw)) {
    const classes = bw[work] && typeof bw[work] === 'object' ? bw[work] : {};
    const row = { calls: 0, costInr: 0, unknownUsageCalls: 0, byCallClass: {} };
    let micro = 0;
    for (const klass of Object.keys(classes)) {
      const c = classes[klass] || {};
      row.calls += num(c.calls);
      row.unknownUsageCalls += num(c.unknownUsageCalls);
      micro += num(c.costMicroInr);
      row.byCallClass[klass] = { calls: num(c.calls), costInr: inr(c.costMicroInr) };
    }
    row.costInr = inr(micro);
    byWorkload[work] = row;
  }
  return {
    day,
    recorded: true,
    calls: num(data.calls),
    costInr: inr(data.costMicroInr),
    promptTokens: num(data.promptTokens),
    cachedTokens: num(data.cachedTokens),
    outputTokens: num(data.outputTokens),
    thoughtsTokens: num(data.thoughtsTokens),
    unknownUsageCalls: num(data.unknownUsageCalls),
    estimatedCalls: num(data.estimatedCalls),
    unpricedCalls: num(data.unpricedCalls),
    byWorkload,
  };
}

function createAdminAiCostDailyRoutes(deps = {}) {
  const { sendJson, sendJsonWithHeaders, adminFirestore, requireAdmin } = deps;
  const now = deps.now || Date.now;
  const env = deps.env || process.env;

  function send(res, status, body) {
    if (typeof sendJsonWithHeaders === 'function') return sendJsonWithHeaders(res, status, body, NO_STORE);
    return sendJson(res, status, body);
  }

  async function handle(req, res) {
    try {
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
      const nowMs = now();
      const keys = dayKeys(nowMs, parseDays(req && req.url));
      const snaps = await Promise.all(
        keys.map((k) => adminFirestore.collection(AI_COST_DAILY_COLLECTION).doc(k).get()),
      );
      const days = keys.map((k, i) => {
        const s = snaps[i];
        return summariseDay(k, s && s.exists ? s.data() : undefined);
      });
      const raw = env.LT_USD_INR;
      return send(res, 200, {
        ok: true,
        generatedAtMs: nowMs,
        timeZone: 'Asia/Kolkata',
        todayKey: keys[0],
        usdInr: usdInrRate(env),
        usdInrIsDefault: !(raw !== undefined && raw !== '' && Number(raw) > 0),
        days,
      });
    } catch (e) {
      console.error('[ai-cost-daily] failed:', e && e.message);
      return send(res, 500, { ok: false, error: 'AI cost daily failed' });
    }
  }

  return { handle };
}

let mounted = null;
function handleAdminAiCostDaily(req, res, deps) {
  if (!mounted) mounted = createAdminAiCostDailyRoutes(deps);
  return mounted.handle(req, res);
}

module.exports = {
  createAdminAiCostDailyRoutes,
  handleAdminAiCostDaily,
  summariseDay,
  dayKeys,
  ADMIN_AI_COST_DAILY_PATH,
  MAX_DAYS,
};
