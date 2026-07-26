/**
 * rateLimiter.test.cjs — guards for the anti-catastrophe daily caps.
 *
 * Run: node --test lazytopper/server/services/rateLimiter.test.cjs
 * Wired into `lazytopper` test:matrix:all, which CI gates on every PR. A test
 * that nothing executes is not a gate.
 *
 * Every check below was mutation-verified: the mutation named in each comment
 * was applied to rateLimiter.cjs, the suite was confirmed RED, and the mutation
 * was reverted.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createRateLimiter,
  PAID_ENDPOINTS,
  DEFAULT_LIMITS,
  SPEND_MODEL,
  ADVERTISED_VISION_DAILY_SUBCAP,
  VISION_SHED_FRACTION,
  MAX_SINGLE_UID_SHARE_OF_GLOBAL,
} = require("./rateLimiter.cjs");

/* ── fixtures ─────────────────────────────────────────────────────────────── */

// 2026-07-25T06:00:00Z === 11:30 IST, comfortably mid-day on both clocks so a
// +24h step is unambiguously "the next day" under either.
const T0 = Date.parse("2026-07-25T06:00:00Z");
const DAY = 86400000;

function clock(startMs = T0) {
  let t = startMs;
  const fn = () => t;
  fn.advance = (ms) => {
    t += ms;
  };
  return fn;
}

function recorder() {
  const events = [];
  return {
    increment: (event, value = 1) => events.push({ event, value }),
    events,
    names: () => events.map((e) => e.event),
    count: (name) => events.filter((e) => e.event === name).length,
  };
}

/** A signed-in caller. Note: uid ONLY — no email, no phone, anywhere. */
function reqWithUid(uid, ip = "203.0.113.7") {
  return { headers: { "x-lazytopper-uid": uid }, socket: { remoteAddress: ip } };
}

/** A signed-out caller. */
function reqAnon(ip = "203.0.113.9") {
  return { headers: {}, socket: { remoteAddress: ip } };
}

/** Small, readable limits so tests state intent instead of counting to 60. */
const TEST_LIMITS = Object.freeze({
  vision: { soft: 2, hard: 4 },
  tutor: { soft: 2, hard: 4 },
  practice: { soft: 2, hard: 4 },
  visual: { soft: 2, hard: 4 },
  anonymous: { soft: 1, hard: 2 },
  global: { soft: 1000, hard: 1000 }, // effectively off unless a test says otherwise
});

function limiter(overrides = {}) {
  const now = overrides.now || clock();
  const telemetry = overrides.telemetry || recorder();
  const rl = createRateLimiter({
    now,
    telemetry,
    limits: overrides.limits || TEST_LIMITS,
  });
  return { rl, now, telemetry };
}

/* ── 1 · HARD ceiling blocks; below it passes ─────────────────────────────── */
// MUTATION: `callerSoFar + 1 > rules.hard` → `> rules.hard + 10` ⇒ RED here.
test("a uid at its class HARD ceiling gets 429; one below gets through", () => {
  const { rl } = limiter();

  for (let i = 1; i <= 4; i += 1) {
    const r = rl.check(reqWithUid("u1"), "/api/check-solution");
    assert.equal(r.allowed, true, `call ${i} should pass (hard = 4)`);
  }

  const blocked = rl.check(reqWithUid("u1"), "/api/check-solution");
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error, "daily_limit");
  assert.equal(blocked.body.class, "vision");
  assert.match(blocked.body.message, /resets tomorrow/i);
  assert.ok(Date.parse(blocked.body.resetAt) > T0, "resetAt is a future ISO timestamp");

  // A DIFFERENT uid is untouched by u1 exhausting itself.
  assert.equal(rl.check(reqWithUid("u2"), "/api/check-solution").allowed, true);
});

