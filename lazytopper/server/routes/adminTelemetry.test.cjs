/**
 * adminTelemetry.test.cjs — guards for the token/rate-limit telemetry READ path.
 *
 * Run: node --test lazytopper/server/routes/adminTelemetry.test.cjs
 * Wired into `lazytopper` test:matrix:all, which CI gates on every PR. A test
 * that nothing executes is not a gate.
 *
 * Every check below was mutation-verified: the mutation named in the report was
 * applied to adminTelemetry.cjs, the suite was confirmed RED, and it was reverted.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createAdminTelemetryRoutes,
  REPORTED_CALL_CLASSES,
  RATE_LIMIT_CLASSES,
} = require("./adminTelemetry.cjs");
const { CALL_CLASSES, UNCLASSIFIED_CALL_CLASS } = require("../services/geminiClient.cjs");
const { PAID_ENDPOINTS, ANONYMOUS_CLASS, GLOBAL_CLASS } = require("../services/rateLimiter.cjs");

/* ── fixtures ─────────────────────────────────────────────────────────────── */

const ADMIN_UID = "admin-uid-1";

function fakeTelemetry(counters) {
  return { snapshot: () => ({ ...counters }), increment: () => {} };
}

/** A firebase-admin stand-in whose verifyIdToken maps a token string to a uid. */
function fakeFirebaseAdmin(tokenToUid) {
  return {
    auth: () => ({
      verifyIdToken: async (token) => {
        if (!Object.prototype.hasOwnProperty.call(tokenToUid, token)) {
          throw new Error("invalid token");
        }
        return { uid: tokenToUid[token] };
      },
    }),
  };
}

function capture() {
  const sent = [];
  return {
    sent,
    sendJson: (_res, status, body) => {
      sent.push({ status, body });
      return undefined;
    },
    last: () => sent[sent.length - 1],
  };
}

function routes(overrides = {}) {
  const cap = capture();
  const r = createAdminTelemetryRoutes({
    sendJson: cap.sendJson,
    firebaseAdmin:
      "firebaseAdmin" in overrides
        ? overrides.firebaseAdmin
        : fakeFirebaseAdmin({ "good-token": ADMIN_UID, "other-token": "someone-else" }),
    telemetry: overrides.telemetry || fakeTelemetry({}),
    getTokenTelemetry: overrides.getTokenTelemetry || (() => []),
  });
  return { r, cap };
}

function reqWith(headers = {}) {
  return { headers };
}

function withAdminUids(value, fn) {
  const prev = process.env.ADMIN_FIREBASE_UIDS;
  if (value === undefined) delete process.env.ADMIN_FIREBASE_UIDS;
  else process.env.ADMIN_FIREBASE_UIDS = value;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.ADMIN_FIREBASE_UIDS;
    else process.env.ADMIN_FIREBASE_UIDS = prev;
  }
}

/* ── 1 · The admin gate FAILS CLOSED ──────────────────────────────────────────
   A misconfigured deploy must never fall open. This is a cost/ops read-out, so
   the downside of an open one is a stranger reading the product's spend shape.
   ──────────────────────────────────────────────────────────────────────────── */

test("503 when firebase-admin is not initialised", async () => {
  await withAdminUids(ADMIN_UID, async () => {
    const { r, cap } = routes({ firebaseAdmin: null });
    await r.handleGetTokenTelemetry(reqWith({ authorization: "Bearer good-token" }), {});
    assert.equal(cap.last().status, 503);
    assert.equal(cap.last().body.ok, false);
  });
});

test("503 when ADMIN_FIREBASE_UIDS is unconfigured", async () => {
  await withAdminUids(undefined, async () => {
    const { r, cap } = routes();
    await r.handleGetTokenTelemetry(reqWith({ authorization: "Bearer good-token" }), {});
    assert.equal(cap.last().status, 503);
  });
});

test("401 with no Authorization header", async () => {
  await withAdminUids(ADMIN_UID, async () => {
    const { r, cap } = routes();
    await r.handleGetTokenTelemetry(reqWith({}), {});
    assert.equal(cap.last().status, 401);
  });
});

test("401 on an invalid ID token", async () => {
  await withAdminUids(ADMIN_UID, async () => {
    const { r, cap } = routes();
    await r.handleGetTokenTelemetry(reqWith({ authorization: "Bearer nonsense" }), {});
    assert.equal(cap.last().status, 401);
  });
});

