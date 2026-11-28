'use strict';
// server/grading/core.cjs — THE ONE GRADING CORE (GRADER-CORE-1 PR-2, C1; PR-3, C8).
//
// `gradeSet` grades a KNOWN set of questions: one prompt builder (prompt.cjs), one schema
// (schema.cjs), one post-processing path (postprocess.cjs). Both HTTP handlers call it from
// INSIDE the existing request pipeline (idempotency → free check → limiter → entitlement →
// fair use, server/index.cjs); the core adds no route and no path around that pipeline.
//   /api/grade-worksheet  → gradeSet(N questions)
//   /api/check-solution   → gradeSet(a set of ONE), then mapped to its existing shape
//
// ★ PR-3 (C8) — NO TIMEOUTS, FASTER. A paper is graded in CHUNKS of at most three questions,
// IN PARALLEL, inside ONE request deadline (timing.cjs, independent of GEMINI_TIMEOUT_MS):
//   • every chunk call carries an explicit per-call timeout and the absolute deadline, and is
//     raced against it here too, so nothing outlives the deadline;
//   • a chunk whose first attempt fails is retried ONCE within the time left — a timed-out
//     multi-question chunk as single-question calls (smaller is faster), a 5xx / 429 / parse
//     miss / network failure at the same size; never another 4xx;
//   • one chunk's failure never kills the paper (settled handling): its questions come back
//     "not graded" (honest pending, never charged — C9) and the rest are graded;
//   • results merge by QUESTION ID (its position in the request), and a chunk's reply is read
//     only for that chunk's own questions — two questions printed with the same number never
//     collide (they are never put in the same chunk).
// It returns { ok:false } when no chunk produced a usable reply, and re-throws the first
// provider error when every chunk failed with one (each handler keeps its own 500 path — a
// status the client does not re-send).
//
// MODES (server/grading/modelConfig.cjs): 'single' sends every question to the grading
// model. 'router' (owner configuration (c)) routes PER QUESTION: an objective question whose
// pick is already known is scored with NO model call; 1–2-mark typed answers go to the light
// model; 3–5-mark answers, proofs and every photographed answer go to the grading model.
// Chunks are formed WITHIN each route (and each subject), so routing stays per question.

const { isObjective, scoreObjective, normaliseOption, optionsDifferOnlyByCase, normaliseOptionKeepCase } = require('../routes/objectiveScoring.cjs');
const { buildGradingContents } = require('./prompt.cjs');
const { chooseNonce } = require('./fence.cjs');
const { GRADING_RESPONSE_SCHEMA, GRADING_RESPONSE_SCHEMA_AUTODETECT, GRADING_RESPONSE_SCHEMA_INVENTORY } = require('./schema.cjs');
const { normaliseQuestionResult, inventoryStable } = require('./postprocess.cjs');
const secondLookLib = require('./secondLook.cjs');
const locateLib = require('./locate.cjs');
const timingLib = require('./timing.cjs');
const gradeTimingLib = require('./gradeTiming.cjs');
const { isChargeable } = require('./charge.cjs');
// A17 owner ruling 5: every grading model call is metered in proportion to the CHARGEABLE share of
// the questions it graded (services/usageLedger.cjs meter groups).
const { createMeterGroup, runInMeterGroup, settleMeterGroup } = require('../services/usageLedger.cjs');

/**
 * C3 · P0 (controller decision D23) — the page inventory the model committed to BEFORE grading,
 * as qNumber → the first lines it quoted. Returns null when the reply carries no usable
 * inventory (absent, not an array, or listing no question at all): the guard then fails OPEN
 * for that reply — an absent field is not evidence that a question is unanswered. (With the
 * inventory schema the field is required, so a schema-conforming reply always carries it.)
 * @returns {Map<number, string[]>|null}
 */
function pageInventoryOf(parsed) {
  const pages = parsed && Array.isArray(parsed.pageInventory) ? parsed.pageInventory : null;
  if (!pages) return null;
  const seen = new Map();
  for (const p of pages) {
    for (const e of (p && Array.isArray(p.questionsSeen) ? p.questionsSeen : [])) {
      const n = Number(e && e.qNumber);
      if (!(n > 0)) continue;
      if (!seen.has(n)) seen.set(n, []);
      // D38: an EXPLICIT empty firstLine is kept ("" = the number appears with nothing after it, a
      // blank answer slot); a missing firstLine field says nothing and is skipped.
      if (e && typeof e.firstLine === 'string') seen.get(n).push(e.firstLine.trim());
    }
  }
  return seen.size > 0 ? seen : null;
}
const {
  DEFAULT_GRADING_MODEL, DEFAULT_GRADING_LIGHT_MODEL, GRADING_FALLBACK_MODEL, isModelUnavailable, isThinkingRejected,
} = require('./modelConfig.cjs');

const SINGLE_MAX_OUTPUT_TOKENS = 16000;
const SET_MAX_OUTPUT_TOKENS = 32000;
// GRADE-SPEED-1: the cap for a retry that follows a MAX_TOKENS cut-off: 16000 -> 24000 (single), 32000 -> 48000
// (set), never above the ceiling (the model's own output limit is higher; this is a cost guard).
const RETRY_MAX_OUTPUT_TOKENS_FACTOR = 1.5;
const RETRY_MAX_OUTPUT_TOKENS_CEILING = 48000;
// LOCATE-FIRST-1: the locate call's output cap (a list of answers' first lines, no thinking).
const LOCATE_MAX_OUTPUT_TOKENS = 8000;
const FALLBACK_COUNTER = 'grading.model_fallback';
const THINKING_REJECTED_COUNTER = 'grading.thinking_cap_rejected';
const PROOF_RE = /\b(prove|proof|show that|hence show|verify that|justify)\b/i;

/** The pick an objective answer ALREADY carries without reading a photo: the option chosen in
 *  the UI, or a typed answer that is a bare option (a letter, or an option's text). */
function knownPick(q) {
  const recorded = String((q && q.pickedOption) || '').trim();
  if (recorded) return recorded;
  const typed = String((q && q.textAnswer) || '').trim();
  if (!typed) return '';
  const opts = Array.isArray(q.options) ? q.options : [];
  const N = optionsDifferOnlyByCase(opts) ? normaliseOptionKeepCase : normaliseOption;
  const norm = N(typed);
  if (/^[a-h]$/i.test(norm)) return norm.toLowerCase();
  if (opts.some((o) => N(o) === norm)) return typed;
  return '';
}

/** 'maths' | 'science' | 'auto' — the subject RULES a question is graded under. */
/** GRADER-BALANCE-1: the steps of the OTHER questions of one model reply (one chunk), as plain read-only
 *  records — status, studentWork, equationFault — for applyBalancingRuling's evidence check. */
function siblingStepsOf(byNumber, chunkQuestions, q) {
  const out = [];
  for (const other of chunkQuestions) {
    if (other === q || Number(other.qNumber) === Number(q.qNumber)) continue;
    const r = byNumber.get(Number(other.qNumber));
    for (const st of (r && Array.isArray(r.annotatedSteps) ? r.annotatedSteps : [])) {
      if (!st || typeof st !== 'object') continue;
      out.push(Object.freeze({ status: String(st.status || ''), studentWork: String(st.studentWork || ''),
        equationFault: typeof st.equationFault === 'string' ? st.equationFault.trim().toLowerCase() : null }));
    }
  }
  return out;
}

function subjectModeOf(subject) {
  const s = String(subject || '').trim();
  return !s ? 'auto' : /math/i.test(s) ? 'maths' : 'science';
}

/**
 * C8 · split one route group into chunks of at most MAX_CHUNK_QUESTIONS, as even as possible
 * (4 → 2+2, 10 → 3+3+2+2: the slowest chunk decides the paper's time), in request order. Two
 * questions with the SAME printed number never share a chunk, so a chunk's reply, keyed by
 * qNumber, can always be read without ambiguity.
 */
