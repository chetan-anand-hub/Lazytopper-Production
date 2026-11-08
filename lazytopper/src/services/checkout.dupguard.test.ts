/**
 * MONEY-DUPGUARD-1 — the server refuses a PASS order from an account already covered till the boards (409
 * `already_covered`). The browser turns that into its own outcome: no Razorpay checkout, no pending marker, no failure.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buyPass,
  PayAlreadyCoveredError,
  PayAlreadyOwnedError,
  PAY_PENDING_KEY,
  type BuyDeps,
  type RazorpayConstructor,
} from "./checkout";

vi.mock("./firebaseClient", () => ({ authClient: { currentUser: { getIdToken: async () => "tok" } } }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  try {
    sessionStorage.clear();
  } catch {
    /* no storage */
  }
});

function stubFetch(status: number, json: unknown) {
  const calls: Array<{ url: string; body: unknown }> = [];
  vi.stubGlobal("fetch", async (url: string, init: { body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) });
    return { ok: status < 400, status, json: async () => json } as Response;
  });
  return calls;
}

function neverOpened() {
  const constructed = vi.fn();
  const Ctor = function (this: unknown) {
    constructed();
    return { open: () => undefined };
  } as unknown as RazorpayConstructor;
  return { Ctor, constructed };
}

describe("MONEY-DUPGUARD-1 · createPayOrder", () => {
  it("409 already_covered -> PayAlreadyCoveredError (not the packs-only PayAlreadyOwnedError)", async () => {
    const { createPayOrder } = await import("./checkout");
    const calls = stubFetch(409, { ok: false, error: "already_covered", message: "x" });
    const err = await createPayOrder("till_boards").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PayAlreadyCoveredError);
    expect(err).not.toBeInstanceOf(PayAlreadyOwnedError);
    expect(calls).toEqual([{ url: "/api/pay/order", body: { passType: "till_boards" } }]);
  });

  it("other refusals keep their old mapping: 409 already_owned stays PayAlreadyOwnedError; 409 month_pass_retired / 500 are generic", async () => {
    const { createPayOrder } = await import("./checkout");
    stubFetch(409, { ok: false, error: "already_owned" });
    await expect(createPayOrder("till_boards")).rejects.toBeInstanceOf(PayAlreadyOwnedError);
    for (const [status, json] of [
      [409, { ok: false, error: "month_pass_retired" }],
      [500, { ok: false, error: "Could not price this pass." }],
      [200, { ok: false, error: "already_covered" }], // only a 409 is believed
    ] as const) {
      stubFetch(status, json);
      const err = await createPayOrder("month").catch((e: unknown) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err).not.toBeInstanceOf(PayAlreadyCoveredError);
    }
  });
});

describe("MONEY-DUPGUARD-1 · buyPass", () => {
  it("the order refused as already_covered -> { status: 'already_covered' }; Razorpay never constructed, no verify, no pending marker", async () => {
    const { Ctor, constructed } = neverOpened();
    const verify = vi.fn();
    const deps: BuyDeps = {
      createOrder: vi.fn(async () => {
        throw new PayAlreadyCoveredError();
      }),
      loadScript: async () => Ctor,
      verify,
    };
    for (const passType of ["till_boards", "month"] as const) {
      expect(await buyPass(passType, deps)).toEqual({ status: "already_covered" });
    }
    expect(constructed).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(PAY_PENDING_KEY)).toBeNull();
  });

  it("end to end through the real order call: a 409 already_covered response is the already_covered outcome", async () => {
    const { createPayOrder } = await import("./checkout");
    stubFetch(409, { ok: false, error: "already_covered" });
    const { Ctor, constructed } = neverOpened();
    const out = await buyPass("till_boards", { createOrder: createPayOrder, loadScript: async () => Ctor, verify: vi.fn() });
    expect(out).toEqual({ status: "already_covered" });
    expect(constructed).not.toHaveBeenCalled();
  });

  it("any other order failure is still 'failed' (unchanged)", async () => {
    const { Ctor } = neverOpened();
    const out = await buyPass("till_boards", {
      createOrder: vi.fn(async () => {
        throw new Error("request failed: 500");
      }),
      loadScript: async () => Ctor,
      verify: vi.fn(),
    });
    expect(out).toEqual({ status: "failed" });
  });
});
