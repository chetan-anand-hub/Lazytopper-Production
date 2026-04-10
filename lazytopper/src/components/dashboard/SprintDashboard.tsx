import { useState } from "react";
import { getHighlyProbableQuestions } from "../../data/highlyProbableQuestions";
import { SPRINT_FORMULAS } from "./dashboardUtils";
import { cbseDates, formatCbseDate } from "../../config/cbseDates";
import { CBSE_PHASE2_DATE, daysLeftFromIsoDate } from "../../services/cbseExamDate";

export function SprintDashboard({ daysLeft, navigate, gradeNum }: {
  daysLeft: number;
  navigate: (path: string, opts?: { state?: Record<string, string> }) => void;
  gradeNum: string;
}) {
  const likelihoodScore = (l: string) => l === "Very High" ? 4 : l === "High" ? 3 : l === "Medium-High" ? 2 : 1;

  const mathsQ = getHighlyProbableQuestions("Maths")
    .flatMap(b => b.questions.map(q => ({ ...q, _score: likelihoodScore(q.likelihood) })))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);

  const scienceQ = getHighlyProbableQuestions("Science")
    .flatMap(b => b.questions.map(q => ({ ...q, _score: likelihoodScore(q.likelihood) })))
    .sort((a, b) => b._score - a._score)
    .slice(0, 10);

  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`lazytopper.sprintChecklist.${new Date().toISOString().slice(0, 10)}`);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const toggleCheck = (key: string) => {
    setChecklist(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(`lazytopper.sprintChecklist.${new Date().toISOString().slice(0, 10)}`, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  const checklistItems = [
    { key: "formulas", label: "Revise key formulas (Maths + Science)", icon: "📐" },
    { key: "predicted", label: "Review top predicted questions", icon: "🎯" },
    { key: "mini-mock", label: "Complete a 15-min mini mock", icon: "📝" },
  ];

  const completedCount = checklistItems.filter(i => checklist[i.key]).length;
  void daysLeft;

  const phase2DaysLeft = daysLeftFromIsoDate(CBSE_PHASE2_DATE);

  return (
    <>
      <div style={{
        padding: "16px 18px", marginBottom: 16, borderRadius: 16,
        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "#ef4444" }}>Final Sprint — {daysLeft} days left</span>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
          Only essentials: predicted questions, key formulas & mini mocks.
        </div>
      </div>

      <div style={{
        padding: "14px 18px", marginBottom: 16, borderRadius: 16,
        background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
      }}>
        <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700, marginBottom: 8 }}>
          CBSE 2025-26: Two-Exam System
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e" }}>Phase 1</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{formatCbseDate(cbseDates.class10.phase1)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Compulsory</div>
          </div>
          <div style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#c084fc" }}>Phase 2</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{formatCbseDate(CBSE_PHASE2_DATE)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{phase2DaysLeft} days left</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, marginBottom: 6 }}>
          Phase 2 is optional — re-attempt up to 3 subjects to improve. Best score counts.
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
          Both exams cover the full syllabus. 75% attendance required for eligibility.
        </div>
      </div>

      <div style={{
        padding: "16px 18px", marginBottom: 16, borderRadius: 16,
        background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Today's Revision Checklist</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{completedCount}/{checklistItems.length}</span>
        </div>
        {checklistItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => toggleCheck(item.key)}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: "none", border: "none", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
              border: checklist[item.key] ? "2px solid #22c55e" : "2px solid rgba(255,255,255,0.15)",
              background: checklist[item.key] ? "rgba(34,197,94,0.2)" : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, color: "#22c55e",
            }}>{checklist[item.key] ? "✓" : ""}</div>
            <span style={{ fontSize: 12 }}>{item.icon}</span>
            <span style={{
              fontSize: 13, color: checklist[item.key] ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)",
              textDecoration: checklist[item.key] ? "line-through" : "none",
            }}>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={{
        padding: "16px 18px", marginBottom: 16, borderRadius: 16,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa" }}>🎯 Top 10 Predicted — Maths</span>
          <button type="button" onClick={() => navigate(`/highly-probable/${gradeNum}/Maths`, { state: { back: "/dashboard" } })} style={{
            fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
            background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)",
            color: "#60a5fa", cursor: "pointer",
          }}>View All</button>
        </div>
        {mathsQ.map((q, i) => (
          <div key={i} style={{
            padding: "8px 0",
            borderBottom: i < mathsQ.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 800, color: "#000", minWidth: 20, height: 20,
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: "#3b82f6", flexShrink: 0, marginTop: 2,
            }}>{i + 1}</span>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{q.question}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "16px 18px", marginBottom: 16, borderRadius: 16,
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#4ade80" }}>🎯 Top 10 Predicted — Science</span>
          <button type="button" onClick={() => navigate(`/highly-probable/${gradeNum}/Science`, { state: { back: "/dashboard" } })} style={{
            fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8,
            background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
            color: "#4ade80", cursor: "pointer",
          }}>View All</button>
        </div>
        {scienceQ.map((q, i) => (
          <div key={i} style={{
            padding: "8px 0",
            borderBottom: i < scienceQ.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 800, color: "#000", minWidth: 20, height: 20,
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              background: "#22c55e", flexShrink: 0, marginTop: 2,
            }}>{i + 1}</span>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>{q.question}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "16px 18px", marginBottom: 16, borderRadius: 16,
        background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)",
      }}>
        <span className="font-display" style={{ fontSize: 14, fontWeight: 700, display: "block", marginBottom: 12 }}>📐 Key Formulas</span>
        {SPRINT_FORMULAS.map((section, idx) => (
          <div key={idx} style={{ marginBottom: idx < SPRINT_FORMULAS.length - 1 ? 10 : 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4,
              color: section.subject === "Maths" ? "#60a5fa" : "#4ade80",
            }}>{section.subject}</div>
            {section.items.map((f, fi) => (
              <div key={fi} style={{
                fontSize: 12, color: "rgba(255,255,255,0.65)", padding: "3px 0",
                borderBottom: fi < section.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
              }}>{f}</div>
            ))}
          </div>
        ))}
        <button type="button" onClick={() => navigate("/night-before")} style={{
          width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(168,85,247,0.3)",
          background: "rgba(168,85,247,0.1)", color: "#c084fc", fontWeight: 700,
          fontSize: 12, cursor: "pointer",
        }}>See All Formulas →</button>
      </div>

      <button type="button" onClick={() => navigate("/mini-mock")} style={{
        width: "100%", padding: "16px 0", borderRadius: 14, border: "none", marginBottom: 16,
        background: "#a855f7", color: "#fff", fontWeight: 800, fontSize: 15,
        fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
        boxShadow: "0 0 24px rgba(168,85,247,0.3)",
      }}>⚡ Start 15-Minute Mini Mock</button>
    </>
  );
}
