import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "phases_4_6_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

function runNode(relPath, checks, label) {
  const abs = path.join(repoRoot, relPath);
  const res = spawnSync(process.execPath, [abs], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  addCheck(checks, `suite_${label}`, (res.status ?? 1) === 0, `status=${res.status ?? "null"}`);
}

async function readJson(relPath) {
  const abs = path.join(repoRoot, relPath);
  const txt = await fs.readFile(abs, "utf8");
  return JSON.parse(txt);
}

async function exists(relPath) {
  try {
    await fs.access(path.join(repoRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const checks = [];

  runNode("scripts/ops/feature_file_matrix.mjs", checks, "feature_file_matrix");
  runNode("scripts/ops/dependency_risk_classification.mjs", checks, "dependency_risk_classification");
  runNode("scripts/ops/human_tutor_gap_audit.mjs", checks, "human_tutor_gap_audit");

  const featurePath = ".project_memory/ops/out/feature_file_matrix.json";
  const depPath = ".project_memory/ops/out/dependency_risk_classification.json";
  const gapPath = ".project_memory/ops/out/human_tutor_gap_audit.json";

  addCheck(checks, "phase4_feature_matrix_report_present", await exists(featurePath), featurePath);
  addCheck(checks, "phase4_dependency_report_present", await exists(depPath), depPath);
  addCheck(checks, "phase5_gap_audit_report_present", await exists(gapPath), gapPath);

  if (await exists(featurePath)) {
    const feature = await readJson(featurePath);
    addCheck(
      checks,
      "phase4_feature_matrix_has_features",
      Array.isArray(feature.features) && feature.features.length >= 8,
      `featureCount=${feature.features?.length || 0}`
    );
    addCheck(
      checks,
      "phase4_feature_matrix_has_docs_signal",
      Boolean(feature.docs?.proTipsFound) && Boolean(feature.docs?.trianglesDocFound),
      `proTipsFound=${feature.docs?.proTipsFound}, trianglesDocFound=${feature.docs?.trianglesDocFound}`
    );
    addCheck(
      checks,
      "phase4_feature_matrix_has_implemented_items",
      Number(feature.summary?.implemented || 0) >= 1,
      `implemented=${feature.summary?.implemented || 0}`
    );
  }

  if (await exists(depPath)) {
    const dep = await readJson(depPath);
    addCheck(
      checks,
      "phase4_dependency_has_classifications",
      Array.isArray(dep.classifications) && dep.classifications.length >= 50,
      `classifications=${dep.classifications?.length || 0}`
    );
    addCheck(
      checks,
      "phase4_dependency_has_runtime_critical",
      Number(dep.summary?.runtime_critical || 0) >= 1,
      `runtime_critical=${dep.summary?.runtime_critical || 0}`
    );
    addCheck(
      checks,
      "phase4_dependency_has_orphan_or_halfbuilt_candidates",
      Number(dep.summary?.orphan_candidate || 0) + Number(dep.summary?.half_built_chain || 0) >= 1,
      `orphan=${dep.summary?.orphan_candidate || 0}, half_built=${dep.summary?.half_built_chain || 0}`
    );
  }

  if (await exists(gapPath)) {
    const gap = await readJson(gapPath);
    addCheck(
      checks,
      "phase5_gap_audit_has_suite_summaries",
      Array.isArray(gap.suiteSummaries) && gap.suiteSummaries.length >= 4,
      `suiteSummaries=${gap.suiteSummaries?.length || 0}`
    );
    addCheck(
      checks,
      "phase5_gap_audit_has_backlog",
      Array.isArray(gap.gapBacklog),
      `gapBacklogCount=${gap.gapBacklog?.length || 0}`
    );
    addCheck(
      checks,
      "phase5_gap_prioritization_present",
      typeof gap.summary?.p0 === "number" &&
        typeof gap.summary?.p1 === "number" &&
        typeof gap.summary?.p2 === "number",
      `p0=${gap.summary?.p0}, p1=${gap.summary?.p1}, p2=${gap.summary?.p2}`
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
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`Phases 4-6 acceptance FAILED (${failed.length}/${checks.length}).`);
    for (const f of failed) console.error(`- ${f.name}: ${f.details}`);
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Phases 4-6 acceptance PASSED (${checks.length}/${checks.length}).`);
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
  console.error("Phases 4-6 acceptance errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
