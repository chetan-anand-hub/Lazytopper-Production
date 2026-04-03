import { PredictionCore } from "../data/predictionCore";
import type { CanonicalQuestion, SectionKey, LTSubjectKey } from "../data/predictionTypes";
import { getActiveProgressUser } from "../services/studentProgressStore";
import { class10TopicTrendList } from "../data/class10MathTopicTrends";
import { class10ScienceTopicTrendList } from "../data/class10ScienceTopicTrends";
import {
  getGuaranteedArchetypes,
  type GuaranteedArchetype,
} from "../prediction/guaranteedArchetypes";

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

function norm(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return Math.min(wordsA.size, wordsB.size) >= 2 && overlap / Math.min(wordsA.size, wordsB.size) >= 0.6;
}

const MATHS_TOPIC_ALIASES: Record<string, string> = {
  "Introduction to Trigonometry": "Trigonometry",
  "Applications of Trigonometry": "Trigonometry",
  "Arithmetic Progressions": "Arithmetic Progression",
  "Real Numbers": "Real Numbers",
  "Polynomials": "Polynomials",
  "Pair of Linear Equations": "Pair of Linear Equations",
  "Quadratic Equations": "Quadratic Equations",
  "Triangles": "Triangles",
  "Coordinate Geometry": "Coordinate Geometry",
  "Trigonometry": "Trigonometry",
  "Circles": "Circles",
  "Constructions": "Constructions",
  "Areas Related to Circles": "Areas Related to Circles",
  "Surface Areas and Volumes": "Surface Areas and Volumes",
  "Statistics": "Statistics",
  "Probability": "Probability",
};

const SCIENCE_TOPIC_TO_SLUG: Record<string, string> = {
  "Chemical Reactions & Equations": "ChemicalReactions",
  "Chemical Reactions and Equations": "ChemicalReactions",
  "ChemicalReactions": "ChemicalReactions",
  "Acids, Bases & Salts": "AcidsBasesSalts",
  "Acids, Bases and Salts": "AcidsBasesSalts",
  "Acids Bases and Salts": "AcidsBasesSalts",
  "AcidsBasesSalts": "AcidsBasesSalts",
  "Metals & Non-metals": "MetalsNonMetals",
  "Metals and Non-Metals": "MetalsNonMetals",
  "Metals and Non-metals": "MetalsNonMetals",
  "MetalsNonMetals": "MetalsNonMetals",
  "Carbon & its Compounds": "CarbonCompounds",
  "Carbon and its Compounds": "CarbonCompounds",
  "CarbonCompounds": "CarbonCompounds",
  "Life Processes": "LifeProcesses",
  "LifeProcesses": "LifeProcesses",
  "Control & Coordination": "ControlAndCoordination",
  "Control and Coordination": "ControlAndCoordination",
  "ControlAndCoordination": "ControlAndCoordination",
  "How do Organisms Reproduce?": "Reproduction",
  "How do Organisms Reproduce": "Reproduction",
  "Reproduction": "Reproduction",
  "Heredity & Evolution": "HeredityEvolution",
  "Heredity and Evolution": "HeredityEvolution",
  "HeredityEvolution": "HeredityEvolution",
  "Light – Reflection & Refraction": "Light",
  "Light - Reflection & Refraction": "Light",
  "Light": "Light",
  "The Human Eye & the Colourful World": "HumanEyeAndColourfulWorld",
  "Human Eye and the Colourful World": "HumanEyeAndColourfulWorld",
  "HumanEyeAndColourfulWorld": "HumanEyeAndColourfulWorld",
  "Electricity": "Electricity",
  "Magnetic Effects of Electric Current": "MagneticEffects",
  "MagneticEffects": "MagneticEffects",
  "Our Environment / Sources of Energy": "OurEnvironment",
  "Our Environment": "OurEnvironment",
  "OurEnvironment": "OurEnvironment",
  "Management of Natural Resources": "OurEnvironment",
  "Sources of Energy": "OurEnvironment",
};

function canonicalTopicKey(topicKey: string, subject: LTSubjectKey): string {
  if (subject === "Maths") {
    return MATHS_TOPIC_ALIASES[topicKey] ?? topicKey;
  }
  return SCIENCE_TOPIC_TO_SLUG[topicKey] ?? topicKey;
}

