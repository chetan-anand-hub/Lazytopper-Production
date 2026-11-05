#!/usr/bin/env node
'use strict';
// goldenRebaselineKnowl.cjs — (re)generate the g-knowledge-evidence-1 part of runs/<id>/rebaseline.json. ZERO model calls.
// GRADER-QUALITY-1 (owner ruling 5 Nov 2026): a BLANK reason / justification / verification step the model typed exam
// technique WITHOUT proof of knowledge becomes the fourth state (unattempted, untyped). A copy of goldenRebaselineHabit.cjs
// with the g-knowledge-evidence-1 rules (lib/rebaselineClasses.cjs knowlViolations); it only ADDS that change. An entry
// that already exists keeps its `from` and its `a17` / `conseq` / `habit` blocks: its `to` moves to today's digest, the
// class gains g-knowledge-evidence-1, and `knowl: { base, delta }` records the change ON TOP of the previous `to`.
//
//   NODE_PATH=<this checkout>/lazytopper/node_modules node server/eval/golden/goldenRebaselineKnowl.cjs \
//       --base <copy of the previous head>/lazytopper/server [--run <runId>] [--write]

const fs = require('fs');
const path = require('path');
const { diffBodies, knowlViolations, KNOWL_CLASS } = require('./lib/rebaselineClasses.cjs');

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
        const v = knowlViolations(delta, rh.body);
        if (v.length) { bad.push(key + ': ' + v.join('; ')); continue; }
        const entry = rb.entries[key] || null;
        if (entry) {
          if (entry.knowl) { entry.to = headDigest; entry.knowl = { base: baseDigest, delta }; }
          else {
            if (entry.to !== baseDigest) { bad.push(key + ': its entry no longer matches the base body'); continue; }
            entry.to = headDigest; entry.class = entry.class + '+' + KNOWL_CLASS; entry.knowl = { base: baseDigest, delta };
          }
        } else {
          if (rec.bodyDigest !== baseDigest) { bad.push(key + ': the stored body is not the base body'); continue; }
          rb.entries[key] = { from: rec.bodyDigest, to: headDigest, class: KNOWL_CLASS, knowl: { base: baseDigest, delta } };
        }
        changed.push(key);
      }
    }
  } finally { console.warn = quiet.warn; console.error = quiet.error; }
  process.stdout.write(JSON.stringify({ runId, changed, bad }, null, 1) + '\n');
  if (bad.length) process.exit(1);
  if (argv.includes('--write')) {
    rb.knowl = { pr: 'GRADER-QUALITY-1 (owner ruling 2026-11-05)', generator: 'server/eval/golden/goldenRebaselineKnowl.cjs', count: Object.values(rb.entries).filter((e) => e.knowl).length,
      about: 'g-knowledge-evidence-1: a BLANK reason / justification / verification step the model typed exam technique without proof of knowledge becomes unattempted, untyped. No mark, note or annotation changes (lib/rebaselineClasses.cjs knowlViolations).' };
    fs.writeFileSync(rbFile, JSON.stringify(rb, null, 1) + '\n');
    process.stdout.write('written ' + rbFile + '\n');
  }
}

main().catch((e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exit(1); });
