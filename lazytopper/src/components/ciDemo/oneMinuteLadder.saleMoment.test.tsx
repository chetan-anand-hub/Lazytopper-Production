// SALE-MOMENT-1 - the buying line under the one-minute ladder's verdict.
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
import { PACK_PRICE_INR } from "../../services/packs";
import { resetOwnedPacksCache } from "../packs/useOwnedPacks";

function ladder() {
  return render(
    <MemoryRouter>
      <OneMinuteLadder hint={null} onLine={() => {}} onAnswered={() => {}} onNext={() => {}} onWatch={() => {}} onUnavailable={() => {}} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
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
  it("shows nothing before the tap; after it, this chapter's Chapter Pack and the Board Pass, once", async () => {
    ladder();
    await screen.findByTestId("one-min-ladder");
    expect(screen.queryByTestId("sale-moment")).toBeNull();
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    const pack = await screen.findByTestId("sale-moment-pack");
    const slugs = ONE_MINUTE_STARTERS.map((s) => s.topicKey);
    const slug = decodeURIComponent((pack.getAttribute("href") ?? "").replace("/packs?chapter=", ""));
    expect(slugs).toContain(slug);
    expect(pack).toHaveTextContent(`Chapter Pack ₹${PACK_PRICE_INR.pack_chapter}`);
    expect(screen.getByTestId("sale-moment-boardpass")).toHaveAttribute("href", "/pricing");
    expect(screen.getAllByTestId("sale-moment")).toHaveLength(1);
    // the primary step stays first
    expect(screen.getByTestId("one-min-next").compareDocumentPosition(pack) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(H.shown).toHaveBeenCalledWith("sale_moment_shown", { surface: "ladder", offer: "pack_chapter" }));
    expect(H.shown.mock.calls.filter((c) => c[0] === "sale_moment_shown")).toHaveLength(1);
  });
  it("a stale cached Basic status that hydrates to Premium never shows the row, even after the tap", async () => {
    H.tier = "free";
    ladder();
    await screen.findByTestId("one-min-ladder");
    await act(async () => {
      H.listeners.forEach((l) => l("u1", { tier: "premium", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: "2026-11-01T00:00:00.000Z" }));
    });
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    await act(async () => {});
    expect(screen.queryByTestId("sale-moment")).toBeNull();
    expect(H.shown).not.toHaveBeenCalledWith("sale_moment_shown", expect.anything());
  });
  it("a signed-out visitor sees the pack and the Board Pass too", async () => {
    H.user = null;
    ladder();
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    expect(await screen.findByTestId("sale-moment-pack")).toHaveAttribute("href", expect.stringMatching(/^\/packs\?chapter=/));
    expect(screen.getByTestId("sale-moment-boardpass")).toBeInTheDocument();
  });
  it("paid Premium sees nothing at the verdict", async () => {
    H.tier = "premium";
    ladder();
    await screen.findByTestId("one-min-ladder");
    fireEvent.click(screen.getByTestId("one-min-opt-0"));
    await screen.findByTestId("one-min-verdict");
    await waitFor(() => expect(screen.queryByTestId("sale-moment")).toBeNull());
  });
});
