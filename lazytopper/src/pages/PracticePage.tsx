// src/pages/PracticePage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { usePracticeLimit } from "../components/auth/PracticeLimitGate";

import { type PracticeQuestion } from "../data/predictionDataService";
import type { DifficultyLevel } from "../data/predictionTypes";
import { inferBoardPatternFromQuestion, normalizeBoardPattern } from "../data/practiceSetGenerator";
import { PredictionCore } from "../data/predictionCore";
import {
  resolveTopicDisplayName,
  resolveTopicKey as resolveCanonicalTopicKey,
} from "../utils/topicResolver";
import { fetchStepSolution, type StepSolutionResponse } from "../ai/aiClient";
import { lazy, Suspense } from "react";
import type { ConceptTeachContext } from "../components/tutor/ConceptTeachDrawer";
const ConceptTeachDrawer = lazy(() => import("../components/tutor/ConceptTeachDrawer"));
import { QuestionVisualAid } from "../components/question/QuestionVisualAid";
import { MathText } from "../components/question/MathText";
import { SolutionChecker } from "../components/question/SolutionChecker";
import { DiagramBlock } from "../components/DiagramBlock";
import JourneyStrip from "../components/ux/JourneyStrip";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import {
  navigateToPractice,
  type PracticeSectionFilter,
} from "../navigation/practiceNavigation";
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
  getAdaptiveLevelInfo,
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
  buildPracticeQuestionsFromEngine,
  resolvePracticePackKey,
  buildPracticeQuestionsWithAiTopup,
  normaliseSubject,
  parseDifficultyChoice,
  parsePositiveInt,
  parseFocusBankIds,
  parseBooleanFlag,
  enforceDifficultyFilter,
  mapUnifiedQuestionToPractice,
} from "../components/practice/practiceQuestionBuilder";
import { MentorSolveDrawer } from "../components/practice/MentorSolveDrawer";

const QTYPE_FIRST_TRIG = import.meta.env.VITE_QTYPE_FIRST_TRIGONOMETRY === "true";

/* Builder functions extracted to ../components/practice/practiceQuestionBuilder.ts */
/* MentorSolveDrawer extracted to ../components/practice/MentorSolveDrawer.tsx */

const PracticePage: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ grade?: string; subject?: string }>();
  const { recordQuestionAnswered } = usePracticeLimit();
  const { user: authUserForJourney } = useAuth();

  const grade = params.grade || "10";
  const subjectKey: SubjectKey = normaliseSubject(params.subject ?? "Maths");

  const qp = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const topicParam = qp.get("topic") || "Generic";
  const topicKeyParam = qp.get("topicKey");
  const journeyMentorMode = String(qp.get("journeyMentor") || "").trim().toLowerCase();

  // Navigation state for Back button + label
  const navState = (location.state as any) || {};
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

  // Optional practice filters passed from Trends / HPQ / TopicHub
  const practiceFilters = (navState.practiceFilters || {}) as {
    subtopicHint?: string;
    focusBankIds?: string[];
    strictFocus?: boolean;
    recommendedCount?: number;
    difficultyPreset?: DifficultyChoice;
    marksFilter?: number;
  };

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


  const [sectionFilter, setSectionFilter] = useState<"ALL" | "A" | "B" | "C" | "D" | "E">(() => {
  const init = (((navState as any)?.sectionFilter as any) || qpSection || "ALL");
  return String(init || "ALL").toUpperCase() as any;
});

