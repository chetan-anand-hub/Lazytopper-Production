// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useNavigate, useLocation } from "react-router-dom";
import ReturnContextBar from "../components/ux/ReturnContextBar";

const SIGNALS = [
  {
    name: "Historical Frequency",
    weight: 30,
    color: "#22c55e",
    icon: "📊",
    description:
      "We analyze 10+ years of CBSE board papers to see how often each topic and subtopic has appeared. Topics that show up repeatedly year after year get a high historical score.",
    example:
      'Example: "Triangles — Similarity Criteria" has appeared in 9 out of the last 10 years, giving it a historical score of ~0.90.',
  },
  {
    name: "SQP Alignment",
    weight: 25,
    color: "#3b82f6",
    icon: "📋",
    description:
      "CBSE releases a Sample Question Paper (SQP) each year before boards. We match every topic and question format against the SQP. Exact matches score highest.",
    example:
      'Example: If the 2026 SQP includes a 3-mark question on "Arithmetic Progressions — Sum of n terms", that archetype gets an SQP score of 1.0.',
  },
  {
    name: "Rotation Signal",
    weight: 20,
    color: "#f59e0b",
    icon: "🔄",
    description:
      'Some topics rotate in and out — if a subtopic appeared last year, CBSE often swaps it for a "partner" subtopic. We track these rotation pairs and boost topics that are "due".',
    example:
      'Example: "Mean" appeared in 2025, so "Median" gets a rotation boost for 2026 since they are known rotation partners.',
  },
  {
    name: "NEP Policy Alignment",
    weight: 15,
    color: "#8b5cf6",
    icon: "📐",
    description:
      "CBSE is shifting toward case-based, application-oriented, and higher-order thinking questions under NEP 2020. We boost question formats that align with this policy direction.",
    example:
      "Example: A case-based question on Real-Life Applications of Trigonometry gets +0.25 NEP boost because case studies are a growing format.",
  },
  {
    name: "Difficulty Distribution",
    weight: 10,
    color: "#ef4444",
    icon: "⚖️",
    description:
      "CBSE papers follow a target difficulty mix (typically 30% Easy, 50% Medium, 20% Hard). We ensure predictions cover all difficulty levels proportionally.",
    example:
      'Example: An "Easy" question worth 1 mark gets a natural fit score of 0.7, while a "Medium" question worth 3 marks fits the blueprint optimally at 0.8.',
  },
];

