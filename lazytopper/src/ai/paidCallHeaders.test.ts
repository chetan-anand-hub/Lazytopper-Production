// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Caller identity on RATE-LIMITED endpoints (PR-B4).
 *
 * THE BUG: the client sent no caller identity at all. `resolveCaller` in
 * server/services/rateLimiter.cjs reads `x-lazytopper-uid`; absent, it falls
 * back to `ip:<addr>` and marks the call anonymous — and the anonymous hard cap
 * is THREE PER DAY. Every signed-in student was limited as anonymous and shared
 * one 3/day bucket with everyone behind the same address.
 *
 * Two things are pinned, and the second is the one that keeps this fixed:
 *   1. the headers themselves are correct, and absent when signed out;
 *   2. EVERY paid endpoint's client call site actually attaches them. A helper
 *      that exists but is not wired at one of nine sites leaves that endpoint
 *      on the anonymous cap while the fix looks complete.
 */

const H = vi.hoisted(() => ({
  currentUser: null as null | { uid: string; getIdToken: () => Promise<string> },
}));

vi.mock("../services/firebaseClient", () => ({
  get authClient() {
    return { currentUser: H.currentUser };
  },
  firebaseConfigured: true,
}));

import { paidCallHeaders, paidJsonHeaders, UID_HEADER } from "./paidCallHeaders";

