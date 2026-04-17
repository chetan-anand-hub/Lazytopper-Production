const crypto = require('crypto');

let _pool = null;
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    try {
      const pg = require('pg');
      const Pool = pg.Pool || pg.default?.Pool;
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _pool.on('error', (err) => console.warn('[step-solution-cache] pool error:', err.message));
    } catch (e) {
      console.warn('[step-solution-cache] pg unavailable:', e.message);
      return null;
    }
  }
  return _pool;
}

function computeQuestionHash(question, marks) {
  return crypto.createHash('sha256').update(question + '|' + marks).digest('hex');
}

async function getCachedSolution(hash) {
  const pool = getPool();
  if (!pool) return null;
  try {
    const result = await pool.query(
      'SELECT solution_json FROM step_solutions WHERE question_hash = $1 LIMIT 1',
      [hash]
    );
    return result.rows.length > 0 ? result.rows[0].solution_json : null;
  } catch (e) {
    console.warn('[step-solution-cache] cache read failed:', e.message);
    return null;
  }
}

async function saveSolution(hash, solutionJson) {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      'INSERT INTO step_solutions (question_hash, solution_json) VALUES ($1, $2) ON CONFLICT (question_hash) DO NOTHING',
      [hash, JSON.stringify(solutionJson)]
    );
  } catch (e) {
    console.warn('[step-solution-cache] cache write failed:', e.message);
  }
}

async function saveSolutionForce(hash, solutionJson) {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(
      'INSERT INTO step_solutions (question_hash, solution_json) VALUES ($1, $2) ON CONFLICT (question_hash) DO UPDATE SET solution_json = EXCLUDED.solution_json',
      [hash, JSON.stringify(solutionJson)]
    );
  } catch (e) {
    console.warn('[step-solution-cache] cache force-write failed:', e.message);
  }
}

function buildFromPrewrittenSteps(stepsArr, finalAnswer, totalMarks, qType, section, isObjectiveTypeFn) {
  const isObj = isObjectiveTypeFn ? isObjectiveTypeFn(qType, section) : false;
  totalMarks = Number(totalMarks) || 1;
  const n = stepsArr.length;

  // Distribute marks: first/last get 0.5 each when totalMarks >= 2; middle steps share the rest.
  const rawMarks = stepsArr.map((_, i) => {
    if (n === 1) return totalMarks;
    if (totalMarks < 2) return totalMarks / n;
    if (i === 0 || i === n - 1) return 0.5;
    const middleCount = Math.max(1, n - 2);
    return (totalMarks - 1) / middleCount;
  }).map(m => Math.round(m * 2) / 2);

  // Normalize: adjust last step so sum equals totalMarks exactly.
  const currentSum = rawMarks.reduce((a, b) => a + b, 0);
  const diff = Math.round((totalMarks - currentSum) * 2) / 2;
  if (diff !== 0 && rawMarks.length > 0) {
    rawMarks[rawMarks.length - 1] = Math.max(0.5, rawMarks[rawMarks.length - 1] + diff);
  }

  const steps = stepsArr.map((stepText, i) => {
    let description;
    if (i === 0) {
      description = isObj ? 'Correct answer' : 'Approach and setup';
    } else if (i === n - 1 && finalAnswer) {
      description = '\u2234 ' + finalAnswer;
    } else if (i === n - 1) {
      description = 'Final answer';
    } else {
      description = 'Step ' + (i + 1);
    }
    return { stepNumber: i + 1, description, working: stepText, marks: rawMarks[i] };
  });

  return {
    totalMarks,
    steps,
    commonMistakes: isObj
      ? ['Not reading all options before marking — similar-sounding options trap you']
      : ['Skipping intermediate working steps — board examiners award marks for method, not just the final answer'],
    examTip: isObj
      ? 'For MCQs: read all 4 options first, eliminate obviously wrong ones, then pick. No negative marking in CBSE — never leave blank.'
      : 'Write each step on a new line. Method marks are awarded even if the final answer has a calculation error.',
  };
}

