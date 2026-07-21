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
    solutionSteps: ["[1 mark] (a) The disease is caused by a recessive trait — both parents are unaffected yet a child is affected, so the trait appears only when both recessive alleles come together.", "[1 mark] (a) Therefore both Ram and Asha must be heterozygous carriers (Ss); the trait skips generations, which is characteristic of recessive inheritance.", "[1 mark] (b) Affected child (ss) × person with no mutation (SS): the cross ss × SS gives all offspring Ss ⟹ 0% affected, 100% carriers.", "[1 mark] (b OR) Ram (Ss) × Asha (Ss) → 1 SS : 2 Ss : 1 ss; the three unaffected children are either SS or Ss, while the affected child is ss."],
    finalAnswer: "(a) Recessive; (b) 0% affected, 100% carriers. [OR] Both parents Ss; unaffected sibs either SS or Ss.",
    ncertRef: "APQ Science-PQ Q38", isCompetencyBased: true },

  // Science-PQ Q38 OR variant — using above's second formulation; we already covered both, so no separate row needed.
  // (Both OR variants represented in solutionSteps of APQ-S-HERED-004 above.)

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q11 (Section A, MCQ, 1 mark)
  { id: "APQ-S-HERED-005", subject: "Science", topicKey: "heredity", subtopic: "Monohybrid Cross — F2 Genotypic Ratio", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "A cross between pure tall and pure short pea plants gives hybrid tall pea plants in the first generation. What would be the genotypic ratio in the offspring of the second generation if these F1 plants were self-pollinated?",
    options: ["3:1", "9:3:3:1", "1:2:1", "1:1"],
    answer: "1:2:1",
    solutionSteps: ["Cross TT × tt → F1 all Tt (hybrid tall).", "Self-pollination of F1 (Tt × Tt) gives F2 genotypes: TT, Tt, Tt, tt ⟹ GENOTYPIC ratio = 1 TT : 2 Tt : 1 tt = 1:2:1. (Note: phenotypic ratio is 3:1.)"],
    finalAnswer: "(c) 1:2:1",
    ncertRef: "APQ Science-PQ2 Q11", isCompetencyBased: true },

  // Science-PQ2 Q35 first variant (Section D, Long, 5 marks)
  { id: "APQ-S-HERED-006", subject: "Science", topicKey: "heredity", subtopic: "Dihybrid Cross + Unidirectional Energy Flow", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "(a) Flow of energy in a food chain is unidirectional. Justify the statement. (b) (i) In a cross between pea plants having round green seeds and wrinkled yellow seeds, what progeny is expected in F1 and F2 generation? (ii) What would be the impact on the ratio of F2 generation if F1 progeny plants inherited a single whole gene set from each parent? Give reason.",
    answer: "(a) Energy moves only forward, lost as heat at each step. (b)(i) F1 all round-yellow (RrYy); F2 = 9:3:3:1. (b)(ii) Independent assortment lost ⟹ 9:3:3:1 not obtained.",
    solutionSteps: ["(a) Energy captured by autotrophs (producers) does NOT revert to the solar input; energy passed to herbivores does NOT return to autotrophs. As energy moves through trophic levels it is dissipated as heat and is no longer available to lower levels — so the flow is one-way (unidirectional).", "(b)(i) F1: All Round Yellow seeds with genotype RrYy (round R is dominant, yellow Y is dominant).", "(b)(i) F2 (RrYy × RrYy): phenotypic ratio = 9 round yellow : 3 round green : 3 wrinkled yellow : 1 wrinkled green.", "(b)(ii) If F1 inherited a SINGLE whole gene SET from each parent, then traits R and y (or any pair) would be LINKED together and could not assort independently.", "(b)(ii) Therefore the standard 9:3:3:1 ratio would NOT be obtained — only the parental phenotypes would reappear in the ratio determined by the linked combinations."],
    finalAnswer: "(a) Energy lost as heat at each step ⟹ unidirectional; (b)(i) F1 RrYy, F2 9:3:3:1; (b)(ii) linked genes ⟹ no 9:3:3:1.",
    ncertRef: "APQ Science-PQ2 Q35 (first variant)", isCompetencyBased: true },
];
