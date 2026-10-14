#!/usr/bin/env node
'use strict';
// goldenRebaselineConseq.cjs — (re)generate the g-conseq-1 part of runs/<id>/rebaseline.json. ZERO model calls.
// GRADER-CONSEQUENTIAL-1 (D242). The sibling of goldenRebaseline.cjs (A17): that generator rebuilds the A17
// generation from a pre-A17 base; this one only ADDS the consequential-attribution change on top of whatever
// the entry already pins, and never touches an entry's `a17` block.
//
// Every stored record is replayed through the BASE post-processing (a copy of the trunk's lazytopper/server,
// e.g. `git archive <trunk> lazytopper/server | tar -x -C <dir>`) and through THIS checkout's. A body that
// differs must be accepted by the g-conseq-1 rules (lib/rebaselineClasses.cjs conseqViolations): only the
// loss buckets move (total unchanged) and steps gain `consequentialOf`; otherwise the run ABORTS (exit 1,
// nothing written). An accepted body gets `conseq: { base, delta }`, `to` = today's digest and the class
// `g-conseq-1` appended. golden.test §11b checks each such entry the same way, undoing the delta first.
//
//   NODE_PATH=<this checkout>/lazytopper/node_modules node server/eval/golden/goldenRebaselineConseq.cjs \
//       --base <dir>/lazytopper/server [--run <runId>] [--write]

const fs = require('fs');
const path = require('path');
const { diffBodies, conseqViolations, CONSEQ_CLASS } = require('./lib/rebaselineClasses.cjs');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const HEAD_SERVER = path.join(__dirname, '..', '..');

function load(serverDir) {
  const g = path.join(serverDir, 'eval', 'golden');
  return { replay: require(path.join(g, 'lib', 'replay.cjs')), planner: require(path.join(g, 'lib', 'planner.cjs')) };
}

async function main() {
  const baseDir = arg('--base');
  if (!baseDir) { process.stderr.write('usage: --base <trunk copy>/lazytopper/server [--run <runId>] [--write]\n'); process.exit(2); }
  const floor = JSON.parse(fs.readFileSync(path.join(__dirname, 'floor.json'), 'utf8'));
  const runId = arg('--run', floor.runId);
  const runDir = path.join(__dirname, 'runs', runId);
  const a = load(path.resolve(baseDir));
  const b = load(HEAD_SERVER);
  const planA = Object.fromEntries(a.planner.buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
  const planB = Object.fromEntries(b.planner.buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
  const R = b.replay.loadRun(runDir);
  const rbFile = path.join(runDir, 'rebaseline.json');
  const rb = JSON.parse(fs.readFileSync(rbFile, 'utf8'));
  const quiet = { warn: console.warn, error: console.error };
  console.warn = () => {}; console.error = () => {};
  const bad = [];
  const changed = [];
  try {
    for (const run of Object.keys(R.runs)) {
      for (const rec of R.runs[run]) {
        const key = 'run' + run + ':' + rec.jobKey;
        const cfg = { config: R.manifest && R.manifest.config };
        const ra = await a.replay.replayJob(planA[rec.jobKey], rec, cfg);
        const rh = await b.replay.replayJob(planB[rec.jobKey], rec, cfg);
        const baseDigest = b.planner.digest(ra.body);
        const headDigest = b.planner.digest(rh.body);
        if (baseDigest === headDigest) continue;
        const delta = diffBodies(ra.body, rh.body);
        const v = conseqViolations(delta, rh.body);
        if (v.length) { bad.push(key + ': ' + v.join('; ')); continue; }
        const entry = rb.entries[key] || null;
        if (entry) {
          if (entry.conseq) { entry.to = headDigest; entry.conseq = { base: baseDigest, delta }; }
          else {
            if (entry.to !== baseDigest) { bad.push(key + ': its entry no longer matches the base body'); continue; }
            entry.to = headDigest; entry.class = entry.class + '+' + CONSEQ_CLASS; entry.conseq = { base: baseDigest, delta };
          }
        } else {
          if (rec.bodyDigest !== baseDigest) { bad.push(key + ': the stored body is not the base body'); continue; }
          rb.entries[key] = { from: rec.bodyDigest, to: headDigest, class: CONSEQ_CLASS, conseq: { base: baseDigest, delta } };
        }
        changed.push(key);
      }
    }
  } finally { console.warn = quiet.warn; console.error = quiet.error; }
  process.stdout.write(JSON.stringify({ runId, changed, bad }, null, 1) + '\n');
  if (bad.length) process.exit(1);
  if (argv.includes('--write')) {
    rb.conseq = { pr: 'GRADER-CONSEQUENTIAL-1 (D242)', generator: 'server/eval/golden/goldenRebaselineConseq.cjs', count: Object.values(rb.entries).filter((e) => e.conseq).length,
      about: 'g-conseq-1: a loss that follows from an earlier typed error moves from "untyped" to that error\'s type, and the step records consequentialOf. No mark, status, type, note or annotation changes (lib/rebaselineClasses.cjs conseqViolations).' };
    fs.writeFileSync(rbFile, JSON.stringify(rb, null, 1) + '\n');
    process.stdout.write('written ' + rbFile + '\n');
  }
}

main().catch((e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exit(1); });
