'use strict';
// lib/live.cjs — the LIVE model client for golden runs (manual / on demand ONLY; never CI).
//
// It wraps the REAL geminiClient (services/geminiClient.cjs) — the same HTTP ladder,
// 55 s timeout, 429 back-off and structured-output retry production uses — and adds:
//   * a CALL LEDGER line per real HTTP request (fetch is wrapped, so the client's own
//     internal retries are counted), with model, thinking budget, latency and tokens;
//   * a HARD CAP checked BEFORE a request is sent (seeded from the ledger's line count);
//   * a per-config THINKING BUDGET for the grading calls only (temperature, maxOutputTokens,
//     responseSchema and the prompt are untouched — this is the model comparison's one knob);
//   * per logical call, the RAW model text (pre-post-processing) that a run stores and the
//     CI gate replays.
// The key is read by serverConfig.resolveConfig from the environment of the shell that
// loaded it (`set -a; . ~/.lazytopper-eval.env; set +a; unset GEMINI_MODEL; ...`). It is
// never printed, logged or stored: every string written passes lib/redact.cjs.

const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const { redact } = require('./redact.cjs');

const SERVER_DIR = path.join(__dirname, '..', '..', '..');
const GRADING_WORKLOADS = new Set(['grade-single', 'worksheet', 'grade-batch']);

function assertEnvClean() {
  const forbidden = ['DATABASE_URL', 'GOOGLE_APPLICATION_CREDENTIALS', 'GEMINI_MODEL']
    .filter((k) => k in process.env)
    .concat(Object.keys(process.env).filter((k) => /^FIREBASE|^GCLOUD|^FIRESTORE|SERVICE_ACCOUNT/i.test(k)));
  if (forbidden.length) throw new Error('golden live: forbidden env present (names only): ' + forbidden.join(','));
}

function ledgerCount(file) {
  try { return fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.trim()).length; } catch { return 0; }
}

/**
 * @param {{ model: string, thinkingBudget: number|null, ledgerFile: string, cap: number, maxCalls?: number,
 *           pr?: string, configId: string }} o
 */
