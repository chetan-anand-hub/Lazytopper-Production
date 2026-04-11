function createTeachContractPrompts(ctx) {
  const {
    toStringArray, ensureMinArray, enforceTeacherGoal, normalizeTeachKeyIdeas,
    enforceCheckpointQuestion, enforceCheckpointAnswer, enforceCommonMistake,
    getLearnTeachContractSchemaText, containsPlaceholderLanguage,
    buildDiagramFields, buildTeachDiagramObject,
    resolveTopicTeachContract,
  } = ctx;

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

  return {
    ensureTeachContractShape,
    validateLearnTeachContract,
    buildDeterministicExamLines,
    buildDeterministicCheckQuestion,
    adaptLegacyLearnTeachToContract,
    adaptMindmapToLearnTeachContract,
    buildLearnTeachContractPrompt,
    buildProofFallbackBoardSteps,
    buildProofFallbackSolveWithMe,
  };
}
module.exports = { createTeachContractPrompts };
