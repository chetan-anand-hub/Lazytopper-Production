/** BRIDGE-CODES-1 - My packs: a CBQ chapter row with its part buttons and set progress. Harness as PacksShop.packReady.test.tsx. */
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

function shop() {
  return render(
    <MemoryRouter initialEntries={["/packs#my-packs"]}>
      <Routes>
        <Route path="/packs" element={<PacksShop>{() => null}</PacksShop>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** A real Number chapter in 3 parts (questions + key each), as buildPackFiles lists it. */
let release: (() => void) | null = null;
let progressCb: ((k: number, n: number) => void) | undefined;
const part = (k: number, mode: "questions" | "answers", a: number, b: number) => ({
  id: `pack_cbq:maths|real-numbers|cbq-part-${k}-${mode}`,
  group: "Real Numbers",
  label: `Part ${k} of 3 \u00b7 Sets ${a}\u2013${b} \u00b7 ${mode === "questions" ? "Questions" : "Answer key"}`,
  codes: Array.from({ length: b - a + 1 }, (_, i) => `PK-M-RN-CBQ${a + i}`),
  build: vi.fn(async (onProgress?: (k: number, n: number) => void) => {
    progressCb = onProgress;
    await new Promise<void>((r) => (release = r));
  }),
});

beforeEach(() => {
  auth.user = { uid: "u1" };
  paid.premium = false;
  resetGuestClaimSessionForTests();
  builder.buildPackFiles.mockReset();
  builder.buildPackFiles.mockResolvedValue([
    { id: "pack_cbq:maths|intro", group: "Start here", label: "How examiners mark a CBQ", build: async () => undefined },
    part(1, "questions", 1, 3), part(1, "answers", 1, 3),
    part(2, "questions", 4, 6), part(2, "answers", 4, 6),
    part(3, "questions", 7, 9), part(3, "answers", 7, 9),
  ]);
  fetchMine.mockReset();
  fetchMine.mockResolvedValue({ packs: [cbq], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null });
});
afterEach(async () => {
  cleanup();
  (await import("./PackReadyToast")).closePackReadyToastForTests();
});

describe("BRIDGE-CODES-1 - a CBQ chapter is ONE row with its parts inside (owner 8 Nov 23:30)", () => {
  it("one row per chapter: Questions / Answer keys, a button per part; a tap shows set progress, then Saved", async () => {
    shop();
    fireEvent.click(await screen.findByText("Download files"));
    const rows = await screen.findAllByTestId("cbq-chapter-row");
    expect(rows).toHaveLength(1);
    // PACKS-TIDY-1: the chapter name is the summary of the chapter's own collapsed group around the row.
    expect(rows[0].closest("details")?.textContent).toContain("Real Numbers");
    const buttons = screen.getAllByTestId("cbq-part-download");
    expect(buttons.map((b) => b.textContent)).toEqual([
      "Part 1 \u00b7 Sets 1\u20133", "Part 2 \u00b7 Sets 4\u20136", "Part 3 \u00b7 Sets 7\u20139",
      "Part 1 \u00b7 Sets 1\u20133", "Part 2 \u00b7 Sets 4\u20136", "Part 3 \u00b7 Sets 7\u20139",
    ]);
    // the intro keeps its ordinary row
    expect(screen.getByText("How examiners mark a CBQ")).toBeTruthy();
    // every part button carries the fixed-width class from the start (no shift when its text changes)
    for (const b of buttons) expect(b.className).toContain("lt-packs__btn--sets");

    fireEvent.click(buttons[0]);
    expect(buttons[0].textContent).toBe("Preparing\u2026");
    await waitFor(() => expect(typeof progressCb).toBe("function"));
    act(() => progressCb!(2, 3));
    expect(buttons[0].textContent).toBe("Preparing\u2026 set 2 of 3");
    // one download at a time
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(true);
    await act(async () => release!());
    await waitFor(() => expect(buttons[0].textContent).toBe("Saved \u2713"));
    expect((buttons[1] as HTMLButtonElement).disabled).toBe(false);
    expect(buttons[1].textContent).toBe("Part 2 \u00b7 Sets 4\u20136");
  });
});
