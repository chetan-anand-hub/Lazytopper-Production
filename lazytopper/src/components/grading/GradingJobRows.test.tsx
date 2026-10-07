/**
 * GRADING-JOBS-1 J2 — rows land one by one (contract v1.0 §4): a `final: true` row is a mark, a
 * `final: false` row is PROVISIONAL and shows NO mark; an interruption (§6) keeps the marked rows
 * and offers "Grade the remaining N".
 *
 * MUTATION M2 (render final:false as marks) turns "a provisional row shows no mark" RED.
 *
 * Scoped run:
 *   pnpm exec vitest run src/components/grading/GradingJobRows.test.tsx
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import GradingJobRows from "./GradingJobRows";
import { GradingJobInterruptedError, type GradingJobRow } from "../../ai/gradingJobs";

afterEach(cleanup);

const row = (index: number, final: boolean, marksAwarded: number, extra: Partial<GradingJobRow> = {}): GradingJobRow =>
  ({
    index,
    final,
    qNumber: index + 1,
    totalMarks: 3,
    marksAwarded,
    percentage: 0,
    couldNotRead: false,
    annotatedSteps: [],
    ...extra,
  }) as GradingJobRow;

describe("GradingJobRows — provisional vs final", () => {
  it("renders nothing with no job", () => {
    const { container } = render(<GradingJobRows />);
    expect(container.textContent).toBe("");
  });

  it("a final row shows its mark; a provisional row shows NO mark, labelled Provisional", () => {
    render(
      <GradingJobRows
        progress={{ state: "running", total: 3, done: 2, rows: [row(0, true, 2), row(1, false, 1)] }}
      />,
    );
    expect(screen.getByText("Marked 2 of 3")).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toContain("2 / 3");
    expect(items[0].getAttribute("data-final")).toBe("true");
    expect(items[1].getAttribute("data-final")).toBe("false");
    expect(items[1].textContent).toContain("Provisional");
    expect(items[1].textContent).not.toContain("1 / 3"); // M2
    expect(items[1].textContent).toContain("still checking");
  });

  it("a final not-graded row shows its honest reason, never a 0", () => {
    render(
      <GradingJobRows
        progress={{ state: "running", total: 1, done: 1, rows: [row(0, true, 0, { notGraded: "timeout", couldNotRead: true })] }}
      />,
    );
    const item = screen.getByRole("listitem");
    expect(item.textContent).not.toContain("0 / 3");
    expect(item.textContent).toContain("We couldn't grade this question this time");
  });
});

describe("GradingJobRows — interrupted (§6)", () => {
  const interrupted = () =>
    new GradingJobInterruptedError(
      [row(0, true, 3), row(1, true, 0, { notGraded: "interrupted" as never, couldNotRead: true }), row(2, true, 0, { notGraded: "interrupted" as never, couldNotRead: true })],
      "ws-1",
    );

  it("keeps the marked rows and offers 'Grade the remaining 2 questions'", () => {
    const onGradeRemaining = vi.fn();
    render(<GradingJobRows interrupted={interrupted()} onGradeRemaining={onGradeRemaining} />);
    expect(screen.getByText("The check was interrupted")).toBeTruthy();
    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toContain("3 / 3");
    expect(items[1].textContent).toContain("Not graded — the check was interrupted");
    fireEvent.click(screen.getByRole("button", { name: "Grade the remaining 2 questions" }));
    expect(onGradeRemaining).toHaveBeenCalledTimes(1);
  });

  it("without the document (after a reload) it says how to grade the rest — no dead button", () => {
    render(<GradingJobRows interrupted={interrupted()} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Upload your answers again to grade the remaining 2.")).toBeTruthy();
  });
});
