'use strict';
// lib/driver.cjs — run one golden job through the REAL production route handlers.
//
// The handlers come from the tracked `createCheckSolutionRoute`
// (routes/checkSolution.cjs), wired with the same primitives server/index.cjs and
// routes/questions.cjs give it (httpUtils sendJson + extractJsonObjectFromText,
// mentorImageSupport buildGeminiImagePart + validateMentorImagePayload). Prompt
// building, the parse gate + retry and the ONE post-processing path
// (server/grading/ — GRADER-CORE-1 PR-2) all run exactly as they ship. ONLY `callGemini` is injected:
//   * LIVE   — lib/live.cjs wraps the real geminiClient (key from the env, ledger, cap)
//   * REPLAY — lib/replay.cjs returns the stored raw model text, network hard-blocked
//   * SHAPE  — the G2 guard passes a canned model reply
//
// Stubbed, and why (identical to the audit's harness, grader-audit-1/s3/harness/run.cjs):
//   * no fair-use / idempotency / entitlement / free-check middleware: the handler is
//     called directly, so nothing is charged and no idempotent replay can serve a grade;
//   * the solution cache: by default (opts.scheme falsy) it returns null — what production's real cache returns with no
//     DATABASE_URL (stepSolution.cjs). With opts.scheme (GRADER-TYPE-1 E1, owner ruling R3) it is the REAL scheme step: an
//     in-memory cache in front of production's own generator, metered. Invocations are counted either way.

const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..', '..');
const { createCheckSolutionRoute } = require(path.join(SERVER_DIR, 'routes', 'checkSolution.cjs'));
const { createHttpUtils, extractJsonObjectFromText } = require(path.join(SERVER_DIR, 'services', 'httpUtils.cjs'));
const { buildGeminiImagePart, validateMentorImagePayload } = require(path.join(SERVER_DIR, 'mentorImageSupport.cjs'));
const { chargeableCountOf } = require(path.join(SERVER_DIR, 'grading', 'charge.cjs'));
const ledgerLib = require(path.join(SERVER_DIR, 'services', 'usageLedger.cjs'));
const fs = require('fs');
const crypto = require('crypto');
const { AsyncLocalStorage } = require('async_hooks');
const { createInMemorySchemeCache, createReplaySchemeCache } = require('./schemeCache.cjs');

// A17 owner rulings 2 and 5 (GRADING-JOBS-1 J0): what a job CHARGES (the count fair use commits —
// grading/charge.cjs, the handler's side channel on `res`) and what the PREMIUM METER records. The
// meter runs exactly as in production (services/usageLedger.cjs meter groups) against an in-memory
// store: every successful model call records one fixed unit of usage, so `meteredShare` = the cost
// written / the cost of the calls made (1 = everything metered, 0 = nothing). Zero network.
const METER_UID = 'golden-eval';
const METER_UNIT = { model: 'gemini-2.5-flash', promptTokenCount: 1000, candidatesTokenCount: 200, thoughtsTokenCount: 800 };

function fakeRes() {
  let resolve;
  const done = new Promise((r) => { resolve = r; });
  return {
    statusCode: 0,
    body: null,
    headers: null,
    writeHead(s, h) { this.statusCode = s; this.headers = h || null; },
    setHeader() {},
    end(b) { this.body = b; resolve(); },
    once() {}, on() {},
    done,
  };
}

/**
 * @param {{ callGemini: Function, model?: string, provider?: string,
 *           gradingModel?: string, gradingThinkingBudget?: number|null, makeFenceNonce?: Function }} opts
 *   gradingModel / gradingThinkingBudget: the grading-only model setting production passes
 *   (server/index.cjs → GRADING_MODEL); absent, the core grades on `model` exactly as before.
 *   makeFenceNonce: a fixed fence nonce for byte-equality tests (production draws it from crypto).
 */
