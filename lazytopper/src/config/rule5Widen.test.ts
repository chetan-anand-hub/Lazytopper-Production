// @vitest-environment node
//
// RULE5-WIDEN-1 (cofounder D68a/b/c). Rule 5 ("this question needs a figure the page must supply") missed rows whose wording
// is "in the GIVEN figure" / "circuits ... are shown below", and rows whose wording says nothing at all. The widening TIGHTENS
// publishing (those rows leave Worksheets / Chapter Tests / Full Mocks and the public SEO pages until a figure is bound);
// it never loosens it. Each named row below was served with no figure before this lane (RED on trunk).
import { describe, expect, it } from "vitest";
import "../test/preloadBankChapters";
import {
  DEMANDS_SUPPLIED_FIGURE,
  FIGURE_DEPENDENT_BY_REVIEW,
  defaultHasBoundFigure,
  demandsFigureForRow,
  demandsSuppliedFigure,
  isPublishable,
} from "../../scripts/seo/publishability";
import { needsMissingFigure } from "../lib/figureSafe";
import { getBankRowsForSubject } from "../data/bankChapters/loader";
import type { CanonicalQuestion } from "../data/predictionTypes";

const BANK: CanonicalQuestion[] = [...getBankRowsForSubject("Maths"), ...getBankRowsForSubject("Science")];
const BY_ID = new Map(BANK.map((q) => [q.id, q]));
const text = (q: CanonicalQuestion) => `${q.questionText}\n${q.answer ?? ""}`;

/** The four misses the D66b census found: each is served, has no figure bound, and its stem depends on one. */
const NAMED_MISSES = {
  "SCO-S-LIGHT-005": "pattern 6 - 'In the given figure, a ray of light ...'",
  "SCO-S-ELEC-013": "pattern 6 - 'shown in the given figure' (the current-time graph)",
  "SCQ-S-ELEC-041": "pattern 7 - 'Two electric circuits I and II are shown below'",
  "APQ-M-CIRC-012": "reviewed id - P and Q exist only in the figure; no phrase says so",
} as const;
const NAMED_IDS = Object.keys(NAMED_MISSES);

describe("RULE5-WIDEN-1 — the named misses are now held back (each was RED before)", () => {
  it.each(NAMED_IDS)("%s demands a figure, has none bound, and is held on the paper surfaces and the SEO gate", (id) => {
    const q = BY_ID.get(id);
    expect(q, `${id} must be a served bank row`).toBeDefined();
    expect(defaultHasBoundFigure(id), `${id}: premise - no figure bound yet`).toBe(false);
    expect(demandsFigureForRow(id, text(q!))).toBe(true);
    expect(needsMissingFigure(q!)).toBe(true);
    // The SEO gate: give the row a clean one-step scheme so Rules 1-3 pass; then ONLY the figure rule can reject it.
    const marked = { ...q!, solutionSteps: [`[${q!.marks} marks] Work it out.`] };
    const verdict = isPublishable(marked, new Set<string>());
    expect(verdict.ok).toBe(false);
    expect((verdict as { reason: string }).reason).toBe("requires-absent-figure");
    // CONTROL: the same row with a figure bound is publishable again (the escape is the binder, not the wording).
    expect(isPublishable(marked, new Set<string>(), { hasBoundFigure: () => true }).ok).toBe(true);
  });

  it("the text rule alone catches three of them; the fourth is held by a reviewed id (no phrase exists)", () => {
    const byText = NAMED_IDS.filter((id) => demandsSuppliedFigure(text(BY_ID.get(id)!)));
    expect(byText.sort()).toEqual(["SCO-S-ELEC-013", "SCO-S-LIGHT-005", "SCQ-S-ELEC-041"]);
    expect(Object.keys(FIGURE_DEPENDENT_BY_REVIEW)).toContain("APQ-M-CIRC-012");
  });

  it("every reviewed id carries a dated reason and is a served bank row with no bound figure", () => {
    for (const [id, why] of Object.entries(FIGURE_DEPENDENT_BY_REVIEW)) {
      expect(why, id).toMatch(/^\d{4}-\d{2}-\d{2} B\/D68[bc]: .{20,}/);
      expect(BY_ID.has(id), `${id} must be a served row`).toBe(true);
      expect(defaultHasBoundFigure(id), `${id}: once a figure is bound the entry is redundant`).toBe(false);
    }
  });
});

describe("RULE5-WIDEN-1 — the widening is narrow: wording that is NOT a dependency stays publishable (controls)", () => {
  it.each([
    "Draw a ray diagram to show the image formed by a concave mirror.",
    "From the circuit described above, calculate the reading of the ammeter.",
    "A student draws a graph of V against I and finds the slope. What does it represent?",
    "The given circuit is replaced by an equivalent resistance of 5 ohm. Find the current.",
    "Use the following data to find the median: 10, 20, 30.",
  ])("does not flag: %s", (stem) => {
    expect(demandsSuppliedFigure(stem)).toBe(false);
  });

  it.each([
    ["In the given figure, a ray of light is incident on a plane mirror.", 6],
    ["In the following diagram, find x.", 6],
    ["As shown in the given graph, the current rises.", 6],
    ["Two electric circuits I and II are shown below. Which has more resistance?", 7],
  ])("flags: %s", (stem, pattern) => {
    expect(demandsSuppliedFigure(stem)).toBe(true);
    // the new pattern (array index 6 = pattern 6, index 7 = pattern 7) is what fires, not an older one
    const sole = DEMANDS_SUPPLIED_FIGURE.map((rx, i) => (rx.test(stem) ? i : -1)).filter((i) => i >= 0);
    expect(sole).toContain(pattern);
  });

  it("every other served row that the widening newly flags already has a bound figure, so nothing else leaves a surface", () => {
    const newlyFlagged = BANK.filter((q) => demandsSuppliedFigure(text(q)) && !DEMANDS_SUPPLIED_FIGURE.slice(0, 6).some((rx) => rx.test(text(q))));
    const unbound = newlyFlagged.filter((q) => !defaultHasBoundFigure(q.id) && !NAMED_IDS.includes(q.id)).map((q) => q.id);
    expect(unbound).toEqual([]);
  });
});
