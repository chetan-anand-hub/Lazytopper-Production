import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(
  outDir,
  "topichub_intended_functionality_acceptance.json"
);

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function runNodeScript(relPath, checks, label) {
  const abs = path.join(repoRoot, relPath);
  const result = spawnSync(process.execPath, [abs], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  addCheck(
    checks,
    `suite_${label}`,
    (result.status ?? 1) === 0,
    `status=${result.status ?? "null"}`
  );
}

async function run() {
  const checks = [];

  const appText = await readText("src/App.tsx");
  const topicHubHomeText = await readText("src/pages/TopicHubHome.tsx");
  const topicHubText = await readText("src/pages/TopicHub.tsx");
  const navText = await readText("src/navigation/practiceNavigation.ts");

  addCheck(
    checks,
    "app_imports_topichub_home",
    appText.includes('import TopicHubHome from "./pages/TopicHubHome";'),
    "App should import the TopicHub launcher page."
  );
  addCheck(
    checks,
    "app_route_topichub_launcher",
    appText.includes('<Route path="/topic-hub" element={<TopicHubHome />} />'),
    "Route /topic-hub should render the launcher page."
  );
  addCheck(
    checks,
    "app_palette_uses_launcher",
    appText.includes("navigate('/topic-hub');"),
    "Command palette should open the launcher page."
  );
  addCheck(
    checks,
    "launcher_has_continue_card",
    topicHubHomeText.includes("Continue where you left off"),
    "Launcher should expose resume flow."
  );
  addCheck(
    checks,
    "launcher_has_search_and_start",
    topicHubHomeText.includes('placeholder="Search topic"') &&
      topicHubHomeText.includes("Start Learning"),
    "Launcher should support topic search and start action."
  );
  addCheck(
    checks,
    "launcher_reads_mastery_hint",
    topicHubHomeText.includes("loadTopicMasterySnapshot"),
    "Launcher should show weakest/progress hint from local mastery."
  );
  addCheck(
    checks,
    "topichub_persists_last_route",
    topicHubText.includes("TOPICHUB_LAST_ROUTE_KEY") &&
      topicHubText.includes("window.localStorage.setItem(TOPICHUB_LAST_ROUTE_KEY"),
    "TopicHub should persist last visited topic route."
  );
  addCheck(
    checks,
    "practice_navigation_supports_section_filter",
    navText.includes("PracticeSectionFilter") &&
      navText.includes('search.set("section", sectionFilter)'),
    "Practice navigation should carry section filter context."
  );

  runNodeScript(
    "scripts/ops/triangles_human_tutor_acceptance.mjs",
    checks,
    "triangles_human_tutor"
  );
  runNodeScript(
    "scripts/ops/topic_grind_contracts_acceptance.mjs",
    checks,
    "topic_grind_contracts"
  );
  runNodeScript(
    "scripts/ops/topichub_human_tutor_all_topics_acceptance.mjs",
    checks,
    "topichub_human_tutor_all_topics"
  );
  runNodeScript(
    "scripts/ops/topic_diagram_coverage_acceptance.mjs",
    checks,
    "topic_diagram_coverage"
  );

  const failed = checks.filter((check) => !check.ok);
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
    console.error(
      `TopicHub intended functionality acceptance FAILED (${failed.length}/${checks.length}).`
    );
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `TopicHub intended functionality acceptance PASSED (${checks.length}/${checks.length}).`
  );
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("TopicHub intended functionality acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
