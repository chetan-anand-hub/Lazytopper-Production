// routes/checkSolution.cjs — the three Check & Improve / worksheet AI routes.
//
// ★ GRADER-CORE-1 PR-2: ONE GRADING CORE. Both grading endpoints are thin adapters over
// `server/grading/` (one taxonomy, one schema, one prompt builder, one post-processing
// path). A single question is graded as a SET OF ONE:
//   /api/check-solution  → handleCheckSolution → core.gradeSet([one question]) → its
//                          EXISTING response shape (mapped below);
//   /api/grade-worksheet → handleGradeWorksheet → gradeStructuredSet → core.gradeSet(set).
// Both stay behind the server's request pipeline (idempotency → free check → limiter →
// entitlement → fair use, server/index.cjs); the core is called FROM the handlers.
// /api/detect-question (handleDetectQuestion) is NOT part of the core (PR-3 owns detect).
//
// ★ DO NOT BREAK ANYTHING. Every new client-renderable field and behaviour is opt-in by the
// request flag `acceptsV2: true` (couldNotRead on the single grader, step statuses
// "unattempted"/"withdrawn", `part`, `marksAvailable`, `departureKind`, `marksLostByType`,
// `rubric`, `objectiveResolved`, `answerMismatch`). Without it the response SHAPE is the one
// every client reads today (pinned per call site by server/eval/golden/shapes.test.cjs, G2).
// Stored mistake-type names are unchanged.

const {
  isObjective,
} = require('./objectiveScoring.cjs');
const grading = require('../grading/index.cjs');
const { createGradingCore } = require('../grading/core.cjs');

// Shared with the parser's own validation (the four statuses every pre-V2 client reads).
const STEP_STATUS_VALUES = grading.LEGACY_STEP_STATUSES.slice();
// BATCH-1 · the most per-question answer photos one batch grade will accept. An
// ALLOWLIST-shaped cap (fails safe): the request is refused with a clear message
// rather than silently truncated, so a student never gets a partial grade
// presented as complete. The real byte ceiling is still readJson's body cap.
const MAX_BATCH_UPLOADS = 12;
const MARKS_SOURCE_VALUES = ['stated', 'inferred'];

const deepFreeze = grading.deepFreeze;

/* ═══════════════════════════════════════════════════════════════════════════════
   RESPONSE SCHEMAS — constrained decoding (PR-C2)
   ★ ONE GRADING SCHEMA (server/grading/schema.cjs) serves BOTH grading endpoints: the
   single-question grader asks for a set of one. `WORKSHEET_RESPONSE_SCHEMA` is that same
   object under its historic name. Detection keeps its own schema (its own parser).
   ══════════════════════════════════════════════════════════════════════════════ */
