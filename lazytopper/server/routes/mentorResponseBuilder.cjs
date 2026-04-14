function createMentorResponseBuilder(deps) {
  const {
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
  } = deps;

  function callRoutedModel(routingDecision, reqJson, model, geminiContents, config, sysPrompt) {
    if (routingDecision.provider === 'claude' && HAS_ANTHROPIC_PROXY) {
      const claudeMsgs = toClaudeMessages(reqJson && reqJson.messages);
      claudeMsgs.push({ role: 'user', content: String(config._userPrompt || '') });
      const claudeConfig = {
        maxTokens: config.maxOutputTokens || 1024,
        temperature: config.temperature,
      };
      return callClaude(routingDecision.model, claudeMsgs, sysPrompt || '', claudeConfig);
    }
    return callGemini(model, geminiContents, config);
  }

  async function buildMentorResponse(ctx) {
    const {
      systemPrompt, userPrompt, payload, normalisedMode, reqJson,
      mentorImage, isConversationalTeach, isTeachContract,
      isTrianglesEvaluation, isMisconceptionExplain, isCompetencyExplain,
      isMindmapTeach, routingDecision, handlerUsed,
    } = ctx;

    const marksRaw = payload && (payload.marks ?? payload.totalMarks ?? payload.total_marks);
    const marksNum = Number(marksRaw);
    const safeMarks = Number.isFinite(marksNum) && marksNum > 0 ? marksNum : 5;

    if (isConversationalTeach) {
      const history = toGeminiContents(reqJson && reqJson.messages);
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will teach as Ravi Sir using the Socratic method with examples and questions.' }] },
        ...history,
        { role: 'user', parts: [{ text: userPrompt }] },
      ].filter((c) => c && c.parts && c.parts[0] && String(c.parts[0].text || '').trim());

      const reply = await callRoutedModel(routingDecision, reqJson, GEMINI_TUTOR_MODEL, contents, {
        maxOutputTokens: 1600,
        temperature: 0.7,
        _userPrompt: userPrompt,
      }, systemPrompt);

      const responseText = (reply.text || '').trim();
      const trace = {
        normalized_mode: normalisedMode,
        handler_used: 'conversational_teach',
        schema_used: 'text',
        repair_used: false,
        provider: routingDecision.provider,
        model_used: routingDecision.model,
      };
      return {
        status: 200,
        body: { ok: true, data: { text: responseText, structured: null, responseText, trace } },
        structured: null, trace, text: responseText,
      };
    }

    const maxOutputTokens =
      normalisedMode === 'board_steps_ms' || normalisedMode === 'learn_proof'
        ? Math.min(6000, Math.max(2500, 1200 + Math.round(safeMarks * 240)))
        : normalisedMode === 'learn_teach' ? 3000
          : normalisedMode === 'solve_with_me' ? 2200 : 2000;
    const responseMimeType = isTeachContract ? 'application/json' : undefined;

    const requestParts = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
    if (mentorImage) {
      requestParts.push(
        buildGeminiImagePart({ mimeType: mentorImage.mimeType, base64: mentorImage.base64 })
      );
    }
    const contents = [{ role: 'user', parts: requestParts }];

    const temperature =
      normalisedMode === 'board_steps_ms' || normalisedMode === 'learn_proof' ? 0.3
        : normalisedMode === 'learn_teach' ? 0.55 : 0.6;

    const useGeminiFallback = Boolean(mentorImage) || Boolean(responseMimeType);
    const reply = useGeminiFallback
      ? await callGemini(GEMINI_MODEL, contents, { maxOutputTokens, temperature, responseMimeType })
      : await callRoutedModel(routingDecision, reqJson, GEMINI_MODEL, contents, {
          maxOutputTokens, temperature, _userPrompt: userPrompt,
        }, systemPrompt);

    let finalText = reply.text;
    let structured = null;
    let repairUsed = false;
    let fallbackUsed = false;
    let jsonExtracted = false;
    const schemaUsedTrace = isStructuredMode(normalisedMode)
      ? (isTeachContract ? 'schema_learn_teach_contract' : `schema_${normalisedMode}`)
      : 'text';

    if (isStructuredMode(normalisedMode)) {
      const parseStructured = (text) =>
        isTeachContract ? extractJsonObjectFromText(text) : tryParseJsonStrict(text);
      structured = parseStructured(finalText);
      if (isTeachContract) {
        jsonExtracted = Boolean(structured) || jsonExtracted;
        if (!structured) {
          if (IS_DEV) console.warn('[teach-contract] no JSON returned; triggering repair');
          repairUsed = true;
          const strictRepairPrompt = [
            'Return ONLY VALID JSON object. No markdown. No prose. Output must start with { and end with }.',
            '', 'You MUST follow this JSON schema exactly:', getLearnTeachContractSchemaText(),
          ].join('\n');
          const repairContents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${strictRepairPrompt}` }] },
          ];
        const repaired = await callGemini(GEMINI_TUTOR_MODEL, repairContents, {
            maxOutputTokens, temperature: 0.1, responseMimeType,
          });
          finalText = repaired.text;
          structured = parseStructured(finalText);
          jsonExtracted = Boolean(structured) || jsonExtracted;
          if (!structured) {
            if (IS_DEV) console.warn('[teach-contract] fallback used because model did not return JSON');
            structured = buildLearnTeachFallback(payload);
            fallbackUsed = true;
          }
        }
      }
      const attemptText = extractStudentAttempt(payload, reqJson?.messages);
      const shouldAttachAttemptLoop = Boolean(attemptText) && isTrianglesTopic(payload);
      if (structured && shouldAttachAttemptLoop) {
        structured.attempt_loop = buildAttemptLoopHeuristic(payload, attemptText);
      }
      if (isTeachContract) {
        const coerced = coerceLearnTeachContractStructured(structured, payload);
        structured = coerced.structured;
        if (coerced.usedFallback) fallbackUsed = true;
      }
      const isFirstTurn =
        normalisedMode === 'solve_with_me' && Array.isArray(reqJson?.messages)
          ? reqJson.messages.length <= 1 : false;
      let check = validateStructuredForMode(structured, normalisedMode, payload, { isFirstTurn });
      const isLearnStructured =
        normalisedMode === 'learn_teach' || normalisedMode === 'learn_proof' ||
        normalisedMode === 'learn_mindmap' ||
        (normalisedMode === 'solve_with_me' && isTrianglesLearnPayload(payload));

      if (!check.ok) {
        if (isTeachContract && IS_DEV) {
          console.warn(`[teach-contract] validation failed before repair: ${summarizeValidationIssues(check.issues)}`);
        }
        repairUsed = true;
        const clipped = String(finalText || '').slice(0, 8000);
        const repairPrompt = buildRepairPromptForMode(normalisedMode, payload, clipped, check.issues);
        const repairContents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
        ];
        const repaired = await callGemini(GEMINI_TUTOR_MODEL, repairContents, {
          maxOutputTokens, temperature: 0.2, responseMimeType,
        });
        finalText = repaired.text;
        structured = parseStructured(finalText);
        if (isTeachContract) {
          jsonExtracted = Boolean(structured) || jsonExtracted;
          const coerced = coerceLearnTeachContractStructured(structured, payload);
          structured = coerced.structured;
          if (coerced.usedFallback) fallbackUsed = true;
        }
        check = validateStructuredForMode(structured, normalisedMode, payload, { isFirstTurn });
      }

      if (!check.ok && isLearnStructured && !isTeachContract) {
        repairUsed = true;
        const strictPrompt = buildRepairPromptForMode(
          normalisedMode, payload, String(finalText || '').slice(0, 8000), check.issues
        );
        const strictContents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${strictPrompt}` }] },
        ];
        const strictReply = await callGemini(GEMINI_TUTOR_MODEL, strictContents, {
          maxOutputTokens, temperature: 0.1, responseMimeType,
        });
        finalText = strictReply.text;
        structured = parseStructured(finalText);
        if (isTeachContract) {
          jsonExtracted = Boolean(structured) || jsonExtracted;
        }
        check = validateStructuredForMode(structured, normalisedMode, payload, { isFirstTurn });
      }

      if (!check.ok) {
        if (isTeachContract) {
          if (IS_DEV) {
            console.warn(`[teach-contract] fallback used after validation failure: ${summarizeValidationIssues(check.issues)}`);
          }
          structured = buildLearnTeachFallback(payload);
        } else if (isLearnStructured) {
          structured = buildStructuredFallback(normalisedMode, payload, { learn: true });
        } else {
          console.warn(`[mentor] schema mismatch (${normalisedMode}); falling back: ${summarizeValidationIssues(check.issues)}`);
          structured = buildStructuredFallback(normalisedMode, payload);
          if (!structured) {
            return { status: 422, body: { error: 'Mentor response did not match schema. Retry.' } };
          }
        }
        fallbackUsed = true;
        check = { ok: true, issues: [] };
      }

      if (isTrianglesEvaluation) {
        let evalCheck = validateTrianglesEvaluation(structured);
        if (!evalCheck.ok) {
          repairUsed = true;
          const repairPrompt = buildTrianglesEvaluationRepairPrompt(payload, evalCheck.issues);
          const repairContents = [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
          ];
          const repaired = await callGemini(GEMINI_TUTOR_MODEL, repairContents, {
            maxOutputTokens, temperature: 0.2, responseMimeType,
          });
          finalText = repaired.text;
          structured = parseStructured(finalText);
          evalCheck = validateTrianglesEvaluation(structured);
        }
        if (!evalCheck.ok) {
          structured = buildTrianglesEvaluationFallback(payload);
          fallbackUsed = true;
        }
      }

      if (normalisedMode === 'board_steps_ms') {
        structured = normalizeBoardSteps(structured);
        structured = ensureDiagramFields(structured, payload);
      }
      if (normalisedMode === 'solve_with_me') {
        structured = ensureDiagramFields(structured, payload);
      }

      if (structured) {
        if (
          normalisedMode === 'learn_teach' ||
          normalisedMode === 'learn_mindmap' ||
          normalisedMode === 'learn_proof'
        ) {
          if (!isTeachContract) {
            const tutorCheck = validateTutorStructured(normalisedMode, structured, payload);
            if (!tutorCheck.ok) {
              structured = buildTutorFallback(normalisedMode, payload);
              fallbackUsed = true;
            }
          }
        }
        structured = orchestrateTutorResponse({
          mode: normalisedMode, payload, messages: reqJson?.messages, structuredDraft: structured,
        });
        structured = attachTutorDiagramIntent(structured, payload);
      }

      finalText = JSON.stringify(structured);
    }

    if (isMisconceptionExplain) {
      finalText = sanitizeExplainOutput(finalText);
      if (!hasMisconceptionSections(finalText)) {
        const repairPrompt = [
          'Rewrite the answer using ONLY the five required sections, in order.',
          'Return plain text with the exact headings:',
          '1) Misconception', "2) Why it's wrong", '3) Correct CBSE rule/theorem',
          '4) Micro-example', '5) Exam tip', '',
          'Rules:', '- 1-3 short lines per section.',
          '- No questions, no JSON, no markdown.', '- No system or prompt references.',
        ].join('\n');
        const repairContents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
        ];
        const repaired = await callGemini(GEMINI_TUTOR_MODEL, repairContents, {
          maxOutputTokens: 700, temperature: 0.2,
        });
        finalText = sanitizeExplainOutput(repaired.text);
        if (!hasMisconceptionSections(finalText)) {
          finalText = fallbackMisconceptionResponse(payload);
        }
      }
      structured = null;
    } else if (isCompetencyExplain) {
      finalText = sanitizeExplainOutput(finalText);
      if (!hasCompetencySections(finalText)) {
        const repairPrompt = [
          'Rewrite the answer using ONLY the five required sections, in order.',
          'Return plain text with the exact headings:',
          '1) Competency definition', '2) How to detect in questions',
          '3) One worked mini-example', '4) Practice prompts (Easy / Medium / Hard)',
          '5) Expected answer format', '',
          'Rules:', '- 1-3 short lines per section.',
          '- No questions, no JSON, no markdown.', '- No system or prompt references.',
        ].join('\n');
        const repairContents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
        ];
        const repaired = await callGemini(GEMINI_TUTOR_MODEL, repairContents, {
          maxOutputTokens: 700, temperature: 0.2,
        });
        finalText = sanitizeExplainOutput(repaired.text);
        if (!hasCompetencySections(finalText)) {
          finalText = fallbackCompetencyResponse(payload);
        }
      }
      structured = null;
    } else if (isMindmapTeach && normalisedMode === 'explain') {
      finalText = sanitizeExplainOutput(finalText);
      if (!hasMindmapTeachSections(finalText)) {
        const repairPrompt = [
          'Rewrite the answer using ONLY the five required sections, in order.',
          'Return plain text with the exact headings:',
          '1) Concept', '2) Exam-writing sentence', '3) Solved mini-example',
          '4) Common exam error', '5) Check-for-understanding question', '',
          'Rules:', '- 1-2 short lines per section.',
          '- Exactly one mini-example and one check question.',
          '- No JSON, no markdown, no extra headings.', '- No system or prompt references.',
        ].join('\n');
        const repairContents = [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n${repairPrompt}` }] },
        ];
        const repaired = await callGemini(GEMINI_TUTOR_MODEL, repairContents, {
          maxOutputTokens: 650, temperature: 0.2,
        });
        finalText = sanitizeExplainOutput(repaired.text);
        if (!hasMindmapTeachSections(finalText)) {
          console.warn('[mentor] mindmap schema mismatch');
          return { status: 422, body: { error: 'Mentor response did not match schema. Retry.' } };
        }
      }
      structured = null;
    }

    if (normalisedMode === 'explain') {
      finalText = ensureDiagramLineInText(finalText, payload);
    }

    if (structured && normalisedMode === 'solve_with_me' && (!structured.tutor || typeof structured.tutor !== 'object')) {
      structured = ensureDiagramFields(structured, payload);
      finalText = JSON.stringify(structured);
    }

    const validStructured =
      structured && structured.tutor && typeof structured.tutor === 'object'
        ? structured
        : structured && isValidMentorProtocol(structured, normalisedMode)
          ? structured
          : structured && ['learn_teach', 'learn_mindmap', 'learn_proof', 'board_steps_ms'].includes(String(structured.kind || ''))
            ? structured : null;
    const actualProvider = useGeminiFallback ? 'gemini' : routingDecision.provider;
    const actualModel = useGeminiFallback ? GEMINI_MODEL : routingDecision.model;
    const trace = {
      normalized_mode: normalisedMode,
      handler_used: handlerUsed,
      schema_used: schemaUsedTrace,
      repair_used: repairUsed,
      provider: actualProvider,
      model_used: actualModel,
    };
    if (fallbackUsed) trace.fallback_used = true;
    if (isTeachContract) {
      trace.teach_contract = true;
      trace.repair_used = repairUsed;
      trace.fallback_used = Boolean(fallbackUsed);
      trace.json_extracted = Boolean(jsonExtracted);
      trace.cache_hit = false;
      trace.coalesced = false;
    }
    return {
      status: 200,
      body: { ok: true, data: { text: finalText, structured: validStructured, trace } },
      structured: validStructured, trace, text: finalText,
    };
  }

  return { buildMentorResponse, callRoutedModel };
}

module.exports = { createMentorResponseBuilder };
