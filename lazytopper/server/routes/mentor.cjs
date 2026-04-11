const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createMentorPrompts } = require('../prompts/mentorPrompts.cjs');

function createMentorRoute(deps) {
  const {
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
  } = deps;

  const teachCache = new Map();
  const inflightTeach = new Map();

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

const STRUCTURED_MODES = ['board_steps_ms', 'solve_with_me', 'learn_teach', 'learn_proof', 'learn_mindmap', 'concept_teach'];
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
  concept_teach: 'concept_teach',
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


function toLabelArray(value) {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.values(value).map((v) => String(v || '').trim()).filter(Boolean);
  }
  return [];
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
function toGeminiContents(messages) {
  const out = [];
  if (!Array.isArray(messages)) return out;
  const truncated = messages.length > MAX_HISTORY_TURNS * 2
    ? messages.slice(-(MAX_HISTORY_TURNS * 2))
    : messages;
  for (const m of truncated) {
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

function getLearnSeedPack(payload) {
  return isTrianglesLearnPayload(payload) ? TRIANGLES_LEARN_SEED : null;
}







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

const promptDeps = {
  isValidMentorProtocol, normalizeMentorStudentProfile, normalizeTopicKeyInput,
  resolvePriorityGrindTopicKey, toTitleCaseFromTopicKey,
  isProofWritingPayload, isTrianglesLearnPayload, shouldRequireDiagram,
  diagramLabelsForType, diagramSpecForPayload, diagramLineForExplain,
  formatDoubtContext, classifyAttemptStatus, attemptStatusToConfidence,
  getProofFocus, getProofMaxLines, proofTemplateForFocus,
  containsDisallowedProofPhrases, containsProofHeadings,
  hasProofSectionsInOrder, countNonEmptyLines, isTeachContractRequest,
  toStringArray, ensureMinArray, enforceTeacherGoal,
  normalizeTeachKeyIdeas, enforceCheckpointQuestion, enforceCheckpointAnswer,
  enforceCommonMistake, toLabelArray, getLearnTeachContractSchemaText,
  containsPlaceholderLanguage, getLearnSeedPack,
  validateAttemptLoop, validateTutorStructured, buildTutorFallback,
  initHintState, computeNextHint, scoreRubric,
  retrieveTrianglesSources, resolveTopicTeachContract,
};
const {
  buildPlanUserPrompt, buildSolveUserPrompt, buildExplainUserPrompt,
  buildGrindTrianglesUserPrompt, buildGenericTopicGrindProfile,
  buildGrindTopicContractFallback, buildMisconceptionExplainPrompt,
  buildCompetencyTeachPrompt, buildMindmapTeachPrompt,
  inferDiagramType, ensureDiagramLineInText, ensureDiagramFields,
  buildAttemptLoopHeuristic, buildProofWritingAddendum,
  validateProofSolveWithMe, buildDiagramFields, buildTeachDiagramObject,
  ensureTeachContractShape, validateLearnTeachContract,
  buildDeterministicExamLines, buildDeterministicCheckQuestion,
  adaptLegacyLearnTeachToContract, adaptMindmapToLearnTeachContract,
  buildLearnTeachContractPrompt, validateStructuredForMode,
  buildRepairPromptForMode, buildProofFallbackBoardSteps,
  buildProofFallbackSolveWithMe, getJsonSchemaTextForMode,
  buildTrianglesEvaluationPrompt, validateTrianglesEvaluation,
  buildTrianglesEvaluationRepairPrompt, buildTrianglesEvaluationFallback,
  buildCoachUserPrompt, buildSolveWithMeProtocolPrompt,
  buildBoardStepsMSPrompt, buildLearnSeedContext,
  buildLearnTeachFallback, buildLearnSolveWithMeFallback,
  buildConversationalTeachSystemPrompt, buildStructuredFallback,
  buildLearnKeyDefinitionsPrompt, buildLearnProofPrompt,
  buildLearnMindmapPrompt, buildMoreLikeThisUserPrompt,
  inferMentorStudentProfileForPrompt, buildMentorBehaviorContract,
  buildMentorRuntimeRouteContext,
} = createMentorPrompts(promptDeps);

async function handleMentorRequest(req, res) {
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
    const isConversationalTeach = Boolean(payload?.conversational);
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

    const isConceptTeach = mode === 'concept_teach';
    let normalisedMode = normalizeIncomingMode(mode) || mode;
    if (isConceptTeach) normalisedMode = 'learn_teach';
    if (isTeachTab && !isConceptTeach) normalisedMode = 'learn_teach';
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
            'You are a CBSE Class 10 study planner. Create realistic, chapter-wise plans using the given context. CBSE 2025-26: "Constructions" removed from Maths. Two-exam system — Phase 1 (compulsory), Phase 2 (optional, up to 3 subjects, best score counts).';
          break;
        case 'solve':
          systemPrompt =
            'You are an expert CBSE Class 10 tutor. Use Socratic, step-by-step reasoning and end with a clear final answer. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'explain':
          systemPrompt =
            'You are a CBSE Class 10 concept explainer. Explain topics in simple steps, aligning with board exam style. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'learn_teach':
          systemPrompt =
            'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for key definitions. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'learn_mindmap':
          systemPrompt =
            'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for mindmap teaching. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'learn_proof':
          systemPrompt =
            'You are a strict CBSE Class 10 proof-writing teacher. Return only the required JSON schema. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'coach':
        case 'mindset':
          systemPrompt =
            'You are a supportive CBSE exam coach and mindset mentor. Provide practical strategies and encouragement. CBSE 2025-26: Two-exam system — Phase 1 (compulsory), Phase 2 (optional, up to 3 subjects, best score counts). "Constructions" removed from Maths.';
          break;
        default:
          systemPrompt = 'You are a helpful CBSE Class 10 tutor for Maths and Science. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
      }
    }
    if (isMisconceptionExplain) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for misconceptions.';
    } else if (isCompetencyExplain) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for competencies.';
    } else if (isConceptTeach || isConversationalTeach) {
      systemPrompt = buildConversationalTeachSystemPrompt(payload, isConceptTeach);
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
          if (isConceptTeach || isConversationalTeach) {
            const topicName = (payload.topic || payload.topicKey || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const stepIdx = Number(payload.stepIndex) || 0;
            const studentText = payload.attempt_loop?.student_attempt?.raw_text || '';
            const cCtx = payload.conceptContext || {};
            if (stepIdx === 0 && isConceptTeach && (cCtx.questionText || cCtx.subtopic)) {
              const parts = [`Teach the concept behind this specific question from "${topicName}".`];
              if (cCtx.questionText) parts.push(`The question was: "${cCtx.questionText}"`);
              if (cCtx.subtopic) parts.push(`Subtopic: ${cCtx.subtopic}`);
              parts.push('Start with Phase 1: explain the NCERT theory for this specific concept with a real-life analogy and end with a check question.');
              userPrompt = parts.join('\n');
            } else if (stepIdx === 0) {
              userPrompt = `Start teaching "${topicName}" to a CBSE Class ${payload.grade || 10} student. This is the very first message — introduce the topic with a real-life example and ask an engaging opening question.`;
            } else if (studentText) {
              userPrompt = `The student responded: "${studentText}"\n\nAcknowledge their response, explain further with a new example, and ask the next question.`;
            } else {
              userPrompt = `Continue teaching "${topicName}" — move to the next concept with a worked example and a question.`;
            }
          } else {
            userPrompt = isTeachTabPayload(payload)
              ? buildLearnTeachContractPrompt(payload)
              : buildLearnKeyDefinitionsPrompt(payload);
          }
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

    let originalQuery = payload?.questionText || payload?.studentQuestion || payload?.prompt || payload?.question || '';
    if (!originalQuery && Array.isArray(reqJson?.messages) && reqJson.messages.length > 0) {
      const lastUserMsg = [...reqJson.messages].reverse().find(m => m?.role === 'user');
      originalQuery = String(lastUserMsg?.content || '').trim();
    }
    const routingDecision = selectModelForRequest(normalisedMode, originalQuery);

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

    async function callRoutedModel(model, geminiContents, config, sysPrompt) {
      if (routingDecision.provider === 'claude' && HAS_ANTHROPIC_PROXY) {
        const claudeMsgs = toClaudeMessages(reqJson && reqJson.messages);
        claudeMsgs.push({ role: 'user', content: String(config._userPrompt || '') });
        const claudeConfig = {
          maxTokens: config.maxOutputTokens || 1024,
          temperature: config.temperature,
        };
        return callClaude(routingDecision.model, claudeMsgs, sysPrompt || '', claudeConfig);
      }
      return callGemini(model, geminiContents, config);
    }

    const buildMentorResponse = async () => {
      const marksRaw = payload && (payload.marks ?? payload.totalMarks ?? payload.total_marks);
      const marksNum = Number(marksRaw);
      const safeMarks = Number.isFinite(marksNum) && marksNum > 0 ? marksNum : 5;

      if (isConversationalTeach) {
        const history = toGeminiContents(reqJson && reqJson.messages);
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I will teach as Ravi Sir using the Socratic method with examples and questions.' }] },
          ...history,
          { role: 'user', parts: [{ text: userPrompt }] },
        ].filter((c) => c && c.parts && c.parts[0] && String(c.parts[0].text || '').trim());

        const reply = await callRoutedModel(GEMINI_MODEL, contents, {
          maxOutputTokens: 1600,
          temperature: 0.7,
          _userPrompt: userPrompt,
        }, systemPrompt);

        const responseText = (reply.text || '').trim();
        const trace = {
          normalized_mode: normalisedMode,
          handler_used: 'conversational_teach',
          schema_used: 'text',
          repair_used: false,
          provider: routingDecision.provider,
          model_used: routingDecision.model,
        };
        return {
          status: 200,
          body: {
            ok: true,
            data: {
              text: responseText,
              structured: null,
              responseText,
              trace,
            },
          },
          structured: null,
          trace,
          text: responseText,
        };
      }

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

      const temperature =
        normalisedMode === 'board_steps_ms' || normalisedMode === 'learn_proof'
          ? 0.2
          : normalisedMode === 'learn_teach'
            ? 0.25
            : 0.35;

      const useGeminiFallback = Boolean(mentorImage) || Boolean(responseMimeType);
      const reply = useGeminiFallback
        ? await callGemini(GEMINI_MODEL, contents, { maxOutputTokens, temperature, responseMimeType })
        : await callRoutedModel(GEMINI_MODEL, contents, {
            maxOutputTokens,
            temperature,
            _userPrompt: userPrompt,
          }, systemPrompt);

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
      const actualProvider = useGeminiFallback ? 'gemini' : routingDecision.provider;
      const actualModel = useGeminiFallback ? GEMINI_MODEL : routingDecision.model;
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: handlerUsed,
        schema_used: schemaUsedTrace,
        repair_used: repairUsed,
        provider: actualProvider,
        model_used: actualModel,
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

  return {
    handleMentorRequest,
    buildMoreLikeThisUserPrompt,
    ensureDiagramFields,
  };
}

module.exports = { createMentorRoute };
