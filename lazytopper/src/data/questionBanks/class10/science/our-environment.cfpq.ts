import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * our-environment — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 15.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 15 occupies pdf pages 133-137: questions on pdf pages 133-135
 *   (printed folios 132-134), the multiple-choice answer key on pdf page 136
 *   (folio 135), and the step-marking rubric on pdf page 137 (folio 136).
 *   pdf page 138 is the Chapter-16 divider.
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 — see
 *   [FU-CFPQ-NO-CITATION-FIELD].
 *
 * KEY TRIANGULATION (run before trusting the rubric, per owner ruling):
 *   COUNT   — 6 free-response questions (Q4-Q9) ↔ 6 rubric rows (4-9). Exact.
 *   CONTENT — each pairing semantically locked (rubric 6 "paper sheet, bone,
 *             metal can, plastic bottle" can only answer Q6's biodegradation
 *             ordering; rubric 9's trophic-level answer only Q9's lions).
 *   MARKS   — every rubric total equals the [N] in the question's right margin.
 *   Result: NO OFFSET in this chapter; rubric row N answers paper question N.
 *   The MCQ answer table holds exactly the 3 MCQs transcribed.
 *
 * EXTRACTION METHOD: body text is vector curves, not text; transcribed by eye
 *   from pages rendered at 165 dpi.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * WITHHELD: none. All 9 questions extracted.
 *
 * De-duped against the whole bank: all 9 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */

const H2_STIM =
  "Answer the following questions based on the given information.\n\nHydrogen gas is an excellent fuel. It has a high calorific value and produces only water as the product of combustion. It is considered to be a potentially important, non-polluting energy source of the future.\n\nHydrogen is labelled with different 'colours' based on the method by which it is produced, as given below:\n\n- green hydrogen: manufacturing process does not produce carbon dioxide\n- blue hydrogen: manufacturing process produces carbon dioxide but it is separated and stored\n- grey hydrogen: manufacturing process produces carbon dioxide which is released into the air\n\n";

const VISION_STIM =
  "Shown here is the extent to which two different animals can see in either direction without turning their heads. In animal 1, the eyes are placed towards the front of the head and in animal 2, the eyes are placed on either side of the head.\n\nSince the placement of eyes in the two animals is different, their vision is also slightly different.\n\nIn the figures above, the grey part represents the parts that can be seen by both eyes at a time, whereas the white parts represent those parts that can be seen only by one eye at a time.\n\nAnimal 2 can see a broader area at any time compared to animal 1. Animal 1 can distinguish depths better compared to animal 2.\n\n";

const VISION_DESC =
  "Two fan-shaped field-of-view diagrams side by side, each with a small circle at the apex representing an animal's head. Animal 1 (left) has a narrow fan with a large shaded (grey) central region, showing a small total field but a wide binocular overlap. Animal 2 (right) has a much wider fan with only a narrow shaded wedge at the centre, showing a broad total field but little binocular overlap. Labelled 'Animal 1' and 'Animal 2' beneath.";

