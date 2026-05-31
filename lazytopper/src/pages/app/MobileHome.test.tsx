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

afterEach(cleanup);

function renderMobileHome() {
  return render(
    <MemoryRouter>
      <MobileHome />
    </MemoryRouter>,
  );
}

describe("MobileHome (mobile /browse layout — locked polish design)", () => {
  it("renders the four illustrated destinations in orient-before-act order", () => {
    setMatchMediaMatches(false); // mobile
    renderMobileHome();

    const dests = screen.getAllByTestId("mobile-home-destination");
    expect(dests).toHaveLength(4);

    // Orient-first order: trends → predicted → practice → check.
    expect(dests[0]).toHaveTextContent("What scores most");
    expect(dests[1]).toHaveTextContent("What's likely in 2027");
    expect(dests[2]).toHaveTextContent("Practice it");
    expect(dests[3]).toHaveTextContent("Check your answer");

    // Each illustrated tile carries an SVG infographic (not a plain box).
    for (const d of dests) {
      expect(d.querySelector("svg")).not.toBeNull();
    }
  });

  it("routes each destination to a canonical Home route", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    const dests = screen.getAllByTestId("mobile-home-destination");
    const hrefs = dests.map((d) => d.getAttribute("href"));
    // Trends + Predicted both surface on the canonical exam-trends page.
    expect(hrefs[0]).toContain("/exam-trends");
    expect(hrefs[1]).toContain("/exam-trends");
    expect(hrefs[2]).toContain("/practice-hub");
    expect(hrefs[3]).toContain("/check-improve");
    // No legacy lookalikes.
    for (const h of hrefs) {
      expect(h).not.toMatch(/\/dashboard|\/profile|^\/trends|^\/practice(\?|$)/);
    }
  });

  it("shows the SAMPLE mistake-intelligence panel — clearly labelled, honest CTA", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    // Pain-framed section header.
    expect(screen.getByText("Why do you keep losing marks?")).toBeInTheDocument();

    // The preview is explicitly labelled a SAMPLE — not the user's real data.
    expect(
      screen.getByTestId("mobile-home-mistake-sample-label"),
    ).toHaveTextContent(/Sample · what your report looks like/i);

    // Sample insight content (clearly an example).
    expect(screen.getByText(/Most marks lost: Trigonometry, conceptual/i)).toBeInTheDocument();

    // Honest, inviting CTA — NOT "Sign in to unlock".
    expect(screen.getByText(/Start free — find my reasons/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sign in to unlock/i)).toBeNull();
  });

  it("does NOT show a resume strip for a signed-out visitor", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.queryByTestId("mobile-home-resume")).toBeNull();
  });

  it("renders exactly ONE brand bar (its own locked-design header)", () => {
    // The global public navbar is suppressed on mobile /browse (see
    // isMobileSelfChromedRoute), so MobileHome must carry a single brand bar.
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.getAllByText("LazyTopper")).toHaveLength(1);
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
