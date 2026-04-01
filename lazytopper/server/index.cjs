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
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

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
const RAW_GEMINI_API_KEY = String(process.env.GEMINI_API_KEY || '').trim();
const RAW_AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
const ENV_USED = [];

if (!RAW_API_KEY && RAW_GEMINI_API_KEY) {
  process.env.API_KEY = RAW_GEMINI_API_KEY;
  ENV_USED.push('GEMINI_API_KEY');
} else if (RAW_API_KEY) {
  ENV_USED.push('API_KEY');
}

const HAS_API_KEY = Boolean(String(process.env.API_KEY || '').trim());
if (!RAW_AI_PROVIDER && HAS_API_KEY) {
  process.env.AI_PROVIDER = 'gemini';
} else if (RAW_AI_PROVIDER) {
  ENV_USED.push('AI_PROVIDER');
}

const PORT = process.env.PORT || 3001;
const AI_PROVIDER = String(process.env.AI_PROVIDER || '').trim();
const API_KEY = String(process.env.API_KEY || '').trim();
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || 'http://localhost:5173').trim();
const AI_PROVIDER_NORMALIZED = AI_PROVIDER.toLowerCase();
const STUB_MODE = !AI_PROVIDER || !API_KEY || AI_PROVIDER_NORMALIZED !== 'gemini';
const ACTIVE_PROVIDER = STUB_MODE ? 'stub' : AI_PROVIDER_NORMALIZED;
const GEMINI_API_KEY = AI_PROVIDER_NORMALIZED === 'gemini' ? API_KEY : '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_TIMEOUT_MS = Math.max(5000, Number(process.env.GEMINI_TIMEOUT_MS || 20000) || 20000);
const IS_DEV = String(process.env.NODE_ENV || '').toLowerCase() !== 'production';
const GEMINI_MODEL_ZOMBIE = process.env.GEMINI_MODEL_ZOMBIE || '';
const GEMINI_MODEL_BEAST = process.env.GEMINI_MODEL_BEAST || '';
const REPO_ROOT = process.cwd();
const FEEDBACK_DIR = path.join(REPO_ROOT, '.project_memory', 'ops', 'feedback');
const FEEDBACK_FILE = path.join(FEEDBACK_DIR, 'triangles_feedback.jsonl');
const TEACH_CACHE_TTL_MS = IS_DEV ? 90_000 : 60_000;
const teachCache = new Map();
const inflightTeach = new Map();
const CBSE_EXAM_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cbseExamCache = new Map();

function buildTeachContractCacheKey(payload) {
  if (!payload || typeof payload !== 'object') return 'teach_contract|unknown';
  const subject = String(payload.subject || '').trim();
  const grade = payload.grade != null ? String(payload.grade) : '';
  const topicKey = String(payload.topicKey || payload.chapter || payload.topic || '').trim();
  const nodeId = String(payload.mindmapNodeId || payload.nodeId || '').trim();
  const stepIndex = payload.stepIndex != null ? String(payload.stepIndex) : '';
  const vibe = String(payload.vibe || '').trim();
  return ['teach_contract', subject, grade, topicKey, nodeId, stepIndex, vibe].join('|');
}

function parseDmyToIso(raw) {
  const match = String(raw || '').match(/^(\d{2})[./-](\d{2})[./-](\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function normalizeDateToIso(raw) {
  const dmy = parseDmyToIso(raw);
  if (dmy) return dmy;
  const parsed = new Date(String(raw || '').trim());
  if (Number.isNaN(parsed.getTime())) return null;
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function predictCbseExamDate(studentClass) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const year = currentMonth >= 8 ? now.getFullYear() + 1 : now.getFullYear();
  const day = String(studentClass === '12' ? 16 : 15).padStart(2, '0');
  return `${year}-02-${day}`;
}

function extractExplicitExamDate(rowText) {
  const nowYear = new Date().getFullYear();
  const dateMatches = [...String(rowText || '').matchAll(/(\d{2})[./-](\d{2})[./-](\d{4})/g)];
  for (const match of dateMatches) {
    const dd = Number(match[1]);
    const mm = Number(match[2]);
    const yyyy = Number(match[3]);
    if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) continue;
    if (yyyy < nowYear || yyyy > nowYear + 1) continue;
    if (mm < 1 || mm > 4) continue;
    if (dd < 1 || dd > 31) continue;
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  }
  return null;
}

function extractCbseNoticeFromHtml(html, studentClass) {
  const classMatcher = studentClass === '12'
    ? /(revised\s+datesheet\s+class\s*xii|date\s*sheet\s*for\s*class\s*xii|board\s*examinations\s*-\s*\d{4})/i
    : /(revised\s+datesheet\s+class\s*x(?!ii)|date\s*sheet\s*for\s*class\s*x\s*and\s*xii|board\s*examinations\s*-\s*\d{4})/i;

  const rows = String(html || '').match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const row of rows) {
    const rowText = row.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!classMatcher.test(rowText)) continue;

    const dateCellMatch = row.match(/<td[^>]*>\s*(\d{2}[./-]\d{2}[./-]\d{4})\s*<\/td>/i);
    const noticeDate = dateCellMatch ? parseDmyToIso(dateCellMatch[1]) : null;

    const hrefMatch = row.match(/href="([^"]+)"/i);
    const href = hrefMatch && hrefMatch[1] ? hrefMatch[1] : '';
    const noticeUrl = href
      ? (href.startsWith('http') ? href : `https://www.cbse.gov.in/cbsenew/${href.replace(/^\/+/, '')}`)
      : 'https://www.cbse.gov.in/cbsenew/examination_circular.html';

    const explicitExamDate = extractExplicitExamDate(rowText);
    return {
      noticeDate,
      noticeUrl,
      explicitExamDate,
    };
  }
  return null;
}

async function getCbseExamDateInfo(studentClass) {
  const cls = String(studentClass || '10') === '12' ? '12' : '10';
  const cacheKey = `class_${cls}`;
  const cached = cbseExamCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const predicted = predictCbseExamDate(cls);
  let result = {
    class: cls,
    source: 'predicted',
    examDate: predicted,
    noticeUrl: 'https://www.cbse.gov.in/cbsenew/examination_circular.html',
    note: 'Using predicted board start date from prior CBSE trends.',
  };

  const overrideEnvKey = cls === '12' ? 'CBSE_CLASS12_OFFICIAL_DATE' : 'CBSE_CLASS10_OFFICIAL_DATE';
  const overrideRaw = String(process.env[overrideEnvKey] || '').trim();
  const overrideIso = normalizeDateToIso(overrideRaw);
  if (overrideIso) {
    result = {
      class: cls,
      source: 'official',
      examDate: overrideIso,
      noticeUrl: 'manual_env_override',
      note: `Manual official override from ${overrideEnvKey}.`,
    };
    cbseExamCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + CBSE_EXAM_CACHE_TTL_MS,
    });
    return result;
  }

  try {
    const res = await fetch('https://www.cbse.gov.in/cbsenew/examination_circular.html', {
      headers: {
        'user-agent': 'LazyTopper/1.0',
      },
    });
    if (res.ok) {
      const html = await res.text();
      const notice = extractCbseNoticeFromHtml(html, cls);
      if (notice) {
        if (notice.explicitExamDate) {
          result = {
            class: cls,
            source: 'official',
            examDate: notice.explicitExamDate,
            noticeUrl: notice.noticeUrl,
            noticeDate: notice.noticeDate,
            note: 'Exam date extracted from CBSE circular notice.',
          };
        } else {
          result = {
            class: cls,
            source: 'predicted',
            examDate: predicted,
            noticeUrl: notice.noticeUrl,
            noticeDate: notice.noticeDate,
            note: 'CBSE notice found, but exact exam start date was not machine-readable; predicted date used.',
          };
        }
      }
    }
  } catch (_err) {
    // Keep predicted fallback.
  }

  cbseExamCache.set(cacheKey, {
    value: result,
    expiresAt: Date.now() + CBSE_EXAM_CACHE_TTL_MS,
  });
  return result;
}

/**
 * Helper to send JSON with CORS headers.
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {any} body
 */
function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
  });
  res.end(JSON.stringify(body));
}

function sendJsonWithHeaders(res, status, body, extraHeaders) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    ...(extraHeaders || {}),
  });
  res.end(JSON.stringify(body));
}

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

function extractJsonObjectFromText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const parseObject = (value) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const direct = parseObject(trimmed);
  if (direct) return direct;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = trimmed.slice(firstBrace, lastBrace + 1);
    const slicedParsed = parseObject(sliced);
    if (slicedParsed) return slicedParsed;
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch && fencedMatch[1]) {
    const fencedParsed = parseObject(fencedMatch[1].trim());
    if (fencedParsed) return fencedParsed;
  }

  return null;
}

function isValidMentorProtocol(obj, mode) {
  if (!obj || typeof obj !== 'object') return false;

  // Board-steps protocol: strict envelope
  if (mode === 'board_steps_ms') {
    if (obj.kind !== 'board_steps_ms') return false;
    return typeof obj.totalMarks === 'number' && Array.isArray(obj.steps);
  }

  // Solve-with-me protocol: frontend expects a SINGLE turn object:
  // { kind: "question" | "hint" | "final", tutor: string, ... }
  // Keep backward compatibility for older { kind: "solve_with_me", turns: [...] } shapes.
  if (mode === 'solve_with_me') {
    if (obj.kind === 'solve_with_me') return Array.isArray(obj.turns);

    if (obj.kind !== 'question' && obj.kind !== 'hint' && obj.kind !== 'final') return false;
    if (typeof obj.tutor === 'string' && String(obj.tutor).trim()) return true;
    if (obj.tutor && typeof obj.tutor === 'object' && !Array.isArray(obj.tutor)) {
      const tutorText =
        typeof obj.tutor.text === 'string'
          ? obj.tutor.text
          : typeof obj.tutor.rawText === 'string'
            ? obj.tutor.rawText
            : '';
      if (String(tutorText || '').trim()) return true;
      if (obj.tutor.next || obj.tutor.diagnosis || obj.tutor.practice_next || obj.tutor.board_tip) {
        return true;
      }
    }
    return false;
  }

  // Unknown protocol mode
  return false;
}

function summarizeValidationIssues(issues, max = 4) {
  const list = Array.isArray(issues) ? issues.map((item) => String(item || '').trim()).filter(Boolean) : [];
  if (!list.length) return 'unknown validation issue';
  const clipped = list.slice(0, max).join('; ');
  return list.length > max ? `${clipped}; +${list.length - max} more` : clipped;
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

function buildStubTutorStructured(mode, payload) {
  let structured = buildTutorFallback(mode, payload);
  const seed = loadTrianglesMentorSeed();
  if (!seed || typeof seed !== 'object') return structured;
  const mentor = seed.mentorResponse && typeof seed.mentorResponse === 'object' ? seed.mentorResponse : seed;

  const correct = normalizeLines(mentor.correctAnswerFeedback);
  const incorrect = normalizeLines(mentor.incorrectAnswerFeedback);
  const warnings = normalizeLines(mentor.examinerWarning);
  const nextSteps = normalizeLines(mentor.nextStepSuggestion);

  if (mode === 'learn_teach') {
    structured.teach = structured.teach || {};
    structured.teach.simpleExplanation = mergeLines(
      [...correct, ...incorrect],
      structured.teach.simpleExplanation || [],
      4
    );
    structured.teach.cbseExamSentence = mergeLines(
      warnings,
      structured.teach.cbseExamSentence || [],
      2
    );
    structured.commonMistakes = mergeLines(
      incorrect,
      structured.commonMistakes || [],
      1
    );
    if (nextSteps[0]) structured.checkQuestion = nextSteps[0];
  }

  if (mode === 'learn_mindmap') {
    structured.conceptBullets = mergeLines(
      [...correct, ...incorrect],
      structured.conceptBullets || [],
      5
    );
    structured.examLines = mergeLines(
      warnings,
      structured.examLines || [],
      2
    );
    if (incorrect[0]) structured.commonError = incorrect[0];
    if (nextSteps[0]) structured.commonFix = nextSteps[0];
    if (nextSteps[1]) structured.checkQuestion = nextSteps[1];
  }

  if (mode === 'learn_proof' || mode === 'solve_with_me' || mode === 'board_steps_ms') {
    structured = ensureDiagramFields(structured, payload);
  }

  return structured;
}

function buildStubText() {
  const seed = loadTrianglesMentorSeed();
  if (seed && typeof seed === 'object') {
    const mentor = seed.mentorResponse && typeof seed.mentorResponse === 'object' ? seed.mentorResponse : seed;
    const lines = normalizeLines([
      ...(mentor.correctAnswerFeedback || []),
      ...(mentor.incorrectAnswerFeedback || []),
      ...(mentor.examinerWarning || []),
      ...(mentor.nextStepSuggestion || []),
    ]);
    if (lines.length) return lines.join('\n');
  }
  return 'Stub mentor response active. Provide AI_PROVIDER and API_KEY to enable live responses.';
}

function buildStubMoreLikeThis(payload) {
  const seedQuestion = payload?.seedQuestion || {};
  const baseText = String(seedQuestion.text || seedQuestion.questionText || '').trim();
  const marks = seedQuestion.marks;
  const difficulty = seedQuestion.difficulty;
  const bloomSkill = seedQuestion.bloomSkill;
  const subject = payload?.subject || 'Maths/Science';
  const topicKey = payload?.topicKey || null;
  const requested = Number(payload?.numVariants || 3);
  const numVariants = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 6) : 3;
  const seedLine =
    baseText ||
    'Write a CBSE Class 10 triangles question that uses AA/SAS/SSS similarity.';
  const mentorSeed = loadTrianglesMentorSeed();
  const mentor = mentorSeed && mentorSeed.mentorResponse ? mentorSeed.mentorResponse : mentorSeed || {};
  const hints = normalizeLines([
    ...(mentor.nextStepSuggestion || []),
    ...(mentor.examinerWarning || []),
  ]);
  const variants = Array.from({ length: numVariants }).map((_, idx) => {
    const hint = hints.length ? ` Focus: ${hints[idx % hints.length]}` : '';
    const text = `${seedLine}${hint}`.trim();
    return {
      index: idx,
      text,
      questionText: text,
      marks,
      difficulty,
      bloomSkill,
    };
  });
  return { subject, topicKey, variants, model: 'stub' };
}


/**
 * Read request body as JSON.
 * @param {import('http').IncomingMessage} req
 */
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk.toString()));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
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

/**
 * Build a user prompt for plan mode.
 * @param {any} payload
 */
function buildPlanUserPrompt(payload) {
  const subject = payload.subject || 'Maths & Science';
  const daysLeft = payload.daysLeft != null ? payload.daysLeft : 60;
  const targetPercent = payload.targetPercent != null ? payload.targetPercent : 95;
  const hours =
    typeof payload.hoursPerDay === 'number'
      ? payload.hoursPerDay
      : payload.hoursPerDay && typeof payload.hoursPerDay.total === 'number'
      ? payload.hoursPerDay.total
      : 2;
  const topicKey = payload.topicKey || null;

  const lines = [
    `Create a practical CBSE Class 10 ${subject} study plan.`,
    `Target score around ${targetPercent}%.`,
    `There are about ${daysLeft} days left until the board exam.`,
    `The student can study roughly ${hours} hours per day.`,
    topicKey ? `Prioritise topicKey "${topicKey}" and similar high-yield topics.` : '',
    payload.extraNotes ? `Extra context: ${payload.extraNotes}` : '',
    'Break the plan into weeks and days with clear tasks (practice, revision, mocks).',
  ].filter(Boolean);

  return lines.join(' ');
}

/**
 * Build a user prompt for solve mode.
 * @param {any} payload
 */
function buildSolveUserPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const marks = payload.marks != null ? payload.marks : '';
  const questionText = payload.questionText || payload.question || payload.prompt || '';
  return [
    `Solve the following CBSE Class 10 ${subject} board-style question step by step.`,
    marks ? `The question carries ${marks} marks.` : '',
    'Use Socratic-friendly micro-steps (no big jumps).',
    'End with a clearly labeled final answer.',
    '',
    String(questionText || '').trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

function normalizeMentorStudentProfile(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw === 'anxious') return 'anxious';
  if (raw === 'weak_foundation' || raw === 'weak-foundation' || raw === 'weak') return 'weak_foundation';
  if (raw === 'boards_focused' || raw === 'boards-focused' || raw === 'board') return 'boards_focused';
  if (raw === 'doubt_heavy' || raw === 'doubt-heavy' || raw === 'doubt') return 'doubt_heavy';
  if (raw === 'advanced_value_seeking' || raw === 'advanced-value-seeking' || raw === 'advanced') {
    return 'advanced_value_seeking';
  }
  return '';
}

function inferMentorStudentProfileForPrompt(payload, mode) {
  const explicit = normalizeMentorStudentProfile(
    payload?.studentProfile || payload?.student_profile || payload?.studentStateProfile
  );
  if (explicit) return explicit;
  const solveStyle = String(payload?.solveStyle || '').toLowerCase();
  const studentIntent = String(payload?.studentIntent || '').toLowerCase();
  const text = [
    payload?.studentQuestion,
    payload?.questionText,
    payload?.contextText,
    payload?.itemText,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (/(panic|anxious|overwhelm|stuck badly|scared)/i.test(text)) return 'anxious';
  if (/(fast|shortcut|quickest|high[- ]value|efficient)/i.test(text)) return 'advanced_value_seeking';
  if (studentIntent === 'check_cbse' || solveStyle === 'board' || mode === 'board_steps_ms') {
    return 'boards_focused';
  }
  if (/(why|how|reason|doubt)/i.test(text)) return 'doubt_heavy';
  return studentIntent === 'explain' || mode === 'learn_teach' ? 'weak_foundation' : 'weak_foundation';
}

function buildMentorBehaviorContract(payload, mode) {
  const profile = inferMentorStudentProfileForPrompt(payload, mode);
  const lines = ['MENTOR BEHAVIOR CONTRACT:'];
  lines.push('- Diagnose the likely bottleneck before teaching.');
  lines.push('- Do not dump a polished full solution unless the student clearly asks for it.');
  lines.push('- Prefer next-step teaching, then reason, then next action.');
  lines.push('- Keep CBSE board-writing discipline visible.');
  lines.push('- Separate concept accuracy from board-answer quality when checking work.');
  lines.push('- End with one concrete next move inside the same chapter family when possible.');
  if (shouldRequireDiagram(payload)) {
    lines.push('- Use the figure first: tell the student what to notice in the diagram before solving.');
  }
  if (profile === 'anxious') {
    lines.push('- Student profile: anxious -> use calmer tone, smaller steps, and low overload.');
  } else if (profile === 'boards_focused') {
    lines.push('- Student profile: boards_focused -> mention mark-safe writing and examiner cut points.');
  } else if (profile === 'advanced_value_seeking') {
    lines.push('- Student profile: advanced_value_seeking -> keep it concise, high-signal, and route quickly to the right family.');
  } else if (profile === 'doubt_heavy') {
    lines.push('- Student profile: doubt_heavy -> explain why the step works before advancing.');
  } else {
    lines.push('- Student profile: weak_foundation -> use simpler language and concept-first scaffolding.');
  }
  return lines.join('\n');
}

function buildMentorRuntimeRouteContext(payload) {
  const topicKey = String(payload?.topicKey || payload?.chapter || '').trim();
  const familyId = String(payload?.questionFamilyId || payload?.familyId || payload?.itemId || '').trim();
  const familyLabel = String(payload?.questionFamilyLabel || payload?.familyLabel || payload?.itemTitle || '').trim();
  const chapterStep = String(payload?.chapterStep || '').trim();
  const qtypeId = String(payload?.questionTypeId || payload?.qtypeId || '').trim();
  const sectionFilter = String(payload?.practiceSectionFilter || payload?.section || '').trim();
  const studentIntent = String(payload?.studentIntent || '').trim();
  const studentProfile = String(payload?.studentProfile || payload?.studentStateProfile || '').trim();
  const helpMode = String(payload?.mentorHelpMode || payload?.helpMode || '').trim();
  const recommendedDiagramType = String(payload?.recommendedDiagramType || '').trim();
  const theoremFocus = Array.isArray(payload?.theoremFocus)
    ? payload.theoremFocus.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const focusIds = Array.isArray(payload?.suggestedPracticeIds)
    ? payload.suggestedPracticeIds.map((id) => String(id || '').trim()).filter(Boolean)
    : Array.isArray(payload?.focusBankIds)
      ? payload.focusBankIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];
  const lines = ['RUNTIME ROUTE CONTEXT:'];
  if (topicKey) lines.push(`- topicKey: ${topicKey}`);
  if (familyId) lines.push(`- familyId: ${familyId}`);
  if (familyLabel) lines.push(`- family: ${familyLabel}`);
  if (qtypeId) lines.push(`- qtypeId: ${qtypeId}`);
  if (chapterStep) lines.push(`- chapterStep: ${chapterStep}`);
  if (sectionFilter) lines.push(`- sectionFilter: ${sectionFilter}`);
  if (studentIntent) lines.push(`- studentIntent: ${studentIntent}`);
  if (studentProfile) lines.push(`- studentProfile: ${studentProfile}`);
  if (helpMode) lines.push(`- mentorHelpMode: ${helpMode}`);
  if (recommendedDiagramType) lines.push(`- recommendedDiagramType: ${recommendedDiagramType}`);
  if (theoremFocus.length) lines.push(`- theoremFocus: ${theoremFocus.join(', ')}`);
  if (focusIds.length) lines.push(`- focusIds: ${focusIds.slice(0, 8).join(', ')}`);
  lines.push('- End with one next best content/practice suggestion for the same family when possible.');
  return lines.join('\n');
}

/**
 * Build a user prompt for explain mode.
 * @param {any} payload
 */
function buildExplainUserPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const topic = payload.topic || payload.topicKey || '';
  const questionText = payload.questionText || payload.question || payload.prompt || '';
  const diagramLine = shouldRequireDiagram(payload) ? diagramLineForExplain(payload) : '';
  const doubtContext = formatDoubtContext(payload);
  const parts = [
    `Explain this CBSE Class 10 ${subject} concept in simple, exam-oriented language.`,
    topic ? `Topic / chapter focus: ${topic}.` : '',
    buildMentorBehaviorContract(payload, 'explain'),
    buildMentorRuntimeRouteContext(payload),
    'Use short bullet steps, key formulas, and 1–2 quick examples if helpful.',
    diagramLine ? `Include this diagram line in the example: ${diagramLine}.` : '',
    doubtContext ? `${doubtContext}` : '',
  ];
  if (questionText) {
    parts.push('Use the following board-style question as context:');
    parts.push(String(questionText).trim());
  }
  return parts.filter(Boolean).join(' ');
}

function buildGrindTrianglesUserPrompt(payload) {
  const nodeTitle = (payload?.mindmapNodeTitle && String(payload.mindmapNodeTitle).trim()) || 'the selected grind node';
  const grade = payload?.grade != null ? String(payload.grade) : 'unknown grade';
  const subject = payload?.subject ? String(payload.subject).trim() : 'Maths/Science';
  const contextLines = [
    `Prepare a ${subject} grind contract for Class ${grade} focused on "${nodeTitle}".`,
    payload?.doubtContext ? String(payload.doubtContext).trim() : '',
    payload?.mindmapNodeText ? `Node notes: ${String(payload.mindmapNodeText).trim()}` : '',
  ].filter(Boolean);
  return contextLines.join('\n\n');
}

