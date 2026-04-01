import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const policyPath = path.join(
  repoRoot,
  "docs",
  "project_memory",
  "governance",
  "repo_boundary_policy.json"
);
const gitignorePath = path.join(repoRoot, ".gitignore");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "repo_boundary_acceptance.json");

function normalizePath(input) {
  return String(input || "").replace(/\\/g, "/").replace(/^\.\//, "").trim();
}

function toRule(rule) {
  return normalizePath(rule).toLowerCase();
}

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

function matchesRule(filePath, rule) {
  const file = normalizePath(filePath).toLowerCase();
  const matchRule = toRule(rule);
  if (!matchRule) return false;
  if (matchRule.endsWith("/")) return file.startsWith(matchRule);
  if (matchRule.includes("*")) {
    const escaped = matchRule.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    const globPattern = escaped
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*");
    const regex = new RegExp(`^${globPattern}(?:/.*)?$`);
    return regex.test(file);
  }
  return file === matchRule || file.startsWith(`${matchRule}/`);
}

function inLane(filePath, rules = []) {
  return rules.some((rule) => matchesRule(filePath, rule));
}

function classifyFile(filePath, lanes) {
  if (inLane(filePath, lanes.generatedEvidence)) return "generatedEvidence";
  if (inLane(filePath, lanes.localOnly)) return "localOnly";
  if (inLane(filePath, lanes.product)) return "product";
  if (inLane(filePath, lanes.trackedTooling)) return "trackedTooling";
  return "unknown";
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout || "unknown error"}`);
  }
  return String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => normalizePath(line))
    .filter(Boolean);
}

async function run() {
  const checks = [];
  const policy = JSON.parse(await fs.readFile(policyPath, "utf8"));
  const lanes = policy?.lanes || {};
  const modeToLanes = policy?.modeToLanes || {};
  const gitignoreText = (await fs.readFile(gitignorePath, "utf8")).toLowerCase();

  const requiredLaneKeys = ["product", "trackedTooling", "generatedEvidence", "localOnly"];
  addCheck(
    checks,
    "policy_has_required_lanes",
    requiredLaneKeys.every((k) => Array.isArray(lanes[k]) && lanes[k].length > 0),
    `lanes=${Object.keys(lanes).join(",")}`
  );

  const expectedModes = {
    tooling: ["trackedTooling"],
    tutor: ["product"],
    product: ["product"],
    mixed: ["product", "trackedTooling"],
  };
  const modeMismatches = Object.entries(expectedModes).filter(([mode, expected]) => {
    const got = modeToLanes[mode] || [];
    return got.join("|") !== expected.join("|");
  });
  addCheck(
    checks,
    "policy_mode_map_expected",
    modeMismatches.length === 0,
    modeMismatches.length
      ? modeMismatches.map(([mode]) => mode).join(",")
      : "ok"
  );

  const requiredIgnoreRules = [
    ".project_memory/**",
    "docs/session/**",
    "docs/ops/out/**",
    "run_*/**",
    "**/run_*/**",
    ".codex_runs/**",
    "reports/**",
    "tools/.local_ops/**",
    "dist/**",
    "build/**",
    "node_modules/**",
    "_codex_output/**",
    "_debug_bundle/**",
    "_handover_evidence/**",
    "_handoff/**",
    "_rollback/**",
  ];
  const missingIgnoreRules = requiredIgnoreRules.filter(
    (rule) => !gitignoreText.includes(rule)
  );
  addCheck(
    checks,
    "gitignore_hard_boundary_rules_present",
    missingIgnoreRules.length === 0,
    missingIgnoreRules.join(",")
  );

  const trackedFiles = runGit(["ls-files"]);
  const buckets = {
    product: [],
    trackedTooling: [],
    generatedEvidence: [],
    localOnly: [],
    unknown: [],
  };
  for (const file of trackedFiles) {
    const lane = classifyFile(file, lanes);
    buckets[lane].push(file);
  }

  const forbiddenTracked = [...buckets.generatedEvidence, ...buckets.localOnly];
  addCheck(
    checks,
    "no_forbidden_tracked_files",
    forbiddenTracked.length === 0,
    forbiddenTracked.slice(0, 20).join(",")
  );

  addCheck(
    checks,
    "all_tracked_files_classified",
    buckets.unknown.length === 0,
    buckets.unknown.slice(0, 20).join(",")
  );

  const failed = checks.filter((c) => !c.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    metrics: {
      tracked: trackedFiles.length,
      product: buckets.product.length,
      trackedTooling: buckets.trackedTooling.length,
      generatedEvidence: buckets.generatedEvidence.length,
      localOnly: buckets.localOnly.length,
      unknown: buckets.unknown.length,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`Repo boundary acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((item) => {
      console.error(`- ${item.name}: ${item.details}`);
    });
    console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Repo boundary acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("Repo boundary acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${normalizePath(path.relative(repoRoot, outPath))}`);
  process.exitCode = 1;
});
