// server/index.cjs
//
// LazyTopper AI Gateway server (Gemini-powered)
// - POST /api/mentor         : Mentor personas (plan / explain / solve / coach / mindset)
// - POST /api/more-like-this : HPQ-anchored "more like this" question variants
// - GET  /health, /api/health: basic health checks
//
// Node 18+ recommended.
//
// Auth (recommended):
//   Put AI_PROVIDER and API_KEY into server/.env
//   Example:
//     AI_PROVIDER=gemini
//     API_KEY=your_key_here
//     GEMINI_MODEL=gemini-2.5-flash
//
// If AI_PROVIDER or API_KEY is missing, the server runs in deterministic STUB mode.

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
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
  try {
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
  } catch (err) {
    throw err;
  }
};

const { buildTrianglesGrindContractPrompt } = require(
  path.join(__dirname, '../src/prompts/grind/trianglesGrindContract.ts')
);

const telemetry = require('./telemetry.cjs');
const {
  buildGeminiImagePart,
  validateMentorImagePayload,
} = require('./mentorImageSupport.cjs');
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
  startSessionHandler,
  getSessionHandler,
  submitSessionHandler,
} = require("./sessionHandlers.cjs");
const { createGeminiClient } = require('./services/geminiClient.cjs');
const { createClaudeClient } = require('./services/claudeClient.cjs');
const { createHttpUtils, readJson, extractJsonObjectFromText } = require('./services/httpUtils.cjs');
const { createStubHandlers } = require('./services/stubHandlers.cjs');
const { getCbseExamDateInfo, extractCbseNoticeFromHtml, extractExplicitExamDate, parseDmyToIso, normalizeDateToIso, predictCbseExamDate } = require('./services/cbseExamDate.cjs');
const { createShareRoutes } = require('./routes/share.cjs');
const { createDiagramRoutes } = require('./routes/diagrams.cjs');
const { createQuestionRoutes } = require('./routes/questions.cjs');
const { createMentorRoute } = require('./routes/mentor.cjs');

function loadDotEnvIfPresent() {
  // Load ONLY server/.env by default, without external dependencies.
  // This keeps secrets out of git and avoids requiring `dotenv`.
  const envPath = path.join(__dirname, '.env');
  try {
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = String(line || '').trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      // Strip surrounding quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k && process.env[k] == null) process.env[k] = v;
    });
  } catch (e) {
    // Don't crash server if env file is malformed; log and continue.
    console.warn('[env] Failed to load server/.env:', e.message);
  }
}
loadDotEnvIfPresent();

const RAW_API_KEY = String(process.env.API_KEY || '').trim();
const RAW_AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
const ENV_USED = [];

const REPLIT_GEMINI_BASE_URL_RAW = String(process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || '').trim().replace(/\/+$/, '');
const REPLIT_GEMINI_API_KEY = String(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || '').trim();
const HAS_REPLIT_PROXY = Boolean(REPLIT_GEMINI_BASE_URL_RAW && REPLIT_GEMINI_API_KEY);
const REPLIT_GEMINI_BASE_URL = REPLIT_GEMINI_BASE_URL_RAW;

const REPLIT_ANTHROPIC_BASE_URL_RAW = String(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '');
const REPLIT_ANTHROPIC_API_KEY = String(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '').trim();
const HAS_ANTHROPIC_PROXY = Boolean(REPLIT_ANTHROPIC_BASE_URL_RAW && REPLIT_ANTHROPIC_API_KEY);
const REPLIT_ANTHROPIC_BASE_URL = REPLIT_ANTHROPIC_BASE_URL_RAW;

const CLAUDE_MODEL_SONNET = 'claude-sonnet-4-6';
const CLAUDE_MODEL_HAIKU = 'claude-haiku-4-5';
const ANTHROPIC_TIMEOUT_MS = Math.max(5000, Number(process.env.ANTHROPIC_TIMEOUT_MS || 60000) || 60000);

if (HAS_REPLIT_PROXY) {
  ENV_USED.push('AI_INTEGRATIONS_GEMINI (Replit proxy)');
}
if (HAS_ANTHROPIC_PROXY) {
  ENV_USED.push('AI_INTEGRATIONS_ANTHROPIC (Replit proxy)');
}

if (RAW_API_KEY) {
  ENV_USED.push('API_KEY');
}

