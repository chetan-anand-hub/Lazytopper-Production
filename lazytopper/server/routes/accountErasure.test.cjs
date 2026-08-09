/**
 * accountErasure.test.cjs (route) — guards for POST /api/account/erase.
 *
 * Run: node --test lazytopper/server/routes/accountErasure.test.cjs
 * Wired into `lazytopper` test:matrix:all, which CI gates on every PR.
 *
 * ★★ THE PROPERTY THAT MATTERS MOST is that the uid comes from the VERIFIED TOKEN
 * and from nowhere else. A destructive route that honours a uid from the body, the
 * query string or `X-Lazytopper-Uid` is the account-takeover version of this
 * feature, and the header is trivially spoofable today
 * (`[FU-DPDP-GATEWAY-SPOOFABLE-UID-HEADER]`). The negative test below sends a
 * victim's uid in ALL THREE of those places at once and asserts the attacker's own
 * account is the only thing erased.
 *
 * ★ resolveVerifiedUid is ALREADY fail-closed — every failure path returns "" and it
 * never consults a header. This route adds the missing half: a caller that REFUSES
 * "". Nothing in verifiedCaller changes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { createAccountErasureRoutes, ACCOUNT_ERASE_PATH, ERASURE_LIMITS, ERASURE_CLASS } = require('./accountErasure.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');
const { createVerifiedCaller } = require('../services/verifiedCaller.cjs');

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
  return { method: 'POST', url: ACCOUNT_ERASE_PATH, headers, socket: { remoteAddress: '10.0.0.1' }, ...extra };
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
    ok: true,
    complete: false,
    locations: [
      { id: 'users', status: 'deleted', deleted: 1 },
      { id: 'local-storage', status: 'notServerErasable', deleted: 0 },
      { id: 'third-party.gemini', status: 'notDeletable', deleted: 0 },
    ],
    summary: { total: 3, documentsDeleted: 1 },
    remaining: [{ id: 'local-storage' }, { id: 'third-party.gemini' }],
    ...overrides,
  };
}

/** Records every uid eraseAccount was called with — the negative test's evidence. */
function fakeErasure(opts = {}) {
  const calls = [];
  return {
    calls,
    isAvailable: () => (opts.available === undefined ? true : opts.available),
    unavailableReason: () => opts.reason || 'firebase-admin is not initialised',
    async eraseAccount(uid) {
      calls.push(uid);
      if (opts.throws) throw new Error('boom');
      return opts.result || cleanResult();
    },
  };
}

function makeRoute(opts = {}) {
  const erasure = opts.erasure || fakeErasure(opts);
  const telemetry = { events: [], increment(e, v = 1) { this.events.push({ e, v }); } };
  const routes = createAccountErasureRoutes({
    sendJson,
    telemetry,
    verifiedCaller: opts.verifiedCaller || createVerifiedCaller({ firebaseAdmin: admin }),
    accountErasure: erasure,
    rateLimiter: opts.rateLimiter,
  });
  return { routes, erasure, telemetry };
}

const bearer = (token, extra = {}) => req({ authorization: `Bearer ${token}`, ...extra });

