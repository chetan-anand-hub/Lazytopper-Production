import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  loadTopicMasterySnapshot,
  saveTopicMasterySnapshot,
  upsertNodeProgress,
} from "../../services/topicHubMastery";
import { TutorMessageRenderer } from "./TutorMessageRenderer";
import { extractTutorText as sharedExtractTutorText, extractStructuredSection, extractStepsBlock, stepsDataToStructured } from "./tutorStructuredExtract";
import { VisualExplainer } from "../VisualExplainer";
import { findVisualForConcept } from "../../data/visualConceptRegistry";

export interface ConceptContext {
  questionText?: string;
  marks?: number;
  subtopic?: string;
  concept?: string;
}

interface TeachFlowProps {
  topicKey: string;
  subject: string;
  grade: string;
  nodeId?: string;
  onComplete?: () => void;
  conceptContext?: ConceptContext;
}

type Phase = "intro" | "teaching" | "awaiting_answer" | "responding" | "complete" | "previously_completed";

interface ChatMessage {
  role: "tutor" | "student";
  content: string;
  isCheckpoint?: boolean;
  structured?: import("./TutorMessageRenderer").StructuredSection | null;
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

const QUICK_ACTIONS = [
  { label: "I don't understand \u{1F914}", message: "I don't understand this. Can you explain it in a simpler way with a different example?" },
  { label: "Give me an example \u{1F4A1}", message: "Can you give me a concrete example with numbers to help me understand this better?" },
  { label: "Why is this important? \u{1F3AF}", message: "Why is this important? How does this come in CBSE board exams?" },
  { label: "Show me the steps \u{270F}\u{FE0F}", message: "Can you show me the step-by-step solution? I want to see how to write it in the exam." },
];

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

const extractTutorText = sharedExtractTutorText;

function formatTopicName(topicKey: string): string {
  return topicKey
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function TeachFlow({ topicKey, subject, grade, nodeId, onComplete, conceptContext }: TeachFlowProps) {
  const isConceptMode = Boolean(conceptContext);
  const wasCompleted = isConceptMode ? false : hasTopicBeenCompleted(topicKey);
  const savedSession = isConceptMode ? null : loadSessionState(topicKey);
  const topicDisplayName = formatTopicName(topicKey);

  const visualConcept = useMemo(() => {
    const searchTerms = [
      topicKey,
      conceptContext?.subtopic,
      conceptContext?.concept,
      nodeId,
    ].filter(Boolean) as string[];
    return findVisualForConcept(subject, topicKey, searchTerms);
  }, [topicKey, subject, conceptContext?.subtopic, conceptContext?.concept, nodeId]);

  const [phase, setPhase] = useState<Phase>(
    savedSession ? savedSession.phase : wasCompleted ? "previously_completed" : "intro"
  );
  const conceptAutoStartRef = useRef(false);
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
    if (isConceptMode) return;
    if (phase === "complete" || phase === "previously_completed" || phase === "intro") return;
    saveSessionState(topicKey, {
      topicKey,
      phase,
      stepCount,
      chatMessages,
      savedAt: Date.now(),
    });
  }, [topicKey, phase, stepCount, chatMessages, isConceptMode]);

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

  useEffect(() => {
    if (isConceptMode && phase === "intro" && !conceptAutoStartRef.current) {
      conceptAutoStartRef.current = true;
      startLearning();
    }
  });

