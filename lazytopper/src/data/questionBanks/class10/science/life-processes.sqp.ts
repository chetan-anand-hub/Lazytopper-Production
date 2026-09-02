import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Life Processes — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "life-processes"
 * Section distribution: A=2, B=1
 */
export const LIFE_PROCESSES_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-LP-001",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Nutrition — Saprophytic Mode (External Digestion)",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Generally food is broken and absorbed within the body of organisms. In which of the following organisms is it done outside the body?",
    "options": [
      "(A) Amoeba",
      "(B) Mushroom",
      "(C) Paramoecium",
      "(D) Lice"
    ],
    "answer": "(B) Mushroom",
    "solutionSteps": [
      "[1 mark] Mushrooms are saprophytes (fungi) and use extracellular digestion: enzymes are secreted onto food (decaying matter), digestion happens outside the body, and the dissolved nutrients are absorbed across the cell wall. Amoeba and Paramoecium do intracellular digestion; lice ingest food internally. Answer: (B)."
    ],
    "finalAnswer": "(B) Mushroom",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-LP-002",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Respiration — Anaerobic in Muscles (Lactic Acid)",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A sportsman, after a long break of his routine exercise, suffered muscular cramps during a heavy exercise session. This happened due to:",
    "options": [
      "(A) lack of carbon dioxide and formation of pyruvate.",
      "(B) presence of oxygen and formation of ethanol.",
      "(C) lack of oxygen and formation of lactic acid.",
      "(D) lack of oxygen and formation of carbon dioxide."
    ],
    "answer": "(C) lack of oxygen and formation of lactic acid.",
    "solutionSteps": [
      "[1 mark] During heavy exercise, oxygen supply to muscles becomes insufficient. Muscles then switch to anaerobic respiration: pyruvate → lactic acid + small ATP. Accumulated lactic acid causes muscle cramps. Ethanol formation happens in yeast, not in human muscles. Answer: (C)."
    ],
    "finalAnswer": "(C) lack of oxygen and formation of lactic acid.",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-LP-003",
    "subject": "Science",
    "topicKey": "life-processes",
    "subtopic": "Excretion — Urine and Urinary System (or Circulation — Arteries vs Veins)",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "What is the purpose of making urine in the human body? Name the organs that store and release the urine.\n\n[OR]\n\nWhy do arteries have thick and elastic walls whereas veins have valves?",
    "options": [],
    "answer": "Main: To filter nitrogenous waste from blood; storage = urinary bladder; release = urethra. OR Alt: Arteries — high-pressure blood → thick elastic walls. Veins — low pressure → valves prevent backflow.",
    "solutionSteps": [
      "[1 mark] Main: Purpose of urine formation — to filter out nitrogenous waste products like urea and uric acid from the blood. Organ for storage: urinary bladder. Organ for release: urethra.",
      "[1 mark] OR (alternative): Blood emerges from the heart under high pressure and flows through arteries — hence the arteries have thick and elastic walls to bear this pressure. Veins carry blood at lower pressure back to the heart, often against gravity; they have valves to ensure that blood flows in only one direction (preventing backflow)."
    ],
    "finalAnswer": "Main: Filter waste; storage = bladder; release = urethra. OR Alt: Arteries thick for high pressure; veins have valves for unidirectional flow.",
    "isCompetencyBased": false
  }
];