const GRADING_RESPONSE_SCHEMA = grading.GRADING_RESPONSE_SCHEMA;
const WORKSHEET_RESPONSE_SCHEMA = GRADING_RESPONSE_SCHEMA;

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
    // ADDITIVE + NULLABLE (OBJECTIVE-MARK-INVARIANT §2.4). Before this field the detect
    // shape declared NOTHING that could carry a correct answer, so a PASTED Check &
    // Improve question could never reach the grader with an answer key - structurally,
    // by construction - and every keyless objective grade fell to the model's verdict.
    // A question whose answer cannot be determined must produce NULL, never a guess.
    detectedAnswer: { type: 'STRING', nullable: true },
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
          answer: { type: 'STRING', nullable: true },
        },
        propertyOrdering: ['questionNumber', 'questionText', 'marks', 'marksSource', 'objective', 'answer'],
        required: ['questionText'],
      },
    },
  },
  propertyOrdering: [
    'detectedMarks', 'marksSource', 'detectedSubject', 'detectedTopic',
    'detectedObjective', 'detectedAnswer', 'questions',
  ],
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
  } = deps;

  // THE ONE CORE (server/grading/core.cjs). It reads the grading-only model setting
  // (GRADING_MODEL / GRADING_THINKING_BUDGET, passed by server/index.cjs from serverConfig)
  // and falls back to GEMINI_MODEL for every direct / legacy construction. The optional
  // `solutionCache` dep (C&I PR-3) reaches it through `deps` unchanged.
  const core = createGradingCore(deps);

  /** OR-LIVE can verify which model graded in production without reading logs. A response
   *  HEADER sits outside every body-shape snapshot (G2). Guarded: a test double may have no
   *  setHeader, and a header can never be set after the body. */
  function setGradingModelHeader(res, model) {
    if (!model || !res || typeof res.setHeader !== 'function' || res.headersSent) return;
    try { res.setHeader('X-Grading-Model', String(model)); } catch { /* never fail a grade over a header */ }
  }

  /* ── STUB-503 · THE ONE HONEST BODY EVERY GRADING PATH RETURNS WITH NO PROVIDER ──
     `isStubMode()` (stubHandlers.cjs) is `STUB_MODE || isNoProviderEnabled()`, and
     `STUB_MODE` (serverConfig.cjs) is `!HAS_REPLIT_PROXY && !HAS_DIRECT_KEY &&
     !HAS_ANTHROPIC_PROXY` — pure credential ABSENCE, with no dev-only guard. So an
     env var lost in a deploy silently turned both GRADING paths into fabricators:
     HTTP 200 carrying `percentage: 70`, a `studentWork` string the student never
     wrote, and a `presentation` mistake they never made — all of it flowing through
     `recordMistake` into Mistake Intelligence and from there into the tutor's view
     of the student. Honest or silent: a grading path with no grader returns an
     error, never a mark.

     ★ `error` carries the STUDENT-FACING SENTENCE, not a code, because four of the
     six client call sites render this field verbatim — `aiClient.ts`'s
     `handleJsonResponse` throws `details.error` as the Error message, and
     SolutionChecker / ChapterTestPage / FullMockPage / WorksheetGradePanel each
     surface `err.message`. A code in `error` would show a student
     "grading_unavailable". `code` is the machine-readable twin.
     ⚠ It deliberately does NOT claim the work was SAVED: nothing is persisted on
     this path, and inventing a reassurance would be the same class of defect this
     lane exists to remove. */
  const GRADING_UNAVAILABLE_MESSAGE = 'Grading is temporarily unavailable — your answer has not been marked. Your work is still here; please try again in a few minutes.';

  function gradingUnavailableBody() {
    return { ok: false, code: 'grading_unavailable', error: GRADING_UNAVAILABLE_MESSAGE };
  }

  /* ⚠⚠ UNREACHABLE — DEAD SINCE PR #695 (STUB-503). DO NOT WIRE THIS BACK UP.
     This function FABRICATES: a flat `percentage: 70`, a `studentWork: 'Written
     correctly'` the student never wrote, a `presentation: 1` mistake they never made,
     and a teacher note telling them they "should score very well in the board exam".
     It used to be returned with HTTP 200 whenever no provider credential resolved, and
     it flowed onward into Mistake Intelligence. It has ZERO call sites and
     `checkSolution.test.cjs §18.6` fails if it gains one.

     ★ RETAINED ON THE OWNER'S RULING, not by oversight: deleting inside a safety PR
     enlarges the diff on the change that most needs a small one — but an unreachable
     fabricator with NO MARKER is how a future lane wires it back up in good faith.
     This comment is that marker. Deletion is tracked as
     [FU-DELETE-UNREACHABLE-STUB-FABRICATORS]. */
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


  const zeroSummary = () => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, departure: 0 });

  /** The legacy (no acceptsV2) sentence for a single question the core did not mark. The
   *  single grader's legacy shape has no couldNotRead field, so an honest "not marked" is the
   *  existing `{ ok:false, error }` shape every client already handles (no grade, no record) —
   *  never a fabricated 0/3 (audit GA-04). */
  function notMarkedMessage(r, typed) {
    if (r._reason === 'objectiveUnresolved') return grading.UNREAD_OPTION_NOTE;
    if (r._reason === 'injectionCited') return grading.INJECTION_WITHHELD_NOTE;
    if (typed) return r.note || grading.TYPED_PENDING_NOTE;
    return grading.SINGLE_COULD_NOT_READ_MESSAGE;
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

    // Objective signals (ALL optional, ADDITIVE): bank-sourced callers forward
    // section/format/answer/options; a keyless detect step sets `objective` (clamped only for
    // a ≤1-mark item — the safety rail so a multi-mark subjective is never clamped on a guess).
    const objectiveMeta = {
      section: String(payload.section || '').trim(),
      format: String(payload.format || '').trim(),
      qType: String(payload.qType || '').trim(),
      answer: payload.answer != null ? String(payload.answer).trim() : null,
      options: Array.isArray(payload.options) ? payload.options.map(String) : null,
      correctOption: payload.correctOption ? String(payload.correctOption).trim() : null,
    };
    const detectedObjective = payload.objective === true || payload.objective === 'true';

    // Claim-2 auto-detect (no live client sends it since #246; kept, see the P17 table): the
    // grader determines marks/subject/topic itself; `marks`/`subject`/`topic` are hints.
    const autoDetect = Boolean(payload.detectMarks);
    const topicVocabulary = Array.isArray(payload.topicVocabulary)
      ? payload.topicVocabulary
          .map((t) => ({
            slug: String((t && t.slug) || '').trim(),
            name: String((t && t.name) || '').trim(),
            subject: String((t && t.subject) || '').trim(),
          }))
          .filter((t) => t.slug && t.name)
      : [];
    // C7 · every new client-renderable field is opt-in by this flag.
    const acceptsV2 = payload.acceptsV2 === true;

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

    // STUB-503 · GRADING PATH — an honest 503, never an invented grade.
    if (isStubMode()) {
      return sendJson(res, 503, gradingUnavailableBody());
    }

    try {
      // A SET OF ONE. The photo (or PDF) is that one question's answer part; a typed
      // answer makes it a typed-only set. Exactly the fields the set grader would carry.
      const one = {
        qNumber: 1,
        marks,
        questionText: question,
        subject,
        topic,
        topicLabel: topic,
        ...objectiveMeta,
        objective: detectedObjective,
        solutionSteps,
        finalAnswer,
        textAnswer: hasImage ? '' : textAnswer,
        pickedOption: '',
      };
      const graded = await core.gradeSet({
        questions: [one],
        uploads: hasImage ? [{ qNumber: 1, imageBase64, imageMimeType }] : [],
        document: null,
        subject,
        acceptsV2,
        single: true,
        autoDetect: autoDetect ? { topicVocabulary, fallbackMarks: marks } : null,
        label: '[check-solution]',
      });
      setGradingModelHeader(res, graded.modelUsed);

      if (!graded.ok) {
        return sendJson(res, 200, {
          ok: false,
          error: "We couldn't read the grading this time — please try again.",
        });
      }

      const r = graded.results[0];
      const det = graded.detection || null;
      const detected = {
        detectedSubject: det ? det.detectedSubject : null,
        detectedTopic: det ? det.detectedTopic : null,
        marksSource: det ? det.marksSource : null,
      };

      // Not marked (could not read · an unread MCQ option · a grade withheld for citing an
      // injected instruction). An answer that does not address the question is handled below.
      if (r.couldNotRead === true) {
        if (!acceptsV2) return sendJson(res, 200, { ok: false, error: notMarkedMessage(r, !hasImage) });
        return sendJson(res, 200, {
          ok: true,
          totalMarks: r.totalMarks,
          marksAwarded: 0,
          percentage: 0,
          annotatedSteps: [],
          mistakeSummary: zeroSummary(),
          teacherNote: r.note,
          questionDepartureError: false,
          objective: isObjective(objectiveMeta) || (detectedObjective && r.totalMarks <= 1),
          ...detected,
          provider: ACTIVE_PROVIDER,
          model: graded.modelUsed,
          couldNotRead: true,
          answerMismatch: r.answerMismatch,
          departureKind: null,
          marksLostByType: r.marksLostByType,
          rubric: null,
          objectiveResolved: r.objectiveResolved,
        });
      }

      const body = {
        ok: true,
        totalMarks: r.totalMarks,
        marksAwarded: r.marksAwarded,
        percentage: r.percentage,
        annotatedSteps: r.annotatedSteps,
        mistakeSummary: r.mistakeSummary,
        // The departure's voice (only for its kind, only when true) and the validated rubric
        // are produced server-side in the core; `teacherNote` renders on every surface.
        teacherNote: r.teacherNote,
        questionDepartureError: r.questionDepartureError,
        // Objective echo: the clamp zeroed every per-step mark BY DESIGN (the whole mark
        // lives at answer level), so the view suppresses the misleading per-step chip.
        objective: r.objective,
        ...detected,
        provider: ACTIVE_PROVIDER,
        model: graded.modelUsed,
      };
      if (acceptsV2) {
        Object.assign(body, {
          couldNotRead: false,
          answerMismatch: r.answerMismatch,
          departureKind: r.departureKind,
          marksLostByType: r.marksLostByType,
          rubric: r.rubric,
          objectiveResolved: r.objectiveResolved,
        });
      }
      return sendJson(res, 200, body);
    } catch (err) {
      console.error('[check-solution]', err);
      return sendJson(res, 500, {
        ok: false,
        error: 'Failed to evaluate solution. Please try again.',
      });
    }
  }

  // ── Detection-only (detect-then-confirm, Claim 2 UX) — NOT part of the grading core;
  // GRADER-CORE-1 PR-3 owns detect. Unchanged by PR-2.
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
      '- answer: for an OBJECTIVE question ONLY, the CORRECT option - its letter ("a"/"b"/"c"/"d") or its exact printed option text. Set it ONLY when the correct option is printed in the document (an answer key, a marked answer) or is unambiguously determinable from the question itself. If you are not certain, set it to null. NEVER guess: a wrong key is worse than no key, because it is used to mark the student. Set null for every non-objective question.\n' +
      topicListBlock +
      // The multi-question instruction is placed LAST (after the topic list, right
      // before RESPOND) so the model reads it most recently — recency keeps it from
      // stopping after the first question on a multi-question paper.
      '- questions: if the document contains MULTIPLE questions (e.g. Q1, Q2, Q3 …), identify ALL of them and list each in the "questions" array with its printed question number, FULL question text exactly as printed, marks (apply the SAME stated-vs-inferred rule per question), and its objective flag. List EVERY question you find — do not stop after the first. If only ONE question is present, still include it as a single-item array. Set the top-level detectedMarks/marksSource/detectedSubject/detectedTopic/detectedObjective to the FIRST question\'s values for backward compatibility.\n' +
      '\nRESPOND with this exact JSON:\n' +
      '{ "detectedMarks": <first question marks>, "marksSource": "stated"|"inferred", "detectedSubject": "Maths"|"Science", "detectedTopic": "<canonical key or null>", "detectedObjective": <true|false>, "detectedAnswer": "<correct option or null>", "questions": [ { "questionNumber": 1, "questionText": "<full text of Q1 exactly as printed>", "marks": <number>, "marksSource": "stated"|"inferred", "objective": <true|false>, "answer": "<correct option or null>" }, { "questionNumber": 2, "questionText": "<full text of Q2 exactly as printed>", "marks": <number>, "marksSource": "stated"|"inferred", "objective": <true|false>, "answer": "<correct option or null>" }, ... one object per question found ] }';

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
        // ── TELEMETRY-1 · OBSERVATION ONLY ──────────────────────────────────
        // A telemetry hint; `buildBody`'s closed key set keeps it off the wire.
        // ★ NO `marks` HERE, DELIBERATELY: determining the marks is what this call
        // is FOR, so nothing upstream of it knows them. Its percentiles are
        // therefore reported unbanded, and the band is ABSENT rather than
        // defaulted — a detect call attributed to a made-up band would pollute the
        // one input SERVER-2 is meant to read.
        workloadClass: 'detect-question',
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

      // Detected answer key (additive, OBJECTIVE-MARK-INVARIANT §2.4). NULL unless the
      // model actually supplied a non-empty string - a model that omits it, or returns
      // the literal "null", yields null and the grade is byte-unchanged. We never
      // manufacture a key: a fabricated one would be used to MARK the student.
      const rawAnswer = parsed.detectedAnswer;
      const detectedAnswer =
        rawAnswer != null && String(rawAnswer).trim() && String(rawAnswer).trim().toLowerCase() !== 'null'
          ? String(rawAnswer).trim()
          : null;

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
            answer:
              q && q.answer != null && String(q.answer).trim() &&
              String(q.answer).trim().toLowerCase() !== 'null'
                ? String(q.answer).trim()
                : null,
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
        detectedAnswer,
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

  // Surface-agnostic stub: a deterministic structured grade so dev/Codespaces and
  // a stub-mode preview can exercise the full upload→grade→display→MI loop without
  // a key. Representative — partial marks + a per-step mistakeType so MI routing is
  // visible; the LAST question is marked unreadable so the honest-pending path and
  // the "graded X/Y + N pending" totals are exercised too.
  /* ⚠⚠ UNREACHABLE — DEAD SINCE PR #695 (STUB-503). DO NOT WIRE THIS BACK UP.
     The batch twin of `buildStubResponse`, and the more dangerous of the two because it
     reached FOUR shipped surfaces at once — Worksheet, Chapter Test, Full Mock and
     multi-question Check & Improve. It FABRICATES: a 60% mark, a
     `studentWork: 'Attempted'` the student never wrote, and a `mistakeType` ALTERNATED
     by question index so that both Mistake-Intelligence routes were seeded. It has ZERO
     call sites and `checkSolution.test.cjs §18.6` fails if it gains one.

     ★ RETAINED ON THE OWNER'S RULING, for the reason recorded on `buildStubResponse`
     above. Deletion is tracked as [FU-DELETE-UNREACHABLE-STUB-FABRICATORS]. */
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


  // The set grader. `questions` is the KNOWN set (each with qNumber, marks, questionText,
  // optional topic + solutionSteps + finalAnswer + objective signals + typed answer + pick).
  // Returns { ok, results, summary, modelUsed } where results is one normalised entry per
  // known question (graded OR couldNotRead) — or { ok:false } on a reply that could not be
  // used, or { gradingUnavailable:true } with no provider (the caller owns the HTTP status).
  async function gradeStructuredSet({ questions, imageBase64, imageMimeType, subject, uploads, acceptsV2 }) {
    // STUB-503 · GRADING PATH: signalled with a flag the caller turns into the 503, kept
    // DISTINCT from `{ ok: false }` (an unparseable model reply keeps its 200 copy).
    if (isStubMode()) {
      return { ok: false, gradingUnavailable: true };
    }
    return core.gradeSet({
      questions,
      document: String(imageBase64 || '').trim() ? { imageBase64, imageMimeType } : null,
      uploads,
      subject,
      acceptsV2: acceptsV2 === true,
      single: false,
      label: '[grade-worksheet]',
    });
  }

  // HTTP handler. Thin wrapper: validates the request + the ONE uploaded document / the
  // per-question photos / the typed answers, then delegates to the core. The question set
  // is fetched at the CLIENT and posted here — the core never reaches into a session store.
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
    // C&I posts a top-level `subject`: it steers the scheme-first cache's generation prompt
    // and the subject checklist.
    const subject = String(payload.subject || '').trim();
    const acceptsV2 = payload.acceptsV2 === true;

    // ⚠ THIS MAPPER IS A WHITELIST: a field emitted by the prompt builder but not copied
    // here is a silent no-op.
    const questions = (Array.isArray(payload.questions) ? payload.questions : [])
      .map((q) => ({
        qNumber: Number(q && q.qNumber) || 0,
        marks: Number(q && q.marks) > 0 ? Number(q.marks) : 1,
        topic: String((q && q.topic) || '').trim(),
        topicLabel: String((q && q.topicLabel) || '').trim(),
        questionText: String((q && q.questionText) || '').trim(),
        // Objective signal for the honesty guard + deterministic clamp: `section` ("A" for
        // MCQ/AR), `format`/`qType`, the bank answer key `answer` (the OPTION TEXT) bridged
        // by `options`, and `correctOption` (a letter) as a fallback key.
        section: String((q && q.section) || '').trim(),
        format: String((q && q.format) || '').trim(),
        qType: String((q && q.qType) || '').trim(),
        answer: q && q.answer != null ? String(q.answer).trim() : null,
        options: Array.isArray(q && q.options) ? q.options.map(String) : null,
        // A keyless detect step's objective flag (clamped only for a ≤1-mark item).
        objective: q && (q.objective === true || q.objective === 'true') ? true : false,
        solutionSteps: Array.isArray(q && q.solutionSteps) ? q.solutionSteps.map(String) : null,
        finalAnswer: q && q.finalAnswer ? String(q.finalAnswer).trim() : null,
        correctOption: q && q.correctOption ? String(q.correctOption).trim() : null,
        // TYPED-1: the student's TYPED working for this question ('' when photographed).
        textAnswer: String((q && q.textAnswer) || '').trim(),
        // OBJECTIVE-ANSWER-NOT-SENT: the option the student chose in the UI (Quick Practice).
        // ★ NOT `answer` and NOT `correctOption` — those carry the bank's CORRECT key.
        pickedOption: String((q && q.pickedOption) || '').trim(),
      }))
      .filter((q) => q.qNumber > 0 && q.questionText);

    if (questions.length === 0) {
      return sendJson(res, 400, { ok: false, error: 'No worksheet questions supplied to grade against.' });
    }

    // BATCH-1: per-question answer images. INCLUSION IS BY EVIDENCE, NEVER BY TYPE — which
    // questions carry a photo is the CLIENT's decision; nothing here filters on objectivity.
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
    // TYPED-2: a request with no PDF, no per-question photos AND no typed working is
    // nothing to grade, and is refused.
    const hasTypedWorking = questions.some((q) => q.textAnswer.length > 0);
    if (!imageBase64 && uploads.length === 0 && !hasTypedWorking) {
      return sendJson(res, 400, {
        ok: false,
        error: 'Nothing to grade yet — type your answer or add a photo of your working, then try again.',
      });
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
      const graded = await gradeStructuredSet({ questions, imageBase64, imageMimeType, subject, uploads, acceptsV2 });
      // STUB-503 — checked BEFORE `!graded.ok`: "we couldn't read this" and "we cannot grade
      // at all right now" are different truths.
      if (graded.gradingUnavailable) {
        return sendJson(res, 503, gradingUnavailableBody());
      }
      setGradingModelHeader(res, graded.modelUsed);
      if (!graded.ok) {
        return sendJson(res, 200, {
          ok: false,
          error: "We couldn't grade this worksheet — please try a clearer scan, or try again.",
        });
      }

      const results = graded.results;
      // Honest totals: the graded subtotal is SEPARATE from the full paper total so a
      // question that was not marked never deflates a final mark presented as complete.
      // Legacy: "not marked" = couldNotRead (as before). v2: also an answer that does not
      // address the question and an unread MCQ option — EXACTLY the couldNotRead treatment.
      const isGraded = (r) => (acceptsV2 ? r._graded === true : !r.couldNotRead);
      const gradedResults = results.filter(isGraded);
      const gradedMarksAwarded = gradedResults.reduce((s, r) => s + (Number(r.marksAwarded) || 0), 0);
      const gradedMarksTotal = gradedResults.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0);
      const worksheetTotalMarks = results.reduce((s, r) => s + (Number(r.totalMarks) || 0), 0);

      return sendJson(res, 200, {
        ok: true,
        worksheetId,
        results,
        totalQuestions: results.length,
        gradedCount: gradedResults.length,
        pendingCount: results.length - gradedResults.length,
        gradedMarksAwarded: Math.round(gradedMarksAwarded * 2) / 2,
        gradedMarksTotal: Math.round(gradedMarksTotal * 2) / 2,
        worksheetTotalMarks: Math.round(worksheetTotalMarks * 2) / 2,
        summary: graded.summary || '',
        provider: ACTIVE_PROVIDER,
        model: graded.modelUsed,
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
  // The one grading schema (and its historic worksheet name), plus detection's own.
  GRADING_RESPONSE_SCHEMA,
  WORKSHEET_RESPONSE_SCHEMA,
  DETECT_RESPONSE_SCHEMA,
  STEP_STATUS_VALUES,
  MAX_BATCH_UPLOADS,
  // The server-produced departure sentences (golden T05 imports the historic two names).
  DEPARTURE_TEACHER_LINE: grading.DEPARTURE_TEACHER_LINE,
  DEPARTURE_RETURN_TEACHER_LINE: grading.DEPARTURE_RETURN_TEACHER_LINE,
  DEPARTURE_LINES: grading.DEPARTURE_LINES,
  DEPARTURE_RETURN_LINES: grading.DEPARTURE_RETURN_LINES,
};
