import React from "react";

export interface QuestionVisualAidProps {
  subject?: string;
  topicKey?: string;
  questionText?: string;
  kind?: string;
  marks?: number;
}

type VisualKind =
  | "triangle"
  | "coordinate"
  | "circle"
  | "ray"
  | "circuit"
  | "magnetic"
  | "heart"
  | "nephron";

function norm(value: string | undefined | null): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function inferVisualKind(props: QuestionVisualAidProps): VisualKind | null {
  const topic = norm(props.topicKey);
  const text = norm(props.questionText);
  const combined = `${topic} ${text}`;

  const visualTrigger =
    /\b(draw|diagram|graph|figure|plot|construct|ray|circuit|labelled|labelled)\b/.test(
      combined
    ) || (props.kind || "").toLowerCase() === "case-based";

  const topicNeedsVisual =
    /\b(triangle|trigonometry|similarity|height and distance|coordinate|circle|lens|mirror|light|electricity|magnetic|life process|human eye|heredity)\b/.test(
      combined
    );

  if (!visualTrigger && !topicNeedsVisual) return null;

  if (/\b(nephron|kidney|excretion)\b/.test(combined)) return "nephron";
  if (/\b(heart|circulation|blood flow)\b/.test(combined)) return "heart";
  if (/\b(magnetic|field line|fleming|solenoid)\b/.test(combined))
    return "magnetic";
  if (/\b(electric|resistance|ohm|circuit)\b/.test(combined)) return "circuit";
  if (/\b(lens|mirror|refraction|reflection|ray)\b/.test(combined)) return "ray";
  if (/\b(coordinate|graph|distance formula)\b/.test(combined))
    return "coordinate";
  if (/\b(circle|tangent|sector)\b/.test(combined)) return "circle";
  return "triangle";
}

function svgForKind(kind: VisualKind): React.ReactElement {
  const stroke = "#0f172a";
  const accent = "#0ea5e9";
  const baseProps = {
    width: "100%",
    height: "auto",
    viewBox: "0 0 280 140",
    role: "img" as const,
  };

  if (kind === "triangle") {
    return (
      <svg {...baseProps} aria-label="Triangle visual aid">
        <polygon points="40,118 135,20 236,118" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="34" y="132" fontSize="13" fill={stroke}>A</text>
        <text x="132" y="18" fontSize="13" fill={stroke}>B</text>
        <text x="238" y="132" fontSize="13" fill={stroke}>C</text>
        <line x1="135" y1="20" x2="184" y2="118" stroke={accent} strokeWidth="2" strokeDasharray="5 4" />
      </svg>
    );
  }

  if (kind === "coordinate") {
    return (
      <svg {...baseProps} aria-label="Coordinate geometry visual aid">
        <line x1="30" y1="118" x2="252" y2="118" stroke={stroke} strokeWidth="2" />
        <line x1="42" y1="126" x2="42" y2="20" stroke={stroke} strokeWidth="2" />
        <circle cx="102" cy="74" r="4" fill={accent} />
        <circle cx="192" cy="48" r="4" fill={accent} />
        <text x="106" y="72" fontSize="12" fill={stroke}>P</text>
        <text x="196" y="46" fontSize="12" fill={stroke}>Q</text>
      </svg>
    );
  }

  if (kind === "circle") {
    return (
      <svg {...baseProps} aria-label="Circle visual aid">
        <circle cx="135" cy="72" r="48" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="135" y1="72" x2="183" y2="72" stroke={accent} strokeWidth="2" />
        <line x1="183" y1="72" x2="236" y2="34" stroke={stroke} strokeWidth="2" />
        <text x="130" y="67" fontSize="12" fill={stroke}>O</text>
        <text x="186" y="68" fontSize="12" fill={stroke}>T</text>
      </svg>
    );
  }

  if (kind === "ray") {
    return (
      <svg {...baseProps} aria-label="Light ray visual aid">
        <line x1="20" y1="70" x2="258" y2="70" stroke={stroke} strokeWidth="2" />
        <line x1="130" y1="26" x2="130" y2="114" stroke="#64748b" strokeWidth="2" />
        <line x1="24" y1="58" x2="130" y2="70" stroke={accent} strokeWidth="2" />
        <line x1="130" y1="70" x2="246" y2="48" stroke={accent} strokeWidth="2" />
        <text x="116" y="24" fontSize="12" fill={stroke}>N</text>
      </svg>
    );
  }

  if (kind === "circuit") {
    return (
      <svg {...baseProps} aria-label="Electric circuit visual aid">
        <rect x="40" y="36" width="196" height="68" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="78" y1="72" x2="118" y2="72" stroke={accent} strokeWidth="3" />
        <rect x="118" y="60" width="22" height="24" fill="none" stroke={stroke} strokeWidth="2" />
        <circle cx="188" cy="72" r="12" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="183" y="76" fontSize="12" fill={stroke}>A</text>
      </svg>
    );
  }

  if (kind === "magnetic") {
    return (
      <svg {...baseProps} aria-label="Magnetic field visual aid">
        <rect x="96" y="46" width="88" height="44" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="106" y="72" fontSize="13" fill={stroke}>N</text>
        <text x="166" y="72" fontSize="13" fill={stroke}>S</text>
        <path d="M84 50 C40 50,40 90,84 90" fill="none" stroke={accent} strokeWidth="2" />
        <path d="M196 50 C240 50,240 90,196 90" fill="none" stroke={accent} strokeWidth="2" />
      </svg>
    );
  }

  if (kind === "heart") {
    return (
      <svg {...baseProps} aria-label="Heart diagram visual aid">
        <path d="M90 30 C65 30 52 48 52 66 C52 94 83 110 140 124 C197 110 228 94 228 66 C228 48 215 30 190 30 C171 30 156 41 140 56 C124 41 109 30 90 30 Z" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="140" y1="56" x2="140" y2="118" stroke={accent} strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg {...baseProps} aria-label="Nephron diagram visual aid">
      <circle cx="92" cy="56" r="18" fill="none" stroke={stroke} strokeWidth="2.2" />
      <path d="M110 56 C160 56 170 76 170 92 C170 112 152 122 138 118 C126 114 122 100 130 92 C136 86 146 88 150 96" fill="none" stroke={stroke} strokeWidth="2.2" />
      <line x1="170" y1="92" x2="216" y2="92" stroke={accent} strokeWidth="2.2" />
    </svg>
  );
}

export function QuestionVisualAid(props: QuestionVisualAidProps): React.ReactElement | null {
  const kind = inferVisualKind(props);
  if (!kind) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(148,163,184,0.45)",
        borderRadius: 12,
        background: "rgba(241,245,249,0.8)",
        padding: "8px 10px",
        marginBottom: 8,
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "#475569", marginBottom: 4 }}>
        Visual aid (not to scale)
      </div>
      {svgForKind(kind)}
    </div>
  );
}

