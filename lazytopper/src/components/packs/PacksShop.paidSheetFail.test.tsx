/** PAID-SHEET-1: if the pop-up chunk cannot load (a stale tab after a deploy), the buyer still gets today's inline status + who-card. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../checkoutWho/PaidSheet", () => { throw new Error("chunk failed to load"); });
vi.mock("../signinLink/SigninLinkCard", () => ({ default: () => <div data-testid="signin-link-card-stub" /> }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "u1" }, loading: false }) }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return { ...actual, isPacksClientEnabled: () => true, fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" } })), buyPack: vi.fn(), checkPackOrder: vi.fn() };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
vi.mock("../../pages/PackDialog", () => ({ default: (p: { buy?: unknown }) => (p.buy as never) ?? null }));

import PacksShop from "./PacksShop";
import * as packs from "../../services/packs";

beforeEach(() => {
  (packs.buyPack as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ status: "paid", grant: { sku: "pack_chapter" }, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PacksShop · PAID-SHEET-1 chunk failure", () => {
  it("falls back to the inline paid status and the who-card", async () => {
    render(
      <MemoryRouter initialEntries={["/pricing?buy=pack_chapter&t=real-numbers"]}>
        <PacksShop embedded returnPath="/pricing">{() => null}</PacksShop>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
    expect((await screen.findByTestId("packs-status")).textContent).toMatch(/Payment received/);
    expect(screen.queryByTestId("paid-sheet")).toBeNull();
  });
});
