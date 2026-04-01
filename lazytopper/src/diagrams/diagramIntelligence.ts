import type { DiagramSpec } from "../tutor/diagram/diagramTypes";

export type LazytopperDiagramType =
  | "geometry_triangle"
  | "geometry_right_triangle"
  | "geometry_parallel_lines"
  | "geometry_similarity"
  | "heights_distance"
  | "ray_optics"
  | "biology_process"
  | "circuit_basic";

export type LazytopperDiagramIntent =
  | "explain"
  | "solve"
  | "revise"
  | "visualize_question"
  | "mentor_support";

export type DiagramVisualPriority = "low" | "medium" | "high";

// Reusable runtime block for chapter content and mentor responses.
// V1 is geometry-first, but the type surface leaves room for light/ray,
// biology-process, and simple circuit diagrams without forcing fake support now.
export interface LazytopperDiagramBlock {
  version: 1;
  diagramType: LazytopperDiagramType;
  diagramIntent: LazytopperDiagramIntent;
  title?: string;
  caption?: string;
  accessibilityLabel: string;
  diagramRequired?: boolean;
  conceptNeedsFigure?: boolean;
  recommendedDiagramType?: LazytopperDiagramType;
  visualPriority?: DiagramVisualPriority;
  spec: DiagramSpec;
}

type CreateDiagramBlockInput = Omit<LazytopperDiagramBlock, "version">;

export function createDiagramBlock(
  input: CreateDiagramBlockInput
): LazytopperDiagramBlock {
  return {
    version: 1,
    diagramRequired: true,
    conceptNeedsFigure: true,
    visualPriority: "medium",
    recommendedDiagramType: input.diagramType,
    ...input,
  };
}
