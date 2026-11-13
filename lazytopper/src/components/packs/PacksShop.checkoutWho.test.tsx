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
const flags = vi.hoisted(() => ({ guest: true, who: true, self: false }));
const selfBuy = vi.hoisted(() => ({ fn: vi.fn() }));
const analytics = vi.hoisted(() => ({ trackPackCheckout: vi.fn(), trackPackPurchase: vi.fn() }));
vi.mock("../../services/guestPay", async (orig) => ({
  ...(await orig<typeof import("../../services/guestPay")>()),
  isGuestPayClientEnabled: () => flags.guest,
}));
vi.mock("../../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => flags.who,
  isCheckoutSelfClientEnabled: () => flags.who && flags.self,
}));
vi.mock("../../services/checkoutWho", async (orig) => ({
  ...(await orig<typeof import("../../services/checkoutWho")>()),
  buyForSelf: (...a: unknown[]) => selfBuy.fn(...a),
  isSelfAttachClientEnabled: () => flags.who && flags.self,
}));
vi.mock("../../lib/packs/packAnalytics", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/packAnalytics")>()),
  trackPackCheckout: (...a: unknown[]) => analytics.trackPackCheckout(...a),
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
import { resetOwnedPacksCache } from "./useOwnedPacks";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
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
  flags.self = false;
  selfBuy.fn.mockReset();
  selfBuy.fn.mockReturnValue(new Promise(() => undefined));
  analytics.trackPackCheckout.mockClear();
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

  it("signed in: ONE Buy tap goes straight into buyPack for the account - no 'Who will use it?'", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    expect(btn.textContent).toMatch(/^Buy for ₹[\d,]+/); // the amount comes from the shop's own label source
    fireEvent.click(btn);
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_mock");
    expect(screen.queryByTestId("who-sheet")).toBeNull();
  });

  it("signed in, flag on: a /packs?buy= return starts buyPack once with no sheet", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop("/packs?buy=pack_cbq&t=science");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_cbq");
    expect(screen.queryByTestId("who-sheet")).toBeNull();
  });

  it("signed in: the secondary link opens the someone-else box (no purchase started)", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const link = await screen.findByTestId("packs-someone-else-pack_mock");
    await waitFor(() => expect((screen.getByTestId("packs-buy-pack_mock") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(link);
    expect(await screen.findByText("Who will use it?")).toBeTruthy();
    expect(screen.getByTestId("who-first")).toBeTruthy();
    expect(screen.queryByTestId("who-self")).toBeNull();
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("signed out: no secondary link (the sheet is the primary path)", async () => {
    shop();
    fireEvent.click(screen.getByText("open mock"));
    await screen.findByTestId("packs-buy-pack_mock");
    expect(screen.queryByTestId("packs-someone-else-pack_mock")).toBeNull();
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

describe("SELFPAY-ATTACH-1 · an owner taps an owned pack's Buy", () => {
  const OWNED = { packs: [{ packId: "pack_mock:maths", sku: "pack_mock", target: "maths", pricePaidInr: 149, paidAt: 1 }], licensee: { name: "Asha", email: "a@b.in" } };
  it("flag on, signed in: 'You own this' opens 'You already own the ...' with Buy for someone else and Open My packs; nothing is bought", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    (packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNED);
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect(btn.textContent).toBe("You own this"));
    expect((btn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(btn);
    expect(await screen.findByTestId("who-holder-tag")).toBeTruthy();
    expect(screen.getByTestId("who-holder-title").textContent).toMatch(/^You already own the /);
    expect(screen.getByTestId("who-holder-line").textContent).toBe("Your files are in My packs, ready to download.");
    expect(screen.getByTestId("who-holder-go").textContent).toBe("Open My packs");
    fireEvent.click(screen.getByTestId("who-holder-other"));
    expect(screen.getByTestId("who-first")).toBeTruthy();
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("flag off: 'You own this' stays a disabled label, exactly as before", async () => {
    flags.who = false;
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    (packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(OWNED);
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect(btn.textContent).toBe("You own this"));
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("CHECKOUT-ONE-TAP-1 - signed out: the Buy tap IS the Pay tap", () => {
  beforeEach(() => {
    flags.self = true;
    resetOwnedPacksCache(); // the owner tests above leave "owned" in the module cache ...
    (packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ packs: [], licensee: { name: "Asha", email: "a@b.in" } }); // ... and in the mock
  });

  it("ONE Buy tap fires the self order straight away: no 'Pay' step, no choice, one checkout event", async () => {
    selfBuy.fn.mockReturnValue(new Promise(() => undefined)); // Razorpay open
    shop();
    fireEvent.click(screen.getByText("open mock"));
    fireEvent.click(await screen.findByTestId("packs-buy-pack_mock"));
    await waitFor(() => expect(selfBuy.fn).toHaveBeenCalledTimes(1));
    expect(selfBuy.fn.mock.calls[0][0]).toMatchObject({ kind: "pack", sku: "pack_mock" });
    expect(screen.getByTestId("who-auto-opening")).toBeTruthy();
    expect(screen.queryByTestId("who-pay-self-out")).toBeNull();
    expect(screen.queryByTestId("who-first")).toBeNull();
    expect(screen.queryByTestId("who-someone-else")).toBeNull();
    expect(buyMock).not.toHaveBeenCalled(); // not the signed-in path
    expect(analytics.trackPackCheckout).toHaveBeenCalledTimes(1);
    expect(analytics.trackPackCheckout.mock.calls[0][1]).toMatchObject({ signedIn: false });
  });

  it("a ?buy= link arrival does NOT pay by itself: today's Pay step shows, nothing is ordered until a tap", async () => {
    shop("/packs?buy=pack_cbq&t=science");
    fireEvent.click(await screen.findByTestId("who-pay-self-out"));
    await waitFor(() => expect(selfBuy.fn).toHaveBeenCalledTimes(1));
    expect(selfBuy.fn.mock.calls[0][0]).toMatchObject({ sku: "pack_cbq", target: "science" });
  });

  it("a REAL Buy tap after a ?buy= arrival (sheet closed) opens Razorpay at once; the arrival itself never ordered", async () => {
    shop("/packs?buy=pack_mock&t=maths");
    await screen.findByTestId("who-pay-self-out");
    expect(selfBuy.fn).not.toHaveBeenCalled(); // an arrival without a tap never auto-orders
    fireEvent.click(screen.getByLabelText("Close"));
    await waitFor(() => expect(screen.queryByTestId("who-sheet")).toBeNull());
    fireEvent.click(await screen.findByTestId("packs-buy-pack_mock"));
    await waitFor(() => expect(selfBuy.fn).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("who-pay-self-out")).toBeNull();
  });

  it("the link arrival alone makes no order", async () => {
    shop("/packs?buy=pack_cbq&t=science");
    await screen.findByTestId("who-pay-self-out");
    expect(selfBuy.fn).not.toHaveBeenCalled();
  });

  it("self switch off (VITE_CHECKOUT_SELF_DISABLED): today's sheet, no order on the tap", async () => {
    flags.self = false;
    shop();
    fireEvent.click(screen.getByText("open mock"));
    fireEvent.click(await screen.findByTestId("packs-buy-pack_mock"));
    expect(await screen.findByTestId("who-first")).toBeTruthy();
    expect(selfBuy.fn).not.toHaveBeenCalled();
  });

  it("signed in is unchanged: buyPack, never the self order", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(selfBuy.fn).not.toHaveBeenCalled();
  });
});
