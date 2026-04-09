import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { generatePracticeSet } from "../data/practiceSetGenerator";
import { resolveTopicDisplayName, normalizeTopicKey } from "../utils/topicResolver";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { trackUxEvent } from "../services/uxTelemetry";
import * as gam from "../utils/gamification";
import { useSmartLearning } from "../engine/smartLearningStore";
import { useAuth } from "../context/AuthContext";
import type { CanonicalQuestion } from "../data/predictionTypes";
import {
  recordQuizResult,
  computeWeightedAccuracy,
  MASTERY_LABELS,
  MASTERY_COLORS,
  MASTERY_ICONS,
  MASTERY_POINTS,
  getChapterMasteryLevel,
  type QuizResult,
} from "../services/masteryLevelService";

type Phase = "preview" | "taking" | "review";
type SubjectKey = "Maths" | "Science";

const TOPIC_MASTERY_KEY_PREFIX = "lazytopper.topicHub.mastery.v1.";
function areAllConceptsCompleted(topicKey: string): boolean {
  try {
    const raw = window.localStorage.getItem(TOPIC_MASTERY_KEY_PREFIX + topicKey);
    if (!raw) return false;
    const data = JSON.parse(raw);
    return data?.lessonCompleted === true;
  } catch { return false; }
}

