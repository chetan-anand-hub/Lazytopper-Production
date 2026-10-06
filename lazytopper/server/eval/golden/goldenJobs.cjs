#!/usr/bin/env node
'use strict';
// goldenJobs.cjs — GRADING-JOBS-1 J1 (D13): the ZERO-CALL JOB CASE of the golden gate.
//
// Installs the hard network block BEFORE any server module is loaded, then replays the stored
// /api/grade-worksheet replies of the G1 floor's runs (floor.json runId + extraRuns) through the
// background-job path AND the synchronous path (lib/jobReplay.cjs). Prints ONE line:
//   GOLDEN-JOBS: jobs=<n> skipped=<n> bodyDiffs=<n> finalRows=<n> provisionalRows=<n> finalRowDiffs=<n> errors=<n>
//     multiChunkPapers=<n> multiChunkOneDocument=<n> multiChunkFinalRows=<n> flipParts=<n> flipProvisionalChanged=<n> calls=<n> verdict=PASS|FAIL
// FAIL when any job's final body differs from the synchronous body, any `final: true` row differs
// from its final entry, a job errors, or the network was attempted. `skipped` = stored jobs whose
// synchronous replay is not a 200 (a stored provider failure: a job has no 500 to compare).
//
// J1 FIXUP (audit Q5): the floor runs hold only papers graded in ONE call, where a row's own inventory
// IS the paper's union, so they cannot exercise the stable rule. The gate therefore ALSO replays the
// PR-3 run (its papers > 10 questions were graded in chunks of 3, several of them one-document), and a
// SYNTHETIC multi-chunk one-document paper with a real verdict flip (lib/jobReplay.cjs
// syntheticFlipCase). It FAILS unless the STORED replies contain at least one multi-chunk one-document
// paper, and unless the synthetic paper is multi-chunk and its provisional row really changed at done.
// A case that cannot contain the multi-chunk union is not allowed to pass.
//
//   node server/eval/golden/goldenJobs.cjs

const netblock = require('./lib/netblock.cjs');
netblock.install();

const fs = require('fs');
const path = require('path');
const { replayRunsAsJobs } = require('./lib/jobReplay.cjs');

/** Stored runs whose papers were graded in SEVERAL chunks (GRADER-CORE-1 PR-3: chunks of 3 above 10 Qs). */
const MULTI_CHUNK_RUNS = ['2026-10-06.PR3-combined-flash38'];

async function main() {
  const floor = JSON.parse(fs.readFileSync(path.join(__dirname, 'floor.json'), 'utf8'));
  const runIds = [floor.runId, ...(floor.extraRuns || []).map((x) => x.runId), ...MULTI_CHUNK_RUNS];
  const saved = { warn: console.warn, error: console.error };
  console.warn = () => {};
  console.error = () => {};
  let out;
  try {
    out = await replayRunsAsJobs(runIds.map((id) => path.join(__dirname, 'runs', id)), { syntheticFlip: true });
  } finally {
    console.warn = saved.warn;
    console.error = saved.error;
  }
  const calls = netblock.attempts();
  const flip = out.syntheticFlip || {};
  const ok = out.jobs > 0 && out.bodyDiffs.length === 0 && out.finalRowDiffs.length === 0 && out.errors.length === 0 && calls === 0
    && out.storedMultiChunkPapers >= 1 && out.storedMultiChunkOneDocument >= 1
    && flip.parts > 1 && flip.provisionalChanged >= 1 && flip.bodyEqual === true;
  process.stdout.write('GOLDEN-JOBS: jobs=' + out.jobs + ' skipped=' + out.skipped + ' bodyDiffs=' + out.bodyDiffs.length +
    ' finalRows=' + out.finalRows + ' provisionalRows=' + out.provisionalRows + ' finalRowDiffs=' + out.finalRowDiffs.length +
    ' errors=' + out.errors.length + ' multiChunkPapers=' + out.storedMultiChunkPapers + ' multiChunkOneDocument=' + out.storedMultiChunkOneDocument +
    ' multiChunkFinalRows=' + out.storedMultiChunkFinalRows + ' flipParts=' + (flip.parts || 0) + ' flipProvisionalChanged=' + (flip.provisionalChanged || 0) + ' calls=' + calls + ' runs=' + runIds.join(',') + ' verdict=' + (ok ? 'PASS' : 'FAIL') + '\n');
  if (!ok) {
    process.stdout.write('GOLDEN-JOBS-FAIL: ' + JSON.stringify({ bodyDiffs: out.bodyDiffs.slice(0, 5), finalRowDiffs: out.finalRowDiffs.slice(0, 5), errors: out.errors.slice(0, 5) }) + '\n');
  }
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  process.stdout.write('GOLDEN-JOBS: crashed ' + String((e && e.stack) || e).slice(0, 500) + ' calls=' + netblock.attempts() + ' verdict=FAIL\n');
  process.exit(1);
});