/* ══════════════════════════════════════════════════════════════════════════════
   1 · AUTH — fail closed
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ 401 when resolveVerifiedUid returns "" — no token at all', async () => {
  const { routes, erasure } = makeRoute();
  const res = fakeRes();
  await routes.handleErase(req(), res);
  assert.equal(res.out.status, 401);
  assert.equal(res.out.body.error, 'unauthenticated');
  assert.deepEqual(erasure.calls, [], 'nothing may be erased without a verified uid');
});

test('★ 401 for every way resolveVerifiedUid can yield "" — and NOT for the good token', async () => {
  // Each of these is a distinct real failure mode; all of them must 401.
  const cases = {
    'expired / forged token': bearer('nope'),
    'malformed Authorization header': req({ authorization: 'Token abc' }),
    'empty bearer value': req({ authorization: 'Bearer ' }),
  };
  for (const [label, request] of Object.entries(cases)) {
    const { routes, erasure } = makeRoute();
    const res = fakeRes();
    await routes.handleErase(request, res);
    assert.equal(res.out.status, 401, label);
    assert.deepEqual(erasure.calls, [], label);
  }

  // CONTROL: the same route, a valid token, is NOT a 401 — so the five refusals
  // above are the gate firing rather than the route being broken.
  const { routes, erasure } = makeRoute();
  const res = fakeRes();
  await routes.handleErase(bearer('attacker-token'), res);
  assert.equal(res.out.status, 200);
  assert.deepEqual(erasure.calls, [ATTACKER]);
});

test('★ 401 when firebase-admin is not initialised at all (a token cannot be checked)', async () => {
  const { routes, erasure } = makeRoute({ verifiedCaller: createVerifiedCaller({ firebaseAdmin: null }) });
  const res = fakeRes();
  await routes.handleErase(bearer('attacker-token'), res);
  assert.equal(res.out.status, 401);
  assert.deepEqual(erasure.calls, []);
});

/* ══════════════════════════════════════════════════════════════════════════════
   2 · OWNER SCOPE — the uid comes from the token and from NOWHERE else
   ══════════════════════════════════════════════════════════════════════════════ */

test('★★ a request supplying SOMEONE ELSE\'S uid must not erase it', async () => {
  const { routes, erasure } = makeRoute();
  const res = fakeRes();

  // The victim's uid in all three attacker-controlled places at once.
  const request = req(
    { authorization: 'Bearer attacker-token', 'x-lazytopper-uid': VICTIM, 'x-user-id': VICTIM },
    { url: `${ACCOUNT_ERASE_PATH}?uid=${VICTIM}`, body: { uid: VICTIM }, query: { uid: VICTIM } }
  );
  await routes.handleErase(request, res);

  assert.equal(res.out.status, 200);
  assert.deepEqual(erasure.calls, [ATTACKER], 'the token uid is the ONLY uid that may be erased');
  assert.ok(!erasure.calls.includes(VICTIM));
  assert.ok(!res.out.raw.includes(VICTIM), 'the victim uid must not even be echoed back');
});

test('★ the spoofable header tier of the rate limiter is UNREACHABLE on this route', async () => {
  // resolveCaller falls back to X-Lazytopper-Uid only when the verified uid is "".
  // The 401 fires first, so the limiter on this path only ever sees a verified uid.
  const seen = [];
  const rateLimiter = {
    check(_req, reqPath, verifiedUid) {
      seen.push({ reqPath, verifiedUid });
      return { allowed: true, class: ERASURE_CLASS };
    },
  };
  const { routes } = makeRoute({ rateLimiter });

  // An unauthenticated request carrying a header uid never reaches the limiter.
  await routes.handleErase(req({ 'x-lazytopper-uid': VICTIM }), fakeRes());
  assert.deepEqual(seen, [], 'the limiter must not be consulted before the 401');

  await routes.handleErase(bearer('attacker-token', { 'x-lazytopper-uid': VICTIM }), fakeRes());
  assert.deepEqual(seen, [{ reqPath: ACCOUNT_ERASE_PATH, verifiedUid: ATTACKER }]);
});

/* ══════════════════════════════════════════════════════════════════════════════
   3 · RATE LIMITING — a tight cap on a destructive route
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ a destructive route is capped, and the cap is a real 429', async () => {
  const hard = ERASURE_LIMITS[ERASURE_CLASS].hard;
  assert.ok(hard > 0 && hard <= 5, `a destructive cap must be tight; got ${hard}`);

  const { routes, erasure } = makeRoute(); // real limiter, constructed by the route
  const statuses = [];
  for (let i = 0; i < hard + 2; i += 1) {
    const res = fakeRes();
    await routes.handleErase(bearer('attacker-token'), res);
    statuses.push(res.out.status);
  }
  assert.deepEqual(statuses.slice(0, hard), new Array(hard).fill(200), 'the allowance must be usable');
  assert.deepEqual(statuses.slice(hard), [429, 429], 'past the cap must be a 429');
  assert.equal(erasure.calls.length, hard, 'a capped request must not run an erasure');
});

/* ══════════════════════════════════════════════════════════════════════════════
   4 · HONEST RESPONSES
   ══════════════════════════════════════════════════════════════════════════════ */

