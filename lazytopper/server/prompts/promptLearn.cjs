// Server-side canonical topic key → default visual title lookup.
// This is a fallback for when the client does not send visualTitle
// (e.g. edge-case code paths, future API integrations).
// Keys are canonical slug forms (lowercase, hyphens). Values must match the
// title of the first visual concept in visualConceptRegistry.ts for that chapter.
const TOPIC_DEFAULT_VISUAL = {
  // Maths
  'trigonometry': 'Trigonometric Ratios',
  'introduction-to-trigonometry': 'Trigonometric Ratios',
  'maths-introduction-trigonometry': 'Trigonometric Ratios',
  'maths-applications-trigonometry': 'Height and Distance Problems',
  'pair-of-linear-equations': 'Graphical Method',
  'pair-of-linear-equations-in-two-variables': 'Graphical Method',
  'linear-equations': 'Graphical Method',
  'polynomials': 'Zeroes of a Polynomial',
  'quadratic-equations': 'Standard Form and Roots',
  'arithmetic-progression': 'AP Definition and Common Difference',
  'arithmetic-progressions': 'AP Definition and Common Difference',
  'triangles': 'Similar Triangles',
  'coordinate-geometry': 'Distance Formula',
  'circles': 'Tangent to a Circle',
  'areas-related-to-circles': 'Area of Sector and Segment',
  'surface-areas-and-volumes': 'Cylinder Surface Area',
  'statistics': 'Histogram vs Bar Graph',
  'probability': 'Classical Probability',
  'real-numbers': 'Fundamental Theorem of Arithmetic',
  // Science
  'electricity': 'V-I Relationship',
  'light-reflection-and-refraction': 'Laws of Reflection',
  'light-reflection-and-refraction-incl-human-eye-prism': 'Laws of Reflection',
  'magnetic-effects': 'Magnetic Field Lines',
  'magnetic-effects-of-electric-current': 'Magnetic Field Lines',
  'chemical-reactions-and-equations': 'Types of Reactions',
  'acids-bases-and-salts': 'pH Scale',
  'metals-and-non-metals': 'Reactivity Series',
  'carbon-and-its-compounds': 'Covalent Bonding',
  'life-processes': 'Nutrition in Plants',
  'control-and-coordination': 'Neuron Structure',
  'control-and-co-ordination': 'Neuron Structure',
  'reproduction': 'Sexual Reproduction in Flowering Plants',
  'how-do-organisms-reproduce': 'Sexual Reproduction in Flowering Plants',
  'heredity': 'Mendel\'s Pea Plant Experiment',
  'heredity-and-evolution': 'Mendel\'s Pea Plant Experiment',
  'human-eye': 'Human Eye Structure',
  'human-eye-and-colourful-world': 'Human Eye Structure',
};

