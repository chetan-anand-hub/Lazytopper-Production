import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { class10MathTopicWeights } from "../../data/class10MathTopicWeights";
import { class10ScienceTopicTrendList } from "../../data/class10ScienceTopicTrends";

type Tier = "must-crack" | "high-roi" | "good-to-do";

const TIER_LABEL: Record<Tier, string> = {
  "must-crack": "MUST-CRACK",
  "high-roi": "HIGH-ROI",
  "good-to-do": "GOOD-TO-DO",
};

const TIER_BADGE_STYLE: Record<Tier, { bg: string; color: string }> = {
  "must-crack": { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  "high-roi": { bg: "rgba(234,179,8,0.12)", color: "#ca8a04" },
  "good-to-do": { bg: "rgba(34,197,94,0.1)", color: "var(--mob-success)" },
};

interface TopicEntry {
  topicName: string;
  tier: Tier;
  weightagePercent: number;
  subjectKey: "Maths" | "Science";
}

function getAllTopics(): TopicEntry[] {
  const maths: TopicEntry[] = class10MathTopicWeights.map((t) => ({
    topicName: t.name,
    tier: t.tier as Tier,
    weightagePercent: t.weightagePercent,
    subjectKey: "Maths" as const,
  }));
  const science: TopicEntry[] = class10ScienceTopicTrendList.map((t) => ({
    topicName: t.topicName,
    tier: t.tier as Tier,
    weightagePercent: t.weightagePercent,
    subjectKey: "Science" as const,
  }));
  return [...maths, ...science];
}

const ACTION_TILES = [
  {
    key: "learn",
    title: "Learn",
    sub: "5-min concept rescue",
    iconPath: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
    getRoute: (topicName: string, subjectKey: string) =>
      `/topic-hub/10/${subjectKey}/${encodeURIComponent(topicName)}`,
  },
  {
    key: "practice",
    title: "Practice",
    sub: "Topic-wise sets",
    iconPath: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",
    getRoute: (_topicName: string, _subjectKey: string) => "/practice-hub",
  },
  {
    key: "test",
    title: "Test",
    sub: "Topic mini-test · 15 min",
    iconPath: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-6 9l2 2 4-4",
    getRoute: (_topicName: string, _subjectKey: string) => "/practice-hub",
  },
  {
    key: "predicted",
    title: "Predicted Qs",
    sub: "Likely 2026 board Qs",
    iconPath: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2",
    getRoute: (_topicName: string, _subjectKey: string) => "/practice-hub",
  },
];

export default function TopicHub() {
  const navigate = useNavigate();
  const { topicName: rawTopicParam } = useParams<{ topicName?: string }>();
  const { subject } = useSubjectContext();

  const allTopics = getAllTopics();

  const topicEntry: TopicEntry | undefined = rawTopicParam
    ? allTopics.find(
        (t) =>
          t.topicName.toLowerCase() ===
          decodeURIComponent(rawTopicParam).toLowerCase()
      )
    : undefined;

  if (!topicEntry) {
    return (
      <TopicPicker
        allTopics={allTopics}
        defaultSubject={(subject as "Maths" | "Science") || "Maths"}
      />
    );
  }

  const tier = topicEntry.tier;
  const tierCfg = TIER_BADGE_STYLE[tier];

  return (
    <MobileShell
      title="Topic Hub"
      subtitle={`${topicEntry.topicName} · ${topicEntry.subjectKey}`}
      showBack
      showNav
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Topic header card */}
        <div className="card-soft" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 18px",
              background: "var(--mob-primary)",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                display: "inline-block",
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.85)",
                marginBottom: 8,
              }}
            >
              {TIER_LABEL[tier]}
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.35rem",
                lineHeight: 1.2,
                margin: 0,
                marginBottom: 6,
              }}
            >
              {topicEntry.topicName}
            </h2>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.75)" }}>
              ~{Math.round(topicEntry.weightagePercent)}% of board marks · Class 10 · CBSE
            </div>
          </div>

          {/* Stats strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              borderTop: "1px solid var(--mob-card-border)",
              textAlign: "center",
            }}
          >
            {[
              { label: "Priority", value: TIER_LABEL[tier] },
              { label: "Mark weight", value: `~${Math.round(topicEntry.weightagePercent)}%` },
              { label: "Subject", value: topicEntry.subjectKey },
            ].map((stat, idx, arr) => (
              <div
                key={stat.label}
                style={{
                  padding: "12px 8px",
                  borderRight:
                    idx < arr.length - 1
                      ? "1px solid var(--mob-card-border)"
                      : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    color: "var(--mob-fg)",
                    marginBottom: 2,
                  }}
                >
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.62rem", color: "var(--mob-fg-muted)" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2×2 action tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ACTION_TILES.map((tile) => (
            <button
              key={tile.key}
              className="card-soft tap"
              onClick={() =>
                navigate(tile.getRoute(topicEntry.topicName, topicEntry.subjectKey))
              }
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 10,
                padding: "16px 14px",
                cursor: "pointer",
                border: "1px solid var(--mob-card-border)",
                background: "var(--mob-card)",
                color: "var(--mob-fg)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "var(--mob-muted)",
                  color: "var(--mob-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={tile.iconPath} />
                </svg>
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontWeight: 700,
                      fontSize: "0.88rem",
                      color: "var(--mob-fg)",
                    }}
                  >
                    {tile.title}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--mob-fg-muted)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
                <div style={{ fontSize: "0.68rem", color: "var(--mob-fg-muted)" }}>
                  {tile.sub}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Tier note */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: tierCfg.bg,
            border: `1px solid ${tierCfg.color}40`,
            fontSize: "0.74rem",
            color: "var(--mob-fg-muted)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: tierCfg.color }}>
            {tier === "must-crack"
              ? "Must-Crack"
              : tier === "high-roi"
              ? "High-ROI"
              : "Good-to-do"}
            :
          </strong>{" "}
          {tier === "must-crack" &&
            "Appears in almost every board year. Prioritise above all others."}
          {tier === "high-roi" &&
            "High marks for the time you invest — do this after Must-Crack topics."}
          {tier === "good-to-do" &&
            "Solid confidence booster once your core topics are solid."}
        </div>
      </div>
    </MobileShell>
  );
}

