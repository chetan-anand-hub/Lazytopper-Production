import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSmartLearning } from "../engine/smartLearningStore";
import type { ChapterMeta } from "../engine/smartLearningTypes";
import {
  class10MathTopicTrends,
  type Class10MathTopicTrendsData,
} from "../data/class10MathTopicTrends";
import { class10TopicByName } from "../data/class10MathTopicWeights";
import {
  class10ScienceTopicTrends,
  type Class10ScienceTrendsRoot,
  type ScienceTopicTrend,
} from "../data/class10ScienceTopicTrends";
import { useCurrentURL } from "../utils/useCurrentURL";
import {
  buildTopicHubUrl,
  buildHPQUrl,
  buildMockBuilderUrl,
  buildTopicMockUrl,
  buildAiMentorUrl,
} from "../utils/buildUrl";
import { normalizeTopicKey, resolveTopicKey as resolveCanonicalTopicKey } from "../utils/topicResolver";
import JourneyStrip from "../components/ux/JourneyStrip";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { trackUxEvent } from "../services/uxTelemetry";
import {
  getChapterMasteryLevel,
  MASTERY_LABELS,
  MASTERY_COLORS,
  MASTERY_ICONS,
  MASTERY_POINTS,
} from "../services/masteryLevelService";

type TierKey = "must-crack" | "high-roi" | "good-to-do";
type TierFilter = "all" | TierKey | "none";
type SubjectKey = "Maths" | "Science";
type StreamKey = "all" | "Physics" | "Chemistry" | "Biology";

interface TopicMeta {
  tier?: TierKey;
  weightagePercent?: number;
  summary?: string;
  conceptWeightage?: Record<string, number>;
  stream?: "Physics" | "Chemistry" | "Biology";
}

interface DifficultyMix {
  Easy: number;
  Medium: number;
  Hard: number;
}

function isTierKey(value: unknown): value is TierKey {
  return value === "must-crack" || value === "high-roi" || value === "good-to-do";
}

const tierMeta: Record<TierKey, { label: string; emoji: string; blurb: string }> = {
  "must-crack": { label: "Must-crack", emoji: "", blurb: "Appears almost every year - do these first." },
  "high-roi": { label: "High-ROI", emoji: "", blurb: "Great marks for the time spent - do after must-crack." },
  "good-to-do": { label: "Good-to-do", emoji: "", blurb: "Safety net + confidence once core topics are done." },
};

function normaliseSubject(raw?: string): SubjectKey {
  const val = (raw || "").toLowerCase();
  if (val === "science" || val === "sci") return "Science";
  return "Maths";
}

import { SCIENCE_STREAM_BY_TOPIC } from "../utils/scienceStreamMap";

interface NormalisedDataset {
  topicEntries: [string, TopicMeta][];
  difficultyMix: DifficultyMix;
}

function normaliseMathDataset(data: Class10MathTopicTrendsData): NormalisedDataset {
  const topicEntries: [string, TopicMeta][] = Object.entries(data.topics).map(
    ([topicName, meta]) => [
      topicName,
      {
        tier: meta.tier as TierKey,
        weightagePercent: meta.weightagePercent ?? class10TopicByName[topicName]?.weightagePercent,
        summary: (meta as { summary?: string }).summary,
        conceptWeightage: meta.conceptWeightage,
      },
    ]
  );
  return { topicEntries, difficultyMix: data.difficultyDistributionPercent };
}

function normaliseScienceDataset(data: Class10ScienceTrendsRoot): NormalisedDataset {
  const topicEntries: [string, TopicMeta][] = Object.values(data.topics).map((topic: ScienceTopicTrend) => {
    const conceptWeightage: Record<string, number> = {};
    topic.concepts.forEach((c) => { conceptWeightage[c.name] = c.sharePercent; });
    const stream = SCIENCE_STREAM_BY_TOPIC[topic.topicKey] ?? ("Biology" as const);
    return [
      topic.topicName,
      {
        tier: topic.tier,
        weightagePercent: topic.weightagePercent,
        summary: topic.concepts[0]?.summary_and_exam_tips,
        conceptWeightage,
        stream,
      },
    ];
  });
  return { topicEntries, difficultyMix: data.difficultyDistributionPercent };
}

