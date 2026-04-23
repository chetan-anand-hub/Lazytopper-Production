import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { class10MathTopicWeights } from "../../data/class10MathTopicWeights";
import { class10ScienceTopicTrendList } from "../../data/class10ScienceTopicTrends";

type Tier = "must-crack" | "high-roi" | "good-to-do";

interface TopicRow {
  topicName: string;
  tier: Tier;
  weightagePercent: number;
}

const TIER_CONFIG: Record<Tier, {
  label: string;
  sub: string;
  iconPath: string;
  badgeBg: string;
  badgeColor: string;
  dotColor: string;
}> = {
  "must-crack": {
    label: "Must-Crack",
    sub: "High frequency · highest mark yield",
    iconPath: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    badgeBg: "rgba(239,68,68,0.1)",
    badgeColor: "#ef4444",
    dotColor: "#ef4444",
  },
  "high-roi": {
    label: "High-ROI",
    sub: "Big marks · less time investment",
    iconPath: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2",
    badgeBg: "rgba(234,179,8,0.12)",
    badgeColor: "#ca8a04",
    dotColor: "#ca8a04",
  },
  "good-to-do": {
    label: "Good-to-do",
    sub: "Nice cushion when core topics are done",
    iconPath: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9 12l2 2 4-4",
    badgeBg: "rgba(34,197,94,0.1)",
    badgeColor: "var(--mob-success)",
    dotColor: "var(--mob-success)",
  },
};

const TIER_ORDER: Tier[] = ["must-crack", "high-roi", "good-to-do"];

function getMathTopics(): TopicRow[] {
  return class10MathTopicWeights.map((t) => ({
    topicName: t.name,
    tier: t.tier as Tier,
    weightagePercent: t.weightagePercent,
  }));
}

function getScienceTopics(): TopicRow[] {
  return class10ScienceTopicTrendList.map((t) => ({
    topicName: t.topicName,
    tier: t.tier as Tier,
    weightagePercent: t.weightagePercent,
  }));
}

export default function ExamTrends() {
  const { subject } = useSubjectContext();
  const navigate = useNavigate();

  const [activeSubject, setActiveSubject] = useState<"Maths" | "Science">(
    (subject as "Maths" | "Science") || "Maths"
  );

  const allTopics = activeSubject === "Maths" ? getMathTopics() : getScienceTopics();

  const grouped: Record<Tier, TopicRow[]> = {
    "must-crack": [],
    "high-roi": [],
    "good-to-do": [],
  };
  for (const t of allTopics) {
    if (grouped[t.tier]) grouped[t.tier].push(t);
  }

  return (
    <MobileShell
      title="Exam Trends"
      subtitle={`9 yrs of CBSE board data · Class 10`}
      showNav
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Subject toggle */}
        <div style={{ display: "flex", background: "var(--mob-muted)", borderRadius: 12, padding: 4, gap: 4, border: "1px solid var(--mob-card-border)" }}>
          {(["Maths", "Science"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9,
                border: "none",
                background: activeSubject === s ? "var(--mob-card)" : "transparent",
                color: activeSubject === s ? "var(--mob-fg)" : "var(--mob-fg-muted)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                boxShadow: activeSubject === s ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                transition: "background 0.15s",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Tier sections */}
        {TIER_ORDER.map((tier) => {
          const cfg = TIER_CONFIG[tier];
          const topics = grouped[tier];
          if (topics.length === 0) return null;

          return (
            <div key={tier}>
              {/* Tier header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: cfg.badgeBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cfg.badgeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={cfg.iconPath} />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--mob-fg)" }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--mob-fg-muted)" }}>{cfg.sub}</div>
                </div>
              </div>

              {/* Topic rows */}
              <div className="card-soft" style={{ overflow: "hidden" }}>
                {topics.map((topic, idx) => (
                  <button
                    key={topic.topicName}
                    className="tap"
                    onClick={() => navigate(`/topic-hub/${encodeURIComponent(topic.topicName)}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "13px 16px",
                      background: "var(--mob-card)",
                      border: "none",
                      borderBottom: idx < topics.length - 1 ? "1px solid var(--mob-card-border)" : "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {/* Dot indicator */}
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: cfg.dotColor,
                        flexShrink: 0,
                      }}
                    />

                    {/* Topic name */}
                    <div style={{ flex: 1, fontFamily: "var(--font-body)", fontSize: "0.88rem", fontWeight: 600, color: "var(--mob-fg)" }}>
                      {topic.topicName}
                    </div>

                    {/* Weightage pill */}
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: cfg.badgeBg,
                        color: cfg.badgeColor,
                        flexShrink: 0,
                      }}
                    >
                      ~{Math.round(topic.weightagePercent)}%
                    </span>

                    {/* Chevron */}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mob-fg-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Footer nudge */}
        <div style={{ textAlign: "center", fontSize: "0.72rem", color: "var(--mob-fg-muted)", padding: "8px 0 4px" }}>
          Tap any topic to open its Topic Hub
        </div>
      </div>
    </MobileShell>
  );
}
