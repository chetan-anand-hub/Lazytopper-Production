import { finalizeBotReport, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "boards_focused_student",
  type: "student",
  purpose: "Check that board-ready students can reach stepwise answer-writing support quickly.",
};

const checks = [];
const mentorPanel = await readText("src/components/MentorPanel.tsx");
const practicePage = await readText("src/pages/PracticePage.tsx");
const tutorContracts = await readText("src/tutor/topicTeachContracts.ts");
const boardStepsTypes = await readText("src/data/boardSteps/types.ts");
const trigRubrics = await readText("src/data/contentStrategy/trigonometry/trigonometryRubrics.ts");

checks.push(
  makeCheck(
    "cbse_check_action_is_visible",
    mentorPanel.includes("Check my solution (CBSE)"),
    "Boards-focused students need a visible CBSE answer-check action.",
    "P0",
    "Retain the CBSE check CTA in student mode."
  )
);
checks.push(
  makeCheck(
    "practice_injects_rubric_context_for_cbse_check",
    practicePage.includes("[RUBRIC_CONTEXT]") && practicePage.includes("Expected steps checklist:"),
    "Practice mentor flow should carry rubric context into CBSE check requests.",
    "P0",
    "Keep rubric context injection for check_cbse intent."
  )
);
checks.push(
  makeCheck(
    "board_steps_contract_exists",
    boardStepsTypes.includes("BoardStepsTemplate") && boardStepsTypes.includes('SectionKey = "A" | "B" | "C" | "D" | "E"'),
    "Board-style answer support should have an explicit A-E section contract.",
    "P1",
    "Keep the board-steps section contract aligned with CBSE sections."
  )
);
checks.push(
  makeCheck(
    "trig_rubrics_define_deductions_and_examiner_tips",
    trigRubrics.includes("commonDeductions") && trigRubrics.includes("examinerTips"),
    "Boards-focused checks should surface deduction risk and examiner tips.",
    "P1",
    "Retain rubric deductions and examiner tips in trig support."
  )
);
checks.push(
  makeCheck(
    "teach_contracts_use_board_format_language",
    tutorContracts.includes("Expected answer:") && tutorContracts.includes("Therefore/Hence"),
    "Tutor contracts should reinforce board-writing format language.",
    "P1",
    "Keep Given/To Find/Therefore-Hence phrasing in chapter contracts."
  )
);

await finalizeBotReport({
  reportFileName: "student_boards_focused_acceptance.json",
  bot,
  checks,
});
