/**
 * PAY-RECOVER-1 — refresh on return, and one status for every hook instance.
 *
 *  - visibilitychange (visible) / focus: with a pending-order marker the server is asked
 *    about the order FIRST, then the entitlement is re-read; single-flight per uid, so a
 *    burst of events costs one call; at most once per minute without a marker.
 *  - the in-tab emitter: one hydration updates EVERY mounted instance (shell chrome too).
 *  - the refresh only READS: it never starts a trial.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

// Pin THIS file's clock (CLOCK_GUARD): the marker's 30-minute expiry reads the wall clock, and
// a pinned clock makes every assertion here independent of the real date.
vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-19T06:30:00.000Z"));
});

const USER = { uid: "u1" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER }) }));

vi.mock("../services/checkout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/checkout")>();
  return { ...actual, checkPayStatus: vi.fn(async () => ({ state: "pending" })) };
});

vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return {
    ...actual,
    activateTrial: vi.fn((uid: string) => actual.activateTrial(uid)),
    hydrateSubscriptionFromCloud: vi.fn(),
  };
});

import { refreshSubscriptionOnReturn, resetSubscriptionRefreshForTests, useSubscription } from "./useSubscription";
import * as svc from "../services/subscriptionService";
import * as checkout from "../services/checkout";
import type { SubscriptionStatus } from "../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const activateSpy = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;
const status = checkout.checkPayStatus as unknown as ReturnType<typeof vi.fn>;

const FREE: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };

function fireVisible() {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
  document.dispatchEvent(new Event("visibilitychange"));
}
function fireHidden() {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
  document.dispatchEvent(new Event("visibilitychange"));
}

async function mounted() {
  const hook = renderHook(() => useSubscription());
  await waitFor(() => expect(hook.result.current.hydrated).toBe(true));
  // Forget the mount's own read so each test starts from a clean throttle.
  resetSubscriptionRefreshForTests();
  hydrate.mockClear();
  return hook;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  hydrate.mockReset();
  hydrate.mockResolvedValue(FREE);
  status.mockClear();
  activateSpy.mockClear();
  resetSubscriptionRefreshForTests();
});
afterEach(() => {
  cleanup();
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
});

describe("PAY-RECOVER-1 · refresh on return", () => {
  it("a visibility event WITH a pending marker asks the status once, THEN re-reads the cloud", async () => {
    await mounted();
    checkout.writePayPending("order_R1");
    const order: string[] = [];
    status.mockImplementationOnce(async () => {
      order.push("status");
      return { state: "pending" };
    });
    hydrate.mockImplementationOnce(async () => {
      order.push("hydrate");
      return FREE;
    });
    await act(async () => fireVisible());
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
    expect(status).toHaveBeenCalledTimes(1);
    expect(status).toHaveBeenCalledWith("order_R1");
    expect(order).toEqual(["status", "hydrate"]);
  });

  it("a burst of 5 focus events -> ONE status call and ONE cloud read", async () => {
    await mounted();
    checkout.writePayPending("order_R1");
    await act(async () => {
      for (let i = 0; i < 5; i += 1) window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
    await act(async () => {});
    expect(status).toHaveBeenCalledTimes(1);
    expect(hydrate).toHaveBeenCalledTimes(1);
  });

  it("two mounted instances hear the same event but run ONE refresh (module-level single-flight)", async () => {
    renderHook(() => useSubscription());
    await mounted();
    checkout.writePayPending("order_R1");
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
    expect(status).toHaveBeenCalledTimes(1);
  });

  it("no marker: re-reads the cloud but never calls the status route; at most once per 60 s", async () => {
    await mounted();
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
    await act(async () => window.dispatchEvent(new Event("focus")));
    await act(async () => fireVisible());
    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(status).not.toHaveBeenCalled();
  });

  it("the throttle opens again after the gap (pure function, injected clock)", async () => {
    const t0 = 2_000_000_000_000;
    await refreshSubscriptionOnReturn("u9", t0);
    expect(refreshSubscriptionOnReturn("u9", t0 + 59_000)).toBeNull();
    await refreshSubscriptionOnReturn("u9", t0 + 60_000);
    expect(hydrate).toHaveBeenCalledTimes(2);
  });

  it("a hidden visibility change does nothing", async () => {
    await mounted();
    checkout.writePayPending("order_R1");
    await act(async () => fireHidden());
    expect(status).not.toHaveBeenCalled();
    expect(hydrate).not.toHaveBeenCalled();
  });

  it("a spent status budget still re-reads the cloud (the webhook's grant shows) without a status call", async () => {
    await mounted();
    sessionStorage.setItem(
      checkout.PAY_PENDING_KEY,
      JSON.stringify({ orderId: "order_R1", at: Date.now(), checks: checkout.MAX_STATUS_CHECKS_PER_ORDER }),
    );
    await act(async () => fireVisible());
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
    expect(status).not.toHaveBeenCalled();
  });

  it("the refresh only READS: no trial is ever activated (FU-SUBSCRIPTION-AUTOTRIAL-ONMOUNT)", async () => {
    const hook = await mounted();
    checkout.writePayPending("order_R1");
    await act(async () => fireVisible());
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(1));
    expect(activateSpy).not.toHaveBeenCalled();
    expect(hook.result.current.tier).toBe("free");
  });
});
