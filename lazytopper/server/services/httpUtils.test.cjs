/**
 * httpUtils.test.cjs — the error-detail redaction at the JSON sink.
 *
 * CodeQL `js/stack-trace-exposure` traced a caught error's own text from
 * `index.cjs` into `JSON.stringify(body)` here. The guard added to `sendJson`
 * neutralises that WITHOUT changing the response contract `aiClient.ts` parses,
 * and both halves of that sentence are asserted below — the leak is gone AND
 * the contract survives. An "absent" assertion on its own would pass just as
 * happily against a `sendJson` that sent `{}`, so every one of them is paired
 * with a control that renders the thing it claims is gone.
 */
const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
  createHttpUtils,
  redactErrorDetails,
  REDACTED_DETAIL,
} = require('./httpUtils.cjs');

/** A stand-in for ServerResponse that records exactly what went on the wire. */
function fakeRes() {
  const rec = { status: 0, headers: null, raw: '' };
  return {
    rec,
    writeHead(status, headers) { rec.status = status; rec.headers = headers; },
    end(raw) { rec.raw = raw; },
  };
}

function send(status, body) {
  const res = fakeRes();
  createHttpUtils('*').sendJson(res, status, body);
  return { raw: res.rec.raw, json: JSON.parse(res.rec.raw), status: res.rec.status };
}

/* ── 1 · THE LEAK IS GONE ────────────────────────────────────────────────── */

// The EXACT body CodeQL flagged: index.cjs's 500 handler, whose `details` is
// `err?.message || String(err)`.
test('a 500 carrying an error message does not ship the path or the module', () => {
  const err = new Error(
    "Cannot find module '/app/lazytopper/server/node_modules/firebase-admin/lib/index.js'",
  );
  const { raw, json } = send(500, {
    ok: false,
    error: 'Failed to resolve CBSE exam date',
    details: err.message,
  });

  assert.equal(json.details, REDACTED_DETAIL);
  assert.ok(!raw.includes('/app/lazytopper'), 'no absolute path on the wire');
  assert.ok(!raw.includes('node_modules'), 'no dependency layout on the wire');
  assert.ok(!raw.includes('firebase-admin'), 'no dependency NAME on the wire');
});

test('a real stack trace is stripped even under a key nobody listed', () => {
  let real;
  try { throw new Error('boom'); } catch (e) { real = e.stack; }
  assert.ok(/\n\s+at\s/.test(real), 'CONTROL: the fixture really is a stack');

  // `note` is NOT in DIAGNOSTIC_KEYS — this is the belt, not the braces.
  const { raw, json } = send(500, { error: 'Unhandled server error', note: real });
  assert.ok(!/\n\s+at\s/.test(raw), 'no V8 frame survives');
  assert.ok(!raw.includes('httpUtils.test.cjs'), 'no filename survives');
  assert.equal(json.note, 'Error: boom', 'the message survives; only frames go');
});

test('nesting does not smuggle a leak through', () => {
  const { raw } = send(500, { ok: false, error: 'x', meta: { inner: { details: '/app/secret.cjs' } } });
  assert.ok(!raw.includes('/app/secret.cjs'));
});

/* ── 2 · ★★ THE CONTRACT SURVIVES — this is what protects the paywall ────── */

// GATE-1's 402. `aiClient.ts` branches on `error` and RENDERS `message`; if
// either is dropped or rewritten, a fifteen-year-old is shown the string
// "premium_required" instead of the copy the owner live-verified.
test('a 402 still carries error:"premium_required" and its student-facing message', () => {
  const { json, status } = send(402, {
    error: 'premium_required',
    message: 'Check & Improve is part of LazyTopper Premium.',
    feature: 'check_improve',
    tier: 'free',
    trialEndedAt: '2026-07-30T00:00:00.000Z',
  });

  assert.equal(status, 402);
  assert.equal(json.error, 'premium_required');
  assert.equal(json.message, 'Check & Improve is part of LazyTopper Premium.');
  // The other three keys aiClient reads are equally load-bearing.
  assert.equal(json.feature, 'check_improve');
  assert.equal(json.tier, 'free');
  assert.equal(json.trialEndedAt, '2026-07-30T00:00:00.000Z');
});

test('the other error shapes aiClient parses are untouched', () => {
  const { json } = send(429, { error: 'daily_limit', class: 'tutor', resetAt: 'tomorrow' });
  assert.deepEqual(json, { error: 'daily_limit', class: 'tutor', resetAt: 'tomorrow' });
});

test('a success body is returned byte-identical', () => {
  const body = { ok: true, items: [{ id: 'q1', marks: 3 }], cursor: 0, completed: false };
  assert.equal(send(200, body).raw, JSON.stringify(body));
});

/* ── 3 · THE HELPER ITSELF ───────────────────────────────────────────────── */

test('redactErrorDetails preserves arrays, nulls and non-strings', () => {
  assert.deepEqual(
    redactErrorDetails({ a: [1, 'two', null], b: null, c: false, d: 0 }),
    { a: [1, 'two', null], b: null, c: false, d: 0 },
  );
});

test('stripping is not stateful across calls', () => {
  // A /g regex used with .test() alternates true/false across calls. Two
  // identical inputs in a row must give two identical outputs.
  const withFrame = 'Error: x\n    at foo (/app/a.cjs:1:1)';
  assert.equal(send(500, { m: withFrame }).json.m, send(500, { m: withFrame }).json.m);
  assert.equal(send(500, { m: withFrame }).json.m, 'Error: x');
});
