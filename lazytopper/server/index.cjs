const http = require('http');
const path = require('path');
const fs = require('fs');
const ts = require('typescript');

let firebaseAdmin = null;
let adminFirestore = null;
try {
  const admin = require('firebase-admin');
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  if (projectId) {
    const hasCredentials = !!(
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.GCLOUD_PROJECT
    );
    const initConfig = { projectId };
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        initConfig.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY));
      } catch {}
    }
    if (!admin.apps.length) {
      admin.initializeApp(initConfig);
    }
    firebaseAdmin = admin;
    adminFirestore = admin.firestore();
    console.log(`[share] Firebase Admin initialized (projectId=${projectId}, credentials=${hasCredentials ? 'explicit' : 'default/ADC'})`);
  } else {
    console.warn('[share] Firebase Admin not initialized: VITE_FIREBASE_PROJECT_ID not set. Share features disabled.');
  }
} catch (e) {
  console.warn('[share] firebase-admin not available:', e.message);
}

const vm = require('vm');
const { createRequire } = require('module');

require.extensions['.ts'] = (module, filename) => {
  const rawSource = fs.readFileSync(filename, 'utf8');
  // `import.meta` is ESM-only and cannot be used in vm.runInThisContext (plain
  // JS). In the server context, Vite env vars aren't available anyway, so we
  // substitute a process.env-backed object — callers that depend on these vars
  // gracefully fall back to sensible defaults when they are undefined.
  const source = rawSource.replace(/\bimport\.meta\b/g, '({ env: process.env })');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: 'CommonJS',
      target: 'ES2020',
      esModuleInterop: true,
    },
    fileName: path.basename(filename),
  });
  // Node v24 routes require() calls to ESM-type-package files through
  // loadESMFromCJS → importSyncForRequire, which runs the code as an ES module.
  // In that context `module`, `exports`, `require`, `__filename`, and
  // `__dirname` are all undefined, so module._compile() fails.
  //
  // vm.runInThisContext() evaluates code in the V8 context directly and never
  // triggers the ESM loader, so the standard CJS variables are always present.
  // createRequire(filename) gives a per-file require whose relative-path
  // resolution is anchored to the loaded file's directory.
  const fn = vm.runInThisContext(
    '(function(exports, require, module, __filename, __dirname) {\n' +
    transpiled.outputText + '\n})',
    { filename, lineOffset: 0, displayErrors: true }
  );
  fn(module.exports, createRequire(filename), module, filename, path.dirname(filename));
};

const { resolveConfig } = require('./services/serverConfig.cjs');
const config = resolveConfig();

const {
  tryParseJsonStrict, normalizeLines, mergeLines,
  isObjectiveType, persistTutorFeedback, isNoProviderEnabled,
  loadTrianglesMentorSeed,
} = require('./services/serverUtils.cjs');

const { buildTrianglesGrindContractPrompt } = require(
  path.join(__dirname, '../src/prompts/grind/trianglesGrindContract.ts')
);

