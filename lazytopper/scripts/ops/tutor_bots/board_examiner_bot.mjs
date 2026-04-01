import { finalizeBotReport, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "board_examiner_bot",
  type: "tutor",
  purpose: "Check mark-deduction awareness, rubric support, and board-writing enforcement.",
};

const checks = [];
const practicePage = await readText("src/pages/PracticePage.tsx");
const trigRubrics = await readText("src/data/contentStrategy/trigonometry/trigonometryRubrics.ts");
const boardTypes = await readText("src/data/boardSteps/types.ts");
const mentorPanel = await readText("src/components/MentorPanel.tsx");

checks.push(
  makeCheck(
    "practice_cbse_check_includes_rubric_context",
    practicePage.includes("[RUBRIC_CONTEXT]") && practicePage.includes("Common deductions:"),
    "Board examiner flow should carry deduction-aware rubric context into mentor checking.",
    "P0",
    "Keep rubric context injection in CBSE check mode."
  )
);
checks.push(
  makeCheck(
    "trig_rubrics_include_examiner_tips_and_checklist",
    trigRubrics.includes("checklist") && trigRubrics.includes("commonDeductions") && trigRubrics.includes("examinerTips"),
    "Examiner-oriented rubric data should contain checklist, deductions, and examiner tips.",
    "P1",
    "Retain explicit examiner-oriented rubric fields."
  )
);
checks.push(
  makeCheck(
    "board_steps_cover_all_sections",
    boardTypes.includes('SectionKey = "A" | "B" | "C" | "D" | "E"'),
    "Board-examiner checks should understand all CBSE section models.",
    "P1",
    "Keep section A-E alignment in the board-steps contract."
  )
);
checks.push(
  makeCheck(
    "mentor_helper_prompts_full_work_submission",
    mentorPanel.includes("marks may be cut"),
    "Students should be prompted to submit full working so examiner-style feedback is meaningful.",
    "P2",
    "Retain the CBSE helper copy near student intent chips."
  )
);

await finalizeBotReport({
  reportFileName: "board_examiner_acceptance.json",
  bot,
  checks,
});
