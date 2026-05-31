import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

// MobileHome reads auth/subscription via context hooks. Mock them so the unit
// test renders deterministically as the real signed-out /browse state (the only
// state reachable at /browse — signed-in users are redirected before arrival).
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    isTrialActive: false,
    isPremium: false,
    isTrialExpired: false,
  }),
}));

import MobileHome from "./MobileHome";
import { useIsDesktop } from "../../hooks/useIsDesktop";
import { PRIMARY_CARDS } from "../../lib/desktop/homeDestinations";

afterEach(cleanup);

function renderMobileHome() {
  return render(
    <MemoryRouter>
      <MobileHome />
    </MemoryRouter>,
  );
}

describe("MobileHome (mobile /browse layout)", () => {
  it("renders all four destinations stacked in a single-column TileRow", () => {
    setMatchMediaMatches(false); // mobile
    const { container } = renderMobileHome();

    // All four real destinations (from the shared PRIMARY_CARDS) are rendered.
    const dests = screen.getAllByTestId("mobile-home-destination");
    expect(dests).toHaveLength(PRIMARY_CARDS.length);
    expect(PRIMARY_CARDS).toHaveLength(4);
    for (const c of PRIMARY_CARDS) {
      expect(screen.getByText(c.label)).toBeInTheDocument();
    }

    // They sit in a TileRow whose CSS collapses to one column below 1024px —
    // i.e. they stack on mobile (jsdom has no layout, so assert the CSS contract).
    const row = container.querySelector(".lt-grammar-tile-row");
    expect(row).not.toBeNull();
    const css = container.querySelector("style")?.textContent ?? "";
    const mobileBlock = css.slice(css.indexOf("@media (max-width: 1023px)"));
    expect(mobileBlock).toContain(".lt-grammar-tile-row");
    expect(mobileBlock).toContain("grid-template-columns: minmax(0, 1fr)");
  });

  it("renders the mistake-intelligence card in its real logged-out state", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.getByText("Mistake intelligence")).toBeInTheDocument();
    expect(screen.getByText("Mistake-aware practice")).toBeInTheDocument();
    // Logged-out CTA — no invented counts.
    expect(
      screen.getByText(/Mistake-aware practice needs saved attempts/i),
    ).toBeInTheDocument();
    // "Start free trial" appears as both the header chip and the mistake-card CTA
    // for a signed-out visitor — both are the real logged-out affordances.
    expect(screen.getAllByText("Start free trial").length).toBeGreaterThanOrEqual(1);
  });
});

describe("Home route switch predicate (isDesktop ? DesktopHome : MobileHome)", () => {
  it("useIsDesktop returns true at desktop width and false at mobile — driving the /browse branch", () => {
    // Desktop: the /browse branch selects DesktopHome.
    setMatchMediaMatches(true);
    const desktop = renderHook(() => useIsDesktop());
    expect(desktop.result.current).toBe(true);

    // Mobile: the /browse branch selects MobileHome.
    setMatchMediaMatches(false);
    const mobile = renderHook(() => useIsDesktop());
    expect(mobile.result.current).toBe(false);
  });
});
