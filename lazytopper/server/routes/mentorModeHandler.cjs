function createMentorModeHandler(deps) {
  const {
    normalizeIncomingMode, isTeachTabPayload, isLearnMisconceptionPayload,
    isLearnCompetencyPayload, isLearnMindmapPayload, isProofWritingPayload,
    isLearnKeyDefinitionsPayload, isTrianglesEvaluationRequest,
    isTrianglesBsreEnabled, isTrianglesTopic,
    extractStudentAttempt,
    buildPlanUserPrompt, buildSolveUserPrompt, buildExplainUserPrompt,
    buildGrindTrianglesUserPrompt, buildGrindTopicContractFallback,
    buildMisconceptionExplainPrompt, buildCompetencyTeachPrompt,
    buildMindmapTeachPrompt, buildSolveWithMeProtocolPrompt,
    buildBoardStepsMSPrompt, buildLearnTeachContractPrompt,
    buildLearnKeyDefinitionsPrompt, buildLearnMindmapPrompt,
    buildLearnProofPrompt, buildCoachUserPrompt,
    buildConversationalTeachSystemPrompt,
    buildTrianglesEvaluationPrompt,
    buildTrianglesGrindContractPrompt,
    validateMentorImagePayload,
  } = deps;

  function classifyRequest(reqJson, payload, mode) {
    const isMisconceptionExplain = isLearnMisconceptionPayload(payload);
    const isCompetencyExplain = isLearnCompetencyPayload(payload);
    const isConversationalTeach = Boolean(payload?.conversational);
    const isTeachTab = isTeachTabPayload(payload);
    const isMindmapTeach = isLearnMindmapPayload(payload);
    const isProofWriting = isProofWritingPayload(payload);
    const isLearnKeyDefinitions = isLearnKeyDefinitionsPayload(payload);
    const solveStyle = String(payload?.solveStyle || '').toLowerCase();
    const isTrianglesEvaluation = isTrianglesEvaluationRequest(payload, reqJson?.messages);
    const trianglesAttempt = isTrianglesEvaluation ? extractStudentAttempt(payload, reqJson?.messages) : '';
    const trianglesFlag = isTrianglesBsreEnabled();
    const isConceptTeach = mode === 'concept_teach';

    const mentorImageCheck = validateMentorImagePayload(payload);
    const mentorImage = mentorImageCheck && mentorImageCheck.ok ? mentorImageCheck : null;
    const imageError = !mentorImage && mentorImageCheck.error !== 'NO_IMAGE' ? mentorImageCheck.error : null;

    return {
      isMisconceptionExplain, isCompetencyExplain, isConversationalTeach,
      isTeachTab, isMindmapTeach, isProofWriting, isLearnKeyDefinitions,
      solveStyle, isTrianglesEvaluation, trianglesAttempt, trianglesFlag,
      isConceptTeach, mentorImage, imageError,
    };
  }

  function resolveNormalisedMode(mode, flags) {
    const { isConceptTeach, isTeachTab, isMindmapTeach, isMisconceptionExplain,
            isCompetencyExplain, isTrianglesEvaluation, isLearnKeyDefinitions,
            isProofWriting, solveStyle } = flags;

    let normalisedMode = normalizeIncomingMode(mode) || mode;
    if (isConceptTeach) normalisedMode = 'learn_teach';
    if (isTeachTab && !isConceptTeach) normalisedMode = 'learn_teach';
    else if (isMindmapTeach) normalisedMode = 'learn_mindmap';
    if (isMisconceptionExplain || isCompetencyExplain) normalisedMode = 'explain';
    if (isTrianglesEvaluation) normalisedMode = 'solve_with_me';
    if (isLearnKeyDefinitions && solveStyle === 'board') normalisedMode = 'learn_teach';
    if (isProofWriting && solveStyle === 'board') normalisedMode = 'learn_proof';
    return normalisedMode;
  }

  function buildSystemPrompt(normalisedMode, persona, flags, payload) {
    const { isMisconceptionExplain, isCompetencyExplain, isConversationalTeach,
            isConceptTeach, isMindmapTeach, isTrianglesEvaluation } = flags;

    let systemPrompt = '';
    if (persona && typeof persona === 'object') {
      if (Array.isArray(persona.coreRules)) systemPrompt += persona.coreRules.join('\n') + '\n';
      if (Array.isArray(persona.modes)) {
        const cfg = persona.modes.find((m) => m && m.id === normalisedMode);
        if (cfg && cfg.systemPrompt) systemPrompt += cfg.systemPrompt;
      }
    }

    const isGrindContractMode = normalisedMode === 'grind_triangles_v1';
    if (isGrindContractMode) {
      return { systemPrompt: buildTrianglesGrindContractPrompt(payload), handlerOverride: 'triangles_grind_contract' };
    }

    if (!systemPrompt) {
      const PROMPTS = {
        plan: 'You are a CBSE Class 10 study planner. Create realistic, chapter-wise plans using the given context. CBSE 2025-26: "Constructions" removed from Maths. Two-exam system — Phase 1 (compulsory), Phase 2 (optional, up to 3 subjects, best score counts).',
        solve: 'You are an expert CBSE Class 10 tutor. Use Socratic, step-by-step reasoning and end with a clear final answer. CBSE 2025-26: "Constructions" removed from Maths syllabus.',
        explain: 'You are a CBSE Class 10 concept explainer. Explain topics in simple steps, aligning with board exam style. CBSE 2025-26: "Constructions" removed from Maths syllabus.',
        learn_teach: 'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for key definitions. CBSE 2025-26: "Constructions" removed from Maths syllabus.',
        learn_mindmap: 'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for mindmap teaching. CBSE 2025-26: "Constructions" removed from Maths syllabus.',
        learn_proof: 'You are a strict CBSE Class 10 proof-writing teacher. Return only the required JSON schema. CBSE 2025-26: "Constructions" removed from Maths syllabus.',
        coach: 'You are a supportive CBSE exam coach and mindset mentor. Provide practical strategies and encouragement. CBSE 2025-26: Two-exam system — Phase 1 (compulsory), Phase 2 (optional, up to 3 subjects, best score counts). "Constructions" removed from Maths.',
        mindset: 'You are a supportive CBSE exam coach and mindset mentor. Provide practical strategies and encouragement. CBSE 2025-26: Two-exam system — Phase 1 (compulsory), Phase 2 (optional, up to 3 subjects, best score counts). "Constructions" removed from Maths.',
      };
      systemPrompt = PROMPTS[normalisedMode] || 'You are a helpful CBSE Class 10 tutor for Maths and Science. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
    }

    if (isMisconceptionExplain) {
      systemPrompt = 'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for misconceptions.';
    } else if (isCompetencyExplain) {
      systemPrompt = 'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for competencies.';
    } else if (isConceptTeach || isConversationalTeach) {
      systemPrompt = buildConversationalTeachSystemPrompt(payload, isConceptTeach);
    } else if (isTeachTabPayload(payload)) {
      systemPrompt = 'You are a strict CBSE Class 10 teacher. Return only the LearnTeachContract JSON schema.';
    } else if (isMindmapTeach) {
      systemPrompt = 'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for mindmap node teaching.';
    } else if (isTrianglesEvaluation) {
      systemPrompt = 'You are a strict but supportive CBSE Class 10 examiner. Provide concise marking feedback only.';
    }

    return { systemPrompt, handlerOverride: null };
  }

  function buildUserPrompt(normalisedMode, payload, flags, reqJson) {
    const { isTrianglesEvaluation, isMisconceptionExplain, isCompetencyExplain,
            isMindmapTeach, isConceptTeach, isConversationalTeach } = flags;

    if (isTrianglesEvaluation) {
      const attempt = extractStudentAttempt(payload, reqJson?.messages);
      return buildTrianglesEvaluationPrompt(payload, attempt);
    }

    switch (normalisedMode) {
      case 'plan': return buildPlanUserPrompt(payload);
      case 'solve': return buildSolveUserPrompt(payload);
      case 'solve_with_me': return buildSolveWithMeProtocolPrompt(payload);
      case 'board_steps_ms': return buildBoardStepsMSPrompt(payload);
      case 'learn_teach': {
        if (isConceptTeach || isConversationalTeach) {
          const topicName = (payload.topic || payload.topicKey || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const stepIdx = Number(payload.stepIndex) || 0;
          const studentText = payload.attempt_loop?.student_attempt?.raw_text || '';
          const cCtx = payload.conceptContext || {};
          const conceptName = String(cCtx.subtopic || cCtx.concept || '').trim() || topicName;
          if (stepIdx === 0) {
            const parts = [`Teach the CBSE Class ${payload.grade || 10} concept "${conceptName}"${conceptName !== topicName ? ` (from ${topicName})` : ''}, directly and concisely.`];
            if (cCtx.questionText) parts.push(`It was opened from this question: "${cCtx.questionText}".`);
            parts.push(`Stay strictly on "${conceptName}". Lead with substance (no greeting/preamble/analogy opener), organize by marks with concrete board-style examples, and end with exactly ONE step-marking follow-up offer fitted to the concept.`);
            return parts.join('\n');
          } else if (studentText) {
            return `The student said: "${studentText}".\nAnswer that directly, staying strictly on "${conceptName}". If they accepted your step-marking offer, give the step-by-step solution to your own example with per-step CBSE marks (correctness first). No fluff, no preamble.`;
          }
          return `Continue teaching "${conceptName}" — the next concrete board-style point, staying on "${conceptName}", ending with one fitting follow-up offer. No fluff.`;
        }
        return isTeachTabPayload(payload)
          ? buildLearnTeachContractPrompt(payload)
          : buildLearnKeyDefinitionsPrompt(payload);
      }
      case 'learn_mindmap': return buildLearnMindmapPrompt(payload);
      case 'learn_proof': return buildLearnProofPrompt(payload);
      case 'explain':
        return isMisconceptionExplain ? buildMisconceptionExplainPrompt(payload)
          : isCompetencyExplain ? buildCompetencyTeachPrompt(payload)
          : isMindmapTeach ? buildMindmapTeachPrompt(payload)
          : buildExplainUserPrompt(payload);
      case 'coach':
      case 'mindset': return buildCoachUserPrompt(payload);
      case 'grind_triangles_v1': return buildGrindTrianglesUserPrompt(payload);
      default: return null;
    }
  }

  return {
    classifyRequest,
    resolveNormalisedMode,
    buildSystemPrompt,
    buildUserPrompt,
  };
}

module.exports = { createMentorModeHandler };