function createDriver(opts) {
  const { sendJson } = createHttpUtils('*');
  const cacheHook = { calls: 0, generated: 0, hits: 0, unfrozen: 0 };
  const meter = { writes: [], okCalls: 0 };
  const ledger = ledgerLib.createUsageLedger({
    resolveFirestore: () => ({ db: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => ({ set: (d) => { meter.writes.push(d); return Promise.resolve(); } }) }) }) }) }, FieldValue: { increment: (n) => n } }),
    telemetry: { increment() {} }, env: {},
  });
  const meteredCallGemini = async (...a) => { const out = await opts.callGemini(...a); meter.okCalls += 1; ledger.recordUsage(METER_UNIT); return out; };
  const deps = {
    sendJson,
    readJson: async (req) => req.__payload,
    callGemini: meteredCallGemini,
    GEMINI_MODEL: opts.model || 'gemini-2.5-flash',
    ACTIVE_PROVIDER: opts.provider || 'gemini',
    isStubMode: () => false,
    extractJsonObjectFromText,
    buildGeminiImagePart,
    validateMentorImagePayload,
    ...(opts.gradingModel ? { GRADING_MODEL: opts.gradingModel, GRADING_THINKING_BUDGET: opts.gradingThinkingBudget ?? null } : {}),
    ...(opts.gradingMode ? { GRADING_MODE: opts.gradingMode, GRADING_LIGHT_MODEL: opts.gradingLightModel || 'gemini-2.5-flash' } : {}),
    ...(typeof opts.makeFenceNonce === 'function' ? { makeFenceNonce: opts.makeFenceNonce } : {}),
    // GRADER-TYPE-1 E1 (R3): `opts.scheme` true -> the REAL scheme step (lib/schemeCache.cjs: the production generator behind an
    // in-memory cache, metered through meteredCallGemini). Default false -> the historical null stub (what stored baselines and
    // the zero-call replay of them were made under; goldenLive passes the flag, `--no-scheme` turns it back off).
    solutionCache: null,
  };
  // Per-job collection (AsyncLocalStorage): the schemes the job used and the raw texts of its scheme-generation calls.
  const jobAls = new AsyncLocalStorage();
  // E-b: the scheme file carries PROVENANCE — {header: {schemeModel, stepSolutionSha256, createdAt}, schemes}. A file made under another
  // scheme model or another generator (routes/stepSolution.cjs) is REFUSED unless `schemeFileForce`.
  const stepSolutionSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'routes', 'stepSolution.cjs'))).digest('hex');
  const schemeModel = opts.schemeModel || opts.gradingModel || opts.model;
  let preload = {};
  let fileHeader = { schemeModel, stepSolutionSha256, createdAt: new Date().toISOString() };
  if (opts.scheme && opts.schemeFile && fs.existsSync(opts.schemeFile)) {
    const loaded = JSON.parse(fs.readFileSync(opts.schemeFile, 'utf8'));
    const h = loaded && loaded.header;
    if (!h || !loaded.schemes) {
      if (!opts.schemeFileForce) throw new Error('scheme file ' + opts.schemeFile + ' has no provenance header (not written by this tool) — refused; pass --scheme-file-force to use it anyway');
      preload = loaded.schemes || loaded;
    } else {
      if ((h.schemeModel !== schemeModel || h.stepSolutionSha256 !== stepSolutionSha256) && !opts.schemeFileForce) {
        throw new Error('scheme file ' + opts.schemeFile + ' provenance mismatch — file: model=' + h.schemeModel + ' stepSolution=' + String(h.stepSolutionSha256).slice(0, 12) + '; this run: model=' + schemeModel + ' stepSolution=' + stepSolutionSha256.slice(0, 12) + ' — refused; pass --scheme-file-force to use it anyway');
      }
      preload = loaded.schemes;
      fileHeader = h;
    }
  }
  const persist = opts.schemeFile
    ? (_h, _s, store) => { const tmp = opts.schemeFile + '.tmp'; fs.writeFileSync(tmp, JSON.stringify({ header: fileHeader, schemes: Object.fromEntries(store) }, null, 1) + '\n'); fs.renameSync(tmp, opts.schemeFile); }
    : null;
  let schemeCache = null;
  if (opts.schemeReplay) deps.solutionCache = createReplaySchemeCache(opts.schemeReplay, cacheHook);
  else if (opts.scheme) {
    // the scheme is generated on `schemeModel` (--scheme-model; default the grading model) — a PROXY for production's GEMINI_MODEL, which the eval key refuses
    schemeCache = createInMemorySchemeCache(deps, cacheHook, { als: jobAls, schemeModel, preload, onStore: persist });
    deps.solutionCache = schemeCache;
  } else deps.solutionCache = { getOrCreateModelSolution: async () => { cacheHook.calls += 1; return null; } };
  const routes = createCheckSolutionRoute(deps);

  async function run(job) {
    const handler = routes[job.handler];
    if (typeof handler !== 'function') throw new Error('unknown handler ' + job.handler);
    const res = fakeRes();
    const before = cacheHook.calls;
    const t0 = Date.now();
    let harnessError = null;
    meter.writes = []; meter.okCalls = 0;
    const jobStore = { used: {} };
    try {
      await ledgerLib.runWithRequestContext(async () => {
        ledgerLib.bindRequestUid(METER_UID, job.handler === 'handleGradeWorksheet' ? '/api/grade-worksheet' : '/api/check-solution');
        await jobAls.run(jobStore, () => handler({ __payload: JSON.parse(JSON.stringify(job.request)) }, res));
      });
    } catch (e) {
      harnessError = (e && e.message) || String(e);
      res.statusCode = -1;
      res.end(JSON.stringify({ harnessError }));
    }
    await res.done;
    let body;
    try { body = JSON.parse(res.body); } catch { body = res.body; }
    await new Promise((r) => setImmediate(r));
    const unitCost = ledgerLib.buildLedgerIncrement(METER_UNIT, { env: {} }).increment.costMicroInr;
    const written = meter.writes.reduce((a, w) => a + (Number(w.costMicroInr) || 0), 0);
    const charged = chargeableCountOf(res);
    return { httpStatus: res.statusCode, body, wallMs: Date.now() - t0, harnessError, cacheHookCalls: cacheHook.calls - before, schemes: jobStore.used,
      charged: charged === undefined ? null : charged, meteredShare: meter.okCalls > 0 ? Math.round((1000 * written) / (unitCost * meter.okCalls)) / 1000 : null };
  }

  return { run, deps, schemeCounters: cacheHook, schemeCache, schemeModel, stepSolutionSha256 };
}

module.exports = { createDriver, SERVER_DIR };
