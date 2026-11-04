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
