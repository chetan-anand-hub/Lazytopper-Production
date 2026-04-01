import { useState, useRef, useEffect, useCallback } from "react";
import { DiagramBlock } from "../DiagramBlock";
import {
  loadTopicMasterySnapshot,
  saveTopicMasterySnapshot,
  upsertNodeProgress,
} from "../../services/topicHubMastery";

interface TeachFlowProps {
  topicKey: string;
  subject: string;
  grade: string;
  nodeId?: string;
  onComplete?: () => void;
}

type Phase = "intro" | "teaching" | "awaiting_answer" | "responding" | "complete" | "previously_completed";

interface TeachCard {
  goal?: string;
  goalLine?: string;
  keyIdeas?: string[];
  keyIdeaBullets?: string[];
  diagram?: { type?: string; altText?: string };
  checkpoint?: { question?: string; answer?: string };
}

interface TeachFlowSessionState {
  topicKey: string;
  phase: Phase;
  stepCount: number;
  teachCard: TeachCard | null;
  aiFeedback: string;
  history: { role: string; content: string }[];
  savedAt: number;
}

const SESSION_STORAGE_PREFIX = "lazytopper.teachFlow.session.";
const COMPLETION_STORAGE_PREFIX = "lazytopper.teachFlow.completed.";
const SESSION_TTL_MS = 30 * 60 * 1000;

const VALID_PHASES: ReadonlySet<Phase> = new Set([
  "intro", "teaching", "awaiting_answer", "responding", "complete", "previously_completed",
]);

const RESUMABLE_PHASES: ReadonlySet<Phase> = new Set([
  "awaiting_answer",
]);

function normalizeTopicKey(topicKey: string): string {
  return String(topicKey || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "topic";
}

function getSessionKey(topicKey: string): string {
  return `${SESSION_STORAGE_PREFIX}${normalizeTopicKey(topicKey)}`;
}

function getCompletionKey(topicKey: string): string {
  return `${COMPLETION_STORAGE_PREFIX}${normalizeTopicKey(topicKey)}`;
}

function saveSessionState(topicKey: string, state: TeachFlowSessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getSessionKey(topicKey), JSON.stringify(state));
  } catch { /* ignore quota errors */ }
}

function isValidHistoryItem(item: unknown): item is { role: string; content: string } {
  if (typeof item !== "object" || item === null) return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.role === "string" && typeof obj.content === "string";
}

function loadSessionState(topicKey: string): TeachFlowSessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getSessionKey(topicKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return null;
    const normalizedKey = normalizeTopicKey(topicKey);
    const storedKey = normalizeTopicKey(String(parsed.topicKey || ""));
    if (storedKey !== normalizedKey) return null;
    const savedAt = Number(parsed.savedAt);
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > SESSION_TTL_MS) {
      window.localStorage.removeItem(getSessionKey(topicKey));
      return null;
    }
    const phase = String(parsed.phase || "") as Phase;
    if (!VALID_PHASES.has(phase) || !RESUMABLE_PHASES.has(phase)) return null;
    const stepCount = Number(parsed.stepCount);
    if (!Number.isFinite(stepCount) || stepCount < 0 || stepCount > 10) return null;
    const history = Array.isArray(parsed.history) ? parsed.history.filter(isValidHistoryItem) : [];
    const aiFeedback = typeof parsed.aiFeedback === "string" ? parsed.aiFeedback : "";
    const teachCard = (parsed.teachCard && typeof parsed.teachCard === "object")
      ? parsed.teachCard as TeachCard
      : null;
    return {
      topicKey: normalizedKey,
      phase,
      stepCount,
      teachCard,
      aiFeedback,
      history,
      savedAt,
    };
  } catch {
    return null;
  }
}

function clearSessionState(topicKey: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(getSessionKey(topicKey)); } catch { /* */ }
}

function markTopicCompleted(topicKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      getCompletionKey(topicKey),
      JSON.stringify({ topicKey, completedAt: new Date().toISOString() })
    );
  } catch { /* */ }
}

function hasTopicBeenCompleted(topicKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(getCompletionKey(topicKey)) !== null;
  } catch {
    return false;
  }
}

function getTopicCompletionDate(topicKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getCompletionKey(topicKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.completedAt || null;
  } catch {
    return null;
  }
}

