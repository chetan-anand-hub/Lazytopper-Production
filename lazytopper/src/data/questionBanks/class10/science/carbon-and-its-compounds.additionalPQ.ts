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
    solutionSteps: ["(a) C6H12 fits formula CnH2n. This formula applies to alkenes (one double bond, unsaturated, e.g., 2-hexene: CH3-CH=CH-CH2-CH2-CH3) AND to cycloalkanes (saturated rings, e.g., cyclohexane: cyclic CH2 × 6). So P may be saturated (cyclohexane) or unsaturated (hexene).", "(b) Test 1 — burning: unsaturated compounds burn with a SOOTY flame (high C/H ratio); saturated with a CLEAN flame. Test 2 — bromine water: unsaturated decolourises brown bromine water; saturated does not.", "(c) On complete combustion in excess air: any hydrocarbon → CO2 + H2O. (No marks for only one product.)"],
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
    solutionSteps: ["(a)(i) Saturated hydrocarbon with 4 C: butane CH3-CH2-CH2-CH3 (C4H10).", "(a)(ii) Unsaturated: e.g., butene CH2=CH-CH2-CH3 (C4H8) or butyne CH≡C-CH2-CH3 (C4H6).", "(b) Straight-chain alkenes with 4 C: But-1-ene (CH2=CH-CH2-CH3) and But-2-ene (CH3-CH=CH-CH3). (Cis-2-butene and trans-2-butene are cis/trans isomers.)"],
    finalAnswer: "(a) Butane / Butene or Butyne; (b) But-1-ene and But-2-ene.",
    ncertRef: "APQ Science-PQ Q37 (first variant)", isCompetencyBased: true,
    strategyHint: "REQUIRES-FIGURE: 4-carbon skeleton and structural drawings." },

  // Science-PQ Q37 OR variant (Section E, Case-Based, 4 marks)
  { id: "APQ-S-CARB-004", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Alkynes — Triple Bond", section: "E", marks: 4, format: "Case-Based", difficulty: "Medium", bloomSkill: "Analysing",
    questionText: "If the four-carbon skeleton is of a straight chained alkyne: (i) How many carbon atoms may NOT be bonded to any hydrogen atoms? (ii) How many hydrogen atoms will there be in the compound?",
    answer: "(i) 1 or 2 carbons. (ii) 6 hydrogens.",
    solutionSteps: ["Straight-chain alkynes (C4H6): but-1-yne (HC≡C-CH2-CH3) or but-2-yne (CH3-C≡C-CH3).", "(i) In but-1-yne: only the C between CH3 and CH2 (mid carbon adjacent to triple bond) has bonds saturated by H... actually in HC≡C-CH2-CH3: C1 has 1 H, C2 has 0 H, C3 has 2 H, C4 has 3 H ⟹ 1 carbon with NO H. In but-2-yne (CH3-C≡C-CH3): C1 has 3, C2 has 0, C3 has 0, C4 has 3 ⟹ 2 carbons with NO H. So answer: ONE OR TWO carbons may not be bonded to any H.", "(ii) C4H6 ⟹ six hydrogen atoms."],
    finalAnswer: "(i) 1 or 2; (ii) 6.",
    ncertRef: "APQ Science-PQ Q37 (OR variant)", isCompetencyBased: true },
];
