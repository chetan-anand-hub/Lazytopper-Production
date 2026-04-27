import React from "react";
import { useNavigate } from "react-router-dom";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { ContextBar } from "../../components/desktop/l2/ContextBar";
import { generatePracticeQuestions } from "../../data/predictionDataService";
import type { LTSubjectKey } from "../../data/predictionTypes";
import { sectionScopeLabel } from "../../components/practice/worksheetGenerator";
import type {
  WorksheetOptions,
  SectionScope,
} from "../../components/practice/worksheetGenerator";

/**
 * DesktopWorksheetsPage — Level 2 graduation (PR-D).
 *
 * Reference (final desktop prototype):
 *   chetan-anand-hub/topic-focus-lite — worksheet workspace pattern
 *
 * Mobile parity: this page is a desktop sibling of
 *   lazytopper/src/pages/app/Worksheets.tsx
 * It uses the EXACT same generation contract:
 *   - same MATHS_TOPICS / SCIENCE_TOPICS / PRESETS / SECTIONS / DIFFICULTIES
 *   - same generatePracticeQuestions argument shape
 *   - same WorksheetOptions output shape
 *   - same navigate("/practice/worksheets/ready", { state: { opts } })
 * so the existing WorksheetReady page works for both desktop and mobile
 * without modification. Mobile Worksheets.tsx is NOT touched.
 *
 * Composition (single file):
 *   1. ContextBar — intent-first header ("What worksheet do you want to build?")
 *   2. Setup panel (left) — Subject toggle (Maths/Science) · Class 10 · CBSE
 *      indicator · Topic select · Preset vs Custom mode tabs · Preset list or
 *      Custom controls (Section / Difficulty / Count)
 *   3. Blueprint preview (right) — truthful summary of what *will be*
 *      generated, plus the Generate CTA and any honest empty/error message
 *
 * Production constraints:
 *   - Inline styles only (no Tailwind, no shadcn classes).
 *   - Inline SVG only (no lucide-react).
 *   - Light theme tokens shared with DesktopShell + DesktopHome + DesktopPracticePage.
 *   - No new npm dependency. No PR #17 imports. No new generator — reuses
 *     the exact production generator the mobile Worksheets page already uses.
 */

// ── Mirror mobile constants exactly so generation behavior is identical. ──
//    Source: lazytopper/src/pages/app/Worksheets.tsx
const MATHS_TOPICS = [
  { key: "real-numbers",              label: "Real Numbers" },
  { key: "polynomials",               label: "Polynomials" },
  { key: "pair-of-linear-equations",  label: "Linear Equations" },
  { key: "quadratic-equations",       label: "Quadratic Equations" },
  { key: "arithmetic-progression",    label: "Arithmetic Progression" },
  { key: "triangles",                 label: "Triangles" },
  { key: "coordinate-geometry",       label: "Coordinate Geometry" },
  { key: "circles",                   label: "Circles" },
  { key: "areas-related-to-circles",  label: "Areas Related to Circles" },
  { key: "surface-areas-and-volumes", label: "Surface Areas & Volumes" },
  { key: "trigonometry",              label: "Trigonometry" },
  { key: "statistics",                label: "Statistics" },
  { key: "probability",               label: "Probability" },
];

const SCIENCE_TOPICS = [
  { key: "chemical-reactions-equations", label: "Chemical Reactions" },
  { key: "acids-bases-salts",           label: "Acids, Bases & Salts" },
  { key: "metals-non-metals",           label: "Metals & Non-Metals" },
  { key: "carbon-and-its-compounds",    label: "Carbon Compounds" },
  { key: "life-processes",              label: "Life Processes" },
  { key: "control-and-coordination",    label: "Control & Coordination" },
  { key: "reproduction",                label: "Reproduction" },
  { key: "heredity-and-evolution",      label: "Heredity & Evolution" },
  { key: "light",                       label: "Light – Reflection & Refraction" },
  { key: "electricity",                 label: "Electricity" },
  { key: "magnetic-effects",            label: "Magnetic Effects of Current" },
  { key: "our-environment",             label: "Our Environment" },
];

interface PresetConfig {
  key: string;
  label: string;
  desc: string;
  sections: SectionScope;
  difficulty: "All" | "Easy" | "Medium" | "Hard";
  count: number;
}

