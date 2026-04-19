import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { RequireAuth } from "../components/auth/RequireAuth";

interface ModelResult {
  svg: string | null;
  model: string;
  provider: string;
}

interface CompareResponse {
  ok: boolean;
  compare: boolean;
  claude: ModelResult;
  gemini_flash: ModelResult;
  gemini_pro: ModelResult;
}

const CURRENT_BPT_SVG = `<svg viewBox="0 0 400 280" width="100%" height="auto" aria-label="Basic Proportionality Theorem — DE ∥ AB">
  <polygon points="50,250 350,250 200,30" fill="none" stroke="#3c3c3c" stroke-width="2.2"/>
  <line x1="115" y1="165" x2="285" y2="165" stroke="#0ea5e9" stroke-width="2.5"/>
  <text x="35" y="268" font-size="15" fill="#3c3c3c" font-weight="700">A</text>
  <text x="352" y="268" font-size="15" fill="#3c3c3c" font-weight="700">B</text>
  <text x="192" y="24" font-size="15" fill="#3c3c3c" font-weight="700">C</text>
  <text x="96" y="162" font-size="15" fill="#0ea5e9" font-weight="700">D</text>
  <text x="288" y="162" font-size="15" fill="#0ea5e9" font-weight="700">E</text>
  <text x="160" y="188" font-size="15" fill="#0ea5e9" font-weight="700">DE ∥ AB</text>
  <text x="80" y="218" font-size="14" fill="#94a3b8">AD</text>
  <text x="290" y="218" font-size="14" fill="#94a3b8">BE</text>
  <text x="144" y="106" font-size="14" fill="#dc2626" font-weight="600">CD</text>
  <text x="236" y="106" font-size="14" fill="#dc2626" font-weight="600">CE</text>
  <text x="70" y="275" font-size="12" fill="#94a3b8">CD/DA = CE/EB (BPT)</text>
</svg>`;

const IMPROVED_BPT_SVG = `<svg viewBox="0 0 400 280" width="100%" height="auto" aria-label="Improved BPT — AD=3cm AB=7.5cm AE=4cm">
  <polygon points="200,22 50,255 350,255" fill="none" stroke="#3c3c3c" stroke-width="2.2"/>
  <line x1="140" y1="118" x2="260" y2="118" stroke="#0ea5e9" stroke-width="2.5"/>
  <circle cx="140" cy="118" r="3.5" fill="#0ea5e9"/>
  <circle cx="260" cy="118" r="3.5" fill="#0ea5e9"/>
  <text x="192" y="17" font-size="15" fill="#3c3c3c" font-weight="700">A</text>
  <text x="34" y="270" font-size="15" fill="#3c3c3c" font-weight="700">B</text>
  <text x="353" y="270" font-size="15" fill="#3c3c3c" font-weight="700">C</text>
  <text x="120" y="114" font-size="14" fill="#0ea5e9" font-weight="700">D</text>
  <text x="264" y="114" font-size="14" fill="#0ea5e9" font-weight="700">E</text>
  <text x="168" y="109" font-size="12" fill="#0ea5e9">DE ∥ BC</text>
  <text x="140" y="63" font-size="13" fill="#dc2626" font-weight="600">AD=3cm</text>
  <text x="56" y="195" font-size="12" fill="#94a3b8">DB=4.5cm</text>
  <text x="235" y="63" font-size="13" fill="#dc2626" font-weight="600">AE=4cm</text>
  <text x="295" y="195" font-size="12" fill="#94a3b8">EC=6cm</text>
  <text x="162" y="132" font-size="11" fill="#0ea5e9">AB=7.5cm</text>
  <line x1="50" y1="268" x2="350" y2="268" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4 2"/>
  <text x="55" y="278" font-size="11" fill="#94a3b8">AD/DB=AE/EC ⟹ 3/4.5=4/6 ✓  AC=AE+EC=10cm</text>
</svg>`;