const telemetry = require('./telemetry.cjs');
const { buildGeminiImagePart, validateMentorImagePayload } = require('./mentorImageSupport.cjs');
const trianglesRubricsData = require(
  path.join(__dirname, '../src/data/bsre/triangles_bsre_rubrics_v1.json')
);
const trianglesRubricMap = new Map(
  (Array.isArray(trianglesRubricsData?.rubrics) ? trianglesRubricsData.rubrics : [])
    .map((rubric) => [String(rubric?.id || ''), rubric])
    .filter(([id]) => Boolean(id))
);
const { validateTutorStructured, buildTutorFallback, validateAttemptLoop } = require(
  path.join(__dirname, '../src/contracts/tutorContracts.ts')
);
const { initHintState, computeNextHint } = require(
  path.join(__dirname, '../src/tutor/hintLadder.ts')
);
const { scoreRubric } = require(
  path.join(__dirname, '../src/tutor/rubricScore.ts')
);
const { retrieveTrianglesSources } = require(
  path.join(__dirname, '../src/tutor/retrieval/trianglesRetriever.ts')
);
const { getDiagramTemplate } = require(
  path.join(__dirname, '../src/tutor/diagram/diagramTemplates.ts')
);
const { resolveTopicTeachContract } = require(
  path.join(__dirname, '../src/tutor/topicTeachContracts.ts')
);
const { orchestrateTutorResponse } = require('./tutorOrchestrator.cjs');
const {
  startSessionHandler, getSessionHandler, submitSessionHandler,
} = require("./sessionHandlers.cjs");
const { createGeminiClient } = require('./services/geminiClient.cjs');
const { createClaudeClient } = require('./services/claudeClient.cjs');
const { createHttpUtils, readJson, extractJsonObjectFromText } = require('./services/httpUtils.cjs');
const { createStubHandlers } = require('./services/stubHandlers.cjs');
const { getCbseExamDateInfo } = require('./services/cbseExamDate.cjs');
const { createShareRoutes } = require('./routes/share.cjs');
const { createDiagramRoutes } = require('./routes/diagrams.cjs');
const { createQuestionRoutes } = require('./routes/questions.cjs');
// RETIREMENT PR-2: /api/mentor is deleted. Its route module also re-exported two
// helpers used by LIVE surfaces, so they are now required from where they are
// actually defined instead of being passed through the retired mentor route.
const { ensureDiagramFields } = require('./prompts/promptDiagram.cjs');
const { buildMoreLikeThisUserPrompt } = require('./prompts/promptLearn.cjs');
const { createUserProgressRoutes } = require('./routes/userProgress.cjs');
const { createAiQuestionsRoute } = require('./routes/aiQuestions.cjs');
const { createTutorCache } = require('./services/tutorCache.cjs');
const { pickFromPool, markServed, saveToPool } = require('./services/generatedQuestionPool.cjs');
const { createWarmPoolRunner } = require('./services/warmQuestionPool.cjs');
const { createQuestionReportRoutes } = require('./routes/questionReport.cjs');
const { createAdminSolutionCacheRoutes } = require('./routes/adminSolutionCache.cjs');
// Admin-gated READ path for the token + rate-limit telemetry. #540 wired the
// counters and the ring buffer and NOTHING ever served them — the instrumentation
// measured into a void from the day it merged, so every thinking-budget decision
// and the subscription price were being modelled from estimates while the real
// figures sat in memory on Railway. Read-only: computes nothing, stores nothing,
// changes no limit.
const { createAdminTelemetryRoutes } = require('./routes/adminTelemetry.cjs');
// QR answer handoff — carries ONE photo from the student's phone into the desktop
// session they are already in. DELIVERY ONLY: the image lands in the existing answer
// box and grades exactly as today; nothing here touches the grader.
const { createQrUploadChannel } = require('./services/qrUploadChannel.cjs');
const { createQrUploadRoutes } = require('./routes/qrUpload.cjs');
// Tutor surface (Stage 1) — FRESH engine (D-TUT-12), NOT mentor.cjs. Stateless
// conversation endpoint; writes nothing to Firestore (honesty guard, D-TUT-8).
const { createTutorRoute } = require('./routes/tutor.cjs');
// Anti-catastrophe daily caps on the LLM-backed endpoints. TIER-BLIND by design:
// the client gates enforce the product rule, this enforces the bill. Soft
// thresholds alert the owner and let the request through; only the hard ceilings
// and the global circuit breaker return 429.
const { createRateLimiter } = require('./services/rateLimiter.cjs');

const { sendJson, sendJsonWithHeaders } = createHttpUtils(config.CORS_ORIGIN);

const geminiClientModule = createGeminiClient({
  GEMINI_API_KEY: config.GEMINI_API_KEY,
  HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
  REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
  REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
  DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
  GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
  GEMINI_TIMEOUT_MS: config.GEMINI_TIMEOUT_MS,
});
const claudeClientModule = createClaudeClient({
  HAS_ANTHROPIC_PROXY: config.HAS_ANTHROPIC_PROXY,
  REPLIT_ANTHROPIC_BASE_URL: config.REPLIT_ANTHROPIC_BASE_URL,
  REPLIT_ANTHROPIC_API_KEY: config.REPLIT_ANTHROPIC_API_KEY,
  ANTHROPIC_TIMEOUT_MS: config.ANTHROPIC_TIMEOUT_MS,
  CLAUDE_MODEL_SONNET: config.CLAUDE_MODEL_SONNET,
  CLAUDE_MODEL_HAIKU: config.CLAUDE_MODEL_HAIKU,
  HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
  GEMINI_MODEL: config.GEMINI_MODEL,
  MAX_HISTORY_TURNS: config.MAX_HISTORY_TURNS,
});

