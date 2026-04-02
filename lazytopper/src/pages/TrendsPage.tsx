// src/pages/TrendsPage.tsx
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
  type Class10ScienceTopicKey,
  type Class10ScienceTrendsRoot,
  type ScienceTopicTrend,
} from "../data/class10ScienceTopicTrends";
// NEW imports for navigation state and URL builders
import { useCurrentURL } from "../utils/useCurrentURL";
import {
  buildTopicHubUrl,
  buildHPQUrl,
  buildMockBuilderUrl,
  buildAiMentorUrl,
} from "../utils/buildUrl";
import { normalizeTopicKey, resolveTopicKey as resolveCanonicalTopicKey } from "../utils/topicResolver";
import JourneyStrip from "../components/ux/JourneyStrip";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { trackUxEvent } from "../services/uxTelemetry";

// --- Local types -------------------------------------------------

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

// --- Small helpers -----------------------------------------------

const tierMeta: Record<
  TierKey,
  { label: string; emoji: string; blurb: string }
> = {
  "must-crack": {
    label: "Must-crack",
    emoji: "",
    blurb: "Appears almost every year - do these first.",
  },
  "high-roi": {
    label: "High-ROI",
    emoji: "",
    blurb: "Great marks for the time spent - do after must-crack.",
  },
  "good-to-do": {
    label: "Good-to-do",
    emoji: "",
    blurb: "Safety net + confidence once core topics are done.",
  },
};

function normaliseSubject(raw?: string): SubjectKey {
  const val = (raw || "").toLowerCase();
  if (val === "science" || val === "sci") return "Science";
  return "Maths";
}

// Map each science topic to a stream so the filter works
const SCIENCE_STREAM_BY_TOPIC: Partial<
  Record<Class10ScienceTopicKey, "Physics" | "Chemistry" | "Biology">
> = {
  ChemicalReactions: "Chemistry",
  AcidsBasesSalts: "Chemistry",
  MetalsNonMetals: "Chemistry",
  CarbonCompounds: "Chemistry",

  LifeProcesses: "Biology",
  ControlAndCoordination: "Biology",
  Reproduction: "Biology",
  HeredityEvolution: "Biology",
  OurEnvironment: "Biology",

  Light: "Physics",
  HumanEyeAndColourfulWorld: "Physics",
  Electricity: "Physics",
  MagneticEffects: "Physics",
};

interface NormalisedDataset {
  topicEntries: [string, TopicMeta][];
  difficultyMix: DifficultyMix;
}

function normaliseMathDataset(
  data: Class10MathTopicTrendsData
): NormalisedDataset {
  const topicEntries: [string, TopicMeta][] = Object.entries(data.topics).map(
    ([topicName, meta]) => [
      topicName,
      {
        tier: meta.tier as TierKey,
        weightagePercent:
          meta.weightagePercent ?? class10TopicByName[topicName]?.weightagePercent,
        summary: (meta as { summary?: string }).summary,
        conceptWeightage: meta.conceptWeightage,
      },
    ]
  );

  return {
    topicEntries,
    difficultyMix: data.difficultyDistributionPercent,
  };
}

function normaliseScienceDataset(
  data: Class10ScienceTrendsRoot
): NormalisedDataset {
  const topicEntries: [string, TopicMeta][] = Object.values(
    data.topics
  ).map((topic: ScienceTopicTrend) => {
    const conceptWeightage: Record<string, number> = {};
    topic.concepts.forEach((c) => {
      conceptWeightage[c.name] = c.sharePercent;
    });

    const stream =
      SCIENCE_STREAM_BY_TOPIC[topic.topicKey] ?? ("Biology" as const);

    return [
      topic.topicName,
      {
        tier: topic.tier,
        weightagePercent: topic.weightagePercent,
        // For now, take the first concept's tips as a short summary
        summary: topic.concepts[0]?.summary_and_exam_tips,
        conceptWeightage,
        stream,
      },
    ];
  });

  return {
    topicEntries,
    difficultyMix: data.difficultyDistributionPercent,
  };
}

function getNormalisedDataset(subject: SubjectKey): NormalisedDataset {
  if (subject === "Science") {
    return normaliseScienceDataset(class10ScienceTopicTrends);
  }
  return normaliseMathDataset(class10MathTopicTrends);
}

