import { finalizeBotReport, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "fast_revision_student",
  type: "student",
  purpose: "Check that fast-revision learners can jump into focused practice, HPQ, and mock-adjacent flows quickly.",
};

const checks = [];
const practicePage = await readText("src/pages/PracticePage.tsx");
const navigation = await readText("src/navigation/practiceNavigation.ts");
const topicHub = await readText("src/pages/TopicHub.tsx");
const hpq = await readText("src/data/highlyProbableQuestions.ts");
const papers = await readText("src/data/predictivePapers.ts");

checks.push(
  makeCheck(
    "practice_supports_focus_ids_and_strict_focus",
    practicePage.includes("focusBankIds") && practicePage.includes("strictFocus") && practicePage.includes("strictFocusPool"),
    "Fast revision needs focused question selection before broad mixed practice.",
    "P1",
    "Preserve strictFocus + focusBankIds handling in PracticePage."
  )
);
checks.push(
  makeCheck(
    "practice_navigation_can_deep_link_revision_sets",
    navigation.includes("recommendedCount") && navigation.includes("difficultyPreset") && navigation.includes("focusBankIds"),
    "Revision flows need a reusable deep-link contract into Practice.",
    "P1",
    "Keep practice navigation deep-link filters intact."
  )
);
checks.push(
  makeCheck(
    "topichub_can_launch_qtf_focused_practice",
    topicHub.includes("getFocusIdsForTile") && topicHub.includes("strictFocus: true"),
    "TopicHub should be able to push fast learners into precise focused sets.",
    "P2",
    "Keep tile-to-practice focused routing for supported chapters."
  )
);
checks.push(
  makeCheck(
    "hpq_has_trig_linkage_for_high_roi_revision",
    hpq.includes('questionIds: ["2026-TRIG-SA-01", "2026-TRIG-LA-02"]'),
    "HPQ should expose at least one concrete trig high-ROI linkage.",
    "P2",
    "Preserve concrete HPQ-to-question ID links where available."
  )
);
checks.push(
  makeCheck(
    "predictive_papers_metadata_exists_for_mock_escalation",
    papers.includes("paper-9-board-style") && papers.includes("subject: \"Maths\"") && papers.includes("markTotal: 80"),
    "Fast revision still needs mock-paper metadata for later escalation.",
    "P2",
    "Keep predictive-paper shells available even before full curation."
  )
);

await finalizeBotReport({
  reportFileName: "student_fast_revision_acceptance.json",
  bot,
  checks,
});
