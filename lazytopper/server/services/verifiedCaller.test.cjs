/**
 * verifiedCaller.test.cjs — guards for deriving the caller uid from a VERIFIED
 * Firebase ID token.
 *
 * Run: node --test lazytopper/server/services/verifiedCaller.test.cjs
 * Wired into `lazytopper` test:matrix:all, which CI gates on every PR. A test
 * that nothing executes is not a gate.
 *
 * ★ THE PROPERTY THAT MATTERS MOST is not "a good token resolves". It is that
 * NO failure path ever returns something that would make a signed-in student
 * anonymous. The anonymous hard cap is 3/day, so a fall-through would re-create
 * #552's launch blocker for anyone whose token refresh hiccups. Every failure
 * test below therefore asserts `""` — the value that makes resolveCaller fall
 * back to the header — and the integration section proves the fallback lands.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createVerifiedCaller,
  extractBearerToken,
  UNVERIFIED_EVENT,
} = require("./verifiedCaller.cjs");
const { resolveCaller, createRateLimiter } = require("./rateLimiter.cjs");

/* ── fixtures ─────────────────────────────────────────────────────────────── */

function recorder() {
  const events = [];
  return {
    increment: (event, value = 1) => events.push({ event, value }),
    events,
    count: (name) => events.filter((e) => e.event === name).length,
  };
}

/** firebase-admin stand-in: maps token -> uid; anything else throws. */
function fakeAdmin(tokenToUid) {
  return {
    auth: () => ({
      verifyIdToken: async (t) => {
        if (!Object.prototype.hasOwnProperty.call(tokenToUid, t)) {
          throw new Error("invalid token");
        }
        return { uid: tokenToUid[t] };
      },
    }),
  };
}

const GOOD = { "good-token": "firebase-uid-42" };

function req(headers = {}) {
  return { headers, socket: { remoteAddress: "127.0.0.1" } };
}

function bearer(token, extra = {}) {
  return req({ authorization: `Bearer ${token}`, ...extra });
}

/* ── 1 · extractBearerToken ───────────────────────────────────────────────── */

test("extracts a Bearer token and ignores every other shape", () => {
  assert.equal(extractBearerToken(bearer("abc")), "abc");
  assert.equal(extractBearerToken(req({ authorization: "abc" })), "");
  assert.equal(extractBearerToken(req({ authorization: "Basic abc" })), "");
  assert.equal(extractBearerToken(req({})), "");
  assert.equal(extractBearerToken(undefined), "");
  // Lowercase "bearer" is NOT accepted: #552 sends the canonical prefix, and
  // being liberal here would hide a client that had started sending something else.
  assert.equal(extractBearerToken(req({ authorization: "bearer abc" })), "");
});

/* ── 2 · The happy path ───────────────────────────────────────────────────── */

test("a valid token yields the uid FROM THE TOKEN, not from the header", async () => {
  // The header says one thing, the token says another. The token must win —
  // that is the whole point: the header is spoofable and the token is not.
  const telemetry = recorder();
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: fakeAdmin(GOOD), telemetry });
  const uid = await resolveVerifiedUid(bearer("good-token", { "x-lazytopper-uid": "i-am-someone-else" }));
  assert.equal(uid, "firebase-uid-42");
  assert.equal(telemetry.count(UNVERIFIED_EVENT), 0);
});

/* ── 3 · ★ NO FAILURE PATH MAY EVER STRAND A SIGNED-IN STUDENT ────────────── */

test("NO token offered -> \"\" and NO unverified event", async () => {
  // The ordinary state for any non-browser caller. Counting it would drown the
  // signal that actually matters.
  const telemetry = recorder();
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: fakeAdmin(GOOD), telemetry });
  assert.equal(await resolveVerifiedUid(req({ "x-lazytopper-uid": "u1" })), "");
  assert.equal(telemetry.count(UNVERIFIED_EVENT), 0);
});