/* ── 2 · SOFT threshold alerts but NEVER blocks ───────────────────────────── */
// This is the owner's amendment to §3.3, and the single most important
// behaviour in the module: a paying student must not hit a wall because a
// guessed number was too tight.
// MUTATION: make the soft branch return `denial(...)` ⇒ RED here.
test("crossing the SOFT threshold emits telemetry and lets the request through", () => {
  const { rl, telemetry } = limiter();

  rl.check(reqWithUid("u1"), "/api/tutor"); // 1 — under soft
  rl.check(reqWithUid("u1"), "/api/tutor"); // 2 — at soft
  assert.equal(telemetry.count("rate_limit.soft_breach.tutor"), 0, "not breached at soft");

  const third = rl.check(reqWithUid("u1"), "/api/tutor"); // 3 — over soft, under hard
  assert.equal(third.allowed, true, "SOFT must not block");
  assert.equal(telemetry.count("rate_limit.soft_breach.tutor"), 1);

  const fourth = rl.check(reqWithUid("u1"), "/api/tutor"); // 4 — still under hard
  assert.equal(fourth.allowed, true);
  assert.equal(
    telemetry.count("rate_limit.soft_breach.tutor"),
    1,
    "soft breach is announced ONCE per caller per day, not per call",
  );
});

/* ── 3 · Class isolation ──────────────────────────────────────────────────── */
// MUTATION: drop `klass` from the caller key ⇒ RED here.
test("exhausting the vision class does not block the tutor class", () => {
  const { rl } = limiter();

  for (let i = 0; i < 4; i += 1) rl.check(reqWithUid("u1"), "/api/check-solution");
  assert.equal(rl.check(reqWithUid("u1"), "/api/check-solution").allowed, false, "vision is spent");

  assert.equal(rl.check(reqWithUid("u1"), "/api/tutor").allowed, true);
  assert.equal(rl.check(reqWithUid("u1"), "/api/step-solution").allowed, true);
  assert.equal(rl.check(reqWithUid("u1"), "/api/generate-diagram").allowed, true);
});

/* ── 4 · Day rollover ─────────────────────────────────────────────────────── */
// Rollover is deliberately guarded TWICE: the day is part of every key, AND
// rollIfNeeded clears the Map. Either alone is sufficient, so neither single
// mutation reddens this test — removing BOTH does (verified). The redundancy is
// kept on purpose: the key makes days correct, the clear makes memory bounded.
// Test 12 below isolates the clear on its own, so it is not left unguarded.
// MUTATION: drop `:${day}` from callerKey AND comment out `counts.clear()` ⇒ RED.
test("the counter resets on the next IST day", () => {
  const now = clock();
  const { rl } = limiter({ now });

  for (let i = 0; i < 4; i += 1) rl.check(reqWithUid("u1"), "/api/check-solution");
  assert.equal(rl.check(reqWithUid("u1"), "/api/check-solution").allowed, false);

  now.advance(DAY);
  assert.equal(
    rl.check(reqWithUid("u1"), "/api/check-solution").allowed,
    true,
    "a new day restores the full allowance",
  );
});

/* ── 5 · Non-paid endpoints are NEVER limited ─────────────────────────────── */
// A student at their tutor cap must still sync progress — losing a streak
// because you asked too many questions would be a worse bug than the bill.
// MUTATION: add "/api/user/progress/sync": "tutor" to PAID_ENDPOINTS ⇒ RED here.
test("non-paid endpoints are never limited, at any count", () => {
  const { rl } = limiter();

  const NEVER_LIMITED = [
    "/api/user/progress",
    "/api/user/progress/sync",
    "/api/user/progress/xp",
    "/api/user/progress/streak",
    "/api/user/progress/focus",
    "/api/user/progress/mastery",
    "/api/user/progress/mission",
    "/api/share-token",
    "/api/verify-share-token",
    "/api/shared-report",
    "/api/qr-upload/new",
    "/api/questions/report",
    "/api/ai-questions",
    "/api/cbse-exam-date",
    "/api/health",
    "/api/session/start",
    "/api/tutor-feedback",
  ];

  for (const path of NEVER_LIMITED) {
    assert.ok(
      !Object.prototype.hasOwnProperty.call(PAID_ENDPOINTS, path),
      `${path} must not be in PAID_ENDPOINTS`,
    );
    for (let i = 0; i < 200; i += 1) {
      const r = rl.check(reqWithUid("u1"), path);
      if (!r.allowed) assert.fail(`${path} was limited at call ${i + 1}`);
    }
  }

  // And the paid set is exactly the live LLM-backed routes — no more, no less.
  assert.deepEqual(
    Object.keys(PAID_ENDPOINTS).sort(),
    [
      "/api/check-solution",
      "/api/detect-question",
      "/api/generate-diagram",
      "/api/generate-visual",
      "/api/grade-worksheet",
      "/api/more-like-this",
      "/api/step-solution",
      "/api/tutor",
    ],
    "PAID_ENDPOINTS drifted from the verified live LLM routes",
  );
});

