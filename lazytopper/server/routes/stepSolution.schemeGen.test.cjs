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

// ── SCHEME-GEN-1 follow-up: part-marks rules in the generator prompt ──────────────────────────────────────────
const SCIENCE_FIELDS = { question: 'A kettle of power 750 W works on 220 V. Can a 3 A fuse be used? Give reason.', marks: 2, subject: 'Science', topic: 'Electricity', qType: 'short', section: 'B', isObjective: false };
const MCQ_FIELDS = { question: 'Which gas is evolved? (a) H2 (b) O2', marks: 1, subject: 'Science', topic: 'Acids', qType: 'mcq', section: 'A', isObjective: true, existingAnswer: '(a)', existingExplanation: 'Metal + acid gives hydrogen.' };
const GENETICS_FIELDS = { question: 'Cross tall and dwarf pea plants. Give phenotypic ratio [1½] and genotypic ratio [1½].', marks: 3, subject: 'Science', topic: 'Heredity', qType: 'short', section: 'C', isObjective: false, existingAnswer: '3:1; 1:2:1' };
// sha256 of the FULL prompt text the trunk generator (66ffe1f7) builds for FIELDS, SCIENCE_FIELDS, MCQ_FIELDS, GENETICS_FIELDS.
const TRUNK_PROMPT_SHA256 = [
  '757ac6edc3904d00a7d6826be5d3e8efdeea85f96befedd3d49ba88d12032712',
  '634cd24c3d0761cb2d8f8659a4d6e747e3342400b062a78104e75878d069aa5d',
  'f096cd970e0ba1ed02fd267421a5321ff1c64e177f5d058c9ffb4037c39a3ed0',
  '68d7288f408945f39b559b6bb16ced6c228e3aa204841bd418e2afcf4aeae27e',
];
async function promptFor(fields) {
  let text = '';
  const deps = stubDeps({ text: GOOD, finishReason: 'STOP' });
  deps.callGemini = async (_m, contents) => { text = contents[0].parts[0].text; return { text: GOOD, finishReason: 'STOP' }; };
  await stepSolution.generateModelSolution(fields, deps);
  return text;
}
const sha = (t) => require('node:crypto').createHash('sha256').update(t).digest('hex');

test('T5 rules a-d: part-marks rule (all non-objective), Science-only decision rules and the fuse example are in the prompt', () => withEnv({}, async () => {
  const sci = await promptFor(SCIENCE_FIELDS);
  assert.ok(sci.includes('13. If the question prints marks for its parts (e.g. "[1½]", "(1)", "[2]", "1 mark"), the steps for each part MUST sum to exactly that part\'s printed marks; never move marks to working the question does not ask for.'));
  assert.ok(sci.includes('14. Marks go to what the question explicitly asks for (each asked value, ratio, decision, reason). Supporting working (restating a formula, a cross or Punnett diagram) earns at most 0.5, and only when the question asks to show it.'));
  assert.ok(sci.includes('15. For "Can/Should/Is ... ? Give reason" questions, the decision plus the reason together carry at least half the marks; each supporting calculated value carries at most 0.5.'));
  assert.ok(sci.includes('Can a fuse of rating 3 A be used with it? Give reason.'));
  assert.match(sci, /Step 1: desc="Calculating the current drawn"[^\n]*marks=0\.5\nStep 2: desc="Stating the decision"[^\n]*marks=0\.5\nStep 3: desc="Giving the reason"[^\n]*marks=1\n/);
  assert.ok(sci.includes('name the type of reaction when iron reacts'), 'the Fe example now asks for the reaction type it awards a step for');
  const maths = await promptFor(FIELDS);
  assert.ok(maths.includes('13. If the question prints marks for its parts'));
  assert.ok(!maths.includes('14. Marks go to what') && !maths.includes('15. For "Can/Should/Is'), 'Maths method-step marking is untouched by 14/15');
  const mcq = await promptFor(MCQ_FIELDS);
  assert.ok(!/\n1[345]\. /.test(mcq), 'objective questions get none of the new rules');
  assert.equal(sha(mcq), TRUNK_PROMPT_SHA256[2], 'the objective prompt is byte-identical to trunk');
}));

