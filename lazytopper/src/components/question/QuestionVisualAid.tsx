import React from "react";

export interface QuestionVisualAidProps {
  subject?: string;
  topicKey?: string;
  questionText?: string;
  kind?: string;
  marks?: number;
}

type VisualKind =
  | "height-distance"
  | "right-triangle"
  | "coordinate"
  | "circle"
  | "ray"
  | "lens"
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
    /\b(draw|diagram|graph|figure|plot|construct|ray|circuit|labelled)\b/.test(
      combined
    ) || (props.kind || "").toLowerCase() === "case-based";

  const topicNeedsVisual =
    /\b(height and distance|coordinate|circle|lens|mirror|light|electricity|magnetic|life process|human eye|heredity|nephron|kidney|heart|circulation)\b/.test(
      combined
    );

  if (!visualTrigger && !topicNeedsVisual) return null;

  if (/\b(nephron|kidney|excretion)\b/.test(combined)) return "nephron";
  if (/\b(heart|circulation|blood flow)\b/.test(combined)) return "heart";
  if (/\b(magnetic|field line|fleming|solenoid)\b/.test(combined))
    return "magnetic";
  if (/\b(electric|resistance|ohm|circuit)\b/.test(combined)) return "circuit";
  if (/\b(lens|convex lens|concave lens|image formation)\b/.test(combined)) return "lens";
  if (/\b(mirror|refraction|reflection|ray)\b/.test(combined)) return "ray";
  if (/\b(coordinate|graph|distance formula)\b/.test(combined))
    return "coordinate";
  if (/\b(circle|tangent|sector)\b/.test(combined)) return "circle";
  if (/\b(height and distance|angle of elevation|angle of depression|top of (a |the )?tower|top of (a |the )?building|shadow|lighthouse)\b/.test(combined))
    return "height-distance";
  if (/\b(triangle|similarity|congruence|pythagoras)\b/.test(combined) && visualTrigger)
    return "right-triangle";

  return null;
}

