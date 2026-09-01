import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * electricity — CBSE "Competency Focused Practice Questions" (CFPQ),
 * Class 10 Science, Chapter 12.
 *
 * Source: CFPQ_Science10.pdf — CBSE Centre for Excellence in Assessment with
 *   Educational Initiatives, 13 Nov 2022 (22,067,517 bytes, 145 pages).
 *   Chapter 12 occupies pdf pages 100-109: questions on pdf pages 100-105
 *   (printed folios 99-104), the multiple-choice answer key on pdf page 106
 *   (folio 105), and the step-marking rubrics on pdf pages 107-109 (folios
 *   106-108).
 *
 * PAGE CITATION RULE: pdf page = printed folio + 1 — see
 *   [FU-CFPQ-NO-CITATION-FIELD].
 *
 * KEY TRIANGULATION (run before trusting the rubric, per owner ruling):
 *   COUNT   — 10 free-response questions (Q6-Q15) ↔ 10 rubric rows (6-15). Exact.
 *   CONTENT — each pairing semantically locked (rubric 8 "positions of the
 *             ammeter and voltmeter have been interchanged" only answers Q8;
 *             rubric 13 "Switch 1 and Switch 2" only Q13's fuse).
 *   MARKS   — 9 of 10 match the [N] in the question's right margin. Q12 does NOT
 *             (see WITHHELD below).
 *   Result: NO OFFSET. The MCQ answer table holds 5 rows for the 5 MCQs (Q1-Q5).
 *
 * EXTRACTION METHOD: body text is vector curves; transcribed by eye from pages
 *   rendered at 200 dpi.
 *
 * NO pyqYear. NO competency-type field. `isCompetencyBased: true` only.
 *
 * ⚠ WITHHELD: Chapter 12 Q12 (pdf page 103) is NOT in this array. Its right
 *   margin prints [2] but its rubric row (pdf page 109) totals 1 mark. The two
 *   printed sources disagree about what the question is worth, and choosing
 *   either would be a guess: taking 2 leaves the steps summing to 1 and fails
 *   the marks-summing contract, while taking 1 contradicts the question page.
 *   The content pairing is exact (three 10 Ω resistors and a 12 V cell, minimum
 *   heat, answered by a series arrangement) - only the marks disagree. Withheld
 *   with its page numbers; id `CFPQ-S-ELEC-012` left unused.
 *   See [FU-CFPQ-CH12-Q12-MARKS-CONFLICT].
 *
 * ⚠ VERBATIM SOURCE DEFECT, NOT CORRECTED: Q4's option 2 reads "a potential
 *   difference of 220 V" while the question's own stem specifies a 240 V mains
 *   supply. The option is the keyed answer and is transcribed exactly as printed;
 *   the internal 220/240 inconsistency is CBSE's, not this lane's.
 *
 * De-duped against the whole bank: all 15 stems grepped, 0 collisions.
 * NOT WIRED — `canonicalQuestionBank.ts` is out of scope for this lane.
 */

const LED_STIM =
  "Read the information given below and answer four out of five following questions.\n\nSuresh bought a packet of 100 LEDs to make his own lights for decoration in his house. The packet on the LEDs had the following printed on a label:\nLED 2835, 0.2 W, 30 Lumens, 3 V\n\nTo understand how he should connect the LEDs, he referred to the following circuit diagram on a website.\n\n";

const LED_DESC =
  "A circuit diagram of a decorative light string. From a mains-supply plug on the left, a single conductor runs to a row of eight lamps labelled LED 1, LED 2 … LED 8 along the top, continues round at the right-hand end, and returns through a second row of eight lamps labelled LED 9, LED 10 … LED 16 along the bottom back to the plug - one continuous loop of sixteen LEDs.";

export const ELEC_CFPQ: CanonicalQuestion[] = [
  // pdf-page 100 (folio 99) — Q1. Key: pdf-page 106, option 1.
  {
    id: "CFPQ-S-ELEC-001",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Series and Parallel Combinations",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText: LED_STIM + "Which of the following describes how the LEDs are connected in the circuit diagram?",
    options: [
      "all in series",
      "all in parallel",
      "8 each in a series combination, and the two combinations in parallel",
      "8 each in a parallel combination, and the two combinations in series",
    ],
    answer: "all in series",
    solutionSteps: [
      "[1 mark] Correct option: (1) all in series. Tracing the diagram, a single conductor leaves the plug, passes through LED 1 to LED 8, turns at the far end and returns through LED 9 to LED 16 - there is one path only, so every LED carries the same current.",
    ],
    finalAnswer: "all in series",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription: LED_DESC,
  },
  // pdf-page 100 (folio 99) — Q2. Key: pdf-page 106, option 3.
  {
    id: "CFPQ-S-ELEC-002",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Series and Parallel Combinations",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      LED_STIM +
      "If the LED marked 'LED 2' in the diagram stops working, which other LEDs will also stop working?\n(Note: When an LED stops working, current cannot flow across it.)",
    options: [
      "only LED 3 to LED 8",
      "only LED 3 to LED 8 and LED 1",
      "all the other LEDs in the circuit",
      "none of the other LEDs in the circuit",
    ],
    answer: "all the other LEDs in the circuit",
    solutionSteps: [
      "[1 mark] Correct option: (3) all the other LEDs in the circuit. The sixteen LEDs form a single series loop, so a break anywhere opens the only path and every LED goes out.",
    ],
    finalAnswer: "all the other LEDs in the circuit",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription: LED_DESC,
  },
  // pdf-page 100 (folio 99) — Q3. Key: pdf-page 106, option 2.
  {
    id: "CFPQ-S-ELEC-003",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Potential Difference in a Series Circuit",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      LED_STIM +
      "Suresh decided to connect all the LEDs in his lights in a series combination.\n\nHow many LEDs will he need to connect if he is going to connect the lights to a 240 V mains supply so that the LEDs work at their power rating?",
    options: ["16", "80", "240", "1200"],
    answer: "80",
    solutionSteps: [
      "[1 mark] Correct option: (2) 80. In series the supply voltage divides across the LEDs, and each is rated 3 V, so the number needed is 240 V ÷ 3 V = 80.",
    ],
    finalAnswer: "80",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription: LED_DESC,
  },
  // pdf-page 100 (folio 99) — Q4. Key: pdf-page 106, option 2.
  {
    id: "CFPQ-S-ELEC-004",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Potential Difference in a Parallel Circuit",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      LED_STIM + "What will happen if he connects 100 LEDs, all in a parallel combination, to the 240 V mains supply?",
    options: [
      "Each LED will work as expected since the available voltage is more than 3 V.",
      "Each LED will have a potential difference of 220 V and therefore they will get damaged.",
      "Each LED will glow but the ones closer in the circuit to the main supply will glow brighter.",
      "Each LED will have a potential difference of 2.4 V across it and therefore will glow dimmer than normal.",
    ],
    answer: "Each LED will have a potential difference of 220 V and therefore they will get damaged.",
    solutionSteps: [
      "[1 mark] Correct option: (2). In a parallel combination every branch carries the full supply voltage, so each LED - rated for only 3 V - is subjected to the whole mains voltage and is destroyed. (The option as printed says 220 V while the stem specifies 240 V; that inconsistency is in the source and the option is reproduced verbatim.)",
    ],
    finalAnswer: "Each LED will have a potential difference of 220 V and therefore they will get damaged.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription: LED_DESC,
  },
  // pdf-page 101 (folio 100) — Q5. Key: pdf-page 106, option 1.
  {
    id: "CFPQ-S-ELEC-005",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Electric Power",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText: LED_STIM + "How much current is each LED expected to draw when used according to the ratings given in the label?",
    options: ["0.067 A", "0.600 A", "10 A", "15 A"],
    answer: "0.067 A",
    solutionSteps: [
      "[1 mark] Correct option: (1) 0.067 A. From P = VI, I = P/V = 0.2 W ÷ 3 V = 0.067 A.",
    ],
    finalAnswer: "0.067 A",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription: LED_DESC,
  },
  // pdf-page 101 (folio 100) — Q6 [5]. Rubric row 6: pdf-page 107.
  {
    id: "CFPQ-S-ELEC-006",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Ohm's Law - Experimental Verification",
    section: "D",
    marks: 5,
    format: "Long",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "The diagram below shows how Amita had connected a circuit to verify Ohm's law.\n\n(a) Identify which of the devices in the circuit is an ammeter. Justify your answer.\n\n(b) Draw a circuit diagram with appropriate symbols for the circuit shown in the diagram above.\n\n(c) Amita forgot to put a switch in the circuit. During the experiment, the wire labelled 'Unknown resistor' became hot. The resistivity of the material of the wire increases with temperature. Draw two potential difference vs current graphs (in the same diagram): (i) as expected by Amita, (ii) as based on actual observation she would make.",
    answer:
      "(a) Meter 2, because it is connected in series with the unknown resistor through which the current needs to be measured. (b) A circuit diagram with cell, rheostat, unknown resistor, ammeter in series and voltmeter across the resistor. (c) (i) a straight line through the origin; (ii) a curved line with an increasing slope.",
    solutionSteps: [
      "[1 mark] (a) Meter 2 [0.5 marks]; because it is connected in series with the unknown resistor through which the current needs to be measured [0.5 marks].",
      "[2 marks] (b) Correct connections for the cell, the unknown resistor and the rheostat in the diagram [0.5 marks]; correct connections for the two meters in the diagram [0.5 marks]; use of correct symbols for all components [1 mark].",
      "[2 marks] (c)(i) straight line passing through origin [1 mark]; (ii) curved line with an increasing slope [1 mark].",
    ],
    finalAnswer:
      "(a) Meter 2 - it is in series with the resistor; (b) cell, rheostat, resistor and ammeter in series with the voltmeter in parallel across the resistor; (c) (i) straight line through the origin, (ii) upward-curving line.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A pictorial circuit: two electric cells at the left, a rheostat (variable resistor) drawn as a wound coil with a slider along the top, and a boxed coil labelled 'Unknown resistor' at the bottom. Two identical dial meters labelled Meter 1 and Meter 2 sit in the middle. Meter 1 is connected across the unknown resistor and Meter 2 is in the main loop.",
  },
  // pdf-page 102 (folio 101) — Q7 [2]. Rubric row 7: pdf-page 107.
  {
    id: "CFPQ-S-ELEC-007",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Series and Parallel Combinations",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Answer the questions based on the electric circuit shown below. All the four bulbs are identical.\n\n(a) How does the voltage reading on voltmeter 1 compare with the voltage reading on voltmeter 2?\n(b) Identify the bulb(s) through which a current equal to the reading on the ammeter flows.",
    answer:
      "(a) The voltage reading on voltmeter 1 will be the same as the reading on voltmeter 2. (b) bulb 3 and bulb 4.",
    solutionSteps: [
      "[1 mark] (a) The voltage reading on voltmeter 1 will be the same as the reading on voltmeter 2.",
      "[1 mark] (b) 0.5 marks each for: bulb 3; bulb 4. (No marks to be awarded if Bulb 1 and/or 2 is included in the answer.)",
    ],
    finalAnswer: "(a) the two readings are equal; (b) bulbs 3 and 4.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A circuit with a battery at the bottom left. Bulb 1 and Bulb 2 sit on two parallel branches in the middle of the circuit, with voltmeter V1 connected across Bulb 1 and voltmeter V2 across the pair. An ammeter A is in the main line on the left, with Bulb 3 below it, and Bulb 4 is in the main line on the right.",
  },
  // pdf-page 102 (folio 101) — Q8 [1]. Rubric row 8: pdf-page 108.
  {
    id: "CFPQ-S-ELEC-008",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Ammeter and Voltmeter Connections",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Suresh arranges the electric circuit shown below to measure the current flowing through and the potential difference of a bulb.\n\nIs the circuit correct? If not, then identify the mistake.",
    answer: "The circuit is incorrect. The positions of the ammeter and voltmeter have been interchanged.",
    solutionSteps: [
      "[½ mark] The circuit is incorrect.",
      "[½ mark] The positions of the ammeter and voltmeter have been interchanged.",
    ],
    finalAnswer: "No - the ammeter and voltmeter are swapped.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A circuit with a cell on the left. An ammeter A is drawn on the upper branch in parallel across a bulb, and a voltmeter V is drawn in the lower branch in series with the main loop - the two meters are in each other's correct positions.",
  },
  // pdf-page 103 (folio 102) — Q9 [1]. Rubric row 9: pdf-page 108.
  {
    id: "CFPQ-S-ELEC-009",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Equivalent Resistance",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Study the circuit diagram given below. You are given one extra resistor. By drawing a new circuit diagram, show how you can connect the extra resistor to increase the reading on the ammeter in the circuit below.",
    answer: "Connect the extra resistor in parallel with the existing resistor.",
    solutionSteps: [
      "[1 mark] A circuit diagram showing the extra resistor connected in parallel with the resistor already in the circuit. Adding a resistor in parallel lowers the total resistance, so the current read by the ammeter increases.",
    ],
    finalAnswer: "In parallel with the existing resistor.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A simple series circuit: a cell on the left, an ammeter A and a resistor drawn as a zig-zag along the top, and the return wire below, captioned 'Circuit'. A second, unconnected zig-zag resistor is drawn to the right, captioned 'Extra resistor'.",
  },
  // pdf-page 103 (folio 102) — Q10 [2]. Rubric row 10: pdf-page 108.
  {
    id: "CFPQ-S-ELEC-010",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Resistivity and Factors Affecting Resistance",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Priya has a copper wire and an aluminium wire of the same length.\n\nCan the electrical resistance of the two wires be the same? Justify your answer.",
    answer:
      "Yes, the electrical resistance of the two wires can be the same, if the area of cross-section of the two wires is different.",
    solutionSteps: [
      "[1 mark] Yes, the electrical resistance of the two wires can be the same. (No marks to be awarded if justification is not written.)",
      "[1 mark] if the area of cross-section of the two wires is different OR if the thickness of the two wires is different",
    ],
    finalAnswer:
      "Yes - the two metals have different resistivities, but a difference in cross-sectional area can compensate.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: false,
  },
  // pdf-page 103 (folio 102) — Q11 [5]. Rubric row 11: pdf-pages 108-109.
  {
    id: "CFPQ-S-ELEC-011",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Resistors in Parallel",
    section: "D",
    marks: 5,
    format: "Long",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Three resistors in a circuit are attached as shown here. The resistance of F and G are 10 ohm and 5 ohm respectively. The resistance of E is unknown. These resistors are connected to a battery with potential difference 6 V.\n\n(a) What is the term used to describe such an arrangement of resistors?\n(b) What is the resistance of E if 0.3 A current flows through it?\n(c) What is the total current flowing in the circuit?",
    answer:
      "(a) Resistors are attached in parallel. (b) R₁ = 6/0.3 = 20 ohm. (c) Total current = 6/20 + 6/10 + 6/5 = 0.3 + 0.6 + 1.2 = 2.1 A",
    solutionSteps: [
      "[1 mark] (a) Resistors are attached in parallel",
      "[2 marks] (b) Resistance of E = R₁; I = V/R; 0.3 = 6/R; R₁ = 6/0.3; R₁ = 20 ohm. [1.5 marks for the steps to calculate R₁ and 0.5 marks for final answer]",
      "[2 marks] (c) Total current (I) = V/R₁ + V/R₂ + V/R₃ = 6/20 + 6/10 + 6/5 = 0.3 + 0.6 + 1.2 = 2.1 A. [1.5 marks for the steps and 0.5 marks for final answer]",
    ],
    finalAnswer: "(a) parallel; (b) 20 ohm; (c) 2.1 A",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "Three resistors drawn as zig-zags on three separate branches between two junction points labelled X (left) and Y (right): E on the top branch, F in the middle and G below. From Y the wire runs down through an ammeter A to a 6 V battery at the bottom and back to X.",
  },
  // pdf-page 104 (folio 103) — Q13 [1]. Rubric row 13: pdf-page 109.
  {
    id: "CFPQ-S-ELEC-013",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Electric Fuse and Short Circuit",
    section: "A",
    marks: 1,
    format: "VSA",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Observe the circuit shown below. All the three switches are open.\n\nIdentify the switch/switches that on being closed will cause the fuse to blow.",
    answer: "Switch 1 and Switch 2",
    solutionSteps: ["[1 mark] For identifying both, Switch 1 and Switch 2"],
    finalAnswer: "Switch 1 and Switch 2 together.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A circuit with a battery on the left and a fuse in the top wire. Switch 1 is in the top wire after the fuse. A lower branch contains Switch 2 in series with a bulb on the right, and a third branch on the left contains Switch 3 across the battery. All three switches are drawn open.",
  },
  // pdf-page 104 (folio 103) — Q14 [2]. Rubric row 14: pdf-page 109.
  {
    id: "CFPQ-S-ELEC-014",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Heating Effect of Electric Current",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "An incandescent bulb works on the heating effect of electric current. When a current passes through the filament of a bulb it heats the filament to a high temperature which causes the filament to glow.\n\nThe graph below shows the variation in the current through a bulb immediately after it is switched on. The current decreases from 1 A at time t=0 to 0.5 A at t=t₁. The voltage of the power supply is 200 V and remains constant throughout.\n\n(a) Based on the graph, state how the resistance of the bulb filament changes as the temperature increases from time t=0 to t=t₁.\n(b) What is the power consumed by the bulb when it is glowing at its full brightness?",
    answer:
      "(a) The resistance of the bulb increases as the temperature increases. (b) Power = V × I = 200 × 0.5 = 100 W",
    solutionSteps: [
      "[1 mark] (a) The resistance of the bulb increases as the temperature increases.",
      "[1 mark] (b) The current when the bulb is glowing at its full brightness = 0.5 A; Power = V × I = 200 × 0.5 = 100 W",
    ],
    finalAnswer: "(a) resistance increases; (b) 100 W",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A graph of Current (vertical axis) against Time (horizontal axis). The curve starts at 1 A at t = 0, falls steeply and then flattens, levelling off at 0.5 A from time t₁ onwards. Dashed guide lines mark 0.5 A and t₁.",
  },
  // pdf-page 105 (folio 104) — Q15 [2]. Rubric row 15: pdf-page 109.
  {
    id: "CFPQ-S-ELEC-015",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Resistance and Safety in Electric Circuits",
    section: "B",
    marks: 2,
    format: "Short",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "The picture P below shows an electrical tester being used to check the electric point. The picture Q is a diagram showing the internal parts of the electrical tester.\n\n(a) Give the most likely explanation why an electrician does not get an electric shock when he touches the metallic touch screw and the lamp of the tester glows.\n(b) Which part of the tester prevents the shock when the metallic touch screw is touched?",
    answer: "(a) A very low current flows through the tester. (b) the resistor",
    solutionSteps: [
      "[1 mark] (a) A very low current flows through the tester.",
      "[1 mark] (b) the resistor",
    ],
    finalAnswer: "(a) only a very small current flows; (b) the resistor inside the tester.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "Two pictures side by side. P: a photograph of a hand holding a transparent screwdriver-type line tester with its tip inserted into a wall socket. Q: a labelled cutaway diagram of the same tester, with leader lines naming (from the top) the Metallic Touch Screw, Spring, Neon Lamp, Insulated transparent body, Resistor, Insulation, Metallic Rod and Flat type head.",
  },
];

/**
 * THE DECOUPLE — the five MCQs carry authored reasoning (the official key on pdf
 * page 106 gives an option index and nothing else). Every other row's
 * `solutionSteps` come 1:1 from the official rubric.
 */
export const ELEC_CFPQ_AUTHORED_SOLUTION_IDS: ReadonlyArray<string> = [
  "CFPQ-S-ELEC-001",
  "CFPQ-S-ELEC-002",
  "CFPQ-S-ELEC-003",
  "CFPQ-S-ELEC-004",
  "CFPQ-S-ELEC-005",
];
