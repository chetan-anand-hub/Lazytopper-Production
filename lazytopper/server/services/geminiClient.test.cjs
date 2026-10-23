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
        // METER-AUDIT-1: a NUMBER read from the named usageMetadata key (0 when absent) — no content.
        'cachedContentTokenCount',
        'callClass',
        'candidatesTokenCount',
        'latencyMs',
        'model',
        'promptTokenCount',
        'retry',
        'thoughtsTokenCount',
        'totalTokenCount',
        'usedFallback',
        // TELEMETRY-1. A label from a CLOSED SET (WORKLOAD_CLASSES), reviewed on
        // the same terms as `callClass`: it cannot carry content because an
        // unrecognised value degrades to `unclassified` rather than passing
        // through. `marksBand` is deliberately NOT here — it is OMITTED when
        // unknown, so it is absent from this no-marks call by design (§9.10).
        'workloadClass',
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
// 2026-10-11 HARDEN-1 PR-2: four classes -> three; 'visual' went with /api/generate-diagram +
// /api/generate-visual (D8/D75), the only two endpoints that mapped to it.
test('the call-class vocabulary is exactly the rate limiter\'s three classes', () => {
  assert.deepEqual(CALL_CLASSES.slice().sort(), ['practice', 'tutor', 'vision']);
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
    // MLT-RETIRE-1: '/api/more-like-this' removed — retired (410), no longer a paid endpoint.
    // 2026-10-11 HARDEN-1 PR-2: generate-diagram / generate-visual removed with routes/diagrams.cjs.
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
  // 2026-10-11 HARDEN-1 PR-2: was callClass 'visual' (removed); 'practice' exercises the same path.
  assert.equal(classifyCall({ callClass: 'practice' }, ''), 'practice');
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
    // MLT-RETIRE-1: the handleMoreLikeThis case removed with the handler (routes/moreLikeThis.cjs is a 410 stub).
    // 2026-10-11 HARDEN-1 PR-2: the two routes/diagrams.cjs handler cases removed with the file.
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

/* ── 11 · responseSchema — constrained decoding (PR-C2) ─────────────────────────
   ★★ THE CONTROL THAT MATTERS. A `responseSchema` that is built, passed into
   `callGemini` and then silently dropped by `buildBody` is a SILENT NO-OP — the
   exact failure class that has cost this project a full day before. Asserting that
   a variable exists, or that a genConfig carries a key, proves nothing about what
   Google receives. Every assertion below reads the OUTGOING REQUEST BODY.
   ──────────────────────────────────────────────────────────────────────────── */

const SCHEMA = {
  type: 'OBJECT',
  properties: { annotatedSteps: { type: 'ARRAY', items: { type: 'OBJECT',
    properties: { description: { type: 'STRING' } }, required: ['description'] } } },
  required: ['annotatedSteps'],
};

test('★ CONTROL: responseSchema reaches the OUTGOING REQUEST BODY, not just the config', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      callClass: 'vision',
    });
    assert.equal(f.seen.length, 1);
    const gc = f.seen[0].body.generationConfig;
    assert.deepEqual(gc.responseSchema, SCHEMA,
      'the schema must survive JSON.stringify into the wire body — this is the ' +
      'assertion a silent drop in buildBody cannot pass');
    assert.equal(gc.responseMimeType, 'application/json',
      'a responseSchema without a JSON mime type is a request that cannot succeed');
  } finally {
    f.restore();
  }
});

test('★ byte-identical when UNSET: no responseSchema key at all in the body', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, { temperature: 0.05, maxOutputTokens: 900 });
    const gc = f.seen[0].body.generationConfig;
    // Key-level, not value-level: `responseSchema: undefined` would serialise away
    // but would still be a behaviour change waiting to happen.
    assert.deepEqual(Object.keys(gc), ['temperature', 'maxOutputTokens'],
      'a caller that passes no schema must get the pre-PR-C2 body exactly');
    assert.equal('responseSchema' in gc, false);
  } finally {
    f.restore();
  }
});

test('a non-object responseSchema is IGNORED — it can never reach the wire as junk', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, { responseSchema: 'not-a-schema' });
    assert.equal('responseSchema' in f.seen[0].body.generationConfig, false);
  } finally {
    f.restore();
  }
});

test('★★ a backend that REJECTS responseSchema is recovered from — the retry strips BOTH fields', async () => {
  // Before PR-C2 widened `retryStructuredOutputRegex`, this rejection matched
  // NOTHING: the retry never fired and every grading call would have failed with no
  // recovery, because re-sending the same body re-sends the same rejected field.
  // MUTATION-VERIFIED: narrowing the regex back to /responseMimeType/ makes this
  // test fail on the `f.seen.length === 2` assertion.
  const reject = jsonResponse({ error: 'Unknown name "responseSchema" at generation_config' }, 400);
  const f = stubFetch([reject, jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      callClass: 'vision',
    });
    assert.equal(f.seen.length, 2, 'the rejection must trigger exactly one strip-and-retry');

    const first = f.seen[0].body.generationConfig;
    assert.deepEqual(first.responseSchema, SCHEMA, 'attempt 1 carries the schema');

    const second = f.seen[1].body.generationConfig;
    assert.equal('responseSchema' in second, false, 'the retry must DROP the schema');
    assert.equal('responseMimeType' in second, false,
      'and the mime type with it — the known-good fallback is the exact ' +
      'pre-PR-C2 request, not a half-stripped one');
    assert.deepEqual(Object.keys(second), ['temperature', 'maxOutputTokens'],
      'the retry body is byte-identical to what this call sent before PR-C2 existed');

    assert.ok(out && typeof out.text === 'string', 'and the call SUCCEEDS after the strip');
  } finally {
    f.restore();
  }
});

