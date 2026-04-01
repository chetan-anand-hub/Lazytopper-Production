// src/data/class10ScienceTopicTrends.ts

// Tiering aligned with Maths side so UI can reuse the same badges / colours
export type TierKey = "must-crack" | "high-roi" | "good-to-do";

export interface ScienceConceptTrend {
  name: string;
  sharePercent: number; // approximate share inside the chapter
  question_types: string[];
  summary_and_exam_tips: string;
}

export interface ScienceTopicTrend {
  topicKey: Class10ScienceTopicKey;
  topicName: string;
  tier: TierKey;
  weightagePercent: number; // approx % of total 80 marks
  concepts: ScienceConceptTrend[];
}

export type Class10ScienceTopicKey =
  | "ChemicalReactions"
  | "AcidsBasesSalts"
  | "MetalsNonMetals"
  | "CarbonCompounds"
  | "LifeProcesses"
  | "ControlAndCoordination"
  | "Reproduction"
  | "HeredityEvolution"
  | "Light"
  | "HumanEyeAndColourfulWorld"
  | "Electricity"
  | "MagneticEffects"
  | "OurEnvironment";

/**
 * Parameter type for science topics.  While most modules should use
 * Class10ScienceTopicKey to refer to canonical slugs, some
 * transitional modules (e.g. predicted question banks) still use
 * human-readable keys.  This alias allows those modules to type
 * topicKey as a string while remaining compatible with this file.
 */
export type Class10ScienceTopicParam = Class10ScienceTopicKey | string;

export type Class10ScienceTopicTrendsData = Record<
  Class10ScienceTopicKey,
  ScienceTopicTrend
>;

export interface Class10ScienceTrendsRoot {
  topics: Class10ScienceTopicTrendsData;
  difficultyDistributionPercent: {
    Easy: number;
    Medium: number;
    Hard: number;
  };
}