const PRIORITY_GRIND_TOPIC_PROFILES = {
  'pair-of-linear-equations': {
    label: 'Pair of Linear Equations in Two Variables',
    marks: 3,
    given: [
      'Identify both equations in standard form.',
      'Note whether the target is intersection point, consistency, or value of variables.',
    ],
    toProve: ['Solve x and y with clear elimination/substitution steps.'],
    figureHints: ['Write equations one below another and align variable coefficients.'],
    steps: [
      'Choose elimination/substitution method and justify the choice briefly.',
      'Show one clean elimination/substitution step.',
      'Write x and y values, then verify in one original equation.',
    ],
    checkpoints: [
      'Method selected correctly for the pair of equations.',
      'Algebraic manipulation without sign errors.',
      'Final values written and verified.',
    ],
    traps: [
      { trap: 'Sign mistake during elimination.', fix: 'Write each transformed equation line-by-line before subtraction.' },
      { trap: 'Stopping after finding one variable.', fix: 'Back-substitute and report both x and y.' },
    ],
    drills: [
      { prompt: 'Solve one pair using elimination in 3 lines.', answerKey: 'Eliminate one variable, solve the other, back-substitute.' },
      { prompt: 'State condition for infinitely many solutions.', answerKey: 'a1/a2 = b1/b2 = c1/c2' },
    ],
    nextNodeId: 'quadratic-equations',
    nextReason: 'Quadratic solving is the next high-yield algebra progression.',
  },
  'quadratic-equations': {
    label: 'Quadratic Equations',
    marks: 4,
    given: [
      'Rewrite equation in ax^2 + bx + c = 0 form.',
      'Identify method: factorization / completing square / quadratic formula.',
    ],
    toProve: ['Find roots with valid method and check by substitution.'],
    figureHints: ['Keep discriminant and root calculations in separate lines.'],
    steps: [
      'State chosen method and why it fits this equation.',
      'Compute roots with one justified transformation chain.',
      'Write both roots and validate one root quickly.',
    ],
    checkpoints: [
      'Correct standard form setup.',
      'Correct discriminant/factor decomposition.',
      'Both roots written with correct sign.',
    ],
    traps: [
      { trap: 'Missing second root.', fix: 'Always write x1 and x2 explicitly.' },
      { trap: 'Incorrect sign in formula.', fix: 'Bracket numerator: (-b ± √D) / 2a before simplifying.' },
    ],
    drills: [
      { prompt: 'Compute discriminant and predict nature of roots.', answerKey: 'Use D = b^2 - 4ac and classify from D.' },
      { prompt: 'Solve one factorable quadratic in board format.', answerKey: 'Factor, set each factor to zero, list both roots.' },
    ],
    nextNodeId: 'pair-of-linear-equations',
    nextReason: 'Switch to linear systems to strengthen algebra fluency.',
  },
  trigonometry: {
    label: 'Trigonometry',
    marks: 3,
    given: [
      'Identify right triangle and known angle/side.',
      'Select ratio (sin, cos, tan) matching required side.',
    ],
    toProve: ['Compute unknown side/angle with correct ratio and units.'],
    figureHints: ['Mark opposite, adjacent, and hypotenuse relative to the given angle.'],
    steps: [
      'Write target ratio formula with substituted values.',
      'Rearrange cleanly and compute final value.',
      'Add unit and practical rounding if needed.',
    ],
    checkpoints: [
      'Correct ratio selected from context.',
      'Correct side mapping (opp/adj/hyp).',
      'Final answer with units.',
    ],
    traps: [
      { trap: 'Mixing opposite and adjacent sides.', fix: 'Anchor sides with respect to theta before formula.' },
      { trap: 'Using Pythagoras when not needed.', fix: 'Use direct trigonometric ratio first if one angle is given.' },
    ],
    drills: [
      { prompt: 'Pick correct ratio for each mini scenario.', answerKey: 'Match target side relation to sin/cos/tan.' },
      { prompt: 'One board-style height-distance calculation.', answerKey: 'Ratio equation + substitution + unit.' },
    ],
    nextNodeId: 'maths_applications_trigonometry',
    nextReason: 'Applications build exam-oriented word-problem fluency.',
  },
  electricity: {
    label: 'Electricity',
    marks: 3,
    given: [
      'List known values with units (V, I, R, P).',
      'Identify required quantity and relevant law/formula.',
    ],
    toProve: ['Compute unknown quantity with unit-consistent steps.'],
    figureHints: ['Draw a simple circuit label (source, resistor, current direction).'],
    steps: [
      'Write governing formula (Ohm’s law / power relation).',
      'Substitute values with SI units only.',
      'Compute and state final quantity with unit.',
    ],
    checkpoints: [
      'Correct formula chosen for target variable.',
      'Units handled correctly before substitution.',
      'Numerical result and unit both correct.',
    ],
    traps: [
      { trap: 'Using mA without conversion.', fix: 'Convert to A before formula substitution.' },
      { trap: 'Confusing power and energy formulas.', fix: 'Use P = VI and E = Pt with explicit unit checks.' },
    ],
    drills: [
      { prompt: 'Find resistance using V and I.', answerKey: 'R = V/I with SI units.' },
      { prompt: 'Compute energy for given power and time.', answerKey: 'E = Pt; convert time to seconds when needed.' },
    ],
    nextNodeId: 'magnetic-effects-of-electric-current',
    nextReason: 'Magnetic effects is the natural continuation of electricity concepts.',
  },
  'life-processes': {
    label: 'Life Processes',
    marks: 3,
    given: [
      'Identify process focus (nutrition, respiration, transport, excretion).',
      'List key biological terms used in the question.',
    ],
    toProve: ['Write mechanism in correct sequence with one function line.'],
    figureHints: ['Use simple labelled flow chart (organ -> role -> outcome).'],
    steps: [
      'State the biological process definition.',
      'Write sequence of steps/events in order.',
      'End with exam-ready function/result statement.',
    ],
    checkpoints: [
      'Correct process identified from question cue.',
      'Sequence of steps is biologically accurate.',
      'Conclusion links process to organism survival.',
    ],
    traps: [
      { trap: 'Mixing respiration and breathing.', fix: 'Differentiate process location and purpose in one line.' },
      { trap: 'Missing keyword terms in answers.', fix: 'Include textbook terms: tissue/organ/enzyme/gas exchange as relevant.' },
    ],
    drills: [
      { prompt: 'Write a 3-line process flow for one life process.', answerKey: 'Definition -> key steps -> function.' },
      { prompt: 'One difference question with 2 points.', answerKey: 'Point-wise contrast with textbook keywords.' },
    ],
    nextNodeId: 'science_control_coordination',
    nextReason: 'Control and coordination builds on foundational biology process understanding.',
  },
};

const PRIORITY_GRIND_TOPIC_ALIASES = {
  'maths_introduction_trigonometry': 'trigonometry',
  'maths_applications_trigonometry': 'trigonometry',
  'science_light_reflection_refraction': 'trigonometry',
  'chemical-reactions-equations': 'life-processes',
  'carbon-and-its-compounds': 'life-processes',
  'magnetic-effects-of-electric-current': 'electricity',
};

function normalizeTopicKeyInput(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function resolvePriorityGrindTopicKey(topicKey) {
  const normalized = normalizeTopicKeyInput(topicKey);
  if (!normalized) return '';
  if (Object.prototype.hasOwnProperty.call(PRIORITY_GRIND_TOPIC_PROFILES, normalized)) {
    return normalized;
  }
  if (Object.prototype.hasOwnProperty.call(PRIORITY_GRIND_TOPIC_ALIASES, normalized)) {
    return String(PRIORITY_GRIND_TOPIC_ALIASES[normalized] || '');
  }
  return '';
}

function toTitleCaseFromTopicKey(topicKey) {
  const raw = String(topicKey || '')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!raw) return 'Selected Topic';
  return raw
    .split(/\s+/)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildGenericTopicGrindProfile({ topicKey, topicLabel, nodeTitle }) {
  const label = String(topicLabel || '').trim() || toTitleCaseFromTopicKey(topicKey);
  const node = String(nodeTitle || '').trim() || 'selected node';
  return {
    label,
    marks: 3,
    given: [
      `List the given data/conditions from ${node}.`,
      `State what needs to be proved/found in ${label}.`,
    ],
    toProve: ['Write a complete exam-format answer with one justified core step.'],
    figureHints: ['Use a neat labelled diagram/table only if the question demands it.'],
    steps: [
      'Write Given and Required clearly.',
      'Apply the correct concept/formula/theorem with one reason.',
      'Conclude with Therefore/Hence and final answer.',
    ],
    checkpoints: [
      'Given and target are correctly identified.',
      'Core step uses correct rule/formula/theorem.',
      'Conclusion is exam-ready and complete.',
    ],
    traps: [
      { trap: 'Skipping reason/theorem name.', fix: 'Name the rule before applying it.' },
      { trap: 'Writing final answer without setup.', fix: 'Show at least one justified intermediate step.' },
    ],
    drills: [
      { prompt: `Write a 3-line board answer for ${node}.`, answerKey: 'Given -> Core step with reason -> Therefore/Hence.' },
      { prompt: `List one common trap in ${label} and fix it.`, answerKey: 'Trap + one-line correction strategy.' },
    ],
    nextNodeId: String(topicKey || '').trim() || 'next-node',
    nextReason: `Continue with the next ${label} node to reinforce exam-writing consistency.`,
  };
}

function buildGrindTopicContractFallback(payload) {
  const rawTopicKey = payload?.topicKey || payload?.chapter || payload?.topic || '';
  const normalizedTopicKey = normalizeTopicKeyInput(rawTopicKey);
  const resolvedTopicKey = resolvePriorityGrindTopicKey(rawTopicKey);
  const profile =
    (resolvedTopicKey && PRIORITY_GRIND_TOPIC_PROFILES[resolvedTopicKey]) ||
    buildGenericTopicGrindProfile({
      topicKey: normalizedTopicKey || 'selected-topic',
      topicLabel: rawTopicKey,
      nodeTitle: payload?.mindmapNodeTitle || payload?.cardTitle || '',
    });

  const nodeId = String(payload?.mindmapNodeId || payload?.cardId || 'node_1').trim() || 'node_1';
  const nodeTitle =
    String(payload?.mindmapNodeTitle || payload?.cardTitle || profile.label || 'Grind node').trim() ||
    profile.label;
  const marksRaw = Number(payload?.marks ?? payload?.totalMarks ?? payload?.total_marks);
  const marks = Number.isFinite(marksRaw) && marksRaw > 0 ? marksRaw : profile.marks;
  const nextNodeId = String(profile.nextNodeId || '').trim() || nodeId;

  return {
    type: 'grind_topic_v1',
    topicKey: resolvedTopicKey || normalizedTopicKey || 'selected-topic',
    node: { id: nodeId, title: nodeTitle },
    board: {
      given: profile.given,
      toProve: profile.toProve,
      figureHints: profile.figureHints,
      steps: profile.steps,
    },
    rubric: {
      marks,
      checkpoints: profile.checkpoints,
    },
    commonTraps: profile.traps,
    microDrills: profile.drills,
    next: {
      recommendedNodeId: nextNodeId,
      reason: profile.nextReason,
    },
  };
}

function buildGrindTopicUserPrompt(payload) {
  const rawTopicKey = payload?.topicKey || payload?.chapter || payload?.topic || '';
  const resolvedTopicKey = resolvePriorityGrindTopicKey(rawTopicKey);
  const profile = resolvedTopicKey ? PRIORITY_GRIND_TOPIC_PROFILES[resolvedTopicKey] : null;
  const nodeTitle = String(payload?.mindmapNodeTitle || payload?.cardTitle || '').trim() || 'selected node';
  const subject = String(payload?.subject || 'Maths/Science').trim();
  const grade = String(payload?.grade || '10').trim();
  return [
    `Create a ${subject} Class ${grade} grind contract for "${nodeTitle}".`,
    profile ? `Priority topic profile: ${profile.label}.` : `General topic profile: ${String(rawTopicKey || 'selected-topic')}.`,
    payload?.mindmapNodeText ? `Node notes: ${String(payload.mindmapNodeText).trim()}` : '',
    payload?.doubtContext ? `Doubt context: ${String(payload.doubtContext).trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function isLearnMisconceptionPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload.section || '').toLowerCase();
  const subSection = String(payload.subSection || '').toLowerCase();
  const explainType = String(payload.explainType || '').toLowerCase();
  const itemId = String(payload.itemId || '').toLowerCase();
  if (section !== 'learn') return false;
  if (subSection.includes('misconception')) return true;
  if (explainType === 'misconception') return true;
  if (itemId.startsWith('misconception')) return true;
  return false;
}

function buildMisconceptionExplainPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const topic = payload.topic || payload.topicKey || '';
  const itemTitle = payload.itemTitle || payload.concept || payload.title || '';
  const itemText = payload.itemText || payload.commonError || payload.contextText || '';
  const diagramLine = shouldRequireDiagram(payload) ? diagramLineForExplain(payload) : '';
  const doubtContext = formatDoubtContext(payload);
  const lines = [
    `Explain this misconception for CBSE Class 10 ${subject}.`,
    topic ? `Topic: ${topic}.` : '',
    itemTitle ? `Misconception title: ${itemTitle}.` : '',
    itemText ? `Misconception detail: ${itemText}.` : '',
    '',
    'Return EXACTLY these five sections in order (no extra headings, no JSON, no questions):',
    '1) Misconception',
    "2) Why it's wrong",
    '3) Correct CBSE rule/theorem',
    '4) Micro-example',
    '5) Exam tip',
    '',
    'Rules:',
    '- 1-3 short lines per section.',
    '- Use triangle labels (e.g., ABC, PQR) in the micro-example.',
    '- Name the rule/theorem and state it in one line.',
    diagramLine ? `- In the Micro-example section, include: ${diagramLine}.` : '',
    '- No MCQ framing, no Socratic questions, no board-steps marks.',
    '- Do not mention system or prompt instructions.',
    '',
    doubtContext ? `${doubtContext}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function isLearnCompetencyPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload.section || '').toLowerCase();
  const subSection = String(payload.subSection || '').toLowerCase();
  const explainType = String(payload.explainType || '').toLowerCase();
  const itemId = String(payload.itemId || '').toLowerCase();
  if (section !== 'learn') return false;
  if (subSection.includes('competenc')) return true;
  if (explainType === 'competency') return true;
  if (itemId.startsWith('competency')) return true;
  return false;
}

const STRUCTURED_MODES = ['board_steps_ms', 'solve_with_me', 'learn_teach', 'learn_proof', 'learn_mindmap'];
const MODE_ALIASES = {
  planner: 'plan',
  examcoach: 'coach',
  topic_explain: 'explain',
  topic_exam_tips: 'coach',
  topic_solve: 'solve',
  solve_with_me: 'solve_with_me',
  board_steps_ms: 'board_steps_ms',
  board_steps: 'board_steps_ms',
  learn_teach: 'learn_teach',
  learn_proof: 'learn_proof',
  learn_mindmap: 'learn_mindmap',
  grind_triangles_v1: 'grind_triangles_v1',
  grind_topic_v1: 'grind_topic_v1',
  explain: 'explain',
  coach: 'coach',
  plan: 'plan',
  solve: 'solve',
};

function normalizeIncomingMode(rawMode) {
  if (!rawMode && rawMode !== 0) return '';
  const value = String(rawMode || '').trim();
  if (!value) return '';
  const key = value.toLowerCase();
  return MODE_ALIASES[key] || value;
}

function isStructuredMode(mode) {
  return STRUCTURED_MODES.includes(mode);
}

function isLearnKeyDefinitionsPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload.section || '').toLowerCase();
  const subSection = String(payload.subSection || '').toLowerCase();
  if (section !== 'learn') return false;
  return subSection.includes('key-definitions');
}

function buildCompetencyTeachPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const topic = payload.topic || payload.topicKey || '';
  const itemTitle = payload.itemTitle || payload.title || payload.competency || '';
  const itemText = payload.itemText || payload.description || payload.contextText || '';
  const diagramLine = shouldRequireDiagram(payload) ? diagramLineForExplain(payload) : '';
  const doubtContext = formatDoubtContext(payload);
  const lines = [
    `Teach this NCERT competency for CBSE Class 10 ${subject}.`,
    topic ? `Topic: ${topic}.` : '',
    itemTitle ? `Competency: ${itemTitle}.` : '',
    itemText ? `Detail: ${itemText}.` : '',
    '',
    'Return EXACTLY these five sections in order (no extra headings, no JSON, no questions):',
    '1) Competency definition',
    '2) How to detect in questions',
    '3) One worked mini-example',
    '4) Practice prompts (Easy / Medium / Hard)',
    '5) Expected answer format',
    '',
    'Rules:',
    '- 1-3 short lines per section.',
    '- Provide 2-4 detection cues.',
    '- Micro-example must be short and board-style.',
    '- Practice prompts must be labeled Easy/Medium/Hard.',
    '- Keep it triangle-contextual when applicable (AA/SSS/SAS, BPT, CPST).',
    diagramLine ? `- In the mini-example section, include: ${diagramLine}.` : '',
    '- No MCQ framing, no Socratic questions, no board-steps marks.',
    '- Do not mention system or prompt instructions.',
    '',
    doubtContext ? `${doubtContext}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

const MINDMAP_NODE_TO_CORE_ID = {
  gQ1: 'N1',
  gAA: 'N2',
  gSAS: 'N3',
  gSSS: 'N4',
  gBPT: 'N5',
  gWarnNotBPT: 'N6',
  gCPST: 'N7',
  gArea: 'N8',
  gPyth: 'N9',
  gQ5: 'N10',
  gEnd: 'N11',
  gCPSTrule: 'N12',
};

const MINDMAP_TEACH_OUTLINES = {
  N1: {
    goal: 'Understand triangle similarity.',
    explanation: [
      'Define similarity as equal angles with proportional sides.',
      'Explain why similarity helps solve geometry problems.',
      'Show how to check similarity from given data.',
    ],
    example: 'Check whether triangle ABC and triangle PQR are similar when AB/PQ = BC/QR = AC/PR.',
    check: 'What two conditions must hold for triangles to be similar?',
    exam: 'State that triangle ABC ~ triangle PQR because corresponding angles are equal and sides are proportional.',
  },
  N2: {
    goal: 'Apply AA similarity criterion.',
    explanation: [
      'Identify two pairs of equal angles.',
      'Use angle sum property to infer the third angle is equal.',
      'Conclude similarity by AA.',
    ],
    example: 'If angle A = angle P and angle B = angle Q in triangles ABC and PQR, prove they are similar.',
    check: 'How many angle pairs are needed to apply the AA criterion?',
    exam: 'By AA criterion, since angle A = angle P and angle B = angle Q, conclude triangle ABC ~ triangle PQR.',
  },
  N3: {
    goal: 'Use the SAS similarity criterion.',
    explanation: [
      'Identify one equal included angle.',
      'Check ratios of the adjacent sides around that angle.',
      'Conclude similarity by SAS.',
    ],
    example: 'In triangles ABC and PQR, if angle A = angle P and AB/PQ = AC/PR, prove similarity.',
    check: 'Which angle must you use when applying the SAS criterion?',
    exam: 'By SAS criterion, one equal angle and adjacent sides in proportion imply triangle ABC ~ triangle PQR.',
  },
  N4: {
    goal: 'Apply the SSS similarity criterion.',
    explanation: [
      'Compute all three sides of both triangles.',
      'Match corresponding sides correctly and confirm ratios are equal.',
      'Conclude similarity by SSS.',
    ],
    example: 'Show triangle ABC ~ triangle PQR if AB:BC:AC = 3:4:5 and PQ:QR:RP = 6:8:10.',
    check: 'Do you need any angle information to use SSS?',
    exam: 'If AB/PQ = BC/QR = AC/RP, then triangle ABC ~ triangle PQR by SSS.',
  },
  N5: {
    goal: 'Understand and apply the Basic Proportionality Theorem (BPT).',
    explanation: [
      'State BPT: a line parallel to one side divides the other two sides in equal ratios.',
      'Identify the parallel line in the diagram.',
      'Use AD/DB = AE/EC to find unknowns.',
    ],
    example: 'In triangle ABC, DE || BC, AD = 3 cm and DB = 2 cm. Find AE/EC.',
    check: 'What must be parallel to apply the Basic Proportionality Theorem?',
    exam: 'Since DE || BC, by BPT we write AD/DB = AE/EC.',
  },
  N6: {
    goal: 'Recognize when BPT is not applicable.',
    explanation: [
      'BPT needs a line parallel to a side; ratios alone are not enough.',
      'Use the converse only after proving the parallel condition.',
      'Verify parallel lines before applying BPT.',
    ],
    example: 'In triangle ABC, AD/DB = AE/EC but DE is not marked parallel; decide what to do first.',
    check: 'Can you apply BPT if the line is not given as parallel?',
    exam: 'Use BPT only when the line is given parallel; otherwise prove parallelism first.',
  },
  N7: {
    goal: 'Use corresponding parts of similar triangles (CPST).',
    explanation: [
      'After proving triangles similar, write ratios of corresponding sides.',
      'Use the ratios to find unknown side lengths or perimeters.',
      'Recall corresponding angles are equal.',
    ],
    example: 'If triangle ABC ~ triangle PQR and AB = 4 cm, BC = 5 cm, AC = 6 cm, PQ = 2 cm, find QR.',
    check: 'How do you use CPST to find unknown lengths after proving similarity?',
    exam: 'From triangle ABC ~ triangle PQR, set up AB/PQ = BC/QR = AC/RP and solve.',
  },
  N8: {
    goal: 'Apply the area ratio property of similar triangles.',
    explanation: [
      'Area ratio equals the square of the corresponding side ratio.',
      'Relate side ratio to area ratio.',
      'Use it to compute area or side length.',
    ],
    example: 'If AB/PQ = 2/3, find area(triangle ABC)/area(triangle PQR).',
    check: 'Why do we square the side ratio when comparing areas?',
    exam: 'For similar triangles, area(ABC)/area(PQR) = (AB/PQ)^2.',
  },
  N9: {
    goal: 'Apply Pythagoras theorem in right triangles.',
    explanation: [
      'Use only for right-angled triangles.',
      'Identify the hypotenuse correctly.',
      'Apply hypotenuse^2 = sum of squares of other two sides.',
    ],
    example: 'In right-angled triangle ABC, AB = 6 cm and AC = 8 cm. Find BC.',
    check: 'Which side is the hypotenuse in a right triangle?',
    exam: 'In right-angled triangle ABC, BC^2 = AB^2 + AC^2 by Pythagoras.',
  },
  N10: {
    goal: 'Distinguish between BPT and similarity criteria.',
    explanation: [
      'BPT needs a parallel line; similarity needs angle/side criteria.',
      'Decide which tool fits the given information.',
      'Do not use ratios alone to claim similarity.',
    ],
    example: 'Given AD/DB = AE/EC, does this imply triangle ADE ~ triangle ABC?',
    check: 'Why cannot equal side ratios alone prove triangles are similar?',
    exam: 'Check for a parallel line before using BPT; otherwise use AA, SAS, or SSS to prove similarity.',
  },
  N11: {
    goal: 'Build a self-check habit for mastery.',
    explanation: [
      'Verify the theorem matches the given information.',
      'Re-check ratios or angle conditions.',
      'Confirm the conclusion answers the question.',
    ],
    example: 'You concluded triangle ABC ~ triangle PQR by SSS; verify the side ratios are equal.',
    check: 'What should you verify after proving triangles similar?',
    exam: 'Always confirm the chosen theorem fits the given data and the conclusion is correct.',
  },
  N12: {
    goal: 'Use angle equality consequences in similar triangles.',
    explanation: [
      'Similar triangles have equal corresponding angles.',
      'Use angle equality to show lines are parallel.',
      'Apply angle equality in proofs.',
    ],
    example: 'After proving triangle ABC ~ triangle PQR, use angle A = angle P to show AB || PQ (when extended).',
    check: 'How can equal angles from similarity help prove lines are parallel?',
    exam: 'From triangle ABC ~ triangle PQR, write angle A = angle P, angle B = angle Q, and angle C = angle R.',
  },
};

const TRIANGLES_LEARN_SEED = {
  keyDefinitions: {
    simpleExplanation: [
      'Similar triangles have the same shape but can be different sizes.',
      'Corresponding angles are equal and corresponding sides are in the same ratio.',
      'AA: two equal angles are enough to prove similarity.',
      'SAS: included angle equal and adjacent sides proportional.',
      'SSS: all three pairs of sides proportional.',
      'CPST: corresponding parts of similar triangles are proportional/equal.',
    ],
    cbseExamSentence: [
      'If ∠A = ∠P and ∠B = ∠Q, then ΔABC ~ ΔPQR by AA.',
      'From similarity, AB/PQ = BC/QR = AC/PR (CPST).',
    ],
    workedExamples: [
      {
        title: 'AA similarity',
        question: 'If ∠A = ∠P and ∠B = ∠Q, prove ΔABC ~ ΔPQR.',
        steps: [
          { text: 'Given ∠A = ∠P and ∠B = ∠Q.', marks: 1 },
          { text: 'Two angles equal ⇒ AA similarity.', marks: 1 },
          { text: 'So ΔABC ~ ΔPQR.', marks: 1 },
        ],
        totalMarks: 3,
        finalAnswer: 'ΔABC ~ ΔPQR by AA.',
      },
      {
        title: 'CPST application',
        question: 'If ΔABC ~ ΔPQR, AB = 6 cm, PQ = 3 cm, BC = 5 cm, find QR.',
        steps: [
          { text: 'AB/PQ = BC/QR by CPST.', marks: 1 },
          { text: '6/3 = 5/QR ⇒ 2 = 5/QR.', marks: 1 },
          { text: 'QR = 2.5 cm.', marks: 1 },
        ],
        totalMarks: 3,
        finalAnswer: 'QR = 2.5 cm.',
      },
    ],
    commonMistakes: [
      'Mixing correspondence order.',
      'Using SAS with a non-included angle.',
      'Using CPST before proving similarity.',
    ],
    checkQuestion: 'What two conditions must be verified before using AA similarity?',
    diagramType: 'SIMILARITY_AA',
    diagramLabels: { A: 'A', B: 'B', C: 'C', P: 'P', Q: 'Q', R: 'R' },
  },
  mindmapNodes: {
    gQ1: {
      bullets: [
        'Similarity means equal corresponding angles.',
        'Side ratios of corresponding sides are equal.',
        'Order of vertices fixes correspondence.',
        'Similarity helps find unknown sides.',
        'Use AA/SSS/SAS to prove it first.',
      ],
      examLines: [
        'State the criterion and the correspondence order.',
        'Write ΔABC ~ ΔPQR before using CPST.',
      ],
      example: {
        question: 'If ∠A = ∠P and ∠B = ∠Q, prove similarity and state one ratio.',
        steps: ['AA similarity ⇒ ΔABC ~ ΔPQR.', 'Then AB/PQ = BC/QR.'],
        finalAnswer: 'ΔABC ~ ΔPQR and AB/PQ = BC/QR.',
      },
      commonError: 'Skipping the correspondence order.',
      commonFix: 'Write the angle equalities and the matching order before using CPST.',
      checkQuestion: 'Which criterion proves similarity when two angles match?',
    },
  },
  proof: {
    given: ['In ΔABC, DE || BC with D on AB and E on AC.'],
    toProve: ['AD/DB = AE/EC.'],
    construction: ['Not required.'],
    proofSteps: [
      { statement: '∠ADE = ∠ABC and ∠AED = ∠ACB.', reason: 'Alternate interior angles', mark: 1 },
      { statement: 'ΔADE ~ ΔABC.', reason: 'AA similarity', mark: 1 },
      { statement: 'AD/AB = AE/AC.', reason: 'CPST', mark: 1 },
      { statement: 'AD/DB = AE/EC.', reason: 'Componendo', mark: 1 },
    ],
    conclusion: ['Hence AD/DB = AE/EC.'],
    totalMarks: 4,
    diagramType: 'BPT',
    diagramLabels: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
  },
  solveWithMe: {
    question: 'Which two triangles are being compared for similarity here?',
    answerFormat: 'Short sentence (e.g., ΔADE and ΔABC).',
  },
};

function isLearnMindmapPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload.section || '').toLowerCase();
  const subSection = String(payload.subSection || '').toLowerCase();
  const explainType = String(payload.explainType || '').toLowerCase();
  const selectedTab = String(payload.selectedTab || payload.tab || '').toLowerCase();
  if (section !== 'learn') return false;
  if (isTeachTabPayload(payload)) return false;
  if (subSection.includes('mindmap')) return true;
  if (explainType === 'mindmap_node' || explainType === 'mindmap') return true;
  if (selectedTab === 'mindmap') return true;
  return false;
}

function isTeachTabPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload.section || '').toLowerCase();
  const subSection = String(payload.subSection || '').toLowerCase();
  const explainType = String(payload.explainType || '').toLowerCase();
  const selectedTab = String(payload.selectedTab || payload.tab || '').toLowerCase();
  if (section && section !== 'learn') return false;
  if (subSection === 'teach' || subSection.includes('teach')) return true;
  if (explainType === 'teach') return true;
  if (selectedTab === 'teach') return true;
  return false;
}

function buildMindmapTeachPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const topic = payload.topic || payload.topicKey || '';
  const nodeTitle = payload.mindmapNodeTitle || payload.itemTitle || payload.title || 'Mindmap node';
  const nodeText = payload.mindmapNodeText || payload.itemText || payload.contextText || '';
  const nodePayload = payload.contextText || '';
  const nodeIdRaw = payload.mindmapNodeId || payload.itemId || '';
  const coreId =
    String(payload.mindmapCoreId || '')
      .toUpperCase()
      .trim() ||
    MINDMAP_NODE_TO_CORE_ID[String(nodeIdRaw)] ||
    '';
  const outline = coreId && MINDMAP_TEACH_OUTLINES[coreId] ? MINDMAP_TEACH_OUTLINES[coreId] : null;
  const diagramLine = shouldRequireDiagram(payload) ? diagramLineForExplain(payload) : '';
  const doubtContext = formatDoubtContext(payload);

  const lines = [
    `Teach from this mindmap node for CBSE Class 10 ${subject}.`,
    topic ? `Topic: ${topic}.` : '',
    nodeTitle ? `Node: ${nodeTitle}.` : '',
    nodeText ? `Node hint: ${nodeText}.` : '',
    '',
    'Return EXACTLY these five sections in order (no extra headings, no JSON, no markdown):',
    '1) Concept',
    '2) Exam-writing sentence',
    '3) Solved mini-example',
    '4) Common exam error',
    '5) Check-for-understanding question',
    '',
    'Rules:',
    '- 1-2 short lines per section; keep total under ~12 lines.',
    '- Use teacher tone; stay strictly on the node concept (no chapter dump).',
    '- Include exactly ONE mini-example and ONE check question.',
    '- Use triangle labels like ABC and PQR; avoid formula lists and MCQ framing.',
    '- Use the trap/common error if provided in the node hint.',
    '- Do not use placeholder or generic filler language.',
    diagramLine ? `- In the Solved mini-example section, include: ${diagramLine}.` : '',
    '- Do not mention system or prompt instructions.',
    '',
    doubtContext ? `${doubtContext}` : '',
  ].filter(Boolean);

  if (nodePayload) {
    lines.push('');
    lines.push('Node payload (use all items if present):');
    lines.push(nodePayload);
  }

  if (outline) {
    lines.push('');
    lines.push(`Node outline (${coreId}):`);
    lines.push(`- Learning goal: ${outline.goal}`);
    lines.push(`- Explanation points: ${outline.explanation.join(' ')}`);
    lines.push(`- Mini-example prompt: ${outline.example}`);
    lines.push(`- Check question: ${outline.check}`);
    lines.push(`- Exam-writing sentence: ${outline.exam}`);
  } else {
    lines.push('');
    lines.push('If this is a non-core node, keep the explanation very short and conceptual.');
  }

  return lines.join('\n');
}

function isProofWritingPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload.section || '').toLowerCase();
  const subSection = String(payload.subSection || '').toLowerCase();
  if (section !== 'learn') return false;
  if (subSection.includes('proof')) return true;
  return false;
}

function isTrianglesLearnPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload.section || '').toLowerCase();
  if (section !== 'learn') return false;
  return isTrianglesTopic(payload);
}

function isTrianglesTopic(payload) {
  const topicKey = String(payload?.topicKey || payload?.topic || '').toLowerCase();
  const questionText = String(payload?.questionText || payload?.question || payload?.prompt || '').toLowerCase();
  return topicKey.includes('triangles') || questionText.includes('triangle');
}

function flattenToLower(...values) {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((item) => String(item || ''))
    .join(' ')
    .toLowerCase();
}

function isTrianglesBsreEnabled() {
  const flag = String(process.env.TRIANGLES_BSRE_FEATURE_FLAG || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
}

function isNoProviderEnabled() {
  const flag = String(process.env.LT_NO_PROVIDER || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(flag);
}

function isStubMode() {
  return STUB_MODE || isNoProviderEnabled();
}

let bsreEvaluatorInstance = null;
function getBsreEvaluator() {
  if (bsreEvaluatorInstance === false) {
    return null;
  }
  if (!bsreEvaluatorInstance) {
    try {
      const { BsreEvaluator } = require('../src/engine/bsre/evaluator.ts');
      bsreEvaluatorInstance = new BsreEvaluator();
    } catch (err) {
      telemetry.increment('bsre_eval_loader_failed');
      console.warn('[bsre] evaluator unavailable:', String(err?.message || err));
      bsreEvaluatorInstance = false;
      return null;
    }
  }
  return bsreEvaluatorInstance;
}

function determineBsreRubricId(payload) {
  const candidate = String(payload?.rubricId || '').trim();
  if (candidate && trianglesRubricMap.has(candidate)) return candidate;

  const hintText = flattenToLower(
    payload?.theoremFocus,
    payload?.focus,
    payload?.subSection,
    payload?.section,
    payload?.questionText,
    payload?.question,
    payload?.prompt,
    payload?.contextText
  );

  if (hintText.includes('bisector')) return 'angle_bisector_theorem';
  if (hintText.includes('basic proportionality') || (hintText.includes('parallel') && hintText.includes('ratio')) || hintText.includes('bpt')) {
    return 'midpoint_basic_proportionality_theorem';
  }
  if (hintText.includes('area ratio')) return 'similarity_proof_aa_sas_sss';
  if (hintText.includes('similar') && !hintText.includes('congruent')) return 'similarity_proof_aa_sas_sss';
  if (hintText.includes('congruent') || hintText.includes('prove triangles congruent')) {
    return 'congruence_proof_sss_sas_asa_rhs';
  }

  return 'prove_triangles_congruent_standard';
}

function normalizeNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function buildBsreStructured(evaluation, payload) {
  const rubric = trianglesRubricMap.get(evaluation.rubricId);
  const rubricMarks = normalizeNumber(rubric?.totalMarks, 0);
  const payloadMarks = normalizeNumber(
    payload?.marks ?? payload?.totalMarks ?? payload?.total_marks,
    0
  );
  const stepTotal = (evaluation.stepResults || []).reduce(
    (sum, step) => sum + normalizeNumber(step?.marks, 0),
    0
  );
  const fallbackTotal = Math.max(rubricMarks, payloadMarks, stepTotal, 5);
  const totalMarks = Math.round(fallbackTotal) || 5;
  const lostMarks = Math.max(0, totalMarks - evaluation.score);

  const stepParts = (evaluation.stepResults || []).map((step) => {
    const mark = normalizeNumber(step?.marks, 0);
    const status = step?.passed ? '✓' : '✗';
    return `${step.stepId} (${mark}m ${status})`;
  });
  const breakdownLine = stepParts.length ? stepParts.join(' | ') : 'No step details provided.';
  const nextStep =
    String(evaluation.hintSuggestions?.[0] || evaluation.shortFeedback || '')
      .replace(/\s+/g, ' ')
      .trim() || 'Review the answer and try again.';
  const tutorLines = [
    `Score: ${evaluation.score}/${totalMarks}`,
    `Breakdown: ${breakdownLine}`,
    `Marks gained: ${evaluation.score}`,
    `Marks lost: ${lostMarks}`,
    `Next step: ${nextStep}`,
  ];

  return {
    kind: 'final',
    tutor: tutorLines.join('\n'),
    finalAnswer: `Score: ${evaluation.score}/${totalMarks}`,
  };
}

function runBsreEvaluation(payload, attempt, rubricIdOverride) {
  const studentAnswer = String(attempt || '').trim();
  if (!studentAnswer) {
    throw new Error('Student attempt is empty.');
  }

  const rubricId = String(rubricIdOverride || determineBsreRubricId(payload));
  const evaluator = getBsreEvaluator();
  if (!evaluator || typeof evaluator.evaluateAnswer !== 'function') {
    telemetry.increment('bsre_eval_unavailable');
    throw new Error('BSRE evaluator unavailable.');
  }
  telemetry.increment('bsre_eval_called');

  const evaluation = evaluator.evaluateAnswer(studentAnswer, rubricId);
  telemetry.increment('bsre_eval_completed');

  const confidence = evaluation?.confidence;
  if (typeof confidence === 'number' && confidence < 0.5) {
    telemetry.increment('bsre_eval_low_confidence');
  }

  return buildBsreStructured(evaluation, payload);
}

function getDiagramTopicText(payload) {
  return [
    payload?.subject,
    payload?.topicKey,
    payload?.topic,
    payload?.topicTitle,
    payload?.topicName,
    payload?.chapter,
    payload?.nodeTitle,
    payload?.mindmapNodeTitle,
    payload?.cardTitle,
    payload?.cardName,
    payload?.questionText,
    payload?.contextText,
  ]
    .flat()
    .map((v) => String(v || '').toLowerCase().replace(/[_-]+/g, ' '))
    .join(' ');
}

function isTeachOrBoardPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload?.section || '').toLowerCase();
  const subSection = String(payload?.subSection || '').toLowerCase();
  const explainType = String(payload?.explainType || '').toLowerCase();
  const selectedTab = String(payload?.selectedTab || payload?.tab || '').toLowerCase();
  if (section !== 'learn') return false;
  if (subSection.includes('teach') || subSection.includes('board')) return true;
  if (explainType.includes('teach') || explainType.includes('board')) return true;
  if (selectedTab === 'teach' || selectedTab === 'examples' || selectedTab === 'board') return true;
  return false;
}

function isNonNegotiableDiagramTopic(payload) {
  const subject = String(payload?.subject || '').toLowerCase();
  const text = getDiagramTopicText(payload);
  const maths = [
    'triangle',
    'triangles',
    'similarity',
    'congruence',
    'circle',
    'circles',
    'coordinate',
    'coordinate geometry',
    'trigon',
    'heights',
    'height',
    'distances',
    'distance',
    'mensuration',
    'construction',
    'constructions',
    'area',
    'surface area',
    'volume',
  ];
  const science = [
    'light',
    'reflection',
    'refraction',
    'lens',
    'lenses',
    'mirror',
    'mirrors',
    'optics',
    'ray',
    'rays',
    'electricity',
    'electric',
    'circuit',
    'circuits',
    'current',
    'resistance',
    'magnetic',
    'magnet',
    'field',
    'life process',
    'life processes',
    'nutrition',
    'respiration',
    'excretion',
    'transportation',
    'nephron',
    'heart',
    'stomata',
    'control and coordination',
    'control',
    'coordination',
    'neuron',
    'reflex',
    'reproduction',
    'heredity',
    'evolution',
    'food chain',
    'trophic',
  ];
  const hasMath = maths.some((k) => text.includes(k));
  const hasScience = science.some((k) => text.includes(k));
  if (subject.includes('math')) return hasMath;
  if (subject.includes('science')) return hasScience;
  return hasMath || hasScience;
}

function shouldRequireDiagram(payload) {
  if (!payload || typeof payload !== 'object') return false;
  const section = String(payload?.section || '').toLowerCase();
  const subSection = String(payload?.subSection || '').toLowerCase();
  if (isTeachOrBoardPayload(payload) && isNonNegotiableDiagramTopic(payload)) return true;
  if (isTrianglesTopic(payload)) return true;
  if (section === 'learn' && (subSection.includes('mindmap') || subSection.includes('proof'))) return true;
  if (payload?.mindmapNodeId || payload?.mindmapCoreId) return true;
  return false;
}

function inferDiagramType(payload) {
  const hint = [
    payload?.theoremFocus,
    payload?.explainType,
    payload?.mindmapNodeTitle,
    payload?.mindmapNodeText,
    payload?.questionText,
    payload?.contextText,
    payload?.topicKey,
    payload?.topic,
    payload?.chapter,
  ]
    .flat()
    .map((v) => String(v || '').toLowerCase().replace(/[_-]+/g, ' '))
    .join(' ');
  const hasTrigWord = /\b(trigonometry|trigonometric|sin|cos|tan|sine|cosine|tangent|theta)\b/.test(hint);
  if (hint.includes('trigon') || hasTrigWord || hint.includes('height') || hint.includes('distance')) {
    return 'trigonometric_triangle';
  }
  if (hint.includes('circle') || hint.includes('chord') || hint.includes('tangent')) return 'circle';
  if (hint.includes('coordinate') || hint.includes('cartesian') || hint.includes('graph')) return 'coordinate_plane';
  if (hint.includes('mensuration') || hint.includes('surface area') || hint.includes('volume') || hint.includes('cylinder') || hint.includes('cone') || hint.includes('sphere') || hint.includes('cuboid')) {
    return 'mensuration_solid';
  }
  if (hint.includes('ray') || hint.includes('reflection') || hint.includes('refraction') || hint.includes('lens') || hint.includes('mirror') || hint.includes('optics')) {
    return 'ray_diagram';
  }
  if (
    hint.includes('life process') ||
    hint.includes('nutrition') ||
    hint.includes('respiration') ||
    hint.includes('excretion') ||
    hint.includes('stomata') ||
    hint.includes('nephron') ||
    hint.includes('heart') ||
    hint.includes('control and coordination') ||
    hint.includes('neuron') ||
    hint.includes('reflex') ||
    hint.includes('reproduction') ||
    hint.includes('heredity') ||
    hint.includes('evolution') ||
    hint.includes('food chain') ||
    hint.includes('trophic')
  ) {
    return 'biology_process';
  }
  if (hint.includes('magnetic') || hint.includes('magnet') || hint.includes('solenoid') || hint.includes('field')) {
    return 'magnetic_field';
  }
  if (hint.includes('circuit') || hint.includes('electric') || hint.includes('current') || hint.includes('resistance') || hint.includes('ammeter') || hint.includes('voltmeter')) {
    return 'circuit';
  }
  if (hint.includes('triangle') || hint.includes('similar') || hint.includes('congruen') || hint.includes('pyth') || hint.includes('bpt') || hint.includes('parallel')) {
    return 'triangle';
  }
  return 'generic';
}

function diagramLabelsForType(diagramType) {
  const raw = String(diagramType || '');
  const t = raw.toLowerCase();
  if (t === 'bpt' || t === 'pythagoras') return { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' };
  if (t.includes('similarity') || t.includes('triangle')) return { A: 'A', B: 'B', C: 'C', P: 'P', Q: 'Q', R: 'R' };
  if (t === 'parallel_line_angle_relations') return { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' };
  if (t === 'trigonometric_triangle') return { A: 'A', B: 'B', C: 'C', theta: 'theta' };
  if (t === 'circle') return { O: 'O', A: 'A', B: 'B' };
  if (t === 'coordinate_plane') return { O: 'O', X: 'x', Y: 'y', P: 'P' };
  if (t === 'mensuration_solid') return { H: 'h', R: 'r' };
  if (t === 'ray_diagram') return { O: 'O', F: 'F', F2: '2F' };
  if (t === 'biology_process') return { A: 'Input', B: 'Process', C: 'Output' };
  if (t === 'magnetic_field') return { P: 'Conductor', B1: 'B1', B2: 'B2' };
  if (t === 'circuit') return { A: 'A', B: 'B', V: 'V' };
  return { A: 'A', B: 'B', C: 'C' };
}

function diagramSpecForPayload(payload) {
  if (!shouldRequireDiagram(payload)) return null;
  const topicKey = payload?.topicKey || payload?.chapter || '';
  const nodeId = payload?.mindmapNodeId || payload?.cardId || payload?.nodeId || '';
  const title =
    payload?.mindmapNodeTitle ||
    payload?.cardTitle ||
    payload?.cardName ||
    payload?.questionText ||
    payload?.contextText ||
    '';
  try {
    return getDiagramTemplate(topicKey, nodeId, title, inferDiagramType(payload));
  } catch {
    return null;
  }
}

function attachTutorDiagramIntent(structured, payload) {
  if (!structured || typeof structured !== 'object') return structured;
  const diagramRequired = shouldRequireDiagram(payload);
  const diagramType = diagramRequired ? inferDiagramType(payload) : '';
  const diagramLabels = diagramRequired ? diagramLabelsForType(diagramType) : null;
  const diagramSpec = diagramRequired ? diagramSpecForPayload(payload) : null;

  if (typeof structured.tutor === 'string') {
    structured.tutor = { text: structured.tutor };
  }
  if (structured.tutor && typeof structured.tutor === 'object') {
    structured.tutor.diagramRequired = diagramRequired;
    structured.tutor.diagramType = diagramType;
    if (diagramSpec) structured.tutor.diagramSpec = diagramSpec;
  } else if (diagramRequired) {
    structured.tutor = {
      diagramRequired,
      diagramType,
      diagramSpec,
    };
  }

  if (diagramRequired) {
    if (!structured.diagramType) structured.diagramType = diagramType;
    if (!structured.diagramLabels) structured.diagramLabels = diagramLabels;
    if (!structured.diagramSpec && !structured.diagram && diagramSpec) {
      structured.diagram = diagramSpec;
    }
  }

  return structured;
}

function diagramLineForExplain(payload) {
  const type = inferDiagramType(payload);
  const labels = diagramLabelsForType(type);
  const labelList = Object.keys(labels).join(',');
  return `Diagram: diagramType=${type}; labels=${labelList}`;
}

function formatDoubtContext(payload) {
  const ctx = payload?.doubtContext || payload?.doubtMeta;
  if (!ctx) return '';
  const lines = [
    'DOUBT CONTEXT (use this to answer the student doubt):',
    ctx.chapter ? `- chapter: ${ctx.chapter}` : '',
    ctx.cardTitle ? `- card: ${ctx.cardTitle}` : '',
    ctx.cardSection ? `- section: ${ctx.cardSection}` : '',
    ctx.cardSubSection ? `- subSection: ${ctx.cardSubSection}` : '',
    ctx.itemTitle ? `- item: ${ctx.itemTitle}` : '',
    ctx.anchor ? `- anchor: ${ctx.anchor}` : '',
    ctx.selectedMode ? `- selectedMode: ${ctx.selectedMode}` : '',
    ctx.lastMentorResponse ? `- lastMentorResponse: ${ctx.lastMentorResponse}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

function ensureDiagramLineInText(text, payload) {
  if (!shouldRequireDiagram(payload)) return text;
  const t = String(text || '');
  if (/diagramtype\s*[:=]/i.test(t)) return text;
  const line = diagramLineForExplain(payload);
  const lines = t.split(/\r?\n/);
  const targets = [
    '3) solved mini-example',
    '4) micro-example',
    '3) one worked mini-example',
  ];
  let insertAt = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const l = String(lines[i] || '').toLowerCase();
    if (targets.some((tgt) => l.includes(tgt))) {
      insertAt = i + 1;
      break;
    }
  }
  if (insertAt !== -1) {
    lines.splice(insertAt, 0, line);
    return lines.join('\n');
  }
  return t + '\n' + line;
}

function ensureDiagramFields(obj, payload) {
  if (!shouldRequireDiagram(payload)) return obj;
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);
  const diagramSpec = diagramSpecForPayload(payload);
  if (!obj.diagramType) obj.diagramType = diagramType;
  if (!obj.diagramLabels) obj.diagramLabels = diagramLabels;
  if (!obj.diagramSpec && !obj.diagram && diagramSpec) obj.diagram = diagramSpec;
  return obj;
}

function normalizeBoardSteps(obj) {
  if (!obj || obj.kind !== 'board_steps_ms' || !Array.isArray(obj.steps)) return obj;
  const total = Number(obj.totalMarks);
  if (!Number.isFinite(total) || total <= 0) return obj;
  const cleaned = obj.steps.map((s) => ({
    ...s,
    marks: Number.isFinite(Number(s?.marks)) ? Number(s.marks) : 0,
  }));
  const sum = cleaned.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
  if (!sum) {
    const per = cleaned.length ? total / cleaned.length : total;
    const rounded = cleaned.map((s) => ({
      ...s,
      marks: Math.round(per * 2) / 2,
    }));
    const roundedSum = rounded.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
    const delta = Number((total - roundedSum).toFixed(2));
    if (rounded.length && Math.abs(delta) > 0.001) {
      const lastIdx = rounded.length - 1;
      rounded[lastIdx].marks = Number((rounded[lastIdx].marks + delta).toFixed(2));
    }
    obj.steps = rounded;
    return obj;
  }
  const factor = total / sum;
  const rounded = cleaned.map((s) => ({
    ...s,
    marks: Math.round((Number(s.marks) * factor) * 2) / 2,
  }));
  const roundedSum = rounded.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
  const delta = Number((total - roundedSum).toFixed(2));
  if (rounded.length && Math.abs(delta) > 0.001) {
    const lastIdx = rounded.length - 1;
    rounded[lastIdx].marks = Number((rounded[lastIdx].marks + delta).toFixed(2));
  }
  obj.steps = rounded;
  return obj;
}

function getLastUserMessage(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (m && String(m.role || '').toLowerCase() === 'user') {
      return String(m.content || '');
    }
  }
  return '';
}

function isTrianglesEvaluationRequest(payload, messages) {
  if (!isTrianglesTopic(payload)) return false;
  // Keep Learn/Teach interactions in tutor mode; evaluation is opt-in.
  if (isTeachTabPayload(payload)) return false;
  const section = String(payload?.section || '').toLowerCase();
  const subSection = String(payload?.subSection || '').toLowerCase();
  const selectedTab = String(payload?.selectedTab || payload?.tab || '').toLowerCase();
  if (
    section === 'learn' &&
    (selectedTab === 'teach' || subSection.includes('teach') || subSection.includes('board'))
  ) {
    return false;
  }
  const explicitAttempt = String(payload?.studentAttempt || payload?.studentAnswer || '').trim();
  if (explicitAttempt) return true;
  const last = getLastUserMessage(messages);
  if (!last) return false;
  const normalized = last.trim();
  const hasExplicitEvalIntent =
    /^(please\s+)?(check|evaluate|mark|grade|score|feedback|assess)\b/i.test(normalized) ||
    /\b(check|evaluate|mark|grade|score|feedback|assess)\s+(my|this)\b/i.test(normalized);
  if (!hasExplicitEvalIntent) return false;
  const hasAttemptKeyword = /(answer|attempt|solution|proof)\b/i.test(normalized);
  return hasAttemptKeyword;
}

function extractStudentAttempt(payload, messages) {
  const explicit = String(payload?.studentAttempt || payload?.studentAnswer || '').trim();
  if (explicit) return explicit;
  const last = getLastUserMessage(messages);
  if (!last) return '';
  return String(last || '')
    .replace(/^(please\s+)?(check|evaluate|mark|grade|score|feedback|assess)\s*[:\-]?\s*/i, '')
    .replace(/^student\s+checkpoint\s+attempt\s+or\s+doubt\s*[:\-]?\s*/i, '')
    .trim();
}

function classifyAttemptStatus(attempt) {
  const raw = String(attempt || '').trim();
  if (!raw || raw.length < 8) return 'unclear';
  const lower = raw.toLowerCase();
  const hasCriterion = /(aa|sas|sss|similar|proportion|corresponding|cpst)\b/i.test(lower);
  const hasConclusion = /(therefore|hence|thus|conclude|so)\b/i.test(lower);
  if (hasCriterion && hasConclusion) return 'correct';
  if (hasCriterion) return 'partially_correct';
  return 'incorrect';
}

function attemptStatusToConfidence(status) {
  if (status === 'correct') return 0.85;
  if (status === 'partially_correct') return 0.6;
  if (status === 'incorrect') return 0.35;
  return 0.15;
}

