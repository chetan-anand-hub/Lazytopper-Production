import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * chemical-reactions-and-equations — CBSE "Competency Focused Practice Questions"
 * (CFPQ), Class 10 Science, Chapter 1.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, booklet created 13 Nov 2022 (39,567,003 / 22,067,517
 *   byte pair; this file is from the Science booklet, 22,067,517 bytes, 145 pages).
 *   Chapter 1 occupies pdf pages 5-10: questions on pdf pages 5-7 (printed folios
 *   4-6), the multiple-choice answer key on pdf page 8 (folio 7), and the
 *   step-marking rubrics on pdf pages 9-10 (folios 8-9). pdf page 11 is the
 *   Chapter-2 divider.
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 (verified across all 142
 *   folio-bearing pages of this booklet, zero exceptions). Each row carries its
 *   exact pdf page in an inline comment. `CanonicalQuestion` has no provenance
 *   field and `predictionTypes.ts` is out of scope for this lane, so the per-row
 *   citation is a comment rather than data — see [FU-CFPQ-NO-CITATION-FIELD].
 *
 * EXTRACTION METHOD: the booklet is a CorelDRAW X8 export in which all body text
 *   is converted to vector curves — `page.get_text()` returns only the folio, so
 *   no text-layer extraction is possible. Rows were transcribed by eye from pages
 *   rendered at 200 dpi. This is the same method used by the earlier
 *   `light-reflection-and-refraction.cfpq-sqp25.ts` (Chapter 10) extraction.
 *
 * SOLUTIONS: free-response solution steps are mapped 1:1 from the official
 *   marking rubrics on pdf pages 9-10, including the rubric's own half-mark
 *   splits. The three MCQs carry AUTHORED reasoning, because the official key
 *   supplies only an option index and no worked justification — those ids are
 *   listed in `CHEM_CFPQ_AUTHORED_SOLUTION_IDS` below (THE DECOUPLE: the
 *   QUESTION is authentic, the worked SOLUTION is not).
 *
 * NO pyqYear. CFPQ is a practice booklet, not a board paper; tagging these rows
 *   with a board year would be a fabricated attribution.
 *
 * NO competency-type field. The booklet prints no per-question competency,
 *   Bloom or skill label anywhere (corpus-wide scan: "competency" appears only in
 *   the preface). Inferring CBSE's taxonomy and recording it as CBSE's would be
 *   the same attribution defect. `isCompetencyBased: true` is set instead, which
 *   is a property of the booklet as a whole and is directly evidenced.
 *
 * WITHHELD: Chapter 1 Q4 (pdf page 6) is NOT in this array. Its part (c) asks for
 *   the equation of hydrogen burning with a "pop" sound, but the official rubric
 *   (pdf page 9) answers with the electrolysis equation 2H2O + energy ---> 2H2 + O2
 *   and awards 0.5 marks "for showing the endothermic nature of the reaction".
 *   The key answers a different reaction than the question asks. Shipping the key
 *   verbatim would give students a wrong answer; substituting the physics-correct
 *   equation would alter an authentic answer. Withheld for owner adjudication —
 *   see [FU-CFPQ-CH1-Q4-KEY-MISMATCH].
 *
 * De-duped against the whole bank: all 10 stems grepped, 0 collisions. (The
 *   pre-existing "thermal decomposition of lead nitrate" rows in
 *   `chemical-reactions-and-equations.sp.ts` and `chemicalReactions.pack1.ts` are
 *   a different question — they ask about brown NO2 fumes, not coefficients.)
 *
 * NOT WIRED. `canonicalQuestionBank.ts` is out of scope for this lane, so these
 *   rows are not yet reachable by any surface. Wiring is an owner follow-up.
 */
