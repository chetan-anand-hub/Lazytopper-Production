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
import { resolveCanonicalTopicKey, normalizeTopicSlug, getRuntimeTopicCandidates } from "../data/syllabus/topicAliasMap";
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
  buildTopicHubUrl,
} from "../utils/buildUrl";

import { useSmartLearning } from "../engine/smartLearningStore";
import type { ChapterId, ChapterMeta } from "../engine/smartLearningTypes";
import { QuestionVisualAid } from "../components/question/QuestionVisualAid";
import { MathText } from "../components/question/MathText";
import { SolutionChecker } from "../components/question/SolutionChecker";

import {
  fetchStepSolution,
  type StepSolutionResponse,
} from "../ai/aiClient";
import { buildBankHealthReport } from "../prediction/bankHealth";
import { buildTopicKeySources } from "../prediction/buildTopicKeySources";
import JourneyStrip from "../components/ux/JourneyStrip";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { trackUxEvent } from "../services/uxTelemetry";
import { lazy, Suspense } from "react";
import type { ConceptTeachContext } from "../components/tutor/ConceptTeachDrawer";
const ConceptTeachDrawer = lazy(() => import("../components/tutor/ConceptTeachDrawer"));

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

const COMPETENCY_TYPES = new Set(["CaseBased", "AssertionReason", "SourceBased"]);

function isCompetencyQuestion(q: HPQQuestion): boolean {
  return COMPETENCY_TYPES.has(q.type || "");
}

