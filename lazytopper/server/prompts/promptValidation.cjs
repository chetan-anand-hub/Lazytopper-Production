function createValidationPrompts(ctx) {
  const {
    isValidMentorProtocol, isProofWritingPayload, isTeachContractRequest,
    containsDisallowedProofPhrases, containsProofHeadings, getProofMaxLines,
    diagramLabelsForType, getLearnTeachContractSchemaText,
    inferDiagramType, validateLearnTeachContract,
    validateAttemptLoop, validateProofSolveWithMe, validateTutorStructured,
  } = ctx;

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

  return {
    validateStructuredForMode,
    buildRepairPromptForMode,
    getJsonSchemaTextForMode,
    buildTrianglesEvaluationPrompt,
    validateTrianglesEvaluation,
    buildTrianglesEvaluationRepairPrompt,
    buildTrianglesEvaluationFallback,
  };
}
module.exports = { createValidationPrompts };
