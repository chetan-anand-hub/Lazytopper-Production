import { type PracticeQuestion } from "../../data/predictionDataService";
import { MathText } from "../question/MathText";
import { QuestionVisualAid } from "../question/QuestionVisualAid";
import { SolutionChecker } from "../question/SolutionChecker";
import { TimeGuideChip } from "../exam/ExamStrategyTips";
import type { StepSolutionResponse } from "../../ai/aiClient";
import { CorrectBurst, WrongShake } from "../celebrations";

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
  onSetActiveQuestion: (id: string) => void;
  onToggleAnswer: (id: string, q: PracticeQuestion) => void;
  onMcqSelect: (qId: string, optionIdx: number) => void;
  onMcqResult: (qId: string, result: "correct" | "wrong") => void;
  onSelfAssessGotIt: (q: PracticeQuestion, idx: number) => void;
  onSelfAssessNeedPractice: (q: PracticeQuestion, idx: number) => void;
  onOpenConceptDrawer: (q: PracticeQuestion) => void;
  onOpenMentorSocratic: (q: PracticeQuestion, idx: number) => void;
  onOpenMentorBoard: (q: PracticeQuestion, idx: number) => void;
}

export function PracticeQuestionCard({
  q, idx, subjectKey, topicLabel,
  isOpen, selfAssessment, solutionLoading, solutionError, solutionData,
  mcqSelection, mcqResult,
  onSetActiveQuestion, onToggleAnswer, onMcqSelect, onMcqResult,
  onSelfAssessGotIt, onSelfAssessNeedPractice,
  onOpenConceptDrawer, onOpenMentorSocratic, onOpenMentorBoard,
}: PracticeQuestionCardProps) {
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
          let optColor = "rgba(255,255,255,0.9)";
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
              <span style={{ fontWeight: 700, minWidth: 22, color: isCorrect ? "#22c55e" : isWrongChoice ? "#ef4444" : "rgba(255,255,255,0.45)" }}>
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
            color: result === "correct" ? "#22c55e" : "#ef4444",
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
      data-testid="practice-question-card"
      data-question-id={String(q.id)}
      onClick={() => onSetActiveQuestion(String(q.id))}
      style={{
        borderRadius: 18, padding: "14px 16px 12px",
        backgroundColor: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
      }}
    >
      <header style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 6, gap: 8,
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
          <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.08)", color: "#fff",
              fontSize: "0.75rem", fontWeight: 600, marginRight: 8,
            }}>{idx + 1}</span>
            <span>{q.marks} mark{q.marks !== 1 ? "s" : ""} - {q.section}</span>
            <TimeGuideChip marks={q.marks} section={q.section || ""} />
          </div>
        </div>
      </header>

      <p style={{
        fontSize: "0.9rem", color: "#fff", lineHeight: 1.6,
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
            fontSize: "0.78rem", color: "#3b82f6",
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 6,
          }}
        >
          <span>{isOpen ? "Hide solution" : "Step-by-Step Solution"}</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenMentorSocratic(q, idx)}
          style={{
            borderRadius: 999, padding: "5px 12px",
            border: "1px solid rgba(34,197,94,0.3)",
            backgroundColor: "rgba(34,197,94,0.06)",
            fontSize: "0.78rem", color: "#22c55e",
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 6,
          }}
        >
          <span>Hint / Explain</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenMentorBoard(q, idx)}
          style={{
            borderRadius: 999, padding: "5px 12px",
            border: "1px solid rgba(206,130,255,0.3)",
            backgroundColor: "rgba(206,130,255,0.06)",
            fontSize: "0.78rem", color: "#c4b5fd",
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 6,
          }}
        >
          <span>Check my answer</span>
        </button>
      </div>

      {isOpen && (
        <div style={{
          marginTop: 10, padding: "12px 14px",
          background: "rgba(255,255,255,0.06)", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.85)" }}>
              Step-by-Step Solution ({q.marks} {q.marks === 1 ? "mark" : "marks"})
            </strong>
          </div>

          {solutionLoading && (
            <div style={{ fontSize: "0.82rem", color: "#3b82f6", padding: "8px 0" }}>
              Loading step-by-step solution...
            </div>
          )}
          {solutionError && (
            <div style={{ fontSize: "0.82rem", color: "#ef4444", padding: "8px 0" }}>
              {solutionError}
            </div>
          )}
          {solutionData && (
            <div>
              {solutionData.steps.map((step) => (
                <div key={step.stepNumber} style={{
                  display: "flex", gap: 10, marginBottom: 8,
                  padding: "8px 10px", background: "rgba(255,255,255,0.03)",
                  borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{
                    minWidth: 28, height: 28, borderRadius: "50%",
                    background: "rgba(59,130,246,0.8)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                  }}>{step.stepNumber}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>
                      <MathText text={step.description} />
                      <span style={{
                        marginLeft: 8, fontSize: "0.7rem", fontWeight: 700,
                        color: step.marks === 0 ? "rgba(255,255,255,0.4)" : "#60a5fa",
                        background: step.marks === 0 ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.1)",
                        borderRadius: 999, padding: "1px 7px",
                      }}>
                        {step.marks === 0 ? "Explanation" : step.marks === 0.5 ? "\u00BD mark" : step.marks % 1 === 0.5 ? `${Math.floor(step.marks)}\u00BD marks` : `${step.marks} ${step.marks === 1 ? "mark" : "marks"}`}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
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
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>
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
                  fontSize: "0.75rem", color: "#22c55e",
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
                  color: "#c4b5fd", fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: "1rem" }}>{"\uD83D\uDCA1"}</span>
                Teach me this concept
              </button>
              <SolutionChecker
                question={q.questionText}
                marks={q.marks}
                subject={subjectKey}
                topic={topicLabel}
              />
            </div>
          )}
        </div>
      )}

      {isOpen && !selfAssessment && (
        <div style={{
          display: "flex", gap: 8, marginTop: 10,
          padding: "10px 0 2px", borderTop: "1px solid rgba(0,0,0,0.08)",
        }}>
          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", alignSelf: "center" }}>
            How did you do?
          </span>
          <button
            type="button"
            onClick={() => onSelfAssessGotIt(q, idx)}
            style={{
              borderRadius: 999, padding: "4px 14px",
              border: "1px solid rgba(34,197,94,0.3)",
              backgroundColor: "rgba(34,197,94,0.08)",
              fontSize: "0.76rem", color: "#22c55e",
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
              fontSize: "0.76rem", color: "#ef4444",
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
          color: selfAssessment === "got_it" ? "#22c55e" : "#ef4444",
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
    </article>
  );
}
