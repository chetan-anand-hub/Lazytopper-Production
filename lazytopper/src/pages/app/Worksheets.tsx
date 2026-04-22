import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { generatePracticeQuestions } from "../../data/predictionDataService";
import type { LTSubjectKey } from "../../data/predictionTypes";
import type { WorksheetOptions } from "../../components/practice/worksheetGenerator";

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

/*
 * Preset configurations.
 * Each preset maps to a concrete (section, difficulty, count) combination so
 * the UI accurately reflects what will be generated — no UI/behaviour drift.
 */
const PRESETS = [
  {
    key: "board-mix",
    label: "Board exam mix",
    desc: "All sections A–E · All difficulty · 25 questions",
    section: "All" as const,
    difficulty: "All" as const,
    count: 25,
  },
  {
    key: "quick-drill",
    label: "Quick drill",
    desc: "All sections · All difficulty · 15 questions",
    section: "All" as const,
    difficulty: "All" as const,
    count: 15,
  },
  {
    key: "marks-focus",
    label: "High-marks focus",
    desc: "All sections · Hard difficulty · 20 questions",
    section: "All" as const,
    difficulty: "Hard" as const,
    count: 20,
  },
] as const;

const SECTIONS = ["All", "A", "B", "C", "D", "E"] as const;
const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"] as const;

type Mode = "preset" | "custom";

