#!/usr/bin/env node
// TUTOR-FIX-1 eval runner (ops only — no product file imports this).
//
// Drives the REAL Tutor route (createTutorRoute: real system prompt, real offer/figure tag
// extraction) through the REAL geminiClient, on the EVAL key only
// (~/.lazytopper-eval.env, API_KEY=). A thin wrapper around callGemini swaps ONLY
// thinkingConfig / maxOutputTokens per option, so options are compared before any product edit;
// `--option=product` passes the route's own config through untouched (the post-fix check).
//
//   node ops/evals/tutor-fix-1/run.cjs --option=baseline|A|B|product --set=sample|all [--model=gemini-2.5-flash] --out=<file.json>
//
// --model: production runs gemini-2.5-flash, which returns 404 "no longer available to new users" on the eval
// project; a different model is a STAND-IN and every result from it is labelled with that model.
//
// Writes one JSON row per prompt (finish reason, token counts, ₹ per reply from the ledger's own
// pricing, tags, reply text) and prints a summary. Writes nothing to any ledger or database.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SERVER = path.join(ROOT, 'lazytopper', 'server');
const { createGeminiClient } = require(path.join(SERVER, 'services', 'geminiClient.cjs'));
const { createTutorRoute } = require(path.join(SERVER, 'routes', 'tutor.cjs'));
const { buildLedgerIncrement } = require(path.join(SERVER, 'services', 'usageLedger.cjs'));

const OPTIONS = {
  baseline: (cfg) => ({ ...cfg }), // today's route config, forced: no thinkingConfig, 900
  A: (cfg) => ({ ...cfg, maxOutputTokens: 900, thinkingConfig: { thinkingBudget: 0 } }),
  B: (cfg) => ({ ...cfg, maxOutputTokens: 1600, thinkingConfig: { thinkingBudget: 512 } }),
  product: (cfg) => cfg, // whatever the route passes now (post-fix verification)
};

function arg(name, dflt) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
}

function loadEvalKey() {
  const file = path.join(os.homedir(), '.lazytopper-eval.env');
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((l) => /^API_KEY=/.test(l));
  const key = line ? line.slice('API_KEY='.length).trim() : '';
  if (!key) throw new Error('eval key missing in ~/.lazytopper-eval.env');
  return key;
}