const CURRENT_LENS_SVG = `<svg viewBox="0 0 400 280" width="100%" height="auto" aria-label="Current convex lens template">
  <line x1="20" y1="140" x2="380" y2="140" stroke="#3c3c3c" stroke-width="1.5"/>
  <ellipse cx="200" cy="140" rx="12" ry="85" fill="none" stroke="#3c3c3c" stroke-width="2.2"/>
  <circle cx="200" cy="140" r="3" fill="#3c3c3c"/>
  <circle cx="130" cy="140" r="4" fill="#0ea5e9"/>
  <circle cx="270" cy="140" r="4" fill="#0ea5e9"/>
  <circle cx="60" cy="140" r="3" fill="#0ea5e9"/>
  <circle cx="330" cy="140" r="3" fill="#0ea5e9"/>
  <text x="193" y="130" font-size="13" fill="#3c3c3c" font-weight="600">O</text>
  <text x="122" y="160" font-size="13" fill="#0ea5e9" font-weight="600">F</text>
  <text x="262" y="160" font-size="13" fill="#0ea5e9" font-weight="600">F'</text>
  <text x="50" y="160" font-size="13" fill="#0ea5e9">2F</text>
  <text x="320" y="160" font-size="13" fill="#0ea5e9">2F'</text>
  <line x1="80" y1="200" x2="80" y2="80" stroke="#22c55e" stroke-width="2.5"/>
  <polygon points="80,80 75,92 85,92" fill="#22c55e"/>
  <text x="50" y="76" font-size="13" fill="#22c55e" font-weight="600">Object</text>
  <line x1="80" y1="80" x2="200" y2="80" stroke="#dc2626" stroke-width="1.5"/>
  <line x1="200" y1="80" x2="330" y2="140" stroke="#dc2626" stroke-width="1.5"/>
  <polygon points="330,140 320,134 322,144" fill="#dc2626"/>
  <line x1="80" y1="80" x2="330" y2="175" stroke="#0ea5e9" stroke-width="1.5"/>
  <polygon points="330,175 320,168 322,178" fill="#0ea5e9"/>
  <line x1="330" y1="140" x2="330" y2="175" stroke="#22c55e" stroke-width="2.5"/>
  <polygon points="330,175 325,163 335,163" fill="#22c55e"/>
  <text x="336" y="180" font-size="13" fill="#22c55e" font-weight="600">Image</text>
  <text x="100" y="28" font-size="12" fill="#94a3b8">Ray 1: parallel → through F'</text>
  <text x="100" y="265" font-size="12" fill="#94a3b8">Ray 2: through centre → straight</text>
</svg>`;

const IMPROVED_LENS_SVG = `<svg viewBox="0 0 400 280" width="100%" height="auto" aria-label="Improved lens — f=20cm u=30cm v=60cm">
  <line x1="15" y1="140" x2="385" y2="140" stroke="#94a3b8" stroke-width="1.5"/>
  <ellipse cx="200" cy="140" rx="10" ry="78" fill="none" stroke="#3c3c3c" stroke-width="2.2"/>
  <circle cx="150" cy="140" r="4" fill="#0ea5e9"/>
  <circle cx="250" cy="140" r="4" fill="#0ea5e9"/>
  <circle cx="100" cy="140" r="3" fill="#94a3b8"/>
  <circle cx="300" cy="140" r="3" fill="#94a3b8"/>
  <text x="194" y="130" font-size="12" fill="#3c3c3c" font-weight="600">O</text>
  <text x="142" y="160" font-size="13" fill="#0ea5e9" font-weight="700">F</text>
  <text x="244" y="160" font-size="13" fill="#0ea5e9" font-weight="700">F'</text>
  <text x="90" y="160" font-size="12" fill="#94a3b8">2F</text>
  <text x="292" y="160" font-size="12" fill="#94a3b8">2F'</text>
  <line x1="200" y1="148" x2="250" y2="148" stroke="#0ea5e9" stroke-width="1" stroke-dasharray="3 2"/>
  <text x="212" y="168" font-size="11" fill="#0ea5e9">f=20cm</text>
  <line x1="125" y1="140" x2="125" y2="95" stroke="#16a34a" stroke-width="2.5"/>
  <polygon points="125,95 120,107 130,107" fill="#16a34a"/>
  <text x="42" y="92" font-size="13" fill="#16a34a" font-weight="600">Object</text>
  <text x="42" y="106" font-size="12" fill="#16a34a">u=30cm</text>
  <line x1="350" y1="140" x2="350" y2="230" stroke="#16a34a" stroke-width="2.5"/>
  <polygon points="350,230 345,218 355,218" fill="#16a34a"/>
  <text x="356" y="192" font-size="13" fill="#16a34a" font-weight="600">Image</text>
  <text x="354" y="207" font-size="12" fill="#16a34a">v=60cm</text>
  <text x="354" y="221" font-size="11" fill="#16a34a">(inverted)</text>
  <line x1="125" y1="95" x2="200" y2="95" stroke="#dc2626" stroke-width="1.6"/>
  <line x1="200" y1="95" x2="350" y2="230" stroke="#dc2626" stroke-width="1.6"/>
  <polygon points="346,226 348,214 356,222" fill="#dc2626"/>
  <line x1="125" y1="95" x2="350" y2="230" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="6 3"/>
  <text x="126" y="84" font-size="10" fill="#dc2626">Ray 1 (∥ axis → F')</text>
  <text x="148" y="258" font-size="10" fill="#0ea5e9">Ray 2 (through O)</text>
  <line x1="125" y1="248" x2="200" y2="248" stroke="#3c3c3c" stroke-width="1"/>
  <polygon points="125,248 133,244 133,252" fill="#3c3c3c"/>
  <polygon points="200,248 192,244 192,252" fill="#3c3c3c"/>
  <text x="139" y="262" font-size="10" fill="#3c3c3c">30cm</text>
  <line x1="200" y1="266" x2="350" y2="266" stroke="#3c3c3c" stroke-width="1"/>
  <polygon points="200,266 208,262 208,270" fill="#3c3c3c"/>
  <polygon points="350,266 342,262 342,270" fill="#3c3c3c"/>
  <text x="256" y="278" font-size="10" fill="#3c3c3c">60cm</text>
</svg>`;

