import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseTaskIdArg,
  repoRoot,
  writeTaskScopedJsonReport,
} from "../../tools/codex/task_evidence_utils.mjs";

const severityRank = { P0: 0, P1: 1, P2: 2, INFO: 3 };
const supportedModes = new Set(["fast", "product", "browser", "full"]);
const supportedSurfaces = new Set(["topichub", "practice", "mentor", "triangles"]);
const supportedLanes = new Set(["auto", "tooling", "product"]);

const checks = {
  build: {
    id: "build",
    label: "build",
    command: "npm run build",
    severity: "P0",
    dimension: "build_type_static",
    description: "Confirms the web app compiles and bundles cleanly.",
  },
  lint_ci: {
    id: "lint_ci",
    label: "lint_ci",
    command: "npm run lint:ci",
    severity: "P1",
    dimension: "build_type_static",
    description: "Catches deterministic lint and static contract regressions.",
  },
  scope_guard: {
    id: "scope_guard",
    label: "scope_guard",
    command: "npm run scope:guard",
    severity: "P1",
    dimension: "repo_governance_safety",
    description: "Prevents lane-mixing and generated-evidence hygiene regressions.",
  },
  repo_boundary: {
    id: "repo_boundary",
    label: "repo_boundary",
    command: "npm run test:repo-boundary",
    severity: "P1",
    dimension: "repo_governance_safety",
    description: "Checks repo boundary and governance rules still hold.",
  },
  browser_journeys: {
    id: "browser_journeys",
    label: "browser_journeys",
    command: "npm run test:browser:journeys",
    severity: "P0",
    dimension: "journey_safety",
    description: "Runs the high-value browser journey pack across TopicHub, Practice, Mentor, and board-readiness flows.",
  },
  browser_topichub: {
    id: "browser_topichub",
    label: "browser_topichub",
    command: "npm run test:browser:topichub",
    severity: "P1",
    dimension: "journey_safety",
    description: "Checks guided chapter entry in TopicHub.",
  },
  browser_practice: {
    id: "browser_practice",
    label: "browser_practice",
    command: "npm run test:browser:practice",
    severity: "P0",
    dimension: "journey_safety",
    description: "Checks practice help escalation and board-readiness browser flows.",
  },
  browser_mentor: {
    id: "browser_mentor",
    label: "browser_mentor",
    command: "npm run test:browser:mentor",
    severity: "P0",
    dimension: "core_runtime_reliability",
    description: "Checks mentor reachability, recovery, and constructive fallback behavior.",
  },
  browser_triangles: {
    id: "browser_triangles",
    label: "browser_triangles",
    command: "npm run test:browser:triangles",
    severity: "P1",
    dimension: "journey_safety",
    description: "Checks the focused Triangles human-tutor browser flow.",
  },
  triangles_human_tutor: {
    id: "triangles_human_tutor",
    label: "triangles_human_tutor",
    command: "npm run test:triangles:human-tutor",
    severity: "P1",
    dimension: "education_product_correctness",
    description: "Validates the deterministic Triangles tutor runtime contract.",
  },
  canonical_generator: {
    id: "canonical_generator",
    label: "canonical_generator",
    command: "npm run test:canonical:generator",
    severity: "P1",
    dimension: "education_product_correctness",
    description: "Protects canonical-bank generation and question object health.",
  },
  prediction_bank_health: {
    id: "prediction_bank_health",
    label: "prediction_bank_health",
    command: "npm run test:prediction:bank-health",
    severity: "P1",
    dimension: "education_product_correctness",
    description: "Checks prediction/HPQ runtime source integrity.",
  },
  practice_weightage_mix: {
    id: "practice_weightage_mix",
    label: "practice_weightage_mix",
    command: "npm run test:practice:weightage-mix",
    severity: "P1",
    dimension: "education_product_correctness",
    description: "Checks practice mix and routing realism for student-facing sessions.",
  },
  mentor_runtime_smoke: {
    id: "mentor_runtime_smoke",
    label: "mentor_runtime_smoke",
    command: "npm run test:mentor:smoke",
    severity: "P0",
    dimension: "core_runtime_reliability",
    description: "Checks the mentor backend route, structured tutor response path, and safe stub-backed runtime contract.",
  },
};