export const CHEM_CFPQ: CanonicalQuestion[] = [
  // CFPQ_Science10.pdf pdf-page 5 (folio 4) — Q1. Key: pdf-page 8, option 3.
  {
    id: "CFPQ-S-CHEM-001",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Types of Chemical Reactions - Displacement",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText: "Which of the following is an example of simple displacement?",
    options: [
      "the electrolysis of water",
      "the burning of methane",
      "the reaction of a metal with an acid",
      "the reaction of two salt solutions to form a precipitate",
    ],
    answer: "the reaction of a metal with an acid",
    solutionSteps: [
      "[1 mark] Correct option: (3) the reaction of a metal with an acid. A more reactive metal displaces hydrogen from the acid, so one element displaces another from a compound - a simple (single) displacement reaction.",
    ],
    finalAnswer: "the reaction of a metal with an acid",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
  // CFPQ_Science10.pdf pdf-page 5 (folio 4) — Q2. Key: pdf-page 8, option 4.
  {
    id: "CFPQ-S-CHEM-002",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Chemical Reactions - Necessary Conditions",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText: "Which of the following is a NECESSARY condition for ALL chemical reactions?",
    options: [
      "The reactants should be in the same state.",
      "Energy should be supplied to the reactants.",
      "The reactants should be at the same temperature.",
      "There should be physical contact between the reactants.",
    ],
    answer: "There should be physical contact between the reactants.",
    solutionSteps: [
      "[1 mark] Correct option: (4) There should be physical contact between the reactants. Reactant particles must come into contact in order to collide and react. The other three are not required by every reaction - reactants may be in different states, energy need not be supplied to an exothermic reaction, and equal temperatures are not necessary.",
    ],
    finalAnswer: "There should be physical contact between the reactants.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
  // CFPQ_Science10.pdf pdf-page 5 (folio 4) — Q3. Key: pdf-page 8, option 1.
  {
    id: "CFPQ-S-CHEM-003",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Balanced Chemical Equations",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Given below is the balanced chemical equation for the thermal decomposition of lead nitrate.\n\n2 Pb(NO₃)₂ ---> 2 PbO + 4 NO₂ + O₂\n\nWhich of the following information does the coefficients of PbO and NO₂ in the equation (2 and 4 respectively) tell us?",
    options: [
      "the ratio of the number of moles produced of the two substances",
      "the ratio of the number of atoms in the two substances",
      "the ratio of the mass produced of the two substances",
      "the ratio of the densities of the two substances",
    ],
    answer: "the ratio of the number of moles produced of the two substances",
    solutionSteps: [
      "[1 mark] Correct option: (1) the ratio of the number of moles produced of the two substances. The coefficients in a balanced equation give the mole ratio of the species, so 2 PbO and 4 NO₂ means 2 mol of PbO are produced for every 4 mol of NO₂.",
    ],
    finalAnswer: "the ratio of the number of moles produced of the two substances",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
  // CFPQ_Science10.pdf pdf-page 6 (folio 5) — Q5 [2]. Rubric: pdf-page 9.
  {
    id: "CFPQ-S-CHEM-005",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Corrosion and Rusting",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Eight identical, iron blocks are placed on the ground in the two arrangements X and Y as shown below. The block arrangements are kept moist by sprinkling water every few hours\n\nWhich of the arrangements is likely to gather more rust after ten days? Justify your answer.",
    answer: "Arrangement Y",
    solutionSteps: [
      "[1 mark] Arrangement Y.",
      "[½ mark] Rusting is a surface phenomenon.",
      "[½ mark] Arrangement Y has a larger surface area exposed to air.",
    ],
    finalAnswer:
      "Arrangement Y - rusting is a surface phenomenon and Y has a larger surface area exposed to air.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: true,
    diagramDescription:
      "Eight identical cubic iron blocks resting on a flat ground plane, in two arrangements. X (left): four blocks laid side by side in a single horizontal row. Y (right): four blocks stacked one above another into a vertical tower. The two groups are labelled X and Y beneath them.",
  },
  // CFPQ_Science10.pdf pdf-page 7 (folio 6) — Q6 [1]. Rubric: pdf-page 9.
  {
    id: "CFPQ-S-CHEM-006",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Reaction of Metals with Water",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "The following chemical equation does not represent a chemical reaction that can take place.\n\n3 Fe (s) + 4 H₂O (l) ------> Fe₃O₄ (s)\n\nState what needs to be changed in the equation above for it to represent the correct reaction between Fe and H₂O.",
    answer: "The water should be in the form of steam, not liquid.",
    solutionSteps: ["[1 mark] The water should be in the form of steam, not liquid."],
    finalAnswer: "The water should be in the form of steam, not liquid.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
  // CFPQ_Science10.pdf pdf-page 7 (folio 6) — Q7 [2]. Rubric: pdf-page 9.
  {
    id: "CFPQ-S-CHEM-007",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Types of Chemical Reactions - Double Displacement",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Trupti mixes an aqueous solution of sodium sulphate (Na₂SO₄) and an aqueous solution of copper chloride (CuCl₂).\n\nWill this lead to a double displacement reaction? Justify your answer.",
    answer: "There will be no reaction.",
    solutionSteps: [
      "[1 mark] There will be no reaction.",
      "[1 mark] For either of the following: all the ions will be in solution; there is no insoluble product formed on mixing the two solutions.",
    ],
    finalAnswer:
      "No - there will be no reaction, because no insoluble product is formed and all the ions remain in solution.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
  // CFPQ_Science10.pdf pdf-page 7 (folio 6) — Q8 [1]. Rubric: pdf-page 9.
  {
    id: "CFPQ-S-CHEM-008",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Combination and Decomposition Reactions",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Dilip was comparing combination reactions with decomposition reactions.\n\nWhich class of chemical substances may be the product of a decomposition reaction but NOT a product of a combination reaction?",
    answer: "element",
    solutionSteps: ["[1 mark] element"],
    finalAnswer: "element",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
  // CFPQ_Science10.pdf pdf-page 7 (folio 6) — Q9 [1]. Rubric: pdf-page 9.
  {
    id: "CFPQ-S-CHEM-009",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Classification of Chemical Reactions",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Creating",
    questionText:
      "Write the balanced chemical equation of any one reaction that CANNOT be classified as combination, decomposition, simple displacement or double displacement.",
    answer: "Any correct example, such as CH₄ + 2 O₂ ---> CO₂ + 2 H₂O",
    solutionSteps: [
      "[1 mark] For any correct example, such as: CH₄ + 2 O₂ ---> CO₂ + 2 H₂O, or 6 CO₂ + 6 H₂O ---> C₆H₁₂O₆ + 6 O₂.",
    ],
    finalAnswer: "CH₄ + 2 O₂ ---> CO₂ + 2 H₂O (or any other correct example)",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
  // CFPQ_Science10.pdf pdf-page 7 (folio 6) — Q10 [3]. Rubric: pdf-pages 9-10.
  {
    id: "CFPQ-S-CHEM-010",
    subject: "Science",
    topicKey: "chemical-reactions-and-equations",
    subtopic: "Types of Chemical Reactions - Decomposition",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Tina finds a paper covered with a white substance in a chemistry lab. She keeps the paper near the window of the lab and comes back to pick it up after five hours to take it home. She noticed that the white substance had turned grey.\n\n(a) What could be the most likely substance on the paper that Tina found?\n(b) The substance changed from white to grey. Write the chemical equation for this reaction.\n(c) State ONE application of this property of the substance seen in daily life.",
    answer:
      "(a) silver chloride (AgCl) / silver bromide (AgBr); (b) 2AgCl → 2Ag + Cl₂ OR 2AgBr → 2Ag + Br₂; (c) in black and white photography",
    solutionSteps: [
      "[1 mark] (a) silver chloride (AgCl) / silver bromide (AgBr)",
      "[1 mark] (b) 2AgCl → 2Ag + Cl₂ OR 2AgBr → 2Ag + Br₂",
      "[1 mark] (c) in black and white photography. (Accept any other valid answer.)",
    ],
    finalAnswer:
      "(a) silver chloride / silver bromide; (b) 2AgCl → 2Ag + Cl₂; (c) black and white photography",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.1 — CFPQ_Science10.pdf, questions pdf pp.5–7 (printed folios 4–6)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — ids whose QUESTION is authentic CFPQ but whose worked SOLUTION
 * was authored here. The official MCQ key (pdf page 8) gives only an option
 * index, so the reasoning in these three rows is not CBSE's. Every other row's
 * `solutionSteps` are mapped 1:1 from the official marking rubric.
 *
 * Mirrors `LGHT_CFPQ_SQP25_AUTHORED_SOLUTION_IDS`. Not yet consumed: wiring it
 * into `canonicalQuestionBank.ts` is an owner follow-up (that file is out of
 * scope for this lane).
 */
export const CHEM_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-CHEM-001",
  "CFPQ-S-CHEM-002",
  "CFPQ-S-CHEM-003",
];