test('a clean run is 200 and still reports complete:false with what remains', async () => {
  const { routes } = makeRoute();
  const res = fakeRes();
  await routes.handleErase(bearer('attacker-token'), res);
  assert.equal(res.out.status, 200);
  assert.equal(res.out.body.ok, true);
  assert.equal(res.out.body.complete, false, 'a server-only erasure must never claim completeness');
  assert.deepEqual(
    res.out.body.remaining.map((r) => r.id).sort(),
    ['local-storage', 'third-party.gemini']
  );
});

test('★ a PARTIAL run is not a 200, and names what was not erased', async () => {
  const partial = cleanResult({
    ok: false,
    locations: [
      { id: 'users', status: 'deleted', deleted: 1 },
      { id: 'subscriptions', status: 'failed', deleted: 0, error: 'permission denied' },
    ],
    remaining: [{ id: 'subscriptions', status: 'failed', reason: 'permission denied' }],
  });
  const { routes } = makeRoute({ result: partial });
  const res = fakeRes();
  await routes.handleErase(bearer('attacker-token'), res);

  assert.equal(res.out.status, 207, 'a run that erased some-but-not-all must not look like success');
  assert.equal(res.out.body.ok, false);
  assert.deepEqual(res.out.body.remaining.map((r) => r.id), ['subscriptions']);
});

test('503 with a reason when the machinery is unavailable — never a silent no-op', async () => {
  const { routes, erasure } = makeRoute({ available: false, reason: 'student data map unavailable: nope' });
  const res = fakeRes();
  await routes.handleErase(bearer('attacker-token'), res);
  assert.equal(res.out.status, 503);
  assert.equal(res.out.body.ok, false);
  assert.match(res.out.body.reason, /student data map unavailable/);
  assert.deepEqual(erasure.calls, []);
});

test('a thrown erasure is a 500 that says so, and is counted', async () => {
  const { routes, telemetry } = makeRoute({ throws: true });
  const res = fakeRes();
  await routes.handleErase(bearer('attacker-token'), res);
  assert.equal(res.out.status, 500);
  assert.equal(res.out.body.ok, false);
  assert.ok(telemetry.events.some((e) => e.e === 'account_erasure.run_failed'));
});

/* ══════════════════════════════════════════════════════════════════════════════
   5 · MOUNT IS NOT REACH — the route must actually be dispatched
   ══════════════════════════════════════════════════════════════════════════════ */

test('★ the gateway dispatches this path, and preflights it', () => {
  const indexSrc = fs.readFileSync(path.join(__dirname, '..', 'index.cjs'), 'utf8');

  // CONTROL FIRST: the scan finds a route that is known to be live today, so a
  // miss below is a real absence rather than a scan that matches nothing.
  assert.ok(
    indexSrc.includes("reqPath === '/api/qr-upload/new'"),
    'control failed: the scan cannot see a route that is definitely registered'
  );

  assert.ok(indexSrc.includes('ACCOUNT_ERASE_PATH'), 'the path constant must be imported, not retyped');
  assert.ok(
    indexSrc.includes('accountErasureRoutes.handleErase(req, res)'),
    'POST /api/account/erase is not dispatched to the handler'
  );
  // The browser sends Authorization on this POST, so without a preflight entry the
  // request never leaves the browser: mounted, and unreachable.
  const preflightBlock = indexSrc.slice(indexSrc.indexOf("req.method === 'OPTIONS'"), indexSrc.indexOf('Access-Control-Max-Age'));
  assert.ok(
    preflightBlock.includes('ACCOUNT_ERASE_PATH'),
    'the erase path is missing from the CORS preflight allowlist'
  );
});

test('the erase path is a single literal, exported once', () => {
  assert.equal(ACCOUNT_ERASE_PATH, '/api/account/erase');
});
