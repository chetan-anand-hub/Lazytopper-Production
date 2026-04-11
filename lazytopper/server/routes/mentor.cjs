const { createMentorPrompts } = require('../prompts/mentorPrompts.cjs');
const { createMentorClassifiers } = require('./mentorClassifiers.cjs');
const { createMentorDiagramHelpers } = require('./mentorDiagramHelpers.cjs');
const { createMentorTeachHelpers } = require('./mentorTeachHelpers.cjs');
const { createMentorBsre } = require('./mentorBsre.cjs');
const { createMentorResponseBuilder } = require('./mentorResponseBuilder.cjs');

function createMentorRoute(deps) {
  const {
    sendJson, sendJsonWithHeaders, readJson, extractJsonObjectFromText,
    callGemini, callClaude, toClaudeMessages, selectModelForRequest,
    telemetry,
    GEMINI_MODEL, CLAUDE_MODEL_SONNET, CLAUDE_MODEL_HAIKU,
    ACTIVE_PROVIDER, STUB_MODE, HAS_ANTHROPIC_PROXY, IS_DEV,
    TEACH_CACHE_TTL_MS, MAX_HISTORY_TURNS,
    tryParseJsonStrict,
    loadTrianglesMentorSeed, normalizeLines, mergeLines,
    validateTutorStructured, buildTutorFallback, validateAttemptLoop,
    initHintState, computeNextHint, scoreRubric,
    retrieveTrianglesSources, getDiagramTemplate, resolveTopicTeachContract,
    orchestrateTutorResponse,
    buildTrianglesGrindContractPrompt,
    buildGeminiImagePart, validateMentorImagePayload,
    trianglesRubricMap,
    isStubMode, buildStubTutorStructured, buildStubText,
    FEEDBACK_DIR, FEEDBACK_FILE,
  } = deps;

  const teachCache = new Map();
  const inflightTeach = new Map();

  const classifiers = createMentorClassifiers();
  const {
    isValidMentorProtocol, summarizeValidationIssues, normalizeMentorStudentProfile,
    normalizeTopicKeyInput, resolvePriorityGrindTopicKey, toTitleCaseFromTopicKey,
    isLearnMisconceptionPayload, isLearnCompetencyPayload,
    STRUCTURED_MODES, MODE_ALIASES, normalizeIncomingMode, isStructuredMode,
    isLearnKeyDefinitionsPayload, isLearnMindmapPayload, isTeachTabPayload,
    isProofWritingPayload, isTrianglesLearnPayload, isTrianglesTopic,
    flattenToLower, isTrianglesBsreEnabled, isNoProviderEnabled,
  } = classifiers;

  const diagramHelpers = createMentorDiagramHelpers(classifiers);
  const {
    inferDiagramType,
    getDiagramTopicText, isTeachOrBoardPayload, isNonNegotiableDiagramTopic,
    shouldRequireDiagram, diagramLabelsForType, diagramSpecForPayload,
    attachTutorDiagramIntent, diagramLineForExplain, formatDoubtContext,
    normalizeBoardSteps, getLastUserMessage,
    isTrianglesEvaluationRequest, extractStudentAttempt,
    classifyAttemptStatus, attemptStatusToConfidence,
    getProofFocus, getProofMaxLines, proofTemplateForFocus,
    containsDisallowedProofPhrases, containsProofHeadings, hasProofSectionsInOrder,
    countNonEmptyLines,
  } = diagramHelpers;

  const teachHelpers = createMentorTeachHelpers({ ...classifiers, MAX_HISTORY_TURNS });
  const {
    isTeachContractRequest, toStringArray, ensureMinArray,
    toSingleLine, enforceTeacherGoal, normalizeTeachKeyIdeas,
    enforceCheckpointQuestion, enforceCheckpointAnswer, enforceCommonMistake,
    toLabelArray, coerceLearnTeachContractStructured, getLearnTeachContractSchemaText,
    hasMindmapTeachSections, containsPlaceholderLanguage,
    hasCompetencySections, fallbackCompetencyResponse, sanitizeExplainOutput,
    hasMisconceptionSections, fallbackMisconceptionResponse,
    toGeminiContents, getLearnSeedPack,
    bindLateDeps,
  } = teachHelpers;

  const bsreModule = createMentorBsre({ ...classifiers, trianglesRubricMap, telemetry });
  const {
    getBsreEvaluator, determineBsreRubricId, normalizeNumber,
    buildBsreStructured, runBsreEvaluation,
  } = bsreModule;

function buildTeachContractCacheKey(payload) {
  if (!payload || typeof payload !== 'object') return 'teach_contract|unknown';
  const subject = String(payload.subject || '').trim();
  const grade = payload.grade != null ? String(payload.grade) : '';
  const topicKey = String(payload.topicKey || payload.chapter || payload.topic || '').trim();
  const nodeId = String(payload.mindmapNodeId || payload.nodeId || '').trim();
  const stepIndex = payload.stepIndex != null ? String(payload.stepIndex) : '';
  const vibe = String(payload.vibe || '').trim();
  return ['teach_contract', subject, grade, topicKey, nodeId, stepIndex, vibe].join('|');
}




function normalizeMentorRequest(reqJson) {
  const mode = reqJson.mode;
  const persona = reqJson.persona || null;

  if (reqJson.payload && typeof reqJson.payload === 'object') {
    return { mode, persona, payload: reqJson.payload };
  }

  // Flat/legacy support
  const payload = {
    subject: reqJson.subject,
    grade: reqJson.grade,
    topicKey: reqJson.topicKey,
    topic: reqJson.topic,
    daysLeft: reqJson.daysLeft,
    targetPercent: reqJson.targetPercent,
    hoursPerDay: reqJson.hoursPerDay,
    extraNotes: reqJson.extraNotes,
    marks: reqJson.marks,
    questionText: reqJson.questionText || reqJson.question || reqJson.prompt || '',
    section: reqJson.section,
    subSection: reqJson.subSection,
    selectedTab: reqJson.selectedTab,
    solveStyle: reqJson.solveStyle,
    nodeId: reqJson.nodeId,
  };
  if (reqJson.imageBase64) payload.imageBase64 = reqJson.imageBase64;
  if (reqJson.imageMimeType) payload.imageMimeType = reqJson.imageMimeType;
  if (reqJson.imageName) payload.imageName = reqJson.imageName;

  return { mode, persona, payload };
}

const promptDeps = {
  isValidMentorProtocol, normalizeMentorStudentProfile, normalizeTopicKeyInput,
  resolvePriorityGrindTopicKey, toTitleCaseFromTopicKey,
  isProofWritingPayload, isTrianglesLearnPayload, shouldRequireDiagram,
  inferDiagramType, diagramLabelsForType, diagramSpecForPayload, diagramLineForExplain,
  formatDoubtContext, classifyAttemptStatus, attemptStatusToConfidence,
  getProofFocus, getProofMaxLines, proofTemplateForFocus,
  containsDisallowedProofPhrases, containsProofHeadings,
  hasProofSectionsInOrder, countNonEmptyLines, isTeachContractRequest,
  toStringArray, ensureMinArray, enforceTeacherGoal,
  normalizeTeachKeyIdeas, enforceCheckpointQuestion, enforceCheckpointAnswer,
  enforceCommonMistake, toLabelArray, getLearnTeachContractSchemaText,
  containsPlaceholderLanguage, getLearnSeedPack,
  validateAttemptLoop, validateTutorStructured, buildTutorFallback,
  initHintState, computeNextHint, scoreRubric,
  retrieveTrianglesSources, resolveTopicTeachContract,
};
const {
  buildPlanUserPrompt, buildSolveUserPrompt, buildExplainUserPrompt,
  buildGrindTrianglesUserPrompt, buildGenericTopicGrindProfile,
  buildGrindTopicContractFallback, buildMisconceptionExplainPrompt,
  buildCompetencyTeachPrompt, buildMindmapTeachPrompt,
  ensureDiagramLineInText, ensureDiagramFields,
  buildAttemptLoopHeuristic, buildProofWritingAddendum,
  validateProofSolveWithMe, buildDiagramFields, buildTeachDiagramObject,
  ensureTeachContractShape, validateLearnTeachContract,
  buildDeterministicExamLines, buildDeterministicCheckQuestion,
  adaptLegacyLearnTeachToContract, adaptMindmapToLearnTeachContract,
  buildLearnTeachContractPrompt, validateStructuredForMode,
  buildRepairPromptForMode, buildProofFallbackBoardSteps,
  buildProofFallbackSolveWithMe, getJsonSchemaTextForMode,
  buildTrianglesEvaluationPrompt, validateTrianglesEvaluation,
  buildTrianglesEvaluationRepairPrompt, buildTrianglesEvaluationFallback,
  buildCoachUserPrompt, buildSolveWithMeProtocolPrompt,
  buildBoardStepsMSPrompt, buildLearnSeedContext,
  buildLearnTeachFallback, buildLearnSolveWithMeFallback,
  buildConversationalTeachSystemPrompt, buildStructuredFallback,
  buildLearnKeyDefinitionsPrompt, buildLearnProofPrompt,
  buildLearnMindmapPrompt, buildMoreLikeThisUserPrompt,
  inferMentorStudentProfileForPrompt, buildMentorBehaviorContract,
  buildMentorRuntimeRouteContext,
} = createMentorPrompts(promptDeps);

bindLateDeps(
  { adaptMindmapToLearnTeachContract, adaptLegacyLearnTeachToContract, ensureTeachContractShape, buildTeachDiagramObject },
  { shouldRequireDiagram, diagramLineForExplain }
);

const responseBuilder = createMentorResponseBuilder({
  callGemini, callClaude, toClaudeMessages,
  GEMINI_MODEL, HAS_ANTHROPIC_PROXY, IS_DEV,
  tryParseJsonStrict, extractJsonObjectFromText,
  buildGeminiImagePart,
  isStructuredMode, isValidMentorProtocol,
  validateStructuredForMode, buildRepairPromptForMode,
  getLearnTeachContractSchemaText,
  buildLearnTeachFallback, coerceLearnTeachContractStructured,
  buildStructuredFallback, buildTutorFallback,
  validateTutorStructured,
  orchestrateTutorResponse,
  buildAttemptLoopHeuristic,
  attachTutorDiagramIntent,
  normalizeBoardSteps, ensureDiagramFields,
  extractStudentAttempt, isTrianglesTopic, isTrianglesLearnPayload,
  validateTrianglesEvaluation,
  buildTrianglesEvaluationRepairPrompt, buildTrianglesEvaluationFallback,
  sanitizeExplainOutput,
  hasMisconceptionSections, fallbackMisconceptionResponse,
  hasCompetencySections, fallbackCompetencyResponse,
  hasMindmapTeachSections,
  ensureDiagramLineInText,
  summarizeValidationIssues,
  toGeminiContents,
});

async function handleMentorRequest(req, res) {
  let reqJson;
  try {
    reqJson = await readJson(req);
  } catch (e) {
    return sendJson(res, 400, { error: 'Invalid JSON' });
  }

    const { mode, persona, payload } = normalizeMentorRequest(reqJson);
    const mentorImageCheck = validateMentorImagePayload(payload);
    const mentorImage =
      mentorImageCheck && mentorImageCheck.ok ? mentorImageCheck : null;
    if (!mentorImage && mentorImageCheck.error !== 'NO_IMAGE') {
      return sendJson(res, 400, {
        ok: false,
        error: `Invalid image: ${mentorImageCheck.error}`,
      });
    }
    const isMisconceptionExplain = isLearnMisconceptionPayload(payload);
    const isCompetencyExplain = isLearnCompetencyPayload(payload);
    const isConversationalTeach = Boolean(payload?.conversational);
    const isTeachTab = isTeachTabPayload(payload);
    const isMindmapTeach = isLearnMindmapPayload(payload);
    const isProofWriting = isProofWritingPayload(payload);
    const isLearnKeyDefinitions = isLearnKeyDefinitionsPayload(payload);
    const solveStyle = String(payload?.solveStyle || '').toLowerCase();
    const isTrianglesEvaluation = isTrianglesEvaluationRequest(payload, reqJson?.messages);
    const trianglesAttempt = isTrianglesEvaluation
      ? extractStudentAttempt(payload, reqJson?.messages)
      : '';
    const trianglesFlag = isTrianglesBsreEnabled();
    const stubMode = isStubMode();
    const noProvider = stubMode;
    const shouldRunBsre = !stubMode && isTrianglesEvaluation && trianglesFlag && trianglesAttempt;
    if (shouldRunBsre) {
      const bsreRubricId = determineBsreRubricId(payload);
      console.info(`[BSRE_ENTRY] flag=true rubric=${bsreRubricId} no_provider=${noProvider}`);
      telemetry.increment('bsre_entry');
      if (noProvider) telemetry.increment('bsre_no_provider');
      let bsreStructured = null;
      try {
        bsreStructured = runBsreEvaluation(payload, trianglesAttempt, bsreRubricId);
      } catch (err) {
        telemetry.increment('bsre_eval_error');
        console.warn('[bsre] evaluation failed, falling back to Gemini:', err?.message || err);
      }
      if (bsreStructured) {
        const trace = {
          normalized_mode: 'triangles_evaluation',
          handler_used: 'triangles_bsre',
          schema_used: 'schema_triangles_bsre',
          repair_used: false,
        };
        let orchestrated = orchestrateTutorResponse({
          mode: 'triangles_evaluation',
          payload,
          messages: reqJson?.messages,
          structuredDraft: bsreStructured,
          trace,
        });
        orchestrated = attachTutorDiagramIntent(orchestrated, payload);
        return sendJson(res, 200, {
          ok: true,
          data: {
            text: JSON.stringify(orchestrated),
            structured: orchestrated,
            trace,
          },
        });
      }
    } else {
      console.info(`[LEGACY_ENTRY] flag=${trianglesFlag ? 'true' : 'false'} no_provider=${noProvider}`);
      telemetry.increment('legacy_entry');
    }

    if (!mode) return sendJson(res, 400, { error: 'Missing "mode" in request body' });

    const isConceptTeach = mode === 'concept_teach';
    let normalisedMode = normalizeIncomingMode(mode) || mode;
    if (isConceptTeach) normalisedMode = 'learn_teach';
    if (isTeachTab && !isConceptTeach) normalisedMode = 'learn_teach';
    else if (isMindmapTeach) normalisedMode = 'learn_mindmap';
    if (isMisconceptionExplain || isCompetencyExplain) normalisedMode = 'explain';
    if (isTrianglesEvaluation) {
      normalisedMode = 'solve_with_me';
    }
    if (isLearnKeyDefinitions && solveStyle === 'board') normalisedMode = 'learn_teach';
    if (isProofWriting && solveStyle === 'board') normalisedMode = 'learn_proof';

    let handlerUsed = persona && typeof persona === 'object' ? 'persona_prompt' : `prompt_builder:${normalisedMode}`;
    if (isTrianglesEvaluation) handlerUsed = 'triangles_evaluation';
    if (normalisedMode === 'grind_topic_v1') {
      const contract = buildGrindTopicContractFallback(payload);
      if (!contract) {
        return sendJson(res, 500, { error: 'Failed to prepare topic grind contract.' });
      }
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: 'topic_grind_contract',
        schema_used: 'schema_grind_topic_v1',
        repair_used: false,
        deterministic: true,
      };
      return sendJson(res, 200, {
        ok: true,
        data: {
          text: JSON.stringify(contract),
          structured: contract,
          trace,
        },
      });
    }

    if (stubMode) {
      const isTeachContract = isTeachContractRequest(payload, normalisedMode);
      let structured = isStructuredMode(normalisedMode)
        ? buildStubTutorStructured(normalisedMode, payload)
        : null;
      if (isTeachContract) {
        structured = buildLearnTeachFallback(payload);
      }
      if (structured) {
        if (isTeachContract) {
          const teachCheck = validateLearnTeachContract(structured, payload);
          if (!teachCheck.ok) structured = buildLearnTeachFallback(payload);
        } else if (
          normalisedMode === 'learn_teach' ||
          normalisedMode === 'learn_mindmap' ||
          normalisedMode === 'learn_proof'
        ) {
          const tutorCheck = validateTutorStructured(normalisedMode, structured, payload);
          if (!tutorCheck.ok) structured = buildTutorFallback(normalisedMode, payload);
        }
        structured = orchestrateTutorResponse({
          mode: normalisedMode,
          payload,
          messages: reqJson?.messages,
          structuredDraft: structured,
        });
        const stubAttemptText = extractStudentAttempt(payload, reqJson?.messages);
        if (stubAttemptText && isTrianglesTopic(payload)) {
          structured.attempt_loop = buildAttemptLoopHeuristic(payload, stubAttemptText);
        }
        structured = attachTutorDiagramIntent(structured, payload);
      }
      const text = structured ? JSON.stringify(structured) : buildStubText();
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: handlerUsed,
        schema_used: structured
          ? (isTeachContract ? 'schema_learn_teach_contract' : `schema_${normalisedMode}`)
          : 'text',
        repair_used: false,
        stub_used: true,
      };
      return sendJson(res, 200, {
        ok: true,
        data: {
          text,
          structured,
          trace,
        },
      });
    }

    // Build system prompt from persona (if provided as object)
    let systemPrompt = '';
    if (persona && typeof persona === 'object') {
      if (Array.isArray(persona.coreRules)) systemPrompt += persona.coreRules.join('\n') + '\n';
      if (Array.isArray(persona.modes)) {
        const cfg = persona.modes.find((m) => m && m.id === normalisedMode);
        if (cfg && cfg.systemPrompt) systemPrompt += cfg.systemPrompt;
      }
    }

    const isGrindContractMode =
      normalisedMode === 'grind_triangles_v1' || mode === 'grind_triangles_v1';
    if (isGrindContractMode) {
      systemPrompt = buildTrianglesGrindContractPrompt(payload);
      handlerUsed = 'triangles_grind_contract';
    }

    // Fallback defaults
    if (!systemPrompt) {
      switch (normalisedMode) {
        case 'plan':
          systemPrompt =
            'You are a CBSE Class 10 study planner. Create realistic, chapter-wise plans using the given context. CBSE 2025-26: "Constructions" removed from Maths. Two-exam system — Phase 1 (compulsory), Phase 2 (optional, up to 3 subjects, best score counts).';
          break;
        case 'solve':
          systemPrompt =
            'You are an expert CBSE Class 10 tutor. Use Socratic, step-by-step reasoning and end with a clear final answer. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'explain':
          systemPrompt =
            'You are a CBSE Class 10 concept explainer. Explain topics in simple steps, aligning with board exam style. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'learn_teach':
          systemPrompt =
            'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for key definitions. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'learn_mindmap':
          systemPrompt =
            'You are a strict CBSE Class 10 teacher. Return only the required JSON schema for mindmap teaching. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'learn_proof':
          systemPrompt =
            'You are a strict CBSE Class 10 proof-writing teacher. Return only the required JSON schema. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
          break;
        case 'coach':
        case 'mindset':
          systemPrompt =
            'You are a supportive CBSE exam coach and mindset mentor. Provide practical strategies and encouragement. CBSE 2025-26: Two-exam system — Phase 1 (compulsory), Phase 2 (optional, up to 3 subjects, best score counts). "Constructions" removed from Maths.';
          break;
        default:
          systemPrompt = 'You are a helpful CBSE Class 10 tutor for Maths and Science. CBSE 2025-26: "Constructions" removed from Maths syllabus.';
      }
    }
    if (isMisconceptionExplain) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for misconceptions.';
    } else if (isCompetencyExplain) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for competencies.';
    } else if (isConceptTeach || isConversationalTeach) {
      systemPrompt = buildConversationalTeachSystemPrompt(payload, isConceptTeach);
    } else if (isTeachTabPayload(payload)) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Return only the LearnTeachContract JSON schema.';
    } else if (isMindmapTeach) {
      systemPrompt =
        'You are a strict CBSE Class 10 teacher. Output must follow the exact five-section format for mindmap node teaching.';
    } else if (isTrianglesEvaluation) {
      systemPrompt =
        'You are a strict but supportive CBSE Class 10 examiner. Provide concise marking feedback only.';
    }

    // Build user prompt
    let userPrompt = '';
    try {
      if (isTrianglesEvaluation) {
        const attempt = extractStudentAttempt(payload, reqJson?.messages);
        userPrompt = buildTrianglesEvaluationPrompt(payload, attempt);
      } else switch (normalisedMode) {
        case 'plan':
          userPrompt = buildPlanUserPrompt(payload);
          break;
        case 'solve':
          userPrompt = buildSolveUserPrompt(payload);
          break;
        case 'solve_with_me':
          userPrompt = buildSolveWithMeProtocolPrompt(payload);
          break;
        case 'board_steps_ms':
          userPrompt = buildBoardStepsMSPrompt(payload);
          break;
        case 'learn_teach':
          if (isConceptTeach || isConversationalTeach) {
            const topicName = (payload.topic || payload.topicKey || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            const stepIdx = Number(payload.stepIndex) || 0;
            const studentText = payload.attempt_loop?.student_attempt?.raw_text || '';
            const cCtx = payload.conceptContext || {};
            if (stepIdx === 0 && isConceptTeach && (cCtx.questionText || cCtx.subtopic)) {
              const parts = [`Teach the concept behind this specific question from "${topicName}".`];
              if (cCtx.questionText) parts.push(`The question was: "${cCtx.questionText}"`);
              if (cCtx.subtopic) parts.push(`Subtopic: ${cCtx.subtopic}`);
              parts.push('Start with Phase 1: explain the NCERT theory for this specific concept with a real-life analogy and end with a check question.');
              userPrompt = parts.join('\n');
            } else if (stepIdx === 0) {
              userPrompt = `Start teaching "${topicName}" to a CBSE Class ${payload.grade || 10} student. This is the very first message — introduce the topic with a real-life example and ask an engaging opening question.`;
            } else if (studentText) {
              userPrompt = `The student responded: "${studentText}"\n\nAcknowledge their response, explain further with a new example, and ask the next question.`;
            } else {
              userPrompt = `Continue teaching "${topicName}" — move to the next concept with a worked example and a question.`;
            }
          } else {
            userPrompt = isTeachTabPayload(payload)
              ? buildLearnTeachContractPrompt(payload)
              : buildLearnKeyDefinitionsPrompt(payload);
          }
          break;
        case 'learn_mindmap':
          userPrompt = buildLearnMindmapPrompt(payload);
          break;
        case 'learn_proof':
          userPrompt = buildLearnProofPrompt(payload);
          break;
        case 'explain':
          userPrompt = isMisconceptionExplain
            ? buildMisconceptionExplainPrompt(payload)
            : isCompetencyExplain
            ? buildCompetencyTeachPrompt(payload)
            : isMindmapTeach
            ? buildMindmapTeachPrompt(payload)
            : buildExplainUserPrompt(payload);
          break;
        case 'coach':
        case 'mindset':
          userPrompt = buildCoachUserPrompt(payload);
          break;
        case 'grind_triangles_v1':
          userPrompt = buildGrindTrianglesUserPrompt(payload);
          break;
        default:
          return sendJson(res, 400, { error: `Unsupported mode: ${mode}` });
      }
    } catch (e) {
      console.error('[mentor] Prompt build error:', e?.message, e?.stack);
      return sendJson(res, 400, { error: 'Invalid payload' });
    }

    let originalQuery = payload?.questionText || payload?.studentQuestion || payload?.prompt || payload?.question || '';
    if (!originalQuery && Array.isArray(reqJson?.messages) && reqJson.messages.length > 0) {
      const lastUserMsg = [...reqJson.messages].reverse().find(m => m?.role === 'user');
      originalQuery = String(lastUserMsg?.content || '').trim();
    }
    const routingDecision = selectModelForRequest(normalisedMode, originalQuery);

    const history = toGeminiContents(reqJson && reqJson.messages);
    const contents = [
      { role: 'user', parts: [{ text: String(systemPrompt || '').trim() }] },
      ...history,
      { role: 'user', parts: [{ text: String(userPrompt || '').trim() }] },
    ].filter((c) => c && c.parts && c.parts[0] && String(c.parts[0].text || '').trim());

    if (noProvider) {
      console.info('[NO_PROVIDER_SKIP_PROVIDER]=1');
      telemetry.increment('provider_skipped');
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: handlerUsed,
        schema_used: 'text',
        repair_used: false,
        fallback_used: true,
      };
      return sendJson(res, 200, {
        ok: true,
        data: {
          text: JSON.stringify({
            message: 'LT_NO_PROVIDER guard active; deterministic response provided.',
            noProvider: true,
          }),
          structured: null,
          trace,
        },
      });
    }

    const isTeachContract = isTeachContractRequest(payload, normalisedMode);

    const buildMentorResponse = async () => {
      return responseBuilder.buildMentorResponse({
        systemPrompt, userPrompt, payload, normalisedMode, reqJson,
        mentorImage, isConversationalTeach, isTeachContract,
        isTrianglesEvaluation, isMisconceptionExplain, isCompetencyExplain,
        isMindmapTeach, routingDecision, handlerUsed,
      });
    };

    try {
      if (isTeachContract) {
        const cacheKey = buildTeachContractCacheKey(payload);
        const cached = teachCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          const trace = {
            normalized_mode: normalisedMode,
            handler_used: handlerUsed,
            schema_used: 'schema_learn_teach_contract',
            repair_used: false,
            teach_contract: true,
            cache_hit: true,
            coalesced: false,
            json_extracted: true,
          };
          return sendJson(res, 200, {
            ok: true,
            data: {
              text: cached.text,
              structured: cached.structured,
              trace,
            },
          });
        }
        if (cached) teachCache.delete(cacheKey);

        const inflight = inflightTeach.get(cacheKey);
        if (inflight) {
          const result = await inflight;
          if (result?.body?.data?.trace && result.status === 200) {
            result.body.data.trace.cache_hit = false;
            result.body.data.trace.coalesced = true;
            result.body.data.trace.teach_contract = true;
          }
          return sendJson(res, result.status, result.body);
        }

        const promise = buildMentorResponse();
        inflightTeach.set(cacheKey, promise);
        let result;
        try {
          result = await promise;
        } finally {
          inflightTeach.delete(cacheKey);
        }
        if (result?.status === 200 && result.structured) {
          teachCache.set(cacheKey, {
            structured: result.structured,
            text: result.text,
            expiresAt: Date.now() + TEACH_CACHE_TTL_MS,
          });
        }
        if (result?.body?.data?.trace && result.status === 200) {
          result.body.data.trace.cache_hit = false;
          result.body.data.trace.coalesced = false;
          result.body.data.trace.teach_contract = true;
        }
        return sendJson(res, result.status, result.body);
      }

      const result = await buildMentorResponse();
      return sendJson(res, result.status, result.body);
    } catch (err) {
      if (err && err.status === 429) {
        const retryAfterSec = 20;
        let fallbackStructured = null;
        if (isTeachContract) {
          fallbackStructured = buildLearnTeachFallback(payload);
        } else if (isStructuredMode(normalisedMode)) {
          fallbackStructured = buildTutorFallback(normalisedMode, payload);
        }
        if (fallbackStructured && typeof fallbackStructured === 'object') {
          fallbackStructured = orchestrateTutorResponse({
            mode: normalisedMode,
            payload,
            messages: reqJson?.messages,
            structuredDraft: fallbackStructured,
          });
        }
        const fallbackAttemptText = extractStudentAttempt(payload, reqJson?.messages);
        if (
          fallbackStructured &&
          typeof fallbackStructured === 'object' &&
          fallbackAttemptText &&
          isTrianglesTopic(payload)
        ) {
          fallbackStructured.attempt_loop = buildAttemptLoopHeuristic(payload, fallbackAttemptText);
        }
        const fallbackBase =
          fallbackStructured && typeof fallbackStructured === 'object'
            ? fallbackStructured
            : { tutor: { text: 'Mentor is rate-limited. Please wait 20 seconds and retry.' } };
        const fallback = attachTutorDiagramIntent(fallbackBase, payload);
        return sendJsonWithHeaders(
          res,
          429,
          {
            error: 'Mentor is rate-limited. Please wait and retry.',
            retryAfterSec,
            data: {
              structured: fallback,
              trace: { rate_limited: true, retry_after_sec: retryAfterSec, teach_contract: Boolean(isTeachContract) },
            },
          },
          { 'Retry-After': String(retryAfterSec) }
        );
      }
      console.error(err);
      return sendJson(res, 500, {
        error: 'Failed to query the AI service',
        details: err.message,
      });
    }
  }

  return {
    handleMentorRequest,
    buildMoreLikeThisUserPrompt,
    ensureDiagramFields,
  };
}

module.exports = { createMentorRoute };
