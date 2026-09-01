import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * life-processes — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 6.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 6 occupies pdf pages 44-57: questions on pdf pages 44-52 (printed
 *   folios 43-51), the multiple-choice answer key on pdf page 53 (folio 52), and
 *   the step-marking rubrics on pdf pages 54-57 (folios 53-56).
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 — see
 *   [FU-CFPQ-NO-CITATION-FIELD].
 *
 * KEY TRIANGULATION (run before trusting the rubric, per owner ruling):
 *   COUNT   — 13 free-response questions (Q9-Q21) ↔ 13 rubric rows (9-21). Exact.
 *   CONTENT — each pairing semantically locked (rubric 17 "(a) vein (b) from P to
 *             Q" only answers Q17's blood-vessel cross-section; rubric 20's villi
 *             and blood spaces only Q20's placenta).
 *   MARKS   — every rubric total equals the [N] in the question's right margin,
 *             13 for 13. (Rubric 11(c) is explicitly worth 0 marks in the source;
 *             row 11 still totals the printed [2].)
 *   Result: NO OFFSET. The MCQ answer table holds 8 rows for the 8 MCQs (Q1-Q8).
 *
 * EXTRACTION METHOD: body text is vector curves; transcribed by eye from pages
 *   rendered at 165 dpi.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * ⚠ TWO WITHHELD, for different reasons:
 *   • Q7 (pdf page 46) — the stem asks "Which ROW of the table given below…" and
 *     the table's rows are numbered 1-4, but the printed options are the letters
 *     P, Q, R and S. No row is labelled P, Q, R or S, so the question cannot be
 *     answered as printed; the key's "4" would select an option "S" that indexes
 *     nothing. Id `CFPQ-S-LIFE-007` left unused.
 *     See [FU-CFPQ-CH6-Q7-OPTION-LABEL-MISMATCH].
 *   • Q16 (pdf page 50) — part (b) asks whether lungs and gills are "analogous
 *     organs", and the rubric confirms "Yes, they are analogous organs".
 *     "Analogous Organs" is a board-excluded Evolution term in
 *     `scripts/src/syllabusGuard.ts`, and D2 makes syllabus exclusion a hard gate
 *     that beats the booklet. Withheld as out-of-syllabus content found inside a
 *     chapter that is otherwise fully retained. Id `CFPQ-S-LIFE-016` left unused.
 *     See [FU-CFPQ-EXCLUDED-CONTENT-INSIDE-RETAINED-CHAPTER].
 *
 * De-duped against the whole bank: all 21 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */
export const LIFE_CFPQ: CanonicalQuestion[] = [
  // pdf-page 44 (folio 43) — Q1. Key: pdf-page 53, option 1.
  {
    id: "CFPQ-S-LIFE-001",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Human Heart and Double Circulation",
    section: "A",
    marks: 1,
    format: "Assertion-Reasoning",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Two statements are given - one labelled Assertion (A) and the other labelled Reason (R). Read the statements carefully and choose the option that correctly describes statements A and R.\n\nAssertion (A): Warm-blooded animals have their left and right side of the heart separated for more efficient supply of oxygen to the body.\nReason (R): Warm-blooded animals need high energy to maintain their body temperatures.",
    options: [
      "Both A and R are true and R is the correct explanation for A.",
      "Both A and R are true but R is not the correct explanation for A.",
      "A is true but R is false.",
      "A is false but R is true.",
    ],
    answer: "Both A and R are true and R is the correct explanation for A.",
    solutionSteps: [
      "[1 mark] Correct option: (1) Both A and R are true and R is the correct explanation for A. Keeping a constant body temperature demands a high rate of respiration, which needs an efficient oxygen supply - and that is exactly what a fully separated heart provides by keeping oxygenated and deoxygenated blood apart.",
    ],
    finalAnswer: "Both A and R are true and R is the correct explanation for A.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 44 (folio 43) — Q2. Key: pdf-page 53, option 4.
  {
    id: "CFPQ-S-LIFE-002",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Transport of Oxygen in Blood",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Haemoglobin and Chlorophyll have similar structures.\n\n- A molecule of haemoglobin is composed of the atoms of four elements- carbon, hydrogen, oxygen and nitrogen, all four organised around iron.\n- A chlorophyll is composed of the same elements, which are organised around magnesium.\n\nConsidering the above information, which element of haemoglobin is MOST LIKELY responsible for the red colour of our blood?",
    options: ["hydrogen", "nitrogen", "carbon", "iron"],
    answer: "iron",
    solutionSteps: [
      "[1 mark] Correct option: (4) iron. The two molecules share the same four elements and differ only in the central metal - iron in haemoglobin, magnesium in chlorophyll - so the colour difference must come from that central atom.",
    ],
    finalAnswer: "iron",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 44 (folio 43) — Q3. Key: pdf-page 53, option 4.
  {
    id: "CFPQ-S-LIFE-003",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Photosynthesis",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Many processes happen in the bodies of living organisms.\n\nThose processes which involve the building up of complex molecules from simpler ones are called anabolism. Those which involve the breakdown of complex molecules into simpler ones are called catabolism.\n\nWhich of the following life processes can be considered as an example of anabolism?",
    options: ["digestion", "respiration", "transpiration", "photosynthesis"],
    answer: "photosynthesis",
    solutionSteps: [
      "[1 mark] Correct option: (4) photosynthesis. It builds glucose, a complex molecule, out of the simpler carbon dioxide and water. Digestion and respiration break complex molecules down, and transpiration is loss of water, not a synthesis.",
    ],
    finalAnswer: "photosynthesis",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 45 (folio 44) — Q4. Key: pdf-page 53, option 3.
  {
    id: "CFPQ-S-LIFE-004",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Excretion - Structure of the Nephron",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Given below is a diagram of a nephron.\n\nWhich row of the following table correctly shows where filtration and selective reabsorption occur?\n\nRow | Filtration | Selective reabsorption\n1 | P | Q\n2 | Q | S\n3 | Q | R\n4 | P | R",
    options: [
      "Filtration: P; Selective reabsorption: Q",
      "Filtration: Q; Selective reabsorption: S",
      "Filtration: Q; Selective reabsorption: R",
      "Filtration: P; Selective reabsorption: R",
    ],
    answer: "Filtration: Q; Selective reabsorption: R",
    solutionSteps: [
      "[1 mark] Correct option: (3) filtration at Q and selective reabsorption at R. Q is the glomerulus inside the Bowman's capsule, where blood is filtered, and R is the coiled tubule, where useful substances are selectively reabsorbed back into the blood.",
    ],
    finalAnswer: "Filtration at Q, selective reabsorption at R.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: true,
    diagramDescription:
      "A line diagram of a nephron. A leader labelled P points to the incoming arteriole at the top; Q points to the knot of capillaries (glomerulus) inside the cup-shaped Bowman's capsule; R points to the long coiled tubule below it; and S points to the straight collecting duct on the right. Arrows show the direction of flow.",
  },
  // pdf-page 45 (folio 44) — Q5. Key: pdf-page 53, option 2.
  {
    id: "CFPQ-S-LIFE-005",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Anaerobic Respiration",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Which row in the table below shows the correct products of anaerobic respiration in humans and in yeast?\n\nRow | humans: lactic acid | humans: carbon dioxide | yeast: lactic acid | yeast: carbon dioxide\n1 | X | ✓ | X | X\n2 | ✓ | X | X | ✓\n3 | X | ✓ | ✓ | X\n4 | ✓ | ✓ | ✓ | X",
    options: [
      "humans: lactic acid X, carbon dioxide ✓; yeast: lactic acid X, carbon dioxide X",
      "humans: lactic acid ✓, carbon dioxide X; yeast: lactic acid X, carbon dioxide ✓",
      "humans: lactic acid X, carbon dioxide ✓; yeast: lactic acid ✓, carbon dioxide X",
      "humans: lactic acid ✓, carbon dioxide ✓; yeast: lactic acid ✓, carbon dioxide X",
    ],
    answer:
      "humans: lactic acid ✓, carbon dioxide X; yeast: lactic acid X, carbon dioxide ✓",
    solutionSteps: [
      "[1 mark] Correct option: (2). In humans anaerobic respiration in muscle produces lactic acid only, with no carbon dioxide; in yeast it is fermentation, producing ethanol and carbon dioxide but no lactic acid.",
    ],
    finalAnswer: "Humans give lactic acid only; yeast gives carbon dioxide.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 46 (folio 45) — Q6. Key: pdf-page 53, option 1.
  {
    id: "CFPQ-S-LIFE-006",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Human Digestive System",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Read the following two statements and answer the question.\n\n1. Gastroparesis is a disease in which the muscles of the stomach become paralysed and cannot contract or relax.\n2. Foods high in fat can delay the process of digestion and the emptying of the stomach.\n\nWhich of the following food would be advised to a patient suffering from gastroparesis?",
    options: [
      "soups and juices only",
      "soups and chicken salads only",
      "fried chicken and fried rice",
      "ice cream and milk only",
    ],
    answer: "soups and juices only",
    solutionSteps: [
      "[1 mark] Correct option: (1) soups and juices only. With the stomach muscles paralysed, the food must be low in fat and already liquid so that it can leave the stomach without churning; the other options are either high in fat or need mechanical breakdown.",
    ],
    finalAnswer: "soups and juices only",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 46 (folio 45) — Q8. Key: pdf-page 53, option 1.
  {
    id: "CFPQ-S-LIFE-008",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Aerobic and Anaerobic Respiration",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Read the following statements.\n\nX: amount of carbon dioxide produced per molecule of glucose during aerobic respiration\nY: amount of carbon dioxide produced per molecule of glucose during fermentation by yeast\n\nWhich of the following is TRUE about X and Y?",
    options: ["X is more than Y.", "X is less than Y.", "X is equal to Y.", "(Cannot be determined.)"],
    answer: "X is more than Y.",
    solutionSteps: [
      "[1 mark] Correct option: (1) X is more than Y. Aerobic respiration oxidises glucose completely, giving six molecules of carbon dioxide per glucose, whereas fermentation breaks it only as far as ethanol and gives two.",
    ],
    finalAnswer: "X is more than Y.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 46 (folio 45) — Q9 [3]. Rubric row 9: pdf-page 54.
  {
    id: "CFPQ-S-LIFE-009",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Human Heart and Double Circulation",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Understanding",
    questionText:
      "Human beings exhibit 'double circulation' during which blood is passed through the lungs and heart.\n\n(a) State the route of the first and the second circulation through the chambers of the heart and explain the usefulness of such circulation in humans.\n\n(b) Name the blood vessels that:\n(i) carry oxygenated blood from the lungs to the heart\n(ii) carry deoxygenated blood from the heart to the lungs",
    answer:
      "(a) First circulation: oxygenated blood from lungs comes to the left atrium then the left ventricle to pass to the body. Second circulation: deoxygenated blood from the body comes to the right atrium and then the right ventricle to pass for oxygenation to the lungs again. It allows for separation of oxygenated and deoxygenated blood in the body. (b)(i) pulmonary vein (ii) pulmonary artery",
    solutionSteps: [
      "[2 marks] (a) During first circulation: oxygenated blood from lungs come to the left atrium to left ventricle to pass to the body. During second circulation: deoxygenated blood from body comes to right atrium and then right ventricle to pass for oxygenation to the lungs again. [0.5 marks for each point] Allows for separation of oxygenated and deoxygenated blood in the body. [1 mark]",
      "[1 mark] (b) 0.5 marks for each correct answer: (i) pulmonary vein; (ii) pulmonary artery",
    ],
    finalAnswer:
      "(a) lungs → left atrium → left ventricle → body, and body → right atrium → right ventricle → lungs, keeping oxygenated and deoxygenated blood apart; (b)(i) pulmonary vein, (ii) pulmonary artery.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 47 (folio 46) — Q10 [2]. Rubric row 10: pdf-page 54.
  {
    id: "CFPQ-S-LIFE-010",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Translocation in Plants",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Understanding",
    questionText:
      "A major portion of the carbohydrates produced by plants is stored in different parts of the plant (storage organs). Explain the mechanism by which this stored food is made available when different organs need it for growth.",
    answer:
      "Sugar from the storage organ is moved to the phloem using ATP/energy. This increases osmotic pressure of phloem, which results in intake of water into the phloem. The increased pressure inside the phloem cells moves sugar to cells with lower pressure to reach other organs.",
    solutionSteps: [
      "[2 marks] 0.5 marks for each point: Sugar from storage organ is moved to phloem using ATP/energy. This increases osmotic pressure of phloem. This results in intake of water into the phloem. Increased pressure inside the phloem cells moves sugar to cells with lower pressure to reach other organs.",
    ],
    finalAnswer:
      "Translocation - sugar is actively loaded into the phloem, water follows osmotically, and the resulting pressure drives the sap to organs that need it.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 47 (folio 46) — Q11 [2]. Rubric row 11: pdf-page 54.
  {
    id: "CFPQ-S-LIFE-011",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Hormonal Control of Blood Glucose",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "In human beings, hormonal action is largely controlled by a mechanism where the secretion of one hormone is regulated by the action of another. An example of blood glucose levels control is shown in the diagram below.\n\n(a) What is the mechanism of hormone action known as?\n(b) Which is the sensor X that helps in detecting blood glucose level?\n(c) What would happen if such mechanism is absent in humans?",
    answer:
      "(a) feedback mechanism; (b) beta cells OR cells of the pancreas; (c) Balance of life processes would be disturbed in the human body.",
    solutionSteps: [
      "[1 mark] (a) feedback mechanism",
      "[1 mark] (b) beta cells OR cells of the pancreas",
      "[0 marks] (c) Balance of life processes would be disturbed in the human body. (The source rubric awards this part 0 marks.)",
    ],
    finalAnswer:
      "(a) a feedback mechanism; (b) the beta cells of the pancreas; (c) the balance of life processes would be disturbed.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: true,
    diagramDescription:
      "Two flow diagrams side by side. The left is a generic control loop: stimulus → sensor → evaluator → effector, with a feedback arrow returning from effector to stimulus. The right is the same loop for glucose: a box reading '↑ plasma glucose' leads down to an irregular blob labelled X, which leads down to 'insulin release', with a feedback arrow curving back up to the plasma glucose box.",
  },
  // pdf-page 47 (folio 46) — Q12 [4]. Rubric row 12: pdf-page 54.
  {
    id: "CFPQ-S-LIFE-012",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Photosynthesis and Transpiration",
    section: "E",
    marks: 4,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Not all plants carry out photosynthesis by the same mechanism. In most plants, photosynthesis depends directly on the gaseous carbon dioxide that diffuses into the leaf through the stomata.\n\nHowever, some plants - such as pineapple - have the ability to store carbon dioxide in the vacuoles of the leaf cells as part of a complex carbon compound. This complex compound is transported to the chloroplasts and releases carbon dioxide when required, for photosynthesis to occur.\n\nThis special photosynthesis mechanism is believed to have evolved as an adaptation to conserve water for survival in dry conditions.\n\n(a) Which process in the plants does this photosynthesis mechanism minimise to help the plant survive in dry conditions?\n\n(b) How is the ability to store carbon dioxide as a complex compound likely to help minimise the process referred to in (a)?\n\n(c) When are such plants likely to take in carbon dioxide from the environment?",
    answer:
      "(a) transpiration; (b) Since stored carbon dioxide can be used, stomata need not be open for photosynthesis to occur during the day, and keeping the stomata closed during the day helps to minimise water loss due to transpiration; (c) during the night",
    solutionSteps: [
      "[1 mark] (a) transpiration",
      "[2 marks] (b) 1 mark for each of the following points: Since stored carbon dioxide can be used, stomata need not be open for photosynthesis to occur during the day. Keeping the stomata closed during the day helps to minimise water loss due to transpiration.",
      "[1 mark] (c) during the night",
    ],
    finalAnswer:
      "(a) transpiration; (b) stored CO₂ lets the stomata stay shut by day, cutting water loss; (c) at night.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 48 (folio 47) — Q13 [2]. Rubric row 13: pdf-pages 54-55.
  {
    id: "CFPQ-S-LIFE-013",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Reflex Action",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "When some particles (like sand or dust) fall into our eyes, our eyes start to water on their own and we blink to get the particle out of our eyes. This is a type of reaction to a stimulus that the human body shows.\n\n(a) Is the above-mentioned reaction involuntary or voluntary?\n\n(b) What is the specific name given to the pathway that brings about this immediate reaction to a stimulus?\n\n(c) What are the names given to:\n(i) the organ that responds to a stimulus\n(ii) the part of the brain that receives sensory impulses",
    answer: "(a) involuntary; (b) reflex arc; (c)(i) effector (ii) forebrain",
    solutionSteps: [
      "[½ mark] (a) involuntary",
      "[½ mark] (b) reflex arc",
      "[1 mark] (c) 0.5 marks for each correct answer: (i) effector; (ii) forebrain",
    ],
    finalAnswer: "(a) involuntary; (b) the reflex arc; (c)(i) effector, (ii) forebrain.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 49 (folio 48) — Q14 [5]. Rubric row 14: pdf-page 55.
  {
    id: "CFPQ-S-LIFE-014",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Aerobic and Anaerobic Respiration",
    section: "D",
    marks: 5,
    format: "Long",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A Weddell seal, a deep-sea diving mammal, has special adaptations that enable it to respire for long periods under water without inhaling air. Three such adaptations are given below.\n\nP) When diving, the blood flow to all parts of the seal's body is reduced by 80-95%, except for a closed circuit between the lungs, heart and brain.\nQ) 70% of the oxygen in the seal's body is stored in the blood (in hemoglobin), as compared to just 51% in humans.\nR) 25% of the oxygen in the seal's body is stored in the muscles (in myoglobin), as compared to just 13% in humans.\n\nIn 1980, a group of scientists carried out an experiment to understand how a Weddel seal respires under water during dives of different durations. After each dive completed by the seal, they measured the concentration of lactic acid in the seal's blood. The graph below represents the data obtained by the scientists.\n\n(a) Based on the graph, what can be inferred about the CHANGE in the respiration happening in the seal's body after 20 minutes under water? Justify your answer.\n(b) Adaptation R helps the seal the most to produce energy for SWIMMING during the first 20 minutes of a dive. Explain why adaptations P and Q do not help as much.",
    answer:
      "(a) Respiration is mostly aerobic in the first 20 minutes, and mostly anaerobic after the first 20 minutes, because lactic acid is a product of anaerobic respiration and its concentration rises sharply after 20 minutes. (b) Most of the energy needed for swimming is produced by the muscles, and since most of the blood does not reach the muscles during a dive, the oxygen stored in the blood is not as useful for swimming as the oxygen stored in the muscles.",
    solutionSteps: [
      "[3 marks] (a) Respiration is mostly aerobic in the first 20 minutes, and mostly anaerobic after the first 20 minutes. [1 mark] Justification: Lactic acid is a product of anaerobic respiration. [1 mark] The sharp rise in lactic acid concentration after 20 minutes indicates anaerobic respiration happening after 20 minutes. [1 mark]",
      "[2 marks] (b) 1 mark for each point: Most of the energy needed for swimming is produced by the muscles. Since most of the blood does not reach the muscles during a dive, the oxygen stored in the blood is not as useful for swimming as the oxygen stored in the muscles.",
    ],
    finalAnswer:
      "(a) it switches from aerobic to mostly anaerobic after 20 minutes, shown by the sharp lactic-acid rise; (b) swimming energy comes from muscle, which the restricted blood flow does not reach.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: true,
    diagramDescription:
      "A graph of 'Concentration of lactic acid in the blood' (vertical axis) against 'Duration of dive (minutes)' (horizontal axis, marked 0 to 60). Plotted points lie flat and near zero from 0 to about 20 minutes, then the curve turns sharply upward and rises steeply to the highest point at about 60 minutes.",
  },
  // pdf-page 50 (folio 49) — Q15 [4]. Rubric row 15: pdf-page 55.
  {
    id: "CFPQ-S-LIFE-015",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Photosynthesis and Respiration",
    section: "E",
    marks: 4,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Anita conducted an experiment to examine photosynthesis in aquatic plants kept in a tank by measuring dissolved oxygen. She plotted her results in the following graph X:\n\nShe repeated the experiment while covering the tank with an opaque black cloth. She plotted the results in the following graph Y:\n\n(a) What could be the aim of her experiment?\n(b) Apart from photosynthesis, what other cellular process can be observed by the experiment?\n(c) Why does the oxygen level rise in graph X?\n(d) Explain the downward slope of the graph Y.",
    answer:
      "(a) to show that light is necessary for photosynthesis; (b) respiration; (c) In the presence of light, the plants performed photosynthesis which released oxygen at a higher rate than the rate of oxygen utilisation by respiration; (d) dissolved oxygen is used up by the plant for respiration but no new oxygen is produced as the plant does not perform photosynthesis in absence of light.",
    solutionSteps: [
      "[1 mark] (a) to show that light is necessary for photosynthesis",
      "[1 mark] (b) respiration",
      "[1 mark] (c) In the presence of light, the plants performed photosynthesis which released oxygen at a higher rate than the rate of oxygen utilisation by respiration. Hence the oxygen levels rise.",
      "[1 mark] (d) The downward slope depicts that dissolved oxygen is used up by the plant for respiration but no new oxygen is produced as the plant does not perform photosynthesis in absence of light.",
    ],
    finalAnswer:
      "(a) that light is necessary for photosynthesis; (b) respiration; (c) photosynthesis outpaces respiration in light; (d) in the dark only respiration continues, consuming oxygen.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: true,
    diagramDescription:
      "Two line graphs, each plotting Dissolved Oxygen (mg/L, axis 3 to 10) against Time (minutes, 0 to 60). Graph X shows a straight line rising gently from about 7 mg/L at 0 minutes to about 8.7 mg/L at 60 minutes. Graph Y shows a straight line falling gently from about 7 mg/L to about 6.2 mg/L over the same period.",
  },
  // pdf-page 51 (folio 50) — Q17 [2]. Rubric row 17: pdf-page 56.
  {
    id: "CFPQ-S-LIFE-017",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Blood Vessels",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "The image below shows the cross section of a blood vessel of a human arm.\n\n(a) What is the type of blood vessel shown in the image?\n(b) Which direction will the blood flow in such a blood vessel?",
    answer: "(a) vein; (b) from P to Q",
    solutionSteps: ["[1 mark] (a) vein", "[1 mark] (b) from P to Q"],
    finalAnswer: "(a) a vein; (b) from P to Q - the valves only open that way.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: true,
    diagramDescription:
      "A three-dimensional cutaway of a blood vessel lying diagonally, opened along its length to show the interior. A pair of pocket-shaped valve flaps projects inwards from the wall about halfway along. The far end of the vessel is labelled Q and the near end is labelled P.",
  },
  // pdf-page 51 (folio 50) — Q18 [3]. Rubric row 18: pdf-page 56.
  {
    id: "CFPQ-S-LIFE-018",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Digestion in the Stomach",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "We often hear people complain about 'acidity' in the stomach.\n\n(a) Overproduction of what substance is most likely the reason for the complaint?\n(b) Why is the production of this substance necessary?\n(c) How does the stomach prevent itself from the harmful effects of overproduction of the substance?",
    answer:
      "(a) hydrochloric acid; (b) It creates an acidic medium for functioning of enzyme pepsin; (c) The stomach also produces mucus that coats the lining to prevent damage by hydrochloric acid.",
    solutionSteps: [
      "[1 mark] (a) hydrochloric acid",
      "[1 mark] (b) It creates an acidic medium for functioning of enzyme pepsin.",
      "[1 mark] (c) The stomach also produces mucus that coats the lining to prevent damage by hydrochloric acid.",
    ],
    finalAnswer:
      "(a) hydrochloric acid; (b) it gives pepsin the acidic medium it needs; (c) mucus coats and protects the lining.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 51 (folio 50) — Q19 [2]. Rubric row 19: pdf-page 56.
  {
    id: "CFPQ-S-LIFE-019",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Human Digestive System",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "There are various muscles present in the human digestive system known as sphincters. Two examples of those are given below:\n\n1. pyloric sphincter - at the junction of stomach and small intestine\n2. anal sphincter - at the anus\n\nGive ONE most likely consequence of malfunctioning of each of these sphincters.",
    answer:
      "Pyloric sphincter: food getting into small intestine too fast causing poor absorption / poor digestion. Anal sphincter: involuntary release of feces from the body.",
    solutionSteps: [
      "[1 mark] pyloric sphincter : food getting into small intestine too fast causing poor absorption / poor digestion",
      "[1 mark] Anal sphincter : involuntary release of feces from the body",
    ],
    finalAnswer:
      "Pyloric: food passes on too fast, so digestion and absorption suffer. Anal: loss of voluntary control over defecation.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 51 (folio 50) — Q20 [3]. Rubric row 20: pdf-page 56.
  {
    id: "CFPQ-S-LIFE-020",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Placenta and Embryonic Nutrition",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "The developing human embryo gets nutrition from the mother through a special tissue called placenta.\n\n(a) Mention TWO structural designs of the placenta that help the embryo to get nutrition.\n(b) Is the placental tissue designed for one way transport? Justify your answer.",
    answer:
      "(a) It has villi on the embryo side; it has blood spaces on the mother's side. (b) No, the waste generated by the developing embryo is transferred out through the placental tissue.",
    solutionSteps: [
      "[2 marks] (a) 1 mark for each correct point: It has villi on the embryo side. It has blood spaces on the mother's side.",
      "[1 mark] (b) No, the waste generated by the developing embryo is transferred out through the placental tissue.",
    ],
    finalAnswer:
      "(a) villi on the embryo side and blood spaces on the mother's side; (b) no - waste travels the other way too.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
  // pdf-page 52 (folio 51) — Q21 [2]. Rubric row 21: pdf-pages 56-57.
  {
    id: "CFPQ-S-LIFE-021",
    subject: "Science",
    topicKey: "life-processes",
    subtopic: "Transport of Oxygen in Blood",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Arthropods and molluscs have a copper-containing respiratory pigment called hemocyanin while human beings have iron-containing hemoglobin.\n\n(a) How do respiratory pigments help in the process of respiration?\n(b) Why do multicellular animals need a respiratory pigments?",
    answer:
      "(a) Respiratory pigments combine with oxygen and help in transport of oxygen throughout the body. (b) When the body size of animals is large, diffusion pressure alone cannot take care of oxygen delivery to all parts of the body. Hence, respiratory pigments take up oxygen from the air in the lungs and carry it to tissues which are deficient in oxygen.",
    solutionSteps: [
      "[1 mark] (a) Respiratory pigments combine with oxygen and help in transport of oxygen throughout the body.",
      "[1 mark] (b) When the body size of animals is large, diffusion pressure alone cannot take care of oxygen delivery to all parts of the body. Hence,respiratory pigments take up oxygen from the air in the lungs and carry it to tissues which are deficient in oxygen.",
    ],
    finalAnswer:
      "(a) they bind oxygen and carry it round the body; (b) in a large body, diffusion alone is too slow to supply every cell.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.6 — CFPQ_Science10.pdf, questions pdf pp.44–52 (printed folios 43–51)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — the seven surviving MCQs carry authored reasoning (the official
 * key on pdf page 53 gives an option index and nothing else). Every other row's
 * `solutionSteps` come 1:1 from the official rubric.
 */
export const LIFE_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-LIFE-001",
  "CFPQ-S-LIFE-002",
  "CFPQ-S-LIFE-003",
  "CFPQ-S-LIFE-004",
  "CFPQ-S-LIFE-005",
  "CFPQ-S-LIFE-006",
  "CFPQ-S-LIFE-008",
];
