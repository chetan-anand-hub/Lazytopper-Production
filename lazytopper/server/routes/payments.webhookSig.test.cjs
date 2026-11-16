// WEBHOOK-SIG-1 — Razorpay webhooks whose JSON has non-ASCII text, signed over an escaped copy.
// Run: node --test lazytopper/server/routes/payments.webhookSig.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

const { createPaymentRoutes, matchWebhookSignature, isWebhookSignatureValid, PAY_ORDER_PATH, PAY_WEBHOOK_PATH } = require('./payments.cjs');
const { createHttpUtils } = require('../services/httpUtils.cjs');

const SECRET = 'test_webhook_secret';
const ENV_ON = { PAYMENTS_ENABLED: '1', RAZORPAY_KEY_ID: 'rzp_test_K', RAZORPAY_KEY_SECRET: 'ks', RAZORPAY_WEBHOOK_SECRET: SECRET };
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const esc = (text, upper) =>
  text.replace(/[^\x00-\x7f]/g, (ch) => {
    const h = ch.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${upper ? h.toUpperCase() : h}`;
  });

// Minimal in-memory store: unknown orders are acknowledged (200 ignored), which is enough to tell "signature accepted" from 400.
function fakeDb() {
  const snap = { exists: false, data: () => undefined };
  return { collection: () => ({ doc: () => ({ get: async () => snap }) }) };
}

async function start(env = ENV_ON) {
  const { sendJson } = createHttpUtils('*');
  const events = [];
  const routes = createPaymentRoutes({
    sendJson,
    verifiedCaller: { resolveVerifiedUid: async () => '' },
    adminFirestore: fakeDb(),
    telemetry: { increment: (e) => events.push(e) },
    env,
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
    now: () => Date.now(),
    foundingOfferOpen: true,
  });
  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === PAY_WEBHOOK_PATH) return routes.handleWebhook(req, res);
    return sendJson(res, 404, { error: 'Not Found' });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, events, close: () => new Promise((r) => server.close(r)) };
}

function post(port, raw, sig) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(raw, 'utf8');
    const req = http.request(
      { host: '127.0.0.1', port, path: PAY_WEBHOOK_PATH, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length, 'X-Razorpay-Signature': sig } },
      (res) => {
        let text = '';
        res.on('data', (c) => { text += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({ status: res.statusCode, json, text });
        });
      },
    );
    req.on('error', reject);
    req.end(payload);
  });
}

const NA_BODY = '{"entity":"event","event":"payment.authorized","payload":{"payment":{"entity":{"id":"pay_X1","order_id":"order_X1","error_description":"Amount ₹599 — declined 😀"}}},"created_at":1}';
const ASCII_BODY = '{"entity":"event","event":"payment.other","payload":{}}';

async function withWarn(fn) {
  const lines = [];
  const orig = console.warn;
  console.warn = (...a) => lines.push(a.join(' '));
  try { await fn(lines); } finally { console.warn = orig; }
  return lines;
}

test('SIG-1 · body signed over its lowercase \\uXXXX-escaped form is accepted via variant a', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const lines = await withWarn(async () => {
    const r = await post(srv.port, NA_BODY, hmac(SECRET, esc(NA_BODY, false)));
    assert.equal(r.status, 200, r.text);
  });
  assert.ok(srv.events.includes('payments.webhook.sig_variant.a'));
  const w = lines.filter((l) => l.includes('sig variant='));
  assert.equal(w.length, 1);
  assert.match(w[0], /sig variant=a event=payment\.authorized order=order_X1 pay=pay_X1/);
  assert.ok(!w[0].includes('declined') && !w[0].includes(SECRET));
});

test('SIG-1 · body signed over the UPPERCASE-hex escaped form is accepted via variant b', async (t) => {
  const srv = await start();
  t.after(srv.close);
  await withWarn(async () => {
    const r = await post(srv.port, NA_BODY, hmac(SECRET, esc(NA_BODY, true)));
    assert.equal(r.status, 200, r.text);
  });
  assert.ok(srv.events.includes('payments.webhook.sig_variant.b'));
  assert.ok(!srv.events.includes('payments.webhook.sig_variant.a'));
});

test('SIG-1 · double-encoded (latin1-read) text is accepted via c2', () => {
  const raw = Buffer.from(NA_BODY, 'utf8');
  const c2 = hmac(SECRET, Buffer.from(raw.toString('latin1'), 'utf8'));
  assert.equal(matchWebhookSignature({ rawBody: raw, signature: c2, webhookSecret: SECRET }), 'c2');
});

test('SIG-1 · a body altered with U+0122 in place of structural quotes is REJECTED (no lossy latin1 variant)', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const X = Buffer.from(NA_BODY, 'utf8');
  const sigX = hmac(SECRET, X); // Razorpay's genuine signature over X
  // Y: X read as latin1, with some structural quotes swapped for U+0122 (low byte 0x22 = '"'), sent as UTF-8.
  const Y = X.toString('latin1').replace(/"(event|payload)"/g, '\u0122$1\u0122');
  assert.notEqual(Y, X.toString('latin1'));
  const yBuf = Buffer.from(Y, 'utf8');
  assert.equal(matchWebhookSignature({ rawBody: yBuf, signature: sigX, webhookSecret: SECRET }), null);
  await withWarn(async () => {
    const r = await post(srv.port, Y, sigX);
    assert.equal(r.status, 400);
    assert.equal(r.json.reason, 'bad_signature');
  });
  assert.ok(!srv.events.some((e) => e.includes('sig_variant')));
});

test('SIG-1 · raw-signed non-ASCII body is accepted with NO variant event or log (old path untouched)', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const lines = await withWarn(async () => {
    const r = await post(srv.port, NA_BODY, hmac(SECRET, Buffer.from(NA_BODY, 'utf8')));
    assert.equal(r.status, 200, r.text);
  });
  assert.ok(!srv.events.some((e) => e.includes('sig_variant')));
  assert.equal(lines.filter((l) => l.includes('sig variant=')).length, 0);
  assert.equal(matchWebhookSignature({ rawBody: Buffer.from(NA_BODY), signature: hmac(SECRET, Buffer.from(NA_BODY)), webhookSecret: SECRET }), 'raw');
});

test('SIG-1 · a wrong secret is rejected for every variant', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const forms = [Buffer.from(NA_BODY), Buffer.from(esc(NA_BODY, false)), Buffer.from(esc(NA_BODY, true)), Buffer.from(NA_BODY, 'utf8').toString('latin1')]; // (last = c2 form)
  await withWarn(async () => {
    for (const f of forms) {
      const r = await post(srv.port, NA_BODY, hmac('wrong_secret', f));
      assert.equal(r.status, 400);
      assert.equal(r.json.reason, 'bad_signature');
    }
  });
  assert.ok(!srv.events.some((e) => e.includes('sig_variant')));
});

test('SIG-1 · an ASCII-only body with a bad signature is rejected over HTTP and never tries variants', async (t) => {
  const srv = await start();
  t.after(srv.close);
  await withWarn(async () => {
    const bad = await post(srv.port, ASCII_BODY, hmac(SECRET, 'x'));
    assert.equal(bad.status, 400);
    assert.equal(bad.json.reason, 'bad_signature');
    const good = await post(srv.port, ASCII_BODY, hmac(SECRET, ASCII_BODY));
    assert.equal(good.status, 200);
  });
  assert.ok(!srv.events.some((e) => e.includes('sig_variant')));
  const raw = Buffer.from(ASCII_BODY);
  assert.equal(matchWebhookSignature({ rawBody: raw, signature: hmac(SECRET, 'x'), webhookSecret: SECRET }), null);
  assert.equal(isWebhookSignatureValid({ rawBody: raw, signature: hmac(SECRET, raw), webhookSecret: SECRET }), true);
});

test('SIG-1 · WEBHOOK_SIG_VARIANTS_DISABLED=1 -> escaped-signed body is rejected', async (t) => {
  const srv = await start({ ...ENV_ON, WEBHOOK_SIG_VARIANTS_DISABLED: '1' });
  t.after(srv.close);
  await withWarn(async () => {
    const r = await post(srv.port, NA_BODY, hmac(SECRET, esc(NA_BODY, false)));
    assert.equal(r.status, 400);
    assert.equal(r.json.reason, 'bad_signature');
    // raw-signed still fine with the switch on
    const ok = await post(srv.port, NA_BODY, hmac(SECRET, Buffer.from(NA_BODY)));
    assert.equal(ok.status, 200);
  });
});

test('SIG-1 · failure diag carries naPaths + cps and no string values', async (t) => {
  const srv = await start();
  t.after(srv.close);
  const lines = await withWarn(async () => {
    const r = await post(srv.port, NA_BODY, hmac('wrong_secret', NA_BODY));
    assert.equal(r.status, 400);
  });
  const l = lines.find((x) => x.includes('rejected reason=bad_signature'));
  assert.ok(l, lines.join('\n'));
  assert.match(l, /naPaths=payload\.payment\.entity\.error_description/);
  assert.match(l, /cps=U\+20B9,U\+2014,U\+1F600/);
  assert.ok(!l.includes('declined') && !l.includes('Amount'));
});
