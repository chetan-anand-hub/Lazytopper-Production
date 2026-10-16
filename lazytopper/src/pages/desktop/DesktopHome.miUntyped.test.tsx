// @vitest-environment jsdom
/**
 * MI-COPY (owner ask, 16 Oct 2026) — Home's Mistake Intelligence card explains its empty tiles.
 *
 * A student whose lost marks all come from tap-the-answer MCQs saw four type tiles all "—" and
 * asked "are these by design? when do they get populated?". With lost marks and NO typed marks
 * the card now says, once, why the tiles are empty (an MCQ pick records the option, not a
 * reason) and the existing "Check a written answer" link is the action; the tiles get a muted
 * dashed style and a tooltip with the same meaning. Typed marks and the no-data state render as
 * before. Display only — no number here is derived differently.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: null, loading: false, mistakeLogsHydrated: 0 }),
}));

import { MistakeIntelligenceCard, HOME_MI_UNTYPED_NOTE, HOME_MI_UNTYPED_TILE_TITLE } from "./DesktopHome";
import { UNTYPED_MARKS_WHY } from "../../lib/mistakeDisplay";
import type { MeHomeSummary } from "../../services/meHomeSummary";

const base: MeHomeSummary = {
  paper: "Maths",
  split: null,
  lost: 7,
  typeMarks: null,
  hasTyped: false,
  topChapter: null,
  concepts: [],
};

const renderCard = (summary: MeHomeSummary | null) =>
  render(
    <MemoryRouter>
      <MistakeIntelligenceCard summary={summary} />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("MI-COPY — Home MI card, lost marks with no mistake type (MCQ-only)", () => {
  it("★ one explanatory line under the tiles, carrying the shared tap-the-answer sentence", () => {
    renderCard(base);
    const note = screen.getByTestId("home-mi-untyped-note");
    expect(note.textContent).toContain(HOME_MI_UNTYPED_NOTE);
    expect(HOME_MI_UNTYPED_NOTE).toContain(UNTYPED_MARKS_WHY);
    expect(HOME_MI_UNTYPED_NOTE).toMatch(/^These fill in when you check a written answer\./);
    expect(screen.getAllByTestId("home-mi-untyped-note")).toHaveLength(1);
  });

  it("★ the existing 'Check a written answer' link is the action, inside that line", () => {
    renderCard(base);
    const line = screen.getByTestId("home-mi-why");
    const link = screen.getByTestId("home-mi-check");
    expect(line.contains(screen.getByTestId("home-mi-untyped-note"))).toBe(true);
    expect(line.contains(link)).toBe(true);
    expect(link.getAttribute("href")).toMatch(/^\/check-improve/);
    expect(link.textContent).toBe("Check a written answer to see why you lose them");
  });

  it("★ each tile is marked empty (muted, dashed) with a tooltip saying why", () => {
    renderCard(base);
    const tiles = screen.getAllByTestId("home-mi-bucket");
    expect(tiles).toHaveLength(4);
    for (const t of tiles) {
      expect(t.getAttribute("data-empty")).toBe("true");
      expect(t.getAttribute("title")).toBe(HOME_MI_UNTYPED_TILE_TITLE);
      expect(t.style.borderStyle).toBe("dashed");
      expect(t.querySelector(".lt-n")!.textContent).toBe("—");
    }
    expect(HOME_MI_UNTYPED_TILE_TITLE).toContain(UNTYPED_MARKS_WHY);
  });
});

describe("MI-COPY — CONTROLS: typed marks and the no-data state are unchanged", () => {
  it("typed marks: tiles show values, no note, no empty marking, no tooltip", () => {
    renderCard({
      ...base,
      hasTyped: true,
      typeMarks: { conceptual: 4, calculation: 2, silly: 1, presentation: 0 },
    });
    expect(screen.queryByTestId("home-mi-untyped-note")).toBeNull();
    expect(screen.queryByTestId("home-mi-check")).toBeNull();
    for (const t of screen.getAllByTestId("home-mi-bucket")) {
      expect(t.getAttribute("data-empty")).toBeNull();
      expect(t.getAttribute("title")).toBeNull();
    }
    const concept = screen.getAllByTestId("home-mi-bucket").find((t) => t.getAttribute("data-type") === "conceptual")!;
    expect(concept.querySelector(".lt-n")!.textContent).toBe("4");
  });

  it("no lost marks (no data): no note, tiles not marked empty — the first-set prompt as before", () => {
    renderCard(null);
    expect(screen.queryByTestId("home-mi-untyped-note")).toBeNull();
    for (const t of screen.getAllByTestId("home-mi-bucket")) {
      expect(t.getAttribute("data-empty")).toBeNull();
    }
    expect(screen.getByText("Practise a set to see your mistakes.")).toBeTruthy();
  });

  it("typed but split withheld (typeMarks null, hasTyped true): no note", () => {
    renderCard({ ...base, hasTyped: true, typeMarks: null });
    expect(screen.queryByTestId("home-mi-untyped-note")).toBeNull();
  });
});
