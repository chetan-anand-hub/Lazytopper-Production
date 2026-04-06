import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { getCanonicalChapters, toCanonicalSubjectId } from "../data/syllabus/cbse10Canonical";
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
import { recordDetour, recordLearnEngagement, getGuidedJourneyState } from "../services/guidedJourneyService";
import { useAuth } from "../context/AuthContext";

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
const MIN_CONCEPT_CARDS = 3;

function upsertRecentTopic(list: RecentTopicRecord[], entry: RecentTopicRecord): RecentTopicRecord[] {
  const filtered = list.filter((r) => r.topicKey !== entry.topicKey);
  return [entry, ...filtered].slice(0, MAX_RECENT_TOPICS);
}

interface LessonProgress {
  conceptsCompleted: string[];
  quizCorrect: number;
  quizTotal: number;
  lessonCompleted: boolean;
}

function loadLessonProgress(topicKey: string): LessonProgress {
  if (typeof window === "undefined") return { conceptsCompleted: [], quizCorrect: 0, quizTotal: 0, lessonCompleted: false };
  try {
    const raw = window.localStorage.getItem(TOPIC_MASTERY_KEY_PREFIX + topicKey);
    if (!raw) return { conceptsCompleted: [], quizCorrect: 0, quizTotal: 0, lessonCompleted: false };
    return JSON.parse(raw) as LessonProgress;
  } catch {
    return { conceptsCompleted: [], quizCorrect: 0, quizTotal: 0, lessonCompleted: false };
  }
}

function saveLessonProgress(topicKey: string, progress: LessonProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOPIC_MASTERY_KEY_PREFIX + topicKey, JSON.stringify(progress));
  } catch { /* ignore */ }
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