const HAS_API_KEY = Boolean(String(process.env.API_KEY || '').trim());
if (!RAW_AI_PROVIDER && (HAS_API_KEY || HAS_REPLIT_PROXY)) {
  process.env.AI_PROVIDER = 'gemini';
} else if (RAW_AI_PROVIDER) {
  ENV_USED.push('AI_PROVIDER');
}

const PORT = process.env.PORT || 3001;
const AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
const API_KEY = String(process.env.API_KEY || '').trim();
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
const { sendJson, sendJsonWithHeaders } = createHttpUtils(CORS_ORIGIN);
const AI_PROVIDER_NORMALIZED = AI_PROVIDER.toLowerCase();
const HAS_DIRECT_KEY = AI_PROVIDER_NORMALIZED === 'gemini' && Boolean(API_KEY);
const STUB_MODE = !HAS_REPLIT_PROXY && !HAS_DIRECT_KEY && !HAS_ANTHROPIC_PROXY;
const ACTIVE_PROVIDER = STUB_MODE ? 'stub' : (HAS_REPLIT_PROXY || HAS_DIRECT_KEY ? 'gemini' : 'anthropic');
const GEMINI_API_KEY = HAS_REPLIT_PROXY ? REPLIT_GEMINI_API_KEY : (HAS_DIRECT_KEY ? API_KEY : '');
const DIRECT_GEMINI_API_KEY = HAS_DIRECT_KEY ? API_KEY : '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = Math.max(5000, Number(process.env.GEMINI_TIMEOUT_MS || 20000) || 20000);
const IS_DEV = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
const REPO_ROOT = process.cwd();
const MAX_HISTORY_TURNS = 4;
const FEEDBACK_DIR = path.join(REPO_ROOT, '.project_memory', 'ops', 'feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'triangles_feedback.jsonl');
const TEACH_CACHE_TTL_MS = IS_DEV ? 90_000 : 60_000;

const geminiClientModule = createGeminiClient({
  GEMINI_API_KEY, HAS_REPLIT_PROXY, REPLIT_GEMINI_BASE_URL,
  REPLIT_GEMINI_API_KEY, DIRECT_GEMINI_API_KEY, GEMINI_TIMEOUT_MS,
});
const claudeClientModule = createClaudeClient({
  HAS_ANTHROPIC_PROXY, REPLIT_ANTHROPIC_BASE_URL, REPLIT_ANTHROPIC_API_KEY,
  ANTHROPIC_TIMEOUT_MS, CLAUDE_MODEL_SONNET, CLAUDE_MODEL_HAIKU,
  HAS_REPLIT_PROXY, GEMINI_MODEL, MAX_HISTORY_TURNS,
});



function tryParseJsonStrict(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}



let mentorSeedCache = undefined;
function loadTrianglesMentorSeed() {
  if (mentorSeedCache !== undefined) return mentorSeedCache;
  const jsonPath = path.join(__dirname, '../src/data/_final/maths-triangles/mentor.json');
  const tsPath = path.join(__dirname, '../src/data/_finalGenerated/triangles.mentor.ts');
  try {
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      mentorSeedCache = JSON.parse(raw);
      return mentorSeedCache;
    }
  } catch (err) {
    console.warn('[stub] Failed to read mentor.json:', err?.message || err);
  }
  try {
    if (fs.existsSync(tsPath)) {
      const mod = require(tsPath);
      mentorSeedCache = mod?.trianglesMentor || mod?.default || null;
      return mentorSeedCache;
    }
  } catch (err) {
    console.warn('[stub] Failed to load triangles.mentor.ts:', err?.message || err);
  }
  mentorSeedCache = null;
  return mentorSeedCache;
}

function normalizeLines(value) {
  const raw = Array.isArray(value) ? value : [];
  const seen = new Set();
  const lines = [];
  raw.forEach((item) => {
    const text = String(item || '').replace(/\s+/g, ' ').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    lines.push(text);
  });
  return lines;
}

function mergeLines(primary, fallback, min) {
  const merged = normalizeLines([...(primary || []), ...(fallback || [])]);
  if (merged.length >= min) return merged;
  const fallbackLines = normalizeLines(fallback || []);
  const combined = normalizeLines([...merged, ...fallbackLines]);
  if (combined.length >= min) return combined;
  const pad = [
    'Use a clear similarity criterion (AA/SAS/SSS).',
    'Match corresponding sides and angles carefully.',
    'State the final similarity conclusion explicitly.',
  ];
  return normalizeLines([...combined, ...pad]).slice(0, Math.max(min, combined.length));
}




