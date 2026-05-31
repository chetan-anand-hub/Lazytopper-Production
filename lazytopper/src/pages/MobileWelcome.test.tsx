import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  renderHook,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

// Spy on navigate while keeping MemoryRouter real; force signed-out (the state a
// /welcome visitor is in).
const navSpy = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navSpy };
});
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));

import MobileWelcome from "./MobileWelcome";
import { useIsDesktop } from "../hooks/useIsDesktop";

afterEach(() => {
  cleanup();
  navSpy.mockReset();
});

function renderMW() {
  return render(
    <MemoryRouter>
      <MobileWelcome />
    </MemoryRouter>,
  );
}

const CARDS: [string, string][] = [
  ["Exam Trends", "What scores most"],
  ["Predicted Questions", "Likely in 2027"],
  ["Check & Improve", "Photo → graded"],
  ["Mistake Intelligence", "Mistakes → mastery"],
];

describe("MobileWelcome carousel", () => {
  it("renders the 4 frozen hook cards (title + tag) in order", () => {
    setMatchMediaMatches(false);
    const { container } = renderMW();
    for (const [title, tag] of CARDS) {
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
    expect(container.querySelectorAll(".lt-welcome-slide")).toHaveLength(4);
    expect(container.querySelectorAll(".lt-welcome-dot")).toHaveLength(4);
  });

  it("uses a native CSS scroll-snap rail (no gesture lib)", () => {
    setMatchMediaMatches(false);
    const { container } = renderMW();
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toContain("scroll-snap-type: x mandatory");
    expect(css).toContain("scroll-snap-align: center");
    expect(container.querySelector(".lt-welcome-rail")).not.toBeNull();
  });
});

describe("MobileWelcome sticky CTA (honest trial copy)", () => {
  it("renders Start free + the honest sub-line + the quiet Sign in link", () => {
    setMatchMediaMatches(false);
    renderMW();
    expect(
      screen.getByRole("button", { name: "Start free" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("7-day Premium trial — then free Basic, upgrade anytime."),
    ).toBeInTheDocument();
    // Honesty guard — never "then paid".
    expect(screen.queryByText(/then paid/i)).toBeNull();
    expect(screen.getByText(/Already a member\?/)).toBeInTheDocument();
  });

  it("Start free explores to /browse (no login gate) for a signed-out visitor", () => {
    setMatchMediaMatches(false);
    renderMW();
    fireEvent.click(screen.getByRole("button", { name: "Start free" }));
    expect(navSpy).toHaveBeenCalledWith("/browse");
  });

  it("Sign in routes to the reason-coded login URL", () => {
    setMatchMediaMatches(false);
    renderMW();
    // Both the top-bar and the member-line "Sign in" go to the same URL.
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in" })[0]);
    expect(navSpy).toHaveBeenCalledWith("/login?reason=login&redirect=%2F");
  });
});

describe("/welcome route switch predicate (isDesktop ? Welcome : MobileWelcome)", () => {
  it("useIsDesktop returns true at desktop width and false at mobile", () => {
    setMatchMediaMatches(true);
    expect(renderHook(() => useIsDesktop()).result.current).toBe(true);
    setMatchMediaMatches(false);
    expect(renderHook(() => useIsDesktop()).result.current).toBe(false);
  });
});
