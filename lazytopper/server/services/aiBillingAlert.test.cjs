/**
 * aiBillingAlert.test.cjs — AI-BILLING-ALERT-1: owner email when Gemini fails on the key / billing.
 *
 * Run: `node --test server/services/aiBillingAlert.test.cjs`
 * (wired into `npm run test:matrix:all` as `test:server:ai-billing-alert`).
 *
 * No network: Gemini is a stubbed `globalThis.fetch`; the email sender is a recorder.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAiBillingAlert,
  classifyGeminiFailure,
  snippetOf,
  maskRecipient,
  maskPhone,
  buildCallMeBotUrl,
  createCallMeBotSender,
  ALERT_EVERY_MS,
  EMAIL_GAP_MS,
  EMAIL_DAILY_MAX,
  RECOVERY_QUIET_MS,
  WHATSAPP_TIMEOUT_MS,
} = require('./aiBillingAlert.cjs');
const aiBillingAlertModule = require('./aiBillingAlert.cjs');
const { createGeminiClient } = require('./geminiClient.cjs');

/* ── Real Gemini body shapes ─────────────────────────────────────────────── */

// 22 Nov 2026 outage shape (Google moved depleted prepay from 429 to 402).
const BODY_402_PREPAY = JSON.stringify({
  error: {
    code: 402,
    message:
      'Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing. Learn more at https://ai.google.dev/gemini-api/docs/billing#prepay.',
    status: 'RESOURCE_EXHAUSTED',
  },
});
// The same message under the older 429 status (handoff/DISCOVERIES.md D25).
const BODY_429_PREPAY = JSON.stringify({
  error: { code: 429, message: 'Your prepayment credits are depleted. Please go to AI Studio at https://ai.studio/projects to manage your project and billing.', status: 'RESOURCE_EXHAUSTED' },
});
// An ORDINARY per-minute rate limit: it, too, says "billing details" — and must NOT alert.
const BODY_429_PER_MINUTE = JSON.stringify({
  error: {
    code: 429,
    message:
      'You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits.',
    status: 'RESOURCE_EXHAUSTED',
    details: [
      {
        '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
        violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_paid_tier_input_token_count', quotaId: 'GenerateContentPaidTierInputTokensPerModelPerMinute' }],
      },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '23s' },
    ],
  },
});
const BODY_429_PER_DAY = JSON.stringify({
  error: {
    code: 429,
    message: 'You exceeded your current quota, please check your plan and billing details.',
    status: 'RESOURCE_EXHAUSTED',
    details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel' }] }],
  },
});
const BODY_429_BARE = '{"error":{"code":429}}';
const BODY_400_BAD_KEY = JSON.stringify({
  error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] },
});
const BODY_400_PLAIN = '{"error":{"code":400,"message":"Invalid JSON payload","status":"INVALID_ARGUMENT"}}';
const BODY_403 = '{"error":{"code":403,"message":"Method doesn\'t allow unregistered callers","status":"PERMISSION_DENIED"}}';
const BODY_500 = '{"error":{"code":500,"message":"Internal error","status":"INTERNAL"}}';
const BODY_503 = '{"error":{"code":503,"message":"The model is overloaded. Please try again later.","status":"UNAVAILABLE"}}';

/* ── Harness ─────────────────────────────────────────────────────────────── */

const ENV = { AI_ALERT_TO: 'owner@example.com' };
const flush = () => new Promise((r) => setImmediate(r));

function makeAlert(over = {}) {
  let t = Date.UTC(2026, 10, 22, 0, 0, 0);
  const sent = [];
  const lines = [];
  const alert = createAiBillingAlert({
    env: over.env || ENV,
    send: over.send || (async (mail) => { sent.push(mail); return { ok: true }; }),
    canSend: over.canSend || (() => true),
    now: () => t,
    log: (l) => lines.push(l),
    ...(over.sendWhatsApp ? { sendWhatsApp: over.sendWhatsApp } : {}),
    ...(over.fetchImpl ? { fetchImpl: over.fetchImpl } : {}),
    ...(over.dispatchTimeoutMs ? { dispatchTimeoutMs: over.dispatchTimeoutMs } : {}),
    ...(over.log ? { log: over.log } : {}),
  });
  return { alert, sent, lines, advance: (ms) => { t += ms; }, at: () => t };
}

