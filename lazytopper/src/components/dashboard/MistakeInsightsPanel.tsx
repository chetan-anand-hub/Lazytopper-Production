// LEGACY-RETIRED 2026-06-08 - disconnected from product; safe to delete in clean-branch pass.
import { useState, useEffect, useMemo } from "react";
import { getMistakeLogs, type MistakeLogEntry } from "../../services/mistakeLogService";
import { useAuth } from "../../context/AuthContext";

interface MistakeInsightsPanelProps {
  uid: string;
}

type MKey = "conceptual" | "calculation" | "silly" | "presentation";

const MISTAKE_DEFS: Array<{ key: MKey; label: string; color: string; bg: string }> = [
  { key: "conceptual",   label: "Conceptual",   color: "#ef4444", bg: "rgba(239,68,68,0.08)"  },
  { key: "calculation",  label: "Calculation",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  { key: "silly",        label: "Silly",        color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  { key: "presentation", label: "Presentation", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
];

type WeeklyBucket = Record<MKey, number>;
type TrendDir = "improving" | "stable" | "worse";

const MKEYS: MKey[] = ["conceptual", "calculation", "silly", "presentation"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function aggregateByWeek(logs: MistakeLogEntry[]): WeeklyBucket[] {
  const now = Date.now();
  const weeks: WeeklyBucket[] = Array.from({ length: 4 }, () => ({
    conceptual: 0, calculation: 0, silly: 0, presentation: 0,
  }));
  for (const log of logs) {
    const ageMs = now - new Date(log.timestamp).getTime();
    const weekIdx = Math.floor(ageMs / WEEK_MS);
    if (weekIdx >= 0 && weekIdx < 4) {
      const bucket = 3 - weekIdx; // [0]=oldest, [3]=this week
      for (const k of MKEYS) {
        weeks[bucket][k] += log.mistakeCounts[k] || 0;
      }
    }
  }
  return weeks;
}

function calcTrend(current: number, previous: number): TrendDir {
  if (current < previous) return "improving";
  if (current > previous) return "worse";
  return "stable";
}

function trendArrow(t: TrendDir): string {
  return t === "improving" ? "↓" : t === "worse" ? "↑" : "→";
}

function trendColor(t: TrendDir): string {
  return t === "improving" ? "#22c55e" : t === "worse" ? "#ef4444" : "var(--text-muted)";
}

function trendLabel(t: TrendDir): string {
  return t === "improving" ? "Improving" : t === "worse" ? "Getting worse" : "Stable";
}

export function MistakeInsightsPanel({ uid }: MistakeInsightsPanelProps) {
  const [logs, setLogs] = useState<MistakeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { mistakeLogsHydrated } = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMistakeLogs(uid, 28)
      .then((entries) => {
        if (!cancelled) {
          setLogs(entries);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, mistakeLogsHydrated]);

  const weeks = useMemo(() => aggregateByWeek(logs), [logs]);

  const CHART_H = 80;
  const BAR_W = 9;
  const BAR_GAP = 3;
  const GROUP_PAD = 20;
  const GROUP_W = 4 * BAR_W + 3 * BAR_GAP + GROUP_PAD;
  const CHART_W = 4 * GROUP_W + 10;
  const WEEK_LABELS = ["3 wks ago", "2 wks ago", "Last week", "This week"];

  if (loading) {
    return (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, marginTop: 20 }}>
          ✏️ Mistake Insights
        </h3>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "12px 0" }}>
          Loading your mistake history…
        </div>
      </div>
    );
  }

  if (logs.length < 3) {
    return (
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, marginTop: 20 }}>
          ✏️ Mistake Insights
        </h3>
        <div style={{
          padding: "20px 16px", borderRadius: 12, textAlign: "center",
          background: "var(--bg-card)", border: "1px solid var(--bg-card-border)",
        }}>
          <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: 4 }}>
            Check 3+ answers to unlock insights
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Tap "Check my answer" on any practice question and upload a photo of your work. After 3 checks, your error patterns will appear here.
          </div>
        </div>
      </div>
    );
  }

  const totals: WeeklyBucket = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
  const subjectTotals: Record<string, number> = {};
  for (const log of logs) {
    for (const k of MKEYS) {
      totals[k] += log.mistakeCounts[k] || 0;
    }
    const subjectMistakes = MKEYS.reduce((s, k) => s + (log.mistakeCounts[k] || 0), 0);
    if (subjectMistakes > 0 && log.subject) {
      subjectTotals[log.subject] = (subjectTotals[log.subject] || 0) + subjectMistakes;
    }
  }
  const grandTotal = MKEYS.reduce((s, k) => s + totals[k], 0);

  const SUBJECT_ALIASES: Record<string, string> = {
    math: "Maths", mathematics: "Maths", maths: "Maths",
    science: "Science", sci: "Science",
  };
  const normalizedTotals: Record<string, number> = {};
  for (const [subj, cnt] of Object.entries(subjectTotals)) {
    const canonical = SUBJECT_ALIASES[subj.toLowerCase()] ?? subj;
    normalizedTotals[canonical] = (normalizedTotals[canonical] || 0) + cnt;
  }

  const subjectEntries = Object.entries(normalizedTotals).sort((a, b) => b[1] - a[1]);
  const topSubject =
    subjectEntries.length > 0 && subjectEntries[0][1] > (subjectEntries[1]?.[1] ?? 0)
      ? subjectEntries[0][0]
      : null;
  const isTie =
    subjectEntries.length > 1 && subjectEntries[0][1] === subjectEntries[1][1];

  const thisWeek = weeks[3];
  const lastWeek = weeks[2];

  const mostCommon = MISTAKE_DEFS.reduce((a, b) =>
    totals[a.key] >= totals[b.key] ? a : b
  );

  const improvements = MISTAKE_DEFS
    .map((d) => ({ ...d, delta: thisWeek[d.key] - lastWeek[d.key] }))
    .filter((d) => d.delta < 0)
    .sort((a, b) => a.delta - b.delta);

  const worsening = MISTAKE_DEFS
    .map((d) => ({ ...d, delta: thisWeek[d.key] - lastWeek[d.key] }))
    .filter((d) => d.delta > 0)
    .sort((a, b) => b.delta - a.delta);

  let summary = "";
  if (grandTotal === 0) {
    summary = "No mistakes logged in the last 28 days — outstanding!";
  } else {
    const pct = Math.round((totals[mostCommon.key] / grandTotal) * 100);
    summary = `Your most common mistake is ${mostCommon.label} (${pct}% of errors).`;
    if (isTie && subjectEntries.length > 1) {
      summary += ` ${subjectEntries[0][0]} and ${subjectEntries[1][0]} are equally error-prone — split your revision time between them.`;
    } else if (topSubject) {
      summary += ` ${topSubject} is your biggest weak spot right now — focus your revision there.`;
    }
    if (improvements.length > 0) {
      const best = improvements[0];
      const prev = lastWeek[best.key];
      const pctDown = prev > 0 ? Math.round((-best.delta / prev) * 100) : 100;
      summary += ` ${best.label} mistakes are down ${pctDown}% this week — keep it up!`;
    } else if (worsening.length > 0) {
      const worst = worsening[0];
      const prev = lastWeek[worst.key];
      const pctUp = prev > 0 ? Math.round((worst.delta / prev) * 100) : 100;
      summary += ` Watch out for ${worst.label} mistakes, which are up ${pctUp}% this week.`;
    } else {
      summary += " Your mistake pattern is stable this week.";
    }
  }

  const maxVal = Math.max(...weeks.flatMap((w) => MKEYS.map((k) => w[k])), 1);

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, marginTop: 20 }}>
        ✏️ Mistake Insights
      </h3>

      {/* Subject breakdown pills */}
      {subjectEntries.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {subjectEntries.map(([subject, count], i) => (
            <span
              key={subject}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 9px",
                borderRadius: 20,
                fontSize: "0.75rem",
                fontWeight: 700,
                background: i === 0
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(59,130,246,0.10)",
                color: i === 0 ? "#ef4444" : "#3b82f6",
                border: `1px solid ${i === 0 ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.2)"}`,
              }}
            >
              {subject}: {count} mistake{count !== 1 ? "s" : ""}
              {i === 0 && subjectEntries.length > 1 && (
                <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>▲ most</span>
              )}
            </span>
          ))}
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Based on {logs.length} answer check{logs.length !== 1 ? "s" : ""} in the last 28 days
      </div>

      {/* Grouped bar chart — 4 mistake types × 4 weekly buckets */}
      <div style={{ overflowX: "auto", marginBottom: 14 }}>
        <svg width={CHART_W} height={CHART_H + 38}>
          {weeks.map((weekData, wi) => {
            const groupX = wi * GROUP_W + 5;
            return (
              <g key={wi}>
                {MKEYS.map((k, ki) => {
                  const h = Math.max(
                    Math.round((weekData[k] / maxVal) * CHART_H),
                    weekData[k] > 0 ? 2 : 0
                  );
                  const x = groupX + ki * (BAR_W + BAR_GAP);
                  const color = MISTAKE_DEFS.find((d) => d.key === k)!.color;
                  return (
                    <g key={k}>
                      <rect
                        x={x} y={CHART_H - h}
                        width={BAR_W} height={Math.max(h, 0)}
                        rx={2} fill={color} opacity={0.85}
                      />
                      {weekData[k] > 0 && (
                        <text
                          x={x + BAR_W / 2} y={CHART_H - h - 2}
                          textAnchor="middle" fontSize={7}
                          fill={color} fontWeight={700}
                        >
                          {weekData[k]}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text
                  x={groupX + (4 * BAR_W + 3 * BAR_GAP) / 2}
                  y={CHART_H + 14}
                  textAnchor="middle" fontSize={9}
                  fill="var(--text-muted)"
                >
                  {WEEK_LABELS[wi]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mistake type breakdown with trend indicators */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {MISTAKE_DEFS.map((d) => {
          const t = calcTrend(thisWeek[d.key], lastWeek[d.key]);
          const total28 = totals[d.key];
          return (
            <div
              key={d.key}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "6px 10px", borderRadius: 8, background: d.bg,
                minWidth: 120, flex: "1 0 auto",
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: d.color, flexShrink: 0, display: "inline-block",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text)" }}>
                  {d.label}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {total28} total
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: "0.88rem", fontWeight: 800, color: trendColor(t) }}>
                  {trendArrow(t)}
                </div>
                <div style={{ fontSize: "0.62rem", color: trendColor(t), fontWeight: 600 }}>
                  {trendLabel(t)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plain-language summary */}
      {summary && (
        <div style={{
          padding: "10px 12px", borderRadius: 10,
          background: "rgba(206,130,255,0.06)", border: "1px solid rgba(206,130,255,0.2)",
          fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.6,
        }}>
          {summary}
        </div>
      )}
    </div>
  );
}
