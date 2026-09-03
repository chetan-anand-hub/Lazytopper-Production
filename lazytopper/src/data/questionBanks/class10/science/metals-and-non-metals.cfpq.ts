import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * metals-and-non-metals — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 3.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 3 occupies pdf pages 20-26: questions on pdf pages 20-23 (printed
 *   folios 19-22), the multiple-choice answer key on pdf page 24 (folio 23), and
 *   the step-marking rubrics on pdf pages 25-26 (folios 24-25). pdf page 27 is
 *   the Chapter-4 divider.
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 (verified across all 142
 *   folio-bearing pages, zero exceptions). Each row carries its exact pdf page in
 *   an inline comment; `CanonicalQuestion` has no provenance field and
 *   `predictionTypes.ts` is out of scope — see [FU-CFPQ-NO-CITATION-FIELD].
 *
 * EXTRACTION METHOD: all body text in this booklet is converted to vector curves,
 *   so `page.get_text()` returns only the folio. Rows were transcribed by eye from
 *   pages rendered at 200 dpi — the method established by
 *   `light-reflection-and-refraction.cfpq-sqp25.ts` (Chapter 10).
 *
 * SOLUTIONS: solution steps are mapped 1:1 from the official marking rubrics on
 *   pdf pages 25-26, including the rubric's own half-mark splits. The five MCQs
 *   carry authored reasoning (the official key gives only an option index) and are
 *   listed in `MNM_CFPQ_AUTHORED_SOLUTION_IDS`.
 *
 * NO pyqYear (practice booklet, not a board paper). NO competency-type field
 *   (the booklet prints none). `isCompetencyBased: true` only.
 *
 * SHARED STIMULUS: Q1-Q5 sit under one un-numbered stimulus (Krunal's copper /
 *   iron electrolysis set-up), separated in the source by DASHED rules. The source
 *   heads it "Answer any four of the following five questions based on the
 *   information given below." — that is an instruction to the test-taker about how
 *   many to attempt, not a property of any question, so all five are extracted and
 *   the stimulus is repeated verbatim in each row so each is answerable standalone.
 *   The stimulus is accompanied by a labelled circuit diagram, but the stimulus
 *   TEXT fully describes the set-up and no stem refers to the figure, so
 *   `requiresDiagram` is false for these five: the questions do not depend on it.
 *
 * WITHHELD: none. All 13 questions extracted; every subjective question's rubric
 *   rows sum exactly to the [N] printed in the question page's right margin.
 *
 * De-duped against the whole bank: all 13 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */

const KRUNAL_STIMULUS =
  "Krunal connected a copper plate and an iron plate to the positive and negative terminals of a battery respectively along with a switch. He immersed the plates into a beaker containing acidified copper sulphate solution.\n\n";

