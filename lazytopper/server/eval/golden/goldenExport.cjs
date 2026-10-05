#!/usr/bin/env node
'use strict';
// goldenExport.cjs — controller decision D22: the post-processed response BODIES of a stored
// run, at stable paths, for Controller B's G3 replay. ZERO model calls (network blocked).
//
//   node server/eval/golden/goldenExport.cjs --run <run-dir> [--run-number 1] [--out server/eval/golden/responses]
//
// Writes <out>/legacy/<caseId>.<single|set>.json (the request as the surface sends it) and
// <out>/v2/<caseId>.<single|set>.json (the same request with acceptsV2: true), plus
// <out>/manifest.json naming, per file, the job, surface, qNumber and run it came from.
// v2: a job's own stored V2.* copy is used where the run has one (its own model reply);
// otherwise the legacy job's stored reply is replayed with acceptsV2 added — faithful, because
// acceptsV2 never reaches the prompt (it shapes the response only). For a set job the FULL set
// body is written under each of its case ids (qNumber gives the entry); a case in several set
// jobs takes the first in plan order. Every string written passes the redactor.

const netblock = require('./lib/netblock.cjs');
netblock.install();

const fs = require('fs');
const path = require('path');
const { loadRun, replayJob } = require('./lib/replay.cjs');
const { buildPlan } = require('./lib/planner.cjs');
const { redact } = require('./lib/redact.cjs');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };

async function main() {
  const runDir = path.resolve(arg('--run'));
  const runNo = Number(arg('--run-number', '1'));
  const out = path.resolve(arg('--out', path.join(__dirname, 'responses')));
  const quiet = { warn: console.warn, error: console.error };
  console.warn = () => {}; console.error = () => {};
  const R = loadRun(runDir);
  const records = Object.fromEntries((R.runs[runNo] || []).map((r) => [r.jobKey, r]));
  const plan = buildPlan({});
  const files = [];
  const taken = { legacy: new Set(), v2: new Set() };
  for (const d of ['legacy', 'v2']) fs.mkdirSync(path.join(out, d), { recursive: true });
  for (const job of plan) {
    if (job.jobKey.startsWith('V2.')) continue;
    const rec = records[job.jobKey];
    if (!rec) continue;
    const kind = job.entry === 'single' ? 'single' : 'set';
    for (const flavour of ['legacy', 'v2']) {
      let planJob = job; let record = rec; let source = job.jobKey;
      if (flavour === 'v2') {
        const own = plan.find((j) => j.jobKey === 'V2.' + job.jobKey);
        if (own && records[own.jobKey]) { planJob = own; record = records[own.jobKey]; source = own.jobKey; }
        else planJob = { ...job, request: { ...job.request, acceptsV2: true } };
      }
      const pending = job.caseIds.filter((cid) => !taken[flavour].has(cid + '.' + kind));
      if (!pending.length) continue;
      const rep = await replayJob(planJob, record, { config: R.manifest.config });
      for (const cid of pending) {
        taken[flavour].add(cid + '.' + kind);
        const file = cid + '.' + kind + '.json';
        fs.writeFileSync(path.join(out, flavour, file), redact(JSON.stringify(rep.body, null, 1)) + '\n');
        if (flavour === 'legacy') {
          files.push({ caseId: cid, kind, file, jobKey: job.jobKey, v2JobKey: source === job.jobKey ? null : source, surface: job.surface, qNumber: job.qNumbers[cid], httpStatus: rep.httpStatus, run: path.basename(runDir) + '/run' + runNo });
        }
      }
    }
  }
  console.warn = quiet.warn; console.error = quiet.error;
  const manifest = {
    about: 'D22 FINAL: post-processed response bodies of the GRADER-CORE-1 PR-2 ACCEPTANCE run (' + path.basename(runDir) + ', run ' + runNo + '), replayed through the shipped post-processing with zero model calls. legacy/ = the request as the surface sends it; v2/ = acceptsV2:true (the run\'s own V2.* reply where one exists, else the same stored reply — acceptsV2 never reaches the prompt). For a set job the FULL set body is written under each of its case ids (qNumber gives the entry). Includes the controller papers (CP*), the answer-mismatch cases (GS-MM-*) and the one-answer Chapter-Test case (P0-*).',
    shippedConfig: R.manifest.config,
    runs: [path.basename(runDir)],
    networkAttempts: netblock.attempts(),
    files,
  };
  fs.writeFileSync(path.join(out, 'manifest.json'), redact(JSON.stringify(manifest, null, 1)) + '\n');
  process.stdout.write('golden export: ' + files.length + ' cases x 2 (legacy, v2) -> ' + out + ' calls=' + netblock.attempts() + '\n');
}

main().catch((e) => { process.stdout.write('golden export crashed: ' + String((e && e.stack) || e) + '\n'); process.exit(1); });
