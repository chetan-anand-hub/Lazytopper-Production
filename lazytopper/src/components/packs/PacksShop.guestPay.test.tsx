/**
 * PAY-PHONE-1 — PacksShop: a signed-out tap (and the one-tap `?buy=` link) asks "How do you want to pay?" while paying
 * by phone is on, and goes to sign-in exactly as before while it is off. PAY-PHONE-1 (C): after a closed checkout the
 * pop-up keeps a prominent "Pay ₹<price>", the free sample next to it, and the ask-a-parent card below.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const flags = vi.hoisted(() => ({ guest: true }));
vi.mock("../../services/guestPay", async (orig) => ({
  ...(await orig<typeof import("../../services/guestPay")>()),
  isGuestPayClientEnabled: () => flags.guest,
}));
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

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;

function shop(url = "/packs") {
  return render(
    <MemoryRouter initialEntries={[url]}>
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
        <Route path="/login" element={<p>LOGIN PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
  flags.guest = true;
  buyMock.mockReset();
});
afterEach(() => cleanup());

describe("PAY-PHONE-1 · PacksShop signed out", () => {
  it("guest pay on: tapping the price opens the pay sheet (no redirect to sign-in) and the note says so", async () => {
    shop();
    fireEvent.click(screen.getByText("open mock"));
    expect(await screen.findByTestId("packs-signin-note")).toHaveProperty("textContent", "Pay with your phone number, or sign in first.");
    fireEvent.click(screen.getByTestId("packs-buy-pack_mock"));
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    expect(screen.queryByText("LOGIN PAGE")).toBeNull();
    expect(screen.getByText("How do you want to pay?")).toBeTruthy();
  });

  it("guest pay off: today's flow, unchanged (straight to sign-in)", async () => {
    flags.guest = false;
    shop();
    fireEvent.click(screen.getByText("open mock"));
    expect((await screen.findByTestId("packs-signin-note")).textContent).toBe("Quick sign-in (Google, 1 tap), then payment opens.");
    fireEvent.click(screen.getByTestId("packs-buy-pack_mock"));
    expect(await screen.findByText("LOGIN PAGE")).toBeTruthy();
    expect(screen.queryByTestId("guest-pay-sheet")).toBeNull();
  });

  it("the one-tap /packs?buy= link, signed out: the pack opens with the pay sheet, once", async () => {
    shop("/packs?buy=pack_cbq&t=science");
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    expect(screen.getByText("Science CBQ Pack")).toBeTruthy();
    expect(screen.queryByText("LOGIN PAGE")).toBeNull();
  });
});

describe("PAY-PHONE-1 (C) · after a closed checkout", () => {
  it("keeps a prominent Pay button, the free sample next to it and the ask-a-parent card", async () => {
    auth.user = { uid: "u1" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByTestId("packs-buy-pack_mock").textContent).toBe("Pay ₹99"));
    expect(screen.getByTestId("packs-dismissed-sample")).toBeTruthy();
    expect(screen.getAllByText(/parent/i).length).toBeGreaterThan(0);
    // Order: Pay button, then the sample, then the card.
    const html = document.body.innerHTML;
    expect(html.indexOf("packs-buy-pack_mock")).toBeLessThan(html.indexOf("packs-dismissed-sample"));
    buyMock.mockResolvedValue({ status: "dismissed" });
    fireEvent.click(screen.getByTestId("packs-buy-pack_mock"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(2));
  });
});