export const MNM_CFPQ: CanonicalQuestion[] = [
  // pdf-page 20 (folio 19) — Q1. Key: pdf-page 24, option 4.
  {
    id: "CFPQ-S-MNM-001",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Reactivity Series and Displacement",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      KRUNAL_STIMULUS +
      "After a few minutes, even before he turned the switch on, he noticed that copper was deposited on the iron plate.\n\nThis could have been due to __________.",
    options: ["electrolysis", "electroplating", "a combination reaction", "a displacement reaction"],
    answer: "a displacement reaction",
    solutionSteps: [
      "[1 mark] Correct option: (4) a displacement reaction. The switch was still open, so no current flowed and neither electrolysis nor electroplating can be responsible. Iron is more reactive than copper, so it displaces copper from copper sulphate solution on its own.",
    ],
    finalAnswer: "a displacement reaction",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 20 (folio 19) — Q2. Key: pdf-page 24, option 2.
  {
    id: "CFPQ-S-MNM-002",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Electrolysis and Electroplating",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText: KRUNAL_STIMULUS + "Which of the following is likely to happen when the current is started?",
    options: [
      "Iron will be deposited on the copper plate.",
      "Copper will continue to be deposited on the iron plate.",
      "No reaction will occur at the iron plate or at the copper plate.",
      "The copper already deposited on the iron plate will go back into the solution.",
    ],
    answer: "Copper will continue to be deposited on the iron plate.",
    solutionSteps: [
      "[1 mark] Correct option: (2) Copper will continue to be deposited on the iron plate. The iron plate is joined to the negative terminal, so it is the cathode; the positive Cu²⁺ ions in solution move to it and are deposited there.",
    ],
    finalAnswer: "Copper will continue to be deposited on the iron plate.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 20 (folio 19) — Q3. Key: pdf-page 24, option 2.
  {
    id: "CFPQ-S-MNM-003",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Reactivity Series and Displacement",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      KRUNAL_STIMULUS +
      "Krunal now replaces the iron plate with a silver plate. He sees that there is no deposition of copper on the silver plate before starting the current.\n\nWhich of the following could be the reason?",
    options: [
      "Silver is more reactive than iron.",
      "Silver is less reactive than copper.",
      "Silver is a poorer conductor of electricity than iron.",
      "Silver is a better conductor of electricity than copper.",
    ],
    answer: "Silver is less reactive than copper.",
    solutionSteps: [
      "[1 mark] Correct option: (2) Silver is less reactive than copper. A metal can displace another from its salt solution only if it is more reactive; silver is below copper in the activity series, so it cannot displace copper.",
    ],
    finalAnswer: "Silver is less reactive than copper.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 21 (folio 20) — Q4. Key: pdf-page 24, option 3.
  {
    id: "CFPQ-S-MNM-004",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Electrolytic Refining of Copper",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      KRUNAL_STIMULUS +
      "What is likely to happen to the concentration of copper sulphate in the solution on passing electric current through the solution in the set-up with the silver plate?",
    options: [
      "It will increase.",
      "It will decrease.",
      "It will remain the same.",
      "(Cannot say without knowing the amount of current passed.)",
    ],
    answer: "It will remain the same.",
    solutionSteps: [
      "[1 mark] Correct option: (3) It will remain the same. Copper is deposited on the cathode, but the copper anode dissolves at the same rate to replace the Cu²⁺ ions removed, so the concentration of copper sulphate in the solution is unchanged.",
    ],
    finalAnswer: "It will remain the same.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 21 (folio 20) — Q5. Key: pdf-page 24, option 1.
  {
    id: "CFPQ-S-MNM-005",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Electrolytic Refining of Copper",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      KRUNAL_STIMULUS +
      "Which of the following will happen to the weights of the silver and copper plates after passing the current for some time?",
    options: [
      "The weight of the silver plate will increase and that of the copper plate will decrease.",
      "The weight of the copper plate will increase and that of the silver plate will decrease.",
      "Both the plates will decrease in weight.",
      "Both the plates will increase in weight.",
    ],
    answer: "The weight of the silver plate will increase and that of the copper plate will decrease.",
    solutionSteps: [
      "[1 mark] Correct option: (1) The weight of the silver plate will increase and that of the copper plate will decrease. The silver plate is the cathode and gains deposited copper, while the copper plate is the anode and dissolves into the solution.",
    ],
    finalAnswer: "The silver plate gains weight and the copper plate loses weight.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 21 (folio 20) — Q6 [5]. Rubric: pdf-page 25.
  {
    id: "CFPQ-S-MNM-006",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Corrosion and Its Prevention",
    section: "D",
    marks: 5,
    format: "Long",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Three pieces of a rust free iron rod are completely coated with the following:\n\n(i) plastic\n(ii) oil paint\n(iii) zinc\n\nAn identical scratch is made on each piece, thus exposing the iron. The pieces of iron are kept exposed to moist air for 10 days and then checked for rust formation.\n\n(a) State if rusting will be observed at the point of the scratch on the three iron pieces.\n(b) Give reasons for your answer in each case.\n(c) Name the process of applying a protective zinc coating to steel or iron.",
    answer:
      "(a) Rust on the plastic coated and painted pieces; no rust on the zinc coated piece. (b) The iron rod is in contact with air and moisture in (i) and (ii); zinc is more reactive than iron and gets oxidised in preference to it in (iii). (c) galvanisation",
    solutionSteps: [
      "[2 marks] (a) (i) Rust will be seen on the plastic coated iron piece. [0.5 marks] (ii) Rust will be seen on the painted iron piece. [0.5 marks] (iii) No rust will be seen on the zinc coated iron piece. [1 mark]",
      "[2 marks] (b) (i) The iron rod is in contact with air and moisture. [0.5 marks] (ii) The iron rod is in contact with air and moisture. [0.5 marks] (iii) Zinc is more reactive than iron and gets oxidised in preference to the iron object. [1 mark]",
      "[1 mark] (c) galvanisation",
    ],
    finalAnswer:
      "(a) rust on (i) and (ii), none on (iii); (b) exposed iron meets air and moisture in (i) and (ii), while zinc is sacrificially oxidised in (iii); (c) galvanisation.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 21 (folio 20) — Q7 [1]. Rubric: pdf-page 25.
  {
    id: "CFPQ-S-MNM-007",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Occurrence of Metals in Nature",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Listed here is the reactivity of certain metals.\n\nMetal | Reaction with air | Reaction with water | Reaction with dilute acids\nGold | Does not oxidise or burn | No reaction | No reaction\nSodium | Burns vigorously to form an oxide | Violent reaction | Violent reaction\nZinc | Burns to form an oxide | Reacts on heating | Reacts to produce hydrogen\nPlatinum | No reaction | Does not dissolve or react | No reaction\n\nFrom the list above, identify the metal(s) that are likely to be found in a pure state in the Earth's crust.",
    answer: "gold and platinum",
    solutionSteps: ["[1 mark] 0.5 marks each for identifying the following: gold; platinum."],
    finalAnswer: "gold and platinum",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 22 (folio 21) — Q8 [2]. Rubric: pdf-page 25.
  {
    id: "CFPQ-S-MNM-008",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Reactivity Series and Displacement",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "The blue-coloured solution of the sulphate salt of metal W is taken in a beaker. Metal powders X, Y and Z are added one after the other to the beaker. The colour changes occurring in the solution are shown below.\n\nW-SO₄ (Blue solution) --Metal X--> Colourless solution --Metal Y--> Pink solution --Metal Z--> Green solution\n\nState what colour change, if any, will occur if metal X is again added to the green solution in the beaker. Explain why.",
    answer: "No colour change will occur, because metal X is less reactive than metal Z.",
    solutionSteps: [
      "[1 mark] No colour change will occur.",
      "[1 mark] Metal X is less reactive than metal Z. OR Metal X is lower than metal Z in the activity series.",
    ],
    finalAnswer:
      "No colour change - X is lower than Z in the activity series, so it cannot displace Z from its salt.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: true,
    diagramDescription:
      "A horizontal reaction scheme of four labelled boxes joined by three arrows. The first box reads 'W-SO₄ Blue solution'; an arrow labelled 'Metal X' leads to 'Colourless solution'; an arrow labelled 'Metal Y' leads to 'Pink solution'; an arrow labelled 'Metal Z' leads to 'Green solution'.",
  },
  // pdf-page 22 (folio 21) — Q9 [4]. Rubric: pdf-page 25.
  {
    id: "CFPQ-S-MNM-009",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Corrosion and Its Prevention",
    section: "E",
    marks: 4,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A piece of iron rusts when it comes in contact with air and moisture. Prakash had two identical shiny iron pieces P and Q. To prevent the pieces from rusting, he coated piece P with oil paint and he galvanized piece Q with a coat of zinc metal. He noticed that the coatings were not complete and that a small part of the iron was exposed in both the pieces.\n\nWhat is Prakash likely to observe about the exposed parts of the two iron pieces after some days? Explain why.",
    answer:
      "The exposed part of piece P is rusted; the exposed part of piece Q is not rusted. Oil painting prevents rusting only by preventing contact of iron with moist air, whereas galvanising also protects by zinc getting oxidised in preference to iron as it is more reactive than iron.",
    solutionSteps: [
      "[2 marks] 1 mark each for the following: The exposed part of piece P is rusted. The exposed part of piece Q not rusted.",
      "[2 marks] 1 mark each for the following: Oil painting prevents rusting only by preventing contact of iron with moist air. [1 mark] Galvanising also protects by zinc getting oxidised in preference to iron as it is more reactive than iron. [1 mark]",
    ],
    finalAnswer:
      "P's exposed part rusts, Q's does not - paint is only a physical barrier, while zinc gives sacrificial protection.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 22 (folio 21) — Q10 [2]. Rubric: pdf-page 26.
  {
    id: "CFPQ-S-MNM-010",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Alloys",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Read the following statements.\n\n(P) Stainless steel does not rust.\n(Q) Iron, nickel and chromium form an alloy.\n\nDoes statement (Q) present a valid explanation for statement (P)? Justify your answer.",
    answer: "Yes, it does, since alloying can change the properties of a metal.",
    solutionSteps: [
      "[1 mark] Yes, it does.",
      "[1 mark] Since alloying can change the properties of a metal.",
    ],
    finalAnswer: "Yes - alloying changes the properties of a metal, so the alloy need not rust as iron does.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 22 (folio 21) — Q11 [3]. Rubric: pdf-page 26.
  {
    id: "CFPQ-S-MNM-011",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Amphoteric Oxides",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A teacher asks her students to identify a metal, M. She gives them the following clues to help them.\n\n(P) Its oxide reacts with both HCl and NaOH.\n(Q) It does not react with hot or cold water but reacts with steam.\n(R) It can be extracted by electrolysis of its ore.\n\n(a) Identify the metal.\n(b) Write the chemical equations for the reaction of the metal with HCl and NaOH respectively.\n(c) What would happen if the metal is reacted with iron oxide?",
    answer:
      "(a) Aluminium; (b) Al₂O₃ + 2NaOH → 2NaAlO₂ + H₂O and Al₂O₃ + 6HCl → 2AlCl₃ + 3H₂O; (c) It would displace iron to form aluminium oxide.",
    solutionSteps: [
      "[0.5 mark] [½ mark] (a) Aluminium",
      "[2 marks] (b) 1 mark each for correct equations: Al₂O₃ + 2NaOH → 2NaAlO₂ + H₂O; Al₂O₃ + 6HCl → 2AlCl₃ + 3H₂O",
      "[0.5 mark] [½ mark] (c) It would displace iron to form aluminium oxide.",
    ],
    finalAnswer:
      "(a) aluminium; (b) Al₂O₃ + 2NaOH → 2NaAlO₂ + H₂O and Al₂O₃ + 6HCl → 2AlCl₃ + 3H₂O; (c) it displaces iron, forming aluminium oxide.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 22 (folio 21) — Q12 [1]. Rubric: pdf-page 26.
  {
    id: "CFPQ-S-MNM-012",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Extraction of Metals - Reduction with Carbon",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A metal oxide on being heated with carbon does NOT produce carbon dioxide.\n\nGive a possible explanation for this behaviour of the metal oxide.",
    answer: "The metal is more reactive than carbon.",
    solutionSteps: ["[1 mark] The metal is more reactive than carbon."],
    finalAnswer: "The metal is more reactive than carbon, so carbon cannot reduce its oxide.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
  // pdf-page 23 (folio 22) — Q13 [2]. Rubric: pdf-page 26.
  {
    id: "CFPQ-S-MNM-013",
    subject: "Science",
    topicKey: "metals-and-non-metals",
    subtopic: "Extraction of Highly Reactive Metals",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A metallic element, M, has the following properties:\n\n- floats on water\n- can be cut with a knife\n- occurs naturally as its chloride, of formula MCl\n- its oxide dissolves in water to form the hydroxide\n\n(a) State the method of manufacture of the metal M.\n(b) Name the major byproduct obtained in the process.",
    answer: "(a) electrolysis of the molten chloride; (b) chlorine",
    solutionSteps: ["[1 mark] (a) electrolysis of the molten chloride", "[1 mark] (b) chlorine"],
    finalAnswer: "(a) electrolysis of the molten chloride; (b) chlorine",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.3 — CFPQ_Science10.pdf, questions pdf pp.20–23 (printed folios 19–22)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — ids whose QUESTION is authentic CFPQ but whose worked SOLUTION
 * was authored here. The five MCQs qualify: the official key (pdf page 24) gives
 * an option index and no reasoning. Every other row's `solutionSteps` come 1:1
 * from the official rubric. Mirrors `LGHT_CFPQ_SQP25_AUTHORED_SOLUTION_IDS`.
 * Not yet consumed - wiring is an owner follow-up.
 */
export const MNM_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-MNM-001",
  "CFPQ-S-MNM-002",
  "CFPQ-S-MNM-003",
  "CFPQ-S-MNM-004",
  "CFPQ-S-MNM-005",
];
