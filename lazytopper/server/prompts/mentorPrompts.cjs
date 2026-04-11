function createMentorPrompts(deps) {
  const {
    isValidMentorProtocol,
    normalizeMentorStudentProfile,
    normalizeTopicKeyInput,
    resolvePriorityGrindTopicKey,
    toTitleCaseFromTopicKey,
    isProofWritingPayload,
    isTrianglesLearnPayload,
    shouldRequireDiagram,
    diagramLabelsForType,
    diagramSpecForPayload,
    diagramLineForExplain,
    formatDoubtContext,
    classifyAttemptStatus,
    attemptStatusToConfidence,
    getProofFocus,
    getProofMaxLines,
    proofTemplateForFocus,
    containsDisallowedProofPhrases,
    containsProofHeadings,
    hasProofSectionsInOrder,
    countNonEmptyLines,
    isTeachContractRequest,
    toStringArray,
    ensureMinArray,
    enforceTeacherGoal,
    normalizeTeachKeyIdeas,
    enforceCheckpointQuestion,
    enforceCheckpointAnswer,
    enforceCommonMistake,
    toLabelArray,
    getLearnTeachContractSchemaText,
    containsPlaceholderLanguage,
    getLearnSeedPack,
  } = deps;

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
    `The student has about ${daysLeft} days left to Phase 1 exams (Feb 17 – Mar 11, 2026, compulsory) and can study ~${hours} hours per day.`,
    'CBSE 2025-26 has a two-exam system: Phase 1 is the main compulsory exam; Phase 2 (May 15 – Jun 1, 2026) is optional and lets students re-attempt up to 3 subjects — the best score counts.',
    'Note: The chapter "Constructions" has been removed from the 2025-26 Maths syllabus. Do not recommend studying it.',
    'Give concrete time-management tips, mindset advice, and how to handle stress during prep and on exam day.',
  ].join(' ');
}