const surfaceCheckMap = {
  topichub: ["browser_topichub"],
  practice: ["browser_practice", "practice_weightage_mix"],
  mentor: ["mentor_runtime_smoke", "browser_mentor"],
  triangles: ["browser_triangles", "triangles_human_tutor", "canonical_generator", "prediction_bank_health", "practice_weightage_mix"],
};

function parseArgs(argv = process.argv) {
  const modeFlag = argv.find((arg) => arg.startsWith("--mode="));
  const surfaceFlag = argv.find((arg) => arg.startsWith("--surface=") || arg.startsWith("--surfaces="));
  const laneFlag = argv.find((arg) => arg.startsWith("--lane="));
  const mode = (modeFlag ? modeFlag.split("=")[1] : "product").trim().toLowerCase();
  if (!supportedModes.has(mode)) {
    throw new Error(`Unsupported mode "${mode}". Expected one of: ${Array.from(supportedModes).join(", ")}`);
  }
  const lane = (laneFlag ? laneFlag.split("=")[1] : "auto").trim().toLowerCase();
  if (!supportedLanes.has(lane)) {
    throw new Error(`Unsupported lane "${lane}". Expected one of: ${Array.from(supportedLanes).join(", ")}`);
  }

  const surfaces = (surfaceFlag ? surfaceFlag.split("=")[1] : "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const unknown = surfaces.filter((surface) => !supportedSurfaces.has(surface));
  if (unknown.length > 0) {
    throw new Error(`Unsupported surface hint(s): ${unknown.join(", ")}`);
  }

  return {
    mode,
    lane,
    surfaces: Array.from(new Set(surfaces)),
    taskId: parseTaskIdArg(argv),
  };
}

function runShell(commandLine) {
  const startedAt = Date.now();
  const result = spawnSync(commandLine, {
    cwd: repoRoot,
    env: { ...process.env },
    shell: true,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40,
  });
  return {
    ok: (result.status ?? 1) === 0,
    code: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
    durationMs: Date.now() - startedAt,
  };
}

function commandWithTaskId(commandLine, taskId = "") {
  if (!taskId) return commandLine;
  if (/npm run test:browser:/i.test(commandLine)) {
    return `${commandLine} -- --task-id ${taskId}`;
  }
  return commandLine;
}

function listChangedFiles() {
  const collect = (command) =>
    runShell(command)
      .stdout.split(/\r?\n/)
      .map((line) => String(line || "").trim().replaceAll("\\", "/"))
      .filter(Boolean);
  return uniqueIds([
    ...collect("git diff --name-only --cached"),
    ...collect("git diff --name-only"),
    ...collect("git ls-files --others --exclude-standard"),
  ]);
}

let packageJsonScriptsOnlyChangeCache;
function packageJsonHasOnlyScriptChanges() {
  if (typeof packageJsonScriptsOnlyChangeCache === "boolean") {
    return packageJsonScriptsOnlyChangeCache;
  }
  try {
    const current = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
    const previous = JSON.parse(
      spawnSync("git", ["show", "HEAD:package.json"], {
        cwd: repoRoot,
        env: { ...process.env },
        encoding: "utf8",
      }).stdout || "{}"
    );
    const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(previous)]));
    const changedTopLevelKeys = keys.filter(
      (key) => JSON.stringify(current[key]) !== JSON.stringify(previous[key])
    );
    packageJsonScriptsOnlyChangeCache =
      changedTopLevelKeys.length > 0 && changedTopLevelKeys.every((key) => key === "scripts");
    return packageJsonScriptsOnlyChangeCache;
  } catch {
    packageJsonScriptsOnlyChangeCache = false;
    return packageJsonScriptsOnlyChangeCache;
  }
}

function looksProductFile(filePath) {
  const normalized = String(filePath || "").trim().replaceAll("\\", "/");
  if (normalized === "package.json" && packageJsonHasOnlyScriptChanges()) {
    return false;
  }
  return (
    normalized.startsWith("src/") ||
    normalized.startsWith("server/") ||
    normalized.startsWith("public/") ||
    normalized === "package.json"
  );
}

function resolveLaneContext(mode, lane) {
  if (lane === "product" || lane === "tooling") {
    return { laneContext: lane, source: "explicit_override" };
  }
  const changedFiles = listChangedFiles();
  if (changedFiles.some(looksProductFile)) {
    return { laneContext: "product", source: "changed_surface_detection" };
  }
  if (changedFiles.length > 0) {
    return { laneContext: "tooling", source: "changed_surface_detection" };
  }
  return {
    laneContext: mode === "product" || mode === "browser" || mode === "full" ? "product" : "tooling",
    source: "mode_fallback",
  };
}

