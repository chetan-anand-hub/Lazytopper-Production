import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * electricity — CBSE CBE Item Bank (Science Class 10, British Council / CBSE, Sep 2021).
 * Source: Item-Bank---Science-Class-10.pdf. Extracted 2026-05-29 (Sprint 1).
 * topicKey "electricity". pyqYear OMITTED (item-bank, not PYQ).
 */
export const ELEC_CBE: CanonicalQuestion[] = [
  {
    "id": "CBE-S-ELEC-A-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Resistors in Series",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The circuit diagram shows resistors R1, R2, R3, R4 and R5 connected in series and parallel combinations. State two resistors that are connected in series.",
    "options": [],
    "answer": "R1 and R2 (ALLOW R2 and R4 / R3 and R4 / R3 and R5).",
    "solutionSteps": [
      "[1 mark] Identify two resistors in the same single path with no branch between them, e.g. R1 and R2."
    ],
    "finalAnswer": "R1 and R2",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Circuit diagram with cell Vt, ammeters and resistors R1 (20 Ω), R2 (40 Ω), R3 (30 Ω), R4 (40 Ω), R5 (120 Ω) in series-parallel combination; circuit current 0.25 A."
  },
  {
    "id": "CBE-S-ELEC-A-002",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Resistors in Parallel",
    "section": "A",
    "marks": 1,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Using the same circuit, state one combination of resistors in parallel.",
    "options": [],
    "answer": "R4 and R5 (also R1 and R2 are in parallel with R3).",
    "solutionSteps": [
      "[1 mark] Identify two resistors that share both nodes / lie on separate branches, e.g. R4 and R5."
    ],
    "finalAnswer": "R4 and R5",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Same series-parallel circuit with R1–R5 and cell Vt."
  },
  {
    "id": "CBE-S-ELEC-A-003",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Current-Voltage Graphs and Resistance",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Hard",
    "bloomSkill": "Analysing",
    "questionText": "A student plots the current-voltage graphs of three samples of nichrome wire with resistances R1, R2 and R3, and writes three conclusions: 1. R3 has the lowest resistance; 2. The resistors are ohmic; 3. R3 dissipates the most power. Which conclusions are correct?",
    "options": [
      "A. 1, 2 and 3",
      "B. 1 and 2 only",
      "C. 1 and 3 only",
      "D. 2 and 3 only"
    ],
    "answer": "D. 2 and 3 only",
    "solutionSteps": [
      "[1 mark] The graphs are straight lines through the origin, so the resistors are ohmic (conclusion 2 correct); R3 has the steepest line so it has the lowest resistance and, at a given voltage, draws the most current and dissipates the most power (conclusion 3 correct). Answer: D."
    ],
    "finalAnswer": "D. 2 and 3 only",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Current-voltage (I against V) straight-line graphs for three nichrome samples of resistance R1, R2, R3 passing through the origin with different gradients."
  },
  {
    "id": "CBE-S-ELEC-A-004",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Measuring Current — Ammeter Connection",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "Which row of the table shows the instrument used to measure current and how it is connected in a circuit?",
    "options": [
      "A. Ammeter — parallel",
      "B. Ammeter — series",
      "C. Voltmeter — parallel",
      "D. Voltmeter — series"
    ],
    "answer": "B. Ammeter — series",
    "solutionSteps": [
      "[1 mark] Current is measured with an ammeter connected in series in the circuit. Answer: B."
    ],
    "finalAnswer": "B. Ammeter — series",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-B-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Series and Parallel Circuits in the Home",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Lamps in the home are connected in parallel. Give two reasons why lamps are connected in parallel.",
    "options": [],
    "answer": "Each lamp gets the full supply voltage; if one lamp breaks the others remain working (or: each can be switched on/off independently).",
    "solutionSteps": [
      "[1 mark] In a parallel connection each lamp receives the full supply voltage, so every lamp glows at full brightness.",
      "[1 mark] If one lamp breaks (open circuit), the others remain working, and each lamp can be switched on and off independently."
    ],
    "finalAnswer": "Each lamp gets the full supply voltage, and if one lamp fails the others keep working / can be controlled independently.",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-B-002",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Factors Affecting Resistance",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Remembering",
    "questionText": "The circuit in Fig. 1.1 has resistors in series and parallel. State two factors that affect the resistance of a resistor.",
    "options": [],
    "answer": "Any two of: length, cross-sectional area, temperature, material.",
    "solutionSteps": [
      "[1 mark] One factor, e.g. length (or material).",
      "[1 mark] A second factor, e.g. cross-sectional area (or temperature)."
    ],
    "finalAnswer": "Two of: length, cross-sectional area, temperature, material.",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-B-003",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Identifying Ammeter and Voltmeter",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "X and Y are meters in the circuit. Identify X and Y and the electrical property that each meter measures.",
    "options": [],
    "answer": "X is an ammeter and measures current; Y is a voltmeter and measures voltage / potential difference.",
    "solutionSteps": [
      "[1 mark] X is an ammeter and measures current.",
      "[1 mark] Y is a voltmeter and measures voltage / potential difference."
    ],
    "finalAnswer": "X – ammeter (current); Y – voltmeter (potential difference).",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Fig. 1.1: circuit with resistors in series and parallel and two meters labelled X and Y."
  },
  {
    "id": "CBE-S-ELEC-B-004",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Potential Difference Across a Combination",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The R4–R5 parallel combination has resistance 30 Ω, the total resistance is 50 Ω, the circuit current is 0.25 A and the cell p.d. is 12.5 V. Determine the potential difference across the combination R4 and R5.",
    "options": [],
    "answer": "7.5 V",
    "solutionSteps": [
      "[1 mark] Use Ohm's law for the R4–R5 combination (30 Ω) with the circuit current: V = 30 × 0.25 (or proportional reasoning 30/50 × 12.5).",
      "[1 mark] Calculate: V = 7.5 V."
    ],
    "finalAnswer": "V = 7.5 V",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-B-005",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Factors Affecting Resistance",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A wire has length l, cross-sectional area A and a resistance of 16 Ω. Determine the resistance of a wire made from the same material with length 0.5l and cross-sectional area 2A.",
    "options": [],
    "answer": "4 Ω",
    "solutionSteps": [
      "[1 mark] Halving the length halves the resistance: 16 Ω → 8 Ω.",
      "[1 mark] Doubling the cross-sectional area halves the resistance again: 8 Ω → 4 Ω."
    ],
    "finalAnswer": "R = 4 Ω",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-B-006",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Effect of Cross-Sectional Area on Resistance",
    "section": "B",
    "marks": 2,
    "format": "VSA",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "The diagram shows a thick copper wire A and a thin copper wire B. Both wires have the same length. State and explain the difference, if any, in the resistance of the wires.",
    "options": [],
    "answer": "Wire A has less resistance than wire B because it has a larger cross-sectional area.",
    "solutionSteps": [
      "[1 mark] State that wire A (thicker) has lower resistance than wire B (thinner) because it has a larger cross-sectional area.",
      "[1 mark] Explain that a larger cross-sectional area provides more pathways for the movement of electrons."
    ],
    "finalAnswer": "Thick wire A has lower resistance (larger cross-sectional area → more electron pathways).",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Diagram of a thick copper wire A and a thin copper wire B of the same length."
  },
  {
    "id": "CBE-S-ELEC-C-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Electrical Energy and Cost (kilowatt-hour)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The cost of electricity is Rs 4 per kilowatt-hour. Calculate the cost of using a 100 W lamp for 8 hours.",
    "options": [],
    "answer": "Rs 3.20",
    "solutionSteps": [
      "[1 mark] Convert power to kilowatts: 100 W = 0.1 kW.",
      "[1 mark] Energy used = power × time = 0.1 kW × 8 h = 0.8 kWh; cost = energy × rate = 0.8 × Rs 4 (i.e. 0.1 × 4 × 8).",
      "[1 mark] Cost = Rs 3.2 (Rs 3.20)."
    ],
    "finalAnswer": "Rs 3.20",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-C-002",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Ohm's Law (Calculating Current)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The equivalent resistance of the circuit is 5 Ω and the supply is 6 V. Using your answer to the equivalent resistance, calculate the current in the circuit. State the unit.",
    "options": [],
    "answer": "I = 1.2 A",
    "solutionSteps": [
      "[1 mark] Recall Ohm's law: V = IR.",
      "[1 mark] Rearrange and substitute: I = V/R = 6/5.",
      "[1 mark] I = 1.2 A (with correct SI unit, ampere)."
    ],
    "finalAnswer": "I = 1.2 A",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Fig. 1.1: circuit with resistors in series and parallel (equivalent resistance 5 Ω) and a supply."
  },
  {
    "id": "CBE-S-ELEC-C-003",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Equivalent Resistance (Parallel)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Calculate the equivalent resistance RT of the parallel combination of R1, R2 and R3, where R1 + R2 = 60 Ω and R3 = 30 Ω.",
    "options": [],
    "answer": "RT = 20 Ω",
    "solutionSteps": [
      "[1 mark] R1 + R2 (in series) = 60 Ω; recall the parallel equation 1/RT = 1/R1 + 1/R2.",
      "[1 mark] Substitute: 1/RT = 1/60 + 1/30.",
      "[1 mark] Rearrange and calculate: RT = 20 Ω."
    ],
    "finalAnswer": "RT = 20 Ω",
    "isCompetencyBased": false,
    "requiresDiagram": true,
    "diagramDescription": "Series-parallel network where the 60 Ω (R1+R2) branch is in parallel with R3 = 30 Ω."
  },
  {
    "id": "CBE-S-ELEC-C-004",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Ohm's Law — Potential Difference",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "The total resistance of the circuit is 50 Ω and the current in the circuit is 0.25 A. Calculate the potential difference of the cell. State the unit.",
    "options": [],
    "answer": "12.5 V",
    "solutionSteps": [
      "[1 mark] Recall Ohm's law: V = IR.",
      "[1 mark] Substitute and calculate: V = 0.25 × 50 = 12.5.",
      "[1 mark] State the unit: V (volt)."
    ],
    "finalAnswer": "V = 12.5 V",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-C-005",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Ohm's Law — Resistance from V and I",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "In an investigation the current and potential difference across a resistor were measured. At I = 4 A the potential difference is V = 13.2 V. Calculate the resistance of the resistor at 13.2 V.",
    "options": [],
    "answer": "3.6 Ω",
    "solutionSteps": [
      "[1 mark] Recall Ohm's law: V = IR, i.e. 13.2 = 4 × R.",
      "[1 mark] Rearrange: R = 13.2/4.",
      "[1 mark] Calculate with unit: R = 3.6 Ω."
    ],
    "finalAnswer": "R = 3.6 Ω",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-C-006",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Ohm's Law — Current Calculation",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "An electrical appliance has a resistance of 11 Ω and is connected to a supply voltage of 220 V. Calculate the current in the appliance. State the unit.",
    "options": [],
    "answer": "11 A",
    "solutionSteps": [
      "[1 mark] Recall Ohm's law: V = IR.",
      "[1 mark] Rearrange and substitute: I = 220/11.",
      "[1 mark] Calculate with unit: I = 11 A."
    ],
    "finalAnswer": "I = 11 A",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-C-007",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Electric Power (P = VI)",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Using the current of 11 A in the appliance (supply 220 V), calculate the power dissipated by the appliance. State the unit.",
    "options": [],
    "answer": "2420 W",
    "solutionSteps": [
      "[1 mark] Recall the power equation: P = VI.",
      "[1 mark] Substitute: P = 220 × 11.",
      "[1 mark] Calculate with unit: P = 2420 W."
    ],
    "finalAnswer": "P = 2420 W",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-C-008",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Advantages of Parallel Connection",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Easy",
    "bloomSkill": "Understanding",
    "questionText": "Electrical appliances in the home are connected in parallel. Give three advantages of connecting appliances in parallel.",
    "options": [],
    "answer": "All receive the full supply voltage; can be switched on/off independently; if one appliance stops working the others keep working.",
    "solutionSteps": [
      "[1 mark] All appliances receive the full supply voltage.",
      "[1 mark] Each appliance can be switched on or off independently.",
      "[1 mark] If one appliance stops working, the operation of the others continues."
    ],
    "finalAnswer": "Full voltage to each; independent switching; failure of one does not stop others.",
    "isCompetencyBased": false
  },
  {
    "id": "CBE-S-ELEC-E-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Heating Effect of Electric Current",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "Fig. 1 shows the filament in a lamp. The filament is made from a very thin piece of metal. When there is a current in the filament it glows brightly and becomes very hot. Explain how the current causes the filament to become hot.",
    "options": [],
    "answer": "The filament metal has resistance; work is done against the resistance by the moving electrons; this releases heat energy; electrical energy is transferred to thermal/heat energy.",
    "solutionSteps": [
      "[1 mark] The filament metal has resistance which opposes the flow of charge.",
      "[1 mark] Work is done against this resistance by the electrons as they move through the wire.",
      "[1 mark] As the electrons collide with the ions of the metal lattice, heat energy is released.",
      "[1 mark] Electrical energy is thereby transferred to thermal (heat) energy, so the filament becomes very hot and glows."
    ],
    "finalAnswer": "Electrical energy is converted to heat energy because work is done by the moving electrons against the filament's resistance, raising its temperature.",
    "isCompetencyBased": true,
    "requiresDiagram": true,
    "diagramDescription": "Fig. 1 shows a lamp with a thin metal filament coil inside the glass bulb, connected across the supply terminals."
  }
];
