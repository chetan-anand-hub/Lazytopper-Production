/**
 * geminiClient.test.cjs — token-instrumentation guards for the Gemini gateway.
 *
 * Run: `node --test server/services/geminiClient.test.cjs`
 * (also wired into `npm run test:matrix:all` as `test:server:token-instrumentation`).
 *
 * WHY `node --test` AND NOT VITEST: `vitest.config.ts` sets
 * `include: ["src/**\/*.test.{ts,tsx}"]`, so a `.cjs` file under `server/` is never
 * collected by `vitest run`. A test nothing executes is not a test.
 *
 * EVERY TEST BELOW WAS MUTATION-VERIFIED — the source was broken deliberately, the
 * suite was run, the failure was read, and the source was restored. The specific
 * mutation each test is written against is named in a comment above it.
 *
 * No network: `globalThis.fetch` is stubbed per test.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createGeminiClient,
  CALL_CLASSES,
  UNCLASSIFIED_CALL_CLASS,
  buildTokenTelemetryRecord,
  classifyCall,
} = require('./geminiClient.cjs');

/* ── Harness ─────────────────────────────────────────────────────────────── */

// Direct-key config: no proxy branch, no fallback URL.
const GEMINI_CFG = {
  GEMINI_API_KEY: 'test-key',
  HAS_REPLIT_PROXY: false,
  REPLIT_GEMINI_BASE_URL: '',
  REPLIT_GEMINI_API_KEY: '',
  DIRECT_GEMINI_API_KEY: 'test-key',
  GEMINI_TUTOR_MODEL: 'test-model',
  GEMINI_TIMEOUT_MS: 10000,
};

// A telemetry sink shaped exactly like server/telemetry.cjs's `increment`.
function recorder() {
  const events = [];
  return {
    events,
    increment: (event, value = 1) => {
      events.push({ event, value });
    },
    valueOf: (event) => {
      const hit = events.filter((e) => e.event === event);
      return hit.length ? hit[hit.length - 1].value : undefined;
    },
  };
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'ERR',
    headers: { get: () => null },
    text: async () => JSON.stringify(payload),
  };
}

// Queue of responses; each fetch shifts one. A function entry is invoked so a
// test can assert on the outgoing request.
function stubFetch(queue) {
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    seen.push({ url: String(url), body: JSON.parse(String(opts.body)) });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    return typeof next === 'function' ? next() : next;
  };
  return {
    seen,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

const OK_USAGE = {
  promptTokenCount: 1234,
  candidatesTokenCount: 567,
  thoughtsTokenCount: 890,
  totalTokenCount: 2691,
};

function okBody(usage = OK_USAGE, candidateText = '{}') {
  return {
    candidates: [{ content: { parts: [{ text: candidateText }] } }],
    usageMetadata: usage,
  };
}

const CONTENTS = [{ role: 'user', parts: [{ text: 'hi' }] }];

/* ── 1 · A successful call emits a full record ───────────────────────────── */
// MUTATION VERIFIED: delete the `thoughtsTokenCount:` line from
// buildTokenTelemetryRecord in geminiClient.cjs => this test goes RED
// ("Expected values to be strictly equal: undefined !== 890" plus the
// gemini_tokens.thoughts.* counter assertion).
test('a successful call emits a telemetry record with every token + metadata field', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  const sink = recorder();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: sink });
    const result = await client.callGemini('gemini-2.5-flash', CONTENTS, {
      temperature: 0.1,
      maxOutputTokens: 400,
      callClass: 'tutor',
    });

    // Request behaviour is untouched: the caller still gets { text, raw }.
    assert.equal(result.text, '{}');
    assert.equal(result.raw.usageMetadata.totalTokenCount, 2691);

    const records = client.getTokenTelemetry();
    assert.equal(records.length, 1, 'exactly one record per call');
    const rec = records[0];

    // The four token counts, thoughts included.
    assert.equal(rec.promptTokenCount, 1234);
    assert.equal(rec.candidatesTokenCount, 567);
    assert.equal(rec.thoughtsTokenCount, 890, 'thinking bills at OUTPUT rates');
    assert.equal(rec.totalTokenCount, 2691);

    // Metadata.
    assert.equal(rec.model, 'gemini-2.5-flash');
    assert.equal(rec.callClass, 'tutor');
    assert.equal(typeof rec.latencyMs, 'number');
    assert.ok(rec.latencyMs >= 0);
    assert.equal(rec.retry, false, 'a single-attempt call is not a retry');
    assert.equal(rec.attempts, 1);
    assert.equal(rec.usedFallback, false);

    // Every field is a number, a bounded label, or the model name — nothing else.
    assert.deepEqual(
      Object.keys(rec).sort(),
      [
        'attempts',
        'callClass',
        'candidatesTokenCount',
        'latencyMs',
        'model',
        'promptTokenCount',
        'retry',
        'thoughtsTokenCount',
        'totalTokenCount',
        'usedFallback',
      ],
      'record shape is frozen — a new field must be reviewed for content leakage'
    );

    // The same numbers reached the shared telemetry counters, keyed on class.
    assert.equal(sink.valueOf('gemini_tokens.call.tutor'), 1);
    assert.equal(sink.valueOf('gemini_tokens.prompt.tutor'), 1234);
    assert.equal(sink.valueOf('gemini_tokens.candidates.tutor'), 567);
    assert.equal(sink.valueOf('gemini_tokens.thoughts.tutor'), 890);
    assert.equal(sink.valueOf('gemini_tokens.total.tutor'), 2691);
    assert.equal(typeof sink.valueOf('gemini_tokens.latency_ms.tutor'), 'number');
    assert.equal(sink.valueOf('gemini_tokens.model.gemini-2.5-flash'), 1);

    // The request body is unchanged: callClass is a telemetry hint, never wire data.
    assert.equal('callClass' in f.seen[0].body.generationConfig, false);
    assert.deepEqual(f.seen[0].body.generationConfig, {
      temperature: 0.1,
      maxOutputTokens: 400,
    });
  } finally {
    f.restore();
  }
});

