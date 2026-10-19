/**
 * PAY-RECOVER-1 · P8 — the local cache write used to emit nothing, so a hydration run by ONE
 * `useSubscription` instance (e.g. the buy area after a payment) left every other instance
 * (the shell chrome) stale until a remount. The in-tab emitter in subscriptionService hands
 * every cloud-reconciled status to every instance for that uid.
 *
 * The REAL hydrateSubscriptionFromCloud runs here; only the Firestore read is faked.
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

const cloud = vi.hoisted(() => ({ doc: null as null | Record<string, unknown>, fail: false }));
vi.mock("../services/firestoreSdk", () => ({
  isFirestoreEnabled: () => true,
  withFirestore: async (use: (h: unknown) => unknown) =>
    use({
      db: {},
      fs: {
        doc: () => ({}),
        getDoc: async () => {
          if (cloud.fail) throw new Error("offline");
          return { exists: () => cloud.doc !== null, data: () => cloud.doc };
        },
        setDoc: async () => undefined,
        serverTimestamp: () => ({}),
      },
    }),
}));

import { resetSubscriptionRefreshForTests, useSubscription } from "./useSubscription";
import { hydrateSubscriptionFromCloud, onSubscriptionHydrated } from "../services/subscriptionService";

const PASS_END = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  cloud.doc = null;
  cloud.fail = false;
  resetSubscriptionRefreshForTests();
});
afterEach(cleanup);

describe("PAY-RECOVER-1 · in-tab subscription emitter", () => {
  it("two hook instances BOTH take the new status after ONE hydrate", async () => {
    const a = renderHook(() => useSubscription());
    const b = renderHook(() => useSubscription());
    await waitFor(() => expect(a.result.current.hydrated && b.result.current.hydrated).toBe(true));
    expect(a.result.current.tier).toBe("free");
    expect(b.result.current.tier).toBe("free");

    // The server's grant lands (verify / webhook / status) — one instance's caller re-reads.
    cloud.doc = { tier: "premium", plan: "pass_month", premiumSince: new Date().toISOString(), passEnd: PASS_END };
    await act(async () => {
      await hydrateSubscriptionFromCloud("u1");
    });
    expect(a.result.current.isPremium).toBe(true);
    expect(b.result.current.isPremium).toBe(true);
    expect(b.result.current.status.passEnd).toBe(PASS_END);
  });

  it("a status for another uid is ignored", async () => {
    const a = renderHook(() => useSubscription());
    await waitFor(() => expect(a.result.current.hydrated).toBe(true));
    cloud.doc = { tier: "premium", plan: "pass_month", premiumSince: new Date().toISOString(), passEnd: PASS_END };
    await act(async () => {
      await hydrateSubscriptionFromCloud("someone-else");
    });
    expect(a.result.current.isPremium).toBe(false);
  });

  it("a FAILED cloud read emits nothing (the cache is not a reconciled status)", async () => {
    const seen: string[] = [];
    const off = onSubscriptionHydrated((uid) => seen.push(uid));
    try {
      await hydrateSubscriptionFromCloud("u1");
      expect(seen).toEqual(["u1"]); // CONTROL: a successful read does emit
      cloud.fail = true;
      await hydrateSubscriptionFromCloud("u1");
      expect(seen).toEqual(["u1"]);
    } finally {
      off();
    }
  });

  it("★ only the existing cache key is written to localStorage (no new tier / trial / passEnd key)", async () => {
    const a = renderHook(() => useSubscription());
    await waitFor(() => expect(a.result.current.hydrated).toBe(true));
    cloud.doc = { tier: "premium", plan: "pass_month", premiumSince: new Date().toISOString(), passEnd: PASS_END };
    resetSubscriptionRefreshForTests(); // past the post-mount throttle
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(a.result.current.isPremium).toBe(true));
    const keys = Object.keys(localStorage);
    expect(keys).toEqual(["lazytopper.subscription.v1:u1"]);
  });
});
