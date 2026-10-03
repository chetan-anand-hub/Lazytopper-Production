import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "bsre_spike_acceptance.json");

function check(name, ok, details = "") {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function rg(query) {
  const res = spawnSync("rg", ["-n", "-e", query, "src", "scripts", "server"], {
    cwd: repoRoot,
    shell: false,
    encoding: "utf8",
  });
  if ((res.status ?? 1) === 1) return [];
  return String(res.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((line) => !line.includes("bsre_spike_acceptance"));
}

function run() {
  const checks = [];

  // FRICTION-FIX-1 PR-1 (P14): the "bsre_types_present" and "bsre_evaluator_present" checks
  // were removed with their files. src/engine/bsre/{types,evaluator}.ts had no live importer;
  // the only loader, server/routes/mentorBsre.cjs, was itself unrequired and was deleted (R2).

  const refs = rg("engine/bsre|BsreEvaluator|triangles_bsre_rubrics_v1");
  // Match both path separators: rg emits `server\index.cjs` on Windows, `server/index.cjs` on Linux CI.
  const serverRefs = refs.filter((line) => /server[\\/]index\.cjs/.test(line));
  checks.push(
    check(
      "bsre_runtime_refs_present",
      serverRefs.length > 0,
      serverRefs.length ? serverRefs.join(" | ") : "missing server references"
    )
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`bsre spike acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) process.exit(1);
}

run();
