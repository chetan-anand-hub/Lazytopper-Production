#!/usr/bin/env node
'use strict';
// goldenJobs.cjs — GRADING-JOBS-1 J1 (D13): the ZERO-CALL JOB CASE of the golden gate.
//
// Installs the hard network block BEFORE any server module is loaded, then replays the stored
// /api/grade-worksheet replies of the G1 floor's runs (floor.json runId + extraRuns) through the
// background-job path AND the synchronous path (lib/jobReplay.cjs). Prints ONE line:
//   GOLDEN-JOBS: jobs=<n> skipped=<n> bodyDiffs=<n> finalRows=<n> provisionalRows=<n> finalRowDiffs=<n> errors=<n> calls=<n> verdict=PASS|FAIL
// FAIL when any job's final body differs from the synchronous body, any `final: true` row differs
// from its final entry, a job errors, or the network was attempted. `skipped` = stored jobs whose
// synchronous replay is not a 200 (a stored provider failure: a job has no 500 to compare).
//
//   node server/eval/golden/goldenJobs.cjs

const netblock = require('./lib/netblock.cjs');
netblock.install();

const fs = require('fs');
const path = require('path');
const { replayRunsAsJobs } = require('./lib/jobReplay.cjs');

async function main() {
  const floor = JSON.parse(fs.readFileSync(path.join(__dirname, 'floor.json'), 'utf8'));
  const runIds = [floor.runId, ...(floor.extraRuns || []).map((x) => x.runId)];
  const saved = { warn: console.warn, error: console.error };
  console.warn = () => {};
  console.error = () => {};
  let out;
  try {
    out = await replayRunsAsJobs(runIds.map((id) => path.join(__dirname, 'runs', id)));
  } finally {
    console.warn = saved.warn;
    console.error = saved.error;
  }
  const calls = netblock.attempts();
  const ok = out.jobs > 0 && out.bodyDiffs.length === 0 && out.finalRowDiffs.length === 0 && out.errors.length === 0 && calls === 0;
  process.stdout.write('GOLDEN-JOBS: jobs=' + out.jobs + ' skipped=' + out.skipped + ' bodyDiffs=' + out.bodyDiffs.length +
    ' finalRows=' + out.finalRows + ' provisionalRows=' + out.provisionalRows + ' finalRowDiffs=' + out.finalRowDiffs.length +
    ' errors=' + out.errors.length + ' calls=' + calls + ' runs=' + runIds.join(',') + ' verdict=' + (ok ? 'PASS' : 'FAIL') + '\n');
  if (!ok) {
    process.stdout.write('GOLDEN-JOBS-FAIL: ' + JSON.stringify({ bodyDiffs: out.bodyDiffs.slice(0, 5), finalRowDiffs: out.finalRowDiffs.slice(0, 5), errors: out.errors.slice(0, 5) }) + '\n');
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  process.stdout.write('GOLDEN-JOBS: crashed ' + String((e && e.stack) || e).slice(0, 500) + ' calls=' + netblock.attempts() + ' verdict=FAIL\n');
  process.exit(1);
});
