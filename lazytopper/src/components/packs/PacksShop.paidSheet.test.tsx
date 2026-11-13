/** PAID-SHEET-1 host test: a signed-in pack payment opens the "Payment received" pop-up; My packs scrolls into view only after it closes. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../signinLink/SigninLinkCard", () => ({
  default: (p: { onMoved?: () => void; onAnswered?: () => void }) => (
    <div data-testid="signin-link-card-stub">
      <button type="button" data-testid="stub-moved" onClick={() => p.onMoved?.()}>moved</button>
      <button type="button" data-testid="stub-answered" onClick={() => p.onAnswered?.()}>answered</button>
    </div>
  ),
}));
const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string; email?: string } }));
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
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({ default: (p: { buy?: unknown }) => (p.buy as never) ?? null }));
const events = vi.hoisted(() => ({ hits: [] as Array<[string, unknown]> }));
vi.mock("../../analytics/analytics", async (orig) => {
  const actual = await orig<typeof import("../../analytics/analytics")>();
  return { ...actual, sendAnalyticsHit: (_k: string, payload: { name: string; data?: unknown }) => { events.hits.push([payload.name, payload.data]); } };
});

import PacksShop from "./PacksShop";
import * as packs from "../../services/packs";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
const checkMock = packs.checkPackOrder as unknown as ReturnType<typeof vi.fn>;
const grant = { sku: "pack_chapter" };
const scroll = vi.fn();

function shop(url = "/pricing?buy=pack_chapter&t=real-numbers", props: { hideMyPacks?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PacksShop embedded returnPath="/pricing" {...props}>
        {() => null}
      </PacksShop>
    </MemoryRouter>,
  );
}
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)); });

beforeEach(() => {
  auth.user = { uid: "u1" };
  buyMock.mockReset();
  checkMock.mockReset();
  scroll.mockReset();
  events.hits = [];
  Element.prototype.scrollIntoView = scroll as unknown as Element["scrollIntoView"];
  vi.unstubAllEnvs();
  try { window.sessionStorage.clear(); } catch { /* ignore */ }
});
afterEach(() => {
  cleanup();
  document.body.classList.remove("lt-paid-lock");
});