/* ── 2 · A telemetry failure must never fail the Gemini call ─────────────── */
// MUTATION VERIFIED: remove the try/catch wrapping emitTokenTelemetry's body in
// geminiClient.cjs (let the throw propagate) => this test goes RED with the
// injected "telemetry backend exploded" error escaping callGemini.
test('a throwing telemetry sink does NOT fail the Gemini call', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const exploding = {
      increment: () => {
        throw new Error('telemetry backend exploded');
      },
    };
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: exploding });
    const result = await client.callGemini('gemini-2.5-flash', CONTENTS, {});
    assert.equal(result.text, '{}', 'the call still returns its answer');
    assert.equal(result.raw.usageMetadata.promptTokenCount, 1234);
  } finally {
    f.restore();
  }
});

// A sink that is not even the right SHAPE must also be survivable.
test('a malformed telemetry sink does NOT fail the Gemini call', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: { increment: 'not a function' } });
    const result = await client.callGemini('gemini-2.5-flash', CONTENTS, {});
    assert.equal(result.text, '{}');
  } finally {
    f.restore();
  }
});

/* ── 3 · No prompt or response content in ANY logged field ──────────────── */
// MUTATION VERIFIED: add `promptPreview: JSON.stringify(input.contents)` to
// buildTokenTelemetryRecord (and pass `contents: finalContents` at the call site)
// => this test goes RED on the record-shape assertion AND on the sentinel scan.
test('no prompt or response content appears in any logged field', async () => {
  const PROMPT_SENTINEL = 'SENTINEL_PROMPT_a_students_private_answer_9f2b';
  const RESPONSE_SENTINEL = 'SENTINEL_RESPONSE_the_model_reply_4c7d';
  const USAGE_SENTINEL = 'SENTINEL_USAGE_a_field_google_adds_later_e11a';

  const body = okBody(
    {
      ...OK_USAGE,
      // A hostile usageMetadata: extra keys, one of them carrying text. A record
      // built by spreading usageMetadata would leak this.
      promptTokensDetails: [{ modality: 'TEXT', tokenCount: 1234 }],
      leakedPromptEcho: USAGE_SENTINEL,
    },
    RESPONSE_SENTINEL
  );
  const f = stubFetch([jsonResponse(body)]);
  const sink = recorder();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: sink });
    const result = await client.callGemini(
      'gemini-2.5-flash',
      [{ role: 'user', parts: [{ text: PROMPT_SENTINEL }] }],
      { callClass: 'vision' }
    );

    // Control: the sentinels really WERE in the prompt and the response, so a
    // green result means the firewall held, not that the payload was empty.
    assert.equal(f.seen[0].body.contents[0].parts[0].text, PROMPT_SENTINEL);
    assert.equal(result.text, RESPONSE_SENTINEL);

    // Everything this change can log: the counter events and the ring records.
    const logged = JSON.stringify({
      events: sink.events,
      records: client.getTokenTelemetry(),
    });
    for (const sentinel of [PROMPT_SENTINEL, RESPONSE_SENTINEL, USAGE_SENTINEL]) {
      assert.equal(logged.includes(sentinel), false, `leaked: ${sentinel}`);
    }

    // And the un-named usageMetadata keys were not copied at all.
    const rec = client.getTokenTelemetry()[0];
    assert.equal('promptTokensDetails' in rec, false);
    assert.equal('leakedPromptEcho' in rec, false);
    // The named counts still came through, so the firewall is not just "log nothing".
    assert.equal(rec.promptTokenCount, 1234);
    assert.equal(rec.thoughtsTokenCount, 890);
  } finally {
    f.restore();
  }
});

