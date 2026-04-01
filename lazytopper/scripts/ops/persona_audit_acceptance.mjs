import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "persona_audit_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({
    name,
    ok: Boolean(ok),
    details: String(details || ""),
  });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

async function run() {
  const checks = [];

  const onboarding = await readText("src/pages/Onboarding.tsx");
  const dashboard = await readText("src/pages/Dashboard.tsx");
  const topicHub = await readText("src/pages/TopicHubHome.tsx");
  const contracts = await readText("src/tutor/topicTeachContracts.ts");
  const app = await readText("src/App.tsx");
  const sessionPage = await readText("src/pages/SessionPlayPage.tsx");

  addCheck(
    checks,
    "student_persona_low_confusion_path",
    dashboard.includes("startSession") && topicHub.includes("Play this chapter"),
    "Student personas need clear one-click play paths."
  );
  addCheck(
    checks,
    "teacher_persona_topic_contract_depth",
    contracts.includes("getTopicTeachContractCoverage") &&
      contracts.includes("assessedScopeBullets"),
    "Teacher persona expects chapter-specific and scope-aware tutor contracts."
  );
  addCheck(
    checks,
    "examiner_persona_board_format",
    contracts.includes("checkpointQuestion") && contracts.includes("Expected answer:"),
    "Examiner persona expects board-writing checkpoint format."
  );
  addCheck(
    checks,
    "curriculum_persona_class_truth",
    !onboarding.includes('option value="12"'),
    "Curriculum persona expects surfaced class coverage to match delivered scope."
  );
  addCheck(
    checks,
    "engineering_persona_lazy_modular_routes",
    app.includes("lazy(() => import(") && app.includes("withRouteSuspense"),
    "Engineering persona expects route-level modular loading."
  );
  addCheck(
    checks,
    "engineering_persona_session_observability",
    sessionPage.includes("Submit current item response") &&
      sessionPage.includes("missingKeywords"),
    "Engineering persona expects visible feedback surface for submission loop."
  );

  const failed = checks.filter((check) => !check.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: checks.length,
      passed: checks.length - failed.length,
      failed: failed.length,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(`persona audit acceptance FAILED (${failed.length}/${checks.length}).`);
    failed.forEach((check) => console.error(`- ${check.name}: ${check.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(`persona audit acceptance PASSED (${checks.length}/${checks.length}).`);
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("persona audit acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
