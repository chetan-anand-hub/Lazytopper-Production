#!/usr/bin/env node
'use strict';
// goldenReport.cjs — render the owner-target scorecard for one or more stored runs as
// markdown (and JSON). ZERO model calls: replays each run with the network blocked.
//
//   node server/eval/golden/goldenReport.cjs --run <dirA> [--run <dirB> ...] [--md out.md] [--json out.json]
//
// Used to produce the PR-1 baseline + model comparison table; reusable for any later run.

const netblock = require('./lib/netblock.cjs');
netblock.install();

const fs = require('fs');
const path = require('path');
const { evaluateRun } = require('./lib/evaluate.cjs');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const USD_INR = Number(arg('--usd-inr', '88')); // lazytopper/server/services/modelPrices.cjs DEFAULT_USD_INR

const f = (r) => (r && r.n ? r.pass + '/' + r.n + ' = ' + r.pct + '%' : 'n/a');
const s = (ms) => (ms == null ? 'n/a' : (ms / 1000).toFixed(1) + ' s');
const T = { mcq: 100, total_exact: 90, within_half: 100, wrong_step: 90, type: 85, comments: 100, chapter: 95, run_to_run: 95, single_vs_set: 100, injection: 100, m13_declined: 100, owner_paper: 100 };
const pf = (v, t) => (v === null || v === undefined ? '' : v >= t ? ' PASS' : ' MISS');

