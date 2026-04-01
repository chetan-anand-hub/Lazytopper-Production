import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "agent2_test_guard.json");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const phase = [...args].find((a) => a.startsWith("--phase="))?.split("=")[1] || "generic";
const scriptListArg = [...args].find((a) => a.startsWith("--scripts="));

const defaultRequiredScripts = [
  "build",
  "lint:ci",
  "test:triangles:human-tutor",
  "test:ux:all-priorities",
  "test:topichub:doc-alignment",
  "test:pro-tips:acceptance",
  "test:agent3:uiux",
  "test:prediction:bank-health",
  "test:practice:weightage-mix",
  "test:canonical:generator",
  "test:trig:retire",
  "test:llm:path-audit",
  "test:bsre:path"
];

const requiredScripts = scriptListArg
  ? scriptListArg
      .split("=")[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : defaultRequiredScripts;

function loadPackageScripts() {
  const pkg = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  return pkg.scripts || {};
}

function runNpmScript(scriptName) {
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(cmd, ["run", scriptName], {
    cwd: repoRoot,
    shell: process.platform === "win32",
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
}

function record(name, ok, details) {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function main() {
  const scripts = loadPackageScripts();
  const checks = [];

  checks.push(record("guard_mode", true, dryRun ? `dry-run (${phase})` : `execute (${phase})`));

  for (const required of requiredScripts) {
    const exists = Object.prototype.hasOwnProperty.call(scripts, required);
    checks.push(record(`script_present:${required}`, exists, exists ? "present" : "missing"));
  }

  if (!dryRun) {
    for (const script of requiredScripts) {
      if (!Object.prototype.hasOwnProperty.call(scripts, script)) continue;
      const res = runNpmScript(script);
      checks.push(record(`run:${script}`, res.status === 0, res.status === 0 ? "ok" : (res.stderr || res.stdout || `exit=${res.status}`)));
    }
  }

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    phase,
    dryRun,
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`agent2 report: ${path.relative(repoRoot, outFile)}`);
  console.log(`agent2 summary: ${report.summary.passed}/${report.summary.total}`);

  if (failed.length) process.exit(1);
}

main();
