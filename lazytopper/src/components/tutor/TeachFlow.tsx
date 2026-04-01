import { useState, useRef, useEffect, useCallback } from "react";
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

interface ChatMessage {
  role: "tutor" | "student";
  content: string;
  isCheckpoint?: boolean;
}

interface TeachFlowSessionState {
  topicKey: string;
  phase: Phase;
  stepCount: number;
  chatMessages: ChatMessage[];
  savedAt: number;
}

const SESSION_STORAGE_PREFIX = "lazytopper.teachFlow.session.";
const COMPLETION_STORAGE_PREFIX = "lazytopper.teachFlow.completed.";
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_TEACH_STEPS = 5;

const VALID_PHASES: ReadonlySet<Phase> = new Set([
  "intro", "teaching", "awaiting_answer", "responding", "complete", "previously_completed",
]);

const RESUMABLE_PHASES: ReadonlySet<Phase> = new Set([
  "teaching", "awaiting_answer", "responding",
]);

const NORMALIZE_PHASE_ON_RESTORE: Partial<Record<Phase, Phase>> = {
  teaching: "awaiting_answer",
  responding: "awaiting_answer",
};

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
    const rawPhase = String(parsed.phase || "") as Phase;
    if (!VALID_PHASES.has(rawPhase) || !RESUMABLE_PHASES.has(rawPhase)) return null;
    const phase = NORMALIZE_PHASE_ON_RESTORE[rawPhase] ?? rawPhase;
    const stepCount = Number(parsed.stepCount);
    if (!Number.isFinite(stepCount) || stepCount < 0 || stepCount > 10) return null;
    const chatMessages = Array.isArray(parsed.chatMessages)
      ? (parsed.chatMessages as ChatMessage[]).filter(
          (m) => m && typeof m.role === "string" && typeof m.content === "string"
        )
      : [];
    if (chatMessages.length === 0) return null;
    return { topicKey: normalizedKey, phase, stepCount, chatMessages, savedAt };
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

function formatCompletionDate(isoDate: string | null): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

function extractTutorText(payload: Record<string, unknown>): string {
  if (!payload) return "";
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const structured = (data.structured as Record<string, unknown>) ?? data;

  if (typeof data.responseText === "string" && (data.responseText as string).trim())
    return (data.responseText as string).trim();
  if (typeof data.feedback === "string" && (data.feedback as string).trim())
    return (data.feedback as string).trim();
  if (typeof structured.feedback === "string" && (structured.feedback as string).trim())
    return (structured.feedback as string).trim();

  const teach = (structured.teach as Record<string, unknown>) ?? (data.teach as Record<string, unknown>);
  if (teach) {
    const parts: string[] = [];
    if (typeof teach.goalLine === "string") parts.push(teach.goalLine as string);
    if (Array.isArray(teach.simpleExplanation)) {
      parts.push(...(teach.simpleExplanation as string[]).map(String));
    }
    if (Array.isArray(teach.keyIdeas)) {
      parts.push(...(teach.keyIdeas as string[]).map(String));
    }
    if (typeof teach.cbseExamSentence === "string") parts.push(teach.cbseExamSentence as string);
    if (Array.isArray(teach.cbseExamSentence)) {
      parts.push(...(teach.cbseExamSentence as string[]).map(String));
    }
    if (parts.length > 0) return parts.filter(Boolean).join("\n\n");
  }

  if (structured.goalLine || structured.keyIdeas) {
    const parts: string[] = [];
    if (typeof structured.goalLine === "string") parts.push(structured.goalLine as string);
    if (Array.isArray(structured.keyIdeas)) parts.push(...(structured.keyIdeas as string[]).map(String));
    if (typeof structured.checkpointQuestion === "string") parts.push("\n" + (structured.checkpointQuestion as string));
    if (parts.length > 0) return parts.filter(Boolean).join("\n\n");
  }

  if (structured.tutor && typeof structured.tutor === "object") {
    const tutor = structured.tutor as Record<string, unknown>;
    const parts: string[] = [];
    if (tutor.diagnosis && typeof tutor.diagnosis === "object") {
      const diag = tutor.diagnosis as Record<string, unknown>;
      if (diag.analysis) parts.push(String(diag.analysis));
      if (diag.verdict) parts.push(String(diag.verdict));
    }
    if (typeof tutor.explanation === "string") parts.push(tutor.explanation as string);
    if (typeof tutor.text === "string") parts.push(tutor.text as string);
    if (parts.length > 0) return parts.filter(Boolean).join("\n\n");
  }

  if (typeof structured.commonMistake === "string" && (structured.commonMistake as string).trim())
    return "Watch out: " + (structured.commonMistake as string).trim();
  if (typeof structured.checkpointAnswer === "string" && (structured.checkpointAnswer as string).trim())
    return (structured.checkpointAnswer as string).trim();

  if (typeof data.text === "string" && (data.text as string).trim()) {
    try {
      const parsed = JSON.parse(data.text as string) as Record<string, unknown>;
      const subParts: string[] = [];
      if (parsed.goalLine) subParts.push(String(parsed.goalLine));
      if (Array.isArray(parsed.keyIdeas)) subParts.push(...(parsed.keyIdeas as string[]).map(String));
      if (parsed.checkpointQuestion) subParts.push(String(parsed.checkpointQuestion));
      if (subParts.length > 0) return subParts.filter(Boolean).join("\n\n");
    } catch { /* not JSON */ }
    return (data.text as string).trim().slice(0, 1500);
  }

  if (typeof payload.message === "string" && (payload.message as string).trim())
    return (payload.message as string).trim();

  return "";
}

