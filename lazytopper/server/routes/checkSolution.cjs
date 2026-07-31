// Uniform OBJECTIVE (MCQ / AR / Section A) scoring — the SINGLE source of truth for
// the invariant "an objective question scores 0 or FULL, never fractional / step-
// distributed; working is analysed only to classify the mistake type". BOTH grader
// functions below (handleCheckSolution AND normaliseStructuredResult) call the exact
// same clamp + guard from here, so their objective logic cannot drift. The module
// reuses the canonical isObjectiveType classifier (serverUtils.cjs) internally — never
// forked — so classification agrees byte-for-byte across every grading surface.
const {
  isObjective,
  clampObjectiveResult,
  applyObjectiveMistakeGuard,
} = require('./objectiveScoring.cjs');

/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSE SCHEMAS — constrained decoding (PR-C2)
   ═══════════════════════════════════════════════════════════════════════════════

   ★★ THE ONE RULE THESE SCHEMAS OBEY: **exactly as loose as the parser, NEVER
   tighter.** A schema tighter than the parser does not merely reject a response —
   it CONSTRAINS THE MARKING ITSELF. A required field the parser defaults, a closed
   enum where the parser needs range, a non-nullable `mistakeType`: each silently
   changes what marks a student can receive, in exchange for a format saving. That
   trade is not available.

   Every field below was derived by READING THE PARSER, not the prompt and not a
   sample response. The provenance comment on each field names the line it came
   from. If a field cannot point at the parser, it does not belong here.

   ★ THERE ARE THREE SCHEMAS BECAUSE THERE ARE THREE PARSERS. This module exports
   three endpoints and they do NOT share a parse gate:
       handleCheckSolution  -> `Array.isArray(p.annotatedSteps)`   (the grade gate)
       handleDetectQuestion -> `!!parsed`                          (truthy object only)
       gradeStructuredSet   -> `Array.isArray(p.results)`          (the worksheet gate)
   `checkSolution.test.cjs` §2.3 pins that the two grade gates are not
   interchangeable. One shared schema would have been wrong in the direction that
   changes marks — see WORKSHEET_RESPONSE_SCHEMA's note on `annotatedSteps`.

   ★ THE PARSER'S FALLBACKS ARE ALL KEPT, and deliberately so. Schema enforcement
   belongs to the API, not to us, and the structured-output retry in geminiClient
   legitimately STRIPS the schema when a backend rejects it — at which point every
   coercion and default in the parser is load-bearing again. A schema is a second
   line of defence here, never a replacement for the first.
   ══════════════════════════════════════════════════════════════════════════════ */

// Shared with the parser's own validation, so the schema and the code that coerces
// it cannot drift apart silently.
const STEP_STATUS_VALUES = ['correct', 'partial', 'incorrect', 'missing'];
// BATCH-1 · the most per-question answer photos one batch grade will accept. An
// ALLOWLIST-shaped cap (fails safe): the request is refused with a clear message
// rather than silently truncated, so a student never gets a partial grade
// presented as complete. The real byte ceiling is still readJson's body cap.
const MAX_BATCH_UPLOADS = 12;
const MARKS_SOURCE_VALUES = ['stated', 'inferred'];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
}

/**
 * One entry of `annotatedSteps` — the shape BOTH grade parsers normalise.
 *
 * Provenance (checkSolution.cjs, per-question path — the worksheet path applies the
 * IDENTICAL normalisation at :727-737):
 *   :369  `.filter((s) => s && s.description)`  -> `description` is the ONLY
 *         structurally required step field. A step without one is DROPPED, and its
 *         marks are dropped with it — so requiring it here PROTECTS marks rather
 *         than constraining them.
 *   :371  `stepNumber: i + 1`                   -> the model's numbering is
 *         DISCARDED and re-indexed; optional and inert.
 *   :372  `String(s.studentWork || '')`         -> optional.
 *   :374  status coerced to 'partial' otherwise -> the enum is EXACTLY the parser's
 *         accepted set. Not required and not nullable, so the model may still omit
 *         it and land on the same 'partial' default. No range is lost; the enum only
 *         stops the model inventing a fifth value that the parser would silently
 *         flatten to 'partial' (test §5.3 shows 'brilliant' -> 'partial').
 *   :375  `Number(s.marksAwarded || 0)`         -> optional.
 *   :376  `Number(s.marksDeducted || 0)`        -> optional.
 *   :377  `String(s.teacherAnnotation || '')`   -> optional.
 *   :378  `VALID_MISTAKE_TYPES.has(...) ? ... : null` -> NULLABLE. See below.
 *   :379  `s.correctedWorking ? ... : null`     -> NULLABLE.
 *
 * ★★ WHY `mistakeType` IS `nullable` WITH NO `enum`. The parser ALREADY enforces the
 * four-value set at :378, so adding the enum here buys exactly nothing. Against that
 * zero benefit sits a real, unverifiable-from-here risk: if the API does not honour
 * `nullable` on an enum field, the model would be FORCED to pick a mistake type.
 * Grading rules 4, 5, 6 and 7 (:184-:187) EVERY ONE depend on null being reachable —
 * a correct step, a missing step, an error carried forward and a no-working answer
 * are all required to be `mistakeType: null`, and Mistake Intelligence is built on
 * that output. Forcing a value there would corrupt MI at source to save a retry.
 * Nullable-without-enum degrades safely in both directions: a stray value is nulled
 * by the parser exactly as it is today. See [FU-C2-MISTAKETYPE-NULL-LIVE-VERIFY].
 *
 * ★ NO minItems / maxItems ANYWHERE. The step count must stay free — test §5.8 pins
 * that 1 step and 9 steps are both valid for the same 3-mark question. Pinning a
 * count would trade grading quality for format.
 *
 * Returns a FRESH object per call so the three schemas never alias one another.
 */
function annotatedStepSchema() {
  return {
    type: 'OBJECT',
    properties: {
      stepNumber: { type: 'INTEGER', nullable: true },
      description: { type: 'STRING' },
      studentWork: { type: 'STRING', nullable: true },
      status: { type: 'STRING', enum: STEP_STATUS_VALUES.slice() },
      marksAwarded: { type: 'NUMBER', nullable: true },
      marksDeducted: { type: 'NUMBER', nullable: true },
      teacherAnnotation: { type: 'STRING', nullable: true },
      mistakeType: { type: 'STRING', nullable: true },
      correctedWorking: { type: 'STRING', nullable: true },
    },
    // Ordering hint only — mirrors the order of the prompt's own JSON example
    // (:213-:223) so the model describes a step before it judges it. Carries no
    // constraint on values or presence.
    propertyOrdering: [
      'stepNumber', 'description', 'studentWork', 'status',
      'marksAwarded', 'marksDeducted', 'teacherAnnotation',
      'mistakeType', 'correctedWorking',
    ],
    required: ['description'],
  };
}

/** `mistakeSummary` — optional at :432 (`parsed.mistakeSummary || {}`), each counter
 *  optional at :439 (`Number(rawSummary[cat] || 0)`). Nothing is required. */
function mistakeSummarySchema() {
  return {
    type: 'OBJECT',
    nullable: true,
    properties: {
      conceptual: { type: 'NUMBER', nullable: true },
      calculation: { type: 'NUMBER', nullable: true },
      silly: { type: 'NUMBER', nullable: true },
      presentation: { type: 'NUMBER', nullable: true },
    },
    propertyOrdering: ['conceptual', 'calculation', 'silly', 'presentation'],
  };
}

/**
 * SCHEMA A — the per-question grade (`handleCheckSolution`).
 *
 * `required: ['annotatedSteps']` and NOTHING ELSE, because :314 — the parse gate —
 * is `Array.isArray(p.annotatedSteps)` and that is the whole structural contract.
 * Test §5.7 states it once: `{ annotatedSteps: [{ description }] }` alone is a
 * COMPLETE valid grade, and marking any other field required turns it red.
 *
 * The auto-detect fields are present but OPTIONAL: they are only ever read when the
 * caller sets `detectMarks` (:342), and test §5.10 pins that they are absent on the
 * trusted-marks path — one fixed schema serves both, so it cannot require them.
 *   :343 detectedMarks / totalMarks — `totalMarks` is read ONLY as the autoDetect
 *        fallback; on the trusted-marks path it is never read at all (:338).
 *   :346 marksSource  -> enum is exactly `'stated'` vs everything-else-is-inferred.
 *   :354 detectedSubject -> nullable; matched by regex, so NO enum.
 *   :359 detectedTopic   -> nullable; the vocabulary is per-request and the parser
 *        even tolerates the literal string "null", so NO enum.
 *
 * `marksAwarded` at top level is declared because the prompt asks for it (:211) but
 * carries no `required`: the parser NEVER reads it — the total is recomputed from
 * the per-step sum at :415-:416.
 */
const GRADE_RESPONSE_SCHEMA = deepFreeze({
  type: 'OBJECT',
  properties: {
    detectedSubject: { type: 'STRING', nullable: true },
    detectedTopic: { type: 'STRING', nullable: true },
    detectedMarks: { type: 'NUMBER', nullable: true },
    marksSource: { type: 'STRING', enum: MARKS_SOURCE_VALUES.slice() },
    totalMarks: { type: 'NUMBER', nullable: true },
    marksAwarded: { type: 'NUMBER', nullable: true },
    annotatedSteps: { type: 'ARRAY', items: annotatedStepSchema() },
    mistakeSummary: mistakeSummarySchema(),
    teacherNote: { type: 'STRING', nullable: true },
  },
  propertyOrdering: [
    'detectedSubject', 'detectedTopic', 'detectedMarks', 'marksSource',
    'totalMarks', 'marksAwarded', 'annotatedSteps', 'mistakeSummary', 'teacherNote',
  ],
  required: ['annotatedSteps'],
});

