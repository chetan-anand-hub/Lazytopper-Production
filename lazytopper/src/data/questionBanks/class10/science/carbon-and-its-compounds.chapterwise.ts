import type { CanonicalQuestion } from "../../../predictionTypes";

// Source: CBSE Chapter-wise practice (www.cbse.online / rava.org.in)
// PDFs: cbjescco04.pdf (MCQ) + cbjesccq04.pdf (PYQ-style)
// topicKey: "carbon-and-its-compounds"
// Extraction date: 2026-05-25 (P3 Science chapterwise)
// Tool: pymupdf 1.27.2.3 (0 cid artifacts confirmed)
// Caps: 20 MCQs + up to 6/section PYQ-style.

export const CARBON_COMPOUNDS_CHAPTERWISE: CanonicalQuestion[] = [
  // cbjescco04 Q2
  { id: "SCO-S-CARB-001", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Which of the following will contain covalent double bond between its atoms?",
    options: ["H2", "O2", "NaCl", "Cl2"],
    answer: "O2",
    solutionSteps: ["Correct option is (b) O2.", "Oxygen atom has six (6) valence electrons. Thus, to complete its octet, it forms double bond with another oxygen atom to get O2 molecule."],
    finalAnswer: "(b) O2",
    ncertRef: "cbjescco04 Q2", isCompetencyBased: true },
  // cbjescco04 Q4
  { id: "SCO-S-CARB-002", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Which of the following is not the property of homologous series?",
    options: ["They differ by-CH2 units", "They differ by-14 units by mass", "They all contain double bond", "They can be represented by a general formula"],
    answer: "They all contain double bond",
    solutionSteps: ["Correct option is (c) They all contain double bond.", "It is not necessary for a homologous series that it must contain the double bond."],
    finalAnswer: "(c) They all contain double bond",
    ncertRef: "cbjescco04 Q4", isCompetencyBased: true },
  // cbjescco04 Q5
  { id: "SCO-S-CARB-003", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Which of the following is not a property of carbon?",
    options: ["Carbon compounds are good conductor of heat and electricity", "Carbon compounds are poor conductor of heat and electricity", "Most of the carbon compounds are covalent compounds", "Boiling and melting point of carbon compounds are relatively lower than those of ionic compounds"],
    answer: "Carbon compounds are good conductor of heat and electricity",
    solutionSteps: ["Correct option is (a) Carbon compounds are good conductor of heat and electricity.", "heat and electricity Carbon compounds are covalently bonded and are poor conductor of heat and electricity. Due to covalent bonds, their boiling and melting points are relatively lower than those of ionic compounds."],
    finalAnswer: "(a) Carbon compounds are good conductor of heat and electricity",
    ncertRef: "cbjescco04 Q5", isCompetencyBased: true },
  // cbjescco04 Q8
  { id: "SCO-S-CARB-004", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Oils on treating with hydrogen in the presence of palladium or nickel catalyst form fats. This is an example of",
    options: ["addition reaction", "substitution reaction", "displacement reaction", "oxidation reaction"],
    answer: "addition reaction",
    solutionSteps: ["Correct option is (a) addition reaction."],
    finalAnswer: "(a) addition reaction",
    ncertRef: "cbjescco04 Q8", isCompetencyBased: true },
  // cbjescco04 Q9
  { id: "SCO-S-CARB-005", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Carbon exists in the atmosphere in the form of",
    options: ["carbon monoxide only", "carbon monoxide in traces and carbon dioxide", "carbon dioxide only", "coal"],
    answer: "carbon monoxide in traces and carbon dioxide",
    solutionSteps: ["Correct option is (b) carbon monoxide in traces and carbon dioxide."],
    finalAnswer: "(b) carbon monoxide in traces and carbon dioxide",
    ncertRef: "cbjescco04 Q9", isCompetencyBased: true },
  // cbjescco04 Q10
  { id: "SCO-S-CARB-006", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Combustion", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "The number of oxygen molecules used in the complete combustion of 1 molecule of ethanol is:",
    options: ["1", "2", "3", "4"],
    answer: "3",
    solutionSteps: ["C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O, so 3 oxygen molecules are used. Correct option: (c) 3."],
    finalAnswer: "(c) 3",
    ncertRef: "cbjescco04 Q10", isCompetencyBased: true,
    sourceOverride: "others", },
  // cbjescco04 Q13
  { id: "SCO-S-CARB-007", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What would happen if graphene is heated in sufficient supply of air?",
    options: ["It aggregates to form graphite", "It gets converted into diamond", "Carbon dioxide gas is released", "It becomes a non-conductor"],
    answer: "Carbon dioxide gas is released",
    solutionSteps: ["Correct option is (c) Carbon dioxide gas is released.", "Graphene is an allotrope of carbon and all the allot- ropes exhibit similar chemical properties. So, when heated in excess of air, it gives carbon dioxide gas."],
    finalAnswer: "(c) Carbon dioxide gas is released",
    ncertRef: "cbjescco04 Q13", isCompetencyBased: true },
  // cbjescco04 Q15
  { id: "SCO-S-CARB-008", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Methane, ethane and propane are said to form a homologous series because all are-",
    options: ["hydrocarbons", "saturated compounds", "aliphatic compounds", "differ from each other by a CH2 group"],
    answer: "differ from each other by a CH2 group",
    solutionSteps: ["Correct option is (d) differ from each other by a CH2 group."],
    finalAnswer: "(d) differ from each other by a CH2 group",
    ncertRef: "cbjescco04 Q15", isCompetencyBased: true },
  // cbjescco04 Q16
  { id: "SCO-S-CARB-009", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "When methane is burnt in an excess of air, the products of combustion are-",
    options: ["C and H2O", "CO and H2O", "CO2 and H2", "CO2 and H2O"],
    answer: "CO2 and H2O",
    solutionSteps: ["Correct option is (d) CO2 and H2O. In excess air methane burns completely: CH4 + 2O2 → CO2 + 2H2O."],
    finalAnswer: "(d) CO2 and H2O",
    ncertRef: "cbjescco04 Q16", isCompetencyBased: true,
    sourceOverride: "others", },
  // cbjescco04 Q17
  { id: "SCO-S-CARB-010", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "The structures of three hydrocarbons are given below. Which statement is correct for all the above three compounds?",
    options: ["They are isomers of each other", "They have the same general formula", "They have the same physical properties", "They react with aqueous bromine"],
    answer: "They have the same general formula",
    solutionSteps: ["Correct option is (b) They have the same general formula.", "All the given compounds have only C H - and C C - single bonds and hence belongs to the same homologous series, i.e. their general formula is same. Note: These compounds belong to alkane series, general formula of which is C H n n 2 2 + ."],
    finalAnswer: "(b) They have the same general formula",
    ncertRef: "cbjescco04 Q17", isCompetencyBased: true, strategyHint: "REQUIRES-FIGURE: question references given below" },
  // cbjescco04 Q18
  { id: "SCO-S-CARB-011", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Ethyl propanoate is an ester with the condensed structural formula CH3CH2COOCH2CH3 (molecular formula C5H10O2). How many bonding pairs of electrons (shared pairs) are there in one molecule of ethyl propanoate?",
    options: ["13", "16", "17", "20"],
    answer: "17",
    solutionSteps: ["Correct option is (c) 17. Count bonds in CH3CH2–CO–O–CH2CH3: 10 C–H bonds (10 pairs); 3 C–C single bonds (3 pairs); 2 C–O single bonds (2 pairs); 1 C=O double bond (2 pairs). Total = 10 + 3 + 2 + 2 = 17 shared pairs."],
    finalAnswer: "(c) 17",
    ncertRef: "cbjescco04 Q18", isCompetencyBased: true,
    sourceOverride: "others", },
  // cbjescco04 Q22
  { id: "SCO-S-CARB-012", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Which of the following is not the use of graphite?",
    options: ["It is used as lubricant", "It is used in manufacturing of lead-pencils", "It is used in manufacturing of artificial diamond", "It is used for making insulated plates"],
    answer: "It is used for making insulated plates",
    solutionSteps: ["Correct option is (d) It is used for making insulated plates.", "Graphite can not be used for making insulated plates, as it is a good conductor of electricity."],
    finalAnswer: "(d) It is used for making insulated plates",
    ncertRef: "cbjescco04 Q22", isCompetencyBased: true },
  // cbjescco04 Q23
  { id: "SCO-S-CARB-013", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Which of the following is the purest form of carbon-",
    options: ["charcoal", "coal", "diamond", "graphite"],
    answer: "diamond",
    solutionSteps: ["Correct option is (c) diamond.", "Diamond is the purest form of carbon."],
    finalAnswer: "(c) diamond",
    ncertRef: "cbjescco04 Q23", isCompetencyBased: true },
  // cbjescco04 Q24
  { id: "SCO-S-CARB-014", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Buckminister fullerene is an allotropic form of",
    options: ["phosphorus", "sulphur", "carbon", "tin"],
    answer: "carbon",
    solutionSteps: ["Correct option is (c) carbon."],
    finalAnswer: "(c) carbon",
    ncertRef: "cbjescco04 Q24", isCompetencyBased: true },
  // cbjescco04 Q26
  { id: "SCO-S-CARB-015", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Organic compounds will always contain-",
    options: ["carbon", "hydrogen", "nitrogen", "sulphur"],
    answer: "carbon",
    solutionSteps: ["Correct option is (a) carbon."],
    finalAnswer: "(a) carbon",
    ncertRef: "cbjescco04 Q26", isCompetencyBased: true },
  // cbjescco04 Q31
  { id: "SCO-S-CARB-016", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "When ethane is burnt in excess of air, the products of combustion are-",
    options: ["C and H2O", "CO and H2O", "CO2 and H2", "CO2 and H2O"],
    answer: "CO2 and H2O",
    solutionSteps: ["Correct option is (d) CO2 and H2O.", "In excess air ethane burns completely: 2C2H6 + 7O2 → 4CO2 + 6H2O."],
    finalAnswer: "(d) CO2 and H2O",
    ncertRef: "cbjescco04 Q31", isCompetencyBased: true,
    sourceOverride: "others", },
  // cbjescco04 Q32
  { id: "SCO-S-CARB-017", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "When vanaspati oil reacts with hydrogen then it convert into vanaspati ghee. In this process catalyst used is:",
    options: ["Fe", "Mo", "V", "Ni"],
    answer: "Ni",
    solutionSteps: ["Correct option is (d) Ni.", "Catalysts like Pd, Pt, or Ni are used in hydrogenation process."],
    finalAnswer: "(d) Ni",
    ncertRef: "cbjescco04 Q32", isCompetencyBased: true },
  // cbjescco04 Q34
  { id: "SCO-S-CARB-018", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Chlorine reacts with saturated hydrocarbons at room temperature in the",
    options: ["absence of sunlight", "presence of sunlight", "presence of water", "presence of hydrochloric acid"],
    answer: "presence of sunlight",
    solutionSteps: ["Correct option is (b) presence of sunlight."],
    finalAnswer: "(b) presence of sunlight",
    ncertRef: "cbjescco04 Q34", isCompetencyBased: true },
  // cbjescco04 Q35
  { id: "SCO-S-CARB-019", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "A", marks: 1, format: "MCQ", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Pentane has the molecular formula C5H12. It has",
    options: ["5 covalent bonds", "12 covalent bonds", "16 covalent bonds", "17 covalent bonds"],
    answer: "16 covalent bonds",
    solutionSteps: ["Correct option is (c) 16 covalent bonds.", "Pentane (CH3CH2CH2CH2CH3) has 12 C–H bonds and 4 C–C bonds = 16 covalent bonds."],
    finalAnswer: "(c) 16 covalent bonds",
    ncertRef: "cbjescco04 Q35", isCompetencyBased: true,
    sourceOverride: "others", },
  // cbjesccq04 Q1 (Section A, 1mk)
  { id: "SCQ-S-CARB-020", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Write the molecular formula of first two members of homologous series having functional group —Cl.",
    answer: "(1) CH3Cl Chloromethane (2) CH3CH2Cl Chloroethane",
    solutionSteps: ["(1) CH3Cl Chloromethane (2) CH3CH2Cl Chloroethane"],
    ncertRef: "cbjesccq04 Q1", isCompetencyBased: false },
  // cbjesccq04 Q2 (Section A, 1mk)
  { id: "SCQ-S-CARB-021", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Write the molecular formula of first two members of homologous series having functional group —Br.",
    answer: "(1) CH3Br Bromomethane (2) C2H5Br Bromoethane",
    solutionSteps: ["(1) CH3Br Bromomethane (2) C2H5Br Bromoethane"],
    ncertRef: "cbjesccq04 Q2", isCompetencyBased: false },
  // cbjesccq04 Q3 (Section A, 1mk)
  { id: "SCQ-S-CARB-022", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Write the molecular formula of first two members of homologous series having functional group —OH.",
    answer: "(1) CH3OH Methanol (2) C2H5OH Ethanol",
    solutionSteps: ["(1) CH3OH Methanol (2) C2H5OH Ethanol"],
    ncertRef: "cbjesccq04 Q3", isCompetencyBased: false },
  // cbjesccq04 Q4 (Section A, 1mk)
  { id: "SCQ-S-CARB-023", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Write the molecular formula of 2nd and the 3rd member of homologous series whose first member is methane.",
    answer: "(1) CH3—CH3 Ethane (2) CH3—CH2—CH3 Propane",
    solutionSteps: ["(1) CH3—CH3 Ethane (2) CH3—CH2—CH3 Propane"],
    ncertRef: "cbjesccq04 Q4", isCompetencyBased: false },
  // cbjesccq04 Q5 (Section A, 1mk)
  { id: "SCQ-S-CARB-024", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Write the formula of first two members of homologous series whose functional group is —CHO.",
    answer: "Functional group —CHO (aldehyde). 1. Methanal, HCHO 2. Ethanal, CH3CHO",
    solutionSteps: ["[1 mark] First member: methanal (formaldehyde), HCHO", "[1 mark] Second member: ethanal (acetaldehyde), CH3CHO"],
    ncertRef: "cbjesccq04 Q5", isCompetencyBased: false,
    sourceOverride: "others" },
  // cbjesccq04 Q2 (Section A, 1mk)
  // CARB-025 repaired (SCI-BACKLOG-1, 14 Oct, D244): NCERT Class 10 Science 2026-27 jesc104 section 4.2.4 'Homologous Series' (Table 4.3), section 4.2.5 'Nomenclature of Carbon Compounds' (Table 4.4) and Exercise 2
  { id: "SCQ-S-CARB-025", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Write the formula of first two members of homologous series whose functional group is —CO— (ketone, >C=O).",
    answer: "Functional group —CO— (ketone). 1. Propanone, CH3COCH3 2. Butanone, CH3COCH2CH3",
    solutionSteps: ["[1 mark] First member: propanone, CH3COCH3 (a ketone needs at least three carbon atoms).","[1 mark] Second member: butanone, CH3COCH2CH3 (differs from propanone by a –CH2– unit)."],
    finalAnswer: "Propanone, CH3COCH3 and butanone, CH3COCH2CH3.",
    ncertRef: "cbjesccq04 Q2", isCompetencyBased: false },
  // cbjesccq04 Q71 (Section B, 2mk)
  // CARB-026 repaired (SCI-BACKLOG-1, 14 Oct, D244): NCERT Class 10 Science 2026-27 jesc104 section 4.2.2 (structural isomers, Fig. 4.8; citation corrected from 4.2.3 by BANK-TEXT-CLEAN-1, [FU-BANK-CARB-CITATIONS]), section 4.2.4 Table 4.3 and section 4.2.5 Table 4.4
  { id: "SCQ-S-CARB-026", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Draw the structural formulae of the possible isomers for the compound with molecular formula C3H6O.",
    answer: "At Class 10 level, C3H6O has two isomers: propanal, CH3–CH2–CHO (an aldehyde), and propanone, CH3–CO–CH3 (a ketone).",
    solutionSteps: ["[1 mark] Isomer 1 — propanal (aldehyde): CH3–CH2–CHO, i.e. H3C–CH2–C(=O)–H, with the C=O group at the end of the chain.","[1 mark] Isomer 2 — propanone (ketone): CH3–CO–CH3, i.e. H3C–C(=O)–CH3, with the C=O group on the middle carbon. Both have the formula C3H6O but different structures, so they are structural isomers."],
    finalAnswer: "Propanal, CH3CH2CHO, and propanone, CH3COCH3.",
    ncertRef: "cbjesccq04 Q71", isCompetencyBased: false },
  // cbjesccq04 Q73 (Section B, 2mk)
  // CARB-027 repaired (SCI-BACKLOG-1 batch 3, 14 Oct, D244): NCERT Ch 4 (jesc104) sec 4.3.1 Combustion
  { id: "SCQ-S-CARB-027", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "Write balanced equations for the burning of (a) methane (b) ethane in air.",
    answer: "(a) CH4(g) + 2O2(g) → CO2(g) + 2H2O(l) (b) 2C2H6(g) + 7O2(g) → 4CO2(g) + 6H2O(l)",
    solutionSteps: ["[1 mark] (a) Methane burns in air: CH4(g) + 2O2(g) → CO2(g) + 2H2O(l) + heat and light.","[1 mark] (b) Ethane burns in air: 2C2H6(g) + 7O2(g) → 4CO2(g) + 6H2O(l) + heat and light."],
    finalAnswer: "(a) CH4 + 2O2 → CO2 + 2H2O; (b) 2C2H6 + 7O2 → 4CO2 + 6H2O.",
    ncertRef: "cbjesccq04 Q73", isCompetencyBased: false },
  // cbjesccq04 Q74 (Section B, 2mk)
  { id: "SCQ-S-CARB-028", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "Compare the structures of benzene and cyclohexane by drawing them.",
    answer: "Benzene has 3 double bonds whereas cyclohexane has all single bonds.",
    solutionSteps: ["Benzene has 3 double bonds whereas cyclohexane has all single bonds."],
    ncertRef: "cbjesccq04 Q74", isCompetencyBased: true },
  // cbjesccq04 Q75 (Section B, 2mk)
  // CARB-029 repaired (SCI-BACKLOG-1 batch 3, 14 Oct, D244): NCERT Ch 4 (jesc104) sec 4.4.1 Properties of Ethanol (reaction with sodium) and 4.4.2 Properties of Ethanoic Acid
  { id: "SCQ-S-CARB-029", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "a. Write chemical name and formula of vinegar? b. Describe with a chemical equation what happens when sodium reacts with ethanol.",
    answer: "a. Vinegar is a 5-8% solution of ethanoic acid (acetic acid), CH3COOH, in water. b. Sodium reacts with ethanol to form sodium ethoxide and hydrogen gas: 2Na + 2CH3CH2OH → 2CH3CH2ONa + H2.",
    solutionSteps: ["[1 mark] a. Vinegar is a 5-8% solution of ethanoic acid (acetic acid) in water; formula CH3COOH.","[1 mark] b. Sodium reacts with ethanol, evolving hydrogen gas and forming sodium ethoxide: 2Na + 2CH3CH2OH → 2CH3CH2ONa + H2."],
    finalAnswer: "a. Ethanoic acid (acetic acid), CH3COOH. b. 2Na + 2CH3CH2OH → 2CH3CH2ONa + H2 (sodium ethoxide and hydrogen gas).",
    ncertRef: "cbjesccq04 Q75", isCompetencyBased: true },
  // cbjesccq04 Q76 (Section B, 2mk)
  { id: "SCQ-S-CARB-030", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Applying",
    questionText: "State reasons to explain why covalent compounds: a. are bad conductors of electricity? b. have low melting and boiling points?",
    answer: "a. Covalent compounds do not form ions, hence they are bad conductor of electricity. b. Covalent compounds have weak intermolecular forces of attraction, therefore, have low melting and boiling points.",
    solutionSteps: ["a. Covalent compounds do not form ions, hence they are bad conductor of electricity. b. Covalent compounds have weak intermolecular forces of attraction, therefore, have low melting and boiling points."],
    ncertRef: "cbjesccq04 Q76", isCompetencyBased: true },
  // cbjesccq04 Q77 (Section B, 2mk)
  // CARB-031 repaired (SCI-BACKLOG-1, 14 Oct, D244): NCERT Class 10 Science 2026-27 jesc104 section 4.2.4 'Homologous Series' and section 4.2.5 'Nomenclature of Carbon Compounds'
  { id: "SCQ-S-CARB-031", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "B", marks: 2, format: "Short", difficulty: "Medium", bloomSkill: "Understanding",
    questionText: "What is homologous series? Write the name and draw the structure of the second member of alkene series.",
    answer: "a. A homologous series is a series of carbon compounds in which the same functional group substitutes for hydrogen in a carbon chain; successive members differ by a –CH2– unit and have similar chemical properties. b. The second member of the alkene series is propene, C3H6: CH3–CH=CH2.",
    solutionSteps: ["[1 mark] a. Homologous series: a series of carbon compounds in which the same functional group substitutes for hydrogen in a carbon chain; successive members differ by a –CH2– unit, and they show similar chemical properties with a gradation in physical properties.","[1 mark] b. Second member of the alkene series (after ethene, C2H4): propene, C3H6; structure CH3–CH=CH2, i.e. H3C–CH=CH2, with the C=C double bond at the end of the three-carbon chain."],
    finalAnswer: "Homologous series = same functional group on carbon chains, successive members differing by –CH2–; second alkene is propene, CH3–CH=CH2 (C3H6).",
    ncertRef: "cbjesccq04 Q77", isCompetencyBased: false },
  // cbjesccq04 Q99 (Section C, 3mk)
  // CARB-032 repaired (SCI-BACKLOG-1, 14 Oct, D244): NCERT Class 10 Science 2026-27 jesc104 section 4.4.1 Properties of Ethanol, p. 72 (citation corrected from "sections 4.3 and 4.3.1" by BANK-TEXT-CLEAN-1, [FU-BANK-CARB-CITATIONS]): heating ethanol at 443 K with excess concentrated sulphuric acid dehydrates it to ethene, the acid acting as a dehydrating agent; ethanol reacts with sodium to give sodium ethoxide and hydrogen. The stored key was an extraction-garbled equation and is rebuilt from the same content
  { id: "SCQ-S-CARB-032", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Understanding",
    questionText: "A compound X on heating with excess of conc. H2SO4 at 443 K gives an unsaturated compound Y. X also reacts with sodium metal to evolve a colourless gas Z. Identify X, Y and Z. Write the equations of the chemical reaction of formation of Y and also write the role of conc. sulphuric acid in the reaction.",
    answer: "X is ethanol, CH3CH2OH; Y is ethene, CH2=CH2; Z is hydrogen, H2 (2CH3CH2OH + 2Na → 2CH3CH2ONa + H2). Formation of Y: CH3CH2OH → CH2=CH2 + H2O (hot conc. H2SO4, 443 K). Conc. H2SO4 acts as a dehydrating agent.",
    solutionSteps: ["[1 mark] X is ethanol, CH3CH2OH; Y is ethene, CH2=CH2; Z is hydrogen gas, H2 given off when ethanol reacts with sodium: 2CH3CH2OH + 2Na → 2CH3CH2ONa + H2.","[1 mark] Formation of Y: CH3CH2OH → CH2=CH2 + H2O on heating with excess conc. H2SO4 at 443 K.","[1 mark] Role of conc. H2SO4: it acts as a dehydrating agent, removing water from ethanol."],
    finalAnswer: "X = ethanol, Y = ethene, Z = hydrogen; CH3CH2OH → CH2=CH2 + H2O (conc. H2SO4, 443 K); conc. H2SO4 is a dehydrating agent.",
    ncertRef: "cbjesccq04 Q99", isCompetencyBased: false },
  // cbjesccq04 Q100 (Section C, 3mk)
  // CARB-033 repaired (SCI-BACKLOG-1 batch 3, 14 Oct, D244): NCERT Class 10 Science Ch 4 (jesc104) sec 4.2.4, Fig 4.9 Structure of cyclohexane
  { id: "SCQ-S-CARB-033", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "a. Why are most carbon compounds poor conductors of electricity? b. Write the name and structure of a saturated compound in which carbon atoms are arranged in a ring. Give the number of single bonds present in this compound.",
    answer: "a. Carbon compounds are covalent compounds; they do not form ions, therefore they are poor conductors of electricity. b. Cyclohexane (C6H12), a ring of six carbon atoms each joined to two hydrogen atoms; it has 18 single bonds.",
    solutionSteps: ["[1 mark] a. Most carbon compounds are covalent: their atoms share electrons and do not form ions, so they are poor conductors of electricity.","[1 mark] b. The saturated ring compound is cyclohexane, C6H12: six carbon atoms joined by single bonds in a ring, each carbon also bonded to two hydrogen atoms.","[1 mark] Number of single bonds = 6 C–C bonds + 12 C–H bonds = 18 single bonds."],
    finalAnswer: "Carbon compounds are covalent and form no ions, so they conduct poorly; cyclohexane (C6H12) is a saturated ring compound with 18 single bonds.",
    ncertRef: "cbjesccq04 Q100", isCompetencyBased: true },
  // cbjesccq04 Q101 (Section C, 3mk)
  // CARB-034 repaired (SCI-BACKLOG-1, 14 Oct, D244): NCERT Class 10 Science 2026-27 jesc104 sections 4.2.2-4.2.5 (structural isomers; aldehyde -CHO and ketone -CO- groups; Table 4.4 propanal and propanone; electron dot structures of covalent compounds); the stored key was only the running header 'Chap 4 : Carbon and Its Compounds'. Same isomer pair as SCQ-S-CARB-026
  { id: "SCQ-S-CARB-034", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Understanding",
    questionText: "Draw the structural formula of all the possible isomers of the compound with the molecular formula C3H6O and also give electron dot structures.",
    answer: "C3H6O has two isomers at this level: propanal, CH3–CH2–CHO (an aldehyde), and propanone, CH3–CO–CH3 (a ketone). In the electron dot structure of each, every carbon shares four pairs of electrons, each hydrogen shares one pair, and oxygen shares two pairs with carbon (a C=O double bond) and keeps two lone pairs.",
    solutionSteps: ["[1 mark] Structural formulae: propanal, CH3–CH2–CHO (H3C–CH2–C(=O)–H, aldehyde), and propanone, CH3–CO–CH3 (H3C–C(=O)–CH3, ketone); both have the formula C3H6O but different structures, so they are structural isomers.","[1 mark] Electron dot structure of propanal: the C–C and C–H bonds are single shared pairs; the carbonyl carbon shares two pairs with oxygen (C=O) and one pair with hydrogen; oxygen also has two lone pairs.","[1 mark] Electron dot structure of propanone: the two CH3 groups are joined to the central carbon by single shared pairs, the central carbon shares two pairs with oxygen (C=O), and oxygen has two lone pairs."],
    finalAnswer: "Propanal, CH3CH2CHO, and propanone, CH3COCH3, with the C=O group drawn as two shared pairs and two lone pairs on oxygen.",
    ncertRef: "cbjesccq04 Q101", isCompetencyBased: false },
  // cbjesccq04 Q102 (Section C, 3mk)
  // CARB-035 repaired (SCI-BACKLOG-1 batch 3, 14 Oct, D244): NCERT Ch 4 (jesc104) sec 4.2.4 isomers and Table 4.4 nomenclature (Propanal, Propanone)
  { id: "SCQ-S-CARB-035", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Understanding",
    questionText: "An aldehyde as well as ketone can be represented by the same molecular formula say C3H6O. Write their structures and name them. State the relationship between two in language of science.",
    answer: "Aldehyde: propanal, CH3–CH2–CHO; ketone: propanone, CH3–CO–CH3. Both have the formula C3H6O but different structures and functional groups, so they are isomers (structural isomers).",
    solutionSteps: ["[1 mark] Aldehyde with formula C3H6O: CH3–CH2–CHO, named propanal (–CHO group at the end of the chain).","[1 mark] Ketone with formula C3H6O: CH3–CO–CH3, named propanone (C=O group on the middle carbon).","[1 mark] Relationship: they have the same molecular formula but different structures (different functional groups), so they are isomers — structural isomers."],
    finalAnswer: "Propanal (CH3CH2CHO) and propanone (CH3COCH3) share the formula C3H6O but have different structures; they are structural isomers.",
    ncertRef: "cbjesccq04 Q102", isCompetencyBased: false },
  // cbjesccq04 Q103 (Section C, 3mk)
  // CARB-036 repaired (SCI-BACKLOG-1, 14 Oct, D244): NCERT Class 10 Science 2026-27 jesc104 section 4.3.3 (addition reaction: unsaturated hydrocarbons add hydrogen in the presence of catalysts such as palladium or nickel to give saturated hydrocarbons). STEM FIX: the stored 'C4H3' is an impossible formula (the stored key says X has a double bond, and C5H12 is the saturated alkane); restored to C4H8, the alkene formula, as in the CBSE question (the #1229 review places it as CBSE 2017 Delhi, set 31/1/1; BANK-TEXT-CLEAN-1 records that citation, [FU-BANK-CARB-CITATIONS]). This stem restoration is INFERRED, not read from a printed paper (no allowed source reachable): flagged for the cofounder
  { id: "SCQ-S-CARB-036", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "The carbon compounds X and Y have the molecular formula C4H8 and C5H12 respectively. Which one of these is most likely to show addition reaction? Justify your answer. Also give chemical equations to explain the process of addition reaction in this case.",
    answer: "C4H8 (X) will undergo addition reaction because it is an unsaturated hydrocarbon with a double bond, while C5H12 (Y) is a saturated hydrocarbon that cannot undergo addition reaction. Addition of hydrogen: CH3CH2CH=CH2 + H2 → CH3CH2CH2CH3 (in the presence of nickel or palladium catalyst).",
    solutionSteps: ["[1 mark] C4H8 (X) is the compound most likely to show addition reaction.","[1 mark] Justification: C4H8 is an unsaturated hydrocarbon with a double bond, whereas C5H12 is a saturated hydrocarbon (CnH2n+2) with only single bonds and so cannot undergo addition reaction.","[1 mark] Equation (hydrogenation): CH3CH2CH=CH2 + H2 → CH3CH2CH2CH3 in the presence of nickel or palladium as catalyst."],
    finalAnswer: "C4H8 shows addition (it has a double bond; C5H12 is saturated): CH3CH2CH=CH2 + H2 → CH3CH2CH2CH3 (Ni or Pd catalyst).",
    ncertRef: "cbjesccq04 Q103", isCompetencyBased: true },
  // cbjesccq04 Q106 (Section C, 3mk)
  { id: "SCQ-S-CARB-037", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "C", marks: 3, format: "Short", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Two carbon compounds 'X' and 'Y' have the molecular formula C3H6 and C4H10 respectively. Which one of the two is most likely to show addition reaction? Justify your answer. Also give chemical equation to explain the process of addition in this case.",
    answer: "C₃H₆ will undergo addition reaction. It is because it has a double bond. CH₂=CH—CH₃ + H₂ → CH₃—CH₂—CH₃ (Ni, heat); Propene → Propane.",
    solutionSteps: [
      "[1 mark] C₃H₆ will undergo addition reaction.",
      "[1 mark] It is because it has a double bond.",
      "[1 mark] CH₂=CH—CH₃ + H₂ → CH₃—CH₂—CH₃ (Ni, heat); Propene → Propane.",
    ],
    ncertRef: "cbjesccq04 Q106", isCompetencyBased: true },
  // cbjesccq04 Q155 (Section D, 5mk)
  { id: "SCQ-S-CARB-038", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "You are given balls and stick model of six carbon atoms and fourteen hydrogen atoms and sufficient number of sticks. In how many ways one can join the models of six carbon atoms and fourteen hydrogen atoms to form different molecules of C6H14.",
    answer: "Five different molecules (structural isomers) of C₆H₁₄ can be made: (1) n-hexane CH₃–CH₂–CH₂–CH₂–CH₂–CH₃; (2) 2-methylpentane CH₃–CH(CH₃)–CH₂–CH₂–CH₃; (3) 3-methylpentane CH₃–CH₂–CH(CH₃)–CH₂–CH₃; (4) 2,2-dimethylbutane CH₃–C(CH₃)₂–CH₂–CH₃; (5) 2,3-dimethylbutane CH₃–CH(CH₃)–CH(CH₃)–CH₃. Hence the models can be joined in 5 ways.",
    finalAnswer: "Five different molecules (structural isomers) of C₆H₁₄ can be made: (1) n-hexane CH₃–CH₂–CH₂–CH₂–CH₂–CH₃; (2) 2-methylpentane CH₃–CH(CH₃)–CH₂–CH₂–CH₃; (3) 3-methylpentane CH₃–CH₂–CH(CH₃)–CH₂–CH₃; (4) 2,2-dimethylbutane CH₃–C(CH₃)₂–CH₂–CH₃; (5) 2,3-dimethylbutane CH₃–CH(CH₃)–CH(CH₃)–CH₃. Hence the models can be joined in 5 ways.",
    solutionSteps: [
      "[1 mark] Straight chain of six C atoms: n-hexane, CH₃–CH₂–CH₂–CH₂–CH₂–CH₃",
      "[1 mark] Five-carbon chain with –CH₃ on C-2: 2-methylpentane, CH₃–CH(CH₃)–CH₂–CH₂–CH₃",
      "[1 mark] Five-carbon chain with –CH₃ on C-3: 3-methylpentane, CH₃–CH₂–CH(CH₃)–CH₂–CH₃",
      "[1 mark] Four-carbon chain with two –CH₃ on C-2: 2,2-dimethylbutane, CH₃–C(CH₃)₂–CH₂–CH₃",
      "[1 mark] Four-carbon chain with –CH₃ on C-2 and C-3: 2,3-dimethylbutane, CH₃–CH(CH₃)–CH(CH₃)–CH₃; total = 5 ways (structural isomers)"
    ],
    ncertRef: "cbjesccq04 Q155", isCompetencyBased: true, sourceOverride: "others" },
  // cbjesccq04 Q156 (Section D, 5mk)
  // CARB-039 repaired (SCI-BACKLOG-1 batch 3, 14 Oct, D244): NCERT Ch 4 (jesc104) sec 4.5 Soaps and Detergents
  { id: "SCQ-S-CARB-039", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Soaps and detergents are both types of salts. State the difference between the two. Write the mechanism of the cleansing action of soaps. Why do soaps not form lather (foam) with hard water? Mention any two problems that arise due to the use of detergents instead of soaps.",
    answer: "Soaps are sodium or potassium salts of long-chain fatty acids (–COONa group); detergents are sodium salts of sulphonic acids (–SO3Na or –SO4Na group). Cleansing action: a soap molecule has a hydrophobic hydrocarbon tail that attaches to oily dirt and an ionic hydrophilic head that faces water; the molecules form micelles that trap the grease, which is lifted off by agitation and washed away by rinsing. Soaps do not lather with hard water because the calcium and magnesium ions react with soap to form an insoluble scum. Problems of detergents: (i) many are non-biodegradable and cause foaming and pollution of rivers; (ii) they persist in the environment and harm aquatic life.",
    solutionSteps: ["[1 mark] Difference: soaps are sodium or potassium salts of long-chain fatty acids and contain the –COONa group; detergents are sodium salts of sulphonic acids and contain the –SO3Na (or –SO4Na) group.","[1 mark] Structure of a soap/detergent molecule: it has a long hydrophobic (water-repelling) hydrocarbon tail and a hydrophilic (water-attracting) ionic head, so one end dissolves in oil/grease and the other in water.","[1 mark] Cleansing mechanism: the hydrophobic tails attach to the oily dirt while the ionic heads face the water, forming spherical clusters called micelles that trap the grease; agitation lifts the micelles into the water and rinsing carries the dirt away.","[1 mark] Soaps do not lather with hard water because Ca²⁺ and Mg²⁺ ions in hard water react with the soap to form insoluble calcium/magnesium salts of fatty acids (scum), so the soap is wasted before it can form foam.","[1 mark] Two problems with detergents: (i) many detergents have non-biodegradable branched hydrocarbon chains that cause water pollution/foaming in rivers, and (ii) they persist in the environment, harming aquatic life."],
    finalAnswer: "Soaps are fatty-acid salts (–COONa), detergents sulphonic-acid salts (–SO3Na); soap cleans by forming micelles; hard-water Ca²⁺/Mg²⁺ form scum with soap; detergents are often non-biodegradable and pollute water.",
    ncertRef: "cbjesccq04 Q156", isCompetencyBased: true },
  // cbjesccq04 Q157 (Section D, 5mk)
  { id: "SCQ-S-CARB-040", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "Why are certain compounds called hydrocarbons? Write the general formula for homologous series of alkanes, alkenes and alkynes and also draw the structure of the first member of each series. Write the name of the reaction which converts alkene into alkane. Also write the chemical equation to show the necessary conditions for the reaction to occur.",
    answer: "Compounds of carbon and hydrogen are called hydrocarbons. Alkane CnH2n+2 Alkene CnH2n Alkyne CnH2n–2 Ethyne Hydrogenation i.e. addition of H2 leads to formation of alkanes from alkenes. CH2 = CH2 + H2 heat Ni CH3 – CH3",
    solutionSteps: [
      "[1 mark] Compounds made up of only carbon and hydrogen are called hydrocarbons.",
      "[1 mark] Alkanes — general formula CnH2n+2; first member is methane, CH4 (all single C–H and C–C bonds).",
      "[1 mark] Alkenes — general formula CnH2n; first member is ethene, CH2=CH2 (contains one C=C double bond).",
      "[1 mark] Alkynes — general formula CnH2n–2; first member is ethyne, CH≡CH (contains one C≡C triple bond).",
      "[1 mark] The reaction that converts an alkene into an alkane is hydrogenation (addition of H2): CH2=CH2 + H2 →(Ni catalyst, heat) CH3–CH3."
    ],
    ncertRef: "cbjesccq04 Q157", isCompetencyBased: true },
  // cbjesccq04 Q158 (Section D, 5mk)
  // CARB-041 repaired (SCI-BACKLOG-1 batch 3, 14 Oct, D244): NCERT Ch 4 (jesc104) sec 4.3.2 Oxidation, 4.3.3 Addition Reaction, 4.4.1 Properties of Ethanol, 4.4.2 Properties of Ethanoic Acid
  { id: "SCQ-S-CARB-041", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Understanding",
    questionText: "Complete the following chemical equations and write the chemical name of the products formed. a. CH2=CH2 + H2 → b. CH3COOH + NaOH → c. CH3CH2OH →(conc. H2SO4, heat) d. HCOOH + Na → e. C2H5OH →(alkaline KMnO4, heat)",
    answer: "a. CH2=CH2 + H2 →(Ni) CH3–CH3; ethane. b. CH3COOH + NaOH → CH3COONa + H2O; sodium ethanoate (sodium acetate). c. CH3CH2OH →(hot conc. H2SO4) CH2=CH2 + H2O; ethene. d. 2HCOOH + 2Na → 2HCOONa + H2; sodium methanoate (sodium formate) and hydrogen gas (which burns with a pop). e. C2H5OH →(alkaline KMnO4, heat) CH3COOH; ethanoic acid.",
    solutionSteps: ["[1 mark] a. CH2=CH2 + H2 →(Ni catalyst) CH3–CH3; product is ethane.","[1 mark] b. CH3COOH + NaOH → CH3COONa + H2O; product is sodium ethanoate (sodium acetate).","[1 mark] c. CH3CH2OH →(hot conc. H2SO4, 443 K) CH2=CH2 + H2O; product is ethene (dehydration).","[1 mark] d. 2HCOOH + 2Na → 2HCOONa + H2; the products are sodium methanoate (sodium formate) and hydrogen gas (which burns with a pop).","[1 mark] e. CH3CH2OH →(alkaline KMnO4, heat) CH3COOH; product is ethanoic acid (oxidation)."],
    finalAnswer: "a. Ethane; b. sodium ethanoate; c. ethene; d. sodium methanoate (sodium formate) and hydrogen gas; e. ethanoic acid.",
    ncertRef: "cbjesccq04 Q158", isCompetencyBased: false },
  // cbjesccq04 Q159 (Section D, 5mk)
  { id: "SCQ-S-CARB-042", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "a. Give a chemical test to distinguish between saturated and unsaturated hydrocarbons. b. Name the products formed when ethane burns in air. Write the balanced chemical equation for the reactions showing two types of energies liberated. c. Why is reaction between methane and chlorine in presence of sunlight is considered a substitution reaction.",
    answer: "a. Saturated hydrocarbons will not react with bromine water whereas unsaturated hydrocarbons will decolourise it. b. Carbon dioxide and water will be formed. 2C2H6 + 7O2 → 4CO2(g) + 6H2O(l) + Heat + Light c. It is because hydrogen atom is substituted by halogen atom, that is why ",
    solutionSteps: [
      "[1 mark] a. Chemical test — add bromine water: unsaturated hydrocarbons decolourise the reddish-brown bromine water (addition), while saturated hydrocarbons do not decolourise it.",
      "[1 mark] b. When ethane burns in air, the products formed are carbon dioxide and water.",
      "[1 mark] b. Balanced equation showing two forms of energy liberated: 2C2H6 + 7O2 → 4CO2(g) + 6H2O(l) + Heat + Light.",
      "[1 mark] c. In the presence of sunlight, chlorine replaces the hydrogen atoms of methane one at a time, e.g. CH4 + Cl2 →(sunlight) CH3Cl + HCl.",
      "[1 mark] c. Since a hydrogen atom is substituted (replaced) by a chlorine atom, the reaction is called a substitution reaction."
    ],
    ncertRef: "cbjesccq04 Q159", isCompetencyBased: true },
  // cbjesccq04 Q160 (Section D, 5mk)
  // CARB-043 repaired (SCI-BACKLOG-1 batch 3, 14 Oct, D244): NCERT Ch 4 (jesc104) sec 4.4.1 (ethanol + sodium) and sec 4.5 Soaps and Detergents
  { id: "SCQ-S-CARB-043", subject: "Science", topicKey: "carbon-and-its-compounds", subtopic: "Chapter Practice — Carbon and its Compounds", section: "D", marks: 5, format: "Long", difficulty: "Hard", bloomSkill: "Applying",
    questionText: "a. You have three unlabelled test tubes containing ethanol, ethanoic acid and soap solution. Explain the method you would use to identify the compounds in different test tubes by chemical tests using litmus paper and sodium metal. b. Give reason of formation of scum when soaps are used with hard water.",
    answer: "a. Soap solution is basic and turns red litmus blue; ethanoic acid turns blue litmus red; ethanol does not change either litmus but reacts with sodium metal with effervescence of hydrogen gas, forming sodium ethoxide: 2C2H5OH + 2Na → 2C2H5ONa + H2. b. Soaps are sodium or potassium salts of fatty acids; in hard water they react with calcium and magnesium ions to form insoluble calcium and magnesium salts that separate out as scum.",
    solutionSteps: ["[1 mark] a. Soap solution is basic, so it turns red litmus paper blue (only the soap solution does this).","[1 mark] a. Ethanoic acid is acidic, so it turns blue litmus paper red (only the ethanoic acid does this).","[1 mark] a. Ethanol changes neither litmus; it is identified by adding sodium metal — brisk effervescence of hydrogen gas is seen and sodium ethoxide is formed: 2C2H5OH + 2Na → 2C2H5ONa + H2.","[1 mark] b. Soaps are sodium or potassium salts of fatty acids; in hard water they react with the dissolved Ca²⁺ and Mg²⁺ ions.","[1 mark] b. This forms insoluble calcium/magnesium salts of fatty acids that separate out as a sticky precipitate called scum, which is why soaps do not clean well in hard water."],
    finalAnswer: "Soap turns red litmus blue, ethanoic acid turns blue litmus red, ethanol gives hydrogen with sodium; scum is the insoluble calcium/magnesium salt formed when soap reacts with hard water.",
    ncertRef: "cbjesccq04 Q160", isCompetencyBased: true },
];
