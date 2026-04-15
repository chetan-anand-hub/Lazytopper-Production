import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import {
  buildTopicMockPaper,
  getAvailableSetCount,
  computeAnalytics,
  type TopicMockPaper,
  type TopicMockQuestion,
  type TopicMockAnalytics,
  type TopicMockAnswer,
} from "../utils/topicMockEngine";
import type { SectionKey, LTSubjectKey } from "../data/predictionTypes";
import { resolveTopicDisplayName, normalizeTopicKey } from "../utils/topicResolver";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { ExamStrategyTips, TimeGuideChip, InternalChoiceTip } from "../components/exam/ExamStrategyTips";
import { CountUpReveal } from "../components/celebrations";
import { trackUxEvent } from "../services/uxTelemetry";
import * as gam from "../utils/gamification";
import { markMockDone } from "../services/guidedJourneyService";
import { useAuth } from "../context/AuthContext";

type Phase = "preview" | "taking" | "review";

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function subjectFromParam(raw: string): LTSubjectKey {
  return raw?.toLowerCase().includes("science") ? "Science" : "Maths";
}

export default function TopicMockPage() {
  const params = useParams<"grade" | "subject" | "topicKey">();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUserForJourney } = useAuth();

  const grade = params.grade || "10";
  const subject = subjectFromParam(params.subject || sp.get("subject") || "Maths");
  const rawTopicKey = params.topicKey || sp.get("topic") || "";
  const topicKey = normalizeTopicKey(rawTopicKey) || rawTopicKey;
  const topicName = resolveTopicDisplayName(subject, topicKey);
  const parsedSet = parseInt(sp.get("set") || "1", 10);
  const setFromUrl = Number.isFinite(parsedSet) && parsedSet >= 1 ? parsedSet : 1;

  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = navState?.back || `/topic-hub/${grade}/${subject.toLowerCase()}/${topicKey}`;
  const backLabel = navState?.backLabel || "Back to topic";

  const [currentSet, setCurrentSet] = useState(Math.max(1, setFromUrl));
  const [phase, setPhase] = useState<Phase>("preview");
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [answers, setAnswers] = useState<Record<string, TopicMockAnswer>>({});
  const [analytics, setAnalytics] = useState<TopicMockAnalytics | null>(null);
  const [previousBest, setPreviousBest] = useState<number | undefined>(undefined);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sectionStartRef = useRef(0);

  const totalSets = useMemo(() => Math.max(1, getAvailableSetCount(topicKey, subject)), [topicKey, subject]);
  const paper: TopicMockPaper = useMemo(
    () => buildTopicMockPaper(topicKey, subject, currentSet, topicName),
    [topicKey, subject, currentSet, topicName],
  );

  useEffect(() => {
    if (phase === "taking" && timerEnabled) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, timerEnabled]);

  const startMock = useCallback(() => {
    setPhase("taking");
    setElapsed(0);
    setAnswers({});
    setCurrentSectionIdx(0);
    sectionStartRef.current = 0;
    trackUxEvent("topic_mock_start", "TopicMockPage", { topicKey, set: currentSet, subject });
  }, [topicKey, currentSet, subject]);

  const lastAnswerTimeRef = useRef(0);
  useEffect(() => { if (phase === "taking" && elapsed === 0) lastAnswerTimeRef.current = 0; }, [phase, elapsed]);
  const handleAnswer = useCallback((questionId: string, selected: string, correctAnswer: string) => {
    const correct = selected.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    const delta = elapsed - lastAnswerTimeRef.current;
    lastAnswerTimeRef.current = elapsed;
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
    if (correct) {
      gam.awardXP(5);
    }
  }, [elapsed]);

  const nextSection = useCallback(() => {
    sectionStartRef.current = elapsed;
    if (currentSectionIdx < paper.sections.length - 1) {
      setCurrentSectionIdx(i => i + 1);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      const result = computeAnalytics(paper, answers);
      const histKey = `lazytopper.topic_mock_scores.${topicKey}`;
      try {
        const prev: number[] = JSON.parse(localStorage.getItem(histKey) || "[]");
        const best = prev.length > 0 ? Math.max(...prev) : undefined;
        setPreviousBest(best);
        prev.push(result.percentScore);
        localStorage.setItem(histKey, JSON.stringify(prev.slice(-20)));
      } catch {}
      setAnalytics(result);
      setPhase("review");
      gam.awardXP(25);
      gam.incrementDailyGoal();
      trackUxEvent("topic_mock_complete", "TopicMockPage", {
        topicKey, set: currentSet, score: result.percentScore, totalSeconds: elapsed,
      });
      markMockDone(topicKey, authUserForJourney?.uid);
    }
  }, [currentSectionIdx, paper, answers, elapsed, currentSet, topicKey, authUserForJourney?.uid]);

  const switchSet = useCallback((set: number) => {
    setCurrentSet(set);
    setPhase("preview");
    setElapsed(0);
    setAnswers({});
    setAnalytics(null);
    setPreviousBest(undefined);
    setCurrentSectionIdx(0);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const goToWeakPractice = useCallback((subtopic: string) => {
    navigate(`/practice/${grade}/${subject}?topic=${encodeURIComponent(topicKey)}&subtopic=${encodeURIComponent(subtopic)}`, {
      state: { back: location.pathname + location.search, backLabel: `Back to mock review` },
    });
  }, [navigate, grade, subject, topicKey, location]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", paddingBottom: 80 }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 32px" }}>
        <ReturnContextBar backTo={backTo} backLabel={backLabel} />

        <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {Array.from({ length: totalSets }, (_, i) => i + 1).map(s => (
            <button
              key={s}
              onClick={() => switchSet(s)}
              style={{
                padding: "6px 16px", borderRadius: 12, cursor: "pointer",
                border: s === currentSet ? "2px solid #58cc02" : "1px solid var(--bg-card-border)",
                background: s === currentSet ? "#58cc02" : "var(--bg-card)",
                color: s === currentSet ? "#fff" : "var(--text-muted)",
                fontWeight: s === currentSet ? 700 : 500, fontSize: "0.82rem",
              }}
            >
              Set {s}
            </button>
          ))}
        </div>

        {phase === "preview" && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              borderRadius: 20, padding: "28px 24px", color: "var(--text)",
              boxShadow: "0 4px 0 rgba(99,102,241,0.3)",
            }}>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.85, marginBottom: 6 }}>
                Topic Mock Paper — Set {currentSet}
              </div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 8px" }}>{topicName}</h1>
              <p style={{ fontSize: "0.88rem", opacity: 0.92, lineHeight: 1.5 }}>
                Class {grade} {subject} — {paper.questionCount} questions — {paper.totalMarks} marks — ~{paper.totalTimeMinutes} min
              </p>

              <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {paper.sections.map(sec => (
                  <div key={sec.section} style={{
                    background: "var(--text-muted)", borderRadius: 12, padding: "8px 14px",
                    fontSize: "0.78rem",
                  }}>
                    <strong>Sec {sec.section}</strong>: {sec.questions.length} Q × {sec.marksPerQuestion}m = {sec.sectionMarks}m
                    <span style={{ opacity: 0.8, marginLeft: 6 }}>~{sec.timeGuideMinutes} min</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", cursor: "pointer" }}>
                  <input
                    type="checkbox" checked={timerEnabled} onChange={e => setTimerEnabled(e.target.checked)}
                    style={{ accentColor: "#fff", width: 16, height: 16 }}
                  />
                  Enable Timer
                </label>
                <button
                  onClick={startMock}
                  style={{
                    padding: "10px 28px", borderRadius: 14, border: "none", cursor: "pointer",
                    background: "var(--bg-card)", color: "#6366f1", fontWeight: 700, fontSize: "0.9rem",
                    boxShadow: "0 2px 0 rgba(0,0,0,0.1)",
                  }}
                >
                  Start Mock
                </button>
                <button
                  onClick={handlePrint}
                  style={{
                    padding: "10px 20px", borderRadius: 14, border: "2px solid var(--text-muted)",
                    background: "transparent", color: "var(--text)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                  }}
                >
                  Print / PDF
                </button>
              </div>
            </div>

            <ExamStrategyTips onDismiss={() => {}} />

            <div className="print-paper" style={{ marginTop: 24 }}>
              {paper.sections.map(sec => (
                <div key={sec.section} style={{
                  background: "var(--bg-card)", borderRadius: 16, padding: "20px 20px 16px", marginBottom: 16,
                  border: `1px solid ${SECTION_COLORS[sec.section]}22`,
                }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: SECTION_COLORS[sec.section], marginBottom: 12 }}>
                    {SECTION_LABELS[sec.section]}
                  </h3>
                  {sec.questions.map((q, qi) => (
                    <QuestionDisplay key={q.main.id} q={q} idx={qi} section={sec.section} showAnswer={false} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "taking" && (
          <TakingPhase
            paper={paper}
            currentSectionIdx={currentSectionIdx}
            elapsed={elapsed}
            timerEnabled={timerEnabled}
            answers={answers}
            onAnswer={handleAnswer}
            onNextSection={nextSection}
          />
        )}

        {phase === "review" && analytics && (
          <ReviewPhase
            paper={paper}
            analytics={analytics}
            answers={answers}
            previousBest={previousBest}
            onGoToWeakPractice={goToWeakPractice}
            onRetake={() => startMock()}
            onNextSet={() => currentSet < totalSets ? switchSet(currentSet + 1) : switchSet(1)}
            onPrint={handlePrint}
          />
        )}
      </div>
    </div>
  );
}

function QuestionDisplay({ q, idx, section, showAnswer, selectedAnswer, chosenBranch, onSelect, interactive }: {
  q: TopicMockQuestion; idx: number; section: SectionKey; showAnswer: boolean;
  selectedAnswer?: string; chosenBranch?: "main" | "or";
  onSelect?: (qId: string, answer: string, correct: string) => void;
  interactive?: boolean;
}) {
  const qNum = idx + 1;
  const isInteractive = interactive !== false;
  const answeredMain = chosenBranch === "main";
  const answeredOr = chosenBranch === "or";

  const hasMcqOptions = (question: typeof q.main) =>
    question.options && question.options.length > 0;

  function renderOptions(question: typeof q.main, branch: "main" | "or") {
    if (!hasMcqOptions(question)) return null;
    const isThisBranch = chosenBranch === branch;
    const otherBranchAnswered = chosenBranch && chosenBranch !== branch;
    return (
      <div style={{ marginTop: 8, paddingLeft: 20 }}>
        {question.options!.map((opt, oi) => {
          const letter = String.fromCharCode(97 + oi);
          const isSelected = isThisBranch && selectedAnswer === opt;
          const isCorrect = showAnswer && opt.trim().toLowerCase() === (question.answer || "").trim().toLowerCase();
          let bg = "var(--bg-card)";
          if (showAnswer && isCorrect) bg = "rgba(34,197,94,0.15)";
          else if (showAnswer && isSelected && !isCorrect) bg = "rgba(239,68,68,0.15)";
          else if (isSelected) bg = "rgba(99,102,241,0.15)";
          if (otherBranchAnswered) bg = "var(--bg-card)";

          return (
            <div
              key={oi}
              onClick={() => isInteractive && !showAnswer && !otherBranchAnswered &&
                onSelect?.(q.main.id + (branch === "or" ? "__or" : ""), opt, question.answer || "")}
              style={{
                padding: "6px 12px", borderRadius: 8, marginBottom: 4, fontSize: "0.82rem",
                background: bg, cursor: (!showAnswer && isInteractive && !otherBranchAnswered) ? "pointer" : "default",
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

  function renderSelfMark(question: typeof q.main, branch: "main" | "or") {
    if (hasMcqOptions(question)) return null;
    if (showAnswer) return null;
    if (!isInteractive) return null;
    const otherBranchAnswered = chosenBranch && chosenBranch !== branch;
    if (otherBranchAnswered) return null;
    const isThisBranch = chosenBranch === branch;
    if (isThisBranch) {
      return (
        <div style={{ marginTop: 8, padding: "6px 12px", borderRadius: 8, background: selectedAnswer === "correct" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", fontSize: "0.78rem", color: "var(--text)" }}>
          Self-marked: <strong>{selectedAnswer === "correct" ? "Correct" : "Incorrect"}</strong>
        </div>
      );
    }
    const qIdSuffix = branch === "or" ? "__or" : "";
    return (
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <button
          onClick={() => onSelect?.(q.main.id + qIdSuffix, "correct", "correct")}
          style={{
            padding: "5px 14px", borderRadius: 8, border: "1px solid #22c55e",
            background: "rgba(34,197,94,0.08)", color: "#22c55e", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
          }}
        >
          I got it right
        </button>
        <button
          onClick={() => onSelect?.(q.main.id + qIdSuffix, "incorrect", "correct")}
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
    <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--bg-card-border)" }}>
      <div style={{ fontSize: "0.84rem", color: answeredOr ? "var(--text-muted)" : "var(--text)", lineHeight: 1.6 }}>
        <strong style={{ color: SECTION_COLORS[section] }}>Q{qNum}.</strong>{" "}
        {q.main.questionText}
        {q.main.subtopic && (
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 8 }}>[{q.main.subtopic}]</span>
        )}
        <TimeGuideChip marks={q.main.marks} section={section} />
      </div>

      {renderOptions(q.main, "main")}
      {renderSelfMark(q.main, "main")}

      {showAnswer && q.main.answer && (answeredMain || !chosenBranch) && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(34,197,94,0.08)", borderRadius: 8, fontSize: "0.78rem", color: "#22c55e" }}>
          <strong>Answer:</strong> {q.main.answer}
          {q.main.explanation && <div style={{ marginTop: 4, color: "var(--text-muted)" }}>{q.main.explanation}</div>}
        </div>
      )}

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
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: 8 }}>[{q.or.subtopic}]</span>
            )}
          </div>
          {renderOptions(q.or, "or")}
          {renderSelfMark(q.or, "or")}
          {showAnswer && q.or.answer && (answeredOr || !chosenBranch) && (
            <div style={{ marginTop: 6, fontSize: "0.78rem", color: "#22c55e" }}>
              <strong>OR Answer:</strong> {q.or.answer}
            </div>
          )}
          {!showAnswer && !chosenBranch && <InternalChoiceTip />}
        </div>
      )}
    </div>
  );
}

function TakingPhase({ paper, currentSectionIdx, elapsed, timerEnabled, answers, onAnswer, onNextSection }: {
  paper: TopicMockPaper; currentSectionIdx: number; elapsed: number; timerEnabled: boolean;
  answers: Record<string, TopicMockAnswer>; onAnswer: (qId: string, sel: string, correct: string) => void;
  onNextSection: () => void;
}) {
  const sec = paper.sections[currentSectionIdx];
  if (!sec) return null;

  const answeredCount = sec.questions.filter(q => answers[q.main.id]).length;
  const allAnswered = answeredCount === sec.questions.length;
  const isLast = currentSectionIdx === paper.sections.length - 1;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10, background: "var(--bg-card)", padding: "10px 16px",
        borderRadius: 12, marginBottom: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)", border: "1px solid var(--bg-card-border)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          {timerEnabled && (
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-muted)" }}>
              Time: {formatTime(elapsed)}
            </span>
          )}
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Section {sec.section} — {answeredCount}/{sec.questions.length} answered
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "var(--bg-card-border)", overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 999,
            width: `${sec.questions.length > 0 ? (answeredCount / sec.questions.length) * 100 : 0}%`,
            background: SECTION_COLORS[sec.section],
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      <div style={{
        background: "var(--bg-card)", borderRadius: 16, padding: "20px", border: `2px solid ${SECTION_COLORS[sec.section]}`,
      }}>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: SECTION_COLORS[sec.section], marginBottom: 16 }}>
          {SECTION_LABELS[sec.section]}
        </h3>

        {sec.questions.map((q, qi) => (
          <QuestionDisplay
            key={q.main.id} q={q} idx={qi} section={sec.section} showAnswer={false}
            selectedAnswer={answers[q.main.id]?.selected}
            chosenBranch={answers[q.main.id]?.branch}
            onSelect={onAnswer}
            interactive
          />
        ))}

        <button
          onClick={onNextSection}
          disabled={!allAnswered}
          style={{
            marginTop: 16, padding: "10px 28px", borderRadius: 14, border: "none", cursor: "pointer",
            background: allAnswered ? "#58cc02" : "#94a3b8", color: "var(--text)", fontWeight: 700, fontSize: "0.88rem",
            boxShadow: "0 3px 0 rgba(0,0,0,0.15)",
          }}
        >
          {isLast ? "Finish & View Results" : `Next: Section ${paper.sections[currentSectionIdx + 1]?.section}`}
        </button>
      </div>
    </div>
  );
}

function ReviewPhase({ paper, analytics, answers, previousBest, onGoToWeakPractice, onRetake, onNextSet, onPrint }: {
  paper: TopicMockPaper; analytics: TopicMockAnalytics;
  answers: Record<string, TopicMockAnswer>;
  previousBest?: number;
  onGoToWeakPractice: (subtopic: string) => void;
  onRetake: () => void; onNextSet: () => void; onPrint: () => void;
}) {
  const scoreColor = analytics.percentScore >= 70 ? "#16a34a" : analytics.percentScore >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        background: "var(--bg-card)", borderRadius: 20, padding: "28px 24px", textAlign: "center",
        border: "1px solid var(--bg-card-border)", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
          Mock Result — {paper.topicDisplayName} — Set {paper.setIndex}
        </div>
        <CountUpReveal value={analytics.percentScore} previousBest={previousBest} style={{ fontSize: "3rem", fontWeight: 800, color: scoreColor }} />
        <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: 4 }}>
          {analytics.marksScored} / {analytics.totalMarks} marks
        </div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 4 }}>
          Time: {formatTime(analytics.timeAnalysis.totalSeconds)}
        </div>
      </div>

      <div style={{
        marginTop: 20, background: "var(--bg-card)", borderRadius: 16, padding: "20px",
        border: "1px solid var(--bg-card-border)",
      }}>
        <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Section Breakdown</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {analytics.sectionBreakdown.map(sb => (
            <div key={sb.section} style={{
              flex: "1 1 120px", padding: "10px 14px", borderRadius: 12,
              background: `${SECTION_COLORS[sb.section]}10`, border: `1px solid ${SECTION_COLORS[sb.section]}30`,
            }}>
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: SECTION_COLORS[sb.section] }}>Section {sb.section}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)" }}>{sb.scored}/{sb.maxMarks}</div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{sb.percent}% accuracy</div>
              {analytics.timeAnalysis.perSectionSeconds[sb.section] != null && (
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 2 }}>
                  {formatTime(analytics.timeAnalysis.perSectionSeconds[sb.section])}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 20, background: "var(--bg-card)", borderRadius: 16, padding: "20px",
        border: "1px solid var(--bg-card-border)",
      }}>
        <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Subtopic Heatmap</h3>
        {analytics.subtopicHeatmap.map(s => (
          <div key={s.subtopic} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 3 }}>
              <span style={{ color: "var(--text)" }}>{s.subtopic}</span>
              <span style={{ fontWeight: 600, color: s.percent >= 70 ? "#16a34a" : s.percent >= 40 ? "#f59e0b" : "#ef4444" }}>
                {s.correct}/{s.total} ({s.percent}%)
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--bg-card-border)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999, width: `${s.percent}%`,
                background: s.percent >= 70 ? "#22c55e" : s.percent >= 40 ? "#f59e0b" : "#ef4444",
                transition: "width 0.5s ease",
              }} />
            </div>
          </div>
        ))}
      </div>

      {analytics.weakAreas.length > 0 && (
        <div style={{
          marginTop: 20, background: "rgba(239,68,68,0.08)", borderRadius: 16, padding: "20px",
          border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ef4444", marginBottom: 12 }}>
            Weak Areas — Tap to practice
          </h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {analytics.weakAreas.map(sub => (
              <button
                key={sub}
                onClick={() => onGoToWeakPractice(sub)}
                style={{
                  padding: "6px 14px", borderRadius: 10, border: "1px solid #fca5a5",
                  background: "var(--bg-card)", color: "#ef4444", fontSize: "0.78rem", fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <h3 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>Full Paper Review</h3>
        {paper.sections.map(sec => (
          <div key={sec.section} style={{
            background: "var(--bg-card)", borderRadius: 16, padding: "16px", marginBottom: 12,
            border: "1px solid var(--bg-card-border)",
          }}>
            <h4 style={{ fontSize: "0.82rem", fontWeight: 700, color: SECTION_COLORS[sec.section], marginBottom: 10 }}>
              {SECTION_LABELS[sec.section]}
            </h4>
            {sec.questions.map((q, qi) => (
              <QuestionDisplay
                key={q.main.id} q={q} idx={qi} section={sec.section} showAnswer
                selectedAnswer={answers[q.main.id]?.selected}
                chosenBranch={answers[q.main.id]?.branch}
                interactive={false}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
        <button onClick={onRetake} style={{
          padding: "10px 24px", borderRadius: 14, border: "none", background: "#6366f1",
          color: "var(--text)", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
        }}>
          Retake This Set
        </button>
        <button onClick={onNextSet} style={{
          padding: "10px 24px", borderRadius: 14, border: "2px solid #6366f1",
          background: "var(--bg-card)", color: "#6366f1", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
        }}>
          Try Next Set
        </button>
        <button onClick={onPrint} style={{
          padding: "10px 24px", borderRadius: 14, border: "1px solid var(--bg-card-border)",
          background: "var(--bg)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
        }}>
          Print / PDF
        </button>
      </div>
    </div>
  );
}
