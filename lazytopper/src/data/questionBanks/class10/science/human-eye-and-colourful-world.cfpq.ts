import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * human-eye-and-colourful-world — CBSE "Competency Focused Practice Questions"
 * (CFPQ), Class 10 Science, Chapter 11.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 11 occupies pdf pages 93-98: questions on pdf pages 93-96 (printed
 *   folios 92-95), the multiple-choice answer key on pdf page 97 (folio 96), and
 *   the step-marking rubric on pdf page 98 (folio 97).
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 — see
 *   [FU-CFPQ-NO-CITATION-FIELD].
 *
 * KEY TRIANGULATION (run before trusting the rubric, per owner ruling):
 *   COUNT   — 3 free-response questions (Q10-Q12) ↔ 3 rubric rows (10-12). Exact.
 *   CONTENT — rubric 10 (dust removed by filtering, no scattering) can only
 *             answer Q10; rubric 11 (not enough water vapour) only Q11's Mars
 *             rainbow; rubric 12 (white, no medium to scatter) only Q12's ISS.
 *   MARKS   — every rubric total equals the [N] in the question's right margin.
 *   Result: NO OFFSET. The MCQ answer table holds 9 rows for the 9 MCQs
 *   (Q1-Q9) - count matches, and all nine keys are physically correct on check.
 *
 * EXTRACTION METHOD: body text is vector curves; transcribed by eye from pages
 *   rendered at 200 dpi.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * Q1 IS EXTRACTED (owner ruling). Its four options are picture panels labelled
 *   A-D with no numbered option rows, and the key gives the numeral "3". It is NOT
 *   the withheld figure-valued-options class, because each panel carries a PRINTED
 *   CAPTION - "Yellow colour", "Red colour", "Black colour", "Blue colour" - which is
 *   CBSE's own wording, so storing the options authors nothing. Contrast Ch2 Q2, which
 *   had no option text at all and where extraction would have meant inventing prose.
 *   ★ The withhold rule is "no honest extraction exists", not "a picture is involved".
 *   The 3→C mapping is corroborated by the physics: with no atmosphere there is no
 *   scattering, so the sky is black. `requiresDiagram: true`.
 *
 * WITHHELD: none.
 *
 * De-duped against the whole bank: all 12 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */

const FARPOINT_STIM =
  "The far point and the near point refer to the visibility of objects close by and far away from the human eye respectively. These are the maximum and minimum distances at which an object is clearly visible to a person.\n\n";

const IRIS_STIM =
  "The iris is a muscular diaphragm that controls the size of the pupil.\nIt consists of two layers: the front pigmented fibrovascular layer known as a stroma and, beneath the stroma, pigmented epithelial cells. The colour of the eye is defined by the pigmentation of the iris.\n\n";

