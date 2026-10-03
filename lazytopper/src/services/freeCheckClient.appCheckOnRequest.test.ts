// @vitest-environment node
/**
 * BANK-SPLIT-1 PR-2 (T1) — the other half of "warm on first intent": a free-check request
 * made with NO prior warm-up (a visitor who never focused the answer box nor opened a
 * picker, e.g. a typed question + submit) is still attested. Every free-check request
 * builds its headers with freeCheckJsonHeaders() (aiClient), which mints a fresh
 * limited-use token through freshLimitedUseToken(), which initialises App Check first.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const H = vi.hoisted(() => ({ events: [] as string[] }));

vi.mock("./firebaseClient", () => ({ app: { name: "test-app" } }));
vi.mock("firebase/app-check", () => ({
  initializeAppCheck: () => {
    H.events.push("initializeAppCheck");
    return { app: "test" };
  },
  ReCaptchaEnterpriseProvider: class {
    constructor(key: string) {
      H.events.push(`provider:${key ? "key" : "no-key"}`);
    }
  },
  getLimitedUseToken: async () => {
    H.events.push("getLimitedUseToken");
    return { token: "tok-1" };
  },
}));

import {
  __resetFreeCheckAppCheckForTests,
  freeCheckJsonHeaders,
} from "./freeCheckClient";

beforeEach(() => {
  H.events.length = 0;
  __resetFreeCheckAppCheckForTests();
});

describe("a free-check request with no prior warm-up still initialises App Check first", () => {
  it("freeCheckJsonHeaders() on a cold module: init, then a token, then the header", async () => {
    const headers = await freeCheckJsonHeaders();
    const init = H.events.indexOf("initializeAppCheck");
    const token = H.events.indexOf("getLimitedUseToken");
    expect(init).toBeGreaterThanOrEqual(0);
    expect(token).toBeGreaterThan(init);
    expect(Object.values(headers)).toContain("tok-1");
  });

  it("App Check is initialised once and reused by the next request", async () => {
    await freeCheckJsonHeaders();
    await freeCheckJsonHeaders();
    expect(H.events.filter((e) => e === "initializeAppCheck")).toHaveLength(1);
    expect(H.events.filter((e) => e === "getLimitedUseToken")).toHaveLength(2);
  });
});