test('NEGATIVE CONTROL: an unrelated 400 does NOT trigger the strip-and-retry', async () => {
  // The regex must be specific. If any 400 stripped the structured-output fields,
  // a transient error would silently downgrade grading to unconstrained decoding.
  const unrelated = jsonResponse({ error: 'API key not valid' }, 400);
  const f = stubFetch([unrelated, jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await assert.rejects(
      () => client.callGemini('gemini-2.5-flash', CONTENTS, {
        responseMimeType: 'application/json', responseSchema: SCHEMA,
      }),
      /API key not valid/,
    );
    assert.equal(f.seen.length, 1, 'no retry for an error unrelated to structured output');
  } finally {
    f.restore();
  }
});

test('the schema survives a 429 backoff retry unchanged (the ladders do not interfere)', async () => {
  const rateLimited = { ok: false, status: 429, statusText: 'Too Many Requests',
    headers: { get: () => null }, text: async () => 'rate limited' };
  const f = stubFetch([rateLimited, jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, {
      responseMimeType: 'application/json', responseSchema: SCHEMA, callClass: 'vision',
    });
    assert.equal(f.seen.length, 2);
    assert.deepEqual(f.seen[1].body.generationConfig.responseSchema, SCHEMA,
      'a 429 is not a structured-output rejection — the schema must be re-sent intact');
  } finally {
    f.restore();
  }
});

/* ══════════════════════════════════════════════════════════════════════════════
   §9 · TELEMETRY-1 — the WORKLOAD axis.

   The transport axis (`callClass`) answers "which billing bucket". It cannot
   answer "what did the model DO", because `vision` covers grading,
   detect-question and worksheet together — so a grade cannot be told from a
   warm-pool generation, and budgeting the grader off that mixed sample budgets
   the wrong workload. This axis answers the second question WITHOUT disturbing
   the first: §5's rate-limiter join above must stay green throughout.
   ══════════════════════════════════════════════════════════════════════════════ */

const {
  WORKLOAD_CLASSES,
  UNCLASSIFIED_WORKLOAD,
  WORKLOAD_BY_HANDLER,
  classifyWorkload,
  toMarksBand,
} = require('./geminiClient.cjs');

// MUTATION VERIFIED: add any workload label to CALL_CLASSES => §5 goes RED.
test('§9.1 ★★ the two axes are SEPARATE — widening callClass is not how this is done', () => {
  // 2026-10-11 HARDEN-1 PR-2: 'visual' removed from the expected join (see §5).
  assert.deepEqual(CALL_CLASSES.slice().sort(), ['practice', 'tutor', 'vision'],
    'the rate-limiter join is unchanged by this lane');
  for (const w of WORKLOAD_CLASSES) {
    if (['tutor'].includes(w)) continue; // names that legitimately collide (2026-10-11 HARDEN-1 PR-2: 'visual' gone from both lists)
    assert.equal(CALL_CLASSES.includes(w), false,
      `"${w}" must NOT be in CALL_CLASSES — that list is pinned to PAID_ENDPOINTS' values`);
  }
});

// MUTATION VERIFIED: drop `workloadClass` from the emit call site in callGemini
// => this goes RED ("expected 'grade-single' to equal 'unclassified'").
test('§9.2 ★ an explicit workloadClass is recorded on the call', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  const sink = recorder();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: sink });
    await client.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'grade-single', marks: 3 });
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.workloadClass, 'grade-single');
    assert.equal(rec.marksBand, '3');
    assert.equal(sink.valueOf('gemini_workload.call.grade-single'), 1);
  } finally {
    f.restore();
  }
});

test('§9.3 ★ an UNRECOGNISED label degrades to unclassified — it never becomes a new column', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'not-a-real-workload' });
    assert.equal(client.getTokenTelemetry()[0].workloadClass, UNCLASSIFIED_WORKLOAD);
  } finally {
    f.restore();
  }
});

// MUTATION VERIFIED: remove `generateVariants` from WORKLOAD_BY_HANDLER => RED.
test('§9.4 ★ a warm-pool call is classified separately, from its own stack frame', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  const sink = recorder();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: sink });
    // The real chain: runWarmPool -> warmOne -> generateVariants -> callGemini.
    async function generateVariants() {
      return client.callGemini('gemini-2.5-flash', CONTENTS, {});
    }
    async function warmOne() { return generateVariants(); }
    async function runWarmPool() { return warmOne(); }
    await runWarmPool();

    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.workloadClass, 'warm-pool',
      'the 2026-08-05 pre-warm fired 312 combinations and NOTHING counted them');
    assert.equal(sink.valueOf('gemini_workload.call.warm-pool'), 1);
    // CONTROL — it is counted SEPARATELY, not folded into a grading class.
    assert.equal(sink.valueOf('gemini_workload.call.grade-single'), undefined);
  } finally {
    f.restore();
  }
});

// ★ THE DIVERGENCE FROM THE TRANSPORT AXIS, ASSERTED. A model-solution generation
// triggered by the grader is a step-solution WORKLOAD in a vision BUCKET. Both
// answers are correct and they are different answers.
// MUTATION VERIFIED: remove `generateModelSolution` from WORKLOAD_BY_HANDLER =>
// the workload assertion goes RED (reads 'unclassified').
test('§9.5 ★★ the scheme-first generation is NOT charged to the grade that triggered it', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    async function generateModelSolution() {
      return client.callGemini('gemini-2.5-flash', CONTENTS, {});
    }
    async function handleCheckSolution() { return generateModelSolution(); }
    await handleCheckSolution();

    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.workloadClass, 'step-solution',
      'the innermost mapped frame wins — otherwise a generation inflates cost-per-grade');
    assert.equal(rec.callClass, 'vision', 'the BILLING bucket still follows the caller — unchanged');
  } finally {
    f.restore();
  }
});