function resolveCheckCommand(check, laneContext, taskId = "") {
  let command = check.command;
  if (check.id === "scope_guard") {
    command = laneContext === "product" ? "npm run scope:guard -- --mode product" : "npm run scope:guard";
  }
  return commandWithTaskId(command, taskId);
}

function uniqueIds(ids) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function baseCheckIdsForMode(mode, hasSurfaceHints) {
  if (mode === "fast") {
    return ["build", "lint_ci", "scope_guard"];
  }
  if (mode === "browser") {
    return hasSurfaceHints ? ["build"] : ["build", "browser_journeys"];
  }
  if (mode === "full") {
    return ["build", "lint_ci", "scope_guard", "repo_boundary", hasSurfaceHints ? "" : "browser_journeys", "mentor_runtime_smoke", "canonical_generator", "prediction_bank_health", "practice_weightage_mix", "triangles_human_tutor"];
  }
  return ["build", "lint_ci", "scope_guard", "repo_boundary", hasSurfaceHints ? "" : "browser_journeys", "mentor_runtime_smoke", "canonical_generator", "prediction_bank_health", "practice_weightage_mix"];
}

function resolveSelectedCheckIds(mode, surfaces) {
  const ids = [...baseCheckIdsForMode(mode, surfaces.length > 0)];
  for (const surface of surfaces) {
    ids.push(...(surfaceCheckMap[surface] || []));
  }
  return uniqueIds(ids);
}

function skippedCapabilities(mode, surfaces) {
  const skipped = [];
  skipped.push({
    id: "accessibility_automation",
    status: "PARTIAL",
    severity: "INFO",
    reason:
      "No dedicated accessibility engine such as axe is wired today. Current protection comes from browser journeys catching blocked navigation, missing critical CTAs, and obvious student-blocking UI failures.",
  });
  skipped.push({
    id: "performance_scale_readiness",
    status: "PARTIAL",
    severity: "INFO",
    reason:
      "No load-testing or performance-threshold harness exists today. Build duration and browser timeouts are visible, but 10k-student scale has not been stress-tested in automation.",
  });
  skipped.push({
    id: "mobile_native_testing",
    status: "FUTURE",
    severity: "INFO",
    reason:
      "This repo currently automates the web app only. No native mobile app runner or device lab integration exists yet.",
  });
  const mentorCovered = mode === "product" || mode === "full" || surfaces.includes("mentor");
  if (!mentorCovered) {
    skipped.push({
      id: "mentor_api_smoke",
      status: "SKIPPED",
      severity: "INFO",
      reason:
        "Mentor runtime smoke is only wired for product/full modes or explicit mentor surface runs. Outside those contexts, mentor is covered indirectly through browser journeys.",
    });
  }
  return skipped;
}

function dimensionCoverage() {
  return {
    alreadyCoveredNow: [
      "build/type/static safety via build + lint + scope guard",
      "repo/governance safety via repo boundary checks",
      "high-value browser journey safety for TopicHub, Practice, Mentor, board-readiness, and Triangles",
      "mentor backend/runtime smoke via a deterministic stub-backed /api/mentor contract check",
      "education-product correctness via canonical generator, prediction bank health, practice weightage, and Triangles tutor acceptance",
    ],
    partiallyCovered: [
      "accessibility-leaning safety through deterministic browser journey signals rather than a full accessibility engine",
      "performance/readiness via timeout visibility and smoke stability rather than formal load testing",
      "mentor runtime correctness beyond smoke level, including deeper semantic pedagogy quality and image-upload flow coverage",
    ],
    futureExtensionPoints: [
      "native mobile app QA when a mobile runtime exists",
      "load/performance regression automation for higher concurrency targets",
      "stronger accessibility automation and assistive-technology specific checks",
    ],
  };
}

