import type { DiagramPoint, DiagramSpec } from "../tutor/diagram/diagramTypes";
import {
  createDiagramBlock,
  type LazytopperDiagramBlock,
  type LazytopperDiagramIntent,
} from "./diagramIntelligence";

type DiagramLabelMap = Record<string, string>;

type GeometryBuilderBase = {
  title?: string;
  caption?: string;
  accessibilityLabel?: string;
  diagramIntent?: LazytopperDiagramIntent;
  visualPriority?: "low" | "medium" | "high";
};

type LabelledGeometryBuilder = GeometryBuilderBase & {
  labels?: DiagramLabelMap;
};

function withLabels(points: DiagramPoint[], labels?: DiagramLabelMap): DiagramPoint[] {
  return points.map((point) => ({
    ...point,
    label: labels?.[point.id] ?? point.label ?? point.id,
  }));
}

function createGeometryBlock(
  diagramType: LazytopperDiagramBlock["diagramType"],
  base: GeometryBuilderBase,
  spec: DiagramSpec
) {
  return createDiagramBlock({
    diagramType,
    diagramIntent: base.diagramIntent ?? "explain",
    title: base.title,
    caption: base.caption,
    accessibilityLabel: base.accessibilityLabel || base.title || "Educational diagram",
    visualPriority: base.visualPriority ?? "high",
    spec,
  });
}

export function buildTriangleDiagram(
  config: LabelledGeometryBuilder = {}
): LazytopperDiagramBlock {
  const spec: DiagramSpec = {
    kind: "tutor_diagram_v1",
    width: 360,
    height: 220,
    title: config.title || "Labeled triangle",
    caption: config.caption || "Start by naming the vertices cleanly before applying a theorem.",
    points: withLabels(
      [
        { id: "A", x: 70, y: 170, label: "A", highlight: true },
        { id: "B", x: 280, y: 170, label: "B" },
        { id: "C", x: 170, y: 50, label: "C" },
      ],
      config.labels
    ),
    edges: [
      { from: "A", to: "B", highlight: true },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
    ],
  };
  return createGeometryBlock("geometry_triangle", config, spec);
}

export function buildRightTriangleDiagram(
  config: LabelledGeometryBuilder = {}
): LazytopperDiagramBlock {
  const spec: DiagramSpec = {
    kind: "tutor_diagram_v1",
    width: 360,
    height: 220,
    title: config.title || "Right triangle setup",
    caption:
      config.caption ||
      "Use this only when the right angle is given or proved. Name the hypotenuse before calculating.",
    points: withLabels(
      [
        { id: "A", x: 70, y: 170, label: "A", highlight: true },
        { id: "B", x: 270, y: 170, label: "B" },
        { id: "C", x: 70, y: 55, label: "C" },
      ],
      config.labels
    ),
    edges: [
      { from: "A", to: "B", highlight: true },
      { from: "A", to: "C" },
      { from: "C", to: "B" },
    ],
    rightAngleMarks: [{ at: "A", alongA: "B", alongB: "C", size: 16, highlight: true }],
  };
  return createGeometryBlock("geometry_right_triangle", config, spec);
}

export function buildSimilarityDiagram(
  config: GeometryBuilderBase = {}
): LazytopperDiagramBlock {
  const spec: DiagramSpec = {
    kind: "tutor_diagram_v1",
    width: 430,
    height: 230,
    title: config.title || "Similarity figure",
    caption:
      config.caption ||
      "Match equal angles first. Then keep the vertex order consistent while writing ratios.",
    points: [
      { id: "A", x: 55, y: 175, label: "A", highlight: true },
      { id: "B", x: 170, y: 175, label: "B" },
      { id: "C", x: 110, y: 55, label: "C" },
      { id: "P", x: 250, y: 175, label: "P", highlight: true },
      { id: "Q", x: 370, y: 175, label: "Q" },
      { id: "R", x: 315, y: 75, label: "R" },
    ],
    edges: [
      { from: "A", to: "B", highlight: true },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
      { from: "P", to: "Q", highlight: true },
      { from: "Q", to: "R" },
      { from: "R", to: "P" },
    ],
    angleMarks: [
      { at: "A", from: "B", to: "C", radius: 16, highlight: true },
      { at: "P", from: "Q", to: "R", radius: 16, highlight: true },
      { at: "B", from: "A", to: "C", radius: 20, double: true, highlight: true },
      { at: "Q", from: "P", to: "R", radius: 20, double: true, highlight: true },
    ],
  };
  return createGeometryBlock("geometry_similarity", config, spec);
}

export function buildParallelLinesDiagram(
  config: LabelledGeometryBuilder = {}
): LazytopperDiagramBlock {
  const spec: DiagramSpec = {
    kind: "tutor_diagram_v1",
    width: 380,
    height: 240,
    title: config.title || "Parallel-line theorem figure",
    caption:
      config.caption ||
      "Only use BPT after you have clearly identified the parallel line in the figure.",
    points: withLabels(
      [
        { id: "A", x: 60, y: 190, label: "A", highlight: true },
        { id: "B", x: 305, y: 190, label: "B" },
        { id: "C", x: 180, y: 50, label: "C" },
        { id: "D", x: 105, y: 140, label: "D", highlight: true },
        { id: "E", x: 240, y: 140, label: "E", highlight: true },
      ],
      config.labels
    ),
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
      { from: "D", to: "E", highlight: true },
    ],
    angleMarks: [
      { at: "D", from: "A", to: "E", radius: 14, highlight: true },
      { at: "A", from: "D", to: "B", radius: 18, highlight: true },
    ],
  };
  return createGeometryBlock("geometry_parallel_lines", config, spec);
}

export function buildHeightsDistanceDiagram(
  config: GeometryBuilderBase = {}
): LazytopperDiagramBlock {
  const spec: DiagramSpec = {
    kind: "tutor_diagram_v1",
    width: 420,
    height: 240,
    title: config.title || "Heights and distances setup",
    caption:
      config.caption ||
      "Start with the right triangle: vertical object, horizontal ground, and one clear angle of elevation.",
    points: [
      { id: "O", x: 70, y: 190, label: "Observer", highlight: true },
      { id: "B", x: 300, y: 190, label: "Base" },
      { id: "T", x: 300, y: 70, label: "Top" },
    ],
    edges: [
      { from: "O", to: "B", highlight: true },
      { from: "B", to: "T" },
      { from: "O", to: "T" },
    ],
    rightAngleMarks: [{ at: "B", alongA: "O", alongB: "T", size: 16, highlight: true }],
    angleMarks: [{ at: "O", from: "B", to: "T", radius: 18, highlight: true }],
    arrows: [{ from: "O", to: "T", label: "line of sight", highlight: true }],
  };
  return createGeometryBlock("heights_distance", config, spec);
}
