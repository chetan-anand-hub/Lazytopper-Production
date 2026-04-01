import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultTaskManifest,
  ensureTaskEvidenceDirs,
  getTaskEvidencePaths,
  normalizeRepoPath,
  parseTaskIdArg,
  readTaskManifest,
  writeTaskManifest,
  writeTaskScopedTextFile,
} from "./task_evidence_utils.mjs";
import { collectGovernedChangedFiles } from "./review_packet_utils.mjs";

async function pathExists(maybePath) {
  try {
    await fs.access(maybePath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(absPath) {
  try {
    const raw = await fs.readFile(absPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function mergeExecutedTests(existing = [], incoming = []) {
  const byKey = new Map();
  for (const item of [...existing, ...incoming]) {
    const key = `${item?.label || ""}::${item?.command || ""}`;
    byKey.set(key, item);
  }
  return Array.from(byKey.values());
}

function parseArgs(argv = process.argv) {
  const getFlag = (name) => {
    const equalsFlag = argv.find((arg) => arg.startsWith(`${name}=`));
    if (equalsFlag) return equalsFlag.slice(name.length + 1).trim();
    const index = argv.indexOf(name);
    return index !== -1 ? String(argv[index + 1] || "").trim() : "";
  };
  const collectMulti = (name) =>
    argv
      .flatMap((arg, index) => {
        if (arg === name) return [String(argv[index + 1] || "").trim()];
        if (arg.startsWith(`${name}=`)) return [arg.slice(name.length + 1).trim()];
        return [];
      })
      .filter(Boolean);

  return {
    taskId: parseTaskIdArg(argv),
    title: getFlag("--title"),
    summary: getFlag("--summary"),
    assumptions: collectMulti("--assumption"),
    risks: collectMulti("--risk"),
  };
}

function rationaleForPath(filePath) {
  const file = normalizeRepoPath(filePath);
  if (file.includes("tools/codex/codex_gatekeeper.mjs")) {
    return "Task-scoped gate resolution, manifest-driven proof lookup, and V3 approval decisions live here.";
  }
  if (file.includes("tools/codex/validate_review_packet_semantics.mjs")) {
    return "Evidence-linked packet truth checks and reviewer-readiness scoring live here.";
  }
  if (file.includes("tools/codex/review_packet_utils.mjs") || file.includes("tools/codex/task_evidence_utils.mjs")) {
    return "Shared task-bundle lookup and manifest path resolution live here.";
  }
  if (file.includes("tools/codex/generate_review_packet.mjs")) {
    return "Review packets are generated from manifest-backed task evidence here.";
  }
  if (file.includes("scripts/ops/browser_journeys/")) {
    return "Scenario-aware browser journey execution and task-scoped evidence output live here.";
  }
  if (file.includes("scripts/ops/browser_persona_gate_auditor.mjs")) {
    return "Browser-backed persona mapping and scenario-aware acceptance aggregation live here.";
  }
  if (file.includes("scripts/ops/persona_gate_auditor.mjs") || file.includes("scripts/ops/persona_bot_lib.mjs")) {
    return "Static persona execution and task-scoped report writing live here.";
  }
  if (file.includes("scripts/ops/student_bots/advanced_value_seeking_student_bot.mjs")) {
    return "The high-agency student value check is implemented here.";
  }
  if (file.includes("package.json")) {
    return "V3 wrapper scripts and task-id entrypoints are wired here.";
  }
  if (file.includes("docs/project_memory/review_packets/README.md")) {
    return "Reviewer workflow documentation for task-scoped evidence and V3 semantics lives here.";
  }
  if (file.includes("src/")) {
    return "Additive browser-test hooks or deterministic surface signals are exposed here for V3 coverage.";
  }
  return "Touched by this task; inspect alongside the task manifest and proof reports.";
}

function stringifyTests(executedTests = [], expectedTests = []) {
  const testLines = [];
  for (const test of executedTests) {
    testLines.push(`- \`${test.command}\``);
  }
  if (testLines.length === 0) {
    for (const test of expectedTests) {
      if (typeof test === "string") {
        testLines.push(`- \`${test}\``);
      } else if (test?.command) {
        testLines.push(`- \`${test.command}\``);
      }
    }
  }
  return testLines.length > 0 ? testLines : ["- Review packet generated before test execution; update after running the task proof chain."];
}

function summarizePassFail(manifest) {
  const executed = Array.isArray(manifest.executedTests) ? manifest.executedTests : [];
  const labelMap = {
    codex_verify_fast: "codex verify",
    persona_gate: "persona gate",
    browser_journeys: "browser journey",
    browser_persona_gate: "browser persona",
    review_packet_semantic: "review packet semantic validation",
  };
  const lines = [];
  const verify = manifest.proofArtifacts?.codexVerifySummary;
  if (verify) {
    lines.push(`- \`codex_verify\`: ${manifest.proofArtifacts?.codexVerifyStatus || "UNKNOWN"}`);
  }
  const grouped = new Map();
  for (const test of executed) {
    const rawLabel = String(test.label || test.command || `test-${grouped.size + 1}`);
    grouped.set(labelMap[rawLabel] || rawLabel.replaceAll("_", " "), test.ok ? "PASS" : "FAIL");
  }
  for (const [label, verdict] of grouped.entries()) {
    lines.push(`- \`${label}\`: ${verdict}`);
  }
  if (lines.length === 0) {
    lines.push("- Test execution pending for this task bundle.");
  }
  return lines;
}

async function collectTaskScopedEvidence(taskId, paths, existing) {
  const proofArtifacts = { ...(existing.proofArtifacts || {}) };
  const executedTests = Array.isArray(existing.executedTests) ? [...existing.executedTests] : [];

  const verifySummaryPath = path.join(paths.taskRunDir, `${taskId}_verify_summary.md`);
  const verifyLogPath = path.join(paths.taskRunDir, `${taskId}_verify.log`);
  if (await pathExists(verifySummaryPath)) {
    const verifySummary = await fs.readFile(verifySummaryPath, "utf8");
    const verifyOk = /Final Status:\s*\*\*PASS\*\*/i.test(verifySummary);
    proofArtifacts.codexVerifySummary = normalizeRepoPath(verifySummaryPath);
    proofArtifacts.codexVerifyStatus = verifyOk ? "PASS" : "FAIL";
    if (await pathExists(verifyLogPath)) {
      proofArtifacts.codexVerifyLog = normalizeRepoPath(verifyLogPath);
    }
    executedTests.push({
      label: "codex_verify_fast",
      command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ops/codex_testing/codex_verify.ps1 -TaskName ${taskId} -Suite fast -TaskId ${taskId}`,
      ok: verifyOk,
    });
  }

  const reportSpecs = [
    {
      fileName: "persona_gate_audit.json",
      label: "persona_gate",
      command: `npm run test:persona-gate -- --task-id ${taskId}`,
      ok: (json) => Number(json?.summary?.failedBots || 0) === 0,
      proofKey: "personaGateReport",
    },
    {
      fileName: "browser_journey_gate_audit.json",
      label: "browser_journeys",
      command: `npm run test:browser:journeys -- --task-id ${taskId}`,
      ok: (json) => Number(json?.summary?.failedJourneys || 0) === 0,
      proofKey: "browserJourneyReport",
    },
    {
      fileName: "browser_persona_gate_audit.json",
      label: "browser_persona_gate",
      command: `npm run test:persona-browser-gate -- --task-id ${taskId}`,
      ok: (json) => Number(json?.summary?.failedBots || 0) === 0,
      proofKey: "browserPersonaReport",
    },
    {
      fileName: "review_packet_semantic_validation.json",
      label: "review_packet_semantic",
      command: `npm run test:review-packet:semantic -- --task-id ${taskId}`,
      ok: (json) => String(json?.summary?.verdict || "").toUpperCase() === "PASS",
      proofKey: "semanticValidationReport",
    },
  ];

  for (const spec of reportSpecs) {
    const absPath = path.join(paths.opsTaskOutDir, spec.fileName);
    const json = await readJsonIfExists(absPath);
    if (!json) continue;
    proofArtifacts[spec.proofKey] = normalizeRepoPath(absPath);
    executedTests.push({
      label: spec.label,
      command: spec.command,
      ok: spec.ok(json),
      reportPath: normalizeRepoPath(absPath),
    });
  }

  if (await pathExists(paths.manualQaPath)) {
    proofArtifacts.manualQa = normalizeRepoPath(paths.manualQaPath);
  }

  return {
    proofArtifacts,
    executedTests: mergeExecutedTests(existing.executedTests || [], executedTests),
  };
}

async function main() {
  const args = parseArgs();
  if (!args.taskId) {
    throw new Error("generate_review_packet requires --task-id <task-id>.");
  }

  await ensureTaskEvidenceDirs(args.taskId);
  const paths = getTaskEvidencePaths(args.taskId);
  const existing = (await readTaskManifest(args.taskId)) || defaultTaskManifest(args.taskId);
  const changedFiles = existing.changedFiles?.length ? existing.changedFiles : await collectGovernedChangedFiles();
  const harvested = await collectTaskScopedEvidence(args.taskId, paths, existing);
  const manifestState = {
    ...existing,
    changedFiles,
    executedTests: harvested.executedTests,
    proofArtifacts: harvested.proofArtifacts,
  };

  const assumptions = args.assumptions.length > 0 ? args.assumptions : manifestState.assumptions;
  const risks = args.risks.length > 0 ? args.risks : manifestState.residualRisks;
  const summary =
    args.summary ||
    `Task-scoped Quality Gate V3 upgrade for ${args.taskId}: manifest-driven approval, scenario-aware browser evidence, and stronger packet truth validation.`;

  const changedFileLines = changedFiles.map((file) => `- \`${file}\`: ${rationaleForPath(file)}`);
  const testsRunLines = stringifyTests(manifestState.executedTests, manifestState.expectedTests);
  const passFailLines = summarizePassFail(manifestState);
  const assumptionLines =
    assumptions.length > 0
      ? assumptions.map((item) => `- ${item}`)
      : ["- Task-scoped evidence is the primary approval path; fallback latest-artifact mode remains only for backward compatibility."];
  const riskLines =
    risks.length > 0
      ? risks.map((item) => `- ${item}`)
      : ["- Visual polish and nuanced pedagogy still require human review after the deterministic V3 gate passes."];

  const md = [
    "## Task id",
    args.taskId,
    "",
    "## Evidence bundle",
    `- Manifest: \`${normalizeRepoPath(paths.manifestPath)}\``,
    `- Task test bundle: \`${normalizeRepoPath(paths.taskRunDir)}\``,
    `- Task ops outputs: \`${normalizeRepoPath(paths.opsTaskOutDir)}\``,
    "",
    "## Reviewer entry point",
    `Open the manifest first, then inspect the gatekeeper report and the task-scoped browser/persona/semantic JSON outputs inside \`${normalizeRepoPath(paths.opsTaskOutDir)}\`. Use this review packet as the human-readable index, not as the source-of-truth by itself.`,
    "",
    "## Task summary",
    summary,
    "",
    "## Changed files",
    ...changedFileLines,
    "",
    "## Tests run",
    ...testsRunLines,
    "",
    "## Pass/fail",
    ...passFailLines,
    "",
    "## Manual QA path",
    `- \`${normalizeRepoPath(manifestState.manualQaPath || paths.manualQaPath)}\``,
    "",
    "## Assumptions",
    ...assumptionLines,
    "",
    "## Known risks",
    ...riskLines,
    "",
    "## Reviewer checklist",
    "- Verify the manifest task id, changed files, and proof artifact paths all refer to the same task bundle.",
    "- Review the task-scoped browser journey and browser persona JSON reports before trusting the pass/fail summary.",
    "- Confirm the semantic review validator agrees with the packet claims and marks the packet reviewer-ready.",
    "- Treat ZIP exports, if any are mentioned elsewhere, as secondary fallback review material only.",
  ].join("\n");

  const json = {
    generatedAt: new Date().toISOString(),
    taskId: args.taskId,
    summary,
    changedFiles,
    testsRun: manifestState.executedTests || [],
    passFail: passFailLines,
    manualQaPath: normalizeRepoPath(manifestState.manualQaPath || paths.manualQaPath),
    assumptions: assumptionLines.map((line) => line.replace(/^- /, "")),
    knownRisks: riskLines.map((line) => line.replace(/^- /, "")),
    reviewerEntryPoint: `Manifest -> gatekeeper -> task-scoped browser/persona/semantic reports in ${normalizeRepoPath(paths.opsTaskOutDir)}`,
  };

  await writeTaskScopedTextFile(paths.reviewPacketMdPath, md);
  await writeTaskScopedTextFile(paths.reviewPacketJsonPath, JSON.stringify(json, null, 2));
  await writeTaskManifest(args.taskId, {
    ...manifestState,
    taskId: args.taskId,
    changedFiles,
    executedTests: manifestState.executedTests,
    proofArtifacts: manifestState.proofArtifacts,
    assumptions: json.assumptions,
    residualRisks: json.knownRisks,
    reviewPacketPath: normalizeRepoPath(paths.reviewPacketMdPath),
    reviewPacketJsonPath: normalizeRepoPath(paths.reviewPacketJsonPath),
    manualQaPath: normalizeRepoPath(manifestState.manualQaPath || paths.manualQaPath),
  });

  console.log(`REVIEW_PACKET_MD: ${paths.reviewPacketMdPath}`);
  console.log(`REVIEW_PACKET_JSON: ${paths.reviewPacketJsonPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(String(error?.stack || error));
    process.exitCode = 1;
  });
}
