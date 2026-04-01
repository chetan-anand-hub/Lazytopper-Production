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
  const trends = text("src/pages/TrendsPage.tsx");
  const weights = text("src/data/class10MathTopicWeights.ts");

  checks.push(
    check(
      "trends_imports_weightage_registry",
      /from "\.\.\/data\/class10MathTopicWeights"/.test(trends),
      "Trends should import class10 weight registry for deterministic fallback"
    )
  );

  checks.push(
    check(
      "trends_uses_weightage_fallback",
      /class10TopicByName/.test(trends) && /\?\? class10TopicByName\[topicName\]/.test(trends),
      "Trends should use class10TopicByName fallback when weight is absent"
    )
  );

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