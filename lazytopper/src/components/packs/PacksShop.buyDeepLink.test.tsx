/**
 * PREEXIST-FIX-1 (7 Nov 2026) - a `/packs?buy=` deep link must ALWAYS open the right checkout once auth (and, signed in, My packs)
 * is known, exactly once, and never act before auth hydrates. Live, the sheet's lazy chunks were fetched only after the param strip,
 * so the clean /packs showed for up to ~2 s first; the chunks are now warmed at mount. A My packs read that never answers opens the
 * pop-up only after BUY_RESUME_MINE_TIMEOUT_MS (no payment without knowing what the student owns).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; email?: string }, loading: false }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("../../services/guestPay", async (orig) => ({
  ...(await orig<typeof import("../../services/guestPay")>()),
  isGuestPayClientEnabled: () => true,
}));
vi.mock("../../services/checkoutWhoFlag", async (orig) => ({
  ...(await orig<typeof import("../../services/checkoutWhoFlag")>()),
  isCheckoutWhoClientEnabled: () => true,
}));
const mineCtl = vi.hoisted(() => ({ hang: false }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(() => (mineCtl.hang ? new Promise(() => undefined) : Promise.resolve({ packs: [], licensee: { name: "Asha", email: "a@b.in" } }))),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
    checkPackOrder: vi.fn(),
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
const chunks = vi.hoisted(() => ({ sheet: 0, dialog: 0 }));
vi.mock("../../pages/PackDialog", () => {
  chunks.dialog += 1;
  return { default: (p: { sku: string }) => <div data-testid="pack-dialog" data-sku={p.sku} /> };
});
vi.mock("../checkoutWho/CheckoutSheet", () => {
  chunks.sheet += 1;
  return { default: (p: { item: { sku: string } }) => <div data-testid="who-sheet" data-sku={p.item.sku}>Who will use it?</div> };
});

import PacksShop, { BUY_RESUME_MINE_TIMEOUT_MS } from "./PacksShop";
import * as packs from "../../services/packs";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;

function Where() {
  const l = useLocation();
  return <p data-testid="where">{l.pathname + l.search + l.hash}</p>;
}

function tree(url: string) {
  return (
    <MemoryRouter initialEntries={[url]}>
      <Where />
      <Routes>
        <Route path="/packs" element={<PacksShop>{() => null}</PacksShop>} />
        <Route path="/login" element={<p>LOGIN PAGE</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  auth.user = null;
  auth.loading = false;
  mineCtl.hang = false;
  buyMock.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("PREEXIST-FIX-1 · /packs?buy= deep link", () => {
  // Order matters for the chunk counters (a vi.mock factory runs once per file, on first import).
  it("no ?buy=: the sheet / pop-up chunks are NOT fetched on a plain /packs visit", async () => {
    render(tree("/packs"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(chunks.sheet).toBe(0);
    expect(chunks.dialog).toBe(0);
  });

  it("★ signed out: nothing acts while auth is loading (param kept) but the chunks are warmed; once auth is known the sheet opens ONCE", async () => {
    auth.loading = true;
    const r = render(tree("/packs?buy=pack_cbq&t=science"));
    await waitFor(() => expect(chunks.sheet).toBe(1));
    expect(chunks.dialog).toBe(1);
    expect(screen.getByTestId("where").textContent).toBe("/packs?buy=pack_cbq&t=science");
    expect(screen.queryByTestId("who-sheet")).toBeNull();
    auth.loading = false;
    r.rerender(tree("/packs?buy=pack_cbq&t=science"));
    const sheet = await screen.findByTestId("who-sheet");
    expect(sheet.getAttribute("data-sku")).toBe("pack_cbq");
    expect(screen.getByTestId("pack-dialog").getAttribute("data-sku")).toBe("pack_cbq");
    expect(screen.getByTestId("where").textContent).toBe("/packs");
    r.rerender(tree("/packs?buy=pack_cbq&t=science"));
    expect(screen.getAllByTestId("who-sheet")).toHaveLength(1);
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("★ seeded signed in: auth hydrates late to a user -> buyPack ONCE for that pack, no signed-out sheet in between", async () => {
    auth.loading = true;
    const r = render(tree("/packs?buy=pack_bundle"));
    expect(screen.queryByTestId("who-sheet")).toBeNull();
    auth.user = { uid: "u1", email: "a@b.in" };
    auth.loading = false;
    r.rerender(tree("/packs?buy=pack_bundle"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_bundle");
    expect(screen.queryByTestId("who-sheet")).toBeNull();
    expect(screen.getByTestId("where").textContent).toBe("/packs");
    r.rerender(tree("/packs?buy=pack_bundle"));
    await act(async () => {
      await new Promise((res) => setTimeout(res, 20));
    });
    expect(buyMock).toHaveBeenCalledTimes(1);
  });

  it("★ signed in, My packs never answers: after the timeout the pop-up opens and NO payment starts (CONTROL: not before it)", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mineCtl.hang = true;
    auth.user = { uid: "u1", email: "a@b.in" };
    render(tree("/packs?buy=pack_cbq&t=maths"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(BUY_RESUME_MINE_TIMEOUT_MS - 100);
    });
    expect(screen.queryByTestId("pack-dialog")).toBeNull();
    expect(screen.getByTestId("where").textContent).toBe("/packs?buy=pack_cbq&t=maths");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(screen.getByTestId("where").textContent).toBe("/packs");
    expect(screen.getByTestId("pack-dialog").getAttribute("data-sku")).toBe("pack_cbq");
    expect(buyMock).not.toHaveBeenCalled();
  });
});