/** Normalise a topic key to the canonical slug form used in TOPIC_DEFAULT_VISUAL. */
function normaliseTopicSlugForVisual(topicKey) {
  return String(topicKey || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Look up the default visual title for a topic key. Returns '' when not found. */
function getDefaultVisualTitleForTopic(topicKey) {
  const slug = normaliseTopicSlugForVisual(topicKey);
  return TOPIC_DEFAULT_VISUAL[slug] || '';
}

function createLearnPrompts(ctx) {
  const {
    getLearnSeedPack, diagramLabelsForType,
    inferDiagramType, ensureTeachContractShape,
    inferMentorStudentProfileForPrompt, buildMentorBehaviorContract, buildMentorRuntimeRouteContext,
    buildProofFallbackBoardSteps, buildProofFallbackSolveWithMe, buildTutorFallback,
  } = ctx;

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
  // Client sends visualTitle when it has found and is showing a visual.
  // Fall back to server-side lookup by canonical topic key so the AI always
  // references the correct visual even if the client omits the field.
  const visualTitle = String(payload.visualTitle || '').trim() || getDefaultVisualTitleForTopic(topicKey);
  const isGraphRequest = Boolean(payload.graphRequest);
  const isInteractive = Boolean(payload.isInteractive);

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
    ...(visualTitle ? [
      'VISUAL CONTEXT:',
      `The student has an interactive visual titled "${visualTitle}" displayed to the left of your chat.`,
      isFirstStep
        ? `IMPORTANT: This is your FIRST message. You MUST start by explicitly referencing this visual. Begin with something like "Take a look at the interactive above — it shows ${visualTitle}. As you explore it..." and then build your explanation around what the student sees.`
        : `Refer back to the visual when it helps: "Remember the diagram above?" or "Look at the visual again — you'll notice..."`,
      isGraphRequest
        ? `CRITICAL: The student just asked to see a graph or diagram. The interactive visual titled "${visualTitle}" IS already displayed. Start your response by narrating it: describe what it shows, point out the key elements by name, and walk the student through how to read/interpret it. Then continue with your explanation.`
        : `If the student asks to see a graph or diagram for this topic, tell them to look at or interact with the visual already shown.`,
      '',
      'HIGHLIGHT ANNOTATIONS:',
      'You can make specific parts of the visual glow on screen by writing [HIGHLIGHT: part_name] anywhere in your response.',
      'The annotation is invisible to the student — only the glow effect on the visual appears. Use it to direct attention to exactly the right element.',
      'Examples of correct usage:',
      '  "Look at the [HIGHLIGHT: axon] — this long cable-like structure carries signals away from the cell body."',
      '  "The [HIGHLIGHT: cerebellum] is what keeps you balanced when you walk or ride a bike."',
      '  "See where the parabola crosses the [HIGHLIGHT: x-axis] — that crossing point is the zero of the polynomial!"',
      '  "Try dragging the [HIGHLIGHT: a slider] and notice how the parabola opens wider or narrower."',
      'RULES for [HIGHLIGHT: ...]:',
      '  - Use the exact id, label, or visible text of the element (e.g. "Dendrites", "axon", "Cell Body", "x-axis", "Cerebrum")',
      '  - Place it naturally inside your sentence — do NOT write it as a separate line or label',
      '  - Use 1–2 highlights per response, not more',
      '  - Only highlight when it genuinely helps direct the student\'s attention',
      '',
      ...(isInteractive ? [
        'INTERACTIVE NUDGE:',
        `This visual has interactive controls (sliders, tabs, clickable parts). In EVERY response, actively invite the student to try something specific:`,
        '  - "Drag the \'a\' slider to the right and watch the parabola open wider — then tell me what you notice!"',
        '  - "Click the \'Reflex Arc\' tab — then press \'Trigger Stimulus\' to see the whole pathway animate step by step!"',
        '  - "Hover over each part of the neuron in the diagram — what does each one do?"',
        '  - "Change the \'b\' slider to 0 and see how many places the graph crosses the x-axis. Is it more or less than before?"',
        'Make the nudge feel like an exciting challenge, not an instruction. End your nudge with a question to keep the student engaged.',
        '',
      ] : []),
    ] : [
      ...(isGraphRequest ? [
        'VISUAL NOTE:',
        'The student asked to see a graph or diagram. No pre-loaded visual is available for this topic at the moment. Describe the concept using clear textual descriptions and step-by-step reasoning instead.',
        '',
      ] : []),
    ]),
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

  const requestedSection = payload.requestedSection || '';
  const SECTION_DESCRIPTIONS = {
    A: 'Section A — 1 mark, objective/MCQ single-sentence question',
    B: 'Section B — 2 marks, short-answer, 2–3 lines',
    C: 'Section C — 3 marks, short-answer with working, 4–6 lines',
    D: 'Section D — 5 marks, long-answer with full working and multiple sub-steps',
    E: 'Section E — 4 marks, case-based / competency-focused with a scenario passage',
  };
  const sectionDesc = requestedSection && SECTION_DESCRIPTIONS[requestedSection]
    ? SECTION_DESCRIPTIONS[requestedSection]
    : null;

  const lines = [
    `We are building an exam-style practice set for CBSE Class 10 ${subject}.`,
    topicKey ? `Topic key (chapter) in our system: ${topicKey}.` : '',
    'You will receive a seed board-style question from our highly-probable-question (HPQ) bank.',
    'Generate NEW questions on exactly the same underlying concept, not random other concepts.',
    '',
    'Seed question:',
    seedText,
    '',
    `Metadata: marks=${marks || 'same as seed'}, difficulty=${enforcedDifficulty}, bloomSkill=${bloom || 'same as seed'}${requestedSection ? `, section=${requestedSection}` : ''}.`,
    '',
    `Generate ${numVariants} new CBSE board-style questions that:`,
    '- Keep the same marks value as the seed (or as close as reasonable).',
    `- MANDATORY: Every generated question MUST have difficulty "${enforcedDifficulty}". Do NOT vary the difficulty across variants.`,
    sectionDesc ? `- MANDATORY: Every question MUST be in CBSE ${sectionDesc}. Match the question format, length, and style strictly.` : '',
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
    requestedSection ? `      "section": "${requestedSection}",` : '',
    '      "bloomSkill": "Remembering | Understanding | Applying | Analysing | Evaluating | Creating"',
    '    }',
    '  ]',
    '}',
    '',
    'Do not include explanations, answers, or any text outside this JSON.',
  ].filter(l => l !== '');

  return { userPrompt: lines.join('\n'), numVariants };
}

  return {
    buildLearnSeedContext,
    buildLearnTeachFallback,
    buildLearnSolveWithMeFallback,
    buildConversationalTeachSystemPrompt,
    buildStructuredFallback,
    buildLearnKeyDefinitionsPrompt,
    buildLearnProofPrompt,
    buildLearnMindmapPrompt,
    buildMoreLikeThisUserPrompt,
  };
}
module.exports = { createLearnPrompts };
