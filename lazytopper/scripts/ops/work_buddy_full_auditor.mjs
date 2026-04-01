import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "work_buddy_full_audit.json");

const buddies = [
  {
    id: "architect-buddy",
    role: "software_auditor",
    mission:
      "Audit implementation completeness for CSS hardening (Phases 1-3) and feature/dependency/gap analysis stack (Phases 4-6).",
  },
  {
    id: "tester-buddy",
    role: "qa_tester",
    mission:
      "Execute acceptance tests and confirm deterministic report outputs for phases 1 through 6.",
  },
];

function runNpm(args) {
  const res = spawnSync("npm", args, {
    cwd: repoRoot,
    env: { ...process.env },
    shell: process.platform === "win32",
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });
  return {
    ok: (res.status ?? 1) === 0,
    code: res.status ?? 1,
    stdout: String(res.stdout || ""),
    stderr: String(res.stderr || ""),
  };
}

async function fileExists(relPath) {
  try {
    await fs.access(path.join(repoRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

async function run() {
  const checks = [];
  function add(name, ok, details = "", buddy = "architect-buddy") {
    checks.push({ buddy, name, ok: Boolean(ok), details: String(details || "") });
  }

  const requiredFiles = [
    "scripts/ops/phases_1_3_acceptance.mjs",
    "scripts/ops/feature_file_matrix.mjs",
    "scripts/ops/dependency_risk_classification.mjs",
    "scripts/ops/human_tutor_gap_audit.mjs",
    "scripts/ops/phases_4_6_acceptance.mjs",
  ];

  for (const rel of requiredFiles) {
    add(`file_present:${rel}`, await fileExists(rel), (await fileExists(rel)) ? "present" : "missing");
  }

  const p13 = runNpm(["run", "test:phases:1-3"]);
  add(
    "acceptance:test_phases_1_3",
    p13.ok,
    p13.ok ? "passed" : `failed exit=${p13.code}`,
    "tester-buddy"
  );

  const p46 = runNpm(["run", "test:phases:4-6"]);
  add(
    "acceptance:test_phases_4_6",
    p46.ok,
    p46.ok ? "passed" : `failed exit=${p46.code}`,
    "tester-buddy"
  );

  const requiredReports = [
    ".project_memory/ops/out/phases_1_3_acceptance.json",
    ".project_memory/ops/out/feature_file_matrix.json",
    ".project_memory/ops/out/dependency_risk_classification.json",
    ".project_memory/ops/out/human_tutor_gap_audit.json",
    ".project_memory/ops/out/phases_4_6_acceptance.json",
  ];
  for (const rel of requiredReports) {
    add(
      `report_present:${rel}`,
      await fileExists(rel),
      (await fileExists(rel)) ? "present" : "missing",
      "architect-buddy"
    );
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    buddies,
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
    execution: {
      phases_1_3: {
        code: p13.code,
        stdoutTail: p13.stdout.split("\n").slice(-25),
        stderrTail: p13.stderr.split("\n").slice(-25),
      },
      phases_4_6: {
        code: p46.code,
        stdoutTail: p46.stdout.split("\n").slice(-25),
        stderrTail: p46.stderr.split("\n").slice(-25),
      },
    },
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length > 0) {
    console.error(`Work buddy full audit FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Work buddy full audit PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        buddies,
        error: String(err?.stack || err),
      },
      null,
      2
    ),
    "utf8"
  );
  console.error("Work buddy full audit errored.");
  console.error(String(err?.stack || err));
  process.exitCode = 1;
});
