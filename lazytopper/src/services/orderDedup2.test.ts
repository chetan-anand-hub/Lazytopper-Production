// @vitest-environment jsdom
/**
 * ORDER-DEDUP-2 - the signed-in checkout paths (Board Pass `buyPass`, packs `buyPack`, top-ups `buyTopup`) create ONE order per tap:
 * a second call while the first buy is pending (create-order in flight, or the Razorpay sheet open) shares it; after a dismiss, a
 * failure or the 90 s ceiling a fresh tap creates a fresh order; the paid path is unchanged; VITE_ORDER_DEDUP2_DISABLED=1 restores
 * one order per call. Drives the real functions with counting createOrder deps.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./firebaseClient", () => ({
  authClient: { currentUser: { getIdToken: async () => "id-token" } },
  firestoreDb: null,
  app: null,
}));

import { buyPass, type BuyDeps, type RazorpayConstructor } from "./checkout";
import { buyPack, type PackBuyDeps } from "./packs";
import { buyTopup, type TopupBuyDeps } from "../components/topup/topupBuy";
import { ORDER_IN_FLIGHT_MAX_MS, __resetOrderInFlightForTests, isOrderDedup2Enabled } from "./orderInFlight";

const ORDER = { orderId: "order_D2", keyId: "rzp_test_x", amountPaise: 59900 };
const SIGNED = { razorpay_payment_id: "pay_D2", razorpay_order_id: "order_D2", razorpay_signature: "sig" };

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

/** A fake Razorpay: "pay" / "dismiss" settle at open(); "hold" keeps the sheet open until `close()` dismisses it. */
function razorpay(behaviour: "pay" | "dismiss" | "hold") {
  const opened: Array<() => void> = [];
  const ctor = function (this: unknown, options: Record<string, unknown>) {
    return {
      on() {},
      open() {
        const dismiss = () => (options.modal as { ondismiss: () => void }).ondismiss();
        if (behaviour === "pay") (options.handler as (r: unknown) => void)(SIGNED);
        else if (behaviour === "dismiss") dismiss();
        else opened.push(dismiss);
      },
    };
  } as unknown as RazorpayConstructor;
  return { ctor, opened, close: () => opened.splice(0).forEach((f) => f()) };
}

type Path = {
  name: string;
  /** deps whose createOrder is the given mock and whose Razorpay is `rz` */
  run: (createOrder: () => Promise<typeof ORDER>, rz: RazorpayConstructor) => { call: () => Promise<{ status: string }> };
};

const PATHS: Path[] = [
  {
    name: "buyPass (Board Pass, signed in)",
    run: (createOrder, rz) => {
      const deps = { createOrder, loadScript: async () => rz, verify: vi.fn(async () => ({ passEnd: "2027-03-31T18:29:59.000Z" })) } as unknown as BuyDeps;
      return { call: () => buyPass("till_boards", deps, { postPay: true }) };
    },
  },
  {
    name: "buyPack (packs, signed in)",
    run: (createOrder, rz) => {
      const deps = {
        createOrder,
        loadScript: async () => rz,
        verify: vi.fn(async () => ({ packId: "pack_chapter:triangles", sku: "pack_chapter", target: "triangles" })),
      } as unknown as PackBuyDeps;
      return { call: () => buyPack("pack_chapter", "triangles", { chapterName: "Triangles", deps }) };
    },
  },
  {
    name: "buyTopup (top-up)",
    run: (createOrder, rz) => {
      const deps = {
        createOrder,
        loadScript: async () => rz,
        verify: vi.fn(async () => true),
        status: vi.fn(async () => false),
        prefill: async () => ({}),
        wait: async () => undefined,
      } as unknown as TopupBuyDeps;
      return { call: () => buyTopup("topup_49", deps) };
    },
  },
];

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  __resetOrderInFlightForTests();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe.each(PATHS)("ORDER-DEDUP-2 · $name", ({ run }) => {
  it("double-tap while the create-order request is in flight -> createOrder called once, both taps get the same outcome", async () => {
    const gate = deferred<typeof ORDER>();
    const createOrder = vi.fn(() => gate.promise);
    const rz = razorpay("dismiss");
    const { call } = run(createOrder, rz.ctor);
    const a = call();
    const b = call();
    expect(b).toBe(a);
    expect(createOrder).toHaveBeenCalledTimes(1);
    gate.resolve(ORDER);
    expect((await a).status).toBe("dismissed");
    expect((await b).status).toBe("dismissed");
  });

  it("a tap while the Razorpay sheet is open shares it (no second order); after the dismiss a fresh tap creates a fresh order", async () => {
    const createOrder = vi.fn(async () => ORDER);
    const rz = razorpay("hold");
    const { call } = run(createOrder, rz.ctor);
    const a = call();
    await vi.waitFor(() => expect(rz.opened.length).toBe(1));
    expect(call()).toBe(a);
    expect(createOrder).toHaveBeenCalledTimes(1);
    rz.close();
    expect((await a).status).toBe("dismissed");
    const c = call();
    expect(c).not.toBe(a);
    expect(createOrder).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(rz.opened.length).toBe(1));
    rz.close();
    await c;
  });

  it("after the 90 s ceiling a fresh tap creates a fresh order (a hung request never leaves a dead Pay)", () => {
    vi.useFakeTimers({ toFake: ["performance"] });
    const createOrder = vi.fn(() => new Promise<typeof ORDER>(() => undefined));
    const { call } = run(createOrder, razorpay("dismiss").ctor);
    void call();
    vi.advanceTimersByTime(ORDER_IN_FLIGHT_MAX_MS - 1);
    void call();
    expect(createOrder).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2);
    void call();
    expect(createOrder).toHaveBeenCalledTimes(2);
  });

  it("the paid path is unchanged: one order, paid; the next purchase is a new order", async () => {
    const createOrder = vi.fn(async () => ORDER);
    const { call } = run(createOrder, razorpay("pay").ctor);
    expect((await call()).status).toBe("paid");
    expect((await call()).status).toBe("paid");
    expect(createOrder).toHaveBeenCalledTimes(2);
  });

  it("kill switch VITE_ORDER_DEDUP2_DISABLED=1 -> today's behaviour (each call its own order)", () => {
    vi.stubEnv("VITE_ORDER_DEDUP2_DISABLED", "1");
    expect(isOrderDedup2Enabled()).toBe(false);
    const createOrder = vi.fn(() => new Promise<typeof ORDER>(() => undefined));
    const { call } = run(createOrder, razorpay("dismiss").ctor);
    const a = call();
    const b = call();
    expect(b).not.toBe(a);
    expect(createOrder).toHaveBeenCalledTimes(2);
  });
});

describe("ORDER-DEDUP-2 · keys", () => {
  it("a different pack / chapter / pass type is its own order, never reused", () => {
    const createOrder = vi.fn(() => new Promise<typeof ORDER>(() => undefined));
    const rz = razorpay("dismiss").ctor;
    const packDeps = { createOrder, loadScript: async () => rz, verify: vi.fn() } as unknown as PackBuyDeps;
    void buyPack("pack_chapter", "triangles", { deps: packDeps });
    void buyPack("pack_chapter", "circles", { deps: packDeps });
    void buyPack("pack_bundle", undefined, { deps: packDeps });
    const passDeps = { createOrder, loadScript: async () => rz, verify: vi.fn() } as unknown as BuyDeps;
    void buyPass("till_boards", passDeps);
    void buyPass("month", passDeps);
    expect(createOrder).toHaveBeenCalledTimes(5);
  });
});
