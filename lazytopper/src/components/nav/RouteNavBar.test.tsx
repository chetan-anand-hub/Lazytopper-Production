/**
 * NAV-1 - the header's "← <parent>" + Home row: direct arrival -> parent link; in-app history -> one step back;
 * hidden on Home and in an in-progress test.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import RouteNavBar from "./RouteNavBar";

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname}</div>;
}

function mount(entries: string[], index = entries.length - 1) {
  return render(
    <MemoryRouter initialEntries={entries} initialIndex={index}>
      <RouteNavBar />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  cleanup();
  window.history.replaceState(null, "");
});

describe("NAV-1 RouteNavBar", () => {
  it("direct arrival on /packs: '← Pricing' links to /pricing, and Home links to /", () => {
    window.history.replaceState({ idx: 0 }, "");
    mount(["/packs"]);
    const back = screen.getByTestId("route-nav-back");
    expect(back.textContent).toContain("Pricing");
    expect(back.getAttribute("href")).toBe("/pricing");
    expect(back.getAttribute("aria-label")).toBe("Back to Pricing");
    expect(screen.getByTestId("route-nav-home").getAttribute("href")).toBe("/");
    fireEvent.click(back);
    expect(screen.getByTestId("where").textContent).toBe("/pricing");
  });

  it("direct arrival on /pricing: one '← Home' control, no duplicate Home", () => {
    mount(["/pricing"]);
    expect(screen.getByTestId("route-nav-back").textContent).toContain("Home");
    expect(screen.queryByTestId("route-nav-home")).toBeNull();
  });

  it("arrived from inside the app: '← Back' goes one step back to where the student came from", () => {
    window.history.replaceState({ idx: 1 }, "");
    mount(["/notes/triangles", "/packs"], 1);
    const back = screen.getByTestId("route-nav-back");
    expect(back.textContent).toContain("Back");
    expect(back.getAttribute("data-back-kind")).toBe("history");
    fireEvent.click(back);
    expect(screen.getByTestId("where").textContent).toBe("/notes/triangles");
  });

  it("Home goes Home", () => {
    window.history.replaceState({ idx: 1 }, "");
    mount(["/me", "/notes/triangles"], 1);
    fireEvent.click(screen.getByTestId("route-nav-home"));
    expect(screen.getByTestId("where").textContent).toBe("/");
  });

  it("hidden on Home and in an in-progress test", () => {
    for (const p of ["/", "/browse", "/welcome", "/chapter-test/10/Maths/triangles", "/full-mock/10/Science", "/exam-simulation", "/login"]) {
      mount([p]);
      expect(screen.queryByTestId("route-nav"), p).toBeNull();
      cleanup();
    }
  });

  it("on /for-parents both links carry from=for_parents (PARENTS-NAV-1)", () => {
    mount(["/for-parents"]);
    expect(screen.getByTestId("route-nav-back").getAttribute("href")).toBe("/?from=for_parents");
    cleanup();
    window.history.replaceState({ idx: 2 }, "");
    mount(["/packs", "/for-parents"], 1);
    expect(screen.getByTestId("route-nav-back").getAttribute("href")).toBe("/?from=for_parents");
    expect(screen.getByTestId("route-nav-home").getAttribute("href")).toBe("/?from=for_parents");
  });

  it("uses CSS classes only (no inline style objects)", () => {
    const { container } = mount(["/packs"]);
    expect(container.querySelector("nav [style]")).toBeNull();
  });
});

describe("TS-NAV-1 RouteNavBar: pages reached from a Test Series paper", () => {
  const paper = "/chapter-test/10/Maths/real-numbers?series=1";
  const q = (p: string) => `?from=test-series&returnTo=${encodeURIComponent(p)}`;

  it("/packs reached from a series paper: Back is a link to THAT paper, Home stays; even with in-app history", () => {
    window.history.replaceState({ idx: 3 }, "");
    mount([`/packs${q(paper)}`]);
    const back = screen.getByTestId("route-nav-back");
    expect(back.getAttribute("href")).toBe(paper);
    expect(back.getAttribute("data-back-kind")).toBe("parent");
    expect(back.textContent).toContain("Test paper");
    expect(screen.getByTestId("route-nav-home").getAttribute("href")).toBe("/");
  });

  it("without a returnTo the Back goes to /test-series", () => {
    mount(["/board-pass?from=test-series"]);
    const back = screen.getByTestId("route-nav-back");
    expect(back.getAttribute("href")).toBe("/test-series");
    expect(back.textContent).toContain("Test Series");
  });

  it("an external returnTo is never followed", () => {
    mount([`/pricing${q("https://evil.test/")}`]);
    expect(screen.getByTestId("route-nav-back").getAttribute("href")).toBe("/test-series");
  });

  it("non-series journeys are unchanged: same Back with and without an unrelated returnTo", () => {
    window.history.replaceState({ idx: 0 }, "");
    mount(["/packs"]);
    expect(screen.getByTestId("route-nav-back").getAttribute("href")).toBe("/pricing");
    cleanup();
    mount(["/packs?returnTo=%2Fchapter-test%2F10%2FMaths%2Freal-numbers%3Fseries%3D1"]);
    expect(screen.getByTestId("route-nav-back").getAttribute("href")).toBe("/pricing");
    cleanup();
    window.history.replaceState({ idx: 1 }, "");
    mount(["/notes/triangles", "/packs?from=for_parents"], 1);
    expect(screen.getByTestId("route-nav-back").getAttribute("data-back-kind")).toBe("history");
  });

  it("VITE_TS_NAV_DISABLED: today's Back, byte for byte", () => {
    vi.stubEnv("VITE_TS_NAV_DISABLED", "1");
    window.history.replaceState({ idx: 0 }, "");
    mount([`/packs${q(paper)}`]);
    expect(screen.getByTestId("route-nav-back").getAttribute("href")).toBe("/pricing");
  });

  it("a hidden page (a series paper itself) still shows no row", () => {
    mount([`/chapter-test/10/Maths/real-numbers?series=1&from=test-series`]);
    // RouteNavBar alone (the eager RouteNav hides these); the route map marks them noBack.
    expect(screen.queryByTestId("route-nav-back")).toBeNull();
  });
});
