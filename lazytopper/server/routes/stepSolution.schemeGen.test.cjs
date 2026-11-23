'use strict';
// SCHEME-GEN-1 (23 Nov 2026): the marking-scheme generator must not be truncated by gemini-2.5-flash's thinking tokens.
// No live model call anywhere: callGemini is a stub that records the config it was handed.
const test = require('node:test');
const assert = require('node:assert/strict');
const stepSolution = require('./stepSolution.cjs');
const { extractJsonObjectFromText } = require('../services/httpUtils.cjs');
const FIXTURE = require('./fixtures/schemeGenMaxTokens.fixture.json');

const FIELDS = { question: 'Find the roots of x^2 - 5x + 6 = 0.', marks: 3, subject: 'Maths', topic: 'Quadratic Equations', qType: 'short', section: 'C', isObjective: false };
const GOOD = JSON.stringify({ totalMarks: 3, steps: [
  { stepNumber: 1, description: 'Formula', working: 'x^2-5x+6=0', marks: 1 },
  { stepNumber: 2, description: 'Factorise', working: '(x-2)(x-3)=0', marks: 1 },
  { stepNumber: 3, description: 'Roots', working: 'x=2,3', marks: 1 }], commonMistakes: ['sign slip'], examTip: 'show factors' });

function stubDeps(reply, seen = [], counts = {}) {
  return {
    GEMINI_MODEL: 'm', ACTIVE_PROVIDER: 'test', extractJsonObjectFromText,
    telemetry: { increment: (n, v = 1) => { counts[n] = (counts[n] || 0) + v; } },
    callGemini: async (_model, _contents, config) => { seen.push(config); return typeof reply === 'function' ? reply() : reply; },
  };
}
function captureWarn(fn) {
  const lines = []; const real = console.warn;
  console.warn = (...a) => lines.push(a.join(' '));
  return Promise.resolve().then(fn).then((r) => { console.warn = real; return { r, lines }; }, (e) => { console.warn = real; throw e; });
}
function withEnv(env, fn) {
  const keys = ['SCHEME_GEN_LEGACY', 'SCHEME_GEN_MAX_OUTPUT_TOKENS', 'SCHEME_GEN_THINKING_BUDGET'];
  const saved = {}; for (const k of keys) { saved[k] = process.env[k]; delete process.env[k]; }
  Object.assign(process.env, env);
  const restore = () => { for (const k of keys) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } };
  return Promise.resolve().then(fn).then((r) => { restore(); return r; }, (e) => { restore(); throw e; });
}

test('T1 the generator passes a thinking budget and an output cap with room for the JSON (>= budget + 3000)', () => withEnv({}, async () => {
  const seen = []; const counts = {};
  const gen = await stepSolution.generateModelSolution(FIELDS, stubDeps({ text: GOOD, finishReason: 'STOP' }, seen, counts));
  assert.ok(gen && gen.solution.steps.length === 3);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].temperature, 0.2);
  assert.ok(seen[0].thinkingConfig && Number.isInteger(seen[0].thinkingConfig.thinkingBudget), 'thinkingConfig.thinkingBudget is passed');
  assert.ok(seen[0].maxOutputTokens >= seen[0].thinkingConfig.thinkingBudget + 3000, 'maxOutputTokens leaves >= 3000 tokens for the JSON');
  assert.equal(counts['scheme_gen.ok'], 1);
}));

test('T1b env overrides are validated; invalid values fall back to the defaults', async () => {
  const cfg = (env) => stepSolution.resolveSchemeGenConfig(env).config;
  assert.deepEqual(cfg({}), { temperature: 0.2, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 1024 } });
  assert.deepEqual(cfg({ SCHEME_GEN_MAX_OUTPUT_TOKENS: '6000', SCHEME_GEN_THINKING_BUDGET: '512' }), { temperature: 0.2, maxOutputTokens: 6000, thinkingConfig: { thinkingBudget: 512 } });
  assert.deepEqual(cfg({ SCHEME_GEN_MAX_OUTPUT_TOKENS: 'lots', SCHEME_GEN_THINKING_BUDGET: '-5' }), cfg({}));
  assert.deepEqual(cfg({ SCHEME_GEN_MAX_OUTPUT_TOKENS: '1500', SCHEME_GEN_THINKING_BUDGET: '1400' }), cfg({}), 'a cap with no room above the budget is rejected');
});

