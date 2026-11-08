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
import { hintNow } from "./mineHint";
import * as packs from "../../services/packs";

const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
const chapter = { packId: "pack_chapter:real-numbers", sku: "pack_chapter", target: "real-numbers", pricePaidInr: 49, paidAt: 5, orderId: "order_1" };

function shop(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/packs" element={<PacksShop>{() => <p data-testid="shop-children">shop</p>}</PacksShop>} />
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
  it("/packs, signed-in owner: My packs is the FIRST thing (above the shop) with the panel at its TOP, above the pack cards", async () => {
    shop("/packs#my-packs");
    const panel = await screen.findByTestId("packs-bridge");
    const mine = screen.getByTestId("packs-mine");
    expect(mine.contains(panel)).toBe(true);
    const card = screen.getByTestId("packs-owned");
    expect(panel.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(mine.compareDocumentPosition(screen.getByTestId("shop-children")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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

  it("ONE reveal: My packs (cards) waits for the panel, then both appear in the same commit", async () => {
    let release!: () => void;
    hook.hold = new Promise<void>((r) => (release = r));
    shop("/packs");
    await waitFor(() => expect(hook.calls).toBe(1));
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("packs-owned")).toBeNull();
    release();
    await screen.findByTestId("packs-owned");
    expect(screen.getByTestId("packs-bridge")).toBeTruthy();
  });

  it("the panel is prepared only for an owner (no chunk, no reads for a signed-in student with no pack)", async () => {
    fetchMine.mockResolvedValue({ packs: [], licensee: { name: "", email: "a@b.in" }, boardPassCredit: null });
    shop("/packs");
    await waitFor(() => expect(fetchMine).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(hook.calls).toBe(0);
  });

  it("a panel whose reads never finish: after the cap My packs is revealed WITHOUT it, and it never appears later", async () => {
    hook.never = true;
    shop("/packs");
    expect(await screen.findByTestId("packs-owned", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.queryByTestId("packs-bridge")).toBeNull();
    await new Promise((r) => setTimeout(r, 300));
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

describe("BRIDGE-PANEL-1 round 3 · the reserved My packs slot (device height hint, owner 22:45)", () => {
  const hintFor = (uid: string, px: number) =>
    // The page stamps and checks the hint with the page clock (mineHint.hintNow), so the test does too (also under the clock jobs).
    localStorage.setItem("lt.packs.mineHint.v1", JSON.stringify({ u: uid, t: hintNow(), h: { [String(window.innerWidth)]: px } }));
  beforeEach(() => {
    localStorage.clear();
    delete (window as { __ltMineHint?: unknown }).__ltMineHint;
  });

  it("a returning owner (hint for this account): the slot holds the hinted height from the FIRST render, with a placeholder, until My packs arrives", async () => {
    hintFor("u1", 640);
    let release!: () => void;
    hook.hold = new Promise<void>((r) => (release = r));
    shop("/packs");
    const slot = screen.getByTestId("packs-mine-slot");
    expect(slot.style.minHeight).toBe("640px");
    expect(screen.getByTestId("packs-mine-skeleton")).toBeTruthy();
    release();
    await screen.findByTestId("packs-bridge");
    expect(screen.queryByTestId("packs-mine-skeleton")).toBeNull();
  });

  it("the static page's hand-over (window.__ltMineHint) is used before auth is known; another account -> no reservation", async () => {
    (window as { __ltMineHint?: unknown }).__ltMineHint = { u: "u1", px: 500 };
    shop("/packs");
    expect(screen.getByTestId("packs-mine-slot").style.minHeight).toBe("500px");
    cleanup();
    auth.user = { uid: "someone-else" };
    shop("/packs");
    await waitFor(() => expect(screen.getByTestId("packs-mine-slot").style.minHeight).toBe(""));
  });

  it("the first reveal WITH its panel records this account's height for this width (the next visit reserves it)", async () => {
    const real = HTMLElement.prototype.getBoundingClientRect;
    const spy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("data-testid") === "packs-mine" ? ({ height: 812, width: 360, top: 0, left: 0, right: 360, bottom: 812, x: 0, y: 0, toJSON: () => ({}) } as DOMRect) : real.call(this);
    });
    shop("/packs");
    await screen.findByTestId("packs-bridge");
    await waitFor(() => expect(localStorage.getItem("lt.packs.mineHint.v1")).not.toBeNull());
    const v = JSON.parse(localStorage.getItem("lt.packs.mineHint.v1") || "{}");
    expect(v.u).toBe("u1");
    expect(Object.keys(v.h)).toEqual([String(window.innerWidth)]);
    expect(v.h[String(window.innerWidth)]).toBe(812);
    expect(v).not.toHaveProperty("packs");
    spy.mockRestore();
  });

  it("a hint, but the account owns no pack (server): the reservation is dropped and the hint forgotten", async () => {
    hintFor("u1", 640);
    fetchMine.mockResolvedValue({ packs: [], licensee: { name: "", email: "a@b.in" }, boardPassCredit: null });
    shop("/packs");
    await waitFor(() => expect(screen.getByTestId("packs-mine-slot").style.minHeight).toBe(""));
    expect(localStorage.getItem("lt.packs.mineHint.v1")).toBeNull();
  });

  it("signed out / no hint: an empty slot, no reservation, no placeholder (zero layout cost); never in the /pricing strip", async () => {
    auth.user = null;
    hintFor("u1", 640);
    shop("/packs");
    expect(screen.getByTestId("packs-mine-slot").style.minHeight).toBe("");
    expect(screen.queryByTestId("packs-mine-skeleton")).toBeNull();
    cleanup();
    auth.user = { uid: "u1" };
    shop("/pricing");
    await screen.findByTestId("packs-owned");
    expect(screen.queryByTestId("packs-mine-slot")).toBeNull();
  });
});
