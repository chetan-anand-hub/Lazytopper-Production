/** BONUS-BOOK-1 - My packs: a CBQ Pack buyer's "Bonus: complete book (PDF)" row. Harness as PacksShop.zip.test.tsx. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
const guestBuy = vi.hoisted(() => ({ buyAsGuest: vi.fn() }));
vi.mock("../../services/guestPay", async (orig) => ({
  ...(await orig<typeof import("../../services/guestPay")>()),
  isGuestPayClientEnabled: () => true,
  buyAsGuest: (...a: unknown[]) => guestBuy.buyAsGuest(...a),
}));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return { ...actual, isPacksClientEnabled: () => true, fetchMyPacks: vi.fn(), buyPack: vi.fn(), checkPackOrder: vi.fn() };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({ default: (p: { buy?: unknown }) => (p.buy as never) ?? null }));
const builder = vi.hoisted(() => ({ buildPackFiles: vi.fn() }));
vi.mock("../../lib/packs/buildPackFiles", () => ({
  buildPackFiles: (...a: unknown[]) => builder.buildPackFiles(...a),
  groupPackFiles: (files: Array<{ group: string }>) => {
    const by = new Map<string, unknown[]>();
    for (const f of files) by.set(f.group, [...(by.get(f.group) || []), f]);
    return [...by].map(([group, fs]) => ({ group, files: fs }));
  },
}));
const paid = vi.hoisted(() => ({ premium: false }));
vi.mock("../../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paid.premium }));
const track = vi.hoisted(() => ({ ready: vi.fn() }));
vi.mock("../../lib/packs/packAnalytics", async (orig) => ({
  ...(await orig<typeof import("../../lib/packs/packAnalytics")>()),
  trackPackReadyShown: (...a: unknown[]) => track.ready(...a),
}));

import PacksShop from "./PacksShop";
import * as packs from "../../services/packs";
import { resetGuestClaimSessionForTests } from "../../services/guestPay";

const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
const cbq = { packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths", pricePaidInr: 199, paidAt: 9, orderId: "order_1" };
const subjectPack = { packId: "pack_subject:maths", sku: "pack_subject", target: "maths", pricePaidInr: 199, paidAt: 9, orderId: "order_2" };
const dl = vi.hoisted(() => ({ book: vi.fn() }));
vi.mock("../../lib/packs/serverPdfDownload", () => ({ downloadBonusBookFromServer: (...a: unknown[]) => dl.book(...a), downloadZipFromServer: vi.fn() }));

function shop() {
  return render(
    <MemoryRouter initialEntries={["/packs#my-packs"]}>
      <Routes>
        <Route path="/packs" element={<PacksShop>{() => null}</PacksShop>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = { uid: "u1" };
  paid.premium = false;
  resetGuestClaimSessionForTests();
  dl.book.mockReset();
  builder.buildPackFiles.mockReset();
  builder.buildPackFiles.mockResolvedValue([]);
  fetchMine.mockReset();
});
afterEach(async () => {
  cleanup();
  (await import("./PackReadyToast")).closePackReadyToastForTests();
});

async function openFiles() {
  shop();
  fireEvent.click(await screen.findByText("Download files"));
  await waitFor(() => expect(builder.buildPackFiles).toHaveBeenCalled());
}

describe("BONUS-BOOK-1 - the CBQ Pack's complete-book row", () => {
  it("shows one bonus row when the server lists the CBQ Pack in bonusBooks; a tap downloads that pack's book", async () => {
    fetchMine.mockResolvedValue({ packs: [cbq], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null, bonusBooks: ["pack_cbq:maths"] });
    let done: (v: { ok: true }) => void = () => undefined;
    dl.book.mockReturnValue(new Promise((r) => (done = r)));
    await openFiles();
    const rows = await screen.findAllByTestId("bonus-book-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("Bonus: complete book (PDF)");
    const btn = screen.getByTestId("bonus-book-download");
    fireEvent.click(btn);
    await waitFor(() => expect(dl.book).toHaveBeenCalledWith({ packId: "pack_cbq:maths" }));
    await act(async () => done({ ok: true }));
    await waitFor(() => expect(btn.textContent).toBe("Saved \u2713"));
  });

  it("no row until the server lists it (not uploaded), and never on a non-CBQ pack", async () => {
    fetchMine.mockResolvedValue({ packs: [cbq, subjectPack], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null });
    shop();
    await screen.findAllByText("Download files");
    expect(screen.queryAllByTestId("bonus-book-row")).toHaveLength(0);
  });

  it("a refused link says Retry; a switched-off route hides the row", async () => {
    fetchMine.mockResolvedValue({ packs: [cbq], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null, bonusBooks: ["pack_cbq:maths"] });
    dl.book.mockResolvedValueOnce({ ok: false, reason: "not_ready" }).mockResolvedValueOnce({ ok: false, reason: "unavailable" });
    await openFiles();
    const btn = await screen.findByTestId("bonus-book-download");
    fireEvent.click(btn);
    await waitFor(() => expect(btn.textContent).toBe("Retry"));
    fireEvent.click(btn);
    await waitFor(() => expect(screen.queryAllByTestId("bonus-book-row")).toHaveLength(0));
  });
});
