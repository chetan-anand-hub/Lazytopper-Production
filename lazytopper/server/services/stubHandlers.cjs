function createStubHandlers(deps) {
  const {
    STUB_MODE, isObjectiveType, isNoProviderEnabled,
    buildTutorFallback, loadTrianglesMentorSeed, normalizeLines, mergeLines,
    getEnsureDiagramFields,
  } = deps;

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
    const ensureDiagramFields = getEnsureDiagramFields();
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
      marks,
      difficulty,
      bloomSkill,
    };
  });
  return { subject, topicKey, variants, model: 'stub' };
}

function buildFallbackSteps(answer, explanation, totalMarks, qType, section, subject) {
  const isObj = isObjectiveType(qType, section);

  if (isObj || totalMarks <= 1) {
    const isAR = /assertion/i.test(qType || '');
    return {
      totalMarks,
      steps: [
        {
          stepNumber: 1,
          description: isAR ? 'Evaluating assertion and reason' : 'Correct answer',
          working: answer || 'Identify the correct option based on the concept.',
          marks: totalMarks,
        },
        ...(explanation ? [{
          stepNumber: 2,
          description: 'Why this is correct',
          working: explanation,
          marks: 0,
        }] : []),
      ],
      commonMistakes: isAR
        ? ['Assuming both A and R are correct means R explains A — check the causal link separately', 'Not reading each statement independently before checking the relationship']
        : ['Not reading all options before marking — similar-sounding options trap you', 'Confusing related concepts (e.g., HCF vs LCM, displacement vs distance)'],
      examTip: isAR
        ? 'Read Assertion and Reason independently first. Then check: does R actually explain A? Many students pick (a) without verifying the causal link.'
        : 'For MCQs: read all 4 options first, eliminate obviously wrong ones, then pick. No negative marking in CBSE — never leave blank.',
    };
  }

  const combined = [answer, explanation].filter(Boolean).join('. ');
  const sentences = combined.split(/[.;]\s+|\n+/).map(s => s.trim()).filter(s => s.length > 5);

  const stepLabels2 = ['Writing the approach', 'Solving and writing the final answer'];
  const stepLabels3 = ['Writing the given information and formula', 'Applying the method / computing', 'Writing the final answer with conclusion'];
  const stepLabels5 = ['Writing given data and what is to be found', 'Stating the formula / theorem / definition', 'Setting up the equation / applying the concept', 'Solving step by step', 'Writing the final answer with proper conclusion'];

  const labels = totalMarks <= 2 ? stepLabels2 : totalMarks <= 3 ? stepLabels3 : stepLabels5;
  const stepCount = Math.min(labels.length, Math.max(2, sentences.length));
  const steps = [];
  const useHalf = totalMarks >= 2;

  for (let i = 0; i < stepCount; i++) {
    const isSetup = i === 0;
    const isConclusion = i === stepCount - 1;
    let m = (useHalf && (isSetup || isConclusion)) ? 0.5 : 1;
    steps.push({
      stepNumber: i + 1,
      description: labels[i] || 'Step ' + (i + 1),
      working: sentences[i] || (labels[i] || ''),
      marks: m,
    });
  }

  const sum = steps.reduce((a, s) => a + s.marks, 0);
  if (sum !== totalMarks && steps.length > 0) {
    const diff = totalMarks - sum;
    const mid = Math.floor(steps.length / 2);
    steps[mid].marks = Math.max(0.5, steps[mid].marks + diff);
  }

  const isMaths = /math/i.test(subject || '');
  return {
    totalMarks,
    steps,
    commonMistakes: isMaths
      ? ['Not writing the formula before substituting — CBSE deducts ½ mark', 'Missing units or not stating "rejected" for negative values in word problems']
      : ['Not writing balanced equations with state symbols (s/l/g/aq)', 'Using informal language instead of NCERT-standard key terms'],
    examTip: totalMarks <= 2
      ? (isMaths ? 'For 2-mark questions: show formula + substitution + answer. Even partial working can earn 1 mark.' : 'For 2-mark questions: define the concept clearly, then state the answer with key terms from NCERT.')
      : (isMaths ? 'CBSE board pattern: Given → Formula → Substitution → Calculation → Final Answer with units. Each step carries marks independently.' : 'CBSE board pattern: Define → State equation/law → Explain mechanism → Conclude. Use NCERT key terms exactly.'),
  };
}

