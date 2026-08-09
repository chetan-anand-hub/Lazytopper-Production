/**
 * accountExport.test.cjs (route) — guards for GET /api/account/export.
 *
 * Run: node --test lazytopper/server/routes/accountExport.test.cjs
 *
 * ★★ THE PROPERTY THAT MATTERS MOST is that the uid comes from the VERIFIED TOKEN and
 * from nowhere else. Its erasure twin states the same rule; on a READ it is worse in
 * one specific way — a wrongly-erased account gets noticed, a wrongly-exported one
 * does not. The negative test below sends a victim's uid in the query string, the
 * body, `X-Lazytopper-Uid` and `X-User-ID` at once and asserts only the attacker's
 * own account is ever read, and that the victim's uid is not even echoed back.
 *
 * ★ THE SECOND PROPERTY is that the export BODY is not passed through the shared JSON
 * sink. `httpUtils.sendJson` redacts by key name and stops at depth 8; a data export
 * must return the student's documents unchanged. The test below proves the payload
 * survives a field called `details`, and the CONTROL proves the same body would be
 * rewritten if it had gone through the sink.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  createAccountExportRoutes,
  ACCOUNT_EXPORT_PATH,
  EXPORT_LIMITS,
  EXPORT_CLASS,
  exportFilename,
} = require('./accountExport.cjs');
const { createHttpUtils, redactErrorDetails } = require('../services/httpUtils.cjs');
const { createVerifiedCaller } = require('../services/verifiedCaller.cjs');
const { DISCLOSURE_THIRD_PARTY } = require('../services/accountExport.cjs');

const { sendJson } = createHttpUtils('*');

const ATTACKER = 'attacker-uid';
const VICTIM = 'victim-uid';

function fakeRes() {
  const out = { status: null, headers: null, body: null, raw: null };
  return {
    out,
    writeHead(status, headers) {
      out.status = status;
      out.headers = headers;
    },
    end(payload) {
      out.raw = payload;
      try {
        out.body = JSON.parse(payload);
      } catch {
        out.body = null;
      }
    },
  };
}

function req(headers = {}, extra = {}) {
  return { method: 'GET', url: ACCOUNT_EXPORT_PATH, headers, socket: { remoteAddress: '10.0.0.1' }, ...extra };
}

/** firebase-admin stand-in: only this token verifies, and only to ATTACKER. */
const admin = {
  auth: () => ({
    async verifyIdToken(token) {
      if (token !== 'attacker-token') throw new Error('invalid token');
      return { uid: ATTACKER };
    },
  }),
};

function cleanResult(overrides = {}) {
  return {
    format: 'lazytopper.data-export',
    formatVersion: 1,
    generatedAt: '2026-08-09T00:00:00.000Z',
    account: { uid: ATTACKER },
    readme: ['This file is your LazyTopper data export.'],
    ok: true,
    complete: false,
    summary: { total: 3, recordsExported: 1 },
    disclosures: [
      { id: 'third-party.gemini', status: 'excluded', reasons: [DISCLOSURE_THIRD_PARTY] },
      { id: 'local-storage', status: 'notServerExportable', reasons: ['device only'] },
    ],
    locations: [
      { id: 'learnerProfiles', status: 'exported', recordCount: 1, records: [{ path: 'p', data: { goal: 'x' } }] },
      { id: 'local-storage', status: 'notServerExportable', recordCount: 0, records: [] },
      { id: 'third-party.gemini', status: 'excluded', recordCount: 0, records: [] },
    ],
    ...overrides,
  };
}

/** Records every uid exportAccount was called with — the negative test's evidence. */
function fakeExport(opts = {}) {
  const calls = [];
  return {
    calls,
    isAvailable: () => (opts.available === undefined ? true : opts.available),
    unavailableReason: () => opts.reason || 'firebase-admin is not initialised',
    async exportAccount(uid) {
      calls.push(uid);
      if (opts.throws) throw new Error('boom');
      return opts.result || cleanResult();
    },
  };
}