function callGemini(model, finalContents, cfg) {
  return geminiClientModule.callGemini(model, finalContents, cfg);
}
function callGeminiStream(model, finalContents, cfg) {
  return geminiClientModule.callGeminiStream(model, finalContents, cfg);
}
function callClaude(model, messages, systemPrompt, cfg) {
  return claudeClientModule.callClaude(model, messages, systemPrompt, cfg);
}
function toClaudeMessages(messages) {
  return claudeClientModule.toClaudeMessages(messages);
}
function selectModelForRequest(mode, userQuery) {
  return claudeClientModule.selectModelForRequest(mode, userQuery);
}

const warmPoolRunner = createWarmPoolRunner({
  callGemini,
  saveToPool,
  GEMINI_MODEL: config.GEMINI_MODEL,
});
let _warmPoolRunning = false;

const {
  buildStubTutorStructured, buildStubText, buildStubMoreLikeThis,
  buildFallbackSteps, buildStubStepSolution, isStubMode,
} = createStubHandlers({
  STUB_MODE: config.STUB_MODE,
  isObjectiveType,
  isNoProviderEnabled,
  buildTutorFallback,
  loadTrianglesMentorSeed,
  normalizeLines,
  mergeLines,
  getEnsureDiagramFields: () => ensureDiagramFields,
});

const tutorCache = createTutorCache({
  HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
  REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
  REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
  DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
});


const routeDeps = {
  sendJson, sendJsonWithHeaders, readJson,
  callGemini, callClaude,
  GEMINI_MODEL: config.GEMINI_MODEL,
  GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
  CLAUDE_MODEL_SONNET: config.CLAUDE_MODEL_SONNET,
  ACTIVE_PROVIDER: config.ACTIVE_PROVIDER,
  STUB_MODE: config.STUB_MODE,
  HAS_ANTHROPIC_PROXY: config.HAS_ANTHROPIC_PROXY,
  VISUALS_DIR: config.VISUALS_DIR,
  MANIFEST_PATH: config.MANIFEST_PATH,
  isStubMode,
  buildStubMoreLikeThis,
  buildMoreLikeThisUserPrompt,
  pickFromPool,
  markServed,
  saveToPool,
  buildFallbackSteps, buildStubStepSolution,
  isObjectiveType, extractJsonObjectFromText,
  buildGeminiImagePart, validateMentorImagePayload,
  firebaseAdmin, adminFirestore,
};
const shareRoutes = createShareRoutes(routeDeps);
const diagramRoutes = createDiagramRoutes(routeDeps);
const userProgressRoutes = createUserProgressRoutes(routeDeps);
const aiQuestionsRoute = createAiQuestionsRoute(routeDeps);
const questionRoutes = createQuestionRoutes(routeDeps);
const questionReportRoutes = createQuestionReportRoutes({ sendJson, readJson });
// C&I PR-3 (Gate 2b): admin-gated eviction/regeneration for the model-solution
// cache — ADMIN_FIREBASE_UIDS Bearer-token identity, fail-closed (see the route).
const adminSolutionCacheRoutes = createAdminSolutionCacheRoutes(routeDeps);
// Same ADMIN_FIREBASE_UIDS Bearer identity, same fail-closed posture. Reads the
// counters written by #540 (telemetry.snapshot) and the ring buffer's SIZE only.
const adminTelemetryRoutes = createAdminTelemetryRoutes({
  sendJson,
  firebaseAdmin,
  telemetry,
  getTokenTelemetry: geminiClientModule.getTokenTelemetry,
});
// QR answer handoff. Firestore coordination doc + Storage blob, both written
// server-side via firebase-admin — no client ever touches either, which is why the
// deny-all rules on both are correct and unchanged.
const qrUploadChannel = createQrUploadChannel(routeDeps);
const qrUploadRoutes = createQrUploadRoutes({ ...routeDeps, qrUploadChannel });
const tutorRoute = createTutorRoute(routeDeps);
const rateLimiter = createRateLimiter({ telemetry });