test("403 for a VALID token whose uid is not allowlisted", async () => {
  await withAdminUids(ADMIN_UID, async () => {
    const { r, cap } = routes();
    await r.handleGetTokenTelemetry(reqWith({ authorization: "Bearer other-token" }), {});
    assert.equal(cap.last().status, 403);
  });
});

test("200 for an allowlisted admin uid", async () => {
  await withAdminUids(`someone, ${ADMIN_UID} ,`, async () => {
    const { r, cap } = routes();
    await r.handleGetTokenTelemetry(reqWith({ authorization: "Bearer good-token" }), {});
    assert.equal(cap.last().status, 200);
    assert.equal(cap.last().body.ok, true);
  });
});

/* ── 2 · The numbers the pricing decision actually needs ──────────────────── */

const SAMPLE = {
  "gemini_tokens.call.vision": 10,
  "gemini_tokens.prompt.vision": 5000,
  "gemini_tokens.candidates.vision": 2000,
  "gemini_tokens.thoughts.vision": 3000,
  "gemini_tokens.total.vision": 10000,
  "gemini_tokens.latency_ms.vision": 45000,
  "gemini_tokens.retry.vision": 2,
  "gemini_tokens.fallback.vision": 1,
  "gemini_tokens.call.tutor": 4,
  "gemini_tokens.prompt.tutor": 800,
  "gemini_tokens.candidates.tutor": 400,
  "gemini_tokens.thoughts.tutor": 600,
  "gemini_tokens.total.tutor": 1800,
  "gemini_tokens.model.gemini-2.5-flash": 14,
  "rate_limit.call.vision": 10,
  "rate_limit.hard_block.anonymous": 3,
  "rate_limit.call.total": 14,
  "rate_limit.shed.vision": 1,
  "rate_limit.anon_key.loopback": 7,
  "rate_limit.anon_key.client": 2,
};

function payloadFor(counters, extra = {}) {
  const { r } = routes({ telemetry: fakeTelemetry(counters), ...extra });
  return r.buildTelemetryPayload();
}

test("per-call-class aggregates carry every metric the cost model needs", () => {
  const p = payloadFor(SAMPLE);
  assert.deepEqual(p.byCallClass.vision, {
    calls: 10,
    promptTokenCount: 5000,
    candidatesTokenCount: 2000,
    thoughtsTokenCount: 3000,
    totalTokenCount: 10000,
    latencyMsTotal: 45000,
    retryCount: 2,
    fallbackCount: 1,
  });
});

test("thoughtsTokenCount is reported — the number no estimate can infer", () => {
  // Thinking bills at OUTPUT rates and is invisible in anything derived from
  // prompt structure. If this silently went missing the read-out would look
  // complete and under-report the bill.
  const p = payloadFor(SAMPLE);
  assert.equal(p.byCallClass.vision.thoughtsTokenCount, 3000);
  assert.equal(p.byCallClass.tutor.thoughtsTokenCount, 600);
  assert.equal(p.totals.thoughtsTokenCount, 3600);
});

test("totals sum across classes", () => {
  const p = payloadFor(SAMPLE);
  assert.equal(p.totals.calls, 14);
  assert.equal(p.totals.totalTokenCount, 11800);
});

test("a class with no traffic is omitted rather than reported as zeros", () => {
  const p = payloadFor(SAMPLE);
  assert.ok(!("practice" in p.byCallClass));
  assert.ok(!("visual" in p.byCallClass));
});

test("`unclassified` is reported when it has traffic — it is real spend", () => {
  const p = payloadFor({ "gemini_tokens.call.unclassified": 3, "gemini_tokens.total.unclassified": 900 });
  assert.equal(p.byCallClass.unclassified.calls, 3);
});

test("the anon-key shape counters are surfaced", () => {
  // ★ Without this, the A3b diagnostic would itself measure into a void — the
  // exact failure this endpoint exists to fix.
  const p = payloadFor(SAMPLE);
  assert.deepEqual(p.rateLimit.anonKey, { client: 2, loopback: 7 });
});

test("rate-limit blocks and sheds are surfaced", () => {
  const p = payloadFor(SAMPLE);
  assert.equal(p.rateLimit.byClass.anonymous.hardBlocks, 3);
  assert.equal(p.rateLimit.shedVision, 1);
  assert.equal(p.rateLimit.totalCalls, 14);
});

