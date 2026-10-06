#!/usr/bin/env node
'use strict';
// goldenRebaseline.cjs — (re)generate the A17 entries of runs/<id>/rebaseline.json. ZERO model calls.
// (J0-FIXUP, audit FU-A17-REBASELINE-CLASS-UNCHECKED: the generator is committed, not a scratch script.)
//
// Every stored record of the run is replayed through the BASE post-processing (a copy of the trunk's
// lazytopper/server, e.g. `git archive <trunk> lazytopper/server | tar -x -C <dir>`) and through
// THIS checkout's. A body that differs gets an entry whose `a17.delta` lists every changed node and
// whose classes are the smallest set of A17 classes that ACCEPTS the delta (lib/rebaselineClasses.cjs);
// a body no class accepts ABORTS the run (exit 1, nothing written). An entry PR-3 already re-baselined
// keeps its `from`, its `to` moves to today's digest and its class gains the A17 class(es);
// `a17.base` is the trunk digest the delta starts from. golden.test §11 checks every entry the same way.
//
//   node server/eval/golden/goldenRebaseline.cjs --base <dir>/lazytopper/server [--run <runId>] [--write]
//   (the base copy has no node_modules: run with NODE_PATH=<this checkout>/lazytopper/node_modules)

const fs = require('fs');
const path = require('path');
const { diffBodies, classesFor } = require('./lib/rebaselineClasses.cjs');

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
  const counts = {};
  let added = 0; let updated = 0;
  try {
    for (const run of Object.keys(R.runs)) {
      for (const rec of R.runs[run]) {
        const key = 'run' + run + ':' + rec.jobKey;
        const cfg = { config: R.manifest && R.manifest.config };
        const ra = await a.replay.replayJob(planA[rec.jobKey], rec, cfg);
        const rh = await b.replay.replayJob(planB[rec.jobKey], rec, cfg);
        const baseDigest = b.planner.digest(ra.body);
        const headDigest = b.planner.digest(rh.body);
        const prior = rb.entries[key] || null;
        // drop any A17 part from an earlier generation; it is regenerated below
        if (prior && prior.a17) {
          prior.to = prior.a17.base; delete prior.a17;
          prior.class = prior.class.split('+').filter((c) => !c.startsWith('a17-')).join('+');
          if (!prior.class) delete rb.entries[key];
        }
        const entry = rb.entries[key] || null;
        if (baseDigest === headDigest) continue;
        const delta = diffBodies(ra.body, rh.body);
        const classes = classesFor(delta, rh.body);
        if (!classes) { bad.push(key + ': no A17 class accepts this change (' + delta.slice(0, 3).map((d) => d[0].join('.')).join(', ') + ')'); continue; }
        const cls = classes.join('+');
        counts[cls] = (counts[cls] || 0) + 1;
        if (entry) {
          if (entry.to !== baseDigest) { bad.push(key + ': its PR-3 entry no longer matches the base body'); continue; }
          entry.to = headDigest; entry.class = entry.class + '+' + cls; entry.a17 = { base: baseDigest, delta }; updated += 1;
        } else {
          if (rec.bodyDigest !== baseDigest) { bad.push(key + ': the stored body is not the base body'); continue; }
          rb.entries[key] = { from: rec.bodyDigest, to: headDigest, class: cls, a17: { base: baseDigest, delta } }; added += 1;
        }
      }
    }
  } finally { console.warn = quiet.warn; console.error = quiet.error; }
  process.stdout.write(JSON.stringify({ runId, added, updated, counts, bad }, null, 1) + '\n');
  if (bad.length) process.exit(1);
  if (argv.includes('--write')) {
    rb.a17 = { pr: 'A17 GRADING-RULINGS J0 (GRADING-JOBS-1)', generator: 'server/eval/golden/goldenRebaseline.cjs', counts,
      about: 'A17 owner rulings change these bodies ON PURPOSE. a17-r1-units: a unit deduction carries the one fixed unit comment, or is given back once already charged / on a pure number. a17-r2-not-attempted: a question with no attempt (blank / "Don\'t know") is NOT ATTEMPTED (0, no type, not charged) instead of a graded 0. a17-r3-medium: a Hinglish answer loses exactly one half once with the fixed medium comment; any other language deduction is given back. Each entry carries a17.base (the trunk digest) and a17.delta (every changed node); golden.test section 11 undoes the delta to a17.base and checks it against lib/rebaselineClasses.cjs.' };
    fs.writeFileSync(rbFile, JSON.stringify(rb, null, 1) + '\n');
    process.stdout.write('written ' + rbFile + '\n');
  }
}

main().catch((e) => { process.stderr.write(String(e.stack || e) + '\n'); process.exit(1); });
