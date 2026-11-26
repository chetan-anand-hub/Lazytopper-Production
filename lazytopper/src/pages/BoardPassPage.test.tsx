/**
 * PRICING-PAGES-1 - /board-pass. The page is additive: its Pay is /pricing's PassCheckout (unchanged), so these tests pin what the
 * PAGE adds: the copy (owner words, the bank claims, prices from config), the states (signed out, Basic, Board Pass owner, month pass,
 * payments dark), `?buy=board_pass` reaching the same checkout and leaving the URL, the nav links, and the banned words.
 */
import { fairUseFaq } from "../components/salesPages/salesPagesCopy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T10:00:00+05:30"));
});

const mockAuth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string }, loading: false }));
const mockSub = vi.hoisted(() => ({
  status: { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null } as Record<string, unknown>,
  hydrated: true,
  isTrialActive: false,
  daysLeftInTrial: 0,
  startTrial: vi.fn(),
}));
const checkout = vi.hoisted(() => ({ enabled: true, buyPass: vi.fn() }));
const track = vi.hoisted(() => ({ paywall: vi.fn(), named: vi.fn(), begin: vi.fn() }));
const who = vi.hoisted(() => ({ on: false }));
const credit = vi.hoisted(() => ({ value: null as null | { creditInr: number; payInr: number; expiresAtMs: number } }));

vi.mock("../context/AuthContext", () => ({ useAuth: () => mockAuth }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => mockSub }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../components/pricing/useMonthPassAvailable", () => ({ useMonthPassAvailable: () => false, fetchMonthPassAvailable: vi.fn(async () => false), resetMonthPassAvailableForTests: () => undefined }));
vi.mock("../services/subscriptionService", async (orig) => ({ ...(await orig<typeof import("../services/subscriptionService")>()), hydrateSubscriptionFromCloud: vi.fn(async () => ({})) }));
vi.mock("../services/packs", async (orig) => ({
  ...(await orig<typeof import("../services/packs")>()),
  fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: credit.value })),
}));
vi.mock("../services/checkout", async (orig) => ({
  ...(await orig<typeof import("../services/checkout")>()),
  isPaymentsClientEnabled: () => checkout.enabled,
  buyPass: (...a: unknown[]) => checkout.buyPass(...a),
  authHeaders: async () => ({ Authorization: "Bearer t" }),
}));
vi.mock("../services/checkoutWhoFlag", async (orig) => ({ ...(await orig<typeof import("../services/checkoutWhoFlag")>()), isCheckoutWhoClientEnabled: () => who.on }));
vi.mock("../services/guestPay", async (orig) => ({ ...(await orig<typeof import("../services/guestPay")>()), isGuestPayClientEnabled: () => false }));
vi.mock("../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../analytics/analytics")>()),
  trackPaywallAction: (...a: unknown[]) => track.paywall(...a),
  trackNamedEvent: (...a: unknown[]) => track.named(...a),
  trackBeginCheckoutTap: (...a: unknown[]) => track.begin(...a),
}));

import BoardPassPage from "./BoardPassPage";
import { currentSalesPageSurface } from "../analytics/analytics";
import { tillBoardsButtonLabel } from "../components/pricing/PassCheckout";
import { PRICING_MANUAL_PAYMENTS_OFF } from "./PricingPage";
import { BANK_CBQS_CLAIM, BANK_QUESTIONS_CLAIM } from "../lib/packs/packLabels";
import { BP_H1, BP_MANUAL_PAYMENTS_OFF, BP_OWNER_TITLE, BP_PREBOARDS_LINE } from "../components/salesPages/salesPagesCopy";
import { packPriceLabel } from "../services/packs";

