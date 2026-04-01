import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");

const target = String(process.argv[2] || "all").toLowerCase();
const validTargets = new Set(["all", "p1", "p2", "p3"]);

if (!validTargets.has(target)) {
  console.error(`Invalid target "${target}". Use all|p1|p2|p3.`);
  process.exit(1);
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
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function countMatches(text, pattern) {
  const m = text.match(new RegExp(pattern, "g"));
  return m ? m.length : 0;
}

function includePriority(priority) {
  if (target === "all") return true;
  return priority === target;
}

async function run() {
  const checks = [];
  const trendsText = await readText("src/pages/TrendsPage.tsx");
  const hpqText = await readText("src/pages/HighlyProbableQuestions.tsx");
  const topicHubText = await readText("src/pages/TopicHub.tsx");
  const dashboardText = await readText("src/pages/Dashboard.tsx");
  const loginText = await readText("src/pages/Login.tsx");
  const practiceText = await readText("src/pages/PracticePage.tsx");
  const topicHubHomeText = await readText("src/pages/TopicHubHome.tsx");
  const stylesText = await readText("src/styles.css");
  const telemetryText = await readText("src/services/uxTelemetry.ts");

  if (includePriority("p1")) {
    addCheck(
      checks,
      "p1",
      "topichub_tab_scope_is_three",
      topicHubText.includes("Learn") &&
        topicHubText.includes("Grind") &&
        topicHubText.includes("Resources"),
      "TopicHub should keep Learn/Grind/Resources as the top-level tab scope."
    );
    addCheck(
      checks,
      "p1",
      "trends_topic_cta_pair_present",
      trendsText.includes("Teach this topic") &&
        trendsText.includes("Practice this topic"),
      "Trends topic card should expose teach+practice as direct actions."
    );
    addCheck(
      checks,
      "p1",
      "trends_secondary_actions_collapsed",
      trendsText.includes("<details") &&
        trendsText.includes("<summary") &&
        trendsText.includes("More"),
      "Trends secondary actions should stay under More."
    );
    addCheck(
      checks,
      "p1",
      "hpq_simple_mode_default",
      hpqText.includes("Simple mode") &&
        hpqText.includes("Show advanced filters") &&
        hpqText.includes("Hide advanced filters"),
      "HPQ should default to simple mode with optional advanced controls."
    );
    const dashboardAboveFoldCount = countMatches(
      dashboardText,
      'data-ux-above-fold-cta="dashboard"'
    );
    addCheck(
      checks,
      "p1",
      "dashboard_today_first_with_two_primary_cta",
      dashboardText.includes("Today - Start Here") &&
        dashboardAboveFoldCount === 2,
      `Dashboard above-fold CTA count=${dashboardAboveFoldCount}; expected 2.`
    );
  }

  if (includePriority("p2")) {
    addCheck(
      checks,
      "p2",
      "journey_strip_used_in_trends_topichub_practice_hpq",
      trendsText.includes("<JourneyStrip") &&
        topicHubText.includes("<JourneyStrip") &&
        practiceText.includes("<JourneyStrip") &&
        hpqText.includes("<JourneyStrip"),
      "Journey strip should be persistent across Trends/TopicHub/Practice/HPQ."
    );
    addCheck(
      checks,
      "p2",
      "return_context_bar_used_in_trends_topichub_practice_hpq",
      trendsText.includes("<ReturnContextBar") &&
        topicHubText.includes("<ReturnContextBar") &&
        practiceText.includes("<ReturnContextBar") &&
        hpqText.includes("<ReturnContextBar"),
      "Return context chips should be present on major journey pages."
    );
    addCheck(
      checks,
      "p2",
      "login_google_first_progressive_phone",
      loginText.includes("Continue with Email (Google) - Recommended") &&
        loginText.includes("Use Phone OTP (advanced)"),
      "Login should keep Google first and collapse phone OTP behind progressive disclosure."
    );
    addCheck(
      checks,
      "p2",
      "topichub_home_recent_and_resume",
      topicHubHomeText.includes("Recent topics") &&
        topicHubHomeText.includes("Resume topic"),
      "TopicHubHome should prioritize resume + recent topics."
    );
  }

  if (includePriority("p3")) {
    addCheck(
      checks,
      "p3",
      "telemetry_service_present",
      telemetryText.includes("trackUxEvent") &&
        telemetryText.includes("UX_TELEMETRY_KEY"),
      "Telemetry service should persist lightweight UX events locally."
    );
    addCheck(
      checks,
      "p3",
      "telemetry_hooks_wired_for_login_trends_topichub_hpq",
      loginText.includes('trackUxEvent("login_google_click"') &&
        trendsText.includes('trackUxEvent("trends_topic_teach_click"') &&
        topicHubText.includes('trackUxEvent("topichub_open_practice"') &&
        hpqText.includes('trackUxEvent("hpq_open_practice"'),
      "Telemetry hooks should cover login, trends clicks and topichub->practice flow."
    );
    addCheck(
      checks,
      "p3",
      "accessibility_focus_states_present",
      stylesText.includes(".ux-return-bar__back:focus-visible") &&
        stylesText.includes(".ux-journey-strip__chip:focus-visible"),
      "Focus-visible states should exist for keyboard navigation."
    );
    addCheck(
      checks,
      "p3",
      "mobile_ux_rules_present",
      stylesText.includes("@media (max-width: 768px)") &&
        stylesText.includes(".ux-journey-strip"),
      "Mobile UX rules should exist for dense journey controls."
    );
    const mojibakeGate = spawnSync("node", ["scripts/check-mojibake.cjs"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    addCheck(
      checks,
      "p3",
      "mojibake_gate_passes",
      mojibakeGate.status === 0,
      `${String(mojibakeGate.stdout || "").trim()} ${String(mojibakeGate.stderr || "").trim()}`.trim()
    );
  }

  const failed = checks.filter((item) => !item.ok);
  const outPath = path.join(outDir, `ux_priority_step_acceptance_${target}.json`);
  const report = {
    generatedAt: new Date().toISOString(),
    target,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length > 0) {
    console.error(`UX priority step acceptance FAILED for ${target} (${failed.length}/${checks.length}).`);
    for (const f of failed) {
      console.error(`- [${f.priority}] ${f.name}: ${f.details}`);
    }
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`UX priority step acceptance PASSED for ${target} (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const outPath = path.join(outDir, `ux_priority_step_acceptance_${target}.json`);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        target,
        error: String(err?.stack || err?.message || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("UX priority step acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