function buildAttemptLoopHeuristic(payload, attempt) {
  const requestNextHint = Boolean(payload?.requestNextHint || payload?.request_next_hint);
  const raw = String(attempt || '').trim();
  const status = classifyAttemptStatus(raw);
  const mistakeTags = status === 'correct'
    ? []
    : status === 'partially_correct'
      ? ['missing_conclusion']
      : status === 'unclear'
        ? ['no_working_shown']
        : ['missing_similarity_criterion', 'correspondence_mismatch'];
  const missingPrereqs = status === 'correct'
    ? []
    : status === 'unclear'
      ? ['problem_understanding']
      : ['similarity_criteria'];
  const nextAction = status === 'correct'
    ? { type: 'NEXT_STEP', prompt: 'Proceed to the next step and solve for the unknowns.' }
    : status === 'partially_correct'
      ? { type: 'HINT', prompt: 'State the similarity criterion and finish with the final similarity statement.' }
      : status === 'unclear'
        ? { type: 'CHECKPOINT', prompt: 'Write the given angles/sides and the target result in one line each.' }
        : { type: 'REFRAME', prompt: 'Reframe: identify corresponding angles/sides, then apply AA/SAS/SSS.' };

  const briefMap = {
    correct: 'Attempt is consistent with the similarity criterion; proceed to compute the result.',
    partially_correct: 'Good start, but the conclusion/criterion is incomplete.',
    incorrect: 'Attempt misses the similarity criterion or correspondence.',
    unclear: 'Attempt is missing or too short to evaluate reliably.',
  };

  const context = {
    status,
    mistakeTags,
    attemptText: raw,
    topicKey: payload?.topicKey,
    questionText: payload?.questionText || payload?.question || payload?.prompt || '',
    theoremFocus: payload?.theoremFocus,
  };
  let hintState = initHintState();
  if (payload?.hintLadderState && typeof payload.hintLadderState === 'object') {
    hintState = payload.hintLadderState;
  }
  if (status !== 'correct' && requestNextHint) {
    hintState = computeNextHint(hintState, context, true);
  }

  const rubric = scoreRubric({
    status,
    mistakeTags,
    attemptText: raw,
    theoremFocus: payload?.theoremFocus,
  });

  const sources = retrieveTrianglesSources({
    attemptText: raw,
    mistakeTags,
    theoremFocus: payload?.theoremFocus,
  });

  return {
    student_attempt: {
      raw_text: raw || '(empty attempt)',
      confidence: attemptStatusToConfidence(status),
    },
    diagnosis: {
      status,
      mistake_tags: mistakeTags,
      missing_prereqs: missingPrereqs,
    },
    next_action: nextAction,
    hint_ladder: status === 'correct' ? null : hintState,
    rubric,
    sources,
    bsre: {
      brief: briefMap[status] || briefMap.unclear,
      steps: [
        'Identify given equal angles or proportional sides.',
        'State AA/SAS/SSS and fix the correspondence.',
        'Write the proportionality and solve for unknowns.',
      ],
      reasoning_checks: ['Named the criterion', 'Matched corresponding parts', 'Closed with similarity statement'],
      evaluation: {
        verdict: status,
        why: briefMap[status] || briefMap.unclear,
      },
    },
  };
}

function getProofFocus(payload) {
  const focusRaw = Array.isArray(payload?.theoremFocus)
    ? payload.theoremFocus[0]
    : payload?.theoremFocus || payload?.focus || '';
  const focus = String(focusRaw || '').toLowerCase();
  if (focus.includes('bpt')) return 'bpt';
  if (focus.includes('area')) return 'area_ratio';
  if (focus.includes('pyth')) return 'pythagoras';
  if (focus.includes('similar')) return 'similarity';
  return 'similarity';
}

function getProofMaxLines(marks) {
  const m = Number(marks);
  if (m === 2) return 5;
  if (m === 3) return 7;
  if (m === 4) return 9;
  if (m === 5) return 10;
  return 10;
}

function proofTemplateForFocus(focus) {
  switch (focus) {
    case 'bpt':
      return [
        'BPT template:',
        '- Given: triangle with a line parallel to one side (state parallelism).',
        '- To Prove: required ratio (AD/DB = AE/EC) or segment length.',
        '- Construction: usually not required; state "Construction: Not required." if none.',
        '- Proof: invoke BPT by name, write the proportionality, substitute values, solve.',
        '- Conclusion: restate the required ratio/length.',
      ];
    case 'area_ratio':
      return [
        'Area-ratio template:',
        '- Given: triangles are similar or side ratios given.',
        '- To Prove: area ratio equals square of side ratio.',
        '- Construction: not required unless extra line is introduced.',
        '- Proof: show similarity, write corresponding side ratios, square to get area ratio.',
        '- Conclusion: state the required area ratio.',
      ];
    case 'pythagoras':
      return [
        'Pythagoras template (right-angled only):',
        '- Given: right triangle with the right angle stated.',
        '- To Prove: hypotenuse^2 = sum of squares of the other two sides or required side.',
        '- Construction: optional altitude to hypotenuse if using similarity.',
        '- Proof: state Pythagoras by name; substitute values; solve.',
        '- Conclusion: restate the result.',
      ];
    case 'similarity':
    default:
      return [
        'Similarity template:',
        '- Given: two triangles with angle equalities or proportional sides.',
        '- To Prove: triangle ABC ~ triangle PQR.',
        '- Construction: add a line only if needed to show angle equality.',
        '- Proof: list equal angles or proportional sides; cite AA/SSS/SAS; fix correspondence; apply CPST.',
        '- Conclusion: state similarity and the required relation.',
      ];
  }
}

function buildProofWritingAddendum(payload, mode) {
  const marks = payload?.marks ?? payload?.totalMarks ?? payload?.total_marks;
  const focus = getProofFocus(payload || {});
  const maxLines = getProofMaxLines(marks);
  const diagramRequired = shouldRequireDiagram(payload);
  const diagramType = diagramRequired ? inferDiagramType(payload) : '';
  const diagramLabels = diagramRequired ? diagramLabelsForType(diagramType) : null;
  const lines = [
    'PROOF WRITING MODE (Triangles):',
    'Mandatory structure: Given / To Prove / Construction (if needed) / Proof / Conclusion.',
    'Use only CBSE/NCERT triangle language and theorems. No off-syllabus ideas.',
    diagramRequired
      ? `Diagram required: include "diagramType": "${diagramType}" and "diagramLabels": ${JSON.stringify(diagramLabels)} in the JSON.`
      : '',
    '',
    ...proofTemplateForFocus(focus),
    '',
    `Length limit: keep the full proof within ${maxLines} lines for the marks value.`,
    'Stop writing immediately after the conclusion.',
    '',
    'Language discipline:',
    '- Use: Given, To Prove, By (theorem name), From (criterion), Thus, Hence, Therefore, Consequently.',
    '- Do NOT use: Obviously, Clearly, I think, We can see, Just, Probably, Sort of, In my opinion.',
    '',
    'Auto-reject triggers (avoid these):',
    '- Missing Given / To Prove / Conclusion.',
    '- Unjustified steps or missing reasons.',
    '- Mixing correspondence order in ratios or angles.',
    '- Using Pythagoras without a right angle.',
    '- Any narrative filler or personal commentary.',
    '',
    'If no construction is needed, still write: "Construction: Not required."',
  ];

  if (mode === 'solve_with_me') {
    lines.push('');
    lines.push('Stepwise reveal (mentor rules):');
    lines.push('- Start with identification of triangles/segments and the right angle or parallel line.');
    lines.push('- Ask BEFORE revealing the next step; do not dump the full proof.');
    lines.push('- Use these prompts in order:');
    lines.push('  1) Which triangles or segments are involved?');
    lines.push('  2) What cues tell you which theorem/criterion to use?');
    lines.push('  3) How should you set up the ratio or equation?');
    lines.push('  4) What values are you substituting?');
    lines.push('  5) How will you manipulate to isolate the unknown?');
    lines.push('  6) Does your conclusion match the To Prove?');
    lines.push('- When the student is ready, output a final board-style write-up that follows the structure and line limit.');
  } else if (mode === 'board_steps_ms') {
    lines.push('');
    lines.push('Board steps requirements:');
    lines.push('- Each step must begin with one of: Given:, To Prove:, Construction:, Proof:, Conclusion:.');
    lines.push('- Use multiple Proof: steps if needed, but keep total steps within the line limit.');
  }

  return lines.join('\n');
}

function containsDisallowedProofPhrases(text) {
  const t = String(text || '');
  const bannedPatterns = [
    /\bobviously\b/i,
    /\bclearly\b/i,
    /\bi think\b/i,
    /\bwe can see\b/i,
    /\bjust\b/i,
    /\bprobably\b/i,
    /\bsort of\b/i,
    /\bin my opinion\b/i,
  ];
  return bannedPatterns.some((re) => re.test(t));
}

function containsProofHeadings(text) {
  const t = String(text || '');
  return /\b(Given|To Prove|Construction|Proof|Conclusion)\s*:/i.test(t);
}

function findStepIndexByPrefix(steps, prefix) {
  return steps.findIndex((s) => {
    const text = String(s?.text || '').trim().toLowerCase();
    return text.startsWith(prefix);
  });
}

function validateProofBoardSteps(obj, payload) {
  const steps = Array.isArray(obj?.steps) ? obj.steps : [];
  const marks = payload?.marks ?? payload?.totalMarks ?? payload?.total_marks;
  const maxLines = getProofMaxLines(marks);
  const issues = [];

  if (steps.length === 0) issues.push('No steps found.');
  if (steps.length > maxLines) issues.push(`Too many steps (${steps.length}) for limit ${maxLines}.`);

  const idxGiven = findStepIndexByPrefix(steps, 'given');
  const idxToProve = findStepIndexByPrefix(steps, 'to prove');
  const idxConstruction = findStepIndexByPrefix(steps, 'construction');
  const idxConclusion = findStepIndexByPrefix(steps, 'conclusion');
  const idxProof = findStepIndexByPrefix(steps, 'proof');

  if (idxGiven === -1) issues.push('Missing Given step.');
  if (idxToProve === -1) issues.push('Missing To Prove step.');
  if (idxConstruction === -1) issues.push('Missing Construction step.');
  if (idxProof === -1) issues.push('Missing Proof step.');
  if (idxConclusion === -1) issues.push('Missing Conclusion step.');

  if (idxConclusion !== -1 && idxConclusion !== steps.length - 1) {
    issues.push('Conclusion must be the last step.');
  }
  if (
    idxGiven !== -1 &&
    idxToProve !== -1 &&
    idxConstruction !== -1 &&
    (idxGiven > idxToProve || idxToProve > idxConstruction)
  ) {
    issues.push('Given, To Prove, Construction must be in order.');
  }

  const allText = steps.map((s) => s?.text || '').join(' ');
  if (containsDisallowedProofPhrases(allText)) {
    issues.push('Contains disallowed phrases.');
  }

  return { ok: issues.length === 0, issues };
}

function hasProofSectionsInOrder(text) {
  const t = String(text || '').toLowerCase();
  const labels = ['given', 'to prove', 'construction', 'proof', 'conclusion'];
  let lastIdx = -1;
  for (const label of labels) {
    const idx = t.indexOf(label);
    if (idx === -1) return false;
    if (idx < lastIdx) return false;
    lastIdx = idx;
  }
  return true;
}

function countNonEmptyLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean).length;
}

function validateProofSolveWithMe(obj, payload, isFirstTurn) {
  const issues = [];
  if (isFirstTurn && obj?.kind !== 'question') {
    issues.push('First turn must be a question.');
  }
  if (obj?.kind === 'final') {
    const boardWriteup = obj?.boardWriteup || '';
    const marks = payload?.marks ?? payload?.totalMarks ?? payload?.total_marks;
    const maxLines = getProofMaxLines(marks);
    if (!boardWriteup) issues.push('Missing boardWriteup in final.');
    if (boardWriteup && !hasProofSectionsInOrder(boardWriteup)) {
      issues.push('Board write-up missing required sections or order.');
    }
    if (boardWriteup && countNonEmptyLines(boardWriteup) > maxLines) {
      issues.push('Board write-up exceeds line limit.');
    }
    if (containsDisallowedProofPhrases(boardWriteup)) {
      issues.push('Board write-up contains disallowed phrases.');
    }
  }

  if (containsDisallowedProofPhrases(obj?.tutor || '')) {
    issues.push('Tutor text contains disallowed phrases.');
  }

  return { ok: issues.length === 0, issues };
}

function validateLearnTeach(obj, payload) {
  const issues = [];
  if (!obj || typeof obj !== 'object') return { ok: false, issues: ['Missing JSON object.'] };
  if (obj.kind !== 'learn_teach') issues.push('kind must be learn_teach.');
  const teach = obj.teach || {};
  const simple = Array.isArray(teach.simpleExplanation) ? teach.simpleExplanation : [];
  const exam = Array.isArray(teach.cbseExamSentence) ? teach.cbseExamSentence : [];
  if (simple.length < 4) issues.push('teach.simpleExplanation needs >= 4 items.');
  if (exam.length < 2) issues.push('teach.cbseExamSentence needs >= 2 items.');

  const worked = Array.isArray(obj.workedExamples) ? obj.workedExamples : [];
  if (worked.length !== 2) issues.push('workedExamples must be exactly 2 items.');
  worked.forEach((ex, idx) => {
    if (!ex || typeof ex !== 'object') {
      issues.push(`workedExamples[${idx}] is invalid.`);
      return;
    }
    const steps = Array.isArray(ex.steps) ? ex.steps : [];
    if (!steps.length) issues.push(`workedExamples[${idx}] has no steps.`);
    const total = Number(ex.totalMarks);
    const sum = steps.reduce((acc, s) => acc + (Number(s?.marks) || 0), 0);
    if (!Number.isFinite(total)) issues.push(`workedExamples[${idx}] totalMarks missing.`);
    if (Number.isFinite(total) && Math.abs(total - sum) > 0.001) {
      issues.push(`workedExamples[${idx}] totalMarks != sum of step marks.`);
    }
    if (!String(ex.finalAnswer || '').trim()) {
      issues.push(`workedExamples[${idx}] finalAnswer missing.`);
    }
  });

  const commonMistakes = Array.isArray(obj.commonMistakes) ? obj.commonMistakes : [];
  if (commonMistakes.length < 1) issues.push('commonMistakes needs >= 1 items.');
  if (!String(obj.checkQuestion || '').trim()) issues.push('checkQuestion missing.');

  if (!String(obj.diagramType || '').trim()) issues.push('diagramType missing.');
  if (!obj.diagramLabels || typeof obj.diagramLabels !== 'object') issues.push('diagramLabels missing.');

  const blob = JSON.stringify(obj || {});
  const hasMindmapContext =
    Boolean(payload?.mindmapNodeId || payload?.mindmapNodeTitle || payload?.mindmapNodeText) ||
    String(payload?.subSection || '').toLowerCase().includes('mindmap');
  if (!hasMindmapContext) {
    const requiredPatterns = [
      /\bsimilar\s+triangles?\b/i,
      /\bcorresponding\s+sides?\b/i,
      /\bcorresponding\s+angles?\b/i,
      /\bAA\b/i,
      /\bSAS\b/i,
      /\bSSS\b/i,
      /\bCPST\b/i,
    ];
    requiredPatterns.forEach((re) => {
      if (!re.test(blob)) issues.push(`Missing required key definition: ${re.source}.`);
    });
  }

  if (containsPlaceholderLanguage(blob)) {
    issues.push('Placeholder language detected.');
  }

  return { ok: issues.length === 0, issues };
}

function validateLearnMindmap(obj) {
  const issues = [];
  if (!obj || typeof obj !== 'object') return { ok: false, issues: ['Missing JSON object.'] };
  if (obj.kind !== 'learn_mindmap') issues.push('kind must be learn_mindmap.');
  const bullets = Array.isArray(obj.conceptBullets) ? obj.conceptBullets : [];
  const examLines = Array.isArray(obj.examLines) ? obj.examLines : [];
  const worked = obj.workedExample || {};
  const steps = Array.isArray(worked.steps) ? worked.steps : [];
  if (bullets.length < 5) issues.push('conceptBullets needs >= 5 items.');
  if (examLines.length < 2) issues.push('examLines needs >= 2 items.');
  if (!String(worked.question || '').trim()) issues.push('workedExample.question missing.');
  if (!steps.length) issues.push('workedExample.steps missing.');
  if (!String(worked.finalAnswer || '').trim()) issues.push('workedExample.finalAnswer missing.');
  if (!String(obj.commonError || '').trim()) issues.push('commonError missing.');
  if (!String(obj.commonFix || '').trim()) issues.push('commonFix missing.');
  if (!String(obj.checkQuestion || '').trim()) issues.push('checkQuestion missing.');
  if (!String(obj.diagramType || '').trim()) issues.push('diagramType missing.');
  if (!obj.diagramLabels || typeof obj.diagramLabels !== 'object') issues.push('diagramLabels missing.');
  const blob = JSON.stringify(obj || {});
  if (containsPlaceholderLanguage(blob)) issues.push('Placeholder language detected.');
  return { ok: issues.length === 0, issues };
}

function isTeachContractRequest(payload, mode) {
  return mode === 'learn_teach' && isTeachTabPayload(payload);
}

function toStringArray(value) {
  return Array.isArray(value) ? value.map((v) => String(v || '').trim()).filter(Boolean) : [];
}

function ensureMinArray(list, min, makeItem) {
  const out = Array.isArray(list) ? list.slice() : [];
  while (out.length < min) {
    out.push(makeItem(out.length));
  }
  return out;
}

function toSingleLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function enforceTeacherGoal(goal, nodeTitle, topicContract) {
  const topic = String(nodeTitle || 'this concept').trim() || 'this concept';
  let out = toSingleLine(goal);
  if (!out && topicContract?.goalLine) out = `Teacher goal: ${String(topicContract.goalLine).replace(/^teacher goal:\s*/i, '')}`;
  if (!out) out = `Teacher goal: Learn ${topic} in CBSE board-writing format.`;
  if (!/^teacher goal:/i.test(out)) out = `Teacher goal: ${out.replace(/^goal:\s*/i, '')}`;
  if (!/\bCBSE\b|\bboard\b/i.test(out)) out = `${out} (CBSE board-writing format).`;
  return out;
}

function normalizeTeachKeyIdeas(lines, nodeTitle, topicContract) {
  const topic = String(nodeTitle || 'this concept').trim() || 'this concept';
  const seeded = Array.isArray(topicContract?.keyIdeas) ? topicContract.keyIdeas : [];
  const defaults = [
    seeded[0] || `Definition: state what ${topic} means in this question.`,
    seeded[1] || 'Criterion: write the exact theorem/criterion name before using it.',
    seeded[2] || 'Correspondence: keep matching vertices/sides in the same order.',
    seeded[3] || 'Conclusion: end with Therefore/Hence and the required statement.',
  ];
  const prefixes = ['Definition', 'Criterion', 'Correspondence', 'Conclusion'];
  const sourceLines = seeded.length === 4 ? seeded : toStringArray(lines);
  const merged = ensureMinArray(sourceLines, 4, (i) => defaults[i] || `Step ${i + 1}: ${topic}.`).slice(0, 4);
  return merged.map((line, idx) => {
    const cleaned = toSingleLine(String(line || '').replace(/^(definition|criterion|correspondence|conclusion)\s*[:\-]?\s*/i, ''));
    const fallback = defaults[idx].replace(/^(Definition|Criterion|Correspondence|Conclusion)\s*:\s*/i, '');
    return `${prefixes[idx]}: ${cleaned || fallback}`;
  });
}

function enforceCheckpointQuestion(question, nodeTitle, topicContract) {
  const topic = String(nodeTitle || 'this concept').trim() || 'this concept';
  let out = toSingleLine(question);
  if (!out && topicContract?.checkpointQuestion) out = toSingleLine(topicContract.checkpointQuestion);
  if (
    topicContract &&
    String(topicContract.subject || "").toLowerCase() === "science" &&
    /\bwhich\s+criterion\s+applies\s+here\b/i.test(out)
  ) {
    out = toSingleLine(topicContract.checkpointQuestion || out);
  }
  if (!out) {
    out = `Board checkpoint: In 2-4 lines, write Given, To Prove, the criterion/theorem for ${topic}, and one Therefore/Hence line.`;
  }
  if (!/\bboard\b|\bCBSE\b/i.test(out)) out = `Board checkpoint: ${out}`;
  if (!/\bcriterion\b|\btheorem\b/i.test(out)) out = `${out} Include the criterion/theorem name.`;
  if (!/\bGiven\b/i.test(out) || !/\bTo Prove\b/i.test(out) || !/\bTherefore\b|\bHence\b/i.test(out)) {
    out = `${out} Use Given, To Prove, and Therefore/Hence format.`;
  }
  return out;
}

function enforceCheckpointAnswer(answer, nodeTitle, topicContract) {
  const topic = String(nodeTitle || 'this concept').trim() || 'this concept';
  let out = String(answer || '').trim();
  const genericBoardTemplate = [
    `Given: [state the given data for ${topic}].`,
    'To Prove: [write the required result].',
    'Criterion/Theorem: [write exact name such as AA/SAS/SSS if applicable].',
    'Therefore/Hence: [write the final conclusion line].',
  ].join(' ');
  const boardTemplate =
    toSingleLine(String(topicContract?.checkpointAnswer || '').replace(/^Expected answer:\s*/i, '')) ||
    genericBoardTemplate;
  if (!out && topicContract?.checkpointAnswer) {
    out = String(topicContract.checkpointAnswer || '').trim();
  }
  if (!out) out = boardTemplate;
  out = toSingleLine(out);
  const hasGiven = /\bgiven\b\s*:/i.test(out);
  const hasToProve = /\bto prove\b\s*:|\bto find\b\s*:/i.test(out);
  const hasCriterion = /\bcriterion\b|\btheorem\b|\bformula\b|\bprinciple\b|\blaw\b/i.test(out);
  const hasConclusion = /\btherefore\b|\bhence\b/i.test(out);
  if (!hasGiven || !hasToProve || !hasCriterion || !hasConclusion) {
    if (!out.includes('Given: [state the given data')) {
      out = `${out} ${boardTemplate}`.trim();
    }
  }
  const doubledTemplate = `${boardTemplate} ${boardTemplate}`;
  if (out.includes(doubledTemplate)) {
    out = out.replace(doubledTemplate, boardTemplate);
  }
  if (!/^expected answer:/i.test(out)) out = `Expected answer: ${out}`;
  return out;
}

function enforceCommonMistake(commonMistake, nodeTitle, topicContract) {
  const topic = String(nodeTitle || 'this concept').trim() || 'this concept';
  let out = toSingleLine(commonMistake);
  if (!out && topicContract?.commonMistake) out = toSingleLine(topicContract.commonMistake);
  if (
    topicContract &&
    String(topicContract.subject || "").toLowerCase() === "science" &&
    /\bsimilar\b|\bcorrespondence\b|\baa\b|\bsas\b|\bsss\b/i.test(out)
  ) {
    out = toSingleLine(topicContract.commonMistake || out);
  }
  if (!out) {
    out = `Common mistake: skipping criterion/correspondence while writing ${topic}.`;
  }
  if (!/^common mistake:/i.test(out)) out = `Common mistake: ${out}`;
  if (!/\bmark\b|\bdeduct\b|\blose marks\b|\bstep marks\b/i.test(out)) {
    out = `${out} This can lose marks in CBSE board checking.`;
  }
  return out;
}

function buildDiagramFields(payload, raw = {}) {
  const diagramRequired = typeof raw.diagramRequired === 'boolean' ? raw.diagramRequired : shouldRequireDiagram(payload);
  const diagramType = diagramRequired
    ? String(raw.diagramType || raw.diagram?.diagramType || raw.diagram?.type || inferDiagramType(payload) || '').trim()
    : '';
  const diagramLabels = diagramRequired
    ? raw.diagramLabels || raw.diagram?.diagramLabels || raw.diagram?.labels || diagramLabelsForType(diagramType)
    : null;
  const diagramSpec =
    diagramRequired
      ? raw.diagramSpec || raw.diagram || raw?.tutor?.diagramSpec || diagramSpecForPayload(payload) || {
          type: diagramType,
          labels: diagramLabels,
        }
      : null;
  return { diagramRequired, diagramType, diagramSpec, diagramLabels };
}

function toLabelArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.values(value).map((v) => String(v || '').trim()).filter(Boolean);
  }
  return [];
}

function buildTeachDiagramObject(payload, rawDiagram = {}, structured = {}) {
  const required =
    typeof rawDiagram.required === 'boolean'
      ? rawDiagram.required
      : typeof rawDiagram.diagramRequired === 'boolean'
        ? rawDiagram.diagramRequired
        : typeof structured.diagramRequired === 'boolean'
          ? structured.diagramRequired
          : shouldRequireDiagram(payload);
  const inferredType = inferDiagramType(payload) || 'generic';
  const type = String(
    rawDiagram.type ||
      rawDiagram.diagramType ||
      structured.diagramType ||
      structured.diagram?.diagramType ||
      inferredType
  ).trim() || 'generic';
  let labels = toLabelArray(
    rawDiagram.labels ||
      rawDiagram.diagramLabels ||
      structured.diagramLabels ||
      structured.diagram?.diagramLabels ||
      diagramLabelsForType(type)
  );
  if (!labels.length) labels = toLabelArray(diagramLabelsForType(type));
  if (!labels.length) labels = ['A', 'B', 'C'];
  const spec =
    rawDiagram.spec ||
    rawDiagram.diagramSpec ||
    structured.diagramSpec ||
    structured.diagram ||
    diagramSpecForPayload(payload) ||
    null;
  const svg = typeof rawDiagram.svg === 'string' ? rawDiagram.svg : null;
  let altText = String(rawDiagram.altText || rawDiagram.diagramAltText || '').trim();
  if (!altText) {
    const nodeTitle =
      payload?.mindmapNodeTitle ||
      payload?.cardTitle ||
      payload?.cardName ||
      payload?.itemTitle ||
      payload?.topicKey ||
      payload?.topic ||
      'this concept';
    altText = `Diagram for ${nodeTitle}.`;
  }
  return {
    required: Boolean(required),
    type,
    labels,
    spec,
    svg,
    altText,
  };
}

