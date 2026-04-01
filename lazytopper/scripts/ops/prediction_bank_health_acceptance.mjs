import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "prediction_bank_health_acceptance.json");

function text(rel) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function check(name, ok, details = "") {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function run() {
  const checks = [];
  const hpq = text("src/pages/HighlyProbableQuestions.tsx");
  const bankHealth = text("src/prediction/bankHealth.ts");
  const topicSources = text("src/prediction/buildTopicKeySources.ts");

  checks.push(
    check(
      "hpq_imports_bank_health_runtime",
      /from "\.\.\/prediction\/bankHealth"/.test(hpq) && /from "\.\.\/prediction\/buildTopicKeySources"/.test(hpq),
      "HPQ must import bank-health runtime helpers"
    )
  );

  checks.push(
    check(
      "hpq_computes_bank_health_summary",
      /bankHealthSummaryForSubject/.test(hpq) && /buildBankHealthReport\(/.test(hpq),
      "HPQ should compute and expose a subject-level bank health summary"
    )
  );

  checks.push(
    check(
      "bank_health_core_exports",
      /export function buildBankHealthReport/.test(bankHealth) && /export function summariseBankHealth/.test(bankHealth),
      "Bank health engine must expose core builders"
    )
  );

  checks.push(
    check(
      "topic_source_builder_uses_trends",
      /class10MathTopicTrends/.test(topicSources) && /class10ScienceTopicTrends/.test(topicSources) && /buildTopicKeySources/.test(topicSources),
      "Topic key sources should come from both Maths and Science trend roots"
    )
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`prediction bank health acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) process.exit(1);
}

run();