test("the counters' window is stated, not left to be inferred", () => {
  // Counters are process-lifetime and reset on restart. A reader diffing two
  // pulls across a Railway restart would otherwise silently read a drop as a
  // decline in usage.
  const p = payloadFor(SAMPLE);
  assert.match(p.windowNote, /reset on restart/i);
  assert.equal(typeof p.uptimeSeconds, "number");
});

test("only the ring's SIZE is reported, never its records", () => {
  const ring = [{ model: "gemini-2.5-flash", callClass: "vision", totalTokenCount: 1 }];
  const p = payloadFor(SAMPLE, { getTokenTelemetry: () => ring });
  assert.equal(p.recentSampleSize, 1);
  assert.ok(!JSON.stringify(p).includes("latencyMs\":"), "a raw record leaked into the payload");
});

test("a throwing ring degrades to 0 instead of failing the read", () => {
  const p = payloadFor(SAMPLE, {
    getTokenTelemetry: () => {
      throw new Error("boom");
    },
  });
  assert.equal(p.recentSampleSize, 0);
  assert.equal(p.ok, true);
});

/* ── 3 · ★ THE CONTENT FIREWALL ───────────────────────────────────────────────
   #540's record builder uses an explicit named allowlist — no spread, no key
   iteration — so a field Google adds to usageMetadata cannot appear in a record.
   THIS is the side where losing that property would actually be paid, because
   this is the side that leaves the process.

   The payload is built by asking for (closed-set metric × closed-set class)
   combinations, never by walking the counter map. These tests poison the map and
   assert nothing gets through.
   ──────────────────────────────────────────────────────────────────────────── */

const STUDENT_TEXT = "Prove that root 2 is irrational — my working was wrong here";

test("a content-shaped counter key cannot reach the response", () => {
  const p = payloadFor({
    ...SAMPLE,
    [`gemini_tokens.prompt_text.${STUDENT_TEXT}`]: 1,
    "gemini_tokens.responseText.vision": "the model said ...",
    student_answer: STUDENT_TEXT,
    "gemini_tokens.call.vision.extra": 99,
  });
  const serialised = JSON.stringify(p);
  assert.ok(!serialised.includes(STUDENT_TEXT), "student text reached the response");
  assert.ok(!serialised.includes("responseText"), "an unknown metric key reached the response");
  assert.ok(!serialised.includes("student_answer"), "an unknown top-level key reached the response");
  assert.ok(!serialised.includes("99"), "an unknown counter value reached the response");
});

test("a model label outside the sanitised charset is dropped", () => {
  // The one dynamic-label surface. It is sanitised on the way in by
  // geminiClient's sanitiseModelLabel; this re-applies the constraint on the way
  // out, because the write side is one edit away from changing.
  const p = payloadFor({
    ...SAMPLE,
    [`gemini_tokens.model.${STUDENT_TEXT}`]: 5,
    "gemini_tokens.model.": 6,
    "gemini_tokens.model.UPPERCASE": 7,
  });
  assert.deepEqual(Object.keys(p.byModel), ["gemini-2.5-flash"]);
  assert.ok(!JSON.stringify(p).includes(STUDENT_TEXT));
});

test("every value in the payload is a number or a known string field", () => {
  const p = payloadFor({ ...SAMPLE, "gemini_tokens.total.vision": "not-a-number" });
  assert.equal(p.byCallClass.vision.totalTokenCount, 0, "a non-numeric counter must coerce to 0");
  for (const row of Object.values(p.byCallClass)) {
    for (const v of Object.values(row)) assert.equal(typeof v, "number");
  }
  for (const v of Object.values(p.byModel)) assert.equal(typeof v, "number");
});

test("an empty snapshot yields an honest empty read-out, not an error", () => {
  const p = payloadFor({});
  assert.equal(p.ok, true);
  assert.deepEqual(p.byCallClass, {});
  assert.deepEqual(p.totals, {});
  assert.deepEqual(p.rateLimit.anonKey, { client: 0, loopback: 0 });
});

test("a missing telemetry module degrades instead of throwing", () => {
  // The gateway is also loaded by offline scripts and by vitest, where the sink
  // may be absent. A read-out that throws would be worse than an empty one.
  const r = createAdminTelemetryRoutes({
    sendJson: () => {},
    firebaseAdmin: null,
    telemetry: null,
    getTokenTelemetry: undefined,
  });
  const p = r.buildTelemetryPayload();
  assert.equal(p.ok, true);
  assert.deepEqual(p.byCallClass, {});
  assert.equal(p.recentSampleSize, 0);
});