function ensureTeachContractShape(raw, payload) {
  if (!raw || typeof raw !== 'object' || raw.kind !== 'learn_teach') return raw;
  const topic = payload?.topicKey || payload?.chapter || payload?.topic || 'this topic';
  const nodeTitle =
    payload?.mindmapNodeTitle ||
    payload?.cardTitle ||
    payload?.cardName ||
    payload?.itemTitle ||
    topic;
  const topicContract = resolveTopicTeachContract({
    topicKey: topic,
    subject: payload?.subject || payload?.subjectTitle || payload?.subjectKey,
    nodeTitle,
  });
  const contractSource =
    topicContract && topicContract.contractSource === "topic" ? "topic" : "generic";
  const teach = raw.teach && typeof raw.teach === 'object' ? { ...raw.teach } : {};
  const goal = enforceTeacherGoal(
    String(teach.goal || raw.goalLine || teach.headline || teach.oneLiner || '').trim(),
    nodeTitle,
    topicContract
  );
  let keyIdeas = toStringArray(teach.keyIdeas);
  if (!keyIdeas.length) keyIdeas = toStringArray(raw.keyIdeaBullets);
  if (!keyIdeas.length) keyIdeas = toStringArray(teach.conceptBullets);
  if (!keyIdeas.length) keyIdeas = toStringArray(teach.simpleExplanation);
  keyIdeas = normalizeTeachKeyIdeas(keyIdeas, nodeTitle, topicContract);
  const diagram = buildTeachDiagramObject(payload, teach.diagram || raw.diagram || {}, raw);
  const checkpointRaw = raw.checkpoint || teach.checkpoint || {};
  const checkpointQuestion = enforceCheckpointQuestion(
    String(checkpointRaw.question || raw.checkpointQ || raw.checkQuestion || '').trim(),
    nodeTitle,
    topicContract
  );
  const checkpointAnswer = enforceCheckpointAnswer(
    String(checkpointRaw.answer || raw.checkpointA || '').trim(),
    nodeTitle,
    topicContract
  );
  const commonMistake = enforceCommonMistake(
    String(
      raw.commonMistake ||
        teach.commonMistake ||
        raw.commonMistakeWarning ||
        raw.commonError ||
        (Array.isArray(raw.commonMistakes) ? raw.commonMistakes[0] : '')
    ).trim(),
    nodeTitle,
    topicContract
  );

  const nextTeach = {
    ...teach,
    goal,
    keyIdeas,
    diagram,
    checkpoint: { question: checkpointQuestion, answer: checkpointAnswer },
    commonMistake,
    contract_source: contractSource,
    scope_guard_line: topicContract?.scopeGuardLine || "",
    assessed_scope_bullets: Array.isArray(topicContract?.assessedScopeBullets)
      ? topicContract.assessedScopeBullets
      : [],
    enrichment_scope_bullets: Array.isArray(topicContract?.enrichmentScopeBullets)
      ? topicContract.enrichmentScopeBullets
      : [],
  };
  const next = {
    ...raw,
    teach: nextTeach,
    goalLine: raw.goalLine ?? goal,
    keyIdeaBullets: raw.keyIdeaBullets ?? keyIdeas,
    checkpoint: { question: checkpointQuestion, answer: checkpointAnswer },
    commonMistake,
    commonMistakeWarning: raw.commonMistakeWarning ?? commonMistake,
    checkpointQ: raw.checkpointQ ?? checkpointQuestion,
    checkpointA: raw.checkpointA ?? checkpointAnswer,
    contract_source:
      contractSource === "topic"
        ? "topic"
        : raw.contract_source || contractSource,
    scope_guard_line: raw.scope_guard_line || topicContract?.scopeGuardLine || "",
  };
  if (diagram.required && !next.diagramRequired) next.diagramRequired = diagram.required;
  if (!next.diagramType) next.diagramType = diagram.type;
  if (!next.diagramLabels) next.diagramLabels = diagram.labels;
  if (!next.diagramSpec && diagram.spec) next.diagramSpec = diagram.spec;
  return next;
}

function validateLearnTeachContract(obj, payload) {
  const issues = [];
  if (!obj || typeof obj !== 'object') return { ok: false, issues: ['Missing JSON object.'] };
  if (obj.kind !== 'learn_teach') issues.push('kind must be learn_teach.');

  const teach = obj.teach || {};
  const goal = String(teach.goal || '').trim();
  const keyIdeas = toStringArray(teach.keyIdeas);
  if (!goal) issues.push('teach.goal missing.');
  if (keyIdeas.length < 4) issues.push('teach.keyIdeas needs >= 4 items.');
  if (!/^Teacher goal:/i.test(goal)) issues.push('teach.goal must start with "Teacher goal:".');
  const ideaPrefixes = ['Definition:', 'Criterion:', 'Correspondence:', 'Conclusion:'];
  ideaPrefixes.forEach((prefix, idx) => {
    const line = String(keyIdeas[idx] || '');
    if (!line.startsWith(prefix)) {
      issues.push(`teach.keyIdeas[${idx}] must start with "${prefix}".`);
    }
  });

  const diagram = teach.diagram || {};
  if (!diagram || typeof diagram !== 'object') {
    issues.push('teach.diagram missing.');
  } else {
    if (typeof diagram.required !== 'boolean') issues.push('teach.diagram.required must be boolean.');
    if (!String(diagram.type || '').trim()) issues.push('teach.diagram.type missing.');
    if (!Array.isArray(diagram.labels) || diagram.labels.length < 2) {
      issues.push('teach.diagram.labels needs >= 2 items.');
    }
    if (!('spec' in diagram)) issues.push('teach.diagram.spec missing.');
    if (!String(diagram.altText || '').trim()) issues.push('teach.diagram.altText missing.');
  }

  const checkpoint = obj.checkpoint || teach.checkpoint || {};
  const checkpointQuestion = String(checkpoint.question || '').trim();
  const checkpointAnswer = String(checkpoint.answer || '').trim();
  if (!checkpointQuestion) issues.push('checkpoint.question missing.');
  if (!checkpointAnswer) issues.push('checkpoint.answer missing.');
  if (checkpointQuestion) {
    if (!/\bboard\b|\bCBSE\b/i.test(checkpointQuestion)) {
      issues.push('checkpoint.question must be board/CBSE aligned.');
    }
    if (!/\bgiven\b/i.test(checkpointQuestion) || !/\bto prove\b/i.test(checkpointQuestion)) {
      issues.push('checkpoint.question must reference Given and To Prove format.');
    }
  }
  if (checkpointAnswer) {
    if (!/^Expected answer:/i.test(checkpointAnswer)) {
      issues.push('checkpoint.answer must start with "Expected answer:".');
    }
    if (!/\bgiven\b\s*:/i.test(checkpointAnswer)) issues.push('checkpoint.answer missing "Given:".');
    if (!/\bto prove\b\s*:/i.test(checkpointAnswer)) issues.push('checkpoint.answer missing "To Prove:".');
    if (!/\bcriterion\b|\btheorem\b/i.test(checkpointAnswer)) {
      issues.push('checkpoint.answer missing criterion/theorem line.');
    }
    if (!/\btherefore\b|\bhence\b/i.test(checkpointAnswer)) {
      issues.push('checkpoint.answer missing Therefore/Hence line.');
    }
  }

  const commonMistake = String(obj.commonMistake || teach.commonMistake || '').trim();
  if (!commonMistake) issues.push('commonMistake missing.');
  if (!/\bmark\b|\bdeduct\b|\blose marks\b|\bstep marks\b/i.test(commonMistake)) {
    issues.push('commonMistake must mention a marks/deduction risk.');
  }

  const blob = JSON.stringify(obj || {});
  if (containsPlaceholderLanguage(blob)) issues.push('Placeholder language detected.');
  return { ok: issues.length === 0, issues };
}

function buildDeterministicExamLines(topicLabel) {
  const topic = String(topicLabel || 'this concept');
  return [
    `CBSE line: State the criterion for ${topic} clearly with correct correspondence.`,
    `CBSE line: Write one correct ratio/angle relation for ${topic} and conclude.`,
  ];
}

function buildDeterministicCheckQuestion(topicLabel) {
  const topic = String(topicLabel || 'this concept');
  return `Which condition must be verified before applying ${topic}?`;
}

function buildLearnTeachFallback(payload) {
  const topic = payload?.topicKey || payload?.chapter || payload?.topic || 'this topic';
  const nodeTitle =
    payload?.mindmapNodeTitle ||
    payload?.cardTitle ||
    payload?.cardName ||
    payload?.itemTitle ||
    topic;
  const diagram = buildDiagramFields(payload);
  const conceptBullets = ensureMinArray(
    toStringArray([`Definition: ${nodeTitle}.`, 'State the criterion before CPST.']),
    3,
    (i) => `Key point ${i + 1} for ${nodeTitle}.`
  );
  const examLines = ensureMinArray(buildDeterministicExamLines(nodeTitle), 2, (i) => `CBSE line ${i + 1}: ${nodeTitle}.`);
  const steps = ensureMinArray([], 2, (i) => ({ text: `Step ${i + 1}: Apply the criterion with correct order.`, marks: 1 }));
  const base = {
    kind: 'learn_teach',
    teach: {
      headline: `Teach: ${nodeTitle}`,
      oneLiner: `Key idea: ${nodeTitle} in ${topic}.`,
      conceptBullets,
      examLines,
    },
    workedExample: {
      question: `Micro-drill: Write two correct steps with reasons for ${nodeTitle}.`,
      steps,
      finalAnswer: `Therefore, ${nodeTitle} is established.`,
    },
    commonError: 'Mixing correspondence order or applying a theorem without conditions.',
    commonFix: 'State the criterion, then write the matching ratio/angle relation before concluding.',
    checkQuestion: buildDeterministicCheckQuestion(nodeTitle),
    diagramRequired: diagram.diagramRequired,
    diagramType: diagram.diagramType,
    diagramSpec: diagram.diagramSpec,
    diagramLabels: diagram.diagramLabels,
    fallback_used: true,
  };
  return ensureTeachContractShape(base, payload);
}

function adaptLegacyLearnTeachToContract(raw, payload) {
  const topic = payload?.topicKey || payload?.chapter || payload?.topic || 'this topic';
  const nodeTitle =
    payload?.mindmapNodeTitle ||
    payload?.cardTitle ||
    payload?.cardName ||
    payload?.itemTitle ||
    topic;
  let usedFallback = false;
  const teach = raw?.teach || {};
  let conceptBullets = toStringArray(teach.simpleExplanation);
  let examLines = toStringArray(teach.cbseExamSentence);
  if (conceptBullets.length < 3) {
    usedFallback = true;
    conceptBullets = ensureMinArray(conceptBullets, 3, (i) => `Key point ${i + 1} for ${nodeTitle}.`);
  }
  if (examLines.length < 2) {
    usedFallback = true;
    examLines = ensureMinArray(examLines, 2, (i) => buildDeterministicExamLines(nodeTitle)[i] || `CBSE line ${i + 1}.`);
  }
  const firstWorked = Array.isArray(raw?.workedExamples) ? raw.workedExamples[0] : null;
  const stepsRaw = Array.isArray(firstWorked?.steps) ? firstWorked.steps : [];
  let steps = stepsRaw
    .map((s, idx) => ({
      text: String(s?.text || s?.line || s || `Step ${idx + 1}: Apply the criterion.`).trim(),
      marks: Number.isFinite(Number(s?.marks)) ? Number(s.marks) : 1,
    }))
    .filter((s) => s.text);
  if (steps.length < 2) {
    usedFallback = true;
    steps = ensureMinArray(steps, 2, (i) => ({ text: `Step ${i + 1}: Apply the criterion with order.`, marks: 1 }));
  }
  let question = String(firstWorked?.question || '').trim();
  if (!question) {
    usedFallback = true;
    question = `Micro-drill: Write two correct steps with reasons for ${nodeTitle}.`;
  }
  let finalAnswer = String(firstWorked?.finalAnswer || '').trim();
  if (!finalAnswer) {
    usedFallback = true;
    finalAnswer = `Therefore, ${nodeTitle} is established.`;
  }
  let commonError = '';
  let commonFix = '';
  if (Array.isArray(raw?.commonMistakes) && raw.commonMistakes.length) {
    commonError = String(raw.commonMistakes[0] || '').trim();
    commonFix = String(raw.commonMistakes[1] || '').trim();
  }
  if (!commonError) {
    usedFallback = true;
    commonError = 'Mixing correspondence order or missing criterion conditions.';
  }
  if (!commonFix) {
    usedFallback = true;
    commonFix = 'Write the criterion and correspondence order before CPST.';
  }
  let checkQuestion = String(raw?.checkQuestion || '').trim();
  if (!checkQuestion) {
    usedFallback = true;
    checkQuestion = buildDeterministicCheckQuestion(nodeTitle);
  }
  const diagram = buildDiagramFields(payload, raw);
  return {
    kind: 'learn_teach',
    teach: {
      headline: `Teach: ${nodeTitle}`,
      oneLiner: `Key idea: ${nodeTitle} in ${topic}.`,
      conceptBullets,
      examLines,
    },
    workedExample: { question, steps, finalAnswer },
    commonError,
    commonFix,
    checkQuestion,
    diagramRequired: diagram.diagramRequired,
    diagramType: diagram.diagramType,
    diagramSpec: diagram.diagramSpec,
    diagramLabels: diagram.diagramLabels,
    fallback_used: usedFallback || raw?.fallback_used === true,
  };
}

function adaptMindmapToLearnTeachContract(raw, payload) {
  const topic = payload?.topicKey || payload?.chapter || payload?.topic || 'this topic';
  const nodeTitle =
    payload?.mindmapNodeTitle ||
    payload?.cardTitle ||
    payload?.cardName ||
    payload?.itemTitle ||
    topic;
  const tutor = raw?.tutor || {};
  let usedFallback = false;

  let conceptBullets = [];
  conceptBullets.push(...toStringArray(tutor?.bullets));
  if (tutor?.hint_ladder?.hint) conceptBullets.push(String(tutor.hint_ladder.hint));
  if (tutor?.next?.revision_hook) conceptBullets.push(`Revision hook: ${tutor.next.revision_hook}`);
  const boardSteps = Array.isArray(tutor?.board_steps_ms?.steps) ? tutor.board_steps_ms.steps : [];
  conceptBullets.push(...boardSteps.map((s) => s?.line).filter(Boolean).map((s) => String(s)));
  conceptBullets = conceptBullets.filter(Boolean);
  if (conceptBullets.length < 3) {
    usedFallback = true;
    conceptBullets = ensureMinArray(conceptBullets, 3, (i) => `Key point ${i + 1} for ${nodeTitle}.`);
  }

  let examLines = [];
  if (Array.isArray(tutor?.board_checks)) {
    examLines.push(...tutor.board_checks.map((c) => c?.line).filter(Boolean).map((s) => String(s)));
  }
  if (!examLines.length && Array.isArray(tutor?.exam_lines)) {
    examLines.push(...tutor.exam_lines.filter(Boolean).map((s) => String(s)));
  }
  if (examLines.length < 2) {
    usedFallback = true;
    examLines = ensureMinArray(examLines, 2, (i) => buildDeterministicExamLines(nodeTitle)[i] || `CBSE line ${i + 1}.`);
  }

  let question = String(tutor?.next?.micro_drill || '').trim();
  if (!question) {
    usedFallback = true;
    question = `Micro-drill: Write two correct steps with reasons for ${nodeTitle}.`;
  }
  let steps = boardSteps.map((s, idx) => ({
    text: String(s?.line || s?.text || `Step ${idx + 1}: Apply the criterion.`).trim(),
    marks: Number.isFinite(Number(s?.marks)) ? Number(s.marks) : 1,
  })).filter((s) => s.text);
  if (steps.length < 2) {
    usedFallback = true;
    steps = ensureMinArray(steps, 2, (i) => ({ text: `Step ${i + 1}: Apply the criterion with order.`, marks: 1 }));
  }
  let finalAnswer = String(tutor?.board_steps_ms?.finalAnswer || tutor?.mini_example?.answer || '').trim();
  if (!finalAnswer) {
    usedFallback = true;
    finalAnswer = `Therefore, ${nodeTitle} is established.`;
  }
  let commonError = String(tutor?.diagnosis?.misconception_summary || '').trim();
  if (!commonError && Array.isArray(tutor?.diagnosis?.mistake_tags) && tutor.diagnosis.mistake_tags.length) {
    commonError = `Mistake tags: ${tutor.diagnosis.mistake_tags.join(', ')}`;
  }
  if (!commonError) {
    usedFallback = true;
    commonError = 'Mixing correspondence order or applying a theorem without conditions.';
  }
  let commonFix = String(tutor?.next?.micro_drill || tutor?.next?.revision_hook || '').trim();
  if (!commonFix) {
    usedFallback = true;
    commonFix = 'State the criterion, then write the matching ratio/angle relation before concluding.';
  }
  let checkQuestion = String(tutor?.socratic?.question || '').trim();
  if (!checkQuestion) {
    usedFallback = true;
    checkQuestion = buildDeterministicCheckQuestion(nodeTitle);
  }

  const diagram = buildDiagramFields(payload, raw);
  return {
    kind: 'learn_teach',
    teach: {
      headline: `Teach: ${nodeTitle}`,
      oneLiner: `Key idea: ${nodeTitle} in ${topic}.`,
      conceptBullets,
      examLines,
    },
    workedExample: { question, steps, finalAnswer },
    commonError,
    commonFix,
    checkQuestion,
    diagramRequired: diagram.diagramRequired,
    diagramType: diagram.diagramType,
    diagramSpec: diagram.diagramSpec,
    diagramLabels: diagram.diagramLabels,
    fallback_used: usedFallback || raw?.fallback_used === true,
  };
}

function coerceLearnTeachContractStructured(raw, payload) {
  if (!raw || typeof raw !== 'object') return { structured: raw, usedAdapter: false, usedFallback: false };
  let adapted = raw;
  let usedAdapter = false;
  let usedFallback = Boolean(raw.fallback_used);
  if (raw.kind === 'learn_mindmap' || raw.tutor) {
    adapted = adaptMindmapToLearnTeachContract(raw, payload);
    usedAdapter = true;
    usedFallback = Boolean(adapted.fallback_used);
  } else {
    const teach = raw.teach || {};
    if (raw.kind === 'learn_teach' && (Array.isArray(teach.simpleExplanation) || Array.isArray(raw.workedExamples))) {
      adapted = adaptLegacyLearnTeachToContract(raw, payload);
      usedAdapter = true;
      usedFallback = Boolean(adapted.fallback_used);
    }
  }
  const ensured = ensureTeachContractShape(adapted, payload);
  return {
    structured: ensured,
    usedAdapter,
    usedFallback: Boolean(ensured?.fallback_used) || usedFallback,
  };
}

function getLearnTeachContractSchemaText(payload) {
  const diagram = buildTeachDiagramObject(payload);
  return [
    '{',
    '  "kind": "learn_teach",',
    '  "teach": {',
    '    "goal": "string",',
    '    "keyIdeas": ["..."],',
    '    "diagram": {',
    `      "required": ${diagram.required ? 'true' : 'false'},`,
    `      "type": "${diagram.type}",`,
    `      "labels": ${JSON.stringify(diagram.labels)},`,
    `      "spec": ${JSON.stringify(diagram.spec)},`,
    '      "svg": null,',
    '      "altText": "string"',
    '    }',
    '  },',
    '  "checkpoint": {',
    '    "question": "string",',
    '    "answer": "string"',
    '  },',
    '  "commonMistake": "string"',
    '}',
  ].join('\n');
}

function buildLearnTeachContractPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const grade = payload.grade != null ? payload.grade : 10;
  const topicKey = payload.topicKey || payload.topic || payload.chapter || '';
  const nodeTitle = payload.mindmapNodeTitle || payload.cardTitle || payload.cardName || payload.itemTitle || '';
  const contextText = payload.contextText || payload.mindmapNodeText || payload.itemText || '';
  const diagram = buildTeachDiagramObject(payload);
  const example = {
    kind: 'learn_teach',
    teach: {
      goal: 'Teacher goal: Conclude similarity and state one correct proportionality in CBSE board-writing format.',
      keyIdeas: [
        'Definition: State the angle equalities used in this question.',
        'Criterion: Use AA similarity with the criterion name written explicitly.',
        'Correspondence: Write vertex order before ratio/equality statements.',
        'Conclusion: Therefore/Hence conclude the required proportionality.',
      ],
      diagram: {
        required: diagram.required,
        type: diagram.type,
        labels: diagram.labels,
        spec: diagram.spec,
        altText: diagram.altText,
      },
    },
    checkpoint: {
      question: 'Board checkpoint: Write Given, To Prove, and the criterion when two angles are equal.',
      answer:
        'Expected answer: Given: two corresponding angles are equal. To Prove: triangles are similar. Criterion/Theorem: AA similarity. Therefore/Hence: triangles are similar in correct correspondence order.',
    },
    commonMistake: 'Common mistake: mixing correspondence order of vertices before CPST. This can lose marks in CBSE board checking.',
  };
  return [
    `You are a strict CBSE Class ${grade} ${subject} teacher for the Teach tab.`,
    topicKey ? `Topic: ${topicKey}.` : '',
    nodeTitle ? `Node: ${nodeTitle}.` : '',
    contextText ? `Context: ${contextText}` : '',
    '',
    'OUTPUT FORMAT (STRICT): Return ONLY valid JSON. No markdown. No extra keys.',
    'Schema (LearnTeachContract):',
    getLearnTeachContractSchemaText(payload),
    '',
    'RULES:',
    '- Deterministic teacher voice: teach.goal must start with "Teacher goal:".',
    '- teach.keyIdeas must have exactly 4 micro-steps in order.',
    '- teach.keyIdeas line 1 starts "Definition:", line 2 "Criterion:", line 3 "Correspondence:", line 4 "Conclusion:".',
    '- Keep NCERT/CBSE wording; avoid coaching shortcuts unless explicitly marked as shortcut.',
    '- The lesson flow must mirror: Concept -> Intuition -> Worked Step -> Board-style question.',
    '- Include at least one board-writing phrase in key ideas (Given, To Prove, Therefore, Hence).',
    '- teach.diagram must be present with required/type/labels/spec/altText.',
    '- checkpoint.question and checkpoint.answer must be non-empty.',
    '- checkpoint.question must be board-style and answerable in 2-4 lines.',
    '- checkpoint.question must explicitly ask for Given and To Prove format.',
    '- checkpoint.answer must start with "Expected answer:" and include Given:, To Prove:, Criterion/Theorem:, and Therefore/Hence:.',
    '- checkpoint.answer should guide expected method, not dump full solution.',
    '- commonMistake must be non-empty.',
    '- commonMistake should mention a likely marking deduction risk.',
    '',
    'EXAMPLE (compact, valid):',
    JSON.stringify(example),
  ]
    .filter(Boolean)
    .join('\n');
}

function validateLearnProof(obj) {
  const issues = [];
  if (!obj || typeof obj !== 'object') return { ok: false, issues: ['Missing JSON object.'] };
  if (obj.kind !== 'learn_proof') issues.push('kind must be learn_proof.');

  const given = Array.isArray(obj.given) ? obj.given : [];
  const toProve = Array.isArray(obj.toProve) ? obj.toProve : [];
  const construction = Array.isArray(obj.construction) ? obj.construction : null;
  const proofSteps = Array.isArray(obj.proofSteps) ? obj.proofSteps : [];
  const conclusion = Array.isArray(obj.conclusion) ? obj.conclusion : [];
  if (!given.length) issues.push('given missing.');
  if (!toProve.length) issues.push('toProve missing.');
  if (!construction) issues.push('construction must be present (can be empty).');
  if (!proofSteps.length) issues.push('proofSteps missing.');
  if (!conclusion.length) issues.push('conclusion missing.');

  const total = Number(obj.totalMarks);
  const sum = proofSteps.reduce((acc, s) => acc + (Number(s?.mark) || 0), 0);
  if (!Number.isFinite(total)) issues.push('totalMarks missing.');
  if (Number.isFinite(total) && Math.abs(total - sum) > 0.001) {
    issues.push('totalMarks != sum of proofSteps marks.');
  }

  if (!String(obj.diagramType || '').trim()) issues.push('diagramType missing.');
  if (!obj.diagramLabels || typeof obj.diagramLabels !== 'object') issues.push('diagramLabels missing.');

  const blob = JSON.stringify(obj || {});
  if (containsPlaceholderLanguage(blob)) {
    issues.push('Placeholder language detected.');
  }

  return { ok: issues.length === 0, issues };
}

function validateStructuredForMode(obj, mode, payload, opts) {
  const issues = [];
  if (mode === 'solve_with_me') {
    if (!isValidMentorProtocol(obj, mode)) issues.push('Invalid solve_with_me protocol.');
    if (isProofWritingPayload(payload)) {
      const isFirstTurn = Boolean(opts && opts.isFirstTurn);
      const proofCheck = validateProofSolveWithMe(obj, payload, isFirstTurn);
      if (!proofCheck.ok) issues.push(...proofCheck.issues);
    }
    if (obj && obj.attempt_loop) {
      const loopCheck = validateAttemptLoop(obj.attempt_loop);
      if (!loopCheck.ok) issues.push(...loopCheck.issues);
    }
  } else if (mode === 'board_steps_ms') {
    if (!isValidMentorProtocol(obj, mode)) issues.push('Invalid board_steps_ms protocol.');
    if (obj && obj.attempt_loop) {
      const loopCheck = validateAttemptLoop(obj.attempt_loop);
      if (!loopCheck.ok) issues.push(...loopCheck.issues);
    }
  } else if (mode === 'learn_teach' && isTeachContractRequest(payload, mode)) {
    const check = validateLearnTeachContract(obj, payload);
    if (!check.ok) issues.push(...check.issues);
  } else if (mode === 'learn_teach' || mode === 'learn_mindmap' || mode === 'learn_proof') {
    const check = validateTutorStructured(mode, obj, payload);
    if (!check.ok) issues.push(...check.issues);
  }
  return { ok: issues.length === 0, issues };
}

function buildRepairPromptForMode(mode, payload, invalidOutput, issues) {
  const issueText = Array.isArray(issues) && issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- Format issues detected.';
  const schema = getJsonSchemaTextForMode(mode, payload);
  return [
    'You returned invalid or incomplete JSON for the required schema.',
    issueText,
    '',
    'Return ONLY valid JSON. No extra keys. No markdown.',
    'JSON schema:',
    schema,
    '',
    'Invalid output (may be truncated):',
    invalidOutput,
    '',
    'Return the corrected JSON ONLY.',
  ].join('\n');
}