/* ── 6 · Anonymous callers use the tight bucket ───────────────────────────── */
// MUTATION: `caller.anonymous ? ANONYMOUS_CLASS : endpointClass` → `endpointClass` ⇒ RED.
test("a caller with no uid uses the tight anonymous bucket, spanning all paid endpoints", () => {
  const { rl } = limiter();

  assert.equal(rl.check(reqAnon(), "/api/check-solution").allowed, true); // 1
  assert.equal(rl.check(reqAnon(), "/api/tutor").allowed, true); // 2 — SAME bucket
  const blocked = rl.check(reqAnon(), "/api/step-solution"); // 3 — over anon hard (2)
  assert.equal(blocked.allowed, false, "anonymous is ONE bucket across every paid endpoint");
  assert.equal(blocked.body.class, "anonymous");

  // A different IP is a different anonymous caller...
  assert.equal(rl.check(reqAnon("198.51.100.4"), "/api/tutor").allowed, true);
  // ...and a signed-in uid is never charged to the anonymous bucket.
  assert.equal(rl.check(reqWithUid("u1"), "/api/tutor").allowed, true);
});

test("behind a proxy, the first X-Forwarded-For hop identifies the anonymous caller", () => {
  const { rl } = limiter();
  const behindProxy = (ip) => ({
    headers: { "x-forwarded-for": `${ip}, 10.0.0.1` },
    socket: { remoteAddress: "10.0.0.1" }, // the proxy — identical for everyone
  });

  rl.check(behindProxy("203.0.113.1"), "/api/tutor");
  rl.check(behindProxy("203.0.113.1"), "/api/tutor");
  assert.equal(rl.check(behindProxy("203.0.113.1"), "/api/tutor").allowed, false);

  assert.equal(
    rl.check(behindProxy("203.0.113.2"), "/api/tutor").allowed,
    true,
    "a second student behind the same proxy must not inherit the first one's count",
  );
});

/* ── 7 · Global ceiling ───────────────────────────────────────────────────── */
// MUTATION: delete the `globalSoFar + 1 > globalRules.hard` branch ⇒ RED here.
test("the global ceiling 429s a caller who is still under their own per-uid cap", () => {
  const { rl, telemetry } = limiter({
    limits: { ...TEST_LIMITS, global: { soft: 2, hard: 3 } },
  });

  // Three DIFFERENT uids, one call each — nobody is near their own cap of 4.
  assert.equal(rl.check(reqWithUid("a"), "/api/tutor").allowed, true);
  assert.equal(rl.check(reqWithUid("b"), "/api/tutor").allowed, true);
  assert.equal(rl.check(reqWithUid("c"), "/api/tutor").allowed, true);

  const blocked = rl.check(reqWithUid("d"), "/api/tutor");
  assert.equal(blocked.allowed, false, "the circuit breaker fires regardless of per-uid state");
  assert.equal(blocked.body.class, "global");
  assert.equal(telemetry.count("rate_limit.hard_block.global"), 1, "the breaker is loud");
  assert.equal(telemetry.count("rate_limit.soft_breach.global"), 1);
});

