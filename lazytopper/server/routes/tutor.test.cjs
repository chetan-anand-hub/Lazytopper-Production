/**
 * tutor.test.cjs — TUTOR-FIX-1: the Tutor's model call and its honest cut-off signal.
 *
 * Run: `node --test server/routes/tutor.test.cjs`
 *
 * The defect: the Tutor called gemini with maxOutputTokens 900 and no thinking setting, so
 * thinking tokens came out of the same budget and replies stopped mid-sentence (eval,
 * ops/evals/tutor-fix-1: 8 of 30 at MAX_TOKENS). Each test below was RED before the fix.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTutorRoute, TUTOR_CALL_CONFIG } = require('./tutor.cjs');

function harness(geminiReply) {
  const calls = [];
  const route = createTutorRoute({
    sendJson: (res, status, body) => { res.status = status; res.body = body; },
    readJson: async (req) => req.body,
    callGemini: async (model, contents, cfg) => {
      calls.push({ model, cfg });
      return geminiReply;
    },
    GEMINI_TUTOR_MODEL: 'gemini-2.5-flash',
    GEMINI_MODEL: 'gemini-2.5-flash',
    ACTIVE_PROVIDER: 'gemini',
    isStubMode: () => false,
  });
  async function ask() {
    const res = {};
    await route.handleTutorRequest(
      { body: { subject: 'science', topicKey: 'electricity', topicLabel: 'Electricity', messages: [{ role: 'student', content: 'Why does R double when length doubles?' }] } },
      res,
    );
    return res;
  }
  return { calls, ask };
}

test('the Tutor call turns thinking off and keeps temperature 0.55 / 900 tokens', async () => {
  const h = harness({ text: 'Because R = ρl/A.', finishReason: 'STOP' });
  await h.ask();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].cfg, { temperature: 0.55, maxOutputTokens: 900, thinkingConfig: { thinkingBudget: 0 } });
  assert.equal(h.calls[0].cfg, TUTOR_CALL_CONFIG);
});

test('finishReason MAX_TOKENS reaches the response as truncated: true', async () => {
  const res = await harness({ text: 'Resistance depends on the length because', finishReason: 'MAX_TOKENS' }).ask();
  assert.equal(res.status, 200);
  assert.equal(res.body.truncated, true);
});

test('a complete reply (STOP, or no finishReason) is truncated: false', async () => {
  for (const finishReason of ['STOP', null, undefined]) {
    const res = await harness({ text: 'Because R = ρl/A.', finishReason }).ask();
    assert.equal(res.body.truncated, false, String(finishReason));
  }
});

test('the offer tag is still extracted from the reply', async () => {
  const res = await harness({ text: 'R = ρl/A, so doubling l doubles R.\n[[offer:practice]]', finishReason: 'STOP' }).ask();
  assert.equal(res.body.offer, 'practice');
  assert.equal(/\[\[/.test(res.body.reply), false);
});
