import { CBSE_HISTORICAL_ARCHETYPES } from "./cbseHistoricalArchetypes";

export type HistoricalSourceType =
  | "official_board"
  | "official_sqp"
  | "official_ms";

export type HistoricalOrigin = "official" | "sample";

export type HistoricalCompetencyType =
  | "case-based"
  | "assertion-reasoning"
  | "application"
  | "diagram"
  | "procedural"
  | "conceptual";

export type HistoricalFormat =
  | "MCQ"
  | "Short"
  | "Long"
  | "Case-Based"
  | "Assertion-Reasoning"
  | "VSA";

export type HistoricalBloom =
  | "Remembering"
  | "Understanding"
  | "Applying"
  | "Analysing"
  | "Evaluating"
  | "Creating";

export interface HistoricalQuestionItem {
  id: string;
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  marks: number;
  format: HistoricalFormat;
  bloom: HistoricalBloom;
  competencyType: HistoricalCompetencyType;
  sourceYear: number;
  sourceType: HistoricalSourceType;
  sourceOrigin: HistoricalOrigin;
  sourceLabel: string;
  archetypeKey: string;
}

export interface HistoricalDataset {
  years: number[];
  items: HistoricalQuestionItem[];
}

function archetypeKeyOf(item: {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  marks: number;
  format: HistoricalFormat;
}): string {
  return [
    item.subject,
    item.topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    item.subtopic.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    String(item.marks),
    item.format.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
  ].join("|");
}

function sourceOriginForType(sourceType: HistoricalSourceType): HistoricalOrigin {
  return sourceType === "official_sqp" ? "sample" : "official";
}

function sourceLabel(year: number, sourceType: HistoricalSourceType): string {
  if (sourceType === "official_board") return `CBSE Board ${year}`;
  if (sourceType === "official_ms") return `CBSE Marking Scheme ${year}`;
  return `CBSE SQP ${year}`;
}

function buildFromArchetypes(): HistoricalQuestionItem[] {
  return CBSE_HISTORICAL_ARCHETYPES.map((entry, index) => {
    const origin = sourceOriginForType(entry.sourceType);
    return {
      id: `hist-${entry.subject.toLowerCase().slice(0, 3)}-${index}`,
      subject: entry.subject,
      topic: entry.topic,
      subtopic: entry.subtopic,
      marks: entry.marks,
      format: entry.format,
      bloom: entry.bloom,
      competencyType: entry.competencyType,
      sourceYear: entry.sourceYear,
      sourceType: entry.sourceType,
      sourceOrigin: origin,
      sourceLabel: sourceLabel(entry.sourceYear, entry.sourceType),
      archetypeKey: archetypeKeyOf(entry),
    };
  });
}

let cache: HistoricalDataset | null = null;

export function getCanonicalHistoricalDataset(): HistoricalDataset {
  if (cache) return cache;

  const items = buildFromArchetypes();
  const yearSet = new Set(items.map((i) => i.sourceYear));
  cache = {
    years: [...yearSet].sort((a, b) => a - b),
    items,
  };
  return cache;
}

export function getHistoricalItemsByYear(year: number): HistoricalQuestionItem[] {
  return getCanonicalHistoricalDataset().items.filter((item) => item.sourceYear === year);
}

export function getHistoricalCoverageSummary(): Record<number, number> {
  const dataset = getCanonicalHistoricalDataset();
  const out: Record<number, number> = {};
  for (const year of dataset.years) out[year] = 0;
  for (const item of dataset.items) {
    out[item.sourceYear] = (out[item.sourceYear] || 0) + 1;
  }
  return out;
}

function fuzzyNorm(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = fuzzyNorm(a);
  const nb = fuzzyNorm(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = na.split(" ");
  const wordsB = nb.split(" ");
  if (wordsA.length >= 2 && wordsB.length >= 2) {
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    let overlap = 0;
    for (const w of setA) {
      if (setB.has(w)) overlap++;
    }
    const minLen = Math.min(setA.size, setB.size);
    if (minLen > 0 && overlap / minLen >= 0.7) return true;
  }
  return false;
}

export function getTopicAppearanceByYear(
  subject: "Maths" | "Science",
  topic: string
): number[] {
  const dataset = getCanonicalHistoricalDataset();
  const years = new Set<number>();
  for (const item of dataset.items) {
    if (item.subject === subject && fuzzyMatch(item.topic, topic)) {
      years.add(item.sourceYear);
    }
  }
  return [...years].sort((a, b) => a - b);
}

export function getSubtopicAppearanceByYear(
  subject: "Maths" | "Science",
  topic: string,
  subtopic: string
): number[] {
  const dataset = getCanonicalHistoricalDataset();
  const years = new Set<number>();
  for (const item of dataset.items) {
    if (
      item.subject === subject &&
      fuzzyMatch(item.topic, topic) &&
      fuzzyMatch(item.subtopic, subtopic)
    ) {
      years.add(item.sourceYear);
    }
  }
  return [...years].sort((a, b) => a - b);
}