function createStepSolutionRoute(deps) {
  const {
    sendJson,
    readJson,
    callGemini,
    GEMINI_MODEL,
    ACTIVE_PROVIDER,
    isStubMode,
    buildFallbackSteps,
    buildStubStepSolution,
    isObjectiveType,
    extractJsonObjectFromText,
  } = deps;

  async function handleStepSolution(req, res) {
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
    const qType = String(payload.type || '').trim();
    const section = String(payload.section || '').trim();
    const existingAnswer = String(payload.answer || '').trim();
    const existingExplanation = String(payload.explanation || '').trim();
    const prewrittenSteps = Array.isArray(payload.solutionSteps)
      ? payload.solutionSteps.map(s => String(s).trim()).filter(Boolean)
      : [];
    const finalAnswer = String(payload.finalAnswer || '').trim();

    if (!question) {
      return sendJson(res, 400, { error: 'Missing question text' });
    }

    if (isStubMode()) {
      if (prewrittenSteps.length > 0) {
        return sendJson(res, 200, buildFromPrewrittenSteps(prewrittenSteps, finalAnswer, marks, qType, section, isObjectiveType));
      }
      if (existingAnswer || existingExplanation) {
        return sendJson(res, 200, buildFallbackSteps(existingAnswer, existingExplanation, marks, qType, section, subject));
      }
      return sendJson(res, 200, buildStubStepSolution(question, marks, subject, qType, section));
    }

    const questionHash = computeQuestionHash(question, marks);

    // Short-circuit: pre-written steps from the question bank — no AI call needed.
    if (prewrittenSteps.length > 0) {
      const solution = buildFromPrewrittenSteps(prewrittenSteps, finalAnswer, marks, qType, section, isObjectiveType);
      void saveSolution(questionHash, solution);
      return sendJson(res, 200, solution);
    }

    const cached = await getCachedSolution(questionHash);
    if (cached) {
      return sendJson(res, 200, cached);
    }

    try {
      const isMaths = /math/i.test(subject);
      const systemPrompt =
        'You are a CBSE Class 10 board exam evaluator who authors the OFFICIAL marking scheme for ' +
        subject + ' (Subject Code: ' + (isMaths ? '041' : '086') + '). ' +
        'You have access to CBSE marking scheme PDFs from 2020-2025 and follow their EXACT format. ' +
        'You produce step-by-step solutions identical to what CBSE publishes in their official marking scheme documents. ' +
        'You must respond ONLY with valid JSON, no markdown fences.';

      const mathsExample =
        'CBSE MARKING SCHEME FORMAT EXAMPLES (Maths):\n' +
        '--- Example: 3-mark question "Solve 2x\u00b2 \u2212 5x + 3 = 0 using quadratic formula" ---\n' +
        'Step 1: desc="Writing the quadratic formula", working="For ax\u00b2 + bx + c = 0, x = (\u2212b \u00b1 \u221a(b\u00b2\u22124ac)) / 2a. Here a = 2, b = \u22125, c = 3", marks=0.5\n' +
        'Step 2: desc="Computing the discriminant", working="D = b\u00b2 \u2212 4ac = (\u22125)\u00b2 \u2212 4(2)(3) = 25 \u2212 24 = 1", marks=1\n' +
        'Step 3: desc="Substituting in the formula", working="x = (5 \u00b1 \u221a1) / 4 = (5 \u00b1 1) / 4", marks=1\n' +
        'Step 4: desc="Writing both roots", working="x = (5+1)/4 = 3/2 or x = (5\u22121)/4 = 1 \u2234 x = 3/2, 1", marks=0.5\n' +
        '--- Example: 2-mark question "Find the 10th term of AP: 2, 7, 12, ..." ---\n' +
        'Step 1: desc="Identifying a, d and writing formula", working="Here a = 2, d = 7 \u2212 2 = 5. Using a\u2099 = a + (n\u22121)d", marks=0.5\n' +
        'Step 2: desc="Substituting n = 10", working="a\u2081\u2080 = 2 + (10\u22121)(5) = 2 + 45 = 47", marks=1\n' +
        'Step 3: desc="Stating the answer", working="\u2234 The 10th term of the AP is 47.", marks=0.5\n';

      const scienceExample =
        'CBSE MARKING SCHEME FORMAT EXAMPLES (Science):\n' +
        '--- Example: 2-mark question "Write the balanced chemical equation when iron reacts with copper sulphate" ---\n' +
        'Step 1: desc="Writing reactants and products", working="Fe + CuSO\u2084 \u2192 FeSO\u2084 + Cu", marks=0.5\n' +
        'Step 2: desc="Balanced equation with state symbols", working="Fe(s) + CuSO\u2084(aq) \u2192 FeSO\u2084(aq) + Cu(s)", marks=1\n' +
        'Step 3: desc="Identifying type of reaction", working="This is a displacement reaction (Fe displaces Cu).", marks=0.5\n' +
        '--- Example: 3-mark question "What is refraction? State Snell\'s law with formula" ---\n' +
        'Step 1: desc="Defining refraction", working="Refraction is the change in direction of light when it passes from one transparent medium to another.", marks=1\n' +
        'Step 2: desc="Stating Snell\'s law", working="The ratio of sine of angle of incidence to sine of angle of refraction is constant for a given pair of media. This constant is called refractive index.", marks=1\n' +
        'Step 3: desc="Writing the formula", working="sin i / sin r = n\u2082\u2081 (refractive index of medium 2 w.r.t. medium 1)", marks=1\n';

      const isObj = isObjectiveType(qType, section);

      const mcqInstructions = isObj ? (
        '\n\nIMPORTANT \u2014 THIS IS AN OBJECTIVE/MCQ QUESTION (Section A, ' + marks + ' mark):\n' +
        '- Do NOT use step patterns like "Writing given data" or "Stating the formula" \u2014 these don\'t apply to MCQs.\n' +
        '- Structure: ONE step with the correct answer + clear justification. Then one BONUS step (marks=0) explaining WHY this is correct, to help the student learn.\n' +
        '- The "description" for step 1 should be "Correct answer" (not "Writing given data").\n' +
        '- The "working" for step 1 should state: "Option (X) is correct: [brief reason]".\n' +
        '- Step 2 (marks=0): "description"="Why this is correct", "working"="[detailed conceptual explanation that helps the student understand and remember]".\n' +
        '- commonMistakes: what wrong option students commonly pick and why.\n' +
        '- examTip: MCQ-specific tip (e.g., elimination strategy, common traps).\n' +
        '- For Assertion-Reason: evaluate A and R independently, then check if R explains A.\n'
      ) : '';

      const answerContext = (existingAnswer || existingExplanation) ? (
        '\n\nKNOWN ANSWER (use this to build your detailed solution \u2014 expand on this, don\'t just repeat it):\n' +
        (existingAnswer ? 'Answer: ' + existingAnswer + '\n' : '') +
        (existingExplanation ? 'Explanation: ' + existingExplanation + '\n' : '') +
        'IMPORTANT: Your solution must EXPAND on this answer to create a full, self-explanatory CBSE marking scheme solution.\n' +
        'Show the complete working/derivation that leads to this answer. A student reading your solution should LEARN how to solve this type of question.\n'
      ) : '';

      const userPrompt =
        'Generate the OFFICIAL CBSE board marking scheme solution for this Class 10 question.\n\n' +
        'Question: ' + question + '\n' +
        'Total marks: ' + marks + '\n' +
        'Subject: ' + subject + '\n' +
        (topic ? 'Chapter/Topic: ' + topic + '\n' : '') +
        (qType ? 'Question type: ' + qType + '\n' : '') +
        (section ? 'Section: ' + section + '\n' : '') +
        answerContext +
        mcqInstructions +
        '\n' + (isObj ? '' : (isMaths ? mathsExample : scienceExample)) + '\n' +
        'RESPOND with this exact JSON structure:\n' +
        '{\n' +
        '  "totalMarks": ' + marks + ',\n' +
        '  "steps": [\n' +
        '    { "stepNumber": 1, "description": "what the student must write (e.g. Writing the formula)", "working": "the EXACT content to write in the answer sheet \u2014 formulas, equations, calculations, with proper notation", "marks": 0.5 }\n' +
        '  ],\n' +
        '  "commonMistakes": ["specific mistake that loses marks in CBSE board evaluation"],\n' +
        '  "examTip": "specific board exam writing tip for this type of question"\n' +
        '}\n\n' +
        'STRICT CBSE MARKING SCHEME RULES:\n' +
        '1. The marks of all steps MUST sum to EXACTLY ' + marks + '\n' +
        (isObj ? '2. For MCQ/Objective: only 1 scored step + 1 explanatory step (marks=0)\n' :
        '2. Use HALF MARKS (0.5) \u2014 CBSE marking schemes use \u00bd marks extensively for setup steps (writing given/formula) and final answer steps\n') +
        '3. The "description" field = what the examiner looks for (e.g. "Writing the formula", "Substituting values", "Computing discriminant")\n' +
        '4. The "working" field = the EXACT content a student should write in their answer sheet \u2014 show real formulas, real numbers, real calculations\n' +
        '5. For Maths: show actual mathematical working with symbols (\u221a, \u00b2, \u00b1, \u2234, \u2235) \u2014 not descriptions of what to do\n' +
        '6. For Science: use NCERT-standard terminology, balanced equations with state symbols (s/l/g/aq), proper scientific notation\n' +
        (isObj ? '' : '7. Follow CBSE step pattern: Given/Definition \u2192 Formula/Law \u2192 Substitution/Application \u2192 Simplification \u2192 Final Answer\n') +
        '8. Each "working" must be self-contained and DETAILED ENOUGH that a student can LEARN from it \u2014 not just see the answer\n' +
        '9. commonMistakes must be SPECIFIC to this question (not generic advice)\n' +
        '10. examTip must reference the CBSE board marking pattern for this question type\n' +
        (isObj ? '' : '11. For word problems: include step for framing the equation AND step for rejecting invalid values with reason\n') +
        '12. Total steps: ' + (isObj ? '1-mark MCQ \u2192 2 steps (1 scored + 1 explanatory)' : '2-mark Q \u2192 3 steps, 3-mark Q \u2192 4 steps, 5-mark Q \u2192 5-6 steps (matching CBSE scheme density)');

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
      ];

      const reply = await callGemini(GEMINI_MODEL, contents, {
        temperature: 0.2,
        maxOutputTokens: 1800,
      });

      const parsed = extractJsonObjectFromText(reply.text);
      if (parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0) {
        let steps = parsed.steps
          .filter((s) => s && (s.description || s.working))
          .map((s, i) => ({
            stepNumber: i + 1,
            description: String(s.description || '').trim(),
            working: String(s.working || '').trim(),
            marks: Math.max(0, Math.round(Number(s.marks) * 2) / 2),
          }));

        if (steps.length === 0) {
          if (existingAnswer || existingExplanation) {
            return sendJson(res, 200, buildFallbackSteps(existingAnswer, existingExplanation, marks, qType, section, subject));
          }
          return sendJson(res, 200, buildStubStepSolution(question, marks, subject, qType, section));
        }

        const maxSteps = Math.floor(marks / 0.5);
        if (steps.length > maxSteps) {
          steps = steps.slice(0, maxSteps);
          for (let i = 0; i < steps.length; i++) steps[i].stepNumber = i + 1;
        }

        const rawSum = steps.reduce((acc, s) => acc + s.marks, 0);
        if (Math.abs(rawSum - marks) > 0.01) {
          if (rawSum > 0) {
            for (let i = 0; i < steps.length; i++) {
              steps[i].marks = Math.max(0.5, Math.round((steps[i].marks / rawSum) * marks * 2) / 2);
            }
          } else {
            const perStep = Math.round((marks / steps.length) * 2) / 2;
            for (let i = 0; i < steps.length; i++) {
              steps[i].marks = Math.max(0.5, perStep);
            }
          }
          let currentSum = steps.reduce((a, s) => a + s.marks, 0);
          let idx = 0;
          while (Math.abs(currentSum - marks) > 0.01 && idx < steps.length * 20) {
            const j = idx % steps.length;
            if (currentSum < marks) {
              steps[j].marks += 0.5;
              currentSum += 0.5;
            } else if (currentSum > marks && steps[j].marks > 0.5) {
              steps[j].marks -= 0.5;
              currentSum -= 0.5;
            }
            idx++;
          }
          if (Math.abs(currentSum - marks) > 0.01) {
            while (steps.length > 1 && currentSum > marks) {
              const removed = steps.pop();
              currentSum -= removed.marks;
            }
            if (steps.length > 0) {
              steps[steps.length - 1].marks += (marks - currentSum);
              steps[steps.length - 1].marks = Math.round(steps[steps.length - 1].marks * 2) / 2;
            }
            for (let i = 0; i < steps.length; i++) steps[i].stepNumber = i + 1;
          }
        }

        const response = {
          totalMarks: marks,
          steps,
          commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes.map(String) : [],
          examTip: String(parsed.examTip || '').trim() || undefined,
          provider: ACTIVE_PROVIDER,
          model: GEMINI_MODEL,
        };

        await saveSolution(questionHash, response);

        return sendJson(res, 200, response);
      }

      if (existingAnswer || existingExplanation) {
        return sendJson(res, 200, buildFallbackSteps(existingAnswer, existingExplanation, marks, qType, section, subject));
      }
      return sendJson(res, 200, buildStubStepSolution(question, marks, subject, qType, section));
    } catch (err) {
      console.error('[step-solution]', err);
      if (existingAnswer || existingExplanation) {
        return sendJson(res, 200, buildFallbackSteps(existingAnswer, existingExplanation, marks, qType, section, subject));
      }
      return sendJson(res, 200, buildStubStepSolution(question, marks, subject, qType, section));
    }
  }

  return { handleStepSolution };
}

module.exports = { createStepSolutionRoute, saveSolutionForce };
