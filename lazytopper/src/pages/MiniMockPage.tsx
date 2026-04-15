import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getHighlyProbableQuestions } from "../data/highlyProbableQuestions";
import type { HPQQuestion } from "../data/highlyProbableQuestions";
import ReturnContextBar from "../components/ux/ReturnContextBar";

const TOTAL_TIME = 15 * 60;
const TOTAL_QUESTIONS = 10;

function getMinMockQuestions(): { subject: string; question: HPQQuestion }[] {
  const likelihoodScore = (l: string) => l === "Very High" ? 4 : l === "High" ? 3 : l === "Medium-High" ? 2 : 1;

  const mathsBuckets = getHighlyProbableQuestions("Maths");
  const scienceBuckets = getHighlyProbableQuestions("Science");

  const all: { subject: string; question: HPQQuestion; score: number }[] = [];

  for (const b of mathsBuckets) {
    for (const q of b.questions) {
      all.push({ subject: "Maths", question: q, score: likelihoodScore(q.likelihood) });
    }
  }
  for (const b of scienceBuckets) {
    for (const q of b.questions) {
      all.push({ subject: "Science", question: q, score: likelihoodScore(q.likelihood) });
    }
  }

  all.sort((a, b) => b.score - a.score);

  const selected: { subject: string; question: HPQQuestion }[] = [];
  let mathsCount = 0;
  let scienceCount = 0;
  for (const item of all) {
    if (selected.length >= TOTAL_QUESTIONS) break;
    if (item.subject === "Maths" && mathsCount < 5) {
      selected.push({ subject: item.subject, question: item.question });
      mathsCount++;
    } else if (item.subject === "Science" && scienceCount < 5) {
      selected.push({ subject: item.subject, question: item.question });
      scienceCount++;
    }
  }
  return selected;
}

type MockState = "setup" | "active" | "completed";

