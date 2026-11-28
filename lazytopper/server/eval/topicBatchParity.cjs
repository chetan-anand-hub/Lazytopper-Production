'use strict';
// TOPIC-BATCH-1 parity eval - does ONE batched "topics" call tag a paper's questions the same way as one
// "topic" call per question?  Runs BOTH paths through the REAL handler (handleDetectQuestion) with the LIVE
// model and prints per-question agreement plus token totals.
//
//   API_KEY=<eval key> AI_PROVIDER=gemini node server/eval/topicBatchParity.cjs papers.json [--repeat N]
//
// papers.json: { "topicVocabulary": [{ "slug", "name", "subject" }, ...],
//                "papers": [{ "name": "...", "questions": [{ "questionNumber": 1, "questionText": "..." }, ...] }, ...] }
// (the vocabulary is the client's topics.ts list the production request sends: slug, canonical name, subject).
//
// Spends real tokens. It REFUSES to run without a key (it never falls back to the stub) and is not part of any
// test matrix: the coordinator runs it with the eval key. Comparison is on the model's RAW answer (detectedTopic key,
// detectedSubject): the client's guard + resolver run identically on both paths, so they cannot make the paths differ.

const fs = require('fs');
const path = require('path');
const { createDriver } = require('./golden/lib/driver.cjs');

function usageOf(reply) {
  const u = (reply && (reply.usageMetadata || (reply.raw && reply.raw.usageMetadata) || (reply.response && reply.response.usageMetadata))) || {};
  return { input: Number(u.promptTokenCount) || 0, output: Number(u.candidatesTokenCount) || 0, thoughts: Number(u.thoughtsTokenCount) || 0 };
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const ri = args.indexOf('--repeat');
  const repeat = ri >= 0 ? Math.max(1, Number(args[ri + 1]) || 1) : 1;
  if (!file) { console.error('usage: node server/eval/topicBatchParity.cjs papers.json [--repeat N]'); process.exit(2); }
  const input = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const vocab = Array.isArray(input.topicVocabulary) ? input.topicVocabulary : [];
  const papers = Array.isArray(input.papers) ? input.papers : [];

  const { resolveConfig } = require('../services/serverConfig.cjs');
  const { createGeminiClient } = require('../services/geminiClient.cjs');
  const config = resolveConfig();
  if (!config.GEMINI_API_KEY) {
    console.error('No Gemini key resolved. Set API_KEY with AI_PROVIDER=gemini. Refusing to run against the stub.');
    process.exit(1);
  }
  const gem = createGeminiClient({
    GEMINI_API_KEY: config.GEMINI_API_KEY,
    HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
    REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
    REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
    DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
    GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
    GEMINI_TIMEOUT_MS: config.GEMINI_TIMEOUT_MS,
  });

  const tally = { calls: 0, input: 0, output: 0, thoughts: 0 };
  const driver = createDriver({
    model: config.GEMINI_MODEL,
    callGemini: async (m, c, cfg) => {
      const reply = await gem.callGemini(m, c, cfg);
      const u = usageOf(reply);
      tally.calls += 1; tally.input += u.input; tally.output += u.output; tally.thoughts += u.thoughts;
      return reply;
    },
  });
  const snap = () => ({ ...tally });
  const diff = (a, b) => ({ calls: b.calls - a.calls, input: b.input - a.input, output: b.output - a.output, thoughts: b.thoughts - a.thoughts });
  const norm = (v) => (v == null ? null : String(v));

  (async () => {
    let total = 0; let agree = 0; let subjAgree = 0;
    const sums = { single: { calls: 0, input: 0, output: 0, thoughts: 0 }, batch: { calls: 0, input: 0, output: 0, thoughts: 0 } };
    for (const paper of papers) {
      for (let r = 1; r <= repeat; r += 1) {
        const qs = (paper.questions || []).map((q) => ({ questionNumber: q.questionNumber, questionText: q.questionText }));
        // Path A - today: one purpose:"topic" detect per question, concurrently.
        const a0 = snap();
        const singles = await Promise.all(qs.map(async (q) => {
          const out = await driver.run({ handler: 'handleDetectQuestion', request: { question: q.questionText, topicVocabulary: vocab, purpose: 'topic' } });
          const b = out && out.body ? out.body : {};
          return { n: q.questionNumber, topic: norm(b.detectedTopic), subject: norm(b.detectedSubject) };
        }));
        const a1 = snap();
        // Path B - new: ONE purpose:"topics" call.
        const out = await driver.run({ handler: 'handleDetectQuestion', request: { questions: qs, topicVocabulary: vocab, purpose: 'topics' } });
        const b1 = snap();
        const tb = out && out.body && Array.isArray(out.body.topics) ? out.body.topics : [];
        const batched = new Map(tb.map((t) => [t.questionNumber, { topic: norm(t.detectedTopic), subject: norm(t.detectedSubject) }]));
        const sA = diff(a0, a1); const sB = diff(a1, b1);
        for (const k of ['calls', 'input', 'output', 'thoughts']) { sums.single[k] += sA[k]; sums.batch[k] += sB[k]; }
        console.log('\n== ' + (paper.name || 'paper') + (repeat > 1 ? ' (run ' + r + ')' : '') + ' - ' + qs.length + ' questions; batch reply covered ' + batched.size);
        for (const s of singles) {
          const bt = batched.get(s.n);
          const same = bt ? bt.topic === s.topic : false;
          const sameSubj = bt ? bt.subject === s.subject : false;
          total += 1; if (same) agree += 1; if (sameSubj) subjAgree += 1;
          console.log('  Q' + s.n + ' ' + (same ? 'SAME   ' : bt ? 'DIFFER ' : 'MISSING') + ' single=' + s.topic + '/' + s.subject + '  batch=' + (bt ? bt.topic + '/' + bt.subject : '-'));
        }
        console.log('  tokens single x' + qs.length + ': ' + JSON.stringify(sA) + '   batch x1: ' + JSON.stringify(sB));
      }
    }
    console.log('\nTOPIC AGREEMENT ' + agree + '/' + total + (total ? ' (' + (100 * agree / total).toFixed(1) + '%)' : '') + '   SUBJECT AGREEMENT ' + subjAgree + '/' + total);
    console.log('TOKEN TOTALS single path: ' + JSON.stringify(sums.single) + '\n             batch path: ' + JSON.stringify(sums.batch));
  })().catch((e) => { console.error(e); process.exit(1); });
}

if (require.main === module) main();
module.exports = { usageOf };
