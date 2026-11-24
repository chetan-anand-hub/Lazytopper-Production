/** GRADE-PROGRESS-1 - the waiting panel: honest stages, calm rotation, reduced motion, kill switch. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import GradeProgressPanel, { GRADE_PROGRESS_LINES, GRADE_PROGRESS_ROTATE_MS, GRADE_PROGRESS_TYPICAL } from "./GradeProgressPanel";
import { gradeProgressDisabled } from "./gradeProgressFlag";

function mockMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: reduce && q.includes("reduce"),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

beforeEach(() => { vi.useFakeTimers(); mockMotion(false); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("GradeProgressPanel", () => {
  it("shows the true stage, the first description and the measured range - no percentage, no step count", () => {
    const { container } = render(<GradeProgressPanel />);
    expect(screen.getByTestId("grade-progress-read").textContent).toContain("Question read");
    expect(screen.getByTestId("grade-progress-line").textContent).toContain(GRADE_PROGRESS_LINES[0]);
    expect(container.textContent).toContain("Most answers are marked in 20–45 seconds.");
    expect(GRADE_PROGRESS_TYPICAL).toBe("Most answers are marked in 20–45 seconds.");
    expect(container.textContent).not.toMatch(/%|\bof \d\b|step \d/i);
    expect(container.textContent).not.toMatch(/scheme ready/i);
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("rotates calmly through the descriptions on a timer, then stays on the last", () => {
    render(<GradeProgressPanel />);
    const line = () => screen.getByTestId("grade-progress-line").textContent ?? "";
    act(() => { vi.advanceTimersByTime(GRADE_PROGRESS_ROTATE_MS); });
    expect(line()).toContain(GRADE_PROGRESS_LINES[1]);
    act(() => { vi.advanceTimersByTime(GRADE_PROGRESS_ROTATE_MS); });
    expect(line()).toContain(GRADE_PROGRESS_LINES[2]);
    act(() => { vi.advanceTimersByTime(GRADE_PROGRESS_ROTATE_MS * 5); });
    expect(line()).toContain(GRADE_PROGRESS_LINES[2]);
  });

  it("reduced motion: one static line, no rotation", () => {
    mockMotion(true);
    render(<GradeProgressPanel />);
    act(() => { vi.advanceTimersByTime(GRADE_PROGRESS_ROTATE_MS * 4); });
    expect(screen.getByTestId("grade-progress-line").textContent).toContain(GRADE_PROGRESS_LINES[0]);
  });

  it("keeps the existing 'taking longer' reassurance when the transport reports it", () => {
    render(<GradeProgressPanel slowLabel="Taking a little longer than usual — still checking…" />);
    expect(screen.getByTestId("grade-progress-slow").textContent).toContain("Taking a little longer than usual");
  });
});

describe("gradeProgressDisabled (kill switch)", () => {
  it.each([[undefined, false], ["", false], ["0", false], ["false", false], ["1", true], ["true", true]])("%s -> %s", (v, want) => {
    if (v !== undefined) vi.stubEnv("VITE_GRADE_PROGRESS_DISABLED", v);
    expect(gradeProgressDisabled()).toBe(want);
  });
});
