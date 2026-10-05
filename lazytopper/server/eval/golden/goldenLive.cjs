#!/usr/bin/env node
'use strict';
// goldenLive.cjs — run the golden set LIVE through BOTH entry points and store a new run.
// MANUAL / ON DEMAND ONLY: it calls a real model and spends quota. Never wired into CI.
//
//   set -a; . ~/.lazytopper-eval.env; set +a; unset GEMINI_MODEL; \
//     node server/eval/golden/goldenLive.cjs --config A --runs 3 --concurrency 4 [--detect]
//
// Options:
//   --config A|B|C        A = gemini-2.5-flash dynamic thinking (production default)
//                         B = gemini-3.1-pro-preview default thinking (gemini-2.5-pro is refused for the eval key)
//                         C = gemini-3.1-pro-preview thinkingBudget 2048 on the grading calls
//   --model M --thinking N --config-id ID   a custom config instead of A/B/C
//   --runs N              repeats of the whole plan (default 3)
//   --concurrency N       parallel jobs (default 4; capped at 4 unless --ramp is given)
//   --ramp A,B,C          OWNER SPEED RULING 2 (2026-10-05): adaptive parallelism up to the key's
//                         rate limit — start at A jobs in flight, step up to B, C after every
//                         --ramp-every completed jobs while HTTP 429s stay at 0; on any 429
//                         halve it (never stepping up again in this process). Peak in flight,
//                         429 count and wall-clock are recorded in the manifest per invocation.
//   --ramp-every N        completed jobs at a level before stepping up (default 8)
//   --filter-file F       job keys (one per line, '#' comments) — exact matches, added to --filter
//   --filter P[,P...]     only jobs whose key starts with a prefix P (P ending in '$' = exact key)
//   --detect              also run the detect-question jobs (once, as run 1)
//   --run-id ID           folder name under runs/ (default <date>.<config-id>)
//   --out DIR             write the run somewhere else (e.g. off-repo for B/C)
//   --max-calls N         stop sending after N HTTP requests in this process
//   --cap N               total ledger cap (default 1200, controller decision D8)
//   --ledger FILE         call ledger (default Desktop/diff/a15/calls/a15-pr1-golden-eval.jsonl)
//   --dry                 no network: a canned model reply, to validate the pipeline
// The run is RESUMABLE: a job already written to run<k>.jsonl is skipped.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { buildPlan, digest } = require('./lib/planner.cjs');
const { createDriver } = require('./lib/driver.cjs');
const { redact } = require('./lib/redact.cjs');
const { PRICES } = require('./lib/score.cjs');

// GRADER-CORE-1 PR-2 (controller decision D19): a RUPEE budget. Spend = tokens x list price
// (lib/score.cjs PRICES; thinking billed at the output rate) x 88 INR/USD, summed over this PR's
// ledger lines. --budget-inr N stops the run before a job once spend reaches N.
const USD_INR = 88;
function ledgerSpendInr(file, pr) {
  let inr = 0;
  if (!fs.existsSync(file)) return 0;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (pr && r.pr !== pr) continue;
    const p = PRICES[r.model];
    if (!p) continue;
    inr += ((Number(r.promptTokens) || 0) * p.in + ((Number(r.outputTokens) || 0) + (Number(r.thinkingTokens) || 0)) * p.out) / 1e6 * USD_INR;
  }
  return inr;
}

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const has = (k) => argv.includes(k);

