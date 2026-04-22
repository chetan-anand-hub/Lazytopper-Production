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
        'Respond ONLY with valid JSON, no markdown fences.';

      const gradingRules =
        'GRADING RULES:\n' +
        '1. Identify EVERY step in the student\'s work in order — don\'t skip any\n' +
        '2. marksAwarded (total) = sum of all annotatedSteps[].marksAwarded, capped at ' + marks + '\n' +
        '3. mistakeType meanings:\n' +
        '   - "conceptual": wrong formula, law, theorem, or definition\n' +
        '   - "calculation": correct method but arithmetic/algebra error\n' +
        '   - "silly": minor avoidable error (wrong sign, copying mistake, dropped negative)\n' +
        '   - "presentation": correct working but missing units, labels, state symbols, boxed answer\n' +
        '4. correctedWorking: for incorrect/partial steps ONLY — write EXACTLY what the student should have written\n' +
        '5. teacherNote: 3–4 plain-English sentences — start with overall assessment, mention what was done well, state the single most important thing to fix\n' +
        (isMaths
          ? '6. For Maths: check formula, substitution, calculation, proper notation (√ ² ± ∴), final answer boxed/underlined, units where applicable\n'
          : '6. For Science: check terminology, balanced equations, state symbols (s/l/g/aq), NCERT-standard language, diagrams labelled\n') +
        '7. Be accurate but encouraging — exactly as a real CBSE board examiner would grade';

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

      const reply = await callGemini(GEMINI_MODEL, contents, {
        temperature: 0.15,
        maxOutputTokens: 2500,
      });

      const parsed = extractJsonObjectFromText(reply.text);

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

        const rawSummary = parsed.mistakeSummary || {};
        const mistakeSummary = {
          conceptual: Math.max(0, Number(rawSummary.conceptual || 0)),
          calculation: Math.max(0, Number(rawSummary.calculation || 0)),
          silly: Math.max(0, Number(rawSummary.silly || 0)),
          presentation: Math.max(0, Number(rawSummary.presentation || 0)),
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

      return sendJson(res, 200, {
        ok: false,
        error: 'Could not evaluate the solution. Please try again with a clearer image.',
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
