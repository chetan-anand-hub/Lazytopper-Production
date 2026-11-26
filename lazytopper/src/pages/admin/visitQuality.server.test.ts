// QUICK-LEAVE-1, server half (POST /api/metrics/visit + GET /api/admin/visit-quality): drives the real CommonJS route modules.
// A vitest file (like adminStudents.server.test.ts) so no package.json script is needed.
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
import { test } from "vitest";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
const req_ = createRequire(import.meta.url);
const { createVisitMetricsRoutes, validateBeacon, incrementsFor, istDayKey, RATE_MAX } = req_("../../../server/routes/visitMetrics.cjs");
const { createAdminVisitQualityRoutes, aggregateVisitDaily, parseDays } = req_("../../../server/routes/adminVisitQuality.cjs");


const UA_ = 0;
const NOW = Date.parse('2030-06-15T20:00:00.000Z'); // 01:30 IST on the 16th
const UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const GOOD = { path: '/check-improve', source: 'google_ads', engaged: false, inApp: false, device: 'mobile' };

function makeReq(body?: any, headers: any = {}) {
  const req: any = new EventEmitter();
  req.headers = { 'user-agent': UA, 'x-forwarded-for': '1.2.3.4', ...headers };
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    req.emit('end');
  });
  return req;
}
const makeRes = (): any => {
  const res: any = { statusCode: 0, body: null };
  res.end = () => {};
  return res;
};
const sendJson = (res: any, status: any, body: any) => {
  res.statusCode = status;
  res.body = body;
};
function world(): any {
  const sets: any[] = [];
  const adminFirestore = {
    collection: (c: any) => ({ doc: (id: any) => ({ set: async (data: any, opts: any) => sets.push({ c, id, data, opts }) }) }),
  };
  const firebaseAdmin = { firestore: { FieldValue: { increment: (n: any) => ({ inc: n }) } } };
  return { sets, adminFirestore, firebaseAdmin };
}
const mk = (w: any, env: any = {}) => createVisitMetricsRoutes({ sendJson, adminFirestore: w.adminFirestore, firebaseAdmin: w.firebaseAdmin, env, now: () => NOW });

test('a valid beacon -> 204 and ONE counter increment under the IST day', async () => {
  const w = world();
  const res = makeRes();
  await mk(w).handle(makeReq(GOOD), res);
  assert.equal(res.statusCode, 204);
  assert.equal(w.sets.length, 1);
  assert.equal(w.sets[0].c, 'visitDaily');
  assert.equal(w.sets[0].id, '2030-06-16');
  assert.deepEqual(w.sets[0].data, { counts: { 'google_ads|/check-improve|0|0': { inc: 1 } } });
  assert.deepEqual(w.sets[0].opts, { merge: true });
});

test('istDayKey rolls at IST midnight', () => {
  assert.equal(istDayKey(Date.parse('2030-06-15T18:29:59Z')), '2030-06-15');
  assert.equal(istDayKey(Date.parse('2030-06-15T18:30:00Z')), '2030-06-16');
});

test('increment shape: engaged, in-app, and the late correction (+1 engaged, -1 left)', () => {
  assert.deepEqual(incrementsFor({ source: 'meta', path: '/', engaged: true, inApp: true, late: false }), [['meta|/|1|1', 1]]);
  assert.deepEqual(incrementsFor({ source: 'meta', path: '/', engaged: true, inApp: false, late: true }), [['meta|/|1|0', 1], ['meta|/|0|0', -1]]);
});

test('validation: whitelist, no extra keys, no query string, no PII-shaped extras', () => {
  assert.equal(validateBeacon(GOOD).ok, true);
  for (const bad of [
    { ...GOOD, uid: 'abc' },
    { ...GOOD, email: 'a@b.c' },
    { ...GOOD, path: '/x?utm_source=a' },
    { ...GOOD, path: 'x' },
    { ...GOOD, path: '/' + 'a'.repeat(201) },
    { ...GOOD, source: 'bing' },
    { ...GOOD, device: 'tv' },
    { ...GOOD, engaged: 'yes' },
    { ...GOOD, inApp: 1 },
    { ...GOOD, late: true },
    null,
    [],
  ]) assert.equal(validateBeacon(bad).ok, false, JSON.stringify(bad));
  assert.equal(validateBeacon({ ...GOOD, path: '/notes/jemh108/extra/deep' }).data.path, '/notes/jemh108');
});

test('a bad body -> 400 and no write; oversize -> 413; bad JSON -> 400', async () => {
  const w = world();
  let res = makeRes();
  await mk(w).handle(makeReq({ ...GOOD, source: 'x' }), res);
  assert.equal(res.statusCode, 400);
  res = makeRes();
  await mk(w).handle(makeReq('{nope'), res);
  assert.equal(res.statusCode, 400);
  res = makeRes();
  await mk(w).handle(makeReq({ ...GOOD, path: '/' + 'a'.repeat(600) }), res);
  assert.equal(res.statusCode, 413);
  assert.equal(w.sets.length, 0);
});

