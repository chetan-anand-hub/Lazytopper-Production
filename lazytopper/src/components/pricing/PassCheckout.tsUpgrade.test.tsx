import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

/**
 * TS-UPGRADE-CREDIT-1 (owner ruling 19 Nov 2026) - a Test Series Pack owner sees the Board Pass as an UPGRADE: "Upgrade for
 * ₹918 + GST — you've already paid for the Test Series", the breakup beside Pay and the Pay button all from the SERVER's
 * numbers (/api/packs/mine). Everyone else renders exactly as before (byte-identical markup).
 */

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>,
  hydrated: true,
}));
vi.mock("./useMonthPassAvailable", () => ({
  useMonthPassAvailable: () => false,
  fetchMonthPassAvailable: vi.fn(async () => false),
  resetMonthPassAvailableForTests: () => undefined,
}));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../../services/subscriptionService", () => ({ hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
const mockMine = vi.hoisted(() => ({ boardPassCredit: null as unknown }));
vi.mock("../../services/packs", async (importOriginal) => {
  const real = await importOriginal<typeof import("../../services/packs")>();
  return {
    ...real,
    // The REAL parsing of the server body, so the test goes through what fetchMyPacks returns.
    fetchMyPacks: vi.fn(async () => {
      const ts = real.readTestSeriesUpgrade(mockMine.boardPassCredit);
      return { packs: [], licensee: { name: "", email: "" }, boardPassCredit: real.readBoardPassCredit(mockMine.boardPassCredit), ...(ts ? { testSeriesUpgrade: ts } : {}) };
    }),
  };
});
vi.mock("../../services/firebaseClient", () => ({
  authClient: { currentUser: { getIdToken: async () => "id-token" } },
  firestoreDb: null,
  app: null,
}));

import PassCheckout, { PassCheckoutView, tillBoardsButtonLabel, tsUpgradeLine, tsUpgradeBreakdown, tsUpgradePayLabel } from "./PassCheckout";
import { readTestSeriesUpgrade, readBoardPassCredit } from "../../services/packs";

const FOUNDING = { creditInr: 999, expiresAtMs: null, payInr: 1083, kind: "test_series_upgrade", baseInr: 918, gstInr: 165, fullBaseInr: 1917 };
const AFTER = { creditInr: 999, expiresAtMs: null, payInr: 1770, kind: "test_series_upgrade", baseInr: 1500, gstInr: 270, fullBaseInr: 2499 };
const UP = { creditInr: 999, fullBaseInr: 1917, baseInr: 918, gstInr: 165, payInr: 1083 };

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-11-20T06:30:00.000Z"), toFake: ["Date"] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllEnvs();
  mockAuth.user = null;
  mockMine.boardPassCredit = null;
});

function props(overrides: Partial<Parameters<typeof PassCheckoutView>[0]> = {}) {
  return {
    signedIn: true,
    showMonth: false,
    offerOpen: true,
    activePassEnd: null,
    onSignIn: vi.fn(),
    onBuy: vi.fn(async () => ({ status: "dismissed" as const })),
    ...overrides,
  };
}

describe("TS-UPGRADE-CREDIT-1 · reading the server's upgrade", () => {
  it("parses only a complete, self-consistent upgrade; the PACK-CREDIT-1 reader ignores it (no 7-day deadline)", () => {
    expect(readTestSeriesUpgrade(FOUNDING)).toEqual(UP);
    expect(readTestSeriesUpgrade(AFTER)).toEqual({ creditInr: 999, fullBaseInr: 2499, baseInr: 1500, gstInr: 270, payInr: 1770 });
    expect(readBoardPassCredit(FOUNDING)).toBeNull();
    for (const bad of [
      null,
      { creditInr: 0, expiresAtMs: null, payInr: null },
      { ...FOUNDING, kind: undefined },
      { ...FOUNDING, payInr: 1084 },
      { ...FOUNDING, baseInr: 919 },
      { ...FOUNDING, gstInr: "165" },
      { creditInr: 49, expiresAtMs: 1, payInr: 2213 },
    ]) {
      expect(readTestSeriesUpgrade(bad)).toBeNull();
    }
  });

  it("the copy: the owner's sentence, the breakup and the Pay label name the server's figures", () => {
    expect(tsUpgradeLine(UP)).toBe("Upgrade for ₹918 + GST — you've already paid for the Test Series");
    expect(tsUpgradeBreakdown(UP)).toBe("₹918 + ₹165 GST (18%) = ₹1,083");
    expect(tsUpgradePayLabel(UP)).toBe("Pay ₹1,083 once till your boards");
  });
});

