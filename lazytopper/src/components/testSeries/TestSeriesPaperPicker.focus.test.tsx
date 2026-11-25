/**
 * TS-THEMES-1 - the "Focus sets" segment on the /test-series picker: a third segment (only when the page passes focus sets), a
 * "Bonus" line, theme + set selects (marks / minutes from the pins chunk), ONE Start link to the set's Full Mock URL. Without
 * focus sets (the kill switch) the picker is exactly today's two segments.
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TestSeriesPaperPicker from "./TestSeriesPaperPicker";
import { seriesChapterTests, seriesFullMocks, seriesMockRounds } from "../../lib/testSeries/testSeries";
import { focusSetCount, focusSetProgress, focusSetWorksheetId, focusSets } from "../../lib/testSeries/focusSets";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear(); // TS-NAV-2: the picker remembers its choice per tab session - each test starts fresh
});

function mount(withFocus: boolean, focusProgress: ReturnType<typeof focusSetProgress> | null = null) {
  render(
    <MemoryRouter>
      <TestSeriesPaperPicker
        chapters={seriesChapterTests()}
        mocks={seriesFullMocks()}
        rounds={seriesMockRounds()}
        progress={null}
        mocksPerSubject={25}
        {...(withFocus ? { focusSets: focusSets(), focusProgress, focusCount: focusSetCount() } : {})}
      />
    </MemoryRouter>,
  );
}
const sel = (id: string) => screen.getByTestId(id) as HTMLSelectElement;

describe("TS-THEMES-1 Focus sets segment", () => {
  it("without focus sets the picker keeps its two segments (kill switch / today)", () => {
    mount(false);
    const group = screen.getByTestId("ts-pick-type");
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Chapter tests", "Full-length"]);
    expect(screen.queryByTestId("ts-pick-type-focus")).toBeNull();
  });

  it("a third segment: bonus line, three Maths themes, five sets with marks and minutes, Start opens the set's URL", async () => {
    mount(true);
    const group = screen.getByTestId("ts-pick-type");
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Chapter tests", "Full-length", "Focus sets"]);
    fireEvent.click(screen.getByTestId("ts-pick-type-focus"));
    expect(screen.getByTestId("ts-pick-focus-bonus").textContent).toContain("Bonus");
    expect(screen.getByTestId("ts-pick-focus-bonus").textContent).toContain("30 focus sets");
    expect(within(sel("ts-pick-focus-theme")).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Long answers (5 marks)",
      "Case-based questions (4 marks)",
      "Tricky short answers",
    ]);
    await screen.findByText(/Set 1 · \d+ marks · \d+ min/);
    expect(within(sel("ts-pick-focus-set")).getAllByRole("option")).toHaveLength(5);
    const start = screen.getByTestId("ts-start");
    expect(start.getAttribute("href")).toBe("/full-mock/10/Maths?focus=FS-M-LA-1");
    expect(start.textContent).toContain("Start: Long answers (5 marks), set 1");
    fireEvent.change(sel("ts-pick-focus-theme"), { target: { value: "SA" } });
    fireEvent.change(sel("ts-pick-focus-set"), { target: { value: "3" } });
    expect(screen.getByTestId("ts-start").getAttribute("href")).toBe("/full-mock/10/Maths?focus=FS-M-SA-3");
    // The difficulty explainer belongs to the series papers, not to the focus sets.
    expect(screen.queryByTestId("ts-pick-diff-note")).toBeNull();
  });

  it("Science shows Numericals; signed-in status comes from the real progress only", () => {
    const sci = focusSets().find((f) => f.code === "FS-S-NU-2")!;
    const progress = focusSetProgress([
      { worksheetId: focusSetWorksheetId("fm-a-1", sci), surface: "full-mock", status: "graded", marksAwarded: 15, marksTotal: 21, gradedAt: 1 },
    ]);
    render(
      <MemoryRouter>
        <TestSeriesPaperPicker
          chapters={seriesChapterTests()}
          mocks={seriesFullMocks()}
          rounds={seriesMockRounds()}
          progress={{ byCode: {}, done: 0, total: 180, mockTrend: { Maths: [], Science: [] } }}
          mocksPerSubject={25}
          focusSets={focusSets()}
          focusProgress={progress}
          focusCount={30}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByTestId("ts-pick-subject-Science"));
    fireEvent.click(screen.getByTestId("ts-pick-type-focus"));
    expect(within(sel("ts-pick-focus-theme")).getAllByRole("option").map((o) => o.textContent)).toContain("Numericals");
    fireEvent.change(sel("ts-pick-focus-theme"), { target: { value: "NU" } });
    fireEvent.change(sel("ts-pick-focus-set"), { target: { value: "2" } });
    expect(screen.getByTestId("ts-start").getAttribute("data-status")).toBe("graded");
    expect(screen.getByTestId("ts-pick-state").textContent).toBe("graded 15 of 21");
    expect(screen.getByTestId("ts-pick-progress").textContent).toContain("1/15 done");
  });
});