// The record builder is never even HANDED the content, which is the structural
// half of the guarantee: it takes usageMetadata, not the response.
test('buildTokenTelemetryRecord ignores anything outside its explicit allowlist', () => {
  const rec = buildTokenTelemetryRecord({
    usageMetadata: { promptTokenCount: 5, sneaky: 'LEAK_ME' },
    model: 'gemini-2.5-flash',
    callClass: 'practice',
    latencyMs: 42,
    attempts: 1,
    contents: [{ parts: [{ text: 'LEAK_ME_TOO' }] }],
    text: 'LEAK_ME_THREE',
  });
  const serialised = JSON.stringify(rec);
  assert.equal(serialised.includes('LEAK_ME'), false);
  assert.equal(rec.promptTokenCount, 5);
  assert.equal(rec.candidatesTokenCount, 0, 'a missing count is 0, never undefined');
  assert.equal(rec.thoughtsTokenCount, 0);
});

// Defence in depth on the one free-text field a record carries.
test('the model label is clamped, so it cannot become a content channel', () => {
  const rec = buildTokenTelemetryRecord({
    usageMetadata: {},
    model: 'A student wrote: my answer is 42! <script>',
    callClass: 'tutor',
  });
  assert.equal(rec.model.includes(' '), false);
  assert.equal(rec.model.includes('<'), false);
  assert.equal(rec.model.includes('!'), false);
  assert.ok(rec.model.length <= 64);
  // A real model id survives untouched.
  assert.equal(
    buildTokenTelemetryRecord({ model: 'gemini-2.5-flash', callClass: 'tutor' }).model,
    'gemini-2.5-flash'
  );
  // A 500-char blob cannot inflate a counter key.
  assert.ok(
    buildTokenTelemetryRecord({ model: 'x'.repeat(500), callClass: 'tutor' }).model.length <= 64
  );
});

/* ── 4 · Retries are labelled as retries ─────────────────────────────────── */
// MUTATION VERIFIED: move `telemetryAttempts += 1` out of doRequest (or pin
// `attempts: 1` at the emit call site) => this test goes RED
// ("Expected values to be strictly equal: false !== true" on rec.retry).
test('a retried call is labelled as a retry (429 backoff)', async () => {
  const rateLimited = {
    ok: false,
    status: 429,
    statusText: 'Too Many Requests',
    // Retry-After: 0 so withRetry's backoff does not actually sleep.
    headers: { get: (h) => (h === 'Retry-After' ? '0' : null) },
    text: async () => 'rate limited',
  };
  const f = stubFetch([rateLimited, jsonResponse(okBody())]);
  const sink = recorder();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: sink });
    await client.callGemini('gemini-2.5-flash', CONTENTS, { callClass: 'practice' });

    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.attempts, 2, 'two HTTP requests were issued');
    assert.equal(rec.retry, true);
    assert.equal(sink.valueOf('gemini_tokens.retry.practice'), 1);
    // Still exactly one record: a retry is one logical call, not two.
    assert.equal(client.getTokenTelemetry().length, 1);
  } finally {
    f.restore();
  }
});

test('a responseMimeType retry is also labelled as a retry', async () => {
  const mimeReject = jsonResponse({ error: 'Unknown name responseMimeType' }, 400);
  const f = stubFetch([mimeReject, jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, {
      responseMimeType: 'application/json',
      callClass: 'vision',
    });
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.retry, true);
    assert.equal(rec.attempts, 2);
  } finally {
    f.restore();
  }
});

