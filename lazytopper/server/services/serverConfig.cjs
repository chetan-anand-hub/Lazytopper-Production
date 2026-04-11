const path = require('path');
const fs = require('fs');

function loadDotEnvIfPresent() {
  const envPath = path.join(__dirname, '..', '.env');
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k && process.env[k] == null) process.env[k] = v;
    });
  } catch (e) {
    console.warn('[env] Failed to load server/.env:', e.message);
  }
}

function resolveConfig() {
  loadDotEnvIfPresent();

  const RAW_API_KEY = String(process.env.API_KEY || '').trim();
  const RAW_AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
  const ENV_USED = [];

  const REPLIT_GEMINI_BASE_URL = String(process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || '').trim().replace(/\/+$/, '');
  const REPLIT_GEMINI_API_KEY = String(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || '').trim();
  const HAS_REPLIT_PROXY = Boolean(REPLIT_GEMINI_BASE_URL && REPLIT_GEMINI_API_KEY);

  const REPLIT_ANTHROPIC_BASE_URL = String(process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL || '').trim().replace(/\/+$/, '');
  const REPLIT_ANTHROPIC_API_KEY = String(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || '').trim();
  const HAS_ANTHROPIC_PROXY = Boolean(REPLIT_ANTHROPIC_BASE_URL && REPLIT_ANTHROPIC_API_KEY);

  const CLAUDE_MODEL_SONNET = 'claude-sonnet-4-6';
  const CLAUDE_MODEL_HAIKU = 'claude-haiku-4-5';
  const ANTHROPIC_TIMEOUT_MS = Math.max(5000, Number(process.env.ANTHROPIC_TIMEOUT_MS || 60000) || 60000);

  if (HAS_REPLIT_PROXY) ENV_USED.push('AI_INTEGRATIONS_GEMINI (Replit proxy)');
  if (HAS_ANTHROPIC_PROXY) ENV_USED.push('AI_INTEGRATIONS_ANTHROPIC (Replit proxy)');
  if (RAW_API_KEY) ENV_USED.push('API_KEY');

  const HAS_API_KEY = Boolean(RAW_API_KEY);
  if (!RAW_AI_PROVIDER && (HAS_API_KEY || HAS_REPLIT_PROXY)) {
    process.env.AI_PROVIDER = 'gemini';
  } else if (RAW_AI_PROVIDER) {
    ENV_USED.push('AI_PROVIDER');
  }

  const PORT = process.env.PORT || 3001;
  const AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
  const API_KEY = String(process.env.API_KEY || '').trim();
  const CORS_ORIGIN = String(process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
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

  return {
    PORT, CORS_ORIGIN, ENV_USED,
    GEMINI_API_KEY, DIRECT_GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT_MS,
    HAS_REPLIT_PROXY, REPLIT_GEMINI_BASE_URL, REPLIT_GEMINI_API_KEY,
    HAS_ANTHROPIC_PROXY, REPLIT_ANTHROPIC_BASE_URL, REPLIT_ANTHROPIC_API_KEY,
    ANTHROPIC_TIMEOUT_MS,
    CLAUDE_MODEL_SONNET, CLAUDE_MODEL_HAIKU,
    STUB_MODE, ACTIVE_PROVIDER, HAS_DIRECT_KEY, IS_DEV,
    MAX_HISTORY_TURNS, TEACH_CACHE_TTL_MS,
    FEEDBACK_DIR, FEEDBACK_FILE,
    REPO_ROOT,
  };
}

module.exports = { resolveConfig };
