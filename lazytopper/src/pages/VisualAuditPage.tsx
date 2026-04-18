import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { canonicalQuestionBank } from "../data/canonicalQuestionBank";
import { findVisualForQuestionWithScore } from "../data/visualConceptRegistry";
import ReturnContextBar from "../components/ux/ReturnContextBar";

interface AuditRow {
  questionId: string;
  questionTextShort: string;
  topicKey: string;
  subject: string;
  matchedTitle: string;
  matchedFilePath: string;
  score: number;
  isScoreZero: boolean;
  belowThreshold: boolean;
}

function runAudit(): AuditRow[] {
  return canonicalQuestionBank.map((q) => {
    const { concept, score, isFallback } = findVisualForQuestionWithScore(
      q.questionText,
      q.topicKey,
      q.subject,
    );
    return {
      questionId: q.id,
      questionTextShort:
        q.questionText.length > 120
          ? q.questionText.slice(0, 117) + "…"
          : q.questionText,
      topicKey: q.topicKey,
      subject: q.subject ?? "",
      matchedTitle: concept?.title ?? "(no match)",
      matchedFilePath: concept?.filePath ?? "",
      score,
      isScoreZero: score === 0,
      belowThreshold: isFallback && score > 0,
    };
  });
}

type Filter = "all" | "score-zero";

export default function VisualAuditPage() {
  if (!import.meta.env.VITE_SHOW_DEV_TOOLS) {
    return <Navigate to="/dashboard" replace />;
  }
  return <VisualAuditPageInner />;
}

