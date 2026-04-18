// src/pages/PracticePage.tsx
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { usePracticeLimit } from "../components/auth/PracticeLimitGate";

import { type PracticeQuestion } from "../data/predictionDataService";
import { PredictionCore } from "../data/predictionCore";
import {
  resolveTopicDisplayName,
  resolveTopicKey as resolveCanonicalTopicKey,
} from "../utils/topicResolver";
import { fetchStepSolution, type StepSolutionResponse } from "../ai/aiClient";
import { lazy, Suspense } from "react";
import type { ConceptTeachContext } from "../components/tutor/ConceptTeachDrawer";
const ConceptTeachDrawer = lazy(() => import("../components/tutor/ConceptTeachDrawer"));
import JourneyStrip from "../components/ux/JourneyStrip";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import type { PracticeSectionFilter } from "../navigation/practiceNavigation";
import { recordQuizResult, type QuizResult } from "../services/masteryLevelService";
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
  createSessionTracker,
  recordSelfAssessment,
  getSessionStats,
  findFollowUpQuestion,
  markFollowUpInjected,
  getWrongConceptsForTopic,
  type PracticeSessionTracker,
} from "../services/adaptivePracticeEngine";
import {
  upsertNodeProgress,
  loadTopicMasterySnapshot,
  saveTopicMasterySnapshot,
} from "../services/topicHubMastery";
import type {
  QuestionFamilyOverlay,
} from "../data/contentStrategy/types";
import type { StudentMentorIntent } from "../types/studentMentorIntent";
import { recordDetour, recordPracticeInPhase } from "../services/guidedJourneyService";
import { isMissionCompletedToday, getMissionResumeInfo } from "../services/dailyMissionService";
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
  mapUnifiedQuestionToPractice,
} from "../components/practice/practiceQuestionBuilder";
import { MentorSolveDrawer } from "../components/practice/MentorSolveDrawer";
import { PracticeControls } from "../components/practice/PracticeControls";
import { PracticeHero } from "../components/practice/PracticeHero";
import { WhyThisQuestionPanel } from "../components/practice/WhyThisQuestionPanel";
import { PracticeQuestionList } from "../components/practice/PracticeQuestionList";

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

