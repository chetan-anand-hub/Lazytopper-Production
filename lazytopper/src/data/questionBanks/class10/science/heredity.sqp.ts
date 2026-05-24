import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Heredity — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "heredity"
 * Section distribution: A=1, C=1, E=1 (case-based)
 * Note: Evolution-side subtopics (Natural Selection, Speciation, Fossils, Darwin, Homologous/Analogous Organs)
 * are deleted in CBSE 2025-26. All three retained-Heredity Qs here cover trait expression,
 * sex determination, and monohybrid inheritance.
 */
export const HEREDITY_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-HER-001",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "Genes, Hormones and Expression of Traits",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Height of a plant is regulated by:",
    "options": [
      "(A) DNA which is directly influenced by growth hormone.",
      "(B) Genes which regulate the proteins directly.",
      "(C) Growth hormones under the influence of the enzymes coded by a gene.",
      "(D) Growth hormones directly under the influence a gene."
    ],
    "answer": "(C) Growth hormones under the influence of the enzymes coded by a gene.",
    "solutionSteps": [
      "Genes do not regulate plant height directly. Genes code for specific enzymes; these enzymes catalyse the synthesis of plant growth hormones (e.g., gibberellins, auxins); the hormones then regulate height. So the chain is: Gene → Enzyme → Growth hormone → Plant height. Answer: (C)."
    ],
    "finalAnswer": "(C) Growth hormones under the influence of the enzymes coded by a gene.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-HER-002",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "Sex Determination in Humans",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "What is the probability of a girl or a boy being born in a family? Justify your answer.",
    "options": [],
    "answer": "Equal probability — 50% girl and 50% boy (determined by sperm carrying X or Y from father).",
    "solutionSteps": [
      "There are 50% chances that a girl may be born and 50% chances that a boy may be born.",
      "Humans have 22 pairs of autosomes plus one pair of sex chromosomes. Women have a perfect pair: XX. Men have a mismatched pair: XY (X is full-sized, Y is shorter).",
      "A child receives one X from the mother (always X). From the father, the child receives either an X or a Y. X from father → daughter (XX); Y from father → son (XY). Because sperm carrying X and sperm carrying Y are produced in equal proportions, the probability of a girl or a boy is 1/2 each."
    ],
    "finalAnswer": "Probability of a girl = 1/2; probability of a boy = 1/2. Determined by the X- or Y-bearing sperm from the father.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-HER-003",
    "subject": "Science",
    "topicKey": "heredity",
    "subtopic": "Case-Based — Monohybrid Inheritance of Earlobe Type",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Figures (a) to (d) represent the type of ear lobes present in a family consisting of 2 children — Rahul, Nisha — and their parents. Excited by his observation of different types of ear lobes present in his family, Rahul conducted a survey of the type of ear lobes found in his classmates. He found two types of ear lobes in his classmates as per the frequency given below:\n\nSex | Free | Attached\nMale | 36 | 14\nFemale | 31 | 19\n\nOn the basis of above data answer the following questions.\n(a) [1 mark] Which of the two characteristics — 'free ear lobe' or 'attached ear lobe' appears to be dominant in this case? Why?\n(b) [1 mark] Is the inheritance of the free ear lobe linked with sex of the individual? Give reason for your answer.\n(c) [2 marks] What type of ear lobe is present in father, mother, Rahul and his sister Nisha? Write the genetic constitution of each of these family members which explains the inheritance of this character in this family? (Gene for Free ear lobe is represented by F and gene for attached ear lobe is represented by f.)\n\n[OR]\n\nSuresh's parents have attached ear lobes. What type of ear lobe can be seen in Suresh and his sister Siya? Explain by giving the genetic composition of all.",
    "options": [],
    "answer": "(a) Free is dominant — larger frequency in the population. (b) Not sex-linked — free occurs in both males and females. (c) Father Ff (free), Mother Ff (free), Rahul ff (attached), Nisha Ff (free). OR: Suresh's parents ff/ff → all children ff (attached). Suresh: attached; Siya: attached.",
    "solutionSteps": [
      "Part (a): Free ear lobe is dominant because it is found in a large majority of the surveyed population (36 + 31 = 67 free vs 14 + 19 = 33 attached out of 100). Higher frequency in the population indicates dominance over the attached form.",
      "Part (b): No — the inheritance of free ear lobe is not sex-linked. From both the family observation and the class survey, free ear lobes appear in both males and females in similar proportions, indicating an autosomal (non-sex-linked) trait.",
      "Part (c): The family produces a child with attached lobes (Rahul, ff) although both parents have free lobes — so both parents must be heterozygous carriers Ff (free phenotype, recessive allele hidden). Mother = Ff (free); Father = Ff (free); Rahul = ff (attached); Nisha = Ff (free phenotype).",
      "OR (alternative): Suresh's parents both have attached lobes ⇒ both ff. The cross ff × ff produces only ff offspring. Therefore Suresh = ff (attached) and Siya = ff (attached). If both parents are recessive, all children are necessarily recessive for that trait."
    ],
    "finalAnswer": "(a) Free is dominant; (b) not sex-linked; (c) Father Ff, Mother Ff, Rahul ff, Nisha Ff. OR Suresh ff and Siya ff (both attached).",
    "isCompetencyBased": true
  }
];
