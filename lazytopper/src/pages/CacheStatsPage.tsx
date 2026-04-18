import { useEffect, useState } from "react";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { useAuth } from "../context/AuthContext";

interface TopEntry {
  id: number;
  mode: string;
  subject: string;
  topicKey: string;
  questionNormalized: string;
  hitCount: number;
  lastHit: string | null;
}

interface CacheStats {
  totalEntries: number;
  dbHitCount: number;
  sessionHits: number;
  sessionMisses: number;
  hitRate: number | null;
  topFingerprints: TopEntry[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.1)",
      background: "rgba(255,255,255,0.04)",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{sub}</div>}
    </div>
  );
}

export default function CacheStatsPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  async function fetchStats() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/shared-api/admin/cache-stats", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Unknown error");
      setStats(json.stats);
      setLastFetched(new Date());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  const hitRateDisplay = stats?.hitRate != null ? `${stats.hitRate}%` : stats ? "N/A" : "–";
  const totalReqs = (stats?.sessionHits ?? 0) + (stats?.sessionMisses ?? 0);

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", fontFamily: "'Inter', sans-serif" }}>
      <ReturnContextBar backTo="/dashboard" backLabel="Dashboard" />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Tutor Cache Analytics</h1>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: "4px 0 0" }}>
              Jaccard similarity threshold: 0.38 · Admin only
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.08)", color: "#fff", cursor: "pointer", fontSize: 13,
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 10,
            border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.1)",
            color: "#f87171", fontSize: 13, marginBottom: 20,
          }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
          <StatCard label="Cached Entries" value={stats?.totalEntries ?? "–"} sub="Total rows in DB" />
          <StatCard label="Hit Rate (session)" value={hitRateDisplay} sub={totalReqs > 0 ? `${totalReqs} lookups this session` : "No lookups yet"} />
          <StatCard label="Session Hits" value={stats?.sessionHits ?? "–"} sub="Since last gateway restart" />
          <StatCard label="DB Total Hits" value={stats?.dbHitCount ?? "–"} sub="Cumulative across restarts" />
        </div>

        <div style={{
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.03)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
              Top 10 Most-Hit Questions
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
              Sorted by cumulative hit count (persists across restarts)
            </div>
          </div>

          {!stats ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
              {loading ? "Loading…" : "No data"}
            </div>
          ) : stats.topFingerprints.length === 0 ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
              No cache entries yet
            </div>
          ) : (
            stats.topFingerprints.map((entry, i) => (
              <div key={entry.id} style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "12px 20px",
                borderBottom: i < stats.topFingerprints.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
              }}>
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, fontFamily: "monospace", width: 20, flexShrink: 0, marginTop: 2 }}>
                  #{i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {entry.questionNormalized}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{entry.mode}</span>
                    {entry.subject && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{entry.subject}</span>}
                    {entry.topicKey && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>{entry.topicKey}</span>}
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{entry.hitCount}</span>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>hits</div>
                </div>
              </div>
            ))
          )}
        </div>

        {lastFetched && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "right", marginTop: 12 }}>
            Last updated: {lastFetched.toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
}
