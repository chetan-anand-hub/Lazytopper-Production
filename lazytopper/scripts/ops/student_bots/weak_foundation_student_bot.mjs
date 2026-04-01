import { finalizeBotReport, loadTutorRegistry, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "weak_foundation_student",
  type: "student",
  purpose: "Check that weak-foundation learners get concept-first, misconception-aware teaching paths.",
};

const checks = [];
const tutorContracts = await readText("src/tutor/topicTeachContracts.ts");
const tutorDrawer = await readText("src/components/tutor/TutorDrawerV2.tsx");
const registry = await loadTutorRegistry();

for (const chapterKey of ["trigonometry", "triangles"]) {
  const steps = registry[chapterKey]?.studentJourney || [];
  const conceptIndex = steps.findIndex((step) => step.stepType === "concept");
  const practiceIndex = steps.findIndex((step) => step.stepType === "practice");
  checks.push(
    makeCheck(
      `${chapterKey}_concept_before_practice`,
      conceptIndex >= 0 && practiceIndex >= 0 && conceptIndex < practiceIndex,
      `${chapterKey} should teach concepts before board-style practice for weak-foundation learners.`,
      "P0",
      "Keep chapter sequencing concept-first before timed practice."
    )
  );
}
checks.push(
  makeCheck(
    "topic_contracts_have_checkpoint_and_common_mistake",
    tutorContracts.includes("checkpointQuestion") && tutorContracts.includes("commonMistake"),
    "Teach contracts should include checkpoint and misconception guidance.",
    "P1",
    "Maintain checkpoint and common-mistake fields in topic teach contracts."
  )
);
checks.push(
  makeCheck(
    "tutor_drawer_has_checkpoint_and_practice_support",
    tutorDrawer.includes("Checkpoint not yet passed for this node.") && tutorDrawer.includes("Practice this node"),
    "Tutor flow should explicitly support checkpoint recovery and practice retries.",
    "P1",
    "Keep checkpoint recovery controls visible."
  )
);
checks.push(
  makeCheck(
    "triangles_path_marks_partial_honestly",
    registry.triangles?.status === "partial" && registry.triangles?.qtfSupport?.status === "partial",
    "Weak-foundation guidance must stay honest about chapter depth.",
    "P1",
    "Do not overstate chapter support in the registry."
  )
);

await finalizeBotReport({
  reportFileName: "student_weak_foundation_acceptance.json",
  bot,
  checks,
});