function createLiveClient(o) {
  assertEnvClean();
  const { resolveConfig } = require(path.join(SERVER_DIR, 'services', 'serverConfig.cjs'));
  const { createGeminiClient } = require(path.join(SERVER_DIR, 'services', 'geminiClient.cjs'));
  const config = resolveConfig();
  if (!config.DIRECT_GEMINI_API_KEY) throw new Error('golden live: no direct Gemini key resolved in this process (load ~/.lazytopper-eval.env in the same command)');
  if (config.HAS_REPLIT_PROXY) throw new Error('golden live: a proxy is configured; the golden runs use the direct key only');

  const als = new AsyncLocalStorage();
  let used = ledgerCount(o.ledgerFile);
  let sentThisProcess = 0;
  let pauseUntil = 0;
  const stats = { http: 0, ok: 0, status429: 0, timeouts: 0, errors: 0, httpInFlight: 0, peakHttpInFlight: 0 };
  let keyFailure = null;

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (!/^https:\/\/generativelanguage\.googleapis\.com\//.test(u)) {
      throw new Error('golden live: unexpected outbound request blocked');
    }
    while (Date.now() < pauseUntil) await new Promise((r) => setTimeout(r, 500));
    if (keyFailure) throw new Error('golden live: key failure earlier in this process (HTTP ' + keyFailure.status + ') — request refused before sending');
    if (used >= o.cap) throw new Error('golden live: HARD CAP ' + o.cap + ' reached — request refused before sending');
    if (o.maxCalls != null && sentThisProcess >= o.maxCalls) throw new Error('golden live: --max-calls ' + o.maxCalls + ' reached — request refused before sending');
    used += 1;
    sentThisProcess += 1;
    const ctx = als.getStore() || {};
    const call = ctx.currentCall || null;
    const model = decodeURIComponent((u.match(/models\/([^:]+):/) || [])[1] || '');
    let thinkingBudget = null;
    try { const b = JSON.parse(opts.body); thinkingBudget = b.generationConfig && b.generationConfig.thinkingConfig ? b.generationConfig.thinkingConfig.thinkingBudget : null; } catch { /* */ }
    // Owner speed ruling 2 (2026-10-05): parallel calls ramped to the key's rate limit; the
    // peak number of HTTP requests in flight is reported with every run.
    stats.httpInFlight += 1;
    if (stats.httpInFlight > stats.peakHttpInFlight) stats.peakHttpInFlight = stats.httpInFlight;
    const t0 = Date.now();
    let status = null; let usage = null; let responseId = null; let modelVersion = null; let finish = null; let errClass = null;
    try {
      const res = await realFetch(url, opts);
      status = res.status;
      const text = await res.clone().text();
      try {
        const d = JSON.parse(text);
        usage = d.usageMetadata || null;
        responseId = d.responseId || null;
        modelVersion = d.modelVersion || null;
        const c = d.candidates && d.candidates[0];
        finish = c ? c.finishReason || null : null;
        if (!res.ok && d.error) errClass = String(d.error.status || '') + ' ' + String(d.error.code || '');
        // GRADER-CORE-1 PR-2: Google answers an INVALID key with HTTP 400 (reason API_KEY_INVALID),
        // not 401 — observed 2026-10-05 on a malformed eval key. It is a key failure too.
        if (status === 400 && /API_KEY_INVALID|API key not valid/i.test(text) && !keyFailure) keyFailure = { status, errClass: 'API_KEY_INVALID' };
      } catch { /* non-JSON */ }
      if (status === 429) { stats.status429 += 1; pauseUntil = Date.now() + 20000; }
      // A key / billing failure (401 unauthenticated, 402 prepaid credits depleted, 403 permission)
      // will not heal by retrying: stop the whole run instead of spending requests on it.
      if ((status === 401 || status === 402 || status === 403) && !keyFailure) keyFailure = { status, errClass: null };
      return res;
    } catch (e) {
      errClass = (e && e.name) || 'fetch-error';
      if (/abort/i.test(errClass)) stats.timeouts += 1;
      throw e;
    } finally {
      stats.httpInFlight -= 1;
      const latencyMs = Date.now() - t0;
      stats.http += 1;
      if (status && status < 400) stats.ok += 1; else stats.errors += 1;
      const rec = {
        ts: new Date().toISOString(), pr: o.pr || 'PR-1', fn: ctx.fn || '?', case: ctx.jobKey || '?', run: ctx.run || 0,
        config: o.configId, model, thinkingBudget, timeoutMs: config.GEMINI_TIMEOUT_MS, ok: Boolean(status && status < 400), httpStatus: status, errClass, latencyMs,
        promptTokens: usage ? usage.promptTokenCount ?? null : null,
        outputTokens: usage ? usage.candidatesTokenCount ?? null : null,
        thinkingTokens: usage ? usage.thoughtsTokenCount ?? null : null,
      };
      fs.appendFileSync(o.ledgerFile, redact(JSON.stringify(rec)) + '\n');
      if (call) {
        call.http.push({ httpStatus: status, errClass, latencyMs, finishReason: finish, responseId, modelVersion, model, thinkingBudget,
          promptTokens: rec.promptTokens, outputTokens: rec.outputTokens, thinkingTokens: rec.thinkingTokens });
      }
    }
  };

  const gem = createGeminiClient({
    GEMINI_API_KEY: config.GEMINI_API_KEY,
    HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
    REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
    REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
    DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
    GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
    GEMINI_TIMEOUT_MS: config.GEMINI_TIMEOUT_MS,
    telemetry: { increment() {}, recordWorkloadSample() {} },
    usageLedger: { recordUsage() { return null; } },
  });

  // The callGemini handed to the REAL handlers via lib/driver.cjs.
  async function callGemini(model, contents, cfg) {
    const ctx = als.getStore();
    let effective = cfg;
    if (o.thinkingBudget != null && cfg && GRADING_WORKLOADS.has(cfg.workloadClass)) {
      effective = { ...cfg, thinkingConfig: { thinkingBudget: o.thinkingBudget } };
    }
    const call = { http: [] };
    if (ctx) { ctx.currentCall = call; ctx.calls.push(call); }
    try {
      const r = await gem.callGemini(model, contents, effective);
      call.ok = true;
      call.text = r.text;
      call.finishReason = r.raw && r.raw.candidates && r.raw.candidates[0] ? r.raw.candidates[0].finishReason || null : null;
      return r;
    } catch (e) {
      call.ok = false;
      call.error = { status: (e && (e.status || e.statusCode)) || null, message: redact(String((e && e.message) || e)).slice(0, 300) };
      throw e;
    } finally {
      if (ctx) ctx.currentCall = null;
    }
  }

  function runInContext(meta, fn) {
    const ctx = { ...meta, calls: [], currentCall: null };
    return als.run(ctx, async () => { const out = await fn(); return { out, calls: ctx.calls }; });
  }

  return {
    callGemini,
    runInContext,
    resolvedTimeoutMs: config.GEMINI_TIMEOUT_MS,
    used: () => used,
    keyFailure: () => keyFailure,
    sentThisProcess: () => sentThisProcess,
    stats,
  };
}

module.exports = { createLiveClient, ledgerCount, GRADING_WORKLOADS };