export default function Worksheets() {
  const navigate = useNavigate();
  const ctx = useSubjectContext();

  const [subject, setSubject] = useState<"Maths" | "Science">(
    (ctx.subject as "Maths" | "Science") || "Maths"
  );
  const topics = subject === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;

  const [topicKey, setTopicKey]       = useState(topics[0].key);
  const [mode, setMode]               = useState<Mode>("preset");
  const [preset, setPreset]           = useState<typeof PRESETS[number]["key"]>("board-mix");
  const [section, setSection]         = useState<typeof SECTIONS[number]>("All");
  const [difficulty, setDifficulty]   = useState<typeof DIFFICULTIES[number]>("All");
  const [count, setCount]             = useState(20);
  const [generating, setGenerating]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  function switchSubject(s: "Maths" | "Science") {
    const newTopics = s === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;
    setSubject(s);
    setTopicKey(newTopics[0].key);
  }

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      /* Resolve effective parameters based on mode. */
      const p = PRESETS.find((x) => x.key === preset)!;
      const effectiveDifficulty = mode === "preset" ? p.difficulty : difficulty;
      const effectiveSection    = mode === "preset" ? p.section    : section;
      const effectiveCount      = mode === "preset" ? p.count      : count;

      /* Generate questions from the data service. */
      let questions = generatePracticeQuestions({
        subject: subject as LTSubjectKey,
        topicKey,
        count: effectiveCount,
        difficulty: effectiveDifficulty === "All" ? undefined : effectiveDifficulty as never,
      });

      /* Wire section filter: PracticeQuestion.section is the A–E key. */
      if (effectiveSection !== "All") {
        questions = questions.filter((q) => q.section === effectiveSection);
      }

      if (questions.length === 0) {
        setError(
          effectiveSection !== "All"
            ? `No ${effectiveSection}-section questions found for this topic. Try 'All sections' or a different topic.`
            : "No questions found for this combination. Try different settings."
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
        sectionFilter: effectiveSection,
        questions,
      };

      /* Navigate to the ready screen — download happens there on user action. */
      navigate("/practice/worksheets/ready", { state: { opts } });
    } catch {
      setError("Worksheet generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const activePreset = PRESETS.find((p) => p.key === preset)!;

  return (
    <MobileShell
      title="Worksheet Generator"
      subtitle="Powerful but simple"
      showBack
      onBack={() => navigate("/practice-hub")}
      showNav
    >
      {/* Scrollable content — extra bottom padding clears sticky CTA + BottomNav */}
      <div style={{ paddingBottom: 120, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Subject / Class / Topic card ─────────────────────── */}
        <div className="card-soft" style={{ padding: "16px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Subject & class
          </div>

          {/* Subject segmented control */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["Maths", "Science"] as const).map((s) => (
              <button
                key={s}
                onClick={() => switchSubject(s)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: subject === s ? "none" : `1px solid var(--mob-card-border)`,
                  background: subject === s ? "var(--mob-primary)" : "var(--mob-muted)",
                  color: subject === s ? "#ffffff" : "var(--mob-fg-muted)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Class display */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--mob-fg-muted)" }}>Class</span>
            <span
              className="pill"
              style={{ background: "var(--mob-muted)", color: "var(--mob-fg-muted)", fontSize: "0.72rem", border: "none" }}
            >
              Class 10 · CBSE
            </span>
          </div>

          {/* Topic select */}
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", marginBottom: 6 }}>Topic</div>
            <select
              value={topicKey}
              onChange={(e) => setTopicKey(e.target.value)}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 10,
                border: `1px solid var(--mob-card-border)`,
                background: "var(--mob-muted)",
                color: "var(--mob-fg)",
                fontFamily: "var(--font-body)",
                fontSize: "0.85rem",
                padding: "0 12px",
                cursor: "pointer",
              }}
            >
              {topics.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Mode cards ──────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {(["preset", "custom"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: "14px 12px",
                borderRadius: 14,
                border: mode === m
                  ? `2px solid var(--mob-primary)`
                  : `1px solid var(--mob-card-border)`,
                background: mode === m ? "rgba(26,58,92,0.06)" : "var(--mob-card)",
                color: "var(--mob-fg)",
                textAlign: "left",
                cursor: "pointer",
                transition: "border 0.15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2 }}>
                {m === "preset" ? "Preset board mix" : "Custom filters"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--mob-fg-muted)" }}>
                {m === "preset" ? "Curated combinations" : "You control everything"}
              </div>
            </button>
          ))}
        </div>

        {/* ── Preset panel ─────────────────────────────────────────── */}
        {mode === "preset" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "14px 14px",
                  borderRadius: 14,
                  border: preset === p.key
                    ? `2px solid var(--mob-primary)`
                    : `1px solid var(--mob-card-border)`,
                  background: preset === p.key ? "rgba(26,58,92,0.06)" : "var(--mob-card)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--mob-fg)",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: preset === p.key
                      ? `5px solid var(--mob-primary)`
                      : `2px solid var(--mob-card-border)`,
                    flexShrink: 0,
                    transition: "border 0.15s",
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{p.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)" }}>{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Custom panel ─────────────────────────────────────────── */}
        {mode === "custom" && (
          <div className="card-soft" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Section filter */}
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Section (filters generated questions)
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSection(s)}
                    className="pill tap"
                    style={{
                      border: section === s ? "none" : `1px solid var(--mob-card-border)`,
                      background: section === s ? "var(--mob-primary)" : "var(--mob-muted)",
                      color: section === s ? "#ffffff" : "var(--mob-fg-muted)",
                      fontWeight: section === s ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {s === "All" ? "All sections" : `Section ${s}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Difficulty
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="pill tap"
                    style={{
                      border: difficulty === d ? "none" : `1px solid var(--mob-card-border)`,
                      background: difficulty === d ? "var(--mob-primary)" : "var(--mob-muted)",
                      color: difficulty === d ? "#ffffff" : "var(--mob-fg-muted)",
                      fontWeight: difficulty === d ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Question count
                </span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--mob-primary)" }}>
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
                style={{ width: "100%", accentColor: "var(--mob-primary)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--mob-fg-muted)", marginTop: 4 }}>
                <span>5</span><span>50</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary of what will be generated (preset only) */}
        {mode === "preset" && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--mob-muted)",
              border: `1px solid var(--mob-muted-border)`,
              fontSize: "0.74rem",
              color: "var(--mob-fg-muted)",
            }}
          >
            Will generate: <strong style={{ color: "var(--mob-fg)" }}>{activePreset.count} questions</strong> ·{" "}
            {activePreset.difficulty === "All" ? "all difficulty" : activePreset.difficulty.toLowerCase()} ·{" "}
            {activePreset.section === "All" ? "all sections" : `Section ${activePreset.section}`}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--mob-danger-soft)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--mob-danger)",
              fontSize: "0.82rem",
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ── Sticky Generate CTA ──────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "var(--mob-nav-height)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 440,
          borderTop: `1px solid var(--mob-card-border)`,
          background: "rgba(245,245,247,0.97)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "12px 20px",
          boxSizing: "border-box",
          zIndex: 30,
        }}
      >
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "none",
            background: generating ? "rgba(26,58,92,0.4)" : "var(--mob-primary)",
            color: "#ffffff",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1rem",
            cursor: generating ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {generating ? "Building…" : "Generate worksheet →"}
        </button>
      </div>
    </MobileShell>
  );
}
