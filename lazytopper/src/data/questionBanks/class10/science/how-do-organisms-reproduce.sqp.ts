import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * How do Organisms Reproduce — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "how-do-organisms-reproduce"
 * Section distribution: A=1, B=1, D=1
 * Note: Deleted subtopics avoided (Reproductive Health / Contraception / Family Planning / STIs).
 * Q35 focuses on male/female reproductive anatomy and pregnancy physiology (retained content).
 */
export const HOW_DO_ORGANISMS_REPRODUCE_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-REPR-001",
    "subject": "Science",
    "topicKey": "how-do-organisms-reproduce",
    "subtopic": "Vegetative Propagation — Genetic Similarity",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A farmer wants to grow banana plants genetically similar enough to the plants already available in his field. Which one of the following methods would you suggest for this purpose?",
    "options": [
      "(A) Regeneration",
      "(B) Budding",
      "(C) Vegetative propagation",
      "(D) Sexual reproduction"
    ],
    "answer": "(C) Vegetative propagation",
    "solutionSteps": [
      "Vegetative propagation (asexual) produces offspring genetically identical to the parent (clones). For bananas, suckers/rhizomes are commonly used. Sexual reproduction introduces genetic variation. Regeneration and budding are also asexual but vegetative propagation is the standard horticultural method for bananas. Answer: (C)."
    ],
    "finalAnswer": "(C) Vegetative propagation",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-REPR-002",
    "subject": "Science",
    "topicKey": "how-do-organisms-reproduce",
    "subtopic": "Post-Fertilisation Changes in Flowering Plants",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "State the post-fertilisation changes that lead to fruit formation in plants.",
    "options": [],
    "answer": "Zygote → embryo; ovule → seed; ovary → fruit; petals/sepals/stamens/style shrivel and fall off.",
    "solutionSteps": [
      "After fertilisation, the zygote divides several times to form an embryo within the ovule. The ovule develops a tough coat and is gradually converted into a seed.",
      "The ovary grows rapidly and ripens to form a fruit. The petals, sepals, stamens, style and stigma may shrivel and fall off."
    ],
    "finalAnswer": "Zygote → embryo; ovule → seed; ovary → fruit; other floral parts wither.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-REPR-003",
    "subject": "Science",
    "topicKey": "how-do-organisms-reproduce",
    "subtopic": "Human Reproductive System — Anatomy & Physiology",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "Given below are certain situations. Analyse and describe its possible impact on a person:\n(a) Testes of a male boy are not able to descend into scrotum during his embryonic development.\n(b) Vas deferens of a man is plugged.\n(c) Prostate and seminal vesicles are not functional.\n(d) Egg is not fertilised in a human female.\n(e) Placenta does not attach to the uterus optimally.\n\n[OR]\n\n(a) A doctor has advised Sameer to reduce sugar intake in his diet and do regular exercise after checking his blood test reports. Which disease do you think Sameer is suffering from? Name the hormone responsible for this disease and the organ producing the hormone.\n(b) Which hormone is present in the areas of rapid cell division in a plant and which hormone inhibits the growth?",
    "options": [],
    "answer": "Main: anatomy/physiology impacts (a–e listed). OR Alt: (a) Diabetes; Insulin; Pancreas. (b) Cytokinins promote cell division; Abscisic acid inhibits growth.",
    "solutionSteps": [
      "(a) Sperm formation will be adversely affected because spermatogenesis requires a temperature lower than core body temperature (the scrotum keeps testes ~2 °C cooler). Undescended testes → reduced or absent sperm production.",
      "(b) Vas deferens is the passage for sperm transfer from testis to urethra. If plugged, sperms cannot be transferred further — leading to infertility despite normal sperm production.",
      "(c) Prostate gland and seminal vesicles produce secretions that nourish sperm and form the medium (semen) for sperm transport. If non-functional, sperms lack nourishment and proper transport medium.",
      "(d) If the egg is not fertilised, it lives for about one day. Then the thickened lining of the uterus breaks, leading to discharge of blood and mucus along with the unfertilised egg — this is called menstruation.",
      "(e) Placenta provides nutrition and oxygen to the growing embryo. Sub-optimal attachment will impair nutrition and oxygen supply, affecting embryo growth and possibly causing serious complications.",
      "OR (alternative): (a) Diabetes; hormone = Insulin; organ = Pancreas. (b) Cytokinins are present in regions of rapid cell division and promote it; Abscisic acid inhibits growth."
    ],
    "finalAnswer": "Main: (a)–(e) impacts described. OR Alt: Diabetes/Insulin/Pancreas; Cytokinins/Abscisic acid.",
    "isCompetencyBased": true
  }
];