/* ── 8 · Provider-agnostic (§1.2) ─────────────────────────────────────────── */
// A phone-only student has `email: null` on their Firebase user. Nothing in
// this module may notice. MUTATION: key any bucket on an email ⇒ RED here.
test("a phone-only uid is limited identically to an email uid", () => {
  const { rl } = limiter();

  const phoneOnly = "phoneUid_no_email";
  const emailOnly = "emailUid_no_phone";

  for (let i = 0; i < 4; i += 1) {
    assert.equal(rl.check(reqWithUid(phoneOnly), "/api/tutor").allowed, true);
    assert.equal(rl.check(reqWithUid(emailOnly), "/api/tutor").allowed, true);
  }
  assert.equal(rl.check(reqWithUid(phoneOnly), "/api/tutor").allowed, false);
  assert.equal(rl.check(reqWithUid(emailOnly), "/api/tutor").allowed, false);

  // The module source must never mention an email or phone field at all.
  const src = require("node:fs").readFileSync(require.resolve("./rateLimiter.cjs"), "utf8");
  assert.ok(!/\bemail\b/i.test(src.replace(/^\s*\*.*$/gm, "")), "no email reference in logic");
  assert.ok(
    !/req[^\n]*phoneNumber/i.test(src),
    "the limiter must never read a phone number off a request",
  );
});

/* ── 9 · A blocked request commits nothing ────────────────────────────────── */
// Being refused must not push a caller further from their reset, and must not
// burn the shared global allowance on a call that never reached a model.
// MUTATION: increment before the ceiling checks ⇒ RED here.
test("a denied request does not increment any counter", () => {
  const { rl } = limiter({ limits: { ...TEST_LIMITS, global: { soft: 50, hard: 50 } } });

  for (let i = 0; i < 4; i += 1) rl.check(reqWithUid("u1"), "/api/tutor");
  const globalAfterAllowed = rl.snapshot()["global:2026-07-25"];

  for (let i = 0; i < 10; i += 1) rl.check(reqWithUid("u1"), "/api/tutor"); // all denied

  assert.equal(rl.snapshot()["global:2026-07-25"], globalAfterAllowed, "global untouched by denials");
  assert.equal(rl.snapshot()["u1:tutor:2026-07-25"], 4, "caller counter untouched by denials");
});

/* ── 10 · Calibration telemetry ───────────────────────────────────────────── */
// The shipped numbers are guesses; these counters are how they stop being
// guesses. Without them the whole table is unfalsifiable.
test("every allowed paid call emits a per-class calibration counter", () => {
  const { rl, telemetry } = limiter();

  rl.check(reqWithUid("u1"), "/api/check-solution");
  rl.check(reqWithUid("u1"), "/api/tutor");
  rl.check(reqWithUid("u1"), "/api/generate-visual");
  rl.check(reqWithUid("u1"), "/api/user/progress/sync"); // not paid — no counter

  assert.equal(telemetry.count("rate_limit.call.vision"), 1);
  assert.equal(telemetry.count("rate_limit.call.tutor"), 1);
  assert.equal(telemetry.count("rate_limit.call.visual"), 1);
  assert.equal(telemetry.count("rate_limit.call.total"), 3, "unpaid calls are not counted");
});

/* ── 12 · Memory is bounded ───────────────────────────────────────────────── */
// The ONLY thing stopping this Map growing for the life of the process is the
// wholesale clear on rollover. Test 4 cannot see it (the day-in-key makes
// rollover correct by itself), so it is pinned here.
// MUTATION: comment out `counts.clear()` in rollIfNeeded ⇒ RED here.
test("yesterday's counters are dropped, not merely bypassed", () => {
  const now = clock();
  const { rl } = limiter({ now });

  for (let i = 0; i < 50; i += 1) rl.check(reqWithUid(`student${i}`), "/api/tutor");
  assert.equal(Object.keys(rl.snapshot()).length, 51, "50 callers + the global counter");

  now.advance(DAY);
  rl.check(reqWithUid("student0"), "/api/tutor");

  const keys = Object.keys(rl.snapshot());
  assert.equal(keys.length, 2, "a new day retains only the one live caller + global");
  assert.ok(
    keys.every((k) => k.endsWith("2026-07-26")),
    `stale keys survived the rollover: ${keys.filter((k) => !k.endsWith("2026-07-26")).join(", ")}`,
  );
});

