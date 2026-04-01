import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "phases_1_3_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

function runNodeScript(relPath, checks, label) {
  const abs = path.join(repoRoot, relPath);
  const res = spawnSync(process.execPath, [abs], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  addCheck(checks, `suite_${label}`, (res.status ?? 1) === 0, `status=${res.status ?? "null"}`);
}

async function exists(relPath) {
  try {
    await fs.access(path.join(repoRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

async function read(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

async function run() {
  const checks = [];

  // Phase 1 checks
  addCheck(
    checks,
    "phase1_index_css_deleted",
    !(await exists("src/index.css")),
    "src/index.css must be removed."
  );

  const referencesHaystack = `${await read("index.html")}\n${await read("src/main.tsx")}`;
  addCheck(
    checks,
    "phase1_no_index_css_reference",
    !/index\.css/.test(referencesHaystack),
    "No runtime index.css reference should remain."
  );

  // Phase 2 checks
  addCheck(
    checks,
    "phase2_graph_script_present",
    await exists("scripts/ops/styles_connectivity_graph.mjs"),
    "Graph generator script should exist."
  );
  addCheck(
    checks,
    "phase2_acceptance_script_present",
    await exists("scripts/ops/styles_connectivity_acceptance.mjs"),
    "Graph acceptance script should exist."
  );
  addCheck(
    checks,
    "phase2_trim_candidates_script_present",
    await exists("scripts/ops/styles_trim_candidates.mjs"),
    "Trim candidate script should exist."
  );
  addCheck(
    checks,
    "phase2_trim_acceptance_script_present",
    await exists("scripts/ops/styles_trim_acceptance.mjs"),
    "Trim acceptance script should exist."
  );

  runNodeScript("scripts/ops/styles_connectivity_graph.mjs", checks, "styles_graph");
  runNodeScript("scripts/ops/styles_connectivity_acceptance.mjs", checks, "styles_connectivity");
  runNodeScript("scripts/ops/styles_trim_acceptance.mjs", checks, "styles_trim_acceptance");

  // Phase 3 metric checks
  const cssText = await read("src/styles.css");
  const cssLineCount = cssText.split(/\r?\n/).length;
  addCheck(
    checks,
    "phase3_styles_lines_reduced_from_baseline",
    cssLineCount < 7294,
    `styles.css lines=${cssLineCount}, expected < 7294 baseline`
  );

  const prePath = path.join(outDir, "styles_connectivity_graph.pretrim.json");
  const postPath = path.join(outDir, "styles_connectivity_graph.json");
  const preExists = await exists(path.relative(repoRoot, prePath));
  const postExists = await exists(path.relative(repoRoot, postPath));
  addCheck(checks, "phase3_pretrim_report_present", preExists, "pretrim report should exist.");
  addCheck(checks, "phase3_posttrim_report_present", postExists, "posttrim report should exist.");

  if (preExists && postExists) {
    const pre = JSON.parse(await fs.readFile(prePath, "utf8"));
    const post = JSON.parse(await fs.readFile(postPath, "utf8"));
    addCheck(
      checks,
      "phase3_duplicate_selectors_reduced",
      (post.duplicate_selectors || []).length <= (pre.duplicate_selectors || []).length,
      `pre=${(pre.duplicate_selectors || []).length}, post=${(post.duplicate_selectors || []).length}`
    );
    addCheck(
      checks,
      "phase3_duplicate_identical_removed",
      (post.duplicate_selector_blocks_identical || []).length === 0,
      `post duplicate_identical=${(post.duplicate_selector_blocks_identical || []).length}`
    );
    addCheck(
      checks,
      "phase3_unresolved_not_regressed",
      Number(post.rules_unresolved || 0) <= Number(pre.rules_unresolved || 0),
      `pre unresolved=${pre.rules_unresolved}, post unresolved=${post.rules_unresolved}`
    );
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
    metrics: {
      styles_css_lines: cssLineCount,
    },
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`Phases 1-3 acceptance FAILED (${failed.length}/${checks.length}).`);
    for (const f of failed) console.error(`- ${f.name}: ${f.details}`);
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Phases 1-3 acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        error: String(err?.stack || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("Phases 1-3 acceptance errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
