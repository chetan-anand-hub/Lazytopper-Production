/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/HighlyProbableQuestions.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useSearchParams,
  useLocation,
  useParams,
} from "react-router-dom";

import { navigateToPractice } from "../navigation/practiceNavigation";
import {
  type HPQTopicBucket,
  type HPQQuestion,
  type HPQSubject,
  type HPQStream,
  type HPQTier,
  type HPQDifficulty,
  getHighlyProbableQuestions,
} from "../data/highlyProbableQuestions";

import {
  // NEW: to mirror TopicHub's Mark Yield + topic metadata
  type TopicContentConfig,
  getTopicContent,
  buildGenericTopicConfig,
} from "../data/class10ContentConfig";

import { useCurrentURL } from "../utils/useCurrentURL";
import {
  buildTrendsUrl,
  buildMockBuilderUrl,
  buildAiMentorUrl,
  buildTopicHubUrl,
} from "../utils/buildUrl";

import { useSmartLearning } from "../engine/smartLearningStore";
import type { ChapterId, ChapterMeta } from "../engine/smartLearningTypes";
import { QuestionVisualAid } from "../components/question/QuestionVisualAid";

// Import AI helpers to generate HPQ variants.  MoreLikeThisVariant is the
// return type for each AI-generated question variant.  We also pull in
// generateMoreLikeThis so that the HPQ page can request variants on-demand.
import { generateMoreLikeThis, type MoreLikeThisVariant } from "../ai/aiClient";
import { buildBankHealthReport } from "../prediction/bankHealth";
import { buildTopicKeySources } from "../prediction/buildTopicKeySources";
import JourneyStrip from "../components/ux/JourneyStrip";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { trackUxEvent } from "../services/uxTelemetry";

// NEW: same normalisation constant as TopicHub
const MAX_BOARD_WEIGHTAGE_FOR_CLASS10 = 14;

// ---------- Local types / helpers ----------

type StreamFilterKey = "all" | HPQStream;
type TierFilter = "all" | HPQTier;
type DifficultyFilter = "all" | HPQDifficulty;
type TopicFilter = "all" | string;

interface BasketItem {
  id: string;
  subject: HPQSubject;
  topic: string;
  stream?: HPQStream;
  marks: number;
  difficulty?: HPQDifficulty;
  section?: string;
  question: string;
}

const MOCK_BASKET_KEY = "lazyTopperMockBasket_v1";

const tierMeta: Record<
  HPQTier,
  { label: string; emoji: string; blurb: string }
> = {
    "must-crack": {
      label: "Must-crack",
      emoji: "",
      blurb: "Shows up almost every year. Start here first.",
    },
    "high-roi": {
      label: "High-ROI",
      emoji: "",
      blurb: "Big marks for the time you invest - do after must-crack.",
    },
    "good-to-do": {
      label: "Good-to-do",
      emoji: "",
      blurb: "Useful once core topics are complete.",
    },
  };

const difficultyChipStyle: Record<HPQDifficulty, { bg: string; color: string }> =
  {
    Easy: { bg: "#ecfdf3", color: "#15803d" },
    Medium: { bg: "#fffbeb", color: "#a16207" },
    Hard: { bg: "#fef2f2", color: "#b91c1c" },
  };

// Decide bucket tier from bucket.defaultTier or first question with a tier
function getBucketTier(bucket: HPQTopicBucket): HPQTier {
  if (bucket.defaultTier) return bucket.defaultTier;
  for (const q of bucket.questions) {
    if (q.tier) return q.tier;
  }
  return "good-to-do";
}

function normaliseSubject(raw: string | null | undefined): HPQSubject {
  const val = (raw || "").toLowerCase();
  if (val === "science" || val === "sci") return "Science";
  return "Maths";
}

function normaliseTopicKey(raw: string | null | undefined): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Best-effort chapterId for this HPQ bucket.
 * Prefer an explicit bucket.chapterId if present, otherwise derive from
 * grade + subject + topic.
 */
function getChapterIdForBucket(
  bucket: HPQTopicBucket,
  grade: string,
  subjectKey: HPQSubject
): ChapterId {
  const explicit = (bucket as any).chapterId as ChapterId | undefined;
  if (explicit) return explicit;

  const safeSubject = bucket.subject ?? subjectKey;
  const topicKey =
    (bucket as any).topicKey ||
    bucket.topic?.replace(/\s+/g, "-").toLowerCase() ||
    "generic";

  return `${grade}-${safeSubject}-${topicKey}` as ChapterId;
}

// ---------- Component ----------

