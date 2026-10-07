/**
 * Solution-figure registry (DIAGRAMS-1 PR-2): question id -> figures for that
 * question's solution. Two kinds: COMPUTED (drawn from the question's own numbers)
 * and CROP (an official raster crop of the question's own figure). Lookup is by exact
 * id; an unbound id returns [] (the honest empty state — no placeholder, no lookalike).
 */
import { buildHeightsDistances } from "../builders/heightsDistances";
import type { BuildResult, HdModel } from "../builders/heightsDistances";
import type { ComputedFigureBinding, CropFigureBinding, FigureSlot, SolutionFigureBinding } from "./computedFigureTypes";
import { SOLUTION_FIGURE_CROPS } from "./solutionFigureCrops";
import { TRIGONOMETRY_SOLUTION_FIGURES } from "./trigonometrySolutionFigures";

export const ALL_COMPUTED_FIGURE_BINDINGS: readonly ComputedFigureBinding[] = [...TRIGONOMETRY_SOLUTION_FIGURES];
export const ALL_CROP_FIGURE_BINDINGS: readonly CropFigureBinding[] = [...SOLUTION_FIGURE_CROPS];
export const ALL_SOLUTION_FIGURE_BINDINGS: readonly SolutionFigureBinding[] = [
  ...ALL_COMPUTED_FIGURE_BINDINGS,
  ...ALL_CROP_FIGURE_BINDINGS,
];

const BY_ID = new Map<string, SolutionFigureBinding[]>();
for (const b of ALL_SOLUTION_FIGURE_BINDINGS) {
  const list = BY_ID.get(b.questionId) ?? [];
  list.push(b);
  BY_ID.set(b.questionId, list);
}

export function getSolutionFigures(questionId: string, slot: FigureSlot = "solution"): SolutionFigureBinding[] {
  return (BY_ID.get(questionId) ?? []).filter((b) => b.slot === slot);
}

/** Build one binding's figure, or null when the builder refuses. */
export function buildComputedFigure(b: ComputedFigureBinding): BuildResult<HdModel> | null {
  switch (b.builder) {
    case "heightsDistances":
      return buildHeightsDistances(b.params, b.labels ?? {});
    default:
      return null;
  }
}
