import type { HistoricalDataset, HistoricalQuestionItem } from "./historicalDataset";
import type { ProbabilisticContext } from "./probabilisticScoring";
import { scoreArchetypeWithBayesianSmoothing } from "./probabilisticScoring";
import {
  buildConstrainedPaper,
  type ConstrainedPaperCandidate,
  type PaperSection,
} from "./constrainedPaperConstructor";

export interface YearlyBacktestResult {
  holdoutYear: number;
  sectionFidelity: number;
  topicMarkShareError: number;
  topKRecall: number;
  paperSimilarityScore: number;
}

export interface LeaveOneYearOutBacktestReport {
  results: YearlyBacktestResult[];
  aggregate: {
    avgSectionFidelity: number;
    avgTopicMarkShareError: number;
    avgTopKRecall: number;
    avgPaperSimilarityScore: number;
  };
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

function toHistoricalFormat(raw: string): HistoricalQuestionItem["format"] {
  if (
    raw === "MCQ" ||
    raw === "Short" ||
    raw === "Long" ||
    raw === "Case-Based" ||
    raw === "Assertion-Reasoning" ||
    raw === "VSA"
  ) {
    return raw;
  }
  return "Short";
}

function toHistoricalCompetency(raw: string): HistoricalQuestionItem["competencyType"] {
  const value = raw.toLowerCase();
  if (value.includes("case")) return "case-based";
  if (value.includes("assertion")) return "assertion-reasoning";
  if (value.includes("diagram")) return "diagram";
  if (value.includes("application")) return "application";
  if (value.includes("concept")) return "conceptual";
  return "procedural";
}

function sectionOf(item: HistoricalQuestionItem): PaperSection {
  if (item.marks === 1) return "A";
  if (item.marks === 2) return "B";
  if (item.marks === 3) return "C";
  if (item.marks === 5) return "D";
  return "E";
}

function sectionMarks(items: HistoricalQuestionItem[]): Record<PaperSection, number> {
  const out: Record<PaperSection, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const item of items) {
    out[sectionOf(item)] += item.marks;
  }
  return out;
}

function sectionFidelity(pred: Record<PaperSection, number>, truth: Record<PaperSection, number>): number {
  const sections: PaperSection[] = ["A", "B", "C", "D", "E"];
  const totalTruth = Math.max(
    1,
    sections.reduce((sum, s) => sum + (truth[s] || 0), 0)
  );
  const diff = sections.reduce(
    (sum, s) => sum + Math.abs((pred[s] || 0) - (truth[s] || 0)),
    0
  );
  return Math.max(0, 1 - diff / (2 * totalTruth));
}

function topicShareMap(items: HistoricalQuestionItem[]): Record<string, number> {
  const total = Math.max(1, items.reduce((sum, x) => sum + x.marks, 0));
  const marksByTopic: Record<string, number> = {};
  for (const item of items) {
    marksByTopic[item.topic] = (marksByTopic[item.topic] || 0) + item.marks;
  }
  const out: Record<string, number> = {};
  Object.keys(marksByTopic).forEach((topic) => {
    out[topic] = marksByTopic[topic] / total;
  });
  return out;
}

function topicMarkShareError(predItems: HistoricalQuestionItem[], truthItems: HistoricalQuestionItem[]): number {
  const pred = topicShareMap(predItems);
  const truth = topicShareMap(truthItems);
  const topics = new Set<string>([...Object.keys(pred), ...Object.keys(truth)]);
  if (topics.size === 0) return 1;
  let sumAbs = 0;
  topics.forEach((topic) => {
    sumAbs += Math.abs((pred[topic] || 0) - (truth[topic] || 0));
  });
  return sumAbs / topics.size;
}

