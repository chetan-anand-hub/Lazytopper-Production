import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * acids-bases-and-salts — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 2.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 2 occupies pdf pages 12-18: questions on pdf pages 12-15 (printed
 *   folios 11-14), the multiple-choice answer key on pdf page 16 (folio 15), and
 *   the step-marking rubrics on pdf pages 17-18 (folios 16-17). pdf page 19 is
 *   the Chapter-3 divider.
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
 *   pdf pages 17-18, including the rubric's own half-mark splits. Only the single
 *   surviving MCQ carries authored reasoning (the official key gives an option
 *   index and nothing else) — listed in `ABS_CFPQ_AUTHORED_SOLUTION_IDS`.
 *
 * NO pyqYear (practice booklet, not a board paper). NO competency-type field
 *   (the booklet prints none; inferring CBSE's taxonomy would be a fabricated
 *   attribution). `isCompetencyBased: true` only.
 *
 * TABLES are transcribed inline as text in `questionText`. The source prints them
 *   as ruled tables, but the content is tabular data, not a picture, so nothing is
 *   lost and the question stays self-contained. `requiresDiagram` stays false for
 *   table-only questions.
 *
 * SHARED STIMULUS: Q8, Q9 and Q10 sit under one un-numbered stimulus (the
 *   "Rajesh" paragraph), separated in the source by DASHED rules rather than the
 *   usual solid ones. The stimulus is repeated verbatim in each of the three rows
 *   so each is answerable standalone. Repeating a stimulus is not altering it.
 *
 * WITHHELD: Chapter 2 Q2 (pdf page 12) is NOT in this array. Its four options are
 *   GRAPHS (labelled A-D under the images), not text. Storing them would mean
 *   either authoring prose descriptions and presenting them as CBSE's option text,
 *   or shipping bare labels that cannot be answered. The answer key compounds it:
 *   it gives the numeral "1" while the printed options are lettered A-D, so the
 *   answer also depends on an unstated 1→A mapping — exactly the index-join whose
 *   off-by-one silently produces a wrong answer on authentic content. Withheld
 *   with its page number; id `CFPQ-S-ABS-002` left unused so numbering still
 *   tracks the source. See [FU-CFPQ-FIGURE-VALUED-OPTIONS].
 *
 * De-duped against the whole bank: all 14 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */
