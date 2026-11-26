/**
 * ORDER-DEDUP-1 - two rapid taps on a guest Pay create ONE order; a failure frees the slot (a retry creates a new order);
 * a different product is its own order. Drives the real buyAsGuest / buyForSelf with a counting createOrder.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buyAsGuest, type GuestBuyDeps, type GuestItem } from "./guestPay";
import { buyForSelf, type SelfBuyDeps } from "./checkoutWho";
import { resetOrderInFlight } from "./orderInFlight";

const PASS: GuestItem = { kind: "pass", sku: "till_boards", label: "Board Pass", description: "d" };
const PACK: GuestItem = { kind: "pack", sku: "pack_mock", target: "maths", label: "Mock Pack", description: "d" };
const PHONE = "9876543210";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

beforeEach(() => resetOrderInFlight());

describe("ORDER-DEDUP-1 · buyAsGuest", () => {
  it("two rapid taps while the order request is pending -> exactly one create-order call, one outcome", async () => {
    const gate = deferred<never>();
    const createOrder = vi.fn(() => gate.promise);
    const deps = { createOrder, loadScript: () => new Promise(() => undefined), verify: vi.fn() } as unknown as GuestBuyDeps;
    const a = buyAsGuest(PASS, PHONE, deps);
    const b = buyAsGuest(PASS, PHONE, deps);
    expect(b).toBe(a);
    expect(createOrder).toHaveBeenCalledTimes(1);
    gate.reject(new Error("net"));
    expect((await a).status).toBe("failed");
    expect((await b).status).toBe("failed");
  });

  it("after a failure the slot is free: a retry creates a NEW order", async () => {
    const createOrder = vi.fn(async () => {
      throw new Error("net");
    });
    const deps = { createOrder, loadScript: async () => class {}, verify: vi.fn() } as unknown as GuestBuyDeps;
    expect((await buyAsGuest(PASS, PHONE, deps)).status).toBe("failed");
    expect((await buyAsGuest(PASS, PHONE, deps)).status).toBe("failed");
    expect(createOrder).toHaveBeenCalledTimes(2);
  });

  it("a different product (or number) is a separate order, never reused", () => {
    const createOrder = vi.fn(() => new Promise<never>(() => undefined));
    const deps = { createOrder, loadScript: () => new Promise(() => undefined), verify: vi.fn() } as unknown as GuestBuyDeps;
    void buyAsGuest(PASS, PHONE, deps);
    void buyAsGuest(PACK, PHONE, deps);
    void buyAsGuest(PASS, "9876543211", deps);
    expect(createOrder).toHaveBeenCalledTimes(3);
  });
});

describe("ORDER-DEDUP-1 · buyForSelf", () => {
  it("two rapid taps -> one create-order call; a different product -> a second; retry after failure -> a new one", async () => {
    const gate = deferred<never>();
    const createOrder = vi.fn(() => gate.promise);
    const deps = { createOrder, loadScript: () => new Promise(() => undefined), verify: vi.fn() } as unknown as SelfBuyDeps;
    const a = buyForSelf(PASS, deps);
    expect(buyForSelf(PASS, deps)).toBe(a);
    void buyForSelf(PACK, deps);
    expect(createOrder).toHaveBeenCalledTimes(2);
    gate.reject(new Error("net"));
    expect((await a).status).toBe("failed");
    void buyForSelf(PASS, deps);
    expect(createOrder).toHaveBeenCalledTimes(3);
  });
});