export const EYE_CFPQ: CanonicalQuestion[] = [
  // pdf-page 93 (folio 92) — Q1. Key: pdf-page 97, option 3.
  {
    id: "CFPQ-S-EYE-001",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Scattering of Light",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "If the Earth did not have an atmosphere, which of the following shows what you would see if you looked at the Sun?\n\n(Note: You should never look at the Sun directly.)",
    options: ["Yellow colour", "Red colour", "Black colour", "Blue colour"],
    answer: "Black colour",
    solutionSteps: [
      "[1 mark] Correct option: (3) Black colour. The sky looks blue because the atmosphere scatters sunlight; with no atmosphere there is nothing to scatter the light, so no light reaches the eye from any direction except straight from the Sun and the surrounding sky appears black.",
    ],
    finalAnswer: "Black colour",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: true,
    diagramDescription:
      "Four square panels in a row, each showing a white circle labelled 'Sun' against a differently coloured background, with a caption inside each panel and a letter beneath it. A: a pale/near-white background captioned 'Yellow colour'. B: a mid-grey background captioned 'Red colour'. C: a black background captioned 'Black colour'. D: a dark slate background captioned 'Blue colour'.",
  },
  // pdf-page 93 (folio 92) — Q2. Key: pdf-page 97, option 4.
  {
    id: "CFPQ-S-EYE-002",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Accommodation of the Eye",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      FARPOINT_STIM + "The near point and the far point are determined with regards to the function of which part of the eye?",
    options: ["pupil", "retina", "eye-ball", "ciliary muscles"],
    answer: "ciliary muscles",
    solutionSteps: [
      "[1 mark] Correct option: (4) ciliary muscles. They change the curvature of the eye lens - accommodation - and so set the range of distances over which an object can be brought into focus.",
    ],
    finalAnswer: "ciliary muscles",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 94 (folio 93) — Q3. Key: pdf-page 97, option 2.
  {
    id: "CFPQ-S-EYE-003",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Hypermetropia",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText: "Which of these is a reason why a far-sighted person needs a convex lens to correct his vision?",
    options: [
      "The image forms in front of his retina.",
      "The image forms behind the retina.",
      "The image forms below the retina.",
      "The image forms on the retina.",
    ],
    answer: "The image forms behind the retina.",
    solutionSteps: [
      "[1 mark] Correct option: (2) The image forms behind the retina. In hypermetropia the eye converges light too weakly, so a nearby object would focus past the retina; a converging (convex) lens adds the missing convergence and brings the image forward onto it.",
    ],
    finalAnswer: "The image forms behind the retina.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 94 (folio 93) — Q4. Key: pdf-page 97, option 2.
  {
    id: "CFPQ-S-EYE-004",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Defects of Vision",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText: "Under which of these can myopia and hypermetropia be classified?",
    options: [
      "breakdown of tissues",
      "incorrect bending of light in the eye",
      "incorrect reflection of light by surfaces around us",
      "incorrect coordination with brain for colour",
    ],
    answer: "incorrect bending of light in the eye",
    solutionSteps: [
      "[1 mark] Correct option: (2) incorrect bending of light in the eye. Both are refractive defects - the eye's converging power does not match its length, so light is not bent to focus on the retina.",
    ],
    finalAnswer: "incorrect bending of light in the eye",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 94 (folio 93) — Q5. Key: pdf-page 97, option 2.
  {
    id: "CFPQ-S-EYE-005",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Structure and Function of the Human Eye",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText: IRIS_STIM + "Which of the following can be directly affected if the iris does not function properly?",
    options: [
      "identification of colours",
      "the amount of light entering the eye",
      "transmission of visual information to the brain",
      "finer adjustments for focussing the objects",
    ],
    answer: "the amount of light entering the eye",
    solutionSteps: [
      "[1 mark] Correct option: (2) the amount of light entering the eye. The iris is the diaphragm that widens and narrows the pupil; colour identification is done by the retina, transmission by the optic nerve and focussing by the ciliary muscles.",
    ],
    finalAnswer: "the amount of light entering the eye",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: true,
    diagramDescription:
      "A labelled cutaway diagram of the human eyeball in side view. Leader lines on the right label the Ciliary body, Suspensory ligament, Iris, Cornea, Pupil and Lens at the front; on the left they label the Optic nerve and the Central artery and vein of retina; and the interior is labelled Vitreous body.",
  },
  // pdf-page 95 (folio 94) — Q6. Key: pdf-page 97, option 4.
  {
    id: "CFPQ-S-EYE-006",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Tyndall Effect",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Rohan lit an incense stick in his room and after an hour observed that when a beam of sunlight entered his room through a small gap in the window, he was able to see the path of the beam.\n\nWhich of the following is most likely TRUE about the air present in the room?",
    options: ["It is a pure substance.", "It is a compound.", "It is a solution.", "It is a colloid."],
    answer: "It is a colloid.",
    solutionSteps: [
      "[1 mark] Correct option: (4) It is a colloid. The smoke particles are large enough to scatter the light and make the beam's path visible - the Tyndall effect - which happens in a colloid but not in a true solution or a pure substance.",
    ],
    finalAnswer: "It is a colloid.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 95 (folio 94) — Q7. Key: pdf-page 97, option 4.
  {
    id: "CFPQ-S-EYE-007",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Dispersion of Light",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "In a medium like glass, the velocity of light increases as the wavelength increases.\n\nWhich of the following light would be the fastest in glass?",
    options: ["blue", "violet", "green", "red"],
    answer: "red",
    solutionSteps: [
      "[1 mark] Correct option: (4) red. Of the four, red has the longest wavelength, so by the rule given it travels fastest in glass - which is also why it is deviated least on dispersion.",
    ],
    finalAnswer: "red",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 95 (folio 94) — Q8. Key: pdf-page 97, option 4.
  {
    id: "CFPQ-S-EYE-008",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Accommodation of the Eye",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Which of the following correctly gives the sequence of events that take place when human eye changes its focus from a distant object to an object closer to the eye?",
    options: [
      "ciliary muscles relax - -> curvature of eye lens increases --> focal length of eye lens increases",
      "ciliary muscles contract - -> curvature of eye lens decreases --> focal length of eye lens increases",
      "ciliary muscles relax - -> curvature of eye lens decreases --> focal length of eye lens decreases",
      "ciliary muscles contract - -> curvature of eye lens increases --> focal length of eye lens decreases",
    ],
    answer:
      "ciliary muscles contract - -> curvature of eye lens increases --> focal length of eye lens decreases",
    solutionSteps: [
      "[1 mark] Correct option: (4) ciliary muscles contract, curvature of eye lens increases, focal length of eye lens decreases. Focusing on a near object needs more converging power, which the eye gets by contracting the ciliary muscles so the lens bulges - a greater curvature means a shorter focal length.",
    ],
    finalAnswer:
      "ciliary muscles contract → curvature increases → focal length decreases",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 95 (folio 94) — Q9. Key: pdf-page 97, option 3.
  {
    id: "CFPQ-S-EYE-009",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Defects of Vision",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A person's near point is at 45 cm and far point is at 2 m.\n\nWhat kind of corrective lens is BEST suited for his vision defect?",
    options: ["convex", "concave", "bifocal", "plano-convex"],
    answer: "bifocal",
    solutionSteps: [
      "[1 mark] Correct option: (3) bifocal. A normal near point is about 25 cm and the far point is at infinity; this person's near point is too far AND his far point is too near, so he has both hypermetropia and myopia and needs a lens correcting each - a bifocal.",
    ],
    finalAnswer: "bifocal",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 96 (folio 95) — Q10 [2]. Rubric row 10: pdf-page 98.
  {
    id: "CFPQ-S-EYE-010",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Scattering of Light",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Nanda saw rays of sunlight entering into a dark room as shown below.\n\nHe then did something to the air in the room after which he was NOT able to see the rays of sunlight in the room.\n\nWhat is it that Nanda could have done to make the rays of sunlight invisible? Justify your answer.",
    answer:
      "Removing all the dust particles from the air in the room by passing the air through a very efficient filter. Filtering the air removes the suspended dust particles thus preventing the scattering of light which make the rays visible.",
    solutionSteps: [
      "[1 mark] Removing all the dust particles from the air in the room by passing the air through a very efficient filter.",
      "[1 mark] Filtering the air removes the suspended dust particles thus preventing the scattering of light which make the rays visible.",
    ],
    finalAnswer: "Filter the dust out of the air - with nothing left to scatter the light, the beam becomes invisible.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: true,
    diagramDescription:
      "A photograph of a dim room with two tall windows. Shafts of sunlight slant down from the left-hand window to the floor, their paths clearly visible as bright beams through the dusty air. A radiator sits below each window and debris lies on the floor.",
  },
  // pdf-page 96 (folio 95) — Q11 [1]. Rubric row 11: pdf-page 98.
  {
    id: "CFPQ-S-EYE-011",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Rainbow Formation",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Mars's atmosphere is composed mainly of carbon dioxide, nitrogen and argon and negligible amounts of oxygen, water vapour and methane.\n\nUsing the information given in the sentence above and knowledge about how rainbows are formed on Earth, explain why rainbow formation is impossible on Mars.",
    answer: "There is not enough water vapour in the atmosphere to cause scattering of light.",
    solutionSteps: ["[1 mark] There is not enough water vapour in the atmosphere to cause scattering of light."],
    finalAnswer: "Mars has negligible water vapour, and water droplets are what disperse sunlight into a rainbow.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
  // pdf-page 96 (folio 95) — Q12 [2]. Rubric row 12: pdf-page 98.
  {
    id: "CFPQ-S-EYE-012",
    subject: "Science",
    topicKey: "human-eye-and-colourful-world",
    subtopic: "Scattering of Light",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Space is mostly vacuum, devoid of any medium.\n\n(a) What colour does the Sun appear to the astronauts on International Space Station?\n(b) Give reason for your answer to (a).",
    answer:
      "(a) white; (b) Since there is no medium to disperse or scatter the light coming from the Sun, it appears white.",
    solutionSteps: [
      "[1 mark] (a) white",
      "[1 mark] (b) Since there is no medium to disperse or scatter the light coming from the Sun, it appears white.",
    ],
    finalAnswer: "(a) white; (b) there is no medium in space to scatter or disperse the sunlight.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.11 — CFPQ_Science10.pdf, questions pdf pp.93–96 (printed folios 92–95)",
    requiresDiagram: false,
  },
];

/**
 * THE DECOUPLE — the eight surviving MCQs carry authored reasoning (the official
 * key on pdf page 97 gives an option index and nothing else). Q10-Q12's
 * `solutionSteps` come 1:1 from the official rubric.
 */
export const EYE_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-EYE-001",
  "CFPQ-S-EYE-002",
  "CFPQ-S-EYE-003",
  "CFPQ-S-EYE-004",
  "CFPQ-S-EYE-005",
  "CFPQ-S-EYE-006",
  "CFPQ-S-EYE-007",
  "CFPQ-S-EYE-008",
  "CFPQ-S-EYE-009",
];
