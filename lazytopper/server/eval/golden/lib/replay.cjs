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
  // GRADER-CORE-1 PR-3: an explicit, digest-pinned RE-BASELINE of bodies that a later PR changed
  // ON PURPOSE (lib/evaluate.cjs). The stored live records themselves are never edited.
  let rebaseline = null;
  const rf = path.join(runDir, 'rebaseline.json');
  if (fs.existsSync(rf)) rebaseline = JSON.parse(fs.readFileSync(rf, 'utf8'));
  return { manifest, runs, detect, judge, rebaseline, runDir };
}

class ReplayExhaustedError extends Error {
  constructor(jobKey) { super('replay: no stored model response left for ' + jobKey); this.name = 'ReplayExhaustedError'; }
}

/**
 * Replay one stored job record. `planJob` is the planner's job (same jobKey).
 * `callGeminiOverride` exists ONLY so a test can prove the network block fires (M1).
 */
const modelOf = (c) => (c && c.http && c.http[0] && c.http[0].model) || null;

/**
 * Pick the stored call that answers one live request. GRADER-CORE-1 PR-3 (C8) grades a paper in
 * PARALLEL CHUNKS with one bounded retry, so calls are matched by identity, never by order:
 *   • KEYED records (written by PR-3+ live runs: every stored call carries the core's
 *     `chunkKey` — the question ids it graded — and `attempt`): the call with the same model,
 *     chunkKey and attempt. A request the record never made (the code now chunks differently)
 *     finds nothing and fails — the honest signal that a new live run is needed.
 *   • LEGACY records (PR-1/PR-2 runs: one call per routed group, plus the parse-miss retry):
 *     the k-th ATTEMPT of any chunk gets the k-th stored call for that model (the last one if
 *     there are fewer). Every chunk of a paper therefore reads the SAME whole-paper reply and
 *     takes only its own questions from it — the merged result is what the single call gave.
 *   • No attempt hint at all (a caller outside the core): first unconsumed call for the model,
 *     as before.
 * @returns {number} the index of the stored call, or -1.
 */
function pickStoredCall(calls, used, model, cfg) {
  const keyed = calls.some((c) => c && c.chunkKey);
  const attempt = cfg && Number.isFinite(cfg.attempt) ? cfg.attempt : null;
  if (keyed) {
    const key = cfg && cfg.chunkKey ? cfg.chunkKey : null;
    // A call still in flight when the job ended has no HTTP record, hence no model: its chunk
    // identity alone names it (chunk keys are question ids, unique within a request).
    return calls.findIndex((c, i) => !used.has(i) && (modelOf(c) === model || modelOf(c) === null) && (c.chunkKey || null) === key && (c.attempt || 1) === (attempt || 1));
  }
  if (attempt !== null) {
    const forModel = calls.map((_, i) => i).filter((i) => modelOf(calls[i]) === model);
    const pool = forModel.length ? forModel : calls.map((_, i) => i);
    return pool.length ? pool[Math.min(attempt, pool.length) - 1] : -1;
  }
  let at = calls.findIndex((c, i) => !used.has(i) && modelOf(c) === model);
  if (at < 0) at = calls.findIndex((_, i) => !used.has(i));
  return at;
}

async function replayJob(planJob, record, opts = {}) {
  const calls = (record.calls || []).slice();
  const used = new Set();
  const callGemini = opts.callGeminiOverride || (async (model, _contents, cfg) => {
    const at = pickStoredCall(calls, used, model, cfg);
    const next = at >= 0 ? calls[at] : null;
    if (!next) throw new ReplayExhaustedError(record.jobKey);
    used.add(at);
    if (next.ok) return { text: next.text, raw: { candidates: [{ finishReason: next.finishReason || null }] } };
    // PR-3 (C8): a call with no outcome and no HTTP record was still in flight when the live
    // job ENDED — the core stopped waiting at the request deadline (its own race), so the live
    // result was a TIMEOUT. Replay raises that same deadline error at once (no real waiting).
    if (!next.error && (!Array.isArray(next.http) || next.http.length === 0)) {
      const late = new Error('stored call still in flight at the request deadline');
      late.status = null; late.gradingDeadline = true;
      throw late;
    }
    const err = new Error(next.error ? next.error.message : 'stored model error');
    err.status = next.error ? next.error.status : null;
    throw err;
  });
  // A run recorded under the GRADER-CORE-1 grading core (manifest config `core: true`) replays
  // with the SAME grading configuration it ran with — the grading model, its thinking cap, and
  // above all the MODE: a router run splits a set into per-model groups and scores known MCQ
  // picks with no call, so replaying it in single mode would consume the wrong stored replies.
  // PR-3 (C10): detection replays on the model the run detected with — a run made with
  // `--detect-model` (a PROXY, recorded in the manifest as detectModel) names that model in
  // its detect bodies, so replaying it as gemini-2.5-flash would change every body.
  const cfg = opts.config || null;
  const detectModel = opts.detectModel || 'gemini-2.5-flash';
  const driver = cfg && cfg.core
    ? createDriver({ callGemini, model: detectModel, gradingModel: cfg.model, gradingThinkingBudget: cfg.thinkingBudget ?? null,
      gradingMode: cfg.gradingMode, gradingLightModel: cfg.lightModel })
    : createDriver({ callGemini, model: record.model || opts.model });
  const out = await driver.run(planJob);
  return {
    ...out,
    requestDigestMatches: planJob.requestDigest === record.requestDigest,
    // Distinct stored calls the replay used / never used (a legacy whole-paper reply serves
    // every chunk of its paper, and counts once).
    servedCalls: used.size,
    unusedCalls: calls.length - used.size,
    bodyChanged: record.bodyDigest ? digest(out.body) !== record.bodyDigest : null,
  };
}

module.exports = { loadRun, replayJob, readJsonl, ReplayExhaustedError, pickStoredCall };
