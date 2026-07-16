import { useState, useRef, useCallback } from "react";
import { type PracticeQuestion } from "../../data/predictionDataService";
import { MathText } from "../question/MathText";
import { QuestionVisualAid } from "../question/QuestionVisualAid";
import { SolutionChecker } from "../question/SolutionChecker";
import { TimeGuideChip } from "../exam/ExamStrategyTips";
import type { CheckSolutionResponse, StepSolutionResponse } from "../../ai/aiClient";
import { CorrectBurst, WrongShake } from "../celebrations";
import { useAuth } from "../../context/AuthContext";
import { recordAttempt } from "../../services/practiceInsights";
import { resolveCorrectOptionIndex } from "../../lib/objectiveScoring";

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
  /** The graded payload for one subjective answer, lifted to the page (QP sessions).
   *  Optional: a consumer that doesn't record sessions simply omits it. */
  onGraded?: (qId: string, result: CheckSolutionResponse) => void;
  /** Hand this question's concept to the Tutor, with a ticket back to this set.
   *  Optional: a consumer with no tutor route simply omits it and no link renders. */
  onAskTutor?: (q: PracticeQuestion) => void;
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


function formatStepMarkLabel(marks: number): string {
  const rounded = Math.round(Number(marks) * 2) / 2;
  if (!Number.isFinite(rounded) || rounded <= 0) return "";
  if (rounded === 0.5) return "\u00BD mark";
  if (rounded % 1 === 0.5) return `${Math.floor(rounded)}\u00BD marks`;
  return `${rounded} ${rounded === 1 ? "mark" : "marks"}`;
}

// Parse a numeric mark value from an authored tag token: "1", "1.5", "1 1/2",
// "1/2", "\u00BD" (half), "1\u00BD". Returns null if unparseable.
function parseMarkValue(token: string): number | null {
  const t = token.replace(/\u00BD/g, " 1/2").trim();
  let total: number | null = null;
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (mixed) total = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  else if (frac) total = Number(frac[1]) / Number(frac[2]);
  else if (/^\d+(?:\.\d+)?$/.test(t)) total = Number(t);
  return total !== null && Number.isFinite(total) && total > 0 ? total : null;
}

// A solution step authored in the CBSE step-marking scheme carries a leading
// "[N mark]" / "[N marks]" / "[\u00BD mark]" / "[1 1/2 marks]" tag stating the
// marks for THAT step. The runtime's distributed step.marks can disagree with it
// (e.g. a [1 mark] step rendered as "\u00BD mark"), and the raw tag also leaks
// into the displayed body. Parse the authored tag so the pill reflects it and
// the body is clean. No leading tag (older packs) -> {marks:null, body:text}
// unchanged, so the existing distributed behavior is preserved.
function parseLeadingMarkTag(text: string): { marks: number | null; body: string } {
  if (!text) return { marks: null, body: text };
  const m = text.match(/^\s*\[\s*(.+?)\s*marks?\s*\]\s*/i);
  if (!m) return { marks: null, body: text };
  const marks = parseMarkValue(m[1]);
  if (marks === null) return { marks: null, body: text };
  return { marks, body: text.slice(m[0].length) };
}