const CURRENT_HEART_SVG = `<svg viewBox="0 0 400 280" width="100%" height="auto" aria-label="Current heart template">
  <path d="M200 30 C120 30 70 60 70 120 C70 190 130 230 200 260 C270 230 330 190 330 120 C330 60 280 30 200 30Z" fill="none" stroke="#3c3c3c" stroke-width="2.2"/>
  <line x1="200" y1="35" x2="200" y2="255" stroke="#3c3c3c" stroke-width="1.5"/>
  <line x1="75" y1="130" x2="325" y2="130" stroke="#3c3c3c" stroke-width="1.5"/>
  <text x="110" y="95" font-size="15" font-weight="700" fill="#2563eb">RA</text>
  <text x="240" y="95" font-size="15" font-weight="700" fill="#dc2626">LA</text>
  <text x="110" y="175" font-size="15" font-weight="700" fill="#2563eb">RV</text>
  <text x="240" y="175" font-size="15" font-weight="700" fill="#dc2626">LV</text>
  <text x="130" y="126" font-size="10" fill="#94a3b8">Tricuspid</text>
  <text x="215" y="126" font-size="10" fill="#94a3b8">Bicuspid</text>
  <path d="M100 40 L100 10" stroke="#2563eb" stroke-width="2" fill="none"/>
  <polygon points="100,10 95,20 105,20" fill="#2563eb"/>
  <text x="60" y="8" font-size="12" fill="#2563eb" font-weight="600">SVC</text>
  <path d="M130 40 L130 14" stroke="#2563eb" stroke-width="2" fill="none"/>
  <polygon points="130,14 125,24 135,24" fill="#2563eb"/>
  <text x="134" y="12" font-size="12" fill="#2563eb" font-weight="600">IVC</text>
  <path d="M200 30 L200 6" stroke="#dc2626" stroke-width="2.5" fill="none"/>
  <polygon points="200,6 195,16 205,16" fill="#dc2626"/>
  <text x="206" y="10" font-size="12" fill="#dc2626" font-weight="700">Aorta</text>
  <path d="M160 50 L145 20" stroke="#2563eb" stroke-width="2" fill="none"/>
  <text x="70" y="25" font-size="12" fill="#2563eb" font-weight="600">PA</text>
  <path d="M260 50 L275 20" stroke="#dc2626" stroke-width="2" fill="none"/>
  <text x="280" y="18" font-size="12" fill="#dc2626" font-weight="600">PV</text>
  <rect x="60" y="264" width="12" height="8" fill="#2563eb" rx="2"/>
  <text x="76" y="272" font-size="11" fill="#2563eb">Deoxygenated</text>
  <rect x="200" y="264" width="12" height="8" fill="#dc2626" rx="2"/>
  <text x="216" y="272" font-size="11" fill="#dc2626">Oxygenated</text>
</svg>`;

