/**
 * Acceptance test: deleted CBSE Science topics (2026-27) must never score above zero.
 *
 * Covers:
 *   - Every entry in SCIENCE_DELETED_CHAPTERS_2026_27.deletedTopics
 *   - At least one representative keyword from each group in deletedSubtopicKeywords
 *   - Both compute5SignalScore() and scoreTopicRecurrenceConfidence()
 *   - A neighbouring, non-deleted subtopic to confirm the guard is not over-broad
 *
 * Run with:  tsx scripts/ops/science_deleted_zeroing_acceptance.ts
 */

import { fileURLToPath } from "url";
import path from "path";
import { writeFileSync, mkdirSync } from "fs";

import { SCIENCE_DELETED_CHAPTERS_2026_27 } from "../../src/prediction/cbseHistoricalArchetypes.js";
import { compute5SignalScore, type FiveSignalInput } from "../../src/prediction/cbse5SignalScoring.js";
import {
  scoreTopicRecurrenceConfidence,
  type ProbabilisticScoreInput,
  type ProbabilisticContext,
} from "../../src/prediction/probabilisticScoring.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../../.project_memory/ops/out");
const outFile = path.join(outDir, "science_deleted_zeroing_acceptance.json");

type CheckResult = { name: string; passed: boolean; details: string };
const checks: CheckResult[] = [];

function addCheck(name: string, passed: boolean, details = "") {
  checks.push({ name, passed: Boolean(passed), details: String(details) });
}

const TARGET_YEAR = 2026;
const EFFECTIVE_FROM = SCIENCE_DELETED_CHAPTERS_2026_27.effectiveFromYear;

addCheck(
  "effectiveFromYear_is_2026",
  EFFECTIVE_FROM === 2026,
  `effectiveFromYear=${EFFECTIVE_FROM}`
);

function makeBase5Input(topic: string, subtopic = ""): FiveSignalInput {
  return {
    subject: "Science",
    topic,
    subtopic,
    marks: 3,
    format: "Short",
    bloom: "Understanding",
    difficulty: "medium",
  };
}

function makeProbInput(topic: string, subtopic = ""): ProbabilisticScoreInput {
  return {
    subject: "Science",
    topic,
    subtopic,
    marks: 3,
    format: "Short",
    bloom: "Understanding",
  };
}

const probContext: ProbabilisticContext = {
  targetYear: TARGET_YEAR,
  policyRegime: "nep_competency_2023_plus",
};

function assert5SignalZeroed(label: string, topic: string, subtopic = "") {
  const result = compute5SignalScore(makeBase5Input(topic, subtopic), TARGET_YEAR);

  addCheck(
    `5signal:${label}:compositeScore_is_0`,
    result.compositeScore === 0,
    `compositeScore=${result.compositeScore}`
  );
  addCheck(
    `5signal:${label}:historicalFrequency_is_0`,
    result.signals.historicalFrequency === 0,
    `historicalFrequency=${result.signals.historicalFrequency}`
  );
  addCheck(
    `5signal:${label}:rotation_is_0`,
    result.signals.rotation === 0,
    `rotation=${result.signals.rotation}`
  );
  addCheck(
    `5signal:${label}:sqpAlignment_is_0`,
    result.signals.sqpAlignment === 0,
    `sqpAlignment=${result.signals.sqpAlignment}`
  );
  addCheck(
    `5signal:${label}:nepPolicy_is_0`,
    result.signals.nepPolicy === 0,
    `nepPolicy=${result.signals.nepPolicy}`
  );
  addCheck(
    `5signal:${label}:difficultyDistribution_is_0`,
    result.signals.difficultyDistribution === 0,
    `difficultyDistribution=${result.signals.difficultyDistribution}`
  );
  addCheck(
    `5signal:${label}:rationale_mentions_excluded`,
    result.confidenceRationale.toLowerCase().includes("excluded"),
    `rationale="${result.confidenceRationale}"`
  );
}

function assertProbZeroed(label: string, topic: string, subtopic = "") {
  const result = scoreTopicRecurrenceConfidence({
    input: makeProbInput(topic, subtopic),
    context: probContext,
    historicalItems: [],
  });

  addCheck(
    `prob:${label}:posterior_is_0`,
    result.posterior === 0,
    `posterior=${result.posterior}`
  );
  addCheck(
    `prob:${label}:rationale_mentions_excluded`,
    result.rationale.toLowerCase().includes("excluded"),
    `rationale="${result.rationale}"`
  );
}

// ── Deleted full chapters ──────────────────────────────────────────────────────

for (const topic of SCIENCE_DELETED_CHAPTERS_2026_27.deletedTopics) {
  const label = topic.replace(/\s+/g, "_");
  assert5SignalZeroed(label, topic);
  assertProbZeroed(label, topic);
}

// ── Deleted subtopic keywords — one representative per thematic group ─────────
// Group 1: Heredity & Evolution — evolution portion
const evolutionCases: Array<[string, string]> = [
  ["Heredity & Evolution", "evolution"],
  ["Heredity & Evolution", "fossil record"],
  ["Heredity & Evolution", "homologous organ"],
  ["Heredity & Evolution", "analogous organ"],
  ["Heredity & Evolution", "speciation"],
  ["Heredity & Evolution", "natural selection"],
];

