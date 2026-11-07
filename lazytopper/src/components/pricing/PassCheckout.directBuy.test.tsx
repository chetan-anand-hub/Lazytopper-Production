import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor, act, fireEvent, screen } from "@testing-library/react";
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
  trackBeginCheckoutTap: vi.fn(),
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
  authHeaders: async () => ({ Authorization: "Bearer t" }),
}));
// GST-FU-1 F2: the state flag (OFF unless a test turns it on), the remembered state + PIN, and the state line above Pay.
const flag = vi.hoisted(() => ({ on: false }));
vi.mock("../../services/gstBuyerOrder", async (orig) => ({
  ...(await orig<typeof import("../../services/gstBuyerOrder")>()),
  gstStateFieldOn: () => flag.on,
}));
vi.mock("../gstInvoice/GstStateLine", () => ({
  default: () => (flag.on ? <p data-testid="gst-state-line">State: Kerala · PIN 682001 · Change</p> : null),
}));
const gst = vi.hoisted(() => ({ remembered: null as null | { stateCode: string; pin?: string }, contextReads: 0, gate: null as null | Promise<void> }));
vi.mock("../../services/gstBuyer", async (orig) => ({
  ...(await orig<typeof import("../../services/gstBuyer")>()),
  currentAuthUid: async () => "u1",
  loadGstContext: async () => {
    gst.contextReads += 1;
    if (gst.gate) await gst.gate; // review B1: hold the read open (a slow network)
    return { remembered: gst.remembered, ipStateCode: null };
  },
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
  flag.on = false;
  gst.remembered = null;
  gst.contextReads = 0;
  gst.gate = null;
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
    expect(track.trackBeginCheckoutTap).toHaveBeenCalledTimes(1);
    // BUY-PATH-1 review: the auto-start is marked `resumed` (signed in) so funnels can drop it; never suppressed.
    expect(track.trackBeginCheckoutTap.mock.calls[0].slice(1)).toEqual([true, true]);
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

  it("a Board Pass holder: nothing starts and no event, the param is still removed", async () => {
    mockSub.status = { ...mockSub.status, tier: "premium", plan: "pass_till_boards", passEnd: "2027-03-01T00:00:00.000Z" };
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(where).toBe("/pricing"));
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(track.trackNamedEvent).not.toHaveBeenCalled();
  });

  it("Premium with no readable end (a legacy grant): nothing starts and no event, the param is still removed", async () => {
    mockSub.status = { ...mockSub.status, tier: "premium", plan: "premium_monthly", passEnd: null };
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

describe("BUY-PATH-1 review - the one-tap links keep source / returnTo", () => {
  it("?buy=board_pass&source=trial-end&returnTo=... auto-starts once; only `buy` is stripped", async () => {
    mount(`/pricing?buy=board_pass&source=trial-end&returnTo=${encodeURIComponent("/practice?x=1")}`);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(where).toBe(`/pricing?source=trial-end&returnTo=${encodeURIComponent("/practice?x=1")}`);
  });
});

/** GST-FU-1 F1 (owner, 8 Nov 2026: "1. Yes") - a month-pass holder on a Board Pass link gets the Board Pass upgrade start. */
describe("GST-FU-1 F1 · a running month pass + ?buy=board_pass", () => {
  const MONTH = { tier: "premium", plan: "pass_month", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: "2026-11-20T00:00:00.000Z" };

  it("★ starts the Board Pass checkout once - the same start as tapping the visible upgrade Pay", async () => {
    mockSub.status = { ...MONTH };
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(checkout.buyPass).toHaveBeenCalledWith("till_boards");
    expect(where).toBe("/pricing");
    expect(track.trackNamedEvent).toHaveBeenCalledWith("board_pass_direct_checkout");
    expect(screen.getByTestId("pass-checkout-upsell")).toBeTruthy();
  });

  it("CONTROL: the visible upgrade Pay on /pricing makes exactly the same call", async () => {
    mockSub.status = { ...MONTH };
    const c = mount("/pricing");
    await act(async () => undefined);
    expect(checkout.buyPass).not.toHaveBeenCalled();
    fireEvent.click(c.container.querySelector(".lt-pricing-pay--boards") as HTMLElement);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(checkout.buyPass).toHaveBeenCalledWith("till_boards");
  });

  it("an admin grant with an end date (pass_extension) is upgradeable too; an ENDED month pass is not premium here", async () => {
    mockSub.status = { ...MONTH, plan: "pass_extension" };
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
  });
});

/**
 * GST-FU-1 F2 (owner-approved follow-up, 7 Nov 2026) - a signed-in ?buy=board_pass with a REMEMBERED state + PIN went straight into
 * Razorpay, covering "State: X · Change". Flag on + remembered: stop at Pay (line + total visible, Pay focused), one tap to Razorpay.
 */
describe("GST-FU-1 F2 · ?buy=board_pass with a remembered state", () => {
  it("★ flag on + remembered: no order yet; the state line and the GST total are shown, Pay is focused; ONE tap opens Razorpay", async () => {
    vi.setSystemTime(new Date("2026-11-08T06:30:00.000Z")); // after the GST cut-off: the "+ GST = total" line shows
    flag.on = true;
    gst.remembered = { stateCode: "32", pin: "682001" };
    const c = mount("/pricing?buy=board_pass");
    const pay = c.container.querySelector(".lt-pricing-pay--boards") as HTMLElement;
    await waitFor(() => expect(document.activeElement).toBe(pay));
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(screen.getByTestId("gst-state-line")).toBeTruthy();
    expect(screen.getByTestId("pass-checkout-gst").textContent).toMatch(/GST/);
    fireEvent.click(pay);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(checkout.buyPass).toHaveBeenCalledWith("till_boards");
  });

  it("★ a month-pass holder with a remembered state: the line shows above the upgrade Pay, which is focused (F1 + F2)", async () => {
    flag.on = true;
    gst.remembered = { stateCode: "32", pin: "682001" };
    mockSub.status = { tier: "premium", plan: "pass_month", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: "2026-11-20T00:00:00.000Z" };
    const c = mount("/pricing?buy=board_pass");
    const pay = c.container.querySelector(".lt-pricing-pay--boards") as HTMLElement;
    await waitFor(() => expect(document.activeElement).toBe(pay));
    expect(checkout.buyPass).not.toHaveBeenCalled();
    expect(screen.getByTestId("gst-state-line")).toBeTruthy();
  });

  it("CONTROL: flag on, nothing remembered -> starts at once as today (the order step asks state + PIN)", async () => {
    flag.on = true;
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(gst.contextReads).toBe(1);
  });

  it("CONTROL: flag off -> starts at once exactly as before; the state context is never read", async () => {
    gst.remembered = { stateCode: "32", pin: "682001" };
    mount("/pricing?buy=board_pass");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(gst.contextReads).toBe(0);
  });
});

/** GST-FU-1 review: B1 (a tap during the pending remembered-state read never starts a second order) and F4 (analytics kept). */
describe("GST-FU-1 review · ?buy=board_pass held at Pay", () => {
  it("★ B1: Pay tapped WHILE the remembered-state read is pending, then 'nothing remembered' -> buyPass ONCE (the tap), never a second", async () => {
    flag.on = true;
    gst.remembered = null;
    let open: () => void = () => undefined;
    gst.gate = new Promise<void>((r) => {
      open = r;
    });
    const c = mount("/pricing?buy=board_pass");
    await waitFor(() => expect(gst.contextReads).toBe(1));
    expect(checkout.buyPass).not.toHaveBeenCalled();
    fireEvent.click(c.container.querySelector(".lt-pricing-pay--boards") as HTMLElement);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    await act(async () => {
      open();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(checkout.buyPass).toHaveBeenCalledTimes(1);
  });

  it("★ B1: the same race after the tap's checkout was CLOSED (busy cleared) -> still no second start", async () => {
    flag.on = true;
    checkout.buyPass.mockImplementation(async () => ({ status: "dismissed" }));
    let open: () => void = () => undefined;
    gst.gate = new Promise<void>((r) => {
      open = r;
    });
    const c = mount("/pricing?buy=board_pass");
    await waitFor(() => expect(gst.contextReads).toBe(1));
    fireEvent.click(c.container.querySelector(".lt-pricing-pay--boards") as HTMLElement);
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    await act(async () => {
      open();
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(checkout.buyPass).toHaveBeenCalledTimes(1);
  });

  it("★ F4: the tap on a held Pay keeps the auto-start's `resumed` mark (same event, same values as the auto-start sent)", async () => {
    flag.on = true;
    gst.remembered = { stateCode: "32", pin: "682001" };
    const c = mount("/pricing?buy=board_pass");
    const pay = c.container.querySelector(".lt-pricing-pay--boards") as HTMLElement;
    await waitFor(() => expect(document.activeElement).toBe(pay));
    expect(track.trackBeginCheckoutTap).not.toHaveBeenCalled();
    fireEvent.click(pay);
    await waitFor(() => expect(track.trackBeginCheckoutTap).toHaveBeenCalledTimes(1));
    expect(track.trackBeginCheckoutTap.mock.calls[0].slice(1)).toEqual([true, true]);
  });
});
