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
    questionText: "Suresh bought a packet of 100 LEDs to make his own lights for decoration in his house. The packet of LEDs had the following printed on a label:\nLED 2835, 0.2 W, 30 Lumens, 3 V\n\nTo understand how he should connect the LEDs, he referred to the circuit diagram from a website shown in the given figure.\n\nWhich of the following describes how the LEDs are connected in the circuit diagram?",
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
    sourceOverride: "others",
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
      "Suresh bought a packet of 100 LEDs to make his own lights for decoration in his house. The packet of LEDs had the following printed on a label:\nLED 2835, 0.2 W, 30 Lumens, 3 V\n\nTo understand how he should connect the LEDs, he referred to the circuit diagram from a website shown in the given figure.\n\nIf the LED marked 'LED 2' in the diagram stops working, which other LEDs will also stop working?\n(Note: When an LED stops working, current cannot flow across it.)",
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
    sourceOverride: "others",
  },
  // pdf-page 100 (folio 99) — Q3. Key: pdf-page 106, option 2.
  {
    id: "CFPQ-S-ELEC-003", competencyVerified: true,
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
      "Suresh bought a packet of 100 LEDs to make his own lights for decoration in his house. The packet of LEDs had the following printed on a label:\nLED 2835, 0.2 W, 30 Lumens, 3 V\n\nWhat will happen if he connects all 100 LEDs in a parallel combination to the 240 V mains supply?",
    options: [
      "Each LED will work as expected since the available voltage is more than 3 V.",
      "Each LED will have a potential difference of 240 V across it and therefore they will get damaged.",
      "Each LED will glow but the ones closer in the circuit to the main supply will glow brighter.",
      "Each LED will have a potential difference of 2.4 V across it and therefore will glow dimmer than normal."
    ],
    answer: "Each LED will have a potential difference of 240 V across it and therefore they will get damaged.",
    solutionSteps: [
      "[1 mark] Correct option: (2). In a parallel combination every branch has the full supply voltage across it, so each LED - rated for only 3 V - gets 240 V across it and is damaged."
    ],
    finalAnswer: "Each LED will have a potential difference of 240 V across it and therefore they will get damaged.",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: false,
    diagramDescription: LED_DESC,
    sourceOverride: "others",
  },
  // pdf-page 101 (folio 100) — Q5. Key: pdf-page 106, option 1.
  {
    id: "CFPQ-S-ELEC-005", competencyVerified: true,
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
      "[1 mark] (a) Meter 2 (0.5 mark); because it is connected in series with the unknown resistor through which the current needs to be measured (0.5 mark).",
      "[2 marks] (b) Correct connections for the cell, the unknown resistor and the rheostat in the diagram (0.5 mark); correct connections for the two meters in the diagram (0.5 mark); use of correct symbols for all components (1 mark).",
      "[2 marks] (c)(i) straight line passing through origin (1 mark); (ii) curved line with an increasing slope (1 mark).",
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
    format: "MCQ",
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Suresh arranges the electric circuit shown to measure the current through, and the potential difference across, a bulb. Which statement about the circuit is correct?",
    answer: "It is incorrect: the ammeter and voltmeter have been interchanged",
    solutionSteps: [
      "[1 mark] It is incorrect: the ammeter and voltmeter have been interchanged — the ammeter is across the bulb and the voltmeter is in series; they must be swapped."
    ],
    finalAnswer: "It is incorrect: the ammeter and voltmeter have been interchanged",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A circuit with a cell on the left. An ammeter A is drawn on the upper branch in parallel across a bulb, and a voltmeter V is drawn in the lower branch in series with the main loop - the two meters are in each other's correct positions.",
    options: ["It is incorrect: the ammeter and voltmeter have been interchanged", "It is correct as drawn", "It is incorrect: the cell terminals must be reversed", "It is incorrect: both meters should be in series with the bulb"],
    sourceOverride: "others",
  },
  // pdf-page 103 (folio 102) — Q9 [1]. Rubric row 9: pdf-page 108.
  {
    id: "CFPQ-S-ELEC-009",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Equivalent Resistance",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Study the circuit diagram. You are given one extra resistor. How should it be connected to INCREASE the reading on the ammeter?",
    answer: "In parallel with the existing resistor",
    solutionSteps: [
      "[1 mark] In parallel with the existing resistor — a parallel resistor lowers the total resistance, so the current through the ammeter rises."
    ],
    finalAnswer: "In parallel with the existing resistor",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A simple series circuit: a cell on the left, an ammeter A and a resistor drawn as a zig-zag along the top, and the return wire below, captioned 'Circuit'. A second, unconnected zig-zag resistor is drawn to the right, captioned 'Extra resistor'.",
    options: ["In series with the existing resistor", "In parallel with the existing resistor", "In parallel with the ammeter", "In series between the cell and the ammeter"],
    sourceOverride: "others",
  },
  // pdf-page 103 (folio 102) — Q10 [2]. Rubric row 10: pdf-page 108.
  {
    id: "CFPQ-S-ELEC-010", competencyVerified: true,
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
      "Three resistors in a circuit are connected as shown in the given figure. The resistances of F and G are 10 Ω and 5 Ω respectively. The resistance of E is unknown. These resistors are connected to a battery of potential difference 6 V.\n\n(a) What is the term used to describe such an arrangement of resistors?\n(b) What is the resistance of E if 0.3 A current flows through it?\n(c) What is the total current flowing in the circuit?",
    answer:
      "(a) The resistors are connected in parallel. (b) R_E = V/I = 6/0.3 = 20 Ω. (c) Total current = 6/20 + 6/10 + 6/5 = 0.3 + 0.6 + 1.2 = 2.1 A",
    solutionSteps: [
      "[1 mark] (a) The resistors are connected in parallel.",
      "[2 marks] (b) Each branch has the full 6 V across it. I = V/R ⇒ R_E = V/I = 6/0.3 = 20 Ω. [1.5 marks for the steps, 0.5 mark for final answer with unit]",
      "[2 marks] (c) Total current I = V/R_E + V/R_F + V/R_G = 6/20 + 6/10 + 6/5 = 0.3 + 0.6 + 1.2 = 2.1 A. [1.5 marks for the steps, 0.5 mark for final answer with unit]"
    ],
    finalAnswer: "(a) parallel; (b) 20 Ω; (c) 2.1 A",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "Three resistors drawn as zig-zags on three separate branches between two junction points labelled X (left) and Y (right): E on the top branch, F in the middle and G below. From Y the wire runs down through an ammeter A to a 6 V battery at the bottom and back to X.",
    sourceOverride: "others",
  },
  // pdf-page 104 (folio 103) — Q13 [1]. Rubric row 13: pdf-page 109.
  {
    id: "CFPQ-S-ELEC-013",
    subject: "Science",
    topicKey: "electricity",
    subtopic: "Electric Fuse and Short Circuit",
    section: "A",
    marks: 1,
    format: "MCQ",
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "Observe the circuit shown. All three switches are open. Closing which switch/switches will cause the fuse to blow?",
    answer: "Switch 1 and Switch 2",
    solutionSteps: ["[1 mark] Switch 1 and Switch 2 — Switch 1 completes the circuit and Switch 2 short-circuits the bulb, so a very large current flows through the fuse."],
    finalAnswer: "Switch 1 and Switch 2",
    isCompetencyBased: true,
    ncertRef: "CBSE CFPQ Science Class 10 Ch.12 — CFPQ_Science10.pdf, questions pdf pp.100–105 (printed folios 99–104)",
    requiresDiagram: true,
    diagramDescription:
      "A battery on the left; its upper terminal connects through a fuse and then Switch 1 along the top wire to the right-hand side, which runs down through a bulb to the bottom return wire back to the battery. Switch 2 is connected between the wire just above the bulb and the bottom wire, i.e. across the bulb. Switch 3 is connected between two points of the battery's lower (return) wire. All three switches are drawn open.",
    sourceOverride: "others",
    options: ["Switch 1 only", "Switch 1 and Switch 3", "Switch 1 and Switch 2", "Switch 2 and Switch 3"],
  },
  // pdf-page 104 (folio 103) — Q14 [2]. Rubric row 14: pdf-page 109.
  {
    id: "CFPQ-S-ELEC-014", competencyVerified: true,
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
