/**
 * PAY-PHONE-1 — PacksShop: a signed-out tap (and the one-tap `?buy=` link) asks "How do you want to pay?" while paying
 * by phone is on, and goes to sign-in exactly as before while it is off. PAY-PHONE-1 (C): after a closed checkout the
 * pop-up keeps a prominent "Pay ₹<price>", the free sample next to it, and the ask-a-parent card below.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const flags = vi.hoisted(() => ({ guest: true }));
const guestBuy = vi.hoisted(() => ({ buyAsGuest: vi.fn() }));
vi.mock("../../services/guestPay", async (orig) => ({
  ...(await orig<typeof import("../../services/guestPay")>()),
  isGuestPayClientEnabled: () => flags.guest,
  buyAsGuest: (...a: unknown[]) => guestBuy.buyAsGuest(...a),
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

let loginState: unknown;
function LoginProbe() {
  loginState = useLocation().state;
  return <p>LOGIN PAGE</p>;
}

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
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = null;
  flags.guest = true;
  loginState = undefined;
  guestBuy.buyAsGuest.mockReset();
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

describe("PAY-PHONE-1 · My packs for a phone-only account", () => {
  const owned = { packId: "pack_mock:maths", sku: "pack_mock", target: "maths", pricePaidInr: 99, paidAt: 5, orderId: "order_1" };
  const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;

  it("a phone-only account with no name sees its packs AND is asked once for the name; an email account is not asked", async () => {
    auth.user = { uid: "u-phone" };
    fetchMine.mockResolvedValueOnce({ packs: [owned], licensee: { name: "", email: "", phone: "+91 98•••••948" }, boardPassCredit: null });
    shop();
    expect(await screen.findByTestId("pack-name-prompt")).toBeTruthy();
    expect(screen.getByText(/Mock Pack · Maths/)).toBeTruthy();
    expect(screen.queryByTestId("packs-details-unavailable")).toBeNull();
    cleanup();

    fetchMine.mockResolvedValueOnce({ packs: [owned], licensee: { name: "", email: "a@b.in" }, boardPassCredit: null });
    shop();
    expect(await screen.findByText(/Mock Pack · Maths/)).toBeTruthy();
    expect(screen.queryByTestId("pack-name-prompt")).toBeNull();
    cleanup();

    // A named phone account is not asked either.
    fetchMine.mockResolvedValueOnce({ packs: [owned], licensee: { name: "Asha", email: "", phone: "+91 98•••••948" }, boardPassCredit: null });
    shop();
    expect(await screen.findByText(/Mock Pack · Maths/)).toBeTruthy();
    expect(screen.queryByTestId("pack-name-prompt")).toBeNull();
  });

  it("GUEST-SIGNIN-RETURNING-1: 'This number already has an account' -> sign in carries the existing-account flag (number in router state only)", async () => {
    guestBuy.buyAsGuest.mockResolvedValue({ status: "account_exists", phoneMasked: "+91 98•••••948", phone: "+919876543948" });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    fireEvent.click(await screen.findByTestId("packs-buy-pack_mock"));
    fireEvent.click(await screen.findByText("Pay now with your phone number"));
    fireEvent.change(screen.getByTestId("guest-pay-input"), { target: { value: "9876543948" } });
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    fireEvent.click(await screen.findByTestId("guest-pay-exists-signin"));
    expect(await screen.findByText("LOGIN PAGE")).toBeTruthy();
    expect(loginState).toEqual({ guestPayPhone: "9876543948", guestPayExisting: true });
  });
});
