import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "pro_tips_product_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function runScript(relPath, checks, name) {
  const abs = path.join(repoRoot, relPath);
  const result = spawnSync(process.execPath, [abs], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  addCheck(checks, `suite_${name}`, (result.status ?? 1) === 0, `status=${result.status ?? "null"}`);
}

async function run() {
  const checks = [];
  const appText = await readText("src/App.tsx");
  const dashboardText = await readText("src/pages/Dashboard.tsx");
  const dailyMixPageText = await readText("src/pages/DailyMixPage.tsx");
  const dailyMixPlayerText = await readText("src/components/DailyMixPlayer.tsx");
  const dailyMixGeneratorText = await readText("src/services/dailyMixGenerator.ts");
  const topicHubHomeText = await readText("src/pages/TopicHubHome.tsx");
  const trendsText = await readText("src/pages/TrendsPage.tsx");
  const smartLearningStoreText = await readText("src/engine/smartLearningStore.tsx");
  const commandPaletteText = await readText("src/ui/components/CommandPalette.tsx");
  const commandIntentText = await readText("src/services/commandIntent.ts");
  const wrappedGeneratorText = await readText("src/services/weeklyWrappedGenerator.ts");
  const wrappedCarouselText = await readText("src/components/WeeklyWrappedCarousel.tsx");
  const wrappedPageText = await readText("src/pages/WeeklyWrappedPage.tsx");
  const loginText = await readText("src/pages/Login.tsx");

  // Step 1 - Daily Focus Mix contract + flow.
  addCheck(
    checks,
    "step1_daily_mix_contract_present",
    dailyMixGeneratorText.includes("1 concept item + 3 must-crack questions + 1 revision card") &&
      dailyMixGeneratorText.includes("Must-crack Q1") &&
      dailyMixGeneratorText.includes("Concept Video:") &&
      dailyMixGeneratorText.includes("Revision Card:"),
    "Daily mix contract should be deterministic and explicit."
  );
  addCheck(
    checks,
    "step1_daily_mix_page_wired",
    dailyMixPageText.includes("<DailyMixWidget") &&
      dailyMixPageText.includes("count={5}") &&
      dailyMixPageText.includes("intensity={intensity}"),
    "DailyMixPage should wire generated playlist and intensity."
  );
  addCheck(
    checks,
    "step1_dashboard_primary_play_cta",
    dashboardText.includes("Play {mixTitle}") &&
      dashboardText.includes("Play Mix"),
    "Dashboard should expose a prominent one-tap Play CTA for daily mix."
  );
  addCheck(
    checks,
    "step1_daily_mix_auto_advance",
    dailyMixPlayerText.includes("auto-advances item by item") &&
      dailyMixPlayerText.includes("window.setTimeout") &&
      dailyMixPlayerText.includes("autoAdvanceMs"),
    "Player should support one-click play with auto-advance."
  );

  // Step 2 - Match score visibility and persistence.
  addCheck(
    checks,
    "step2_match_score_topic_hub_home",
    topicHubHomeText.includes("% Match") &&
      topicHubHomeText.includes("matchScoreByTopic") &&
      topicHubHomeText.includes("getMatchScoreForChapter"),
    "TopicHub home should show per-topic match score."
  );
  addCheck(
    checks,
    "step2_match_score_trends_cards",
    trendsText.includes("% Match") &&
      trendsText.includes("getMatchScoreForChapter") &&
      trendsText.includes("normalizeTopicKey(topicName)"),
    "Trends cards should show match score badges."
  );
  addCheck(
    checks,
    "step2_smart_learning_persistence",
    smartLearningStoreText.includes("SMART_LEARNING_STORAGE_KEY") &&
      smartLearningStoreText.includes("localStorage.setItem") &&
      smartLearningStoreText.includes("loadPersistedStats"),
    "Match score source stats should persist across refresh."
  );

  // Step 3 - Vibe check behavior.
  addCheck(
    checks,
    "step3_dashboard_vibe_check",
    dashboardText.includes("Energy Level:") &&
      dashboardText.includes("setMode(\"zombie\")") &&
      dashboardText.includes("setMode(\"beast\")") &&
      dashboardText.includes("Your ") &&
      dashboardText.includes("Mix ("),
    "Dashboard should expose low/high energy controls for daily flow."
  );
  addCheck(
    checks,
    "step3_login_vibe_check",
    loginText.includes("Energy Level:") &&
      loginText.includes("setMode(\"zombie\")") &&
      loginText.includes("setMode(\"beast\")") &&
      loginText.includes("Got it. Let's just do 10 mins of light revision today."),
    "Login should support low/high energy vibe selection."
  );

  // Step 4 - Command intent parser.
  addCheck(
    checks,
    "step4_command_intent_parser",
    commandIntentText.includes("parseCommandIntent") &&
      commandIntentText.includes("practice ") &&
      commandIntentText.includes("navigateToTopicHub") &&
      commandIntentText.includes("setVibeLow"),
    "Command parser should support natural typed intents."
  );
  addCheck(
    checks,
    "step4_command_palette_enter_submit",
    commandPaletteText.includes("if (e.key === \"Enter\")") &&
      commandPaletteText.includes("onSelect(first, query)") &&
      appText.includes("parseCommandIntent(query)"),
    "Palette enter key should resolve typed commands."
  );
  addCheck(
    checks,
    "step4_cmdk_nav_hint",
    appText.includes("Press Ctrl/Cmd + K to search"),
    "Top nav should hint Cmd/Ctrl+K command palette usage."
  );

  // Step 5 - Weekly wrapped upgrade.
  addCheck(
    checks,
    "step5_wrapped_metrics_upgrade",
    wrappedGeneratorText.includes("powerHourLabel") &&
      wrappedGeneratorText.includes("consistencyPercentile") &&
      wrappedGeneratorText.includes("topicsConquered"),
    "Weekly wrapped summary should include power hour and consistency."
  );
  addCheck(
    checks,
    "step5_wrapped_story_and_share",
    wrappedCarouselText.includes("Share to Instagram") &&
      wrappedPageText.includes("consistencyPercentile") &&
      wrappedPageText.includes("powerHourLabel"),
    "Weekly wrapped UI should expose stronger share story."
  );
  addCheck(
    checks,
    "step5_weekly_wrapped_sunday_unlock",
    wrappedPageText.includes("Weekly Recap unlocks on Sunday") &&
      wrappedPageText.includes("Preview now"),
    "Weekly wrapped should include Sunday unlock behavior."
  );

  // Dashboard matrix requirement.
  addCheck(
    checks,
    "dashboard_performance_matrix_present",
    dashboardText.includes("Performance Matrix") &&
      dashboardText.includes("data-testid=\"performance-matrix-card\"") &&
      dashboardText.includes("Topic-wise view of attempts, accuracy, and Match score."),
    "Dashboard should include a topic-level performance matrix."
  );

  // Step 6 - Keep human tutor behavior intact.
  runScript("scripts/ops/topichub_doc_alignment_acceptance.mjs", checks, "topichub_doc_alignment");

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
    console.error(`Pro Tips product acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Pro Tips product acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Pro Tips product acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
