/** BRIDGE-PDF-1 review FU-7: the pack files' Board Pass box is decided from the RESOLVED entitlement, never a not-yet-loaded cache. */
import { describe, expect, it, vi, beforeEach } from "vitest";

const state = { cached: "free" as "free" | "premium", hydrate: vi.fn() };
const listeners = new Set<(uid: string, s: { tier: string }) => void>();
vi.mock("../../services/subscriptionService", () => ({
  loadSubscription: () => ({ tier: state.cached }),
  isPaidPremium: (s: { tier?: string } | null) => s?.tier === "premium",
  onSubscriptionHydrated: (l: (uid: string, s: { tier: string }) => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  hydrateSubscriptionFromCloud: (uid: string) => state.hydrate(uid),
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import { resolvePaidBoardPass } from "./usePaidPremium";

const emit = (uid: string, tier: string) => listeners.forEach((l) => l(uid, { tier }));

beforeEach(() => {
  state.cached = "free";
  state.hydrate = vi.fn(async () => undefined);
  listeners.clear();
});

describe("resolvePaidBoardPass", () => {
  it("cache already says paid -> true, no cloud read", async () => {
    state.cached = "premium";
    expect(await resolvePaidBoardPass("u1")).toBe(true);
    expect(state.hydrate).not.toHaveBeenCalled();
  });
  it("fresh device (cache = Basic default): waits for the cloud -> a holder is true, a Basic student false", async () => {
    state.hydrate = vi.fn(async (uid: string) => emit(uid, "premium"));
    expect(await resolvePaidBoardPass("u1")).toBe(true);
    state.hydrate = vi.fn(async (uid: string) => emit(uid, "free"));
    expect(await resolvePaidBoardPass("u1")).toBe(false);
  });
  it("the cloud does not answer in time (or fails) -> null (unknown: the box is left out)", async () => {
    expect(await resolvePaidBoardPass("u1", 20)).toBeNull();
    state.hydrate = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await resolvePaidBoardPass("u1", 1000)).toBeNull();
    expect(await resolvePaidBoardPass("")).toBeNull();
  });
  it("another student's hydration event is ignored", async () => {
    state.hydrate = vi.fn(async () => emit("someone-else", "premium"));
    expect(await resolvePaidBoardPass("u1", 30)).toBeNull();
  });
});
