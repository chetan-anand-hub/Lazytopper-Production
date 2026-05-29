import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * electricity — CBSE Sample Papers (P5): Science SQP 2022-23 + OnBoard 2023.
 * Extracted 2026-05-29 (Sprint 1). topicKey "electricity". pyqYear OMITTED (sample papers, not board PYQ).
 */
export const ELEC_SP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-2023-ELEC-A-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Electric current in a simple circuit",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "A complete circuit is formed by using a cell, a resistor (R), a key (K), and an ammeter (A) as shown in the circuit diagrams (i), (ii) and (iii), which differ only in the relative positions of the components in the series loop. The current recorded in the attached ammeter will be",
    "options": [
      "(a) maximum in (i).",
      "(b) maximum in (ii).",
      "(c) maximum in (iii).",
      "(d) same in all the cases."
    ],
    "answer": "(d) same in all the cases.",
    "solutionSteps": [
      "[1 mark] Correct option (d) same in all the cases: in a series circuit the current is the same everywhere and is independent of the order/position of the cell, resistor, key and ammeter, so all three ammeters read the same value."
    ],
    "finalAnswer": "(d) same in all the cases.",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Three series circuits (i), (ii), (iii), each containing a cell, a resistor R, a key K and an ammeter A connected in a single loop; the three diagrams differ only in the order in which these components are placed around the loop."
  },
  {
    "id": "SQP-S-2023-ELEC-A-002",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Combination of resistors",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In the given network a 4 Ω resistor and a 6 Ω resistor are connected between points A and B. The effective resistance between A and B will be",
    "options": [
      "(a) 4 Ω",
      "(b) 6 Ω",
      "(c) May be 10 Ω",
      "(d) Must be 10 Ω"
    ],
    "answer": "(a) 4 Ω",
    "solutionSteps": [
      "[1 mark] Correct option (a) 4 Ω: as per the official marking scheme, the effective resistance between A and B for the given arrangement of the 4 Ω and 6 Ω resistors is 4 Ω."
    ],
    "finalAnswer": "(a) 4 Ω",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "A resistor network between terminals A and B containing a 4 Ω resistor and a 6 Ω resistor; the exact series/parallel arrangement is shown in the figure and, per the marking scheme, gives an effective resistance of 4 Ω."
  },
  {
    "id": "SQP-S-2023-ELEC-C-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Electric fuse",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "What is a fuse and how does it work?",
    "options": [],
    "answer": "An electric fuse is a safety device made of a thin wire with a low melting point and high resistance; when the current exceeds a safe value it heats up, melts and breaks the circuit, protecting appliances from damage.",
    "solutionSteps": [
      "[1 mark] An electric fuse is a safety device consisting of a piece of thin wire made of a material having a low melting point and a high resistance.",
      "[1 mark] When the current in the circuit exceeds a safe value, the fuse wire heats up, melts and breaks the circuit.",
      "[1 mark] By breaking the circuit, the fuse stops the excessive current and thus prevents the electrical appliances in the circuit from getting damaged."
    ],
    "finalAnswer": "A fuse is a thin, low-melting-point, high-resistance safety wire that melts and breaks the circuit when current exceeds a safe value, protecting appliances.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-2023-ELEC-D-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Resistance, resistivity and dimensions of a wire",
    "section": "D",
    "marks": 5,
    "format": "Long",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "A wire made up of copper metal has a diameter of 0.5 mm and resistivity of 1.6 × 10^-8 Ω m. Calculate the length of the wire to make resistance of 100 Ω. How much does the resistance change if the diameter of the wire is doubled without changing its length?",
    "options": [],
    "answer": "Length of the wire ≈ 1200 m; if the diameter is doubled (length unchanged), the new resistance becomes one-fourth, i.e. 25 Ω.",
    "solutionSteps": [
      "[1 mark] Given: ρ = 1.6 × 10^-8 Ω m, d = 0.5 mm, R = 100 Ω. Radius r = d/2 = 0.25 mm = 2.5 × 10^-4 m.",
      "[1 mark] Area of cross-section A = πr² = 3.14 × (2.5 × 10^-4)² ≈ 1.9 × 10^-7 m².",
      "[1 mark] Using R = ρl/A → l = RA/ρ = (100 × 1.9 × 10^-7)/(1.6 × 10^-8) ≈ 1200 m.",
      "[1 mark] If diameter is doubled (d' = 2d), new area A' = π(d'/2)² = π(d)² = 4A (four times the original area).",
      "[1 mark] Since R ∝ 1/A at constant length, the resistance decreases four times: R' = R/4 = 100/4 = 25 Ω."
    ],
    "finalAnswer": "Length ≈ 1200 m; doubling the diameter (same length) reduces resistance to one-fourth, i.e. 25 Ω.",
    "isCompetencyBased": false
  },
  {
    "id": "SP-S-2023-ELEC-B-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Resistance in Parallel",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A piece of wire of resistance R is cut into five equal parts. These parts are then connected in parallel. If the equivalent resistance of this combination is R', what is the value of the ratio R : R'?",
    "options": [],
    "answer": "R : R' = 25 : 1",
    "solutionSteps": [
      "[1 mark] Each of the five equal parts has resistance R/5. For five equal resistances in parallel: 1/R' = (R/5)^-1 x 5 = 5/(R/5) = 25/R, so R' = R/25.",
      "[1 mark] Therefore the ratio R : R' = R : (R/25) = 25 : 1."
    ],
    "finalAnswer": "R : R' = 25 : 1",
    "isCompetencyBased": false
  },
  {
    "id": "SP-S-2023-ELEC-C-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Ohm's Law and Heating Effect",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "(a) State Ohm's law. Draw a schematic diagram of the circuit for studying Ohm's law. (b) State Joule's law of heating.",
    "options": [],
    "answer": "(a) Ohm's law: the current I through a conductor between two points is directly proportional to the potential difference V across it, provided temperature and physical conditions remain constant; V = IR. (b) Joule's law: heat produced Q = I^2 R t.",
    "solutionSteps": [
      "[1 mark] (a) Ohm's law: at constant temperature and physical conditions, the electric current (I) flowing through a conductor is directly proportional to the potential difference (V) across its ends, i.e. V proportional to I, or V = IR, where R is the resistance.",
      "[1 mark] The schematic circuit for studying Ohm's law consists of a battery, a key (switch), the conductor/resistor, a rheostat, an ammeter connected in series and a voltmeter connected in parallel across the conductor.",
      "[1 mark] (b) Joule's law of heating: the heat produced in a conductor is directly proportional to the square of the current (I^2), the resistance (R) and the time (t) for which the current flows: Q = I^2 R t (Q in joules, I in amperes, R in ohms, t in seconds)."
    ],
    "finalAnswer": "(a) V = IR (Ohm's law) with ammeter in series and voltmeter in parallel; (b) Q = I^2 R t (Joule's law of heating).",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Schematic circuit for studying Ohm's law: a battery connected through a plug key and a rheostat to a resistor (nichrome wire). An ammeter (A) is connected in series with the resistor, and a voltmeter (V) is connected in parallel across the resistor."
  },
  {
    "id": "SP-S-2023-ELEC-C-002",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Electric Fuse and MCB (Safety)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "Reema visited her ancestral house in a small town. One day, all the lights got switched off in the evening. Her grandfather immediately checked the fuse and changed the fuse wire. The lights were on again. Reema suggested to her grandfather to use a miniature circuit breaker (MCB) in place of an electric fuse. (a) Why are MCBs being used in houses nowadays? (b) What values are associated with Reema's suggestion?",
    "options": [],
    "answer": "(a) MCBs are reusable, highly sensitive to abnormal current, trip automatically to OFF in a fault, have low maintenance/replacement cost and are safer than fuses. (b) Values: precautionary principle, awareness and caring.",
    "solutionSteps": [
      "[1 mark] (a) MCBs are reusable (low maintenance and replacement cost) and automatically switch off the circuit due to their high sensitivity to abnormal current flow.",
      "[1 mark] In a faulty circuit the MCB trips to the OFF position so the user is not exposed to live electrical parts, making it a safer option than a fuse that must be replaced each time.",
      "[1 mark] (b) The values associated with Reema's suggestion are the precautionary principle, awareness and caring (concern for safety of the family)."
    ],
    "finalAnswer": "(a) MCBs are reusable, sensitive, auto-tripping and safer; (b) values shown are precautionary principle, awareness and caring.",
    "isCompetencyBased": true
  },
  {
    "id": "SP-S-2023-ELEC-E-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Series Circuits and Current",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Hard",
    "bloomSkill": "Applying",
    "questionText": "(a) How will you infer with the help of an experiment that the same current flows through every part of the circuit containing three resistors R1, R2 and R3 connected in series to a battery of V volts? (b) Study the following circuit and find out: (i) current in 12 ohm resistor; (ii) difference in the readings of ammeters A1 and A2, if any.",
    "options": [],
    "answer": "(a) Connect R1, R2, R3 in series with an ammeter and measure current at different points; the ammeter reading is the same everywhere, showing the same current flows throughout. (b)(i) Current through the 12 ohm resistor = 0.25 A; (ii) difference in readings of A1 and A2 = 0 (they are in series).",
    "solutionSteps": [
      "[1 mark] (a) Construct a circuit connecting the three resistances R1, R2 and R3 in series across a battery of V volts, with an ammeter in series and a voltmeter in parallel; place the ammeter at different positions in the circuit.",
      "[1 mark] (a cont.) On taking readings, the ammeter shows the same value at every point in the series circuit, confirming that the same current flows through every part (from Ohm's law I = V/R, the current is identical in a series circuit).",
      "[1 mark] (b)(i) Equivalent resistance = (24 x 24)/(24 + 24) + 12 = 12 + 12 = 24 ohm; current through the 12 ohm resistor I = V/RE = 6/24 = 0.25 A.",
      "[1 mark] (b)(ii) The difference in the readings of ammeters A1 and A2 = 0, since they are connected in series and the same current flows through both."
    ],
    "finalAnswer": "(a) Same ammeter reading at all points proves equal current in a series circuit; (b)(i) 0.25 A; (b)(ii) difference = 0.",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Part (a): a series circuit with three resistors R1, R2, R3 connected to a battery of V volts through a key, with an ammeter (A) in series and a voltmeter (V) across the resistors. Part (b): a circuit with a 6 V source feeding two 24 ohm resistors in parallel (combining to 12 ohm) in series with a 12 ohm resistor, with ammeters A1 and A2 placed in series in the main line."
  }
];
