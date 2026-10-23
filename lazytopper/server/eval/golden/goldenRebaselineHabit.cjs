#!/usr/bin/env node
'use strict';
// goldenRebaselineHabit.cjs — (re)generate the g-mcq-habit-1 part of runs/<id>/rebaseline.json. ZERO model calls.
// MCQ-TYPE-2 (owner ruling 2026-10-23): a RIGHT MCQ with flawed working keeps its type as a 0-mark habit. A copy
// of goldenRebaselineConseq.cjs with the g-mcq-habit-1 rules; it only ADDS the habit change and never touches an
// entry's `a17` or `conseq` block.
//
// Every stored record is replayed through the BASE post-processing (a copy of the trunk's lazytopper/server,
// e.g. `git archive <trunk> lazytopper/server | tar -x -C <dir>`) and through THIS checkout's. A body that
// differs must be accepted by the g-mcq-habit-1 rules (lib/rebaselineClasses.cjs habitViolations): on a full-mark
// objective question one step gains a type and its summary count goes up by one; otherwise the run ABORTS (exit 1,
// nothing written). An accepted body gets `habit: { base, delta }`, `to` = today's digest and the class
// `g-mcq-habit-1` appended. golden.test §11b checks each such entry the same way, undoing the delta first.
//
//   NODE_PATH=<this checkout>/lazytopper/node_modules node server/eval/golden/goldenRebaselineHabit.cjs \
//       --base <dir>/lazytopper/server [--run <runId>] [--write]

const fs = require('fs');
const path = require('path');
const { diffBodies, habitViolations, HABIT_CLASS } = require('./lib/rebaselineClasses.cjs');

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
        const v = habitViolations(delta, rh.body);
        if (v.length) { bad.push(key + ': ' + v.join('; ')); continue; }
        const entry = rb.entries[key] || null;
        if (entry) {
          if (entry.habit) { entry.to = headDigest; entry.habit = { base: baseDigest, delta }; }
          else {
            if (entry.to !== baseDigest) { bad.push(key + ': its entry no longer matches the base body'); continue; }
            entry.to = headDigest; entry.class = entry.class + '+' + HABIT_CLASS; entry.habit = { base: baseDigest, delta };
          }
        } else {
          if (rec.bodyDigest !== baseDigest) { bad.push(key + ': the stored body is not the base body'); continue; }
          rb.entries[key] = { from: rec.bodyDigest, to: headDigest, class: HABIT_CLASS, habit: { base: baseDigest, delta } };
        }
        changed.push(key);
      }
    }
  } finally { console.warn = quiet.warn; console.error = quiet.error; }
  process.stdout.write(JSON.stringify({ runId, changed, bad }, null, 1) + '\n');
  if (bad.length) process.exit(1);
  if (argv.includes('--write')) {
    rb.habit = { pr: 'MCQ-TYPE-2 (owner ruling 2026-10-23)', generator: 'server/eval/golden/goldenRebaselineHabit.cjs', count: Object.values(rb.entries).filter((e) => e.habit).length,
      about: 'g-mcq-habit-1: a RIGHT objective answer with flawed working keeps its type as a 0-mark habit: one step gains a type and its summary count goes up by one. No mark, status, annotation, marksLostByType or note changes (lib/rebaselineClasses.cjs habitViolations).' };
    fs.writeFileSync(rbFile, JSON.stringify(rb, null, 1) + '\n');
    process.stdout.write('written ' + rbFile + '\n');
  }
}

main().catch((e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exit(1); });
