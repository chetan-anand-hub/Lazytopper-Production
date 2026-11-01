/**
 * PURCHASE-EVENT-1 — every server-verified pack payment fires exactly one GA4 `purchase`
 * (transaction_id, value, currency INR, items[sku, name, price, quantity 1]), whichever door it came through:
 * the /pricing embedded shop, the signed-out resume (?buy=&t=), the CBQ sku, a pending order the server settles
 * later, and a shop that unmounted while Razorpay was open. Real analytics + packAnalytics; only gtag is a spy.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));

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
vi.mock("../../lib/packs/packContent", () => ({
  loadChapter: async () => undefined,
  countChapterQuestions: () => 100,
  countCbqPackQuestions: () => 50,
}));
// The dialog hosts the buy area; render just that slot so the rescue card (inside it) is visible.
vi.mock("../../pages/PackDialog", () => ({ default: (p: { buy?: unknown }) => (p.buy as never) ?? null }));

import PacksShop from "./PacksShop";
import { __resetPurchaseMemoryForTests } from "../../analytics/analytics";
import * as packs from "../../services/packs";

type Win = { gtag?: unknown };
const w = window as unknown as Win;
const originalLocation = window.location;
let gtagCalls: unknown[][];

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
const checkMock = packs.checkPackOrder as unknown as ReturnType<typeof vi.fn>;
const ga4 = (name: string) => gtagCalls.filter((c) => c[0] === "event" && c[1] === name).map((c) => c[2] as Record<string, unknown>);

function shop(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PacksShop embedded returnPath="/pricing">
        {() => null}
      </PacksShop>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: { href: "https://www.lazytopper.com/pricing", origin: "https://www.lazytopper.com", hostname: "www.lazytopper.com", pathname: "/pricing", search: "", hash: "" },
  });
  gtagCalls = [];
  w.gtag = (...a: unknown[]) => void gtagCalls.push(a);
  auth.user = { uid: "u1" };
  buyMock.mockReset();
  checkMock.mockReset();
  __resetPurchaseMemoryForTests();
  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
});
afterEach(() => {
  cleanup();
  delete w.gtag;
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: originalLocation });
});

const grant = { sku: "pack_chapter" };

describe("PURCHASE-EVENT-1 · pack purchase", () => {
  it("embedded /pricing shop, signed-in resume of a Rs 49 Chapter Pack: begin_checkout when Razorpay opens, then ONE purchase", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, paymentId: "pay_49", amountInr: 49 });
    shop("/pricing?buy=pack_chapter&t=real-numbers");
    await waitFor(() => expect(ga4("purchase")).toHaveLength(1));
    expect(ga4("begin_checkout")).toHaveLength(1);
    expect(ga4("begin_checkout")[0]).toMatchObject({ currency: "INR", value: 49, items: [{ item_id: "pack_chapter", price: 49, quantity: 1 }] });
    expect(ga4("purchase")[0]).toMatchObject({
      transaction_id: "pay_49",
      currency: "INR",
      value: 49,
      items: [{ item_id: "pack_chapter", price: 49, quantity: 1 }],
    });
    expect(typeof ga4("purchase")[0].value).toBe("number");
  });

  it("CBQ sku: one purchase, Rs 199, item pack_cbq", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, paymentId: "pay_cbq", amountInr: 199 });
    shop("/pricing?buy=pack_cbq&t=maths");
    await waitFor(() => expect(ga4("purchase")).toHaveLength(1));
    expect(ga4("purchase")[0]).toMatchObject({ transaction_id: "pay_cbq", currency: "INR", value: 199, items: [{ item_id: "pack_cbq", price: 199, quantity: 1 }] });
  });

  it("a signed-out visitor is sent to sign in and fires nothing (no checkout, no purchase)", async () => {
    auth.user = null;
    shop("/pricing?buy=pack_bundle");
    await new Promise((r) => setTimeout(r, 30));
    expect(buyMock).not.toHaveBeenCalled();
    expect(ga4("purchase")).toHaveLength(0);
    expect(ga4("begin_checkout")).toHaveLength(0);
  });

  it("a dismissed or failed checkout never fires purchase", async () => {
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop("/pricing?buy=pack_bundle");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(ga4("begin_checkout")).toHaveLength(1);
    expect(ga4("purchase")).toHaveLength(0);
  });

  it("PAY-RESCUE-1: a closed checkout shows the \"Can't pay yourself?\" card for the pack; Try again re-opens; Not now hides it", async () => {
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop("/pricing?buy=pack_bundle");
    expect(await screen.findByTestId("pay-rescue")).toBeTruthy();
    expect(screen.getByTestId("pay-rescue").getAttribute("data-kind")).toBe("pack");
    expect(screen.getByText("Can't pay yourself?")).toBeTruthy();
    expect(buyMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("pay-rescue-retry"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId("pay-rescue")).toBeTruthy();
    fireEvent.click(screen.getByTestId("pay-rescue-close"));
    expect(screen.queryByTestId("pay-rescue")).toBeNull();
  });

  it("PAY-RESCUE-1: a failed or paid pack checkout never shows the rescue card", async () => {
    buyMock.mockResolvedValue({ status: "failed" });
    shop("/pricing?buy=pack_bundle");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("pay-rescue")).toBeNull();
  });

  it("a remount / reload with the same payment id does not fire a second purchase", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, paymentId: "pay_dup", amountInr: 299 });
    shop("/pricing?buy=pack_bundle");
    await waitFor(() => expect(ga4("purchase")).toHaveLength(1));
    cleanup();
    shop("/pricing?buy=pack_bundle");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(2));
    await new Promise((r) => setTimeout(r, 30));
    expect(ga4("purchase")).toHaveLength(1);
    // a full reload clears module memory but not this tab's sessionStorage
    __resetPurchaseMemoryForTests();
    cleanup();
    shop("/pricing?buy=pack_bundle");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(3));
    await new Promise((r) => setTimeout(r, 30));
    expect(ga4("purchase")).toHaveLength(1);
  });

  it("the shop unmounting while Razorpay is open still counts the verified payment, once", async () => {
    let finish: (v: unknown) => void = () => undefined;
    buyMock.mockReturnValue(new Promise((r) => (finish = r)));
    const view = shop("/pricing?buy=pack_chapter&t=real-numbers");
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    view.unmount();
    finish({ status: "paid", grant, paymentId: "pay_gone", amountInr: 49 });
    await waitFor(() => expect(ga4("purchase")).toHaveLength(1));
    expect(ga4("purchase")[0]).toMatchObject({ transaction_id: "pay_gone", value: 49, currency: "INR" });
  });

  it("pending order that the server settles as paid: purchase fires then (with the server payment id), once", async () => {
    buyMock.mockResolvedValue({ status: "pending", orderId: "order_1", paymentId: "pay_p" });
    checkMock.mockResolvedValue({ state: "paid", paymentId: "pay_p", amountInr: 99 });
    shop("/pricing?buy=pack_mock&t=maths");
    await waitFor(() => expect(ga4("purchase")).toHaveLength(1));
    expect(ga4("purchase")[0]).toMatchObject({ transaction_id: "pay_p", currency: "INR", value: 99, items: [{ item_id: "pack_mock", quantity: 1 }] });
    await new Promise((r) => setTimeout(r, 30));
    expect(ga4("purchase")).toHaveLength(1);
  });
});
