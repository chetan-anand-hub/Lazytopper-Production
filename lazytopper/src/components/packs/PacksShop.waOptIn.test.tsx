/**
 * WHATSAPP-OPTIN-1 (harness copied from PacksShop.checkoutWho.test.tsx; this file is its own so the checkout-self lane stays file-disjoint) - was CHECKOUT-WHO-1 - the pack shop's Buy with VITE_CHECKOUT_WHO_ENABLED on opens "Who will use it?": signed out (tap or the one-tap
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
import { waOptInOrderFields } from "../../services/waOptIn";
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
  buyMock.mockReset();
});
afterEach(() => cleanup());

describe("WHATSAPP-OPTIN-1 - the pop-up's WhatsApp block above Buy", () => {
  it("signed out: the block sits ABOVE Buy, unticked and empty; Buy still opens the sheet in ONE tap (no new step)", async () => {
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const buy = await screen.findByTestId("packs-buy-pack_mock");
    const block = screen.getByTestId("packs-wa-optin");
    expect(block.compareDocumentPosition(buy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect((screen.getByTestId("packs-wa-consent") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByTestId("packs-wa-number") as HTMLInputElement).value).toBe("");
    fireEvent.click(buy);
    expect(await screen.findByTestId("who-sheet")).toBeTruthy();
  });

  it("signed in: empty -> nothing is pending when buyPack runs; a valid number + tick -> { phone, consent: true } is", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    const seen: unknown[] = [];
    buyMock.mockImplementation(async () => {
      seen.push(waOptInOrderFields());
      return { status: "dismissed" };
    });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    const btn = await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(btn);
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(seen).toEqual([{}]);
    fireEvent.change(screen.getByTestId("packs-wa-number"), { target: { value: "9876543210" } });
    fireEvent.click(screen.getByTestId("packs-wa-consent"));
    await waitFor(() => expect((screen.getByTestId("packs-buy-pack_mock") as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByTestId("packs-buy-pack_mock"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(2));
    expect(seen[1]).toEqual({ waOptIn: { phone: "9876543210", consent: true } });
  });

  it("an owned pack shows no block (nothing to buy)", async () => {
    auth.user = { uid: "u1", email: "anaya.k@gmail.com" };
    (packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      packs: [{ packId: "pack_mock:maths", sku: "pack_mock", target: "maths", pricePaidInr: 149, paidAt: 1 }],
      licensee: { name: "Asha", email: "a@b.in" },
    });
    shop();
    fireEvent.click(screen.getByText("open mock"));
    await screen.findByTestId("packs-buy-pack_mock");
    await waitFor(() => expect(screen.getByTestId("packs-buy-pack_mock").textContent).toBe("You own this"));
    expect(screen.queryByTestId("packs-wa-optin")).toBeNull();
  });
});
