/** SERVER-PDF-1 PR-C - My packs: "Download all (ZIP)" per group, the server link calls, and the quiet fallbacks. Harness as PacksShop.cbqParts.test.tsx. */
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
const subject = { packId: "pack_subject:maths", sku: "pack_subject", target: "maths", pricePaidInr: 199, paidAt: 9, orderId: "order_1" };
const zip = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("../../lib/packs/serverPdfDownload", () => ({ downloadZipFromServer: (...a: unknown[]) => zip.download(...a) }));

function shop() {
  return render(
    <MemoryRouter initialEntries={["/packs#my-packs"]}>
      <Routes>
        <Route path="/packs" element={<PacksShop>{() => null}</PacksShop>} />
      </Routes>
    </MemoryRouter>,
  );
}

const file = (groupId: string, group: string, n: number) => ({
  id: `pack_subject:maths|${groupId}|f${n}`,
  packId: "pack_subject:maths",
  groupId,
  group,
  label: `${group} file ${n}`,
  build: vi.fn(async () => undefined),
});

beforeEach(() => {
  auth.user = { uid: "u1" };
  paid.premium = false;
  resetGuestClaimSessionForTests();
  zip.download.mockReset();
  builder.buildPackFiles.mockReset();
  builder.buildPackFiles.mockResolvedValue([
    file("real-numbers", "Real Numbers", 1), file("real-numbers", "Real Numbers", 2),
    file("polynomials", "Polynomials", 1), file("polynomials", "Polynomials", 2),
    file("mocks-maths", "Mock papers", 1), file("mocks-maths", "Mock papers", 2),
    file("solo", "One file group", 1),
  ]);
  fetchMine.mockReset();
  fetchMine.mockResolvedValue({ packs: [subject], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null });
});
afterEach(async () => {
  cleanup();
  vi.unstubAllEnvs();
  (await import("./PackReadyToast")).closePackReadyToastForTests();
});

async function openFiles() {
  shop();
  fireEvent.click(await screen.findByText("Download files"));
  return screen.findAllByTestId("zip-download");
}

describe("SERVER-PDF-1 PR-C - Download all (ZIP) per group in My packs", () => {
  it("asks buildPackFiles for the server link path", async () => {
    await openFiles();
    expect(builder.buildPackFiles.mock.calls[0][1]).toMatchObject({ serverLinks: true });
  });

  it("one ZIP button per group of two or more files (each chapter, the mocks); a one-file group has none", async () => {
    const btns = await openFiles();
    expect(btns.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Download all Real Numbers files as one ZIP",
      "Download all Polynomials files as one ZIP",
      "Download all Mock papers files as one ZIP",
    ]);
    for (const b of btns) {
      expect(b.textContent).toBe("Download all (ZIP)");
      expect(b.className).toContain("lt-packs__btn--zip"); // fixed width: no shift when the text changes
    }
  });

  it("a tap asks for that group's ZIP of this pack, shows Preparing, then Saved", async () => {
    let done: (v: { ok: true }) => void = () => undefined;
    zip.download.mockReturnValue(new Promise((r) => (done = r)));
    const btns = await openFiles();
    fireEvent.click(btns[1]);
    expect(btns[1].textContent).toBe("Preparing ZIP\u2026");
    await waitFor(() => expect(zip.download).toHaveBeenCalledTimes(1));
    expect(zip.download.mock.calls[0][0]).toMatchObject({ packId: "pack_subject:maths", groupId: "polynomials" });
    expect((btns[0] as HTMLButtonElement).disabled).toBe(true); // one download at a time
    await act(async () => done({ ok: true }));
    await waitFor(() => expect(btns[1].textContent).toBe("Saved \u2713"));
    expect((btns[0] as HTMLButtonElement).disabled).toBe(false);
  });

  it("a busy server (429 / not ready / timeout) says so quietly and leaves every file's own button working", async () => {
    zip.download.mockResolvedValue({ ok: false, reason: "busy" });
    const btns = await openFiles();
    fireEvent.click(btns[0]);
    await waitFor(() => expect(btns[0].textContent).toBe("Retry"));
    expect(screen.getAllByRole("alert").some((n) => /didn.t work/i.test(n.textContent || ""))).toBe(true);
    expect(screen.getAllByText("Download").length).toBeGreaterThanOrEqual(6);
  });

  it("when the server has no ZIP at all (kill switch 404) every ZIP button goes away", async () => {
    zip.download.mockResolvedValue({ ok: false, reason: "unavailable" });
    const btns = await openFiles();
    fireEvent.click(btns[0]);
    await waitFor(() => expect(screen.queryAllByTestId("zip-download")).toHaveLength(0));
    expect(screen.getAllByText("Download").length).toBeGreaterThanOrEqual(6);
  });

  it("VITE_PACK_SERVER_PDF_DISABLED hides the ZIP buttons from the start and never asks the server", async () => {
    vi.stubEnv("VITE_PACK_SERVER_PDF_DISABLED", "1");
    shop();
    fireEvent.click(await screen.findByText("Download files"));
    await screen.findAllByText("Download");
    expect(screen.queryAllByTestId("zip-download")).toHaveLength(0);
    expect(zip.download).not.toHaveBeenCalled();
  });
});