test("an INVALID token -> \"\" and one unverified event", async () => {
  const telemetry = recorder();
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: fakeAdmin(GOOD), telemetry });
  assert.equal(await resolveVerifiedUid(bearer("forged")), "");
  assert.equal(telemetry.count(UNVERIFIED_EVENT), 1);
});

test("firebase-admin ABSENT -> \"\" and one unverified event", async () => {
  // A deploy missing VITE_FIREBASE_PROJECT_ID while clients send credentials.
  // Structurally unable to check, so worth seeing — but still not a lockout.
  const telemetry = recorder();
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: null, telemetry });
  assert.equal(await resolveVerifiedUid(bearer("good-token")), "");
  assert.equal(telemetry.count(UNVERIFIED_EVENT), 1);
});

test("verifyIdToken THROWING (network down, clock skew) -> \"\", never a throw", async () => {
  const telemetry = recorder();
  const exploding = { auth: () => ({ verifyIdToken: async () => { throw new Error("ENETDOWN"); } }) };
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: exploding, telemetry });
  assert.equal(await resolveVerifiedUid(bearer("good-token")), "");
  assert.equal(telemetry.count(UNVERIFIED_EVENT), 1);
});

test("a decoded token with NO uid -> \"\" and one unverified event", async () => {
  const telemetry = recorder();
  const noUid = { auth: () => ({ verifyIdToken: async () => ({}) }) };
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: noUid, telemetry });
  assert.equal(await resolveVerifiedUid(bearer("good-token")), "");
  assert.equal(telemetry.count(UNVERIFIED_EVENT), 1);
});

test("a THROWING telemetry sink cannot fail the call", async () => {
  const hostile = { increment: () => { throw new Error("sink is down"); } };
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: null, telemetry: hostile });
  assert.equal(await resolveVerifiedUid(bearer("good-token")), "");
});

test("no telemetry sink at all is fine", async () => {
  const { resolveVerifiedUid } = createVerifiedCaller({ firebaseAdmin: fakeAdmin(GOOD) });
  assert.equal(await resolveVerifiedUid(bearer("good-token")), "firebase-uid-42");
});

/* ── 4 · resolveCaller's trust order ──────────────────────────────────────── */

test("resolveCaller prefers the verified uid over the header", () => {
  const c = resolveCaller(req({ "x-lazytopper-uid": "spoofed" }), "real-uid");
  assert.deepEqual(c, { id: "real-uid", anonymous: false, verified: true });
});

test("resolveCaller falls back to the HEADER when there is no verified uid", () => {
  // ★ THE SAFETY PROPERTY. Not anonymous. Anonymous is 3/day.
  for (const absent of ["", "   ", undefined, null, 0]) {
    const c = resolveCaller(req({ "x-lazytopper-uid": "u1" }), absent);
    assert.equal(c.id, "u1", `verifiedUid=${JSON.stringify(absent)} must fall back to the header`);
    assert.equal(c.anonymous, false, "a signed-in caller must NEVER become anonymous");
    assert.equal(c.verified, false);
  }
});

test("resolveCaller is unchanged when called with ONE argument", () => {
  // Every pre-existing caller and test relies on this.
  assert.deepEqual(resolveCaller(req({ "x-lazytopper-uid": "u1" })), {
    id: "u1", anonymous: false, verified: false,
  });
  assert.deepEqual(resolveCaller(req({ "x-forwarded-for": "203.0.113.5" })), {
    id: "ip:203.0.113.5", anonymous: true, verified: false,
  });
});

test("a genuinely signed-out caller is still anonymous", () => {
  const c = resolveCaller(req(), "");
  assert.equal(c.anonymous, true);
  assert.equal(c.id, "ip:127.0.0.1");
});

/* ── 5 · Through the limiter — the bucket actually keys on the verified uid ── */

