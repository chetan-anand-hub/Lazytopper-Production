import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// PR-E2a.3 — Item 2/4 (MI-enrich VISIBLE + placed in the right preview, by the
// Distribution it controls) and Item 3 (honest locked states + view-aware Back).
// Asserts against the real rendered DOM. Runs in CI/Codespaces vitest.

const useAuthMock = vi.fn();
vi.mock("../../context/AuthContext", () => ({ useAuth: () => useAuthMock() }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));

import WorksheetGenerator from "./WorksheetGenerator";

beforeEach(() => useAuthMock.mockReturnValue({ user: null }));
afterEach(cleanup);

describe("WorksheetGenerator — MI-enrich visible + in the preview (Item 2/4)", () => {
  it("renders the MI field inside the right preview (next to Distribution), titled + explained", () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    // Placed in the right preview panel (not the build card).
    const preview = mi.closest(".lt-ws__preview");
    expect(preview).not.toBeNull();
    expect(mi.closest(".lt-ws__card")).toBeNull();
    // Ordering: MI sits AFTER the complete snapshot (Sections in scope), so the
    // compact "Will be generated" snapshot stays intact above it.
    const sections = Array.from(preview!.querySelectorAll(".lt-ws__bh")).find(
      (el) => el.textContent === "Sections in scope",
    );
    expect(sections).toBeTruthy();
    expect(sections!.compareDocumentPosition(mi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Visible + explained.
    expect(mi.textContent).toContain("Personalise this worksheet");
    expect(mi.textContent).toContain("Mistake Intelligence");
  });

  it("signed-out: shows a Sign-in CTA that returns to the worksheet (no dead-end, no bare checkbox)", () => {
    const { getByTestId } = render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    const cta = mi.querySelector("a.lt-ws__mi-cta") as HTMLAnchorElement | null;
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toContain("/login");
    expect(cta?.getAttribute("href")).toContain("redirect=");
    expect(mi.querySelector("input.lt-ws__mi-check")).toBeNull();
  });

  it("signed-in but no in-scope hotspot: explains how to unlock (not a bare 'locked')", () => {
    useAuthMock.mockReturnValue({ user: { uid: "u1", isLocalSession: false } });
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    expect(mi.className).toContain("locked");
    expect(mi.textContent).toMatch(/Check & Improve|Check &amp; Improve|grade a worksheet/i);
    // No enabled toggle when there is nothing to weight toward.
    expect(mi.querySelector("input.lt-ws__mi-check")).toBeNull();
  });
});

describe("WorksheetGenerator — view-aware Back (Item 3)", () => {
  it("Back returns to the builder after Generate (not the practice hub)", () => {
    const { getAllByText, getByText, queryByText } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    expect(getByText("What worksheet do you want?")).toBeTruthy();

    fireEvent.click(getAllByText(/Generate worksheet/i)[0]);

    expect(getByText("Back to generator")).toBeTruthy();
    expect(queryByText("What worksheet do you want?")).toBeNull();

    fireEvent.click(getByText("Back to generator"));
    expect(getByText("What worksheet do you want?")).toBeTruthy();
  });
});