function topKRecall(predItems: HistoricalQuestionItem[], truthItems: HistoricalQuestionItem[], k: number): number {
  const truthTop = [...truthItems]
    .sort((a, b) => b.marks - a.marks)
    .slice(0, k)
    .map((x) => x.archetypeKey);
  const predTop = [...predItems]
    .sort((a, b) => b.marks - a.marks)
    .slice(0, k)
    .map((x) => x.archetypeKey);
  const truthSet = new Set(truthTop);
  if (truthSet.size === 0) return 0;
  let hit = 0;
  predTop.forEach((kItem) => {
    if (truthSet.has(kItem)) hit += 1;
  });
  return hit / truthSet.size;
}

function contextForYear(year: number): ProbabilisticContext {
  if (year >= 2023) {
    return { targetYear: year, policyRegime: "nep_competency_2023_plus" };
  }
  if (year >= 2020) {
    return { targetYear: year, policyRegime: "nep_transition_2020_2022" };
  }
  return { targetYear: year, policyRegime: "nep_pre_2020" };
}

export function runLeaveOneYearOutBacktest(dataset: HistoricalDataset): LeaveOneYearOutBacktestReport {
  const years = [...dataset.years];
  const results: YearlyBacktestResult[] = [];

  for (const holdoutYear of years) {
    const train = dataset.items.filter((x) => x.sourceYear !== holdoutYear);
    const holdout = dataset.items.filter(
      (x) => x.sourceYear === holdoutYear && x.sourceType === "official_board"
    );
    if (holdout.length === 0) continue;

    const subject = holdout[0].subject;
    const candidates = train.filter((x) => x.subject === subject);
    const context = contextForYear(holdoutYear);

    const scoredCandidates: ConstrainedPaperCandidate[] = candidates.map((c) => {
      const scored = scoreArchetypeWithBayesianSmoothing({
        input: {
          subject: c.subject,
          topic: c.topic,
          subtopic: c.subtopic,
          marks: c.marks,
          format: c.format,
          bloom: c.bloom,
          policyTag: c.competencyType,
          sourceYearHint: c.sourceYear,
        },
        context,
        historicalItems: train,
      });
      return {
        id: c.id,
        subject: c.subject,
        topicKey: c.topic,
        subtopic: c.subtopic,
        section: sectionOf(c),
        marks: c.marks,
        format: c.format,
        competencyType: c.competencyType,
        score: scored.posterior,
      };
    });

    const paper = buildConstrainedPaper({
      candidates: scoredCandidates,
      blueprint: {
        sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
        competencyFocusedMinShare: 0.5,
        caseBasedMinCount: 3,
      },
    });

    const predItems: HistoricalQuestionItem[] = paper.selected.map((row) => ({
      id: row.id,
      subject: row.subject,
      topic: row.topicKey,
      subtopic: row.subtopic,
      marks: row.marks,
      format: toHistoricalFormat(row.format),
      bloom: "Applying",
      competencyType: toHistoricalCompetency(row.competencyType),
      sourceYear: holdoutYear,
      sourceType: "official_board",
      sourceOrigin: "official",
      sourceLabel: `Predicted ${holdoutYear}`,
      archetypeKey: [
        row.subject,
        row.topicKey.toLowerCase(),
        row.subtopic.toLowerCase(),
        String(row.marks),
        row.format,
      ].join("|"),
    }));

    const predSection = sectionMarks(predItems);
    const truthSection = sectionMarks(holdout);
    const secFid = sectionFidelity(predSection, truthSection);
    const topicErr = topicMarkShareError(predItems, holdout);
    const recall = topKRecall(predItems, holdout, 20);
    const similarity =
      secFid * 0.45 + (1 - Math.min(1, topicErr * 2)) * 0.3 + recall * 0.25;

    results.push({
      holdoutYear,
      sectionFidelity: secFid,
      topicMarkShareError: topicErr,
      topKRecall: recall,
      paperSimilarityScore: similarity,
    });
  }

  return {
    results,
    aggregate: {
      avgSectionFidelity: avg(results.map((r) => r.sectionFidelity)),
      avgTopicMarkShareError: avg(results.map((r) => r.topicMarkShareError)),
      avgTopKRecall: avg(results.map((r) => r.topKRecall)),
      avgPaperSimilarityScore: avg(results.map((r) => r.paperSimilarityScore)),
    },
  };
}
