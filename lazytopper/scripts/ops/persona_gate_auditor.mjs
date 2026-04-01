import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  currentTaskId,
  outDir,
  readJsonOutput,
  repoRoot,
  runNodeScript,
} from "./persona_bot_lib.mjs";
import { writeTaskScopedJsonReport } from "../../tools/codex/task_evidence_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const studentBots = [
  {
    id: "anxious_student",
    script: "scripts/ops/student_bots/anxious_student_bot.mjs",
    report: "student_anxious_acceptance.json",
  },
  {
    id: "weak_foundation_student",
    script: "scripts/ops/student_bots/weak_foundation_student_bot.mjs",
    report: "student_weak_foundation_acceptance.json",
  },
  {
    id: "boards_focused_student",
    script: "scripts/ops/student_bots/boards_focused_student_bot.mjs",
    report: "student_boards_focused_acceptance.json",
  },
  {
    id: "fast_revision_student",
    script: "scripts/ops/student_bots/fast_revision_student_bot.mjs",
    report: "student_fast_revision_acceptance.json",
  },
  {
    id: "doubt_heavy_student",
    script: "scripts/ops/student_bots/doubt_heavy_student_bot.mjs",
    report: "student_doubt_heavy_acceptance.json",
  },
  {
    id: "advanced_value_seeking_student",
    script: "scripts/ops/student_bots/advanced_value_seeking_student_bot.mjs",
    report: "student_advanced_value_seeking_acceptance.json",
  },
];

const tutorBots = [
  {
    id: "master_teacher_bot",
    script: "scripts/ops/tutor_bots/master_teacher_bot.mjs",
    report: "master_teacher_acceptance.json",
  },
  {
    id: "copy_checker_bot",
    script: "scripts/ops/tutor_bots/copy_checker_bot.mjs",
    report: "copy_checker_acceptance.json",
  },
  {
    id: "board_examiner_bot",
    script: "scripts/ops/tutor_bots/board_examiner_bot.mjs",
    report: "board_examiner_acceptance.json",
  },
  {
    id: "kind_mentor_bot",
    script: "scripts/ops/tutor_bots/kind_mentor_bot.mjs",
    report: "kind_mentor_acceptance.json",
  },
  {
    id: "curriculum_nep_bot",
    script: "scripts/ops/tutor_bots/curriculum_nep_bot.mjs",
    report: "curriculum_nep_acceptance.json",
  },
];

function parseMode() {
  const flag = process.argv.find((arg) => arg.startsWith("--mode="));
  const mode = flag ? flag.split("=")[1] : "all";
  if (mode === "student" || mode === "tutor" || mode === "all") return mode;
  return "all";
}

function outFileNameForMode(mode) {
  if (mode === "student") return "student_bot_gate_audit.json";
  if (mode === "tutor") return "tutor_bot_gate_audit.json";
  return "persona_gate_audit.json";
}

function summarizeSeverity(failures) {
  return {
    p0: failures.filter((item) => item.severity === "P0").length,
    p1: failures.filter((item) => item.severity === "P1").length,
    p2: failures.filter((item) => item.severity === "P2").length,
  };
}

async function main() {
  const mode = parseMode();
  const taskId = currentTaskId();
  const selectedBots = mode === "student" ? studentBots : mode === "tutor" ? tutorBots : [...studentBots, ...tutorBots];

  const runs = [];
  const botReports = [];
  for (const bot of selectedBots) {
    const args = taskId ? ["--task-id", taskId] : [];
    const res = runNodeScript(bot.script, args);
    runs.push({ id: bot.id, script: bot.script, ok: res.ok, code: res.code });
    try {
      const report = await readJsonOutput(bot.report, taskId);
      botReports.push(report);
    } catch (error) {
      botReports.push({
        bot: { id: bot.id, type: mode === "student" ? "student" : mode === "tutor" ? "tutor" : "persona" },
        summary: { total: 0, passed: 0, failed: 1, verdict: "FAIL", severities: { P0: 1, P1: 0, P2: 0 } },
        checks: [
          {
            name: "report_missing",
            ok: false,
            severity: "P0",
            details: String(error?.message || error),
            remediation: "Ensure the persona bot writes its JSON output.",
          },
        ],
      });
    }
  }

  const failures = [];
  for (const report of botReports) {
    for (const check of report.checks || []) {
      if (check.ok) continue;
      failures.push({
        botId: report.bot?.id || "unknown",
        botType: report.bot?.type || "unknown",
        name: check.name,
        severity: check.severity || "P2",
        details: check.details || "",
        remediation: check.remediation || "",
      });
    }
  }

  failures.sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2 };
    const left = rank[a.severity] ?? 9;
    const right = rank[b.severity] ?? 9;
    if (left !== right) return left - right;
    return `${a.botId}:${a.name}`.localeCompare(`${b.botId}:${b.name}`);
  });

  const severity = summarizeSeverity(failures);
  const summary = {
    mode,
    botsRun: selectedBots.length,
    passedBots: botReports.filter((report) => report.summary?.verdict === "PASS").length,
    failedBots: botReports.filter((report) => report.summary?.verdict !== "PASS").length,
    totalFailures: failures.length,
    ...severity,
  };

  await fs.mkdir(outDir, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    taskId: taskId || null,
    mode,
    runs,
    summary,
    bots: botReports.map((item) => ({
      id: item.bot?.id,
      type: item.bot?.type,
      verdict: item.summary?.verdict,
      failed: item.summary?.failed,
      severities: item.summary?.severities,
    })),
    failures,
  };
  const { primaryPath } = await writeTaskScopedJsonReport(outFileNameForMode(mode), report, taskId);
  const outPath = primaryPath;

  console.log(`persona_gate_auditor mode=${mode} bots=${summary.botsRun} failed=${summary.failedBots} p0=${summary.p0} p1=${summary.p1} p2=${summary.p2}`);
  console.log(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, outFileNameForMode(parseMode()));
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
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
