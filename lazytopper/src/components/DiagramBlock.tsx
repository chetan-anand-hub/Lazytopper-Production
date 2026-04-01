import { useState } from "react";
import type { LazytopperDiagramBlock } from "../diagrams/diagramIntelligence";
import { buildDiagramBlockFromLegacy } from "../diagrams/diagramInterop";
import type { MentorDiagramSpec } from "../types/mentor";
import type { DiagramSpec } from "../tutor/diagram/diagramTypes";
import { DiagramRenderer } from "./diagrams/DiagramRenderer";
import { DiagramCanvas } from "./diagrams/DiagramCanvas";
import { DiagramSvg } from "../tutor/diagram/DiagramSvg";
import { isDiagramSpec } from "../tutor/diagram/diagramTypes";

type DiagramLabels = Record<string, string>;

type Props = {
  diagram?: LazytopperDiagramBlock | null;
  diagramType?: string | null;
  diagramLabels?: DiagramLabels | string[] | null;
  diagramSpec?: MentorDiagramSpec | DiagramSpec | null;
  title?: string;
  note?: string;
};

const DEFAULT_LABELS: DiagramLabels = {
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  P: "P",
  Q: "Q",
  R: "R",
};

function normalizeDiagramType(raw?: string | null) {
  const t = String(raw || "").trim().toUpperCase();
  return t || "TRIANGLE_GENERIC";
}

function normalizeLabels(raw: Props["diagramLabels"]): DiagramLabels {
  if (!raw) return DEFAULT_LABELS;
  if (Array.isArray(raw)) {
    const out: DiagramLabels = {};
    raw.forEach((label, idx) => {
      const clean = String(label || "").trim();
      if (!clean) return;
      out[clean] = clean;
      if (idx === raw.length - 1 && Object.keys(out).length) return;
    });
    return Object.keys(out).length ? out : DEFAULT_LABELS;
  }
  if (typeof raw === "object") {
    const out: DiagramLabels = {};
    Object.entries(raw).forEach(([k, v]) => {
      const key = String(k || "").trim();
      const val = String(v || "").trim();
      if (!key) return;
      out[key] = val || key;
    });
    return Object.keys(out).length ? out : DEFAULT_LABELS;
  }
  return DEFAULT_LABELS;
}

function getLabel(labels: DiagramLabels, key: string) {
  return labels[key] || key;
}

function TriangleGeneric({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 260 140" width="100%" height="auto" role="img" aria-label="Triangle diagram">
      <polygon points="40,110 220,110 140,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text x="30" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="224" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="140" y="18" fontSize="11">{getLabel(labels, "C")}</text>
    </svg>
  );
}

function SimilarityDiagram({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 300 140" width="100%" height="auto" role="img" aria-label="Similarity diagram">
      <polygon points="25,110 125,110 75,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="175,110 275,110 230,35" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text x="15" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="125" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="75" y="18" fontSize="11">{getLabel(labels, "C")}</text>
      <text x="165" y="125" fontSize="11">{getLabel(labels, "P")}</text>
      <text x="275" y="125" fontSize="11">{getLabel(labels, "Q")}</text>
      <text x="230" y="28" fontSize="11">{getLabel(labels, "R")}</text>
    </svg>
  );
}

function SimilarityAADiagram({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 300 140" width="100%" height="auto" role="img" aria-label="AA similarity diagram">
      <polygon points="25,110 125,110 75,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="175,110 275,110 230,35" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M48 96 A18 18 0 0 1 62 80" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M200 98 A18 18 0 0 1 214 82" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M102 92 A16 16 0 0 1 98 72" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M255 95 A16 16 0 0 1 250 76" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="15" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="125" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="75" y="18" fontSize="11">{getLabel(labels, "C")}</text>
      <text x="165" y="125" fontSize="11">{getLabel(labels, "P")}</text>
      <text x="275" y="125" fontSize="11">{getLabel(labels, "Q")}</text>
      <text x="230" y="28" fontSize="11">{getLabel(labels, "R")}</text>
    </svg>
  );
}

