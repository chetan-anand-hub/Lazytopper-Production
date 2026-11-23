/**
 * TS-DIFF-1 - the Easier / Standard / Harder chip, the full-length filter and the one-line explainer on the /test-series picker.
 * Uses the REAL committed paperDifficulty.json. The kill switch (VITE_TS_DIFFICULTY_DISABLED) restores today's picker exactly.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TestSeriesPaperPicker from "./TestSeriesPaperPicker";
import { seriesChapterTests, seriesFullMocks, seriesMockRounds } from "../../lib/testSeries/testSeries";
import { DIFFICULTY_EXPLAINER, type PaperDifficultyMap } from "../../lib/testSeries/paperDifficulty";
import difficultyJson from "../../lib/testSeries/paperDifficulty.json";

const MAP = difficultyJson as unknown as PaperDifficultyMap;

function mount() {
  const chapters = seriesChapterTests();
  const mocks = seriesFullMocks();
  render(
    <MemoryRouter>
      <TestSeriesPaperPicker chapters={chapters} mocks={mocks} rounds={seriesMockRounds()} progress={null} mocksPerSubject={25} />
    </MemoryRouter>,
  );
  return { chapters, mocks };
}
const pick = (id: string) => screen.getByTestId(id) as HTMLSelectElement;

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("TS-DIFF-1 picker", () => {
  it("full-length: filter All / Easier / Standard / Harder narrows the list, options carry the label, chip + explainer show", async () => {
    const { mocks } = mount();
    fireEvent.click(screen.getByTestId("ts-pick-type-full"));
    await screen.findByTestId("ts-pick-diff-filter");
    const group = screen.getByRole("group", { name: "Filter full-length papers by difficulty" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["All", "Easier", "Standard", "Harder"]);
    expect(screen.getByTestId("ts-pick-diff-all").getAttribute("aria-pressed")).toBe("true");
    const maths = mocks.filter((m) => m.subject === "Maths");
    expect(within(pick("ts-pick-full")).getAllByRole("option")).toHaveLength(maths.length);
    for (const label of ["Easier", "Standard", "Harder"] as const) {
      fireEvent.click(screen.getByTestId(`ts-pick-diff-${label}`));
      const expected = maths.filter((m) => MAP[`TS-${m.code}`].label === label);
      const opts = within(pick("ts-pick-full")).getAllByRole("option");
      expect(opts).toHaveLength(expected.length);
      expect(opts.every((o) => (o.textContent ?? "").includes(` · ${label}`))).toBe(true);
      // The selected paper's chip matches the filter.
      expect(screen.getByTestId("ts-pick-diff-chip").textContent).toBe(label);
      expect(screen.getByTestId("ts-pick-diff-chip").getAttribute("aria-label")).toBe(`Difficulty: ${label}`);
    }
    expect(screen.getByTestId("ts-pick-diff-note").textContent).toContain(DIFFICULTY_EXPLAINER);
    fireEvent.click(screen.getByTestId("ts-pick-diff-all"));
    expect(within(pick("ts-pick-full")).getAllByRole("option")).toHaveLength(maths.length);
  });

  it("chapter tests: only the extremes are named (no 'Standard' chip), the explainer still shows, no filter", async () => {
    const { chapters } = mount();
    await screen.findByTestId("ts-pick-diff-note");
    expect(screen.queryByTestId("ts-pick-diff-filter")).toBeNull();
    const first = chapters.filter((c) => c.subject === "Maths" && c.paper === 1);
    // Walk every Maths chapter: each paper option is named Easier/Harder exactly when the JSON says so, never "Standard".
    for (const c of first) {
      fireEvent.change(pick("ts-pick-chapter"), { target: { value: c.baseCode } });
      const group = chapters.filter((x) => x.baseCode === c.baseCode);
      const opts = within(pick("ts-pick-paper")).getAllByRole("option").map((o) => o.textContent ?? "");
      group.forEach((p, i) => {
        const l = MAP[`TS-${p.code}`].label;
        expect(opts[i].includes(" · Easier") || opts[i].includes(" · Harder"), `${p.code}`).toBe(l !== "Standard");
        expect(opts[i]).not.toContain("Standard");
      });
    }
  });

  it("kill switch VITE_TS_DIFFICULTY_DISABLED: no chip, no filter, no explainer, plain option text", async () => {
    vi.stubEnv("VITE_TS_DIFFICULTY_DISABLED", "1");
    mount();
    fireEvent.click(screen.getByTestId("ts-pick-type-full"));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByTestId("ts-pick-diff-filter")).toBeNull();
    expect(screen.queryByTestId("ts-pick-diff-note")).toBeNull();
    expect(within(pick("ts-pick-full")).getAllByRole("option")[0].textContent).toBe("Full-length 1");
  });

  it("the picker shows nothing difficulty-related before the labels load", () => {
    mount();
    expect(screen.queryByTestId("ts-pick-diff-note")).toBeNull();
    expect(screen.queryByTestId("ts-pick-diff-filter")).toBeNull();
    void waitFor;
  });
});
