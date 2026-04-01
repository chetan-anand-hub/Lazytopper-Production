import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  currentBrowserTaskId,
  ensureOutDir,
  launchJourneyBrowser,
  startJourneyStack,
  stopJourneyStack,
  writeJourneyReport,
} from "./browser_journey_lib.mjs";
import { writeTaskScopedJsonReport } from "../../../tools/codex/task_evidence_utils.mjs";
import { journey as topichubGuidedEntryJourney } from "./journeys/topichub_guided_entry_journey.mjs";
import { journey as practiceHelpEscalationJourney } from "./journeys/practice_help_escalation_journey.mjs";
import { journey as mentorKindnessJourney } from "./journeys/mentor_kindness_and_recovery_journey.mjs";
import { journey as boardReadinessJourney } from "./journeys/board_readiness_journey.mjs";
import { journey as trianglesHumanTutorJourney } from "./journeys/triangles_human_tutor_browser_journey.mjs";

const journeys = [
  topichubGuidedEntryJourney,
  practiceHelpEscalationJourney,
  mentorKindnessJourney,
  boardReadinessJourney,
  trianglesHumanTutorJourney,
];
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioMatrixPath = path.join(__dirname, "scenario_matrix.json");

function shouldRestartJourney(error) {
  const text = String(error?.stack || error || "");
  return /ERR_CONNECTION_REFUSED|Target page, context or browser has been closed|Browser has been closed/i.test(text);
}

function parseRequestedJourneyIds() {
  const flag = process.argv.find((arg) => arg.startsWith("--journeys="));
  if (!flag) return journeys.map((journey) => journey.id);
  const ids = flag
    .slice("--journeys=".length)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : journeys.map((journey) => journey.id);
}

async function loadScenarioMatrix() {
  const raw = await fs.readFile(scenarioMatrixPath, "utf8");
  const parsed = JSON.parse(raw);
  return parsed?.journeys || {};
}