test('§9.6 ★ CONTROL — an unmapped stack with no explicit tag reads unclassified, never a guess', () => {
  assert.equal(classifyWorkload({}, 'at somethingNobodyMapped (/app/x.cjs:1:1)'), UNCLASSIFIED_WORKLOAD);
  assert.equal(classifyWorkload(null, ''), UNCLASSIFIED_WORKLOAD);
  // CONTROL that the matcher CAN fire on the same input shape.
  assert.equal(classifyWorkload({}, '    at async generateVariants (/app/x.cjs:1:1)'), 'warm-pool');
});

test('§9.7 ★ every value in WORKLOAD_BY_HANDLER is a member of the closed set', () => {
  for (const [handler, klass] of Object.entries(WORKLOAD_BY_HANDLER)) {
    assert.ok(WORKLOAD_CLASSES.includes(klass), `${handler} -> "${klass}" is not a known workload`);
  }
});

/* ── marks bands: ABSENT, never zero ──────────────────────────────────────── */

// MUTATION VERIFIED: `return null` -> `return '0'` in toMarksBand => RED.
test('§9.8 ★★ an unknown marks value yields NO band — absent, not zero', () => {
  assert.equal(toMarksBand(undefined), null);
  assert.equal(toMarksBand(null), null);
  assert.equal(toMarksBand(0), null);
  assert.equal(toMarksBand('not a number'), null);
  // CONTROL — a real value DOES render a band, so the null above is a decision.
  assert.equal(toMarksBand(3), '3');
  assert.equal(toMarksBand(5), '5');
  assert.equal(toMarksBand(9), '6+');
});

// ★ 2 AND 3 GET THEIR OWN BANDS. The product's coarse "1"/"23"/"5"/"4" buckets
// FUSE them (CLAUDE.md §7); a budget banded on a fused bucket is banded on a
// number that describes neither question.
test('§9.9 ★ 2-mark and 3-mark are DISTINCT bands — the coarse buckets fuse them', () => {
  assert.notEqual(toMarksBand(2), toMarksBand(3));
  assert.equal(toMarksBand(2), '2');
});

// MUTATION VERIFIED: emit `marksBand` unconditionally => RED (the key appears).
test('§9.10 ★★ a record with no marks OMITS the key entirely', () => {
  const withMarks = buildTokenTelemetryRecord({ usageMetadata: {}, workloadClass: 'grade-single', marks: 5 });
  assert.equal(withMarks.marksBand, '5');
  assert.equal('marksBand' in withMarks, true, 'CONTROL — the key IS rendered when marks are known');

  const without = buildTokenTelemetryRecord({ usageMetadata: {}, workloadClass: 'detect-question' });
  assert.equal('marksBand' in without, false,
    'a marksBand of 0 would become a band in every downstream aggregate and look like data');
});

/* ── the request is untouched ─────────────────────────────────────────────── */

// ★★ THIS IS THE #578 INVARIANT AT THE GATEWAY. checkSolution.test.cjs §7.1 pins
// sha256(contents); this pins the OTHER half — that the new config keys cannot
// reach the body at all.
// MUTATION VERIFIED: add `body.generationConfig.workloadClass = config.workloadClass`
// to buildBody => RED.
test('§9.11 ★★ workloadClass and marks CANNOT reach the outgoing body', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, {
      workloadClass: 'grade-single',
      marks: 5,
      temperature: 0.05,
      maxOutputTokens: 16000,
    });
    const sent = f.seen[0].body;
    assert.deepEqual(sent.contents, CONTENTS, 'contents is byte-identical — #578 cannot move');
    assert.deepEqual(Object.keys(sent.generationConfig).sort(), ['maxOutputTokens', 'temperature']);
    assert.equal(JSON.stringify(sent).includes('grade-single'), false);
    assert.equal(JSON.stringify(sent).includes('workloadClass'), false);
  } finally {
    f.restore();
  }
});

// ★ THIS LANE IS OBSERVATION, NOT CONTROL.
test('§9.12 ★★ recording a class introduces NO thinkingBudget and no generationConfig field', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'grade-single', marks: 5 });
    const sent = f.seen[0].body;
    assert.equal(sent.generationConfig.thinkingConfig, undefined,
      'NOTHING IS CAPPED IN THIS LANE — SERVER-2 sets a budget FROM this output, later');
  } finally {
    f.restore();
  }
});

// A telemetry failure must NEVER fail a Gemini call — extended to the new sink call.
test('§9.13 a sink whose recordWorkloadSample throws does not fail the call', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({
      ...GEMINI_CFG,
      telemetry: {
        increment: () => {},
        recordWorkloadSample: () => { throw new Error('telemetry backend exploded'); },
      },
    });
    const result = await client.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'tutor' });
    assert.ok(result && typeof result.text === 'string');
  } finally {
    f.restore();
  }
});

test('§9.14 a sink WITHOUT recordWorkloadSample still works (the key is optional)', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: { increment: () => {} } });
    const result = await client.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'tutor' });
    assert.ok(result && typeof result.text === 'string');
  } finally {
    f.restore();
  }
});

/* ── §10 · GRADER-CORE-1 PR-3 (C8): the per-call grading budget ─────────────
   Grading calls pass `timeoutMs` + `deadlineAt`; every other caller passes neither and keeps
   GEMINI_TIMEOUT_MS (D15). The stub honours the AbortSignal like real fetch does. */