const IMPROVED_HEART_SVG = `<svg viewBox="0 0 400 280" width="100%" height="auto" aria-label="Improved heart — double circulation with flow arrows">
  <path d="M200 42 C130 42 82 70 82 122 C82 185 138 222 200 252 C262 222 318 185 318 122 C318 70 270 42 200 42Z" fill="none" stroke="#3c3c3c" stroke-width="2"/>
  <line x1="200" y1="46" x2="200" y2="248" stroke="#3c3c3c" stroke-width="1.5"/>
  <line x1="87" y1="132" x2="313" y2="132" stroke="#3c3c3c" stroke-width="1.5"/>
  <text x="112" y="100" font-size="14" font-weight="700" fill="#2563eb">RA</text>
  <text x="238" y="100" font-size="14" font-weight="700" fill="#dc2626">LA</text>
  <text x="112" y="178" font-size="14" font-weight="700" fill="#2563eb">RV</text>
  <text x="238" y="178" font-size="14" font-weight="700" fill="#dc2626">LV</text>
  <text x="128" y="128" font-size="9" fill="#94a3b8">Tricuspid</text>
  <text x="208" y="128" font-size="9" fill="#94a3b8">Bicuspid</text>
  <path d="M96 52 L96 14" stroke="#2563eb" stroke-width="2.5" fill="none"/>
  <polygon points="96,14 91,26 101,26" fill="#2563eb"/>
  <text x="44" y="12" font-size="12" fill="#2563eb" font-weight="700">SVC/IVC</text>
  <path d="M200 42 L200 10" stroke="#dc2626" stroke-width="2.5" fill="none"/>
  <polygon points="200,10 195,22 205,22" fill="#dc2626"/>
  <text x="206" y="9" font-size="12" fill="#dc2626" font-weight="700">Aorta</text>
  <path d="M152 56 L132 24" stroke="#2563eb" stroke-width="2" fill="none"/>
  <polygon points="132,24 140,35 145,25" fill="#2563eb"/>
  <text x="80" y="28" font-size="12" fill="#2563eb" font-weight="700">PA</text>
  <path d="M258 56 L278 24" stroke="#dc2626" stroke-width="2" fill="none"/>
  <polygon points="278,24 270,35 280,30" fill="#dc2626"/>
  <text x="284" y="24" font-size="12" fill="#dc2626" font-weight="700">PV</text>
  <path d="M152 56 L132 24" stroke="#2563eb" stroke-width="2" fill="none"/>
  <path d="M25 80 Q8 122 25 165" stroke="#2563eb" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <polygon points="25,165 20,152 30,155" fill="#2563eb"/>
  <text x="2" y="68" font-size="10" fill="#2563eb">Body</text>
  <text x="2" y="80" font-size="10" fill="#2563eb">(deoxy)</text>
  <path d="M375 165 Q392 122 375 80" stroke="#dc2626" stroke-width="1.5" fill="none" stroke-dasharray="5 3"/>
  <polygon points="375,80 370,93 380,90" fill="#dc2626"/>
  <text x="348" y="178" font-size="10" fill="#dc2626">Body</text>
  <text x="348" y="190" font-size="10" fill="#dc2626">(oxy)</text>
  <path d="M132 24 Q90 5 68 30 Q42 58 50 90" stroke="#2563eb" stroke-width="1.4" fill="none" stroke-dasharray="4 2"/>
  <text x="22" y="105" font-size="9" fill="#2563eb">Lungs</text>
  <path d="M278 24 Q320 5 340 28 Q368 58 360 90" stroke="#dc2626" stroke-width="1.4" fill="none" stroke-dasharray="4 2"/>
  <text x="340" y="105" font-size="9" fill="#dc2626">Lungs</text>
  <text x="22" y="255" font-size="10" font-weight="700" fill="#2563eb">Pulmonary circuit:</text>
  <text x="22" y="267" font-size="9" fill="#2563eb">RV→PA→Lungs→PV→LA</text>
  <text x="210" y="255" font-size="10" font-weight="700" fill="#dc2626">Systemic circuit:</text>
  <text x="210" y="267" font-size="9" fill="#dc2626">LV→Aorta→Body→SVC→RA</text>
  <rect x="22" y="273" width="9" height="6" fill="#2563eb" rx="1"/>
  <text x="34" y="279" font-size="9" fill="#2563eb">Deoxygenated</text>
  <rect x="110" y="273" width="9" height="6" fill="#dc2626" rx="1"/>
  <text x="122" y="279" font-size="9" fill="#dc2626">Oxygenated</text>
</svg>`;

