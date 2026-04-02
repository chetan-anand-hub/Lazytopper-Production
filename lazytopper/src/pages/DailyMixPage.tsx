import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import { generateMultiTopicDailyMix } from "../services/dailyMixGenerator";
import { useDailyMixPlayback, type DailyMixItem } from "../services/dailyMixPlayback";
import {
  loadTopicMasterySnapshot,
  saveTopicMasterySnapshot,
  upsertNodeProgress,
  type TopicHubMasterySnapshot,
} from "../services/topicHubMastery";
import { computeGlobalStreak, getUnlockedBadge, getNextBadge } from "../services/streakService";
import type { StudySessionLog } from "../services/sessionLogger";
import { callMentor } from "../ai/aiClient";
import { normalizeTopicKey } from "../utils/topicResolver";

type RouteParams = { grade?: string; subject?: string };

interface QuestionState {
  studentAnswer: string;
  submitted: boolean;
  feedback: string | null;
  feedbackLoading: boolean;
  correct: boolean | null;
}

const DAILY_MIX_STORAGE_KEY = "lazytopper.dailyMix.v1";
const SESSION_LOG_KEY = "lazytopper.sessionLogs.v1";
const MIX_TOPIC_COUNT = 3;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeSubject(raw: string): "Maths" | "Science" {
  return String(raw || "").toLowerCase().includes("science") ? "Science" : "Maths";
}



