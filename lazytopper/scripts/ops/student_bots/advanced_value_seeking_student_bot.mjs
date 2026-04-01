import { finalizeBotReport, loadTutorRegistry, makeCheck, readText } from "../persona_bot_lib.mjs";

const bot = {
  id: "advanced_value_seeking_student",
  type: "student",
  purpose: "Check that strong, high-agency students can reach real depth and payoff quickly.",
};

const checks = [];
const topicHub = await readText("src/pages/TopicHub.tsx");
const practicePage = await readText("src/pages/PracticePage.tsx");
const resolver = await readText("src/services/questionTypeFirstResolver.ts");
const trigPack = await readText("src/data/questionBanks/class10/maths/trigonometry.pack1.ts");
const registry = await loadTutorRegistry();

checks.push(
  makeCheck(
    "trigonometry_registry_is_marked_deep",
    registry.trigonometry?.status === "deep",
    "Advanced students should have at least one chapter with genuinely deep, integrated support.",
    "P1",
    "Keep Trigonometry as the deep pilot until another chapter reaches the same runtime maturity."
  )
);
checks.push(
  makeCheck(
    "triangles_registry_is_honest_not_overstated",
    registry.triangles?.status === "partial",
    "High-agency students lose trust if partially built chapters are falsely presented as complete.",
    "P1",
    "Keep chapter maturity labels honest inside the tutor registry."
  )
);
checks.push(
  makeCheck(
    "topichub_surfaces_depth_cues",
    topicHub.includes("Board question types in this chapter") &&
      topicHub.includes("Mastery") &&
      topicHub.includes("Proof writing (Triangles)"),
    "TopicHub should expose depth and mastery cues, not only beginner handholding.",
    "P1",
    "Retain mastery, proof, and board-pattern surfaces for strong students."
  )
);
checks.push(
  makeCheck(
    "practice_supports_fast_high_value_navigation",
    practicePage.includes("Fast drill presets:") &&
      practicePage.includes("Why this question?") &&
      practicePage.includes("Ask mentor about this question"),
    "Strong students should be able to jump quickly into valuable practice with reasoning context.",
    "P0",
    "Keep fast-drill entry, why-panel context, and question-level help accessible together."
  )
);
checks.push(
  makeCheck(
    "qtf_resolver_enables_precise_practice_focus",
    resolver.includes("getFocusIdsForTile") &&
      resolver.includes("const tier1") &&
      resolver.includes("const tier2") &&
      resolver.includes("const tier3") &&
      resolver.includes("const tier4") &&
      resolver.includes("MIN_QTYPE_SET_SIZE"),
    "Advanced students should be able to reach sharper practice slices instead of broad random pools.",
    "P1",
    "Preserve the tiered tile-to-focus selector in the QTF resolver."
  )
);
checks.push(
  makeCheck(
    "trig_pack_offers_nontrivial_practice_depth",
    trigPack.includes("2026-TRIG-P1-D-015") &&
      trigPack.includes("2026-TRIG-P1-E-010") &&
      trigPack.includes("Proof_Pattern"),
    "A strong student needs enough depth in the canonical chapter pack to avoid shallow repetition.",
    "P1",
    "Keep long-answer, case-study, and proof patterns present in the Trigonometry pack."
  )
);

await finalizeBotReport({
  reportFileName: "student_advanced_value_seeking_acceptance.json",
  bot,
  checks,
});
