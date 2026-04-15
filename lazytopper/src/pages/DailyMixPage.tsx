import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import ReturnContextBar from "../components/ux/ReturnContextBar";

import { generateMultiTopicDailyMix } from "../services/dailyMixGenerator";
import { useDailyMixPlayback, type DailyMixItem } from "../services/dailyMixPlayback";
import {
  loadTopicMasterySnapshot,
  saveTopicMasterySnapshot,
  upsertNodeProgress,
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
const FIRST_SESSION_KEY = "lazytopper.firstDailyMixDone";

function isFirstEverDailyMix(): boolean {
  try { return !localStorage.getItem(FIRST_SESSION_KEY); } catch { return false; }
}

function markFirstDailyMixDone(): void {
  try { localStorage.setItem(FIRST_SESSION_KEY, "1"); } catch {}
}

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

function DailyMixBackNav() {
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = String(navState?.back || "/");
  const backLabel = String(navState?.backLabel || "Back to home");
  return <ReturnContextBar backTo={backTo} backLabel={backLabel} />;
}

export default function DailyMixPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTarget = navState?.back || "/dashboard";
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
  const [showQuickWin, setShowQuickWin] = useState(false);
  const [resumeIndex, setResumeIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isFirstSession] = useState(() => isFirstEverDailyMix());

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
      const quickWin = isFirstSession;
      const finalItems = generateMultiTopicDailyMix({
        grade: Number(grade) || 10,
        subject: safeSubject,
        seedKey: todayKey(),
        topicCount: quickWin ? 2 : MIX_TOPIC_COUNT,
        itemsPerTopic: quickWin ? 2 : 4,
        maxItems: quickWin ? 3 : 10,
        intensity: quickWin ? "light" : "normal",
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

    if (isFirstSession) {
      markFirstDailyMixDone();
      setShowQuickWin(true);
      setShowCelebration(false);
    }

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
  }, [safeSubject, isFirstSession]);

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
        <button type="button" className="lt-pill" onClick={() => navigate(backTarget)} style={{ marginTop: 16 }}>
          {navState?.backLabel || "Back to Dashboard"}
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
      <DailyMixBackNav />
      {showCelebration && !showQuickWin && (
        <div
          style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.5)", zIndex: 9999, animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)", borderRadius: 20, padding: "40px 32px", textAlign: "center",
              maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>Daily Mix Complete!</h2>
            <p style={{ opacity: 0.7, marginTop: 8, fontSize: 15 }}>
              {streakDays} day streak — keep it going!
            </p>
            {currentBadge && (
              <div style={{ marginTop: 12, padding: "8px 16px", background: "rgba(59,130,246,0.1)", borderRadius: 12, fontSize: 14, fontWeight: 700, color: "#60a5fa" }}>
                {currentBadge.description}
              </div>
            )}
          </div>
        </div>
      )}

      {showQuickWin && (
        <div
          style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.85)", zIndex: 9999, padding: 20,
          }}
          onClick={() => setShowQuickWin(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: "#1a1a2e", borderRadius: 24, padding: "36px 28px", textAlign: "center",
            maxWidth: 380, width: "100%", border: "1px solid rgba(34,197,94,0.3)",
            boxShadow: "0 0 60px rgba(34,197,94,0.15)",
          }}>
            <div style={{ fontSize: 64, marginBottom: 8, animation: "bounceIn 0.5s ease" }}>🏅</div>
            <h2 style={{ fontWeight: 900, fontSize: 22, margin: "0 0 6px", color: "#22c55e" }}>Amazing first session!</h2>
            <p style={{ opacity: 0.7, fontSize: 14, lineHeight: 1.6, margin: "0 0 20px" }}>
              You just completed your first Daily Mix. You're already building momentum!
            </p>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>What's next?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <button onClick={() => { setShowQuickWin(false); navigate("/exam-simulation"); }} style={{
                padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(168,85,247,0.3)",
                background: "rgba(168,85,247,0.1)", color: "#a855f7", fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              }}>📝 Try a Full Exam Simulation</button>
              <button onClick={() => { setShowQuickWin(false); navigate(`/practice/${grade || "10"}/${safeSubject}`, { state: { back: "/dashboard" } }); }} style={{
                padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(59,130,246,0.3)",
                background: "rgba(59,130,246,0.1)", color: "#3b82f6", fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              }}>✏️ Practice a Topic</button>
              <button onClick={() => { setShowQuickWin(false); navigate("/dashboard"); }} style={{
                padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              }}>📊 Back to Dashboard</button>
            </div>
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
            background: streakDays > 0 ? "rgba(249,115,22,0.1)" : "var(--bg-card)",
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
        <div style={{ height: 8, background: "var(--bg-card-border)", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              height: "100%", width: `${progressPct}%`,
              background: completed ? "#22c55e" : "#3b82f6",
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
              border: i === playback.currentIndex ? "2px solid #3b82f6" : "1px solid var(--bg-card-border)",
              background: questionStates[i]?.submitted
                ? questionStates[i]?.correct === false ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)"
                : i === playback.currentIndex ? "rgba(59,130,246,0.1)" : "var(--bg-card)",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
              color: i === playback.currentIndex ? "#3b82f6" : "var(--text-muted)",
            }}
          >
            {questionStates[i]?.submitted ? (questionStates[i]?.correct === false ? "✗" : "✓") : i + 1}
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 18, border: "1px solid var(--bg-card-border)", borderRadius: 16, padding: 20,
          background: "var(--bg-card)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
          <span
            style={{
              fontSize: 11, fontWeight: 800, padding: "2px 10px", borderRadius: 999,
              background: isQuestionItem ? (difficultyColors[itemDifficulty] || "var(--text-muted)") : (currentItem?.type === "video" ? "#ff9600" : "#0ea5e9"),
              color: "var(--text)",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}
          >
            {isQuestionItem ? itemDifficulty : itemTypeLabel}
          </span>
          {itemTopic && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 999, border: "1px solid var(--bg-card-border)", color: "var(--text-muted)" }}>
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
                width: "100%", padding: 12, border: "1px solid var(--bg-card-border)", borderRadius: 10,
                fontSize: 14, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                background: "var(--bg-card)", color: "var(--text)",
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
                  background: qs?.studentAnswer?.trim() ? "#3b82f6" : "var(--bg-card)",
                  color: "var(--text)", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14,
                  cursor: qs?.studentAnswer?.trim() ? "pointer" : "default",
                }}
              >
                Submit (Ctrl+Enter)
              </button>
              <button
                type="button"
                onClick={() => handleSkip(playback.currentIndex)}
                style={{
                  padding: "10px 20px", background: "var(--bg-card-border)", color: "var(--text-muted)",
                  border: "1px solid var(--bg-card-border)", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
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
                padding: "10px 24px", background: "#22c55e", color: "var(--text)",
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
              background: qs.correct === false ? "rgba(239,68,68,0.06)" : qs.correct === true ? "rgba(34,197,94,0.06)" : "var(--bg-card)",
              border: `1px solid ${qs.correct === false ? "rgba(239,68,68,0.2)" : qs.correct === true ? "rgba(34,197,94,0.2)" : "var(--bg-card-border)"}`,
            }}
          >
            {qs.feedbackLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 16, height: 16, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 14, opacity: 0.7 }}>Getting feedback...</span>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--text-muted)" }}>
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
            padding: "8px 20px", border: "1px solid var(--bg-card-border)", borderRadius: 10, background: "var(--bg-card)",
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
            style={{ padding: "8px 20px", border: "1px solid var(--bg-card-border)", borderRadius: 10, background: "var(--bg-card)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Next →
          </button>
        ) : completed ? (
          <button
            type="button"
            onClick={() => navigate(backTarget)}
            style={{ padding: "8px 24px", background: "#22c55e", color: "var(--text)", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            {navState?.backLabel ? `Done — ${navState.backLabel}` : "Done — Back to Dashboard"}
          </button>
        ) : null}
      </div>

      {completed && !showCelebration && (
        <div style={{ marginTop: 20, padding: 20, background: "rgba(34,197,94,0.06)", borderRadius: 16, textAlign: "center", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div style={{ fontSize: 32 }}>🎉</div>
          <div style={{ fontWeight: 900, fontSize: 18, marginTop: 4 }}>Daily Mix Complete!</div>
          <div style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>
            {streakDays} day streak
            {currentBadge ? ` • ${currentBadge.name}` : ""}
          </div>
          <div style={{ opacity: 0.5, fontSize: 12, marginTop: 8 }}>Come back tomorrow to keep your streak alive!</div>
          <button
            type="button"
            onClick={() => navigate("/weak-area-practice", { state: { back: `/daily-mix/${grade || "10"}/${safeSubject}`, backLabel: "Back to Daily Mix" } })}
            style={{
              marginTop: 12,
              padding: "10px 24px",
              borderRadius: 12,
              border: "none",
              background: "#ff9600",
              color: "var(--text)",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 3px 0 #cc7a00",
            }}
          >
            Fix My Weak Areas
          </button>
        </div>
      )}

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button
          type="button"
          onClick={() => navigate(backTarget)}
          style={{ padding: "8px 20px", background: "transparent", border: "1px solid var(--bg-card-border)", borderRadius: 10, fontWeight: 600, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}
        >
          {navState?.backLabel || "Back to Dashboard"}
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
