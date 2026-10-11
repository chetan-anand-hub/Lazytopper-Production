// @vitest-environment node
//
// RULE5-WIDEN-1 (cofounder D68a/b/c). Rule 5 ("this question needs a figure the page must supply") missed rows whose wording
// is "in the GIVEN figure" / "circuits ... are shown below". The widening TIGHTENS publishing (those rows leave Worksheets /
// Chapter Tests / Full Mocks and the public SEO pages until a figure is bound); it never loosens it.
//
// These rows are WITHHELD from the live bank by RULE5-BIND-1 (no allowed figure source), so every case here reads the RAW
// bank, which still holds them: the rule is a statement about wording, and must keep holding after the rows are withheld.
import { describe, expect, it } from "vitest";
import "../test/preloadBankChapters";
import {
  DEMANDS_SUPPLIED_FIGURE,
  defaultHasBoundFigure,
  demandsSuppliedFigure,
  isPublishable,
} from "../../scripts/seo/publishability";
import { needsMissingFigure } from "../lib/figureSafe";
import { RAW_CANONICAL_QUESTION_BANK, WITHHELD_QUESTION_IDS, canonicalQuestionBank } from "../data/canonicalQuestionBank";
import type { CanonicalQuestion } from "../data/predictionTypes";

const RAW: CanonicalQuestion[] = RAW_CANONICAL_QUESTION_BANK;
const BY_ID = new Map(RAW.map((q) => [q.id, q]));
const text = (q: CanonicalQuestion) => `${q.questionText}\n${q.answer ?? ""}`;

/** The three misses the D66b census found: each demanded a figure that no allowed source prints. */
const TEXT_MISSES = ["SCO-S-LIGHT-005", "SCO-S-ELEC-013", "SCQ-S-ELEC-041"] as const;

describe("RULE5-WIDEN-1 — the named misses are caught by wording (each was RED before the widening)", () => {
  it.each(TEXT_MISSES)("%s demands a figure, has none bound, and is held by the paper predicate and the SEO gate", (id) => {
    const q = BY_ID.get(id);
    expect(q, `${id} must exist in the raw bank`).toBeDefined();
    expect(defaultHasBoundFigure(id), `${id}: no allowed source, so nothing is bound`).toBe(false);
    expect(demandsSuppliedFigure(text(q!))).toBe(true);
    expect(needsMissingFigure(q!)).toBe(true);
    // The SEO gate: a clean one-step scheme passes Rules 1-3; then ONLY the figure rule can reject it.
    const marked = { ...q!, solutionSteps: [`[${q!.marks} marks] Work it out.`] };
    const verdict = isPublishable(marked, new Set<string>());
    expect(verdict.ok).toBe(false);
    expect((verdict as { reason: string }).reason).toBe("requires-absent-figure");
    // CONTROL: with a figure bound the same row publishes again (the escape is the binder, not the wording).
    expect(isPublishable(marked, new Set<string>(), { hasBoundFigure: () => true }).ok).toBe(true);
  });

  it("each is withheld from the live bank (RULE5-BIND-1): no allowed figure source exists", () => {
    for (const id of TEXT_MISSES) expect(WITHHELD_QUESTION_IDS.has(id), id).toBe(true);
  });

  it("APQ-M-CIRC-012 has NO phrase to catch ('Find the length of PQ'): it is served only because its official figure is now bound", () => {
    const q = BY_ID.get("APQ-M-CIRC-012")!;
    expect(demandsSuppliedFigure(text(q))).toBe(false); // wording cannot see this dependency, which is why the figure is bound
    expect(defaultHasBoundFigure("APQ-M-CIRC-012")).toBe(true);
    expect(WITHHELD_QUESTION_IDS.has("APQ-M-CIRC-012")).toBe(false);
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
    // array index 6 = pattern 6, index 7 = pattern 7: the NEW pattern is what fires, not an older one
    const fired = DEMANDS_SUPPLIED_FIGURE.map((rx, i) => (rx.test(stem) ? i : -1)).filter((i) => i >= 0);
    expect(fired).toContain(pattern);
  });

  it("every SERVED row the widening newly flags has a bound figure, so nothing else leaves a surface", () => {
    const newlyFlagged = (canonicalQuestionBank as CanonicalQuestion[]).filter((q) => demandsSuppliedFigure(text(q)) && !DEMANDS_SUPPLIED_FIGURE.slice(0, 6).some((rx) => rx.test(text(q))));
    const unbound = newlyFlagged.filter((q) => !defaultHasBoundFigure(q.id) && !(TEXT_MISSES as readonly string[]).includes(q.id)).map((q) => q.id);
    expect(unbound).toEqual([]);
  });
});
