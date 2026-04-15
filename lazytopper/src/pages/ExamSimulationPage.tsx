import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  generateUnlimitedPaper,
  computeExamAnalytics,
  type ExamPaper,
  type ExamAnswer,
  type ExamAnalytics,
} from "../utils/unlimitedPaperEngine";
import type { SectionKey, LTSubjectKey, CanonicalQuestion } from "../data/predictionTypes";
import { saveMockScore, getMockScoresForSubject } from "../services/mockScoreHistory";
import { trackUxEvent } from "../services/uxTelemetry";
import * as gam from "../utils/gamification";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { BreathingMoment } from "../components/ux/BreathingMoment";
import { CountUpReveal } from "../components/celebrations";
import { ExamStrategyTips, TimeGuideChip, InternalChoiceTip } from "../components/exam/ExamStrategyTips";

type Phase = "setup" | "breathing" | "taking" | "review";

const SECTION_LABELS: Record<SectionKey, string> = {
  A: "Section A — MCQ / VSA (1 mark each)",
  B: "Section B — Short Answer (2 marks each)",
  C: "Section C — Short Answer (3 marks each)",
  D: "Section D — Long Answer (5 marks each)",
  E: "Section E — Case-Based (4 marks each)",
};

const SECTION_COLORS: Record<SectionKey, string> = {
  A: "#6366f1", B: "#f59e0b", C: "#10b981", D: "#ef4444", E: "#8b5cf6",
};

