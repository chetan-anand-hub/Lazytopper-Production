const crypto = require('crypto');

let _pool = null;
function getPool() {
  if (_pool) return _pool;
  if (!process.env.DATABASE_URL) return null;
  try {
    const pg = require('pg');
    const Pool = pg.Pool || pg.default?.Pool;
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _pool.on('error', (err) => console.warn('[step-solution-cache] pool error:', err.message));
  } catch (e) {
    console.warn('[step-solution-cache] pg unavailable:', e.message);
    return null;
  }
  return _pool;
}

// TEST-ONLY seam: inject a fake pool so vitest can exercise the cache round-trip
// (hit / quality-gated write / eviction) without pg or DATABASE_URL. Production
// code never calls this.
function __setPoolForTests(pool) {
  _pool = pool;
}

// Increment this when the prompt structure changes to automatically bypass stale cache entries.
const CACHE_VERSION = 'v2';

// The version prefix applies to EVERY hash (objective and multi-mark alike) so a
// CACHE_VERSION bump genuinely busts ALL stale entries. Pre-PR-3 only objective
// hashes carried the prefix, so a bump left stale subjective entries live — a
// latent staleness bug. Extending it cold-starts the old unprefixed subjective
// entries: they simply miss, regenerate and re-cache under the versioned key.
function computeQuestionHash(question, marks) {
  return crypto.createHash('sha256').update(CACHE_VERSION + '|' + question + '|' + marks).digest('hex');
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

// C&I PR-3 (Gate 2b primitive): evict one cached solution by its question_hash —
// the "a bad answer slipped through, pull it now" lever. Returns true when a row
// was actually deleted. Exposed ONLY through the admin-gated route.
async function deleteSolution(hash) {
  const pool = getPool();
  if (!pool) return false;
  try {
    const result = await pool.query(
      'DELETE FROM step_solutions WHERE question_hash = $1',
      [hash]
    );
    return (result.rowCount || 0) > 0;
  } catch (e) {
    console.warn('[step-solution-cache] cache delete failed:', e.message);
    return false;
  }
}

// ── Gate 2a — QUALITY GATE ON WRITE (C&I PR-3) ─────────────────────────────────
// A solution may be CACHED only if it passes every check below. A cached wrong or
// garbled solution is served to EVERY student who hits that question-hash — a
// systematic lie, far worse than a one-off live error — so the bar is honest-or-
// regenerate, never cache-garbage. On FAIL the caller serves the fresh solution
// to that one request but does NOT persist it (the next request regenerates).
// Applied at EVERY write path to the cache: the display endpoint (model-generated
// AND prewritten-bank writes), the grader's scheme-first hook, and the admin
// regenerate path. Returns { ok, reasons } so failures are loggable for review.
function validateSolutionQuality(solution, marks, isObjective) {
  const total = Number(marks) || 1;
  const steps = solution && Array.isArray(solution.steps) ? solution.steps : null;
  if (!steps || steps.length === 0) {
    return { ok: false, reasons: ['no-steps'] };
  }

  const reasons = [];
  // Control chars / U+FFFD are truncation-or-encoding damage — never valid content.
  const GARBLE_RE = new RegExp('[' + String.fromCharCode(0xfffd) + String.fromCharCode(0) + '-' + String.fromCharCode(8) + String.fromCharCode(11) + String.fromCharCode(12) + String.fromCharCode(14) + '-' + String.fromCharCode(31) + ']');

  let scoredSum = 0;
  let scoredCount = 0;
  let badMarks = false;
  for (const s of steps) {
    const description = String((s && s.description) || '').trim();
    const working = String((s && s.working) || '').trim();
    if (!description || !working) {
      if (!reasons.includes('empty-step-content')) reasons.push('empty-step-content');
    }
    if (GARBLE_RE.test(description) || GARBLE_RE.test(working)) {
      if (!reasons.includes('garbled-content')) reasons.push('garbled-content');
    }
    const m = Number(s && s.marks);
    if (!Number.isFinite(m) || m < 0 || Math.round(m * 2) !== m * 2) {
      badMarks = true;
    } else if (m === 0) {
      // A zero-mark step is legitimate only as the objective explanatory why-step;
      // in a subjective marking scheme a step carrying no marks is degenerate.
      if (!isObjective && !reasons.includes('zero-mark-step-non-objective')) {
        reasons.push('zero-mark-step-non-objective');
      }
    } else {
      scoredSum += m;
      scoredCount += 1;
    }
  }
  if (badMarks) reasons.push('bad-step-marks');
  if (!badMarks && Math.abs(scoredSum - total) > 0.01) reasons.push('marks-sum-mismatch');

  if (Number(solution.totalMarks) !== total) reasons.push('total-marks-mismatch');

  if (isObjective) {
    // Objective doctrine: the WHOLE mark on one scored step, never step-distributed.
    if (scoredCount !== 1) reasons.push('objective-not-single-scored-step');
  } else if (total >= 2 && steps.length < 2) {
    // A one-line "solution" for a 2+ marker cannot be a real marking scheme.
    reasons.push('too-few-steps-for-marks');
  }

  // Size sanity: generation is capped at 1800 output tokens; anything hugely over
  // that serialized is runaway/duplicated content, not a solution.
  try {
    if (JSON.stringify(solution).length > 20000) reasons.push('oversized');
  } catch (e) {
    reasons.push('unserializable');
  }

  return { ok: reasons.length === 0, reasons };
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
      description = '∴ ' + finalAnswer;
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

// ── Shared model-solution generation core (C&I PR-3) ───────────────────────────
// Generates an official-marking-scheme-style solution from the QUESTION ALONE.
// The student's answer/image/PII never enters this prompt, so the artifact is
// student-agnostic and safe to share across students by question-hash (Gate 3 by
// construction). Extracted verbatim from handleStepSolution's generation block so
// the display endpoint, the grader's scheme-first hook and the admin regenerate
// path all run ONE prompt + normalisation. Returns { solution, cacheable } or
// null when the model reply is unusable (the caller falls back / degrades).
// cacheable:false is the pre-existing MCQ missing-why-step guard — serve once,
// never persist.
async function generateModelSolution(fields, deps) {
  const question = String(fields.question || '').trim();
  const marks = Number(fields.marks) || 1;
  const subject = String(fields.subject || 'Maths').trim();
  const topic = String(fields.topic || '').trim();
  const qType = String(fields.qType || '').trim();
  const section = String(fields.section || '').trim();
  const existingAnswer = String(fields.existingAnswer || '').trim();
  const existingExplanation = String(fields.existingExplanation || '').trim();
  const isObj = fields.isObjective === true;
  const { callGemini, GEMINI_MODEL, ACTIVE_PROVIDER, extractJsonObjectFromText } = deps;

  const isMaths = /math/i.test(subject);
  const systemPrompt =
    'You are a CBSE Class 10 board exam evaluator who authors the OFFICIAL marking scheme for ' +
    subject + ' (Subject Code: ' + (isMaths ? '041' : '086') + '). ' +
    'You have access to CBSE marking scheme PDFs from 2020-2025 and follow their EXACT format. ' +
    'You produce step-by-step solutions identical to what CBSE publishes in their official marking scheme documents. ' +
    'You must respond ONLY with valid JSON, no markdown fences.';

  const mathsExample =
    'CBSE MARKING SCHEME FORMAT EXAMPLES (Maths):\n' +
    '--- Example: 3-mark question "Solve 2x² − 5x + 3 = 0 using quadratic formula" ---\n' +
    'Step 1: desc="Writing the quadratic formula", working="For ax² + bx + c = 0, x = (−b ± √(b²−4ac)) / 2a. Here a = 2, b = −5, c = 3", marks=0.5\n' +
    'Step 2: desc="Computing the discriminant", working="D = b² − 4ac = (−5)² − 4(2)(3) = 25 − 24 = 1", marks=1\n' +
    'Step 3: desc="Substituting in the formula", working="x = (5 ± √1) / 4 = (5 ± 1) / 4", marks=1\n' +
    'Step 4: desc="Writing both roots", working="x = (5+1)/4 = 3/2 or x = (5−1)/4 = 1 ∴ x = 3/2, 1", marks=0.5\n' +
    '--- Example: 2-mark question "Find the 10th term of AP: 2, 7, 12, ..." ---\n' +
    'Step 1: desc="Identifying a, d and writing formula", working="Here a = 2, d = 7 − 2 = 5. Using aₙ = a + (n−1)d", marks=0.5\n' +
    'Step 2: desc="Substituting n = 10", working="a₁₀ = 2 + (10−1)(5) = 2 + 45 = 47", marks=1\n' +
    'Step 3: desc="Stating the answer", working="∴ The 10th term of the AP is 47.", marks=0.5\n';

  const scienceExample =
    'CBSE MARKING SCHEME FORMAT EXAMPLES (Science):\n' +
    '--- Example: 2-mark question "Write the balanced chemical equation when iron reacts with copper sulphate" ---\n' +
    'Step 1: desc="Writing reactants and products", working="Fe + CuSO₄ → FeSO₄ + Cu", marks=0.5\n' +
    'Step 2: desc="Balanced equation with state symbols", working="Fe(s) + CuSO₄(aq) → FeSO₄(aq) + Cu(s)", marks=1\n' +
    'Step 3: desc="Identifying type of reaction", working="This is a displacement reaction (Fe displaces Cu).", marks=0.5\n' +
    '--- Example: 3-mark question "What is refraction? State Snell\'s law with formula" ---\n' +
    'Step 1: desc="Defining refraction", working="Refraction is the change in direction of light when it passes from one transparent medium to another.", marks=1\n' +
    'Step 2: desc="Stating Snell\'s law", working="The ratio of sine of angle of incidence to sine of angle of refraction is constant for a given pair of media. This constant is called refractive index.", marks=1\n' +
    'Step 3: desc="Writing the formula", working="sin i / sin r = n₂₁ (refractive index of medium 2 w.r.t. medium 1)", marks=1\n';

  const mcqInstructions = isObj ? (
    '\n\nIMPORTANT — THIS IS AN OBJECTIVE/MCQ QUESTION (Section A, ' + marks + ' mark):\n' +
    '- Do NOT use step patterns like "Writing given data" or "Stating the formula" — these don\'t apply to MCQs.\n' +
    '- Structure: ONE step with the correct answer + clear justification. Then one BONUS step (marks=0) explaining WHY this is correct, to help the student learn.\n' +
    '- The "description" for step 1 should be "Correct answer" (not "Writing given data").\n' +
    '- The "working" for step 1 should state: "Option (X) is correct: [brief reason]".\n' +
    '- Step 2 (marks=0): "description"="Why this is correct", "working"="[detailed conceptual explanation that helps the student understand and remember]".\n' +
    '- commonMistakes: what wrong option students commonly pick and why.\n' +
    '- examTip: MCQ-specific tip (e.g., elimination strategy, common traps).\n' +
    '- For Assertion-Reason: evaluate A and R independently, then check if R explains A.\n'
  ) : '';

  const answerContext = (existingAnswer || existingExplanation) ? (
    '\n\nKNOWN ANSWER (use this to build your detailed solution — expand on this, don\'t just repeat it):\n' +
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
    '    { "stepNumber": 1, "description": "what the student must write (e.g. Writing the formula)", "working": "the EXACT content to write in the answer sheet — formulas, equations, calculations, with proper notation", "marks": 0.5 }\n' +
    '  ],\n' +
    '  "commonMistakes": ["specific mistake that loses marks in CBSE board evaluation"],\n' +
    '  "examTip": "specific board exam writing tip for this type of question"\n' +
    '}\n\n' +
    'STRICT CBSE MARKING SCHEME RULES:\n' +
    '1. The marks of all steps MUST sum to EXACTLY ' + marks + '\n' +
    (isObj ? '2. For MCQ/Objective: only 1 scored step + 1 explanatory step (marks=0)\n' :
    '2. Use HALF MARKS (0.5) — CBSE marking schemes use ½ marks extensively for setup steps (writing given/formula) and final answer steps\n') +
    '3. The "description" field = what the examiner looks for (e.g. "Writing the formula", "Substituting values", "Computing discriminant")\n' +
    '4. The "working" field = the EXACT content a student should write in their answer sheet — show real formulas, real numbers, real calculations\n' +
    '5. For Maths: show actual mathematical working with symbols (√, ², ±, ∴, ∵) — not descriptions of what to do\n' +
    '6. For Science: use NCERT-standard terminology, balanced equations with state symbols (s/l/g/aq), proper scientific notation\n' +
    (isObj ? '' : '7. Follow CBSE step pattern: Given/Definition → Formula/Law → Substitution/Application → Simplification → Final Answer\n') +
    '8. Each "working" must be self-contained and DETAILED ENOUGH that a student can LEARN from it — not just see the answer\n' +
    '9. commonMistakes must be SPECIFIC to this question (not generic advice)\n' +
    '10. examTip must reference the CBSE board marking pattern for this question type\n' +
    (isObj ? '' : '11. For word problems: include step for framing the equation AND step for rejecting invalid values with reason\n') +
    '12. Total steps: ' + (isObj ? '1-mark MCQ → 2 steps (1 scored + 1 explanatory)' : '2-mark Q → 3 steps, 3-mark Q → 4 steps, 5-mark Q → 5-6 steps (matching CBSE scheme density)');

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] },
  ];

  const reply = await callGemini(GEMINI_MODEL, contents, {
    temperature: 0.2,
    maxOutputTokens: 1800,
  });

  const parsed = extractJsonObjectFromText(reply.text);
  if (!(parsed && Array.isArray(parsed.steps) && parsed.steps.length > 0)) return null;

  let steps = parsed.steps
    .filter((s) => s && (s.description || s.working))
    .map((s, i) => ({
      stepNumber: i + 1,
      description: String(s.description || '').trim(),
      working: String(s.working || '').trim(),
      marks: Math.max(0, Math.round(Number(s.marks) * 2) / 2),
    }));

  if (steps.length === 0) return null;

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

  // MCQ guard: if the AI omitted the explanatory step, append one from
  // existingExplanation so students always see the conceptual reasoning.
  // Detection is loose: any marks===0 step OR any description matching /why/i
  // counts as an explanatory step to avoid false-positives.
  // Runs after normalization so it cannot be clipped.
  let skipCache = false;
  if (isObj) {
    const hasWhyStep = steps.some(
      (s) => s.marks === 0 || /why/i.test(s.description || '')
    );
    if (!hasWhyStep) {
      if (existingExplanation) {
        steps.push({
          stepNumber: steps.length + 1,
          description: 'Why this is correct',
          working: existingExplanation,
          marks: 0,
        });
      } else {
        // No fallback available — don't cache this incomplete response so the
        // next request gets a fresh AI call with a chance of including Step 2.
        skipCache = true;
      }
    }
  }

  const solution = {
    totalMarks: marks,
    steps,
    commonMistakes: Array.isArray(parsed.commonMistakes) ? parsed.commonMistakes.map(String) : [],
    examTip: String(parsed.examTip || '').trim() || undefined,
    provider: ACTIVE_PROVIDER,
    model: GEMINI_MODEL,
  };

  return { solution, cacheable: !skipCache };
}

