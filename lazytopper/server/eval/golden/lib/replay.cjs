'use strict';
// lib/replay.cjs — replay STORED raw model responses through the CURRENT post-processing.
//
// For each stored job the planner re-derives the request (its digest must equal the one
// recorded at live time), and the REAL handlers run with a `callGemini` that returns the
// stored raw model text for each logical call, in order — or re-throws the stored error
// (a 55 s timeout, an HTTP error) so the handler takes the same failure path. Nothing here
// can reach a model: there is no client, no key and no URL in this module, and the CI
// entry point installs lib/netblock.cjs before loading it.

const fs = require('fs');
const path = require('path');
const { createDriver } = require('./driver.cjs');
const { digest } = require('./planner.cjs');

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l));
}

function loadRun(runDir) {
  const manifest = JSON.parse(fs.readFileSync(path.join(runDir, 'manifest.json'), 'utf8'));
  const runs = {};
  for (const f of fs.readdirSync(runDir)) {
    const m = f.match(/^run(\d+)\.jsonl$/);
    if (m) runs[Number(m[1])] = readJsonl(path.join(runDir, f));
  }
  const detect = readJsonl(path.join(runDir, 'detect.jsonl'));
  let judge = null;
  const jf = path.join(runDir, 'judge.json');
  if (fs.existsSync(jf)) judge = JSON.parse(fs.readFileSync(jf, 'utf8'));
  return { manifest, runs, detect, judge, runDir };
}

class ReplayExhaustedError extends Error {
  constructor(jobKey) { super('replay: no stored model response left for ' + jobKey); this.name = 'ReplayExhaustedError'; }
}

/**
 * Replay one stored job record. `planJob` is the planner's job (same jobKey).
 * `callGeminiOverride` exists ONLY so a test can prove the network block fires (M1).
 */
async function replayJob(planJob, record, opts = {}) {
  const queue = (record.calls || []).slice();
  let served = 0;
  const callGemini = opts.callGeminiOverride || (async () => {
    const next = queue.shift();
    if (!next) throw new ReplayExhaustedError(record.jobKey);
    served += 1;
    if (next.ok) return { text: next.text, raw: { candidates: [{ finishReason: next.finishReason || null }] } };
    const err = new Error(next.error ? next.error.message : 'stored model error');
    err.status = next.error ? next.error.status : null;
    throw err;
  });
  const driver = createDriver({ callGemini, model: record.model || opts.model });
  const out = await driver.run(planJob);
  return {
    ...out,
    requestDigestMatches: planJob.requestDigest === record.requestDigest,
    servedCalls: served,
    unusedCalls: queue.length,
    bodyChanged: record.bodyDigest ? digest(out.body) !== record.bodyDigest : null,
  };
}

module.exports = { loadRun, replayJob, readJsonl, ReplayExhaustedError };
