import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// PR-E2a.3 — Item 2 (MI-enrich VISIBLE + contained inside the build card) and
// Item 3 (view-aware Back). Asserts against the real rendered DOM. Runs in
// CI/Codespaces vitest.

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));

import WorksheetGenerator from "./WorksheetGenerator";

afterEach(cleanup);

describe("WorksheetGenerator — MI-enrich visible + contained (Item 2)", () => {
  it("renders a visible, titled MI field INSIDE the build-mode card", () => {
    const { getByTestId, container } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");

    // Contained: descendant of the "Build mode" card.
    const card = mi.closest(".lt-ws__card");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("Build mode");

    // Visible + explained: title, one-line benefit, the real checkbox, the label.
    expect(mi.textContent).toContain("Personalise this worksheet");
    expect(mi.textContent).toContain("Mistake Intelligence");
    expect(mi.querySelector("input.lt-ws__mi-check")).not.toBeNull();
    // Locked state (no user/mistakes) stays visible + explained, not hidden.
    expect(mi.className).toContain("locked");
    expect(mi.textContent?.toLowerCase()).toContain("locked");
  });
});

describe("WorksheetGenerator — view-aware Back (Item 3)", () => {
  it("Back returns to the builder after Generate (not the practice hub)", () => {
    const { getAllByText, getByText, queryByText } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    // Build view.
    expect(getByText("What worksheet do you want?")).toBeTruthy();

    // Generate (sync — plan + generate + persist + setView happen in the handler).
    fireEvent.click(getAllByText(/Generate worksheet/i)[0]);

    // Generated view: Back-to-generator affordance present, build header gone.
    expect(getByText("Back to generator")).toBeTruthy();
    expect(queryByText("What worksheet do you want?")).toBeNull();

    // Back → builder restored (selections intact, same component).
    fireEvent.click(getByText("Back to generator"));
    expect(getByText("What worksheet do you want?")).toBeTruthy();
  });
});