// Fallback stream if science topic has no stream tagged
function getStream(meta: TopicMeta): StreamKey {
  if (meta.stream === "Physics") return "Physics";
  if (meta.stream === "Chemistry") return "Chemistry";
  if (meta.stream === "Biology") return "Biology";
  return "all";
}

// --- Component ---------------------------------------------------

const TrendsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getMatchScoreForChapter } = useSmartLearning();

  const params = useParams<"grade" | "subject">();
  const grade = params.grade || "10";
  const subjectKey = normaliseSubject(params.subject);

  // Capture the current URL for back-navigation
  const currentURL = useCurrentURL();
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = String(navState?.back || "/");
  const backLabel = String(navState?.backLabel || "Back to home");

  const [activeTier, setActiveTier] = useState<TierFilter>("all");
  const [activeStream, setActiveStream] = useState<StreamKey>("all");

  // Normalised data from our JSONs (Maths + Science)
  const { topicEntries, difficultyMix } = useMemo(
    () => getNormalisedDataset(subjectKey),
    [subjectKey]
  );

  const filteredTopicEntries = useMemo(() => {
    if (activeTier === "none") {
      return [] as typeof topicEntries;
    }

    let entries = topicEntries;

    if (subjectKey === "Science" && activeStream !== "all") {
      entries = entries.filter(
        ([, meta]) => getStream(meta) === activeStream
      );
    }

    if (activeTier !== "all") {
      entries = entries.filter(([, meta]) => meta.tier === activeTier);
    }

    return entries;
  }, [topicEntries, activeTier, activeStream, subjectKey]);

  const totalWeightage = filteredTopicEntries.reduce(
    (sum, [, meta]) => sum + (meta.weightagePercent ?? 0),
    0
  );

  const maxBoardWeightage = useMemo(() => {
    const values = topicEntries
      .map(([, meta]) => Number(meta.weightagePercent ?? 0))
      .filter((v) => Number.isFinite(v) && v > 0);
    return values.length ? Math.max(...values) : 14;
  }, [topicEntries]);

  const handleSubjectToggle = (next: SubjectKey) => {
    navigate(`/trends/${grade}/${next}`);
  };

  const handleTierClick = (tier: "all" | TierKey) => {
    setActiveTier((prev) => {
      if (tier === "all") return "all";
      return prev === tier ? "none" : tier;
    });
  };

  // UPDATED navigation handlers to use build functions and back-state
  const handleSampleQuestion = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({
      subjectKey,
      topicParam: topicName,
    });
    trackUxEvent("trends_topic_more_click", "trends", { action: "hpq", topicName, subject: subjectKey });
    navigate(
      buildHPQUrl(grade, subjectKey, { topic: canonicalTopicKey || topicName }),
      {
        state: {
          back: currentURL,
          backLabel: "Back to trends",
        },
      }
    );
  };

  const handleGoToTopicHub = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({
      subjectKey,
      topicParam: topicName,
    });
    navigate(
      buildTopicHubUrl(grade, subjectKey, canonicalTopicKey || topicName),
      {
        state: {
          back: currentURL,
          backLabel: "Back to trends",
        },
      }
    );
  };


  const handleQuickTopicMock = (topicName: string) => {
    trackUxEvent("trends_topic_more_click", "trends", { action: "mock", topicName, subject: subjectKey });
    navigate(
      buildMockBuilderUrl(grade, subjectKey, {
        from: "trends-topic",
        topic: topicName,
      }),
      {
        state: {
          back: currentURL,
          backLabel: "Back to trends",
        },
      }
    );
  };

  const handlePracticeFromTopic = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({
      subjectKey,
      topicParam: topicName,
    });
    trackUxEvent("trends_topic_practice_click", "trends", { topicName, subject: subjectKey });
    const url = `/practice/${grade}/${subjectKey}?topic=${encodeURIComponent(
      canonicalTopicKey || topicName
    )}`;
    navigate(url, {
      state: {
        back: currentURL,
        backLabel: "Back to trends",
      },
    });
  };

  const handleExplainTopic = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({
      subjectKey,
      topicParam: topicName,
    });
    trackUxEvent("trends_topic_teach_click", "trends", { topicName, subject: subjectKey });
    const topicHubUrl = buildTopicHubUrl(grade, subjectKey, canonicalTopicKey || topicName);
    const [pathOnly, query = ""] = topicHubUrl.split("?");
    const params = new URLSearchParams(query);
    params.set("tab", "learn");
    params.set("teach", "1");
    params.set("teachSource", "trends_explain");
    navigate(`${pathOnly}?${params.toString()}`, {
      state: {
        back: currentURL,
        backLabel: "Back to trends",
      },
    });
  };

  /**
   * Ask the mentor for exam strategy on how to score 95+ from a topic.  This
   * navigates to the AI mentor page using the `topic_exam_tips` mode.
   */
  const handleExamTips = (topicName: string) => {
    const canonicalTopicKey = resolveCanonicalTopicKey({
      subjectKey,
      topicParam: topicName,
    });
    trackUxEvent("trends_topic_more_click", "trends", { action: "exam_tips", topicName, subject: subjectKey });
    navigate(buildAiMentorUrl(grade, subjectKey), {
      state: {
        back: currentURL,
        backLabel: "Back to trends",
        payload: {
          topic: canonicalTopicKey || topicName,
          topicKey: canonicalTopicKey || topicName,
        },
        mode: "topic_exam_tips",
      },
    });
  };


  const goToHPQ = () => {
    navigate(
      buildHPQUrl(grade, subjectKey),
      {
        state: {
          back: currentURL,
          backLabel: "Back to trends",
        },
      }
    );
  };

  const goToMockBuilder = () => {
    navigate(
      buildMockBuilderUrl(grade, subjectKey),
      {
        state: {
          back: currentURL,
          backLabel: "Back to trends",
        },
      }
    );
  };

  const goToMasteryCompanion = () => {
    const nextTopic =
      filteredTopicEntries[0]?.[0] || topicEntries[0]?.[0] || "";
    if (nextTopic) {
      handleExplainTopic(nextTopic);
      return;
    }
    navigate(buildTopicHubUrl(grade, subjectKey));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        paddingBottom: "80px",
      }}
    >
      <div
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          padding: "16px 16px 32px",
        }}
      >
        {/* Back link */}
        <ReturnContextBar
          backTo={backTo}
          backLabel={backLabel}
          quickLinks={[
            { label: "TopicHub", to: `/topic-hub/${grade}/${subjectKey}` },
            { label: "Practice", to: `/practice/${grade}/${subjectKey}` },
            { label: "HPQ", to: `/highly-probable/${grade}/${subjectKey}` },
          ]}
        />
        <JourneyStrip current="trends" grade={grade} subject={subjectKey} />

        {/* Hero card */}
        <section
          style={{
            borderRadius: 16,
            padding: "24px 24px 24px 28px",
            background: "linear-gradient(135deg, #58cc02 0%, #1cb0f6 100%)",
            color: "#ffffff",
            boxShadow: "0 4px 0 rgba(70,163,2,0.3)",
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <div
              style={{
                fontSize: "0.7rem",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                opacity: 0.85,
                marginBottom: 8,
              }}
            >
              Class {grade} - {subjectKey} - Exam trends
            </div>
            <h1
              style={{
                fontSize: "2.1rem",
                lineHeight: 1.15,
                fontWeight: 650,
                marginBottom: 10,
              }}
            >
              Class {grade} {subjectKey} Exam Trends Hub
            </h1>
            <p
              style={{
                fontSize: "0.95rem",
                lineHeight: 1.6,
                opacity: 0.96,
              }}
            >
              Your exam trend radar for this subject. See
              which chapters are{" "}
              <strong style={{ fontWeight: 700 }}>must-crack</strong>,{" "}
              <strong style={{ fontWeight: 700 }}>high-ROI</strong>, or{" "}
              <strong style={{ fontWeight: 700 }}>good-to-do</strong> based on
              CBSE board trends. Open each topic to learn, practice, and revise
              with a clear next step.
            </p>

            {/* Tier filters */}
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
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
                    onClick={() =>
                      handleTierClick(
                        item.id === "all" ? "all" : (item.id as TierKey)
                      )
                    }
                    style={{
                      borderRadius: 12,
                      padding: "6px 14px",
                      border: active
                        ? "2px solid #ffffff"
                        : "2px solid rgba(255,255,255,0.4)",
                      background: active
                        ? "#ffffff"
                        : "rgba(255,255,255,0.15)",
                      color: active ? "#3c3c3c" : "#ffffff",
                      fontSize: "0.75rem",
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                      boxShadow: "none",
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
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            {/* Subject toggle pill */}
            <div
              style={{
                alignSelf: "flex-end",
                borderRadius: 12,
                padding: 4,
                background: "rgba(255,255,255,0.2)",
                display: "inline-flex",
                gap: 4,
              }}
            >
              {(["Maths", "Science"] as SubjectKey[]).map((subj) => {
                const active = subj === subjectKey;
                return (
                  <button
                    key={subj}
                    onClick={() => handleSubjectToggle(subj)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 10,
                      border: "none",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      background: active ? "#ffffff" : "transparent",
                      color: active ? "#3c3c3c" : "#ffffff",
                      boxShadow: "none",
                      transition: "all 0.1s ease-out",
                    }}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>

            {/* Stream filter - only visible for Science */}
            {subjectKey === "Science" && (
              <div
                style={{
                  marginTop: 18,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 220,
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#ffffff",
                    opacity: 0.85,
                  }}
                >
                  Streams
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  {(
                    [
                      { id: "all", label: "All streams" },
                      { id: "Physics", label: "Physics" },
                      { id: "Chemistry", label: "Chemistry" },
                      { id: "Biology", label: "Biology" },
                    ] as { id: StreamKey; label: string }[]
                  ).map((stream) => {
                    const active = activeStream === stream.id;
                    return (
                      <button
                        key={stream.id}
                        onClick={() => setActiveStream(stream.id)}
                        style={{
                          borderRadius: 10,
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          border: active
                            ? "2px solid #ffffff"
                            : "2px solid rgba(255,255,255,0.4)",
                          background: active
                            ? "#ffffff"
                            : "transparent",
                          color: active ? "#3c3c3c" : "#ffffff",
                          fontWeight: active ? 800 : 600,
                          cursor: "pointer",
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
        <section
          style={{
            marginTop: 20,
            borderRadius: 28,
            backgroundColor: "#f7f7f7",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
            padding: "18px 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "#3c3c3c",
              }}
            >
              Difficulty mix
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                fontSize: "0.8rem",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  padding: "6px 12px",
                  backgroundColor: "#ecfdf3",
                  color: "#15803d",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    backgroundColor: "#22c55e",
                  }}
                />
                Easy {difficultyMix.Easy}%
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  padding: "6px 12px",
                  backgroundColor: "#fffbeb",
                  color: "#a16207",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    backgroundColor: "#facc15",
                  }}
                />
                Medium {difficultyMix.Medium}%
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  padding: "6px 12px",
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "999px",
                    backgroundColor: "#ef4444",
                  }}
                />
                Hard {difficultyMix.Hard}%
              </span>
            </div>

            {/* Section chips kept generic for now */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                fontSize: "0.75rem",
                color: "#3c3c3c",
                paddingTop: 6,
              }}
            >
              {[
                "Section A (MCQs / Objective, 1 mark)",
                "Section B (Very Short Answer, 2 marks)",
                "Section C (Short Answer, 3 marks)",
                "Section D (Long Answer, 4-5 marks)",
                "Section E (Case-based, 4 marks)",
              ].map((chip) => (
                <span
                  key={chip}
                  style={{
                    borderRadius: 999,
                    padding: "6px 12px",
                    backgroundColor: "#eef2ff",
                    border: "1px solid rgba(28,176,246,0.35)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Blueprint source attribution */}
        <section
          style={{
            marginTop: 16,
            borderRadius: 16,
            padding: "14px 18px",
            background: "linear-gradient(135deg, rgba(88,204,2,0.06), rgba(88,204,2,0.1))",
            border: "1px solid rgba(88,204,2,0.3)",
            fontSize: "0.78rem",
            color: "#065f46",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            Based on CBSE 2025-26 Blueprint (80-mark theory paper)
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              fontSize: "0.72rem",
            }}
          >
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
              <span
                key={item.unit}
                style={{
                  borderRadius: 999,
                  padding: "3px 10px",
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(88,204,2,0.3)",
                  whiteSpace: "nowrap",
                }}
              >
                {item.unit}: {item.marks} marks ({((item.marks / 80) * 100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </section>

        {/* Topic list */}
        <section style={{ marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 650,
                  color: "#3c3c3c",
                  marginBottom: 4,
                }}
              >
                Class {grade} {subjectKey} - chapter &amp; concept trends
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#777777",
                }}
              >
                Darker / bolder cards are heavier. Hit the{" "}
                <span>must-crack</span> ones first, then the{" "}
                <span>high-ROI</span> ones. Keep{" "}
                <span>good-to-do</span> once the core chapters are done.
              </p>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#777777",
                whiteSpace: "nowrap",
              }}
            >
              Total weightage covered:{" "}
              <span style={{ fontWeight: 600, color: "#3c3c3c" }}>
                {Math.round(totalWeightage * 10) / 10}%
              </span>
            </div>
          </div>

          {filteredTopicEntries.length === 0 ? (
            <p
              style={{
                fontSize: "0.82rem",
                color: "#777777",
                padding: "8px 4px",
              }}
            >
              Nothing visible with the current filters. Switch tier
              chips above again to roll the topics back down.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
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

                const sortedConcepts = Object.entries(
                  meta.conceptWeightage ?? {}
                ).sort((a, b) => b[1] - a[1]);

                const tierInfo = tierMeta[tier];

                return (
                  <div
                    key={topicName}
                    style={{
                      borderRadius: 22,
                      padding: "16px 18px 14px",
                      backgroundColor: "#f7f7f7",
                      border:
                        tier === "must-crack"
                          ? "1px solid rgba(255,75,75,0.6)"
                          : tier === "high-roi"
                          ? "1px solid rgba(28,176,246,0.5)"
                          : "1px solid rgba(0,0,0,0.1)",
                      boxShadow:
                        tier === "must-crack"
                          ? "0 14px 30px rgba(255,75,75,0.2)"
                          : tier === "high-roi"
                          ? "0 14px 30px rgba(28,176,246,0.25)"
                          : "0 10px 24px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                          }}
                        >
                          <h3
                            style={{
                              fontSize: "1rem",
                              fontWeight: 650,
                              color: "#3c3c3c",
                            }}
                          >
                            {topicName}
                          </h3>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              backgroundColor:
                                tier === "must-crack"
                                  ? "#fee2e2"
                                  : tier === "high-roi"
                                  ? "#e0e7ff"
                                  : "#e0f2fe",
                              color:
                                tier === "must-crack"
                                  ? "#b91c1c"
                                  : tier === "high-roi"
                                  ? "#3730a3"
                                  : "#0369a1",
                            }}
                          >
                            <span>{tierInfo.emoji}</span>
                            <span>{tierInfo.label}</span>
                          </span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              backgroundColor: "rgba(88,204,2,0.1)",
                              color: "#166534",
                              border: "1px solid rgba(88,204,2,0.4)",
                            }}
                          >
                            {matchScore}% Match
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.85rem",
                            color: "#777777",
                            marginBottom: 6,
                          }}
                        >
                          {meta.summary || tierInfo.blurb}
                        </p>

                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 4,
                          }}
                        >
                          <button
                            onClick={() => handleExplainTopic(topicName)}
                            style={{
                              borderRadius: 999,
                              padding: "5px 11px",
                              border: "1px solid rgba(28,176,246,0.5)",
                              background: "rgba(28,176,246,0.08)",
                              fontSize: "0.75rem",
                              color: "#1cb0f6",
                              cursor: "pointer",
                            }}
                          >
                            Teach this topic
                          </button>

                          <button
                            onClick={() => handlePracticeFromTopic(topicName)}
                            style={{
                              borderRadius: 999,
                              padding: "5px 11px",
                              border: "1px solid rgba(206,130,255,0.5)",
                              background: "rgba(206,130,255,0.06)",
                              fontSize: "0.75rem",
                              color: "#6d28d9",
                              cursor: "pointer",
                            }}
                          >
                            Practice this topic
                          </button>

                          <details style={{ position: "relative" }}>
                            <summary
                              style={{
                                borderRadius: 999,
                                padding: "5px 11px",
                                border: "1px solid rgba(0,0,0,0.12)",
                                background: "#f7f7f7",
                                fontSize: "0.75rem",
                                color: "#777777",
                                cursor: "pointer",
                                listStyle: "none",
                              }}
                            >
                              More
                            </summary>
                            <div
                              style={{
                                marginTop: 6,
                                display: "grid",
                                gap: 6,
                                minWidth: 190,
                                padding: 8,
                                borderRadius: 12,
                                border: "1px solid rgba(0,0,0,0.1)",
                                background: "rgba(255,255,255,0.98)",
                                boxShadow: "0 10px 26px rgba(0,0,0,0.06)",
                              }}
                            >
                              <button
                                onClick={() => handleSampleQuestion(topicName)}
                                style={{
                                  borderRadius: 10,
                                  padding: "6px 10px",
                                  border: "1px solid rgba(28,176,246,0.35)",
                                  background: "rgba(28,176,246,0.06)",
                                  fontSize: "0.74rem",
                                  color: "#1cb0f6",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                Open HPQ for topic
                              </button>
                              <button
                                onClick={() => handleQuickTopicMock(topicName)}
                                style={{
                                  borderRadius: 10,
                                  padding: "6px 10px",
                                  border: "1px solid rgba(88,204,2,0.5)",
                                  background: "rgba(88,204,2,0.1)",
                                  fontSize: "0.74rem",
                                  color: "#15803d",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                Build topic mock
                              </button>
                              <button
                                onClick={() => handleExamTips(topicName)}
                                style={{
                                  borderRadius: 10,
                                  padding: "6px 10px",
                                  border: "1px solid rgba(255,150,0,0.5)",
                                  background: "rgba(255,150,0,0.08)",
                                  fontSize: "0.74rem",
                                  color: "#c2410c",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                Ask exam tips
                              </button>
                              <button
                                onClick={() => handleGoToTopicHub(topicName)}
                                style={{
                                  borderRadius: 10,
                                  padding: "6px 10px",
                                  border: "1px solid rgba(0,0,0,0.12)",
                                  background: "#f7f7f7",
                                  fontSize: "0.74rem",
                                  color: "#777777",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                Open topic in Tutor
                              </button>
                            </div>
                          </details>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "#777777",
                          whiteSpace: "nowrap",
                          textAlign: "right",
                        }}
                      >
                        ~{meta.weightagePercent ?? 0}% of paper
                      </div>
                    </div>

                    {sortedConcepts.length > 0 && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop:
                            "1px dashed rgba(0,0,0,0.12)",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.78rem",
                            color: "#777777",
                            marginBottom: 4,
                          }}
                        >
                          Most asked subtopics inside this chapter:
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit,minmax(180px,1fr))",
                            gap: 6,
                            fontSize: "0.8rem",
                            color: "#3c3c3c",
                          }}
                        >
                          {sortedConcepts.map(([concept, pct]) => (
                            <div
                              key={concept}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span>{concept}</span>
                              <span style={{ color: "#777777" }}>
                                ~{pct}%
                              </span>
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
          <div
            style={{
              marginBottom: 8,
              fontSize: "0.8rem",
              color: "#777777",
            }}
          >
            Pick your mode:
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={goToHPQ}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  goToHPQ();
                }
              }}
              style={{
                borderRadius: 24,
                padding: "14px 18px",
                border: "1px solid rgba(28,176,246,0.4)",
                background:
                  "linear-gradient(135deg, rgba(28,176,246,0.06), rgba(28,176,246,0.08))",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(28,176,246,0.35)",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#4b5563",
                  marginBottom: 4,
                }}
              >
                Step 2 - Practice
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                See Highly Probable Questions for this grade
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#4b5563",
                }}
              >
                Jump to your curated HPQ bank, then build a full mock when exam date is near.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToHPQ();
                  }}
                  style={{
                    borderRadius: 999,
                    padding: "5px 11px",
                    border: "1px solid rgba(28,176,246,0.5)",
                    background: "#ffffff",
                    color: "#1cb0f6",
                    fontSize: "0.74rem",
                    cursor: "pointer",
                  }}
                >
                  Open HPQ bank
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToMockBuilder();
                  }}
                  style={{
                    borderRadius: 999,
                    padding: "5px 11px",
                    border: "1px solid rgba(28,176,246,0.5)",
                    background: "#ffffff",
                    color: "#1cb0f6",
                    fontSize: "0.74rem",
                    cursor: "pointer",
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
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  goToMasteryCompanion();
                }
              }}
              style={{
                borderRadius: 24,
                padding: "14px 18px",
                border: "1px solid rgba(88,204,2,0.5)",
                background:
                  "linear-gradient(135deg, rgba(88,204,2,0.06), rgba(88,204,2,0.08))",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 12px 26px rgba(88,204,2,0.3)",
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#4b5563",
                  marginBottom: 4,
                }}
              >
                Mastery companion
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: 4,
                }}
              >
                Start guided learning from your current weak chapter
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#4b5563",
                }}
              >
                Use Teach + Practice loop through TopicHub for daily progression through the year.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TrendsPage;
