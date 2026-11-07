/**
 * PREEXIST-FIX-1 (7 Nov 2026) - a `/packs?buy=` deep link must ALWAYS open the right checkout once auth (and, signed in, My packs)
 * is known, exactly once, and never act before auth hydrates. Live, the sheet's lazy chunks were fetched only after the param strip,
 * so the clean /packs showed for up to ~2 s first; the chunks are now warmed at mount. A My packs read that never answers opens the
 * pop-up only after BUY_RESUME_MINE_TIMEOUT_MS (no payment without knowing what the student owns).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

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
// GST-FU-1 F2: the state flag (OFF unless a test turns it on), the remembered state + PIN, and the state line above Pay.
const flag = vi.hoisted(() => ({ on: false }));
vi.mock("../../services/gstBuyerOrder", async (orig) => ({
  ...(await orig<typeof import("../../services/gstBuyerOrder")>()),
  gstStateFieldOn: () => flag.on,
}));
vi.mock("../gstInvoice/GstStateLine", () => ({
  default: () => (flag.on ? <p data-testid="gst-state-line">State: Kerala · PIN 682001 · Change</p> : null),
}));
const gst = vi.hoisted(() => ({ remembered: null as null | { stateCode: string; pin?: string }, contextReads: 0 }));
vi.mock("../../services/gstBuyer", async (orig) => ({
  ...(await orig<typeof import("../../services/gstBuyer")>()),
  currentAuthUid: async () => "u1",
  loadGstContext: async () => {
    gst.contextReads += 1;
    return { remembered: gst.remembered, ipStateCode: null };
  },
}));
vi.mock("../../services/checkout", async (orig) => ({
  ...(await orig<typeof import("../../services/checkout")>()),
  authHeaders: async () => ({ Authorization: "Bearer t" }),
}));
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
  return {
    default: (p: { sku: string; buy?: ReactNode }) => (
      // GST-FU-1 F2: the buy area (Pay + the state line) only for the F2 cases, so the earlier cases are unchanged.
      <div role="dialog" data-testid="pack-dialog" data-sku={p.sku}>
        {flag.on ? p.buy : null}
      </div>
    ),
  };
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
        <Route path="/pricing" element={<PacksShop>{() => null}</PacksShop>} />
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
  flag.on = false;
  gst.remembered = null;
  gst.contextReads = 0;
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

/**
 * GST-FU-1 F2 (owner-approved follow-up, 7 Nov 2026) - a signed-in `?buy=pack_*` link (on /packs and /pricing, and the pack
 * return-after-sign-in, which all land on this resume) started checkout at once; with a REMEMBERED state + PIN Razorpay then
 * opened straight away and covered "State: X · Change". With VITE_GST_STATE_FIELD on and a remembered state the resume stops at
 * the pop-up's Pay (line + total above it, focus on Pay): one tap to Razorpay. Nothing remembered -> it starts as today (the
 * order step asks state + PIN). Flag off -> exactly as before, and the state context is never read.
 */
describe("GST-FU-1 F2 · signed-in ?buy=pack_* with a remembered state", () => {
  beforeEach(() => {
    auth.user = { uid: "u1", email: "a@b.in" };
    flag.on = true;
  });

  it.each(["/packs?buy=pack_bundle", "/pricing?buy=pack_bundle"])("★ %s: stops at the pop-up's Pay (state line + total visible, Pay focused); ONE tap opens Razorpay", async (url) => {
    gst.remembered = { stateCode: "32", pin: "682001" };
    render(tree(url));
    const pay = await screen.findByTestId("packs-buy-pack_bundle");
    await waitFor(() => expect(document.activeElement).toBe(pay));
    expect(buyMock).not.toHaveBeenCalled();
    const dialog = screen.getByTestId("pack-dialog");
    expect(dialog.querySelector('[data-testid="gst-state-line"]')).not.toBeNull();
    expect(dialog.querySelector('[data-testid="packs-gst-pack_bundle"]')).not.toBeNull();
    fireEvent.click(pay);
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0][0]).toBe("pack_bundle");
  });

  it("CONTROL: no remembered state -> checkout starts at once, as today (the order step asks state + PIN)", async () => {
    render(tree("/packs?buy=pack_bundle"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(gst.contextReads).toBe(1);
  });

  it("CONTROL: a remembered state with no valid PIN is not 'remembered' (the dialog will ask) -> starts as today", async () => {
    gst.remembered = { stateCode: "32" };
    render(tree("/packs?buy=pack_bundle"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
  });

  it("flag off: starts at once exactly as before; the state context is never read", async () => {
    flag.on = false;
    gst.remembered = { stateCode: "32", pin: "682001" };
    render(tree("/packs?buy=pack_bundle"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(gst.contextReads).toBe(0);
  });
});
