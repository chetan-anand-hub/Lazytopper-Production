import type { ScienceTopicTrendEntry } from "./types";

export const scienceTopicTrends: ScienceTopicTrendEntry[] = [
  {
    topicKey: "LifeProcesses",
    topicName: "Life Processes",
    tier: "must-crack",
    weightagePercent: 12.5,
    concepts: [
      { name: "Nutrition & Respiration", sharePercent: 50, question_types: ["Short", "Long", "Diagram-based"], summary_and_exam_tips: "Diagrams of digestive system, nephron, stomata etc. must be practised." },
      { name: "Transportation & Excretion", sharePercent: 50, question_types: ["Short", "Long"], summary_and_exam_tips: "Heart diagram, double circulation, and role of kidneys are frequent 3-5 markers." },
    ],
  },
  {
    topicKey: "Electricity",
    topicName: "Electricity",
    tier: "must-crack",
    weightagePercent: 11.25,
    concepts: [
      { name: "Ohm's Law & Circuit Numericals", sharePercent: 60, question_types: ["Numerical", "Short"], summary_and_exam_tips: "Series vs parallel, effective resistance, power formulae. Huge scoring potential." },
      { name: "Heating Effect & Power", sharePercent: 40, question_types: ["Numerical", "Short"], summary_and_exam_tips: "Bulb/fuse questions, domestic wiring basics. Units and conversions are important." },
    ],
  },
  {
    topicKey: "Light",
    topicName: "Light - Reflection & Refraction",
    tier: "must-crack",
    weightagePercent: 10,
    concepts: [
      { name: "Mirror/Lens Formula & Ray Diagrams", sharePercent: 60, question_types: ["Numerical", "Diagram-based"], summary_and_exam_tips: "Practise sign convention and standard ray diagrams." },
      { name: "Refraction through Glass Slab/Prism", sharePercent: 40, question_types: ["Short", "Numerical"], summary_and_exam_tips: "Know Snell's law qualitatively, real vs apparent depth, and dispersion basics." },
    ],
  },
  {
    topicKey: "ChemicalReactions",
    topicName: "Chemical Reactions & Equations",
    tier: "high-roi",
    weightagePercent: 8.75,
    concepts: [
      { name: "Balancing Equations & Types", sharePercent: 60, question_types: ["Very Short", "Short", "Reasoning"], summary_and_exam_tips: "Always write balanced equations, mention type of reaction." },
      { name: "Applications & Daily-life", sharePercent: 40, question_types: ["Short", "Case-Based"], summary_and_exam_tips: "Link observations with type of reaction. Read NCERT in-text examples carefully." },
    ],
  },
  {
    topicKey: "AcidsBasesSalts",
    topicName: "Acids, Bases & Salts",
    tier: "high-roi",
    weightagePercent: 8.75,
    concepts: [
      { name: "pH, Indicators & Strength", sharePercent: 50, question_types: ["Very Short", "Short", "AR"], summary_and_exam_tips: "Know pH scale, common indicators, and everyday examples." },
      { name: "Important Salts", sharePercent: 50, question_types: ["Short", "Case-Based"], summary_and_exam_tips: "Learn preparation, uses, and special properties." },
    ],
  },
  {
    topicKey: "Reproduction",
    topicName: "How do Organisms Reproduce?",
    tier: "high-roi",
    weightagePercent: 7.5,
    concepts: [
      { name: "Asexual Reproduction", sharePercent: 40, question_types: ["Short", "Diagram-based"], summary_and_exam_tips: "Binary fission vs budding vs regeneration; draw simple sketches." },
      { name: "Sexual Reproduction", sharePercent: 60, question_types: ["Short", "Long"], summary_and_exam_tips: "Focus on flow/sequence from gamete formation to fertilisation." },
    ],
  },
  {
    topicKey: "MetalsNonMetals",
    topicName: "Metals & Non-metals",
    tier: "high-roi",
    weightagePercent: 7.5,
    concepts: [
      { name: "Reactivity Series & Displacement", sharePercent: 50, question_types: ["Short", "Reasoning"], summary_and_exam_tips: "Memorise reactivity series, practise displacement questions." },
      { name: "Corrosion & Prevention", sharePercent: 50, question_types: ["Very Short", "Short"], summary_and_exam_tips: "Definition + methods (galvanisation, alloying, painting)." },
    ],
  },
  {
    topicKey: "CarbonCompounds",
    topicName: "Carbon & its Compounds",
    tier: "high-roi",
    weightagePercent: 6.25,
    concepts: [
      { name: "Homologous Series & Nomenclature", sharePercent: 45, question_types: ["Short", "Reasoning"], summary_and_exam_tips: "Practise IUPAC naming patterns; draw structures." },
      { name: "Ethanol & Ethanoic Acid Properties", sharePercent: 55, question_types: ["Short", "Case-Based"], summary_and_exam_tips: "Focus on reactions, uses, and harmful effects." },
    ],
  },
  {
    topicKey: "ControlAndCoordination",
    topicName: "Control & Coordination",
    tier: "high-roi",
    weightagePercent: 6.25,
    concepts: [
      { name: "Nervous System & Reflex Actions", sharePercent: 45, question_types: ["Short", "Diagram-based"], summary_and_exam_tips: "Structure of neuron, synapse idea, and reflex arc are favourites." },
      { name: "Plant Hormones & Movements", sharePercent: 55, question_types: ["Very Short", "Short"], summary_and_exam_tips: "Learn names & roles of auxin, gibberellin, cytokinin, ethylene, ABA." },
    ],
  },
  {
    topicKey: "OurEnvironment",
    topicName: "Our Environment",
    tier: "high-roi",
    weightagePercent: 6.25,
    concepts: [
      { name: "Food Chains & Trophic Levels", sharePercent: 50, question_types: ["Very Short", "Short"], summary_and_exam_tips: "Learn key terms (biomagnification, biodegradable vs non-biodegradable)." },
      { name: "Energy Sources", sharePercent: 50, question_types: ["Short"], summary_and_exam_tips: "Advantages/disadvantages of conventional vs non-conventional energy." },
    ],
  },
  {
    topicKey: "HeredityEvolution",
    topicName: "Heredity & Evolution",
    tier: "good-to-do",
    weightagePercent: 5,
    concepts: [
      { name: "Mendel's Experiments & Ratios", sharePercent: 60, question_types: ["Short", "Reasoning"], summary_and_exam_tips: "Monohybrid vs dihybrid, 3:1 and 9:3:3:1 ratios." },
      { name: "Basic Ideas of Evolution", sharePercent: 40, question_types: ["Short"], summary_and_exam_tips: "Fossils, homologous vs analogous organs, and speciation." },
    ],
  },
  {
    topicKey: "HumanEyeAndColourfulWorld",
    topicName: "The Human Eye",
    tier: "good-to-do",
    weightagePercent: 5,
    concepts: [
      { name: "Structure & Defects of Vision", sharePercent: 60, question_types: ["Short"], summary_and_exam_tips: "Myopia, hypermetropia, presbyopia — causes + correction lenses." },
      { name: "Atmospheric Refraction", sharePercent: 40, question_types: ["Short"], summary_and_exam_tips: "Twinkling of stars, advanced sunrise, scattering of light." },
    ],
  },
  {
    topicKey: "MagneticEffects",
    topicName: "Magnetic Effects of Current",
    tier: "good-to-do",
    weightagePercent: 5,
    concepts: [
      { name: "Right-hand Rules & Field Lines", sharePercent: 55, question_types: ["Short", "Diagram-based"], summary_and_exam_tips: "Draw neat field line diagrams; remember direction rules." },
      { name: "Electric Motor & Induction", sharePercent: 45, question_types: ["Short", "Long"], summary_and_exam_tips: "Labelled diagrams + principle statements give easy marks." },
    ],
  },
];
