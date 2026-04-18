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

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: 'CommonJS',
      target: 'ES2020',
      esModuleInterop: true,
    },
    fileName: path.basename(filename),
  });
  module._compile(transpiled.outputText, filename);
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
const { createMentorRoute } = require('./routes/mentor.cjs');
const { createTutorCache } = require('./services/tutorCache.cjs');
const { pickFromPool, markServed, saveToPool } = require('./services/generatedQuestionPool.cjs');
const { createFirebaseAuthRoute } = require('./routes/firebaseAuth.cjs');

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
  getEnsureDiagramFields: () => mentorRoute.ensureDiagramFields,
});

const tutorCache = createTutorCache({
  HAS_REPLIT_PROXY: config.HAS_REPLIT_PROXY,
  REPLIT_GEMINI_BASE_URL: config.REPLIT_GEMINI_BASE_URL,
  REPLIT_GEMINI_API_KEY: config.REPLIT_GEMINI_API_KEY,
  DIRECT_GEMINI_API_KEY: config.DIRECT_GEMINI_API_KEY,
});

const mentorRoute = createMentorRoute({
  sendJson, sendJsonWithHeaders, readJson, extractJsonObjectFromText,
  tutorCache,
  callGemini, callGeminiStream, callClaude, toClaudeMessages, selectModelForRequest,
  telemetry,
  CORS_ORIGIN: config.CORS_ORIGIN,
  GEMINI_MODEL: config.GEMINI_MODEL,
  GEMINI_TUTOR_MODEL: config.GEMINI_TUTOR_MODEL,
  CLAUDE_MODEL_SONNET: config.CLAUDE_MODEL_SONNET,
  CLAUDE_MODEL_HAIKU: config.CLAUDE_MODEL_HAIKU,
  ACTIVE_PROVIDER: config.ACTIVE_PROVIDER,
  STUB_MODE: config.STUB_MODE,
  HAS_ANTHROPIC_PROXY: config.HAS_ANTHROPIC_PROXY,
  IS_DEV: config.IS_DEV,
  TEACH_CACHE_TTL_MS: config.TEACH_CACHE_TTL_MS,
  MAX_HISTORY_TURNS: config.MAX_HISTORY_TURNS,
  tryParseJsonStrict,
  loadTrianglesMentorSeed, normalizeLines, mergeLines,
  validateTutorStructured, buildTutorFallback, validateAttemptLoop,
  initHintState, computeNextHint, scoreRubric,
  retrieveTrianglesSources, getDiagramTemplate, resolveTopicTeachContract,
  orchestrateTutorResponse,
  buildTrianglesGrindContractPrompt,
  buildGeminiImagePart, validateMentorImagePayload,
  trianglesRubricMap,
  isStubMode, buildStubTutorStructured, buildStubText,
  FEEDBACK_DIR: config.FEEDBACK_DIR,
  FEEDBACK_FILE: config.FEEDBACK_FILE,
  VISUALS_DIR: config.VISUALS_DIR,
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
  buildMoreLikeThisUserPrompt: mentorRoute.buildMoreLikeThisUserPrompt,
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
const questionRoutes = createQuestionRoutes(routeDeps);
const firebaseAuthRoute = createFirebaseAuthRoute({ sendJson, readJson, firebaseAdmin });

async function handleRequest(req, res) {
  const reqUrlRaw = String(req.url || "");
  const reqPath = reqUrlRaw.split("?")[0];

  if (
    req.method === 'OPTIONS' &&
    (
      reqPath === '/api/mentor' ||
      reqPath === '/api/mentor/cache-stats' ||
      reqPath === '/api/mentor/stream' ||
      reqPath === '/api/more-like-this' ||
      reqPath === '/api/step-solution' ||
      reqPath === '/api/check-solution' ||
      reqPath === '/api/tutor-feedback' ||
      reqPath === '/api/generate-diagram' ||
      reqPath === '/api/generate-visual' ||
      reqPath === '/api/session/start' ||
      reqPath === '/api/share-token' ||
      reqPath === '/api/auth/firebase-token' ||
      /^\/api\/session\/[^/]+$/.test(reqPath) ||
      /^\/api\/session\/[^/]+\/submit$/.test(reqPath)
    )
  ) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': config.CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Lazytopper-Uid',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
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

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    return sendJson(res, 200, {
      ok: true,
      service: 'lazytopper-ai-server',
      providers: {
        gemini: {
          active: !config.STUB_MODE,
          model: config.GEMINI_MODEL,
          auth: config.HAS_REPLIT_PROXY ? 'replit-proxy' : (config.HAS_DIRECT_KEY ? 'direct-key' : 'none'),
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

  if (req.method === 'GET' && reqPath === '/api/mentor/cache-stats') {
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = req.headers['x-admin-secret'];
    const internalAdmin = req.headers['x-internal-admin'];
    const authedBySecret = adminSecret && providedSecret === adminSecret;
    const authedByInternal = internalAdmin === '1';
    if (!authedBySecret && !authedByInternal) {
      return sendJson(res, 401, { ok: false, error: 'Admin access required' });
    }
    try {
      const stats = tutorCache ? await tutorCache.getStats() : { error: 'Cache not available' };
      return sendJson(res, 200, { ok: true, stats });
    } catch (e) {
      return sendJson(res, 500, { ok: false, error: e.message });
    }
  }

  if (req.method === 'POST' && req.url === '/api/mentor') {
    return mentorRoute.handleMentorRequest(req, res);
  }
  if (req.method === 'POST' && req.url === '/api/mentor/stream') {
    return mentorRoute.handleMentorStreamRequest(req, res);
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

  if (req.method === 'POST' && reqPath === '/api/auth/firebase-token') {
    return firebaseAuthRoute.handleFirebaseToken(req, res);
  }
  if (req.method === 'POST' && reqPath === '/api/generate-visual') {
    return diagramRoutes.handleGenerateVisual(req, res);
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
    `Gemini: ${config.STUB_MODE ? 'OFF' : 'ON'} (${tutorModelLabel}) | Auth: ${config.HAS_REPLIT_PROXY ? 'replit-proxy' : (config.HAS_DIRECT_KEY ? 'direct-key' : 'none')}`
  );
  console.log(
    `Claude: ${config.HAS_ANTHROPIC_PROXY ? 'ON' : 'OFF'} (sonnet=${config.CLAUDE_MODEL_SONNET}, haiku=${config.CLAUDE_MODEL_HAIKU}) | Auth: ${config.HAS_ANTHROPIC_PROXY ? 'replit-proxy' : 'none'}`
  );
  console.log(
    `Routing: visual→${config.HAS_ANTHROPIC_PROXY ? 'claude-sonnet' : 'gemini'} | chat→gemini | diagram-compare→claude+gemini | MaxHistory: ${config.MAX_HISTORY_TURNS} turns`
  );
  if (envUsedLabel) console.log(`EnvUsed: ${envUsedLabel}`);
});
