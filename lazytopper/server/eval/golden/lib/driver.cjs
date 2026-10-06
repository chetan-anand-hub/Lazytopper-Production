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
//   * the solution cache returns null — what production's real cache returns with no
//     DATABASE_URL (stepSolution.cjs). Invocations are counted, so a cache that ever
//     generated a scheme (an extra model call) would be visible.

const path = require('path');

const SERVER_DIR = path.join(__dirname, '..', '..', '..');
const { createCheckSolutionRoute } = require(path.join(SERVER_DIR, 'routes', 'checkSolution.cjs'));
const { createHttpUtils, extractJsonObjectFromText } = require(path.join(SERVER_DIR, 'services', 'httpUtils.cjs'));
const { buildGeminiImagePart, validateMentorImagePayload } = require(path.join(SERVER_DIR, 'mentorImageSupport.cjs'));
const { chargeableCountOf } = require(path.join(SERVER_DIR, 'grading', 'charge.cjs'));
const ledgerLib = require(path.join(SERVER_DIR, 'services', 'usageLedger.cjs'));

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
  const cacheHook = { calls: 0 };
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
    solutionCache: {
      getOrCreateModelSolution: async () => { cacheHook.calls += 1; return null; },
    },
  };
  const routes = createCheckSolutionRoute(deps);

  async function run(job) {
    const handler = routes[job.handler];
    if (typeof handler !== 'function') throw new Error('unknown handler ' + job.handler);
    const res = fakeRes();
    const before = cacheHook.calls;
    const t0 = Date.now();
    let harnessError = null;
    meter.writes = []; meter.okCalls = 0;
    try {
      await ledgerLib.runWithRequestContext(async () => {
        ledgerLib.bindRequestUid(METER_UID, job.handler === 'handleGradeWorksheet' ? '/api/grade-worksheet' : '/api/check-solution');
        await handler({ __payload: JSON.parse(JSON.stringify(job.request)) }, res);
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
    return { httpStatus: res.statusCode, body, wallMs: Date.now() - t0, harnessError, cacheHookCalls: cacheHook.calls - before,
      charged: charged === undefined ? null : charged, meteredShare: meter.okCalls > 0 ? Math.round((1000 * written) / (unitCost * meter.okCalls)) / 1000 : null };
  }

  return { run, deps };
}

module.exports = { createDriver, SERVER_DIR };
