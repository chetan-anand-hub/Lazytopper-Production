import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { currentTaskId, outDir, repoRoot, runNodeScript } from "./persona_bot_lib.mjs";
import { writeTaskScopedJsonReport } from "../../tools/codex/task_evidence_utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browserPersonaRules = [
  {
    id: "anxious_student",
    type: "student",
    requirements: [
      {
        journeyId: "topichub_guided_entry_journey",
        scenarioId: "new-student-trigonometry",
        name: "guided_entry_feels_clear",
        severity: "P1",
        remediation: "Keep the TopicHub guided entry flow clear and low-confusion.",
      },
      {
        journeyId: "practice_help_escalation_journey",
        scenarioId: "weak-student-practice",
        name: "practice_help_is_easy_to_reach",
        severity: "P1",
        remediation: "Keep mentor escalation reachable from question-level practice.",
      },
      {
        journeyId: "mentor_kindness_and_recovery_journey",
        scenarioId: "new-student-mentor-recovery",
        name: "mentor_recovery_is_kind",
        severity: "P0",
        remediation: "Keep fallback mentor guidance constructive and easy to retry.",
      },
    ],
  },
  {
    id: "weak_foundation_student",
    type: "student",
    requirements: [
      {
        journeyId: "topichub_guided_entry_journey",
        scenarioId: "new-student-trigonometry",
        name: "start_surface_guides_the_chapter",
        severity: "P1",
        remediation: "Show a clear chapter entry path before complex choices.",
      },
      {
        journeyId: "triangles_human_tutor_browser_journey",
        scenarioId: "weak-student-triangles",
        name: "triangles_shows_honest_guidance",
        severity: "P1",
        remediation: "Keep Triangles progression visible without overstating maturity.",
      },
    ],
  },
  {
    id: "boards_focused_student",
    type: "student",
    requirements: [
      {
        journeyId: "board_readiness_journey",
        scenarioId: "revision-mode-board-readiness",
        name: "board_cues_are_discoverable",
        severity: "P0",
        remediation: "Keep board-steps and CBSE checking visible from practice.",
      },
      {
        journeyId: "practice_help_escalation_journey",
        scenarioId: "returning-student-practice",
        name: "question_help_preserves_exam_context",
        severity: "P1",
        remediation: "Preserve the why-panel and mentor context when escalating for help.",
      },
    ],
  },
  {
    id: "doubt_heavy_student",
    type: "student",
    requirements: [
      {
        journeyId: "mentor_kindness_and_recovery_journey",
        scenarioId: "doubt-heavy-mentor-recovery",
        name: "mentor_help_is_safe_to_retry",
        severity: "P0",
        remediation: "Keep mentor fallback and retry controls gentle and obvious.",
      },
      {
        journeyId: "practice_help_escalation_journey",
        scenarioId: "weak-student-practice",
        name: "question_help_is_one_click_away",
        severity: "P1",
        remediation: "Avoid burying help actions behind multiple confusing steps.",
      },
    ],
  },
  {
    id: "advanced_value_seeking_student",
    type: "student",
    requirements: [
      {
        journeyId: "topichub_guided_entry_journey",
        scenarioId: "advanced-trigonometry",
        name: "advanced_entry_still_shows_depth",
        severity: "P1",
        remediation: "Keep visible depth and mastery cues for strong students on chapter entry.",
      },
      {
        journeyId: "board_readiness_journey",
        scenarioId: "advanced-board-readiness",
        name: "advanced_board_flow_keeps_reasoning_depth",
        severity: "P0",
        remediation: "Do not reduce advanced board practice to shallow answer-checking only.",
      },
      {
        journeyId: "triangles_human_tutor_browser_journey",
        scenarioId: "advanced-triangles",
        name: "advanced_student_sees_honest_but_useful_triangles_path",
        severity: "P1",
        remediation: "Keep Triangles honest while still surfacing worthwhile depth cues.",
      },
    ],
  },
  {
    id: "master_teacher_bot",
    type: "tutor",
    requirements: [
      {
        journeyId: "topichub_guided_entry_journey",
        scenarioId: "new-student-trigonometry",
        name: "chapter_entry_has_teaching_order",
        severity: "P1",
        remediation: "Retain a coherent Learn -> Grind -> Practice study flow.",
      },
      {
        journeyId: "triangles_human_tutor_browser_journey",
        scenarioId: "weak-student-triangles",
        name: "triangles_path_is_honest_and_guided",
        severity: "P1",
        remediation: "Keep chapter maturity honest while preserving progression cues.",
      },
      {
        journeyId: "board_readiness_journey",
        scenarioId: "revision-mode-board-readiness",
        name: "board_readiness_is_visible",
        severity: "P1",
        remediation: "Keep exam-writing cues discoverable inside the chapter journey.",
      },
    ],
  },
  {
    id: "kind_mentor_bot",
    type: "tutor",
    requirements: [
      {
        journeyId: "mentor_kindness_and_recovery_journey",
        scenarioId: "doubt-heavy-mentor-recovery",
        name: "mentor_tone_and_recovery_are_kind",
        severity: "P0",
        remediation: "Keep mentor fallback messaging constructive and non-shaming.",
      },
    ],
  },
];