/* ── 4 · The closed sets must not drift from their SOURCES ────────────────────
   The payload is built from two hardcoded class lists. That is what makes the
   content firewall work — but a hardcoded list is a derived value, and a derived
   value that nothing re-checks outlives the facts it came from. If a new call
   class is ever added to geminiClient or a new bucket to rateLimiter, the
   read-out would silently omit it and still look complete.

   These assert the lists against the modules that actually define the vocabulary.
   ──────────────────────────────────────────────────────────────────────────── */

test("REPORTED_CALL_CLASSES covers every class geminiClient can record", () => {
  for (const klass of CALL_CLASSES) {
    assert.ok(
      REPORTED_CALL_CLASSES.includes(klass),
      `geminiClient records "${klass}" and the read-out would silently omit it`,
    );
  }
  assert.ok(REPORTED_CALL_CLASSES.includes(UNCLASSIFIED_CALL_CLASS));
});

test("RATE_LIMIT_CLASSES covers every bucket rateLimiter can key on", () => {
  // ★ REGRESSION. The first version of this file reused the Gemini class list for
  // both, which silently dropped `rate_limit.hard_block.anonymous` — hiding the
  // signed-out lockout counter, i.e. exactly what the anon-key diagnostic exists
  // to detect. The bug was found by a test, not by review.
  for (const klass of new Set(Object.values(PAID_ENDPOINTS))) {
    assert.ok(RATE_LIMIT_CLASSES.includes(klass), `endpoint class "${klass}" is unreported`);
  }
  assert.ok(RATE_LIMIT_CLASSES.includes(ANONYMOUS_CLASS), "the anonymous bucket must be reported");
  assert.ok(RATE_LIMIT_CLASSES.includes(GLOBAL_CLASS), "the global circuit breaker must be reported");
});

test("the anonymous hard-block counter survives the round trip", () => {
  // The concrete case behind the regression above.
  const p = payloadFor({ "rate_limit.hard_block.anonymous": 12 });
  assert.equal(p.rateLimit.byClass.anonymous.hardBlocks, 12);
});

/* ── 5 · The uid-source migration signal ──────────────────────────────────────
   Added with the verified-uid change. Surfacing a counter without a reader is
   the exact failure this endpoint exists to correct, so the read-out is pinned
   here rather than trusted.
   ──────────────────────────────────────────────────────────────────────────── */

test("uidSource verified/header/unverified are surfaced", () => {
  const p = payloadFor({
    "rate_limit.uid_source.verified": 42,
    "rate_limit.uid_source.header": 7,
    "rate_limit.uid_source.unverified": 2,
  });
  assert.deepEqual(p.rateLimit.uidSource, { verified: 42, header: 7, unverified: 2 });
});

test("uidSource reads as zeros before any traffic, never undefined", () => {
  // A missing key must read 0, not undefined — a cost/ops read-out that prints
  // `undefined` invites the reader to assume the instrument is broken.
  const p = payloadFor({});
  assert.deepEqual(p.rateLimit.uidSource, { verified: 0, header: 0, unverified: 0 });
});

/* ══════════════════════════════════════════════════════════════════════════════
   §T · TELEMETRY-1 — the WORKLOAD axis, percentiles, and the marks bands.

   ★ WHY PERCENTILES AT ALL. The endpoint reported TOTALS only. A total divided by
   a call count is a MEAN, and a mean says nothing about the tail a thinking
   budget has to survive. The single hand-taken measurement this project has
   (1,428 thinking tokens) came from a one-sentence answer to a long question —
   a FLOOR, not a typical grade — and dividing a bill by it produced a call count
   that contradicted the owner's own account of his usage.
   ══════════════════════════════════════════════════════════════════════════════ */

const realTelemetry = require("../telemetry.cjs");
const { REPORTED_WORKLOAD_CLASSES, estimateCostUsd } = require("./adminTelemetry.cjs");
const { WORKLOAD_CLASSES } = require("../services/geminiClient.cjs");

/** A telemetry double backed by the REAL sample store, so the store is exercised. */
function liveTelemetry(counters) {
  realTelemetry.__resetWorkloadSamples();
  return {
    snapshot: () => ({ ...counters }),
    increment: () => {},
    recordWorkloadSample: realTelemetry.recordWorkloadSample,
    workloadStats: realTelemetry.workloadStats,
  };
}