function VisualAuditPageInner() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => runAudit(), []);

  const scoreZeroCount = rows.filter((r) => r.isScoreZero).length;
  const belowThresholdCount = rows.filter((r) => r.belowThreshold).length;
  const totalCount = rows.length;

  const filtered = useMemo(() => {
    let result = rows;
    if (filter === "score-zero") result = result.filter((r) => r.isScoreZero);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.questionTextShort.toLowerCase().includes(q) ||
          r.topicKey.toLowerCase().includes(q) ||
          r.matchedTitle.toLowerCase().includes(q),
      );
    }
    return result;
  }, [rows, filter, search]);

  const groupedByTopic = useMemo(() => {
    const map = new Map<string, AuditRow[]>();
    for (const row of filtered) {
      if (!map.has(row.topicKey)) map.set(row.topicKey, []);
      map.get(row.topicKey)!.push(row);
    }
    return map;
  }, [filtered]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <ReturnContextBar backTo="/dashboard" backLabel="Dashboard" />

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>
            Visual Concept Audit
          </h1>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              margin: 0,
            }}
          >
            Fuzzy-match results for {totalCount} canonical question bank entries
            · runtime path via{" "}
            <code style={{ color: "#a5b4fc" }}>
              findVisualForQuestionWithScore
            </code>
            <span
              style={{
                marginLeft: 8,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(250,204,21,0.15)",
                color: "#facc15",
                fontSize: 11,
              }}
            >
              Dev / Staging only
            </span>
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard label="Questions Audited" value={totalCount} />
          <StatCard
            label="Score-0 Mismatches"
            value={scoreZeroCount}
            highlight={scoreZeroCount > 0 ? "red" : "green"}
            sub="No keywords matched — first visual used as fallback"
          />
          <StatCard
            label="Weak matches (score 1–2)"
            value={belowThresholdCount}
            highlight={belowThresholdCount > 0 ? "yellow" : "green"}
            sub="Below runtime threshold — runtime fallback triggered"
          />
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.03)",
            marginBottom: 20,
            fontSize: 12,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "rgba(255,255,255,0.7)" }}>
            How this works:
          </strong>{" "}
          Every question in the canonical question bank is run through the same
          runtime matcher used in production. Rows highlighted in{" "}
          <span style={{ color: "#ef4444" }}>red</span> scored exactly{" "}
          <strong>0</strong> — no keywords from the question matched any concept
          card, so the first visual in the chapter was used as a blind fallback.
          Fix by adding relevant keywords to the visual concept card. Rows
          marked{" "}
          <span style={{ color: "#facc15" }}>⚡ weak</span> scored 1–2
          (below runtime threshold) but are not score-0.
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "score-zero"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor:
                    filter === f
                      ? "rgba(255,255,255,0.4)"
                      : "rgba(255,255,255,0.12)",
                  background:
                    filter === f ? "rgba(255,255,255,0.1)" : "transparent",
                  color:
                    filter === f ? "#fff" : "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: filter === f ? 600 : 400,
                }}
              >
                {f === "all"
                  ? `All (${totalCount})`
                  : `Score-0 only (${scoreZeroCount})`}
              </button>
            ))}
          </div>
          <input
            placeholder="Search question, chapter, or matched visual…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 12,
              outline: "none",
            }}
          />
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "rgba(255,255,255,0.25)",
              fontSize: 13,
            }}
          >
            No results
          </div>
        ) : (
          Array.from(groupedByTopic.entries()).map(([topicKey, topicRows]) => {
            const hasScoreZero = topicRows.some((r) => r.isScoreZero);
            const subject = topicRows[0]?.subject ?? "";
            return (
              <div
                key={topicKey}
                style={{
                  borderRadius: 12,
                  border: "1px solid",
                  borderColor: hasScoreZero
                    ? "rgba(239,68,68,0.25)"
                    : "rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      padding: "2px 7px",
                      borderRadius: 4,
                      background: subject.toLowerCase().includes("sci")
                        ? "rgba(34,197,94,0.2)"
                        : "rgba(99,102,241,0.3)",
                      color: subject.toLowerCase().includes("sci")
                        ? "#86efac"
                        : "#a5b4fc",
                    }}
                  >
                    {subject.toLowerCase().includes("sci") ? "science" : "maths"}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {topicKey}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {topicRows.length} question
                    {topicRows.length !== 1 ? "s" : ""}
                    {hasScoreZero && (
                      <span style={{ color: "#ef4444", marginLeft: 8 }}>
                        ·{" "}
                        {topicRows.filter((r) => r.isScoreZero).length} score-0
                      </span>
                    )}
                  </span>
                </div>

                <div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 70px",
                      padding: "6px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.3)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      gap: 8,
                    }}
                  >
                    <span>Question text (definition title)</span>
                    <span>Matched Visual</span>
                    <span style={{ textAlign: "right" }}>Score</span>
                  </div>

                  {topicRows.map((row, i) => (
                    <QuestionRow
                      key={row.questionId}
                      row={row}
                      isLast={i === topicRows.length - 1}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function QuestionRow({
  row,
  isLast,
}: {
  row: AuditRow;
  isLast: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 70px",
        padding: "10px 16px",
        borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.04)",
        gap: 8,
        alignItems: "start",
        background: row.isScoreZero
          ? "rgba(239,68,68,0.06)"
          : "transparent",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            color: row.isScoreZero
              ? "#fca5a5"
              : "rgba(255,255,255,0.8)",
            fontWeight: row.isScoreZero ? 500 : 400,
            lineHeight: 1.4,
          }}
        >
          {row.questionTextShort}
        </div>
        {row.isScoreZero && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(239,68,68,0.65)",
              marginTop: 3,
            }}
          >
            ✗ score 0 — no keywords matched; first visual used as blind fallback
          </div>
        )}
        {!row.isScoreZero && row.belowThreshold && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(250,204,21,0.6)",
              marginTop: 3,
            }}
          >
            ⚡ weak — score {row.score}, below runtime threshold
          </div>
        )}
      </div>
      <div>
        <div
          style={{
            fontSize: 12,
            color: row.isScoreZero
              ? "rgba(239,68,68,0.7)"
              : "rgba(255,255,255,0.5)",
          }}
        >
          {row.matchedTitle}
        </div>
        {row.matchedFilePath && (
          <div
            style={{
              fontSize: 10,
              color: "rgba(255,255,255,0.2)",
              fontFamily: "monospace",
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.matchedFilePath}
          </div>
        )}
      </div>
      <div
        style={{
          textAlign: "right",
          fontSize: 14,
          fontWeight: 700,
          color: row.isScoreZero
            ? "#ef4444"
            : row.belowThreshold
              ? "#facc15"
              : "#22c55e",
        }}
      >
        {row.score}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: "red" | "green" | "yellow";
}) {
  const color =
    highlight === "red"
      ? "#ef4444"
      : highlight === "green"
        ? "#22c55e"
        : highlight === "yellow"
          ? "#facc15"
          : "#fff";
  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
