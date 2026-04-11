function createCorePrompts(ctx) {
  const { normalizeMentorStudentProfile, shouldRequireDiagram, diagramLineForExplain, formatDoubtContext } = ctx;

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

  return {
    buildPlanUserPrompt,
    buildSolveUserPrompt,
    inferMentorStudentProfileForPrompt,
    buildMentorBehaviorContract,
    buildMentorRuntimeRouteContext,
    buildExplainUserPrompt,
  };
}
module.exports = { createCorePrompts };
