import type { Class10ScienceTopicKey } from "./class10ScienceTopicTrends";

export type DifficultyKey = "Easy" | "Medium" | "Hard";

export type QuestionKind = "MCQ" | "Short" | "Assertion-Reasoning" | "Case-Based";

export type SectionKey = "A" | "B" | "C" | "D" | "E";

// Back-compat aliases expected by some utilities
export type SciSectionKey = SectionKey;
export type SciDifficultyKey = DifficultyKey;


export type BloomSkill =
  | "Remembering"
  | "Understanding"
  | "Applying"
  | "Analysing"
  | "Evaluating"
  | "Creating";

export interface SciencePredictedQuestion {
  id: string;
  topicKey: Class10ScienceTopicKey;
  subtopic: string;
  kind: QuestionKind;
  section: SectionKey;
  marks: number;
  difficulty: DifficultyKey;
  bloomSkill: BloomSkill;
  questionText: string;
  options?: string[]; // for MCQ / AR stems if needed
  answer: string;
  explanation: string;

  // optional Socratic / AI-tutor fields
  solutionSteps?: string[];
  finalAnswer?: string;
  strategyHint?: string;

  // predictive metadata
  pastBoardYear?: string;
  policyTag?: string;
}

// ---------------------------------------------------------------------------
// Class 10 Science – Predicted Question Bank (Chapter-by-Chapter)
// Aligned to class10ScienceTopicTrends.ts
// ---------------------------------------------------------------------------