/**
 * SCHEMA B — question detection (`handleDetectQuestion`).
 *
 * NO top-level `required` at all: the gate at :603 is only `if (!parsed)`, so a bare
 * `{}` is an accepted parse (every field then degrades through its own documented
 * fallback — marks to 3 with `marksSource:'fallback'` at :617-:619).
 *
 *   :611 detectedMarks     -> optional; out-of-band values fall back honestly.
 *   :616 marksSource       -> enum exactly matches the parser's stated/inferred.
 *   :621 detectedSubject   -> nullable, regex-matched, NO enum.
 *   :626 detectedTopic     -> nullable, NO enum (per-request vocabulary).
 *   :635 detectedObjective -> BOOLEAN. The parser also tolerates the STRING 'true';
 *        typing it boolean removes only a defensive tolerance for a wrong-typed
 *        value — `true` itself stays fully expressible, so no outcome reachable
 *        before is unreachable now.
 *   :644 questions         -> optional array.
 *   :659 questions[].questionText -> REQUIRED: `.filter((q) => q.questionText.length > 0)`
 *        DROPS a textless entry, so requiring it prevents silent question loss.
 *   :652 questionNumber    -> optional (falls back to index+1).
 *   :649 marks             -> optional (falls back to detectedMarks).
 *
 * ★ NOTE: detect is the ONE path with no retry (test §3.5) — a parse miss costs the
 * student the whole read. That makes a guaranteed shape worth more here than
 * anywhere else, and makes the geminiClient strip-and-retry ladder essential.
 */
const DETECT_RESPONSE_SCHEMA = deepFreeze({
  type: 'OBJECT',
  properties: {
    detectedMarks: { type: 'NUMBER', nullable: true },
    marksSource: { type: 'STRING', enum: MARKS_SOURCE_VALUES.slice() },
    detectedSubject: { type: 'STRING', nullable: true },
    detectedTopic: { type: 'STRING', nullable: true },
    detectedObjective: { type: 'BOOLEAN', nullable: true },
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          questionNumber: { type: 'INTEGER', nullable: true },
          questionText: { type: 'STRING' },
          marks: { type: 'NUMBER', nullable: true },
          marksSource: { type: 'STRING', enum: MARKS_SOURCE_VALUES.slice() },
          objective: { type: 'BOOLEAN', nullable: true },
        },
        propertyOrdering: ['questionNumber', 'questionText', 'marks', 'marksSource', 'objective'],
        required: ['questionText'],
      },
    },
  },
  propertyOrdering: [
    'detectedMarks', 'marksSource', 'detectedSubject', 'detectedTopic',
    'detectedObjective', 'questions',
  ],
});

/**
 * SCHEMA C — the whole-worksheet structured grade (`gradeStructuredSet`).
 *
 * `required: ['results']` matches the worksheet gate at :1009. Per entry,
 * `required: ['qNumber']` matches :1040 — `if (r && r.qNumber != null) byNumber.set(...)`
 * discards an entry without one ENTIRELY, and the question it belonged to then falls
 * through to couldNotRead. Requiring it protects grades rather than constraining them.
 *
 * ★★ `annotatedSteps` IS NOT REQUIRED HERE, AND THAT IS THE WHOLE REASON THIS IS A
 * SEPARATE SCHEMA. In SCHEMA A it is the parse gate; here :725 reads
 * `Array.isArray(raw.annotatedSteps) ? raw.annotatedSteps : []` — optional — because
 * a `couldNotRead: true` entry legitimately has NO steps (:714-:723, pinned by test
 * §5.11). Requiring it would have forced the model to FABRICATE steps for an answer
 * it could not read, in direct breach of the anti-fabrication rule the prompt states
 * at :963 ("NEVER guess a mark, and NEVER record an unreadable/absent answer as 0").
 * Reusing SCHEMA A here would have shipped exactly that bug.
 *
 *   :714 couldNotRead -> optional BOOLEAN (parser also tolerates the string 'true').
 *   :720 note         -> optional.
 *   :789 mistakeSummary / :813 teacherNote -> optional.
 *   :1045 summary     -> optional.
 *   marksAwarded per entry is declared for the prompt's benefit (:975) but is NEVER
 *   read: the total is recomputed from the step sum at :780-:781.
 */