function getNormalisedDataset(subject: SubjectKey): NormalisedDataset {
  if (subject === "Science") return normaliseScienceDataset(class10ScienceTopicTrends);
  return normaliseMathDataset(class10MathTopicTrends);
}

function getStream(meta: TopicMeta): StreamKey {
  if (meta.stream === "Physics") return "Physics";
  if (meta.stream === "Chemistry") return "Chemistry";
  if (meta.stream === "Biology") return "Biology";
  return "all";
}

function tierColor(tier: TierKey): string {
  if (tier === "must-crack") return "#ef4444";
  if (tier === "high-roi") return "#3b82f6";
  return "#f97316";
}

const TrendsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getMatchScoreForChapter } = useSmartLearning();

  const params = useParams<"grade" | "subject">();
  const grade = params.grade || "10";
  const subjectKey = normaliseSubject(params.subject);

  const currentURL = useCurrentURL();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = String(navState?.back || "/");
  const backLabel = String(navState?.backLabel || "Back to home");

  const [activeTier, setActiveTier] = useState<TierFilter>("all");
  const [activeStream, setActiveStream] = useState<StreamKey>("all");

  const { topicEntries, difficultyMix } = useMemo(() => getNormalisedDataset(subjectKey), [subjectKey]);

  const filteredTopicEntries = useMemo(() => {
    if (activeTier === "none") return [] as typeof topicEntries;
    let entries = topicEntries;
    if (subjectKey === "Science" && activeStream !== "all") {
      entries = entries.filter(([, meta]) => getStream(meta) === activeStream);
    }
    if (activeTier !== "all") {
      entries = entries.filter(([, meta]) => meta.tier === activeTier);
    }
    return entries;
  }, [topicEntries, activeTier, activeStream, subjectKey]);

  const totalWeightage = filteredTopicEntries.reduce((sum, [, meta]) => sum + (meta.weightagePercent ?? 0), 0);

  const maxBoardWeightage = useMemo(() => {
    const values = topicEntries.map(([, meta]) => Number(meta.weightagePercent ?? 0)).filter((v) => Number.isFinite(v) && v > 0);
    return values.length ? Math.max(...values) : 14;
  }, [topicEntries]);

  const handleSubjectToggle = (next: SubjectKey) => navigate(`/trends/${grade}/${next}`);
  const handleTierClick = (tier: "all" | TierKey) => {
    setActiveTier((prev) => {
      if (tier === "all") return "all";
      return prev === tier ? "none" : tier;
    });
  };

  const handleSampleQuestion = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({ subjectKey, topicParam: topicName });
    trackUxEvent("trends_topic_more_click", "trends", { action: "hpq", topicName, subject: subjectKey });
    navigate(buildHPQUrl(grade, subjectKey, { topic: canonicalTopicKey || topicName }), { state: { back: currentURL, backLabel: "Back to trends" } });
  };

  const handleQuickTopicMock = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({ subjectKey, topicParam: topicName });
    trackUxEvent("trends_topic_more_click", "trends", { action: "topic_mock", topicName, subject: subjectKey });
    navigate(buildTopicMockUrl(grade, subjectKey, canonicalTopicKey || topicName), { state: { back: currentURL, backLabel: "Back to trends" } });
  };

  const handlePracticeFromTopic = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({ subjectKey, topicParam: topicName });
    trackUxEvent("trends_topic_practice_click", "trends", { topicName, subject: subjectKey });
    navigate(`/practice/${grade}/${subjectKey}?topic=${encodeURIComponent(canonicalTopicKey || topicName)}`, { state: { back: currentURL, backLabel: "Back to trends" } });
  };

  const handleExplainTopic = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({ subjectKey, topicParam: topicName });
    trackUxEvent("trends_topic_teach_click", "trends", { topicName, subject: subjectKey });
    const topicHubUrl = buildTopicHubUrl(grade, subjectKey, canonicalTopicKey || topicName);
    const [pathOnly, query = ""] = topicHubUrl.split("?");
    const params = new URLSearchParams(query);
    params.set("tab", "learn");
    params.set("teach", "1");
    params.set("teachSource", "trends_explain");
    navigate(`${pathOnly}?${params.toString()}`, { state: { back: currentURL, backLabel: "Back to trends" } });
  };

  const handleExamTips = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({ subjectKey, topicParam: topicName });
    trackUxEvent("trends_topic_more_click", "trends", { action: "exam_tips", topicName, subject: subjectKey });
    navigate(buildAiMentorUrl(grade, subjectKey), {
      state: {
        back: currentURL, backLabel: "Back to trends",
        payload: { topic: canonicalTopicKey || topicName, topicKey: canonicalTopicKey || topicName },
        mode: "topic_exam_tips",
      },
    });
  };

  const goToHPQ = () => navigate(buildHPQUrl(grade, subjectKey), { state: { back: currentURL, backLabel: "Back to trends" } });
  const goToMockBuilder = () => navigate(buildMockBuilderUrl(grade, subjectKey), { state: { back: currentURL, backLabel: "Back to trends" } });

  const goToMasteryCompanion = () => {
    const nextTopic = filteredTopicEntries[0]?.[0] || topicEntries[0]?.[0] || "";
    if (nextTopic) { handleExplainTopic(nextTopic); return; }
    navigate(buildTopicHubUrl(grade, subjectKey));
  };

  return (
    <div className="dark-page">
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 16px 100px" }}>

        <ReturnContextBar
          backTo={backTo}
          backLabel={backLabel}
          quickLinks={[
            { label: "Chapter Hub", to: `/topic-hub/${grade}/${subjectKey}` },
            { label: "Practice", to: `/practice/${grade}/${subjectKey}` },
            { label: "Predicted Q's", to: `/highly-probable/${grade}/${subjectKey}` },
          ]}
        />
        <JourneyStrip current="trends" grade={grade} subject={subjectKey} />

        {/* Hero card */}
        <section style={{
          borderRadius: 16, padding: "24px 24px 24px 28px",
          background: "linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(59,130,246,0.15) 100%)",
          border: "1px solid rgba(34,197,94,0.2)",
          color: "#ffffff",
          display: "flex", flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 24,
        }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.22em", textTransform: "uppercase", opacity: 0.6, marginBottom: 8 }}>
              Class {grade} - {subjectKey} - Exam trends
            </div>
            <h1 className="font-display" style={{ fontSize: "clamp(1.4rem, 5vw, 2.1rem)", lineHeight: 1.15, fontWeight: 700, marginBottom: 10 }}>
              Class {grade} {subjectKey} Exam Trends Hub
            </h1>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "rgba(255,255,255,0.6)" }}>
              Your exam trend radar for this subject. See which chapters are{" "}
              <strong style={{ fontWeight: 700, color: "#ef4444" }}>must-crack</strong>,{" "}
              <strong style={{ fontWeight: 700, color: "#3b82f6" }}>high-ROI</strong>, or{" "}
              <strong style={{ fontWeight: 700, color: "#f97316" }}>good-to-do</strong> based on
              CBSE board trends.
            </p>

            {/* Tier filters */}
            <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "all" as const, label: "All tiers" },
                { id: "must-crack" as const, label: "Must-crack" },
                { id: "high-roi" as const, label: "High-ROI" },
                { id: "good-to-do" as const, label: "Good-to-do" },
              ].map((item) => {
                const active = activeTier === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTierClick(item.id === "all" ? "all" : (item.id as TierKey))}
                    style={{
                      borderRadius: 12, padding: "6px 14px",
                      border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                      background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                      color: active ? "#fff" : "rgba(255,255,255,0.5)",
                      fontSize: "0.75rem", fontWeight: active ? 800 : 600, cursor: "pointer",
                      transition: "all 0.1s ease-out",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject + stream toggles */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ alignSelf: "flex-end", borderRadius: 12, padding: 4, background: "rgba(255,255,255,0.06)", display: "inline-flex", gap: 4 }}>
              {(["Maths", "Science"] as SubjectKey[]).map((subj) => {
                const active = subj === subjectKey;
                return (
                  <button
                    key={subj}
                    onClick={() => handleSubjectToggle(subj)}
                    style={{
                      padding: "6px 16px", borderRadius: 10, border: "none",
                      fontSize: "0.8rem", fontWeight: 800, cursor: "pointer",
                      background: active ? "#22c55e" : "transparent",
                      color: active ? "#000" : "rgba(255,255,255,0.5)",
                      transition: "all 0.1s ease-out",
                    }}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>

            {subjectKey === "Science" && (
              <div style={{
                marginTop: 18, padding: "10px 12px", borderRadius: 12,
                background: "rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", gap: 4, minWidth: 220,
              }}>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
                  Streams
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                  {([
                    { id: "all", label: "All streams" },
                    { id: "Physics", label: "Physics" },
                    { id: "Chemistry", label: "Chemistry" },
                    { id: "Biology", label: "Biology" },
                  ] as { id: StreamKey; label: string }[]).map((stream) => {
                    const active = activeStream === stream.id;
                    return (
                      <button
                        key={stream.id}
                        onClick={() => setActiveStream(stream.id)}
                        style={{
                          borderRadius: 10, padding: "4px 10px", fontSize: "0.75rem",
                          border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                          background: active ? "rgba(255,255,255,0.1)" : "transparent",
                          color: active ? "#fff" : "rgba(255,255,255,0.5)",
                          fontWeight: active ? 800 : 600, cursor: "pointer",
                          transition: "all 0.1s ease-out",
                        }}
                      >
                        {stream.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Difficulty + sections card */}
        <section className="glass-card" style={{ marginTop: 20, padding: "18px 22px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="font-display" style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
              Difficulty mix
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.8rem" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 12px",
                background: "rgba(34,197,94,0.1)", color: "#4ade80",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#22c55e" }} />
                Easy {difficultyMix.Easy}%
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 12px",
                background: "rgba(250,204,21,0.1)", color: "#facc15",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#facc15" }} />
                Medium {difficultyMix.Medium}%
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "6px 12px",
                background: "rgba(239,68,68,0.1)", color: "#f87171",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: "#ef4444" }} />
                Hard {difficultyMix.Hard}%
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: "0.75rem", paddingTop: 6 }}>
              {[
                "Section A (MCQs / Objective, 1 mark)",
                "Section B (Very Short Answer, 2 marks)",
                "Section C (Short Answer, 3 marks)",
                "Section D (Long Answer, 4-5 marks)",
                "Section E (Case-based, 4 marks)",
              ].map((chip) => (
                <span key={chip} style={{
                  borderRadius: 999, padding: "6px 12px",
                  background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                  color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap",
                }}>
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Blueprint source attribution */}
        <section style={{
          marginTop: 16, borderRadius: 16, padding: "14px 18px",
          background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)",
          fontSize: "0.78rem", color: "rgba(255,255,255,0.6)",
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: "#4ade80" }}>
            Based on CBSE 2025-26 Blueprint (80-mark theory paper)
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: "0.72rem" }}>
            {(subjectKey === "Maths"
              ? [
                  { unit: "Number Systems", marks: 6 },
                  { unit: "Algebra", marks: 20 },
                  { unit: "Coordinate Geometry", marks: 6 },
                  { unit: "Geometry", marks: 15 },
                  { unit: "Trigonometry", marks: 12 },
                  { unit: "Mensuration", marks: 10 },
                  { unit: "Statistics & Probability", marks: 11 },
                ]
              : [
                  { unit: "Chemical Substances", marks: 25 },
                  { unit: "World of Living", marks: 25 },
                  { unit: "Natural Phenomena", marks: 12 },
                  { unit: "Effects of Current", marks: 13 },
                  { unit: "Natural Resources", marks: 5 },
                ]
            ).map((item) => (
              <span key={item.unit} style={{
                borderRadius: 999, padding: "3px 10px",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(34,197,94,0.15)",
                whiteSpace: "nowrap", color: "rgba(255,255,255,0.5)",
              }}>
                {item.unit}: {item.marks} marks ({((item.marks / 80) * 100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </section>

        {/* Topic list */}
        <section style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
            <div>
              <h2 className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                Class {grade} {subjectKey} - chapter &amp; concept trends
              </h2>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                Darker / bolder cards are heavier. Hit the <span style={{ color: "#ef4444" }}>must-crack</span> ones first, then the{" "}
                <span style={{ color: "#3b82f6" }}>high-ROI</span> ones. Keep <span style={{ color: "#f97316" }}>good-to-do</span> once the core chapters are done.
              </p>
            </div>
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>
              Total weightage covered:{" "}
              <span style={{ fontWeight: 600, color: "#fff" }}>{Math.round(totalWeightage * 10) / 10}%</span>
            </div>
          </div>

          {filteredTopicEntries.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", padding: "8px 4px" }}>
              Nothing visible with the current filters. Switch tier chips above again to roll the topics back down.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredTopicEntries.map(([topicName, meta]) => {
                const tier: TierKey = isTierKey(meta.tier) ? meta.tier : "good-to-do";
                const topicKey = normalizeTopicKey(topicName);
                const chapterMeta: ChapterMeta = {
                  id: `${grade}-${subjectKey}-${topicKey}`,
                  grade: String(grade || "10"),
                  subject: subjectKey,
                  topicKey,
                  name: topicName,
                  boardWeightage: Number(meta.weightagePercent ?? 0),
                  tier,
                };
                const matchScore = getMatchScoreForChapter(chapterMeta, maxBoardWeightage);
                const sortedConcepts = Object.entries(meta.conceptWeightage ?? {}).sort((a, b) => b[1] - a[1]);
                const tierInfo = tierMeta[tier];
                const tc = tierColor(tier);

                return (
                  <div key={topicName} className="glass-card" style={{
                    padding: "16px 18px 14px",
                    borderColor: `${tc}30`,
                    boxShadow: `0 0 20px ${tc}10`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          <h3 className="font-display" style={{ fontSize: "1rem", fontWeight: 700, color: "#fff" }}>
                            {topicName}
                          </h3>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            borderRadius: 999, padding: "4px 10px", fontSize: "0.75rem",
                            background: `${tc}15`, color: tc,
                            border: `1px solid ${tc}30`,
                          }}>
                            <span>{tierInfo.emoji}</span>
                            <span>{tierInfo.label}</span>
                          </span>
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            borderRadius: 999, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700,
                            background: "rgba(34,197,94,0.1)", color: "#4ade80",
                            border: "1px solid rgba(34,197,94,0.2)",
                          }}>
                            {matchScore}% Match
                          </span>
                          {(() => {
                            const ml = getChapterMasteryLevel(`${grade}-${subjectKey}-${topicKey}`);
                            if (ml === "not_started") return null;
                            return (
                              <span style={{
                                display: "inline-flex", alignItems: "center", gap: 3,
                                borderRadius: 999, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700,
                                background: `${MASTERY_COLORS[ml]}15`, color: MASTERY_COLORS[ml],
                                border: `1px solid ${MASTERY_COLORS[ml]}30`,
                              }}>
                                <span>{MASTERY_ICONS[ml]}</span>
                                <span>{MASTERY_LABELS[ml]}</span>
                                <span style={{ fontSize: "0.65rem", opacity: 0.7 }}>{MASTERY_POINTS[ml]}pts</span>
                              </span>
                            );
                          })()}
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                          {meta.summary || tierInfo.blurb}
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                          <button
                            onClick={() => handleExplainTopic(topicName)}
                            style={{
                              borderRadius: 12, padding: "7px 14px", border: "none",
                              background: "#22c55e", fontSize: "0.78rem", fontWeight: 700,
                              color: "#000", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.5px",
                            }}
                          >
                            Learn & Practice
                          </button>

                          <details style={{ position: "relative" }}>
                            <summary style={{
                              borderRadius: 12, padding: "7px 14px",
                              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                              fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.6)",
                              cursor: "pointer", listStyle: "none",
                            }}>
                              More ▾
                            </summary>
                            <div style={{
                              position: "absolute", zIndex: 10, marginTop: 6,
                              display: "grid", gap: 4, minWidth: 200, padding: 8,
                              borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(20,20,20,0.95)", backdropFilter: "blur(16px)",
                              boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                            }}>
                              {[
                                { label: "Practice questions", handler: () => handlePracticeFromTopic(topicName) },
                                { label: "Highly probable questions", handler: () => handleSampleQuestion(topicName) },
                                { label: "Build topic mock", handler: () => handleQuickTopicMock(topicName) },
                                { label: "Exam tips", handler: () => handleExamTips(topicName) },
                              ].map((action) => (
                                <button
                                  key={action.label}
                                  onClick={action.handler}
                                  style={{
                                    borderRadius: 10, padding: "8px 12px", border: "none",
                                    background: "rgba(255,255,255,0.04)", fontSize: "0.78rem",
                                    fontWeight: 600, color: "rgba(255,255,255,0.6)",
                                    cursor: "pointer", textAlign: "left",
                                  }}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          </details>
                        </div>
                      </div>

                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", textAlign: "right" }}>
                        ~{meta.weightagePercent ?? 0}% of paper
                      </div>
                    </div>

                    {sortedConcepts.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed rgba(255,255,255,0.06)" }}>
                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                          Most asked subtopics inside this chapter:
                        </p>
                        <div style={{
                          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                          gap: 6, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)",
                        }}>
                          {sortedConcepts.map(([concept, pct]) => (
                            <div key={concept} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                              <span>{concept}</span>
                              <span style={{ color: "rgba(255,255,255,0.35)" }}>~{pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Two learner journeys */}
        <section style={{ marginTop: 26 }}>
          <div style={{ marginBottom: 8, fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
            Pick your mode:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={goToHPQ}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); goToHPQ(); } }}
              style={{
                borderRadius: 16, padding: "14px 18px",
                border: "1px solid rgba(59,130,246,0.2)",
                background: "rgba(59,130,246,0.06)",
                textAlign: "left", cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                Step 2 - Practice
              </div>
              <div className="font-display" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                See Highly Probable Questions for this grade
              </div>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                Jump to your curated predicted questions bank, then build a full mock when exam date is near.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToHPQ(); }}
                  style={{
                    borderRadius: 999, padding: "5px 11px",
                    border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)",
                    color: "#60a5fa", fontSize: "0.74rem", cursor: "pointer",
                  }}
                >
                  Open Predicted Q's
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToMockBuilder(); }}
                  style={{
                    borderRadius: 999, padding: "5px 11px",
                    border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.1)",
                    color: "#60a5fa", fontSize: "0.74rem", cursor: "pointer",
                  }}
                >
                  Build full mock
                </button>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={goToMasteryCompanion}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); goToMasteryCompanion(); } }}
              style={{
                borderRadius: 16, padding: "14px 18px",
                border: "1px solid rgba(34,197,94,0.2)",
                background: "rgba(34,197,94,0.06)",
                textAlign: "left", cursor: "pointer",
              }}
            >
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
                Mastery companion
              </div>
              <div className="font-display" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                Start guided learning from your current weak chapter
              </div>
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                Use Teach + Practice loop through Chapter Hub for daily progression through the year.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrendsPage;