const TOTAL_TIME_SECONDS = 3 * 60 * 60;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatMinSec(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function ExamSimulationPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const location = useLocation();

  const subjectParam = sp.get("subject") || "Maths";
  const subject: LTSubjectKey = subjectParam === "Science" ? "Science" : "Maths";

  const [phase, setPhase] = useState<Phase>("setup");
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [remainingTime, setRemainingTime] = useState(TOTAL_TIME_SECONDS);
  const [answers, setAnswers] = useState<Record<string, ExamAnswer>>({});
  const [analytics, setAnalytics] = useState<ExamAnalytics | null>(null);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [wallClockSec, setWallClockSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAnswerTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const sectionTimesRef = useRef<Record<string, number>>({});
  const finishExamRef = useRef<() => void>(() => {});

  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = navState?.back || "/predictive-papers";
  const backLabel = navState?.backLabel || "Back to papers";

  const breathingStartRef = useRef(0);

  const startExamAfterBreathing = useCallback((skipped?: boolean) => {
    const duration = breathingStartRef.current ? Date.now() - breathingStartRef.current : 0;
    trackUxEvent("breathing_moment_complete", "ExamSimulationPage", {
      subject,
      skipped: !!skipped,
      durationMs: duration,
    });
    setPhase("taking");
    startTimeRef.current = Date.now();
    trackUxEvent("exam_simulation_start", "ExamSimulationPage", { subject });
  }, [subject]);

  const generatePaper = useCallback(() => {
    const p = generateUnlimitedPaper(subject);
    setPaper(p);
    setPhase("breathing");
    breathingStartRef.current = Date.now();
    setRemainingTime(TOTAL_TIME_SECONDS);
    setAnswers({});
    setAnalytics(null);
    setCurrentSectionIdx(0);
    setMarkedForReview(new Set());
    lastAnswerTimeRef.current = 0;
    sectionTimesRef.current = {};
  }, [subject]);

  useEffect(() => {
    if (phase === "taking") {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            finishExamRef.current();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    if (phase !== "taking") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const handleAnswer = useCallback((questionId: string, selected: string, correctAnswer: string) => {
    const correct = selected.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const now = TOTAL_TIME_SECONDS - remainingTime;
    const delta = now - lastAnswerTimeRef.current;
    lastAnswerTimeRef.current = now;
    const baseId = questionId.replace(/__or$/, "");
    setAnswers(prev => ({
      ...prev,
      [baseId]: {
        questionId: baseId,
        selected,
        correct,
        timeSec: Math.max(1, delta),
        branch: questionId.endsWith("__or") ? "or" as const : "main" as const,
      },
    }));
    if (correct) gam.awardXP(5);
  }, [remainingTime]);

  const toggleMark = useCallback((questionId: string) => {
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const finishExam = useCallback(() => {
    if (!paper) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const result = computeExamAnalytics(paper, answers);
    const wallClockSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
    setWallClockSec(wallClockSeconds);
    setAnalytics(result);
    setPhase("review");
    gam.awardXP(50);
    gam.incrementDailyGoal();

    saveMockScore({
      subject,
      totalMarks: result.marksScored,
      maxMarks: result.totalMarks,
      percent: result.percentScore,
      topicBreakdown: Object.fromEntries(
        result.topicHeatmap.map(t => [t.topicKey, { scored: t.marks, maxPossible: t.maxMarks }])
      ),
    });

    trackUxEvent("exam_simulation_complete", "ExamSimulationPage", {
      subject,
      score: result.percentScore,
      totalSeconds: wallClockSeconds,
    });
  }, [paper, answers, subject]);

  finishExamRef.current = finishExam;

  const goToSection = useCallback((idx: number) => {
    setCurrentSectionIdx(idx);
  }, []);

  if (phase === "breathing") {
    return <BreathingMoment onComplete={(skipped) => startExamAfterBreathing(skipped)} />;
  }

  if (phase === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 32px" }}>
          <ReturnContextBar backTo={backTo} backLabel={backLabel} />

          <div style={{
            marginTop: 24,
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            borderRadius: 24, padding: "32px 28px", color: "var(--text)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>
              Exam Simulation Mode
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: "0 0 12px" }}>
              {subject} Full-Length Mock
            </h1>
            <p style={{ fontSize: "0.9rem", opacity: 0.85, lineHeight: 1.6, marginBottom: 20 }}>
              80-mark CBSE board paper with 38 questions across 5 sections. 
              3-hour timer, section navigation, question palette, and internal choice in B/C/D/E.
              Paper auto-submits when time runs out.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              {BLUEPRINT_SUMMARY.map(b => (
                <div key={b.section} style={{
                  background: "var(--bg-card-border)", borderRadius: 12, padding: "8px 14px",
                  fontSize: "0.78rem",
                }}>
                  <strong>Sec {b.section}</strong>: {b.count}Q × {b.marks}m = {b.count * b.marks}m
                  <span style={{ opacity: 0.7, marginLeft: 6 }}>~{b.time} min</span>
                </div>
              ))}
            </div>

            <button
              onClick={generatePaper}
              style={{
                padding: "14px 36px", borderRadius: 16, border: "none", cursor: "pointer",
                background: "#58cc02", color: "var(--text)", fontWeight: 700, fontSize: "1rem",
                boxShadow: "0 4px 0 #46a302",
              }}
            >
              Generate & Start Exam
            </button>
          </div>

          <ExamStrategyTips onDismiss={() => {}} />
        </div>
      </div>
    );
  }

  if (phase === "taking" && paper) {
    return (
      <ExamTakingView
        paper={paper}
        currentSectionIdx={currentSectionIdx}
        remainingTime={remainingTime}
        answers={answers}
        markedForReview={markedForReview}
        onAnswer={handleAnswer}
        onToggleMark={toggleMark}
        onGoToSection={goToSection}
        onFinish={finishExam}
      />
    );
  }

  if (phase === "review" && paper && analytics) {
    return (
      <ExamReviewView
        paper={paper}
        analytics={analytics}
        answers={answers}
        subject={subject}
        wallClockSec={wallClockSec}
        onNewPaper={generatePaper}
        onGoBack={() => navigate(backTo)}
      />
    );
  }

  return null;
}

const BLUEPRINT_SUMMARY = [
  { section: "A", count: 20, marks: 1, time: 40 },
  { section: "B", count: 5, marks: 2, time: 20 },
  { section: "C", count: 6, marks: 3, time: 30 },
  { section: "D", count: 4, marks: 5, time: 30 },
  { section: "E", count: 3, marks: 4, time: 20 },
];

function ExamTakingView({ paper, currentSectionIdx, remainingTime, answers, markedForReview, onAnswer, onToggleMark, onGoToSection, onFinish }: {
  paper: ExamPaper; currentSectionIdx: number; remainingTime: number;
  answers: Record<string, ExamAnswer>; markedForReview: Set<string>;
  onAnswer: (qId: string, sel: string, correct: string) => void;
  onToggleMark: (qId: string) => void;
  onGoToSection: (idx: number) => void;
  onFinish: () => void;
}) {
  const sec = paper.sections[currentSectionIdx];
  const isUrgent = remainingTime < 600;

  const totalAnswered = paper.sections.reduce((sum, s) =>
    sum + s.questions.filter(q => answers[q.main.id]).length, 0);
  const totalQuestions = paper.questionCount;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: "var(--bg-card-border)", color: "var(--text)",
        padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>{paper.subject} Mock</span>
          <span style={{ fontSize: "0.78rem", opacity: 0.7 }}>
            {totalAnswered}/{totalQuestions} answered
          </span>
        </div>
        <div style={{
          fontSize: "1.1rem", fontWeight: 700,
          color: isUrgent ? "#ef4444" : "#58cc02",
          animation: isUrgent ? "pulse 1s infinite" : undefined,
        }}>
          {formatTime(remainingTime)}
        </div>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to submit? You still have time remaining.")) {
              onFinish();
            }
          }}
          style={{
            padding: "6px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            background: "#ef4444", color: "var(--text)", fontWeight: 600, fontSize: "0.78rem",
          }}
        >
          Submit Paper
        </button>
      </div>

      <div style={{ display: "flex", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          width: 200, minWidth: 200, padding: "12px", background: "var(--bg-card)",
          borderRight: "1px solid var(--bg-card-border)", minHeight: "calc(100vh - 44px)",
          position: "sticky", top: 44, maxHeight: "calc(100vh - 44px)", overflowY: "auto",
        }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 12, textTransform: "uppercase" }}>
            Sections
          </div>
          {paper.sections.map((s, i) => {
            const answered = s.questions.filter(q => answers[q.main.id]).length;
            const isActive = i === currentSectionIdx;
            return (
              <button
                key={s.section}
                onClick={() => onGoToSection(i)}
                style={{
                  width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 10,
                  border: isActive ? `2px solid ${SECTION_COLORS[s.section]}` : "1px solid var(--bg-card-border)",
                  background: isActive ? `${SECTION_COLORS[s.section]}10` : "var(--bg-card)",
                  marginBottom: 6, cursor: "pointer", fontSize: "0.78rem",
                }}
              >
                <div style={{ fontWeight: 700, color: SECTION_COLORS[s.section] }}>Sec {s.section}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                  {answered}/{s.questions.length} done
                </div>
              </button>
            );
          })}

          <div style={{ marginTop: 16, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
            Question Palette
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {paper.sections.flatMap((s, si) =>
              s.questions.map((q, qi) => {
                const globalIdx = paper.sections.slice(0, si).reduce((sum, ss) => sum + ss.questions.length, 0) + qi;
                const isAnswered = !!answers[q.main.id];
                const isMarked = markedForReview.has(q.main.id);
                let bg = "var(--bg-card)";
                let color = "#64748b";
                if (isAnswered && isMarked) { bg = "#fbbf24"; color = "#fff"; }
                else if (isAnswered) { bg = "#22c55e"; color = "#fff"; }
                else if (isMarked) { bg = "#a855f7"; color = "#fff"; }

                return (
                  <button
                    key={q.main.id}
                    onClick={() => onGoToSection(si)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
                      background: bg, color, fontSize: "0.65rem", fontWeight: 600,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                    title={`Q${globalIdx + 1} (Sec ${s.section})`}
                  >
                    {globalIdx + 1}
                  </button>
                );
              })
            )}
          </div>

          <div style={{ marginTop: 12, fontSize: "0.65rem", color: "var(--text-muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#22c55e", display: "inline-block" }} /> Answered
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#a855f7", display: "inline-block" }} /> Marked for review
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--bg-card-border)", display: "inline-block" }} /> Not visited
            </div>
          </div>
        </div>

        <div style={{ flex: 1, padding: "16px 24px 80px" }}>
          {sec && (
            <div>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 16,
              }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: SECTION_COLORS[sec.section], margin: 0 }}>
                  {SECTION_LABELS[sec.section]}
                </h2>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {sec.questions.filter(q => answers[q.main.id]).length}/{sec.questions.length} answered
                  {" · "}{sec.sectionMarks} marks · ~{sec.timeGuideMinutes} min
                </span>
              </div>

              {sec.questions.map((q, qi) => (
                <ExamQuestionCard
                  key={q.main.id}
                  q={q}
                  idx={qi}
                  section={sec.section}
                  answer={answers[q.main.id]}
                  isMarked={markedForReview.has(q.main.id)}
                  onAnswer={onAnswer}
                  onToggleMark={() => onToggleMark(q.main.id)}
                />
              ))}

              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                {currentSectionIdx > 0 && (
                  <button
                    onClick={() => onGoToSection(currentSectionIdx - 1)}
                    style={{
                      padding: "10px 24px", borderRadius: 14, border: "2px solid #6366f1",
                      background: "var(--bg-card)", color: "#6366f1", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                    }}
                  >
                    Previous Section
                  </button>
                )}
                {currentSectionIdx < paper.sections.length - 1 && (
                  <button
                    onClick={() => onGoToSection(currentSectionIdx + 1)}
                    style={{
                      padding: "10px 24px", borderRadius: 14, border: "none",
                      background: "#58cc02", color: "var(--text)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                      boxShadow: "0 3px 0 #46a302",
                    }}
                  >
                    Next: Section {paper.sections[currentSectionIdx + 1]?.section}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExamQuestionCard({ q, idx, section, answer, isMarked, onAnswer, onToggleMark }: {
  q: { main: CanonicalQuestion; or?: CanonicalQuestion };
  idx: number; section: SectionKey;
  answer?: ExamAnswer; isMarked: boolean;
  onAnswer: (qId: string, sel: string, correct: string) => void;
  onToggleMark: () => void;
}) {
  const chosenBranch = answer?.branch;
  const answeredMain = chosenBranch === "main";
  const answeredOr = chosenBranch === "or";

  const hasMcq = (question: CanonicalQuestion) => question.options && question.options.length > 0;

  function renderOptions(question: CanonicalQuestion, branch: "main" | "or") {
    if (!hasMcq(question)) return null;
    const isThisBranch = chosenBranch === branch;
    const otherBranchAnswered = chosenBranch && chosenBranch !== branch;
    return (
      <div style={{ marginTop: 8, paddingLeft: 20 }}>
        {question.options!.map((opt, oi) => {
          const letter = String.fromCharCode(97 + oi);
          const isSelected = isThisBranch && answer?.selected === opt;
          let bg = "var(--bg-card)";
          if (isSelected) bg = "rgba(99,102,241,0.15)";
          if (otherBranchAnswered) bg = "var(--bg-card)";

          return (
            <div
              key={oi}
              onClick={() => !otherBranchAnswered &&
                onAnswer(q.main.id + (branch === "or" ? "__or" : ""), opt, question.answer || "")}
              style={{
                padding: "6px 12px", borderRadius: 8, marginBottom: 4, fontSize: "0.82rem",
                background: bg, cursor: otherBranchAnswered ? "default" : "pointer",
                border: isSelected ? "1px solid #6366f1" : "1px solid var(--bg-card-border)",
                color: otherBranchAnswered ? "var(--text-muted)" : "var(--text)",
                opacity: otherBranchAnswered ? 0.5 : 1,
              }}
            >
              ({letter}) {opt}
            </div>
          );
        })}
      </div>
    );
  }

  function renderSelfMark(question: CanonicalQuestion, branch: "main" | "or") {
    if (hasMcq(question)) return null;
    const otherBranchAnswered = chosenBranch && chosenBranch !== branch;
    if (otherBranchAnswered) return null;
    const isThisBranch = chosenBranch === branch;
    if (isThisBranch) {
      return (
        <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: answer?.selected === "correct" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", fontSize: "0.78rem", color: "var(--text)" }}>
          Self-marked: <strong>{answer?.selected === "correct" ? "Correct" : "Incorrect"}</strong>
        </div>
      );
    }
    const qIdSuffix = branch === "or" ? "__or" : "";
    return (
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          onClick={() => onAnswer(q.main.id + qIdSuffix, "correct", "correct")}
          style={{
            padding: "5px 14px", borderRadius: 8, border: "1px solid #22c55e",
            background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          I got it right
        </button>
        <button
          onClick={() => onAnswer(q.main.id + qIdSuffix, "incorrect", "correct")}
          style={{
            padding: "5px 14px", borderRadius: 8, border: "1px solid #ef4444",
            background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          I got it wrong
        </button>
      </div>
    );
  }

  return (
    <div style={{
      marginBottom: 16, padding: "16px", borderRadius: 14,
      background: "var(--bg-card)", border: `1px solid ${isMarked ? "#a855f7" : "var(--bg-card-border)"}`,
      boxShadow: isMarked ? "0 0 0 2px #a855f720" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ fontSize: "0.84rem", color: answeredOr ? "var(--text-muted)" : "var(--text)", lineHeight: 1.6, flex: 1 }}>
          <strong style={{ color: SECTION_COLORS[section] }}>Q{idx + 1}.</strong>{" "}
          {q.main.questionText}
          {q.main.subtopic && (
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: 6 }}>[{q.main.subtopic}]</span>
          )}
          <TimeGuideChip marks={q.main.marks} section={section} />
        </div>
        <button
          onClick={onToggleMark}
          style={{
            padding: "3px 8px", borderRadius: 6, border: "1px solid var(--bg-card-border)",
            background: isMarked ? "#a855f7" : "var(--bg-card)", color: isMarked ? "#fff" : "var(--text-muted)",
            fontSize: "0.65rem", cursor: "pointer", whiteSpace: "nowrap", marginLeft: 8,
          }}
        >
          {isMarked ? "Marked" : "Mark"}
        </button>
      </div>

      {renderOptions(q.main, "main")}
      {renderSelfMark(q.main, "main")}

      {q.or && (
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 10, borderLeft: "3px solid #f59e0b",
          background: answeredMain ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.08)",
          opacity: answeredMain ? 0.5 : 1,
        }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>OR</div>
          <div style={{ fontSize: "0.84rem", color: answeredMain ? "var(--text-muted)" : "var(--text)", lineHeight: 1.6 }}>
            {q.or.questionText}
            {q.or.subtopic && (
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: 6 }}>[{q.or.subtopic}]</span>
            )}
          </div>
          {renderOptions(q.or, "or")}
          {renderSelfMark(q.or, "or")}
          {!chosenBranch && <InternalChoiceTip />}
        </div>
      )}
    </div>
  );
}

function ExamReviewView({ paper, analytics, answers, subject, wallClockSec, onNewPaper, onGoBack }: {
  paper: ExamPaper; analytics: ExamAnalytics; answers: Record<string, ExamAnswer>;
  subject: LTSubjectKey; wallClockSec: number; onNewPaper: () => void; onGoBack: () => void;
}) {
  const scoreColor = analytics.percentScore >= 70 ? "#16a34a" : analytics.percentScore >= 40 ? "#f59e0b" : "#ef4444";
  const [showFullReview, setShowFullReview] = useState(false);
  const pastScores = getMockScoresForSubject(subject).sort((a, b) => a.timestamp - b.timestamp).slice(-10);
  const previousBest = pastScores.length > 1
    ? Math.max(...pastScores.slice(0, -1).map(s => s.percent ?? 0))
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 32px" }}>
        <div style={{
          background: "var(--bg-card)", borderRadius: 24, padding: "32px 28px", textAlign: "center",
          border: "1px solid var(--bg-card-border)", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
            {subject} Full-Length Mock — Result
          </div>
          <CountUpReveal value={analytics.percentScore} previousBest={previousBest} style={{ fontSize: "3.5rem", fontWeight: 800, color: scoreColor }} />
          <div style={{ fontSize: "1rem", color: "var(--text-muted)", marginTop: 4 }}>
            {analytics.marksScored} / {analytics.totalMarks} marks
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 4 }}>
            Time taken: {formatTime(wallClockSec)}
          </div>
        </div>

        <div style={{
          marginTop: 20, background: "var(--bg-card)", borderRadius: 20, padding: "24px",
          border: "1px solid var(--bg-card-border)",
        }}>
          <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Section Breakdown</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {analytics.sectionBreakdown.map(sb => (
              <div key={sb.section} style={{
                flex: "1 1 140px", padding: "12px 16px", borderRadius: 14,
                background: `${SECTION_COLORS[sb.section]}10`, border: `1px solid ${SECTION_COLORS[sb.section]}30`,
              }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: SECTION_COLORS[sb.section] }}>Section {sb.section}</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)" }}>{sb.scored}/{sb.maxMarks}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{sb.percent}% accuracy</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>{formatMinSec(sb.timeSec)}</div>
                {(() => {
                  const rec = BLUEPRINT_SUMMARY.find(b => b.section === sb.section);
                  if (!rec) return null;
                  const recSec = rec.time * 60;
                  const diff = sb.timeSec - recSec;
                  const diffMin = Math.abs(Math.round(diff / 60));
                  if (diffMin < 2) return <div style={{ fontSize: "0.62rem", color: "#22c55e", marginTop: 1 }}>On pace</div>;
                  return <div style={{ fontSize: "0.62rem", color: diff > 0 ? "#f59e0b" : "#3b82f6", marginTop: 1 }}>
                    {diff > 0 ? `${diffMin}m over` : `${diffMin}m under`} (rec: {rec.time}m)
                  </div>;
                })()}
              </div>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: 20, background: "var(--bg-card)", borderRadius: 20, padding: "24px",
          border: "1px solid var(--bg-card-border)",
        }}>
          <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Topic-wise Performance</h3>
          {analytics.topicHeatmap.map(t => (
            <div key={t.topicKey} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 3 }}>
                <span style={{ color: "var(--text)" }}>{t.topicKey}</span>
                <span style={{
                  fontWeight: 600,
                  color: t.percent >= 70 ? "#16a34a" : t.percent >= 40 ? "#f59e0b" : "#ef4444",
                }}>
                  {t.marks}/{t.maxMarks} marks ({t.percent}%)
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--bg-card-border)", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 999, width: `${t.percent}%`,
                  background: t.percent >= 70 ? "#22c55e" : t.percent >= 40 ? "#f59e0b" : "#ef4444",
                  transition: "width 0.5s ease",
                }} />
              </div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 20, background: "var(--bg-card)", borderRadius: 20, padding: "24px",
          border: "1px solid var(--bg-card-border)",
        }}>
          <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>Difficulty Breakdown</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {analytics.difficultyBreakdown.map(d => {
              const color = d.difficulty === "Easy" ? "#22c55e" : d.difficulty === "Medium" ? "#f59e0b" : "#ef4444";
              return (
                <div key={d.difficulty} style={{
                  flex: "1 1 100px", padding: "12px", borderRadius: 14,
                  background: `${color}10`, border: `1px solid ${color}30`, textAlign: "center",
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color }}>{d.difficulty}</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>{d.correct}/{d.total}</div>
                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{d.percent}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {analytics.weakAreas.length > 0 && (
          <div style={{
            marginTop: 20, background: "rgba(239,68,68,0.08)", borderRadius: 20, padding: "24px",
            border: "1px solid rgba(239,68,68,0.2)",
          }}>
            <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>
              Weak Areas — Focus on These
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {analytics.weakAreas.map(sub => (
                <button
                  key={sub}
                  onClick={() => {
                    const topicKey = analytics.topicHeatmap.find(
                      t => t.topicKey.toLowerCase().includes(sub.toLowerCase()) ||
                        sub.toLowerCase().includes(t.topicKey.toLowerCase())
                    )?.topicKey;
                    if (topicKey) {
                      window.location.href = `/topic-hub/10/${encodeURIComponent(subject)}/${encodeURIComponent(topicKey)}`;
                    } else {
                      window.location.href = `/weak-area-practice`;
                    }
                  }}
                  style={{
                    padding: "6px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                    background: "var(--bg-card)", color: "#ef4444", fontSize: "0.78rem", fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {sub} →
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: "0.72rem", color: "#ef4444" }}>
              Tap a topic to practice and strengthen it
            </div>
          </div>
        )}

        {pastScores.length >= 2 && (
          <div style={{
            marginTop: 20, background: "var(--bg-card)", borderRadius: 20, padding: "24px",
            border: "1px solid var(--bg-card-border)",
          }}>
            <h3 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>
              Score Trend — Last {pastScores.length} Attempts
            </h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
              {pastScores.map((s, i) => {
                const barH = Math.max(8, (s.percent / 100) * 100);
                const isLatest = i === pastScores.length - 1;
                const barColor = isLatest ? "#58cc02" : s.percent >= 70 ? "#22c55e60" : s.percent >= 40 ? "#f59e0b60" : "#ef444460";
                return (
                  <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{ fontSize: "0.62rem", fontWeight: isLatest ? 700 : 400, color: isLatest ? "var(--text)" : "var(--text-muted)" }}>
                      {s.percent}%
                    </div>
                    <div style={{
                      width: "100%", maxWidth: 40, height: barH, borderRadius: 6,
                      background: barColor, border: isLatest ? "2px solid #46a302" : "none",
                    }} />
                    <div style={{ fontSize: "0.55rem", color: "var(--text-muted)" }}>
                      {new Date(s.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                );
              })}
            </div>
            {(() => {
              const prev = pastScores[pastScores.length - 2];
              const curr = pastScores[pastScores.length - 1];
              const delta = curr.percent - prev.percent;
              if (delta > 0) return <div style={{ marginTop: 12, fontSize: "0.82rem", color: "#22c55e", fontWeight: 600 }}>↑ {delta}% improvement from previous attempt</div>;
              if (delta < 0) return <div style={{ marginTop: 12, fontSize: "0.82rem", color: "#ef4444", fontWeight: 600 }}>↓ {Math.abs(delta)}% drop from previous attempt</div>;
              return <div style={{ marginTop: 12, fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 600 }}>Same score as previous attempt</div>;
            })()}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setShowFullReview(v => !v)}
            style={{
              padding: "10px 24px", borderRadius: 14, border: "1px solid var(--bg-card-border)",
              background: "var(--bg-card)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
              width: "100%",
            }}
          >
            {showFullReview ? "Hide Full Paper Review" : "Show Full Paper Review with Answers"}
          </button>
        </div>

        {showFullReview && (
          <div style={{ marginTop: 20 }}>
            {paper.sections.map(sec => (
              <div key={sec.section} style={{
                background: "var(--bg-card)", borderRadius: 16, padding: "20px", marginBottom: 16,
                border: "1px solid var(--bg-card-border)",
              }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: SECTION_COLORS[sec.section], marginBottom: 12 }}>
                  {SECTION_LABELS[sec.section]}
                </h4>
                {sec.questions.map((q, qi) => {
                  const ans = answers[q.main.id];
                  const answeredQ = (ans?.branch === "or" && q.or) ? q.or : q.main;
                  const isCorrect = ans?.correct;
                  return (
                    <div key={q.main.id} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--bg-card-border)" }}>
                      <div style={{ fontSize: "0.84rem", color: "var(--text)", lineHeight: 1.6 }}>
                        <strong style={{ color: SECTION_COLORS[sec.section] }}>Q{qi + 1}.</strong>{" "}
                        {q.main.questionText}
                      </div>
                      {ans && (
                        <div style={{
                          marginTop: 6, padding: "6px 12px", borderRadius: 8,
                          background: isCorrect ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                          fontSize: "0.78rem", color: isCorrect ? "#166534" : "#991b1b",
                        }}>
                          Your answer: <strong>{ans.selected}</strong> — {isCorrect ? "Correct" : "Incorrect"}
                          {ans.branch === "or" && " (OR choice)"}
                        </div>
                      )}
                      <div style={{ marginTop: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(34,197,94,0.08)", fontSize: "0.78rem", color: "#22c55e" }}>
                        <strong>Correct Answer:</strong> {answeredQ.answer}
                        {answeredQ.explanation && <div style={{ marginTop: 4, color: "var(--text-muted)" }}>{answeredQ.explanation}</div>}
                      </div>
                      {q.or && (
                        <div style={{ marginTop: 6, padding: "6px 12px", borderRadius: 8, background: "rgba(245,158,11,0.08)", fontSize: "0.76rem", color: "#f59e0b" }}>
                          <strong>OR Question:</strong> {q.or.questionText}<br />
                          <strong>OR Answer:</strong> {q.or.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <button onClick={onNewPaper} style={{
            padding: "12px 28px", borderRadius: 14, border: "none",
            background: "#58cc02", color: "var(--text)", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
            boxShadow: "0 3px 0 #46a302",
          }}>
            Generate New Paper
          </button>
          <button onClick={onGoBack} style={{
            padding: "12px 28px", borderRadius: 14, border: "2px solid #6366f1",
            background: "var(--bg-card)", color: "#6366f1", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
          }}>
            Back to Papers Hub
          </button>
        </div>
      </div>
    </div>
  );
}
