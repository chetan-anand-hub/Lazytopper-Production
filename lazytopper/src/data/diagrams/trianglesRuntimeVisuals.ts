import type {
  DiagramVisualPriority,
  LazytopperDiagramBlock,
  LazytopperDiagramType,
} from "../../diagrams/diagramIntelligence";
import {
  buildParallelLinesDiagram,
  buildSimilarityDiagram,
  buildTriangleDiagram,
} from "../../diagrams/geometryBuilders";

export type ChapterRuntimeVisual = {
  id: string;
  title: string;
  description: string;
  diagramRequired: true;
  conceptNeedsFigure: true;
  recommendedDiagramType: LazytopperDiagramType;
  visualPriority: DiagramVisualPriority;
  diagram: LazytopperDiagramBlock;
};

export const trianglesRuntimeVisuals: ChapterRuntimeVisual[] = [
  {
    id: "triangles-similarity-visual",
    title: "Match angles before ratios",
    description:
      "Weak students stop mixing correspondence when they see equal-angle matching first.",
    diagramRequired: true,
    conceptNeedsFigure: true,
    recommendedDiagramType: "geometry_similarity",
    visualPriority: "high",
    diagram: buildSimilarityDiagram({
      title: "Similarity first",
      caption: "AA/SAS/SSS proofs become cleaner when the matching order is visible before writing ratios.",
      diagramIntent: "explain",
      accessibilityLabel: "Similarity figure for Triangles chapter",
    }),
  },
  {
    id: "triangles-bpt-visual",
    title: "Parallel line -> BPT",
    description:
      "BPT should only fire after the parallel line is identified. The figure makes that condition explicit.",
    diagramRequired: true,
    conceptNeedsFigure: true,
    recommendedDiagramType: "geometry_parallel_lines",
    visualPriority: "high",
    diagram: buildParallelLinesDiagram({
      title: "BPT setup",
      caption: "See the parallel segment first, then write the proportionality step.",
      diagramIntent: "solve",
      accessibilityLabel: "Basic Proportionality Theorem setup",
    }),
  },
  {
    id: "triangles-proof-setup-visual",
    title: "Proof-ready triangle setup",
    description:
      "A clean labeled figure lowers proof-writing mistakes before the student writes Given / To Prove / Therefore.",
    diagramRequired: true,
    conceptNeedsFigure: true,
    recommendedDiagramType: "geometry_triangle",
    visualPriority: "medium",
    diagram: buildTriangleDiagram({
      title: "Labeled proof figure",
      caption: "Before solving, label the vertices cleanly and identify the triangles you will compare.",
      diagramIntent: "revise",
      accessibilityLabel: "Proof-ready triangle setup",
    }),
  },
];
