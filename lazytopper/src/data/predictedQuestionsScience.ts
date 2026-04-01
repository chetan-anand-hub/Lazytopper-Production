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
  },

  {
    id: "2026-REP-CASE-05",
    topicKey: "Reproduction",
    subtopic: "Adolescence & Reproductive Health",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A group of teenagers attend a workshop on reproductive health.\n(i) Why is it important to educate adolescents about reproductive health?\n(ii) Mention two methods to prevent sexually transmitted infections.\n(iii) What is the role of family and school in maintaining adolescent health?\n(iv) Name any one sexually transmitted disease.",
    answer:
      "(i) To help them make informed decisions, avoid infections, and respect their own and others’ bodies.\n(ii) Use of condoms, monogamous relationships, proper medical advice (any two correct points).\n(iii) Family and school provide correct information, emotional support, and promote healthy habits and respect.\n(iv) HIV/AIDS, syphilis, gonorrhoea (any one).",
    explanation:
      "NCERT emphasises awareness, prevention of STIs, and role of family/school.",
    policyTag: "Reproductive health case-study",
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
  },

  {
    id: "2026-HE-SA-03",
    topicKey: "HeredityEvolution",
    subtopic: "Homologous & Analogous Organs",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Differentiate between homologous and analogous organs with one example each.",
    answer:
      "Homologous organs: same basic structure but different functions (e.g., forelimbs of humans and wings of birds).\nAnalogous organs: different basic structure but similar functions (e.g., wings of insects and wings of birds).",
    explanation:
      "Homologous structures indicate common ancestry; analogous structures arise due to convergent evolution.",
    policyTag: "Homologous vs analogous",
  },

  {
    id: "2026-HE-CASE-04",
    topicKey: "HeredityEvolution",
    subtopic: "Evolutionary Evidence",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "Fossils of an organism show that it had both reptilian and avian characters.\n(i) What does this suggest about evolution?\n(ii) Name one such fossil organism.\n(iii) How do fossils help in evolutionary studies?\n(iv) State one more piece of evidence for evolution apart from fossils.",
    answer:
      "(i) It suggests that modern groups may have evolved from common ancestors and intermediate forms existed.\n(ii) Archaeopteryx.\n(iii) Fossils show progressive changes in body structure over geological time scales, linking present-day organisms with their ancestors.\n(iv) Comparative anatomy, vestigial organs, embryological evidence, or molecular evidence (any one).",
    explanation:
      "Intermediate fossils like Archaeopteryx support the idea of gradual evolution with transitional features.",
    policyTag: "Fossil/evolution case",
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
  },

  // ================================================================
  // OUR ENVIRONMENT / SOURCES OF ENERGY
  // ================================================================

  {
    id: "2026-ENV-MCQ-01",
    topicKey: "OurEnvironment",
    subtopic: "Food Chains & Trophic Levels",
    kind: "MCQ",
    section: "A",
    marks: 1,
    difficulty: "Easy",
    bloomSkill: "Remembering",
    questionText:
      "Which of the following is a correct food chain?",
    options: [
      "Grass → Deer → Tiger → Vulture",
      "Tiger → Deer → Grass",
      "Vulture → Deer → Grass",
      "Grass → Tiger → Deer",
    ],
    answer: "Grass → Deer → Tiger → Vulture",
    explanation:
      "Producer (grass) → primary consumer (deer) → secondary consumer (tiger) → tertiary consumer (vulture as scavenger).",
    policyTag: "Food chain order MCQ",
  },

  {
    id: "2026-ENV-SA-02",
    topicKey: "OurEnvironment",
    subtopic: "Biomagnification & Waste",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "What is biomagnification? Why are top-level consumers more affected by it?",
    answer:
      "Biomagnification is the progressive increase in the concentration of non-biodegradable harmful chemicals in the food chain. Top-level consumers are more affected because they receive chemicals accumulated from all previous trophic levels.",
    explanation:
      "Persistent pollutants like DDT accumulate and magnify up the food chain.",
    policyTag: "Biomagnification definition",
  },

  {
    id: "2026-ENV-SA-03",
    topicKey: "OurEnvironment",
    subtopic: "Conventional vs Non-conventional Energy",
    kind: "Short",
    section: "C",
    marks: 3,
    difficulty: "Medium",
    bloomSkill: "Applying",
    questionText:
      "Differentiate between renewable and non-renewable sources of energy with two examples of each.",
    answer:
      "Renewable sources can be replenished in a short time (e.g., solar energy, wind energy). Non-renewable sources are available in limited quantities and take millions of years to form (e.g., coal, petroleum).",
    explanation:
      "Definition plus examples is a standard pattern; emphasise sustainability.",
    policyTag: "Energy resources comparison",
  },

  {
    id: "2026-ENV-CASE-04",
    topicKey: "OurEnvironment",
    subtopic: "Waste Management & Lifestyle",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      "A housing society generates large amounts of kitchen waste, plastic waste and paper waste daily.\n(i) Which of these are biodegradable and which are non-biodegradable?\n(ii) Suggest one method each to manage biodegradable and non-biodegradable waste.\n(iii) Why is it important to reduce use of plastic bags?\n(iv) Suggest two lifestyle changes to reduce solid waste generation.",
    answer:
      "(i) Kitchen waste and paper waste are biodegradable; most plastic waste is non-biodegradable.\n(ii) Biodegradable: composting/vermicomposting; Non-biodegradable: recycling or proper segregation and collection.\n(iii) Plastic bags cause soil and water pollution and harm animals; they are non-biodegradable.\n(iv) Carry cloth bags, avoid single-use plastics, buy only what is needed, reuse and recycle (any two valid points).",
    explanation:
      "Case-based question links solid waste management concepts with practical lifestyle suggestions.",
    policyTag: "Environment case-study",
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
  },

  {
    id: "2026-EL-SA-04",
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
  },

  {
    id: "2026-EL-SA-05",
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
      "Tests basic understanding of eye’s functioning for moving pictures and focusing at different distances.",
    policyTag: "Human eye – basic physiology and accommodation",
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
  },

  {
    id: "2026-LP-SA-03",
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
  },

  {
    id: "2026-LP-SA-04",
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
  },

  // ================================================================
  // DEPTH PACK 2026 — REMAINING SCIENCE TOPICS
  // Acids/Bases, Metals, Carbon Compounds, Control & Coordination,
  // Reproduction, Heredity & Evolution, Our Environment, core Chemistry
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
  },

  {
    id: "2026-RP-CS-02",
    topicKey: "Reproduction",
    subtopic: "Birth Control & Population",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `A couple wants to delay the birth of their first child and consults a doctor for advice.
(a) Why is it important to have awareness about birth control methods?
(b) Name two temporary and one permanent method of birth control.
(c) State one social message promoted by family planning programmes.`,
    answer:
      `(a) Awareness helps couples choose safe, reliable methods and prevents unwanted pregnancies, unsafe abortions and spread of STDs.
(b) Temporary methods: condoms, oral pills, copper-T, etc.; permanent: vasectomy or tubectomy.
(c) Small family norm / better health and education for children / women empowerment (any one).`,
    explanation:
      "Connects reproductive health concepts with social issues and government programmes.",
    policyTag: "Reproduction – family planning and reproductive health",
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
  },

  {
    id: "2026-HEV-CS-02",
    topicKey: "HeredityEvolution",
    subtopic: "Variation & Natural Selection",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `In a population of beetles, most individuals are green and a few are brown. Due to a change in environment, the green beetles are easily seen by predators but brown beetles are not.
(a) What happens to the number of brown beetles over several generations?
(b) Which process of evolution does this situation illustrate?
(c) How is this process useful for the survival of species?`,
    answer:
      `(a) The number of brown beetles increases because they survive and reproduce more.
(b) This illustrates natural selection.
(c) Natural selection favours individuals with advantageous variations, helping species adapt better to changing environment and survive.`,
    explanation:
      "Applies variation and natural selection concepts in a simple textbook-style example.",
    policyTag: "Heredity & evolution – natural selection and adaptation",
  },

  // ------------------------ OUR ENVIRONMENT ------------------------

  {
    id: "2026-OE-SA-05",
    topicKey: "OurEnvironment",
    subtopic: "Food Chains & Food Webs",
    kind: "Short",
    section: "B",
    marks: 2,
    difficulty: "Medium",
    bloomSkill: "Understanding",
    questionText:
      "Define (a) food chain and (b) trophic level. Why do food chains generally have only 3–4 trophic levels?",
    answer:
      `(a) Food chain: a sequence of organisms where each is eaten by the next higher one in the chain.
(b) Trophic level: the position of an organism in a food chain, based on the source of its food.
Food chains usually have 3–4 levels because a lot of energy is lost (about 90%) at each step, so very little energy is left to support more levels.`,
    explanation:
      "Reinforces the idea of energy flow and 10% law limiting food chain length.",
    policyTag: "Our environment – food chains and energy flow",
  },

  {
    id: "2026-OE-CS-02",
    topicKey: "OurEnvironment",
    subtopic: "Waste Management & Pollution",
    kind: "Case-Based",
    section: "E",
    marks: 4,
    difficulty: "Medium",
    bloomSkill: "Analysing",
    questionText:
      `A town faces a problem of overflowing garbage bins and open dumping.
(a) Name any two problems caused by open dumping of wastes.
(b) Suggest two methods to reduce the load on landfills.
(c) Why is segregation of waste at source important?`,
    answer:
      `(a) Foul smell, breeding of flies and rats, spread of diseases, soil and water pollution (any two).
(b) Methods: composting biodegradable waste, recycling paper/plastic/metals, reducing use of disposable items (any two).
(c) Segregation ensures that biodegradable and recyclable materials can be processed properly, reducing mixed waste and improving efficiency of waste management.`,
    explanation:
      "Connects textbook discussion on waste management with real-life civic problems and solutions.",
    policyTag: "Our environment – solid waste management and pollution",
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
