'use strict';
// goldenTypeProbes.cjs — GRADER-TYPE-1: score a stored run of the type probes with ZERO model calls (the network is hard-blocked,
// as in goldenGate.cjs). The run is made by:
//   node server/eval/golden/goldenLive.cjs --config PA8 --runs 3 --type-probes --run-id <id> --pr GRADER-TYPE-1
// and scored by:
//   node server/eval/golden/goldenTypeProbes.cjs --run server/eval/golden/runs/<id>
// A probe PASSES an entry point only when EVERY stored run satisfies its bounds ("stable 3/3"). Exit 0 iff every probe passes on
// both entry points. It prints one line per probe and one summary line, `TYPE-PROBES: ... verdict=PASS|FAIL`.
const path = require('path');
require('./lib/netblock.cjs').install();
const { loadRun, replayJob } = require('./lib/replay.cjs');
const { buildPlan } = require('./lib/planner.cjs');
const { checkProbe } = require('./lib/typeProbes.cjs');

async function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--run');
  if (i < 0) { console.log('usage: --run <run dir> [--runs N]'); process.exit(2); }
  const need = argv.indexOf('--runs') >= 0 ? Number(argv[argv.indexOf('--runs') + 1]) : null;
  const R = loadRun(path.resolve(argv[i + 1]));
  const probes = require('./probes/grader-type-1.json').probes;
  const plan = Object.fromEntries(buildPlan({ typeProbes: true }).map((j) => [j.jobKey, j]));
  const rows = [];
  for (const p of probes) {
    for (const entry of ['S', 'W']) {
      const key = entry + '.T1.' + p.probeId;
      const per = [];
      for (const run of Object.keys(R.runs).map(Number).sort((a, b) => a - b)) {
        const rec = R.runs[run].find((r) => r.jobKey === key);
        if (!rec) continue;
        const rep = await replayJob(plan[key], rec, { config: R.manifest && R.manifest.config, schemeStep: Boolean(R.manifest && R.manifest.schemeStep) });
        const c = checkProbe(rep.body, entry === 'S' ? 'single' : 'set', p.expect);
        per.push({ run, ...c, digestOk: rep.requestDigestMatches });
      }
      const stable = per.length > 0 && per.every((x) => x.pass) && (need == null || per.length >= need);
      rows.push({ key, ruling: p.ruling, runs: per.length, pass: per.filter((x) => x.pass).length, stable });
      console.log((stable ? 'PASS ' : 'FAIL ') + key + ' [' + p.ruling + '] ' + per.filter((x) => x.pass).length + '/' + per.length + (stable ? '' : '  ' + JSON.stringify(per.map((x) => x.failures))));
    }
  }
  const ok = rows.every((r) => r.stable);
  console.log('TYPE-PROBES: probes=' + rows.length + ' stable=' + rows.filter((r) => r.stable).length + ' calls=0 verdict=' + (ok ? 'PASS' : 'FAIL'));
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e && e.stack || e); process.exit(1); });
