import { finalizeBotReport, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "doubt_heavy_student",
  type: "student",
  purpose: "Check that students who ask many doubts can escalate smoothly into mentor support without losing context.",
};

const checks = [];
const mentorPanel = await readText("src/components/MentorPanel.tsx");
const practicePage = await readText("src/pages/PracticePage.tsx");
const persona = await readText("src/mentors/centralPersona.ts");

checks.push(
  makeCheck(
    "question_level_help_cta_exists",
    practicePage.includes("Ask mentor about this question"),
    "Doubt-heavy students need a direct question-level mentor CTA.",
    "P1",
    "Keep the Practice mentor CTA visible near the active question."
  )
);
checks.push(
  makeCheck(
    "cbse_photo_upload_exists_for_solution_check",
    mentorPanel.includes("Upload solution photo") && practicePage.includes("Upload solution photo"),
    "Students with handwritten doubts need image-based solution checking in CBSE mode.",
    "P1",
    "Keep one-shot solution photo upload available in student CBSE-check flows."
  )
);
checks.push(
  makeCheck(
    "mentor_panel_encourages_full_work_for_cbse_check",
    mentorPanel.includes("Tip: Paste your full working. I'll check it like CBSE and tell where marks may be cut."),
    "The mentor should guide the student on what kind of doubt/help input is most useful.",
    "P2",
    "Keep helper copy near the CBSE check intent."
  )
);
checks.push(
  makeCheck(
    "mentor_persona_is_student_friendly",
    persona.includes("student-friendly language") &&
      persona.includes("step-by-step explanations") &&
      persona.includes("Never guarantee exact board questions") &&
      !persona.match(/\bstupid\b|\bdumb\b|\bshame\b|\bworthless\b|\bhopeless\b/i),
    "Central persona should stay constructive for repeated-doubt students.",
    "P1",
    "Keep student-facing persona copy patient and non-shaming."
  )
);
checks.push(
  makeCheck(
    "new_chat_recovery_exists",
    mentorPanel.includes("New chat"),
    "Students who get lost in a doubt thread need a visible recovery/reset path.",
    "P2",
    "Keep manual new-chat recovery visible."
  )
);

await finalizeBotReport({
  reportFileName: "student_doubt_heavy_acceptance.json",
  bot,
  checks,
});