export function PracticeQuestionCard({
  q, idx, subjectKey, topicLabel,
  isOpen, solutionLoading, solutionError, solutionData,
  mcqSelection, mcqResult, difficultyFilter,
  onSetActiveQuestion, onToggleAnswer, onMcqSelect, onMcqResult, onGraded,
  onAskTutor, onOpenMentorBoard: _onOpenMentorBoard,
}: PracticeQuestionCardProps) {
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


  const hasStructuredOptions = Array.isArray(q.options) && q.options.length > 0;
  const isObjectiveQuestion =
    q.format === "MCQ" ||
    q.format === "Assertion-Reasoning" ||
    /^Assertion\s*\(A\)/i.test(q.questionText) ||
    /\b(?:choose the correct|which of the following|mcq)\b/i.test(q.questionText);
  const showOptionlessObjectiveNote = isObjectiveQuestion && !hasStructuredOptions;

  const questionTotalMarks =
    typeof q.marks === "number" && q.marks > 0
      ? q.marks
      : Number(solutionData?.totalMarks || 0);

  const stepMarkTotal =
    solutionData?.steps?.reduce((sum, step) => {
      const value = Number(step.marks);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0) ?? 0;

  const stepMarksAreNumeric =
    !!solutionData?.steps?.length &&
    solutionData.steps.every((step) => {
      const value = Number(step.marks);
      return Number.isFinite(value) && value >= 0;
    });

  const isWrittenStepMarkCandidate =
    !!solutionData?.steps?.length &&
    !isObjectiveQuestion &&
    questionTotalMarks > 1;

  const hasSafeStepMarks =
    isWrittenStepMarkCandidate &&
    stepMarksAreNumeric &&
    stepMarkTotal > 0 &&
    Math.abs(stepMarkTotal - questionTotalMarks) <= 0.01;

  const isCanonicalBankQuestion = Boolean(
    q.id &&
    !String(q.id).startsWith("ai-") &&
    q.solutionSteps &&
    q.solutionSteps.length > 0 &&
    (q.marks ?? 0) > 1
  );

  const hasUnsafeWrittenStepMarks =
    isWrittenStepMarkCandidate &&
    stepMarkTotal > 0 &&
    !hasSafeStepMarks &&
    !isCanonicalBankQuestion;

  const renderMcqOptions = () => {
    if (!hasStructuredOptions) return null;
    const opts = q.options ?? [];
    const qId = String(q.id);
    const selected = mcqSelection;
    const result = mcqResult;
    // Client-side MCQ grading via the SHARED objective-scoring helper (the same one
    // the server graders use, parity-tested) so no surface diverges. Resolves the
    // canonical correct index from a legacy correctOption letter or the bank `answer`
    // (option text), against the options — returns -1 when it cannot be determined
    // (grading stays honest, no guess). Behaviour is unchanged for real bank MCQs
    // (whose `answer` exactly matches an option).
    const correctIdx = resolveCorrectOptionIndex(
      (q as PracticeQuestion & { correctOption?: string }).correctOption,
      q.answer,
      opts,
    );
    const handleMcqClick = (oi: number) => {
      if (result) return;
      onMcqSelect(qId, oi);
      if (correctIdx >= 0) {
        const resultStatus = oi === correctIdx ? "correct" : "wrong";
        onMcqResult(qId, resultStatus);

        // MI-Loop Stage 2 PR 3 — MCQ honest capture. An MCQ click is a real
        // answer attempt, so route it through the SAME front door graded answers
        // use (`recordAttempt`): marks is the universal unit, MCQ = 1/1 correct
        // or 0/1 wrong. This feeds Saved attempts / Accuracy, and a CORRECT MCQ
        // shrinks a weakness via the PR-2 loop-closer (same topic/questionId
        // keying as the graded surfaces, so it merges + key-matches). The front
        // door self-guards policy (skipped for signed-out / local sessions).
        //
        // A bare MCQ click has NO working to classify — so a WRONG MCQ records an
        // attempt ONLY. It never fabricates a "conceptual" mistake (the old direct
        // `logMistakes` bypass with hardcoded `conceptual:1` is removed), so the
        // Me "concept gaps" breakdown reflects real graded classifications only.
        recordAttempt(user, {
          subject: subjectKey,
          topic: topicLabel,
          question: q.questionText,
          questionId: qId,
          marksScored: resultStatus === "correct" ? 1 : 0,
          marksAvailable: 1,
          mode: "mcq",
        });
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
        {/* Discoverability nudge after a wrong MCQ: point at the EXISTING inline
            Check-my-answer box. No new data path — just reveals the checker. */}
        {result === "wrong" && hasStructuredOptions && !showChecker && (
          <button
            type="button"
            onClick={() => {
              onSetActiveQuestion(String(q.id));
              if (!showChecker) handleToggleCheck();
            }}
            style={{
              marginTop: 6,
              padding: "7px 12px",
              borderRadius: 10,
              fontSize: "0.78rem",
              fontWeight: 600,
              background: "transparent",
              color: "hsl(215, 65%, 38%)",
              border: "1px dashed hsl(215, 55%, 70%)",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            Want to know why? Show your working below.
          </button>
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
        questionId={String(q.id)}
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
          // Objective signals from the bank question, so if the student submits written
          // working for an MCQ the grader scores it deterministically 0/full (never a
          // fraction) and only classifies the mistake type from the working.
          section={q.section}
          format={q.format}
          options={q.options}
          answer={q.answer}
          onRequestStepSolution={handleRequestStepSolution}
          // Lift the graded payload to the page so a finished session can be recorded
          // with the real per-step marks. SolutionChecker's own sinks (recordAttempt /
          // recordMistake) are untouched — this only ADDS a reader; it is not a
          // second write, and the QP record it feeds is non-counting (LOCKED §1a
          // as amended).
          onResult={(result) => onGraded?.(String(q.id), result)}
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
            {hasSafeStepMarks
              ? "Use this CBSE-style marking guide to compare your written answer. This is not grading of your work."
              : "Compare your working with these steps. This is learning help, not grading."}
          </div>
          {hasUnsafeWrittenStepMarks && (
            <div style={{
              marginBottom: 8,
              padding: "7px 10px",
              borderRadius: 9,
              background: AMBER_SOFT,
              border: `1px solid ${AMBER_BORDER}`,
              color: AMBER_FG,
              fontSize: "0.74rem",
              fontWeight: 700,
              lineHeight: 1.4,
            }}>
              Step marks are hidden because this solution is a guide, not a verified marking split.
            </div>
          )}

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
              {solutionData.steps.map((step) => {
                // Prefer the AUTHORED "[N mark]" tag (CBSE step-marking scheme)
                // for the pill, and strip it from the displayed body so the pill
                // and text never disagree. Falls back to the distributed
                // step.marks when no tag is present (older packs).
                const tag = parseLeadingMarkTag(step.working);
                const pillMarks = tag.marks ?? Number(step.marks);
                return (
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
                      {hasSafeStepMarks && pillMarks > 0 && (
                        <span style={{
                          marginLeft: 8,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: MARKS_BLUE_FG,
                          background: MARKS_BLUE_SOFT,
                          border: `1px solid ${MARKS_BLUE_BORDER}`,
                          borderRadius: 999,
                          padding: "1px 7px",
                        }}>
                          {formatStepMarkLabel(pillMarks)}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: TEXT_MUTED, lineHeight: 1.5 }}>
                      <MathText text={tag.body} />
                    </div>
                  </div>
                </div>
                );
              })}

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

              {/* \u2500\u2500 ONE contextual Tutor link (2026-07-15) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
                  Replaces "Revise this topic" (a Topic Hub duplicate) and "Visual help"
                  (a Topic Hub / ConceptSpine duplicate).
                  Quick Practice is for PRACTICE; teaching is the Tutor's surface \u2014 so
                  this offers ONE way out to the teacher rather than three competing
                  mini-lessons inside the practice card.
                  Contract (the ticket built in #436): OFFER-NEVER-AUTO \u2014 it is always
                  the student's tap; ONE HOP \u2014 the ticket is consumed on return and not
                  propagated; and it carries `returnTo` back to this exact set, so the
                  student is never stranded on the tutor. `concept` rides along so the
                  tutor opens already knowing what they were working on
                  (useTutorSession threads it into the opener). */}
              {onAskTutor && (
                <button
                  type="button"
                  onClick={() => onAskTutor(q)}
                  style={{
                    marginTop: 10,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    color: PRIMARY_GREEN_FG,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  Ask the tutor about this concept \u2192
                </button>
              )}
            </div>
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
