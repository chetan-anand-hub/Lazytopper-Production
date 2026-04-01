import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.join(repoRoot, ".project_memory", "ops", "out");
const outPath = path.join(outDir, "topichub_doc_alignment_acceptance.json");

function addCheck(checks, name, ok, details = "") {
  checks.push({ name, ok: Boolean(ok), details: String(details || "") });
}

async function readText(relPath) {
  return fs.readFile(path.join(repoRoot, relPath), "utf8");
}

function runScript(relPath, checks, name) {
  const abs = path.join(repoRoot, relPath);
  const result = spawnSync(process.execPath, [abs], {
    cwd: repoRoot,
    env: { ...process.env },
    stdio: "inherit",
  });
  addCheck(
    checks,
    `suite_${name}`,
    (result.status ?? 1) === 0,
    `status=${result.status ?? "null"}`
  );
}

async function run() {
  const checks = [];

  const topicHubText = await readText("src/pages/TopicHub.tsx");
  const tutorDrawerText = await readText("src/components/tutor/TutorDrawerV2.tsx");
  const appText = await readText("src/App.tsx");
  const contentText = await readText("src/data/topicHubV2Full.ts");

  // Document-aligned pedagogical loop and UX checks.
  addCheck(
    checks,
    "loop_learn_grind_resources_present",
    topicHubText.includes("type TopicTabKey = 'learn' | 'grind' | 'resources';"),
    "Top-level topic flow should include Learn, Grind, Resources."
  );
  addCheck(
    checks,
    "soft_gate_message_present",
    tutorDrawerText.includes("Checkpoint not yet passed for this node."),
    "Soft-gate warning should be visible before advancing."
  );
  addCheck(
    checks,
    "soft_gate_ctas_present",
    tutorDrawerText.includes("Try checkpoint") &&
      tutorDrawerText.includes("Next hint") &&
      tutorDrawerText.includes("Practice this node") &&
      tutorDrawerText.includes("Continue anyway"),
    "Soft gate should provide checkpoint/hint/practice/continue actions."
  );
  addCheck(
    checks,
    "checkpoint_prompt_present",
    tutorDrawerText.includes("Checkpoint = answer the quick check above in your own words."),
    "Tutor UI should explicitly guide checkpoint behavior."
  );
  addCheck(
    checks,
    "session_stepper_present",
    tutorDrawerText.includes('const sessionSteps = ["Learn", "Checkpoint", "Practice", "Mistake Fix", "Exam Drill", "Mastery"];'),
    "Tutor should show explicit human-tutor session flow."
  );
  addCheck(
    checks,
    "full_screen_workspace_present",
    tutorDrawerText.includes('width: "100vw"') &&
      tutorDrawerText.includes('height: "100vh"') &&
      tutorDrawerText.includes("position: \"absolute\"") &&
      tutorDrawerText.includes("inset: 0"),
    "Tutor should open in full-screen workspace."
  );
  addCheck(
    checks,
    "primary_action_footer_present",
    tutorDrawerText.includes("primaryActionLabel") &&
      tutorDrawerText.includes("More actions"),
    "Tutor footer should use primary next action with collapsed secondary actions."
  );
  addCheck(
    checks,
    "deterministic_recovery_pipeline_present",
    tutorDrawerText.includes("requestWithRecovery") &&
      tutorDrawerText.includes("buildTutorFallback") &&
      tutorDrawerText.includes("MENTOR_MAX_ATTEMPTS"),
    "Tutor should have retry/backoff/local fallback pipeline."
  );
  addCheck(
    checks,
    "human_grade_coach_panel_present",
    tutorDrawerText.includes("HumanGradeCoachView") &&
      tutorDrawerText.includes("<HumanGradeCoachView"),
    "Tutor should render human-grade coaching surface."
  );
  addCheck(
    checks,
    "practice_handoff_back_navigation_present",
    topicHubText.includes("backPath: `/topic-hub/${grade}/${subject}/${topicKey}?tab=${backTab}`") &&
      topicHubText.includes('backLabel: "Back to TopicHub"'),
    "Practice handoff should preserve back navigation to TopicHub."
  );
  addCheck(
    checks,
    "mastery_badges_consistent_across_tabs",
    topicHubText.includes("const masteryBreakdown = useMemo(() => {") &&
      topicHubText.includes("Mastery") &&
      topicHubText.includes("masteryBreakdown[state]"),
    "TopicHub header should expose consistent mastery chips across Learn/Grind/Resources."
  );
  addCheck(
    checks,
    "all_topic_grind_mode_present",
    topicHubText.includes("? 'grind_triangles_v1' : 'grind_topic_v1'"),
    "Triangles and non-triangles grind contracts should both be supported."
  );
  addCheck(
    checks,
    "topic_launcher_route_present",
    appText.includes('<Route path="/topic-hub" element={<TopicHubHome />} />'),
    "Dedicated TopicHub landing page should exist."
  );
  addCheck(
    checks,
    "topichub_dataset_present",
    contentText.includes("export const topicHubV2Content:"),
    "TopicHub should have baked content registry to scale across topics."
  );

  const mathsTopicMatches = [...contentText.matchAll(/"subject"\s*:\s*"Maths"/g)].length;
  const scienceTopicMatches = [...contentText.matchAll(/"subject"\s*:\s*"Science"/g)].length;
  addCheck(
    checks,
    "class10_subject_coverage_nontrivial",
    mathsTopicMatches >= 10 && scienceTopicMatches >= 10,
    `Maths=${mathsTopicMatches}, Science=${scienceTopicMatches}`
  );

  // Execute existing behavior suites that already validate the human tutor contracts deeply.
  runScript("scripts/ops/triangles_human_tutor_acceptance.mjs", checks, "triangles_human_tutor");
  runScript("scripts/ops/topic_grind_contracts_acceptance.mjs", checks, "topic_grind_contracts");
  runScript("scripts/ops/topic_diagram_coverage_acceptance.mjs", checks, "topic_diagram_coverage");
  runScript(
    "scripts/ops/topichub_human_tutor_all_topics_acceptance.mjs",
    checks,
    "topichub_human_tutor_all_topics"
  );
  runScript(
    "scripts/ops/topichub_intended_functionality_acceptance.mjs",
    checks,
    "topichub_intended_functionality"
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
      mathsTopicMatches,
      scienceTopicMatches,
    },
    checks,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");

  if (failed.length) {
    console.error(
      `TopicHub doc-alignment acceptance FAILED (${failed.length}/${checks.length}).`
    );
    failed.forEach((f) => console.error(`- ${f.name}: ${f.details}`));
    console.error(`Report: ${path.relative(repoRoot, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `TopicHub doc-alignment acceptance PASSED (${checks.length}/${checks.length}).`
  );
  console.log(`Report: ${path.relative(repoRoot, outPath)}`);
}

run().catch(async (err) => {
  const report = {
    generatedAt: new Date().toISOString(),
    error: String(err?.stack || err?.message || err),
  };
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), "utf8");
  console.error("TopicHub doc-alignment acceptance errored.");
  console.error(String(err?.stack || err));
  console.error(`Report: ${path.relative(repoRoot, outPath)}`);
  process.exitCode = 1;
});