type CompetencyFilter = "all" | "competency";

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
  const [competencyFilter, setCompetencyFilter] = useState<CompetencyFilter>("all");

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
    setCompetencyFilter("all");
    setExpandedTopics({});
    setHpqFeedback({});
    setTopicFilter("all");
    setSolutionData({});
    setSolutionLoading({});
    setSolutionError({});
    setSolutionOpen({});
    // Ensure URL query doesn't carry stale filters across subjects.
    setSearchParams(new URLSearchParams());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);

  const [solutionData, setSolutionData] = useState<Record<string, StepSolutionResponse>>({});
  const [solutionLoading, setSolutionLoading] = useState<Record<string, boolean>>({});
  const [solutionError, setSolutionError] = useState<Record<string, string | undefined>>({});
  const [solutionOpen, setSolutionOpen] = useState<Record<string, "solve" | "explain" | undefined>>({});

  const [conceptDrawerOpen, setConceptDrawerOpen] = useState(false);
  const [conceptDrawerContext, setConceptDrawerContext] = useState<ConceptTeachContext | null>(null);

  const openConceptDrawer = (bucket: HPQTopicBucket, q: HPQQuestion) => {
    setConceptDrawerContext({
      topicKey: q.subtopic || q.concept || bucket.topic,
      subject: subjectKey,
      questionText: q.question,
      marks: q.marks,
      subtopic: q.subtopic,
      concept: q.concept,
    });
    setConceptDrawerOpen(true);
  };

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
    setActiveStream("all");
    setTierFilter("all");
    setDifficultyFilter("all");
    setCompetencyFilter("all");
    setExpandedTopics({});
    setHpqFeedback({});
    setTopicFilter("all");
    setSearchParams(new URLSearchParams());

    navigate(`/highly-probable/${grade}/${next}`, {
      state: { back: currentURL, backLabel: "Back to Predicted Q's" },
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
        backLabel: "Back to Predicted Q's",
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
          backLabel: "Back to Predicted Q's",
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

  const handleInlineSolution = async (
    bucket: HPQTopicBucket,
    q: HPQQuestion,
    mode: "solve" | "explain"
  ) => {
    const qId = q.id;
    const currentMode = solutionOpen[qId];
    if (currentMode === mode) {
      setSolutionOpen((prev) => ({ ...prev, [qId]: undefined }));
      return;
    }
    setSolutionOpen((prev) => ({ ...prev, [qId]: mode }));

    if (solutionData[qId]) return;

    setSolutionLoading((prev) => ({ ...prev, [qId]: true }));
    setSolutionError((prev) => ({ ...prev, [qId]: undefined }));
    try {
      const result = await fetchStepSolution({
        subject: subjectKey,
        topic: bucket.topic,
        question: q.question,
        marks: q.marks || 1,
        type: q.type,
        section: q.section,
        answer: q.answer,
        explanation: q.explanation,
        solutionSteps: q.solutionSteps?.length ? q.solutionSteps : undefined,
        finalAnswer: q.finalAnswer || undefined,
      });
      setSolutionData((prev) => ({ ...prev, [qId]: result }));
    } catch (err: any) {
      setSolutionError((prev) => ({
        ...prev,
        [qId]: err?.message || "Failed to load solution",
      }));
    } finally {
      setSolutionLoading((prev) => ({ ...prev, [qId]: false }));
    }
  };

  const handleMoreLikeThisPractice = (bucket: HPQTopicBucket, q: HPQQuestion) => {
    trackUxEvent("hpq_open_practice", "hpq", {
      topic: bucket.topic,
      subject: subjectKey,
      questionId: q.id,
      subtopic: q.subtopic,
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
      backLabel: "Back to Predicted Q's",
      subtopicHint: q.subtopic || q.concept || bucket.topic,
      focusBankIds: q.id ? [q.id] : undefined,
      recommendedCount,
      difficultyPreset: "All",
      source: "hpq_similar",
    });
  };


  // Smart Learning: log HPQ attempts (correct / incorrect)
  const handleMarkHpqAttempt = async (
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
      setHpqFeedback((prev) => ({
        ...prev,
        [q.id]: wasCorrect ? "correct" : "incorrect",
      }));
      try {
        const gam = await import("../utils/gamification");
        gam.incrementDailyGoal();
        if (wasCorrect) {
          gam.awardXP(10);
          gam.showXPToast(10);
          gam.triggerSparkle(window.innerWidth / 2, window.innerHeight / 2);
        }
      } catch {}
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
    setCompetencyFilter("all");
    setActiveStream("all");
    setTopicFilter("all");
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("topic");
    setSearchParams(nextParams);
  };

  // Core filtered data
  const filteredBuckets: HPQTopicBucket[] = useMemo(() => {
    let buckets = subjectBuckets;

    if (topicFilter !== "all") {
      const candidates = new Set(getRuntimeTopicCandidates(topicFilter).map(c => c.toLowerCase()));
      const canonicalFilter = resolveCanonicalTopicKey(topicFilter).toLowerCase();
      const normalizedFilter = normalizeTopicSlug(topicFilter).toLowerCase();
      candidates.add(canonicalFilter);
      candidates.add(normalizedFilter);
      candidates.add(topicFilter.toLowerCase());
      buckets = buckets.filter((b) => {
        const bucketNorm = normalizeTopicSlug(b.topic).toLowerCase();
        const bucketCanon = resolveCanonicalTopicKey(b.topic).toLowerCase();
        return candidates.has(b.topic.toLowerCase()) ||
               candidates.has(bucketNorm) ||
               candidates.has(bucketCanon) ||
               canonicalFilter === bucketCanon;
      });
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

    if (competencyFilter === "competency") {
      buckets = buckets
        .map((bucket) => ({
          ...bucket,
          questions: bucket.questions.filter(isCompetencyQuestion),
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
    competencyFilter,
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
            backgroundColor: "hsl(210, 33%, 96%)",
            border: "1px solid hsl(220, 18%, 90%)",
            fontSize: "0.7rem",
            color: "hsl(220, 15%, 42%)",
            fontWeight: 700,
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
            backgroundColor: "hsl(215, 75%, 95%)",
            border: "1px solid hsl(215, 65%, 84%)",
            fontSize: "0.7rem",
            color: "hsl(215, 65%, 32%)",
            fontWeight: 700,
          }}
        >
          {q.marks} mark{q.marks === 1 ? "" : "s"}
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
            backgroundColor: "hsl(43, 90%, 94%)",
            border: "1px solid hsl(38, 75%, 78%)",
            fontSize: "0.7rem",
            color: "hsl(35, 80%, 35%)",
            fontWeight: 700,
          }}
        >
          {q.likelihood} pattern signal
        </span>
      );
    }

    if (isCompetencyQuestion(q)) {
      chips.push(
        <span
          key="competency"
          style={{
            borderRadius: 999,
            padding: "3px 8px",
            backgroundColor: "hsl(43, 90%, 94%)",
            border: "1px solid hsl(38, 75%, 78%)",
            fontSize: "0.7rem",
            color: "hsl(35, 80%, 35%)",
            fontWeight: 600,
          }}
        >
          {q.type === "CaseBased" ? "Case-Based" : q.type === "SourceBased" ? "Source-Based" : "Assertion-Reasoning"}
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
        "--bg": "hsl(210, 40%, 98%)",
        "--bg-card": "#ffffff",
        "--bg-card-border": "hsl(220, 18%, 90%)",
        "--text": "hsl(220, 25%, 12%)",
        "--text-muted": "hsl(220, 15%, 42%)",
        minHeight: "100vh",
        background: "hsl(210, 40%, 98%)",
        color: "hsl(220, 25%, 12%)",
        paddingBottom: "80px",
      } as React.CSSProperties}
    >
      <div
        style={{
          maxWidth: "1180px",
          margin: "0 auto",
          padding: "24px clamp(16px, 4vw, 32px) 48px",
        }}
      >
        <ReturnContextBar
          backTo={back || buildTrendsUrl(grade, subjectKey)}
          backLabel={backLabel}
          currentLabel="Predicted Q's"
          quickLinks={[
            { label: "Trends", to: buildTrendsUrl(grade, subjectKey) },
            { label: "Chapter Hub", to: buildTopicHubUrl(grade, subjectKey, currentTopicKey && currentTopicKey !== "all" ? currentTopicKey : "") },
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
            borderRadius: 14,
            padding: "24px",
            background: "#ffffff",
            color: "hsl(220, 25%, 12%)",
            border: "1px solid hsl(220, 18%, 90%)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "stretch",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ flex: "1 1 560px", maxWidth: 720 }}>
            <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "hsl(152, 55%, 32%)",
              fontWeight: 800,
              marginBottom: 8,
            }}
            >
              Class {grade} - {subjectKey} - Predicted Questions
            </div>
            <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "2.1rem",
              lineHeight: 1.15,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              marginBottom: 10,
            }}
            >
              Predicted Questions Hub
            </h1>
            <p
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "hsl(220, 15%, 42%)",
              maxWidth: 760,
            }}
          >
              Board-style predicted question stacks built from available
              LazyTopper question sources and historical pattern signals. Use
              them for focused revision - switch between{" "}
              <strong>Maths</strong> and{" "}
              <strong>Science</strong>, then send questions into your mock paper.
            </p>
            <p
              style={{
                fontSize: "0.78rem",
                lineHeight: 1.5,
                color: "hsl(220, 15%, 42%)",
                marginTop: 6,
              }}
            >
              These are not guaranteed exam questions. Pattern signals should
              guide revision, not replace full chapter preparation.
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
                  border: "1px solid hsl(220, 18%, 90%)",
                  background: "hsl(210, 33%, 96%)",
                  color: "hsl(220, 15%, 42%)",
                  fontSize: "0.75rem",
                  padding: "6px 12px",
                  fontWeight: 700,
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
                  border: "1px solid hsl(220, 18%, 90%)",
                  background: "#ffffff",
                  color: "hsl(220, 25%, 12%)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 700,
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
                            ? "1px solid hsl(152, 55%, 45%)"
                            : "1px solid hsl(220, 18%, 90%)",
                          background: active
                            ? "hsl(152, 55%, 95%)"
                            : "#ffffff",
                          color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
                          fontSize: "0.75rem",
                          fontWeight: active ? 600 : 500,
                          cursor: "pointer",
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
                            ? "1px solid hsl(152, 55%, 45%)"
                            : "1px solid hsl(220, 18%, 90%)",
                          background: active
                            ? "hsl(152, 55%, 95%)"
                            : "#ffffff",
                          color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
                          cursor: "pointer",
                          transition: "all 0.15s ease-out",
                        }}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>

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
                      { id: "all", label: "All questions" },
                      { id: "competency", label: "Competency-Based Only" },
                    ] as { id: CompetencyFilter; label: string }[]
                  ).map((item) => {
                    const active = competencyFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCompetencyFilter(item.id)}
                        style={{
                          borderRadius: 999,
                          padding: "5px 11px",
                          border: active
                            ? "1px solid hsl(38, 75%, 78%)"
                            : "1px solid hsl(220, 18%, 90%)",
                          background: active
                            ? "hsl(43, 90%, 94%)"
                            : "#ffffff",
                          color: active ? "hsl(35, 80%, 35%)" : "hsl(220, 15%, 42%)",
                          fontWeight: active ? 600 : 400,
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
                    color: "var(--text-muted)",
                  }}
                >
                  <button
                    onClick={handleClearAllFilters}
                    style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      border: "1px dashed var(--bg-card-border)",
                      background: "#ffffff",
                      color: "hsl(220, 15%, 42%)",
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
              flex: "1 1 260px",
            }}
          >
            {/* Subject toggle pill */}
            <div
              style={{
                alignSelf: "flex-end",
                borderRadius: 999,
                padding: 4,
                background: "hsl(210, 33%, 96%)",
                border: "1px solid hsl(220, 18%, 90%)",
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
                      background: active ? "hsl(152, 55%, 95%)" : "transparent",
                      color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
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
                  borderRadius: 12,
                  background: "hsl(210, 33%, 96%)",
                  border: "1px solid hsl(220, 18%, 90%)",
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
                    color: "hsl(220, 15%, 42%)",
                    fontWeight: 800,
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
                            ? "1px solid hsl(152, 55%, 45%)"
                            : "1px solid hsl(220, 18%, 90%)",
                          background: active
                            ? "hsl(152, 55%, 95%)"
                            : "#ffffff",
                          color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
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
                padding: "12px 14px",
                borderRadius: 12,
                background: "hsl(210, 33%, 96%)",
                border: "1px solid hsl(220, 18%, 90%)",
                fontSize: "0.75rem",
                color: "hsl(220, 15%, 42%)",
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
                  border: "1px solid hsl(152, 55%, 45%)",
                  background: "hsl(152, 55%, 45%)",
                  color: "#ffffff",
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
        <section
          style={{
            marginTop: 18,
            marginBottom: 16,
            borderRadius: 14,
            padding: 18,
            background: "#ffffff",
            border: "1px solid hsl(220, 18%, 90%)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
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
                  fontFamily: "var(--font-display)",
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "hsl(220, 25%, 12%)",
                  letterSpacing: "-0.01em",
                  marginBottom: 4,
                }}
              >
                Class {grade} {subjectKey} - Predicted Questions
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "hsl(220, 15%, 42%)",
                  lineHeight: 1.55,
                }}
              >
                Each card = one chapter. Inside you get a mini{" "}
                <strong>predicted question stack</strong>: quick MCQs, ARs, short/long,
                case-based - useful board-style formats for focused revision.
              </p>

              {/* NEW: mirrored mini stats snippet (TopicHub-style) */}
              {chapterMetaForStats &&
                totalAttemptsForStats > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      borderRadius: 16,
                      padding: "8px 12px",
                      background: "hsl(152, 55%, 95%)",
                      border: "1px solid hsl(152, 55%, 80%)",
                      color: "hsl(152, 60%, 30%)",
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
                  background: "hsl(210, 33%, 96%)",
                  color: "hsl(220, 25%, 12%)",
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
                  color: "hsl(220, 15%, 42%)",
                  marginBottom: 4,
                  fontWeight: 700,
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
                  borderRadius: 10,
                  border: "1px solid hsl(220, 18%, 90%)",
                  padding: "8px 14px",
                  fontSize: "0.85rem",
                  outline: "none",
                  backgroundColor: "#ffffff",
                  color: "hsl(220, 25%, 12%)",
                  boxShadow: "none",
                  margin: 0,
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
              color: "hsl(220, 15%, 42%)",
              padding: "18px",
              background: "#ffffff",
              border: "1px solid hsl(220, 18%, 90%)",
              borderRadius: 14,
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
                color: "#1cb0f6",
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
                      borderRadius: 14,
                      padding: "18px",
                      backgroundColor: "#ffffff",
                      border:
                        tier === "must-crack"
                          ? "1px solid hsl(0, 70%, 86%)"
                          : tier === "high-roi"
                          ? "1px solid hsl(215, 65%, 84%)"
                          : "1px solid hsl(220, 18%, 90%)",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
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
                              fontWeight: 700,
                              color: "hsl(220, 25%, 12%)",
                              margin: 0,
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
                                  ? "hsl(0, 80%, 96%)"
                                  : tier === "high-roi"
                                  ? "hsl(215, 75%, 95%)"
                                  : "hsl(210, 33%, 96%)",
                              color:
                                tier === "must-crack"
                                  ? "hsl(0, 65%, 42%)"
                                  : tier === "high-roi"
                                  ? "hsl(215, 65%, 32%)"
                                  : "hsl(220, 15%, 42%)",
                              border: "1px solid hsl(220, 18%, 90%)",
                              fontWeight: 700,
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
                              border: "1px solid hsl(220, 18%, 90%)",
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              backgroundColor: "hsl(210, 33%, 96%)",
                              color: "hsl(220, 25%, 12%)",
                              fontWeight: 700,
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
                                backgroundColor: "hsl(215, 75%, 95%)",
                                border: "1px solid hsl(215, 65%, 84%)",
                                color: "hsl(215, 65%, 32%)",
                                fontWeight: 700,
                              }}
                            >
                              {streamLabel}
                            </span>
                          )}
                        </div>

                        <p
                          style={{
                            fontSize: "0.83rem",
                            color: "hsl(220, 15%, 42%)",
                            marginBottom: 4,
                            lineHeight: 1.55,
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
                              padding: "6px 11px",
                              border:
                                "1px solid hsl(152, 55%, 45%)",
                              background: "hsl(152, 55%, 45%)",
                              fontSize: "0.75rem",
                              color: "#ffffff",
                              cursor: "pointer",
                              fontWeight: 700,
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
                              padding: "6px 11px",
                              border:
                                "1px solid hsl(220, 18%, 90%)",
                              background: "#ffffff",
                              fontSize: "0.75rem",
                              color: "hsl(220, 25%, 12%)",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            Revise full topic in Chapter Hub
                          </button>
                        </div>

                      </div>

                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "hsl(220, 15%, 42%)",
                          textAlign: "right",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Subject:{" "}
                        <span
                          style={{
                              fontWeight: 600,
                              color: "hsl(220, 25%, 12%)",
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
                                  color: "hsl(220, 25%, 12%)",
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
                          paddingTop: 12,
                          borderTop: "1px solid hsl(220, 18%, 90%)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {bucket.questions.map((q) => {
                        const feedback = hpqFeedback[q.id];
                        return (
                        <div
                          key={q.id}
                          style={{
                            borderRadius: 12,
                            padding: "14px",
                            backgroundColor:
                              "hsl(210, 40%, 98%)",
                            border:
                              "1px solid hsl(220, 18%, 90%)",
                          }}
                        >
                          {renderQuestionMetaChips(q)}
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "hsl(220, 25%, 12%)",
                              marginBottom: 4,
                              lineHeight: 1.55,
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
                                  <MathText text={q.question || "Assertion-Reason: refer to assertion and reason below."} />
                                </div>
                                {q.assertion && (
                                  <div>
                                    <strong>Assertion:</strong> <MathText text={q.assertion} />
                                  </div>
                                )}
                                {q.reason && (
                                  <div>
                                    <strong>Reason:</strong> <MathText text={q.reason} />
                                  </div>
                                )}
                                {/* Render AR options if present */}
                                {(q as any).aROptions?.length ? (
                                  <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                                    {(q as any).aROptions.map((opt: any) => (
                                      <div key={opt.label} style={{ fontSize: "0.8rem", color: "var(--text)" }}>
                                        <strong>{opt.label}.</strong> {opt.text}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <MathText text={q.question} />
                            )}

                            {Array.isArray((q as any).options) && (q as any).options.length > 0 && !(q as any).aROptions?.length && (
                              <div style={{ marginTop: 6, paddingLeft: 4 }}>
                                {((q as any).options as string[]).map((opt: string, oi: number) => (
                                  <div
                                    key={oi}
                                    style={{
                                      display: "flex",
                                      alignItems: "baseline",
                                      gap: 8,
                                      padding: "3px 0",
                                      fontSize: "0.84rem",
                                      color: "var(--text)",
                                    }}
                                  >
                                    <span style={{ fontWeight: 600, color: "var(--text-muted)", minWidth: 20 }}>
                                      {String.fromCharCode(65 + oi)}.
                                    </span>
                                    <MathText text={opt} />
                                  </div>
                                ))}
                              </div>
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
                                border: "1px solid hsl(220, 18%, 90%)",
                                background: "#ffffff",
                                fontSize: "0.75rem",
                                color: "hsl(220, 25%, 12%)",
                              }}
                              title={q.confidenceRationale || ""}
                            >
                              <strong style={{ textTransform: "capitalize" }}>
                                Pattern signal: {q.confidenceBand || "medium"}
                              </strong>
                              {q.confidenceScore != null && (
                                <span> (~{Math.round(q.confidenceScore * 100)}%)</span>
                              )}
                              {q.confidenceRationale ? (
                                <div style={{ marginTop: 2 }}>{q.confidenceRationale}</div>
                              ) : null}
                              <div style={{ marginTop: 2, fontSize: "0.68rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                Based on pattern analysis - not a guarantee
                              </div>
                            </div>
                          )}

                          {q.answer && (
                            <div
                              style={{
                                fontSize: "0.8rem",
                                color: "hsl(220, 15%, 42%)",
                                marginTop: 8,
                                padding: "8px 10px",
                                borderRadius: 10,
                                background: "#ffffff",
                                border: "1px solid hsl(220, 18%, 90%)",
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>Reference answer:</span>{" "}
                              {q.answer}
                            </div>
                          )}

                          {q.pastBoardYear && (
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
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
                                color: "hsl(220, 15%, 42%)",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>Self-check:</span>
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
                                      ? "1px solid hsl(152, 55%, 45%)"
                                      : "1px solid hsl(152, 55%, 75%)",
                                  backgroundColor:
                                    feedback === "correct"
                                      ? "hsl(152, 55%, 45%)"
                                      : "hsl(152, 55%, 95%)",
                                  fontSize: "0.75rem",
                                  color:
                                    feedback === "correct"
                                      ? "#ffffff"
                                      : "hsl(152, 55%, 28%)",
                                  cursor: "pointer",
                                  fontWeight: 700,
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
                                      ? "1px solid hsl(35, 80%, 35%)"
                                      : "1px solid hsl(38, 75%, 78%)",
                                  backgroundColor:
                                    feedback === "incorrect"
                                      ? "hsl(35, 80%, 35%)"
                                      : "hsl(43, 90%, 94%)",
                                  fontSize: "0.75rem",
                                  color:
                                    feedback === "incorrect"
                                      ? "#ffffff"
                                      : "hsl(35, 80%, 35%)",
                                  cursor: "pointer",
                                  fontWeight: 700,
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
                                alignItems: "center",
                              }}
                            >
                              <button
                                onClick={() => handleInlineSolution(bucket, q, "solve")}
                                style={{
                                  borderRadius: 999,
                                  border: solutionOpen[q.id]
                                    ? "1px solid hsl(152, 55%, 45%)"
                                    : "1px solid hsl(220, 18%, 90%)",
                                  padding: "6px 10px",
                                  fontSize: "0.75rem",
                                  background: solutionOpen[q.id]
                                    ? "hsl(152, 55%, 95%)"
                                    : "#ffffff",
                                  color: solutionOpen[q.id] ? "hsl(152, 55%, 28%)" : "hsl(220, 25%, 12%)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {solutionOpen[q.id] ? "Hide Solution" : "Step-by-Step Solution"}
                              </button>
                              <button
                                onClick={() => handleMoreLikeThisPractice(bucket, q)}
                                style={{
                                  borderRadius: 999,
                                  border: "1px solid hsl(220, 18%, 90%)",
                                  padding: "6px 10px",
                                  fontSize: "0.75rem",
                                  background: "#ffffff",
                                  color: "hsl(220, 25%, 12%)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Practice similar
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
                                    ? "1px solid hsl(152, 55%, 45%)"
                                    : "1px solid hsl(220, 18%, 90%)",
                                  padding: "6px 10px",
                                  fontSize: "0.75rem",
                                  background: isInBasket(q.id)
                                    ? "hsl(152, 55%, 95%)"
                                    : "#ffffff",
                                  color: isInBasket(q.id) ? "hsl(152, 55%, 28%)" : "hsl(220, 25%, 12%)",
                                  cursor: isInBasket(q.id) ? "default" : "pointer",
                                  opacity: isInBasket(q.id) ? 0.95 : 1,
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isInBasket(q.id) ? "Added to mock" : "Add to mock"}
                              </button>
                            </div>

                            {solutionOpen[q.id] && (
                              <div
                                style={{
                                  marginTop: 10,
                                  padding: "14px 16px",
                                  border: "1px solid hsl(215, 65%, 84%)",
                                  borderRadius: 12,
                                  background: "hsl(215, 75%, 97%)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 10,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.85rem",
                                      fontWeight: 700,
                                      color: "hsl(215, 65%, 32%)",
                                    }}
                                  >
                                    Step-by-Step Solution
                                    {solutionData[q.id] && (
                                      <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                                        ({solutionData[q.id].totalMarks} marks)
                                      </span>
                                    )}
                                  </span>
                                  <button
                                    onClick={() =>
                                      setSolutionOpen((prev) => ({
                                        ...prev,
                                        [q.id]: undefined,
                                      }))
                                    }
                                    style={{
                                      background: "none",
                                      border: "1px solid #cbd5e1",
                                      borderRadius: 999,
                                      padding: "2px 10px",
                                      fontSize: "0.7rem",
                                      color: "var(--text-muted)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Close
                                  </button>
                                </div>

                                {solutionLoading[q.id] && (
                                  <div style={{ fontSize: "0.82rem", color: "#1cb0f6", padding: "8px 0" }}>
                                    Loading step-by-step solution...
                                  </div>
                                )}

                                {solutionError[q.id] && (
                                  <div style={{ fontSize: "0.82rem", color: "#ef4444", padding: "8px 0" }}>
                                    {solutionError[q.id]}
                                  </div>
                                )}

                                {solutionData[q.id] && (
                                  <div>
                                    {solutionData[q.id].steps.map((step) => (
                                      <div
                                        key={step.stepNumber}
                                        style={{
                                            display: "flex",
                                            gap: 10,
                                            marginBottom: 8,
                                            padding: "10px 12px",
                                            background: "#ffffff",
                                            borderRadius: 10,
                                            border: "1px solid hsl(220, 18%, 90%)",
                                          }}
                                      >
                                        <div
                                          style={{
                                            minWidth: 28,
                                            height: 28,
                                            borderRadius: 8,
                                            background: "hsl(152, 55%, 45%)",
                                            color: "#ffffff",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            flexShrink: 0,
                                          }}
                                        >
                                          {step.stepNumber}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div
                                            style={{
                                              fontSize: "0.8rem",
                                              fontWeight: 700,
                                              color: "hsl(220, 25%, 12%)",
                                              marginBottom: 2,
                                            }}
                                          >
                                            <MathText text={step.description} />
                                            <span
                                              style={{
                                                marginLeft: 8,
                                                fontSize: "0.7rem",
                                                fontWeight: 700,
                                                color: step.marks === 0 ? "hsl(220, 15%, 42%)" : "hsl(215, 65%, 32%)",
                                                background: step.marks === 0 ? "hsl(210, 33%, 96%)" : "hsl(215, 75%, 95%)",
                                                borderRadius: 999,
                                                padding: "1px 7px",
                                              }}
                                            >
                                              {step.marks === 0 ? "Explanation" : step.marks === 0.5 ? "½ mark" : step.marks % 1 === 0.5 ? `${Math.floor(step.marks)}½ marks` : `${step.marks} ${step.marks === 1 ? "mark" : "marks"}`}
                                            </span>
                                          </div>
                                          <div
                                            style={{
                                              fontSize: "0.78rem",
                                              color: "hsl(220, 15%, 42%)",
                                              lineHeight: 1.5,
                                            }}
                                          >
                                            <MathText text={step.working} />
                                          </div>
                                        </div>
                                      </div>
                                    ))}

                                    {solutionData[q.id].commonMistakes &&
                                      solutionData[q.id].commonMistakes!.length > 0 && (
                                        <div
                                          style={{
                                            marginTop: 8,
                                            padding: "8px 10px",
                                            background: "rgba(239,68,68,0.08)",
                                            borderRadius: 8,
                                            border: "1px solid rgba(239,68,68,0.2)",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: "0.75rem",
                                              fontWeight: 700,
                                              color: "#991b1b",
                                              marginBottom: 4,
                                            }}
                                          >
                                            Common Mistakes
                                          </div>
                                          {solutionData[q.id].commonMistakes!.map(
                                            (m, i) => (
                                              <div
                                                key={i}
                                                style={{
                                                  fontSize: "0.75rem",
                                                  color: "#7f1d1d",
                                                  marginBottom: 2,
                                                }}
                                              >
                                                • {m}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}

                                    {solutionData[q.id].examTip && (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          padding: "8px 10px",
                                          background: "rgba(34,197,94,0.08)",
                                          borderRadius: 8,
                                          border: "1px solid rgba(34,197,94,0.2)",
                                          fontSize: "0.75rem",
                                          color: "#22c55e",
                                        }}
                                      >
                                        <strong>Exam Tip:</strong>{" "}
                                        {solutionData[q.id].examTip}
                                      </div>
                                    )}

                                    <button
                                      onClick={() => openConceptDrawer(bucket, q)}
                                      style={{
                                        marginTop: 12,
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: 10,
                                        border: "1px solid hsl(215, 65%, 80%)",
                                        background: "hsl(215, 75%, 95%)",
                                        color: "hsl(215, 65%, 32%)",
                                        fontSize: "0.82rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 8,
                                      }}
                                    >
                                      Teach me this concept
                                    </button>
                                    <SolutionChecker
                                      question={q.question}
                                      marks={q.marks ?? 0}
                                      subject={bucket.subject ?? subjectKey}
                                      topic={bucket.topic}
                                      questionId={q.id ? String(q.id) : undefined}
                                      solutionSteps={q.solutionSteps}
                                      finalAnswer={q.finalAnswer}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
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

      {conceptDrawerContext && (
        <Suspense fallback={null}>
          <ConceptTeachDrawer
            open={conceptDrawerOpen}
            onClose={() => setConceptDrawerOpen(false)}
            context={conceptDrawerContext}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HighlyProbableQuestions;
