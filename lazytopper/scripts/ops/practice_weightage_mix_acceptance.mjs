import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "practice_weightage_mix_acceptance.json");

function text(rel) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function check(name, ok, details = "") {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function run() {
  const checks = [];
  const weights = text("src/data/class10MathTopicWeights.ts");

  // FRICTION-FIX-1 PR-1 (P14): the two "trends_*" checks were removed with
  // src/pages/TrendsPage.tsx (retired, no live importer, deleted). The registry check stays.

  checks.push(
    check(
      "weightage_registry_integrity",
      /export const class10MathTopicWeights/.test(weights) &&
        /export const class10TopicByName/.test(weights) &&
        /weightagePercent/.test(weights),
      "Weight registry should expose array and name lookup"
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

  console.log(`practice weightage mix acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) process.exit(1);
}

run();