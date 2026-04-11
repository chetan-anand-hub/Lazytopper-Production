function createGrindPrompts(ctx) {
  const {
    PRIORITY_GRIND_TOPIC_PROFILES, PRIORITY_GRIND_TOPIC_ALIASES,
    MINDMAP_NODE_TO_CORE_ID, MINDMAP_TEACH_OUTLINES, TRIANGLES_LEARN_SEED,
    normalizeTopicKeyInput, resolvePriorityGrindTopicKey, toTitleCaseFromTopicKey,
    isProofWritingPayload, isTrianglesLearnPayload, shouldRequireDiagram,
    diagramLabelsForType, diagramLineForExplain, formatDoubtContext,
    inferMentorStudentProfileForPrompt, buildMentorBehaviorContract, buildMentorRuntimeRouteContext,
    inferDiagramType, buildLearnSeedContext, buildProofWritingAddendum,
  } = ctx;

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

  return {
    buildGrindTrianglesUserPrompt,
    buildGenericTopicGrindProfile,
    buildGrindTopicContractFallback,
    buildMisconceptionExplainPrompt,
    buildCompetencyTeachPrompt,
    buildMindmapTeachPrompt,
    buildCoachUserPrompt,
    buildSolveWithMeProtocolPrompt,
    buildBoardStepsMSPrompt,
  };
}
module.exports = { createGrindPrompts };
