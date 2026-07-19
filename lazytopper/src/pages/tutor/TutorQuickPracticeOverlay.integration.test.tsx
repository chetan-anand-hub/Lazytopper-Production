// TutorQuickPracticeOverlay — integration proof of the NOVEL production pattern: hosting the
// REAL PracticePage inside a nested MemoryRouter seeded with the tutor round-trip URL. This is
// a ROUTER-MOUNTED test (the #484 lesson: a history/route claim must be proven by actually
// mounting a router and exercising it, never by a pure helper alone).
//
// PracticePage itself is STUBBED here — mounting the real one drags in Firebase/data/auth and
// is not what this test is proving. What it proves is the HOST contract:
//   1. the seed URL resolves to byte-identical route params (grade/subject) + search params
//      (topic / source=tutor / count / backLabel) — i.e. the page sees a real tutor→QP visit;
//   2. the overlay prop reaches the page;
//   3. open=false renders nothing;
//   4. the nav-guard closes the panel on an in-panel navigation AWAY from the practice route
//      (the worksheet-CTA / empty-state-link analogue), but NOT on a search-only change (a
//      rebuild/filter keeps the pathname), so it never fights PracticePage's own setSearchParams.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

// The stub: expose the resolved route/search params + buttons that fire the two navigation
// shapes we care about (a stray path change, and a search-only change).
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
        <button data-testid="stray-nav" onClick={() => navigate("/practice/worksheets")}>
          stray path nav
        </button>
        <button data-testid="stray-search" onClick={() => navigate({ search: "?built=1" })}>
          search-only nav
        </button>
      </div>
    );
  },
}));

import TutorQuickPracticeOverlay from "./TutorQuickPracticeOverlay";
import { buildQuickPracticeRoundTripHref } from "./tutorRoundTrip";

const seedUrl = buildQuickPracticeRoundTripHref({
  returnTo: "/tutor/10/science/carbon-and-its-compounds",
  subject: "science",
  topicKey: "carbon-and-its-compounds",
  concept: "nomenclature",
  backLabel: "Back to your tutor",
  count: 5,
});

afterEach(cleanup);

describe("TutorQuickPracticeOverlay — the nested-MemoryRouter host (novel prod pattern)", () => {
  it("seeds the router so PracticePage sees a real tutor→QP visit (params byte-identical)", () => {
    render(<TutorQuickPracticeOverlay open onClose={() => {}} seedUrl={seedUrl} />);
    // useParams resolves off /practice/:grade/:subject — the SAME the navigate leg produced.
    expect(screen.getByTestId("grade").textContent).toBe("10");
    expect(screen.getByTestId("subject").textContent).toBe("Science");
    // useSearchParams resolves the round-trip query — source=tutor is what makes PracticePage
    // arrivedTargeted (auto-build, chooser skipped); count + backLabel ride along.
    expect(screen.getByTestId("topic").textContent).toBe("carbon-and-its-compounds");
    expect(screen.getByTestId("source").textContent).toBe("tutor");
    expect(screen.getByTestId("count").textContent).toBe("5");
    expect(screen.getByTestId("backLabel").textContent).toBe("Back to your tutor");
    // the overlay prop reaches the page (overlay-mode chrome path).
    expect(screen.getByTestId("overlay-present").textContent).toBe("yes");
  });

  it("renders nothing when closed (open=false → null)", () => {
    render(<TutorQuickPracticeOverlay open={false} onClose={() => {}} seedUrl={seedUrl} />);
    expect(screen.queryByTestId("grade")).toBeNull();
  });

  it("nav-guard: closes the overlay on an in-panel navigation AWAY from the practice route", async () => {
    const onClose = vi.fn();
    render(<TutorQuickPracticeOverlay open onClose={onClose} seedUrl={seedUrl} />);
    fireEvent.click(screen.getByTestId("stray-nav")); // navigate("/practice/worksheets")
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("nav-guard: does NOT close on a search-only change (a rebuild/filter keeps the pathname)", async () => {
    const onClose = vi.fn();
    render(<TutorQuickPracticeOverlay open onClose={onClose} seedUrl={seedUrl} />);
    fireEvent.click(screen.getByTestId("stray-search")); // navigate({ search: "?built=1" })
    await new Promise((r) => setTimeout(r, 50)); // let any effect flush
    expect(onClose).not.toHaveBeenCalled();
  });
});
