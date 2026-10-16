/**
 * FOLLOWUPS-1 A2 [FU-LT-SH-CLASS-CLASH] — the Start-here card's injected CSS used the `.lt-sh`
 * prefix, which is ALSO SurfaceHistory's root class. On a page that shows both (a zero-graded
 * student on Practice Hub) the past-sessions panel would pick up the card's navy gradient.
 * The card now uses its own `.lt-shc` prefix; SurfaceHistory is untouched.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const h = vi.hoisted(() => ({
  cloudHas: vi.fn(),
  localRows: vi.fn(),
}));
vi.mock("../../services/sessionRecords", () => ({
  cloudHasAnySessionRecord: h.cloudHas,
  loadLocalSessionRecords: h.localRows,
  getSessionRecordsFromCloud: vi.fn(async () => []),
}));
vi.mock("../../services/progressStore", () => ({
  getSurfaceHistory: () => [],
  getSubjectProgress: () => null,
}));
vi.mock("../../services/worksheetSessionStore", () => ({
  getWorksheetSession: () => null,
  getWorksheetGrade: () => null,
}));
vi.mock("../worksheet/worksheetPdfExport", () => ({ exportGradedWorksheetPdf: vi.fn() }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: vi.fn() }));
vi.mock("./startHereBank", () => ({ startHereAvailability: vi.fn(), pickStartHereSet: vi.fn() }));
vi.mock("./startHereAvailability.generated", () => ({
  START_HERE_AVAILABILITY: { Maths: { "real-numbers": { mcq: 20, ar: 0 } }, Science: {} },
}));
vi.mock("../../services/firebaseClient", () => ({ authClient: { currentUser: null } }));

import StartHereCard from "./StartHereCard";
import SurfaceHistory from "../results/SurfaceHistory";

/** Every plain style rule in the document whose selector matches `el`. */
function rulesMatching(el: Element): CSSStyleRule[] {
  const out: CSSStyleRule[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      const r = rule as CSSStyleRule;
      if (typeof r.selectorText !== "string") continue;
      let hit = false;
      try {
        hit = el.matches(r.selectorText);
      } catch {
        hit = false;
      }
      if (hit) out.push(r);
    }
  }
  return out;
}

beforeEach(() => {
  window.sessionStorage.clear();
  h.cloudHas.mockReset().mockResolvedValue(false);
  h.localRows.mockReset().mockReturnValue([]);
});
afterEach(cleanup);

describe("FOLLOWUPS-1 A2 · Start-here card + SurfaceHistory on one page", () => {
  it("the past-sessions panel gets no navy background and no Start-here class", async () => {
    render(
      <MemoryRouter initialEntries={["/practice-hub"]}>
        <StartHereCard uid="u1" surface="practice_hub" returnTo="/practice-hub" />
        <SurfaceHistory surface="worksheet" uid="u1" />
      </MemoryRouter>,
    );
    const card = await waitFor(() => {
      const c = screen.queryByTestId("start-here-card");
      expect(c).not.toBeNull();
      return c!;
    });
    expect(card.classList.contains("lt-shc")).toBe(true);
    expect(card.classList.contains("lt-sh")).toBe(false);

    const history = document.querySelector("section.lt-sh");
    expect(history).not.toBeNull();
    expect(Array.from(history!.classList).some((c) => c.startsWith("lt-shc"))).toBe(false);

    // Both components' injected <style> sheets are live in the document; none of the rules
    // that reach the history root may paint the card's navy gradient.
    const styles = Array.from(document.querySelectorAll("style")).map((s) => s.textContent ?? "");
    expect(styles.some((t) => t.includes(".lt-shc {"))).toBe(true);
    const hits = rulesMatching(history!);
    expect(hits.length).toBeGreaterThan(0); // SurfaceHistory's own `.lt-sh` rule
    for (const r of hits) {
      expect(r.cssText).not.toContain("linear-gradient");
      expect(r.cssText).not.toContain("hsl(222");
    }
    expect(getComputedStyle(history!).backgroundImage || "").not.toContain("linear-gradient");
  });
});
