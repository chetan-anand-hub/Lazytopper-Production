/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/HighlyProbableQuestions.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
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

import { useCurrentURL } from "../utils/useCurrentURL";
import { buildTopicHubUrl } from "../utils/buildUrl";

import { QuestionVisualAid } from "../components/question/QuestionVisualAid";
import { MathText } from "../components/question/MathText";
import { SolutionChecker } from "../components/question/SolutionChecker";

import {
  fetchStepSolution,
  type StepSolutionResponse,
} from "../ai/aiClient";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { useIsDesktop } from "../hooks/useIsDesktop";
import { trackUxEvent } from "../services/uxTelemetry";

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
const EXAM_TRENDS_PATH = "/exam-trends";

const tierMeta: Record<
  HPQTier,
  { label: string; emoji: string; blurb: string }
> = {
    "must-crack": {
      label: "Must-crack",
      emoji: "",
      blurb: "High-priority board-style stack. Start here first.",
    },
    "high-roi": {
      label: "High-ROI",
      emoji: "",
      blurb: "Strong revision value for the time you invest.",
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

const COMPETENCY_TYPES = new Set(["CaseBased", "AssertionReason", "SourceBased"]);

function isCompetencyQuestion(q: HPQQuestion): boolean {
  return COMPETENCY_TYPES.has(q.type || "");
}

function getCompetencyLabel(q: HPQQuestion): string | undefined {
  if (q.type === "CaseBased") return "Case-based";
  if (q.type === "AssertionReason" || q.kind === "assertion-reason") {
    return "Assertion–Reason";
  }
  if (q.type === "SourceBased") return "Source-based";
  return undefined;
}

interface HpqOption {
  label: string;
  text: string;
}

function addHpqReturnContext(url: string, returnTo: string): string {
  const params = new URLSearchParams({
    source: "hpq",
    returnTo,
  });
  return `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;
}


type HpqBackSource = "practice" | "trends" | "topicHub" | "home" | string;

function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.startsWith("//")) return false;
  if (trimmed.startsWith("/\\")) return false;
  if (trimmed.startsWith("\\")) return false;
  if (/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}

function topicMatchTokens(rawTopic: string): Set<string> {
  const tokens = [
    rawTopic,
    normalizeTopicSlug(rawTopic),
    resolveCanonicalTopicKey(rawTopic),
    ...getRuntimeTopicCandidates(rawTopic),
  ];
  const out = new Set<string>();
  tokens.forEach((token) => {
    const trimmed = String(token || "").trim();
    if (!trimmed) return;
    out.add(trimmed.toLowerCase());
    out.add(normalizeTopicSlug(trimmed).toLowerCase());
    out.add(resolveCanonicalTopicKey(trimmed).toLowerCase());
  });
  return out;
}

function topicsMatch(left: string, right: string): boolean {
  const leftTokens = topicMatchTokens(left);
  const rightTokens = topicMatchTokens(right);
  for (const token of leftTokens) {
    if (rightTokens.has(token)) return true;
  }
  return false;
}

function resolveTopicFilterValue(
  rawTopic: string | null | undefined,
  topicOptions: string[],
): TopicFilter {
  const trimmed = String(rawTopic || "").trim();
  if (!trimmed) return "all";
  const exact = topicOptions.find((topic) => topic.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const matched = topicOptions.find((topic) => topicsMatch(trimmed, topic));
  return matched || trimmed;
}

function resolveHpqBackTarget({
  source,
  queryReturnTo,
  stateBack,
  stateBackLabel,
}: {
  source: HpqBackSource | null | undefined;
  queryReturnTo: string | null | undefined;
  stateBack: string | null | undefined;
  stateBackLabel?: string | null;
}): { target: string; label: string } {
  const safeQueryReturnTo = isSafeInternalPath(queryReturnTo) ? queryReturnTo : null;
  const safeStateBack = isSafeInternalPath(stateBack) ? stateBack : null;
  const normalizedSource = String(source || "").trim();

  const sourceLabel = (() => {
    if (normalizedSource === "practice" || normalizedSource === "hpq_similar") return "Back to Practice";
    if (normalizedSource === "trends") return "Back to Exam Trends";
    if (normalizedSource === "topicHub") return "Back to Topic Hub";
    if (normalizedSource === "home") return "Back to Home";
    if (stateBackLabel) return stateBackLabel;
    return "Back";
  })();

  if (safeQueryReturnTo) return { target: safeQueryReturnTo, label: sourceLabel };
  if (safeStateBack) return { target: safeStateBack, label: stateBackLabel || sourceLabel };

  if (normalizedSource === "practice" || normalizedSource === "hpq_similar") {
    return { target: "/practice-hub", label: "Back to Practice" };
  }
  if (normalizedSource === "home") {
    return { target: "/", label: "Back to Home" };
  }
  if (normalizedSource === "topicHub") {
    return { target: EXAM_TRENDS_PATH, label: "Back to Exam Trends" };
  }
  if (normalizedSource === "trends") {
    return { target: EXAM_TRENDS_PATH, label: "Back to Exam Trends" };
  }

  return { target: EXAM_TRENDS_PATH, label: "Back" };
}

function getQuestionOptions(q: HPQQuestion): HpqOption[] {
  const arOptions = (q as any).aROptions;
  if (Array.isArray(arOptions) && arOptions.length > 0) {
    return arOptions
      .filter((opt) => opt && (opt.label || opt.text))
      .map((opt, index) => ({
        label: String(opt.label || String.fromCharCode(65 + index)).trim(),
        text: String(opt.text || "").trim(),
      }));
  }

  const options = (q as any).options;
  if (Array.isArray(options) && options.length > 0) {
    return options
      .filter((opt) => opt != null && String(opt).trim().length > 0)
      .map((opt, index) => ({
        label: String.fromCharCode(65 + index),
        text: String(opt).trim(),
      }));
  }

  return [];
}

function getCorrectOptionLabel(q: HPQQuestion, options: HpqOption[]): string | undefined {
  const explicit = String((q as any).correctOption || "").trim();
  if (explicit) return explicit.toUpperCase();

  const answer = String(q.answer || q.finalAnswer || "").trim();
  if (!answer) return undefined;

  const exactLabel = options.find((opt) => answer.toUpperCase() === opt.label.toUpperCase());
  if (exactLabel) return exactLabel.label;

  const exactText = options.find((opt) => answer.toLowerCase() === opt.text.toLowerCase());
  if (exactText) return exactText.label;

  const containedText = options.find((opt) => {
    const optionText = opt.text.toLowerCase();
    const answerText = answer.toLowerCase();
    return answerText.includes(optionText) || optionText.includes(answerText);
  });
  return containedText?.label;
}

function extractAnswerOnlyOptionLetter(raw: unknown): string | undefined {
  const value = String(raw || "")
    .replace(/[`*_]/g, "")
    .trim();
  if (!value) return undefined;

  const match = value.match(
    /^(?:(?:the\s+)?correct\s+)?(?:ans(?:wer)?\s*(?:is|:|-)?\s*)?(?:option\s*)?[\(\[]?\s*([A-Z])\s*[\)\].:]?$/i
  );
  return match?.[1]?.toUpperCase();
}

