// @vitest-environment node
//
// C&I PR-3 — model-solution cache: Gate-2a quality gate + cache round-trip +
// Gate-2b admin eviction/regeneration. Drives the REAL stepSolution.cjs cache
// functions against a FAKE in-memory pool (the __setPoolForTests seam) and a
// MOCKED callGemini — no live LLM, no Postgres, no Firebase, no network.
//
// Required-test map (dispatch §5):
//   (a) cache hit returns the stored solution without a model call
//   (b) a quality-FAIL solution is served once but NOT written
//   (c) a passing solution IS written and re-served
//   (d) eviction by hash removes an entry, and the admin gate fails closed
import { afterEach, describe, expect, it } from "vitest";
import {
  computeQuestionHash,
  validateSolutionQuality,
  getOrCreateModelSolution,
  getCachedSolution,
  saveSolution,
  deleteSolution,
  __setPoolForTests,
} from "../../server/routes/stepSolution.cjs";
import { createAdminSolutionCacheRoutes } from "../../server/routes/adminSolutionCache.cjs";
import { createHash } from "crypto";

// ── Fake pg pool: a Map behind the same query() contract the real code uses ────
function buildFakePool() {
  const store = new Map<string, unknown>();
  return {
    store,
    query: async (sql: string, params: string[]) => {
      if (sql.startsWith("SELECT")) {
        const hit = store.get(params[0]);
        return hit !== undefined ? { rows: [{ solution_json: hit }] } : { rows: [] };
      }
      if (sql.startsWith("INSERT") && sql.includes("DO NOTHING")) {
        if (!store.has(params[0])) {
          store.set(params[0], JSON.parse(params[1])); // jsonb round-trip
          return { rowCount: 1 };
        }
        return { rowCount: 0 };
      }
      if (sql.startsWith("INSERT") && sql.includes("DO UPDATE")) {
        store.set(params[0], JSON.parse(params[1]));
        return { rowCount: 1 };
      }
      if (sql.startsWith("DELETE")) {
        const existed = store.delete(params[0]);
        return { rowCount: existed ? 1 : 0 };
      }
      throw new Error("fake pool: unhandled SQL " + sql);
    },
  };
}

afterEach(() => {
  __setPoolForTests(null);
  delete process.env.ADMIN_FIREBASE_UIDS;
});

// A canned GOOD model solution (3 marks, sums exactly, real content).
const GOOD_SOLUTION = {
  totalMarks: 3,
  steps: [
    { stepNumber: 1, description: "Writing the formula", working: "x = (-b +/- sqrt(D)) / 2a", marks: 1 },
    { stepNumber: 2, description: "Substituting values", working: "D = 25 - 24 = 1, x = (5 +/- 1)/4", marks: 1.5 },
    { stepNumber: 3, description: "Final answer", working: "x = 3/2 or x = 1", marks: 0.5 },
  ],
  commonMistakes: ["Sign error in the discriminant"],
  examTip: "Show the discriminant computation as its own step.",
};

// A canned BAD model reply: parseable, but its only step has EMPTY working and it
// is a single line for a 3-marker — fails empty-step-content + too-few-steps.
const BAD_SOLUTION_REPLY = {
  totalMarks: 3,
  steps: [{ stepNumber: 1, description: "Answer", working: "", marks: 3 }],
  commonMistakes: [],
  examTip: "",
};

function buildDeps(replyJson: unknown) {
  const calls: string[] = [];
  return {
    calls,
    deps: {
      callGemini: async (_m: unknown, contents: any) => {
        calls.push(String(contents?.[0]?.parts?.[0]?.text || ""));
        return { text: JSON.stringify(replyJson), raw: {} };
      },
      GEMINI_MODEL: "test-model",
      ACTIVE_PROVIDER: "test",
      extractJsonObjectFromText: (t: string) => JSON.parse(t),
    },
  };
}

const FIELDS = { question: "Solve 2x^2 - 5x + 3 = 0", marks: 3, subject: "Maths", topic: "Quadratic Equations", qType: "", section: "", isObjective: false };

