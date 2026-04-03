import { PredictionCore } from "../data/predictionCore";
import type { CanonicalQuestion, SectionKey, LTSubjectKey } from "../data/predictionTypes";
import { getActiveProgressUser } from "../services/studentProgressStore";

export interface ExamQuestion {
  main: CanonicalQuestion;
  or?: CanonicalQuestion;
}

export interface ExamSection {
  section: SectionKey;
  marksPerQuestion: number;
  questions: ExamQuestion[];
  sectionMarks: number;
  timeGuideMinutes: number;
}

export interface ExamPaper {
  paperId: string;
  subject: LTSubjectKey;
  title: string;
  sections: ExamSection[];
  totalMarks: number;
  totalTimeMinutes: number;
  questionCount: number;
  generatedAt: number;
}

export interface ExamAnswer {
  questionId: string;
  selected: string;
  correct: boolean;
  timeSec: number;
  branch: "main" | "or";
}

export interface ExamAnalytics {
  totalMarks: number;
  marksScored: number;
  percentScore: number;
  sectionBreakdown: {
    section: SectionKey;
    maxMarks: number;
    scored: number;
    percent: number;
    timeSec: number;
  }[];
  topicHeatmap: {
    topicKey: string;
    total: number;
    correct: number;
    percent: number;
    marks: number;
    maxMarks: number;
  }[];
  difficultyBreakdown: {
    difficulty: string;
    total: number;
    correct: number;
    percent: number;
  }[];
  subtopicHeatmap: {
    subtopic: string;
    total: number;
    correct: number;
    percent: number;
  }[];
  timeAnalysis: {
    totalSeconds: number;
    perSectionSeconds: Record<SectionKey, number>;
  };
  weakAreas: string[];
}

const BLUEPRINT: { section: SectionKey; count: number; marks: number; timeMinutes: number }[] = [
  { section: "A", count: 20, marks: 1, timeMinutes: 40 },
  { section: "B", count: 5, marks: 2, timeMinutes: 20 },
  { section: "C", count: 6, marks: 3, timeMinutes: 30 },
  { section: "D", count: 4, marks: 5, timeMinutes: 30 },
  { section: "E", count: 3, marks: 4, timeMinutes: 20 },
];

const INTERNAL_CHOICE_SECTIONS = new Set<SectionKey>(["B", "C", "D", "E"]);

const HISTORY_KEY_PREFIX = "lazytopper.unlimitedPaperHistory";
const MAX_HISTORY = 5;
const MAX_OVERLAP_PERCENT = 30;

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function getHistoryKey(subject: LTSubjectKey): string {
  const uid = getActiveProgressUser();
  return `${HISTORY_KEY_PREFIX}.${uid}.${subject}`;
}

function loadRecentPaperIds(subject: LTSubjectKey): string[][] {
  try {
    const raw = localStorage.getItem(getHistoryKey(subject));
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveRecentPaperIds(subject: LTSubjectKey, questionIds: string[]): void {
  const history = loadRecentPaperIds(subject);
  history.push(questionIds);
  if (history.length > MAX_HISTORY) history.shift();
  try {
    localStorage.setItem(getHistoryKey(subject), JSON.stringify(history));
  } catch {}
}

function computeOverlap(newIds: Set<string>, previousIds: string[]): number {
  if (previousIds.length === 0) return 0;
  let shared = 0;
  for (const id of previousIds) {
    if (newIds.has(id)) shared++;
  }
  return (shared / Math.max(previousIds.length, newIds.size)) * 100;
}

function overlapOkWithHistory(newIds: Set<string>, history: string[][]): boolean {
  for (const prev of history) {
    if (computeOverlap(newIds, prev) > MAX_OVERLAP_PERCENT) return false;
  }
  return true;
}

export function generateUnlimitedPaper(subject: LTSubjectKey, seed?: number): ExamPaper {
  const all = PredictionCore.getAllQuestions().filter(q => q.subject === subject);
  const history = loadRecentPaperIds(subject);
  const actualSeed = seed ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff));

  let bestPaper: ExamPaper | null = null;
  let bestOverlapMax = Infinity;

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = seededRandom(actualSeed + attempt * 7919);
    const paper = buildSinglePaper(all, subject, rng, actualSeed + attempt);

    const allIds = new Set<string>();
    for (const sec of paper.sections) {
      for (const q of sec.questions) {
        allIds.add(q.main.id);
        if (q.or) allIds.add(q.or.id);
      }
    }

    if (overlapOkWithHistory(allIds, history)) {
      bestPaper = paper;
      break;
    }

    const maxOverlap = history.reduce((mx, prev) => Math.max(mx, computeOverlap(allIds, prev)), 0);
    if (maxOverlap < bestOverlapMax) {
      bestOverlapMax = maxOverlap;
      bestPaper = paper;
    }
  }

  const finalPaper = bestPaper!;

  const allIds: string[] = [];
  for (const sec of finalPaper.sections) {
    for (const q of sec.questions) {
      allIds.push(q.main.id);
      if (q.or) allIds.push(q.or.id);
    }
  }
  saveRecentPaperIds(subject, allIds);

  return finalPaper;
}

