import { getCanonicalHistoricalDataset, type HistoricalQuestionItem } from "./historicalDataset";

export interface RotationPair {
  subtopicA: string;
  subtopicB: string;
  topic: string;
  subject: "Maths" | "Science";
}

export interface RotationSignal {
  gapYears: number;
  lastAppeared: number | null;
  appearedYears: number[];
  totalYears: number;
  rotationBoost: number;
  pairPartnerLastAppeared: number | null;
}

const MATHS_ROTATION_PAIRS: RotationPair[] = [
  { subtopicA: "Distance Formula", subtopicB: "Section Formula", topic: "Coordinate Geometry", subject: "Maths" },
  { subtopicA: "BPT (Basic Proportionality Theorem)", subtopicB: "Pythagoras/Converse", topic: "Triangles", subject: "Maths" },
  { subtopicA: "Tangent Properties", subtopicB: "Tangent Theorems & Proofs", topic: "Circles", subject: "Maths" },
  { subtopicA: "Mean (Step Deviation)", subtopicB: "Median of Grouped Data", topic: "Statistics", subject: "Maths" },
  { subtopicA: "Algebraic Solution", subtopicB: "Word/Application Problems", topic: "Quadratic Equations", subject: "Maths" },
  { subtopicA: "Trig Identities/Proofs", subtopicB: "Application/Heights & Distances", topic: "Trigonometry", subject: "Maths" },
  { subtopicA: "Cylinder/Cone/Sphere", subtopicB: "Combination/Transformation", topic: "Surface Areas and Volumes", subject: "Maths" },
];

const SCIENCE_ROTATION_PAIRS: RotationPair[] = [
  { subtopicA: "Balancing Equations & Types of Reactions", subtopicB: "Applications & Daily-life Context", topic: "Chemical Reactions & Equations", subject: "Science" },
  { subtopicA: "Nutrition & Respiration (Human + Plants)", subtopicB: "Transportation & Excretion in Humans", topic: "Life Processes", subject: "Science" },
  { subtopicA: "Nervous System & Reflex Actions", subtopicB: "Plant Hormones & Movements", topic: "Control & Coordination", subject: "Science" },
  { subtopicA: "Ohm's Law & Circuit Numericals", subtopicB: "Heating Effect & Power Calculations", topic: "Electricity", subject: "Science" },
  { subtopicA: "Mirror / Lens Formula & Ray Diagrams", subtopicB: "Refraction through Glass Slab / Prism", topic: "Light – Reflection & Refraction", subject: "Science" },
  { subtopicA: "Asexual Reproduction & Diagrams", subtopicB: "Sexual Reproduction in Humans & Plants", topic: "How do Organisms Reproduce?", subject: "Science" },
];

// PERF-2 — MEMOISED, AND THE SAFETY ARGUMENT IS THE PURITY, NOT A PASSING TEST.
// The body reads only `raw`, holds no closure state and touches nothing outside its
// argument, so a memo CANNOT change the answer.
//
// WHY IT PAYS: `fuzzySubtopicMatch` below normalises BOTH sides on EVERY comparison,
// against the historical items, for each of ~5,100 distinct question signatures. Building
// the prediction bank measured ~9.9 s, of which the CPU profile put ~80% in this function
// and its siblings — and 0.9% in the actual scoring. Measured on the real string
// population: 18,356 occurrences over 2,064 distinct inputs (11.2% distinct), 36.8x faster
// memoised with identical results on every one.
//
// ⚠ BOUNDED BY CONSTRUCTION: the inputs are topic and subtopic labels from the question
// bank and the historical dataset — about 2,000 distinct in total. This is not a
// general-purpose cache and must never be pointed at user input.
const normCache = new Map<string, string>();
function norm(raw: string): string {
  const hit = normCache.get(raw);
  if (hit !== undefined) return hit;
  const value = raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  normCache.set(raw, value);
  return value;
}

function fuzzySubtopicMatch(a: string, b: string): boolean {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" "));
  const wordsB = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wordsA) if (wordsB.has(w)) overlap++;
  return Math.min(wordsA.size, wordsB.size) >= 2 && overlap / Math.min(wordsA.size, wordsB.size) >= 0.7;
}

function getSubtopicYears(
  items: HistoricalQuestionItem[],
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string
): number[] {
  const years = new Set<number>();
  for (const item of items) {
    if (item.subject !== subject) continue;
    if (!fuzzySubtopicMatch(item.topic, topic)) continue;
    if (!fuzzySubtopicMatch(item.subtopic, subtopic)) continue;
    years.add(item.sourceYear);
  }
  return [...years].sort((a, b) => a - b);
}

function findRotationPartner(
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string
): RotationPair | null {
  const pairs = subject === "Maths" ? MATHS_ROTATION_PAIRS : SCIENCE_ROTATION_PAIRS;
  for (const pair of pairs) {
    if (!fuzzySubtopicMatch(pair.topic, topic)) continue;
    if (fuzzySubtopicMatch(pair.subtopicA, subtopic) || fuzzySubtopicMatch(pair.subtopicB, subtopic)) {
      return pair;
    }
  }
  return null;
}

export function computeRotationSignal(args: {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  targetYear: number;
  cutoffYear?: number;
}): RotationSignal {
  const { subject, topic, subtopic, targetYear, cutoffYear } = args;
  const dataset = getCanonicalHistoricalDataset();
  const items = cutoffYear != null
    ? dataset.items.filter(i => i.sourceYear < cutoffYear)
    : dataset.items;
  const allYears = cutoffYear != null
    ? dataset.years.filter(y => y < cutoffYear)
    : dataset.years;
  const totalYears = allYears.length;

  const appearedYears = getSubtopicYears(items, subject, topic, subtopic);
  const lastAppeared = appearedYears.length > 0 ? appearedYears[appearedYears.length - 1] : null;
  const gapYears = lastAppeared != null ? targetYear - lastAppeared : totalYears;

  const pair = findRotationPartner(subject, topic, subtopic);
  let pairPartnerLastAppeared: number | null = null;
  if (pair) {
    const partnerSubtopic = fuzzySubtopicMatch(pair.subtopicA, subtopic)
      ? pair.subtopicB
      : pair.subtopicA;
    const partnerYears = getSubtopicYears(items, subject, topic, partnerSubtopic);
    pairPartnerLastAppeared = partnerYears.length > 0 ? partnerYears[partnerYears.length - 1] : null;
  }

  let rotationBoost = 0;

  if (lastAppeared != null && lastAppeared >= targetYear - 1) {
    rotationBoost = -0.15;
  } else if (gapYears >= 3) {
    rotationBoost = 0.25;
  } else if (gapYears === 2) {
    rotationBoost = 0.10;
  }

  if (pair && pairPartnerLastAppeared != null) {
    const partnerGap = targetYear - pairPartnerLastAppeared;
    if (partnerGap <= 1 && gapYears >= 2) {
      rotationBoost += 0.10;
    }
    if (partnerGap >= 3 && gapYears <= 1) {
      rotationBoost -= 0.05;
    }
  }

  rotationBoost = Math.max(-0.20, Math.min(0.35, rotationBoost));

  return {
    gapYears,
    lastAppeared,
    appearedYears,
    totalYears,
    rotationBoost,
    pairPartnerLastAppeared,
  };
}

export function getAllRotationPairs(subject: "Maths" | "Science"): RotationPair[] {
  return subject === "Maths" ? [...MATHS_ROTATION_PAIRS] : [...SCIENCE_ROTATION_PAIRS];
}
