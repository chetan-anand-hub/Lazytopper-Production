/**
 * tutor.image.test.cjs - TUTOR-IMAGE-1: a photo on the latest student turn reaches the model; nothing else does.
 * Run: `node --test server/routes/tutor.image.test.cjs`
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTutorRoute, coalesceTurns, IMAGE_HISTORY_PLACEHOLDER } = require('./tutor.cjs');

// A real (tiny) PNG so the validator's base64 round-trip check passes.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64').toString('base64');

function harness() {
  const calls = [];
  const counters = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    callGemini: async (model, contents) => { calls.push({ model, contents }); return { text: 'It is 12.', finishReason: 'STOP' }; },
    GEMINI_TUTOR_MODEL: 'm',
    GEMINI_MODEL: 'm',
    ACTIVE_PROVIDER: 'gemini',
    isStubMode: () => false,
    telemetry: { increment: (k) => counters.push(k) },
  });
  async function ask(messages) {
    const res = {};
    await route.handleTutorRequest({ body: { subject: 'maths', topicKey: 'real-numbers', topicLabel: 'Real Numbers', messages } }, res);
    return res;
  }
  return { calls, counters, ask };
}
const imgParts = (contents) => contents.flatMap((c) => c.parts).filter((p) => p.inline_data);

test('an image on the LATEST turn is sent once as an inline part, with the reading note', async () => {
  const h = harness();
  const res = await h.ask([{ role: 'user', content: 'Solve this', image: { imageBase64: PNG, imageMimeType: 'image/png' } }]);
  assert.equal(res.status, 200);
  assert.equal(h.calls.length, 1, 'one model call = one tutor message');
  const parts = imgParts(h.calls[0].contents);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].inline_data.mime_type, 'image/png');
  assert.equal(parts[0].inline_data.data, PNG);
  const last = h.calls[0].contents[h.calls[0].contents.length - 1];
  assert.equal(last.role, 'user');
  assert.match(last.parts[0].text, /attached a photo/);
  assert.match(last.parts[0].text, /several questions, ask which one/);
  assert.match(last.parts[0].text, /unreadable/);
  assert.match(last.parts[0].text, /Never invent/);
  assert.deepEqual(h.counters.filter((c) => c === 'tutor.image_turn'), ['tutor.image_turn']);
});

test('an EARLIER turn with an image is never resent: text placeholder only', async () => {
  const h = harness();
  const res = await h.ask([
    { role: 'user', content: 'Check this', hasImage: true, image: { imageBase64: PNG, imageMimeType: 'image/png' } },
    { role: 'tutor', content: 'That is question 3.' },
    { role: 'user', content: 'Explain step 2' },
  ]);
  assert.equal(res.status, 200);
  assert.equal(imgParts(h.calls[0].contents).length, 0);
  const all = h.calls[0].contents.map((c) => c.parts.map((p) => p.text).join('')).join('\n');
  assert.ok(all.includes(IMAGE_HISTORY_PLACEHOLDER));
  assert.ok(!all.includes(PNG));
  assert.doesNotMatch(all, /attached a photo to this message/);
});

test('a persisted hasImage flag (no bytes) on an earlier turn still gives the placeholder', async () => {
  const h = harness();
  await h.ask([
    { role: 'user', content: 'Check this', hasImage: true },
    { role: 'tutor', content: 'ok' },
    { role: 'user', content: 'and now?' },
  ]);
  const all = h.calls[0].contents.map((c) => c.parts.map((p) => p.text).join('')).join('\n');
  assert.ok(all.includes(IMAGE_HISTORY_PLACEHOLDER));
});

test('rejects: wrong type, PDF, too big, malformed - 400 with a message, no model call', async () => {
  const cases = [
    { imageBase64: PNG, imageMimeType: 'image/gif' },
    { imageBase64: PNG, imageMimeType: 'application/pdf' },
    { imageBase64: Buffer.alloc(3 * 1024 * 1024 + 10, 1).toString('base64'), imageMimeType: 'image/jpeg' },
    { imageBase64: 'not base64!!', imageMimeType: 'image/png' },
    { imageBase64: '', imageMimeType: 'image/png' },
  ];
  for (const image of cases) {
    const h = harness();
    const res = await h.ask([{ role: 'user', content: 'x', image }]);
    assert.equal(res.status, 400, JSON.stringify(image).slice(0, 60));
    assert.equal(res.body.error, 'invalid_image');
    assert.ok(res.body.message);
    assert.equal(h.calls.length, 0);
  }
});

test('kill switch TUTOR_IMAGE_DISABLED=1: friendly 400, no model call; text-only turns still work', async () => {
  process.env.TUTOR_IMAGE_DISABLED = '1';
  try {
    const h = harness();
    const res = await h.ask([{ role: 'user', content: 'x', image: { imageBase64: PNG, imageMimeType: 'image/png' } }]);
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'tutor_image_disabled');
    assert.match(res.body.message, /type your question/);
    assert.equal(h.calls.length, 0);
    const ok = await h.ask([{ role: 'user', content: 'plain question' }]);
    assert.equal(ok.status, 200);
  } finally {
    delete process.env.TUTOR_IMAGE_DISABLED;
  }
});

test('a text-only turn is unchanged: no image part, no note', async () => {
  const h = harness();
  await h.ask([{ role: 'user', content: 'What is HCF?' }]);
  assert.equal(imgParts(h.calls[0].contents).length, 0);
  const all = h.calls[0].contents.map((c) => c.parts.map((p) => p.text).join('')).join('\n');
  assert.doesNotMatch(all, /attached a photo/);
});

test('coalesceTurns keeps an inline part with its turn', () => {
  const out = coalesceTurns([
    { role: 'user', parts: [{ text: 'a' }] },
    { role: 'user', parts: [{ text: 'b' }, { inline_data: { mime_type: 'image/png', data: 'x' } }] },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].parts[0].text, 'a\n\nb');
  assert.equal(out[0].parts.length, 2);
});

test('a latest turn flagged hasImage with NO bytes (reload after a failed send): placeholder + "ask them to attach it again", no image part', async () => {
  const h = harness();
  const res = await h.ask([{ role: 'user', content: 'Check this', hasImage: true }]);
  assert.equal(res.status, 200);
  assert.equal(imgParts(h.calls[0].contents).length, 0);
  const last = h.calls[0].contents[h.calls[0].contents.length - 1];
  assert.ok(last.parts[0].text.includes(IMAGE_HISTORY_PLACEHOLDER));
  assert.match(last.parts[0].text, /no photo reached you/);
  assert.match(last.parts[0].text, /attach the photo again/);
  assert.ok(h.counters.includes('tutor.image_missing'));
});

test('one image request moves the trial tutor counter by exactly 1, counted on the 2xx', async () => {
  const { createFairUse } = require('../services/fairUse.cjs');
  const { EventEmitter } = require('node:events');
  const writes = [];
  const NOW = Date.UTC(2026, 8, 27, 6, 0, 0);
  const gate = createFairUse({
    tierOf: async () => 'trial',
    ledger: {
      async readDays(uid, keys) { return new Map(keys.map((k) => [k, {}])); },
      recordTrialUse(uid, counts) { writes.push(counts); return Promise.resolve(true); },
    },
    telemetry: { increment() {} },
    env: {},
    now: () => NOW,
    readJson: async () => ({}),
    resolveFirestore: () => ({ db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: async (d) => { writes.push(JSON.parse(JSON.stringify(d))); } }) }) }) }) }, FieldValue: { increment: (n) => ({ increment: n }) } }),
    sendJson: () => {},
    verifiedCaller: { resolveVerifiedUid: async () => 'stu-1' },
  });
  const calls = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.statusCode = status; res.body = body; },
    readJson: async (r) => r.body,
    callGemini: async () => { calls.push(1); return { text: 'ok', finishReason: 'STOP' }; },
    GEMINI_TUTOR_MODEL: 'm', GEMINI_MODEL: 'm', ACTIVE_PROVIDER: 'gemini', isStubMode: () => false,
  });
  const req = { headers: {}, body: { subject: 'maths', topicKey: 'real-numbers', topicLabel: 'Real Numbers', messages: [{ role: 'user', content: 'x', image: { imageBase64: PNG, imageMimeType: 'image/png' } }] } };
  const res = new EventEmitter();
  res.statusCode = 0;
  const answered = await gate.applyToRequest(req, res, '/api/tutor', 'stu-1');
  assert.ok(!answered);
  await route.handleTutorRequest(req, res);
  res.emit('finish');
  await new Promise((r) => setImmediate(r));
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  const inc = writes.flatMap((w) => Object.entries(w)).map(([k, v]) => [k, v && typeof v === 'object' ? v.increment : v]);
  assert.deepEqual(inc, [['trialTutor', 1]]);
});
