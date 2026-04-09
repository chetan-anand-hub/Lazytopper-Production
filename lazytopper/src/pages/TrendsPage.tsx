import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "../services/masteryLevelService";
import { getCanonicalChapterBySlug, formatChapterTitle } from "../data/syllabus/cbse10Canonical";

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

const tierMeta: Record<TierKey, { label: string; blurb: string }> = {
  "must-crack": { label: "Must-crack", blurb: "Appears almost every year - do these first." },
  "high-roi": { label: "High-ROI", blurb: "Great marks for the time spent - do after must-crack." },
  "good-to-do": { label: "Good-to-do", blurb: "Safety net + confidence once core topics are done." },
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
  const [showPaperDetails, setShowPaperDetails] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback((topicName: string) => {
    setOpenDropdown((prev) => (prev === topicName ? null : topicName));
  }, []);

  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [openDropdown]);

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

  const blueprintUnits = subjectKey === "Maths"
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
      ];

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

        {/* Compact hero */}
        <section style={{
          borderRadius: 16, padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(59,130,246,0.10) 100%)",
          border: "1px solid rgba(34,197,94,0.15)",
          color: "#ffffff",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 className="font-display" style={{ fontSize: "clamp(1.1rem, 4vw, 1.5rem)", lineHeight: 1.2, fontWeight: 700, margin: 0 }}>
                {subjectKey} Exam Trends
              </h1>
              <p style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>
                Chapters ranked by board exam importance. Start with{" "}
                <span style={{ color: "#ef4444", fontWeight: 600 }}>must-crack</span>, then{" "}
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>high-ROI</span>.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ borderRadius: 10, padding: 3, background: "rgba(255,255,255,0.06)", display: "inline-flex", gap: 3 }}>
                {(["Maths", "Science"] as SubjectKey[]).map((subj) => {
                  const active = subj === subjectKey;
                  return (
                    <button
                      key={subj}
                      onClick={() => handleSubjectToggle(subj)}
                      style={{
                        padding: "5px 14px", borderRadius: 8, border: "none",
                        fontSize: "0.78rem", fontWeight: 700, cursor: "pointer",
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
            </div>
          </div>

          {/* Tier filters + stream (inline) */}
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "all" as const, label: "All" },
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
                    borderRadius: 10, padding: "5px 12px",
                    border: active ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.08)",
                    background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                    color: active ? "#fff" : "rgba(255,255,255,0.45)",
                    fontSize: "0.72rem", fontWeight: active ? 700 : 500, cursor: "pointer",
                    transition: "all 0.1s ease-out",
                  }}
                >
                  {item.label}
                </button>
              );
            })}

            {subjectKey === "Science" && (
              <>
                <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.1)" }} />
                {(["all", "Physics", "Chemistry", "Biology"] as StreamKey[]).map((stream) => {
                  const active = activeStream === stream;
                  return (
                    <button
                      key={stream}
                      onClick={() => setActiveStream(stream)}
                      style={{
                        borderRadius: 10, padding: "5px 12px", fontSize: "0.72rem",
                        border: active ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.08)",
                        background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                        color: active ? "#fff" : "rgba(255,255,255,0.45)",
                        fontWeight: active ? 700 : 500, cursor: "pointer",
                        transition: "all 0.1s ease-out",
                      }}
                    >
                      {stream === "all" ? "All streams" : stream}
                    </button>
                  );
                })}
              </>
            )}

            <button
              onClick={() => setShowPaperDetails((p) => !p)}
              style={{
                marginLeft: "auto", borderRadius: 10, padding: "5px 12px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: showPaperDetails ? "rgba(255,255,255,0.08)" : "transparent",
                color: "rgba(255,255,255,0.4)",
                fontSize: "0.72rem", fontWeight: 500, cursor: "pointer",
              }}
            >
              Paper details {showPaperDetails ? "▴" : "▾"}
            </button>
          </div>

          {showPaperDetails && (
            <div style={{
              marginTop: 12, padding: "12px 14px", borderRadius: 12,
              background: "rgba(0,0,0,0.15)", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: "0.75rem", marginBottom: 10 }}>
                <div>
                  <span style={{ color: "rgba(255,255,255,0.4)" }}>Difficulty: </span>
                  <span style={{ color: "#4ade80" }}>Easy {difficultyMix.Easy}%</span>
                  {" / "}
                  <span style={{ color: "#facc15" }}>Medium {difficultyMix.Medium}%</span>
                  {" / "}
                  <span style={{ color: "#f87171" }}>Hard {difficultyMix.Hard}%</span>
                </div>
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
                CBSE 2025-26 Blueprint (80-mark theory)
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: "0.7rem" }}>
                {blueprintUnits.map((item) => (
                  <span key={item.unit} style={{
                    borderRadius: 999, padding: "3px 9px",
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
                    whiteSpace: "nowrap", color: "rgba(255,255,255,0.45)",
                  }}>
                    {item.unit}: {item.marks}m
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: "0.7rem", marginTop: 8 }}>
                {[
                  { label: "Sec A", detail: "MCQs, 1m" },
                  { label: "Sec B", detail: "Very Short, 2m" },
                  { label: "Sec C", detail: "Short, 3m" },
                  { label: "Sec D", detail: "Long, 4-5m" },
                  { label: "Sec E", detail: "Case-based, 4m" },
                ].map((s) => (
                  <span key={s.label} style={{
                    borderRadius: 999, padding: "3px 9px",
                    background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)",
                    whiteSpace: "nowrap", color: "rgba(255,255,255,0.45)",
                  }}>
                    {s.label} ({s.detail})
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Topic list */}
        <section style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
            <h2 className="font-display" style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", margin: 0 }}>
              Chapters
            </h2>
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
              {Math.round(totalWeightage * 10) / 10}% of paper
            </div>
          </div>

          {filteredTopicEntries.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", padding: "8px 4px" }}>
              No chapters match the current filters.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                getMatchScoreForChapter(chapterMeta, maxBoardWeightage);
                const sortedConcepts = Object.entries(meta.conceptWeightage ?? {}).sort((a, b) => b[1] - a[1]);
                const tierInfo = tierMeta[tier];
                const tc = tierColor(tier);
                const ml = getChapterMasteryLevel(`${grade}-${subjectKey}-${topicKey}`);

                const isDropdownOpen = openDropdown === topicName;

                return (
                  <div key={topicName} className="glass-card" style={{
                    padding: "14px 16px 12px",
                    borderColor: `${tc}25`,
                    position: "relative",
                    zIndex: isDropdownOpen ? 20 : 0,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                          <h3 className="font-display" style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                            {(() => { const ch = getCanonicalChapterBySlug(topicKey); return ch ? formatChapterTitle(ch) : topicName; })()}
                          </h3>
                          <span style={{
                            borderRadius: 999, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 600,
                            background: `${tc}12`, color: tc,
                            border: `1px solid ${tc}25`,
                          }}>
                            {tierInfo.label}
                          </span>
                          {ml !== "not_started" && (
                            <span style={{
                              borderRadius: 999, padding: "2px 8px", fontSize: "0.68rem", fontWeight: 600,
                              background: `${MASTERY_COLORS[ml]}12`, color: MASTERY_COLORS[ml],
                              border: `1px solid ${MASTERY_COLORS[ml]}25`,
                            }}>
                              {MASTERY_ICONS[ml]} {MASTERY_LABELS[ml]}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.38)", margin: "2px 0 6px", lineHeight: 1.4 }}>
                          {meta.summary || tierInfo.blurb}
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          <button
                            onClick={() => handleExplainTopic(topicName)}
                            style={{
                              borderRadius: 10, padding: "6px 12px", border: "none",
                              background: "#22c55e", fontSize: "0.72rem", fontWeight: 700,
                              color: "#000", cursor: "pointer",
                            }}
                          >
                            Learn & Practice
                          </button>

                          <div style={{ position: "relative" }} ref={isDropdownOpen ? dropdownRef : undefined}>
                            <button
                              type="button"
                              onClick={() => toggleDropdown(topicName)}
                              style={{
                                borderRadius: 10, padding: "6px 12px",
                                border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
                                fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.5)",
                                cursor: "pointer",
                              }}
                            >
                              More {isDropdownOpen ? "▴" : "▾"}
                            </button>
                            {isDropdownOpen && (
                              <div style={{
                                position: "absolute", zIndex: 50, marginTop: 4,
                                display: "grid", gap: 3, minWidth: 190, padding: 6,
                                borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                                background: "rgba(18,18,18,0.97)", backdropFilter: "blur(16px)",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                              }}>
                                {[
                                  { label: "Practice questions", handler: () => handlePracticeFromTopic(topicName) },
                                  { label: "Predicted questions", handler: () => handleSampleQuestion(topicName) },
                                  { label: "Build topic mock", handler: () => handleQuickTopicMock(topicName) },
                                  { label: "Exam tips", handler: () => handleExamTips(topicName) },
                                ].map((action) => (
                                  <button
                                    key={action.label}
                                    onClick={() => { action.handler(); setOpenDropdown(null); }}
                                    style={{
                                      borderRadius: 8, padding: "7px 10px", border: "none",
                                      background: "rgba(255,255,255,0.03)", fontSize: "0.72rem",
                                      fontWeight: 500, color: "rgba(255,255,255,0.55)",
                                      cursor: "pointer", textAlign: "left",
                                    }}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
                          ~{meta.weightagePercent ?? 0}%
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)" }}>of paper</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/methodology", { state: { from: `/trends/${grade}/${subjectKey}` } }); }}
                          style={{
                            background: "transparent", border: "none", padding: 0, marginTop: 2,
                            fontSize: "0.62rem", color: "rgba(59,130,246,0.6)", cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          How we predict
                        </button>
                      </div>
                    </div>

                    {sortedConcepts.length > 0 && (
                      <details style={{ marginTop: 8 }}>
                        <summary style={{
                          fontSize: "0.72rem", color: "rgba(255,255,255,0.3)",
                          cursor: "pointer", listStyle: "none", paddingTop: 6,
                          borderTop: "1px dashed rgba(255,255,255,0.06)",
                        }}>
                          Key subtopics ({sortedConcepts.length}) ▾
                        </summary>
                        <div style={{
                          marginTop: 6,
                          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                          gap: 4, fontSize: "0.75rem", color: "rgba(255,255,255,0.5)",
                        }}>
                          {sortedConcepts.map(([concept, pct]) => (
                            <div key={concept} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                              <span>{concept}</span>
                              <span style={{ color: "rgba(255,255,255,0.25)" }}>~{pct}%</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Next steps */}
        <section style={{ marginTop: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={goToHPQ}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); goToHPQ(); } }}
              style={{
                borderRadius: 14, padding: "14px 16px",
                border: "1px solid rgba(59,130,246,0.15)",
                background: "rgba(59,130,246,0.04)",
                textAlign: "left", cursor: "pointer",
              }}
            >
              <div className="font-display" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                Predicted Questions
              </div>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                Practice the most likely board questions for this subject.
              </p>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToHPQ(); }}
                  style={{
                    borderRadius: 999, padding: "4px 10px",
                    border: "1px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.08)",
                    color: "#60a5fa", fontSize: "0.7rem", cursor: "pointer",
                  }}
                >
                  Open Predicted Q's
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goToMockBuilder(); }}
                  style={{
                    borderRadius: 999, padding: "4px 10px",
                    border: "1px solid rgba(59,130,246,0.25)", background: "rgba(59,130,246,0.08)",
                    color: "#60a5fa", fontSize: "0.7rem", cursor: "pointer",
                  }}
                >
                  Build mock
                </button>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={goToMasteryCompanion}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); goToMasteryCompanion(); } }}
              style={{
                borderRadius: 14, padding: "14px 16px",
                border: "1px solid rgba(34,197,94,0.15)",
                background: "rgba(34,197,94,0.04)",
                textAlign: "left", cursor: "pointer",
              }}
            >
              <div className="font-display" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                Start Learning
              </div>
              <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)", margin: 0 }}>
                Begin with your weakest chapter using guided teach + practice.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrendsPage;
