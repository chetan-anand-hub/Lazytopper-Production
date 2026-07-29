/**
 * geminiClient.cjs — the single gateway every server-side Gemini call goes through.
 *
 * TOKEN TELEMETRY (added by PR-H1 — PURELY ADDITIVE)
 * --------------------------------------------------
 * Every cost figure the pricing decision rests on used to be an ESTIMATE derived
 * from prompt structure. Gemini returns `usageMetadata` on every non-streaming
 * response, so this file now turns that estimate into a MEASUREMENT.
 *
 * Four hard rules govern the instrumentation. Each is pinned by a test in
 * `geminiClient.test.cjs`:
 *
 *  1. REQUEST BEHAVIOUR IS UNCHANGED. Nothing here touches the outgoing body, the
 *     URL, the retry policy, the fallback ladder, or the return value of
 *     `callGemini`. `buildBody` reads a closed set of `config` keys, so the new
 *     `config.callClass` hint can never reach the wire.
 *  2. A TELEMETRY FAILURE MUST NEVER FAIL A GEMINI CALL. The whole emission path
 *     sits inside one try/catch that swallows everything. A student losing their
 *     graded answer because a counter threw would be a far worse bug than having
 *     no cost data at all.
 *  3. NO PROMPT OR RESPONSE CONTENT IS EVER RECORDED. `buildTokenTelemetryRecord`
 *     copies an EXPLICIT allowlist of numeric fields plus the model name and a
 *     call-class label from a closed set. It is never handed `finalContents`, the
 *     candidate text, or the raw response — see the call site, which passes only
 *     `data.usageMetadata`.
 *  4. THE CALL-CLASS LABELS MATCH THE RATE LIMITER'S. `vision` / `tutor` /
 *     `practice` / `visual` are the exact strings `rateLimiter.cjs` keys its
 *     `rate_limit.call.<class>` counters on, so the two datasets join on class:
 *     "how many calls" (rate limiter) against "how many tokens per call" (here).
 */

/* ─────────────────────────────────────────────────────────────────────────────
   CALL-CLASS LABELS — must stay identical to the VALUES of rateLimiter.cjs's
   PAID_ENDPOINTS, or the two datasets stop joining. `geminiClient.test.cjs`
   requires that module and asserts the two vocabularies are equal, so drift
   turns the suite red rather than silently splitting the cost data.

   The rate limiter classifies by REQUEST PATH; it sits in the request pipeline
   and has `reqPath` in hand. This gateway does not: `callGemini(model, contents,
   config)` carries no route information. So the class is resolved in two steps:

     1. `config.callClass`, when a caller supplies it. Explicit always wins, and
        this is the path route modules should migrate to.
     2. otherwise, the nearest ROUTE-HANDLER FUNCTION on a stack captured at
        entry, mapped 1:1 onto PAID_ENDPOINTS.

   ★ WHY FUNCTION NAMES AND NOT FILE NAMES. The first draft of this mapped
   MODULES, which is wrong and wrong in the direction that corrupts the number
   this instrumentation exists to produce. `routes/checkSolution.cjs` contains
   THREE endpoints and they are NOT one class on trunk:

       handleCheckSolution   (:311)  -> /api/check-solution   -> vision
       handleDetectQuestion  (:585)  -> /api/detect-question  -> practice
       gradeStructuredSet    (:1006) -> /api/grade-worksheet  -> vision

   detect-question is deliberately NOT vision: rateLimiter.cjs re-classified it
   because it runs at thinkingBudget 0 for roughly a tenth of a grading call's
   cost, and one advertised "solution check" fires detect-question AND
   check-solution. A module-level map would have charged every detect call to
   `vision`, inflating measured cost-per-vision-call and deflating
   cost-per-practice-call — in the exact pricing input this lane was built to
   measure. File-level granularity was simply too coarse for the question.

   ★ WHY SOME SHARED FUNCTIONS ARE DELIBERATELY ABSENT. `generateModelSolution`
   and `getOrCreateModelSolution` (stepSolution.cjs) are called from
   /api/step-solution, from the grader's scheme-first hook, and from the admin
   regenerate path — their class depends on their CALLER. Mapping them would
   pin one class onto three. They are left out so the scan walks PAST them to the
   route handler that actually owns the request. Do not add them.

   Anything else — the warm question pool, the grader eval harness, the offline
   backfill scripts — is labelled `unclassified` rather than guessed at. Those
   calls are real spend but they are not request-scoped, so the rate limiter has
   no class for them and inventing one would produce a column joining to nothing.
   `unclassified` is also the honest failure mode if a stack is ever unreadable:
   an unattributed call costs the analysis one row, a MISattributed one corrupts
   two classes at once.
   ──────────────────────────────────────────────────────────────────────────── */
