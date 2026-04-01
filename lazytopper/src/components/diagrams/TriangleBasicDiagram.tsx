import type { MentorDiagramAnchor, MentorDiagramSpec } from "../../types/mentor";

type Props = {
  spec: MentorDiagramSpec;
  anchors: MentorDiagramAnchor[];
  highlightAnchorIds?: Set<string>;
};

/**
 * TriangleBasicDiagram
 * Golden reference template:
 * - SVG (responsive)
 * - Labels A, B, C
 * - Supports future anchor highlights (sides/angles/points)
 */
export function TriangleBasicDiagram({ spec, anchors, highlightAnchorIds }: Props) {
  // Minimal payload contract (extend later):
  // payload.points: { A:{x,y}, B:{x,y}, C:{x,y} } in normalized 0..100 space
  const payload = (spec as any).payload ?? {};
  const pts = payload.points ?? {
    A: { x: 20, y: 80 },
    B: { x: 80, y: 80 },
    C: { x: 55, y: 25 },
  };

  const A = pts.A, B = pts.B, C = pts.C;

  // Helper: anchor lookup by id/kind
  const isHi = (id: string) => (highlightAnchorIds ? highlightAnchorIds.has(id) : false);

  return (
    <div className="triangle-basic-diagram" style={{ width: "100%", maxWidth: 520 }}>
      <svg viewBox="0 0 100 100" width="100%" height="auto" role="img" aria-label="Triangle diagram">
        <polygon points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} fill="none" stroke="currentColor" strokeWidth="2" />
        {/* Vertices */}
        <circle cx={A.x} cy={A.y} r="2.2" />
        <circle cx={B.x} cy={B.y} r="2.2" />
        <circle cx={C.x} cy={C.y} r="2.2" />

        {/* Labels */}
        <text x={A.x - 4} y={A.y + 6} fontSize="6">A</text>
        <text x={B.x + 2} y={B.y + 6} fontSize="6">B</text>
        <text x={C.x} y={C.y - 3} fontSize="6">C</text>

        {/* Optional: render simple anchor labels (future). For now, show point anchors */}
        {anchors
          .filter((a) => a.kind === "point")
          .map((a) => {
            const label = a.label ?? a.id;
            const t = a.target; // "A" | "B" | "C" etc
            const p = (pts as any)[t];
            if (!p) return null;
            return (
              <text
                key={a.id}
                x={p.x + 3}
                y={p.y - 3}
                fontSize="4.5"
                fontWeight={isHi(a.id) ? 700 : 400}
              >
                {label}
              </text>
            );
          })}
      </svg>
      {/* Spec meta (small) */}
      <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
        Template: {(spec as any).templateId ?? "triangle-basic"}
      </div>
    </div>
  );
}
