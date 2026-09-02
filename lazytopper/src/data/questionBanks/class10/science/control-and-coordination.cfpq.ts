import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * control-and-coordination — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 7.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 7 occupies pdf pages 59-64: questions on pdf pages 59-61 (printed
 *   folios 58-60), the multiple-choice answer key on pdf page 62 (folio 61), and
 *   the step-marking rubrics on pdf pages 63-64 (folios 62-63).
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 (verified across all 142
 *   folio-bearing pages, zero exceptions) — see [FU-CFPQ-NO-CITATION-FIELD].
 *
 * EXTRACTION METHOD: body text is vector curves, not text; rows transcribed by eye
 *   from pages rendered at 165 dpi.
 *
 * SOLUTIONS: mapped 1:1 from the official marking rubrics on pdf page 63. The four
 *   MCQs carry authored reasoning — see `CTRL_CFPQ_AUTHORED_SOLUTION_IDS`.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * WITHHELD: none. All 11 questions extracted; every subjective question's rubric
 *   rows sum exactly to the [N] printed in the question page's right margin, and
 *   the MCQ answer table holds exactly the 4 MCQs transcribed.
 *
 * ⚠ Two verbatim source typos preserved, not corrected: Q5's rubric reads "in the
 *   larval and adult stages if the butterfly" ("if" for "of"), and Q7's reads
 *   "like light, gravity etc.while plant growth regulators do" (missing space).
 *
 * De-duped against the whole bank: all 11 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */
export const CTRL_CFPQ: CanonicalQuestion[] = [
  // pdf-page 59 (folio 58) — Q1. Key: pdf-page 62, option 2.
  {
    id: "CFPQ-S-CTRL-001",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Hormones in Animals - Insulin",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Sapna suffers from a condition due to which her average blood sugar level is 174 mg/dL. The average blood sugar level in a healthy adult is <140 mg/dL.\n\nWhich of the following could be the cause of Sapna's condition?",
    options: [
      "insufficient production of thyroxine in her body",
      "insufficient production of insulin in her body",
      "excess production of thyroxine in her body",
      "excess production of insulin in her body",
    ],
    answer: "insufficient production of insulin in her body",
    solutionSteps: [
      "[1 mark] Correct option: (2) insufficient production of insulin in her body. Insulin lowers blood glucose; too little of it leaves the blood sugar persistently high, which is what her reading shows. Excess insulin would lower it, and thyroxine regulates metabolism rather than blood glucose directly.",
    ],
    finalAnswer: "insufficient production of insulin in her body",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 59 (folio 58) — Q2. Key: pdf-page 62, option 3.
  {
    id: "CFPQ-S-CTRL-002",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Plant Hormones - Auxin",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Auxin is a plant hormone that promotes cell elongation and is produced by the apical meristem. It inhibits the growth of lateral buds which are present at nodes (where leaves attach to the stem). As long as sufficient auxin is produced by the apical meristem, the lateral buds remain dormant.\n\nA gardener wants the plants in the hedge that he is growing to become bushier with more branches. Which of the following should he do?",
    options: [
      "spray water on the tips of the stems to increase growth",
      "dig around the plant roots and apply more manure",
      "trim the hedge by cutting off the tips of the stems",
      "remove all the weeds that grow around the hedge",
    ],
    answer: "trim the hedge by cutting off the tips of the stems",
    solutionSteps: [
      "[1 mark] Correct option: (3) trim the hedge by cutting off the tips of the stems. The tips carry the apical meristem that makes the auxin suppressing the lateral buds; removing them releases those buds, so more branches grow and the hedge becomes bushier.",
    ],
    finalAnswer: "trim the hedge by cutting off the tips of the stems",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 59 (folio 58) — Q3. Key: pdf-page 62, option 3.
  {
    id: "CFPQ-S-CTRL-003",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Plant Hormones - Auxin",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Shown in the figure below is a plant in which auxin is synthesised at part X of the plant. Geeta took the potted plant and cut off part X. She then took the plant and kept it near a window with sunlight and observed it after 7 days.\n\nWhich of the following is she likely to have observed?",
    options: [
      "Part Y grew and bent towards the window.",
      "Part Z started growing upwards and out of the soil.",
      "Part Y did not grow at all.",
      "Part Y grew upwards.",
    ],
    answer: "Part Y did not grow at all.",
    solutionSteps: [
      "[1 mark] Correct option: (3) Part Y did not grow at all. Part X, the shoot tip, is where auxin is made; with it removed there is no auxin to drive cell elongation in the stem, so part Y neither grows nor bends towards the light.",
    ],
    finalAnswer: "Part Y did not grow at all.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: true,
    diagramDescription:
      "A potted plant drawn in outline. A leader labelled X points to the very tip of the main stem; a leader labelled Y points to the stem lower down, between leaf pairs; a leader labelled Z points to the roots inside the soil in the pot. Three pairs of leaves branch from the stem.",
  },
  // pdf-page 60 (folio 59) — Q4. Key: pdf-page 62, option 2.
  {
    id: "CFPQ-S-CTRL-004",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Tropic Movements in Plants",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "During pollination, plants ensure that the pollen grain from a species germinates on the stigma of the same species.\n\nWhich of the following ensures this?",
    options: ["hydrotropism", "chemotropism", "phototropism", "geotropism"],
    answer: "chemotropism",
    solutionSteps: [
      "[1 mark] Correct option: (2) chemotropism. The growth of the pollen tube towards the ovule is a directional response to a chemical stimulus, which is chemotropism. Hydrotropism responds to water, phototropism to light and geotropism to gravity.",
    ],
    finalAnswer: "chemotropism",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 60 (folio 59) — Q5 [2]. Rubric: pdf-page 63.
  {
    id: "CFPQ-S-CTRL-005",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Hormones and Development",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Metamorphosis is a biological process by which an animal physically develops after birth or hatching, involving a conspicuous and relatively abrupt change in the animal's body structure through cell growth and differentiation. Some insects, fish, amphibians, molluscs, crustaceans and other groups undergo metamorphosis, which is often accompanied by a change of nutrition source or behaviour.\n\nThe diagram below shows such metamorphosis in butterflies.\n\n(a) What are the chemicals that control such developmental changes in the butterfly's body structure called?\n(b) Name ONE developmental change (other than external changes in body structure) in a human female during puberty brought about by the action of the type of chemicals mentioned in (a).\n(c) What is the most likely genetic difference between the larval and adult stages in the life cycle of the butterfly shown above?",
    answer:
      "(a) hormones; (b) onset of menstrual cycle; (c) There is no genetic difference in the larval and adult stages if the butterfly.",
    solutionSteps: [
      "[½ mark] (a) hormones",
      "[½ mark] (b) onset of menstrual cycle",
      "[1 mark] (c) There is no genetic difference in the larval and adult stages if the butterfly.",
    ],
    finalAnswer:
      "(a) hormones; (b) onset of the menstrual cycle; (c) none - the stages are genetically identical.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: true,
    diagramDescription:
      "A circular life-cycle diagram titled 'Anise Swallowtail Life Cycle'. Four labelled stages are joined by arrows running clockwise: Eggs (a cluster of small spheres, top left), Larva (a striped caterpillar, right), Chrysalis (a pupa, bottom), and Adult (a black and white swallowtail butterfly, left), with an arrow returning from Adult to Eggs.",
  },
  // pdf-page 61 (folio 60) — Q6 [2]. Rubric: pdf-page 63.
  {
    id: "CFPQ-S-CTRL-006",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Plant Hormones - Abscisic Acid",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "(a) As first line of defense, stress hormones are released in humans. As an equivalent, which hormone is most likely to be released as first line of defense in plants?\n(b) There have been reports of plant hormones being found in animal bodies even when they are not synthesised by the animal. What can be the most common pathway of entry of such hormones in animals?",
    answer: "(a) Abscisic acid / ABA; (b) through food",
    solutionSteps: ["[1 mark] (a) Abscisic acid/ ABA", "[1 mark] (b) through food"],
    finalAnswer: "(a) abscisic acid (ABA); (b) through food",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 61 (folio 60) — Q7 [2]. Rubric: pdf-page 63.
  {
    id: "CFPQ-S-CTRL-007",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Plant Hormones and Growth Regulation",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "(a) Name ONE plant hormone that controls directional growth.\n(b) Plant hormones are also referred to as growth regulators and can be controlled by a number of stimuli. Mention ONE point of difference between the functioning of animal growth hormones and plant growth regulators with respect to such control.",
    answer:
      "(a) auxin; (b) Animal growth hormones cannot promote growth under the influence of external stimuli like light, gravity etc.while plant growth regulators do.",
    solutionSteps: [
      "[1 mark] (a) auxin",
      "[1 mark] (b) Animal growth hormones cannot promote growth under the influence of external stimuli like light, gravity etc.while plant growth regulators do.",
    ],
    finalAnswer:
      "(a) auxin; (b) plant growth regulators respond to external stimuli such as light and gravity, animal growth hormones do not.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 61 (folio 60) — Q8 [1]. Rubric: pdf-page 63.
  {
    id: "CFPQ-S-CTRL-008",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Reflex Action and Voluntary Action",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Sheila saw a snake and instantly jumped back. She then slowly moved away from the snake.\n\nWhat is the difference between the two actions of instantly jumping and walking away?",
    answer:
      "The jump was an involuntary quick reflex action; walking away was a voluntary slow action.",
    solutionSteps: [
      "[½ mark] The jump was an involuntary quick reflex action.",
      "[½ mark] Walking away was a voluntary slow action.",
    ],
    finalAnswer: "The jump was an involuntary reflex; walking away was a voluntary action.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 61 (folio 60) — Q9 [2]. Rubric: pdf-page 63.
  {
    id: "CFPQ-S-CTRL-009",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Plant Hormones - Ethylene",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Hema bought some unripe tomatoes and left half of them in a brown paper bag and the other half in an open tray. After two days she noticed that the tomatoes in the paper bag had ripened, but the ones in the open tray had not.\n\n(a) What hormone facilitated the ripening of tomatoes?\n(b) Why did the tomatoes in the paper bag ripen faster?",
    answer:
      "(a) ethylene; (b) Ethylene is a gaseous hormone and the paper bag prevented it from diffusing into the air. Hence the tomatoes ripened faster.",
    solutionSteps: [
      "[1 mark] (a) ethylene",
      "[1 mark] (b) Ethylene is a gaseous hormone and the paper bag prevented it from diffusing into the air. Hence the tomatoes ripened faster.",
    ],
    finalAnswer:
      "(a) ethylene; (b) the bag trapped the gaseous ethylene around the fruit instead of letting it diffuse away.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 61 (folio 60) — Q10 [1]. Rubric: pdf-page 63.
  {
    id: "CFPQ-S-CTRL-010",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Hormones in Animals - Adrenaline",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "While on a roller coaster ride, Aditya noticed an increase in his heartbeat and his breathing. Which hormone is responsible for the changes in Aditya's body?",
    answer: "adrenaline",
    solutionSteps: ["[1 mark] adrenaline"],
    finalAnswer: "adrenaline",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
  // pdf-page 61 (folio 60) — Q11 [1]. Rubric: pdf-page 63.
  {
    id: "CFPQ-S-CTRL-011",
    subject: "Science",
    topicKey: "control-and-coordination",
    subtopic: "Plant Hormones - Abscisic Acid",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "'Plant growth regulators do not always promote growth.'\n\nCite one example in support of the above statement and mention the action of the same.",
    answer: "abscissic acid - promotes ageing and senescence",
    solutionSteps: [
      "[½ mark] abscissic acid",
      "[½ mark] promotes ageing and senescence",
    ],
    finalAnswer: "Abscisic acid, which promotes ageing and senescence rather than growth.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.7 — CFPQ_Science10.pdf, questions pdf pp.59–61 (printed folios 58–60)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — ids whose QUESTION is authentic CFPQ but whose worked SOLUTION
 * was authored here. The four MCQs qualify: the official key (pdf page 62) gives
 * an option index and no reasoning. Every other row's `solutionSteps` come 1:1
 * from the official rubric.
 */
export const CTRL_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-CTRL-001",
  "CFPQ-S-CTRL-002",
  "CFPQ-S-CTRL-003",
  "CFPQ-S-CTRL-004",
];