export const sciencePredictedQuestions: SciencePredictedQuestion[] = [
  // ================================================================
  // CHEMICAL REACTIONS & EQUATIONS
  // ================================================================

  {
    id: "2026-CR-MCQ-01",
    topicKey: "ChemicalReactions",
    subtopic: "Balancing & Types of Reactions",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which of the following is a displacement reaction?",
    options: [
      "CaCO₃ → CaO + CO₂",
      "2Mg + O₂ → 2MgO",
      "Zn + CuSO₄ → ZnSO₄ + Cu",
      "H₂ + Cl₂ → 2HCl",
    ],
    answer: "Zn + CuSO₄ → ZnSO₄ + Cu",
    explanation:
      "In Zn + CuSO₄ → ZnSO₄ + Cu, more reactive zinc displaces copper from copper sulphate, so it is a displacement reaction.",
    strategyHint:
      "Look for one element replacing another in a compound – that’s displacement.",
    pastBoardYear: "2022",
    policyTag: "Basic reaction type MCQ",
    solutionSteps: [
      "A displacement reaction involves a more reactive element displacing a less reactive element from its compound.",
      "In the given reaction, Zn + CuSO₄ → ZnSO₄ + Cu, zinc (Zn) displaces copper (Cu) from copper sulphate.",
      "Since zinc is more reactive than copper, this reaction is a displacement reaction.",
    ],
    finalAnswer: "Zn + CuSO₄ → ZnSO₄ + Cu",
  },

  {
    id: "2026-CR-SA-02",
    topicKey: "ChemicalReactions",
    subtopic: "Types of Reactions & Observations",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "When aqueous solutions of barium chloride and sodium sulphate are mixed, a white precipitate is formed. (a) Write the balanced chemical equation. (b) Identify the type of reaction.",
    answer:
      "(a) BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s) + 2NaCl(aq)\n(b) Double displacement and precipitation reaction.",
    explanation:
      "Ions exchange partners: Ba²⁺ combines with SO₄²⁻ to form insoluble BaSO₄ (white precipitate). This is a double displacement reaction resulting in a precipitate.",
    solutionSteps: [
      "Write formulas of reactants: BaCl₂ and Na₂SO₄.",
      "Exchange ions to get BaSO₄ and NaCl.",
      "Balance the equation: 1 Ba, 1 S, 2 Na, 2 Cl.",
      "Recognise that ions are exchanged and an insoluble solid forms.",
    ],
    strategyHint:
      "For reaction type, check if ions are exchanged and whether a precipitate forms.",
    pastBoardYear: "2023",
    policyTag: "Precipitation/double-displacement pattern",
    finalAnswer: "(a) BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s) + 2NaCl(aq)\\n(b) Double displacement and precipitation reaction.",
  },

  {
    id: "2026-CR-SA-03",
    topicKey: "ChemicalReactions",
    subtopic: "Redox & Oxidation/Reduction",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "In the reaction: 2Cu + O₂ → 2CuO, (a) identify the substance oxidised and the substance reduced, (b) state the changes in terms of oxygen.",
    answer:
      "(a) Copper is oxidised; oxygen is reduced.\n(b) Copper gains oxygen to form copper(II) oxide, while oxygen is used up in forming the compound.",
    explanation:
      "Oxidation is gain of oxygen; copper gains oxygen to form CuO. Reduction is loss of oxygen or usage of elemental oxygen; O₂ is consumed, hence reduced.",
    solutionSteps: [
      "Recall: oxidation = gain of oxygen, reduction = loss of oxygen.",
      "Identify which substance combines with oxygen.",
      "Copper combines with oxygen → oxidised.",
      "Elemental oxygen is consumed → reduced.",
    ],
    strategyHint:
      "Use oxygen-based definition of redox for simple reactions at Class 10 level.",
    pastBoardYear: "2021",
    policyTag: "Redox identification",
    finalAnswer: "(a) Copper is oxidised; oxygen is reduced.\\n(b) Copper gains oxygen to form copper(II) oxide, while oxygen is used up in forming the compound.",
  },

  {
    id: "2026-CR-AR-04",
    topicKey: "ChemicalReactions",
    subtopic: "Corrosion & Rancidity",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): Iron articles should be painted to prevent rusting. Reason (R): Paint prevents contact of iron with air and moisture.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, but R is not the correct explanation of A.",
      "A is true, but R is false.",
      "A is false, but R is true.",
    ],
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Rusting needs iron, water, and oxygen. Paint acts as a barrier between iron and moist air, thus preventing corrosion.",
    policyTag: "AR/corrosion-prevention",
    solutionSteps: [
      "Assertion (A) states that iron articles should be painted to prevent rusting, which is a true statement.",
      "Reason (R) states that paint prevents contact of iron with air and moisture, which are necessary conditions for rusting, making R true.",
      "Since paint acts as a physical barrier preventing contact with air and moisture, Reason (R) correctly explains Assertion (A).",
    ],
    finalAnswer: "Both A and R are true, and R is the correct explanation of A.",
  },

  {
    id: "2026-CR-CASE-05",
    topicKey: "ChemicalReactions",
    subtopic: "Daily-life Context & Conservation of Mass",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A student performs a reaction between aqueous sodium sulphate and barium chloride in a closed test tube placed on a digital balance. She observes a white precipitate but the total mass reading on the balance does not change.\n(i) Write the balanced chemical equation.\n(ii) Name the white precipitate.\n(iii) Which law of chemical combination is verified?\n(iv) Explain why the mass remains unchanged.",
    answer:
      "(i) BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s) + 2NaCl(aq)\n(ii) Barium sulphate (BaSO₄)\n(iii) Law of conservation of mass\n(iv) System is closed; mass of reactants equals mass of products, even though a solid forms.",
    explanation:
      "In a closed system, matter is neither created nor destroyed. Formation of BaSO₄ from the same atoms rearranged verifies conservation of mass.",
    policyTag: "Case-study/conservation of mass",
    solutionSteps: [
      "(i) The reactants are barium chloride (BaCl₂) and sodium sulphate (Na₂SO₄). The products are barium sulphate (BaSO₄) and sodium chloride (NaCl).",
      "(i) The balanced chemical equation is: BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s) + 2NaCl(aq).",
      "(ii) The white precipitate formed is Barium sulphate (BaSO₄).",
      "(iii) The law of chemical combination verified by this experiment is the Law of conservation of mass.",
      "(iv) The mass remains unchanged because the reaction is carried out in a closed test tube, preventing any matter from entering or leaving the system.",
      "(iv) According to the Law of conservation of mass, the total mass of reactants equals the total mass of products in a closed system, even if a new substance like a precipitate is formed.",
    ],
    finalAnswer: "(i) BaCl₂(aq) + Na₂SO₄(aq) → BaSO₄(s) + 2NaCl(aq)\n(ii) Barium sulphate (BaSO₄)\n(iii) Law of conservation of mass\n(iv) System is closed; mass of reactants equals mass of products, even though a solid forms.",
  },

  // ================================================================
  // ACIDS, BASES & SALTS
  // ================================================================

  {
    id: "2026-ABS-MCQ-01",
    topicKey: "AcidsBasesSalts",
    subtopic: "pH & Indicators",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "A solution turns red litmus blue. Its pH is most likely:",
    options: ["2", "5", "7", "11"],
    answer: "11",
    explanation:
      "Red → blue indicates base. Stronger base has pH > 7, closer to 11 here.",
    policyTag: "Indicator/basic MCQ",
    solutionSteps: [
      "A solution that turns red litmus blue indicates that it is basic in nature.",
      "Basic solutions have a pH value greater than 7.",
      "Therefore, a pH of 11 is most likely for such a solution, as it is strongly basic.",
    ],
    finalAnswer: "11",
  },

  {
    id: "2026-ABS-AR-02",
    topicKey: "AcidsBasesSalts",
    subtopic: "pH & Daily-life",
    kind: "Assertion-Reasoning",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Assertion (A): Tooth decay is more likely when pH in the mouth falls below 5.5. Reason (R): At lower pH, tooth enamel made of calcium phosphate starts dissolving.",
    options: [
      "Both A and R are true, and R is the correct explanation of A.",
      "Both A and R are true, but R is not the correct explanation of A.",
      "A is true, but R is false.",
      "A is false, but R is true.",
    ],
    answer:
      "Both A and R are true, and R is the correct explanation of A.",
    explanation:
      "Below pH 5.5, acidic conditions dissolve hydroxyapatite (tooth enamel), leading to decay.",
    policyTag: "pH/health AR",
    solutionSteps: [
      "Assertion (A) is true: Tooth decay begins when the pH in the mouth falls below 5.5.",
      "Reason (R) is true: Tooth enamel, composed of calcium phosphate, starts dissolving at lower pH values.",
      "Reason (R) is the correct explanation of Assertion (A) because the dissolution of enamel due to acidity causes tooth decay.",
    ],
    finalAnswer: "Both A and R are true, and R is the correct explanation of A.",
  },

  {
    id: "2026-ABS-SA-03",
    topicKey: "AcidsBasesSalts",
    subtopic: "Salts & Everyday Uses",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "(a) Write the chemical name and formula of baking soda.\n(b) Write one use of baking soda based on its chemical property.",
    answer:
      "(a) Sodium hydrogen carbonate, NaHCO₃\n(b) Used in baking as a leavening agent; on heating it releases CO₂ which makes cakes and bread fluffy.",
    explanation:
      "NaHCO₃ decomposes on heating to give CO₂, which causes dough to rise.",
    policyTag: "Everyday salts/use-case",
    solutionSteps: [
      "(a) The chemical name of baking soda is Sodium hydrogen carbonate.",
      "(a) Its chemical formula is NaHCO₃.",
      "(b) One use of baking soda is as a leavening agent in baking.",
      "(b) When heated during baking, it decomposes to produce carbon dioxide gas, which makes cakes and bread fluffy.",
    ],
    finalAnswer: "(a) Sodium hydrogen carbonate, NaHCO₃\n(b) Used in baking as a leavening agent; on heating it releases CO₂ which makes cakes and bread fluffy.",
  },

  {
    id: "2026-ABS-SA-04",
    topicKey: "AcidsBasesSalts",
    subtopic: "Important Salts (Plaster of Paris)",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "(a) What is Plaster of Paris? Write its chemical formula.\n(b) How is it obtained from gypsum?\n(c) Why should it be stored in a moisture-proof container?",
    answer:
      "(a) Plaster of Paris is calcium sulphate hemihydrate, CaSO₄·½H₂O.\n(b) Gypsum (CaSO₄·2H₂O) is heated at about 373 K to form Plaster of Paris.\n(c) It absorbs moisture and sets to hard gypsum, so it must be kept dry.",
    explanation:
      "Plaster of Paris is partially dehydrated gypsum; in presence of moisture it recombines with water to form hard gypsum.",
    policyTag: "Plaster of Paris short",
    solutionSteps: [
      "Plaster of Paris is calcium sulphate hemihydrate.",
      "Its chemical formula is CaSO₄·½H₂O.",
      "It is obtained by heating gypsum (CaSO₄·2H₂O) at about 373 K (100°C).",
      "CaSO₄·2H₂O(s) --(373 K)--> CaSO₄·½H₂O(s) + 1½H₂O(g)",
      "It should be stored in a moisture-proof container because it readily absorbs moisture and sets into a hard mass of gypsum.",
    ],
    finalAnswer: "(a) Plaster of Paris is calcium sulphate hemihydrate, CaSO₄·½H₂O.\n(b) Gypsum (CaSO₄·2H₂O) is heated at about 373 K to form Plaster of Paris.\n(c) It absorbs moisture and sets to hard gypsum, so it must be kept dry.",
  },

  {
    id: "2026-ABS-CASE-05",
    topicKey: "AcidsBasesSalts",
    subtopic: "pH Scale & Industrial Context",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A farmer tests his soil with a pH kit and finds its pH to be 5.0.\n(i) Is the soil acidic, basic or neutral?\n(ii) Suggest one chemical substance he can add to adjust the pH.\n(iii) How will very low pH affect crop growth?\n(iv) Why are such pH-related questions important in agriculture?",
    answer:
      "(i) Soil is acidic.\n(ii) He can add quicklime (CaO) or slaked lime (Ca(OH)₂).\n(iii) Very acidic soil damages roots and reduces nutrient availability, lowering crop yield.\n(iv) Proper pH ensures optimum nutrient uptake and healthy plant growth.",
    explanation:
      "Acidic soils are neutralised by liming; pH control is crucial for nutrient availability and good harvest.",
    policyTag: "Agriculture pH case-study",
    solutionSteps: [
      "A pH of 5.0 is less than 7, indicating the soil is acidic.",
      "To adjust acidic soil, the farmer can add basic substances like quicklime (calcium oxide, CaO) or slaked lime (calcium hydroxide, Ca(OH)₂).",
      "Very low pH (acidic soil) damages the roots of crops, hindering their growth and development.",
      "It also reduces the availability and uptake of essential nutrients by plants, leading to nutrient deficiencies.",
      "Such pH-related questions are important in agriculture because proper soil pH is crucial for optimum nutrient absorption by plants.",
      "Maintaining the correct pH ensures healthy plant growth, better crop yield, and efficient use of fertilizers.",
    ],
    finalAnswer: "(i) Soil is acidic.\n(ii) He can add quicklime (CaO) or slaked lime (Ca(OH)₂).\n(iii) Very acidic soil damages roots and reduces nutrient availability, lowering crop yield.\n(iv) Proper pH ensures optimum nutrient uptake and healthy plant growth.",
  },

  // ================================================================
  // METALS & NON-METALS
  // ================================================================

  {
    id: "2026-MNM-MCQ-01",
    topicKey: "MetalsNonMetals",
    subtopic: "Reactivity Series & Displacement",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which of the following metals will displace copper from CuSO₄ solution?",
    options: ["Ag", "Hg", "Fe", "Au"],
    answer: "Fe",
    explanation:
      "Iron is above copper in the reactivity series and can displace it from copper sulphate solution.",
    policyTag: "Reactivity series MCQ",
    solutionSteps: [
      "According to the reactivity series, a more reactive metal displaces a less reactive metal from its salt solution.",
      "Iron (Fe) is placed above copper (Cu) in the reactivity series, indicating it is more reactive than copper.",
      "Therefore, iron will displace copper from copper sulphate (CuSO₄) solution.",
    ],
    finalAnswer: "Fe",
  },

  {
    id: "2026-MNM-SA-02",
    topicKey: "MetalsNonMetals",
    subtopic: "Corrosion & Prevention",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "(a) What is corrosion?\n(b) Name the corrosion of iron and mention one method to prevent it.",
    answer:
      "(a) Corrosion is the gradual deterioration of metals by reaction with air, moisture or chemicals.\n(b) Corrosion of iron is called rusting; it can be prevented by galvanisation (coating with zinc), painting, or oiling/greasing.",
    explanation:
      "Rusting is a specific type of corrosion of iron. Protective coatings cut off contact with moisture and oxygen.",
    policyTag: "Rusting definition/prevention",
    solutionSteps: [
      "Corrosion is the gradual deterioration of metals.",
      "It occurs due to reaction with air, moisture, or chemicals.",
      "Corrosion of iron is called rusting.",
      "It can be prevented by galvanisation (coating with zinc).",
    ],
    finalAnswer: "(a) Corrosion is the gradual deterioration of metals by reaction with air, moisture or chemicals.\n(b) Corrosion of iron is called rusting; it can be prevented by galvanisation (coating with zinc), painting, or oiling/greasing.",
  },

  {
    id: "2026-MNM-SA-03",
    topicKey: "MetalsNonMetals",
    subtopic: "Properties & Uses",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Explain why: (i) Sodium and potassium are stored under kerosene. (ii) Aluminium develops a thin white layer when exposed to air but does not corrode further like iron.",
    answer:
      "(i) Sodium and potassium are highly reactive metals; they react vigorously with oxygen and moisture, so they are stored under kerosene.\n(ii) Aluminium forms a thin, protective layer of aluminium oxide on its surface which prevents further corrosion.",
    explanation:
      "Reactive alkali metals must be kept away from air and water. Aluminium’s oxide layer is protective, unlike the flaky rust on iron.",
    policyTag: "Reactivity/protective oxide",
    solutionSteps: [
      "Sodium and potassium are highly reactive metals.",
      "They react vigorously with oxygen and moisture in the air.",
      "Therefore, they are stored under kerosene to prevent this reaction.",
      "Aluminium forms a thin, protective layer of aluminium oxide (Al2O3) on its surface when exposed to air.",
      "This oxide layer is stable and prevents further corrosion of the underlying metal.",
    ],
    finalAnswer: "(i) Sodium and potassium are highly reactive metals; they react vigorously with oxygen and moisture, so they are stored under kerosene.\n(ii) Aluminium forms a thin, protective layer of aluminium oxide on its surface which prevents further corrosion.",
  },

  {
    id: "2026-MNM-CASE-04",
    topicKey: "MetalsNonMetals",
    subtopic: "Extraction & Reactivity",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "An ore of metal X is found to be in the form of oxide. The metal is placed in the middle of the reactivity series.\n(i) Name one suitable method to reduce the oxide to metal.\n(ii) What is calcination?\n(iii) Why is electrolytic reduction used for highly reactive metals?\n(iv) Give one example of a highly reactive metal obtained by electrolysis.",
    answer:
      "(i) Reduction using a suitable reducing agent like carbon (smelting) is used.\n(ii) Calcination is heating the ore in the absence or limited supply of air to remove volatile impurities.\n(iii) Highly reactive metals form very stable compounds; only strong reducing conditions like electrolysis can free them.\n(iv) Example: Aluminium from alumina (electrolysis of fused Al₂O₃).",
    explanation:
      "Position in the reactivity series decides the reduction method: carbon for medium-reactive, electrolysis for very reactive metals.",
    policyTag: "Extraction concept/case",
    solutionSteps: [
      "For metal X (middle of reactivity series) as oxide, reduction using a suitable reducing agent like carbon (smelting) is used.",
      "Calcination is heating the ore in the absence or limited supply of air to remove volatile impurities.",
      "Highly reactive metals form very stable compounds with oxygen and other elements.",
      "Only strong reducing conditions, such as electrolytic reduction, can break these stable bonds to obtain the pure metal.",
      "An example of a highly reactive metal obtained by electrolysis is sodium (Na) or potassium (K) or aluminium (Al).",
    ],
    finalAnswer: "(i) Reduction using a suitable reducing agent like carbon (smelting) is used.\n(ii) Calcination is heating the ore in the absence or limited supply of air to remove volatile impurities.\n(iii) Highly reactive metals form very stable compounds; only strong reducing conditions like electrolysis can free",
  },

  // ================================================================
  // CARBON & ITS COMPOUNDS
  // ================================================================

  {
    id: "2026-CC-MCQ-01",
    topicKey: "CarbonCompounds",
    subtopic: "Homologous Series & Nomenclature",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which of the following is the IUPAC name of CH₃–CH₂–CH₂–OH?",
    options: ["Methanol", "Ethanol", "Propanol", "Propene"],
    answer: "Propanol",
    explanation:
      "Three-carbon chain with –OH group → propanol.",
    policyTag: "Nomenclature basics",
    solutionSteps: [
      "The given compound CH₃–CH₂–CH₂–OH has a chain of three carbon atoms.",
      "The functional group present is -OH, which is characteristic of alcohols.",
      "Therefore, the IUPAC name for this three-carbon alcohol is Propanol.",
    ],
    finalAnswer: "Propanol",
  },

  {
    id: "2026-CC-MCQ-02",
    topicKey: "CarbonCompounds",
    subtopic: "Functional Groups",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The functional group present in CH₃–COOH is:",
    options: ["Alcohol", "Carboxylic acid", "Aldehyde", "Ketone"],
    answer: "Carboxylic acid",
    explanation:
      "COOH is the carboxyl functional group, characteristic of carboxylic acids.",
    policyTag: "Functional group recall",
    solutionSteps: [
      "The given compound is CH₃–COOH.",
      "The specific group of atoms -COOH consists of a carbonyl group (C=O) and a hydroxyl group (-OH) attached to the same carbon atom.",
      "This functional group structure (-COOH) is characteristic of carboxylic acids.",
    ],
    finalAnswer: "Carboxylic acid",
  },

  {
    id: "2026-CC-SA-03",
    topicKey: "CarbonCompounds",
    subtopic: "Homologous Series",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "(a) What is a homologous series?\n(b) Write two characteristics of a homologous series.",
    answer:
      "(a) A homologous series is a group of organic compounds having the same functional group and general formula, with successive members differing by –CH₂–.\n(b) Members show similar chemical properties, gradation in physical properties, and differ by a constant mass of 14 u.",
    explanation:
      "Homologous series is a key NCERT concept; constant difference in formula and orderly variation in boiling/melting points is important.",
    policyTag: "Homologous series definition",
    solutionSteps: [
      "(a) A homologous series is a group of organic compounds having the same functional group and general formula.",
      "Successive members of the series differ by a -CH₂- group.",
      "(b) Characteristic 1: Members of a homologous series show similar chemical properties due to the same functional group.",
      "(b) Characteristic 2: There is a gradation in physical properties (e.g., melting point, boiling point) as molecular mass increases, and successive members differ by a constant mass of 14 u.",
    ],
    finalAnswer: "(a) A homologous series is a group of organic compounds having the same functional group and general formula, with successive members differing by –CH₂–.\n(b) Members show similar chemical properties, gradation in physical properties, and differ by a constant mass of 14 u.",
  },

  {
    id: "2026-CC-SA-04",
    topicKey: "CarbonCompounds",
    subtopic: "Ethanol & Ethanoic Acid",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "State three harmful effects of drinking alcohol on the human body.",
    answer:
      "Possible points: (i) Affects nervous system, slows reflexes and impairs judgment. (ii) Long-term use damages liver (cirrhosis). (iii) Leads to addiction and social/health problems such as accidents, violence, and financial issues.",
    explanation:
      "Board questions often ask for three points; any three correct health hazards related to alcohol intake gain full marks.",
    policyTag: "Ethanol health effects",
    solutionSteps: [
      "Drinking alcohol affects the central nervous system, slowing reflexes and impairing judgment and coordination.",
      "Long-term consumption can lead to severe liver damage, including conditions like cirrhosis.",
      "Alcohol can cause addiction, leading to physical and psychological dependence.",
      "It contributes to various social problems such as accidents, violence, and financial difficulties.",
    ],
    finalAnswer: "Possible points: (i) Affects nervous system, slows reflexes and impairs judgment. (ii) Long-term use damages liver (cirrhosis). (iii) Leads to addiction and social/health problems such as accidents, violence, and financial issues.",
  },

  {
    id: "2026-CC-CASE-05",
    topicKey: "CarbonCompounds",
    subtopic: "Soap & Detergents / Micelle",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A student observes that oil droplets do not mix with water but get cleaned when soap is used.\n(i) Explain how soap helps in the cleansing action of oil/grease.\n(ii) What is a micelle?\n(iii) Why do soaps form scum in hard water?\n(iv) Name one advantage of synthetic detergents over soap.",
    answer:
      "(i) Soap molecules have hydrophobic tails that attach to oil and hydrophilic heads that stay in water; agitation breaks the grease into small droplets.\n(ii) A micelle is an aggregate of soap molecules in water, with hydrophobic tails inwards and hydrophilic heads outwards.\n(iii) In hard water, calcium and magnesium ions react with soap forming insoluble scum.\n(iv) Detergents work even in hard water and do not form scum.",
    explanation:
      "Micelle formation explains cleansing; hard water Ca²⁺/Mg²⁺ ions de-activate soap but not synthetic detergents.",
    policyTag: "Micelle/soap-detergent case",
    solutionSteps: [
      "Soap molecules have a hydrophobic (oil-attracting) tail and a hydrophilic (water-attracting) head.",
      "The hydrophobic tails attach to the oil/grease, while the hydrophilic heads face the water, forming an emulsion that can be rinsed away.",
      "A micelle is a spherical aggregate of soap molecules in water, with hydrophobic tails oriented inwards and hydrophilic heads outwards.",
      "Soaps form scum in hard water because they react with calcium and magnesium ions to form insoluble precipitates.",
      "Synthetic detergents do not form scum with hard water, making them effective for washing in both soft and hard water.",
    ],
    finalAnswer: "(i) Soap molecules have hydrophobic tails that attach to oil and hydrophilic heads that stay in water; agitation breaks the grease into small droplets.\n(ii) A micelle is an aggregate of soap molecules in water, with hydrophobic tails inwards and hydrophilic heads outwards.\n(iii) In hard water, calci",
  },

  // ================================================================
  // LIFE PROCESSES
  // ================================================================

  {
    id: "2026-LP-MCQ-01",
    topicKey: "LifeProcesses",
    subtopic: "Nutrition",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "In humans, most absorption of digested food occurs in:",
    options: ["Stomach", "Mouth", "Small intestine", "Large intestine"],
    answer: "Small intestine",
    explanation:
      "The inner lining of the small intestine has numerous villi for maximum absorption.",
    policyTag: "Digestive system MCQ",
    solutionSteps: [
      "The small intestine is the primary site for the absorption of digested food in humans.",
      "Its inner lining has numerous folds, villi, and microvilli, which vastly increase the surface area for absorption.",
      "This extensive surface area allows for efficient uptake of nutrients into the bloodstream.",
    ],
    finalAnswer: "Small intestine",
  },

  {
    id: "2026-LP-MCQ-02",
    topicKey: "LifeProcesses",
    subtopic: "Respiration",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which of the following is a correct pathway of air movement in humans?",
    options: [
      "Nostrils → trachea → bronchi → bronchioles → alveoli",
      "Nostrils → bronchioles → bronchi → trachea → alveoli",
      "Nostrils → alveoli → trachea → bronchi → bronchioles",
      "Nostrils → trachea → alveoli → bronchi → bronchioles",
    ],
    answer: "Nostrils → trachea → bronchi → bronchioles → alveoli",
    explanation:
      "Air moves from nostrils to trachea, then bronchi, bronchioles and finally to tiny air sacs called alveoli.",
    policyTag: "Respiratory pathway MCQ",
    solutionSteps: [
      "Air first enters through the nostrils, then passes down the pharynx and larynx into the trachea.",
      "The trachea divides into bronchi, which further branch into smaller bronchioles.",
      "Bronchioles finally lead to the alveoli, where gas exchange takes place.",
    ],
    finalAnswer: "Nostrils → trachea → bronchi → bronchioles → alveoli",
  },

  {
    id: "2026-LP-SA-03",
    topicKey: "LifeProcesses",
    subtopic: "Nutrition in Humans",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "State the role of (i) bile and (ii) pancreatic juice in digestion.",
    answer:
      "(i) Bile emulsifies fats and provides an alkaline medium for the action of pancreatic enzymes.\n(ii) Pancreatic juice contains enzymes like trypsin, amylase, and lipase that digest proteins, starch, and fats respectively.",
    explanation:
      "Bile does not contain enzymes; it helps mechanically in fat digestion and neutralises acid. Pancreatic enzymes complete most chemical digestion.",
    policyTag: "Digestion short",
    solutionSteps: [
      "(i) Bile emulsifies large fat globules into smaller ones, increasing the surface area for enzyme action.",
      "Bile also provides an alkaline medium in the duodenum, essential for the optimal activity of pancreatic enzymes.",
      "(ii) Pancreatic juice contains digestive enzymes such as trypsin, amylase, and lipase.",
      "These enzymes digest proteins, starch, and fats, respectively, into simpler forms.",
    ],
    finalAnswer: "(i) Bile emulsifies fats and provides an alkaline medium for the action of pancreatic enzymes.\n(ii) Pancreatic juice contains enzymes like trypsin, amylase, and lipase that digest proteins, starch, and fats respectively.",
  },

  {
    id: "2026-LP-SA-04",
    topicKey: "LifeProcesses",
    subtopic: "Transportation in Humans",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Draw a labelled diagram of the human heart and show the direction of flow of blood.",
    answer:
      "A properly labelled diagram with four chambers (right/left atria and ventricles), major vessels (vena cava, pulmonary artery and vein, aorta) and arrows showing double circulation.",
    explanation:
      "Board marking scheme usually gives ½ mark per correct label and ½ mark for correct directional arrows and overall structure.",
    strategyHint:
      "Practise neat labelled diagrams; keep them large enough and use arrows to show oxygenated vs deoxygenated flow.",
    policyTag: "Heart diagram 3-mark",
    solutionSteps: [
      "Draw a clear and proportionate diagram of the human heart.",
      "Label the four chambers: right atrium, left atrium, right ventricle, and left ventricle.",
      "Label the major blood vessels connected to the heart: superior/inferior vena cava, pulmonary artery, pulmonary veins, and aorta.",
      "Use arrows to clearly indicate the direction of blood flow through all chambers and vessels, showing double circulation.",
      "Ensure all labels are accurate, legible, and correctly placed.",
    ],
    finalAnswer: "A properly labelled diagram with four chambers (right/left atria and ventricles), major vessels (vena cava, pulmonary artery and vein, aorta) and arrows showing double circulation.",
  },

  {
    id: "2026-LP-SA-05",
    topicKey: "LifeProcesses",
    subtopic: "Excretion in Humans",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "What is excretion? Name the basic filtration unit of kidneys and draw its diagram.",
    answer:
      "Excretion is the process of removal of metabolic wastes from the body. The basic filtration unit of the kidney is the nephron. Diagram should show Bowman’s capsule, glomerulus, tubule, collecting duct etc.",
    explanation:
      "Definitions plus labelled diagram is a standard 3-mark question; clarity in structure and labels is key.",
    policyTag: "Nephron diagram",
    solutionSteps: [
      "Excretion is the biological process of removal of harmful metabolic waste products from the body.",
      "The basic filtration unit of the kidney is the nephron.",
      "A diagram of the nephron should be drawn.",
      "The diagram must clearly show Bowman’s capsule, glomerulus, renal tubule, and collecting duct.",
    ],
    finalAnswer: "Excretion is the process of removal of metabolic wastes from the body. The basic filtration unit of the kidney is the nephron. Diagram should show Bowman’s capsule, glomerulus, tubule, collecting duct etc.",
  },

  {
    id: "2026-LP-CASE-06",
    topicKey: "LifeProcesses",
    subtopic: "Integrated Life Processes",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A student skips meals regularly and feels weak and tired. Her haemoglobin level is also found to be low.\n(i) Which life process is directly affected?\n(ii) How can improper nutrition affect respiration and energy release?\n(iii) Name the pigment that transports oxygen in blood.\n(iv) Suggest dietary changes that can help improve her condition.",
    answer:
      "(i) Nutrition is directly affected.\n(ii) Without proper nutrients, the body cannot carry out efficient cellular respiration, leading to less energy production.\n(iii) Haemoglobin.\n(iv) Include iron-rich foods (green leafy vegetables, jaggery, pulses), adequate carbohydrates and proteins, and regular balanced meals.",
    explanation:
      "Links between nutrition, respiration and transport (haemoglobin) are often tested in case-based questions.",
    policyTag: "Life processes integrative case",
    solutionSteps: [
      "(i) The life process directly affected is Nutrition.",
      "(ii) Improper nutrition leads to insufficient supply of glucose and other essential nutrients.",
      "(ii) This impairs efficient cellular respiration, which is the process of releasing energy from food.",
      "(ii) Consequently, the body produces less energy, causing weakness and tiredness.",
      "(iii) The pigment that transports oxygen in blood is Haemoglobin.",
      "(iv) Dietary changes should include iron-rich foods like green leafy vegetables, jaggery, and pulses. Also ensure adequate intake of carbohydrates and proteins.",
    ],
    finalAnswer: "(i) Nutrition is directly affected.\n(ii) Without proper nutrients, the body cannot carry out efficient cellular respiration, leading to less energy production.\n(iii) Haemoglobin.\n(iv) Include iron-rich foods (green leafy vegetables, jaggery, pulses), adequate carbohydrates and proteins, and regular ",
  },

  {
    id: "2026-LP-LA-07",
    topicKey: "LifeProcesses",
    subtopic: "Double Circulation & Importance",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Explain the concept of double circulation in humans. Draw a simple flow diagram to show the path of blood from the right atrium back to the same chamber after one complete cycle.",
    answer:
      "Double circulation means that in human beings, blood passes through the heart twice during one complete cycle of circulation – pulmonary and systemic circuits. Deoxygenated blood from body → right atrium → right ventricle → lungs (oxygenation) → left atrium → left ventricle → body again. Flow diagram showing these steps with indication of oxygenated and deoxygenated blood is required.",
    explanation:
      "Boards often give 5 marks for a well-explained description with labelled flow and mention of pulmonary vs systemic circulation.",
    policyTag: "Double circulation 5-mark",
    solutionSteps: [
      "Double circulation means that blood passes through the human heart twice during one complete cycle of circulation.",
      "It involves two distinct pathways: the pulmonary circulation and the systemic circulation.",
      "Deoxygenated blood from the body enters the right atrium, then moves to the right ventricle.",
      "From the right ventricle, it is pumped to the lungs for oxygenation (pulmonary circulation).",
      "Oxygenated blood from the lungs returns to the left atrium, then moves to the left ventricle.",
      "The left ventricle pumps this oxygenated blood to various parts of the body (systemic circulation).",
      "Deoxygenated blood from the body then returns to the right atrium, completing the cycle.",
      "A simple flow diagram should be drawn illustrating this complete path from the right atrium back to the right atrium.",
    ],
    finalAnswer: "Double circulation means that in human beings, blood passes through the heart twice during one complete cycle of circulation – pulmonary and systemic circuits. Deoxygenated blood from body → right atrium → right ventricle → lungs (oxygenation) → left atrium → left ventricle → body again. Flow diagra",
  },

  // ================================================================
  // CONTROL & COORDINATION
  // ================================================================

  {
    id: "2026-CCO-MCQ-01",
    topicKey: "ControlAndCoordination",
    subtopic: "Nervous System",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which part of the neuron receives impulses from other neurons?",
    options: ["Axon", "Dendrites", "Cell body", "Myelin sheath"],
    answer: "Dendrites",
    explanation:
      "Dendrites receive signals; axon carries impulse away from cell body.",
    policyTag: "Neuron structure MCQ",
    solutionSteps: [
      "Neurons transmit information through electrical impulses.",
      "Dendrites are the branched projections of a neuron that receive electrochemical stimulation from other neurons.",
      "Therefore, dendrites are the part of the neuron that receives impulses from other neurons.",
    ],
    finalAnswer: "Dendrites",
  },

  {
    id: "2026-CCO-SA-02",
    topicKey: "ControlAndCoordination",
    subtopic: "Reflex Action",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "(a) What is a reflex action?\n(b) Why are reflex actions important for survival?",
    answer:
      "(a) A reflex action is a rapid, automatic response to a stimulus that does not involve conscious thought.\n(b) It helps protect the body from sudden harmful stimuli, e.g., withdrawing hand from a hot object quickly.",
    explanation:
      "Reflex actions are mediated by spinal cord, bypassing the brain for speed.",
    policyTag: "Reflex definition",
    solutionSteps: [
      "A reflex action is defined as a rapid, involuntary, and automatic response to a stimulus.",
      "It occurs without conscious thought or control from the brain, involving a reflex arc.",
      "Reflex actions are crucial for survival as they provide immediate protection against harmful stimuli.",
      "For example, quickly withdrawing a hand from a hot object prevents severe burns and injury.",
    ],
    finalAnswer: "(a) A reflex action is a rapid, automatic response to a stimulus that does not involve conscious thought.\n(b) It helps protect the body from sudden harmful stimuli, e.g., withdrawing hand from a hot object quickly.",
  },

  {
    id: "2026-CCO-SA-03",
    topicKey: "ControlAndCoordination",
    subtopic: "Plant Hormones & Movements",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Name two plant hormones and write one function of each. Also explain why plants bend towards light.",
    answer:
      "Two hormones: (i) Auxin – promotes cell elongation, especially in stem. (ii) Gibberellin – promotes stem elongation/seed germination (other correct examples acceptable).\nPlants bend towards light due to unequal distribution of auxin on the shaded side, causing more elongation there (phototropism).",
    explanation:
      "Linking hormones with tropic movements is a favourite exam pattern.",
    policyTag: "Plant hormones/tropism",
    solutionSteps: [
      "Two plant hormones are: Auxin and Gibberellin.",
      "Function of Auxin: Promotes cell elongation, especially in stems and shoots, and regulates growth.",
      "Function of Gibberellin: Promotes stem elongation, seed germination, and flowering.",
      "Plants bend towards light due to a phenomenon called phototropism, mediated by the hormone auxin.",
      "When light falls on a plant from one direction, auxin migrates to the shaded side, causing cells on the shaded side to elongate more rapidly than those on the illuminated side, thus bending the plant towards the light source.",
    ],
    finalAnswer: "Two hormones: (i) Auxin – promotes cell elongation, especially in stem. (ii) Gibberellin – promotes stem elongation/seed germination (other correct examples acceptable).\nPlants bend towards light due to unequal distribution of auxin on the shaded side, causing more elongation there (phototropism).",
  },

  {
    id: "2026-CCO-CASE-04",
    topicKey: "ControlAndCoordination",
    subtopic: "Endocrine System",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A student shows symptoms like stunted growth and poor development of secondary sexual characters.\n(i) Which body system is most likely affected?\n(ii) Name one hormone responsible for growth.\n(iii) Name the gland that secretes this hormone.\n(iv) Why is hormonal coordination slower than nervous coordination?",
    answer:
      "(i) Endocrine (hormonal) system.\n(ii) Growth hormone.\n(iii) Pituitary gland.\n(iv) Hormones travel through blood to target organs, so responses are slower and more prolonged compared to rapid nerve impulses.",
    explanation:
      "Links endocrine glands with growth and discusses difference between nervous and hormonal control.",
    policyTag: "Endocrine case-study",
    solutionSteps: [
      "The symptoms of stunted growth and poor development of secondary sexual characters indicate an imbalance in body regulation.",
      "This type of regulation is primarily controlled by chemical messengers, pointing to the endocrine (hormonal) system.",
      "Growth hormone is the specific hormone responsible for promoting overall body growth.",
      "The pituitary gland is known as the master gland and secretes growth hormone.",
      "Hormonal coordination involves hormones traveling through the bloodstream to reach target organs, which is a relatively slow process.",
      "Nervous coordination involves rapid electrical impulses transmitted along nerve fibers, leading to much quicker responses.",
    ],
    finalAnswer: "(i) Endocrine (hormonal) system.\n(ii) Growth hormone.\n(iii) Pituitary gland.\n(iv) Hormones travel through blood to target organs, so responses are slower and more prolonged compared to rapid nerve impulses.",
  },

  // ================================================================
  // HOW DO ORGANISMS REPRODUCE?
  // ================================================================

  {
    id: "2026-REP-MCQ-01",
    topicKey: "Reproduction",
    subtopic: "Asexual Reproduction",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Binary fission is a mode of reproduction common in:",
    options: ["Yeast", "Amoeba", "Planaria", "Hydra"],
    answer: "Amoeba",
    explanation:
      "Amoeba divides into two by binary fission; yeast reproduces by budding.",
    policyTag: "Asexual reproduction MCQ",
    solutionSteps: [
      "Binary fission is an asexual reproduction method where a single parent cell divides into two identical daughter cells.",
      "Organisms like Amoeba, Paramecium, and Leishmania commonly reproduce through binary fission.",
      "Among the common examples, Amoeba is a well-known organism that reproduces by binary fission.",
    ],
    finalAnswer: "Amoeba",
  },

  {
    id: "2026-REP-SA-02",
    topicKey: "Reproduction",
    subtopic: "Asexual Reproduction",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Differentiate between binary fission and multiple fission with one example each.",
    answer:
      "Binary fission: parent cell splits into two almost equal halves, e.g., Amoeba.\nMultiple fission: parent cell divides into many daughter cells at once, e.g., Plasmodium.",
    explanation:
      "Key difference is number of daughter cells produced in one division.",
    policyTag: "Binary vs multiple fission",
    solutionSteps: [
      "Binary fission is a type of asexual reproduction where the parent cell divides into two approximately equal daughter cells.",
      "An example of an organism that reproduces by binary fission is Amoeba.",
      "Multiple fission is an asexual reproduction method where the parent cell divides into many daughter cells simultaneously.",
      "An example of an organism that reproduces by multiple fission is Plasmodium.",
    ],
    finalAnswer: "Binary fission: parent cell splits into two almost equal halves, e.g., Amoeba.\nMultiple fission: parent cell divides into many daughter cells at once, e.g., Plasmodium.",
  },

  {
    id: "2026-REP-SA-03",
    topicKey: "Reproduction",
    subtopic: "Sexual Reproduction in Humans",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "State the functions of (i) testes, (ii) ovaries and (iii) uterus in human beings.",
    answer:
      "(i) Testes produce male gametes (sperms) and male sex hormone (testosterone).\n(ii) Ovaries produce female gametes (ova) and female sex hormones (oestrogen and progesterone).\n(iii) Uterus is the site of implantation of fertilised egg and development of the embryo/foetus.",
    explanation:
      "Standard 3-mark question; role-based answers are important.",
    policyTag: "Human reproduction functions",
    solutionSteps: [
      "Testes: Produce male gametes (sperms).",
      "Testes: Produce male sex hormone (testosterone).",
      "Ovaries: Produce female gametes (ova).",
      "Ovaries: Produce female sex hormones (oestrogen and progesterone).",
      "Uterus: Site of implantation of the fertilised egg and development of the embryo/foetus.",
    ],
    finalAnswer: "(i) Testes produce male gametes (sperms) and male sex hormone (testosterone).\n(ii) Ovaries produce female gametes (ova) and female sex hormones (oestrogen and progesterone).\n(iii) Uterus is the site of implantation of fertilised egg and development of the embryo/foetus.",
  },

  {
    id: "2026-REP-SA-04",
    topicKey: "Reproduction",
    subtopic: "Reproduction in Flowering Plants",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Describe the process of fertilisation in flowering plants.",
    answer:
      "Pollen grains land on stigma, germinate to form pollen tube, which grows through style to ovule. Male gametes travel through pollen tube; one male gamete fuses with egg cell to form zygote (syngamy) and the other with polar nuclei to form endosperm (double fertilisation).",
    explanation:
      "Double fertilisation is unique to flowering plants; use proper key terms and sequence.",
    policyTag: "Double fertilisation",
    solutionSteps: [
      "Pollen grains land on the stigma and germinate, forming a pollen tube.",
      "The pollen tube grows through the style and enters the ovule, carrying two male gametes.",
      "One male gamete fuses with the egg cell (syngamy) to form the zygote.",
      "The other male gamete fuses with the polar nuclei to form the endosperm.",
      "This process involving two fusions is known as double fertilisation.",
    ],
    finalAnswer: "Pollen grains land on stigma, germinate to form pollen tube, which grows through style to ovule. Male gametes travel through pollen tube; one male gamete fuses with egg cell to form zygote (syngamy) and the other with polar nuclei to form endosperm (double fertilisation).",
  },

  // ================================================================
  // HEREDITY & EVOLUTION
  // ================================================================

  {
    id: "2026-HE-MCQ-01",
    topicKey: "HeredityEvolution",
    subtopic: "Mendel’s Experiments",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "In a monohybrid cross, the F₂ phenotypic ratio is:",
    options: ["1:2:1", "3:1", "9:3:3:1", "1:1"],
    answer: "3:1",
    explanation:
      "Monohybrid cross shows a 3:1 phenotypic ratio in F₂ generation.",
    policyTag: "Monohybrid ratio MCQ",
    solutionSteps: [
      "A monohybrid cross involves crossing two pure parents differing in one trait.",
      "The F1 generation expresses only the dominant trait.",
      "Self-pollination of F1 individuals yields an F2 generation with a phenotypic ratio of 3 dominant to 1 recessive.",
    ],
    finalAnswer: "3:1",
  },

  {
    id: "2026-HE-SA-02",
    topicKey: "HeredityEvolution",
    subtopic: "Monohybrid Cross",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Explain Mendel’s monohybrid cross using pea plants for tall and dwarf traits and state the phenotypic ratio in F₂ generation.",
    answer:
      "Mendel crossed pure tall (TT) with pure dwarf (tt) pea plants. All F₁ were tall (Tt). On selfing F₁ (Tt × Tt), he obtained F₂ plants in the ratio 3 tall : 1 dwarf. Thus, phenotypic ratio is 3:1.",
    explanation:
      "Use genotype and phenotype clearly; emphasise dominance and segregation of factors.",
    policyTag: "Monohybrid cross 3-mark",
    solutionSteps: [
      "Mendel crossed pure tall (TT) pea plants with pure dwarf (tt) pea plants (P generation).",
      "All offspring in the F₁ generation were tall (Tt), demonstrating the dominance of the tall trait.",
      "He then self-pollinated the F₁ generation plants (Tt x Tt).",
      "In the F₂ generation, he observed both tall and dwarf plants.",
      "The phenotypic ratio in the F₂ generation was 3 tall : 1 dwarf.",
    ],
    finalAnswer: "Mendel crossed pure tall (TT) with pure dwarf (tt) pea plants. All F₁ were tall (Tt). On selfing F₁ (Tt × Tt), he obtained F₂ plants in the ratio 3 tall : 1 dwarf. Thus, phenotypic ratio is 3:1.",
  },



  // ================================================================
  // LIGHT – REFLECTION & REFRACTION
  // ================================================================

  {
    id: "2026-LIGHT-MCQ-01",
    topicKey: "Light",
    subtopic: "Mirror Formula & Images",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The image formed by a plane mirror is:",
    options: [
      "Real, inverted and same size",
      "Virtual, erect and same size",
      "Real, inverted and diminished",
      "Virtual, erect and magnified",
    ],
    answer: "Virtual, erect and same size",
    explanation:
      "Plane mirrors form virtual, erect images of same size behind the mirror.",
    policyTag: "Image characteristics MCQ",
    solutionSteps: [
      "A plane mirror always forms an image behind the mirror.",
      "This image cannot be obtained on a screen, making it virtual. It is also upright (erect) and of the same size as the object.",
    ],
    finalAnswer: "Virtual, erect and same size",
  },

  {
    id: "2026-LIGHT-MCQ-02",
    topicKey: "Light",
    subtopic: "Refraction",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "When a ray of light passes from a denser medium to a rarer medium, it:",
    options: [
      "bends towards the normal",
      "bends away from the normal",
      "passes undeviated",
      "is totally absorbed",
    ],
    answer: "bends away from the normal",
    explanation:
      "Light bends away from the normal when it moves from denser to rarer medium.",
    policyTag: "Refraction rule MCQ",
    solutionSteps: [
      "When light travels from one medium to another, its speed changes, causing it to bend (refraction).",
      "If light moves from a denser (slower) to a rarer (faster) medium, it speeds up and bends away from the normal.",
    ],
    finalAnswer: "bends away from the normal",
  },

  {
    id: "2026-LIGHT-SA-03",
    topicKey: "Light",
    subtopic: "Spherical Mirrors",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Write the mirror formula and define each term involved. State its sign convention.",
    answer:
      "Mirror formula: 1/f = 1/v + 1/u\nWhere f is focal length, v is image distance, u is object distance (all measured from pole with sign conventions). In the new Cartesian sign convention: all distances measured from pole; distances in direction of incident light taken as positive, opposite direction as negative.",
    explanation:
      "Students must memorise the formula and basic sign convention to solve numericals.",
    policyTag: "Mirror formula basics",
    solutionSteps: [
      "State the mirror formula: 1/f = 1/v + 1/u.",
      "Define terms: f is focal length, v is image distance, u is object distance. All are measured from the pole.",
      "New Cartesian Sign Convention: All distances are measured from the pole. Distances in the direction of incident light are positive.",
      "Distances in the opposite direction are negative. Heights above the principal axis are positive, below are negative.",
    ],
    finalAnswer: "Mirror formula: 1/f = 1/v + 1/u\nWhere f is focal length, v is image distance, u is object distance (all measured from pole with sign conventions). In the new Cartesian sign convention: all distances measured from pole; distances in direction of incident light taken as positive, opposite direction as",
  },

  {
    id: "2026-LIGHT-SA-04",
    topicKey: "Light",
    subtopic: "Lens Formula & Numericals",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "An object is placed at 20 cm in front of a converging lens of focal length 10 cm. Find the position and nature of the image formed.",
    answer:
      "Using 1/f = 1/v − 1/u ⇒ 1/10 = 1/v − 1/(−20) ⇒ 1/10 = 1/v + 1/20 ⇒ 1/v = 1/10 − 1/20 = 1/20 ⇒ v = 20 cm. Image is real, inverted, and same size (as object is at 2f).",
    explanation:
      "Object at 2f for a convex lens gives image at 2f, same size and real inverted.",
    policyTag: "Lens numerical",
    solutionSteps: [
      "Given: Object distance u = -20 cm (as per sign convention), Focal length f = +10 cm (for converging lens).",
      "Apply the lens formula: 1/f = 1/v - 1/u.",
      "Substitute the values: 1/10 = 1/v - 1/(-20).",
      "Solve for v: 1/v = 1/10 - 1/20 = 2/20 - 1/20 = 1/20. So, v = +20 cm.",
      "The image is formed at 20 cm on the other side of the lens. It is real, inverted, and same size.",
    ],
    finalAnswer: "Using 1/f = 1/v − 1/u ⇒ 1/10 = 1/v − 1/(−20) ⇒ 1/10 = 1/v + 1/20 ⇒ 1/v = 1/10 − 1/20 = 1/20 ⇒ v = 20 cm. Image is real, inverted, and same size (as object is at 2f).",
  },

  {
    id: "2026-LIGHT-SA-05",
    topicKey: "Light",
    subtopic: "Ray Diagrams",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Draw ray diagrams to show the formation of image by a concave mirror when the object is placed (i) beyond C, (ii) at C, and (iii) between F and C.",
    answer:
      "Answer should include three neat ray diagrams with correct positions and nature of images: (i) real, inverted, diminished between C and F; (ii) real, inverted, same size at C; (iii) real, inverted, enlarged beyond C.",
    explanation:
      "Ray diagrams and position/nature of images at standard positions are frequently tested.",
    policyTag: "Concave mirror diagrams",
    solutionSteps: [
      "Draw three neat ray diagrams for a concave mirror, clearly marking the pole (P), principal focus (F), and centre of curvature (C).",
      "(i) Object beyond C: Image forms between F and C. It is real, inverted, and diminished.",
      "(ii) Object at C: Image forms at C. It is real, inverted, and same size as the object.",
      "(iii) Object between F and C: Image forms beyond C. It is real, inverted, and enlarged.",
      "Each diagram must use at least two correct incident and reflected rays to locate the image.",
    ],
    finalAnswer: "Answer should include three neat ray diagrams with correct positions and nature of images: (i) real, inverted, diminished between C and F; (ii) real, inverted, same size at C; (iii) real, inverted, enlarged beyond C.",
  },

  {
    id: "2026-LIGHT-CASE-06",
    topicKey: "Light",
    subtopic: "Refraction through Glass Slab & Prism",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A light ray passes through a rectangular glass slab. The emergent ray is parallel to the incident ray but laterally displaced.\n(i) Name the phenomenon responsible for this.\n(ii) Why does lateral displacement occur?\n(iii) How does thickness of slab affect lateral displacement?\n(iv) State one difference between refraction through a glass slab and through a prism.",
    answer:
      "(i) Refraction of light.\n(ii) Due to successive refractions at the air-glass and glass-air interfaces.\n(iii) Greater thickness of slab results in more lateral displacement.\n(iv) In a slab, emergent ray is parallel to incident ray; in a prism, emergent ray deviates and is not parallel.",
    explanation:
      "Conceptual refraction case based directly on NCERT; focuses on lateral displacement and slab vs prism comparison.",
    policyTag: "Glass slab refraction case",
    solutionSteps: [
      "The phenomenon responsible is refraction of light.",
      "Lateral displacement occurs due to successive refractions at the two parallel interfaces (air-glass and glass-air).",
      "The light ray bends twice, once towards the normal and once away from it, resulting in a shift.",
      "Greater thickness of the glass slab leads to a larger lateral displacement of the emergent ray.",
      "In a glass slab, the emergent ray is parallel to the incident ray.",
      "In a prism, the emergent ray is deviated from the incident ray and is not parallel to it.",
    ],
    finalAnswer: "(i) Refraction of light.\n(ii) Due to successive refractions at the air-glass and glass-air interfaces.\n(iii) Greater thickness of slab results in more lateral displacement.\n(iv) In a slab, emergent ray is parallel to incident ray; in a prism, emergent ray deviates and is not parallel.",
  },

  {
    id: "2026-LIGHT-LA-07",
    topicKey: "Light",
    subtopic: "Magnification & Sign Convention",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Define magnification produced by a spherical mirror. Derive the relation between magnification (m), image distance (v) and object distance (u) for a mirror. Also, differentiate between the sign of magnification for real and virtual images.",
    answer:
      "Magnification m is the ratio of height of image (h') to height of object (h). Using similar triangles, m = h'/h = −v/u. For real images, magnification is negative (inverted image); for virtual images, it is positive (erect image).",
    explanation:
      "Derivation uses similar triangles formed by object and image with mirror pole; sign of m directly tells the nature of image.",
    policyTag: "Magnification derivation",
    solutionSteps: [
      "Magnification (m) is defined as the ratio of the height of the image (h') to the height of the object (h).",
      "Consider an object placed in front of a spherical mirror, forming an image. Draw a ray diagram.",
      "By using similar triangles formed by the object, image, and the principal axis (e.g., triangle ABP and A'B'P).",
      "The ratio of image height to object height (h'/h) is equal to the ratio of image distance to object distance (v/u).",
      "Applying the sign conventions (heights above axis positive, below negative; distances measured from pole), we get m = h'/h = -v/u.",
      "For real images, the image is inverted, so h' is negative, making the magnification (m) negative.",
      "For virtual images, the image is erect, so h' is positive, making the magnification (m) positive.",
    ],
    finalAnswer: "Magnification m is the ratio of height of image (h') to height of object (h). Using similar triangles, m = h'/h = −v/u. For real images, magnification is negative (inverted image); for virtual images, it is positive (erect image).",
  },


  // --- EXTRA LIGHT PRACTICE BLOCK (BOARD-STYLE) -------------------

  {
    id: "2026-LIGHT-MCQ-08",
    topicKey: "Light",
    subtopic: "Mirror Formula & Images",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "For a concave mirror, an object placed between the pole and focus produces an image that is:",
    options: [
      "Real, inverted and enlarged",
      "Real, inverted and diminished",
      "Virtual, erect and enlarged",
      "Virtual, erect and diminished",
    ],
    answer: "Virtual, erect and enlarged",
    explanation:
      "For a concave mirror with object between pole and focus, the image formed is virtual, erect, enlarged and behind the mirror.",
    pastBoardYear: "Model",
    policyTag: "Light mirror position-image mapping",
    solutionSteps: [
      "When an object is placed between the pole (P) and the principal focus (F) of a concave mirror, the reflected rays diverge.",
      "These diverging rays appear to meet behind the mirror when extended backwards, forming a virtual image.",
      "This image is always erect and enlarged compared to the object.",
    ],
    finalAnswer: "Virtual, erect and enlarged",
  },

  {
    id: "2026-LIGHT-MCQ-09",
    topicKey: "Light",
    subtopic: "Refraction & Snell’s Law",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "The refractive index of glass with respect to air is 1.5. This means that:",
    options: [
      "The speed of light in glass is 1.5 times that in air",
      "The speed of light in air is 1.5 times that in glass",
      "The speed of light in glass is 3.0 × 10⁸ m/s",
      "The speed of light in air is less than in glass",
    ],
    answer: "The speed of light in air is 1.5 times that in glass",
    explanation:
      "Refractive index n = c / v. If n = 1.5, then c = 1.5 v, so speed of light in air is 1.5 times the speed in glass.",
    pastBoardYear: "Model",
    policyTag: "Refractive index interpretation MCQ",
    solutionSteps: [
      "The refractive index (n) of a medium is defined as the ratio of the speed of light in air/vacuum (c) to the speed of light in the medium (v). So, n = c/v.",
      "Given that the refractive index of glass with respect to air is 1.5. This means n_glass_air = speed of light in air / speed of light in glass = 1.5.",
      "Therefore, the speed of light in air is 1.5 times the speed of light in glass.",
    ],
    finalAnswer: "The speed of light in air is 1.5 times that in glass",
  },

  {
    id: "2026-LIGHT-MCQ-10",
    topicKey: "Light",
    subtopic: "Total Internal Reflection & Critical Angle",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "Total internal reflection occurs when light travels:",
    options: [
      "From rarer medium to denser medium and angle of incidence > critical angle",
      "From denser medium to rarer medium and angle of incidence > critical angle",
      "From denser medium to rarer medium and angle of incidence = 0°",
      "From rarer medium to denser medium and angle of incidence < critical angle",
    ],
    answer:
      "From denser medium to rarer medium and angle of incidence > critical angle",
    explanation:
      "Total internal reflection takes place only when light travels from denser to rarer medium and angle of incidence exceeds the critical angle.",
    pastBoardYear: "Model",
    policyTag: "TIR condition MCQ",
    solutionSteps: [
      "Total internal reflection (TIR) occurs when light travels from an optically denser medium to an optically rarer medium.",
      "Additionally, the angle of incidence in the denser medium must be greater than the critical angle for the interface between the two media.",
      "Both conditions are necessary for total internal reflection to take place.",
    ],
    finalAnswer: "From denser medium to rarer medium and angle of incidence > critical angle",
  },

  {
    id: "2026-LIGHT-SA-08",
    topicKey: "Light",
    subtopic: "Mirror Formula & Sign Convention",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "An object is placed 15 cm in front of a concave mirror of focal length 10 cm. Use mirror formula to find the position of the image. State the nature of image formed.",
    answer:
      "Using 1/f = 1/v + 1/u with f = −10 cm and u = −15 cm: 1/−10 = 1/v + 1/−15 ⇒ −1/10 = 1/v − 1/15. Solving gives v = −30 cm. Image is real, inverted and enlarged, formed 30 cm in front of the mirror.",
    explanation:
      "Substitute values in mirror formula with correct signs; negative v indicates image in front of mirror (real). Magnitude greater than object distance shows enlargement.",
    pastBoardYear: "Model",
    policyTag: "Concave mirror numerical 2m",
    solutionSteps: [
      "Given: Object distance, u = -15 cm (object placed in front of mirror). Focal length of concave mirror, f = -10 cm.",
      "Apply the mirror formula: 1/f = 1/v + 1/u. Substitute the given values: 1/(-10) = 1/v + 1/(-15).",
      "Rearrange to find v: 1/v = 1/(-10) - 1/(-15) = -1/10 + 1/15 = (-3 + 2)/30 = -1/30.",
      "Therefore, the image distance v = -30 cm. Since v is negative, the image is real and formed 30 cm in front of the mirror. The image is inverted and enlarged.",
    ],
    finalAnswer: "Using 1/f = 1/v + 1/u with f = −10 cm and u = −15 cm: 1/−10 = 1/v + 1/−15 ⇒ −1/10 = 1/v − 1/15. Solving gives v = −30 cm. Image is real, inverted and enlarged, formed 30 cm in front of the mirror.",
  },

  {
    id: "2026-LIGHT-SA-09",
    topicKey: "Light",
    subtopic: "Refraction through Glass Slab",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "State Snell’s law of refraction. How is the refractive index of a medium related to the speed of light in vacuum and in that medium?",
    answer:
      "Snell’s law: n₁ sin i = n₂ sin r. Refractive index n of a medium is given by n = c / v, where c is speed of light in vacuum and v is speed of light in the medium.",
    explanation:
      "Snell’s law relates angles of incidence and refraction; definition of refractive index links it to speed of light.",
    pastBoardYear: "Model",
    policyTag: "Snell law and n = c/v",
    solutionSteps: [
      "Snell's law states that for a given pair of media, the ratio of the sine of the angle of incidence to the sine of the angle of refraction is constant.",
      "Mathematically, Snell's law is expressed as n₁ sin i = n₂ sin r, where n₁ and n₂ are refractive indices, i is angle of incidence, r is angle of refraction.",
      "The refractive index (n) of a medium is defined as the ratio of the speed of light in vacuum (c) to the speed of light in that medium (v).",
      "This relationship is given by the formula: n = c / v.",
    ],
    finalAnswer: "Snell’s law: n₁ sin i = n₂ sin r. Refractive index n of a medium is given by n = c / v, where c is speed of light in vacuum and v is speed of light in the medium.",
  },

  {
    id: "2026-LIGHT-SA-10",
    topicKey: "Light",
    subtopic: "Lens Formula & Magnification",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A convex lens of focal length 15 cm forms a real image of an object at 30 cm from the lens on the other side. Find the position of the object and the magnification produced.",
    answer:
      "Given f = +15 cm, v = +30 cm. Using 1/f = 1/v − 1/u: 1/15 = 1/30 − 1/u ⇒ 1/u = 1/30 − 1/15 = −1/30, so u = −30 cm. Magnification m = v / u = 30 / (−30) = −1, so image is real, inverted and same size.",
    explanation:
      "Apply lens formula with sign convention; object distance negative, real image positive. Magnification as v/u gives sign and size relation.",
    pastBoardYear: "Model",
    policyTag: "Convex lens numerical 3m",
    solutionSteps: [
      "Given: focal length of convex lens f = +15 cm. Image is real and on the other side, so image distance v = +30 cm.",
      "Apply the lens formula: 1/f = 1/v - 1/u.",
      "Substitute the given values: 1/15 = 1/30 - 1/u. Rearrange to find 1/u: 1/u = 1/30 - 1/15.",
      "Calculate 1/u: 1/u = (1 - 2)/30 = -1/30. Therefore, the object position u = -30 cm.",
      "Calculate magnification: m = v/u = 30/(-30) = -1. The image is real, inverted, and of the same size as the object.",
    ],
    finalAnswer: "Given f = +15 cm, v = +30 cm. Using 1/f = 1/v − 1/u: 1/15 = 1/30 − 1/u ⇒ 1/u = 1/30 − 1/15 = −1/30, so u = −30 cm. Magnification m = v / u = 30 / (−30) = −1, so image is real, inverted and same size.",
  },

  {
    id: "2026-LIGHT-SA-11",
    topicKey: "Light",
    subtopic: "Ray Diagrams & Image Types",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "List any three rules used to draw ray diagrams for image formation by a convex lens. Using these rules, describe the nature and position of the image formed when object is placed at focus F₁.",
    answer:
      "Rules: (i) A ray parallel to principal axis passes through second focus F₂ after refraction. (ii) A ray passing through optical centre goes undeviated. (iii) A ray passing through F₁ emerges parallel to principal axis. For object at F₁, refracted rays are parallel, so image is formed at infinity; it is highly enlarged and real.",
    explanation:
      "Recall standard rules for convex lens ray construction; special case object at focus gives image at infinity, very large and real.",
    pastBoardYear: "Model",
    policyTag: "Convex lens ray rules 3m",
    solutionSteps: [
      "Rule 1: A ray of light parallel to the principal axis passes through the second principal focus (F₂) after refraction.",
      "Rule 2: A ray of light passing through the optical centre (O) of the lens goes undeviated after refraction.",
      "Rule 3: A ray of light passing through the first principal focus (F₁) emerges parallel to the principal axis after refraction.",
      "When an object is placed at the focus F₁ of a convex lens, the rays of light from the object, after refraction, become parallel to each other.",
      "Therefore, the image is formed at infinity, and its nature is real, inverted, and highly enlarged.",
    ],
    finalAnswer: "Rules: (i) A ray parallel to principal axis passes through second focus F₂ after refraction. (ii) A ray passing through optical centre goes undeviated. (iii) A ray passing through F₁ emerges parallel to principal axis. For object at F₁, refracted rays are parallel, so image is formed at infinity; it",
  },

  {
    id: "2026-LIGHT-LA-08",
    topicKey: "Light",
    subtopic: "Power of Lens & Combination",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Hard",
    bloomSkill: "Analysing",
    questionText:
      "A student uses spectacles with lenses of power −2.0 D for distant vision. (a) Identify the type of lens used and calculate its focal length. (b) If another lens of power +1.0 D is placed in contact with it, find the net power and nature of the resulting lens. (c) Comment on how this combination affects the student’s vision for distant objects.",
    answer:
      "(a) Negative power ⇒ concave lens, focal length f = 1/P = 1/−2.0 = −0.5 m. (b) Net power Pₙ = −2.0 + 1.0 = −1.0 D, so resulting lens is still concave with f = −1.0 m. (c) Combination reduces the effective divergence; distant objects remain clear but with slightly reduced correction strength.",
    explanation:
      "Use relation P = 1/f (in m) and add powers algebraically for lenses in contact; interpret sign of net power for nature of lens and its effect on correction.",
    pastBoardYear: "Model",
    policyTag: "Lens power combination case",
    solutionSteps: [
      "For part (a), the given power P = -2.0 D is negative, which indicates that the lens used is a concave lens.",
      "The focal length (f) is calculated using the formula f = 1/P.",
      "Substituting the power, f = 1/(-2.0) = -0.5 m. So, the focal length is -0.5 meters.",
      "For part (b), when another lens of power P2 = +1.0 D is placed in contact, the net power P_net = P1 + P2.",
      "P_net = -2.0 D + 1.0 D = -1.0 D. Since the net power is negative, the resulting lens is still concave.",
      "For part (c), this combination reduces the overall diverging power of the spectacles. The student's vision for distant objects will still be corrected, but with slightly reduced correction strength compared to the original lens.",
    ],
    finalAnswer: "(a) Negative power ⇒ concave lens, focal length f = 1/P = 1/−2.0 = −0.5 m. (b) Net power Pₙ = −2.0 + 1.0 = −1.0 D, so resulting lens is still concave with f = −1.0 m. (c) Combination reduces the effective divergence; distant objects remain clear but with slightly reduced correction strength.",
  },

  // ================================================================
  // THE HUMAN EYE & THE COLOURFUL WORLD
  // ================================================================

  {
    id: "2026-HECW-MCQ-01",
    topicKey: "HumanEyeAndColourfulWorld",
    subtopic: "Structure of Human Eye",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The part of the eye where the image is formed is:",
    options: ["Cornea", "Iris", "Retina", "Pupil"],
    answer: "Retina",
    explanation:
      "Retina contains light-sensitive cells and acts as the screen for image formation.",
    policyTag: "Eye structure MCQ",
    solutionSteps: [
      "The retina is the light-sensitive screen located at the back of the human eye.",
      "Light rays entering the eye are focused by the lens onto the retina, where a real and inverted image is formed.",
    ],
    finalAnswer: "Retina",
  },

  {
    id: "2026-HECW-SA-02",
    topicKey: "HumanEyeAndColourfulWorld",
    subtopic: "Defects of Vision",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "What is myopia? How can it be corrected?",
    answer:
      "Myopia (short-sightedness) is a defect in which a person can see nearby objects clearly but distant objects appear blurred. It is corrected using a concave (diverging) lens.",
    explanation:
      "Concave lens diverges light rays so that they can be focused properly on the retina for distant objects.",
    policyTag: "Myopia correction",
    solutionSteps: [
      "Myopia, also known as short-sightedness, is a common defect of vision.",
      "A person suffering from myopia can see nearby objects clearly, but distant objects appear blurred.",
      "This defect occurs because the eye lens focuses light from distant objects in front of the retina.",
      "Myopia can be corrected by using spectacles fitted with a concave (diverging) lens of appropriate power.",
    ],
    finalAnswer: "Myopia (short-sightedness) is a defect in which a person can see nearby objects clearly but distant objects appear blurred. It is corrected using a concave (diverging) lens.",
  },

  {
    id: "2026-HECW-SA-03",
    topicKey: "HumanEyeAndColourfulWorld",
    subtopic: "Atmospheric Refraction",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Explain why the Sun appears slightly above the horizon even when it is actually below the horizon at sunrise and sunset.",
    answer:
      "Due to atmospheric refraction, light from the Sun bends as it passes through layers of air of varying densities. This bending makes the Sun appear higher than its actual position, so we can see it a little before it rises and after it sets.",
    explanation:
      "Refractive index changes with density; bending makes apparent position different from real position.",
    policyTag: "Advanced sunrise/delayed sunset",
    solutionSteps: [
      "The Earth's atmosphere consists of layers of air with varying optical densities, denser near the surface.",
      "When the Sun is below the horizon, light from it travels from a rarer medium (space) to a denser medium (atmosphere).",
      "This light undergoes continuous refraction, bending towards the normal as it passes through increasingly denser air layers.",
      "Due to this atmospheric refraction, the light rays appear to come from a higher position.",
      "Therefore, the Sun appears slightly above the horizon even when it is actually below it at sunrise and sunset.",
    ],
    finalAnswer: "Due to atmospheric refraction, light from the Sun bends as it passes through layers of air of varying densities. This bending makes the Sun appear higher than its actual position, so we can see it a little before it rises and after it sets.",
  },

  {
    id: "2026-HECW-CASE-04",
    topicKey: "HumanEyeAndColourfulWorld",
    subtopic: "Scattering of Light",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "On a clear day, the sky appears blue, while at sunrise and sunset it appears reddish.\n(i) Why does the sky appear blue during the day?\n(ii) Why does it appear red near the horizon at sunrise and sunset?\n(iii) Name the phenomenon responsible.\n(iv) State one application of scattering of light in daily life.",
    answer:
      "(i) Shorter wavelengths (blue light) are scattered more by air molecules, so we see the sky as blue.\n(ii) At sunrise and sunset, light travels a longer path through the atmosphere; shorter wavelengths are scattered away and longer (red) wavelengths reach the eye.\n(iii) Scattering of light.\n(iv) Use of fog lamps with yellow light, Tyndall effect demonstrations, etc.",
    explanation:
      "Scattering is wavelength-dependent; blue light is scattered more than red, explaining sky colour and reddish appearance at sunrise/sunset.",
    policyTag: "Scattering case-study",
    solutionSteps: [
      "(i) Air molecules are very small and scatter shorter wavelengths (blue light) much more effectively than longer wavelengths.",
      "(i) During the day, blue light from the sun is scattered in all directions by the atmosphere, making the sky appear blue.",
      "(ii) At sunrise and sunset, sunlight travels a much longer path through the atmosphere to reach our eyes.",
      "(ii) Most of the shorter wavelength blue light is scattered away along this longer path.",
      "(ii) The longer wavelength red and orange light, which is scattered least, reaches our eyes, making the Sun appear reddish.",
      "(iii) The phenomenon responsible for these observations is Scattering of light.",
    ],
    finalAnswer: "(i) Shorter wavelengths (blue light) are scattered more by air molecules, so we see the sky as blue.\n(ii) At sunrise and sunset, light travels a longer path through the atmosphere; shorter wavelengths are scattered away and longer (red) wavelengths reach the eye.\n(iii) Scattering of light.\n(iv) Use ",
  },

  // ================================================================
  // ELECTRICITY
  // ================================================================

  {
    id: "2026-EL-MCQ-01",
    topicKey: "Electricity",
    subtopic: "Ohm’s Law",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The SI unit of electric current is:",
    options: ["Volt", "Ohm", "Ampere", "Coulomb"],
    answer: "Ampere",
    explanation:
      "Ampere is the SI unit of current (rate of flow of charge).",
    policyTag: "Units/basic MCQ",
    solutionSteps: [
      "Electric current is defined as the rate of flow of electric charge.",
      "The SI unit for measuring electric current is the Ampere (A).",
    ],
    finalAnswer: "Ampere",
  },

  {
    id: "2026-EL-MCQ-02",
    topicKey: "Electricity",
    subtopic: "Resistors in Series/Parallel",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Three resistors of 2 Ω, 3 Ω and 5 Ω are connected in series. Their equivalent resistance is:",
    options: ["10 Ω", "1 Ω", "0.1 Ω", "5 Ω"],
    answer: "10 Ω",
    explanation:
      "In series, equivalent resistance is R = R₁ + R₂ + R₃ = 2 + 3 + 5 = 10 Ω.",
    policyTag: "Series combination MCQ",
    solutionSteps: [
      "Identify that the resistors are connected in series.",
      "State the formula for equivalent resistance in series: R_eq = R1 + R2 + R3.",
      "Substitute the given values: R_eq = 2 Ω + 3 Ω + 5 Ω = 10 Ω.",
    ],
    finalAnswer: "10 Ω",
  },

  {
    id: "2026-EL-SA-03",
    topicKey: "Electricity",
    subtopic: "Ohm’s Law – Numericals",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "A current of 0.5 A flows through a resistor when a potential difference of 10 V is applied. Calculate the resistance of the resistor.",
    answer:
      "Using Ohm’s law, R = V/I = 10/0.5 = 20 Ω.",
    explanation:
      "Direct application of V = IR.",
    policyTag: "Simple Ohm’s law numerical",
    solutionSteps: [
      "Identify the given values: Potential difference (V) = 10 V, Current (I) = 0.5 A.",
      "State Ohm's law: V = IR, which can be rearranged to R = V/I.",
      "Substitute the values into the formula: R = 10 V / 0.5 A.",
      "Calculate the resistance: R = 20 Ω.",
    ],
    finalAnswer: "Using Ohm’s law, R = V/I = 10/0.5 = 20 Ω.",
  },

  {
    id: "2026-EL-SA-04",
    topicKey: "Electricity",
    subtopic: "Power & Energy",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "An electric bulb is rated 220 V, 100 W. Calculate (i) the current drawn by the bulb and (ii) the resistance of the bulb.",
    answer:
      "(i) P = VI ⇒ I = P/V = 100/220 ≈ 0.455 A.\n(ii) Using P = V²/R ⇒ R = V²/P = 220² / 100 = 484 Ω.",
    explanation:
      "Students must choose the correct formula: P = VI and P = V²/R.",
    policyTag: "Power rating numerical",
    solutionSteps: [
      "Identify the given ratings: Voltage (V) = 220 V, Power (P) = 100 W.",
      "For (i) Current drawn: Use the formula P = VI. Rearrange to I = P/V.",
      "Substitute values: I = 100 W / 220 V = 0.4545 A (approx 0.455 A).",
      "For (ii) Resistance of the bulb: Use the formula P = V²/R. Rearrange to R = V²/P.",
      "Substitute values: R = (220 V)² / 100 W = 48400 / 100 = 484 Ω.",
    ],
    finalAnswer: "(i) P = VI ⇒ I = P/V = 100/220 ≈ 0.455 A.\n(ii) Using P = V²/R ⇒ R = V²/P = 220² / 100 = 484 Ω.",
  },

  {
    id: "2026-EL-SA-05",
    topicKey: "Electricity",
    subtopic: "Heating Effect",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Explain why a fuse wire is always connected in series with the live wire of a circuit. On what principle does it work?",
    answer:
      "Fuse wire is connected in series so that when excessive current flows, the fuse melts and breaks the circuit, protecting appliances. It works on the principle of heating effect of current (I²R heating).",
    explanation:
      "Series connection ensures the entire current passes through fuse; heating effect melts it when current exceeds safe limit.",
    policyTag: "Fuse/heating effect",
    solutionSteps: [
      "Fuse wire is connected in series with the live wire to ensure all circuit current passes through it.",
      "When current exceeds a safe limit, the fuse wire, having a low melting point, heats up and melts.",
      "This breaks the circuit, preventing damage to appliances and potential fire hazards.",
      "It works on the principle of the heating effect of electric current (Joule's heating).",
    ],
    finalAnswer: "Fuse wire is connected in series so that when excessive current flows, the fuse melts and breaks the circuit, protecting appliances. It works on the principle of heating effect of current (I²R heating).",
  },

  {
    id: "2026-EL-CASE-06",
    topicKey: "Electricity",
    subtopic: "Domestic Circuits & Safety",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A house circuit has many devices connected like fan, light, TV, and refrigerator.\n(i) Should they be connected in series or parallel? Why?\n(ii) Why is it dangerous to touch a live wire?\n(iii) What is the role of the earth wire in a domestic circuit?\n(iv) Name one safety device used in household wiring and state its function.",
    answer:
      "(i) Devices are connected in parallel so that each gets the same voltage and works independently.\n(ii) Live wire carries high potential; touching it allows current to flow through the body, which can be fatal.\n(iii) Earth wire provides a low-resistance path to the ground for leakage current, preventing electric shock.\n(iv) Fuse or MCB – cuts off current when it exceeds the safe limit.",
    explanation:
      "Brings together concepts of parallel wiring, electric shock, earthing, and safety devices.",
    policyTag: "Domestic wiring case",
    solutionSteps: [
      "(i) Devices should be connected in parallel.",
      "This ensures each appliance receives the full supply voltage and can be operated independently.",
      "(ii) Touching a live wire is dangerous because it carries high potential, causing a large current to flow through the body to the ground, which can be fatal.",
      "(iii) The earth wire provides a low-resistance path for leakage current from faulty appliances to the ground, preventing electric shock.",
      "(iv) A safety device used is a fuse. Its function is to break the circuit when current exceeds a safe limit, protecting appliances.",
    ],
    finalAnswer: "(i) Devices are connected in parallel so that each gets the same voltage and works independently.\n(ii) Live wire carries high potential; touching it allows current to flow through the body, which can be fatal.\n(iii) Earth wire provides a low-resistance path to the ground for leakage current, prevent",
  },

  {
    id: "2026-EL-LA-07",
    topicKey: "Electricity",
    subtopic: "Series & Parallel – Effective Resistance",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Three resistors of 2 Ω, 4 Ω and 6 Ω are connected (i) in series and (ii) in parallel across a 12 V battery. In each case, calculate the total resistance, total current and heat produced in 2 minutes in the circuit.",
    answer:
      "Series: R_s = 2+4+6 = 12 Ω.\nI_s = V/R_s = 12/12 = 1 A.\nHeat H_s = I²Rt = 1²×12×120 = 1440 J.\nParallel: 1/R_p = 1/2 + 1/4 + 1/6 = (6+3+2)/12 = 11/12 ⇒ R_p = 12/11 Ω ≈ 1.09 Ω.\nI_p = 12 / (12/11) = 11 A.\nH_p = I²R_p t ≈ 11²×(12/11)×120 ≈ 11×12×120 = 15840 J.",
    explanation:
      "Shows clear contrast between series and parallel combinations; requires careful computation.",
    policyTag: "Series/parallel comparative numerical",
    solutionSteps: [
      "Given resistors: R1=2Ω, R2=4Ω, R3=6Ω. Voltage V=12V. Time t=2 minutes = 120 seconds.",
      "(i) For series connection: Total resistance Rs = R1 + R2 + R3 = 2 + 4 + 6 = 12 Ω.",
      "Total current Is = V / Rs = 12 V / 12 Ω = 1 A.",
      "Heat produced Hs = Is² * Rs * t = (1 A)² * 12 Ω * 120 s = 1440 J.",
      "(ii) For parallel connection: 1/Rp = 1/R1 + 1/R2 + 1/R3 = 1/2 + 1/4 + 1/6.",
      "1/Rp = (6 + 3 + 2) / 12 = 11/12. So, Rp = 12/11 Ω (approx 1.09 Ω).",
      "Total current Ip = V / Rp = 12 V / (12/11 Ω) = 11 A.",
      "Heat produced Hp = Ip² * Rp * t = (11 A)² * (12/11 Ω) * 120 s = 11 * 12 * 120 = 15840 J.",
    ],
    finalAnswer: "Series: R_s = 2+4+6 = 12 Ω.\nI_s = V/R_s = 12/12 = 1 A.\nHeat H_s = I²Rt = 1²×12×120 = 1440 J.\nParallel: 1/R_p = 1/2 + 1/4 + 1/6 = (6+3+2)/12 = 11/12 ⇒ R_p = 12/11 Ω ≈ 1.09 Ω.\nI_p = 12 / (12/11) = 11 A.\nH_p = I²R_p t ≈ 11²×(12/11)×120 ≈ 11×12×120 = 15840 J.",
  },

  // ================================================================
  // MAGNETIC EFFECTS OF ELECTRIC CURRENT
  // ================================================================

  {
    id: "2026-ME-MCQ-01",
    topicKey: "MagneticEffects",
    subtopic: "Field Lines & Right-hand Rule",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The direction of magnetic field around a straight current-carrying conductor can be found by:",
    options: [
      "Right-hand thumb rule",
      "Left-hand thumb rule",
      "Fleming’s left-hand rule",
      "Fleming’s right-hand rule",
    ],
    answer: "Right-hand thumb rule",
    explanation:
      "Right-hand thumb rule gives direction of field lines around straight conductor.",
    policyTag: "Right-hand rule MCQ",
    solutionSteps: [
      "The direction of the magnetic field around a straight current-carrying conductor is determined by a specific rule.",
      "This rule relates the direction of current flow to the direction of the magnetic field lines.",
      "The Right-hand thumb rule states that if the thumb points in the direction of current, the curled fingers indicate the magnetic field direction.",
    ],
    finalAnswer: "Right-hand thumb rule",
  },

  {
    id: "2026-ME-SA-02",
    topicKey: "MagneticEffects",
    subtopic: "Magnetic Field Lines",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Draw magnetic field lines around a bar magnet. Write any two properties of magnetic field lines.",
    answer:
      "Diagram showing lines emerging from north pole and entering south pole with density higher near poles.\nProperties: (i) They emerge from N and enter at S pole. (ii) They never intersect each other. (iii) Closer lines indicate stronger field (any two).",
    explanation:
      "Field lines represent direction and strength of magnetic field; non-crossing is key property.",
    policyTag: "Field lines diagram",
    solutionSteps: [
      "Draw a bar magnet. Show magnetic field lines emerging from the North pole and entering the South pole.",
      "Ensure the lines form continuous closed loops and are denser near the poles, indicating a stronger field.",
      "Property 1: Magnetic field lines emerge from the North pole and enter the South pole outside the magnet.",
      "Property 2: Magnetic field lines never intersect each other.",
    ],
    finalAnswer: "Diagram showing lines emerging from north pole and entering south pole with density higher near poles.\nProperties: (i) They emerge from N and enter at S pole. (ii) They never intersect each other. (iii) Closer lines indicate stronger field (any two).",
  },

  {
    id: "2026-ME-SA-03",
    topicKey: "MagneticEffects",
    subtopic: "Electric Motor",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "State the principle of an electric motor. Draw a labelled diagram of a simple electric motor.",
    answer:
      "Principle: A current-carrying conductor placed in a magnetic field experiences a force. Diagram should show coil, magnets, split ring commutator, brushes, and direction of current and motion.",
    explanation:
      "Boards look for principle statement plus neat labelled diagram.",
    policyTag: "Motor principle + diagram",
    solutionSteps: [
      "Principle of an electric motor: A current-carrying conductor placed in a magnetic field experiences a force.",
      "This force causes the conductor to move, converting electrical energy into mechanical energy.",
      "The labelled diagram should include a rectangular coil, strong permanent magnets (N and S poles), a split ring commutator, and carbon brushes.",
      "Clearly label the direction of current flow in the coil and the resulting direction of rotation or motion.",
    ],
    finalAnswer: "Principle: A current-carrying conductor placed in a magnetic field experiences a force. Diagram should show coil, magnets, split ring commutator, brushes, and direction of current and motion.",
  },

  {
    id: "2026-ME-CASE-04",
    topicKey: "MagneticEffects",
    subtopic: "Electromagnetic Induction",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A coil of wire is connected to a galvanometer. When a bar magnet is quickly pushed into the coil, the galvanometer shows a deflection.\n(i) Name the phenomenon involved.\n(ii) What happens when the magnet is withdrawn from the coil?\n(iii) On what factors does the magnitude of induced current depend?\n(iv) Name one device that works on the principle of this phenomenon.",
    answer:
      "(i) Electromagnetic induction (EMI).\n(ii) The galvanometer shows deflection in the opposite direction (current reverses).\n(iii) Speed of motion, number of turns in the coil, strength of magnet, and area of coil.\n(iv) Generator/dynamo.",
    explanation:
      "Standard EMI case-based question connecting observation with principle and applications.",
    policyTag: "EMI case-study",
    solutionSteps: [
      "The phenomenon involved when a magnet is moved relative to a coil, inducing current, is Electromagnetic Induction.",
      "When the magnet is withdrawn from the coil, the galvanometer shows deflection in the opposite direction, indicating a reversal of induced current.",
      "The magnitude of induced current depends on the speed of relative motion between the magnet and the coil.",
      "It also depends on the number of turns in the coil, the strength of the magnet, and the area of the coil.",
      "An electric generator (or dynamo) is a device that works on the principle of electromagnetic induction.",
    ],
    finalAnswer: "(i) Electromagnetic induction (EMI).\n(ii) The galvanometer shows deflection in the opposite direction (current reverses).\n(iii) Speed of motion, number of turns in the coil, strength of magnet, and area of coil.\n(iv) Generator/dynamo.",
  },

  // ================================================================
  // EXTRA DEPTH PACK 2026 — PHYSICS & BIOLOGY HIGH-ROI TOPICS
  // Electricity, Magnetic Effects, Human Eye, Life Processes
  // ================================================================

  // ------------------------ ELECTRICITY ------------------------

  {
    id: "2026-EL-MCQ-06",
    topicKey: "Electricity",
    subtopic: "Ohm's Law & Graphs",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Understanding",
    questionText:
      "For a conductor obeying Ohm's law, the V–I graph is",
    options: [
      "a curve passing through origin",
      "a straight line not passing through origin",
      "a straight line passing through origin",
      "a parabola opening upwards",
    ],
    answer: "a straight line passing through origin",
    explanation:
      "For an ohmic conductor, V ∝ I, so the V–I graph is a straight line through the origin.",
    policyTag: "Electricity basics – V–I graph",
    solutionSteps: [
      "According to Ohm's Law, for a conductor at constant temperature, the potential difference (V) across its ends is directly proportional to the current (I) flowing through it (V = IR).",
      "Since V is directly proportional to I, the V-I graph will be a straight line.",
      "As V=0 when I=0, this straight line must pass through the origin.",
    ],
    finalAnswer: "a straight line passing through origin",
  },

  {
    id: "2026-EL-SA-04b",
    topicKey: "Electricity",
    subtopic: "Resistors in Series & Parallel",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Two resistors of 3 Ω and 6 Ω are connected in series to a 9 V battery. Calculate the total current in the circuit.",
    answer:
      "R_total = 3 Ω + 6 Ω = 9 Ω; I = V / R = 9 V / 9 Ω = 1 A.",
    explanation:
      "In series, resistances add. Use I = V / R with the equivalent resistance.",
    policyTag: "Electricity numericals – series combination",
    solutionSteps: [
      "In a series combination, total resistance R_total = R1 + R2.",
      "Substitute R1 = 3 Ω and R2 = 6 Ω: R_total = 3 + 6 = 9 Ω.",
      "Apply Ohm's law: I = V / R_total = 9 V / 9 Ω.",
      "Therefore, total current I = 1 A.",
    ],
    finalAnswer: "R_total = 3 Ω + 6 Ω = 9 Ω; I = V / R = 9 V / 9 Ω = 1 A.",
  },

  {
    id: "2026-EL-SA-05b",
    topicKey: "Electricity",
    subtopic: "Power of an Appliance",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "An electric bulb is rated 60 W, 220 V. Calculate (a) the current drawn by the bulb, (b) the resistance of its filament.",
    answer:
      "P = VI ⇒ I = P / V = 60 / 220 ≈ 0.27 A; R = V / I ≈ 220 / 0.27 ≈ 815 Ω.",
    explanation:
      "Use P = VI to find current, then apply Ohm's law V = IR to find resistance.",
    policyTag: "Electricity numericals – power, current, resistance",
    solutionSteps: [
      "Given: Power (P) = 60 W, Voltage (V) = 220 V.",
      "(a) Use the formula P = VI. Rearrange to find current: I = P / V.",
      "Substitute values: I = 60 W / 220 V = 0.2727 A (approx 0.27 A).",
      "(b) Use Ohm's law: V = IR, so R = V / I.",
      "Substitute values: R = 220 V / 0.2727 A = approx 807 Ω (or using R = V²/P = 220²/60 = 807 Ω).",
      "Therefore, current drawn ≈ 0.27 A and resistance of filament ≈ 807 Ω.",
    ],
    finalAnswer: "P = VI ⇒ I = P / V = 60 / 220 ≈ 0.27 A; R = V / I ≈ 220 / 0.27 ≈ 815 Ω.",
  },

  {
    id: "2026-EL-CS-01",
    topicKey: "Electricity",
    subtopic: "Household Circuits & Safety Devices",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `Ravi’s house uses an electric iron of 750 W, a fan of 75 W and two LED bulbs of 15 W each on a 220 V supply.
(a) Calculate the total current drawn when all appliances are ON.
(b) Why is it important to use proper rating of fuse in this circuit?`,
    answer:
      `Total power = 750 + 75 + 15 + 15 = 855 W.
I_total = P_total / V = 855 / 220 ≈ 3.9 A.
A proper fuse rating slightly above 3.9 A is used so it melts if current exceeds safe limit, protecting appliances and preventing fire.`,
    explanation:
      "Add power ratings to get total power, use P = VI to find current and link fuse rating with overheating protection.",
    policyTag: "Electricity case-study – household circuits & safety",
    solutionSteps: [
      "(a) Calculate total power: P_iron = 750 W, P_fan = 75 W, P_bulbs = 2 * 15 W = 30 W.",
      "Total power (P_total) = 750 W + 75 W + 30 W = 855 W.",
      "Total current (I_total) = P_total / V = 855 W / 220 V ≈ 3.886 A (approx 3.9 A).",
      "(b) A fuse is a safety device designed to protect electrical circuits and appliances from excessive current.",
      "Using a proper rating of fuse ensures that it melts and breaks the circuit if the current exceeds a safe limit.",
      "This prevents damage to appliances, short circuits, and potential fire hazards caused by overheating.",
    ],
    finalAnswer: "Total power = 750 + 75 + 15 + 15 = 855 W.\nI_total = P_total / V = 855 / 220 ≈ 3.9 A.\nA proper fuse rating slightly above 3.9 A is used so it melts if current exceeds safe limit, protecting appliances and preventing fire.",
  },

  // ------------------------ MAGNETIC EFFECTS OF CURRENT ------------------------

  {
    id: "2026-MG-MCQ-05",
    topicKey: "MagneticEffects",
    subtopic: "Field Lines around a Straight Conductor",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "The direction of magnetic field lines around a straight current-carrying conductor is given by",
    options: [
      "Right-hand thumb rule",
      "Fleming's right-hand rule",
      "Fleming's left-hand rule",
      "Clock rule",
    ],
    answer: "Right-hand thumb rule",
    explanation:
      "Right-hand thumb rule gives the direction of magnetic field around a current-carrying straight conductor.",
    policyTag: "Magnetic effects basics – direction rules",
    solutionSteps: [
      "The direction of magnetic field lines around a straight current-carrying conductor is given by the Right-hand thumb rule.",
      "This rule states that if the thumb points in the direction of current, the curled fingers indicate the direction of the magnetic field lines.",
    ],
    finalAnswer: "Right-hand thumb rule",
  },

  {
    id: "2026-MG-SA-03",
    topicKey: "MagneticEffects",
    subtopic: "Force on a Current-Carrying Conductor",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "State Fleming's left-hand rule. How does this rule help in understanding the working of an electric motor?",
    answer:
      `Fleming's left-hand rule: Stretch the thumb, forefinger and middle finger mutually perpendicular to each other; forefinger indicates magnetic field, middle finger current, and thumb gives the direction of force on the conductor.
In a motor, this rule predicts the direction of force on the current-carrying coil placed in a magnetic field, explaining its rotation.`,
    explanation:
      "The rule connects direction of current, magnetic field and force, which is the basic principle behind motor rotation.",
    policyTag: "Magnetic effects – conductor in magnetic field, motor principle",
    solutionSteps: [
      "Fleming's left-hand rule states: Stretch the thumb, forefinger, and middle finger of the left hand so that they are mutually perpendicular.",
      "If the forefinger points in the direction of the magnetic field and the middle finger points in the direction of the current,",
      "then the thumb will point in the direction of the force or motion experienced by the conductor.",
      "In an electric motor, a current-carrying coil is placed in a magnetic field. This rule helps determine the direction of the force acting on the coil.",
      "This force causes the coil to rotate continuously, thereby explaining the working principle of an electric motor.",
    ],
    finalAnswer: "Fleming's left-hand rule states: Stretch the thumb, forefinger, and middle finger of the left hand so that they are mutually perpendicular. If the forefinger points in the direction of the magnetic field and the middle finger points in the direction of the current, then the thumb will point in the direction of the force or motion experienced by the conductor. This rule helps in understanding the working of an electric motor by determining the direction of the force acting on the current-carrying coil placed in a magnetic field, which causes the coil to rotate.",
  },

  {
    id: "2026-MG-SA-04",
    topicKey: "MagneticEffects",
    subtopic: "Electromagnets & Uses",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "What is an electromagnet? Mention any two factors on which the strength of an electromagnet depends. State one use of electromagnets in daily life.",
    answer:
      `An electromagnet is a temporary magnet produced by passing current through a coil wound on a soft iron core.
Its strength depends on: (i) number of turns in the coil, (ii) magnitude of current, and (iii) nature of core (soft iron is best).
Use: electric bell, crane to lift scrap iron, etc.`,
    explanation:
      "Links definition with controlling factors and connects concept to a real-life application.",
    policyTag: "Magnetic effects – electromagnets in daily life",
    solutionSteps: [
      "An electromagnet is a temporary magnet produced when electric current flows through a coil of wire wound around a soft iron core.",
      "The strength of an electromagnet depends on the number of turns in the coil; more turns lead to a stronger electromagnet.",
      "It also depends on the magnitude of current flowing through the coil; a higher current results in a stronger electromagnet.",
      "Another factor is the nature of the core material; using a soft iron core significantly increases strength.",
      "One common use of electromagnets in daily life is in electric bells.",
    ],
    finalAnswer: "An electromagnet is a temporary magnet produced when electric current flows through a coil of wire wound around a soft iron core. Its strength depends on: 1. The number of turns in the coil. 2. The magnitude of current flowing through the coil. 3. The nature of the core material. One use of electromagnets in daily life is in electric bells.",
  },

  {
    id: "2026-MG-CS-01",
    topicKey: "MagneticEffects",
    subtopic: "Domestic Use of Electromagnets",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `An automated recycling plant uses large electromagnets to separate iron objects from other waste materials.
(a) Why are electromagnets preferred over permanent magnets in such cranes?
(b) Suggest two safety precautions workers should take while working near such electromagnets.`,
    answer:
      `(a) Electromagnets can be switched ON and OFF and their strength can be controlled by changing current; this allows easy release and better control of iron scrap compared to permanent magnets.
(b) Workers should avoid standing under suspended loads, ensure power is switched off before maintenance, and keep electronic devices away from strong magnetic fields (any two).`,
    explanation:
      "Shows advantages of electromagnets (controllability) and connects with safety in industrial use.",
    policyTag: "Magnetic effects case-study – electromagnets in industry",
    solutionSteps: [
      "Identify the working principle: Electromagnets are temporary magnets formed when current flows through a coil.",
      "Explain the application: In devices like an electric bell, an electromagnet attracts an armature when current flows.",
      "Describe the mechanism: This attraction causes a hammer to strike a gong, producing sound.",
      "Detail the circuit break: The armature movement simultaneously breaks the circuit, de-energizing the electromagnet.",
      "Explain re-establishment: The armature springs back, re-establishing the circuit, and the cycle repeats.",
      "Mention factors affecting strength: The strength depends on the number of turns, current, and core material.",
    ],
    finalAnswer: "Electromagnets are temporary magnets created by passing current through a coil. They are used in devices like electric bells, where current energizes the electromagnet, attracting an armature. This causes a hammer to strike a gong, producing sound. Simultaneously, the circuit is broken, de-energizing the electromagnet and allowing the armature to spring back, re-establishing the circuit and repeating the process. The strength of an electromagnet can be increased by increasing the number of turns in the coil, increasing the current, or using a soft iron core.",
  },

  // ------------------------ HUMAN EYE & THE COLOURFUL WORLD ------------------------

  {
    id: "2026-HE-MCQ-05",
    topicKey: "HumanEyeAndColourfulWorld",
    subtopic: "Defects of Vision",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which lens is used to correct myopia (short-sightedness)?",
    options: [
      "Convex lens",
      "Concave lens",
      "Cylindrical lens only",
      "Bifocal lens only",
    ],
    answer: "Concave lens",
    explanation:
      "Myopia is corrected using a concave (diverging) lens which helps form the image on the retina.",
    policyTag: "Human eye – defects and correction",
    solutionSteps: [
      "Myopia (short-sightedness) is a defect where the eye lens converges light too strongly, forming the image in front of the retina.",
      "To correct this, a diverging lens is required to spread out the light rays before they enter the eye, shifting the image back onto the retina.",
      "A concave lens is a diverging lens, hence it is used to correct myopia.",
    ],
    finalAnswer: "Concave lens",
  },

  {
      id: "2026-HE-SA-03",
      topicKey: "HumanEyeAndColourfulWorld",
      subtopic: "Persistence of Vision & Power of Accommodation",
      kind: "Short",
      section: "B",
      marks: 2,
      difficulty: "Medium",
      bloomSkill: "Understanding",
      questionText:
        `(a) What is persistence of vision?
  (b) How does the eye adjust its focal length to see objects at different distances?`,
      answer:
        `(a) Persistence of vision is the time (about 1/16 s) for which an image continues to be seen by the eye even after the object is removed.
  (b) The ciliary muscles change the curvature of the eye lens to adjust its focal length (power of accommodation).`,
      explanation:
        "Tests basic understanding of eye's functioning for moving pictures and focusing at different distances.",
      policyTag: "Human eye – basic physiology and accommodation",
      solutionSteps: [
        "(a) Persistence of vision: the image formed on the retina persists for about 1/16 s after the object is removed.",
        "This property is used in cinema — rapid display of frames creates the illusion of continuous motion.",
        "(b) Power of accommodation: the ability of the eye lens to adjust its focal length to see objects at different distances.",
        "The ciliary muscles contract (near objects) or relax (far objects), changing the curvature and hence focal length of the eye lens.",
      ],
      finalAnswer: "(a) Persistence of vision: retinal image retained ~1/16 s after object removed. (b) Ciliary muscles adjust lens curvature to change focal length.",
    },

  {
    id: "2026-HE-SA-04",
    topicKey: "HumanEyeAndColourfulWorld",
    subtopic: "Atmospheric Refraction & Twinkling",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Explain why stars appear to twinkle but planets do not. Name the phenomenon responsible for the apparent twinkling.",
    answer:
      `Star light passes through layers of atmosphere having different densities and refractive indices. These layers keep changing due to air motion, so the apparent position and brightness of a star keep changing, making it appear to twinkle. Planets have larger apparent size and the variations average out, so they do not twinkle.
The phenomenon responsible is atmospheric refraction.`,
    explanation:
      "Links atmospheric refraction with changing apparent position and compares point-like stars with extended planets.",
    policyTag: "Human eye – atmospheric refraction, twinkling of stars",
    solutionSteps: [
      "Stars appear as point sources of light. Their light passes through many atmospheric layers with varying refractive indices.",
      "As these layers shift due to air currents, the apparent position and brightness of the star changes continuously — this is twinkling.",
      "Planets have a much larger apparent disc size. The atmospheric variations average out across the disc, so their brightness remains steady — planets do not twinkle.",
      "The phenomenon responsible for the apparent twinkling of stars is atmospheric refraction.",
    ],
    finalAnswer: "Stars are point sources; atmospheric refraction causes random shifts in apparent position and brightness — twinkling. Planets are extended sources, so variations average out. Phenomenon: atmospheric refraction.",
  },

  {
    id: "2026-HE-CS-01",
    topicKey: "HumanEyeAndColourfulWorld",
    subtopic: "Applications of Dispersion & Scattering",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `During a science exhibition, students explain that the sky appears blue at noon but reddish at sunrise and sunset.
(a) Name the phenomenon responsible for the blue colour of the sky.
(b) Why does the Sun appear reddish at sunrise and sunset?
(c) State one application of this phenomenon other than the colour of the sky.`,
    answer:
      `(a) Scattering of sunlight by molecules and fine dust particles.
(b) During sunrise and sunset, sunlight travels a longer path through the atmosphere; blue light is scattered away and red light (least scattered) reaches the observer, so the Sun appears reddish.
(c) Example: bluish colour of smoke, danger signals painted red (any one linked with scattering).`,
    explanation:
      "Connects scattering with colour of the sky and reddish appearance of the Sun, then asks for one more application.",
    policyTag: "Human eye – scattering of light, colour of sky and Sun",
    solutionSteps: [
      "The Earth's atmosphere contains air molecules and fine dust particles.",
      "Sunlight, which is a mixture of different colours (VIBGYOR), enters the atmosphere.",
      "Rayleigh scattering occurs, where shorter wavelengths (like blue light) are scattered more effectively than longer wavelengths (like red light).",
      "For the blue sky: During the day, blue light is scattered in all directions by atmospheric particles, making the sky appear blue.",
      "For the red sun at sunrise/sunset: Sunlight travels a much longer distance through the atmosphere.",
      "Most of the blue light is scattered away, allowing the longer wavelengths (red and orange) to reach the observer directly, making the sun appear reddish.",
    ],
    finalAnswer: "(a) Scattering of sunlight by molecules and fine dust particles.\n(b) During sunrise and sunset, sunlight travels a longer path through the atmosphere; blue light is scattered away and red light (least scattered) reaches the observer, so the Sun appears reddish.\n(c) Example: bluish colour of smoke, danger signals painted red (any one linked with scattering).",
  },

  // ------------------------ LIFE PROCESSES ------------------------

  {
    id: "2026-LP-MCQ-05",
    topicKey: "LifeProcesses",
    subtopic: "Respiration",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "In which part of the cell does aerobic respiration (release of energy) mainly take place?",
    options: ["Nucleus", "Cytoplasm", "Mitochondria", "Ribosomes"],
    answer: "Mitochondria",
    explanation:
      "Mitochondria are known as the powerhouse of the cell and are the main site of aerobic respiration.",
    policyTag: "Life processes – basics of respiration",
    solutionSteps: [
      "Aerobic respiration is the cellular process that releases energy using oxygen.",
      "Mitochondria are specialized organelles often referred to as the 'powerhouses' of the cell.",
      "Therefore, the main site for aerobic respiration and energy release in the cell is the mitochondria.",
    ],
    finalAnswer: "Mitochondria",
  },

  {
    id: "2026-LP-SA-03b",
    topicKey: "LifeProcesses",
    subtopic: "Human Circulatory System",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Why is double circulation of blood necessary in human beings?",
    answer:
      "Double circulation (pulmonary and systemic) ensures complete separation of oxygenated and deoxygenated blood. This maintains a high level of oxygen supply to body tissues, which is essential for efficient energy production in warm-blooded animals like humans.",
    explanation:
      "Focuses on the advantage of separate circuits for efficient oxygen supply and temperature regulation.",
    policyTag: "Life processes – circulation and transport of substances",
    solutionSteps: [
      "Double circulation means blood passes through the heart twice in one complete circuit — once via the pulmonary circuit and once via the systemic circuit.",
      "The pulmonary circuit carries deoxygenated blood from the heart to the lungs for oxygenation, and returns oxygenated blood to the heart.",
      "The systemic circuit then pumps this oxygenated blood from the heart to all body tissues.",
      "This separation ensures oxygenated and deoxygenated blood never mix, maintaining a consistently high oxygen supply to tissues.",
      "High oxygen supply is essential for efficient aerobic respiration and energy release, which warm-blooded animals like humans require to maintain body temperature.",
    ],
    finalAnswer: "Double circulation (pulmonary and systemic) ensures complete separation of oxygenated and deoxygenated blood. This maintains a high level of oxygen supply to body tissues, which is essential for efficient energy production in warm-blooded animals like humans.",
  },

  {
    id: "2026-LP-SA-04b",
    topicKey: "LifeProcesses",
    subtopic: "Excretion in Humans",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Draw a labelled diagram of the human excretory system (outline) and write one function of kidneys.",
    answer:
      `Diagram should show kidneys, ureters, urinary bladder and urethra.
Function of kidneys: filtration of blood to remove nitrogenous wastes like urea and regulation of water and salt balance (any relevant function).`,
    explanation:
      "Combines diagram-based recall with functional understanding of kidneys.",
    policyTag: "Life processes – excretion and homeostasis",
    solutionSteps: [
      "Draw a neat, well-proportioned outline diagram of the human excretory system.",
      "Label the two kidneys (bean-shaped organs located on either side of the vertebral column).",
      "Label the two ureters, which carry urine from the kidneys to the urinary bladder.",
      "Label the urinary bladder, which temporarily stores urine.",
      "Label the urethra, through which urine is expelled from the body.",
      "Function of kidneys: The kidneys filter blood to remove nitrogenous waste products like urea, and also regulate water and mineral salt balance in the body.",
    ],
    finalAnswer: "Diagram should show kidneys, ureters, urinary bladder and urethra. Function of kidneys: filtration of blood to remove nitrogenous wastes like urea and regulation of water and salt balance.",
  },

  {
    id: "2026-LP-CS-01",
    topicKey: "LifeProcesses",
    subtopic: "Nutrition & Lifestyle Diseases",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `Rita prefers fast food and aerated drinks. She often skips breakfast and complains of fatigue.
(a) Which type of malnutrition is she likely to suffer from – undernourishment or obesity? Justify.
(b) Suggest two dietary changes and one lifestyle change to improve her health.`,
    answer:
      `(a) She may suffer from obesity with micronutrient deficiency because fast foods are high in fats and sugars but poor in vitamins and minerals.
(b) Dietary changes: include more fruits, vegetables and whole grains; reduce fried and sugary foods. Lifestyle change: regular physical exercise / sports / walking, etc.`,
    explanation:
      "Links unbalanced diet with lifestyle diseases and asks for corrective steps, connecting textbook concepts with daily life.",
    policyTag: "Life processes case-study – nutrition and lifestyle",
    solutionSteps: [
      "(a) Rita is likely to suffer from obesity with micronutrient deficiency.",
      "Fast foods are high in fats, sugars, and calories but low in essential vitamins and minerals.",
      "Excess caloric intake leads to fat accumulation (obesity), while deficiency of micronutrients causes fatigue and poor health.",
      "(b) Dietary change 1: Include more fruits, vegetables, whole grains, and legumes in daily meals.",
      "Dietary change 2: Reduce or avoid fried foods, aerated drinks, and processed/junk food.",
      "Lifestyle change: Engage in regular physical exercise such as walking, jogging, or sports for at least 30 minutes a day.",
    ],
    finalAnswer: "(a) She may suffer from obesity with micronutrient deficiency because fast foods are high in fats and sugars but poor in vitamins and minerals.\n(b) Dietary: include fruits/vegetables, reduce junk food. Lifestyle: regular physical exercise.",
  },

  // ================================================================
  // DEPTH PACK 2026 — REMAINING SCIENCE TOPICS
  // Acids/Bases, Metals, Carbon Compounds, Control & Coordination,
  // Reproduction, Heredity, Our Environment, core Chemistry
  // ================================================================

  // ------------------------ ACIDS, BASES & SALTS ------------------------

  {
    id: "2026-AB-SA-06",
    topicKey: "AcidsBasesSalts",
    subtopic: "pH Scale & Indicators",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Explain why it is dangerous to touch the solution of a strong acid or strong base with bare hands, even if its pH value is close to 7.",
    answer:
      "A solution of strong acid/base may have been heavily diluted to show pH close to 7, but it still contains corrosive species which can damage the skin. pH value alone does not tell us about the nature of solute or its corrosive action.",
    explanation:
      "Tests understanding that pH is related to H⁺ concentration but safety depends also on the nature and concentration of the solute.",
    policyTag: "Acids, bases & salts – safety and pH concept",
    solutionSteps: [
      "A strong acid or strong base, even when highly diluted, retains its fundamental corrosive chemical nature.",
      "Dilution reduces the concentration of H+ or OH- ions, causing the pH value to shift closer to 7.",
      "However, the specific corrosive molecules or ions of the strong acid/base are still present in the solution.",
      "These inherent corrosive species can cause severe chemical burns and damage to the skin upon contact, irrespective of the high dilution.",
    ],
    finalAnswer: "A solution of strong acid/base may have been heavily diluted to show pH close to 7, but it still contains corrosive species which can damage the skin. pH value alone does not tell us about the nature of solute or its corrosive action.",
  },

  {
    id: "2026-AB-CS-02",
    topicKey: "AcidsBasesSalts",
    subtopic: "Everyday Salts & Their Uses",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `A chemistry teacher brings samples labelled washing soda, baking soda and Plaster of Paris (POP).
(a) Write the chemical formulas of each.
(b) Mention one use of each in everyday life.
(c) Why should POP bandages be used carefully?`,
    answer:
      `(a) Washing soda: Na₂CO₃·10H₂O, baking soda: NaHCO₃, POP: CaSO₄·½H₂O.
(b) Washing soda: used in detergents / softening hard water; baking soda: antacid / baking; POP: making casts, toys, statues.
(c) POP sets quickly with evolution of heat, so it should not be applied directly on skin in thick layers as it may cause burns or restrict blood circulation.`,
    explanation:
      "Connects formulas and common uses of important salts and asks for reasoning linked to POP setting property.",
    policyTag: "Acids, bases & salts – important salts and applications",
    solutionSteps: [
      "Question text is missing, cannot provide solution steps.",
    ],
    finalAnswer: "Question text is missing, cannot provide an answer.",
  },

  // ------------------------ METALS & NON-METALS ------------------------

  {
    id: "2026-MN-SA-05",
    topicKey: "MetalsNonMetals",
    subtopic: "Reactivity Series & Displacement",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Why does iron nail get coated with a reddish brown layer when kept dipped in copper sulphate solution? Write the balanced chemical equation for this reaction.",
    answer:
      `Iron is more reactive than copper, so it displaces copper from copper sulphate solution. Brown deposit of copper forms on iron and the blue colour of solution fades.
Fe + CuSO₄ → FeSO₄ + Cu`,
    explanation:
      "Checks use of reactivity series to predict displacement reactions and write equations.",
    policyTag: "Metals & non-metals – displacement reactions and reactivity",
    solutionSteps: [
      "Iron is more reactive than copper, as per the reactivity series.",
      "When iron nail is dipped in copper sulphate solution, iron displaces copper from the solution.",
      "The displaced copper metal gets deposited on the iron nail, forming a reddish-brown layer.",
      "The balanced chemical equation is: Fe(s) + CuSO4(aq) -> FeSO4(aq) + Cu(s).",
    ],
    finalAnswer: "Iron is more reactive than copper. When an iron nail is dipped in copper sulphate solution, iron displaces copper from the solution. The displaced copper gets deposited on the iron nail as a reddish-brown layer. The balanced chemical equation for this reaction is: Fe(s) + CuSO4(aq) -> FeSO4(aq) + Cu(s).",
  },

  {
    id: "2026-MN-CS-02",
    topicKey: "MetalsNonMetals",
    subtopic: "Corrosion & Prevention",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `A bridge made of iron beams is painted regularly.
(a) Name the phenomenon which spoils the iron if it is left unprotected.
(b) State two conditions necessary for this phenomenon.
(c) Suggest two methods (other than painting) to protect iron from this damage.`,
    answer:
      `(a) Corrosion / rusting of iron.
(b) Presence of moisture (water) and air (oxygen).
(c) Methods: galvanisation, oiling/greasing, alloying to form stainless steel, etc. (any two).`,
    explanation:
      "Relates real-life example of iron structures with the concept of rusting and its prevention methods.",
    policyTag: "Metals & non-metals – corrosion and its prevention",
    solutionSteps: [
      "Question text is missing, cannot provide solution steps.",
    ],
    finalAnswer: "Question text is missing, cannot provide an answer.",
  },

  // ------------------------ CARBON & ITS COMPOUNDS ------------------------

  {
    id: "2026-CC-SA-06",
    topicKey: "CarbonCompounds",
    subtopic: "Homologous Series & Nomenclature",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "What is a homologous series? State any two characteristics of a homologous series of carbon compounds. Give the molecular formula of the third and fourth members of the homologous series whose first member is CH₃–OH.",
    answer:
      `A homologous series is a group of organic compounds having the same functional group and similar chemical properties in which successive members differ by –CH₂– unit and 14 u in molecular mass.
Characteristics: same functional group; show gradation in physical properties; differ by –CH₂–, etc. (any two).
Series is of alcohols: CH₃–OH, C₂H₅–OH, C₃H₇–OH, C₄H₉–OH. So 3rd and 4th members: C₃H₇–OH and C₄H₉–OH.`,
    explanation:
      "Combines definition, properties and pattern of homologous series with simple structural reasoning.",
    policyTag: "Carbon compounds – homologous series and nomenclature",
    solutionSteps: [
      "A homologous series is a series of organic compounds with the same functional group and similar chemical properties.",
      "Characteristic 1: All members of a homologous series share the same general formula.",
      "Characteristic 2: Successive members differ by a -CH2- group and 14 amu in molecular mass.",
      "The first member CH₃–OH is methanol, belonging to the alcohol homologous series (general formula CnH2n+1OH).",
      "The third member is propanol (C₃H₇OH) and the fourth member is butanol (C₄H₉OH).",
    ],
    finalAnswer: "A homologous series is a group of organic compounds having the same functional group and similar chemical properties in which successive members differ by –CH₂– unit and 14 u in molecular mass.\nCharacteristics: same functional group; show gradation in physical properties; differ by –CH₂–, etc. (any two).\nSeries is of alcohols: CH₃–OH, C₂H₅–OH, C₃H₇–OH, C₄H₉–OH. So 3rd and 4th members: C₃H₇–OH and C₄H₉–OH.",
  },

  {
    id: "2026-CC-CS-02",
    topicKey: "CarbonCompounds",
    subtopic: "Cleansing Action of Soaps & Detergents",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `A student washes an oily handkerchief using hard water and ordinary soap but finds grey scum on the cloth. Later the teacher asks her to use a synthetic detergent.
(a) Why does scum form with soap in hard water?
(b) Why are detergents more effective in hard water?
(c) Mention one disadvantage of using detergents extensively.`,
    answer:
      `(a) Calcium and magnesium ions of hard water react with soap to form insoluble calcium/magnesium salts (scum).
(b) Detergents are sodium salts of sulphonic acids and form soluble salts with Ca²⁺/Mg²⁺, so they do not form scum and clean better in hard water.
(c) Detergents are non-biodegradable and cause water pollution / foam in rivers, etc.`,
    explanation:
      "Uses textbook discussion of soaps, detergents and hard water to reason about scum formation and environmental issues.",
    policyTag: "Carbon compounds – soaps, detergents and environment",
    solutionSteps: [
      "The question text for this case-based question is missing.",
      "Please provide the question text to generate the appropriate solution steps and answer.",
    ],
    finalAnswer: "(a) Calcium and magnesium ions of hard water react with soap to form insoluble calcium/magnesium salts (scum).\n(b) Detergents are sodium salts of sulphonic acids and form soluble salts with Ca²⁺/Mg²⁺, so they do not form scum and clean better in hard water.\n(c) Detergents are non-biodegradable and cause water pollution / foam in rivers, etc.",
  },

  // ------------------------ CONTROL & COORDINATION ------------------------

  {
    id: "2026-CCN-SA-05",
    topicKey: "ControlAndCoordination",
    subtopic: "Reflex Actions & Nervous System",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "What is a reflex action? Give one example. Why are reflex actions important for the body?",
    answer:
      `Reflex action is a sudden, automatic and involuntary response to a stimulus controlled by the spinal cord, e.g. withdrawing hand on touching a hot object.
They protect the body from injury and enable quick responses without involving the thinking brain.`,
    explanation:
      "Checks understanding of reflex pathway and its protective function.",
    policyTag: "Control & coordination – reflex actions and survival",
    solutionSteps: [
      "A reflex action is a sudden, involuntary, and automatic response of the body to a stimulus.",
      "Example: Immediate withdrawal of hand upon touching a hot object.",
      "Reflex actions are important as they provide quick responses to dangerous stimuli, protecting the body from harm.",
      "They allow for rapid survival responses without conscious thought, saving time in critical situations.",
    ],
    finalAnswer: "Reflex action is a sudden, automatic and involuntary response to a stimulus controlled by the spinal cord, e.g. withdrawing hand on touching a hot object.\nThey protect the body from injury and enable quick responses without involving the thinking brain.",
  },

  {
    id: "2026-CCN-CS-02",
    topicKey: "ControlAndCoordination",
    subtopic: "Hormones in Plants & Animals",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `A farmer uses synthetic plant hormones to increase the yield of his crop. His neighbour warns him about excessive use of chemicals.
(a) Name any two plant hormones and state one function of each.
(b) How can hormones in animals bring about long-term changes in the body?
(c) Why should hormones be used carefully in agriculture and medicine?`,
    answer:
      `(a) Auxin – cell elongation / rooting; gibberellin – stem elongation / breaking seed dormancy; cytokinin – cell division; (any two with functions).
(b) Animal hormones like thyroxine, insulin, sex hormones regulate metabolism, growth and reproduction; long-term over/under secretion leads to disorders.
(c) Excessive hormones may enter food chains, disturb ecosystems and cause health problems; in medicine wrong dose can cause serious side effects.`,
    explanation:
      "Connects roles of hormones in plants and animals with real-life concerns over their excessive or improper use.",
    policyTag: "Control & coordination – hormones and regulation",
    solutionSteps: [
      "Identify Auxin as the plant hormone causing the plant to bend towards light (phototropism).",
      "State Auxin's function: it promotes cell elongation in shoots, leading to bending.",
      "Identify Growth hormone deficiency (from Pituitary gland) as the cause of short stature.",
      "Identify Goitre as the swollen neck condition, caused by Iodine deficiency.",
    ],
    finalAnswer: "(a) Auxin (b) Promotes cell elongation in shoots, causing the plant to bend towards light (phototropism). (c) Growth hormone deficiency; Pituitary gland. (d) Goitre; Iodine deficiency.",
  },

  // ------------------------ REPRODUCTION ------------------------

  {
    id: "2026-RP-SA-06",
    topicKey: "Reproduction",
    subtopic: "Asexual vs Sexual Reproduction",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Differentiate between asexual and sexual reproduction on any two points. Give one example of each.",
    answer:
      `Asexual reproduction involves a single parent and produces genetically identical offspring, e.g. binary fission in Amoeba, budding in yeast.
Sexual reproduction involves two parents and fusion of gametes leading to variation, e.g. reproduction in humans / flowering plants.`,
    explanation:
      "Summarises key textbook differences and typical examples.",
    policyTag: "Reproduction – comparison of modes and examples",
    solutionSteps: [
      "State that asexual reproduction involves one parent, while sexual reproduction involves two parents.",
      "Mention that asexual reproduction does not involve gametes, but sexual reproduction involves gamete formation and fusion.",
      "Give budding in Hydra as an example of asexual reproduction.",
      "Give humans as an example of sexual reproduction.",
    ],
    finalAnswer: "Asexual Reproduction:\n1. Involves a single parent.\n2. Does not involve the formation and fusion of gametes.\nExample: Budding in Hydra.\nSexual Reproduction:\n1. Involves two parents.\n2. Involves the formation and fusion of gametes.\nExample: Humans.",
  },

  // ------------------------ HEREDITY & EVOLUTION ------------------------

  {
    id: "2026-HEV-SA-05",
    topicKey: "HeredityEvolution",
    subtopic: "Mendel's Experiments",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "In a monohybrid cross between pure tall pea plants (TT) and pure dwarf pea plants (tt), what will be the phenotypic and genotypic ratios in the F₂ generation? Show the cross with a Punnett square.",
    answer:
      `F₁: all Tt (tall).
F₂ generation genotypes: TT, Tt, Tt, tt → genotypic ratio 1 TT : 2 Tt : 1 tt.
Phenotypes: 3 tall : 1 dwarf.`,
    explanation:
      "Tests application of Mendel's law of segregation using a standard monohybrid cross.",
    policyTag: "Heredity & evolution – Mendel’s monohybrid cross",
    solutionSteps: [
      "Show the P generation cross (TT x tt) and the resulting F1 generation (all Tt, Tall).",
      "Indicate the F1 self-cross (Tt x Tt) and the gametes (T, t from each parent).",
      "Draw the Punnett square for the F2 generation, showing TT, Tt, Tt, tt genotypes.",
      "State the F2 genotypic ratio as 1 TT : 2 Tt : 1 tt.",
      "State the F2 phenotypic ratio as 3 Tall : 1 Dwarf.",
    ],
    finalAnswer: "P generation: Pure Tall (TT) x Pure Dwarf (tt)\nF1 generation: All Tt (Tall)\n\nF1 self-cross: Tt x Tt\nGametes: T, t (from each F1 parent)\n\nPunnett Square for F2 generation:\n    T   t\nT  TT  Tt\nt  Tt  tt\n\nF2 Genotypic Ratio: 1 TT : 2 Tt : 1 tt\nF2 Phenotypic Ratio: 3 Tall : 1 Dwarf",
  },

  {
    id: "2026-ELEC-LA-12",
    topicKey: "Electricity",
    subtopic: "Ohm's law and resistance combinations",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "A 12 V battery is connected to a resistor network where R1 = 4 Ω is in series with a parallel combination of R2 = 6 Ω and R3 = 3 Ω. (a) Find the equivalent resistance of the circuit. (b) Find the total current from the battery. (c) Find current through R2 and R3 separately. Draw a neat circuit diagram.",
    answer:
      "(a) Parallel part: 1/Rp = 1/6 + 1/3 = 1/2 ⇒ Rp = 2 Ω. Equivalent: Req = 4 + 2 = 6 Ω. (b) Total current I = V/Req = 12/6 = 2 A. (c) Voltage across parallel branch = I×Rp = 2×2 = 4 V. Hence I2 = 4/6 = 2/3 A and I3 = 4/3 A.",
    explanation:
      "Combines series-parallel reduction with current division and explicit diagram-based presentation, matching 5-mark board style.",
    solutionSteps: [
      "Draw the circuit: R1 in series with a branch containing R2 and R3 in parallel.",
      "Calculate equivalent of parallel branch using reciprocal formula.",
      "Add R1 to get total equivalent resistance.",
      "Use Ohm's law to get total current from source.",
      "Find branch voltage and then branch currents using I = V/R.",
      "State final values with correct SI units.",
    ],
    strategyHint:
      "Always reduce the parallel block first, then solve series current, then branch currents.",
    policyTag: "Electricity 5-mark competency numerical with diagram",
    pastBoardYear: "2025",
    finalAnswer: "(a) Parallel part: 1/Rp = 1/6 + 1/3 = 1/2 ⇒ Rp = 2 Ω. Equivalent: Req = 4 + 2 = 6 Ω. (b) Total current I = V/Req = 12/6 = 2 A. (c) Voltage across parallel branch = I×Rp = 2×2 = 4 V. Hence I2 = 4/6 = 2/3 A and I3 = 4/3 A.",
  },

  {
    id: "2026-LP-LA-06",
    topicKey: "LifeProcesses",
    subtopic: "Human Digestive System",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Draw a labelled diagram of the human digestive system. Explain the role of: (i) hydrochloric acid in the stomach, (ii) bile juice in the small intestine, (iii) villi in absorption.",
    answer:
      "(i) HCl creates acidic medium, activates pepsinogen to pepsin, kills ingested bacteria. (ii) Bile juice emulsifies fats into smaller droplets for lipase action. (iii) Villi increase surface area for efficient absorption of digested food into blood.",
    explanation:
      "The digestive system has specialised structures and secretions at each stage to ensure complete digestion and absorption.",
    solutionSteps: [
      "Draw a neat, labelled diagram of the human digestive system.",
      "Explain role of HCl in the stomach.",
      "Explain role of bile juice in fat emulsification.",
      "Explain how villi aid absorption.",
      "Conclude with overall significance.",
    ],
    strategyHint: "Always start with the diagram, then explain each part asked.",
    pastBoardYear: "2023",
    policyTag: "Life Processes 5-mark digestive system",
    finalAnswer: "(i) HCl creates acidic medium, activates pepsinogen to pepsin, kills ingested bacteria. (ii) Bile juice emulsifies fats into smaller droplets for lipase action. (iii) Villi increase surface area for efficient absorption of digested food into blood.",
  },

  {
    id: "2026-LP-LA-07b",
    topicKey: "LifeProcesses",
    subtopic: "Transportation in Humans",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Draw a neat diagram of the human heart and label: (i) aorta, (ii) pulmonary artery, (iii) vena cava, (iv) left ventricle. Explain double circulation in humans and why it is necessary.",
    answer:
      "Double circulation: blood passes through the heart twice in one complete cycle — once through pulmonary circuit (heart→lungs→heart) and once through systemic circuit (heart→body→heart). It is necessary to maintain separation of oxygenated and deoxygenated blood for efficient oxygen supply to body tissues.",
    explanation:
      "Double circulation ensures that oxygenated blood does not mix with deoxygenated blood, maintaining high efficiency in warm-blooded animals.",
    solutionSteps: [
      "Draw and label the heart diagram.",
      "Define double circulation with both circuits.",
      "Explain pulmonary circulation path.",
      "Explain systemic circulation path.",
      "State why separation is advantageous.",
    ],
    strategyHint: "Use arrows to show blood flow direction in the diagram.",
    pastBoardYear: "2024",
    policyTag: "Life Processes 5-mark heart & circulation",
    finalAnswer: "Double circulation: blood passes through the heart twice in one complete cycle — once through pulmonary circuit (heart→lungs→heart) and once through systemic circuit (heart→body→heart). It is necessary to maintain separation of oxygenated and deoxygenated blood for efficient oxygen supply to body tissues.",
  },

  {
    id: "2026-CC-LA-06",
    topicKey: "ControlAndCoordination",
    subtopic: "Nervous System & Reflex Arc",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Draw a labelled diagram of a reflex arc. Explain the sequence of events that occur during a reflex action when you accidentally touch a hot object. Differentiate between reflex action and walking.",
    answer:
      "Reflex arc: receptor → sensory neuron → spinal cord → motor neuron → effector. When touching hot object: heat receptor detects stimulus → impulse travels via sensory nerve to spinal cord → spinal cord processes and sends response via motor nerve → hand muscles contract to withdraw. Difference: reflex action is involuntary and controlled by spinal cord; walking is voluntary and controlled by brain.",
    explanation:
      "Reflex actions are rapid, involuntary responses that protect the body from harm without waiting for brain processing.",
    solutionSteps: [
      "Draw and label the reflex arc components.",
      "Describe the stimulus detection.",
      "Trace the nerve impulse pathway.",
      "Explain the response mechanism.",
      "Contrast reflex action with voluntary action.",
    ],
    strategyHint: "Draw the reflex arc first, then trace the impulse path step by step.",
    pastBoardYear: "2023",
    policyTag: "Control & Coordination 5-mark reflex arc",
    finalAnswer: "Reflex arc: receptor → sensory neuron → spinal cord → motor neuron → effector. When touching hot object: heat receptor detects stimulus → impulse travels via sensory nerve to spinal cord → spinal cord processes and sends response via motor nerve → hand muscles contract to withdraw. Difference: reflex action is involuntary and controlled by spinal cord; walking is voluntary and controlled by brain.",
  },

  {
    id: "2026-REPRO-LA-06",
    topicKey: "Reproduction",
    subtopic: "Human Reproductive System",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Draw a labelled diagram of the female reproductive system. Explain the following: (i) Role of ovary, (ii) Function of fallopian tube, (iii) Where does implantation occur and what happens after it?",
    answer:
      "(i) Ovary produces eggs (ova) and female hormones (oestrogen, progesterone). (ii) Fallopian tube is the site of fertilisation; it carries the egg from ovary to uterus. (iii) Implantation occurs in the uterus wall; after implantation, the embryo develops and the placenta forms for nutrient and waste exchange.",
    explanation:
      "The female reproductive system is designed for egg production, fertilisation, implantation, and nurturing the developing embryo.",
    solutionSteps: [
      "Draw a neat labelled diagram.",
      "Explain the role of each part asked.",
      "Describe what happens post-implantation.",
    ],
    strategyHint: "Label at least 5 parts in the diagram for full marks.",
    pastBoardYear: "2022",
    policyTag: "Reproduction 5-mark female reproductive system",
    finalAnswer: "(i) Ovary produces eggs (ova) and female hormones (oestrogen, progesterone). (ii) Fallopian tube is the site of fertilisation; it carries the egg from ovary to uterus. (iii) Implantation occurs in the uterus wall; after implantation, the embryo develops and the placenta forms for nutrient and waste exchange.",
  },

  {
    id: "2026-LIGHT-LA-06",
    topicKey: "Light",
    subtopic: "Image Formation by Lenses",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Applying",
    questionText:
      "An object 5 cm tall is placed at a distance of 30 cm from a convex lens of focal length 15 cm. Find: (i) the position of the image, (ii) the magnification, (iii) the nature and size of the image. Draw a ray diagram to show the image formation.",
    answer:
      "Using 1/v − 1/u = 1/f: 1/v = 1/15 + 1/(−30) = 1/15 − 1/30 = 1/30. v = 30 cm. Magnification m = v/u = 30/(−30) = −1. Image size = |m| × 5 = 5 cm. Image is real, inverted, same size, formed at 2F on the other side.",
    explanation:
      "At u = 2f, the image is formed at 2f on the other side, real, inverted, and same size as the object.",
    solutionSteps: [
      "Write lens formula: 1/v − 1/u = 1/f.",
      "Substitute u = −30 cm, f = 15 cm.",
      "Solve for v.",
      "Calculate magnification m = v/u.",
      "Determine image size and nature.",
      "Draw ray diagram with two standard rays.",
    ],
    strategyHint: "Use sign convention: u is negative, f is positive for convex lens.",
    pastBoardYear: "2024",
    policyTag: "Light 5-mark lens numerical + ray diagram",
    finalAnswer: "Using 1/v − 1/u = 1/f: 1/v = 1/15 + 1/(−30) = 1/15 − 1/30 = 1/30. v = 30 cm. Magnification m = v/u = 30/(−30) = −1. Image size = |m| × 5 = 5 cm. Image is real, inverted, same size, formed at 2F on the other side.",
  },

  {
    id: "2026-MNM-LA-05",
    topicKey: "MetalsNonMetals",
    subtopic: "Extraction of Metals & Reactivity",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Explain the steps involved in the extraction of metals of medium reactivity from their sulphide ores with the help of an example. Draw a flowchart showing the major steps.",
    answer:
      "Example: Zinc from zinc blende (ZnS). Steps: (i) Concentration of ore by froth floatation. (ii) Roasting: 2ZnS + 3O₂ → 2ZnO + 2SO₂. (iii) Reduction: ZnO + C → Zn + CO. (iv) Refining by electrolytic refining.",
    explanation:
      "Medium-reactivity metals are first converted to oxides (by roasting if sulphide, calcination if carbonate), then reduced using carbon.",
    solutionSteps: [
      "State the ore and metal.",
      "Describe concentration method.",
      "Write the roasting equation.",
      "Write the reduction equation.",
      "Mention the refining step.",
    ],
    strategyHint: "Remember: sulphide ores are roasted, carbonate ores are calcinated.",
    pastBoardYear: "2023",
    policyTag: "Metals & Non-Metals 5-mark extraction",
    finalAnswer: "Example: Zinc from zinc blende (ZnS). Steps: (i) Concentration of ore by froth floatation. (ii) Roasting: 2ZnS + 3O₂ → 2ZnO + 2SO₂. (iii) Reduction: ZnO + C → Zn + CO. (iv) Refining by electrolytic refining.",
  },

  {
    id: "2026-MAG-LA-05",
    topicKey: "MagneticEffects",
    subtopic: "Electromagnetic Induction & Generator",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Hard",
    bloomSkill: "Understanding",
    questionText:
      "Explain the principle of an electric generator. Draw a labelled diagram of an AC generator and explain its working. What is the function of slip rings in the generator?",
    answer:
      "Principle: Electromagnetic induction — when a coil rotates in a magnetic field, the magnetic flux through it changes, inducing an EMF. Working: As the armature rotates, it cuts magnetic field lines; by Faraday's law, an EMF is induced that changes direction every half rotation, producing AC. Slip rings maintain continuous contact between the rotating coil and external circuit, allowing current to flow out.",
    explanation:
      "AC generators convert mechanical energy to electrical energy using electromagnetic induction, with slip rings enabling continuous AC output.",
    solutionSteps: [
      "State the principle (electromagnetic induction).",
      "Draw labelled diagram with armature, magnets, slip rings, brushes.",
      "Explain rotation and flux change.",
      "Explain why AC is produced.",
      "State the function of slip rings.",
    ],
    strategyHint: "Focus on how rotation causes changing flux, which induces EMF.",
    pastBoardYear: "2024",
    policyTag: "Magnetic Effects 5-mark AC generator",
    finalAnswer: "Principle: Electromagnetic induction — when a coil rotates in a magnetic field, the magnetic flux through it changes, inducing an EMF. Working: As the armature rotates, it cuts magnetic field lines; by Faraday's law, an EMF is induced that changes direction every half rotation, producing AC. Slip rings maintain continuous contact between the rotating coil and external circuit, allowing current to flow out.",
  },

  {
    id: "2026-HE-LA-06",
    topicKey: "HeredityEvolution",
    subtopic: "Mendel's Laws & Inheritance",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Explain Mendel's experiment with pea plants on the inheritance of one trait (monohybrid cross). Show a cross between a tall (TT) and short (tt) pea plant up to F₂ generation. What phenotypic and genotypic ratios are obtained in F₂?",
    answer:
      "P: TT × tt → F₁: all Tt (tall). F₁ × F₁: Tt × Tt → F₂: TT, Tt, Tt, tt. Phenotypic ratio: 3 tall : 1 short. Genotypic ratio: 1 TT : 2 Tt : 1 tt.",
    explanation:
      "Mendel's Law of Dominance and Law of Segregation are demonstrated through the monohybrid cross, showing 3:1 phenotypic ratio in F₂.",
    solutionSteps: [
      "State the P generation cross.",
      "Show F₁ generation — all heterozygous tall.",
      "Set up Punnett square for F₁ × F₁.",
      "List all genotypes in F₂.",
      "State phenotypic ratio 3:1 and genotypic ratio 1:2:1.",
    ],
    strategyHint: "Always draw the Punnett square for full marks.",
    pastBoardYear: "2023",
    policyTag: "Heredity 5-mark monohybrid cross",
    finalAnswer: "P: TT × tt → F₁: all Tt (tall). F₁ × F₁: Tt × Tt → F₂: TT, Tt, Tt, tt. Phenotypic ratio: 3 tall : 1 short. Genotypic ratio: 1 TT : 2 Tt : 1 tt.",
  },

  {
    id: "2026-ABS-LA-06",
    topicKey: "AcidsBasesSalts",
    subtopic: "Preparation & Properties of Salts",
    kind: "Short",
    section: "D",
    marks: 5,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "(a) How is washing soda prepared from baking soda? Write the chemical equations involved.\n(b) State two uses each of washing soda and baking soda.\n(c) Why does dry HCl gas not change the colour of dry litmus paper?",
    answer:
      "(a) 2NaHCO₃ → Na₂CO₃ + H₂O + CO₂, then Na₂CO₃ + 10H₂O → Na₂CO₃·10H₂O. (b) Washing soda: used in glass/soap/paper industries and as cleaning agent. Baking soda: used in baking and as antacid. (c) Dry HCl does not produce H⁺ ions; acids produce H⁺ only in aqueous solution.",
    explanation:
      "Washing soda is hydrated sodium carbonate obtained by heating baking soda then recrystallising. Acids need water to ionise.",
    solutionSteps: [
      "Write equation for thermal decomposition of NaHCO₃.",
      "Write equation for hydration of Na₂CO₃.",
      "List uses of washing soda.",
      "List uses of baking soda.",
      "Explain the role of water in acid ionisation.",
    ],
    strategyHint: "Remember: baking soda → soda ash (heat) → washing soda (recrystallise with water).",
    pastBoardYear: "2022",
    policyTag: "Acids Bases Salts 5-mark preparation of salts",
    finalAnswer: "(a) 2NaHCO₃ → Na₂CO₃ + H₂O + CO₂, then Na₂CO₃ + 10H₂O → Na₂CO₃·10H₂O. (b) Washing soda: used in glass/soap/paper industries and as cleaning agent. Baking soda: used in baking and as antacid. (c) Dry HCl does not produce H⁺ ions; acids produce H⁺ only in aqueous solution.",
  },

];
export type PredictedQuestionScience = SciencePredictedQuestion;
// Back-compat alias expected by older mock builders
export type PredictedScienceQuestion = SciencePredictedQuestion;

/**
 * Alias: some components (like MockPaper) expect `predictedQuestionsScience`
 * from this module. We simply point that name to the main
 * `sciencePredictedQuestions` bank defined above.
 */
export const predictedQuestionsScience: PredictedQuestionScience[] =
  sciencePredictedQuestions;
