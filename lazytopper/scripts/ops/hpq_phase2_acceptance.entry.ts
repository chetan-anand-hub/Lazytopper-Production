import { promises as fs } from "node:fs";
import path from "node:path";
import {
  getCanonicalHistoricalDataset,
  getHistoricalCoverageSummary,
  type HistoricalQuestionItem,
} from "../../src/prediction/historicalDataset";
import { scoreArchetypeWithBayesianSmoothing } from "../../src/prediction/probabilisticScoring";
import { buildConstrainedPaper, type PaperSection } from "../../src/prediction/constrainedPaperConstructor";
import { runLeaveOneYearOutBacktest } from "../../src/prediction/backtesting";
import { runPredictionDriftMonitor } from "../../src/prediction/driftMonitor";
import { deriveHPQConfidence } from "../../src/prediction/hpqConfidence";
import type { HPQQuestion } from "../../src/data/highlyProbableQuestions";
import { predictivePapers } from "../../src/data/predictivePapers";
import { predictedQuestionsScience } from "../../src/data/predictedQuestionsScience";
import { buildScienceMockPaperFromBank } from "../../src/utils/mockPaperEngineScience";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "hpq_phase2_acceptance.json");

type CheckResult = {
  name: string;
  ok: boolean;
  details: string;
};

function addCheck(checks: CheckResult[], name: string, ok: boolean, details: string): void {
  checks.push({ name, ok, details });
}

function sectionOf(item: HistoricalQuestionItem): PaperSection {
  if (item.marks === 1) return "A";
  if (item.marks === 2) return "B";
  if (item.marks === 3) return "C";
  if (item.marks === 5) return "D";
  return "E";
}

function sectionMarks(
  rows: { section: PaperSection; marks: number }[]
): Record<PaperSection, number> {
  const out: Record<PaperSection, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const row of rows) {
    out[row.section] += row.marks;
  }
  return out;
}

function normalizeMetric(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= 1;
}

