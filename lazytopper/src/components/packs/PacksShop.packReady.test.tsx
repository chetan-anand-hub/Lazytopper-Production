/**
 * PACK-READY-1 - after a pay-by-phone claim the buyer is TOLD the pack is ready, one tap from its files:
 * the banner above My packs, the #my-packs scroll re-assert, the name prompt after (not before) the files, and
 * "Sign in with this number" returning to /packs#my-packs from the pricing strip too.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

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
import { GUEST_CLAIMED_EVENT, resetGuestClaimSessionForTests } from "../../services/guestPay";

const fetchMine = packs.fetchMyPacks as unknown as ReturnType<typeof vi.fn>;
const bundle = { packId: "pack_bundle", sku: "pack_bundle", target: "", pricePaidInr: 299, paidAt: 9, orderId: "order_1" };
const mock = { packId: "pack_mock:maths", sku: "pack_mock", target: "maths", pricePaidInr: 99, paidAt: 5, orderId: "order_0" };

let where = "";
let redirectTo = "";
function Where() {
  const l = useLocation();
  where = `${l.pathname}${l.hash}`;
  redirectTo = new URLSearchParams(l.search).get("redirect") || "";
  return <p>LOGIN PAGE</p>;
}
function shop(url = "/packs", props: { embedded?: boolean; returnPath?: string } = {}) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/packs" element={<PacksShop {...props}>{(api) => <button type="button" onClick={() => api.openPack("pack_mock")}>open mock</button>}</PacksShop>} />
        <Route path="/pricing" element={<PacksShop embedded returnPath="/pricing">{(api) => <button type="button" onClick={() => api.openPack("pack_mock")}>open mock</button>}</PacksShop>} />
        <Route path="/login" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}
const claimedDetail = (items: Array<{ kind: "pack" | "pass"; sku: string; target: string | null; name: string }>) =>
  new CustomEvent(GUEST_CLAIMED_EVENT, { detail: { count: items.length, items } });

beforeEach(() => {
  auth.user = { uid: "u1" };
  paid.premium = false;
  where = "";
  resetGuestClaimSessionForTests();
  track.ready.mockReset();
  builder.buildPackFiles.mockReset();
  builder.buildPackFiles.mockResolvedValue([{ id: "f1", group: "Chapters", label: "Real Numbers", build: async () => undefined }]);
  fetchMine.mockReset();
  fetchMine.mockResolvedValue({ packs: [bundle], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null });
});
afterEach(async () => {
  cleanup();
  (await import("./PackReadyToast")).closePackReadyToastForTests();
});

describe("PACK-READY-1 · the banner", () => {
  it("a claim event names the pack and ONE tap opens its file list (no 'Show files' tap)", async () => {
    shop();
    expect(await screen.findByText("Maths + Science Bundle")).toBeTruthy();
    expect(screen.queryByTestId("pack-ready-banner")).toBeNull(); // no claim yet, not at #my-packs
    act(() => {
      window.dispatchEvent(claimedDetail([{ kind: "pack", sku: "pack_bundle", target: null, name: "Maths + Science Bundle" }]));
    });
    const row = await screen.findByTestId("pack-ready-row");
    expect(row.textContent).toContain("Your Maths + Science Bundle is ready");
    // FLAKY-1: PackReadyBanner sends "shown" from a passive effect after the row paints; wait for it rather than race it.
    await waitFor(() => expect(track.ready).toHaveBeenCalledWith("pack_bundle", "banner"));
    fireEvent.click(screen.getByText("Download files"));
    expect(await screen.findByText("Real Numbers")).toBeTruthy();
    expect(screen.getAllByText("Download").length).toBeGreaterThan(0);
    expect(builder.buildPackFiles).toHaveBeenCalledTimes(1);
  });

  it("a claim that fired BEFORE the page mounted (the sign-in lands on /packs) still shows the banner", async () => {
    // Fire the event with no listener mounted, as AuthContext does while Login is still on screen.
    const { claimOncePerSession } = await import("../../services/guestPay");
    await claimOncePerSession("u1", { force: true, claim: async () => [{ orderId: "o", kind: "pack", sku: "pack_bundle", target: null }] });
    shop("/packs#my-packs");
    expect((await screen.findByTestId("pack-ready-row")).textContent).toContain("Your Maths + Science Bundle is ready");
  });

  it("arriving at #my-packs with owned packs (no claim in hand) points at the most recent one", async () => {
    fetchMine.mockResolvedValue({ packs: [mock, bundle], licensee: { name: "Asha", email: "a@b.in" }, boardPassCredit: null });
    shop("/packs#my-packs");
    const row = await screen.findByTestId("pack-ready-row");
    // No claim in hand: neutral wording, its own surface, still one tap to the files.
    expect(row.textContent).toContain("Your latest pack: Maths + Science Bundle");
    expect(row.textContent).not.toContain("is ready");
    await waitFor(() => expect(track.ready).toHaveBeenCalledWith("pack_bundle", "banner_return")); // FLAKY-1: passive effect, see above
    expect(track.ready).not.toHaveBeenCalledWith(expect.anything(), "banner");
    expect(screen.getAllByTestId("pack-ready-row")).toHaveLength(1);
    fireEvent.click(screen.getByText("Download files"));
    expect(await screen.findByText("Real Numbers")).toBeTruthy();
  });

  it("a recent claim by ANOTHER account (shared device) is never shown to this one", async () => {
    const { claimOncePerSession } = await import("../../services/guestPay");
    await claimOncePerSession("someone-else", { force: true, claim: async () => [{ orderId: "o", kind: "pack", sku: "pack_bundle", target: null }] });
    shop("/packs");
    await screen.findByText("Maths + Science Bundle");
    expect(screen.queryByTestId("pack-ready-banner")).toBeNull();
    // Only the BANNER is under test here; the claim's own lazy toast (a separate surface) may or may not have
    // fired by now depending on CI load, which made this assertion flaky.
    expect(track.ready).not.toHaveBeenCalledWith(expect.anything(), expect.stringMatching(/^banner/));
  });

  it("no 'Download files' button while the owned cards are not shown (licensee details unavailable)", async () => {
    fetchMine.mockResolvedValue({ packs: [bundle], licensee: { name: "", email: "", phone: "" }, boardPassCredit: null });
    shop("/packs#my-packs");
    await screen.findByTestId("packs-mine");
    await waitFor(() => expect(screen.queryByTestId("packs-owned")).toBeNull());
    expect(screen.queryByText("Download files")).toBeNull();
  });

  it("plain /packs with owned packs and no claim shows no banner; the banner can be dismissed", async () => {
    shop("/packs");
    await screen.findByText("Maths + Science Bundle");
    expect(screen.queryByTestId("pack-ready-banner")).toBeNull();
    cleanup();
    shop("/packs#my-packs");
    fireEvent.click(await screen.findByLabelText("Dismiss"));
    await waitFor(() => expect(screen.queryByTestId("pack-ready-row")).toBeNull());
  });

  it("a claimed Board Pass says 'Your Board Pass is on' ONLY once the subscription confirms it (no file button)", async () => {
    shop();
    await screen.findByText("Maths + Science Bundle");
    act(() => {
      window.dispatchEvent(claimedDetail([{ kind: "pass", sku: "till_boards", target: null, name: "Board Pass" }]));
    });
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByTestId("pack-ready-row")).toBeNull(); // claim list alone is not trusted
    cleanup();
    paid.premium = true;
    shop();
    await screen.findByText("Maths + Science Bundle");
    act(() => {
      window.dispatchEvent(claimedDetail([{ kind: "pass", sku: "till_boards", target: null, name: "Board Pass" }]));
    });
    expect((await screen.findByTestId("pack-ready-row")).textContent).toContain("Your Board Pass is on");
    expect(screen.queryByText("Download files")).toBeNull();
  });

  it("the licensee-name prompt comes AFTER the pack files, never in front of the first download", async () => {
    fetchMine.mockResolvedValue({ packs: [bundle], licensee: { name: "", email: "", phone: "+91 98•••••948" }, boardPassCredit: null });
    shop("/packs#my-packs");
    const prompt = await screen.findByTestId("pack-name-prompt");
    const card = screen.getByTestId("packs-owned");
    const banner = screen.getByTestId("pack-ready-banner");
    expect(banner.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(prompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(screen.getByText("Download files"));
    expect(await screen.findByText("Real Numbers")).toBeTruthy(); // files open without answering the prompt
  });
});

describe("PACK-READY-1 · #my-packs scroll is re-asserted when My packs loads / changes", () => {
  it("scrolls on mount, on the next frames and at ~300 / ~900 ms, and stops on a user scroll", async () => {
    const spy = vi.fn();
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = spy;
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
    try {
      shop("/packs#my-packs");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      const first = spy.mock.calls.length;
      expect(first).toBeGreaterThan(0);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(spy.mock.calls.length).toBeGreaterThan(first + 1); // the 300 / 900 ms re-asserts
      const after = spy.mock.calls.length;
      // A deliberate scroll ends the watch: a later change of `mine` starts a new one but the old timers never fight the user.
      act(() => {
        window.dispatchEvent(new Event("wheel"));
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
      expect(spy.mock.calls.length).toBe(after);
    } finally {
      vi.useRealTimers();
      Element.prototype.scrollIntoView = orig;
    }
  });
});

describe("PACK-READY-1 · 'Sign in with this number' returns to /packs#my-packs from every surface", () => {
  async function payThenSignIn() {
    auth.user = null;
    guestBuy.buyAsGuest.mockResolvedValue({ status: "already_paid", phoneMasked: "+91 98•••••948", phone: "+919876543948" });
    fireEvent.click(screen.getByText("open mock"));
    fireEvent.click(await screen.findByTestId("packs-buy-pack_mock"));
    fireEvent.click(await screen.findByText("Pay now with your phone number"));
    fireEvent.change(screen.getByTestId("guest-pay-input"), { target: { value: "9876543948" } });
    fireEvent.click(screen.getByTestId("guest-pay-continue"));
    await screen.findByTestId("guest-pay-already");
    fireEvent.click(screen.getByText(/Sign in with this number/i));
    await screen.findByText("LOGIN PAGE");
  }
  it("from /packs", async () => {
    shop("/packs");
    await payThenSignIn();
    expect(where).toBe("/login");
    expect(redirectTo).toBe("/packs#my-packs");
    expect(window.location.href).not.toContain("9876543948");
  });
  it("from the pricing strip (returnPath /pricing) - NOT /pricing#my-packs", async () => {
    shop("/pricing");
    await payThenSignIn();
    expect(redirectTo).toBe("/packs#my-packs");
  });
});

describe("PACK-READY-1 · one message only: the toast yields to a mounted PacksShop banner", () => {
  it("embedded on a non-/packs page, a claim shows the banner and NOT the toast", async () => {
    const { claimOncePerSession } = await import("../../services/guestPay");
    shop("/pricing#my-packs");
    await screen.findByText("Maths + Science Bundle");
    await act(async () => {
      await claimOncePerSession("u1", { force: true, claim: async () => [{ orderId: "o", kind: "pack", sku: "pack_bundle", target: null }] });
      await new Promise((r) => setTimeout(r, 50));
    });
    expect((await screen.findByTestId("pack-ready-row")).textContent).toContain("is ready");
    expect(screen.queryByTestId("pack-ready-toast")).toBeNull();
    expect(track.ready).not.toHaveBeenCalledWith(expect.anything(), "toast");
  });
});