async function main() {
  const option = arg('option', 'baseline');
  const set = arg('set', 'sample');
  const out = arg('out', path.join(__dirname, 'out', `${option}-${set}.json`));
  const concurrency = Number(arg('concurrency', '5'));
  if (!OPTIONS[option]) throw new Error(`unknown --option=${option}`);
  if (option === 'baseline') {
    // Baseline must reflect today's product config exactly; refuse if the route already sets thinking.
    const src = fs.readFileSync(path.join(SERVER, 'routes', 'tutor.cjs'), 'utf8');
    if (/thinkingConfig/.test(src)) console.warn('[eval] note: tutor.cjs already sets thinkingConfig; baseline = route config as-is');
  }

  const key = loadEvalKey();
  const MODEL = arg('model', 'gemini-2.5-flash');
  const client = createGeminiClient({
    GEMINI_API_KEY: key,
    DIRECT_GEMINI_API_KEY: key,
    HAS_REPLIT_PROXY: false,
    GEMINI_TUTOR_MODEL: MODEL,
    GEMINI_TIMEOUT_MS: 60000,
    usageLedger: { recordUsage() { return null; } },
  });

  const all = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf8')).prompts;
  const prompts = set === 'all' ? all : all.filter((p) => p.sample);

  async function runOne(p) {
    let captured = null;
    const callGemini = async (model, contents, cfg) => {
      const sent = OPTIONS[option](cfg);
      const r = await client.callGemini(model, contents, sent);
      const cand = r && r.raw && r.raw.candidates && r.raw.candidates[0];
      captured = {
        sentConfig: { maxOutputTokens: sent.maxOutputTokens, thinkingConfig: sent.thinkingConfig || null },
        finishReason: (cand && cand.finishReason) || null,
        usage: (r && r.raw && r.raw.usageMetadata) || {},
        rawText: r && r.text,
      };
      return r;
    };
    const route = createTutorRoute({
      sendJson: (res, status, body) => { res.status = status; res.body = body; },
      readJson: async (req) => req.body,
      callGemini,
      GEMINI_TUTOR_MODEL: MODEL,
      GEMINI_MODEL: MODEL,
      ACTIVE_PROVIDER: 'gemini',
      isStubMode: () => false,
    });
    const req = { body: { subject: p.subject, topicKey: p.topicKey, topicLabel: p.topicLabel, concept: p.concept, language: 'English', figures: p.figures || [], messages: p.messages } };
    const res = {};
    const t0 = Date.now();
    await route.handleTutorRequest(req, res);
    const u = (captured && captured.usage) || {};
    const { increment } = buildLedgerIncrement({ model: MODEL, ...u });
    const raw = (captured && captured.rawText) || '';
    return {
      id: p.id, subject: p.subject, kind: p.kind, option, model: MODEL,
      status: res.status,
      finishReason: captured && captured.finishReason,
      truncated: Boolean(captured && captured.finishReason === 'MAX_TOKENS'),
      sentConfig: captured && captured.sentConfig,
      promptTokens: u.promptTokenCount || 0,
      visibleTokens: u.candidatesTokenCount || 0,
      thoughtsTokens: u.thoughtsTokenCount || 0,
      costMicroInr: increment.costMicroInr,
      rawHasOfferTag: /\[\[\s*offer\s*:/i.test(raw),
      rawHasFigureTag: /\[\[\s*figure\s*:/i.test(raw),
      offer: res.body && res.body.offer, figure: res.body && res.body.figure,
      responseTruncatedField: res.body ? res.body.truncated : undefined,
      latencyMs: Date.now() - t0,
      reply: res.body && (res.body.reply || res.body.error),
    };
  }

  const rows = new Array(prompts.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, prompts.length) }, async () => {
    while (next < prompts.length) {
      const i = next++;
      try { rows[i] = await runOne(prompts[i]); }
      catch (e) { rows[i] = { id: prompts[i].id, option, error: String(e && e.message).slice(0, 300) }; }
    }
  }));

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  rows.forEach((r) => { if (!r.error && r.status !== 200) r.error = `HTTP ${r.status}: ${String(r.reply).slice(0, 200)}`; });
  const ok = rows.filter((r) => !r.error);
  const sum = (k) => ok.reduce((a, r) => a + (r[k] || 0), 0);
  const fr = {};
  ok.forEach((r) => { fr[r.finishReason] = (fr[r.finishReason] || 0) + 1; });
  console.log(`model=${MODEL} option=${option} set=${set} n=${rows.length} errors=${rows.length - ok.length}`);
  console.log(`finishReasons=${JSON.stringify(fr)} MAX_TOKENS=${ok.filter((r) => r.truncated).length}`);
  console.log(`mean visible=${(sum('visibleTokens') / ok.length).toFixed(0)} thoughts=${(sum('thoughtsTokens') / ok.length).toFixed(0)} prompt=${(sum('promptTokens') / ok.length).toFixed(0)}`);
  console.log(`mean ₹/reply=${(sum('costMicroInr') / ok.length / 1e6).toFixed(4)} total ₹=${(sum('costMicroInr') / 1e6).toFixed(3)}`);
  console.log(`offer tags raw=${ok.filter((r) => r.rawHasOfferTag).length} extracted=${ok.filter((r) => r.offer).length}; figure tags raw=${ok.filter((r) => r.rawHasFigureTag).length} extracted=${ok.filter((r) => r.figure).length}`);
  rows.forEach((r) => console.log(`${r.id} ${r.error ? 'ERR ' + r.error : `${r.finishReason} vis=${r.visibleTokens} th=${r.thoughtsTokens} ₹${(r.costMicroInr / 1e6).toFixed(4)}`}`));
  console.log(`wrote ${path.relative(ROOT, out)}`);
}

main().catch((e) => { console.error(e && e.message); process.exit(1); });
