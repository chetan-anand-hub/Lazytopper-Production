/**
 * PAY-RECOVER-1 — the browser half of payment recovery.
 *
 *  - Once Razorpay's handler returned a SIGNED success, any verify error is `pending`,
 *    never `failed`; order / script failures stay `failed`.
 *  - `lazytopper.payPending` (sessionStorage) holds an ORDER ID and a counter only: written
 *    at order creation, kept on dismiss, cleared on paid / server paid, dead after 30 min.
 *  - `checkPayStatus` posts ONLY the order id to /api/pay/status, never throws, believes
 *    Premium only from a server `passEnd`, and spends at most MAX_STATUS_CHECKS_PER_ORDER.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Pin THIS file's clock (CLOCK_GUARD): the marker's 30-minute expiry reads the wall clock, and
// a pinned clock makes every assertion here independent of the real date.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T06:30:00.000Z"));
});

vi.mock("./firebaseClient", () => ({
  authClient: { currentUser: { getIdToken: async () => "id-token" } },
  firestoreDb: null,
  app: null,
}));

import {
  buyPass,
  checkPayStatus,
  clearPayPending,
  MAX_STATUS_CHECKS_PER_ORDER,
  PAY_PENDING_KEY,
  PAY_PENDING_TTL_MS,
  PAY_STATUS_ENDPOINT,
  PAYMENT_FAILED_COPY,
  PAYMENT_STILL_CONFIRMING_COPY,
  readPayPending,
  statusChecksLeft,
  writePayPending,
  type RazorpayConstructor,
} from "./checkout";

const ORDER = { orderId: "order_R1", keyId: "rzp_test_x", amountPaise: 59900 };
const SIGNED = { razorpay_payment_id: "pay_R1", razorpay_order_id: "order_R1", razorpay_signature: "sig" };

function razorpay(behaviour: "pay" | "dismiss"): RazorpayConstructor {
  return function (this: unknown, options: Record<string, unknown>) {
    return {
      open() {
        if (behaviour === "pay") (options.handler as (r: unknown) => void)(SIGNED);
        else (options.modal as { ondismiss: () => void }).ondismiss();
      },
    };
  } as unknown as RazorpayConstructor;
}

function storedMarker(): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(PAY_PENDING_KEY);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("buyPass after a signed success", () => {
  it("verify throws -> pending with the order id (and Razorpay's payment id), NEVER failed", async () => {
    for (const err of [new Error("request failed: 502"), new TypeError("Failed to fetch"), new Error("verified without a passEnd")]) {
      sessionStorage.clear();
      const out = await buyPass("month", {
        createOrder: async () => ORDER,
        loadScript: async () => razorpay("pay"),
        verify: async () => {
          throw err;
        },
      });
      expect(out).toEqual({ status: "pending", orderId: "order_R1", paymentId: "pay_R1" });
      expect(out.status).not.toBe("failed");
      // The marker survives, so the status check and the return-to-tab refresh can find it.
      expect(storedMarker()).toMatchObject({ orderId: "order_R1" });
    }
  });

  it("order creation throws -> failed, and no marker is written", async () => {
    const out = await buyPass("month", {
      createOrder: async () => {
        throw new Error("request failed: 429");
      },
      loadScript: async () => razorpay("pay"),
      verify: vi.fn(),
    });
    expect(out).toEqual({ status: "failed" });
    expect(storedMarker()).toBeNull();
  });

  it("script load throws -> failed (no checkout ever opened)", async () => {
    const verify = vi.fn();
    const out = await buyPass("month", {
      createOrder: async () => ORDER,
      loadScript: async () => {
        throw new Error("checkout.js failed to load");
      },
      verify,
    });
    expect(out).toEqual({ status: "failed" });
    expect(verify).not.toHaveBeenCalled();
  });

  it("the marker is written at order creation and KEPT on dismiss (a UPI app can finish later)", async () => {
    const out = await buyPass("till_boards", { createOrder: async () => ORDER, loadScript: async () => razorpay("dismiss"), verify: vi.fn() });
    expect(out).toEqual({ status: "dismissed" });
    const marker = storedMarker();
    expect(marker).toMatchObject({ orderId: "order_R1", checks: 0 });
    expect(typeof marker!.at).toBe("number");
    // ★ an order id and a counter — never premium state.
    expect(Object.keys(marker!).sort()).toEqual(["at", "checks", "orderId"]);
  });

  it("paid: byte-identical outcome, and the marker is cleared", async () => {
    const out = await buyPass("month", {
      createOrder: async () => ORDER,
      loadScript: async () => razorpay("pay"),
      verify: async () => ({ passEnd: "2026-11-18T06:30:00.000Z" }),
    });
    expect(out).toEqual({ status: "paid", passEnd: "2026-11-18T06:30:00.000Z", paymentId: "pay_R1", amountInr: 599 });
    expect(storedMarker()).toBeNull();
  });

  it("the confirming copy never carries the failure sentence", () => {
    expect(PAYMENT_STILL_CONFIRMING_COPY).not.toContain("didn't go through");
    expect(PAYMENT_STILL_CONFIRMING_COPY).not.toBe(PAYMENT_FAILED_COPY);
  });
});

describe("the pending marker", () => {
  it("is ignored and removed after 30 minutes", () => {
    const t0 = 1_800_000_000_000;
    writePayPending("order_old", t0);
    expect(readPayPending(t0 + PAY_PENDING_TTL_MS)).toMatchObject({ orderId: "order_old" });
    expect(readPayPending(t0 + PAY_PENDING_TTL_MS + 1)).toBeNull();
    expect(sessionStorage.getItem(PAY_PENDING_KEY)).toBeNull();
  });

  it("an unreadable marker is removed, not trusted", () => {
    sessionStorage.setItem(PAY_PENDING_KEY, "{not json");
    expect(readPayPending()).toBeNull();
    expect(sessionStorage.getItem(PAY_PENDING_KEY)).toBeNull();
  });

  it("clearPayPending(orderId) leaves a NEWER order's marker alone", () => {
    writePayPending("order_new");
    clearPayPending("order_old");
    expect(readPayPending()).toMatchObject({ orderId: "order_new" });
    clearPayPending("order_new");
    expect(readPayPending()).toBeNull();
  });
});

describe("checkPayStatus", () => {
  it("posts ONLY the order id to the status route with the caller's token", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true, state: "pending" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await checkPayStatus("order_R1")).toEqual({ state: "pending" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(PAY_STATUS_ENDPOINT);
    expect(url).toBe("/api/pay/status");
    expect(JSON.parse(init.body as string)).toEqual({ orderId: "order_R1" });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer id-token");
  });

  it("server paid -> the server's passEnd / paymentId / amountInr, and the marker is cleared", async () => {
    writePayPending("order_R1");
    const post = vi.fn(async () => ({ ok: true, state: "paid", passEnd: "2026-11-18T06:30:00.000Z", paymentId: "pay_S", amountInr: 599 }));
    expect(await checkPayStatus("order_R1", { post })).toEqual({
      state: "paid",
      passEnd: "2026-11-18T06:30:00.000Z",
      paymentId: "pay_S",
      amountInr: 599,
    });
    expect(readPayPending()).toBeNull();
  });

  it("a paid state WITHOUT a passEnd is not believed (no client-side premium)", async () => {
    writePayPending("order_R1");
    const post = vi.fn(async () => ({ ok: true, state: "paid", passEnd: null, paymentId: null, amountInr: 599 }));
    expect(await checkPayStatus("order_R1", { post })).toEqual({ state: "unknown" });
    expect(readPayPending()).toMatchObject({ orderId: "order_R1" });
  });

  it("unknown / a failed request / a 429 -> unknown, never thrown", async () => {
    expect(await checkPayStatus("order_R1", { post: async () => ({ ok: true, state: "unknown" }) })).toEqual({ state: "unknown" });
    expect(
      await checkPayStatus("order_R1", {
        post: async () => {
          throw new Error("request failed: 429");
        },
      }),
    ).toEqual({ state: "unknown" });
  });

  it(`spends at most ${MAX_STATUS_CHECKS_PER_ORDER} status calls per order in this tab (shared payments budget)`, async () => {
    writePayPending("order_R1");
    const post = vi.fn(async () => ({ ok: true, state: "pending" }));
    for (let i = 0; i < MAX_STATUS_CHECKS_PER_ORDER + 4; i += 1) await checkPayStatus("order_R1", { post });
    expect(post).toHaveBeenCalledTimes(MAX_STATUS_CHECKS_PER_ORDER);
    expect(statusChecksLeft("order_R1")).toBe(0);
    expect(MAX_STATUS_CHECKS_PER_ORDER).toBeLessThanOrEqual(6);
  });

  it("★ writes NO localStorage key at all (no tier / trial / passEnd beyond the existing cache path)", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    writePayPending("order_R1");
    await buyPass("month", { createOrder: async () => ORDER, loadScript: async () => razorpay("pay"), verify: async () => { throw new Error("x"); } });
    await checkPayStatus("order_R1", { post: async () => ({ ok: true, state: "paid", passEnd: "2026-11-18T06:30:00.000Z", paymentId: "pay_S", amountInr: 599 }) });
    const keys = setItem.mock.calls.map((c) => String(c[0]));
    expect(keys.length).toBeGreaterThan(0);
    expect(new Set(keys)).toEqual(new Set([PAY_PENDING_KEY]));
    expect(localStorage.length).toBe(0);
    for (const call of setItem.mock.calls) expect(String(call[1])).not.toMatch(/tier|trial|passEnd|premium/i);
  });
});
