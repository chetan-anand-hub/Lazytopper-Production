import { PredictionCore } from "../data/predictionCore";
import type { CanonicalQuestion, SectionKey, LTSubjectKey } from "../data/predictionTypes";
import { resolveRuntimeTopicKey } from "./topicResolver";

export interface TopicMockSection {
  section: SectionKey;
  marksPerQuestion: number;
  questions: TopicMockQuestion[];
  sectionMarks: number;
  timeGuideMinutes: number;
}

export interface TopicMockQuestion {
  main: CanonicalQuestion;
  or?: CanonicalQuestion;
}

export interface TopicMockPaper {
  setIndex: number;
  topicKey: string;
  topicDisplayName: string;
  subject: LTSubjectKey;
  sections: TopicMockSection[];
  totalMarks: number;
  totalTimeMinutes: number;
  questionCount: number;
}

export interface TopicMockAnswer {
  questionId: string;
  selected: string;
  correct: boolean;
  timeSec: number;
  branch: "main" | "or";
}

export interface TopicMockAnalytics {
  totalMarks: number;
  marksScored: number;
  percentScore: number;
  sectionBreakdown: {
    section: SectionKey;
    maxMarks: number;
    scored: number;
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

const FULL_BLUEPRINT: { section: SectionKey; count: number; marks: number; timeMinutes: number }[] = [
  { section: "A", count: 20, marks: 1, timeMinutes: 20 },
  { section: "B", count: 5, marks: 2, timeMinutes: 15 },
  { section: "C", count: 6, marks: 3, timeMinutes: 24 },
  { section: "D", count: 4, marks: 5, timeMinutes: 40 },
  { section: "E", count: 3, marks: 4, timeMinutes: 21 },
];
const INTERNAL_CHOICE_SECTIONS = new Set<SectionKey>(["B", "C", "D", "E"]);

const TOPIC_WEIGHTAGE: Record<string, number> = {
  "real-numbers": 7, "polynomials": 6,
  "pair-of-linear-equations": 11, "pair-of-linear-equations-in-two-variables": 11,
  "quadratic-equations": 8, "arithmetic-progressions": 7,
  "triangles": 10, "coordinate-geometry": 7,
  "trigonometry": 10, "circles": 6,
  "areas-related-to-circles": 4, "surface-areas-and-volumes": 7,
  "statistics": 7, "probability": 6,
  "chemical-reactions-and-equations": 8, "acids-bases-and-salts": 8,
  "metals-and-non-metals": 8, "carbon-and-its-compounds": 8,
  "life-processes": 9, "control-and-co-ordination": 7,
  "reproduction": 7, "heredity-and-evolution": 6,
  "light-reflection-and-refraction-incl-human-eye-prism": 10,
  "electricity": 9, "magnetic-effects-of-electric-current": 7,
  "our-environment": 5,
};

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 0x100000000);
  };
}

