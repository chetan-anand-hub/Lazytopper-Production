import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "ux_focus_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function countMatches(text, pattern) {
  const matches = text.match(new RegExp(pattern, "g"));
  return matches ? matches.length : 0;
}

async function run() {
  const checks = [];
  const homeText = await readText("src/pages/Home.tsx");
  const dashboardText = await readText("src/pages/Dashboard.tsx");
  const topicHubHomeText = await readText("src/pages/TopicHubHome.tsx");

  addCheck(
    checks,
    "priority_block_home_present",
    homeText.includes('data-ux-priority-block="home-primary-actions"') ||
      homeText.includes('data-ux-priority-block="home-next-best-actions"'),
    "Home should expose an explicit above-the-fold next-best-action block."
  );
  addCheck(
    checks,
    "priority_block_dashboard_present",
    dashboardText.includes('data-ux-priority-block="dashboard-next-best-actions"'),
    "Dashboard should expose an explicit above-the-fold next-best-action block."
  );
  addCheck(
    checks,
    "priority_block_topichub_present",
    topicHubHomeText.includes('data-ux-priority-block="topichub-entry-flow"'),
    "TopicHub entry should expose an explicit above-the-fold 3-step flow block."
  );

  const homeCtaCount = countMatches(homeText, 'data-ux-above-fold-cta="home"');
  const dashboardCtaCount = countMatches(dashboardText, 'data-ux-above-fold-cta="dashboard"');
  const topicHubCtaCount = countMatches(topicHubHomeText, 'data-ux-above-fold-cta="topichub"');

  addCheck(
    checks,
    "home_above_fold_cta_count",
    homeCtaCount >= 2 && homeCtaCount <= 3,
    `count=${homeCtaCount}; expected 2-3`
  );
  addCheck(
    checks,
    "dashboard_above_fold_cta_count",
    dashboardCtaCount >= 2 && dashboardCtaCount <= 3,
    `count=${dashboardCtaCount}; expected 2-3`
  );
  addCheck(
    checks,
    "topichub_above_fold_cta_count",
    topicHubCtaCount >= 2 && topicHubCtaCount <= 3,
    `count=${topicHubCtaCount}; expected 2-3`
  );

  addCheck(
    checks,
    "home_navigation_depth_entry_points",
    homeText.includes('navigate("/topic-hub")') &&
      (homeText.includes('navigate("/dashboard")') || homeText.includes('navigate(user ? "/dashboard" : "/login")')) &&
      (homeText.includes('navigate("/trends/10/Maths")') || homeText.includes('navigate("/predictive-papers")')),
    "Home should expose direct one-click entry points for key study surfaces."
  );
  addCheck(
    checks,
    "dashboard_navigation_depth_entry_points",
    dashboardText.includes("Continue in TopicHub") &&
      dashboardText.includes("/topic-hub/${gradeNum}/${subjectForQuickActions}") &&
      dashboardText.includes("Practice Weakest Topic") &&
      dashboardText.includes("/practice/${gradeNum}/${subjectForQuickActions}?topic="),
    "Dashboard should allow one-click continuation to learn/practice loops."
  );
  addCheck(
    checks,
    "topichub_navigation_depth_entry_points",
    topicHubHomeText.includes("Start Learning") &&
      (topicHubHomeText.includes("Open Trends") ||
        topicHubHomeText.includes("See trends (optional)")) &&
      topicHubHomeText.includes("const target = `/topic-hub/"),
    "TopicHub entry should keep topic-start depth at one click after selection."
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
    console.error(`UX focus acceptance FAILED (${failed.length}/${checks.length}).`);
    for (const f of failed) {
      console.error(`- ${f.name}: ${f.details}`);
    }
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`UX focus acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("UX focus acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