// Group 2: Our Environment / Sources of Energy — energy portion
const energyCases: Array<[string, string]> = [
  ["Our Environment", "sources of energy"],
  ["Our Environment", "conventional sources of energy"],
  ["Our Environment", "non conventional energy"],
  ["Our Environment", "nonconventional energy"],
];

// Group 3: How do Organisms Reproduce? — reproductive health is RESTORED in
// 2026-27 board scope (PR fix/syllabus-guard-2026-27-update). These cases must
// NOT be zeroed any more — assertions inverted to assertNotZeroed below.

for (const [topic, subtopic] of [...evolutionCases, ...energyCases]) {
  const label = `${topic.replace(/[^a-zA-Z0-9]/g, "_")}__${subtopic.replace(/[^a-zA-Z0-9]/g, "_")}`;
  assert5SignalZeroed(label, topic, subtopic);
  assertProbZeroed(label, topic, subtopic);
}

// Reproductive health subtopics are RETAINED in 2026-27 — confirm they are NOT zeroed.
const reproductiveRetainedCases: Array<[string, string]> = [
  ["How do Organisms Reproduce?", "reproductive health"],
  ["How do Organisms Reproduce?", "contraception methods"],
  ["How do Organisms Reproduce?", "family planning"],
  ["How do Organisms Reproduce?", "Safe Sex and HIV/AIDS"],
];

for (const [topic, subtopic] of reproductiveRetainedCases) {
  const label = `repro_retained__${subtopic.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const result = compute5SignalScore(makeBase5Input(topic, subtopic), TARGET_YEAR);
  addCheck(
    `5signal:${label}:not_zeroed_in_2026_27`,
    !result.confidenceRationale.toLowerCase().includes("excluded"),
    `compositeScore=${result.compositeScore}, rationale="${result.confidenceRationale}"`
  );
}

// ── Confirm targetYear < 2026 does NOT zero out deleted topics ────────────────
{
  const priorYear = 2025;
  const result = compute5SignalScore(
    makeBase5Input("Periodic Classification of Elements"),
    priorYear
  );
  addCheck(
    "5signal:prior_year_not_zeroed_by_deletion_guard",
    !result.confidenceRationale.toLowerCase().includes("excluded"),
    `compositeScore=${result.compositeScore}, rationale="${result.confidenceRationale}"`
  );

  const probResult = scoreTopicRecurrenceConfidence({
    input: makeProbInput("Periodic Classification of Elements"),
    context: { ...probContext, targetYear: priorYear },
    historicalItems: [],
  });
  addCheck(
    "prob:prior_year_not_zeroed_by_deletion_guard",
    !probResult.rationale.toLowerCase().includes("excluded"),
    `posterior=${probResult.posterior}, rationale="${probResult.rationale}"`
  );
}

// ── Non-deleted neighbouring subtopic: "Mendel's experiments" in Heredity ─────
{
  const topic = "Heredity & Evolution";
  const subtopic = "Mendel's experiments";

  const result = compute5SignalScore(makeBase5Input(topic, subtopic), TARGET_YEAR);
  addCheck(
    "5signal:mendel_not_zeroed",
    !result.confidenceRationale.toLowerCase().includes("excluded"),
    `compositeScore=${result.compositeScore}, rationale="${result.confidenceRationale}"`
  );
  addCheck(
    "5signal:mendel_compositeScore_above_zero",
    result.compositeScore > 0,
    `compositeScore=${result.compositeScore}`
  );

  const probResult = scoreTopicRecurrenceConfidence({
    input: makeProbInput(topic, subtopic),
    context: probContext,
    historicalItems: [],
  });
  addCheck(
    "prob:mendel_not_zeroed",
    !probResult.rationale.toLowerCase().includes("excluded"),
    `posterior=${probResult.posterior}, rationale="${probResult.rationale}"`
  );
}

// ── Non-deleted topic in the same chapter that is otherwise retained ──────────
// Ecology subtopics under "Our Environment" (food chains, pollution) stay in.
{
  const topic = "Our Environment";
  const subtopic = "food chains and food webs";

  const result = compute5SignalScore(makeBase5Input(topic, subtopic), TARGET_YEAR);
  addCheck(
    "5signal:food_chain_not_zeroed",
    !result.confidenceRationale.toLowerCase().includes("excluded"),
    `compositeScore=${result.compositeScore}, rationale="${result.confidenceRationale}"`
  );

  const probResult = scoreTopicRecurrenceConfidence({
    input: makeProbInput(topic, subtopic),
    context: probContext,
    historicalItems: [],
  });
  addCheck(
    "prob:food_chain_not_zeroed",
    !probResult.rationale.toLowerCase().includes("excluded"),
    `posterior=${probResult.posterior}, rationale="${probResult.rationale}"`
  );
}

// ── Print results ─────────────────────────────────────────────────────────────

const passed = checks.filter((c) => c.passed).length;
const failed = checks.length - passed;

const report = {
  generatedAt: new Date().toISOString(),
  summary: { total: checks.length, passed, failed },
  checks,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify(report, null, 2));

console.log(`\nReport: ${outFile}`);
console.log("");
console.table(
  checks.map((c) => ({
    check: c.name,
    status: c.passed ? "PASS" : "FAIL",
    details: c.details.slice(0, 80),
  }))
);

console.log(`\n${passed}/${checks.length} checks passed.`);

if (failed > 0) {
  console.error(`\n${failed} check(s) FAILED.`);
  process.exit(1);
}