const GEMINI_CFG = {
  GEMINI_API_KEY: 'test-key',
  HAS_REPLIT_PROXY: false,
  REPLIT_GEMINI_BASE_URL: '',
  REPLIT_GEMINI_API_KEY: '',
  DIRECT_GEMINI_API_KEY: 'test-key',
  GEMINI_TUTOR_MODEL: 'test-model',
  GEMINI_TIMEOUT_MS: 10000,
};
const CONTENTS = [{ role: 'user', parts: [{ text: 'hi' }] }];
const silentSink = { increment: () => {} };
const noLedger = { recordUsage: () => null };

function resp(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERR',
    // Retry-After 0: the gateway's 429 back-off sleeps 0 ms, so the test stays fast.
    headers: { get: (h) => (h === 'Retry-After' ? '0' : null) },
    text: async () => body,
  };
}
const OK_BODY = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'answer' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 } });

async function withFetch(fn, impl) {
  const original = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = original; }
}
function client(alert) {
  return createGeminiClient({ ...GEMINI_CFG, telemetry: silentSink, usageLedger: noLedger, billingAlert: alert });
}
async function outcome(p) {
  try { const r = await p; return { ok: true, text: r.text }; } catch (e) { return { ok: false, status: e.status, message: e.message }; }
}

/* ── Classification ──────────────────────────────────────────────────────── */

test('classify: the key / billing shapes that alert', () => {
  assert.equal(classifyGeminiFailure(402, BODY_402_PREPAY), 'billing');
  assert.equal(classifyGeminiFailure(402, ''), 'billing', '402 alerts whatever the body');
  assert.equal(classifyGeminiFailure(429, BODY_429_PREPAY), 'billing');
  assert.equal(classifyGeminiFailure(429, BODY_429_PER_DAY), 'billing');
  assert.equal(classifyGeminiFailure(429, '{"error":{"message":"Your project has exceeded its spend cap"}}'), 'billing');
  assert.equal(classifyGeminiFailure(429, '{"error":{"status":"BILLING_DISABLED"}}'), 'billing');
  assert.equal(classifyGeminiFailure(401, ''), 'key');
  assert.equal(classifyGeminiFailure(403, BODY_403), 'key');
  assert.equal(classifyGeminiFailure(400, BODY_400_BAD_KEY), 'key');
});

test('classify: the shapes that do NOT alert (ordinary rate limits, server errors, ordinary 4xx, success)', () => {
  assert.equal(classifyGeminiFailure(429, BODY_429_PER_MINUTE), null, 'a per-minute limit says "billing details" too — not billing');
  assert.equal(classifyGeminiFailure(429, BODY_429_BARE), null);
  assert.equal(classifyGeminiFailure(429, ''), null);
  assert.equal(classifyGeminiFailure(400, BODY_400_PLAIN), null);
  assert.equal(classifyGeminiFailure(500, BODY_500), null);
  assert.equal(classifyGeminiFailure(503, BODY_503), null);
  assert.equal(classifyGeminiFailure(504, ''), null);
  assert.equal(classifyGeminiFailure(200, OK_BODY), null);
});

test('snippet is the error status + message only, trimmed; recipient is masked', () => {
  const s = snippetOf(BODY_402_PREPAY);
  assert.match(s, /^RESOURCE_EXHAUSTED: Your prepayment credits are depleted/);
  assert.ok(s.length <= 203);
  assert.equal(snippetOf('x?key=SECRET123&y'), 'x?key=***&y');
  assert.equal(maskRecipient('owner@example.com'), 'o***@example.com');
});

/* ── Throttle and recovery ───────────────────────────────────────────────── */

