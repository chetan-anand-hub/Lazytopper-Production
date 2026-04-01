import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "student_progress_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

async function run() {
  const checks = [];

  const [
    progressStoreText,
    authText,
    smartStoreText,
    practiceInsightsText,
    topicMasteryText,
    planStorageText,
    dashboardText,
  ] = await Promise.all([
    readText("src/services/studentProgressStore.ts"),
    readText("src/context/AuthContext.tsx"),
    readText("src/engine/smartLearningStore.tsx"),
    readText("src/services/practiceInsights.ts"),
    readText("src/services/topicHubMastery.ts"),
    readText("src/services/planStorage.ts"),
    readText("src/pages/Dashboard.tsx"),
  ]);

  addCheck(
    checks,
    "progress_store_exists_with_snapshot_contract",
    progressStoreText.includes("export interface LearnerProgressSnapshot") &&
      progressStoreText.includes("statsByChapter") &&
      progressStoreText.includes("topicMasteryByTopic") &&
      progressStoreText.includes("attempts"),
    "Learner progress snapshot should include stats, attempts, and topic mastery."
  );

  addCheck(
    checks,
    "progress_store_cloud_hydration_present",
    progressStoreText.includes("hydrateLocalProgressFromCloud") &&
      progressStoreText.includes("saveLearnerProgressSegment"),
    "Progress store should expose cloud hydration and segment persistence."
  );

  addCheck(
    checks,
    "auth_context_sets_active_progress_user",
    authText.includes("setActiveProgressUser") &&
      authText.includes("hydrateLocalProgressFromCloud"),
    "Auth context should set active progress user and hydrate cloud state."
  );

  addCheck(
    checks,
    "smart_learning_uses_scoped_progress_key",
    smartStoreText.includes("buildProgressScopeKey(\"smartLearning\"") &&
      smartStoreText.includes("saveLearnerProgressSegment"),
    "Smart learning store should persist per-user scoped stats and sync segments."
  );

  addCheck(
    checks,
    "practice_insights_uses_scoped_progress_key",
    practiceInsightsText.includes("buildProgressScopeKey(\"practiceInsights\"") &&
      practiceInsightsText.includes("saveLearnerProgressSegment"),
    "Practice insights should persist attempts with user scoping and segment sync."
  );

  addCheck(
    checks,
    "topic_mastery_uses_scoped_progress_key",
    topicMasteryText.includes("buildProgressScopeKey") &&
      topicMasteryText.includes("\"topicHubMastery\"") &&
      topicMasteryText.includes("saveLearnerProgressSegment"),
    "Topic mastery should use per-user keying and sync cloud segment."
  );

  addCheck(
    checks,
    "streak_is_user_scoped",
    planStorageText.includes("streak.date:") &&
      planStorageText.includes("saveLearnerProgressSegment"),
    "Streak should be keyed by active user and synced to learner progress."
  );

  addCheck(
    checks,
    "dashboard_consumes_unified_stats_sources",
    dashboardText.includes("useSmartLearning") &&
      dashboardText.includes("getAttempts()") &&
      dashboardText.includes("Performance Matrix"),
    "Dashboard should use smart-learning and attempts data for progress rendering."
  );

  const failed = checks.filter((c) => !c.ok);
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

  if (failed.length) {
    console.error(`Student progress acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Student progress acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Student progress acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
