/**
 * PARENT-PACKS-1 - "Forward link to parents" sits next to every pack Buy for a SIGNED-IN student: in the pack pop-up (every pack,
 * /packs and /pricing) and through `api.parentAsk` (the /pricing CBQ and Bundle cards). Each carries ONE pack (sku + target +
 * its display name); the server mints and prices it. Signed out, packs dark, or already owned (directly or through a Subject Pack
 * / the Bundle): nothing. PaywallActions itself (its dark-ship parity, the share sheet) is pinned by PaywallActions.test.tsx.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));

const state = vi.hoisted(() => ({ enabled: true, owned: [] as Array<{ packId: string; sku: string; target: string }> }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => state.enabled,
    fetchMyPacks: vi.fn(async () => ({
      packs: state.owned.map((p) => ({ ...p, pricePaidInr: 1, paidAt: 1, orderId: "o" })),
      licensee: { name: "Asha", email: "a@b.in" },
    })),
    buyPack: vi.fn(),
    checkPackOrder: vi.fn(),
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({ default: (p: { buy?: unknown }) => (p.buy as never) ?? null }));
// The share actions themselves are PaywallActions' own tests; here: WHERE they appear and WHICH pack they carry.
vi.mock("../pricing/PaywallActions", () => ({
  default: (p: { product?: unknown; noQr?: boolean; surface: string }) => (
    <div data-testid="ask-parent" data-product={JSON.stringify(p.product)} data-noqr={String(Boolean(p.noQr))} data-surface={p.surface} />
  ),
}));

import PacksShop, { type PacksShopApi } from "./PacksShop";

let api: PacksShopApi | null = null;
function shop(url: string, cards?: (a: PacksShopApi) => ReactNode) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PacksShop embedded returnPath="/pricing">
        {(a) => {
          api = a;
          return cards ? cards(a) : null;
        }}
      </PacksShop>
    </MemoryRouter>,
  );
}
const products = () => screen.queryAllByTestId("ask-parent").map((e) => JSON.parse(e.getAttribute("data-product") || "null"));

beforeEach(() => {
  auth.user = { uid: "u1" };
  state.enabled = true;
  state.owned = [];
  api = null;
});
afterEach(cleanup);

describe("PARENT-PACKS-1 · the pack pop-up", () => {
  it("signed in: the CBQ pop-up carries 'ask a parent' for THAT pack (sku + subject + name)", async () => {
    shop("/pricing?pack=cbq&subject=science");
    await waitFor(() => expect(products()).toEqual([{ kind: "pack", sku: "pack_cbq", target: "science", name: "Science CBQ Pack" }]));
    expect(screen.getByTestId("ask-parent").getAttribute("data-noqr")).toBe("false");
  });

  it("a Chapter Pack carries its chapter, and is named by it", async () => {
    shop("/pricing?chapter=polynomials");
    await waitFor(() => expect(products()).toEqual([{ kind: "pack", sku: "pack_chapter", target: "polynomials", name: "Polynomials Chapter Pack" }]));
  });

  it("the Bundle carries no target", async () => {
    shop("/pricing?pack=bundle");
    await waitFor(() => expect(products()).toEqual([{ kind: "pack", sku: "pack_bundle", name: "Maths + Science Bundle" }]));
  });

  it("signed out: no ask (the Buy goes to sign-in / pay-by-phone as before)", async () => {
    auth.user = null;
    shop("/pricing?pack=cbq&subject=maths");
    await screen.findByTestId("packs-buy-pack_cbq");
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });

  it("owned - directly, or a chapter covered by the Bundle: no ask", async () => {
    state.owned = [{ packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths" }];
    shop("/pricing?pack=cbq&subject=maths");
    await waitFor(() => expect(screen.getByTestId("packs-buy-pack_cbq").textContent).toBe("You own this"));
    expect(screen.queryByTestId("ask-parent")).toBeNull();
    cleanup();
    state.owned = [{ packId: "pack_bundle:all", sku: "pack_bundle", target: "all" }];
    shop("/pricing?chapter=polynomials");
    await waitFor(() => expect(screen.getByTestId("packs-buy-pack_chapter").textContent).toBe("You own this"));
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });

  it("packs dark: no ask", async () => {
    state.enabled = false;
    shop("/pricing?pack=cbq&subject=maths");
    await screen.findByTestId("packs-buy-pack_cbq");
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });
});

describe("PARENT-PACKS-1 · api.parentAsk (the /pricing cards)", () => {
  it("signed in: one per pack, noQr passed through; owned and signed-out render nothing", async () => {
    state.owned = [{ packId: "pack_cbq:maths", sku: "pack_cbq", target: "maths" }];
    shop("/pricing", (a) => (
      <>
        {a.parentAsk("pack_cbq", "maths", { noQr: true })}
        {a.parentAsk("pack_cbq", "science", { noQr: true })}
        {a.parentAsk("pack_bundle")}
        {a.parentAsk("pack_chapter")}
      </>
    ));
    await waitFor(() =>
      expect(products()).toEqual([
        { kind: "pack", sku: "pack_cbq", target: "science", name: "Science CBQ Pack" },
        { kind: "pack", sku: "pack_bundle", name: "Maths + Science Bundle" },
      ]),
    );
    expect(screen.getAllByTestId("ask-parent").map((e) => e.getAttribute("data-noqr"))).toEqual(["true", "false"]);
    expect(api).not.toBeNull();
    cleanup();
    auth.user = null;
    shop("/pricing", (a) => <>{a.parentAsk("pack_cbq", "science")}{a.parentAsk("pack_bundle")}</>);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("ask-parent")).toBeNull();
  });
});
