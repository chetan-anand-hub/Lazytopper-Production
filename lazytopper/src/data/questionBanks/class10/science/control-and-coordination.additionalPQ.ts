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
];
