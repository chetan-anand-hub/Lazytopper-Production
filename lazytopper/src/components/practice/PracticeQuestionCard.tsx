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

const TEXT_FG = "hsl(220, 25%, 12%)";
const TEXT_MUTED = "hsl(220, 15%, 42%)";
const BORDER = "hsl(220, 18%, 90%)";
const CARD_BG = "#ffffff";
const SURFACE_SOFT = "hsl(210, 33%, 96%)";
const PRIMARY_GREEN = "hsl(152, 55%, 45%)";
const PRIMARY_GREEN_SOFT = "hsl(152, 55%, 95%)";
const PRIMARY_GREEN_FG = "hsl(152, 55%, 28%)";

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

const DIFFICULTY_BADGE: Record<string, { color: string; bg: string; border: string }> = {
  Easy:   { color: "hsl(152, 60%, 30%)", bg: "hsl(152, 55%, 95%)", border: "1px solid hsl(152, 55%, 80%)" },
  Medium: { color: "hsl(35, 80%, 35%)", bg: "hsl(43, 90%, 94%)",  border: "1px solid hsl(38, 75%, 78%)" },
  Hard:   { color: "hsl(0, 65%, 42%)",  bg: "hsl(0, 80%, 96%)",   border: "1px solid hsl(0, 70%, 86%)" },
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
        setReportError("We could not submit that report right now. Please try again.");
        setReportState("error");
      }
    } catch {
      setReportError("Network error - please try again");
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

  const hasStructuredOptions = Array.isArray(q.options) && q.options.length > 0;
  const isObjectiveQuestion =
    q.format === "MCQ" ||
    q.format === "Assertion-Reasoning" ||
    /^Assertion\s*\(A\)/i.test(q.questionText) ||
    /\b(?:choose the correct|which of the following|mcq)\b/i.test(q.questionText);
  const showOptionlessObjectiveNote = isObjectiveQuestion && !hasStructuredOptions;

  const renderMcqOptions = () => {
    if (!hasStructuredOptions) return null;
    const opts = q.options ?? [];
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
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: "0.76rem", color: TEXT_MUTED, fontWeight: 600, marginBottom: 8 }}>
          Select an option for local practice feedback. Not graded or saved to Me / Progress.
        </div>
        {opts.map((opt: string, oi: number) => {
          const isSelected = selected === oi;
          const isCorrect = !!result && oi === correctIdx;
          const isWrongChoice = result === "wrong" && isSelected;
          let bg = CARD_BG;
          let border = `1px solid ${BORDER}`;
          let optColor = TEXT_FG;
          if (isCorrect) { bg = PRIMARY_GREEN_SOFT; border = "1px solid hsl(152, 55%, 75%)"; optColor = PRIMARY_GREEN_FG; }
          else if (isWrongChoice) { bg = "hsl(0, 80%, 96%)"; border = "1px solid hsl(0, 70%, 86%)"; optColor = "hsl(0, 65%, 42%)"; }
          else if (isSelected && !result) { bg = "hsl(215, 75%, 95%)"; border = "1px solid hsl(215, 65%, 80%)"; }
          return (
            <button
              key={oi}
              type="button"
              aria-pressed={isSelected}
              onClick={() => handleMcqClick(oi)}
              style={{
                display: "flex", alignItems: "baseline", gap: 10,
                padding: "10px 12px", fontSize: "0.9rem", color: optColor,
                background: bg, border, borderRadius: 10,
                cursor: result ? "default" : "pointer",
                width: "100%", textAlign: "left", marginBottom: 6, transition: "all 0.15s",
                boxShadow: isSelected ? "0 1px 2px rgba(15, 23, 42, 0.06)" : "none",
              }}
            >
              <span style={{ fontWeight: 700, minWidth: 22, color: isCorrect ? PRIMARY_GREEN_FG : isWrongChoice ? "hsl(0, 65%, 42%)" : TEXT_MUTED }}>
                {isCorrect ? "\u2713" : isWrongChoice ? "\u2717" : String.fromCharCode(65 + oi) + "."}
              </span>
              <MathText text={opt} />
            </button>
          );
        })}
        {selected !== undefined && !result && correctIdx < 0 && (
          <div style={{
            marginTop: 6, padding: "8px 12px", borderRadius: 10,
            fontSize: "0.8rem", fontWeight: 600,
            background: "hsl(215, 75%, 95%)",
            color: "hsl(215, 65%, 32%)",
            border: "1px solid hsl(215, 65%, 84%)",
          }}>
            Option marked for this session. Use Check my answer or compare steps when you want feedback.
          </div>
        )}
        {result && (
          <div style={{
            marginTop: 6, padding: "8px 12px", borderRadius: 10,
            fontSize: "0.82rem", fontWeight: 700,
            background: result === "correct" ? PRIMARY_GREEN_SOFT : "hsl(0, 80%, 96%)",
            color: result === "correct" ? PRIMARY_GREEN_FG : "hsl(0, 65%, 42%)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            {result === "correct" ? (
              <>
                <CorrectBurst visible={true} size={24} />
                Local practice feedback: correct.
              </>
            ) : (
              <>
                <WrongShake visible={true}>
                  <span style={{ fontSize: 20 }}>{"\u2717"}</span>
                </WrongShake>
                {`Local practice feedback: answer ${String.fromCharCode(65 + correctIdx)} fits the stored key.`}
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
        borderRadius: 16, padding: "20px",
        backgroundColor: CARD_BG,
        border: `1px solid ${isOpen ? "hsl(152, 55%, 75%)" : BORDER}`,
        boxShadow: isOpen
          ? "0 8px 24px -18px rgba(15, 23, 42, 0.28)"
          : "0 1px 2px rgba(15, 23, 42, 0.04)",
      }}
    >
      <header style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 10, gap: 8,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <div style={{
            fontSize: "0.68rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: TEXT_MUTED,
            fontWeight: 800,
          }}>
            Question {idx + 1}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{
              padding: "3px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
              background: SURFACE_SOFT, border: `1px solid ${BORDER}`, color: TEXT_FG,
            }}>
              {q.marks} mark{q.marks !== 1 ? "s" : ""}
            </span>
            {q.section && (
              <span style={{
                padding: "3px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
                background: SURFACE_SOFT, border: `1px solid ${BORDER}`, color: TEXT_MUTED,
              }}>
                Section {q.section}
              </span>
            )}
            {q.format && (
              <span style={{
                padding: "3px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
                background: SURFACE_SOFT, border: `1px solid ${BORDER}`, color: TEXT_MUTED,
              }}>
                {q.format}
              </span>
            )}
            <TimeGuideChip marks={q.marks} section={q.section || ""} />
          {difficultyFilter === "All" && q.difficulty && DIFFICULTY_BADGE[q.difficulty] && (
            <span style={{
              padding: "3px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
              background: DIFFICULTY_BADGE[q.difficulty].bg,
              border: DIFFICULTY_BADGE[q.difficulty].border,
              color: DIFFICULTY_BADGE[q.difficulty].color,
            }}>
              {q.difficulty}
            </span>
          )}
          {(q.format === "Assertion-Reasoning" || /^Assertion\s*\(A\)/i.test(q.questionText)) && (
            <span style={{
              padding: "3px 8px", borderRadius: 999, fontSize: "0.7rem", fontWeight: 700,
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
              color: "var(--color-warning)",
            }}>
              Assertion & Reasoning
            </span>
          )}
          </div>
        </div>
      </header>

      <p style={{
        fontSize: "1rem", color: TEXT_FG, lineHeight: 1.72,
        whiteSpace: "pre-wrap", margin: "4px 0 14px",
      }}>
        <MathText text={q.questionText} />
      </p>

      {renderMcqOptions()}

      {showOptionlessObjectiveNote && (
        <div style={{
          margin: "0 0 12px",
          padding: "9px 12px",
          borderRadius: 10,
          background: "hsl(215, 75%, 95%)",
          border: "1px solid hsl(215, 65%, 84%)",
          color: "hsl(215, 65%, 32%)",
          fontSize: "0.8rem",
          fontWeight: 600,
          lineHeight: 1.45,
        }}>
          Structured options are not available for this question. Try it independently, then check your answer or compare steps.
        </div>
      )}

      {!hasStructuredOptions && !showOptionlessObjectiveNote && (
        <div style={{ margin: "0 0 12px", color: TEXT_MUTED, fontSize: "0.8rem", lineHeight: 1.45 }}>
          Work it out on paper first. Use Check my answer for real feedback, or compare with the step solution.
        </div>
      )}

      <QuestionVisualAid
        subject={subjectKey}
        topicKey={topicLabel}
        questionText={q.questionText}
        marks={q.marks}
      />

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8,
        alignItems: "center", marginBottom: 10,
      }}>
        {!hasStructuredOptions && (
          <button
            type="button"
            onClick={() => {
              onSetActiveQuestion(String(q.id));
              setShowChecker((v) => !v);
            }}
            style={{
              borderRadius: 10, padding: "8px 14px",
              border: showChecker ? `1px solid ${PRIMARY_GREEN}` : "1px solid transparent",
              backgroundColor: showChecker ? PRIMARY_GREEN_SOFT : PRIMARY_GREEN,
              fontSize: "0.8rem", color: showChecker ? PRIMARY_GREEN_FG : "#ffffff",
              cursor: "pointer", display: "inline-flex",
              alignItems: "center", gap: 6,
              fontWeight: 800,
              boxShadow: showChecker ? "none" : "0 6px 16px -12px rgba(21, 128, 61, 0.65)",
            }}
          >
            <span>{showChecker ? "Hide checker" : "Check my answer"}</span>
          </button>
        )}
        <button
          data-testid="practice-mentor-cta"
          type="button"
          onClick={() => {
            onSetActiveQuestion(String(q.id));
            onToggleAnswer(q.id, q);
          }}
          style={{
            borderRadius: 10, padding: "8px 12px",
            border: isOpen ? "1px solid hsl(215, 65%, 80%)" : `1px solid ${BORDER}`,
            backgroundColor: isOpen ? "hsl(215, 75%, 95%)" : CARD_BG,
            fontSize: "0.78rem", color: isOpen ? "hsl(215, 65%, 32%)" : TEXT_FG,
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 6,
            fontWeight: 700,
          }}
        >
          <span>{isOpen ? "Hide steps" : "Compare steps"}</span>
        </button>
        {hasStructuredOptions && (
          <button
            type="button"
            onClick={() => {
              onSetActiveQuestion(String(q.id));
              setShowChecker((v) => !v);
            }}
            style={{
              borderRadius: 10, padding: "8px 12px",
              border: showChecker ? "1px solid hsl(215, 65%, 80%)" : `1px solid ${BORDER}`,
              backgroundColor: showChecker ? "hsl(215, 75%, 95%)" : CARD_BG,
              fontSize: "0.78rem", color: showChecker ? "hsl(215, 65%, 32%)" : TEXT_FG,
              cursor: "pointer", display: "inline-flex",
              alignItems: "center", gap: 6,
              fontWeight: 700,
            }}
          >
            <span>{showChecker ? "Hide checker" : "Check my answer"}</span>
          </button>
        )}
      </div>

      {showChecker && (
        <SolutionChecker
          question={q.questionText}
          marks={q.marks}
          subject={subjectKey}
          topic={topicLabel}
          questionId={String(q.id)}
          solutionSteps={q.solutionSteps}
          finalAnswer={q.finalAnswer}
          onRequestStepSolution={handleRequestStepSolution}
        />
      )}

      {isOpen && (
        <div
          ref={stepSolutionRef}
          style={{
            marginTop: 12, padding: "14px",
            background: SURFACE_SOFT, borderRadius: 12,
            border: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: "0.84rem", color: TEXT_FG }}>
              Step-by-step solution for comparison ({q.marks} {q.marks === 1 ? "mark" : "marks"})
            </strong>
          </div>
          <div style={{ fontSize: "0.76rem", color: TEXT_MUTED, marginBottom: 8, lineHeight: 1.45 }}>
            Use these steps to compare your work. This is help, not grading.
          </div>

          {solutionLoading && (
            <div style={{ fontSize: "0.82rem", color: "var(--color-info)", padding: "8px 0" }}>
              Preparing comparison steps...
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
                  padding: "10px 12px", background: CARD_BG,
                  borderRadius: 10, border: `1px solid ${BORDER}`,
                }}>
                  <div style={{
                    minWidth: 28, height: 28, borderRadius: 8,
                    background: PRIMARY_GREEN, color: "#ffffff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                  }}>{step.stepNumber}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: TEXT_FG, marginBottom: 2 }}>
                      <MathText text={step.description} />
                      <span style={{
                        marginLeft: 8, fontSize: "0.7rem", fontWeight: 700,
                        color: step.marks === 0 ? TEXT_MUTED : "hsl(215, 65%, 32%)",
                        background: step.marks === 0 ? SURFACE_SOFT : "hsl(215, 75%, 95%)",
                        borderRadius: 999, padding: "1px 7px",
                      }}>
                        {step.marks === 0 ? "Explanation" : step.marks === 0.5 ? "\u00BD mark" : step.marks % 1 === 0.5 ? `${Math.floor(step.marks)}\u00BD marks` : `${step.marks} ${step.marks === 1 ? "mark" : "marks"}`}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: TEXT_MUTED, lineHeight: 1.55 }}>
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
                  borderRadius: 10, border: "1px solid hsl(215, 65%, 80%)",
                  background: "hsl(215, 75%, 95%)",
                  color: "hsl(215, 65%, 32%)", fontSize: "0.82rem", fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                }}
              >
                Teach me this concept
              </button>
              {matchedVisual && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowVisual((v) => !v)}
                    style={{
                      width: "100%", padding: "10px 14px",
                      borderRadius: 10, border: `1px solid ${BORDER}`,
                      background: CARD_BG,
                      color: TEXT_FG, fontSize: "0.82rem", fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8,
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{showVisual ? "\u25B2" : "\u25BC"}</span>
                    {showVisual ? "Hide visual help" : `Visual help: ${matchedVisual.title}`}
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
          padding: "12px 0 2px", borderTop: `1px solid ${BORDER}`,
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.78rem", color: TEXT_MUTED, alignSelf: "center", fontWeight: 700 }}>
            Local note:
          </span>
          <button
            type="button"
            onClick={() => onSelfAssessGotIt(q, idx)}
            style={{
              borderRadius: 999, padding: "5px 14px",
              border: "1px solid hsl(152, 55%, 75%)",
              backgroundColor: PRIMARY_GREEN_SOFT,
              fontSize: "0.76rem", color: PRIMARY_GREEN_FG,
              cursor: "pointer", fontWeight: 700,
            }}
          >
            I understand this
          </button>
          <button
            type="button"
            onClick={() => onSelfAssessNeedPractice(q, idx)}
            style={{
              borderRadius: 999, padding: "5px 14px",
              border: "1px solid hsl(38, 75%, 78%)",
              backgroundColor: "hsl(43, 90%, 94%)",
              fontSize: "0.76rem", color: "hsl(35, 80%, 35%)",
              cursor: "pointer", fontWeight: 700,
            }}
          >
            Review again in this set
          </button>
        </div>
      )}
      {selfAssessment && (
        <div style={{
          marginTop: 8, fontSize: "0.76rem", fontWeight: 600,
          color: selfAssessment === "got_it" ? PRIMARY_GREEN_FG : "hsl(35, 80%, 35%)",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {selfAssessment === "got_it" ? (
            <>
              <CorrectBurst visible={true} size={20} />
              Marked by you for this session
            </>
          ) : (
            <>
              <WrongShake visible={true}>
                <span style={{ fontSize: 16 }}>{"\u21BB"}</span>
              </WrongShake>
              Marked to review again in this set
            </>
          )}
        </div>
      )}

      {isOpen && reportState === "done" && (
        <div style={{
          marginTop: 10, fontSize: "0.75rem", color: PRIMARY_GREEN_FG,
          padding: "6px 10px", background: PRIMARY_GREEN_SOFT,
          border: "1px solid hsl(152, 55%, 80%)", borderRadius: 8,
        }}>
          Thanks - we'll review it.
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
                fontSize: "0.73rem", color: TEXT_MUTED,
                cursor: "pointer", textDecoration: "underline",
                textDecorationStyle: "dotted",
              }}
            >
              Report issue
            </button>
          )}

          {(reportState === "open" || reportState === "submitting" || reportState === "error") && (
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              border: `1px solid ${BORDER}`,
              background: SURFACE_SOFT,
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                disabled={reportState === "submitting"}
                style={{
                  background: CARD_BG, color: TEXT_FG,
                  border: `1px solid ${BORDER}`, borderRadius: 8,
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
                  background: CARD_BG, color: TEXT_FG,
                  border: `1px solid ${BORDER}`, borderRadius: 8,
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
                    background: "hsl(0, 80%, 96%)",
                    border: "1px solid hsl(0, 70%, 86%)",
                    color: "hsl(0, 65%, 42%)",
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
                    fontSize: "0.73rem", color: TEXT_MUTED,
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
