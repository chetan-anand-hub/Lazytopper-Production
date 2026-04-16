import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { getCanonicalChapters, getCanonicalChapterBySlug, formatChapterTitle, toCanonicalSubjectId } from "../data/syllabus/cbse10Canonical";
import { getTopicV2Content, normalizeTopicKey } from "../utils/topicHubV2Store";
import { generatePracticeSet } from "../data/practiceSetGenerator";
import ConceptTeachDrawer, { type ConceptTeachContext } from "../components/tutor/ConceptTeachDrawer";
import { navigateToPractice } from "../navigation/practiceNavigation";
import { buildTopicMockUrl } from "../utils/buildUrl";
import { trackUxEvent } from "../services/uxTelemetry";
import ReturnContextBar from "../components/ux/ReturnContextBar";
import { QuestionVisualAid } from "../components/question/QuestionVisualAid";
import { useSmartLearning } from "../engine/smartLearningStore";
import * as gam from "../utils/gamification";
import type { V2Definition } from "../utils/getTopicV2Content";
import type { CanonicalQuestion } from "../data/predictionTypes";
import type { ChapterId } from "../engine/smartLearningTypes";
import { recordDetour, recordLearnEngagement } from "../services/guidedJourneyService";
import { useAuth } from "../context/AuthContext";
import { fetchStepSolution, type StepSolutionResponse } from "../ai/aiClient";
import { VisualExplainer } from "../components/VisualExplainer";
import { getVisualConceptForQuestion } from "../data/questionVisualMap";
import { getVisualsForTopicKey } from "../data/visualConceptRegistry";
import {
  getChapterMasteryLevel,
  recordQuizResult,
  MASTERY_LABELS,
  MASTERY_COLORS,
  MASTERY_ICONS,
  MASTERY_RING_FRACTION,
  MASTERY_POINTS,
  computeWeightedAccuracy,
  type QuizResult,
} from "../services/masteryLevelService";

type SubjectKey = "maths" | "science";

function asSubjectKey(raw: string): SubjectKey {
  return String(raw || "").toLowerCase().includes("science") ? "science" : "maths";
}

function defaultTopicKeyFor(subject: SubjectKey): string {
  const canonicalSubject = toCanonicalSubjectId(subject);
  const chapters = getCanonicalChapters(canonicalSubject);
  return chapters[0]?.canonicalSlug || (subject === "science" ? "chemical-reactions-and-equations" : "real-numbers");
}

function buildTopicOptions(subject: SubjectKey) {
  const canonicalSubject = toCanonicalSubjectId(subject);
  const chapters = getCanonicalChapters(canonicalSubject);
  return chapters.map((ch) => ({
    key: ch.canonicalSlug,
    label: ch.title,
  }));
}

function buildChapterId(grade: string, subject: string, topicKey: string): ChapterId {
  return `${grade}-${subject}-${topicKey}`;
}

const CANONICAL_WEIGHTAGE: Record<string, number> = {
  "real-numbers": 7,
  "polynomials": 6,
  "pair-of-linear-equations": 11,
  "pair-of-linear-equations-in-two-variables": 11,
  "quadratic-equations": 8,
  "arithmetic-progressions": 7,
  "triangles": 10,
  "coordinate-geometry": 7,
  "trigonometry": 10,
  "circles": 6,
  "areas-related-to-circles": 4,
  "surface-areas-and-volumes": 7,
  "statistics": 7,
  "probability": 6,
  "chemical-reactions-and-equations": 8,
  "acids-bases-and-salts": 8,
  "metals-and-non-metals": 8,
  "carbon-and-its-compounds": 8,
  "life-processes": 9,
  "control-and-co-ordination": 7,
  "reproduction": 7,
  "heredity-and-evolution": 6,
  "light-reflection-and-refraction-incl-human-eye-prism": 10,
  "electricity": 9,
  "magnetic-effects-of-electric-current": 7,
  "our-environment": 5,
};

function lookupWeightage(topicKey: string): number {
  return CANONICAL_WEIGHTAGE[topicKey] ?? 5;
}

type RecentTopicRecord = {
  grade: string;
  subject: string;
  topicKey: string;
  topicName?: string;
  path: string;
  updatedAt: string;
};

const TOPICHUB_LAST_ROUTE_KEY = "lazytopper.topicHub.lastRoute.v1";
const TOPICHUB_RECENT_TOPICS_KEY = "lazytopper.topicHub.recentTopics.v1";
const MAX_RECENT_TOPICS = 10;
const TOPIC_MASTERY_KEY_PREFIX = "lazytopper.topicHub.mastery.v1.";
const MAX_CONCEPT_CARDS = 5;


function upsertRecentTopic(list: RecentTopicRecord[], entry: RecentTopicRecord): RecentTopicRecord[] {
  const filtered = list.filter((r) => r.topicKey !== entry.topicKey);
  return [entry, ...filtered].slice(0, MAX_RECENT_TOPICS);
}

interface LessonProgress {
  conceptsCompleted: string[];
  conceptsStarted: string[];
  quizCorrect: number;
  quizTotal: number;
  lessonCompleted: boolean;
}

const EMPTY_PROGRESS: LessonProgress = { conceptsCompleted: [], conceptsStarted: [], quizCorrect: 0, quizTotal: 0, lessonCompleted: false };

function loadLessonProgress(topicKey: string): LessonProgress {
  if (typeof window === "undefined") return { ...EMPTY_PROGRESS };
  try {
    const raw = window.localStorage.getItem(TOPIC_MASTERY_KEY_PREFIX + topicKey);
    if (!raw) return { ...EMPTY_PROGRESS };
    const parsed = JSON.parse(raw) as Partial<LessonProgress>;
    return { ...EMPTY_PROGRESS, ...parsed };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function saveLessonProgress(topicKey: string, progress: LessonProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOPIC_MASTERY_KEY_PREFIX + topicKey, JSON.stringify(progress));
  } catch { /* ignore */ }
}

function buildFallbackStepQuestion(def: V2Definition, topicName: string): CanonicalQuestion {
  return {
    id: `fallback-step-${def.title.replace(/\s+/g, "-").toLowerCase()}`,
    subject: "Maths",
    topicKey: "",
    subtopic: def.title,
    section: "B",
    marks: 3,
    format: "Short" as CanonicalQuestion["format"],
    difficulty: "Medium" as CanonicalQuestion["difficulty"],
    bloomSkill: "Applying" as CanonicalQuestion["bloomSkill"],
    questionText: `Explain the key steps involved in solving a problem related to "${def.title}" in ${topicName}. Write each step clearly.`,
    answer: def.description || `Apply the concept of ${def.title} step by step as taught in ${topicName}.`,
    explanation: def.description || "",
  };
}

