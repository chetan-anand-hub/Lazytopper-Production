import { useId, useMemo } from "react";
import type { DiagramPoint, DiagramRightAngleMark, DiagramSpec } from "./diagramTypes";
import { resolveDiagramTheme } from "./diagramTypes";

type Props = {
  spec: DiagramSpec;
};

function normalizeVector(x: number, y: number) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function buildAngleArc(
  at: DiagramPoint,
  from: DiagramPoint,
  to: DiagramPoint,
  radius: number
) {
  const v1 = normalizeVector(from.x - at.x, from.y - at.y);
  const v2 = normalizeVector(to.x - at.x, to.y - at.y);
  const start = { x: at.x + v1.x * radius, y: at.y + v1.y * radius };
  const end = { x: at.x + v2.x * radius, y: at.y + v2.y * radius };
  const sweep = v1.x * v2.y - v1.y * v2.x >= 0 ? 1 : 0;
  return `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} A ${radius} ${radius} 0 0 ${sweep} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
}

function resolveLabelOffset(point: DiagramPoint) {
  if (point.labelOffset) return point.labelOffset;
  return { x: -10, y: 14 };
}

function buildRightAnglePath(
  at: DiagramPoint,
  alongA: DiagramPoint,
  alongB: DiagramPoint,
  size: number
) {
  const v1 = normalizeVector(alongA.x - at.x, alongA.y - at.y);
  const v2 = normalizeVector(alongB.x - at.x, alongB.y - at.y);
  const p1 = { x: at.x + v1.x * size, y: at.y + v1.y * size };
  const p2 = { x: p1.x + v2.x * size, y: p1.y + v2.y * size };
  const p3 = { x: at.x + v2.x * size, y: at.y + v2.y * size };
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} L ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`;
}

function buildArrowLabelPoint(from: DiagramPoint, to: DiagramPoint) {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - 8,
  };
}

export function DiagramSvg({ spec }: Props) {
  const id = useId();
  const theme = resolveDiagramTheme(spec.theme);
  const pointMap = useMemo(() => {
    const map = new Map<string, DiagramPoint>();
    spec.points.forEach((pt) => map.set(pt.id, pt));
    return map;
  }, [spec.points]);

  const edges = spec.edges.filter((edge) => pointMap.has(edge.from) && pointMap.has(edge.to));
  const angleMarks = (spec.angleMarks || []).filter(
    (mark) => pointMap.has(mark.at) && pointMap.has(mark.from) && pointMap.has(mark.to)
  );
  const rightAngleMarks = (spec.rightAngleMarks || []).filter(
    (mark: DiagramRightAngleMark) =>
      pointMap.has(mark.at) && pointMap.has(mark.alongA) && pointMap.has(mark.alongB)
  );
  const arrows = (spec.arrows || []).filter(
    (arrow) => pointMap.has(arrow.from) && pointMap.has(arrow.to)
  );

  const gradientId = `diagram-gradient-${id}`;
  const shadowId = `diagram-shadow-${id}`;
  const arrowHeadId = `diagram-arrow-${id}`;

  return (
    <svg
      viewBox={`0 0 ${spec.width} ${spec.height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={spec.title || "Diagram"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={theme.background} />
        </linearGradient>
        <filter id={shadowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(15,23,42,0.12)" />
        </filter>
        <marker
          id={arrowHeadId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" fill={theme.accent} />
        </marker>
      </defs>

      <rect
        x="6"
        y="6"
        width={spec.width - 12}
        height={spec.height - 12}
        rx="18"
        fill={`url(#${gradientId})`}
        stroke={theme.backgroundEdge}
        strokeWidth="1.2"
        filter={`url(#${shadowId})`}
      />

      {edges.map((edge, idx) => {
        const from = pointMap.get(edge.from);
        const to = pointMap.get(edge.to);
        if (!from || !to) return null;
        return (
          <line
            key={`${edge.from}-${edge.to}-${idx}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={edge.highlight ? theme.accent : theme.stroke}
            strokeWidth={edge.highlight ? theme.strokeWidth + 0.6 : theme.strokeWidth}
            strokeDasharray={edge.dashed ? "6 5" : undefined}
            strokeLinecap="round"
          />
        );
      })}

      {arrows.map((arrow, idx) => {
        const from = pointMap.get(arrow.from);
        const to = pointMap.get(arrow.to);
        if (!from || !to) return null;
        const labelPoint = buildArrowLabelPoint(from, to);
        const color = arrow.highlight ? theme.accent : theme.stroke;
        return (
          <g key={`${arrow.from}-${arrow.to}-${idx}`}>
            <line
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={color}
              strokeWidth={theme.strokeWidth - 0.2}
              strokeDasharray={arrow.dashed ? "6 5" : undefined}
              strokeLinecap="round"
              markerEnd={`url(#${arrowHeadId})`}
            />
            {arrow.label ? (
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                fontSize={theme.labelSize - 1}
                fontFamily={theme.fontFamily}
                fill={theme.label}
                fontWeight={700}
              >
                {arrow.label}
              </text>
            ) : null}
          </g>
        );
      })}

      {angleMarks.map((mark, idx) => {
        const at = pointMap.get(mark.at);
        const from = pointMap.get(mark.from);
        const to = pointMap.get(mark.to);
        if (!at || !from || !to) return null;
        const radius = mark.radius ?? 16;
        const path = buildAngleArc(at, from, to, radius);
        const color = mark.highlight ? theme.accentSoft : theme.stroke;
        return (
          <g key={`${mark.at}-${idx}`}>
            <path d={path} fill="none" stroke={color} strokeWidth={theme.angleStrokeWidth} />
            {mark.double ? (
              <path
                d={buildAngleArc(at, from, to, radius + 5)}
                fill="none"
                stroke={color}
                strokeWidth={theme.angleStrokeWidth}
              />
            ) : null}
          </g>
        );
      })}

      {rightAngleMarks.map((mark, idx) => {
        const at = pointMap.get(mark.at);
        const alongA = pointMap.get(mark.alongA);
        const alongB = pointMap.get(mark.alongB);
        if (!at || !alongA || !alongB) return null;
        const color = mark.highlight ? theme.accentSoft : theme.stroke;
        return (
          <path
            key={`${mark.at}-right-${idx}`}
            d={buildRightAnglePath(at, alongA, alongB, mark.size ?? 14)}
            fill="none"
            stroke={color}
            strokeWidth={theme.angleStrokeWidth}
          />
        );
      })}

      {spec.points.map((pt) => {
        const label = pt.label || pt.id;
        const offset = resolveLabelOffset(pt);
        return (
          <g key={`label-${pt.id}`}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={pt.highlight ? 3.2 : 2.4}
              fill={pt.highlight ? theme.accent : theme.stroke}
            />
            <text
              x={pt.x + offset.x}
              y={pt.y + offset.y}
              fontSize={theme.labelSize}
              fontFamily={theme.fontFamily}
              fill={theme.label}
              fontWeight={700}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