function buildStubStepSolution(question, totalMarks, subject, qType, section) {
  const isObj = isObjectiveType(qType, section);
  const isMaths = /math/i.test(subject);

  if (isObj || totalMarks <= 1) {
    const isAR = /assertion/i.test(qType || '');
    return {
      totalMarks,
      steps: [
        {
          stepNumber: 1,
          description: isAR ? 'Evaluating assertion and reason independently' : 'Identifying the correct option',
          working: isAR
            ? 'Read the Assertion (A) and Reason (R) separately. Check if each is true/false. Then check if R correctly explains A.'
            : 'Read all options carefully. Apply the relevant concept to identify the correct answer.',
          marks: totalMarks,
        },
      ],
      commonMistakes: isAR
        ? ['Assuming both correct means R explains A — check the causal link', 'Not evaluating Assertion and Reason independently first']
        : ['Not reading all options before answering — similar options can trap you', 'Confusing related but different concepts (e.g., HCF vs LCM)'],
      examTip: isAR
        ? 'Assertion-Reason: evaluate each statement on its own FIRST. Then check whether R is the correct explanation of A. Many students assume (a) without verifying.'
        : 'MCQ strategy: eliminate 2 obviously wrong options first, then choose between remaining 2. No negative marking — never leave any MCQ blank.',
      model: 'stub',
    };
  }

  const stepTemplates = isMaths ? [
    { desc: 'Writing the given information', work: 'Given: [extract data from the question]. To find: [what is asked].', m: 0.5 },
    { desc: 'Stating the formula / theorem', work: 'Using the relevant formula: [formula]. This is a standard NCERT result.', m: 0.5 },
    { desc: 'Substituting the values and computing', work: 'Substituting the given values into the formula and simplifying step by step.', m: 1 },
    { desc: 'Solving further / simplifying', work: 'Performing the arithmetic/algebraic computation to reach the result.', m: 1 },
    { desc: 'Writing the final answer with conclusion', work: 'Therefore, the required answer = [value] [units]. (with proper concluding statement)', m: 0.5 },
  ] : [
    { desc: 'Identifying the concept / phenomenon', work: 'This question involves [concept]. Definition: [key term definition from NCERT].', m: 0.5 },
    { desc: 'Writing the relevant equation / principle', work: 'The relevant equation/principle: [balanced equation with state symbols / scientific law].', m: 1 },
    { desc: 'Explaining the process / mechanism', work: 'The process works as follows: [step-by-step mechanism as per NCERT].', m: 1 },
    { desc: 'Stating the observation / conclusion', work: 'Therefore, [observation/conclusion]. This is because [reason linked to concept].', m: 0.5 },
    { desc: 'Writing the final answer with key terms', work: 'Final answer: [concise answer using NCERT terminology and units where applicable].', m: 0.5 },
  ];

  let stepsUsed = stepTemplates.slice(0, Math.max(2, Math.min(stepTemplates.length, totalMarks <= 2 ? 3 : totalMarks <= 3 ? 4 : 5)));
  const rawSum = stepsUsed.reduce((a, s) => a + s.m, 0);
  const scale = totalMarks / rawSum;
  const steps = stepsUsed.map((t, i) => {
    let m = Math.round(t.m * scale * 2) / 2;
    if (m < 0.5) m = 0.5;
    return { stepNumber: i + 1, description: t.desc, working: t.work, marks: m };
  });
  const actualSum = steps.reduce((a, s) => a + s.marks, 0);
  if (actualSum !== totalMarks) {
    const diff = totalMarks - actualSum;
    const midIdx = Math.floor(steps.length / 2);
    steps[midIdx].marks = Math.max(0.5, steps[midIdx].marks + diff);
  }

  return {
    totalMarks,
    steps,
    commonMistakes: isMaths ? [
      'Not writing the formula before substituting values — loses ½ mark in CBSE marking scheme',
      'Skipping "Given" and "To Find" — examiner cannot award setup marks',
      'Missing units or not rejecting invalid values (e.g., negative length)',
    ] : [
      'Not writing balanced chemical equations with state symbols (s/l/g/aq) — loses ½ mark',
      'Using informal language instead of NCERT-standard terminology',
      'Not labelling diagrams or missing arrows in ray diagrams',
    ],
    examTip: isMaths
      ? (totalMarks <= 2
        ? 'For 2-mark questions: show formula + substitution + answer. Even partial working earns 1 mark.'
        : 'CBSE board pattern: Given → Formula → Substitution → Calculation → Final Answer with units. Each step carries marks independently — never skip any.')
      : (totalMarks <= 2
        ? 'For 2-mark questions: state the definition/concept, then give the answer with key NCERT terms.'
        : 'CBSE board pattern: Define → State equation/law → Explain mechanism → Conclude. Use NCERT key terms exactly as written.'),
    model: 'stub',
  };
}


/**
 * Read request body as JSON.
 * @param {import('http').IncomingMessage} req
 */

function isStubMode() {
  return STUB_MODE || isNoProviderEnabled();
}

  return {
    buildStubTutorStructured,
    buildStubText,
    buildStubMoreLikeThis,
    buildFallbackSteps,
    buildStubStepSolution,
    isStubMode,
  };
}

module.exports = { createStubHandlers };