const CALL_CLASSES = Object.freeze(['vision', 'tutor', 'practice', 'visual']);
const UNCLASSIFIED_CALL_CLASS = 'unclassified';

const CALL_CLASS_BY_HANDLER = Object.freeze({
  // routes/checkSolution.cjs — three endpoints, two classes.
  handleCheckSolution: 'vision',
  handleGradeWorksheet: 'vision',
  gradeStructuredSet: 'vision', // handleGradeWorksheet's only delegate
  handleDetectQuestion: 'practice',
  // routes/tutor.cjs
  handleTutorRequest: 'tutor',
  // routes/stepSolution.cjs + routes/moreLikeThis.cjs
  handleStepSolution: 'practice',
  handleMoreLikeThis: 'practice',
  // routes/diagrams.cjs
  handleGenerateDiagram: 'visual',
  handleGenerateVisual: 'visual',
});

// Keep the last N records so per-call granularity (model, latency, retry) survives
// beyond the aggregate counters. Bounded so a long-lived process cannot grow it
// without limit; records hold only numbers and labels, never text.
const TOKEN_TELEMETRY_RING_LIMIT = 200;

// Captured synchronously at the top of callGemini. Node stitches `await` chains
// into the trace, so a handler several awaits above still appears as
// "at async handleX".
//
// The default Error.stackTraceLimit is 10. MEASURED, not assumed: the deepest
// live chain today (handleStepSolution -> getOrCreateModelSolution ->
// generateModelSolution -> the index.cjs wrapper -> here) puts the handler at
// roughly frame 4, so 10 is currently SUFFICIENT and this raise is HEADROOM, not
// a fix. It is kept because truncation drops the outermost frames — the handler
// is the last thing to survive — so one extra layer of indirection between a
// route and this gateway would silently start costing classified rows. The
// accompanying test pads the chain until the default limit really does lose the
// handler, so the raise is pinned rather than decorative.
//
// The limit is restored immediately. Never throws — an unreadable stack degrades
// to `unclassified`.
//
// ★ VERIFIED LIMIT (measured, not assumed): stitching happens across `await`.
// The live callers all use `const x = await f()`, which stitches. A bare
// tail-call (`return f()`, no await) leaves no frame to stitch and hides the
// callers above it — the call then reads `unclassified`, never a WRONG class.
// Both shapes are pinned by tests. If a route ever needs to be certain, it
// should pass `config.callClass` rather than rely on the stack.
const STACK_FRAMES_TO_CAPTURE = 40;

function captureCallerStack() {
  const previousLimit = Error.stackTraceLimit;
  try {
    Error.stackTraceLimit = STACK_FRAMES_TO_CAPTURE;
    const holder = {};
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(holder, captureCallerStack);
      return String(holder.stack || '');
    }
    return String(new Error().stack || '');
  } catch {
    return '';
  } finally {
    Error.stackTraceLimit = previousLimit;
  }
}

function classifyCall(config, callerStack) {
  const explicit =
    config && typeof config.callClass === 'string' ? config.callClass.trim() : '';
  if (explicit && CALL_CLASSES.includes(explicit)) return explicit;

  // Innermost frame first, so the NEAREST route handler wins. A frame reads
  // "    at async handleStepSolution (/app/.../stepSolution.cjs:514:9)", so the
  // handler name is matched on a word boundary to keep a longer identifier that
  // merely contains it from matching.
  const frames = String(callerStack || '').split('\n');
  const handlers = Object.keys(CALL_CLASS_BY_HANDLER);
  for (const frame of frames) {
    for (const handler of handlers) {
      const at = frame.indexOf(handler);
      if (at === -1) continue;
      const before = at === 0 ? '' : frame[at - 1];
      const after = frame[at + handler.length] || '';
      if (/[A-Za-z0-9_$]/.test(before) || /[A-Za-z0-9_$]/.test(after)) continue;
      return CALL_CLASS_BY_HANDLER[handler];
    }
  }
  return UNCLASSIFIED_CALL_CLASS;
}

