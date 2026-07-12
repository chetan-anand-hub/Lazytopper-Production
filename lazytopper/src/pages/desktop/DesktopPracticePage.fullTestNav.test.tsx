// DesktopPracticePage — Full Test entry nav proof [FU-FM-HUB-ENTRY].
// Renders the REAL hub at /practice-hub in a MemoryRouter and proves the
// end-to-end nav chain: the "Full Test" card exists (locked copy), its CTA
// navigates to /full-mock/:grade/:subject — the EXACT route pattern App.tsx
// mounts <MockViewGate><FullMockPage/></MockViewGate> behind — for BOTH
// subjects, on the desktop AND mobile matchMedia variants; and the retired
// old-engine entries ("Open existing full-mock engine" → /exam-simulation,
// "Practice Paper" → the un-routed /mock-builder) are gone.
//
// Signed-out mount on purpose: the Full Test card must render and navigate
// regardless of auth — MockViewGate on the TARGET route owns all gating (a
// loginUrl wrapper here would be the forbidden second gate).

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));
vi.mock("../../services/mistakeLogService", () => ({
  getMistakeLogs: async () => [],
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

import DesktopPracticePage from "./DesktopPracticePage";

afterEach(cleanup);

/** Probe standing in for App.tsx's real route — the same
 *  `/full-mock/:grade/:subject` pattern that mounts the Full Test surface. */
function FullMockRouteProbe() {
  const params = useParams<"grade" | "subject">();
  return <div data-testid="full-mock-route">{`${params.grade}/${params.subject}`}</div>;
}

function renderHub(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/practice-hub" element={<DesktopPracticePage />} />
        <Route path="/full-mock/:grade/:subject" element={<FullMockRouteProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

const openFullTestButton = () => screen.getByRole("button", { name: /open full test/i });

describe("Practice hub Full Test entry (FU-FM-HUB-ENTRY)", () => {
  it("desktop: shows the Full Test card with the locked copy and navigates to /full-mock/10/Maths", () => {
    setMatchMediaMatches(true);
    renderHub("/practice-hub");
    expect(screen.getByRole("heading", { name: "Full Test" })).toBeInTheDocument();
    expect(screen.getByText("3-hour board paper · 80 marks.")).toBeInTheDocument();
    fireEvent.click(openFullTestButton());
    expect(screen.getByTestId("full-mock-route")).toHaveTextContent("10/Maths");
  });

  it("mobile: the SAME responsive hub renders the card and navigates (reflow is CSS-only)", () => {
    setMatchMediaMatches(false);
    renderHub("/practice-hub");
    fireEvent.click(openFullTestButton());
    expect(screen.getByTestId("full-mock-route")).toHaveTextContent("10/Maths");
  });

  it("Science scope: navigates to /full-mock/10/Science", () => {
    setMatchMediaMatches(true);
    renderHub("/practice-hub?subject=Science");
    fireEvent.click(openFullTestButton());
    expect(screen.getByTestId("full-mock-route")).toHaveTextContent("10/Science");
  });

  it("the retired old-engine entries are gone and the new entry has no second gate", () => {
    setMatchMediaMatches(true);
    renderHub("/practice-hub");
    expect(screen.queryByText("Open existing full-mock engine")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Practice Paper" })).toBeNull();
    expect(screen.queryByText("Open existing Mock Builder")).toBeNull();
    // Plain navigation, signed-out: the CTA is a live button (no sign-in lock
    // chip / loginUrl wrapper) — MockViewGate on the route is the ONLY gate.
    expect(openFullTestButton()).toBeEnabled();
  });
});
