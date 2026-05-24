import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Control and Coordination — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "control-and-coordination"
 * Section distribution: A=1, C=1
 */
export const CONTROL_COORDINATION_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-CNC-001",
    "subject": "Science",
    "topicKey": "control-and-coordination",
    "subtopic": "Receptors — Location of Gustatory Receptors",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "Receptors are usually located in sense organs. Gustatory receptors are present in",
    "options": [
      "(A) tongue",
      "(B) nose",
      "(C) eye",
      "(D) ear"
    ],
    "answer": "(A) tongue",
    "solutionSteps": [
      "Gustatory receptors are taste receptors; located on the tongue (in taste buds). Olfactory = nose; photoreceptors = eye; auditory = ear. Answer: (A)."
    ],
    "finalAnswer": "(A) tongue",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-CNC-002",
    "subject": "Science",
    "topicKey": "control-and-coordination",
    "subtopic": "Endocrine System — Iodine and Thyroxin",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "We are advised to take iodised salt in our diet by doctors. Justify its importance in our body.",
    "options": [],
    "answer": "Iodine is essential for thyroxin synthesis; thyroxin regulates metabolism and growth.",
    "solutionSteps": [
      "Iodine is essential for the synthesis of the thyroxin hormone (produced by the thyroid gland).",
      "Thyroxin regulates carbohydrate, protein and fat metabolism in the body.",
      "Thyroxin provides the best balance for normal growth in the body; iodine deficiency causes goitre and slowed growth, which is why iodised salt is recommended in the diet."
    ],
    "finalAnswer": "Iodine → thyroxin synthesis → metabolic regulation and growth balance.",
    "isCompetencyBased": true
  }
];
