import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "agent3_uiux_guard.json");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const phase = [...args].find((a) => a.startsWith("--phase="))?.split("=")[1] || "generic";

function read(rel) {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

function has(rel, pattern) {
  const text = read(rel);
  return pattern.test(text);
}

function countMatches(rel, pattern) {
  const text = read(rel);
  return [...text.matchAll(pattern)].length;
}

function check(name, ok, details = "") {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function run() {
  const checks = [];
  checks.push(check("guard_mode", true, dryRun ? `dry-run (${phase})` : `execute (${phase})`));

  // UX contract checks for major journeys.
  checks.push(
    check(
      "journey_strip_present_on_key_pages",
      has("src/pages/TrendsPage.tsx", /<JourneyStrip/) &&
        has("src/pages/TopicHub.tsx", /<JourneyStrip/) &&
        has("src/pages/PracticePage.tsx", /<JourneyStrip/) &&
        has("src/pages/HighlyProbableQuestions.tsx", /<JourneyStrip/),
      "Journey strip should persist across Trends -> TopicHub -> Practice -> HPQ"
    )
  );

  checks.push(
    check(
      "return_context_present_on_key_pages",
      has("src/pages/TrendsPage.tsx", /<ReturnContextBar/) &&
        has("src/pages/TopicHub.tsx", /<ReturnContextBar/) &&
        has("src/pages/PracticePage.tsx", /<ReturnContextBar/) &&
        has("src/pages/HighlyProbableQuestions.tsx", /<ReturnContextBar/),
      "Back context chip should exist on major pages"
    )
  );

  checks.push(
    check(
      "login_google_and_phone_paths",
      has("src/pages/Login.tsx", /Continue with Email \(Google\)/) &&
        has("src/pages/Login.tsx", /Phone number \(OTP\)/) &&
        has("src/pages/Login.tsx", /Send OTP/) &&
        has("src/pages/Login.tsx", /Verify OTP/),
      "Both low-friction auth paths should remain visible"
    )
  );

  // CTA pressure guardrails from the UX contract.
  const trendsTopicActionCount = countMatches(
    "src/pages/TrendsPage.tsx",
    /Teach this topic|Practice this topic|Predict this chapter|Build mock|More actions/g
  );
  checks.push(
    check(
      "trends_cta_pressure_within_contract",
      trendsTopicActionCount <= 12,
      `topic-action references=${trendsTopicActionCount}, expected <= 12`
    )
  );

  const practicePrimaryCtas = countMatches(
    "src/pages/PracticePage.tsx",
    /Show solution|Solve With Me|Board Steps|Regenerate set|\+10 more/g
  );
  checks.push(
    check(
      "practice_primary_ctas_within_contract",
      practicePrimaryCtas <= 20,
      `practice CTA references=${practicePrimaryCtas}, expected <= 20`
    )
  );

  checks.push(
    check(
      "homepage_marketing_positioning",
      has("src/pages/Home.tsx", /human-grade|human tutor|predictive/i) &&
        has("src/pages/Home.tsx", /Class 10|CBSE/i),
      "Home should preserve human-tutor-first and exam value messaging"
    )
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    phase,
    dryRun,
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`agent3 report: ${path.relative(repoRoot, outFile)}`);
  console.log(`agent3 summary: ${report.summary.passed}/${report.summary.total}`);

  if (failed.length) process.exit(1);
}

run();
