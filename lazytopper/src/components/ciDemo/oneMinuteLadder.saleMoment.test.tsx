// SALE-MOMENT-1 / OFFERS-V2 - the buying block under the one-minute ladder's verdict.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const H = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string } | null, tier: "trial", owned: [] as Array<{ packId: string }>, listeners: [] as Array<(uid: string, cloud: unknown) => void>, shown: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: H.user, loading: false }) }));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return {
    ...actual,
    loadSubscription: () => ({ tier: H.tier, plan: "none", trialStartDate: H.tier === "free" ? null : "2026-10-30T00:00:00.000Z", trialEndDate: null, premiumSince: null }),
    onSubscriptionHydrated: (cb: (uid: string, cloud: unknown) => void) => {
      H.listeners.push(cb);
      return () => {
        H.listeners = H.listeners.filter((l) => l !== cb);
      };
    },
  };
});
vi.mock("../../services/packs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/packs")>();
  return { ...actual, fetchMyPacks: () => Promise.resolve({ packs: H.owned, licensee: { name: "", email: "" }, boardPassCredit: null }) };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackOneMinute: vi.fn(), trackSaleMoment: (...a: unknown[]) => H.shown(...a) };
});

import OneMinuteLadder from "./OneMinuteLadder";
import { ONE_MINUTE_STARTERS } from "./oneMinuteStarters";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 5 Nov 2026.
import { packPayLabel } from "../../services/packs";

function ladder() {
  return render(
    <MemoryRouter>
      <OneMinuteLadder hint={null} onLine={() => {}} onAnswered={() => {}} onNext={() => {}} onWatch={() => {}} onUnavailable={() => {}} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
  vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
  window.sessionStorage.clear();
  H.user = { uid: "u1" };
  H.tier = "trial";
  H.owned = [];
  H.listeners = [];
  H.shown.mockClear();
  resetOwnedPacksCache();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("ladder verdict", () => {
  it("shows nothing before the tap; after it, the Board Pass card then this chapter's rows, once each", async () => {
    ladder();
    await screen.findByTestId("one-min-ladder");
    expect(screen.queryByTestId("offers-block")).toBeNull();
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    const pass = await screen.findByTestId("offers-board-pass");
    expect(screen.getByTestId("offers-pay")).toHaveAttribute("href", "/pricing?buy=board_pass");
    await screen.findByTestId("offers-packs");
    const chapterBuy = screen.getByTestId("offers-buy-pack_chapter");
    const slugs = ONE_MINUTE_STARTERS.map((s) => s.topicKey);
    const href = chapterBuy.getAttribute("href") ?? "";
    expect(href.startsWith("/packs?buy=pack_chapter&t=")).toBe(true);
    expect(slugs).toContain(decodeURIComponent(href.replace("/packs?buy=pack_chapter&t=", "")));
    expect(chapterBuy).toHaveTextContent(packPayLabel("pack_chapter"));
    expect(Array.from(document.querySelectorAll("[data-testid^='offers-row-']")).map((n) => n.getAttribute("data-testid"))).toEqual([
      "offers-row-pack_bundle",
      "offers-row-pack_cbq",
      "offers-row-pack_chapter",
    ]);
    expect(screen.getAllByTestId("offers-block")).toHaveLength(1);
    // the primary step stays first
    expect(screen.getByTestId("one-min-next").compareDocumentPosition(pass) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(H.shown).toHaveBeenCalledWith("sale_moment_shown", { surface: "ladder", offer: "pack_chapter", rank: 4 }));
    expect(H.shown).toHaveBeenCalledWith("sale_moment_shown", { surface: "ladder", offer: "board_pass", rank: 1 });
    expect(H.shown.mock.calls.filter((c) => c[0] === "sale_moment_shown")).toHaveLength(4);
  });
  it("a stale cached Basic status that hydrates to Premium never shows the block, even after the tap", async () => {
    H.tier = "free";
    ladder();
    await screen.findByTestId("one-min-ladder");
    await act(async () => {
      H.listeners.forEach((l) => l("u1", { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: "2026-11-01T00:00:00.000Z" }));
    });
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    await act(async () => {});
    expect(screen.queryByTestId("offers-block")).toBeNull();
    expect(H.shown).not.toHaveBeenCalledWith("sale_moment_shown", expect.anything());
  });
  it("a signed-out visitor sees the Board Pass card and the rows too (no ownership read)", async () => {
    H.user = null;
    ladder();
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    expect(await screen.findByTestId("offers-buy-pack_chapter")).toHaveAttribute("href", expect.stringMatching(/^\/packs\?buy=pack_chapter&t=/));
    expect(screen.getByTestId("offers-pay")).toHaveAttribute("href", "/pricing?buy=board_pass");
  });
  it("the packs switch off: nothing at the verdict, as before", async () => {
    vi.stubEnv("VITE_PACKS_ENABLED", "");
    ladder();
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    await screen.findByTestId("one-min-verdict");
    await act(async () => {});
    expect(screen.queryByTestId("offers-block")).toBeNull();
  });
  it("paid Premium sees nothing at the verdict", async () => {
    H.tier = "premium";
    ladder();
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    await screen.findByTestId("one-min-verdict");
    await waitFor(() => expect(screen.queryByTestId("offers-block")).toBeNull());
  });
});