type SectionFilterValue = "ALL" | "A" | "B" | "C" | "D" | "E";

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

  const navState = (location.state as PracticeNavState) || {};
  // Support deep-linking via URL query params (e.g., /practice/10/Maths?topic=Triangles&section=A)
  const qpSectionRaw = (qp.get("section") || qp.get("pattern") || qp.get("type") || "").trim();
  const qpSection = qpSectionRaw ? qpSectionRaw.toUpperCase() : "";

  const subjectKeyStr = String(navState.subjectKey ?? navState.subject ?? subjectKey ?? "").toLowerCase();
  const subjectTitle = String(
    navState.subjectTitle ||
    (subjectKeyStr.includes("math") ? "Maths" :
     subjectKeyStr.includes("sci")  ? "Science" :
     (subjectKeyStr ? subjectKeyStr.charAt(0).toUpperCase() + subjectKeyStr.slice(1) : "Subject"))
  );
  const back: string | undefined = navState.back;
  const backLabel: string =
    navState.backLabel ||
    (back && typeof back === "string" && back.includes("/trends")
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
    const queryMarksFilter = parsePositiveInt(qp.get("marks"));

    const recommendedCount = queryRecommendedCount ?? navRecommendedCount ?? 10;
    const clampedCount = Math.max(
      MIN_QUESTION_COUNT,
      Math.min(MAX_QUESTION_COUNT, recommendedCount)
    );

    return {
      subtopicHint: querySubtopicHint ?? navSubtopicHint,
      focusBankIds: queryFocusBankIds ?? navFocusBankIds,
      strictFocus: queryStrictFocus ?? navStrictFocus ?? false,
      recommendedCount: clampedCount,
      difficultyPreset: queryDifficultyPreset ?? navDifficultyPreset ?? "All",
      marksFilter: queryMarksFilter ?? navMarksFilter,
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
  const [marksFilter, setMarksFilter] = useState<number | undefined>(
    () => initialPracticeDefaults.marksFilter
  );
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);

  useEffect(() => {
    if (didInitFromUrlRef.current) return;
    setSubtopicHint(initialPracticeDefaults.subtopicHint);
    setFocusBankIds(initialPracticeDefaults.focusBankIds);
    setStrictFocus(Boolean(initialPracticeDefaults.strictFocus));
    setQuestionCount(initialPracticeDefaults.recommendedCount);
    setDifficulty(initialPracticeDefaults.difficultyPreset);
    setMarksFilter(initialPracticeDefaults.marksFilter);
    didInitFromUrlRef.current = true;
  }, [initialPracticeDefaults]);


  const [sectionFilter, setSectionFilter] = useState<SectionFilterValue>(() => {
  const init = String(navState.sectionFilter || qpSection || "ALL").toUpperCase();
  return (init === "A" || init === "B" || init === "C" || init === "D" || init === "E") ? init : "ALL";
});

useEffect(() => {
  const s = (qpSection || "").toUpperCase();
  if (s === "A" || s === "B" || s === "C" || s === "D" || s === "E" || s === "ALL") {
    setSectionFilter(s as SectionFilterValue);
  }
}, [qpSection]);
  const inferSectionFromMarks = (marks: unknown): "A" | "B" | "C" | "D" | "E" | null => {
    const m = typeof marks === "number" ? marks : Number(marks);
    if (!Number.isFinite(m)) return null;
    if (m === 1) return "A";
    if (m === 2) return "B";
    if (m === 3) return "C";
    if (m === 4) return "E"; // 4 marks = Case-based (E)
    if (m === 5) return "D";
    return null;
  };

  const getQuestionSection = (q: PracticeQuestion): "A" | "B" | "C" | "D" | "E" | null => {
    const direct = String(q.section || "").toUpperCase();
    if (direct === "A" || direct === "B" || direct === "C" || direct === "D" || direct === "E") return direct;
    const byMarks = inferSectionFromMarks(q.marks);
    if (byMarks) return byMarks;
    const slot = String(q.blueprintSlotId || "").toUpperCase();
    if (slot.startsWith("A")) return "A";
    if (slot.startsWith("B")) return "B";
    if (slot.startsWith("C")) return "C";
    if (slot.startsWith("D")) return "D";
    if (slot.startsWith("E")) return "E";
    return null;
  };

  const filteredQuestions = useMemo(() => {
    if (sectionFilter === "ALL") return questions;
    return questions.filter((q) => getQuestionSection(q) === sectionFilter);
  }, [questions, sectionFilter]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isWhyPanelOpen, setIsWhyPanelOpen] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedAnswers, setExpandedAnswers] = useState<
    Record<string, boolean>
  >({});
  const [regenerationKey, setRegenerationKey] = useState<number>(0);
  const previousQuestionKeys = useRef<Set<string>>(new Set());
  const [sessionTracker, setSessionTracker] = useState<PracticeSessionTracker>(
    () => createSessionTracker(topicParam)
  );
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

  const practiceSessionMasteryRef = useRef(false);
  useEffect(() => {
    if (questions.length === 0) { practiceSessionMasteryRef.current = false; return; }
    const answeredCount = Object.keys(mcqResults).length + Object.keys(selfAssessments).length;
    if (answeredCount < questions.length || practiceSessionMasteryRef.current) return;
    practiceSessionMasteryRef.current = true;

    const mcqTotal = Object.keys(mcqResults).length;
    const mcqCorrectCount = Object.values(mcqResults).filter((r) => r === "correct").length;
    const nonMcqTotal = Object.keys(selfAssessments).length;
    const nonMcqCorrectCount = Object.values(selfAssessments).filter((r) => r === "got_it").length;
    const chapterId = `${grade}-${subjectKey}-${canonicalTopicKey || topicParam}`;
    const result: QuizResult = {
      totalQuestions: questions.length,
      correctAnswers: mcqCorrectCount + nonMcqCorrectCount,
      mcqCount: mcqTotal,
      mcqCorrect: mcqCorrectCount,
      nonMcqCount: nonMcqTotal,
      nonMcqCorrect: nonMcqCorrectCount,
    };
    recordQuizResult(chapterId, result, false);
  }, [questions, mcqResults, selfAssessments, grade, subjectKey, canonicalTopicKey, topicParam]);

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
            sectionFilter: sectionFilter === "ALL" ? undefined : sectionFilter,
            adaptiveMix,
            priorityConceptKeys,
            marksFilter,
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
          setSessionTracker(createSessionTracker(canonicalTopicKey || topicParam));
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
    sectionFilter,
    marksFilter,
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
      } catch (err: unknown) {
        setPracticeSolutionError((prev) => ({ ...prev, [id]: err instanceof Error ? err.message : "Failed to load solution" }));
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
        minHeight: "100vh",
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
          backTo={back || `/trends/${grade}/${subjectKey}`}
          backLabel={backLabel}
          currentLabel="Practice"
          quickLinks={[
            { label: "Trends", to: `/trends/${grade}/${subjectKey}` },
            {
              label: "Chapter Hub",
              to:
                canonicalTopicKey && topicParam.toLowerCase() !== "generic"
                  ? `/topic-hub/${grade}/${subjectKey}/${encodeURIComponent(canonicalTopicKey)}`
                  : `/topic-hub/${grade}/${subjectKey}`,
            },
            {
              label: "Predicted Q's",
              to:
                canonicalTopicKey && topicParam.toLowerCase() !== "generic"
                  ? `/highly-probable/${grade}/${subjectKey}?topic=${encodeURIComponent(canonicalTopicKey)}`
                  : `/highly-probable/${grade}/${subjectKey}`,
            },
            { label: "Fix Weak Areas", to: "/weak-area-practice" },
          ]}
        />
        <JourneyStrip
          current="practice"
          grade={grade}
          subject={subjectKey}
          topic={topicParam.toLowerCase() !== "generic" ? topicLabel : undefined}
        />

        {(() => {
          const missionSubject = subjectKey as "Maths" | "Science";
          const resumeInfo = getMissionResumeInfo(missionSubject);
          const doneToday = isMissionCompletedToday(missionSubject);
          if (doneToday && !resumeInfo) return null;
          const isResume = !!resumeInfo;
          const label = isResume
            ? `Resume Today's Mission — ${resumeInfo.completedSegments}/${resumeInfo.totalSegments} segments done`
            : "Start Today's Mission — 4 segments, ~30 min";
          const bg = isResume
            ? "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)"
            : "linear-gradient(90deg, #6366f1 0%, #22c55e 100%)";
          return (
            <button
              onClick={() => navigate(`/daily-mission/${grade}/${subjectKey}`, { state: { back: `/practice/${grade}/${subjectKey}`, backLabel: "Back to Practice" } })}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "12px 16px", borderRadius: 12, border: "none",
                background: bg, color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", marginBottom: 14, gap: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{isResume ? "▶️" : "🎯"}</span>
                {label}
              </span>
              <span style={{ opacity: 0.85, fontSize: 16 }}>→</span>
            </button>
          );
        })()}

        <PracticeHero
          grade={grade}
          subjectKey={subjectKey}
          title={title}
          topicParam={topicParam}
          canonicalTopicKey={canonicalTopicKey || topicParam}
          questionCount={questionCount}
        />

        <PracticeControls
          difficulty={difficulty}
          onSetDifficulty={setDifficulty}
          sectionFilter={sectionFilter}
          onSetSectionFilter={(s) => setSectionFilter(s as SectionFilterValue)}
          questionCount={questionCount}
          onSetQuestionCount={setQuestionCount}
          onRegenerate={() => {
            trackUxEvent("practice_regenerate_click", "practice", {
              action: "regenerate_set",
              topic: topicParam,
              subject: subjectKey,
              questionCount,
            });
            regenerateQuestions();
          }}
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

        <PracticeQuestionList
          isLoading={isLoading}
          error={error}
          questions={questions}
          filteredQuestions={filteredQuestions}
          subjectKey={subjectKey}
          topicLabel={topicLabel}
          expandedAnswers={expandedAnswers}
          selfAssessments={selfAssessments}
          mcqSelections={mcqSelections}
          mcqResults={mcqResults}
          practiceSolutionLoading={practiceSolutionLoading}
          practiceSolutionError={practiceSolutionError}
          practiceSolutionData={practiceSolutionData}
          sessionStats={getSessionStats(sessionTracker)}
          onSetActiveQuestion={setActiveQuestionId}
          onToggleAnswer={handleToggleAnswer}
          onMcqSelect={(qId, oi) => setMcqSelections((prev) => ({ ...prev, [qId]: oi }))}
          onMcqResult={(qId, result) => setMcqResults((prev) => ({ ...prev, [qId]: result }))}
          onSelfAssessGotIt={(question) => {
            const concept = String(question.subtopic ?? "");
            const diff = String(question.difficulty ?? "Medium");
            setSelfAssessments((prev) => ({ ...prev, [question.id]: "got_it" }));
            recordQuestionAnswered();
            try {
              if (localStorage.getItem(FIRST_PRACTICE_KEY) === "started") {
                trackUxEvent("first_practice_complete", "practice", {});
                localStorage.setItem(FIRST_PRACTICE_KEY, "complete");
              }
            } catch {}
            recordPracticeInPhase(canonicalTopicKey || topicParam, authUserForJourney?.uid);
            setSessionTracker((prev) => recordSelfAssessment(prev, question.id, "got_it", concept, diff));
            const topicK = canonicalTopicKey || topicParam;
            const snap = loadTopicMasterySnapshot(topicK);
            const nodeId = concept || question.id;
            const updated = upsertNodeProgress(snap, nodeId, { score: 100, status: "correct" });
            saveTopicMasterySnapshot(updated, topicK);
          }}
          onSelfAssessNeedPractice={(question, idx) => {
            const concept = String(question.subtopic ?? "");
            const diff = String(question.difficulty ?? "Medium");
            setSelfAssessments((prev) => ({ ...prev, [question.id]: "need_practice" }));
            recordQuestionAnswered();
            try {
              if (localStorage.getItem(FIRST_PRACTICE_KEY) === "started") {
                trackUxEvent("first_practice_complete", "practice", {});
                localStorage.setItem(FIRST_PRACTICE_KEY, "complete");
              }
            } catch {}
            recordPracticeInPhase(canonicalTopicKey || topicParam, authUserForJourney?.uid);
            const nextTracker = recordSelfAssessment(sessionTracker, question.id, "need_practice", concept, diff);
            const pendingFollowUp = nextTracker.followUpQueue.find(
              (f) => f.sourceQuestionId === question.id && f.injectedAtIndex === -1
            );
            if (pendingFollowUp) {
              const currentIds = new Set(questions.map((fq) => String(fq.id)));
              const allCandidates = PredictionCore.getLikelyQuestionsForConcept(
                canonicalTopicKey || topicParam, undefined
              );
              const followUp = findFollowUpQuestion(
                allCandidates, currentIds,
                pendingFollowUp.conceptKey, pendingFollowUp.difficulty,
              );
              if (followUp) {
                const sourceIdx = questions.findIndex((fq) => String(fq.id) === question.id);
                const insertAt = sourceIdx >= 0
                  ? Math.min(sourceIdx + 2, questions.length)
                  : Math.min(idx + 2, questions.length);
                const mapped = mapUnifiedQuestionToPractice(followUp as unknown as Record<string, unknown>, `followup-${question.id}`);
                setQuestions((prev) => {
                  const copy = [...prev];
                  copy.splice(insertAt, 0, mapped);
                  return copy;
                });
                setSessionTracker(markFollowUpInjected(nextTracker, question.id, insertAt));
              } else {
                setSessionTracker(nextTracker);
              }
            } else {
              setSessionTracker(nextTracker);
            }
            const topicK = canonicalTopicKey || topicParam;
            const snap = loadTopicMasterySnapshot(topicK);
            const nodeId = concept || question.id;
            const updated = upsertNodeProgress(snap, nodeId, { score: 20, status: "incorrect" });
            saveTopicMasterySnapshot(updated, topicK);
          }}
          onOpenConceptDrawer={openConceptDrawer}
          onOpenMentorBoard={(question, idx) => openMentorForQuestion(question, idx, "check_cbse")}
        />

{(() => {
  const answeredCount = Object.keys(mcqResults).length + Object.keys(selfAssessments).length;
  const allDone = questions.length > 0 && answeredCount >= questions.length;
  if (!allDone) return null;
  const correctCount = Object.values(mcqResults).filter((r) => r === "correct").length + Object.values(selfAssessments).filter((r) => r === "got_it").length;
  const accuracy = Math.round((correctCount / questions.length) * 100);
  const topicK = canonicalTopicKey || topicParam;
  const nextActions = [];
  if (accuracy < 60) {
    nextActions.push({ label: "Retry with easier questions", icon: "🔄", action: () => { setDifficulty("Easy"); regenerateQuestions(); } });
  }
  nextActions.push({ label: "Chapter Test", icon: "📝", action: () => navigate(`/chapter-test/${grade}/${subjectKey}/${topicK}`, { state: { back: location.pathname + location.search, backLabel: "Back to practice" } }) });
  nextActions.push({ label: "Predicted Questions", icon: "🎯", action: () => navigate(`/highly-probable/${grade}/${subjectKey}?topic=${encodeURIComponent(topicK)}`, { state: { back: location.pathname + location.search, backLabel: "Back to practice" } }) });
  nextActions.push({ label: "Study this chapter", icon: "📚", action: () => navigate(`/topic-hub/${grade}/${subjectKey}/${topicK}`, { state: { back: location.pathname + location.search, backLabel: "Back to practice" } }) });
  return (
    <div className="glass-card" style={{ marginTop: 20, borderRadius: 16, padding: "20px 18px" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>{accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}</div>
        <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text)", margin: "0 0 4px" }}>
          Practice Complete — {correctCount}/{questions.length} correct ({accuracy}%)
        </h3>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
          {accuracy >= 80 ? "Great job! Ready for the next challenge?" : accuracy >= 50 ? "Good effort! Keep practising to improve." : "Keep going — practice makes perfect!"}
        </p>
      </div>
      <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
        What should I do next?
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {nextActions.map((a) => (
          <button key={a.label} onClick={a.action} className="glass-card" style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12,
            color: "var(--text)", fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", textAlign: "left",
          }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
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