describe("computeQuestionHash — uniform CACHE_VERSION prefix", () => {
  it("prefixes EVERY hash with the version (a bump busts all entries, subjective included)", () => {
    const expected = createHash("sha256").update("v2|Solve x|3").digest("hex");
    expect(computeQuestionHash("Solve x", 3)).toBe(expected);
    // Different marks → different hash (marks are part of the key).
    expect(computeQuestionHash("Solve x", 2)).not.toBe(expected);
  });
});

describe("validateSolutionQuality — Gate 2a", () => {
  it("passes a well-formed solution", () => {
    expect(validateSolutionQuality(GOOD_SOLUTION, 3, false)).toEqual({ ok: true, reasons: [] });
  });
  it("fails empty/missing steps", () => {
    expect(validateSolutionQuality({ steps: [] }, 3, false).ok).toBe(false);
    expect(validateSolutionQuality(null, 3, false).ok).toBe(false);
    expect(validateSolutionQuality({ totalMarks: 3, steps: [{ description: "d", working: "", marks: 3 }] }, 3, false).reasons).toContain("empty-step-content");
  });
  it("fails a marks sum that does not hit the stated total", () => {
    const bad = { totalMarks: 3, steps: [
      { description: "a", working: "w", marks: 1 },
      { description: "b", working: "w", marks: 1 },
    ] };
    expect(validateSolutionQuality(bad, 3, false).reasons).toContain("marks-sum-mismatch");
  });
  it("fails non-half-mark or negative step marks", () => {
    const bad = { totalMarks: 3, steps: [
      { description: "a", working: "w", marks: 1.3 },
      { description: "b", working: "w", marks: 1.7 },
    ] };
    expect(validateSolutionQuality(bad, 3, false).reasons).toContain("bad-step-marks");
  });
  it("fails a totalMarks mismatch against the requested marks", () => {
    const bad = { totalMarks: 5, steps: [
      { description: "a", working: "w", marks: 1.5 },
      { description: "b", working: "w", marks: 1.5 },
    ] };
    expect(validateSolutionQuality(bad, 3, false).reasons).toContain("total-marks-mismatch");
  });
  it("fails garbled content (U+FFFD / control chars)", () => {
    const bad = { totalMarks: 3, steps: [
      { description: "a", working: "w" + String.fromCharCode(0xfffd) + "x", marks: 1.5 },
      { description: "b", working: "w", marks: 1.5 },
    ] };
    expect(validateSolutionQuality(bad, 3, false).reasons).toContain("garbled-content");
  });
  it("fails a one-step 'solution' for a 2+ marker", () => {
    const bad = { totalMarks: 3, steps: [{ description: "a", working: "w", marks: 3 }] };
    expect(validateSolutionQuality(bad, 3, false).reasons).toContain("too-few-steps-for-marks");
  });
  it("objective: exactly ONE scored step (plus optional zero-mark why-step)", () => {
    const good = { totalMarks: 1, steps: [
      { description: "Correct answer", working: "Option (b) is correct: ...", marks: 1 },
      { description: "Why this is correct", working: "Because ...", marks: 0 },
    ] };
    expect(validateSolutionQuality(good, 1, true).ok).toBe(true);
    const split = { totalMarks: 1, steps: [
      { description: "a", working: "w", marks: 0.5 },
      { description: "b", working: "w", marks: 0.5 },
    ] };
    expect(validateSolutionQuality(split, 1, true).reasons).toContain("objective-not-single-scored-step");
  });
  it("subjective: zero-mark steps are degenerate", () => {
    const bad = { totalMarks: 2, steps: [
      { description: "a", working: "w", marks: 2 },
      { description: "b", working: "w", marks: 0 },
    ] };
    expect(validateSolutionQuality(bad, 2, false).reasons).toContain("zero-mark-step-non-objective");
  });
});

