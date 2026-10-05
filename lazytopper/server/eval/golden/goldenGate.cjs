#!/usr/bin/env node
'use strict';
// goldenGate.cjs — G1, the ZERO-CALL golden gate (CI: .github/workflows/golden-eval.yml).
//
// 1. Installs the hard network block BEFORE any server module is loaded.
// 2. Replays the stored raw model responses of the floor's run (golden/runs/<runId>/)
//    through the CURRENT post-processing (the real handlers; lib/replay.cjs).
// 3. Scores them against the truth data (lib/score.cjs) and checks every floor metric.
// 4. Prints ONE line:  GOLDEN: <metric=value ...> calls=0 floor=<file> verdict=PASS|FAIL
//
// FAIL when: any network attempt (calls > 0); a stored job's request no longer re-derives
// (requestDigest mismatch) or is missing from the plan; a replay did not consume exactly its
// stored responses; or ANY floor metric fell below its floor (each one is named).
// `changed=<n>` counts outputs whose replayed body differs from the body recorded live —
// informational (a post-processing change is allowed to move grades, but not below the floor).
//
//   node server/eval/golden/goldenGate.cjs [--floor golden/floor.json] [--json out.json] [--write-floor]

const netblock = require('./lib/netblock.cjs');
netblock.install();

const fs = require('fs');
const path = require('path');
const { evaluateRun } = require('./lib/evaluate.cjs');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const FLOOR = path.resolve(arg('--floor', path.join(__dirname, 'floor.json')));
const EPS = 1e-9;

function fmt(v) { return v === null || v === undefined ? 'na' : String(v); }

async function main() {
  const floor = JSON.parse(fs.readFileSync(FLOOR, 'utf8'));
  const runDir = path.join(__dirname, 'runs', floor.runId);
  // The real handlers log parse misses and provider errors (console.warn/error) while the
  // stored failures replay; keep the CI log to the one GOLDEN line and count them instead.
  let handlerLogs = 0;
  const saved = { warn: console.warn, error: console.error };
  console.warn = () => { handlerLogs += 1; };
  console.error = () => { handlerLogs += 1; };
  // Extra replayed runs (e.g. the owner-paper diagnostic): each carries its own floor
  // metrics, reported in the GOLDEN line as `<label>.<metric>=`.
  const extras = [];
  let ev;
  try {
    ev = await evaluateRun(runDir);
    for (const x of floor.extraRuns || []) extras.push({ x, ev: await evaluateRun(path.join(__dirname, 'runs', x.runId)) });
  } finally { console.warn = saved.warn; console.error = saved.error; }
  const calls = netblock.attempts();
  const reasons = [];
  if (calls > 0) reasons.push('network attempted ' + calls + 'x (' + netblock.attemptLog().slice(0, 3).join('; ') + ')');
  const I = { ...ev.integrity };
  for (const { ev: e } of extras) {
    I.jobs += e.integrity.jobs; I.changed += e.integrity.changed;
    I.missingFromPlan = I.missingFromPlan.concat(e.integrity.missingFromPlan);
    I.requestDigestMismatch = I.requestDigestMismatch.concat(e.integrity.requestDigestMismatch);
    I.replayIncomplete = I.replayIncomplete.concat(e.integrity.replayIncomplete);
  }
  if (I.missingFromPlan.length) reasons.push('jobs missing from plan: ' + I.missingFromPlan.slice(0, 5).join(','));
  if (I.requestDigestMismatch.length) reasons.push('request digest mismatch: ' + I.requestDigestMismatch.slice(0, 5).join(','));
  if (I.replayIncomplete.length) reasons.push('replay incomplete: ' + I.replayIncomplete.slice(0, 5).join(','));
  const below = [];
  const check = (prefix, floorMetrics, cur) => {
    for (const [k, f] of Object.entries(floorMetrics || {})) {
      if (f === null || f === undefined) continue;
      const v = cur[k];
      if (v === null || v === undefined || v < f - EPS) below.push(prefix + k + '=' + fmt(v) + '<floor ' + f);
    }
  };
  check('', floor.metrics, ev.metrics);
  for (const { x, ev: e } of extras) check(x.label + '.', x.metrics, e.metrics);
  if (below.length) reasons.push('below floor: ' + below.join(', '));
  if (argv.includes('--write-floor')) {
    const next = { ...floor, generatedAt: new Date().toISOString(), metrics: ev.metrics,
      extraRuns: extras.map(({ x, ev: e }) => ({ ...x, metrics: Object.fromEntries((x.keys || Object.keys(e.metrics)).map((k) => [k, e.metrics[k]])) })) };
    if (!next.extraRuns.length) delete next.extraRuns;
    fs.writeFileSync(FLOOR, JSON.stringify(next, null, 1) + '\n');
  }
  const verdict = reasons.length ? 'FAIL' : 'PASS';
  const extraMetrics = extras.flatMap(({ x, ev: e }) => (x.keys || Object.keys(e.metrics)).map((k) => x.label + '.' + k + '=' + fmt(e.metrics[k])));
  const metricStr = Object.entries(ev.metrics).map(([k, v]) => k + '=' + fmt(v)).concat(extraMetrics).join(' ');
  const rel = path.relative(path.join(__dirname, '..', '..', '..'), FLOOR).replace(/\\/g, '/');
  const jsonOut = arg('--json');
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ metrics: ev.metrics, integrity: I, reasons, res: { ...ev.res, rows: undefined } }, null, 1));
  process.stdout.write('GOLDEN: ' + metricStr + ' jobs=' + I.jobs + ' changed=' + I.changed + ' handlerLogs=' + handlerLogs + ' calls=' + calls + ' floor=' + rel + ' verdict=' + verdict + '\n');
  if (reasons.length) process.stdout.write('GOLDEN-FAIL-REASONS: ' + reasons.join(' | ') + '\n');
  process.exit(verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => {
  process.stdout.write('GOLDEN: crashed ' + String((e && e.stack) || e).slice(0, 500) + ' calls=' + netblock.attempts() + ' verdict=FAIL\n');
  process.exit(1);
});
