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
  OFFERED_VISION_DAILY_SUBCAP,
  VISION_SHED_FRACTION,
  MAX_SINGLE_UID_SHARE_OF_GLOBAL,
  CHECK_IMPROVE_FLOW_ENDPOINTS,
  VISION_CALLS_PER_OFFERED_CHECK,
  resolveCaller,
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
// If the server refuses a paying student who is still inside the quota they
// bought, the server has quietly become the product and the pricing page is a lie.
//
// ★ SAME UNIT ON BOTH SIDES. The earlier version compared `vision.hard (30) > 25`
// — raw API calls against advertised CHECKS. Those are different units, so it
// passed while the product was broken: one advertised check fired BOTH
// detect-question and check-solution, and while both were classed `vision` a
// ceiling of 30 bought only 15 real checks against 25 sold. This version converts
// to checks first, so the comparison means what it says.
// MUTATION: reclassify "/api/detect-question" back to "vision" ⇒ RED here.
test("the vision ceiling permits MORE checks per day than Premium advertises", () => {
  assert.equal(
    VISION_CALLS_PER_OFFERED_CHECK,
    1,
    `one advertised check now costs ${VISION_CALLS_PER_OFFERED_CHECK} vision calls ` +
      `(flow: ${CHECK_IMPROVE_FLOW_ENDPOINTS.join(" → ")}). Every extra vision call in the ` +
      "C&I flow halves the checks a student actually gets, so the ceiling silently stops " +
      "meaning what the pricing page says.",
  );

  const permittedChecksPerDay = Math.floor(
    DEFAULT_LIMITS.vision.hard / VISION_CALLS_PER_OFFERED_CHECK,
  );

  assert.ok(
    permittedChecksPerDay > OFFERED_VISION_DAILY_SUBCAP,
    `the server permits ${permittedChecksPerDay} checks/day ` +
      `(${DEFAULT_LIMITS.vision.hard} vision calls ÷ ${VISION_CALLS_PER_OFFERED_CHECK} per check) ` +
      `but Premium sells ${OFFERED_VISION_DAILY_SUBCAP}/day — a paying student would be ` +
      "refused by the rate limiter while still inside the quota they bought.",
  );
});

