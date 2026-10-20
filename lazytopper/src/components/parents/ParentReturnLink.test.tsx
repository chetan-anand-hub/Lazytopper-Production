/**
 * PARENTS-NAV-1 — the shared "← Back to parents page" link.
 *
 * Shown only with the flag (URL or this tab's sessionStorage); otherwise it renders NOTHING —
 * proven on the server renderer too, which is what keeps every destination page's prerender
 * unchanged. The target is the constant /for-parents, never a URL from the query.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ParentReturnLink from "./ParentReturnLink";
import { PARENT_RETURN_KEY } from "../../lib/parentReturn";

function renderAt(entry: string, props: Parameters<typeof ParentReturnLink>[0] = {}) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/somewhere" element={<ParentReturnLink {...props} />} />
        <Route path="/for-parents" element={<div data-testid="parents-probe">PARENTS</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("PARENTS-NAV-1 — ParentReturnLink", () => {
  it("renders NOTHING without the flag — on the server renderer as well (the prerender case)", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/somewhere"]}>
        <ParentReturnLink />
      </MemoryRouter>,
    );
    expect(html).toBe("");
    const r = renderAt("/somewhere?utm_source=parent_share");
    expect(r.container.innerHTML).toBe("");
    expect(window.sessionStorage.getItem(PARENT_RETURN_KEY)).toBeNull();
  });

  it("CONTROL — the same server render WITH the flag does produce the link", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/somewhere?from=for_parents"]}>
        <ParentReturnLink />
      </MemoryRouter>,
    );
    expect(html).toContain('href="/for-parents"');
    expect(html).toContain("← Back to parents page");
  });

  it("with ?from=for_parents: shows, links to /for-parents, remembers the tab (session only), and navigates", () => {
    renderAt("/somewhere?from=for_parents");
    const link = screen.getByTestId("parent-return");
    expect(link.textContent).toBe("← Back to parents page");
    expect(link.getAttribute("href")).toBe("/for-parents");
    expect(link.closest("nav")?.className).toBe("lt-parent-return");
    expect(link.className).toBe("lt-parent-return__link");
    expect(window.sessionStorage.getItem(PARENT_RETURN_KEY)).toBe("1");
    expect(window.localStorage.getItem(PARENT_RETURN_KEY)).toBeNull();
    fireEvent.click(link);
    expect(screen.getByTestId("parents-probe")).toBeTruthy();
  });

  it("shows on a later page of the same tab with no query (the stored flag)", () => {
    renderAt("/somewhere?from=for_parents");
    cleanup();
    renderAt("/somewhere");
    expect(screen.getByTestId("parent-return")).toBeTruthy();
  });

  it("the target never comes from the query (no open redirect)", () => {
    renderAt("/somewhere?from=for_parents&returnTo=https%3A%2F%2Fevil.example&redirect=%2F%2Fevil.example");
    expect(screen.getByTestId("parent-return").getAttribute("href")).toBe("/for-parents");
  });

  it("a host can keep its own class and test id (/check-improve's markup)", () => {
    renderAt("/somewhere?from=for_parents", { className: "lt-ci-parent-return", testId: "ci-parent-return" });
    const link = screen.getByTestId("ci-parent-return");
    expect(link.className).toBe("lt-ci-parent-return__link");
    expect(link.closest("nav")?.className).toBe("lt-ci-parent-return");
    expect(link.closest("nav")?.getAttribute("aria-label")).toBe("Back to parents page");
  });

  it("is throw-safe when sessionStorage throws (private window)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    renderAt("/somewhere?from=for_parents");
    expect(screen.getByTestId("parent-return")).toBeTruthy();
    cleanup();
    const r = renderAt("/somewhere");
    expect(r.container.innerHTML).toBe("");
  });
});
