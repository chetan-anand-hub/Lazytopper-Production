import type { CanonicalQuestion } from "../../../predictionTypes";

/**
 * Metals and Non-metals — CBSE Sample Question Paper 2023-24 (Science — Code 086)
 * Source: Science-SQP.pdf (8pp) + Science-MS.pdf (6pp), cbseacademic.nic.in
 * Extracted: 2026-05-24 (P2 SQP-only scope; APQ deferred to follow-up PR)
 * topicKey: "metals-and-non-metals"
 * Section distribution: A=1, C=2
 */
export const METALS_NON_METALS_SQP: CanonicalQuestion[] = [
  {
    "id": "SQP-S-MNM-001",
    "subject": "Science",
    "topicKey": "metals-and-non-metals",
    "subtopic": "Reaction of Reactive Metal with Dilute Acid",
    "section": "A",
    "marks": 1,
    "format": "MCQ",
    "difficulty": "Easy",
    "bloomSkill": "Applying",
    "questionText": "On adding dilute sulphuric acid to a test tube containing a metal 'X', a colourless gas is produced when a burning match stick is brought near it. Which of the following correctly represents metal 'X'?",
    "options": [
      "(A) Sodium",
      "(B) Sulphur",
      "(C) Copper",
      "(D) Silver"
    ],
    "answer": "(A) Sodium",
    "solutionSteps": [
      "Only metals above hydrogen in the reactivity series displace H₂ from dilute H₂SO₄. Among the options, sodium (very reactive) reacts vigorously and releases H₂ — the colourless gas that burns with a 'pop' sound when a burning matchstick is brought near it. Sulphur is a non-metal; Cu and Ag are below H in reactivity. Answer: (A)."
    ],
    "finalAnswer": "(A) Sodium",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-MNM-002",
    "subject": "Science",
    "topicKey": "metals-and-non-metals",
    "subtopic": "Thermite Reaction — Reactivity Series Application",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Analysing",
    "questionText": "The given reaction shows one of the processes to extract the metals like Iron and Manganese.\nMnO₂(s) + Al(s) → Mn(l) + Al₂O₃(s) + Heat\n(a) Give reason why the above reaction is known as a thermite reaction.\n(b) Identify the substance oxidised and reduced in the above reaction.\n(c) Give a reason why Aluminium is preferably used in thermite reactions.",
    "options": [],
    "answer": "(a) Highly exothermic; metal liberated in molten state. (b) Al oxidised; MnO₂ reduced. (c) Al is more reactive than Fe/Mn (placed above them in reactivity series).",
    "solutionSteps": [
      "(a) The reaction is highly exothermic — large amount of heat released. The metal liberated (Mn or Fe) is obtained in a molten / liquid state because of the heat generated. Hence the name 'thermite' (heat-producing) reaction.",
      "(b) Substance oxidised: Al (loses electrons; oxidation state 0 → +3 in Al₂O₃). Substance reduced: MnO₂ (gains electrons; Mn oxidation state +4 → 0 as Mn metal).",
      "(c) Aluminium is preferably used because it lies above Fe and Mn in the reactivity series. Being more reactive than these metals, Al can displace them from their oxides, accompanied by a large release of energy."
    ],
    "finalAnswer": "(a) Exothermic, molten metal; (b) Al oxidised, MnO₂ reduced; (c) Al more reactive than Fe/Mn.",
    "isCompetencyBased": true
  },
  {
    "id": "SQP-S-MNM-003",
    "subject": "Science",
    "topicKey": "metals-and-non-metals",
    "subtopic": "Ionic Bonding and Electrical Conductivity — Group 13 Metal",
    "section": "C",
    "marks": 3,
    "format": "Short",
    "difficulty": "Medium",
    "bloomSkill": "Applying",
    "questionText": "An element 'M' with electronic configuration 2, 8, 3 combines separately with Cl⁻ and SO₄²⁻ anions. Write the chemical formulae of the compounds formed. Predict with the suitable reason the nature of the bond formed by element 'M' in general. How will the electrical conductivity of the compounds formed vary with respect to 'M'?\n\n[OR]\n\nA reddish-brown metal 'X', when heated in air, gives a black compound 'Y', which when heated in presence of H₂ gas gives 'X' back. 'X' is refined by the process of electrolysis; this refined form of 'X' is used in electrical wiring. Identify 'X' and 'Y'. Draw a well-labeled diagram to represent the process of refining 'X'.",
    "options": [],
    "answer": "Main: MCl₃ and M₂(SO₄)₃; ionic bond (M is Al, loses 3 e⁻); compounds conduct in molten/aqueous state but not in solid state. OR Alt: X = Copper (Cu); Y = CuO.",
    "solutionSteps": [
      "Main: Element M has electron config 2, 8, 3 — three valence electrons — so it forms M³⁺ by losing 3 electrons to attain stable neon (2,8) configuration.",
      "Compounds formed: with Cl⁻ → MCl₃ (1 M³⁺ balances 3 Cl⁻). With SO₄²⁻ → M₂(SO₄)₃ (2 M³⁺ = +6; 3 SO₄²⁻ = −6).",
      "M forms ionic bonds in general (metal donating electrons to non-metal anions). The compounds MCl₃ and M₂(SO₄)₃ are ionic — they conduct electricity in molten or aqueous solution (ions free to move) but not in solid state (ions held in fixed lattice). In contrast, M itself (a metal) conducts in solid state via free electrons.",
      "OR (alternative): X = Copper (Cu) — reddish-brown; Y = CuO (copper(II) oxide) — black. 2Cu + O₂ → 2CuO (heating in air); CuO + H₂ → Cu + H₂O (reduction with H₂). Cu is refined by electrolysis: impure Cu = anode, pure Cu = cathode, CuSO₄ solution = electrolyte. Pure Cu deposits on cathode; impurities settle as anode mud. Refined Cu is used in electrical wiring due to high conductivity."
    ],
    "finalAnswer": "Main: MCl₃, M₂(SO₄)₃; ionic; conducts in molten/aqueous state only. OR Alt: X = Cu, Y = CuO; electrolytic refining diagram.",
    "isCompetencyBased": true
  }
];
