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

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q15 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ENV-005", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain — Impact of Removing a Trophic Level", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If all the organisms of one trophic level in a food chain die, what would be its impact on the population of organisms in other trophic levels? It will:",
    options: [
      "remain the same in the next trophic level",
      "increase in the next trophic level",
      "increase in the lower trophic level",
      "remain the same in the lower trophic level"
    ],
    answer: "increase in the lower trophic level",
    solutionSteps: ["If predators (one trophic level) are wiped out, the prey at the LOWER trophic level no longer face that predation pressure — their population INCREASES.", "Next trophic level (above the dead level) loses its food source ⟹ that population would decrease, not stay same."],
    finalAnswer: "(c) increase in the lower trophic level",
    ncertRef: "APQ Science-PQ2 Q15", isCompetencyBased: true },

  // Science-PQ2 Q16 (Section A, MCQ, 1 mark)
  { id: "APQ-S-ENV-006", subject: "Science", topicKey: "our-environment", subtopic: "Biomagnification of Non-degradable Chemicals", section: "A", marks: 1, format: "MCQ", difficulty: "Easy", bloomSkill: "Remembering",
    questionText: "The chemicals that are non-degradable, get progressively accumulated at each trophic level, and their concentration is seen maximum in the bodies of top consumers. This phenomenon is known as:",
    options: ["Eutrophication", "Pollution", "Accumulation", "Biomagnification"],
    answer: "Biomagnification",
    solutionSteps: ["BIOMAGNIFICATION = progressive build-up of non-biodegradable substances (e.g., DDT, mercury) as they move up the food chain; top consumers carry the maximum concentration.", "Eutrophication = nutrient enrichment of water bodies; pollution is a general term; accumulation alone does not imply trophic-level concentration."],
    finalAnswer: "(d) Biomagnification",
    ncertRef: "APQ Science-PQ2 Q16", isCompetencyBased: false },

  // Science-PQ2 Q20 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-ENV-007", subject: "Science", topicKey: "our-environment", subtopic: "Biodegradable vs Non-biodegradable Waste — Composting", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): All kitchen waste cannot form compost. Reason (R): Material like milk packets may not be biodegradable.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, but R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "Both A and R are true, and R is the correct explanation of A.",
    solutionSteps: ["A is true: some items found in kitchen waste (e.g., plastics, foils, milk packets) cannot be composted.", "R is true and EXPLAINS A: composting requires biodegradable matter. Milk packets (often plastic-lined) are non-biodegradable, so they cannot form compost — hence not ALL kitchen waste can form compost."],
    finalAnswer: "(a) Both A and R are true, and R is the correct explanation of A.",
    ncertRef: "APQ Science-PQ2 Q20", isCompetencyBased: true },

  // Science-PQ2 Q26 (Section B, Short, 2 marks)
  { id: "APQ-S-ENV-008", subject: "Science", topicKey: "our-environment", subtopic: "Ozone Layer Depletion — CFCs and Health Effects", section: "B", marks: 2, format: "Short", difficulty: "Easy", bloomSkill: "Understanding",
    questionText: "Marked decline in the thickness of ozone layer was noticed in the 1980s. Which human activity can be held accountable for this change? What is the possible effect of this on human health?",
    answer: "Release of CFCs caused depletion; UV rays cause skin cancer.",
    solutionSteps: ["Human activities releasing CHLOROFLUOROCARBONS (CFCs) — used in refrigerators, air conditioners, and aerosol sprays — were responsible for the marked depletion of the ozone layer.", "The ozone layer shields the Earth's surface from harmful UV rays of the Sun. Its depletion increases UV exposure, which causes SKIN CANCER and other harmful effects on human health (also cataracts, immune suppression)."],
    finalAnswer: "Human cause: CFC release; health effect: increased UV ⟹ skin cancer.",
    ncertRef: "APQ Science-PQ2 Q26", isCompetencyBased: true },
];
