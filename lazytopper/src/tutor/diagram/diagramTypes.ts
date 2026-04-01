export type DiagramTheme = {
  stroke: string;
  strokeWidth: number;
  accent: string;
  accentSoft: string;
  label: string;
  labelSize: number;
  fontFamily: string;
  angleStrokeWidth: number;
  background: string;
  backgroundEdge: string;
};

export type DiagramPoint = {
  id: string;
  x: number;
  y: number;
  label?: string;
  labelOffset?: { x: number; y: number };
  highlight?: boolean;
};

export type DiagramEdge = {
  from: string;
  to: string;
  dashed?: boolean;
  highlight?: boolean;
};

export type DiagramAngleMark = {
  at: string;
  from: string;
  to: string;
  radius?: number;
  double?: boolean;
  highlight?: boolean;
};

export type DiagramRightAngleMark = {
  at: string;
  alongA: string;
  alongB: string;
  size?: number;
  highlight?: boolean;
};

export type DiagramArrow = {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
  highlight?: boolean;
};

export type DiagramSpec = {
  kind: "tutor_diagram_v1";
  width: number;
  height: number;
  title?: string;
  caption?: string;
  points: DiagramPoint[];
  edges: DiagramEdge[];
  angleMarks?: DiagramAngleMark[];
  rightAngleMarks?: DiagramRightAngleMark[];
  arrows?: DiagramArrow[];
  theme?: Partial<DiagramTheme>;
};

export const DEFAULT_DIAGRAM_THEME: DiagramTheme = {
  stroke: "#1f2937",
  strokeWidth: 2.4,
  accent: "#0f766e",
  accentSoft: "#0ea5a2",
  label: "#0f172a",
  labelSize: 12,
  fontFamily: "'Trebuchet MS', 'Segoe UI', Arial, sans-serif",
  angleStrokeWidth: 2,
  background: "#f8fafc",
  backgroundEdge: "rgba(15, 23, 42, 0.12)",
};

export function resolveDiagramTheme(overrides?: Partial<DiagramTheme>): DiagramTheme {
  return { ...DEFAULT_DIAGRAM_THEME, ...(overrides || {}) };
}

export function isDiagramSpec(value: unknown): value is DiagramSpec {
  if (!value || typeof value !== "object") return false;
  const v = value as DiagramSpec;
  return v.kind === "tutor_diagram_v1" && Array.isArray(v.points) && Array.isArray(v.edges);
}
