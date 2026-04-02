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
  | "circle-tangent"
  | "circle-sector"
  | "circle-general"
  | "ray"
  | "lens"
  | "circuit"
  | "circuit-parallel"
  | "magnetic"
  | "heart"
  | "nephron"
  | "similar-triangles"
  | "bpt"
  | "pythagoras"
  | "prism"
  | "human-eye"
  | "digestive-system"
  | "neuron"
  | "food-chain"
  | "flower";

function norm(value: string | undefined | null): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .trim();
}

function extractNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function inferVisualKind(props: QuestionVisualAidProps): VisualKind | null {
  const topic = norm(props.topicKey);
  const text = norm(props.questionText);
  const combined = `${topic} ${text}`;

  const visualTrigger =
    /\b(draw|diagram|graph|figure|plot|construct|ray|circuit|labelled|label|structure|cross section)\b/.test(
      combined
    ) || (props.kind || "").toLowerCase() === "case-based";

  const topicNeedsVisual =
    /\b(height and distance|coordinate|circle|lens|mirror|light|electricity|magnetic|life process|human eye|heredity|nephron|kidney|heart|circulation|triangle|similarity|pythagoras|bpt|prism|dispersion|digestive|neuron|food chain|food web|flower|reproduction in plants|tangent|sector|area of circle|circumference)\b/.test(
      combined
    );

  if (!visualTrigger && !topicNeedsVisual) return null;

  if (/\b(flower|stamen|pistil|sepal|petal|ovary|pollination)\b/.test(combined)) return "flower";
  if (/\b(neuron|nerve cell|axon|dendrite|synapse)\b/.test(combined)) return "neuron";
  if (/\b(food chain|food web|trophic|ecological pyramid)\b/.test(combined)) return "food-chain";
  if (/\b(digestive|alimentary|stomach|intestine|oesophagus|peristalsis)\b/.test(combined)) return "digestive-system";
  if (/\b(human eye|eye defect|myopia|hypermetropia|power of accommodation)\b/.test(combined)) return "human-eye";
  if (/\b(prism|dispersion|spectrum|vibgyor|rainbow)\b/.test(combined)) return "prism";
  if (/\b(nephron|kidney|excretion|bowman)\b/.test(combined)) return "nephron";
  if (/\b(heart|circulation|blood flow|atrium|ventricle)\b/.test(combined)) return "heart";
  if (/\b(magnetic|field line|fleming|solenoid|compass)\b/.test(combined)) return "magnetic";
  if (/\b(parallel.{0,8}circuit|circuit.{0,8}parallel)\b/.test(combined)) return "circuit-parallel";
  if (/\b(electric|resistance|ohm|circuit|series circuit)\b/.test(combined)) return "circuit";
  if (/\b(lens|convex lens|concave lens|image formation)\b/.test(combined)) return "lens";
  if (/\b(mirror|refraction|reflection|ray)\b/.test(combined)) return "ray";
  if (/\b(coordinate|graph|distance formula)\b/.test(combined)) return "coordinate";
  if (/\b(sector|arc\s+length|area of sector|major sector|minor sector)\b/.test(combined)) return "circle-sector";
  if (/\b(tangent|tangent to a circle|length of tangent|tangent from external)\b/.test(combined)) return "circle-tangent";
  if (/\b(circle|circumference|area of circle|semicircle|diameter|chord)\b/.test(combined)) return "circle-general";
  if (/\b(height and distance|angle of elevation|angle of depression|top of (a |the )?tower|top of (a |the )?building|shadow|lighthouse)\b/.test(combined))
    return "height-distance";
  if (/\b(bpt|basic proportionality|thales)\b/.test(combined)) return "bpt";
  if (/\b(pythagoras|pythagorean|hypotenuse)\b/.test(combined)) return "pythagoras";
  if (/\b(similar|similarity|aa criterion|sas criterion|sss criterion)\b/.test(combined)) return "similar-triangles";
  if (/\b(triangle|congruence)\b/.test(combined) && visualTrigger) return "right-triangle";

  return null;
}