function loadSessionLogs(): StudySessionLog[] {
  try {
    const raw = localStorage.getItem(SESSION_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveSessionLog(log: StudySessionLog): void {
  try {
    const logs = loadSessionLogs();
    logs.push(log);
    const trimmed = logs.slice(-200);
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(trimmed));
  } catch {}
}

interface SavedMixState {
  date: string;
  subject: string;
  items: DailyMixItem[];
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

function persistMasteryForQuestion(
  topicKey: string,
  questionId: string,
  correct: boolean | null
): void {
  const nk = normalizeTopicKey(topicKey) || topicKey;
  const snap = loadTopicMasterySnapshot(nk);
  const score = correct === true ? 100 : correct === false ? 20 : 50;
  const status = correct === true ? "correct" : correct === false ? "incorrect" : "partially_correct";
  const updated = upsertNodeProgress(snap, questionId, { score, status });
  saveTopicMasterySnapshot(updated, nk);
}

const difficultyColors: Record<string, string> = {
  Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444",
};

export default function DailyMixPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { grade, subject: subjectParam } = useParams<RouteParams>();
  const safeSubject = useMemo(
    () => normalizeSubject(String(subjectParam || searchParams.get("subject") || "Maths")),
    [subjectParam, searchParams]
  );

  const [items, setItems] = useState<DailyMixItem[]>([]);
  const [questionStates, setQuestionStates] = useState<QuestionState[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [streakDays, setStreakDays] = useState(() => computeGlobalStreak(loadSessionLogs()));
  const currentBadge = useMemo(() => getUnlockedBadge(streakDays), [streakDays]);
  const nextBadge = useMemo(() => getNextBadge(streakDays), [streakDays]);

  const playback = useDailyMixPlayback(items);

  useEffect(() => {
    if (resumeIndex !== null && items.length > 0) {
      playback.seek(resumeIndex);
      setResumeIndex(null);
    }
  }, [resumeIndex, items.length, playback]);

  useEffect(() => {
    const saved = loadSavedMix(safeSubject);
    if (saved) {
      setItems(saved.items);
      setQuestionStates(saved.questionStates);
      setCompleted(saved.completed);
      const firstUnanswered = saved.questionStates.findIndex((s) => !s.submitted);
      if (firstUnanswered >= 0) setResumeIndex(firstUnanswered);
    } else {
      const finalItems = generateMultiTopicDailyMix({
        grade: Number(grade) || 10,
        subject: safeSubject,
        seedKey: todayKey(),
        topicCount: MIX_TOPIC_COUNT,
        itemsPerTopic: 4,
        maxItems: 10,
        intensity: "normal",
      });
      setItems(finalItems);
      setQuestionStates(
        finalItems.map(() => ({
          studentAnswer: "",
          submitted: false,
          feedback: null,
          feedbackLoading: false,
          correct: null,
        }))
      );
      setCompleted(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeSubject]);

  useEffect(() => {
    if (!items.length) return;
    saveMixState({ date: todayKey(), subject: safeSubject, items, questionStates, completed });
  }, [items, questionStates, completed, safeSubject]);

  useEffect(() => {
    if (inputRef.current && !questionStates[playback.currentIndex]?.submitted) {
      inputRef.current.focus();
    }
  }, [playback.currentIndex, questionStates]);

  const answeredCount = questionStates.filter((s) => s.submitted).length;
  const progressPct = items.length ? Math.round((answeredCount / items.length) * 100) : 0;

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

  const handleMixComplete = useCallback(() => {
    setCompleted(true);
    setShowCelebration(true);

    const log: StudySessionLog = {
      id: `dailymix-${todayKey()}-${safeSubject}`,
      userId: "local",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      platform: "web",
      status: "completed",
      activities: [{
        timestamp: new Date().toISOString(),
        type: "dailyMix",
        topicKey: safeSubject,
        durationMinutes: 5,
      }],
    };
    saveSessionLog(log);

    const updatedLogs = loadSessionLogs();
    setStreakDays(computeGlobalStreak(updatedLogs));

    setTimeout(() => setShowCelebration(false), 4000);
  }, [safeSubject]);

  const handleSubmit = useCallback(
    async (idx: number) => {
      const item = items[idx];
      const state = questionStates[idx];
      if (!state || state.submitted || !state.studentAnswer.trim()) return;

      const topicKey = String(item.payload?.topicKey || item.payload?.topic || "");
      const stem = String(item.payload?.stem || item.title || "");

      updateState(idx, { submitted: true, feedbackLoading: true });

      let isCorrect: boolean | null = null;

      try {
        const resp = await callMentor("explain", {
          subject: safeSubject,
          topicKey,
          questionText: stem,
          studentQuestion: `My answer: "${state.studentAnswer}". Give me brief feedback: is my answer correct? What did I miss? Keep it under 3 sentences.`,
        });

        const feedbackText = String(
          resp?.data?.text || resp?.data?.structured?.explanation || "Good attempt! Review the model answer for comparison."
        );

        isCorrect = feedbackText.toLowerCase().includes("correct") && !feedbackText.toLowerCase().includes("incorrect")
          ? true
          : feedbackText.toLowerCase().includes("incorrect") || feedbackText.toLowerCase().includes("wrong")
            ? false
            : null;

        updateState(idx, { feedback: feedbackText, feedbackLoading: false, correct: isCorrect });
      } catch {
        updateState(idx, {
          feedback: "Good attempt! Check the textbook for the model answer.",
          feedbackLoading: false,
          correct: null,
        });
      }

      persistMasteryForQuestion(topicKey, item.id, isCorrect);

      const newAnswered = questionStates.filter((s, i) => i === idx || s.submitted).length;
      if (newAnswered >= items.length && !completed) {
        handleMixComplete();
      }
    },
    [items, questionStates, updateState, safeSubject, completed, handleMixComplete]
  );

  const handleSkip = useCallback(
    (idx: number) => {
      const item = items[idx];
      const topicKey = String(item.payload?.topicKey || item.payload?.topic || "");

      updateState(idx, {
        submitted: true,
        studentAnswer: "(skipped)",
        feedback: "Skipped — review this topic later!",
        correct: false,
      });

      persistMasteryForQuestion(topicKey, item.id, false);

      const newAnswered = questionStates.filter((s, i) => i === idx || s.submitted).length;
      if (newAnswered >= items.length && !completed) {
        handleMixComplete();
      }
    },
    [items, questionStates, updateState, completed, handleMixComplete]
  );

  const handleMarkRead = useCallback(
    (idx: number) => {
      updateState(idx, {
        submitted: true,
        studentAnswer: "(read)",
        feedback: "Great! You reviewed this content.",
        correct: true,
        feedbackLoading: false,
      });

      const newAnswered = questionStates.filter((s, i) => i === idx || s.submitted).length;
      if (newAnswered >= items.length && !completed) {
        handleMixComplete();
      }
    },
    [questionStates, items, updateState, completed, handleMixComplete]
  );

  if (!items.length) {
    return (
      <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
        <h2 style={{ fontWeight: 900, fontSize: 24 }}>Daily Mix</h2>
        <p style={{ opacity: 0.7, marginTop: 8 }}>
          No questions available for {safeSubject} today.
        </p>
        <button type="button" className="lt-pill" onClick={() => navigate("/dashboard")} style={{ marginTop: 16 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentItem = playback.current;
  const qs = questionStates[playback.currentIndex];
  const isQuestionItem = currentItem?.type === "question";
  const itemTitle = currentItem?.title ?? "Question";
  const itemStem = String(currentItem?.payload?.stem || currentItem?.description || "");
  const itemTopic = String(currentItem?.payload?.topic || "");
  const itemDifficulty = isQuestionItem ? (String(currentItem?.description || "").split("|")[0]?.trim() || "Medium") : "";
  const itemMarks = isQuestionItem ? (Number(currentItem?.description?.match(/(\d+)\s*mark/)?.[1]) || 2) : 0;
  const itemExpectedMins = isQuestionItem ? (itemMarks <= 1 ? 1 : itemMarks <= 3 ? 2 : 4) : 1;
  const itemTypeLabel = currentItem?.type === "video" ? "Concept" : currentItem?.type === "revision" ? "Revision" : "Practice";

  return (
    <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
      {showCelebration && (
        <div
          style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.5)", zIndex: 9999, animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              background: "white", borderRadius: 20, padding: "40px 32px", textAlign: "center",
              maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>Daily Mix Complete!</h2>
            <p style={{ opacity: 0.7, marginTop: 8, fontSize: 15 }}>
              {streakDays} day streak — keep it going!
            </p>
            {currentBadge && (
              <div style={{ marginTop: 12, padding: "8px 16px", background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", borderRadius: 12, fontSize: 14, fontWeight: 700 }}>
                {currentBadge.description}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 26, margin: 0 }}>Your Daily Mix</h1>
          <p style={{ opacity: 0.65, fontSize: 13, marginTop: 4 }}>
            Class {grade || "10"} {safeSubject} • {todayKey()}
          </p>
        </div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 14px",
            background: streakDays > 0 ? "linear-gradient(135deg, #fff7ed, #ffedd5)" : "#f1f5f9",
            borderRadius: 999, fontWeight: 800, fontSize: 14,
          }}
        >
          <span>{streakDays > 0 ? "🔥" : "💤"}</span>
          <span>{streakDays} day{streakDays !== 1 ? "s" : ""}</span>
          {nextBadge && (
            <span style={{ opacity: 0.6, fontSize: 11, fontWeight: 500 }}>
              → {nextBadge.requiredDays - streakDays} to {nextBadge.name}
            </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 4 }}>
          <span>Progress</span>
          <span>{answeredCount}/{items.length} answered</span>
        </div>
        <div style={{ height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              height: "100%", width: `${progressPct}%`,
              background: completed ? "linear-gradient(90deg, #22c55e, #16a34a)" : "linear-gradient(90deg, #3b82f6, #2563eb)",
              borderRadius: 999, transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 14, flexWrap: "wrap" }}>
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => playback.seek(i)}
            style={{
              width: 36, height: 36, borderRadius: 10,
              border: i === playback.currentIndex ? "2px solid #2563eb" : "1px solid #e2e8f0",
              background: questionStates[i]?.submitted
                ? questionStates[i]?.correct === false ? "#fef2f2" : "#f0fdf4"
                : i === playback.currentIndex ? "#eff6ff" : "#fff",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              color: i === playback.currentIndex ? "#2563eb" : "#64748b",
            }}
          >
            {questionStates[i]?.submitted ? (questionStates[i]?.correct === false ? "✗" : "✓") : i + 1}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 18, border: "1px solid #e2e8f0", borderRadius: 16, padding: 20,
          background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11, fontWeight: 800, padding: "2px 10px", borderRadius: 999,
              background: isQuestionItem ? (difficultyColors[itemDifficulty] || "#94a3b8") : (currentItem?.type === "video" ? "#8b5cf6" : "#0ea5e9"),
              color: "#fff",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}
          >
            {isQuestionItem ? itemDifficulty : itemTypeLabel}
          </span>
          {itemTopic && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, border: "1px solid #e2e8f0", color: "#475569" }}>
              {itemTopic}
            </span>
          )}
          <span style={{ fontSize: 11, opacity: 0.6 }}>
            {isQuestionItem ? `${itemMarks} mark${itemMarks !== 1 ? "s" : ""} • ` : ""}~{itemExpectedMins} min • Item {playback.currentIndex + 1}/{items.length}
          </span>
        </div>

        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{itemTitle}</div>
        {itemStem && <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{itemStem}</div>}

        {!qs?.submitted && isQuestionItem ? (
          <div style={{ marginTop: 16 }}>
            <textarea
              ref={inputRef}
              value={qs?.studentAnswer || ""}
              onChange={(e) => updateState(playback.currentIndex, { studentAnswer: e.target.value })}
              placeholder="Type your answer here..."
              rows={4}
              style={{
                width: "100%", padding: 12, border: "1px solid #cbd5e1", borderRadius: 10,
                fontSize: 14, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit(playback.currentIndex);
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => handleSubmit(playback.currentIndex)}
                disabled={!qs?.studentAnswer?.trim()}
                style={{
                  padding: "10px 24px",
                  background: qs?.studentAnswer?.trim() ? "#2563eb" : "#94a3b8",
                  color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14,
                  cursor: qs?.studentAnswer?.trim() ? "pointer" : "default",
                }}
              >
                Submit (Ctrl+Enter)
              </button>
              <button
                type="button"
                onClick={() => handleSkip(playback.currentIndex)}
                style={{
                  padding: "10px 20px", background: "#f1f5f9", color: "#64748b",
                  border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}
              >
                Skip
              </button>
            </div>
          </div>
        ) : !qs?.submitted && !isQuestionItem ? (
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => handleMarkRead(playback.currentIndex)}
              style={{
                padding: "10px 24px", background: "#22c55e", color: "#fff",
                border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}
            >
              Got it — Next
            </button>
          </div>
        ) : (
          <div
            style={{
              marginTop: 16, padding: 16, borderRadius: 12,
              background: qs.correct === false ? "#fef2f2" : qs.correct === true ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${qs.correct === false ? "#fecaca" : qs.correct === true ? "#bbf7d0" : "#e2e8f0"}`,
            }}
          >
            {qs.feedbackLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 16, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 14, opacity: 0.7 }}>Getting feedback...</span>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#475569" }}>
                  {qs.studentAnswer === "(read)" ? "✅ Reviewed" : qs.correct === true ? "✅ Correct!" : qs.correct === false ? "❌ Needs improvement" : "📝 Feedback"}
                </div>
                {qs.studentAnswer !== "(skipped)" && qs.studentAnswer !== "(read)" && (
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
          onClick={() => playback.prev()}
          disabled={!playback.canPrev}
          style={{
            padding: "8px 20px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff",
            fontWeight: 600, fontSize: 13, cursor: playback.canPrev ? "pointer" : "default",
            opacity: playback.canPrev ? 1 : 0.4,
          }}
        >
          ← Previous
        </button>
        {playback.canNext ? (
          <button
            type="button"
            onClick={() => playback.next()}
            style={{ padding: "8px 20px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Next →
          </button>
        ) : completed ? (
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            style={{ padding: "8px 24px", background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Done — Back to Dashboard
          </button>
        ) : null}
      </div>

      {completed && !showCelebration && (
        <div style={{ marginTop: 20, padding: 20, background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)", borderRadius: 16, textAlign: "center", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4 }}>Daily Mix Complete!</div>
          <div style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>
            {streakDays} day streak
            {currentBadge ? ` • ${currentBadge.name}` : ""}
          </div>
          <div style={{ opacity: 0.5, fontSize: 12, marginTop: 8 }}>Come back tomorrow to keep your streak alive!</div>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          style={{ padding: "8px 20px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 600, fontSize: 13, color: "#64748b", cursor: "pointer" }}
        >
          Back to Dashboard
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