function shuffleWithSeed<T>(arr: T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

function getTopicWeightage(topicKey: string): number {
  return TOPIC_WEIGHTAGE[topicKey] ?? 6;
}

function computeProportionalBlueprint(topicKey: string, poolBySection: Map<SectionKey, number>) {
  const weightPercent = getTopicWeightage(topicKey);

  const WEIGHT_TO_A: [number, number][] = [
    [4, 3], [5, 3], [6, 4], [7, 4], [8, 5], [9, 5], [10, 6], [11, 7],
  ];
  const WEIGHT_TO_BCD: [number, number][] = [
    [4, 1], [6, 1], [7, 2], [9, 2], [10, 3], [11, 3],
  ];

  function lookup(table: [number, number][], w: number, fallback: number): number {
    let result = fallback;
    for (const [threshold, count] of table) {
      if (w >= threshold) result = count;
    }
    return result;
  }

  const sectionCounts: Record<SectionKey, number> = {
    A: lookup(WEIGHT_TO_A, weightPercent, 3),
    B: lookup(WEIGHT_TO_BCD, weightPercent, 1),
    C: lookup(WEIGHT_TO_BCD, weightPercent, 1),
    D: Math.min(2, lookup(WEIGHT_TO_BCD, weightPercent, 1)),
    E: 1,
  };

  return FULL_BLUEPRINT.map(bp => {
    const poolSize = poolBySection.get(bp.section) ?? 0;
    let count = sectionCounts[bp.section] ?? 1;
    count = Math.min(count, bp.count, Math.max(1, Math.floor(poolSize / 2)));
    count = Math.max(1, count);
    return {
      ...bp,
      count,
      timeMinutes: Math.round(bp.timeMinutes * (count / bp.count)),
    };
  });
}

function getTopicPool(topicKey: string, subject: LTSubjectKey): CanonicalQuestion[] {
  const allQ = PredictionCore.getAllQuestions();
  const topicKeys = new Set<string>();
  topicKeys.add(topicKey);

  const runtimeKey = resolveRuntimeTopicKey(topicKey, allQ.map(q => q.topicKey));
  topicKeys.add(runtimeKey);

  const slug = topicKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  topicKeys.add(slug);

  return allQ.filter(q => {
    if (q.subject !== subject) return false;
    const qSlug = q.topicKey.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return topicKeys.has(q.topicKey) || topicKeys.has(qSlug) ||
      slug === qSlug || topicKey === q.topicKey;
  });
}

function matchesSection(q: CanonicalQuestion, section: SectionKey, marks: number): boolean {
  if (q.section === section) return true;
  if (q.marks === marks) {
    if (section === "A" && (q.format === "MCQ" || q.format === "VSA" || q.format === "Assertion-Reasoning")) return true;
    if (section === "B" && q.format === "Short" && q.marks === 2) return true;
    if (section === "C" && (q.format === "Short" || q.format === "Long") && q.marks === 3) return true;
    if (section === "D" && q.format === "Long" && q.marks === 5) return true;
    if (section === "E" && q.format === "Case-Based" && q.marks === 4) return true;
  }
  return false;
}

export function buildTopicMockPaper(
  topicKey: string,
  subject: LTSubjectKey,
  setIndex: number,
  topicDisplayName?: string,
): TopicMockPaper {
  const seed = hashString(`${topicKey}-${subject}-set${setIndex}`) + setIndex * 7919;
  const rng = seededRandom(seed);

  const pool = getTopicPool(topicKey, subject);

  const poolBySection = new Map<SectionKey, number>();
  for (const q of pool) {
    const sec = q.section as SectionKey;
    poolBySection.set(sec, (poolBySection.get(sec) ?? 0) + 1);
    if (q.marks === 1 && !poolBySection.has("A")) poolBySection.set("A", 0);
    if (q.marks === 1) poolBySection.set("A", (poolBySection.get("A") ?? 0) + (q.section !== "A" ? 1 : 0));
  }

  const blueprint = computeProportionalBlueprint(topicKey, poolBySection);

  const usedIds = new Set<string>();
  const sections: TopicMockSection[] = [];
  let totalMarks = 0;
  let totalTime = 0;
  let questionCount = 0;

  for (const bp of blueprint) {
    const sectionPool = pool
      .filter(q => matchesSection(q, bp.section, bp.marks) && !usedIds.has(q.id));

    const shuffled = shuffleWithSeed(sectionPool, rng);
    const hasChoice = INTERNAL_CHOICE_SECTIONS.has(bp.section);

    const needed = hasChoice ? bp.count * 2 : bp.count;
    const selected = shuffled.slice(0, needed);

    const questions: TopicMockQuestion[] = [];
    if (hasChoice) {
      for (let i = 0; i < bp.count; i++) {
        const main = selected[i * 2];
        const or = selected[i * 2 + 1];
        if (main) {
          usedIds.add(main.id);
          if (or) usedIds.add(or.id);
          questions.push({ main, or: or || undefined });
        }
      }
    } else {
      for (let i = 0; i < bp.count && i < selected.length; i++) {
        usedIds.add(selected[i].id);
        questions.push({ main: selected[i] });
      }
    }

    const sectionMarks = questions.length * bp.marks;
    const timePerQ = bp.timeMinutes / bp.count;
    const timeGuide = Math.round(questions.length * timePerQ);

    sections.push({
      section: bp.section,
      marksPerQuestion: bp.marks,
      questions,
      sectionMarks,
      timeGuideMinutes: timeGuide,
    });

    totalMarks += sectionMarks;
    totalTime += timeGuide;
    questionCount += questions.length;
  }

  return {
    setIndex,
    topicKey,
    topicDisplayName: topicDisplayName || topicKey.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    subject,
    sections,
    totalMarks,
    totalTimeMinutes: totalTime,
    questionCount,
  };
}

export function getAvailableSetCount(topicKey: string, subject: LTSubjectKey): number {
  const pool = getTopicPool(topicKey, subject);
  const totalAvailable = pool.length;
  if (totalAvailable === 0) return 5;
  if (totalAvailable < 30) return 5;
  return Math.min(8, Math.floor(totalAvailable / 5));
}

export function computeOverlapPercent(paperA: TopicMockPaper, paperB: TopicMockPaper): number {
  const idsA = new Set<string>();
  paperA.sections.forEach(s => s.questions.forEach(q => {
    idsA.add(q.main.id);
    if (q.or) idsA.add(q.or.id);
  }));

  let overlap = 0;
  let total = 0;
  paperB.sections.forEach(s => s.questions.forEach(q => {
    total++;
    if (idsA.has(q.main.id)) overlap++;
    if (q.or && idsA.has(q.or.id)) overlap++;
  }));

  return total > 0 ? (overlap / total) * 100 : 0;
}

export function computeAnalytics(
  paper: TopicMockPaper,
  answers: Record<string, TopicMockAnswer>,
): TopicMockAnalytics {
  let marksScored = 0;
  const sectionBreakdown: TopicMockAnalytics["sectionBreakdown"] = [];
  const subtopicMap = new Map<string, { total: number; correct: number }>();
  const sectionTimes: Record<string, number> = {};
  let totalSeconds = 0;

  for (const sec of paper.sections) {
    let secScored = 0;
    for (const q of sec.questions) {
      const ans = answers[q.main.id];
      const answeredQ = (ans?.branch === "or" && q.or) ? q.or : q.main;
      const sub = answeredQ.subtopic || "General";
      if (!subtopicMap.has(sub)) subtopicMap.set(sub, { total: 0, correct: 0 });
      const entry = subtopicMap.get(sub)!;
      entry.total++;

      if (ans?.correct) {
        secScored += sec.marksPerQuestion;
        entry.correct++;
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
    });
  }

  const subtopicHeatmap = Array.from(subtopicMap.entries()).map(([subtopic, d]) => ({
    subtopic,
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
    subtopicHeatmap,
    timeAnalysis: {
      totalSeconds,
      perSectionSeconds: sectionTimes as Record<SectionKey, number>,
    },
    weakAreas,
  };
}