function subjectFromParam(raw: string): SubjectKey {
  return raw?.toLowerCase().includes("science") ? "Science" : "Maths";
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const CHAPTER_TEST_QUESTIONS = 10;
const TIME_LIMIT_SECONDS = 15 * 60;

export default function ChapterTestPage() {
  const params = useParams<"grade" | "subject" | "topicKey">();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const smartLearning = useSmartLearning();
  const { user } = useAuth();

  const grade = params.grade || "10";
  const subject = subjectFromParam(params.subject || sp.get("subject") || "Maths");
  const rawTopicKey = params.topicKey || sp.get("topic") || "";
  const topicKey = normalizeTopicKey(rawTopicKey) || rawTopicKey;
  const topicName = resolveTopicDisplayName(subject, topicKey);
  const chapterKey = `${grade}-${subject}-${topicKey}`;

  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = navState?.back || `/topic-hub/${grade}/${subject.toLowerCase()}/${topicKey}`;
  const backLabel = navState?.backLabel || "Back to topic";

  const [phase, setPhase] = useState<Phase>("preview");
  const [elapsed, setElapsed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selected: string; correct: boolean; isMcq: boolean }>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const questions = useMemo<CanonicalQuestion[]>(() => {
    const normalizedKey = normalizeTopicKey(topicKey) || topicKey;
    const pool = generatePracticeSet({
      subject,
      topicKey: normalizedKey,
      totalQuestions: 30,
      shuffle: true,
    });
    const valid = (pool.questions || []).filter(
      (q) => Boolean(q.questionText) && Boolean(q.answer)
    );
    const mcqs = valid.filter((q) => Array.isArray(q.options) && q.options.length >= 2);
    const nonMcqs = valid.filter((q) => !Array.isArray(q.options) || q.options.length < 2);

    const selected: CanonicalQuestion[] = [];
    const used = new Set<string>();
    const pick = (arr: CanonicalQuestion[], count: number) => {
      let remaining = count;
      for (const q of arr) {
        if (remaining <= 0) break;
        const key = q.id || q.questionText;
        if (!used.has(key)) { used.add(key); selected.push(q); remaining--; }
      }
    };
    pick(mcqs, 4);
    pick(nonMcqs, 4);
    const remaining = [...mcqs, ...nonMcqs].filter((q) => !used.has(q.id || q.questionText));
    pick(remaining, CHAPTER_TEST_QUESTIONS - selected.length);

    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }
    return selected.slice(0, CHAPTER_TEST_QUESTIONS);
  }, [subject, topicKey]);

  useEffect(() => {
    if (phase === "taking") {
      timerRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= TIME_LIMIT_SECONDS) {
            finishTest();
            return e + 1;
          }
          return e + 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const startTest = useCallback(() => {
    setPhase("taking");
    setElapsed(0);
    setCurrentIdx(0);
    setAnswers({});
    trackUxEvent("chapter_test_start", "ChapterTestPage", { topicKey, subject });
  }, [topicKey, subject]);

  const handleAnswer = useCallback(
    (idx: number, selected: string) => {
      const q = questions[idx];
      if (!q) return;
      const isMcq = Array.isArray(q.options) && q.options.length >= 2;
      const isSelfMark = selected === "correct" || selected === "incorrect";
      const correct = isSelfMark
        ? selected === "correct"
        : selected.trim().toLowerCase() === (q.answer || "").trim().toLowerCase();
      setAnswers((prev) => ({ ...prev, [idx]: { selected, correct, isMcq } }));
      if (correct) {
        gam.awardXP(10);
      }
    },
    [questions]
  );

  const finishTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("review");
    gam.awardXP(50);
    gam.incrementDailyGoal();
  }, []);

  const goNext = useCallback(() => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      finishTest();
    }
  }, [currentIdx, questions.length, finishTest]);

  const quizResult = useMemo<QuizResult>(() => {
    let mcqCount = 0;
    let mcqCorrect = 0;
    let nonMcqCount = 0;
    let nonMcqCorrect = 0;
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const isMcq = Array.isArray(q.options) && q.options.length >= 2;
      const a = answers[i];
      if (isMcq) {
        mcqCount++;
        if (a?.correct) mcqCorrect++;
      } else {
        nonMcqCount++;
        if (a?.correct) nonMcqCorrect++;
      }
    }
    return {
      totalQuestions: questions.length,
      correctAnswers: Object.values(answers).filter((a) => a.correct).length,
      mcqCount,
      mcqCorrect,
      nonMcqCount,
      nonMcqCorrect,
    };
  }, [answers, questions]);

  const [masteryRecord, setMasteryRecord] = useState<ReturnType<typeof recordQuizResult> | null>(null);

  useEffect(() => {
    if (phase === "review" && quizResult.totalQuestions > 0) {
      const rec = recordQuizResult(chapterKey, quizResult, true);
      setMasteryRecord(rec);
      for (const [idxStr, ans] of Object.entries(answers)) {
        const q = questions[Number(idxStr)];
        if (!q) continue;
        smartLearning.recordHpqAttempt({
          userId: user?.uid || "local",
          chapterId: chapterKey,
          grade,
          subject,
          questionId: q.id,
          marks: q.marks,
          difficulty: (q.difficulty as "Easy" | "Medium" | "Hard") || undefined,
          isCorrect: ans.correct,
          timeTakenSeconds: Math.round(elapsed / Math.max(1, quizResult.totalQuestions)),
          source: "other",
          attemptedAt: new Date().toISOString(),
        });
      }
      trackUxEvent("chapter_test_complete", "ChapterTestPage", {
        topicKey,
        score: computeWeightedAccuracy(quizResult),
        totalSeconds: elapsed,
      });
    }
  }, [phase]);

  const answeredCount = Object.keys(answers).length;
  const timeRemaining = Math.max(0, TIME_LIMIT_SECONDS - elapsed);
  const isTimeLow = timeRemaining < 120;

  const currentLevel = getChapterMasteryLevel(chapterKey);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: 80 }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 16px 32px" }}>
        <ReturnContextBar backTo={backTo} backLabel={backLabel} />

        {phase === "preview" && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                borderRadius: 20,
                padding: "28px 24px",
                color: "#fff",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  opacity: 0.85,
                  marginBottom: 6,
                }}
              >
                Chapter Test
              </div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 8px" }}>{topicName}</h1>
              <p style={{ fontSize: "0.88rem", opacity: 0.92, lineHeight: 1.5 }}>
                {questions.length} questions &middot; 15 minutes &middot; CBSE format
              </p>
              <p style={{ fontSize: "0.82rem", opacity: 0.8, marginTop: 8 }}>
                Score 100% while Proficient to reach <strong>Mastered</strong> level
              </p>

              <div
                style={{
                  marginTop: 16,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.15)",
                }}
              >
                <span style={{ fontSize: 16 }}>{MASTERY_ICONS[currentLevel]}</span>
                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                  Current: {MASTERY_LABELS[currentLevel]}
                </span>
              </div>

              <div style={{ marginTop: 24 }}>
                {areAllConceptsCompleted(topicKey) ? (
                  <button
                    onClick={startTest}
                    disabled={questions.length === 0}
                    style={{
                      padding: "12px 36px",
                      borderRadius: 14,
                      border: "none",
                      cursor: "pointer",
                      background: "#fff",
                      color: "#16a34a",
                      fontWeight: 800,
                      fontSize: "1rem",
                    }}
                  >
                    Start Chapter Test
                  </button>
                ) : (
                  <div style={{ padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.1)" }}>
                    <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 6 }}>
                      Complete all concepts first
                    </p>
                    <p style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                      Finish all concept lessons in the Topic Hub before attempting the Chapter Test.
                    </p>
                    <button
                      onClick={() => navigate(backTo)}
                      style={{
                        marginTop: 12, padding: "10px 28px", borderRadius: 12,
                        border: "none", cursor: "pointer", background: "#fff",
                        color: "#16a34a", fontWeight: 700, fontSize: "0.88rem",
                      }}
                    >
                      Go to Topic Hub
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {phase === "taking" && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                background: "rgba(10,10,10,0.95)",
                padding: "10px 16px",
                borderRadius: 12,
                marginBottom: 16,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: isTimeLow ? "#ef4444" : "rgba(255,255,255,0.6)",
                  }}
                >
                  Time: {formatTime(timeRemaining)}
                </span>
                <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
                  Q{currentIdx + 1}/{questions.length} &middot; {answeredCount} answered
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 999,
                    width: `${(answeredCount / questions.length) * 100}%`,
                    background: "#22c55e",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <TestQuestion
              question={questions[currentIdx]}
              idx={currentIdx}
              answer={answers[currentIdx]}
              onAnswer={(sel) => handleAnswer(currentIdx, sel)}
              onNext={goNext}
              isLast={currentIdx === questions.length - 1}
            />

            <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: i === currentIdx ? "2px solid #22c55e" : "1px solid rgba(255,255,255,0.06)",
                    background: answers[i]
                      ? answers[i].correct
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(239,68,68,0.2)"
                      : "rgba(255,255,255,0.03)",
                    color: i === currentIdx ? "#22c55e" : "rgba(255,255,255,0.5)",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "review" && masteryRecord && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 20,
                padding: "28px 24px",
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 8 }}>
                {quizResult.correctAnswers === quizResult.totalQuestions ? "🏆" : quizResult.correctAnswers >= Math.ceil(quizResult.totalQuestions * 0.7) ? "🎯" : "📝"}
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
                Chapter Test Complete
              </h2>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: computeWeightedAccuracy(quizResult) >= 70 ? "#22c55e" : "#f59e0b" }}>
                {quizResult.correctAnswers}/{quizResult.totalQuestions}
              </div>
              <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                {computeWeightedAccuracy(quizResult)}% weighted accuracy &middot; {formatTime(elapsed)}
              </div>

              <div
                style={{
                  marginTop: 20,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 20px",
                  borderRadius: 14,
                  background: `${MASTERY_COLORS[masteryRecord.level]}15`,
                  border: `1px solid ${MASTERY_COLORS[masteryRecord.level]}40`,
                }}
              >
                <span style={{ fontSize: 20 }}>{MASTERY_ICONS[masteryRecord.level]}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>Your Progress</div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: MASTERY_COLORS[masteryRecord.level] }}>
                    {MASTERY_LABELS[masteryRecord.level]}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>{MASTERY_POINTS[masteryRecord.level]}pts</div>
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={startTest}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                  }}
                >
                  Retake Test
                </button>
                <button
                  onClick={() => navigate(backTo)}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 14,
                    border: "none",
                    background: "#22c55e",
                    color: "#000",
                    fontWeight: 800,
                    fontSize: "0.88rem",
                    cursor: "pointer",
                  }}
                >
                  Back to Chapter
                </button>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: 16 }}>Review Answers</h3>
              {questions.map((q, i) => {
                const ans = answers[i];
                const isMcq = Array.isArray(q.options) && q.options.length >= 2;
                return (
                  <div
                    key={i}
                    style={{
                      marginBottom: 16,
                      padding: "16px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 14,
                      border: `1px solid ${ans?.correct ? "rgba(34,197,94,0.2)" : ans ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, marginBottom: 8 }}>
                      <strong style={{ color: ans?.correct ? "#22c55e" : "#ef4444" }}>Q{i + 1}.</strong> {q.questionText}
                    </div>
                    {isMcq &&
                      q.options?.map((opt, oi) => {
                        const isCorrectOpt = opt.trim().toLowerCase() === (q.answer || "").trim().toLowerCase();
                        const isSelectedOpt = ans?.selected === opt;
                        return (
                          <div
                            key={oi}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 8,
                              marginBottom: 4,
                              fontSize: "0.82rem",
                              background: isCorrectOpt
                                ? "rgba(34,197,94,0.12)"
                                : isSelectedOpt
                                  ? "rgba(239,68,68,0.12)"
                                  : "transparent",
                              color: isCorrectOpt ? "#22c55e" : isSelectedOpt ? "#ef4444" : "rgba(255,255,255,0.6)",
                            }}
                          >
                            ({String.fromCharCode(97 + oi)}) {opt}
                            {isCorrectOpt && " ✓"}
                            {isSelectedOpt && !isCorrectOpt && " ✗"}
                          </div>
                        );
                      })}
                    {!isMcq && ans && (
                      <div style={{ fontSize: "0.82rem", color: ans.correct ? "#22c55e" : "#ef4444" }}>
                        Your answer: {ans.selected} {ans.correct ? "✓" : "✗"}
                      </div>
                    )}
                    {q.answer && (
                      <div style={{ marginTop: 6, fontSize: "0.78rem", color: "rgba(34,197,94,0.8)" }}>
                        Answer: {q.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TestQuestion({
  question,
  idx,
  answer,
  onAnswer,
  onNext,
  isLast,
}: {
  question: CanonicalQuestion;
  idx: number;
  answer?: { selected: string; correct: boolean };
  onAnswer: (selected: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  if (!question) return null;
  const isMcq = Array.isArray(question.options) && question.options.length >= 2;
  const answered = Boolean(answer);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: 18,
        padding: "22px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
        Question {idx + 1} &middot; {question.marks || 1} mark{(question.marks || 1) > 1 ? "s" : ""} &middot;{" "}
        {question.difficulty || "Medium"}
      </div>

      <div style={{ fontSize: "0.92rem", color: "#fff", lineHeight: 1.6, fontWeight: 600, marginBottom: 16 }}>
        {question.questionText}
      </div>

      {isMcq ? (
        <div style={{ display: "grid", gap: 8 }}>
          {question.options!.map((opt, oi) => {
            const isSelected = answer?.selected === opt;
            const isCorrect = answered && opt.trim().toLowerCase() === (question.answer || "").trim().toLowerCase();
            let bg = "rgba(255,255,255,0.03)";
            let borderColor = "rgba(255,255,255,0.06)";
            let textColor = "rgba(255,255,255,0.7)";
            if (answered && isCorrect) {
              bg = "rgba(34,197,94,0.12)";
              borderColor = "rgba(34,197,94,0.3)";
              textColor = "#22c55e";
            } else if (answered && isSelected && !isCorrect) {
              bg = "rgba(239,68,68,0.12)";
              borderColor = "rgba(239,68,68,0.3)";
              textColor = "#ef4444";
            } else if (isSelected) {
              bg = "rgba(99,102,241,0.12)";
              borderColor = "rgba(99,102,241,0.3)";
            }
            return (
              <button
                key={oi}
                onClick={() => !answered && onAnswer(opt)}
                disabled={answered}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `2px solid ${borderColor}`,
                  background: bg,
                  color: textColor,
                  fontWeight: 500,
                  fontSize: "0.85rem",
                  cursor: answered ? "default" : "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ fontWeight: 700, marginRight: 8 }}>{String.fromCharCode(65 + oi)}.</span>
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          {!answered ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onAnswer("correct")}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: "1px solid #22c55e",
                  background: "rgba(34,197,94,0.08)",
                  color: "#22c55e",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                I got it right
              </button>
              <button
                onClick={() => onAnswer("incorrect")}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: "1px solid #ef4444",
                  background: "rgba(239,68,68,0.08)",
                  color: "#ef4444",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                I got it wrong
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                background: answer?.correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                fontSize: "0.82rem",
                color: answer?.correct ? "#22c55e" : "#ef4444",
                fontWeight: 600,
              }}
            >
              Self-marked: {answer?.correct ? "Correct ✓" : "Incorrect ✗"}
            </div>
          )}
          {answered && question.answer && (
            <div style={{ marginTop: 8, fontSize: "0.82rem", color: "rgba(34,197,94,0.8)" }}>
              Answer: {question.answer}
            </div>
          )}
        </div>
      )}

      {answered && (
        <button
          onClick={onNext}
          style={{
            marginTop: 16,
            padding: "10px 28px",
            borderRadius: 14,
            border: "none",
            background: "#22c55e",
            color: "#000",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
          }}
        >
          {isLast ? "Finish Test" : "Next Question →"}
        </button>
      )}
    </div>
  );
}
