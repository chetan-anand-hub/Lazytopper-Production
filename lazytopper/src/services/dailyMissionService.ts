import type { DailyMixItem } from "./dailyMixPlayback";
import { getDueReviews, type SRConceptCard } from "./spacedRepetitionEngine";
import { getHighlyProbableQuestions, type HPQQuestion } from "../data/highlyProbableQuestions";
import { topicHubV2Content } from "../data/topicHubV2Full";
import { generatePracticeSet } from "../data/practiceSetGenerator";
import type { CanonicalQuestion } from "../data/predictionTypes";
import { normalizeTopicKey } from "../utils/topicResolver";
import { getGuidedJourneyState, initOrResumeGuidedChapter, scoreAndSortChapters } from "./guidedJourneyService";
import type { StudySessionLog } from "./sessionLogger";
import { getActivePaceProfile, getProfileConfig, loadPaceProfile, type PaceProfileType } from "./paceProfileService";
import { loadTopicMasterySnapshot } from "./topicHubMastery";

function buildQuestionStem(q: { question?: string; assertion?: string; reason?: string; kind?: string; type?: string }): string {
  const isAR = q.kind === "assertion-reason" || q.type === "AssertionReason" || q.type === "Assertion-Reasoning" || q.type === "AssertionReasoning";
  if (isAR && (q.assertion || q.reason)) {
    return `${q.question || ""}\n\nAssertion: ${q.assertion || ""}\nReason: ${q.reason || ""}`;
  }
  return String(q.question || "");
}

interface PracticeQuestionView {
  id: string;
  questionText: string;
  difficulty: string;
  marks: number;
  answer: string;
  options: string[];
}

function toPracticeView(q: CanonicalQuestion): PracticeQuestionView {
  return {
    id: q.id,
    questionText: q.questionText || "",
    difficulty: q.difficulty || "Medium",
    marks: q.marks || 2,
    answer: q.answer || "",
    options: Array.isArray(q.options) ? (q.options as string[]) : [],
  };
}

export type SegmentType = "revision" | "learning" | "practice" | "exam" | "mock" | "weakdrill";

export interface MissionSegment {
  type: SegmentType;
  label: string;
  color: string;
  durationMinutes: number;
  items: DailyMixItem[];
}

export interface DailyMission {
  date: string;
  subject: "Maths" | "Science";
  grade: number;
  isWeekend: boolean;
  segments: MissionSegment[];
  totalMinutes: number;
}

export interface MissionProgress {
  date: string;
  subject: string;
  segmentIndex: number;
  itemIndex: number;
  answers: MissionAnswer[];
  completedSegments: number[];
  startedAt: number;
  elapsedSeconds: number;
  completed: boolean;
}

export interface MissionAnswer {
  segmentIndex: number;
  itemIndex: number;
  studentAnswer: string;
  feedback: string | null;
  correct: boolean | null;
  submitted: boolean;
}

const STORAGE_KEY = "lazytopper.dailyMission.v1";

