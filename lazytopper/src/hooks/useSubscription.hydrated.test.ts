/**
 * FREE-CHECK-1b · N15 — `hydrated` says whether `status` is the cloud-reconciled record
 * yet. The R9 trial offer waits on it: offering a trial off a stale local cache could
 * show a trial the rules then refuse (the write is swallowed while the UI shows one).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";

const USER = { uid: "u1" };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: USER }) }));

vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn() };
});

import { useSubscription } from "./useSubscription";
import * as svc from "../services/subscriptionService";
import type { SubscriptionStatus } from "../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const FREE: SubscriptionStatus = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null };

beforeEach(() => {
  localStorage.clear();
  hydrate.mockReset();
});
afterEach(() => cleanup());

describe("useSubscription.hydrated", () => {
  it("is false until the cloud read resolves, then true", async () => {
    let resolve!: (s: SubscriptionStatus) => void;
    hydrate.mockReturnValue(new Promise<SubscriptionStatus>((r) => (resolve = r)));
    const { result } = renderHook(() => useSubscription());
    expect(result.current.hydrated).toBe(false);
    await act(async () => resolve(FREE));
    await waitFor(() => expect(result.current.hydrated).toBe(true));
  });

  it("stays false when the cloud read rejects (never assumed)", async () => {
    hydrate.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.hydrated).toBe(false);
  });
});