function svgForKind(kind: VisualKind, questionText: string): React.ReactElement {
  const stroke = "#3c3c3c";
  const accent = "#0ea5e9";
  const faint = "#94a3b8";
  const red = "#dc2626";
  const green = "#22c55e";
  const baseProps = {
    width: "100%",
    height: "auto",
    viewBox: "0 0 400 280",
    role: "img" as const,
  };
  const qt = norm(questionText);

  if (kind === "height-distance") {
    const angle = extractNumber(qt, /(\d+)\s*(?:degree|°|deg)/i) ?? 60;
    return (
      <svg {...baseProps} aria-label="Height and distance visual aid">
        <line x1="60" y1="240" x2="340" y2="240" stroke={stroke} strokeWidth="2" />
        <line x1="300" y1="240" x2="300" y2="50" stroke={stroke} strokeWidth="2.2" />
        <line x1="60" y1="240" x2="300" y2="50" stroke={accent} strokeWidth="2" strokeDasharray="6 3" />
        <rect x="290" y="230" width="10" height="10" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="45" y="256" fontSize="15" fill={stroke} fontWeight="600">A</text>
        <text x="294" y="256" fontSize="15" fill={stroke} fontWeight="600">B</text>
        <text x="306" y="48" fontSize="15" fill={stroke} fontWeight="600">C</text>
        <text x="155" y="235" fontSize="14" fill={accent} fontWeight="600">d (distance)</text>
        <text x="306" y="150" fontSize="14" fill={accent} fontWeight="600">h (height)</text>
        <path d="M 100 240 A 40 40 0 0 0 88 222" fill="none" stroke={accent} strokeWidth="1.5" />
        <text x="104" y="232" fontSize="14" fill={accent} fontWeight="600">{angle}°</text>
      </svg>
    );
  }

  if (kind === "right-triangle") {
    return (
      <svg {...baseProps} aria-label="Right triangle visual aid">
        <polygon points="50,240 350,240 350,50" fill="none" stroke={stroke} strokeWidth="2.2" />
        <rect x="340" y="230" width="10" height="10" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="35" y="256" fontSize="15" fill={stroke} fontWeight="600">A</text>
        <text x="352" y="256" fontSize="15" fill={stroke} fontWeight="600">B</text>
        <text x="352" y="46" fontSize="15" fill={stroke} fontWeight="600">C</text>
        <text x="190" y="260" fontSize="14" fill={accent}>base</text>
        <text x="356" y="155" fontSize="14" fill={green}>height</text>
        <text x="170" y="140" fontSize="14" fill={red}>hypotenuse</text>
      </svg>
    );
  }

  if (kind === "coordinate") {
    return (
      <svg {...baseProps} aria-label="Coordinate geometry visual aid">
        <line x1="40" y1="240" x2="370" y2="240" stroke={stroke} strokeWidth="2" />
        <line x1="55" y1="252" x2="55" y2="25" stroke={stroke} strokeWidth="2" />
        <polygon points="370,240 360,235 360,245" fill={stroke} />
        <polygon points="55,25 50,35 60,35" fill={stroke} />
        <text x="362" y="260" fontSize="14" fill={stroke} fontWeight="600">x</text>
        <text x="35" y="30" fontSize="14" fill={stroke} fontWeight="600">y</text>
        <text x="40" y="256" fontSize="13" fill={faint}>O</text>
        {[1,2,3,4,5].map(i => (
          <React.Fragment key={`gx${i}`}>
            <line x1={55 + i*58} y1="237" x2={55 + i*58} y2="243" stroke={faint} strokeWidth="1" />
            <text x={51 + i*58} y="255" fontSize="10" fill={faint}>{i}</text>
          </React.Fragment>
        ))}
        {[1,2,3].map(i => (
          <React.Fragment key={`gy${i}`}>
            <line x1="52" y1={240 - i*58} x2="58" y2={240 - i*58} stroke={faint} strokeWidth="1" />
            <text x="32" y={244 - i*58} fontSize="10" fill={faint}>{i}</text>
          </React.Fragment>
        ))}
        <circle cx="171" cy="124" r="5" fill={accent} />
        <circle cx="287" cy="66" r="5" fill={accent} />
        <line x1="171" y1="124" x2="287" y2="66" stroke={accent} strokeWidth="1.8" strokeDasharray="5 3" />
        <text x="177" y="118" fontSize="14" fill={stroke} fontWeight="600">P(2,2)</text>
        <text x="293" y="60" fontSize="14" fill={stroke} fontWeight="600">Q(4,3)</text>
      </svg>
    );
  }

  if (kind === "circle-sector") {
    const radius = extractNumber(qt, /radius\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?/i) ?? 7;
    const angle = extractNumber(qt, /angle\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(?:degree|°|deg)?/i)
      ?? extractNumber(qt, /(\d+)\s*(?:degree|°)/i) ?? 60;
    const angleRad = (angle * Math.PI) / 180;
    const cx = 200, cy = 155, r = 100;
    const ex = cx + r * Math.cos(-angleRad / 2);
    const ey = cy - r * Math.sin(angleRad / 2);
    const fx = cx + r * Math.cos(angleRad / 2);
    const fy = cy + r * Math.sin(angleRad / 2);
    const largeArc = angle > 180 ? 1 : 0;
    const midAngle = 0;
    const labelX = cx + (r * 0.5) * Math.cos(midAngle);
    const labelY = cy - 10;
    const radiusMidX = cx + (r * 0.55) * Math.cos(-angleRad / 2);
    const radiusMidY = cy - (r * 0.55) * Math.sin(angleRad / 2);

    return (
      <svg {...baseProps} aria-label={`Sector of circle: radius ${radius} cm, angle ${angle}°`}>
        <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={stroke} strokeWidth="2.2" />
        <line x1={cx} y1={cy} x2={fx} y2={fy} stroke={stroke} strokeWidth="2.2" />
        <path d={`M${ex},${ey} A${r},${r} 0 ${largeArc},1 ${fx},${fy}`} fill="none" stroke={accent} strokeWidth="2.2" />
        <path d={`M${cx + 30 * Math.cos(-angleRad / 2)},${cy - 30 * Math.sin(angleRad / 2)} A30,30 0 0,1 ${cx + 30 * Math.cos(angleRad / 2)},${cy + 30 * Math.sin(angleRad / 2)}`}
          fill="none" stroke={red} strokeWidth="1.8" />
        <text x={labelX - 10} y={labelY} fontSize="15" fill={red} fontWeight="700">{angle}°</text>
        <circle cx={cx} cy={cy} r="3" fill={stroke} />
        <text x={cx - 10} y={cy + 18} fontSize="15" fill={stroke} fontWeight="600">O</text>
        <text x={radiusMidX - 5} y={radiusMidY - 8} fontSize="14" fill={accent} fontWeight="600">{radius} cm</text>
        <text x={ex + 4} y={ey - 4} fontSize="14" fill={stroke} fontWeight="600">A</text>
        <text x={fx + 4} y={fy + 14} fontSize="14" fill={stroke} fontWeight="600">B</text>
        <text x={140} y={30} fontSize="14" fill={faint}>Sector AOB</text>
        <line x1={cx + r * 0.35 * Math.cos(0)} y1={cy} x2={cx + r * 0.65 * Math.cos(0)} y2={cy} stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
      </svg>
    );
  }

  if (kind === "circle-tangent") {
    return (
      <svg {...baseProps} aria-label="Tangent to a circle">
        <circle cx="180" cy="140" r="80" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="180" cy="140" r="3" fill={stroke} />
        <text x="170" y="132" fontSize="15" fill={stroke} fontWeight="600">O</text>
        <line x1="180" y1="140" x2="260" y2="140" stroke={accent} strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="215" y="158" fontSize="13" fill={accent}>r</text>
        <line x1="260" y1="60" x2="260" y2="220" stroke={stroke} strokeWidth="2.2" />
        <rect x="250" y="130" width="10" height="10" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="268" y="138" fontSize="15" fill={stroke} fontWeight="600">T</text>
        <line x1="260" y1="140" x2="340" y2="80" stroke={accent} strokeWidth="2" />
        <text x="344" y="78" fontSize="15" fill={stroke} fontWeight="600">P</text>
        <line x1="180" y1="140" x2="340" y2="80" stroke={faint} strokeWidth="1.5" strokeDasharray="4 2" />
        <text x="110" y="38" fontSize="13" fill={accent} fontWeight="600">OT ⊥ tangent at T</text>
        <text x="275" y="118" fontSize="13" fill={faint}>tangent</text>
      </svg>
    );
  }

  if (kind === "circle-general") {
    const radius = extractNumber(qt, /radius\s*(?:=|of|is)?\s*(\d+(?:\.\d+)?)\s*(?:cm|m|mm)?/i);
    const rLabel = radius ? `${radius} cm` : "r";
    return (
      <svg {...baseProps} aria-label="Circle diagram">
        <circle cx="200" cy="140" r="90" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="200" cy="140" r="3" fill={stroke} />
        <text x="190" y="132" fontSize="15" fill={stroke} fontWeight="600">O</text>
        <line x1="200" y1="140" x2="290" y2="140" stroke={accent} strokeWidth="2" />
        <text x="238" y="158" fontSize="14" fill={accent} fontWeight="600">{rLabel}</text>
        <line x1="110" y1="140" x2="290" y2="140" stroke={faint} strokeWidth="1" strokeDasharray="4 2" />
        <text x="185" y="168" fontSize="12" fill={faint}>diameter</text>
        <text x="292" y="142" fontSize="14" fill={stroke} fontWeight="600">A</text>
        <text x="98" y="142" fontSize="14" fill={stroke} fontWeight="600">B</text>
      </svg>
    );
  }

  if (kind === "ray") {
    return (
      <svg {...baseProps} aria-label="Light ray diagram (reflection/refraction)">
        <line x1="20" y1="160" x2="380" y2="160" stroke={stroke} strokeWidth="2" />
        <line x1="200" y1="40" x2="200" y2="250" stroke={faint} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="60" y1="100" x2="200" y2="160" stroke={accent} strokeWidth="2" />
        <polygon points="190,155 178,148 182,158" fill={accent} />
        <line x1="200" y1="160" x2="350" y2="95" stroke={red} strokeWidth="2" />
        <polygon points="350,95 336,92 340,102" fill={red} />
        <text x="186" y="36" fontSize="15" fill={stroke} fontWeight="600">N</text>
        <text x="186" y="268" fontSize="15" fill={stroke} fontWeight="600">N'</text>
        <path d="M 200 130 A 30 30 0 0 0 178 118" fill="none" stroke={accent} strokeWidth="1.5" />
        <text x="155" y="110" fontSize="14" fill={accent} fontWeight="600">i</text>
        <path d="M 200 130 A 30 30 0 0 1 224 118" fill="none" stroke={red} strokeWidth="1.5" />
        <text x="230" y="110" fontSize="14" fill={red} fontWeight="600">r</text>
        <text x="50" y="90" fontSize="13" fill={accent}>Incident ray</text>
        <text x="290" y="86" fontSize="13" fill={red}>Reflected ray</text>
        <text x="250" y="178" fontSize="13" fill={faint}>Mirror / Surface</text>
      </svg>
    );
  }

  if (kind === "lens") {
    return (
      <svg {...baseProps} aria-label="Convex lens ray diagram">
        <line x1="20" y1="140" x2="380" y2="140" stroke={stroke} strokeWidth="1.5" />
        <ellipse cx="200" cy="140" rx="12" ry="85" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="200" cy="140" r="3" fill={stroke} />
        <circle cx="130" cy="140" r="4" fill={accent} />
        <circle cx="270" cy="140" r="4" fill={accent} />
        <circle cx="60" cy="140" r="3" fill={accent} />
        <circle cx="330" cy="140" r="3" fill={accent} />
        <text x="193" y="130" fontSize="13" fill={stroke} fontWeight="600">O</text>
        <text x="122" y="160" fontSize="13" fill={accent} fontWeight="600">F</text>
        <text x="262" y="160" fontSize="13" fill={accent} fontWeight="600">F'</text>
        <text x="50" y="160" fontSize="13" fill={accent}>2F</text>
        <text x="320" y="160" fontSize="13" fill={accent}>2F'</text>
        <line x1="80" y1="200" x2="80" y2="80" stroke={green} strokeWidth="2.5" />
        <polygon points="80,80 75,92 85,92" fill={green} />
        <text x="56" y="75" fontSize="13" fill={green} fontWeight="600">Object</text>
        <line x1="80" y1="80" x2="200" y2="80" stroke={red} strokeWidth="1.5" />
        <line x1="200" y1="80" x2="330" y2="140" stroke={red} strokeWidth="1.5" />
        <polygon points="330,140 320,134 322,144" fill={red} />
        <line x1="80" y1="80" x2="330" y2="175" stroke={accent} strokeWidth="1.5" />
        <polygon points="330,175 320,168 322,178" fill={accent} />
        <line x1="80" y1="140" x2="200" y2="140" stroke={faint} strokeWidth="1" />
        <line x1="200" y1="140" x2="330" y2="175" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
        <line x1="330" y1="140" x2="330" y2="175" stroke={green} strokeWidth="2.5" />
        <polygon points="330,175 325,163 335,163" fill={green} />
        <text x="336" y="180" fontSize="13" fill={green} fontWeight="600">Image</text>
        <text x="100" y="28" fontSize="12" fill={faint}>Ray 1: parallel → through F'</text>
        <text x="100" y="265" fontSize="12" fill={faint}>Ray 2: through centre → straight</text>
      </svg>
    );
  }

  if (kind === "circuit") {
    return (
      <svg {...baseProps} aria-label="Series electric circuit diagram">
        <rect x="60" y="50" width="280" height="180" fill="none" stroke={stroke} strokeWidth="2.2" rx="8" />
        <line x1="82" y1="140" x2="94" y2="140" stroke={accent} strokeWidth="3" />
        <line x1="82" y1="128" x2="82" y2="152" stroke={accent} strokeWidth="3" />
        <line x1="98" y1="133" x2="98" y2="147" stroke={accent} strokeWidth="2" />
        <text x="78" y="170" fontSize="12" fill={accent} fontWeight="600">+ −</text>
        <text x="72" y="120" fontSize="13" fill={stroke} fontWeight="600">Battery</text>
        <path d="M190 130 L200 110 L210 150 L220 110 L230 150 L240 130" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="200" y="105" fontSize="13" fill={stroke} fontWeight="600">R</text>
        <circle cx="300" cy="140" r="16" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="294" y="146" fontSize="14" fill={stroke} fontWeight="600">A</text>
        <text x="280" y="118" fontSize="12" fill={faint}>Ammeter</text>
        <line x1="148" y1="50" x2="148" y2="38" stroke={stroke} strokeWidth="2" />
        <line x1="148" y1="38" x2="172" y2="38" stroke={stroke} strokeWidth="2" />
        <line x1="172" y1="38" x2="172" y2="50" stroke={stroke} strokeWidth="2" />
        <circle cx="160" cy="38" r="3" fill={stroke} />
        <text x="150" y="30" fontSize="13" fill={stroke} fontWeight="600">S</text>
        <polygon points="340,100 345,92 335,92" fill={accent} />
        <polygon points="60,180 55,188 65,188" fill={accent} />
        <text x="348" y="100" fontSize="12" fill={accent} fontWeight="600">I</text>
        <text x="36" y="188" fontSize="12" fill={accent} fontWeight="600">I</text>
      </svg>
    );
  }

  if (kind === "circuit-parallel") {
    return (
      <svg {...baseProps} aria-label="Parallel electric circuit diagram">
        <line x1="60" y1="40" x2="340" y2="40" stroke={stroke} strokeWidth="2.2" />
        <line x1="60" y1="240" x2="340" y2="240" stroke={stroke} strokeWidth="2.2" />
        <line x1="60" y1="40" x2="60" y2="240" stroke={stroke} strokeWidth="2.2" />
        <line x1="340" y1="40" x2="340" y2="240" stroke={stroke} strokeWidth="2.2" />
        <line x1="82" y1="140" x2="94" y2="140" stroke={accent} strokeWidth="3" />
        <line x1="82" y1="128" x2="82" y2="152" stroke={accent} strokeWidth="3" />
        <line x1="98" y1="133" x2="98" y2="147" stroke={accent} strokeWidth="2" />
        <text x="72" y="170" fontSize="12" fill={stroke} fontWeight="600">Battery</text>
        <line x1="160" y1="40" x2="160" y2="240" stroke={faint} strokeWidth="1" strokeDasharray="4 3" />
        <line x1="260" y1="40" x2="260" y2="240" stroke={faint} strokeWidth="1" strokeDasharray="4 3" />
        <path d="M175 88 L185 68 L195 108 L205 68 L215 108 L225 88" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="192" y="58" fontSize="14" fill={stroke} fontWeight="600">R₁</text>
        <path d="M175 185 L185 165 L195 205 L205 165 L215 205 L225 185" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="192" y="155" fontSize="14" fill={stroke} fontWeight="600">R₂</text>
        <line x1="160" y1="88" x2="175" y2="88" stroke={stroke} strokeWidth="2" />
        <line x1="225" y1="88" x2="260" y2="88" stroke={stroke} strokeWidth="2" />
        <line x1="160" y1="185" x2="175" y2="185" stroke={stroke} strokeWidth="2" />
        <line x1="225" y1="185" x2="260" y2="185" stroke={stroke} strokeWidth="2" />
        <polygon points="340,80 345,72 335,72" fill={accent} />
        <polygon points="60,200 55,208 65,208" fill={accent} />
        <text x="348" y="82" fontSize="12" fill={accent} fontWeight="600">I</text>
        <text x="36" y="208" fontSize="12" fill={accent} fontWeight="600">I</text>
      </svg>
    );
  }

  if (kind === "magnetic") {
    return (
      <svg {...baseProps} aria-label="Magnetic field lines of a bar magnet">
        <rect x="130" y="108" width="140" height="60" fill="none" stroke={stroke} strokeWidth="2.2" rx="4" />
        <rect x="130" y="108" width="70" height="60" fill="#fef2f2" stroke="none" />
        <rect x="200" y="108" width="70" height="60" fill="#eff6ff" stroke="none" />
        <rect x="130" y="108" width="140" height="60" fill="none" stroke={stroke} strokeWidth="2.2" rx="4" />
        <text x="152" y="145" fontSize="18" fontWeight="800" fill={red}>N</text>
        <text x="222" y="145" fontSize="18" fontWeight="800" fill="#2563eb">S</text>
        <path d="M128 115 C60 80,40 190,128 165" fill="none" stroke={accent} strokeWidth="1.8" />
        <polygon points="128,160 134,168 134,154" fill={accent} />
        <path d="M272 115 C340 80,360 190,272 165" fill="none" stroke={accent} strokeWidth="1.8" />
        <polygon points="272,120 266,112 266,126" fill={accent} />
        <path d="M128 100 C30 60,10 210,128 178" fill="none" stroke={accent} strokeWidth="1.3" />
        <polygon points="128,173 134,181 134,167" fill={accent} />
        <path d="M272 100 C370 60,390 210,272 178" fill="none" stroke={accent} strokeWidth="1.3" />
        <polygon points="272,105 266,97 266,111" fill={accent} />
        <path d="M128 85 C10 30,-10 240,128 192" fill="none" stroke={accent} strokeWidth="1" />
        <polygon points="128,187 134,195 134,181" fill={accent} />
        <path d="M272 85 C390 30,410 240,272 192" fill="none" stroke={accent} strokeWidth="1" />
        <polygon points="272,90 266,82 266,96" fill={accent} />
        <text x="140" y="250" fontSize="13" fill={faint}>Field lines: N → S (outside)</text>
      </svg>
    );
  }

  if (kind === "heart") {
    return (
      <svg {...baseProps} aria-label="Human heart — 4 chambers with blood flow">
        <path d="M200 30 C120 30 70 60 70 120 C70 190 130 230 200 260 C270 230 330 190 330 120 C330 60 280 30 200 30Z" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="200" y1="35" x2="200" y2="255" stroke={stroke} strokeWidth="1.5" />
        <line x1="75" y1="130" x2="325" y2="130" stroke={stroke} strokeWidth="1.5" />
        <text x="110" y="95" fontSize="15" fontWeight="700" fill="#2563eb">RA</text>
        <text x="240" y="95" fontSize="15" fontWeight="700" fill={red}>LA</text>
        <text x="110" y="175" fontSize="15" fontWeight="700" fill="#2563eb">RV</text>
        <text x="240" y="175" fontSize="15" fontWeight="700" fill={red}>LV</text>
        <text x="130" y="126" fontSize="10" fill={faint}>Tricuspid</text>
        <text x="215" y="126" fontSize="10" fill={faint}>Bicuspid</text>
        <path d="M100 40 L100 10" stroke="#2563eb" strokeWidth="2" fill="none" />
        <polygon points="100,10 95,20 105,20" fill="#2563eb" />
        <text x="60" y="8" fontSize="12" fill="#2563eb" fontWeight="600">SVC</text>
        <path d="M130 40 L130 14" stroke="#2563eb" strokeWidth="2" fill="none" />
        <polygon points="130,14 125,24 135,24" fill="#2563eb" />
        <text x="134" y="12" fontSize="12" fill="#2563eb" fontWeight="600">IVC</text>
        <path d="M200 30 L200 6" stroke={red} strokeWidth="2.5" fill="none" />
        <polygon points="200,6 195,16 205,16" fill={red} />
        <text x="206" y="10" fontSize="12" fill={red} fontWeight="700">Aorta</text>
        <path d="M160 50 L145 20" stroke="#2563eb" strokeWidth="2" fill="none" />
        <polygon points="145,20 152,28 156,18" fill="#2563eb" />
        <text x="80" y="25" fontSize="12" fill="#2563eb" fontWeight="600">PA</text>
        <path d="M260 50 L275 20" stroke={red} strokeWidth="2" fill="none" />
        <polygon points="275,20 268,28 280,22" fill={red} />
        <text x="280" y="18" fontSize="12" fill={red} fontWeight="600">PV</text>
        <rect x="60" y="264" width="12" height="8" fill="#2563eb" rx="2" />
        <text x="76" y="272" fontSize="11" fill="#2563eb">Deoxygenated</text>
        <rect x="200" y="264" width="12" height="8" fill={red} rx="2" />
        <text x="216" y="272" fontSize="11" fill={red}>Oxygenated</text>
      </svg>
    );
  }

  if (kind === "nephron") {
    return (
      <svg {...baseProps} aria-label="Nephron with labelled parts">
        <circle cx="80" cy="85" r="30" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="80" cy="85" r="14" fill="none" stroke={accent} strokeWidth="1.8" strokeDasharray="3 2" />
        <text x="56" y="52" fontSize="12" fill={stroke} fontWeight="700">Bowman's</text>
        <text x="60" y="65" fontSize="12" fill={stroke} fontWeight="700">Capsule</text>
        <line x1="64" y1="85" x2="42" y2="85" stroke={accent} strokeWidth="2" />
        <polygon points="42,85 50,80 50,90" fill={accent} />
        <text x="4" y="82" fontSize="11" fill={accent} fontWeight="600">Afferent</text>
        <line x1="96" y1="85" x2="118" y2="85" stroke={red} strokeWidth="2" />
        <polygon points="118,85 110,80 110,90" fill={red} />
        <text x="96" y="75" fontSize="11" fill={red} fontWeight="600">Efferent</text>
        <text x="64" y="108" fontSize="10" fill={faint}>Glomerulus</text>
        <path d="M110 85 C140 85 160 65 185 65 C210 65 220 85 240 85" fill="none" stroke={green} strokeWidth="2.5" />
        <text x="155" y="55" fontSize="13" fill={green} fontWeight="700">PCT</text>
        <path d="M240 85 C260 85 270 130 270 165 C270 210 250 240 230 240 C210 240 210 210 210 165 C210 130 220 100 240 85" fill="none" stroke={accent} strokeWidth="2.2" />
        <text x="278" y="165" fontSize="13" fill={accent} fontWeight="700">Loop of</text>
        <text x="278" y="180" fontSize="13" fill={accent} fontWeight="700">Henle</text>
        <path d="M240 85 C250 65 270 55 290 55 C315 55 335 75 335 105" fill="none" stroke={red} strokeWidth="2.5" />
        <text x="288" y="46" fontSize="13" fill={red} fontWeight="700">DCT</text>
        <line x1="335" y1="105" x2="335" y2="260" stroke={stroke} strokeWidth="2.5" />
        <text x="342" y="185" fontSize="12" fill={stroke} fontWeight="700">Collecting</text>
        <text x="342" y="200" fontSize="12" fill={stroke} fontWeight="700">Duct</text>
        <polygon points="335,260 330,248 340,248" fill={stroke} />
        <text x="312" y="275" fontSize="12" fill={faint}>→ Ureter</text>
      </svg>
    );
  }

  if (kind === "similar-triangles") {
    return (
      <svg {...baseProps} aria-label="Similar triangles — △ABC ~ △PQR (proportional)">
        <polygon points="30,240 190,240 110,60" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="18" y="258" fontSize="15" fill={stroke} fontWeight="700">A</text>
        <text x="192" y="258" fontSize="15" fill={stroke} fontWeight="700">B</text>
        <text x="102" y="52" fontSize="15" fill={stroke} fontWeight="700">C</text>
        <path d="M55 226 A22 22 0 0 1 72 210" fill="none" stroke={accent} strokeWidth="2.5" />
        <path d="M166 226 A20 20 0 0 0 152 210" fill="none" stroke={red} strokeWidth="2.5" />
        <path d="M110 82 A16 16 0 0 1 98 82" fill="none" stroke={green} strokeWidth="2.5" />
        <text x="56" y="170" fontSize="14" fill={accent} fontWeight="600">b</text>
        <text x="150" y="170" fontSize="14" fill={accent} fontWeight="600">a</text>
        <text x="100" y="258" fontSize="14" fill={accent} fontWeight="600">c</text>
        <polygon points="260,240 370,240 330,130" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="248" y="258" fontSize="15" fill={stroke} fontWeight="700">P</text>
        <text x="372" y="258" fontSize="15" fill={stroke} fontWeight="700">Q</text>
        <text x="324" y="122" fontSize="15" fill={stroke} fontWeight="700">R</text>
        <path d="M278 228 A16 16 0 0 1 290 216" fill="none" stroke={accent} strokeWidth="2.5" />
        <path d="M352 228 A15 15 0 0 0 342 216" fill="none" stroke={red} strokeWidth="2.5" />
        <path d="M330 148 A12 12 0 0 1 322 148" fill="none" stroke={green} strokeWidth="2.5" />
        <text x="280" y="198" fontSize="13" fill={faint}>kb</text>
        <text x="350" y="198" fontSize="13" fill={faint}>ka</text>
        <text x="308" y="258" fontSize="13" fill={faint}>kc</text>
        <text x="90" y="25" fontSize="14" fill={accent} fontWeight="700">△ABC ~ △PQR</text>
        <text x="90" y="275" fontSize="12" fill={faint}>Corresponding angles are equal, sides are proportional (ratio k)</text>
      </svg>
    );
  }

  if (kind === "bpt") {
    return (
      <svg {...baseProps} aria-label="Basic Proportionality Theorem — DE ∥ AB">
        <polygon points="50,250 350,250 200,30" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="115" y1="165" x2="285" y2="165" stroke={accent} strokeWidth="2.5" />
        <text x="35" y="268" fontSize="15" fill={stroke} fontWeight="700">A</text>
        <text x="352" y="268" fontSize="15" fill={stroke} fontWeight="700">B</text>
        <text x="192" y="24" fontSize="15" fill={stroke} fontWeight="700">C</text>
        <text x="96" y="162" fontSize="15" fill={accent} fontWeight="700">D</text>
        <text x="290" y="162" fontSize="15" fill={accent} fontWeight="700">E</text>
        <text x="72" y="216" fontSize="13" fill={faint} fontWeight="600">AD</text>
        <text x="148" y="100" fontSize="13" fill={faint} fontWeight="600">CD</text>
        <text x="310" y="216" fontSize="13" fill={faint} fontWeight="600">BE</text>
        <text x="244" y="100" fontSize="13" fill={faint} fontWeight="600">CE</text>
        <text x="155" y="158" fontSize="12" fill={accent} fontWeight="600">DE ∥ AB</text>
        <text x="80" y="280" fontSize="13" fill={accent} fontWeight="700">BPT: CD/DA = CE/EB</text>
      </svg>
    );
  }

  if (kind === "pythagoras") {
    return (
      <svg {...baseProps} aria-label="Pythagoras theorem — a² + b² = c²">
        <polygon points="60,240 300,240 60,70" fill="none" stroke={stroke} strokeWidth="2.2" />
        <rect x="60" y="226" width="14" height="14" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="42" y="258" fontSize="15" fill={stroke} fontWeight="700">B</text>
        <text x="304" y="258" fontSize="15" fill={stroke} fontWeight="700">C</text>
        <text x="42" y="64" fontSize="15" fill={stroke} fontWeight="700">A</text>
        <text x="165" y="260" fontSize="15" fill={accent} fontWeight="700">a (base)</text>
        <text x="26" y="162" fontSize="15" fill={green} fontWeight="700">b</text>
        <text x="188" y="148" fontSize="15" fill={red} fontWeight="700">c (hyp)</text>
        <text x="90" y="30" fontSize="16" fill={stroke} fontWeight="800">a² + b² = c²</text>
        <text x="90" y="48" fontSize="12" fill={faint}>(Pythagoras Theorem)</text>
      </svg>
    );
  }

  if (kind === "prism") {
    return (
      <svg {...baseProps} aria-label="Dispersion of white light through a glass prism">
        <polygon points="200,25 120,235 280,235" fill="none" stroke={stroke} strokeWidth="2.5" />
        <line x1="20" y1="140" x2="155" y2="140" stroke={faint} strokeWidth="2" />
        <polygon points="155,140 145,135 145,145" fill={faint} />
        <text x="30" y="132" fontSize="13" fill={stroke} fontWeight="600">White light</text>
        <line x1="245" y1="128" x2="375" y2="72" stroke="#dc2626" strokeWidth="2" />
        <line x1="245" y1="133" x2="375" y2="92" stroke="#f97316" strokeWidth="2" />
        <line x1="245" y1="138" x2="375" y2="112" stroke="#eab308" strokeWidth="2" />
        <line x1="245" y1="143" x2="375" y2="132" stroke="#22c55e" strokeWidth="2" />
        <line x1="245" y1="148" x2="375" y2="152" stroke="#0ea5e9" strokeWidth="2" />
        <line x1="245" y1="153" x2="375" y2="172" stroke="#6366f1" strokeWidth="2" />
        <line x1="245" y1="158" x2="375" y2="192" stroke="#7c3aed" strokeWidth="2" />
        <text x="380" y="76" fontSize="12" fill="#dc2626" fontWeight="600">Red</text>
        <text x="380" y="96" fontSize="12" fill="#f97316" fontWeight="600">Orange</text>
        <text x="380" y="116" fontSize="12" fill="#eab308" fontWeight="600">Yellow</text>
        <text x="380" y="136" fontSize="12" fill="#22c55e" fontWeight="600">Green</text>
        <text x="380" y="156" fontSize="12" fill="#0ea5e9" fontWeight="600">Blue</text>
        <text x="380" y="176" fontSize="12" fill="#6366f1" fontWeight="600">Indigo</text>
        <text x="380" y="196" fontSize="12" fill="#7c3aed" fontWeight="600">Violet</text>
        <text x="165" y="260" fontSize="14" fill={stroke} fontWeight="600">Glass Prism</text>
      </svg>
    );
  }

  if (kind === "human-eye") {
    return (
      <svg {...baseProps} aria-label="Human eye cross-section">
        <ellipse cx="200" cy="140" rx="155" ry="100" fill="none" stroke={stroke} strokeWidth="2.2" />
        <ellipse cx="95" cy="140" rx="22" ry="55" fill="none" stroke={accent} strokeWidth="2.2" />
        <text x="78" y="92" fontSize="12" fill={accent} fontWeight="700">Cornea</text>
        <ellipse cx="140" cy="140" rx="10" ry="38" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="124" y="192" fontSize="12" fill={stroke} fontWeight="700">Lens</text>
        <circle cx="140" cy="140" r="9" fill="none" stroke={stroke} strokeWidth="1.5" />
        <text x="128" y="125" fontSize="10" fill={faint}>Pupil</text>
        <text x="102" y="146" fontSize="10" fill={faint}>Iris</text>
        <line x1="155" y1="140" x2="335" y2="140" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
        <path d="M320 60 C352 60 355 220 320 220" fill="none" stroke={red} strokeWidth="3" />
        <text x="332" y="144" fontSize="12" fill={red} fontWeight="700">Retina</text>
        <line x1="345" y1="140" x2="395" y2="140" stroke={green} strokeWidth="3.5" />
        <text x="355" y="130" fontSize="12" fill={green} fontWeight="700">Optic</text>
        <text x="355" y="155" fontSize="12" fill={green} fontWeight="700">Nerve</text>
        <line x1="15" y1="115" x2="95" y2="140" stroke={accent} strokeWidth="1.5" />
        <polygon points="95,140 85,134 87,144" fill={accent} />
        <text x="15" y="108" fontSize="12" fill={accent} fontWeight="600">Light →</text>
      </svg>
    );
  }

  if (kind === "digestive-system") {
    return (
      <svg {...baseProps} aria-label="Human digestive system (simplified)">
        <ellipse cx="200" cy="28" rx="28" ry="14" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="186" y="33" fontSize="12" fill={stroke} fontWeight="700">Mouth</text>
        <line x1="200" y1="42" x2="200" y2="72" stroke={stroke} strokeWidth="2.2" />
        <text x="210" y="62" fontSize="11" fill={faint}>Oesophagus</text>
        <ellipse cx="200" cy="102" rx="48" ry="28" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="176" y="108" fontSize="14" fill={red} fontWeight="700">Stomach</text>
        <path d="M200 130 C200 148 175 160 175 185 C175 210 225 218 225 240 C225 248 210 250 200 250" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="232" y="175" fontSize="12" fill={green} fontWeight="700">Small</text>
        <text x="232" y="190" fontSize="12" fill={green} fontWeight="700">Intestine</text>
        <path d="M200 250 C180 250 155 242 140 235" fill="none" stroke={stroke} strokeWidth="2.5" />
        <ellipse cx="130" cy="235" rx="28" ry="14" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="80" y="222" fontSize="12" fill={accent} fontWeight="700">Large</text>
        <text x="75" y="237" fontSize="12" fill={accent} fontWeight="700">Intestine</text>
        <line x1="130" y1="249" x2="130" y2="270" stroke={stroke} strokeWidth="2.2" />
        <text x="138" y="268" fontSize="12" fill={stroke} fontWeight="700">Rectum</text>
        <polygon points="130,270 125,260 135,260" fill={stroke} />
        <rect x="265" y="88" width="52" height="28" fill="none" stroke={faint} strokeWidth="1.5" rx="4" />
        <text x="276" y="106" fontSize="11" fill={faint} fontWeight="600">Liver</text>
        <line x1="265" y1="102" x2="248" y2="102" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
        <rect x="265" y="126" width="58" height="24" fill="none" stroke={faint} strokeWidth="1.5" rx="4" />
        <text x="270" y="142" fontSize="11" fill={faint} fontWeight="600">Pancreas</text>
        <line x1="265" y1="138" x2="248" y2="130" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
      </svg>
    );
  }

  if (kind === "neuron") {
    return (
      <svg {...baseProps} aria-label="Structure of a neuron">
        <path d="M30 100 L55 78 L42 100 L58 88 L46 112 L62 95 L52 118 L68 108" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M30 165 L55 185 L42 165 L58 175 L46 150 L62 168 L52 142 L68 155" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M30 132 L58 122 L48 132 L64 128" fill="none" stroke={stroke} strokeWidth="1.8" />
        <text x="2" y="138" fontSize="12" fill={accent} fontWeight="700">Dendrites</text>
        <circle cx="100" cy="132" r="32" fill="none" stroke={stroke} strokeWidth="2.5" />
        <circle cx="100" cy="132" r="13" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="88" y="137" fontSize="10" fill={faint} fontWeight="600">Nucleus</text>
        <text x="72" y="180" fontSize="12" fill={stroke} fontWeight="700">Cell Body</text>
        <line x1="132" y1="132" x2="305" y2="132" stroke={stroke} strokeWidth="2.8" />
        <text x="200" y="124" fontSize="14" fill={green} fontWeight="700">Axon</text>
        <path d="M155 115 C160 98 182 98 187 115" fill="none" stroke={faint} strokeWidth="2" />
        <path d="M210 115 C215 98 237 98 242 115" fill="none" stroke={faint} strokeWidth="2" />
        <path d="M265 115 C270 98 288 98 293 115" fill="none" stroke={faint} strokeWidth="2" />
        <text x="178" y="95" fontSize="10" fill={faint} fontWeight="600">Myelin sheath</text>
        <path d="M305 132 L325 110 L318 132 L335 115 L328 138 L345 120 L338 142" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M305 132 L325 155 L318 132 L335 148 L328 125 L345 142 L338 122" fill="none" stroke={stroke} strokeWidth="1.8" />
        <text x="316" y="170" fontSize="12" fill={red} fontWeight="700">Axon</text>
        <text x="316" y="185" fontSize="12" fill={red} fontWeight="700">Terminals</text>
        <line x1="345" y1="132" x2="368" y2="132" stroke={faint} strokeWidth="1.5" strokeDasharray="3 2" />
        <text x="352" y="124" fontSize="11" fill={faint} fontWeight="600">Synapse</text>
        <polygon points="305,132 297,126 297,138" fill={accent} />
        <text x="155" y="155" fontSize="10" fill={accent} fontWeight="600">Signal direction →</text>
      </svg>
    );
  }

  if (kind === "food-chain") {
    return (
      <svg {...baseProps} aria-label="Ecological pyramid — trophic levels">
        <polygon points="200,20 45,255 355,255" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="85" y1="196" x2="315" y2="196" stroke={stroke} strokeWidth="1.5" />
        <line x1="125" y1="138" x2="275" y2="138" stroke={stroke} strokeWidth="1.5" />
        <line x1="162" y1="82" x2="238" y2="82" stroke={stroke} strokeWidth="1.5" />
        <text x="138" y="234" fontSize="14" fill={green} fontWeight="700">Producers</text>
        <text x="145" y="252" fontSize="11" fill={faint}>(Plants, Algae)</text>
        <text x="115" y="172" fontSize="13" fill={accent} fontWeight="700">Primary Consumers</text>
        <text x="148" y="188" fontSize="11" fill={faint}>(Herbivores)</text>
        <text x="136" y="118" fontSize="13" fill={red} fontWeight="700">Secondary</text>
        <text x="153" y="134" fontSize="11" fill={faint}>(Carnivores)</text>
        <text x="162" y="60" fontSize="13" fill={stroke} fontWeight="700">Tertiary</text>
        <text x="155" y="76" fontSize="11" fill={faint}>(Top predators)</text>
        <polygon points="380,55 375,75 385,75" fill={green} />
        <line x1="380" y1="75" x2="380" y2="255" stroke={green} strokeWidth="2" />
        <text x="362" y="48" fontSize="12" fill={green} fontWeight="600">Energy ↑</text>
      </svg>
    );
  }

  if (kind === "flower") {
    return (
      <svg {...baseProps} aria-label="Flower cross-section — reproductive parts">
        <line x1="200" y1="278" x2="200" y2="182" stroke={green} strokeWidth="3.5" />
        <text x="212" y="268" fontSize="12" fill={green} fontWeight="700">Stem</text>
        <ellipse cx="200" cy="188" rx="22" ry="10" fill="none" stroke={green} strokeWidth="2.2" />
        <text x="228" y="192" fontSize="12" fill={green} fontWeight="700">Sepal</text>
        <path d="M138 182 C115 140 138 100 170 88" fill="none" stroke="#f472b6" strokeWidth="2.5" />
        <path d="M262 182 C285 140 262 100 230 88" fill="none" stroke="#f472b6" strokeWidth="2.5" />
        <path d="M170 88 C182 82 192 78 200 76" fill="none" stroke="#f472b6" strokeWidth="2.5" />
        <path d="M230 88 C218 82 208 78 200 76" fill="none" stroke="#f472b6" strokeWidth="2.5" />
        <text x="100" y="135" fontSize="12" fill="#f472b6" fontWeight="700">Petal</text>
        <text x="268" y="135" fontSize="12" fill="#f472b6" fontWeight="700">Petal</text>
        <line x1="200" y1="178" x2="200" y2="56" stroke={stroke} strokeWidth="2" />
        <circle cx="200" cy="52" r="7" fill="none" stroke={red} strokeWidth="2.2" />
        <text x="212" y="48" fontSize="12" fill={red} fontWeight="700">Stigma</text>
        <text x="212" y="88" fontSize="12" fill={stroke} fontWeight="600">Style</text>
        <ellipse cx="200" cy="172" rx="16" ry="10" fill="none" stroke={accent} strokeWidth="2.2" />
        <text x="222" y="170" fontSize="12" fill={accent} fontWeight="700">Ovary</text>
        <circle cx="195" cy="172" r="3" fill={faint} />
        <circle cx="205" cy="172" r="3" fill={faint} />
        <text x="222" y="182" fontSize="10" fill={faint}>Ovules</text>
        <line x1="158" y1="142" x2="148" y2="88" stroke="#eab308" strokeWidth="2" />
        <circle cx="148" cy="82" r="5" fill="#eab308" />
        <text x="108" y="80" fontSize="12" fill="#eab308" fontWeight="700">Anther</text>
        <text x="130" y="122" fontSize="10" fill="#eab308" fontWeight="600">Filament</text>
        <text x="42" y="108" fontSize="11" fill={faint} fontWeight="600">Stamen →</text>
        <text x="212" y="106" fontSize="11" fill={faint} fontWeight="600">← Pistil</text>
      </svg>
    );
  }

  return (
    <svg {...baseProps} aria-label="Diagram visual aid">
      <text x="200" y="140" fontSize="14" fill={faint} textAnchor="middle">Diagram not available</text>
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
      {svgForKind(kind, props.questionText || "")}
    </div>
  );
}
