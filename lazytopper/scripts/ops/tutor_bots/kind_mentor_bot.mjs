import { finalizeBotReport, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "kind_mentor_bot",
  type: "tutor",
  purpose: "Check that mentor tone stays constructive, non-shaming, and student-safe.",
};

const checks = [];
const persona = await readText("src/mentors/centralPersona.ts");
const mentorPanel = await readText("src/components/MentorPanel.tsx");
const harshPattern = /stupid|dumb|lazy student|shame|worthless|hopeless/i;

checks.push(
  makeCheck(
    "central_persona_is_patient_and_student_friendly",
    persona.includes("student-friendly language") &&
      persona.includes("step-by-step explanations") &&
      persona.includes("Never guarantee exact board questions") &&
      !harshPattern.test(persona),
    "Core mentor persona should remain patient, realistic, and non-shaming.",
    "P0",
    "Keep central mentor guidance simple, patient, and non-harsh."
  )
);
checks.push(
  makeCheck(
    "student_mode_uses_plain_language_labels",
    mentorPanel.includes("Hint / Next step") && mentorPanel.includes("Explain") && mentorPanel.includes("Check my solution (CBSE)"),
    "Kind mentor UX should use plain-language actions instead of opaque mode jargon.",
    "P1",
    "Keep mentor actions student-readable in default mode."
  )
);
checks.push(
  makeCheck(
    "cbse_helper_text_is_supportive",
    mentorPanel.includes("Tip: Paste your full working. I'll check it like CBSE and tell where marks may be cut.") && !harshPattern.test(mentorPanel),
    "Mentor helper text should set expectations without blame.",
    "P2",
    "Keep helper text constructive and specific."
  )
);

await finalizeBotReport({
  reportFileName: "kind_mentor_acceptance.json",
  bot,
  checks,
});