function TopicPicker({
  allTopics,
  defaultSubject,
}: {
  allTopics: TopicEntry[];
  defaultSubject: "Maths" | "Science";
}) {
  const navigate = useNavigate();
  const [activeSubject, setActiveSubject] =
    useState<"Maths" | "Science">(defaultSubject);

  const topics = allTopics
    .filter((t) => t.subjectKey === activeSubject)
    .sort((a, b) => b.weightagePercent - a.weightagePercent);

  return (
    <MobileShell title="Topic Hub" subtitle="Pick a topic to explore" showNav>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Subject toggle */}
        <div
          style={{
            display: "flex",
            background: "var(--mob-muted)",
            borderRadius: 12,
            padding: 4,
            gap: 4,
            border: "1px solid var(--mob-card-border)",
          }}
        >
          {(["Maths", "Science"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSubject(s)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9,
                border: "none",
                background:
                  activeSubject === s ? "var(--mob-card)" : "transparent",
                color:
                  activeSubject === s
                    ? "var(--mob-fg)"
                    : "var(--mob-fg-muted)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "background 0.15s",
                boxShadow:
                  activeSubject === s
                    ? "0 1px 3px rgba(0,0,0,0.07)"
                    : "none",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="card-soft" style={{ overflow: "hidden" }}>
          {topics.map((topic, idx) => {
            const tierCfg = TIER_BADGE_STYLE[topic.tier];
            return (
              <button
                key={topic.topicName}
                className="tap"
                onClick={() =>
                  navigate(`/topic-hub/${encodeURIComponent(topic.topicName)}`)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "13px 16px",
                  background: "var(--mob-card)",
                  border: "none",
                  borderBottom:
                    idx < topics.length - 1
                      ? "1px solid var(--mob-card-border)"
                      : "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    color: "var(--mob-fg)",
                  }}
                >
                  {topic.topicName}
                </div>
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 5,
                    background: tierCfg.bg,
                    color: tierCfg.color,
                  }}
                >
                  {TIER_LABEL[topic.tier]}
                </span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--mob-fg-muted)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    </MobileShell>
  );
}