function getCorrectOptionLetterCandidates(
  q: HPQQuestion,
  correctOptionLabel: string | undefined
): Set<string> {
  const candidates = new Set<string>();
  [
    correctOptionLabel,
    (q as any).correctOption,
    q.answer,
    q.finalAnswer,
  ].forEach((value) => {
    const letter = extractAnswerOnlyOptionLetter(value);
    if (letter) candidates.add(letter);
  });
  return candidates;
}

function isGenericAnswerStepLabel(raw: unknown): boolean {
  const label = String(raw || "").trim().toLowerCase();
  return (
    label.length === 0 ||
    label === "answer" ||
    label === "correct answer" ||
    label === "correct option" ||
    label === "final answer" ||
    /^step\s+\d+$/.test(label)
  );
}

function isDuplicateObjectiveAnswerStep(
  step: StepSolutionResponse["steps"][number],
  correctLetters: Set<string>
): boolean {
  if (correctLetters.size === 0) return false;

  const workingLetter = extractAnswerOnlyOptionLetter(step.working);
  const descriptionLetter = extractAnswerOnlyOptionLetter(step.description);

  if (workingLetter && correctLetters.has(workingLetter)) {
    return (
      isGenericAnswerStepLabel(step.description) ||
      descriptionLetter === workingLetter
    );
  }

  if (descriptionLetter && correctLetters.has(descriptionLetter)) {
    const working = String(step.working || "").trim();
    return !working || extractAnswerOnlyOptionLetter(working) === descriptionLetter;
  }

  return false;
}

function getVisibleSolutionSteps(
  solution: StepSolutionResponse | undefined,
  q: HPQQuestion,
  correctOptionLabel: string | undefined,
  isObjective: boolean
): StepSolutionResponse["steps"] {
  if (!solution) return [];
  if (!isObjective) return solution.steps;

  const correctLetters = getCorrectOptionLetterCandidates(q, correctOptionLabel);
  return solution.steps.filter(
    (step) => !isDuplicateObjectiveAnswerStep(step, correctLetters)
  );
}

function isObjectiveQuestion(q: HPQQuestion, options: HpqOption[]): boolean {
  return (
    options.length > 0 ||
    q.section === "A" ||
    q.marks === 1 ||
    q.type === "MCQ" ||
    q.type === "AssertionReason" ||
    q.kind === "assertion-reason"
  );
}

