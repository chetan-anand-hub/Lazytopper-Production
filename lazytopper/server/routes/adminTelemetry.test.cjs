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