async function main() {
  // Repeat --run per run directory (a comma list is mangled by MSYS path conversion on Windows).
  const dirs = argv.map((a, i) => (a === '--run' ? argv[i + 1] : null)).filter(Boolean).map((d) => path.resolve(d));
  const quiet = { warn: console.warn, error: console.error };
  console.warn = () => {}; console.error = () => {};
  const evs = [];
  for (const d of dirs) evs.push({ dir: d, ev: await evaluateRun(d) });
  console.warn = quiet.warn; console.error = quiet.error;
  let md = '';
  const head = '| target (owner bar) | ' + evs.map((e) => '**' + e.ev.manifest.config.id + '** (' + e.ev.manifest.config.label + ')').join(' | ') + ' |\n|---|' + evs.map(() => '---|').join('') + '\n';
  md += head;
  const row = (name, fn) => { md += '| ' + name + ' | ' + evs.map((e) => fn(e.ev.res, e.ev)).join(' | ') + ' |\n'; };
  for (const g of ['P3', 'P4', 'combined']) {
    const lab = g === 'P3' ? 'single grader (P3)' : g === 'P4' ? 'set grader (P4)' : 'both graders';
    row('MCQ exact, ' + lab + ' (100%)', (r) => f(r.perGrader[g].mcq) + pf(r.perGrader[g].mcq.pct, T.mcq));
    row('total exact, ' + lab + ' (>= 90%)', (r) => f(r.perGrader[g].total_exact) + pf(r.perGrader[g].total_exact.pct, T.total_exact));
    row('total within 1/2, ' + lab + ' (100%)', (r) => f(r.perGrader[g].within_half) + pf(r.perGrader[g].within_half.pct, T.within_half));
    row('wrong step located, ' + lab + ' (>= 90%)', (r) => f(r.perGrader[g].wrong_step) + pf(r.perGrader[g].wrong_step.pct, T.wrong_step));
    row('mistake type, ' + lab + ' (>= 85%)', (r) => f(r.perGrader[g].type) + pf(r.perGrader[g].type.pct, T.type));
    row('comments true — deterministic rules, ' + lab + ' (100%)', (r) => f(r.perGrader[g].comments_det) + pf(r.perGrader[g].comments_det.pct, T.comments));
    row('comments true — LLM judge, ' + lab + ' (100%)', (r) => f(r.perGrader[g].comments_judge) + pf(r.perGrader[g].comments_judge.pct, T.comments));
    row('run-to-run, counting timeouts, ' + lab + ' (>= 95%)', (r) => f(r.runToRun[g]) + pf(r.runToRun[g].pct, T.run_to_run));
    row('grade consistency (S4 grade-level checks), ' + lab, (r) => f(r.perGrader[g].consistency));
    row('status mix, ' + lab, (r) => JSON.stringify(r.perGrader[g].status).replace(/"/g, ''));
  }
  row('single vs set agree, identical input (100%)', (r) => f(r.singleVsSet) + pf(r.singleVsSet.pct, T.single_vs_set));
  row('injection moves no mark (100%)', (r) => f(r.injection) + pf(r.injection.pct, T.injection));
  row('GS-M13-a declined by both (all runs)', (r) => 'P3 ' + r.m13.P3.declined + '/' + r.m13.P3.n + ', P4 ' + r.m13.P4.declined + '/' + r.m13.P4.n + (r.m13.both ? ' PASS' : ' MISS'));
  row('owner-anomaly-01 questions within 1/2 (100%)', (r) => f({ n: r.owner.n, pass: r.owner.pass, pct: r.owner.pct }) + pf(r.owner.pct, T.owner_paper));
  row('owner-anomaly-01 total per run (key 15/24)', (r) => r.owner.runs.map((x) => 'r' + x.run + ' ' + (x.total == null ? x.status : x.total)).join(', '));
  row('chapter (detect-question, per item) (>= 95%)', (r) => f(r.chapter) + pf(r.chapter.pct, T.chapter));
  row('latency P3 p50 / p95 / max', (r) => s(r.ops.P3.p50) + ' / ' + s(r.ops.P3.p95) + ' / ' + s(r.ops.P3.max));
  row('latency P4 set p50 / p95 / max', (r) => s(r.ops.P4.p50) + ' / ' + s(r.ops.P4.p95) + ' / ' + s(r.ops.P4.max));
  row('latency owner 10-question paper p50 / p95 / max', (r) => s(r.ops.owner.p50) + ' / ' + s(r.ops.owner.p95) + ' / ' + s(r.ops.owner.max));
  row('timeouts (55 s) P3 / P4 / owner', (r) => r.ops.P3.timeouts + ' / ' + r.ops.P4.timeouts + ' / ' + r.ops.owner.timeouts);
  row('HTTP 429s', (r) => String(r.ops.P3.s429 + r.ops.P4.s429 + r.ops.owner.s429));
  row('mean tokens per call P3 prompt / output / thinking', (r) => r.ops.P3.meanPrompt + ' / ' + r.ops.P3.meanOutput + ' / ' + r.ops.P3.meanThinking);
  row('mean tokens per call P4 prompt / output / thinking', (r) => r.ops.P4.meanPrompt + ' / ' + r.ops.P4.meanOutput + ' / ' + r.ops.P4.meanThinking);
  const cost = (o) => (o.usdPerGradedQuestion == null ? 'n/a' : '$' + o.usdPerGradedQuestion.toFixed(4) + ' (Rs ' + (o.usdPerGradedQuestion * USD_INR).toFixed(2) + ')');
  row('cost per graded question P3', (r) => cost(r.ops.P3));
  row('cost per graded question P4', (r) => cost(r.ops.P4));
  row('cost per graded question, owner paper', (r) => cost(r.ops.owner));
  row('grading cost of this run (all jobs)', (r) => '$' + (r.ops.P3.usd + r.ops.P4.usd + r.ops.owner.usd).toFixed(2));
  if (arg('--md')) fs.writeFileSync(arg('--md'), md);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(evs.map((e) => ({ dir: e.dir, metrics: e.ev.metrics, integrity: e.ev.integrity, res: { ...e.ev.res, rows: undefined } })), null, 1));
  process.stdout.write(md);
  process.stdout.write('calls=' + netblock.attempts() + '\n');
}

main().catch((e) => { process.stderr.write(String((e && e.stack) || e) + '\n'); process.exit(1); });