function hangingFetch() {
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = (url, opts) => new Promise((_, reject) => {
    seen.push({ url: String(url), body: JSON.parse(String(opts.body)), at: Date.now() });
    if (opts.signal) opts.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
  });
  return { seen, restore: () => { globalThis.fetch = original; } };
}

test('§10.1 ★ a grading call with timeoutMs aborts at ITS budget even when GEMINI_TIMEOUT_MS is 80000 (the Railway stopgap)', async () => {
  const f = hangingFetch();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, GEMINI_TIMEOUT_MS: 80000, telemetry: recorder() });
    const t0 = Date.now();
    await assert.rejects(client.callGemini('gemini-2.5-flash', CONTENTS, { timeoutMs: 60, deadlineAt: Date.now() + 5000 }),
      (e) => e.status === 504 && /timed out after 60ms/.test(e.message));
    assert.ok(Date.now() - t0 < 2000, 'aborted at ~60 ms, not at 80 s');
  } finally {
    f.restore();
  }
});

test('§10.2 the absolute deadline wins over a longer timeoutMs; an attempt with no time left is never sent', async () => {
  const f = hangingFetch();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, GEMINI_TIMEOUT_MS: 80000, telemetry: recorder() });
    const t0 = Date.now();
    await assert.rejects(client.callGemini('gemini-2.5-flash', CONTENTS, { timeoutMs: 45000, deadlineAt: Date.now() + 80 }), (e) => e.status === 504);
    assert.ok(Date.now() - t0 < 2000);
    assert.equal(f.seen.length, 1);
    await assert.rejects(client.callGemini('gemini-2.5-flash', CONTENTS, { timeoutMs: 45000, deadlineAt: Date.now() - 1 }),
      (e) => e.status === 504 && e.gradingDeadline === true);
    assert.equal(f.seen.length, 1, 'past the deadline nothing is sent');
  } finally {
    f.restore();
  }
});

test('§10.3 ★ under a deadline the 429 back-off never sleeps past it (Retry-After capped); without one it is unchanged', async () => {
  const rate = () => ({ ok: false, status: 429, statusText: 'Too Many', headers: { get: (h) => (h === 'Retry-After' ? '30' : null) }, text: async () => '{"error":{"code":429}}' });
  const f = stubFetch([rate]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const t0 = Date.now();
    await assert.rejects(client.callGemini('gemini-2.5-flash', CONTENTS, { timeoutMs: 1000, deadlineAt: Date.now() + 1500 }), (e) => e.status === 429);
    assert.ok(Date.now() - t0 < 1500, 'a 30 s Retry-After is not honoured past a 1.5 s deadline');
    assert.equal(f.seen.length, 1, 'no second attempt that could not finish in time');
  } finally {
    f.restore();
  }
});

test('§10.4 timeoutMs / deadlineAt / chunkKey / attempt never reach the wire; a call without them keeps GEMINI_TIMEOUT_MS', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, { temperature: 0, maxOutputTokens: 32000, timeoutMs: 45000, deadlineAt: Date.now() + 70000, chunkKey: 'q0+q1', attempt: 1 });
    const sent = f.seen[0].body;
    assert.deepEqual(Object.keys(sent.generationConfig).sort(), ['maxOutputTokens', 'temperature']);
    for (const k of ['timeoutMs', 'deadlineAt', 'chunkKey', 'attempt', 'q0+q1']) assert.equal(JSON.stringify(sent).includes(k), false, k);
  } finally {
    f.restore();
  }
  // CONTROL: a non-grading call (no timeoutMs) still aborts at GEMINI_TIMEOUT_MS.
  const h = hangingFetch();
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, GEMINI_TIMEOUT_MS: 70, telemetry: recorder() });
    await assert.rejects(client.callGemini('gemini-2.5-flash', CONTENTS, {}), (e) => e.status === 504 && /after 70ms/.test(e.message));
  } finally {
    h.restore();
  }
});

