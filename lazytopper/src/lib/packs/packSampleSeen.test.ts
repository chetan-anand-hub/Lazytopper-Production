/**
 * SAMPLE-FOLLOWUP-1 - the browser half of the sample follow-up: only a SIGNED-IN student tells our server which pack's sample was
 * saved; a signed-out visitor sends nothing. `signed_in` on the analytics event is true / false once auth is known.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ client: null as null | { currentUser: unknown; authStateReady?: () => Promise<void> } }));
vi.mock("../../services/firebaseClient", () => ({
  get authClient() {
    return auth.client;
  },
}));

import { __resetPackSampleSeenForTests, PACK_SAMPLE_SEEN_ENDPOINT, reportPackSampleSeen, signedInHint } from "./packSampleSeen";

const flush = async () => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};
const user = (extra: Record<string, unknown> = {}) => ({ uid: "u1", isAnonymous: false, getIdToken: vi.fn(async () => "tok"), ...extra });

beforeEach(() => {
  __resetPackSampleSeenForTests();
  auth.client = null;
});

describe("reportPackSampleSeen", () => {
  it("a signed-in student: POSTs { pack } with their Bearer token, and nothing else about them", async () => {
    auth.client = { currentUser: user(), authStateReady: async () => undefined };
    const f = vi.fn(async () => ({}));
    reportPackSampleSeen("pack_cbq:science", f);
    await flush();
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(PACK_SAMPLE_SEEN_ENDPOINT);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
    expect(JSON.parse(String(init.body))).toEqual({ pack: "pack_cbq:science" });
  });

  it("a signed-out visitor sends NOTHING (no email is collected before sign-up)", async () => {
    auth.client = { currentUser: null, authStateReady: async () => undefined };
    const f = vi.fn(async () => ({}));
    reportPackSampleSeen("pack_cbq:science", f);
    await flush();
    expect(f).not.toHaveBeenCalled();
  });

  it("an anonymous user, no Firebase on this deploy, or a failing token/network never throws or sends", async () => {
    const f = vi.fn(async () => {
      throw new Error("offline");
    });
    auth.client = { currentUser: user({ isAnonymous: true }) };
    reportPackSampleSeen("pack_cbq:science", f);
    await flush();
    expect(f).not.toHaveBeenCalled();
    __resetPackSampleSeenForTests();
    auth.client = null;
    reportPackSampleSeen("pack_cbq:science", f);
    await flush();
    expect(f).not.toHaveBeenCalled();
    __resetPackSampleSeenForTests();
    auth.client = { currentUser: user() };
    expect(() => reportPackSampleSeen("pack_cbq:science", f)).not.toThrow();
    await flush();
    expect(f).toHaveBeenCalledTimes(1); // tried once; the rejection was swallowed
  });
});

describe("signedInHint", () => {
  it("is undefined until auth has loaded (an early tap never records a wrong false), then true / false", async () => {
    auth.client = { currentUser: user() };
    expect(signedInHint()).toBeUndefined();
    await flush();
    expect(signedInHint()).toBe(true);
    __resetPackSampleSeenForTests();
    auth.client = { currentUser: null };
    expect(signedInHint()).toBeUndefined();
    await flush();
    expect(signedInHint()).toBe(false);
    __resetPackSampleSeenForTests();
    auth.client = null;
    signedInHint();
    await flush();
    expect(signedInHint()).toBe(false);
  });
});