test('402 -> one email; 20 more 402s inside 30 min -> still one; the email waits 2 h (N1) before a second', async () => {
  const { alert, sent, lines, advance } = makeAlert();
  alert.note(402, snippetOf(BODY_402_PREPAY), 'billing');
  await flush();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'owner@example.com');
  assert.equal(sent[0].subject, 'LazyTopper: AI is failing (Gemini 402 — billing)');
  assert.match(sent[0].text, /Status: 402/);
  assert.match(sent[0].text, /First seen: .*IST/);
  assert.match(sent[0].text, /Failed AI calls since the last alert: 1 /);
  assert.match(sent[0].text, /If billing is fine, check the API key\./);
  assert.match(sent[0].text, /Check AI Studio billing: https:\/\/aistudio\.google\.com\/billing/);
  assert.doesNotMatch(sent[0].text, /test-key/);
  for (let i = 0; i < 20; i++) { advance(60 * 1000); alert.note(402, '', 'billing'); }
  await flush();
  assert.equal(sent.length, 1, 'throttled inside 30 minutes');
  assert.equal(lines.filter((l) => /^\[ai-billing\] FAILURE status=402 count=\d+$/.test(l)).length, 21, 'one log line per event');
  advance(ALERT_EVERY_MS); // 50 min after the first email: still inside the email's 2 h gap
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(sent.length, 1, 'no second email inside 2 hours');
  advance(EMAIL_GAP_MS);
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(sent.length, 2, 'a second email once 2 hours have passed');
  assert.match(sent[1].text, /Failed AI calls since the last alert: 22 \(since first seen: 23\)/);
});

test('success after an alert -> ONE recovered email; further successes send nothing', async () => {
  const { alert, sent, advance } = makeAlert();
  alert.note(402, '', 'billing');
  await flush();
  advance(5 * 60 * 1000);
  alert.noteOk();
  await flush();
  assert.equal(sent.length, 2);
  assert.equal(sent[1].subject, 'LazyTopper: AI recovered');
  assert.match(sent[1].text, /^AI recovered at .*IST\./);
  alert.noteOk();
  alert.noteOk();
  await flush();
  assert.equal(sent.length, 2);
});

test('success with no alert outstanding sends nothing', async () => {
  const { alert, sent } = makeAlert();
  alert.noteOk();
  await flush();
  assert.equal(sent.length, 0);
});

test('kill switch AI_BILLING_ALERT_DISABLED=1 -> log only, no email (failure or recovery)', async () => {
  const { alert, sent, lines } = makeAlert({ env: { ...ENV, AI_BILLING_ALERT_DISABLED: '1' } });
  alert.note(402, '', 'billing');
  alert.noteOk();
  await flush();
  assert.equal(sent.length, 0);
  assert.ok(lines.some((l) => /FAILURE status=402/.test(l)));
  assert.match(alert.describe(), /^\[ai-billing\] alert OFF \(AI_BILLING_ALERT_DISABLED=1\)/);
});

