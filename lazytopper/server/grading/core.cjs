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
const { normaliseQuestionResult } = require('./postprocess.cjs');
const timingLib = require('./timing.cjs');

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
      const line = String((e && e.firstLine) || '').trim();
      if (line) seen.get(n).push(line);
    }
  }
  return seen.size > 0 ? seen : null;
}
const {
  DEFAULT_GRADING_MODEL, DEFAULT_GRADING_LIGHT_MODEL, GRADING_FALLBACK_MODEL, isModelUnavailable,
} = require('./modelConfig.cjs');

const SINGLE_MAX_OUTPUT_TOKENS = 16000;
const SET_MAX_OUTPUT_TOKENS = 32000;
const FALLBACK_COUNTER = 'grading.model_fallback';
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
    if (strong && !useFallback && chosenThinking !== null) cfg.thinkingConfig = { thinkingBudget: chosenThinking };
    if (useFallback) telemetry.increment(FALLBACK_COUNTER, 1);
    try {
      const reply = await callGemini(sendModel, contents, cfg);
      return { reply, model: sendModel };
    } catch (err) {
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

  /**
   * ONE model call for one chunk (prompt → model → parse). Never throws: a provider error or a
   * blown budget comes back as { error }. The call carries its explicit per-call timeout and
   * the absolute deadline (geminiClient clamps every HTTP attempt to them) plus TELEMETRY-ONLY
   * hints (chunkKey, attempt) that geminiClient's buildBody never puts on the wire.
   */
  async function attemptChunk(c) {
    const { model, questions, uploadByNumber, document, subject, single, autoDetect, label, attempt, timeoutMs, deadlineAt, others, chunkKey } = c;
    const nonce = chooseNonce(questions.flatMap((q) => [q.questionText, q.textAnswer, q.pickedOption]), makeFenceNonce);
    const { contents, transport } = buildGradingContents({ questions, uploadByNumber, document, subject, nonce, buildGeminiImagePart, autoDetect, otherQuestionsInDocument: others });
    // D23: ONE document for the whole set is the only transport where the server cannot know
    // which questions were answered — there the model fills the page inventory first.
    const inventory = transport === 'document' && !autoDetect;
    const genConfig = {
      temperature: 0,
      maxOutputTokens: single ? SINGLE_MAX_OUTPUT_TOKENS : SET_MAX_OUTPUT_TOKENS,
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
      const { reply, model: used } = await withinBudget(callModel(model, contents, genConfig), Math.min(timeoutMs, deadlineAt - now()));
      const parsed = extractJsonObjectFromText(reply && reply.text);
      const results = resultsOf(parsed, single, firstQ);
      if (!results) {
        console.warn(label + ' parse miss (chunk ' + chunkKey + ', attempt ' + attempt + ') —',
          'finishReason:', finishReasonOf(reply),
          'len:', reply && reply.text ? reply.text.length : 0,
          'tail:', reply && reply.text ? reply.text.slice(-200) : '(empty)');
      }
      return { reply, model: used, parsed, results, inventory: inventory && results ? pageInventoryOf(parsed) : null, ms: now() - t0 };
    } catch (err) {
      const timedOut = timingLib.isTimeoutError(err);
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
    const run = (qs, attempt, timeoutMs) => attemptChunk({
      model: chunk.model, questions: qs, uploadByNumber: uploadsFor(qs), document: ctx.document, subject: chunk.subject,
      single: ctx.single, autoDetect: ctx.autoDetect, label: ctx.label, attempt, timeoutMs, deadlineAt: ctx.callDeadlineAt,
      others: ctx.document ? Math.max(0, ctx.total - qs.length) : 0, chunkKey: keyOf(qs),
    });
    const left0 = ctx.callDeadlineAt - now();
    if (left0 <= 0) return [{ questions: chunk.questions, attempt: { error: deadlineError(0), model: chunk.model, timedOut: true } }];
    // A multi-question chunk's first attempt is capped (its retry can be smaller, hence
    // faster); a one-question chunk gets the whole remaining budget (its retry cannot).
    const t1 = chunk.questions.length > 1 ? Math.min(timing.chunkTimeoutMs, left0) : left0;
    const first = await run(chunk.questions, 1, t1);
    if (first.results) return [{ questions: chunk.questions, attempt: first }];
    if (first.error && !timingLib.isRetryableError(first.error)) return [{ questions: chunk.questions, attempt: first }];
    const left = ctx.callDeadlineAt - now();
    if (left < timing.minRetryMs) return [{ questions: chunk.questions, attempt: first }];
    const split = Boolean(first.timedOut) && chunk.questions.length > 1;
    const parts = split ? chunk.questions.map((q) => [q]) : [chunk.questions];
    console.warn(ctx.label + ' chunk ' + keyOf(chunk.questions) + ' ' + (first.error ? (first.timedOut ? 'timed out' : 'failed') : 'unparseable') +
      ' — retrying once' + (split ? ' as ' + parts.length + ' single-question calls' : '') + ' within ' + Math.round(left) + ' ms.');
    const retried = await Promise.all(parts.map((qs) => run(qs, 2, left)));
    return parts.map((qs, i) => ({ questions: qs, attempt: retried[i] }));
  }

  /**
   * @param {{
   *   questions: Array<object>, document?: {imageBase64, imageMimeType}|null,
   *   uploads?: Array<{qNumber, imageBase64, imageMimeType}>, subject?: string,
   *   acceptsV2?: boolean, single?: boolean,
   *   autoDetect?: {topicVocabulary: Array, fallbackMarks: number}|null, label?: string,
   *   startedAt?: number,
   * }} input
   *   startedAt (PR-3, C8): when the HTTP handler was entered (before the body was read) —
   *   the request deadline runs from it. Absent: from this call.
   */
  async function gradeSet(input) {
    const single = input.single === true;
    const label = input.label || (single ? '[check-solution]' : '[grade-worksheet]');
    const autoDetect = single && input.autoDetect ? input.autoDetect : null;
    const questions = input.questions.map((q) => ({ ...q }));
    // C8 · a question's identity is its position in the request — never its printed number.
    const idOf = new Map(questions.map((q, i) => [q, i]));
    const startedAt = Number.isFinite(input.startedAt) ? input.startedAt : now();
    const deadlineAt = startedAt + timing.deadlineMs;
    const callDeadlineAt = deadlineAt - timing.marginMs;

    // ── C&I PR-3 scheme-first cache hook (read-before-grade): every keyless SUBJECTIVE
    // question gets a student-agnostic model solution through the shared question-hash cache.
    // Bank questions, objective ones, the auto-detect path and every caller without the dep
    // are untouched; a cache failure never blocks grading.
    // ★ PR-3 (C8): BOUNDED by GRADING_CACHE_BUDGET_MS from handler entry. On a cache miss the
    // cache GENERATES a solution with a model call under GEMINI_TIMEOUT_MS (stepSolution.cjs),
    // which alone could spend the whole grading budget. A scheme that has not arrived by then
    // is not waited for: that question is graded without one (exactly as with no cache), and
    // the generation finishes in the background for the next request.
    if (solutionCache && !autoDetect) {
      const keyless = questions.filter((q) => (!Array.isArray(q.solutionSteps) || q.solutionSteps.length === 0) && !isObjective(q) && q.objective !== true);
      if (keyless.length > 0) {
        const arrived = new Map();
        const hooks = Promise.all(keyless.map(async (q) => {
          try {
            const cached = await solutionCache.getOrCreateModelSolution({
              question: q.questionText,
              marks: q.marks,
              subject: q.subject || input.subject || 'Maths',
              topic: q.topicLabel || q.topic || '',
              qType: q.qType || '',
              section: q.section || '',
              isObjective: false,
            });
            if (cached && Array.isArray(cached.schemeSteps) && cached.schemeSteps.length > 0) arrived.set(q, cached.schemeSteps);
          } catch (e) {
            console.warn(label + ' solution-cache hook failed for Q' + q.qNumber + ' (grading continues):', e.message);
          }
        }));
        const budget = Math.min(startedAt + timing.cacheBudgetMs, callDeadlineAt) - now();
        try {
          await withinBudget(hooks, budget);
        } catch {
          console.warn(label + ' solution-cache pre-phase reached its ' + timing.cacheBudgetMs + ' ms budget — grading continues; schemes still being generated are not waited for.');
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
    const chunks = [];
    for (const g of groups.values()) {
      for (const qs of planChunks(g.questions)) chunks.push({ model: g.model, subject: g.subject, questions: qs });
    }

    const ctx = { idOf, uploadByNumber, document, single, autoDetect, label, callDeadlineAt, total: questions.length };
    const settled = await Promise.allSettled(chunks.map((c) => gradeChunk(c, ctx)));
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
        if (a.inventory) inventoryById.set(id, { present: a.inventory.has(Number(q.qNumber)), firstLines: a.inventory.get(Number(q.qNumber)) || [] });
      }
      if (!summary) summary = String((a.parsed && a.parsed.summary) || '').trim();
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
    const results = questions.map((q, i) => normaliseQuestionResult(
      q,
      notGradedById.has(i) ? null : rawById.get(i) || null,
      {
        acceptsV2: input.acceptsV2 === true,
        answerInput: answerInputOf(q),
        inventory: inventoryById.get(i) || null,
        notGraded: notGradedById.get(i) || null,
      },
    ));
    return { ok: true, results, summary, modelUsed, detection, chunkCount: chunks.length };
  }

  return { gradeSet, chosenModel, routerMode, lightModel, fallbackState: fallback, timing };
}

module.exports = {
  createGradingCore, knownPick, pageInventoryOf, planChunks, subjectModeOf,
  SINGLE_MAX_OUTPUT_TOKENS, SET_MAX_OUTPUT_TOKENS, FALLBACK_COUNTER,
};
