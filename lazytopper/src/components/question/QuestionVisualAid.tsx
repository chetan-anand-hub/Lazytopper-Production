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
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
    /\b(height and distance|coordinate|circle|lens|mirror|light|electricity|magnetic|life process|human eye|heredity|nephron|kidney|heart|circulation|triangle|similarity|pythagoras|bpt|prism|dispersion|digestive|neuron|food chain|food web|flower|reproduction in plants)\b/.test(
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
  if (/\b(circle|tangent|sector)\b/.test(combined)) return "circle";
  if (/\b(height and distance|angle of elevation|angle of depression|top of (a |the )?tower|top of (a |the )?building|shadow|lighthouse)\b/.test(combined))
    return "height-distance";
  if (/\b(bpt|basic proportionality|thales)\b/.test(combined)) return "bpt";
  if (/\b(pythagoras|pythagorean|hypotenuse)\b/.test(combined)) return "pythagoras";
  if (/\b(similar|similarity|aa criterion|sas criterion|sss criterion)\b/.test(combined)) return "similar-triangles";
  if (/\b(triangle|congruence)\b/.test(combined) && visualTrigger) return "right-triangle";

  return null;
}

function svgForKind(kind: VisualKind): React.ReactElement {
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

  if (kind === "height-distance") {
    return (
      <svg {...baseProps} aria-label="Height and distance visual aid">
        <line x1="60" y1="240" x2="340" y2="240" stroke={stroke} strokeWidth="2" />
        <line x1="300" y1="240" x2="300" y2="40" stroke={stroke} strokeWidth="2.2" />
        <line x1="60" y1="240" x2="300" y2="40" stroke={accent} strokeWidth="2" strokeDasharray="6 3" />
        <rect x="290" y="230" width="10" height="10" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="45" y="256" fontSize="15" fill={stroke} fontWeight="600">A</text>
        <text x="294" y="256" fontSize="15" fill={stroke} fontWeight="600">B</text>
        <text x="306" y="38" fontSize="15" fill={stroke} fontWeight="600">C</text>
        <text x="160" y="235" fontSize="14" fill={accent}>d</text>
        <text x="306" y="145" fontSize="14" fill={accent}>h</text>
        <path d="M 100 240 A 40 40 0 0 0 88 222" fill="none" stroke={accent} strokeWidth="1.5" />
        <text x="104" y="234" fontSize="14" fill={accent}>θ</text>
      </svg>
    );
  }

  if (kind === "right-triangle") {
    return (
      <svg {...baseProps} aria-label="Right triangle visual aid">
        <polygon points="50,240 350,240 350,40" fill="none" stroke={stroke} strokeWidth="2.2" />
        <rect x="340" y="230" width="10" height="10" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="35" y="256" fontSize="15" fill={stroke} fontWeight="600">A</text>
        <text x="352" y="256" fontSize="15" fill={stroke} fontWeight="600">B</text>
        <text x="352" y="38" fontSize="15" fill={stroke} fontWeight="600">C</text>
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
        <text x="362" y="260" fontSize="14" fill={stroke}>x</text>
        <text x="35" y="30" fontSize="14" fill={stroke}>y</text>
        <circle cx="150" cy="150" r="5" fill={accent} />
        <circle cx="280" cy="90" r="5" fill={accent} />
        <line x1="150" y1="150" x2="280" y2="90" stroke={accent} strokeWidth="1.8" strokeDasharray="5 3" />
        <text x="156" y="145" fontSize="15" fill={stroke}>P</text>
        <text x="286" y="86" fontSize="15" fill={stroke}>Q</text>
      </svg>
    );
  }

  if (kind === "circle") {
    return (
      <svg {...baseProps} aria-label="Circle visual aid">
        <circle cx="200" cy="140" r="80" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="200" y1="140" x2="280" y2="140" stroke={accent} strokeWidth="2" />
        <line x1="280" y1="140" x2="350" y2="80" stroke={stroke} strokeWidth="2" />
        <circle cx="200" cy="140" r="3" fill={stroke} />
        <text x="193" y="132" fontSize="15" fill={stroke} fontWeight="600">O</text>
        <text x="284" y="136" fontSize="15" fill={stroke}>T</text>
        <text x="240" y="158" fontSize="14" fill={accent}>r</text>
      </svg>
    );
  }

  if (kind === "ray") {
    return (
      <svg {...baseProps} aria-label="Light ray visual aid">
        <line x1="20" y1="140" x2="380" y2="140" stroke={stroke} strokeWidth="2" />
        <line x1="200" y1="40" x2="200" y2="240" stroke={faint} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="50" y1="100" x2="200" y2="140" stroke={accent} strokeWidth="2" />
        <line x1="200" y1="140" x2="360" y2="95" stroke={accent} strokeWidth="2" />
        <polygon points="200,140 182,132 186,142" fill={accent} />
        <polygon points="360,95 346,92 348,102" fill={accent} />
        <text x="182" y="36" fontSize="15" fill={stroke}>N</text>
        <text x="70" y="92" fontSize="14" fill={faint}>i</text>
        <text x="310" y="105" fontSize="14" fill={faint}>r</text>
      </svg>
    );
  }

  if (kind === "lens") {
    return (
      <svg {...baseProps} aria-label="Convex lens ray diagram">
        <line x1="20" y1="140" x2="380" y2="140" stroke={stroke} strokeWidth="1.5" />
        <ellipse cx="200" cy="140" rx="14" ry="80" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="200" cy="140" r="3" fill={stroke} />
        <circle cx="130" cy="140" r="4" fill={accent} />
        <circle cx="270" cy="140" r="4" fill={accent} />
        <text x="193" y="130" fontSize="14" fill={stroke}>O</text>
        <text x="122" y="160" fontSize="14" fill={accent}>F</text>
        <text x="262" y="160" fontSize="14" fill={accent}>F'</text>
        <text x="53" y="160" fontSize="14" fill={accent}>2F</text>
        <text x="318" y="160" fontSize="14" fill={accent}>2F'</text>
        <circle cx="60" cy="140" r="3" fill={accent} />
        <circle cx="330" cy="140" r="3" fill={accent} />
        <line x1="80" y1="200" x2="80" y2="80" stroke={green} strokeWidth="2" />
        <polygon points="80,80 75,90 85,90" fill={green} />
        <text x="66" y="75" fontSize="14" fill={green}>Object</text>
        <line x1="80" y1="80" x2="200" y2="80" stroke={red} strokeWidth="1.5" strokeDasharray="4 2" />
        <line x1="200" y1="80" x2="330" y2="140" stroke={red} strokeWidth="1.5" />
        <line x1="80" y1="80" x2="330" y2="175" stroke={accent} strokeWidth="1.5" />
        <line x1="80" y1="140" x2="200" y2="140" stroke={faint} strokeWidth="1.5" />
        <line x1="200" y1="140" x2="330" y2="175" stroke={faint} strokeWidth="1.5" strokeDasharray="4 2" />
        <line x1="330" y1="140" x2="330" y2="175" stroke={green} strokeWidth="2" />
        <polygon points="330,175 325,165 335,165" fill={green} />
        <text x="336" y="178" fontSize="14" fill={green}>Image</text>
      </svg>
    );
  }

  if (kind === "circuit") {
    return (
      <svg {...baseProps} aria-label="Series electric circuit diagram">
        <rect x="60" y="50" width="280" height="180" fill="none" stroke={stroke} strokeWidth="2.2" rx="6" />
        <line x1="90" y1="140" x2="110" y2="140" stroke={accent} strokeWidth="3" />
        <line x1="86" y1="128" x2="86" y2="152" stroke={accent} strokeWidth="2.5" />
        <line x1="114" y1="133" x2="114" y2="147" stroke={accent} strokeWidth="2.5" />
        <text x="88" y="170" fontSize="14" fill={accent}>+ −</text>
        <text x="85" y="120" fontSize="14" fill={stroke}>Battery</text>
        <rect x="190" y="125" width="40" height="30" fill="none" stroke={stroke} strokeWidth="2" rx="2" />
        <text x="196" y="146" fontSize="14" fill={stroke}>R</text>
        <text x="190" y="118" fontSize="14" fill={faint}>Resistor</text>
        <circle cx="300" cy="140" r="18" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="293" y="146" fontSize="15" fill={stroke}>A</text>
        <text x="282" y="118" fontSize="14" fill={faint}>Ammeter</text>
        <line x1="148" y1="50" x2="148" y2="42" stroke={stroke} strokeWidth="2" />
        <line x1="148" y1="42" x2="168" y2="42" stroke={stroke} strokeWidth="2" />
        <line x1="168" y1="42" x2="168" y2="50" stroke={stroke} strokeWidth="2" />
        <circle cx="158" cy="42" r="3" fill={stroke} />
        <text x="140" y="36" fontSize="14" fill={stroke}>S</text>
        <polygon points="340,120 345,115 335,115" fill={accent} />
        <polygon points="60,160 55,165 65,165" fill={accent} />
        <text x="348" y="120" fontSize="12" fill={accent}>I</text>
        <text x="30" y="168" fontSize="12" fill={accent}>I</text>
        <line x1="58" y1="80" x2="58" y2="200" stroke={red} strokeWidth="1.5" strokeDasharray="3 3" />
        <text x="25" y="75" fontSize="12" fill={red}>V+</text>
        <text x="25" y="210" fontSize="12" fill={red}>V−</text>
      </svg>
    );
  }

  if (kind === "circuit-parallel") {
    return (
      <svg {...baseProps} aria-label="Parallel electric circuit diagram">
        <line x1="60" y1="40" x2="340" y2="40" stroke={stroke} strokeWidth="2" />
        <line x1="60" y1="240" x2="340" y2="240" stroke={stroke} strokeWidth="2" />
        <line x1="60" y1="40" x2="60" y2="240" stroke={stroke} strokeWidth="2" />
        <line x1="340" y1="40" x2="340" y2="240" stroke={stroke} strokeWidth="2" />
        <line x1="90" y1="140" x2="110" y2="140" stroke={accent} strokeWidth="3" />
        <line x1="86" y1="128" x2="86" y2="152" stroke={accent} strokeWidth="2.5" />
        <line x1="114" y1="133" x2="114" y2="147" stroke={accent} strokeWidth="2.5" />
        <text x="85" y="170" fontSize="13" fill={stroke}>Battery</text>
        <line x1="160" y1="40" x2="160" y2="240" stroke={faint} strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="260" y1="40" x2="260" y2="240" stroke={faint} strokeWidth="1.5" strokeDasharray="4 3" />
        <rect x="180" y="80" width="60" height="24" fill="none" stroke={stroke} strokeWidth="2" rx="2" />
        <text x="200" y="98" fontSize="14" fill={stroke}>R₁</text>
        <rect x="180" y="170" width="60" height="24" fill="none" stroke={stroke} strokeWidth="2" rx="2" />
        <text x="200" y="188" fontSize="14" fill={stroke}>R₂</text>
        <line x1="160" y1="92" x2="180" y2="92" stroke={stroke} strokeWidth="2" />
        <line x1="240" y1="92" x2="260" y2="92" stroke={stroke} strokeWidth="2" />
        <line x1="160" y1="182" x2="180" y2="182" stroke={stroke} strokeWidth="2" />
        <line x1="240" y1="182" x2="260" y2="182" stroke={stroke} strokeWidth="2" />
        <polygon points="340,80 345,75 335,75" fill={accent} />
        <polygon points="60,200 55,205 65,205" fill={accent} />
        <text x="348" y="82" fontSize="12" fill={accent}>I</text>
        <text x="30" y="208" fontSize="12" fill={accent}>I</text>
        <text x="148" y="60" fontSize="13" fill={faint}>Branch 1</text>
        <text x="148" y="220" fontSize="13" fill={faint}>Branch 2</text>
      </svg>
    );
  }

  if (kind === "magnetic") {
    return (
      <svg {...baseProps} aria-label="Magnetic field lines diagram">
        <rect x="130" y="100" width="140" height="70" fill="none" stroke={stroke} strokeWidth="2.2" rx="4" />
        <text x="150" y="142" fontSize="18" fontWeight="700" fill={red}>N</text>
        <text x="238" y="142" fontSize="18" fontWeight="700" fill="#2563eb">S</text>
        <path d="M120 105 C60 105,50 165,120 165" fill="none" stroke={accent} strokeWidth="1.8" />
        <polygon points="120,160 126,166 126,154" fill={accent} />
        <path d="M280 105 C340 105,350 165,280 165" fill="none" stroke={accent} strokeWidth="1.8" />
        <polygon points="280,110 274,104 274,116" fill={accent} />
        <path d="M120 112 C70 112,60 158,120 158" fill="none" stroke={accent} strokeWidth="1.2" />
        <polygon points="120,153 126,159 126,147" fill={accent} />
        <path d="M280 112 C330 112,340 158,280 158" fill="none" stroke={accent} strokeWidth="1.2" />
        <polygon points="280,117 274,111 274,123" fill={accent} />
        <path d="M120 90 C30 90,20 180,120 180" fill="none" stroke={accent} strokeWidth="1.2" />
        <polygon points="120,175 126,181 126,169" fill={accent} />
        <path d="M280 90 C370 90,380 180,280 180" fill="none" stroke={accent} strokeWidth="1.2" />
        <polygon points="280,95 274,89 274,101" fill={accent} />
        <line x1="58" y1="225" x2="78" y2="225" stroke={red} strokeWidth="2" />
        <polygon points="58,225 52,220 52,230" fill={red} />
        <text x="55" y="250" fontSize="12" fill={faint}>Compass</text>
        <line x1="340" y1="225" x2="360" y2="225" stroke={red} strokeWidth="2" />
        <polygon points="360,225 366,220 366,230" fill={red} />
        <text x="335" y="250" fontSize="12" fill={faint}>Compass</text>
      </svg>
    );
  }

  if (kind === "heart") {
    return (
      <svg {...baseProps} aria-label="Human heart diagram with 4 chambers">
        <ellipse cx="200" cy="140" rx="130" ry="110" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="200" y1="30" x2="200" y2="250" stroke={stroke} strokeWidth="1.5" />
        <line x1="70" y1="130" x2="330" y2="130" stroke={stroke} strokeWidth="1.5" />
        <text x="120" y="95" fontSize="15" fontWeight="600" fill={accent}>RA</text>
        <text x="240" y="95" fontSize="15" fontWeight="600" fill={red}>LA</text>
        <text x="120" y="180" fontSize="15" fontWeight="600" fill={accent}>RV</text>
        <text x="240" y="180" fontSize="15" fontWeight="600" fill={red}>LV</text>
        <text x="150" y="126" fontSize="11" fill={faint}>Tricuspid</text>
        <text x="215" y="126" fontSize="11" fill={faint}>Bicuspid</text>
        <text x="155" y="144" fontSize="11" fill={faint}>Valve</text>
        <text x="225" y="144" fontSize="11" fill={faint}>Valve</text>
        <line x1="120" y1="30" x2="120" y2="10" stroke={accent} strokeWidth="2" />
        <polygon points="120,10 115,18 125,18" fill={accent} />
        <text x="60" y="8" fontSize="12" fill={accent}>SVC</text>
        <line x1="140" y1="30" x2="140" y2="14" stroke={accent} strokeWidth="2" />
        <polygon points="140,14 135,22 145,22" fill={accent} />
        <text x="144" y="12" fontSize="12" fill={accent}>IVC</text>
        <line x1="200" y1="30" x2="200" y2="8" stroke={red} strokeWidth="2" />
        <polygon points="200,8 195,16 205,16" fill={red} />
        <text x="204" y="8" fontSize="12" fill={red}>Aorta</text>
        <line x1="170" y1="42" x2="150" y2="22" stroke={accent} strokeWidth="2" />
        <text x="80" y="22" fontSize="12" fill={accent}>PA</text>
        <line x1="260" y1="42" x2="280" y2="22" stroke={red} strokeWidth="2" />
        <text x="284" y="22" fontSize="12" fill={red}>PV</text>
        <polygon points="150,22 156,28 160,20" fill={accent} />
        <polygon points="280,22 274,28 270,20" fill={red} />
        <text x="130" y="268" fontSize="12" fill={accent}>Deoxygenated</text>
        <text x="240" y="268" fontSize="12" fill={red}>Oxygenated</text>
      </svg>
    );
  }

  if (kind === "nephron") {
    return (
      <svg {...baseProps} aria-label="Nephron diagram with labelled parts">
        <circle cx="80" cy="80" r="28" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="80" cy="80" r="14" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="3 2" />
        <text x="58" y="56" fontSize="13" fill={stroke} fontWeight="600">Bowman's</text>
        <text x="62" y="70" fontSize="13" fill={stroke} fontWeight="600">Capsule</text>
        <line x1="66" y1="80" x2="50" y2="80" stroke={accent} strokeWidth="1.5" />
        <polygon points="50,80 56,76 56,84" fill={accent} />
        <text x="15" y="78" fontSize="12" fill={accent}>Afferent</text>
        <path d="M108 80 C140 80 160 60 180 60 C200 60 210 80 230 80" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="145" y="52" fontSize="13" fill={green} fontWeight="600">PCT</text>
        <path d="M230 80 C250 80 260 120 260 160 C260 200 240 230 220 230 C200 230 200 200 200 160 C200 120 210 100 230 80" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="265" y="160" fontSize="13" fill={accent} fontWeight="600">Loop of</text>
        <text x="265" y="175" fontSize="13" fill={accent} fontWeight="600">Henle</text>
        <path d="M230 80 C240 60 260 50 280 50 C310 50 330 70 330 100" fill="none" stroke={stroke} strokeWidth="2.2" />
        <text x="280" y="42" fontSize="13" fill={red} fontWeight="600">DCT</text>
        <line x1="330" y1="100" x2="330" y2="260" stroke={stroke} strokeWidth="2.2" />
        <text x="336" y="180" fontSize="13" fill={stroke} fontWeight="600">Collecting</text>
        <text x="336" y="195" fontSize="13" fill={stroke} fontWeight="600">Duct</text>
        <polygon points="330,260 325,250 335,250" fill={stroke} />
        <text x="316" y="275" fontSize="12" fill={faint}>To ureter</text>
        <text x="68" y="100" fontSize="11" fill={faint}>Glomerulus</text>
      </svg>
    );
  }

  if (kind === "similar-triangles") {
    return (
      <svg {...baseProps} aria-label="Similar triangles diagram">
        <polygon points="30,230 170,230 100,80" fill="none" stroke={stroke} strokeWidth="2.2" />
        <polygon points="230,230 370,230 310,120" fill="none" stroke={stroke} strokeWidth="2.2" />
        <path d="M55 215 A20 20 0 0 1 72 198" fill="none" stroke={accent} strokeWidth="2" />
        <path d="M254 215 A20 20 0 0 1 270 200" fill="none" stroke={accent} strokeWidth="2" />
        <path d="M148 215 A18 18 0 0 0 136 198" fill="none" stroke={red} strokeWidth="2" />
        <path d="M348 215 A18 18 0 0 0 336 200" fill="none" stroke={red} strokeWidth="2" />
        <text x="18" y="250" fontSize="15" fill={stroke} fontWeight="600">A</text>
        <text x="172" y="250" fontSize="15" fill={stroke} fontWeight="600">B</text>
        <text x="93" y="72" fontSize="15" fill={stroke} fontWeight="600">C</text>
        <text x="218" y="250" fontSize="15" fill={stroke} fontWeight="600">P</text>
        <text x="372" y="250" fontSize="15" fill={stroke} fontWeight="600">Q</text>
        <text x="303" y="112" fontSize="15" fill={stroke} fontWeight="600">R</text>
        <text x="60" y="168" fontSize="14" fill={faint}>a</text>
        <text x="130" y="168" fontSize="14" fill={faint}>b</text>
        <text x="85" y="248" fontSize="14" fill={faint}>c</text>
        <text x="262" y="180" fontSize="14" fill={faint}>ka</text>
        <text x="338" y="180" fontSize="14" fill={faint}>kb</text>
        <text x="290" y="248" fontSize="14" fill={faint}>kc</text>
        <text x="130" y="30" fontSize="14" fill={accent} fontWeight="600">△ABC ~ △PQR (AA/SAS/SSS)</text>
      </svg>
    );
  }

  if (kind === "bpt") {
    return (
      <svg {...baseProps} aria-label="Basic Proportionality Theorem diagram">
        <polygon points="50,250 350,250 200,40" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="110" y1="165" x2="290" y2="165" stroke={accent} strokeWidth="2.2" />
        <text x="35" y="268" fontSize="15" fill={stroke} fontWeight="600">A</text>
        <text x="352" y="268" fontSize="15" fill={stroke} fontWeight="600">B</text>
        <text x="193" y="34" fontSize="15" fill={stroke} fontWeight="600">C</text>
        <text x="92" y="162" fontSize="15" fill={accent} fontWeight="600">D</text>
        <text x="294" y="162" fontSize="15" fill={accent} fontWeight="600">E</text>
        <text x="68" y="210" fontSize="14" fill={faint}>AD</text>
        <text x="148" y="105" fontSize="14" fill={faint}>CD</text>
        <text x="310" y="210" fontSize="14" fill={faint}>BE</text>
        <text x="250" y="105" fontSize="14" fill={faint}>CE</text>
        <text x="100" y="26" fontSize="14" fill={accent} fontWeight="600">DE ∥ AB ⇒ CD/DA = CE/EB</text>
        <line x1="100" y1="165" x2="100" y2="250" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
        <line x1="300" y1="165" x2="300" y2="250" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
      </svg>
    );
  }

  if (kind === "pythagoras") {
    return (
      <svg {...baseProps} aria-label="Pythagoras theorem diagram">
        <polygon points="60,240 340,240 60,60" fill="none" stroke={stroke} strokeWidth="2.2" />
        <rect x="60" y="226" width="14" height="14" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="42" y="258" fontSize="15" fill={stroke} fontWeight="600">A</text>
        <text x="344" y="258" fontSize="15" fill={stroke} fontWeight="600">B</text>
        <text x="42" y="54" fontSize="15" fill={stroke} fontWeight="600">C</text>
        <text x="180" y="260" fontSize="15" fill={accent} fontWeight="600">a (base)</text>
        <text x="26" y="158" fontSize="15" fill={green} fontWeight="600">b</text>
        <text x="210" y="140" fontSize="15" fill={red} fontWeight="600">c (hyp)</text>
        <text x="100" y="30" fontSize="15" fill={stroke} fontWeight="700">a² + b² = c²</text>
      </svg>
    );
  }

  if (kind === "prism") {
    return (
      <svg {...baseProps} aria-label="Light dispersion through prism">
        <polygon points="200,30 130,230 270,230" fill="none" stroke={stroke} strokeWidth="2.2" />
        <line x1="30" y1="140" x2="160" y2="140" stroke={faint} strokeWidth="2" />
        <polygon points="160,140 150,135 150,145" fill={faint} />
        <text x="40" y="132" fontSize="14" fill={stroke}>White light</text>
        <line x1="240" y1="130" x2="370" y2="80" stroke="#dc2626" strokeWidth="1.8" />
        <line x1="240" y1="135" x2="370" y2="100" stroke="#f97316" strokeWidth="1.8" />
        <line x1="240" y1="140" x2="370" y2="120" stroke="#eab308" strokeWidth="1.8" />
        <line x1="240" y1="145" x2="370" y2="140" stroke="#22c55e" strokeWidth="1.8" />
        <line x1="240" y1="150" x2="370" y2="160" stroke="#0ea5e9" strokeWidth="1.8" />
        <line x1="240" y1="155" x2="370" y2="180" stroke="#6366f1" strokeWidth="1.8" />
        <line x1="240" y1="160" x2="370" y2="200" stroke="#7c3aed" strokeWidth="1.8" />
        <text x="374" y="84" fontSize="12" fill="#dc2626">R</text>
        <text x="374" y="104" fontSize="12" fill="#f97316">O</text>
        <text x="374" y="124" fontSize="12" fill="#eab308">Y</text>
        <text x="374" y="144" fontSize="12" fill="#22c55e">G</text>
        <text x="374" y="164" fontSize="12" fill="#0ea5e9">B</text>
        <text x="374" y="184" fontSize="12" fill="#6366f1">I</text>
        <text x="374" y="204" fontSize="12" fill="#7c3aed">V</text>
        <text x="175" y="260" fontSize="14" fill={stroke}>Glass Prism</text>
      </svg>
    );
  }

  if (kind === "human-eye") {
    return (
      <svg {...baseProps} aria-label="Human eye cross-section diagram">
        <ellipse cx="200" cy="140" rx="150" ry="100" fill="none" stroke={stroke} strokeWidth="2.2" />
        <ellipse cx="100" cy="140" rx="20" ry="50" fill="none" stroke={accent} strokeWidth="2" />
        <text x="85" y="100" fontSize="13" fill={accent} fontWeight="600">Cornea</text>
        <ellipse cx="140" cy="140" rx="10" ry="35" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="126" y="190" fontSize="13" fill={stroke} fontWeight="600">Lens</text>
        <circle cx="140" cy="140" r="8" fill="none" stroke={stroke} strokeWidth="1.5" />
        <text x="128" y="125" fontSize="11" fill={faint}>Pupil</text>
        <line x1="150" y1="140" x2="340" y2="140" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
        <path d="M320 60 C350 60 350 220 320 220" fill="none" stroke={red} strokeWidth="2.5" />
        <text x="330" y="144" fontSize="13" fill={red} fontWeight="600">Retina</text>
        <line x1="340" y1="140" x2="390" y2="140" stroke={green} strokeWidth="3" />
        <text x="350" y="130" fontSize="13" fill={green} fontWeight="600">Optic</text>
        <text x="350" y="155" fontSize="13" fill={green} fontWeight="600">Nerve</text>
        <circle cx="220" cy="140" r="3" fill={stroke} />
        <text x="210" y="130" fontSize="11" fill={faint}>Vitreous</text>
        <line x1="20" y1="120" x2="100" y2="140" stroke={accent} strokeWidth="1.5" />
        <polygon points="100,140 92,136 94,144" fill={accent} />
        <text x="20" y="112" fontSize="12" fill={accent}>Light</text>
      </svg>
    );
  }

  if (kind === "digestive-system") {
    return (
      <svg {...baseProps} aria-label="Simplified digestive system diagram">
        <ellipse cx="200" cy="30" rx="30" ry="15" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="186" y="35" fontSize="13" fill={stroke} fontWeight="600">Mouth</text>
        <line x1="200" y1="45" x2="200" y2="75" stroke={stroke} strokeWidth="2" />
        <text x="210" y="65" fontSize="12" fill={faint}>Oesophagus</text>
        <ellipse cx="200" cy="105" rx="45" ry="28" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="178" y="110" fontSize="14" fill={red} fontWeight="600">Stomach</text>
        <path d="M200 133 C200 150 180 160 180 180" fill="none" stroke={stroke} strokeWidth="2" />
        <path d="M180 180 C180 200 220 210 220 230 C220 240 200 242 200 242" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="230" y="170" fontSize="13" fill={green} fontWeight="600">Small</text>
        <text x="230" y="185" fontSize="13" fill={green} fontWeight="600">Intestine</text>
        <path d="M200 242 C180 242 160 235 150 230" fill="none" stroke={stroke} strokeWidth="2.5" />
        <ellipse cx="140" cy="230" rx="25" ry="12" fill="none" stroke={stroke} strokeWidth="2" />
        <text x="90" y="220" fontSize="13" fill={accent} fontWeight="600">Large</text>
        <text x="85" y="235" fontSize="13" fill={accent} fontWeight="600">Intestine</text>
        <line x1="140" y1="242" x2="140" y2="268" stroke={stroke} strokeWidth="2" />
        <text x="148" y="265" fontSize="13" fill={stroke} fontWeight="600">Rectum</text>
        <polygon points="140,268 135,260 145,260" fill={stroke} />
        <rect x="260" y="90" width="50" height="30" fill="none" stroke={faint} strokeWidth="1.5" rx="4" />
        <text x="268" y="110" fontSize="12" fill={faint}>Liver</text>
        <line x1="260" y1="105" x2="245" y2="105" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
        <rect x="260" y="130" width="55" height="26" fill="none" stroke={faint} strokeWidth="1.5" rx="4" />
        <text x="264" y="148" fontSize="12" fill={faint}>Pancreas</text>
        <line x1="260" y1="143" x2="245" y2="133" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
      </svg>
    );
  }

  if (kind === "neuron") {
    return (
      <svg {...baseProps} aria-label="Neuron structure diagram">
        <path d="M30 100 L50 80 L40 100 L55 90 L45 110 L60 95 L50 115 L65 105" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M30 160 L50 180 L40 160 L55 170 L45 150 L60 165 L50 145 L65 155" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M30 130 L55 120 L45 130 L60 125" fill="none" stroke={stroke} strokeWidth="1.8" />
        <text x="5" y="135" fontSize="13" fill={accent} fontWeight="600">Dendrites</text>
        <circle cx="100" cy="130" r="30" fill="none" stroke={stroke} strokeWidth="2.2" />
        <circle cx="100" cy="130" r="12" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="87" y="135" fontSize="11" fill={faint}>Nucleus</text>
        <text x="70" y="175" fontSize="13" fill={stroke} fontWeight="600">Cell Body</text>
        <line x1="130" y1="130" x2="300" y2="130" stroke={stroke} strokeWidth="2.5" />
        <text x="190" y="122" fontSize="14" fill={green} fontWeight="600">Axon</text>
        <path d="M150 115 C155 100 175 100 180 115" fill="none" stroke={faint} strokeWidth="1.5" />
        <path d="M200 115 C205 100 225 100 230 115" fill="none" stroke={faint} strokeWidth="1.5" />
        <path d="M250 115 C255 100 275 100 280 115" fill="none" stroke={faint} strokeWidth="1.5" />
        <text x="180" y="100" fontSize="11" fill={faint}>Myelin sheath</text>
        <path d="M300 130 L320 110 L315 130 L330 115 L325 135 L340 120 L335 140" fill="none" stroke={stroke} strokeWidth="1.8" />
        <path d="M300 130 L320 150 L315 130 L330 145 L325 125 L340 140 L335 120" fill="none" stroke={stroke} strokeWidth="1.8" />
        <text x="310" y="165" fontSize="13" fill={red} fontWeight="600">Axon</text>
        <text x="310" y="180" fontSize="13" fill={red} fontWeight="600">Terminals</text>
        <line x1="340" y1="130" x2="360" y2="130" stroke={faint} strokeWidth="1" strokeDasharray="3 2" />
        <text x="348" y="122" fontSize="12" fill={faint}>Synapse</text>
        <polygon points="300,130 294,124 294,136" fill={accent} />
        <text x="160" y="150" fontSize="11" fill={accent}>Signal direction →</text>
      </svg>
    );
  }

  if (kind === "food-chain") {
    return (
      <svg {...baseProps} aria-label="Trophic levels pyramid">
        <polygon points="200,20 50,250 350,250" fill="none" stroke={stroke} strokeWidth="2" />
        <line x1="90" y1="192" x2="310" y2="192" stroke={stroke} strokeWidth="1.5" />
        <line x1="130" y1="134" x2="270" y2="134" stroke={stroke} strokeWidth="1.5" />
        <line x1="165" y1="82" x2="235" y2="82" stroke={stroke} strokeWidth="1.5" />
        <text x="140" y="230" fontSize="14" fill={green} fontWeight="600">Producers</text>
        <text x="140" y="248" fontSize="11" fill={faint}>(Plants, Algae)</text>
        <text x="120" y="168" fontSize="14" fill={accent} fontWeight="600">Primary Consumers</text>
        <text x="145" y="184" fontSize="11" fill={faint}>(Herbivores)</text>
        <text x="130" y="116" fontSize="14" fill={red} fontWeight="600">Secondary</text>
        <text x="152" y="130" fontSize="11" fill={faint}>(Carnivores)</text>
        <text x="158" y="60" fontSize="14" fill={stroke} fontWeight="600">Tertiary</text>
        <text x="155" y="76" fontSize="11" fill={faint}>(Top predators)</text>
        <polygon points="380,60 375,80 385,80" fill={green} />
        <line x1="380" y1="80" x2="380" y2="250" stroke={green} strokeWidth="1.5" />
        <text x="360" y="50" fontSize="12" fill={green}>Energy</text>
      </svg>
    );
  }

  if (kind === "flower") {
    return (
      <svg {...baseProps} aria-label="Flower cross-section diagram">
        <line x1="200" y1="280" x2="200" y2="180" stroke={green} strokeWidth="3" />
        <text x="210" y="270" fontSize="13" fill={green} fontWeight="600">Stem</text>
        <ellipse cx="200" cy="185" rx="20" ry="10" fill="none" stroke={green} strokeWidth="2" />
        <text x="225" y="190" fontSize="13" fill={green} fontWeight="600">Sepal</text>
        <path d="M140 180 C120 140 140 100 170 90" fill="none" stroke="#f472b6" strokeWidth="2" />
        <path d="M260 180 C280 140 260 100 230 90" fill="none" stroke="#f472b6" strokeWidth="2" />
        <path d="M170 90 C180 85 190 82 200 80" fill="none" stroke="#f472b6" strokeWidth="2" />
        <path d="M230 90 C220 85 210 82 200 80" fill="none" stroke="#f472b6" strokeWidth="2" />
        <text x="105" y="135" fontSize="13" fill="#f472b6" fontWeight="600">Petal</text>
        <text x="268" y="135" fontSize="13" fill="#f472b6" fontWeight="600">Petal</text>
        <line x1="200" y1="175" x2="200" y2="60" stroke={stroke} strokeWidth="2" />
        <circle cx="200" cy="55" r="6" fill="none" stroke={red} strokeWidth="2" />
        <text x="210" y="50" fontSize="13" fill={red} fontWeight="600">Stigma</text>
        <text x="210" y="90" fontSize="13" fill={stroke}>Style</text>
        <ellipse cx="200" cy="170" rx="15" ry="10" fill="none" stroke={accent} strokeWidth="2" />
        <text x="220" y="168" fontSize="13" fill={accent} fontWeight="600">Ovary</text>
        <circle cx="195" cy="170" r="3" fill={faint} />
        <circle cx="205" cy="170" r="3" fill={faint} />
        <text x="220" y="178" fontSize="11" fill={faint}>Ovules</text>
        <line x1="160" y1="140" x2="150" y2="90" stroke="#eab308" strokeWidth="1.5" />
        <line x1="150" y1="90" x2="145" y2="80" stroke="#eab308" strokeWidth="1.5" />
        <circle cx="145" cy="76" r="4" fill="#eab308" />
        <text x="110" y="78" fontSize="13" fill="#eab308" fontWeight="600">Anther</text>
        <text x="135" y="120" fontSize="11" fill="#eab308">Filament</text>
        <text x="50" y="110" fontSize="12" fill={faint}>Stamen →</text>
        <text x="210" y="108" fontSize="12" fill={faint}>← Pistil</text>
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
      {svgForKind(kind)}
    </div>
  );
}