function feed(samples) {
  for (const s of samples) realTelemetry.recordWorkloadSample(s);
}

function sample(workloadClass, thoughts, extra = {}) {
  return {
    workloadClass,
    promptTokenCount: 100,
    candidatesTokenCount: 200,
    thoughtsTokenCount: thoughts,
    totalTokenCount: 300 + thoughts,
    latencyMs: thoughts,
    ...extra,
  };
}

/* ── the workload axis is reported at all ─────────────────────────────────── */

test("§T.1 ★ byWorkload reports the workload classes, separately from byCallClass", () => {
  const telemetry = liveTelemetry({
    "gemini_workload.call.grade-single": 2,
    "gemini_workload.thoughts.grade-single": 3000,
    "gemini_workload.candidates.grade-single": 400,
    "gemini_workload.prompt.grade-single": 5000,
    "gemini_tokens.call.vision": 2,
    "gemini_tokens.thoughts.vision": 3000,
  });
  feed([sample("grade-single", 1000), sample("grade-single", 2000)]);
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const payload = routes.buildTelemetryPayload();

  assert.ok(payload.byWorkload["grade-single"], "the workload axis is present");
  assert.equal(payload.byWorkload["grade-single"].calls, 2);
  assert.equal(payload.byWorkload["grade-single"].thoughtsTokenCount, 3000);
  // The transport axis is untouched and still reported.
  assert.ok(payload.byCallClass.vision, "byCallClass survives — the rate-limiter join is intact");
});

// MUTATION VERIFIED: return the MEAN as p90 => this goes RED.
test("§T.2 ★★ percentiles come from the SAMPLES, not from the mean", () => {
  const telemetry = liveTelemetry({
    "gemini_workload.call.grade-single": 10,
    "gemini_workload.thoughts.grade-single": 10900,
  });
  // Nine small grades and one long one — a shape a mean actively hides.
  const thoughts = [100, 100, 100, 100, 100, 100, 100, 100, 100, 10000];
  feed(thoughts.map((t) => sample("grade-single", t)));

  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const p = routes.buildTelemetryPayload().byWorkload["grade-single"].thoughtsPercentiles;

  const mean = thoughts.reduce((a, b) => a + b, 0) / thoughts.length; // 1090
  assert.equal(p.p50, 100, "half the grades are cheap");
  assert.equal(p.p90, 100, "so is the 90th percentile");
  assert.equal(p.p99, 10000, "the tail is the number a budget must survive");
  assert.notEqual(p.p90, mean, `p90 must not be the mean (${mean}) — that is the mutation`);
  assert.notEqual(p.p50, mean);
});

test("§T.3 sampleSize is reported alongside the percentiles", () => {
  const telemetry = liveTelemetry({ "gemini_workload.call.tutor": 3 });
  feed([sample("tutor", 10), sample("tutor", 20), sample("tutor", 30)]);
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const row = routes.buildTelemetryPayload().byWorkload.tutor;
  assert.equal(row.sampleSize, 3, "a p99 over three samples is not a p99 — the reader must be able to see that");
});

/* ── marks bands: present when measured, ABSENT when not ──────────────────── */

// MUTATION VERIFIED: zero-fill a missing marks band => this goes RED.
test("§T.4 ★★ p90 per marks-band appears when marks are available", () => {
  const telemetry = liveTelemetry({ "gemini_workload.call.grade-single": 4 });
  feed([
    sample("grade-single", 500, { marksBand: "1" }),
    sample("grade-single", 700, { marksBand: "1" }),
    sample("grade-single", 4000, { marksBand: "5" }),
    sample("grade-single", 6000, { marksBand: "5" }),
  ]);
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const bands = routes.buildTelemetryPayload().byMarksBand["grade-single"];

  assert.ok(bands["1"], "CONTROL — a measured band RENDERS");
  assert.ok(bands["5"], "CONTROL — a second measured band RENDERS");
  assert.equal(bands["1"].thoughtsPercentiles.p90, 700);
  assert.equal(bands["5"].thoughtsPercentiles.p90, 6000);
  // ★ The whole reason the band was asked for: one budget across both is either
  // wasteful or damaging.
  assert.ok(
    bands["5"].thoughtsPercentiles.p90 > bands["1"].thoughtsPercentiles.p90 * 5,
    "a 5-mark answer thinks far more than a 1-marker — a single budget cannot serve both",
  );
});

