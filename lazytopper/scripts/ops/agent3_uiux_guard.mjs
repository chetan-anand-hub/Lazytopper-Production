import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "agent3_uiux_guard.json");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const phase = [...args].find((a) => a.startsWith("--phase="))?.split("=")[1] || "generic";

// ★ [GUARD-1] MISSING SUBJECT = FAILED CHECK, NOT A CRASH AND NOT A PASS.
// This used to be a bare readFileSync: when a page it inspects is deleted the whole script threw,
// taking every other check down with it. Returning null instead lets the individual check fail
// loudly and by name, while the rest still run. A guard must degrade to a RED result, never to an
// exception (which reads as infrastructure noise) and never to a skip (which reads as success).
function read(rel) {
  const abs = path.join(repoRoot, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, "utf8");
}

// ★ [GUARD-1] A PATTERN THAT MATCHES ZERO TIMES IS A FAILED CHECK, NOT A PASSED ONE.
// Every subject/pattern pair is recorded so the script can prove it actually inspected something.
const probes = [];
function record(rel, pattern, count, present) {
  probes.push({ file: rel, pattern: String(pattern), count, present });
  return count;
}

function has(rel, pattern) {
  const text = read(rel);
  if (text === null) return record(rel, pattern, 0, false) > 0;
  const count = [...text.matchAll(new RegExp(pattern.source, `${pattern.flags.replace(/g/g, "")}g`))].length;
  return record(rel, pattern, count, true) > 0;
}

function countMatches(rel, pattern) {
  const text = read(rel);
  if (text === null) return record(rel, pattern, 0, false);
  return record(rel, pattern, [...text.matchAll(pattern)].length, true);
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
        has("src/pages/PracticePage.tsx", /<JourneyStrip/) &&
        has("src/pages/HighlyProbableQuestions.tsx", /<JourneyStrip/),
      "Journey strip should persist across Trends -> Practice -> HPQ"
    )
  );

  checks.push(
    check(
      "return_context_present_on_key_pages",
      has("src/pages/TrendsPage.tsx", /<ReturnContextBar/) &&
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

  // ★ [GUARD-1] `homepage_marketing_positioning` REMOVED, not repointed.
  // It asserted /human-grade|human tutor|predictive/ against src/pages/Home.tsx, where that pattern
  // matched ZERO times — the check had never once verified the copy it claimed to protect. Lane D2
  // additionally deletes Home.tsx. Repointing a check that was never really checking anything would
  // have preserved the appearance of coverage without the coverage; the honest move is deletion.
  // If homepage positioning needs a guard, write one against the page that actually renders it and
  // let the zero-match assertion below prove it fires.

  // ★ [GUARD-1] THE META-ASSERTION: a check that inspected nothing must FAIL, not pass quietly.
  // Two failure shapes are caught here: a subject file that no longer exists, and a pattern that
  // matches zero times. Both previously produced a green-looking result (or a crash), which is how
  // a guard silently stops guarding while still being counted as coverage.
  const missing = probes.filter((p) => !p.present);
  checks.push(
    check(
      "all_inspected_subjects_exist",
      missing.length === 0,
      missing.length
        ? `missing subject files: ${[...new Set(missing.map((p) => p.file))].join(", ")}`
        : `subjects inspected: ${[...new Set(probes.map((p) => p.file))].length}`
    )
  );

  const zeroMatch = probes.filter((p) => p.present && p.count === 0);
  checks.push(
    check(
      "no_pattern_matched_zero_times",
      zeroMatch.length === 0,
      zeroMatch.length
        ? `patterns that fired 0 times (a check that cannot fire is not a passing check): ${zeroMatch
            .map((p) => `${p.file} ${p.pattern}`)
            .join(" | ")}`
        : `patterns fired: ${probes.length}, total matches: ${probes.reduce((s, p) => s + p.count, 0)}`
    )
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    phase,
    dryRun,
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    // ★ [GUARD-1] The inspection ledger. A guard must be able to state WHAT it looked at and whether
    // each probe fired; without it, "7/7 passed" is indistinguishable from "7 checks inspected air".
    inspected: probes,
    checks,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`agent3 report: ${path.relative(repoRoot, outFile)}`);
  console.log(`agent3 summary: ${report.summary.passed}/${report.summary.total}`);

  if (failed.length) process.exit(1);
}

run();