test('T2 a cut-off reply (MAX_TOKENS) -> null, ONE log line with finish=MAX_TOKENS and token counts but never the text, nothing stored', async () => {
  const saved = [];
  stepSolution.__setPoolForTests({ query: async (sql, params) => {
    if (/^SELECT/i.test(sql)) return { rows: [] };
    if (/^INSERT/i.test(sql)) { saved.push(params[0]); return { rows: [] }; }
    return { rows: [] };
  } });
  try {
    await withEnv({}, async () => {
      const counts = {}; const cut = FIXTURE[0].text;
      const deps = stubDeps({ text: cut, finishReason: 'MAX_TOKENS', raw: { usageMetadata: { candidatesTokenCount: 700, thoughtsTokenCount: 1090 } } }, [], counts);
      const { r, lines } = await captureWarn(() => stepSolution.getOrCreateModelSolution(FIELDS, deps));
      assert.equal(r, null);
      assert.equal(saved.length, 0, 'saveSolution never called');
      const genLines = lines.filter((l) => l.startsWith('[scheme-gen]'));
      assert.equal(genLines.length, 1, 'exactly one [scheme-gen] line');
      assert.match(genLines[0], /finish=MAX_TOKENS/);
      assert.match(genLines[0], /candidates_tokens=700/);
      assert.match(genLines[0], /thoughts_tokens=1090/);
      assert.match(genLines[0], new RegExp('text_len=' + cut.length + '\\b'));
      assert.ok(!lines.some((l) => l.includes('Prime factor') || l.includes('"totalMarks"')), 'the model text is never logged');
      assert.equal(counts['scheme_gen.max_tokens'], 1);
      assert.equal(counts['scheme_gen.ok'], undefined);
    });
  } finally { stepSolution.__setPoolForTests(null); }
});

test('T2b a complete-but-unparseable reply counts parse_fail, and a thrown model call counts error and still rejects', async () => {
  await withEnv({}, async () => {
    const counts = {};
    const { r, lines } = await captureWarn(() => stepSolution.generateModelSolution(FIELDS, stubDeps({ text: 'sorry, I cannot', finishReason: 'STOP' }, [], counts)));
    assert.equal(r, null);
    assert.match(lines.find((l) => l.startsWith('[scheme-gen]')), /finish=STOP/);
    assert.equal(counts['scheme_gen.parse_fail'], 1);
    const deps = stubDeps(() => { throw new Error('boom'); }, [], counts);
    await assert.rejects(() => captureWarn(() => stepSolution.generateModelSolution(FIELDS, deps)), /boom/);
    assert.equal(counts['scheme_gen.error'], 1);
  });
});

test('T3 SCHEME_GEN_LEGACY=1 hands callGemini exactly the old config (no thinkingConfig, 1800)', () => withEnv({ SCHEME_GEN_LEGACY: '1', SCHEME_GEN_MAX_OUTPUT_TOKENS: '9999' }, async () => {
  const seen = [];
  await stepSolution.generateModelSolution(FIELDS, stubDeps({ text: GOOD, finishReason: 'STOP' }, seen));
  assert.deepEqual(seen, [{ temperature: 0.2, maxOutputTokens: 1800 }]);
  assert.ok(!('thinkingConfig' in seen[0]));
  // the kill switch keeps the new LOGGING: a failure under it is still reported, marked legacy=1
  const { r, lines } = await captureWarn(() => stepSolution.generateModelSolution(FIELDS, stubDeps({ text: FIXTURE[0].text, finishReason: 'MAX_TOKENS' })));
  assert.equal(r, null);
  assert.match(lines.find((l) => l.startsWith('[scheme-gen]')) || '', /finish=MAX_TOKENS.*legacy=1/);
}));

test('T4 every committed MAX_TOKENS scheme text from the eval runs parses to null and the generator reports it as max_tokens', async () => {
  assert.ok(FIXTURE.length >= 3);
  for (const f of FIXTURE) {
    assert.equal(f.finishReason, 'MAX_TOKENS');
    assert.equal(extractJsonObjectFromText(f.text), null, 'cut-off JSON from ' + f.source + ' is unusable');
    const counts = {};
    const { r, lines } = await captureWarn(() => stepSolution.generateModelSolution(FIELDS, stubDeps({ text: f.text, finishReason: 'MAX_TOKENS' }, [], counts)));
    assert.equal(r, null);
    assert.equal(counts['scheme_gen.max_tokens'], 1);
    assert.ok(lines.some((l) => /^\[scheme-gen\].*finish=MAX_TOKENS/.test(l)));
  }
});
