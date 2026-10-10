import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import ResultsScorecard from "./ResultsScorecard";
import { quickPracticeScorecardVariant } from "./scorecardVariants";

/**
 * SCORECARD-MOBILE-1 (DECISION 30c) — the scorecard is anchored to the VIEWPORT, not to
 * whatever it is rendered inside.
 *
 * At 390 px the page wrapper (`.animate-float-up`) keeps a computed `transform` from its
 * entry animation. A transformed ancestor is the containing block for `position: fixed`
 * descendants, so the "fixed" dim was laid out against a ~3,600 px wrapper and the sheet
 * sat far below the screen. Rendering through a portal on `document.body` takes the dialog
 * out of every ancestor, so no page-level transform can capture it.
 */
const noop = () => {};
const variant = () =>
  quickPracticeScorecardVariant({
    attempted: 2,
    totalInSet: 5,
    mcqAnswered: 2,
    mcqCorrect: 1,
    allDone: false,
    mcqMarksAwarded: 1,
    mcqMarksTotal: 2,
    onReviewSet: noop,
    onFreshSet: noop,
    onChapterTest: noop,
    onPredicted: noop,
    onStudy: noop,
  });

afterEach(cleanup);

describe("ResultsScorecard — anchored to the viewport (SCORECARD-MOBILE-1)", () => {
  it("renders its dialog on document.body, outside a transformed page wrapper", () => {
    render(
      <div data-testid="wrapper" className="animate-float-up" style={{ transform: "matrix(1, 0, 0, 1, 0, 0)" }}>
        <ResultsScorecard variant={variant()} onClose={noop} />
      </div>,
    );
    const dialog = screen.getByRole("dialog");
    expect(screen.getByTestId("wrapper").contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it("still closes from its own controls and leaves nothing behind on unmount", () => {
    let closed = 0;
    const { unmount } = render(<ResultsScorecard variant={variant()} onClose={() => (closed += 1)} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(closed).toBe(1);
    unmount();
    expect(document.body.querySelector(".lt-sc__dim")).toBeNull();
  });
});