function makeRoute(opts = {}) {
  const accountExport = opts.accountExport || fakeExport(opts);
  const telemetry = { events: [], increment(e, v = 1) { this.events.push({ e, v }); } };
  const routes = createAccountExportRoutes({
    sendJson,
    telemetry,
    verifiedCaller: opts.verifiedCaller || createVerifiedCaller({ firebaseAdmin: admin }),
    accountExport,
    rateLimiter: opts.rateLimiter,
    corsOrigin: opts.corsOrigin || 'https://www.lazytopper.com',
  });
  return { routes, accountExport, telemetry };
}

const bearer = (token, extra = {}) => req({ authorization: `Bearer ${token}`, ...extra });

/* ══════════════════════════════════════════════════════════════════════════════
   1 · AUTH — fail closed
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ 401 when resolveVerifiedUid returns "" — no token at all', async () => {
  const { routes, accountExport } = makeRoute();
  const res = fakeRes();
  await routes.handleExport(req(), res);
  assert.equal(res.out.status, 401);
  assert.equal(res.out.body.error, 'unauthenticated');
  assert.deepEqual(accountExport.calls, [], 'nothing may be read without a verified uid');
});

test('★ 401 for every way resolveVerifiedUid can yield "" — and NOT for the good token', async () => {
  const cases = {
    'expired / forged token': bearer('nope'),
    'malformed Authorization header': req({ authorization: 'Token abc' }),
    'empty bearer value': req({ authorization: 'Bearer ' }),
  };
  for (const [label, request] of Object.entries(cases)) {
    const { routes, accountExport } = makeRoute();
    const res = fakeRes();
    await routes.handleExport(request, res);
    assert.equal(res.out.status, 401, label);
    assert.deepEqual(accountExport.calls, [], label);
  }

  // CONTROL: the same route, a valid token, is NOT a 401 — so the refusals above are
  // the gate firing rather than the route being broken.
  const { routes, accountExport } = makeRoute();
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);
  assert.equal(res.out.status, 200);
  assert.deepEqual(accountExport.calls, [ATTACKER]);
});

test('★ 401 when firebase-admin is not initialised at all (a token cannot be checked)', async () => {
  const { routes, accountExport } = makeRoute({ verifiedCaller: createVerifiedCaller({ firebaseAdmin: null }) });
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);
  assert.equal(res.out.status, 401);
  assert.deepEqual(accountExport.calls, []);
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · OWNER SCOPE — the uid comes from the token and from NOWHERE else
   ══════════════════════════════════════════════════════════════════════════════ */

test('★★ a request supplying SOMEONE ELSE\'S uid must not export it', async () => {
  const { routes, accountExport } = makeRoute();
  const res = fakeRes();

  const request = req(
    { authorization: 'Bearer attacker-token', 'x-lazytopper-uid': VICTIM, 'x-user-id': VICTIM },
    { url: `${ACCOUNT_EXPORT_PATH}?uid=${VICTIM}`, body: { uid: VICTIM }, query: { uid: VICTIM } }
  );
  await routes.handleExport(request, res);

  assert.equal(res.out.status, 200);
  assert.deepEqual(accountExport.calls, [ATTACKER], 'the token uid is the ONLY uid that may be exported');
  assert.ok(!accountExport.calls.includes(VICTIM));
  assert.ok(!res.out.raw.includes(VICTIM), 'the victim uid must not even be echoed back');
});

test('★ the spoofable header tier of the rate limiter is UNREACHABLE on this route', async () => {
  const seen = [];
  const rateLimiter = {
    check(_req, reqPath, verifiedUid) {
      seen.push({ reqPath, verifiedUid });
      return { allowed: true, class: EXPORT_CLASS };
    },
  };
  const { routes } = makeRoute({ rateLimiter });

  await routes.handleExport(req({ 'x-lazytopper-uid': VICTIM }), fakeRes());
  assert.deepEqual(seen, [], 'the limiter must not be consulted before the 401');

  await routes.handleExport(bearer('attacker-token', { 'x-lazytopper-uid': VICTIM }), fakeRes());
  assert.deepEqual(seen, [{ reqPath: ACCOUNT_EXPORT_PATH, verifiedUid: ATTACKER }]);
});

