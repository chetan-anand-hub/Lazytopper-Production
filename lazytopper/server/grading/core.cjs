'use strict';
// server/grading/core.cjs — THE ONE GRADING CORE (GRADER-CORE-1 PR-2, C1).
//
// `gradeSet` grades a KNOWN set of questions: one prompt builder (prompt.cjs), one schema
// (schema.cjs), a single parse-miss retry, one post-processing path (postprocess.cjs).
// Both HTTP handlers call it from INSIDE the existing request pipeline (idempotency → free
// check → limiter → entitlement → fair use, server/index.cjs); the core adds no route and no
// path around that pipeline.
//   /api/grade-worksheet  → gradeSet(N questions)
//   /api/check-solution   → gradeSet(a set of ONE), then mapped to its existing shape
// It returns { ok:false } for a model reply it cannot use, and lets a provider error
// (timeout, HTTP failure) propagate so each handler keeps its own 500 path.
//
// MODES (server/grading/modelConfig.cjs): 'single' sends every question to the grading
// model in one call. 'router' (owner configuration (c)) routes PER QUESTION: an objective
// question whose pick is already known is scored with NO model call; 1–2-mark typed answers
// go to the light model; 3–5-mark answers, proofs and every photographed answer go to the
// grading model. Each routed group is one call carrying only its own questions.