/* ── 5 · Call-class labels join to the rate limiter ──────────────────────── */
test('the call-class vocabulary is exactly the rate limiter\'s four classes', () => {
  assert.deepEqual(CALL_CLASSES.slice().sort(), ['practice', 'tutor', 'vision', 'visual']);
  assert.equal(UNCLASSIFIED_CALL_CLASS, 'unclassified');
  assert.equal(
    CALL_CLASSES.includes(UNCLASSIFIED_CALL_CLASS),
    false,
    'unclassified is a fallback, not a rate-limiter class'
  );
});

// ★ CROSS-LANE JOIN GUARD — the two datasets are only joinable if they agree
// ENDPOINT BY ENDPOINT, not merely on the set of label strings. Comparing only
// the vocabularies would have stayed green through the exact defect this suite
// caught: detect-question moving from vision to practice leaves the SET
// {vision,tutor,practice,visual} unchanged.
//
// rateLimiter.cjs is on trunk, so its absence is now a real failure, not a
// legitimate skip — an absent check is a check you do not have.
test('every paid endpoint maps to the same class in BOTH modules', () => {
  const rlPath = path.join(__dirname, 'rateLimiter.cjs');
  assert.equal(fs.existsSync(rlPath), true, 'rateLimiter.cjs must exist — it is on trunk');
  const { PAID_ENDPOINTS } = require('./rateLimiter.cjs');

  // The route -> handler wiring, read off index.cjs's dispatch block. This is the
  // bridge between the rate limiter's path keys and this gateway's handler names.
  const HANDLER_FOR_ENDPOINT = {
    '/api/check-solution': 'handleCheckSolution',
    '/api/detect-question': 'handleDetectQuestion',
    '/api/grade-worksheet': 'handleGradeWorksheet',
    '/api/tutor': 'handleTutorRequest',
    '/api/step-solution': 'handleStepSolution',
    '/api/more-like-this': 'handleMoreLikeThis',
    '/api/generate-diagram': 'handleGenerateDiagram',
    '/api/generate-visual': 'handleGenerateVisual',
  };

  // Every paid endpoint must be covered — a new one added by a future lane fails
  // here rather than silently logging as `unclassified`.
  assert.deepEqual(
    Object.keys(PAID_ENDPOINTS).sort(),
    Object.keys(HANDLER_FOR_ENDPOINT).sort(),
    'a paid endpoint exists that this gateway cannot classify'
  );

  for (const [endpoint, rlClass] of Object.entries(PAID_ENDPOINTS)) {
    const handler = HANDLER_FOR_ENDPOINT[endpoint];
    const stack = `    at async ${handler} (/app/lazytopper/server/routes/x.cjs:1:1)`;
    assert.equal(
      classifyCall({}, stack),
      rlClass,
      `${endpoint}: rateLimiter says "${rlClass}" — token telemetry must agree`
    );
  }

  // And the vocabularies themselves still match.
  assert.deepEqual(
    [...new Set(Object.values(PAID_ENDPOINTS))].sort(),
    CALL_CLASSES.slice().sort()
  );
});

/* ── 6 · Classification ──────────────────────────────────────────────────── */
test('classifyCall prefers an explicit config.callClass', () => {
  assert.equal(classifyCall({ callClass: 'visual' }, ''), 'visual');
  assert.equal(classifyCall({ callClass: '  tutor  ' }, ''), 'tutor');
});

test('classifyCall rejects an invented class rather than passing it through', () => {
  assert.equal(classifyCall({ callClass: 'worksheet' }, ''), UNCLASSIFIED_CALL_CLASS);
  assert.equal(classifyCall({ callClass: 42 }, ''), UNCLASSIFIED_CALL_CLASS);
});

test('classifyCall falls back to the nearest route handler on the stack', () => {
  const stack = [
    'Error',
    '    at callGemini (C:\\repo\\lazytopper\\server\\services\\geminiClient.cjs:120:5)',
    '    at callGemini (C:\\repo\\lazytopper\\server\\index.cjs:169:32)',
    '    at async handleCheckSolution (C:\\repo\\lazytopper\\server\\routes\\checkSolution.cjs:311:19)',
  ].join('\n');
  // Note the index.cjs wrapper frame in between: the scan must walk PAST it.
  assert.equal(classifyCall({}, stack), 'vision');

  const cases = [
    ['handleStepSolution', 'routes/stepSolution.cjs:514:9', 'practice'],
    ['handleMoreLikeThis', 'routes/moreLikeThis.cjs:80:9', 'practice'],
    ['handleGenerateDiagram', 'routes/diagrams.cjs:104:9', 'visual'],
    ['handleGenerateVisual', 'routes/diagrams.cjs:236:9', 'visual'],
    ['handleTutorRequest', 'routes/tutor.cjs:188:9', 'tutor'],
    ['handleGradeWorksheet', 'routes/checkSolution.cjs:1053:9', 'vision'],
  ];
  for (const [fn, loc, expected] of cases) {
    assert.equal(
      classifyCall({}, `    at async ${fn} (/app/lazytopper/server/${loc})`),
      expected,
      fn
    );
  }
});

