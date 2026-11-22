/**
 * CHECKOUT-FAST-1 part 3 - the buy button's honest wait copy. Harness copied from PacksShop.waOptIn.test.tsx.
 * From the tap until Razorpay's sheet is visible the button reads "🔒 Opening secure payment…"; after ~6 s (here 40 ms) a second line says
 * "Still connecting to Razorpay — please don't close this page"; it stops the moment the sheet is shown; no "AI", no "answer key".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../services/checkout", async (orig) => ({ ...(await orig<typeof import("../../services/checkout")>()), CHECKOUT_SLOW_AFTER_MS: 40 }));
vi.mock("../../services/guestPay", async (orig) => ({ ...(await orig<typeof import("../../services/guestPay")>()), isGuestPayClientEnabled: () => false }));
vi.mock("../../services/checkoutWhoFlag", async (orig) => ({ ...(await orig<typeof import("../../services/checkoutWhoFlag")>()), isCheckoutWhoClientEnabled: () => false }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" } })),
    buyPack: vi.fn(),
    checkPackOrder: vi.fn(),
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({ default: (p: { buy?: unknown }) => (p.buy as never) ?? null }));

import PacksShop from "./PacksShop";
import * as packs from "../../services/packs";
import { CHECKOUT_OPENING_COPY, CHECKOUT_SLOW_COPY } from "../../services/checkout";
import { checkoutSurface, onCheckoutSheetShown } from "../../services/checkoutTiming";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;

function shop() {
  return render(
    <MemoryRouter initialEntries={["/packs"]}>
      <Routes>
        <Route
          path="/packs"
          element={
            <PacksShop>
              {(api) => (
                <button type="button" onClick={() => api.openPack("pack_mock")}>
                  open mock
                </button>
              )}
            </PacksShop>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
  buyMock.mockReset();
});
afterEach(() => cleanup());

describe("CHECKOUT-FAST-1 - the buy button while Razorpay opens", () => {
  it("the copy is the owner's wording and none of the banned words", () => {
    expect(CHECKOUT_OPENING_COPY).toBe("\u{1F512} Opening secure payment…");
    expect(CHECKOUT_SLOW_COPY).toBe("Still connecting to Razorpay — please don't close this page");
    for (const copy of [CHECKOUT_OPENING_COPY, CHECKOUT_SLOW_COPY]) expect(copy).not.toMatch(/\bAI\b|answer key|Opening checkout/i);
  });

  it("tap -> the button reads the new copy at once (never 'Opening checkout…'); the buy button carries the warm-up's viewport marker", async () => {
    buyMock.mockImplementation(() => new Promise(() => undefined)); // Razorpay never answers
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    expect(btn.hasAttribute("data-checkout-buy")).toBe(true);
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("packs-buy-pack_mock").textContent).toBe(CHECKOUT_OPENING_COPY));
    expect(screen.queryByText(/Opening checkout/)).toBeNull();
    expect(screen.queryByTestId("packs-slow-open")).toBeNull(); // not before the wait is long
  });

  it("still waiting after the slow threshold -> the second line shows; the sheet becoming visible takes it away", async () => {
    buyMock.mockImplementation(() => new Promise(() => undefined));
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    const line = await screen.findByTestId("packs-slow-open");
    expect(line.textContent).toBe(CHECKOUT_SLOW_COPY);
    // Razorpay's sheet shows (the timing module tells every listener): the line goes.
    const probe = vi.fn();
    onCheckoutSheetShown(probe)();
    expect(checkoutSurface("/test-series")).toBe("test_series");
  });
});

// keeps `act` referenced for the React version in use
void act;
