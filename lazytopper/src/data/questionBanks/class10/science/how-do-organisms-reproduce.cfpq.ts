import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * how-do-organisms-reproduce — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 8.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 8 occupies pdf pages 65-69: questions on pdf pages 65-67 (printed
 *   folios 64-66), the multiple-choice answer key on pdf page 68 (folio 67), and
 *   the step-marking rubric on pdf page 69 (folio 68). pdf page 70 is the
 *   Chapter-9 divider.
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 — see
 *   [FU-CFPQ-NO-CITATION-FIELD].
 *
 * ⚠⚠ THE ANSWER KEY IN THIS CHAPTER IS MIS-NUMBERED. The question paper runs
 *   Q1-Q11; the step-marking rubric runs Q4-Q12. The rubric is offset by +1 from
 *   paper numbering for every free-response question. Rows here are therefore
 *   paired with rubric rows BY CONTENT, never by number, and the pairing is proven
 *   three independent ways:
 *     1. COUNT — the paper has exactly 9 free-response questions (Q3-Q11) and the
 *        rubric has exactly 9 rows (4-12). One-to-one, no slack.
 *     2. CONTENT — every pairing is semantically locked and could not attach to
 *        any other question: rubric 8 "stamens/anthers" can only answer paper Q7
 *        (which part removed to prevent self-pollination); rubric 12 "(a)
 *        meristematic tissue" can only answer paper Q11 (plant tissue like
 *        neoblasts); rubric 7 "U" can only answer paper Q6 (the region for in
 *        vitro fertilisation); and so on for all nine.
 *     3. MARKS — every rubric row's total equals the [N] printed in that paper
 *        question's right margin. Nine for nine.
 *   The mapping applied: paper Q3←rubric 4, Q4←5, Q5←6, Q6←7, Q7←8, Q8←9, Q9←10,
 *   Q10←11, Q11←12. See [FU-CFPQ-CH8-KEY-MISNUMBERED].
 *
 * ⚠ The MCQ answer table (pdf page 68) lists THREE rows (1→1, 2→4, 3→1) but the
 *   paper has only TWO MCQs, Q1 and Q2. Paper Q3 is a free-response item ("true or
 *   false? Justify your answer.") with a [1] margin mark and no options at all, and
 *   the rubric gives it a full free-response answer. The third table row is
 *   therefore uninterpretable — an option index into a list that does not exist —
 *   and is disregarded rather than treated as a competing answer. Q3 is extracted
 *   from the rubric, whose answer is locked to it by both content and marks. Rows
 *   1 and 2 are content-verified against the two real MCQs.
 *
 * EXTRACTION METHOD: body text is vector curves, not text; transcribed by eye from
 *   pages rendered at 165 dpi.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * SHARED STIMULUS: Q4, Q5 and Q6 sit under one un-numbered Venn-diagram stimulus,
 *   separated by DASHED rules. The stimulus and a full description of the diagram's
 *   eight regions are repeated in each row so each is answerable standalone.
 *
 * WITHHELD: none. All 11 questions extracted.
 *
 * De-duped against the whole bank: all 11 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */

const VENN =
  "In the diagram below, each labelled region (P to W) represents a certain combination of reproductive processes found in an animal. Each labelled region is characterised by the different circles that it is (or is not) a part of.\n\n";

const VENN_DESC =
  "A three-circle Venn diagram. The circles are labelled 'Internal fertilisation' (upper left), 'Embryo develops inside the mother's body' (upper right) and 'Embryo gets nutrition directly from the mother's body' (lower centre). The eight regions are lettered: P = internal fertilisation only; S = internal fertilisation and embryo develops inside the mother, but no direct nutrition; T = embryo develops inside the mother only; R = the central region, all three; Q = internal fertilisation and direct nutrition, but embryo does not develop inside the mother; U = embryo develops inside the mother and gets direct nutrition, but fertilisation is not internal; V = direct nutrition only; W = outside all three circles.";

export const REPR_CFPQ: CanonicalQuestion[] = [
  // pdf-page 65 (folio 64) — Q1. Key: pdf-page 68, option 1.
  {
    id: "CFPQ-S-REPR-001",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Reproductive Health and Contraception",
    section: "A",
    marks: 1,
    format: "Assertion-Reasoning",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two statements are given - one labelled Assertion (A) and the other labelled Reason (R). Read the statements carefully and choose the option that correctly describes statements A and R.\n\nAssertion (A): Oral contraceptive pills and copper-T do not prevent sexually transmitted diseases.\nReason (R): Sexually transmitted disease are transmitted by contact with mucous membranes of infected organs.",
    options: [
      "Both A and R are true and R is the correct explanation of A.",
      "Both A and R are true but R is not the correct explanation of A.",
      "A is true but R is false.",
      "A is false but R is true.",
    ],
    answer: "Both A and R are true and R is the correct explanation of A.",
    solutionSteps: [
      "[1 mark] Correct option: (1) Both A and R are true and R is the correct explanation of A. Neither pills nor copper-T forms a barrier at the mucous membranes, and it is exactly that contact route named in R which explains why these methods cannot prevent transmission.",
    ],
    finalAnswer: "Both A and R are true and R is the correct explanation of A.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: false,
  },
  // pdf-page 65 (folio 64) — Q2. Key: pdf-page 68, option 4.
  {
    id: "CFPQ-S-REPR-002",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Human Male Reproductive System",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Remembering",
    questionText:
      "The diagram below represents the male human reproductive system.\n\nIdentify the part that is responsible for the secretion of testosterone.",
    options: ["P", "Q", "R", "S"],
    answer: "S",
    solutionSteps: [
      "[1 mark] Correct option: (4) S, the testis. Testosterone is secreted by the testes; the other labelled parts are ducts and glands of the tract and do not produce it.",
    ],
    finalAnswer: "S",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: true,
    diagramDescription:
      "A line diagram of the human male reproductive system in side view, with four leader lines labelled P, Q, R and S running to the right. P and Q point to structures high in the abdomen (the seminal vesicle and prostate region), R points to the duct running down from them, and S points to the oval organ inside the scrotum at the bottom (the testis).",
  },
  // pdf-page 65 (folio 64) — Q3 [1]. Rubric row 4: pdf-page 69.
  {
    id: "CFPQ-S-REPR-003",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Sex Determination in Humans",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "\"The biological sex of an individual only depends on the sperm cell.\"\n\nIs the above statement true or false? Justify your answer.",
    answer:
      "True. All egg cell contains only X chromosome. It is the sperm that may contain an X or a Y chromosome and so depending on which sperm unites with the egg, the biological sex of the individual is determined.",
    solutionSteps: [
      "[1 mark] True. All egg cell contains only X chromosome. It is the sperm that may contain an X or a Y chromosome and so depending on which sperm unites with the egg, the biological sex of the individual is determined.",
    ],
    finalAnswer:
      "True - every egg carries an X chromosome, so it is the sperm's X or Y that decides the sex.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: false,
  },
  // pdf-page 66 (folio 65) — Q4 [1]. Rubric row 5: pdf-page 69.
  {
    id: "CFPQ-S-REPR-004",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Modes of Reproduction in Animals",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText: VENN + "Name any one animal whose mode of reproduction is represented by region P.",
    answer: "Any animal that lays eggs after internal fertilisation such as birds, lizards, etc.",
    solutionSteps: [
      "[1 mark] Any animal that lays eggs after internal fertilisation such as birds, lizards, etc.",
    ],
    finalAnswer: "A bird or a lizard - internal fertilisation, but the egg is laid and develops outside.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: true,
    diagramDescription: VENN_DESC,
  },
  // pdf-page 66 (folio 65) — Q5 [2]. Rubric row 6: pdf-page 69.
  {
    id: "CFPQ-S-REPR-005",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Modes of Reproduction in Animals",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      VENN +
      "The description of a species of fish called 'guppy' is given below:\n\n\"Guppies are live-bearing fish, with a gestation period of 21-30 days. Once inseminated, female guppies can store sperm in their ovaries, which can continue to fertilize ova up to eight months, meaning the female mate can give birth to the male's offspring long after the male's death.\"\n\n(a) Based on the given information, which labelled regions CAN guppies belong to?\n(b) What additional information is required to identify the labelled region in the diagram that guppies ACTUALLY belong to?",
    answer:
      "(a) R or S; (b) whether the embryo gets nutrition directly from the mother's body",
    solutionSteps: [
      "[1 mark] (a) R or S [0.5 marks for each]",
      "[1 mark] (b) whether the embryo gets nutrition directly from the mother's body",
    ],
    finalAnswer:
      "(a) R or S; (b) whether the embryo receives nutrition directly from the mother.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: true,
    diagramDescription: VENN_DESC,
  },
  // pdf-page 66 (folio 65) — Q6 [1]. Rubric row 7: pdf-page 69.
  {
    id: "CFPQ-S-REPR-006",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Modes of Reproduction in Animals",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      VENN +
      "'In vitro fertilisation' is a process of fusing a human egg and sperm outside a woman's body, in a laboratory. After fertilisation, the zygote is allowed to develop into an embryo for 2-6 days. The embryo is then implanted in the woman's uterus, where it develops normally.\n\nWhich labelled region in the diagram BEST represents reproduction via in vitro fertilisation?",
    answer: "U",
    solutionSteps: ["[1 mark] U"],
    finalAnswer: "U - fertilisation is not internal, but the embryo develops inside the mother and receives nutrition directly.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: true,
    diagramDescription: VENN_DESC,
  },
  // pdf-page 67 (folio 66) — Q7 [1]. Rubric row 8: pdf-page 69.
  {
    id: "CFPQ-S-REPR-007",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Sexual Reproduction in Flowering Plants",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Bindu wants to produce a hybrid variety of tomatoes. She has tomato plants X and Y belonging to two different varieties, one with smooth, long fruits and the other one with wrinkled, round fruits.\n\nTomatoes have bisexual flowers. Bindu carries out the following steps carefully to cross pollinate the flowers of plants X and Y:\n\n1. She removes a part of the flowers of tomato plant X just before the flowers bloom.\n2. She manually pollinates the flowers of tomato plant X using pollen from the flowers of tomato plant Y.\n3. She ties small plastic bags around the pollinated flowers of tomato plant X. The plastic bags are removed after a couple of days.\n\nBindu carried out step 1 so as to prevent self-pollination. Which part did she remove?",
    answer: "stamens/anthers",
    solutionSteps: ["[1 mark] stamens/anthers"],
    finalAnswer: "the stamens (anthers)",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: false,
  },
  // pdf-page 67 (folio 66) — Q8 [1]. Rubric row 9: pdf-page 69.
  {
    id: "CFPQ-S-REPR-008",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Vegetative Propagation",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Plants produced through vegetative propagation are genetically identical to their parents.\n\nWhat could be the biggest disadvantage of vegetative propagation?",
    answer:
      "Both the parent plant and the progeny will be susceptible to same pathogen which can wipe out the entire population; or less genetic diversity as no new variety will be produced.",
    solutionSteps: [
      "[1 mark] For any disadvantage such as: Both the parent plant and the progeny will be susceptible to same pathogen which can wipe out the entire population; less genetic diversity as no new variety will be produced.",
    ],
    finalAnswer:
      "No genetic variation - one pathogen can wipe out the whole population.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: false,
  },
  // pdf-page 67 (folio 66) — Q9 [2]. Rubric row 10: pdf-page 69.
  {
    id: "CFPQ-S-REPR-009",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Vegetative Propagation",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A farmer bought some strawberries and liked the taste. He decided to grow his own strawberries that should have the same taste.\n\n(a) Which method of cultivation should the farmer adopt?\n(b) Why would the farmer choose this method?",
    answer:
      "(a) asexual reproduction / vegetative propagation; (b) because fruit produced through vegetative propagation would carry conserved parental characteristics",
    solutionSteps: [
      "[1 mark] (a) asexual reproduction / vegetative propagation",
      "[1 mark] (b) because fruit produced through vegetative propagation would carry conserved parental characteristics",
    ],
    finalAnswer:
      "(a) vegetative propagation; (b) the offspring are genetically identical, so the taste is preserved.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: false,
  },
  // pdf-page 67 (folio 66) — Q10 [2]. Rubric row 11: pdf-page 69.
  {
    id: "CFPQ-S-REPR-010",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Asexual Reproduction in Unicellular Organisms",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "What could be the TWO most likely reasons for unicellular organisms to reproduce only through asexual reproduction?",
    answer:
      "They can produce a large number of offsprings in a small period of time; the offsprings are adapted to survive in the same environment.",
    solutionSteps: [
      "[1 mark] They can produce a large number of offsprings in a small period of time.",
      "[1 mark] The offsprings are adapted to survive in the same environment.",
    ],
    finalAnswer:
      "Rapid production of many offspring, and offspring already adapted to the same environment.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: false,
  },
  // pdf-page 67 (folio 66) — Q11 [3]. Rubric row 12: pdf-page 69.
  {
    id: "CFPQ-S-REPR-011",
    subject: "Science",
    topicKey: "how-do-organisms-reproduce",
    subtopic: "Regeneration",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Planarians can regenerate lost body parts due to the presence of specialised cells called neoblasts. These specialised cells multiply and make a large mass of cells from which different cells undergo changes to become different types of cells and tissues.\n\n(a) In plants, in which type of tissue are cells that have a function similar to neoblasts found?\n(b) How do the characteristics of a planarium formed by regeneration compare with the characteristics of the original planarium? Justify your answer.",
    answer:
      "(a) meristematic tissue; (b) They will be the same, because regeneration does not involve the mixing of gametes.",
    solutionSteps: [
      "[1 mark] (a) meristematic tissue",
      "[2 marks] (b) 1 mark each for the following: They will be the same. Regeneration does not involve the mixing of gametes.",
    ],
    finalAnswer:
      "(a) meristematic tissue; (b) identical, because regeneration involves no mixing of gametes.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.8 — CFPQ_Science10.pdf, questions pdf pp.65–67 (printed folios 64–66)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — ids whose QUESTION is authentic CFPQ but whose worked SOLUTION
 * was authored here. Only the two MCQs qualify: the official key (pdf page 68)
 * gives an option index and no reasoning. Every other row's `solutionSteps` come
 * 1:1 from the official rubric.
 */
export const REPR_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-REPR-001",
  "CFPQ-S-REPR-002",
];