type LessonPhase = "landing" | "learning" | "summary";

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

  const v2 = useMemo(() => getTopicV2Content(topicKey), [topicKey]);
  const title = String(v2?.topicName || topicKey || "").trim() || "Topic";

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

  const chapterStats = smartLearning.getStatsForChapter(chapterId);
  const smartMastery = chapterStats?.lastComputedMastery ?? 0;
  const smartMasteryPercent = Math.round(smartMastery * 100);

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

  const mcqPool = useMemo<CanonicalQuestion[]>(() => {
    const practiceTopicKey = normalizeTopicKey(topicKey) || topicKey;
    const practiceSet = generatePracticeSet({
      subject: subject as "Maths" | "Science",
      topicKey: practiceTopicKey,
      totalQuestions: Math.max(definitions.length, MIN_CONCEPT_CARDS),
      shuffle: true,
    });
    return (practiceSet.questions || []).filter(
      (q) => Boolean(q.questionText) && Array.isArray(q.options) && q.options.length >= 2 && Boolean(q.answer)
    );
  }, [subject, topicKey, definitions.length]);

  const conceptCheckpoints = useMemo<CanonicalQuestion[]>(() => {
    return definitions.map((def, idx) => {
      if (idx < mcqPool.length) return mcqPool[idx];
      return buildFallbackCheckpoint(def, title);
    });
  }, [definitions, mcqPool, title]);

  const [phase, setPhase] = useState<LessonPhase>("landing");
  const [conceptIdx, setConceptIdx] = useState(0);
  const [showingCheckpoint, setShowingCheckpoint] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);

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
  }, [topicKey]);

  const totalConcepts = definitions.length;
  const masteryPercent = smartMasteryPercent;

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

  const startLearning = useCallback(() => {
    setPhase("learning");
    setConceptIdx(0);
    setShowingCheckpoint(false);
    setSelectedAnswer(null);
    setAnswerRevealed(false);
  }, []);

  const currentDef = definitions[conceptIdx] as V2Definition | undefined;
  const currentCheckpoint = conceptCheckpoints[conceptIdx] as CanonicalQuestion | undefined;

  const advanceToNext = useCallback(() => {
    if (currentDef) {
      markConceptCompleted(currentDef.title);
    }

    if (conceptIdx < totalConcepts - 1) {
      setShowingCheckpoint(false);
      setSelectedAnswer(null);
      setAnswerRevealed(false);
      setConceptIdx((prev) => prev + 1);
    } else {
      markLessonCompleted();
      setPhase("summary");
    }
  }, [conceptIdx, totalConcepts, currentDef, markConceptCompleted, markLessonCompleted]);

  const handleCheckpointAnswer = useCallback(
    (option: string) => {
      if (answerRevealed || !currentCheckpoint) return;
      setSelectedAnswer(option);
      setAnswerRevealed(true);
      const isCorrect = option.trim().toLowerCase() === (currentCheckpoint.answer || "").trim().toLowerCase();
      recordQuizAnswer(isCorrect, currentCheckpoint);
    },
    [answerRevealed, currentCheckpoint, recordQuizAnswer]
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
    <div style={{ minHeight: "100vh", background: "#0a0a0a" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "16px 16px 80px" }}>

        <ReturnContextBar backTo={backTo} backLabel={backLabel} />

        {phase !== "learning" && (
          <div style={{ marginTop: 12 }}>
            <select
              value={topicKey}
              onChange={(e) => onChangeTopic(e.target.value)}
              style={{
                padding: "6px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)",
                fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.03)", cursor: "pointer",
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
            marginTop: 20, background: "rgba(255,255,255,0.03)", borderRadius: 20, padding: "28px 24px",
            border: "1px solid rgba(255,255,255,0.06)", textAlign: "center",
            boxShadow: "0 2px 12px rgba(88,204,2,0.12)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#fff", margin: 0 }}>
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
              <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginTop: 12, maxWidth: 560, marginInline: "auto" }}>
                {overview[0]}
              </p>
            )}

            <div style={{
              marginTop: 20, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
            }}>
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#818cf8" }}>{totalConcepts}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Concepts</div>
              </div>
              {weightage > 0 && (
                <div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f59e0b" }}>~{weightage}%</div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Exam Weightage</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#22c55e" }}>{masteryPercent}%</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Mastery</div>
              </div>
            </div>

            {masteryPercent > 0 && (
              <div style={{
                marginTop: 16, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.05)",
                overflow: "hidden", maxWidth: 300, marginInline: "auto",
              }}>
                <div style={{
                  height: "100%", borderRadius: 999, transition: "width 0.4s ease",
                  width: `${masteryPercent}%`,
                  background: masteryPercent >= 80 ? "#22c55e" : masteryPercent >= 40 ? "#6366f1" : "#94a3b8",
                }} />
              </div>
            )}

            {allDefinitions.length > 0 && (
              <div style={{
                marginTop: 20, textAlign: "left",
                background: "#0a0a0a", borderRadius: 14, padding: "14px 18px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                  Key Definitions Preview
                </div>
                {allDefinitions.slice(0, 3).map((d, idx) => (
                  <div key={idx} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginBottom: 4, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{d.title}</span> — {d.description}
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
                  : "rgba(255,255,255,0.1)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "1rem",
                cursor: hasEnoughContent ? "pointer" : "not-allowed",
                boxShadow: hasEnoughContent ? "0 4px 14px rgba(88,204,2,0.12)" : "none",
                transition: "transform 0.15s",
              }}
              onMouseDown={(e) => { if (hasEnoughContent) (e.target as HTMLElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
            >
              {progress.lessonCompleted ? "Review Again" : masteryPercent > 0 ? "Continue Learning" : "Start Learning"}
            </button>

            <button
              type="button"
              onClick={() => {
                trackUxEvent("topichub_topic_mock_click", "TopicHub", { topicKey });
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
                background: "#6366f1",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "0.88rem",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(99,102,241,0.12)",
                transition: "transform 0.15s",
              }}
              onMouseDown={(e) => { (e.target as HTMLElement).style.transform = "scale(0.97)"; }}
              onMouseUp={(e) => { (e.target as HTMLElement).style.transform = "scale(1)"; }}
            >
              Topic Mock Paper
            </button>

            {!hasEnoughContent && (
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
                Content for this topic is being prepared.
              </p>
            )}

            {scoreTips.length > 0 && (
              <div style={{
                marginTop: 24, background: "rgba(99,102,241,0.06)",
                borderRadius: 14, padding: "16px 18px", border: "1px solid rgba(99,102,241,0.2)",
                textAlign: "left",
              }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#4338ca", marginBottom: 8 }}>
                  Score Maximizer Tips
                </div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {scoreTips.slice(0, 3).map((tip, idx) => (
                    <li key={idx} style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.45)", marginBottom: 4, lineHeight: 1.5 }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {phase === "learning" && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              marginBottom: 12,
            }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "rgba(255,255,255,0.45)" }}>
                {title} — Concept {conceptIdx + 1} of {totalConcepts}
              </span>
              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                {Math.round(((conceptIdx + 1) / totalConcepts) * 100)}%
              </span>
            </div>

            <div style={{
              height: 6, borderRadius: 999, background: "rgba(255,255,255,0.05)", overflow: "hidden",
              marginBottom: 20,
            }}>
              <div style={{
                height: "100%", borderRadius: 999, transition: "width 0.3s ease",
                width: `${((conceptIdx + 1) / totalConcepts) * 100}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }} />
            </div>

            {!showingCheckpoint && currentDef && (
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: "22px 22px",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: "rgba(99,102,241,0.08)", color: "#818cf8",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: "0.85rem", flexShrink: 0,
                  }}>
                    {conceptIdx + 1}
                  </span>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: 0 }}>
                    {currentDef.title}
                  </h2>
                </div>

                <QuestionVisualAid
                  subject={subjectTitle}
                  topicKey={topicKey}
                  questionText={`${currentDef.title} ${currentDef.description || ""}`}
                />

                <div style={{
                  fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
                  padding: "12px 16px", background: "#0a0a0a", borderRadius: 12,
                }}>
                  <div style={{ fontWeight: 600, fontSize: "0.78rem", color: "#818cf8", marginBottom: 4 }}>
                    What it means
                  </div>
                  {currentDef.description}
                </div>

                {currentDef.examTip && (
                  <div style={{
                    marginTop: 12, fontSize: "0.82rem", color: "#d97706",
                    padding: "10px 16px", background: "rgba(250,204,21,0.06)", borderRadius: 12,
                    border: "1px solid rgba(250,204,21,0.2)",
                  }}>
                    <span style={{ fontWeight: 700 }}>Exam line: </span>
                    {currentDef.examTip}
                  </div>
                )}

                {examPatterns[conceptIdx] && (
                  <div style={{
                    marginTop: 10, fontSize: "0.82rem", color: "rgba(255,255,255,0.45)",
                    padding: "10px 16px", background: "rgba(34,197,94,0.06)", borderRadius: 12,
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}>
                    <span style={{ fontWeight: 700, color: "#16a34a" }}>When to use: </span>
                    {examPatterns[conceptIdx]}
                  </div>
                )}

                {markingTips[conceptIdx] && (
                  <div style={{
                    marginTop: 10, fontSize: "0.82rem", color: "#7f1d1d",
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
                      color: "#4338ca", fontWeight: 600, fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    Teach Me
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markConceptCompleted(currentDef.title);
                      setShowingCheckpoint(true);
                      setSelectedAnswer(null);
                      setAnswerRevealed(false);
                    }}
                    style={{
                      padding: "8px 20px", borderRadius: 10,
                      background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                      border: "none", color: "#fff", fontWeight: 600,
                      fontSize: "0.82rem", cursor: "pointer",
                    }}
                  >
                    Got it → Quick Check
                  </button>
                </div>
              </div>
            )}

            {showingCheckpoint && currentCheckpoint && (
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: "22px 22px",
                border: "2px solid #6366f1",
                boxShadow: "0 2px 12px rgba(88,204,2,0.12)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{
                    fontSize: "0.78rem", fontWeight: 700, padding: "3px 10px",
                    borderRadius: 999, background: "rgba(99,102,241,0.08)", color: "#818cf8",
                  }}>
                    Quick Check
                  </span>
                </div>

                <div style={{ fontSize: "0.92rem", color: "#fff", lineHeight: 1.6, fontWeight: 600, marginBottom: 16 }}>
                  {currentCheckpoint.questionText}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  {(currentCheckpoint.options || []).map((option, idx) => {
                    const isSelected = selectedAnswer === option;
                    const correctAnswer = (currentCheckpoint.answer || "").trim().toLowerCase();
                    const isCorrect = option.trim().toLowerCase() === correctAnswer;
                    let borderColor = "rgba(255,255,255,0.06)";
                    let bg = "rgba(255,255,255,0.03)";
                    let textColor = "rgba(255,255,255,0.7)";
                    if (answerRevealed) {
                      if (isCorrect) {
                        borderColor = "rgba(34,197,94,0.3)";
                        bg = "rgba(34,197,94,0.08)";
                        textColor = "#22c55e";
                      } else if (isSelected && !isCorrect) {
                        borderColor = "rgba(239,68,68,0.3)";
                        bg = "rgba(239,68,68,0.08)";
                        textColor = "#ef4444";
                      }
                    } else if (isSelected) {
                      borderColor = "rgba(99,102,241,0.4)";
                      bg = "rgba(99,102,241,0.08)";
                    }
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCheckpointAnswer(option)}
                        disabled={answerRevealed}
                        style={{
                          padding: "12px 16px", borderRadius: 12,
                          border: `2px solid ${borderColor}`, background: bg,
                          color: textColor, fontWeight: 500, fontSize: "0.85rem",
                          cursor: answerRevealed ? "default" : "pointer",
                          textAlign: "left", transition: "all 0.15s",
                          opacity: answerRevealed && !isSelected && !isCorrect ? 0.5 : 1,
                        }}
                      >
                        <span style={{ fontWeight: 700, marginRight: 8 }}>
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                {answerRevealed && (
                  <div style={{ marginTop: 16 }}>
                    {selectedAnswer?.trim().toLowerCase() === (currentCheckpoint.answer || "").trim().toLowerCase() ? (
                      <div style={{
                        fontSize: "0.88rem", color: "#16a34a", fontWeight: 600, marginBottom: 12,
                        padding: "10px 14px", background: "rgba(34,197,94,0.06)", borderRadius: 10,
                      }}>
                        Correct! Great job!
                      </div>
                    ) : (
                      <div style={{
                        fontSize: "0.88rem", color: "#dc2626", fontWeight: 600, marginBottom: 12,
                        padding: "10px 14px", background: "rgba(239,68,68,0.06)", borderRadius: 10,
                      }}>
                        Not quite. The correct answer is: {currentCheckpoint.answer}
                        {currentCheckpoint.explanation && (
                          <div style={{ marginTop: 6, fontWeight: 400, fontSize: "0.82rem", color: "#7f1d1d" }}>
                            {currentCheckpoint.explanation}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={advanceToNext}
                      style={{
                        padding: "10px 24px", borderRadius: 12,
                        background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                        border: "none", color: "#fff", fontWeight: 600,
                        fontSize: "0.88rem", cursor: "pointer",
                      }}
                    >
                      {conceptIdx < totalConcepts - 1 ? "Next Concept →" : "See Summary"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {!currentDef && (
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 18, padding: "24px", textAlign: "center",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.88rem" }}>
                  No more concepts to review. You've covered everything!
                </p>
                <button
                  type="button"
                  onClick={() => { markLessonCompleted(); setPhase("summary"); }}
                  style={{
                    marginTop: 12, padding: "10px 24px", borderRadius: 12,
                    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                    border: "none", color: "#fff", fontWeight: 600,
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
            marginTop: 20, background: "rgba(255,255,255,0.03)", borderRadius: 20, padding: "28px 24px",
            border: "1px solid rgba(255,255,255,0.06)", textAlign: "center",
            boxShadow: "0 2px 12px rgba(88,204,2,0.12)",
          }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: 0 }}>
              Lesson Complete!
            </h2>
            <p style={{ fontSize: "0.88rem", color: "rgba(255,255,255,0.45)", marginTop: 8 }}>
              You've covered all {totalConcepts} concepts in {title}
            </p>

            <div style={{
              marginTop: 20, display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
            }}>
              <div style={{
                padding: "16px 24px", background: "rgba(34,197,94,0.06)", borderRadius: 14,
                border: "1px solid rgba(34,197,94,0.2)",
              }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a" }}>
                  {progress.conceptsCompleted.length}/{totalConcepts}
                </div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 500, marginTop: 2 }}>
                  Concepts Learned
                </div>
              </div>
              {progress.quizTotal > 0 && (
                <div style={{
                  padding: "16px 24px", background: "rgba(99,102,241,0.08)", borderRadius: 14,
                  border: "1px solid rgba(99,102,241,0.2)",
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#818cf8" }}>
                    {progress.quizCorrect}/{progress.quizTotal}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)", fontWeight: 500, marginTop: 2 }}>
                    Quiz Score
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={goToPractice}
              style={{
                marginTop: 24, padding: "14px 40px", borderRadius: 14,
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                border: "none", color: "#fff", fontWeight: 700, fontSize: "1rem",
                cursor: "pointer", boxShadow: "0 4px 14px rgba(88,204,2,0.3)",
              }}
            >
              Practice Now →
            </button>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={startLearning}
                style={{
                  padding: "8px 20px", borderRadius: 10,
                  background: "none", border: "1px solid rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.45)", fontWeight: 500, fontSize: "0.82rem",
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