function isObjectiveType(qType, section) {
  const t = (qType || '').toLowerCase();
  const s = (section || '').toUpperCase();
  return t === 'mcq' || t === 'assertionreason' || t === 'assertion-reason' || t === 'ar' || t === 'objective' || t === 'fillblank' || s === 'A';
}



function persistTutorFeedback(payload) {
  const helpful = payload?.helpful;
  if (typeof helpful !== 'boolean') throw new Error('helpful must be boolean');

  const commentRaw = typeof payload?.comment === 'string' ? payload.comment : '';
  const comment = commentRaw.slice(0, 1000);
  const record = {
    ts: new Date().toISOString(),
    helpful,
    comment,
    context: {
      topicKey: payload?.topicKey || null,
      nodeId: payload?.nodeId || null,
      responseId: payload?.responseId || null,
      tab: payload?.tab || null,
      mode: payload?.mode || null,
      grade: payload?.grade || null,
      subject: payload?.subject || null,
    },
    meta: {
      userAgent: payload?.userAgent || null,
      clientTs: payload?.clientTs || null,
    },
  };

  fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
  fs.appendFileSync(FEEDBACK_FILE, JSON.stringify(record) + '\n');
  return record;
}

function isNoProviderEnabled() {
  const flag = String(process.env.LT_NO_PROVIDER || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
}

async function callGemini(model, finalContents, config) {
  return geminiClientModule.callGemini(model, finalContents, config);
}

async function callClaude(model, messages, systemPrompt, config) {
  return claudeClientModule.callClaude(model, messages, systemPrompt, config);
}

function toClaudeMessages(messages) {
  return claudeClientModule.toClaudeMessages(messages);
}

function selectModelForRequest(mode, userQuery) {
  return claudeClientModule.selectModelForRequest(mode, userQuery);
}

async function handleRequest(req, res) {
  const reqUrlRaw = String(req.url || "");
  const reqPath = reqUrlRaw.split("?")[0];

  // CORS preflight
  if (
    req.method === 'OPTIONS' &&
    (
      reqPath === '/api/mentor' ||
      reqPath === '/api/more-like-this' ||
      reqPath === '/api/step-solution' ||
      reqPath === '/api/check-solution' ||
      reqPath === '/api/tutor-feedback' ||
      reqPath === '/api/generate-diagram' ||
      reqPath === '/api/generate-visual' ||
      reqPath === '/api/session/start' ||
      reqPath === '/api/share-token' ||
      /^\/api\/session\/[^/]+$/.test(reqPath) ||
      /^\/api\/session\/[^/]+\/submit$/.test(reqPath)
    )
  ) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Lazytopper-Uid',
      'Access-Control-Max-Age': '86400',
    });
    return res.end();
  }

  // Share token generation & verification
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

    // Health checks
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    return sendJson(res, 200, {
      ok: true,
      service: 'lazytopper-ai-server',
      providers: {
        gemini: {
          active: !STUB_MODE,
          model: GEMINI_MODEL,
          auth: HAS_REPLIT_PROXY ? 'replit-proxy' : (HAS_DIRECT_KEY ? 'direct-key' : 'none'),
          routes: ['tutoring_chat', 'more_like_this', 'step_solution'],
        },
        anthropic: {
          active: HAS_ANTHROPIC_PROXY,
          modelSonnet: CLAUDE_MODEL_SONNET,
          modelHaiku: CLAUDE_MODEL_HAIKU,
          auth: HAS_ANTHROPIC_PROXY ? 'replit-proxy' : 'none',
          routes: ['visual_generation', 'factual_queries'],
        },
      },
      routing: {
        visual: HAS_ANTHROPIC_PROXY ? `claude:${CLAUDE_MODEL_SONNET}` : `gemini:${GEMINI_MODEL}`,
        factual: HAS_ANTHROPIC_PROXY ? `claude:${CLAUDE_MODEL_HAIKU}` : `gemini:${GEMINI_MODEL}`,
        chat: `gemini:${GEMINI_MODEL}`,
      },
      maxHistoryTurns: MAX_HISTORY_TURNS,
      stub: STUB_MODE,
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
      return sendJson(res, 500, {
        ok: false,
        error: 'Failed to resolve CBSE exam date',
        details: err?.message || String(err),
      });
    }
  }

  if (req.method === "POST" && reqPath === "/api/generate-diagram") {
    return diagramRoutes.handleGenerateDiagram(req, res);
  }

    if (req.method === "POST" && reqPath === "/api/session/start") {
    let reqJson;
    try {
      reqJson = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Invalid JSON" });
    }
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
    try {
      reqJson = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: "Invalid JSON" });
    }
    const sessionId = decodeURIComponent(reqPath.split("/")[3] || "");
    const result = submitSessionHandler(req, sessionId, reqJson || {});
    return sendJson(res, result.status, result.body);
  }

  // Tutor feedback endpoint
  if (req.method === 'POST' && req.url === '/api/tutor-feedback') {
    let reqJson;
    try {
      reqJson = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    try {
      const record = persistTutorFeedback(reqJson);
      return sendJson(res, 200, { ok: true, record });
    } catch (e) {
      return sendJson(res, 400, { error: e?.message || 'Failed to store feedback' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/mentor') {
    return mentorRoute.handleMentorRequest(req, res);
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

  if (req.method === 'POST' && reqPath === '/api/generate-visual') {
    return diagramRoutes.handleGenerateVisual(req, res);
  }

  // 404
  return sendJson(res, 404, { error: 'Not Found' });
}

const {
  buildStubTutorStructured, buildStubText, buildStubMoreLikeThis,
  buildFallbackSteps, buildStubStepSolution, isStubMode,
} = createStubHandlers({
  STUB_MODE, isObjectiveType, isNoProviderEnabled,
  buildTutorFallback, loadTrianglesMentorSeed, normalizeLines, mergeLines,
  getEnsureDiagramFields: () => mentorRoute.ensureDiagramFields,
});

const mentorRoute = createMentorRoute({
  sendJson, sendJsonWithHeaders, readJson, extractJsonObjectFromText,
  callGemini, callClaude, toClaudeMessages, selectModelForRequest,
  telemetry,
  GEMINI_MODEL, CLAUDE_MODEL_SONNET, CLAUDE_MODEL_HAIKU,
  ACTIVE_PROVIDER, STUB_MODE, HAS_ANTHROPIC_PROXY, IS_DEV,
  TEACH_CACHE_TTL_MS, MAX_HISTORY_TURNS,
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
  FEEDBACK_DIR, FEEDBACK_FILE,
});

const routeDeps = {
  sendJson, sendJsonWithHeaders, readJson,
  callGemini, callClaude,
  GEMINI_MODEL, CLAUDE_MODEL_SONNET, ACTIVE_PROVIDER, STUB_MODE,
  HAS_ANTHROPIC_PROXY, isStubMode,
  buildStubMoreLikeThis, buildMoreLikeThisUserPrompt: mentorRoute.buildMoreLikeThisUserPrompt,
  buildFallbackSteps, buildStubStepSolution,
  isObjectiveType, extractJsonObjectFromText,
  buildGeminiImagePart, validateMentorImagePayload,
  firebaseAdmin, adminFirestore,
};
const shareRoutes = createShareRoutes(routeDeps);
const diagramRoutes = createDiagramRoutes(routeDeps);
const questionRoutes = createQuestionRoutes(routeDeps);

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((e) => {
    console.error(e);
    sendJson(res, 500, { error: 'Unhandled server error', details: e.message });
  });
});

server.listen(PORT, () => {
  console.log(`LazyTopper AI server running on port ${PORT}`);
  const envUsedLabel = ENV_USED.length ? ENV_USED.join(',') : '';
  console.log(
    `Gemini: ${STUB_MODE ? 'OFF' : 'ON'} (${GEMINI_MODEL}) | Auth: ${HAS_REPLIT_PROXY ? 'replit-proxy' : (HAS_DIRECT_KEY ? 'direct-key' : 'none')}`
  );
  console.log(
    `Claude: ${HAS_ANTHROPIC_PROXY ? 'ON' : 'OFF'} (sonnet=${CLAUDE_MODEL_SONNET}, haiku=${CLAUDE_MODEL_HAIKU}) | Auth: ${HAS_ANTHROPIC_PROXY ? 'replit-proxy' : 'none'}`
  );
  console.log(
    `Routing: visual→${HAS_ANTHROPIC_PROXY ? 'claude-sonnet' : 'gemini'} | factual→${HAS_ANTHROPIC_PROXY ? 'claude-haiku' : 'gemini'} | chat→gemini | MaxHistory: ${MAX_HISTORY_TURNS} turns`
  );
  if (envUsedLabel) console.log(`EnvUsed: ${envUsedLabel}`);
});