const SCIENCE_STREAM_BY_SLUG: Record<string, "Physics" | "Chemistry" | "Biology"> = {
  Light: "Physics",
  HumanEyeAndColourfulWorld: "Physics",
  Electricity: "Physics",
  MagneticEffects: "Physics",
  ChemicalReactions: "Chemistry",
  AcidsBasesSalts: "Chemistry",
  MetalsNonMetals: "Chemistry",
  CarbonCompounds: "Chemistry",
  LifeProcesses: "Biology",
  ControlAndCoordination: "Biology",
  Reproduction: "Biology",
  HeredityEvolution: "Biology",
  OurEnvironment: "Biology",
};

const SCIENCE_STREAM_TARGETS: Record<string, number> = {
  Physics: 27,
  Chemistry: 20,
  Biology: 33,
};
const SCIENCE_STREAM_TOLERANCE = 8;

function getEffectiveScore(q: CanonicalQuestion): number {
  const qAny = q as Record<string, unknown>;
  const adjusted = Number(qAny._adjustedScore ?? 0);
  if (adjusted > 0) return adjusted;
  return q.predictionScore ?? 2.5;
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
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

function getTopicWeightageMap(subject: LTSubjectKey): Map<string, number> {
  const map = new Map<string, number>();
  if (subject === "Maths") {
    for (const entry of class10TopicTrendList) {
      map.set(entry.topicKey, entry.weightagePercent);
    }
  } else {
    for (const entry of class10ScienceTopicTrendList) {
      map.set(entry.topicKey, entry.weightagePercent);
    }
  }
  return map;
}

function getScienceStream(topicKey: string, subject: LTSubjectKey): "Physics" | "Chemistry" | "Biology" | null {
  const slug = canonicalTopicKey(topicKey, subject);
  return SCIENCE_STREAM_BY_SLUG[slug] ?? null;
}

function checkScienceStreamBalance(paper: ExamPaper): boolean {
  const streamMarks: Record<string, number> = { Physics: 0, Chemistry: 0, Biology: 0 };
  for (const sec of paper.sections) {
    for (const q of sec.questions) {
      const stream = getScienceStream(q.main.topicKey, paper.subject);
      if (stream) streamMarks[stream] += sec.marksPerQuestion;
    }
  }
  for (const [stream, target] of Object.entries(SCIENCE_STREAM_TARGETS)) {
    if (Math.abs(streamMarks[stream] - target) > SCIENCE_STREAM_TOLERANCE) return false;
  }
  return true;
}

function weightedSelect(
  pool: CanonicalQuestion[],
  usedIds: Set<string>,
  rng: () => number,
  topicNeedMap: Map<string, number>,
  subject: LTSubjectKey,
): CanonicalQuestion | undefined {
  const candidates: { q: CanonicalQuestion; weight: number }[] = [];

  for (const q of pool) {
    if (usedIds.has(q.id)) continue;

    const predScore = getEffectiveScore(q);
    const predWeight = Math.pow(Math.max(predScore, 0.5), 1.5);

    const canonical = canonicalTopicKey(q.topicKey, subject);
    const topicNeed = topicNeedMap.get(canonical) ?? 0;
    const topicWeight = Math.max(0, topicNeed);

    const combinedWeight = predWeight * 0.6 + topicWeight * 0.4 + rng() * 0.3;
    candidates.push({ q, weight: Math.max(0.01, combinedWeight) });
  }

  if (candidates.length === 0) return undefined;

  let totalWeight = 0;
  for (const c of candidates) totalWeight += c.weight;

  let r = rng() * totalWeight;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return c.q;
  }
  return candidates[candidates.length - 1].q;
}

