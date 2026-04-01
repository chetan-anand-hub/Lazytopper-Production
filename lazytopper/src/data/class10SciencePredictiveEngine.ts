// src/data/class10SciencePredictiveEngine.ts

import type {
  DifficultyKey,
  BloomSkill,
  SectionKey,
} from "./predictedQuestions";

// Matches your JSON type strings
export type ScienceQuestionType =
  | "MCQ"
  | "Short"
  | "Long"
  | "Diagram"
  | "Case-Based"
  | "Source-Based"
  | "Assertion-Reason";

export type ScienceTier = "must-crack" | "high-roi" | "good-to-do";

export interface ScienceBlueprintSlot {
  section: SectionKey;
  questionTypes: ScienceQuestionType[];
  numQuestions: number;
  marksEach: number;
}

export interface ScienceAdaptiveDiagnostic {
  diagnosticType: string; // e.g. "Quick Diagnostic"
  numQs: number;
  typicalQTypes: ScienceQuestionType[];
  bloomSkills: BloomSkill[];
  predictionLogic: string;
}

export interface ScienceSubtopicQuestion {
  id: string;
  type: ScienceQuestionType;
  section: SectionKey;
  marks: number;
  difficulty: DifficultyKey;
  bloomSkill: BloomSkill;
  questionText: string;
  answer: string;
  explanation: string;
  pastBoardYear?: string;
  policyTag?: string;
}

export interface ScienceSubtopicSpec {
  subtopic: string;
  weightagePercent: number;
  questions: ScienceSubtopicQuestion[];
}

export interface ScienceTopicSpec {
  code: string; // e.g. "SCI-MNM"
  topic: string; // e.g. "Metals and Non-Metals"
  weightagePercent: number;
  tier: ScienceTier;
  adaptiveDiagnostics: ScienceAdaptiveDiagnostic[];
  mustAskConcepts: string[];
  syllabusPolicy: string[];
  subtopics: ScienceSubtopicSpec[];
}

export interface SciencePredictiveEngineSpec {
  board: "CBSE";
  class: "10";
  subject: "Science";
  examPatternYear: number;
  blueprint: ScienceBlueprintSlot[];
  topics: ScienceTopicSpec[];
  engineRules: string[];
  enginePrompt: string;
}

