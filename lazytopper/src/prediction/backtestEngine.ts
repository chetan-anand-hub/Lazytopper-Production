import { getCanonicalHistoricalDataset, type HistoricalQuestionItem } from "./historicalDataset";
import { compute5SignalScore, DEFAULT_SIGNAL_WEIGHTS, type FiveSignalWeights } from "./cbse5SignalScoring";

export interface BacktestYearResult {
  targetYear: number;
  totalArchetypes: number;
  predictedCorrectly: number;
  missedArchetypes: number;
  accuracy: number;
  avgConfidenceCorrect: number;
  avgConfidenceMissed: number;
  topMissed: { topic: string; subtopic: string }[];
  topCorrect: { topic: string; subtopic: string; confidence: number }[];
}

export interface BacktestSummary {
  subject: "Maths" | "Science";
  yearResults: BacktestYearResult[];
  overallAccuracy: number;
  averageConfidenceWhenCorrect: number;
  averageConfidenceWhenMissed: number;
  calibrationScore: number;
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

function getUniqueSubtopics(items: HistoricalQuestionItem[]): { topic: string; subtopic: string }[] {
  const seen = new Set<string>();
  const result: { topic: string; subtopic: string }[] = [];
  for (const item of items) {
    const key = `${norm(item.topic)}|${norm(item.subtopic)}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ topic: item.topic, subtopic: item.subtopic });
    }
  }
  return result;
}

function backtestYear(
  subject: "Maths" | "Science",
  targetYear: number,
  weights: FiveSignalWeights
): BacktestYearResult {
  const dataset = getCanonicalHistoricalDataset();
  const allItems = dataset.items.filter(i => i.subject === subject);

  const actualItems = allItems.filter(
    i => i.sourceYear === targetYear && i.sourceType === "official_board"
  );

  if (actualItems.length === 0) {
    return {
      targetYear,
      totalArchetypes: 0,
      predictedCorrectly: 0,
      missedArchetypes: 0,
      accuracy: 0,
      avgConfidenceCorrect: 0,
      avgConfidenceMissed: 0,
      topMissed: [],
      topCorrect: [],
    };
  }

  const actualSubtopics = getUniqueSubtopics(actualItems);

  const priorItems = allItems.filter(i => i.sourceYear < targetYear);
  const allKnownSubtopics = getUniqueSubtopics(priorItems);

  const predictions = allKnownSubtopics.map(st => {
    const representativeItem = priorItems.find(
      i => fuzzyMatch(i.topic, st.topic) &&
        fuzzyMatch(i.subtopic, st.subtopic)
    );

    const score = compute5SignalScore(
      {
        subject,
        topic: st.topic,
        subtopic: st.subtopic,
        marks: representativeItem?.marks ?? 3,
        format: representativeItem?.format ?? "Short",
        bloom: representativeItem?.bloom ?? "Applying",
        difficulty: "Medium",
      },
      targetYear,
      { weights, cutoffYear: targetYear }
    );

    return { ...st, confidence: score.confidencePercent };
  });

  predictions.sort((a, b) => b.confidence - a.confidence);

  const topPredictions = predictions.slice(0, Math.max(actualSubtopics.length * 2, 20));

  let predictedCorrectly = 0;
  const missed: { topic: string; subtopic: string; confidence: number }[] = [];
  const correct: { topic: string; subtopic: string; confidence: number }[] = [];

  for (const actual of actualSubtopics) {
    const found = topPredictions.find(
      p => fuzzyMatch(p.topic, actual.topic) && fuzzyMatch(p.subtopic, actual.subtopic)
    );
    if (found) {
      predictedCorrectly++;
      correct.push({ topic: actual.topic, subtopic: actual.subtopic, confidence: found.confidence });
    } else {
      const fullPrediction = predictions.find(
        p => fuzzyMatch(p.topic, actual.topic) && fuzzyMatch(p.subtopic, actual.subtopic)
      );
      missed.push({
        topic: actual.topic,
        subtopic: actual.subtopic,
        confidence: fullPrediction?.confidence ?? 0,
      });
    }
  }

  const accuracy = actualSubtopics.length > 0
    ? predictedCorrectly / actualSubtopics.length
    : 0;

  const avgConfidenceCorrect = correct.length > 0
    ? correct.reduce((s, c) => s + c.confidence, 0) / correct.length
    : 0;

  const avgConfidenceMissed = missed.length > 0
    ? missed.reduce((s, c) => s + c.confidence, 0) / missed.length
    : 0;

  return {
    targetYear,
    totalArchetypes: actualSubtopics.length,
    predictedCorrectly,
    missedArchetypes: missed.length,
    accuracy,
    avgConfidenceCorrect,
    avgConfidenceMissed,
    topMissed: missed.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
    topCorrect: correct.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
  };
}

export function runBacktest(
  subject: "Maths" | "Science",
  testYears: number[] = [2023, 2024, 2025],
  weights: FiveSignalWeights = DEFAULT_SIGNAL_WEIGHTS
): BacktestSummary {
  const dataset = getCanonicalHistoricalDataset();
  const availableYears = dataset.years.filter(y =>
    dataset.items.some(i => i.subject === subject && i.sourceYear === y && i.sourceType === "official_board")
  );

  const validTestYears = testYears.filter(y => availableYears.includes(y));

  const yearResults = validTestYears.map(y => backtestYear(subject, y, weights));

  const totalActual = yearResults.reduce((s, r) => s + r.totalArchetypes, 0);
  const totalCorrect = yearResults.reduce((s, r) => s + r.predictedCorrectly, 0);
  const overallAccuracy = totalActual > 0 ? totalCorrect / totalActual : 0;

  const allCorrectConf = yearResults.flatMap(r => r.topCorrect.map(c => c.confidence));
  const allMissedConf = yearResults.map(r => r.avgConfidenceMissed).filter(c => c > 0);

  const averageConfidenceWhenCorrect = allCorrectConf.length > 0
    ? allCorrectConf.reduce((s, c) => s + c, 0) / allCorrectConf.length
    : 0;

  const averageConfidenceWhenMissed = allMissedConf.length > 0
    ? allMissedConf.reduce((s, c) => s + c, 0) / allMissedConf.length
    : 0;

  const calibrationScore = Math.max(0, 1 - Math.abs(overallAccuracy - averageConfidenceWhenCorrect / 100));

  return {
    subject,
    yearResults,
    overallAccuracy,
    averageConfidenceWhenCorrect,
    averageConfidenceWhenMissed,
    calibrationScore,
  };
}

export interface CalibrationResult {
  bestWeights: FiveSignalWeights;
  bestAccuracy: number;
  iterations: number;
  history: { weights: FiveSignalWeights; accuracy: number }[];
}

export function calibrateWeights(
  subject: "Maths" | "Science",
  testYears: number[] = [2023, 2024],
  targetAccuracy: number = 0.60,
  maxIterations: number = 50
): CalibrationResult {
  const signalNames: (keyof FiveSignalWeights)[] = [
    "historicalFrequency", "rotation", "sqpAlignment", "nepPolicy", "difficultyDistribution"
  ];

  let bestWeights = { ...DEFAULT_SIGNAL_WEIGHTS };
  let bestAccuracy = 0;
  const history: { weights: FiveSignalWeights; accuracy: number }[] = [];

  const baseResult = runBacktest(subject, testYears, bestWeights);
  bestAccuracy = baseResult.overallAccuracy;
  history.push({ weights: { ...bestWeights }, accuracy: bestAccuracy });

  if (bestAccuracy >= targetAccuracy) {
    return { bestWeights, bestAccuracy, iterations: 1, history };
  }

  const perturbations = [0.05, -0.05, 0.10, -0.10];

  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;

    for (const signal of signalNames) {
      for (const delta of perturbations) {
        const candidate = { ...bestWeights };
        candidate[signal] = Math.max(0.01, Math.min(0.60, candidate[signal] + delta));

        const total = Object.values(candidate).reduce((s, v) => s + v, 0);
        for (const key of signalNames) {
          candidate[key] = candidate[key] / total;
        }

        const result = runBacktest(subject, testYears, candidate);
        history.push({ weights: { ...candidate }, accuracy: result.overallAccuracy });

        if (result.overallAccuracy > bestAccuracy) {
          bestAccuracy = result.overallAccuracy;
          bestWeights = { ...candidate };
          improved = true;

          if (bestAccuracy >= targetAccuracy) {
            return { bestWeights, bestAccuracy, iterations: history.length, history };
          }
        }
      }
    }

    if (!improved) break;
  }

  return { bestWeights, bestAccuracy, iterations: history.length, history };
}
