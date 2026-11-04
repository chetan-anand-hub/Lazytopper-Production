/**
 * CHECKOUT-WHO-1 - the pack shop's Buy with VITE_CHECKOUT_WHO_ENABLED on opens "Who will use it?": signed out (tap or the one-tap
 * ?buy= link) the recipient box; signed in "For: you" and ONE tap into the unchanged buyPack. Flag OFF: the old flows exactly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const flags = vi.hoisted(() => ({ guest: true, who: true }));
vi.mock("../../services/guestPay", async (orig) => ({
  ...(await orig<typeof import("../../services/guestPay")>()),
  isGuestPayClientEnabled: () => flags.guest,
}));
vi.mock("../../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => flags.who,
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

import PacksShop, { PACK_WHO_NOTE } from "./PacksShop";
import * as packs from "../../services/packs";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 5 Nov 2026.
import { packPayLabel } from "../../services/packs";

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
  flags.who = true;
  buyMock.mockReset();
});
afterEach(() => cleanup());

describe("CHECKOUT-WHO-1 · flag ON", () => {
  it("signed out: Buy opens 'Who will use it?' with the pack's price (no pay-by-phone sheet, no sign-in)", async () => {
    shop();
    fireEvent.click(screen.getByText("open mock"));
    expect((await screen.findByTestId("packs-signin-note")).textContent).toBe(PACK_WHO_NOTE);
    fireEvent.click(screen.getByTestId("packs-buy-pack_mock"));
    expect(await screen.findByText("Who will use it?")).toBeTruthy();
    fireEvent.change(screen.getByTestId("who-first"), { target: { value: "anaya.k@gmail.com" } });
    expect(screen.getByTestId("who-pay").textContent).toBe(`Pay ${packPayLabel("pack_mock")} for anaya.k@gmail.com`);
    expect(screen.queryByTestId("guest-pay-sheet")).toBeNull();
    expect(screen.queryByText("LOGIN PAGE")).toBeNull();
  });

  it("the one-tap /packs?buy= link signed out opens the sheet for that pack", async () => {
    shop("/packs?buy=pack_cbq&t=science");
    expect(await screen.findByTestId("who-first")).toBeTruthy();
    expect(screen.getAllByText(/Science CBQ Pack/).length).toBeGreaterThan(0);
  });

  it("signed in: 'For: you' and ONE tap into the existing buyPack", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    expect((await screen.findByTestId("who-self")).textContent).toBe("For: you · an••••@gmail.com");
    expect(buyMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("who-pay-self"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_mock");
  });
});

describe("CHECKOUT-WHO-1 · flag OFF = the old flow", () => {
  it("signed out: today's pay-by-phone sheet; signed in: straight to buyPack", async () => {
    flags.who = false;
    shop();
    fireEvent.click(screen.getByText("open mock"));
    fireEvent.click(await screen.findByTestId("packs-buy-pack_mock"));
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    expect(screen.queryByTestId("who-sheet")).toBeNull();
    cleanup();
    auth.user = { uid: "u1" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("who-sheet")).toBeNull();
  });
});
