/**
 * BRIDGE-PANEL-1 - where the panel mounts: inside My packs on /packs for a signed-in pack OWNER only; never in the /pricing strip
 * (embedded), never for an account with no pack; "Download" on a paper opens that pack's own file list (the existing mechanism);
 * a panel that fails renders nothing and My packs keeps working.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return { ...actual, isPacksClientEnabled: () => true, fetchMyPacks: vi.fn(), buyPack: vi.fn(), checkPackOrder: vi.fn() };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({ default: () => null }));
const builder = vi.hoisted(() => ({ buildPackFiles: vi.fn() }));
vi.mock("../../lib/packs/buildPackFiles", () => ({
  buildPackFiles: (...a: unknown[]) => builder.buildPackFiles(...a),
  groupPackFiles: (files: Array<{ group: string }>) => [{ group: "Real Numbers", files }],
}));
const paid = vi.hoisted(() => ({ premium: false }));
vi.mock("../../lib/packs/usePaidPremium", () => ({ usePaidPremium: () => paid.premium }));
const hook = vi.hoisted(() => ({ boom: false, renderBoom: false, hold: null as null | Promise<void>, never: false, calls: 0 }));
vi.mock("./useMyPacksBridge", () => ({
  prepareBridgeData: async (_u: unknown, cachedPaid: boolean) => {
    hook.calls += 1;
    if (hook.never) return new Promise(() => undefined);
    if (hook.hold) await hook.hold;
    if (hook.boom) throw new Error("read failed");
    const base = { allowance: null, paidPass: cachedPaid, entitlementKnown: true };
    if (hook.renderBoom)
      return {
        ...base,
        get records(): never {
          throw new Error("render failed");
        },
      };
    return { ...base, records: [] };
  },
}));

import PacksShop from "./PacksShop";
import * as packs from "../../services/packs";

const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
const chapter = { packId: "pack_chapter:real-numbers", sku: "pack_chapter", target: "real-numbers", pricePaidInr: 49, paidAt: 5, orderId: "order_1" };

function shop(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/packs" element={<PacksShop>{() => null}</PacksShop>} />
        <Route path="/pricing" element={<PacksShop embedded returnPath="/pricing">{() => null}</PacksShop>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  auth.user = { uid: "u1" };
  paid.premium = false;
  hook.boom = false;
  hook.renderBoom = false;
  hook.hold = null;
  hook.never = false;
  hook.calls = 0;
  builder.buildPackFiles.mockReset();
  builder.buildPackFiles.mockResolvedValue([{ id: "f1", group: "Real Numbers", label: "Chapter Test 1 · Questions", build: async () => undefined }]);
  fetchMine.mockReset();
  fetchMine.mockResolvedValue({ packs: [chapter], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null });
});
afterEach(cleanup);

describe("BRIDGE-PANEL-1 · mount", () => {
  it("/packs, signed-in owner: the panel sits in My packs after the pack card, with the Board Pass card", async () => {
    shop("/packs#my-packs");
    const panel = await screen.findByTestId("packs-bridge");
    const mine = screen.getByTestId("packs-mine");
    expect(mine.contains(panel)).toBe(true);
    const card = screen.getByTestId("packs-owned");
    expect(card.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("packs-bridge-pass")).toBeTruthy();
  });

  it("a paid Board Pass holder: the panel without the Board Pass card", async () => {
    paid.premium = true;
    shop("/packs");
    await screen.findByTestId("packs-bridge");
    expect(screen.queryByTestId("packs-bridge-pass")).toBeNull();
  });

  it("'Download' on a paper not yet downloaded opens that pack's file list", async () => {
    shop("/packs");
    const rows = await screen.findAllByTestId("packs-bridge-download");
    fireEvent.click(rows[0]);
    await waitFor(() => expect(builder.buildPackFiles).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Chapter Test 1 · Questions")).toBeTruthy();
  });

  it("never in the /pricing strip (embedded), never without a pack, never signed out", async () => {
    shop("/pricing");
    await screen.findByTestId("packs-owned");
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
    cleanup();
    fetchMine.mockResolvedValue({ packs: [], licensee: { name: "", email: "a@b.in" }, boardPassCredit: null });
    shop("/packs");
    await waitFor(() => expect(fetchMine).toHaveBeenCalled());
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
    cleanup();
    auth.user = null;
    shop("/packs#my-packs");
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
  });

  it("ONE commit: My packs is not revealed until the panel is ready, then the cards and the panel appear together", async () => {
    let release!: () => void;
    hook.hold = new Promise<void>((r) => (release = r));
    shop("/packs");
    await waitFor(() => expect(hook.calls).toBe(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("packs-owned")).toBeNull();
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
    release();
    const card = await screen.findByTestId("packs-owned");
    expect(screen.getByTestId("packs-bridge")).toBeTruthy();
    expect(card).toBeTruthy();
  });

  it("the panel is prepared only for an owner (no chunk, no reads for a signed-in student with no pack)", async () => {
    fetchMine.mockResolvedValue({ packs: [], licensee: { name: "", email: "a@b.in" }, boardPassCredit: null });
    shop("/packs");
    await waitFor(() => expect(fetchMine).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(hook.calls).toBe(0);
  });

  it("a panel whose reads never finish: after the cap My packs is revealed WITHOUT it (and it never pops in)", async () => {
    hook.never = true;
    shop("/packs");
    expect(await screen.findByTestId("packs-owned", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
  });

  it("failed reads or a render error -> no panel; My packs and its files still work", async () => {
    hook.boom = true;
    shop("/packs");
    await screen.findByTestId("packs-owned");
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
    cleanup();
    hook.boom = false;
    hook.renderBoom = true;
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    shop("/packs");
    await screen.findByTestId("packs-owned");
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show files" }));
    expect(await screen.findByText("Chapter Test 1 · Questions")).toBeTruthy();
    err.mockRestore();
  });
});
