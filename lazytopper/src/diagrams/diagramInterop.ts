import type { DiagramSpec } from "../tutor/diagram/diagramTypes";
import { isDiagramSpec } from "../tutor/diagram/diagramTypes";
import {
  createDiagramBlock,
  type LazytopperDiagramBlock,
  type LazytopperDiagramIntent,
  type LazytopperDiagramType,
} from "./diagramIntelligence";
import {
  buildHeightsDistanceDiagram,
  buildParallelLinesDiagram,
  buildRightTriangleDiagram,
  buildSimilarityDiagram,
  buildTriangleDiagram,
} from "./geometryBuilders";

type LegacyDiagramInput = {
  diagramType?: string | null;
  diagramLabels?: Record<string, string> | string[] | null;
  diagramSpec?: unknown;
  title?: string;
  caption?: string;
  accessibilityLabel?: string;
  diagramIntent?: LazytopperDiagramIntent;
};

function normalizeLabels(
  raw?: Record<string, string> | string[] | null
): Record<string, string> {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, string>>((acc, label) => {
      const clean = String(label || "").trim();
      if (clean) acc[clean] = clean;
      return acc;
    }, {});
  }
  return Object.entries(raw).reduce<Record<string, string>>((acc, [key, value]) => {
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return acc;
    acc[cleanKey] = String(value || "").trim() || cleanKey;
    return acc;
  }, {});
}

function mapLegacyType(raw?: string | null): LazytopperDiagramType {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return "geometry_triangle";
  if (value.includes("similar")) return "geometry_similarity";
  if (value.includes("bpt") || value.includes("parallel")) return "geometry_parallel_lines";
  if (value.includes("height") || value.includes("distance")) return "heights_distance";
  if (value.includes("pyth") || value.includes("trigon") || value.includes("right")) {
    return "geometry_right_triangle";
  }
  if (value.includes("ray")) return "ray_optics";
  if (value.includes("biology")) return "biology_process";
  if (value.includes("circuit")) return "circuit_basic";
  return "geometry_triangle";
}

function buildTriangleSpecFromLegacyPayload(payload: Record<string, unknown>): DiagramSpec | null {
  const rawPoints = payload.points;
  if (!rawPoints || typeof rawPoints !== "object" || Array.isArray(rawPoints)) return null;
  const asPoint = (key: string) => {
    const value = (rawPoints as Record<string, unknown>)[key];
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const point = value as Record<string, unknown>;
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      id: key,
      x: 40 + x * 2.8,
      y: 20 + y * 1.8,
      label: key,
    };
  };
  const A = asPoint("A");
  const B = asPoint("B");
  const C = asPoint("C");
  if (!A || !B || !C) return null;

  return {
    kind: "tutor_diagram_v1",
    width: 360,
    height: 220,
    points: [A, B, C],
    edges: [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
    ],
  };
}

export function buildDiagramBlockFromLegacy(
  input: LegacyDiagramInput
): LazytopperDiagramBlock | null {
  const diagramType = mapLegacyType(input.diagramType);
  const labels = normalizeLabels(input.diagramLabels);

  if (isDiagramSpec(input.diagramSpec)) {
    return createDiagramBlock({
      diagramType,
      diagramIntent: input.diagramIntent ?? "mentor_support",
      title: input.title || input.diagramSpec.title,
      caption: input.caption || input.diagramSpec.caption,
      accessibilityLabel:
        input.accessibilityLabel ||
        input.title ||
        input.diagramSpec.title ||
        "Educational diagram",
      spec: input.diagramSpec,
    });
  }

  if (input.diagramSpec && typeof input.diagramSpec === "object" && !Array.isArray(input.diagramSpec)) {
    const legacySpec = input.diagramSpec as Record<string, unknown>;
    const type = String(legacySpec.type || "").trim().toLowerCase();
    const templateId = String(legacySpec.templateId || "").trim().toLowerCase();
    const payload =
      legacySpec.payload && typeof legacySpec.payload === "object" && !Array.isArray(legacySpec.payload)
        ? (legacySpec.payload as Record<string, unknown>)
        : null;
    if ((type === "triangle" || templateId === "triangle-basic") && payload) {
      const spec = buildTriangleSpecFromLegacyPayload(payload);
      if (spec) {
        return createDiagramBlock({
          diagramType: "geometry_triangle",
          diagramIntent: input.diagramIntent ?? "mentor_support",
          title: input.title || "Triangle diagram",
          caption: input.caption,
          accessibilityLabel: input.accessibilityLabel || "Triangle diagram",
          spec,
        });
      }
    }
  }

  const base = {
    title: input.title,
    caption: input.caption,
    accessibilityLabel: input.accessibilityLabel || input.title || "Educational diagram",
    diagramIntent: input.diagramIntent ?? "mentor_support",
  };

  switch (diagramType) {
    case "geometry_similarity":
      return buildSimilarityDiagram(base);
    case "geometry_parallel_lines":
      return buildParallelLinesDiagram({ ...base, labels });
    case "geometry_right_triangle":
      return buildRightTriangleDiagram({ ...base, labels });
    case "heights_distance":
      return buildHeightsDistanceDiagram(base);
    case "geometry_triangle":
    default:
      return buildTriangleDiagram({ ...base, labels });
  }
}