/* ── TUTOR-FIX-1 · finishReason is returned (additively) ─────────────────── */
// RED before the fix: the returned object was { text, raw } only.
test('TUTOR-FIX-1: callGemini returns the candidate finishReason, null when absent', async () => {
  const cut = okBody(OK_USAGE, 'half a rep');
  cut.candidates[0].finishReason = 'MAX_TOKENS';
  const f = stubFetch([jsonResponse(cut), jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const r1 = await client.callGemini('gemini-2.5-flash', CONTENTS, {});
    assert.equal(r1.finishReason, 'MAX_TOKENS');
    assert.equal(r1.text, 'half a rep');
    const r2 = await client.callGemini('gemini-2.5-flash', CONTENTS, {});
    assert.equal(r2.finishReason, null);
  } finally {
    f.restore();
  }
});

/* ═════════════════════════════════════════════════════════════════════════════
   §11 · UPLOAD-READ-1 PR-A2 — opt-in STREAMING with a read deadline (detect)
   ★ A full board paper's reply can outlast the 55 s whole-call timeout, and a timed-out non-streaming call
     returns NOTHING. With `config.streamDeadlineMs` the reply is read as an SSE stream and, at the deadline,
     whatever arrived is returned (`deadlineHit`), so the detect handler can salvage the complete questions.
     Telemetry and the usage ledger see the stream through the SAME envelope as a normal call.
   ═════════════════════════════════════════════════════════════════════════════ */

function sseResponse(chunks, { holdOpen = false, status = 200, gapMs = 0 } = {}) {
  const enc = new TextEncoder();
  const state = { cancelled: false };
  const stream = new ReadableStream({
    async start(controller) {
      for (const c of chunks) {
        controller.enqueue(enc.encode('data: ' + JSON.stringify(c) + '\n\n'));
        if (gapMs) await new Promise((r) => setTimeout(r, gapMs));
      }
      if (!holdOpen) controller.close();
    },
    cancel() { state.cancelled = true; },
  });
  const res = new Response(stream, { status });
  return { res, state };
}

const sseChunk = (text, extra = {}) => ({ candidates: [{ content: { parts: [{ text }] }, ...(extra.finishReason ? { finishReason: extra.finishReason } : {}) }], ...(extra.usageMetadata ? { usageMetadata: extra.usageMetadata } : {}) });

test('§11.1 ★ a streamed reply is folded into the SAME envelope: text joined in order, usage + finishReason from the stream, the SAME structured-output body, and streamDeadlineMs never on the wire', async () => {
  const { res } = sseResponse([
    sseChunk('{"a":', { usageMetadata: { promptTokenCount: 1234, candidatesTokenCount: 3, totalTokenCount: 1237 } }),
    sseChunk('1}', { finishReason: 'STOP', usageMetadata: OK_USAGE }),
  ]);
  const f = stubFetch([() => res]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const schema = { type: 'OBJECT', properties: { a: { type: 'NUMBER' } } };
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, {
      temperature: 0.1, maxOutputTokens: 16384, responseMimeType: 'application/json', responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }, workloadClass: 'detect-question', streamDeadlineMs: 5000,
    });
    assert.equal(out.text, '{"a":1}');
    assert.equal(out.finishReason, 'STOP');
    assert.equal(out.deadlineHit, undefined, 'no deadline hit: the key is absent');
    assert.equal(f.seen.length, 1);
    assert.match(f.seen[0].url, /:streamGenerateContent\?alt=sse$/);
    const gc = f.seen[0].body.generationConfig;
    assert.equal(gc.responseMimeType, 'application/json', 'JSON mode holds on the stream');
    assert.deepEqual(gc.responseSchema, schema);
    assert.deepEqual(gc.thinkingConfig, { thinkingBudget: 0 });
    assert.equal(gc.maxOutputTokens, 16384);
    assert.equal(JSON.stringify(f.seen[0].body).includes('streamDeadlineMs'), false, 'a hint, never on the wire');
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.totalTokenCount, 2691, 'the LAST chunk usage is the one recorded');
    assert.equal(rec.thoughtsTokenCount, 890);
    assert.equal(rec.workloadClass, 'detect-question');
  } finally {
    f.restore();
  }
});

test('§11.2 ★ METERING PARITY: the same usage through the stream and through a normal call produces the SAME token record', async () => {
  const f1 = stubFetch([jsonResponse(okBody(OK_USAGE, '{"a":1}'))]);
  let plain;
  try {
    const c1 = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await c1.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'detect-question' });
    plain = c1.getTokenTelemetry()[0];
  } finally { f1.restore(); }
  const { res } = sseResponse([sseChunk('{"a":', { usageMetadata: OK_USAGE }), sseChunk('1}', { usageMetadata: OK_USAGE, finishReason: 'STOP' })]);
  const f2 = stubFetch([() => res]);
  try {
    const c2 = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await c2.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'detect-question', streamDeadlineMs: 5000 });
    const streamed = c2.getTokenTelemetry()[0];
    for (const k of ['promptTokenCount', 'candidatesTokenCount', 'thoughtsTokenCount', 'totalTokenCount', 'model', 'callClass', 'workloadClass', 'attempts', 'retry']) {
      assert.equal(streamed[k], plain[k], k + ' differs between a streamed and a normal call');
    }
  } finally { f2.restore(); }
});

test('§11.3 ★ AT THE DEADLINE the read stops, the connection is released, and what arrived comes back with deadlineHit (usage = the last chunk seen)', async () => {
  const { res, state } = sseResponse([
    sseChunk('{"questions":[{"questionNumber":1}', { usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 10, totalTokenCount: 910 } }),
    sseChunk(',{"questionNumber":2}', { usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 22, totalTokenCount: 922 } }),
  ], { holdOpen: true });
  const f = stubFetch([() => res]);
  const origWarn = console.warn; const warned = []; console.warn = (...a) => warned.push(a.join(' '));
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, GEMINI_TIMEOUT_MS: 10000, telemetry: recorder() });
    const t0 = Date.now();
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, { workloadClass: 'detect-question', streamDeadlineMs: 120 });
    assert.ok(Date.now() - t0 < 3000, 'returned at the ~120 ms deadline, not at the 10 s attempt timeout');
    assert.equal(out.deadlineHit, true);
    assert.equal(out.text, '{"questions":[{"questionNumber":1},{"questionNumber":2}');
    assert.equal(out.finishReason, 'STREAM_DEADLINE');
    assert.equal(state.cancelled, true, 'the reader was cancelled: the connection is not left open');
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.candidatesTokenCount, 22, 'usage is the last chunk seen: the call is still metered');
    assert.ok(warned.some((w) => /stream deadline hit after 120ms/.test(w) && /usage present/.test(w)), 'the deadline is visible in the logs');
    assert.ok(!warned.some((w) => w.includes('questionNumber')), 'the log names the fact, never the content');
  } finally { console.warn = origWarn; f.restore(); }
});

test('§11.4 at the deadline with NO text at all: the same 504 a timed-out call gives today (nothing to salvage)', async () => {
  const { res } = sseResponse([], { holdOpen: true });
  const f = stubFetch([() => res]);
  const origWarn = console.warn; console.warn = () => {};
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await assert.rejects(
      client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 80 }),
      (e) => e.status === 504 && /no text/.test(e.message),
    );
  } finally { console.warn = origWarn; f.restore(); }
});

