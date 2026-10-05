'use strict';
// lib/evaluate.cjs — replay a stored run through the CURRENT post-processing and score it.
// Shared by the CI gate (goldenGate.cjs) and the live script's scoring step.

const { loadRun, replayJob } = require('./replay.cjs');
const { buildPlan, digest } = require('./planner.cjs');
const { score, headline } = require('./score.cjs');

async function evaluateRun(runDir, opts = {}) {
  const R = loadRun(runDir);
  const plan = Object.fromEntries(buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
  const integrity = { jobs: 0, missingFromPlan: [], requestDigestMismatch: [], replayIncomplete: [], changed: 0, rebaselined: 0, rebaselineStale: [] };
  // GRADER-CORE-1 PR-3 · runs/<id>/rebaseline.json: a body that today's post-processing changes ON
  // PURPOSE (a new opt-in field, a deterministic repair) is accepted ONLY when the stored digest
  // (`from`) and today's digest (`to`) both match its entry exactly; any other change still
  // counts. An entry that no longer matches anything is STALE and fails the gate, so the file
  // can never silently cover a future change.
  const rb = (R.rebaseline && R.rebaseline.entries) || {};
  const usedRb = new Set();
  const items = [];
  const detectItems = [];
  const one = async (record, run, sink, kind) => {
    const job = plan[record.jobKey];
    integrity.jobs += 1;
    if (!job) { integrity.missingFromPlan.push(record.jobKey); return; }
    const rep = await replayJob(job, record, { callGeminiOverride: opts.callGeminiOverride, config: R.manifest && R.manifest.config, detectModel: R.manifest && R.manifest.detectModel });
    if (!rep.requestDigestMatches) integrity.requestDigestMismatch.push(record.jobKey + '#' + run);
    if (rep.unusedCalls > 0 || rep.servedCalls !== (record.calls || []).length) integrity.replayIncomplete.push(record.jobKey + '#' + run);
    if (rep.bodyChanged) {
      const key = kind + ':' + record.jobKey;
      const e = rb[key];
      if (e && e.from === record.bodyDigest && e.to === digest(rep.body)) { integrity.rebaselined += 1; usedRb.add(key); } else integrity.changed += 1;
    }
    sink.push({ job, run, record, rep });
  };
  for (const run of Object.keys(R.runs).map(Number).sort((a, b) => a - b)) {
    for (const record of R.runs[run]) await one(record, run, items, 'run' + run);
  }
  for (const record of R.detect) await one(record, 1, detectItems, 'detect');
  for (const key of Object.keys(rb)) if (!usedRb.has(key)) integrity.rebaselineStale.push(key);
  const res = score({ items, detectItems, judge: R.judge, v2: opts.v2 });
  return { res, metrics: headline(res), integrity, manifest: R.manifest, judgePresent: Boolean(R.judge) };
}

module.exports = { evaluateRun };