/* ── 13 · The global ceiling trips BEFORE the billing cap ─────────────────── */
// The owner's ordering rule, made falsifiable. If the billing cap blows first it
// is disabled project-wide and every student is locked out until the 1st. If this
// ceiling blows first, everyone is back at the next IST midnight.
//
// ★ Everything here is read from SPEND_MODEL — the same derivation the shipped
// ceiling uses. NOT a pinned literal. A test that hardcodes ₹20,000 while the real
// figure lives in a billing console is the very drift this is meant to catch: it
// would stay green after the budget changed, which is worse than having no test.
//
// This is non-tautological because DEFAULT_LIMITS.global.hard can be overridden by
// LT_CAP_GLOBAL_HARD, and because the assertion is made at the STRESS FX rate the
// derivation does not use.
// MUTATION: set LT_CAP_GLOBAL_HARD above the derived ceiling, or FX_HEADROOM to
// 1.0 ⇒ RED here.
test("a full day at the effective ceiling costs less than the budget, even at the worst FX rate", () => {
  const effectiveCeiling = DEFAULT_LIMITS.global.hard;
  const worstCaseSpend = effectiveCeiling * SPEND_MODEL.BLENDED_USD_PER_CALL;

  // Stress at ₹90/USD: the same rupee budget buys fewer dollars, so this is the
  // tightest case the FX headroom exists to survive.
  const stressedBudget = SPEND_MODEL.dailyUsdAt(SPEND_MODEL.FX_STRESS_INR_PER_USD);

  assert.ok(
    worstCaseSpend <= stressedBudget,
    `a full day at the ceiling (${effectiveCeiling} calls) costs $${worstCaseSpend.toFixed(2)}, ` +
      `but at ₹${SPEND_MODEL.FX_STRESS_INR_PER_USD}/USD the daily budget is only ` +
      `$${stressedBudget.toFixed(2)}. The billing cap would trip first and lock every student ` +
      `out until the 1st. Lower LT_CAP_GLOBAL_HARD, or raise LT_MONTHLY_BUDGET_INR *and* the ` +
      "cap in the billing console together.",
  );

  // And the shipped default really is derived from the budget, not chosen.
  assert.equal(
    Math.floor(SPEND_MODEL.impliedCeiling * SPEND_MODEL.FX_HEADROOM),
    effectiveCeiling,
    "the global ceiling must be DERIVED from LT_MONTHLY_BUDGET_INR, not a literal",
  );
});

/* ── 13b · No single caller may hold a fifth of the day ───────────────────── */
// A per-uid ceiling that is large relative to the global one is a dead letter:
// the global breaker fires first and blacks out everybody, including a student
// who made two calls. That defeats the entire soft/hard design, whose purpose is
// that a paying student never hits a wall.
// MUTATION: restore tutor hard to 100 and practice to 120 (sum 275 = 21%) ⇒ RED.
test("one uid's hard ceilings together stay under a fifth of the global day", () => {
  const perUidTotal =
    DEFAULT_LIMITS.vision.hard +
    DEFAULT_LIMITS.tutor.hard +
    DEFAULT_LIMITS.practice.hard +
    DEFAULT_LIMITS.visual.hard;

  const budget = DEFAULT_LIMITS.global.hard * MAX_SINGLE_UID_SHARE_OF_GLOBAL;

  assert.ok(
    perUidTotal <= budget,
    `one uid can consume ${perUidTotal} calls — ` +
      `${((perUidTotal / DEFAULT_LIMITS.global.hard) * 100).toFixed(0)}% of the ` +
      `${DEFAULT_LIMITS.global.hard}-call day, over the ` +
      `${MAX_SINGLE_UID_SHARE_OF_GLOBAL * 100}% share (${budget.toFixed(0)} calls). ` +
      "Trim the per-class hard ceilings, or the global breaker becomes the only live " +
      "control and one heavy user blacks out everyone.",
  );
});