/* ══════════════════════════════════════════════════════════════════════════════
   3 · RATE LIMITING — the most expensive read in the product
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ the export is capped, the cap is a real 429, and the allowance is usable', async () => {
  const hard = EXPORT_LIMITS[EXPORT_CLASS].hard;
  // ★ Two-sided on purpose. Too loose is an abuse channel; too tight refuses a
  // student something the DPDP Act says they are owed.
  assert.ok(hard >= 3, `a legal entitlement must not be capped below 3/day; got ${hard}`);
  assert.ok(hard <= 10, `an expensive read must stay capped; got ${hard}`);

  const { routes, accountExport } = makeRoute(); // real limiter, constructed by the route
  const statuses = [];
  for (let i = 0; i < hard + 2; i += 1) {
    const res = fakeRes();
    await routes.handleExport(bearer('attacker-token'), res);
    statuses.push(res.out.status);
  }
  assert.deepEqual(statuses.slice(0, hard), new Array(hard).fill(200), 'the allowance must be usable');
  assert.deepEqual(statuses.slice(hard), [429, 429], 'past the cap must be a 429');
  assert.equal(accountExport.calls.length, hard, 'a capped request must not run an export');
});

/* ══════════════════════════════════════════════════════════════════════════════
   4 · HONEST RESPONSES
   ══════════════════════════════════════════════════════════════════════════════ */

test('a clean run is 200 and still reports complete:false with the disclosures', async () => {
  const { routes } = makeRoute();
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);
  assert.equal(res.out.status, 200);
  assert.equal(res.out.body.ok, true);
  assert.equal(res.out.body.complete, false, 'a server-side export must never claim completeness');
  assert.deepEqual(
    res.out.body.disclosures.map((d) => d.id).sort(),
    ['local-storage', 'third-party.gemini']
  );
  assert.ok(res.out.raw.includes(DISCLOSURE_THIRD_PARTY), 'the third-party sentence must reach the wire');
});

test('★ a PARTIAL export is not a 200 — and the partial data is still delivered', async () => {
  const partial = cleanResult({
    ok: false,
    locations: [
      { id: 'learnerProfiles', status: 'exported', recordCount: 1, records: [{ path: 'p', data: { goal: 'x' } }] },
      { id: 'subscriptions', status: 'failed', recordCount: 0, records: [], reason: 'permission denied' },
    ],
    disclosures: [{ id: 'subscriptions', status: 'failed', reasons: ['read failed'], detailReason: 'permission denied' }],
  });
  const { routes } = makeRoute({ result: partial });
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);

  assert.equal(res.out.status, 207, 'a run that read some-but-not-all must not look like success');
  assert.equal(res.out.body.ok, false);
  assert.deepEqual(res.out.body.disclosures.map((d) => d.id), ['subscriptions']);
  // ★ Withholding a partial export would deny the student the part we DID read.
  assert.equal(res.out.body.locations[0].records[0].data.goal, 'x');
});

test('503 with a reason when the machinery is unavailable — never a half-built file', async () => {
  const { routes, accountExport } = makeRoute({ available: false, reason: 'student data map unavailable: nope' });
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);
  assert.equal(res.out.status, 503);
  assert.equal(res.out.body.ok, false);
  assert.match(res.out.body.reason, /student data map unavailable/);
  assert.deepEqual(accountExport.calls, []);
});

test('a thrown export is a 500 that says so, and is counted', async () => {
  const { routes, telemetry } = makeRoute({ throws: true });
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);
  assert.equal(res.out.status, 500);
  assert.equal(res.out.body.ok, false);
  assert.ok(telemetry.events.some((e) => e.e === 'account_export.run_failed'));
});

