/** LINK-SIGNIN-1 host test: PacksShop shows the "Who will use this?" card ONLY once a pack payment is confirmed paid, for a signed-in buyer, below "Open My packs". */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SigninLinkCardLazy from "../signinLink/SigninLinkCardLazy";
import { MemoryRouter } from "react-router-dom";

vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: vi.fn() }));
vi.mock("../../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../signinLink/SigninLinkCard", () => ({
  default: (p: { move?: { orderId: string; item: string }; onMoved?: () => void }) => (
    <div data-testid="signin-link-card-stub" data-move-order={p.move?.orderId ?? ""} data-move-item={p.move?.item ?? ""}>
      <button type="button" data-testid="stub-moved" onClick={() => p.onMoved?.()}>
        moved
      </button>
    </div>
  ),
}));

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" } })),
    buyPack: vi.fn(),
    checkPackOrder: vi.fn(),
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));
// The dialog hosts the buy area; a Close button lets a test close it mid-settling, which is when the status block shows.
vi.mock("../../pages/PackDialog", () => ({
  default: (p: { buy?: unknown; onClose: () => void }) => (
    <div>
      {(p.buy as never) ?? null}
      <button type="button" data-testid="dialog-close" onClick={p.onClose}>
        close
      </button>
    </div>
  ),
}));

import PacksShop from "./PacksShop";
import * as packs from "../../services/packs";

const buyMock = packs.buyPack as unknown as ReturnType<typeof vi.fn>;
const checkMock = packs.checkPackOrder as unknown as ReturnType<typeof vi.fn>;
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 80)); }); // inside act, so a lazy chunk that resolves is flushed (a bare timeout would let a wrongly-shown card go unseen)
const grant = { sku: "pack_chapter" };

function shop(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <PacksShop embedded returnPath="/pricing">
        {() => null}
      </PacksShop>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  auth.user = { uid: "u1" };
  buyMock.mockReset();
  checkMock.mockReset();
  try {
    window.sessionStorage.clear();
  } catch {
    /* ignore */
  }
});
// Warm the lazy card ONCE (React caches a resolved lazy at module level), so every NEGATIVE assertion below renders the card
// synchronously if the host wrongly shows it. Without this a bare "absent" check can pass while the chunk is still loading.
beforeAll(async () => {
  render(<SigninLinkCardLazy signedIn />);
  await screen.findByTestId("signin-link-card-stub");
  cleanup();
});
afterEach(() => cleanup());

describe("PacksShop · sign-in card", () => {
  it("absent while the payment is only being checked (not yet confirmed paid)", async () => {
    buyMock.mockResolvedValue({ status: "pending", orderId: "order_1", paymentId: "pay_p" });
    checkMock.mockReturnValue(new Promise(() => undefined)); // never settles: stays in "checking"
    shop("/pricing?buy=pack_chapter&t=real-numbers");
    await waitFor(() => expect(checkMock).toHaveBeenCalled());
    fireEvent.click(await screen.findByTestId("dialog-close"));
    // the "checking" status line is on screen (the block that hosts the card) ...
    expect(await screen.findByTestId("packs-status")).toBeTruthy();
    await settle();
    // ... and the card is NOT in it: the payment is not confirmed yet.
    expect(screen.queryByTestId("signin-link-card-stub")).toBeNull();
  });

  it("present after a confirmed paid outcome for a signed-in buyer (lazy chunk awaited)", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, paymentId: "pay_49", amountInr: 49 });
    shop("/pricing?buy=pack_chapter&t=real-numbers");
    expect(await screen.findByTestId("signin-link-card-stub")).toBeTruthy();
  });

  it("SIGNED-IN-MOVE-1: a paid outcome WITH an order id hands the card that order and the pack's plain name; pending-then-paid does too", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    shop("/pricing?buy=pack_chapter&t=real-numbers");
    const card = await screen.findByTestId("signin-link-card-stub");
    expect(card.getAttribute("data-move-order")).toBe("order_P1");
    expect(card.getAttribute("data-move-item")).toMatch(/Chapter Pack$/);
  });

  it("F6: after the card reports a move, My packs is re-read and the status no longer says it is this account's", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, orderId: "order_P1", paymentId: "pay_49", amountInr: 49 });
    shop("/pricing?buy=pack_chapter&t=real-numbers");
    const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
    fireEvent.click(await screen.findByTestId("stub-moved"));
    const before = fetchMine.mock.calls.length;
    await waitFor(() => expect(screen.getByTestId("packs-status").textContent).toBe("Moved to your child's account."));
    await waitFor(() => expect(fetchMine.mock.calls.length).toBeGreaterThanOrEqual(before));
    expect(screen.queryByTestId("packs-status-cbq-tutor")).toBeNull();
  });

  it("SIGNED-IN-MOVE-1: a paid outcome with NO order id offers nothing to move", async () => {
    buyMock.mockResolvedValue({ status: "paid", grant, paymentId: "pay_49", amountInr: 49 });
    shop("/pricing?buy=pack_chapter&t=real-numbers");
    const card = await screen.findByTestId("signin-link-card-stub");
    expect(card.getAttribute("data-move-order")).toBe("");
  });

  it("absent for a signed-out visitor, and after a dismissed checkout", async () => {
    auth.user = null;
    shop("/pricing?buy=pack_chapter");
    await settle();
    expect(screen.queryByTestId("signin-link-card-stub")).toBeNull();
    cleanup();
    auth.user = { uid: "u1" };
    buyMock.mockResolvedValue({ status: "dismissed" });
    shop("/pricing?buy=pack_chapter&t=real-numbers");
    await waitFor(() => expect(buyMock).toHaveBeenCalled());
    await settle();
    expect(screen.queryByTestId("signin-link-card-stub")).toBeNull();
  });
});