export const ENV_CFPQ: CanonicalQuestion[] = [
  // pdf-page 133 (folio 132) — Q1. Key: pdf-page 136, option 3.
  {
    id: "CFPQ-S-ENV-001",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Human Impact on the Environment",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      H2_STIM +
      "Hydrogen is labelled 'brown' if the manufacturing process releases both carbon dioxide and carbon monoxide to the air.\n\nIn what way is the manufacturing process of brown hydrogen WORSE than that of grey hydrogen for the environment?",
    options: [
      "It releases into the atmosphere a gas that directly causes a greenhouse effect.",
      "It releases into the atmosphere carbon which was stored for millions of years.",
      "It releases into the atmosphere a gas that is toxic to human beings.",
      "It releases into the atmosphere gases that cause acid rain.",
    ],
    answer: "It releases into the atmosphere a gas that is toxic to human beings.",
    solutionSteps: [
      "[1 mark] Correct option: (3) It releases into the atmosphere a gas that is toxic to human beings. Brown hydrogen differs from grey hydrogen only by also releasing carbon monoxide, which is poisonous to humans. Both release carbon dioxide, so the greenhouse and stored-carbon points do not distinguish them.",
    ],
    finalAnswer: "It releases into the atmosphere a gas that is toxic to human beings.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: false,
  },
  // pdf-page 133 (folio 132) — Q2. Key: pdf-page 136, option 4.
  {
    id: "CFPQ-S-ENV-002",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Flow of Energy in an Ecosystem",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "What is the ratio of average amount of energy absorbed by producers to the average amount of energy absorbed by the primary consumers?",
    options: ["1:2", "2:1", "1:10", "10:1"],
    answer: "10:1",
    solutionSteps: [
      "[1 mark] Correct option: (4) 10:1. By the ten per cent law only about 10% of the energy at one trophic level passes to the next, so producers hold about ten times the energy of the primary consumers that feed on them.",
    ],
    finalAnswer: "10:1",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: false,
  },
  // pdf-page 133 (folio 132) — Q3. Key: pdf-page 136, option 2.
  {
    id: "CFPQ-S-ENV-003",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Flow of Energy in an Ecosystem",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Which of the following describes the flow of energy and nutrients, respectively, through the ecosystem?",
    options: [
      "bidirectional and cyclic",
      "unidirectional and cyclic",
      "cyclic and bidirectional",
      "cyclic and unidirectional",
    ],
    answer: "unidirectional and cyclic",
    solutionSteps: [
      "[1 mark] Correct option: (2) unidirectional and cyclic. Energy enters as sunlight and passes one way up the trophic levels, being lost as heat at each step, whereas nutrients are returned to the soil by decomposers and cycled repeatedly.",
    ],
    finalAnswer: "unidirectional and cyclic",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: false,
  },
  // pdf-page 134 (folio 133) — Q4 [2]. Rubric row 4: pdf-page 137.
  {
    id: "CFPQ-S-ENV-004",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Predator and Prey Adaptations",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText: VISION_STIM + "Based on this, which of the two animals is most likely to be a predator and why?",
    answer:
      "Animal 1, because it will be able to judge the distance and the movement of the prey accurately.",
    solutionSteps: [
      "[1 mark] Animal identified correctly as Animal 1.",
      "[1 mark] Reason shared correctly: Animal 1, because it will be able to judge the distance and the movement of the prey accurately.",
    ],
    finalAnswer: "Animal 1 - its forward-facing eyes give the binocular overlap needed to judge distance.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: true,
    diagramDescription: VISION_DESC,
  },
  // pdf-page 134 (folio 133) — Q5 [1]. Rubric row 5: pdf-page 137.
  {
    id: "CFPQ-S-ENV-005",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Food Chains and Food Webs",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      VISION_STIM +
      "Observe the following food web. Classify the animals into two groups - one that would need to have vision as Animal 1 and another as Animal 2 in the diagram above.",
    answer: "Animal 1: lion, jackal, kite, wild cat and owl. Animal 2: mouse, goat, rabbit.",
    solutionSteps: [
      "[1 mark] Animal 1: lion, jackal, kite, wild cat and owl. Animal 2: mouse, goat, rabbit.",
    ],
    finalAnswer:
      "Predators (lion, jackal, kite, wild cat, owl) need Animal 1 vision; prey (mouse, goat, rabbit) need Animal 2 vision.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: true,
    diagramDescription:
      VISION_DESC +
      " A second figure shows a food web drawn with pictures joined by arrows: a green plant (producer) at the left feeds a goat, a rabbit and a mouse; the goat and rabbit are eaten by a jackal and a wild cat; the mouse is eaten by an owl and a wild cat; the jackal and wild cat are eaten by a lion; and the mouse also leads to a kite. Labels read Green Plant producer, Goat, Rabbit, Mouse, Jackal, Wild cat, Owl, Kite and Lion.",
  },
  // pdf-page 134 (folio 133) — Q6 [1]. Rubric row 6: pdf-page 137.
  {
    id: "CFPQ-S-ENV-006",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Biodegradable and Non-biodegradable Waste",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "bone | metal can | paper sheet | plastic bottle\n\nArrange the four objects given above according to the time they take to get biodegraded (LEAST time TO MOST time).",
    answer: "paper sheet, bone, metal can, plastic bottle",
    solutionSteps: ["[1 mark] paper sheet, bone, metal can, plastic bottle"],
    finalAnswer: "paper sheet → bone → metal can → plastic bottle",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: false,
  },
  // pdf-page 134 (folio 133) — Q7 [3]. Rubric row 7: pdf-page 137.
  {
    id: "CFPQ-S-ENV-007",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Biological Magnification",
    section: "C",
    marks: 3,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Answer the following questions about transfer of materials in the ecosystem.\n\n(a) Mention TWO ways by which energy is lost from the trophic levels in the ecosystem.\n(b) A lot of harmful chemicals enter our body through different sources like food. Since human beings are at the top of the food chain/ trophic structure, maximum concentration of such chemicals is found in human beings. What is this phenomenon known as?",
    answer:
      "(a) Any two of: as heat; in maintaining life processes; utilised in growth and storage. (b) biological magnification or biomagnification",
    solutionSteps: [
      "[2 marks] (a) 1 mark for each correct answer such as: as heat; in maintaining life processes; utilised in growth and storage.",
      "[1 mark] (b) biological magnification or biomagnification",
    ],
    finalAnswer: "(a) as heat and in maintaining life processes; (b) biomagnification",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: false,
  },
  // pdf-page 135 (folio 134) — Q8 [5]. Rubric row 8: pdf-page 137.
  {
    id: "CFPQ-S-ENV-008",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Ozone Layer and Its Depletion",
    section: "D",
    marks: 5,
    format: "Long",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "The stratosphere is very dry and rarely allows clouds to form. In the extreme cold of the polar winter, however, stratospheric clouds of different types may form. These clouds are called Polar Stratospheric Clouds (PSCs).\n\nScientists recently discovered that polar stratospheric clouds, long known to play an important role in Antarctic ozone destruction, are occurring with increasing frequency in the Arctic. These high-altitude clouds form only at very low temperatures help destroy ozone in two ways: (1) They provide a surface which converts benign forms of chlorine into reactive, ozone-destroying forms, and (2) they remove nitrogen compounds that moderate the destructive impact of chlorine. In recent years, the atmosphere above the Arctic has been colder than usual, and polar stratospheric clouds have lasted into the spring. As a result, ozone levels have been decreasing.\n\n(Information credit: NASA)\n\n(a) How is ozone formed in the outer atmosphere?\n(b) Ozone is being continuously destroyed due to extreme low temperatures. However, ozone formation is also a continuous process. Why is there a depletion in the ozone layer still?\n(c) What can be a positive effect of global warming on the depletion of the ozone layer?\n(d) How does ozone layer depletion impact human health?",
    answer:
      "(a) High-energy UV radiation splits molecular oxygen into free oxygen atoms, which then combine with molecular oxygen to form ozone. (b) Because the rate of destruction is higher than the rate of formation. (c) Rise in polar temperature might restrict the formation of PSCs and reduce the depletion of the ozone layer. (d) Removal of ozone layer allows harmful UV radiations to enter and cause diseases like skin cancer.",
    solutionSteps: [
      "[2 marks] (a) 1 mark for each correct step of the process: The higher energy UV radiations in the higher levels of atmosphere split apart some molecular oxygen (O₂) into free oxygen (O) atoms. These atoms then combine with the molecular oxygen to form ozone.",
      "[1 mark] (b) because the rate of destruction is higher than the rate of formation",
      "[1 mark] (c) Rise in polar temperature might restrict the formation of PSCs and reduce the depletion of the ozone layer.",
      "[1 mark] (d) Removal of ozone layer allows harmful UV radiations to enter and cause diseases like skin cancer.",
    ],
    finalAnswer:
      "(a) UV splits O₂ into O atoms which join O₂ to give O₃; (b) destruction outpaces formation; (c) warmer poles would form fewer PSCs; (d) more UV reaches us, causing skin cancer.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: false,
  },
  // pdf-page 135 (folio 134) — Q9 [1]. Rubric row 9: pdf-page 137.
  {
    id: "CFPQ-S-ENV-009",
    subject: "Science",
    topicKey: "our-environment",
    subtopic: "Food Chains and Trophic Levels",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Lions have no known natural predators.\n\nBased on energy transfer in a food chain, what could be the most likely reason for the above statement?",
    answer:
      "Lions generally occur at the tertiary or quaternary levels in a food chain and energy available after that trophic level is not sufficient for sustenance.",
    solutionSteps: [
      "[1 mark] Lions generally occur at the tertiary or quaternary levels in a food chain and energy available after that trophic level is not sufficient for sustenance.",
    ],
    finalAnswer:
      "Too little energy remains above the lion's trophic level to sustain a further predator.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.15 — CFPQ_Science10.pdf, questions pdf pp.133–135 (printed folios 132–134)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — the three MCQs carry authored reasoning (the official key on pdf
 * page 136 gives an option index and nothing else). Every other row's
 * `solutionSteps` come 1:1 from the official rubric.
 */
export const ENV_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-ENV-001",
  "CFPQ-S-ENV-002",
  "CFPQ-S-ENV-003",
];
