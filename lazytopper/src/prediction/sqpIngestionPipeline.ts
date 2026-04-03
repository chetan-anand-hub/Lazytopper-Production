import { CBSE_HISTORICAL_ARCHETYPES, type CbseArchetypeEntry } from "./cbseHistoricalArchetypes";

export interface SQPSignal {
  matchesSQP: boolean;
  sqpYear: number | null;
  sqpBoost: number;
  sqpMatchType: "exact" | "topic" | "none";
  sqpMatchDetails: string;
}

export interface SQPIngestionInput {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  marks: number;
  format: string;
  bloom: string;
  competencyType: string;
  year: number;
}

export interface SQPIngestionResult {
  accepted: number;
  rejected: number;
  errors: string[];
  activeSQPYear: number;
}

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
  return Math.min(wordsA.size, wordsB.size) >= 2 && overlap / Math.min(wordsA.size, wordsB.size) >= 0.7;
}

let sqpCache: CbseArchetypeEntry[] | null = null;
let dynamicSQPEntries: CbseArchetypeEntry[] = [];

function getSQPEntries(): CbseArchetypeEntry[] {
  if (sqpCache) return sqpCache;
  sqpCache = [
    ...CBSE_HISTORICAL_ARCHETYPES.filter(e => e.sourceType === "official_sqp"),
    ...dynamicSQPEntries,
  ];
  return sqpCache;
}

export function ingestSQPData(entries: SQPIngestionInput[]): SQPIngestionResult {
  const errors: string[] = [];
  let accepted = 0;
  let rejected = 0;

  for (const entry of entries) {
    if (!entry.subject || !entry.topic || !entry.subtopic || !entry.marks || !entry.year) {
      errors.push(`Rejected: missing required field in ${entry.topic}/${entry.subtopic}`);
      rejected++;
      continue;
    }

    if (entry.marks < 1 || entry.marks > 6) {
      errors.push(`Rejected: invalid marks (${entry.marks}) for ${entry.topic}/${entry.subtopic}`);
      rejected++;
      continue;
    }

    dynamicSQPEntries.push({
      subject: entry.subject,
      topic: entry.topic,
      subtopic: entry.subtopic,
      marks: entry.marks,
      format: entry.format as CbseArchetypeEntry["format"],
      bloom: entry.bloom as CbseArchetypeEntry["bloom"],
      competencyType: entry.competencyType as CbseArchetypeEntry["competencyType"],
      sourceYear: entry.year,
      sourceType: "official_sqp",
    });
    accepted++;
  }

  sqpCache = null;

  const activeSQPYear = getLatestSQPYear() ?? 0;

  return { accepted, rejected, errors, activeSQPYear };
}

export function clearDynamicSQPData(): void {
  dynamicSQPEntries = [];
  sqpCache = null;
}

export function getActiveSQPEntryCount(): number {
  return getSQPEntries().length;
}

export function getLatestSQPYear(): number | null {
  const entries = getSQPEntries();
  if (entries.length === 0) return null;
  return Math.max(...entries.map(e => e.sourceYear));
}

export function getSQPEntriesForYear(year: number): CbseArchetypeEntry[] {
  return getSQPEntries().filter(e => e.sourceYear === year);
}

export function computeSQPSignal(args: {
  subject: "Maths" | "Science";
  topic: string;
  subtopic: string;
  marks: number;
  format: string;
  targetYear: number;
}): SQPSignal {
  const { subject, topic, subtopic, marks, format, targetYear } = args;

  const sqpYear = targetYear;
  const sqpEntries = getSQPEntries().filter(
    e => e.subject === subject && e.sourceYear === sqpYear
  );

  const fallbackYear = sqpYear - 1;
  const fallbackEntries = sqpEntries.length > 0
    ? sqpEntries
    : getSQPEntries().filter(e => e.subject === subject && e.sourceYear === fallbackYear);

  const effectiveYear = sqpEntries.length > 0 ? sqpYear : (fallbackEntries.length > 0 ? fallbackYear : null);

  if (fallbackEntries.length === 0) {
    return { matchesSQP: false, sqpYear: null, sqpBoost: 0, sqpMatchType: "none", sqpMatchDetails: "No SQP data available" };
  }

  for (const entry of fallbackEntries) {
    if (
      fuzzyMatch(entry.topic, topic) &&
      fuzzyMatch(entry.subtopic, subtopic) &&
      entry.marks === marks &&
      norm(entry.format) === norm(format)
    ) {
      return {
        matchesSQP: true,
        sqpYear: effectiveYear,
        sqpBoost: 1.0,
        sqpMatchType: "exact",
        sqpMatchDetails: `Exact match in SQP ${effectiveYear}: ${entry.topic} > ${entry.subtopic} (${entry.marks}m, ${entry.format})`,
      };
    }
  }

  for (const entry of fallbackEntries) {
    if (
      fuzzyMatch(entry.topic, topic) &&
      fuzzyMatch(entry.subtopic, subtopic)
    ) {
      return {
        matchesSQP: true,
        sqpYear: effectiveYear,
        sqpBoost: 0.6,
        sqpMatchType: "topic",
        sqpMatchDetails: `Topic match in SQP ${effectiveYear}: ${entry.topic} > ${entry.subtopic}`,
      };
    }
  }

  for (const entry of fallbackEntries) {
    if (fuzzyMatch(entry.topic, topic)) {
      return {
        matchesSQP: true,
        sqpYear: effectiveYear,
        sqpBoost: 0.3,
        sqpMatchType: "topic",
        sqpMatchDetails: `Topic-level match in SQP ${effectiveYear}: ${entry.topic}`,
      };
    }
  }

  return {
    matchesSQP: false,
    sqpYear: effectiveYear,
    sqpBoost: 0,
    sqpMatchType: "none",
    sqpMatchDetails: `No match in SQP ${effectiveYear}`,
  };
}

export function getSQPCoverage(subject: "Maths" | "Science"): {
  year: number | null;
  topics: string[];
  subtopics: { topic: string; subtopic: string; marks: number; format: string }[];
} {
  const latestYear = getLatestSQPYear();
  if (!latestYear) return { year: null, topics: [], subtopics: [] };

  const entries = getSQPEntries().filter(e => e.subject === subject && e.sourceYear === latestYear);
  const topics = [...new Set(entries.map(e => e.topic))];
  const subtopics = entries.map(e => ({
    topic: e.topic,
    subtopic: e.subtopic,
    marks: e.marks,
    format: e.format,
  }));

  return { year: latestYear, topics, subtopics };
}