function toCount(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// The model id is the ONE free-text field in a record, so it is clamped to the
// character class and length a model id actually uses (`gemini-2.5-flash` and
// friends). Defence in depth: even a caller that passed student text as the model
// argument could not turn that field into a content channel.
const MODEL_LABEL_MAX_LENGTH = 64;

function sanitiseModelLabel(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, MODEL_LABEL_MAX_LENGTH);
}

/**
 * Build the telemetry record.
 *
 * ★ THIS IS THE CONTENT FIREWALL. Every field below is either a number read from
 * an EXPLICITLY NAMED key of `usageMetadata`, the model name, or a label from a
 * closed set. There is no spread, no Object.assign, no key iteration — so a field
 * Google adds to `usageMetadata` tomorrow cannot appear here, and neither the
 * prompt nor the response is in scope at this point in the code.
 */
function buildTokenTelemetryRecord(input) {
  const usage =
    input && input.usageMetadata && typeof input.usageMetadata === 'object'
      ? input.usageMetadata
      : {};
  const attempts = toCount(input && input.attempts) || 1;
  return {
    model: sanitiseModelLabel(input && input.model),
    callClass:
      input && CALL_CLASSES.includes(input.callClass)
        ? input.callClass
        : UNCLASSIFIED_CALL_CLASS,
    promptTokenCount: toCount(usage.promptTokenCount),
    candidatesTokenCount: toCount(usage.candidatesTokenCount),
    // The critical one: thinking bills at OUTPUT rates, and it is invisible in
    // every estimate derived from prompt structure.
    thoughtsTokenCount: toCount(usage.thoughtsTokenCount),
    totalTokenCount: toCount(usage.totalTokenCount),
    latencyMs: toCount(input && input.latencyMs),
    attempts,
    retry: attempts > 1,
    usedFallback: Boolean(input && input.usedFallback),
  };
}