const SEGMENT_COLORS: Record<SegmentType, string> = {
  revision: "#3b82f6",
  learning: "#22c55e",
  practice: "#f97316",
  exam: "#ef4444",
  mock: "#a855f7",
  weakdrill: "#eab308",
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isWeekendDay(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function seededHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getTopicMeta(slug: string): { topicName: string; overview: string[]; definitions: Array<{ title?: string; description?: string }> } {
  const rec = (topicHubV2Content as Record<string, unknown>)[slug] as Record<string, unknown> | undefined;
  if (!rec) return { topicName: slug, overview: [], definitions: [] };
  return {
    topicName: String(rec.topicName || slug).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    overview: Array.isArray(rec.overview) ? (rec.overview as string[]) : [],
    definitions: Array.isArray(rec.definitions) ? (rec.definitions as Array<{ title?: string; description?: string }>) : [],
  };
}

function parseMCQOptions(questionText: string): { stem: string; options: string[] } {
  const optionRegex = /\(([A-D])\)\s*((?:(?!\([A-D]\)).)*)/g;
  const options: string[] = [];
  let match;
  while ((match = optionRegex.exec(questionText)) !== null) {
    const opt = match[2].trim().replace(/\s+/g, " ");
    if (opt) options.push(opt);
  }
  if (options.length === 0) return { stem: questionText, options: [] };
  const stemMatch = questionText.match(/^([\s\S]*?)(?:\s*\([A-D]\))/);
  const stem = stemMatch ? stemMatch[1].trim() : questionText;
  return { stem, options };
}

function buildRevisionSegment(subject: "Maths" | "Science", seed: number): MissionSegment {
  const dueCards = getDueReviews({ subject, limit: 4 });
  const items: DailyMixItem[] = dueCards.map((card: SRConceptCard, i: number) => {
    const meta = getTopicMeta(card.topicKey);
    const conceptLabel = card.conceptKey.replace(/[-_]+/g, " ");
    const allOverview = meta.overview.join("\n\n");
    return {
      id: `mission-rev-${i}`,
      type: "question" as const,
      title: `Quick Revision: ${meta.topicName}`,
      description: `Easy | 1 mark`,
      payload: {
        topicKey: card.topicKey,
        conceptKey: card.conceptKey,
        topic: meta.topicName,
        stem: `What do you remember about "${conceptLabel}" from ${meta.topicName}? Write the key idea or formula.`,
        modelAnswer: allOverview || `${conceptLabel} — a key concept in ${meta.topicName}.`,
        marks: 1,
        difficulty: "Easy",
        isFlashcard: true,
      },
    };
  });

  if (items.length < 3) {
    const hpqBuckets = getHighlyProbableQuestions(subject);
    const shuffled = seededShuffle(hpqBuckets, seed);
    for (const bucket of shuffled) {
      if (items.length >= 4) break;
      const q = bucket.questions[0];
      if (!q) continue;
      const rawStem = buildQuestionStem(q) || `Review key concepts from ${bucket.topic}.`;
      const isMCQ = q.type === "MCQ";
      const parsed = isMCQ ? parseMCQOptions(rawStem) : { stem: rawStem, options: [] };
      items.push({
        id: `mission-rev-fill-${items.length}`,
        type: "question" as const,
        title: `Quick Revision: ${bucket.topic}`,
        description: `${q.difficulty || "Medium"} | ${q.marks || 1} mark${(q.marks || 1) !== 1 ? "s" : ""}`,
        payload: {
          topicKey: normalizeTopicKey(bucket.topic) || bucket.topic,
          topic: bucket.topic,
          stem: parsed.stem,
          options: parsed.options,
          modelAnswer: String(q.answer || ""),
          explanation: String(q.explanation || ""),
          marks: q.marks || 1,
          difficulty: q.difficulty || "Medium",
        },
      });
    }
  }

  return {
    type: "revision",
    label: "Quick Revision",
    color: SEGMENT_COLORS.revision,
    durationMinutes: 5,
    items: items.slice(0, 4),
  };
}

function buildLearningSegment(topicSlug: string, subject: "Maths" | "Science", seed: number): MissionSegment {
  const meta = getTopicMeta(topicSlug);
  const items: DailyMixItem[] = [];

  let conceptText = "";
  if (meta.overview.length > 0) {
    conceptText = meta.overview.slice(0, 2).join("\n\n");
  } else if (meta.definitions.length > 0) {
    const def = meta.definitions[0];
    conceptText = `${def.title || ""}: ${def.description || ""}`.trim();
  }
  if (!conceptText) {
    conceptText = `Learn the core concepts of ${meta.topicName}. Focus on definitions, formulas, and key principles.`;
  }

  items.push({
    id: `mission-learn-concept-0`,
    type: "video" as const,
    title: `Concept: ${meta.topicName}`,
    description: conceptText,
    payload: {
      topicKey: topicSlug,
      topic: meta.topicName,
      stem: conceptText,
    },
  });

  const hpqBuckets = getHighlyProbableQuestions(subject);
  const topicNorm = normalizeTopicKey(topicSlug);
  const matchBucket = hpqBuckets.find((b) => normalizeTopicKey(b.topic) === topicNorm) || hpqBuckets.find((b) => normalizeTopicKey(b.topic).includes(topicNorm));

  if (matchBucket) {
    const shuffledQs = seededShuffle(matchBucket.questions, seed + 1);
    const quizQs = shuffledQs.filter((q) => Number(q.marks || 1) <= 2).slice(0, 5);
    for (let i = 0; i < quizQs.length && items.length < 6; i++) {
      const q = quizQs[i];
      items.push({
        id: `mission-learn-q-${i}`,
        type: "question" as const,
        title: `Quiz: ${meta.topicName}`,
        description: `${String(q.difficulty || "Medium")} | ${q.marks || 1} mark${(q.marks || 1) === 1 ? "" : "s"}`,
        payload: {
          questionId: String(q.id),
          topicKey: topicSlug,
          topic: meta.topicName,
          stem: buildQuestionStem(q),
          marks: q.marks || 1,
          difficulty: String(q.difficulty || "Medium"),
          modelAnswer: String(q.answer || ""),
          options: Array.isArray((q as unknown as { options?: string[] }).options) ? (q as unknown as { options: string[] }).options : [],
        },
      });
    }
  }

  if (items.length < 4) {
    const practiceResult = generatePracticeSet({
      subject,
      topicKey: topicSlug,
      totalQuestions: 5 - items.length + 1,
      difficultyMix: { Easy: 0.6, Medium: 0.4, Hard: 0 },
    });
    for (const rawQ of practiceResult.questions) {
      if (items.length >= 6) break;
      const pq = toPracticeView(rawQ);
      items.push({
        id: `mission-learn-pq-${items.length}`,
        type: "question" as const,
        title: `Quiz: ${meta.topicName}`,
        description: `${pq.difficulty} | Quick check`,
        payload: {
          questionId: pq.id,
          topicKey: topicSlug,
          topic: meta.topicName,
          stem: pq.questionText,
          marks: pq.marks || 1,
          difficulty: pq.difficulty,
          modelAnswer: pq.answer,
          options: pq.options,
        },
      });
    }
  }

  return {
    type: "learning",
    label: "New Concept",
    color: SEGMENT_COLORS.learning,
    durationMinutes: 10,
    items,
  };
}

function buildPracticeSegment(topicSlug: string, subject: "Maths" | "Science", seed: number): MissionSegment {
  const meta = getTopicMeta(topicSlug);
  const items: DailyMixItem[] = [];

  const practiceResult = generatePracticeSet({
    subject,
    topicKey: topicSlug,
    totalQuestions: 7,
    difficultyMix: { Easy: 0.3, Medium: 0.5, Hard: 0.2 },
    shuffle: true,
  });

  for (let i = 0; i < practiceResult.questions.length; i++) {
    const pq = toPracticeView(practiceResult.questions[i]);
    items.push({
      id: `mission-practice-${i}`,
      type: "question" as const,
      title: `Practice: ${meta.topicName}`,
      description: `${pq.difficulty} | ${pq.marks} mark${pq.marks === 1 ? "" : "s"}`,
      payload: {
        questionId: pq.id,
        topicKey: topicSlug,
        topic: meta.topicName,
        stem: pq.questionText,
        marks: pq.marks,
        difficulty: pq.difficulty,
        modelAnswer: pq.answer,
        options: pq.options,
      },
    });
  }

  if (items.length < 5) {
    const hpqBuckets = getHighlyProbableQuestions(subject);
    const topicNorm = normalizeTopicKey(topicSlug);
    const bucket = hpqBuckets.find((b) => normalizeTopicKey(b.topic) === topicNorm);
    if (bucket) {
      const shuffled = seededShuffle(bucket.questions, seed + 2);
      for (const q of shuffled) {
        if (items.length >= 7) break;
        items.push({
          id: `mission-practice-hpq-${items.length}`,
          type: "question" as const,
          title: `Practice: ${meta.topicName}`,
          description: `${String(q.difficulty || "Medium")} | ${q.marks || 2} marks`,
          payload: {
            questionId: String(q.id),
            topicKey: topicSlug,
            topic: meta.topicName,
            stem: buildQuestionStem(q),
            marks: q.marks || 2,
            difficulty: String(q.difficulty || "Medium"),
            modelAnswer: String(q.answer || ""),
            options: Array.isArray((q as unknown as { options?: string[] }).options) ? (q as unknown as { options: string[] }).options : [],
          },
        });
      }
    }
  }

  return {
    type: "practice",
    label: "Adaptive Practice",
    color: SEGMENT_COLORS.practice,
    durationMinutes: 10,
    items: items.slice(0, 7),
  };
}

function buildExamSegment(subject: "Maths" | "Science", seed: number): MissionSegment {
  const hpqBuckets = getHighlyProbableQuestions(subject);
  const shuffledBuckets = seededShuffle(hpqBuckets, seed + 3);
  const items: DailyMixItem[] = [];

  for (const bucket of shuffledBuckets) {
    if (items.length >= 3) break;
    const highMarksQs = bucket.questions.filter((q: HPQQuestion) => (q.marks || 1) >= 3);
    const q = highMarksQs[0] || bucket.questions[0];
    if (!q) continue;
    items.push({
      id: `mission-exam-${items.length}`,
      type: "question" as const,
      title: `Exam Mode: ${bucket.topic}`,
      description: `${String(q.difficulty || "Hard")} | ${q.marks || 3} marks | Timed`,
      payload: {
        questionId: String(q.id),
        topicKey: normalizeTopicKey(bucket.topic) || bucket.topic,
        topic: bucket.topic,
        stem: buildQuestionStem(q),
        marks: q.marks || 3,
        difficulty: String(q.difficulty || "Hard"),
        modelAnswer: String(q.answer || ""),
        options: Array.isArray((q as unknown as { options?: string[] }).options) ? (q as unknown as { options: string[] }).options : [],
        timed: true,
      },
    });
  }

  return {
    type: "exam",
    label: "Exam Simulation",
    color: SEGMENT_COLORS.exam,
    durationMinutes: 5,
    items: items.slice(0, 3),
  };
}

function buildMockTestSegment(topicSlug: string, subject: "Maths" | "Science", _seed: number): MissionSegment {
  const meta = getTopicMeta(topicSlug);
  const practiceResult = generatePracticeSet({
    subject,
    topicKey: topicSlug,
    totalQuestions: 10,
    difficultyMix: { Easy: 0.2, Medium: 0.5, Hard: 0.3 },
    shuffle: true,
  });

  const items: DailyMixItem[] = practiceResult.questions.map((rawQ, i) => {
    const pq = toPracticeView(rawQ);
    return {
      id: `mission-mock-${i}`,
      type: "question" as const,
      title: `Mock Test: ${meta.topicName}`,
      description: `${pq.difficulty} | ${pq.marks} marks | Timed`,
      payload: {
        questionId: pq.id,
        topicKey: topicSlug,
        topic: meta.topicName,
        stem: pq.questionText,
        marks: pq.marks,
        difficulty: pq.difficulty,
        modelAnswer: pq.answer,
        options: pq.options,
        timed: true,
      },
    };
  });

  return {
    type: "mock",
    label: "Chapter Mock Test",
    color: SEGMENT_COLORS.mock,
    durationMinutes: 15,
    items: items.slice(0, 10),
  };
}

function buildWeakDrillSegment(subject: "Maths" | "Science", excludeSlug: string, _seed: number): MissionSegment {
  const scored = scoreAndSortChapters();
  const subjectChapters = scored.filter((s) => {
    const subj = s.chapter.subjectId === "science" ? "Science" : "Maths";
    return subj === subject && s.chapter.canonicalSlug !== excludeSlug && s.mastery > 0 && s.mastery < 0.5;
  });

  subjectChapters.sort((a, b) => a.mastery - b.mastery);
  const weakChapter = subjectChapters[0];
  if (!weakChapter) {
    return {
      type: "weakdrill",
      label: "Weak Area Drill",
      color: SEGMENT_COLORS.weakdrill,
      durationMinutes: 10,
      items: [],
    };
  }

  const slug = weakChapter.chapter.canonicalSlug;
  const meta = getTopicMeta(slug);
  const practiceResult = generatePracticeSet({
    subject,
    topicKey: slug,
    totalQuestions: 5,
    difficultyMix: { Easy: 0.4, Medium: 0.4, Hard: 0.2 },
    shuffle: true,
  });

  const items: DailyMixItem[] = practiceResult.questions.map((rawQ, i) => {
    const pq = toPracticeView(rawQ);
    return {
      id: `mission-weak-${i}`,
      type: "question" as const,
      title: `Weak Area: ${meta.topicName}`,
      description: `${pq.difficulty} | Focus drill`,
      payload: {
        questionId: pq.id,
        topicKey: slug,
        topic: meta.topicName,
        stem: pq.questionText,
        marks: pq.marks,
        difficulty: pq.difficulty,
        modelAnswer: pq.answer,
        options: pq.options,
      },
    };
  });

  return {
    type: "weakdrill",
    label: "Weak Area Drill",
    color: SEGMENT_COLORS.weakdrill,
    durationMinutes: 10,
    items: items.slice(0, 5),
  };
}

function getCurrentTopicSlug(subject: "Maths" | "Science", uid?: string | null): string {
  const journey = getGuidedJourneyState(uid);
  if (journey.currentChapter) {
    const chSubject = journey.currentChapter.subject === "science" ? "Science" : "Maths";
    if (chSubject === subject) return journey.currentChapter.slug;
  }

  const init = initOrResumeGuidedChapter(uid);
  if (init.currentChapter) {
    const chSubject = init.currentChapter.subject === "science" ? "Science" : "Maths";
    if (chSubject === subject) return init.currentChapter.slug;
  }

  const scored = scoreAndSortChapters();
  const match = scored.find((s) => {
    const subj = s.chapter.subjectId === "science" ? "Science" : "Maths";
    return subj === subject;
  });
  return match?.chapter.canonicalSlug || (subject === "Science" ? "ChemicalReactions" : "RealNumbers");
}

function applyDuration(seg: MissionSegment, minutes: number): MissionSegment {
  return { ...seg, durationMinutes: minutes };
}

function isMockDay(frequency: "daily" | "biweekly" | "weekly", daysLeft: number): boolean {
  if (frequency === "daily") return true;
  const dayOfWeek = new Date().getDay();
  if (frequency === "weekly") {
    return daysLeft < 150 && dayOfWeek === 0;
  }
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  return weekNumber % 2 === 0 && dayOfWeek === 0;
}

function isTopicStrong(topicSlug: string): boolean {
  try {
    const snapshot = loadTopicMasterySnapshot(topicSlug);
    const total = snapshot.totalAttempted || 0;
    const correct = snapshot.totalCorrect || 0;
    if (total < 5) return false;
    return (correct / total) >= 0.8;
  } catch { return false; }
}

function buildSegmentsForProfile(
  profile: PaceProfileType,
  topicSlug: string,
  subject: "Maths" | "Science",
  seed: number,
  extended: boolean
): MissionSegment[] {
  const config = getProfileConfig(profile);
  const mix = config.missionMix;
  const baseMins = 30;
  const segments: MissionSegment[] = [];
  const mockScheduled = isMockDay(config.mockFrequency, loadPaceProfile()?.daysLeft ?? 90);

  if (profile === "crash") {
    const revMin = Math.round(baseMins * mix.revision);
    const pracMin = Math.round(baseMins * mix.practice);
    const examMin = Math.max(1, baseMins - revMin - pracMin);
    segments.push(applyDuration(buildRevisionSegment(subject, seed), revMin));
    segments.push(applyDuration(buildPracticeSegment(topicSlug, subject, seed), pracMin));
    segments.push(applyDuration(buildExamSegment(subject, seed), Math.ceil(examMin / 2)));
    segments.push(applyDuration(buildExamSegment(subject, seed + 100), Math.floor(examMin / 2)));
    if (extended || mockScheduled) {
      segments.push(applyDuration(buildMockTestSegment(topicSlug, subject, seed), 15));
      segments.push(applyDuration(buildWeakDrillSegment(subject, topicSlug, seed), 15));
    }
  } else if (profile === "sprint") {
    const learnMin = Math.round(baseMins * mix.learn);
    const pracMin = Math.round(baseMins * mix.practice);
    const revMin = Math.round(baseMins * mix.revision);
    const examMin = Math.max(1, baseMins - learnMin - pracMin - revMin);
    segments.push(applyDuration(buildRevisionSegment(subject, seed), revMin));
    if (learnMin > 0 && !isTopicStrong(topicSlug)) {
      segments.push(applyDuration(buildLearningSegment(topicSlug, subject, seed), learnMin));
    } else if (learnMin > 0) {
      segments.push(applyDuration(buildPracticeSegment(topicSlug, subject, seed + 50), learnMin));
    }
    segments.push(applyDuration(buildPracticeSegment(topicSlug, subject, seed), pracMin));
    segments.push(applyDuration(buildExamSegment(subject, seed), examMin));
    if (extended || mockScheduled) {
      segments.push(applyDuration(buildMockTestSegment(topicSlug, subject, seed), 15));
      segments.push(applyDuration(buildWeakDrillSegment(subject, topicSlug, seed), 15));
    }
  } else {
    const learnMin = Math.round(baseMins * mix.learn);
    const pracMin = Math.round(baseMins * mix.practice);
    const revMin = Math.round(baseMins * mix.revision);
    const examMin = Math.max(1, baseMins - learnMin - pracMin - revMin);
    segments.push(applyDuration(buildRevisionSegment(subject, seed), revMin));
    segments.push(applyDuration(buildLearningSegment(topicSlug, subject, seed), learnMin));
    segments.push(applyDuration(buildPracticeSegment(topicSlug, subject, seed), pracMin));
    segments.push(applyDuration(buildExamSegment(subject, seed), examMin));
    if (extended || mockScheduled) {
      segments.push(applyDuration(buildMockTestSegment(topicSlug, subject, seed), 15));
      segments.push(applyDuration(buildWeakDrillSegment(subject, topicSlug, seed), 15));
    }
  }

  return segments;
}

export function generateDailyMission(
  grade: number,
  subject: "Maths" | "Science",
  uid?: string | null,
  options?: { extended?: boolean; paceProfile?: PaceProfileType }
): DailyMission {
  const date = todayKey();
  const weekend = isWeekendDay();
  const useExtended = options?.extended ?? weekend;
  const seed = seededHash(`${date}-${subject}-mission`);
  const topicSlug = getCurrentTopicSlug(subject, uid);
  const profile = options?.paceProfile ?? getActivePaceProfile();

  const segments = buildSegmentsForProfile(profile, topicSlug, subject, seed, useExtended);
  const totalMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0);

  return { date, subject, grade, isWeekend: useExtended, segments, totalMinutes };
}

export function saveMissionProgress(subject: string, progress: MissionProgress): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}.${subject}`, JSON.stringify(progress));
  } catch {}
}

export function loadMissionProgress(subject: string): MissionProgress | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}.${subject}`);
    if (!raw) return null;
    const parsed: MissionProgress = JSON.parse(raw);
    if (parsed.date === todayKey() && parsed.subject === subject) return parsed;
  } catch {}
  return null;
}