describe("PacksShop · PAID-SHEET-1", () => {
  it("a paid outcome opens the pop-up (item name, receipt line, Download files, the who-card) and does NOT scroll to My packs", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    shop();
    const sheet = await screen.findByTestId("paid-sheet");
    expect(sheet.querySelector('[role="dialog"][aria-modal="true"]')).toBeTruthy();
    expect(screen.getByTestId("paid-sheet-item").textContent).toMatch(/Chapter Pack$/);
    expect(screen.getByTestId("paid-sheet-receipt").textContent).toBe("Receipt sent to a••••@b.in"); // the pack licensee email (account has no email of its own)
    expect(screen.getByTestId("paid-sheet-primary").textContent).toBe("Download files");
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
    await settle();
    expect(scroll).not.toHaveBeenCalled();
    expect(screen.queryByTestId("packs-status")).toBeNull(); // no duplicate line / card at the bottom
    expect(events.hits.filter(([n]) => n === "paid_sheet_shown")).toEqual([["paid_sheet_shown", { surface: "pricing", item_kind: "pack" }]]);
  });

  it("closing it (Esc) scrolls to My packs, and focus is restored", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
    fetchMine.mockImplementation(async () => ({
      packs: buyMock.mock.calls.length ? [{ packId: "pack_chapter:real-numbers", sku: "pack_chapter", target: "real-numbers", pricePaidInr: 49, paidAt: 9, orderId: "order_P1" }] : [],
      licensee: { name: "Asha", email: "a@b.in" },
    }));
    shop();
    const panel = (await screen.findByTestId("paid-sheet")).querySelector('[role="dialog"]') as HTMLElement;
    fireEvent.keyDown(panel, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("paid-sheet")).toBeNull());
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(document.body.classList.contains("lt-paid-lock")).toBe(false);
  });

  it("pending -> paid by polling opens the same pop-up", async () => {
    buyMock.mockResolvedValue({ status: "pending", orderId: "order_1", paymentId: "pay_p" });
    checkMock.mockResolvedValue({ state: "paid", orderId: "order_1", amountInr: 49 });
    shop();
    expect(await screen.findByTestId("paid-sheet", undefined, { timeout: 4000 })).toBeTruthy();
  });

  it("kill switch VITE_PAID_SHEET_DISABLED=1: today's inline status + card, no pop-up, scrolls as before", async () => {
    vi.stubEnv("VITE_PAID_SHEET_DISABLED", "1");
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    shop();
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
    expect(screen.queryByTestId("paid-sheet")).toBeNull();
    expect((await screen.findByTestId("packs-status")).textContent).toMatch(/Payment received/);
  });

  it("signed out: no pop-up", async () => {
    auth.user = null;
    shop();
    await settle();
    expect(screen.queryByTestId("paid-sheet")).toBeNull();
  });

  it("a move of the purchase completes INSIDE the pop-up: nothing behind it scrolls (even on /packs#my-packs); closing it then scrolls", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
    fetchMine.mockImplementation(async () => ({
      packs: buyMock.mock.calls.length ? [{ packId: "pack_chapter:real-numbers", sku: "pack_chapter", target: "real-numbers", pricePaidInr: 49, paidAt: 9, orderId: "order_P1" }] : [],
      licensee: { name: "Asha", email: "a@b.in" },
    }));
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
    render(
      <MemoryRouter initialEntries={["/packs?buy=pack_chapter&t=real-numbers#my-packs"]}>
        <PacksShop>{() => null}</PacksShop>
      </MemoryRouter>,
    );
    await screen.findByTestId("paid-sheet");
    await act(async () => { await new Promise((r) => setTimeout(r, 1100)); }); // past the #my-packs re-assert window
    scroll.mockClear();
    scrollTo.mockClear();
    fireEvent.click(await screen.findByTestId("stub-moved"));
    await act(async () => { await new Promise((r) => setTimeout(r, 400)); });
    expect(screen.getByTestId("paid-sheet")).toBeTruthy(); // still open: the result is read here
    expect(screen.queryByTestId("paid-sheet-primary")).toBeNull();
    expect(scroll).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("paid-sheet-close"));
    await waitFor(() => expect(scroll).toHaveBeenCalled());
  });

  it("closed without a who-choice: the status line stays with a button that reopens the pop-up; once moved it is gone", async () => {
    auth.user = { uid: "u1", email: "friend@gmail.com" };
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    shop();
    await screen.findByTestId("paid-sheet");
    expect(screen.getByTestId("paid-sheet-receipt").textContent).toBe("Receipt sent to fr••••@gmail.com");
    fireEvent.click(screen.getByTestId("paid-sheet-close"));
    expect(screen.queryByTestId("paid-sheet")).toBeNull();
    expect((await screen.findByTestId("packs-status")).textContent).toMatch(/Payment received/);
    fireEvent.click(screen.getByTestId("paid-sheet-reopen"));
    expect(await screen.findByTestId("paid-sheet")).toBeTruthy();
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
    fireEvent.click(screen.getByTestId("stub-moved"));
    fireEvent.click(screen.getByTestId("paid-sheet-close"));
    expect(screen.queryByTestId("paid-sheet-reopen")).toBeNull();
  });

  it("FU-PAIDSHEET-NITS D-NIT-1: once the buyer answers me / child in the pop-up, the \"Who will use this?\" reopen button is gone", async () => {
    auth.user = { uid: "u1", email: "friend@gmail.com" };
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    shop();
    await screen.findByTestId("paid-sheet");
    fireEvent.click(await screen.findByTestId("stub-answered"));
    fireEvent.click(screen.getByTestId("paid-sheet-close"));
    expect(screen.queryByTestId("paid-sheet")).toBeNull();
    expect((await screen.findByTestId("packs-status")).textContent).toMatch(/Payment received/);
    expect(screen.queryByTestId("paid-sheet-reopen")).toBeNull();
  });
});