function createGeminiClient(cfg) {
  const {
    GEMINI_API_KEY,
    HAS_REPLIT_PROXY,
    REPLIT_GEMINI_BASE_URL,
    REPLIT_GEMINI_API_KEY,
    DIRECT_GEMINI_API_KEY,
    GEMINI_TUTOR_MODEL,
    GEMINI_TIMEOUT_MS,
  } = cfg;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ──────────────────────────────────────────────────────────────────────────
     Token telemetry sink.

     `cfg.telemetry` is honoured when supplied (tests inject a recorder; the
     rate limiter takes its sink the same way). Otherwise the real
     `server/telemetry.cjs` is required LAZILY, once, inside a try/catch — the
     gateway is imported by vitest and by offline scripts as well as by the
     server, and a resolution failure in any of those must degrade to "no
     telemetry", never to a broken Gemini client.
     ────────────────────────────────────────────────────────────────────────── */
  let telemetrySink = cfg && cfg.telemetry ? cfg.telemetry : undefined;
  let telemetryResolved = telemetrySink !== undefined;

  function resolveTelemetry() {
    if (telemetryResolved) return telemetrySink;
    telemetryResolved = true;
    try {
      telemetrySink = require('../telemetry.cjs');
    } catch {
      telemetrySink = null;
    }
    return telemetrySink;
  }

  const tokenTelemetryRing = [];

  /**
   * Emit one token-usage record.
   *
   * HARD CONSTRAINT: this function cannot throw. Everything — sink resolution,
   * every increment, the ring push — is inside one try/catch with an empty
   * handler. Removing that try/catch is the mutation the "telemetry failure does
   * not fail the call" test is written against.
   *
   * Counter keys are `gemini_tokens.<metric>.<class>`, deliberately parallel to
   * the rate limiter's `rate_limit.<metric>.<class>`, so a snapshot can be
   * pivoted on the shared class segment.
   */
  function emitTokenTelemetry(record) {
    try {
      const sink = resolveTelemetry();
      if (sink && typeof sink.increment === 'function') {
        const klass = record.callClass;
        sink.increment(`gemini_tokens.call.${klass}`, 1);
        sink.increment(`gemini_tokens.prompt.${klass}`, record.promptTokenCount);
        sink.increment(`gemini_tokens.candidates.${klass}`, record.candidatesTokenCount);
        sink.increment(`gemini_tokens.thoughts.${klass}`, record.thoughtsTokenCount);
        sink.increment(`gemini_tokens.total.${klass}`, record.totalTokenCount);
        sink.increment(`gemini_tokens.latency_ms.${klass}`, record.latencyMs);
        sink.increment(`gemini_tokens.model.${record.model}`, 1);
        if (record.retry) sink.increment(`gemini_tokens.retry.${klass}`, 1);
        if (record.usedFallback) sink.increment(`gemini_tokens.fallback.${klass}`, 1);
      }
      tokenTelemetryRing.push(record);
      while (tokenTelemetryRing.length > TOKEN_TELEMETRY_RING_LIMIT) {
        tokenTelemetryRing.shift();
      }
    } catch {
      /* A telemetry failure must NEVER fail a Gemini call. */
    }
  }

  // The most recent records, newest last. Numbers and labels only — safe to
  // serialise anywhere, because nothing student-written ever enters a record.
  function getTokenTelemetry() {
    return tokenTelemetryRing.slice();
  }

  async function withRetry(fn, maxAttempts = 5) {
    const baseDelayMs = 1000;
    let lastErr;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const status = err && (err.status || err.statusCode);
        if (status === 429) {
          lastErr = err;
          if (attempt < maxAttempts - 1) {
            let delayMs = baseDelayMs * Math.pow(2, attempt);
            const retryAfter = err.retryAfter;
            if (retryAfter) {
              const parsed = parseInt(retryAfter, 10);
              if (!isNaN(parsed)) delayMs = parsed * 1000;
            }
            await sleep(delayMs);
            continue;
          }
        }
        throw err;
      }
    }
    throw lastErr;
  }

  async function callGemini(model, finalContents, config) {
    // Telemetry bookkeeping. Captured before anything else so the stack still
    // holds the calling route's frame, and so latency covers the whole ladder
    // (retries, mime-retry and proxy fallback included).
    const telemetryCallerStack = captureCallerStack();
    const telemetryStartedAt = Date.now();
    let telemetryAttempts = 0;

    if (!GEMINI_API_KEY) {
      throw new Error(
        'No Gemini auth available. Set AI_INTEGRATIONS_GEMINI_BASE_URL + AI_INTEGRATIONS_GEMINI_API_KEY (Replit proxy), or AI_PROVIDER=gemini and API_KEY in server/.env.'
      );
    }

    const buildBody = (includeStructuredOutput) => {
      const body = {
        contents: finalContents,
        generationConfig: {
          temperature:
            config && typeof config.temperature === 'number'
              ? config.temperature
              : 0.6,
          maxOutputTokens:
            config && typeof config.maxOutputTokens === 'number'
              ? config.maxOutputTokens
              : 900,
        },
      };
      if (
        includeStructuredOutput &&
        config &&
        typeof config.responseMimeType === 'string' &&
        config.responseMimeType.trim()
      ) {
        body.generationConfig.responseMimeType = config.responseMimeType.trim();
      }
      // Constrained decoding (additive, opt-in — PR-C2). Forwarded ONLY when the
      // caller passes a responseSchema object. INVARIANT, identical to the
      // thinkingConfig one above: when no responseSchema is supplied (the tutor,
      // diagrams, the warm pool — every caller but the three grading paths) the body
      // is byte-identical to before; this only ever ADDS the key.
      //
      // ★ WHY IT SHARES THE `includeStructuredOutput` GATE WITH responseMimeType, AND
      // IS NOT A SECOND INDEPENDENT FLAG. Two reasons, both load-bearing:
      //
      //   1. The API requires responseMimeType 'application/json' FOR a responseSchema.
      //      Sending a schema on the retry that just stripped the mime type would be a
      //      request that cannot succeed — it would turn today's WORKING recovery into a
      //      guaranteed second failure.
      //   2. That retry (see retryStructuredOutputRegex below) is the ladder that keeps
      //      this project working across TWO backends — the direct Google endpoint and
      //      the Replit proxy. When one of them rejects a structured-output field, the
      //      call is re-issued WITHOUT it. Dropping both together means a
      //      schema-hostile backend degrades to EXACTLY the pre-PR-C2 request, which is
      //      known-good, rather than failing every grading call with no recovery.
      if (
        includeStructuredOutput &&
        config &&
        config.responseSchema &&
        typeof config.responseSchema === 'object'
      ) {
        body.generationConfig.responseSchema = config.responseSchema;
      }
      // Thinking control (additive, opt-in). Forwarded ONLY when the caller passes
      // a thinkingConfig object — e.g. the detect-question call sets
      // { thinkingBudget: 0 } to stop gemini-2.5-flash's thinking tokens from
      // eating its tiny maxOutputTokens budget. INVARIANT: when no thinkingConfig
      // is supplied (grade, tutor, diagrams, warm-pool — every other call) the body
      // is byte-identical to before; this only ever ADDS the key.
      if (config && config.thinkingConfig && typeof config.thinkingConfig === 'object') {
        body.generationConfig.thinkingConfig = config.thinkingConfig;
      }
      return body;
    };

    const doRequest = async (includeStructuredOutput, reqUrl, apiKey) => {
      // One increment per HTTP request actually issued for this logical call.
      // >1 means the call was retried (429 backoff, a structured-output retry, or a
      // proxy fallback) — that is what `record.retry` reports.
      //
      // ★ NOTE FOR ANYONE READING `retryCount` IN THE TELEMETRY: this counter does NOT
      // see the GRADER's parse-miss retry. That retry is a second, separate
      // `callGemini` invocation (checkSolution.cjs `gradeOnce()`), so it emits a
      // SECOND record with attempts:1 / retry:false rather than incrementing this one.
      // See [FU-C2-PARSE-MISS-NOT-COUNTED].
      telemetryAttempts += 1;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
      try {
        const response = await fetch(reqUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(buildBody(includeStructuredOutput)),
          signal: controller.signal,
        });
        const rawText = await response.text();
        if (response.status === 429) {
          const err = new Error(`Gemini rate limited (429): ${rawText}`);
          err.status = 429;
          err.retryAfter = response.headers.get('Retry-After');
          err.body = rawText;
          throw err;
        }
        return { response, rawText };
      } catch (err) {
        if (err && err.name === 'AbortError') {
          const timeoutErr = new Error(
            `Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms`
          );
          timeoutErr.status = 504;
          throw timeoutErr;
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const proxyUrl = HAS_REPLIT_PROXY
      ? `${REPLIT_GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`
      : null;
    const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const primaryUrl = DIRECT_GEMINI_API_KEY ? directUrl : proxyUrl;
    const primaryKey = DIRECT_GEMINI_API_KEY ? DIRECT_GEMINI_API_KEY : REPLIT_GEMINI_API_KEY;
    const fallbackUrl = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? proxyUrl : null;
    const fallbackKey = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? REPLIT_GEMINI_API_KEY : null;

    // ★ WIDENED BY PR-C2 to cover responseSchema as well as responseMimeType. Both are
    // `generationConfig` structured-output fields, both are stripped together by the
    // same retry, and both can be rejected by a backend that does not implement them.
    // Before this widened, a backend replying `Unknown name "responseSchema"` would
    // have matched NOTHING here: the retry would never fire, and every grading call
    // would fail with no recovery. The retry re-sends the same body, so an
    // unrecognised field is not self-healing — it has to be named here to be dropped.
    const retryStructuredOutputRegex =
      /responseMimeType|response_mime_type|responseSchema|response_schema|Unknown name.*response(MimeType|Schema)/i;

    // Was any structured-output field actually sent? The retry is only meaningful if
    // there is something for the second attempt to strip. Reads BOTH fields, so a
    // future caller that passes a schema without a mime type still gets the recovery.
    const sentStructuredOutput = Boolean(
      config &&
        ((typeof config.responseMimeType === 'string' && config.responseMimeType.trim()) ||
          (config.responseSchema && typeof config.responseSchema === 'object'))
    );

    const runWithFallback = async (includeStructuredOutput) => {
      let response, rawText;

      try {
        ({ response, rawText } = await withRetry(() =>
          doRequest(includeStructuredOutput, primaryUrl, primaryKey)
        ));
      } catch (primaryErr) {
        if (primaryErr.status === 429 || !fallbackUrl) {
          throw primaryErr;
        }
        console.warn(
          `[callGemini] Primary threw (${primaryErr.status || primaryErr.message}), falling back to proxy`
        );
        ({ response, rawText } = await doRequest(includeStructuredOutput, fallbackUrl, fallbackKey));
        return { response, rawText, usedFallback: true };
      }

      return { response, rawText, usedFallback: false };
    };

    let { response, rawText, usedFallback } = await runWithFallback(true);

    if (
      !response.ok &&
      sentStructuredOutput &&
      retryStructuredOutputRegex.test(rawText)
    ) {
      const activeUrl = usedFallback ? fallbackUrl : primaryUrl;
      const activeKey = usedFallback ? fallbackKey : primaryKey;
      if (usedFallback) {
        ({ response, rawText } = await doRequest(false, activeUrl, activeKey));
      } else {
        try {
          ({ response, rawText } = await withRetry(() => doRequest(false, primaryUrl, primaryKey)));
        } catch (retryErr) {
          if (retryErr.status === 429 || !fallbackUrl) throw retryErr;
          console.warn(
            `[callGemini] Primary mime-retry threw, falling back to proxy`
          );
          ({ response, rawText } = await doRequest(false, fallbackUrl, fallbackKey));
          usedFallback = true;
        }
      }
    }

    if (!response.ok && !usedFallback && fallbackUrl) {
      console.warn(
        `[callGemini] Primary returned (${response.status}), falling back to proxy`
      );
      ({ response, rawText } = await doRequest(true, fallbackUrl, fallbackKey));
      if (
        !response.ok &&
        sentStructuredOutput &&
        retryStructuredOutputRegex.test(rawText)
      ) {
        ({ response, rawText } = await doRequest(false, fallbackUrl, fallbackKey));
      }
    }

    if (!response.ok) {
      const err = new Error(
        `Gemini request failed: ${response.status} ${response.statusText} - ${rawText}`
      );
      err.status = response.status;
      err.body = rawText;
      throw err;
    }

    const data = JSON.parse(rawText || '{}');

    const parts =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      Array.isArray(data.candidates[0].content.parts)
        ? data.candidates[0].content.parts
        : [];

    const text = parts
      .map((p) => (p && p.text ? String(p.text) : ''))
      .filter(Boolean)
      .join('\n')
      .trim();

    // ── Token telemetry ──────────────────────────────────────────────────────
    // NOTE THE ARGUMENTS: `data.usageMetadata` and nothing else from the
    // response. `finalContents`, `parts`, `text`, `rawText` and `data` itself are
    // all in scope right here and NONE of them is passed. That is the content
    // firewall, and the "no prompt or response content is logged" test asserts it
    // against a payload whose prompt and candidate text are unique sentinels.
    emitTokenTelemetry(
      buildTokenTelemetryRecord({
        usageMetadata: data && data.usageMetadata,
        model,
        callClass: classifyCall(config, telemetryCallerStack),
        latencyMs: Date.now() - telemetryStartedAt,
        attempts: telemetryAttempts,
        usedFallback,
      })
    );

    return { text, raw: data };
  }

  async function* callGeminiStream(model, finalContents, config) {
    if (!GEMINI_API_KEY) {
      throw new Error('No Gemini auth available for streaming.');
    }

    const generationConfig = {
      temperature: config && typeof config.temperature === 'number' ? config.temperature : 0.7,
      maxOutputTokens: config && typeof config.maxOutputTokens === 'number' ? config.maxOutputTokens : 4096,
    };
    // Thinking control (additive, opt-in) — same invariant as callGemini's buildBody:
    // forwarded ONLY when the caller supplies thinkingConfig, so a caller that passes
    // none gets a byte-identical body (temperature + maxOutputTokens, same order).
    if (config && config.thinkingConfig && typeof config.thinkingConfig === 'object') {
      generationConfig.thinkingConfig = config.thinkingConfig;
    }
    const body = {
      contents: finalContents,
      generationConfig,
    };

    const proxyStreamUrl = HAS_REPLIT_PROXY
      ? `${REPLIT_GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
      : null;
    const directStreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;

    const primaryStreamUrl = DIRECT_GEMINI_API_KEY ? directStreamUrl : proxyStreamUrl;
    const primaryStreamKey = DIRECT_GEMINI_API_KEY ? DIRECT_GEMINI_API_KEY : REPLIT_GEMINI_API_KEY;
    const fallbackStreamUrl = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? proxyStreamUrl : null;
    const fallbackStreamKey = DIRECT_GEMINI_API_KEY && HAS_REPLIT_PROXY ? REPLIT_GEMINI_API_KEY : null;

    const doStreamFetch = async (url, key) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
      let response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timeoutId);
        if (err && err.name === 'AbortError') {
          const e = new Error(`Gemini stream timed out after ${GEMINI_TIMEOUT_MS}ms`);
          e.status = 504;
          throw e;
        }
        throw err;
      }
      return { response, controller, timeoutId };
    };

    let primaryResult;
    let usedFallback = false;

    try {
      primaryResult = await withRetry(async () => {
        const result = await doStreamFetch(primaryStreamUrl, primaryStreamKey);
        if (result.response.status === 429) {
          clearTimeout(result.timeoutId);
          const errText = await result.response.text().catch(() => '');
          const err = new Error(`Gemini stream rate limited (429): ${errText}`);
          err.status = 429;
          err.retryAfter = result.response.headers.get('Retry-After');
          throw err;
        }
        return result;
      });
    } catch (primaryErr) {
      if (primaryErr.status === 429 || !fallbackStreamUrl) {
        throw primaryErr;
      }
      console.warn(
        `[callGeminiStream] Primary threw (${primaryErr.status || primaryErr.message}), falling back to proxy`
      );
      primaryResult = await doStreamFetch(fallbackStreamUrl, fallbackStreamKey);
      usedFallback = true;
    }

    let { response, controller, timeoutId } = primaryResult;

    if (!response.ok) {
      clearTimeout(timeoutId);
      const errText = await response.text().catch(() => '');
      if (!usedFallback && fallbackStreamUrl) {
        console.warn(`[callGeminiStream] Primary returned (${response.status}), falling back to proxy`);
        const fallbackResult = await doStreamFetch(fallbackStreamUrl, fallbackStreamKey);
        if (!fallbackResult.response.ok) {
          clearTimeout(fallbackResult.timeoutId);
          const fallbackErrText = await fallbackResult.response.text().catch(() => '');
          const e = new Error(`Gemini stream failed: ${fallbackResult.response.status} - ${fallbackErrText}`);
          e.status = fallbackResult.response.status;
          throw e;
        }
        yield* _drainGeminiSSE(fallbackResult.response.body, fallbackResult.controller, fallbackResult.timeoutId);
        return;
      }
      const e = new Error(`Gemini stream failed: ${response.status} - ${errText}`);
      e.status = response.status;
      throw e;
    }

    yield* _drainGeminiSSE(response.body, controller, timeoutId);
  }

  async function* _drainGeminiSSE(body, controller, timeoutId) {
    const decoder = new TextDecoder();
    const reader = body.getReader();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6).trim();
            if (jsonStr === '[DONE]') return;
            try {
              const parsed = JSON.parse(jsonStr);
              const parts =
                parsed &&
                parsed.candidates &&
                parsed.candidates[0] &&
                parsed.candidates[0].content &&
                Array.isArray(parsed.candidates[0].content.parts)
                  ? parsed.candidates[0].content.parts
                  : [];
              for (const part of parts) {
                if (part && part.text) {
                  yield String(part.text);
                }
              }
            } catch {
              /* skip malformed chunks */
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
      try { reader.releaseLock(); } catch { /* ignore */ }
    }
  }

  // `getTokenTelemetry` is ADDITIVE — existing callers destructure `callGemini`
  // (and `callGeminiStream`) and are unaffected.
  //
  // NOT INSTRUMENTED: `callGeminiStream`. usageMetadata arrives only in the final
  // SSE chunk, so measuring it means changing the drain loop, and the streaming
  // path currently has NO consumer — index.cjs wraps it and nothing calls the
  // wrapper. Instrumenting a dead path was not worth the risk to a live one.
  return { callGemini, callGeminiStream, getTokenTelemetry };
}

module.exports = {
  createGeminiClient,
  // Exported for the token-instrumentation tests, and for any future reader that
  // needs the label vocabulary without re-declaring it.
  CALL_CLASSES,
  UNCLASSIFIED_CALL_CLASS,
  buildTokenTelemetryRecord,
  classifyCall,
};