export function isMissionCompletedToday(subject: string): boolean {
  const progress = loadMissionProgress(subject);
  return progress?.completed === true;
}

export function getMissionResumeInfo(subject: string): { segmentIndex: number; itemIndex: number; completedSegments: number; totalSegments: number; elapsedMinutes: number; totalMinutes: number; remainingMinutes: number } | null {
  const progress = loadMissionProgress(subject);
  if (!progress || progress.completed) return null;
  const answeredCount = progress.answers.filter((a) => a.submitted).length;
  if (answeredCount === 0) return null;
  const profile = getActivePaceProfile();
  const profileCfg = getProfileConfig(profile);
  const weekend = isWeekendDay();
  const useExtended = profile === "crash" || weekend;
  const baseSegments = useExtended ? 6 : 4;
  const adjustedSegments = profileCfg.missionMix.learn === 0
    ? Math.max(baseSegments, 5)
    : baseSegments;
  const totalSegments = Math.max(progress.completedSegments.length + 1, progress.segmentIndex + 1, adjustedSegments);
  const totalMinutes = totalSegments <= 4 ? 30 : 60;
  const elapsedMinutes = Math.round(progress.elapsedSeconds / 60);
  const remainingMinutes = Math.max(0, totalMinutes - elapsedMinutes);
  return {
    segmentIndex: progress.segmentIndex,
    itemIndex: progress.itemIndex,
    completedSegments: progress.completedSegments.length,
    totalSegments,
    elapsedMinutes,
    totalMinutes,
    remainingMinutes,
  };
}

