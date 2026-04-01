import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "work_buddy_audit.json");

const buddies = [
  {
    id: "architect-buddy",
    role: "software_auditor",
    mission:
      "Audit structural completeness of the HPQ prediction stack and boundary-safe integration points.",
  },
  {
    id: "tester-buddy",
    role: "qa_tester",
    mission:
      "Run acceptance checks and confirm behavior with deterministic pass/fail evidence.",
  },
];

function runCommand(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

async function fileExists(relPath) {
  try {
    await fs.access(path.join(repoRoot, relPath));
    return true;
  } catch {
    return false;
  }
}

async function runWorkBuddyAudit() {
  const checks = [];

  const requiredFiles = [
    "src/prediction/historicalDataset.ts",
    "src/prediction/probabilisticScoring.ts",
    "src/prediction/constrainedPaperConstructor.ts",
    "src/prediction/backtesting.ts",
    "src/prediction/driftMonitor.ts",
    "src/prediction/hpqConfidence.ts",
    "scripts/ops/hpq_phase2_acceptance.mjs",
  ];

  for (const relPath of requiredFiles) {
    const ok = await fileExists(relPath);
    checks.push({
      buddy: "architect-buddy",
      name: `file_present:${relPath}`,
      ok,
      details: ok ? "present" : "missing",
    });
  }

  const phase2 = await runCommand("npm", ["run", "test:hpq:phase2"], repoRoot);
  checks.push({
    buddy: "tester-buddy",
    name: "acceptance:test_hpq_phase2",
    ok: phase2.ok,
    details: phase2.ok
      ? "passed"
      : `failed (exit=${phase2.code}) ${phase2.stderr.split("\n").slice(-3).join(" | ")}`,
  });

  const standards = await runCommand("npm", ["run", "test:hpq:standards"], repoRoot);
  checks.push({
    buddy: "tester-buddy",
    name: "acceptance:test_hpq_standards",
    ok: standards.ok,
    details: standards.ok
      ? "passed"
      : `failed (exit=${standards.code}) ${standards.stderr.split("\n").slice(-3).join(" | ")}`,
  });

  const failed = checks.filter((check) => !check.ok);
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
      phase2: {
        code: phase2.code,
        stdoutTail: phase2.stdout.split("\n").slice(-10),
        stderrTail: phase2.stderr.split("\n").slice(-10),
      },
      standards: {
        code: standards.code,
        stdoutTail: standards.stdout.split("\n").slice(-10),
        stderrTail: standards.stderr.split("\n").slice(-10),
      },
    },
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length > 0) {
    console.error(`Work buddy audit FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((check) => console.error(`- ${check.name}: ${check.details}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Work buddy audit PASSED (${checks.length}/${checks.length}).`);
}

runWorkBuddyAudit().catch(async (error) => {
  const report = {
    generatedAt: new Date().toISOString(),
    buddies,
    error: String(error?.stack || error),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Work buddy audit errored.");
  console.error(String(error?.stack || error));
  process.exitCode = 1;
});

