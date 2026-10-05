'use strict';
// lib/evaluate.cjs — replay a stored run through the CURRENT post-processing and score it.
// Shared by the CI gate (goldenGate.cjs) and the live script's scoring step.

const { loadRun, replayJob } = require('./replay.cjs');
const { buildPlan } = require('./planner.cjs');
const { score, headline } = require('./score.cjs');

async function evaluateRun(runDir, opts = {}) {
  const R = loadRun(runDir);
  const plan = Object.fromEntries(buildPlan({ includeDetect: true }).map((j) => [j.jobKey, j]));
  const integrity = { jobs: 0, missingFromPlan: [], requestDigestMismatch: [], replayIncomplete: [], changed: 0 };
  const items = [];
  const detectItems = [];
  const one = async (record, run, sink) => {
    const job = plan[record.jobKey];
    integrity.jobs += 1;
    if (!job) { integrity.missingFromPlan.push(record.jobKey); return; }
    const rep = await replayJob(job, record, { callGeminiOverride: opts.callGeminiOverride });
    if (!rep.requestDigestMatches) integrity.requestDigestMismatch.push(record.jobKey + '#' + run);
    if (rep.unusedCalls > 0 || rep.servedCalls !== (record.calls || []).length) integrity.replayIncomplete.push(record.jobKey + '#' + run);
    if (rep.bodyChanged) integrity.changed += 1;
    sink.push({ job, run, record, rep });
  };
  for (const run of Object.keys(R.runs).map(Number).sort((a, b) => a - b)) {
    for (const record of R.runs[run]) await one(record, run, items);
  }
  for (const record of R.detect) await one(record, 1, detectItems);
  const res = score({ items, detectItems, judge: R.judge, v2: opts.v2 });
  return { res, metrics: headline(res), integrity, manifest: R.manifest, judgePresent: Boolean(R.judge) };
}

module.exports = { evaluateRun };
