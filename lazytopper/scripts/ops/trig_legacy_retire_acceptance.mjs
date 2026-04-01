import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "trig_legacy_retire_acceptance.json");

function check(name, ok, details = "") {
  return { name, ok: Boolean(ok), details: String(details || "") };
}

function fileMissing(rel) {
  return !existsSync(path.join(repoRoot, rel));
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
    .filter((line) => !line.includes("trig_legacy_retire_acceptance"))
    .filter((line) => !line.includes("scripts\\ops\\run-practice-integration-pack.ps1"));
}

function run() {
  const checks = [];

  checks.push(check("trig_questions_deleted", fileMissing("src/data/trigQuestions.ts"), "legacy trig question bank should be removed"));
  checks.push(check("trig_quiz_deleted", fileMissing("src/utils/trigQuiz.ts"), "legacy trig quiz utility should be removed"));

  const refs = rg("trigQuestions|generateTrigQuiz|TRIG_QUESTION_BANK");
  checks.push(check("no_legacy_trig_refs", refs.length === 0, refs.length ? refs.join(" | ") : "none"));

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`trig legacy retire acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) process.exit(1);
}

run();
