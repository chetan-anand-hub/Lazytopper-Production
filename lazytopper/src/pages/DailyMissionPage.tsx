import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { useAuth } from "../context/AuthContext";
import { callMentor } from "../ai/aiClient";
import { normalizeTopicKey } from "../utils/topicResolver";
import {
  loadTopicMasterySnapshot,
  saveTopicMasterySnapshot,
  upsertNodeProgress,
} from "../services/topicHubMastery";
import { computeGlobalStreak, getUnlockedBadge } from "../services/streakService";
import type { StudySessionLog } from "../services/sessionLogger";
import {
  generateDailyMission,
  saveMissionProgress,
  loadMissionProgress,
  computeMissionXP,
  logMissionSession,
  persistMissionXP,
  type DailyMission,
  type MissionProgress,
  type MissionAnswer,
  type SegmentType,
} from "../services/dailyMissionService";

type RouteParams = { grade?: string; subject?: string };

const SESSION_LOG_KEY = "lazytopper.sessionLogs.v1";

function loadSessionLogs(): StudySessionLog[] {
  try {
    const raw = localStorage.getItem(SESSION_LOG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeSubject(raw: string): "Maths" | "Science" {
  return String(raw || "").toLowerCase().includes("science") ? "Science" : "Maths";
}

function persistMasteryForQuestion(topicKey: string, questionId: string, correct: boolean | null): void {
  const nk = normalizeTopicKey(topicKey) || topicKey;
  const snap = loadTopicMasterySnapshot(nk);
  const score = correct === true ? 100 : correct === false ? 20 : 50;
  const status = correct === true ? "correct" : correct === false ? "incorrect" : "partially_correct";
  const updated = upsertNodeProgress(snap, questionId, { score, status });
  saveTopicMasterySnapshot(updated, nk);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SEGMENT_ICONS: Record<SegmentType, string> = {
  revision: "🔄",
  learning: "📚",
  practice: "💪",
  exam: "🎯",
  mock: "📝",
  weakdrill: "🔧",
};

function MissionBackNav() {
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = String(navState?.back || "/");
  const backLabel = String(navState?.backLabel || "Back to home");
  return <ReturnContextBar backTo={backTo} backLabel={backLabel} />;
}

export default function DailyMissionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTarget = navState?.back || "/dashboard";
  const { user } = useAuth();
  const { grade, subject: subjectParam } = useParams<RouteParams>();
  const safeSubject = useMemo(() => normalizeSubject(String(subjectParam || "Maths")), [subjectParam]);
  const gradeNum = Number(grade) || 10;

  const [mission, setMission] = useState<DailyMission | null>(null);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const [answers, setAnswers] = useState<MissionAnswer[]>([]);
  const [completedSegments, setCompletedSegments] = useState<number[]>([]);
  const [completed, setCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSegmentTransition, setShowSegmentTransition] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [extendedMode, setExtendedMode] = useState(() => {
    const day = new Date().getDay();
    return day === 0 || day === 6;
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const streakDays = useMemo(() => computeGlobalStreak(loadSessionLogs()), [completed]);
  const currentBadge = useMemo(() => getUnlockedBadge(streakDays), [streakDays]);

  useEffect(() => {
    const saved = loadMissionProgress(safeSubject);
    const gen = generateDailyMission(gradeNum, safeSubject, user?.uid, { extended: extendedMode });
    setMission(gen);

    if (saved && saved.date === todayKey()) {
      setSegmentIndex(saved.segmentIndex);
      setItemIndex(saved.itemIndex);
      setAnswers(saved.answers);
      setCompletedSegments(saved.completedSegments);
      setCompleted(saved.completed);
      setElapsedSeconds(saved.elapsedSeconds);
      setStartedAt(saved.startedAt);
    } else {
      const allAnswers: MissionAnswer[] = [];
      for (let si = 0; si < gen.segments.length; si++) {
        for (let ii = 0; ii < gen.segments[si].items.length; ii++) {
          allAnswers.push({
            segmentIndex: si,
            itemIndex: ii,
            studentAnswer: "",
            feedback: null,
            correct: null,
            submitted: false,
          });
        }
      }
      setAnswers(allAnswers);
      setSegmentIndex(0);
      setItemIndex(0);
      setCompletedSegments([]);
      setCompleted(false);
      setStartedAt(Date.now());
      setElapsedSeconds(0);
    }
  }, [safeSubject, gradeNum, user?.uid, extendedMode]);

  useEffect(() => {
    if (completed) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [completed]);

  useEffect(() => {
    if (!mission || answers.length === 0) return;
    const progress: MissionProgress = {
      date: todayKey(),
      subject: safeSubject,
      segmentIndex,
      itemIndex,
      answers,
      completedSegments,
      startedAt,
      elapsedSeconds,
      completed,
    };
    saveMissionProgress(safeSubject, progress);
  }, [mission, segmentIndex, itemIndex, answers, completedSegments, completed, elapsedSeconds, safeSubject, startedAt]);

  const currentSegment = mission?.segments[segmentIndex] ?? null;

  const getAnswerIndex = useCallback((si: number, ii: number): number => {
    if (!mission) return -1;
    let idx = 0;
    for (let s = 0; s < si; s++) {
      idx += mission.segments[s].items.length;
    }
    return idx + ii;
  }, [mission]);

  const currentAnswer = useMemo(() => {
    const idx = getAnswerIndex(segmentIndex, itemIndex);
    return idx >= 0 ? answers[idx] : null;
  }, [getAnswerIndex, segmentIndex, itemIndex, answers]);

  const currentItem = currentSegment?.items[itemIndex] ?? null;
  const isQuestionItem = currentItem?.type === "question";

  const segmentAnswered = useMemo(() => {
    if (!mission || !currentSegment) return 0;
    let count = 0;
    for (let i = 0; i < currentSegment.items.length; i++) {
      const idx = getAnswerIndex(segmentIndex, i);
      if (idx >= 0 && answers[idx]?.submitted) count++;
    }
    return count;
  }, [mission, currentSegment, segmentIndex, answers, getAnswerIndex]);

  const totalAnswered = useMemo(() => answers.filter((a) => a.submitted).length, [answers]);
  const totalItems = useMemo(() => (mission ? mission.segments.reduce((sum, s) => sum + s.items.length, 0) : 0), [mission]);
  const overallProgress = totalItems > 0 ? Math.round((totalAnswered / totalItems) * 100) : 0;

  const updateAnswer = useCallback((si: number, ii: number, patch: Partial<MissionAnswer>) => {
    const idx = getAnswerIndex(si, ii);
    if (idx < 0) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, [getAnswerIndex]);

  const advanceToNext = useCallback(() => {
    if (!mission) return;
    const seg = mission.segments[segmentIndex];
    if (itemIndex < seg.items.length - 1) {
      setItemIndex(itemIndex + 1);
    } else {
      const newCompleted = completedSegments.includes(segmentIndex)
        ? completedSegments
        : [...completedSegments, segmentIndex];
      setCompletedSegments(newCompleted);

      const partialProgress: MissionProgress = {
        date: todayKey(),
        subject: safeSubject,
        segmentIndex,
        itemIndex,
        answers,
        completedSegments: newCompleted,
        startedAt,
        elapsedSeconds,
        completed: false,
      };
      if (newCompleted.length >= 2) {
        persistMissionXP(safeSubject, partialProgress);
      }

      if (segmentIndex < mission.segments.length - 1) {
        setShowSegmentTransition(true);
        setTimeout(() => {
          setSegmentIndex(segmentIndex + 1);
          setItemIndex(0);
          setShowSegmentTransition(false);
        }, 1500);
      } else {
        setCompleted(true);
        setShowCelebration(true);
        if (timerRef.current) clearInterval(timerRef.current);

        const finalProgress: MissionProgress = {
          ...partialProgress,
          completedSegments: newCompleted,
          completed: true,
        };
        logMissionSession(safeSubject, finalProgress);
        persistMissionXP(safeSubject, finalProgress);
        setTimeout(() => setShowCelebration(false), 5000);
      }
    }
  }, [mission, segmentIndex, itemIndex, completedSegments, safeSubject, answers, startedAt, elapsedSeconds]);

  const handleSubmit = useCallback(async () => {
    if (!currentItem || !currentAnswer || currentAnswer.submitted || !currentAnswer.studentAnswer.trim()) return;

    const topicKey = String(currentItem.payload?.topicKey || "");
    const stem = String(currentItem.payload?.stem || currentItem.title || "");

    updateAnswer(segmentIndex, itemIndex, { submitted: true });

    let isCorrect: boolean | null = null;
    try {
      const resp = await callMentor("explain", {
        subject: safeSubject,
        topicKey,
        questionText: stem,
        studentQuestion: `My answer: "${currentAnswer.studentAnswer}". Give me brief feedback: is my answer correct? What did I miss? Keep it under 3 sentences.`,
      });

      const feedbackText = String(
        resp?.data?.text || resp?.data?.structured?.explanation || "Good attempt! Review the model answer for comparison."
      );

      isCorrect = feedbackText.toLowerCase().includes("correct") && !feedbackText.toLowerCase().includes("incorrect")
        ? true
        : feedbackText.toLowerCase().includes("incorrect") || feedbackText.toLowerCase().includes("wrong")
          ? false
          : null;

      updateAnswer(segmentIndex, itemIndex, { feedback: feedbackText, correct: isCorrect });
    } catch {
      updateAnswer(segmentIndex, itemIndex, {
        feedback: "Good attempt! Check the textbook for the model answer.",
        correct: null,
      });
    }

    persistMasteryForQuestion(topicKey, currentItem.id, isCorrect);
  }, [currentItem, currentAnswer, segmentIndex, itemIndex, updateAnswer, safeSubject]);

  const handleSkip = useCallback(() => {
    if (!currentItem) return;
    const topicKey = String(currentItem.payload?.topicKey || "");
    updateAnswer(segmentIndex, itemIndex, {
      submitted: true,
      studentAnswer: "(skipped)",
      feedback: "Skipped — review this topic later!",
      correct: false,
    });
    persistMasteryForQuestion(topicKey, currentItem.id, false);
  }, [currentItem, segmentIndex, itemIndex, updateAnswer]);

  const handleMarkRead = useCallback(() => {
    updateAnswer(segmentIndex, itemIndex, {
      submitted: true,
      studentAnswer: "(read)",
      feedback: "Great! You reviewed this content.",
      correct: true,
    });
  }, [segmentIndex, itemIndex, updateAnswer]);

  useEffect(() => {
    if (inputRef.current && currentAnswer && !currentAnswer.submitted && isQuestionItem) {
      inputRef.current.focus();
    }
  }, [segmentIndex, itemIndex, currentAnswer, isQuestionItem]);

  if (!mission) {
    return (
      <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
        <p style={{ opacity: 0.7 }}>Loading mission...</p>
      </div>
    );
  }

  if (mission.segments.every((s) => s.items.length === 0)) {
    return (
      <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
        <MissionBackNav />
        <h2 style={{ fontWeight: 900, fontSize: 24 }}>Daily Mission</h2>
        <p style={{ opacity: 0.7, marginTop: 8 }}>No questions available for {safeSubject} today. Try again tomorrow!</p>
        <button type="button" className="lt-pill" onClick={() => navigate(backTarget)} style={{ marginTop: 16 }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const xpInfo = computeMissionXP({
    date: todayKey(),
    subject: safeSubject,
    segmentIndex,
    itemIndex,
    answers,
    completedSegments,
    startedAt,
    elapsedSeconds,
    completed,
  });

  const itemStem = String(currentItem?.payload?.stem || currentItem?.description || "");
  const itemTitle = currentItem?.title ?? "Question";
  const itemMarks = isQuestionItem ? Number(currentItem?.payload?.marks || 2) : 0;
  const itemDifficulty = isQuestionItem ? String(currentItem?.payload?.difficulty || currentItem?.description?.split("|")[0]?.trim() || "Medium") : "";

  return (
    <div className="lt-page" style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px", minHeight: "100vh" }}>
      <MissionBackNav />

      {showCelebration && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.6)", zIndex: 9999, animation: "fadeIn 0.3s ease",
        }}>
          <div style={{
            background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
            padding: "40px 32px", textAlign: "center", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
            <h2 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>Mission Complete!</h2>
            <p style={{ opacity: 0.7, marginTop: 8, fontSize: 15 }}>
              {mission.isWeekend ? "Weekend extended mission" : "30-minute daily mission"} finished!
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 16, fontSize: 14, fontWeight: 700 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, color: "#f97316" }}>+{xpInfo.xp}</div>
                <div style={{ opacity: 0.5, fontSize: 11 }}>XP earned</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, color: "#22c55e" }}>{completedSegments.length}/{mission.segments.length}</div>
                <div style={{ opacity: 0.5, fontSize: 11 }}>Segments</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, color: "#3b82f6" }}>{streakDays}</div>
                <div style={{ opacity: 0.5, fontSize: 11 }}>Day streak</div>
              </div>
            </div>
            {xpInfo.streakEligible && (
              <div style={{ marginTop: 12, padding: "8px 16px", background: "rgba(34,197,94,0.1)", borderRadius: 12, fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
                🔥 Streak maintained!
              </div>
            )}
            {currentBadge && (
              <div style={{ marginTop: 8, padding: "6px 12px", background: "rgba(59,130,246,0.1)", borderRadius: 10, fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>
                {currentBadge.description}
              </div>
            )}
            <button type="button" onClick={() => navigate(backTarget)} style={{
              marginTop: 20, padding: "12px 32px", borderRadius: 12, border: "none",
              background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer",
            }}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {showSegmentTransition && currentSegment && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.5)", zIndex: 9998, animation: "fadeIn 0.2s ease",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontWeight: 900, fontSize: 20, margin: 0, color: currentSegment.color }}>
              {currentSegment.label} Complete!
            </h3>
            <p style={{ opacity: 0.6, marginTop: 6, fontSize: 14 }}>
              Moving to next segment...
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 24, margin: 0 }}>
            {mission.isWeekend ? "Extended Mission" : "Daily Mission"}
          </h1>
          <p style={{ opacity: 0.65, fontSize: 12, marginTop: 4 }}>
            Class {gradeNum} {safeSubject} • {mission.totalMinutes} min
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!completed && completedSegments.length === 0 && (
            <button type="button" onClick={() => setExtendedMode((p) => !p)} style={{
              padding: "5px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)",
              background: extendedMode ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
              color: extendedMode ? "#a855f7" : "rgba(255,255,255,0.6)",
              fontSize: 11, fontWeight: 700, cursor: "pointer",
            }}>
              {extendedMode ? "60 min ✓" : "Extend to 60 min"}
            </button>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
            background: "rgba(255,255,255,0.04)", borderRadius: 999, fontSize: 13, fontWeight: 700,
          }}>
            <span>⏱</span>
            <span>{formatTime(elapsedSeconds)}</span>
          </div>
        </div>
      </div>

      <div style={{
        display: "flex", gap: 4, marginTop: 16, overflow: "auto", paddingBottom: 4,
      }}>
        {mission.segments.map((seg, si) => {
          const isDone = completedSegments.includes(si);
          const isCurrent = si === segmentIndex;
          return (
            <button key={si} type="button" onClick={() => {
              if (isDone || isCurrent) {
                setSegmentIndex(si);
                setItemIndex(0);
              }
            }} style={{
              flex: 1, minWidth: 0, padding: "8px 4px", borderRadius: 10,
              border: isCurrent ? `2px solid ${seg.color}` : "1px solid rgba(255,255,255,0.06)",
              background: isDone ? `${seg.color}15` : isCurrent ? `${seg.color}10` : "rgba(255,255,255,0.02)",
              cursor: isDone || isCurrent ? "pointer" : "default",
              opacity: !isDone && !isCurrent ? 0.4 : 1,
              transition: "all 0.3s ease",
            }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{isDone ? "✓" : SEGMENT_ICONS[seg.type]}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: seg.color, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {seg.label}
              </div>
              <div style={{ fontSize: 9, opacity: 0.5 }}>{seg.durationMinutes}m</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, opacity: 0.6, marginBottom: 4 }}>
          <span>{currentSegment?.label} — {segmentAnswered}/{currentSegment?.items.length ?? 0}</span>
          <span>{Math.min(Math.round(elapsedSeconds / 60), mission.totalMinutes)} of {mission.totalMinutes} min</span>
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${overallProgress}%`,
            background: completed ? "#22c55e" : (currentSegment?.color || "#3b82f6"),
            borderRadius: 999, transition: "width 0.4s ease",
          }} />
        </div>
      </div>

      <div style={{
        display: "flex", gap: 5, marginTop: 12, flexWrap: "wrap",
      }}>
        {currentSegment?.items.map((_, i) => {
          const ansIdx = getAnswerIndex(segmentIndex, i);
          const ans = ansIdx >= 0 ? answers[ansIdx] : null;
          const isCurr = i === itemIndex;
          return (
            <button key={i} type="button" onClick={() => setItemIndex(i)} style={{
              width: 32, height: 32, borderRadius: 8,
              border: isCurr ? `2px solid ${currentSegment.color}` : "1px solid rgba(255,255,255,0.06)",
              background: ans?.submitted
                ? ans.correct === false ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)"
                : isCurr ? `${currentSegment.color}18` : "rgba(255,255,255,0.03)",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              color: isCurr ? currentSegment.color : "rgba(255,255,255,0.4)",
            }}>
              {ans?.submitted ? (ans.correct === false ? "✗" : "✓") : i + 1}
            </button>
          );
        })}
      </div>

      {currentItem && (
        <div style={{
          marginTop: 16, border: `1px solid ${currentSegment?.color || "rgba(255,255,255,0.06)"}25`,
          borderRadius: 16, padding: 20, background: "rgba(255,255,255,0.03)", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "2px 10px", borderRadius: 999,
              background: currentSegment?.color || "#3b82f6", color: "#fff",
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              {currentSegment?.label}
            </span>
            {isQuestionItem && itemDifficulty && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                color: itemDifficulty === "Easy" ? "#22c55e" : itemDifficulty === "Hard" ? "#ef4444" : "#f59e0b",
              }}>
                {itemDifficulty}
              </span>
            )}
            {isQuestionItem && (
              <span style={{ fontSize: 10, opacity: 0.5 }}>
                {itemMarks} mark{itemMarks !== 1 ? "s" : ""}
              </span>
            )}
            <span style={{ fontSize: 10, opacity: 0.4, marginLeft: "auto" }}>
              {itemIndex + 1}/{currentSegment?.items.length ?? 0}
            </span>
          </div>

          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{itemTitle}</div>
          {itemStem && <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", opacity: 0.9 }}>{itemStem}</div>}

          {currentAnswer && !currentAnswer.submitted && isQuestionItem && (
            <div style={{ marginTop: 16 }}>
              <textarea
                ref={inputRef}
                value={currentAnswer.studentAnswer}
                onChange={(e) => updateAnswer(segmentIndex, itemIndex, { studentAnswer: e.target.value })}
                placeholder="Type your answer here..."
                rows={4}
                style={{
                  width: "100%", padding: 12, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
                  fontSize: 14, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.03)", color: "#fff",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={handleSubmit}
                  disabled={!currentAnswer.studentAnswer.trim()}
                  style={{
                    padding: "10px 24px",
                    background: currentAnswer.studentAnswer.trim() ? (currentSegment?.color || "#3b82f6") : "rgba(255,255,255,0.1)",
                    color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14,
                    cursor: currentAnswer.studentAnswer.trim() ? "pointer" : "default",
                  }}>
                  Submit (Ctrl+Enter)
                </button>
                <button type="button" onClick={handleSkip} style={{
                  padding: "10px 20px", background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {currentAnswer && !currentAnswer.submitted && !isQuestionItem && (
            <div style={{ marginTop: 16 }}>
              <button type="button" onClick={handleMarkRead} style={{
                padding: "10px 24px", background: currentSegment?.color || "#3b82f6",
                color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
                ✓ Got it, continue
              </button>
            </div>
          )}

          {currentAnswer?.submitted && (
            <div style={{
              marginTop: 16, padding: 14, borderRadius: 12,
              background: currentAnswer.correct === true ? "rgba(34,197,94,0.06)"
                : currentAnswer.correct === false ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${currentAnswer.correct === true ? "rgba(34,197,94,0.15)"
                : currentAnswer.correct === false ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)"}`,
            }}>
              {currentAnswer.studentAnswer && currentAnswer.studentAnswer !== "(read)" && currentAnswer.studentAnswer !== "(skipped)" && (
                <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 6 }}>
                  Your answer: {currentAnswer.studentAnswer}
                </div>
              )}
              <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                {currentAnswer.feedback || "Submitted!"}
              </div>
              {currentItem?.payload?.modelAnswer && currentAnswer.correct !== true && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, fontSize: 13, opacity: 0.8 }}>
                  <span style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.3, opacity: 0.5 }}>Model Answer</span>
                  <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{String(currentItem.payload.modelAnswer)}</div>
                </div>
              )}
              <button type="button" onClick={advanceToNext} style={{
                marginTop: 12, padding: "10px 24px", background: currentSegment?.color || "#3b82f6",
                color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
                {itemIndex < (currentSegment?.items.length ?? 1) - 1 ? "Next →" :
                  segmentIndex < (mission?.segments.length ?? 1) - 1 ? "Next Segment →" : "Finish Mission 🏆"}
              </button>
            </div>
          )}
        </div>
      )}

      {completed && !showCelebration && (
        <div style={{
          marginTop: 20, padding: 20, borderRadius: 16,
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <h3 style={{ fontWeight: 900, fontSize: 18, margin: 0 }}>Mission Complete!</h3>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 12, fontSize: 14 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#f97316" }}>+{xpInfo.xp}</div>
              <div style={{ opacity: 0.5, fontSize: 11 }}>XP</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#3b82f6" }}>{formatTime(elapsedSeconds)}</div>
              <div style={{ opacity: 0.5, fontSize: 11 }}>Time</div>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#22c55e" }}>{answers.filter((a) => a.correct === true).length}/{totalItems}</div>
              <div style={{ opacity: 0.5, fontSize: 11 }}>Correct</div>
            </div>
          </div>
          <button type="button" onClick={() => navigate(backTarget)} style={{
            marginTop: 16, padding: "12px 32px", borderRadius: 12, border: "none",
            background: "#22c55e", color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer",
          }}>
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
