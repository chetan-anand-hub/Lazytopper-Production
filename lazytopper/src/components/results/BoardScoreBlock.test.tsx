// TS-BOARDSCORE-1 - the board view block renders exactly the view it is given (score line, chips oldest -> newest with the
// latest marked, change line, estimate + small print, or the one-more-test hint) and nothing it is not given.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import BoardScoreBlock from "./BoardScoreBlock";
import { buildBoardScoreView } from "../../lib/fullmock/boardEstimate";

const scores = (xs: number[]) => xs.map((score, i) => ({ id: `FM-M-0${i + 1}`, score, gradedAt: i + 1 }));
const viewOf = (xs: number[]) =>
  buildBoardScoreView({ paper: { awarded: xs[xs.length - 1], total: 80, pendingCount: 0 }, scores: scores(xs) })!;

afterEach(cleanup);

describe("BoardScoreBlock", () => {
  it("2+ tests: line, chips (latest marked), change, estimate and its small print", () => {
    render(<BoardScoreBlock view={viewOf([52, 58, 61])} />);
    expect(screen.getByText("You scored 61 / 80 on a full CBSE-pattern paper.")).toBeTruthy();
    const chips = screen.getAllByRole("listitem");
    expect(chips.map((c) => c.textContent)).toEqual(["52", "58", "61"]);
    expect(chips[2].getAttribute("aria-current")).toBe("true");
    expect(chips[0].getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("Up 9 since your first full test")).toBeTruthy();
    expect(screen.getByText(/^Board estimate \(theory\): \d+–\d+ \/ 80$/)).toBeTruthy();
    expect(screen.getByText(/An estimate, not a promise/)).toBeTruthy();
    expect(screen.queryByText(/Take one more full test/)).toBeNull();
  });

  it("1 test: the line and the honest hint only - no chart, no estimate", () => {
    render(<BoardScoreBlock view={viewOf([52])} />);
    expect(screen.getByText("You scored 52 / 80 on a full CBSE-pattern paper.")).toBeTruthy();
    expect(screen.getByText("Take one more full test to see your board estimate.")).toBeTruthy();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByText(/Board estimate \(theory\)/)).toBeNull();
  });

  it("no inline styles", () => {
    const { container } = render(<BoardScoreBlock view={viewOf([52, 58])} />);
    expect(container.querySelectorAll("[style]")).toHaveLength(0);
  });
});