const SAMPLE_QUESTIONS = [
  {
    id: "TRI2-M02",
    title: "BPT — Basic Proportionality Theorem",
    subtitle: "Maths / Triangles",
    question:
      "In △ABC, DE ∥ BC. If AD = 3 cm, AB = 7.5 cm and AE = 4 cm, find AC and DE/BC.",
    subject: "Maths",
    topic: "Triangles",
    currentSvg: CURRENT_BPT_SVG,
    improvedSvg: IMPROVED_BPT_SVG,
  },
  {
    id: "LT-M02",
    title: "Convex Lens — Lens Formula",
    subtitle: "Physics / Light",
    question:
      "A convex lens of focal length 20 cm forms an image at 60 cm on the other side. Find the object distance using the lens formula.",
    subject: "Physics",
    topic: "Light (Lenses)",
    currentSvg: CURRENT_LENS_SVG,
    improvedSvg: IMPROVED_LENS_SVG,
  },
  {
    id: "LP-M03",
    title: "Double Circulation — Human Heart",
    subtitle: "Biology / Life Processes",
    question:
      "Explain the mechanism of blood circulation through the human heart (double circulation).",
    subject: "Biology",
    topic: "Life Processes",
    currentSvg: CURRENT_HEART_SVG,
    improvedSvg: IMPROVED_HEART_SVG,
  },
];

const COLUMNS = [
  { key: "current", label: "Current Template", color: "#64748b", ai: false },
  { key: "improved", label: "Improved Template", color: "#7c3aed", ai: false },
  {
    key: "gemini_flash",
    label: "Gemini Flash",
    color: "#0ea5e9",
    ai: true,
  },
  { key: "gemini_pro", label: "Gemini Pro", color: "#2563eb", ai: true },
  { key: "claude", label: "Claude Sonnet", color: "#d97706", ai: true },
] as const;

type ColKey = (typeof COLUMNS)[number]["key"];

interface QuestionState {
  loading: boolean;
  error: string | null;
  results: Record<string, string | null>;
}

function makeBlobUrl(svgContent: string): string {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:4px;box-sizing:border-box;}svg{max-width:100%;height:auto;display:block;}</style></head><body>${svgContent}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}

function DiagramCard({
  colKey,
  label,
  color,
  loading,
  svg,
  error,
}: {
  colKey: ColKey;
  label: string;
  color: string;
  loading?: boolean;
  svg?: string | null;
  error?: string | null;
}) {
  const blobUrlRef = useRef<string | null>(null);
  const prevSvg = useRef<string | null | undefined>(undefined);

  if (svg && svg !== prevSvg.current) {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = makeBlobUrl(svg);
    prevSvg.current = svg;
  }

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: "#fff",
        borderRadius: 10,
        border: `1.5px solid ${color}33`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "6px 10px",
          background: `${color}14`,
          borderBottom: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color }}>
          {label}
        </span>
        {colKey === "improved" && (
          <span
            style={{
              fontSize: "0.65rem",
              background: "#7c3aed22",
              color: "#7c3aed",
              padding: "1px 6px",
              borderRadius: 999,
              fontWeight: 700,
            }}
          >
            HAND-CRAFTED
          </span>
        )}
      </div>
      <div style={{ flex: 1, minHeight: 200 }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              gap: 10,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                border: `3px solid ${color}33`,
                borderTop: `3px solid ${color}`,
                borderRadius: "50%",
                animation: "spin 0.9s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              Generating…
            </span>
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              padding: 12,
              color: "#dc2626",
              fontSize: "0.75rem",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        ) : svg ? (
          <iframe
            key={blobUrlRef.current || ""}
            src={blobUrlRef.current!}
            sandbox="allow-same-origin"
            style={{
              border: "none",
              width: "100%",
              height: 240,
              display: "block",
            }}
            title={`${label} diagram`}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 200,
              color: "#94a3b8",
              fontSize: "0.75rem",
            }}
          >
            NO_DIAGRAM
          </div>
        )}
      </div>
    </div>
  );
}