// 🔹 Main trends object – same shape as class10MathTopicTrends
export const class10ScienceTopicTrends: Class10ScienceTrendsRoot = {
  topics: {
    ChemicalReactions: {
      topicKey: "ChemicalReactions",
      topicName: "Chemical Reactions & Equations",
      tier: "must-crack",
      weightagePercent: 8,
      concepts: [
        {
          name: "Balancing Equations & Types of Reactions",
          sharePercent: 60,
          question_types: ["Very Short", "Short", "Reasoning"],
          summary_and_exam_tips:
            "Always write balanced equations, mention type (combination, decomposition, displacement, redox). Many 2–3 mark questions from here.",
        },
        {
          name: "Applications & Daily-life Context",
          sharePercent: 40,
          question_types: ["Short", "Case-Based"],
          summary_and_exam_tips:
            "Link observations (colour change, gas evolution, precipitate) with type of reaction. Read NCERT in-text + examples carefully.",
        },
      ],
    },

    AcidsBasesSalts: {
      topicKey: "AcidsBasesSalts",
      topicName: "Acids, Bases & Salts",
      tier: "must-crack",
      weightagePercent: 8,
      concepts: [
        {
          name: "pH, Indicators & Strength",
          sharePercent: 50,
          question_types: ["Very Short", "Short", "Assertion-Reasoning"],
          summary_and_exam_tips:
            "Know pH scale, common indicators, and everyday examples (tooth decay, soil treatment). Typical 1–2 markers + AR questions.",
        },
        {
          name: "Important Salts (Na₂CO₃, NaHCO₃, Plaster of Paris)",
          sharePercent: 50,
          question_types: ["Short", "Case-Based"],
          summary_and_exam_tips:
            "Learn preparation, uses, and special properties. Draw simple flow-type diagrams to revise quickly before exam.",
        },
      ],
    },

    MetalsNonMetals: {
      topicKey: "MetalsNonMetals",
      topicName: "Metals & Non-metals",
      tier: "high-roi",
      weightagePercent: 7,
      concepts: [
        {
          name: "Reactivity Series & Displacement",
          sharePercent: 50,
          question_types: ["Short", "Reasoning"],
          summary_and_exam_tips:
            "Memorise reactivity series once, then practise displacement and extraction questions. Common 2–3 markers.",
        },
        {
          name: "Corrosion & Prevention",
          sharePercent: 50,
          question_types: ["Very Short", "Short"],
          summary_and_exam_tips:
            "Definition + methods (galvanisation, alloying, painting). Easy scoring if you remember keywords.",
        },
      ],
    },

    CarbonCompounds: {
      topicKey: "CarbonCompounds",
      topicName: "Carbon & its Compounds",
      tier: "high-roi",
      weightagePercent: 7,
      concepts: [
        {
          name: "Homologous Series & Nomenclature",
          sharePercent: 45,
          question_types: ["Short", "Reasoning"],
          summary_and_exam_tips:
            "Practise IUPAC naming patterns; draw structures for common names in NCERT examples.",
        },
        {
          name: "Properties of Ethanol & Ethanoic Acid",
          sharePercent: 55,
          question_types: ["Short", "Case-Based"],
          summary_and_exam_tips:
            "Focus on reactions, uses, and harmful effects. Often appears in application-style questions.",
        },
      ],
    },

    LifeProcesses: {
      topicKey: "LifeProcesses",
      topicName: "Life Processes",
      tier: "must-crack",
      weightagePercent: 10,
      concepts: [
        {
          name: "Nutrition & Respiration (Human + Plants)",
          sharePercent: 50,
          question_types: ["Short", "Long", "Diagram-based"],
          summary_and_exam_tips:
            "Diagrams of digestive system, nephron, stomata etc. must be practised. Label neatly, write steps in sequence.",
        },
        {
          name: "Transportation & Excretion in Humans",
          sharePercent: 50,
          question_types: ["Short", "Long"],
          summary_and_exam_tips:
            "Heart diagram, double circulation, and role of kidneys are frequent 3–5 markers.",
        },
      ],
    },

    ControlAndCoordination: {
      topicKey: "ControlAndCoordination",
      topicName: "Control & Coordination",
      tier: "high-roi",
      weightagePercent: 7,
      concepts: [
        {
          name: "Nervous System & Reflex Actions",
          sharePercent: 45,
          question_types: ["Short", "Diagram-based"],
          summary_and_exam_tips:
            "Structure of neuron, synapse idea, and reflex arc are favourites. Practise neat diagrams.",
        },
        {
          name: "Plant Hormones & Movements",
          sharePercent: 55,
          question_types: ["Very Short", "Short"],
          summary_and_exam_tips:
            "Learn names & roles of auxin, gibberellin, cytokinin, ethylene, ABA. Many 1–2 mark concept questions.",
        },
      ],
    },

    Reproduction: {
      topicKey: "Reproduction",
      topicName: "How do Organisms Reproduce?",
      tier: "must-crack",
      weightagePercent: 8,
      concepts: [
        {
          name: "Asexual Reproduction & Diagrams",
          sharePercent: 40,
          question_types: ["Short", "Diagram-based"],
          summary_and_exam_tips:
            "Binary fission vs budding vs regeneration; draw simple sketches and highlight differences.",
        },
        {
          name: "Sexual Reproduction in Humans & Plants",
          sharePercent: 60,
          question_types: ["Short", "Long"],
          summary_and_exam_tips:
            "Focus on flow/sequence: gamete formation → fertilisation → implantation etc. Often appears as 3–5 mark structured questions.",
        },
      ],
    },

    HeredityEvolution: {
      topicKey: "HeredityEvolution",
      topicName: "Heredity & Evolution",
      tier: "high-roi",
      weightagePercent: 6,
      concepts: [
        {
          name: "Mendel’s Experiments & Ratios",
          sharePercent: 60,
          question_types: ["Short", "Reasoning"],
          summary_and_exam_tips:
            "Monohybrid vs dihybrid, 3:1 and 9:3:3:1 ratios. Write phenotype + genotype clearly.",
        },
        {
          name: "Basic Ideas of Evolution",
          sharePercent: 40,
          question_types: ["Short"],
          summary_and_exam_tips:
            "Fossils, homologous vs analogous organs, and speciation — usually 2–3 markers.",
        },
      ],
    },

    Light: {
      topicKey: "Light",
      topicName: "Light – Reflection & Refraction",
      tier: "must-crack",
      weightagePercent: 9,
      concepts: [
        {
          name: "Mirror / Lens Formula & Ray Diagrams",
          sharePercent: 60,
          question_types: ["Numerical", "Diagram-based"],
          summary_and_exam_tips:
            "Practise sign convention and standard ray diagrams. Many 3–4 mark numericals are directly formula-based.",
        },
        {
          name: "Refraction through Glass Slab / Prism",
          sharePercent: 40,
          question_types: ["Short", "Numerical"],
          summary_and_exam_tips:
            "Know Snell’s law qualitatively, real vs apparent depth, and dispersion basics.",
        },
      ],
    },

    HumanEyeAndColourfulWorld: {
      topicKey: "HumanEyeAndColourfulWorld",
      topicName: "The Human Eye & the Colourful World",
      tier: "high-roi",
      weightagePercent: 5,
      concepts: [
        {
          name: "Structure & Defects of Vision",
          sharePercent: 60,
          question_types: ["Short"],
          summary_and_exam_tips:
            "Myopia, hypermetropia, presbyopia — causes + correction lenses are frequently asked.",
        },
        {
          name: "Atmospheric Refraction Phenomena",
          sharePercent: 40,
          question_types: ["Short"],
          summary_and_exam_tips:
            "Twinkling of stars, advanced sunrise, scattering of light. Revise NCERT diagrams.",
        },
      ],
    },

    Electricity: {
      topicKey: "Electricity",
      topicName: "Electricity",
      tier: "must-crack",
      weightagePercent: 9,
      concepts: [
        {
          name: "Ohm’s Law & Circuit Numericals",
          sharePercent: 60,
          question_types: ["Numerical", "Short"],
          summary_and_exam_tips:
            "Series vs parallel, effective resistance, power = VI = I²R = V²/R. Huge scoring potential if you practise numericals.",
        },
        {
          name: "Heating Effect & Power Calculations",
          sharePercent: 40,
          question_types: ["Numerical", "Short"],
          summary_and_exam_tips:
            "Bulb / fuse questions, domestic wiring basics. Units and conversions are important.",
        },
      ],
    },

    MagneticEffects: {
      topicKey: "MagneticEffects",
      topicName: "Magnetic Effects of Electric Current",
      tier: "high-roi",
      weightagePercent: 6,
      concepts: [
        {
          name: "Right-hand Rules & Field Lines",
          sharePercent: 55,
          question_types: ["Short", "Diagram-based"],
          summary_and_exam_tips:
            "Draw neat field line diagrams; remember direction rules for straight conductor and solenoid.",
        },
        {
          name: "Electric Motor & Electromagnetic Induction",
          sharePercent: 45,
          question_types: ["Short", "Long"],
          summary_and_exam_tips:
            "Labelled diagrams + principle statements give easy marks.",
        },
      ],
    },

    OurEnvironment: {
      topicKey: "OurEnvironment",
      topicName: "Our Environment / Sources of Energy",
      tier: "good-to-do",
      weightagePercent: 5,
      concepts: [
        {
          name: "Food Chains & Trophic Levels",
          sharePercent: 50,
          question_types: ["Very Short", "Short"],
          summary_and_exam_tips:
            "Learn key terms (biomagnification, biodegradable vs non-biodegradable). Mostly theory, easy to score.",
        },
        {
          name: "Conventional vs Non-conventional Energy",
          sharePercent: 50,
          question_types: ["Short"],
          summary_and_exam_tips:
            "Advantages / disadvantages questions — prepare crisp bullet points.",
        },
      ],
    },
  },

  // Rough difficulty mix (can tune later, matches Maths style)
  difficultyDistributionPercent: {
    Easy: 40,
    Medium: 40,
    Hard: 20,
  },
};

// 🔹 List form, useful for mapping over in UI
export const class10ScienceTopicTrendList: ScienceTopicTrend[] =
  Object.values(class10ScienceTopicTrends.topics);
