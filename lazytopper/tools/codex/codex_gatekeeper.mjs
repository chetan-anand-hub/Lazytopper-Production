import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  defaultTaskManifest,
  ensureTaskEvidenceDirs,
  getTaskEvidencePaths,
  normalizeRepoPath,
  parseTaskIdArg,
  readTaskManifest,
  taskIdFromTaskName,
  updateTaskManifest,
  writeTaskScopedJsonReport,
} from "./task_evidence_utils.mjs";
import {
  collectGovernedChangedFiles,
  findLatestMatchingTestRun,
  findLatestReviewPacket,
  packetHasRequiredSections,
  parseMarkdownSections,
  readJsonIfExists,
  repoRoot,
  resolveReviewPacket,
} from "./review_packet_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const matrixPath = path.join(__dirname, "test_matrix.json");
const testRunsDir = path.join(repoRoot, "docs", "project_memory", "test_runs");

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function parseArgs(argv = process.argv) {
  return {
    taskId: parseTaskIdArg(argv),
  };
}

function runCommand(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env },
    shell: options.shell ?? false,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 40,
  });
  return {
    ok: (result.status ?? 1) === 0,
    code: result.status ?? 1,
    stdout: String(result.stdout || ""),
    stderr: String(result.stderr || ""),
  };
}

function commandWithTaskId(commandLine, taskId = "") {
  if (!taskId) return commandLine;
  if (/npm run (test:persona-gate|test:student-bots|test:tutor-bots|test:persona-browser-gate|test:browser:[^\s]+|test:review-packet:semantic|test:gatekeeper:v3|review:packet:v3)\b/i.test(commandLine)) {
    return `${commandLine} -- --task-id ${taskId}`;
  }
  if (/node (tools\/codex\/validate_review_packet_semantics\.mjs|tools\/codex\/generate_review_packet\.mjs|scripts\/ops\/browser_persona_gate_auditor\.mjs|scripts\/ops\/persona_gate_auditor\.mjs|scripts\/ops\/browser_journeys\/run_browser_journeys\.mjs)\b/i.test(commandLine)) {
    return `${commandLine} --task-id ${taskId}`;
  }
  return commandLine;
}

function runShell(commandLine) {
  return runCommand(commandLine, [], { shell: true });
}

function testExecutionPriority(test) {
  const command = String(test?.command || "");
  if (/test:persona-browser-gate/i.test(command)) return 40;
  if (/test:review-packet:semantic/i.test(command)) return 35;
  if (/test:browser:/i.test(command)) return 30;
  return 10;
}

function matchesRule(file, match) {
  const normalized = String(file || "").replaceAll("\\", "/");
  const prefixes = Array.isArray(match?.prefixes) ? match.prefixes : [];
  if (prefixes.some((prefix) => normalized.startsWith(prefix))) return true;
  const contains = Array.isArray(match?.contains) ? match.contains : [];
  if (contains.some((token) => normalized.includes(token))) return true;
  const suffixes = Array.isArray(match?.suffixes) ? match.suffixes : [];
  if (suffixes.some((suffix) => normalized.endsWith(suffix))) return true;
  return false;
}

async function fileExists(maybePath) {
  if (!maybePath) return false;
  try {
    await fs.access(path.isAbsolute(maybePath) ? maybePath : path.join(repoRoot, maybePath));
    return true;
  } catch {
    return false;
  }
}

function parseVerifyOutput(stdout) {
  const lines = stdout.split(/\r?\n/);
  const findValue = (label) => {
    const line = lines.find((entry) => entry.startsWith(`${label}: `));
    return line ? line.slice(label.length + 2).trim() : "";
  };
  return {
    logPath: findValue("LOG_PATH"),
    summaryPath: findValue("SUMMARY_PATH"),
    finalStatus: findValue("FINAL_STATUS"),
  };
}

async function findTaskManualQa(taskId = "") {
  if (!taskId) return null;
  const taskPaths = getTaskEvidencePaths(taskId);
  if (await fileExists(taskPaths.manualQaPath)) {
    return { absPath: taskPaths.manualQaPath, name: path.basename(taskPaths.manualQaPath) };
  }
  return null;
}

