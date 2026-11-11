/**
 * PRICING-PAGES-1 - /cbq-packs. Every Buy / sample / deep link here is the /packs shop code (PacksShop + PackCbqBuy, unchanged), so
 * these tests pin what the PAGE adds: the copy (claims from packLabels, prices from the pack config), the Maths / Science switch
 * reading `?subject=`, `?buy=pack_cbq&t=` opening the same checkout with the URL cleaned, the owned state, the sibling links, the
 * single pack_view, and the banned words.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.hoisted(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-11T10:00:00+05:30"));
});

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string }, loading: false }));
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("../services/guestPay", async (orig) => ({ ...(await orig<typeof import("../services/guestPay")>()), isGuestPayClientEnabled: () => true }));
vi.mock("../services/checkoutWhoFlag", async (orig) => ({ ...(await orig<typeof import("../services/checkoutWhoFlag")>()), isCheckoutWhoClientEnabled: () => true }));
vi.mock("../services/gstBuyerOrder", async (orig) => ({ ...(await orig<typeof import("../services/gstBuyerOrder")>()), gstStateFieldOn: () => false }));
vi.mock("../services/checkout", async (orig) => ({ ...(await orig<typeof import("../services/checkout")>()), authHeaders: async () => ({ Authorization: "Bearer t" }) }));
const mine = vi.hoisted(() => ({ packs: [] as Array<Record<string, unknown>> }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: mine.packs, licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null })),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
    checkPackOrder: vi.fn(),
  };
});
const packTrack = vi.hoisted(() => ({ checkout: vi.fn(), event: vi.fn() }));
vi.mock("../lib/packs/packAnalytics", async (orig) => ({
  ...(await orig<typeof import("../lib/packs/packAnalytics")>()),
  trackPackCheckout: (...a: unknown[]) => packTrack.checkout(...a),
  trackPackEvent: (...a: unknown[]) => packTrack.event(...a),
}));
vi.mock("../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("./PackDialog", () => ({ default: (p: { sku: string }) => <div role="dialog" data-testid="pack-dialog" data-sku={p.sku} /> }));
vi.mock("../components/checkoutWho/CheckoutSheet", () => ({
  default: (p: { item: { sku: string; target?: string } }) => <div data-testid="who-sheet" data-sku={p.item.sku} data-target={p.item.target}>Who will use it?</div>,
}));

import CbqPacksPage from "./CbqPacksPage";
import * as packs from "../services/packs";
import { CBQ_CHAPTER_CLAIM, CBQ_SUBJECT_CLAIM } from "../lib/packs/packLabels";
import { CBQ_H1 } from "../components/salesPages/salesPagesCopy";
import { packPayLabel, packPriceLabel } from "../services/packs";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
let where = "";
function Probe() {
  const l = useLocation();
  where = `${l.pathname}${l.search}${l.hash}`;
  return null;
}
async function mount(entry = "/cbq-packs") {
  await act(async () => {
    render(
      <MemoryRouter initialEntries={[entry]}>
        <Probe />
        <Routes>
          <Route path="/cbq-packs" element={<CbqPacksPage />} />
          <Route path="/login" element={<p>login</p>} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  mine.packs = [];
  buyMock.mockClear();
  packTrack.checkout.mockReset();
  packTrack.event.mockReset();
  where = "";
});
afterEach(() => cleanup());

describe("PRICING-PAGES-1 /cbq-packs", () => {
  it("one H1, the claims from packLabels (never retyped), the CBQ band with Buy naming the total", async () => {
    await mount();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe(CBQ_H1);
    expect(screen.getByTestId("cq-tile-subject").textContent).toContain(CBQ_SUBJECT_CLAIM);
    expect(screen.getByTestId("cq-tile-chapter").textContent).toContain(CBQ_CHAPTER_CLAIM);
    expect(screen.getByTestId("cbq-band").textContent).toContain(packPriceLabel("pack_cbq"));
    expect(screen.getByTestId("tile-buy-pack_cbq-maths").textContent).toBe(`Buy Maths CBQ · ${packPayLabel("pack_cbq")}`);
  });

  it("the switch defaults to Maths and reads ?subject=science in the first render; both subjects one tap away", async () => {
    await mount("/cbq-packs?subject=science");
    expect(screen.getByTestId("cbq-card-science")).toBeTruthy();
    expect(screen.getByTestId("tile-buy-pack_cbq-science")).toBeTruthy();
    cleanup();
    await mount();
    expect(screen.getByTestId("cbq-card-maths")).toBeTruthy();
  });

  it("a signed-out Buy is the /packs path: pack_checkout at the tap, then the shared sheet for that subject", async () => {
    await mount();
    await act(async () => {
      fireEvent.click(screen.getByTestId("tile-buy-pack_cbq-maths"));
    });
    expect(packTrack.checkout).toHaveBeenCalledTimes(1);
    expect(packTrack.checkout.mock.calls[0][0]).toMatchObject({ sku: "pack_cbq" });
    await waitFor(() => expect(screen.getByTestId("who-sheet").getAttribute("data-target")).toBe("maths"));
  });

  it("?buy=pack_cbq&t=science signed out: the params leave the URL, the sheet opens on Science, the switch follows", async () => {
    await mount("/cbq-packs?buy=pack_cbq&t=science&utm_source=google");
    await waitFor(() => expect(screen.getByTestId("who-sheet").getAttribute("data-target")).toBe("science"));
    expect(where).toBe("/cbq-packs?utm_source=google");
    expect(screen.getByTestId("cbq-card-science")).toBeTruthy();
  });

  it("?buy=pack_cbq&t=maths signed in: the same pack checkout starts once", async () => {
    auth.user = { uid: "u1", email: "a@b.in" };
    await mount("/cbq-packs?buy=pack_cbq&t=maths");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_cbq");
    expect(buyMock.mock.calls[0][1]).toBe("maths");
    expect(where).toBe("/cbq-packs");
  });

  it("an owner of the Maths pack: 'You own this' + Open My packs (/packs#my-packs); Science still buyable", async () => {
    auth.user = { uid: "u1", email: "a@b.in" };
    mine.packs = [{ packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", purchasedAt: Date.now(), pricePaidInr: 199 }];
    await mount();
    await waitFor(() => expect(screen.getByTestId("tile-owned-pack_cbq-maths")).toBeTruthy());
    expect(screen.getByTestId("cq-open-my-packs").getAttribute("href")).toBe("/packs#my-packs");
    fireEvent.click(screen.getByTestId("cbq-subject-science"));
    expect(screen.getByTestId("tile-buy-pack_cbq-science")).toBeTruthy();
  });

  it("one pack_view per visit; links to /board-pass and /packs", async () => {
    await mount();
    expect(packTrack.event.mock.calls.filter((c) => c[0] === "pack_view")).toHaveLength(1);
    expect(screen.getByTestId("cq-link-board-pass").getAttribute("href")).toBe("/board-pass");
    const bank = screen.getByTestId("cq-link-bank");
    expect(bank.getAttribute("href")).toBe("/packs");
    expect(bank.textContent).toContain(`from ${packPriceLabel("pack_chapter")}`);
  });

  it("no banned word: AI, answer key, optional, crossed-out price", async () => {
    await mount();
    const main = document.querySelector("main")!;
    const text = main.textContent ?? "";
    expect(text).not.toMatch(/\bAI\b/);
    expect(text.toLowerCase()).not.toContain("answer key");
    expect(text.toLowerCase()).not.toContain("optional");
    expect(main.querySelector("s, del")).toBeNull();
  });
});