  function markComplete() {
    if (isConceptMode) return;
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
    const timeoutId = setTimeout(() => controller.abort(), 30000);
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
        mode: conceptContext ? "concept_teach" : "learn_teach",
        section: "learn",
        subSection: conceptContext ? "concept_teach" : "teach",
        selectedTab: "teach",
        topic: topicKey,
        subject,
        grade,
        nodeId: nodeId ?? `${topicKey}-step-1`,
        messages: [],
        conversational: true,
        stepIndex: 0,
        ...(conceptContext ? {
          conceptContext: {
            questionText: conceptContext.questionText,
            marks: conceptContext.marks,
            subtopic: conceptContext.subtopic,
            concept: conceptContext.concept,
          },
        } : {}),
      });

      let tutorText = extractTutorText(payload);

      if (!tutorText) {
        tutorText = `Hey there! \u{1F44B} I'm Ravi Sir, and I'm excited to explore **${topicDisplayName}** with you today!\n\nLet me start with something you already know. Think about when you share a pizza equally among friends \u2014 that's actually math in action!\n\nReady to dive in? Tell me \u2014 what do you already know about ${topicDisplayName}?`;
      }

      let structuredData = extractStructuredSection(payload);

      const { cleanText: cleanedStart, stepsData: startSteps } = extractStepsBlock(tutorText);
      if (startSteps) {
        tutorText = cleanedStart;
        const startStructured = stepsDataToStructured(startSteps);
        structuredData = structuredData
          ? { ...structuredData, workedExamples: [...(structuredData.workedExamples || []), ...(startStructured.workedExamples || [])] }
          : startStructured;
      }

      const newMessages: ChatMessage[] = [
        { role: "tutor", content: tutorText, structured: structuredData },
      ];

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

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? studentInput).trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setPhase("responding");
    if (!overrideText) setStudentInput("");

    const updatedMessages: ChatMessage[] = [...chatMessages, { role: "student", content: text }];
    setChatMessages(updatedMessages);

    try {
      const conversationHistory = buildConversationMessages();
      conversationHistory.push({ role: "user", content: text });

      const nextStep = stepCount + 1;
      const isNearEnd = nextStep >= MAX_TEACH_STEPS;

      const payload = await callMentor({
        mode: conceptContext ? "concept_teach" : "learn_teach",
        section: "learn",
        subSection: conceptContext ? "concept_teach" : "teach",
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
        ...(conceptContext ? { conceptContext } : {}),
      });

      let tutorText = extractTutorText(payload);

      if (!tutorText) {
        tutorText = nextStep < MAX_TEACH_STEPS
          ? "Great thinking! Let me build on that with the next idea..."
          : "Brilliant work today! You've covered the core concepts of this topic. Keep practicing and you'll ace this in the board exam! \u{1F4AA}";
      }

      let responseStructured = extractStructuredSection(payload);

      const { cleanText, stepsData } = extractStepsBlock(tutorText);
      if (stepsData) {
        tutorText = cleanText;
        const stepsStructured = stepsDataToStructured(stepsData);
        if (responseStructured) {
          responseStructured.workedExamples = [
            ...(responseStructured.workedExamples || []),
            ...(stepsStructured.workedExamples || []),
          ];
          if (!responseStructured.commonMistake && stepsStructured.commonMistake) {
            responseStructured.commonMistake = stepsStructured.commonMistake;
          }
        } else {
          responseStructured = stepsStructured;
        }
      }

      const newTutorMessages: ChatMessage[] = [
        ...updatedMessages,
        { role: "tutor", content: tutorText, structured: responseStructured },
      ];

      setChatMessages(newTutorMessages);
      setStepCount(nextStep);

      if (nextStep >= MAX_TEACH_STEPS) {
        markComplete();
        if (isConceptMode && onComplete) {
          onComplete();
        } else {
          setPhase("complete");
        }
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

  function handleQuickAction(message: string) {
    sendMessage(message);
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
          <div style={s.introAvatarLarge}>RS</div>
          <h2 style={s.introTitle}>{topicDisplayName}</h2>
          <p style={s.introSub}>
            Meet Ravi Sir &mdash; your personal AI tutor. He'll explain {topicDisplayName} through real examples,
            ask you questions, and help you understand at your own pace. Ask anything!
          </p>
          <div style={s.introFeatures}>
            <div style={s.introFeature}>
              <span style={s.featureIcon}>&#128172;</span>
              <span>Learn through examples</span>
            </div>
            <div style={s.introFeature}>
              <span style={s.featureIcon}>&#10067;</span>
              <span>Ask any question</span>
            </div>
            <div style={s.introFeature}>
              <span style={s.featureIcon}>&#127919;</span>
              <span>Board exam tips</span>
            </div>
          </div>
          {loading && <p style={s.loadingText}>Ravi Sir is preparing your lesson...</p>}
          {error && (
            <div style={s.errorBox}>
              <p style={s.errorText}>{error}</p>
              <button style={s.retryBtn} onClick={startLearning}>Retry</button>
            </div>
          )}
          {!loading && !error && (
            <button style={s.startBtn} onClick={startLearning}>
              Start Learning with Ravi Sir
            </button>
          )}
        </div>
      </div>
    );
  }

  const showChatUI = phase === "teaching" || phase === "awaiting_answer" || phase === "responding" || phase === "complete";

  if (!showChatUI) return null;

  return (
    <div style={s.container}>
      <div style={s.chatHeader}>
        <div style={s.chatHeaderLeft}>
          <div style={s.headerAvatar}>RS</div>
          <div>
            <div style={s.headerTitle}>Ravi Sir &middot; {topicDisplayName}</div>
            <div style={s.headerSub}>
              {phase === "complete"
                ? "Lesson complete!"
                : `Step ${stepCount} of ${MAX_TEACH_STEPS}`}
            </div>
          </div>
        </div>
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${(stepCount / MAX_TEACH_STEPS) * 100}%` }} />
        </div>
      </div>

      {visualConcept && (
        <div style={s.visualPanel}>
          <VisualExplainer
            src={visualConcept.filePath}
            title={visualConcept.title}
            height={360}
            collapsible={true}
            defaultCollapsed={false}
          />
        </div>
      )}

      <div style={s.chatArea}>
        {chatMessages.map((msg, idx) => (
          <div key={idx} style={msg.role === "tutor" ? s.tutorBubbleWrap : s.studentBubbleWrap}>
            {msg.role === "tutor" && <div style={s.tutorAvatar}>RS</div>}
            <div style={{
              ...(msg.role === "tutor" ? s.tutorBubble : s.studentBubble),
              ...(msg.isCheckpoint ? s.checkpointBubble : {}),
            }}>
              {msg.role === "tutor" ? <TutorMessageRenderer content={msg.content} isCheckpoint={msg.isCheckpoint} structured={msg.structured} /> : <p style={s.studentText}>{msg.content}</p>}
            </div>
          </div>
        ))}

        {loading && (
          <div style={s.tutorBubbleWrap}>
            <div style={s.tutorAvatar}>RS</div>
            <div style={s.typingBubble}>
              <span style={s.dot1} /><span style={s.dot2} /><span style={s.dot3} />
              <span style={s.typingLabel}>Ravi Sir is typing...</span>
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

      {phase === "complete" && (
        <div style={s.completeCard}>
          <div style={s.completeTick}>&#127942;</div>
          <p style={s.completeMsg}>Great session on {topicDisplayName}!</p>
          <p style={s.completeSub}>You've worked through the key concepts with Ravi Sir. Ready to test yourself?</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 16 }}>
            <button style={s.primaryBtn} onClick={() => onComplete?.()}>
              Try Practice Questions
            </button>
            <button style={s.secondaryBtn} onClick={reset}>
              Learn Again
            </button>
          </div>
        </div>
      )}

      {phase === "awaiting_answer" && !loading && (
        <div style={s.quickActionsWrap}>
          {QUICK_ACTIONS.map((action, idx) => (
            <button
              key={idx}
              style={s.quickActionBtn}
              onClick={() => handleQuickAction(action.message)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {(phase === "awaiting_answer" || phase === "responding") && (
        <div style={s.inputArea}>
          <textarea
            ref={inputRef}
            style={s.chatInput}
            placeholder="Type your answer, ask a question, or say 'I don't understand'..."
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
            onClick={() => sendMessage()}
            disabled={loading || !studentInput.trim()}
          >
            Send
          </button>
        </div>
      )}

      {stepCount >= 2 && phase === "awaiting_answer" && (
        <button
          style={s.skipLink}
          onClick={() => {
            markComplete();
            if (isConceptMode && onComplete) {
              onComplete();
            } else {
              setPhase("complete");
            }
          }}
        >
          {isConceptMode ? "I understand — close" : "I understand this topic — skip to practice"}
        </button>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 920, margin: "0 auto", padding: "16px 16px 24px", display: "flex", flexDirection: "column", width: "100%" },
  visualPanel: { padding: "0 0 4px", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb", background: "#f8f9fb" },

  introCard: { background: "white", borderRadius: 16, padding: "32px 24px", textAlign: "center", border: "1px solid #e5e7eb" },
  introAvatarLarge: {
    width: 56, height: 56, borderRadius: "50%", background: "#58cc02",
    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 20, fontWeight: 700, margin: "0 auto 16px", letterSpacing: 1,
    boxShadow: "0 4px 0 #46a302",
  },
  introTitle: { fontSize: 22, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" },
  introSub: { fontSize: 14, color: "#666", lineHeight: 1.6, maxWidth: 440, margin: "0 auto 20px" },
  introFeatures: { display: "flex", justifyContent: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" },
  introFeature: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#555" },
  featureIcon: { fontSize: 16 },
  startBtn: {
    background: "#58cc02", color: "white", border: "none",
    borderRadius: 12, padding: "12px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer",
    transition: "transform 0.2s", boxShadow: "0 4px 0 #46a302",
  },

  chatHeader: {
    background: "white", borderRadius: "12px 12px 0 0", padding: "12px 16px", borderBottom: "1px solid #e5e7eb",
    marginBottom: 0,
  },
  chatHeaderLeft: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "#58cc02", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800,
    letterSpacing: 0.5, boxShadow: "0 2px 0 #46a302",
  },
  headerTitle: { fontSize: 15, fontWeight: 600, color: "#1a1a2e" },
  headerSub: { fontSize: 12, color: "#888" },
  progressBar: {
    height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "#58cc02", borderRadius: 2,
    transition: "width 0.4s ease",
  },

  chatArea: {
    background: "#f8f9fb", padding: "16px 16px", minHeight: 300, maxHeight: "70vh",
    overflowY: "auto", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb",
  },

  tutorBubbleWrap: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14 },
  studentBubbleWrap: { display: "flex", justifyContent: "flex-end", marginBottom: 14 },
  tutorAvatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "#58cc02", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800,
    flexShrink: 0, marginTop: 2, letterSpacing: 0.5, boxShadow: "0 2px 0 #46a302",
  },
  tutorBubble: {
    background: "white", borderRadius: "4px 16px 16px 16px", padding: "14px 18px",
    maxWidth: "92%", border: "2px solid #e5e5e5", boxShadow: "0 2px 0 #e5e5e5",
  },
  studentBubble: {
    background: "#dbeafe", borderRadius: "16px 4px 16px 16px",
    padding: "14px 18px", maxWidth: "85%", color: "#3c3c3c",
    border: "2px solid #93c5fd", boxShadow: "0 2px 0 #93c5fd",
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
    background: "white", borderRadius: "4px 14px 14px 14px", padding: "12px 18px",
    border: "1px solid #e5e7eb", display: "flex", gap: 4, alignItems: "center",
  },
  dot1: {
    width: 6, height: 6, borderRadius: "50%", background: "#58cc02",
    animation: "bounce 1.4s infinite", animationDelay: "0s",
  },
  dot2: {
    width: 6, height: 6, borderRadius: "50%", background: "#58cc02",
    animation: "bounce 1.4s infinite", animationDelay: "0.2s",
  },
  dot3: {
    width: 6, height: 6, borderRadius: "50%", background: "#58cc02",
    animation: "bounce 1.4s infinite", animationDelay: "0.4s",
  },
  typingLabel: {
    fontSize: 12, color: "#888", marginLeft: 8, fontStyle: "italic",
  },

  quickActionsWrap: {
    display: "flex", flexWrap: "wrap", gap: 8, padding: "10px 16px",
    background: "white", borderLeft: "1px solid #e5e7eb", borderRight: "1px solid #e5e7eb",
  },
  quickActionBtn: {
    background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 20,
    padding: "6px 14px", fontSize: 12, color: "#555", cursor: "pointer",
    transition: "all 0.2s", fontWeight: 500, whiteSpace: "nowrap",
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
    background: "#58cc02", color: "white", border: "none",
    borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0,
    boxShadow: "0 4px 0 #46a302",
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
  completeCard: { background: "white", border: "1px solid #e5e7eb", borderRadius: "0 0 16px 16px", padding: "32px 24px", textAlign: "center" },
  completeTick: { fontSize: 36, marginBottom: 8 },
  completeMsg: { fontSize: 18, fontWeight: 600, color: "#1a1a2e", margin: "0 0 6px" },
  completeSub: { fontSize: 14, color: "#666", lineHeight: 1.5, margin: "0 0 4px" },
  completedDate: { fontSize: 13, color: "#888", marginTop: 4 },
  primaryBtn: {
    background: "#58cc02", color: "white", border: "none",
    borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 4px 0 #46a302",
  },
  secondaryBtn: {
    background: "transparent", color: "#1cb0f6", border: "2px solid #1cb0f6", borderRadius: 12,
    padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
};
