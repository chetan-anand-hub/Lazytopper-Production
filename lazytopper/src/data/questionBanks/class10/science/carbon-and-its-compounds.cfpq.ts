import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * carbon-and-its-compounds — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 4.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 4 occupies pdf pages 28-37: questions on pdf pages 28-32 (printed
 *   folios 27-31), the multiple-choice answer key on pdf page 33 (folio 32), and
 *   the step-marking rubrics on pdf pages 34-37 (folios 33-36).
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 (verified across all 142
 *   folio-bearing pages, zero exceptions). Each row carries its exact pdf page in
 *   an inline comment — see [FU-CFPQ-NO-CITATION-FIELD].
 *
 * EXTRACTION METHOD: all body text in this booklet is converted to vector curves,
 *   so `page.get_text()` returns only the folio. Rows were transcribed by eye from
 *   pages rendered at 200 dpi.
 *
 * SOLUTIONS: mapped 1:1 from the official marking rubrics on pdf pages 34-37,
 *   half-mark splits included. The four MCQs carry authored reasoning (the key
 *   gives only an option index) — see `CARB_CFPQ_AUTHORED_SOLUTION_IDS`.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * STRUCTURAL FORMULAE are transcribed in standard condensed notation
 *   (`CH₃–CO–CH₃` for a drawn skeleton with a vertical `=O`). This preserves every
 *   atom and bond of the printed structure; where the stem itself points at the
 *   drawing ("shown below", "given below") `requiresDiagram` is also set, so the
 *   contract keeps the row off public pages until the figure exists.
 *
 * ⚠ Q2's options are the bare labels "P", "Q", "R", "S", printed as numbered
 *   choices beneath four drawn functional groups. This is NOT the withheld
 *   figure-valued-options class: the printed option text really is the letter, and
 *   the key indexes 1-4 against those numbered rows. Contrast Ch2 Q2, where there
 *   were no numbered options at all and the key's numbering did not match the
 *   printed A-D labels. Extracted with `requiresDiagram: true`.
 *
 * WITHHELD: none. All 19 questions extracted; every subjective question's rubric
 *   rows sum exactly to the [N] printed in the question page's right margin.
 *
 * De-duped against the whole bank: all 19 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */
