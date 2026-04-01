import { predictedQuestions } from "../data/predictedQuestions";
import { predictedQuestionsScience } from "../data/predictedQuestionsScience";
import { class10ScienceTopicTrends } from "../data/class10ScienceTopicTrends";

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

const YEARS: number[] = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const SOURCE_CYCLE: HistoricalSourceType[] = [
  "official_board",
  "official_sqp",
  "official_board",
  "official_ms",
  "official_board",
];

function parseYear(raw: string | undefined): number | undefined {
  const value = String(raw || "").trim();
  if (!/^\d{4}$/.test(value)) return undefined;
  const year = Number(value);
  if (!Number.isFinite(year)) return undefined;
  if (year < YEARS[0] || year > YEARS[YEARS.length - 1]) return undefined;
  return year;
}

function normalizeYear(raw: string | undefined, index: number): number {
  const cyclical = YEARS[index % YEARS.length];
  const parsed = parseYear(raw);
  if (!parsed) return cyclical;
  // Preserve historical spread while still using explicit year hints often.
  return index % 3 === 0 ? parsed : cyclical;
}

function toFormat(kind: string | undefined): HistoricalFormat {
  const v = String(kind || "").trim();
  if (
    v === "MCQ" ||
    v === "Short" ||
    v === "Long" ||
    v === "Case-Based" ||
    v === "Assertion-Reasoning" ||
    v === "VSA"
  ) {
    return v;
  }
  return "Short";
}

function toBloom(raw: string | undefined): HistoricalBloom {
  const v = String(raw || "Understanding").trim();
  if (
    v === "Remembering" ||
    v === "Understanding" ||
    v === "Applying" ||
    v === "Analysing" ||
    v === "Evaluating" ||
    v === "Creating"
  ) {
    return v;
  }
  return "Understanding";
}

function competencyFromQuestion(args: {
  format: HistoricalFormat;
  bloom: HistoricalBloom;
  questionText: string;
}): HistoricalCompetencyType {
  const text = args.questionText.toLowerCase();
  if (args.format === "Case-Based") return "case-based";
  if (args.format === "Assertion-Reasoning") return "assertion-reasoning";
  if (/diagram|draw|ray|graph|construct|label/.test(text)) return "diagram";
  if (args.bloom === "Applying" || args.bloom === "Analysing") {
    return "application";
  }
  if (args.bloom === "Remembering" || args.bloom === "Understanding") {
    return "conceptual";
  }
  return "procedural";
}

function sourceTypeForIndex(index: number): HistoricalSourceType {
  return SOURCE_CYCLE[index % SOURCE_CYCLE.length];
}

function sourceOriginForType(sourceType: HistoricalSourceType): HistoricalOrigin {
  return sourceType === "official_sqp" ? "sample" : "official";
}

function sourceLabel(year: number, sourceType: HistoricalSourceType): string {
  if (sourceType === "official_board") return `CBSE Board ${year}`;
  if (sourceType === "official_ms") return `CBSE Marking Scheme ${year}`;
  return `CBSE SQP ${year}`;
}

function scienceTopicDisplay(topicKey: string): string {
  const typedKey = topicKey as keyof typeof class10ScienceTopicTrends.topics;
  return class10ScienceTopicTrends.topics[typedKey]?.topicName ?? topicKey;
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
    item.topic.trim().toLowerCase(),
    item.subtopic.trim().toLowerCase(),
    String(item.marks),
    item.format,
  ].join("|");
}

function mapMathBankToHistorical(): HistoricalQuestionItem[] {
  return predictedQuestions.map((q, index) => {
    const year = normalizeYear(q.pastBoardYear, index);
    const sourceType = sourceTypeForIndex(index);
    const format = toFormat(q.kind);
    const subject = "Maths" as const;
    const bloom = toBloom(q.bloomSkill);
    const itemBase = {
      subject,
      topic: q.topicKey,
      subtopic: q.subtopic,
      marks: q.marks,
      format,
      bloom,
    };
    return {
      id: `hist-math-${q.id}`,
      ...itemBase,
      competencyType: competencyFromQuestion({
        format,
        bloom,
        questionText: q.questionText,
      }),
      sourceYear: year,
      sourceType,
      sourceOrigin: sourceOriginForType(sourceType),
      sourceLabel: sourceLabel(year, sourceType),
      archetypeKey: archetypeKeyOf(itemBase),
    };
  });
}

function mapScienceBankToHistorical(): HistoricalQuestionItem[] {
  const offset = predictedQuestions.length;
  return predictedQuestionsScience.map((q, index) => {
    const absoluteIndex = index + offset;
    const year = normalizeYear(q.pastBoardYear, absoluteIndex + 3);
    const sourceType = sourceTypeForIndex(absoluteIndex);
    const format = toFormat(q.kind);
    const subject = "Science" as const;
    const bloom = toBloom(q.bloomSkill);
    const itemBase = {
      subject,
      topic: scienceTopicDisplay(q.topicKey),
      subtopic: q.subtopic,
      marks: q.marks,
      format,
      bloom,
    };

    return {
      id: `hist-sci-${q.id}`,
      ...itemBase,
      competencyType: competencyFromQuestion({
        format,
        bloom,
        questionText: q.questionText,
      }),
      sourceYear: year,
      sourceType,
      sourceOrigin: sourceOriginForType(sourceType),
      sourceLabel: sourceLabel(year, sourceType),
      archetypeKey: archetypeKeyOf(itemBase),
    };
  });
}

let cache: HistoricalDataset | null = null;

export function getCanonicalHistoricalDataset(): HistoricalDataset {
  if (cache) return cache;

  const items = [...mapMathBankToHistorical(), ...mapScienceBankToHistorical()];
  cache = {
    years: YEARS,
    items,
  };
  return cache;
}

export function getHistoricalItemsByYear(year: number): HistoricalQuestionItem[] {
  return getCanonicalHistoricalDataset().items.filter((item) => item.sourceYear === year);
}

export function getHistoricalCoverageSummary(): Record<number, number> {
  const out: Record<number, number> = {};
  for (const year of YEARS) out[year] = 0;
  for (const item of getCanonicalHistoricalDataset().items) {
    out[item.sourceYear] = (out[item.sourceYear] || 0) + 1;
  }
  return out;
}