function getSolutionUnavailableCopy(isObjective: boolean): string {
  return isObjective
    ? "Solution logic is unavailable right now. Try the correct answer feedback or revise this topic."
    : "Step solution is unavailable right now. Try Check my answer or Revise topic.";
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          minWidth: 110,
          fontSize: "0.74rem",
          fontWeight: 800,
          color: "hsl(220, 15%, 42%)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {children}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "5px 11px",
        border: active
          ? "1px solid hsl(152, 55%, 45%)"
          : "1px solid hsl(220, 18%, 90%)",
        background: active ? "hsl(152, 55%, 95%)" : "#ffffff",
        color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
        fontSize: "0.76rem",
        fontWeight: active ? 700 : 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

type CompetencyFilter = "all" | "competency";

// ---------- Component ----------

const HighlyProbableQuestions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const [searchParams, setSearchParams] = useSearchParams();
  const { grade: gradeParam, subject } = useParams<"grade" | "subject">();

  // Read grade and subject from path; fall back to query params for backward compatibility.
  const grade = gradeParam || searchParams.get("grade") || "10";
  const subjectParam = subject || searchParams.get("subject");
  const subjectKey: HPQSubject = normaliseSubject(subjectParam);

  // Capture current URL for back-navigation state.
  const currentURL = useCurrentURL();
  const navState = (location.state as any) || {};
  const back: string | undefined = navState.back;
  const hpqSource = searchParams.get("source");
  const hpqReturnTo = searchParams.get("returnTo");
  const hpqBack = useMemo(
    () =>
      resolveHpqBackTarget({
        source: hpqSource,
        queryReturnTo: hpqReturnTo,
        stateBack: back,
        stateBackLabel: navState.backLabel,
      }),
    [hpqSource, hpqReturnTo, back, navState.backLabel]
  );

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

  // Basket state
  const [basket, setBasket] = useState<BasketItem[]>([]);
  // Per-chapter expand/collapse state: topic -> expanded?
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    {}
  );
  const [answerCheckOpen, setAnswerCheckOpen] = useState<Record<string, boolean>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const previousSubjectKeyRef = useRef(subjectKey);

  // If the route subject changes (Maths <-> Science), React Router may reuse the
  // same component instance. Reset local UI state here to prevent filter/state
  // leakage across subjects.
  useEffect(() => {
    if (previousSubjectKeyRef.current === subjectKey) return;
    previousSubjectKeyRef.current = subjectKey;
    setActiveStream("all");
    setTierFilter("all");
    setDifficultyFilter("all");
    setShowAdvancedFilters(false);
    setCompetencyFilter("all");
    setExpandedTopics({});
    setTopicFilter("all");
    setSolutionData({});
    setSolutionLoading({});
    setSolutionError({});
    setSolutionOpen({});
    setAnswerCheckOpen({});
    setSelectedOptions({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);

  const [solutionData, setSolutionData] = useState<Record<string, StepSolutionResponse>>({});
  const [solutionLoading, setSolutionLoading] = useState<Record<string, boolean>>({});
  const [solutionError, setSolutionError] = useState<Record<string, string | undefined>>({});
  const [solutionOpen, setSolutionOpen] = useState<Record<string, "solve" | "explain" | undefined>>({});

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

  // Topic options for dropdown (for current subject)
  const topicOptions = useMemo(
    () =>
      Array.from(new Set(subjectBuckets.map((b) => b.topic))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [subjectBuckets]
  );

  const resolvedTopicFilter = useMemo(
    () => resolveTopicFilterValue(topicParam, topicOptions),
    [topicParam, topicOptions]
  );

  useEffect(() => {
    setTopicFilter(resolvedTopicFilter);
  }, [resolvedTopicFilter]);

  // NEW: derive "current topic" & its bucket for stats snippet
  const currentTopicKey: string | undefined =
    (topicFilter !== "all" ? topicFilter : topicParam) || undefined;

  // Handlers

  const handleSubjectToggle = (next: HPQSubject) => {
    setActiveStream("all");
    setTierFilter("all");
    setDifficultyFilter("all");
    setCompetencyFilter("all");
    setExpandedTopics({});
    setAnswerCheckOpen({});
    setSelectedOptions({});
    setTopicFilter("all");
    setSearchParams(new URLSearchParams());

    navigate(`/highly-probable/${grade}/${next}`, {
      state: { back: currentURL, backLabel: "Back to Question Patterns" },
      replace: true,
    });
  };

  const handleStreamToggle = (next: StreamFilterKey) => {
    setActiveStream(next);
  };

  const handleOpenMockBuilder = () => {
    // save basket and open mock builder with grade & subject in path
    persistBasket(basket);
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", "hpq");
    params.set("backTo", currentURL);
    const query = params.toString();
    navigate(`/mock-builder/${encodeURIComponent(grade)}/${encodeURIComponent(subjectKey)}${query ? `?${query}` : ""}`, {
      state: {
        back: currentURL,
        backLabel: "Back to Question Patterns",
      },
    });
  };

  const handleClearBasket = () => {
    setBasket([]);
    persistBasket([]);
  };

  const handleOpenTopicHubFromBucket = (bucket: HPQTopicBucket) => {
    trackUxEvent("hpq_open_topic_hub", "hpq", {
      topic: bucket.topic,
      subject: subjectKey,
    });
    const topicHubUrl = addHpqReturnContext(
      buildTopicHubUrl(grade, subjectKey, bucket.topic),
      currentURL
    );
    navigate(
      topicHubUrl,
      {
        state: {
          back: currentURL,
          backLabel: "Back to Question Patterns",
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

  const handleToggleAnswerCheck = (qId: string) => {
    const shouldOpen = !answerCheckOpen[qId];
    setAnswerCheckOpen((prev) => ({
      ...prev,
      [qId]: shouldOpen,
    }));
    if (shouldOpen) {
      setSolutionOpen((prev) => ({
        ...prev,
        [qId]: undefined,
      }));
    }
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
    setAnswerCheckOpen((prev) => (
      prev[qId] ? { ...prev, [qId]: false } : prev
    ));

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
      console.warn("HPQ step solution unavailable", err);
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
      backLabel: "Back to Question Patterns",
      subtopicHint: q.subtopic || q.concept || bucket.topic,
      focusBankIds: q.id ? [q.id] : undefined,
      recommendedCount,
      difficultyPreset: "All",
      source: "hpq_similar",
    });
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
      buckets = buckets.filter((bucket) => topicsMatch(topicFilter, bucket.topic));
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
    const competencyLabel = getCompetencyLabel(q);

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

    if (competencyLabel) {
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
            fontWeight: 700,
          }}
        >
          {competencyLabel}
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
        minHeight: isDesktop ? "100%" : "100vh",
        background: isDesktop ? "transparent" : "hsl(210, 40%, 98%)",
        color: "hsl(220, 25%, 12%)",
        paddingBottom: isDesktop ? "48px" : "80px",
      } as React.CSSProperties}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: isDesktop
            ? "28px clamp(20px, 4vw, 32px) 56px"
            : "24px clamp(16px, 4vw, 32px) 48px",
        }}
      >
        {isDesktop ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
              fontSize: "0.8rem",
              color: "hsl(220, 15%, 42%)",
            }}
          >
            <button
              type="button"
              onClick={() => navigate(hpqBack.target)}
              style={{
                border: "1px solid hsl(220, 18%, 90%)",
                background: "#ffffff",
                color: "hsl(220, 25%, 12%)",
                borderRadius: 8,
                padding: "7px 11px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {hpqBack.label}
            </button>
            <span style={{ fontWeight: 700, color: "hsl(220, 25%, 12%)" }}>
              High-Probability Question Patterns
            </span>
            <span>Class {grade} - {subjectKey}</span>
          </div>
        ) : (
          /* SEVER PR: JourneyStrip removed — it linked to the retired old /trends
             ("guide-the-student" journey is retired; the product is intent-first).
             ReturnContextBar's quick-links already point to live surfaces. */
          <ReturnContextBar
            backTo={hpqBack.target}
            backLabel={hpqBack.label}
            currentLabel="Question Patterns"
            quickLinks={[
              { label: "Trends", to: EXAM_TRENDS_PATH },
              { label: "Chapter Hub", to: addHpqReturnContext(buildTopicHubUrl(grade, subjectKey, currentTopicKey && currentTopicKey !== "all" ? currentTopicKey : ""), currentURL) },
              { label: "Practice", to: `/practice/${grade}/${subjectKey}${currentTopicKey && currentTopicKey !== "all" ? `?topic=${encodeURIComponent(currentTopicKey)}` : ""}` },
            ]}
          />
        )}

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
              Class {grade} - {subjectKey} - High-Probability Question Patterns
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
              High-Probability Question Patterns
            </h1>
            <p
            style={{
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "hsl(220, 15%, 42%)",
              maxWidth: 760,
              margin: "0 0 6px",
            }}
          >
              The question shapes that recur most on CBSE boards — drawn from 4 years of papers, the official blueprint, and examiner-pattern analysis.
              <br />
              Master these patterns first.
            </p>
            <div
              style={{
                fontSize: "0.76rem",
                color: "hsl(220, 15%, 42%)",
                lineHeight: 1.45,
              }}
            >
              These represent high-probability question patterns to prioritise — not predictions of the exact 2027 paper. Full preparation still matters.
            </div>
            {topicFilter !== "all" ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  borderRadius: 999,
                  padding: "6px 12px",
                  background: "hsl(152, 55%, 95%)",
                  border: "1px solid hsl(152, 45%, 78%)",
                  color: "hsl(152, 60%, 28%)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                }}
              >
                Scoped topic: {topicFilter}
              </div>
            ) : null}
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
                    aria-pressed={active}
                    onClick={() => handleSubjectToggle(subj)}
                    style={{
                      padding: "6px 16px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: "0.8rem",
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                      background: active ? "hsl(152, 55%, 42%)" : "transparent",
                      color: active ? "#ffffff" : "hsl(220, 15%, 42%)",
                      boxShadow: active
                        ? "0 8px 18px rgba(22, 163, 74, 0.22)"
                        : "none",
                      transition: "all 0.15s ease-out",
                    }}
                  >
                    {subj}
                  </button>
                );
              })}
            </div>
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
                  {basket.length} Q · {totalBasketMarks} marks
                </strong>
              </div>
              {basket.length === 0 ? (
                <div
                  style={{
                    maxWidth: 220,
                    textAlign: "right",
                    lineHeight: 1.4,
                  }}
                >
                  Select questions or stacks to build a mock.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                    marginTop: 2,
                  }}
                >
                  <button
                    onClick={handleOpenMockBuilder}
                    style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      border: "1px solid hsl(152, 55%, 45%)",
                      background: "hsl(152, 55%, 45%)",
                      color: "#ffffff",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Build mock
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBasket}
                    style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      border: "1px solid hsl(220, 18%, 82%)",
                      background: "#ffffff",
                      color: "hsl(220, 15%, 42%)",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
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
                Question stacks
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "hsl(220, 15%, 42%)",
                  lineHeight: 1.55,
                }}
              >
                {topicFilter === "all"
                  ? "Showing all predicted questions across all topics."
                  : `Showing predicted questions for ${topicFilter}.`}
              </p>
            </div>

            <div style={{ minWidth: 260, display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                style={{
                  alignSelf: "flex-start",
                  borderRadius: 999,
                  padding: "6px 12px",
                  border: "1px solid hsl(220, 18%, 90%)",
                  background: showAdvancedFilters ? "hsl(152, 55%, 95%)" : "#ffffff",
                  color: showAdvancedFilters ? "hsl(152, 55%, 28%)" : "hsl(220, 25%, 12%)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                {showAdvancedFilters ? "Hide filters" : "Refine predictions"}
              </button>
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
                {topicFilter !== "all" && !topicOptions.includes(topicFilter) ? (
                  <option value={topicFilter}>{topicFilter}</option>
                ) : null}
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showAdvancedFilters && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "1px solid hsl(220, 18%, 90%)",
                display: "grid",
                gap: 10,
              }}
            >
              <FilterRow label="Priority">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "must-crack", label: "Must-crack" },
                    { id: "high-roi", label: "High-ROI" },
                    { id: "good-to-do", label: "Good-to-do" },
                  ] as { id: TierFilter; label: string }[]
                ).map((item) => {
                  const active = tierFilter === item.id;
                  return (
                    <FilterChip
                      key={item.id}
                      active={active}
                      onClick={() => setTierFilter(item.id)}
                    >
                      {item.label}
                    </FilterChip>
                  );
                })}
              </FilterRow>

              <FilterRow label="Focus">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "competency", label: "Competency-heavy" },
                  ] as { id: CompetencyFilter; label: string }[]
                ).map((item) => {
                  const active = competencyFilter === item.id;
                  return (
                    <FilterChip
                      key={item.id}
                      active={active}
                      onClick={() => setCompetencyFilter(item.id)}
                    >
                      {item.label}
                    </FilterChip>
                  );
                })}
              </FilterRow>

              <FilterRow label="Difficulty">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "Easy", label: "Easy" },
                    { id: "Medium", label: "Medium" },
                    { id: "Hard", label: "Hard" },
                  ] as { id: DifficultyFilter; label: string }[]
                ).map((item) => {
                  const active = difficultyFilter === item.id;
                  return (
                    <FilterChip
                      key={item.id}
                      active={active}
                      onClick={() => setDifficultyFilter(item.id)}
                    >
                      {item.label}
                    </FilterChip>
                  );
                })}
              </FilterRow>

              {subjectKey === "Science" && (
                <FilterRow label="Science stream">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "Physics", label: "Physics" },
                      { id: "Chemistry", label: "Chemistry" },
                      { id: "Biology", label: "Biology" },
                    ] as { id: StreamFilterKey; label: string }[]
                  ).map((stream) => {
                    const active = activeStream === stream.id;
                    return (
                      <FilterChip
                        key={stream.id}
                        active={active}
                        onClick={() => handleStreamToggle(stream.id)}
                      >
                        {stream.label}
                      </FilterChip>
                    );
                  })}
                </FilterRow>
              )}

              <div>
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  style={{
                    borderRadius: 999,
                    padding: "4px 10px",
                    border: "1px dashed hsl(220, 18%, 82%)",
                    background: "#ffffff",
                    color: "hsl(220, 15%, 42%)",
                    cursor: "pointer",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                  }}
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
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
            <strong>All priority / All difficulty / All streams / All topics</strong>{" "}
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
                const competencyQuestionCount =
                  bucket.questions.filter(isCompetencyQuestion).length;
                const stackBlurb =
                  tier === "must-crack"
                    ? "High-priority pattern stack for 2027 board revision."
                    : tier === "high-roi"
                      ? "High-value pattern stack for focused 2027 revision."
                      : "Useful pattern stack for completing topic coverage.";
                const isScience =
                  (bucket.subject ?? subjectKey) === "Science";
                const streamLabel =
                  bucket.stream || (isScience ? "General" : undefined);
                const expanded =
                  expandedTopics[bucket.topic] ??
                  (topicFilter !== "all" ? true : index === 0);
                const stackInBasket =
                  bucket.questions.length > 0 &&
                  bucket.questions.every((q) => isInBasket(q.id));

                return (
                  <div
                    key={`${bucket.topic}-${bucket.subject ?? subjectKey}`}
                    style={{
                      borderRadius: 14,
                      padding: "20px",
                      backgroundColor: "#ffffff",
                      border: "1px solid hsl(220, 18%, 90%)",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    {/* Header row */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 14,
                      }}
                    >
                      <div style={{ flex: "1 1 520px", minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <h3
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "1.12rem",
                              fontWeight: 600,
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
                            <span>{tMeta.label}</span>
                          </span>

                          <span
                            style={{
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              backgroundColor: "hsl(210, 33%, 96%)",
                              border: "1px solid hsl(220, 18%, 90%)",
                              color: "hsl(220, 15%, 42%)",
                              fontWeight: 700,
                            }}
                          >
                            {totalQuestions} Q - {totalMarks} marks
                          </span>

                          {competencyQuestionCount > 0 && (
                            <span
                              style={{
                                borderRadius: 999,
                                padding: "4px 10px",
                                fontSize: "0.75rem",
                                backgroundColor: "hsl(43, 90%, 94%)",
                                border: "1px solid hsl(38, 75%, 78%)",
                                color: "hsl(35, 80%, 35%)",
                                fontWeight: 700,
                              }}
                            >
                              {competencyQuestionCount} competency Q
                              {competencyQuestionCount === 1 ? "" : "s"}
                            </span>
                          )}

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
                            margin: "0 0 8px",
                            lineHeight: 1.55,
                            maxWidth: 760,
                          }}
                        >
                          {stackBlurb}
                          {competencyQuestionCount > 0
                            ? ` Includes ${competencyQuestionCount} competency-style question${competencyQuestionCount === 1 ? "" : "s"}.`
                            : ""}
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
                            disabled={stackInBasket}
                            style={{
                              borderRadius: 999,
                              padding: "6px 11px",
                              border:
                                "1px solid hsl(152, 55%, 45%)",
                              background: stackInBasket
                                ? "hsl(152, 55%, 95%)"
                                : "hsl(152, 55%, 45%)",
                              fontSize: "0.75rem",
                              color: stackInBasket ? "hsl(152, 55%, 28%)" : "#ffffff",
                              cursor: stackInBasket ? "default" : "pointer",
                              fontWeight: 700,
                            }}
                          >
                            {stackInBasket ? "Stack in mock" : "Add stack to mock"}
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
                            Revise topic
                          </button>
                        </div>

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
                        const questionOptions = getQuestionOptions(q);
                        const correctOptionLabel = getCorrectOptionLabel(q, questionOptions);
                        const selectedOption = selectedOptions[q.id];
                        const hasOptions = questionOptions.length > 0;
                        const isObjective = isObjectiveQuestion(q, questionOptions);
                        const canCheckAnswer = !isObjective;
                        const solution = solutionData[q.id];
                        const visibleSolutionSteps = getVisibleSolutionSteps(
                          solution,
                          q,
                          correctOptionLabel,
                          isObjective
                        );
                        return (
                        <div
                          key={q.id}
                          style={{
                            borderRadius: 12,
                            padding: "16px",
                            backgroundColor: "#ffffff",
                            border: "1px solid hsl(220, 18%, 90%)",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                          }}
                        >
                          {renderQuestionMetaChips(q)}
                          <div
                            style={{
                              fontSize: "0.95rem",
                              color: "hsl(220, 25%, 12%)",
                              marginBottom: 8,
                              lineHeight: 1.6,
                              fontWeight: 500,
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
                                  <MathText text={q.question || "Assertion–Reason: refer to assertion and reason below."} />
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
                              </div>
                            ) : (
                              <MathText text={q.question} />
                            )}
                          </div>
                          <QuestionVisualAid
                            subject={bucket.subject ?? subjectKey}
                            topicKey={bucket.topic}
                            questionText={q.question}
                            kind={q.type}
                            marks={q.marks}
                          />
                          {hasOptions && (
                            <div
                              style={{
                                marginTop: 10,
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: 8,
                              }}
                            >
                              {questionOptions.map((opt) => {
                                const isSelected = selectedOption === opt.label;
                                const isCorrect = correctOptionLabel === opt.label;
                                const showCorrect = Boolean(selectedOption && isCorrect);
                                const showWrong = Boolean(correctOptionLabel && selectedOption && isSelected && !isCorrect);
                                return (
                                  <button
                                    key={opt.label}
                                    type="button"
                                    onClick={() =>
                                      setSelectedOptions((prev) => ({
                                        ...prev,
                                        [q.id]: opt.label,
                                      }))
                                    }
                                    style={{
                                      minHeight: 42,
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 10,
                                      textAlign: "left",
                                      borderRadius: 10,
                                      border: showCorrect
                                        ? "1px solid hsl(152, 55%, 45%)"
                                        : showWrong
                                          ? "1px solid hsl(0, 70%, 50%)"
                                          : isSelected
                                            ? "1px solid hsl(220, 25%, 12%)"
                                            : "1px solid hsl(220, 18%, 90%)",
                                      background: showCorrect
                                        ? "hsl(152, 55%, 95%)"
                                        : showWrong
                                          ? "hsl(0, 80%, 96%)"
                                          : "#ffffff",
                                      color: "hsl(220, 25%, 12%)",
                                      padding: "9px 11px",
                                      cursor: "pointer",
                                      fontSize: "0.82rem",
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    <span
                                      style={{
                                        minWidth: 24,
                                        height: 24,
                                        borderRadius: 999,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        background: showCorrect
                                          ? "hsl(152, 55%, 45%)"
                                          : showWrong
                                            ? "hsl(0, 70%, 50%)"
                                            : "hsl(210, 33%, 96%)",
                                        color: showCorrect || showWrong ? "#ffffff" : "hsl(220, 15%, 42%)",
                                        fontWeight: 800,
                                        fontSize: "0.72rem",
                                        flexShrink: 0,
                                      }}
                                    >
                                      {opt.label}
                                    </span>
                                    <span style={{ minWidth: 0 }}>
                                      <MathText text={opt.text} />
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {selectedOption && hasOptions && (
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color:
                                  selectedOption === correctOptionLabel
                                    ? "hsl(152, 55%, 30%)"
                                    : "hsl(0, 70%, 42%)",
                              }}
                            >
                              {selectedOption === correctOptionLabel
                                ? "Correct"
                                : correctOptionLabel
                                  ? `Correct answer: ${correctOptionLabel}`
                                  : "Show logic to review the answer"}
                            </div>
                          )}
                          <div
                            style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTop: "1px solid hsl(220, 18%, 90%)",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 10,
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 8,
                                flexWrap: "wrap",
                                alignItems: "center",
                                width: "100%",
                              }}
                            >
                               {canCheckAnswer && (
                                 <button
                                   type="button"
                                  onClick={() => handleToggleAnswerCheck(q.id)}
                                  style={{
                                    borderRadius: 8,
                                    border: "1px solid hsl(152, 55%, 45%)",
                                    padding: "8px 14px",
                                    fontSize: "0.78rem",
                                    background: answerCheckOpen[q.id]
                                      ? "hsl(152, 55%, 95%)"
                                      : "hsl(152, 55%, 45%)",
                                    color: answerCheckOpen[q.id] ? "hsl(152, 55%, 28%)" : "#ffffff",
                                    cursor: "pointer",
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {answerCheckOpen[q.id] ? "Hide check" : "Check my answer"}
                                </button>
                              )}
                              <button
                                onClick={() => handleInlineSolution(bucket, q, "solve")}
                                style={{
                                  borderRadius: 8,
                                  border: "1px solid hsl(220, 18%, 82%)",
                                  padding: "8px 12px",
                                  fontSize: "0.78rem",
                                  background: solutionOpen[q.id]
                                    ? "hsl(152, 55%, 95%)"
                                    : "#ffffff",
                                  color: solutionOpen[q.id] ? "hsl(152, 55%, 28%)" : "hsl(220, 25%, 12%)",
                                  cursor: "pointer",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {solutionOpen[q.id]
                                  ? isObjective
                                    ? "Hide logic"
                                    : "Hide steps"
                                  : isObjective
                                    ? "Show logic"
                                    : "Show steps"}
                              </button>
                              <button
                                onClick={() => handleMoreLikeThisPractice(bucket, q)}
                                style={{
                                  borderRadius: 8,
                                  border: "1px solid hsl(220, 18%, 82%)",
                                  padding: "8px 12px",
                                  fontSize: "0.78rem",
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
                                  borderRadius: 8,
                                  border: isInBasket(q.id)
                                    ? "1px solid hsl(152, 55%, 45%)"
                                    : "1px solid hsl(220, 18%, 82%)",
                                  padding: "8px 12px",
                                  fontSize: "0.78rem",
                                  background: isInBasket(q.id)
                                    ? "hsl(152, 55%, 95%)"
                                    : "#ffffff",
                                  color: isInBasket(q.id) ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
                                  cursor: isInBasket(q.id) ? "default" : "pointer",
                                  opacity: isInBasket(q.id) ? 0.95 : 0.9,
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {isInBasket(q.id) ? "In mock" : "Add to mock"}
                              </button>
                            </div>

                            {answerCheckOpen[q.id] && canCheckAnswer && (
                              <div
                                style={{
                                  width: "100%",
                                  marginTop: 10,
                                }}
                              >
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

                            {solutionOpen[q.id] && (
                              <div
                                style={{
                                  marginTop: 10,
                                  width: "100%",
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
                                    {isObjective ? "Solution logic" : "Solution steps"}
                                    {solution && !isObjective && (
                                      <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
                                        ({solution.totalMarks} marks)
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
                                    {isObjective ? "Loading solution logic..." : "Loading step-by-step solution..."}
                                  </div>
                                )}

                                {solutionError[q.id] && (
                                  <div style={{ fontSize: "0.82rem", color: "#ef4444", padding: "8px 0" }}>
                                    {getSolutionUnavailableCopy(isObjective)}
                                  </div>
                                )}

                                {solution && (
                                  <div>
                                    {isObjective && visibleSolutionSteps.length === 0 && (
                                      <div
                                        style={{
                                          marginBottom: 8,
                                          padding: "10px 12px",
                                          background: "#ffffff",
                                          borderRadius: 10,
                                          border: "1px solid hsl(220, 18%, 90%)",
                                          fontSize: "0.78rem",
                                          color: "hsl(220, 15%, 42%)",
                                          lineHeight: 1.5,
                                        }}
                                      >
                                        Correct answer shown above. Use Revise topic for the concept explanation.
                                      </div>
                                    )}
                                    {visibleSolutionSteps.map((step, index) => (
                                      <div
                                        key={`${step.stepNumber}-${index}`}
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
                                          {index + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          {isObjective ? (
                                            <div
                                              style={{
                                                fontSize: "0.78rem",
                                                color: "hsl(220, 15%, 42%)",
                                                lineHeight: 1.5,
                                              }}
                                            >
                                              <MathText text={step.working} />
                                            </div>
                                          ) : (
                                            <>
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
                                                  {step.marks === 0 ? "Explanation" : step.marks === 0.5 ? "1/2 mark" : step.marks % 1 === 0.5 ? `${Math.floor(step.marks)} 1/2 marks` : `${step.marks} ${step.marks === 1 ? "mark" : "marks"}`}
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
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}

                                    {!isObjective && solution.commonMistakes &&
                                      solution.commonMistakes.length > 0 && (
                                        <div
                                          style={{
                                            marginTop: 8,
                                            padding: "8px 10px",
                                            background: "#ffffff",
                                            borderRadius: 10,
                                            border: "1px solid hsl(220, 18%, 90%)",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontSize: "0.75rem",
                                              fontWeight: 700,
                                              color: "hsl(220, 15%, 42%)",
                                              marginBottom: 4,
                                            }}
                                          >
                                            Examiner notes
                                          </div>
                                          {solution.commonMistakes.map(
                                            (m, i) => (
                                              <div
                                                key={i}
                                                style={{
                                                  fontSize: "0.75rem",
                                                  color: "hsl(220, 15%, 42%)",
                                                  marginBottom: 2,
                                                }}
                                              >
                                                • {m}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}

                                    {!isObjective && solution.examTip && (
                                      <div
                                        style={{
                                          marginTop: 8,
                                          padding: "8px 10px",
                                          background: "#ffffff",
                                          borderRadius: 10,
                                          border: "1px solid hsl(220, 18%, 90%)",
                                          fontSize: "0.75rem",
                                          color: "hsl(220, 15%, 42%)",
                                        }}
                                      >
                                        <strong>Marking note:</strong>{" "}
                                        {solution.examTip}
                                      </div>
                                    )}

                                    <button
                                      onClick={() => handleOpenTopicHubFromBucket(bucket)}
                                      style={{
                                        marginTop: 10,
                                        padding: 0,
                                        border: "none",
                                        background: "transparent",
                                        color: "hsl(215, 65%, 32%)",
                                        fontSize: "0.78rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        textDecoration: "underline",
                                        textUnderlineOffset: 3,
                                      }}
                                    >
                                      Revise this topic in Topic Hub
                                    </button>
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
    </div>
  );
};

export default HighlyProbableQuestions;
