import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "canonical_generator_acceptance.json");

function text(rel) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function check(name, ok, details = "") {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function run() {
  const checks = [];
  const practice = text("src/pages/PracticePage.tsx");
  const generator = text("src/data/questionGenerator.ts");
  const scienceGenerator = text("src/data/scienceQuestionGenerator.ts");

  checks.push(
    check(
      "practice_imports_unified_generator",
      /from "\.\.\/data\/questionGenerator"/.test(practice) && /generateUnifiedPracticeQuestions/.test(practice),
      "Practice page should import the canonical unified generator"
    )
  );

  checks.push(
    check(
      "practice_uses_unified_generator_fallback",
      /generateUnifiedPracticeQuestions\(/.test(practice) && /canonicalFallback/.test(practice),
      "Practice page should invoke canonicalFallback when engine coverage is thin"
    )
  );

  checks.push(
    check(
      "question_generator_science_chain_live",
      /generateScienceQuestionsForPractice/.test(generator) && /from "\.\/scienceQuestionGenerator"/.test(generator),
      "Unified generator should keep science generator chain connected"
    )
  );

  checks.push(
    check(
      "science_generator_has_light_topic_path",
      /topicKey === "Light"/.test(scienceGenerator) && /generateLightNumericals/.test(scienceGenerator),
      "Science generator should include deterministic Light numerical templates"
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

  console.log(`canonical generator acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) process.exit(1);
}

run();