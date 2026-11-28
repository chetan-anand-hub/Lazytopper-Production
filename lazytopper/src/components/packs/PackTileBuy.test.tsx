/**
 * PACKS-TILE-BUY-1 (owner 2 Nov 2026) — Buy buttons ON the /packs tiles and CBQ cards, through the shop's own buy flow.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string; isLocalSession?: boolean } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const flags = vi.hoisted(() => ({ packs: true, guest: false }));
vi.mock("../../services/guestPay", async (orig) => ({ ...(await orig<typeof import("../../services/guestPay")>()), isGuestPayClientEnabled: () => flags.guest }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => flags.packs,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null })),
    buyPack: vi.fn(async () => ({ status: "dismissed" })),
    checkPackOrder: vi.fn(),
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({
  default: (p: { sku: string; focusPicker?: boolean; buy?: unknown; pickerSubject?: string | null }) => (
    <div data-testid="dialog" data-sku={p.sku} data-focus={String(Boolean(p.focusPicker))} data-picker-subject={p.pickerSubject ?? ""}>{p.buy as never}</div>
  ),
}));

import PacksPage from "../../pages/PacksPage";
import { OTHER_PAYMENT_BUSY_COPY } from "./PacksShop";
import * as packs from "../../services/packs";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
const mineMock = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;

/**
 * PACKS-TIDY-2: ONE Maths / Science switch above the Subject / Mock / Chapter rows (was one per card); `row` is kept so each call still
 * says which Buy it is after. The CBQ Packs' Buy left /packs for /cbq-packs (CbqPacksPage.test covers it there).
 */
const pick = (_row: "mock" | "subject" | "chapter", subject: "maths" | "science") => fireEvent.click(screen.getByTestId(`packs-subject-${subject}`));