const CONFIGS = {
  A: { id: 'A-flash-dynamic', model: 'gemini-2.5-flash', thinkingBudget: null, label: 'gemini-2.5-flash, dynamic thinking (production default)' },
  // B/C were specified as gemini-2.5-pro. On 2026-10-05 the eval key's project got HTTP 404 "This model models/gemini-2.5-pro is no longer available to new users. Please update your code to use models/gemini-3.1-pro-preview" (one recorded call), so B/C run the provider-named successor and say so in every label.
  B: { id: 'B-pro31-dynamic', model: 'gemini-3.1-pro-preview', thinkingBudget: null, label: 'gemini-3.1-pro-preview (substitute: gemini-2.5-pro refused for this key), default thinking' },
  C: { id: 'C-pro31-cap2048', model: 'gemini-3.1-pro-preview', thinkingBudget: 2048, label: 'gemini-3.1-pro-preview (substitute), thinkingBudget 2048 on grading calls' },
  // GRADER-CORE-1 PR-2 (owner ruling 2026-10-05): the three configurations compared under the
  // NEW rules. The core itself applies the thinking cap to its grading model (core: true), so the
  // router caps only its strong model and the live client injects nothing.
  PA: { id: 'PR2-a-flash', model: 'gemini-2.5-flash', thinkingBudget: null, core: true, gradingMode: 'single', label: 'PR-2 (a): gemini-2.5-flash only, dynamic thinking' },
  PB: { id: 'PR2-b-pro2048', model: 'gemini-3.1-pro-preview', thinkingBudget: 2048, core: true, gradingMode: 'single', label: 'PR-2 (b): gemini-3.1-pro-preview only, thinking capped at 2048' },
  PC: { id: 'PR2-c-router', model: 'gemini-3.1-pro-preview', thinkingBudget: 2048, core: true, gradingMode: 'router', lightModel: 'gemini-2.5-flash', label: 'PR-2 (c): router — known MCQ picks no call; typed 1-2 mark -> gemini-2.5-flash; 3-5 mark, proofs, photos -> gemini-3.1-pro-preview capped 2048' },
  // On 2026-10-05 (PR-2 live phase) the eval key's NEW project got HTTP 404 on gemini-2.5-flash:
  // "This model models/gemini-2.5-flash is no longer available to new users. Please update your
  // code to use models/gemini-3.8-flash" (36 recorded calls, unbilled). Production's older key
  // still grades on gemini-2.5-flash. (a) and the router's light model therefore run the
  // provider-named successor, and every label says so (as B/C did for gemini-2.5-pro).
  PA8: { id: 'PR2-a-flash38', model: 'gemini-3.8-flash', thinkingBudget: null, core: true, gradingMode: 'single', label: 'PR-2 (a): gemini-3.8-flash only (SUBSTITUTE: gemini-2.5-flash refused to this key), dynamic thinking' },
  PC8: { id: 'PR2-c-router38', model: 'gemini-3.1-pro-preview', thinkingBudget: 2048, core: true, gradingMode: 'router', lightModel: 'gemini-3.8-flash', label: 'PR-2 (c): router — known MCQ picks no call; typed 1-2 mark -> gemini-3.8-flash (SUBSTITUTE for gemini-2.5-flash); 3-5 mark, proofs, photos -> gemini-3.1-pro-preview capped 2048' },
};

