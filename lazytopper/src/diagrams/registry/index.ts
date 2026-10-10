/**
 * Solution-figure registry (DIAGRAMS-1 PR-2): question id -> figures for that
 * question's solution. Two kinds: COMPUTED (drawn from the question's own numbers)
 * and CROP (an official raster crop of the question's own figure). Lookup is by exact
 * id; an unbound id returns [] (the honest empty state — no placeholder, no lookalike).
 */
import { buildHeightsDistances } from "../builders/heightsDistances";
import { buildCircle } from "../builders/circleTangents";
import { buildBpt } from "../builders/triangleBpt";
import { buildCoordinatePlot } from "../builders/coordinatePlot";
import { buildSector } from "../builders/circleSector";
import type { FigureSpec } from "../figureSpec";
import { buildOptics } from "../builders/optics";
import type { ComputedFigureBinding, CropFigureBinding, FigureSlot, SolutionFigureBinding } from "./computedFigureTypes";
import { SOLUTION_FIGURE_CROPS } from "./solutionFigureCrops";
import { LIGHT_SOLUTION_FIGURES } from "./lightSolutionFigures";
import { TRIGONOMETRY_SOLUTION_FIGURES } from "./trigonometrySolutionFigures";
import { CIRCLES_SOLUTION_FIGURES } from "./circlesSolutionFigures";
import { TRIANGLES_SOLUTION_FIGURES } from "./trianglesSolutionFigures";
import { COORDINATE_GEOMETRY_SOLUTION_FIGURES } from "./coordinateGeometrySolutionFigures";
import { AREAS_RELATED_TO_CIRCLES_SOLUTION_FIGURES } from "./areasRelatedToCirclesSolutionFigures";

export const ALL_COMPUTED_FIGURE_BINDINGS: readonly ComputedFigureBinding[] = [
  ...TRIGONOMETRY_SOLUTION_FIGURES,
  ...CIRCLES_SOLUTION_FIGURES,
  ...TRIANGLES_SOLUTION_FIGURES,
  ...COORDINATE_GEOMETRY_SOLUTION_FIGURES,
  ...AREAS_RELATED_TO_CIRCLES_SOLUTION_FIGURES,
  ...LIGHT_SOLUTION_FIGURES,
];
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
export function buildComputedFigure(b: ComputedFigureBinding): { spec: FigureSpec; model: Record<string, number> } | null {
  switch (b.builder) {
    case "heightsDistances":
      return buildHeightsDistances(b.params, b.labels ?? {});
    case "circleTangents":
      return buildCircle(b.params, b.labels ?? {}, b.draw ?? {});
    case "triangleBpt":
      return buildBpt(b.params, b.labels ?? {});
    case "coordinatePlot":
      return buildCoordinatePlot(b.params, b.labels ?? {}, b.draw ?? {});
    case "circleSector":
      return buildSector(b.params, b.labels ?? {}, b.draw ?? {});
    case "opticsImage":
    case "opticsCase":
      return buildOptics(b.params);
    default:
      return null;
  }
}
