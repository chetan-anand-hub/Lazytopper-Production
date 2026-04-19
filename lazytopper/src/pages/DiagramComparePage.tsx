import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { RequireAuth } from "../components/auth/RequireAuth";

interface ModelResult {
  svg: string | null;
  model: string;
  provider: string;
}

interface CompareResponse {
  ok: boolean;
  compare: boolean;
  claude: ModelResult;
  gemini: ModelResult;
}

const TEST_QUESTION =
  "In a right triangle ABC, angle B = 90 degrees. AB = 3 cm and BC = 4 cm. Find AC. Draw the triangle with all sides labelled.";

function makeBlobUrl(svgContent: string): string {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:8px;box-sizing:border-box;}svg{max-width:100%;height:auto;}</style></head><body>${svgContent}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}

function SvgCard({
  result,
  selected,
  onSelect,
}: {
  result: ModelResult;
  selected: boolean;
  onSelect: () => void;
}) {
  const hasSvg = Boolean(result?.svg);
  const blobUrlRef = useRef<string | null>(null);

  if (hasSvg && !blobUrlRef.current) {
    blobUrlRef.current = makeBlobUrl(result.svg!);
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,.1)",
        border: selected ? "2px solid #22c55e" : "1px solid #e2e8f0",
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          {result?.provider === "claude" ? "Claude Sonnet" : "Gemini Pro"}
        </h2>
        {selected && (
          <span
            style={{
              fontSize: "0.7rem",
              padding: "2px 8px",
              borderRadius: 999,
              background: "#fde68a",
              color: "#92400e",
              fontWeight: 700,
            }}
          >
            SELECTED ✓
          </span>
        )}
        {!hasSvg && (
          <span
            style={{
              fontSize: "0.7rem",
              padding: "2px 8px",
              borderRadius: 999,
              background: "#fee2e2",
              color: "#991b1b",
              fontWeight: 600,
            }}
          >
            NO_DIAGRAM
          </span>
        )}
      </div>

      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
        {result?.model}
        {hasSvg && ` · ${(result.svg || "").length} chars`}
      </div>

      {hasSvg ? (
        <iframe
          src={blobUrlRef.current!}
          sandbox="allow-same-origin"
          style={{
            border: "1px solid #f1f5f9",
            borderRadius: 8,
            width: "100%",
            height: 300,
            display: "block",
          }}
          title={`${result?.provider} diagram`}
        />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 200,
            background: "#f8fafc",
            borderRadius: 8,
            color: "#94a3b8",
            fontSize: "0.9rem",
          }}
        >
          {result?.provider === "gemini"
            ? "Gemini Pro returned NO_DIAGRAM"
            : "Claude returned NO_DIAGRAM"}
        </div>
      )}

      {hasSvg && (
        <button
          onClick={onSelect}
          disabled={selected}
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            border: selected ? "none" : "1px solid #0ea5e9",
            background: selected ? "#22c55e" : "#fff",
            color: selected ? "#fff" : "#0ea5e9",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: selected ? "default" : "pointer",
          }}
        >
          {selected ? "Selected as winner" : "Select as winner"}
        </button>
      )}
    </div>
  );
}

function DiagramCompareInner() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState(TEST_QUESTION);
  const [winner, setWinner] = useState<"claude" | "gemini" | null>(null);

  async function runComparison(q: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setWinner(null);
    try {
      const res = await fetch("/api/generate-diagram?compare=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: q, compare: true }),
        signal: AbortSignal.timeout(90000),
      });
      const data: CompareResponse = await res.json();
      setResult(data);
      if (data.claude?.svg && !data.gemini?.svg) setWinner("claude");
      else if (data.gemini?.svg && !data.claude?.svg) setWinner("gemini");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runComparison(question);
  }, []);

  const claudeHasSvg = Boolean(result?.claude?.svg);
  const geminiHasSvg = Boolean(result?.gemini?.svg);

  let verdictText = "";
  if (winner === "claude") verdictText = "Reviewer selected Claude Sonnet as winner.";
  else if (winner === "gemini") verdictText = "Reviewer selected Gemini Pro as winner.";
  else if (result && claudeHasSvg && geminiHasSvg) verdictText = "Both models produced a diagram — select the better one above.";
  else if (result && !claudeHasSvg && !geminiHasSvg) verdictText = "Both models returned NO_DIAGRAM for this question.";

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h1
            style={{
              color: "#1e293b",
              fontSize: "1.25rem",
              margin: 0,
            }}
          >
            SVG Diagram Quality Comparison
          </h1>
          <Link
            to="/admin/diagram-quality"
            style={{
              fontSize: "0.82rem",
              background: "#7c3aed",
              color: "#fff",
              padding: "6px 14px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            5-Column Quality Page →
          </Link>
        </div>
        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "0.85rem",
            marginBottom: 20,
          }}
        >
          Claude Sonnet vs Gemini — same prompt, same rules. Select the better diagram.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
          <button
            onClick={() => runComparison(question)}
            disabled={loading}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: loading ? "#94a3b8" : "#0ea5e9",
              color: "var(--text)",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "Comparing…" : "Run Comparison"}
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 8,
              padding: "12px 16px",
              color: "#991b1b",
              marginBottom: 20,
            }}
          >
            Error: {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
            Calling both models in parallel… (may take up to 60s)
          </div>
        )}

        {result && !loading && (
          <>
            <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
              <SvgCard
                result={result.claude}
                selected={winner === "claude"}
                onSelect={() => setWinner("claude")}
              />
              <SvgCard
                result={result.gemini}
                selected={winner === "gemini"}
                onSelect={() => setWinner("gemini")}
              />
            </div>

            {verdictText && (
              <div
                style={{
                  background: winner ? "#f0fdf4" : "#fffbeb",
                  border: `1px solid ${winner ? "#86efac" : "#fde68a"}`,
                  borderRadius: 8,
                  padding: "16px 20px",
                  textAlign: "center",
                  color: winner ? "#166534" : "#92400e",
                  lineHeight: 1.6,
                }}
              >
                <strong>{verdictText}</strong>
                {winner && (
                  <>
                    <br />
                    <span style={{ fontSize: "0.85rem" }}>
                      Current production routing: Claude Sonnet (primary) → Gemini Pro (fallback).
                    </span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DiagramComparePage() {
  return (
    <RequireAuth>
      <DiagramCompareInner />
    </RequireAuth>
  );
}
