import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = { user: { uid: "u1" } as { uid: string } | null };
const sub = { tier: "free", hydrated: true, cloudConfirmed: true };
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("./useSubscription", () => ({ useSubscription: () => sub }));

import { useQpWrittenWall } from "./useQpWrittenWall";

beforeEach(() => {
  auth.user = { uid: "u1" };
  sub.tier = "free";
  sub.hydrated = true;
  sub.cloudConfirmed = true;
});

describe("GATE-QP-1 · useQpWrittenWall", () => {
  it("cloud error (tier only from cache/default, even if hydrated): NO wall - fails open", () => {
    sub.cloudConfirmed = false;
    expect(renderHook(() => useQpWrittenWall()).result.current).toBe(false);
  });
  it("success-premium: no wall", () => {
    sub.tier = "premium";
    expect(renderHook(() => useQpWrittenWall()).result.current).toBe(false);
  });
  it("true for a hydrated free (Basic / Test Series-only) account", () => {
    expect(renderHook(() => useQpWrittenWall()).result.current).toBe(true);
  });
  it("false for the trial and for the Board Pass", () => {
    sub.tier = "trial";
    expect(renderHook(() => useQpWrittenWall()).result.current).toBe(false);
    sub.tier = "premium";
    expect(renderHook(() => useQpWrittenWall()).result.current).toBe(false);
  });
  it("false while the subscription is not hydrated, and when signed out", () => {
    sub.hydrated = false;
    sub.cloudConfirmed = false;
    expect(renderHook(() => useQpWrittenWall()).result.current).toBe(false);
    sub.hydrated = true;
    sub.cloudConfirmed = true;
    auth.user = null;
    expect(renderHook(() => useQpWrittenWall()).result.current).toBe(false);
  });
});
