// src/pages/PracticePage.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { usePracticeLimit } from "../components/auth/PracticeLimitGate";

import { type PracticeQuestion } from "../data/predictionDataService";
import {
  resolveTopicDisplayName,
  resolveTopicKey as resolveCanonicalTopicKey,
} from "../utils/topicResolver";
import { fetchStepSolution, type StepSolutionResponse } from "../ai/aiClient";
import { lazy, Suspense } from "react";
import type { ConceptTeachContext } from "../components/tutor/ConceptTeachDrawer";
const ConceptTeachDrawer = lazy(() => import("../components/tutor/ConceptTeachDrawer"));
import type { PracticeSectionFilter } from "../navigation/practiceNavigation";

const COUNT_SOFT_MAX = 50;
const mapEngineMarks = (ui: string): number | undefined => {
  if (ui === "1") return 1;
  if (ui === "5") return 5;
  if (ui === "4") return 4;
  return undefined;
};
const navMarksToUi = (n: number | undefined): string => {
  if (n === 1) return "1";
  if (n === 5) return "5";
  if (n === 4) return "4";
  if (n === 2 || n === 3) return "23";
  return "all";
};
const uiMarksToSectionScope = (ui: string): "A" | "B" | "C" | "D" | "E" | "All" => {
  if (ui === "1") return "A";
  if (ui === "5") return "D";
  if (ui === "4") return "E";
  return "All";
};
import {
  getQuestionFamiliesForTopic,
  getQuestionMeta,
  getStrategyPackForTopic,
  isStrategyEnabledForTopic,
  resolveCanonicalTopicForStrategy,
} from "../services/questionTypeFirstResolver";
import { trackUxEvent } from "../services/uxTelemetry";
import {
  computeAdaptiveDifficultyMix,
  getWrongConceptsForTopic,
} from "../services/adaptivePracticeEngine";
import type {
  QuestionFamilyOverlay,
} from "../data/contentStrategy/types";
import type { StudentMentorIntent } from "../types/studentMentorIntent";
import { recordDetour } from "../services/guidedJourneyService";
import { useAuth } from "../context/AuthContext";
import {
  type SubjectKey,
  type DifficultyChoice,
  type QuestionStrategyDetails,
  MIN_QUESTION_COUNT,
  MAX_QUESTION_COUNT,
  deriveMentorDefaultIntent,
  buildStrategyContextHeader,
  buildRubricContextHeader,
  resolvePracticePackKey,
  buildPracticeQuestionsWithAiTopup,
  normaliseSubject,
  parseDifficultyChoice,
  parsePositiveInt,
  parseFocusBankIds,
  parseBooleanFlag,
} from "../components/practice/practiceQuestionBuilder";
import { MentorSolveDrawer } from "../components/practice/MentorSolveDrawer";
import { PracticeControls } from "../components/practice/PracticeControls";
import { PracticeHero } from "../components/practice/PracticeHero";
import { WhyThisQuestionPanel } from "../components/practice/WhyThisQuestionPanel";
import { PracticeQuestionList } from "../components/practice/PracticeQuestionList";
import { downloadWorksheet } from "../components/practice/worksheetGenerator";

const QTYPE_FIRST_TRIG = import.meta.env.VITE_QTYPE_FIRST_TRIGONOMETRY === "true";

interface PracticeNavState {
  subjectKey?: string;
  subject?: string;
  subjectTitle?: string;
  back?: string;
  backLabel?: string;
  topicKey?: string;
  sectionFilter?: string;
  practiceFilters?: {
    subtopicHint?: string;
    focusBankIds?: string[];
    strictFocus?: boolean;
    recommendedCount?: number;
    difficultyPreset?: DifficultyChoice;
    marksFilter?: number;
  };
}

const FIRST_PRACTICE_KEY = "lazytopper.first_practice_tracked";

const PracticePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ grade?: string; subject?: string }>();
  const { recordQuestionAnswered } = usePracticeLimit();
  const { user: authUserForJourney } = useAuth();

  useEffect(() => {
    try {
      const tracked = localStorage.getItem(FIRST_PRACTICE_KEY);
      if (!tracked) {
        trackUxEvent("first_practice_start", "practice", {});
        localStorage.setItem(FIRST_PRACTICE_KEY, "started");
      }
    } catch {}
  }, []);

  const grade = params.grade || "10";
  const subjectKey: SubjectKey = normaliseSubject(params.subject ?? "Maths");

  const qp = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const rawTopicParam = qp.get("topic") || "";
  const topicParam = rawTopicParam && rawTopicParam.toLowerCase() !== "generic"
    ? rawTopicParam
    : (subjectKey === "Science" ? "chemical-reactions-and-equations" : "real-numbers");
  const topicKeyParam = qp.get("topicKey");
  const journeyMentorMode = String(qp.get("journeyMentor") || "").trim().toLowerCase();
  const isTargetedSession = qp.get("targeted") === "1";
  const targetMistakeType = qp.get("targetMistakeType") || "";

  const navState = (location.state as PracticeNavState) || {};

  const subjectKeyStr = String(navState.subjectKey ?? navState.subject ?? subjectKey ?? "").toLowerCase();
  const subjectTitle = String(
    navState.subjectTitle ||
    (subjectKeyStr.includes("math") ? "Maths" :
     subjectKeyStr.includes("sci")  ? "Science" :
     (subjectKeyStr ? subjectKeyStr.charAt(0).toUpperCase() + subjectKeyStr.slice(1) : "Subject"))
  );
  const back: string | undefined = navState.back;
  const qpSource = qp.get("source");
  const safeReturnTo = useMemo(() => {
    const rawReturnTo = qp.get("returnTo");
    if (!rawReturnTo) return null;
    let decoded = rawReturnTo;
    try {
      decoded = decodeURIComponent(rawReturnTo);
    } catch {
      decoded = rawReturnTo;
    }
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return null;
    return decoded;
  }, [qp]);
  const practiceBackTo = useMemo(() => {
    if (safeReturnTo) return safeReturnTo;
    if (back && typeof back === "string") return back;
    if (qpSource === "trends") return "/exam-trends";
    return "/practice-hub";
  }, [safeReturnTo, back, qpSource]);
  const backLabel: string =
    navState.backLabel ||
    (practiceBackTo.includes("/practice-hub")
      ? "Back to Practice"
      : practiceBackTo.includes("/exam-trends") || practiceBackTo.includes("/trends")
      ? "Back to trends"
      : "Back");

  const practiceFilters = navState.practiceFilters || {};

  const initialPracticeDefaults = useMemo(() => {
    const navSubtopicHint = String(practiceFilters.subtopicHint || "").trim() || undefined;
    const navFocusBankIds = Array.isArray(practiceFilters.focusBankIds)
      ? practiceFilters.focusBankIds.map((id) => String(id || "").trim()).filter(Boolean)
      : undefined;
    const navStrictFocus = Boolean(practiceFilters.strictFocus);
    const navRecommendedCount = parsePositiveInt(practiceFilters.recommendedCount);
    const navDifficultyPreset = parseDifficultyChoice(practiceFilters.difficultyPreset);
    const navMarksFilter = typeof practiceFilters.marksFilter === "number" ? practiceFilters.marksFilter : undefined;

    const querySubtopicHint = String(qp.get("subtopicHint") || "").trim() || undefined;
    const queryFocusBankIds = parseFocusBankIds(qp.get("focusBankIds"));
    const queryStrictFocus = parseBooleanFlag(qp.get("strictFocus"));
    const queryRecommendedCount = parsePositiveInt(qp.get("count"));
    const queryDifficultyPreset = parseDifficultyChoice(qp.get("difficulty"));

    const recommendedCount = queryRecommendedCount ?? navRecommendedCount ?? 10;
    const clampedCount = Math.max(
      MIN_QUESTION_COUNT,
      Math.min(COUNT_SOFT_MAX, Math.min(MAX_QUESTION_COUNT, recommendedCount))
    );

    const queryMarks = qp.get("marks");
    const queryStyle = qp.get("style");
    const querySource = qp.get("source");
    const queryDiff = qp.get("diff");
    const marksUi = queryMarks && ["all", "1", "23", "5", "4"].includes(queryMarks)
      ? queryMarks
      : navMarksFilter !== undefined ? navMarksToUi(navMarksFilter) : "all";
    const styleUi = queryStyle && ["all", "proof", "ar", "hots", "case"].includes(queryStyle)
      ? queryStyle
      : "all";
    const sourceUi = querySource && ["all", "pyq", "ncert", "others"].includes(querySource)
      ? querySource
      : "all";
    const diffUi = queryDiff && ["all", "Easy", "Medium", "Hard"].includes(queryDiff)
      ? queryDiff
      : navDifficultyPreset && navDifficultyPreset !== "All" ? navDifficultyPreset : "all";

    return {
      subtopicHint: querySubtopicHint ?? navSubtopicHint,
      focusBankIds: queryFocusBankIds ?? navFocusBankIds,
      strictFocus: queryStrictFocus ?? navStrictFocus ?? false,
      recommendedCount: clampedCount,
      difficultyPreset: queryDifficultyPreset ?? navDifficultyPreset ?? "All",
      marksUi,
      styleUi,
      sourceUi,
      diffUi,
    };
  }, [practiceFilters, qp]);

  const didInitFromUrlRef = useRef(false);
  const didAutoOpenJourneyMentorRef = useRef(false);

  const [subtopicHint, setSubtopicHint] = useState<string | undefined>(
    () => initialPracticeDefaults.subtopicHint
  );
  const [focusBankIds, setFocusBankIds] = useState<string[] | undefined>(
    () => initialPracticeDefaults.focusBankIds
  );
  const [strictFocus, setStrictFocus] = useState<boolean>(
    () => Boolean(initialPracticeDefaults.strictFocus)
  );
  const [questionCount, setQuestionCount] = useState<number>(
    () => initialPracticeDefaults.recommendedCount
  );
  const [difficulty, setDifficulty] = useState<DifficultyChoice>(
    () => initialPracticeDefaults.difficultyPreset
  );
  // Pending state — drives chip UI and the live "N available" hint.
  const [pendingMarks, setPendingMarks] = useState<string>(
    () => initialPracticeDefaults.marksUi
  );
  const [pendingStyle, setPendingStyle] = useState<string>(
    () => initialPracticeDefaults.styleUi
  );
  const [pendingSource, setPendingSource] = useState<string>(
    () => initialPracticeDefaults.sourceUi
  );
  const [pendingDifficulty, setPendingDifficulty] = useState<string>(
    () => initialPracticeDefaults.diffUi
  );
  // Committed state — drives the visible question list (and engine fetch deps).
  const [committedMarks, setCommittedMarks] = useState<string>(
    () => initialPracticeDefaults.marksUi
  );
  const [committedStyle, setCommittedStyle] = useState<string>(
    () => initialPracticeDefaults.styleUi
  );
  const [committedSource, setCommittedSource] = useState<string>(
    () => initialPracticeDefaults.sourceUi
  );
  const [committedDifficulty, setCommittedDifficulty] = useState<string>(
    () => initialPracticeDefaults.diffUi
  );
  const [committedCount, setCommittedCount] = useState<number>(
    () => initialPracticeDefaults.recommendedCount
  );
  const [isBuilt, setIsBuilt] = useState<boolean>(false);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);

  useEffect(() => {
    if (didInitFromUrlRef.current) return;
    setSubtopicHint(initialPracticeDefaults.subtopicHint);
    setFocusBankIds(initialPracticeDefaults.focusBankIds);
    setStrictFocus(Boolean(initialPracticeDefaults.strictFocus));
    setQuestionCount(initialPracticeDefaults.recommendedCount);
    setDifficulty(initialPracticeDefaults.difficultyPreset);
    setPendingMarks(initialPracticeDefaults.marksUi);
    setPendingStyle(initialPracticeDefaults.styleUi);
    setPendingSource(initialPracticeDefaults.sourceUi);
    setPendingDifficulty(initialPracticeDefaults.diffUi);
    setCommittedMarks(initialPracticeDefaults.marksUi);
    setCommittedStyle(initialPracticeDefaults.styleUi);
    setCommittedSource(initialPracticeDefaults.sourceUi);
    setCommittedDifficulty(initialPracticeDefaults.diffUi);
    setCommittedCount(initialPracticeDefaults.recommendedCount);
    didInitFromUrlRef.current = true;
  }, [initialPracticeDefaults]);

  const engineMarksFilter = useMemo(() => mapEngineMarks(committedMarks), [committedMarks]);

  const matchesFilters = useCallback(
    (q: PracticeQuestion, marks: string, style: string, source: string, diff: string) => {
      if (marks !== "all") {
        const section = String((q as { section?: unknown }).section ?? "").toUpperCase();
        const m = Number((q as { marks?: unknown }).marks ?? 0);
        const fmt = String((q as { format?: unknown }).format ?? "").toLowerCase();
        const is1mk = section === "A" || m === 1 || fmt === "mcq" ||
          fmt.includes("assertion") || fmt === "ar";
        const is23mk = section === "B" || section === "C" || m === 2 || m === 3 ||
          fmt === "short" || fmt === "vsa";
        const is5mk = section === "D" || m === 5 || fmt === "long";
        const is4mk = section === "E" || m === 4 || fmt.includes("case");
        if (marks === "1" && !is1mk) return false;
        if (marks === "23" && !is23mk) return false;
        if (marks === "5" && !is5mk) return false;
        if (marks === "4" && !is4mk) return false;
      }

      if (style !== "all") {
        const fmt = String((q as { format?: unknown }).format ?? "").toLowerCase();
        const id = String((q as { id?: unknown }).id ?? "");
        const sub = String((q as { subtopic?: unknown }).subtopic ?? "").toLowerCase();
        const qtext = String((q as { questionText?: unknown }).questionText ?? "")
          .toLowerCase().slice(0, 80);
        const section = String((q as { section?: unknown }).section ?? "");
        const bloom = String((q as { bloomSkill?: unknown }).bloomSkill ?? "");

        if (style === "proof") {
          // ISSUE-007 fix: Section A is never a Proof question.
          if (section === "A") return false;
          const isProof =
            /prf/i.test(id) ||
            /^prove\s+that|^show\s+that|^derive\s/i.test(qtext) ||
            /proof|identit|tangent.propert/i.test(sub) ||
            (fmt.includes("long") && bloom === "Analysing" &&
             (section === "C" || section === "D"));
          if (!isProof) return false;
        }
        if (style === "ar" &&
            !fmt.includes("assertion") && !fmt.includes("ar")) return false;
        if (style === "hots") {
          const d = String((q as { difficulty?: unknown }).difficulty ?? "");
          const isHots = d === "Hard" || bloom === "Analysing" || bloom === "Evaluating";
          if (!isHots) return false;
        }
        if (style === "case" &&
            !fmt.includes("case") && section !== "E") return false;
      }

      if (source !== "all") {
        const qid = String((q as { id?: unknown }).id ?? "").toLowerCase();
        const pyqYear = (q as { pyqYear?: unknown }).pyqYear;
        const isPYQ = Boolean(pyqYear) ||
          Boolean((q as { isPYQ?: unknown }).isPYQ);

        if (source === "pyq" && !isPYQ) return false;

        if (source === "ncert") {
          if (isPYQ) return false;
          const isNcertExemplar =
            /^(rn-n-|poly-n-|ple-n-|qe-n-|ap-n-|tri-n-|cg-n-|trig-n-|circ-n-|arc-n-|sav-n-|stat-n-|prob-n-)/.test(qid) ||
            /ncert|exemplar/.test(qid) ||
            /-exmplr-|-ncert-/.test(qid);
          if (!isNcertExemplar) return false;
        }

        if (source === "others") {
          if (isPYQ) return false;
          // H3-bug fix: also exclude -EXEM- IDs (e.g. POLY-N-EXEM-2-MCQ-001),
          // which contain neither "ncert" nor "exemplar" as substrings but are
          // caught by the NCERT prefix regex above — without this they would
          // appear in BOTH the NCERT and Others filters.
          const isNcertSource = /ncert|exemplar|-exmplr-|-ncert-|-exem-/.test(qid);
          if (isNcertSource) return false;
        }
      }

      if (diff !== "all") {
        const d = String((q as { difficulty?: unknown }).difficulty ?? "");
        if (d !== diff) return false;
      }

      return true;
    },
    []
  );

  const filteredQuestions = useMemo(() => {
    if (!isBuilt) return [];
    if (!questions || questions.length === 0) return [];
    return questions.filter((q) =>
      matchesFilters(q, committedMarks, committedStyle, committedSource, committedDifficulty)
    );
  }, [questions, isBuilt, committedMarks, committedStyle, committedSource, committedDifficulty, matchesFilters]);

  const availableCount = useMemo(() => {
    if (!questions || questions.length === 0) return 0;
    return questions.filter((q) =>
      matchesFilters(q, pendingMarks, pendingStyle, pendingSource, pendingDifficulty)
    ).length;
  }, [questions, pendingMarks, pendingStyle, pendingSource, pendingDifficulty, matchesFilters]);

  const handleSetStyle = useCallback((v: string) => {
    setPendingStyle(v);
    if (v === "hots") {
      setPendingDifficulty("Hard");
    } else if (pendingStyle === "hots" && v !== "hots") {
      setPendingDifficulty("all");
    }
  }, [pendingStyle]);

  const handleClearFilters = useCallback(() => {
    setPendingMarks("all");
    setPendingStyle("all");
    setPendingSource("all");
    setPendingDifficulty("all");
    setQuestionCount(10);
  }, []);

  const handleEditFilters = useCallback(() => {
    setIsBuilt(false);
    setPendingMarks(committedMarks);
    setPendingStyle(committedStyle);
    setPendingSource(committedSource);
    setPendingDifficulty(committedDifficulty);
    setQuestionCount(committedCount);
  }, [committedMarks, committedStyle, committedSource, committedDifficulty, committedCount]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedAnswers, setExpandedAnswers] = useState<
    Record<string, boolean>
  >({});
  const [regenerationKey, setRegenerationKey] = useState<number>(0);
  const previousQuestionKeys = useRef<Set<string>>(new Set());
  const [selfAssessments, setSelfAssessments] = useState<Record<string, "got_it" | "need_practice">>({});
  const [mcqSelections, setMcqSelections] = useState<Record<string, number>>({});
  const [mcqResults, setMcqResults] = useState<Record<string, "correct" | "wrong">>({});
  const [practiceSolutionData, setPracticeSolutionData] = useState<Record<string, StepSolutionResponse>>({});
  const [practiceSolutionLoading, setPracticeSolutionLoading] = useState<Record<string, boolean>>({});
  const [practiceSolutionError, setPracticeSolutionError] = useState<Record<string, string | undefined>>({});

  const [conceptDrawerOpen, setConceptDrawerOpen] = useState(false);
  const [conceptDrawerContext, setConceptDrawerContext] = useState<ConceptTeachContext | null>(null);

  const openConceptDrawer = (q: PracticeQuestion) => {
    setConceptDrawerContext({
      topicKey: q.topicKey || canonicalTopicKey || topicParam,
      subject: subjectKey,
      questionText: q.questionText,
      marks: q.marks,
      subtopic: q.subtopic,
    });
    setConceptDrawerOpen(true);
  };

