import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "ux_priority_pack_acceptance.json");

function normalizePath(input) {
  return String(input || "").replace(/\\/g, "/");
}

function addCheck(checks, priority, name, ok, details = "") {
  checks.push({
    priority,
    name,
    ok: Boolean(ok),
    details: String(details || ""),
  });
}

async function readText(relPath) {
  const abs = path.join(repoRoot, relPath);
  return fs.readFile(abs, "utf8");
}

function countMatches(text, pattern) {
  const m = text.match(new RegExp(pattern, "g"));
  return m ? m.length : 0;
}

function hasOnlyAscii(text) {
  for (const ch of text) {
    if (ch.codePointAt(0) > 127) return false;
  }
  return true;
}

async function run() {
  const checks = [];

  const trendsText = await readText("src/pages/TrendsPage.tsx");
  const practiceText = await readText("src/pages/PracticePage.tsx");
  const hpqText = await readText("src/pages/HighlyProbableQuestions.tsx");
  const dashboardText = await readText("src/pages/Dashboard.tsx");

  // Priority 1: CTA minimization + coherent learning loop signals.
  addCheck(
    checks,
    "priority_1",
    "trends_topic_cta_pair_present",
    trendsText.includes("Teach this topic") &&
      trendsText.includes("Practice this topic"),
    "Trends topic cards should keep only teach/practice as direct CTA pair."
  );
  addCheck(
    checks,
    "priority_1",
    "trends_more_menu_present",
    trendsText.includes("<details") &&
      trendsText.includes("<summary") &&
      trendsText.includes("More"),
    "Secondary topic actions should be collapsed under a More menu."
  );
  addCheck(
    checks,
    "priority_1",
    "trends_dual_journey_block_present",
    trendsText.includes("Pick your mode:") &&
      trendsText.includes("Open HPQ bank") &&
      trendsText.includes("Build full mock") &&
      trendsText.includes("Mastery companion"),
    "Trends should expose exam-near and year-long mastery paths."
  );
  addCheck(
    checks,
    "priority_1",
    "practice_help_collapsed_menu_present",
    practiceText.includes("Mentor help") &&
      practiceText.includes("Solve With Me") &&
      practiceText.includes("Board Steps"),
    "Practice helper actions should be grouped under Get help."
  );
  addCheck(
    checks,
    "priority_1",
    "hpq_simple_mode_default_present",
    hpqText.includes("Simple mode") &&
      hpqText.includes("Show advanced filters") &&
      hpqText.includes("Hide advanced filters"),
    "HPQ should default to simple mode with advanced filters collapsed."
  );
  addCheck(
    checks,
    "priority_1",
    "hpq_stream_filter_is_advanced_only",
    hpqText.includes('subjectKey === "Science" && showAdvancedFilters && ('),
    "Science stream filter should only show in advanced mode."
  );

  // Priority 2: Today-first dashboard with tighter above-fold CTA load.
  const dashboardAboveFoldCount = countMatches(
    dashboardText,
    'data-ux-above-fold-cta="dashboard"'
  );
  addCheck(
    checks,
    "priority_2",
    "dashboard_today_first_block_present",
    dashboardText.includes("Today - Start Here") &&
      (dashboardText.includes("Learn to Practice to Mastery loop") ||
        dashboardText.includes("Learn -> Practice -> Mastery loop")),
    "Dashboard should guide students with a today-first continuation block."
  );
  addCheck(
    checks,
    "priority_2",
    "dashboard_above_fold_cta_count_capped",
    dashboardAboveFoldCount === 2,
    `count=${dashboardAboveFoldCount}; expected exactly 2`
  );
  addCheck(
    checks,
    "priority_2",
    "dashboard_mix_link_kept_as_secondary",
    dashboardText.includes("Play Today&apos;s Mix") &&
      dashboardText.includes("Weekly Wrapped"),
    "Daily Mix and Weekly Wrapped should remain available as secondary actions."
  );

  // Priority 3: Mojibake hardening + deterministic quality gates.
  addCheck(
    checks,
    "priority_3",
    "core_ux_pages_ascii_only",
    hasOnlyAscii(trendsText) &&
      hasOnlyAscii(practiceText) &&
      hasOnlyAscii(hpqText) &&
      hasOnlyAscii(dashboardText),
    "Trends/Practice/HPQ/Dashboard should avoid non-ASCII glyphs to prevent mojibake rendering."
  );
  const mojibakeGate = spawnSync("node", ["scripts/check-mojibake.cjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  addCheck(
    checks,
    "priority_3",
    "repo_mojibake_gate_passes",
    mojibakeGate.status === 0,
    `${String(mojibakeGate.stdout || "").trim()} ${String(mojibakeGate.stderr || "").trim()}`.trim()
  );

  const failed = checks.filter((item) => !item.ok);
  const grouped = checks.reduce((acc, item) => {
    if (!acc[item.priority]) {
      acc[item.priority] = { total: 0, passed: 0, failed: 0 };
    }
    acc[item.priority].total += 1;
    if (item.ok) acc[item.priority].passed += 1;
    else acc[item.priority].failed += 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
      byPriority: grouped,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length > 0) {
    console.error(
      `UX priority pack acceptance FAILED (${failed.length}/${checks.length}).`
    );
    for (const item of failed) {
      console.error(`- [${item.priority}] ${item.name}: ${item.details}`);
    }
    console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `UX priority pack acceptance PASSED (${checks.length}/${checks.length}).`
  );
  console.log(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
}

run().catch(async (err) => {
  const fallback = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(fallback, null, 2), "utf8");
  console.error("UX priority pack acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
  process.exitCode = 1;
});