function webNowMobileLaterScope() {
  return {
    webTestedToday: [
      "web build and static safety",
      "web browser journeys for major student flows",
      "web mentor backend/runtime smoke for a deterministic structured tutor case",
      "web chapter/runtime correctness checks for canonical, prediction, practice, and Triangles tutor flow",
    ],
    mobileFutureReady: [
      "mode and surface hint contract can be extended with mobile-specific suites later",
      "JSON report structure is reusable for future mobile test runners",
    ],
    outsideAutomation: [
      "native mobile UI/runtime behavior",
      "true scale/load testing",
      "formal accessibility certification or platform compliance testing",
    ],
  };
}

function summarizeFailures(failures) {
  return {
    p0: failures.filter((item) => item.severity === "P0").length,
    p1: failures.filter((item) => item.severity === "P1").length,
    p2: failures.filter((item) => item.severity === "P2").length,
  };
}

function sortBySeverity(items) {
  return [...items].sort((left, right) => {
    const severityCompare = (severityRank[left.severity] ?? 9) - (severityRank[right.severity] ?? 9);
    if (severityCompare !== 0) return severityCompare;
    return String(left.id || left.label || "").localeCompare(String(right.id || right.label || ""));
  });
}

async function main() {
  const { mode, lane, surfaces, taskId } = parseArgs();
  const { laneContext, source: laneContextSource } = resolveLaneContext(mode, lane);
  const selectedIds = resolveSelectedCheckIds(mode, surfaces);
  const selectedChecks = selectedIds.map((id) => checks[id]).filter(Boolean);
  if (selectedChecks.length === 0) {
    throw new Error(`No checks selected for mode=${mode}`);
  }

  const executed = [];
  for (const check of selectedChecks) {
    const command = resolveCheckCommand(check, laneContext, taskId);
    const res = runShell(command);
    executed.push({
      id: check.id,
      label: check.label,
      command,
      description: check.description,
      dimension: check.dimension,
      severity: check.severity,
      ok: res.ok,
      code: res.code,
      durationMs: res.durationMs,
      stdoutTail: res.stdout.split(/\r?\n/).filter(Boolean).slice(-10),
      stderrTail: res.stderr.split(/\r?\n/).filter(Boolean).slice(-10),
    });
  }

  const failures = sortBySeverity(executed.filter((item) => !item.ok));
  const skipped = skippedCapabilities(mode, surfaces);
  const severity = summarizeFailures(failures);
  const verdict = failures.length === 0 ? "PASS" : "FAIL";

  const report = {
    generatedAt: new Date().toISOString(),
    taskId: taskId || null,
    bot: {
      id: "software_testing_bot",
      kind: "technical_runtime_orchestrator",
      mode,
      laneContext,
      laneContextSource,
      surfaces,
    },
    summary: {
      verdict,
      totalChecks: executed.length,
      passedChecks: executed.length - failures.length,
      failedChecks: failures.length,
      skippedItems: skipped.length,
      ...severity,
    },
    executedChecks: executed,
    failedChecks: failures,
    skippedChecks: skipped,
    dimensions: dimensionCoverage(),
    webNowMobileLater: webNowMobileLaterScope(),
    mandatoryCompanionLoop: [
      "npm run test:software-bot",
      "npm run test:persona-gate",
      "npm run test:persona-browser-gate",
      "npm run test:browser:mentor (or another relevant targeted browser journey)",
    ],
    notes: [
      "This bot complements persona gates and browser persona gates. It does not replace them.",
      "Scope guard now resolves from changed-surface lane detection by default, with --lane=product|tooling as an explicit override.",
      "Generated JSON reports remain local-only under .project_memory/ops/out.",
    ],
  };

  const fileName = `software_testing_bot_${mode}.json`;
  const { primaryPath } = await writeTaskScopedJsonReport(fileName, report, taskId);
  console.log(
    `software_testing_bot mode=${mode} checks=${report.summary.totalChecks} failed=${report.summary.failedChecks} skipped=${report.summary.skippedItems} p0=${report.summary.p0} p1=${report.summary.p1} p2=${report.summary.p2}`
  );
  console.log(`report=${path.relative(repoRoot, primaryPath).replaceAll("\\", "/")}`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (error) => {
    const taskId = parseTaskIdArg(process.argv);
    const payload = {
      generatedAt: new Date().toISOString(),
      taskId: taskId || null,
      error: String(error?.stack || error),
    };
    await writeTaskScopedJsonReport("software_testing_bot_error.json", payload, taskId);
    console.error(String(error?.stack || error));
    process.exitCode = 1;
  });
}