// Practice Mentor Drawer (Solve With Me / Board Steps)
const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
const [mentorSolveStyle, setMentorSolveStyle] = useState<"socratic" | "board">("socratic");
const [mentorSeedExample, setMentorSeedExample] = useState<{
  title: string;
  questionId: string;
  question: string;
  marks?: number;
  section?: string;
  defaultIntent?: StudentMentorIntent;
  strategyContextHeader?: string;
  rubricContextHeader?: string;
  questionFamilyId?: string;
  questionFamilyLabel?: string;
  questionTypeId?: string;
  chapterStep?: string;
  practiceSectionFilter?: PracticeSectionFilter;
  suggestedPracticeIds?: string[];
  theoremFocus?: string[];
  recommendedDiagramType?: string;
} | null>(null);


  const canonicalTopicKey = useMemo(() => {
  const explicitFromState = navState.topicKey;
  return resolveCanonicalTopicKey({
    subjectKey: String(subjectKey).toLowerCase(),
    topicParam,
    topicKey: topicKeyParam || explicitFromState || null,
  });
}, [subjectKey, topicParam, topicKeyParam, navState]);

  const strategyTopicSeed = useMemo(() => {
    const explicitFromState = navState.topicKey;
    return canonicalTopicKey || topicKeyParam || explicitFromState || topicParam || "";
  }, [canonicalTopicKey, topicKeyParam, navState, topicParam]);
  const strategyCanonicalTopicKey = useMemo(
    () => resolveCanonicalTopicForStrategy(strategyTopicSeed),
    [strategyTopicSeed]
  );
  const isWhyThisQuestionEnabled =
    QTYPE_FIRST_TRIG && isStrategyEnabledForTopic(strategyCanonicalTopicKey);
  const strategyPack = useMemo(() => {
    if (!isWhyThisQuestionEnabled) return null;
    return getStrategyPackForTopic(strategyCanonicalTopicKey);
  }, [isWhyThisQuestionEnabled, strategyCanonicalTopicKey]);

  const getQuestionStrategyDetails = useCallback(
    (question: PracticeQuestion | null): QuestionStrategyDetails | null => {
      if (!isWhyThisQuestionEnabled || !strategyPack || !question) return null;
      const meta = getQuestionMeta(String(question.id), strategyCanonicalTopicKey);
      if (!meta) return null;
      const loSet = new Set(meta.loIds || []);
      const learningObjects = strategyPack.learningObjects.filter((lo) => loSet.has(lo.loId));
      const mistakes: string[] = [];
      if (Array.isArray(meta.mistakeTags)) {
        mistakes.push(...meta.mistakeTags.map((m) => String(m).trim()).filter(Boolean));
      }
      for (const lo of learningObjects) {
        if (!Array.isArray(lo.commonMistakes)) continue;
        mistakes.push(...lo.commonMistakes.map((m) => String(m).trim()).filter(Boolean));
      }
      const commonMistakes = Array.from(new Set(mistakes)).slice(0, 3);
      const boardWritingTip =
        learningObjects
          .map((lo) => String(lo.boardWritingTip || "").trim())
          .find(Boolean) || "";
      return {
        meta,
        learningObjects,
        commonMistakes,
        boardWritingTip,
      };
    },
    [isWhyThisQuestionEnabled, strategyPack, strategyCanonicalTopicKey]
  );
  const strategyFamilies = useMemo(
    () => getQuestionFamiliesForTopic(strategyCanonicalTopicKey),
    [strategyCanonicalTopicKey]
  );
  const resolveQuestionFamily = useCallback(
    (question: PracticeQuestion | null, details: QuestionStrategyDetails | null): QuestionFamilyOverlay | null => {
      if (!question || strategyFamilies.length === 0) return null;
      const questionId = String(question.id || "").trim();
      if (!questionId) return null;

      const exactFocusMatch =
        strategyFamilies.find((family) =>
          Array.isArray(family.focusBankIds) &&
          family.focusBankIds.map((id) => String(id || "").trim()).includes(questionId)
        ) || null;
      if (exactFocusMatch) return exactFocusMatch;

      const skillFamily = String(details?.meta.skillFamily || "").trim().toLowerCase();
      if (skillFamily) {
        const bySkill =
          strategyFamilies.find(
            (family) => String(family.skillFamily || "").trim().toLowerCase() === skillFamily
          ) || null;
        if (bySkill) return bySkill;
      }

      if (/proof/i.test(skillFamily)) {
        return (
          strategyFamilies.find((family) => family.familyId === "TRI_FAMILY_PROOF_STRUCTURE") ||
          null
        );
      }
      return null;
    },
    [strategyFamilies]
  );

  // Two topic identifiers are used:
  // - topicLabel: display name used by the canonical bank (e.g., "Real Numbers")
  // - packTopicKey: snake_case key used by Prompt-D packs (e.g., "real_numbers")
  const topicLabel = useMemo(() => {
    if (canonicalTopicKey && canonicalTopicKey.toLowerCase() !== "generic") {
      return resolveTopicDisplayName(subjectKey, canonicalTopicKey);
    }
    if (!topicParam || topicParam.toLowerCase() === "generic") return topicParam;
    return resolveTopicDisplayName(subjectKey, canonicalTopicKey || topicParam);
  }, [subjectKey, canonicalTopicKey, topicParam]);

  useEffect(() => {
    const slug = canonicalTopicKey || topicParam;
    if (slug && slug.toLowerCase() !== "generic") {
      recordDetour(slug, topicLabel || slug, authUserForJourney?.uid);
    }
  }, [canonicalTopicKey, topicParam, topicLabel, authUserForJourney?.uid]);

