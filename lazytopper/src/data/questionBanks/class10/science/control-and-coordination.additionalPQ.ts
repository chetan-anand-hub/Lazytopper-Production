import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "control-and-coordination"
// Extraction date: 2026-05-25

export const CONTROL_COORDINATION_APQ: CanonicalQuestion[] = [
  // Science-PQ Q29 (Section C, Short, 3 marks)
  { id: "APQ-S-CTRL-001", subject: "Science", topicKey: "control-and-coordination", subtopic: "Hormone Action on Multiple Organs", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In animals, hormones can be secreted by one organ and can act on multiple organs. Justify this statement by explaining the effect of a single animal hormone on three organs.",
    answer: "Adrenaline acts on sweat glands, heart, and digestive blood vessels.",
    solutionSteps: ["Adrenaline (secreted by adrenal glands) on sweat glands: induces more sweat production (\"fight or flight\" response).", "Adrenaline on heart: increases force/rate of contraction of cardiac muscles — pumps more oxygenated blood.", "Adrenaline on blood vessels of digestive system: constricts them (diverts blood to muscles instead). Hence one hormone, three organs."],
    finalAnswer: "Adrenaline → sweat glands (more sweat), heart (stronger pumping), digestive vessels (constriction).",
    ncertRef: "APQ Science-PQ Q29", isCompetencyBased: true },

  // Science-PQ Q35 OR variant (Section D, Long, 5 marks)
  { id: "APQ-S-CTRL-002", subject: "Science", topicKey: "control-and-coordination", subtopic: "Reflex vs Voluntary Actions", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Sagar saw a beautiful rose and smelled it. As he was smelling it, he happened to touch a thorn and pull his hand away. State TWO differences and similarities each in the way the nervous system performs the two actions. (b) Are all involuntary actions reflex actions? Justify.",
    answer: "See solutionSteps for 2 similarities + 2 differences + reflex vs involuntary distinction.",
    solutionSteps: ["Similarity 1: Both signals initiated by receptors at specific sense organs (olfactory in nose; pain in hand).", "Similarity 2: Both use neurotransmitters released and accepted by neurons to carry impulse.", "Difference 1: Smelling the rose is VOLUNTARY; pulling hand away is INVOLUNTARY (reflex).", "Difference 2: Smelling — impulse reaches the brain and back (long pathway). Pulling hand — impulse travels only to spinal cord and back (reflex arc, much faster).", "(b) NO, not all involuntary actions are reflex. Reflexes require an external stimulus and reflex arc (e.g., touching thorn). Many involuntary actions (heartbeat, peristalsis, breathing) occur continuously without external stimulus — controlled by medulla and autonomic nervous system, not by a reflex arc."],
    finalAnswer: "2 similarities + 2 differences listed; not all involuntary = reflex.",
    ncertRef: "APQ Science-PQ Q35 (OR variant)", isCompetencyBased: true },

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q9 (Section A, MCQ, 1 mark)
  { id: "APQ-S-CTRL-003", subject: "Science", topicKey: "control-and-coordination", subtopic: "Plant Hormones — Phototropism and Auxin", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Rajesh noticed that a potted plant kept in the window of his room shows bending towards sunlight. This could be due to:",
    options: [
      "More growth in the well lit region due to diffusion of auxin hormone",
      "More growth in the region away from light due to diffusion of auxin hormone",
      "More growth in the well lit region due to diffusion of cytokinin hormone",
      "More growth in the region away from light due to diffusion of cytokinin hormone"
    ],
    answer: "More growth in the region away from light due to diffusion of auxin hormone",
    solutionSteps: ["Auxin synthesised at the shoot tip diffuses away from light to the shaded side of the stem.", "Higher auxin concentration on the shaded side promotes more cell elongation there ⟹ the shaded side grows longer ⟹ the shoot bends TOWARDS light (positive phototropism)."],
    finalAnswer: "(b) More growth in the region away from light due to diffusion of auxin hormone",
    ncertRef: "APQ Science-PQ2 Q9", isCompetencyBased: true },

  // Science-PQ2 Q30 (Section C, Short, 3 marks)
  { id: "APQ-S-CTRL-004", subject: "Science", topicKey: "control-and-coordination", subtopic: "Brain Regions — Forebrain, Medulla, Cerebellum", section: "C", marks: 3, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Given below are some disorders noticed in some patients. It could be due to malfunctioning of which part of the brain? (a) Loss of sensation of feeling full (b) Lowered ability to salivate (c) Difficulty in maintaining the posture and balance in body",
    answer: "(a) Forebrain; (b) Medulla in hind-brain; (c) Cerebellum.",
    solutionSteps: ["(a) Loss of sensation of feeling full (satiety centre) is controlled by the FOREBRAIN.", "(b) Salivation is an involuntary action controlled by the MEDULLA in the hind-brain.", "(c) Maintenance of posture and balance is controlled by the CEREBELLUM (part of the hind-brain)."],
    finalAnswer: "(a) Forebrain; (b) Medulla; (c) Cerebellum.",
    ncertRef: "APQ Science-PQ2 Q30", isCompetencyBased: true },

  // Science-PQ2 Q35 OR variant (Section D, Long, 5 marks)
  { id: "APQ-S-CTRL-005", subject: "Science", topicKey: "control-and-coordination", subtopic: "Hormonal Regulation — Insulin and Adrenaline", section: "D", marks: 5, format: "Long", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "(a) How does blood sugar level get regulated in the human body? (b) (i) Which hormone is secreted into the blood when you are under stress? Name the gland that secretes this hormone. (ii) How does it help the body to cope up in an emergency situation?",
    answer: "(a) Insulin (with feedback). (b)(i) Adrenaline from adrenal gland. (b)(ii) Increased heart rate and breathing rate.",
    solutionSteps: ["[1 mark] (a) Regulation of blood sugar: When the blood sugar level rises, the beta-cells of the pancreas detect it and secrete more of the hormone INSULIN.", "[1 mark] (a) Insulin lowers the blood sugar level by promoting the uptake of glucose and its conversion into glycogen; when the level falls, less insulin is secreted — this is controlled by a FEEDBACK MECHANISM.", "[1 mark] (b)(i) Under stress the hormone ADRENALINE is secreted into the blood; it is secreted by the ADRENAL GLAND, situated above the kidneys.", "[1 mark] (b)(ii) Adrenaline acts on the heart, making it beat faster so that more oxygenated blood is supplied to the skeletal muscles.", "[1 mark] (b)(ii) It also increases the breathing rate through contraction of the diaphragm and rib muscles and diverts blood to the muscles — preparing the body for a 'fight or flight' response."],
    finalAnswer: "(a) Insulin + feedback; (b) adrenaline from adrenal gland — speeds heart and breathing for emergencies.",
    ncertRef: "APQ Science-PQ2 Q35 (OR variant)", isCompetencyBased: true },
];