test('bots and empty user agents -> 204, nothing written', async () => {
  const w = world();
  for (const ua of ['', 'Googlebot/2.1', 'Mozilla/5.0 HeadlessChrome/120', 'curl/8', 'Lighthouse']) {
    const res = makeRes();
    await mk(w).handle(makeReq(GOOD, { 'user-agent': ua }), res);
    assert.equal(res.statusCode, 204, ua);
  }
  assert.equal(w.sets.length, 0);
});

test('KILL SWITCH VISIT_METRICS_DISABLED=1 -> 204, writes nothing', async () => {
  const w = world();
  const res = makeRes();
  await mk(w, { VISIT_METRICS_DISABLED: '1' }).handle(makeReq(GOOD), res);
  assert.equal(res.statusCode, 204);
  assert.equal(w.sets.length, 0);
});

test('per-IP cap -> 429 after RATE_MAX, other IPs unaffected', async () => {
  const w = world();
  const r = mk(w);
  for (let i = 0; i < RATE_MAX; i += 1) await r.handle(makeReq(GOOD), makeRes());
  const over = makeRes();
  await r.handle(makeReq(GOOD), over);
  assert.equal(over.statusCode, 429);
  const other = makeRes();
  await r.handle(makeReq(GOOD, { 'x-forwarded-for': '9.9.9.9' }), other);
  assert.equal(other.statusCode, 204);
});

test('aggregation math: visits = engaged + left, quick-leave %, in-app split, sort by visits', () => {
  const day1 = { 'google_ads|/a|0|0': 3, 'google_ads|/a|1|0': 7, 'google_ads|/a|0|1': 2, 'meta|/b|0|0': 1, 'meta|/b|1|0': 1 };
  const day2 = { 'google_ads|/a|1|0': 3, 'direct|/|1|0': 1 };
  const { rows, totals, bySource } = aggregateVisitDaily([day1, day2, null]);
  const a = rows.find((r: any) => r.source === 'google_ads' && r.path === '/a');
  assert.equal(a.visits, 15);
  assert.equal(a.quickLeaves, 5);
  assert.equal(a.quickLeavePct, 33.3);
  assert.equal(a.inAppVisits, 2);
  assert.equal(a.inAppQuickLeavePct, 100);
  assert.equal(rows[0].path, '/a');
  assert.equal(totals.visits, 18);
  assert.equal(totals.quickLeaves, 6);
  assert.equal(bySource[0].source, 'google_ads');
  assert.equal(rows.find((r: any) => r.path === '/b').quickLeavePct, 50);
});

test('aggregation: a late-correction net below zero is clamped, junk keys ignored', () => {
  const { rows } = aggregateVisitDaily([{ 'meta|/|0|0': -1, 'meta|/|1|0': 1, 'bad key': 5 }]);
  assert.equal(rows[0].quickLeaves, 0);
  assert.equal(rows[0].visits, 1);
  assert.equal(rows.length, 1);
});

test('parseDays clamps 1..31, default 7', () => {
  assert.equal(parseDays('/api/admin/visit-quality'), 7);
  assert.equal(parseDays('/x?days=3'), 3);
  assert.equal(parseDays('/x?days=999'), 31);
  assert.equal(parseDays('/x?days=-2'), 7);
  assert.equal(parseDays('/x?days=abc'), 7);
});

test('admin route: gate first (401 passes through, no read), then reads N days', async () => {
  const reads: any[] = [];
  const adminFirestore = { collection: () => ({ doc: (id: any) => ({ get: async () => (reads.push(id), { exists: id === '2030-06-16', data: () => ({ counts: { 'direct|/|0|0': 1, 'direct|/|1|0': 3 } }) }) }) }) };
  const deny = createAdminVisitQualityRoutes({ sendJson, adminFirestore, requireAdmin: async () => ({ ok: false, status: 401, error: 'no' }), now: () => NOW });
  let res = makeRes();
  await deny.handle({ url: '/api/admin/visit-quality?days=3', headers: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(reads.length, 0);
  const ok = createAdminVisitQualityRoutes({ sendJson, adminFirestore, requireAdmin: async () => ({ ok: true, uid: 'a' }), now: () => NOW });
  res = makeRes();
  await ok.handle({ url: '/api/admin/visit-quality?days=3', headers: {} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.days, 3);
  assert.deepEqual(reads, ['2030-06-16', '2030-06-15', '2030-06-14']);
  assert.equal(res.body.totals.quickLeavePct, 25);
  const none = createAdminVisitQualityRoutes({ sendJson, adminFirestore, now: () => NOW });
  res = makeRes();
  await none.handle({ url: '/x', headers: {} }, res);
  assert.equal(res.statusCode, 503);
});
