import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "heredity"
// Extraction date: 2026-05-25

export const HEREDITY_APQ: CanonicalQuestion[] = [
  // Science-PQ Q11 (Section A, MCQ, 1 mark)
  { id: "APQ-S-HERED-001", subject: "Science", topicKey: "heredity", subtopic: "Mendelian Genetics — Cross Outcomes", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "In cattle, having horns is a recessive trait (h) to not having horns (H). When cattle with horns are crossed with cattle that do not have horns, the number of offspring having horns was equal to those not having horns. Which of the following is MOST LIKELY to be true?",
    options: [
      "Both parents are homozygous dominant.",
      "One parent is homozygous dominant.",
      "Both parents are heterozygous.",
      "One parent is heterozygous."
    ],
    answer: "One parent is heterozygous.",
    solutionSteps: ["Horned parent is homozygous recessive (hh). For 50:50 ratio of horned:hornless offspring, the hornless parent must contribute H and h equally — meaning heterozygous (Hh).", "Cross: hh × Hh → 50% Hh (hornless), 50% hh (horned). Matches observed ratio. So one parent is heterozygous (the hornless one)."],
    finalAnswer: "(d) One parent is heterozygous.",
    ncertRef: "APQ Science-PQ Q11", isCompetencyBased: true },

  // Science-PQ Q18 (Section A, Assertion-Reasoning, 1 mark)
  { id: "APQ-S-HERED-002", subject: "Science", topicKey: "heredity", subtopic: "Variation and DNA Copying", section: "A", marks: 1, format: "Assertion-Reasoning", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "Assertion (A): Variations always provide a survival advantage to an organism. Reason (R): Variations can be caused due to incorrect DNA copying.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, and R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true."
    ],
    answer: "A is false but R is true.",
    solutionSteps: ["A is false: variations may be advantageous, neutral, or HARMFUL depending on environment. Many variations reduce fitness.", "R is true: errors during DNA replication (copying) are a major source of genetic variation."],
    finalAnswer: "(d) A is false but R is true.",
    ncertRef: "APQ Science-PQ Q18", isCompetencyBased: true },

  // Science-PQ Q30 (Section C, Short, 3 marks)
  { id: "APQ-S-HERED-003", subject: "Science", topicKey: "heredity", subtopic: "Dihybrid Cross — Pea Plants", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "If two pea plants having round and green seeds (RRGg) are crossed, identify the percentage of the following with respect to the F1 generation: (a) gametes having both the round and yellow seed traits (b) offspring having the same genotype as the parents (c) offspring having the same phenotype as the parents",
    answer: "(a) 50%. (b) 50%. (c) 75%.",
    solutionSteps: ["Both parents RRGg ⟹ gametes: RG and Rg (each 50%). (Round, yellow) trait = RG ⟹ 50% of gametes.", "Offspring genotypes from RRGg × RRGg: RRGG (25%), RRGg (50%), RRgg (25%). Same as parent (RRGg) = 50%.", "Phenotype 'round green' requires R_ Gg or R_ GG (yellow is recessive g). Round-green = RRGG (25%) + RRGg (50%) = 75%."],
    finalAnswer: "(a) 50%; (b) 50%; (c) 75%.",
    ncertRef: "APQ Science-PQ Q30", isCompetencyBased: true },

  // Science-PQ Q38 first variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-HERED-004", subject: "Science", topicKey: "heredity", subtopic: "Pedigree Analysis — Sickle Cell Anaemia", section: "E", marks: 4, format: "Case-Based", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "Ram and Asha were a married couple with four children — one had sickle cell anaemia; others showed no symptoms. Ram and Asha showed no symptoms. The trait is not sex-linked. (a) Is the disease caused by a dominant or recessive trait? Why? (b) If the affected child married a person without a mutation in the sickle cell gene, what percentage of their children would have sickle cell anaemia? Show the cross. OR (b) Identify the genetic composition of the sickle cell trait in Asha and Ram and use that to predict the genetic composition in the other four children who did not show symptoms.",
    answer: "(a) Recessive. (b) 0% affected (all carriers, Ss). [OR] Ram and Asha both Ss; unaffected children Ss or SS.",
    solutionSteps: ["(a) Recessive: parents unaffected but child affected ⟹ both parents must be carriers (heterozygous Ss). The trait skips generations, characteristic of recessive inheritance.", "(b) Affected child = ss; unmutated person = SS. Cross ss × SS → all children Ss (carriers, unaffected). 0% affected, 100% carriers.", "[OR] Ram = Ss, Asha = Ss (both unaffected carriers). Cross Ss × Ss → 1 SS : 2 Ss : 1 ss. Unaffected children = SS (homozygous dominant) or Ss (carriers); affected = ss. Three unaffected siblings can be either SS or Ss."],
    finalAnswer: "(a) Recessive; (b) 0% affected, 100% carriers. [OR] Both parents Ss; unaffected sibs either SS or Ss.",
    ncertRef: "APQ Science-PQ Q38", isCompetencyBased: true },

  // Science-PQ Q38 OR variant — using above's second formulation; we already covered both, so no separate row needed.
  // (Both OR variants represented in solutionSteps of APQ-S-HERED-004 above.)
];
