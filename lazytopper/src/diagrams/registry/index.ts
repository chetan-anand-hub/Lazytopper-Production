/**
 * Computed-figure registry (DIAGRAMS-1 PR-2): question id -> figures drawn from that
 * question's own numbers. Lookup is by exact id; an unbound id returns [] (the honest
 * empty state — no placeholder, no lookalike).
 */
import { buildHeightsDistances } from "../builders/heightsDistances";
import type { BuildResult, HdModel } from "../builders/heightsDistances";
import type { ComputedFigureBinding, FigureSlot } from "./computedFigureTypes";
import { TRIGONOMETRY_SOLUTION_FIGURES } from "./trigonometrySolutionFigures";

export const ALL_COMPUTED_FIGURE_BINDINGS: readonly ComputedFigureBinding[] = [...TRIGONOMETRY_SOLUTION_FIGURES];

const BY_ID = new Map<string, ComputedFigureBinding[]>();
for (const b of ALL_COMPUTED_FIGURE_BINDINGS) {
  const list = BY_ID.get(b.questionId) ?? [];
  list.push(b);
  BY_ID.set(b.questionId, list);
}

export function getComputedFigures(questionId: string, slot: FigureSlot = "solution"): ComputedFigureBinding[] {
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
