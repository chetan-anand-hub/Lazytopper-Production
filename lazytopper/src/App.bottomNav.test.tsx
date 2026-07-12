import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { setMatchMediaMatches } from "./test/setup";
import { BottomNav, isMobileSelfChromedRoute, isBareFullScreenRoute } from "./App";

afterEach(cleanup);

/** Probe that surfaces the current pathname so tab navigation is assertable. */
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderNav(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const TABS = ["Home", "Exam Trends", "Practice", "Check", "Me"];

describe("BottomNav (mobile tab bar — PR D)", () => {
  it("renders all five tabs in order on a mobile route", () => {
    setMatchMediaMatches(false); // mobile
    renderNav("/browse");
    for (const label of TABS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("navigates each tab to its canonical route", () => {
    setMatchMediaMatches(false);
    const expected: Record<string, string> = {
      Home: "/browse",
      "Exam Trends": "/exam-trends",
      Practice: "/practice-hub",
      Check: "/check-improve",
      Me: "/me",
    };
    for (const [label, route] of Object.entries(expected)) {
      cleanup();
      renderNav("/somewhere");
      fireEvent.click(screen.getByText(label));
      expect(screen.getByTestId("loc")).toHaveTextContent(route);
    }
  });

  // jsdom normalises hsl() to rgb(): active green hsl(152,55%,45%) →
  // rgb(52, 178, 119); inactive muted hsl(220,15%,42%) → rgb(91, 102, 123).
  const ACTIVE_GREEN = "rgb(52, 178, 119)";
  const INACTIVE_SLATE = "rgb(91, 102, 123)";

  it("uses the light grammar: green active tab, muted-slate inactive tabs", () => {
    setMatchMediaMatches(false);
    renderNav("/browse"); // Home is active here
    const homeBtn = screen.getByText("Home").closest("button")!;
    const practiceBtn = screen.getByText("Practice").closest("button")!;
    expect(homeBtn.style.color).toBe(ACTIVE_GREEN);
    expect(practiceBtn.style.color).toBe(INACTIVE_SLATE);
  });

  it("renders a light surface (white), not the old near-black band", () => {
    setMatchMediaMatches(false);
    const { container } = renderNav("/browse");
    const fixed = Array.from(container.querySelectorAll("div")).find(
      (el) => (el as HTMLElement).style.position === "fixed",
    ) as HTMLElement | undefined;
    expect(fixed).toBeTruthy();
    // White surface (rgb 255,255,255) — not the old rgba(10,10,10,0.95) band.
    expect(fixed!.style.background).toContain("255, 255, 255");
    expect(fixed!.style.background).not.toContain("10, 10, 10");
    // Soft grammar border hsl(220,18%,90%) → rgb(225, 228, 234).
    expect(fixed!.style.borderTop).toContain("rgb(225, 228, 234)");
  });

  it("marks the matching tab active on its canonical route", () => {
    setMatchMediaMatches(false);
    cleanup();
    renderNav("/exam-trends");
    const trendsBtn = screen.getByText("Exam Trends").closest("button")!;
    expect(trendsBtn.style.color).toBe(ACTIVE_GREEN); // green/active
  });

  it("returns null on desktop", () => {
    setMatchMediaMatches(true); // desktop
    renderNav("/browse");
    for (const label of TABS) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("returns null on /chapter-test (bare full-screen — no bottom nav during a test)", () => {
    setMatchMediaMatches(false); // mobile
    renderNav("/chapter-test/10/Maths/quadratic-equations");
    for (const label of TABS) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("returns null on /welcome (visibility gate intact)", () => {
    setMatchMediaMatches(false);
    renderNav("/welcome");
    for (const label of TABS) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });
});

describe("isMobileSelfChromedRoute (global-navbar suppression gate — PR D addendum)", () => {
  it("suppresses the global navbar on mobile /browse and /welcome", () => {
    // Mobile: these pages draw their own locked-design brand bar.
    expect(isMobileSelfChromedRoute("/browse", false)).toBe(true);
    expect(isMobileSelfChromedRoute("/welcome", false)).toBe(true);
  });

  it("does NOT suppress on desktop — desktop chrome on those routes is unchanged", () => {
    expect(isMobileSelfChromedRoute("/browse", true)).toBe(false);
    expect(isMobileSelfChromedRoute("/welcome", true)).toBe(false);
  });

  it("does NOT suppress the navbar on other mobile routes", () => {
    expect(isMobileSelfChromedRoute("/practice-hub", false)).toBe(false);
    expect(isMobileSelfChromedRoute("/exam-trends", false)).toBe(false);
    expect(isMobileSelfChromedRoute("/me", false)).toBe(false);
    expect(isMobileSelfChromedRoute("/", false)).toBe(false);
  });
});

describe("isBareFullScreenRoute (bare full-screen chrome-suppression gate — CT)", () => {
  it("is true for /chapter-test and its param routes (width-agnostic)", () => {
    expect(isBareFullScreenRoute("/chapter-test")).toBe(true);
    expect(isBareFullScreenRoute("/chapter-test/10/Maths/quadratic-equations")).toBe(true);
  });

  it("is false for other routes (including near-miss prefixes)", () => {
    expect(isBareFullScreenRoute("/")).toBe(false);
    expect(isBareFullScreenRoute("/practice-hub")).toBe(false);
    expect(isBareFullScreenRoute("/chapter-tests")).toBe(false); // not the /chapter-test/ boundary
    expect(isBareFullScreenRoute("/full-mock")).toBe(false); // reserved for later, not active yet
  });
});