export function computeMissionXP(progress: MissionProgress): { xp: number; streakEligible: boolean } {
  const completedSegs = progress.completedSegments.length;
  const correctAnswers = progress.answers.filter((a) => a.correct === true).length;
  const baseXP = correctAnswers * 10;
  const segmentBonus = completedSegs * 25;
  const fullCompletionBonus = progress.completed ? 50 : 0;
  const coreSegmentsDone = progress.completedSegments.filter((si) => si < 4).length;
  return {
    xp: baseXP + segmentBonus + fullCompletionBonus,
    streakEligible: coreSegmentsDone >= 4,
  };
}

const XP_KEY = "lazytopper.xp";
const XP_AWARDED_KEY = "lazytopper.dailyMission.xpAwarded.v1";

export function persistMissionXP(subject: string, progress: MissionProgress): number {
  const xpInfo = computeMissionXP(progress);
  if (xpInfo.xp <= 0) return 0;
  try {
    const awardedRaw = localStorage.getItem(`${XP_AWARDED_KEY}.${subject}`);
    let alreadyAwarded = 0;
    if (awardedRaw) {
      const parsed = JSON.parse(awardedRaw);
      if (parsed.date === progress.date) alreadyAwarded = parsed.xp;
    }
    const delta = Math.max(0, xpInfo.xp - alreadyAwarded);
    if (delta > 0) {
      const prev = Number(localStorage.getItem(XP_KEY) || 0);
      localStorage.setItem(XP_KEY, String(prev + delta));
      localStorage.setItem(`${XP_AWARDED_KEY}.${subject}`, JSON.stringify({ date: progress.date, xp: xpInfo.xp }));
    }
    return delta;
  } catch { return 0; }
}

const SESSION_LOG_KEY = "lazytopper.sessionLogs.v1";

export function logMissionSession(subject: string, progress: MissionProgress): void {
  try {
    const log: StudySessionLog = {
      id: `mission-${progress.date}-${subject}`,
      userId: "local",
      startTime: new Date(progress.startedAt).toISOString(),
      endTime: new Date().toISOString(),
      platform: "web",
      status: progress.completed ? "completed" : "partial",
      activities: [{
        timestamp: new Date().toISOString(),
        type: "dailyMission",
        topicKey: subject,
        durationMinutes: Math.round(progress.elapsedSeconds / 60),
      }],
    };
    const logs: StudySessionLog[] = [];
    try {
      const raw = localStorage.getItem(SESSION_LOG_KEY);
      if (raw) logs.push(...JSON.parse(raw));
    } catch {}
    logs.push(log);
    localStorage.setItem(SESSION_LOG_KEY, JSON.stringify(logs.slice(-200)));
  } catch {}
}