export const class10SciencePredictiveEngine: SciencePredictiveEngineSpec = {
  board: "CBSE",
  class: "10",
  subject: "Science",
  examPatternYear: 2026,

  // ==== BLUEPRINT (A–E) – mirrors your JSON exactly ====
  blueprint: [
    {
      section: "A",
      questionTypes: ["MCQ", "Assertion-Reason"],
      numQuestions: 20,
      marksEach: 1,
    },
    {
      section: "B",
      questionTypes: ["Short"],
      numQuestions: 5,
      marksEach: 2,
    },
    {
      section: "C",
      questionTypes: ["Short", "Diagram"],
      numQuestions: 6,
      marksEach: 3,
    },
    {
      section: "D",
      questionTypes: ["Long"],
      numQuestions: 4,
      marksEach: 5,
    },
    {
      section: "E",
      questionTypes: ["Case-Based", "Source-Based"],
      numQuestions: 3,
      marksEach: 4,
    },
  ],

  // ==== TOPICS with deep subtopic + question structure ====
  topics: [
    // ------------------------------------------------------
    // 1. METALS AND NON-METALS (SCI-MNM)
    // ------------------------------------------------------
    {
      code: "SCI-MNM",
      topic: "Metals and Non-Metals",
      weightagePercent: 10,
      tier: "must-crack",
      adaptiveDiagnostics: [
        {
          diagnosticType: "Quick Diagnostic",
          numQs: 2,
          typicalQTypes: ["MCQ", "Assertion-Reason"],
          bloomSkills: ["Remembering", "Analysing"],
          predictionLogic:
            "Always asked; must assess core facts and an AR or short application.",
        },
      ],
      mustAskConcepts: [
        "Properties",
        "Activity Series",
        "Extraction methods",
        "Alloys",
        "Corrosion Resistance",
      ],
      syllabusPolicy: ["AR introduced 2019", "NEP-2020", "Case-based focus 2022+"],
      subtopics: [
        {
          subtopic: "Properties",
          weightagePercent: 24,
          questions: [
            {
              id: "2026-MNM-01",
              type: "MCQ",
              section: "A",
              marks: 1,
              difficulty: "Easy",
              bloomSkill: "Remembering",
              questionText:
                "Which metal is softest? (A) Sodium (B) Iron (C) Zinc (D) Copper",
              answer: "Sodium",
              explanation: "Sodium is so soft it can be cut with a knife.",
              pastBoardYear: "2024",
              policyTag: "MCQ/Fact",
            },
            {
              id: "2026-MNM-02",
              type: "MCQ",
              section: "A",
              marks: 1,
              difficulty: "Easy",
              bloomSkill: "Understanding",
              questionText:
                "How do non-metals generally react with water? (A) Vigorously (B) Slowly (C) Not at all (D) Explosively",
              answer: "Not at all",
              explanation: "Non-metals generally do not react with water.",
              pastBoardYear: "2025",
              policyTag: "Board MCQ trend",
            },
          ],
        },
        {
          subtopic: "Activity Series",
          weightagePercent: 16,
          questions: [
            {
              id: "2026-MNM-03",
              type: "Assertion-Reason",
              section: "A",
              marks: 1,
              difficulty: "Medium",
              bloomSkill: "Analysing",
              questionText:
                "Assertion (A): Zinc will displace copper from copper sulphate solution.\nReason (R): Zinc is above copper in the activity series.",
              answer:
                "Both Assertion and Reason are true and Reason is the correct explanation of Assertion.",
              explanation:
                "A more reactive metal displaces a less reactive metal from its salt solution. Zinc is more reactive than copper.",
              pastBoardYear: "2023",
              policyTag: "AR mandatory",
            },
          ],
        },
        {
          subtopic: "Extraction Methods",
          weightagePercent: 18,
          questions: [
            {
              id: "2026-MNM-04",
              type: "Short",
              section: "B",
              marks: 2,
              difficulty: "Medium",
              bloomSkill: "Applying",
              questionText:
                "Name the main step used to extract iron from hematite. Describe it briefly.",
              answer: "Iron is extracted by reduction of hematite in a blast furnace.",
              explanation:
                "In the blast furnace, carbon monoxide reduces Fe₂O₃ (hematite) to metallic iron at high temperature.",
              pastBoardYear: "2022",
              policyTag: "NEP: process focus",
            },
          ],
        },
        {
          subtopic: "Alloys & Corrosion Resistance",
          weightagePercent: 14,
          questions: [
            {
              id: "2026-MNM-05",
              type: "Case-Based",
              section: "E",
              marks: 4,
              difficulty: "Medium",
              bloomSkill: "Applying",
              questionText:
                "Rohan’s bicycle rusts quickly in a coastal area. Suggest any two methods to prevent rusting and briefly explain why each method works.",
              answer:
                "Methods: painting, oil/grease coating, galvanisation.\nThey prevent rusting by stopping oxygen and moisture from reaching the iron surface.",
              explanation:
                "Rusting is an oxidation process requiring oxygen and moisture. Any barrier coating that prevents air and water from reaching iron slows or stops rusting.",
              pastBoardYear: "2025",
              policyTag: "Case/Corrosion NEP",
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------
    // 2. LIFE PROCESSES (SCI-LP)
    // ------------------------------------------------------
    {
      code: "SCI-LP",
      topic: "Life Processes",
      weightagePercent: 10,
      tier: "must-crack",
      adaptiveDiagnostics: [
        {
          diagnosticType: "Quick Diagnostic",
          numQs: 2,
          typicalQTypes: ["MCQ", "Assertion-Reason"],
          bloomSkills: ["Understanding", "Applying"],
          predictionLogic:
            "One nutrition/respiration question, one real-world or assertion/case.",
        },
      ],
      mustAskConcepts: [
        "Nutrition (plants and animals)",
        "Respiration",
        "Transport",
        "Excretion",
      ],
      syllabusPolicy: ["Board focus on diagram+AR", "NEP-2020", "Real-life app"],
      subtopics: [
        {
          subtopic: "Nutrition (plants and animals)",
          weightagePercent: 28,
          questions: [
            {
              id: "2026-LP-01",
              type: "Short",
              section: "C",
              marks: 3,
              difficulty: "Medium",
              bloomSkill: "Understanding",
              questionText:
                "Explain the process of nutrition in human beings under the heads (i) ingestion, (ii) digestion and (iii) absorption.",
              answer:
                "Ingestion: food taken into mouth and chewed with teeth, mixed with saliva.\nDigestion: food broken down by enzymes in mouth, stomach and small intestine.\nAbsorption: digested food absorbed through villi of the small intestine into blood.",
              explanation:
                "Board-style 3-marker on human nutrition covering main steps of ingestion, digestion and absorption.",
              pastBoardYear: "2023",
              policyTag: "Life Processes/Standard 3-marker",
            },
          ],
        },
        {
          subtopic: "Respiration",
          weightagePercent: 24,
          questions: [
            {
              id: "2026-LP-02",
              type: "Case-Based",
              section: "E",
              marks: 4,
              difficulty: "Medium",
              bloomSkill: "Analysing",
              questionText:
                "A student jogs for 15 minutes and notices that her breathing rate and heart rate increase.\n(a) Why does breathing rate increase during vigorous activity?\n(b) How is the increased demand for energy met in muscle cells?\n(c) Name the respiratory pigment and the organ where gaseous exchange occurs.\n(d) Write one difference between aerobic and anaerobic respiration.",
              answer:
                "(a) To supply more oxygen and remove more CO₂.\n(b) By faster aerobic respiration in mitochondria using more oxygen and glucose.\n(c) Haemoglobin; lungs (alveoli).\n(d) Aerobic respiration uses oxygen and releases more energy; anaerobic occurs without oxygen and releases less energy.",
              explanation:
                "Case integrates reasons for increased breathing, site of exchange, pigment and comparison of aerobic vs anaerobic respiration.",
              pastBoardYear: "2022",
              policyTag: "Life Processes/Case-based NEP",
            },
          ],
        },
        {
          subtopic: "Transport",
          weightagePercent: 24,
          questions: [
            {
              id: "2026-LP-03",
              type: "Short",
              section: "C",
              marks: 3,
              difficulty: "Medium",
              bloomSkill: "Understanding",
              questionText:
                "Describe briefly the role of arteries, veins and capillaries in human blood circulation.",
              answer:
                "Arteries carry blood away from the heart under high pressure; veins bring blood back to the heart and have valves; capillaries connect arteries and veins and allow exchange of materials between blood and tissues.",
              explanation:
                "Typical 3-mark transport question focusing on functions of main blood vessels.",
              pastBoardYear: "2021",
              policyTag: "Life Processes/Circulation",
            },
          ],
        },
        {
          subtopic: "Excretion",
          weightagePercent: 24,
          questions: [
            {
              id: "2026-LP-04",
              type: "Diagram",
              section: "D",
              marks: 5,
              difficulty: "Medium",
              bloomSkill: "Applying",
              questionText:
                "Draw a neat labelled diagram of a nephron. Explain briefly how excretion takes place in human beings.",
              answer:
                "Diagram of nephron with glomerulus, Bowman’s capsule, tubule and collecting duct. Filtration occurs in glomerulus; reabsorption and secretion occur along tubule; urine collected and carried to bladder.",
              explanation:
                "Standard 5-marker combining diagram of nephron with description of filtration, reabsorption and urine formation.",
              pastBoardYear: "2020",
              policyTag: "Life Processes/Diagram mandatory",
            },
          ],
        },
      ],
    },

    // ------------------------------------------------------
    // 3. OUR ENVIRONMENT / NATURAL RESOURCES (SCI-ENV)
    // ------------------------------------------------------
    {
      code: "SCI-ENV",
      topic: "Our Environment / Natural Resources",
      weightagePercent: 4,
      tier: "good-to-do",
      adaptiveDiagnostics: [
        {
          diagnosticType: "Quick Diagnostic",
          numQs: 1,
          typicalQTypes: ["MCQ", "Case-Based"],
          bloomSkills: ["Understanding", "Applying"],
          predictionLogic:
            "Selects small but certain real-life MCQ or case for environment policies.",
        },
      ],
      mustAskConcepts: [
        "Food chains/webs",
        "Pollution",
        "Waste management",
        "Conservation",
      ],
      syllabusPolicy: ["Env/biodegradable Qs per NEP"],
      subtopics: [
        {
          subtopic: "Food chains/webs",
          weightagePercent: 30,
          questions: [
            {
              id: "2026-ENV-01",
              type: "MCQ",
              section: "A",
              marks: 1,
              difficulty: "Easy",
              bloomSkill: "Understanding",
              questionText:
                "In a food chain, which trophic level receives the maximum energy directly from the Sun?\n(A) Producers  (B) Primary consumers  (C) Secondary consumers  (D) Decomposers",
              answer: "Producers",
              explanation:
                "Green plants (producers) capture solar energy by photosynthesis and form the first trophic level.",
              pastBoardYear: "2024",
              policyTag: "Environment/MCQ basic",
            },
          ],
        },
        {
          subtopic: "Pollution",
          weightagePercent: 25,
          questions: [
            {
              id: "2026-ENV-02",
              type: "Short",
              section: "B",
              marks: 2,
              difficulty: "Medium",
              bloomSkill: "Applying",
              questionText:
                "What is biomagnification? Why is it a cause of concern for organisms at higher trophic levels?",
              answer:
                "Biomagnification is the increase in concentration of harmful chemicals at successive trophic levels. Top-level consumers accumulate the highest concentration which can damage their health.",
              explanation:
                "Board-style 2-marker linking definition of biomagnification with impact on higher trophic levels.",
              pastBoardYear: "2023",
              policyTag: "Environment/Biomagnification",
            },
          ],
        },
        {
          subtopic: "Waste management",
          weightagePercent: 25,
          questions: [
            {
              id: "2026-ENV-03",
              type: "Case-Based",
              section: "E",
              marks: 4,
              difficulty: "Medium",
              bloomSkill: "Applying",
              questionText:
                "A housing society generates a large quantity of kitchen and garden waste daily. As the eco-monitor of your building, suggest a suitable method of waste management and state any two advantages of this method.",
              answer:
                "Method: composting or vermicomposting.\nAdvantages: reduces waste going to landfills, produces manure for plants, reduces pollution and foul smell.",
              explanation:
                "Case-based question focusing on real-life application of solid waste management practices.",
              pastBoardYear: "2022",
              policyTag: "Environment/Waste management case",
            },
          ],
        },
        {
          subtopic: "Conservation",
          weightagePercent: 20,
          questions: [
            {
              id: "2026-ENV-04",
              type: "Short",
              section: "B",
              marks: 2,
              difficulty: "Easy",
              bloomSkill: "Understanding",
              questionText:
                "State any two measures that can be taken at the individual level to conserve natural resources.",
              answer:
                "Examples: using public transport, switching off unnecessary lights and fans, reducing water wastage, reusing and recycling materials.",
              explanation:
                "Simple 2-marker linking daily-life actions to conservation of resources.",
              pastBoardYear: "2021",
              policyTag: "Environment/Conservation NEP",
            },
          ],
        },
      ],
    },
  ],

  // ==== ENGINE RULES – straight from your JSON/philosophy ====
  engineRules: [
    "Always fill blueprint slots (sections/types/marks) by predicted board topic weightage.",
    "For diagnostics and dashboards, offer 3–6 quick, high-yield questions biased towards must-crack and top-weight topics.",
    "After each mock or test, recalculate strengths/gaps by topic and Bloom skill and adapt next-session topic weights.",
    "Alert if any must-crack or policy-targeted concept shows weakness in diagnostics or previous mocks.",
  ],

  // ==== ENGINE PROMPT – combines both prompts you wrote ====
  enginePrompt: `
You are a predictive and adaptive CBSE Class 10 Science question engine for the 2026 board pattern.

Use ONLY the provided, deeply-tagged topic/subtopic/question JSON—structured for 2026 prediction:
- board, class, subject, blueprint (sections A–E),
- topics with code, weightagePercent, tier, adaptiveDiagnostics, mustAskConcepts, syllabusPolicy,
- subtopics with tagged questions (type, section, marks, difficulty, bloomSkill, pastBoardYear, policyTag).

For each student and each test:
- Select and recommend questions/tests strictly as per this engine JSON, especially favouring highest-weight and "must-crack" topics.
- For every test/mock, fill section slots (A/B/C/D/E) with concept, type, and difficulty probabilities per the blueprint and topics structure.
- Always include a mix of MCQ, Assertion-Reason and Case-Based questions.

For diagnostics or progress dashboards:
- Pick a small set (3–6) of diagnostic questions from high-weight topics and key must-ask concepts.
- After each test or mock, update the learner's topic mastery, weaknesses, and new-session topic weights based on their responses.
- Highlight weaknesses in mandatory or "policy-targeted" chapter-concepts (per NEP/circular focus).

Your mission is to maximise predicted board score for minimum effort, respecting the trend, blueprint and philosophy encoded in this JSON spec.
`,
};

// Optional helper: FLAT QUESTION BANK for easy reuse elsewhere
export const predictedScienceQuestionsFlat: ScienceSubtopicQuestion[] =
  class10SciencePredictiveEngine.topics.flatMap((t) =>
    t.subtopics.flatMap((s) => s.questions)
  );
