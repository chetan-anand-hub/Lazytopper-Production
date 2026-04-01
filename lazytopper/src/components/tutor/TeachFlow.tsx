// src/components/tutor/TeachFlow.tsx
import { useState, useRef } from "react";
import { DiagramBlock } from "../DiagramBlock";

interface TeachFlowProps {
  topicKey: string;
  subject: string;
  grade: string;
  nodeId?: string;
  onComplete?: () => void;
}

type Phase = "intro" | "teaching" | "awaiting_answer" | "responding" | "complete";

interface TeachCard {
  goal?: string;
  goalLine?: string;
  keyIdeas?: string[];
  keyIdeaBullets?: string[];
  diagram?: { type?: string; altText?: string };
  checkpoint?: { question?: string; answer?: string };
}

function extractFeedbackText(payload: any): string {
  if (!payload) return "Good effort! Let's continue.";
  const d = payload.data ?? payload;
  const structured = d.structured ?? d;

  if (typeof d.feedback === "string" && d.feedback.trim())
    return d.feedback.trim();
  if (typeof d.responseText === "string" && d.responseText.trim())
    return d.responseText.trim();
  if (typeof structured.feedback === "string" && structured.feedback.trim())
    return structured.feedback.trim();

  if (structured.tutor && typeof structured.tutor === "object") {
    const tutor = structured.tutor;
    if (tutor.diagnosis && typeof tutor.diagnosis === "object") {
      const parts: string[] = [];
      if (tutor.diagnosis.analysis) parts.push(String(tutor.diagnosis.analysis));
      if (tutor.diagnosis.verdict) parts.push(String(tutor.diagnosis.verdict));
      if (parts.length > 0) return parts.join(" ");
    }
    if (typeof tutor.explanation === "string" && tutor.explanation.trim())
      return tutor.explanation.trim();
    if (typeof tutor.tutor === "string" && tutor.tutor.trim())
      return tutor.tutor.trim();
  }

  if (typeof structured.commonMistake === "string" && structured.commonMistake.trim())
    return "Watch out: " + structured.commonMistake.trim();
  if (typeof structured.checkpointAnswer === "string" && structured.checkpointAnswer.trim())
    return structured.checkpointAnswer.trim();

  if (typeof d.text === "string" && d.text.trim()) {
    try {
      const parsed = JSON.parse(d.text);
      if (parsed.checkpointAnswer) return String(parsed.checkpointAnswer).trim();
      if (parsed.commonMistake) return "Watch out: " + String(parsed.commonMistake).trim();
      if (parsed.goalLine) return String(parsed.goalLine).trim();
    } catch {}
    return d.text.trim().slice(0, 500);
  }

  if (typeof payload.message === "string" && payload.message.trim())
    return payload.message.trim();

  return "Good effort! Let's continue.";
}

function extractTeachCard(payload: any): TeachCard | null {
  if (!payload) return null;
  if (payload.teach && typeof payload.teach === "object")
    return payload.teach as TeachCard;
  if (payload.data?.teach && typeof payload.data.teach === "object")
    return payload.data.teach as TeachCard;

  const data = payload.data ?? null;
  const structured = (data && data.structured) || payload.structured || null;
  if (structured && (structured.goalLine || structured.keyIdeas || structured.checkpointQuestion)) {
    return {
      goal: structured.goalLine ?? "",
      goalLine: structured.goalLine ?? "",
      keyIdeas: Array.isArray(structured.keyIdeas) ? structured.keyIdeas : [],
      checkpoint: {
        question: structured.checkpointQuestion ?? structured.checkpoint?.question ?? "",
        answer: structured.checkpointAnswer ?? structured.checkpoint?.answer ?? "",
      },
      diagram: structured.diagram ?? undefined,
    };
  }

  const d = data ?? payload;
  if (d && (d.goalLine || d.keyIdeas || d.checkpointQuestion)) {
    return {
      goal: d.goalLine ?? "",
      goalLine: d.goalLine ?? "",
      keyIdeas: Array.isArray(d.keyIdeas) ? d.keyIdeas : [],
      checkpoint: {
        question: d.checkpointQuestion ?? d.checkpoint?.question ?? "",
        answer: d.checkpointAnswer ?? d.checkpoint?.answer ?? "",
      },
      diagram: d.diagram ?? undefined,
    };
  }

  if (typeof d?.text === "string" && d.text.trim()) {
    try {
      const parsed = JSON.parse(d.text);
      if (parsed.goalLine || parsed.keyIdeas) {
        return {
          goal: parsed.goalLine ?? "",
          goalLine: parsed.goalLine ?? "",
          keyIdeas: Array.isArray(parsed.keyIdeas) ? parsed.keyIdeas : [],
          checkpoint: {
            question: parsed.checkpointQuestion ?? "",
            answer: parsed.checkpointAnswer ?? "",
          },
          diagram: parsed.diagram ?? undefined,
        };
      }
    } catch {}
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
};

export function TeachFlow({ topicKey, subject, grade, nodeId, onComplete }: TeachFlowProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepCount, setStepCount] = useState(0);
  const [teachCard, setTeachCard] = useState<TeachCard | null>(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [aiFeedback, setAiFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  async function callMentor(body: object): Promise<any> {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: (body as any).mode,
          messages: (body as any).messages,
          payload: body,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const raw = await res.text();
      let payload: any = {};
      try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { text: raw }; }
      if (!res.ok) throw new Error(payload?.error || payload?.message || `Server error ${res.status}`);
      return payload;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === "AbortError") throw new Error("The tutor is taking too long. Please try again.");
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
      const card = extractTeachCard(payload) || extractTeachCard(payload?.data);
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
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
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
      const data = payload?.data ?? payload;
      const feedback = extractFeedbackText(data);
      const nextCard = extractTeachCard(data);
      setAiFeedback(feedback);
      setHistory([...newHistory, { role: "assistant", content: feedback }]);
      if (nextCard) setTeachCard(nextCard);
      setStudentAnswer("");
      const nextStep = stepCount + 1;
      setStepCount(nextStep);
      setPhase(nextStep >= 3 ? "complete" : "awaiting_answer");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
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
    setPhase("intro");
    setStepCount(0);
    setTeachCard(null);
    setStudentAnswer("");
    setAiFeedback("");
    setError(null);
    setHistory([]);
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
            <button style={styles.skipBtn} onClick={() => setPhase("complete")}>
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