function extractCheckpointQuestion(payload: Record<string, unknown>): string {
  if (!payload) return "";
  const data = (payload.data as Record<string, unknown>) ?? payload;
  const structured = (data.structured as Record<string, unknown>) ?? data;
  if (typeof structured.checkpointQuestion === "string") return (structured.checkpointQuestion as string).trim();
  if (typeof structured.checkQuestion === "string") return (structured.checkQuestion as string).trim();
  const teach = (structured.teach as Record<string, unknown>) ?? (data.teach as Record<string, unknown>);
  if (teach && typeof teach.checkpointQuestion === "string") return (teach.checkpointQuestion as string).trim();
  try {
    if (typeof data.text === "string") {
      const parsed = JSON.parse(data.text as string) as Record<string, unknown>;
      if (parsed.checkpointQuestion) return String(parsed.checkpointQuestion).trim();
    }
  } catch { /* */ }
  return "";
}

function formatTopicName(topicKey: string): string {
  return topicKey
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderTutorContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} style={{ paddingLeft: 20, margin: "8px 0" }}>
          {listItems.map((item, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.8, color: "#333", marginBottom: 2 }}>
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*\u2022]\s+(.+)/);
    const numberedMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      continue;
    }
    if (numberedMatch) {
      listItems.push(numberedMatch[1]);
      continue;
    }

    flushList();

    if (trimmed.startsWith("##")) {
      elements.push(
        <p key={`h-${elements.length}`} style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: "12px 0 4px" }}>
          {trimmed.replace(/^#+\s*/, "")}
        </p>
      );
    } else {
      elements.push(
        <p key={`p-${elements.length}`} style={{ fontSize: 14, lineHeight: 1.75, color: "#333", margin: "6px 0" }}>
          {renderInlineFormatting(trimmed)}
        </p>
      );
    }
  }
  flushList();
  return <>{elements}</>;
}