function requiredJourneyIds() {
  return Array.from(
    new Set(
      browserPersonaRules.flatMap((bot) =>
        bot.requirements.map((requirement) => String(requirement.journeyId || "").trim()).filter(Boolean)
      )
    )
  );
}

async function readJourneyReport(journeyId, scenarioId, taskId = "") {
  const scopedDir = taskId ? path.join(outDir, taskId) : outDir;
  const fileName = scenarioId ? `browser_${journeyId}__${scenarioId}.json` : `browser_${journeyId}.json`;
  const absPath = path.join(scopedDir, fileName);
  const raw = await fs.readFile(absPath, "utf8");
  return JSON.parse(raw);
}

function requiredJourneyRefs() {
  return Array.from(
    new Set(
      browserPersonaRules.flatMap((bot) =>
        bot.requirements.map((requirement) => `${requirement.journeyId}::${requirement.scenarioId || ""}`)
      )
    )
  ).map((ref) => {
    const [journeyId, scenarioId] = ref.split("::");
    return { journeyId, scenarioId: scenarioId || "" };
  });
}

async function loadJourneyReports(taskId = "") {
  const journeyRefs = requiredJourneyRefs();
  const reportsById = new Map();
  const missingJourneyIds = new Set();

  for (const ref of journeyRefs) {
    try {
      reportsById.set(`${ref.journeyId}::${ref.scenarioId}`, await readJourneyReport(ref.journeyId, ref.scenarioId, taskId));
    } catch {
      missingJourneyIds.add(ref.journeyId);
    }
  }

  if (missingJourneyIds.size > 0) {
    const res = runNodeScript("scripts/ops/browser_journeys/run_browser_journeys.mjs", [
      `--journeys=${Array.from(missingJourneyIds).join(",")}`,
      ...(taskId ? ["--task-id", taskId] : []),
    ]);
    if (!res.ok) {
      throw new Error(`Browser journeys failed before persona mapping: ${res.stderr || res.stdout}`);
    }
    for (const ref of journeyRefs) {
      reportsById.set(`${ref.journeyId}::${ref.scenarioId}`, await readJourneyReport(ref.journeyId, ref.scenarioId, taskId));
    }
  }

  return reportsById;
}

async function main() {
  const taskId = currentTaskId();
  const reportsById = await loadJourneyReports(taskId);

  const bots = [];
  const failures = [];

  for (const bot of browserPersonaRules) {
    const checks = [];
    for (const requirement of bot.requirements) {
      const report = reportsById.get(`${requirement.journeyId}::${requirement.scenarioId || ""}`);
      const ok = report?.verdict === "PASS";
      const failedNames = (report?.checks || []).filter((check) => !check.ok).map((check) => check.name);
      checks.push({
        name: requirement.name,
        ok,
        severity: requirement.severity,
        details: ok
          ? `${requirement.journeyId}/${requirement.scenarioId} passed.`
          : `${requirement.journeyId}/${requirement.scenarioId} failed${failedNames.length ? ` (${failedNames.join(", ")})` : ""}.`,
        remediation: requirement.remediation,
      });
      if (!ok) {
        failures.push({
          botId: bot.id,
          botType: bot.type,
          name: requirement.name,
          severity: requirement.severity,
          details: checks[checks.length - 1].details,
          remediation: requirement.remediation,
        });
      }
    }

    const failedChecks = checks.filter((check) => !check.ok);
    bots.push({
      id: bot.id,
      type: bot.type,
      verdict: failedChecks.length === 0 ? "PASS" : "FAIL",
      failed: failedChecks.length,
      severities: {
        P0: failedChecks.filter((check) => check.severity === "P0").length,
        P1: failedChecks.filter((check) => check.severity === "P1").length,
        P2: failedChecks.filter((check) => check.severity === "P2").length,
      },
      checks,
    });
  }

  failures.sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2 };
    const left = rank[a.severity] ?? 9;
    const right = rank[b.severity] ?? 9;
    if (left !== right) return left - right;
    return `${a.botId}:${a.name}`.localeCompare(`${b.botId}:${b.name}`);
  });

  const summary = {
    taskId: taskId || null,
    botsRun: bots.length,
    passedBots: bots.filter((bot) => bot.verdict === "PASS").length,
    failedBots: bots.filter((bot) => bot.verdict !== "PASS").length,
    p0: failures.filter((item) => item.severity === "P0").length,
    p1: failures.filter((item) => item.severity === "P1").length,
    p2: failures.filter((item) => item.severity === "P2").length,
  };

  await fs.mkdir(outDir, { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    taskId: taskId || null,
    summary,
    bots,
    failures,
  };
  const { primaryPath: outPath } = await writeTaskScopedJsonReport("browser_persona_gate_audit.json", payload, taskId);

  console.log(`browser_persona_gate bots=${summary.botsRun} failed=${summary.failedBots} p0=${summary.p0} p1=${summary.p1} p2=${summary.p2}`);
  console.log(`report=${path.relative(repoRoot, outPath).replaceAll("\\", "/")}`);

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (error) => {
    const taskId = currentTaskId();
    const payload = {
      generatedAt: new Date().toISOString(),
      taskId: taskId || null,
      error: String(error?.stack || error),
    };
    await writeTaskScopedJsonReport("browser_persona_gate_audit.json", payload, taskId);
    console.error(String(error?.stack || error));
    process.exitCode = 1;
  });
}