/**
 * Convert app chat messages to Gemini "contents" format.
 * @param {{role:'user'|'assistant', content:string}[]} messages
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
    'CBSE 2025-26 NOTE: "Constructions" removed from Maths syllabus. Two-exam system: Phase 1 (compulsory) + Phase 2 (optional, up to 3 subjects, best score counts).',
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
    'CBSE 2025-26 NOTE: The chapter "Constructions" has been removed from the Maths syllabus. Two-exam system: Phase 1 (compulsory) + Phase 2 (optional re-attempt for up to 3 subjects, best score counts).',
    buildMentorBehaviorContract(payload, 'board_steps_ms'),
    buildMentorRuntimeRouteContext(payload),
    '',
    'TASK:',
    '- Create a solution EXACTLY matching the CBSE official marking scheme format.',
    '- Each step must show what to WRITE in the answer sheet — not what to "think" or "do".',
    '- Use HALF MARKS (0.5) for setup steps (writing given/formula) and final answer steps, as CBSE does.',
    '- Assign marks per step so that the total equals the question marks.',
    '- For Maths: show actual mathematical working with symbols (√, ², ±, ∴, ∵), real numbers, real calculations.',
    '- For Science: use NCERT-standard terminology, balanced equations with state symbols (s/l/g/aq).',
    '- Keep wording short and exam-like (no long essays).',
    '- Follow CBSE step pattern: Given/Definition → Formula/Law → Substitution/Application → Simplification → Final Answer.',
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
    '      "text": "EXACT content to write in answer sheet — formulas, equations, calculations with proper notation",',
    '      "marks": 0.5 or 1 or 1.5 etc (CBSE uses half marks for setup/conclusion steps),',
    '      "whyThisGetsMarks": "1 line: what examiner awards marks for in the official marking scheme",',
    '      "commonMistake": "1 line: specific mistake that loses marks in board evaluation"',
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

function buildConversationalTeachSystemPrompt(payload, isConceptTeach) {
  const subject = payload.subject || 'Maths';
  const grade = payload.grade != null ? payload.grade : 10;
  const topicKey = payload.topicKey || payload.topic || '';
  const stepIndex = Number(payload.stepIndex) || 0;
  const nearCompletion = Boolean(payload.nearCompletion);
  const studentAttempt = payload.attempt_loop?.student_attempt?.raw_text || '';
  const conceptCtx = payload.conceptContext || {};

  const topicName = topicKey.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const isFirstStep = stepIndex === 0;
  const hasStudentResponse = Boolean(studentAttempt);

  const conceptQuestionText = String(conceptCtx.questionText || '').trim();
  const conceptSubtopic = String(conceptCtx.subtopic || '').trim();
  const conceptConcept = String(conceptCtx.concept || '').trim();
  const conceptMarks = conceptCtx.marks ? Number(conceptCtx.marks) : null;
  const hasConceptContext = isConceptTeach && (conceptQuestionText || conceptSubtopic);

  const conceptFocusName = conceptSubtopic || conceptConcept || topicName;

  const isStepRequest = /step[- ]by[- ]step|show me the steps|stepwise|marking scheme/i.test(studentAttempt);

  let stepGuidance = '';
  if (isFirstStep && hasConceptContext) {
    const focusLines = [];
    focusLines.push(`IMPORTANT: The student is stuck on a SPECIFIC question and needs help with ONE concept only.`);
    focusLines.push(`DO NOT teach the entire chapter "${topicName}". ONLY teach "${conceptFocusName}".`);
    focusLines.push('');
    focusLines.push(`The student's question: "${conceptQuestionText}"`);
    if (conceptMarks) focusLines.push(`(${conceptMarks} marks)`);
    focusLines.push(`Specific concept needed: ${conceptFocusName}`);
    if (conceptConcept && conceptConcept !== conceptSubtopic) focusLines.push(`Concept tag: ${conceptConcept}`);
    focusLines.push('');
    focusLines.push('YOUR 3-PHASE APPROACH (focused ONLY on this specific concept):');
    focusLines.push(`Phase 1 (this message): Explain ONLY "${conceptFocusName}" — the specific method/formula/rule needed to solve this exact question. Use a simple analogy, then demonstrate the key steps. Do NOT cover other subtopics of ${topicName}.`);
    focusLines.push('Phase 2 (next 1-2 messages): Walk through solving THIS exact question step-by-step, then one similar example.');
    focusLines.push('Phase 3 (final message): Give a checkpoint question testing this same concept. After the student answers, wrap up.');
    focusLines.push('');
    focusLines.push(`Start Phase 1 now: Greet warmly, then teach ONLY "${conceptFocusName}" with an analogy and the key rule. End with a question.`);
    stepGuidance = focusLines.join('\n');
  } else if (isFirstStep) {
    stepGuidance = [
      `This is the FIRST message. Start by warmly greeting the student.`,
      `Begin with a relatable real-life example or analogy that connects ${topicName} to something a teenager would understand.`,
      `Explain ONE core concept clearly with a concrete example (numbers, visuals, scenarios).`,
      `End with a thought-provoking question that makes the student think — NOT a yes/no question.`,
      `Example question styles: "What do you think would happen if...?", "Can you guess why...?", "If I gave you the number X, how would you..."`,
    ].join('\n');
  } else if (nearCompletion) {
    stepGuidance = [
      `This is the FINAL step. Wrap up the topic.`,
      `Summarize the 2-3 most important things the student learned.`,
      `Give one CBSE board exam tip specific to this topic.`,
      `End with an encouraging message.`,
    ].join('\n');
  } else {
    stepGuidance = [
      `Continue building on the conversation so far.`,
      hasStudentResponse ? `The student just responded. Acknowledge their answer specifically — say what was right, gently correct what was wrong, and explain WHY.` : '',
      `Teach the NEXT concept with a worked example (show actual numbers and steps).`,
      `Use analogies that a 15-year-old Indian student would relate to (cricket scores, phone batteries, sharing pizza, etc).`,
      `End with a question that tests understanding of what you just taught. Make it specific, not generic.`,
    ].filter(Boolean).join('\n');
  }

  const focusLabel = isConceptTeach && conceptFocusName ? conceptFocusName : topicName;

  return [
    `You are Ravi Sir, a beloved CBSE Class ${grade} ${subject} tutor known for making ${focusLabel} click for every student.`,
    'CBSE 2025-26 NOTE: "Constructions" removed from Maths syllabus. Two-exam system: Phase 1 (compulsory) + Phase 2 (optional, up to 3 subjects, best score counts).',
    '',
    'YOUR PERSONALITY:',
    '- Warm, patient, encouraging — like a favourite teacher who genuinely cares',
    '- You explain through EXAMPLES first, theory second',
    '- You use everyday analogies a 15-year-old Indian student relates to',
    '- You ask thought-provoking questions, not yes/no questions',
    '- When a student is wrong, you never say "wrong" — you say "interesting thinking! let me show you something..."',
    '- You celebrate small wins: "Exactly!", "You\'re getting it!", "Sharp thinking!"',
    '',
    'YOUR TEACHING METHOD (Socratic + Example-first):',
    '1. Start with a real example or story that introduces the concept',
    '2. Walk through the example step by step with actual numbers',
    '3. State the rule/formula AFTER the student has seen it in action',
    '4. Ask a question that makes the student apply what they just learned',
    '5. If the student asks a question or says they don\'t understand, re-explain using a DIFFERENT example',
    '',
    'RULES:',
    isStepRequest
      ? '- Write in natural conversational language for the explanation, then append a structured ```steps JSON block at the end (see STEP-BY-STEP FORMAT INSTRUCTION below)'
      : '- Write in natural conversational language — NOT bullet points or JSON',
    '- Use short paragraphs (2-3 sentences max each)',
    '- Use **bold** for key terms and formulas',
    '- Include actual worked examples with real numbers',
    '- Every response must end with a question for the student',
    '- If the student asks "why", give the deeper reason with another example',
    '- If the student says "I don\'t understand", use a completely different analogy',
    '- Keep responses under 250 words — be concise but complete',
    '- Reference CBSE board exam patterns naturally: "This type of question comes for 2 marks in board exams"',
    '',
    'CURRENT STEP GUIDANCE:',
    stepGuidance,
    '',
    `Topic: ${focusLabel}`,
    `Subject: ${subject}, Grade: ${grade}`,
    `Step: ${stepIndex + 1}`,
    ...(isStepRequest ? [
      '',
      'STEP-BY-STEP FORMAT INSTRUCTION:',
      'The student wants a step-by-step solution with CBSE board marking scheme.',
      'After your conversational explanation, you MUST append a structured block at the very end.',
      'The block must start with ```steps on its own line, then valid JSON, then ``` on its own line.',
      'JSON format: {"question":"<the question being solved>","steps":[{"text":"<step description>","marks":<number>},...],"totalMarks":<number>,"commonMistake":"<one common mistake>","finalAnswer":"<the final answer line>"}',
      'Each step.marks should reflect CBSE marking (0.5, 1, 1.5, 2 etc). totalMarks = sum of all step marks.',
      'Include 3-6 steps that match how CBSE examiners would award marks.',
      'Example: {"question":"Find HCF of 225 and 135","steps":[{"text":"Apply Euclid division: 225 = 135 × 1 + 90","marks":1},{"text":"Continue: 135 = 90 × 1 + 45","marks":1},{"text":"Continue: 90 = 45 × 2 + 0","marks":1},{"text":"Since remainder = 0, HCF = 45","marks":1}],"totalMarks":4,"commonMistake":"Stopping before remainder becomes 0","finalAnswer":"HCF(225, 135) = 45"}',
      'IMPORTANT: The ```steps block must be valid JSON. Put it at the very END of your response after the conversational text.',
    ] : []),
  ].filter(Boolean).join('\n');
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
    'CBSE 2025-26 NOTE: "Constructions" removed from Maths syllabus.',
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

  const requestedDifficulty = payload.requestedDifficulty || difficulty || '';
  const enforcedDifficulty = requestedDifficulty || 'same as seed';

  const lines = [
    `We are building an exam-style practice set for CBSE Class 10 ${subject}.`,
    topicKey ? `Topic key (chapter) in our system: ${topicKey}.` : '',
    'You will receive a seed board-style question from our highly-probable-question (HPQ) bank.',
    'Generate NEW questions on exactly the same underlying concept, not random other concepts.',
    '',
    'Seed question:',
    seedText,
    '',
    `Metadata: marks=${marks || 'same as seed'}, difficulty=${enforcedDifficulty}, bloomSkill=${bloom || 'same as seed'}.`,
    '',
    `Generate ${numVariants} new CBSE board-style questions that:`,
    '- Keep the same marks value as the seed (or as close as reasonable).',
    `- MANDATORY: Every generated question MUST have difficulty "${enforcedDifficulty}". Do NOT vary the difficulty across variants.`,
    '- Stay in the same Bloom level as the seed.',
    '- Change numbers, scenarios, or wording so they are not copies of the seed.',
    '- Avoid near-duplicate questions: each variant must test a meaningfully different aspect, use different numerical values, or present a different scenario.',
    '',
    'Return ONLY a single JSON object with this exact shape:',
    '{',
    '  "questions": [',
    '    {',
    '      "questionText": "...",',
    '      "marks": <number>,',
    `      "difficulty": "${enforcedDifficulty}",`,
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

  return {
    buildPlanUserPrompt,
    buildSolveUserPrompt,
    buildExplainUserPrompt,
    buildGrindTrianglesUserPrompt,
    buildGenericTopicGrindProfile,
    buildGrindTopicContractFallback,
    buildMisconceptionExplainPrompt,
    buildCompetencyTeachPrompt,
    buildMindmapTeachPrompt,
    inferDiagramType,
    ensureDiagramLineInText,
    ensureDiagramFields,
    buildAttemptLoopHeuristic,
    buildProofWritingAddendum,
    validateProofSolveWithMe,
    buildDiagramFields,
    buildTeachDiagramObject,
    ensureTeachContractShape,
    validateLearnTeachContract,
    buildDeterministicExamLines,
    buildDeterministicCheckQuestion,
    adaptLegacyLearnTeachToContract,
    adaptMindmapToLearnTeachContract,
    buildLearnTeachContractPrompt,
    validateStructuredForMode,
    buildRepairPromptForMode,
    buildProofFallbackBoardSteps,
    buildProofFallbackSolveWithMe,
    getJsonSchemaTextForMode,
    buildTrianglesEvaluationPrompt,
    validateTrianglesEvaluation,
    buildTrianglesEvaluationRepairPrompt,
    buildTrianglesEvaluationFallback,
    buildCoachUserPrompt,
    buildSolveWithMeProtocolPrompt,
    buildBoardStepsMSPrompt,
    buildLearnSeedContext,
    buildLearnTeachFallback,
    buildLearnSolveWithMeFallback,
    buildConversationalTeachSystemPrompt,
    buildStructuredFallback,
    buildLearnKeyDefinitionsPrompt,
    buildLearnProofPrompt,
    buildLearnMindmapPrompt,
    buildMoreLikeThisUserPrompt,
    inferMentorStudentProfileForPrompt,
    buildMentorBehaviorContract,
    buildMentorRuntimeRouteContext,
  };
}

module.exports = { createMentorPrompts };