export const ABS_CFPQ: CanonicalQuestion[] = [
  // pdf-page 12 (folio 11) — Q1. Key: pdf-page 16, option 3.
  {
    id: "CFPQ-S-ABS-001",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Reactions of Acids with Metal Carbonates",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Adding which of the following to a colourless solution would give an indication that the solution could possibly be hydrochloric acid?",
    options: ["copper metal strips", "silver metal strips", "calcium carbonate", "sodium chloride"],
    answer: "calcium carbonate",
    solutionSteps: [
      "[1 mark] Correct option: (3) calcium carbonate. An acid reacts with a metal carbonate to give brisk effervescence of carbon dioxide, which is a visible test. Copper and silver are below hydrogen in the activity series and do not react with dilute HCl, and sodium chloride gives no visible change.",
    ],
    finalAnswer: "calcium carbonate",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 12 (folio 11) — Q3 [1]. Rubric: pdf-page 17.
  {
    id: "CFPQ-S-ABS-003",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "pH Scale and Dilution",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "The following table lists the pH values of some substances.\n\nSolutions | pH\nhydrochloric acid | 1\nmilk | 6\npure water | 7\nbaking soda | 9\nsodium hydroxide | 14\n\nWhat would happen to the pH of an acid and a base when each is diluted (pure distilled water is added to it)?",
    answer: "The pH of an acid would increase and the pH of a base would decrease.",
    solutionSteps: [
      "[½ mark] The pH of an acid would increase.",
      "[½ mark] The pH of a base would decrease.",
    ],
    finalAnswer: "The pH of an acid would increase; the pH of a base would decrease.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 12 (folio 11) — Q4 [3]. Rubric: pdf-page 17.
  {
    id: "CFPQ-S-ABS-004",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "pH Scale and Properties of Acids and Bases",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "The pH of three solutions is given in the table. Answer the questions that follow.\n\nSolution | pH\nP | 1\nQ | 7\nR | 14\n\n(a) Which of these solutions could possibly react with zinc metal to produce hydrogen gas?\n(b) Which of these solutions could be formed by the reaction of a metal oxide with water?\n(c) Which of these solutions could be the raw material for the industrial manufacture of chlorine?",
    answer: "(a) solution P and solution R; (b) solution R; (c) solution Q",
    solutionSteps: [
      "[1 mark] (a) 0.5 marks each for: solution P; solution R.",
      "[1 mark] (b) solution R",
      "[1 mark] (c) solution Q",
    ],
    finalAnswer: "(a) solutions P and R; (b) solution R; (c) solution Q",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 13 (folio 12) — Q5 [5]. Rubric: pdf-page 17.
  {
    id: "CFPQ-S-ABS-005",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Reactions of Acids with Metals",
    section: "D",
    marks: 5,
    format: "Long",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A remarkable property of acids is that they can 'dissolve' metals. When metals are added to an acid, they disintegrate and disappear into the acid.\n\n(a) State one other common observation when metals 'dissolve' in acids. Explain the reason for this observation.\n\n(b) If the acid with the 'dissolved' metal is evaporated, can we get the metal back? Why or why not?\n\n(c) In this question, the word 'dissolve' is used within quotes. This is because it is not actually an example of dissolving. What is the MAIN difference between a metal 'dissolving' in an acid and sugar dissolving in water?",
    answer:
      "(a) Bubbling is seen, because hydrogen is produced (or the vessel becomes warm, because it is an exothermic reaction); (b) No - the metal is present as a part of a salt solution; (c) Metal dissolving in acid is a chemical change while sugar dissolving in water is a physical change.",
    solutionSteps: [
      "[2 marks] (a) 1 mark each for observation and reason: Observation: Bubbling is seen. Reason: Because hydrogen is produced. OR Observation: The vessel becomes warm. Reason: Because it is an exothermic reaction.",
      "[2 marks] (b) 1 mark each for stating yes/no and for reason: No. The metal is present as a part of a salt solution.",
      "[1 mark] (c) Metal dissolving in acid is a chemical change while sugar dissolving in water is a physical change.",
    ],
    finalAnswer:
      "(a) bubbling, because hydrogen is produced; (b) No - the metal is now part of a salt solution; (c) it is a chemical change, not a physical one.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 13 (folio 12) — Q6 [3]. Rubric: pdf-page 17.
  {
    id: "CFPQ-S-ABS-006",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Reactions of Acids with Carbonates and Hydrogencarbonates",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Sunita carried out the following reactions in the laboratory:\n(i) complete neutralisation of one mole of sodium carbonate with hydrochloric acid\n(ii) complete neutralisation of one mole of sodium bicarbonate with hydrochloric acid\n\nShe found that the amount of carbon dioxide formed in both the reactions was the same.\n\n(a) Is her finding correct? Justify your answer.\n(b) How does the amount of salt formed in case (i) compare with the amount of salt formed in case (ii)?",
    answer:
      "(a) Yes, her finding is correct - 1 mole of CO₂ is produced in both the cases; (b) The amount of salt formed in case (i) is twice the amount of salt formed in case (ii).",
    solutionSteps: [
      "[1 mark] (a) Yes, her finding is correct.",
      "[1 mark] (a) 1 mole of CO₂ is produced in both the cases. (Writing the balanced equations for both the cases should also be accepted as a justification.)",
      "[1 mark] (b) The amount of salt formed in case (i) is twice the amount of salt formed in case (ii).",
    ],
    finalAnswer:
      "(a) Yes - 1 mole of CO₂ forms in both cases; (b) case (i) forms twice as much salt as case (ii).",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 13 (folio 12) — Q7 [2]. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-007",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Dilution and Acidity",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "To prepare a salad dressing, Parag adds a solution of sodium chloride in distilled water to vinegar.\n\nState what change will occur in the following:\n(i) the pH of the vinegar\n(ii) the acidity of the vinegar",
    answer: "(i) The pH will increase. (ii) The acidity will decrease.",
    solutionSteps: ["[1 mark] (i) The pH will increase.", "[1 mark] (ii) The acidity will decrease."],
    finalAnswer: "(i) pH increases; (ii) acidity decreases.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 13 (folio 12) — Q8 [1], shared "Rajesh" stimulus. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-008",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Sodium Hydrogencarbonate - Identification",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Rajesh was given a substance and asked to identify it. He conducted three tests on the substance and recorded the results below.(P) It releases carbon dioxide, water and a sodium salt on heating with water.(Q) It turns universal indicator greenish-blue.(R) It can be prepared from ammonia as a raw material.\n\nWhat substance was Rajesh given?",
    answer: "baking soda / sodium hydrogencarbonate / NaHCO₃",
    solutionSteps: ["[1 mark] baking soda / sodium hydrogencarbonate / NaHCO₃"],
    finalAnswer: "baking soda (sodium hydrogencarbonate, NaHCO₃)",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 13 (folio 12) — Q9 [1], shared "Rajesh" stimulus. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-009",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Uses of Sodium Hydrogencarbonate",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Easy",
    bloomSkill: "Applying",
    questionText:
      "Rajesh was given a substance and asked to identify it. He conducted three tests on the substance and recorded the results below.(P) It releases carbon dioxide, water and a sodium salt on heating with water.(Q) It turns universal indicator greenish-blue.(R) It can be prepared from ammonia as a raw material.\n\nGive ONE use of the substance based on the properties mentioned in P and Q.",
    answer: "Used in antacids / used in toothpaste / used as a first aid in acidic insect bites.",
    solutionSteps: [
      "[1 mark] For any of the following: used in antacids; used in toothpaste; used as a first aid in acidic insect bites.",
    ],
    finalAnswer: "Used in antacids (or in toothpaste, or as first aid for acidic insect bites).",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 13 (folio 12) — Q10 [1], shared "Rajesh" stimulus. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-010",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Sodium Carbonate and Washing Soda",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Rajesh was given a substance and asked to identify it. He conducted three tests on the substance and recorded the results below.(P) It releases carbon dioxide, water and a sodium salt on heating with water.(Q) It turns universal indicator greenish-blue.(R) It can be prepared from ammonia as a raw material.\n\nRajesh later read that recrystallisation of the sodium salt formed in P gives another basic salt that is used in manufacture of borax.\n\nIdentify the sodium salt formed in P.",
    answer: "sodium carbonate / Na₂CO₃",
    solutionSteps: ["[1 mark] sodium carbonate / Na₂CO₃"],
    finalAnswer: "sodium carbonate (Na₂CO₃)",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 14 (folio 13) — Q11 [1]. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-011",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Neutralisation Reaction",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Aditi finds that a mixture of an acid and a base does not change the colour of either red or blue litmus paper.\n\nCompare the amounts of H⁺ and OH⁻ in the solution.",
    answer: "The amount of H⁺ is equal to the amount of OH⁻ in the solution.",
    solutionSteps: ["[1 mark] The amount of H⁺ is equal to the amount of OH⁻ in the solution."],
    finalAnswer: "They are equal - the solution is neutral.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 14 (folio 13) — Q12 [1]. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-012",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "pH Scale and Hydrogen Ion Concentration",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "pH is measured on a scale of 0 to 14, with lower values indicating high hydrogen ion concentration (more acidic) and higher values indicating low hydrogen ion concentration (less acidic). A pH of 7 is considered as neutral. Every whole unit in pH represents a ten-fold increase in or decrease in hydrogen ion concentration.\n\nWhat would the hydrogen ion concentration of a solution of pH 4 be compared to a solution of pH 8?",
    answer:
      "A solution of pH 4 would have 10,000 times higher concentration of hydrogen ions compared to a solution of pH 8.",
    solutionSteps: [
      "[1 mark] A solution of pH 4 would have 10,000 times higher concentration of hydrogen ions compared to a solution of pH 8.",
    ],
    finalAnswer: "10,000 times higher.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
  // pdf-page 14 (folio 13) — Q13 [2]. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-013",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Measurement of pH",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "pH is measured using a pH meter, which comprises a detecting unit consisting of a pH sensitive glass electrode and an indicating unit which indicates the pH as shown below.\n\nTo measure the pH of a solution, the glass electrode is dipped into the solution and the pH is displayed on the screen of the indicating unit. Before measuring the pH of another solution, the glass electrode is rinsed with distilled water and dried carefully with tissue paper.\n\nHow is the pH reading of the second solution likely to be affected if the glass electrode is not dried with tissue paper in the following cases?\n(i) if the second solution being measured is acidic in nature\n(ii) if the second solution being measured is basic in nature",
    answer:
      "(i) The pH meter will indicate a slightly higher pH reading than the actual pH of the solution. (ii) The pH meter will indicate a slightly lower pH reading than the actual pH of the solution.",
    solutionSteps: [
      "[1 mark] (i) The pH meter will indicate a slightly higher pH reading than the actual pH of the solution if the second solution is acidic.",
      "[1 mark] (ii) The pH meter will indicate a slightly lower pH reading than the actual pH of the solution if the second solution is basic.",
    ],
    finalAnswer: "(i) slightly higher than actual; (ii) slightly lower than actual.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: true,
    diagramDescription:
      "A labelled photograph of a benchtop pH meter. The indicating unit is a handheld meter with an LCD showing a pH reading of 7.30 and a second value 2.28; a cable runs from it to a cylindrical glass electrode dipped into a beaker of solution. Callout labels read 'pH reading', 'Indicating unit', 'Glass electrode' and 'Solution', with the caption 'pH meter'. A separate enlarged view of the glass electrode is shown alongside.",
  },
  // pdf-page 15 (folio 14) — Q14 [2]. Rubric: pdf-page 18.
  {
    id: "CFPQ-S-ABS-014",
    subject: "Science",
    topicKey: "acids-bases-and-salts",
    subtopic: "Identification of Acids and Bases",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Dipti has three flasks containing dilute hydrochloric acid, dilute sulphuric acid and dilute sodium hydroxide respectively. The flasks are not labeled and she does not have any pH indicator.\n\n(a) Which of the solutions will she be able to identify just by making mixtures of pairs of the substances.\n(b) What observation will help her to make this identification?",
    answer:
      "(a) the dilute sodium hydroxide; (b) The flasks containing mixtures of sodium hydroxide with hydrochloric acid and with sulphuric acid will be warm to touch.",
    solutionSteps: [
      "[1 mark] (a) the dilute sodium hydroxide",
      "[1 mark] (b) The flasks containing mixtures of sodium hydroxide with hydrochloric acid and with sulphuric acid will be warm to touch.",
    ],
    finalAnswer:
      "(a) the dilute sodium hydroxide; (b) its mixtures with both acids become warm (neutralisation is exothermic).",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.2 — CFPQ_Science10.pdf, questions pdf pp.12–15 (printed folios 11–14)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — ids whose QUESTION is authentic CFPQ but whose worked SOLUTION
 * was authored here. Only the surviving MCQ qualifies: the official key (pdf page
 * 16) gives an option index and no reasoning. Every other row's `solutionSteps`
 * come 1:1 from the official rubric. Mirrors
 * `LGHT_CFPQ_SQP25_AUTHORED_SOLUTION_IDS`. Not yet consumed - wiring is an owner
 * follow-up.
 */
export const ABS_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = ["CFPQ-S-ABS-001"];