// MUTATION VERIFIED: zero-fill => `bands["3"]` becomes an object of zeroes => RED.
test("§T.5 ★★ an UNMEASURED band is ABSENT, not zero", () => {
  const telemetry = liveTelemetry({ "gemini_workload.call.grade-single": 2 });
  feed([sample("grade-single", 500, { marksBand: "1" }), sample("grade-single", 600, { marksBand: "1" })]);
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const bands = routes.buildTelemetryPayload().byMarksBand["grade-single"];

  assert.ok(bands["1"], "CONTROL — the band that WAS measured is rendered");
  assert.equal("3" in bands, false, "band 3 was never graded — a zero row would read as a measurement");
  assert.equal("5" in bands, false);
  assert.equal(bands["3"], undefined);
});

test("§T.6 ★ a workload with NO marks anywhere contributes NO bands at all", () => {
  const telemetry = liveTelemetry({ "gemini_workload.call.detect-question": 2 });
  feed([sample("detect-question", 0), sample("detect-question", 0)]);
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const payload = routes.buildTelemetryPayload();
  assert.equal("detect-question" in payload.byMarksBand, false,
    "determining the marks is what a detect call is FOR — a band here would be fabricated");
  // CONTROL — it IS reported on the unbanded axis, so absence above is about bands only.
  assert.ok(payload.byWorkload["detect-question"], "the class itself is still reported");
});

test("§T.7 ★ marksAvailability states WHICH workloads can be banded at all", () => {
  const telemetry = liveTelemetry({});
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const ma = routes.buildTelemetryPayload().marksAvailability;
  assert.deepEqual(ma.banded, ["grade-single"]);
  for (const k of ["detect-question", "worksheet", "grade-batch", "warm-pool"]) {
    assert.equal(typeof ma.unbanded[k], "string", `${k} must say WHY it cannot be banded`);
  }
});

/* ── warm pool ────────────────────────────────────────────────────────────── */

test("§T.8 ★ warm-pool calls are counted SEPARATELY from every grading class", () => {
  const telemetry = liveTelemetry({
    "gemini_workload.call.warm-pool": 312,
    "gemini_workload.thoughts.warm-pool": 900000,
    "gemini_workload.candidates.warm-pool": 400000,
    "gemini_workload.call.grade-single": 3,
    "gemini_workload.thoughts.grade-single": 4000,
  });
  feed([sample("warm-pool", 3000), sample("grade-single", 1400)]);
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const w = routes.buildTelemetryPayload().byWorkload;

  assert.equal(w["warm-pool"].calls, 312,
    "the 2026-08-05 run's true call count was never established because nothing counted it");
  assert.equal(w["grade-single"].calls, 3);
  assert.notEqual(w["warm-pool"].calls, w["grade-single"].calls);
  assert.ok(w["warm-pool"].cost.estUsd > w["grade-single"].cost.estUsd,
    "question GENERATION produces far more output than grading — now visible, not inferred");
});

/* ── cost ─────────────────────────────────────────────────────────────────── */

test("§T.9 ★★ THINKING is charged at the OUTPUT rate, not treated as free", () => {
  // 98% of the 2026-08 increase was the OUTPUT token SKU, and thinking bills there.
  const withThinking = estimateCostUsd(
    { thoughtsTokenCount: 1000, candidatesTokenCount: 0, promptTokenCount: 0, calls: 1 }, 2.5, 0.3);
  const withOutput = estimateCostUsd(
    { thoughtsTokenCount: 0, candidatesTokenCount: 1000, promptTokenCount: 0, calls: 1 }, 2.5, 0.3);
  assert.equal(withThinking.estUsd, withOutput.estUsd, "a thinking token costs what an output token costs");
  assert.ok(withThinking.estUsd > 0, "CONTROL — thinking is not free");

  // Input is charged at the (much lower) input rate — which is why input-side
  // optimisation targets ~2.5% of this bill.
  const withInput = estimateCostUsd(
    { thoughtsTokenCount: 0, candidatesTokenCount: 0, promptTokenCount: 1000, calls: 1 }, 2.5, 0.3);
  assert.ok(withInput.estUsd < withThinking.estUsd);
});

