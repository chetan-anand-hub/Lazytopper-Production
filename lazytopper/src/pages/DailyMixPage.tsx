import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { getHighlyProbableQuestions } from "../data/highlyProbableQuestions";
import type { HPQSubject, HPQTopicBucket } from "../data/highlyProbableQuestions";
import { class10TopicRegistry } from "../data/class10TopicRegistry";
import {
  loadTopicMasterySnapshot,
  type TopicHubMasterySnapshot,
} from "../services/topicHubMastery";
import { callMentor } from "../ai/aiClient";
import { normalizeTopicKey } from "../utils/topicResolver";

type RouteParams = { grade?: string; subject?: string };

interface DailyMixQuestion {
  id: string;
  topic: string;
  topicKey: string;
  stem: string;
  difficulty: string;
  marks: number;
  expectedTime: number;
  answer?: string;
  explanation?: string;
}

interface QuestionState {
  studentAnswer: string;
  submitted: boolean;
  feedback: string | null;
  feedbackLoading: boolean;
  correct: boolean | null;
}

const DAILY_MIX_STORAGE_KEY = "lazytopper.dailyMix.v1";
const STREAK_STORAGE_KEY = "lazytopper.dailyMix.streak.v1";
const MIX_SIZE = 6;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeSubject(raw: string): "Maths" | "Science" {
  return String(raw || "").toLowerCase().includes("science") ? "Science" : "Maths";
}

function seededHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function computeMasteryScore(snap: TopicHubMasterySnapshot): number {
  const nodes = Object.values(snap.nodes);
  if (!nodes.length) return 0;
  const stateScores: Record<string, number> = {
    unseen: 0,
    learning: 0.2,
    needs_practice: 0.4,
    checkpoint_passed: 0.7,
    mastered: 1.0,
  };
  const total = nodes.reduce((sum, n) => sum + (stateScores[n.state] ?? 0), 0);
  return total / nodes.length;
}

function generateMasteryWeightedMix(
  subject: "Maths" | "Science",
  day: string
): DailyMixQuestion[] {
  const topicWeights: { topicKey: string; topicName: string; weight: number }[] = [];

  for (const reg of class10TopicRegistry) {
    const snap = loadTopicMasterySnapshot(normalizeTopicKey(reg.topicKey) || reg.topicKey);
    const mastery = computeMasteryScore(snap);
    const weight = Math.max(0.1, 1 - mastery);
    topicWeights.push({ topicKey: reg.topicKey, topicName: reg.topicName, weight });
  }

  const subjectBuckets = getHighlyProbableQuestions(subject as HPQSubject);
  const bucketMap = new Map<string, HPQTopicBucket>();
  for (const b of subjectBuckets) {
    bucketMap.set(normalizeTopicKey(b.topic), b);
  }

  const totalWeight = topicWeights.reduce((s, t) => s + t.weight, 0);
  const seed = seededHash(`${day}|${subject}`);
  const questions: DailyMixQuestion[] = [];
  const topicsUsed = new Set<string>();

  const shuffledTopics = seededShuffle(topicWeights, seed);

  for (const tw of shuffledTopics) {
    if (questions.length >= MIX_SIZE) break;

    const targetCount = Math.max(1, Math.round((tw.weight / totalWeight) * MIX_SIZE));
    const bucket = bucketMap.get(normalizeTopicKey(tw.topicKey));
    if (!bucket?.questions?.length) continue;

    const shuffled = seededShuffle(
      bucket.questions,
      seededHash(`${day}|${tw.topicKey}`)
    );

    let added = 0;
    for (const q of shuffled) {
      if (questions.length >= MIX_SIZE) break;
      if (added >= targetCount && topicsUsed.size < 3) break;

      const stem = String(q.question || "").trim();
      if (!stem) continue;

      const marks = Number.isFinite(q.marks) ? q.marks! : 2;
      questions.push({
        id: q.id,
        topic: tw.topicName,
        topicKey: normalizeTopicKey(tw.topicKey) || tw.topicKey,
        stem,
        difficulty: q.difficulty || "Medium",
        marks,
        expectedTime: marks <= 1 ? 1 : marks <= 2 ? 2 : marks <= 3 ? 3 : 5,
        answer: q.answer,
        explanation: q.explanation,
      });
      topicsUsed.add(tw.topicKey);
      added++;
    }
  }

  return questions.slice(0, MIX_SIZE);
}

