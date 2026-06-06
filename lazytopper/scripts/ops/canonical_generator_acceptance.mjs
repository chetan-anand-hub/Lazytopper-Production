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
  // The unified generator + canonicalFallback were extracted from PracticePage.tsx into the
  // practiceQuestionBuilder helper by the "Split giant files" refactor (commit be5e2de). The page
  // now consumes that helper, so these checks follow the chain page -> builder -> questionGenerator
  // at its live location instead of grepping the (pre-split) PracticePage body.
  const practice = text("src/pages/PracticePage.tsx");
  const builder = text("src/components/practice/practiceQuestionBuilder.ts");
  const generator = text("src/data/questionGenerator.ts");
  const scienceGenerator = text("src/data/scienceQuestionGenerator.ts");

  checks.push(
    check(
      "practice_imports_unified_generator",
      /from "\.\.\/components\/practice\/practiceQuestionBuilder"/.test(practice) &&
        /from "\.\.\/\.\.\/data\/questionGenerator"/.test(builder) &&
        /generateUnifiedPracticeQuestions/.test(builder),
      "Practice page should consume practiceQuestionBuilder, which imports the canonical unified generator"
    )
  );

  checks.push(
    check(
      "practice_uses_unified_generator_fallback",
      /generateUnifiedPracticeQuestions\(/.test(builder) && /canonicalFallback/.test(builder),
      "practiceQuestionBuilder should invoke canonicalFallback (generateUnifiedPracticeQuestions) when engine coverage is thin"
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