const HighlyProbableQuestions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { grade: gradeParam, subject } = useParams<"grade" | "subject">();

  // Read grade and subject from path; fall back to query params for backward compatibility.
  const grade = gradeParam || searchParams.get("grade") || "10";
  const subjectParam = subject || searchParams.get("subject");
  const subjectKey: HPQSubject = normaliseSubject(subjectParam);

  // Smart Learning Engine
  const {
    recordHpqAttempt,
    // NEW: read stats + match score
    getStatsForChapter,
    getMatchScoreForChapter,
  } = useSmartLearning();

  // Capture current URL for back-navigation state.
  const currentURL = useCurrentURL();
  const navState = (location.state as any) || {};
  const back: string | undefined = navState.back;
  const backLabel: string =
    navState.backLabel ||
    (back && back.includes("/study-plan")
      ? "Back to study plan"
      : "Back to trends");

  // State for stream, tier, difficulty filters
  const [activeStream, setActiveStream] = useState<StreamFilterKey>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [difficultyFilter, setDifficultyFilter] =
    useState<DifficultyFilter>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Topic filter (dropdown + deep-link from Trends)
  const topicParam = searchParams.get("topic");
  const initialTopic: TopicFilter = (topicParam as TopicFilter) || "all";
  const [topicFilter, setTopicFilter] = useState<TopicFilter>(initialTopic);

  useEffect(() => {
    setTopicFilter((topicParam as TopicFilter) || "all");
  }, [topicParam]);

  // Basket state
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [hpqFeedback, setHpqFeedback] = useState<
    Record<string, "correct" | "incorrect">
  >({});
  // Per-chapter expand/collapse state: topic -> expanded?
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    {}
  );

  // If the route subject changes (Maths <-> Science), React Router may reuse the
  // same component instance. Reset local UI state here to prevent filter/state
  // leakage across subjects.
  useEffect(() => {
    setActiveStream("all");
    setTierFilter("all");
    setDifficultyFilter("all");
    setShowAdvancedFilters(false);
    setExpandedTopics({});
    setHpqFeedback({});
    setTopicFilter("all");
    // Ensure URL query doesn't carry stale filters across subjects.
    setSearchParams(new URLSearchParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);

  // --- AI variant state ---
  // When students request AI-generated variants of an HPQ, we store
  // loading/error flags and the resulting variants keyed by question ID.
  // This ensures each question's variant state is tracked independently.
  const [aiVariants, setAiVariants] = useState<Record<string, MoreLikeThisVariant[]>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState<Record<string, string | undefined>>({});

  const isInBasket = React.useCallback(
    (id: string) => basket.some((item) => item.id === id),
    [basket]
  );

  // Load basket from localStorage once
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MOCK_BASKET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BasketItem[];
        if (Array.isArray(parsed)) setBasket(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  const persistBasket = (items: BasketItem[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MOCK_BASKET_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  // Subject-level buckets (Maths vs Science) using engine helper
  const subjectBuckets = useMemo(
    () =>
      getHighlyProbableQuestions(subjectKey).filter(
        (bucket) => (bucket.subject ?? subjectKey) === subjectKey
      ),
    [subjectKey]
  );

  const bankHealthSummaryForSubject = useMemo(() => {
    const topicKeySources = buildTopicKeySources().filter(
      (entry) => normaliseSubject(String(entry.subject)) === subjectKey
    );

    const canonicalQuestions = subjectBuckets.flatMap((bucket) => {
      const bucketTopicKey = (bucket as any).topicKey || normaliseTopicKey(bucket.topic);
      const bucketSubject = bucket.subject ?? subjectKey;
      return bucket.questions.map((question) => ({
        ...question,
        subject: bucketSubject,
        topicKey: (question as any).topicKey || bucketTopicKey,
      }));
    });

    return buildBankHealthReport({
      questions: canonicalQuestions as any,
      topicKeySources: topicKeySources as any,
    }).summary;
  }, [subjectBuckets, subjectKey]);

  // Topic options for dropdown (for current subject)
  const topicOptions = useMemo(
    () =>
      Array.from(new Set(subjectBuckets.map((b) => b.topic))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [subjectBuckets]
  );

  // NEW: derive "current topic" & its bucket for stats snippet
  const currentTopicKey: string | undefined =
    (topicFilter !== "all" ? topicFilter : topicParam) || undefined;

  const bucketForStats: HPQTopicBucket | undefined = useMemo(() => {
    if (!currentTopicKey) return undefined;
    const target = currentTopicKey.toLowerCase();
    return subjectBuckets.find(
      (b) => b.topic.toLowerCase() === target
    );
  }, [subjectBuckets, currentTopicKey]);

  // Build ChapterMeta + stats only if we have a matching bucket
  const {
    chapterMetaForStats,
    totalAttemptsForStats,
    accuracyPercentForStats,
    matchScoreForStats,
    matchLabelForStats,
  } = useMemo(() => {
    if (!bucketForStats) {
      return {
        chapterMetaForStats: undefined,
        totalAttemptsForStats: 0,
        accuracyPercentForStats: undefined as number | undefined,
        matchScoreForStats: undefined as number | undefined,
        matchLabelForStats: undefined as string | undefined,
      };
    }

    const chapterIdForTopic = getChapterIdForBucket(
      bucketForStats,
      grade,
      subjectKey
    );

    const stats = getStatsForChapter(chapterIdForTopic);
    const totalAttempts = stats?.totalQuestionsAttempted ?? 0;

    if (!stats || totalAttempts === 0) {
      return {
        chapterMetaForStats: undefined,
        totalAttemptsForStats: 0,
        accuracyPercentForStats: undefined,
        matchScoreForStats: undefined,
        matchLabelForStats: undefined,
      };
    }

    const accuracyPercent = Math.round(
      (stats.totalQuestionsCorrect / totalAttempts) * 100
    );

    // Use content config to enrich ChapterMeta
    const rawTopicKey =
      currentTopicKey || (bucketForStats as any).topicKey || bucketForStats.topic;

    const rawConfig =
      (getTopicContent(subjectKey as any, rawTopicKey) as
        | TopicContentConfig
        | undefined) ?? undefined;

    const topicConfig: TopicContentConfig =
      rawConfig ??
      buildGenericTopicConfig({
        subjectKey: subjectKey as any,
        topicKey: rawTopicKey,
        topicName: bucketForStats.topic,
      });

    const displayName: string =
      (topicConfig as any).displayName ||
      (topicConfig as any).title ||
      bucketForStats.topic;

    const boardWeightage: number =
      (topicConfig as any).weightagePercent ??
      (topicConfig as any).approxWeightage ??
      0;

    const chapterMeta: ChapterMeta = {
      id: chapterIdForTopic,
      grade,
      subject: subjectKey as any,
      topicKey:
        (topicConfig as any).topicKey ||
        rawTopicKey,
      name: displayName,
      boardWeightage,
      tier:
        ((topicConfig as any).tier as
          | "must-crack"
          | "high-roi"
          | "good-to-do") || "high-roi",
      difficultyMix: (topicConfig as any).difficultyMix,
      relatedChapterIds: (topicConfig as any).relatedChapterIds,
    };

    const matchScore = getMatchScoreForChapter(
      chapterMeta,
      MAX_BOARD_WEIGHTAGE_FOR_CLASS10
    );

    let matchLabel: string | undefined;
    if (matchScore !== undefined) {
      if (matchScore >= 75) {
        matchLabel = "high match score";
      } else if (matchScore >= 40) {
        matchLabel = "medium match score";
      } else {
        matchLabel = "low match score";
      }
    }

    return {
      chapterMetaForStats: chapterMeta,
      totalAttemptsForStats: totalAttempts,
      accuracyPercentForStats: accuracyPercent,
      matchScoreForStats: matchScore,
      matchLabelForStats: matchLabel,
    };
  }, [
    bucketForStats,
    currentTopicKey,
    grade,
    subjectKey,
    getStatsForChapter,
    getMatchScoreForChapter,
  ]);

  // Handlers

  const handleSubjectToggle = (next: HPQSubject) => {
    // Full reset on subject toggle:
    // - don't carry query params (topic/filters) to the next subject
    // - reset local UI state to avoid leakage when the component instance is reused
    setActiveStream("all");
    setTierFilter("all");
    setDifficultyFilter("all");
    setExpandedTopics({});
    setHpqFeedback({});
    setTopicFilter("all");
    setSearchParams(new URLSearchParams());

    navigate(`/highly-probable/${grade}/${next}`, {
      state: { back: currentURL, backLabel: "Back to HPQ" },
      replace: true,
    });
  };

  const handleStreamToggle = (next: StreamFilterKey) => {
    setActiveStream(next);
  };

  const handleOpenMockBuilder = () => {
    // save basket and open mock builder with grade & subject in path
    persistBasket(basket);
    navigate(buildMockBuilderUrl(grade, subjectKey), {
      state: {
        back: currentURL,
        backLabel: "Back to HPQ",
      },
    });
  };

  const handleOpenTopicHubFromBucket = (bucket: HPQTopicBucket) => {
    trackUxEvent("hpq_open_topic_hub", "hpq", {
      topic: bucket.topic,
      subject: subjectKey,
    });
    navigate(
      buildTopicHubUrl(grade, subjectKey, bucket.topic),
      {
        state: {
          back: currentURL,
          backLabel: "Back to HPQ",
        },
      }
    );
  };

  const handleAddTopicStackToBasket = (bucket: HPQTopicBucket) => {
    setBasket((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      const additions: BasketItem[] = bucket.questions
        .filter((q) => !existingIds.has(q.id))
        .map((q) => ({
          id: q.id,
          subject: bucket.subject ?? subjectKey,
          topic: bucket.topic,
          stream: bucket.stream,
          marks: q.marks ?? 0,
          difficulty: q.difficulty,
          section: q.section,
          question: q.question,
        }));

      if (additions.length === 0) {
        return prev;
      }

      const next = [...prev, ...additions];
      persistBasket(next);
      return next;
    });
  };


  const handleAddToBasket = (bucket: HPQTopicBucket, q: HPQQuestion) => {
    setBasket((prev) => {
      if (prev.some((b) => b.id === q.id)) return prev;
      const marks = q.marks ?? 0;
      const next: BasketItem[] = [
        ...prev,
        {
          id: q.id,
          subject: bucket.subject ?? subjectKey,
          topic: bucket.topic,
          stream: bucket.stream,
          marks,
          difficulty: q.difficulty,
          section: q.section,
          question: q.question,
        },
      ];
      persistBasket(next);
      return next;
    });
  };

  const handleAskAiMentor = (bucket: HPQTopicBucket, q: HPQQuestion) => {
    navigate(buildAiMentorUrl(grade, subjectKey), {
      state: {
        back: currentURL,
        backLabel: "Back to HPQ",
        payload: {
          topic: bucket.topic,
          hpqQuestionId: q.id,
          hpqQuestion: q.question,
        },
        // set solve mode for HPQ question
        mode: "solve",
        gpt_directive:
          "Think like an expert CBSE Class 10 " +
          (subjectKey === "Maths" ? "Mathematics" : "Science") +
          " tutor. Explain this question step by step, show working, common mistakes, and give exam-friendly presentation.",
      },
    });
  };

  const handleMoreLikeThisPractice = (bucket: HPQTopicBucket, q: HPQQuestion) => {
    trackUxEvent("hpq_open_practice", "hpq", {
      topic: bucket.topic,
      subject: subjectKey,
      questionId: q.id,
    });
    const topicKey = bucket.topic;
    const topicName = bucket.topic;
    const backPath = currentURL;
    const recommendedCount = 10;

    navigateToPractice(navigate, {
      grade,
      subject: subjectKey as any,
      topicKey,
      topicName,
      backPath,
      backLabel: "Back to HPQ",
      subtopicHint: bucket.topic,
      focusBankIds: q.id ? [q.id] : undefined,
      recommendedCount,
      difficultyPreset: (q.difficulty as any) || "All",
    });
  };

  /**
   * Ask the AI mentor to explain a given HPQ.  This navigates to the
   * unified mentor page with `explain` mode and passes along the
   * question context so the backend can generate a concise concept
   * explanation.  We include a GPT directive to nudge the assistant
   * towards CBSE-friendly language and highlight key concepts.
   */
  const handleExplainAiMentor = (
    bucket: HPQTopicBucket,
    q: HPQQuestion
  ) => {
    navigate(buildAiMentorUrl(grade, subjectKey), {
      state: {
        back: currentURL,
        backLabel: "Back to HPQ",
        payload: {
          topic: bucket.topic,
          hpqQuestionId: q.id,
          hpqQuestion: q.question,
        },
        mode: "explain",
        gpt_directive:
          "Think like an expert CBSE Class 10 " +
          (subjectKey === "Maths" ? "Mathematics" : "Science") +
          " tutor. Provide a clear explanation of this question including key concepts, formulas and common pitfalls.",
      },
    });
  };

  /**
   * Generate AI variants for a given HPQ.  We call the more-like-this
   * endpoint with the question text, marks and difficulty to request
   * several alternative versions.  Loading and error state are tracked
   * per question so that multiple requests can be made in parallel.
   */
  const handleGenerateAiVariants = async (
    bucket: HPQTopicBucket,
    q: HPQQuestion
  ) => {
    const qId = q.id;
    // Clear previous error and mark this question as loading
    setAiError((prev) => ({ ...prev, [qId]: undefined }));
    setAiLoading((prev) => ({ ...prev, [qId]: true }));
    try {
      const numVariants = 3;
      // Build the request for the AI gateway.  We cast types liberally
      // because HPQDifficulty may contain additional values; the backend
      // will handle unknown difficulties gracefully.
      const payload: any = {
        subject: subjectKey,
        topicKey: bucket.topic,
        seedQuestion: {
          text: q.question,
          marks: q.marks,
          difficulty: (q as any).difficulty,
          bloomSkill: (q as any).bloomSkill,
        },
        numVariants,
      };
      const resp = await generateMoreLikeThis(payload);
      setAiVariants((prev) => ({ ...prev, [qId]: resp.variants }));
    } catch (err: any) {
      const msg = err?.message || "Failed to generate variants";
      setAiError((prev) => ({ ...prev, [qId]: msg }));
    } finally {
      setAiLoading((prev) => ({ ...prev, [qId]: false }));
    }
  };

  // Smart Learning: log HPQ attempts (correct / incorrect)
  const handleMarkHpqAttempt = (
    bucket: HPQTopicBucket,
    q: HPQQuestion,
    wasCorrect: boolean
  ) => {
    try {
      const chapterId = getChapterIdForBucket(bucket, grade, subjectKey);
      const marks = q.marks ?? 0;

      recordHpqAttempt({
        chapterId,
        questionId: q.id,
        isCorrect: wasCorrect,
        marks,
        difficulty: q.difficulty,
        section: q.section,
        source: "hpq-quick-mark",
        userId: "local-demo-user", // until we wire real auth/profile
        grade, // e.g. "10"
        subject: subjectKey, // "Maths" | "Science"
        timeTakenSeconds: 30, // rough default; we can improve later
        attemptedAt: new Date().toISOString(),
      });
      // (Optional micro-feedback in future: small toast / chip)
      setHpqFeedback((prev) => ({
        ...prev,
        [q.id]: wasCorrect ? "correct" : "incorrect",
      }));
      // (Optional micro-feedback in future: small toast / chip)
    } catch (err) {
      // Fail silently for now - Smart Learning is a bonus layer, not critical path.
      console.error("Failed to record HPQ attempt", err);
    }
  };

  const totalBasketMarks = useMemo(
    () => basket.reduce((sum, item) => sum + (item.marks ?? 0), 0),
    [basket]
  );

  // Clear all filters helper
  const handleClearAllFilters = () => {
    setTierFilter("all");
    setDifficultyFilter("all");
    setActiveStream("all");
    setTopicFilter("all");
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("topic");
    setSearchParams(nextParams);
  };

  // Core filtered data
  const filteredBuckets: HPQTopicBucket[] = useMemo(() => {
    let buckets = subjectBuckets;

    // Topic filter (dropdown or deep link)
    if (topicFilter !== "all") {
      const topicLower = topicFilter.toLowerCase();
      buckets = buckets.filter((b) => b.topic.toLowerCase() === topicLower);
    }

    // Stream filter - only for Science
    if (subjectKey === "Science" && activeStream !== "all") {
      buckets = buckets.filter((bucket) => {
        if (bucket.stream && bucket.stream !== "General") {
          return bucket.stream === activeStream;
        }
        // fallback: check question-level stream
        return bucket.questions.some((q) => {
          if (!q.stream || q.stream === "General") {
            return activeStream === "General";
          }
          return q.stream === activeStream;
        });
      });
    }

    // Tier filter
    if (tierFilter !== "all") {
      buckets = buckets.filter((bucket) => getBucketTier(bucket) === tierFilter);
    }

    // Difficulty filter - keep only questions of that difficulty
    if (difficultyFilter !== "all") {
      buckets = buckets
        .map((bucket) => ({
          ...bucket,
          questions: bucket.questions.filter(
            (q) => q.difficulty === difficultyFilter
          ),
        }))
        .filter((bucket) => bucket.questions.length > 0);
    }

    return buckets;
  }, [
    subjectBuckets,
    subjectKey,
    activeStream,
    tierFilter,
    difficultyFilter,
    topicFilter,
  ]);


  // Keep expandedTopics in sync with filtered buckets:
  // - When a specific topic is chosen, expand that chapter by default.
  // - When showing all topics, keep prior expand state but default-open the first card.
  useEffect(() => {
    setExpandedTopics((prev) => {
      const next: Record<string, boolean> = {};
      filteredBuckets.forEach((bucket, index) => {
        const key = bucket.topic;
        if (topicFilter !== "all") {
          next[key] = true;
        } else {
          next[key] = prev[key] ?? index === 0;
        }
      });
      return next;
    });
  }, [filteredBuckets, topicFilter]);
  // ---------- Render helpers ----------

  const renderQuestionMetaChips = (q: HPQQuestion) => {
    const chips: React.ReactNode[] = [];

    if (q.section) {
      chips.push(
        <span
          key="sec"
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            backgroundColor: "#eef2ff",
            border: "1px solid rgba(129,140,248,0.65)",
            fontSize: "0.7rem",
          }}
        >
          Section {q.section}
        </span>
      );
    }

    if (typeof q.marks === "number") {
      chips.push(
        <span
          key="marks"
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            backgroundColor: "#ecfeff",
            border: "1px solid rgba(6,182,212,0.6)",
            fontSize: "0.7rem",
          }}
        >
          {q.marks} mark{q.marks === 1 ? "" : "s"}
        </span>
      );
    }

    if (q.difficulty) {
      const style = difficultyChipStyle[q.difficulty];
      chips.push(
        <span
          key="diff"
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            backgroundColor: style.bg,
            color: style.color,
            fontSize: "0.7rem",
          }}
        >
          {q.difficulty}
        </span>
      );
    }

    if (q.likelihood) {
      chips.push(
        <span
          key="prob"
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            backgroundColor: "#f5f3ff",
            border: "1px solid rgba(167,139,250,0.7)",
            fontSize: "0.7rem",
            color: "#4c1d95",
          }}
        >
          {q.likelihood} chance
        </span>
      );
    }

    if (q.bloomSkill) {
      chips.push(
        <span
          key="bloom"
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            backgroundColor: "#f9fafb",
            border: "1px dashed rgba(148,163,184,0.7)",
            fontSize: "0.7rem",
            color: "#475569",
          }}
        >
          {q.bloomSkill}
        </span>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 4,
        }}
      >
        {chips}
      </div>
    );
  };

  // ---------- JSX ----------

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #e0f2ff 0, #dde7ff 30%, #e5edff 60%, #f1f5f9 100%)",
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
        <ReturnContextBar
          backTo={back || buildTrendsUrl(grade, subjectKey)}
          backLabel={backLabel}
          quickLinks={[
            { label: "Trends", to: buildTrendsUrl(grade, subjectKey) },
            { label: "TopicHub", to: buildTopicHubUrl(grade, subjectKey, currentTopicKey && currentTopicKey !== "all" ? currentTopicKey : "") },
            { label: "Practice", to: `/practice/${grade}/${subjectKey}${currentTopicKey && currentTopicKey !== "all" ? `?topic=${encodeURIComponent(currentTopicKey)}` : ""}` },
          ]}
        />
        <JourneyStrip
          current="hpq"
          grade={grade}
          subject={subjectKey}
          topic={currentTopicKey && currentTopicKey !== "all" ? currentTopicKey : undefined}
        />

        {/* Hero: HPQ hub */}
        <section
          style={{
            borderRadius: 32,
            padding: "24px 24px 24px 28px",
            background:
              "linear-gradient(135deg, #020617 0%, #0f172a 20%, #1d4ed8 65%, #22c1c3 100%)",
            color: "#f9fafb",
            boxShadow: "0 24px 60px rgba(15,23,42,0.55)",
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
              Class {grade} - {subjectKey} - HPQ Bank
            </div>
            <h1
              style={{
                fontSize: "2.1rem",
                lineHeight: 1.15,
                fontWeight: 650,
                marginBottom: 10,
              }}
            >
              Highly Probable Questions Hub
            </h1>
            <p
              style={{
                fontSize: "0.95rem",
                lineHeight: 1.6,
                opacity: 0.96,
              }}
            >
              Your high-impact revision zone for exam week:
              topic-wise questions that keep coming back. Switch between{" "}
              <strong>Maths</strong> and{" "}
              <strong>Science + Physics/Chem/Bio filters</strong>, then send a
              selected question straight into your mock paper.
            </p>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  borderRadius: 999,
                  border: "1px solid rgba(241,245,249,0.4)",
                  background: "rgba(15,23,42,0.35)",
                  color: "#e5e7eb",
                  fontSize: "0.75rem",
                  padding: "6px 12px",
                }}
              >
                {showAdvancedFilters ? "Advanced filters on" : "Simple mode"}
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                style={{
                  borderRadius: 999,
                  padding: "6px 14px",
                  border: "1px solid rgba(241,245,249,0.4)",
                  background: "rgba(15,23,42,0.35)",
                  color: "#e5e7eb",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                {showAdvancedFilters ? "Hide advanced filters" : "Show advanced filters"}
              </button>
            </div>

            {showAdvancedFilters && (
              <>
                {/* Tier filter row */}
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {(
                    [
                      { id: "all", label: "All tiers" },
                      { id: "must-crack", label: "Must-crack" },
                      { id: "high-roi", label: "High-ROI" },
                      { id: "good-to-do", label: "Good-to-do" },
                    ] as { id: TierFilter; label: string }[]
                  ).map((item) => {
                    const active = tierFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setTierFilter(item.id)}
                        style={{
                          borderRadius: 999,
                          padding: "6px 14px",
                          border: active
                            ? "1px solid rgba(15,23,42,0.2)"
                            : "1px solid rgba(241,245,249,0.3)",
                          background: active
                            ? "#f9fafb"
                            : "rgba(15,23,42,0.35)",
                          color: active ? "#020617" : "#e5e7eb",
                          fontSize: "0.75rem",
                          fontWeight: active ? 600 : 500,
                          cursor: "pointer",
                          boxShadow: active
                            ? "0 6px 18px rgba(15,23,42,0.4)"
                            : "none",
                          transition: "all 0.15s ease-out",
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Difficulty filter row */}
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    fontSize: "0.78rem",
                  }}
                >
                  {(
                    [
                      { id: "all", label: "All levels" },
                      { id: "Easy", label: "Easy focus" },
                      { id: "Medium", label: "Medium focus" },
                      { id: "Hard", label: "Hard focus" },
                    ] as { id: DifficultyFilter; label: string }[]
                  ).map((item) => {
                    const active = difficultyFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setDifficultyFilter(item.id)}
                        style={{
                          borderRadius: 999,
                          padding: "5px 11px",
                          border: active
                            ? "1px solid rgba(248,250,252,0.9)"
                            : "1px solid rgba(248,250,252,0.35)",
                          background: active
                            ? "rgba(248,250,252,0.95)"
                            : "transparent",
                          color: active ? "#020617" : "#e5e7eb",
                          cursor: "pointer",
                          transition: "all 0.15s ease-out",
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

                {/* Clear all filters inline action */}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: "0.78rem",
                    color: "#e5e7eb",
                  }}
                >
                  <button
                    onClick={handleClearAllFilters}
                    style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      border: "1px dashed rgba(248,250,252,0.7)",
                      background: "rgba(15,23,42,0.25)",
                      color: "#e5e7eb",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                    }}
                  >
                    Clear all filters
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Subject + stream toggles + basket summary */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 12,
            }}
          >
            {/* Subject toggle pill */}
            <div
              style={{
                alignSelf: "flex-end",
                borderRadius: 999,
                padding: 4,
                background: "rgba(15,23,42,0.9)",
                display: "inline-flex",
                gap: 4,
              }}
            >
              {(["Maths", "Science"] as HPQSubject[]).map((subj) => {
                const active = subj === subjectKey;
                return (
                  <button
                    key={subj}
                    onClick={() => handleSubjectToggle(subj)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: active ? "#f9fafb" : "transparent",
                      color: active ? "#020617" : "#e5e7eb",
                      boxShadow: active
                        ? "0 6px 16px rgba(15,23,42,0.45)"
                        : "none",
                      transition: "all 0.15s ease-out",
                    }}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>

            {/* Stream filter - only for Science (advanced mode) */}
            {subjectKey === "Science" && showAdvancedFilters && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 999,
                  background: "rgba(15,23,42,0.7)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  minWidth: 230,
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: "#cbd5f5",
                    opacity: 0.9,
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
                    ] as { id: StreamFilterKey; label: string }[]
                  ).map((stream) => {
                    const active = activeStream === stream.id;
                    return (
                      <button
                        key={stream.id}
                        onClick={() => handleStreamToggle(stream.id)}
                        style={{
                          borderRadius: 999,
                          padding: "4px 10px",
                          fontSize: "0.75rem",
                          border: active
                            ? "1px solid rgba(248,250,252,0.9)"
                            : "1px solid rgba(248,250,252,0.35)",
                          background: active
                            ? "rgba(248,250,252,0.95)"
                            : "transparent",
                          color: active ? "#020617" : "#e5e7eb",
                          cursor: "pointer",
                          transition: "all 0.15s ease-out",
                        }}
                      >
                        {stream.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Basket summary */}
            <div
              style={{
                marginTop: 12,
                padding: "8px 10px",
                borderRadius: 16,
                background: "rgba(15,23,42,0.6)",
                fontSize: "0.75rem",
                color: "#e5e7eb",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "flex-end",
              }}
            >
              <div>
                Mock basket:{" "}
                <strong>
                  {basket.length} Q - {totalBasketMarks} marks
                </strong>
              </div>
              <button
                onClick={handleOpenMockBuilder}
                style={{
                  marginTop: 2,
                  borderRadius: 999,
                  padding: "4px 10px",
                  border: "1px solid rgba(248,250,252,0.85)",
                  background: "#f9fafb",
                  color: "#020617",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Open mock builder
              </button>
            </div>
          </div>
        </section>

        {/* Topic dropdown row (under hero) */}
        <section style={{ marginTop: 24, marginBottom: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 650,
                  color: "#020617",
                  marginBottom: 4,
                }}
              >
                Class {grade} {subjectKey} - Highly Probable Questions
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                Each card = one chapter. Inside you get a mini{" "}
                <strong>HPQ stack</strong>: quick MCQs, ARs, short/long,
                case-based - exactly the pattern that keeps repeating in boards.
              </p>

              {/* NEW: mirrored mini stats snippet (TopicHub-style) */}
              {chapterMetaForStats &&
                totalAttemptsForStats > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 16,
                      padding: "8px 12px",
                      background:
                        "linear-gradient(90deg, rgba(15,23,42,0.94), rgba(37,99,235,0.9))",
                      color: "#e5e7eb",
                      fontSize: "0.8rem",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                      }}
                    >
                      Your {chapterMetaForStats.name} stats:
                    </span>

                    <span>{totalAttemptsForStats} Q attempted</span>

                    {typeof accuracyPercentForStats === "number" && (
                      <span>{accuracyPercentForStats}% correct</span>
                    )}

                    {typeof matchScoreForStats === "number" &&
                      matchLabelForStats && (
                        <span>
                          {matchLabelForStats} ({matchScoreForStats}%)
                        </span>
                      )}
                  </div>
                )}

              <div
                style={{
                  marginTop: 8,
                  borderRadius: 14,
                  padding: "8px 12px",
                  background: "rgba(15,23,42,0.08)",
                  color: "#334155",
                  fontSize: "0.78rem",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 600 }}>Bank health:</span>
                <span>{bankHealthSummaryForSubject.okCoverageCount} topics covered</span>
                <span>{bankHealthSummaryForSubject.lowCoverageCount} low coverage</span>
                <span>{bankHealthSummaryForSubject.zeroCoverageCount} missing</span>
              </div>
            </div>

            <div style={{ minWidth: 260 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.78rem",
                  color: "#475569",
                  marginBottom: 4,
                }}
              >
                Topic:
              </label>
              <select
                value={topicFilter}
                onChange={(e) => {
                  const next = e.target.value as TopicFilter;
                  setTopicFilter(next);
                  const nextParams = new URLSearchParams(
                    searchParams.toString()
                  );
                  if (next === "all") nextParams.delete("topic");
                  else nextParams.set("topic", next);
                  setSearchParams(nextParams);
                }}
                style={{
                  width: "100%",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.6)",
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  boxShadow: "0 8px 18px rgba(148,163,184,0.25)",
                }}
              >
                <option value="all">All topics</option>
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* HPQ topic list */}
        {filteredBuckets.length === 0 ? (
          <p
            style={{
              fontSize: "0.82rem",
              color: "#64748b",
              padding: "8px 4px",
            }}
          >
            Nothing visible with the current filters. Try switching back to{" "}
            <strong>All tiers / All levels / All streams / All topics</strong>{" "}
            or just click{" "}
            <button
              type="button"
              onClick={handleClearAllFilters}
              style={{
                border: "none",
                background: "transparent",
                color: "#1d4ed8",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "0.82rem",
                padding: 0,
              }}
            >
              Clear all filters
            </button>
            .
          </p>
        ) : (
          <section>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {filteredBuckets.map((bucket, index) => {
                const tier = getBucketTier(bucket);
                const tMeta = tierMeta[tier];
                const totalQuestions = bucket.questions.length;
                const totalMarks = bucket.questions.reduce(
                  (sum, q) => sum + (q.marks ?? 0),
                  0
                );
                const isScience =
                  (bucket.subject ?? subjectKey) === "Science";
                const streamLabel =
                  bucket.stream || (isScience ? "General" : undefined);
                const expanded =
                  expandedTopics[bucket.topic] ??
                  (topicFilter !== "all" ? true : index === 0);

                return (
                  <div
                    key={`${bucket.topic}-${bucket.subject ?? subjectKey}`}
                    style={{
                      borderRadius: 22,
                      padding: "16px 18px 12px",
                      backgroundColor: "rgba(248,250,252,0.98)",
                      border:
                        tier === "must-crack"
                          ? "1px solid rgba(248,113,113,0.7)"
                          : tier === "high-roi"
                          ? "1px solid rgba(129,140,248,0.7)"
                          : "1px solid rgba(148,163,184,0.4)",
                      boxShadow:
                        tier === "must-crack"
                          ? "0 14px 30px rgba(248,113,113,0.35)"
                          : tier === "high-roi"
                          ? "0 14px 30px rgba(129,140,248,0.35)"
                          : "0 10px 24px rgba(148,163,184,0.28)",
                    }}
                  >
                    {/* Header row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 14,
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
                              color: "#020617",
                            }}
                          >
                            {bucket.topic}
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
                            <span>{tMeta.emoji}</span>
                            <span>{tMeta.label}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTopics((prev) => ({
                                ...prev,
                                [bucket.topic]: !expanded,
                              }))
                            }
                            style={{
                              marginLeft: 8,
                              borderRadius: 999,
                              border: "none",
                              padding: "2px 8px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              backgroundColor: "rgba(15,23,42,0.04)",
                              color: "#0f172a",
                            }}
                            aria-label={expanded ? "Collapse chapter" : "Expand chapter"}
                          >
                            {expanded ? "Hide stack" : "Show stack"}
                          </button>
                          {isScience && streamLabel && (
                            <span
                              style={{
                                borderRadius: 999,
                                padding: "3px 9px",
                                fontSize: "0.7rem",
                                backgroundColor: "#ecfeff",
                                border: "1px solid rgba(6,182,212,0.6)",
                                color: "#0369a1",
                              }}
                            >
                              {streamLabel}
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            fontSize: "0.83rem",
                            color: "#475569",
                            marginBottom: 4,
                          }}
                        >
                          {tMeta.blurb} - This stack has{" "}
                          <strong>{totalQuestions} Q</strong> (~
                          {totalMarks} marks) in board-style formats
                          (MCQs/AR/short/case-based).
                        </p>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              handleAddTopicStackToBasket(bucket)
                            }
                            style={{
                              borderRadius: 999,
                              padding: "4px 10px",
                              border:
                                "1px solid rgba(34,197,94,0.6)",
                              background: "rgba(220,252,231,0.95)",
                              fontSize: "0.75rem",
                              color: "#15803d",
                              cursor: "pointer",
                            }}
                          >
                            Add full stack to mock
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleOpenTopicHubFromBucket(bucket)
                            }
                            style={{
                              borderRadius: 999,
                              padding: "4px 10px",
                              border:
                                "1px solid rgba(148,163,184,0.6)",
                              background: "rgba(248,250,252,0.95)",
                              fontSize: "0.75rem",
                              color: "#475569",
                              cursor: "pointer",
                            }}
                          >
                            Revise full topic in TopicHub
                          </button>
                        </div>

                      </div>

                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#64748b",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Subject:{" "}
                        <span
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                          }}
                        >
                          {bucket.subject ?? subjectKey}
                        </span>
                        {isScience && streamLabel && (
                          <>
                            <br />
                            Stream:{" "}
                            <span
                              style={{
                                fontWeight: 600,
                                color: "#111827",
                              }}
                            >
                              {streamLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Question list */}
                    {expanded && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: "1px dashed rgba(148,163,184,0.6)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {bucket.questions.map((q) => {
                        const feedback = hpqFeedback[q.id];
                        return (
                        <div
                          key={q.id}
                          style={{
                            borderRadius: 16,
                            padding: "8px 10px",
                            backgroundColor:
                              "rgba(248,250,252,0.96)",
                            border:
                              "1px solid rgba(203,213,225,0.8)",
                          }}
                        >
                          {renderQuestionMetaChips(q)}
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "#0f172a",
                              marginBottom: 4,
                              lineHeight: 1.35,
                            }}
                          >
                            {/*
                              Assertion-Reason items often store the real prompt
                              inside `assertion` + `reason`. If we only render
                              `q.question`, the card looks empty/incomplete.
                            */}
                            {q.kind === "assertion-reason" ||
                            // Support both legacy and new schema
                            (q as any).type === "AssertionReason" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                <div style={{ fontWeight: 600 }}>
                                  {q.question || "Assertion-Reason: refer to assertion and reason below."}
                                </div>
                                {q.assertion && (
                                  <div>
                                    <strong>Assertion:</strong> {q.assertion}
                                  </div>
                                )}
                                {q.reason && (
                                  <div>
                                    <strong>Reason:</strong> {q.reason}
                                  </div>
                                )}
                                {/* Render AR options if present */}
                                {(q as any).aROptions?.length ? (
                                  <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                                    {(q as any).aROptions.map((opt: any) => (
                                      <div key={opt.label} style={{ fontSize: "0.8rem", color: "#334155" }}>
                                        <strong>{opt.label}.</strong> {opt.text}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <>{q.question}</>
                            )}
                          </div>
                          <QuestionVisualAid
                            subject={bucket.subject ?? subjectKey}
                            topicKey={bucket.topic}
                            questionText={q.question}
                            kind={q.type}
                            marks={q.marks}
                          />
                          {(q.confidenceBand || q.confidenceRationale) && (
                            <div
                              style={{
                                marginTop: 6,
                                marginBottom: 6,
                                padding: "6px 8px",
                                borderRadius: 8,
                                border: "1px solid rgba(148,163,184,0.5)",
                                background: "rgba(248,250,252,0.9)",
                                fontSize: "0.75rem",
                                color: "#334155",
                              }}
                              title={q.confidenceRationale || ""}
                            >
                              <strong style={{ textTransform: "capitalize" }}>
                                Confidence: {q.confidenceBand || "medium"}
                              </strong>
                              {q.confidenceScore != null && (
                                <span> ({Math.round(q.confidenceScore * 100)}%)</span>
                              )}
                              {q.confidenceRationale ? (
                                <div style={{ marginTop: 2 }}>{q.confidenceRationale}</div>
                              ) : null}
                            </div>
                          )}

                          {q.answer && (
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "#4b5563",
                                marginTop: 2,
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>Ans:</span>{" "}
                              {q.answer}
                            </div>
                          )}

                          {q.pastBoardYear && (
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "#6b7280",
                                marginTop: 2,
                              }}
                            >
                              Pattern seen in:{" "}
                              <strong>{q.pastBoardYear}</strong>
                            </div>
                          )}

                          {/* Smart Learning quick-feedback row */}
                          <div
                            style={{
                              marginTop: 6,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                                fontSize: "0.75rem",
                                color: "#64748b",
                              }}
                            >
                              <span>How did this feel?</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkHpqAttempt(bucket, q, true)
                                }
                                style={{
                                  borderRadius: 999,
                                  padding: "3px 9px",
                                  border:
                                    feedback === "correct"
                                      ? "1px solid #16a34a"
                                      : "1px solid rgba(22,163,74,0.6)",
                                  backgroundColor:
                                    feedback === "correct"
                                      ? "#16a34a"
                                      : "#ecfdf3",
                                  fontSize: "0.75rem",
                                  color:
                                    feedback === "correct"
                                      ? "#ecfdf3"
                                      : "#166534",
                                  cursor: "pointer",
                                }}
                              >
                                I got this right
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMarkHpqAttempt(bucket, q, false)
                                }
                                style={{
                                  borderRadius: 999,
                                  padding: "3px 9px",
                                  border:
                                    feedback === "incorrect"
                                      ? "1px solid #ea580c"
                                      : "1px solid rgba(234,179,8,0.7)",
                                  backgroundColor:
                                    feedback === "incorrect"
                                      ? "#ea580c"
                                      : "#fffbeb",
                                  fontSize: "0.75rem",
                                  color:
                                    feedback === "incorrect"
                                      ? "#fef3c7"
                                      : "#92400e",
                                  cursor: "pointer",
                                }}
                              >
                                I need more practice
                              </button>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              {/* Mentor & practice actions */}
                              <button
                                onClick={() => handleAskAiMentor(bucket, q)}
                                style={{
                                  borderRadius: 999,
                                  border: "1px solid rgba(59,130,246,0.8)",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  cursor: "pointer",
                                }}
                              >
                                Solve
                              </button>
                              <button
                                onClick={() => handleExplainAiMentor(bucket, q)}
                                style={{
                                  borderRadius: 999,
                                  border: "1px dashed rgba(59,130,246,0.8)",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  background: "rgba(219,234,254,0.8)",
                                  color: "#1d4ed8",
                                  cursor: "pointer",
                                }}
                              >
                                Explain
                              </button>
                              <button
                                onClick={() => handleGenerateAiVariants(bucket, q)}
                                style={{
                                  borderRadius: 999,
                                  border: "1px dotted rgba(59,130,246,0.8)",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  background: "rgba(239,246,255,0.8)",
                                  color: "#1d4ed8",
                                  cursor: "pointer",
                                }}
                              >
                                AI variants
                              </button>
                              <button
                                onClick={() => handleMoreLikeThisPractice(bucket, q)}
                                style={{
                                  borderRadius: 999,
                                  border: "1px solid rgba(59,130,246,0.7)",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  background: "rgba(239,246,255,0.6)",
                                  color: "#1d4ed8",
                                  cursor: "pointer",
                                }}
                              >
                                Bank practice
                              </button>
                              <button
                                onClick={() => {
                                  if (!isInBasket(q.id)) {
                                    handleAddToBasket(bucket, q);
                                  }
                                }}
                                disabled={isInBasket(q.id)}
                                style={{
                                  borderRadius: 999,
                                  border: isInBasket(q.id)
                                    ? "1px solid rgba(79,70,229,0.85)"
                                    : "1px solid rgba(148,163,184,0.8)",
                                  padding: "4px 10px",
                                  fontSize: "0.75rem",
                                  background: isInBasket(q.id)
                                    ? "rgba(79,70,229,0.08)"
                                    : "#ffffff",
                                  color: isInBasket(q.id) ? "#3730a3" : "#0f172a",
                                  cursor: isInBasket(q.id) ? "default" : "pointer",
                                  opacity: isInBasket(q.id) ? 0.95 : 1,
                                }}
                              >
                                {isInBasket(q.id) ? "Added to mock" : "Add to mock"}
                              </button>

                              {/* AI variant display: loading, error and generated variants */}
                              {aiLoading[q.id] && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: "0.8rem",
                                    color: "#1d4ed8",
                                  }}
                                >
                                  Generating AI variants...
                                </div>
                              )}
                              {aiError[q.id] && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    fontSize: "0.8rem",
                                    color: "#b91c1c",
                                  }}
                                >
                                  {aiError[q.id]}
                                </div>
                              )}
                              {aiVariants[q.id] && aiVariants[q.id].length > 0 && (
                                <div
                                  style={{
                                    marginTop: 8,
                                    padding: "8px 12px",
                                    border: "1px dashed rgba(59,130,246,0.4)",
                                    borderRadius: 8,
                                    background: "rgba(239,246,255,0.6)",
                                  }}
                                >
                                  {aiVariants[q.id].map((v: MoreLikeThisVariant, i: number) => (
                                    <div
                                      key={String(v.index ?? i)}
                                      style={{ marginBottom: 6 }}
                                    >
                                      <strong>Variant {i + 1}:</strong> {v.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                      })}
                    </div>
                    )}

                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default HighlyProbableQuestions;