export async function runAcceptance(): Promise<{
  summary: { total: number; passed: number; failed: number };
  checks: CheckResult[];
}> {
  const checks: CheckResult[] = [];

  console.log("hpq_phase2: loading canonical historical dataset...");
  const dataset = getCanonicalHistoricalDataset();
  const coverage = getHistoricalCoverageSummary();
  const years = dataset.years.join(",");
  addCheck(
    checks,
    "historical_years_2018_2025",
    years === "2018,2019,2020,2021,2022,2023,2024,2025",
    `years=${years}`
  );
  addCheck(
    checks,
    "historical_item_labels_present",
    dataset.items.every(
      (item) =>
        item.id.length > 0 &&
        item.topic.length > 0 &&
        item.subtopic.length > 0 &&
        item.sourceLabel.length > 0 &&
        item.archetypeKey.length > 0
    ),
    `items=${dataset.items.length}`
  );
  addCheck(
    checks,
    "historical_subject_coverage",
    dataset.items.some((item) => item.subject === "Maths") &&
      dataset.items.some((item) => item.subject === "Science"),
    JSON.stringify({
      maths: dataset.items.filter((item) => item.subject === "Maths").length,
      science: dataset.items.filter((item) => item.subject === "Science").length,
    })
  );
  addCheck(
    checks,
    "historical_year_coverage_nonzero",
    Object.values(coverage).every((count) => count > 0),
    JSON.stringify(coverage)
  );

  const sample = dataset.items[0];
  const probabilistic = scoreArchetypeWithBayesianSmoothing({
    input: {
      subject: sample.subject,
      topic: sample.topic,
      subtopic: sample.subtopic,
      marks: sample.marks,
      format: sample.format,
      bloom: sample.bloom,
      policyTag: sample.competencyType,
      sourceYearHint: sample.sourceYear,
    },
    context: {
      targetYear: 2026,
      policyRegime: "nep_competency_2023_plus",
      topicTrendWeight: 1.1,
    },
    historicalItems: dataset.items,
  });
  addCheck(
    checks,
    "probabilistic_score_in_range",
    normalizeMetric(probabilistic.posterior) &&
      normalizeMetric(probabilistic.confidence),
    JSON.stringify(probabilistic)
  );
  addCheck(
    checks,
    "probabilistic_rationale_present",
    probabilistic.rationale.length > 10 && probabilistic.rationale.includes("policy-fit"),
    probabilistic.rationale
  );

  const mathsCandidates = dataset.items
    .filter((item) => item.subject === "Maths")
    .map((item, index) => ({
      id: item.id,
      subject: item.subject,
      topicKey: item.topic,
      subtopic: item.subtopic,
      section: sectionOf(item),
      marks: item.marks,
      format: item.format,
      competencyType: item.competencyType,
      score: 2 + (index % 5) * 0.25,
    }));
  const constrained = buildConstrainedPaper({
    candidates: mathsCandidates,
    blueprint: {
      sectionMarks: { A: 20, B: 10, C: 18, D: 20, E: 12 },
      competencyFocusedMinShare: 0.5,
      caseBasedMinCount: 3,
    },
  });
  const constrainedMarks = sectionMarks(constrained.selected);
  addCheck(
    checks,
    "constrained_total_marks_80",
    constrained.totalMarks === 80,
    JSON.stringify({ totalMarks: constrained.totalMarks, diagnostics: constrained.diagnostics })
  );
  addCheck(
    checks,
    "constrained_section_marks_exact",
    constrainedMarks.A === 20 &&
      constrainedMarks.B === 10 &&
      constrainedMarks.C === 18 &&
      constrainedMarks.D === 20 &&
      constrainedMarks.E === 12,
    JSON.stringify(constrainedMarks)
  );

  console.log("hpq_phase2: running leave-one-year-out backtest...");
  const backtest = runLeaveOneYearOutBacktest(dataset);
  addCheck(
    checks,
    "backtest_has_results",
    backtest.results.length >= 4,
    `results=${backtest.results.length}`
  );
  addCheck(
    checks,
    "backtest_metrics_in_range",
    backtest.results.every(
      (result) =>
        normalizeMetric(result.sectionFidelity) &&
        result.topicMarkShareError >= 0 &&
        result.topicMarkShareError <= 1 &&
        normalizeMetric(result.topKRecall) &&
        normalizeMetric(result.paperSimilarityScore)
    ),
    JSON.stringify(backtest.aggregate)
  );

  console.log("hpq_phase2: running drift monitor probes...");
  const driftSources = [
    {
      id: "mock-sqp",
      label: "Mock SQP",
      subject: "General" as const,
      kind: "official_sqp" as const,
      url: "https://example.test/sqp",
    },
    {
      id: "mock-circular",
      label: "Mock Circular",
      subject: "General" as const,
      kind: "official_circular" as const,
      url: "https://example.test/circular",
    },
  ];

  const baselineProbe = await runPredictionDriftMonitor({
    sources: driftSources,
    baseline: [],
    minTopicCoverage: 0.05,
    fetchText: async (url) =>
      url.includes("sqp")
        ? "CBSE sample paper class 10 triangles trigonometry electricity light."
        : "CBSE circular competency based and case based questions for class 10.",
  });
  const derivedBaseline = baselineProbe.results.map((result) => ({
    sourceId: result.sourceId,
    signature: result.signature,
    checkedAtIso: result.checkedAtIso,
  }));
  const driftProbe = await runPredictionDriftMonitor({
    sources: driftSources,
    baseline: derivedBaseline,
    minTopicCoverage: 0.7,
    fetchText: async () => "legacy notice with no syllabus terms",
  });
  addCheck(
    checks,
    "drift_monitor_flags_changes_or_stale",
    driftProbe.summary.changed + driftProbe.summary.staleTopics >= 1,
    JSON.stringify(driftProbe.summary)
  );

  console.log("hpq_phase2: deriving HPQ confidence sample...");
  const sampleQuestion: HPQQuestion = {
    id: "confidence-sanity-1",
    subject: "Maths",
    topic: "Triangles",
    subtopic: "Similarity",
    concept: "AA similarity",
    type: "Short",
    marks: 3,
    likelihood: "Very High",
    tier: "must-crack",
    question: "Prove that the two triangles are similar using AA criterion.",
    bloomSkill: "Applying",
    pastBoardYear: "2024",
    policyTag: "Triangles-AA-proof",
  };
  const derivedConfidence = deriveHPQConfidence({
    subject: "Maths",
    topic: "Triangles",
    question: sampleQuestion,
  });
  addCheck(
    checks,
    "hpq_confidence_exposed",
    Boolean(
      derivedConfidence.confidenceBand &&
        derivedConfidence.confidenceRationale &&
        derivedConfidence.confidenceScore != null
    ),
    JSON.stringify({
      topic: "Triangles",
      confidenceBand: derivedConfidence.confidenceBand,
      confidenceScore: derivedConfidence.confidenceScore,
    })
  );

  console.log("hpq_phase2: building science constrained mock paper...");
  const scienceMeta = predictivePapers.find((paper) => paper.id === "SciP1");
  const sciencePaper = buildScienceMockPaperFromBank(
    {
      id: scienceMeta?.id || "SciP1",
      title: scienceMeta?.title || "Science Predictive",
      slug: scienceMeta?.slug || "science-predictive",
      subject: "Science",
      targetMarksBySection: scienceMeta?.sectionMarks ?? {
        A: 20,
        B: 10,
        C: 18,
        D: 20,
        E: 12,
      },
    },
    predictedQuestionsScience,
    { shuffle: false, allowOverflowMarks: false }
  );
  addCheck(
    checks,
    "science_mock_sections_exist",
    sciencePaper.sections.length === 5 &&
      sciencePaper.sections.every((section) => section.questions.length > 0),
    JSON.stringify(
      sciencePaper.sections.map((section) => ({
        key: section.key,
        target: section.targetMarks,
        actual: section.actualMarks,
      }))
    )
  );

  const failed = checks.filter((check) => !check.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  return report.summary.failed
    ? { summary: report.summary, checks }
    : { summary: report.summary, checks };
}