export default function MethodologyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string } | null;
  const fromPath = state?.from || "/trends/10/Maths";

  return (
    <div className="dark-page">
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 16px 100px" }}>
        <ReturnContextBar backTo={fromPath} backLabel="Back to Trends" />

        <section
          style={{
            marginTop: 20,
            borderRadius: 20,
            padding: "28px 24px",
            background:
              "linear-gradient(135deg, rgba(34,197,94,0.10) 0%, rgba(59,130,246,0.08) 100%)",
            border: "1px solid rgba(34,197,94,0.15)",
          }}
        >
          <h1
            className="font-display"
            style={{
              fontSize: "clamp(1.3rem, 4vw, 1.8rem)",
              fontWeight: 800,
              color: "var(--text)",
              margin: "0 0 8px",
            }}
          >
            How We Predict Board Questions
          </h1>
          <p
            style={{
              fontSize: "0.88rem",
              lineHeight: 1.7,
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            LazyTopper uses a 5-signal composite scoring model to estimate how likely each
            question type is to appear in your CBSE board exam. No prediction is guaranteed
            — but our signals are grounded in real data, not guesswork.
          </p>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2
            className="font-display"
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}
          >
            The 5 Signals
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {SIGNALS.map((signal) => (
              <div
                key={signal.name}
                className="glass-card"
                style={{
                  padding: "18px 20px",
                  borderColor: `${signal.color}25`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: "1.3rem" }}>{signal.icon}</span>
                  <h3
                    className="font-display"
                    style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)", margin: 0 }}
                  >
                    {signal.name}
                  </h3>
                  <span
                    style={{
                      marginLeft: "auto",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      background: `${signal.color}18`,
                      color: signal.color,
                      border: `1px solid ${signal.color}30`,
                    }}
                  >
                    {signal.weight}% weight
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "0.82rem",
                    lineHeight: 1.6,
                    color: "var(--text-muted)",
                    margin: "0 0 8px",
                  }}
                >
                  {signal.description}
                </p>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(0,0,0,0.2)",
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                    lineHeight: 1.5,
                  }}
                >
                  {signal.example}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2
            className="font-display"
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}
          >
            How the Score is Calculated
          </h2>
          <div
            className="glass-card"
            style={{ padding: "18px 20px" }}
          >
            <div
              style={{
                fontFamily: "'Space Grotesk', monospace",
                fontSize: "0.85rem",
                color: "#22c55e",
                lineHeight: 1.8,
                overflowX: "auto",
              }}
            >
              <div>Score = (Historical × 0.30)</div>
              <div style={{ paddingLeft: 42 }}>+ (SQP × 0.25)</div>
              <div style={{ paddingLeft: 42 }}>+ (Rotation × 0.20)</div>
              <div style={{ paddingLeft: 42 }}>+ (NEP × 0.15)</div>
              <div style={{ paddingLeft: 42 }}>+ (Difficulty × 0.10)</div>
            </div>
            <p
              style={{
                fontSize: "0.8rem",
                lineHeight: 1.6,
                color: "var(--text-muted)",
                marginTop: 12,
                marginBottom: 0,
              }}
            >
              Each signal produces a value between 0 and 1. The weighted sum gives a composite
              score. A score of 0.70+ means "High confidence" — the question type appears in
              most years and matches multiple signals. Below 0.40 means "Low confidence" — 
              it could still appear, but the data doesn't strongly support it.
            </p>
          </div>
        </section>

        <section style={{ marginTop: 28 }}>
          <h2
            className="font-display"
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}
          >
            Confidence Levels
          </h2>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { label: "High", range: "70–100%", color: "#22c55e", desc: "Very likely to appear" },
              { label: "Medium", range: "40–69%", color: "#f59e0b", desc: "Possible — worth preparing" },
              { label: "Low", range: "0–39%", color: "#ef4444", desc: "Less likely but not impossible" },
            ].map((level) => (
              <div
                key={level.label}
                style={{
                  flex: "1 1 200px",
                  padding: "14px 16px",
                  borderRadius: 14,
                  background: `${level.color}08`,
                  border: `1px solid ${level.color}25`,
                }}
              >
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: level.color }}>
                  {level.label} ({level.range})
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
                  {level.desc}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            marginTop: 28,
            padding: "16px 20px",
            borderRadius: 14,
            background: "var(--bg-card)",
            border: "1px solid var(--bg-card-border)",
          }}
        >
          <p
            style={{
              fontSize: "0.8rem",
              lineHeight: 1.6,
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            <strong style={{ color: "var(--text-muted)" }}>Disclaimer:</strong> These
            predictions are data-driven estimates based on publicly available CBSE papers and
            policy documents. They are not leaked papers or insider information. CBSE can
            change their pattern at any time. Always prepare the full syllabus — use predictions
            as a prioritization tool, not a shortcut.
          </p>
        </section>

        <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/trends/10/Maths")}
            style={{
              padding: "10px 24px",
              borderRadius: 14,
              border: "none",
              background: "#22c55e",
              color: "#000",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Back to Maths Trends
          </button>
          <button
            onClick={() => navigate("/trends/10/Science")}
            style={{
              padding: "10px 24px",
              borderRadius: 14,
              border: "2px solid #3b82f6",
              background: "transparent",
              color: "#3b82f6",
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Science Trends
          </button>
        </div>
      </div>
    </div>
  );
}
