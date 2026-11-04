/**
 * NAV-1 - RouteNav, the eager wrapper: hidden on Home and focused flows; one row per page (a MobileShell header owns
 * it when present); the lazily-loaded row arrives with the right links.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import RouteNav from "./RouteNav";
import { useShellNavSlot } from "./routeNavSlot";

function Shell() {
  useShellNavSlot(true);
  return <RouteNav placement="shell" />;
}

afterEach(() => cleanup());

describe("NAV-1 RouteNav", () => {
  it("loads the row: '← Pricing' + Home on /packs", async () => {
    render(
      <MemoryRouter initialEntries={["/packs"]}>
        <RouteNav />
      </MemoryRouter>,
    );
    expect((await screen.findByTestId("route-nav-back")).getAttribute("href")).toBe("/pricing");
    expect(screen.getByTestId("route-nav-home").getAttribute("href")).toBe("/");
  });

  it("renders nothing (not even a placeholder) on Home or in an in-progress test", () => {
    for (const p of ["/", "/browse", "/chapter-test/10/Maths/triangles", "/full-mock/10/Science", "/login"]) {
      const { container } = render(
        <MemoryRouter initialEntries={[p]}>
          <RouteNav />
        </MemoryRouter>,
      );
      expect(container.innerHTML, p).toBe("");
      cleanup();
    }
  });

  it("a page header (MobileShell) owns the row: the App-level row steps aside - one row, under the header", async () => {
    render(
      <MemoryRouter initialEntries={["/exam-trends"]}>
        <RouteNav />
        <Shell />
      </MemoryRouter>,
    );
    await screen.findByTestId("route-nav-back");
    const rows = screen.getAllByTestId("route-nav");
    expect(rows).toHaveLength(1);
    expect(rows[0].className).toContain("lt-routenav--shell");
  });
});
