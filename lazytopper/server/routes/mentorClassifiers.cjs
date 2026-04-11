const { PRIORITY_GRIND_TOPIC_PROFILES, PRIORITY_GRIND_TOPIC_ALIASES } = require('../prompts/promptData.cjs');

function createMentorClassifiers() {
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

  return {
    isValidMentorProtocol,
    summarizeValidationIssues,
    normalizeMentorStudentProfile,
    normalizeTopicKeyInput,
    resolvePriorityGrindTopicKey,
    toTitleCaseFromTopicKey,
    isLearnMisconceptionPayload,
    isLearnCompetencyPayload,
    STRUCTURED_MODES,
    MODE_ALIASES,
    normalizeIncomingMode,
    isStructuredMode,
    isLearnKeyDefinitionsPayload,
    isLearnMindmapPayload,
    isTeachTabPayload,
    isProofWritingPayload,
    isTrianglesLearnPayload,
    isTrianglesTopic,
    flattenToLower,
    isTrianglesBsreEnabled,
    isNoProviderEnabled,
  };
}
module.exports = { createMentorClassifiers };