// Render a model solution as marking-scheme step strings for the grader's
// EXISTING scheme slot. The "[x mark(s)]" suffix matches the grading prompt's
// bracket-weight convention ("Award marks according to the weights shown in
// [brackets]"). Zero-mark explanatory steps are display-only teaching content —
// never part of the marking scheme.
function renderSolutionSchemeSteps(solution) {
  const steps = (solution && Array.isArray(solution.steps) ? solution.steps : [])
    .filter((s) => s && Number(s.marks) > 0);
  return steps
    .map((s) => {
      const description = String(s.description || '').trim();
      const working = String(s.working || '').trim();
      const marks = Number(s.marks);
      if (!working && !description) return '';
      return (description ? description + ': ' : '') + working + ' [' + marks + ' mark' + (marks === 1 ? '' : 's') + ']';
    })
    .filter(Boolean);
}

// ── C&I PR-3: the cache-first model-solution entry point for the GRADER ────────
// hash -> read -> on miss generate from the question text alone -> Gate-2a quality
// check -> write-if-pass. Returns { schemeSteps, fromCache, hash } ready for the
// grader's existing marking-scheme slot, or null when unavailable (no DB pool, a
// failed/unusable generation, an error) — the caller then grades exactly as
// before, with the empty scheme slot. Never throws: grading must never block on
// the cache. Student-agnostic by construction: fields carry ONLY question
// metadata; existingAnswer/existingExplanation are forced empty.
async function getOrCreateModelSolution(fields, deps) {
  try {
    if (!getPool()) return null; // cache-gated: with no cache there is nothing to amortize
    const question = String((fields && fields.question) || '').trim();
    const marks = Number(fields && fields.marks) || 0;
    if (!question || marks < 1) return null;

    const hash = computeQuestionHash(question, marks);
    const cached = await getCachedSolution(hash);
    if (cached) {
      const schemeSteps = renderSolutionSchemeSteps(cached);
      return schemeSteps.length > 0 ? { schemeSteps, fromCache: true, hash } : null;
    }

    const isObj = fields.isObjective === true;
    const gen = await generateModelSolution(
      {
        question,
        marks,
        subject: fields.subject,
        topic: fields.topic,
        qType: fields.qType,
        section: fields.section,
        existingAnswer: '',
        existingExplanation: '',
        isObjective: isObj,
      },
      deps
    );
    if (!gen) return null;

    const quality = validateSolutionQuality(gen.solution, marks, isObj);
    if (gen.cacheable && quality.ok) {
      await saveSolution(hash, gen.solution);
    } else if (!quality.ok) {
      console.warn('[solution-cache] quality-gate FAIL — served once, not cached:', hash, quality.reasons.join(','));
    }

    const schemeSteps = renderSolutionSchemeSteps(gen.solution);
    return schemeSteps.length > 0 ? { schemeSteps, fromCache: false, hash } : null;
  } catch (e) {
    console.warn('[solution-cache] getOrCreateModelSolution failed:', e.message);
    return null;
  }
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

    const isObj = isObjectiveType(qType, section);
    const questionHash = computeQuestionHash(question, marks);

    // Short-circuit: pre-written steps from the question bank — no AI call needed.
    if (prewrittenSteps.length > 0) {
      const solution = buildFromPrewrittenSteps(prewrittenSteps, finalAnswer, marks, qType, section, isObjectiveType);
      // Gate 2a: every write path to the cache is quality-checked. A failing
      // build is still served to this request — just never persisted.
      const quality = validateSolutionQuality(solution, marks, isObj);
      if (quality.ok) {
        void saveSolution(questionHash, solution);
      } else {
        console.warn('[step-solution] quality-gate FAIL (prewritten) — not cached:', questionHash, quality.reasons.join(','));
      }
      return sendJson(res, 200, solution);
    }

    const cached = await getCachedSolution(questionHash);
    if (cached) {
      return sendJson(res, 200, cached);
    }

    // ── GATE-1 §4: the GENERATION branch, and ONLY the generation branch ──────
    // Everything above this line stays free for every tier, forever: pre-written
    // steps from the bank (the common case — PracticeQuestionCard renders
    // q.solutionSteps directly) and a cache hit both returned already. Reaching
    // here means the bank had nothing AND the cache missed, so this one request is
    // about to spend money at Gemini. That is the only part students do not
    // rightly expect for free.
    //
    // ★ The resolver is attached by index.cjs at the route boundary and is LAZY —
    // no Firestore read happens on the free paths above. Absent resolver => serve,
    // which is the same fail-open posture as every other branch here: an
    // unwired gate must never cost a student their steps. The wiring is proven by
    // a real HTTP request in entitlement.test.cjs rather than assumed.
    const entitlement = req && req.lazytopperEntitlement;
    if (entitlement && typeof entitlement.requireForGeneration === 'function') {
      const denial = await entitlement.requireForGeneration();
      if (denial) return sendJson(res, 402, denial);
    }

    try {
      const gen = await generateModelSolution(
        { question, marks, subject, topic, qType, section, existingAnswer, existingExplanation, isObjective: isObj },
        { callGemini, GEMINI_MODEL, ACTIVE_PROVIDER, extractJsonObjectFromText }
      );

      if (gen) {
        // Gate 2a: never persist a solution that fails the sanity check — serve it
        // to this one request and let the next request regenerate (honest-or-
        // regenerate, never cache-garbage). cacheable:false is the pre-existing
        // MCQ missing-why-step guard with the same serve-once semantics.
        const quality = validateSolutionQuality(gen.solution, marks, isObj);
        if (gen.cacheable && quality.ok) {
          await saveSolution(questionHash, gen.solution);
        } else if (!quality.ok) {
          console.warn('[step-solution] quality-gate FAIL — not cached:', questionHash, quality.reasons.join(','));
        }
        return sendJson(res, 200, gen.solution);
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

module.exports = {
  createStepSolutionRoute,
  saveSolutionForce,
  // C&I PR-3 — the shared solution-cache surface (grader hook + admin Gate-2b):
  computeQuestionHash,
  getCachedSolution,
  saveSolution,
  deleteSolution,
  validateSolutionQuality,
  generateModelSolution,
  renderSolutionSchemeSteps,
  getOrCreateModelSolution,
  __setPoolForTests,
};
