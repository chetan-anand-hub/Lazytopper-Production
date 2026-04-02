import { useState, useRef, useCallback } from "react";
import { checkSolutionImage, type CheckSolutionResponse } from "../../ai/aiClient";

interface SolutionCheckerProps {
  question: string;
  marks: number;
  subject: string;
  topic: string;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  correct: { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534", icon: "\u2705" },
  partial: { bg: "#fffbeb", border: "#fde68a", text: "#92400e", icon: "\u26A0\uFE0F" },
  incorrect: { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", icon: "\u274C" },
  missing: { bg: "#f8fafc", border: "#e2e8f0", text: "#64748b", icon: "\u2796" },
};

export function SolutionChecker({ question, marks, subject, topic }: SolutionCheckerProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckSolutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG or PNG)");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Image must be under 3 MB");
      return;
    }

    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);

      const base64 = dataUrl.split(",")[1];
      setImageBase64(base64);
      setImageMimeType(file.type === "image/png" ? "image/png" : "image/jpeg");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleCheck = useCallback(async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);

    try {
      const response = await checkSolutionImage({
        question,
        marks,
        subject,
        topic,
        imageBase64,
        imageMimeType,
      });

      if (response.ok) {
        setResult(response);
      } else {
        setError(response.error || "Could not evaluate. Try a clearer image.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check solution");
    } finally {
      setLoading(false);
    }
  }, [imageBase64, imageMimeType, question, marks, subject, topic]);

  const handleClear = useCallback(() => {
    setImagePreview(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const percentColor = result
    ? result.percentage >= 80 ? "#166534"
      : result.percentage >= 50 ? "#92400e"
        : "#991b1b"
    : "#64748b";

  return (
    <div style={{
      marginTop: 12,
      padding: "14px 16px",
      borderRadius: 14,
      border: "1px solid rgba(139,92,246,0.25)",
      background: "linear-gradient(135deg, rgba(250,245,255,0.6), rgba(243,232,255,0.3))",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: "1.1rem" }}>{"\uD83D\uDCF8"}</span>
        <strong style={{ fontSize: "0.85rem", color: "#6d28d9" }}>
          Check My Solution
        </strong>
        <span style={{ fontSize: "0.72rem", color: "#8b5cf6", fontWeight: 500 }}>
          Upload your handwritten answer
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {!imagePreview && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "100%",
            padding: "16px 14px",
            borderRadius: 12,
            border: "2px dashed rgba(139,92,246,0.35)",
            background: "rgba(255,255,255,0.7)",
            color: "#7c3aed",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>{"\uD83D\uDCF7"}</span>
          <span>Tap to upload photo of your solution</span>
          <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#a78bfa" }}>
            JPG or PNG, max 3 MB
          </span>
        </button>
      )}

      {imagePreview && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ position: "relative", display: "inline-block", maxWidth: "100%" }}>
            <img
              src={imagePreview}
              alt="Your solution"
              style={{
                maxWidth: "100%",
                maxHeight: 200,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
              }}
            />
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: "none",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                fontSize: "0.7rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {"\u2715"}
            </button>
          </div>

          {!result && (
            <button
              type="button"
              onClick={handleCheck}
              disabled={loading}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px 14px",
                borderRadius: 10,
                border: "none",
                background: loading
                  ? "linear-gradient(135deg, #a78bfa, #8b5cf6)"
                  : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: "#fff",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Evaluating your solution..." : "Check My Answer"}
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{
          padding: "8px 12px",
          borderRadius: 8,
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#991b1b",
          fontSize: "0.78rem",
          marginBottom: 8,
        }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 6 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 12,
            background: result.percentage >= 80 ? "#f0fdf4" : result.percentage >= 50 ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${result.percentage >= 80 ? "#bbf7d0" : result.percentage >= 50 ? "#fde68a" : "#fecaca"}`,
            marginBottom: 10,
          }}>
            <div style={{
              minWidth: 52,
              height: 52,
              borderRadius: "50%",
              background: result.percentage >= 80 ? "#166534" : result.percentage >= 50 ? "#92400e" : "#991b1b",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              fontWeight: 700,
              lineHeight: 1.1,
            }}>
              <span style={{ fontSize: "1.1rem" }}>{result.marksAwarded}</span>
              <span>/{result.totalMarks}</span>
            </div>
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: percentColor }}>
                {result.percentage}% — {result.percentage >= 80 ? "Excellent!" : result.percentage >= 50 ? "Good effort!" : "Needs improvement"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 2 }}>
                {result.overallFeedback}
              </div>
            </div>
          </div>

          {result.steps.map((step) => {
            const sc = STATUS_COLORS[step.status] || STATUS_COLORS.partial;
            return (
              <div key={step.stepNumber} style={{
                display: "flex",
                gap: 8,
                marginBottom: 6,
                padding: "8px 10px",
                borderRadius: 8,
                background: sc.bg,
                border: `1px solid ${sc.border}`,
              }}>
                <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>{sc.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: sc.text }}>
                    {step.description}
                    <span style={{
                      marginLeft: 8,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 999,
                      background: step.marksGiven > 0 ? "#dbeafe" : "#f3f4f6",
                      color: step.marksGiven > 0 ? "#1e40af" : "#6b7280",
                    }}>
                      {step.marksGiven > 0 ? `+${step.marksGiven}` : "0"} {step.marksGiven === 1 ? "mark" : "marks"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#475569", marginTop: 2 }}>
                    {step.feedback}
                  </div>
                </div>
              </div>
            );
          })}

          {result.improvementTips.length > 0 && (
            <div style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 8,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>
                {"\uD83D\uDCA1"} Tips to score more
              </div>
              {result.improvementTips.map((tip, i) => (
                <div key={i} style={{ fontSize: "0.74rem", color: "#1e3a5f", marginBottom: 2 }}>
                  {"\u2022"} {tip}
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleClear}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(139,92,246,0.3)",
              background: "rgba(255,255,255,0.8)",
              color: "#7c3aed",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try another solution
          </button>
        </div>
      )}
    </div>
  );
}