function out(...a) { process.stdout.write(redact(a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')) + '\n'); }
for (const m of ['log', 'warn', 'error', 'info']) {
  console[m] = (...a) => process.stderr.write(redact('[' + m + '] ' + a.map((x) => (typeof x === 'string' ? x : (x && x.stack) || JSON.stringify(x))).join(' ')).slice(0, 1500) + '\n');
}

const DRY_REPLY = JSON.stringify({ totalMarks: 1, marksAwarded: 1, annotatedSteps: [{ stepNumber: 1, description: 'dry', studentWork: 'dry', status: 'correct', marksAwarded: 1, marksDeducted: 0, teacherAnnotation: 'dry', mistakeType: null, correctedWorking: null, isDeparture: false, isReturn: false }], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, finalAnswerCorrect: true, teacherNote: 'dry', results: [{ qNumber: 1, couldNotRead: true }], summary: 'dry', detectedMarks: 1, questions: [] });

async function main() {
  const preset = CONFIGS[String(arg('--config', '')).toUpperCase()];
  const cfg = preset || (arg('--model') ? { id: arg('--config-id', 'custom-' + arg('--model')), model: arg('--model'), thinkingBudget: arg('--thinking') != null ? Number(arg('--thinking')) : null, label: 'custom' } : null);
  if (!cfg) { out('usage: --config A|B|C (or --model M [--thinking N] --config-id ID)'); process.exit(2); }
  const runs = Number(arg('--runs', '3'));
  const rampArg = arg('--ramp');
  const ramp = rampArg ? String(rampArg).split(',').map((x) => Math.floor(Number(x))).filter((x) => x > 0) : [Math.min(4, Number(arg('--concurrency', '4')))];
  const rampEvery = Math.max(1, Number(arg('--ramp-every', '8')));
  const concurrency = Math.max(...ramp);
  // Plain matching, never a RegExp built from input: comma-separated job-key PREFIXES; a
  // pattern ending in '$' matches that exact key (e.g. --filter S.CI.GS-M0,W.CIM.OA-01$).
  const filterArg = arg('--filter');
  let filterPats = filterArg ? String(filterArg).split(',').map((p) => p.trim()).filter(Boolean) : null;
  if (arg('--filter-file')) {
    const keys = fs.readFileSync(path.resolve(arg('--filter-file')), 'utf8').split('\n').map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean).map((k) => k + '$');
    filterPats = (filterPats || []).concat(keys);
  }
  const filter = filterPats ? (key) => filterPats.some((p) => (p.endsWith('$') ? key === p.slice(0, -1) : key.startsWith(p))) : null;
  const dry = has('--dry');
  const date = new Date().toISOString().slice(0, 10);
  const runId = arg('--run-id', date + '.' + cfg.id);
  const runDir = path.resolve(arg('--out', path.join(__dirname, 'runs', runId)));
  const ledger = arg('--ledger', path.join(os.homedir(), 'OneDrive', 'Desktop', 'diff', 'a15', 'calls', 'a15-pr1-golden-eval.jsonl'));
  const cap = Number(arg('--cap', '1200'));
  const maxCalls = arg('--max-calls') != null ? Number(arg('--max-calls')) : null;
  const budgetInr = arg('--budget-inr') != null ? Number(arg('--budget-inr')) : null;
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(path.dirname(ledger), { recursive: true });

  let client;
  if (dry) {
    client = {
      callGemini: async () => ({ text: DRY_REPLY, raw: { candidates: [{ finishReason: 'STOP' }] } }),
      runInContext: async (meta, fn) => { const calls = [{ ok: true, text: DRY_REPLY, finishReason: 'STOP', http: [] }]; return { out: await fn(), calls }; },
      used: () => 0, sentThisProcess: () => 0, stats: {}, resolvedTimeoutMs: null,
    };
  } else {
    client = require('./lib/live.cjs').createLiveClient({ model: cfg.model, thinkingBudget: cfg.core ? null : cfg.thinkingBudget, ledgerFile: ledger, cap, maxCalls, configId: cfg.id, pr: arg('--pr', 'PR-1') });
  }
  const driver = cfg.core
    ? createDriver({ callGemini: client.callGemini, model: 'gemini-2.5-flash', gradingModel: cfg.model, gradingThinkingBudget: cfg.thinkingBudget, gradingMode: cfg.gradingMode, gradingLightModel: cfg.lightModel })
    : createDriver({ callGemini: client.callGemini, model: cfg.model });

  const serverFiles = ['grading/rules.cjs', 'grading/prompt.cjs', 'grading/postprocess.cjs', 'grading/core.cjs', 'grading/verify.cjs', 'grading/schema.cjs', 'grading/fence.cjs', 'routes/checkSolution.cjs', 'routes/objectiveScoring.cjs', 'services/geminiClient.cjs', 'services/serverConfig.cjs', 'services/httpUtils.cjs', 'mentorImageSupport.cjs', 'services/serverUtils.cjs'];
  const serverDir = path.join(__dirname, '..', '..');
  const lfOnlyHash = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(serverDir, f), 'utf8').replace(/\r\n/g, '\n')).digest('hex');
  const manifestPath = path.join(runDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {
    runId, config: cfg, createdAt: new Date().toISOString(), dry,
    note: cfg.core
      ? 'Runs under the GRADER-CORE-1 PR-2 grading core (one prompt builder, one post-processing path, the owner rulings of 2026-10-05).'
      : 'Runs under the CURRENT (pre-GRADER-CORE-1) prompts and post-processing: these outputs measure the model\'s reading and judgement under today\'s rules.',
    serverFileSha256LF: Object.fromEntries(serverFiles.map((f) => [f, lfOnlyHash(f)])),
    timeoutMs: client.resolvedTimeoutMs, concurrency, runsPlanned: runs, ledger: path.basename(ledger), stubs: 'no fair-use/idempotency/entitlement middleware (handler called directly); solution cache returns null (production with no DATABASE_URL)',
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');

  const plan = buildPlan({ includeDetect: has('--detect'), filter });
  const grading = plan.filter((j) => j.entry !== 'detect');
  const detectJobs = plan.filter((j) => j.entry === 'detect');
  const queue = [];
  const doneKeys = (file) => {
    if (!fs.existsSync(file)) return new Set();
    return new Set(fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l).jobKey));
  };
  if (detectJobs.length) {
    const f = path.join(runDir, 'detect.jsonl'); const done = doneKeys(f);
    for (const j of detectJobs) if (!done.has(j.jobKey)) queue.push({ job: j, run: 1, file: f });
  }
  for (let r = 1; r <= runs; r += 1) {
    const f = path.join(runDir, 'run' + r + '.jsonl'); const done = doneKeys(f);
    for (const j of grading) if (!done.has(j.jobKey)) queue.push({ job: j, run: r, file: f });
  }
  out('golden live: config=' + cfg.id + ' model=' + cfg.model + ' thinkingBudget=' + cfg.thinkingBudget + ' dry=' + dry + ' timeoutMs=' + client.resolvedTimeoutMs +
    ' runs=' + runs + ' concurrency=' + concurrency + ' jobs=' + queue.length + ' ledgerBefore=' + client.used() + ' cap=' + cap + ' dir=' + runDir);

  let idx = 0; let finished = 0; let stopped = false;
  // Adaptive parallelism (owner speed ruling 2): `cur` jobs may be in flight.
  let level = 0; let cur = ramp[0]; let sinceChange = 0; let seen429 = (client.stats && client.stats.status429) || 0;
  let halved = false; let inFlight = 0; let peakInFlight = 0;
  const tStart = Date.now();
  const levels = [{ atMs: 0, inFlightCap: cur, why: 'start' }];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function adjust() {
    const s429 = (client.stats && client.stats.status429) || 0;
    if (s429 > seen429) {
      seen429 = s429; halved = true; sinceChange = 0;
      const next = Math.max(1, Math.floor(cur / 2));
      if (next !== cur) { cur = next; levels.push({ atMs: Date.now() - tStart, inFlightCap: cur, why: 'HTTP 429 -> halved' }); out('PARALLEL: 429 seen -> in-flight cap ' + cur); }
      return;
    }
    if (!halved && sinceChange >= rampEvery && level < ramp.length - 1) {
      level += 1; cur = ramp[level]; sinceChange = 0;
      levels.push({ atMs: Date.now() - tStart, inFlightCap: cur, why: 'no 429 -> step up' });
      out('PARALLEL: in-flight cap -> ' + cur);
    }
  }
  async function worker() {
    while (idx < queue.length && !stopped) {
      while (inFlight >= cur && !stopped) await sleep(100);
      if (stopped || idx >= queue.length) break;
      inFlight += 1; if (inFlight > peakInFlight) peakInFlight = inFlight;
      const { job, run, file } = queue[idx++];
      if (!dry && client.keyFailure && client.keyFailure()) { stopped = true; inFlight -= 1; out('KEY FAILURE (HTTP ' + client.keyFailure().status + ') — stopping the run; no further requests'); break; }
      if (!dry && client.used() >= cap) { stopped = true; inFlight -= 1; out('CAP reached — stopping'); break; }
      if (!dry && maxCalls != null && client.sentThisProcess() >= maxCalls) { stopped = true; inFlight -= 1; out('--max-calls reached — stopping'); break; }
      if (!dry && budgetInr != null && ledgerSpendInr(ledger, arg('--pr', 'PR-1')) >= budgetInr) { stopped = true; inFlight -= 1; out('BUDGET Rs ' + budgetInr + ' reached — stopping'); break; }
      let res; let calls;
      try {
        ({ out: res, calls } = await client.runInContext({ fn: job.handler, jobKey: job.jobKey, run }, () => driver.run(job)));
      } finally { inFlight -= 1; }
      sinceChange += 1;
      adjust();
      const rec = {
        jobKey: job.jobKey, run, entry: job.entry, surface: job.surface, caseIds: job.caseIds, qNumbers: job.qNumbers,
        requestDigest: job.requestDigest, model: cfg.model, thinkingBudget: cfg.thinkingBudget,
        handlerStatus: res.httpStatus, wallMs: res.wallMs, bodyDigest: digest(res.body), cacheHookCalls: res.cacheHookCalls,
        harnessError: res.harnessError ? redact(res.harnessError).slice(0, 300) : null,
        calls: calls.map((c) => ({ ok: c.ok === true, text: c.ok ? c.text : undefined, finishReason: c.finishReason || null, error: c.ok ? undefined : c.error, http: c.http || [] })),
      };
      fs.appendFileSync(file, redact(JSON.stringify(rec)) + '\n');
      finished += 1;
      const b = res.body || {};
      const summary = job.entry === 'single' ? (b.ok ? b.marksAwarded + '/' + b.totalMarks : 'ok=' + b.ok)
        : job.entry === 'set' ? (b.ok ? (b.results || []).map((x) => (x.couldNotRead ? 'CNR' : x.marksAwarded)).join(',') : 'ok=' + b.ok)
          : (b.ok ? 'topic=' + b.detectedTopic + ' n=' + (b.questions || []).length : 'ok=' + b.ok);
      out(String(finished).padStart(4) + '/' + queue.length + ' r' + run + ' ' + job.jobKey + ' HTTP ' + res.httpStatus + ' ' + res.wallMs + 'ms calls=' + calls.length + ' ' + summary + ' used=' + client.used());
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  manifest.completedAt = new Date().toISOString();
  manifest.httpStats = client.stats;
  // One entry per invocation (a run is resumable): what owner speed ruling 2 asks to report.
  manifest.parallel = (manifest.parallel || []).concat([{
    startedAt: new Date(tStart).toISOString(), wallMs: Date.now() - tStart, jobs: finished, ramp, rampEvery,
    peakJobsInFlight: peakInFlight, peakHttpInFlight: (client.stats && client.stats.peakHttpInFlight) || null,
    status429: ((client.stats && client.stats.status429) || 0), levels, timeoutMs: client.resolvedTimeoutMs,
  }]);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  out('golden live: finished ' + finished + ' jobs; ledger lines now ' + client.used() + '; stats ' + JSON.stringify(client.stats) + '; spend Rs ' + ledgerSpendInr(ledger, arg('--pr', 'PR-1')).toFixed(1) + ' (' + arg('--pr', 'PR-1') + ' ledger lines)');
  out('PARALLEL: peak ' + peakInFlight + ' jobs in flight (' + ((client.stats && client.stats.peakHttpInFlight) || 0) + ' HTTP) · 429s ' + ((client.stats && client.stats.status429) || 0) + ' · wall ' + ((Date.now() - tStart) / 1000).toFixed(1) + ' s');
}

module.exports = { ledgerSpendInr };
if (require.main === module) main().catch((e) => { out('golden live crashed: ' + ((e && e.stack) || e)); process.exit(1); });