async function handleRequest(req, res) {
  const reqUrlRaw = String(req.url || "");
  const reqPath = reqUrlRaw.split("?")[0];

  if (
    req.method === 'OPTIONS' &&
    (
      reqPath === '/api/tutor' ||
      reqPath === '/api/more-like-this' ||
      reqPath === '/api/step-solution' ||
      reqPath === '/api/check-solution' ||
      reqPath === '/api/detect-question' ||
      reqPath === '/api/grade-worksheet' ||
      reqPath === '/api/tutor-feedback' ||
      reqPath === '/api/generate-diagram' ||
      reqPath === '/api/generate-visual' ||
      reqPath === '/api/session/start' ||
      reqPath === '/api/share-token' ||
      reqPath === '/api/admin/warm-question-pool' ||
      reqPath === '/api/admin/question-reports' ||
      /^\/api\/admin\/question-reports\/\d+\/resolve$/.test(reqPath) ||
      reqPath === '/api/user/progress' ||
      reqPath === '/api/user/progress/sync' ||
      reqPath === '/api/user/progress/xp' ||
      reqPath === '/api/user/progress/streak' ||
      reqPath === '/api/user/progress/focus' ||
      reqPath === '/api/user/progress/mastery' ||
      reqPath === '/api/user/progress/mission' ||
      reqPath === '/api/ai-questions' ||
      reqPath === '/api/qr-upload/new' ||
      /^\/api\/qr-upload\/pickup\/[^/]+$/.test(reqPath) ||
      /^\/api\/qr-upload\/[^/]+\/status$/.test(reqPath) ||
      /^\/api\/qr-upload\/[^/]+$/.test(reqPath) ||
      /^\/api\/session\/[^/]+$/.test(reqPath) ||
      /^\/api\/session\/[^/]+\/submit$/.test(reqPath)
    )
  ) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': config.CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Lazytopper-Uid, X-Admin-Key, X-User-ID',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  // ── Daily caps ───────────────────────────────────────────────────────────────
  // Placed AFTER the CORS preflight (a 429'd OPTIONS would break the browser
  // before it ever sent the real request) and BEFORE every route dispatch.
  //
  // Scoped to POST because all eight paid endpoints are POST-only — a stray GET
  // 404s without reaching a model, and must not burn a student's allowance.
  //
  // `check` returns allowed:true for every non-paid path, so progress sync,
  // share tokens, the QR handoff and /health are untouched at any volume.
  if (req.method === 'POST') {
    const verdict = rateLimiter.check(req, reqPath);
    if (!verdict.allowed) {
      return sendJson(res, verdict.status, verdict.body);
    }
  }

  const SHARE_SECRET = process.env.SESSION_SECRET;
  if (!SHARE_SECRET && (
    (req.method === 'POST' && req.url === '/api/share-token') ||
    (req.method === 'GET' && String(req.url || '').startsWith('/api/verify-share-token')) ||
    (req.method === 'GET' && String(req.url || '').startsWith('/api/shared-report'))
  )) {
    return sendJson(res, 503, { ok: false, error: 'Share feature unavailable: SESSION_SECRET not configured' });
  }

  if (req.method === 'POST' && req.url === '/api/share-token') {
    return shareRoutes.handleShareToken(req, res, SHARE_SECRET);
  }
  if (req.method === 'GET' && String(req.url || '').startsWith('/api/verify-share-token')) {
    return shareRoutes.handleVerifyShareToken(req, res, SHARE_SECRET);
  }
  if (req.method === 'GET' && String(req.url || '').startsWith('/api/shared-report')) {
    return shareRoutes.handleSharedReport(req, res, SHARE_SECRET);
  }

  // ── QR answer handoff ────────────────────────────────────────────────────────
  // ORDER IS LOAD-BEARING: '/api/qr-upload/new' must be matched BEFORE the
  // POST token pattern, or the literal "new" would be parsed as an upload token.
  if (req.method === 'POST' && reqPath === '/api/qr-upload/new') {
    return qrUploadRoutes.handleMint(req, res);
  }
  {
    const qrPickupMatch = reqPath.match(/^\/api\/qr-upload\/pickup\/([^/]+)$/);
    if (req.method === 'GET' && qrPickupMatch) {
      return qrUploadRoutes.handlePickup(req, res, qrPickupMatch[1]);
    }
    const qrStatusMatch = reqPath.match(/^\/api\/qr-upload\/([^/]+)\/status$/);
    if (req.method === 'GET' && qrStatusMatch) {
      return qrUploadRoutes.handleStatus(req, res, qrStatusMatch[1]);
    }
    const qrUploadMatch = reqPath.match(/^\/api\/qr-upload\/([^/]+)$/);
    if (req.method === 'POST' && qrUploadMatch) {
      return qrUploadRoutes.handleUpload(req, res, qrUploadMatch[1]);
    }
  }

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    return sendJson(res, 200, {
      ok: true,
      service: 'lazytopper-ai-server',
      providers: {
        gemini: {
          active: !config.STUB_MODE,
          model: config.GEMINI_MODEL,
          auth: config.HAS_DIRECT_KEY ? 'direct-key' : (config.HAS_REPLIT_PROXY ? 'replit-proxy' : 'none'),
          routes: ['tutoring_chat', 'more_like_this', 'step_solution'],
        },
        anthropic: {
          active: config.HAS_ANTHROPIC_PROXY,
          modelSonnet: config.CLAUDE_MODEL_SONNET,
          modelHaiku: config.CLAUDE_MODEL_HAIKU,
          auth: config.HAS_ANTHROPIC_PROXY ? 'replit-proxy' : 'none',
          routes: ['visual_generation', 'factual_queries'],
        },
      },
      routing: {
        visual: config.HAS_ANTHROPIC_PROXY ? `claude:${config.CLAUDE_MODEL_SONNET}` : `gemini:${config.GEMINI_MODEL}`,
        factual: config.HAS_ANTHROPIC_PROXY ? `claude:${config.CLAUDE_MODEL_HAIKU}` : `gemini:${config.GEMINI_MODEL}`,
        chat: `gemini:${config.GEMINI_MODEL}`,
      },
      maxHistoryTurns: config.MAX_HISTORY_TURNS,
      stub: config.STUB_MODE,
      node: process.version,
    });
  }

  if (req.method === 'GET' && String(req.url || '').startsWith('/api/cbse-exam-date')) {
    try {
      const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const studentClass = String(reqUrl.searchParams.get('class') || '10');
      const result = await getCbseExamDateInfo(studentClass);
      return sendJson(res, 200, { ok: true, ...result });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: 'Failed to resolve CBSE exam date', details: err?.message || String(err) });
    }
  }

  if (req.method === "POST" && reqPath === "/api/generate-diagram") {
    return diagramRoutes.handleGenerateDiagram(req, res);
  }

  if (req.method === "POST" && reqPath === "/api/session/start") {
    let reqJson;
    try { reqJson = await readJson(req); } catch { return sendJson(res, 400, { ok: false, error: "Invalid JSON" }); }
    const result = startSessionHandler(req, reqJson || {});
    return sendJson(res, result.status, result.body);
  }

  if (req.method === "GET" && /^\/api\/session\/[^/]+$/.test(reqPath)) {
    const sessionId = decodeURIComponent(reqPath.split("/")[3] || "");
    const result = getSessionHandler(req, sessionId);
    return sendJson(res, result.status, result.body);
  }

  if (req.method === "POST" && /^\/api\/session\/[^/]+\/submit$/.test(reqPath)) {
    let reqJson;
    try { reqJson = await readJson(req); } catch { return sendJson(res, 400, { ok: false, error: "Invalid JSON" }); }
    const sessionId = decodeURIComponent(reqPath.split("/")[3] || "");
    const result = submitSessionHandler(req, sessionId, reqJson || {});
    return sendJson(res, result.status, result.body);
  }

  if (req.method === 'POST' && req.url === '/api/tutor-feedback') {
    let reqJson;
    try { reqJson = await readJson(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }
    try {
      const record = persistTutorFeedback(reqJson, config.FEEDBACK_DIR, config.FEEDBACK_FILE);
      return sendJson(res, 200, { ok: true, record });
    } catch (e) {
      return sendJson(res, 400, { error: e?.message || 'Failed to store feedback' });
    }
  }

  // Tutor surface (Stage 1) — fresh /api/tutor, NOT /api/mentor (D-TUT-12).
  if (req.method === 'POST' && req.url === '/api/tutor') {
    return tutorRoute.handleTutorRequest(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/more-like-this') {
    return questionRoutes.handleMoreLikeThis(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/step-solution') {
    return questionRoutes.handleStepSolution(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/check-solution') {
    return questionRoutes.handleCheckSolution(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/detect-question') {
    return questionRoutes.handleDetectQuestion(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/grade-worksheet') {
    return questionRoutes.handleGradeWorksheet(req, res);
  }

  if (req.method === 'GET' && reqPath === '/api/user/progress') {
    return userProgressRoutes.handleGet(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/user/progress/sync') {
    return userProgressRoutes.handleSync(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/user/progress/xp') {
    return userProgressRoutes.handleXP(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/user/progress/streak') {
    return userProgressRoutes.handleStreak(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/user/progress/focus') {
    return userProgressRoutes.handleFocus(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/user/progress/mastery') {
    return userProgressRoutes.handleMastery(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/user/progress/mission') {
    return userProgressRoutes.handleMission(req, res);
  }

  if (req.method === 'GET' && reqPath === '/api/ai-questions') {
    return aiQuestionsRoute.handleGet(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/ai-questions') {
    return aiQuestionsRoute.handlePost(req, res);
  }

  if (req.method === 'POST' && reqPath === '/api/generate-visual') {
    return diagramRoutes.handleGenerateVisual(req, res);
  }

  if (req.method === 'POST' && reqPath === '/api/questions/report') {
    return questionReportRoutes.handlePostReport(req, res);
  }
  if (req.method === 'GET' && reqPath === '/api/admin/question-reports') {
    return questionReportRoutes.handleGetReports(req, res);
  }
  {
    const resolveMatch = reqPath.match(/^\/api\/admin\/question-reports\/(\d+)\/resolve$/);
    if (req.method === 'PATCH' && resolveMatch) {
      return questionReportRoutes.handleResolveReport(req, res, resolveMatch[1]);
    }
  }

  // C&I PR-3 (Gate 2b): admin-gated model-solution cache eviction/regeneration
  // (ADMIN_FIREBASE_UIDS Bearer identity, fail-closed inside the route). Owner
  // tooling only (curl/Postman) — deliberately NOT in the browser CORS preflight
  // list above.
  if (req.method === 'POST' && reqPath === '/api/admin/solution-cache/evict') {
    return adminSolutionCacheRoutes.handleEvict(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/admin/solution-cache/regenerate') {
    return adminSolutionCacheRoutes.handleRegenerate(req, res);
  }

  // Token + rate-limit telemetry read-out (ADMIN_FIREBASE_UIDS Bearer identity,
  // fail-closed inside the route). Owner tooling only — deliberately NOT in the
  // browser CORS preflight list above, exactly like the solution-cache admin
  // routes: it is read with curl, never from the app.
  if (req.method === 'GET' && reqPath === '/api/admin/token-telemetry') {
    return adminTelemetryRoutes.handleGetTokenTelemetry(req, res);
  }

  if (req.method === 'POST' && reqPath === '/api/admin/warm-question-pool') {
    const adminSecret = process.env.WARM_POOL_ADMIN_SECRET;
    if (!adminSecret) {
      return sendJson(res, 503, { ok: false, error: 'Endpoint disabled: WARM_POOL_ADMIN_SECRET env var is not configured' });
    }
    const providedKey = req.headers['x-admin-key'] || '';
    if (providedKey !== adminSecret) {
      return sendJson(res, 401, { ok: false, error: 'Unauthorized: valid X-Admin-Key header required' });
    }
    if (_warmPoolRunning) {
      return sendJson(res, 409, { ok: false, error: 'A warm-pool run is already in progress. Check server logs for progress.' });
    }
    let reqJson = {};
    try { reqJson = await readJson(req); } catch (_) {}
    const delayMs = Number(reqJson.delayMs ?? 300);
    sendJson(res, 202, { ok: true, message: 'Pool warm run started in background. Check server logs for progress.' });
    _warmPoolRunning = true;
    warmPoolRunner.runWarmPool({ delayMs }).catch(
      (e) => console.error('[warm] runWarmPool error:', e.message)
    ).finally(() => { _warmPoolRunning = false; });
    return;
  }

  return sendJson(res, 404, { error: 'Not Found' });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((e) => {
    console.error(e);
    sendJson(res, 500, { error: 'Unhandled server error', details: e.message });
  });
});

server.listen(config.PORT, () => {
  console.log(`LazyTopper AI server running on port ${config.PORT}`);
  const envUsedLabel = config.ENV_USED.length ? config.ENV_USED.join(',') : '';
  const tutorModelLabel = config.GEMINI_TUTOR_MODEL !== config.GEMINI_MODEL
    ? `base=${config.GEMINI_MODEL}, tutor=${config.GEMINI_TUTOR_MODEL}`
    : config.GEMINI_MODEL;
  console.log(
    `Gemini: ${config.STUB_MODE ? 'OFF' : 'ON'} (${tutorModelLabel}) | Auth: ${config.HAS_DIRECT_KEY ? 'direct-key' : (config.HAS_REPLIT_PROXY ? 'replit-proxy' : 'none')}`
  );
  console.log(
    `Claude: ${config.HAS_ANTHROPIC_PROXY ? 'ON' : 'OFF'} (sonnet=${config.CLAUDE_MODEL_SONNET}, haiku=${config.CLAUDE_MODEL_HAIKU}) | Auth: ${config.HAS_ANTHROPIC_PROXY ? 'replit-proxy' : 'none'}`
  );
  console.log(
    `Routing: visual→${config.HAS_ANTHROPIC_PROXY ? 'claude-sonnet' : 'gemini'} | chat→gemini | diagram-compare→claude+gemini | MaxHistory: ${config.MAX_HISTORY_TURNS} turns`
  );
  if (envUsedLabel) console.log(`EnvUsed: ${envUsedLabel}`);

  if (!config.STUB_MODE && process.env.DATABASE_URL) {
    const topUpIntervalMs = config.WARM_POOL_TOP_UP_INTERVAL_MS;

    console.log('[warm] Scheduling background question pool pre-warm (60 s delay)...');
    setTimeout(() => {
      if (_warmPoolRunning) {
        console.log('[warm] Startup warm skipped — another run already in progress.');
        return;
      }
      _warmPoolRunning = true;
      warmPoolRunner.runWarmPool({ delayMs: 400 }).catch(
        (e) => console.error('[warm] Startup runWarmPool error:', e.message)
      ).finally(() => { _warmPoolRunning = false; });
    }, 60_000);

    if (topUpIntervalMs > 0) {
      const intervalLabel = topUpIntervalMs >= 3_600_000
        ? `${(topUpIntervalMs / 3_600_000).toFixed(1)} h`
        : `${(topUpIntervalMs / 60_000).toFixed(1)} min`;
      console.log(`[warm] Scheduling recurring pool top-up every ${intervalLabel} (WARM_POOL_TOP_UP_INTERVAL_MS=${topUpIntervalMs}).`);

      const topUpTimer = setInterval(() => {
        if (_warmPoolRunning) {
          console.log('[warm] Top-up skipped — a warm run is already in progress.');
          return;
        }
        console.log('[warm] Starting scheduled pool top-up run...');
        _warmPoolRunning = true;
        warmPoolRunner.runWarmPool({ delayMs: 400 }).catch(
          (e) => console.error('[warm] Scheduled top-up runWarmPool error:', e.message)
        ).finally(() => { _warmPoolRunning = false; });
      }, topUpIntervalMs);

      topUpTimer.unref();
    } else {
      console.log('[warm] Recurring pool top-up disabled (WARM_POOL_TOP_UP_INTERVAL_MS=0).');
    }
  } else {
    console.log('[warm] Skipping pool pre-warm (STUB_MODE or no DATABASE_URL).');
  }
});
