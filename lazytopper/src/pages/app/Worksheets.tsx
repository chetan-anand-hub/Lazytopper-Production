import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { generatePracticeQuestions } from "../../data/predictionDataService";
import { downloadWorksheet } from "../../components/practice/worksheetGenerator";
import type { LTSubjectKey } from "../../data/class10ContentConfig";

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

const PRESETS = [
  { key: "board-mix",      label: "Board exam mix",      desc: "Balanced A–E, all difficulty" },
  { key: "quick-drill",    label: "Quick drill",          desc: "20 Qs, mixed difficulty" },
  { key: "marks-focus",    label: "High-marks focus",     desc: "Sections C–E, harder Qs" },
];

const SECTIONS = ["All", "A", "B", "C", "D", "E"];
const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"];

type Mode = "preset" | "custom";

export default function Worksheets() {
  const navigate = useNavigate();
  const ctx = useSubjectContext();

  const [subject, setSubject] = useState<"Maths" | "Science">(
    (ctx.subject as "Maths" | "Science") || "Maths"
  );
  const topics = subject === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;

  const [topicKey, setTopicKey]   = useState(topics[0].key);
  const [mode, setMode]           = useState<Mode>("preset");
  const [preset, setPreset]       = useState("board-mix");
  const [section, setSection]     = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [count, setCount]         = useState(20);
  const [generating, setGenerating] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  function switchSubject(s: "Maths" | "Science") {
    const newTopics = s === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;
    setSubject(s);
    setTopicKey(newTopics[0].key);
  }

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const effectiveDifficulty = difficulty === "All" ? undefined : difficulty;
      const effectiveSection    = section === "All" ? "All" : section;
      const effectiveCount      = mode === "preset" ? (preset === "quick-drill" ? 20 : preset === "marks-focus" ? 15 : 25) : count;

      const questions = generatePracticeQuestions({
        subject: subject as LTSubjectKey,
        topicKey,
        count: effectiveCount,
        difficulty: effectiveDifficulty as never,
      });

      if (questions.length === 0) {
        setError("No questions found for this combination. Try a different topic or section.");
        setGenerating(false);
        return;
      }

      const topicLabel = topics.find((t) => t.key === topicKey)?.label ?? topicKey;
      const opts = {
        topicLabel,
        subjectKey: subject,
        grade: "10",
        difficulty: effectiveDifficulty ?? "All",
        sectionFilter: effectiveSection,
        questions,
      };

      await downloadWorksheet(opts);
      navigate("/app/practice/worksheets/ready", { state: { opts } });
    } catch (e) {
      setError("Worksheet generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <MobileShell
      title="Worksheet Generator"
      subtitle="Powerful but simple"
      showBack
      onBack={() => navigate("/app/practice")}
      showNav
    >
      {/* Scrollable content — bottom padding leaves room for sticky CTA + BottomNav */}
      <div
        className="screen-pad animate-float-up"
        style={{ paddingBottom: 136, display: "flex", flexDirection: "column", gap: 16 }}
      >

        {/* ── Subject / Class card ─────────────────────────────── */}
        <div className="card-soft" style={{ padding: "16px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Subject & class
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["Maths", "Science"] as const).map((s) => (
              <button
                key={s}
                onClick={() => switchSubject(s)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  border: subject === s ? "none" : "1px solid hsla(255,100%,100%,0.1)",
                  background: subject === s ? "hsl(142,71%,45%)" : "transparent",
                  color: subject === s ? "#000" : "var(--text-muted)",
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

          {/* Class locked */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Class</span>
            <span
              className="pill"
              style={{ background: "hsla(255,100%,100%,0.07)", color: "var(--text-muted)", fontSize: "0.72rem", border: "none" }}
            >
              Class 10 · CBSE
            </span>
          </div>

          {/* Topic select */}
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 6 }}>Topic</div>
            <select
              value={topicKey}
              onChange={(e) => setTopicKey(e.target.value)}
              style={{
                width: "100%",
                height: 42,
                borderRadius: 10,
                border: "1px solid hsla(255,100%,100%,0.1)",
                background: "var(--bg)",
                color: "var(--text)",
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
                border: mode === m ? "2px solid hsl(142,71%,45%)" : "1px solid hsla(255,100%,100%,0.1)",
                background: mode === m ? "hsla(142,71%,45%,0.1)" : "var(--bg-card)",
                color: mode === m ? "hsl(142,71%,55%)" : "var(--text-muted)",
                textAlign: "left",
                cursor: "pointer",
                transition: "border 0.15s",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2, color: mode === m ? "var(--text)" : "var(--text-muted)" }}>
                {m === "preset" ? "Preset board mix" : "Custom filters"}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {m === "preset" ? "Curated by difficulty" : "You control everything"}
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
                  border: preset === p.key ? "2px solid hsl(142,71%,45%)" : "1px solid hsla(255,100%,100%,0.1)",
                  background: preset === p.key ? "hsla(142,71%,45%,0.09)" : "var(--bg-card)",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--text)",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: preset === p.key ? "5px solid hsl(142,71%,45%)" : "2px solid hsla(255,100%,100%,0.2)",
                    flexShrink: 0,
                    transition: "border 0.15s",
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{p.label}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Custom panel ─────────────────────────────────────────── */}
        {mode === "custom" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Section filter */}
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Section
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSection(s)}
                    className="pill tap"
                    style={{
                      border: section === s ? "none" : "1px solid hsla(255,100%,100%,0.12)",
                      background: section === s ? "hsl(142,71%,45%)" : "var(--bg-card)",
                      color: section === s ? "#000" : "var(--text-muted)",
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
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Difficulty
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className="pill tap"
                    style={{
                      border: difficulty === d ? "none" : "1px solid hsla(255,100%,100%,0.12)",
                      background: difficulty === d ? "hsl(217,91%,60%)" : "var(--bg-card)",
                      color: difficulty === d ? "#000" : "var(--text-muted)",
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
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Question count
                </span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "hsl(142,71%,55%)" }}>
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
                style={{ width: "100%", accentColor: "hsl(142,71%,45%)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 4 }}>
                <span>5</span><span>50</span>
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "hsla(0,72%,51%,0.1)",
              border: "1px solid hsla(0,72%,51%,0.25)",
              color: "hsl(0,72%,65%)",
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
          bottom: 68,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          borderTop: "1px solid hsla(255,100%,100%,0.07)",
          background: "hsla(0,0%,7%,0.96)",
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
            background: generating ? "hsla(142,71%,45%,0.5)" : "hsl(142,71%,45%)",
            color: "#000",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1rem",
            cursor: generating ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {generating ? "Generating…" : "Generate worksheet →"}
        </button>
      </div>
    </MobileShell>
  );
}
