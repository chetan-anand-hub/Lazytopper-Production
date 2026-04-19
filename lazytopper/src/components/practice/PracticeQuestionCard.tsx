import { useState, useMemo, useRef, useCallback } from "react";
import { type PracticeQuestion } from "../../data/predictionDataService";
import { MathText } from "../question/MathText";
import { QuestionVisualAid } from "../question/QuestionVisualAid";
import { SolutionChecker } from "../question/SolutionChecker";
import { TimeGuideChip } from "../exam/ExamStrategyTips";
import type { StepSolutionResponse } from "../../ai/aiClient";
import { CorrectBurst, WrongShake } from "../celebrations";
import { getVisualConceptForQuestion } from "../../data/questionVisualMap";
import { VisualExplainer } from "../VisualExplainer";
import { useAuth } from "../../context/AuthContext";

const REPORT_TYPES = [
  "Wrong answer given",
  "Wrong solution steps",
  "Question text has a typo or is unclear",
  "Other",
] as const;

export interface PracticeQuestionCardProps {
  q: PracticeQuestion;
  idx: number;
  subjectKey: string;
  topicLabel: string;
  isOpen: boolean;
  selfAssessment: string | undefined;
  solutionLoading: boolean;
  solutionError: string | undefined;
  solutionData: StepSolutionResponse | undefined;
  mcqSelection: number | undefined;
  mcqResult: string | undefined;
  difficultyFilter?: string;
  onSetActiveQuestion: (id: string) => void;
  onToggleAnswer: (id: string, q: PracticeQuestion) => void;
  onMcqSelect: (qId: string, optionIdx: number) => void;
  onMcqResult: (qId: string, result: "correct" | "wrong") => void;
  onSelfAssessGotIt: (q: PracticeQuestion, idx: number) => void;
  onSelfAssessNeedPractice: (q: PracticeQuestion, idx: number) => void;
  onOpenConceptDrawer: (q: PracticeQuestion) => void;
  onOpenMentorBoard: (q: PracticeQuestion, idx: number) => void;
}

const DIFFICULTY_BADGE: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  Easy:   { emoji: "🟢", color: "#22c55e", bg: "rgba(34,197,94,0.08)",   border: "1px solid rgba(34,197,94,0.25)"   },
  Medium: { emoji: "🟡", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "1px solid rgba(245,158,11,0.25)"  },
  Hard:   { emoji: "🔴", color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "1px solid rgba(239,68,68,0.25)"   },
};