test("§T.10 ★ the rate is NOT a hardcoded currency figure — its SOURCE is reported", () => {
  const telemetry = liveTelemetry({});
  const prevOut = process.env.GEMINI_OUTPUT_RATE_USD_PER_MTOK;
  try {
    delete process.env.GEMINI_OUTPUT_RATE_USD_PER_MTOK;
    let routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
    let cm = routes.buildTelemetryPayload().costModel;
    assert.equal(cm.outputRateSource, "assumed-default",
      "an unset rate must be LABELLED an assumption, never presented as measured");

    process.env.GEMINI_OUTPUT_RATE_USD_PER_MTOK = "3.75";
    routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
    cm = routes.buildTelemetryPayload().costModel;
    assert.equal(cm.outputRateUsdPerMTok, 3.75);
    assert.equal(cm.outputRateSource, "env", "CONTROL — a configured rate is read and labelled");
  } finally {
    if (prevOut === undefined) delete process.env.GEMINI_OUTPUT_RATE_USD_PER_MTOK;
    else process.env.GEMINI_OUTPUT_RATE_USD_PER_MTOK = prevOut;
  }
});

/* ── honesty: window, persistence, firewall ───────────────────────────────── */

test("§T.11 ★ uptimeSeconds still bounds the window and NO persistence is claimed", () => {
  const telemetry = liveTelemetry({ "gemini_workload.call.tutor": 1 });
  feed([sample("tutor", 100)]);
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const payload = routes.buildTelemetryPayload();

  assert.equal(typeof payload.uptimeSeconds, "number");
  assert.ok(payload.uptimeSeconds >= 0);
  assert.match(payload.windowNote, /reset on restart/i);
  assert.match(payload.windowNote, /uptimeSeconds bounds the window/i);
  const serialised = JSON.stringify(payload);
  assert.equal(/persist|durable|since inception|all[- ]time/i.test(serialised), false,
    "in-process counters must never imply a window they do not have");
});

test("§T.12 ★★ the workload axis holds the SAME content firewall — a poisoned key cannot reach it", () => {
  const telemetry = liveTelemetry({
    "gemini_workload.call.grade-single": 1,
    "gemini_workload.call.<script>alert(1)</script>": 99,
    "gemini_workload.thoughts.a student wrote LEAK_ME": 42,
  });
  const routes = createAdminTelemetryRoutes({ sendJson: () => {}, firebaseAdmin: {}, telemetry });
  const serialised = JSON.stringify(routes.buildTelemetryPayload().byWorkload);
  assert.equal(serialised.includes("LEAK_ME"), false);
  assert.equal(serialised.includes("script"), false);
  assert.ok(serialised.includes("grade-single"), "CONTROL — a legitimate closed-set key DOES come through");
});

test("§T.13 the reported workload vocabulary is the client's closed set plus unclassified", () => {
  assert.deepEqual(
    REPORTED_WORKLOAD_CLASSES.slice().sort(),
    [...WORKLOAD_CLASSES, "unclassified"].sort(),
    "two hand-copied lists that drift is how the signed-out lockout counter went missing",
  );
});

/* ── the gate is still the gate ───────────────────────────────────────────── */

// MUTATION VERIFIED: remove the requireFirebaseAdmin call from the handler => RED.
test("§T.14 ★ the endpoint carrying the new data is STILL admin-gated", async () => {
  const telemetry = liveTelemetry({ "gemini_workload.call.grade-single": 1 });
  feed([sample("grade-single", 1400, { marksBand: "3" })]);

  const sent = [];
  const routes = createAdminTelemetryRoutes({
    sendJson: (res, status, body) => sent.push({ status, body }),
    firebaseAdmin: {
      auth: () => ({ verifyIdToken: async () => { throw new Error("bad token"); } }),
    },
    telemetry,
  });

  const prev = process.env.ADMIN_FIREBASE_UIDS;
  process.env.ADMIN_FIREBASE_UIDS = ADMIN_UID;
  try {
    await routes.handleGetTokenTelemetry({ headers: { authorization: "Bearer nope" } }, {});
    assert.equal(sent[0].status, 401);
    assert.equal(sent[0].body.ok, false);
    // ★ THE POINT: the new per-workload / per-band cost data did NOT leak with it.
    assert.equal(JSON.stringify(sent[0].body).includes("grade-single"), false);
    assert.equal(sent[0].body.byWorkload, undefined);
    assert.equal(sent[0].body.byMarksBand, undefined);
  } finally {
    if (prev === undefined) delete process.env.ADMIN_FIREBASE_UIDS;
    else process.env.ADMIN_FIREBASE_UIDS = prev;
  }
});