const packTopicKey = useMemo(() => {
  const explicitFromState = navState.topicKey;
  return resolvePracticePackKey({
    subjectKey,
    topicParam,
    explicitTopicKey: topicKeyParam || explicitFromState || null,
  });
}, [subjectKey, topicParam, topicKeyParam, navState]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      if (activeQuestionId !== null) setActiveQuestionId(null);
      return;
    }
    if (
      activeQuestionId &&
      filteredQuestions.some((q) => String(q.id) === String(activeQuestionId))
    ) {
      return;
    }
    setActiveQuestionId(String(filteredQuestions[0].id));
  }, [filteredQuestions, activeQuestionId]);

  useEffect(() => {
    // PR-K2H-8e: clear exclusion set when filter changes so the
    // new filter cohort is not immediately excluded.
    previousQuestionKeys.current = new Set<string>();

    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("__timeout__")), 15000)
      );

      try {
        const adaptiveMix = difficulty === "All"
          ? computeAdaptiveDifficultyMix(canonicalTopicKey || topicParam)
          : undefined;
        const wrongConcepts = adaptiveMix
          ? getWrongConceptsForTopic(canonicalTopicKey || topicParam)
          : [];
        const priorityConceptKeys = wrongConcepts.length > 0
          ? wrongConcepts.map((e) => e.conceptKey)
          : undefined;

        const next = await Promise.race([
          buildPracticeQuestionsWithAiTopup({
            grade,
            subjectKey,
            topicLabel,
            packTopicKey,
            count: questionCount,
            difficulty,
            subtopicHint,
            focusBankIds,
            strictFocus,
            adaptiveMix,
            priorityConceptKeys,
            marksFilter: engineMarksFilter,
            pyqOnly: committedSource === "pyq" || undefined,
            excludeKeys: previousQuestionKeys.current.size > 0 ? previousQuestionKeys.current : undefined,
          }),
          timeout,
        ]);

        if (!cancelled) {
          setQuestions(next);
          setExpandedAnswers({});
          setSelfAssessments({});
          setMcqSelections({});
          setMcqResults({});
          setPracticeSolutionData({});
          setPracticeSolutionLoading({});
          setPracticeSolutionError({});
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "";
        console.error("Error generating practice questions:", err);
        if (!cancelled) {
          setQuestions([]);
          setPracticeSolutionData({});
          setPracticeSolutionLoading({});
          setPracticeSolutionError({});
          setError(
            errMsg === "__timeout__"
              ? "Loading took too long. Please try again or pick a different topic."
              : "Could not generate practice questions right now. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    grade,
    subjectKey,
    topicLabel,
    packTopicKey,
    questionCount,
    difficulty,
    subtopicHint,
    focusBankIds,
    strictFocus,
    engineMarksFilter,
    committedSource,
    regenerationKey,
  ]);

  useEffect(() => {
    previousQuestionKeys.current.clear();
  }, [topicParam, subjectKey]);

  const regenerateQuestions = () => {
    for (const q of questions) {
      const key = String(q.questionText || "").trim().toLowerCase().slice(0, 120);
      if (key) previousQuestionKeys.current.add(key);
    }
    setRegenerationKey((prev) => prev + 1);
  };

  const handleDownloadWorksheet = async () => {
    const scope = uiMarksToSectionScope(committedMarks);
    await downloadWorksheet({
      topicLabel: topicLabel || topicParam,
      subjectKey,
      grade,
      difficulty,
      sectionFilter: scope === "All" ? "All" : [scope],
      questions: filteredQuestions,
    });
  };

  const [linkCopied, setLinkCopied] = useState(false);
  const linkCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
    };
  }, []);

  const handleCopyLink = useCallback(() => {
    const ids = filteredQuestions.map((q) => String(q.id)).filter(Boolean);
    if (ids.length === 0) return;

    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    params.set("topic", topicParam);
    if (difficulty !== "All") params.set("difficulty", difficulty);
    if (committedMarks !== "all") params.set("marks", committedMarks);
    if (committedStyle !== "all") params.set("style", committedStyle);
    if (committedSource !== "all") params.set("source", committedSource);
    if (committedDifficulty !== "all") params.set("diff", committedDifficulty);
    params.set("count", String(ids.length));
    params.set("focusBankIds", ids.join(","));
    params.set("strictFocus", "true");

    const url = `${base}?${params.toString()}`;

    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
      linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2500);
    }).catch(() => {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setLinkCopied(true);
        if (linkCopiedTimerRef.current) clearTimeout(linkCopiedTimerRef.current);
        linkCopiedTimerRef.current = setTimeout(() => setLinkCopied(false), 2500);
      } catch {}
    });
  }, [filteredQuestions, topicParam, difficulty, committedMarks, committedStyle, committedSource, committedDifficulty]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        regenerateQuestions();
        return;
      }
      const presetMap: Record<string, number> = {
        "1": 10,
        "2": 20,
        "3": 40,
        "4": 60,
        "5": 100,
      };
      const next = presetMap[event.key];
      if (!next) return;
      event.preventDefault();
      setQuestionCount(Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, next)));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleToggleAnswer = async (id: string, q?: PracticeQuestion) => {
    const willOpen = !expandedAnswers[id];
    setExpandedAnswers((prev) => ({
      ...prev,
      [id]: willOpen,
    }));

    if (willOpen && q && !practiceSolutionData[id] && !practiceSolutionLoading[id]) {
      setPracticeSolutionLoading((prev) => ({ ...prev, [id]: true }));
      setPracticeSolutionError((prev) => ({ ...prev, [id]: undefined }));
      try {
        const result = await fetchStepSolution({
          subject: subjectKey,
          topic: topicParam || "",
          question: q.questionText,
          marks: q.marks || 1,
          type: q.format || "",
          section: q.section || "",
          answer: q.answer || "",
          explanation: q.explanation || "",
          solutionSteps: q.solutionSteps?.length ? q.solutionSteps : undefined,
          finalAnswer: q.finalAnswer || undefined,
        });
        setPracticeSolutionData((prev) => ({ ...prev, [id]: result }));
      } catch {
        setPracticeSolutionError((prev) => ({
          ...prev,
          [id]: "Solution steps are unavailable right now. You can still check your work or try again.",
        }));
      } finally {
        setPracticeSolutionLoading((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

  const openMentorForQuestion = useCallback(
    (
      q: PracticeQuestion,
      idx: number,
      entryMode: "auto" | "hint" | "check_cbse",
      trigger?: EventTarget | null
    ) => {
      const strategyDetails = getQuestionStrategyDetails(q);
      const family = resolveQuestionFamily(q, strategyDetails);
      const autoIntent = deriveMentorDefaultIntent(strategyDetails?.meta || null);
      const defaultIntent =
        entryMode === "auto"
          ? autoIntent
          : entryMode === "check_cbse"
            ? "check_cbse"
            : "hint";
      setMentorSeedExample({
        title: `Q${idx + 1}`,
        questionId: String(q.id),
        question: String(q.questionText || ""),
        marks: Number(q.marks) || undefined,
        section: String(q.section || ""),
        defaultIntent,
        strategyContextHeader: buildStrategyContextHeader(strategyDetails),
        rubricContextHeader: buildRubricContextHeader(
          strategyDetails,
          defaultIntent,
          strategyCanonicalTopicKey
        ),
        questionFamilyId: family?.familyId,
        questionFamilyLabel: family?.studentLabel || strategyDetails?.meta.skillFamily,
        questionTypeId: family?.qtypeId,
        chapterStep: family?.tutorNodeId || undefined,
        practiceSectionFilter:
          family?.sectionFilter ||
          ((String(q.section || "").toUpperCase() as PracticeSectionFilter | "") || undefined),
        suggestedPracticeIds: family?.focusBankIds,
        theoremFocus: family ? [family.theoremFamily, family.skillFamily] : undefined,
        recommendedDiagramType: family?.recommendedDiagramType,
      });
      setMentorSolveStyle(defaultIntent === "check_cbse" ? "board" : "socratic");
      setMentorDrawerOpen(true);
      if (trigger instanceof HTMLElement) {
        const detailsEl = trigger.closest("details");
        if (detailsEl instanceof HTMLDetailsElement) {
          detailsEl.open = false;
        }
      }
    },
    [getQuestionStrategyDetails, resolveQuestionFamily, strategyCanonicalTopicKey]
  );

  useEffect(() => {
    if (didAutoOpenJourneyMentorRef.current) return;
    if (!journeyMentorMode || filteredQuestions.length === 0) return;
    const firstQuestion = filteredQuestions[0];
    const entryMode =
      journeyMentorMode === "check_cbse"
        ? "check_cbse"
        : journeyMentorMode === "hint"
          ? "hint"
          : "auto";
    setActiveQuestionId(String(firstQuestion.id));
    openMentorForQuestion(firstQuestion, 0, entryMode);
    didAutoOpenJourneyMentorRef.current = true;
  }, [filteredQuestions, journeyMentorMode, openMentorForQuestion]);

  const title = useMemo(() => {
    if (!rawTopicParam || rawTopicParam.toLowerCase() === "generic") {
      return `Practice - Class ${grade} ${subjectKey}`;
    }
    return `Practice - ${topicLabel}`;
  }, [rawTopicParam, topicLabel, grade, subjectKey]);

  const activeQuestion = useMemo(() => {
    if (filteredQuestions.length === 0) return null;
    if (!activeQuestionId) return filteredQuestions[0];
    const hit = filteredQuestions.find((q) => String(q.id) === String(activeQuestionId));
    return hit || filteredQuestions[0];
  }, [filteredQuestions, activeQuestionId]);

  const activeQuestionNumber = useMemo(() => {
    if (!activeQuestion) return null;
    const idx = filteredQuestions.findIndex(
      (q) => String(q.id) === String(activeQuestion.id)
    );
    return idx >= 0 ? idx + 1 : null;
  }, [filteredQuestions, activeQuestion]);

  const sessionStats = useMemo(() => {
    const attemptedIds = new Set<string>([
      ...Object.keys(mcqSelections),
      ...Object.keys(selfAssessments),
    ]);
    const localMcqAnswered = Object.keys(mcqSelections).length;
    return {
      total: questions.length,
      attemptedInSet: attemptedIds.size,
      markedUnderstood: Object.values(selfAssessments).filter((r) => r === "got_it").length,
      needsAnotherLook: Object.values(selfAssessments).filter((r) => r === "need_practice").length,
      localMcqAnswered,
      localMcqCorrect: Object.values(mcqResults).filter((r) => r === "correct").length,
    };
  }, [questions.length, mcqSelections, selfAssessments, mcqResults]);

  const activeQuestionStrategyDetails = useMemo(
    () => getQuestionStrategyDetails(activeQuestion),
    [getQuestionStrategyDetails, activeQuestion]
  );
  const activeQuestionMeta = activeQuestionStrategyDetails?.meta || null;
  const activeQuestionLearningObjects = activeQuestionStrategyDetails?.learningObjects || [];
  const whyCommonMistakes = activeQuestionStrategyDetails?.commonMistakes || [];
  const whyBoardWritingTip = activeQuestionStrategyDetails?.boardWritingTip || "";
  return (
    <div
      className="dark-page"
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
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "28px clamp(20px, 4vw, 32px) 56px",
        }}
      >
        <nav
          aria-label="Practice context"
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
            onClick={() => navigate(practiceBackTo)}
            style={{
              border: "1px solid hsl(220, 18%, 90%)",
              background: "#ffffff",
              color: "hsl(220, 25%, 12%)",
              borderRadius: 8,
              padding: "7px 11px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
            }}
          >
            {backLabel}
          </button>
          <span aria-hidden="true">/</span>
          <span style={{ fontWeight: 700, color: "hsl(220, 25%, 12%)" }}>Practice</span>
          <span aria-hidden="true">/</span>
          <span>Class {grade} - {subjectTitle}</span>
        </nav>

        <PracticeHero
          grade={grade}
          subjectKey={subjectKey}
          title={title}
          topicParam={topicParam}
          questionCount={questionCount}
        />

        {isTargetedSession && ((() => {
          const MISTAKE_LABEL: Record<string, string> = {
            conceptual: "Conceptual", calculation: "Calculation",
            silly: "Silly", presentation: "Presentation",
          };
          const mistakeLabel = MISTAKE_LABEL[targetMistakeType] || targetMistakeType;
          const displayTopic = topicLabel || rawTopicParam;
          return (
            <div style={{
              margin: "0 0 14px 0", padding: "12px 14px",
              borderRadius: 12, background: "hsl(215, 75%, 95%)",
              border: "1px solid hsl(215, 65%, 84%)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 800, color: "hsl(215, 65%, 32%)" }}>Targeted session</span>
                <span style={{ fontSize: 12, color: "hsl(220, 25%, 12%)", fontWeight: 500 }}>
                  {" - focusing on "}
                  <strong>{displayTopic}</strong>
                  {mistakeLabel ? ` (${mistakeLabel} mistakes)` : ""}
                </span>
              </div>
            </div>
          );
        })())}

        <PracticeControls
          pendingMarks={pendingMarks}
          pendingStyle={pendingStyle}
          pendingSource={pendingSource}
          pendingDifficulty={pendingDifficulty}
          pendingCount={questionCount}
          availableCount={availableCount}
          onSetMarks={setPendingMarks}
          onSetStyle={handleSetStyle}
          onSetSource={setPendingSource}
          onSetDifficulty={(v) => {
            setPendingDifficulty(v);
            setDifficulty(v === "all" ? "All" : (v as DifficultyChoice));
          }}
          onSetCount={setQuestionCount}
          onClearFilters={handleClearFilters}
          committedMarks={committedMarks}
          committedStyle={committedStyle}
          committedSource={committedSource}
          committedDifficulty={committedDifficulty}
          committedCount={committedCount}
          onBuildSet={() => {
            trackUxEvent("practice_regenerate_click", "practice", {
              action: "build_set",
              topic: topicParam,
              subject: subjectKey,
              questionCount,
            });
            setCommittedMarks(pendingMarks);
            setCommittedStyle(pendingStyle);
            setCommittedSource(pendingSource);
            setCommittedDifficulty(pendingDifficulty);
            setCommittedCount(questionCount);
            setIsBuilt(true);
            regenerateQuestions();
          }}
          isBuilt={isBuilt}
          onEditFilters={handleEditFilters}
          onRegenerate={() => {
            trackUxEvent("practice_regenerate_click", "practice", {
              action: "regenerate_set",
              topic: topicParam,
              subject: subjectKey,
              questionCount,
            });
            regenerateQuestions();
          }}
          onDownloadPdf={handleDownloadWorksheet}
          onCopyLink={handleCopyLink}
          linkCopied={linkCopied}
          hasQuestions={filteredQuestions.length > 0}
          visibleQuestionCount={filteredQuestions.length}
        />

        {isWhyThisQuestionEnabled && (
          <WhyThisQuestionPanel
            isOpen={isWhyPanelOpen}
            onToggle={() => setIsWhyPanelOpen((prev) => !prev)}
            activeQuestionNumber={activeQuestionNumber}
            meta={activeQuestionMeta}
            learningObjects={activeQuestionLearningObjects}
            commonMistakes={whyCommonMistakes}
            boardWritingTip={whyBoardWritingTip}
          />
        )}

        {isBuilt && (
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 14,
            flexWrap: "wrap",
            margin: "18px 0 12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 600,
                letterSpacing: "-0.01em",
                color: "hsl(220, 25%, 12%)",
                margin: 0,
              }}
            >
              Practice workspace
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                color: "hsl(220, 15%, 42%)",
                fontSize: "0.84rem",
                lineHeight: 1.5,
              }}
            >
              Solve in your own order. Check my answer gives real feedback;
              step solutions are for comparison and learning.
            </p>
          </div>
          {filteredQuestions.length > 0 && (
            <span
              style={{
                borderRadius: 999,
                border: "1px solid hsl(220, 18%, 90%)",
                background: "hsl(210, 33%, 96%)",
                color: "hsl(220, 15%, 42%)",
                padding: "4px 10px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {filteredQuestions.length} visible question{filteredQuestions.length === 1 ? "" : "s"}
            </span>
          )}
        </section>
        )}

        {isBuilt && (
        <PracticeQuestionList
          isLoading={isLoading}
          error={error}
          questions={questions}
          filteredQuestions={filteredQuestions}
          subjectKey={subjectKey}
          topicLabel={topicLabel}
          difficultyFilter={difficulty}
          expandedAnswers={expandedAnswers}
          selfAssessments={selfAssessments}
          mcqSelections={mcqSelections}
          mcqResults={mcqResults}
          practiceSolutionLoading={practiceSolutionLoading}
          practiceSolutionError={practiceSolutionError}
          practiceSolutionData={practiceSolutionData}
          sessionStats={sessionStats}
          onSetActiveQuestion={setActiveQuestionId}
          onToggleAnswer={handleToggleAnswer}
          onMcqSelect={(qId, oi) => setMcqSelections((prev) => ({ ...prev, [qId]: oi }))}
          onMcqResult={(qId, result) => setMcqResults((prev) => ({ ...prev, [qId]: result }))}
          onSelfAssessGotIt={(question) => {
            setSelfAssessments((prev) => ({ ...prev, [question.id]: "got_it" }));
            recordQuestionAnswered();
          }}
          onSelfAssessNeedPractice={(question) => {
            setSelfAssessments((prev) => ({ ...prev, [question.id]: "need_practice" }));
            recordQuestionAnswered();
          }}
          onOpenConceptDrawer={openConceptDrawer}
          onOpenMentorBoard={(question, idx) => openMentorForQuestion(question, idx, "check_cbse")}
        />
        )}

{(() => {
  const allDone = questions.length > 0 && sessionStats.attemptedInSet >= questions.length;
  if (!allDone) return null;
  const topicK = canonicalTopicKey || topicParam;
  const nextActions = [
    { label: "Build a fresh set", icon: "New", action: () => regenerateQuestions() },
  ];
  nextActions.push({ label: "Chapter Test", icon: "Test", action: () => navigate(`/chapter-test/${grade}/${subjectKey}/${topicK}`, { state: { back: location.pathname + location.search, backLabel: "Back to practice" } }) });
  nextActions.push({ label: "Predicted Questions", icon: "HPQ", action: () => navigate(`/highly-probable/${grade}/${subjectKey}?topic=${encodeURIComponent(topicK)}`, { state: { back: location.pathname + location.search, backLabel: "Back to practice" } }) });
  nextActions.push({ label: "Study this chapter", icon: "Hub", action: () => navigate(`/topic-hub/${grade}/${subjectKey}/${topicK}`, { state: { back: location.pathname + location.search, backLabel: "Back to practice" } }) });
  return (
    <div style={{
      marginTop: 20,
      borderRadius: 14,
      padding: "20px 18px",
      background: "#ffffff",
      border: "1px solid hsl(220, 18%, 90%)",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 600, color: "hsl(220, 25%, 12%)", margin: "0 0 4px" }}>
          Set notes complete - {sessionStats.attemptedInSet}/{questions.length} attempted in this set
        </h3>
        <p style={{ fontSize: "0.84rem", color: "hsl(220, 15%, 42%)", margin: 0, lineHeight: 1.5 }}>
          This session only. These notes are not graded and are not saved to Me / Progress. Use Check my answer where you want real feedback.
        </p>
      </div>
      <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "hsl(220, 15%, 42%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        What should I do next?
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {nextActions.map((a) => (
          <button key={a.label} onClick={a.action} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 10,
            border: "1px solid hsl(220, 18%, 90%)",
            background: "hsl(210, 33%, 96%)",
            color: "hsl(220, 25%, 12%)", fontSize: "0.86rem", fontWeight: 700, cursor: "pointer", textAlign: "left",
          }}>
            <span style={{ fontSize: 11, color: "hsl(220, 15%, 42%)", minWidth: 34, fontWeight: 800 }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
})()}

<MentorSolveDrawer
  open={mentorDrawerOpen}
  onClose={() => setMentorDrawerOpen(false)}
  seed={mentorSeedExample}
  solveStyle={mentorSolveStyle}
  grade={Number(grade)}

  subjectTitle={subjectTitle}
  topicKey={canonicalTopicKey}
/>

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
    </div>
  );
};

export default PracticePage;