test('§11.5 a deadline with the stream carrying NO usage is visible: the log says ABSENT (the ledger gap is named, not hidden)', async () => {
  const { res } = sseResponse([sseChunk('{"x":')], { holdOpen: true });
  const f = stubFetch([() => res]);
  const origWarn = console.warn; const warned = []; console.warn = (...a) => warned.push(a.join(' '));
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 80 });
    assert.equal(out.deadlineHit, true);
    assert.ok(warned.some((w) => /usage ABSENT/.test(w)));
  } finally { console.warn = origWarn; f.restore(); }
});

test('§11.6 ★ CONTROL: without streamDeadlineMs the request is exactly what it was — the :generateContent URL and a normal body — and the result has no deadlineHit', async () => {
  const f = stubFetch([jsonResponse(okBody())]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, { temperature: 0.1, maxOutputTokens: 400, responseMimeType: 'application/json' });
    assert.match(f.seen[0].url, /:generateContent$/);
    assert.equal(f.seen[0].url.includes('alt=sse'), false);
    assert.equal('deadlineHit' in out, false);
    assert.equal(out.text, '{}');
  } finally { f.restore(); }
});

test('§11.7 a 429 on a streaming call still retries (the ladder is shared, not re-implemented), and the retry is streamed', async () => {
  const rateLimited = {
    ok: false, status: 429, statusText: 'Too Many Requests',
    headers: { get: (h) => (h === 'Retry-After' ? '0' : null) },
    text: async () => 'rate limited',
  };
  const { res } = sseResponse([sseChunk('{"ok":true}', { usageMetadata: OK_USAGE, finishReason: 'STOP' })]);
  const f = stubFetch([rateLimited, () => res]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 5000 });
    assert.equal(out.text, '{"ok":true}');
    assert.equal(f.seen.length, 2);
    assert.ok(f.seen.every((s) => /:streamGenerateContent\?alt=sse$/.test(s.url)));
    assert.equal(client.getTokenTelemetry()[0].attempts, 2);
  } finally { f.restore(); }
});

test('§11.8 a non-OK streaming response keeps the error path: the status and body surface as before', async () => {
  const bad = { ok: false, status: 400, statusText: 'Bad Request', headers: { get: () => null }, text: async () => '{"error":{"message":"bad"}}' };
  const f = stubFetch([bad]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await assert.rejects(client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 5000 }), (e) => e.status === 400);
  } finally { f.restore(); }
});

test('§11.9 the SSE reader: split lines, CRLF-free partial chunks, a malformed chunk and a [DONE] are all handled; toStreamUrl only touches :generateContent URLs', async () => {
  const { toStreamUrl, readGeminiSseUntilDeadline } = require('./geminiClient.cjs');
  assert.equal(toStreamUrl('https://x/v1beta/models/m:generateContent'), 'https://x/v1beta/models/m:streamGenerateContent?alt=sse');
  const enc = new TextEncoder();
  const body = new ReadableStream({
    start(c) {
      const whole = 'data: ' + JSON.stringify(sseChunk('he')) + '\n\n' + ': keep-alive\n' + 'data: {not json}\n\n' + 'data: ' + JSON.stringify(sseChunk('llo', { finishReason: 'STOP' }));
      // split mid-line on purpose, and leave the last event without a trailing newline
      c.enqueue(enc.encode(whole.slice(0, 20))); c.enqueue(enc.encode(whole.slice(20))); c.close();
    },
  });
  const out = await readGeminiSseUntilDeadline(body, 5000);
  assert.equal(out.text, 'hello');
  assert.equal(out.finishReason, 'STOP');
  assert.equal(out.deadlineHit, false);
});

/* ── §11.10-11 · the verifier's MUST-FIX (M1): the read deadline runs on the ATTEMPT clock ─────────────── */

/** A fetch stub with a header delay and an abort-aware body, like real undici: the stream ERRORS with an
 *  AbortError when the request's signal aborts, and the headers (the fetch promise) arrive late. */
function slowHeadersFetch({ headerDelayMs, chunks, onSignal }) {
  const seen = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    seen.push({ url: String(url), at: Date.now() });
    if (onSignal) onSignal(opts.signal);
    await new Promise((r) => setTimeout(r, headerDelayMs));
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(enc.encode('data: ' + JSON.stringify(c) + '\n\n'));
        if (opts.signal) {
          const abort = () => { const e = new Error('aborted'); e.name = 'AbortError'; controller.error(e); };
          if (opts.signal.aborted) abort(); else opts.signal.addEventListener('abort', abort);
        }
      },
    });
    return new Response(stream, { status: 200 });
  };
  return { seen, restore: () => { globalThis.fetch = original; } };
}

test('§11.10 ★ M1: SLOW HEADERS do not push the read deadline past the attempt abort — the deadline is counted from the START of the attempt, and the text that arrived is returned', async () => {
  // attempt timeout 600 ms; stream deadline 300 ms; the headers take 200 ms. Counted from the headers the
  // deadline would be at 500 ms; counted from the attempt start it is at 300 ms, well before the 600 ms abort.
  const f = slowHeadersFetch({ headerDelayMs: 200, chunks: [sseChunk('{"questions":[{"questionNumber":1}', { usageMetadata: OK_USAGE })] });
  const origWarn = console.warn; console.warn = () => {};
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, GEMINI_TIMEOUT_MS: 600, telemetry: recorder() });
    const t0 = Date.now();
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 300 });
    const took = Date.now() - t0;
    assert.equal(out.deadlineHit, true);
    assert.equal(out.text, '{"questions":[{"questionNumber":1}');
    assert.ok(took >= 280 && took < 420, 'returned at the ~300 ms attempt-clock deadline, not at ~500 ms (headers + deadline) — took ' + took + ' ms');
  } finally { console.warn = origWarn; f.restore(); }
});