async function fetchCompare(
  question: (typeof SAMPLE_QUESTIONS)[number]
): Promise<CompareResponse> {
  const res = await fetch("/api/generate-diagram?compare=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionText: question.question,
      subject: question.subject,
      topic: question.topic,
      compare: true,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function DiagramQualityInner() {
  const [states, setStates] = useState<QuestionState[]>(
    SAMPLE_QUESTIONS.map(() => ({ loading: true, error: null, results: {} }))
  );

  useEffect(() => {
    SAMPLE_QUESTIONS.forEach((q, idx) => {
      fetchCompare(q)
        .then((data) => {
          setStates((prev) => {
            const next = [...prev];
            next[idx] = {
              loading: false,
              error: null,
              results: {
                gemini_flash: data.gemini_flash?.svg ?? null,
                gemini_pro: data.gemini_pro?.svg ?? null,
                claude: data.claude?.svg ?? null,
              },
            };
            return next;
          });
        })
        .catch((err) => {
          setStates((prev) => {
            const next = [...prev];
            next[idx] = {
              loading: false,
              error: String(err?.message ?? "Request failed"),
              results: {},
            };
            return next;
          });
        });
    });
  }, []);

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 1600, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "#1e293b",
              }}
            >
              Diagram Quality Comparison
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                color: "#64748b",
                fontSize: "0.82rem",
              }}
            >
              5 sources × 3 questions — AI diagrams auto-generate on load (may
              take up to 90 s)
            </p>
          </div>
          <Link
            to="/admin/diagram-compare"
            style={{
              fontSize: "0.8rem",
              color: "#0ea5e9",
              textDecoration: "none",
            }}
          >
            ← Back to free-form compare
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 6,
            marginBottom: 12,
            padding: "6px 10px",
            background: "#fff",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
          }}
        >
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: col.color,
                textAlign: "center",
              }}
            >
              {col.label}
              {col.ai && (
                <span
                  style={{
                    display: "block",
                    fontSize: "0.65rem",
                    color: "#94a3b8",
                    fontWeight: 400,
                  }}
                >
                  AI · live call
                </span>
              )}
            </div>
          ))}
        </div>

        {SAMPLE_QUESTIONS.map((q, idx) => {
          const state = states[idx];
          return (
            <div
              key={q.id}
              style={{
                marginBottom: 20,
                background: "#fff",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  background: "#f1f5f9",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.7rem",
                      background: "#1e293b",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontWeight: 700,
                    }}
                  >
                    {q.id}
                  </span>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#1e293b",
                    }}
                  >
                    {q.title}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    {q.subtitle}
                  </span>
                </div>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: "0.82rem",
                    color: "#334155",
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}
                >
                  &ldquo;{q.question}&rdquo;
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 8,
                  padding: 10,
                }}
              >
                {COLUMNS.map((col) => {
                  if (col.key === "current") {
                    return (
                      <DiagramCard
                        key={col.key}
                        colKey={col.key}
                        label={col.label}
                        color={col.color}
                        svg={q.currentSvg}
                      />
                    );
                  }
                  if (col.key === "improved") {
                    return (
                      <DiagramCard
                        key={col.key}
                        colKey={col.key}
                        label={col.label}
                        color={col.color}
                        svg={q.improvedSvg}
                      />
                    );
                  }
                  const aiKey = col.key as "gemini_flash" | "gemini_pro" | "claude";
                  return (
                    <DiagramCard
                      key={col.key}
                      colKey={col.key}
                      label={col.label}
                      color={col.color}
                      loading={state.loading}
                      svg={state.results[aiKey]}
                      error={state.error ?? undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: "0.78rem",
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: "#1e293b" }}>What to check:</strong>{" "}
          Does any column consistently show the correct given values (3 cm, 7.5
          cm, 20 cm focal length, double-circulation labels)?{" "}
          <strong>Improved Template</strong> = best-case handcrafted baseline.{" "}
          <strong>AI columns</strong> = real live calls — scroll back up to
          compare once loaded.
        </div>
      </div>
    </div>
  );
}

export default function DiagramQualityPage() {
  return (
    <RequireAuth>
      <DiagramQualityInner />
    </RequireAuth>
  );
}
