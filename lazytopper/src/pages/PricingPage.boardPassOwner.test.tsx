/**
 * PARENT-PACKS-1 (owner polish from #1540's report) - /pricing for a signed-in Board Pass (till boards) owner: no Board Pass
 * price figure, no "pay with …" line, and the "What you get with each" Board Pass price cell reads "You have it" (the rows stay).
 * A month-pass Premium student, a Basic student and a signed-out visitor see the page exactly as before (the signed-out render
 * is also what the prerender captures; CI's capture job compares it byte for byte with the committed artifact).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { SubscriptionStatus } from "../services/subscriptionService";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-04T10:00:00+05:30"));
});

const authState: { user: { uid: string } | null } = { user: null };
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: authState.user, loading: false }) }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn() };
});

import PricingPage from "./PricingPage";
import * as svc from "../services/subscriptionService";
import { BOARD_PASS_OWNED_CELL } from "../components/pricing/pricingPlansCopy";
import { PRICING_CSS } from "../components/pricing/pricingPageCss";
import { packCreditLine } from "../components/pricing/PassCheckout";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const UID = "uid-board-pass-owner";
const STORAGE_KEY = `lazytopper.subscription.v1:${UID}`;
const DAY = 24 * 60 * 60 * 1000;

function status(over: Partial<SubscriptionStatus>): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, ...over };
}
const BOARD_PASS = status({ tier: "premium", plan: "pass_till_boards", premiumSince: new Date(Date.now() - DAY).toISOString(), passEnd: "2027-02-17T18:29:59.999Z" });
const MONTH = status({ tier: "premium", plan: "pass_month", premiumSince: new Date(Date.now() - DAY).toISOString(), passEnd: new Date(Date.now() + 20 * DAY).toISOString() });
const FREE = status({});

function holds(sub: SubscriptionStatus) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  hydrate.mockImplementation(async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
    return sub;
  });
}

async function renderPricing() {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<PricingPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

function priceRow() {
  const table = screen.getByTestId("pricing-what-table");
  const row = within(table).getByRole("rowheader", { name: "Price" }).closest("tr") as HTMLElement;
  return Array.from(row.querySelectorAll("td")).map((td) => td.textContent);
}

beforeEach(() => {
  localStorage.clear();
  authState.user = null;
  hydrate.mockReset();
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PARENT-PACKS-1 · /pricing for a Board Pass owner", () => {
  it("no Board Pass price, no pay line; the table's Board Pass price cell reads 'You have it' (rows kept)", async () => {
    authState.user = { uid: UID };
    holds(BOARD_PASS);
    await renderPricing();
    expect(await screen.findByTestId("pass-checkout-board-pass-active")).toHaveTextContent("Your Board Pass is active until");
    expect(screen.queryByTestId("till-boards")).toBeNull();
    expect(screen.queryByTestId("till-boards-figures")).toBeNull();
    expect(screen.queryByTestId("pricing-payline")).toBeNull();
    const cells = priceRow();
    expect(cells[0]).toBe(BOARD_PASS_OWNED_CELL);
    expect(cells[0]).toBe("You have it");
    expect(cells.slice(1)).toEqual(["₹199", "₹299"]);
    expect(within(screen.getByTestId("pricing-what-table")).getAllByRole("row").length).toBeGreaterThan(5);
    expect(screen.getByTestId("pricing-board-pass").textContent).not.toMatch(/₹1,917|₹2,499/);
  });

  it.each([
    ["signed out", null, null],
    ["a Basic student", { uid: UID }, FREE],
    ["a month-pass student", { uid: UID }, MONTH],
  ] as const)("%s: the price, the pay line and the price cell are unchanged", async (_l, user, sub) => {
    authState.user = user ? { ...user } : null;
    if (sub) holds(sub);
    await renderPricing();
    expect(await screen.findByTestId("till-boards-figures")).toHaveTextContent("₹1,917");
    expect(screen.getByTestId("pricing-payline")).toBeInTheDocument();
    expect(priceRow()[0]).toBe("₹1,917");
  });
});

describe("PARENT-PACKS-1 (owner screenshot 4 Nov) · no empty-looking controls, prices formatted", () => {
  const TRIAL = status({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(Date.now() - DAY).toISOString() });
  /** Every visible control has words a reader can see (or an aria-label). */
  function emptyControls(): string[] {
    return Array.from(document.querySelectorAll("button, a"))
      .filter((e) => !(e.textContent || "").trim() && !e.getAttribute("aria-label"))
      .map((e) => e.outerHTML.slice(0, 120));
  }

  it.each([
    ["signed out", null, null],
    ["Basic", { uid: UID }, FREE],
    ["an active trial", { uid: UID }, TRIAL],
    ["a month pass", { uid: UID }, MONTH],
    ["a Board Pass owner", { uid: UID }, BOARD_PASS],
  ] as const)("%s: no button or link without text", async (_l, user, sub) => {
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    authState.user = user ? { ...user } : null;
    if (sub) holds(sub);
    await renderPricing();
    await screen.findByTestId("pricing-board-pass");
    expect(emptyControls()).toEqual([]);
  });

  it("an active trial: the truthful line, and its 'Start practising' link keeps LIGHT text on the green button", async () => {
    authState.user = { uid: UID };
    holds(TRIAL);
    await renderPricing();
    expect(await screen.findByText(/Your trial is active — \d+ days left\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start practising" }).className).toContain("lt-pricing-cta--primary");
    // The page's link colour (green) must not reach a primary CTA link (green on green = no visible text).
    expect(PRICING_CSS).toMatch(/\.lt-pricing-page a\.lt-pricing-cta--primary\s*\{\s*color:\s*var\(--lt-on-dark\)/);
  });

  it("the parent actions on the Board Pass card lay out in a ROW (a column turned their flex-basis into a 180px height)", () => {
    const rule = /\.lt-pp-parents \.lt-paywall-actions\s*\{([^}]*)\}/.exec(PRICING_CSS);
    expect(rule).not.toBeNull();
    expect(rule![1]).toMatch(/flex-direction:\s*row/);
  });

  it("the pack credit line formats rupees like every other price (₹1,868)", () => {
    const line = packCreditLine({ creditInr: 49, payInr: 1868, expiresAtMs: Date.parse("2026-11-10T15:50:00Z") });
    expect(line).toContain("₹49 off — Board Pass ₹1,868 for you");
    expect(line).not.toMatch(/₹\d{4}/);
  });
});
