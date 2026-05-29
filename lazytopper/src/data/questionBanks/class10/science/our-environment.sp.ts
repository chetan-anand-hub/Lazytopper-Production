import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * our-environment — CBSE Sample Papers (P5): Science SQP 2022-23 + OnBoard 2023.
 * Extracted 2026-05-29 (Sprint 1). topicKey "our-environment". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const ENVI_SP: CanonicalQuestion[] = [
  {
    "id": "SP-S-2023-ENVI-A-001",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Ozone Layer",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "In the atmosphere, oxygen is converted into ozone by the action of",
    "options": [
      "a. ultraviolet radiations.",
      "b. gamma radiations.",
      "c. infrared radiations.",
      "d. cosmic radiations."
    ],
    "answer": "a. ultraviolet radiations.",
    "solutionSteps": [
      "[1 mark] Correct option is (a). High-energy ultraviolet (UV) radiation splits oxygen molecules (O2) into free oxygen atoms, which combine with O2 to form ozone (O3) in the upper atmosphere."
    ],
    "finalAnswer": "a. ultraviolet radiations.",
    "isCompetencyBased": false
  },
  {
    "id": "SP-S-2023-ENVI-A-002",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Food Chains and Biomagnification",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "In a food chain of plants, frog, snake and vulture, there are pesticides sprayed on plants. Then, which of the following will have the maximum concentration of pesticides in the body?",
    "options": [
      "a. Plants",
      "b. Frog",
      "c. Snake",
      "d. Vulture"
    ],
    "answer": "d. Vulture",
    "solutionSteps": [
      "[1 mark] Correct option is (d). Non-biodegradable pesticides undergo biomagnification, increasing in concentration at each successive trophic level; the vulture, being the top consumer, accumulates the maximum concentration."
    ],
    "finalAnswer": "d. Vulture",
    "isCompetencyBased": true
  },
  {
    "id": "SP-S-2023-ENVI-A-003",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Ozone Depletion",
    "section": "A",
    "marks": 1,
    "format": "Assertion-Reasoning",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Assertion (A): Ozone hole indicates a region of ozone layer that has become thinner. Reason (R): Destruction of ozone layer is mainly due to fluorine atoms present in chlorofluorocarbons. Options: a. Both A and R are true, and R is the correct explanation of A. b. Both A and R are true, and R is not the correct explanation of A. c. A is true but R is false. d. A is false but R is true.",
    "options": [
      "a. Both A and R are true, and R is the correct explanation of A.",
      "b. Both A and R are true, and R is not the correct explanation of A.",
      "c. A is true but R is false.",
      "d. A is false but R is true."
    ],
    "answer": "c. A is true but R is false.",
    "solutionSteps": [
      "[1 mark] Correct option is (c). Assertion is true: an ozone hole is a region of thinned ozone layer. Reason is false: ozone destruction is mainly caused by chlorine (not fluorine) atoms released from chlorofluorocarbons (CFCs)."
    ],
    "finalAnswer": "c. A is true but R is false.",
    "isCompetencyBased": true
  },
  {
    "id": "SP-S-2023-ENVI-B-001",
    "subject": "Science",
    "topicKey": "our-environment",
    "subtopic": "Energy Flow in Ecosystems (10% Law)",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Consider the following food chain: Grass -> Goat -> Tiger. If the tiger has 30 J of energy available in this food chain, how much energy was originally available from grass? Explain.",
    "options": [],
    "answer": "3000 J of energy was originally available from grass.",
    "solutionSteps": [
      "[1 mark] Only 10% of energy is transferred from one trophic level to the next (10% law). The tiger has 30 J, which is 10% of the goat's energy, so the goat had 30 x 10 = 300 J.",
      "[1 mark] The goat's 300 J is 10% of the grass's energy, so grass had 300 x 10 = 3000 J. Hence 3000 J was originally available from grass."
    ],
    "finalAnswer": "3000 J",
    "isCompetencyBased": false
  }
];