const PRESETS: PresetConfig[] = [
  {
    key: "board-mix",
    label: "Board exam mix",
    desc: "All sections A–E · All difficulty · 25 questions",
    sections: "All",
    difficulty: "All",
    count: 25,
  },
  {
    key: "quick-drill",
    label: "Quick drill",
    desc: "Sections A–B · All difficulty · 15 questions",
    sections: ["A", "B"],
    difficulty: "All",
    count: 15,
  },
  {
    key: "marks-focus",
    label: "High-marks focus",
    desc: "Sections C–E · Hard difficulty · 20 questions",
    sections: ["C", "D", "E"],
    difficulty: "Hard",
    count: 20,
  },
];

const SECTIONS = ["All", "A", "B", "C", "D", "E"] as const;
const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"] as const;

type Mode = "preset" | "custom";

// ── Tokens (parity with DesktopPracticePage) ──────────────────────────────
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const PRIMARY_GREEN_FG = "hsl(152, 55%, 28%)";
const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const PILL_BG = "hsl(210, 33%, 96%)";
const DANGER_FG = "hsl(0, 65%, 38%)";
const DANGER_BG = "hsl(0, 75%, 96%)";
const DANGER_BORDER = "hsl(0, 70%, 88%)";

const FONT_DISPLAY =
  '"Fraunces", "Source Serif Pro", Georgia, "Times New Roman", serif';
const FONT_BODY =
  '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

const IconStroke: React.CSSProperties = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function IconWorksheet({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function IconArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={IconStroke} aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: PRIMARY_GREEN,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        appearance: "none",
        WebkitAppearance: "none",
        border: `1px solid ${active ? PRIMARY_GREEN : BORDER}`,
        background: active ? PRIMARY_GREEN_SOFT : CARD_BG,
        color: active ? PRIMARY_GREEN_FG : TEXT_MUTED,
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        fontFamily: FONT_BODY,
        transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
      }}
    >
      {children}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
const RETURN_TO = "/practice/worksheets";
const SOURCE = "worksheet" as const;