function buildFallbackCheckpoint(def: V2Definition, topicName: string): CanonicalQuestion {
  const desc = def.description || "";
  const maxLen = 90;
  const correctAnswer = desc.length > maxLen ? desc.slice(0, maxLen) + "…" : desc;
  const wrongA = `This is a concept from a different chapter, not ${topicName}`;
  const wrongB = `${def.title} is not part of the CBSE Class 10 syllabus`;
  return {
    id: `fallback-${def.title.replace(/\s+/g, "-").toLowerCase()}`,
    subject: "Maths",
    topicKey: "",
    subtopic: def.title,
    section: "A",
    marks: 1,
    format: "MCQ" as CanonicalQuestion["format"],
    difficulty: "Easy" as CanonicalQuestion["difficulty"],
    bloomSkill: "Remembering" as CanonicalQuestion["bloomSkill"],
    questionText: `Which of the following best describes "${def.title}" in ${topicName}?`,
    options: [
      correctAnswer,
      wrongA,
      wrongB,
      "None of the above",
    ],
    answer: correctAnswer,
    explanation: desc,
  };
}

type LessonPhase = "landing" | "menu" | "learning" | "summary";

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  "must-crack": { bg: "rgba(239,68,68,0.1)", text: "#ef4444", label: "Must Crack" },
  "high-roi": { bg: "rgba(59,130,246,0.1)", text: "#3b82f6", label: "High ROI" },
  "good-to-do": { bg: "rgba(249,115,22,0.1)", text: "#f97316", label: "Good to Do" },
};

