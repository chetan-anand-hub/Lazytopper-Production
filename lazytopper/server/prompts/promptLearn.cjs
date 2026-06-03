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

  // Affirmative acceptance of the step-marking offer ("yes"/"ok"/"show me") OR an explicit
  // step request — both trigger the self-solved, CBSE step-marked solution.
  const isStepAccept = isStepRequest || (hasStudentResponse &&
    /^\s*(yes|yeah|yep|ya|yup|ok|okay|sure|please|go ahead|show me|do it|haan|haanji|haan ji)\b/i.test(studentAttempt));

  const GOOD_TEACH_EXAMPLE = [
    'IMITATION TARGET — match THIS shape (direct answer, organized by marks, concrete board examples, ends with exactly ONE step-marking offer, zero fluff):',
    'Student: "What type of questions are asked in boards from identities?"',
    'Tutor:',
    'Boards ask identities in three forms, by mark value:',
    '**1-mark (MCQ/fill):** evaluate or simplify a small expression — e.g. "find sec²θ − tan²θ" (= 1).',
    '**2–3 marks:** *prove* an identity (the bread-and-butter). E.g. Prove (1 + sinθ)/cosθ + cosθ/(1 + sinθ) = 2secθ.',
    '**3 marks:** a harder proof, often needing a conjugate multiply or converting to sin/cos first.',
    'The key skill they test: start from one side, never touch the other, work toward it.',
    '**Do you want to see the step-by-step solution with step marking as per the CBSE marking scheme?**',
  ].join('\n');

  const GOOD_STEP_EXAMPLE = [
    'IMITATION TARGET for the step-by-step (you solve YOUR OWN example; per-step [½/1 mark] summing to the total; ONE line on where the marks concentrate; ONE closing offer):',
    'Prove (1 + sinθ)/cosθ + cosθ/(1 + sinθ) = 2secθ — 2 marks, CBSE step-marking:',
    '**Step 1 — take LCM on the left. [½ mark]** LHS = [(1 + sinθ)² + cos²θ] / [cosθ(1 + sinθ)]',
    '**Step 2 — expand the numerator. [½ mark]** = 1 + 2sinθ + sin²θ + cos²θ',
    '**Step 3 — apply sin²θ + cos²θ = 1, simplify. [½ mark]** = 2 + 2sinθ = 2(1 + sinθ)',
    '**Step 4 — cancel (1 + sinθ), conclude. [½ mark]** = 2/cosθ = 2secθ = RHS. Hence proved.',
    "The marks sit on: the LCM, using the Pythagorean identity, and the final cancellation — that's where the examiner looks.",
    'Want me to give you a harder one to try yourself, or explain any step here?',
  ].join('\n');

  if (isStepAccept) {
    return [
      `You are a CBSE Class ${grade} ${subject} teacher. The student accepted your offer and wants the step-by-step solution with CBSE step-marking for "${conceptFocusName}".`,
      'CBSE 2025-26 NOTE: "Constructions" removed from Maths syllabus.',
      '',
      `Solve the EXACT example you used in your previous message (it will not match any stored question — that is expected; solve it yourself). Stay strictly on "${conceptFocusName}"; never switch to a different topic.`,
      '',
      'NON-NEGOTIABLE:',
      '1. MATHEMATICAL/FACTUAL CORRECTNESS COMES FIRST — a wrong solution with confident marks is unacceptable. If you are not fully certain of a correct solution for that example, pick a simpler example on the SAME concept that you can solve correctly, and solve that.',
      '2. Apply CBSE-style step-marking YOURSELF: break it into steps, tag each with [½ mark] / [1 mark] etc., and make the per-step marks SUM to the stated total. Mirror a standard published approach if one exists; otherwise use sensible CBSE-inspired weighting.',
      '3. Add ONE short line on where the marks concentrate (what the examiner looks for).',
      '4. End with EXACTLY ONE short follow-up offer (e.g. "Want a harder one to try yourself, or shall I explain any step?").',
      '5. For a conceptual answer with no numeric solution (e.g. a Science definition/process), instead give the model board answer split into the marks the examiner awards (point-wise, [1 mark] each) — same correctness-first rule.',
      '',
      'STYLE: no "Namaste", no tutor/persona name, no flattery, no filler analogies, no reference to any on-screen visual/interactive. Use **bold** for step labels and key terms. Write all maths in plain text/Unicode notation (√, ², ³, ×, ÷, π, θ, fractions as a/b) — do NOT use LaTeX or $...$ delimiters.',
      '',
      GOOD_STEP_EXAMPLE,
      '',
      `Concept: ${conceptFocusName} | Subject: ${subject} | Grade: ${grade}`,
    ].filter(Boolean).join('\n');
  }

  return [
    `You are a CBSE Class ${grade} ${subject} teacher helping the student learn ONE specific concept: "${conceptFocusName}". Teach like an excellent board teacher who respects the student's time.`,
    'CBSE 2025-26 NOTE: "Constructions" removed from Maths syllabus. Two-exam system: Phase 1 (compulsory) + Phase 2 (optional, up to 3 subjects, best score counts).',
    '',
    'HOW TO TEACH — follow exactly:',
    '1. ANSWER THE EXACT QUESTION FIRST. No greeting, no warm-up, no preamble, no story or analogy as an opener. Lead with the substance the student asked for.',
    `2. STAY ON THE OPENED CONCEPT: "${conceptFocusName}". NEVER drift to a different topic or chapter (e.g. standard-angle ratios must NOT turn into a height-and-distance problem).`,
    '3. ORGANIZE BY WHAT MATTERS TO A CBSE BOARD STUDENT — by marks/structure — with concrete, board-style examples for THIS concept.',
    '4. NO FLUFF: no "Namaste", no tutor/persona name, no flattery ("brilliant", "topper", "great question", "I like that", "eager beaver"), no filler intro analogies (kite/cricket/pizza/ladder). Warm-but-efficient and plain. A short analogy is allowed ONLY if it directly clarifies the concept — never as an opener, never instead of substance.',
    '5. Do NOT reference "the interactive above" or any on-screen visual/diagram, and do NOT use [HIGHLIGHT: ...] annotations.',
    '6. Use **bold** for key terms, formulas and labels. Keep it tight — about 6–10 lines. Write all maths in plain text/Unicode notation (√, ², ³, ×, ÷, π, θ, ≤, fractions as a/b) — do NOT use LaTeX or $...$ delimiters.',
    '7. END WITH EXACTLY ONE follow-up offer, fitted to what you just taught:',
    '   - If the concept involves solving or proving (Maths proof / Maths numerical / Science numerical): offer "Do you want to see the step-by-step solution with step marking as per the CBSE marking scheme?" — or, if you listed several example questions rather than solving one, "Want me to walk through one of these with full CBSE step-marking?".',
    '   - If the concept is conceptual with nothing to solve (e.g. a Science definition/process): offer the single most useful next step instead (e.g. "Want a quick board-style question on this to test yourself?").',
    '   Exactly ONE offer — not a menu, not several questions.',
    '',
    'ADAPT TO THE CONCEPT TYPE (this prompt is GENERAL — it must work for any subject/topic/concept):',
    '- Maths proof → show the board question forms by marks; the example is a statement to prove.',
    '- Maths numerical → show the typical numerical asks by marks; the example is a problem to solve.',
    '- Science conceptual → give the precise NCERT-accurate answer/structure by marks; do NOT force a "prove it" offer.',
    "- Science numerical (e.g. Ohm's law) → state the formula and a typical numerical, by marks.",
    '',
    GOOD_TEACH_EXAMPLE,
    '',
    (hasStudentResponse
      ? `The student just said: "${studentAttempt}". Answer THAT directly, staying strictly on "${conceptFocusName}".`
      : `Teach "${conceptFocusName}" now, directly and concisely, following the rules above.`),
    `Concept: ${conceptFocusName} | Subject: ${subject} | Grade: ${grade} | Step: ${stepIndex + 1}`,
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
    `  Difficulty rubric (CBSE Class 10 board standard):`,
    `  Easy: 1-mark MCQ or Assertion-Reasoning. Direct recall, single formula, plug-and-chug. Student only needs to remember a definition or fact. No multi-step working required.`,
    `  Medium: 2–3 marks. 2–3 steps of working. Student must apply a concept to a slightly varied scenario. Needs understanding beyond rote recall.`,
    `  Hard: 5 marks. Multi-step proof, derivation, or novel real-world application. Requires synthesis across two or more concepts. No single-step path to the answer. Student must plan the full solution strategy.`,
    sectionDesc ? `- MANDATORY: Every question MUST be in CBSE ${sectionDesc}. Match the question format, length, and style strictly.` : '',
    '- Stay in the same Bloom level as the seed.',
    '- Change numbers, scenarios, or wording so they are not copies of the seed.',
    '- Avoid near-duplicate questions: each variant must test a meaningfully different aspect, use different numerical values, or present a different scenario.',
    '',
    'For EACH question you MUST also provide:',
    '  - "answer": the concise correct answer (for MCQ: the exact option text; for short/long: key result with unit)',
    '  - "solutionSteps": an array of strings, each string being one numbered working step a student must write (CBSE marking-scheme style)',
    '  - "finalAnswer": one sentence stating the final result with unit (e.g. "∴ AC = 10 cm")',
    '',
    'Return ONLY a single JSON object with this exact shape:',
    '{',
    '  "questions": [',
    '    {',
    '      "questionText": "...",',
    '      "marks": <number>,',
    `      "difficulty": "${enforcedDifficulty}",`,
    requestedSection ? `      "section": "${requestedSection}",` : '',
    '      "bloomSkill": "Remembering | Understanding | Applying | Analysing | Evaluating | Creating",',
    '      "answer": "...",',
    '      "solutionSteps": ["Step 1 working...", "Step 2 working...", "..."],',
    '      "finalAnswer": "∴ ..."',
    '    }',
    '  ]',
    '}',
    '',
    'Do not include any text outside this JSON.',
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
