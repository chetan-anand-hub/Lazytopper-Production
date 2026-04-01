import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "step2_refactor_connectivity_acceptance.json");

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
  const launcherText = await readText("src/pages/TopicHubHome.tsx");
  const dashboardText = await readText("src/pages/Dashboard.tsx");

  addCheck(
    checks,
    "app_route_topichub_launcher_plain_route",
    appText.includes('<Route path="/topic-hub" element={<TopicHubHome />} />'),
    "App route should expose plain TopicHub launcher route string for contract detection."
  );

  addCheck(
    checks,
    "launcher_self_guarded_with_require_auth",
    launcherText.includes("import { RequireAuth } from \"../components/auth/RequireAuth\";") &&
      launcherText.includes("<RequireAuth>") &&
      launcherText.includes("<TopicHubHomeContent />"),
    "TopicHubHome should keep auth guard internally."
  );

  addCheck(
    checks,
    "dashboard_primary_play_mix_cta",
    dashboardText.includes("Play {mixTitle}") && dashboardText.includes("Play Mix"),
    "Dashboard should keep one-tap Play CTA with explicit Play Mix label."
  );

  runScript("scripts/ops/half_built_impact_analysis.mjs", checks, "half_built_impact_analysis");
  runScript("scripts/ops/topichub_intended_functionality_acceptance.mjs", checks, "topichub_intended_functionality");
  runScript("scripts/ops/pro_tips_product_acceptance.mjs", checks, "pro_tips_product_acceptance");
  runScript("scripts/ops/triangles_human_tutor_acceptance.mjs", checks, "triangles_human_tutor");

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
    console.error(`Step-2 refactor/connectivity acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Step-2 refactor/connectivity acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Step-2 refactor/connectivity acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
