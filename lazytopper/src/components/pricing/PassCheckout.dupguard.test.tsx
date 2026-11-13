import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * MONEY-DUPGUARD-1 — the server refused a pass order: this account's pass already runs to the boards. The signed-in pass
 * flow shows ONE calm line, never opens Razorpay, never shows the failure sentence, and leaves no Pay button to tap again.
 * Everyone else (month-pass upgrade, Basic, trial) is unchanged.
 */

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>,
  hydrated: true,
}));
const mockHydrate = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("./useMonthPassAvailable", () => ({
  useMonthPassAvailable: () => false,
  fetchMonthPassAvailable: vi.fn(async () => false),
  resetMonthPassAvailableForTests: () => undefined,
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: mockHydrate }));
vi.mock("../../services/packs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../services/packs")>()),
  fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null })),
}));
vi.mock("../../services/firebaseClient", () => ({
  authClient: { currentUser: { getIdToken: async () => "id-token" } },
  firestoreDb: null,
  app: null,
}));

import PassCheckout, { PassCheckoutView, tillBoardsButtonLabel } from "./PassCheckout";
import { PASS_ALREADY_COVERED_COPY, PAYMENT_FAILED_COPY, resetCheckoutScriptForTests, type BuyOutcome } from "../../services/checkout";

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-10T06:30:00.000Z"), toFake: ["Date"] });
  mockAuth.user = null;
  mockSub.status = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null };
  mockSub.hydrated = true;
  mockHydrate.mockClear();
  resetCheckoutScriptForTests();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function view(overrides: Partial<Parameters<typeof PassCheckoutView>[0]> = {}) {
  const props = {
    signedIn: true,
    showMonth: false,
    offerOpen: true,
    activePassEnd: null,
    onSignIn: vi.fn(),
    onBuy: vi.fn(async (): Promise<BuyOutcome> => ({ status: "already_covered" })),
    ...overrides,
  };
  render(<PassCheckoutView {...props} />);
  return props;
}

describe("MONEY-DUPGUARD-1 · PassCheckoutView", () => {
  it("an already_covered outcome -> the calm line (role=status), no failure sentence, and no Pay button left to tap", async () => {
    const props = view();
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    const note = await screen.findByTestId("pass-checkout-already-covered");
    expect(note.textContent).toBe(PASS_ALREADY_COVERED_COPY);
    expect(note.getAttribute("role")).toBe("status");
    expect(props.onBuy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("pass-checkout-failed")).toBeNull();
    expect(document.body.textContent).not.toContain(PAYMENT_FAILED_COPY);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByTestId("pass-checkout-repay")).toBeNull();
  });

  it("a running MONTH pass: the Board Pass upgrade still buys as before (a paid outcome, no covered line)", async () => {
    const props = view({
      activePassEnd: "2026-12-05T06:30:00.000Z",
      activePlan: "pass_month",
      onBuy: vi.fn(async (): Promise<BuyOutcome> => ({ status: "paid", passEnd: "2027-02-17T18:29:59.999Z" })),
    });
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    await screen.findByTestId("pass-checkout-paid");
    expect(props.onBuy).toHaveBeenCalledWith("till_boards", { postPay: true });
    expect(screen.queryByTestId("pass-checkout-already-covered")).toBeNull();
  });
});

describe("MONEY-DUPGUARD-1 · connected (real buyPass, server answers 409 already_covered)", () => {
  it("never constructs Razorpay, shows the calm line, and refreshes the subscription from the server", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    mockAuth.user = { uid: "u1" };
    const constructed = vi.fn();
    vi.stubGlobal(
      "Razorpay",
      function () {
        constructed();
        return { open: () => undefined };
      },
    );
    const fetchSpy = vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => ({ ok: false, error: "already_covered", message: "Your pass already covers you till your boards." }),
    }));
    vi.stubGlobal("fetch", fetchSpy);
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <PassCheckout />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: tillBoardsButtonLabel() }));
    expect((await screen.findByTestId("pass-checkout-already-covered")).textContent).toBe(PASS_ALREADY_COVERED_COPY);
    expect(constructed).not.toHaveBeenCalled();
    const orderCalls = fetchSpy.mock.calls.filter((c) => (c as unknown as [string])[0] === "/api/pay/order");
    expect(orderCalls).toHaveLength(1);
    await waitFor(() => expect(mockHydrate).toHaveBeenCalledWith("u1"));
    expect(screen.queryByTestId("pass-checkout-failed")).toBeNull();
  });
});
