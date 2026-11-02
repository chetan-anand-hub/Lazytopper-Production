/**
 * PACKS-TILE-BUY-1 (owner 2 Nov 2026) — Buy buttons ON the /packs tiles and CBQ cards, through the shop's own buy flow.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
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
  default: (p: { sku: string; focusPicker?: boolean; buy?: unknown }) => (
    <div data-testid="dialog" data-sku={p.sku} data-focus={String(Boolean(p.focusPicker))}>{p.buy as never}</div>
  ),
}));

import PacksPage from "../../pages/PacksPage";
import * as packs from "../../services/packs";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
const mineMock = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;

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
    expect(screen.getByTestId("tile-buy-pack_bundle").textContent).toBe(`Buy · ₹${P.pack_bundle}`);
    expect(screen.getByTestId("tile-buy-pack_mock-maths").textContent).toBe(`Maths ₹${P.pack_mock}`);
    expect(screen.getByTestId("tile-buy-pack_mock-science").textContent).toBe(`Science ₹${P.pack_mock}`);
    expect(screen.getByTestId("tile-buy-pack_subject-maths").textContent).toBe(`Maths ₹${P.pack_subject}`);
    expect(screen.getByTestId("tile-buy-pack_subject-science").textContent).toBe(`Science ₹${P.pack_subject}`);
    expect(screen.getByTestId("tile-buy-pack_chapter").textContent).toBe(`Choose chapter & buy · ₹${P.pack_chapter}`);
    expect(screen.getByTestId("tile-buy-pack_cbq-maths").textContent).toBe(`Buy Maths CBQ · ₹${P.pack_cbq}`);
    expect(screen.getByTestId("tile-buy-pack_cbq-science").textContent).toBe(`Buy Science CBQ · ₹${P.pack_cbq}`);
    // "See inside" and the samples stay.
    expect(screen.getByTestId("packs-card-mock").textContent).toContain("See inside");
    expect(screen.getByTestId("packs-card-cbq-maths").textContent).toBe("See inside →");
  });

  it("signed in: a tile Buy opens that pack's pop-up and starts the SAME checkout (Science Mock, Bundle, Maths CBQ)", async () => {
    page();
    await waitFor(() => expect(mineMock).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId("tile-buy-pack_mock-science"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(1));
    expect(buyMock.mock.calls[0].slice(0, 2)).toEqual(["pack_mock", "science"]);
    expect(screen.getByTestId("dialog").getAttribute("data-sku")).toBe("pack_mock");
    fireEvent.click(screen.getByTestId("tile-buy-pack_bundle"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(2));
    expect(buyMock.mock.calls[1].slice(0, 2)).toEqual(["pack_bundle", undefined]);
    fireEvent.click(screen.getByTestId("tile-buy-pack_cbq-maths"));
    await waitFor(() => expect(buyMock).toHaveBeenCalledTimes(3));
    expect(buyMock.mock.calls[2].slice(0, 2)).toEqual(["pack_cbq", "maths"]);
  });

  it("Choose chapter & buy opens the Chapter Pack pop-up on the picker and starts nothing", async () => {
    page();
    fireEvent.click(screen.getByTestId("tile-buy-pack_chapter"));
    const d = await screen.findByTestId("dialog");
    expect(d.getAttribute("data-sku")).toBe("pack_chapter");
    expect(d.getAttribute("data-focus")).toBe("true");
    expect(buyMock).not.toHaveBeenCalled();
  });

  it("an owned pack says You own this instead of a Buy", async () => {
    mineMock.mockResolvedValueOnce({
      packs: [{ packId: "pack_mock:maths", sku: "pack_mock", target: "maths", pricePaidInr: 99, paidAt: 1, orderId: "o" }],
      licensee: { name: "Asha", email: "a@b.in" },
      boardPassCredit: null,
    });
    page();
    expect(await screen.findByTestId("tile-owned-pack_mock-maths")).toHaveProperty("textContent", "Maths · You own this");
    expect(screen.queryByTestId("tile-buy-pack_mock-maths")).toBeNull();
    expect(screen.getByTestId("tile-buy-pack_mock-science")).toBeTruthy();
  });

  it("signed out: guest pay on -> the pay sheet; off -> today's sign-in-then-pay", async () => {
    auth.user = null;
    flags.guest = true;
    page();
    fireEvent.click(screen.getByTestId("tile-buy-pack_cbq-science"));
    expect(await screen.findByTestId("guest-pay-sheet")).toBeTruthy();
    cleanup();
    flags.guest = false;
    page();
    fireEvent.click(screen.getByTestId("tile-buy-pack_subject-maths"));
    expect(await screen.findByText("LOGIN PAGE")).toBeTruthy();
  });

  it("packs dark: no Buy buttons on the tiles (the pop-up says Opens soon)", () => {
    flags.packs = false;
    page();
    expect(screen.queryByTestId("tile-buy-pack_bundle")).toBeNull();
    expect(screen.getByTestId("packs-card-cbq-maths").textContent).toContain("₹199");
  });
});