function extractFeedbackText(payload: Record<string, unknown>): string {
  if (!payload) return "Good effort! Let's continue.";
  const d = (payload.data as Record<string, unknown>) ?? payload;
  const structured = (d.structured as Record<string, unknown>) ?? d;

  if (typeof d.feedback === "string" && (d.feedback as string).trim())
    return (d.feedback as string).trim();
  if (typeof d.responseText === "string" && (d.responseText as string).trim())
    return (d.responseText as string).trim();
  if (typeof structured.feedback === "string" && (structured.feedback as string).trim())
    return (structured.feedback as string).trim();

  if (structured.tutor && typeof structured.tutor === "object") {
    const tutor = structured.tutor as Record<string, unknown>;
    if (tutor.diagnosis && typeof tutor.diagnosis === "object") {
      const diagnosis = tutor.diagnosis as Record<string, unknown>;
      const parts: string[] = [];
      if (diagnosis.analysis) parts.push(String(diagnosis.analysis));
      if (diagnosis.verdict) parts.push(String(diagnosis.verdict));
      if (parts.length > 0) return parts.join(" ");
    }
    if (typeof tutor.explanation === "string" && (tutor.explanation as string).trim())
      return (tutor.explanation as string).trim();
    if (typeof tutor.tutor === "string" && (tutor.tutor as string).trim())
      return (tutor.tutor as string).trim();
  }

  if (typeof structured.commonMistake === "string" && (structured.commonMistake as string).trim())
    return "Watch out: " + (structured.commonMistake as string).trim();
  if (typeof structured.checkpointAnswer === "string" && (structured.checkpointAnswer as string).trim())
    return (structured.checkpointAnswer as string).trim();

  if (typeof d.text === "string" && (d.text as string).trim()) {
    try {
      const parsed = JSON.parse(d.text as string) as Record<string, unknown>;
      if (parsed.checkpointAnswer) return String(parsed.checkpointAnswer).trim();
      if (parsed.commonMistake) return "Watch out: " + String(parsed.commonMistake).trim();
      if (parsed.goalLine) return String(parsed.goalLine).trim();
    } catch { /* not JSON */ }
    return (d.text as string).trim().slice(0, 500);
  }

  if (typeof payload.message === "string" && (payload.message as string).trim())
    return (payload.message as string).trim();

  return "Good effort! Let's continue.";
}

function extractTeachCard(payload: Record<string, unknown> | null | undefined): TeachCard | null {
  if (!payload) return null;
  if (payload.teach && typeof payload.teach === "object")
    return payload.teach as TeachCard;
  const payloadData = payload.data as Record<string, unknown> | undefined;
  if (payloadData?.teach && typeof payloadData.teach === "object")
    return payloadData.teach as TeachCard;

  const data = payloadData ?? null;
  const structured = ((data && (data.structured as Record<string, unknown>)) ||
    (payload.structured as Record<string, unknown>) ||
    null) as Record<string, unknown> | null;
  if (structured && (structured.goalLine || structured.keyIdeas || structured.checkpointQuestion)) {
    const cp = structured.checkpoint as Record<string, unknown> | undefined;
    return {
      goal: (structured.goalLine as string) ?? "",
      goalLine: (structured.goalLine as string) ?? "",
      keyIdeas: Array.isArray(structured.keyIdeas) ? structured.keyIdeas as string[] : [],
      checkpoint: {
        question: (structured.checkpointQuestion as string) ?? (cp?.question as string) ?? "",
        answer: (structured.checkpointAnswer as string) ?? (cp?.answer as string) ?? "",
      },
      diagram: (structured.diagram as TeachCard["diagram"]) ?? undefined,
    };
  }

  const d = (data ?? payload) as Record<string, unknown>;
  if (d && (d.goalLine || d.keyIdeas || d.checkpointQuestion)) {
    const cp = d.checkpoint as Record<string, unknown> | undefined;
    return {
      goal: (d.goalLine as string) ?? "",
      goalLine: (d.goalLine as string) ?? "",
      keyIdeas: Array.isArray(d.keyIdeas) ? d.keyIdeas as string[] : [],
      checkpoint: {
        question: (d.checkpointQuestion as string) ?? (cp?.question as string) ?? "",
        answer: (d.checkpointAnswer as string) ?? (cp?.answer as string) ?? "",
      },
      diagram: (d.diagram as TeachCard["diagram"]) ?? undefined,
    };
  }

  if (typeof d?.text === "string" && (d.text as string).trim()) {
    try {
      const parsed = JSON.parse(d.text as string) as Record<string, unknown>;
      if (parsed.goalLine || parsed.keyIdeas) {
        return {
          goal: (parsed.goalLine as string) ?? "",
          goalLine: (parsed.goalLine as string) ?? "",
          keyIdeas: Array.isArray(parsed.keyIdeas) ? parsed.keyIdeas as string[] : [],
          checkpoint: {
            question: (parsed.checkpointQuestion as string) ?? "",
            answer: (parsed.checkpointAnswer as string) ?? "",
          },
          diagram: (parsed.diagram as TeachCard["diagram"]) ?? undefined,
        };
      }
    } catch { /* not JSON */ }
  }

  return null;
}