describe("getOrCreateModelSolution — cache round-trip", () => {
  it("(c) a passing generation IS written, then (a) re-served as a HIT without a model call", async () => {
    const pool = buildFakePool();
    __setPoolForTests(pool as never);
    const { calls, deps } = buildDeps(GOOD_SOLUTION);

    const first = await getOrCreateModelSolution(FIELDS, deps as never);
    expect(first).not.toBeNull();
    expect(first.fromCache).toBe(false);
    expect(first.schemeSteps.length).toBe(3);
    expect(first.schemeSteps[0]).toContain("Writing the formula");
    expect(first.schemeSteps[0]).toContain("[1 mark]");
    expect(calls.length).toBe(1); // one generation
    expect(pool.store.size).toBe(1); // written

    const second = await getOrCreateModelSolution(FIELDS, deps as never);
    expect(second).not.toBeNull();
    expect(second.fromCache).toBe(true); // (a) HIT
    expect(second.schemeSteps).toEqual(first.schemeSteps);
    expect(calls.length).toBe(1); // NO second model call
  });

  it("(b) a quality-FAIL generation is served once but NOT written — the next request regenerates", async () => {
    const pool = buildFakePool();
    __setPoolForTests(pool as never);
    const { calls, deps } = buildDeps(BAD_SOLUTION_REPLY);

    const first = await getOrCreateModelSolution(FIELDS, deps as never);
    // Served once: the caller still gets whatever scheme could be rendered…
    expect(first === null || first.fromCache === false).toBe(true);
    // …but NOTHING is persisted.
    expect(pool.store.size).toBe(0);

    await getOrCreateModelSolution(FIELDS, deps as never);
    expect(calls.length).toBe(2); // regenerated, not inherited
    expect(pool.store.size).toBe(0);
  });

  it("returns null (grading degrades gracefully) when no pool is available", async () => {
    __setPoolForTests(null as never);
    delete process.env.DATABASE_URL;
    const { calls, deps } = buildDeps(GOOD_SOLUTION);
    const out = await getOrCreateModelSolution(FIELDS, deps as never);
    expect(out).toBeNull();
    expect(calls.length).toBe(0); // cache-gated: no cache → no generation either
  });

  it("(d) eviction by hash removes the entry so the next request regenerates", async () => {
    const pool = buildFakePool();
    __setPoolForTests(pool as never);
    const { calls, deps } = buildDeps(GOOD_SOLUTION);

    await getOrCreateModelSolution(FIELDS, deps as never);
    const hash = computeQuestionHash(FIELDS.question, FIELDS.marks);
    expect(await getCachedSolution(hash)).not.toBeNull();

    expect(await deleteSolution(hash)).toBe(true);
    expect(await getCachedSolution(hash)).toBeNull();
    expect(await deleteSolution(hash)).toBe(false); // idempotent honest report

    await getOrCreateModelSolution(FIELDS, deps as never);
    expect(calls.length).toBe(2); // regenerated after eviction
  });
});

// ── Gate 2b — the admin route: fail-closed identity, evict + regenerate ────────
function buildAdminRoute(replyJson: unknown, opts?: { noFirebase?: boolean }) {
  let captured: { status: number; body: any } | null = null;
  let currentPayload: unknown = null;
  const deps = {
    sendJson: (_res: unknown, status: number, body: any) => {
      captured = { status, body };
    },
    readJson: async () => currentPayload,
    firebaseAdmin: opts?.noFirebase
      ? null
      : {
          auth: () => ({
            verifyIdToken: async (token: string) => {
              if (token === "admin-token") return { uid: "admin-uid" };
              if (token === "student-token") return { uid: "student-uid" };
              throw new Error("invalid token");
            },
          }),
        },
    callGemini: async () => ({ text: JSON.stringify(replyJson), raw: {} }),
    GEMINI_MODEL: "test-model",
    ACTIVE_PROVIDER: "test",
    isObjectiveType: (t: string, s: string) => /^(MCQ|Objective)$/i.test(t || "") || /^A$/i.test(s || ""),
    extractJsonObjectFromText: (t: string) => JSON.parse(t),
  };
  const routes = createAdminSolutionCacheRoutes(deps as never);
  const run = async (handler: "handleEvict" | "handleRegenerate", headers: Record<string, string>, payload: unknown) => {
    currentPayload = payload;
    captured = null;
    await routes[handler]({ headers } as never, {} as never);
    if (!captured) throw new Error("route did not send a response");
    return captured as { status: number; body: any };
  };
  return { run };
}