function buildProofFallbackBoardSteps(payload) {
  const marks = Number(payload?.marks ?? payload?.totalMarks ?? payload?.total_marks) || 3;
  const perStep = Math.round((marks / 5) * 10) / 10;
  const lastStep = Number((marks - perStep * 4).toFixed(1));
  return {
    kind: 'board_steps_ms',
    totalMarks: marks,
    steps: [
      { text: 'Given: (Use the question data).', marks: perStep, whyThisGetsMarks: 'Restates given data.', commonMistake: 'Skipping the given.' },
      { text: 'To Prove: (Write the exact statement).', marks: perStep, whyThisGetsMarks: 'States the target result.', commonMistake: 'Changing the statement.' },
      { text: 'Construction: Not required.', marks: perStep, whyThisGetsMarks: 'Clarifies construction.', commonMistake: 'Missing construction note.' },
      { text: 'Proof: (Use the correct theorem/criterion with reasons).', marks: perStep, whyThisGetsMarks: 'Shows justified reasoning.', commonMistake: 'No reasons for steps.' },
      { text: 'Conclusion: Hence proved as required.', marks: lastStep, whyThisGetsMarks: 'Closes the proof.', commonMistake: 'No conclusion line.' },
    ],
    finalAnswer: 'Use the structured proof above; retry for a full solution.',
    warnings: ['Proof format fallback used. Retry if you need a full worked proof.', 'Schema fallback response used.'],
    fallback_used: true,
  };
}

function buildProofFallbackSolveWithMe(payload) {
  return {
    kind: 'question',
    tutor:
      'Start with the Given and To Prove. What are the two triangles/segments involved, and what exactly must be proved?',
    answerFormat: 'Short sentence',
    fallback_used: true,
    fallback_note: 'Schema fallback was used for solve_with_me.',
  };
}