function SimilaritySASDiagram({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 300 140" width="100%" height="auto" role="img" aria-label="SAS similarity diagram">
      <polygon points="25,110 125,110 75,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="175,110 275,110 230,35" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M54 104 L70 104" stroke="currentColor" strokeWidth="2" />
      <path d="M82 92 L90 78" stroke="currentColor" strokeWidth="2" />
      <path d="M206 104 L222 104" stroke="currentColor" strokeWidth="2" />
      <path d="M236 96 L244 82" stroke="currentColor" strokeWidth="2" />
      <path d="M48 96 A18 18 0 0 1 62 80" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M200 98 A18 18 0 0 1 214 82" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="15" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="125" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="75" y="18" fontSize="11">{getLabel(labels, "C")}</text>
      <text x="165" y="125" fontSize="11">{getLabel(labels, "P")}</text>
      <text x="275" y="125" fontSize="11">{getLabel(labels, "Q")}</text>
      <text x="230" y="28" fontSize="11">{getLabel(labels, "R")}</text>
    </svg>
  );
}

function SimilaritySSSDiagram({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 300 140" width="100%" height="auto" role="img" aria-label="SSS similarity diagram">
      <polygon points="25,110 125,110 75,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polygon points="175,110 275,110 230,35" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M52 104 L66 104" stroke="currentColor" strokeWidth="2" />
      <path d="M86 92 L94 78" stroke="currentColor" strokeWidth="2" />
      <path d="M96 108 L108 95" stroke="currentColor" strokeWidth="2" />
      <path d="M202 104 L216 104" stroke="currentColor" strokeWidth="2" />
      <path d="M240 96 L248 82" stroke="currentColor" strokeWidth="2" />
      <path d="M246 108 L258 96" stroke="currentColor" strokeWidth="2" />
      <text x="15" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="125" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="75" y="18" fontSize="11">{getLabel(labels, "C")}</text>
      <text x="165" y="125" fontSize="11">{getLabel(labels, "P")}</text>
      <text x="275" y="125" fontSize="11">{getLabel(labels, "Q")}</text>
      <text x="230" y="28" fontSize="11">{getLabel(labels, "R")}</text>
    </svg>
  );
}

function BptDiagram({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 260 140" width="100%" height="auto" role="img" aria-label="BPT diagram">
      <polygon points="40,110 220,110 140,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <line x1="75" y1="80" x2="205" y2="80" stroke="currentColor" strokeWidth="2.5" />
      <path d="M92 76 L100 84" stroke="currentColor" strokeWidth="2" />
      <path d="M178 76 L186 84" stroke="currentColor" strokeWidth="2" />
      <path d="M92 114 L100 106" stroke="currentColor" strokeWidth="2" />
      <path d="M178 114 L186 106" stroke="currentColor" strokeWidth="2" />
      <text x="30" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="224" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="140" y="18" fontSize="11">{getLabel(labels, "C")}</text>
      <text x="68" y="78" fontSize="11">{getLabel(labels, "D")}</text>
      <text x="208" y="78" fontSize="11">{getLabel(labels, "E")}</text>
    </svg>
  );
}

function PythagorasDiagram({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 260 140" width="100%" height="auto" role="img" aria-label="Right triangle diagram">
      <polygon points="40,110 220,110 40,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <polyline points="40,110 58,110 58,92" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text x="30" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="224" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="30" y="20" fontSize="11">{getLabel(labels, "C")}</text>
    </svg>
  );
}

function ParallelAngleDiagram({ labels }: { labels: DiagramLabels }) {
  return (
    <svg viewBox="0 0 260 140" width="100%" height="auto" role="img" aria-label="Parallel line angle relations">
      <polygon points="40,110 220,110 140,25" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <line x1="75" y1="80" x2="205" y2="80" stroke="currentColor" strokeWidth="2.5" />
      <path d="M70 92 A18 18 0 0 1 86 78" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M172 94 A18 18 0 0 1 188 80" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="30" y="125" fontSize="11">{getLabel(labels, "A")}</text>
      <text x="224" y="125" fontSize="11">{getLabel(labels, "B")}</text>
      <text x="140" y="18" fontSize="11">{getLabel(labels, "C")}</text>
      <text x="68" y="78" fontSize="11">{getLabel(labels, "D")}</text>
      <text x="208" y="78" fontSize="11">{getLabel(labels, "E")}</text>
    </svg>
  );
}

