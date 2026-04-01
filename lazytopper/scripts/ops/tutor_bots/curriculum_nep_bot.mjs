import { finalizeBotReport, loadTutorRegistry, makeCheck, readText, countMatches } from "../persona_bot_lib.mjs";

const bot = {
  id: "curriculum_nep_bot",
  type: "tutor",
  purpose: "Check practical curriculum truth, assessed-scope guardrails, and broad NEP-aligned progression signals.",
};

const checks = [];
const scopePolicy = await readText("src/data/syllabus/scopePolicy.ts");
const topicContracts = await readText("src/tutor/topicTeachContracts.ts");
const onboarding = await readText("src/pages/Onboarding.tsx");
const topicHubV2 = await readText("src/data/topicHubV2Full.ts");
const registry = await loadTutorRegistry();

const mathsTopics = countMatches(topicHubV2, /"subject"\s*:\s*"Maths"/g);
const scienceTopics = countMatches(topicHubV2, /"subject"\s*:\s*"Science"/g);

checks.push(
  makeCheck(
    "scope_policy_has_assessed_guardrails",
    scopePolicy.includes("assessedScopeBullets") && scopePolicy.includes("excludedTermsInAssessed") && scopePolicy.includes("Pythagoras and areas-of-similar-triangles are enrichment-only in this policy layer."),
    "Curriculum gate should preserve assessed-vs-enrichment scope boundaries.",
    "P0",
    "Keep scopePolicy authoritative for assessed scope guardrails."
  )
);
checks.push(
  makeCheck(
    "topic_contracts_surface_assessed_scope",
    topicContracts.includes("assessedScopeBullets") && topicContracts.includes("getScopeGuardLine"),
    "Tutor contracts should surface practical scope guidance to mentor flows.",
    "P1",
    "Keep assessed-scope bullets and guard lines in topic contracts."
  )
);
checks.push(
  makeCheck(
    "surface_scope_matches_delivered_classes",
    !onboarding.includes('option value="12"'),
    "Curriculum truth should not surface unsupported class levels in onboarding.",
    "P1",
    "Do not expose class levels not actually delivered in-product."
  )
);
checks.push(
  makeCheck(
    "topic_hub_has_nontrivial_maths_and_science_coverage",
    mathsTopics >= 10 && scienceTopics >= 10,
    `TopicHub V2 coverage should stay nontrivial across subjects (Maths=${mathsTopics}, Science=${scienceTopics}).`,
    "P2",
    "Keep the chapter shell broad across both subjects."
  )
);
checks.push(
  makeCheck(
    "registry_stays_honest_about_depth",
    registry.trigonometry?.status === "deep" && registry.triangles?.status === "partial",
    "Curriculum gate should distinguish mature vs partial chapter implementations honestly.",
    "P2",
    "Avoid marking partially implemented chapters as deep."
  )
);

await finalizeBotReport({
  reportFileName: "curriculum_nep_acceptance.json",
  bot,
  checks,
});