test('T6 SCHEME_GEN_LEGACY=1 -> the prompt is byte-identical to trunk 66ffe1f7 (4 shapes); default differs only where intended', async () => {
  const shapes = [FIELDS, SCIENCE_FIELDS, MCQ_FIELDS, GENETICS_FIELDS];
  await withEnv({ SCHEME_GEN_LEGACY: '1' }, async () => {
    for (let i = 0; i < shapes.length; i++) assert.equal(sha(await promptFor(shapes[i])), TRUNK_PROMPT_SHA256[i], 'legacy prompt #' + i + ' == trunk');
  });
  await withEnv({}, async () => {
    for (const i of [0, 1, 3]) assert.notEqual(sha(await promptFor(shapes[i])), TRUNK_PROMPT_SHA256[i], 'default prompt #' + i + ' carries the new rules');
  });
});

test('T7 a rejected thinking budget (HTTP 400) retries ONCE without thinkingConfig, logs and counts; other errors do not retry', () => withEnv({}, async () => {
  const seen = []; const counts = {}; let n = 0;
  const deps = stubDeps(() => {
    n++;
    if (n === 1) { const e = new Error('Invalid thinking budget for this model'); e.status = 400; throw e; }
    return { text: GOOD, finishReason: 'STOP' };
  }, seen, counts);
  const { r, lines } = await captureWarn(() => stepSolution.generateModelSolution(FIELDS, deps));
  assert.ok(r && r.solution.steps.length === 3);
  assert.equal(seen.length, 2);
  assert.ok(seen[0].thinkingConfig, 'first attempt carries the thinking budget');
  assert.equal(seen[1].thinkingConfig, undefined, 'retry has no thinkingConfig');
  assert.equal(seen[1].maxOutputTokens, seen[0].maxOutputTokens);
  assert.equal(counts['scheme_gen.thinking_retry'], 1);
  assert.equal(lines.filter((l) => l === '[scheme-gen] thinking rejected, retried without').length, 1);
  // a 400 that is not about thinking, and a 500, are not retried
  for (const [status, msg] of [[400, 'bad request: malformed contents'], [500, 'thinking service down']]) {
    const seen2 = []; const c2 = {};
    const d2 = stubDeps(() => { const e = new Error(msg); e.status = status; throw e; }, seen2, c2);
    await captureWarn(() => assert.rejects(() => stepSolution.generateModelSolution(FIELDS, d2)));
    assert.equal(seen2.length, 1); assert.equal(c2['scheme_gen.thinking_retry'], undefined); assert.equal(c2['scheme_gen.error'], 1);
  }
  // if the retry itself fails, that error surfaces (counted once as error)
  const seen3 = []; const c3 = {};
  const d3 = stubDeps(() => { const e = new Error('thinking budget rejected'); e.status = 400; throw e; }, seen3, c3);
  await captureWarn(() => assert.rejects(() => stepSolution.generateModelSolution(FIELDS, d3)));
  assert.equal(seen3.length, 2); assert.equal(c3['scheme_gen.error'], 1);
}));

test('T7b legacy config has no thinkingConfig, so a 400 about thinking is never retried', () => withEnv({ SCHEME_GEN_LEGACY: '1' }, async () => {
  const seen = []; const counts = {};
  const d = stubDeps(() => { const e = new Error('thinking budget'); e.status = 400; throw e; }, seen, counts);
  await captureWarn(() => assert.rejects(() => stepSolution.generateModelSolution(FIELDS, d)));
  assert.equal(seen.length, 1); assert.equal(counts['scheme_gen.thinking_retry'], undefined);
}));