test('§11.11 ★ M1: if the ATTEMPT abort lands mid-stream after text arrived, the text is RETURNED as a deadline read, not thrown away; with no text it is still the 504 timeout', async () => {
  // deadline (5 s) is LATER than the attempt timeout (150 ms): the abort fires first, mid-stream.
  const withText = slowHeadersFetch({ headerDelayMs: 10, chunks: [sseChunk('{"questions":[{"questionNumber":1}', { usageMetadata: OK_USAGE })] });
  const origWarn = console.warn; console.warn = () => {};
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, GEMINI_TIMEOUT_MS: 150, telemetry: recorder() });
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 5000 });
    assert.equal(out.deadlineHit, true, 'the abort mid-stream with text is a deadline read');
    assert.equal(out.text, '{"questions":[{"questionNumber":1}');
    assert.equal(client.getTokenTelemetry()[0].totalTokenCount, 2691, 'and the call is still metered');
  } finally { withText.restore(); }
  const noText = slowHeadersFetch({ headerDelayMs: 10, chunks: [] });
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, GEMINI_TIMEOUT_MS: 150, telemetry: recorder() });
    await assert.rejects(client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 5000 }), (e) => e.status === 504);
  } finally { console.warn = origWarn; noText.restore(); }
});

/* ── §11.12-14 · D136 (b) no metering zeros; D136 (a) the non-stream path is byte-identical ───────────────── */

test('§11.12 ★ D136(b): a stream that carries NO usageMetadata is metered from a flagged ESTIMATE, never zeros; a stream WITH usage and a normal call are NOT flagged', async () => {
  const PROMPT = [{ role: 'user', parts: [{ text: 'x'.repeat(400) }, { inlineData: { mimeType: 'application/pdf', data: 'QUJD' } }] }];
  const { res } = sseResponse([sseChunk('y'.repeat(200))]); // no usageMetadata anywhere
  const f = stubFetch([() => res]);
  try {
    const sink = recorder();
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: sink });
    const out = await client.callGemini('gemini-2.5-flash', PROMPT, { streamDeadlineMs: 5000, workloadClass: 'detect-question' });
    assert.equal(out.text.length, 200);
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.estimated, true, 'flagged as an estimate');
    assert.equal(rec.promptTokenCount, 100 + 1000, 'prompt text chars / 4 + 1000 per inline PDF/image part');
    assert.equal(rec.candidatesTokenCount, 50, 'received chars / 4');
    assert.equal(rec.thoughtsTokenCount, 0);
    assert.equal(rec.totalTokenCount, 1150);
    assert.ok(rec.promptTokenCount > 0 && rec.candidatesTokenCount > 0, 'never zeros');
    assert.ok(sink.events.some((e) => /^gemini_tokens\.estimated\./.test(e.event)), 'telemetry counts how many calls were estimated');
    // no content in the record
    assert.equal(JSON.stringify(rec).includes('xxxx'), false);
    assert.equal(JSON.stringify(rec).includes('yyyy'), false);
  } finally { f.restore(); }
  // CONTROLS: measured usage on a stream, and a normal call, carry no `estimated` key at all
  const { res: res2 } = sseResponse([sseChunk('{}', { usageMetadata: OK_USAGE, finishReason: 'STOP' })]);
  const f2 = stubFetch([() => res2]);
  try {
    const c2 = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await c2.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 5000 });
    const r2 = c2.getTokenTelemetry()[0];
    assert.equal('estimated' in r2, false);
    assert.equal(r2.totalTokenCount, 2691, 'measured usage is used as is');
  } finally { f2.restore(); }
  const f3 = stubFetch([jsonResponse(okBody())]);
  try {
    const c3 = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await c3.callGemini('gemini-2.5-flash', CONTENTS, {});
    assert.equal('estimated' in c3.getTokenTelemetry()[0], false);
  } finally { f3.restore(); }
});

test('§11.13 ★ D136(a): WITHOUT streamDeadlineMs the outgoing request is BYTE-IDENTICAL — exact URL, exact headers, exact body string — and the result has exactly {text, raw, finishReason}', async () => {
  const original = globalThis.fetch;
  const wire = [];
  globalThis.fetch = async (url, opts) => { wire.push({ url: String(url), method: opts.method, headers: opts.headers, body: opts.body }); return jsonResponse(okBody(OK_USAGE, '{"a":1}')); };
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const schema = { type: 'OBJECT', properties: { a: { type: 'NUMBER' } } };
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, {
      temperature: 0.1, maxOutputTokens: 4096, responseMimeType: 'application/json', responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }, workloadClass: 'detect-question', callClass: 'tutor', marks: 3,
    });
    assert.equal(wire.length, 1);
    assert.equal(wire[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    assert.equal(wire[0].method, 'POST');
    assert.deepEqual(wire[0].headers, { 'Content-Type': 'application/json', 'x-goog-api-key': 'test-key' });
    assert.equal(
      wire[0].body,
      '{"contents":[{"role":"user","parts":[{"text":"hi"}]}],"generationConfig":{"temperature":0.1,"maxOutputTokens":4096,"responseMimeType":"application/json","responseSchema":{"type":"OBJECT","properties":{"a":{"type":"NUMBER"}}},"thinkingConfig":{"thinkingBudget":0}}}',
      'the request body bytes are exactly what they were before PR-A2',
    );
    assert.deepEqual(Object.keys(out).sort(), ['finishReason', 'raw', 'text']);
    assert.equal(out.text, '{"a":1}');
    // and a plain tutor-style call (no structured output, no thinking): the minimal body
    wire.length = 0;
    await client.callGemini('gemini-2.5-flash', CONTENTS, { temperature: 0.6, maxOutputTokens: 900 });
    assert.equal(wire[0].body, '{"contents":[{"role":"user","parts":[{"text":"hi"}]}],"generationConfig":{"temperature":0.6,"maxOutputTokens":900}}');
    assert.match(wire[0].url, /:generateContent$/);
  } finally { globalThis.fetch = original; }
});

