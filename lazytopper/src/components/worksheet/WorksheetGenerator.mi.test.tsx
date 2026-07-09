import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Worksheet BUILDER redesign ("A · Smart default") — the smart-default hero + the
// honest MI-personalise toggle (three states) + the new PREVIEW step before Generate
// + view-aware Back. Asserts against the real rendered DOM. Runs in CI/Codespaces vitest.

const useAuthMock = vi.fn();
vi.mock("../../context/AuthContext", () => ({ useAuth: () => useAuthMock() }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));

import WorksheetGenerator from "./WorksheetGenerator";

beforeEach(() => useAuthMock.mockReturnValue({ user: null }));
afterEach(cleanup);

describe("WorksheetGenerator — smart-default hero + honest MI toggle", () => {
  it("leads with the smart-default hero + a Preview CTA (nothing generated yet)", () => {
    const { getByText, queryByText } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    // Hero heading = "{mode} · {topic}".
    expect(getByText(/Board exam mix ·/)).toBeTruthy();
    // Primary action is Preview (not a bare Generate) — and nothing is created yet.
    expect(getByText(/Preview worksheet/i)).toBeTruthy();
    expect(queryByText(/worksheet is ready/i)).toBeNull();
  });

  it("MI toggle is always visible (outside the Customise drawer), titled + explained", () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");
    // Progressive disclosure hides the FORM behind "Customise" — but personalisation
    // stays discoverable (not hidden inside the drawer).
    expect(mi.closest(".lt-ws__drawer")).toBeNull();
    expect(mi.textContent).toContain("Personalise this worksheet");
    expect(mi.textContent).toContain("Mistake Intelligence");
  });

  it("signed-out: shows a Sign-in CTA that returns to the worksheet (no bare checkbox)", () => {
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

  it("signed-in but no in-scope hotspot: explains how to unlock (locked, no live toggle)", () => {
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

describe("WorksheetGenerator — Preview step + view-aware Back", () => {
  it("Build → Preview → Generate lands on the ready view; Back returns to the builder", () => {
    const { getByText, getAllByText, queryByText } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    expect(getByText(/Board exam mix ·/)).toBeTruthy();

    // Build → Preview (nothing is created — it's a preview of the real set).
    fireEvent.click(getAllByText(/Preview worksheet/i)[0]);
    expect(getByText(/Here.s what will be generated/)).toBeTruthy();

    // Preview → Generate → the (unchanged) ready view.
    fireEvent.click(getByText(/Generate worksheet/i));
    expect(getByText("Back to generator")).toBeTruthy();
    expect(queryByText(/Here.s what will be generated/)).toBeNull();

    // Back → the builder.
    fireEvent.click(getByText("Back to generator"));
    expect(getByText(/Board exam mix ·/)).toBeTruthy();
  });
});