const TEST_LIMITS = Object.freeze({
  vision: { soft: 2, hard: 4 }, tutor: { soft: 2, hard: 4 },
  practice: { soft: 2, hard: 4 }, visual: { soft: 2, hard: 4 },
  anonymous: { soft: 1, hard: 2 }, global: { soft: 1000, hard: 1000 },
});

function limiter() {
  const telemetry = recorder();
  return { rl: createRateLimiter({ telemetry, limits: TEST_LIMITS }), telemetry };
}

test("two callers spoofing ONE header but holding DIFFERENT tokens get SEPARATE buckets", () => {
  // This is the enforcement the change buys. Under the old behaviour both would
  // have shared "u1" and the second would have been throttled by the first.
  const { rl } = limiter();
  const spoofed = req({ "x-lazytopper-uid": "u1" });
  for (let i = 0; i < 4; i++) rl.check(spoofed, "/api/generate-visual", "alice");
  const fifthForAlice = rl.check(spoofed, "/api/generate-visual", "alice");
  assert.equal(fifthForAlice.allowed, false, "alice must hit her own hard cap");
  const firstForBob = rl.check(spoofed, "/api/generate-visual", "bob");
  assert.equal(firstForBob.allowed, true, "bob must not inherit alice's count");
});

test("ONE caller cannot buy a fresh allowance by changing the header", () => {
  // The spoof that made the caps advisory. With a verified uid it does nothing.
  const { rl } = limiter();
  for (let i = 0; i < 4; i++) {
    rl.check(req({ "x-lazytopper-uid": `disguise-${i}` }), "/api/generate-visual", "alice");
  }
  const v = rl.check(req({ "x-lazytopper-uid": "yet-another" }), "/api/generate-visual", "alice");
  assert.equal(v.allowed, false, "the cap must follow the VERIFIED identity, not the header");
});

test("the uid-source diagnostic reports verified vs header", () => {
  const { rl, telemetry } = limiter();
  rl.check(req({ "x-lazytopper-uid": "u1" }), "/api/generate-visual", "alice");
  rl.check(req({ "x-lazytopper-uid": "u1" }), "/api/generate-visual");
  assert.equal(telemetry.count("rate_limit.uid_source.verified"), 1);
  assert.equal(telemetry.count("rate_limit.uid_source.header"), 1);
});

test("an ANONYMOUS caller reports no uid-source (it has no uid to source)", () => {
  const { rl, telemetry } = limiter();
  rl.check(req(), "/api/generate-visual");
  assert.equal(telemetry.count("rate_limit.uid_source.verified"), 0);
  assert.equal(telemetry.count("rate_limit.uid_source.header"), 0);
  assert.equal(telemetry.count("rate_limit.anon_key.loopback"), 1);
});

test("an UNPAID endpoint reports no uid-source (it never reaches a bucket)", () => {
  const { rl, telemetry } = limiter();
  rl.check(req({ "x-lazytopper-uid": "u1" }), "/api/user/progress/sync", "alice");
  assert.equal(telemetry.count("rate_limit.uid_source.verified"), 0);
  assert.equal(telemetry.count("rate_limit.uid_source.header"), 0);
});

test("check() called with TWO arguments behaves exactly as before", () => {
  // The 27 pre-existing tests all call it this way; the third parameter must be
  // purely additive.
  const { rl } = limiter();
  const v = rl.check(req({ "x-lazytopper-uid": "u1" }), "/api/generate-visual");
  assert.equal(v.allowed, true);
  assert.equal(v.class, "visual");
});

test("the uid-source events carry no PII", () => {
  const { rl, telemetry } = limiter();
  rl.check(req({ "x-lazytopper-uid": "u1" }), "/api/generate-visual", "alice@example.com");
  const serialised = JSON.stringify(telemetry.events);
  assert.ok(!serialised.includes("alice@example.com"), "a uid reached telemetry");
  for (const e of telemetry.events) assert.match(e.event, /^[a-z0-9._]+$/);
});