/* ══════════════════════════════════════════════════════════════════════════════
   5 · DELIVERY — a file a browser downloads and a parent can open
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ the payload is delivered as a downloadable, dated, readable JSON file', async () => {
  const { routes } = makeRoute();
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);

  const h = res.out.headers;
  assert.match(h['Content-Type'], /^application\/json/);
  assert.match(h['Content-Disposition'], /^attachment; filename="lazytopper-data-export-\d{4}-\d{2}-\d{2}\.json"$/);
  // ★ A cross-origin fetch cannot READ a header that is not exposed, so without this
  // the browser saves the file under a generated name and the date is lost.
  assert.equal(h['Access-Control-Expose-Headers'], 'Content-Disposition');
  assert.equal(h['Access-Control-Allow-Origin'], 'https://www.lazytopper.com');
  assert.equal(h['Cache-Control'], 'no-store');

  // ★ Legible: pretty-printed, so a parent opening it in a text editor sees lines.
  assert.ok(res.out.raw.includes('\n  "readme"'), 'the file must be pretty-printed, not one long line');
  assert.ok(res.out.raw.split('\n').length > 10);
  // ...and still machine-readable.
  assert.deepEqual(JSON.parse(res.out.raw).account, { uid: ATTACKER });

  assert.equal(exportFilename(new Date('2026-08-09T12:00:00Z')), 'lazytopper-data-export-2026-08-09.json');
});

test('★★ the export body is NOT passed through the redacting JSON sink', async () => {
  const studentDoc = { concept: 'ohms-law', details: 'I confused V and I' };
  const result = cleanResult({
    locations: [
      { id: 'learnerProfiles.mistakeLogs', status: 'exported', recordCount: 1, records: [{ path: 'p', data: studentDoc }] },
    ],
  });
  const { routes } = makeRoute({ result });
  const res = fakeRes();
  await routes.handleExport(bearer('attacker-token'), res);

  assert.equal(
    res.out.body.locations[0].records[0].data.details,
    'I confused V and I',
    'the student\'s own words were rewritten on the way out'
  );

  // ★ CONTROL: the SAME body through the sink IS rewritten — so the assertion above
  // is the bypass working, not a body the sink would have left alone anyway.
  const throughSink = redactErrorDetails(result);
  assert.notEqual(
    throughSink.locations[0].records[0].data.details,
    studentDoc.details,
    'CONTROL FAILED: the sink did not rewrite this body, so the test above proves nothing'
  );
});

/* ══════════════════════════════════════════════════════════════════════════════
   6 · MOUNT IS NOT REACH — the route must actually be dispatched
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ the gateway dispatches this path, and preflights it', () => {
  const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');

  // CONTROL FIRST: the scan finds a route that is known to be live today, so a miss
  // below is a real absence rather than a scan that matches nothing.
  assert.ok(
    indexSrc.includes("reqPath === '/api/qr-upload/new'"),
    'control failed: the scan cannot see a route that is definitely registered'
  );

  assert.ok(indexSrc.includes('ACCOUNT_EXPORT_PATH'), 'the path constant must be imported, not retyped');
  assert.ok(
    indexSrc.includes('accountExportRoutes.handleExport(req, res)'),
    'GET /api/account/export is not dispatched to the handler'
  );
  assert.ok(
    /req\.method === 'GET' && reqPath === ACCOUNT_EXPORT_PATH/.test(indexSrc),
    'the dispatch must be method-scoped to GET'
  );

  // ★ Authorization is not a CORS-safelisted header, so this GET is preflighted
  // exactly like its POST twin. Without an entry here the request never leaves the
  // browser: mounted, and unreachable.
  const preflightBlock = indexSrc.slice(
    indexSrc.indexOf("req.method === 'OPTIONS'"),
    indexSrc.indexOf('Access-Control-Max-Age')
  );
  assert.ok(
    preflightBlock.includes('ACCOUNT_EXPORT_PATH'),
    'the export path is missing from the CORS preflight allowlist'
  );
  // The preflight must advertise GET, or the browser rejects the real request.
  const preflightHeaders = indexSrc.slice(
    indexSrc.indexOf('Access-Control-Allow-Methods'),
    indexSrc.indexOf('Access-Control-Max-Age')
  );
  assert.match(preflightHeaders, /GET/);
});

test('the export path is a single literal, exported once', () => {
  assert.equal(ACCOUNT_EXPORT_PATH, '/api/account/export');
});

test('★ the export and erasure routes are siblings, not the same path', () => {
  const { ACCOUNT_ERASE_PATH } = require('./accountErasure.cjs');
  assert.notEqual(ACCOUNT_EXPORT_PATH, ACCOUNT_ERASE_PATH);
  assert.ok(ACCOUNT_EXPORT_PATH.startsWith('/api/account/'), 'the pair must live under one prefix');
});