function buildSinglePaper(
  pool: CanonicalQuestion[],
  subject: LTSubjectKey,
  rng: () => number,
  seedVal: number,
): ExamPaper {
  const usedIds = new Set<string>();
  const sections: ExamSection[] = [];
  let totalMarks = 0;
  let totalTime = 0;
  let questionCount = 0;

  for (const bp of BLUEPRINT) {
    const sectionPool = shuffleArray(
      pool.filter(q => q.section === bp.section && q.marks === bp.marks),
      rng,
    );

    const questions: ExamQuestion[] = [];
    const hasChoice = INTERNAL_CHOICE_SECTIONS.has(bp.section);
    const choiceCount = hasChoice ? 2 : 0;
    let choicesMade = 0;

    for (let i = 0; i < bp.count && sectionPool.length > 0; i++) {
      const mainQ = pickUnused(sectionPool, usedIds);
      if (!mainQ) break;
      usedIds.add(mainQ.id);

      let orQ: CanonicalQuestion | undefined;
      if (hasChoice && choicesMade < choiceCount) {
        orQ = pickUnused(sectionPool, usedIds);
        if (orQ) {
          usedIds.add(orQ.id);
          choicesMade++;
        }
      }

      questions.push({ main: mainQ, or: orQ });
    }

    const sectionMarks = questions.length * bp.marks;
    totalMarks += sectionMarks;
    totalTime += bp.timeMinutes;
    questionCount += questions.length;

    sections.push({
      section: bp.section,
      marksPerQuestion: bp.marks,
      questions,
      sectionMarks,
      timeGuideMinutes: bp.timeMinutes,
    });
  }

  return {
    paperId: `UNL-${subject}-${seedVal.toString(36)}`,
    subject,
    title: `${subject} Full-Length Mock`,
    sections,
    totalMarks,
    totalTimeMinutes: totalTime,
    questionCount,
    generatedAt: Date.now(),
  };
}

function pickUnused(pool: CanonicalQuestion[], used: Set<string>): CanonicalQuestion | undefined {
  for (const q of pool) {
    if (!used.has(q.id)) return q;
  }
  return undefined;
}

export function computeExamAnalytics(
  paper: ExamPaper,
  answers: Record<string, ExamAnswer>,
): ExamAnalytics {
  let marksScored = 0;
  const sectionBreakdown: ExamAnalytics["sectionBreakdown"] = [];
  const topicMap = new Map<string, { total: number; correct: number; marks: number; maxMarks: number }>();
  const subtopicMap = new Map<string, { total: number; correct: number }>();
  const diffMap = new Map<string, { total: number; correct: number }>();
  const sectionTimes: Record<string, number> = {};
  let totalSeconds = 0;

  for (const sec of paper.sections) {
    let secScored = 0;
    for (const q of sec.questions) {
      const ans = answers[q.main.id];
      const answeredQ = (ans?.branch === "or" && q.or) ? q.or : q.main;

      const topic = answeredQ.topicKey || "Other";
      if (!topicMap.has(topic)) topicMap.set(topic, { total: 0, correct: 0, marks: 0, maxMarks: 0 });
      const te = topicMap.get(topic)!;
      te.total++;
      te.maxMarks += sec.marksPerQuestion;

      const sub = answeredQ.subtopic || "General";
      if (!subtopicMap.has(sub)) subtopicMap.set(sub, { total: 0, correct: 0 });
      const se = subtopicMap.get(sub)!;
      se.total++;

      const diff = answeredQ.difficulty || "Medium";
      if (!diffMap.has(diff)) diffMap.set(diff, { total: 0, correct: 0 });
      const de = diffMap.get(diff)!;
      de.total++;

      if (ans?.correct) {
        secScored += sec.marksPerQuestion;
        te.correct++;
        te.marks += sec.marksPerQuestion;
        se.correct++;
        de.correct++;
      }

      const t = ans?.timeSec ?? 0;
      sectionTimes[sec.section] = (sectionTimes[sec.section] ?? 0) + t;
      totalSeconds += t;
    }

    marksScored += secScored;
    sectionBreakdown.push({
      section: sec.section,
      maxMarks: sec.sectionMarks,
      scored: secScored,
      percent: sec.sectionMarks > 0 ? Math.round((secScored / sec.sectionMarks) * 100) : 0,
      timeSec: sectionTimes[sec.section] ?? 0,
    });
  }

  const topicHeatmap = Array.from(topicMap.entries()).map(([topicKey, d]) => ({
    topicKey,
    total: d.total,
    correct: d.correct,
    percent: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    marks: d.marks,
    maxMarks: d.maxMarks,
  })).sort((a, b) => a.percent - b.percent);

  const subtopicHeatmap = Array.from(subtopicMap.entries()).map(([subtopic, d]) => ({
    subtopic,
    total: d.total,
    correct: d.correct,
    percent: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
  }));

  const difficultyBreakdown = Array.from(diffMap.entries()).map(([difficulty, d]) => ({
    difficulty,
    total: d.total,
    correct: d.correct,
    percent: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
  }));

  const weakAreas = subtopicHeatmap
    .filter(s => s.percent < 50)
    .sort((a, b) => a.percent - b.percent)
    .map(s => s.subtopic);

  return {
    totalMarks: paper.totalMarks,
    marksScored,
    percentScore: paper.totalMarks > 0 ? Math.round((marksScored / paper.totalMarks) * 100) : 0,
    sectionBreakdown,
    topicHeatmap,
    difficultyBreakdown,
    subtopicHeatmap,
    timeAnalysis: {
      totalSeconds,
      perSectionSeconds: sectionTimes as Record<SectionKey, number>,
    },
    weakAreas,
  };
}
