'use strict';
// lib/driver.cjs — run one golden job through the REAL production route handlers.
//
// The handlers come from the tracked, unmodified `createCheckSolutionRoute`
// (routes/checkSolution.cjs), wired with the same primitives server/index.cjs and
// routes/questions.cjs give it (httpUtils sendJson + extractJsonObjectFromText,
// mentorImageSupport buildGeminiImagePart + validateMentorImagePayload). Prompt
// building, the parse gate + retry, normalisation, the objective clamp + guard,
// applyEcfPolicyV2, buildMistakeSummary and withDepartureNote all run exactly as
// they ship. ONLY `callGemini` is injected:
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
 * @param {{ callGemini: Function, model?: string, provider?: string }} opts
 */
function createDriver(opts) {
  const { sendJson } = createHttpUtils('*');
  const cacheHook = { calls: 0 };
  const deps = {
    sendJson,
    readJson: async (req) => req.__payload,
    callGemini: opts.callGemini,
    GEMINI_MODEL: opts.model || 'gemini-2.5-flash',
    ACTIVE_PROVIDER: opts.provider || 'gemini',
    isStubMode: () => false,
    extractJsonObjectFromText,
    buildGeminiImagePart,
    validateMentorImagePayload,
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
    try {
      await handler({ __payload: JSON.parse(JSON.stringify(job.request)) }, res);
    } catch (e) {
      harnessError = (e && e.message) || String(e);
      res.statusCode = -1;
      res.end(JSON.stringify({ harnessError }));
    }
    await res.done;
    let body;
    try { body = JSON.parse(res.body); } catch { body = res.body; }
    return { httpStatus: res.statusCode, body, wallMs: Date.now() - t0, harnessError, cacheHookCalls: cacheHook.calls - before };
  }

  return { run, deps };
}

module.exports = { createDriver, SERVER_DIR };