export function PracticeQuestionCard({
  q, idx, subjectKey, topicLabel,
  isOpen, selfAssessment, solutionLoading, solutionError, solutionData,
  mcqSelection, mcqResult, difficultyFilter,
  onSetActiveQuestion, onToggleAnswer, onMcqSelect, onMcqResult,
  onSelfAssessGotIt, onSelfAssessNeedPractice,
  onOpenConceptDrawer, onOpenMentorBoard: _onOpenMentorBoard,
}: PracticeQuestionCardProps) {
  const [showVisual, setShowVisual] = useState(false);
  const [showChecker, setShowChecker] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const stepSolutionRef = useRef<HTMLDivElement>(null);

  const { user, getToken } = useAuth();
  type ReportState = "idle" | "open" | "submitting" | "done" | "error";
  const reportedKey = `reported_q_${q.id}`;
  const [reportState, setReportState] = useState<ReportState>(
    () => (typeof sessionStorage !== "undefined" && sessionStorage.getItem(reportedKey) ? "done" : "idle"),
  );
  const [reportType, setReportType] = useState<string>(REPORT_TYPES[0]);
  const [reportComment, setReportComment] = useState("");
  const [reportError, setReportError] = useState<string | undefined>();

  const handleSubmitReport = useCallback(async () => {
    const uid = user?.uid || "";
    if (!uid) return;
    setReportState("submitting");
    setReportError(undefined);
    try {
      const token = await getToken();
      const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (token) authHeaders["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/shared-api/questions/report", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          questionId: String(q.id),
          reportType,
          comment: reportComment.slice(0, 200),
          topicKey: topicLabel,
          subject: subjectKey,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        try { sessionStorage.setItem(reportedKey, "1"); } catch (_) {}
        setReportState("done");
      } else {
        setReportError(json.error || "Failed to submit report");
        setReportState("error");
      }
    } catch {
      setReportError("Network error — please try again");
      setReportState("error");
    }
  }, [q.id, reportType, reportComment, topicLabel, subjectKey, user?.uid, getToken, reportedKey]);

  const handleRequestStepSolution = useCallback(() => {
    if (!isOpen) {
      onSetActiveQuestion(String(q.id));
      onToggleAnswer(q.id, q);
    }
    setTimeout(() => {
      stepSolutionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [isOpen, q, onSetActiveQuestion, onToggleAnswer]);

  const matchedVisual = useMemo(() => {
    return getVisualConceptForQuestion({
      id: String(q.id),
      subject: subjectKey as "Maths" | "Science",
      topicKey: topicLabel,
      subtopic: "",
      section: "",
      marks: q.marks,
      format: "Short" as const,
      difficulty: "Medium" as const,
      bloomSkill: "Applying" as const,
      questionText: q.questionText,
    });
  }, [q.id, q.questionText, subjectKey, topicLabel, q.marks]);
  const renderMcqOptions = () => {
    if (!Array.isArray(q.options) || q.options.length === 0) return null;
    const opts = q.options;
    const qId = String(q.id);
    const selected = mcqSelection;
    const result = mcqResult;
    const correctIdx = (() => {
      const co = (q as PracticeQuestion & { correctOption?: string }).correctOption;
      if (co && typeof co === "string" && co.length === 1) {
        return co.charCodeAt(0) - 65;
      }
      if (q.answer) {
        const ansLower = q.answer.trim().toLowerCase();
        const ai = opts.findIndex(o => o.trim().toLowerCase() === ansLower);
        if (ai >= 0) return ai;
        const pi = opts.findIndex(o => ansLower.includes(o.trim().toLowerCase()) || o.trim().toLowerCase().includes(ansLower));
        if (pi >= 0) return pi;
      }
      return -1;
    })();
    const handleMcqClick = (oi: number) => {
      if (result) return;
      onMcqSelect(qId, oi);
      if (correctIdx >= 0) {
        onMcqResult(qId, oi === correctIdx ? "correct" : "wrong");
      }
    };
    return (
      <div style={{ marginBottom: 10, paddingLeft: 4 }}>
        {opts.map((opt: string, oi: number) => {
          const isSelected = selected === oi;
          const isCorrect = !!result && oi === correctIdx;
          const isWrongChoice = result === "wrong" && isSelected;
          let bg = "transparent";
          let border = "1px solid transparent";
          let optColor = "var(--text)";
          if (isCorrect) { bg = "rgba(34,197,94,0.08)"; border = "1px solid rgba(34,197,94,0.3)"; optColor = "#22c55e"; }
          else if (isWrongChoice) { bg = "rgba(239,68,68,0.08)"; border = "1px solid rgba(239,68,68,0.3)"; optColor = "#ef4444"; }
          else if (isSelected && !result) { bg = "rgba(59,130,246,0.08)"; border = "1px solid rgba(59,130,246,0.4)"; }
          return (
            <button
              key={oi}
              type="button"
              onClick={() => handleMcqClick(oi)}
              style={{
                display: "flex", alignItems: "baseline", gap: 8,
                padding: "8px 12px", fontSize: "0.88rem", color: optColor,
                background: bg, border, borderRadius: 12,
                cursor: result ? "default" : "pointer",
                width: "100%", textAlign: "left", marginBottom: 4, transition: "all 0.15s",
              }}
            >
              <span style={{ fontWeight: 700, minWidth: 22, color: isCorrect ? "var(--color-success)" : isWrongChoice ? "var(--color-error)" : "var(--text-muted)" }}>
                {isCorrect ? "\u2713" : isWrongChoice ? "\u2717" : String.fromCharCode(65 + oi) + "."}
              </span>
              <MathText text={opt} />
            </button>
          );
        })}
        {result && (
          <div style={{
            marginTop: 6, padding: "8px 12px", borderRadius: 10,
            fontSize: "0.82rem", fontWeight: 700,
            background: result === "correct" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            color: result === "correct" ? "var(--color-success)" : "var(--color-error)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {result === "correct" ? (
              <>
                <CorrectBurst visible={true} size={24} />
                Correct! Well done.
              </>
            ) : (
              <>
                <WrongShake visible={true}>
                  <span style={{ fontSize: 20 }}>✗</span>
                </WrongShake>
                {`Incorrect. The correct answer is ${String.fromCharCode(65 + correctIdx)}.`}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <article
      ref={cardRef}
      data-testid="practice-question-card"
      data-question-id={String(q.id)}
      onClick={() => onSetActiveQuestion(String(q.id))}
      style={{
        borderRadius: 18, padding: "14px 16px 12px",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--bg-card-border)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
      }}
    >
      <header style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 6, gap: 8,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 999,
              backgroundColor: "var(--bg-card)", color: "var(--text)",
              fontSize: "0.75rem", fontWeight: 600, marginRight: 8,
            }}>{idx + 1}</span>
            <span>{q.marks} mark{q.marks !== 1 ? "s" : ""} - {q.section}</span>
            <TimeGuideChip marks={q.marks} section={q.section || ""} />
          </div>
          {difficultyFilter === "All" && q.difficulty && DIFFICULTY_BADGE[q.difficulty] && (
            <span style={{
              padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
              background: DIFFICULTY_BADGE[q.difficulty].bg,
              border: DIFFICULTY_BADGE[q.difficulty].border,
              color: DIFFICULTY_BADGE[q.difficulty].color,
            }}>
              {DIFFICULTY_BADGE[q.difficulty].emoji} {q.difficulty}
            </span>
          )}
          {(q.format === "Assertion-Reasoning" || /^Assertion\s*\(A\)/i.test(q.questionText)) && (
            <span style={{
              padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700,
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
              color: "var(--color-warning)",
            }}>
              Assertion & Reasoning
            </span>
          )}
        </div>
      </header>

      <p style={{
        fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.6,
        whiteSpace: "pre-wrap", marginBottom: 8,
      }}>
        <MathText text={q.questionText} />
      </p>

      {renderMcqOptions()}

      <QuestionVisualAid
        subject={subjectKey}
        topicKey={topicLabel}
        questionText={q.questionText}
        marks={q.marks}
      />

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8,
        alignItems: "center", marginBottom: 8,
      }}>
        <button
          data-testid="practice-mentor-cta"
          type="button"
          onClick={() => {
            onSetActiveQuestion(String(q.id));
            onToggleAnswer(q.id, q);
          }}
          style={{
            borderRadius: 999, padding: "5px 12px",
            border: "1px solid rgba(59,130,246,0.3)",
            backgroundColor: "rgba(59,130,246,0.06)",
            fontSize: "0.78rem", color: "var(--color-info)",
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 6,
          }}
        >
          <span>{isOpen ? "Hide solution" : "Step-by-Step Solution"}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onSetActiveQuestion(String(q.id));
            setShowChecker((v) => !v);
          }}
          style={{
            borderRadius: 999, padding: "5px 12px",
            border: "1px solid rgba(206,130,255,0.3)",
            backgroundColor: showChecker ? "rgba(206,130,255,0.14)" : "rgba(206,130,255,0.06)",
            fontSize: "0.78rem", color: "var(--color-violet)",
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 6,
          }}
        >
          <span>{showChecker ? "Hide checker" : "Check my answer"}</span>
        </button>
      </div>

      {showChecker && (
        <SolutionChecker
          question={q.questionText}
          marks={q.marks}
          subject={subjectKey}
          topic={topicLabel}
          questionId={String(q.id)}
          onRequestStepSolution={handleRequestStepSolution}
        />
      )}

      {isOpen && (
        <div
          ref={stepSolutionRef}
          style={{
            marginTop: 10, padding: "12px 14px",
            background: "var(--bg-card)", borderRadius: 12,
            border: "1px solid var(--bg-card-border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: "0.82rem", color: "var(--text)" }}>
              Step-by-Step Solution ({q.marks} {q.marks === 1 ? "mark" : "marks"})
            </strong>
          </div>

          {solutionLoading && (
            <div style={{ fontSize: "0.82rem", color: "var(--color-info)", padding: "8px 0" }}>
              Loading step-by-step solution...
            </div>
          )}
          {solutionError && (
            <div style={{ fontSize: "0.82rem", color: "var(--color-error)", padding: "8px 0" }}>
              {solutionError}
            </div>
          )}
          {solutionData && (
            <div>
              {solutionData.steps.map((step) => (
                <div key={step.stepNumber} style={{
                  display: "flex", gap: 10, marginBottom: 8,
                  padding: "8px 10px", background: "var(--bg-card)",
                  borderRadius: 8, border: "1px solid var(--bg-card-border)",
                }}>
                  <div style={{
                    minWidth: 28, height: 28, borderRadius: "50%",
                    background: "rgba(59,130,246,0.8)", color: "var(--text)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                  }}>{step.stepNumber}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>
                      <MathText text={step.description} />
                      <span style={{
                        marginLeft: 8, fontSize: "0.7rem", fontWeight: 700,
                        color: step.marks === 0 ? "var(--text-muted)" : "var(--color-light-blue)",
                        background: step.marks === 0 ? "var(--bg-card)" : "rgba(59,130,246,0.1)",
                        borderRadius: 999, padding: "1px 7px",
                      }}>
                        {step.marks === 0 ? "Explanation" : step.marks === 0.5 ? "\u00BD mark" : step.marks % 1 === 0.5 ? `${Math.floor(step.marks)}\u00BD marks` : `${step.marks} ${step.marks === 1 ? "mark" : "marks"}`}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                      <MathText text={step.working} />
                    </div>
                  </div>
                </div>
              ))}

              {solutionData.commonMistakes && solutionData.commonMistakes.length > 0 && (
                <div style={{
                  marginTop: 8, padding: "8px 10px",
                  background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
                }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-error)", marginBottom: 4 }}>
                    Common Mistakes
                  </div>
                  {solutionData.commonMistakes.map((m, i) => (
                    <div key={i} style={{ fontSize: "0.75rem", color: "rgba(239,68,68,0.8)", marginBottom: 2 }}>
                      {"\u2022"} {m}
                    </div>
                  ))}
                </div>
              )}
              {solutionData.examTip && (
                <div style={{
                  marginTop: 8, padding: "8px 10px",
                  background: "rgba(34,197,94,0.06)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)",
                  fontSize: "0.75rem", color: "var(--color-success)",
                }}>
                  <strong>Exam Tip:</strong> {solutionData.examTip}
                </div>
              )}

              <button
                onClick={() => onOpenConceptDrawer(q)}
                style={{
                  marginTop: 12, width: "100%", padding: "10px 14px",
                  borderRadius: 10, border: "1px solid rgba(206,130,255,0.3)",
                  background: "linear-gradient(135deg, rgba(206,130,255,0.06), rgba(206,130,255,0.08))",
                  color: "var(--color-violet)", fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: "1rem" }}>{"\uD83D\uDCA1"}</span>
                Teach me this concept
              </button>
              {matchedVisual && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowVisual((v) => !v)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      borderRadius: 10, border: "1px solid rgba(59,130,246,0.3)",
                      background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.10))",
                      color: "var(--color-light-blue)", fontSize: "0.82rem", fontWeight: 600,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{showVisual ? "\u25B2" : "\u25BC"}</span>
                    {showVisual ? "Hide Visual Explainer" : `See Visual: ${matchedVisual.title}`}
                  </button>
                  {showVisual && (
                    <div style={{ marginTop: 8 }}>
                      <VisualExplainer
                        src={matchedVisual.filePath}
                        title={matchedVisual.title}
                        height={300}
                        collapsible={false}
                        defaultCollapsed={false}
                        topic={matchedVisual.chapter}
                        concept={matchedVisual.title}
                        subject={matchedVisual.subject === "science" ? "Science" : "Maths"}
                        questionText={q.questionText}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isOpen && !selfAssessment && (
        <div style={{
          display: "flex", gap: 8, marginTop: 10,
          padding: "10px 0 2px", borderTop: "1px solid rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", alignSelf: "center" }}>
            How did you do?
          </span>
          <button
            type="button"
            onClick={() => onSelfAssessGotIt(q, idx)}
            style={{
              borderRadius: 999, padding: "4px 14px",
              border: "1px solid rgba(34,197,94,0.3)",
              backgroundColor: "rgba(34,197,94,0.08)",
              fontSize: "0.76rem", color: "var(--color-success)",
              cursor: "pointer", fontWeight: 700,
            }}
          >
            Got it
          </button>
          <button
            type="button"
            onClick={() => onSelfAssessNeedPractice(q, idx)}
            style={{
              borderRadius: 999, padding: "4px 14px",
              border: "1px solid rgba(239,68,68,0.3)",
              backgroundColor: "rgba(239,68,68,0.08)",
              fontSize: "0.76rem", color: "var(--color-error)",
              cursor: "pointer", fontWeight: 700,
            }}
          >
            Need practice
          </button>
        </div>
      )}
      {selfAssessment && (
        <div style={{
          marginTop: 8, fontSize: "0.76rem", fontWeight: 600,
          color: selfAssessment === "got_it" ? "var(--color-success)" : "var(--color-error)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {selfAssessment === "got_it" ? (
            <>
              <CorrectBurst visible={true} size={20} />
              ✓ Marked as understood
            </>
          ) : (
            <>
              <WrongShake visible={true}>
                <span style={{ fontSize: 16 }}>↻</span>
              </WrongShake>
              Follow-up queued
            </>
          )}
        </div>
      )}

      {isOpen && reportState === "done" && (
        <div style={{
          marginTop: 10, fontSize: "0.75rem", color: "var(--text-muted)",
          padding: "6px 10px", background: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8,
        }}>
          ✓ Thanks — we'll review it.
        </div>
      )}

      {isOpen && reportState !== "done" && (
        <div style={{ marginTop: 10 }}>
          {reportState === "idle" && (
            <button
              type="button"
              onClick={() => setReportState("open")}
              style={{
                background: "none", border: "none", padding: 0,
                fontSize: "0.73rem", color: "var(--text-muted)",
                cursor: "pointer", textDecoration: "underline",
                textDecorationStyle: "dotted",
              }}
            >
              ⚑ Report issue
            </button>
          )}

          {(reportState === "open" || reportState === "submitting" || reportState === "error") && (
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                disabled={reportState === "submitting"}
                style={{
                  background: "rgba(0,0,0,0.3)", color: "var(--text)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
                  padding: "5px 8px", fontSize: "0.78rem", cursor: "pointer",
                }}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <input
                type="text"
                maxLength={200}
                placeholder="Extra detail (optional)"
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                disabled={reportState === "submitting"}
                style={{
                  background: "rgba(0,0,0,0.3)", color: "var(--text)",
                  border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
                  padding: "5px 8px", fontSize: "0.78rem",
                  outline: "none",
                }}
              />

              {reportState === "error" && reportError && (
                <div style={{ fontSize: "0.73rem", color: "var(--color-error)" }}>
                  {reportError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  disabled={reportState === "submitting"}
                  style={{
                    padding: "5px 14px", borderRadius: 6, fontSize: "0.78rem",
                    fontWeight: 600, cursor: reportState === "submitting" ? "not-allowed" : "pointer",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "var(--color-error)",
                    opacity: reportState === "submitting" ? 0.6 : 1,
                  }}
                >
                  {reportState === "submitting" ? "Submitting…" : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => { setReportState("idle"); setReportComment(""); setReportError(undefined); }}
                  disabled={reportState === "submitting"}
                  style={{
                    background: "none", border: "none", padding: 0,
                    fontSize: "0.73rem", color: "var(--text-muted)",
                    cursor: "pointer", textDecoration: "underline",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
