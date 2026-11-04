/**
 * NAV-1 - the header's "← <parent>" + Home row: direct arrival -> parent link; in-app history -> one step back;
 * hidden on Home and in an in-progress test.
 */
import { afterEach, describe, expect, it } from "vitest";
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