export default function MiniMockPage() {
  const navigate = useNavigate();
  const questions = useMemo(() => getMinMockQuestions(), []);
  const [state, setState] = useState<MockState>("setup");
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [confidence, setConfidence] = useState<Record<number, "sure" | "unsure" | "guessed">>({});

  useEffect(() => {
    if (state !== "active") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setState("completed");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, []);

  const attemptedCount = Object.keys(answers).length;
  const currentQ = questions[currentIdx];

  if (state === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
        <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 32px" }}>
          <ReturnContextBar backTo="/dashboard" backLabel="Back to Dashboard" />
          <div style={{
            marginTop: 40, padding: "32px 24px", borderRadius: 20, textAlign: "center",
            background: "linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.08))",
            border: "1px solid rgba(168,85,247,0.2)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
              15-Minute Mini Mock
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 24px", lineHeight: 1.5 }}>
              {TOTAL_QUESTIONS} high-probability questions · 5 Maths + 5 Science<br />
              Timed at 15 minutes · Focus on speed & accuracy
            </p>
            <button
              onClick={() => setState("active")}
              style={{
                width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
                background: "#a855f7", color: "var(--text)", fontWeight: 800, fontSize: 16,
                fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
                boxShadow: "0 0 24px rgba(168,85,247,0.3)",
              }}
            >
              Start Mini Mock
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "completed") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
        <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 32px" }}>
          <div style={{
            marginTop: 24, padding: "28px 24px", borderRadius: 20, textAlign: "center",
            background: "linear-gradient(135deg, rgba(34,197,94,0.12), rgba(59,130,246,0.08))",
            border: "1px solid rgba(34,197,94,0.2)",
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
              Mini Mock Complete!
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" }}>
              {attemptedCount} of {TOTAL_QUESTIONS} answered · {formatTime(TOTAL_TIME - timeLeft)} used
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              {[
                { label: "Sure", count: Object.values(confidence).filter(c => c === "sure").length, color: "#22c55e" },
                { label: "Unsure", count: Object.values(confidence).filter(c => c === "unsure").length, color: "#f97316" },
                { label: "Guessed", count: Object.values(confidence).filter(c => c === "guessed").length, color: "#ef4444" },
              ].map((s) => (
                <div key={s.label} style={{ padding: "10px 8px", borderRadius: 10, background: "var(--bg-card)", textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 12px", fontFamily: "'Space Grotesk', sans-serif" }}>Review Questions</h3>
            {questions.map((item, idx) => (
              <div key={idx} style={{
                padding: "12px 14px", marginBottom: 8, borderRadius: 12,
                background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, color: "#000", minWidth: 20, height: 20,
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: item.subject === "Maths" ? "#3b82f6" : "#22c55e", flexShrink: 0,
                  }}>{idx + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.5, marginBottom: 4 }}>
                      {item.question.question}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {item.subject} · {confidence[idx] ? `Marked: ${confidence[idx]}` : "Not attempted"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate("/dashboard")}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none", marginTop: 16,
              background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15,
              fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10, padding: "12px 16px",
        background: "rgba(10,10,10,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--bg-card-border)",
      }}>
        <div style={{ maxWidth: 500, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontSize: 18, fontWeight: 800,
              color: timeLeft <= 60 ? "#ef4444" : timeLeft <= 180 ? "#f97316" : "#a855f7",
              fontFamily: "'Space Grotesk', sans-serif",
            }}>{formatTime(timeLeft)}</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Q {currentIdx + 1}/{TOTAL_QUESTIONS}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {questions.map((_, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentIdx(idx)}
                style={{
                  width: 20, height: 20, borderRadius: 4, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700,
                  background: idx === currentIdx ? "#a855f7" : answers[idx] ? "rgba(34,197,94,0.2)" : "var(--bg-card)",
                  color: idx === currentIdx ? "#fff" : answers[idx] ? "#4ade80" : "var(--text-muted)",
                  border: idx === currentIdx ? "1px solid #a855f7" : "1px solid var(--bg-card-border)",
                }}
              >{idx + 1}</div>
            ))}
          </div>
          <button onClick={() => setState("completed")} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>Submit</button>
        </div>
      </div>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "24px 16px 80px" }}>
        {currentQ && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
            }}>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                background: currentQ.subject === "Maths" ? "rgba(59,130,246,0.15)" : "rgba(34,197,94,0.15)",
                color: currentQ.subject === "Maths" ? "#60a5fa" : "#4ade80",
                border: `1px solid ${currentQ.subject === "Maths" ? "rgba(59,130,246,0.3)" : "rgba(34,197,94,0.3)"}`,
              }}>{currentQ.subject}</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{currentQ.question.likelihood}</span>
            </div>

            <div style={{
              padding: "20px 18px", borderRadius: 16, marginBottom: 20,
              background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
            }}>
              <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7 }}>
                {currentQ.question.question}
              </div>
            </div>

            <textarea
              value={answers[currentIdx] || ""}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentIdx]: e.target.value }))}
              placeholder="Write your answer here..."
              style={{
                width: "100%", minHeight: 120, padding: 14, borderRadius: 12,
                background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
                color: "var(--text)", fontSize: 13, fontFamily: "'Inter', sans-serif",
                resize: "vertical", outline: "none",
              }}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {(["sure", "unsure", "guessed"] as const).map((level) => {
                const colors = { sure: "#22c55e", unsure: "#f97316", guessed: "#ef4444" };
                const isActive = confidence[currentIdx] === level;
                return (
                  <button key={level} onClick={() => setConfidence(prev => ({ ...prev, [currentIdx]: level }))} style={{
                    flex: 1, padding: "10px 0", borderRadius: 10,
                    background: isActive ? `${colors[level]}20` : "var(--bg-card)",
                    border: isActive ? `1px solid ${colors[level]}50` : "1px solid var(--bg-card-border)",
                    color: isActive ? colors[level] : "var(--text-muted)",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                  }}>{level}</button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(i => i - 1)}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 12,
                  background: "var(--bg-card)", border: "none",
                  color: currentIdx === 0 ? "var(--text-muted)" : "var(--text-muted)",
                  fontWeight: 700, fontSize: 14, cursor: currentIdx === 0 ? "default" : "pointer",
                }}>← Prev</button>
              <button
                onClick={() => {
                  if (currentIdx < questions.length - 1) {
                    setCurrentIdx(i => i + 1);
                  } else {
                    setState("completed");
                  }
                }}
                style={{
                  flex: 1, padding: "14px 0", borderRadius: 12, border: "none",
                  background: currentIdx === questions.length - 1 ? "#22c55e" : "#a855f7",
                  color: currentIdx === questions.length - 1 ? "#000" : "#fff",
                  fontWeight: 800, fontSize: 14, cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>{currentIdx === questions.length - 1 ? "Submit →" : "Next →"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