let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}`;
  return null;
}
async function mount(entry = "/board-pass") {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        <Routes>
          <Route path="/board-pass" element={<BoardPassPage />} />
          <Route path="/login" element={<p>login page</p>} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const DAY = 86_400_000;
beforeEach(() => {
  mockAuth.user = null;
  mockSub.status = { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: null };
  mockSub.hydrated = true;
  mockSub.isTrialActive = false;
  mockSub.startTrial.mockReset();
  checkout.enabled = true;
  checkout.buyPass.mockReset();
  checkout.buyPass.mockImplementation(() => new Promise(() => undefined)); // the Razorpay sheet stays open
  track.paywall.mockReset();
  track.named.mockReset();
  track.begin.mockReset();
  where = "";
  who.on = false;
  credit.value = null;
});
afterEach(() => cleanup());

describe("PRICING-PAGES-1 /board-pass - signed out (what the prerender captures)", () => {
  it("one H1 with the owner's words, the 1-minute tile, the bank claims from the constants, the tutor box", async () => {
    await mount();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(BP_H1);
    expect(BP_H1).toBe("Board Pass: your answers marked like a CBSE examiner");
    expect(screen.getByText("1 MINUTE")).toBeTruthy();
    expect(screen.getByText("CBSE-style marking of your answer")).toBeTruthy();
    expect(screen.getByTestId("bp-tile-questions").textContent).toContain(BANK_QUESTIONS_CLAIM);
    expect(screen.getByTestId("bp-tile-cbqs").textContent).toContain(BANK_CBQS_CLAIM);
    expect(screen.getByTestId("bp-tutor").textContent).toContain("Your personal tutor");
  });

  it("BP-PREBOARDS-1: the pre-boards line leads the hero; the founding countdown shows before the deadline and renders nothing after it", async () => {
    await mount();
    expect(screen.getByTestId("bp-preboards").textContent).toBe(BP_PREBOARDS_LINE);
    expect(BP_PREBOARDS_LINE).toBe("Your pre-boards package \u2014 full board mocks, CBSE step marking, important questions and a personal tutor, valid till 28 Feb 2027.");
    // 11 Nov 2026 10:00 IST -> 19 days to the last day (30 Nov)
    expect(screen.getByTestId("boards-countdown").textContent).toBe("Founding price ends in 19 days (30 Nov) \u00b7 then \u20b92,499 + GST");
    cleanup();
    vi.setSystemTime(new Date("2026-11-30T10:00:00+05:30"));
    await mount();
    expect(screen.getByTestId("boards-countdown").textContent).toContain("ends today (30 Nov)");
    cleanup();
    vi.setSystemTime(new Date("2026-12-01T00:00:00+05:30"));
    await mount();
    expect(screen.getByTestId("bp-preboards")).toBeTruthy(); // the line is not date-driven
    expect(screen.queryByTestId("boards-countdown")).toBeNull();
    expect(screen.queryByTestId("bp-countdown-slot")).toBeNull();
    vi.setSystemTime(new Date("2026-11-11T10:00:00+05:30"));
  });

  it("the price is the config's (+ GST, once, till your boards, founding line); the Pay is PassCheckout's own button and label", async () => {
    await mount();
    const figures = screen.getByTestId("bp-price");
    expect(figures.textContent).toContain("₹1,917 + GST");
    expect(figures.textContent).toContain("once");
    expect(screen.getByTestId("bp-price-deadline").textContent).toMatch(/^Founding price/);
    const pays = screen.getAllByRole("button", { name: tillBoardsButtonLabel() });
    expect(pays.length).toBe(2); // the hero Pay (PassCheckout) and the second Pay that clicks it
    expect(screen.getByTestId("bp-pay-hero").querySelector(".lt-pricing-pay--boards")).toBeTruthy();
    expect(screen.getByTestId("bp-payline").textContent).toBe("One payment · nothing renews · UPI, card or netbanking");
  });

  it("a hero Pay tap sends the pay event named for THIS page (F4: surface board-pass) and starts the same checkout path (signed out -> sign-in, as /pricing)", async () => {
    await mount();
    const hero = screen.getByTestId("bp-pay-hero").querySelector<HTMLButtonElement>(".lt-pricing-pay--boards")!;
    await act(async () => {
      fireEvent.click(hero);
    });
    expect(track.paywall).toHaveBeenCalledWith("pay", "board-pass");
    expect(track.paywall).not.toHaveBeenCalledWith("pay", "pricing");
    expect(track.begin).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(where.startsWith("/login")).toBe(true));
  });

  it("the second Pay clicks the hero Pay: one event, one checkout", async () => {
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByTestId("bp-pay-second-btn"));
    });
    expect(track.paywall).toHaveBeenCalledTimes(1);
    expect(track.begin).toHaveBeenCalledTimes(1);
  });

  it("the pack links go to /cbq-packs and /packs with the config prices; FAQ is folded", async () => {
    await mount();
    const cbq = screen.getByTestId("bp-link-cbq");
    expect(cbq.getAttribute("href")).toBe("/cbq-packs");
    expect(cbq.textContent).toContain(`${packPriceLabel("pack_cbq")} per subject`);
    const bank = screen.getByTestId("bp-link-bank");
    expect(bank.getAttribute("href")).toBe("/packs");
    expect(bank.textContent).toContain(`Bundle ${packPriceLabel("pack_bundle")}`);
    const faq = screen.getByTestId("bp-faq");
    expect(faq.querySelectorAll("details").length).toBeGreaterThanOrEqual(2);
    expect(faq.textContent).toContain("Is it a subscription?");
    expect(faq.textContent).toContain("What's free on Basic?");
    // TS-FAIRUSE-1: the fair-use FAQ, from the one shared constant (the same words as /test-series).
    expect(faq.textContent).toContain(`${fairUseFaq().q}${fairUseFaq().a}`);
  });

  it("the trial action carries the intent to sign-in and returns here; nothing starts on mount", async () => {
    await mount();
    expect(mockSub.startTrial).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByTestId("bp-trial"));
    });
    expect(where).toBe("/login?reason=start-trial&redirect=%2Fboard-pass");
  });

  it("F4: the page names itself for the checkout events while mounted, and clears it on leave", async () => {
    await mount();
    expect(currentSalesPageSurface()).toBe("board-pass");
    cleanup();
    expect(currentSalesPageSurface()).toBeNull();
  });

  it("no banned word in the page's own text: AI, answer key, optional, ask (the parent route), refund promise, strike-through", async () => {
    await mount();
    const main = document.querySelector("main")!;
    const text = main.textContent ?? "";
    expect(text).not.toMatch(/\bAI\b/);
    expect(text.toLowerCase()).not.toContain("answer key");
    expect(text.toLowerCase()).not.toContain("optional");
    expect(text).not.toMatch(/\bask\b/i);
    expect(text.toLowerCase()).not.toContain("refund");
    expect(main.querySelector("s, del")).toBeNull();
  });
});

describe("PRICING-PAGES-1 /board-pass - account states", () => {
  it("a Board Pass owner: no price, no Pay; 'You have the Board Pass', practice link, the pack links stay", async () => {
    mockAuth.user = { uid: "u1" };
    mockSub.status = { tier: "premium", plan: "pass_till_boards", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: new Date(Date.now() + 90 * DAY).toISOString() };
    await mount();
    expect(screen.getByTestId("bp-owner").textContent).toContain(BP_OWNER_TITLE);
    expect(screen.getByTestId("bp-owner-home").getAttribute("href")).toBe("/");
    expect(screen.queryByTestId("bp-price")).toBeNull();
    expect(screen.queryAllByTestId("till-boards-figures")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: tillBoardsButtonLabel() })).toBeNull();
    expect(screen.queryByTestId("bp-pay-second")).toBeNull();
    expect(screen.getByTestId("bp-link-cbq")).toBeTruthy();
    expect(screen.getByTestId("bp-link-bank")).toBeTruthy();
  });

  it("?buy=board_pass, signed in Basic: the param leaves the URL and the same Board Pass checkout starts once", async () => {
    mockAuth.user = { uid: "u1" };
    await mount("/board-pass?buy=board_pass&utm_source=google");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(checkout.buyPass).toHaveBeenCalledWith("till_boards", undefined, { postPay: true });
    expect(where).toBe("/board-pass?utm_source=google");
  });

  it("?buy=board_pass, a month-pass holder: the upgrade checkout starts (as /pricing?buy=board_pass)", async () => {
    mockAuth.user = { uid: "u1" };
    mockSub.status = { tier: "premium", plan: "pass_month", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: new Date(Date.now() + 20 * DAY).toISOString() };
    await mount("/board-pass?buy=board_pass");
    await waitFor(() => expect(checkout.buyPass).toHaveBeenCalledTimes(1));
    expect(where).toBe("/board-pass");
  });

  it("?buy=board_pass, a Board Pass owner: nothing starts", async () => {
    mockAuth.user = { uid: "u1" };
    mockSub.status = { tier: "premium", plan: "pass_till_boards", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: new Date(Date.now() + 90 * DAY).toISOString() };
    await mount("/board-pass?buy=board_pass");
    await act(async () => undefined);
    expect(checkout.buyPass).not.toHaveBeenCalled();
  });

  it("R1: with a pack credit, the second Pay names the SAME credited total as the hero Pay (the checkout's), and the uncredited GST line is not shown", async () => {
    who.on = true;
    mockAuth.user = { uid: "u1", email: "a@b.in" };
    credit.value = { creditInr: 49, payInr: 2213, expiresAtMs: Date.now() + 3 * DAY };
    await mount();
    await waitFor(() => expect(screen.getByTestId("bp-pay-hero").querySelector(".lt-pricing-pay--boards")?.textContent).toContain("₹2,213"));
    const hero = screen.getByTestId("bp-pay-hero").querySelector(".lt-pricing-pay--boards")!.textContent;
    await waitFor(() => expect(screen.getByTestId("bp-pay-second-btn").textContent).toBe(hero));
    expect(screen.getByTestId("bp-gst-slot").textContent).toBe("");
  });

  it("R1 control: no credit -> both Pays name the same uncredited total and the GST line adds up to it", async () => {
    who.on = true;
    mockAuth.user = { uid: "u1", email: "a@b.in" };
    await mount();
    const hero = screen.getByTestId("bp-pay-hero").querySelector(".lt-pricing-pay--boards")!.textContent;
    expect(screen.getByTestId("bp-pay-second-btn").textContent).toBe(hero);
    expect(screen.getByTestId("bp-gst-slot").textContent).toMatch(/= ₹2,262$/);
  });

  it("payments dark: /pricing's manual line (word for word), no Pay button", async () => {
    checkout.enabled = false;
    await mount();
    expect(BP_MANUAL_PAYMENTS_OFF).toBe(PRICING_MANUAL_PAYMENTS_OFF);
    expect(screen.getByTestId("bp-manual").textContent).toBe(PRICING_MANUAL_PAYMENTS_OFF);
    expect(screen.queryByRole("button", { name: tillBoardsButtonLabel() })).toBeNull();
  });

  it("a signed-in Basic student's trial tap starts the trial once, here", async () => {
    mockAuth.user = { uid: "u1" };
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByTestId("bp-trial"));
    });
    expect(mockSub.startTrial).toHaveBeenCalledTimes(1);
    expect(track.named).toHaveBeenCalledWith("trial_start");
  });
});
