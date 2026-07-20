// TutorQuickPracticeOverlay — PRODUCTION-FAITHFUL integration test.
//
// ★ THIS FILE EXISTS IN THIS SHAPE BECAUSE OF #490. The v1 test rendered the overlay in
// ISOLATION, so its nested <MemoryRouter> was the ONLY router in the tree — legal in the test,
// illegal in production (the app is always inside <BrowserRouter>, main.tsx). It went green on a
// build that threw "cannot render a <Router> inside another <Router>" for every student. The
// harness, not the assertion, was the defect.
//
// So every case below is mounted in the REAL tree: an OUTER router, with the host rendered
// INSIDE a matched /tutor/:grade/:subject/:topicKey route — the exact nesting depth TutorPage
// has in production. And the FIRST case is a CONTROL that mounts v1's nested-router approach and
// asserts it THROWS. If that control ever stops throwing, this harness has stopped reproducing
// production and every other assertion in this file is worthless.
//
// PracticePage is stubbed: mounting the real one drags in Firebase/data/auth and is not what
// this proves. What this proves is the HOST contract — seed resolution and nav containment.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

vi.mock("../PracticePage", () => ({
  default: ({ overlay }: { overlay?: { onClose: () => void } }) => {
    const params = useParams();
    const [sp] = useSearchParams();
    const navigate = useNavigate();
    return (
      <div>
        <div data-testid="grade">{params.grade}</div>
        <div data-testid="subject">{params.subject}</div>
        <div data-testid="topic">{sp.get("topic")}</div>
        <div data-testid="source">{sp.get("source")}</div>
        <div data-testid="count">{sp.get("count")}</div>
        <div data-testid="backLabel">{sp.get("backLabel")}</div>
        <div data-testid="overlay-present">{overlay ? "yes" : "no"}</div>
        {/* Stands in for the in-page navigations PracticePage's children still fire:
            PracticeControls' worksheet CTA, PracticeQuestionList's empty-state links, etc. */}
        <button data-testid="stray-nav" onClick={() => navigate("/practice/worksheets")}>
          stray nav
        </button>
      </div>
    );
  },
}));

import TutorQuickPracticeOverlay from "./TutorQuickPracticeOverlay";
import PracticePageStub from "../PracticePage";
import { buildQuickPracticeRoundTripHref } from "./tutorRoundTrip";

const seedUrl = buildQuickPracticeRoundTripHref({
  returnTo: "/tutor/10/science/carbon-and-its-compounds",
  subject: "science",
  topicKey: "carbon-and-its-compounds",
  concept: "nomenclature",
  backLabel: "Back to your tutor",
  count: 5,
});

const TUTOR_URL = "/tutor/10/science/carbon-and-its-compounds";

/** Reports the OUTER router's location — proves whether the app actually navigated. */
function OuterLocationSpy() {
  const loc = useLocation();
  return <div data-testid="outer-path">{loc.pathname}</div>;
}

/**
 * The production tree: an outer Router, with `host` rendered inside the matched tutor route —
 * exactly where TutorPage (and therefore this overlay) lives in the real app.
 */
function inProductionTree(host: React.ReactNode) {
  return (
    <MemoryRouter initialEntries={[TUTOR_URL]}>
      <Routes>
        <Route
          path="/tutor/:grade/:subject/:topicKey"
          element={
            <>
              <OuterLocationSpy />
              {host}
            </>
          }
        />
        <Route path="/practice/worksheets" element={<OuterLocationSpy />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe("TutorQuickPracticeOverlay — mounted in the REAL app tree", () => {
  // ── THE CONTROL ──────────────────────────────────────────────────────────────────────
  it("CONTROL: v1's nested <MemoryRouter> THROWS here (proves this harness reproduces production)", () => {
    expect(() =>
      render(
        inProductionTree(
          <MemoryRouter initialEntries={[seedUrl]}>
            <Routes>
              <Route path="/practice/:grade/:subject" element={<PracticePageStub />} />
            </Routes>
          </MemoryRouter>,
        ),
      ),
    ).toThrow(/cannot render a <Router> inside another <Router>/i);
  });

  // ── THE FIX ──────────────────────────────────────────────────────────────────────────
  it("renders WITHOUT throwing inside the outer router, and the seed reaches PracticePage", () => {
    render(inProductionTree(<TutorQuickPracticeOverlay open onClose={() => {}} seedUrl={seedUrl} />));
    // useParams — matched against the SEED, not the tutor URL it is nested under.
    expect(screen.getByTestId("grade").textContent).toBe("10");
    expect(screen.getByTestId("subject").textContent).toBe("Science");
    // useSearchParams — the crux: resolves to the seed's query, not the outer router's.
    expect(screen.getByTestId("topic").textContent).toBe("carbon-and-its-compounds");
    expect(screen.getByTestId("source").textContent).toBe("tutor"); // → arrivedTargeted → auto-build
    expect(screen.getByTestId("count").textContent).toBe("5");
    expect(screen.getByTestId("backLabel").textContent).toBe("Back to your tutor");
    expect(screen.getByTestId("overlay-present").textContent).toBe("yes");
    // The outer router is untouched — the student is still on the tutor URL.
    expect(screen.getByTestId("outer-path").textContent).toBe(TUTOR_URL);
  });

  it("renders nothing when closed (open=false → null)", () => {
    render(inProductionTree(<TutorQuickPracticeOverlay open={false} onClose={() => {}} seedUrl={seedUrl} />));
    expect(screen.queryByTestId("grade")).toBeNull();
  });

  // ── NAV CONTAINMENT (no Router ⇒ no isolation ⇒ this must be explicit) ────────────────
  it("CONTAINMENT: a stray in-panel navigation returns to the tutor instead of navigating the app", async () => {
    const onClose = vi.fn();
    render(inProductionTree(<TutorQuickPracticeOverlay open onClose={onClose} seedUrl={seedUrl} />));
    fireEvent.click(screen.getByTestId("stray-nav")); // navigate("/practice/worksheets")
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    // ★ The app did NOT navigate — the student is still on the tutor URL, thread intact.
    expect(screen.getByTestId("outer-path").textContent).toBe(TUTOR_URL);
  });

  it("CONTAINMENT is overlay-ONLY: the same navigation outside the overlay still navigates normally", async () => {
    // The identical component + click, mounted WITHOUT the overlay host. Navigation must behave
    // exactly as it always has — containment must never leak onto the normal app.
    render(
      <MemoryRouter initialEntries={[TUTOR_URL]}>
        <Routes>
          <Route
            path="/tutor/:grade/:subject/:topicKey"
            element={
              <>
                <OuterLocationSpy />
                <PracticePageStub />
              </>
            }
          />
          <Route path="/practice/worksheets" element={<OuterLocationSpy />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("stray-nav"));
    await waitFor(() =>
      expect(screen.getByTestId("outer-path").textContent).toBe("/practice/worksheets"),
    );
  });
});