function planChunks(questions, max = timingLib.MAX_CHUNK_QUESTIONS) {
  const n = questions.length;
  if (n === 0) return [];
  const k = Math.ceil(n / max);
  const base = Math.floor(n / k);
  const extra = n % k;
  const sizes = Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
  const out = [];
  let cur = [];
  let target = sizes.shift();
  for (const q of questions) {
    const dup = cur.some((x) => Number(x.qNumber) === Number(q.qNumber));
    if (cur.length > 0 && (cur.length >= target || dup)) {
      out.push(cur);
      cur = [];
      target = sizes.length ? sizes.shift() : max;
    }
    cur.push(q);
  }
  if (cur.length) out.push(cur);
  return out;
}

/**
 * GRADE-SPEED-1 S1: does this question get a scheme from the solution cache before it is graded?
 * ONE predicate, used by gradeSet's pre-phase below AND by the detect handler's early prepare
 * (routes/checkSolution.cjs), so the two can never disagree: keyless (no scheme steps), not an
 * objective (bank-objective or a detect-flagged objective).
 */
function isSchemeCandidate(q) {
  return Boolean(q) && (!Array.isArray(q.solutionSteps) || q.solutionSteps.length === 0) && !isObjective(q) && q.objective !== true;
}

/**
 * GRADE-SPEED-1 S1: the fields handed to solutionCache.getOrCreateModelSolution for `q`. ONE builder,
 * used at grade time (gradeSet) and by the early prepare, so a prepared scheme is stored under the SAME
 * hash (question text + marks) the grade will look up. `requestSubject` is the request's subject.
 */
function schemeFieldsOf(q, requestSubject) {
  return {
    question: q.questionText,
    marks: q.marks,
    subject: q.subject || requestSubject || 'Maths',
    topic: q.topicLabel || q.topic || '',
    qType: q.qType || '',
    section: q.section || '',
    isObjective: false,
  };
}

