import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "matrix_execution_acceptance.json");

const steps = [
  { id: "agent2_dry", cmd: ["run", "test:agent2:guard", "--", "--dry-run", "--phase=matrix"] },
  { id: "agent3_dry", cmd: ["run", "test:agent3:uiux", "--", "--dry-run", "--phase=matrix"] },
  { id: "a1_bank_health", cmd: ["run", "test:prediction:bank-health"] },
  { id: "a2_weightage_mix", cmd: ["run", "test:practice:weightage-mix"] },
  { id: "a3_canonical_generator", cmd: ["run", "test:canonical:generator"] },
  { id: "a4_trig_retire", cmd: ["run", "test:trig:retire"] },
  { id: "a5_llm_retire", cmd: ["run", "test:llm:path-audit"] },
  { id: "a6_bsre_guard", cmd: ["run", "test:bsre:retire"] },
  { id: "core_triangles", cmd: ["run", "test:triangles:human-tutor"] },
  { id: "core_doc_alignment", cmd: ["run", "test:topichub:doc-alignment"] },
  { id: "core_pro_tips", cmd: ["run", "test:pro-tips:acceptance"] },
  { id: "core_lint", cmd: ["run", "lint:ci"] },
  { id: "core_build", cmd: ["run", "build"] },
];

function runNpm(args) {
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const res = spawnSync(cmd, args, {
    cwd: repoRoot,
    shell: process.platform === "win32",
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40,
  });
  return {
    code: res.status ?? 1,
    ok: (res.status ?? 1) === 0,
    stdoutTail: String(res.stdout || "").split("\n").slice(-20),
    stderrTail: String(res.stderr || "").split("\n").slice(-20),
  };
}

function run() {
  const checks = [];

  for (const step of steps) {
    const res = runNpm(step.cmd);
    checks.push({
      step: step.id,
      ok: res.ok,
      exitCode: res.code,
      stdoutTail: res.stdoutTail,
      stderrTail: res.stderrTail,
    });
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

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`matrix execution acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) {
    process.exit(1);
  }
}

run();