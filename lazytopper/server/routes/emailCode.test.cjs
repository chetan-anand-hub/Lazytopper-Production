'use strict';
/**
 * EMAIL-CODE-1 — sign in with a 6-digit email code. Pins: dark switch, send/verify happy path, wrong code x5 lockout,
 * expiry (server clock), single use, no enumeration (same answer and the same code-state behaviour for an address with
 * no account), per-email + per-IP limits, the sign-in link is for the email's owner (never a body uid), unverified email
 * marked verified (and password sessions revoked), a pay-first order waiting for the email -> the existing delivery
 * makes the account, the code never in logs / telemetry / responses.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const { createEmailCodeRoutes, EMAIL_CODE_SEND_PATH, EMAIL_CODE_VERIFY_PATH } = require('./emailCode.cjs');
const {
  createCodeStore,
  createWindowLimiter,
  generateCode,
  isEmailCodeSigninEnabled,
  resolveSecret,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
} = require('../services/emailCode.cjs');
const { buildSignInCodeEmail, resolveEmailCodeMailConfig, createEmailCodeMailer } = require('../services/emailCodeEmail.cjs');

const ON = { EMAIL_CODE_SIGNIN_ENABLED: '1' };
const SECRET = 'x'.repeat(40);

function req(body, ip = '1.2.3.4') {
  const r = new EventEmitter();
  r.headers = { 'x-forwarded-for': ip };
  r.socket = { remoteAddress: ip };
  process.nextTick(() => {
    r.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    r.emit('end');
  });
  return r;
}

function harness({ env = ON, accounts = {}, orders = {}, mailerReady = true, payAuto = false, deliver, codes } = {}) {
  let t = 1_000_000;
  const now = () => t;
  const sent = [];
  const events = [];
  const calls = { updateUser: [], createSignInLink: [], revoke: [], deliver: [] };
  const responses = [];
  const res = {};
  const sendJson = (_res, status, body) => responses.push({ status, body, headers: {} });
  const sendJsonWithHeaders = (_res, status, body, headers) => responses.push({ status, body, headers });
  const queue = codes ? [...codes] : null;
  const store = createCodeStore({ secret: SECRET, now, codeFn: queue ? () => queue.shift() : generateCode });
  const db = {
    collection: (name) => {
      assert.equal(name, 'payOrders');
      const filters = [];
      const q = {
        where: (f, op, v) => {
          filters.push([f, v]);
          return q;
        },
        limit: () => q,
        get: async () => ({
          docs: Object.entries(orders)
            .filter(([, o]) => filters.every(([f, v]) => o[f] === v))
            .map(([id, o]) => ({ id, data: () => o })),
        }),
      };
      return q;
    },
  };
  const authAccounts = {
    getUserByEmail: async (email) => accounts[email] || null,
    updateUser: async (uid, props) => {
      calls.updateUser.push({ uid, props });
      for (const a of Object.values(accounts)) if (a.uid === uid) Object.assign(a, props);
    },
    // The link is minted for an EMAIL; tests read back which account owned it at that moment.
    createSignInLink: async (email) => {
      const owner = accounts[email];
      calls.createSignInLink.push({ email, uid: owner ? owner.uid : null });
      return `https://www.lazytopper.com/__/auth/action?mode=signIn&oobCode=X&continueUrl=%2Flogin#${owner ? owner.uid : 'none'}`;
    },
    revokeRefreshTokens: async (uid) => calls.revoke.push(uid),
  };
  const routes = createEmailCodeRoutes({
    sendJson,
    sendJsonWithHeaders,
    adminFirestore: db,
    telemetry: { increment: (name) => events.push(name) },
    env,
    now,
    store,
    limiter: createWindowLimiter({ now }),
    authAccounts,
    mailer: { ready: () => mailerReady, send: async (m) => (sent.push(m), { ok: true }) },
    deliverWaitingOrder:
      deliver ||
      (async (input) => {
        calls.deliver.push(input);
      }),
    payAutoAccountEnabled: () => payAuto,
  });
  return {
    routes,
    sent,
    events,
    calls,
    responses,
    accounts,
    advance: (ms) => (t += ms),
    async send(email, ip) {
      await routes.handleSend(req({ email }, ip), res);
      await routes.whenIdle();
      return responses[responses.length - 1];
    },
    async verify(email, code, ip, extra = {}) {
      await routes.handleVerify(req({ email, code, ...extra }, ip), res);
      return responses[responses.length - 1];
    },
  };
}

const STUDENT = () => ({ 'asha@gmail.com': { uid: 'uidAsha', email: 'asha@gmail.com', emailVerified: true, providerData: [{ providerId: 'google.com' }] } });

test('switch: off unless EMAIL_CODE_SIGNIN_ENABLED; off -> 404 before anything is read', async () => {
  assert.equal(isEmailCodeSigninEnabled({}), false);
  assert.equal(isEmailCodeSigninEnabled({ EMAIL_CODE_SIGNIN_ENABLED: 'off' }), false);
  assert.equal(isEmailCodeSigninEnabled(ON), true);
  const h = harness({ env: {}, accounts: STUDENT() });
  assert.deepEqual(await h.send('asha@gmail.com'), { status: 404, body: { error: 'Not Found' }, headers: {} });
  assert.equal((await h.verify('asha@gmail.com', '123456')).status, 404);
  assert.equal(h.sent.length, 0);
  assert.equal(h.events.length, 0);
});

test('paths', () => {
  assert.equal(EMAIL_CODE_SEND_PATH, '/api/auth/email-code/send');
  assert.equal(EMAIL_CODE_VERIFY_PATH, '/api/auth/email-code/verify');
});

test('happy path: send emails a 6-digit code to the owner; verify returns a one-time sign-in link for that email (no-store)', async () => {
  const h = harness({ accounts: STUDENT() });
  const r = await h.send('  Asha@Gmail.com ');
  assert.deepEqual(r.body, { ok: true });
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, 'asha@gmail.com');
  assert.match(h.sent[0].code, /^\d{6}$/);
  const v = await h.verify('asha@gmail.com', h.sent[0].code);
  assert.equal(v.status, 200);
  assert.equal(v.body.ok, true);
  assert.match(v.body.link, /oobCode=/);
  assert.deepEqual(Object.keys(v.body).sort(), ['link', 'ok']);
  assert.equal(v.headers['Cache-Control'], 'no-store');
  assert.deepEqual(h.calls.createSignInLink.map((c) => c.uid), ['uidAsha']);
  assert.equal(h.calls.updateUser.length, 0, 'already verified: nothing written');
});

test('the sign-in is ALWAYS into the email owner: a uid in the body is ignored, the link is for the code\'s email', async () => {
  const h = harness({ accounts: STUDENT() });
  await h.send('asha@gmail.com');
  const v = await h.verify('asha@gmail.com', h.sent[0].code, undefined, { uid: 'attackerUid', email2: 'x@evil.com' });
  assert.ok(v.body.link.endsWith('#uidAsha'), 'the link signs in the email owner');
  assert.deepEqual(h.calls.createSignInLink.map((c) => c.email), ['asha@gmail.com']);
  assert.deepEqual(h.calls.createSignInLink.map((c) => c.uid), ['uidAsha']);
});

test('a right code for ONE email never signs in another email', async () => {
  const accounts = { ...STUDENT(), 'ravi@gmail.com': { uid: 'uidRavi', email: 'ravi@gmail.com', emailVerified: true } };
  const h = harness({ accounts, codes: ['111111', '222222'] });
  await h.send('asha@gmail.com');
  await h.send('ravi@gmail.com');
  const v = await h.verify('ravi@gmail.com', '111111');
  assert.equal(v.body.error, 'code_mismatch');
  assert.equal(h.calls.createSignInLink.length, 0);
});

test('wrong code x5 -> locked ("send a new one"); even the right code is refused after; a new code unlocks', async () => {
  const h = harness({ accounts: STUDENT(), codes: ['424242', '737373'] });
  await h.send('asha@gmail.com');
  const left = [];
  for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) left.push((await h.verify('asha@gmail.com', '000000')).body.triesLeft);
  assert.deepEqual(left, [4, 3, 2, 1]);
  assert.deepEqual((await h.verify('asha@gmail.com', '000000')).body, { ok: false, error: 'too_many_tries' });
  assert.deepEqual((await h.verify('asha@gmail.com', '424242')).body, { ok: false, error: 'too_many_tries' });
  assert.equal(h.calls.createSignInLink.length, 0);
  h.advance(31 * 1000);
  await h.send('asha@gmail.com');
  assert.equal((await h.verify('asha@gmail.com', '737373')).body.ok, true);
});

test('expiry on the server clock: 10 minutes', async () => {
  const h = harness({ accounts: STUDENT(), codes: ['555555', '666666'] });
  await h.send('asha@gmail.com');
  h.advance(CODE_TTL_MS + 1);
  assert.deepEqual((await h.verify('asha@gmail.com', '555555')).body, { ok: false, error: 'code_expired' });
  assert.equal(h.calls.createSignInLink.length, 0);
  await h.send('asha@gmail.com');
  h.advance(CODE_TTL_MS - 1000);
  assert.equal((await h.verify('asha@gmail.com', '666666')).body.ok, true);
});

test('single use: a code that signed in once never signs in again', async () => {
  const h = harness({ accounts: STUDENT() });
  await h.send('asha@gmail.com');
  const code = h.sent[0].code;
  assert.equal((await h.verify('asha@gmail.com', code)).body.ok, true);
  assert.deepEqual((await h.verify('asha@gmail.com', code)).body, { ok: false, error: 'code_expired' });
  assert.equal(h.calls.createSignInLink.length, 1);
});

test('a NEW code replaces the old one (the old one stops working)', async () => {
  const h = harness({ accounts: STUDENT(), codes: ['121212', '343434'] });
  await h.send('asha@gmail.com');
  h.advance(31 * 1000);
  await h.send('asha@gmail.com');
  assert.equal((await h.verify('asha@gmail.com', '121212')).body.error, 'code_mismatch');
  assert.equal((await h.verify('asha@gmail.com', '343434')).body.ok, true);
});

test('NO ENUMERATION: an address with no account gets the same answer, no email, and the same verify behaviour', async () => {
  const h = harness({ accounts: STUDENT() });
  const a = await h.send('asha@gmail.com');
  const b = await h.send('nobody@gmail.com');
  assert.deepEqual(a, b);
  assert.equal(h.sent.length, 1, 'only the account owner is emailed');
  assert.ok(!h.sent.some((m) => m.to === 'nobody@gmail.com'));
  // Wrong guesses count down the same way, then lock - exactly as for a real account.
  const seen = [];
  for (let i = 0; i < MAX_ATTEMPTS; i += 1) seen.push((await h.verify('nobody@gmail.com', '000000')).body);
  assert.deepEqual(seen.map((x) => x.triesLeft || x.error), [4, 3, 2, 1, 'too_many_tries']);
});

test('NO ENUMERATION: the send answer is written BEFORE the address is looked up (timing class)', async () => {
  const order = [];
  const h = harness({ accounts: STUDENT() });
  const routes = createEmailCodeRoutes({
    sendJson: () => order.push('responded'),
    env: ON,
    store: createCodeStore({ secret: SECRET }),
    limiter: createWindowLimiter(),
    authAccounts: {
      getUserByEmail: async () => {
        order.push('lookup');
        return null;
      },
      createSignInLink: async () => 'l',
    },
    mailer: { ready: () => true, send: async () => ({ ok: true }) },
  });
  await routes.handleSend(req({ email: 'x@gmail.com' }), {});
  await routes.whenIdle();
  assert.deepEqual(order, ['responded', 'lookup']);
  assert.equal(h.sent.length, 0);
});

test('per-email limits: 30 s apart, 3 per 15 min, 10 per day - counted for EVERY address alike', async () => {
  for (const email of ['asha@gmail.com', 'nobody@gmail.com']) {
    const h = harness({ accounts: STUDENT() });
    assert.equal((await h.send(email)).status, 200);
    const fast = await h.send(email);
    assert.equal(fast.status, 429);
    assert.equal(fast.body.error, 'too_many');
    assert.ok(fast.body.retryAfterSec >= 1 && fast.body.retryAfterSec <= 30);
    h.advance(31 * 1000);
    assert.equal((await h.send(email)).status, 200);
    h.advance(31 * 1000);
    assert.equal((await h.send(email)).status, 200);
    h.advance(31 * 1000);
    assert.equal((await h.send(email)).status, 429, '4th inside 15 min');
    let ok = 3;
    for (let i = 0; i < 40 && ok < 10; i += 1) {
      h.advance(5 * 60 * 1000);
      if ((await h.send(email)).status === 200) ok += 1;
    }
    assert.equal(ok, 10);
    h.advance(16 * 60 * 1000);
    assert.equal((await h.send(email)).status, 429, '11th inside 24 h');
  }
});

test('per-IP limits on send and verify', async () => {
  const h = harness({ accounts: STUDENT() });
  let last;
  for (let i = 0; i < 21; i += 1) last = await h.send(`s${i}@gmail.com`, '9.9.9.9');
  assert.equal(last.status, 429);
  assert.equal((await h.send('other@gmail.com', '8.8.8.8')).status, 200, 'another IP is not affected');
  for (let i = 0; i < 41; i += 1) last = await h.verify(`v${i}@gmail.com`, '123456', '7.7.7.7');
  assert.equal(last.status, 429);
});

test('bad input: 400 without touching codes', async () => {
  const h = harness({ accounts: STUDENT() });
  assert.equal((await h.send('not-an-email')).body.error, 'invalid_email');
  await h.routes.handleSend(req('{oops'), {});
  assert.equal(h.responses[h.responses.length - 1].status, 400);
  assert.equal((await h.verify('asha@gmail.com', '12345')).body.error, 'invalid_code');
  assert.equal((await h.verify('asha@gmail.com', 'abcdef')).body.error, 'invalid_code');
  assert.equal(h.sent.length, 0);
});

test('mailer not configured -> 503 for every address alike (nothing issued)', async () => {
  const h = harness({ accounts: STUDENT(), mailerReady: false });
  assert.deepEqual((await h.send('asha@gmail.com')).body, { ok: false, error: 'unavailable' });
  assert.deepEqual((await h.send('nobody@gmail.com')).body, { ok: false, error: 'unavailable' });
});

test('an UNVERIFIED email on an existing account: the code proves it -> marked verified; password sessions revoked first', async () => {
  const accounts = { 'meera@gmail.com': { uid: 'uidMeera', email: 'meera@gmail.com', emailVerified: false, providerData: [{ providerId: 'password' }] } };
  const h = harness({ accounts });
  await h.send('meera@gmail.com');
  const v = await h.verify('meera@gmail.com', h.sent[0].code);
  assert.ok(v.body.link.endsWith('#uidMeera'), 'the link signs in the email owner');
  assert.deepEqual(h.calls.updateUser, [{ uid: 'uidMeera', props: { emailVerified: true } }]);
  assert.deepEqual(h.calls.revoke, ['uidMeera']);
});

test('a pay-first account (pay- uid, email unverified, no password): verified, no revoke, the link signs it in', async () => {
  const accounts = { 'kid@gmail.com': { uid: 'pay-0123456789abcdef01234567', email: 'kid@gmail.com', emailVerified: false, providerData: [] } };
  const h = harness({ accounts });
  await h.send('kid@gmail.com');
  const v = await h.verify('kid@gmail.com', h.sent[0].code);
  assert.ok(v.body.link.endsWith('#pay-0123456789abcdef01234567'), 'the link signs in the email owner');
  assert.equal(h.calls.revoke.length, 0);
});

test('a disabled account is never emailed nor signed in', async () => {
  const accounts = { 'off@gmail.com': { uid: 'uidOff', email: 'off@gmail.com', emailVerified: true, disabled: true } };
  const h = harness({ accounts, codes: ['999999'] });
  await h.send('off@gmail.com');
  assert.equal(h.sent.length, 0);
  assert.deepEqual((await h.verify('off@gmail.com', '999999')).body, { ok: false, error: 'no_account' });
  assert.equal(h.calls.createSignInLink.length, 0);
});

const WAITING = (extra = {}) => ({
  ord1: { payer: 'guest', checkoutWho: true, status: 'paid_unclaimed', guestEmail: 'new@gmail.com', recipientFirst: 'email', paymentId: 'pay_1', uid: null, ...extra },
});

test('pay-first order waiting (PAY_AUTO_ACCOUNT on): the code is emailed; verify runs the EXISTING delivery, then signs in to the account it made', async () => {
  const accounts = {};
  const h = harness({
    accounts,
    orders: WAITING(),
    payAuto: true,
    deliver: async (input) => {
      h.calls.deliver.push(input);
      accounts['new@gmail.com'] = { uid: 'pay-aaaaaaaaaaaaaaaaaaaaaaaa', email: 'new@gmail.com', emailVerified: false, providerData: [] };
    },
  });
  await h.send('new@gmail.com');
  assert.equal(h.sent.length, 1);
  const v = await h.verify('new@gmail.com', h.sent[0].code);
  assert.deepEqual(h.calls.deliver, [{ orderId: 'ord1', paymentId: 'pay_1' }]);
  assert.ok(v.body.link.endsWith('#pay-aaaaaaaaaaaaaaaaaaaaaaaa'), 'the link signs in the email owner');
  assert.deepEqual(h.calls.updateUser, [{ uid: 'pay-aaaaaaaaaaaaaaaaaaaaaaaa', props: { emailVerified: true } }]);
});

test('pay-first order waiting but PAY_AUTO_ACCOUNT off -> not emailed, no delivery', async () => {
  const h = harness({ orders: WAITING(), payAuto: false, codes: ['101010'] });
  await h.send('new@gmail.com');
  assert.equal(h.sent.length, 0);
  assert.deepEqual((await h.verify('new@gmail.com', '101010')).body, { ok: false, error: 'no_account' });
  assert.equal(h.calls.deliver.length, 0);
});

test('a waiting order whose FIRST identifier is a phone never becomes an email sign-in (first-identifier rule)', async () => {
  const h = harness({ orders: WAITING({ recipientFirst: 'phone', guestPhone: '+919812345678' }), payAuto: true, codes: ['202020'] });
  await h.send('new@gmail.com');
  assert.equal(h.sent.length, 0);
  assert.deepEqual((await h.verify('new@gmail.com', '202020')).body, { ok: false, error: 'no_account' });
  assert.equal(h.calls.deliver.length, 0);
});

test('the code and the email are never in telemetry, and never in a response', async () => {
  const h = harness({ accounts: STUDENT() });
  await h.send('asha@gmail.com');
  const code = h.sent[0].code;
  await h.verify('asha@gmail.com', '000000');
  await h.verify('asha@gmail.com', code);
  const blob = JSON.stringify({ events: h.events, responses: h.responses });
  assert.ok(!blob.includes(code));
  assert.ok(!blob.includes('asha'));
  for (const e of h.events) assert.match(e, /^auth\.email_code\.[a-z_.]+$/);
});

test('the store keeps only an HMAC (no plain code, no plain email)', () => {
  const store = createCodeStore({ secret: SECRET, codeFn: () => '314159' });
  store.issue('asha@gmail.com');
  const id = store.idFor('asha@gmail.com');
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.ok(!id.includes('asha'));
  assert.equal(store.size(), 1);
});

test('codes are 6 digits, zero-padded; a short / missing secret falls back to a random process key', () => {
  for (let i = 0; i < 200; i += 1) assert.match(generateCode(), /^\d{6}$/);
  assert.equal(resolveSecret({ EMAIL_CODE_SECRET: 'y'.repeat(32) }), 'y'.repeat(32));
  const a = resolveSecret({ EMAIL_CODE_SECRET: 'short' });
  assert.equal(a.length, 64);
  assert.notEqual(a, resolveSecret({}));
});

test('the email: code in subject and body, no link, sender on the verified domain only', async () => {
  const e = buildSignInCodeEmail('123456');
  assert.equal(e.subject, 'Your LazyTopper sign-in code: 123456');
  assert.match(e.text, /valid for 10 minutes/);
  assert.match(e.text, /If you didn't ask for it, ignore this email/);
  assert.ok(!/https?:\/\//.test(e.text + e.html));
  assert.equal(resolveEmailCodeMailConfig({}).ready, false);
  assert.equal(resolveEmailCodeMailConfig({ RESEND_API_KEY: 'k', EMAIL_CODE_FROM: 'x@evil.com' }).ready, false);
  assert.equal(resolveEmailCodeMailConfig({ RESEND_API_KEY: 'k' }).ready, true);
  const posts = [];
  const mailer = createEmailCodeMailer({
    env: { RESEND_API_KEY: 'k' },
    fetchImpl: async (url, init) => {
      posts.push({ url, init });
      return { ok: true, json: async () => ({ id: 'r1' }) };
    },
  });
  assert.equal((await mailer.send({ to: 'asha@gmail.com', code: '123456' })).ok, true);
  assert.equal(posts.length, 1);
  assert.ok(!posts[0].init.headers['Idempotency-Key'].includes('123456'), 'the code is not in the idempotency key');
  assert.match(posts[0].init.headers['Idempotency-Key'], /^signin-code-[0-9a-f-]{36}$/);
});