function getJsonSchemaTextForMode(mode, payload) {
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);

  if (mode === 'learn_teach' && isTeachContractRequest(payload, mode)) {
    return getLearnTeachContractSchemaText(payload);
  }

  if (mode === 'solve_with_me') {
    return [
      '{',
      '  "kind": "question" | "hint" | "final",',
      '  "tutor": "string",',
      '  "answerFormat": "string",',
      '  "mcq": { "A": "...", "B": "...", "C": "...", "D": "..." },',
      '  "finalAnswer": "string",',
      '  "boardWriteup": "string",',
      `  "diagramType": "${diagramType}",`,
      `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
      '}',
    ].join('\n');
  }

  if (mode === 'board_steps_ms') {
    return [
      '{',
      '  "kind": "board_steps_ms",',
      '  "totalMarks": number,',
      '  "steps": [ { "text": "string", "marks": number, "whyThisGetsMarks": "string", "commonMistake": "string" } ],',
      '  "finalAnswer": "string",',
      '  "warnings": ["string"],',
      `  "diagramType": "${diagramType}",`,
      `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
      '}',
    ].join('\n');
  }

  if (mode === 'learn_teach') {
    return [
      '{',
      '  "kind": "learn_teach",',
      '  "teach": { "simpleExplanation": ["..."], "cbseExamSentence": ["..."] },',
      '  "workedExamples": [ { "title": "...", "question": "...", "steps": [ { "text": "...", "marks": number } ], "totalMarks": number, "finalAnswer": "..." } ],',
      '  "commonMistakes": ["..."],',
      '  "checkQuestion": "...",',
      `  "diagramType": "${diagramType}",`,
      `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
      '}',
    ].join('\n');
  }

  if (mode === 'learn_proof') {
    return [
      '{',
      '  "kind": "learn_proof",',
      '  "given": ["..."],',
      '  "toProve": ["..."],',
      '  "construction": ["..."],',
      '  "proofSteps": [ { "statement": "...", "reason": "...", "mark": number } ],',
      '  "conclusion": ["..."],',
      '  "totalMarks": number,',
      `  "diagramType": "${diagramType}",`,
      `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
      '}',
    ].join('\n');
  }

  if (mode === 'learn_mindmap') {
    return [
      '{',
      '  "kind": "learn_mindmap",',
      '  "conceptBullets": ["..."],',
      '  "examLines": ["..."],',
      '  "workedExample": { "question": "...", "steps": ["..."], "finalAnswer": "..." },',
      '  "commonError": "...",',
      '  "checkQuestion": "...",',
      `  "diagramType": "${diagramType}",`,
      `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
      '}',
    ].join('\n');
  }

  return '';
}

function buildProofRepairPrompt(mode, payload, issues) {
  const issueText = Array.isArray(issues) && issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- Format issues detected.';
  const addendum = buildProofWritingAddendum(payload, mode);
  return [
    'Your proof-writing output violated required constraints.',
    issueText,
    '',
    'Rewrite to satisfy ALL constraints and the exact JSON protocol. Do not add extra text.',
    '',
    addendum,
    '',
    'Return ONLY valid JSON (no markdown).',
  ].join('\n');
}

function buildTrianglesEvaluationPrompt(payload, studentAttempt) {
  const subject = payload.subject || 'Maths/Science';
  const grade = payload.grade != null ? payload.grade : 10;
  const questionText = payload.questionText || payload.question || payload.prompt || '';
  const marks = Number(payload.marks) || undefined;
  const maxLines = getProofMaxLines(marks);
  return [
    `You are a strict but encouraging CBSE Class ${grade} ${subject} examiner.`,
    'Task: Evaluate the student answer ONLY (no teaching, no solution).',
    'Scope: Triangles marking scheme evaluation and concise feedback.',
    '',
    'Use this marking-scheme checklist (weight it and scale to the question marks):',
    '- Given + To Prove stated.',
    '- Diagram mentioned if needed.',
    '- Correct theorem/criterion named (AA/SSS/SAS/BPT/Pythagoras).',
    '- Reasons for each step.',
    '- Correct ratio/equation and simplification.',
    '- Criterion applicability stated.',
    '- Algebra/working shown if needed.',
    '- CPST or consequence applied after similarity.',
    '- Clear conclusion matching the To Prove.',
    '- Avoid common traps (wrong ratio, missing square, non-right Pythagoras).',
    '',
    'Rubric constraints:',
    '- Respect structure, correctness, sequence, and language discipline.',
    `- If answer is longer than ${maxLines} lines, deduct for length overrun.`,
    '- Penalize for banned phrases: Obviously, Clearly, I think, We can see, Just, Probably, Sort of, In my opinion.',
    '',
    'Penalty triggers (apply only to impacted parts, do NOT cascade):',
    '- Missing Given/To Prove.',
    '- Wrong theorem/criterion.',
    '- Invalid conclusion.',
    '',
    'Output rules:',
    '- Return ONLY JSON (no markdown).',
    '- Use kind "final" only.',
    '- Do NOT reveal the correct solution or steps.',
    '- Do NOT output Given/To Prove/Proof headings with colons.',
    '- Keep feedback concise (max 10-12 short lines).',
    '',
    'Required JSON schema:',
    '{',
    '  "kind": "final",',
    '  "tutor": "Examiner feedback with Score, Breakdown, Marks gained, Marks lost, and 1 gentle next-step line.",',
    '  "finalAnswer": "Score: x/y"',
    '}',
    '',
    'QUESTION:',
    String(questionText || '').trim(),
    '',
    'STUDENT ANSWER:',
    String(studentAttempt || '').trim(),
    '',
    marks ? `MARKS: ${marks}` : 'MARKS: UNKNOWN',
  ].filter(Boolean).join('\n');
}

function validateTrianglesEvaluation(obj) {
  const issues = [];
  if (!obj || typeof obj !== 'object') return { ok: false, issues: ['Missing JSON object.'] };
  if (obj.kind !== 'final') issues.push('Evaluation must return kind=final.');
  if (obj.mcq) issues.push('MCQ must not be present.');
  if (obj.boardWriteup) issues.push('Board write-up must not be present.');
  const tutor = String(obj.tutor || '');
  if (!tutor) issues.push('Missing tutor feedback.');
  if (containsDisallowedProofPhrases(tutor)) issues.push('Feedback contains banned phrases.');
  if (containsProofHeadings(tutor)) issues.push('Feedback contains proof headings.');
  if (!/Score\s*:/i.test(tutor)) issues.push('Feedback must include Score.');
  if (!/Breakdown\s*:/i.test(tutor)) issues.push('Feedback must include Breakdown.');
  if (!/Marks gained\s*:/i.test(tutor)) issues.push('Feedback must include Marks gained.');
  if (!/Marks lost\s*:/i.test(tutor)) issues.push('Feedback must include Marks lost.');
  const lines = tutor.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 12) issues.push('Feedback too long.');
  const finalAnswer = String(obj.finalAnswer || '');
  if (finalAnswer && !/^Score\s*:/i.test(finalAnswer)) issues.push('finalAnswer must be Score only.');
  return { ok: issues.length === 0, issues };
}

function buildTrianglesEvaluationRepairPrompt(payload, issues) {
  const issueText = Array.isArray(issues) && issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- Format issues detected.';
  return [
    'Your evaluation output violated the constraints.',
    issueText,
    '',
    'Rewrite the evaluation following the same rules. Do NOT include solutions or proof headings.',
    'Return ONLY the required JSON schema.',
  ].join('\n');
}

function buildTrianglesEvaluationFallback(payload) {
  const marks = Number(payload?.marks ?? payload?.totalMarks ?? payload?.total_marks) || 5;
  return {
    kind: 'final',
    tutor:
      'Score: 0/' +
      marks +
      '\nBreakdown: Unable to evaluate reliably from the attempt provided.\nMarks gained: None assessed.\nMarks lost: Format mismatch or missing attempt.\nNext step: Rewrite with clear structure and ask again for checking.',
    finalAnswer: `Score: 0/${marks}`,
  };
}

function hasMindmapTeachSections(text) {
  const t = String(text || '');
  return (
    t.includes('1) Concept') &&
    t.includes('2) Exam-writing sentence') &&
    t.includes('3) Solved mini-example') &&
    t.includes('4) Common exam error') &&
    t.includes('5) Check-for-understanding question') &&
    !containsPlaceholderLanguage(t)
  );
}

function containsPlaceholderLanguage(text) {
  const t = String(text || '').toLowerCase();
  const patterns = [
    'here is a short',
    'placeholder',
    'lorem ipsum',
    'to be added',
    'fill in',
    'tbd',
    'example here',
  ];
  return patterns.some((p) => t.includes(p));
}

function fallbackMindmapTeachResponse(payload) {
  const nodeTitle = payload && (payload.mindmapNodeTitle || payload.itemTitle) ? String(payload.mindmapNodeTitle || payload.itemTitle) : 'this node';
  const diagramLine = shouldRequireDiagram(payload) ? diagramLineForExplain(payload) : '';
  return [
    '1) Concept',
    `Here is a short, teacher-style explanation of ${nodeTitle}.`,
    '2) Exam-writing sentence',
    'Write one clear CBSE line stating the concept using triangle labels.',
    '3) Solved mini-example',
    'In triangle ABC and triangle PQR, set up the correct relation and solve one step.',
    diagramLine ? diagramLine : '',
    '4) Common exam error',
    'Do not mix vertex order or apply a theorem without its conditions.',
    '5) Check-for-understanding question',
    'Which condition must be verified before using this idea?',
  ].join('\n');
}

function hasCompetencySections(text) {
  const t = String(text || '');
  return (
    t.includes('1) Competency definition') &&
    t.includes('2) How to detect in questions') &&
    t.includes('3) One worked mini-example') &&
    t.includes('4) Practice prompts') &&
    t.includes('5) Expected answer format')
  );
}

function fallbackCompetencyResponse(payload) {
  const topic = payload && (payload.topic || payload.topicKey) ? String(payload.topic || payload.topicKey) : 'the topic';
  const diagramLine = shouldRequireDiagram(payload) ? diagramLineForExplain(payload) : '';
  return [
    '1) Competency definition',
    `Explain the NCERT competency in ${topic} using one clear line.`,
    '2) How to detect in questions',
    'Look for keywords, given ratios/angles, and the target to prove or compute.',
    '3) One worked mini-example',
    'In triangle ABC, if ∠A = ∠P and ∠B = ∠Q, conclude similarity and state the reason.',
    diagramLine ? diagramLine : '',
    '4) Practice prompts (Easy / Medium / Hard)',
    'Easy: Identify the similarity criterion from given angles.',
    'Medium: Use BPT to find a missing length in a triangle.',
    'Hard: Relate side ratios to area ratios for similar triangles.',
    '5) Expected answer format',
    'Write the theorem name, one key relation, and a final conclusion in one line.',
  ].join('\n');
}

function sanitizeExplainOutput(raw) {
  const text = String(raw || '');
  const noFences = text.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '');
  const lines = noFences.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const l = line.trim().toLowerCase();
    if (!l) return false;
    if (l.includes('system') && l.includes('instruction')) return false;
    if (l.startsWith('system:')) return false;
    if (l.startsWith('instruction:')) return false;
    if (l.includes('return only')) return false;
    if (l.includes('do not output')) return false;
    if (l.includes('output json')) return false;
    if (l.includes('markdown')) return false;
    if (l.includes('protocol')) return false;
    if (l.includes('developer message')) return false;
    return true;
  });
  return filtered.join('\n').trim();
}

function hasMisconceptionSections(text) {
  const t = String(text || '');
  return (
    t.includes('1) Misconception') &&
    t.includes("2) Why it's wrong") &&
    t.includes('3) Correct CBSE rule/theorem') &&
    t.includes('4) Micro-example') &&
    t.includes('5) Exam tip')
  );
}

function fallbackMisconceptionResponse(payload) {
  const topic = payload && (payload.topic || payload.topicKey) ? String(payload.topic || payload.topicKey) : 'the topic';
  const diagramLine = shouldRequireDiagram(payload) ? diagramLineForExplain(payload) : '';
  return [
    '1) Misconception',
    `Students often mix up the key idea in ${topic}. Try again for a clean explanation.`,
    "2) Why it's wrong",
    'The mistaken step breaks the CBSE rule and leads to a wrong conclusion.',
    '3) Correct CBSE rule/theorem',
    'State the correct theorem or rule and use it exactly as given in NCERT.',
    '4) Micro-example',
    'In triangle ABC and triangle PQR, match corresponding angles before writing similarity.',
    diagramLine ? diagramLine : '',
    '5) Exam tip',
    'Write the theorem name + one correct line of reasoning to secure method marks.',
  ].join('\n');
}

/**
 * Build a user prompt for coach/mindset mode.
 * @param {any} payload
 */
function buildCoachUserPrompt(payload) {
  const daysLeft = payload.daysLeft != null ? payload.daysLeft : 60;
  const subject = payload.subject || 'Maths & Science';
  const hours =
    typeof payload.hoursPerDay === 'number'
      ? payload.hoursPerDay
      : payload.hoursPerDay && typeof payload.hoursPerDay.total === 'number'
      ? payload.hoursPerDay.total
      : 2;

  return [
    `Act as a supportive CBSE Class 10 exam coach for ${subject}.`,
    `The student has about ${daysLeft} days left to exams and can study ~${hours} hours per day.`,
    'Give concrete time-management tips, mindset advice, and how to handle stress during prep and on exam day.',
  ].join(' ');
}



/**
 * Convert app chat messages to Gemini "contents" format.
 * @param {{role:'user'|'assistant', content:string}[]} messages
 */
function toGeminiContents(messages) {
  const out = [];
  if (!Array.isArray(messages)) return out;
  for (const m of messages) {
    if (!m || !m.role) continue;
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = typeof m.content === 'string' ? m.content : '';
    if (!text.trim()) continue;
    out.push({ role, parts: [{ text }] });
  }
  return out;
}

/**
 * Build Solve With Me protocol instructions (strict JSON output).
 * @param {any} payload
 */
function buildSolveWithMeProtocolPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const grade = payload.grade != null ? payload.grade : 10;
  const topicKey = payload.topicKey || payload.topic || '';
  const questionText = payload.questionText || payload.question || payload.prompt || '';
  const proofAddendum = isProofWritingPayload(payload) ? buildProofWritingAddendum(payload, 'solve_with_me') : '';
  const seedContext = isTrianglesLearnPayload(payload) ? buildLearnSeedContext(payload, 'key-definitions') : '';
  const diagramRequired = shouldRequireDiagram(payload);
  const diagramType = diagramRequired ? inferDiagramType(payload) : '';
  const diagramLabels = diagramRequired ? diagramLabelsForType(diagramType) : null;
  const doubtContext = formatDoubtContext(payload);
  return [
    `You are LazyTopper AI Mentor running MODE B: "Solve With Me" for CBSE Class ${grade} ${subject}.`,
    topicKey ? `Chapter/Topic: ${topicKey}.` : '',
    buildMentorBehaviorContract(payload, 'solve_with_me'),
    buildMentorRuntimeRouteContext(payload),
    '',
    'STRICT TURN-BASED CONTRACT (locked):',
    '- You are the tutor. Ask ONE question at a time. Prefer MCQ with options A/B/C/D when possible.',
    '- NEVER write any fake student reply. Only tutor output.',
    '- Evaluate the student\'s last answer from the conversation history.',
    '- If wrong: give EXACTLY ONE short hint, then re-ask the SAME question (or a near-identical MCQ).',
    '- If correct: brief praise (1 short line), then advance to the next question.',
    '- End when the student reaches the final answer OR asks to reveal.',
    '',
    diagramRequired
      ? 'DIAGRAM REQUIREMENT (Triangles Learn):'
      : 'OPTIONAL DIAGRAM CONTRACT (for geometry/figures):',
    diagramRequired
      ? `- Include "diagramType": "${diagramType}" and "diagramLabels": ${JSON.stringify(diagramLabels)} in the SAME JSON.`
      : '- If a diagram would help, include these OPTIONAL fields in the SAME JSON you output:',
    diagramRequired
      ? '- The frontend will render a visual block from diagramType; no SVG/ASCII art.'
      : '  "diagram": { "type": "triangle", "templateId": "triangle-basic", "payload": { ... } }',
    diagramRequired ? '' : '  "anchors": [ { "id": "A", "kind": "point|side|angle", "target": "A|BC|∠ABC", "label": "..." } ]',
    diagramRequired ? '' : '  "diagramSteps": [ { "stepId": "s1", "highlightAnchorIds": ["A","BC"] } ]',
    diagramRequired ? '' : '- IMPORTANT: Do NOT output SVG/ASCII art. Output only the spec above; the frontend will render.',
    '',
    'OUTPUT FORMAT (IMPORTANT): Return ONLY valid JSON (no markdown, no backticks).',
    'Schema:',
    '{',
    '  "kind": "question" | "hint" | "final",',
    '  "tutor": "string (your single tutor message)",',
    '  "answerFormat": "A/B/C/D or short value guidance",',
    '  "mcq": { "A": "...", "B": "...", "C": "...", "D": "..." } (optional),',
    '  "finalAnswer": "string" (only when kind=final),',
    '  "boardWriteup": "string (CBSE board-style write-up)" (only when kind=final)',
    '}',
    '',
    proofAddendum ? `${proofAddendum}` : '',
    proofAddendum ? '' : '',
    doubtContext ? `${doubtContext}` : '',
    doubtContext ? '' : '',
    seedContext ? 'A-Prime seed (reference):' : '',
    seedContext ? seedContext : '',
    seedContext ? '' : '',
    'FIRST TURN: start by asking the first Socratic question for the problem below.',
    '',
    'PROBLEM:',
    String(questionText || '').trim(),
  ]
    .filter(Boolean)
    .join('\n');
}
/**
 * Build a user prompt for HPQ-anchored "more like this" questions.
 * @param {any} payload
 */
/**
 * Build Board Steps + Marking Scheme protocol instructions (strict JSON output).
 * Produces a full CBSE-style stepwise solution with marks-per-step, so the UI can reveal step-by-step.
 * @param {any} payload
 */
function buildBoardStepsMSPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const grade = payload.grade != null ? payload.grade : 10;
  const topicKey = payload.topicKey || payload.topic || '';
  const questionText = payload.questionText || payload.question || payload.prompt || '';
  const marks = Number(payload.marks) || undefined;
  const section = payload.section ? String(payload.section) : undefined;
  const proofAddendum = isProofWritingPayload(payload) ? buildProofWritingAddendum(payload, 'board_steps_ms') : '';
  const diagramRequired = shouldRequireDiagram(payload);
  const diagramType = diagramRequired ? inferDiagramType(payload) : '';
  const diagramLabels = diagramRequired ? diagramLabelsForType(diagramType) : null;
  const doubtContext = formatDoubtContext(payload);

  return [
    `You are a CBSE Board examiner + Gen-Z friendly tutor for Class ${grade} ${subject}.`,
    topicKey ? `Topic key: ${topicKey}.` : '',
    buildMentorBehaviorContract(payload, 'board_steps_ms'),
    buildMentorRuntimeRouteContext(payload),
    '',
    'TASK:',
    '- Create a CBSE marking-scheme style solution for the given question.',
    '- Use clear steps that would fetch marks in a board exam.',
    '- Assign marks per step so that the total equals the question marks.',
    '- Keep wording short and exam-like (no long essays).',
    '',
    'IF MARKS NOT PROVIDED:',
    '- Infer marks from section if possible (A=1, B=2, C=3, D=5, E=4). Otherwise choose the most reasonable marks based on the work required.',
    '',
    'OUTPUT FORMAT (IMPORTANT): Return ONLY valid JSON (no markdown, no backticks).',
    'CONCISENESS RULES (to avoid truncation):',
    '- Keep each step text short (ideally 1–2 lines).',
    '- Avoid long paragraphs; prefer bullet-style within a step if needed.',
    '- Aim for <= 14 steps for 1–5 marks, <= 20 steps for 6–10 marks, <= 28 steps for 11–20 marks.',
    '- Do NOT include any extra explanation outside the JSON.',
    'Schema:',
    '{',
    '  "kind": "board_steps_ms",',
    '  "totalMarks": number,',
    '  "steps": [',
    '    {',
    '      "text": "One exam step (what to write)",',
    '      "marks": number,',
    '      "whyThisGetsMarks": "1 line: what examiner awards marks for",',
    '      "commonMistake": "1 line: typical mistake that loses marks"',
    '    }',
    '  ],',
    '  "finalAnswer": "string",',
    diagramRequired ? `  "diagramType": "${diagramType}",` : '  // OPTIONAL (for geometry/figures):',
    diagramRequired ? `  "diagramLabels": ${JSON.stringify(diagramLabels)},` : '  "diagram": { "type": "triangle", "templateId": "triangle-basic", "payload": { ... } },',
    diagramRequired ? '' : '  "anchors": [ { "id": "A", "kind": "point|side|angle", "target": "A|BC|∠ABC", "label": "..." } ],',
    diagramRequired ? '' : '  "diagramSteps": [ { "stepId": "s1", "highlightAnchorIds": ["A","BC"] } ],',
    diagramRequired ? '  // IMPORTANT: No SVG. Frontend renders from diagramType.' : '  // IMPORTANT: No SVG. Frontend renders from the spec.',
    '  "warnings": ["optional short notes like \'draw diagram\' / \'units\'"]',
    '}',
    '',
      'RULES:',
      '- totalMarks MUST equal the sum of step.marks.',
      '- Keep steps minimal but complete for board marking.',
      diagramRequired ? '- Diagram is mandatory: include diagramType + diagramLabels.' : '- If a diagram is needed, add a warning in warnings.',
      '',
      proofAddendum ? `${proofAddendum}` : '',
      proofAddendum ? '' : '',
      doubtContext ? `${doubtContext}` : '',
      doubtContext ? '' : '',
      'QUESTION:',
      questionText,
      '',
      'METADATA:',
    marks ? `- marks=${marks}` : '- marks=UNKNOWN',
    section ? `- section=${section}` : '- section=UNKNOWN'
  ].filter(Boolean);
}

function getLearnSeedPack(payload) {
  return isTrianglesLearnPayload(payload) ? TRIANGLES_LEARN_SEED : null;
}

function buildLearnSeedContext(payload, sectionKey) {
  const seed = getLearnSeedPack(payload);
  if (!seed) return '';

  if (sectionKey === 'key-definitions') {
    const defs = seed.keyDefinitions;
    return [
      'A-Prime seed (key definitions):',
      `- Definitions: ${defs.simpleExplanation.join(' | ')}`,
      `- Exam lines: ${defs.cbseExamSentence.join(' | ')}`,
      `- Common mistakes: ${defs.commonMistakes.join(' | ')}`,
    ].join('\n');
  }

  if (sectionKey === 'proof') {
    const proof = seed.proof;
    return [
      'A-Prime seed (proof structure):',
      `- Given: ${proof.given.join(' ')}`,
      `- To Prove: ${proof.toProve.join(' ')}`,
      `- Steps: ${proof.proofSteps.map((s) => s.statement).join(' | ')}`,
      `- Conclusion: ${proof.conclusion.join(' ')}`,
    ].join('\n');
  }

  if (sectionKey === 'mindmap') {
    const nodeId = payload?.mindmapNodeId || payload?.itemId || 'gQ1';
    const node = seed.mindmapNodes[nodeId] || seed.mindmapNodes.gQ1;
    const commonFix = node.commonFix || 'Use the correct criterion and correspondence order.';
    return [
      'A-Prime seed (mindmap node):',
      `- Bullets: ${node.bullets.join(' | ')}`,
      `- Exam lines: ${node.examLines.join(' | ')}`,
      `- Common error: ${node.commonError}`,
      `- Common fix: ${commonFix}`,
      `- Check question: ${node.checkQuestion}`,
    ].join('\n');
  }

  return '';
}

function scaleMarks(steps, targetTotal) {
  if (!Array.isArray(steps)) return steps;
  if (!Number.isFinite(targetTotal) || targetTotal <= 0) return steps;
  const sum = steps.reduce((acc, s) => acc + (Number(s?.mark ?? s?.marks) || 0), 0);
  if (!sum) return steps;
  const factor = targetTotal / sum;
  return steps.map((s) => {
    const raw = (Number(s?.mark ?? s?.marks) || 0) * factor;
    const rounded = Math.round(raw * 2) / 2;
    if (s?.mark != null) return { ...s, mark: rounded };
    return { ...s, marks: rounded };
  });
}

function buildLearnTeachFallback(payload) {
  const seed = getLearnSeedPack(payload);
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);
  const hasMindmapContext =
    Boolean(payload?.mindmapNodeId || payload?.mindmapNodeTitle || payload?.mindmapNodeText) ||
    String(payload?.subSection || '').toLowerCase().includes('mindmap');
  if (!seed) {
    return ensureTeachContractShape({
      kind: 'learn_teach',
      teach: { simpleExplanation: ['Triangles are similar if corresponding angles are equal.'], cbseExamSentence: ['State the criterion used.'] },
      workedExamples: [],
      commonMistakes: ['Skipping correspondence order.'],
      checkQuestion: 'Which criterion applies here?',
      diagramType,
      diagramLabels,
      fallback_used: true,
    }, payload);
  }
  if (hasMindmapContext) {
    const nodeId = payload?.mindmapNodeId || payload?.itemId || 'gQ1';
    const node = seed.mindmapNodes[nodeId] || seed.mindmapNodes.gQ1;
    const steps = Array.isArray(node?.example?.steps) ? node.example.steps : ['State the criterion.', 'Write one matching ratio.'];
    const markedSteps = steps.map((s) => ({ text: s, marks: 1 }));
    const totalMarks = markedSteps.reduce((acc, s) => acc + (Number(s.marks) || 0), 0);
    const baseQuestion = node?.example?.question || 'State the criterion and write one ratio using CPST.';
    return ensureTeachContractShape({
      kind: 'learn_teach',
      teach: {
        simpleExplanation: node?.bullets || seed.keyDefinitions.simpleExplanation,
        cbseExamSentence: node?.examLines || seed.keyDefinitions.cbseExamSentence,
      },
      workedExamples: [
        {
          title: 'Basic example',
          question: baseQuestion,
          steps: markedSteps,
          totalMarks,
          finalAnswer: node?.example?.finalAnswer || 'Criterion stated and one correct ratio written.',
        },
        {
          title: 'Board-style example',
          question: baseQuestion,
          steps: markedSteps,
          totalMarks,
          finalAnswer: node?.example?.finalAnswer || 'Criterion stated and one correct ratio written.',
        },
      ],
      commonMistakes: [node?.commonError || 'Mixing correspondence order.'],
      checkQuestion: node?.checkQuestion || seed.keyDefinitions.checkQuestion,
      diagramType,
      diagramLabels,
      fallback_used: true,
    }, payload);
  }
  return ensureTeachContractShape({
    kind: 'learn_teach',
    teach: {
      simpleExplanation: seed.keyDefinitions.simpleExplanation,
      cbseExamSentence: seed.keyDefinitions.cbseExamSentence,
    },
    workedExamples: seed.keyDefinitions.workedExamples,
    commonMistakes: seed.keyDefinitions.commonMistakes,
    checkQuestion: seed.keyDefinitions.checkQuestion,
    diagramType: seed.keyDefinitions.diagramType || diagramType,
    diagramLabels: seed.keyDefinitions.diagramLabels || diagramLabels,
    fallback_used: true,
  }, payload);
}

function buildLearnProofFallback(payload) {
  const seed = getLearnSeedPack(payload);
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);
  if (!seed) {
    return {
      kind: 'learn_proof',
      given: ['Given: (use question data).'],
      toProve: ['To Prove: (state required result).'],
      construction: ['Not required.'],
      proofSteps: [
        { statement: 'State the theorem/criterion.', reason: 'Theorem', mark: 1 },
        { statement: 'Apply the theorem to the triangles.', reason: 'Application', mark: 1 },
      ],
      conclusion: ['Hence proved.'],
      totalMarks: 2,
      diagramType,
      diagramLabels,
      fallback_used: true,
    };
  }
  const marksRaw = payload?.marks ?? payload?.totalMarks ?? payload?.total_marks;
  const marks = Number(marksRaw);
  const steps = Number.isFinite(marks) ? scaleMarks(seed.proof.proofSteps, marks) : seed.proof.proofSteps;
  const totalMarks = Number.isFinite(marks) ? marks : seed.proof.totalMarks;
  return {
    kind: 'learn_proof',
    given: seed.proof.given,
    toProve: seed.proof.toProve,
    construction: seed.proof.construction,
    proofSteps: steps.map((s) => ({ statement: s.statement, reason: s.reason, mark: s.mark })),
    conclusion: seed.proof.conclusion,
    totalMarks,
    diagramType: seed.proof.diagramType || diagramType,
    diagramLabels: seed.proof.diagramLabels || diagramLabels,
    fallback_used: true,
  };
}

function buildLearnMindmapFallback(payload) {
  const seed = getLearnSeedPack(payload);
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);
  const nodeId = payload?.mindmapNodeId || payload?.itemId || 'gQ1';
  const node = seed?.mindmapNodes?.[nodeId] || seed?.mindmapNodes?.gQ1;
  return {
    kind: 'learn_mindmap',
    conceptBullets: node?.bullets || ['Use similarity criteria before CPST.'],
    examLines: node?.examLines || ['State the criterion and correspondence order.'],
    workedExample: node?.example || {
      question: 'Identify the criterion and write one ratio.',
      steps: ['State the criterion.', 'Write one CPST ratio.'],
      finalAnswer: 'Criterion stated and one ratio written.',
    },
    commonError: node?.commonError || 'Mixing correspondence order.',
    commonFix: node?.commonFix || 'Re-check correspondence order and the stated criterion.',
    checkQuestion: node?.checkQuestion || 'Which criterion applies here?',
    diagramType,
    diagramLabels,
    fallback_used: true,
  };
}

function buildLearnSolveWithMeFallback(payload) {
  const seed = getLearnSeedPack(payload);
  return {
    kind: 'question',
    tutor: seed?.solveWithMe?.question || 'Which two triangles are being compared?',
    answerFormat: seed?.solveWithMe?.answerFormat || 'Short sentence',
    diagramType: inferDiagramType(payload),
    diagramLabels: diagramLabelsForType(inferDiagramType(payload)),
    fallback_used: true,
  };
}

function buildStructuredFallback(mode, payload, opts = {}) {
  if (mode === 'board_steps_ms') return buildProofFallbackBoardSteps(payload);
  if (mode === 'solve_with_me') {
    return opts.learn ? buildLearnSolveWithMeFallback(payload) : buildProofFallbackSolveWithMe(payload);
  }
  if (mode === 'learn_teach' || mode === 'learn_mindmap' || mode === 'learn_proof') {
    return buildTutorFallback(mode, payload);
  }
  return null;
}

function buildLearnKeyDefinitionsPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const grade = payload.grade != null ? payload.grade : 10;
  const topicKey = payload.topicKey || payload.topic || '';
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);
  const nodeTitle = payload.mindmapNodeTitle || payload.itemTitle || '';
  const nodeText = payload.mindmapNodeText || payload.itemText || '';
  const hasMindmapContext = Boolean(nodeTitle || nodeText);
  const requiredList = hasMindmapContext
    ? [
        `Concept focus: ${nodeTitle || 'Mindmap node'}`,
        nodeText ? `Use this hint: ${nodeText}` : 'Use the provided mindmap node context.',
      ]
    : [
        'Similar triangles (definition)',
        'Corresponding sides/angles (definition + ordering)',
        'AA similarity (one line)',
        'SAS similarity (one line)',
        'SSS similarity (one line)',
        'CPST meaning (one line)',
      ];

  const seedContext = buildLearnSeedContext(payload, hasMindmapContext ? 'mindmap' : 'key-definitions');

  return [
    `You are a CBSE Class ${grade} ${subject} teacher for Learn tab (Board Examples).`,
    topicKey ? `Topic: ${topicKey}.` : '',
    nodeTitle ? `Node: ${nodeTitle}.` : '',
    nodeText ? `Node hint: ${nodeText}` : '',
    buildMentorBehaviorContract(payload, 'learn_teach'),
    buildMentorRuntimeRouteContext(payload),
    '',
    'TASK:',
    hasMindmapContext
      ? '- Teach the concept in the mindmap node with exam-first clarity.'
      : '- Teach the exact key definitions listed below with exam-first clarity.',
    '- Use simple, student-friendly language with CBSE exam lines.',
    '- Include two worked examples (one basic, one board-style).',
    '',
    hasMindmapContext ? 'MUST COVER (concept focus):' : 'MUST COVER (exact list):',
    ...requiredList.map((x) => `- ${x}`),
    '',
    'OUTPUT FORMAT (STRICT): Return ONLY valid JSON. No markdown. No extra keys.',
    'Schema:',
    '{',
    '  "kind": "learn_teach",',
    '  "teach": {',
    '    "simpleExplanation": ["..."],',
    '    "cbseExamSentence": ["..."]',
    '  },',
    '  "workedExamples": [',
    '    {',
    '      "title": "...",',
    '      "question": "...",',
    '      "steps": [ { "text": "...", "marks": number } ],',
    '      "totalMarks": number,',
    '      "finalAnswer": "..."',
    '    }',
    '  ],',
    '  "commonMistakes": ["..."],',
    '  "checkQuestion": "...",',
    `  "diagramType": "${diagramType}",`,
    `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
    '}',
    '',
    'RULES:',
    '- teach.simpleExplanation must have >= 4 bullets.',
    '- teach.cbseExamSentence must have >= 2 lines.',
    '- workedExamples must be exactly 2 items.',
    '- Each worked example must include steps, marks per step, totalMarks, and finalAnswer.',
    '- totalMarks must equal the sum of step marks.',
    '- commonMistakes must have >= 1 items.',
    '- checkQuestion must be a single question.',
    '- Diagram is required (use diagramType + diagramLabels as provided).',
    '- No MCQ prompts.',
    '- No placeholders or generic filler.',
    '',
    seedContext ? seedContext : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildLearnProofPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const grade = payload.grade != null ? payload.grade : 10;
  const topicKey = payload.topicKey || payload.topic || '';
  const questionText = payload.questionText || payload.question || payload.prompt || '';
  const marks = Number(payload.marks) || undefined;
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);
  const seedContext = buildLearnSeedContext(payload, 'proof');

  return [
    `You are a CBSE Class ${grade} ${subject} proof-writing mentor.`,
    topicKey ? `Topic: ${topicKey}.` : '',
    buildMentorBehaviorContract(payload, 'learn_proof'),
    buildMentorRuntimeRouteContext(payload),
    '',
    'TASK:',
    '- Write a full CBSE proof with Given / To Prove / Construction / Proof / Conclusion.',
    '- Use strict marking-scheme style steps with reasons.',
    '',
    'OUTPUT FORMAT (STRICT): Return ONLY valid JSON. No markdown. No extra keys.',
    'Schema:',
    '{',
    '  "kind": "learn_proof",',
    '  "given": ["..."],',
    '  "toProve": ["..."],',
    '  "construction": ["..."],',
    '  "proofSteps": [ { "statement": "...", "reason": "...", "mark": number } ],',
    '  "conclusion": ["..."],',
    '  "totalMarks": number,',
    `  "diagramType": "${diagramType}",`,
    `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
    '}',
    '',
    'RULES:',
    '- construction can be empty but must be present.',
    '- totalMarks must equal the sum of proofSteps.mark.',
    '- Diagram is required (use diagramType + diagramLabels as provided).',
    '- No placeholders or generic filler.',
    '',
    seedContext ? seedContext : '',
    '',
    'QUESTION:',
    questionText,
    '',
    marks ? `MARKS: ${marks}` : 'MARKS: UNKNOWN',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildLearnMindmapPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const grade = payload.grade != null ? payload.grade : 10;
  const topicKey = payload.topicKey || payload.topic || '';
  const nodeTitle = payload.mindmapNodeTitle || payload.itemTitle || 'Mindmap node';
  const nodeText = payload.mindmapNodeText || payload.itemText || '';
  const diagramType = inferDiagramType(payload);
  const diagramLabels = diagramLabelsForType(diagramType);
  const seedContext = buildLearnSeedContext(payload, 'mindmap');

  return [
    `You are a CBSE Class ${grade} ${subject} teacher for Learn tab (Mindmap).`,
    topicKey ? `Topic: ${topicKey}.` : '',
    `Node: ${nodeTitle}.`,
    nodeText ? `Node hint: ${nodeText}` : '',
    buildMentorBehaviorContract(payload, 'learn_mindmap'),
    buildMentorRuntimeRouteContext(payload),
    '',
    'OUTPUT FORMAT (STRICT): Return ONLY valid JSON. No markdown. No extra keys.',
    'Schema:',
    '{',
    '  "kind": "learn_mindmap",',
    '  "conceptBullets": ["..."],',
    '  "examLines": ["..."],',
    '  "workedExample": { "question": "...", "steps": ["..."], "finalAnswer": "..." },',
    '  "commonError": "...",',
    '  "commonFix": "...",',
    '  "checkQuestion": "...",',
    `  "diagramType": "${diagramType}",`,
    `  "diagramLabels": ${JSON.stringify(diagramLabels)}`,
    '}',
    '',
    'RULES:',
    '- conceptBullets must have >= 5 items.',
    '- examLines must have >= 2 items.',
    '- workedExample must include question, steps (>=1), and finalAnswer.',
    '- commonError and commonFix required.',
    '- checkQuestion required.',
    '- Diagram is required.',
    '- No placeholders or generic filler.',
    '',
    seedContext ? seedContext : '',
  ]
    .filter(Boolean)
    .join('\n');
}


function buildMoreLikeThisUserPrompt(payload) {
  const subject = payload.subject || 'Maths/Science';
  const topicKey = payload.topicKey || '';
  const seed = payload.seedQuestion || {};
  const seedText = seed.text || seed.questionText || '';
  const marks = seed.marks != null ? seed.marks : '';
  const difficulty = seed.difficulty || '';
  const bloom = seed.bloomSkill || '';
  const numVariantsRaw = payload.numVariants != null ? payload.numVariants : 3;
  const numVariants = Math.max(1, Math.min(10, Number(numVariantsRaw) || 3));

  const lines = [
    `We are building an exam-style practice set for CBSE Class 10 ${subject}.`,
    topicKey ? `Topic key (chapter) in our system: ${topicKey}.` : '',
    'You will receive a seed board-style question from our highly-probable-question (HPQ) bank.',
    'Generate NEW questions on exactly the same underlying concept, not random other concepts.',
    '',
    'Seed question:',
    seedText,
    '',
    `Metadata: marks=${marks || 'same as seed'}, difficulty=${difficulty || 'same band'}, bloomSkill=${bloom || 'same as seed'}.`,
    '',
    `Generate ${numVariants} new CBSE board-style questions that:`,
    '- Keep the same marks value as the seed (or as close as reasonable).',
    '- Stay in the same difficulty band (Easy/Medium/Hard) and Bloom level.',
    '- Change numbers, scenarios, or wording so they are not copies of the seed.',
    '',
    'Return ONLY a single JSON object with this exact shape:',
    '{',
    '  "questions": [',
    '    {',
    '      "questionText": "...",',
    '      "marks": <number>,',
    '      "difficulty": "Easy | Medium | Hard",',
    '      "bloomSkill": "Remembering | Understanding | Applying | Analysing | Evaluating | Creating"',
    '    }',
    '  ]',
    '}',
    '',
    'Do not include explanations, answers, or any text outside this JSON.',
  ];

  return { userPrompt: lines.join('\n'), numVariants };
}

/**
 * Call Gemini generateContent (REST).
 * Docs: https://ai.google.dev/api  (Gemini API) and models list: /v1beta/models
 * @param {string} model
 * @param {Array<{role?: string, parts?: Array<{text?: string}>}>} contents
 * @param {{temperature?: number, maxOutputTokens?: number}} [config]
 */
async function callGemini(model, finalContents, config) {
  if (!GEMINI_API_KEY) {
    throw new Error('API_KEY is not set or AI_PROVIDER is not "gemini". Set AI_PROVIDER=gemini and API_KEY in server/.env or environment.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const buildBody = (includeMimeType) => {
    const body = {
      contents: finalContents,
      generationConfig: {
        temperature: config && typeof config.temperature === 'number' ? config.temperature : 0.6,
        maxOutputTokens: config && typeof config.maxOutputTokens === 'number' ? config.maxOutputTokens : 900,
      },
    };
    if (
      includeMimeType &&
      config &&
      typeof config.responseMimeType === 'string' &&
      config.responseMimeType.trim()
    ) {
      body.generationConfig.responseMimeType = config.responseMimeType.trim();
    }
    return body;
  };

  const doRequest = async (includeMimeType) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(buildBody(includeMimeType)),
        signal: controller.signal,
      });
      const rawText = await response.text();
      return { response, rawText };
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const timeoutErr = new Error(`Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`);
        timeoutErr.status = 504;
        throw timeoutErr;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let { response, rawText } = await doRequest(true);
  if (
    !response.ok &&
    config &&
    typeof config.responseMimeType === 'string' &&
    config.responseMimeType.trim()
  ) {
    const retryMimeRegex = /responseMimeType|response_mime_type|Unknown name.*responseMimeType/i;
    if (retryMimeRegex.test(rawText)) {
      ({ response, rawText } = await doRequest(false));
    }
  }

  if (!response.ok) {
    const err = new Error(
      `Gemini request failed: ${response.status} ${response.statusText} - ${rawText}`
    );
    err.status = response.status;
    err.body = rawText;
    throw err;
  }

  const data = JSON.parse(rawText || '{}');

  // Typical response shape: candidates[0].content.parts[].text
  const parts =
    data &&
    data.candidates &&
    data.candidates[0] &&
    data.candidates[0].content &&
    Array.isArray(data.candidates[0].content.parts)
      ? data.candidates[0].content.parts
      : [];

  const text = parts
    .map((p) => (p && p.text ? String(p.text) : ''))
    .filter(Boolean)
    .join('\n')
    .trim();

  return { text, raw: data };
}

/**
 * Normalize request shapes:
 * - preferred: { mode, payload, persona? }
 * - legacy/flat: { mode, persona, subject, grade, topicKey, prompt/questionText/... }
 */
function normalizeMentorRequest(reqJson) {
  const mode = reqJson.mode;
  const persona = reqJson.persona || null;

  if (reqJson.payload && typeof reqJson.payload === 'object') {
    return { mode, persona, payload: reqJson.payload };
  }

  // Flat/legacy support
  const payload = {
    subject: reqJson.subject,
    grade: reqJson.grade,
    topicKey: reqJson.topicKey,
    topic: reqJson.topic,
    daysLeft: reqJson.daysLeft,
    targetPercent: reqJson.targetPercent,
    hoursPerDay: reqJson.hoursPerDay,
    extraNotes: reqJson.extraNotes,
    marks: reqJson.marks,
    questionText: reqJson.questionText || reqJson.question || reqJson.prompt || '',
    section: reqJson.section,
    subSection: reqJson.subSection,
    selectedTab: reqJson.selectedTab,
    solveStyle: reqJson.solveStyle,
    nodeId: reqJson.nodeId,
  };
  if (reqJson.imageBase64) payload.imageBase64 = reqJson.imageBase64;
  if (reqJson.imageMimeType) payload.imageMimeType = reqJson.imageMimeType;
  if (reqJson.imageName) payload.imageName = reqJson.imageName;

  return { mode, persona, payload };
}

/**
 * Main request handler.
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
async function handleRequest(req, res) {
  const reqUrlRaw = String(req.url || "");
  const reqPath = reqUrlRaw.split("?")[0];

  // CORS preflight
  if (
    req.method === 'OPTIONS' &&
    (
      reqPath === '/api/mentor' ||
      reqPath === '/api/more-like-this' ||
      reqPath === '/api/tutor-feedback' ||
      reqPath === '/api/session/start' ||
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

  // Health checks
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    return sendJson(res, 200, {
      ok: true,
      service: 'lazytopper-ai-server',
      provider: ACTIVE_PROVIDER,
      model: GEMINI_MODEL,
      modelZombie: GEMINI_MODEL_ZOMBIE || null,
      modelBeast: GEMINI_MODEL_BEAST || null,
      hasKey: Boolean(API_KEY),
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

  // Mentor endpoint
  if (req.method === 'POST' && req.url === '/api/mentor') {
    let reqJson;
    try {
      reqJson = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    const { mode, persona, payload } = normalizeMentorRequest(reqJson);
    const mentorImageCheck = validateMentorImagePayload(payload);
    const mentorImage =
      mentorImageCheck && mentorImageCheck.ok ? mentorImageCheck : null;
    if (!mentorImage && mentorImageCheck.error !== 'NO_IMAGE') {
      return sendJson(res, 400, {
        ok: false,
        error: `Invalid image: ${mentorImageCheck.error}`,
      });
    }
    const isMisconceptionExplain = isLearnMisconceptionPayload(payload);
    const isCompetencyExplain = isLearnCompetencyPayload(payload);
    const isTeachTab = isTeachTabPayload(payload);
    const isMindmapTeach = isLearnMindmapPayload(payload);
    const isProofWriting = isProofWritingPayload(payload);
    const isLearnKeyDefinitions = isLearnKeyDefinitionsPayload(payload);
    const solveStyle = String(payload?.solveStyle || '').toLowerCase();
    const isTrianglesEvaluation = isTrianglesEvaluationRequest(payload, reqJson?.messages);
    const trianglesAttempt = isTrianglesEvaluation
      ? extractStudentAttempt(payload, reqJson?.messages)
      : '';
    const trianglesFlag = isTrianglesBsreEnabled();
    const stubMode = isStubMode();
    const noProvider = stubMode;
    const shouldRunBsre = !stubMode && isTrianglesEvaluation && trianglesFlag && trianglesAttempt;
    if (shouldRunBsre) {
      const bsreRubricId = determineBsreRubricId(payload);
      console.info(`[BSRE_ENTRY] flag=true rubric=${bsreRubricId} no_provider=${noProvider}`);
      telemetry.increment('bsre_entry');
      if (noProvider) telemetry.increment('bsre_no_provider');
      let bsreStructured = null;
      try {
        bsreStructured = runBsreEvaluation(payload, trianglesAttempt, bsreRubricId);
      } catch (err) {
        telemetry.increment('bsre_eval_error');
        console.warn('[bsre] evaluation failed, falling back to Gemini:', err?.message || err);
      }
      if (bsreStructured) {
        const trace = {
          normalized_mode: 'triangles_evaluation',
          handler_used: 'triangles_bsre',
          schema_used: 'schema_triangles_bsre',
          repair_used: false,
        };
        let orchestrated = orchestrateTutorResponse({
          mode: 'triangles_evaluation',
          payload,
          messages: reqJson?.messages,
          structuredDraft: bsreStructured,
          trace,
        });
        orchestrated = attachTutorDiagramIntent(orchestrated, payload);
        return sendJson(res, 200, {
          ok: true,
          data: {
            text: JSON.stringify(orchestrated),
            structured: orchestrated,
            trace,
          },
        });
      }
    } else {
      console.info(`[LEGACY_ENTRY] flag=${trianglesFlag ? 'true' : 'false'} no_provider=${noProvider}`);
      telemetry.increment('legacy_entry');
    }

    if (!mode) return sendJson(res, 400, { error: 'Missing "mode" in request body' });

    let normalisedMode = normalizeIncomingMode(mode) || mode;
    if (isTeachTab) normalisedMode = 'learn_teach';
    else if (isMindmapTeach) normalisedMode = 'learn_mindmap';
    if (isMisconceptionExplain || isCompetencyExplain) normalisedMode = 'explain';
    if (isTrianglesEvaluation) {
      normalisedMode = 'solve_with_me';
    }
    if (isLearnKeyDefinitions && solveStyle === 'board') normalisedMode = 'learn_teach';
    if (isProofWriting && solveStyle === 'board') normalisedMode = 'learn_proof';

    let handlerUsed = persona && typeof persona === 'object' ? 'persona_prompt' : `prompt_builder:${normalisedMode}`;
    if (isTrianglesEvaluation) handlerUsed = 'triangles_evaluation';
    if (normalisedMode === 'grind_topic_v1') {
      const contract = buildGrindTopicContractFallback(payload);
      if (!contract) {
        return sendJson(res, 500, { error: 'Failed to prepare topic grind contract.' });
      }
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: 'topic_grind_contract',
        schema_used: 'schema_grind_topic_v1',
        repair_used: false,
        deterministic: true,
      };
      return sendJson(res, 200, {
        ok: true,
        data: {
          text: JSON.stringify(contract),
          structured: contract,
          trace,
        },
      });
    }

    if (stubMode) {
      const isTeachContract = isTeachContractRequest(payload, normalisedMode);
      let structured = isStructuredMode(normalisedMode)
        ? buildStubTutorStructured(normalisedMode, payload)
        : null;
      if (isTeachContract) {
        structured = buildLearnTeachFallback(payload);
      }
      if (structured) {
        if (isTeachContract) {
          const teachCheck = validateLearnTeachContract(structured, payload);
          if (!teachCheck.ok) structured = buildLearnTeachFallback(payload);
        } else if (
          normalisedMode === 'learn_teach' ||
          normalisedMode === 'learn_mindmap' ||
          normalisedMode === 'learn_proof'
        ) {
          const tutorCheck = validateTutorStructured(normalisedMode, structured, payload);
          if (!tutorCheck.ok) structured = buildTutorFallback(normalisedMode, payload);
        }
        structured = orchestrateTutorResponse({
          mode: normalisedMode,
          payload,
          messages: reqJson?.messages,
          structuredDraft: structured,
        });
        const stubAttemptText = extractStudentAttempt(payload, reqJson?.messages);
        if (stubAttemptText && isTrianglesTopic(payload)) {
          structured.attempt_loop = buildAttemptLoopHeuristic(payload, stubAttemptText);
        }
        structured = attachTutorDiagramIntent(structured, payload);
      }
      const text = structured ? JSON.stringify(structured) : buildStubText();
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: handlerUsed,
        schema_used: structured
          ? (isTeachContract ? 'schema_learn_teach_contract' : `schema_${normalisedMode}`)
          : 'text',
        repair_used: false,
        stub_used: true,
      };
      return sendJson(res, 200, {
        ok: true,
        data: {
          text,
          structured,
          trace,
        },
      });
    }

    // Build system prompt from persona (if provided as object)
    let systemPrompt = '';
    if (persona && typeof persona === 'object') {
      if (Array.isArray(persona.coreRules)) systemPrompt += persona.coreRules.join('\n') + '\n';
      if (Array.isArray(persona.modes)) {
        const cfg = persona.modes.find((m) => m && m.id === normalisedMode);
        if (cfg && cfg.systemPrompt) systemPrompt += cfg.systemPrompt;
      }
    }

    const isGrindContractMode =
      normalisedMode === 'grind_triangles_v1' || mode === 'grind_triangles_v1';
    if (isGrindContractMode) {
      systemPrompt = buildTrianglesGrindContractPrompt(payload);
      handlerUsed = 'triangles_grind_contract';
    }

    // Fallback defaults
    if (!systemPrompt) {
      switch (normalisedMode) {
        case 'plan':
          systemPrompt =
            'You are a CBSE Class 10 study planner. Create realistic, chapter-wise plans using the given context.';
          break;
        case 'solve':
          systemPrompt =
            'You are an expert CBSE Class 10 tutor. Use Socratic, step-by-step reasoning and end with a clear final answer.';
          break;
        case 'explain':
          systemPrompt =
            'You are a CBSE Class 10 concept explainer. Explain topics in simple steps, aligning with board exam style.';
          break;
        case 'learn_teach':
          systemPrompt =
            'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for key definitions.';
          break;
        case 'learn_mindmap':
          systemPrompt =
            'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for mindmap teaching.';
          break;
        case 'learn_proof':
          systemPrompt =
            'You are a strict CBSE Class 10 proof-writing teacher. Return only the required JSON schema.';
          break;
        case 'coach':
        case 'mindset':
          systemPrompt =
            'You are a supportive CBSE exam coach and mindset mentor. Provide practical strategies and encouragement.';
          break;
        default:
          systemPrompt = 'You are a helpful CBSE Class 10 tutor for Maths and Science.';
      }
    }
    if (isMisconceptionExplain) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for misconceptions.';
    } else if (isCompetencyExplain) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for competencies.';
    } else if (isTeachTabPayload(payload)) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Return only the LearnTeachContract JSON schema.';
    } else if (isMindmapTeach) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for mindmap node teaching.';
    } else if (isTrianglesEvaluation) {
      systemPrompt =
        'You are a strict but supportive CBSE Class 10 examiner. Provide concise marking feedback only.';
    }

    // Build user prompt
    let userPrompt = '';
    try {
      if (isTrianglesEvaluation) {
        const attempt = extractStudentAttempt(payload, reqJson?.messages);
        userPrompt = buildTrianglesEvaluationPrompt(payload, attempt);
      } else switch (normalisedMode) {
        case 'plan':
          userPrompt = buildPlanUserPrompt(payload);
          break;
        case 'solve':
          userPrompt = buildSolveUserPrompt(payload);
          break;
        case 'solve_with_me':
          userPrompt = buildSolveWithMeProtocolPrompt(payload);
          break;
        case 'board_steps_ms':
          userPrompt = buildBoardStepsMSPrompt(payload);
          break;
        case 'learn_teach':
          userPrompt = isTeachTabPayload(payload)
            ? buildLearnTeachContractPrompt(payload)
            : buildLearnKeyDefinitionsPrompt(payload);
          break;
        case 'learn_mindmap':
          userPrompt = buildLearnMindmapPrompt(payload);
          break;
        case 'learn_proof':
          userPrompt = buildLearnProofPrompt(payload);
          break;
        case 'explain':
          userPrompt = isMisconceptionExplain
            ? buildMisconceptionExplainPrompt(payload)
            : isCompetencyExplain
            ? buildCompetencyTeachPrompt(payload)
            : isMindmapTeach
            ? buildMindmapTeachPrompt(payload)
            : buildExplainUserPrompt(payload);
          break;
        case 'coach':
        case 'mindset':
          userPrompt = buildCoachUserPrompt(payload);
          break;
        case 'grind_triangles_v1':
          userPrompt = buildGrindTrianglesUserPrompt(payload);
          break;
        default:
          return sendJson(res, 400, { error: `Unsupported mode: ${mode}` });
      }
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid payload' });
    }

    // Gemini content format (multi-turn supported):
    // We keep the system prompt as a leading instruction message,
    // then replay prior chat history (if any), then append the latest user prompt.
    const history = toGeminiContents(reqJson && reqJson.messages);
    const contents = [
      { role: 'user', parts: [{ text: String(systemPrompt || '').trim() }] },
      ...history,
      { role: 'user', parts: [{ text: String(userPrompt || '').trim() }] },
    ].filter((c) => c && c.parts && c.parts[0] && String(c.parts[0].text || '').trim());

    if (noProvider) {
      console.info('[NO_PROVIDER_SKIP_PROVIDER]=1');
      telemetry.increment('provider_skipped');
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: handlerUsed,
        schema_used: 'text',
        repair_used: false,
        fallback_used: true,
      };
      return sendJson(res, 200, {
        ok: true,
        data: {
          text: JSON.stringify({
            message: 'LT_NO_PROVIDER guard active; deterministic response provided.',
            noProvider: true,
          }),
          structured: null,
          trace,
        },
      });
    }

    const isTeachContract = isTeachContractRequest(payload, normalisedMode);

    const buildMentorResponse = async () => {
      const marksRaw = payload && (payload.marks ?? payload.totalMarks ?? payload.total_marks);
      const marksNum = Number(marksRaw);
      const safeMarks = Number.isFinite(marksNum) && marksNum > 0 ? marksNum : 5;

      const maxOutputTokens =
        normalisedMode === 'board_steps_ms' || normalisedMode === 'learn_proof'
          ? Math.min(4096, Math.max(1600, 900 + Math.round(safeMarks * 180)))
          : normalisedMode === 'learn_teach'
            ? 1600
            : normalisedMode === 'solve_with_me'
              ? 1400
              : 900;
      const responseMimeType = isTeachContract ? 'application/json' : undefined;

      const requestParts = [{ text: `${systemPrompt}

${userPrompt}` }];
      if (mentorImage) {
        requestParts.push(
          buildGeminiImagePart({
            mimeType: mentorImage.mimeType,
            base64: mentorImage.base64,
          })
        );
      }
      const contents = [{ role: 'user', parts: requestParts }];

      const reply = await callGemini(GEMINI_MODEL, contents, {
        maxOutputTokens,
        temperature:
          normalisedMode === 'board_steps_ms' || normalisedMode === 'learn_proof'
            ? 0.2
            : normalisedMode === 'learn_teach'
              ? 0.25
              : 0.35,
        responseMimeType,
      });

      let finalText = reply.text;
      let structured = null;
      let repairUsed = false;
      let fallbackUsed = false;
      let jsonExtracted = false;
      const schemaUsedTrace = isStructuredMode(normalisedMode)
        ? (isTeachContract ? 'schema_learn_teach_contract' : `schema_${normalisedMode}`)
        : 'text';

      if (isStructuredMode(normalisedMode)) {
        const parseStructured = (text) =>
          isTeachContract ? extractJsonObjectFromText(text) : tryParseJsonStrict(text);
        structured = parseStructured(finalText);
        if (isTeachContract) {
          jsonExtracted = Boolean(structured) || jsonExtracted;
          if (!structured) {
            if (IS_DEV) {
              console.warn('[teach-contract] no JSON returned; triggering repair');
            }
            repairUsed = true;
            const strictRepairPrompt = [
              'Return ONLY VALID JSON object. No markdown. No prose. Output must start with { and end with }.',
              '',
              'You MUST follow this JSON schema exactly:',
              getLearnTeachContractSchemaText(),
            ].join('\n');
            const repairContents = [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\n${strictRepairPrompt}` }] },
            ];
            const repaired = await callGemini(GEMINI_MODEL, repairContents, {
              maxOutputTokens,
              temperature: 0.1,
              responseMimeType,
            });
            finalText = repaired.text;
            structured = parseStructured(finalText);
            jsonExtracted = Boolean(structured) || jsonExtracted;
            if (!structured) {
              if (IS_DEV) {
                console.warn(
                  '[teach-contract] fallback used because model did not return JSON'
                );
              }
              structured = buildLearnTeachFallback(payload);
              fallbackUsed = true;
            }
          }
        }
        const attemptText = extractStudentAttempt(payload, reqJson?.messages);
        const shouldAttachAttemptLoop = Boolean(attemptText) && isTrianglesTopic(payload);
        if (structured && shouldAttachAttemptLoop) {
          structured.attempt_loop = buildAttemptLoopHeuristic(payload, attemptText);
        }
        if (isTeachContract) {
          const coerced = coerceLearnTeachContractStructured(structured, payload);
          structured = coerced.structured;
          if (coerced.usedFallback) fallbackUsed = true;
        }
        const isFirstTurn =
          normalisedMode === 'solve_with_me' && Array.isArray(reqJson?.messages)
            ? reqJson.messages.length <= 1
            : false;
        let check = validateStructuredForMode(structured, normalisedMode, payload, { isFirstTurn });
        const isLearnStructured =
          normalisedMode === 'learn_teach' ||
          normalisedMode === 'learn_proof' ||
          normalisedMode === 'learn_mindmap' ||
          (normalisedMode === 'solve_with_me' && isTrianglesLearnPayload(payload));

        if (!check.ok) {
          if (isTeachContract && IS_DEV) {
            console.warn(
              `[teach-contract] validation failed before repair: ${summarizeValidationIssues(check.issues)}`
            );
          }
          repairUsed = true;
          const clipped = String(finalText || '').slice(0, 8000);
          const repairPrompt = buildRepairPromptForMode(normalisedMode, payload, clipped, check.issues);
          const repairContents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
          ];
          const repaired = await callGemini(GEMINI_MODEL, repairContents, {
            maxOutputTokens,
            temperature: 0.2,
            responseMimeType,
          });
          finalText = repaired.text;
          structured = parseStructured(finalText);
          if (isTeachContract) {
            jsonExtracted = Boolean(structured) || jsonExtracted;
          }
          if (isTeachContract) {
            const coerced = coerceLearnTeachContractStructured(structured, payload);
            structured = coerced.structured;
            if (coerced.usedFallback) fallbackUsed = true;
          }
          check = validateStructuredForMode(structured, normalisedMode, payload, { isFirstTurn });
        }

        if (!check.ok && isLearnStructured && !isTeachContract) {
          repairUsed = true;
          const strictPrompt = buildRepairPromptForMode(
            normalisedMode,
            payload,
            String(finalText || '').slice(0, 8000),
            check.issues
          );
          const strictContents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${strictPrompt}` }] },
          ];
          const strictReply = await callGemini(GEMINI_MODEL, strictContents, {
            maxOutputTokens,
            temperature: 0.1,
            responseMimeType,
          });
          finalText = strictReply.text;
          structured = parseStructured(finalText);
          if (isTeachContract) {
            jsonExtracted = Boolean(structured) || jsonExtracted;
          }
          check = validateStructuredForMode(structured, normalisedMode, payload, { isFirstTurn });
        }

        if (!check.ok) {
          if (isTeachContract) {
            if (IS_DEV) {
              console.warn(
                `[teach-contract] fallback used after validation failure: ${summarizeValidationIssues(check.issues)}`
              );
            }
            structured = buildLearnTeachFallback(payload);
          } else if (isLearnStructured) {
            structured = buildStructuredFallback(normalisedMode, payload, { learn: true });
          } else {
            console.warn(
              `[mentor] schema mismatch (${normalisedMode}); falling back: ${summarizeValidationIssues(check.issues)}`
            );
            structured = buildStructuredFallback(normalisedMode, payload);
            if (!structured) {
              return {
                status: 422,
                body: { error: 'Mentor response did not match schema. Retry.' },
              };
            }
          }
          fallbackUsed = true;
          check = { ok: true, issues: [] };
        }

        if (isTrianglesEvaluation) {
          let evalCheck = validateTrianglesEvaluation(structured);
          if (!evalCheck.ok) {
            repairUsed = true;
            const repairPrompt = buildTrianglesEvaluationRepairPrompt(payload, evalCheck.issues);
            const repairContents = [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
            ];
            const repaired = await callGemini(GEMINI_MODEL, repairContents, {
              maxOutputTokens,
              temperature: 0.2,
              responseMimeType,
            });
            finalText = repaired.text;
            structured = parseStructured(finalText);
            evalCheck = validateTrianglesEvaluation(structured);
          }
          if (!evalCheck.ok) {
            structured = buildTrianglesEvaluationFallback(payload);
            fallbackUsed = true;
          }
        }

        if (normalisedMode === 'board_steps_ms') {
          structured = normalizeBoardSteps(structured);
          structured = ensureDiagramFields(structured, payload);
        }

        if (normalisedMode === 'solve_with_me') {
          structured = ensureDiagramFields(structured, payload);
        }

        if (structured) {
          if (
            normalisedMode === 'learn_teach' ||
            normalisedMode === 'learn_mindmap' ||
            normalisedMode === 'learn_proof'
          ) {
            if (!isTeachContract) {
              const tutorCheck = validateTutorStructured(normalisedMode, structured, payload);
              if (!tutorCheck.ok) {
                structured = buildTutorFallback(normalisedMode, payload);
                fallbackUsed = true;
              }
            }
          }
          structured = orchestrateTutorResponse({
            mode: normalisedMode,
            payload,
            messages: reqJson?.messages,
            structuredDraft: structured,
          });
          structured = attachTutorDiagramIntent(structured, payload);
        }

        finalText = JSON.stringify(structured);
      }

      if (isMisconceptionExplain) {
        finalText = sanitizeExplainOutput(finalText);
        if (!hasMisconceptionSections(finalText)) {
          const repairPrompt = [
            'Rewrite the answer using ONLY the five required sections, in order.',
            'Return plain text with the exact headings:',
            '1) Misconception',
            "2) Why it's wrong",
            '3) Correct CBSE rule/theorem',
            '4) Micro-example',
            '5) Exam tip',
            '',
            'Rules:',
            '- 1-3 short lines per section.',
            '- No questions, no JSON, no markdown.',
            '- No system or prompt references.',
          ].join('\n');

          const repairContents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
          ];
          const repaired = await callGemini(GEMINI_MODEL, repairContents, {
            maxOutputTokens: 700,
            temperature: 0.2,
          });
          finalText = sanitizeExplainOutput(repaired.text);
          if (!hasMisconceptionSections(finalText)) {
            finalText = fallbackMisconceptionResponse(payload);
          }
        }
        structured = null;
      } else if (isCompetencyExplain) {
        finalText = sanitizeExplainOutput(finalText);
        if (!hasCompetencySections(finalText)) {
          const repairPrompt = [
            'Rewrite the answer using ONLY the five required sections, in order.',
            'Return plain text with the exact headings:',
            '1) Competency definition',
            '2) How to detect in questions',
            '3) One worked mini-example',
            '4) Practice prompts (Easy / Medium / Hard)',
            '5) Expected answer format',
            '',
            'Rules:',
            '- 1-3 short lines per section.',
            '- No questions, no JSON, no markdown.',
            '- No system or prompt references.',
          ].join('\n');

          const repairContents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
          ];
          const repaired = await callGemini(GEMINI_MODEL, repairContents, {
            maxOutputTokens: 700,
            temperature: 0.2,
          });
          finalText = sanitizeExplainOutput(repaired.text);
          if (!hasCompetencySections(finalText)) {
            finalText = fallbackCompetencyResponse(payload);
          }
        }
        structured = null;
      } else if (isMindmapTeach && normalisedMode === 'explain') {
        finalText = sanitizeExplainOutput(finalText);
        if (!hasMindmapTeachSections(finalText)) {
          const repairPrompt = [
            'Rewrite the answer using ONLY the five required sections, in order.',
            'Return plain text with the exact headings:',
            '1) Concept',
            '2) Exam-writing sentence',
            '3) Solved mini-example',
            '4) Common exam error',
            '5) Check-for-understanding question',
            '',
            'Rules:',
            '- 1-2 short lines per section.',
            '- Exactly one mini-example and one check question.',
            '- No JSON, no markdown, no extra headings.',
            '- No system or prompt references.',
          ].join('\n');

          const repairContents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
          ];
          const repaired = await callGemini(GEMINI_MODEL, repairContents, {
            maxOutputTokens: 650,
            temperature: 0.2,
          });
          finalText = sanitizeExplainOutput(repaired.text);
          if (!hasMindmapTeachSections(finalText)) {
            console.warn('[mentor] mindmap schema mismatch');
            return {
              status: 422,
              body: { error: 'Mentor response did not match schema. Retry.' },
            };
          }
        }
        structured = null;
      }

      if (normalisedMode === 'explain') {
        finalText = ensureDiagramLineInText(finalText, payload);
      }

      if (structured && normalisedMode === 'solve_with_me' && (!structured.tutor || typeof structured.tutor !== 'object')) {
        structured = ensureDiagramFields(structured, payload);
        finalText = JSON.stringify(structured);
      }

      const validStructured =
        structured && structured.tutor && typeof structured.tutor === 'object'
          ? structured
          : structured && isValidMentorProtocol(structured, normalisedMode)
            ? structured
            : structured && ['learn_teach', 'learn_mindmap', 'learn_proof', 'board_steps_ms'].includes(String(structured.kind || ''))
              ? structured
              : null;
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: handlerUsed,
        schema_used: schemaUsedTrace,
        repair_used: repairUsed,
      };
      if (fallbackUsed) trace.fallback_used = true;
      if (isTeachContract) {
        trace.teach_contract = true;
        trace.repair_used = repairUsed;
        trace.fallback_used = Boolean(fallbackUsed);
        trace.json_extracted = Boolean(jsonExtracted);
        trace.cache_hit = false;
        trace.coalesced = false;
      }
      return {
        status: 200,
        body: {
          ok: true,
          data: {
            text: finalText,
            structured: validStructured,
            trace,
          },
        },
        structured: validStructured,
        trace,
        text: finalText,
      };
    };

    try {
      if (isTeachContract) {
        const cacheKey = buildTeachContractCacheKey(payload);
        const cached = teachCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          const trace = {
            normalized_mode: normalisedMode,
            handler_used: handlerUsed,
            schema_used: 'schema_learn_teach_contract',
            repair_used: false,
            teach_contract: true,
            cache_hit: true,
            coalesced: false,
            json_extracted: true,
          };
          return sendJson(res, 200, {
            ok: true,
            data: {
              text: cached.text,
              structured: cached.structured,
              trace,
            },
          });
        }
        if (cached) teachCache.delete(cacheKey);

        const inflight = inflightTeach.get(cacheKey);
        if (inflight) {
          const result = await inflight;
          if (result?.body?.data?.trace && result.status === 200) {
            result.body.data.trace.cache_hit = false;
            result.body.data.trace.coalesced = true;
            result.body.data.trace.teach_contract = true;
          }
          return sendJson(res, result.status, result.body);
        }

        const promise = buildMentorResponse();
        inflightTeach.set(cacheKey, promise);
        let result;
        try {
          result = await promise;
        } finally {
          inflightTeach.delete(cacheKey);
        }
        if (result?.status === 200 && result.structured) {
          teachCache.set(cacheKey, {
            structured: result.structured,
            text: result.text,
            expiresAt: Date.now() + TEACH_CACHE_TTL_MS,
          });
        }
        if (result?.body?.data?.trace && result.status === 200) {
          result.body.data.trace.cache_hit = false;
          result.body.data.trace.coalesced = false;
          result.body.data.trace.teach_contract = true;
        }
        return sendJson(res, result.status, result.body);
      }

      const result = await buildMentorResponse();
      return sendJson(res, result.status, result.body);
    } catch (err) {
      if (err && err.status === 429) {
        const retryAfterSec = 20;
        let fallbackStructured = null;
        if (isTeachContract) {
          fallbackStructured = buildLearnTeachFallback(payload);
        } else if (isStructuredMode(normalisedMode)) {
          fallbackStructured = buildTutorFallback(normalisedMode, payload);
        }
        if (fallbackStructured && typeof fallbackStructured === 'object') {
          fallbackStructured = orchestrateTutorResponse({
            mode: normalisedMode,
            payload,
            messages: reqJson?.messages,
            structuredDraft: fallbackStructured,
          });
        }
        const fallbackAttemptText = extractStudentAttempt(payload, reqJson?.messages);
        if (
          fallbackStructured &&
          typeof fallbackStructured === 'object' &&
          fallbackAttemptText &&
          isTrianglesTopic(payload)
        ) {
          fallbackStructured.attempt_loop = buildAttemptLoopHeuristic(payload, fallbackAttemptText);
        }
        const fallbackBase =
          fallbackStructured && typeof fallbackStructured === 'object'
            ? fallbackStructured
            : { tutor: { text: 'Mentor is rate-limited. Please wait 20 seconds and retry.' } };
        const fallback = attachTutorDiagramIntent(fallbackBase, payload);
        return sendJsonWithHeaders(
          res,
          429,
          {
            error: 'Mentor is rate-limited. Please wait and retry.',
            retryAfterSec,
            data: {
              structured: fallback,
              trace: { rate_limited: true, retry_after_sec: retryAfterSec, teach_contract: Boolean(isTeachContract) },
            },
          },
          { 'Retry-After': String(retryAfterSec) }
        );
      }
      console.error(err);
      return sendJson(res, 500, {
        error: 'Failed to query the AI service',
        details: err.message,
      });
    }
  }

  // More-like-this endpoint
  if (req.method === 'POST' && req.url === '/api/more-like-this') {
    let payload;
    try {
      payload = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    if (isStubMode()) {
      const stub = buildStubMoreLikeThis(payload);
      return sendJson(res, 200, {
        ...stub,
        provider: ACTIVE_PROVIDER,
      });
    }

    try {
      const { userPrompt, numVariants } = buildMoreLikeThisUserPrompt(payload);
      const subject = payload.subject || 'Maths/Science';

      const systemPrompt =
        'You are an expert CBSE Class 10 board question setter for Maths and Science. ' +
        'You strictly follow the CBSE exam blueprint, marks scheme and language style. ' +
        'You always generate high-quality board-style questions that are safe and syllabus-aligned.';

      const contents = [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] },
      ];

      const reply = await callGemini(GEMINI_MODEL, contents, {
        temperature: 0.6,
        maxOutputTokens: 900,
      });

      let variants = [];
      try {
        const parsed = JSON.parse(reply.text);
        if (parsed && Array.isArray(parsed.questions)) {
          variants = parsed.questions.map((q, idx) => ({
            questionText: String(q.questionText || q.text || '').trim(),
            marks:
              q.marks != null
                ? q.marks
                : payload.seedQuestion && payload.seedQuestion.marks != null
                ? payload.seedQuestion.marks
                : undefined,
            difficulty:
              q.difficulty ||
              (payload.seedQuestion && payload.seedQuestion.difficulty) ||
              undefined,
            bloomSkill:
              q.bloomSkill ||
              (payload.seedQuestion && payload.seedQuestion.bloomSkill) ||
              undefined,
            index: idx,
          }));
        }
      } catch (e) {
        // Fallback: treat each non-empty line as a question
        const seed = payload.seedQuestion || {};
        const lines = String(reply.text)
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
        variants = lines.slice(0, numVariants).map((line, idx) => ({
          questionText: line.replace(/^\d+[.)]\s*/, ''),
          marks: seed.marks,
          difficulty: seed.difficulty,
          bloomSkill: seed.bloomSkill,
          index: idx,
        }));
      }

      return sendJson(res, 200, {
        subject,
        topicKey: payload.topicKey || null,
        provider: ACTIVE_PROVIDER,
        model: GEMINI_MODEL,
        variants,
      });
    } catch (err) {
      console.error(err);
      return sendJson(res, 500, {
        error: 'Failed to generate variants',
        details: err.message,
      });
    }
  }

  // 404
  return sendJson(res, 404, { error: 'Not Found' });
}

const server = http.createServer((req, res) => {
  // ensure async handler errors don't crash process
  handleRequest(req, res).catch((e) => {
    console.error(e);
    sendJson(res, 500, { error: 'Unhandled server error', details: e.message });
  });
});

server.listen(PORT, () => {
  console.log(`LazyTopper AI server running on port ${PORT}`);
  const envUsedLabel = ENV_USED.length ? ENV_USED.join(',') : '';
  console.log(
    `Provider: ${ACTIVE_PROVIDER} | Model: ${GEMINI_MODEL} | KeyPresent: ${Boolean(API_KEY)} | Stub: ${STUB_MODE} | EnvUsed: ${envUsedLabel}`
  );
});
function messagesToGeminiContents(messages, systemPrompt) {
  const contents = [];
  let injected = false;

  for (const m of messages || []) {
    const roleRaw = String(m?.role || "user").toLowerCase();
    if (roleRaw === "system") continue;

    const role = roleRaw === "assistant" ? "model" : "user";
    let text = String(m?.content ?? "");

    if (!injected && role === "user") {
      text = systemPrompt + "\n\n" + text;
      injected = true;
    }

    contents.push({ role, parts: [{ text }] });
  }

  if (!injected) {
    contents.unshift({ role: "user", parts: [{ text: systemPrompt }] });
  }

  return contents;
}
