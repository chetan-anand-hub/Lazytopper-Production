const { createPromptData } = require('../prompts/promptData.cjs');

function createMentorTeachHelpers(deps) {
  const { isTeachTabPayload, isTrianglesLearnPayload, MAX_HISTORY_TURNS } = deps;
  const { TRIANGLES_LEARN_SEED } = createPromptData();

  let _promptFns = {};
  let _diagramFns = {};
  function bindLateDeps(promptFns, diagramFns) {
    _promptFns = promptFns || {};
    _diagramFns = diagramFns || {};
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
    adapted = _promptFns.adaptMindmapToLearnTeachContract(raw, payload);
    usedAdapter = true;
    usedFallback = Boolean(adapted.fallback_used);
  } else {
    const teach = raw.teach || {};
    if (raw.kind === 'learn_teach' && (Array.isArray(teach.simpleExplanation) || Array.isArray(raw.workedExamples))) {
      adapted = _promptFns.adaptLegacyLearnTeachToContract(raw, payload);
      usedAdapter = true;
      usedFallback = Boolean(adapted.fallback_used);
    }
  }
  const ensured = _promptFns.ensureTeachContractShape(adapted, payload);
  return {
    structured: ensured,
    usedAdapter,
    usedFallback: Boolean(ensured?.fallback_used) || usedFallback,
  };
}

function getLearnTeachContractSchemaText(payload) {
  const diagram = _promptFns.buildTeachDiagramObject(payload);
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
  const diagramLine = _diagramFns.shouldRequireDiagram(payload) ? _diagramFns.diagramLineForExplain(payload) : '';
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
  const diagramLine = _diagramFns.shouldRequireDiagram(payload) ? _diagramFns.diagramLineForExplain(payload) : '';
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

function getLearnSeedPack(payload) {
  return isTrianglesLearnPayload(payload) ? TRIANGLES_LEARN_SEED : null;
}

  return {
    isTeachContractRequest,
    toStringArray,
    ensureMinArray,
    toSingleLine,
    enforceTeacherGoal,
    normalizeTeachKeyIdeas,
    enforceCheckpointQuestion,
    enforceCheckpointAnswer,
    enforceCommonMistake,
    toLabelArray,
    coerceLearnTeachContractStructured,
    getLearnTeachContractSchemaText,
    hasMindmapTeachSections,
    containsPlaceholderLanguage,
    hasCompetencySections,
    fallbackCompetencyResponse,
    sanitizeExplainOutput,
    hasMisconceptionSections,
    fallbackMisconceptionResponse,
    toGeminiContents,
    getLearnSeedPack,
    bindLateDeps,
  };
}
module.exports = { createMentorTeachHelpers };
