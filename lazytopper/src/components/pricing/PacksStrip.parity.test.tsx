/**
 * PRICING-ONE-1 - /pricing is ONE page for everyone: the CBQ band and every pack tile show for a signed-out visitor, a Basic student,
 * a trial student and a paid-Premium student (owner rulings 29 Oct 2026), and a pack can be bought without leaving /pricing: the
 * signed-out Buy sends the visitor to sign-in with a return path ON /pricing, and ?buy=&t= resumes into checkout there.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string } }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
// The REAL usePaidPremium runs; only the cached subscription it reads is mocked (tier per state).
const sub = vi.hoisted(() => ({ tier: "free" as "free" | "trial" | "premium" }));
vi.mock("../../services/subscriptionService", async (orig) => ({
  ...(await orig<typeof import("../../services/subscriptionService")>()),
  loadSubscription: () => ({ tier: sub.tier }),
}));
vi.mock("../../analytics/analytics", () => ({
  newCheckoutAttemptId: () => "lt_attempt",
  // PAY-RESCUE-1: a dismissed checkout now mounts the rescue card, which records these.
  trackNamedEvent: () => undefined,
  trackPaywallAction: () => undefined,
}));
const trackEvent = vi.hoisted(() => vi.fn());
vi.mock("../../lib/packs/packAnalytics", () => ({ trackPackCheckout: () => undefined, trackPackPurchase: () => undefined, trackPackEvent: trackEvent }));
const buyPack = vi.hoisted(() => vi.fn(async (..._a: unknown[]) => ({ status: "dismissed" })));
vi.mock("../../services/packs", async (orig) => {
  const actual = await orig<typeof import("../../services/packs")>();
  return {
    ...actual,
    isPacksClientEnabled: () => true,
    fetchMyPacks: vi.fn(async () => ({ packs: [], licensee: { name: "Asha", email: "a@b.in" } })),
    buyPack,
  };
});
vi.mock("../../lib/packs/packContent", () => ({ loadChapter: async () => undefined, countChapterQuestions: () => 100, countCbqPackQuestions: () => 50 }));

import PacksStrip from "./PacksStrip";
// GST-EXCL-1: expected prices are read through the shared helpers, so the copy is right on both sides of 7 Nov 2026.
import { packPayLabel } from "../../services/packs";

Element.prototype.scrollIntoView = vi.fn();

function Where() {
  const l = useLocation();
  return <div data-testid="where">{l.pathname + l.search + l.hash}</div>;
}
const strip = (url = "/pricing") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Where />
      <Routes>
        <Route path="/pricing" element={<PacksStrip />} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  auth.user = null;
  sub.tier = "free";
  buyPack.mockClear();
  trackEvent.mockClear();
});
afterEach(() => cleanup());

const STATES: ReadonlyArray<[string, { uid: string } | null, "free" | "trial" | "premium"]> = [
  ["signed out", null, "free"],
  ["Basic / free", { uid: "u1" }, "free"],
  ["active trial", { uid: "u2" }, "trial"],
  ["paid Premium", { uid: "u3" }, "premium"],
];

describe("/pricing packs - the same for every account", () => {
  it.each(STATES)("%s: CBQ band (Maths + Science) and all four pack tiles with their prices", (_n, user, tier) => {
    auth.user = user;
    sub.tier = tier;
    const { container } = strip();
    expect(screen.getByTestId("cbq-band")).toBeTruthy();
    // PACKS-TILE-BUY-1: each CBQ card BUYS directly (same for every account, Premium included); "See inside" opens the pop-up.
    expect(screen.getByTestId("tile-buy-pack_cbq-maths").textContent).toBe(`Buy Maths CBQ · ${packPayLabel("pack_cbq")}`);
    expect(screen.getByTestId("tile-buy-pack_cbq-science").textContent).toBe(`Buy Science CBQ · ${packPayLabel("pack_cbq")}`);
    expect(screen.getByTestId("pricing-cbq-maths").textContent).toBe("See inside →");
    const tiles = Array.from(container.querySelectorAll("button.lt-packoffer__item"));
    expect(tiles.map((t) => t.getAttribute("data-pack"))).toEqual(["chapter", "mock", "subject", "bundle"]);
    expect(Array.from(container.querySelectorAll(".lt-packoffer__cell")).map((c) => c.getAttribute("data-price"))).toEqual(["49", "99", "199", "299"]);
    expect(container.querySelector("#packs")).not.toBeNull();
    expect(container.querySelector("#cbq")).not.toBeNull();
  });

  it.each(STATES)("%s: PACK-TERMS-1 - the Board Pass credit line shows for nobody", (_n, user, tier) => {
    auth.user = user;
    sub.tier = tier;
    strip();
    expect(screen.queryByTestId("pricing-pack-credit")).toBeNull();
    expect(document.body.textContent).not.toMatch(/pack price comes off/i);
  });

  it("PREBOARDS-BADGE-1: the Bundle tile carries the Pre-boards pick badge and line in season, none after 20 Dec 2026, and no other tile has it", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-11-02T10:00:00+05:30"));
      strip();
      const bundle = document.querySelector('[data-pack="bundle"]')?.textContent ?? "";
      expect(bundle).toContain("Pre-boards pick");
      expect(bundle).toContain("All 26 chapters + 16 board mocks \u2014 ready before your pre-boards");
      expect(bundle).toContain("Maths + Science Bundle");
      expect(document.body.textContent?.match(/Pre-boards pick/g)?.length).toBe(1);
      cleanup();
      vi.setSystemTime(new Date("2026-12-21T00:00:00+05:30"));
      strip();
      expect(document.body.textContent).not.toContain("Pre-boards pick");
      expect(document.querySelector('[data-pack="bundle"]')?.textContent).toContain("Maths + Science: all 26 chapters + 16 mocks \u2014 the whole year at one price");
      expect(document.body.textContent).not.toMatch(/\b27 chapters/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("a signed-out Buy returns to /pricing (not /packs) after sign-in, carrying ?buy=", async () => {
    strip();
    fireEvent.click(screen.getByRole("button", { name: /Maths \+ Science Bundle/ }));
    const buy = await screen.findByTestId("packs-buy-pack_bundle");
    fireEvent.click(buy);
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeTruthy());
    const where = screen.getByTestId("where").textContent ?? "";
    expect(where).toContain("/login");
    expect(decodeURIComponent(where)).toContain("/pricing?buy=pack_bundle");
    expect(decodeURIComponent(where)).not.toContain("/packs");
    expect(buyPack).not.toHaveBeenCalled();
  });

  it("/pricing?buy=pack_bundle resumes into checkout for a signed-in student, once, and strips the params", async () => {
    auth.user = { uid: "u1" };
    strip("/pricing?buy=pack_bundle");
    await waitFor(() => expect(buyPack).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/pricing"));
    expect(buyPack.mock.calls[0][0]).toBe("pack_bundle");
  });

  it("PRICING-ONE-1: pack_view fires once on the pricing section with surface: pricing, and never twice on a re-render", () => {
    const { rerender } = strip();
    expect(trackEvent.mock.calls.filter((c) => c[0] === "pack_view")).toEqual([["pack_view", undefined, "pricing"]]);
    rerender(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Where />
        <Routes>
          <Route path="/pricing" element={<PacksStrip />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(trackEvent.mock.calls.filter((c) => c[0] === "pack_view")).toHaveLength(1);
  });

  it.each(["#packs", "#cbq", ""])("from=for_parents%s: a back link to /for-parents sits at the top of the packs and inside the packs section; absent otherwise", (hash) => {
    const { container, unmount } = strip(`/pricing?from=for_parents${hash}`);
    const top = screen.getByTestId("parent-return-cbq");
    const inside = screen.getByTestId("parent-return-packs");
    expect(top.getAttribute("href")).toBe("/for-parents");
    expect(inside.getAttribute("href")).toBe("/for-parents");
    expect(top.textContent).toContain("Back to parents page");
    expect(container.querySelector("#packs")!.contains(inside)).toBe(true);
    expect(container.querySelector("#pricing-packs-top")!.contains(top)).toBe(true);
    unmount();
    sessionStorage.clear();
    strip(`/pricing${hash}`);
    expect(screen.queryByTestId("parent-return-cbq")).toBeNull();
    expect(screen.queryByTestId("parent-return-packs")).toBeNull();
  });
});