export function generateUnlimitedPaper(subject: LTSubjectKey, seed?: number): ExamPaper {
  const all = PredictionCore.getAllQuestions().filter(q => q.subject === subject);
  const history = loadRecentPaperIds(subject);
  const actualSeed = seed ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff));
  const archetypes = getGuaranteedArchetypes(subject);

  let bestPaper: ExamPaper | null = null;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < 50; attempt++) {
    const rng = seededRandom(actualSeed + attempt * 7919);
    const paper = buildSinglePaper(all, subject, rng, actualSeed + attempt, archetypes);

    const allIds = new Set<string>();
    for (const sec of paper.sections) {
      for (const q of sec.questions) {
        allIds.add(q.main.id);
        if (q.or) allIds.add(q.or.id);
      }
    }

    const overlapOk = overlapOkWithHistory(allIds, history);
    const streamOk = subject !== "Science" || checkScienceStreamBalance(paper);

    if (overlapOk && streamOk) {
      bestPaper = paper;
      break;
    }

    const maxOverlap = history.reduce((mx, prev) => Math.max(mx, computeOverlap(allIds, prev)), 0);
    const penalty = streamOk ? 0 : 10;
    const score = maxOverlap + penalty;
    if (score < bestScore) {
      bestScore = score;
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
  archetypes: GuaranteedArchetype[],
): ExamPaper {
  const usedIds = new Set<string>();
  const sections: ExamSection[] = [];
  let totalMarks = 0;
  let totalTime = 0;
  let questionCount = 0;

  const topicWeightage = getTopicWeightageMap(subject);
  const targetMarksByTopic = new Map<string, number>();
  for (const [topic, pct] of topicWeightage) {
    targetMarksByTopic.set(topic, (pct / 100) * 80);
  }
  const accumulatedMarksByTopic = new Map<string, number>();

  const coveredArchetypes = new Set<number>();

  for (const bp of BLUEPRINT) {
    const sectionPool = pool.filter(q => q.section === bp.section && q.marks === bp.marks);

    const questions: ExamQuestion[] = [];
    const hasChoice = INTERNAL_CHOICE_SECTIONS.has(bp.section);
    const choiceCount = hasChoice ? 2 : 0;
    let choicesMade = 0;

    for (let i = 0; i < bp.count; i++) {
      const topicNeedMap = buildTopicNeedMap(targetMarksByTopic, accumulatedMarksByTopic, bp.marks, subject);

      let mainQ: CanonicalQuestion | undefined;

      if (i < 3) {
        mainQ = pickArchetypeQuestion(sectionPool, usedIds, archetypes, coveredArchetypes, bp.marks, rng);
      }
      if (!mainQ) {
        mainQ = weightedSelect(sectionPool, usedIds, rng, topicNeedMap, subject);
      }
      if (!mainQ) break;

      usedIds.add(mainQ.id);
      const canonical = canonicalTopicKey(mainQ.topicKey, subject);
      accumulatedMarksByTopic.set(
        canonical,
        (accumulatedMarksByTopic.get(canonical) ?? 0) + bp.marks,
      );

      let orQ: CanonicalQuestion | undefined;
      if (hasChoice && choicesMade < choiceCount) {
        orQ = weightedSelect(sectionPool, usedIds, rng, topicNeedMap, subject);
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

function buildTopicNeedMap(
  targets: Map<string, number>,
  accumulated: Map<string, number>,
  marksPerQ: number,
  subject: LTSubjectKey,
): Map<string, number> {
  void subject;
  const needMap = new Map<string, number>();
  for (const [topic, target] of targets) {
    const got = accumulated.get(topic) ?? 0;
    const remaining = Math.max(0, target - got);
    needMap.set(topic, remaining / marksPerQ);
  }
  return needMap;
}

function pickArchetypeQuestion(
  pool: CanonicalQuestion[],
  usedIds: Set<string>,
  archetypes: GuaranteedArchetype[],
  coveredArchetypes: Set<number>,
  marks: number,
  rng: () => number,
): CanonicalQuestion | undefined {
  for (let ai = 0; ai < archetypes.length; ai++) {
    if (coveredArchetypes.has(ai)) continue;
    const arch = archetypes[ai];

    if (marks < arch.minMarks || marks > arch.maxMarks) continue;

    const matches = pool.filter(
      q =>
        !usedIds.has(q.id) &&
        q.subtopic &&
        fuzzyMatch(q.subtopic, arch.subtopic) &&
        fuzzyMatch(q.topicKey, arch.topic),
    );

    if (matches.length > 0) {
      coveredArchetypes.add(ai);
      const idx = Math.floor(rng() * matches.length);
      return matches[idx];
    }
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