interface StreakData {
  currentStreak: number;
  lastCompletedDate: string;
  completedDates: string[];
}

function loadStreak(): StreakData {
  try {
    const raw = localStorage.getItem(STREAK_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { currentStreak: 0, lastCompletedDate: "", completedDates: [] };
}

function saveStreak(data: StreakData): void {
  try {
    localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function updateStreak(streak: StreakData, completedDate: string): StreakData {
  if (streak.completedDates.includes(completedDate)) return streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const newStreak =
    streak.lastCompletedDate === yesterdayStr
      ? streak.currentStreak + 1
      : streak.lastCompletedDate === completedDate
        ? streak.currentStreak
        : 1;

  return {
    currentStreak: newStreak,
    lastCompletedDate: completedDate,
    completedDates: [...streak.completedDates, completedDate].slice(-90),
  };
}

interface SavedMixState {
  date: string;
  subject: string;
  questions: DailyMixQuestion[];
  questionStates: QuestionState[];
  completed: boolean;
}

function loadSavedMix(subject: string): SavedMixState | null {
  try {
    const raw = localStorage.getItem(`${DAILY_MIX_STORAGE_KEY}.${subject}`);
    if (!raw) return null;
    const parsed: SavedMixState = JSON.parse(raw);
    if (parsed.date === todayKey() && parsed.subject === subject) return parsed;
  } catch {}
  return null;
}

function saveMixState(state: SavedMixState): void {
  try {
    localStorage.setItem(`${DAILY_MIX_STORAGE_KEY}.${state.subject}`, JSON.stringify(state));
  } catch {}
}

const difficultyColors: Record<string, string> = {
  Easy: "#22c55e",
  Medium: "#f59e0b",
  Hard: "#ef4444",
};

const streakMilestones = [
  { days: 3, label: "3-Day Spark", emoji: "🔥" },
  { days: 7, label: "No Zero Week", emoji: "⚡" },
  { days: 14, label: "Streak Beast", emoji: "💪" },
  { days: 30, label: "Board Warrior", emoji: "🏆" },
  { days: 60, label: "Consistency Legend", emoji: "💎" },
];

export default function DailyMixPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { grade, subject: subjectParam } = useParams<RouteParams>();
  const safeSubject = useMemo(
    () => normalizeSubject(String(subjectParam || searchParams.get("subject") || "Maths")),
    [subjectParam, searchParams]
  );

  const [questions, setQuestions] = useState<DailyMixQuestion[]>([]);
  const [questionStates, setQuestionStates] = useState<QuestionState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [streak, setStreak] = useState<StreakData>(loadStreak);
  const [showCelebration, setShowCelebration] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = loadSavedMix(safeSubject);
    if (saved) {
      setQuestions(saved.questions);
      setQuestionStates(saved.questionStates);
      setCompleted(saved.completed);
      const firstUnanswered = saved.questionStates.findIndex((s) => !s.submitted);
      setCurrentIdx(firstUnanswered >= 0 ? firstUnanswered : saved.questions.length - 1);
    } else {
      const mix = generateMasteryWeightedMix(safeSubject, todayKey());
      setQuestions(mix);
      setQuestionStates(mix.map(() => ({
        studentAnswer: "",
        submitted: false,
        feedback: null,
        feedbackLoading: false,
        correct: null,
      })));
      setCurrentIdx(0);
      setCompleted(false);
    }
  }, [safeSubject]);

  useEffect(() => {
    if (!questions.length) return;
    saveMixState({
      date: todayKey(),
      subject: safeSubject,
      questions,
      questionStates,
      completed,
    });
  }, [questions, questionStates, completed, safeSubject]);

  useEffect(() => {
    if (inputRef.current && !questionStates[currentIdx]?.submitted) {
      inputRef.current.focus();
    }
  }, [currentIdx, questionStates]);

  const answeredCount = questionStates.filter((s) => s.submitted).length;
  const progressPct = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const totalTime = questions.reduce((s, q) => s + q.expectedTime, 0);

  const updateState = useCallback(
    (idx: number, patch: Partial<QuestionState>) => {
      setQuestionStates((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], ...patch };
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    async (idx: number) => {
      const q = questions[idx];
      const state = questionStates[idx];
      if (!state || state.submitted || !state.studentAnswer.trim()) return;

      updateState(idx, { submitted: true, feedbackLoading: true });

      try {
        const resp = await callMentor("explain", {
          subject: safeSubject,
          topicKey: q.topicKey,
          questionText: q.stem,
          studentQuestion: `My answer: "${state.studentAnswer}". ${q.answer ? `Model answer: "${q.answer}".` : ""} Give me brief feedback: is my answer correct? What did I miss? Keep it under 3 sentences.`,
        });

        const feedbackText = String(
          resp?.data?.text || resp?.data?.structured?.explanation || "Good attempt! Review the model answer for comparison."
        );

        const isCorrect = q.answer
          ? state.studentAnswer.toLowerCase().includes(q.answer.toLowerCase().slice(0, 20))
          : null;

        updateState(idx, {
          feedback: feedbackText,
          feedbackLoading: false,
          correct: isCorrect,
        });
      } catch {
        const fallback = q.answer
          ? `Model answer: ${q.answer}${q.explanation ? `\n\nExplanation: ${q.explanation}` : ""}`
          : "Good attempt! Check the textbook for the model answer.";
        updateState(idx, {
          feedback: fallback,
          feedbackLoading: false,
          correct: null,
        });
      }

      const newAnswered = questionStates.filter((s, i) => i === idx || s.submitted).length;
      if (newAnswered >= questions.length && !completed) {
        setCompleted(true);
        setShowCelebration(true);
        const updatedStreak = updateStreak(streak, todayKey());
        setStreak(updatedStreak);
        saveStreak(updatedStreak);
        setTimeout(() => setShowCelebration(false), 4000);
      }
    },
    [questions, questionStates, updateState, safeSubject, completed, streak]
  );

  const handleSkip = useCallback(
    (idx: number) => {
      updateState(idx, {
        submitted: true,
        studentAnswer: "(skipped)",
        feedback: questions[idx]?.answer
          ? `Model answer: ${questions[idx].answer}`
          : "Skipped — review this topic later!",
        correct: false,
      });

      const newAnswered = questionStates.filter((s, i) => i === idx || s.submitted).length;
      if (newAnswered >= questions.length && !completed) {
        setCompleted(true);
        setShowCelebration(true);
        const updatedStreak = updateStreak(streak, todayKey());
        setStreak(updatedStreak);
        saveStreak(updatedStreak);
        setTimeout(() => setShowCelebration(false), 4000);
      }
    },
    [questions, questionStates, updateState, completed, streak]
  );

  const currentBadge = streakMilestones
    .filter((m) => streak.currentStreak >= m.days)
    .pop();
  const nextBadge = streakMilestones.find((m) => streak.currentStreak < m.days);

  if (!questions.length) {
    return (
      <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
        <h2 style={{ fontWeight: 900, fontSize: 24 }}>Daily Mix</h2>
        <p style={{ opacity: 0.7, marginTop: 8 }}>
          No questions available for {safeSubject} today. Check back after adding some practice content!
        </p>
        <button type="button" className="lt-pill" onClick={() => navigate("/dashboard")} style={{ marginTop: 16 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const q = questions[currentIdx];
  const qs = questionStates[currentIdx];

  return (
    <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
      {showCelebration && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            zIndex: 9999,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 20,
              padding: "40px 32px",
              textAlign: "center",
              maxWidth: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>Daily Mix Complete!</h2>
            <p style={{ opacity: 0.7, marginTop: 8, fontSize: 15 }}>
              {streak.currentStreak} day streak{streak.currentStreak !== 1 ? "" : ""} — keep it going!
            </p>
            {currentBadge && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 16px",
                  background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {currentBadge.emoji} {currentBadge.label}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 26, margin: 0 }}>Your Daily Mix</h1>
          <p style={{ opacity: 0.65, fontSize: 13, marginTop: 4 }}>
            Class {grade || "10"} {safeSubject} • ~{totalTime} min • {todayKey()}
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            background: streak.currentStreak > 0 ? "linear-gradient(135deg, #fff7ed, #ffedd5)" : "#f1f5f9",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 14,
          }}
        >
          <span>{streak.currentStreak > 0 ? "🔥" : "💤"}</span>
          <span>{streak.currentStreak} day{streak.currentStreak !== 1 ? "s" : ""}</span>
          {nextBadge && (
            <span style={{ opacity: 0.6, fontSize: 11, fontWeight: 500 }}>
              → {nextBadge.days - streak.currentStreak} to {nextBadge.label}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            fontWeight: 600,
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          <span>Progress</span>
          <span>{answeredCount}/{questions.length} answered</span>
        </div>
        <div
          style={{
            height: 8,
            background: "#e2e8f0",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPct}%`,
              background: completed
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #3b82f6, #2563eb)",
              borderRadius: 999,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrentIdx(i)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: i === currentIdx ? "2px solid #2563eb" : "1px solid #e2e8f0",
              background: questionStates[i]?.submitted
                ? questionStates[i]?.correct === false
                  ? "#fef2f2"
                  : "#f0fdf4"
                : i === currentIdx
                  ? "#eff6ff"
                  : "#fff",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              color: i === currentIdx ? "#2563eb" : "#64748b",
            }}
          >
            {questionStates[i]?.submitted ? (questionStates[i]?.correct === false ? "✗" : "✓") : i + 1}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          padding: 20,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: "2px 10px",
              borderRadius: 999,
              background: difficultyColors[q.difficulty] || "#94a3b8",
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {q.difficulty}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              color: "#475569",
            }}
          >
            {q.topic}
          </span>
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            {q.marks} mark{q.marks !== 1 ? "s" : ""} • ~{q.expectedTime} min
          </span>
        </div>

        <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{q.stem}</div>

        {!qs.submitted ? (
          <div style={{ marginTop: 16 }}>
            <textarea
              ref={inputRef}
              value={qs.studentAnswer}
              onChange={(e) => updateState(currentIdx, { studentAnswer: e.target.value })}
              placeholder="Type your answer here..."
              rows={4}
              style={{
                width: "100%",
                padding: 12,
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                fontSize: 14,
                resize: "vertical",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSubmit(currentIdx);
                }
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => handleSubmit(currentIdx)}
                disabled={!qs.studentAnswer.trim()}
                style={{
                  padding: "10px 24px",
                  background: qs.studentAnswer.trim() ? "#2563eb" : "#94a3b8",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: qs.studentAnswer.trim() ? "pointer" : "default",
                }}
              >
                Submit (Ctrl+Enter)
              </button>
              <button
                type="button"
                onClick={() => handleSkip(currentIdx)}
                style={{
                  padding: "10px 20px",
                  background: "#f1f5f9",
                  color: "#64748b",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 12,
              background: qs.correct === false ? "#fef2f2" : qs.correct === true ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${qs.correct === false ? "#fecaca" : qs.correct === true ? "#bbf7d0" : "#e2e8f0"}`,
            }}
          >
            {qs.feedbackLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    border: "2px solid #3b82f6",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: 14, opacity: 0.7 }}>Getting feedback...</span>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#475569" }}>
                  {qs.correct === true ? "✅ Correct!" : qs.correct === false ? "❌ Needs improvement" : "📝 Feedback"}
                </div>
                {qs.studentAnswer !== "(skipped)" && (
                  <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
                    Your answer: <em>{qs.studentAnswer}</em>
                  </div>
                )}
                <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{qs.feedback}</div>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={currentIdx <= 0}
          style={{
            padding: "8px 20px",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            background: "#fff",
            fontWeight: 600,
            fontSize: 13,
            cursor: currentIdx > 0 ? "pointer" : "default",
            opacity: currentIdx > 0 ? 1 : 0.4,
          }}
        >
          ← Previous
        </button>
        {currentIdx < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
            style={{
              padding: "8px 20px",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              background: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Next →
          </button>
        ) : completed ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "8px 24px",
              background: "#22c55e",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Done — Back to Dashboard
          </button>
        ) : null}
      </div>

      {completed && !showCelebration && (
        <div
          style={{
            marginTop: 20,
            padding: 20,
            background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
            borderRadius: 16,
            textAlign: "center",
            border: "1px solid #bbf7d0",
          }}
        >
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4 }}>
            Daily Mix Complete!
          </div>
          <div style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>
            {streak.currentStreak} day streak
            {currentBadge ? ` • ${currentBadge.emoji} ${currentBadge.label}` : ""}
          </div>
          <div style={{ opacity: 0.5, fontSize: 12, marginTop: 8 }}>
            Come back tomorrow to keep your streak alive!
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "8px 20px",
            background: "transparent",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          Back to Dashboard
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