// Keep URL ?section=... authoritative (without breaking hooks order).
useEffect(() => {
  const s = (qpSection || "").toUpperCase();
  if (s === "A" || s === "B" || s === "C" || s === "D" || s === "E" || s === "ALL") {
    setSectionFilter(s as any);
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

  const getQuestionSection = (q: any): "A" | "B" | "C" | "D" | "E" | null => {
    const direct = String(q?.section || q?.paperSection || q?.boardSection || "").toUpperCase();
    if (direct === "A" || direct === "B" || direct === "C" || direct === "D" || direct === "E") return direct as any;
    const byMarks = inferSectionFromMarks(q?.marks ?? q?.mark ?? q?.points);
    if (byMarks) return byMarks;
    const slot = String(q?.blueprintSlotId || "").toUpperCase();
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
  const explicitFromState = (navState as any)?.topicKey as string | undefined;
  return resolveCanonicalTopicKey({
    subjectKey: String(subjectKey).toLowerCase(),
    topicParam,
    topicKey: topicKeyParam || explicitFromState || null,
  });
}, [subjectKey, topicParam, topicKeyParam, navState]);

  const strategyTopicSeed = useMemo(() => {
    const explicitFromState = (navState as any)?.topicKey as string | undefined;
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
    if (canonicalTopicKey && canonicalTopicKey !== "Generic") {
      return resolveTopicDisplayName(subjectKey, canonicalTopicKey);
    }
    if (!topicParam || topicParam === "Generic") return topicParam;
    return resolveTopicDisplayName(subjectKey, canonicalTopicKey || topicParam);
  }, [subjectKey, canonicalTopicKey, topicParam]);

  useEffect(() => {
    const slug = canonicalTopicKey || topicParam;
    if (slug && slug !== "Generic") {
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
  const explicitFromState = (navState as any)?.topicKey as string | undefined;
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

  const regenerateQuestions = () => {
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
          type: (q as any).type || "",
          section: q.section || "",
          answer: (q as any).answer || "",
          explanation: (q as any).explanation || "",
        });
        setPracticeSolutionData((prev) => ({ ...prev, [id]: result }));
      } catch (err: any) {
        setPracticeSolutionError((prev) => ({ ...prev, [id]: err?.message || "Failed to load solution" }));
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
        marks: Number((q as any).marks) || undefined,
        section: String((q as any).section || ""),
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
          ((String((q as any).section || "").toUpperCase() as PracticeSectionFilter | "") || undefined),
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
    if (!topicParam || topicParam === "Generic") {
      return `Practice - Class ${grade} ${subjectKey}`;
    }
    return `Practice - ${topicLabel}`;
  }, [topicParam, topicLabel, grade, subjectKey]);

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
      style={{
        minHeight: "100vh",
        background: "rgba(255,255,255,0.03)",
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
          quickLinks={[
            { label: "Trends", to: `/trends/${grade}/${subjectKey}` },
            {
              label: "Chapter Hub",
              to:
                canonicalTopicKey && topicParam !== "Generic"
                  ? `/topic-hub/${grade}/${subjectKey}/${encodeURIComponent(canonicalTopicKey)}`
                  : `/topic-hub/${grade}/${subjectKey}`,
            },
            {
              label: "Predicted Q's",
              to:
                canonicalTopicKey && topicParam !== "Generic"
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
          topic={topicParam !== "Generic" ? topicLabel : undefined}
        />

        {/* Hero */}
        <section
          style={{
            borderRadius: 16,
            padding: "20px 18px 22px",
            background: "linear-gradient(135deg, #22c55e 0%, #3b82f6 100%)",
            color: "#fff",
            boxShadow: "0 4px 0 rgba(70,163,2,0.3)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              opacity: 0.85,
              marginBottom: 6,
            }}
          >
            Class {grade} - {subjectKey} - Practice
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1
              style={{
                fontSize: "2rem",
                lineHeight: 1.15,
                fontWeight: 650,
                marginBottom: 6,
              }}
            >
              {title}
            </h1>
            {topicParam !== "Generic" && (() => {
              const levelInfo = getAdaptiveLevelInfo(canonicalTopicKey || topicParam);
              return (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 12px",
                    borderRadius: 999,
                    backgroundColor: levelInfo.bgColor,
                    color: levelInfo.color,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {levelInfo.emoji} {levelInfo.label}
                </span>
              );
            })()}
          </div>
          <p
            style={{
              fontSize: "0.9rem",
              lineHeight: 1.6,
              opacity: 0.96,
              maxWidth: 640,
            }}
          >
            Auto-generated{" "}
            <strong>{questionCount}</strong> questions adapted to your progress.
            Solve on paper first, then self-assess with{" "}
            <strong>"Got it"</strong> or <strong>"Need practice"</strong>.
          </p>
        </section>

        {/* Controls row */}
        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          {/* Difficulty chips */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.45)",
                marginRight: 4,
              }}
            >
              Difficulty:
            </span>
            {(["All", "Easy", "Medium", "Hard"] as DifficultyChoice[]).map(
              (level) => {
                const active = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      border: active
                        ? "1px solid rgba(28,176,246,0.85)"
                        : "1px solid rgba(255,255,255,0.1)",
                      backgroundColor: active ? "#3b82f6" : "rgba(255,255,255,0.03)",
                      color: active ? "#f9fafb" : "rgba(255,255,255,0.7)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      boxShadow: active
                        ? "0 6px 16px rgba(28,176,246,0.3)"
                        : "none",
                    }}
                  >
                    {level === "All" ? "All levels" : level}
                  </button>
                );
              }
            )}
          </div>

          {/* Type (A-E) filter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>Type:</span>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as any)}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "4px 10px",
                fontSize: "0.78rem",
                background: "rgba(255,255,255,0.03)",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All</option>
              <option value="A">A (1m)</option>
              <option value="B">B (2m)</option>
              <option value="C">C (3m)</option>
              <option value="D">D (5m)</option>
              <option value="E">E (Case, 4m)</option>
            </select>
          </div>

          {/* Question count + regenerate */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.45)",
              }}
            >
              Questions:{" "}
              <input
                type="number"
                min={MIN_QUESTION_COUNT}
                max={MAX_QUESTION_COUNT}
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(
                    Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, Number(e.target.value) || 0))
                  )
                }
                style={{
                  width: 56,
                  borderRadius: 999,
                  border: "1px solid #cbd5f5",
                  padding: "3px 8px",
                  fontSize: "0.78rem",
                  marginLeft: 4,
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                trackUxEvent("practice_regenerate_click", "practice", {
                  action: "regenerate_set",
                  topic: topicParam,
                  subject: subjectKey,
                  questionCount,
                });
                regenerateQuestions();
              }}
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                border: "1px solid rgba(88,204,2,0.8)",
                backgroundColor: "#22c55e",
                color: "#052e16",
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Regenerate set
            </button>
            <button
              type="button"
              onClick={() =>
                setQuestionCount((prev) =>
                  Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, prev + 10))
                )
              }
              style={{
                borderRadius: 999,
                padding: "5px 12px",
                border: "1px solid rgba(28,176,246,0.8)",
                backgroundColor: "rgba(59,130,246,0.1)",
                color: "#1e3a8a",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
              title="Demand 10 more questions for this topic"
            >
              +10 more
            </button>
          </div>
        </section>

        <section style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>Fast drill presets:</span>
          {[10, 20, 40, 60, 100].map((count) => (
            <button
              key={count}
              type="button"
              className="lt-pill"
              style={{ padding: "4px 10px", fontSize: "0.74rem" }}
              onClick={() => setQuestionCount(Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, count)))}
            >
              {count}Q
            </button>
          ))}
          <span className="lt-desktop-only" style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)" }}>
            Shortcut: Alt+1/2/3/4/5 and Alt+R.
          </span>
        </section>

        {isWhyThisQuestionEnabled && (
          <section
            data-testid="practice-why-panel"
            style={{
              marginBottom: 12,
              borderRadius: 16,
              border: "1px solid rgba(28,176,246,0.28)",
              background: "rgba(59,130,246,0.06)",
              boxShadow: "0 8px 22px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            <button
              data-testid="practice-why-panel-toggle"
              type="button"
              onClick={() => setIsWhyPanelOpen((prev) => !prev)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                border: "none",
                borderBottom: isWhyPanelOpen ? "1px solid rgba(28,176,246,0.2)" : "none",
                background: "rgba(28,176,246,0.08)",
                color: "#1e3a8a",
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "0.84rem",
                textAlign: "left",
              }}
              aria-expanded={isWhyPanelOpen}
            >
              <span>
                Why this question?
                {activeQuestionNumber ? ` (Q${activeQuestionNumber})` : ""}
              </span>
              <span style={{ fontSize: "0.76rem" }}>{isWhyPanelOpen ? "Hide" : "Show"}</span>
            </button>

            {isWhyPanelOpen && (
              <div style={{ padding: "12px 12px 10px" }}>
                {activeQuestionMeta ? (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      {activeQuestionMeta.skillFamily && (
                        <span
                          style={{
                            fontSize: "0.73rem",
                            borderRadius: 999,
                            padding: "3px 9px",
                            background: "rgba(28,176,246,0.12)",
                            color: "#60a5fa",
                            border: "1px solid rgba(28,176,246,0.2)",
                          }}
                        >
                          Skill: {activeQuestionMeta.skillFamily}
                        </span>
                      )}
                      {activeQuestionMeta.cbseFormat && (
                        <span
                          style={{
                            fontSize: "0.73rem",
                            borderRadius: 999,
                            padding: "3px 9px",
                            background: "rgba(88,204,2,0.12)",
                            color: "#155e75",
                            border: "1px solid rgba(88,204,2,0.2)",
                          }}
                        >
                          CBSE format: {activeQuestionMeta.cbseFormat}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                          Learning objects
                        </div>
                        {activeQuestionLearningObjects.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.45 }}>
                            {activeQuestionLearningObjects.map((lo) => (
                              <li key={lo.loId}>
                                <strong>{lo.title}:</strong> {lo.description}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)" }}>
                            Learning objects are being mapped for this question.
                          </div>
                        )}
                      </div>

                      {whyCommonMistakes.length > 0 && (
                        <div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                            Common mistakes
                          </div>
                          <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.45 }}>
                            {whyCommonMistakes.map((mistake) => (
                              <li key={mistake}>{mistake}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {whyBoardWritingTip && (
                        <div
                          style={{
                            borderRadius: 10,
                            border: "1px solid rgba(88,204,2,0.2)",
                            background: "rgba(59,130,246,0.06)",
                            padding: "8px 10px",
                            fontSize: "0.78rem",
                            color: "#164e63",
                            lineHeight: 1.45,
                          }}
                        >
                          <strong>Board writing tip:</strong> {whyBoardWritingTip}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)" }}>
                    This question isn&apos;t tagged yet. Practice normally.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Questions list */}
        <section>
          {isLoading && (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                borderRadius: 16,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.06)",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📝</div>
              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                Preparing your questions...
              </p>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>
                Picking the best questions based on your topic and difficulty level.
              </p>
            </div>
          )}

          {error && (
            <p
              style={{
                fontSize: "0.85rem",
                color: "#ef4444",
                marginBottom: 8,
              }}
            >
              {error}
            </p>
          )}

          {!isLoading && !error && questions.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                borderRadius: 16,
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔍</div>
              <p style={{ fontSize: "0.95rem", fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
                No questions found for this topic yet
              </p>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>
                Try picking a different topic from the Trends page, or check back soon as we keep adding new questions.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {filteredQuestions.map((q, idx) => {
                const isOpen = !!expandedAnswers[q.id];
                return (
                  <article
                    key={q.id}
                    data-testid="practice-question-card"
                    data-question-id={String(q.id)}
                    onClick={() => setActiveQuestionId(String(q.id))}
                    style={{
                      borderRadius: 18,
                      padding: "14px 16px 12px",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                    }}
                  >
                    <header
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 6,
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 12,
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "rgba(255,255,255,0.45)",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 22,
                              height: 22,
                              borderRadius: 999,
                              backgroundColor: "rgba(255,255,255,0.08)",
                              color: "#fff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              marginRight: 8,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span>
                            {q.marks} mark{q.marks !== 1 ? "s" : ""} - {q.section}
                          </span>
                        </div>
                      </div>

                    </header>

                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "#fff",
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        marginBottom: 8,
                      }}
                    >
                      <MathText text={q.questionText} />
                    </p>

                    {Array.isArray(q.options) && q.options.length > 0 && (() => {
                      const opts = q.options;
                      const qId = String(q.id);
                      const selected = mcqSelections[qId];
                      const result = mcqResults[qId];
                      const correctIdx = (() => {
                        const co = (q as PracticeQuestion & { correctOption?: string }).correctOption;
                        if (co && typeof co === "string" && co.length === 1) {
                          return co.charCodeAt(0) - 65;
                        }
                        if (q.answer) {
                          const ansLower = q.answer.trim().toLowerCase();
                          const ai = opts.findIndex(o => o.trim().toLowerCase() === ansLower);
                          if (ai >= 0) return ai;
                          const pi = opts.findIndex(o => ansLower.includes(o.trim().toLowerCase()) || o.trim().toLowerCase().includes(ansLower));
                          if (pi >= 0) return pi;
                        }
                        return -1;
                      })();
                      const handleMcqClick = (oi: number) => {
                        if (result) return;
                        setMcqSelections(prev => ({ ...prev, [qId]: oi }));
                        if (correctIdx >= 0) {
                          setMcqResults(prev => ({ ...prev, [qId]: oi === correctIdx ? "correct" : "wrong" }));
                        }
                      };
                      return (
                        <div style={{ marginBottom: 10, paddingLeft: 4 }}>
                          {opts.map((opt: string, oi: number) => {
                            const isSelected = selected === oi;
                            const isCorrect = result && oi === correctIdx;
                            const isWrongChoice = result === "wrong" && isSelected;
                            let bg = "transparent";
                            let border = "1px solid transparent";
                            let optColor = "rgba(255,255,255,0.9)";
                            if (isCorrect) { bg = "rgba(34,197,94,0.08)"; border = "1px solid rgba(34,197,94,0.3)"; optColor = "#22c55e"; }
                            else if (isWrongChoice) { bg = "rgba(239,68,68,0.08)"; border = "1px solid rgba(239,68,68,0.3)"; optColor = "#ef4444"; }
                            else if (isSelected && !result) { bg = "rgba(59,130,246,0.08)"; border = "1px solid rgba(59,130,246,0.4)"; }
                            return (
                              <button
                                key={oi}
                                type="button"
                                onClick={() => handleMcqClick(oi)}
                                style={{
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 8,
                                  padding: "8px 12px",
                                  fontSize: "0.88rem",
                                  color: optColor,
                                  background: bg,
                                  border,
                                  borderRadius: 12,
                                  cursor: result ? "default" : "pointer",
                                  width: "100%",
                                  textAlign: "left",
                                  marginBottom: 4,
                                  transition: "all 0.15s",
                                }}
                              >
                                <span style={{ fontWeight: 700, minWidth: 22, color: isCorrect ? "#22c55e" : isWrongChoice ? "#ef4444" : "rgba(255,255,255,0.45)" }}>
                                  {isCorrect ? "✓" : isWrongChoice ? "✗" : String.fromCharCode(65 + oi) + "."}
                                </span>
                                <MathText text={opt} />
                              </button>
                            );
                          })}
                          {result && (
                            <div style={{
                              marginTop: 6, padding: "8px 12px", borderRadius: 10,
                              fontSize: "0.82rem", fontWeight: 700,
                              background: result === "correct" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                              color: result === "correct" ? "#22c55e" : "#ef4444",
                            }}>
                              {result === "correct" ? "Correct! Well done." : `Incorrect. The correct answer is ${String.fromCharCode(65 + correctIdx)}.`}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <QuestionVisualAid
                      subject={subjectKey}
                      topicKey={topicLabel}
                      questionText={q.questionText}
                      marks={q.marks}
                    />

                    {/* Primary actions row */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <button
                        data-testid="practice-mentor-cta"
                        type="button"
                        onClick={() => {
                          setActiveQuestionId(String(q.id));
                          handleToggleAnswer(q.id, q);
                        }}
                        style={{
                          borderRadius: 999,
                          padding: "5px 12px",
                          border: "1px solid rgba(59,130,246,0.3)",
                          backgroundColor: isOpen
                            ? "rgba(59,130,246,0.06)"
                            : "rgba(59,130,246,0.06)",
                          fontSize: "0.78rem",
                          color: "#3b82f6",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{isOpen ? "Hide solution" : "Step-by-Step Solution"}</span>
                      </button>
                    </div>

                    {isOpen && (
                      <div style={{
                        marginTop: 10,
                        padding: "12px 14px",
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <strong style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.85)" }}>
                            Step-by-Step Solution ({q.marks} {q.marks === 1 ? "mark" : "marks"})
                          </strong>
                        </div>

                        {practiceSolutionLoading[q.id] && (
                          <div style={{ fontSize: "0.82rem", color: "#3b82f6", padding: "8px 0" }}>
                            Loading step-by-step solution...
                          </div>
                        )}
                        {practiceSolutionError[q.id] && (
                          <div style={{ fontSize: "0.82rem", color: "#ef4444", padding: "8px 0" }}>
                            {practiceSolutionError[q.id]}
                          </div>
                        )}
                        {practiceSolutionData[q.id] && (
                          <div>
                            {practiceSolutionData[q.id].steps.map((step) => (
                              <div key={step.stepNumber} style={{
                                display: "flex", gap: 10, marginBottom: 8,
                                padding: "8px 10px", background: "rgba(255,255,255,0.03)",
                                borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)",
                              }}>
                                <div style={{
                                  minWidth: 28, height: 28, borderRadius: "50%",
                                  background: "rgba(59,130,246,0.8)", color: "#fff",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                                }}>{step.stepNumber}</div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>
                                    <MathText text={step.description} />
                                    <span style={{
                                      marginLeft: 8, fontSize: "0.7rem", fontWeight: 700,
                                      color: step.marks === 0 ? "rgba(255,255,255,0.4)" : "#60a5fa",
                                      background: step.marks === 0 ? "rgba(255,255,255,0.04)" : "rgba(59,130,246,0.1)",
                                      borderRadius: 999, padding: "1px 7px",
                                    }}>
                                      {step.marks === 0 ? "Explanation" : step.marks === 0.5 ? "½ mark" : step.marks % 1 === 0.5 ? `${Math.floor(step.marks)}½ marks` : `${step.marks} ${step.marks === 1 ? "mark" : "marks"}`}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                                    <MathText text={step.working} />
                                  </div>
                                </div>
                              </div>
                            ))}

                            {practiceSolutionData[q.id].commonMistakes && practiceSolutionData[q.id].commonMistakes!.length > 0 && (
                              <div style={{
                                marginTop: 8, padding: "8px 10px",
                                background: "rgba(239,68,68,0.06)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
                              }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ef4444", marginBottom: 4 }}>
                                  Common Mistakes
                                </div>
                                {practiceSolutionData[q.id].commonMistakes!.map((m, i) => (
                                  <div key={i} style={{ fontSize: "0.75rem", color: "rgba(239,68,68,0.8)", marginBottom: 2 }}>
                                    {"\u2022"} {m}
                                  </div>
                                ))}
                              </div>
                            )}
                            {practiceSolutionData[q.id].examTip && (
                              <div style={{
                                marginTop: 8, padding: "8px 10px",
                                background: "rgba(34,197,94,0.06)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)",
                                fontSize: "0.75rem", color: "#22c55e",
                              }}>
                                <strong>Exam Tip:</strong> {practiceSolutionData[q.id].examTip}
                              </div>
                            )}

                            <button
                              onClick={() => openConceptDrawer(q)}
                              style={{
                                marginTop: 12,
                                width: "100%",
                                padding: "10px 14px",
                                borderRadius: 10,
                                border: "1px solid rgba(206,130,255,0.3)",
                                background: "linear-gradient(135deg, rgba(206,130,255,0.06), rgba(206,130,255,0.08))",
                                color: "#c4b5fd",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                              }}
                            >
                              <span style={{ fontSize: "1rem" }}>{"\uD83D\uDCA1"}</span>
                              Teach me this concept
                            </button>
                            <SolutionChecker
                              question={q.questionText}
                              marks={q.marks}
                              subject={subjectKey}
                              topic={topicLabel}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {isOpen && !selfAssessments[q.id] && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 10,
                          padding: "10px 0 2px",
                          borderTop: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", alignSelf: "center" }}>
                          How did you do?
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const concept = String(q.subtopic ?? "");
                            const diff = String(q.difficulty ?? "Medium");
                            setSelfAssessments((prev) => ({ ...prev, [q.id]: "got_it" }));
                            recordQuestionAnswered();
                            recordPracticeInPhase(canonicalTopicKey || topicParam, authUserForJourney?.uid);
                            setSessionTracker((prev) => recordSelfAssessment(prev, q.id, "got_it", concept, diff));
                            const topicK = canonicalTopicKey || topicParam;
                            const snap = loadTopicMasterySnapshot(topicK);
                            const nodeId = concept || q.id;
                            const updated = upsertNodeProgress(snap, nodeId, { score: 100, status: "correct" });
                            saveTopicMasterySnapshot(updated, topicK);
                          }}
                          style={{
                            borderRadius: 999,
                            padding: "4px 14px",
                            border: "1px solid rgba(34,197,94,0.3)",
                            backgroundColor: "rgba(34,197,94,0.08)",
                            fontSize: "0.76rem",
                            color: "#22c55e",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Got it
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const concept = String(q.subtopic ?? "");
                            const diff = String(q.difficulty ?? "Medium");
                            setSelfAssessments((prev) => ({ ...prev, [q.id]: "need_practice" }));
                            recordQuestionAnswered();
                            recordPracticeInPhase(canonicalTopicKey || topicParam, authUserForJourney?.uid);
                            const nextTracker = recordSelfAssessment(sessionTracker, q.id, "need_practice", concept, diff);

                            const pendingFollowUp = nextTracker.followUpQueue.find(
                              (f) => f.sourceQuestionId === q.id && f.injectedAtIndex === -1
                            );
                            if (pendingFollowUp) {
                              const currentIds = new Set(questions.map((fq) => String(fq.id)));
                              const allCandidates = PredictionCore.getLikelyQuestionsForConcept(
                                canonicalTopicKey || topicParam, undefined
                              );
                              const followUp = findFollowUpQuestion(
                                allCandidates,
                                currentIds,
                                pendingFollowUp.conceptKey,
                                pendingFollowUp.difficulty,
                              );
                              if (followUp) {
                                const sourceIdx = questions.findIndex((fq) => String(fq.id) === q.id);
                                const insertAt = sourceIdx >= 0
                                  ? Math.min(sourceIdx + 2, questions.length)
                                  : Math.min(idx + 2, questions.length);
                                const mapped = mapUnifiedQuestionToPractice(followUp, `followup-${q.id}`);
                                setQuestions((prev) => {
                                  const copy = [...prev];
                                  copy.splice(insertAt, 0, mapped);
                                  return copy;
                                });
                                setSessionTracker(markFollowUpInjected(nextTracker, q.id, insertAt));
                              } else {
                                setSessionTracker(nextTracker);
                              }
                            } else {
                              setSessionTracker(nextTracker);
                            }

                            const topicK = canonicalTopicKey || topicParam;
                            const snap = loadTopicMasterySnapshot(topicK);
                            const nodeId = concept || q.id;
                            const updated = upsertNodeProgress(snap, nodeId, { score: 20, status: "incorrect" });
                            saveTopicMasterySnapshot(updated, topicK);
                          }}
                          style={{
                            borderRadius: 999,
                            padding: "4px 14px",
                            border: "1px solid rgba(239,68,68,0.3)",
                            backgroundColor: "rgba(239,68,68,0.08)",
                            fontSize: "0.76rem",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          Need practice
                        </button>
                      </div>
                    )}
                    {selfAssessments[q.id] && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: "0.76rem",
                          fontWeight: 600,
                          color: selfAssessments[q.id] === "got_it" ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {selfAssessments[q.id] === "got_it" ? "✓ Marked as understood" : "⟳ Follow-up queued"}
                      </div>
                    )}
</article>
                );
              })}
            </div>
          )}

          {(() => {
            const stats = getSessionStats(sessionTracker);
            if (stats.total === 0) return null;
            return (
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.3)",
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  alignItems: "center",
                  fontSize: "0.8rem",
                }}
              >
                <span style={{ fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Session Progress</span>
                <span style={{ color: "#22c55e" }}>✓ {stats.gotIt} got it</span>
                <span style={{ color: "#ef4444" }}>⟳ {stats.needPractice} need practice</span>
                <span style={{ color: "rgba(255,255,255,0.45)" }}>
                  {Math.round(stats.accuracy * 100)}% accuracy
                </span>
              </div>
            );
          })()}
        </section>

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