test('§11.14 the grading call sites never carry the stream flag: grep the route/grading sources for streamDeadlineMs — only detect and the client may name it', () => {
  const root = path.join(__dirname, '..');
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      if (name === 'node_modules' || name === 'eval') continue;
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.cjs$/.test(name) && !/\.test\.cjs$|\.suite\.cjs$/.test(name) && fs.readFileSync(p, 'utf8').includes('streamDeadlineMs')) hits.push(path.relative(root, p).replace(/\\/g, '/'));
    }
  };
  walk(root);
  assert.deepEqual(hits.sort(), ['routes/checkSolution.cjs', 'services/geminiClient.cjs'], 'streamDeadlineMs appears only in the detect config and the client; grading (grading/core.cjs, handleCheckSolution, gradeStructuredSet, worksheet) never names it');
  const core = fs.readFileSync(path.join(root, 'grading', 'core.cjs'), 'utf8');
  assert.equal(core.includes('streamDeadlineMs'), false);
});

/* ── §11.15-18 · verifier M2 / P1-P3: the estimate is PER FIELD and covers the shapes production really sends ── */

test('§11.15 ★ M2: a stream whose last-seen usage holds ONLY the prompt count (candidates missing) is cut at the deadline — the measured prompt count is KEPT, the output tokens are ESTIMATED (never 0), the record is flagged', async () => {
  const { res } = sseResponse([sseChunk('z'.repeat(400), { usageMetadata: { promptTokenCount: 900, totalTokenCount: 900 } })], { holdOpen: true });
  const f = stubFetch([() => res]);
  const origWarn = console.warn; console.warn = () => {};
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    const out = await client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 80, workloadClass: 'detect-question' });
    assert.equal(out.deadlineHit, true);
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.promptTokenCount, 900, 'a measured count is never overwritten');
    assert.equal(rec.candidatesTokenCount, 100, 'received chars / 4, not 0');
    assert.equal(rec.totalTokenCount, 1000, 'total recomputed from the parts');
    assert.equal(rec.estimated, true);
  } finally { console.warn = origWarn; f.restore(); }
});

test('§11.16 P1: the PDF/image part production really sends is `inline_data` (mentorImageSupport.buildGeminiImagePart) — the estimate counts it, and also the camelCase form', async () => {
  const { estimateStreamUsage } = require('./geminiClient.cjs');
  const snake = [{ role: 'user', parts: [{ text: 'a'.repeat(40) }, { inline_data: { mime_type: 'application/pdf', data: 'QUJD' } }] }];
  const camel = [{ role: 'user', parts: [{ text: 'a'.repeat(40) }, { inlineData: { mimeType: 'application/pdf', data: 'QUJD' } }] }];
  assert.equal(estimateStreamUsage(snake, '').promptTokenCount, 10 + 1000);
  assert.equal(estimateStreamUsage(camel, '').promptTokenCount, 10 + 1000);
  // and end to end, through the real production part builder
  const { buildGeminiImagePart } = require('../mentorImageSupport.cjs');
  const part = buildGeminiImagePart({ mimeType: 'application/pdf', base64: 'QUJD' });
  const { res } = sseResponse([sseChunk('y'.repeat(40))]);
  const f = stubFetch([() => res]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', [{ role: 'user', parts: [{ text: 'a'.repeat(40) }, part] }], { streamDeadlineMs: 5000 });
    assert.equal(client.getTokenTelemetry()[0].promptTokenCount, 10 + 1000, 'the real part shape is counted');
  } finally { f.restore(); }
});

test('§11.17 P2: a NORMAL (non-streaming) call whose reply carries no usage is NOT estimated — it keeps its zeros and has no `estimated` key (the estimate is for streams only)', async () => {
  const f = stubFetch([jsonResponse({ candidates: [{ content: { parts: [{ text: '{}' }] } }] })]);
  try {
    const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
    await client.callGemini('gemini-2.5-flash', CONTENTS, {});
    const rec = client.getTokenTelemetry()[0];
    assert.equal(rec.totalTokenCount, 0);
    assert.equal(rec.promptTokenCount, 0);
    assert.equal('estimated' in rec, false);
  } finally { f.restore(); }
});

test('§11.18 P3: a stream whose usageMetadata is present but EMPTY or all zeros is treated as missing: estimated, not zeros', async () => {
  for (const usage of [{}, { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 }]) {
    const { res } = sseResponse([sseChunk('q'.repeat(80), { usageMetadata: usage })]);
    const f = stubFetch([() => res]);
    try {
      const client = createGeminiClient({ ...GEMINI_CFG, telemetry: recorder() });
      await client.callGemini('gemini-2.5-flash', CONTENTS, { streamDeadlineMs: 5000 });
      const rec = client.getTokenTelemetry()[0];
      assert.equal(rec.estimated, true);
      assert.equal(rec.candidatesTokenCount, 20);
      assert.ok(rec.promptTokenCount > 0 && rec.totalTokenCount > 0);
    } finally { f.restore(); }
  }
});