function DiagramPlaceholder({ labels }: { labels: DiagramLabels }) {
  const labelKeys = Object.keys(labels);
  return (
    <svg viewBox="0 0 220 120" width="100%" height="auto" role="img" aria-label="Diagram placeholder">
      <rect x="10" y="10" width="200" height="100" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" />
      <text x="20" y="30" fontSize="10">Diagram placeholder</text>
      {labelKeys.slice(0, 8).map((k, idx) => (
        <text key={k} x={20} y={50 + idx * 10} fontSize="10">
          {k}: {getLabel(labels, k)}
        </text>
      ))}
    </svg>
  );
}

export function DiagramBlock({
  diagram,
  diagramType,
  diagramLabels,
  diagramSpec,
  title = "Diagram",
  note,
}: Props) {
  const [zoomed, setZoomed] = useState(false);
  const normalizedDiagram =
    diagram ||
    buildDiagramBlockFromLegacy({
      diagramType,
      diagramLabels: diagramLabels as Record<string, string> | string[] | null,
      diagramSpec,
      title,
      caption: note,
      accessibilityLabel: title,
      diagramIntent: "visualize_question",
    });
  const type = normalizeDiagramType(diagramType);
  const labels = normalizeLabels(diagramLabels);
  const isSimilarity =
    type.includes("SIMILARITY") ||
    type.endsWith("_SIMILARITY") ||
    type === "SIMILAR";
  const isAa = type === "SIMILARITY_AA";
  const isSas = type === "SIMILARITY_SAS";
  const isSss = type === "SIMILARITY_SSS";

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid rgba(0,0,0,0.12)",
        padding: 10,
        background: "rgba(255,255,255,0.75)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
        <button
          type="button"
          onClick={() => setZoomed((prev) => !prev)}
          style={{
            marginLeft: "auto",
            borderRadius: 999,
            border: "1px solid rgba(0,0,0,0.14)",
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            background: "white",
          }}
        >
          {zoomed ? "Close diagram" : "Open diagram"}
        </button>
      </div>
      <div style={{ maxWidth: zoomed ? 520 : 360, margin: "0 auto" }}>
      {normalizedDiagram ? (
        <DiagramCanvas
          diagram={normalizedDiagram}
          maxWidth={zoomed ? 520 : 360}
          compact={!zoomed}
        />
      ) : diagramSpec ? (
        isDiagramSpec(diagramSpec) ? (
          <DiagramSvg spec={diagramSpec} />
        ) : (
          <DiagramRenderer diagramSpec={diagramSpec as MentorDiagramSpec} />
        )
      ) : type === "BPT" ? (
        <BptDiagram labels={labels} />
      ) : type === "PYTHAGORAS" ? (
        <PythagorasDiagram labels={labels} />
      ) : type === "PARALLEL_LINE_ANGLE_RELATIONS" ? (
        <ParallelAngleDiagram labels={labels} />
      ) : isAa ? (
        <SimilarityAADiagram labels={labels} />
      ) : isSas ? (
        <SimilaritySASDiagram labels={labels} />
      ) : isSss ? (
        <SimilaritySSSDiagram labels={labels} />
      ) : isSimilarity ? (
        <SimilarityDiagram labels={labels} />
      ) : type === "TRIANGLE_GENERIC" ? (
        <TriangleGeneric labels={labels} />
      ) : (
        <DiagramPlaceholder labels={labels} />
      )}
      </div>
      {!normalizedDiagram || note ? (
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
          {note || `Type: ${type}`}
        </div>
      ) : null}
    </div>
  );
}
