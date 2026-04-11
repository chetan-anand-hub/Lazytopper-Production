function createMentorDiagramHelpers(deps) {
  const { flattenToLower, isTrianglesTopic, isTeachTabPayload } = deps;

function inferDiagramType(payload) {
  const hint = [
    payload?.theoremFocus, payload?.explainType, payload?.mindmapNodeTitle,
    payload?.mindmapNodeText, payload?.questionText, payload?.contextText,
    payload?.topicKey, payload?.topic, payload?.chapter,
  ].flat().map((v) => String(v || '').toLowerCase().replace(/[_-]+/g, ' ')).join(' ');
  const hasTrigWord = /\b(trigonometry|trigonometric|sin|cos|tan|sine|cosine|tangent|theta)\b/.test(hint);
  if (hint.includes('trigon') || hasTrigWord || hint.includes('height') || hint.includes('distance')) return 'trigonometric_triangle';
  if (hint.includes('circle') || hint.includes('chord') || hint.includes('tangent')) return 'circle';
  if (hint.includes('coordinate') || hint.includes('cartesian') || hint.includes('graph')) return 'coordinate_plane';
  if (hint.includes('mensuration') || hint.includes('surface area') || hint.includes('volume') || hint.includes('cylinder') || hint.includes('cone') || hint.includes('sphere') || hint.includes('cuboid')) return 'mensuration_solid';
  if (hint.includes('ray') || hint.includes('reflection') || hint.includes('refraction') || hint.includes('lens') || hint.includes('mirror') || hint.includes('optics')) return 'ray_diagram';
  if (hint.includes('life process') || hint.includes('nutrition') || hint.includes('respiration') || hint.includes('excretion') || hint.includes('stomata') || hint.includes('nephron') || hint.includes('heart') || hint.includes('control and coordination') || hint.includes('neuron') || hint.includes('reflex') || hint.includes('reproduction') || hint.includes('heredity') || hint.includes('evolution') || hint.includes('food chain') || hint.includes('trophic')) return 'biology_process';
  if (hint.includes('magnetic') || hint.includes('magnet') || hint.includes('solenoid') || hint.includes('field')) return 'magnetic_field';
  if (hint.includes('circuit') || hint.includes('electric') || hint.includes('current') || hint.includes('resistance') || hint.includes('ammeter') || hint.includes('voltmeter')) return 'circuit';
  if (hint.includes('triangle') || hint.includes('similar') || hint.includes('congruen') || hint.includes('pyth') || hint.includes('bpt') || hint.includes('parallel')) return 'triangle';
  return 'generic';
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

  return {
    inferDiagramType,
    getDiagramTopicText,
    isTeachOrBoardPayload,
    isNonNegotiableDiagramTopic,
    shouldRequireDiagram,
    diagramLabelsForType,
    diagramSpecForPayload,
    attachTutorDiagramIntent,
    diagramLineForExplain,
    formatDoubtContext,
    normalizeBoardSteps,
    getLastUserMessage,
    isTrianglesEvaluationRequest,
    extractStudentAttempt,
    classifyAttemptStatus,
    attemptStatusToConfidence,
    getProofFocus,
    getProofMaxLines,
    proofTemplateForFocus,
    containsDisallowedProofPhrases,
    containsProofHeadings,
    hasProofSectionsInOrder,
    countNonEmptyLines,
  };
}
module.exports = { createMentorDiagramHelpers };
