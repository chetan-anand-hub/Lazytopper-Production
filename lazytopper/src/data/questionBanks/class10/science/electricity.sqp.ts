import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Electricity — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "electricity"
 * Section distribution: B=1, C=2, E=1 (case-based)
 */
export const ELECTRICITY_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-ELEC-001",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Series-Parallel Resistance — Equivalent Resistance",
    "section": "B",
    "marks": 2,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "A piece of wire of resistance R is cut into three equal parts. These parts are then connected in parallel. If the equivalent resistance of this parallel combination is R₁, what is the value of the ratio R₁ : R?",
    "options": [],
    "answer": "R₁ : R = 1 : 9.",
    "solutionSteps": [
      "Resistance of each cut part = R/3 (resistance ∝ length when cross-section and material are unchanged).",
      "Parallel combination of three (R/3) resistors: 1/R₁ = 3/R + 3/R + 3/R = 9/R ⇒ R₁ = R/9. Hence R₁ : R = 1 : 9."
    ],
    "finalAnswer": "R₁ = R/9, so R₁ : R = 1 : 9.",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-ELEC-002",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Joule's Law of Heating and Factors Affecting Resistance",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Understanding",
    "questionText": "(i) State the law that explains the heating effect of current with respect to the measurable properties in an electrical circuit.\n(ii) List the factors on which the resistance of a conductor depends.",
    "options": [],
    "answer": "(i) Joule's law of heating: H = I²Rt; H ∝ I², R, t. (ii) Length, cross-sectional area, nature of material, temperature.",
    "solutionSteps": [
      "(i) Joule's law of heating: the heat dissipated across a resistor is directly proportional to (a) the square of the current flowing through it, (b) the resistance of the conductor, and (c) the duration for which the current flows. Mathematically H = I²Rt.",
      "(ii) Resistance of a conductor depends on: (a) length of the conductor (R ∝ L), (b) cross-sectional area (R ∝ 1/A), (c) the nature of the material (resistivity ρ), and (d) temperature of the conductor (R generally increases with T for metals).",
      "Any two factors fetch full marks for part (ii)."
    ],
    "finalAnswer": "(i) Joule's law H = I²Rt. (ii) Length, area, material (ρ), temperature.",
    "isCompetencyBased": false
  },
  {
    "id": "SQP-S-ELEC-003",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Domestic Circuits — Earth Wire and Fuse Function",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Evaluating",
    "questionText": "Anannya responded to the question: Why are electrical appliances with metallic bodies connected to the mains through a three pin plug, whereas an electric bulb can be connected with a two pin plug? She wrote: 'Three pin connections reduce heating of connecting wires.'\n(i) Is her answer correct or incorrect? Justify.\n(ii) What is the function of a fuse in a domestic circuit?",
    "options": [],
    "answer": "(i) Anannya is incorrect — the third pin is the earth wire (low-resistance safety path), not for reducing heating. (ii) A fuse is a safety device with a wire that melts at excess current, breaking the circuit.",
    "solutionSteps": [
      "(i) Anannya's answer is incorrect. Three-pin plugs are not used to reduce heating in connecting wires.",
      "(i continued) The third pin is connected to the earth wire, which provides a low-resistance conducting path for current to flow to the earth in case of accidental leakage from the metallic body of the appliance. This prevents electric shock to anyone touching the metallic body — it is a safety measure, not a heat-reduction measure.",
      "(ii) An electrical fuse is a safety device that protects against overflow of current in an electrical circuit. Its key component is a metal wire (or strip) with a low melting point that melts when excess current flows through it; melting breaks the circuit and stops further current flow, preventing damage to appliances and fire hazards."
    ],
    "finalAnswer": "(i) Wrong — third pin = earth wire (safety). (ii) Fuse wire melts on excess current to break the circuit.",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-ELEC-004",
    "subject": "Science",
    "topicKey": "electricity",
    "subtopic": "Case-Based — Parallel Circuit with Headlights and Sidelights",
    "section": "E",
    "marks": 4,
    "format": "Case-Based",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "Vinita and Ahmed demonstrated a circuit that operates the two headlights and the two sidelights of a car, in their school exhibition. The 12 V battery feeds (via a selector switch A) two parallel 12 Ω lamps (headlights) at position 2, and two parallel 4 Ω lamps (sidelights) at position 3.\n\n(i) [1 mark] State what happens when switch A is connected to (a) Position 2, (b) Position 3.\n(ii) [1 mark] Find the potential difference across each lamp when lit.\n(iii) [2 marks] Calculate the current (a) in each 12 Ω lamp when lit; (b) in each 4 Ω lamp when lit.\n\n[OR]\n\n(iv) Show, with calculations, which type of lamp, 4.0 Ω or 12 Ω, has the higher power.",
    "options": [],
    "answer": "(i) Pos 2 → 12 Ω headlights ON; Pos 3 → 4 Ω sidelights ON. (ii) 12 V across each lamp (parallel). (iii) 1 A in each 12 Ω lamp; 3 A in each 4 Ω lamp. OR: 4 Ω lamp has higher power (36 W vs 12 W).",
    "solutionSteps": [
      "Part (i): At Position 2, only the 12 Ω lamps (headlights) are on. At Position 3, only the 4 Ω lamps (sidelights) are on. The selector switch chooses which pair the battery feeds.",
      "Part (ii): All lamps in each set are connected in parallel across the 12 V battery, so each lit lamp has the full supply voltage — V = 12 V across each lamp.",
      "Part (iii)(a): For each 12 Ω lamp (Position 2), V = IR ⇒ I = V/R = 12/12 = 1 A.",
      "Part (iii)(b): For each 4 Ω lamp (Position 3), I = V/R = 12/4 = 3 A.",
      "OR (alternative): P = V²/R with V = 12 V for both. For each 4 Ω lamp: P = (12)²/4 = 144/4 = 36 W. For each 12 Ω lamp: P = (12)²/12 = 144/12 = 12 W. So the 4 Ω lamp has the higher power (36 W > 12 W)."
    ],
    "finalAnswer": "(i) Pos 2 → 12 Ω; Pos 3 → 4 Ω. (ii) 12 V each. (iii) 1 A in 12 Ω; 3 A in 4 Ω. OR: 4 Ω lamp = 36 W (higher).",
    "isCompetencyBased": true
  }
];