test('no recipient / email rails not ready -> log only, and the boot line says why; OPS_REPORT_TO is the fallback', async () => {
  const none = makeAlert({ env: {} });
  none.alert.note(402, '', 'billing');
  await flush();
  assert.equal(none.sent.length, 0);
  assert.match(none.alert.describe(), /alert OFF \(no recipient/);
  const rails = makeAlert({ canSend: () => false });
  rails.alert.note(402, '', 'billing');
  await flush();
  assert.equal(rails.sent.length, 0);
  assert.match(rails.alert.describe(), /alert OFF \(email not configured/);
  const ops = makeAlert({ env: { OPS_REPORT_TO: 'ops@example.com' } });
  assert.equal(ops.alert.describe(), '[ai-billing] alert ON to o***@example.com | WhatsApp OFF (missing OWNER_ALERT_WHATSAPP + CALLMEBOT_APIKEY)');
  ops.alert.note(401, '', 'key');
  await flush();
  assert.equal(ops.sent[0].to, 'ops@example.com');
  assert.equal(ops.sent[0].subject, 'LazyTopper: AI is failing (Gemini 401 — key)');
});

test('a failed send is retried after 5 minutes, not on every request', async () => {
  let calls = 0;
  const { alert, advance } = makeAlert({ send: async () => { calls += 1; return { ok: false }; } });
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(calls, 1);
  advance(60 * 1000);
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(calls, 1, 'no retry inside 5 minutes');
  advance(5 * 60 * 1000);
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(calls, 2);
});

/* ── Through the real gateway ────────────────────────────────────────────── */

test('gateway: a 402 from Gemini reaches the alert once and emails; a 200 five quiet minutes later sends the recovered email', async () => {
  const { alert, sent, advance } = makeAlert();
  const c = client(alert);
  const r = await withFetch(() => outcome(c.callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(402, BODY_402_PREPAY));
  assert.equal(r.ok, false);
  assert.equal(r.status, 402);
  await flush();
  assert.equal(sent.length, 1);
  assert.match(sent[0].text, /Gemini said: RESOURCE_EXHAUSTED: Your prepayment credits are depleted/);
  advance(RECOVERY_QUIET_MS);
  const ok = await withFetch(() => outcome(c.callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(200, OK_BODY));
  assert.deepEqual(ok, { ok: true, text: 'answer' });
  await flush();
  assert.equal(sent.length, 2);
  assert.equal(sent[1].subject, 'LazyTopper: AI recovered');
});

test('gateway: 200s, an ordinary per-minute 429, a bare 429 and a 500 send NO email', async () => {
  const { alert, sent, lines } = makeAlert();
  const c = client(alert);
  for (const [status, body] of [[200, OK_BODY], [429, BODY_429_PER_MINUTE], [429, BODY_429_BARE], [500, BODY_500], [503, BODY_503], [400, BODY_400_PLAIN]]) {
    await withFetch(() => outcome(c.callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(status, body));
  }
  await flush();
  assert.equal(sent.length, 0);
  assert.equal(lines.filter((l) => /FAILURE/.test(l)).length, 0);
});

test('gateway: a billing 429 (old prepay shape) alerts', async () => {
  const { alert, sent } = makeAlert();
  const c = client(alert);
  const r = await withFetch(() => outcome(c.callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(429, BODY_429_PREPAY));
  assert.equal(r.status, 429);
  await flush();
  assert.equal(sent.length, 1);
});

test('gateway: an email send that THROWS (sync or async) or NEVER settles leaves the call result unchanged', async () => {
  const baseline402 = await withFetch(() => outcome(client(null).callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(402, BODY_402_PREPAY));
  const senders = [
    () => { throw new Error('resend down (sync)'); },
    async () => { throw new Error('resend down (async)'); },
    () => new Promise(() => {}), // hangs forever: must not be awaited by the call
  ];
  for (const send of senders) {
    const { alert } = makeAlert({ send });
    const c = client(alert);
    const r402 = await withFetch(() => outcome(c.callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(402, BODY_402_PREPAY));
    assert.deepEqual(r402, baseline402, 'the failing call fails exactly as it would with no alert');
    const r200 = await withFetch(() => outcome(c.callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(200, OK_BODY));
    assert.deepEqual(r200, { ok: true, text: 'answer' }, 'the next good call is unchanged');
  }
  // An alert object whose methods themselves throw cannot break a call either.
  const broken = { note: () => { throw new Error('boom'); }, noteOk: () => { throw new Error('boom'); } };
  const rb = await withFetch(() => outcome(client(broken).callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(402, BODY_402_PREPAY));
  assert.deepEqual(rb, baseline402);
  const rg = await withFetch(() => outcome(client(broken).callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(200, OK_BODY));
  assert.deepEqual(rg, { ok: true, text: 'answer' });
});

/* ── WhatsApp channel (owner scope addition, 22 Nov 09:09) ───────────────── */

// A FAKE number and key: the real number is never written in source or tests.
const WA_ENV = { ...ENV, OWNER_ALERT_WHATSAPP: '+10000005678', CALLMEBOT_APIKEY: 'fake-key-1' };

function waRecorder(result = { ok: true }) {
  const texts = [];
  const fn = async (text) => { texts.push(text); return typeof result === 'function' ? result() : result; };
  return { texts, fn };
}

test('whatsapp: the CallMeBot URL is built with every value URL-encoded', () => {
  const url = buildCallMeBotUrl({ phone: '10000005678', text: 'LazyTopper ALERT: AI failing since 22 Nov 2026, 05:10 IST (Gemini 402, 3 errors). Check & fix?', apiKey: 'k&y=1' });
  const u = new URL(url);
  assert.equal(`${u.origin}${u.pathname}`, 'https://api.callmebot.com/whatsapp.php');
  assert.equal(u.searchParams.get('phone'), '10000005678');
  assert.equal(u.searchParams.get('text'), 'LazyTopper ALERT: AI failing since 22 Nov 2026, 05:10 IST (Gemini 402, 3 errors). Check & fix?');
  assert.equal(u.searchParams.get('apikey'), 'k&y=1');
  assert.doesNotMatch(url, / /, 'no raw spaces');
  assert.match(url, /text=LazyTopper%20ALERT%3A/);
  assert.match(url, /%26%20fix%3F/);
});

test('whatsapp: the default CallMeBot sender does ONE GET with a 10 s timeout signal and reads res.ok', async () => {
  const calls = [];
  const sender = createCallMeBotSender({ env: WA_ENV, fetchImpl: async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 200 }; } });
  assert.deepEqual(await sender('hello world'), { ok: true, code: 'http_200' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts.method, 'GET');
  assert.ok(calls[0].opts.signal, 'a timeout signal is attached');
  assert.equal(WHATSAPP_TIMEOUT_MS, 10000);
  assert.equal(new URL(calls[0].url).searchParams.get('phone'), '10000005678', 'a leading + is dropped');
  assert.equal(new URL(calls[0].url).searchParams.get('text'), 'hello world');
  const failing = createCallMeBotSender({ env: WA_ENV, fetchImpl: async () => { throw new Error('down'); } });
  assert.deepEqual(await failing('x'), { ok: false, code: 'network' }, 'never rejects');
});

test('whatsapp: sent WITH the email on a failure, and ONE recovered message with the recovered email', async () => {
  const wa = waRecorder();
  const fetched = [];
  const { alert, sent, advance } = makeAlert({ env: WA_ENV, sendWhatsApp: wa.fn, fetchImpl: async (u) => { fetched.push(u); return { ok: true, status: 200 }; } });
  alert.note(402, '', 'billing');
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(sent.length, 1);
  assert.equal(wa.texts.length, 1);
  assert.match(wa.texts[0], /^LazyTopper ALERT: AI failing since .+ IST \(Gemini 402, 1 errors\)\. Check AI Studio billing or the API key\.$/);
  assert.doesNotMatch(wa.texts[0], /fake-key-1|10000005678/, 'no secret or number in the text');
  advance(RECOVERY_QUIET_MS);
  alert.noteOk();
  await flush();
  assert.equal(sent.length, 2);
  assert.equal(wa.texts.length, 2);
  assert.match(wa.texts[1], /^LazyTopper: AI recovered at .+ IST\.$/);
  assert.equal(fetched.length, 0, 'an injected sender replaces the CallMeBot backend entirely (the seam)');
});

test('whatsapp: 30-min cadence beside the email\'s 2 h — 20 more failures inside 30 min send nothing more on EITHER channel; after 30 min only WhatsApp sends; after 2 h both', async () => {
  const wa = waRecorder();
  const { alert, sent, advance } = makeAlert({ env: WA_ENV, sendWhatsApp: wa.fn });
  alert.note(402, '', 'billing');
  await flush();
  for (let i = 0; i < 20; i++) { advance(60 * 1000); alert.note(402, '', 'billing'); }
  await flush();
  assert.equal(sent.length, 1);
  assert.equal(wa.texts.length, 1);
  advance(ALERT_EVERY_MS);
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(sent.length, 1, 'email still inside its 2 h gap');
  assert.equal(wa.texts.length, 2, 'WhatsApp on its 30-min cadence');
  assert.match(wa.texts[1], /\(Gemini 402, 22 errors\)/);
  advance(EMAIL_GAP_MS);
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(sent.length, 2);
  assert.equal(wa.texts.length, 3);
});

test('whatsapp: a failing, throwing or hanging WhatsApp send never stops the email — and a failing email never stops WhatsApp', async () => {
  for (const bad of [async () => ({ ok: false }), () => { throw new Error('wa down'); }, () => new Promise(() => {})]) {
    const { alert, sent, advance } = makeAlert({ env: WA_ENV, sendWhatsApp: bad });
    alert.note(402, '', 'billing');
    await flush();
    assert.equal(sent.length, 1, 'email still sent');
    advance(5 * 60 * 1000);
    alert.noteOk();
    await flush();
    assert.equal(sent.length, 2, 'recovered email still sent');
    assert.equal(sent[1].subject, 'LazyTopper: AI recovered');
  }
  const wa = waRecorder();
  const { alert } = makeAlert({ env: WA_ENV, sendWhatsApp: wa.fn, send: () => { throw new Error('resend down'); } });
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(wa.texts.length, 1, 'WhatsApp still sent when the email throws');
});

test('whatsapp: missing number or key -> off (email unaffected) and the boot line says so; the number is masked to its last 4 digits', async () => {
  const fetched = [];
  const fetchImpl = async (u) => { fetched.push(u); return { ok: true, status: 200 }; };
  for (const env of [{ ...ENV, CALLMEBOT_APIKEY: 'k' }, { ...ENV, OWNER_ALERT_WHATSAPP: '10000005678' }]) {
    const { alert, sent } = makeAlert({ env, fetchImpl });
    alert.note(402, '', 'billing');
    await flush();
    assert.equal(sent.length, 1);
    assert.match(alert.describe(), /WhatsApp OFF \(missing (OWNER_ALERT_WHATSAPP|CALLMEBOT_APIKEY)\)/);
  }
  assert.equal(fetched.length, 0, 'no CallMeBot call without both settings');
  const on = makeAlert({ env: WA_ENV, fetchImpl });
  assert.equal(on.alert.describe(), '[ai-billing] alert ON to o***@example.com | WhatsApp ON to ***5678');
  assert.doesNotMatch(on.alert.describe(), /10000005678|fake-key-1/);
  on.alert.note(402, '', 'billing');
  await flush();
  assert.equal(fetched.length, 1, 'with both set, the CallMeBot backend is called');
  assert.equal(new URL(fetched[0]).searchParams.get('apikey'), 'fake-key-1');
  assert.equal(maskPhone('10000005678'), '***5678');
});

test('whatsapp: AI_ALERT_WHATSAPP_DISABLED=1 turns off WhatsApp only; AI_BILLING_ALERT_DISABLED=1 turns off both', async () => {
  const wa1 = waRecorder();
  const a = makeAlert({ env: { ...WA_ENV, AI_ALERT_WHATSAPP_DISABLED: '1' }, sendWhatsApp: wa1.fn });
  a.alert.note(402, '', 'billing');
  await flush();
  assert.equal(wa1.texts.length, 0);
  assert.equal(a.sent.length, 1);
  assert.match(a.alert.describe(), /WhatsApp OFF \(AI_ALERT_WHATSAPP_DISABLED=1\)/);
  const wa2 = waRecorder();
  const b = makeAlert({ env: { ...WA_ENV, AI_BILLING_ALERT_DISABLED: '1' }, sendWhatsApp: wa2.fn });
  b.alert.note(402, '', 'billing');
  await flush();
  assert.equal(wa2.texts.length, 0);
  assert.equal(b.sent.length, 0);
});

test('gateway: with WhatsApp on and its sender throwing, the grading call result is unchanged', async () => {
  const baseline = await withFetch(() => outcome(client(null).callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(402, BODY_402_PREPAY));
  const { alert } = makeAlert({ env: WA_ENV, sendWhatsApp: () => { throw new Error('wa down'); } });
  const r = await withFetch(() => outcome(client(alert).callGemini('gemini-2.5-flash', CONTENTS, {})), async () => resp(402, BODY_402_PREPAY));
  assert.deepEqual(r, baseline);
});

/* ── Review fixes (PR #1810 review N1-N9) ────────────────────────────────── */

test('N1: the email is capped at 6 per IST day — recovered emails count — and the cap resets on the next IST day; WhatsApp is not capped', async () => {
  const wa = waRecorder();
  const { alert, sent, advance, at } = makeAlert({ env: WA_ENV, sendWhatsApp: wa.fn });
  // Start at 00:30 IST (19:00Z the previous UTC day) so the whole run fits one IST day.
  advance(Date.UTC(2026, 10, 22, 19, 0, 0) - at());
  for (let i = 0; i < 5; i++) {
    alert.note(402, '', 'billing'); // alert email
    advance(RECOVERY_QUIET_MS);
    alert.noteOk(); // recovered email
    await flush();
    advance(EMAIL_GAP_MS);
  }
  assert.equal(sent.length, EMAIL_DAILY_MAX, 'exactly 6 emails that IST day (3 alerts + 3 recovered)');
  assert.equal(EMAIL_DAILY_MAX, 6);
  assert.ok(wa.texts.length > EMAIL_DAILY_MAX, 'WhatsApp keeps its own cadence');
  // The next IST day the email may alert again.
  advance(Date.UTC(2026, 10, 23, 19, 0, 0) - at());
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(sent.length, EMAIL_DAILY_MAX + 1);
});

test('N1: the recovered email also starts the 2 h email gap (flapping cannot spend the quota)', async () => {
  const { alert, sent, advance } = makeAlert();
  alert.note(402, '', 'billing');
  await flush();
  advance(RECOVERY_QUIET_MS);
  alert.noteOk();
  await flush();
  assert.equal(sent.length, 2);
  advance(60 * 1000);
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(sent.length, 2, 'a new outage right after a recovery waits out the email gap');
});

test('N2: one model failing while others succeed does NOT flap — recovered only after 5 quiet minutes', async () => {
  const wa = waRecorder();
  const { alert, sent, advance } = makeAlert({ env: WA_ENV, sendWhatsApp: wa.fn });
  alert.note(402, '', 'billing');
  await flush();
  for (let i = 0; i < 30; i++) {
    advance(60 * 1000);
    alert.noteOk(); // another model succeeds
    alert.note(402, '', 'billing'); // the failing model keeps failing
  }
  await flush();
  assert.equal(sent.filter((m) => /recovered/.test(m.subject)).length, 0, 'no recovered email while failures continue');
  assert.equal(wa.texts.filter((t) => /recovered/.test(t)).length, 0, 'no recovered WhatsApp while failures continue');
  advance(RECOVERY_QUIET_MS - 1);
  alert.noteOk();
  await flush();
  assert.equal(sent.filter((m) => /recovered/.test(m.subject)).length, 0, 'not yet: under 5 quiet minutes');
  advance(1);
  alert.noteOk();
  await flush();
  assert.equal(sent.filter((m) => /recovered/.test(m.subject)).length, 1);
  assert.equal(wa.texts.filter((t) => /recovered/.test(t)).length, 1);
});

test('N3: a THROWING log can never cause an unhandled rejection (failure, sent, not-sent and recovered paths)', async () => {
  const rejections = [];
  const onRej = (r) => rejections.push(r);
  process.on('unhandledRejection', onRej);
  try {
    const throwingLog = () => { throw new Error('log down'); };
    const ok = makeAlert({ log: throwingLog });
    ok.alert.note(402, '', 'billing');
    await flush();
    ok.advance(RECOVERY_QUIET_MS);
    ok.alert.noteOk();
    const bad = makeAlert({ log: throwingLog, send: async () => ({ ok: false }) });
    bad.alert.note(402, '', 'billing');
    await flush(); await flush(); await flush();
    assert.equal(ok.sent.length, 2, 'both emails still went out');
  } finally {
    process.off('unhandledRejection', onRej);
  }
  assert.deepEqual(rejections, []);
});

test('N5: the process-wide instance is UNARMED until configure() — env vars alone never page the owner', async () => {
  const sentHere = [];
  const waHere = [];
  // A fresh unarmed instance with every setting present except the arming call.
  const a = createAiBillingAlert({ armed: false, env: WA_ENV, send: async (m) => { sentHere.push(m); return { ok: true }; }, canSend: () => true, sendWhatsApp: async (t) => { waHere.push(t); return { ok: true }; }, log: () => {} });
  a.note(402, '', 'billing');
  await flush();
  assert.equal(sentHere.length + waHere.length, 0, 'unarmed: log only');
  assert.match(a.describe(), /alert OFF \(not armed .*WhatsApp OFF \(not armed/);
  a.configure({}); // what index.cjs does at boot
  a.note(402, '', 'billing');
  await flush();
  assert.equal(sentHere.length, 1);
  assert.equal(waHere.length, 1);
  // The module's default instance starts unarmed.
  assert.equal(aiBillingAlertModule.defaultAlert.state().armed, false);
  assert.match(aiBillingAlertModule.describe(), /not armed/);
});

test('N6: one failing call is counted ONCE however many 429 retries it made', async () => {
  const { alert, lines, sent } = makeAlert();
  const c = client(alert);
  let hits = 0;
  await withFetch(() => outcome(c.callGemini('gemini-2.5-flash', CONTENTS, {})), async () => { hits += 1; return resp(429, BODY_429_PREPAY); });
  await flush();
  assert.ok(hits > 1, 'the gateway did retry');
  assert.equal(lines.filter((l) => /FAILURE/.test(l)).length, 1, 'one failed call, one event');
  assert.match(sent[0].text, /Failed AI calls since the last alert: 1 \(since first seen: 1\)/);
});

test('N9: a sender that never settles times out, frees its channel, and is retried after 5 minutes', async () => {
  let calls = 0;
  const { alert, advance } = makeAlert({ send: () => { calls += 1; return new Promise(() => {}); }, dispatchTimeoutMs: 20 });
  alert.note(402, '', 'billing');
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(alert.state().email.sending, false, 'the hung send no longer blocks the channel');
  advance(5 * 60 * 1000);
  alert.note(402, '', 'billing');
  await flush();
  assert.equal(calls, 2);
});

/* ── N4: the streaming path ──────────────────────────────────────────────── */

function sseResp(chunks) {
  const enc = new TextEncoder();
  const body = new ReadableStream({ start(c) { for (const ch of chunks) c.enqueue(enc.encode(ch)); c.close(); } });
  return { ok: true, status: 200, statusText: 'OK', headers: { get: () => null }, text: async () => '', body };
}
async function drainStream(gen) {
  const out = [];
  try { for await (const piece of gen) out.push(piece); return { ok: true, text: out.join('') }; } catch (e) { return { ok: false, status: e.status }; }
}

test('N4: stream 402 -> alert; stream 200 five quiet minutes later -> the recovered email; ordinary stream 429 -> nothing', async () => {
  const { alert, sent, advance } = makeAlert();
  const c = client(alert);
  const r = await withFetch(() => drainStream(c.callGeminiStream('gemini-2.5-flash', CONTENTS, {})), async () => resp(402, BODY_402_PREPAY));
  assert.deepEqual(r, { ok: false, status: 402 });
  await flush();
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /Gemini 402/);
  advance(RECOVERY_QUIET_MS);
  const chunk = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'streamed' }] } }] })}\n\n`;
  const ok = await withFetch(() => drainStream(c.callGeminiStream('gemini-2.5-flash', CONTENTS, {})), async () => sseResp([chunk]));
  assert.deepEqual(ok, { ok: true, text: 'streamed' });
  await flush();
  assert.equal(sent.length, 2);
  assert.equal(sent[1].subject, 'LazyTopper: AI recovered');
  const quiet = makeAlert();
  const c2 = client(quiet.alert);
  await withFetch(() => drainStream(c2.callGeminiStream('gemini-2.5-flash', CONTENTS, {})), async () => resp(429, BODY_429_PER_MINUTE));
  await flush();
  assert.equal(quiet.sent.length, 0);
});