describe("admin solution-cache routes — Gate 2b, fail-closed", () => {
  const HASH = computeQuestionHash("Solve 2x^2 - 5x + 3 = 0", 3);

  it("503 when ADMIN_FIREBASE_UIDS is not configured (fail-closed, even with a valid token)", async () => {
    const { run } = buildAdminRoute(GOOD_SOLUTION);
    const out = await run("handleEvict", { authorization: "Bearer admin-token" }, { hash: HASH });
    expect(out.status).toBe(503);
  });

  it("503 when firebase-admin is unavailable", async () => {
    process.env.ADMIN_FIREBASE_UIDS = "admin-uid";
    const { run } = buildAdminRoute(GOOD_SOLUTION, { noFirebase: true });
    const out = await run("handleEvict", { authorization: "Bearer admin-token" }, { hash: HASH });
    expect(out.status).toBe(503);
  });

  it("401 without a Bearer token; 401 on an invalid token; 403 for a non-admin uid", async () => {
    process.env.ADMIN_FIREBASE_UIDS = "admin-uid";
    const { run } = buildAdminRoute(GOOD_SOLUTION);
    expect((await run("handleEvict", {}, { hash: HASH })).status).toBe(401);
    expect((await run("handleEvict", { authorization: "Bearer nonsense" }, { hash: HASH })).status).toBe(401);
    expect((await run("handleEvict", { authorization: "Bearer student-token" }, { hash: HASH })).status).toBe(403);
  });

  it("(d) admin evict deletes the cached entry; malformed hash is rejected", async () => {
    process.env.ADMIN_FIREBASE_UIDS = "admin-uid";
    const pool = buildFakePool();
    __setPoolForTests(pool as never);
    await saveSolution(HASH, GOOD_SOLUTION);
    expect(pool.store.size).toBe(1);

    const { run } = buildAdminRoute(GOOD_SOLUTION);
    expect((await run("handleEvict", { authorization: "Bearer admin-token" }, { hash: "not-a-hash" })).status).toBe(400);

    const out = await run("handleEvict", { authorization: "Bearer admin-token" }, { hash: HASH });
    expect(out.status).toBe(200);
    expect(out.body.deleted).toBe(true);
    expect(pool.store.size).toBe(0);
  });

  it("admin regenerate force-overwrites ONLY when the fresh solution passes the quality gate", async () => {
    process.env.ADMIN_FIREBASE_UIDS = "admin-uid";
    const pool = buildFakePool();
    __setPoolForTests(pool as never);
    const stale = { ...GOOD_SOLUTION, examTip: "STALE ENTRY" };
    await saveSolution(HASH, stale);

    const { run } = buildAdminRoute(GOOD_SOLUTION);
    const ok = await run("handleRegenerate", { authorization: "Bearer admin-token" }, { question: "Solve 2x^2 - 5x + 3 = 0", marks: 3, subject: "Maths" });
    expect(ok.status).toBe(200);
    expect((pool.store.get(HASH) as any).examTip).not.toBe("STALE ENTRY");
  });

  it("a quality-FAIL regeneration returns 422 and leaves the cache untouched", async () => {
    process.env.ADMIN_FIREBASE_UIDS = "admin-uid";
    const pool = buildFakePool();
    __setPoolForTests(pool as never);
    const stale = { ...GOOD_SOLUTION, examTip: "STALE ENTRY" };
    await saveSolution(HASH, stale);

    const { run } = buildAdminRoute(BAD_SOLUTION_REPLY);
    const out = await run("handleRegenerate", { authorization: "Bearer admin-token" }, { question: "Solve 2x^2 - 5x + 3 = 0", marks: 3, subject: "Maths" });
    expect(out.status).toBe(422);
    expect((pool.store.get(HASH) as any).examTip).toBe("STALE ENTRY"); // untouched
  });
});
