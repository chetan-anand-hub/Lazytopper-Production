const { createMentorPrompts } = require('../prompts/mentorPrompts.cjs');
const { createMentorClassifiers } = require('./mentorClassifiers.cjs');
const { createMentorDiagramHelpers } = require('./mentorDiagramHelpers.cjs');
const { createMentorTeachHelpers } = require('./mentorTeachHelpers.cjs');
const { createMentorBsre } = require('./mentorBsre.cjs');
const { createMentorResponseBuilder } = require('./mentorResponseBuilder.cjs');
const { createMentorModeHandler } = require('./mentorModeHandler.cjs');
const { findVisualForTopicFromStore } = require('../services/topicVisualLookup.cjs');

function createMentorRoute(deps) {
  const {
    sendJson, sendJsonWithHeaders, readJson, extractJsonObjectFromText,
    tutorCache,
    callGemini, callGeminiStream, callClaude, toClaudeMessages, selectModelForRequest,
    telemetry,
    GEMINI_MODEL, GEMINI_TUTOR_MODEL, CLAUDE_MODEL_SONNET, CLAUDE_MODEL_HAIKU,
    ACTIVE_PROVIDER, STUB_MODE, HAS_ANTHROPIC_PROXY, IS_DEV,
    TEACH_CACHE_TTL_MS, MAX_HISTORY_TURNS,
    CORS_ORIGIN,
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
    VISUALS_DIR,
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
  const promptFns = createMentorPrompts(promptDeps);
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
  } = promptFns;

  bindLateDeps(
    { adaptMindmapToLearnTeachContract, adaptLegacyLearnTeachToContract, ensureTeachContractShape, buildTeachDiagramObject },
    { shouldRequireDiagram, diagramLineForExplain }
  );

  const modeHandler = createMentorModeHandler({
    normalizeIncomingMode, isTeachTabPayload, isLearnMisconceptionPayload,
    isLearnCompetencyPayload, isLearnMindmapPayload, isProofWritingPayload,
    isLearnKeyDefinitionsPayload, isTrianglesEvaluationRequest,
    isTrianglesBsreEnabled, isTrianglesTopic,
    extractStudentAttempt, validateMentorImagePayload,
    buildPlanUserPrompt, buildSolveUserPrompt, buildExplainUserPrompt,
    buildGrindTrianglesUserPrompt, buildGrindTopicContractFallback,
    buildMisconceptionExplainPrompt, buildCompetencyTeachPrompt,
    buildMindmapTeachPrompt, buildSolveWithMeProtocolPrompt,
    buildBoardStepsMSPrompt, buildLearnTeachContractPrompt,
    buildLearnKeyDefinitionsPrompt, buildLearnMindmapPrompt,
    buildLearnProofPrompt, buildCoachUserPrompt,
    buildConversationalTeachSystemPrompt,
    buildTrianglesEvaluationPrompt, buildTrianglesGrindContractPrompt,
  });

  const responseBuilder = createMentorResponseBuilder({
    callGemini, callClaude, toClaudeMessages,
    GEMINI_MODEL, GEMINI_TUTOR_MODEL, HAS_ANTHROPIC_PROXY, IS_DEV,
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
    findVisualForTopicFromStore,
    VISUALS_DIR,
  });

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
    const payload = {
      subject: reqJson.subject, grade: reqJson.grade,
      topicKey: reqJson.topicKey, topic: reqJson.topic,
      daysLeft: reqJson.daysLeft, targetPercent: reqJson.targetPercent,
      hoursPerDay: reqJson.hoursPerDay, extraNotes: reqJson.extraNotes,
      marks: reqJson.marks,
      questionText: reqJson.questionText || reqJson.question || reqJson.prompt || '',
      section: reqJson.section, subSection: reqJson.subSection,
      selectedTab: reqJson.selectedTab, solveStyle: reqJson.solveStyle,
      nodeId: reqJson.nodeId,
    };
    if (reqJson.imageBase64) payload.imageBase64 = reqJson.imageBase64;
    if (reqJson.imageMimeType) payload.imageMimeType = reqJson.imageMimeType;
    if (reqJson.imageName) payload.imageName = reqJson.imageName;
    return { mode, persona, payload };
  }

  async function handleMentorRequest(req, res) {
    let reqJson;
    try { reqJson = await readJson(req); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }

    const { mode, persona, payload } = normalizeMentorRequest(reqJson);
    const flags = modeHandler.classifyRequest(reqJson, payload, mode);
    const { mentorImage, imageError, isTrianglesEvaluation, trianglesAttempt,
            trianglesFlag, isMisconceptionExplain, isCompetencyExplain,
            isConversationalTeach, isMindmapTeach } = flags;

    if (imageError) {
      return sendJson(res, 400, { ok: false, error: `Invalid image: ${imageError}` });
    }

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
        const trace = { normalized_mode: 'triangles_evaluation', handler_used: 'triangles_bsre', schema_used: 'schema_triangles_bsre', repair_used: false };
        let orchestrated = orchestrateTutorResponse({ mode: 'triangles_evaluation', payload, messages: reqJson?.messages, structuredDraft: bsreStructured, trace });
        orchestrated = attachTutorDiagramIntent(orchestrated, payload);
        return sendJson(res, 200, { ok: true, data: { text: JSON.stringify(orchestrated), structured: orchestrated, trace } });
      }
    } else {
      console.info(`[LEGACY_ENTRY] flag=${trianglesFlag ? 'true' : 'false'} no_provider=${noProvider}`);
      telemetry.increment('legacy_entry');
    }

    if (!mode) return sendJson(res, 400, { error: 'Missing "mode" in request body' });

    const normalisedMode = modeHandler.resolveNormalisedMode(mode, flags);
    let handlerUsed = persona && typeof persona === 'object' ? 'persona_prompt' : `prompt_builder:${normalisedMode}`;
    if (isTrianglesEvaluation) handlerUsed = 'triangles_evaluation';

    if (normalisedMode === 'grind_topic_v1') {
      const contract = buildGrindTopicContractFallback(payload);
      if (!contract) return sendJson(res, 500, { error: 'Failed to prepare topic grind contract.' });
      return sendJson(res, 200, { ok: true, data: { text: JSON.stringify(contract), structured: contract, trace: { normalized_mode: normalisedMode, handler_used: 'topic_grind_contract', schema_used: 'schema_grind_topic_v1', repair_used: false, deterministic: true } } });
    }

    if (stubMode) {
      const isTeachContract = isTeachContractRequest(payload, normalisedMode);
      let structured = isStructuredMode(normalisedMode) ? buildStubTutorStructured(normalisedMode, payload) : null;
      if (isTeachContract) structured = buildLearnTeachFallback(payload);
      if (structured) {
        if (isTeachContract) {
          const teachCheck = validateLearnTeachContract(structured, payload);
          if (!teachCheck.ok) structured = buildLearnTeachFallback(payload);
        } else if (['learn_teach', 'learn_mindmap', 'learn_proof'].includes(normalisedMode)) {
          const tutorCheck = validateTutorStructured(normalisedMode, structured, payload);
          if (!tutorCheck.ok) structured = buildTutorFallback(normalisedMode, payload);
        }
        structured = orchestrateTutorResponse({ mode: normalisedMode, payload, messages: reqJson?.messages, structuredDraft: structured });
        const stubAttemptText = extractStudentAttempt(payload, reqJson?.messages);
        if (stubAttemptText && isTrianglesTopic(payload)) {
          structured.attempt_loop = buildAttemptLoopHeuristic(payload, stubAttemptText);
        }
        structured = attachTutorDiagramIntent(structured, payload);
      }
      const text = structured ? JSON.stringify(structured) : buildStubText();
      return sendJson(res, 200, { ok: true, data: { text, structured, trace: { normalized_mode: normalisedMode, handler_used: handlerUsed, schema_used: structured ? (isTeachContract ? 'schema_learn_teach_contract' : `schema_${normalisedMode}`) : 'text', repair_used: false, stub_used: true } } });
    }

    const { systemPrompt, handlerOverride } = modeHandler.buildSystemPrompt(normalisedMode, persona, flags, payload);
    if (handlerOverride) handlerUsed = handlerOverride;

    let userPrompt;
    try {
      userPrompt = modeHandler.buildUserPrompt(normalisedMode, payload, flags, reqJson);
      if (userPrompt === null) return sendJson(res, 400, { error: `Unsupported mode: ${mode}` });
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
      return sendJson(res, 200, { ok: true, data: { text: JSON.stringify({ message: 'LT_NO_PROVIDER guard active; deterministic response provided.', noProvider: true }), structured: null, trace: { normalized_mode: normalisedMode, handler_used: handlerUsed, schema_used: 'text', repair_used: false, fallback_used: true } } });
    }

    const isTeachContract = isTeachContractRequest(payload, normalisedMode);
    const buildMentorResponse = () => responseBuilder.buildMentorResponse({
      systemPrompt, userPrompt, payload, normalisedMode, reqJson,
      mentorImage, isConversationalTeach, isTeachContract,
      isTrianglesEvaluation, isMisconceptionExplain, isCompetencyExplain,
      isMindmapTeach, routingDecision, handlerUsed,
    });

    // Tutor Q&A semantic cache — only for non-image, non-teach-contract, cacheable modes.
    let _cacheFingerprint = null;
    let _cacheQuestionNorm = null;
    const _cacheSubject = String(payload?.subject || '').trim();
    const _cacheTopicKey = String(payload?.topicKey || payload?.topic || '').trim();
    const _canUseQACache = tutorCache && !mentorImage && !isTeachContract && !isTrianglesEvaluation
      && tutorCache.isCacheableMode(normalisedMode) && originalQuery.length >= 10;

    if (_canUseQACache) {
      try {
        const cacheResult = await tutorCache.lookup(normalisedMode, originalQuery, _cacheSubject);
        if (cacheResult?.response) {
          const cachedData = cacheResult.response;
          telemetry.increment('tutor_cache_hit');
          return sendJson(res, 200, {
            ok: true,
            data: {
              text: typeof cachedData.text === 'string' ? cachedData.text : JSON.stringify(cachedData.structured || cachedData),
              structured: cachedData.structured || null,
              trace: { normalized_mode: normalisedMode, handler_used: handlerUsed, schema_used: cachedData.schema_used || 'text', repair_used: false, qa_cache_hit: true },
            },
          });
        }
        if (cacheResult) {
          _cacheFingerprint = cacheResult.fingerprint;
          _cacheQuestionNorm = cacheResult.questionNormalized;
        }
      } catch (e) {
        console.warn('[mentor] tutor-cache lookup error (non-fatal):', e.message);
      }
    }

    try {
      if (isTeachContract) {
        const cacheKey = buildTeachContractCacheKey(payload);
        const cached = teachCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
          return sendJson(res, 200, { ok: true, data: { text: cached.text, structured: cached.structured, trace: { normalized_mode: normalisedMode, handler_used: handlerUsed, schema_used: 'schema_learn_teach_contract', repair_used: false, teach_contract: true, cache_hit: true, coalesced: false, json_extracted: true } } });
        }
        if (cached) teachCache.delete(cacheKey);

        const inflight = inflightTeach.get(cacheKey);
        if (inflight) {
          const result = await inflight;
          if (result?.body?.data?.trace && result.status === 200) { result.body.data.trace.cache_hit = false; result.body.data.trace.coalesced = true; result.body.data.trace.teach_contract = true; }
          return sendJson(res, result.status, result.body);
        }

        const promise = buildMentorResponse();
        inflightTeach.set(cacheKey, promise);
        let result;
        try { result = await promise; } finally { inflightTeach.delete(cacheKey); }
        if (result?.status === 200 && result.structured) {
          teachCache.set(cacheKey, { structured: result.structured, text: result.text, expiresAt: Date.now() + TEACH_CACHE_TTL_MS });
        }
        if (result?.body?.data?.trace && result.status === 200) { result.body.data.trace.cache_hit = false; result.body.data.trace.coalesced = false; result.body.data.trace.teach_contract = true; }
        return sendJson(res, result.status, result.body);
      }

      const result = await buildMentorResponse();
      // Save to tutor Q&A cache on success (fire-and-forget).
      if (_canUseQACache && _cacheFingerprint && _cacheQuestionNorm && result?.status === 200 && result?.body?.data) {
        const { text, structured } = result.body.data;
        void tutorCache.save(
          _cacheFingerprint, normalisedMode, _cacheSubject, _cacheTopicKey,
          _cacheQuestionNorm, { text, structured, schema_used: result.body.data.trace?.schema_used || 'text' }
        );
      }
      return sendJson(res, result.status, result.body);
    } catch (err) {
      if (err && err.status === 429) {
        const retryAfterSec = 20;
        let fallbackStructured = isTeachContract ? buildLearnTeachFallback(payload) : (isStructuredMode(normalisedMode) ? buildTutorFallback(normalisedMode, payload) : null);
        if (fallbackStructured && typeof fallbackStructured === 'object') {
          fallbackStructured = orchestrateTutorResponse({ mode: normalisedMode, payload, messages: reqJson?.messages, structuredDraft: fallbackStructured });
        }
        const fallbackAttemptText = extractStudentAttempt(payload, reqJson?.messages);
        if (fallbackStructured && typeof fallbackStructured === 'object' && fallbackAttemptText && isTrianglesTopic(payload)) {
          fallbackStructured.attempt_loop = buildAttemptLoopHeuristic(payload, fallbackAttemptText);
        }
        const fallbackBase = fallbackStructured && typeof fallbackStructured === 'object' ? fallbackStructured : { tutor: { text: 'Mentor is rate-limited. Please wait 20 seconds and retry.' } };
        const fallback = attachTutorDiagramIntent(fallbackBase, payload);
        return sendJsonWithHeaders(res, 429, { error: 'Mentor is rate-limited. Please wait and retry.', retryAfterSec, data: { structured: fallback, trace: { rate_limited: true, retry_after_sec: retryAfterSec, teach_contract: Boolean(isTeachContract) } } }, { 'Retry-After': String(retryAfterSec) });
      }
      console.error(err);
      return sendJson(res, 500, { error: 'Failed to query the AI service', details: err.message });
    }
  }

  async function handleMentorStreamRequest(req, res) {
    let reqJson;
    try { reqJson = await readJson(req); } catch {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const { mode, persona, payload } = normalizeMentorRequest(reqJson);
    const flags = modeHandler.classifyRequest(reqJson, payload, mode);
    const { isConversationalTeach, imageError } = flags;

    if (imageError) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      return res.end(JSON.stringify({ error: `Invalid image: ${imageError}` }));
    }

    if (!isConversationalTeach) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      return res.end(JSON.stringify({ error: 'Streaming is only supported for conversational mode. Use /api/mentor for structured modes.' }));
    }

    const stubMode = isStubMode();
    if (stubMode || !callGeminiStream) {
      res.writeHead(503, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      return res.end(JSON.stringify({ error: 'Streaming not available in stub mode.' }));
    }

    if (!mode) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      return res.end(JSON.stringify({ error: 'Missing "mode" in request body' }));
    }

    const normalisedMode = modeHandler.resolveNormalisedMode(mode, flags);
    const { systemPrompt } = modeHandler.buildSystemPrompt(normalisedMode, persona, flags, payload);

    let userPrompt;
    try {
      userPrompt = modeHandler.buildUserPrompt(normalisedMode, payload, flags, reqJson);
      if (userPrompt === null) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
        return res.end(JSON.stringify({ error: `Unsupported mode: ${mode}` }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': CORS_ORIGIN });
      return res.end(JSON.stringify({ error: 'Invalid payload' }));
    }

    const history = toGeminiContents(reqJson && reqJson.messages);
    const contents = [
      { role: 'user', parts: [{ text: String(systemPrompt || '').trim() }] },
      { role: 'model', parts: [{ text: 'Understood. I will teach as Ravi Sir using the Socratic method with examples and questions.' }] },
      ...history,
      { role: 'user', parts: [{ text: String(userPrompt || '').trim() }] },
    ].filter((c) => c && c.parts && c.parts[0] && String(c.parts[0].text || '').trim());

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': CORS_ORIGIN,
      'X-Accel-Buffering': 'no',
    });

    const sendEvent = (data) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch { /* ignore write errors on closed connection */ }
    };

    let fullText = '';
    try {
      const tokenStream = callGeminiStream(GEMINI_TUTOR_MODEL, contents, {
        maxOutputTokens: 4096,
        temperature: 0.7,
      });
      for await (const token of tokenStream) {
        if (res.writableEnded) break;
        fullText += token;
        sendEvent({ token });
      }

      const topicKeyRaw = payload && (payload.topic || payload.topicKey || '');
      const subjectRaw = payload && (payload.subject || 'Maths');
      const serverVisual = (VISUALS_DIR && findVisualForTopicFromStore)
        ? findVisualForTopicFromStore(topicKeyRaw, subjectRaw, VISUALS_DIR)
        : null;

      sendEvent({ done: true, responseText: fullText.trim(), visual: serverVisual || null });
    } catch (err) {
      console.error('[mentor/stream] error:', err?.message || err);
      const isTimeout = err && (err.status === 504 || /timed out/i.test(err.message || ''));
      sendEvent({ error: isTimeout ? 'Ravi Sir is taking too long. Please retry.' : (err.message || 'Stream error') });
    } finally {
      if (!res.writableEnded) res.end();
    }
  }

  return { handleMentorRequest, handleMentorStreamRequest, buildMoreLikeThisUserPrompt, ensureDiagramFields };
}

module.exports = { createMentorRoute };
