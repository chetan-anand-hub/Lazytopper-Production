import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "our-environment"
// Extraction date: 2026-05-25
// Note: Our Environment chapter is RETAINED in 2026-27 (Unit V, 5 marks — ecology only)

export const OUR_ENVIRONMENT_APQ: CanonicalQuestion[] = [
  // Science-PQ Q15 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ENV-001", subject: "Science", topicKey: "our-environment", subtopic: "Trophic Energy Transfer", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Plants receive energy from the Sun which they utilise for several processes. The energy utilized for which of the following plant processes gets transferred to the next trophic level that consumes plants?",
    options: [
      "only growth",
      "only respiration",
      "only transport of substances and reproduction",
      "all - growth, photosynthesis, respiration and transport of substances"
    ],
    answer: "only growth",
    solutionSteps: ["Only the energy stored in plant biomass (growth/structural compounds) is transferred to the next trophic level when consumed.", "Respiration, transport, and most metabolic processes dissipate energy as heat — these are NOT transferred. Photosynthesis captures solar energy but only the part stored as biomass moves up the food chain."],
    finalAnswer: "(a) only growth",
    ncertRef: "APQ Science-PQ Q15", isCompetencyBased: true },

  // Science-PQ Q16 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ENV-002", subject: "Science", topicKey: "our-environment", subtopic: "Ozone Layer Formation", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The action of which among the following is crucial to the formation of ozone?",
    options: ["humans", "sunlight", "carbon dioxide", "chlorofluoro carbons"],
    answer: "sunlight",
    solutionSteps: ["Ozone (O3) forms in the stratosphere when UV radiation from sunlight splits O2 into atomic oxygen, which then combines with another O2: O2 + UV → 2 O; O + O2 → O3.", "CFCs DEPLETE ozone (they don't form it). Humans contribute to CFC release but aren't the formation agent."],
    finalAnswer: "(b) sunlight",
    ncertRef: "APQ Science-PQ Q16", isCompetencyBased: false },

  // Science-PQ Q20 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-ENV-003", subject: "Science", topicKey: "our-environment", subtopic: "Trophic Levels — Omnivores", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): Omnivores receive 10% of their energy from the trophic level below them. Reason (R): An omnivore is always in the trophic level just above herbivores.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, and R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "A is true but R is false.",
    solutionSteps: ["A is true: 10% law — only ~10% of energy at one trophic level transfers to the next.", "R is false: omnivores eat from MULTIPLE trophic levels (plants AND animals), so they're not 'always just above herbivores'. They can occupy more than one trophic level."],
    finalAnswer: "(c) A is true but R is false.",
    ncertRef: "APQ Science-PQ Q20", isCompetencyBased: true },

  // Science-PQ Q26 (Section B, Short, 2 marks)
  { id: "APQ-S-ENV-004", subject: "Science", topicKey: "our-environment", subtopic: "Ecological Pyramids — Aquatic Inverted Pyramid", section: "B", marks: 2, format: "Short", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Two food pyramids are shown — a traditional land pyramid (producers largest) and an aquatic pyramid where producers (phytoplankton) have less total mass than top consumers (big fishes). (a) Which level is likely to have the most amount of energy in such an aquatic ecosystem? Give a reason. (b) Such aquatic ecosystems are not considered to be sustainable. Justify.",
    answer: "(a) Phytoplankton (producers) still have most energy. (b) Limited food at lower trophic levels limits sustainability.",
    solutionSteps: ["(a) Even with smaller MASS, phytoplankton (producers) capture maximum sunlight energy. Energy flow follows the 10% rule: producers always have the highest TOTAL energy captured from sunlight, decreasing with each higher level.", "(b) The low mass of producers means very limited food available to the higher trophic levels. Top consumers may exhaust the phytoplankton supply faster than it can regenerate ⟹ organisms at higher levels starve and die sooner ⟹ the ecosystem is not sustainable in the long term."],
    finalAnswer: "(a) Phytoplankton (highest energy); (b) limited food at bottom of inverted pyramid = unsustainable.",
    ncertRef: "APQ Science-PQ Q26", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: two food pyramids — land (traditional) and aquatic (inverted)." },
];
