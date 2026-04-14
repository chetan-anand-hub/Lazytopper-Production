import { useState, useEffect } from "react";

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

function SvgCard({
  result,
  winner,
}: {
  result: ModelResult;
  winner: boolean;
}) {
  const hasSvg = Boolean(result?.svg);
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 4px rgba(0,0,0,.1)",
        border: winner ? "2px solid #22c55e" : "1px solid #e2e8f0",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          {result?.provider === "claude" ? "Claude Sonnet" : "Gemini Pro"}
        </h2>
        {winner && (
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
            WINNER ✓
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
      <div
        style={{
          fontSize: "0.75rem",
          color: "#64748b",
          marginBottom: 12,
        }}
      >
        {result?.model} · {hasSvg ? `${(result.svg || "").length} chars` : "declined to draw"}
      </div>
      {hasSvg ? (
        <div
          style={{ border: "1px solid #f1f5f9", borderRadius: 8, padding: 12 }}
          dangerouslySetInnerHTML={{ __html: result.svg! }}
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
          {result?.provider === "gemini" ? "Gemini Pro returned NO_DIAGRAM" : "Claude returned NO_DIAGRAM"}
        </div>
      )}
    </div>
  );
}

export default function DiagramComparePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState(TEST_QUESTION);

  async function runComparison(q: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate-diagram?compare=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionText: q, compare: true }),
        signal: AbortSignal.timeout(90000),
      });
      const data: CompareResponse = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runComparison(question);
  }, []);

  const claudeSvgLen = (result?.claude?.svg || "").length;
  const geminiSvgLen = (result?.gemini?.svg || "").length;
  const claudeWins = claudeSvgLen > 0 && claudeSvgLen >= geminiSvgLen;

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        background: "#f8fafc",
        minHeight: "100vh",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <h1
          style={{
            textAlign: "center",
            color: "#1e293b",
            fontSize: "1.25rem",
            marginBottom: 4,
          }}
        >
          SVG Diagram Quality Comparison
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: "0.85rem",
            marginBottom: 20,
          }}
        >
          Claude Sonnet vs Gemini Pro — same prompt, same rules
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
              color: "#fff",
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
              <SvgCard result={result.claude} winner={claudeWins} />
              <SvgCard result={result.gemini} winner={!claudeWins && geminiSvgLen > 0} />
            </div>

            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: 8,
                padding: "16px 20px",
                textAlign: "center",
                color: "#166534",
                lineHeight: 1.6,
              }}
            >
              <strong>
                {claudeWins
                  ? "Verdict: Claude Sonnet wins."
                  : geminiSvgLen > 0
                  ? "Verdict: Gemini Pro wins."
                  : "Both models returned NO_DIAGRAM for this question."}
              </strong>
              {claudeSvgLen > 0 && (
                <span>
                  {" "}
                  Claude: {claudeSvgLen} chars
                  {geminiSvgLen > 0 ? ` · Gemini: ${geminiSvgLen} chars` : " · Gemini: NO_DIAGRAM"}
                  .
                </span>
              )}
              <br />
              <strong>
                Final routing: Claude Sonnet (primary) → Gemini Pro (fallback).
              </strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
