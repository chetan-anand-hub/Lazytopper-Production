function createCheckSolutionRoute(deps) {
  const {
    sendJson,
    readJson,
    callGemini,
    GEMINI_MODEL,
    ACTIVE_PROVIDER,
    isStubMode,
    extractJsonObjectFromText,
    buildGeminiImagePart,
    validateMentorImagePayload,
  } = deps;

  function buildStubResponse(marks) {
    return {
      ok: true,
      totalMarks: marks,
      marksAwarded: Math.round(marks * 0.7 * 2) / 2,
      percentage: 70,
      annotatedSteps: [
        {
          stepNumber: 1,
          description: 'Writing the given data and formula',
          studentWork: 'Written correctly',
          status: 'correct',
          marksAwarded: Math.round(marks * 0.25 * 2) / 2,
          marksDeducted: 0,
          teacherAnnotation: '✓ Good. Given data and formula stated correctly.',
          mistakeType: null,
          correctedWorking: null,
        },
        {
          stepNumber: 2,
          description: 'Substitution and working',
          studentWork: 'Mostly correct but presentation unclear',
          status: 'partial',
          marksAwarded: Math.max(0.5, Math.round(marks * 0.45 * 2) / 2),
          marksDeducted: Math.round(marks * 0.1 * 2) / 2,
          teacherAnnotation: '½ Correct approach but final answer needs units.',
          mistakeType: 'presentation',
          correctedWorking: 'Write units with every numerical answer. Box or underline the final answer.',
        },
      ],
      mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 1 },
      teacherNote: 'Good attempt! Your approach to this problem is correct and you have stated the right formula. The main area to improve is presentation — always include units with your answer and box or underline the final result so the examiner can award full marks. With a little attention to these details you should score very well in the board exam.',
    };
  }

  async function handleCheckSolution(req, res) {
    let payload;
    try {
      payload = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    const question = String(payload.question || '').trim();
    const marks = Number(payload.marks) || 1;
    const subject = String(payload.subject || 'Maths').trim();
    const topic = String(payload.topic || '').trim();
    const imageBase64 = String(payload.imageBase64 || '').trim();
    const imageMimeType = String(payload.imageMimeType || 'image/jpeg').trim();
    const textAnswer = String(payload.textAnswer || '').trim();
    const solutionSteps = Array.isArray(payload.solutionSteps) ? payload.solutionSteps.map(String) : null;
    const finalAnswer = payload.finalAnswer ? String(payload.finalAnswer).trim() : null;

    const isPdf = imageMimeType === 'application/pdf';
    const hasImage = imageBase64.length > 0;
    const hasText = textAnswer.length > 0;

    if (!question) return sendJson(res, 400, { error: 'Missing question text' });
    if (!hasImage && !hasText) {
      return sendJson(res, 400, { error: 'Missing solution — provide an image or type your answer' });
    }

    if (hasImage) {
      const imgCheck = validateMentorImagePayload(payload);
      if (!imgCheck || !imgCheck.ok) {
        return sendJson(res, 400, { error: imgCheck ? imgCheck.error : 'Invalid image' });
      }
    }

    if (isStubMode()) {
      return sendJson(res, 200, buildStubResponse(marks));
    }

    try {
      const isMaths = /math/i.test(subject);

      const systemPrompt =
        'You are a CBSE Class 10 board examiner grading a student\'s paper like a real teacher marking with a red pen. ' +
        'For each step in the student\'s work you: identify exactly what was written, assess correctness, award or deduct marks, ' +
        'classify the type of mistake (conceptual/calculation/silly/presentation), and show the corrected version for wrong steps. ' +
        'The mistake type must reflect WHAT THE ERROR REVEALS ABOUT THE STUDENT\'S UNDERSTANDING, not where it appears or how big it is. ' +
        'Before you label any error, reason about its CAUSE: does this show the student misunderstands the method, or understands it but slipped? ' +
        'Respond ONLY with valid JSON, no markdown fences.';

      const gradingRules =
        'GRADING RULES:\n' +
        '1. Identify EVERY step in the student\'s work in order — don\'t skip any.\n' +
        '2. marksAwarded (total) = sum of all annotatedSteps[].marksAwarded, capped at ' + marks + '.\n' +
        '3. mistakeType — choose by the CAUSE the error reveals about understanding, not by where it appears:\n' +
        '   - "conceptual": the METHOD or understanding itself is wrong — wrong formula/law/theorem for the situation, confused concepts, misread what the question asks, (Science) wrong principle/organ/law. The student does not know the right approach. Example: reads the coefficients of x^2 - 2x - 8 and writes "zeroes are 2 and 8" without factoring — wrong method, conceptual.\n' +
        '   - "calculation": the METHOD is right but the arithmetic/algebra is wrong — e.g. 12 × 1.73 worked out as 20.16, a wrong expansion, a wrong number substituted into a correct formula.\n' +
        '   - "silly": the student CLEARLY understands but made a mechanical slip — a sign misread off their OWN correct working, a dropped negative, a copying/transcription error, swapped values. Tell-tale: their other steps prove they know better. Example: factors (x−4)(x+2) correctly but then writes a root as x = −4 instead of +4 — a SILLY sign-misread, NOT conceptual (the correct factoring proves the method was understood).\n' +
        '   - "presentation": mathematically/chemically RIGHT but board-format short — missing the required formula (e.g. −b/a), missing units, no conclusion/"verified" line, working not shown, required diagram absent, (Science) a correct reaction left UNBALANCED, missing state symbols. The answer is right; only the formal presentation is incomplete. A correct but unbalanced equation is PRESENTATION, not conceptual.\n' +
        '4. ERROR PROPAGATION → ONE root cause. If a single upstream slip makes later steps wrong, that is ONE mistake attributed to the SOURCE step. Mark each downstream step as following correctly from the wrong value (error carried forward): status "incorrect" but mistakeType null. This includes a verification/check step that only "fails" because it was correctly applied to the carried-forward wrong value (e.g. the student plugs their own wrong root into the sum check and honestly notes it does not match) — that is carried forward (mistakeType null), not a presentation or conceptual fault of its own. Do NOT label each propagated step as a fresh mistake, and never inflate one slip into several (especially several conceptual) mistakes.\n' +
        '5. A CORRECT step ALWAYS has mistakeType null. Never invent a mistake on a right step.\n' +
        '6. MISSING is ALWAYS mistakeType null. A required step the student left ENTIRELY BLANK / did not attempt gets status "missing" and mistakeType null — the marks are simply not earned; it is never a typed mistake (not presentation, not conceptual), even when the thing left out is a required formula, unit, conclusion, or verification line. Do NOT manufacture extra "missing" steps; only list a step as missing if that whole step was genuinely required and wholly absent.\n' +
        '7. ALTERNATIVE VALID METHOD is NOT a mistake. If the student reaches the answer by a correct method the marking scheme did not anticipate (e.g. quadratic formula instead of factoring, completing the square), award full marks — the scheme is the reference, not a straitjacket.\n' +
        '8. PRESENTATION vs MISSING. If the student ACTUALLY WROTE a step and the math is right but a required FORMAT element is short (e.g. computed the value but did not show the −b/a comparison, missing units, no "verified"/conclusion line, working not shown), keep it as ONE step with status "partial" and mistakeType "presentation" — fold the short format element INTO that attempted step; do NOT split it off into a separate "missing" step. (Format short on work the student DID write = presentation; a whole step left blank = missing per rule 6.) Right answer with weak or no justification → presentation, not conceptual.\n' +
        '9. correctedWorking: for incorrect/partial steps ONLY — write EXACTLY what the student should have written.\n' +
        '10. teacherNote: 3–4 plain-English sentences — start with overall assessment, mention what was done well, state the single most important thing to fix.\n' +
        (isMaths
          ? '11. For Maths: check formula, substitution, calculation, proper notation (√ ² ± ∴), final answer boxed/underlined, units where applicable.\n'
          : '11. For Science: check terminology, balanced equations, state symbols (s/l/g/aq), NCERT-standard language, diagrams labelled.\n') +
        '12. Be accurate but encouraging — exactly as a real CBSE board examiner would grade. Attribute a type PER STEP; never blanket-label the whole answer.';

      const jsonSchema =
        'RESPOND with this exact JSON:\n' +
        '{\n' +
        '  "totalMarks": ' + marks + ',\n' +
        '  "marksAwarded": <number>,\n' +
        '  "annotatedSteps": [\n' +
        '    {\n' +
        '      "stepNumber": 1,\n' +
        '      "description": "what this step checks (e.g. Writing formula, Substitution, Final answer)",\n' +
        '      "studentWork": "exactly what the student wrote for this step (empty string if step is missing)",\n' +
        '      "status": "correct" | "partial" | "incorrect" | "missing",\n' +
        '      "marksAwarded": <marks given for this step>,\n' +
        '      "marksDeducted": <marks lost (0 if correct)>,\n' +
        '      "teacherAnnotation": "brief teacher comment — \u2713 Good / \u00d7 Error explanation / \u00bd Partially correct",\n' +
        '      "mistakeType": null | "conceptual" | "calculation" | "silly" | "presentation",\n' +
        '      "correctedWorking": null | "the correct version of this step"\n' +
        '    }\n' +
        '  ],\n' +
        '  "mistakeSummary": { "conceptual": 0, "calculation": 0, "silly": 0, "presentation": 0 },\n' +
        '  "teacherNote": "3–4 sentence plain-language teacher summary"\n' +
        '}';

      const markingSchemeBlock = solutionSteps && solutionSteps.length > 0
        ? '\n\nOFFICIAL CBSE MARKING SCHEME (use this as your reference for grading):\n' +
          solutionSteps.map((step, i) => '  Step ' + (i + 1) + ': ' + step).join('\n') +
          (finalAnswer ? '\n  Final answer: ' + finalAnswer : '') +
          '\n\nGrade the student\'s work step-by-step against these official steps. For each official step, assess whether the student hit it (correct), partially hit it (partial), missed it entirely (missing), or got it wrong (incorrect). Award marks according to the weights shown in [brackets] in each step, or distribute evenly if no brackets are present. Note which official steps the student completed and which they skipped.\n'
        : '';

      const userPrompt =
        'Grade this student\'s answer for the following CBSE board exam question.\n\n' +
        'Question: ' + question + '\n' +
        'Total marks: ' + marks + '\n' +
        'Subject: ' + subject + '\n' +
        (topic ? 'Chapter/Topic: ' + topic + '\n' : '') +
        markingSchemeBlock +
        '\n' +
        (hasImage
          ? 'The attached ' + (isPdf ? 'PDF (may contain multiple pages of handwritten work)' : 'image') + ' shows the student\'s handwritten answer. Read ALL content carefully and evaluate the complete solution.\n\n'
          : 'The student\'s typed answer is:\n"""\n' + textAnswer + '\n"""\n\n') +
        jsonSchema + '\n\n' + gradingRules;

      const textPart = { text: systemPrompt + '\n\n' + userPrompt };
      const parts = hasImage
        ? [textPart, buildGeminiImagePart({ mimeType: imageMimeType, base64: imageBase64 })]
        : [textPart];

      const contents = [{ role: 'user', parts }];

      // Gemini grading is non-deterministic and the JSON occasionally comes back
      // unparseable — most often TRUNCATED: the response is cut at maxOutputTokens
      // and ends mid-JSON, so extractJsonObjectFromText (which needs complete
      // JSON) can't recover it and the same image grades fine on a retry. Two
      // resilience measures, both parse-only (grading semantics below unchanged):
      //   (a) give long multi-step grades more room — 8000 -> 16000 tokens (a cap,
      //       not a target: short grades cost the same; only truncated ones change);
      //   (b) on a parse-gate miss, re-issue the grading call ONCE before giving up.
      const gradingGenConfig = {
        temperature: 0.15,
        maxOutputTokens: 16000,
        responseMimeType: 'application/json',
      };

      const gradeOnce = async () => {
        const r = await callGemini(GEMINI_MODEL, contents, gradingGenConfig);
        return { reply: r, parsed: extractJsonObjectFromText(r.text) };
      };
      const isGoodParse = (p) => !!(p && Array.isArray(p.annotatedSteps));
      const finishReasonOf = (r) =>
        (r && r.raw && r.raw.candidates && r.raw.candidates[0] && r.raw.candidates[0].finishReason) || null;

      let { reply, parsed } = await gradeOnce();

      if (!isGoodParse(parsed)) {
        // First attempt missed — log the decisive truncation signals (finishReason
        // MAX_TOKENS and/or a reply ending mid-JSON; log the TAIL, not the head)
        // then retry exactly once. No loop: the retry's outcome is final.
        console.warn(
          '[check-solution] parse miss (attempt 1) — retrying once.',
          'finishReason:', finishReasonOf(reply),
          'len:', reply.text ? reply.text.length : 0,
          'tail:', reply.text ? reply.text.slice(-200) : '(empty)'
        );
        ({ reply, parsed } = await gradeOnce());
      }

      if (parsed && Array.isArray(parsed.annotatedSteps)) {
        const VALID_MISTAKE_TYPES = new Set(['conceptual', 'calculation', 'silly', 'presentation']);

        const annotatedSteps = parsed.annotatedSteps
          .filter((s) => s && s.description)
          .map((s, i) => ({
            stepNumber: i + 1,
            description: String(s.description || '').trim(),
            studentWork: String(s.studentWork || '').trim(),
            status: ['correct', 'partial', 'incorrect', 'missing'].includes(s.status) ? s.status : 'partial',
            marksAwarded: Math.max(0, Math.round(Number(s.marksAwarded || 0) * 2) / 2),
            marksDeducted: Math.max(0, Math.round(Number(s.marksDeducted || 0) * 2) / 2),
            teacherAnnotation: String(s.teacherAnnotation || '').trim(),
            mistakeType: VALID_MISTAKE_TYPES.has(s.mistakeType) ? s.mistakeType : null,
            correctedWorking: s.correctedWorking ? String(s.correctedWorking).trim() : null,
          }));

        const totalAwarded = annotatedSteps.reduce((sum, s) => sum + s.marksAwarded, 0);
        const capped = Math.min(totalAwarded, marks);

        // Additive-floor reconcile: the LLM's self-reported mistakeSummary is
        // unreliable — it frequently leaves the four counters at 0 even when it
        // deducted marks and tagged steps with a mistakeType (the root of the
        // Quick-Practice "mistake not logged" bug). For each category, take the
        // MAX of the LLM's count and the number of annotatedSteps carrying that
        // mistakeType. ADDITIVE FLOOR ONLY — we never subtract or reclassify the
        // LLM's explicit counts; if no step carries a mistakeType the floor is 0
        // and the LLM summary passes through unchanged. The step→category map is
        // 1:1 (annotatedSteps[].mistakeType is already one of the four
        // categories, validated above).
        const rawSummary = parsed.mistakeSummary || {};
        const stepFloor = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
        for (const s of annotatedSteps) {
          if (s.mistakeType && Object.prototype.hasOwnProperty.call(stepFloor, s.mistakeType)) {
            stepFloor[s.mistakeType] += 1;
          }
        }
        const mistakeSummary = {
          conceptual: Math.max(0, Number(rawSummary.conceptual || 0), stepFloor.conceptual),
          calculation: Math.max(0, Number(rawSummary.calculation || 0), stepFloor.calculation),
          silly: Math.max(0, Number(rawSummary.silly || 0), stepFloor.silly),
          presentation: Math.max(0, Number(rawSummary.presentation || 0), stepFloor.presentation),
        };

        return sendJson(res, 200, {
          ok: true,
          totalMarks: marks,
          marksAwarded: capped,
          percentage: Math.round((capped / marks) * 100),
          annotatedSteps,
          mistakeSummary,
          teacherNote: String(parsed.teacherNote || '').trim(),
          provider: ACTIVE_PROVIDER,
          model: GEMINI_MODEL,
        });
      }

      // Both attempts failed. Log the decisive signals so the cause is provable
      // from the Railway logs: finishReason === 'MAX_TOKENS' and/or a reply that
      // ends mid-JSON (tail without closing braces) = truncation; otherwise it is
      // shape-variance (valid JSON missing annotatedSteps).
      console.warn(
        '[check-solution] unparseable reply after retry —',
        'finishReason:', finishReasonOf(reply),
        'len:', reply.text ? reply.text.length : 0,
        'head:', reply.text ? reply.text.slice(0, 300) : '(empty)',
        'tail:', reply.text ? reply.text.slice(-200) : '(empty)'
      );
      return sendJson(res, 200, {
        ok: false,
        error: "We couldn't read the grading this time — please try again.",
      });
    } catch (err) {
      console.error('[check-solution]', err);
      return sendJson(res, 500, {
        ok: false,
        error: 'Failed to evaluate solution. Please try again.',
      });
    }
  }

  return { handleCheckSolution };
}

module.exports = { createCheckSolutionRoute };
