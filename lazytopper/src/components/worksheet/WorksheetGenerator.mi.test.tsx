import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// PR-E2a.2 FIX 3 — verify the MI-enrich toggle is actually CONTAINED inside the
// build-mode card (the prior fixes "did not take" per owner). Asserts against the
// real rendered DOM, not an assumption. Runs in CI/Codespaces vitest.

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));

import WorksheetGenerator from "./WorksheetGenerator";

afterEach(cleanup);

describe("WorksheetGenerator — MI-enrich box containment (FIX 3)", () => {
  it("renders the MI-enrich toggle INSIDE the build-mode card", () => {
    const { getByTestId, container } = render(
      <MemoryRouter>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const mi = getByTestId("mi-enrich-box");

    // It is a descendant of a card, and that card is the "Build mode" card.
    const card = mi.closest(".lt-ws__card");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("Build mode");

    // The box really wraps the toggle + label (not a detached bare row).
    expect(mi.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect(container.textContent).toContain("Enrich from Mistake Intelligence");
  });
});