async function main() {
  const taskId = currentBrowserTaskId();
  const requestedIds = new Set(parseRequestedJourneyIds());
  const scenarioMatrix = await loadScenarioMatrix();
  const selectedJourneys = journeys.filter((journey) => requestedIds.has(journey.id));
  if (selectedJourneys.length === 0) {
    throw new Error(`No browser journeys matched: ${Array.from(requestedIds).join(", ")}`);
  }
  const selectedJourneyScenarios = selectedJourneys.flatMap((journey) => {
    const scenarios = Array.isArray(scenarioMatrix[journey.id]) ? scenarioMatrix[journey.id] : [];
    const normalizedScenarios =
      scenarios.length > 0
        ? scenarios
        : [{ scenarioId: `${journey.id}-default`, studentState: "default", startingPath: null, expectations: {} }];
    return normalizedScenarios.map((scenario) => ({ journey, scenario }));
  });

  await ensureOutDir();
  let runtime = await startJourneyStack();
  let browser = await launchJourneyBrowser();
  const results = [];

  const restartRuntime = async () => {
    try {
      await browser.close();
    } catch {
      // best effort only
    }
    await stopJourneyStack(runtime);
    runtime = await startJourneyStack();
    browser = await launchJourneyBrowser();
  };

  try {
    for (const selection of selectedJourneyScenarios) {
      const { journey, scenario } = selection;
      const startedAt = Date.now();
      let attempt = 0;
      let completed = false;
      while (!completed && attempt < 2) {
        try {
          const runResult = await journey.run({
            browser,
            baseUrl: runtime.baseUrl,
            apiBaseUrl: runtime.apiBaseUrl,
            scenario,
            taskId,
          });
          const { report, outPath } = await writeJourneyReport({
            id: journey.id,
            area: journey.area,
            title: journey.title,
            startUrl: runResult.startUrl,
            checks: runResult.checks,
            taskId,
            scenarioId: scenario.scenarioId,
            studentState: scenario.studentState,
            artifacts: runResult.artifacts || [],
            meta: {
              durationMs: Date.now() - startedAt,
              attempts: attempt + 1,
              scenario,
              ...(runResult.meta || {}),
            },
          });
          results.push({ id: journey.id, area: journey.area, scenarioId: scenario.scenarioId, studentState: scenario.studentState, outPath, report });
          completed = true;
        } catch (error) {
          if (attempt === 0 && shouldRestartJourney(error)) {
            attempt += 1;
            await restartRuntime();
            continue;
          }
          const { report, outPath } = await writeJourneyReport({
            id: journey.id,
            area: journey.area,
            title: journey.title,
            startUrl: runtime.baseUrl,
            taskId,
            scenarioId: scenario.scenarioId,
            studentState: scenario.studentState,
            checks: [
              {
                name: "journey_runtime_failure",
                ok: false,
                details: String(error?.stack || error),
                severity: "P0",
              },
            ],
            meta: {
              durationMs: Date.now() - startedAt,
              attempts: attempt + 1,
              scenario,
            },
          });
          results.push({ id: journey.id, area: journey.area, scenarioId: scenario.scenarioId, studentState: scenario.studentState, outPath, report });
          completed = true;
        }
      }
    }
  } finally {
    await browser.close();
    await stopJourneyStack(runtime);
  }

  const failedJourneys = results.filter((item) => item.report.verdict !== "PASS");
  const summary = {
    totalJourneys: results.length,
    passedJourneys: results.length - failedJourneys.length,
    failedJourneys: failedJourneys.length,
    p0: results.reduce((sum, item) => sum + Number(item.report.summary?.p0 || 0), 0),
    p1: results.reduce((sum, item) => sum + Number(item.report.summary?.p1 || 0), 0),
    p2: results.reduce((sum, item) => sum + Number(item.report.summary?.p2 || 0), 0),
  };

  const perJourneyGroups = new Map();
  for (const item of results) {
    if (!perJourneyGroups.has(item.id)) perJourneyGroups.set(item.id, []);
    perJourneyGroups.get(item.id).push(item);
  }

  for (const [journeyId, items] of perJourneyGroups.entries()) {
    const failed = items.filter((item) => item.report.verdict !== "PASS");
    const rollup = {
      generatedAt: new Date().toISOString(),
      taskId: taskId || null,
      id: journeyId,
      verdict: failed.length === 0 ? "PASS" : "FAIL",
      scenarios: items.map((item) => ({
        scenarioId: item.scenarioId,
        studentState: item.studentState,
        verdict: item.report.verdict,
        reportPath: item.outPath,
        summary: item.report.summary,
      })),
      summary: {
        totalScenarios: items.length,
        passedScenarios: items.length - failed.length,
        failedScenarios: failed.length,
        p0: items.reduce((sum, item) => sum + Number(item.report.summary?.p0 || 0), 0),
        p1: items.reduce((sum, item) => sum + Number(item.report.summary?.p1 || 0), 0),
        p2: items.reduce((sum, item) => sum + Number(item.report.summary?.p2 || 0), 0),
      },
    };
    await writeTaskScopedJsonReport(`browser_${journeyId}.json`, rollup, taskId);
  }

  const aggregate = {
    generatedAt: new Date().toISOString(),
    taskId: taskId || null,
    selectedJourneyIds: selectedJourneys.map((journey) => journey.id),
    selectedScenarioIds: results.map((item) => item.scenarioId),
    summary,
    journeys: results.map((item) => ({
      id: item.id,
      scenarioId: item.scenarioId,
      studentState: item.studentState,
      area: item.area,
      verdict: item.report.verdict,
      reportPath: item.outPath,
      summary: item.report.summary,
    })),
  };

  const { primaryPath: aggregatePath } = await writeTaskScopedJsonReport("browser_journey_gate_audit.json", aggregate, taskId);

  console.log(
    `browser_journeys total=${summary.totalJourneys} failed=${summary.failedJourneys} p0=${summary.p0} p1=${summary.p1} p2=${summary.p2}`
  );
  console.log(`report=${aggregatePath.replaceAll("\\", "/")}`);

  if (failedJourneys.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(async (error) => {
    const taskId = currentBrowserTaskId();
    const payload = {
      generatedAt: new Date().toISOString(),
      taskId: taskId || null,
      error: String(error?.stack || error),
    };
    await writeTaskScopedJsonReport("browser_journey_gate_audit.json", payload, taskId);
    console.error(String(error?.stack || error));
    process.exitCode = 1;
  });
}