describe("TS-UPGRADE-CREDIT-1 · the buy area (/pricing card, /board-pass hero: both render PassCheckout)", () => {
  it("a signed-in Test Series owner: the upgrade line, the breakup beside Pay, and Pay ₹1,083", () => {
    render(<PassCheckoutView {...props({ tsUpgrade: UP })} />);
    expect(screen.getByTestId("pass-checkout-ts-upgrade").textContent).toBe("Upgrade for ₹918 + GST — you've already paid for the Test Series");
    expect(screen.getByTestId("pass-checkout-gst").textContent).toBe("₹918 + ₹165 GST (18%) = ₹1,083");
    expect(screen.getByRole("button", { name: "Pay ₹1,083 once till your boards" })).toBeTruthy();
    expect(screen.getByTestId("pass-checkout-ts-upgrade").getAttribute("style")).toBeNull();
  });

  it("everyone else is BYTE-IDENTICAL: no upgrade (null / absent), signed out, or a PACK-CREDIT-1 credit present", () => {
    const base = renderToStaticMarkup(<PassCheckoutView {...props()} />);
    expect(renderToStaticMarkup(<PassCheckoutView {...props({ tsUpgrade: null })} />)).toBe(base);
    expect(base).toContain(tillBoardsButtonLabel());
    expect(base).not.toContain("Test Series");
    const out = renderToStaticMarkup(<PassCheckoutView {...props({ signedIn: false })} />);
    expect(renderToStaticMarkup(<PassCheckoutView {...props({ signedIn: false, tsUpgrade: UP })} />)).toBe(out);
    const credit = { creditInr: 49, expiresAtMs: Date.parse("2026-11-21T06:30:00.000Z"), payInr: 2213 };
    const credited = renderToStaticMarkup(<PassCheckoutView {...props({ packCredit: credit })} />);
    expect(renderToStaticMarkup(<PassCheckoutView {...props({ packCredit: credit, tsUpgrade: UP })} />)).toBe(credited);
  });

  it("a running month pass: no upgrade line (the notice slot is the pass's), but Pay still names the server's upgrade total", () => {
    render(<PassCheckoutView {...props({ tsUpgrade: UP, activePassEnd: "2026-12-10T00:00:00.000Z", activePlan: "pass_month" })} />);
    expect(screen.queryByTestId("pass-checkout-ts-upgrade")).toBeNull();
    expect(screen.getByRole("button", { name: "Pay ₹1,083 once till your boards" })).toBeTruthy();
  });

  it("connected: the line comes from /api/packs/mine for a signed-in owner; a non-owner's /mine (no credit) shows today's Pay", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    mockAuth.user = { uid: "ts1" };
    mockMine.boardPassCredit = FOUNDING;
    render(<MemoryRouter initialEntries={["/pricing"]}><PassCheckout /></MemoryRouter>);
    expect((await screen.findByTestId("pass-checkout-ts-upgrade")).textContent).toBe("Upgrade for ₹918 + GST — you've already paid for the Test Series");
    expect(screen.getByRole("button", { name: "Pay ₹1,083 once till your boards" })).toBeTruthy();
    cleanup();
    mockAuth.user = { uid: "plain" };
    mockMine.boardPassCredit = { creditInr: 0, expiresAtMs: null, payInr: null };
    render(<MemoryRouter initialEntries={["/pricing"]}><PassCheckout /></MemoryRouter>);
    await Promise.resolve();
    expect(screen.queryByTestId("pass-checkout-ts-upgrade")).toBeNull();
    expect(screen.getByRole("button", { name: tillBoardsButtonLabel() })).toBeTruthy();
  });
});