/* ── 14 · The server must never refuse what the pricing page sells ────────── */
// Premium advertises 70 solution checks per rolling week with a 25/day sub-cap.
// If the server's vision ceiling sat at or below that, a paying student doing
// exactly what they bought would be refused by infrastructure — at which point
// the server has quietly become the product, and the pricing page is a lie.
// The server cap is a backstop; it must sit strictly ABOVE the sold allowance.
// MUTATION: set LT_CAP_VISION_HARD to 25 (or below) ⇒ RED here.
test("the server's vision ceiling exceeds the advertised daily sub-cap", () => {
  assert.ok(
    DEFAULT_LIMITS.vision.hard > ADVERTISED_VISION_DAILY_SUBCAP,
    `vision hard is ${DEFAULT_LIMITS.vision.hard} but Premium sells ` +
      `${ADVERTISED_VISION_DAILY_SUBCAP}/day — a paying student would be refused by the ` +
      "rate limiter while still inside the quota they bought.",
  );
});

/* ── 15 · Class-aware shed: one feature degrades, not the whole product ───── */
// MUTATION: delete the vision-shed branch, or change endpointClass === "vision"
// to include another class ⇒ RED here.
test("at 80% of the global ceiling vision sheds while tutor and practice keep serving", () => {
  const GLOBAL_HARD = 10; // shed threshold = floor(10 × 0.8) = 8
  const { rl, telemetry } = limiter({
    limits: {
      ...TEST_LIMITS,
      vision: { soft: 50, hard: 50 }, // per-uid caps kept out of the way
      tutor: { soft: 50, hard: 50 },
      practice: { soft: 50, hard: 50 },
      global: { soft: 50, hard: GLOBAL_HARD },
    },
  });

  // Burn the global counter to exactly the shed threshold using a NON-vision class.
  for (let i = 0; i < 8; i += 1) {
    assert.equal(rl.check(reqWithUid(`u${i}`), "/api/tutor").allowed, true);
  }

  // Vision is now shed...
  const shed = rl.check(reqWithUid("v1"), "/api/check-solution");
  assert.equal(shed.allowed, false, "vision must shed at 80% of global");
  assert.equal(shed.body.class, "vision");
  assert.match(shed.body.message, /tutor and practice/i, "the copy must explain what still works");
  assert.equal(telemetry.count("rate_limit.shed.vision"), 1);

  // ...while everything else keeps serving, which is the entire point.
  assert.equal(rl.check(reqWithUid("t1"), "/api/tutor").allowed, true, "tutor keeps serving");
  assert.equal(rl.check(reqWithUid("p1"), "/api/step-solution").allowed, true, "practice keeps serving");

  // At 100% the breaker takes everything.
  assert.equal(rl.check(reqWithUid("t2"), "/api/tutor").allowed, false, "full breaker at 100%");
});

test("the vision shed does not fire below the threshold", () => {
  const { rl } = limiter({
    limits: {
      ...TEST_LIMITS,
      vision: { soft: 50, hard: 50 },
      tutor: { soft: 50, hard: 50 },
      global: { soft: 50, hard: 10 },
    },
  });

  for (let i = 0; i < 7; i += 1) rl.check(reqWithUid(`u${i}`), "/api/tutor"); // 7 < 8
  assert.equal(
    rl.check(reqWithUid("v1"), "/api/check-solution").allowed,
    true,
    "vision must serve normally until the shed threshold is actually crossed",
  );
});

test("the shed fraction leaves real headroom for the classes that keep serving", () => {
  assert.ok(
    VISION_SHED_FRACTION > 0 && VISION_SHED_FRACTION < 1,
    "the shed must sit strictly inside the ceiling, or it is either dead or a duplicate breaker",
  );
});

/* ── 11 · Shipped defaults are sane ───────────────────────────────────────── */
test("every shipped class has hard strictly above soft", () => {
  for (const [klass, rules] of Object.entries(DEFAULT_LIMITS)) {
    assert.ok(
      rules.hard > rules.soft,
      `${klass}: hard (${rules.hard}) must exceed soft (${rules.soft}) — otherwise the ` +
        "soft alert can never fire before the wall, which is the whole point",
    );
    assert.ok(rules.soft > 0, `${klass}: soft must be positive`);
  }
});
