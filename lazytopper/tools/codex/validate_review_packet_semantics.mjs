import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureTaskEvidenceDirs,
  getTaskEvidencePaths,
  parseTaskIdArg,
  readTaskManifest,
  writeTaskScopedJsonReport,
} from "./task_evidence_utils.mjs";
import {
  collectGovernedChangedFiles,
  containsPlaceholderText,
  extractPathishTokens,
  findLatestMatchingTestRun,
  normalizePacketPath,
  packetHasRequiredSections,
  parseMarkdownSections,
  readJsonIfExists,
  repoRoot,
  resolveReviewPacket,
} from "./review_packet_utils.mjs";

function makeCheck(name, ok, details, severity = "P2") {
  return { name, ok: Boolean(ok), details: String(details || ""), severity };
}

function parseArgs(argv = process.argv) {
  const fileFlagIndex = argv.indexOf("--file");
  const packetPath = fileFlagIndex !== -1 ? argv[fileFlagIndex + 1] : "";
  return {
    taskId: parseTaskIdArg(argv),
    packetPath: packetPath ? path.resolve(packetPath) : "",
  };
}

function meaningfulLength(text) {
  return String(text || "").replace(/[`*_>#-]/g, " ").replace(/\s+/g, " ").trim().length;
}

function sectionLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function scoreFromChecks(checks) {
  if (!checks.length) return 0;
  const passed = checks.filter((check) => check.ok).length;
  return Math.round((passed / checks.length) * 100);
}

function verdictFromScores({ failedP0, failedP1, truthfulnessScore, reviewerReadinessScore }) {
  if (failedP0 > 0) return "MISALIGNED";
  if (failedP1 > 1 || truthfulnessScore < 70) return "FAIL";
  if (truthfulnessScore < 85 || reviewerReadinessScore < 80) return "WEAK";
  return "PASS";
}

async function pathExists(maybePath) {
  try {
    await fs.access(path.isAbsolute(maybePath) ? maybePath : path.join(repoRoot, maybePath));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs();
  if (args.taskId) {
    await ensureTaskEvidenceDirs(args.taskId);
  }

  const manifest = args.taskId ? await readTaskManifest(args.taskId) : null;
  const packetEntry =
    args.packetPath
      ? { absPath: args.packetPath, name: path.basename(args.packetPath) }
      : await resolveReviewPacket(args.taskId);

  if (!packetEntry) {
    throw new Error("No review packet found to validate.");
  }

  const text = await fs.readFile(packetEntry.absPath, "utf8");
  const sections = parseMarkdownSections(text);
  const packetTaskId = sections.get("task id") || "";
  const taskId = args.taskId || packetTaskId || "";
  const taskManifest = taskId ? manifest || (await readTaskManifest(taskId)) : null;
  const changedFiles =
    taskManifest?.changedFiles?.length > 0 ? taskManifest.changedFiles : await collectGovernedChangedFiles();
  const substantialTask = changedFiles.length >= 5;

  const reviewerEntryPoint = sections.get("reviewer entry point") || "";
  const taskSummary = sections.get("task summary") || "";
  const changedFilesSection = sections.get("changed files") || "";
  const testsRun = sections.get("tests run") || "";
  const passFail = sections.get("pass/fail") || "";
  const manualQa = sections.get("manual qa path") || "";
  const assumptions = sections.get("assumptions") || "";
  const knownRisks = sections.get("known risks") || "";
  const reviewerChecklist = sections.get("reviewer checklist") || "";

  const mentionedPaths = extractPathishTokens(changedFilesSection).map(normalizePacketPath);
  const matchedChangedFiles = mentionedPaths.filter((packetPath) =>
    changedFiles.some((changedFile) => {
      const normalizedChangedFile = normalizePacketPath(changedFile);
      return (
        normalizedChangedFile === packetPath ||
        normalizedChangedFile.endsWith(`/${packetPath}`) ||
        packetPath.endsWith(`/${normalizedChangedFile}`)
      );
    })
  );

  const rationaleLines = sectionLines(changedFilesSection).filter((line) => {
    if (!/[:\-]/.test(line)) return false;
    if (extractPathishTokens(line).length === 0) return false;
    return meaningfulLength(line) >= 30;
  });

  const reviewerChecklistLines = sectionLines(reviewerChecklist).filter((line) => /^-\s+/i.test(line));
  const actionableChecklistLines = reviewerChecklistLines.filter((line) => /(confirm|verify|check|review|inspect|compare)/i.test(line));
  const testCommandLines = sectionLines(testsRun).filter((line) => /(npm run|node |powershell )/i.test(line));

  const latestVerifySummary = await findLatestMatchingTestRun(/_summary\.md$/i);
  const latestVerifyText = latestVerifySummary ? await fs.readFile(latestVerifySummary.absPath, "utf8") : "";
  const latestVerifyPassed = /FINAL_STATUS:\s*PASS|Result:\s*PASS|PASS/i.test(latestVerifyText);

  const proofArtifacts = taskManifest?.proofArtifacts || {};
  const executedTests = Array.isArray(taskManifest?.executedTests) ? taskManifest.executedTests : [];
  const browserJourneyAudit = taskId
    ? await readJsonIfExists(`.project_memory/ops/out/${taskId}/browser_journey_gate_audit.json`)
    : await readJsonIfExists(".project_memory/ops/out/browser_journey_gate_audit.json");
  const personaGateAudit = taskId
    ? await readJsonIfExists(`.project_memory/ops/out/${taskId}/persona_gate_audit.json`)
    : await readJsonIfExists(".project_memory/ops/out/persona_gate_audit.json");
  const browserPersonaAudit = taskId
    ? await readJsonIfExists(`.project_memory/ops/out/${taskId}/browser_persona_gate_audit.json`)
    : await readJsonIfExists(".project_memory/ops/out/browser_persona_gate_audit.json");

  const checks = [];
  checks.push(
    makeCheck(
      "required_sections_present",
      packetHasRequiredSections(text, substantialTask),
      "Review packet must contain the required reviewer sections.",
      "P0"
    )
  );
  checks.push(
    makeCheck(
      "task_id_matches_manifest",
      !taskId || (meaningfulLength(packetTaskId) > 0 && packetTaskId === taskManifest?.taskId),
      "Packet task id should match the task manifest when task-scoped mode is used.",
      "P0"
    )
  );
  checks.push(
    makeCheck(
      "task_summary_is_meaningful",
      meaningfulLength(taskSummary) >= 40 && !containsPlaceholderText(taskSummary),
      "Task summary must be non-empty, specific, and non-placeholder.",
      "P1"
    )
  );
  checks.push(
    makeCheck(
      "changed_files_align_with_manifest",
      matchedChangedFiles.length >= Math.min(3, Math.max(1, changedFiles.length)),
      `Packet should reference real changed files from the manifest/worktree. Matched ${matchedChangedFiles.length} of ${changedFiles.length}.`,
      "P1"
    )
  );
  checks.push(
    makeCheck(
      "major_file_rationale_present",
      rationaleLines.length >= Math.min(3, Math.max(1, matchedChangedFiles.length)),
      "Changed-files section should explain why key files matter, not only list names.",
      "P1"
    )
  );

  const manifestCommands = executedTests.map((test) => String(test?.command || "").trim()).filter(Boolean);
  const mentionedCommands = testCommandLines.map((line) => line.replace(/^-+\s*/, ""));
  const commandMatches = manifestCommands.filter((command) =>
    mentionedCommands.some((line) => line.includes(command))
  );
  checks.push(
    makeCheck(
      "tests_run_align_with_manifest",
      manifestCommands.length === 0 || commandMatches.length >= Math.min(3, manifestCommands.length),
      `Packet tests should align with manifest executed tests. Matched ${commandMatches.length} of ${manifestCommands.length}.`,
      "P1"
    )
  );

  const passFailChecks = [];
  if (proofArtifacts.codexVerifySummary || latestVerifySummary) {
    passFailChecks.push(latestVerifyPassed ? /codex_verify/i.test(passFail) && /PASS/i.test(passFail) : /FAIL/i.test(passFail));
  }
  if (browserJourneyAudit?.summary) {
    const browserPassed = Number(browserJourneyAudit.summary.failedJourneys || 0) === 0;
    passFailChecks.push(browserPassed ? /browser journey/i.test(passFail) && /PASS/i.test(passFail) : /browser journey/i.test(passFail) && /FAIL/i.test(passFail));
  }
  if (personaGateAudit?.summary) {
    const personaPassed = Number(personaGateAudit.summary.failedBots || 0) === 0;
    passFailChecks.push(personaPassed ? /persona gate/i.test(passFail) && /PASS/i.test(passFail) : /persona gate/i.test(passFail) && /FAIL/i.test(passFail));
  }
  if (browserPersonaAudit?.summary) {
    const browserPersonaPassed = Number(browserPersonaAudit.summary.failedBots || 0) === 0;
    passFailChecks.push(browserPersonaPassed ? /browser persona/i.test(passFail) && /PASS/i.test(passFail) : /browser persona/i.test(passFail) && /FAIL/i.test(passFail));
  }
  checks.push(
    makeCheck(
      "pass_fail_aligns_with_artifacts",
      passFailChecks.length > 0 ? passFailChecks.every(Boolean) : meaningfulLength(passFail) >= 20,
      "Pass/fail section should align with actual task-scoped reports.",
      "P1"
    )
  );

  const manualQaPaths = extractPathishTokens(manualQa);
  const expectedManualQa = taskManifest?.manualQaPath || "";
  const manualQaMatchesTask = !taskId || manualQaPaths.some((entry) => normalizePacketPath(entry) === normalizePacketPath(expectedManualQa));
  const manualQaExists = manualQaPaths.length > 0 ? await Promise.all(manualQaPaths.map((entry) => pathExists(entry))) : [];
  checks.push(
    makeCheck(
      "manual_qa_path_exists_and_matches_task",
      !substantialTask || (manualQaMatchesTask && manualQaExists.some(Boolean)),
      "Manual QA path should exist and belong to the same task bundle when required.",
      "P1"
    )
  );

  const absentClaims = [];
  if (/browser journey/i.test(passFail) && !browserJourneyAudit?.summary) absentClaims.push("browser journey");
  if (/browser persona/i.test(passFail) && !browserPersonaAudit?.summary) absentClaims.push("browser persona");
  if (/persona gate/i.test(passFail) && !personaGateAudit?.summary) absentClaims.push("persona gate");
  checks.push(
    makeCheck(
      "packet_does_not_claim_absent_checks",
      absentClaims.length === 0,
      absentClaims.length === 0
        ? "Packet claims only checks that exist in task evidence."
        : `Packet claims missing checks: ${absentClaims.join(", ")}.`,
      "P0"
    )
  );

  checks.push(
    makeCheck(
      "assumptions_are_task_specific",
      meaningfulLength(assumptions) >= 25 && !containsPlaceholderText(assumptions),
      "Assumptions should be task-specific and non-placeholder.",
      "P2"
    )
  );
  checks.push(
    makeCheck(
      "known_risks_are_task_specific",
      meaningfulLength(knownRisks) >= 30 && !containsPlaceholderText(knownRisks),
      "Known risks should be concrete for the current task.",
      "P2"
    )
  );
  checks.push(
    makeCheck(
      "reviewer_checklist_is_actionable",
      actionableChecklistLines.length >= 3,
      "Reviewer checklist should contain at least three actionable review steps.",
      "P2"
    )
  );
  checks.push(
    makeCheck(
      "reviewer_entry_point_is_concrete",
      meaningfulLength(reviewerEntryPoint) >= 30 && /manifest|gatekeeper|report/i.test(reviewerEntryPoint),
      "Reviewer entry point should point reviewers to concrete evidence paths.",
      "P1"
    )
  );
  checks.push(
    makeCheck(
      "no_placeholder_text",
      !containsPlaceholderText(text),
      "Packet should not ship with placeholder text.",
      "P1"
    )
  );

  const evidenceCompletenessChecks = [
    Boolean(taskManifest?.taskId || !taskId),
    Boolean(taskManifest?.changedFiles?.length || changedFiles.length),
    Boolean((taskManifest?.expectedTests || []).length || executedTests.length),
    Boolean((taskManifest?.manualQaPath && await pathExists(taskManifest.manualQaPath)) || manualQaExists.some(Boolean) || !substantialTask),
    Boolean(taskManifest?.reviewPacketPath || packetEntry.absPath),
    Boolean(browserJourneyAudit?.summary || !/browser journey/i.test(passFail)),
  ];
  const evidenceCompletenessScore = Math.round((evidenceCompletenessChecks.filter(Boolean).length / evidenceCompletenessChecks.length) * 100);
  const packetTruthfulnessScore = scoreFromChecks(
    checks.filter((check) =>
      [
        "task_id_matches_manifest",
        "changed_files_align_with_manifest",
        "tests_run_align_with_manifest",
        "pass_fail_aligns_with_artifacts",
        "packet_does_not_claim_absent_checks",
      ].includes(check.name)
    )
  );
  const reviewerReadinessScore = Math.round(
    (evidenceCompletenessScore +
      packetTruthfulnessScore +
      scoreFromChecks(
        checks.filter((check) =>
          [
            "task_summary_is_meaningful",
            "major_file_rationale_present",
            "manual_qa_path_exists_and_matches_task",
            "reviewer_checklist_is_actionable",
            "reviewer_entry_point_is_concrete",
          ].includes(check.name)
        )
      )) /
      3
  );

  const failedChecks = checks.filter((check) => !check.ok);
  const verdict = verdictFromScores({
    failedP0: failedChecks.filter((check) => check.severity === "P0").length,
    failedP1: failedChecks.filter((check) => check.severity === "P1").length,
    truthfulnessScore: packetTruthfulnessScore,
    reviewerReadinessScore,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    taskId: taskId || null,
    mode: taskId ? "task-scoped" : "fallback",
    packetPath: packetEntry.absPath,
    manifestPath: taskId ? getTaskEvidencePaths(taskId).manifestPath : null,
    changedFiles,
    summary: {
      verdict,
      substantialTask,
      totalChecks: checks.length,
      failedChecks: failedChecks.length,
      p0: failedChecks.filter((check) => check.severity === "P0").length,
      p1: failedChecks.filter((check) => check.severity === "P1").length,
      p2: failedChecks.filter((check) => check.severity === "P2").length,
      evidenceCompletenessScore,
      packetTruthfulnessScore,
      reviewerReadinessScore,
    },
    checks,
  };

  const fileName = "review_packet_semantic_validation.json";
  const { primaryPath } = await writeTaskScopedJsonReport(fileName, report, taskId);

  console.log(`review_packet_semantic_validation: ${verdict}`);
  console.log(`report=${primaryPath.replaceAll("\\", "/")}`);

  if (verdict !== "PASS") {
    process.exitCode = 1;
  }
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(async (error) => {
    const taskId = parseTaskIdArg(process.argv);
    const payload = {
      generatedAt: new Date().toISOString(),
      taskId: taskId || null,
      error: String(error?.stack || error),
    };
    await writeTaskScopedJsonReport("review_packet_semantic_validation.json", payload, taskId);
    console.error(String(error?.stack || error));
    process.exitCode = 1;
  });
}