function svgForKind(kind: VisualKind): React.ReactElement {
  const stroke = "#3c3c3c";
  const accent = "#0ea5e9";
  const faint = "#94a3b8";
  const baseProps = {
    width: "100%",
    height: "auto",
    viewBox: "0 0 280 160",
    role: "img" as const,
  };

  if (kind === "height-distance") {
    return (
      <svg {...baseProps} aria-label="Height and distance visual aid">
        <line x1="60" y1="140" x2="240" y2="140" stroke={stroke} strokeWidth="2" />
        <line x1="200" y1="140" x2="200" y2="30" stroke={stroke} strokeWidth="2.2" />
        <line x1="60" y1="140" x2="200" y2="30" stroke={accent} strokeWidth="2" strokeDasharray="6 3" />
        <rect x="192" y="132" width="8" height="8" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="50" y="152" fontSize="12" fill={stroke}>A</text>
        <text x="196" y="152" fontSize="12" fill={stroke}>B</text>
        <text x="204" y="28" fontSize="12" fill={stroke}>C</text>
        <text x="110" y="135" fontSize="11" fill={accent}>d</text>
        <text x="204" y="90" fontSize="11" fill={accent}>h</text>
        <path d="M 90 140 A 30 30 0 0 0 82 128" fill="none" stroke={accent} strokeWidth="1.5" />
        <text x="92" y="134" fontSize="10" fill={accent}>θ</text>
      </svg>
    );
  }

  if (kind === "right-triangle") {
    return (
      <svg {...baseProps} aria-label="Right triangle visual aid">
        <polygon points="40,140 240,140 240,30" fill="none" stroke={stroke} strokeWidth="2.2" />
        <rect x="232" y="132" width="8" height="8" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="30" y="152" fontSize="13" fill={stroke}>A</text>
        <text x="242" y="152" fontSize="13" fill={stroke}>B</text>
        <text x="242" y="28" fontSize="13" fill={stroke}>C</text>
      </svg>
    );
  }

  if (kind === "coordinate") {
    return (
      <svg {...baseProps} aria-label="Coordinate geometry visual aid">
        <line x1="30" y1="140" x2="260" y2="140" stroke={stroke} strokeWidth="2" />
        <line x1="42" y1="148" x2="42" y2="20" stroke={stroke} strokeWidth="2" />
        <polygon points="260,140 252,136 252,144" fill={stroke} />
        <polygon points="42,20 38,28 46,28" fill={stroke} />
        <text x="254" y="155" fontSize="11" fill={stroke}>x</text>
        <text x="28" y="22" fontSize="11" fill={stroke}>y</text>
        <circle cx="110" cy="90" r="4" fill={accent} />
        <circle cx="200" cy="55" r="4" fill={accent} />
        <line x1="110" y1="90" x2="200" y2="55" stroke={accent} strokeWidth="1.8" strokeDasharray="5 3" />
        <text x="114" y="86" fontSize="12" fill={stroke}>P</text>
        <text x="204" y="51" fontSize="12" fill={stroke}>Q</text>
      </svg>
    );
  }

  if (kind === "circle") {
    return (
      <svg {...baseProps} aria-label="Circle visual aid">
        <circle cx="140" cy="80" r="52" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="140" y1="80" x2="192" y2="80" stroke={accent} strokeWidth="2" />
        <line x1="192" y1="80" x2="240" y2="42" stroke={stroke} strokeWidth="2" />
        <circle cx="140" cy="80" r="2.5" fill={stroke} />
        <text x="135" y="74" fontSize="12" fill={stroke}>O</text>
        <text x="196" y="76" fontSize="12" fill={stroke}>T</text>
        <text x="172" y="92" fontSize="11" fill={accent}>r</text>
      </svg>
    );
  }

  if (kind === "ray") {
    return (
      <svg {...baseProps} aria-label="Light ray visual aid">
        <line x1="20" y1="80" x2="260" y2="80" stroke={stroke} strokeWidth="2" />
        <line x1="140" y1="30" x2="140" y2="130" stroke={faint} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="40" y1="60" x2="140" y2="80" stroke={accent} strokeWidth="2" />
        <line x1="140" y1="80" x2="250" y2="56" stroke={accent} strokeWidth="2" />
        <polygon points="140,80 126,74 130,82" fill={accent} />
        <polygon points="250,56 238,54 240,62" fill={accent} />
        <text x="126" y="28" fontSize="12" fill={stroke}>N</text>
        <text x="48" y="55" fontSize="11" fill={faint}>i</text>
        <text x="215" y="63" fontSize="11" fill={faint}>r</text>
      </svg>
    );
  }

  if (kind === "lens") {
    return (
      <svg {...baseProps} aria-label="Lens diagram visual aid">
        <line x1="20" y1="80" x2="260" y2="80" stroke={stroke} strokeWidth="1.5" />
        <ellipse cx="140" cy="80" rx="12" ry="50" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="140" cy="80" r="2" fill={stroke} />
        <circle cx="90" cy="80" r="3" fill={accent} />
        <circle cx="190" cy="80" r="3" fill={accent} />
        <text x="135" y="74" fontSize="11" fill={stroke}>O</text>
        <text x="85" y="96" fontSize="11" fill={accent}>F</text>
        <text x="185" y="96" fontSize="11" fill={accent}>F'</text>
      </svg>
    );
  }

  if (kind === "circuit") {
    return (
      <svg {...baseProps} aria-label="Electric circuit visual aid">
        <rect x="40" y="40" width="200" height="80" fill="none" stroke={stroke} strokeWidth="2.2" rx="4" />
        <line x1="76" y1="80" x2="106" y2="80" stroke={accent} strokeWidth="3" />
        <line x1="72" y1="72" x2="72" y2="88" stroke={accent} strokeWidth="2" />
        <line x1="110" y1="76" x2="110" y2="84" stroke={accent} strokeWidth="2" />
        <rect x="148" y="68" width="24" height="24" fill="none" stroke={stroke} strokeWidth="2" rx="2" />
        <circle cx="210" cy="80" r="14" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="205" y="84" fontSize="12" fill={stroke}>A</text>
      </svg>
    );
  }

  if (kind === "magnetic") {
    return (
      <svg {...baseProps} aria-label="Magnetic field visual aid">
        <rect x="96" y="52" width="88" height="48" fill="none" stroke={stroke} strokeWidth="2.2" rx="2" />
        <text x="108" y="80" fontSize="14" fontWeight="600" fill="#dc2626">N</text>
        <text x="160" y="80" fontSize="14" fontWeight="600" fill="#2563eb">S</text>
        <path d="M84 56 C40 56,40 96,84 96" fill="none" stroke={accent} strokeWidth="1.8" />
        <path d="M196 56 C240 56,240 96,196 96" fill="none" stroke={accent} strokeWidth="1.8" />
        <path d="M84 62 C50 62,50 90,84 90" fill="none" stroke={accent} strokeWidth="1.2" />
        <path d="M196 62 C230 62,230 90,196 90" fill="none" stroke={accent} strokeWidth="1.2" />
      </svg>
    );
  }

  if (kind === "heart") {
    return (
      <svg {...baseProps} aria-label="Heart diagram visual aid">
        <path d="M90 38 C65 38 52 56 52 74 C52 102 83 118 140 132 C197 118 228 102 228 74 C228 56 215 38 190 38 C171 38 156 49 140 64 C124 49 109 38 90 38 Z" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="140" y1="64" x2="140" y2="126" stroke={accent} strokeWidth="2" />
      </svg>
    );
  }

  return (
    <svg {...baseProps} aria-label="Nephron diagram visual aid">
      <circle cx="92" cy="64" r="18" fill="none" stroke={stroke} strokeWidth="2.2" />
      <path d="M110 64 C160 64 170 84 170 100 C170 120 152 130 138 126 C126 122 122 108 130 100 C136 94 146 96 150 104" fill="none" stroke={stroke} strokeWidth="2.2" />
      <line x1="170" y1="100" x2="216" y2="100" stroke={accent} strokeWidth="2.2" />
    </svg>
  );
}

export function QuestionVisualAid(props: QuestionVisualAidProps): React.ReactElement | null {
  const kind = inferVisualKind(props);
  if (!kind) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        background: "#f7f7f7",
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
