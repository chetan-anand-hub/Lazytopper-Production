import { DiagramSvg } from "../../tutor/diagram/DiagramSvg";
import type { LazytopperDiagramBlock } from "../../diagrams/diagramIntelligence";

type Props = {
  diagram: LazytopperDiagramBlock;
  maxWidth?: number;
  compact?: boolean;
};

export function DiagramCanvas({ diagram, maxWidth = 420, compact = false }: Props) {
  return (
    <figure
      style={{
        margin: 0,
        display: "grid",
        gap: compact ? 6 : 8,
      }}
    >
      <div style={{ maxWidth, margin: "0 auto", width: "100%" }}>
        <DiagramSvg spec={diagram.spec} />
      </div>
      {diagram.title ? (
        <figcaption style={{ fontSize: compact ? 12 : 13, fontWeight: 800, lineHeight: 1.45 }}>
          {diagram.title}
        </figcaption>
      ) : null}
      {diagram.caption ? (
        <div style={{ fontSize: compact ? 11 : 12, opacity: 0.8, lineHeight: 1.5 }}>
          {diagram.caption}
        </div>
      ) : null}
    </figure>
  );
}