function renderInlineFormatting(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let earliest = remaining.length;
    let matchType: "bold" | "code" | null = null;
    let match: RegExpMatchArray | null = null;

    if (boldMatch && boldMatch.index !== undefined && boldMatch.index < earliest) {
      earliest = boldMatch.index;
      matchType = "bold";
      match = boldMatch;
    }
    if (codeMatch && codeMatch.index !== undefined && codeMatch.index < earliest) {
      earliest = codeMatch.index;
      matchType = "code";
      match = codeMatch;
    }

    if (!matchType || !match || match.index === undefined) {
      parts.push(remaining);
      break;
    }

    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }

    if (matchType === "bold") {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      parts.push(
        <code key={key++} style={{ background: "#f0f0f5", padding: "1px 5px", borderRadius: 4, fontSize: 13, fontFamily: "monospace" }}>
          {match[1]}
        </code>
      );
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function TeachFlow({ topicKey, subject, grade, nodeId, onComplete }: TeachFlowProps) {
  const wasCompleted = hasTopicBeenCompleted(topicKey);
  const savedSession = loadSessionState(topicKey);
  const topicDisplayName = formatTopicName(topicKey);

  const [phase, setPhase] = useState<Phase>(
    savedSession ? savedSession.phase : wasCompleted ? "previously_completed" : "intro"
  );
  const [stepCount, setStepCount] = useState(savedSession?.stepCount ?? 0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(savedSession?.chatMessages ?? []);
  const [studentInput, setStudentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

  const persistSession = useCallback(() => {
    if (phase === "complete" || phase === "previously_completed" || phase === "intro") return;
    saveSessionState(topicKey, {
      topicKey,
      phase,
      stepCount,
      chatMessages,
      savedAt: Date.now(),
    });
  }, [topicKey, phase, stepCount, chatMessages]);

  useEffect(() => {
    persistSession();
  }, [persistSession]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") persistSession();
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
      setChatMessages(restored.chatMessages);
    } else if (hasTopicBeenCompleted(topicKey)) {
      setPhase("previously_completed");
      setStepCount(0);
      setChatMessages([]);
    } else {
      setPhase("intro");
      setStepCount(0);
      setChatMessages([]);
    }
    setStudentInput("");
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
    const timeoutId = setTimeout(() => controller.abort(), 25000);
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

  function buildConversationMessages(): { role: string; content: string }[] {
    return chatMessages.map((m) => ({
      role: m.role === "tutor" ? "assistant" : "user",
      content: m.content,
    }));
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
        conversational: true,
        stepIndex: 0,
      });

      let tutorText = extractTutorText(payload);
      const checkpoint = extractCheckpointQuestion(payload);

      if (!tutorText) {
        tutorText = `Let's learn **${topicDisplayName}** together!\n\nI'll explain the key concepts step by step, and check your understanding along the way. Think of me as your study buddy who happens to know the CBSE marking scheme really well.\n\nReady? Let's start with the basics.`;
      }

      const newMessages: ChatMessage[] = [
        { role: "tutor", content: tutorText },
      ];

      if (checkpoint) {
        newMessages.push({ role: "tutor", content: checkpoint, isCheckpoint: true });
      }

      setChatMessages(newMessages);
      setStepCount(1);
      setPhase("awaiting_answer");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
      setPhase("intro");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    const text = studentInput.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setPhase("responding");
    setStudentInput("");

    const updatedMessages: ChatMessage[] = [...chatMessages, { role: "student", content: text }];
    setChatMessages(updatedMessages);

    try {
      const conversationHistory = buildConversationMessages();
      conversationHistory.push({ role: "user", content: text });

      const nextStep = stepCount + 1;
      const isNearEnd = nextStep >= MAX_TEACH_STEPS;

      const payload = await callMentor({
        mode: "learn_teach",
        section: "learn",
        subSection: "teach",
        selectedTab: "teach",
        topic: topicKey,
        subject,
        grade,
        nodeId: nodeId ?? `${topicKey}-step-${nextStep}`,
        messages: conversationHistory,
        attempt_loop: { student_attempt: { raw_text: text } },
        conversational: true,
        stepIndex: nextStep,
        nearCompletion: isNearEnd,
      });

      let tutorText = extractTutorText(payload);
      const checkpoint = extractCheckpointQuestion(payload);

      if (!tutorText) {
        tutorText = nextStep < MAX_TEACH_STEPS
          ? "Good effort! Let me explain the next part..."
          : "Well done working through this topic! You've covered the essentials.";
      }

      const newTutorMessages: ChatMessage[] = [
        ...updatedMessages,
        { role: "tutor", content: tutorText },
      ];

      if (checkpoint && nextStep < MAX_TEACH_STEPS) {
        newTutorMessages.push({ role: "tutor", content: checkpoint, isCheckpoint: true });
      }

      setChatMessages(newTutorMessages);
      setStepCount(nextStep);

      if (nextStep >= MAX_TEACH_STEPS) {
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function reset() {
    clearSessionState(topicKey);
    setPhase("intro");
    setStepCount(0);
    setChatMessages([]);
    setStudentInput("");
    setError(null);
  }

  if (phase === "previously_completed") {
    const completedDate = getTopicCompletionDate(topicKey);
    return (
      <div style={s.container}>
        <div style={s.completedBanner}>
          <div style={s.completeTick}>&#10003;</div>
          <p style={s.completeMsg}>You've completed {topicDisplayName}</p>
          <p style={s.completeSub}>Want to go through the lesson again or jump to practice?</p>
          {completedDate && (
            <p style={s.completedDate}>Completed on {formatCompletionDate(completedDate)}</p>
          )}
          <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
            <button style={s.primaryBtn} onClick={() => { reset(); startLearning(); }}>
              Review Again
            </button>
            <button style={s.secondaryBtn} onClick={() => onComplete?.()}>
              Go to Practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div style={s.container}>
        <div style={s.introCard}>
          <div style={s.introIcon}>&#128218;</div>
          <h2 style={s.introTitle}>{topicDisplayName}</h2>
          <p style={s.introSub}>
            Your AI tutor will explain {topicDisplayName} step by step, ask you questions to check understanding,
            and give feedback just like a real teacher would.
          </p>
          <div style={s.introFeatures}>
            <div style={s.introFeature}>
              <span style={s.featureIcon}>&#128172;</span>
              <span>Conversational explanations</span>
            </div>
            <div style={s.introFeature}>
              <span style={s.featureIcon}>&#9989;</span>
              <span>Checkpoint questions</span>
            </div>
            <div style={s.introFeature}>
              <span style={s.featureIcon}>&#128161;</span>
              <span>Board exam tips</span>
            </div>
          </div>
          {loading && <p style={s.loadingText}>Preparing your lesson...</p>}
          {error && (
            <div style={s.errorBox}>
              <p style={s.errorText}>{error}</p>
              <button style={s.retryBtn} onClick={startLearning}>Retry</button>
            </div>
          )}
          {!loading && !error && (
            <button style={s.startBtn} onClick={startLearning}>
              Start Learning
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div style={s.container}>
        <div style={s.chatArea}>
          {chatMessages.map((msg, idx) => (
            <div key={idx} style={msg.role === "tutor" ? s.tutorBubbleWrap : s.studentBubbleWrap}>
              {msg.role === "tutor" && <div style={s.tutorAvatar}>T</div>}
              <div style={{
                ...(msg.role === "tutor" ? s.tutorBubble : s.studentBubble),
                ...(msg.isCheckpoint ? s.checkpointBubble : {}),
              }}>
                {msg.isCheckpoint && <div style={s.checkpointLabel}>Checkpoint Question</div>}
                {msg.role === "tutor" ? renderTutorContent(msg.content) : <p style={s.studentText}>{msg.content}</p>}
              </div>
            </div>
          ))}
        </div>
        <div style={s.completeCard}>
          <div style={s.completeTick}>&#10003;</div>
          <p style={s.completeMsg}>Great work on {topicDisplayName}!</p>
          <p style={s.completeSub}>You've covered the key concepts. Ready to test yourself with practice questions?</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <button style={s.primaryBtn} onClick={() => onComplete?.()}>
              Try Practice Questions
            </button>
            <button style={s.secondaryBtn} onClick={reset}>
              Review Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.chatHeader}>
        <div style={s.chatHeaderLeft}>
          <div style={s.headerAvatar}>T</div>
          <div>
            <div style={s.headerTitle}>{topicDisplayName}</div>
            <div style={s.headerSub}>Step {stepCount} of {MAX_TEACH_STEPS}</div>
          </div>
        </div>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${(stepCount / MAX_TEACH_STEPS) * 100}%` }} />
        </div>
      </div>

      <div style={s.chatArea}>
        {chatMessages.map((msg, idx) => (
          <div key={idx} style={msg.role === "tutor" ? s.tutorBubbleWrap : s.studentBubbleWrap}>
            {msg.role === "tutor" && <div style={s.tutorAvatar}>T</div>}
            <div style={{
              ...(msg.role === "tutor" ? s.tutorBubble : s.studentBubble),
              ...(msg.isCheckpoint ? s.checkpointBubble : {}),
            }}>
              {msg.isCheckpoint && <div style={s.checkpointLabel}>Checkpoint Question</div>}
              {msg.role === "tutor" ? renderTutorContent(msg.content) : <p style={s.studentText}>{msg.content}</p>}
            </div>
          </div>
        ))}

        {loading && (
          <div style={s.tutorBubbleWrap}>
            <div style={s.tutorAvatar}>T</div>
            <div style={s.typingBubble}>
              <span style={s.dot1} /><span style={s.dot2} /><span style={s.dot3} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {error && (
        <div style={s.errorBox}>
          <p style={s.errorText}>{error}</p>
          <button style={s.retryBtn} onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {phase === "awaiting_answer" && (
        <div style={s.inputArea}>
          <textarea
            ref={inputRef}
            style={s.chatInput}
            placeholder="Type your answer or ask a question..."
            value={studentInput}
            onChange={(e) => setStudentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={2}
          />
          <button
            style={{
              ...s.sendBtn,
              opacity: loading || !studentInput.trim() ? 0.5 : 1,
            }}
            onClick={sendMessage}
            disabled={loading || !studentInput.trim()}
          >
            Send
          </button>
        </div>
      )}

      {stepCount >= 2 && phase === "awaiting_answer" && (
        <button
          style={s.skipLink}
          onClick={() => { markComplete(); setPhase("complete"); }}
        >
          I understand this topic — skip to practice
        </button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 680, margin: "0 auto", padding: "16px 16px 24px", display: "flex", flexDirection: "column" },

  introCard: { background: "white", borderRadius: 16, padding: "32px 24px", textAlign: "center", border: "1px solid #e5e7eb" },
  introIcon: { fontSize: 40, marginBottom: 12 },
  introTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" },
  introSub: { fontSize: 14, color: "#666", lineHeight: 1.6, maxWidth: 440, margin: "0 auto 20px" },
  introFeatures: { display: "flex", justifyContent: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" },
  introFeature: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555" },
  featureIcon: { fontSize: 16 },
  startBtn: {
    background: "#4f46e5", color: "white", border: "none", borderRadius: 10, padding: "12px 32px",
    fontSize: 15, fontWeight: 600, cursor: "pointer", transition: "background 0.2s",
  },

  chatHeader: {
    background: "white", borderRadius: "12px 12px 0 0", padding: "12px 16px", borderBottom: "1px solid #e5e7eb",
    marginBottom: 0,
  },
  chatHeaderLeft: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  headerAvatar: {
    width: 32, height: 32, borderRadius: "50%", background: "#4f46e5", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
  },
  headerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a2e" },
  headerSub: { fontSize: 12, color: "#888" },
  progressBar: {
    height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "#4f46e5", borderRadius: 2, transition: "width 0.4s ease",
  },

  chatArea: {
    background: "#f8f9fb", padding: "16px 12px", minHeight: 300, maxHeight: 500,
    overflowY: "auto", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb",
  },

  tutorBubbleWrap: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 },
  studentBubbleWrap: { display: "flex", justifyContent: "flex-end", marginBottom: 12 },
  tutorAvatar: {
    width: 28, height: 28, borderRadius: "50%", background: "#4f46e5", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
    flexShrink: 0, marginTop: 2,
  },
  tutorBubble: {
    background: "white", borderRadius: "4px 12px 12px 12px", padding: "12px 16px",
    maxWidth: "85%", border: "1px solid #e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  studentBubble: {
    background: "#4f46e5", borderRadius: "12px 4px 12px 12px", padding: "10px 16px",
    maxWidth: "75%", color: "white",
  },
  studentText: { fontSize: 14, lineHeight: 1.6, margin: 0, color: "inherit" },
  checkpointBubble: {
    borderLeft: "3px solid #f59e0b", background: "#fffbeb",
  },
  checkpointLabel: {
    fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase" as const,
    letterSpacing: "0.05em", marginBottom: 6,
  },

  typingBubble: {
    background: "white", borderRadius: "4px 12px 12px 12px", padding: "14px 20px",
    border: "1px solid #e5e7eb", display: "flex", gap: 4, alignItems: "center",
  },
  dot1: {
    width: 6, height: 6, borderRadius: "50%", background: "#aaa",
    animation: "bounce 1.4s infinite", animationDelay: "0s",
  },
  dot2: {
    width: 6, height: 6, borderRadius: "50%", background: "#aaa",
    animation: "bounce 1.4s infinite", animationDelay: "0.2s",
  },
  dot3: {
    width: 6, height: 6, borderRadius: "50%", background: "#aaa",
    animation: "bounce 1.4s infinite", animationDelay: "0.4s",
  },

  inputArea: {
    display: "flex", gap: 8, padding: "12px 16px", background: "white",
    borderRadius: "0 0 12px 12px", border: "1px solid #e5e7eb", borderTop: "none",
    alignItems: "flex-end",
  },
  chatInput: {
    flex: 1, padding: "10px 14px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 10,
    resize: "none", fontFamily: "inherit", outline: "none", lineHeight: 1.5,
    minHeight: 42, maxHeight: 120,
  },
  sendBtn: {
    background: "#4f46e5", color: "white", border: "none", borderRadius: 10,
    padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0,
  },

  skipLink: {
    background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer",
    textDecoration: "underline", textAlign: "center", marginTop: 12, padding: 4,
  },

  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 16px", margin: "8px 0" },
  errorText: { fontSize: 13, color: "#dc2626", margin: 0 },
  retryBtn: {
    background: "transparent", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 6,
    padding: "4px 12px", fontSize: 12, cursor: "pointer", marginTop: 6,
  },
  loadingText: { fontSize: 14, color: "#888", marginTop: 16 },

  completedBanner: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 16, padding: "32px 24px", textAlign: "center" },
  completeCard: { background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: "32px 24px", textAlign: "center", marginTop: 16 },
  completeTick: { fontSize: 36, marginBottom: 8, color: "#22c55e" },
  completeMsg: { fontSize: 18, fontWeight: 600, color: "#1a1a2e", margin: "0 0 6px" },
  completeSub: { fontSize: 14, color: "#666", lineHeight: 1.5, margin: "0 0 4px" },
  completedDate: { fontSize: 13, color: "#888", marginTop: 4 },
  primaryBtn: {
    background: "#4f46e5", color: "white", border: "none", borderRadius: 10,
    padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
  secondaryBtn: {
    background: "transparent", color: "#4f46e5", border: "1px solid #4f46e5", borderRadius: 10,
    padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
  },
};
