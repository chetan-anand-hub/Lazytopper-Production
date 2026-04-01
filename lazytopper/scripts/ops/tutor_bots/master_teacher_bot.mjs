import { finalizeBotReport, loadTutorRegistry, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "master_teacher_bot",
  type: "tutor",
  purpose: "Check pedagogical progression, example ordering, misconception repair, and honest chapter depth.",
};

const checks = [];
const registry = await loadTutorRegistry();
const docAlign = await readText("scripts/ops/topichub_doc_alignment_acceptance.mjs");

for (const [chapterKey, chapterPath] of Object.entries(registry)) {
  const steps = chapterPath.studentJourney || [];
  const conceptIndex = steps.findIndex((step) => step.stepType === "concept");
  const practiceIndex = steps.findIndex((step) => step.stepType === "practice");
  const misconceptionExists = steps.some((step) => step.stepType === "misconception");
  const exampleExists = steps.some((step) => step.stepType === "example");
  checks.push(
    makeCheck(
      `${chapterKey}_pedagogy_sequence`,
      conceptIndex >= 0 && practiceIndex >= 0 && conceptIndex < practiceIndex && misconceptionExists && exampleExists,
      `${chapterKey} should include concept, misconception repair, example, then practice in tutor order.`,
      "P0",
      "Keep the studentJourney aligned to a human tutor sequence."
    )
  );
}
checks.push(
  makeCheck(
    "trig_is_marked_deep_and_triangles_partial",
    registry.trigonometry?.status === "deep" && registry.triangles?.status === "partial",
    "Registry should distinguish fully integrated vs partially integrated chapters honestly.",
    "P1",
    "Preserve honest chapter depth labels."
  )
);
checks.push(
  makeCheck(
    "topichub_doc_alignment_still_checks_human_tutor_flow",
    docAlign.includes("loop_learn_grind_resources_present") && docAlign.includes('sessionSteps = ["Learn", "Checkpoint", "Practice", "Mistake Fix", "Exam Drill", "Mastery"]'),
    "Tutor quality gate should stay aligned with existing human-tutor doc checks.",
    "P1",
    "Keep the new gate layered on existing TopicHub human-tutor audits."
  )
);

await finalizeBotReport({
  reportFileName: "master_teacher_acceptance.json",
  bot,
  checks,
});