// ★ THE REGRESSION THIS MAP EXISTS FOR. handleCheckSolution and
// handleDetectQuestion live in the SAME FILE (routes/checkSolution.cjs) and are
// DIFFERENT billing classes on trunk. A file-level map — the first draft of this
// code — reported both as `vision`, which would have inflated measured
// cost-per-vision-call and deflated cost-per-practice-call: an error in exactly
// the number this instrumentation was built to produce.
// MUTATION VERIFIED: set handleDetectQuestion to 'vision' in CALL_CLASS_BY_HANDLER
// => RED ("detect-question is NOT vision ... 'vision' !== 'practice'").
test('two handlers in ONE file get their two DIFFERENT classes', () => {
  const file = '/app/lazytopper/server/routes/checkSolution.cjs';
  assert.equal(classifyCall({}, `    at async handleCheckSolution (${file}:311:19)`), 'vision');
  assert.equal(
    classifyCall({}, `    at async handleDetectQuestion (${file}:585:19)`),
    'practice',
    'detect-question is NOT vision — rateLimiter.cjs bills it as practice'
  );
});

// The multi-class shared helpers must NOT be mapped: the scan has to walk past
// them to whichever route handler actually owns the request.
// MUTATION VERIFIED: add `generateModelSolution: 'practice'` to
// CALL_CLASS_BY_HANDLER => RED (the vision case returns 'practice').
test('a multi-class shared helper does not capture the class from its caller', () => {
  const helper =
    '    at async generateModelSolution (/app/lazytopper/server/routes/stepSolution.cjs:326:17)';
  const viaStepSolution = [
    helper,
    '    at async getOrCreateModelSolution (/app/lazytopper/server/routes/stepSolution.cjs:469:15)',
    '    at async handleStepSolution (/app/lazytopper/server/routes/stepSolution.cjs:572:19)',
  ].join('\n');
  const viaGrader = [
    helper,
    '    at async getOrCreateModelSolution (/app/lazytopper/server/routes/stepSolution.cjs:469:15)',
    '    at async handleCheckSolution (/app/lazytopper/server/routes/checkSolution.cjs:311:19)',
  ].join('\n');
  // Same helper frame, two callers, two classes.
  assert.equal(classifyCall({}, viaStepSolution), 'practice');
  assert.equal(classifyCall({}, viaGrader), 'vision');
});

// A longer identifier that merely CONTAINS a handler name must not match it.
test('classifyCall matches handler names on a word boundary', () => {
  assert.equal(
    classifyCall({}, '    at async handleTutorRequestLogger (/app/x.cjs:1:1)'),
    UNCLASSIFIED_CALL_CLASS
  );
  assert.equal(
    classifyCall({}, '    at async wrappedhandleStepSolution (/app/x.cjs:1:1)'),
    UNCLASSIFIED_CALL_CLASS
  );
});

test('an unrecognised caller is labelled unclassified, never guessed', () => {
  assert.equal(
    classifyCall({}, '    at refillPool (/app/lazytopper/server/services/warmQuestionPool.cjs:289:9)'),
    UNCLASSIFIED_CALL_CLASS
  );
  assert.equal(classifyCall(undefined, undefined), UNCLASSIFIED_CALL_CLASS);
});

