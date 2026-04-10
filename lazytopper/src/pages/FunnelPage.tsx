import { useMemo } from "react";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { getUxTelemetryEvents } from "../services/uxTelemetry";

const FUNNEL_STEPS = [
  { key: "landing_page_visit", label: "Landing Page Visit", color: "#3b82f6" },
  { key: "login_start", label: "Login Started", color: "#6366f1" },
  { key: "login_complete", label: "Login Completed", color: "#8b5cf6" },
  { key: "onboarding_start", label: "Onboarding Started", color: "#a855f7" },
  { key: "onboarding_complete", label: "Onboarding Completed", color: "#d946ef" },
  { key: "first_practice_start", label: "First Practice Started", color: "#ec4899" },
  { key: "first_practice_complete", label: "First Practice Completed", color: "#f43f5e" },
] as const;

export default function FunnelPage() {
  const events = useMemo(() => getUxTelemetryEvents(), []);

  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const uniqueByStep = new Map<string, Set<string>>();
    for (const evt of events) {
      const step = FUNNEL_STEPS.find(s => s.key === evt.name);
      if (!step) continue;
      if (!uniqueByStep.has(step.key)) uniqueByStep.set(step.key, new Set());
      const sessionId = evt.meta?.sessionId ? String(evt.meta.sessionId) : evt.ts.slice(0, 13);
      uniqueByStep.get(step.key)!.add(sessionId);
    }
    for (const step of FUNNEL_STEPS) {
      counts[step.key] = uniqueByStep.get(step.key)?.size ?? 0;
    }
    return counts;
  }, [events]);

  const maxCount = Math.max(1, ...Object.values(stepCounts));

  const recentEvents = useMemo(() => {
    return events
      .filter(e => FUNNEL_STEPS.some(s => s.key === e.name))
      .slice(-50)
      .reverse();
  }, [events]);

  return (
    <div className="dark-page">
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 16px 100px" }}>
        <ReturnContextBar backTo="/dashboard" backLabel="Back to Dashboard" />

        <h1 className="font-display" style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", marginTop: 20, marginBottom: 8 }}>
          Onboarding Funnel
        </h1>
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
          Internal analytics — tracking conversion through key onboarding steps.
        </p>

        <div style={{
          borderRadius: 20, padding: "24px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>
            Conversion Funnel
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FUNNEL_STEPS.map((step, i) => {
              const count = stepCounts[step.key];
              const prevCount = i > 0 ? stepCounts[FUNNEL_STEPS[i - 1].key] : count;
              const convRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
              const barWidth = maxCount > 0 ? Math.max(4, (count / maxCount) * 100) : 4;

              return (
                <div key={step.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                      {i + 1}. {step.label}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {i > 0 && (
                        <span style={{
                          fontSize: "0.68rem", fontWeight: 700,
                          color: convRate >= 70 ? "#22c55e" : convRate >= 40 ? "#f59e0b" : "#ef4444",
                        }}>
                          {convRate}%
                        </span>
                      )}
                      <span style={{ fontSize: "0.88rem", fontWeight: 800, color: step.color, minWidth: 30, textAlign: "right" }}>
                        {count}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 999, width: `${barWidth}%`,
                      background: step.color, transition: "width 0.5s ease",
                    }} />
                  </div>
                  {i < FUNNEL_STEPS.length - 1 && (
                    <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.15)" }}>↓</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          borderRadius: 20, padding: "24px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h2 style={{ fontSize: "0.88rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 16 }}>
            Recent Funnel Events ({recentEvents.length})
          </h2>
          {recentEvents.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)" }}>
              No funnel events recorded yet. Events are tracked as users navigate through the onboarding flow.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentEvents.map((evt, i) => {
                const step = FUNNEL_STEPS.find(s => s.key === evt.name);
                return (
                  <div key={`${evt.ts}-${i}`} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                    borderRadius: 8, background: "rgba(255,255,255,0.02)",
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: step?.color || "#666", flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.7)", flex: 1 }}>
                      {step?.label || evt.name}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)" }}>
                      {new Date(evt.ts).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
