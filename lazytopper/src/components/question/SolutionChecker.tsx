import { useState, useRef, useCallback } from "react";
import { checkSolutionImage, type CheckSolutionResponse, type MistakeType } from "../../ai/aiClient";
import { useAuth } from "../../context/AuthContext";
import { logMistakes } from "../../services/mistakeLogService";

interface SolutionCheckerProps {
  question: string;
  marks: number;
  subject: string;
  topic: string;
  onRequestStepSolution?: () => void;
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_PDF_BYTES = 5 * 1024 * 1024;

const STATUS_STYLE: Record<string, { border: string; bg: string; badge: string; badgeBg: string }> = {
  correct:   { border: "rgba(34,197,94,0.35)",  bg: "rgba(34,197,94,0.05)",   badge: "#22c55e", badgeBg: "rgba(34,197,94,0.12)"  },
  partial:   { border: "rgba(251,191,36,0.35)",  bg: "rgba(251,191,36,0.05)", badge: "#fbbf24", badgeBg: "rgba(251,191,36,0.12)" },
  incorrect: { border: "rgba(239,68,68,0.4)",   bg: "rgba(239,68,68,0.05)",   badge: "#ef4444", badgeBg: "rgba(239,68,68,0.12)"  },
  missing:   { border: "rgba(148,163,184,0.25)", bg: "var(--bg-card)",         badge: "#94a3b8", badgeBg: "rgba(148,163,184,0.1)" },
};

const MISTAKE_BADGE: Record<MistakeType, { label: string; color: string; bg: string }> = {
  conceptual:   { label: "Conceptual",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
  calculation:  { label: "Calculation",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  silly:        { label: "Silly",        color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  presentation: { label: "Presentation", color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
};

function MistakeBadge({ type }: { type: MistakeType | null }) {
  if (!type) return null;
  const b = MISTAKE_BADGE[type];
  return (
    <span style={{
      fontSize: "0.63rem", fontWeight: 700, padding: "2px 6px",
      borderRadius: 999, color: b.color, background: b.bg,
      letterSpacing: "0.02em", textTransform: "uppercase",
      flexShrink: 0,
    }}>
      {b.label}
    </span>
  );
}

function AnnotatedStepCard({ step }: { step: CheckSolutionResponse["annotatedSteps"][0] }) {
  const [showCorrected, setShowCorrected] = useState(false);
  const ss = STATUS_STYLE[step.status] || STATUS_STYLE.partial;
  const isNegative = step.marksAwarded === 0 && step.status !== "correct";
  const marksColor = step.marksAwarded > 0 ? "#22c55e" : "#ef4444";
  const marksBg = step.marksAwarded > 0 ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";
  const marksLabel = step.marksAwarded > 0
    ? `+${step.marksAwarded}`
    : isNegative && step.marksDeducted > 0
      ? `−${step.marksDeducted}`
      : "0";

  return (
    <div style={{
      borderRadius: 10,
      border: `1.5px solid ${ss.border}`,
      background: ss.bg,
      marginBottom: 8,
      overflow: "hidden",
    }}>
      {/* Step header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px 6px",
        borderBottom: step.studentWork || step.teacherAnnotation || step.correctedWorking
          ? `1px solid ${ss.border}`
          : "none",
      }}>
        <div style={{
          minWidth: 22, height: 22, borderRadius: "50%",
          background: ss.badge, color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.68rem", fontWeight: 700, flexShrink: 0,
        }}>
          {step.stepNumber}
        </div>
        <div style={{ flex: 1, fontSize: "0.78rem", fontWeight: 600, color: "var(--text)" }}>
          {step.description}
        </div>
        <MistakeBadge type={step.mistakeType} />
        <span style={{
          fontSize: "0.72rem", fontWeight: 800,
          padding: "2px 7px", borderRadius: 999,
          color: marksColor, background: marksBg, flexShrink: 0,
        }}>
          {marksLabel} {Math.abs(step.marksAwarded) === 1 ? "mark" : "marks"}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "7px 10px 9px" }}>
        {/* Student's work */}
        {step.studentWork && (
          <div style={{ marginBottom: 5 }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Your work
            </div>
            <div style={{
              fontSize: "0.77rem", color: "var(--text)", lineHeight: 1.5,
              background: "rgba(0,0,0,0.06)", borderRadius: 6,
              padding: "5px 8px", fontFamily: "monospace",
            }}>
              {step.studentWork}
            </div>
          </div>
        )}

        {/* Teacher annotation */}
        {step.teacherAnnotation && (
          <div style={{
            fontSize: "0.76rem", color: ss.badge,
            fontWeight: 600, marginBottom: step.correctedWorking ? 6 : 0,
          }}>
            {step.teacherAnnotation}
          </div>
        )}

        {/* Corrected working */}
        {step.correctedWorking && (
          <div>
            <button
              type="button"
              onClick={() => setShowCorrected((v) => !v)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "0.72rem", color: "#3b82f6", fontWeight: 600,
                padding: "0", display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <span>{showCorrected ? "▲" : "▼"}</span>
              {showCorrected ? "Hide corrected working" : "See corrected working"}
            </button>
            {showCorrected && (
              <div style={{
                marginTop: 5, padding: "6px 8px",
                background: "rgba(34,197,94,0.07)", borderRadius: 6,
                border: "1px solid rgba(34,197,94,0.2)",
                fontSize: "0.77rem", color: "#22c55e", lineHeight: 1.5,
                fontFamily: "monospace",
              }}>
                {step.correctedWorking}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MistakeSummaryLine({ summary }: { summary: CheckSolutionResponse["mistakeSummary"] }) {
  const parts: string[] = [];
  if (summary.conceptual > 0) parts.push(`${summary.conceptual} conceptual`);
  if (summary.calculation > 0) parts.push(`${summary.calculation} calculation`);
  if (summary.silly > 0) parts.push(`${summary.silly} silly`);
  if (summary.presentation > 0) parts.push(`${summary.presentation} presentation`);
  if (parts.length === 0) return null;
  const total = parts.reduce((acc, p) => acc + parseInt(p), 0);
  return (
    <div style={{ fontSize: "0.73rem", color: "var(--text-muted)", marginTop: 3 }}>
      {parts.join(" · ")} {total === 1 ? "mistake" : "mistakes"}
    </div>
  );
}

export function SolutionChecker({
  question, marks, subject, topic, onRequestStepSolution,
}: SolutionCheckerProps) {
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckSolutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isFilePdf = file.type === "application/pdf";
    const isImage = file.type === "image/jpeg" || file.type === "image/png";

    if (!isFilePdf && !isImage) {
      setError("Please select a JPG, PNG, or PDF file");
      return;
    }

    const maxSize = isFilePdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    const maxLabel = isFilePdf ? "5 MB" : "3 MB";
    if (file.size > maxSize) {
      setError(`File must be under ${maxLabel}`);
      return;
    }

    setError(null);
    setResult(null);
    setFileName(file.name);
    setIsPdf(isFilePdf);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      if (isFilePdf) {
        setImagePreview(null);
        setImageMimeType("application/pdf");
      } else {
        setImagePreview(dataUrl);
        setImageMimeType(file.type === "image/png" ? "image/png" : "image/jpeg");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCheck = useCallback(async () => {
    const hasImage = !!imageBase64;
    const hasText = textAnswer.trim().length > 0;
    if (!hasImage && !hasText) return;

    setLoading(true);
    setError(null);

    try {
      const response = await checkSolutionImage({
        question,
        marks,
        subject,
        topic,
        ...(hasImage ? { imageBase64: imageBase64!, imageMimeType } : {}),
        ...(hasText && !hasImage ? { textAnswer: textAnswer.trim() } : {}),
      });

      if (response.ok) {
        setResult(response);
        const mistakeCount =
          response.mistakeSummary.conceptual +
          response.mistakeSummary.calculation +
          response.mistakeSummary.silly +
          response.mistakeSummary.presentation;
        if (user?.uid && !user.isLocalSession && mistakeCount > 0) {
          const marksLost = response.totalMarks - response.marksAwarded;
          logMistakes(user.uid, {
            timestamp: new Date().toISOString(),
            questionText: question,
            topic,
            subject,
            totalMarks: response.totalMarks,
            marksLost,
            mistakeCounts: response.mistakeSummary,
            stepDetails: response.annotatedSteps
              .filter((s) => s.mistakeType != null)
              .map((s) => ({
                stepNumber: s.stepNumber,
                mistakeType: String(s.mistakeType),
                marksDeducted: s.marksDeducted,
              })),
          }).catch(() => {});
        }
      } else {
        setError(response.error || "Could not evaluate. Try a clearer image or type your answer.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check solution");
    } finally {
      setLoading(false);
    }
  }, [imageBase64, imageMimeType, textAnswer, question, marks, subject, topic, user]);

  const handleClear = useCallback(() => {
    setImagePreview(null);
    setImageBase64(null);
    setFileName(null);
    setIsPdf(false);
    setResult(null);
    setError(null);
    setTextAnswer("");
    setShowTextInput(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const hasFile = imageBase64 !== null;
  const hasText = textAnswer.trim().length > 0;
  const canCheck = hasFile || hasText;
  const isPerfect = result && result.percentage === 100;

  const scoreColor = result
    ? result.percentage >= 80 ? "#22c55e"
      : result.percentage >= 50 ? "#fbbf24"
        : "#ef4444"
    : "var(--text-muted)";

  const totalMistakes = result?.mistakeSummary
    ? result.mistakeSummary.conceptual + result.mistakeSummary.calculation +
      result.mistakeSummary.silly + result.mistakeSummary.presentation
    : 0;

  return (
    <div style={{
      marginTop: 12,
      padding: "14px 16px",
      borderRadius: 14,
      border: "1px solid rgba(206,130,255,0.3)",
      background: "linear-gradient(135deg, rgba(206,130,255,0.06), rgba(206,130,255,0.04))",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: "1.1rem" }}>📝</span>
        <strong style={{ fontSize: "0.87rem", color: "#c4b5fd" }}>
          Check My Answer
        </strong>
        <span style={{ fontSize: "0.72rem", color: "#c4b5fd", opacity: 0.8 }}>
          Get teacher-style feedback
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* ── Hero upload zone ────────────────── */}
      {!hasFile && !result && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            padding: "22px 14px",
            borderRadius: 12,
            border: "2px dashed rgba(168,85,247,0.4)",
            background: "var(--bg-card)",
            color: "#c4b5fd",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span style={{ fontSize: "2rem" }}>📸</span>
          <span>Upload a photo or PDF of your answer</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 400, opacity: 0.8 }}>
            JPG · PNG · PDF &nbsp;|&nbsp; Max 3 MB image, 5 MB PDF
          </span>
        </button>
      )}

      {/* ── Image preview ────────────────── */}
      {imagePreview && !isPdf && !result && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
            <img
              src={imagePreview}
              alt="Your solution"
              style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, border: "1px solid var(--bg-card-border)" }}
            />
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: "absolute", top: 4, right: 4,
                width: 24, height: 24, borderRadius: "50%",
                border: "none", background: "rgba(0,0,0,0.6)",
                color: "white", fontSize: "0.7rem", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>
          </div>
        </div>
      )}

      {/* ── PDF indicator ────────────────── */}
      {isPdf && fileName && !result && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          borderRadius: 10, background: "var(--bg-card)",
          border: "1px solid rgba(168,85,247,0.3)", marginBottom: 10,
        }}>
          <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fileName}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PDF ready — all pages will be read</div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            style={{
              flexShrink: 0, width: 24, height: 24, borderRadius: "50%",
              border: "none", background: "rgba(0,0,0,0.15)",
              color: "var(--text-muted)", fontSize: "0.7rem",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>
      )}

      {/* ── Text paste secondary option ────────────────── */}
      {!result && (
        <div style={{ marginTop: hasFile ? 8 : 10 }}>
          <button
            type="button"
            onClick={() => setShowTextInput((v) => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.72rem", color: "#c4b5fd", opacity: 0.85,
              fontWeight: 500, padding: "0", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <span>{showTextInput ? "▲" : "▼"}</span>
            {hasFile ? "Or add text notes too" : "Or type your answer instead"}
          </button>
          {showTextInput && (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your working and answer here..."
              rows={4}
              style={{
                marginTop: 6, width: "100%", boxSizing: "border-box",
                padding: "8px 10px", borderRadius: 8,
                border: "1px solid rgba(168,85,247,0.3)",
                background: "var(--bg-card)", color: "var(--text)",
                fontSize: "0.8rem", lineHeight: 1.5, resize: "vertical",
                outline: "none",
              }}
            />
          )}
        </div>
      )}

      {/* ── Check button ────────────────── */}
      {canCheck && !result && (
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          style={{
            marginTop: 10, width: "100%", padding: "11px 14px",
            borderRadius: 10, border: "none",
            background: loading
              ? "linear-gradient(135deg, #a78bfa, #8b5cf6)"
              : "linear-gradient(135deg, #7c3aed, #6d28d9)",
            color: "white", fontSize: "0.84rem", fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Evaluating your answer..." : "Check My Answer"}
        </button>
      )}

      {/* ── Error ────────────────── */}
      {error && (
        <div style={{
          padding: "8px 12px", borderRadius: 8,
          background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
          color: "#ef4444", fontSize: "0.78rem", marginTop: 8,
        }}>
          {error}
        </div>
      )}

      {/* ── Result ────────────────── */}
      {result && (
        <div style={{ marginTop: 4 }}>
          {/* Score banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", borderRadius: 12, marginBottom: 12,
            background: isPerfect ? "rgba(34,197,94,0.08)" : result.percentage >= 80 ? "rgba(34,197,94,0.06)" : result.percentage >= 50 ? "rgba(251,191,36,0.06)" : "rgba(239,68,68,0.06)",
            border: `1px solid ${isPerfect ? "rgba(34,197,94,0.4)" : result.percentage >= 80 ? "rgba(34,197,94,0.3)" : result.percentage >= 50 ? "rgba(251,191,36,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            <div style={{
              minWidth: 54, height: 54, borderRadius: "50%",
              background: scoreColor, color: "white",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              fontSize: "0.68rem", fontWeight: 700, lineHeight: 1.1, flexShrink: 0,
            }}>
              <span style={{ fontSize: "1.15rem" }}>{result.marksAwarded}</span>
              <span>/{result.totalMarks}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.87rem", fontWeight: 700, color: scoreColor }}>
                {result.percentage}%
                {" — "}
                {isPerfect ? "🎉 Perfect score!" : result.percentage >= 80 ? "Excellent!" : result.percentage >= 50 ? "Good effort!" : "Needs improvement"}
              </div>
              {!isPerfect && totalMistakes > 0 && (
                <MistakeSummaryLine summary={result.mistakeSummary} />
              )}
              {isPerfect && (
                <div style={{ fontSize: "0.74rem", color: "#22c55e", marginTop: 2 }}>
                  Full marks — outstanding work!
                </div>
              )}
            </div>
          </div>

          {/* Annotated steps */}
          {result.annotatedSteps.map((step) => (
            <AnnotatedStepCard key={step.stepNumber} step={step} />
          ))}

          {/* Teacher's Note */}
          {result.teacherNote && (
            <div style={{
              marginTop: 10, padding: "12px 14px",
              borderRadius: 10, background: "rgba(168,85,247,0.06)",
              border: "1px solid rgba(168,85,247,0.2)",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a78bfa", marginBottom: 5, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✏️</span> Teacher's Note
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.6 }}>
                {result.teacherNote}
              </div>
            </div>
          )}

          {/* See Model Answer CTA */}
          {onRequestStepSolution && (
            <button
              type="button"
              onClick={onRequestStepSolution}
              style={{
                marginTop: 10, width: "100%", padding: "11px 14px",
                borderRadius: 10, border: "none",
                background: "linear-gradient(135deg, rgba(59,130,246,0.12), rgba(59,130,246,0.18))",
                color: "#60a5fa", fontSize: "0.84rem", fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", gap: 8,
                boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.3)",
              }}
            >
              <span>See the Model Answer</span>
              <span style={{ fontSize: "1rem" }}>→</span>
            </button>
          )}

          {/* Try another */}
          <button
            type="button"
            onClick={handleClear}
            style={{
              marginTop: 8, width: "100%", padding: "8px 12px",
              borderRadius: 8, border: "1px solid rgba(206,130,255,0.3)",
              background: "var(--bg-card)", color: "#c4b5fd",
              fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Try another solution
          </button>
        </div>
      )}
    </div>
  );
}
