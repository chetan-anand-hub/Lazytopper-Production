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

    if (!question) return sendJson(res, 400, { error: 'Missing question text' });
    if (!imageBase64) return sendJson(res, 400, { error: 'Missing solution image' });

    const imgCheck = validateMentorImagePayload(payload);
    if (!imgCheck || !imgCheck.ok) {
      return sendJson(res, 400, { error: imgCheck ? imgCheck.error : 'Invalid image' });
    }

    if (isStubMode()) {
      return sendJson(res, 200, {
        ok: true,
        totalMarks: marks,
        marksAwarded: Math.round(marks * 0.7 * 2) / 2,
        percentage: 70,
        steps: [
          { stepNumber: 1, description: 'Step identification', status: 'correct', feedback: 'Good start with writing the given data.', marksGiven: 0.5 },
          { stepNumber: 2, description: 'Working', status: 'partial', feedback: 'Calculation is mostly correct but needs cleaner presentation.', marksGiven: Math.max(0.5, marks - 1) },
          { stepNumber: 3, description: 'Final answer', status: 'missing', feedback: 'Box or underline your final answer for the examiner.', marksGiven: 0 },
        ],
        overallFeedback: 'Good attempt! Your approach is correct. Focus on presenting the final answer clearly and writing each step neatly.',
        improvementTips: ['Underline or box your final answer', 'Write the formula before substituting values', 'Show units where applicable'],
      });
    }

    try {
      const isMaths = /math/i.test(subject);
      const systemPrompt =
        'You are a strict but supportive CBSE Class 10 board exam evaluator for ' + subject + '. ' +
        'You are checking a student\'s handwritten solution against the official CBSE marking scheme. ' +
        'Evaluate EXACTLY as a real board examiner would — award marks step by step. ' +
        'Be encouraging but honest about errors. ' +
        'You must respond ONLY with valid JSON, no markdown fences.';

      const userPrompt =
        'EVALUATE this student\'s handwritten solution for the following CBSE board exam question.\n\n' +
        'Question: ' + question + '\n' +
        'Total marks: ' + marks + '\n' +
        'Subject: ' + subject + '\n' +
        (topic ? 'Chapter/Topic: ' + topic + '\n' : '') +
        '\nThe attached image shows the student\'s handwritten answer. Carefully read their work and evaluate it.\n\n' +
        'RESPOND with this exact JSON structure:\n' +
        '{\n' +
        '  "totalMarks": ' + marks + ',\n' +
        '  "marksAwarded": <number — total marks you would award as board examiner>,\n' +
        '  "steps": [\n' +
        '    {\n' +
        '      "stepNumber": 1,\n' +
        '      "description": "what this step checks (e.g. Writing the formula, Substitution, Final answer)",\n' +
        '      "status": "correct" | "partial" | "incorrect" | "missing",\n' +
        '      "feedback": "specific feedback — what was right/wrong, what the correct version should be",\n' +
        '      "marksGiven": <marks awarded for this step>\n' +
        '    }\n' +
        '  ],\n' +
        '  "overallFeedback": "2-3 sentences of encouraging overall feedback with specific improvement areas",\n' +
        '  "improvementTips": ["3 specific tips to improve their answer for board exam"]\n' +
        '}\n\n' +
        'EVALUATION RULES:\n' +
        '1. Read the handwritten text carefully — allow for messy handwriting\n' +
        '2. Award partial marks generously (CBSE allows ½ marks) if the approach is correct\n' +
        '3. Check for: correct formula, proper substitution, accurate calculation, clear final answer\n' +
        '4. Status meanings: "correct"=full marks, "partial"=some marks, "incorrect"=0 marks, "missing"=step not attempted\n' +
        '5. marksAwarded MUST equal the sum of all step marksGiven values\n' +
        '6. Be specific in feedback — say WHAT was wrong and WHAT it should be\n' +
        (isMaths ? '7. For Maths: check mathematical accuracy, proper notation (√, ², ±), labeled diagram if needed\n' :
          '7. For Science: check terminology, balanced equations, state symbols, NCERT-standard language\n');

      const contents = [
        {
          role: 'user',
          parts: [
            { text: systemPrompt + '\n\n' + userPrompt },
            buildGeminiImagePart({ mimeType: imageMimeType, base64: imageBase64 }),
          ],
        },
      ];

      const reply = await callGemini(GEMINI_MODEL, contents, {
        temperature: 0.2,
        maxOutputTokens: 2048,
      });

      const parsed = extractJsonObjectFromText(reply.text);
      if (parsed && Array.isArray(parsed.steps)) {
        const steps = parsed.steps
          .filter((s) => s && s.description)
          .map((s, i) => ({
            stepNumber: i + 1,
            description: String(s.description || '').trim(),
            status: ['correct', 'partial', 'incorrect', 'missing'].includes(s.status) ? s.status : 'partial',
            feedback: String(s.feedback || '').trim(),
            marksGiven: Math.max(0, Math.round(Number(s.marksGiven || 0) * 2) / 2),
          }));

        const marksAwarded = steps.reduce((sum, s) => sum + s.marksGiven, 0);
        const capped = Math.min(marksAwarded, marks);

        return sendJson(res, 200, {
          ok: true,
          totalMarks: marks,
          marksAwarded: capped,
          percentage: Math.round((capped / marks) * 100),
          steps,
          overallFeedback: String(parsed.overallFeedback || '').trim(),
          improvementTips: Array.isArray(parsed.improvementTips) ? parsed.improvementTips.map(String) : [],
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