export default function TopicHub() {
  const params = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const smartLearning = useSmartLearning();
  const { user: authUserForJourney } = useAuth();
  const grade = String(params.grade || sp.get("grade") || "10");
  const subject = asSubjectKey(String(params.subject || sp.get("subject") || "maths"));
  const subjectTitle = subject === "science" ? "Science" : "Maths";

  const rawTopicKey =
    (params as Record<string, string | undefined>).topicKey ||
    sp.get("topicKey") ||
    sp.get("topic") ||
    sp.get("k") ||
    "";

  const topicKey = normalizeTopicKey(rawTopicKey) || defaultTopicKeyFor(subject);
  const navState = (location.state as { back?: string; backLabel?: string } | null) || null;
  const backTo = String(navState?.back || `/trends/${grade}/${subject}`);
  const backLabel = String(navState?.backLabel || "Back to trends");

  useEffect(() => {
    const hasRouteTopicKey = Boolean((params as Record<string, string | undefined>).topicKey);
    if (!hasRouteTopicKey) {
      const target = `/topic-hub/${grade}/${subject}/${topicKey}`;
      if (window.location.pathname !== target) navigate(target, { replace: true });
    }
  }, [grade, subject, topicKey, navigate, params]);

  // Guard: redirect deleted or unknown chapter keys to the subject hub.
  // This prevents broken pages for chapters removed from the 2026-27 syllabus
  // (e.g. Periodic Classification, Management of Natural Resources, Sources of Energy).
  useEffect(() => {
    if (!rawTopicKey) return;
    const canonicalChapter = getCanonicalChapterBySlug(topicKey);
    const canonicalSubjectId = toCanonicalSubjectId(subject);
    if (!canonicalChapter || canonicalChapter.subjectId !== canonicalSubjectId) {
      navigate(`/topic-hub/${grade}/${subject}`, { replace: true });
    }
  }, [rawTopicKey, topicKey, subject, grade, navigate]);

  const v2 = useMemo(() => getTopicV2Content(topicKey), [topicKey]);
  const rawTitle = String(v2?.topicName || topicKey || "").trim() || "Topic";
  const title = (() => { const ch = getCanonicalChapterBySlug(topicKey); return ch ? formatChapterTitle(ch) : rawTitle; })();

  useEffect(() => {
    if (!topicKey) return;
    const uid = authUserForJourney?.uid;
    recordDetour(topicKey, title, uid);
    recordLearnEngagement(topicKey, uid);
    const interval = setInterval(() => {
      recordLearnEngagement(topicKey, uid);
    }, 30_000);
    return () => clearInterval(interval);
  }, [topicKey, title, authUserForJourney?.uid]);
  const tier = String(v2?.tier || "good-to-do");
  const tierStyle = TIER_STYLES[tier] || TIER_STYLES["good-to-do"];
  const weightage = useMemo(() => lookupWeightage(topicKey), [topicKey]);

  const chapterId = useMemo(
    () => buildChapterId(grade, subjectTitle, topicKey),
    [grade, subjectTitle, topicKey]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: RecentTopicRecord = {
      grade: String(grade),
      subject: subjectTitle,
      topicKey: String(topicKey),
      topicName: title,
      path: `/topic-hub/${grade}/${subject}/${topicKey}`,
      updatedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(TOPICHUB_LAST_ROUTE_KEY, JSON.stringify(payload));
      const recentRaw = window.localStorage.getItem(TOPICHUB_RECENT_TOPICS_KEY);
      const recent = recentRaw ? (JSON.parse(recentRaw) as RecentTopicRecord[]) : [];
      const nextRecent = upsertRecentTopic(Array.isArray(recent) ? recent : [], payload);
      window.localStorage.setItem(TOPICHUB_RECENT_TOPICS_KEY, JSON.stringify(nextRecent));
    } catch { /* ignore */ }
  }, [grade, subject, subjectTitle, title, topicKey]);

  const topicOptions = useMemo(() => buildTopicOptions(subject), [subject]);
  const onChangeTopic = useCallback(
    (nextKey: string) => {
      const k = normalizeTopicKey(nextKey);
      if (!k) return;
      navigate(`/topic-hub/${grade}/${subject}/${k}`);
    },
    [navigate, grade, subject]
  );

  const overview = useMemo(() => {
    const raw = v2?.overview;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const allDefinitions = useMemo(() => {
    const raw = v2?.definitions;
    return Array.isArray(raw) ? raw.filter((d): d is V2Definition => Boolean(d?.title)) : [];
  }, [v2]);

  const definitions = useMemo(() => {
    if (allDefinitions.length <= MAX_CONCEPT_CARDS) return allDefinitions;
    return allDefinitions.slice(0, MAX_CONCEPT_CARDS);
  }, [allDefinitions]);

  const examPatterns = useMemo(() => {
    const raw = v2?.examPatterns;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const markingTips = useMemo(() => {
    const raw = v2?.markingTips;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const scoreTips = useMemo(() => {
    const raw = v2?.scoreTips;
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim()).filter(Boolean) : [];
  }, [v2]);

  const conceptMiniQuizzes = useMemo<CanonicalQuestion[][]>(() => {
    const practiceTopicKey = normalizeTopicKey(topicKey) || topicKey;
    return definitions.map((def) => {
      const conceptSet = generatePracticeSet({
        subject: subject as "Maths" | "Science",
        topicKey: practiceTopicKey,
        conceptKey: def.title,
        totalQuestions: 10,
        shuffle: true,
      });
      const conceptPool = (conceptSet.questions || []).filter(
        (q) => Boolean(q.questionText) && Boolean(q.answer)
      );

      const fallbackSet = conceptPool.length < 4 ? generatePracticeSet({
        subject: subject as "Maths" | "Science",
        topicKey: practiceTopicKey,
        totalQuestions: 10,
        shuffle: true,
      }) : { questions: [] };
      const fallbackPool = ((fallbackSet.questions || []) as CanonicalQuestion[]).filter(
        (q) => Boolean(q.questionText) && Boolean(q.answer)
      );

      const pool = [...conceptPool, ...fallbackPool];
      const mcqs = pool.filter((q) => Array.isArray(q.options) && q.options.length >= 2);
      const nonMcqs = pool.filter((q) => !Array.isArray(q.options) || q.options.length < 2);

      const quiz: CanonicalQuestion[] = [];
      const used = new Set<string>();
      const pickUnique = (arr: CanonicalQuestion[]): CanonicalQuestion | null => {
        for (const q of arr) {
          const key = q.id || q.questionText;
          if (!used.has(key)) { used.add(key); return q; }
        }
        return null;
      };

      for (let i = 0; i < 2; i++) {
        const q = pickUnique(mcqs) || buildFallbackCheckpoint(def, title);
        quiz.push(q);
      }
      const shortAnswer = pickUnique(nonMcqs) || (() => {
        const fb = buildFallbackStepQuestion(def, title);
        fb.id = `fallback-short-${def.title.replace(/\s+/g, "-").toLowerCase()}`;
        fb.questionText = `In your own words, explain what "${def.title}" means in ${title} and give one example.`;
        return fb;
      })();
      quiz.push(shortAnswer);

      const stepQ = pickUnique(nonMcqs) || buildFallbackStepQuestion(def, title);
      quiz.push(stepQ);

      return quiz;
    });
  }, [definitions, subject, topicKey, title]);

  const [phase, setPhase] = useState<LessonPhase>("landing");
  const [conceptIdx, setConceptIdx] = useState(0);
  const [showingCheckpoint, setShowingCheckpoint] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [miniQuizIdx, setMiniQuizIdx] = useState(0);
  const [miniQuizAnswers, setMiniQuizAnswers] = useState<{ correct: boolean; isMcq: boolean }[]>([]);
  const [quizSolution, setQuizSolution] = useState<StepSolutionResponse | null>(null);
  const [quizSolutionLoading, setQuizSolutionLoading] = useState(false);
  const [quizSolutionError, setQuizSolutionError] = useState<string | null>(null);
  const quizSolutionFetchRef = useRef<string | null>(null);
  const allDoneConfettiFiredRef = useRef<string | null>(null);

  const [teachDrawerOpen, setTeachDrawerOpen] = useState(false);
  const [teachContext, setTeachContext] = useState<ConceptTeachContext>({
    topicKey,
    subject: subjectTitle,
    questionText: "",
  });

  const [progress, setProgress] = useState<LessonProgress>(() => loadLessonProgress(topicKey));

  useEffect(() => {
    setPhase("landing");
    setConceptIdx(0);
    setShowingCheckpoint(false);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setProgress(loadLessonProgress(topicKey));
    allDoneConfettiFiredRef.current = null;
  }, [topicKey]);

  const totalConcepts = definitions.length;
  const allConceptsDone = progress.conceptsCompleted.length >= totalConcepts && totalConcepts > 0;

  useEffect(() => {
    if (phase === "menu" && allConceptsDone && allDoneConfettiFiredRef.current !== topicKey) {
      allDoneConfettiFiredRef.current = topicKey;
      gam.triggerConfetti();
    }
  }, [phase, allConceptsDone, topicKey]);

  useEffect(() => {
    if (phase !== "landing" || !progress.lessonCompleted) return;
    const sessionKey = `lt.confetti.return.${topicKey}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    gam.triggerConfetti();
  }, [phase, progress.lessonCompleted, topicKey]);

  const updateProgress = useCallback(
    (updater: (prev: LessonProgress) => LessonProgress) => {
      setProgress((prev) => {
        const next = updater(prev);
        saveLessonProgress(topicKey, next);
        return next;
      });
    },
    [topicKey]
  );

  const markConceptCompleted = useCallback(
    (conceptTitle: string) => {
      updateProgress((prev) => {
        if (prev.conceptsCompleted.includes(conceptTitle)) return prev;
        return { ...prev, conceptsCompleted: [...prev.conceptsCompleted, conceptTitle] };
      });
    },
    [updateProgress]
  );

  const recordCheckpointToSmartLearning = useCallback(
    (isCorrect: boolean, question: CanonicalQuestion) => {
      smartLearning.recordHpqAttempt({
        userId: "local",
        chapterId,
        grade,
        subject: subjectTitle as "Maths" | "Science",
        questionId: question.id,
        marks: question.marks,
        difficulty: (question.difficulty as "Easy" | "Medium" | "Hard") || undefined,
        isCorrect,
        timeTakenSeconds: 0,
        source: "other",
        attemptedAt: new Date().toISOString(),
      });
      gam.incrementDailyGoal();
      if (isCorrect) {
        gam.awardXP(10);
        gam.showXPToast(10);
      }
    },
    [smartLearning, chapterId, grade, subjectTitle]
  );

  const recordQuizAnswer = useCallback(
    (correct: boolean, question: CanonicalQuestion) => {
      updateProgress((prev) => ({
        ...prev,
        quizCorrect: prev.quizCorrect + (correct ? 1 : 0),
        quizTotal: prev.quizTotal + 1,
      }));
      recordCheckpointToSmartLearning(correct, question);
    },
    [updateProgress, recordCheckpointToSmartLearning]
  );

  const markLessonCompleted = useCallback(() => {
    updateProgress((prev) => ({ ...prev, lessonCompleted: true }));
  }, [updateProgress]);

  useEffect(() => {
    if (phase === "menu" && progress.conceptsCompleted.length >= totalConcepts && !progress.lessonCompleted) {
      markLessonCompleted();
    }
  }, [phase, progress.conceptsCompleted.length, progress.lessonCompleted, totalConcepts, markLessonCompleted]);

  const [masteryVersion, setMasteryVersion] = useState(0);
  const chapterMasteryLevel = useMemo(() => getChapterMasteryLevel(chapterId), [chapterId, masteryVersion]);

  const startLearning = useCallback(() => {
    setPhase("menu");
    setConceptIdx(0);
    setShowingCheckpoint(false);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setMiniQuizIdx(0);
    setMiniQuizAnswers([]);
  }, []);

  const jumpToConcept = useCallback((idx: number) => {
    const def = (definitions[idx] as V2Definition | undefined);
    if (def) {
      updateProgress((prev) => {
        if (prev.conceptsStarted.includes(def.title)) return prev;
        return { ...prev, conceptsStarted: [...prev.conceptsStarted, def.title] };
      });
    }
    setConceptIdx(idx);
    setShowingCheckpoint(false);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setMiniQuizIdx(0);
    setMiniQuizAnswers([]);
    setConceptFailed(false);
    setPhase("learning");
  }, [definitions, updateProgress]);

  const backToMenu = useCallback(() => {
    setShowingCheckpoint(false);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setMiniQuizIdx(0);
    setMiniQuizAnswers([]);
    setConceptFailed(false);
    setPhase("menu");
  }, []);

  const currentDef = definitions[conceptIdx] as V2Definition | undefined;

  const currentMiniQuiz = conceptMiniQuizzes[conceptIdx] || [];
  const currentMiniQuestion = currentMiniQuiz[miniQuizIdx] as CanonicalQuestion | undefined;

  useEffect(() => {
    if (!answerRevealed || !currentMiniQuestion) {
      setQuizSolution(null);
      setQuizSolutionError(null);
      quizSolutionFetchRef.current = null;
      return;
    }
    const qKey = currentMiniQuestion.id || currentMiniQuestion.questionText;
    if (quizSolutionFetchRef.current === qKey) return;
    quizSolutionFetchRef.current = qKey;
    setQuizSolution(null);
    setQuizSolutionError(null);
    setQuizSolutionLoading(true);
    fetchStepSolution({
      subject: subjectTitle,
      topic: title,
      question: currentMiniQuestion.questionText,
      marks: currentMiniQuestion.marks || 1,
      type: Array.isArray(currentMiniQuestion.options) && currentMiniQuestion.options.length > 0 ? "MCQ" : "Short",
      answer: currentMiniQuestion.answer || "",
      explanation: currentMiniQuestion.explanation || "",
    }).then((sol) => {
      setQuizSolution(sol);
      setQuizSolutionLoading(false);
    }).catch(() => {
      setQuizSolutionError("Could not load solution. See answer above.");
      setQuizSolutionLoading(false);
    });
  }, [answerRevealed, currentMiniQuestion, subjectTitle, title]);

  const quizMatchedVisual = useMemo(() => {
    if (!currentMiniQuestion || !answerRevealed) return null;
    return getVisualConceptForQuestion(currentMiniQuestion);
  }, [currentMiniQuestion, answerRevealed]);

  const conceptMatchedVisual = useMemo(() => {
    if (!currentDef || showingCheckpoint) return null;
    const chapterVisuals = getVisualsForTopicKey(topicKey);
    if (chapterVisuals.length === 0) return null;
    const STOP = new Set(["and", "the", "not", "non", "for", "its", "are", "of", "using", "with"]);
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const conceptWords = norm(currentDef.title).split(" ").filter((w) => w.length >= 3 && !STOP.has(w));
    let bestMatch = chapterVisuals[0];
    let bestScore = 0;
    for (const v of chapterVisuals) {
      const titleWords = norm(v.title).split(" ").filter((w) => w.length >= 3 && !STOP.has(w));
      let score = 0;
      for (const tw of titleWords) {
        for (const cw of conceptWords) {
          if (tw.includes(cw) || cw.includes(tw)) score += 2;
        }
      }
      if (score > bestScore) { bestScore = score; bestMatch = v; }
    }
    return bestMatch;
  }, [currentDef, showingCheckpoint, topicKey]);

  const [conceptFailed, setConceptFailed] = useState(false);

  const advanceMiniQuiz = useCallback((opts?: { onConceptPass?: () => void }) => {
    if (miniQuizIdx < currentMiniQuiz.length - 1) {
      setMiniQuizIdx((i) => i + 1);
      setSelectedAnswer(null);
      setAnswerRevealed(false);
    } else {
      const quizResult: QuizResult = {
        totalQuestions: miniQuizAnswers.length,
        correctAnswers: miniQuizAnswers.filter((a) => a.correct).length,
        mcqCount: miniQuizAnswers.filter((a) => a.isMcq).length,
        mcqCorrect: miniQuizAnswers.filter((a) => a.isMcq && a.correct).length,
        nonMcqCount: miniQuizAnswers.filter((a) => !a.isMcq).length,
        nonMcqCorrect: miniQuizAnswers.filter((a) => !a.isMcq && a.correct).length,
      };
      recordQuizResult(chapterId, quizResult, false);
      setMasteryVersion((v) => v + 1);

      const accuracy = computeWeightedAccuracy(quizResult);
      const passed = accuracy >= 70;

      if (passed && currentDef) {
        markConceptCompleted(currentDef.title);
      }

      if (!passed) {
        setConceptFailed(true);
        return;
      }

      setShowingCheckpoint(false);
      setSelectedAnswer(null);
      setAnswerRevealed(false);
      setMiniQuizIdx(0);
      setMiniQuizAnswers([]);
      setConceptFailed(false);

      if (opts?.onConceptPass) {
        opts.onConceptPass();
      } else {
        setPhase("menu");
      }
    }
  }, [miniQuizIdx, currentMiniQuiz, miniQuizAnswers, currentDef, markConceptCompleted, chapterId]);

  const retryConcept = useCallback(() => {
    setShowingCheckpoint(true);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
    setMiniQuizIdx(0);
    setMiniQuizAnswers([]);
    setConceptFailed(false);
  }, []);

  const advanceToNext = useCallback(() => {
    advanceMiniQuiz();
  }, [advanceMiniQuiz]);

  const advanceToNextConcept = useCallback(() => {
    advanceMiniQuiz({
      onConceptPass: () => {
        if (conceptIdx < totalConcepts - 1) {
          const nextDef = definitions[conceptIdx + 1] as V2Definition | undefined;
          if (nextDef) {
            updateProgress((prev) => {
              if (prev.conceptsStarted.includes(nextDef.title)) return prev;
              return { ...prev, conceptsStarted: [...prev.conceptsStarted, nextDef.title] };
            });
          }
          setConceptIdx(conceptIdx + 1);
          setPhase("learning");
        } else {
          markLessonCompleted();
          setPhase("menu");
        }
      },
    });
  }, [advanceMiniQuiz, conceptIdx, totalConcepts, markLessonCompleted, definitions, updateProgress]);

  const handleCheckpointAnswer = useCallback(
    (option: string) => {
      if (answerRevealed || !currentMiniQuestion) return;
      setSelectedAnswer(option);
      setAnswerRevealed(true);
      const isSelfMark = option === "correct" || option === "incorrect";
      const isCorrect = isSelfMark
        ? option === "correct"
        : option.trim().toLowerCase() === (currentMiniQuestion.answer || "").trim().toLowerCase();
      const isMcq = Array.isArray(currentMiniQuestion.options) && currentMiniQuestion.options.length >= 2;
      setMiniQuizAnswers((prev) => [...prev, { correct: isCorrect, isMcq }]);
      recordQuizAnswer(isCorrect, currentMiniQuestion);
    },
    [answerRevealed, currentMiniQuestion, recordQuizAnswer]
  );

  const openTeachDrawer = useCallback(
    (concept: string, questionText: string, subtopic?: string) => {
      setTeachContext({ topicKey, subject: subjectTitle, questionText, subtopic, concept });
      setTeachDrawerOpen(true);
      trackUxEvent("topichub_open_teach", "TopicHub", { topicKey, concept });
    },
    [topicKey, subjectTitle]
  );

  const goToPractice = useCallback(() => {
    trackUxEvent("topichub_open_practice", "TopicHub", { topicKey });
    navigateToPractice(navigate, {
      grade,
      subject: subjectTitle as "Maths" | "Science",
      topicKey,
      topicName: title,
      backPath: `/topic-hub/${grade}/${subject}/${topicKey}`,
      backLabel: `Back to ${title}`,
      source: "topichub",
    });
  }, [grade, navigate, subject, subjectTitle, title, topicKey]);

  const hasEnoughContent = totalConcepts >= 1;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "16px 16px 80px" }}>

        <ReturnContextBar backTo={backTo} backLabel={backLabel} currentLabel="Chapter Hub" />

        {phase !== "learning" && (
          <div style={{ marginTop: 12 }}>
            <select
              value={topicKey}
              onChange={(e) => onChangeTopic(e.target.value)}
              style={{
                padding: "6px 12px", borderRadius: 10, border: "1px solid var(--bg-card-border)",
                fontSize: "0.82rem", color: "var(--text-muted)", background: "var(--bg-card)", cursor: "pointer",
              }}
            >
              {topicOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {phase === "landing" && (
          <div style={{
            marginTop: 20, background: "var(--bg-card)", borderRadius: 20, padding: "28px 24px",
            border: "1px solid var(--bg-card-border)", textAlign: "center",
            boxShadow: "0 2px 12px rgba(88,204,2,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                {title}
              </h1>
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px",
                borderRadius: 999, background: tierStyle.bg, color: tierStyle.text,
              }}>
                {tierStyle.label}
              </span>
            </div>

            {overview.length > 0 && (
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.6, marginTop: 12, maxWidth: 560, marginInline: "auto" }}>
                {overview[0]}
              </p>
            )}

            {progress.lessonCompleted && (
              <div style={{
                marginTop: 16,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "linear-gradient(135deg, rgba(88,204,2,0.15) 0%, rgba(255,200,0,0.15) 100%)",
                border: "1.5px solid rgba(88,204,2,0.4)",
                borderRadius: 14,
                padding: "10px 20px",
              }}>
                <span style={{ fontSize: "1.3rem" }}>🏆</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#58cc02", lineHeight: 1.2 }}>
                    Chapter Mastered!
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 500 }}>
                    You've completed all concepts in this chapter
                  </div>
                </div>
              </div>
            )}

            <div style={{
              marginTop: 20, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-accent)" }}>{totalConcepts}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Concepts</div>
              </div>
              {weightage > 0 && (
                <div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-warning)" }}>~{weightage}%</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>Exam Weightage</div>
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: MASTERY_COLORS[chapterMasteryLevel] }}>
                  {MASTERY_ICONS[chapterMasteryLevel]}
                </div>
                <div style={{ fontSize: "0.75rem", color: MASTERY_COLORS[chapterMasteryLevel], fontWeight: 600 }}>
                  {MASTERY_LABELS[chapterMasteryLevel]}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  {MASTERY_POINTS[chapterMasteryLevel]}pts
                </div>
              </div>
            </div>

            {chapterMasteryLevel !== "not_started" && (
              <div style={{
                marginTop: 16, height: 8, borderRadius: 999, background: "var(--bg-card-border)",
                overflow: "hidden", maxWidth: 300, marginInline: "auto",
              }}>
                <div style={{
                  height: "100%", borderRadius: 999, transition: "width 0.4s ease",
                  width: `${MASTERY_RING_FRACTION[chapterMasteryLevel] * 100}%`,
                  background: MASTERY_COLORS[chapterMasteryLevel],
                }} />
              </div>
            )}

            {allDefinitions.length > 0 && (
              <div style={{
                marginTop: 20, textAlign: "left",
                background: "var(--bg)", borderRadius: 14, padding: "14px 18px",
                border: "1px solid var(--bg-card-border)",
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 8 }}>
                  Key Definitions Preview
                </div>
                {allDefinitions.slice(0, 3).map((d, idx) => (
                  <div key={idx} style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{d.title}</span> — {d.description}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={startLearning}
              disabled={!hasEnoughContent}
              style={{
                marginTop: 24, padding: "14px 40px", borderRadius: 14,
                background: hasEnoughContent
                  ? "#22c55e"
                  : "var(--bg-card)",
                border: "none", color: "var(--text)", fontWeight: 700, fontSize: "1rem",
                cursor: hasEnoughContent ? "pointer" : "not-allowed",
                boxShadow: hasEnoughContent ? "0 4px 14px rgba(88,204,2,0.12)" : "none",
                transition: "transform 0.15s",
              }}
              onMouseDown={(e) => { if (hasEnoughContent) (e.target as HTMLElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
            >
              {progress.lessonCompleted ? "Review Again" : chapterMasteryLevel !== "not_started" ? "Continue Learning" : "Start Learning"}
            </button>

            <button
              type="button"
              onClick={() => {
                trackUxEvent("topichub_topic_mock_click", "TopicHub", { topicKey, destination: "chapter_test" });
                navigate(
                  buildTopicMockUrl(grade, subjectTitle, topicKey),
                  {
                    state: {
                      back: `/topic-hub/${grade}/${subject}/${topicKey}`,
                      backLabel: `Back to ${title}`,
                    },
                  }
                );
              }}
              style={{
                marginTop: 10, padding: "10px 28px", borderRadius: 14,
                background: "transparent",
                border: "1px solid var(--bg-card-border)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              or take a Chapter Test
            </button>

            {!hasEnoughContent && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
                Content for this topic is being prepared.
              </p>
            )}

            {scoreTips.length > 0 && (
              <div style={{
                marginTop: 24, background: "rgba(99,102,241,0.06)",
                borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(99,102,241,0.2)",
                textAlign: "left",
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--color-accent-dark)", marginBottom: 8 }}>
                  Score Maximizer Tips
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {scoreTips.slice(0, 3).map((tip, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4, lineHeight: 1.5 }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {phase === "menu" && (() => {
          const allDone = totalConcepts > 0 && progress.conceptsCompleted.length >= totalConcepts;
          return (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                    {title}
                  </h2>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {progress.conceptsCompleted.length} of {totalConcepts} concepts done
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhase("landing")}
                  style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid var(--bg-card-border)", background: "var(--bg-card)", color: "var(--text-muted)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
                >
                  ← Overview
                </button>
              </div>

              <div style={{ height: 6, borderRadius: 999, background: "var(--bg-card-border)", overflow: "hidden", marginBottom: 16 }}>
                <div style={{
                  height: "100%", borderRadius: 999, transition: "width 0.4s ease",
                  width: `${(progress.conceptsCompleted.length / Math.max(totalConcepts, 1)) * 100}%`,
                  background: allDone ? "linear-gradient(90deg,#f59e0b,#d97706)" : "linear-gradient(90deg,#22c55e,#16a34a)",
                }} />
              </div>

              {allDone && (
                <div style={{
                  marginBottom: 18,
                  borderRadius: 16,
                  background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.08))",
                  border: "1.5px solid rgba(245,158,11,0.4)",
                  padding: "18px 18px 14px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: 4 }}>🏅</div>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#d97706", marginBottom: 2 }}>
                    All concepts mastered!
                  </div>
                  <div style={{
                    display: "inline-block",
                    background: "linear-gradient(90deg,#f59e0b,#d97706)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    borderRadius: 999,
                    padding: "3px 12px",
                    marginBottom: 14,
                  }}>
                    Chapter Mastery Badge
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={goToPractice}
                      style={{
                        padding: "10px 18px", borderRadius: 12,
                        background: "var(--bg-card)",
                        border: "1.5px solid rgba(245,158,11,0.4)",
                        color: "var(--text)",
                        fontWeight: 700, fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      Practice Questions →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        trackUxEvent("topichub_all_done_banner_chapter_test", "TopicHub", { topicKey });
                        navigate(
                          buildTopicMockUrl(grade, subjectTitle, topicKey),
                          { state: { back: `/topic-hub/${grade}/${subject}/${topicKey}`, backLabel: `Back to ${title}` } }
                        );
                      }}
                      style={{
                        padding: "10px 18px", borderRadius: 12,
                        background: "linear-gradient(135deg,#f59e0b,#d97706)",
                        border: "none",
                        color: "#fff",
                        fontWeight: 700, fontSize: "0.85rem",
                        cursor: "pointer",
                        boxShadow: "0 3px 10px rgba(245,158,11,0.35)",
                      }}
                    >
                      Take Chapter Test 🏆
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {definitions.map((def, idx) => {
                  const defTitle = (def as V2Definition).title;
                  const isDone = progress.conceptsCompleted.includes(defTitle);
                  const isInProgress = !isDone && progress.conceptsStarted.includes(defTitle);
                  const status: "done" | "inprogress" | "notstarted" = isDone ? "done" : isInProgress ? "inprogress" : "notstarted";
                  const statusLabel = status === "done" ? "Done" : status === "inprogress" ? "In Progress" : "Not Started";
                  const statusColor = status === "done" ? "#22c55e" : status === "inprogress" ? "#f59e0b" : "var(--color-accent)";
                  const statusBg = status === "done" ? "rgba(34,197,94,0.12)" : status === "inprogress" ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.08)";
                  const cardBorder = status === "done" ? "1.5px solid rgba(34,197,94,0.35)" : status === "inprogress" ? "1.5px solid rgba(245,158,11,0.3)" : "1px solid var(--bg-card-border)";
                  const cardBg = status === "done" ? "rgba(34,197,94,0.05)" : status === "inprogress" ? "rgba(245,158,11,0.04)" : "var(--bg-card)";
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => jumpToConcept(idx)}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 14,
                        padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                        border: cardBorder,
                        background: cardBg,
                        textAlign: "left", width: "100%",
                        transition: "transform 0.12s, box-shadow 0.12s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 999, flexShrink: 0, display: "flex",
                        alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem",
                        background: statusBg,
                        color: statusColor,
                      }}>
                        {status === "done" ? "✓" : status === "inprogress" ? "…" : idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text)", marginBottom: 3 }}>
                          {(def as V2Definition).title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {(def as V2Definition).description}
                        </div>
                      </div>
                      <div style={{
                        fontSize: "0.68rem", fontWeight: 700, padding: "3px 9px", borderRadius: 999, flexShrink: 0,
                        background: statusBg,
                        color: statusColor,
                      }}>
                        {statusLabel}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    trackUxEvent("topichub_topic_mock_click", "TopicHub", { topicKey, destination: "chapter_test" });
                    navigate(
                      buildTopicMockUrl(grade, subjectTitle, topicKey),
                      { state: { back: `/topic-hub/${grade}/${subject}/${topicKey}`, backLabel: `Back to ${title}` } }
                    );
                  }}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 14,
                    background: allDone ? "linear-gradient(135deg,#f59e0b,#d97706)" : "transparent",
                    border: allDone ? "none" : "1px solid var(--bg-card-border)",
                    color: allDone ? "var(--text)" : "var(--text-muted)",
                    fontWeight: 700, fontSize: allDone ? "0.95rem" : "0.85rem",
                    cursor: "pointer", boxShadow: allDone ? "0 4px 14px rgba(245,158,11,0.3)" : "none",
                  }}
                >
                  {allDone ? "🏆 Take Chapter Test — All concepts done!" : "Take Chapter Test"}
                </button>
              </div>
            </div>
          );
        })()}

        {phase === "learning" && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 6,
            }}>
              <button
                type="button"
                onClick={backToMenu}
                style={{
                  padding: "4px 12px", borderRadius: 8, border: "1px solid var(--bg-card-border)",
                  background: "var(--bg-card)", color: "var(--text-muted)", fontSize: "0.78rem",
                  fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                }}
              >
                ← Concepts
              </button>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {progress.conceptsCompleted.length}/{totalConcepts} done
              </span>
            </div>

            <div style={{
              height: 6, borderRadius: 999, background: "var(--bg-card-border)", overflow: "hidden",
              marginBottom: 16,
            }}>
              <div style={{
                height: "100%", borderRadius: 999, transition: "width 0.3s ease",
                width: `${(progress.conceptsCompleted.length / Math.max(totalConcepts, 1)) * 100}%`,
                background: "linear-gradient(90deg, #22c55e, #16a34a)",
              }} />
            </div>

            {!showingCheckpoint && currentDef && (
              <div style={{
                background: "var(--bg-card)", borderRadius: 18, padding: "22px 22px",
                border: "1px solid var(--bg-card-border)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: "rgba(99,102,241,0.08)", color: "var(--color-accent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: "0.85rem", flexShrink: 0,
                  }}>
                    {conceptIdx + 1}
                  </span>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>
                    {currentDef.title}
                  </h2>
                </div>

                {conceptMatchedVisual ? (
                  <div style={{ marginBottom: 14, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(99,102,241,0.2)" }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-accent)", padding: "6px 12px", background: "rgba(99,102,241,0.06)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                      🎛 Interactive — {conceptMatchedVisual.title}
                    </div>
                    <VisualExplainer
                      src={conceptMatchedVisual.filePath}
                      title={conceptMatchedVisual.title}
                      height={320}
                      collapsible={false}
                    />
                  </div>
                ) : (
                  <QuestionVisualAid
                    subject={subjectTitle}
                    topicKey={topicKey}
                    questionText={`${currentDef.title} ${currentDef.description || ""}`}
                  />
                )}

                <div style={{
                  fontSize: "0.9rem", color: "var(--text)", lineHeight: 1.7,
                  padding: "12px 16px", background: "var(--bg)", borderRadius: 12,
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--color-accent)", marginBottom: 4 }}>
                    What it means
                  </div>
                  {currentDef.description}
                </div>

                {currentDef.examTip && (
                  <div style={{
                    marginTop: 12, fontSize: "0.82rem", color: "var(--color-warning)",
                    padding: "10px 16px", background: "rgba(250,204,21,0.06)", borderRadius: 12,
                    border: "1px solid rgba(250,204,21,0.2)",
                  }}>
                    <span style={{ fontWeight: 700 }}>Exam line: </span>
                    {currentDef.examTip}
                  </div>
                )}

                {examPatterns[conceptIdx] && (
                  <div style={{
                    marginTop: 10, fontSize: "0.82rem", color: "var(--text-muted)",
                    padding: "10px 16px", background: "rgba(34,197,94,0.06)", borderRadius: 12,
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}>
                    <span style={{ fontWeight: 700, color: "var(--primary-dark)" }}>When to use: </span>
                    {examPatterns[conceptIdx]}
                  </div>
                )}

                {markingTips[conceptIdx] && (
                  <div style={{
                    marginTop: 10, fontSize: "0.82rem", color: "var(--color-dark-red)",
                    padding: "10px 16px", background: "rgba(239,68,68,0.06)", borderRadius: 12,
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}>
                    <span style={{ fontWeight: 700 }}>Trap: </span>
                    {markingTips[conceptIdx]}
                  </div>
                )}

                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => openTeachDrawer(
                      currentDef.title,
                      `Teach me about "${currentDef.title}" in ${title}. ${currentDef.description}`,
                      currentDef.title
                    )}
                    style={{
                      padding: "8px 16px", borderRadius: 10,
                      background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
                      color: "var(--color-accent-dark)", fontWeight: 600, fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    Teach Me
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowingCheckpoint(true);
                      setSelectedAnswer(null);
                      setAnswerRevealed(false);
                      setMiniQuizIdx(0);
                      setMiniQuizAnswers([]);
                    }}
                    style={{
                      padding: "8px 20px", borderRadius: 10,
                      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                      border: "none", color: "var(--text)", fontWeight: 600,
                      fontSize: "0.82rem", cursor: "pointer",
                    }}
                  >
                    Got it → Quick Check
                  </button>
                </div>
              </div>
            )}

            {showingCheckpoint && currentMiniQuestion && (
              <div style={{
                background: "var(--bg-card)", borderRadius: 18, padding: "22px 22px",
                border: "2px solid #6366f1",
                boxShadow: "0 2px 12px rgba(88,204,2,0.12)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{
                    fontSize: "0.78rem", fontWeight: 700, padding: "3px 10px",
                    borderRadius: 999, background: "rgba(99,102,241,0.08)", color: "var(--color-accent)",
                  }}>
                    Mini Quiz — Q{miniQuizIdx + 1}/{currentMiniQuiz.length}
                  </span>
                  <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
                    {currentMiniQuiz.map((_, qi) => (
                      <div key={qi} style={{
                        width: 8, height: 8, borderRadius: 4,
                        background: qi < miniQuizAnswers.length
                          ? miniQuizAnswers[qi]?.correct ? "#22c55e" : "#ef4444"
                          : qi === miniQuizIdx ? "#818cf8" : "var(--bg-card)",
                      }} />
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: "0.92rem", color: "var(--text)", lineHeight: 1.6, fontWeight: 600, marginBottom: 16 }}>
                  {currentMiniQuestion.questionText}
                </div>

                {Array.isArray(currentMiniQuestion.options) && currentMiniQuestion.options.length >= 2 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {currentMiniQuestion.options.map((option, idx) => {
                      const isSelected = selectedAnswer === option;
                      const correctAnswer = (currentMiniQuestion.answer || "").trim().toLowerCase();
                      const isCorrect = option.trim().toLowerCase() === correctAnswer;
                      let borderColor = "var(--bg-card)";
                      let bg = "var(--bg-card)";
                      let textColor = "var(--text)";
                      if (answerRevealed) {
                        if (isCorrect) { borderColor = "rgba(34,197,94,0.3)"; bg = "rgba(34,197,94,0.08)"; textColor = "#22c55e"; }
                        else if (isSelected && !isCorrect) { borderColor = "rgba(239,68,68,0.3)"; bg = "rgba(239,68,68,0.08)"; textColor = "#ef4444"; }
                      } else if (isSelected) { borderColor = "rgba(99,102,241,0.4)"; bg = "rgba(99,102,241,0.08)"; }
                      return (
                        <button key={idx} type="button" onClick={() => handleCheckpointAnswer(option)} disabled={answerRevealed}
                          style={{ padding: "12px 16px", borderRadius: 12, border: `2px solid ${borderColor}`, background: bg, color: textColor, fontWeight: 500, fontSize: "0.85rem", cursor: answerRevealed ? "default" : "pointer", textAlign: "left", transition: "all 0.15s", opacity: answerRevealed && !isSelected && !isCorrect ? 0.5 : 1 }}>
                          <span style={{ fontWeight: 700, marginRight: 8 }}>{String.fromCharCode(65 + idx)}.</span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  !answerRevealed && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => handleCheckpointAnswer("correct")}
                        style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #22c55e", background: "rgba(34,197,94,0.08)", color: "var(--color-success)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                        I got it right
                      </button>
                      <button type="button" onClick={() => handleCheckpointAnswer("incorrect")}
                        style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "var(--color-error)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}>
                        I got it wrong
                      </button>
                    </div>
                  )
                )}

                {conceptFailed && (
                  <div style={{ marginTop: 16, textAlign: "center", padding: 20, background: "rgba(249,115,22,0.06)", borderRadius: 14, border: "1px solid rgba(249,115,22,0.2)" }}>
                    <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📝</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-orange)", marginBottom: 6 }}>Not quite there yet</div>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 14 }}>
                      You need 70%+ to mark this concept as familiar. Review the material and try again.
                    </p>
                    <button type="button" onClick={retryConcept}
                      style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #f97316, #ea580c)", border: "none", color: "var(--text)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                      Retry Quiz
                    </button>
                  </div>
                )}

                {answerRevealed && !conceptFailed && (
                  <div style={{ marginTop: 16 }}>
                    {/* Correct / Wrong header */}
                    {(selectedAnswer === "correct" || (selectedAnswer && selectedAnswer !== "incorrect" && selectedAnswer.trim().toLowerCase() === (currentMiniQuestion.answer || "").trim().toLowerCase())) ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.92rem", color: "var(--primary-dark)", fontWeight: 700, marginBottom: 12, padding: "10px 14px", background: "rgba(34,197,94,0.06)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.15)" }}>
                        <span style={{ fontSize: "1.1rem" }}>✓</span> Correct!
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.88rem", color: "var(--color-error)", fontWeight: 700, marginBottom: 12, padding: "10px 14px", background: "rgba(239,68,68,0.06)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.15)" }}>
                        <span style={{ fontSize: "1.1rem" }}>✗</span> Not quite — correct answer: <span style={{ color: "var(--color-success)" }}>{currentMiniQuestion.answer}</span>
                      </div>
                    )}

                    {/* Visual diagram if matched */}
                    {quizMatchedVisual && (
                      <div style={{ marginBottom: 14, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(99,102,241,0.2)" }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-accent)", padding: "6px 12px", background: "rgba(99,102,241,0.06)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                          📊 Visual Aid — {quizMatchedVisual.title}
                        </div>
                        <VisualExplainer
                          src={quizMatchedVisual.filePath}
                          title={quizMatchedVisual.title}
                          height={260}
                          collapsible={false}
                        />
                      </div>
                    )}

                    {/* Step-by-step solution */}
                    <div style={{ marginBottom: 14, padding: "12px 14px", background: "rgba(59,130,246,0.04)", borderRadius: 12, border: "1px solid rgba(59,130,246,0.15)" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-light-blue)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
                        📋 CBSE Step-by-Step Solution ({currentMiniQuestion.marks || 1} {(currentMiniQuestion.marks || 1) === 1 ? "mark" : "marks"})
                      </div>

                      {quizSolutionLoading && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "8px 0", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: "50%", border: "2px solid #3b82f6", borderTopColor: "transparent", animation: "visualSpin 0.8s linear infinite" }} />
                          Generating solution…
                        </div>
                      )}

                      {quizSolutionError && !quizSolution && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "4px 0" }}>
                          {quizSolutionError}
                        </div>
                      )}

                      {quizSolution && quizSolution.steps.map((step, si) => (
                        <div key={si} style={{ display: "flex", gap: 10, marginBottom: 8, padding: "8px 10px", background: "var(--bg-card)", borderRadius: 8, border: "1px solid var(--bg-card-border)" }}>
                          <div style={{ minWidth: 24, height: 24, borderRadius: "50%", background: "rgba(59,130,246,0.8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 }}>
                            {step.stepNumber}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)", marginBottom: 2, display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ flex: 1 }}>{step.description}</span>
                              <span style={{ fontSize: "0.68rem", fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: step.marks === 0 ? "var(--bg-card)" : "rgba(59,130,246,0.12)", color: step.marks === 0 ? "var(--text-muted)" : "#60a5fa", flexShrink: 0 }}>
                                {step.marks === 0 ? "Explanation" : step.marks === 0.5 ? "½ mark" : step.marks % 1 === 0.5 ? `${Math.floor(step.marks)}½ marks` : `${step.marks} ${step.marks === 1 ? "mark" : "marks"}`}
                              </span>
                            </div>
                            {step.working && (
                              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.5 }}>{step.working}</div>
                            )}
                          </div>
                        </div>
                      ))}

                      {quizSolution && quizSolution.commonMistakes && quizSolution.commonMistakes.length > 0 && (
                        <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(239,68,68,0.04)", borderRadius: 8, border: "1px solid rgba(239,68,68,0.15)" }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--color-pink-red)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>⚠ Common Mistakes</div>
                          {quizSolution.commonMistakes.map((m, i) => (
                            <div key={i} style={{ fontSize: "0.76rem", color: "rgba(248,113,113,0.85)", marginBottom: 2 }}>• {m}</div>
                          ))}
                        </div>
                      )}

                      {quizSolution?.examTip && (
                        <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(249,115,22,0.04)", borderRadius: 8, border: "1px solid rgba(249,115,22,0.15)" }}>
                          <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--color-orange)", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.4 }}>💡 Exam Tip</div>
                          <div style={{ fontSize: "0.76rem", color: "rgba(251,146,60,0.9)" }}>{quizSolution.examTip}</div>
                        </div>
                      )}
                    </div>

                    {miniQuizIdx < currentMiniQuiz.length - 1 ? (
                      <button type="button" onClick={advanceToNext}
                        style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #6366f1, #4f46e5)", border: "none", color: "var(--text)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}>
                        {`Next Question (${miniQuizIdx + 2}/${currentMiniQuiz.length})`}
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={advanceToNext}
                          style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg, #22c55e, #16a34a)", border: "none", color: "var(--text)", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer" }}>
                          ← Back to Concepts
                        </button>
                        {conceptIdx < totalConcepts - 1 && (
                          <button type="button" onClick={advanceToNextConcept}
                            style={{ padding: "10px 20px", borderRadius: 12, background: "var(--bg-card)", border: "1px solid var(--bg-card-border)", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}>
                            Next Concept →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!currentDef && (
              <div style={{
                background: "var(--bg-card)", borderRadius: 18, padding: "24px", textAlign: "center",
                border: "1px solid var(--bg-card-border)",
              }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  No more concepts to review. You've covered everything!
                </p>
                <button
                  type="button"
                  onClick={() => { markLessonCompleted(); setPhase("summary"); }}
                  style={{
                    marginTop: 12, padding: "10px 24px", borderRadius: 12,
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    border: "none", color: "var(--text)", fontWeight: 600,
                    fontSize: "0.88rem", cursor: "pointer",
                  }}
                >
                  See Summary
                </button>
              </div>
            )}
          </div>
        )}

        {phase === "summary" && (
          <div style={{
            marginTop: 20, background: "var(--bg-card)", borderRadius: 20, padding: "28px 24px",
            border: "1px solid var(--bg-card-border)", textAlign: "center",
            boxShadow: "0 2px 12px rgba(88,204,2,0.12)",
          }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>
              Lesson Complete!
            </h2>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginTop: 8 }}>
              You've covered all {totalConcepts} concepts in {title}
            </p>

            <div style={{
              marginTop: 20, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
            }}>
              <div style={{
                padding: "16px 24px", background: "rgba(34,197,94,0.06)", borderRadius: 14,
                border: "1px solid rgba(34,197,94,0.2)",
              }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--primary-dark)" }}>
                  {progress.conceptsCompleted.length}/{totalConcepts}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginTop: 2 }}>
                  Concepts Learned
                </div>
              </div>
              {progress.quizTotal > 0 && (
                <div style={{
                  padding: "16px 24px", background: "rgba(99,102,241,0.08)", borderRadius: 14,
                  border: "1px solid rgba(99,102,241,0.2)",
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-accent)" }}>
                    {progress.quizCorrect}/{progress.quizTotal}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500, marginTop: 2 }}>
                    Quiz Score
                  </div>
                </div>
              )}
            </div>

            <div style={{
              marginTop: 20, display: "inline-flex", alignItems: "center", gap: 10,
              padding: "10px 18px", borderRadius: 14,
              background: `${MASTERY_COLORS[chapterMasteryLevel]}15`,
              border: `1px solid ${MASTERY_COLORS[chapterMasteryLevel]}40`,
            }}>
              <span style={{ fontSize: 18 }}>{MASTERY_ICONS[chapterMasteryLevel]}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Your Progress</div>
                <div style={{ fontSize: "0.92rem", fontWeight: 800, color: MASTERY_COLORS[chapterMasteryLevel] }}>
                  {MASTERY_LABELS[chapterMasteryLevel]}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={goToPractice}
                style={{
                  padding: "14px 28px", borderRadius: 14,
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  border: "none", color: "var(--text)", fontWeight: 700, fontSize: "0.95rem",
                  cursor: "pointer", boxShadow: "0 4px 14px rgba(88,204,2,0.3)",
                }}
              >
                Practice Now →
              </button>
              <button
                type="button"
                onClick={() => navigate(`/chapter-test/${grade}/${subject}/${topicKey}`, {
                  state: { back: `/topic-hub/${grade}/${subject}/${topicKey}`, backLabel: `Back to ${title}` },
                })}
                style={{
                  padding: "14px 28px", borderRadius: 14,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none", color: "var(--text)", fontWeight: 700, fontSize: "0.95rem",
                  cursor: "pointer",
                }}
              >
                Take Chapter Test 🏆
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={startLearning}
                style={{
                  padding: "8px 20px", borderRadius: 10,
                  background: "none", border: "1px solid var(--bg-card-border)",
                  color: "var(--text-muted)", fontWeight: 500, fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Review Again
              </button>
            </div>
          </div>
        )}
      </div>

      <ConceptTeachDrawer
        open={teachDrawerOpen}
        onClose={() => setTeachDrawerOpen(false)}
        context={teachContext}
      />
    </div>
  );
}
