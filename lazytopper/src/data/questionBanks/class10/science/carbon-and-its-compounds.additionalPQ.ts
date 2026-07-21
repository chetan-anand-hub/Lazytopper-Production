import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Additional Practice Questions 2023-24 — Class X Science (086)
// Papers: Science-PQ.pdf + Science-PQMS.pdf
// topicKey: "carbon-and-its-compounds"
// Extraction date: 2026-05-25

export const CARBON_COMPOUNDS_APQ: CanonicalQuestion[] = [
  // Science-PQ Q34 first variant (Section D, Long, 5 marks)
  { id: "APQ-S-CARB-001", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Saturation Test — C6H12", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Analysing",
    questionText: "A carbon compound P has six carbon atoms and twelve hydrogen atoms. (a) Is P a saturated or unsaturated carbon compound? Justify by drawing the structural formula. (b) Describe a test that can be used to determine if compound P is saturated or unsaturated. (c) Name the products formed on burning compound P in excess of air.",
    answer: "(a) Could be either (e.g., cyclohexane saturated OR 2-hexene unsaturated). (b) Burning test or bromine water decolourisation. (c) CO2 + H2O.",
    solutionSteps: ["[1 mark] (a) C6H12 fits the general formula CnH2n, which is satisfied both by unsaturated alkenes (one C=C double bond) and by saturated cycloalkanes (a ring). So P may be saturated or unsaturated.", "[1 mark] (a) Structures: unsaturated hexene CH3-CH=CH-CH2-CH2-CH3 (C4=C bond) and saturated cyclohexane (a six-membered ring of six CH2 groups).", "[1 mark] (b) Burning test: an unsaturated compound burns with a sooty yellow flame (high C/H ratio), while a saturated compound burns with a clean blue flame.", "[1 mark] (b) Bromine-water test: an unsaturated compound decolourises brown bromine water; a saturated compound does not.", "[1 mark] (c) On complete combustion in excess air, any hydrocarbon gives carbon dioxide (CO2) and water (H2O)."],
    finalAnswer: "(a) Either saturated (cyclohexane) or unsaturated (hexene); (b) sooty flame OR bromine water test; (c) CO2 and H2O.",
    ncertRef: "APQ Science-PQ Q34 (first variant)", isCompetencyBased: true },

  // Science-PQ Q34 OR variant (Section D, Long, 5 marks)
  { id: "APQ-S-CARB-002", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Alcohols, Esterification, Dehydration", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "A carbon compound P is neutral to red/blue litmus. A gas that burns with a 'pop' sound is produced when a metal reacts with P. (a) Write the chemical equation for the reaction. (b) P is heated with conc. H2SO4 to give compound Q. (i) Write the chemical equation. (ii) Describe the flame Q produces on combustion. (c) What is likely observed on heating P with ethanoic acid + acid catalyst? Write the equation.",
    answer: "(a) 2 Na + 2 C2H5OH → 2 C2H5O-Na+ + H2. (b)(i) C2H5OH → C2H4 + H2O. (ii) Yellow flame with black smoke. (c) Fruity smell (ester formed).",
    solutionSteps: ["P is neutral and reacts with metal to release H2 — characteristic of an alcohol. Take P = ethanol (C2H5OH).", "(a) 2 Na + 2 CH3CH2OH → 2 CH3CH2ONa + H2↑ (gas burns with pop sound).", "(b)(i) Dehydration with conc. H2SO4 at high temp: CH3CH2OH → CH2=CH2 + H2O. Q = ethene (ethylene).", "(b)(ii) Ethene burns with yellow flame and black smoke (high C/H ratio — sooty).", "(c) Ethanol + ethanoic acid → ester (ethyl ethanoate, a sweet/fruity-smelling compound). Equation: CH3COOH + C2H5OH ⇌ CH3COOC2H5 + H2O (acid catalyst, esterification)."],
    finalAnswer: "Ethanol-based reactions: Na, dehydration, esterification — equations + observations.",
    ncertRef: "APQ Science-PQ Q34 (OR variant)", isCompetencyBased: true },

  // Science-PQ Q37 first variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-CARB-003", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Saturated and Unsaturated Hydrocarbons", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Given a 4-carbon skeleton of a hydrocarbon compound. (a) Fill in the hydrogen atoms/bonds to form: (i) a saturated hydrocarbon (ii) an unsaturated hydrocarbon. (b) If the four-carbon skeleton is of a straight chained alkene, draw the structures of all the possible compounds.",
    answer: "(a)(i) Butane C4H10. (a)(ii) Butene/butyne. (b) But-1-ene and but-2-ene.",
    solutionSteps: ["[1 mark] (a)(i) Saturated hydrocarbon with 4 carbons: butane, CH3-CH2-CH2-CH3 (C4H10), with all single bonds.", "[1 mark] (a)(ii) Unsaturated hydrocarbon: butene CH2=CH-CH2-CH3 (C4H8) with a C=C double bond (or butyne CH≡C-CH2-CH3, C4H6).", "[1 mark] (b) First straight-chain alkene: But-1-ene, CH2=CH-CH2-CH3, with the double bond at position 1.", "[1 mark] (b) Second straight-chain alkene: But-2-ene, CH3-CH=CH-CH3, with the double bond at position 2."],
    finalAnswer: "(a) Butane / Butene or Butyne; (b) But-1-ene and But-2-ene.",
    ncertRef: "APQ Science-PQ Q37 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: 4-carbon skeleton and structural drawings." },

  // Science-PQ Q37 OR variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-CARB-004", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Alkynes — Triple Bond", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the four-carbon skeleton is of a straight chained alkyne: (i) How many carbon atoms may NOT be bonded to any hydrogen atoms? (ii) How many hydrogen atoms will there be in the compound?",
    answer: "(i) 1 or 2 carbons. (ii) 6 hydrogens.",
    solutionSteps: ["[1 mark] The straight-chain alkynes with 4 carbons are but-1-yne (HC≡C-CH2-CH3) and but-2-yne (CH3-C≡C-CH3), both C4H6.", "[1 mark] (i) In but-1-yne, HC≡C-CH2-CH3: C1 has 1 H, C2 has 0 H, C3 has 2 H, C4 has 3 H → one carbon (C2) is bonded to no hydrogen.", "[1 mark] (i) In but-2-yne, CH3-C≡C-CH3: C1 has 3 H, C2 has 0 H, C3 has 0 H, C4 has 3 H → two carbons (C2 and C3) are bonded to no hydrogen. So one or two carbons may not be bonded to any H.", "[1 mark] (ii) The molecular formula is C4H6, so the compound contains six hydrogen atoms."],
    finalAnswer: "(i) 1 or 2; (ii) 6.",
    ncertRef: "APQ Science-PQ Q37 (OR variant)", isCompetencyBased: true },

  // ----- Source: Science-PQ2.pdf + Science-PQMS2.pdf (appended 2026-05-25) -----

  // Science-PQ2 Q5 (Section A, MCQ, 1 mark)
  { id: "APQ-S-CARB-005", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Identifying Unsaturated Hydrocarbons — Ethene", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "From the chemical changes shown, which of the following correctly represents 'X'?",
    options: ["Ethane", "Ethene", "Ethyne", "Ethanoic acid"],
    answer: "Ethene",
    solutionSteps: ["Based on the marking scheme, the chemical transformations shown lead to ethene (C2H4) — an unsaturated hydrocarbon with one C=C double bond.", "Ethene decolourises bromine water and is the immediate dehydration product of ethanol."],
    finalAnswer: "(b) Ethene",
    ncertRef: "APQ Science-PQ2 Q5", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: chemical-change diagram showing conversions leading to compound X." },

  // Science-PQ2 Q6 (Section A, MCQ, 1 mark)
  { id: "APQ-S-CARB-006", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Electron Dot Structure — Nitrogen Molecule", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Remembering",
    questionText: "Which of the following structures correctly represents the electron dot (Lewis) structure of a nitrogen molecule (N2)?",
    options: ["Structure with single bond and 2 lone pairs each", "Structure with double bond and lone pairs", "Structure with triple bond and one lone pair on each N", "Structure with only lone pairs and no bond"],
    answer: "Structure with triple bond and one lone pair on each N",
    solutionSteps: ["Each N atom has 5 valence electrons. To complete an octet, both atoms share THREE electron pairs ⟹ triple bond (N≡N).", "After triple-bond sharing, each N has ONE lone pair left. Correct electron-dot structure: :N⫶⫶⫶N: (triple bond between the two N, one lone pair on each)."],
    finalAnswer: "Electron-dot N2: triple bond (3 shared pairs) + one lone pair on each nitrogen.",
    ncertRef: "APQ Science-PQ2 Q6", isCompetencyBased: false,
    strategyHint: "REQUIRES-FIGURE: four candidate electron-dot structures of N2 to choose from." },

  // Science-PQ2 Q34 first variant (Section D, Long, 5 marks)
  { id: "APQ-S-CARB-007", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Ethanol — Oxidation, Sodium Reaction, Dehydration", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "An organic compound 'P' is a constituent of wines. 'P' on reacting with acidified K2Cr2O7 forms another compound 'Q'. When a piece of sodium is added to 'Q', a gas 'R' evolves which burns with a pop sound. (a) Give the chemical name of compound P. (b) Mention another use of compound 'P' apart from in wines. (c) Illustrate the conversion of 'P' into 'Q' with a chemical equation. (d) Give the balanced equation for the reaction of Q with sodium. (e) What happens when 'P' is heated with conc. H2SO4 at 443 K? Write the chemical equation.",
    answer: "P = Ethanol; Q = Ethanoic acid (acetic acid); R = H2.",
    solutionSteps: ["(a) P = Ethanol (C2H5OH) — the alcoholic constituent of wines.", "(b) Another use of ethanol: industrial solvent / ingredient of cough syrup / antiseptic / lab reagent / homeopathic medicine (any one).", "(c) Oxidation of ethanol with acidified K2Cr2O7: C2H5OH → (acidified K2Cr2O7) → CH3COOH. So Q = ethanoic acid.", "(d) Reaction of ethanoic acid with Na: 2 Na + 2 CH3COOH → 2 CH3COONa + H2↑ (gas R = H2, the pop-sound gas).", "(e) Heating ethanol with conc. H2SO4 at 443 K dehydrates it to ethene: C2H5OH → (conc. H2SO4, 443 K) → C2H4 + H2O."],
    finalAnswer: "P=ethanol; Q=ethanoic acid; R=H2; equations for oxidation, Na reaction and dehydration as above.",
    ncertRef: "APQ Science-PQ2 Q34 (first variant)", isCompetencyBased: true },

  // Science-PQ2 Q34 OR variant (Section D, Long, 5 marks)
  { id: "APQ-S-CARB-008", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Esterification — Ethanol and Ethanoic Acid", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "An organic compound 'X' is a liquid at room temperature, a very good solvent, and has the molecular formula C2H6O. Upon oxidation X gives Y. Y releases a gas 'W' with brisk effervescence on reacting with NaHCO3. X reacts with Y in the presence of conc. H2SO4 to give compound 'Z' which has a pleasant smell. (a) Give the chemical name and formula of Y. (b) How will you test the gas 'W'? (c) Depict the formation of Y and Z using chemical equations. (d) Name the reaction of formation of 'Z'. (e) Give any one use of 'Z'.",
    answer: "X = Ethanol; Y = Ethanoic acid (CH3COOH); W = CO2; Z = Ethyl ethanoate (ester).",
    solutionSteps: ["(a) Y = Ethanoic acid, chemical formula CH3COOH.", "(b) Test for gas W: pass the gas through fresh lime water — it turns milky (W is CO2, produced as Y + NaHCO3 → CH3COONa + H2O + CO2).", "(c) Formation of Y (oxidation of X with acidified K2Cr2O7): C2H5OH → (acid. K2Cr2O7) → CH3COOH. Formation of Z (esterification): C2H5OH + CH3COOH → (conc. H2SO4) → CH3COOC2H5 + H2O.", "(d) The reaction in which Z forms is called an ESTERIFICATION reaction.", "(e) Use of Z (ethyl ethanoate): used in perfumes / cosmetics / flavouring agents / as a solvent (any one)."],
    finalAnswer: "Y=ethanoic acid (CH3COOH); W=CO2 (lime-water test); equations for oxidation + esterification; reaction = esterification; Z used in perfumes.",
    ncertRef: "APQ Science-PQ2 Q34 (OR variant)", isCompetencyBased: true },
];