beforeEach(() => {
  H.currentUser = null;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("paidCallHeaders — a signed-in caller is identified", () => {
  it("sends the uid header the rate limiter actually reads", async () => {
    H.currentUser = { uid: "student-123", getIdToken: async () => "tok" };

    const headers = await paidCallHeaders();

    // resolveCaller reads exactly this header name, lower-cased by Node.
    expect(headers[UID_HEADER]).toBe("student-123");
    expect(UID_HEADER.toLowerCase()).toBe("x-lazytopper-uid");
  });

  it("also sends a verifiable bearer token, so the server can stop trusting the string", async () => {
    H.currentUser = { uid: "student-123", getIdToken: async () => "tok-abc" };

    const headers = await paidCallHeaders();

    expect(headers.Authorization).toBe("Bearer tok-abc");
  });

  it("never sends X-User-ID — our own gateway strips it", async () => {
    // artifacts/api-server/src/app.ts lists `x-user-id` in STRIPPED_PROXY_HEADERS
    // because it is a privileged server-set header. dbSyncService sends it and
    // blames the Vercel->Railway rewrite; that attribution is wrong and copying
    // it here would ship a header our own code discards.
    // See [FU-DBSYNC-COMMENT-MISATTRIBUTED].
    H.currentUser = { uid: "student-123", getIdToken: async () => "tok" };

    const headers = await paidCallHeaders();

    expect(Object.keys(headers)).not.toContain("X-User-ID");
    expect(Object.keys(headers).map(k => k.toLowerCase())).not.toContain("x-user-id");
  });

  it("degrades to the uid header alone when the token cannot be minted", async () => {
    H.currentUser = {
      uid: "student-123",
      getIdToken: async () => {
        throw new Error("network");
      },
    };

    // An AI call must not fail because identity could not be fully attached.
    const headers = await paidCallHeaders();

    expect(headers[UID_HEADER]).toBe("student-123");
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("paidCallHeaders — a signed-out caller stays anonymous", () => {
  it("sends NO identity headers when nobody is signed in", async () => {
    H.currentUser = null;

    const headers = await paidCallHeaders();

    // Sending an empty or placeholder uid would hand every signed-out visitor
    // the SAME non-anonymous bucket — strictly worse than the bug being fixed.
    expect(headers).toEqual({});
  });

  it("still sends a JSON content type, so the request shape is unchanged", async () => {
    H.currentUser = null;
    expect(await paidJsonHeaders()).toEqual({ "Content-Type": "application/json" });
  });

  it("merges identity onto the JSON content type when signed in", async () => {
    H.currentUser = { uid: "u9", getIdToken: async () => "t9" };
    expect(await paidJsonHeaders()).toEqual({
      "Content-Type": "application/json",
      [UID_HEADER]: "u9",
      Authorization: "Bearer t9",
    });
  });
});

/**
 * COVERAGE GUARD — the half that keeps this fixed.
 *
 * The paid-endpoint list is the SERVER's (rateLimiter.cjs PAID_ENDPOINTS), read
 * from disk rather than restated here, so adding an endpoint there without
 * wiring the client turns this red instead of silently shipping an endpoint on
 * the 3/day anonymous cap.
 */
describe("every PAID endpoint's client call site attaches identity", () => {
  const ROOT = process.cwd();

  function paidEndpointPaths(): string[] {
    const src = readFileSync(
      resolve(ROOT, "server/services/rateLimiter.cjs"),
      "utf8",
    );
    const block = src.slice(
      src.indexOf("const PAID_ENDPOINTS"),
      src.indexOf("});", src.indexOf("const PAID_ENDPOINTS")),
    );
    const paths = [...block.matchAll(/"(\/api\/[a-z-]+)":/g)].map(m => m[1]);
    expect(paths.length, "failed to parse PAID_ENDPOINTS").toBeGreaterThan(5);
    return paths;
  }

  /** Client files that call a paid endpoint, mapped to the endpoints they call. */
  const CALL_SITES: Record<string, string[]> = {
    "src/ai/aiClient.ts": [
      "/api/more-like-this",
      "/api/step-solution",
      "/api/check-solution",
      "/api/detect-question",
      "/api/grade-worksheet",
      "/api/generate-visual",
    ],
    "src/ai/tutorClient.ts": ["/api/tutor"],
    "src/components/VisualExplainer.tsx": ["/api/generate-visual"],
    "src/components/question/QuestionVisualAid.tsx": ["/api/generate-diagram"],
    "src/pages/DiagramComparePage.tsx": ["/api/generate-diagram"],
    "src/pages/DiagramQualityPage.tsx": ["/api/generate-diagram"],
  };

  it("covers every endpoint the server bills for", () => {
    const covered = new Set(Object.values(CALL_SITES).flat());
    for (const ep of paidEndpointPaths()) {
      expect(covered, `no client call site is registered for ${ep}`).toContain(ep);
    }
  });

  it("every registered call site imports and uses the helper", () => {
    for (const file of Object.keys(CALL_SITES)) {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      expect(src, `${file} does not import paidCallHeaders`).toMatch(
        /from "[^"]*paidCallHeaders"/,
      );
      expect(src, `${file} imports the helper but never calls it`).toMatch(
        /paidJsonHeaders\(\)/,
      );
    }
  });

  /**
   * REGRESSION GUARD — this exact failure already happened once.
   *
   * `firebaseClient` reads `import.meta.env` at module scope. A STATIC import of
   * it here lands on `aiClient`'s module graph, and `aiClient` is reachable from
   * code the root guard matrix runs under plain Node via tsx, where
   * `import.meta.env` is undefined. That turned three unrelated subtests in
   * `scripts/src/practiceSetGeneratorGuard.test.ts` red with
   * `Cannot read properties of undefined (reading 'VITE_FIREBASE_API_KEY')`.
   *
   * A type error cannot see this and no browser test can either — the module
   * simply has to not be on the graph until call time.
   */
  it("imports firebaseClient LAZILY, so Node-run guards never evaluate import.meta.env", () => {
    const src = readFileSync(resolve(ROOT, "src/ai/paidCallHeaders.ts"), "utf8");

    // No top-level `import ... from ".../firebaseClient"`.
    expect(
      src,
      "static import of firebaseClient — this breaks the root guard matrix under Node",
    ).not.toMatch(/^\s*import\s[^;]*from\s+"[^"]*firebaseClient"/m);

    // It must still be reached, just deferred.
    expect(src).toMatch(/await import\(\s*"[^"]*firebaseClient"\s*\)/);
  });

  it("leaves no paid call site still hardcoding a bare JSON content type", () => {
    // The exact shape every paid site used before this PR. If one comes back,
    // that endpoint is silently anonymous again.
    const BARE = 'headers: { "Content-Type": "application/json" }';
    for (const [file, endpoints] of Object.entries(CALL_SITES)) {
      const src = readFileSync(resolve(ROOT, file), "utf8");
      for (const ep of endpoints) {
        const idx = src.indexOf(ep.replace("/api/", ""));
        if (idx === -1) continue;
        const window = src.slice(idx, idx + 400);
        expect(
          window.includes(BARE),
          `${file} still sends bare JSON headers for ${ep} — that call is anonymous`,
        ).toBe(false);
      }
    }
  });
});
