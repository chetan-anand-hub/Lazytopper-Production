import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Class X Science (086) Previous Year Question Papers — 2024-25 board exam
// Question papers (31/1/x, 31/2/x, 31/3/x) + matched English marking schemes (X_086_31-N-1 to 3 Science_MS)
// topicKey: "our-environment"
// Extraction date: 2026-05-25
// PDF tool: pymupdf (0 cid artifacts confirmed via probe)
// Coverage: 9 text-extractable QPs (31/1/x, 31/2/x, 31/3/x); 9 scanned QPs (31/4/x, 31/5/x, 31/6/x) skipped — require OCR

export const ourEnvironmentPYQ2025: CanonicalQuestion[] = [
  { id: "PYQ-S-2025-ENV-001", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Which of the following groups do not constitute a food chain ? (i) Wolf, rabbit, grass, lion (ii) Plankton, man, grasshopper, fish (iii) Hawk, grass, snake, grasshopper, frog (iv) Grass, snake, wolf, tiger",
    options: ["(i) and (iv)", "(i) and (iii)", "(ii) and (iii)", "(ii) and (iv)"],
    answer: "(ii) and (iv)",
    solutionSteps: ["Correct option: (d) (ii) and (iv)."],
    finalAnswer: "(d) (ii) and (iv)",
    ncertRef: "PYQ 31/1/1 Q15", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
  { id: "PYQ-S-2025-ENV-002", subject: "Science", topicKey: "our-environment", subtopic: "Ecosystems", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "The percentage of solar energy which is not converted into food energy by the leaves of green plants in a terrestrial ecosystem is about :",
    options: ["1%", "10%", "90%", "99%"],
    answer: "99%",
    solutionSteps: ["Correct option: (d) 99%."],
    finalAnswer: "(d) 99%",
    ncertRef: "PYQ 31/1/2 Q15", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "2" },
  { id: "PYQ-S-2025-ENV-003", subject: "Science", topicKey: "our-environment", subtopic: "Ozone Layer", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Write the essential function performed by ozone at the higher levels of the atmosphere. How is it formed in the upper atmosphere ? Write the name of the group of chemicals mainly responsible for the depletion of ozone layer.",
    answer: "solution.",
    solutionSteps: ["See marking scheme.", "Refer to CBSE official marking scheme for the full step-by-step", "solution."],
    finalAnswer: "solution.",
    ncertRef: "PYQ 31/2/1 Q33", isCompetencyBased: true,
    pyqYear: "2025", pyqSet: "1" },
  { id: "PYQ-S-2025-ENV-004", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Some harmful chemicals get accumulated in human bodies through the food chain. Name this phenomenon. Explain the reason of maximum concentration of these chemicals found in our bodies.",
    answer: "The phenomenon is biological magnification. These chemicals (e.g. pesticides) are non-biodegradable, so they are not broken down and get accumulated progressively at each trophic level. Human beings occupy the top level in the food chain, so the maximum concentration of these chemicals accumulates in our bodies.",
    solutionSteps: ["[1 mark] The phenomenon is biological magnification.", "[1 mark] These chemicals are non-biodegradable, so they are not broken down and get accumulated over successive trophic levels.", "[1 mark] Human beings occupy the top level in the food chain, so the concentration is maximum in our bodies."],
    finalAnswer: "Biological magnification — non-biodegradable chemicals accumulate at each trophic level and humans, at the top of the food chain, receive the maximum concentration.",
    ncertRef: "PYQ 31/2/3 Q33", isCompetencyBased: true,
    sourceOverride: "others",
  },
  { id: "PYQ-S-2025-ENV-005", subject: "Science", topicKey: "our-environment", subtopic: "Food Chain", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "(a) ''In a food chain energy flow is unidirectional.'' Give two reasons for the given statement. (b) If 10,000 J energy is available at the producer level, how much energy will be available to the secondary consumers ? Give reason to justify your answer.",
    answer: "(a) (Any two) Energy captured by plants does not revert to solar input, and energy passed to herbivores does not return to autotrophs; as energy moves through trophic levels it is no longer available to the previous level; energy available at each level diminishes progressively because of loss at each level. (b) 100 J. By the 10% law only 10% of energy passes to the next level: Producers 10,000 J → Primary consumers 1,000 J → Secondary consumers 100 J.",
    solutionSteps: ["[1 mark] (a) Energy captured by plants does not revert to solar input, and energy passed to herbivores does not go back to autotrophs; as energy moves through successive trophic levels it is no longer available to the previous level (any two reasons, ½ each).", "[1 mark] (b) By the 10% law, only about 10% of the energy at one trophic level is transferred to the next.", "[1 mark] (b) Producers 10,000 J → primary consumers 1,000 J → secondary consumers 100 J. Energy available to secondary consumers = 100 J."],
    finalAnswer: "(a) Energy does not flow back to the previous level / is progressively lost at each level; (b) 100 J (10,000 → 1,000 → 100 J by the 10% law).",
    ncertRef: "PYQ 31/3/1 Q33", isCompetencyBased: true,
    sourceOverride: "others",
  },
];