const WORKSHEET_RESPONSE_SCHEMA = deepFreeze({
  type: 'OBJECT',
  properties: {
    results: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          qNumber: { type: 'INTEGER' },
          couldNotRead: { type: 'BOOLEAN', nullable: true },
          note: { type: 'STRING', nullable: true },
          marksAwarded: { type: 'NUMBER', nullable: true },
          annotatedSteps: { type: 'ARRAY', nullable: true, items: annotatedStepSchema() },
          mistakeSummary: mistakeSummarySchema(),
          teacherNote: { type: 'STRING', nullable: true },
        },
        propertyOrdering: [
          'qNumber', 'couldNotRead', 'note', 'marksAwarded',
          'annotatedSteps', 'mistakeSummary', 'teacherNote',
        ],
        required: ['qNumber'],
      },
    },
    summary: { type: 'STRING', nullable: true },
  },
  propertyOrdering: ['results', 'summary'],
  required: ['results'],
});

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
    // C&I PR-3 (OPTIONAL, additive): the shared model-solution cache
    // ({ getOrCreateModelSolution }) injected by questions.cjs. When absent —
    // every direct/legacy construction — both grade paths are byte-identical
    // to before: the scheme-first hooks below are skipped entirely.
    solutionCache,
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

    // Objective signals (ALL optional, ADDITIVE). When a caller forwards them —
    // bank-sourced Check & Improve carries section/format/answer/options; a keyless
    // detect step sets `objective` — the deterministic 0/full clamp applies. When
    // NONE are present (every legacy caller) `objectiveMeta` classifies as
    // non-objective and this path is byte-identical to before.
    const objectiveMeta = {
      section: String(payload.section || '').trim(),
      format: String(payload.format || '').trim(),
      qType: String(payload.qType || '').trim(),
      answer: payload.answer != null ? String(payload.answer).trim() : null,
      options: Array.isArray(payload.options) ? payload.options.map(String) : null,
      correctOption: payload.correctOption ? String(payload.correctOption).trim() : null,
    };
    // A keyless external upload (standalone Check & Improve) can only learn objectivity
    // from the detect step's model flag — clamp off the model's binary verdict, but
    // ONLY for a ≤1-mark item (the safety rail so a multi-mark subjective is never
    // clamped on a model guess).
    const detectedObjective = payload.objective === true || payload.objective === 'true';

    // Claim-2 auto-detect: when the caller cannot supply an authoritative mark
    // value (Check & Improve — a student shouldn't decide "is this a 3-mark
    // question?"), the AI determines marks/subject/topic from the question it
    // already receives. `marks`/`subject`/`topic` above are then HINTS only. The
    // flag is opt-in so the trusted-marks callers (Quick Practice / SolutionChecker,
    // whose marks come from the canonical bank) are byte-identical to before.
    const autoDetect = Boolean(payload.detectMarks);
    // Canonical topic vocabulary (passed by the client from topics.ts — the single
    // source of truth) so the model can ONLY choose a real topicKey, never free text.
    const topicVocabulary = Array.isArray(payload.topicVocabulary)
      ? payload.topicVocabulary
          .map((t) => ({
            slug: String((t && t.slug) || '').trim(),
            name: String((t && t.name) || '').trim(),
            subject: String((t && t.subject) || '').trim(),
          }))
          .filter((t) => t.slug && t.name)
      : [];

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

      // Canonical-topic list for the prompt (auto-detect only). The model must set
      // detectedTopic to one of these exact keys (or null) — never invent a topic.
      const topicListBlock = autoDetect && topicVocabulary.length > 0
        ? '\n\nCANONICAL TOPICS — set "detectedTopic" to the exact key of the one that best matches the question, or null if none clearly fits. Never invent a topic.\n' +
          topicVocabulary
            .map((t) => '  - "' + t.slug + '"  (' + t.subject + ' — ' + t.name + ')')
            .join('\n') + '\n'
        : '';

      // Detection instructions (auto-detect only): determine marks/subject/topic
      // from the question BEFORE grading. Printed marks win; otherwise infer.
      const detectionRules = autoDetect
        ? '\nDETERMINE THE QUESTION FIRST (from the question text/image, before grading):\n' +
          '- detectedMarks: if the question prints/states a mark value (e.g. "[3]", "(2 marks)", "3 marks"), use THAT exact value and set "marksSource" to "stated". If NO mark is printed, infer a sensible CBSE mark from the question type and depth — 1 for one-line/MCQ/objective, 2 for very short, 3 for short-answer, 5 for long-answer/derivation/proof, 4 for a case-study — and set "marksSource" to "inferred". Never let anything override a clearly-printed value, and never blindly default to 3.\n' +
          '- detectedSubject: "Maths" or "Science".\n' +
          '- detectedTopic: the canonical topic key from the list below (exact string), or null if none clearly fits.\n'
        : '';

      const systemPrompt =
        'You are a CBSE Class 10 board examiner grading a student\'s paper like a real teacher marking with a red pen. ' +
        (autoDetect
          ? 'FIRST determine the question\'s total marks, subject and topic from the question itself (see "DETERMINE THE QUESTION FIRST"); THEN grade. '
          : '') +
        'For each step in the student\'s work you: identify exactly what was written, assess correctness, award or deduct marks, ' +
        'classify the type of mistake (conceptual/calculation/silly/presentation), and show the corrected version for wrong steps. ' +
        'The mistake type must reflect WHAT THE ERROR REVEALS ABOUT THE STUDENT\'S UNDERSTANDING, not where it appears or how big it is. ' +
        'Before you label any error, reason about its CAUSE: does this show the student misunderstands the method, or understands it but slipped? ' +
        'Respond ONLY with valid JSON, no markdown fences.';

      const gradingRules =
        'GRADING RULES:\n' +
        '1. Identify EVERY step in the student\'s work in order — don\'t skip any.\n' +
        '2. marksAwarded (total) = sum of all annotatedSteps[].marksAwarded, capped at ' + (autoDetect ? 'the totalMarks you determine for this question' : marks) + '.\n' +
        '3. mistakeType — choose by the CAUSE the error reveals about understanding, not by where it appears:\n' +
        '   - "conceptual": the METHOD or understanding itself is wrong — wrong formula/law/theorem for the situation, confused concepts, misread what the question asks, (Science) wrong principle/organ/law. The student does not know the right approach. Example: reads the coefficients of x^2 - 2x - 8 and writes "zeroes are 2 and 8" without factoring — wrong method, conceptual.\n' +
        '   - "calculation": the METHOD is right but the arithmetic/algebra is wrong — e.g. 12 × 1.73 worked out as 20.16, a wrong expansion, a wrong number substituted into a correct formula.\n' +
        '   - "silly": the student CLEARLY understands but made a mechanical slip — a sign misread off their OWN correct working, a dropped negative, a copying/transcription error, swapped values. Tell-tale: their other steps prove they know better. Example: factors (x−4)(x+2) correctly but then writes a root as x = −4 instead of +4 — a SILLY sign-misread, NOT conceptual (the correct factoring proves the method was understood).\n' +
        '   - "presentation": mathematically/chemically RIGHT but board-format short — missing the required formula (e.g. −b/a), missing units, no conclusion/"verified" line, working not shown, required diagram absent, (Science) a correct reaction left UNBALANCED, missing state symbols. The answer is right; only the formal presentation is incomplete. A correct but unbalanced equation is PRESENTATION, not conceptual.\n' +
        '4. ERROR PROPAGATION → ONE root cause. If a single upstream slip makes later steps wrong, that is ONE mistake attributed to the SOURCE step. Mark each downstream step as following correctly from the wrong value (error carried forward): status "incorrect" but mistakeType null. This includes a verification/check step that only "fails" because it was correctly applied to the carried-forward wrong value (e.g. the student plugs their own wrong root into the sum check and honestly notes it does not match) — that is carried forward (mistakeType null), not a presentation or conceptual fault of its own. Do NOT label each propagated step as a fresh mistake, and never inflate one slip into several (especially several conceptual) mistakes. ERROR-CARRIED-FORWARD (ECF) MARKING. When a step is wrong ONLY because it correctly applied the right method to a value carried from an earlier mistake: award that step its method/process marks and do NOT treat it as a fresh mistake (mistakeType null). Withhold ONLY the mark(s) attributable to reaching the correct FINAL answer — so a wrong final answer NEVER earns full marks, but correct method NEVER earns zero. On a single-mark question there are no separate method marks, so a wrong answer scores 0. Award marks in HALF-MARK units (½ is the smallest unit; no finer). Awarded marks must sum to a ½-multiple not exceeding the question\'s total, allocated to the ACTUAL steps — never invented to hit a number.\n' +
        '5. A CORRECT step ALWAYS has mistakeType null. Never invent a mistake on a right step.\n' +
        '6. MISSING is ALWAYS mistakeType null. A required step the student left ENTIRELY BLANK / did not attempt gets status "missing" and mistakeType null — the marks are simply not earned; it is never a typed mistake (not presentation, not conceptual), even when the thing left out is a required formula, unit, conclusion, or verification line. Do NOT manufacture extra "missing" steps; only list a step as missing if that whole step was genuinely required and wholly absent. NOTE ON NON-ATTEMPTS: if the student\'s response is a legible phrase like \'Don\'t know\', \'Dont know\', \'I don\'t know\', or \'DK\', this IS a readable response — grade it as a single step with status "incorrect", full marks deducted, mistakeType null (no working shown, undiagnosable). Never treat a legible non-attempt phrase as a missing or unreadable submission.\n' +
        '7. NO WORKING SHOWN → mistakeType null. If the student shows NO working — only a final answer — and it is wrong, you CANNOT diagnose the cause: set mistakeType null for that step. Never guess "conceptual" (or any type) from a bare wrong answer. A wrong answer with no working is undiagnosable, not conceptual — the marks are still not earned (status stays "incorrect"), only the type is null.\n' +
        '8. ALTERNATIVE VALID METHOD is NOT a mistake. If the student reaches the answer by a correct method the marking scheme did not anticipate (e.g. quadratic formula instead of factoring, completing the square), award full marks — the scheme is the reference, not a straitjacket.\n' +
        '9. PRESENTATION vs MISSING. If the student ACTUALLY WROTE a step and the math is right but a required FORMAT element is short (e.g. computed the value but did not show the −b/a comparison, missing units, no "verified"/conclusion line, working not shown), keep it as ONE step with status "partial" and mistakeType "presentation" — fold the short format element INTO that attempted step; do NOT split it off into a separate "missing" step. (Format short on work the student DID write = presentation; a whole step left blank = missing per rule 6.) Right answer with weak or no justification → presentation, not conceptual.\n' +
        '10. correctedWorking: for incorrect/partial steps ONLY — write EXACTLY what the student should have written.\n' +
        '11. teacherNote: 3–4 plain-English sentences — start with overall assessment, mention what was done well, state the single most important thing to fix.\n' +
        (autoDetect
          ? '12. Apply the checks for the subject you detect — Maths: formula, substitution, calculation, proper notation (√ ² ± ∴), final answer boxed/underlined, units where applicable. Science: terminology, balanced equations, state symbols (s/l/g/aq), NCERT-standard language, diagrams labelled.\n'
          : isMaths
          ? '12. For Maths: check formula, substitution, calculation, proper notation (√ ² ± ∴), final answer boxed/underlined, units where applicable.\n'
          : '12. For Science: check terminology, balanced equations, state symbols (s/l/g/aq), NCERT-standard language, diagrams labelled.\n') +
        '13. Be accurate but encouraging — exactly as a real CBSE board examiner would grade. Attribute a type PER STEP; never blanket-label the whole answer.\n' +
        '14. WORD-PROBLEM FINAL ANSWER: when a question asks to "find a number/value/quantity", correctly solving the equation earns the equation-solving marks. Explicitly stating which root satisfies the problem context (e.g. "N = 8 since N must be a natural number; N = -20 rejected") is a required final step. If the student solves correctly but omits this explicit contextual statement, deduct ½ mark as a presentation step — never deduct more than ½ for this alone if the equation and roots are both correct. PARTIAL CREDIT: award marks strictly by the step weights in the marking scheme. A step the student attempted correctly earns its allocated marks even if a later step is wrong. A step with a calculation error earns 0 for that step only — never redistribute or re-weight marks across steps. If no explicit per-step weight exists, distribute the question\'s total marks evenly across required steps. OBJECTIVE EXCEPTION (MCQ / Assertion-Reason / Section A): NEVER step-mark an objective question and NEVER split its marks across steps — it scores the WHOLE mark on the correct option or 0 on a wrong one, never a fraction. Any working the student wrote for an MCQ is read ONLY to classify the mistake type, never to award partial marks.\n' +
        '15. QUESTION MISCOPY: if the student\'s working is internally consistent and mathematically correct but solves a DIFFERENT equation/expression/problem than the one stated in the question (i.e. they appear to have miscopied or misread the question from the paper), award 0 marks for the entire question and classify mistakeType as \'silly\'. A correctly solved wrong problem earns no credit. Tell-tale sign: the student\'s equation/values do not match the question\'s stated coefficients/values, yet their algebraic steps are internally correct for what they wrote.';

      const jsonSchema =
        'RESPOND with this exact JSON:\n' +
        '{\n' +
        (autoDetect
          ? '  "detectedSubject": "Maths" | "Science",\n' +
            '  "detectedTopic": "<canonical topic key from the list, or null>",\n' +
            '  "detectedMarks": <the total marks you determined for this question>,\n' +
            '  "marksSource": "stated" | "inferred",\n'
          : '') +
        '  "totalMarks": ' + (autoDetect ? '<same number as detectedMarks>' : marks) + ',\n' +
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

      // ── C&I PR-3 · scheme-first cache hook (read-before-grade) ────────────────
      // A keyless SUBJECTIVE question (no bank solutionSteps) grades against a
      // STUDENT-AGNOSTIC model solution obtained through the shared question-hash
      // cache: read by hash; on miss generate from the question text alone
      // (Gate-2a quality-checked, write-if-pass), so the same question shares one
      // solution across students. The scheme feeds the EXISTING marking-scheme
      // slot below — grading rules, normalisation and clamps are untouched.
      // Byte-identical paths: bank-sourced calls (solutionSteps present), the
      // autoDetect path (no trusted marks pre-grade -> no stable hash), objective
      // questions (the deterministic 0/full clamp governs marks), and every
      // caller without the injected solutionCache dep. Any cache failure
      // degrades to the empty scheme slot — grading never blocks on the cache.
      let schemeSteps = solutionSteps;
      if (
        solutionCache &&
        (!solutionSteps || solutionSteps.length === 0) &&
        !autoDetect &&
        !isObjective(objectiveMeta) &&
        !detectedObjective
      ) {
        try {
          const cached = await solutionCache.getOrCreateModelSolution({
            question,
            marks,
            subject,
            topic,
            qType: objectiveMeta.qType,
            section: objectiveMeta.section,
            isObjective: false,
          });
          if (cached && Array.isArray(cached.schemeSteps) && cached.schemeSteps.length > 0) {
            schemeSteps = cached.schemeSteps;
          }
        } catch (e) {
          console.warn('[check-solution] solution-cache hook failed (grading continues):', e.message);
        }
      }

      const markingSchemeBlock = schemeSteps && schemeSteps.length > 0
        ? '\n\nOFFICIAL CBSE MARKING SCHEME (use this as your reference for grading):\n' +
          schemeSteps.map((step, i) => '  Step ' + (i + 1) + ': ' + step).join('\n') +
          (finalAnswer ? '\n  Final answer: ' + finalAnswer : '') +
          '\n\nGrade the student\'s work step-by-step against these official steps. For each official step, assess whether the student hit it (correct), partially hit it (partial), missed it entirely (missing), or got it wrong (incorrect). Award marks according to the weights shown in [brackets] in each step, or distribute evenly if no brackets are present. Note which official steps the student completed and which they skipped.\n'
        : '';

      const userPrompt =
        'Grade this student\'s answer for the following CBSE board exam question.\n\n' +
        'Question: ' + question + '\n' +
        (autoDetect
          ? detectionRules + topicListBlock
          : 'Total marks: ' + marks + '\n' +
            'Subject: ' + subject + '\n' +
            (topic ? 'Chapter/Topic: ' + topic + '\n' : '')) +
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
        temperature: 0.05,
        maxOutputTokens: 16000,
        responseMimeType: 'application/json',
        // Constrained decoding (PR-C2). Derived from THIS path's parser — see
        // GRADE_RESPONSE_SCHEMA. The retry below is deliberately KEPT: a schema
        // should make it fire less, and proving that is a measurement, not a
        // deletion. It also still guards the case a schema cannot: this call's
        // documented dominant failure is TRUNCATION at maxOutputTokens (see the
        // comment above), which constrained decoding does not prevent.
        responseSchema: GRADE_RESPONSE_SCHEMA,
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
        // Resolve the authoritative mark scale + detected fields. In auto-detect
        // mode the AI determines marks/subject/topic from the question (a printed
        // value is preferred over inference); otherwise the caller-supplied
        // marks/subject/topic stay authoritative (unchanged trusted-marks path).
        let effectiveMarks = marks;
        let detectedSubject = null;
        let detectedTopic = null;
        let marksSource = null;
        if (autoDetect) {
          const dm = Number(parsed.detectedMarks != null ? parsed.detectedMarks : parsed.totalMarks);
          if (Number.isFinite(dm) && dm >= 1 && dm <= 6) {
            effectiveMarks = Math.round(dm);
            marksSource = parsed.marksSource === 'stated' ? 'stated' : 'inferred';
          } else {
            // The model failed to return a usable mark — fall back to the caller's
            // hint if it sent one, else a neutral 3, and flag it honestly so the
            // client never presents a blind default as a confident detection.
            effectiveMarks = Number.isFinite(marks) && marks >= 1 ? marks : 3;
            marksSource = 'fallback';
          }
          detectedSubject = /sci/i.test(String(parsed.detectedSubject || ''))
            ? 'Science'
            : /math/i.test(String(parsed.detectedSubject || ''))
              ? 'Maths'
              : null;
          const dt = parsed.detectedTopic;
          detectedTopic =
            dt && String(dt).trim() && String(dt).trim().toLowerCase() !== 'null'
              ? String(dt).trim()
              : null;
        }

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

        // ── Uniform OBJECTIVE handling — BYTE-ALIGNED with normaliseStructuredResult ─
        // Both graders call the SAME shared clamp + guard (one impl, two callers) so
        // their objective logic cannot drift. Objectivity is known here from EITHER a
        // forwarded bank signal (section/format/answer/options — bank-sourced Check &
        // Improve) OR a keyless detect-step flag gated to ≤1 mark. When NEITHER is
        // present this whole block is byte-identical to the prior no-working guard:
        // applyObjectiveMistakeGuard with objective:false nulls a fabricated type only
        // on an incorrect step with empty studentWork — exactly the old behaviour — so
        // every legacy caller (Quick Practice / TopicHub / standalone Check & Improve)
        // is unchanged.
        const bankObjective = isObjective(objectiveMeta);
        const flaggedObjective = detectedObjective && effectiveMarks <= 1;
        const questionIsObjective = bankObjective || flaggedObjective;

        // C) The deterministic 0/full clamp (objective only): with a forwarded answer
        //    key it OVERRIDES the model on a normalised compare; keyless it takes the
        //    model's binary verdict. Strips per-step marks and aligns status. Runs
        //    unconditionally for objective questions — never fractional/step-distributed.
        let objectiveMarksAwarded = null;
        if (questionIsObjective) {
          objectiveMarksAwarded = clampObjectiveResult(objectiveMeta, annotatedSteps, effectiveMarks).marksAwarded;
        }

        // D) The shared mistake-type honesty guard. Nulls a fabricated mistakeType only
        //    where there is no working to classify (empty studentWork for any question;
        //    a bare option pick for an objective one). A wrong MCQ WITH real working
        //    KEEPS its type so MI learns. Returns the per-category nulled tally so the
        //    additive-floor reconcile below can subtract it from the model's summary.
        const noWorkingNulled = applyObjectiveMistakeGuard(annotatedSteps, {
          objective: questionIsObjective,
          options: objectiveMeta.options,
        });

        const totalAwarded = annotatedSteps.reduce((sum, s) => sum + s.marksAwarded, 0);
        const capped = questionIsObjective ? objectiveMarksAwarded : Math.min(totalAwarded, effectiveMarks);

        // Additive-floor reconcile: the LLM's self-reported mistakeSummary is
        // unreliable — it frequently leaves the four counters at 0 even when it
        // deducted marks and tagged steps with a mistakeType (the root of the
        // Quick-Practice "mistake not logged" bug). For each category, take the
        // MAX of the LLM's count and the number of annotatedSteps carrying that
        // mistakeType. ADDITIVE FLOOR for legitimately-tagged worked steps — if no
        // step carries a mistakeType the floor is 0 and the LLM summary passes
        // through unchanged. The ONE thing we subtract first is `noWorkingNulled`:
        // counts the guard just suppressed because the step had no working. Without
        // that subtraction, max(rawSummary, stepFloor) would re-introduce the
        // fabricated count via rawSummary even though we nulled the per-step type —
        // the no-working honesty guard must drive the bucket to 0 from BOTH sources.
        // The step→category map is 1:1 (annotatedSteps[].mistakeType is already one
        // of the four categories, validated above).
        const rawSummary = parsed.mistakeSummary || {};
        const stepFloor = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
        for (const s of annotatedSteps) {
          if (s.mistakeType && Object.prototype.hasOwnProperty.call(stepFloor, s.mistakeType)) {
            stepFloor[s.mistakeType] += 1;
          }
        }
        const rawAdjusted = (cat) => Number(rawSummary[cat] || 0) - noWorkingNulled[cat];
        const mistakeSummary = {
          conceptual: Math.max(0, rawAdjusted('conceptual'), stepFloor.conceptual),
          calculation: Math.max(0, rawAdjusted('calculation'), stepFloor.calculation),
          silly: Math.max(0, rawAdjusted('silly'), stepFloor.silly),
          presentation: Math.max(0, rawAdjusted('presentation'), stepFloor.presentation),
        };

        return sendJson(res, 200, {
          ok: true,
          totalMarks: effectiveMarks,
          marksAwarded: capped,
          percentage: Math.round((capped / effectiveMarks) * 100),
          annotatedSteps,
          mistakeSummary,
          teacherNote: String(parsed.teacherNote || '').trim(),
          // Objective echo (additive; PAIRED with normaliseStructuredResult below —
          // keep both in sync). For an objective question the clamp above zeroed every
          // per-step mark BY DESIGN (the whole mark lives at answer level, PR-348), so
          // "0 marks" on a step is intentional, NOT a student who scored 0. This flag
          // lets the view suppress the misleading per-step chip while keeping the
          // annotations. It is exactly `bankObjective || flaggedObjective` — false for
          // every subjective question by construction, so no subjective render changes.
          objective: questionIsObjective,
          // Auto-detect echo (null in the trusted-marks path): the client surfaces
          // these read-only and canonicalises detectedTopic before storing.
          detectedSubject,
          detectedTopic,
          marksSource,
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

  // ── Detection-only (detect-then-confirm, Claim 2 UX) ──────────────────────
  // A focused, cheap call that reads marks/subject/topic FROM THE QUESTION ALONE
  // (text or an uploaded photo) BEFORE the student commits an answer — so the UI
  // can show the detected values and let the student correct a wrong one. No
  // grading happens here. The grade call then runs on the CONFIRMED values via the
  // existing trusted-marks path. Marks/subject/topic contract is identical to the
  // grader's auto-detect block (printed marks win; topic constrained to the
  // canonical vocabulary; honest fallback).
  async function handleDetectQuestion(req, res) {
    let payload;
    try {
      payload = await readJson(req);
    } catch (e) {
      return sendJson(res, 400, { error: 'Invalid JSON' });
    }

    const question = String(payload.question || '').trim();
    const imageBase64 = String(payload.imageBase64 || '').trim();
    const imageMimeType = String(payload.imageMimeType || 'image/jpeg').trim();
    const isPdf = imageMimeType === 'application/pdf';
    const hasImage = imageBase64.length > 0;
    const topicVocabulary = Array.isArray(payload.topicVocabulary)
      ? payload.topicVocabulary
          .map((t) => ({
            slug: String((t && t.slug) || '').trim(),
            name: String((t && t.name) || '').trim(),
            subject: String((t && t.subject) || '').trim(),
          }))
          .filter((t) => t.slug && t.name)
      : [];

    if (!question && !hasImage) {
      return sendJson(res, 400, { error: 'Provide the question text or a photo of the question' });
    }
    if (hasImage) {
      const imgCheck = validateMentorImagePayload(payload);
      if (!imgCheck || !imgCheck.ok) {
        return sendJson(res, 400, { error: imgCheck ? imgCheck.error : 'Invalid image' });
      }
    }

    if (isStubMode()) {
      return sendJson(res, 200, {
        ok: true,
        detectedMarks: 3,
        detectedSubject: 'Maths',
        detectedTopic: null,
        marksSource: 'inferred',
        detectedObjective: false,
        // Single-item array so the client's questions[] shape is consistent in
        // dev/stub mode too (a single question → existing single-question flow).
        questions: [
          { questionNumber: 1, questionText: question || 'Sample question', marks: 3, marksSource: 'inferred', objective: false },
        ],
      });
    }

    const topicListBlock = topicVocabulary.length > 0
      ? '\n\nCANONICAL TOPICS — set "detectedTopic" to the exact key of the one that best matches the question, or null if none clearly fits. Never invent a topic.\n' +
        topicVocabulary
          .map((t) => '  - "' + t.slug + '"  (' + t.subject + ' — ' + t.name + ')')
          .join('\n') + '\n'
      : '';

    const prompt =
      'You are a CBSE Class 10 examiner. Read the question below and determine ONLY its total marks, subject and topic. ' +
      'Do NOT solve or grade it. Respond ONLY with valid JSON, no markdown fences.\n\n' +
      (question ? 'Question: ' + question + '\n' : '') +
      (hasImage
        ? 'The attached ' + (isPdf ? 'PDF' : 'image') + ' is a photo of the QUESTION — read the printed text, including any printed mark allocation.\n'
        : '') +
      '\nDETERMINE:\n' +
      '- detectedMarks: if the question prints/states a mark value (e.g. "[3]", "(2 marks)", "3 marks"), use THAT exact value and set "marksSource" to "stated". If NO mark is printed, infer a sensible CBSE mark from the question type and depth — 1 for one-line/MCQ/objective, 2 for very short, 3 for short-answer, 5 for long-answer/derivation/proof, 4 for a case-study — and set "marksSource" to "inferred". Never override a clearly-printed value, and never blindly default to 3.\n' +
      '- detectedSubject: "Maths" or "Science".\n' +
      '- detectedTopic: the canonical topic key from the list below (exact string), or null if none clearly fits.\n' +
      '- objective: true ONLY if the question is a multiple-choice question (lettered options like (a)/(b)/(c)/(d)) or an assertion-reason question; false for any question that needs written working, a derivation, a proof, or step-by-step reasoning. Apply this per question.\n' +
      topicListBlock +
      // The multi-question instruction is placed LAST (after the topic list, right
      // before RESPOND) so the model reads it most recently — recency keeps it from
      // stopping after the first question on a multi-question paper.
      '- questions: if the document contains MULTIPLE questions (e.g. Q1, Q2, Q3 …), identify ALL of them and list each in the "questions" array with its printed question number, FULL question text exactly as printed, marks (apply the SAME stated-vs-inferred rule per question), and its objective flag. List EVERY question you find — do not stop after the first. If only ONE question is present, still include it as a single-item array. Set the top-level detectedMarks/marksSource/detectedSubject/detectedTopic/detectedObjective to the FIRST question\'s values for backward compatibility.\n' +
      '\nRESPOND with this exact JSON:\n' +
      '{ "detectedMarks": <first question marks>, "marksSource": "stated"|"inferred", "detectedSubject": "Maths"|"Science", "detectedTopic": "<canonical key or null>", "detectedObjective": <true|false>, "questions": [ { "questionNumber": 1, "questionText": "<full text of Q1 exactly as printed>", "marks": <number>, "marksSource": "stated"|"inferred", "objective": <true|false> }, { "questionNumber": 2, "questionText": "<full text of Q2 exactly as printed>", "marks": <number>, "marksSource": "stated"|"inferred", "objective": <true|false> }, ... one object per question found ] }';

    try {
      const parts = hasImage
        ? [{ text: prompt }, buildGeminiImagePart({ mimeType: imageMimeType, base64: imageBase64 })]
        : [{ text: prompt }];
      const reply = await callGemini(GEMINI_MODEL, [{ role: 'user', parts }], {
        temperature: 0.1,
        // Multi-question detect returns the FULL text of every question in the
        // upload, so the JSON can be far larger than a single-question read. With
        // thinking disabled (below) the whole budget is available for that JSON;
        // 4096 gives safe headroom for a full paper whose later questions are
        // 5-mark long-answers with lengthy text (2048 could clip Q4/Q5). (A
        // single-question read returns the same small JSON — the cap is only an
        // upper bound.)
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
        // Constrained decoding (PR-C2) — DETECT_RESPONSE_SCHEMA, derived from this
        // handler's own parser (:603 onward), which is far looser than the grader's:
        // a bare `{}` is an accepted parse. Worth most here of the three, because
        // detect is the ONE path with no retry (test §3.5).
        responseSchema: DETECT_RESPONSE_SCHEMA,
        // gemini-2.5-flash is a thinking model and thinking tokens count against
        // maxOutputTokens. At a 400-token cap the thoughts (~383) ate the budget,
        // leaving 1-5 tokens for the JSON → truncated → "couldn't read the question".
        // Disable thinking on this detect-only call (the reasoning sites stay dynamic).
        thinkingConfig: { thinkingBudget: 0 },
      });
      const parsed = extractJsonObjectFromText(reply.text);
      if (!parsed) {
        return sendJson(res, 200, {
          ok: false,
          error: "We couldn't read the question this time — please try again.",
        });
      }

      // Validate identically to the grader's auto-detect block.
      const dm = Number(parsed.detectedMarks);
      let detectedMarks;
      let marksSource;
      if (Number.isFinite(dm) && dm >= 1 && dm <= 6) {
        detectedMarks = Math.round(dm);
        marksSource = parsed.marksSource === 'stated' ? 'stated' : 'inferred';
      } else {
        detectedMarks = 3;
        marksSource = 'fallback';
      }
      const detectedSubject = /sci/i.test(String(parsed.detectedSubject || ''))
        ? 'Science'
        : /math/i.test(String(parsed.detectedSubject || ''))
          ? 'Maths'
          : null;
      const dt = parsed.detectedTopic;
      const detectedTopic =
        dt && String(dt).trim() && String(dt).trim().toLowerCase() !== 'null'
          ? String(dt).trim()
          : null;
      // Objective flag (additive) — the keyless Check & Improve grade call forwards it
      // so the grader can clamp a ≤1-mark objective question to 0/full off the model's
      // binary verdict. Defaults to false, so a model that omits it leaves grading
      // byte-unchanged.
      const detectedObjective = parsed.detectedObjective === true || parsed.detectedObjective === 'true';

      // Multi-question array (additive). Each entry is normalised the SAME way the
      // single-question detectedMarks is: marks clamped to the CBSE 1–6 range
      // (falling back to the top-level detectedMarks when the model omits/garbles a
      // per-question value), marksSource limited to stated/inferred, and the text
      // trimmed. Entries without readable text are dropped (never fabricated). The
      // existing single-question fields above are UNCHANGED — a single-question read
      // simply yields a single-item array and the client's existing flow is untouched.
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
      const questions = rawQuestions
        .map((q, i) => {
          const text = String((q && q.questionText) || '').trim();
          const qm = Number(q && q.marks);
          const marks = Number.isFinite(qm) && qm >= 1 && qm <= 6 ? Math.round(qm) : detectedMarks;
          const qn = Number(q && q.questionNumber);
          return {
            questionNumber: Number.isFinite(qn) && qn >= 1 ? Math.round(qn) : i + 1,
            questionText: text,
            marks,
            marksSource: q && q.marksSource === 'stated' ? 'stated' : 'inferred',
            objective: q && (q.objective === true || q.objective === 'true') ? true : false,
          };
        })
        .filter((q) => q.questionText.length > 0);

      return sendJson(res, 200, {
        ok: true,
        detectedMarks,
        detectedSubject,
        detectedTopic,
        marksSource,
        detectedObjective,
        questions,
        provider: ACTIVE_PROVIDER,
        model: GEMINI_MODEL,
      });
    } catch (err) {
      console.error('[detect-question]', err);
      return sendJson(res, 500, {
        ok: false,
        error: 'Failed to read the question. Please try again.',
      });
    }
  }

  // ── Structured-set grading (PR-E2b — one-PDF worksheet grade loop) ─────────
  // Grade a WHOLE known question set from ONE uploaded PDF in a SINGLE structured
  // Gemini call (spec §6, design decision (a)). This is the reusable core that
  // Chapter Test / Full Mock will later share: it is surface-AGNOSTIC — it takes
  // (uploaded PDF, known question set + schemes) and returns per-question results
  // keyed Q1…QN. It knows NOTHING about "worksheet"; the caller fetches its own
  // question set (the worksheet caller from getWorksheetSession) and passes it in.
  //
  // It REUSES the per-question grader's grading principles (the mistakeType
  // taxonomy + step-marking + honest-read), restated below so the live
  // `handleCheckSolution` path stays byte-identical — this is a NEW additive path,
  // never a modification of the shared grader's entry point (its signature,
  // behavior and output are unchanged). The mistakeType definitions mirror
  // `handleCheckSolution` rule 3 and must be kept in sync if that rule changes.
  const STRUCTURED_MISTAKE_TAXONOMY =
    'For each mistake choose the type by the CAUSE the error reveals about understanding, not by where it appears:\n' +
    '- "conceptual": the METHOD or understanding is wrong — wrong formula/law/theorem, confused concepts, misread the question, (Science) wrong principle/organ/law.\n' +
    '- "calculation": the METHOD is right but the arithmetic/algebra is wrong.\n' +
    '- "silly": the student CLEARLY understands but made a mechanical slip — a sign misread off their OWN correct working, a dropped negative, a copying error.\n' +
    '- "presentation": mathematically/chemically RIGHT but board-format short — missing formula, missing units, no conclusion/"verified" line, working not shown, (Science) a correct reaction left UNBALANCED, missing state symbols.\n' +
    'A CORRECT step has mistakeType null. A step left ENTIRELY BLANK gets status "missing" and mistakeType null (marks simply not earned, never a typed mistake). An alternative valid method that reaches the answer is NOT a mistake — award full marks.';

  // Validate + normalise one model-returned per-question result against the KNOWN
  // scheme. Marks scale is ALWAYS the trusted scheme value (q.marks) — the model
  // only awards WITHIN it. Mirrors handleCheckSolution's per-step normalisation +
  // additive-floor mistakeSummary reconcile, so MI routing is identical to the
  // wired Check & Improve path.
  function normaliseStructuredResult(q, raw) {
    const VALID_MISTAKE_TYPES = new Set(['conceptual', 'calculation', 'silly', 'presentation']);
    const totalMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;

    // Honest failure: the model could not locate/read this answer in the upload.
    // NEVER fabricate a mark, NEVER fold it into a 0 (design decision (b)).
    const couldNotRead = !raw || raw.couldNotRead === true || raw.couldNotRead === 'true';
    if (couldNotRead) {
      return {
        qNumber: q.qNumber,
        couldNotRead: true,
        totalMarks,
        note: String((raw && raw.note) || '').trim() ||
          "We couldn't read your answer for this question clearly — re-upload this page.",
      };
    }

    const annotatedSteps = (Array.isArray(raw.annotatedSteps) ? raw.annotatedSteps : [])
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

    // ── Uniform OBJECTIVE (MCQ / AR / Section A) handling ─────────────────────
    // Deterministic 0/full clamp + shared mistake-type honesty guard, BOTH from the
    // single-source objectiveScoring module — so this worksheet grader and the
    // per-question handleCheckSolution grader apply BYTE-IDENTICAL logic (one impl,
    // two callers). The worksheet carries `section` ("A" for MCQ/AR) and now the bank
    // answer key (`q.answer` = the option text) + `q.options`, so the compare is
    // deterministic. Subjective questions are untouched.
    //   • bankObjective:    section/format known from the bank → deterministic compare.
    //   • flaggedObjective: a keyless Check & Improve detect step marked the question
    //     objective — clamp off the model's binary verdict, but ONLY for a ≤1-mark item
    //     (the safety rail: a multi-mark subjective is never clamped on a model guess).
    const bankObjective = isObjective(q);
    const flaggedObjective = q.objective === true && totalMarks <= 1;
    const questionIsObjective = bankObjective || flaggedObjective;

    // C) THE DETERMINISTIC CLAMP (defense-in-depth; independent of the prompt). For an
    //    objective question it collapses the model's per-step awards into ONE whole-
    //    question verdict (0 or totalMarks — NEVER a fraction, NEVER totalMarks/steps),
    //    strips per-step marks, and aligns each step's status. With an answer key it
    //    OVERRIDES the model on a normalised compare; without one it takes the model's
    //    binary verdict. It runs unconditionally for objective questions — so no
    //    objective question can exit the grader fractional or step-distributed.
    let objectiveMarksAwarded = null;
    if (questionIsObjective) {
      objectiveMarksAwarded = clampObjectiveResult(q, annotatedSteps, totalMarks).marksAwarded;
    }

    // D) THE SHARED MISTAKE-TYPE HONESTY GUARD (MI integrity). Nulls a fabricated
    //    mistakeType ONLY where there is no working to classify: empty studentWork for
    //    ANY question, or — for an objective question — a bare option pick (letter or
    //    option text, nothing more). A wrong MCQ WITH real written working KEEPS its
    //    type so MI can learn (the feature). Marks are already fixed (objective by the
    //    clamp above, subjective by the step sum). Returns the per-category nulled
    //    tally so the reconcile below can subtract it from the model's raw summary.
    const noWorkingNulled = applyObjectiveMistakeGuard(annotatedSteps, {
      objective: questionIsObjective,
      options: q.options,
    });

    // Total marks. Objective → the whole-question verdict (0/full) from the clamp.
    // Subjective → the (capped) sum of per-step awards, UNCHANGED.
    const totalAwarded = annotatedSteps.reduce((sum, s) => sum + s.marksAwarded, 0);
    const capped = questionIsObjective ? objectiveMarksAwarded : Math.min(totalAwarded, totalMarks);

    // Additive-floor reconcile (mirror of handleCheckSolution): take the MAX of the
    // model's self-reported summary and the per-step mistakeType counts — but first
    // subtract noWorkingNulled from the raw summary, so a no-working step the model
    // wrongly tagged is removed from BOTH the floor and the raw summary (mirror of
    // handleCheckSolution's rawAdjusted; keep stepFloor in the max so legitimately
    // tagged worked steps are still protected).
    const rawSummary = raw.mistakeSummary || {};
    const stepFloor = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
    for (const s of annotatedSteps) {
      if (s.mistakeType && Object.prototype.hasOwnProperty.call(stepFloor, s.mistakeType)) {
        stepFloor[s.mistakeType] += 1;
      }
    }
    const rawAdjusted = (cat) => Number(rawSummary[cat] || 0) - noWorkingNulled[cat];
    const mistakeSummary = {
      conceptual: Math.max(0, rawAdjusted('conceptual'), stepFloor.conceptual),
      calculation: Math.max(0, rawAdjusted('calculation'), stepFloor.calculation),
      silly: Math.max(0, rawAdjusted('silly'), stepFloor.silly),
      presentation: Math.max(0, rawAdjusted('presentation'), stepFloor.presentation),
    };

    return {
      qNumber: q.qNumber,
      couldNotRead: false,
      ok: true,
      totalMarks,
      marksAwarded: capped,
      percentage: Math.round((capped / totalMarks) * 100),
      annotatedSteps,
      mistakeSummary,
      teacherNote: String(raw.teacherNote || '').trim(),
      // Objective echo (additive; PAIRED with handleCheckSolution above — keep both in
      // sync). Same meaning: the clamp zeroed the per-step marks by design, so the view
      // suppresses the misleading per-step chip. `bankObjective || flaggedObjective`,
      // false for every subjective question by construction.
      objective: questionIsObjective,
    };
  }

  // Surface-agnostic stub: a deterministic structured grade so dev/Codespaces and
  // a stub-mode preview can exercise the full upload→grade→display→MI loop without
  // a key. Representative — partial marks + a per-step mistakeType so MI routing is
  // visible; the LAST question is marked unreadable so the honest-pending path and
  // the "graded X/Y + N pending" totals are exercised too.
  function buildStructuredStub(questions) {
    const results = questions.map((q, idx) => {
      const isLast = idx === questions.length - 1 && questions.length > 1;
      if (isLast) {
        return {
          qNumber: q.qNumber,
          couldNotRead: true,
          totalMarks: Number(q.marks) > 0 ? Number(q.marks) : 1,
          note: "We couldn't read your answer for this question clearly — re-upload this page.",
        };
      }
      const totalMarks = Number(q.marks) > 0 ? Number(q.marks) : 1;
      // Alternate the mistake type so both MI routes are demonstrated:
      // conceptual (knowledge gap → weak-area) vs presentation (careless insight).
      const isConceptual = idx % 2 === 0;
      const mistakeType = isConceptual ? 'conceptual' : 'presentation';
      const awarded = Math.round(totalMarks * 0.6 * 2) / 2;
      return {
        qNumber: q.qNumber,
        marksAwarded: awarded,
        annotatedSteps: [
          {
            description: 'Approach and setup',
            studentWork: 'Attempted',
            status: 'partial',
            marksAwarded: awarded,
            marksDeducted: Math.max(0, Math.round((totalMarks - awarded) * 2) / 2),
            teacherAnnotation: isConceptual
              ? '× Method needs review for this question.'
              : '½ Right idea — tighten the presentation (units / final line).',
            mistakeType,
            correctedWorking: isConceptual ? 'Re-derive using the correct method.' : 'Add units and box the final answer.',
          },
        ],
        mistakeSummary: {
          conceptual: isConceptual ? 1 : 0,
          calculation: 0,
          silly: 0,
          presentation: isConceptual ? 0 : 1,
        },
        teacherNote: 'Stub grade (no AI key configured) — representative result so the grade loop and Mistake Intelligence wiring can be exercised end to end.',
      };
    });
    return { results, summary: 'Stub summary — configure a Gemini key for real grading.' };
  }

  // The reusable structured-grade core. `questions` is the KNOWN set (each with
  // qNumber, marks, questionText, optional topic + solutionSteps + finalAnswer).
  // Returns { ok, results } where results is one normalised entry per known
  // question (graded OR couldNotRead). Throws nothing — returns { ok:false } on a
  // whole-PDF failure so the caller renders a clean error, not a partial grade.
  async function gradeStructuredSet({ questions, imageBase64, imageMimeType, subject, uploads }) {
    const isPdf = imageMimeType === 'application/pdf';

    // ── BATCH-1 · per-question answer images (ADDITIVE) ──────────────────────
    // A surface where the student photographs EACH answer separately (Quick
    // Practice) has no one labelled document to search. Rather than stitching the
    // photos into a synthetic PDF and asking the model to find "Q6" inside it,
    // each image is sent as its OWN part IMMEDIATELY AFTER its own question's
    // block — the position IS the pairing, so there is nothing to mis-locate.
    //
    // ★ THE LOAD-BEARING PROPERTY: `uploads` is absent from every existing
    // caller's payload — worksheets, chapter tests, full mocks AND multi-question
    // Check & Improve all post one `imageBase64` — so `hasUploads` is false for
    // all four and the `contents` built below is BYTE-IDENTICAL to before. Every
    // prompt change in this function is conditioned on `hasUploads`; that
    // condition is not cosmetic, it is the regression guard. See §7 of
    // checkSolution.test.cjs.
    //
    // ★ INCLUSION IS BY EVIDENCE, NEVER BY TYPE: a question gets its image if an
    // upload was sent for it. Nothing here inspects `section`/`format`/`objective`
    // — the objective exception stays exactly where it already lives (the
    // scheme-cache filter above and the deterministic 0/full clamp), so an
    // objective question the student DID show working for is photographed and
    // graded like any other.
    const uploadByNumber = new Map();
    for (const u of Array.isArray(uploads) ? uploads : []) {
      const n = Number(u && u.qNumber);
      if (n > 0 && u.imageBase64 && !uploadByNumber.has(n)) uploadByNumber.set(n, u);
    }
    const hasUploads = uploadByNumber.size > 0;

    if (isStubMode()) {
      const stub = buildStructuredStub(questions);
      return {
        ok: true,
        results: questions.map((q) => {
          const raw = stub.results.find((r) => Number(r.qNumber) === Number(q.qNumber));
          return normaliseStructuredResult(q, raw);
        }),
        summary: stub.summary,
      };
    }

    // ── C&I PR-3 · scheme-first cache hook (read-before-grade) ────────────────
    // Same rule as handleCheckSolution: each keyless SUBJECTIVE question (no bank
    // solutionSteps) gets a STUDENT-AGNOSTIC model solution through the shared
    // question-hash cache (generate-from-question-only on miss, Gate-2a checked,
    // write-if-pass) injected into its EXISTING per-question scheme slot below.
    // Bank-sourced questions (solutionSteps present) and objective ones (the
    // deterministic 0/full clamp governs marks) are byte-identical, as is every
    // caller without the injected solutionCache dep. Lookups run concurrently;
    // any per-question failure degrades that one question to its empty scheme
    // slot — the grade call never blocks on the cache.
    if (solutionCache) {
      await Promise.all(
        questions
          .filter(
            (q) =>
              (!Array.isArray(q.solutionSteps) || q.solutionSteps.length === 0) &&
              !isObjective(q) &&
              q.objective !== true,
          )
          .map(async (q) => {
            try {
              const cached = await solutionCache.getOrCreateModelSolution({
                question: q.questionText,
                marks: q.marks,
                subject: subject || 'Maths',
                topic: q.topicLabel || q.topic || '',
                qType: q.qType || '',
                section: q.section || '',
                isObjective: false,
              });
              if (cached && Array.isArray(cached.schemeSteps) && cached.schemeSteps.length > 0) {
                q.solutionSteps = cached.schemeSteps;
              }
            } catch (e) {
              console.warn('[grade-worksheet] solution-cache hook failed for Q' + q.qNumber + ' (grading continues):', e.message);
            }
          }),
      );
    }

    const systemPrompt = hasUploads
      ? "You are a CBSE Class 10 board examiner grading a student's whole worksheet. " +
        'Each question below is followed IMMEDIATELY by the image of the student\'s handwritten answer to THAT question. ' +
        'The image directly after a question\'s block IS that question\'s answer — do not search for question numbers inside the images, and never match an image to a different question. ' +
        'Grade EACH question against ITS OWN marking scheme, exactly as a real teacher marking with a red pen. ' +
        'Respond ONLY with valid JSON, no markdown fences.'
      : "You are a CBSE Class 10 board examiner grading a student's whole worksheet. " +
        'The attached PDF contains the student\'s handwritten answers to ALL the questions below, ' +
        'with each answer labelled by its question number (Q1, Q2 …). ' +
        'Grade EACH question against ITS OWN marking scheme, exactly as a real teacher marking with a red pen. ' +
        'Respond ONLY with valid JSON, no markdown fences.';

    const blockFor = (q) => {
        const scheme = Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0
          ? '\n     Marking scheme:\n' +
            q.solutionSteps.map((s, i) => '       Step ' + (i + 1) + ': ' + String(s)).join('\n') +
            (q.finalAnswer ? '\n       Final answer: ' + String(q.finalAnswer) : '')
          : '';
        return (
          '  Q' + q.qNumber + '. [' + (Number(q.marks) || 1) + ' mark(s)' +
          (q.topicLabel || q.topic ? ' · ' + String(q.topicLabel || q.topic) : '') + ']\n' +
          '     ' + String(q.questionText || '').replace(/\n/g, ' ') +
          scheme
        );
    };

    const questionBlocks = questions.map(blockFor).join('\n\n');

    // Rule 1 — the LOCATE instruction is wrong for per-question images: there is
    // nothing to locate, and telling the model to look would invite it to match an
    // image to a different question. Adopted verbatim from the BATCH-1 findings.
    const rule1 = hasUploads
      ? '1. Grade each question against ITS OWN scheme using the image that immediately follows that question\'s block. A question with no image following it has no photographed answer — grade the typed answer given in its block if one is shown. Award marks by the [bracket] weights in each scheme step, or distribute evenly if none.\n'
      : '1. For EACH question Q1…QN, locate that numbered answer in the PDF and grade it against ITS scheme. Award marks by the [bracket] weights in each scheme step, or distribute evenly if none.\n';

    // Rule 6 — same reason, one clause only: "locate or read … in the upload"
    // becomes "READ the image supplied for a question". The whole anti-fabrication
    // tail (the Don't-know exception, the crossed-out exception) is byte-identical
    // on both branches; splitting the head from the tail is what keeps it so.
    const rule6Head = hasUploads
      ? '6. HONEST READ — anti-fabrication: if you CANNOT confidently READ the image supplied for a question, set "couldNotRead": true for THAT question and OMIT a grade.'
      : '6. HONEST READ — anti-fabrication: if you CANNOT confidently locate or read a question\'s answer in the upload, set "couldNotRead": true for that question and OMIT a grade.';

    const rules =
      'GRADING RULES:\n' +
      rule1 +
      '2. marksAwarded (per question) = sum of that question\'s annotatedSteps[].marksAwarded. Never exceed the question\'s stated marks.\n' +
      '3. ' + STRUCTURED_MISTAKE_TAXONOMY + '\n' +
      '4. ERROR CARRIED FORWARD: if one upstream slip makes later steps wrong, mark those later steps status "incorrect" with mistakeType null — never re-charge one slip as several mistakes. ERROR-CARRIED-FORWARD (ECF) MARKING. When a step is wrong ONLY because it correctly applied the right method to a value carried from an earlier mistake: award that step its method/process marks and do NOT treat it as a fresh mistake (mistakeType null). Withhold ONLY the mark(s) attributable to reaching the correct FINAL answer — so a wrong final answer NEVER earns full marks, but correct method NEVER earns zero. On a single-mark question there are no separate method marks, so a wrong answer scores 0. Award marks in HALF-MARK units (½ is the smallest unit; no finer). Awarded marks must sum to a ½-multiple not exceeding the question\'s total, allocated to the ACTUAL steps — never invented to hit a number.\n' +
      '5. NO WORKING SHOWN → mistakeType null. If the student shows NO working — only a final answer (e.g. just a chosen MCQ option such as "(d)") — and it is wrong, you CANNOT diagnose the cause: set mistakeType null for that step. Never guess "conceptual" (or any type) from a bare wrong answer. A wrong answer with no working is undiagnosable, not conceptual — the marks are still not earned (status stays "incorrect"), only the type is null.\n' +
      rule6Head + ' NEVER guess a mark, and NEVER record an unreadable/absent answer as 0. Only grade answers you can actually read. IMPORTANT EXCEPTION: a student writing \'Don\'t know\', \'Dont know\', \'I don\'t know\', \'DK\', or any similar explicit non-attempt phrase IS legible — it is NOT couldNotRead. Grade it as: status "incorrect", marks deducted = question marks, mistakeType null (undiagnosable — no working shown). Never set couldNotRead for a clearly-written non-attempt phrase. Similarly, an answer that is clearly and completely crossed out with no replacement written is a NO-ATTEMPT — grade it as: status "incorrect", marks deducted = question marks, mistakeType null. Never set couldNotRead for a clearly crossed-out answer with no replacement.\n' +
      '7. teacherNote per question: 1–2 short plain-English sentences. "summary": 2–3 encouraging, exam-useful sentences about the whole worksheet (answer-writing tips where relevant).\n' +
      '8. WORD-PROBLEM FINAL ANSWER: when a question asks to "find a number/value/quantity", correctly solving the equation earns the equation-solving marks. Explicitly stating which root satisfies the problem context (e.g. "N = 8 since N must be a natural number; N = -20 rejected") is a required final step. If the student solves correctly but omits this explicit contextual statement, deduct ½ mark as a presentation step — never deduct more than ½ for this alone if the equation and roots are both correct. PARTIAL CREDIT: award marks strictly by the step weights in the marking scheme. A step the student attempted correctly earns its allocated marks even if a later step is wrong. A step with a calculation error earns 0 for that step only — never redistribute or re-weight marks across steps. If no explicit per-step weight exists, distribute the question\'s total marks evenly across required steps. OBJECTIVE EXCEPTION (MCQ / Assertion-Reason / Section A): NEVER step-mark an objective question and NEVER split its marks across steps — it scores the WHOLE mark on the correct option or 0 on a wrong one, never a fraction. Any working the student wrote for an MCQ is read ONLY to classify the mistake type, never to award partial marks.\n' +
      '9. QUESTION MISCOPY: if the student\'s working is internally consistent and mathematically correct but solves a DIFFERENT equation/expression/problem than the one stated in the question (i.e. they appear to have miscopied or misread the question from the paper), award 0 marks for the entire question and classify mistakeType as \'silly\'. A correctly solved wrong problem earns no credit. Tell-tale sign: the student\'s equation/values do not match the question\'s stated coefficients/values, yet their algebraic steps are internally correct for what they wrote.';

    const jsonSchema =
      'RESPOND with this exact JSON shape:\n' +
      '{\n' +
      '  "results": [\n' +
      '    {\n' +
      '      "qNumber": 1,\n' +
      '      "couldNotRead": false,\n' +
      '      "marksAwarded": <number>,\n' +
      '      "annotatedSteps": [\n' +
      '        { "stepNumber": 1, "description": "...", "studentWork": "what the student wrote", "status": "correct" | "partial" | "incorrect" | "missing", "marksAwarded": <number>, "marksDeducted": <number>, "teacherAnnotation": "...", "mistakeType": null | "conceptual" | "calculation" | "silly" | "presentation", "correctedWorking": null | "..." }\n' +
      '      ],\n' +
      '      "mistakeSummary": { "conceptual": 0, "calculation": 0, "silly": 0, "presentation": 0 },\n' +
      '      "teacherNote": "1-2 sentence per-question summary"\n' +
      '    }\n' +
      '    // ...one object per question. For an unreadable answer: { "qNumber": N, "couldNotRead": true }\n' +
      '  ],\n' +
      '  "summary": "2-3 sentence encouraging whole-worksheet summary"\n' +
      '}';

    const userPrompt =
      'Grade this student\'s worksheet. There are ' + questions.length + ' questions.\n\n' +
      'QUESTIONS AND MARKING SCHEMES:\n' + questionBlocks + '\n\n' +
      'The attached ' + (isPdf ? 'PDF' : 'image') + ' is the student\'s handwritten answers, labelled by question number. ' +
      'Read ALL pages carefully and grade every question you can read.\n\n' +
      jsonSchema + '\n\n' + rules;

    // ★ THE INTERLEAVE (BATCH-1). Nothing is stitched: each answer photo is its OWN
    // part placed IMMEDIATELY after the text block that names its question, so the
    // model is never asked to FIND "Q6" inside a document. A question with no
    // upload simply has no image after it — that is the honest signal that nothing
    // was photographed for it, and rule 1 tells the model exactly that.
    const buildUploadParts = () => {
      const p = [
        {
          text: systemPrompt + '\n\n' +
            'Grade this student\'s worksheet. There are ' + questions.length + ' questions.\n\n' +
            'QUESTIONS AND MARKING SCHEMES:',
        },
      ];
      for (const q of questions) {
        p.push({ text: '\n' + blockFor(q) });
        const up = uploadByNumber.get(Number(q.qNumber));
        if (up) {
          p.push(buildGeminiImagePart({
            mimeType: String(up.imageMimeType || 'image/jpeg'),
            base64: String(up.imageBase64),
          }));
        }
      }
      p.push({
        text: '\n\nEvery question above that has a photographed answer is followed by exactly one image of that answer, in the order listed.\n\n' +
          jsonSchema + '\n\n' + rules,
      });
      return p;
    };

    const parts = hasUploads
      ? buildUploadParts()
      : [
        { text: systemPrompt + '\n\n' + userPrompt },
        buildGeminiImagePart({ mimeType: imageMimeType, base64: imageBase64 }),
      ];
    const contents = [{ role: 'user', parts }];

    // A whole worksheet of structured grades is far larger than one question — give
    // it room and, like the per-question grader, retry ONCE on a parse miss
    // (most often a maxOutputTokens truncation). Large worksheets may still
    // truncate → [FU-ASYNC-GRADING] (sync now, async deferred — design decision (c)).
    // Constrained decoding (PR-C2) — WORKSHEET_RESPONSE_SCHEMA, a SEPARATE schema
    // from the per-question grader's. Its parse gate is `results` (not
    // `annotatedSteps`) and, critically, `annotatedSteps` is OPTIONAL here so a
    // couldNotRead entry is never forced to fabricate steps.
    const genConfig = {
      temperature: 0.05,
      maxOutputTokens: 32000,
      responseMimeType: 'application/json',
      responseSchema: WORKSHEET_RESPONSE_SCHEMA,
    };
    const gradeOnce = async () => {
      const r = await callGemini(GEMINI_MODEL, contents, genConfig);
      return { reply: r, parsed: extractJsonObjectFromText(r.text) };
    };
    const isGoodParse = (p) => !!(p && Array.isArray(p.results));
    const finishReasonOf = (r) =>
      (r && r.raw && r.raw.candidates && r.raw.candidates[0] && r.raw.candidates[0].finishReason) || null;

    let { reply, parsed } = await gradeOnce();
    if (!isGoodParse(parsed)) {
      console.warn(
        '[grade-worksheet] parse miss (attempt 1) — retrying once.',
        'finishReason:', finishReasonOf(reply),
        'len:', reply.text ? reply.text.length : 0,
        'tail:', reply.text ? reply.text.slice(-200) : '(empty)',
      );
      ({ reply, parsed } = await gradeOnce());
    }

    if (!isGoodParse(parsed)) {
      console.warn(
        '[grade-worksheet] unparseable reply after retry —',
        'finishReason:', finishReasonOf(reply),
        'len:', reply.text ? reply.text.length : 0,
        'tail:', reply.text ? reply.text.slice(-200) : '(empty)',
      );
      return { ok: false };
    }

    // Map the model's results back onto the KNOWN set by qNumber — the student's
    // upload is matched Q1…QN to the persisted scheme, never blind-segmented. A
    // question the model omitted entirely is treated as couldNotRead (honest
    // pending), never silently zeroed.
    const byNumber = new Map();
    for (const r of parsed.results) {
      if (r && r.qNumber != null) byNumber.set(Number(r.qNumber), r);
    }
    const results = questions.map((q) =>
      normaliseStructuredResult(q, byNumber.get(Number(q.qNumber)) || null),
    );
    return { ok: true, results, summary: String(parsed.summary || '').trim() };
  }

  // HTTP handler. Thin wrapper: validates the request + the ONE uploaded PDF, then
  // delegates to the surface-agnostic gradeStructuredSet core. The worksheet's
  // known question set is fetched at the CLIENT (getWorksheetSession) and posted
  // here — the core never reaches into any session store, so Chapter Test / Full
  // Mock can reuse it by posting their own question set.
  async function handleGradeWorksheet(req, res) {
    let payload;
    try {
      // A 5 MB PDF base64-inflates to ~6.7 MB, plus the question-set JSON — raise
      // the body cap above the default 5 MB so a full-size scan is accepted.
      payload = await readJson(req, 8 * 1024 * 1024);
    } catch (e) {
      return sendJson(res, 400, { ok: false, error: 'Upload too large or invalid. Keep the PDF under 5 MB.' });
    }

    const worksheetId = String(payload.worksheetId || '').trim();
    const imageBase64 = String(payload.imageBase64 || '').trim();
    const imageMimeType = String(payload.imageMimeType || 'application/pdf').trim();
    // C&I PR-3: the Check & Improve client already posts a top-level `subject`
    // (previously ignored here) — read it ONLY to steer the scheme-first cache
    // hook's generation prompt. It plays no part in grading itself.
    const subject = String(payload.subject || '').trim();

    const questions = (Array.isArray(payload.questions) ? payload.questions : [])
      .map((q) => ({
        qNumber: Number(q && q.qNumber) || 0,
        marks: Number(q && q.marks) > 0 ? Number(q.marks) : 1,
        topic: String((q && q.topic) || '').trim(),
        topicLabel: String((q && q.topicLabel) || '').trim(),
        questionText: String((q && q.questionText) || '').trim(),
        // Objective signal for the honesty guard + deterministic clamp. The client
        // carries `section` ("A" for MCQ/AR); `format`/`qType` are kept too so a
        // future poster (Chapter Test / Full Mock) that sends them is classified the
        // same way. `answer` is the canonical bank answer key (the OPTION TEXT) and
        // `options` bridges a letter pick to that text — together they make the MCQ
        // compare deterministic. `correctOption` (a letter) is still accepted as a
        // fallback key for any future bank that carries one.
        section: String((q && q.section) || '').trim(),
        format: String((q && q.format) || '').trim(),
        qType: String((q && q.qType) || '').trim(),
        answer: q && q.answer != null ? String(q.answer).trim() : null,
        options: Array.isArray(q && q.options) ? q.options.map(String) : null,
        // Objective flag from a keyless detect step (Check & Improve multi-question):
        // when the detected question is objective the clamp still applies off the
        // model's binary verdict — but only for a ≤1-mark item (the safety rail so a
        // multi-mark subjective is never clamped on a model guess).
        objective: q && (q.objective === true || q.objective === 'true') ? true : false,
        solutionSteps: Array.isArray(q && q.solutionSteps) ? q.solutionSteps.map(String) : null,
        finalAnswer: q && q.finalAnswer ? String(q.finalAnswer).trim() : null,
        correctOption: q && q.correctOption ? String(q.correctOption).trim() : null,
      }))
      .filter((q) => q.qNumber > 0 && q.questionText);

    if (questions.length === 0) {
      return sendJson(res, 400, { ok: false, error: 'No worksheet questions supplied to grade against.' });
    }

    // BATCH-1 (additive): per-question answer images. Absent from every existing
    // caller's payload, so `uploads` is [] for all four live surfaces and each
    // branch below falls through to exactly the pre-existing behaviour.
    //
    // ★ INCLUSION IS BY EVIDENCE, NEVER BY TYPE. Which questions appear here is the
    // CLIENT's decision and it must be "is there written working saved for this
    // question?" — never the question's type. Nothing in this handler filters on
    // section/format/objective, and it must stay that way: an objective question
    // the student showed working for belongs in the batch, and one with no working
    // saved does not, whatever its type.
    const knownNumbers = new Set(questions.map((q) => q.qNumber));
    const seenUpload = new Set();
    const uploads = (Array.isArray(payload.uploads) ? payload.uploads : [])
      .map((u) => ({
        qNumber: Number(u && u.qNumber) || 0,
        imageBase64: String((u && u.imageBase64) || '').trim(),
        imageMimeType: String((u && u.imageMimeType) || 'image/jpeg').trim(),
      }))
      .filter((u) => {
        if (!(u.qNumber > 0) || !u.imageBase64) return false;
        if (!knownNumbers.has(u.qNumber)) return false;
        if (seenUpload.has(u.qNumber)) return false;
        seenUpload.add(u.qNumber);
        return true;
      });

    if (uploads.length > MAX_BATCH_UPLOADS) {
      return sendJson(res, 400, {
        ok: false,
        error: 'Too many answer photos in one grade — send at most ' + MAX_BATCH_UPLOADS + '.',
      });
    }
    if (!imageBase64 && uploads.length === 0) {
      return sendJson(res, 400, { ok: false, error: 'Upload one PDF of your answers to grade.' });
    }
    if (imageBase64) {
      const imgCheck = validateMentorImagePayload(payload);
      if (!imgCheck || !imgCheck.ok) {
        return sendJson(res, 400, { ok: false, error: imgCheck ? imgCheck.error : 'Invalid upload' });
      }
    }
    for (const u of uploads) {
      const upCheck = validateMentorImagePayload({
        imageBase64: u.imageBase64,
        imageMimeType: u.imageMimeType,
      });
      if (!upCheck || !upCheck.ok) {
        return sendJson(res, 400, { ok: false, error: upCheck ? upCheck.error : 'Invalid upload' });
      }
    }

    try {
      const graded = await gradeStructuredSet({ questions, imageBase64, imageMimeType, subject, uploads });
      if (!graded.ok) {
        return sendJson(res, 200, {
          ok: false,
          error: "We couldn't grade this worksheet — please try a clearer scan, or try again.",
        });
      }

      const results = graded.results;
      const gradedResults = results.filter((r) => !r.couldNotRead);
      const pendingResults = results.filter((r) => r.couldNotRead);
      const gradedMarksAwarded = gradedResults.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0);
      const gradedMarksTotal = gradedResults.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0);
      const worksheetTotalMarks = results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0);

      return sendJson(res, 200, {
        ok: true,
        worksheetId,
        results,
        totalQuestions: results.length,
        gradedCount: gradedResults.length,
        pendingCount: pendingResults.length,
        // Honest totals (design decision (b)): the graded subtotal is SEPARATE
        // from the full worksheet total so unreadable pages never deflate a final
        // mark presented as complete.
        gradedMarksAwarded: Math.round(gradedMarksAwarded * 2) / 2,
        gradedMarksTotal: Math.round(gradedMarksTotal * 2) / 2,
        worksheetTotalMarks: Math.round(worksheetTotalMarks * 2) / 2,
        summary: graded.summary || '',
        provider: ACTIVE_PROVIDER,
        model: GEMINI_MODEL,
      });
    } catch (err) {
      console.error('[grade-worksheet]', err);
      return sendJson(res, 500, { ok: false, error: 'Failed to grade the worksheet. Please try again.' });
    }
  }

  return { handleCheckSolution, handleDetectQuestion, handleGradeWorksheet };
}

module.exports = {
  createCheckSolutionRoute,
  // Exported so the schemas can be asserted AGAINST THE PARSER they were derived
  // from (checkSolution.test.cjs §6). A schema that is only reachable through a
  // genConfig can be checked for presence but not for looseness.
  GRADE_RESPONSE_SCHEMA,
  DETECT_RESPONSE_SCHEMA,
  WORKSHEET_RESPONSE_SCHEMA,
};
