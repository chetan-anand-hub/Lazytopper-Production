import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outFile = path.join(outDir, "llm_path_audit_acceptance.json");

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
    .filter((line) => !line.includes("llm_path_audit_acceptance"));
}

function run() {
  const checks = [];

  checks.push(check("llm_config_deleted", fileMissing("src/llm/llmConfig.ts"), "legacy local-LLM config should be removed"));
  checks.push(check("llm_types_deleted", fileMissing("src/llm/llmQuestionTypes.ts"), "legacy local-LLM types should be removed"));
  checks.push(check("llm_client_deleted", fileMissing("src/llm/llmClient.ts"), "legacy local-LLM client should be removed"));

  const llmRefs = rg("src/llm|/llm/|generateQuestionsViaLLM|LLM_CONFIG");
  checks.push(check("no_legacy_llm_refs", llmRefs.length === 0, llmRefs.length ? llmRefs.join(" | ") : "none"));

  const aiClientRefs = rg("generateMoreLikeThis|MENTOR_ENDPOINT");
  checks.push(check("ai_client_path_still_connected", aiClientRefs.length > 0, aiClientRefs.length ? `${aiClientRefs.length} refs` : "missing"));

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: { total: checks.length, passed: checks.length - failed.length, failed: failed.length },
    checks,
  };

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");

  console.log(`llm path audit acceptance: ${report.summary.passed}/${report.summary.total}`);
  console.log(`report: ${path.relative(repoRoot, outFile)}`);

  if (failed.length) process.exit(1);
}

run();