function createGradingCore(deps) {
  const {
    callGemini,
    GEMINI_MODEL,
    GRADING_MODEL,
    GRADING_THINKING_BUDGET,
    GRADING_MODE,
    GRADING_LIGHT_MODEL,
    extractJsonObjectFromText,
    buildGeminiImagePart,
    solutionCache,
    makeFenceNonce,
  } = deps;
  // The fallback alert counter goes to the server's telemetry singleton (the one
  // /api/admin/token-telemetry reads) unless a test injects its own sink.
  const telemetry = deps.telemetry || require('../telemetry.cjs');

  // C8 · the time budget (server/index.cjs passes serverConfig's values; every other
  // construction gets the code defaults). `gradingTimingOverride` is a TEST seam only: it
  // bypasses the production clamps so a test can run a deadline in milliseconds.
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  const timing = deps.gradingTimingOverride && typeof deps.gradingTimingOverride === 'object'
    ? {
      marginMs: timingLib.GRADING_MARGIN_MS,
      minRetryMs: timingLib.GRADING_MIN_RETRY_MS,
      ...timingLib.normaliseTiming({}),
      ...deps.gradingTimingOverride,
    }
    : {
      marginMs: timingLib.GRADING_MARGIN_MS,
      minRetryMs: timingLib.GRADING_MIN_RETRY_MS,
      ...timingLib.normaliseTiming({
        deadlineMs: deps.GRADING_DEADLINE_MS,
        chunkTimeoutMs: deps.GRADING_CHUNK_TIMEOUT_MS,
        cacheBudgetMs: deps.GRADING_CACHE_BUDGET_MS,
      }),
    };
  // GRADE-SPEED-1 S3: the deadline of a request that grades exactly ONE question synchronously.
  // Kill switch: SINGLE_GRADE_DEADLINE_MS=80000 restores the ordinary deadline exactly. A TEST override
  // that sets only `deadlineMs` (a millisecond-scale deadline) applies to a one-question request too,
  // so every existing short-deadline test keeps meaning what it meant.
  if (deps.gradingTimingOverride && typeof deps.gradingTimingOverride === 'object') {
    timing.singleDeadlineMs = Number.isFinite(deps.gradingTimingOverride.singleDeadlineMs)
      ? deps.gradingTimingOverride.singleDeadlineMs
      : timing.deadlineMs;
  } else {
    timing.singleDeadlineMs = timingLib.resolveSingleQuestionDeadlineMs(
      deps.SINGLE_GRADE_DEADLINE_MS !== undefined ? deps.SINGLE_GRADE_DEADLINE_MS : process.env.SINGLE_GRADE_DEADLINE_MS,
      timing.deadlineMs,
    );
  }

  // The grading model: the grading-only setting when the server passes one (production,
  // via serverConfig), else the base model (every direct/legacy construction and test).
  const chosenModel = String(GRADING_MODEL || GEMINI_MODEL || DEFAULT_GRADING_MODEL);
  const chosenThinking = GRADING_MODEL && GRADING_THINKING_BUDGET !== null && GRADING_THINKING_BUDGET !== undefined &&
    Number.isFinite(Number(GRADING_THINKING_BUDGET))
    ? Math.floor(Number(GRADING_THINKING_BUDGET))
    : null;
  const routerMode = String(GRADING_MODE || '').toLowerCase() === 'router';
  const lightModel = String(GRADING_LIGHT_MODEL || DEFAULT_GRADING_LIGHT_MODEL);
  // Per core instance = per server process (one route instance per process).
  const fallback = { active: false, logged: false };
  // A rejected thinking cap (HTTP 400 naming thinking/budget): per process, stop sending it.
  const thinkingCap = { rejected: false, logged: false };

  function deadlineError(ms) {
    const e = new Error('Grading time budget reached after ' + Math.max(0, Math.round(ms)) + 'ms');
    e.status = 504;
    e.gradingDeadline = true;
    return e;
  }

  /** Race `promise` against `ms`. The loser keeps running and its outcome is ignored — never
   *  an unhandled rejection. The real client aborts its own request at the same moment. */
  function withinBudget(promise, ms) {
    promise.catch(() => {});
    if (!(ms > 0)) return Promise.reject(deadlineError(0));
    let timer;
    const expire = new Promise((_, reject) => { timer = setTimeout(() => reject(deadlineError(ms)), ms); });
    return Promise.race([promise, expire]).finally(() => clearTimeout(timer));
  }

  /** One model request on `model` (thinking cap only on the chosen grading model), with the
   *  automatic, COUNTED fallback when that model is unavailable to this key. */
  async function callModel(model, contents, genConfig) {
    const strong = model === chosenModel;
    const useFallback = strong && fallback.active && chosenModel !== GRADING_FALLBACK_MODEL;
    const sendModel = useFallback ? GRADING_FALLBACK_MODEL : model;
    const cfg = { ...genConfig };
    if (strong && !useFallback && chosenThinking !== null && !thinkingCap.rejected) cfg.thinkingConfig = { thinkingBudget: chosenThinking };
    if (useFallback) telemetry.increment(FALLBACK_COUNTER, 1);
    try {
      const reply = await callGemini(sendModel, contents, cfg);
      return { reply, model: sendModel };
    } catch (err) {
      // A rejected thinking CAP is not an unavailable MODEL: retry the same call once on the
      // SAME model without the cap, remember it for the process, never touch `fallback`.
      if (cfg.thinkingConfig && isThinkingRejected(err)) {
        thinkingCap.rejected = true;
        if (!thinkingCap.logged) {
          thinkingCap.logged = true;
          console.warn('[grading] thinking cap ' + chosenThinking + ' rejected by ' + sendModel + ' (HTTP 400) — grading continues on the same model without it for the rest of this process; counted as ' + THINKING_REJECTED_COUNTER + '.');
        }
        telemetry.increment(THINKING_REJECTED_COUNTER, 1);
        return callModel(model, contents, genConfig); // cap now omitted; fallback logic still applies
      }
      if (strong && !useFallback && chosenModel !== GRADING_FALLBACK_MODEL && isModelUnavailable(err)) {
        fallback.active = true;
        if (!fallback.logged) {
          fallback.logged = true;
          console.warn('[grading] model ' + chosenModel + ' unavailable (HTTP ' + (err.status || err.statusCode || '?') + ') — grading falls back to ' + GRADING_FALLBACK_MODEL + ' for the rest of this process; counted as ' + FALLBACK_COUNTER + '.');
        }
        telemetry.increment(FALLBACK_COUNTER, 1);
        const cfg2 = { ...genConfig };
        delete cfg2.thinkingConfig;
        const reply = await callGemini(GRADING_FALLBACK_MODEL, contents, cfg2);
        return { reply, model: GRADING_FALLBACK_MODEL };
      }
      throw err;
    }
  }

  /** The model's results[] — or, for the SINGLE endpoint only, a bare single-question object. */
  function resultsOf(parsed, single, firstQNumber) {
    if (parsed && Array.isArray(parsed.results)) return parsed.results;
    if (single && parsed && Array.isArray(parsed.annotatedSteps)) return [{ qNumber: firstQNumber, ...parsed }];
    return null;
  }

  /** Router: which model grades this question (null = no model call needed). */
  function routeOf(q, photographed) {
    if (!routerMode) return chosenModel;
    const objective = isObjective(q) || (q.objective === true && (Number(q.marks) || 1) <= 1);
    if (objective) {
      const pick = knownPick(q);
      const key = q.answer != null && String(q.answer).trim() ? q.answer : q.correctOption;
      if (pick && key) {
        const scored = scoreObjective({ answerKey: key, studentPick: pick, options: q.options, totalMarks: q.marks });
        if (scored.resolved) return null;
      }
      return lightModel; // a photographed or unresolvable pick needs the cheap reader
    }
    if (photographed) return chosenModel;
    if ((Number(q.marks) || 1) >= 3 || PROOF_RE.test(String(q.questionText || ''))) return chosenModel;
    return lightModel;
  }

  /** A deterministic grade for an objective question whose pick is known (no model call). */
  function deterministicObjective(q) {
    const pick = knownPick(q);
    return { qNumber: q.qNumber, annotatedSteps: [{ description: 'Option chosen', studentWork: pick, status: 'partial', marksAwarded: 0, marksDeducted: 0, teacherAnnotation: '', mistakeType: null }] };
  }

  const finishReasonOf = (r) => (r && r.raw && r.raw.candidates && r.raw.candidates[0] && r.raw.candidates[0].finishReason) || null;

  /** GRADE-SPEED-1: one timing row per model call into the request's sink (numbers only). */
  function recordAttempt(c, attempt, outcome) {
    const sink = c.timingSink;
    if (!sink || !Array.isArray(sink.attempts)) return;
    try { sink.attempts.push(gradeTimingLib.attemptRow(attempt, outcome, attempt > 1 ? c.retryReason : null)); } catch { /* telemetry only */ }
  }

  /**
   * ONE model call for one chunk (prompt → model → parse). Never throws: a provider error or a
   * blown budget comes back as { error }. The call carries its explicit per-call timeout and
   * the absolute deadline (geminiClient clamps every HTTP attempt to them) plus TELEMETRY-ONLY
   * hints (chunkKey, attempt) that geminiClient's buildBody never puts on the wire.
   */
  async function attemptChunk(c) {
    const { model, questions, uploadByNumber, document, subject, single, autoDetect, label, attempt, timeoutMs, deadlineAt, others, chunkKey } = c;
    // A17 ruling 5: this call's usage is held in its own meter group, settled by gradeSet once
    // the questions it graded are known to be graded or not (c.meters collects it).
    const meter = createMeterGroup();
    if (Array.isArray(c.meters)) c.meters.push({ questions, meter });
    // D31: ONE nonce per request, shared by all its chunks (and their retries), and the paper's
    // rulebook switches, so every chunk's prompt starts with the same bytes (implicit caching).
    const nonce = c.nonce || chooseNonce(questions.flatMap((q) => [q.questionText, q.textAnswer, q.pickedOption]), makeFenceNonce);
    const { contents, transport } = buildGradingContents({ questions, uploadByNumber, document, subject, nonce, buildGeminiImagePart, autoDetect, otherQuestionsInDocument: others,
      paperHasAnyTyped: c.paperHasAnyTyped, paperAnyScheme: c.paperAnyScheme,
      // LOCATE-FIRST-1: only when the locate step succeeded for this paper; absent, the request is byte-identical.
      ...(c.located ? { located: c.located } : {}),
      // GRADE-SECOND-LOOK-1: only the second-look call carries it; every other call renders as before.
      ...(c.secondLook ? { secondLook: c.secondLook } : {}) });
    // GRADE-SPEED-1 S6: the transport for the [grade-timing] line (a closed set, never content).
    if (c.timingSink && typeof c.timingSink === 'object' && typeof transport === 'string') c.timingSink.transport = transport;
    // D23: ONE document for the whole set is the only transport where the server cannot know
    // which questions were answered — there the model fills the page inventory first.
    const inventory = transport === 'document' && !autoDetect;
    const genConfig = {
      temperature: 0,
      // GRADE-SPEED-1: the FIRST attempt always uses the base cap; only a retry after a reply the token
      // cap cut off (c.maxOutputTokens, set by gradeChunk) raises it.
      maxOutputTokens: Number.isFinite(c.maxOutputTokens) ? c.maxOutputTokens : single ? SINGLE_MAX_OUTPUT_TOKENS : SET_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: autoDetect ? GRADING_RESPONSE_SCHEMA_AUTODETECT : inventory ? GRADING_RESPONSE_SCHEMA_INVENTORY : GRADING_RESPONSE_SCHEMA,
      // TELEMETRY hints only — geminiClient's buildBody reads a closed key set, so neither
      // reaches the wire. A single question carries its marks band; a set carries none.
      workloadClass: single ? 'grade-single' : uploadByNumber.size > 0 ? 'grade-batch' : 'worksheet',
      ...(single ? { marks: Number(questions[0] && questions[0].marks) || 1 } : {}),
      // C8 · the per-call time budget (read by geminiClient, never sent) and the chunk's
      // identity for the golden replay (lib/replay.cjs keys stored calls on it).
      timeoutMs: Math.max(1, Math.floor(timeoutMs)),
      deadlineAt,
      chunkKey,
      attempt,
    };
    const firstQ = questions[0] ? questions[0].qNumber : 1;
    const t0 = now();
    try {
      const { reply, model: used } = await withinBudget(runInMeterGroup(meter, () => callModel(model, contents, genConfig)), Math.min(timeoutMs, deadlineAt - now()));
      const parsed = extractJsonObjectFromText(reply && reply.text);
      const results = resultsOf(parsed, single, firstQ);
      if (!results) {
        console.warn(label + ' parse miss (chunk ' + chunkKey + ', attempt ' + attempt + ') —',
          'finishReason:', finishReasonOf(reply),
          'len:', reply && reply.text ? reply.text.length : 0,
          'tail:', reply && reply.text ? reply.text.slice(-200) : '(empty)');
      }
      const ms = now() - t0;
      const outcome = { reply, model: used, parsed, results, inventory: inventory && results ? pageInventoryOf(parsed) : null, ms, finishReason: finishReasonOf(reply) };
      recordAttempt(c, attempt, outcome);
      return outcome;
    } catch (err) {
      const timedOut = timingLib.isTimeoutError(err);
      recordAttempt(c, attempt, { ms: now() - t0, error: err, timedOut });
      console.warn(label + ' chunk ' + chunkKey + ' attempt ' + attempt + ' failed after ' + (now() - t0) + ' ms (' +
        (timedOut ? 'timeout' : 'HTTP ' + ((err && (err.status || err.statusCode)) || '?')) + ').');
      return { error: err, model, timedOut, ms: now() - t0 };
    }
  }

  /** C8 · one chunk: a first attempt, then at most ONE retry inside the time left. */
  async function gradeChunk(chunk, ctx) {
    const keyOf = (qs) => qs.map((q) => 'q' + ctx.idOf.get(q)).join('+');
    const uploadsFor = (qs) => {
      const nums = new Set(qs.map((q) => Number(q.qNumber)));
      return new Map([...ctx.uploadByNumber].filter(([n]) => nums.has(n)));
    };
    const run = (qs, attempt, timeoutMs, deadlineAt = ctx.callDeadlineAt, extra = null) => attemptChunk({
      model: chunk.model, questions: qs, uploadByNumber: uploadsFor(qs), document: ctx.document, subject: chunk.subject,
      single: ctx.single, autoDetect: ctx.autoDetect, label: ctx.label, attempt, timeoutMs, deadlineAt,
      others: ctx.document ? Math.max(0, ctx.total - qs.length) : 0, chunkKey: keyOf(qs),
      nonce: ctx.nonce, paperHasAnyTyped: ctx.paperHasAnyTyped, paperAnyScheme: ctx.paperAnyScheme, meters: ctx.meters,
      timingSink: ctx.timingSink, located: ctx.located, ...(extra || {}),
    });
    const left0 = ctx.callDeadlineAt - now();
    if (left0 <= 0) return [{ questions: chunk.questions, attempt: { error: deadlineError(0), model: chunk.model, timedOut: true } }];
    // In a CHUNKED paper a multi-question chunk's first attempt is capped (its retry can be
    // smaller, hence faster); a one-question chunk — and a single-call paper (D43) — gets the
    // whole remaining budget (its retry cannot be smaller).
    // GRADING-JOBS-1 J1 (D14): a background JOB has no 45 s first-attempt kill — every call, first
    // attempt and retry, is capped at the job's per-call cap (timing.cjs JOB_PER_CALL_MS) and the
    // job's wall deadline, except the J3 abort retry below. The synchronous path below is unchanged.
    const jobCap = ctx.job ? (ms) => Math.min(ctx.job.perCallMs, ms) : null;
    const t1 = jobCap ? jobCap(left0) : ctx.chunked && chunk.questions.length > 1 ? Math.min(timing.chunkTimeoutMs, left0) : left0;
    const first = await run(chunk.questions, 1, t1);
    if (first.results) return [{ questions: chunk.questions, attempt: first }];
    if (first.error && !timingLib.isRetryableError(first.error)) return [{ questions: chunk.questions, attempt: first }];
    // J3 round 6 (cofounder ruling, "split retry on the extended budget"): a JOB chunk whose first call
    // was ABORTED keeps the proven recovery SHAPE below (split into one-question calls; a one-question
    // chunk is retried as itself), but those attempt-2 calls get the larger abort-retry budget: each is
    // capped at min(abort-retry per-call cap, time left before the abort-retry wall) instead of the J1
    // numbers. Every other chunk (graded first time, an HTTP error, an unparseable reply) takes the
    // unchanged path. A split call that aborts again ends that question "not graded" (timeout).
    const abortRetry = ctx.job && ctx.job.abortRetry && first.timedOut ? ctx.job.abortRetry : null;
    if (abortRetry) {
      const retryDeadlineAt = ctx.startedAt + abortRetry.wallMs - timing.marginMs;
      const leftR = Math.min(abortRetry.perCallMs, retryDeadlineAt - now());
      if (leftR < timing.minRetryMs) return [{ questions: chunk.questions, attempt: first }];
      const partsR = chunk.questions.length > 1 ? chunk.questions.map((q) => [q]) : [chunk.questions];
      console.warn(ctx.label + ' chunk ' + keyOf(chunk.questions) + ' timed out — retrying once as ' + partsR.length +
        ' single-question call(s) within ' + Math.round(leftR) + ' ms (abort retry).');
      const retriedR = await Promise.all(partsR.map((qs) => run(qs, 2, leftR, retryDeadlineAt, { retryReason: gradeTimingLib.retryReasonOf(first) })));
      return partsR.map((qs, i) => ({ questions: qs, attempt: retriedR[i] }));
    }
    const left = jobCap ? jobCap(ctx.callDeadlineAt - now()) : ctx.callDeadlineAt - now();
    if (left < timing.minRetryMs) return [{ questions: chunk.questions, attempt: first }];
    const split = Boolean(first.timedOut) && chunk.questions.length > 1;
    const parts = split ? chunk.questions.map((q) => [q]) : [chunk.questions];
    console.warn(ctx.label + ' chunk ' + keyOf(chunk.questions) + ' ' + (first.error ? (first.timedOut ? 'timed out' : 'failed') : 'unparseable') +
      ' — retrying once' + (split ? ' as ' + parts.length + ' single-question calls' : '') + ' within ' + Math.round(left) + ' ms.');
    // GRADE-SPEED-1: a reply the token cap cut off (finishReason MAX_TOKENS, so unparseable) is retried with a
    // LARGER cap — resending the identical request would be cut off at the same place. Only this retry
    // changes; the first attempt, the prompt, the model, the thinking config and the temperature do not.
    const retryExtra = { retryReason: gradeTimingLib.retryReasonOf(first) };
    if (!first.error && first.finishReason === 'MAX_TOKENS') {
      const base = ctx.single ? SINGLE_MAX_OUTPUT_TOKENS : SET_MAX_OUTPUT_TOKENS;
      retryExtra.maxOutputTokens = Math.min(RETRY_MAX_OUTPUT_TOKENS_CEILING, Math.round(base * RETRY_MAX_OUTPUT_TOKENS_FACTOR));
    }
    const retried = await Promise.all(parts.map((qs) => run(qs, 2, left, undefined, retryExtra)));
    return parts.map((qs, i) => ({ questions: qs, attempt: retried[i] }));
  }

  /**
   * LOCATE-FIRST-1 — the ONE locate call (locate.cjs) for a one-document paper. Never throws, never blocks grading past
   * its own cap: resolves { ok, map?, n, ms, why? }. Fail-open on everything (error, timeout, unparseable, a number not
   * in the request, nothing placed). No thinking, temperature 0, the grading model (its counted fallback when that is
   * active). Its usage is metered with the whole paper's questions. Its nonce comes from crypto (never the injected
   * test generator), so a fail-open grade draws exactly the nonces it drew before.
   */
  async function runLocate({ questions, document, label, meters, callDeadlineAt, capMs }) {
    const t0 = now();
    const cap = Math.min(capMs, callDeadlineAt - t0);
    if (!(cap > 0)) return { ok: false, why: 'noTime', n: 0, ms: 0 };
    try {
      const nonce = chooseNonce(questions.map((q) => q.questionText));
      const contents = locateLib.buildLocateContents({ questions, document, nonce, buildGeminiImagePart });
      const model = fallback.active && chosenModel !== GRADING_FALLBACK_MODEL ? GRADING_FALLBACK_MODEL : chosenModel;
      const meter = createMeterGroup();
      meters.push({ questions, meter });
      const cfg = {
        temperature: 0,
        maxOutputTokens: LOCATE_MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: locateLib.LOCATE_RESPONSE_SCHEMA,
        thinkingConfig: { thinkingBudget: 0 },
        // TELEMETRY hints only (never on the wire): a find-the-answers call, closest to the detect workload.
        workloadClass: 'detect-question',
        timeoutMs: Math.max(1, Math.floor(cap)),
        deadlineAt: t0 + cap,
        chunkKey: 'locate',
        attempt: 1,
      };
      const reply = await withinBudget(runInMeterGroup(meter, () => callGemini(model, contents, cfg)), cap);
      const parsed = extractJsonObjectFromText(reply && reply.text);
      const v = locateLib.validateLocate(parsed, questions);
      if (!v.ok) console.warn(label + ' locate step gave no usable map (' + v.why + ') — grading proceeds as before.');
      return { ...v, n: v.n || 0, ms: now() - t0 };
    } catch (err) {
      const timedOut = timingLib.isTimeoutError(err);
      console.warn(label + ' locate step ' + (timedOut ? 'timed out' : 'failed (HTTP ' + ((err && (err.status || err.statusCode)) || '?') + ')') +
        ' after ' + (now() - t0) + ' ms — grading proceeds as before.');
      return { ok: false, why: timedOut ? 'timeout' : 'error', n: 0, ms: now() - t0 };
    }
  }

  /**
   * @param {{
   *   questions: Array<object>, document?: {imageBase64, imageMimeType}|null,
   *   uploads?: Array<{qNumber, imageBase64, imageMimeType}>, subject?: string,
   *   acceptsV2?: boolean, single?: boolean,
   *   autoDetect?: {topicVocabulary: Array, fallbackMarks: number}|null, label?: string,
   *   startedAt?: number,
   *   jobTiming?: {wallMs: number, perCallMs: number, chunkQuestions: number}|null,
   *   onPartSettled?: (rows: Array<{index: number, final: boolean, result: object}>) => void,
   * }} input
   *   startedAt (PR-3, C8): when the HTTP handler was entered (before the body was read) —
   *   the request deadline runs from it. Absent: from this call.
   *   jobTiming (GRADING-JOBS-1 J1, D14): a BACKGROUND JOB's own budget (timing.cjs jobTiming) —
   *   its wall deadline replaces the request deadline, every chunk has `chunkQuestions` questions at
   *   most (even a small paper), and no call has the 45 s first-attempt kill. Absent: unchanged.
   *   onPartSettled (J1, D13): called as each chunk part settles, with one row per question it
   *   covered: the question's normalised result judged on THAT part alone, and `final` — whether
   *   that result is already the one the finished paper will carry (postprocess inventoryStable).
   *   A hook that throws is ignored. Absent: nothing is computed (the synchronous path is as before).
   */
  async function gradeSet(input) {
    const single = input.single === true;
    const label = input.label || (single ? '[check-solution]' : '[grade-worksheet]');
    const autoDetect = single && input.autoDetect ? input.autoDetect : null;
    const questions = input.questions.map((q) => ({ ...q }));
    // C8 · a question's identity is its position in the request — never its printed number.
    const idOf = new Map(questions.map((q, i) => [q, i]));
    const startedAt = Number.isFinite(input.startedAt) ? input.startedAt : now();
    const job = input.jobTiming && typeof input.jobTiming === 'object' ? input.jobTiming : null;
    // GRADE-SPEED-1 S3: a synchronous request of exactly ONE question has the longer deadline; a job's
    // own wall and every multi-question request are unchanged.
    const deadlineAt = startedAt + (job ? job.wallMs : timingLib.requestDeadlineMs(timing, questions.length));
    const callDeadlineAt = deadlineAt - timing.marginMs;
    const onPartSettled = typeof input.onPartSettled === 'function' ? input.onPartSettled : null;

    // ── C&I PR-3 scheme-first cache hook (read-before-grade): every keyless SUBJECTIVE
    // question gets a student-agnostic model solution through the shared question-hash cache.
    // Bank questions, objective ones, the auto-detect path and every caller without the dep
    // are untouched; a cache failure never blocks grading.
    // ★ PR-3 (C8): BOUNDED by GRADING_CACHE_BUDGET_MS from handler entry. On a cache miss the
    // cache GENERATES a solution with a model call under GEMINI_TIMEOUT_MS (stepSolution.cjs),
    // which alone could spend the whole grading budget. A scheme that has not arrived by then
    // is not waited for: that question is graded without one (exactly as with no cache), and
    // the generation finishes in the background for the next request.
    // A17 ruling 5: every model call this request makes, with the questions it is for.
    const meters = [];
    const timingSink = input.timingSink && typeof input.timingSink === 'object' ? input.timingSink : null;
    // LOCATE-FIRST-1: ONE locate call for ONE uploaded document holding two or more questions' answers (not the
    // auto-detect single path), started NOW so it runs in parallel with the scheme pre-phase below.
    // (Transport 'document' only: per-question photos already say which answer is which.)
    const locateDoc = input.document && String(input.document.imageBase64 || '').trim() ? input.document : null;
    const anyUpload = (Array.isArray(input.uploads) ? input.uploads : []).some((u) => Number(u && u.qNumber) > 0 && u.imageBase64);
    // Its cap (review S3): a job keeps LOCATE_TIMEOUT_MS; a SYNCHRONOUS grade never waits for it past the scheme pre-phase
    // window: min(LOCATE_TIMEOUT_MS, max(time left in that window, LOCATE_SYNC_MIN_MS)). `timing.locateTimeoutMs` and
    // `timing.locateSyncMinMs` are TEST seams only (gradingTimingOverride); production uses the constants.
    const locateMaxMs = Number.isFinite(timing.locateTimeoutMs) ? timing.locateTimeoutMs : timingLib.LOCATE_TIMEOUT_MS;
    const locateSyncMinMs = Number.isFinite(timing.locateSyncMinMs) ? timing.locateSyncMinMs : timingLib.LOCATE_SYNC_MIN_MS;
    const locateCapMs = job ? locateMaxMs : Math.min(locateMaxMs, Math.max(startedAt + timing.cacheBudgetMs - now(), locateSyncMinMs));
    const locating = locateDoc && !anyUpload && !autoDetect && questions.length >= 2 && !locateLib.locateDisabled(process.env)
      ? runLocate({ questions, document: locateDoc, label, meters, callDeadlineAt, capMs: locateCapMs })
      : null;
    if (timingSink) {
      // GRADE-SPEED-1 S6: closed-set / numeric facts about this request for the [grade-timing] line.
      timingSink.marks = single || questions.length === 1 ? (Number(questions[0] && questions[0].marks) || null) : null;
    }
    if (solutionCache && !autoDetect) {
      const keyless = questions.filter(isSchemeCandidate);
      if (keyless.length === 0 && timingSink) timingSink.cacheHit = true; // S6: no scheme was needed
      if (keyless.length > 0) {
        const arrived = new Map();
        const generated = new Set(); // S6: a scheme that had to be generated (not read from the cache)
        const hooks = Promise.all(keyless.map(async (q) => {
          try {
            const meter = createMeterGroup();
            meters.push({ questions: [q], meter });
            const cached = await runInMeterGroup(meter, () => solutionCache.getOrCreateModelSolution(schemeFieldsOf(q, input.subject)));
            if (cached && Array.isArray(cached.schemeSteps) && cached.schemeSteps.length > 0) {
              arrived.set(q, cached.schemeSteps);
              // AC-SOLUTION-1 · DISPLAY ONLY: keep the structured steps beside (never instead of) the prompt strings.
              // Non-enumerable: invisible to the prompt, logs and any spread of `q`; read back only at the end of gradeSet.
              if (Array.isArray(cached.solutionSteps) && cached.solutionSteps.length > 0) {
                Object.defineProperty(q, '_modelSolutionSteps', { value: cached.solutionSteps, configurable: true });
              }
              if (cached.fromCache !== true) generated.add(q);
              // GRADE-SPEED-1b: which stored scheme (first 8 hex of its question hash, never text) and whether this grade
              // WAITED for an in-flight generation (e.g. the early prepare still running) rather than reading a stored one.
              if (timingSink && timingSink.schemeHash == null && typeof cached.hash === 'string') timingSink.schemeHash = cached.hash.slice(0, 8);
              if (timingSink && cached.joined === true) timingSink.schemeJoined = true;
            }
          } catch (e) {
            console.warn(label + ' solution-cache hook failed for Q' + q.qNumber + ' (grading continues):', e.message);
          }
        }));
        const budget = Math.min(startedAt + timing.cacheBudgetMs, callDeadlineAt) - now();
        const cacheT0 = now();
        try {
          await withinBudget(hooks, budget);
        } catch {
          console.warn(label + ' solution-cache pre-phase reached its ' + timing.cacheBudgetMs + ' ms budget — grading continues; schemes still being generated are not waited for.');
        }
        if (timingSink) {
          timingSink.cacheMs = now() - cacheT0;
          // S6: true only when EVERY keyless question's scheme was already in the cache (no generation awaited).
          timingSink.cacheHit = keyless.every((q) => arrived.has(q) && !generated.has(q));
        }
        // Only what arrived IN TIME is used — a late scheme can never change a prompt mid-grade.
        for (const [q, steps] of [...arrived]) {
          q.solutionSteps = steps;
          // HOTFIX-1: a MODEL-GENERATED solution guides the grade, but it is never the STORED
          // marking scheme the scheme-copy check compares against (postprocess.cjs
          // copiesScheme). A correct textbook-worded answer matches a generated solution by
          // construction — live 2026-10-06, owner paper Q8: 0/2 "not on your page".
          // Non-enumerable: it never reaches the prompt, a log or a response.
          Object.defineProperty(q, '_schemeGenerated', { value: true });
        }
      }
    }

    const uploadByNumber = new Map();
    for (const u of Array.isArray(input.uploads) ? input.uploads : []) {
      const n = Number(u && u.qNumber);
      if (n > 0 && u.imageBase64 && !uploadByNumber.has(n)) uploadByNumber.set(n, u);
    }
    const document = input.document && String(input.document.imageBase64 || '').trim() ? input.document : null;
    // Whether a question had ANY answer input the server can see. With one document for the
    // whole set the server cannot tell (null); otherwise it is a fact (C3 · P0 guard).
    // A recorded option pick (Quick Practice) IS an answer.
    const answerInputOf = (q) => (document ? null
      : uploadByNumber.has(Number(q.qNumber)) || String(q.textAnswer || '').trim().length > 0 || String(q.pickedOption || '').trim().length > 0);
    const photographedOf = (q) => Boolean(document) || uploadByNumber.has(Number(q.qNumber));

    // Route each question, group by (route, subject rules), then chunk each group (C8).
    const deterministic = new Map(); // question id → raw
    const groups = new Map();
    for (const q of questions) {
      const model = routeOf(q, photographedOf(q));
      if (model === null) { deterministic.set(idOf.get(q), deterministicObjective(q)); continue; }
      // A per-question subject (PR-3: the detect step can now say it) grades that question
      // under its own subject's rules; without one, the request's subject, as before.
      const subject = String(q.subject || '').trim() || String(input.subject || '').trim();
      const key = model + '\u0000' + subjectModeOf(subject);
      if (!groups.has(key)) groups.set(key, { model, subject, questions: [] });
      groups.get(key).questions.push(q);
    }
    // D43 (hybrid): a paper of at most timing.singleCallMaxQuestions questions is ONE call per
    // routed group (as PR-2 shipped); only a larger paper is chunked. A printed number never
    // repeats inside one call (planChunks), so a small paper splits only at a duplicate.
    // J1 (D14): a background job is ALWAYS chunked, at the job's chunk size — even a small paper.
    const chunked = job ? true : questions.length > timing.singleCallMaxQuestions;
    const chunkSize = job ? Math.max(1, Math.floor(job.chunkQuestions) || 1) : timingLib.MAX_CHUNK_QUESTIONS;
    const chunks = [];
    for (const g of groups.values()) {
      for (const qs of planChunks(g.questions, chunked ? chunkSize : Math.max(1, g.questions.length))) chunks.push({ model: g.model, subject: g.subject, questions: qs });
    }

    // The per-question context of the ONE normaliser — shared by the final results below and the
    // job's per-part rows (onPartSettled), so a row judged on its own part differs from its final
    // result ONLY through the page inventory (its own part's versus the paper's union).
    const normCtx = (q, inventory, notGraded, siblings) => ({
      acceptsV2: input.acceptsV2 === true,
      answerInput: answerInputOf(q),
      // PR-3 (ruling 6, deterministic): this question's OWN subject when the request says it — a
      // per-question subject, or the request subject of a ONE-question request. A multi-question
      // request's subject is the paper's (a mixed paper is filed under its first question), so it
      // is not used; post-processing then falls back to the model's own per-question subject.
      subjectHint: String(q.subject || '').trim() || (questions.length === 1 ? String(input.subject || '').trim() : ''),
      inventory,
      notGraded,
      // GRADER-BALANCE-1: the OTHER questions' steps of the SAME model reply (this chunk), where a skeletal
      // equation's balancingEvidence may be found (postprocess applyBalancingRuling). The same reply feeds the
      // job's per-part row and the final result, so the two never differ through it.
      siblings: siblings || [],
    });
    // J1 (D13): rows for the job, as each part settles. Without an inventory anywhere in this paper
    // (typed answers, per-question photos) a question's result depends on its own reply only, so it is
    // final at once; on one document it is final only in the stable case (postprocess inventoryStable).
    const inventoryPossible = Boolean(document) && !autoDetect;
    const secondLookOn = !secondLookLib.secondLookDisabled(process.env);
    const emitRows = (rows) => {
      if (!onPartSettled || rows.length === 0) return;
      try { onPartSettled(rows); } catch { /* a progress hook never affects the grade */ }
    };
    const rowsOfPart = (part) => {
      const a = part.attempt || {};
      const partial = Boolean(document) && part.questions.length < questions.length;
      if (!a.results) {
        const why = a.timedOut ? 'timeout' : 'error';
        return part.questions.map((q) => ({ index: idOf.get(q), final: true, result: normaliseQuestionResult(q, null, normCtx(q, null, why)) }));
      }
      const byNumber = new Map();
      for (const r of a.results) if (r && r.qNumber != null) byNumber.set(Number(r.qNumber), r);
      return part.questions.map((q) => {
        const raw = byNumber.get(Number(q.qNumber)) || null;
        const siblings = siblingStepsOf(byNumber, part.questions, q);
        const n = Number(q.qNumber);
        const own = a.inventory ? { present: a.inventory.has(n), firstLines: [...(a.inventory.get(n) || [])], partial } : null;
        const unread = !raw || raw.couldNotRead === true || raw.couldNotRead === 'true';
        // A copy of the reply: the final pass below reads the same object.
        const result = normaliseQuestionResult(q, raw ? structuredClone(raw) : null, normCtx(q, own, null, siblings));
        // GRADE-SECOND-LOOK-1 (review #5): a row the second look may still change is never published as final.
        const mayLookAgain = inventoryPossible && secondLookOn && secondLookLib.SECOND_LOOK_REASONS.includes(result && result._reason);
        const final = !mayLookAgain && (!inventoryPossible || unread || inventoryStable(own, raw));
        return { index: idOf.get(q), final, result };
      });
    };
    if (onPartSettled && deterministic.size > 0) {
      emitRows([...deterministic].map(([id, raw]) => ({ index: id, final: true,
        result: normaliseQuestionResult(questions[id], structuredClone(raw), normCtx(questions[id], null, null)) })));
    }

    // LOCATE-FIRST-1: the located map, or null (fail-open: every grading request is then byte-identical to before).
    let located = null;
    if (locating) {
      const loc = await locating;
      // Review S2/N1: hints only for questions that can carry one; none left → no block anywhere (byte-identical).
      if (loc.ok && loc.map instanceof Map) located = locateLib.hintableMap(loc.map, questions);
      if (timingSink) timingSink.locate = { ms: loc.ms, ok: Boolean(located), n: loc.n || 0 };
    }
    const ctx = {
      idOf, uploadByNumber, document, single, autoDetect, label, callDeadlineAt, total: questions.length, chunked, meters, job, startedAt, timingSink,
      located,
      // D31: request-level, so all chunks share them (see attemptChunk). The located labels/first lines are student text
      // fenced with the same nonce, so it must occur in none of them either (absent a map: the same texts as before).
      nonce: chooseNonce(questions.flatMap((q) => [q.questionText, q.textAnswer, q.pickedOption]).concat(located ? locateLib.locatedTexts(located) : []), makeFenceNonce),
      paperHasAnyTyped: questions.some((q) => String((q && q.textAnswer) || '').trim().length > 0),
      paperAnyScheme: questions.some((q) => Array.isArray(q.solutionSteps) && q.solutionSteps.length > 0),
    };
    const settled = await Promise.allSettled(chunks.map((c) => {
      const p = gradeChunk(c, ctx);
      if (!onPartSettled) return p;
      return p.then((ps) => {
        try { emitRows(ps.flatMap(rowsOfPart)); } catch { /* never affects the grade */ }
        return ps;
      });
    }));
    const parts = [];
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled') parts.push(...s.value);
      else parts.push({ questions: chunks[i].questions, attempt: { error: s.reason, model: chunks[i].model, timedOut: timingLib.isTimeoutError(s.reason) } });
    });

    // Merge BY QUESTION ID. A chunk's reply is read for that chunk's questions only (a reply
    // that also lists questions outside the chunk changes nothing).
    const rawById = new Map(deterministic);
    const notGradedById = new Map(); // question id → 'timeout' | 'error'
    const inventoryById = new Map(); // D23: question id → { present, firstLines }
    const siblingsById = new Map(); // GRADER-BALANCE-1: question id → the other questions' steps of its chunk's reply
    // D43 (controller): every chunk of a one-document paper lists the WHOLE document's pages, so
    // the paper's page inventory is the UNION of all chunks' inventories — a question another
    // chunk saw is never "not found", and any chunk's quoted first line for it counts.
    const paperInventory = new Map(); // printed number → Set of first lines
    let anyInventory = false;
    const paperUnplaced = []; // GRADE-SECOND-LOOK-1: answers on the pages that a chunk's reply listed under no number
    const gradedIds = [];
    const modelsUsed = [];
    let summary = '';
    let anyOk = chunks.length === 0;
    let lastModel = null;
    let firstError = null;
    for (const part of parts) {
      const a = part.attempt;
      if (a.model) {
        lastModel = a.model;
        if (!modelsUsed.includes(a.model)) modelsUsed.push(a.model);
      }
      if (!a.results) {
        for (const q of part.questions) notGradedById.set(idOf.get(q), a.timedOut ? 'timeout' : 'error');
        if (a.error && !firstError) firstError = a.error;
        continue;
      }
      anyOk = true;
      // Within ONE chunk a printed number is unique (planChunks), so the number identifies the
      // question. If a reply lists one number twice, the LAST entry stands (as before PR-3).
      const byNumber = new Map();
      for (const r of a.results) {
        if (r && r.qNumber != null) byNumber.set(Number(r.qNumber), r);
      }
      for (const q of part.questions) {
        const id = idOf.get(q);
        rawById.set(id, byNumber.get(Number(q.qNumber)) || null);
        siblingsById.set(id, siblingStepsOf(byNumber, part.questions, q));
        gradedIds.push([id, Boolean(document) && part.questions.length < questions.length]);
      }
      if (a.inventory) {
        anyInventory = true;
        const un = a.parsed && Array.isArray(a.parsed.unplacedAnswers) ? a.parsed.unplacedAnswers : [];
        for (const l of un) if (typeof l === 'string' && l.trim()) paperUnplaced.push(l.trim());
        for (const [n, lines] of a.inventory) {
          if (!paperInventory.has(n)) paperInventory.set(n, new Set());
          for (const l of lines) paperInventory.get(n).add(l);
        }
      }
      if (!summary) summary = String((a.parsed && a.parsed.summary) || '').trim();
    }
    if (anyInventory) {
      for (const [id, partial] of gradedIds) {
        const n = Number(questions[id].qNumber);
        // partial: this question's chunk is a strict subset of a one-document paper (postprocess
        // inventoryVerdict: a listed question the model graded with marks keeps its grade there).
        inventoryById.set(id, { present: paperInventory.has(n), firstLines: [...(paperInventory.get(n) || [])], partial });
      }
    }
    const modelUsed = modelsUsed.length ? modelsUsed.join('+') : (routerMode ? 'none' : chosenModel);
    if (!anyOk) {
      // Every chunk failed. A provider error (timeout, HTTP failure) keeps each handler's own
      // 500 path, as before; replies that were all unusable are { ok:false } (its 200 copy).
      if (firstError) throw firstError;
      return { ok: false, modelUsed: lastModel || modelUsed };
    }

    // Auto-detect (a set of one only): the grader determined the marks/subject/topic.
    let detection = null;
    if (autoDetect) {
      const raw = rawById.get(0) || {};
      const dm = Number(raw.detectedMarks != null ? raw.detectedMarks : raw.totalMarks);
      let marksSource;
      let effectiveMarks;
      if (Number.isFinite(dm) && dm >= 1 && dm <= 6) {
        effectiveMarks = Math.round(dm);
        marksSource = raw.marksSource === 'stated' ? 'stated' : 'inferred';
      } else {
        const hint = Number(autoDetect.fallbackMarks);
        effectiveMarks = Number.isFinite(hint) && hint >= 1 ? hint : 3;
        marksSource = 'fallback';
      }
      const ds = String(raw.detectedSubject || '');
      const dt = raw.detectedTopic;
      detection = {
        effectiveMarks,
        marksSource,
        detectedSubject: /sci/i.test(ds) ? 'Science' : /math/i.test(ds) ? 'Maths' : null,
        detectedTopic: dt && String(dt).trim() && String(dt).trim().toLowerCase() !== 'null' ? String(dt).trim() : null,
      };
      questions[0].marks = effectiveMarks;
    }

    // A question the model omitted is couldNotRead (honest pending); a question whose chunk
    // did not finish is "not graded" (C8) — never silently zeroed, never charged (C9).
    // (normCtx, above: the same context the job's per-part rows were judged with.)
    const results = questions.map((q, i) => normaliseQuestionResult(
      q,
      notGradedById.has(i) ? null : rawById.get(i) || null,
      normCtx(q, inventoryById.get(i) || null, notGradedById.get(i) || null, siblingsById.get(i) || null),
    ));
    // GRADE-SECOND-LOOK-1 — ONE extra call on a one-document paper whose first reading left questions
    // "not found" / "no working": look again for THOSE questions only, by content (secondLook.cjs). A
    // rescue replaces a result only when every guard passes; anything else keeps the first reading.
    if (document && !autoDetect && anyInventory && secondLookOn) {
      try {
        const look = await runSecondLook({ questions, results, inventoryById, siblingsById, chunks, ctx, job, callDeadlineAt, normCtx, label, timingSink, unplaced: paperUnplaced });
        // The first reading's summary was written about the paper BEFORE the rescue (live 25 Nov: "answers 1 to 4 ... cannot be
        // awarded marks" above a 12/12 score). After a rescue the second look's own summary is used; if it gave none, the first
        // summary is dropped rather than shown contradicting the marks.
        if (look && look.rescued > 0) summary = look.summary || '';
      } catch (e) {
        console.warn(label + ' second look failed (first reading kept): ' + (e && e.message ? e.message : e));
      }
    }
    // A17 ruling 5 · the premium meter counts graded questions only: each call's usage is written
    // scaled by the chargeable share of the questions IT graded (0 when none was graded). A chunk's
    // failed first attempt and its retries are metered against their own questions the same way.
    for (const { questions: qs, meter } of meters) {
      const ids = qs.map((q) => idOf.get(q)).filter((id) => id !== undefined);
      settleMeterGroup(meter, ids.length ? ids.filter((id) => isChargeable(results[id])).length / ids.length : 0);
    }
    // GRADE-MISS-1 — how many questions of this paper the page check dropped, by kind (numbers only).
    if (timingSink) {
      try { timingSink.outcomes = gradeTimingLib.outcomeCounts(results, { inventory: anyInventory }); } catch { /* telemetry only */ }
    }
    // AC-SOLUTION-1 · DISPLAY ONLY — attached after every grade/rescue step, so nothing the grader decided can depend on it.
    if (process.env.AC_MODEL_SOLUTION_DISABLED !== '1') {
      questions.forEach((q, i) => {
        const steps = q && q._modelSolutionSteps;
        if (results[i] && Array.isArray(steps) && steps.length > 0) {
          const totalMarks = Math.round(steps.reduce((t, x) => t + (Number(x.marks) || 0), 0) * 2) / 2;
          results[i].modelSolution = { steps: steps.map((x) => ({ description: x.description, working: x.working, marks: x.marks })), totalMarks };
        }
      });
    }
    return { ok: true, results, summary, modelUsed, detection, chunkCount: chunks.length };
  }

  /**
   * GRADE-SECOND-LOOK-1 — see secondLook.cjs for the why and the guards (G1–G5). Mutates `results` in place,
   * ONLY at the indices it rescues. Never throws past gradeSet (caught there); a failed or late call changes
   * nothing. Its usage is metered with the questions it was for (ctx.meters), so a rescued question that is
   * graded is charged like any graded question and an unrescued one is not.
   */
  async function runSecondLook({ questions, results, inventoryById, siblingsById, chunks, ctx, job, callDeadlineAt, normCtx, label, timingSink, unplaced }) {
    const candidates0 = secondLookLib.missedIndices(questions, results);
    if (candidates0.length === 0) return;
    // The answers the first reading GRADED (G4): their quoted first lines go to the prompt, their work to the guard.
    const claimed = [];
    const claimedWorks = [];
    results.forEach((r, i) => {
      if (!r || r._reason !== 'graded') return;
      claimedWorks.push(secondLookLib.workOf(r));
      const inv = inventoryById.get(i);
      const line = inv && Array.isArray(inv.firstLines) ? inv.firstLines.find((l) => String(l || '').trim()) : '';
      if (line) claimed.push({ qNumber: questions[i].qNumber, firstLine: line });
    });
    // G0 (cost): a question the first reading did not find is looked for again ONLY when the page holds an
    // answer it could not place; a question it SAW (a quoted first line, no working) always is. A paper whose
    // missing questions were simply skipped by the student costs nothing extra.
    const questionTexts = questions.map((q) => q.questionText);
    // An answer the first reading put under the WRONG number (answerMismatch) is an answer still looking for its
    // question: its quoted lines count as unplaced (eval 25 Nov: "1)" = Q5's answer under Q1 left Q5 "not found").
    const mismatchLines = [];
    results.forEach((r, i) => {
      if (!r || r._reason !== 'answerMismatch') return;
      const inv = inventoryById.get(i);
      for (const l of (inv && Array.isArray(inv.firstLines) ? inv.firstLines : [])) mismatchLines.push(l);
    });
    const open = secondLookLib.openUnplaced((Array.isArray(unplaced) ? unplaced : []).concat(mismatchLines), claimedWorks, questionTexts);
    const missed = secondLookLib.worthALook(candidates0, results, open);
    if (missed.length === 0) {
      if (timingSink) timingSink.secondLook = { asked: 0, rescued: 0, skipped: 0 };
      return;
    }
    const left = job ? Math.min(job.perCallMs, callDeadlineAt - now()) : callDeadlineAt - now();
    if (left < secondLookLib.SECOND_LOOK_MIN_MS) {
      if (timingSink) timingSink.secondLook = { asked: missed.length, rescued: 0, skipped: 1 };
      return;
    }
    const nonce = chooseNonce(questions.flatMap((q) => [q.questionText, q.textAnswer, q.pickedOption]).concat(claimed.map((c) => c.firstLine), open), makeFenceNonce);
    // One call per routed group (model + subject rules) the missed questions belong to — a mixed Maths + Science paper is
    // graded under each question's own subject rules, exactly as its first reading was. The calls run in parallel.
    const groupsOf = new Map();
    for (const i of missed) {
      const chunk = chunks.find((c) => c.questions.includes(questions[i])) || chunks[0];
      const key = chunk.model + '\u0000' + subjectModeOf(chunk.subject);
      if (!groupsOf.has(key)) groupsOf.set(key, { chunk, ids: [] });
      groupsOf.get(key).ids.push(i);
    }
    let failed = 0;
    let lookSummary = '';
    const settledLook = await Promise.all([...groupsOf.values()].map(async ({ chunk, ids }) => {
      const qs = ids.map((i) => questions[i]);
      const outcome = await attemptChunk({
        model: chunk.model, questions: qs, uploadByNumber: new Map(), document: ctx.document, subject: chunk.subject,
        single: false, autoDetect: null, label, attempt: 1, timeoutMs: Math.min(left, secondLookLib.SECOND_LOOK_MAX_MS),
        deadlineAt: callDeadlineAt, others: Math.max(0, questions.length - qs.length),
        chunkKey: 'look2:' + ids.map((i) => 'q' + i).join('+'),
        nonce, paperHasAnyTyped: ctx.paperHasAnyTyped, paperAnyScheme: ctx.paperAnyScheme, meters: ctx.meters,
        // Review S1: the second look never repeats the locate map (it may be what the first reading got wrong).
        timingSink, secondLook: { claimed, unplaced: open },
      });
      if (!outcome || !outcome.results) { failed += 1; return []; }
      if (!lookSummary) lookSummary = String((outcome.parsed && outcome.parsed.summary) || '').trim();
      const byNumber = new Map();
      for (const r of outcome.results) if (r && r.qNumber != null) byNumber.set(Number(r.qNumber), r);
      return ids.map((i) => {
        const q = questions[i];
        const n = Number(q.qNumber);
        const raw = byNumber.get(n) || null;
        const lines = outcome.inventory ? [...(outcome.inventory.get(n) || [])] : [];
        // The strict test (partial: false): its OWN quoted first line must be in its OWN work (G2).
        const inv = outcome.inventory ? { present: outcome.inventory.has(n), firstLines: lines, partial: false } : null;
        // Balancing evidence comes from the second look's OWN reply (review #8), never the first reading's.
        const result = raw && inv ? normaliseQuestionResult(q, structuredClone(raw), normCtx(q, inv, null, siblingStepsOf(byNumber, qs, q))) : null;
        return { index: i, raw, result, firstLines: lines };
      });
    }));
    const candidates = settledLook.flat();
    // G4 runs across ALL groups' rescues together: two questions may never take the same answer.
    const rescued = secondLookLib.acceptedRescues(candidates, claimedWorks, questionTexts);
    for (const i of rescued) results[i] = candidates.find((c) => c.index === i).result;
    // An answer the first reading put under the WRONG number, now marked under its real question: the question it was
    // wrongly put under had no answer of its own on the page, so it reads "not found" (pending, never a 0), not
    // "does not address the question" (eval 25 Nov: a skipped Q1 whose "1)" was Q5's answer).
    const rescuedWorks = rescued.map((i) => secondLookLib.workOf(results[i]));
    let reassigned = 0;
    results.forEach((r, i) => {
      if (!r || r._reason !== 'answerMismatch' || rescued.includes(i)) return;
      const inv = inventoryById.get(i);
      const lines = inv && Array.isArray(inv.firstLines) ? inv.firstLines : [];
      if (lines.length === 0 || !rescuedWorks.some((w) => secondLookLib.sharesAnswer(lines, w))) return;
      results[i] = normaliseQuestionResult(questions[i], { qNumber: questions[i].qNumber, couldNotRead: true, note: 'not found on the uploaded pages' }, normCtx(questions[i], null, null, null));
      reassigned += 1;
    });
    if (timingSink) timingSink.secondLook = { asked: missed.length, rescued: rescued.length, skipped: 0, failed, reassigned };
    return { rescued: rescued.length, summary: lookSummary };
  }

  return { gradeSet, chosenModel, routerMode, lightModel, fallbackState: fallback, timing };
}

module.exports = {
  createGradingCore, isSchemeCandidate, schemeFieldsOf, knownPick, pageInventoryOf, planChunks, subjectModeOf,
  SINGLE_MAX_OUTPUT_TOKENS, SET_MAX_OUTPUT_TOKENS, FALLBACK_COUNTER, THINKING_REJECTED_COUNTER,
};