/* ── 6b · The instrument itself: a REAL stack, not a synthetic string ────── */
// Everything above feeds classifyCall a hand-written stack, which proves the
// PARSER and nothing about whether a real call site actually produces such a
// stack. The live chain is several `await`s deep and Node's default
// Error.stackTraceLimit is 10, so this drives a real client through a real async
// chain named like the deepest production path and asserts the label.
// MUTATION VERIFIED: remove the Error.stackTraceLimit raise in captureCallerStack
// => RED (the handler frame falls off the end; label becomes 'unclassified').
test('a REAL async call stack resolves to the right class through the deep chain', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });

    // Names, nesting AND CALL SHAPE mirror routes/stepSolution.cjs exactly:
    // `const x = await f(); return x;`. The shape matters — see the tail-call
    // test below.
    function indexWrapper(model, contents, cfg) {
      // index.cjs:168 is a SYNCHRONOUS wrapper that returns the promise.
      return client.callGemini(model, contents, cfg);
    }
    async function generateModelSolution() {
      await null;
      // No callClass passed: classification MUST come off the stack.
      const reply = await indexWrapper('gemini-2.5-flash', CONTENTS, {});
      return reply;
    }
    async function getOrCreateModelSolution() {
      await null;
      const gen = await generateModelSolution();
      return gen;
    }
    // Padding sits BETWEEN the handler and the call, which is the only place it
    // makes Error.stackTraceLimit load-bearing: truncation drops the OUTERMOST
    // frames, so padding outside the handler would leave it comfortably in view
    // and the mutation "remove the limit raise" would survive. Measured: with the
    // default limit of 10 this chain loses the handler frame; at 40 it keeps it.
    async function pad(n) {
      await null;
      const r = n > 0 ? await pad(n - 1) : await getOrCreateModelSolution();
      return r;
    }
    async function handleStepSolution() {
      await null;
      const gen = await pad(12);
      return gen;
    }
    await handleStepSolution();

    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.callClass, 'practice', 'the real stack must classify, not fall back');
  } finally {
    f.restore();
  }
});

// ★ A REAL LIMIT OF THE STACK FALLBACK, pinned so it is a known property rather
// than a surprise. Node stitches async frames across `await`, but a bare
// tail-call (`return f()` with no await) leaves NO frame to stitch, so an
// intermediate helper written that way hides its callers. The result is
// `unclassified` — the honest failure, never a wrong class — but it does cost a
// row. If a future refactor turns an awaited call into a tail-call, this test
// documents why the class quietly went missing; the cure is to pass
// `config.callClass` explicitly from the route.
test('a bare tail-call chain degrades to unclassified, never to a WRONG class', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    async function generateModelSolution() {
      await null;
      return client.callGemini('gemini-2.5-flash', CONTENTS, {}); // no await
    }
    async function handleStepSolution() {
      await null;
      return generateModelSolution(); // no await -> no frame to stitch
    }
    await handleStepSolution();
    assert.equal(client.getTokenTelemetry()[0].callClass, UNCLASSIFIED_CALL_CLASS);
  } finally {
    f.restore();
  }
});

/* ── 7 · Production wiring: the default sink is the real telemetry module ── */
test('with no injected sink the gateway reaches server/telemetry.cjs', async () => {
  const telemetry = require('../telemetry.cjs');
  const before = telemetry.snapshot()['gemini_tokens.call.tutor'] || 0;
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient(GEMINI_CFG); // no cfg.telemetry
    await client.callGemini('gemini-2.5-flash', CONTENTS, { callClass: 'tutor' });
    const after = telemetry.snapshot();
    assert.equal(after['gemini_tokens.call.tutor'], before + 1);
    assert.equal(after['gemini_tokens.thoughts.tutor'] >= 890, true);
  } finally {
    f.restore();
  }
});

/* ── 8 · A response with no usageMetadata degrades honestly ──────────────── */
test('a response without usageMetadata records zeros, not undefined or invented numbers', async () => {
  const f = stubFetch([jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] })]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const result = await client.callGemini('gemini-2.5-flash', CONTENTS, { callClass: 'tutor' });
    assert.equal(result.text, 'ok');
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.promptTokenCount, 0);
    assert.equal(rec.candidatesTokenCount, 0);
    assert.equal(rec.thoughtsTokenCount, 0);
    assert.equal(rec.totalTokenCount, 0);
  } finally {
    f.restore();
  }
});

/* ── 9 · A failed call emits nothing (no fabricated record) ──────────────── */
test('a call that throws emits no telemetry record', async () => {
  const f = stubFetch([jsonResponse({ error: 'boom' }, 500)]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await assert.rejects(() => client.callGemini('gemini-2.5-flash', CONTENTS, {}));
    assert.equal(client.getTokenTelemetry().length, 0, 'no usageMetadata means no record');
  } finally {
    f.restore();
  }
});

/* ── 10 · The ring is bounded ────────────────────────────────────────────── */
test('the record ring is bounded at 200 and keeps the most recent calls', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    for (let i = 0; i < 205; i++) {
      await client.callGemini('gemini-2.5-flash', CONTENTS, { callClass: 'tutor' });
    }
    assert.equal(client.getTokenTelemetry().length, 200);
  } finally {
    f.restore();
  }
});
