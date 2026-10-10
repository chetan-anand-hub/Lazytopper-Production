'use strict';
// TOPIC-FIX-1 - runs the chapter-detection eval set through the REAL handleDetectQuestion with a live
// model (eval key only; manual, never CI). The key is loaded by the SHELL, never printed or stored.
//   set -a; . ~/.lazytopper-eval.env; set +a; unset GEMINI_MODEL
//   node server/eval/golden/topicdetect/run.cjs --label baseline --model gemini-3.8-flash [--concurrency 4] [--cap 400]
// Output: topicdetect/results/<label>.json + a scorecard on stdout. Expected = the bank topicKey.
const fs = require('fs');
const path = require('path');
const { createLiveClient } = require('../lib/live.cjs');
const { createDriver } = require('../lib/driver.cjs');

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const label = arg('--label', 'run');
const model = arg('--model', 'gemini-2.5-flash');
const concurrency = Number(arg('--concurrency', 4));
const cap = Number(arg('--cap', 400));
const only = arg('--only', null);
const photos = process.argv.includes('--photos');
const outDir = path.join(__dirname, 'results');
fs.mkdirSync(outDir, { recursive: true });

const { items } = JSON.parse(fs.readFileSync(path.join(__dirname, 'items.json'), 'utf8'));
const vocab = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'truth', 'topic_vocab.json'), 'utf8'));
const subjectOf = Object.fromEntries(vocab.map((v) => [v.slug, v.subject]));

(async () => {
  const ledger = path.join(outDir, label + '.ledger.jsonl');
  const client = createLiveClient({ model, thinkingBudget: null, ledgerFile: ledger, cap, configId: 'TOPIC-' + label, pr: 'TOPIC-FIX-1' });
  const driver = createDriver({ callGemini: client.callGemini, model });
  let todo = items.filter((i) => !only || i.kind === only);
  if (photos) {
    const ids = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'images', 'manifest.json'), 'utf8')));
    todo = todo.filter((i) => ids.has(i.id));
  }
  const results = new Array(todo.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const k = next++;
      if (k >= todo.length) return;
      const it = todo[k];
      const r = await driver.run({ handler: 'handleDetectQuestion', request: photos ? { imageBase64: fs.readFileSync(path.join(__dirname, 'images', it.id + '.jpg')).toString('base64'), imageMimeType: 'image/jpeg', topicVocabulary: vocab } : { question: it.text, topicVocabulary: vocab } });
      const b = r.body || {};
      results[k] = { id: it.id, kind: it.kind, want: it.topicKey, got: b.ok ? (b.detectedTopic || null) : 'ok=' + b.ok, subjectGot: b.detectedSubject || null,
        subjectWant: subjectOf[it.topicKey], wallMs: r.wallMs };
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const exact = (r) => r.got === r.want;
  const isNull = (r) => r.got === null;
  const wrong = (r) => !exact(r) && !isNull(r);
  const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);
  const sum = (rs) => ({ n: rs.length, right: rs.filter(exact).length, null: rs.filter(isNull).length, wrong: rs.filter(wrong).length,
    subjectRight: rs.filter((r) => r.subjectGot === r.subjectWant).length });
  const by = (f) => Object.fromEntries([...new Set(results.map(f))].sort().map((k) => [k, sum(results.filter((r) => f(r) === k))]));
  const lat = results.map((r) => r.wallMs).sort((a, b) => a - b);
  const out = { label, model, at: new Date().toISOString(), overall: sum(results), byKind: by((r) => r.kind), byChapter: by((r) => r.want),
    latencyMs: { p50: lat[Math.floor(lat.length * 0.5)], p95: lat[Math.floor(lat.length * 0.95)] }, results };
  fs.writeFileSync(path.join(outDir, label + '.json'), JSON.stringify(out, null, 1));
  const o = out.overall;
  console.log(`TOPICDETECT ${label} model=${model} n=${o.n} right=${o.right} (${pct(o.right, o.n)}%) null=${o.null} (${pct(o.null, o.n)}%) wrong=${o.wrong} (${pct(o.wrong, o.n)}%) p50=${out.latencyMs.p50}ms p95=${out.latencyMs.p95}ms`);
  for (const [k, v] of Object.entries(out.byKind)) console.log(`  kind ${k}: ${v.right}/${v.n} right, null ${v.null}, wrong ${v.wrong}`);
  for (const r of results.filter((x) => !exact(x))) console.log(`  MISS ${r.id} [${r.kind}] want=${r.want} got=${r.got}`);
})().catch((e) => { console.error('FAILED', String((e && e.message) || e).slice(0, 300)); process.exit(1); });
