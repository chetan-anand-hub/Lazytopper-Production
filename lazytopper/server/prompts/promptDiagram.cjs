function createDiagramPrompts(ctx) {
  const {
    shouldRequireDiagram, diagramLabelsForType, diagramSpecForPayload, diagramLineForExplain,
    classifyAttemptStatus, attemptStatusToConfidence,
    getProofFocus, getProofMaxLines, proofTemplateForFocus,
    containsDisallowedProofPhrases, hasProofSectionsInOrder, countNonEmptyLines, toLabelArray,
    initHintState, computeNextHint, scoreRubric, retrieveTrianglesSources,
  } = ctx;

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

  return {
    inferDiagramType,
    ensureDiagramLineInText,
    ensureDiagramFields,
    buildAttemptLoopHeuristic,
    buildProofWritingAddendum,
    validateProofSolveWithMe,
    buildDiagramFields,
    buildTeachDiagramObject,
  };
}
module.exports = { createDiagramPrompts };
