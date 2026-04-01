import { finalizeBotReport, loadTutorRegistry, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "anxious_student",
  type: "student",
  purpose: "Check for low-confusion, supportive, low-cognitive-load student affordances.",
};

const checks = [];
const mentorPanel = await readText("src/components/MentorPanel.tsx");
const practicePage = await readText("src/pages/PracticePage.tsx");
const onboarding = await readText("src/pages/Onboarding.tsx");
const registry = await loadTutorRegistry();

checks.push(
  makeCheck(
    "mentor_student_actions_are_simple",
    mentorPanel.includes("Hint / Next step") &&
      mentorPanel.includes("Explain") &&
      mentorPanel.includes("Check my solution (CBSE)"),
    "Student mode should expose only the three plain-language mentor actions.",
    "P1",
    "Keep internal mentor modes hidden by default."
  )
);
checks.push(
  makeCheck(
    "mentor_reset_is_manual_not_forced",
    mentorPanel.includes("New chat"),
    "An anxious student needs explicit reset control instead of chat resets on mode changes.",
    "P2",
    "Keep manual reset visible in student mode."
  )
);
checks.push(
  makeCheck(
    "practice_explains_why_a_question_appeared",
    practicePage.includes("Why this question?"),
    "Practice should explain why a question was selected to reduce confusion.",
    "P1",
    "Preserve the why-panel or equivalent tutor explanation."
  )
);
checks.push(
  makeCheck(
    "practice_has_visible_mentor_escalation",
    practicePage.includes("Ask mentor about this question"),
    "Anxious students need a clear help CTA from practice.",
    "P1",
    "Keep a visible question-level mentor CTA."
  )
);
checks.push(
  makeCheck(
    "onboarding_has_guided_start_cues",
    onboarding.includes('data-testid="onboarding-support-cues"') &&
      onboarding.includes("Guided start (recommended)") &&
      onboarding.includes("step-by-step"),
    "Onboarding should signal a guided, lighter path for unsure students.",
    "P2",
    "Retain guided-mode support cues in onboarding."
  )
);
checks.push(
  makeCheck(
    "registered_chapters_define_start_steps",
    registry.trigonometry?.studentJourney?.some((step) => step.stepType === "start") &&
      registry.triangles?.studentJourney?.some((step) => step.stepType === "start"),
    "Tutor registry should define calm chapter entry points before deeper work.",
    "P2",
    "Add explicit start steps for each registered chapter."
  )
);

await finalizeBotReport({
  reportFileName: "student_anxious_acceptance.json",
  bot,
  checks,
});