function getGoal(card: TeachCard): string {
  return String(card.goalLine || card.goal || "").trim() || "Understand the core idea.";
}

function getKeyIdeas(card: TeachCard): string[] {
  const raw = card.keyIdeas || card.keyIdeaBullets || [];
  return Array.isArray(raw) ? raw.map((s) => String(s).trim()).filter(Boolean) : [];
}

function formatCompletionDate(isoDate: string | null): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

const styles = {
  container: { maxWidth: 640, margin: "0 auto", padding: 24 } as React.CSSProperties,
  heading: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 8 } as React.CSSProperties,
  hook: { fontSize: 15, color: "#555", marginBottom: 24 } as React.CSSProperties,
  card: { background: "white", border: "1px solid #e8e8e8", borderRadius: 12, padding: 20, marginBottom: 16 } as React.CSSProperties,
  goalLine: { fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 10 } as React.CSSProperties,
  bullet: { fontSize: 14, lineHeight: 1.8, color: "#333" } as React.CSSProperties,
  checkpointQ: { fontSize: 14, fontWeight: 600, color: "#333", marginTop: 16, marginBottom: 8 } as React.CSSProperties,
  input: { width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #ccc", borderRadius: 8, boxSizing: "border-box", marginBottom: 12, fontFamily: "inherit" } as React.CSSProperties,
  primaryBtn: { background: "#4f46e5", color: "white", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginRight: 10 } as React.CSSProperties,
  secondaryBtn: { background: "transparent", color: "#4f46e5", border: "1px solid #4f46e5", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" } as React.CSSProperties,
  skipBtn: { background: "transparent", color: "#888", border: "1px solid #ddd", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", display: "block", marginTop: 8 } as React.CSSProperties,
  spinner: { color: "#888", fontSize: 14, padding: "20px 0" } as React.CSSProperties,
  error: { color: "#cc0000", fontSize: 13, marginTop: 8, marginBottom: 12 } as React.CSSProperties,
  feedback: { fontSize: 14, color: "#333", lineHeight: 1.7, marginBottom: 16 } as React.CSSProperties,
  stepBadge: { fontSize: 12, color: "#888", marginBottom: 16 } as React.CSSProperties,
  diagram: { border: "1px solid #e0e0e0", borderRadius: 8, marginBottom: 16, padding: 8, fontSize: 12, color: "#888" } as React.CSSProperties,
  complete: { textAlign: "center", padding: "32px 0" } as React.CSSProperties,
  completeTick: { fontSize: 40, marginBottom: 12 } as React.CSSProperties,
  completeMsg: { fontSize: 16, fontWeight: 600, color: "#1a1a2e", marginBottom: 8 } as React.CSSProperties,
  completeSub: { fontSize: 14, color: "#666", marginBottom: 24 } as React.CSSProperties,
  completedBanner: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: 24, textAlign: "center", marginBottom: 16 } as React.CSSProperties,
  completedDate: { fontSize: 13, color: "#888", marginTop: 4 } as React.CSSProperties,
};

export function TeachFlow({ topicKey, subject, grade, nodeId, onComplete }: TeachFlowProps) {
  const wasCompleted = hasTopicBeenCompleted(topicKey);
  const savedSession = loadSessionState(topicKey);

  const [phase, setPhase] = useState<Phase>(
    savedSession ? savedSession.phase : wasCompleted ? "previously_completed" : "intro"
  );
  const [stepCount, setStepCount] = useState(savedSession?.stepCount ?? 0);
  const [teachCard, setTeachCard] = useState<TeachCard | null>(savedSession?.teachCard ?? null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState(savedSession?.aiFeedback ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: string; content: string }[]>(savedSession?.history ?? []);
  const abortRef = useRef<AbortController | null>(null);

  const persistSession = useCallback(() => {
    if (phase === "complete" || phase === "previously_completed" || phase === "intro") return;
    saveSessionState(topicKey, {
      topicKey,
      phase,
      stepCount,
      teachCard,
      aiFeedback,
      history,
      savedAt: Date.now(),
    });
  }, [topicKey, phase, stepCount, teachCard, aiFeedback, history]);

  useEffect(() => {
    persistSession();
  }, [persistSession]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        persistSession();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [persistSession]);

  const prevTopicKeyRef = useRef(topicKey);
  useEffect(() => {
    if (prevTopicKeyRef.current === topicKey) return;
    prevTopicKeyRef.current = topicKey;
    const restored = loadSessionState(topicKey);
    if (restored) {
      setPhase(restored.phase);
      setStepCount(restored.stepCount);
      setTeachCard(restored.teachCard);
      setAiFeedback(restored.aiFeedback);
      setHistory(restored.history);
    } else if (hasTopicBeenCompleted(topicKey)) {
      setPhase("previously_completed");
      setStepCount(0);
      setTeachCard(null);
      setAiFeedback("");
      setHistory([]);
    } else {
      setPhase("intro");
      setStepCount(0);
      setTeachCard(null);
      setAiFeedback("");
      setHistory([]);
    }
    setStudentAnswer("");
    setError(null);
    setLoading(false);
  }, [topicKey]);

  function markComplete() {
    markTopicCompleted(topicKey);
    clearSessionState(topicKey);
    const snapshot = loadTopicMasterySnapshot(topicKey);
    const effectiveNodeId = nodeId ?? topicKey;
    const updated = upsertNodeProgress(snapshot, effectiveNodeId, {
      score: 65,
      status: "partially_correct",
      band: "checkpoint_passed",
    });
    saveTopicMasterySnapshot(updated, topicKey);
  }

  async function callMentor(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: body.mode,
          messages: body.messages,
          payload: body,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const raw = await res.text();
      let payload: Record<string, unknown> = {};
      try { payload = raw ? JSON.parse(raw) as Record<string, unknown> : {}; } catch { payload = { text: raw }; }
      if (!res.ok) throw new Error((payload?.error as string) || (payload?.message as string) || `Server error ${res.status}`);
      return payload;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") throw new Error("The tutor is taking too long. Please try again.");
      throw err;
    }
  }

  async function startLearning() {
    setLoading(true);
    setError(null);
    setPhase("teaching");
    try {
      const payload = await callMentor({
        mode: "learn_teach",
        section: "learn",
        subSection: "teach",
        selectedTab: "teach",
        topic: topicKey,
        subject,
        grade,
        nodeId: nodeId ?? `${topicKey}-step-1`,
        messages: [],
      });
      const card = extractTeachCard(payload) || extractTeachCard(payload?.data as Record<string, unknown> | undefined);
      if (card) {
        setTeachCard(card);
        setHistory([{ role: "assistant", content: `${getGoal(card)}. ${getKeyIdeas(card).join(". ")}` }]);
      } else {
        setTeachCard({
          goal: `Let's learn ${topicKey}`,
          keyIdeas: ["Review the key concepts for this topic.", "Focus on definitions and theorems."],
          checkpoint: { question: "What do you already know about this topic?" },
        });
      }
      setPhase("awaiting_answer");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
      setPhase("intro");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    if (!studentAnswer.trim()) return;
    setLoading(true);
    setError(null);
    setPhase("responding");
    const newHistory = [...history, { role: "user", content: studentAnswer.trim() }];
    try {
      const payload = await callMentor({
        mode: "learn_teach",
        section: "learn",
        subSection: "teach",
        selectedTab: "teach",
        topic: topicKey,
        subject,
        grade,
        nodeId: nodeId ?? `${topicKey}-step-${stepCount + 1}`,
        messages: newHistory,
        attempt_loop: { student_attempt: { raw_text: studentAnswer.trim() } },
      });
      const data = (payload?.data as Record<string, unknown>) ?? payload;
      const feedback = extractFeedbackText(data);
      const nextCard = extractTeachCard(data);
      setAiFeedback(feedback);
      setHistory([...newHistory, { role: "assistant", content: feedback }]);
      if (nextCard) setTeachCard(nextCard);
      setStudentAnswer("");
      const nextStep = stepCount + 1;
      setStepCount(nextStep);
      if (nextStep >= 3) {
        markComplete();
        setPhase("complete");
      } else {
        setPhase("awaiting_answer");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
      setPhase("awaiting_answer");
    } finally {
      setLoading(false);
    }
  }

  function retry() {
    setError(null);
    if (phase === "intro" || stepCount === 0) startLearning();
    else submitAnswer();
  }

  function reset() {
    clearSessionState(topicKey);
    setPhase("intro");
    setStepCount(0);
    setTeachCard(null);
    setStudentAnswer("");
    setAiFeedback("");
    setError(null);
    setHistory([]);
  }

  function handleSkipToComplete() {
    markComplete();
    setPhase("complete");
  }

  if (phase === "previously_completed") {
    const completedDate = getTopicCompletionDate(topicKey);
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>{topicKey}</h2>
        <div style={styles.completedBanner}>
          <div style={styles.completeTick}>✓</div>
          <p style={styles.completeMsg}>Completed — Review Again</p>
          <p style={styles.completeSub}>
            You've already completed this lesson. Want to go through it again?
          </p>
          {completedDate && (
            <p style={styles.completedDate}>Completed on {formatCompletionDate(completedDate)}</p>
          )}
          <div style={{ marginTop: 16 }}>
            <button style={styles.primaryBtn} onClick={() => { reset(); startLearning(); }}>
              Review Again
            </button>
            <button style={styles.secondaryBtn} onClick={() => onComplete?.()}>
              Go to Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>{topicKey}</h2>
        <p style={styles.hook}>Let's understand {topicKey} — step by step, concept by concept.</p>
        {loading && <p style={styles.spinner}>Preparing your lesson…</p>}
        {error && (
          <>
            <p style={styles.error}>{error}</p>
            <button style={styles.secondaryBtn} onClick={retry}>Retry</button>
          </>
        )}
        {!loading && !error && (
          <button style={styles.primaryBtn} onClick={startLearning}>Start Learning</button>
        )}
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div style={{ ...styles.container, ...styles.complete }}>
        <div style={styles.completeTick}>✓</div>
        <p style={styles.completeMsg}>Great work!</p>
        <p style={styles.completeSub}>
          You've covered the key ideas for {topicKey}. Ready to test yourself?
        </p>
        <button style={styles.primaryBtn} onClick={() => onComplete?.()}>
          Try a Practice Question
        </button>
        <button style={styles.secondaryBtn} onClick={reset}>
          Review Again
        </button>
      </div>
    );
  }

  const card = teachCard;
  const goal = card ? getGoal(card) : "";
  const ideas = card ? getKeyIdeas(card) : [];
  const checkpointQ = card?.checkpoint?.question || "";
  const diagram = card?.diagram;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>{topicKey}</h2>
      <p style={styles.stepBadge}>Step {stepCount + 1} of 3</p>

      {aiFeedback && phase === "awaiting_answer" && (
        <div style={{ ...styles.card, borderLeft: "3px solid #4f46e5" }}>
          <p style={{ ...styles.goalLine, color: "#4f46e5" }}>Tutor's Response</p>
          <p style={styles.feedback}>{aiFeedback}</p>
        </div>
      )}

      {card && (
        <div style={styles.card}>
          <p style={styles.goalLine}>{goal}</p>
          {ideas.length > 0 && (
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {ideas.map((idea, i) => (
                <li key={i} style={styles.bullet}>{idea}</li>
              ))}
            </ul>
          )}
          {diagram && diagram.type && (
            <div style={{ marginBottom: 16 }}>
              <DiagramBlock
                diagramType={diagram.type}
                note={diagram.altText || "Concept diagram"}
              />
            </div>
          )}
          {checkpointQ && <p style={styles.checkpointQ}>{checkpointQ}</p>}
        </div>
      )}

      {phase === "awaiting_answer" && (
        <>
          <textarea
            style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
            placeholder="Type your answer here…"
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
            disabled={loading}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            style={styles.primaryBtn}
            onClick={submitAnswer}
            disabled={loading || !studentAnswer.trim()}
          >
            {loading ? "Checking…" : "Submit Answer"}
          </button>
          {stepCount >= 1 && (
            <button style={styles.skipBtn} onClick={handleSkipToComplete}>
              I already understand this — skip to practice
            </button>
          )}
        </>
      )}

      {(phase === "teaching" || phase === "responding") && (
        <p style={styles.spinner}>{phase === "teaching" ? "Loading your lesson…" : "Analysing your answer…"}</p>
      )}
    </div>
  );
}