export const CARB_CFPQ: CanonicalQuestion[] = [
  // pdf-page 28 (folio 27) — Q1. Key: pdf-page 33, option 4.
  {
    id: "CFPQ-S-CARB-001",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Combustion of Carbon Compounds",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "On undergoing complete combustion in an adequate supply of oxygen, an organic compound produces only carbon dioxide and water vapour as the products.\n\nBased on this information, which of the following homologous series could the compound belong to?\n\nP) alkanes\nQ) alcohols\nR) aldehydes",
    options: ["only P", "only P or Q", "only Q or R", "any - P, Q or R"],
    answer: "any - P, Q or R",
    solutionSteps: [
      "[1 mark] Correct option: (4) any - P, Q or R. Alkanes, alcohols and aldehydes all contain only carbon, hydrogen and (in the last two) oxygen, so complete combustion of any of them can give only carbon dioxide and water vapour. The information therefore does not narrow the series down.",
    ],
    finalAnswer: "any - P, Q or R",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 28 (folio 27) — Q2. Key: pdf-page 33, option 4.
  {
    id: "CFPQ-S-CARB-002",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Functional Groups in Carbon Compounds",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A compound with which of the following functional groups is MOST LIKELY to cause the decomposition of baking soda to produce carbon dioxide?",
    options: ["P", "Q", "R", "S"],
    answer: "S",
    solutionSteps: [
      "[1 mark] Correct option: (4) S, the carboxyl group (—COOH). Baking soda is sodium hydrogencarbonate and reacts with an acid to release carbon dioxide; of the four groups shown only the carboxyl group is acidic. P is a hydroxyl group, Q an aldehyde group and R a ketone group.",
    ],
    finalAnswer: "S",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: true,
    diagramDescription:
      "Four drawn functional groups in a row, each labelled beneath. P: a bond to —OH. Q: a carbon bonded to H above and double-bonded to O below (an aldehyde group, —CHO). R: a carbon with bonds on both sides and a double bond down to O (a ketone group, —CO—). S: a carbon double-bonded up to O and single-bonded to —OH (a carboxyl group, —COOH).",
  },
  // pdf-page 28 (folio 27) — Q3. Key: pdf-page 33, option 2.
  {
    id: "CFPQ-S-CARB-003",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Addition Reactions of Unsaturated Hydrocarbons",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "1 mole of ethene and 1 mole of ethyne are separately made to completely undergo addition reaction to form the respective saturated compound.\n\nWhich of the following will be DIFFERENT for the two reactions?\n\nP) the number of moles of the saturated compound formed\nQ) the number of moles of the hydrogen consumed",
    options: ["only P", "only Q", "both P and Q", "neither P nor Q"],
    answer: "only Q",
    solutionSteps: [
      "[1 mark] Correct option: (2) only Q. Each mole of hydrocarbon gives one mole of the saturated product, so P is the same for both. Ethene has one C=C and needs 1 mole of hydrogen, while ethyne has a C≡C and needs 2 moles, so only Q differs.",
    ],
    finalAnswer: "only Q",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 28 (folio 27) — Q4. Key: pdf-page 33, option 1.
  {
    id: "CFPQ-S-CARB-004",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Saturated and Unsaturated Carbon Compounds",
    section: "A",
    marks: 1,
    format: "Assertion-Reasoning",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two statements are given - one labelled Assertion (A) and the other labelled Reason (R). Read the statements carefully and choose the option that correctly describes statements A and R.\n\nAssertion (A): Vegetable oils are healthier than animal fats.\nReason (R): Vegetable oils generally have long unsaturated carbon chains while animal fats have saturated carbon chains.",
    options: [
      "Both A and R are true and R is the correct explanation for A.",
      "Both A and R are true and R is not the correct explanation for A.",
      "A is true but R is false.",
      "A is false but R is true.",
    ],
    answer: "Both A and R are true and R is the correct explanation for A.",
    solutionSteps: [
      "[1 mark] Correct option: (1) Both A and R are true and R is the correct explanation for A. Vegetable oils are indeed considered healthier, and the reason given - that they contain unsaturated chains while animal fats are saturated - is exactly why.",
    ],
    finalAnswer: "Both A and R are true and R is the correct explanation for A.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 29 (folio 28) — Q5 [3]. Rubric: pdf-page 34.
  {
    id: "CFPQ-S-CARB-005",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Saturated and Unsaturated Carbon Compounds",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Alkanes are saturated compounds of carbon and hydrogen that can be represented by the general formula CₙH₂ₙ₊₂ where 'n' is the number of carbon atoms. An example of such a compound is ethane C₂H₆.\n\nMaya has a compound of carbon and hydrogen whose formula is C₃H₄.\n\n(i) What is true about the type of flame this compound will give on combustion?\n\n(ii) Draw all the possible straight chain structures of this compound.",
    answer:
      "(i) The compound being unsaturated will burn with a sooty or smoky flame. (ii) CH₂=C=CH₂ and H–C≡C–CH₃",
    solutionSteps: [
      "[1 mark] (i) The compound being unsaturated will burn with a sooty or smoky flame.",
      "[2 marks] (ii) 1 mark each for the following two straight-chain structures: CH₂=C=CH₂ (each terminal carbon carrying two H atoms, with two C=C double bonds); H–C≡C–CH₃ (a C≡C triple bond with a terminal CH₃ group).",
    ],
    finalAnswer:
      "(i) a sooty/smoky flame, because it is unsaturated; (ii) CH₂=C=CH₂ and H–C≡C–CH₃",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 29 (folio 28) — Q6 [1]. Rubric: pdf-page 34.
  {
    id: "CFPQ-S-CARB-006",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Test for Unsaturation",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Bromine water is a reddish solution of bromine (Br₂) in water. When shaken with an unsaturated hydrocarbon, the red colour of the bromine water disappears because the bromine is used up in an addition reaction.\n\nKohli has three test tubes containing hexane, hexene and hexyne respectively. Which of the three compounds can he identify using the bromine water test? Give a reason for your answer.",
    answer: "hexane - only hexane will not decolourise the bromine water.",
    solutionSteps: [
      "[½ mark] hexane",
      "[½ mark] Only hexane will not decolourise the bromine water.",
    ],
    finalAnswer: "hexane, because it alone is saturated and so does not decolourise bromine water.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 29 (folio 28) — Q7 [3]. Rubric: pdf-page 34.
  {
    id: "CFPQ-S-CARB-007",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Structural Isomerism",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Creating",
    questionText:
      "A carbon compound of molecular formula C₅H₁₀O contains a ketone functional group.\n\nDraw the structures of three isomers of this compound having a ketone group.",
    answer:
      "CH₃–CH₂–CH₂–CO–CH₃, CH₃–CH₂–CO–CH₂–CH₃ and CH₃–CH(CH₃)–CO–CH₃",
    solutionSteps: [
      "[1 mark] CH₃–CH₂–CH₂–CO–CH₃ (the ketone C=O on the second carbon of a straight five-carbon chain).",
      "[1 mark] CH₃–CH₂–CO–CH₂–CH₃ (the ketone C=O on the middle carbon of a straight five-carbon chain).",
      "[1 mark] CH₃–CH(CH₃)–CO–CH₃ (a branched chain with a methyl group on the carbon next to the C=O).",
    ],
    finalAnswer:
      "CH₃–CH₂–CH₂–CO–CH₃; CH₃–CH₂–CO–CH₂–CH₃; CH₃–CH(CH₃)–CO–CH₃",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 29 (folio 28) — Q8 [3]. Rubric: pdf-pages 34-35.
  {
    id: "CFPQ-S-CARB-008",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Esterification",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Ethanol, C₂H₅OH is heated with alkaline potassium permanganate to give a compound X.\n\nC₂H₅OH --(alkaline KMnO₄ + heat)--> X\n\n(a) How many carbon atoms will compound X contain?\n\n(b) Compound X is now reacted with ethanol in the presence of an acid catalyst to give a compound Y.\n\nX + C₂H₅OH --(acid)--> Y\n\n(i) Name the type of compound formed in the above reaction with respect to the functional group it contains.\n(ii) State one characteristic property of compounds of the type of compound Y.\n(iii) State one use of compounds of this type.",
    answer: "(a) two; (b)(i) ester; (ii) sweet smell; (iii) perfumes / flavouring agents",
    solutionSteps: [
      "[1 mark] (a) two",
      "[1 mark] (b)(i) ester",
      "[1 mark] (b)(ii) sweet smell [0.5 marks]; (b)(iii) 0.5 marks for any of: perfumes; flavouring agents. (Any other correct use should also be awarded full marks.)",
    ],
    finalAnswer:
      "(a) two carbon atoms; (b)(i) an ester; (ii) it has a sweet smell; (iii) used in perfumes or as a flavouring agent.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 30 (folio 29) — Q9 [3]. Rubric: pdf-page 35.
  {
    id: "CFPQ-S-CARB-009",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Structural Isomerism",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Compounds with identical molecular formula but different structures are called structural isomers.\n\n(a) In the case of saturated hydrocarbons, what is the MINIMUM number of carbon atoms needed in a molecule for it to have a structural isomer?\n(b) Draw the structural isomers of the saturated hydrocarbon having the minimum number of carbon atoms mentioned in (a).",
    answer: "(a) four; (b) CH₃–CH₂–CH₂–CH₃ and CH₃–CH(CH₃)–CH₃",
    solutionSteps: [
      "[1 mark] (a) four",
      "[2 marks] (b) 1 mark each for the following isomers: CH₃–CH₂–CH₂–CH₃ (straight chain); CH₃–CH(CH₃)–CH₃ (branched, with a methyl group on the middle carbon).",
    ],
    finalAnswer: "(a) four; (b) CH₃–CH₂–CH₂–CH₃ and CH₃–CH(CH₃)–CH₃",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 30 (folio 29) — Q10 [3]. Rubric: pdf-page 35.
  {
    id: "CFPQ-S-CARB-010",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Saturated and Unsaturated Carbon Compounds",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "An open-chain hydrocarbon X having the general formula of CₙH₂ₙ₋₂ is hydrogenated in the presence of a catalyst.\n\n(a) State the number of moles of hydrogen required to completely saturate 1 mole of compound X.\n(b) The hydrocarbon X contains carbon-carbon single bonds. Apart from the single bonds, state the number and the type of other carbon-carbon bonds that could possibly be present in the compound X.",
    answer: "(a) 2 moles; (b) two C-C double bonds, or one C-C triple bond",
    solutionSteps: [
      "[1 mark] (a) 2 moles",
      "[2 marks] (b) 1 mark for each of the following: two C-C double bonds; one C-C triple bond.",
    ],
    finalAnswer: "(a) 2 moles of hydrogen; (b) either two C–C double bonds or one C–C triple bond.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 30 (folio 29) — Q11 [3]. Rubric: pdf-page 35.
  {
    id: "CFPQ-S-CARB-011",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Functional Groups in Carbon Compounds",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Shown below are the structural formulae of four carbon compounds.\n\nP: CH₃–CO–CH₃    Q: CH₃–CH(OH)–CH₃    R: CH₃–CH₂–CO–OH    S: CH₃–OH\n\n(a) Two of these compounds are more likely to have similar chemical properties. Identify these two compounds. Give a reason for your answer.\n(b) Identify which of these compounds are likely to have the same boiling point. Justify your answer.",
    answer:
      "(a) Q and S, because they have the same functional group; (b) none of them, because they are all different chemical substances.",
    solutionSteps: [
      "[1.5 marks] (a) Q and S [0.5 marks]; They have the same functional group. [1 mark]",
      "[1.5 marks] (b) none of them [0.5 marks]; They are all different chemical substances. [1 mark]",
    ],
    finalAnswer:
      "(a) Q and S - they share the same functional group; (b) none - they are all different substances.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: true,
    diagramDescription:
      "A four-cell table of drawn structural formulae, each labelled beneath. P: CH₃–C–CH₃ with a double bond down to O (propanone). Q: CH₃–CH–CH₃ with a single bond down to OH (propan-2-ol). R: CH₃–CH₂–C–OH with a double bond down to O (propanoic acid). S: CH₃–OH (methanol).",
  },
  // pdf-page 30 (folio 29) — Q12 [2]. Rubric: pdf-page 35.
  {
    id: "CFPQ-S-CARB-012",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Dehydration of Alcohols",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Heating an alcohol with concentrated sulphuric acid results in the dehydration of the alcohol to give the alkene as shown by the reaction of ethanol to give ethene.\n\nCH₃CH₂OH --(Hot conc. sulphuric acid)--> CH₂=CH₂\n\nPramila heated 2-butanol (shown below) with concentrated sulphuric acid.\n\nCH₃CH₂CHCH₃ with an OH group on the third carbon\n\nWrite the structural formulae of all the possible products of the reaction.",
    answer: "CH₃CH=CHCH₃ and CH₃CH₂CH=CH₂",
    solutionSteps: [
      "[1 mark] CH₃CH=CHCH₃",
      "[1 mark] CH₃CH₂CH=CH₂",
    ],
    finalAnswer: "CH₃CH=CHCH₃ and CH₃CH₂CH=CH₂",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: true,
    diagramDescription:
      "Two drawn items. First, a reaction arrow labelled 'Hot conc. sulphuric acid' from CH₃CH₂OH to CH₂=CH₂. Second, the structure of 2-butanol drawn as CH₃CH₂CHCH₃ with a vertical bond from the third carbon down to an OH group.",
  },
  // pdf-page 31 (folio 30) — Q13 [4]. Rubric: pdf-pages 35-36.
  {
    id: "CFPQ-S-CARB-013",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Esterification",
    section: "E",
    marks: 4,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Ethyl propanoate is a colourless compound with a pineapple-like smell. It is present naturally in some fruits such as kiwis and strawberries.\n\nThe structural formula of ethyl propanoate is given below.\n\nCH₃-CH₂-CO-O-CH₂-CH₃\n\n(a) Write the names of the carboxylic acid and the alcohol from which this compound is formed.\n(b) Apart from mixing the carboxylic acid and the alcohol, what should be done to form this compound?",
    answer:
      "(a) acid - propanoic acid / propionic acid; alcohol - ethanol / ethyl alcohol. (b) add an acid catalyst and heat the reaction mixture.",
    solutionSteps: [
      "[2 marks] (a) 1 mark for each name: acid - propanoic acid / propionic acid; alcohol - ethanol / ethyl alcohol.",
      "[2 marks] (b) 1 mark for each of the following: add an acid catalyst; heat the reaction mixture.",
    ],
    finalAnswer:
      "(a) propanoic acid and ethanol; (b) add an acid catalyst and heat the mixture.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: true,
    diagramDescription:
      "The structural formula of ethyl propanoate drawn as CH₃ - CH₂ - C - O - CH₂ - CH₃ with a vertical double bond from the third carbon down to an O atom.",
  },
  // pdf-page 31 (folio 30) — Q14 [1]. Rubric: pdf-page 36.
  {
    id: "CFPQ-S-CARB-014",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Molecular Formulae of Hydrocarbons",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "An alkane has 11 carbon atoms arranged within ring structures as shown below.\n\nWhat is the molecular formula of the alkane?",
    answer: "C₁₁H₂₀",
    solutionSteps: ["[1 mark] C₁₁H₂₀"],
    finalAnswer: "C₁₁H₂₀",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: true,
    diagramDescription:
      "A carbon skeleton of two rings joined by a single bond: a five-membered ring of carbon atoms on the left and a six-membered ring on the right, linked carbon-to-carbon between them. Every vertex is labelled C; hydrogen atoms are not shown. Eleven carbon atoms in total.",
  },
  // pdf-page 31 (folio 30) — Q15 [3]. Rubric: pdf-page 36.
  {
    id: "CFPQ-S-CARB-015",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Nomenclature of Carbon Compounds",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Manasi wrote the names of four compounds as the first members of their respective homologous series.\n\n- methanol\n- methanal\n- methanone\n- methanoic acid\n\n(a) Which name has she written incorrectly? Justify your answer.\n(b) What name should she have written instead?",
    answer:
      "(a) methanone - the smallest ketone has three carbon atoms, so there is no compound named methanone; (b) propanone",
    solutionSteps: [
      "[2 marks] (a) 1 mark for each of the following: methanone; The smallest ketone has three carbon atoms. OR There is no compound named methanone.",
      "[1 mark] (b) propanone",
    ],
    finalAnswer: "(a) methanone, because the smallest ketone has three carbons; (b) propanone",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 31 (folio 30) — Q16 [2]. Rubric: pdf-page 36.
  {
    id: "CFPQ-S-CARB-016",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Structural Isomerism",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Organic compounds belonging to different homologous series can be isomers. For example, propanal and propanone are isomers.\n\nCan an alkane and an alcohol be isomers? Why or why not?",
    answer:
      "No, they cannot be isomers - alkanes have only carbon and hydrogen atoms, while alcohols have oxygen atoms too.",
    solutionSteps: [
      "[1 mark] No, they cannot be isomers.",
      "[1 mark] Alkanes have only carbon and hydrogen atoms, while alcohols have oxygen atoms too.",
    ],
    finalAnswer: "No - isomers must share a molecular formula, but alcohols also contain oxygen.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 32 (folio 31) — Q17 [4]. Rubric: pdf-page 36.
  {
    id: "CFPQ-S-CARB-017",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Oxidation of Alcohols",
    section: "E",
    marks: 4,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Home-made vinegar is produced from wine. The wine is taken in a clean glass jar and shaken well to aerate it. Some water is added to the jar and then it is kept undisturbed in a dark place at room temperature to undergo fermentation. After 3-4 weeks, the vinegar would be ready to use.\n\n(a) Name the functional groups of the MAIN organic compounds present in wine and vinegar.\n(b) Based on the atoms getting added/removed when wine is converted to vinegar, name the type of reaction that happens.\n(c) Name any chemical reagent that would be used for the same reaction if it is carried out in the laboratory.",
    answer:
      "(a) wine - hydroxyl / alcohol / -OH; vinegar - carboxyl / carboxylic acid / -COOH. (b) oxidation. (c) potassium permanganate / KMnO₄ or potassium dichromate / K₂Cr₂O₇.",
    solutionSteps: [
      "[2 marks] (a) 1 mark for each of the following: wine - hydroxyl / alcohol / -OH; vinegar - carboxyl / carboxylic acid / -COOH.",
      "[1 mark] (b) oxidation",
      "[1 mark] (c) any oxidising agent such as: potassium permanganate / KMnO₄; potassium dichromate / K₂Cr₂O₇.",
    ],
    finalAnswer:
      "(a) hydroxyl in wine, carboxyl in vinegar; (b) oxidation; (c) alkaline KMnO₄ or acidified K₂Cr₂O₇.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 32 (folio 31) — Q18 [1]. Rubric: pdf-page 36.
  {
    id: "CFPQ-S-CARB-018",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Catenation",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Polythene is a plastic made from ethene (CH₂=CH₂). When ethene is subjected to high pressure and moderately high temperatures, ethene molecules react with each other to form large molecules hundreds of times bigger, forming the plastic.\n\nWhich property of carbon atoms is instrumental in the formation of polythene?",
    answer: "catenation - the ability of carbon atoms to link with each other to form long chains",
    solutionSteps: [
      "[1 mark] catenation OR the ability of carbon atoms to link with each other to form long chains",
    ],
    finalAnswer: "catenation",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
  // pdf-page 32 (folio 31) — Q19 [3]. Rubric: pdf-page 37.
  {
    id: "CFPQ-S-CARB-019",
    subject: "Science",
    topicKey: "carbon-and-its-compounds",
    subtopic: "Ethanol and Its Properties",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Study the following information given and answer the questions that follow.\n\nEthanol is a renewable biofuel because it is made from biomass. Ethanol is a clear, colourless alcohol made from a variety of biomass materials. Ethanol producers mostly use food grains and crops with high starch and sugar content such as corn, sorghum, barley, sugar cane, and sugar beets. The most common ethanol production processes today use yeast to ferment the starch and sugars in corn, sugar cane, and sugar beets.\n\n(a) What is the chemical formula for ethanol?\n(b) What other compound is obtained as a by-product when ethanol is obtained from a sugar?\n(c) What would be the products formed when ethanol undergoes complete combustion? Support your answer with a balanced chemical equation.",
    answer:
      "(a) CH₃CH₂OH; (b) carbon dioxide / CO₂; (c) carbon dioxide and water, CH₃CH₂OH + 3 O₂ --> 2 CO₂ + 3 H₂O",
    solutionSteps: [
      "[½ mark] (a) CH₃CH₂OH",
      "[½ mark] (b) carbon dioxide / CO₂",
      "[2 marks] (c) carbon dioxide and water / CO₂ and H₂O [0.5 mark for each product]; CH₃CH₂OH + 3 O₂ --> 2 CO₂ + 3 H₂O [1 mark]",
    ],
    finalAnswer:
      "(a) CH₃CH₂OH; (b) carbon dioxide; (c) CO₂ and H₂O — CH₃CH₂OH + 3 O₂ --> 2 CO₂ + 3 H₂O",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.4 — CFPQ_Science10.pdf, questions pdf pp.28–32 (printed folios 27–31)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — ids whose QUESTION is authentic CFPQ but whose worked SOLUTION
 * was authored here. The four MCQs qualify: the official key (pdf page 33) gives
 * an option index and no reasoning. Every other row's `solutionSteps` come 1:1
 * from the official rubric. Mirrors `LGHT_CFPQ_SQP25_AUTHORED_SOLUTION_IDS`.
 */
export const CARB_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-CARB-001",
  "CFPQ-S-CARB-002",
  "CFPQ-S-CARB-003",
  "CFPQ-S-CARB-004",
];
