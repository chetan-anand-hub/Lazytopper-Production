import React, { useMemo } from "react";
import { MathText } from "../question/MathText";

export interface StructuredGoal {
  goalLine?: string;
  keyIdeas?: string[];
}

export interface StructuredExample {
  question?: string;
  steps?: Array<{ text: string; marks?: number }>;
  totalMarks?: number;
  finalAnswer?: string;
}

export interface StructuredSection {
  goal?: StructuredGoal;
  examLines?: string[];
  workedExamples?: StructuredExample[];
  checkpoint?: { question?: string; answer?: string };
  commonMistake?: string;
  commonFix?: string;
}

interface TutorMessageRendererProps {
  content: string;
  structured?: StructuredSection | null;
  role?: "tutor" | "student";
  isCheckpoint?: boolean;
}

type MdNode =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "blockquote"; text: string }
  | { kind: "code"; lang: string; lines: string[] }
  | { kind: "hr" }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string };

function parseMd(raw: string): MdNode[] {
  const lines = raw.split("\n");
  const nodes: MdNode[] = [];
  let i = 0;
  let ulBuf: string[] = [];
  let olBuf: string[] = [];

  const flushUl = () => {
    if (ulBuf.length) {
      nodes.push({ kind: "ul", items: [...ulBuf] });
      ulBuf = [];
    }
  };
  const flushOl = () => {
    if (olBuf.length) {
      nodes.push({ kind: "ol", items: [...olBuf] });
      olBuf = [];
    }
  };
  const flush = () => { flushUl(); flushOl(); };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { flush(); i++; continue; }

    if (trimmed.startsWith("```")) {
      flush();
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({ kind: "code", lang, lines: codeLines });
      i++;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      flush();
      nodes.push({ kind: "hr" });
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flush();
      nodes.push({ kind: "h3", text: trimmed.slice(4) });
      i++;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flush();
      nodes.push({ kind: "h2", text: trimmed.slice(3) });
      i++;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flush();
      nodes.push({ kind: "h2", text: trimmed.slice(2) });
      i++;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flush();
      nodes.push({ kind: "blockquote", text: trimmed.slice(2) });
      i++;
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*\u2022]\s+(.+)/);
    if (bulletMatch) {
      flushOl();
      ulBuf.push(bulletMatch[1]);
      i++;
      continue;
    }

    const numMatch = trimmed.match(/^\d+[.)]\s+(.+)/);
    if (numMatch) {
      flushUl();
      olBuf.push(numMatch[1]);
      i++;
      continue;
    }

    flush();
    nodes.push({ kind: "p", text: trimmed });
    i++;
  }
  flush();
  return nodes;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const codeMatch = remaining.match(/`([^`]+)`/);

    let earliest = remaining.length;
    let matchType: "bold" | "italic" | "code" | null = null;
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
    if (italicMatch && italicMatch.index !== undefined && italicMatch.index < earliest && matchType !== "bold") {
      earliest = italicMatch.index;
      matchType = "italic";
      match = italicMatch;
    }

    if (!matchType || !match || match.index === undefined) {
      parts.push(<MathText key={key++} text={remaining} style={{ fontSize: "inherit", lineHeight: "inherit" }} />);
      break;
    }

    if (match.index > 0) {
      parts.push(<MathText key={key++} text={remaining.slice(0, match.index)} style={{ fontSize: "inherit", lineHeight: "inherit" }} />);
    }

    if (matchType === "bold") {
      parts.push(<strong key={key++} style={{ fontWeight: 700, color: "#1a1a2e" }}><MathText text={match[1]} style={{ fontSize: "inherit", lineHeight: "inherit" }} /></strong>);
    } else if (matchType === "italic") {
      parts.push(<em key={key++}><MathText text={match[1]} style={{ fontSize: "inherit", lineHeight: "inherit" }} /></em>);
    } else {
      parts.push(
        <code key={key++} style={{
          background: "#f0f4f8",
          padding: "2px 6px",
          borderRadius: 6,
          fontSize: "0.9em",
          fontFamily: "'Fira Code', 'Consolas', monospace",
          color: "#1e40af",
          border: "1px solid #e2e8f0",
        }}>
          {match[1]}
        </code>
      );
    }

    remaining = remaining.slice(match.index + match[0].length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderMdNodes(nodes: MdNode[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.kind) {
      case "h2":
        return (
          <h3 key={i} style={{
            fontSize: 17,
            fontWeight: 800,
            color: "#1a1a2e",
            margin: "16px 0 8px",
            lineHeight: 1.4,
          }}>
            {renderInline(node.text)}
          </h3>
        );
      case "h3":
        return (
          <h4 key={i} style={{
            fontSize: 15,
            fontWeight: 700,
            color: "#3c3c3c",
            margin: "12px 0 6px",
            lineHeight: 1.4,
          }}>
            {renderInline(node.text)}
          </h4>
        );
      case "blockquote":
        return (
          <blockquote key={i} style={{
            borderLeft: "3px solid #1cb0f6",
            paddingLeft: 14,
            margin: "10px 0",
            color: "#475569",
            fontStyle: "italic",
            lineHeight: 1.7,
          }}>
            {renderInline(node.text)}
          </blockquote>
        );
      case "code":
        return (
          <pre key={i} style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: "12px 16px",
            margin: "10px 0",
            overflowX: "auto",
            fontSize: 13,
            lineHeight: 1.6,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            color: "#1e293b",
          }}>
            {node.lines.join("\n")}
          </pre>
        );
      case "hr":
        return <hr key={i} style={{ border: "none", borderTop: "1px solid #e5e5e5", margin: "14px 0" }} />;
      case "ul":
        return (
          <ul key={i} style={{ paddingLeft: 22, margin: "8px 0", listStyleType: "disc" }}>
            {node.items.map((item, j) => (
              <li key={j} style={{ fontSize: 15, lineHeight: 1.7, color: "#3c3c3c", marginBottom: 4, paddingLeft: 4 }}>
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
      case "ol":
        return (
          <ol key={i} style={{ paddingLeft: 22, margin: "8px 0" }}>
            {node.items.map((item, j) => (
              <li key={j} style={{ fontSize: 15, lineHeight: 1.7, color: "#3c3c3c", marginBottom: 4, paddingLeft: 4 }}>
                {renderInline(item)}
              </li>
            ))}
          </ol>
        );
      case "p":
        return (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.7, color: "#3c3c3c", margin: "6px 0" }}>
            {renderInline(node.text)}
          </p>
        );
    }
  });
}

function GoalBanner({ goal }: { goal: StructuredGoal }) {
  return (
    <div style={{
      background: "#f0fdf4",
      border: "2px solid #bbf7d0",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#16a34a", marginBottom: 6 }}>
        Goal
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#15803d", lineHeight: 1.5 }}>
        <MathText text={goal.goalLine || ""} />
      </div>
      {goal.keyIdeas && goal.keyIdeas.length > 0 && (
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, listStyleType: "none" }}>
          {goal.keyIdeas.map((idea, i) => (
            <li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "#166534", marginBottom: 4, position: "relative", paddingLeft: 4 }}>
              <span style={{ position: "absolute", left: -16, color: "#22c55e" }}>{"\u2713"}</span>
              <MathText text={idea} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExamLinesSection({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div style={{
      background: "#eff6ff",
      border: "2px solid #bfdbfe",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#2563eb", marginBottom: 8 }}>
        Board exam lines
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "#1e40af", marginBottom: 4 }}>
          <MathText text={line} />
        </div>
      ))}
    </div>
  );
}

export function StepsWithMarks({ steps, totalMarks, commonMistake }: {
  steps: Array<{ text: string; marks?: number }>;
  totalMarks?: number;
  commonMistake?: string;
}) {
  if (!steps || steps.length === 0) return null;
  const sumMarks = steps.reduce((acc, s) => acc + (s.marks != null && Number.isFinite(s.marks) ? s.marks : 0), 0);
  const displayTotal = totalMarks != null && Number.isFinite(totalMarks) ? totalMarks : sumMarks > 0 ? sumMarks : null;
  const formatMarks = (m: number) => m % 1 === 0 ? String(m) : m.toFixed(1);

  return (
    <div>
      {displayTotal != null && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          padding: "8px 14px",
          background: "#f0fdf4",
          borderRadius: 12,
          border: "2px solid #bbf7d0",
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#58cc02" }}>{formatMarks(displayTotal)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>marks total</span>
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: "10px 14px",
            background: "#ffffff",
            borderRadius: 12,
            border: "2px solid #e5e5e5",
            boxShadow: "0 2px 0 #e5e5e5",
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "#58cc02",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: "0 2px 0 #46a302",
            }}>
              {idx + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "#3c3c3c" }}>
                <MathText text={step.text} />
              </div>
            </div>
            {step.marks != null && Number.isFinite(step.marks) && (
              <div style={{
                flexShrink: 0,
                padding: "4px 10px",
                borderRadius: 999,
                background: "#f7f7f7",
                border: "2px solid #e5e5e5",
                fontSize: 12,
                fontWeight: 800,
                color: "#3c3c3c",
                whiteSpace: "nowrap",
              }}>
                {formatMarks(step.marks)}M
              </div>
            )}
          </div>
        ))}
      </div>
      {commonMistake && (
        <div style={{
          marginTop: 10,
          padding: "8px 14px",
          background: "#fef2f2",
          borderRadius: 12,
          border: "2px solid #fecaca",
          borderLeft: "4px solid #ef4444",
          fontSize: 13,
          lineHeight: 1.6,
          color: "#991b1b",
        }}>
          <span style={{ fontWeight: 800 }}>Common mistake: </span>
          <MathText text={commonMistake} />
        </div>
      )}
    </div>
  );
}

function WorkedExampleCard({ example, index }: { example: StructuredExample; index: number }) {
  return (
    <div style={{
      background: "#ffffff",
      border: "2px solid #e5e5e5",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 12,
      boxShadow: "0 2px 0 #e5e5e5",
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#3c3c3c", marginBottom: 8 }}>
        {index === 0 ? "Example: Basic" : "Example: Board-style"}
      </div>
      {example.question && (
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "#475569", marginBottom: 8 }}>
          <MathText text={example.question} />
        </div>
      )}
      {example.steps && example.steps.length > 0 && (
        <StepsWithMarks steps={example.steps} totalMarks={example.totalMarks} />
      )}
      {example.finalAnswer && (
        <div style={{
          marginTop: 8,
          padding: "8px 12px",
          background: "#f0fdf4",
          borderRadius: 10,
          border: "1px solid #bbf7d0",
          fontSize: 14,
          fontWeight: 600,
          color: "#15803d",
        }}>
          Final: <MathText text={example.finalAnswer} />
        </div>
      )}
    </div>
  );
}

function CheckpointCard({ question, answer }: { question?: string; answer?: string }) {
  if (!question) return null;
  return (
    <div style={{
      background: "#fffbeb",
      border: "2px solid #fde68a",
      borderLeft: "4px solid #f59e0b",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#d97706", marginBottom: 8 }}>
        Your turn
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.7, color: "#92400e", fontWeight: 600 }}>
        <MathText text={question} />
      </div>
      {answer && (
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#a16207" }}>
          Good answer: <MathText text={answer} />
        </div>
      )}
    </div>
  );
}

function WatchOutCallout({ mistake, fix }: { mistake?: string; fix?: string }) {
  if (!mistake) return null;
  return (
    <div style={{
      background: "#fef2f2",
      border: "2px solid #fecaca",
      borderLeft: "4px solid #ef4444",
      borderRadius: 14,
      padding: "14px 18px",
      marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#dc2626", marginBottom: 8 }}>
        Watch out
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "#991b1b" }}>
        <MathText text={mistake} />
      </div>
      {fix && (
        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#b91c1c" }}>
          Fix: <MathText text={fix} />
        </div>
      )}
    </div>
  );
}

export function TutorMessageRenderer({ content, structured, isCheckpoint }: TutorMessageRendererProps) {
  const mdNodes = useMemo(() => parseMd(content || ""), [content]);

  return (
    <div style={{ fontSize: 15, lineHeight: 1.7, color: "#3c3c3c" }}>
      {isCheckpoint && (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#d97706",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 8,
        }}>
          Think about this
        </div>
      )}

      {structured?.goal && <GoalBanner goal={structured.goal} />}
      {structured?.examLines && structured.examLines.length > 0 && (
        <ExamLinesSection lines={structured.examLines} />
      )}
      {structured?.workedExamples && structured.workedExamples.length > 0 && (
        structured.workedExamples.map((ex, i) => (
          <WorkedExampleCard key={i} example={ex} index={i} />
        ))
      )}
      {structured?.checkpoint && (
        <CheckpointCard question={structured.checkpoint.question} answer={structured.checkpoint.answer} />
      )}
      {structured?.commonMistake && (
        <WatchOutCallout mistake={structured.commonMistake} fix={structured.commonFix} />
      )}

      {content && renderMdNodes(mdNodes)}
    </div>
  );
}

export function TutorBubble({
  role,
  children,
  showLabel,
}: {
  role: "tutor" | "student";
  children: React.ReactNode;
  showLabel?: boolean;
}) {
  const isTutor = role === "tutor";
  return (
    <div style={{
      display: "flex",
      justifyContent: isTutor ? "flex-start" : "flex-end",
      marginBottom: 16,
    }}>
      {isTutor && (
        <div style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#58cc02",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 800,
          flexShrink: 0,
          marginRight: 10,
          marginTop: 2,
          boxShadow: "0 2px 0 #46a302",
        }}>
          RS
        </div>
      )}
      <div style={{
        maxWidth: "85%",
        borderRadius: isTutor ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        padding: "14px 18px",
        background: isTutor ? "#ffffff" : "#dbeafe",
        border: isTutor ? "2px solid #e5e5e5" : "2px solid #93c5fd",
        boxShadow: isTutor ? "0 2px 0 #e5e5e5" : "0 2px 0 #93c5fd",
        color: "#3c3c3c",
      }}>
        {showLabel && (
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            color: isTutor ? "#58cc02" : "#2563eb",
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}>
            {isTutor ? "Ravi Sir" : "You"}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div style={{ display: "flex", marginBottom: 16 }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#58cc02",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 800,
        flexShrink: 0,
        marginRight: 10,
        marginTop: 2,
        boxShadow: "0 2px 0 #46a302",
      }}>
        RS
      </div>
      <div style={{
        borderRadius: "4px 16px 16px 16px",
        padding: "14px 20px",
        background: "#ffffff",
        border: "2px solid #e5e5e5",
        boxShadow: "0 2px 0 #e5e5e5",
        display: "flex",
        gap: 5,
        alignItems: "center",
      }}>
        <style>{`
          @keyframes tutorDotBounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-6px); }
          }
        `}</style>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#58cc02",
            display: "inline-block",
            animation: `tutorDotBounce 1.2s infinite`,
            animationDelay: `${i * 0.15}s`,
          }} />
        ))}
        <span style={{ fontSize: 13, color: "#afafaf", marginLeft: 8, fontStyle: "italic" }}>
          Thinking...
        </span>
      </div>
    </div>
  );
}