// The cheap step must stay cheap-classed, and must NOT be shed with the expensive
// one — a student mid-check should fail at the grade with a clear message, not at
// marks confirmation for a call that costs a tenth of a paisa.
test("detect-question is billed as practice, not vision", () => {
  assert.equal(PAID_ENDPOINTS["/api/detect-question"], "practice");
  assert.equal(PAID_ENDPOINTS["/api/check-solution"], "vision");
  assert.equal(PAID_ENDPOINTS["/api/grade-worksheet"], "vision");
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

/* ── 12 · Anon-key SHAPE diagnostic ───────────────────────────────────────────
   The api-server proxies to 127.0.0.1, so at this gateway `remoteAddress` is
   always the api-server. The anonymous bucket therefore rests entirely on
   `x-forwarded-for` surviving Vercel -> Railway -> proxy. If it does not, every
   signed-out caller collapses into ONE shared bucket — fails closed, so no
   billing risk, but an invisible outage for signed-out visitors.

   These pin the SHAPE emit. Mutation-verified: inverting the ternary, dropping
   the `caller.anonymous` guard, and moving the emit above the `!endpointClass`
   early return each turn this section RED.
   ──────────────────────────────────────────────────────────────────────────── */

/** A signed-out caller arriving WITH a client address forwarded through the hops. */
function reqAnonForwarded(clientIp = "203.0.113.55", proxyIp = "127.0.0.1") {
  return {
    headers: { "x-forwarded-for": `${clientIp}, 10.0.0.1` },
    socket: { remoteAddress: proxyIp },
  };
}

test("an anonymous caller WITH x-forwarded-for reports the `client` shape", () => {
  const { rl, telemetry } = limiter();
  rl.check(reqAnonForwarded(), "/api/generate-visual");
  assert.equal(telemetry.count("rate_limit.anon_key.client"), 1);
  assert.equal(telemetry.count("rate_limit.anon_key.loopback"), 0);
});

test("an anonymous caller WITHOUT x-forwarded-for reports the `loopback` shape", () => {
  // The alarm case: no XFF means resolveCaller falls back to remoteAddress, which
  // behind the proxy is the api-server — one bucket for every signed-out student.
  const { rl, telemetry } = limiter();
  rl.check(reqAnon("127.0.0.1"), "/api/generate-visual");
  assert.equal(telemetry.count("rate_limit.anon_key.loopback"), 1);
  assert.equal(telemetry.count("rate_limit.anon_key.client"), 0);
});

test("a SIGNED-IN caller reports no anon-key shape at all", () => {
  // The uid keys the bucket; XFF is irrelevant, so an emit here would be noise
  // that makes the loopback/client ratio unreadable.
  const { rl, telemetry } = limiter();
  rl.check(reqWithUid("uid-1"), "/api/generate-visual");
  assert.equal(telemetry.count("rate_limit.anon_key.client"), 0);
  assert.equal(telemetry.count("rate_limit.anon_key.loopback"), 0);
});

test("an UNPAID endpoint reports no anon-key shape (it never reaches a bucket)", () => {
  // /api/user/progress/sync is not in PAID_ENDPOINTS, so check() returns before
  // resolving a caller. Emitting there would swamp the counter with traffic that
  // was never rate-limited.
  const { rl, telemetry } = limiter();
  rl.check(reqAnon(), "/api/user/progress/sync");
  assert.equal(telemetry.count("rate_limit.anon_key.client"), 0);
  assert.equal(telemetry.count("rate_limit.anon_key.loopback"), 0);
});

test("the shape is reported per request, including the ones that get 429'd", () => {
  // A denied request still tells us which key shape it was denied UNDER — and a
  // wrong key shape is the likeliest reason a signed-out caller is being denied
  // at all, so this is precisely when the diagnostic matters most.
  const { rl, telemetry } = limiter();
  for (let i = 0; i < 4; i++) rl.check(reqAnon("127.0.0.1"), "/api/generate-visual");
  assert.equal(telemetry.count("rate_limit.anon_key.loopback"), 4);
});

test("the emitted shape agrees with the key resolveCaller actually builds", () => {
  // Guards the one thing a SHAPE label cannot prove on its own: that it describes
  // the same decision the bucket is keyed on. If these two ever disagree, the
  // diagnostic is confidently reporting on something else.
  const forwarded = reqAnonForwarded("203.0.113.55");
  const bare = reqAnon("127.0.0.1");

  assert.equal(resolveCaller(forwarded).id, "ip:203.0.113.55", "client element wins");
  assert.equal(resolveCaller(bare).id, "ip:127.0.0.1", "falls back to the proxy address");
  assert.ok(resolveCaller(forwarded).anonymous && resolveCaller(bare).anonymous);

  const { rl, telemetry } = limiter();
  rl.check(forwarded, "/api/generate-visual");
  rl.check(bare, "/api/generate-visual");
  assert.equal(telemetry.count("rate_limit.anon_key.client"), 1);
  assert.equal(telemetry.count("rate_limit.anon_key.loopback"), 1);
});

test("the shape emit carries no IP and no PII", () => {
  // SHAPE ONLY. The whole point is that the answer is obtainable without ever
  // putting a student's address into telemetry.
  const { rl, telemetry } = limiter();
  rl.check(reqAnonForwarded("203.0.113.55"), "/api/generate-visual");
  const serialised = JSON.stringify(telemetry.events);
  assert.ok(!serialised.includes("203.0.113.55"), "an IP reached telemetry");
  assert.ok(!serialised.includes("10.0.0.1"), "a proxy hop reached telemetry");
  for (const e of telemetry.events) {
    assert.match(e.event, /^[a-z0-9._]+$/, `unexpected free text in event: ${e.event}`);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   §FC · FREE-CHECK-1a — the durable ceiling (R3), the 60% budget line (R5), the
   per-IP bucket (R6) and the global count (OR-4b).

   The limiter is driven together with the REAL freeCheck.cjs gate, over a Firestore
   stand-in with REAL transaction semantics (transactions are serialised, the way the
   server SDK's pessimistic locks serialise them, and every read yields a tick so
   anything done OUTSIDE a transaction genuinely interleaves). The store is a plain
   object handed in from outside, so it OUTLIVES any module instance — which is what
   "survives a restart" has to mean for a process-local limiter next to a durable
   Firestore document (N6). Each test names the mutation that turns it red.
   ══════════════════════════════════════════════════════════════════════════ */

const FREE_CHECK_CJS = require.resolve("./freeCheck.cjs");
const FC = require("./freeCheck.cjs");

/** The durable store. Outlives every gate, limiter and module instance built over it. */
function durableStore() {
  return { docs: new Map(), writes: [], txCount: 0 };
}

const tick = () => new Promise((r) => setImmediate(r));

function fakeFirestore(store, { failTx = false } = {}) {
  let chain = Promise.resolve();
  function commit(key, data, opts) {
    store.writes.push({ key, data: { ...data }, merge: !!(opts && opts.merge) });
    const prev = store.docs.get(key) || {};
    store.docs.set(key, opts && opts.merge ? { ...prev, ...data } : { ...data });
  }
  function snapOf(key) {
    const d = store.docs.get(key);
    return { exists: !!d, data: () => (d ? { ...d } : undefined) };
  }
  return {
    collection(name) {
      return {
        doc(id) {
          const key = `${name}/${id}`;
          return {
            key,
            async get() { await tick(); return snapOf(key); },
            async set(data, opts) { await tick(); commit(key, data, opts); },
          };
        },
      };
    },
    runTransaction(fn) {
      if (failTx) return Promise.reject(new Error("FIRESTORE UNAVAILABLE"));
      const run = chain.then(async () => {
        store.txCount += 1;
        const pending = [];
        const tx = {
          async get(ref) { await tick(); return snapOf(ref.key); },
          set(ref, data, opts) { pending.push([ref.key, data, opts]); },
        };
        const result = await fn(tx);
        for (const [k, d, o] of pending) commit(k, d, o);
        return result;
      });
      chain = run.catch(() => {});
      return run;
    },
  };
}

const GOOD_APPCHECK = "appcheck-good";
function fakeAdmin() {
  const calls = { verifyToken: 0 };
  return {
    calls,
    appCheck: () => ({
      async verifyToken(t) {
        calls.verifyToken += 1;
        if (t === GOOD_APPCHECK) return { appId: "1:123:web:abc", token: { sub: "1:123:web:abc" } };
        throw new Error("app check token did not verify");
      },
    }),
  };
}

const FLAG_ON = Object.freeze({ FREE_CHECK_ENABLED: "true" });

/** A signed-out visitor's marked free-check request, as 1b sends it. */
function reqFree(ip = "203.0.113.9", extra = {}) {
  return {
    method: "POST",
    headers: {
      "x-lazytopper-free-check": "1",
      "x-firebase-appcheck": GOOD_APPCHECK,
      "x-forwarded-for": `${ip}, 10.0.0.1`,
      ...extra,
    },
    socket: { remoteAddress: "127.0.0.1" },
  };
}

/** Limiter + gate, threaded the way index.cjs threads them (the accessor, from the limiter). */
function freeHarness({ store = durableStore(), env = FLAG_ON, limits = TEST_LIMITS, now = clock(), failTx, mod = FC } = {}) {
  const telemetry = recorder();
  const rl = createRateLimiter({ now, telemetry, limits });
  const firestore = fakeFirestore(store, { failTx });
  const admin = fakeAdmin();
  const gate = mod.createFreeCheckGate({
    firebaseAdmin: admin,
    adminFirestore: firestore,
    telemetry,
    logger: { warn() {} },
    env,
    now,
    globalCountToday: () => rl.globalCountToday(),
    globalHardLimit: () => rl.limits.global.hard,
  });
  return { rl, gate, store, admin, telemetry, now };
}

/** index.cjs's order: classify -> admit -> limiter (with the R6 option only when admitted). */
async function throughEdge(h, req, reqPath) {
  if (!h.gate.isFreeCheckRequest(req, reqPath, "")) return { free: false, verdict: h.rl.check(req, reqPath, "") };
  const a = await h.gate.admit(req, reqPath);
  if (!a.admitted) return { free: true, refused: a };
  return { free: true, admitted: true, verdict: h.rl.check(req, reqPath, "", { freeCheck: true }) };
}

/** The day document for the IST day of `nowMs` (T0 is 2026-07-25 in IST). */
const dayDoc = (store, day = "2026-07-25") => store.docs.get(`${FC.FREE_CHECK_COLLECTION}/${day}`) || {};

// MUTATION M3: do the served read-modify-write OUTSIDE runTransaction ⇒ RED here.
test("FC-R3a · ★ the ceiling is TRANSACTIONAL: concurrent uploads at cap−1 ⇒ exactly ONE admitted", async () => {
  const store = durableStore();
  const h = freeHarness({ store, env: { ...FLAG_ON, LT_FREECHECK_DAILY: "5" } });
  const key = `${FC.FREE_CHECK_COLLECTION}/2026-07-25`;
  store.docs.set(key, { served: 4 }); // cap − 1

  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => h.gate.admit(reqFree(`198.51.100.${i}`), "/api/check-solution")),
  );
  const admitted = results.filter((r) => r.admitted).length;
  assert.equal(admitted, 1, `exactly one upload may take the last slot, ${admitted} did`);
  assert.equal(store.docs.get(key).served, 5, "served stops at the cap");
  assert.equal(store.docs.get(key).refused_quota, 9, "every other attempt is counted as refused_quota");
  for (const r of results.filter((x) => !x.admitted)) assert.equal(r.body.reason, FC.REASONS.CEILING);
});

test("FC-R3a CONTROL · the fake really interleaves: a NON-transactional read-modify-write over it over-admits", async () => {
  // Without this, "exactly one" above could be an artefact of a fake that never races.
  const store = durableStore();
  const db = fakeFirestore(store);
  const ref = db.collection(FC.FREE_CHECK_COLLECTION).doc("2026-07-25");
  store.docs.set(ref.key, { served: 4 });
  const naive = async () => {
    const snap = await ref.get();
    const served = snap.data().served;
    if (served >= 5) return false;
    await ref.set({ served: served + 1 }, { merge: true });
    return true;
  };
  const results = await Promise.all(Array.from({ length: 10 }, naive));
  assert.ok(results.filter(Boolean).length > 1, "the fake must be able to expose a lost update");
});

// MUTATION: count `served` on /api/detect-question too ⇒ RED (N4).
test("FC-R3b · served counts GRADING calls only; a marked detect is checked against the cap but never counted", async () => {
  const h = freeHarness({ env: { ...FLAG_ON, LT_FREECHECK_DAILY: "2" } });
  assert.equal((await h.gate.admit(reqFree(), "/api/detect-question")).admitted, true);
  assert.equal(dayDoc(h.store).served, undefined, "a detect must not count as an upload");
  assert.equal((await h.gate.admit(reqFree(), "/api/check-solution")).admitted, true);
  assert.equal((await h.gate.admit(reqFree(), "/api/grade-worksheet")).admitted, true);
  assert.equal(dayDoc(h.store).served, 2);
  const detectAtCap = await h.gate.admit(reqFree(), "/api/detect-question");
  assert.equal(detectAtCap.admitted, false, "the cap check still applies to a marked detect");
  assert.equal(detectAtCap.body.reason, FC.REASONS.CEILING);
});

test("FC-R3d · LT_FREECHECK_DAILY defaults to 100 and is read from env", () => {
  assert.equal(FC.freeCheckDailyCap({}), 100);
  assert.equal(FC.DEFAULT_DAILY_CAP, 100);
  assert.equal(FC.freeCheckDailyCap({ LT_FREECHECK_DAILY: "40" }), 40);
  assert.equal(FC.freeCheckDailyCap({ LT_FREECHECK_DAILY: "0" }), 0);
  assert.equal(FC.freeCheckDailyCap({ LT_FREECHECK_DAILY: "banana" }), 100);
});

// MUTATION: keep served in module memory instead of the store ⇒ RED here.
test("FC-R3c · ★ the ceiling SURVIVES A RESTART — a fresh module instance over the same store refuses; the in-memory limiter does not remember", async () => {
  const store = durableStore();
  const env = { ...FLAG_ON, LT_FREECHECK_DAILY: "3" };
  const before = freeHarness({ store, env });
  for (let i = 0; i < 3; i += 1) {
    const r = await throughEdge(before, reqFree(), "/api/check-solution");
    assert.equal(r.admitted, true, `upload ${i + 1} of 3 should be admitted`);
  }
  assert.equal(before.rl.globalCountToday(), 3);

  // "Restart": drop the module from the require cache, load a NEW instance, build a NEW
  // limiter and gate. Only the durable store carries over.
  delete require.cache[FREE_CHECK_CJS];
  const fresh = require("./freeCheck.cjs");
  assert.notEqual(fresh, FC, "control: this really is a new module instance");
  const after = freeHarness({ store, env, mod: fresh });
  assert.equal(after.rl.globalCountToday(), 0, "control: the process-local limiter DID reset (P8)");

  const refused = await after.gate.admit(reqFree(), "/api/check-solution");
  assert.equal(refused.admitted, false, "the durable ceiling must survive the restart");
  assert.equal(refused.status, FC.REFUSAL_STATUS);
  assert.equal(refused.body.reason, FC.REASONS.CEILING);
  assert.equal(dayDoc(store).served, 3);

  // The next IST day is a new document: the ceiling resets by date, not by restart.
  after.now.advance(DAY);
  assert.equal((await after.gate.admit(reqFree(), "/api/check-solution")).admitted, true);
  assert.equal(dayDoc(store, "2026-07-26").served, 1);
});

// MUTATION M2: BUDGET_FRACTION 0.6 → 0.8, or delete the R5 branch ⇒ RED here.
test("FC-R5 · ★ the 60% line: floor(hard×0.6)−1 is ADMITTED, floor(hard×0.6) is REFUSED — derived from HARD, not soft", async () => {
  const GLOBAL_HARD = 10; // R5 line = 6, vision shed = 8
  const limits = {
    ...TEST_LIMITS,
    tutor: { soft: 50, hard: 50 },
    vision: { soft: 50, hard: 50 },
    global: { soft: 2, hard: GLOBAL_HARD }, // soft deliberately far below: it must not be the operand
  };
  const h = freeHarness({ limits });
  assert.equal(FC.budgetThreshold(GLOBAL_HARD), 6);

  for (let i = 0; i < 5; i += 1) assert.equal(h.rl.check(reqWithUid(`t${i}`), "/api/tutor").allowed, true);
  assert.equal(h.rl.globalCountToday(), 5);
  const below = await h.gate.admit(reqFree(), "/api/check-solution");
  assert.equal(below.admitted, true, "floor(hard×0.6)−1 must be admitted");

  assert.equal(h.rl.check(reqWithUid("t5"), "/api/tutor").allowed, true);
  assert.equal(h.rl.globalCountToday(), 6);
  const at = await h.gate.admit(reqFree(), "/api/check-solution");
  assert.equal(at.admitted, false, "floor(hard×0.6) must be refused");
  assert.equal(at.status, FC.REFUSAL_STATUS);
  assert.equal(at.body.reason, FC.REASONS.BUDGET);
  assert.equal(dayDoc(h.store).refused_budget, 1);

  // The band between 60% and the 80% shed stays open for a PAYING student.
  assert.equal(h.rl.check(reqWithUid("paying"), "/api/check-solution").allowed, true);
});

test("FC-R5b · at shipped defaults the line is floor(DEFAULT hard × 0.6), below the 80% shed", () => {
  const hard = DEFAULT_LIMITS.global.hard;
  assert.equal(FC.BUDGET_FRACTION, 0.6);
  assert.equal(FC.budgetThreshold(hard), Math.floor(hard * 0.6));
  assert.ok(FC.budgetThreshold(hard) < Math.floor(hard * VISION_SHED_FRACTION), "R5 must sit below the shed");
});

// MUTATION M4: charge the per-IP bucket for an admitted free check ⇒ RED here.
test("FC-R6 · ★ admitted free checks do NOT consume the per-IP bucket — CONTROL: the same calls unmarked do", async () => {
  const h = freeHarness(); // TEST_LIMITS: anonymous hard = 2
  for (let i = 0; i < 5; i += 1) {
    const r = await throughEdge(h, reqFree("203.0.113.9"), i % 2 ? "/api/detect-question" : "/api/check-solution");
    assert.equal(r.admitted, true);
    assert.equal(r.verdict.allowed, true, `admitted free check ${i + 1} must not hit the anonymous cap`);
  }
  assert.ok(!Object.keys(h.rl.snapshot()).some((k) => k.startsWith("ip:")), "no per-IP key may be charged");

  // The visitor's ordinary anonymous allowance is intact.
  const plain = { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }, socket: { remoteAddress: "127.0.0.1" } };
  assert.equal(h.rl.check(plain, "/api/tutor").allowed, true);
  assert.equal(h.rl.check(plain, "/api/tutor").allowed, true);
  assert.equal(h.rl.check(plain, "/api/tutor").allowed, false, "control: the bucket still bites at its cap");

  // CONTROL: without the R6 option the same anonymous calls exhaust the bucket at 2.
  const c = freeHarness();
  const noOption = [0, 1, 2].map(() => c.rl.check(reqFree("203.0.113.9"), "/api/check-solution").allowed);
  assert.deepEqual(noOption, [true, true, false]);
});

test("FC-R6b · the R6 option is honoured ONLY for an anonymous caller — a signed-in caller passing it is still charged", () => {
  const { rl } = limiter();
  for (let i = 0; i < 4; i += 1) {
    assert.equal(rl.check(reqWithUid("u1"), "/api/check-solution", "", { freeCheck: true }).allowed, true);
  }
  assert.equal(rl.check(reqWithUid("u1"), "/api/check-solution", "", { freeCheck: true }).allowed, false,
    "a uid's per-caller cap must never be bypassable");
});

// MUTATION M10: skip the global:<day> commit for an admitted free check ⇒ RED here.
test("FC-OR4b · ★ admitted free checks DO count in global:<day>, and the global hard ceiling still binds them", async () => {
  const h = freeHarness();
  for (let i = 0; i < 4; i += 1) assert.equal((await throughEdge(h, reqFree(), "/api/check-solution")).admitted, true);
  assert.equal(h.rl.snapshot()["global:2026-07-25"], 4, "every admitted free check is a global call");
  assert.equal(h.rl.globalCountToday(), 4);

  const tight = limiter({ limits: { ...TEST_LIMITS, global: { soft: 50, hard: 1 } } });
  assert.equal(tight.rl.check(reqFree(), "/api/detect-question", "", { freeCheck: true }).allowed, true);
  const over = tight.rl.check(reqFree(), "/api/detect-question", "", { freeCheck: true });
  assert.equal(over.allowed, false, "the circuit breaker applies to free checks too");
  assert.equal(over.body.class, "global");
});

// MUTATION M6: the writer adds a `uid` (or any non-counter) field ⇒ RED here.
test("FC-OR3 · ★ every field the free-check writer sets is one of the FOUR counters — no uid, no IP, no App Check id", async () => {
  assert.deepEqual([...FC.COUNTER_FIELDS], ["served", "refused_quota", "refused_budget", "refused_appcheck"]);
  const store = durableStore();
  const env = { ...FLAG_ON, LT_FREECHECK_DAILY: "1" };
  const h = freeHarness({ store, env, limits: { ...TEST_LIMITS, tutor: { soft: 99, hard: 99 }, global: { soft: 50, hard: 100 } } });

  await h.gate.admit(reqFree("203.0.113.77"), "/api/check-solution"); // served
  await h.gate.admit(reqFree("203.0.113.77"), "/api/check-solution"); // refused_quota
  await h.gate.admit(reqFree("203.0.113.77", { "x-firebase-appcheck": "" }), "/api/check-solution"); // refused_appcheck (missing)
  await h.gate.admit(reqFree("203.0.113.77", { "x-firebase-appcheck": "forged" }), "/api/check-solution"); // refused_appcheck (invalid)
  for (let i = 0; i < 60; i += 1) h.rl.check(reqWithUid(`t${i}`), "/api/tutor");
  await h.gate.admit(reqFree("203.0.113.77"), "/api/check-solution"); // refused_budget

  // CONTROL: every writer path really ran, so the containment check below is not vacuous.
  const written = new Set(store.writes.flatMap((w) => Object.keys(w.data)));
  assert.deepEqual([...written].sort(), [...FC.COUNTER_FIELDS].sort());
  assert.deepEqual(dayDoc(store), { served: 1, refused_quota: 1, refused_appcheck: 2, refused_budget: 1 });

  const allowed = new Set(FC.COUNTER_FIELDS);
  for (const w of store.writes) {
    for (const field of Object.keys(w.data)) assert.ok(allowed.has(field), `forbidden field written: ${field}`);
    for (const v of Object.values(w.data)) assert.equal(typeof v, "number", "counters only");
    assert.match(w.key, /^freeCheckDaily\/\d{4}-\d{2}-\d{2}$/, "the document id is the IST day and nothing else");
  }
  const serialised = JSON.stringify([...store.docs.entries(), ...store.writes]);
  for (const leak of ["203.0.113.77", GOOD_APPCHECK, "forged", "1:123:web:abc"]) {
    assert.ok(!serialised.includes(leak), `an identifier reached the durable store: ${leak}`);
  }
});
