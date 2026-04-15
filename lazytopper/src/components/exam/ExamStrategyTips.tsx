import { useState } from "react";

const TIME_GUIDE = [
  { type: "MCQ (1 mark)", time: "1 min", color: "#6366f1" },
  { type: "Short Answer (2 marks)", time: "3 min", color: "#f59e0b" },
  { type: "Short Answer (3 marks)", time: "5 min", color: "#10b981" },
  { type: "Long Answer (5 marks)", time: "10 min", color: "#ef4444" },
  { type: "Case-Based (4 marks)", time: "8 min", color: "#8b5cf6" },
];

const STRATEGY_TIPS = [
  {
    title: "Internal Choice — Pick Wisely",
    body: 'In Sections B, C, D, and E, you get "OR" questions. Read both options quickly, then pick the one where you can show all working steps. More steps shown = more marks awarded.',
  },
  {
    title: "Time Management",
    body: "Allocate time proportional to marks: ~1 min per MCQ, ~3 min for 2-mark, ~5 min for 3-mark, ~10 min for 5-mark, and ~8 min for case-based. Keep 10 minutes at the end for review.",
  },
  {
    title: "Answer Order Strategy",
    body: "Start with the section you are most confident in. Many toppers start with Section A (MCQs) to build momentum, then tackle Section D/E while energy is high.",
  },
  {
    title: "Show Your Work",
    body: "CBSE awards step-marks. Even if you cannot reach the final answer, writing the formula, substituting values, and showing partial working can earn 60-80% of the marks.",
  },
];

interface ExamStrategyTipsProps {
  onDismiss: () => void;
}

export function ExamStrategyTips({ onDismiss }: ExamStrategyTipsProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: 18,
        padding: "22px 20px",
        background:
          "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(59,130,246,0.08) 100%)",
        border: "1px solid rgba(139,92,246,0.2)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#a78bfa",
              marginBottom: 4,
            }}
          >
            Exam Strategy Tips
          </div>
          <h3
            className="font-display"
            style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}
          >
            Before You Begin
          </h3>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss();
          }}
          style={{
            background: "transparent",
            border: "1px solid var(--bg-card-border)",
            borderRadius: 8,
            padding: "4px 10px",
            color: "var(--text-muted)",
            fontSize: "0.72rem",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {STRATEGY_TIPS.map((tip) => (
          <div
            key={tip.title}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.15)",
              border: "1px solid var(--bg-card-border)",
            }}
          >
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
              {tip.title}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {tip.body}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            marginBottom: 8,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Recommended Time Per Question
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TIME_GUIDE.map((item) => (
            <div
              key={item.type}
              style={{
                padding: "6px 12px",
                borderRadius: 10,
                background: `${item.color}10`,
                border: `1px solid ${item.color}25`,
                fontSize: "0.75rem",
                color: item.color,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {item.type}: <strong>{item.time}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimeGuideChip({ marks, section }: { marks: number; section: string }) {
  let recommended = "1 min";
  let color = "#6366f1";

  if (section === "E") {
    recommended = "8 min";
    color = "#8b5cf6";
  } else if (marks >= 5) {
    recommended = "10 min";
    color = "#ef4444";
  } else if (marks >= 3) {
    recommended = "5 min";
    color = "#10b981";
  } else if (marks >= 2) {
    recommended = "3 min";
    color = "#f59e0b";
  }

  return (
    <span
      title={`Recommended: ~${recommended} for this question`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 7px",
        borderRadius: 6,
        background: `${color}08`,
        border: `1px solid ${color}15`,
        fontSize: "0.62rem",
        fontWeight: 600,
        color: `${color}99`,
        marginLeft: 6,
      }}
    >
      ~{recommended}
    </span>
  );
}

export function InternalChoiceTip() {
  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.15)",
        fontSize: "0.7rem",
        color: "#fbbf24",
        marginTop: 4,
        lineHeight: 1.4,
      }}
    >
      Tip: Pick the question where you can show all steps — more working = more marks.
    </div>
  );
}
