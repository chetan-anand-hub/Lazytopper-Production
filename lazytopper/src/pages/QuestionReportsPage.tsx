import { useEffect, useState } from "react";
import ReturnContextBar from "../components/ux/ReturnContextBar";

interface QuestionReport {
  id: number;
  question_id: string;
  report_type: string;
  comment: string | null;
  subject: string | null;
  topic_key: string | null;
  reporter_uid: string | null;
  created_at: string;
  resolved: boolean;
}

export default function QuestionReportsPage() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);

  async function fetchReports() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/shared-api/admin/question-reports");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown error");
      setReports(json.reports || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function resolveReport(id: number) {
    setResolving(id);
    try {
      const res = await fetch(`/shared-api/admin/question-reports/${id}/resolve`, { method: "PATCH" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown error");
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to resolve");
    } finally {
      setResolving(null);
    }
  }

  useEffect(() => { fetchReports(); }, []);

  const grouped: Record<string, QuestionReport[]> = {};
  for (const r of reports) {
    const key = r.topic_key || "(no topic)";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }
  const topics = Object.keys(grouped).sort();

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <ReturnContextBar backTo="/dashboard" backLabel="Dashboard" />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>Question Reports</h1>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
              Unresolved student-flagged issues
            </p>
          </div>
          <button
            type="button"
            onClick={fetchReports}
            disabled={loading}
            style={{
              padding: "7px 16px", borderRadius: 8, fontSize: "0.82rem",
              fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 10, marginBottom: 20,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef4444", fontSize: "0.85rem",
          }}>
            Error: {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div style={{
            textAlign: "center", padding: "48px 0",
            color: "rgba(255,255,255,0.3)", fontSize: "0.92rem",
          }}>
            No unresolved reports.
          </div>
        )}

        {topics.map((topic) => (
          <div key={topic} style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em",
              color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
              borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6, marginBottom: 12,
            }}>
              {topic} · {grouped[topic].length} report{grouped[topic].length !== 1 ? "s" : ""}
            </div>

            {grouped[topic].map((r) => (
              <div key={r.id} style={{
                borderRadius: 10, padding: "14px 16px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                marginBottom: 10, display: "flex", gap: 12,
                alignItems: "flex-start",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                      background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                      color: "#ef4444",
                    }}>
                      {r.report_type}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                      {r.subject || "—"} · Q #{r.question_id}
                    </span>
                  </div>

                  {r.comment && (
                    <div style={{
                      fontSize: "0.82rem", color: "rgba(255,255,255,0.7)",
                      fontStyle: "italic", marginBottom: 4,
                    }}>
                      "{r.comment}"
                    </div>
                  )}

                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", marginTop: 4 }}>
                    {new Date(r.created_at).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => resolveReport(r.id)}
                  disabled={resolving === r.id}
                  style={{
                    flexShrink: 0, padding: "6px 14px", borderRadius: 7,
                    fontSize: "0.78rem", fontWeight: 600,
                    cursor: resolving === r.id ? "not-allowed" : "pointer",
                    background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)",
                    color: "#22c55e", opacity: resolving === r.id ? 0.6 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {resolving === r.id ? "…" : "Mark resolved"}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