export default function DesktopWorksheetsPage() {
  const navigate = useNavigate();
  const ctx = useSubjectContext();

  const [subject, setSubject] = React.useState<"Maths" | "Science">(
    (ctx.subject as "Maths" | "Science") || "Maths",
  );
  const topics = subject === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;

  const [topicKey, setTopicKey]     = React.useState(topics[0].key);
  const [mode, setMode]             = React.useState<Mode>("preset");
  const [preset, setPreset]         = React.useState<string>("board-mix");
  const [section, setSection]       = React.useState<typeof SECTIONS[number]>("All");
  const [difficulty, setDifficulty] = React.useState<typeof DIFFICULTIES[number]>("All");
  const [count, setCount]           = React.useState(20);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError]           = React.useState<string | null>(null);

  function switchSubject(s: "Maths" | "Science") {
    const newTopics = s === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;
    setSubject(s);
    setTopicKey(newTopics[0].key);
  }

  // Mirror mobile handleGenerate exactly so generation behavior is identical.
  // Source: lazytopper/src/pages/app/Worksheets.tsx — handleGenerate
  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const p = PRESETS.find((x) => x.key === preset)!;
      const effectiveDifficulty = mode === "preset" ? p.difficulty : difficulty;
      const effectiveCount      = mode === "preset" ? p.count      : count;

      const effectiveSections: SectionScope =
        mode === "preset"
          ? p.sections
          : section === "All" ? "All" : [section];

      const sectionsArg: string[] | undefined =
        effectiveSections === "All" ? undefined : (effectiveSections as string[]);

      const questions = generatePracticeQuestions({
        subject: subject as LTSubjectKey,
        topicKey,
        count: effectiveCount,
        difficulty: effectiveDifficulty === "All" ? undefined : effectiveDifficulty as never,
        sections: sectionsArg,
        // Worksheets must never repeat questions to inflate count — same
        // contract mobile uses. A smaller result means the bank genuinely has
        // fewer matching unique questions.
        allowRepeats: false,
      });

      if (questions.length === 0) {
        const scopeStr = sectionScopeLabel(effectiveSections);
        setError(
          `No questions found for ${scopeStr} in this topic. ` +
          `Try a different topic or the "Board exam mix" preset for full coverage.`,
        );
        setGenerating(false);
        return;
      }

      const topicLabel = topics.find((t) => t.key === topicKey)?.label ?? topicKey;
      const opts: WorksheetOptions = {
        topicLabel,
        subjectKey: subject,
        grade: "10",
        difficulty: effectiveDifficulty,
        sectionFilter: effectiveSections,
        questions,
      };

      navigate("/practice/worksheets/ready", { state: { opts } });
    } catch {
      setError("Worksheet generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const activePreset = PRESETS.find((p) => p.key === preset)!;
  const effectiveDifficulty = mode === "preset" ? activePreset.difficulty : difficulty;
  const effectiveCount      = mode === "preset" ? activePreset.count      : count;
  const effectiveSections: SectionScope =
    mode === "preset"
      ? activePreset.sections
      : section === "All" ? "All" : [section];
  const topicLabel = topics.find((t) => t.key === topicKey)?.label ?? topicKey;

  // Honest header chips that describe the active scope.
  const chips = [
    { label: subject, tone: "accent" as const },
    { label: "Class 10 · CBSE", tone: "info" as const },
    { label: `Topic: ${topicLabel}`, tone: "neutral" as const },
    {
      label: mode === "preset" ? `Preset: ${activePreset.label}` : "Custom filters",
      tone: "neutral" as const,
    },
  ];

  return (
    <div
      style={{
        padding: "32px 32px 56px",
        maxWidth: 1180,
        margin: "0 auto",
        fontFamily: FONT_BODY,
        color: TEXT_FG,
      }}
    >
      <ContextBar
        eyebrow="Practice · Worksheet"
        title="What worksheet do you want to build?"
        subtitle="Pick a topic, then choose a board-pattern preset or set your own filters. Nothing is generated until you press Generate — the preview on the right shows exactly what will come out."
        chips={chips}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* ── LEFT — setup panel ───────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Subject + class + topic card */}
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div>
              <SectionLabel>Subject &amp; class</SectionLabel>

              {/* Subject segmented control */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["Maths", "Science"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => switchSubject(s)}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 10,
                      border: subject === s ? "none" : `1px solid ${BORDER}`,
                      background: subject === s ? PRIMARY_GREEN : PILL_BG,
                      color: subject === s ? "#ffffff" : TEXT_MUTED,
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: "0.88rem",
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Class indicator */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                  color: TEXT_MUTED,
                }}
              >
                <span>Class</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: PILL_BG,
                    color: TEXT_MUTED,
                    border: `1px solid ${BORDER}`,
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  Class 10 · CBSE
                </span>
              </div>
            </div>

            {/* Topic select */}
            <div>
              <SectionLabel>Topic</SectionLabel>
              <select
                value={topicKey}
                onChange={(e) => setTopicKey(e.target.value)}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                  background: CARD_BG,
                  color: TEXT_FG,
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  padding: "0 12px",
                  cursor: "pointer",
                }}
              >
                {topics.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Mode tabs */}
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <SectionLabel>Build mode</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {(["preset", "custom"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    padding: "14px 14px",
                    borderRadius: 12,
                    border: mode === m
                      ? `2px solid ${PRIMARY_GREEN}`
                      : `1px solid ${BORDER}`,
                    background: mode === m ? PRIMARY_GREEN_SOFT : CARD_BG,
                    color: TEXT_FG,
                    textAlign: "left",
                    cursor: "pointer",
                    fontFamily: FONT_BODY,
                    transition: "border 0.15s, background 0.15s",
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 600,
                      fontSize: "1rem",
                      marginBottom: 4,
                    }}
                  >
                    {m === "preset" ? "Preset board mix" : "Custom filters"}
                  </div>
                  <div style={{ fontSize: 12, color: TEXT_MUTED, lineHeight: 1.5 }}>
                    {m === "preset"
                      ? "Curated board-pattern combinations"
                      : "You control section, difficulty, and count"}
                  </div>
                </button>
              ))}
            </div>

            {/* Preset list */}
            {mode === "preset" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    style={{
                      appearance: "none",
                      WebkitAppearance: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: preset === p.key
                        ? `2px solid ${PRIMARY_GREEN}`
                        : `1px solid ${BORDER}`,
                      background: preset === p.key ? PRIMARY_GREEN_SOFT : CARD_BG,
                      cursor: "pointer",
                      textAlign: "left",
                      color: TEXT_FG,
                      fontFamily: FONT_BODY,
                      transition: "border 0.15s, background 0.15s",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: preset === p.key
                          ? `5px solid ${PRIMARY_GREEN}`
                          : `2px solid ${BORDER}`,
                        flexShrink: 0,
                        transition: "border 0.15s",
                      }}
                      aria-hidden
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{p.label}</div>
                      <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>
                        {p.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Custom controls */}
            {mode === "custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <SectionLabel>Section (filters generated questions)</SectionLabel>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SECTIONS.map((s) => (
                      <Pill key={s} active={section === s} onClick={() => setSection(s)}>
                        {s === "All" ? "All sections" : `Section ${s}`}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel>Difficulty</SectionLabel>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {DIFFICULTIES.map((d) => (
                      <Pill key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
                        {d}
                      </Pill>
                    ))}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <SectionLabel>Question count</SectionLabel>
                    <span
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 16,
                        color: PRIMARY_GREEN,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    style={{ width: "100%", accentColor: PRIMARY_GREEN }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: TEXT_MUTED,
                      marginTop: 4,
                    }}
                  >
                    <span>5</span><span>50</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT — preview / blueprint + generate ──────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <SectionLabel>Worksheet preview</SectionLabel>
              <h2
                style={{
                  fontFamily: FONT_DISPLAY,
                  margin: 0,
                  fontSize: "1.3rem",
                  fontWeight: 600,
                  letterSpacing: "-0.005em",
                  color: TEXT_FG,
                }}
              >
                Will be generated
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: TEXT_MUTED, lineHeight: 1.5 }}>
                Honest summary of the request. The actual question set is built
                only when you press Generate.
              </p>
            </header>

            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <SummaryRow label="Subject" value={subject} />
              <SummaryRow label="Class" value="Class 10 · CBSE" />
              <SummaryRow label="Topic" value={topicLabel} />
              <SummaryRow
                label="Sections"
                value={sectionScopeLabel(effectiveSections)}
              />
              <SummaryRow
                label="Difficulty"
                value={effectiveDifficulty === "All" ? "All levels" : effectiveDifficulty}
              />
              <SummaryRow label="Question count" value={String(effectiveCount)} accent />
            </ul>

            {error ? (
              <div
                role="alert"
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: DANGER_BG,
                  border: `1px solid ${DANGER_BORDER}`,
                  color: DANGER_FG,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {error}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "none",
                background: generating ? "hsl(152, 30%, 75%)" : PRIMARY_GREEN,
                color: "#ffffff",
                fontFamily: FONT_BODY,
                fontWeight: 700,
                fontSize: 15,
                cursor: generating ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 120ms ease",
              }}
            >
              <IconWorksheet />
              {generating ? "Generating…" : "Generate worksheet"}
              {!generating ? <IconArrowRight /> : null}
            </button>

            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: TEXT_MUTED,
                lineHeight: 1.5,
              }}
            >
              On Generate, you&rsquo;ll be taken to the worksheet ready page
              where you can download a PDF or jump straight into practice.
            </p>
          </section>

          {/* Honest disclaimer mirroring the bridge convention used elsewhere */}
          <p
            style={{
              margin: 0,
              padding: "10px 14px",
              border: `1px dashed ${BORDER}`,
              background: PILL_BG,
              borderRadius: 10,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: TEXT_MUTED,
            }}
          >
            Topic list mirrors the mobile worksheet generator (Class 10 CBSE
            chapters) so desktop and mobile produce the same worksheets from
            the same question bank — no extra coverage is implied.
          </p>

          {/* Source/returnTo trail used by outbound deep-links from this page.
              We do NOT alter the navigate target / state passed to
              WorksheetReady — the trail is only a hint for surfaces that
              honor it. */}
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: TEXT_MUTED,
              fontStyle: "italic",
            }}
          >
            <span style={{ visibility: "hidden" }} aria-hidden>
              source={SOURCE} returnTo={RETURN_TO}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <li
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 0.8fr) 1fr",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        background: PILL_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
      }}
    >
      <span style={{ fontSize: 12, color: TEXT_MUTED, fontWeight: 500 }}>{label}</span>
      <span
        style={{
          fontSize: 14,
          fontWeight: accent ? 700 : 600,
          color: accent ? PRIMARY_GREEN : TEXT_FG,
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </li>
  );
}