function page() {
  return render(
    <MemoryRouter initialEntries={["/packs"]}>
      <Routes>
        <Route path="/packs" element={<PacksPage />} />
        <Route path="/login" element={<p>LOGIN PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = { uid: "u1" };
  flags.packs = true;
  flags.guest = false;
  buyMock.mockClear();
});
afterEach(() => cleanup());

describe("PACKS-TILE-BUY-1 · /packs tiles", () => {
  it("every tile has its Buy, priced from PACK_PRICE_INR only", async () => {
    page();
    const P = packs.PACK_PRICE_INR;
    expect(screen.getByTestId("tile-buy-pack_bundle").textContent).toBe(`Buy · ${packs.packBuyLabel("pack_bundle")}`);
    // v1.2 L2: a compact row Buy shows "Buy <total>"; its accessible name says which pack and subject.
    expect(screen.getByTestId("tile-buy-pack_mock-maths").textContent).toBe(`Buy ${packs.packBuyLabel("pack_mock")}`);
    expect(screen.getByTestId("tile-buy-pack_mock-maths").getAttribute("aria-label")).toBe(`Buy Maths Mock Pack · ${packs.packBuyLabel("pack_mock")}`);
    expect(screen.queryByTestId("tile-buy-pack_mock-science")).toBeNull(); // one Buy, for the chosen subject
    pick("mock", "science");
    expect(screen.getByTestId("tile-buy-pack_mock-science").getAttribute("aria-label")).toBe(`Buy Science Mock Pack · ${packs.packBuyLabel("pack_mock")}`);
    expect(screen.queryByTestId("tile-buy-pack_mock-maths")).toBeNull();
    // the one switch moved the Subject Pack's Buy with it (Science)
    expect(screen.getByTestId("tile-buy-pack_subject-science").getAttribute("aria-label")).toBe(`Buy Science Subject Pack · ${packs.packBuyLabel("pack_subject")}`);
    expect(screen.getByTestId("tile-buy-pack_chapter").textContent).toBe("Choose chapter");
    expect(screen.getByTestId("tile-buy-pack_chapter").getAttribute("aria-label")).toBe(`Choose a Science chapter · ${packs.packBuyLabel("pack_chapter")}`);
    pick("subject", "maths");
    expect(screen.getByTestId("tile-buy-pack_subject-maths").textContent).toBe(`Buy ${packs.packBuyLabel("pack_subject")}`);
    expect(screen.getByTestId("tile-buy-pack_subject-maths").getAttribute("aria-label")).toBe(`Buy Maths Subject Pack · ${packs.packBuyLabel("pack_subject")}`);
    expect(screen.getByTestId("tile-buy-pack_chapter").getAttribute("aria-label")).toBe(`Choose a Maths chapter · ${packs.packBuyLabel("pack_chapter")}`);
    // PACKS-TIDY-2: no CBQ Buy on /packs (it is on /cbq-packs); the CBQ link card says the price from the pack config.
    expect(screen.queryByTestId("tile-buy-pack_cbq-maths")).toBeNull();
    expect(screen.getByTestId("packs-link-cbq").textContent).toContain(packs.packPriceLabel("pack_cbq"));
    // "See inside" and the samples stay.
    expect(screen.getByTestId("packs-card-mock").textContent).toContain("See inside");
  });

  it("signed in: a tile Buy opens that pack's pop-up and starts the SAME checkout (Science Mock, Bundle, Science Subject)", async () => {
    page();
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    pick("mock", "science");
    fireEvent.click(screen.getByTestId("tile-buy-pack_mock-science"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0].slice(0, 2)).toEqual(["pack_mock", "science"]);
    expect(screen.getByTestId("dialog").getAttribute("data-sku")).toBe("pack_mock");
    fireEvent.click(screen.getByTestId("tile-buy-pack_bundle"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(2));
    expect(buyMock.mock.calls[1].slice(0, 2)).toEqual(["pack_bundle", undefined]);
    fireEvent.click(screen.getByTestId("tile-buy-pack_subject-science"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(3));
    expect(buyMock.mock.calls[2].slice(0, 2)).toEqual(["pack_subject", "science"]);
  });

  it("Choose chapter & buy opens the Chapter Pack pop-up on the picker and starts nothing", async () => {
    page();
    fireEvent.click(screen.getByTestId("tile-buy-pack_chapter"));
    const d = await screen.findByTestId("dialog");
    expect(d.getAttribute("data-sku")).toBe("pack_chapter");
    expect(d.getAttribute("data-focus")).toBe("true");
    expect(buyMock).not.toHaveBeenCalled();
    // PACKS-TIDY-2: "Choose a <Subject> chapter" limits the existing picker to the switch's subject (PRICING-B-1's chooseChapter({ subject })).
    expect(d.getAttribute("data-picker-subject")).toBe("maths");
  });

  it("an owned pack says You own this instead of a Buy", async () => {
    mineMock.mockResolvedValueOnce({
      packs: [{ packId: "pack_mock:maths", sku: "pack_mock", target: "maths", pricePaidInr: 99, paidAt: 1, orderId: "o" }],
      licensee: { name: "Asha", email: "a@b.in" },
      boardPassCredit: null,
    });
    page();
    // v1.2 L2: the compact owned pill ("✓ Owned"; its accessible name names the pack); never a Buy.
    const pill = await screen.findByTestId("tile-owned-pack_mock-maths");
    expect(pill.tagName).toBe("SPAN");
    expect(pill.textContent).toBe("✓ Owned");
    expect(pill.getAttribute("aria-label")).toBe("You own the Maths Mock Pack");
    expect(screen.queryByTestId("tile-buy-pack_mock-maths")).toBeNull();
    pick("mock", "science");
    expect(screen.getByTestId("tile-buy-pack_mock-science")).toBeTruthy();
  });

  it("signed out: guest pay on -> the pay sheet; off -> today's sign-in-then-pay", async () => {
    auth.user = null;
    flags.guest = true;
    page();
    pick("mock", "science");
    fireEvent.click(screen.getByTestId("tile-buy-pack_mock-science"));
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    cleanup();
    flags.guest = false;
    page();
    fireEvent.click(screen.getByTestId("tile-buy-pack_subject-maths"));
    expect(await screen.findByText("LOGIN PAGE")).toBeTruthy();
  });

  it("packs dark: no Buy buttons on the tiles (the pop-up says Opens soon)", async () => {
    flags.packs = false;
    page();
    expect(screen.queryByTestId("tile-buy-pack_bundle")).toBeNull();
    // PACKS-TIDY-2: a neutral button (no "Buy") holds each Buy's place; it only opens the pack's pop-up.
    // review N1: the neutral buttons name the TOTAL (as the app's Buy does); the GST breakup is under / beside them.
    expect(screen.getByTestId("pk-buy-bundle-neutral").textContent).toBe(`Bundle · ${packs.packBuyLabel("pack_bundle")}`);
    expect(screen.getByTestId("pk-buy-mock-neutral").textContent).toBe(packs.packBuyLabel("pack_mock"));
    expect(screen.getByTestId("pk-buy-mock-neutral").getAttribute("aria-label")).toBe(`Mock Pack · ${packs.packPriceLabel("pack_mock")}`);
    expect(screen.getByTestId("pk-buy-chapter-neutral").textContent).toBe("Choose chapter");
    expect(document.body.textContent).not.toMatch(/\bBuy\b[^?]/);
    fireEvent.click(screen.getByTestId("pk-buy-bundle-neutral"));
    expect((await screen.findByTestId("dialog")).getAttribute("data-sku")).toBe("pack_bundle");
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("review fix 1: a second tap while the first payment is CONFIRMING creates no second order, and the tile says owned", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      buyMock.mockResolvedValueOnce({ status: "pending", orderId: "order_1" });
      (packs.checkPackOrder as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ state: "pending" });
      page();
      await vi.waitFor(() => expect(mineMock).toHaveBeenCalled());
      fireEvent.click(screen.getByTestId("tile-buy-pack_mock-maths"));
      // run the status polls out -> "confirming"
      for (let i = 0; i < 6; i += 1) await vi.advanceTimersByTimeAsync(31_000);
      await vi.waitFor(() => expect(screen.getByTestId("tile-owned-pack_mock-maths")).toBeTruthy());
      // the pop-up's own Buy is off too, and a direct second attempt orders nothing
      const dialogBuy = screen.getByTestId("packs-buy-pack_mock") as HTMLButtonElement;
      expect(dialogBuy.disabled).toBe(true);
      fireEvent.click(dialogBuy);
      await vi.advanceTimersByTimeAsync(10);
      expect(buyMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("review fix 2: while one pack's checkout is open, every OTHER Buy is disabled with a visible reason", async () => {
    let finish: (v: unknown) => void = () => undefined;
    buyMock.mockImplementationOnce(() => new Promise((r) => { finish = r; }));
    page();
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("tile-buy-pack_mock-maths"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    for (const id of ["tile-buy-pack_bundle", "tile-buy-pack_subject-maths", "tile-buy-pack_chapter", "tile-buy-pack_mock-science", "tile-buy-pack_subject-science"]) {
      if (id === "tile-buy-pack_mock-science") pick("mock", "science");
      const b = screen.getByTestId(id) as HTMLButtonElement;
      expect(b.disabled, id).toBe(true);
      expect(b.getAttribute("aria-disabled"), id).toBe("true");
    }
    expect(screen.getAllByText(OTHER_PAYMENT_BUSY_COPY).length).toBeGreaterThan(0);
    finish({ status: "dismissed" });
    await waitFor(() => expect((screen.getByTestId("tile-buy-pack_bundle") as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByText(OTHER_PAYMENT_BUSY_COPY)).toBeNull();
  });

  it("review fix 6: a local (non-cloud) session is treated as signed out (no order, today's sign-in)", async () => {
    auth.user = { uid: "local-dev", isLocalSession: true };
    page();
    fireEvent.click(screen.getByTestId("tile-buy-pack_bundle"));
    expect(await screen.findByText("LOGIN PAGE")).toBeTruthy();
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("review fix 4: the owned pill is not a button and carries a check mark", async () => {
    mineMock.mockResolvedValueOnce({
      packs: [{ packId: "pack_bundle:all", sku: "pack_bundle", target: "all", pricePaidInr: 299, paidAt: 1, orderId: "o" }],
      licensee: { name: "Asha", email: "a@b.in" },
      boardPassCredit: null,
    });
    page();
    const pill = await screen.findByTestId("tile-owned-pack_bundle");
    expect(pill.tagName).toBe("SPAN");
    expect(pill.textContent).toBe("✓You own this");
  });
});

describe("GST-EXCL-1 · the breakup next to every tile Buy and the pop-up Buy", () => {
  const CUT = Date.parse("2026-11-07T00:00:00+05:30");
  afterEach(() => vi.useRealTimers());

  it("1 ms before 00:00 IST 7 Nov: no breakup anywhere and today's Buy labels; from the cut-off: totals on Buy, breakup beside it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(CUT - 1);
    page();
    expect(screen.getByTestId("tile-buy-pack_bundle").textContent).toBe("Buy · ₹299");
    expect(screen.getByTestId("tile-buy-pack_chapter").getAttribute("aria-label")).toBe("Choose a Maths chapter · ₹49");
    expect(screen.queryAllByTestId(/^tile-gst-/)).toHaveLength(0);
    pick("mock", "science");
    fireEvent.click(screen.getByTestId("tile-buy-pack_mock-science"));
    await waitFor(() => expect(screen.getByTestId("dialog").getAttribute("data-sku")).toBe("pack_mock"));
    expect(screen.queryByTestId("packs-gst-pack_mock")).toBeNull();
    cleanup();

    vi.setSystemTime(CUT);
    page();
    expect(screen.getByTestId("tile-buy-pack_bundle").textContent).toBe("Buy · ₹299 + GST (₹353 total)");
    expect(screen.getByTestId("tile-gst-pack_bundle").textContent).toBe("₹299 + ₹54 GST (18%) = ₹353");
    expect(screen.getByTestId("tile-gst-pack_chapter").textContent).toBe("₹49 + ₹9 GST (18%) = ₹58");
    expect(screen.getByTestId("tile-gst-pack_mock").textContent).toBe("₹99 + ₹18 GST (18%) = ₹117");
    expect(screen.getByTestId("tile-gst-pack_subject").textContent).toBe("₹199 + ₹36 GST (18%) = ₹235");
    expect(screen.queryAllByTestId("tile-gst-pack_cbq")).toHaveLength(0); // PACKS-TIDY-2: the CBQ card is on /cbq-packs
    pick("mock", "science");
    fireEvent.click(screen.getByTestId("tile-buy-pack_mock-science"));
    await waitFor(() => expect(screen.getByTestId("packs-gst-pack_mock").textContent).toBe("₹99 + ₹18 GST (18%) = ₹117"));
  });
});
