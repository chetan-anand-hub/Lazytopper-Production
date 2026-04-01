import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "styles_restructure_audit_acceptance.json");

function trimText(text, maxLen = 1200) {
  const str = String(text || "");
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}\n... [truncated]`;
}

function runNodeStep(scriptRelPath, args = []) {
  const scriptAbsPath = path.join(repoRoot, scriptRelPath);
  const cmd = process.execPath;
  const cmdArgs = [scriptAbsPath, ...args];

  const result = spawnSync(cmd, cmdArgs, {
    cwd: repoRoot,
    env: { ...process.env },
    encoding: "utf8",
    shell: false,
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    command: `${path.relative(repoRoot, cmd).replaceAll("\\", "/")} ${[
      scriptRelPath.replaceAll("\\", "/"),
      ...args,
    ].join(" ")}`.trim(),
    status: result.status ?? null,
    ok: (result.status ?? 1) === 0,
    stdout: trimText(result.stdout),
    stderr: trimText(result.stderr),
  };
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
  const stepDefs = [
    {
      id: "s1_styles_connectivity_graph",
      script: "scripts/ops/styles_connectivity_graph.mjs",
      args: [],
      intent: "Generate class-token to file connectivity map.",
    },
    {
      id: "s1_styles_connectivity_acceptance",
      script: "scripts/ops/styles_connectivity_acceptance.mjs",
      args: [],
      intent: "Validate style graph contract and parser integrity.",
    },
    {
      id: "s2_styles_change_impact_graph",
      script: "scripts/ops/styles_change_impact_graph.mjs",
      args: [],
      intent: "Generate end-to-end CSS change impact graph for routes and files.",
    },
    {
      id: "s2_styles_change_impact_acceptance",
      script: "scripts/ops/styles_change_impact_acceptance.mjs",
      args: [],
      intent: "Validate blast-radius graph quality and route bindings.",
    },
    {
      id: "s3_styles_trim_candidates",
      script: "scripts/ops/styles_trim_candidates.mjs",
      args: [],
      intent: "Generate conservative trim candidates.",
    },
    {
      id: "s3_styles_trim_acceptance",
      script: "scripts/ops/styles_trim_acceptance.mjs",
      args: [],
      intent: "Protect resolved selectors and keep blocks before deletion.",
    },
    {
      id: "s4_styles_uiux_audit",
      script: "scripts/ops/styles_uiux_audit.mjs",
      args: [],
      intent: "Generate education UX-driven style restructuring audit.",
    },
  ];

  const steps = [];
  for (const def of stepDefs) {
    const startedAt = new Date().toISOString();
    const result = runNodeStep(def.script, def.args);
    const finishedAt = new Date().toISOString();
    steps.push({
      id: def.id,
      intent: def.intent,
      script: def.script.replaceAll("\\", "/"),
      started_at: startedAt,
      finished_at: finishedAt,
      ...result,
    });
  }

  const artifactChecks = [
    ".project_memory/ops/out/styles_connectivity_graph.json",
    ".project_memory/ops/out/styles_change_impact_graph.json",
    ".project_memory/ops/out/styles_trim_candidates.json",
    ".project_memory/ops/out/styles_uiux_audit.json",
    ".project_memory/ops/out/styles_uiux_audit.md",
  ];

  const artifacts = [];
  for (const rel of artifactChecks) {
    artifacts.push({
      path: rel,
      ok: await exists(rel),
    });
  }

  const failedSteps = steps.filter((s) => !s.ok);
  const missingArtifacts = artifacts.filter((a) => !a.ok);

  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total_steps: steps.length,
      passed_steps: steps.length - failedSteps.length,
      failed_steps: failedSteps.length,
      artifacts_expected: artifacts.length,
      artifacts_present: artifacts.length - missingArtifacts.length,
      artifacts_missing: missingArtifacts.length,
    },
    steps,
    artifacts,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failedSteps.length > 0 || missingArtifacts.length > 0) {
    console.error(
      `styles_restructure_audit_acceptance: FAIL steps_failed=${failedSteps.length}, artifacts_missing=${missingArtifacts.length}`
    );
    for (const step of failedSteps) {
      console.error(`- ${step.id}: status=${step.status}`);
    }
    for (const artifact of missingArtifacts) {
      console.error(`- missing artifact: ${artifact.path}`);
    }
    console.error(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `styles_restructure_audit_acceptance: PASS steps=${steps.length}, artifacts=${artifacts.length}`
  );
  console.log(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
}

run().catch(async (err) => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        error: String(err?.stack || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("styles_restructure_audit_acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);
  process.exitCode = 1;
});

