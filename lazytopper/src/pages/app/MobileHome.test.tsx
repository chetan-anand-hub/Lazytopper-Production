import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, renderHook, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

// MobileHome reads auth/subscription via context hooks. Mock them so the unit
// test renders deterministically as the signed-out /browse state.
//
// NOTE: /browse is terminal at mobile width for signed-in students TOO — mobile
// "/" redirects them here (App.tsx RootEntry + the /browse route), so this is
// not the only reachable state. The signed-out branch is simply the one this
// file pins; the signed-in branches differ only in the resume strip and the
// trial chip.
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

describe("MobileHome (mobile /browse layout — Home redesign PR-A)", () => {
  it("renders the four SHARED hero cards in SPEC §2 journey order", () => {
    setMatchMediaMatches(false); // mobile
    renderMobileHome();

    const dests = screen.getAllByTestId("mobile-home-destination");
    expect(dests).toHaveLength(4);

    expect(dests[0]).toHaveTextContent("See what's likely");
    expect(dests[1]).toHaveTextContent("Ask your tutor");
    expect(dests[2]).toHaveTextContent("Practise it");
    expect(dests[3]).toHaveTextContent("Check my answer");

    // Each card carries its accent icon.
    for (const d of dests) {
      expect(d.querySelector("svg")).not.toBeNull();
    }
  });

  it("★ no longer ships mobile's duplicate destination", () => {
    // BEFORE the redesign this page hardcoded its own inventory and shipped a
    // duplicate: "What scores most" AND "What's likely in 2027" both resolved
    // to /exam-trends. It now renders the shared PRIMARY_CARDS, so every
    // navigating card has a distinct destination.
    setMatchMediaMatches(false);
    renderMobileHome();

    const hrefs = screen
      .getAllByTestId("mobile-home-destination")
      .map((d) => d.getAttribute("href"))
      .filter((h): h is string => h !== null);

    expect(hrefs).toHaveLength(3); // the tutor card is a button, not a link
    expect(new Set(hrefs).size).toBe(3);
  });

  it("routes each navigating destination to a canonical Home route", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    const dests = screen.getAllByTestId("mobile-home-destination");
    const hrefs = dests.map((d) => d.getAttribute("href"));

    expect(hrefs[0]).toContain("/exam-trends");
    // The tutor card opens the pop-card — it has no destination of its own,
    // because the tutor URL needs a subject + chapter first.
    expect(hrefs[1]).toBeNull();
    expect(hrefs[2]).toContain("/practice-hub");
    expect(hrefs[3]).toContain("/check-improve");

    // No legacy lookalikes.
    for (const h of hrefs) {
      if (h === null) continue;
      expect(h).not.toMatch(/\/dashboard|\/profile|^\/trends|^\/practice(\?|$)/);
    }
  });

  // Scope note: this asserts the mobile card is WIRED to the shared picker and
  // shows the signed-out framing. The navigation contract itself (that a
  // logged-out pick goes to /login and never to /tutor) is proven exhaustively
  // in homeDestinations.test.tsx — don't restate it here and imply more.
  it("the tutor card opens the shared pop-card with the signed-out gate note", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    expect(screen.queryByTestId("tutor-picker")).toBeNull();
    fireEvent.click(screen.getAllByTestId("mobile-home-destination")[1]);

    const picker = screen.getByTestId("tutor-picker");
    expect(picker).toBeInTheDocument();
    // Signed out — the footer must promise the return trip, not premium.
    expect(screen.getByTestId("tutor-picker-gate-note")).toHaveTextContent(
      /Log in to open your tutor/i,
    );
  });

  it("shows the honest SPEC §4 mistake-intelligence card — four buckets, no invented counts", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    expect(screen.getByText("Your mistakes, understood")).toBeInTheDocument();
    expect(screen.getByText("Your mistake patterns will show here")).toBeInTheDocument();
    expect(screen.getByText(/Built from your real attempts — never guessed/i)).toBeInTheDocument();
    expect(screen.getByText("Practise a set to see your mistakes.")).toBeInTheDocument();

    // All four semantic buckets render, each with a dash where a real count
    // would go — a new student learns what MI will tell them.
    const buckets = screen.getAllByTestId("mobile-home-mi-bucket");
    expect(buckets).toHaveLength(4);
    expect(buckets.map((b) => b.textContent)).toEqual([
      "—Conceptual",
      "—Calculation",
      "—Silly mistake",
      "—Presentation",
    ]);
    for (const b of buckets) {
      expect(b.textContent).not.toMatch(/\d/);
    }

    // The old labelled-SAMPLE preview is retired — MI is real-data-only now.
    expect(screen.queryByTestId("mobile-home-mistake-sample-label")).toBeNull();
    expect(screen.queryByText(/Most marks lost: Trigonometry, conceptual/i)).toBeNull();
  });

  it("★ carries NO 'Ask the tutor about these' CTA on the MI card", () => {
    // Deliberately omitted (SPEC §4): MistakeLogEntry spans many topics while
    // buildTutorPath needs exactly one, so there is no single honest target.
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.queryByText(/ask the tutor about these/i)).toBeNull();
  });

  it("collapses the quick links into a tap-to-open list", () => {
    setMatchMediaMatches(false);
    renderMobileHome();

    const links = screen.getAllByTestId("mobile-home-quick-link");
    expect(links).toHaveLength(4);
    // Worksheets stay reachable after the hero card retired.
    const hrefs = links.map((l) => l.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.includes("/practice/worksheets"))).toBe(true);
  });

  it("does NOT show a resume strip for a signed-out visitor", () => {
    setMatchMediaMatches(false);
    renderMobileHome();
    expect(screen.queryByTestId("mobile-home-resume")).toBeNull();
  });

  it("renders exactly ONE brand bar (its own locked-design header)", () => {
    // The global public navbar is suppressed on mobile /browse (see
    // isMobileSelfChromedRoute), so MobileHome must carry a single brand bar.
    // There is no MobileShell wrapper and no account-avatar menu on this route.
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