async function findLatestManualQa() {
  try {
    const entries = await fs.readdir(testRunsDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile() || !/_manualQA\.md$/i.test(entry.name)) continue;
      const absPath = path.join(testRunsDir, entry.name);
      const stats = await fs.stat(absPath);
      files.push({ absPath, name: entry.name, mtimeMs: stats.mtimeMs });
    }
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return files[0] || null;
  } catch {
    return null;
  }
}

function extractAssumptionsAndRisks(packetText = "") {
  const sections = parseMarkdownSections(packetText);
  const assumptions = String(sections.get("assumptions") || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
  const knownRisks = String(sections.get("known risks") || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
  return { assumptions, knownRisks };
}

async function main() {
  const args = parseArgs();
  const taskId = args.taskId || "";
  if (taskId) {
    await ensureTaskEvidenceDirs(taskId);
  }

  const matrix = JSON.parse(await fs.readFile(matrixPath, "utf8"));
  const changedFiles = await collectGovernedChangedFiles();
  const matchedRules = matrix.rules
    .map((rule) => ({
      ...rule,
      changedFiles: changedFiles.filter((file) => matchesRule(file, rule.match)),
    }))
    .filter((rule) => rule.changedFiles.length > 0);

  const tests = [];
  const dedupe = new Set();
  for (const rule of matchedRules) {
    for (const test of rule.tests || []) {
      const key = `${test.command}::${test.expectedReport || ""}`;
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      tests.push({ ...test, fromRule: rule.id });
    }
  }
  tests.sort((a, b) => testExecutionPriority(a) - testExecutionPriority(b));

  const reviewPacketRequired =
    changedFiles.length >= Number(matrix.always?.substantialTaskMinChangedFiles || 5) ||
    matchedRules.some((rule) => rule.proof?.reviewPacketRequired);
  const manualQaRequired = matchedRules.some((rule) => rule.proof?.manualQaRequired);
  const browserJourneysRequired = tests.some((test) => /test:browser:/i.test(test.command));
  const browserPersonaRequired = tests.some((test) => /test:persona-browser-gate/i.test(test.command));
  const evidenceMode = taskId ? "task-scoped" : "fallback";

  if (taskId) {
    await updateTaskManifest(taskId, {
      ...defaultTaskManifest(taskId),
      changedFiles,
        expectedTests: [
          {
            label: "codex_verify_fast",
            command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ops/codex_testing/codex_verify.ps1 -TaskName gatekeeper-fast -Suite fast${
              taskId ? ` -TaskId ${taskId}` : ""
            }`,
          },
          ...tests.map((test) => ({ label: test.label, command: commandWithTaskId(test.command, taskId) })),
        ],
      });
    }

  const verifyTaskName = taskId ? `${taskId}-gatekeeper-fast` : "gatekeeper-fast";
    const verifyRes = runCommand("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/ops/codex_testing/codex_verify.ps1",
      "-TaskName",
      verifyTaskName,
      "-Suite",
      "fast",
      ...(taskId ? ["-TaskId", taskId] : []),
    ]);
  const verifyMeta = parseVerifyOutput(verifyRes.stdout);

  const executedTests = [];
    for (const test of tests) {
      const command = commandWithTaskId(test.command, taskId);
      const res = runShell(command);
      const usedTaskScopedCommand = command !== test.command;
      const outputPresent = test.expectedReport
        ? await fileExists(taskId && usedTaskScopedCommand && test.expectedReport.startsWith(".project_memory/ops/out/")
            ? test.expectedReport.replace(".project_memory/ops/out/", `.project_memory/ops/out/${taskId}/`)
            : test.expectedReport)
        : true;
    executedTests.push({
      label: test.label,
      command,
      severity: test.severity || "targeted",
      fromRule: test.fromRule,
      ok: res.ok,
      code: res.code,
      expectedReport: test.expectedReport || null,
      outputPresent,
      stdoutTail: res.stdout.split(/\r?\n/).slice(-12),
      stderrTail: res.stderr.split(/\r?\n/).slice(-12),
    });
  }

  const latestManualQa = taskId ? await findTaskManualQa(taskId) : await findLatestManualQa();
  const reviewPacketEntry = taskId ? await resolveReviewPacket(taskId) : await findLatestReviewPacket();
  const reviewPacketText = reviewPacketEntry ? await fs.readFile(reviewPacketEntry.absPath, "utf8") : "";
  const reviewPacketSectionsOk = reviewPacketEntry ? packetHasRequiredSections(reviewPacketText, reviewPacketRequired) : false;
  const semanticCommand = taskId
    ? [process.execPath, ["tools/codex/validate_review_packet_semantics.mjs", "--task-id", taskId]]
    : [process.execPath, ["tools/codex/validate_review_packet_semantics.mjs"]];
  const semanticValidationResult =
    reviewPacketEntry && reviewPacketRequired
      ? runCommand(semanticCommand[0], semanticCommand[1])
      : null;
  const semanticValidationReport = taskId
    ? await readJsonIfExists(`.project_memory/ops/out/${taskId}/review_packet_semantic_validation.json`)
    : await readJsonIfExists(".project_memory/ops/out/review_packet_semantic_validation.json");

  const personaGateSummary = taskId
    ? (await readJsonIfExists(`.project_memory/ops/out/${taskId}/persona_gate_audit.json`))?.summary || null
    : (await readJsonIfExists(".project_memory/ops/out/persona_gate_audit.json"))?.summary || null;
  const browserJourneySummary = taskId
    ? (await readJsonIfExists(`.project_memory/ops/out/${taskId}/browser_journey_gate_audit.json`))?.summary || null
    : (await readJsonIfExists(".project_memory/ops/out/browser_journey_gate_audit.json"))?.summary || null;
  const browserPersonaSummary = taskId
    ? (await readJsonIfExists(`.project_memory/ops/out/${taskId}/browser_persona_gate_audit.json`))?.summary || null
    : (await readJsonIfExists(".project_memory/ops/out/browser_persona_gate_audit.json"))?.summary || null;

  const proof = {
    verify: {
      ok: verifyRes.ok && verifyMeta.finalStatus === "PASS" && Boolean(verifyMeta.summaryPath),
      logPath: verifyMeta.logPath || null,
      summaryPath: verifyMeta.summaryPath || null,
      finalStatus: verifyMeta.finalStatus || null,
    },
    manualQa: {
      required: manualQaRequired,
      ok: manualQaRequired ? Boolean(latestManualQa) : true,
      path: latestManualQa?.absPath || null,
    },
    reviewPacket: {
      required: reviewPacketRequired,
      ok: reviewPacketRequired ? Boolean(reviewPacketEntry && reviewPacketSectionsOk) : true,
      path: reviewPacketEntry?.absPath || null,
      sectionsOk: reviewPacketSectionsOk,
      semanticOk:
        reviewPacketRequired && semanticValidationReport
          ? semanticValidationReport.summary?.verdict === "PASS"
          : !reviewPacketRequired,
      semanticReport:
        reviewPacketRequired && semanticValidationReport
          ? taskId
            ? path.join(repoRoot, ".project_memory", "ops", "out", taskId, "review_packet_semantic_validation.json")
            : path.join(repoRoot, ".project_memory", "ops", "out", "review_packet_semantic_validation.json")
          : null,
    },
  };

  const failedTargetedTests = executedTests.filter((test) => !test.ok || !test.outputPresent);
  const severeRegression = Boolean(
    (personaGateSummary && Number(personaGateSummary.p0 || 0) > 0) ||
      (browserPersonaSummary && Number(browserPersonaSummary.p0 || 0) > 0)
  );

  let verdict = "ACCEPT";
  const reasons = [];
  if (!proof.verify.ok) {
    verdict = "REJECT";
    reasons.push("Core codex_verify fast failed.");
  } else if (severeRegression) {
    verdict = "REJECT";
    reasons.push("Persona gate reported P0 failures.");
  } else if (
    failedTargetedTests.length > 0 ||
    !proof.manualQa.ok ||
    !proof.reviewPacket.ok ||
    !proof.reviewPacket.semanticOk ||
    (browserJourneysRequired && !browserJourneySummary) ||
    (browserPersonaRequired && !browserPersonaSummary) ||
    (taskId && !reviewPacketEntry && reviewPacketRequired)
  ) {
    verdict = "REVISE";
    if (failedTargetedTests.length > 0) reasons.push("One or more required targeted checks failed or did not emit expected outputs.");
    if (!proof.manualQa.ok) reasons.push("Required manual QA note is missing.");
    if (!proof.reviewPacket.ok) reasons.push("Required review packet is missing or incomplete.");
    if (!proof.reviewPacket.semanticOk) reasons.push("Review packet semantic validation failed.");
    if (browserJourneysRequired && !browserJourneySummary) reasons.push("Required browser journey summary is missing.");
    if (browserPersonaRequired && !browserPersonaSummary) reasons.push("Required browser persona summary is missing.");
    if (taskId && !reviewPacketEntry && reviewPacketRequired) reasons.push("Task-scoped review packet is missing.");
  } else {
    reasons.push("All mandatory core and targeted checks passed, and required proof artifacts are present.");
  }

  const { assumptions, knownRisks } = extractAssumptionsAndRisks(reviewPacketText);
  if (taskId) {
    await updateTaskManifest(taskId, {
      changedFiles,
        executedTests: [
          {
            label: "codex_verify_fast",
            command: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/ops/codex_testing/codex_verify.ps1 -TaskName ${verifyTaskName} -Suite fast${
              taskId ? ` -TaskId ${taskId}` : ""
            }`,
            ok: proof.verify.ok,
          },
        ...executedTests,
      ],
      proofArtifacts: {
        codexVerifyLog: normalizeRepoPath(proof.verify.logPath || ""),
        codexVerifySummary: normalizeRepoPath(proof.verify.summaryPath || ""),
        codexVerifyStatus: proof.verify.finalStatus || "UNKNOWN",
        reviewPacket: normalizeRepoPath(proof.reviewPacket.path || ""),
        reviewPacketSemantic: normalizeRepoPath(proof.reviewPacket.semanticReport || ""),
        manualQa: normalizeRepoPath(proof.manualQa.path || ""),
        browserJourneyAudit: browserJourneysRequired ? `.project_memory/ops/out/${taskId}/browser_journey_gate_audit.json` : "",
        browserPersonaAudit: browserPersonaRequired ? `.project_memory/ops/out/${taskId}/browser_persona_gate_audit.json` : "",
        personaGateAudit: `.project_memory/ops/out/${taskId}/persona_gate_audit.json`,
      },
      reviewPacketPath: normalizeRepoPath(proof.reviewPacket.path || ""),
      manualQaPath: normalizeRepoPath(proof.manualQa.path || ""),
      gatekeeperVerdict: verdict,
      gatekeeperReasons: reasons,
      assumptions,
      residualRisks: knownRisks,
    });
  }

  const stamp = nowStamp();
  const gatekeeperReport = {
    generatedAt: new Date().toISOString(),
    taskId: taskId || null,
    evidenceMode,
    evidenceBundle: taskId
      ? {
          manifestPath: getTaskEvidencePaths(taskId).manifestPath,
          taskRunDir: getTaskEvidencePaths(taskId).taskRunDir,
          opsTaskOutDir: getTaskEvidencePaths(taskId).opsTaskOutDir,
          reviewPacketPath: getTaskEvidencePaths(taskId).reviewPacketMdPath,
        }
      : null,
    changedFiles,
    matchedRules: matchedRules.map((rule) => ({ id: rule.id, changedFiles: rule.changedFiles })),
    verify: proof.verify,
    tests: executedTests,
    proof,
    personaGateSummary,
    browserJourneySummary,
    browserPersonaSummary,
    decision: {
      verdict,
      reasons,
    },
  };

  const mdLines = [
    "# Codex Gatekeeper",
    "",
    `- Verdict: **${verdict}**`,
    `- Mode: ${evidenceMode}`,
    `- Task id: ${taskId || "fallback"}`,
    `- Generated: ${gatekeeperReport.generatedAt}`,
    "",
    "## Evidence bundle",
  ];
  if (taskId) {
    mdLines.push(`- Manifest: ${getTaskEvidencePaths(taskId).manifestPath}`);
    mdLines.push(`- Task run dir: ${getTaskEvidencePaths(taskId).taskRunDir}`);
    mdLines.push(`- Task ops out dir: ${getTaskEvidencePaths(taskId).opsTaskOutDir}`);
    mdLines.push(`- Review packet: ${proof.reviewPacket.path || "missing"}`);
  } else {
    mdLines.push("- Fallback mode: using latest matching artifacts because no --task-id was provided.");
  }
  mdLines.push("", "## Changed files", ...changedFiles.map((file) => `- ${file}`), "", "## Matched rules", ...matchedRules.map((rule) => `- ${rule.id}: ${rule.changedFiles.join(", ")}`), "", "## Core verify", `- Final status: ${proof.verify.finalStatus || "UNKNOWN"}`, `- Summary path: ${proof.verify.summaryPath || "missing"}`, `- Log path: ${proof.verify.logPath || "missing"}`, "", "## Targeted tests", ...executedTests.map((test) => `- ${test.label}: ${test.ok && test.outputPresent ? "PASS" : "FAIL"} via ${test.command}`), "", "## Proof", `- Manual QA path: ${proof.manualQa.path || "missing"}`, `- Review packet path: ${proof.reviewPacket.path || "missing"}`, `- Review packet sections OK: ${proof.reviewPacket.sectionsOk}`, `- Review packet semantic OK: ${proof.reviewPacket.semanticOk}`, `- Review packet semantic report: ${proof.reviewPacket.semanticReport || "missing"}`, `- Browser journey summary: ${browserJourneySummary ? JSON.stringify(browserJourneySummary) : "missing"}`, `- Browser persona summary: ${browserPersonaSummary ? JSON.stringify(browserPersonaSummary) : "missing"}`, "", "## Decision", ...reasons.map((reason) => `- ${reason}`));

  let jsonPath;
  let mdPath;
  if (taskId) {
    jsonPath = path.join(getTaskEvidencePaths(taskId).taskRunDir, `${taskId}_codex-gatekeeper.json`);
    mdPath = path.join(getTaskEvidencePaths(taskId).taskRunDir, `${taskId}_codex-gatekeeper.md`);
    await ensureTaskEvidenceDirs(taskId);
  } else {
    jsonPath = path.join(testRunsDir, `${stamp}_codex-gatekeeper.json`);
    mdPath = path.join(testRunsDir, `${stamp}_codex-gatekeeper.md`);
  }

  await fs.writeFile(jsonPath, JSON.stringify(gatekeeperReport, null, 2), "utf8");
  await fs.writeFile(mdPath, mdLines.join("\n"), "utf8");

  console.log(`GATEKEEPER_DECISION: ${verdict}`);
  console.log(`GATEKEEPER_MD: ${mdPath}`);
  console.log(`GATEKEEPER_JSON: ${jsonPath}`);

  if (verdict !== "ACCEPT") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (error) => {
    const taskId = parseTaskIdArg(process.argv) || taskIdFromTaskName("gatekeeper-error");
    await ensureTaskEvidenceDirs(taskId);
    const errorPath = path.join(getTaskEvidencePaths(taskId).taskRunDir, `${taskId}_codex-gatekeeper.json`);
    await fs.writeFile(
      errorPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          taskId,
          error: String(error?.stack || error),
        },
        null,
        2
      ),
      "utf8"
    );
    console.error(String(error?.stack || error));
    process.exitCode = 1;
  });
}
