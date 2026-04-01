import { finalizeBotReport, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "copy_checker_bot",
  type: "tutor",
  purpose: "Check board-copy structure, stepwise phrasing, and answer-writing scaffolds.",
};

const checks = [];
const tutorContracts = await readText("src/tutor/topicTeachContracts.ts");
const boardTypes = await readText("src/data/boardSteps/types.ts");
const trianglesBoardSteps = await readText("src/data/_final/maths-triangles/boardSteps.json");

checks.push(
  makeCheck(
    "teach_contracts_define_given_to_prove_structure",
    tutorContracts.includes("Expected answer:") && tutorContracts.includes("Given:") && tutorContracts.includes("Therefore/Hence"),
    "Chapter contracts should preserve board-copy structure.",
    "P0",
    "Keep Given/To Prove/Therefore-Hence phrasing in tutor contracts."
  )
);
checks.push(
  makeCheck(
    "board_steps_contract_is_stepwise",
    boardTypes.includes("whatToWrite") && boardTypes.includes("marksTotal") && boardTypes.includes("commonMistakes"),
    "Board-steps model should preserve stepwise writing instructions and mark framing.",
    "P1",
    "Keep BoardStepsTemplate aligned to writing-step guidance."
  )
);
checks.push(
  makeCheck(
    "triangles_board_steps_include_mistake_flags",
    trianglesBoardSteps.includes("Alternative accepted") && trianglesBoardSteps.includes("Not stating similarity triangles before CPST."),
    "Chapter copy-checking should include accepted variants and common mark-loss flags.",
    "P1",
    "Retain chapter board-step notes about accepted alternatives and mistakes."
  )
);

await finalizeBotReport({
  reportFileName: "copy_checker_acceptance.json",
  bot,
  checks,
});