const { isObjective, scoreObjective, normaliseOption, optionsDifferOnlyByCase, normaliseOptionKeepCase } = require('../routes/objectiveScoring.cjs');
const { buildGradingContents } = require('./prompt.cjs');
const { chooseNonce } = require('./fence.cjs');
const { GRADING_RESPONSE_SCHEMA, GRADING_RESPONSE_SCHEMA_AUTODETECT } = require('./schema.cjs');
const { normaliseQuestionResult } = require('./postprocess.cjs');
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

  /** One model call for a group of questions: prompt → model → parse (+1 retry). */
  async function gradeGroup({ model, questions, uploadByNumber, document, subject, single, autoDetect, label }) {
    const nonce = chooseNonce(questions.flatMap((q) => [q.questionText, q.textAnswer, q.pickedOption]), makeFenceNonce);
    const { contents } = buildGradingContents({ questions, uploadByNumber, document, subject, nonce, buildGeminiImagePart, autoDetect });
    const genConfig = {
      temperature: 0,
      maxOutputTokens: single ? SINGLE_MAX_OUTPUT_TOKENS : SET_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      responseSchema: autoDetect ? GRADING_RESPONSE_SCHEMA_AUTODETECT : GRADING_RESPONSE_SCHEMA,
      // TELEMETRY hints only — geminiClient's buildBody reads a closed key set, so neither
      // reaches the wire. A single question carries its marks band; a set carries none.
      workloadClass: single ? 'grade-single' : uploadByNumber.size > 0 ? 'grade-batch' : 'worksheet',
      ...(single ? { marks: Number(questions[0] && questions[0].marks) || 1 } : {}),
    };
    const finishReasonOf = (r) => (r && r.raw && r.raw.candidates && r.raw.candidates[0] && r.raw.candidates[0].finishReason) || null;
    const firstQ = questions[0] ? questions[0].qNumber : 1;
    const once = async () => {
      const { reply, model: used } = await callModel(model, contents, genConfig);
      const parsed = extractJsonObjectFromText(reply && reply.text);
      return { reply, model: used, parsed, results: resultsOf(parsed, single, firstQ) };
    };
    let attempt = await once();
    if (!attempt.results) {
      console.warn(label + ' parse miss (attempt 1) — retrying once.',
        'finishReason:', finishReasonOf(attempt.reply),
        'len:', attempt.reply && attempt.reply.text ? attempt.reply.text.length : 0,
        'tail:', attempt.reply && attempt.reply.text ? attempt.reply.text.slice(-200) : '(empty)');
      attempt = await once();
    }
    if (!attempt.results) {
      console.warn(label + ' unparseable reply after retry —',
        'finishReason:', finishReasonOf(attempt.reply),
        'len:', attempt.reply && attempt.reply.text ? attempt.reply.text.length : 0,
        'head:', attempt.reply && attempt.reply.text ? attempt.reply.text.slice(0, 300) : '(empty)',
        'tail:', attempt.reply && attempt.reply.text ? attempt.reply.text.slice(-200) : '(empty)');
    }
    return attempt;
  }

  /**
   * @param {{
   *   questions: Array<object>, document?: {imageBase64, imageMimeType}|null,
   *   uploads?: Array<{qNumber, imageBase64, imageMimeType}>, subject?: string,
   *   acceptsV2?: boolean, single?: boolean,
   *   autoDetect?: {topicVocabulary: Array, fallbackMarks: number}|null, label?: string,
   * }} input
   */
  async function gradeSet(input) {
    const single = input.single === true;
    const label = input.label || (single ? '[check-solution]' : '[grade-worksheet]');
    const autoDetect = single && input.autoDetect ? input.autoDetect : null;
    const questions = input.questions.map((q) => ({ ...q }));

    // ── C&I PR-3 scheme-first cache hook (read-before-grade), unchanged in effect: every
    // keyless SUBJECTIVE question gets a student-agnostic model solution through the shared
    // question-hash cache. Bank questions, objective ones, the auto-detect path and every
    // caller without the dep are untouched; a cache failure never blocks grading.
    if (solutionCache && !autoDetect) {
      await Promise.all(questions
        .filter((q) => (!Array.isArray(q.solutionSteps) || q.solutionSteps.length === 0) && !isObjective(q) && q.objective !== true)
        .map(async (q) => {
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
            if (cached && Array.isArray(cached.schemeSteps) && cached.schemeSteps.length > 0) q.solutionSteps = cached.schemeSteps;
          } catch (e) {
            console.warn(label + ' solution-cache hook failed for Q' + q.qNumber + ' (grading continues):', e.message);
          }
        }));
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

    // Route each question (single mode: everything to the grading model, one call).
    const groups = new Map();
    const deterministic = new Map();
    for (const q of questions) {
      const model = routeOf(q, photographedOf(q));
      if (model === null) { deterministic.set(Number(q.qNumber), deterministicObjective(q)); continue; }
      if (!groups.has(model)) groups.set(model, []);
      groups.get(model).push(q);
    }

    const byNumber = new Map(deterministic);
    const modelsUsed = [];
    let summary = '';
    let anyOk = groups.size === 0;
    let lastModel = null;
    const groupList = [...groups.entries()];
    const attempts = await Promise.all(groupList.map(([model, qs]) => {
      const qNums = new Set(qs.map((q) => Number(q.qNumber)));
      const groupUploads = new Map([...uploadByNumber].filter(([n]) => qNums.has(n)));
      return gradeGroup({ model, questions: qs, uploadByNumber: groupUploads, document, subject: input.subject, single, autoDetect, label });
    }));
    const failedQs = new Set();
    groupList.forEach(([, qs], i) => {
      const attempt = attempts[i];
      lastModel = attempt.model;
      if (!modelsUsed.includes(attempt.model)) modelsUsed.push(attempt.model);
      if (!attempt.results) { for (const q of qs) failedQs.add(Number(q.qNumber)); return; }
      anyOk = true;
      if (!summary) summary = String((attempt.parsed && attempt.parsed.summary) || '').trim();
      for (const r of attempt.results) {
        if (r && r.qNumber != null) byNumber.set(Number(r.qNumber), r);
      }
    });
    const modelUsed = modelsUsed.length ? modelsUsed.join('+') : (routerMode ? 'none' : chosenModel);
    if (!anyOk) return { ok: false, modelUsed: lastModel || modelUsed };

    // Auto-detect (a set of one only): the grader determined the marks/subject/topic.
    let detection = null;
    if (autoDetect) {
      const raw = byNumber.get(Number(questions[0].qNumber)) || {};
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

    // A question the model omitted, or whose group's reply was unusable, is couldNotRead
    // (honest pending) — never silently zeroed.
    const results = questions.map((q) => normaliseQuestionResult(
      q,
      failedQs.has(Number(q.qNumber)) ? null : byNumber.get(Number(q.qNumber)) || null,
      { acceptsV2: input.acceptsV2 === true, answerInput: answerInputOf(q) },
    ));
    return { ok: true, results, summary, modelUsed, detection };
  }

  return { gradeSet, chosenModel, routerMode, lightModel, fallbackState: fallback };
}

module.exports = { createGradingCore, knownPick, SINGLE_MAX_OUTPUT_TOKENS, SET_MAX_OUTPUT_TOKENS, FALLBACK_COUNTER };
