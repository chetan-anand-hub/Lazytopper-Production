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
import { logMistakes } from "../../services/mistakeLogService";

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
const MARKS_BLUE_SOFT = "hsl(215, 75%, 95%)";
const MARKS_BLUE_BORDER = "hsl(215, 65%, 84%)";
const MARKS_BLUE_FG = "hsl(215, 65%, 32%)";
const AMBER_SOFT = "hsl(43, 90%, 94%)";
const AMBER_BORDER = "hsl(38, 75%, 78%)";
const AMBER_FG = "hsl(35, 80%, 35%)";

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

function metaChipStyle(background: string, border: string, color: string) {
  return {
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: "0.75rem",
    fontWeight: 700,
    background,
    border,
    color,
    lineHeight: 1.2,
  };
}

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

  const handleToggleCheck = useCallback(() => {
    const newShow = !showChecker;
    if (newShow && isOpen) {
      onToggleAnswer(q.id, q); // close steps when opening check
    }
    setShowChecker(newShow);
  }, [showChecker, isOpen, q, onToggleAnswer]);

  const handleToggleSteps = useCallback(() => {
    if (!isOpen) {
      setShowChecker(false); // close check when opening steps
    }
    onToggleAnswer(q.id, q);
  }, [isOpen, showChecker, q, onToggleAnswer]);

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
        const resultStatus = oi === correctIdx ? "correct" : "wrong";
        onMcqResult(qId, resultStatus);

        // MCQ option click is a real answer attempt. When the correct answer key is trusted
        // and the signed-in learner gets it wrong, record objective-question mistake
        // evidence using the existing mistake history path. Correct attempts do not
        // have a durable answer-attempt store yet, so they remain visible in-session
        // until a broader attempt-log model is added.
        if (
          resultStatus === "wrong" &&
          user?.uid &&
          !(user as { isLocalSession?: boolean }).isLocalSession
        ) {
          const marksLost = typeof q.marks === "number" && q.marks > 0 ? q.marks : 1;
          logMistakes(user.uid, {
            timestamp: new Date().toISOString(),
            questionText: q.questionText,
            topic: topicLabel,
            subject: subjectKey,
            totalMarks: marksLost,
            marksLost,
            mistakeCounts: {
              conceptual: 1,
              calculation: 0,
              silly: 0,
              presentation: 0,
            },
            stepDetails: [
              {
                stepNumber: 1,
                mistakeType: "conceptual",
                marksDeducted: marksLost,
              },
            ],
          }).catch(() => {
            // Keep MCQ feedback student-safe; saved history can recover on next checked answer.
          });
        }
      }
    };
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: "0.76rem", color: TEXT_MUTED, fontWeight: 600, marginBottom: 8,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          Choose an answer.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 8,
          }}
        >
          {opts.map((opt: string, oi: number) => {
            const label = String.fromCharCode(65 + oi);
            const isSelected = selected === oi;
            const isCorrect = !!result && oi === correctIdx;
            const isWrongChoice = result === "wrong" && isSelected;
            let bg = CARD_BG;
            let border = `1px solid ${BORDER}`;
            if (isCorrect) { bg = PRIMARY_GREEN_SOFT; border = `1px solid ${PRIMARY_GREEN}`; }
            else if (isWrongChoice) { bg = "hsl(0, 80%, 96%)"; border = "1px solid hsl(0, 70%, 50%)"; }
            else if (isSelected && !result) { border = `1px solid ${TEXT_FG}`; }
            return (
              <button
                key={oi}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleMcqClick(oi)}
                style={{
                  minHeight: 42,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "9px 11px",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                  color: TEXT_FG,
                  background: bg,
                  border,
                  borderRadius: 10,
                  cursor: result ? "default" : "pointer",
                  width: "100%",
                  textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                <span
                  style={{
                    minWidth: 24,
                    height: 24,
                    borderRadius: 999,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isCorrect
                      ? PRIMARY_GREEN
                      : isWrongChoice
                        ? "hsl(0, 70%, 50%)"
                        : SURFACE_SOFT,
                    color: isCorrect || isWrongChoice ? "#ffffff" : TEXT_MUTED,
                    fontWeight: 800,
                    fontSize: "0.72rem",
                    flexShrink: 0,
                  }}
                >
                  {label}
                </span>
                <span style={{ minWidth: 0 }}>
                  <MathText text={opt} />
                </span>
              </button>
            );
          })}
        </div>
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
                Correct.
              </>
            ) : (
              <>
                <WrongShake visible={true}>
                  <span style={{ fontSize: 20 }}>{"\u2717"}</span>
                </WrongShake>
                {`Not quite - ${String.fromCharCode(65 + correctIdx)} is the correct answer.`}
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
        borderRadius: 14, padding: "20px",
        backgroundColor: CARD_BG,
        border: `1px solid ${BORDER}`,
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
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
            <span style={metaChipStyle(MARKS_BLUE_SOFT, `1px solid ${MARKS_BLUE_BORDER}`, MARKS_BLUE_FG)}>
              {q.marks} mark{q.marks !== 1 ? "s" : ""}
            </span>
            {q.section && (
              <span style={metaChipStyle(SURFACE_SOFT, `1px solid ${BORDER}`, TEXT_MUTED)}>
                Section {q.section}
              </span>
            )}
            {q.format && (
              <span style={metaChipStyle(AMBER_SOFT, `1px solid ${AMBER_BORDER}`, AMBER_FG)}>
                {q.format === "Assertion-Reasoning"
                  ? "Assertion & Reasoning"
                  : q.format === "VSA"
                  ? "Very Short Answer"
                  : q.format === "MCQ"
                  ? "Multiple Choice"
                  : q.format}
              </span>
            )}
            <TimeGuideChip marks={q.marks} section={q.section || ""} />
          {difficultyFilter === "All" && q.difficulty && DIFFICULTY_BADGE[q.difficulty] && (
            <span style={metaChipStyle(
              DIFFICULTY_BADGE[q.difficulty].bg,
              DIFFICULTY_BADGE[q.difficulty].border,
              DIFFICULTY_BADGE[q.difficulty].color,
            )}>
              {q.difficulty}
            </span>
          )}
          </div>
        </div>
      </header>

      <p style={{
        fontSize: "0.95rem", color: TEXT_FG, lineHeight: 1.6,
        fontWeight: 500,
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
        marginTop: 12,
        paddingTop: 12,
        borderTop: `1px solid ${BORDER}`,
        display: "flex", flexWrap: "wrap", gap: 8,
        alignItems: "center", marginBottom: 10,
      }}>
        {!hasStructuredOptions && (
          <button
            type="button"
            onClick={() => {
              onSetActiveQuestion(String(q.id));
              handleToggleCheck();
            }}
            style={{
              borderRadius: 8, padding: "8px 14px",
              border: showChecker ? `1px solid ${PRIMARY_GREEN}` : "1px solid transparent",
              backgroundColor: showChecker ? PRIMARY_GREEN_SOFT : PRIMARY_GREEN,
              fontSize: "0.78rem", color: showChecker ? PRIMARY_GREEN_FG : "#ffffff",
              cursor: "pointer", display: "inline-flex",
              alignItems: "center", gap: 6,
              fontWeight: 800,
            }}
          >
            <span>{showChecker ? "Hide check" : "Check my answer"}</span>
          </button>
        )}
        <button
          data-testid="practice-mentor-cta"
          type="button"
          onClick={() => {
            onSetActiveQuestion(String(q.id));
            handleToggleSteps();
          }}
          style={{
            borderRadius: 8, padding: "8px 12px",
            border: isOpen ? `1px solid ${PRIMARY_GREEN}` : `1px solid ${BORDER}`,
            backgroundColor: isOpen ? PRIMARY_GREEN_SOFT : CARD_BG,
            fontSize: "0.78rem", color: isOpen ? PRIMARY_GREEN_FG : TEXT_FG,
            cursor: "pointer", display: "inline-flex",
            alignItems: "center", gap: 6,
            fontWeight: 700,
          }}
        >
          <span>{isOpen ? "Hide steps" : "Show steps"}</span>
        </button>
        {hasStructuredOptions && (
          <button
            type="button"
            onClick={() => {
              onSetActiveQuestion(String(q.id));
              handleToggleCheck();
            }}
            style={{
              borderRadius: 8, padding: "8px 12px",
              border: showChecker ? `1px solid ${PRIMARY_GREEN}` : `1px solid ${BORDER}`,
              backgroundColor: showChecker ? PRIMARY_GREEN_SOFT : CARD_BG,
              fontSize: "0.78rem", color: showChecker ? PRIMARY_GREEN_FG : TEXT_FG,
              cursor: "pointer", display: "inline-flex",
              alignItems: "center", gap: 6,
              fontWeight: 700,
            }}
          >
            <span>{showChecker ? "Hide check" : "Check my answer"}</span>
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
            marginTop: 12,
            width: "100%",
            padding: "14px 16px",
            background: "hsl(215, 75%, 97%)",
            borderRadius: 12,
            border: `1px solid ${MARKS_BLUE_BORDER}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: "0.85rem", color: MARKS_BLUE_FG }}>
              Solution steps (for comparison)
            </strong>
          </div>
          <div style={{ fontSize: "0.76rem", color: TEXT_MUTED, marginBottom: 8, lineHeight: 1.45 }}>
            Compare your working with these steps. This is learning help, not grading.
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
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: TEXT_FG, marginBottom: 2 }}>
                      <MathText text={step.description} />
                    </div>
                    <div style={{ fontSize: "0.78rem", color: TEXT_MUTED, lineHeight: 1.5 }}>
                      <MathText text={step.working} />
                    </div>
                  </div>
                </div>
              ))}

              {solutionData.commonMistakes && solutionData.commonMistakes.length > 0 && (
                <div style={{
                  marginTop: 8, padding: "8px 10px",
                  background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`,
                }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: TEXT_MUTED, marginBottom: 4 }}>
                    Examiner notes
                  </div>
                  {solutionData.commonMistakes.map((m, i) => (
                    <div key={i} style={{ fontSize: "0.75rem", color: TEXT_MUTED, marginBottom: 2 }}>
                      {"\u2022"} {m}
                    </div>
                  ))}
                </div>
              )}
              {solutionData.examTip && (
                <div style={{
                  marginTop: 8, padding: "8px 10px",
                  background: CARD_BG, borderRadius: 10, border: `1px solid ${BORDER}`,
                  fontSize: "0.75rem", color: TEXT_MUTED,
                }}>
                  <strong>Exam tip:</strong> {solutionData.examTip}
                </div>
              )}

              <button
                onClick={() => onOpenConceptDrawer(q)}
                style={{
                  marginTop: 10,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: MARKS_BLUE_FG,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                }}
              >
                Revise this topic
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
