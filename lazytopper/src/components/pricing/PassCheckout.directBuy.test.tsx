import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

/**
 * OFFERS-V2 A2 - /pricing?buy=board_pass starts the existing Board Pass checkout ONCE.
 * Auto-start once, never on reload/back, never for Premium, signed-out resume, unknown values ignored, dark flag does nothing.
 */
const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession?: boolean }, loading: false }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>,
  hydrated: true,
}));
const checkout = vi.hoisted(() => ({ enabled: true, buyPass: vi.fn() }));
const track = vi.hoisted(() => ({
  trackNamedEvent: vi.fn(),
  trackBeginCheckout: vi.fn(),
  trackPurchase: vi.fn(),
  newCheckoutAttemptId: vi.fn(() => "lt_attempt"),
}));

vi.mock("./useMonthPassAvailable", () => ({ useMonthPassAvailable: () => false, fetchMonthPassAvailable: vi.fn(async () => false), resetMonthPassAvailableForTests: () => undefined }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../../analytics/analytics", () => track);
vi.mock("../../services/packs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/packs")>()),
  fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null })),
}));
vi.mock("../../services/checkout", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/checkout")>()),
  isPaymentsClientEnabled: () => checkout.enabled,
  buyPass: (...a: unknown[]) => checkout.buyPass(...a),
}));

import PassCheckout, { BOARD_PASS_BUY_PATH, readBoardPassBuy } from "./PassCheckout";

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return null;
}
function mount(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Probe />
      <Routes>
        <Route path="/pricing" element={<PassCheckout />} />
        <Route path="/login" element={<p>login</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // The price follows the founding deadline, so the clock is pinned (Date only).
  vi.useFakeTimers({ now: new Date("2026-11-02T06:30:00.000Z"), toFake: ["Date"] });
  vi.clearAllMocks();
  checkout.enabled = true;
  checkout.buyPass.mockReset();
  checkout.buyPass.mockImplementation(() => new Promise(() => undefined)); // the Razorpay sheet stays open
  mockAuth.user = { uid: "u1" };
  mockAuth.loading = false;
  mockSub.status = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null };
  mockSub.hydrated = true;
  where = "";
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("OFFERS-V2 A2 - readBoardPassBuy", () => {
  it.each([
    ["?buy=board_pass", true],
    ["?source=x&buy=board_pass", true],
    ["?buy=pack_bundle", false],
    ["?buy=Board_Pass", false],
    ["?buy=board_pass&buy=board_pass", false],
    ["?buy=", false],
    ["", false],
    ["?by=board_pass", false],
  ])("%s -> %s", (search, want) => {
    expect(readBoardPassBuy(search)).toBe(want);
  });
  it("the link every Pay button uses", () => {
    expect(BOARD_PASS_BUY_PATH).toBe("/pricing?buy=board_pass");
  });
});

describe("OFFERS-V2 A2 - /pricing?buy=board_pass", () => {
  it("a signed-in, hydrated student: the param is removed and the till-boards checkout starts exactly once", async () => {
    const c = mount("/pricing?buy=board_pass&source=scorecard");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(checkout.buyPass).toHaveBeenCalledWith("till_boards");
    expect(where).toBe("/pricing?source=scorecard");
    expect(track.trackNamedEvent).toHaveBeenCalledTimes(1);
    expect(track.trackNamedEvent).toHaveBeenCalledWith("board_pass_direct_checkout");
    expect(track.trackBeginCheckout).toHaveBeenCalledTimes(1);
    // A re-render of the same page never opens a second order.
    c.rerender(
      <MemoryRouter initialEntries={[where]}>
        <Probe />
        <PassCheckout />
      </MemoryRouter>,
    );
    await act(async () => undefined);
    expect(checkout.buyPass).toHaveBeenCalledTimes(1);
  });

  it("reload / Back lands on the stripped URL: nothing starts", async () => {
    mount("/pricing");
    await act(async () => undefined);
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(track.trackNamedEvent).not.toHaveBeenCalled();
  });

  it("waits for the subscription record: no order while it is unknown, then one once it is known", async () => {
    mockSub.hydrated = false;
    const c = mount("/pricing?buy=board_pass");
    await act(async () => undefined);
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(where).toBe("/pricing?buy=board_pass");
    mockSub.hydrated = true;
    c.rerender(
      <MemoryRouter initialEntries={["/pricing?buy=board_pass"]}>
        <Probe />
        <PassCheckout />
      </MemoryRouter>,
    );
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
  });

  it("waits while auth is still loading", async () => {
    mockAuth.loading = true;
    mount("/pricing?buy=board_pass");
    await act(async () => undefined);
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(where).toBe("/pricing?buy=board_pass");
  });

  it("Premium (a pass or an admin grant): nothing starts and no event, the param is still removed", async () => {
    mockSub.status = { ...mockSub.status, tier: "premium", passEnd: "2027-03-01T00:00:00.000Z" };
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(where).toBe("/pricing"));
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(track.trackNamedEvent).not.toHaveBeenCalled();
  });

  it("signed out: sign-in first, returning to the fixed internal path that carries the param", async () => {
    mockAuth.user = null;
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(where.startsWith("/login")).toBe(true));
    expect(where).toBe(`/login?redirect=${encodeURIComponent("/pricing?buy=board_pass")}`);
    expect(checkout.buyPass).not.toHaveBeenCalled();
  });

  it("a local (guest-like) session is treated as signed out", async () => {
    mockAuth.user = { uid: "local", isLocalSession: true };
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(where.startsWith("/login")).toBe(true));
    expect(checkout.buyPass).not.toHaveBeenCalled();
  });

  it.each(["?buy=pack_bundle", "?buy=board_pass&buy=board_pass", "?buy=%E2%82%B9", "?buy=https://evil.example", "?buy="])("unknown value %s is ignored", async (q) => {
    mount(`/pricing${q}`);
    await act(async () => undefined);
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(track.trackNamedEvent).not.toHaveBeenCalled();
    expect(where.startsWith("/pricing")).toBe(true);
  });

  it("payments switched off: nothing is mounted and nothing starts", async () => {
    checkout.enabled = false;
    mount("/pricing?buy=board_pass");
    await act(async () => undefined);
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(where).toBe("/pricing?buy=board_pass");
  });
});
