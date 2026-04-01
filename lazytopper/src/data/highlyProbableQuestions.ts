// src/data/highlyProbableQuestions.ts
import type { PredictedQuestionId } from "./predictedQuestions";
import { hpqAdditions } from "./hpqAdditionsAndDailyMixSeeds";
import { mergeBucketsByTopic } from "../utils/mergeBucketsByTopic.ts";
import { class10ScienceTopicTrends } from "./class10ScienceTopicTrends";
import { deriveHPQConfidence } from "../prediction/hpqConfidence";

// ---------------- Shared types for the HPQ engine ----------------

export type HPQSubject = "Maths" | "Science";
export type HPQStream = "Physics" | "Chemistry" | "Biology" | "General";
export type HPQSection = "A" | "B" | "C" | "D" | "E";

export type HPQQuestionType =
  | "MCQ"
  | "VeryShort"
  | "Short"
  | "Long"
  | "CaseBased"
  | "AssertionReason"
  | "Diagram";

export type HPQDifficulty = "Easy" | "Medium" | "Hard";
export type HPQLikelihood = "Very High" | "High" | "Medium-High" | "Medium";
export type HPQTier = "must-crack" | "high-roi" | "good-to-do";

export interface HPQAROption {
  label: string;
  text: string;
}

export interface HPQQuestion {
  id: string;

  // Subject + topic tags
  subject?: HPQSubject; // default: "Maths" if omitted
  stream?: HPQStream; // for Science – Physics / Chemistry / Biology / General
  topic?: string; // chapter name (e.g. "Metals & Non-metals")
  subtopic?: string; // finer split
  concept?: string; // skill / pattern inside the topic

  // Exam meta
  section?: HPQSection; // A/B/C/D/E
  type?: HPQQuestionType;
  difficulty?: HPQDifficulty;
  marks?: number;
  likelihood: HPQLikelihood;
  tier?: HPQTier; // optional – can also be taken from bucket/default

  // Question layout
  kind?: "normal" | "assertion-reason"; // for AR style
  question: string;

  // Assertion–Reason specific fields
  assertion?: string;
  reason?: string;
  aROptions?: HPQAROption[];
  correctOption?: string;

  // Solutions
  answer?: string;
  solutionSteps?: string[];
  explanation?: string;

  // Optional extra tags (especially for Science)
  bloomSkill?:
    | "Remembering"
    | "Understanding"
    | "Applying"
    | "Analysing"
    | "Evaluating";
  pastBoardYear?: string;
  policyTag?: string;
  confidenceScore?: number;
  confidenceBand?: "low" | "medium" | "high";
  confidenceRationale?: string;
}

export interface HPQTopicBucket {
  // Chapter name as used on Trends page
  topic: string;

  // Optional subject + stream tags at bucket level
  subject?: HPQSubject; // default "Maths"
  stream?: HPQStream; // mainly for Science
  defaultTier?: HPQTier;

  /**
   * Optional link from this topic bucket to the global PredictedQuestions bank.
   * Each ID must exist in predictedQuestions.ts as a PredictedQuestionId.
   * Used for building 80-mark HPQ sets / mock papers on the HPQ page.
   */
  questionIds?: PredictedQuestionId[];

  questions: HPQQuestion[];
}

// Convenience enums for tabs/filters
export const HPQ_SUBJECTS: HPQSubject[] = ["Maths", "Science"];
export const HPQ_SCIENCE_STREAMS: HPQStream[] = [
  "Physics",
  "Chemistry",
  "Biology",
  "General",
];

/**
 * Phase-1 seed data for Class 10 HPQ.
 * You can safely extend this array for both Maths and Science.
 *
 * NOTE: We keep IDs/data you supplied intact to avoid any UI/UX regressions.
 */
export const highlyProbableQuestionsSeed: HPQTopicBucket[] = [
  // ==================== MATHS – SEED DATA ====================

  // -------------------- Maths: Real Numbers --------------------
  {
    topic: "Real Numbers",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "rn-hpq-1",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Euclid’s Division Algorithm",
        concept: "Finding HCF using Euclid’s algorithm",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Euclid’s division algorithm is used to find: (A) LCM of two numbers (B) HCF of two numbers (C) Sum of two numbers (D) Product of two numbers",
        answer: "HCF of two numbers",
        explanation:
          "Euclid’s division algorithm repeatedly applies the relation a = bq + r to get the HCF of two positive integers.",
        pastBoardYear: "2024",
        policyTag: "RN-Euclid-HCF-MCQ",
      },
      {
        id: "rn-hpq-2",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Fundamental Theorem of Arithmetic",
        concept: "Prime factorisation of integers",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Using the Fundamental Theorem of Arithmetic, find the prime factorisation of 392.",
        answer: "392 = 2³ × 7²",
        solutionSteps: [
          "Divide repeatedly by the smallest prime: 392 ÷ 2 = 196, 196 ÷ 2 = 98, 98 ÷ 2 = 49.",
          "Now 49 = 7 × 7.",
          "Hence 392 = 2 × 2 × 2 × 7 × 7 = 2³ × 7².",
        ],
        explanation:
          "Standard 2-mark pattern: express a composite number as a product of primes using the Fundamental Theorem of Arithmetic.",
        policyTag: "RN-FTA-2M",
      },
      {
        id: "rn-hpq-3",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Terminating & Non-terminating Decimals",
        concept: "Condition for terminating rational numbers",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Check whether the rational number 13/40 has a terminating decimal expansion. Justify your answer.",
        answer:
          "Yes, 13/40 has a terminating decimal expansion because in 13/40 = 13/(2³ × 5), the denominator in lowest form is of the form 2ⁿ5ᵐ.",
        solutionSteps: [
          "Express the denominator in prime factorised form: 40 = 2³ × 5.",
          "The rational number 13/40 is already in lowest terms.",
          "Since the denominator has only the prime factors 2 and 5, the decimal expansion of 13/40 is terminating.",
        ],
        explanation:
          "A rational number p/q has a terminating decimal expansion if the prime factorisation of q is of the form 2ⁿ5ᵐ, where n, m are non-negative integers.",
        policyTag: "RN-terminating-3M",
      },
      {
        id: "rn-hpq-4",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Irrational Numbers Proofs",
        concept: "Proving irrationality using contradiction",
        section: "D",
        type: "Long",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question: "Prove that √2 is an irrational number.",
        answer:
          "Assume √2 is rational, i.e., √2 = p/q in lowest terms. Squaring gives 2 = p²/q² ⇒ p² = 2q², so p² is even and hence p is even. Let p = 2k. Then 2q² = 4k² ⇒ q² = 2k², so q is also even. This contradicts the assumption that p/q is in lowest terms. Hence √2 is irrational.",
        solutionSteps: [
          "Assume √2 is rational, so √2 = p/q where p and q are coprime integers, q ≠ 0.",
          "Squaring both sides: 2 = p²/q² ⇒ p² = 2q².",
          "So p² is even, which implies p is even. Let p = 2k.",
          "Substitute back: 2q² = (2k)² = 4k² ⇒ q² = 2k², so q² is even and q is also even.",
          "If both p and q are even, they have a common factor 2, contradicting that p/q was in lowest terms. Therefore our assumption is wrong and √2 is irrational.",
        ],
        explanation:
          "This is the classic 4–5 mark proof-by-contradiction question on irrational numbers. Boards often ask for √2, √3 or similar proofs.",
        policyTag: "RN-irrationality-proof",
      },
      {
        id: "rn-hpq-5",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Applications of HCF/LCM & Decimals",
        concept: "Case-based on HCF, LCM and decimal type",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Two traffic lights change after every 20 seconds and 30 seconds respectively. (a) After how many seconds will both glow together again? (b) If the time taken for one cycle of both lights together is written as a rational number in seconds, will its decimal expansion be terminating or non-terminating? Justify.",
        answer:
          "(a) LCM of 20 and 30 is 60, so both lights glow together every 60 seconds. (b) 60 seconds is the rational number 60/1 whose denominator is 1 = 2⁰5⁰, so the decimal expansion is terminating.",
        explanation:
          "Boards often mix HCF/LCM with the terminating–non-terminating criterion in short case-based questions.",
        policyTag: "RN-LCM-case",
      },
    ],
  },

  // -------------------- Maths: Pair of Linear Equations --------------------
  {
    topic: "Pair of Linear Equations in Two Variables",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "ple-hpq-1",
        subject: "Maths",
        topic: "Pair of Linear Equations in Two Variables",
        subtopic: "Algebraic Solution Methods",
        concept: "Elimination method",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Solve the pair of linear equations: 2x + 3y = 11 and 3x − 2y = 4 using the elimination method.",
        answer: "(x, y) = (34/13, 25/13)",
        solutionSteps: [
          "Write equations in standard form and label them (1) and (2).",
          "Multiply (1) by 3 and (2) by 2 so that coefficients of x become equal.",
          "Subtract the new equations to eliminate x and solve for y.",
          "Substitute the value of y back into one of the original equations to find x.",
          "Write the final ordered pair neatly as (x, y).",
        ],
        explanation:
          "Standard 3-mark PYQ pattern: line up coefficients of one variable, eliminate it, then back-substitute.",
      },
    ],
  },

  // -------------------- Maths: Polynomials --------------------
  {
    topic: "Polynomials",
    subject: "Maths",
    defaultTier: "high-roi",
    questions: [
      {
        id: "poly-hpq-1",
        subject: "Maths",
        topic: "Polynomials",
        subtopic: "Zeros & Factorisation",
        concept: "Finding zeroes from factorised form",
        section: "B",
        type: "VeryShort",
        difficulty: "Easy",
        marks: 2,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "If a polynomial p(x) = (x − 2)(x + 3), find all zeroes of p(x).",
        answer: "2 and −3",
        solutionSteps: [
          "A zero of a polynomial is a value of x for which p(x) = 0.",
          "Set each factor equal to zero: x − 2 = 0 or x + 3 = 0.",
          "Solve to get x = 2 and x = −3.",
        ],
        explanation:
          "Very common 1–2 mark pattern: when p(x) is already factorised, just equate each factor to zero.",
      },
      {
        id: "poly-hpq-2",
        subject: "Maths",
        topic: "Polynomials",
        subtopic: "Coefficient–root Relations",
        concept: "Sum and product of zeroes of a quadratic",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "For the quadratic polynomial p(x) = 2x² − 5x + 3, find the sum and product of its zeroes using coefficient–root relations.",
        answer: "Sum of zeroes = 5/2, product of zeroes = 3/2",
        solutionSteps: [
          "Compare p(x) = 2x² − 5x + 3 with ax² + bx + c.",
          "Here a = 2, b = −5, c = 3.",
          "Use α + β = −b/a and αβ = c/a.",
          "Compute α + β = −(−5)/2 = 5/2.",
          "Compute αβ = 3/2.",
        ],
        explanation:
          "This pattern checks if you remember the formula α + β = −b/a and αβ = c/a without solving the quadratic.",
      },
    ],
  },

  // -------------------- Maths: Quadratic Equations --------------------
  {
    topic: "Quadratic Equations",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "qe-hpq-1",
        subject: "Maths",
        topic: "Quadratic Equations",
        subtopic: "Algebraic Solution",
        concept: "Quadratic formula",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Solve the quadratic equation 2x² − 3x − 5 = 0 using the quadratic formula.",
        answer: "x = (3 ± √49)/4, i.e. x = 2 or x = −5/2",
        solutionSteps: [
          "Identify a = 2, b = −3, c = −5.",
          "Write the quadratic formula: x = [−b ± √(b² − 4ac)] / (2a).",
          "Compute the discriminant: Δ = b² − 4ac = (−3)² − 4·2·(−5) = 9 + 40 = 49.",
          "Substitute into the formula and simplify.",
        ],
        explanation:
          "Basic but compulsory pattern: direct use of the quadratic formula on a board-style equation.",
      },
    ],
  },

  // -------------------- Maths: Trigonometry --------------------
  {
    topic: "Trigonometry",
    subject: "Maths",
    defaultTier: "high-roi",

    // Link this HPQ Trigonometry bucket to the predictive engine
    // (you can expand this list later as you add more trig predicted questions)
    questionIds: ["2026-TRIG-SA-01", "2026-TRIG-LA-02"],

    questions: [
      {
        id: "trig-hpq-1",
        subject: "Maths",
        topic: "Trigonometry",
        subtopic: "Trig Ratios/Values",
        concept: "Using sin²θ + cos²θ = 1",
        section: "B",
        type: "VeryShort",
        difficulty: "Easy",
        marks: 2,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "If sin θ = 3/5 and θ is acute, find cos θ using the identity sin²θ + cos²θ = 1.",
        answer: "cos θ = 4/5",
        solutionSteps: [
          "Substitute sin θ = 3/5 into sin²θ + cos²θ = 1.",
          "Compute sin²θ = 9/25.",
          "So 9/25 + cos²θ = 1 ⇒ cos²θ = 1 − 9/25 = 16/25.",
          "Since θ is acute, cos θ is positive ⇒ cos θ = 4/5.",
        ],
        explanation:
          "Core identity-based question – appears frequently in simple 2-mark forms.",
      },
    ],
  },

  // ==================== SCIENCE – SEED DATA (ALL TOPICS) ====================

  // -------------------- Science: Chemical Reactions & Equations --------------------
  {
    topic: "Chemical Reactions & Equations",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-cre-hpq-1",
        subject: "Science",
        stream: "Chemistry",
        topic: "Chemical Reactions & Equations",
        subtopic: "Balancing Equations",
        concept: "Balancing simple equations",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which of the following is the correctly balanced form of the equation for rusting? Fe + O₂ → Fe₂O₃",
        answer: "4Fe + 3O₂ → 2Fe₂O₃",
        explanation:
          "Total Fe atoms and O atoms on both sides must be equal; 4Fe + 3O₂ → 2Fe₂O₃ balances the equation.",
        pastBoardYear: "2024",
        policyTag: "MCQ balancing",
      },
      {
        id: "sci-cre-hpq-2",
        subject: "Science",
        stream: "Chemistry",
        topic: "Chemical Reactions & Equations",
        subtopic: "Types of Reactions",
        concept: "Identification of reaction type",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Identify the type of reaction for: 2KClO₃ → 2KCl + 3O₂. Write one more example of the same type.",
        answer:
          "Decomposition reaction. Example: CaCO₃ → CaO + CO₂ (thermal decomposition).",
        explanation:
          "A single compound breaking down into simpler substances is called a decomposition reaction.",
        pastBoardYear: "2023",
        policyTag: "Decomposition trend",
      },
      {
        id: "sci-cre-hpq-3",
        subject: "Science",
        stream: "Chemistry",
        topic: "Chemical Reactions & Equations",
        subtopic: "Oxidation/Reduction",
        concept: "Redox and everyday applications",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "A steel gate near the sea starts developing brown flaky patches after a few months. (a) Name the process and the type of chemical reaction involved. (b) Suggest two preventive measures. (c) Explain in brief how painting helps.",
        answer:
          "(a) Rusting; it is an oxidation/redox reaction. (b) Painting, galvanising, oiling, greasing, or using stainless steel. (c) Paint forms a protective layer, preventing oxygen and moisture from directly reaching the iron surface.",
        explanation:
          "Rusting is a slow redox process. Case-based questions frequently link daily life observations with corrosion and prevention.",
        policyTag: "Corrosion/rancidity NEP",
      },
    ],
  },

  // -------------------- Science: Acids, Bases & Salts --------------------
  {
    topic: "Acids, Bases & Salts",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-abs-hpq-1",
        subject: "Science",
        stream: "Chemistry",
        topic: "Acids, Bases & Salts",
        subtopic: "Indicators & pH",
        concept: "Litmus and pH",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "A solution turns blue litmus red and has a pH of 2. This solution is most likely: (A) Strong acid (B) Weak acid (C) Strong base (D) Neutral",
        answer: "Strong acid",
        explanation:
          "pH 2 is highly acidic and such a solution turns blue litmus red.",
        pastBoardYear: "2025",
        policyTag: "Indicator/pH MCQ",
      },
      {
        id: "sci-abs-hpq-2",
        subject: "Science",
        stream: "Chemistry",
        topic: "Acids, Bases & Salts",
        subtopic: "Reactions with Metals & Bases",
        concept: "Acid–metal reaction",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "Write the general chemical equation for the reaction of a metal with a dilute acid. Name the gas evolved and its test.",
        answer:
          "Metal + Dilute acid → Salt + Hydrogen gas; hydrogen gas is evolved, tested by the pop sound with a burning matchstick.",
        explanation:
          "Acid + metal reactions releasing hydrogen are very standard 2-mark questions.",
        policyTag: "Core reaction pattern",
      },
      {
        id: "sci-abs-hpq-3",
        subject: "Science",
        stream: "Chemistry",
        topic: "Acids, Bases & Salts",
        subtopic: "Salts & Their Uses",
        concept: "Baking soda/washing soda applications",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "Riya’s mother uses baking soda in the kitchen and washing soda in the washing machine. (a) Write the chemical names of baking soda and washing soda. (b) Give one use of each, based on their properties. (c) Why is baking powder preferred over baking soda in cakes?",
        answer:
          "Baking soda: sodium hydrogen carbonate (NaHCO₃). Washing soda: sodium carbonate decahydrate (Na₂CO₃·10H₂O). Baking soda is used in baking as a leavening agent; washing soda is used in cleaning to remove permanent hardness. Baking powder contains baking soda plus a weak acid so it does not leave a bitter taste.",
        explanation:
          "Board frequently links formula + common name + everyday application in a short case-study.",
        policyTag: "Everyday-salt NEP",
      },
    ],
  },

  // -------------------- Science: Metals & Non-metals --------------------
  {
    topic: "Metals & Non-metals",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "high-roi",
    questions: [
      {
        id: "2026-MNM-01",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Physical & Chemical Properties",
        concept: "Physical properties of metals",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Which metal is softest? (A) Sodium (B) Iron (C) Zinc (D) Copper",
        answer: "Sodium",
        explanation: "Sodium is so soft that it can be easily cut with a knife.",
        pastBoardYear: "2024",
        policyTag: "MCQ/Fact",
      },
      {
        id: "2026-MNM-02",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Physical & Chemical Properties",
        concept: "Reaction of non-metals with water",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "How do non-metals generally react with water? (A) Vigorously (B) Slowly (C) Not at all (D) Explosively",
        answer: "Not at all",
        explanation: "Non-metals usually do not react with water directly.",
        pastBoardYear: "2025",
        policyTag: "Board MCQ trend",
      },
      {
        id: "2026-MNM-03",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Reactivity Series",
        concept: "Metal displacement reactions",
        section: "A",
        type: "AssertionReason",
        kind: "assertion-reason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Analysing",
        question:
          "Assertion: Zinc will displace copper from copper sulphate solution. Reason: Zinc is above copper in the activity series.",
        assertion:
          "Zinc will displace copper from copper sulphate solution.",
        reason: "Zinc is above copper in the activity series.",
        aROptions: [
          {
            label: "A",
            text: "Both A and R are true, and R is the correct explanation of A.",
          },
          {
            label: "B",
            text: "Both A and R are true, but R is not the correct explanation of A.",
          },
          { label: "C", text: "A is true but R is false." },
          { label: "D", text: "A is false but R is true." },
        ],
        correctOption: "A",
        explanation:
          "More reactive metals displace less reactive ones from their salt solutions.",
        pastBoardYear: "2023",
        policyTag: "AR mandatory",
      },
      {
        id: "2026-MNM-04",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Ores & Extraction",
        concept: "Extraction of iron",
        section: "B",
        type: "Short",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "Name the main step used to extract iron from hematite in the blast furnace. Describe briefly.",
        answer:
          "Reduction of iron oxide by carbon monoxide in the blast furnace.",
        explanation:
          "In the blast furnace, carbon monoxide reduces Fe₂O₃ to molten iron: Fe₂O₃ + 3CO → 2Fe + 3CO₂.",
        pastBoardYear: "2022",
        policyTag: "NEP: process focus",
      },
      {
        id: "2026-MNM-05",
        subject: "Science",
        stream: "Chemistry",
        topic: "Metals & Non-metals",
        subtopic: "Corrosion Prevention",
        concept: "Corrosion prevention methods",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "Rohan’s bicycle rusts quickly in a coastal area. Suggest two methods to prevent rusting and briefly explain why each method works.",
        answer: "Painting and applying oil/grease or galvanising.",
        explanation:
          "Painting and oil/grease create a protective layer, preventing oxygen and water from reaching the iron surface. Galvanising coats iron with zinc which is more reactive and protects by sacrificial action.",
        pastBoardYear: "2025",
        policyTag: "Case/resistivity NEP",
      },
    ],
  },

  // -------------------- Science: Carbon & its Compounds --------------------
  {
    topic: "Carbon & its Compounds",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-cic-hpq-1",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Covalent Bonding",
        concept: "Nature of carbon bonds",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "The bond formed between two carbon atoms in ethane (C₂H₆) is: (A) Ionic (B) Double covalent (C) Single covalent (D) Triple covalent",
        answer: "Single covalent",
        explanation:
          "In ethane, each carbon is sp³ hybridised and shares a single covalent bond with the other carbon.",
        policyTag: "Covalent basics",
      },
      {
        id: "sci-cic-hpq-2",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Homologous Series",
        concept: "General formula and property trend",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Define a homologous series. State any two characteristics of a homologous series of alkanes.",
        answer:
          "A homologous series is a group of organic compounds having the same functional group and general formula with successive members differing by a –CH₂– unit. In alkanes: (i) They have the general formula CₙH₂ₙ₊₂. (ii) They show a gradual increase in physical properties like boiling point as molecular mass increases.",
        explanation:
          "Definition + two properties is a very standard 3-mark pattern for homologous series.",
        policyTag: "Homologous must-ask",
      },
      {
        id: "sci-cic-hpq-3",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Nomenclature",
        concept: "IUPAC naming",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Give the IUPAC names of CH₃–CH₂–CH₂–OH and CH₃–CH₂–COOH.",
        answer: "Propan-1-ol and propanoic acid.",
        explanation:
          "Identify the longest carbon chain and functional group; use suffix -ol for alcohol and -oic acid for carboxylic acid.",
        policyTag: "Nomenclature 2M",
      },
      {
        id: "sci-cic-hpq-4",
        subject: "Science",
        stream: "Chemistry",
        topic: "Carbon & its Compounds",
        subtopic: "Important Reactions",
        concept: "Soap vs detergent case-based",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "A student observes that soap lathers less in hard water but a synthetic detergent lathers well. (a) Explain the reason. (b) Write one advantage of detergents over soaps and one environmental disadvantage.",
        answer:
          "Hard water contains Ca²⁺/Mg²⁺ ions which form insoluble scum with soap, reducing lather. Detergents form soluble salts so they lather even in hard water. Advantage: work in hard water; disadvantage: many detergents are non-biodegradable and cause water pollution.",
        explanation:
          "Board favours application Qs linking organic compounds to real-life cleaning and pollution issues.",
        policyTag: "NEP: environment link",
      },
    ],
  },

  // -------------------- Science: Life Processes --------------------
  {
    topic: "Life Processes",
    subject: "Science",
    stream: "Biology",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-lp-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Nutrition",
        concept: "Modes of nutrition",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "In humans, the mode of nutrition is: (A) Autotrophic (B) Heterotrophic–saprophytic (C) Heterotrophic–holozoic (D) Parasitic",
        answer: "Heterotrophic–holozoic",
        explanation:
          "Humans ingest, digest, absorb and assimilate food – holozoic nutrition.",
        policyTag: "Core Bio MCQ",
      },
      {
        id: "sci-lp-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Respiration",
        concept: "Aerobic vs anaerobic respiration",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Differentiate between aerobic and anaerobic respiration in any three points.",
        answer:
          "Aerobic: (i) Takes place in presence of oxygen. (ii) End products are CO₂ and water. (iii) Large amount of energy is released. Anaerobic: (i) Takes place in absence of oxygen. (ii) End products may be alcohol and CO₂ or lactic acid. (iii) Less energy is released.",
        explanation:
          "Tabular ‘difference between’ questions on respiration are frequent 3-markers.",
        policyTag: "Respiration diff",
      },
      {
        id: "sci-lp-hpq-3",
        subject: "Science",
        stream: "Biology",
        topic: "Life Processes",
        subtopic: "Circulation",
        concept: "Double circulation / heart diagram",
        section: "D",
        type: "Diagram",
        difficulty: "Medium",
        marks: 5,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Draw a labelled diagram of the human heart and explain the route of blood flow to show double circulation.",
        answer:
          "Diagram with four chambers (RA, RV, LA, LV), major arteries/veins, and explanation of pulmonary and systemic circulation.",
        explanation:
          "Life Processes often carries a 5-mark diagram-based question on heart or nephron coupled with explanation.",
        policyTag: "Diagram + explanation",
      },
    ],
  },

  // -------------------- Science: How do Organisms Reproduce? --------------------
  {
    topic: "How do Organisms Reproduce?",
    subject: "Science",
    stream: "Biology",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-hdor-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "How do Organisms Reproduce?",
        subtopic: "Asexual Reproduction",
        concept: "Binary fission",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Binary fission is commonly seen in: (A) Amoeba (B) Hydra (C) Planaria (D) Spirogyra",
        answer: "Amoeba",
        explanation:
          "Amoeba reproduces by binary fission; Hydra uses budding and Planaria regeneration.",
        policyTag: "Bio MCQ",
      },
      {
        id: "sci-hdor-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "How do Organisms Reproduce?",
        subtopic: "Human Reproductive System",
        concept: "Male/female gametes and fertilisation",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "State the roles of (i) testes, (ii) ovaries and (iii) fallopian tubes in human reproduction.",
        answer:
          "Testes produce sperm and testosterone; ovaries produce ova and female hormones; fallopian tubes transport the ovum and are the site of fertilisation.",
        explanation:
          "Short direct theory questions on human reproduction are frequent and high scoring.",
        policyTag: "Reproduction concept",
      },
      {
        id: "sci-hdor-hpq-3",
        subject: "Science",
        stream: "Biology",
        topic: "How do Organisms Reproduce?",
        subtopic: "Contraception/STD Awareness",
        concept: "Case-based on spacing/STD prevention",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Analysing",
        question:
          "A couple wants to delay pregnancy and also protect themselves from sexually transmitted diseases. (a) Name one method that helps them achieve both. (b) Name one permanent method of birth control. (c) Why is it important to create awareness about STDs among adolescents?",
        answer:
          "(a) Use of condoms. (b) Surgical methods such as tubectomy or vasectomy. (c) STDs can cause serious health problems and spread silently; awareness helps in prevention, early detection and safe practices.",
        explanation:
          "Reproductive health, contraception and STD awareness are strongly emphasised in NEP-aligned case-based questions.",
        policyTag: "NEP health/awareness",
      },
    ],
  },

  // -------------------- Science: Light – Reflection & Refraction --------------------
  {
    topic: "Light – Reflection & Refraction",
    subject: "Science",
    stream: "Physics",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-light-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Light – Reflection & Refraction",
        subtopic: "Mirror Formula & Diagrams",
        concept: "Use of concave mirror",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which mirror is used by dentists to see an enlarged image of teeth? (A) Plane mirror (B) Convex mirror (C) Concave mirror (D) Any mirror",
        answer: "Concave mirror",
        explanation:
          "Concave mirrors can form erect, enlarged images of objects placed between the pole and focus.",
        policyTag: "Mirror use MCQ",
      },
      {
        id: "sci-light-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Light – Reflection & Refraction",
        subtopic: "Lens Formula & Diagrams",
        concept: "Numerical on lens formula",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "An object is placed at 30 cm in front of a convex lens of focal length 15 cm. Find the position and nature of the image formed.",
        answer:
          "Using 1/f = 1/v − 1/u with f = +15 cm and u = −30 cm ⇒ v = +30 cm. Image is real, inverted and of same size as object.",
        solutionSteps: [
          "Take sign convention: u = −30 cm, f = +15 cm.",
          "Use lens formula 1/f = 1/v − 1/u.",
          "Substitute values: 1/15 = 1/v + 1/30 ⇒ 1/v = 1/15 − 1/30 = 1/30.",
          "So v = +30 cm. Positive v means image on other side (real and inverted).",
        ],
        explanation:
          "Lens formula numericals with simple focal length and object distances are common 3-markers.",
        policyTag: "Lens numeric",
      },
      {
        id: "sci-light-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Light – Reflection & Refraction",
        subtopic: "Refraction/Sign Convention",
        concept: "Ray diagram at glass–air surface",
        section: "D",
        type: "Diagram",
        difficulty: "Medium",
        marks: 5,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Draw a labelled ray diagram to show refraction of light when it passes from a denser medium (glass) to a rarer medium (air). Mark the angle of incidence, angle of refraction and normal. State Snell’s law.",
        answer:
          "Ray bending away from the normal on going from glass to air; definition of Snell’s law with n₁ sin i = n₂ sin r.",
        explanation:
          "Diagrams plus law-based reasoning on refraction commonly appear as mixed theory-diagram questions.",
        policyTag: "Refraction diagram",
      },
    ],
  },

  // -------------------- Science: Human Eye & Colourful World --------------------
  {
    topic: "Human Eye & Colourful World",
    subject: "Science",
    stream: "Physics",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-eye-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Human Eye & Colourful World",
        subtopic: "Defects & Correction",
        concept: "Myopia / hypermetropia",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Which lens is used to correct hypermetropia? (A) Concave lens (B) Convex lens (C) Cylindrical lens (D) Bifocal lens",
        answer: "Convex lens",
        explanation:
          "Hypermetropia (long-sightedness) is corrected using a converging (convex) lens.",
        policyTag: "Defects MCQ",
      },
      {
        id: "sci-eye-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Human Eye & Colourful World",
        subtopic: "Structure of Eye",
        concept: "Power of accommodation",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question: "What is meant by the power of accommodation of the eye?",
        answer:
          "The ability of the eye lens to adjust its focal length so as to focus both near and distant objects on the retina is called power of accommodation.",
        explanation:
          "Short definition questions on eye structure and functioning are common 2-markers.",
        policyTag: "Eye theory",
      },
      {
        id: "sci-eye-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Human Eye & Colourful World",
        subtopic: "Dispersion & Scattering",
        concept: "Blue colour of sky / red at sunset",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Analysing",
        question:
          "During daytime the sky appears blue but at sunrise and sunset it appears reddish. Explain this observation on the basis of scattering of light.",
        answer:
          "Shorter wavelengths (blue) are scattered more in all directions by air molecules, so the sky appears blue. At sunrise/sunset, sunlight travels a longer path and most of blue light is scattered out; only longer wavelengths (red/orange) reach the observer, so the sun and surrounding sky appear reddish.",
        explanation:
          "Scattering-based explanation of sky colour is a favourite conceptual 3–4 mark question.",
        policyTag: "Scattering NEP",
      },
    ],
  },

  // -------------------- Science: Electricity --------------------
  {
    topic: "Electricity",
    subject: "Science",
    stream: "Physics",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-elec-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Ohm’s Law & V–I Graph",
        concept: "Using Ohm’s law",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "According to Ohm’s law, the V–I graph for a metallic conductor at constant temperature is: (A) A curve (B) A straight line through origin (C) A circle (D) A parabola",
        answer: "A straight line through origin",
        explanation:
          "V ∝ I at constant temperature; hence the graph is a straight line through origin.",
        policyTag: "Ohm’s law MCQ",
      },
      {
        id: "sci-elec-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Resistance in Series/Parallel",
        concept: "Equivalent resistance",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Three resistors of 2 Ω, 3 Ω and 6 Ω are connected in parallel. Find their equivalent resistance.",
        answer: "1/R = 1/2 + 1/3 + 1/6 = 1 ⇒ R = 1 Ω.",
        solutionSteps: [
          "Use parallel formula: 1/R = 1/R₁ + 1/R₂ + 1/R₃.",
          "Substitute values: 1/R = 1/2 + 1/3 + 1/6.",
          "Take LCM of 2, 3 and 6: 1/2 = 3/6, 1/3 = 2/6, 1/6 = 1/6.",
          "Add: 3/6 + 2/6 + 1/6 = 6/6 = 1, so 1/R = 1.",
          "Therefore R = 1 Ω.",
        ],
        explanation:
          "Parallel combination numericals are standard; examiner checks correct formula and substitution.",
        policyTag: "Series/parallel numeric",
      },
      {
        id: "sci-elec-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Electric Power",
        concept: "Power and energy cost",
        section: "D",
        type: "Long",
        difficulty: "Medium",
        marks: 5,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "An electric heater of power 1000 W is used for 5 hours every day for 30 days. Calculate (a) total electrical energy consumed in kWh, and (b) cost of using the heater at ₹7 per kWh.",
        answer:
          "Energy = 1 kW × 5 h/day × 30 days = 150 kWh. Cost = 150 × ₹7 = ₹1050.",
        explanation:
          "Power × time gives energy in kWh when power is in kW and time in hours; board loves this direct application.",
        policyTag: "Power/energy numeric",
      },
      {
        id: "sci-elec-hpq-4",
        subject: "Science",
        stream: "Physics",
        topic: "Electricity",
        subtopic: "Heating Effect",
        concept: "Case-based on fuse/overheating",
        section: "E",
        type: "CaseBased",
        difficulty: "Medium",
        marks: 4,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "A student uses a thin wire as a fuse in the circuit. (a) Why is a fuse always connected in series? (b) On what principle does it work? (c) What will happen to the fuse wire if current exceeds the safe limit?",
        answer:
          "(a) Fuse is in series so that it can stop the entire current if it blows. (b) It works on the heating effect of electric current. (c) The wire melts and breaks the circuit when current exceeds the rated value.",
        explanation:
          "Fuse, MCB and heating effect concepts appear frequently as conceptual case-based questions.",
        policyTag: "Safety/heating NEP",
      },
    ],
  },

  // -------------------- Science: Magnetic Effects of Electric Current --------------------
  {
    topic: "Magnetic Effects of Electric Current",
    subject: "Science",
    stream: "Physics",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-mec-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Magnetic Effects of Electric Current",
        subtopic: "Field Lines & Rules",
        concept: "Right-hand thumb rule",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "Right-hand thumb rule gives the direction of: (A) Force on a conductor (B) Magnetic field around a straight conductor (C) Current in a coil (D) Induced current",
        answer: "Magnetic field around a straight conductor",
        explanation:
          "Right-hand thumb rule relates current direction (thumb) to magnetic field direction (curling fingers).",
        policyTag: "Field lines MCQ",
      },
      {
        id: "sci-mec-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Magnetic Effects of Electric Current",
        subtopic: "Electromagnet & Solenoid",
        concept: "Solenoid vs bar magnet",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "How does a solenoid behave like a bar magnet? Draw the field pattern and mark its poles.",
        answer:
          "A current-carrying solenoid produces a magnetic field similar to a bar magnet, with one end behaving as N-pole and the other as S-pole. Field lines emerge from the north end and enter the south end, forming closed loops.",
        explanation:
          "Solenoid field diagram and explanation is a favourite application of current–magnetism link.",
        policyTag: "Solenoid pattern",
      },
      {
        id: "sci-mec-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Magnetic Effects of Electric Current",
        subtopic: "Electric Motor/Generator",
        concept: "Fleming’s left-hand rule AR",
        section: "A",
        type: "AssertionReason",
        kind: "assertion-reason",
        difficulty: "Medium",
        marks: 1,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Analysing",
        question:
          "Assertion: Fleming’s left-hand rule gives the direction of force on a current-carrying conductor in a magnetic field. Reason: According to the rule, thumb, forefinger and middle finger represent force, magnetic field and current respectively, all mutually perpendicular.",
        assertion:
          "Fleming’s left-hand rule gives the direction of force on a current-carrying conductor in a magnetic field.",
        reason:
          "According to the rule, thumb, forefinger and middle finger represent force, magnetic field and current respectively, all mutually perpendicular.",
        aROptions: [
          {
            label: "A",
            text: "Both A and R are true, and R is the correct explanation of A.",
          },
          {
            label: "B",
            text: "Both A and R are true, but R is not the correct explanation of A.",
          },
          { label: "C", text: "A is true but R is false." },
          { label: "D", text: "A is false but R is true." },
        ],
        correctOption: "A",
        explanation:
          "The rule is used for direction of force; the mapping of fingers is correctly stated, so R explains A.",
        policyTag: "AR motor rule",
      },
    ],
  },

  // -------------------- Maths & rest of topics (as provided) --------------------
  // (Retained exactly as in your message to avoid any visual/logic regressions.)
  // Real Numbers (Maths) - again (for extended seeds)
  {
    topic: "Real Numbers",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "math-real-hpq-1",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Euclid’s division algorithm",
        concept: "Meaning & use of Euclid’s algorithm",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Euclid’s division algorithm is mainly used to find: (A) LCM of two numbers (B) HCF of two numbers (C) Product of two numbers (D) Sum of two numbers",
        answer: "HCF of two numbers",
        solutionSteps: [
          "Recall the statement: given positive integers a and b, there exist unique integers q and r such that a = bq + r, 0 ≤ r < b.",
          "We repeatedly apply the division lemma to reduce the larger number until remainder is 0.",
          "The last non-zero remainder obtained in this process is the HCF of the two numbers.",
        ],
        explanation:
          "Board often asks the basic purpose of Euclid’s division algorithm in 1-mark MCQs.",
      },
      {
        id: "math-real-hpq-2",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Euclid’s division algorithm",
        concept: "Finding HCF using Euclid",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Use Euclid’s division algorithm to find the HCF of 91 and 65.",
        answer: "HCF(91, 65) = 13",
        solutionSteps: [
          "Apply division: 91 = 65 × 1 + 26.",
          "Next: 65 = 26 × 2 + 13.",
          "Next: 26 = 13 × 2 + 0, so remainder becomes 0.",
          "Therefore, the last non-zero remainder = 13 is the HCF.",
        ],
        explanation:
          "Typical 2-mark Euclid question – 2 or 3 division steps with final HCF clearly stated.",
      },
      {
        id: "math-real-hpq-3",
        subject: "Maths",
        topic: "Real Numbers",
        subtopic: "Fundamental Theorem of Arithmetic",
        concept: "Irrationality proof using prime factorisation",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question: "Prove that √5 is irrational.",
        answer:
          "Assuming √5 rational leads to a contradiction; hence √5 is irrational.",
        solutionSteps: [
          "Assume √5 is rational. Then √5 = p/q, where p and q are coprime integers and q ≠ 0.",
          "Square both sides: 5 = p²/q² ⇒ p² = 5q².",
          "So p² is divisible by 5 ⇒ p is divisible by 5. Let p = 5k.",
          "Substitute: (5k)² = 5q² ⇒ 25k² = 5q² ⇒ q² = 5k², so q is also divisible by 5.",
          "This contradicts the assumption that p and q are coprime. Therefore √5 is irrational.",
        ],
        explanation:
          "Classic 3-mark proof using Fundamental Theorem of Arithmetic; appears often in Real Numbers.",
      },
    ],
  },

  // -------------------- Maths: Arithmetic Progressions --------------------
  {
    topic: "Arithmetic Progressions",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "math-ap-hpq-1",
        subject: "Maths",
        topic: "Arithmetic Progressions",
        subtopic: "Basics of AP",
        concept: "Identify AP and common difference",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "Which of the following is an arithmetic progression (AP)? (A) 2, 4, 8, 16 (B) 3, 6, 9, 12 (C) 1, 3, 6, 10 (D) 1, 2, 4, 7",
        answer: "3, 6, 9, 12 (common difference 3)",
        solutionSteps: [
          "In an AP, the difference between consecutive terms is constant.",
          "Check each option: only 3, 6, 9, 12 has a constant difference of 3.",
        ],
        explanation:
          "Simple identification of AP and common difference is a standard 1-mark question.",
      },
      {
        id: "math-ap-hpq-2",
        subject: "Maths",
        topic: "Arithmetic Progressions",
        subtopic: "nth term",
        concept: "Finding term number from value",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "The 4th term of an AP is 11 and the 9th term is 26. Find the first term and common difference.",
        answer: "First term a = 3, common difference d = 2",
        solutionSteps: [
          "Use formula: aₙ = a + (n − 1)d.",
          "For n = 4: a + 3d = 11. For n = 9: a + 8d = 26.",
          "Subtract: (a + 8d) − (a + 3d) = 26 − 11 ⇒ 5d = 15 ⇒ d = 3.",
          "Substitute in a + 3d = 11 ⇒ a + 9 = 11 ⇒ a = 2.",
        ],
        explanation:
          "Pair of linear equations in a and d often appears as a 2-mark AP question.",
      },
      {
        id: "math-ap-hpq-3",
        subject: "Maths",
        topic: "Arithmetic Progressions",
        subtopic: "Sum of n terms",
        concept: "Use of Sₙ formula",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question: "Find the sum of first 30 terms of the AP 7, 10, 13, ...",
        answer: "S₃₀ = 1740",
        solutionSteps: [
          "Here a = 7, d = 3, n = 30.",
          "Use Sₙ = n/2 [2a + (n − 1)d].",
          "Compute: S₃₀ = 30/2 [2×7 + 29×3] = 15 [14 + 87] = 15 × 101 = 1515.",
        ],
        explanation:
          "Direct substitution in Sₙ formula is a standard 3-mark pattern in AP.",
      },
    ],
  },

  // -------------------- Maths: Triangles --------------------
  {
    topic: "Triangles",
    subject: "Maths",
    defaultTier: "must-crack",
    questions: [
      {
        id: "math-tri-hpq-1",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Similarity criteria",
        concept: "AA similarity",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "If two angles of one triangle are equal to two angles of another triangle, then the triangles are: (A) Congruent (B) Isosceles (C) Similar (D) Right-angled",
        answer: "Similar",
        solutionSteps: [
          "AA (Angle-Angle) criterion states: if two angles of one triangle are equal to two angles of another triangle, the triangles are similar.",
        ],
        explanation:
          "Direct AA similarity recall is a frequently asked 1-mark question.",
      },
      {
        id: "math-tri-hpq-2",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Basic proportionality theorem",
        concept: "Using BPT in numerical",
        section: "C",
        type: "Short",
        difficulty: "Medium",
        marks: 3,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "In ΔABC, DE ∥ BC with D on AB and E on AC. If AD = 3 cm, DB = 5 cm and AE = 4.5 cm, find AC.",
        answer: "AC = 12 cm",
        solutionSteps: [
          "Since DE ∥ BC, by Basic Proportionality Theorem AD/DB = AE/EC.",
          "AD/DB = 3/5, and AE = 4.5.",
          "Let EC = x. Then 3/5 = 4.5/x ⇒ 3x = 22.5 ⇒ x = 7.5.",
          "So AC = AE + EC = 4.5 + 7.5 = 12 cm.",
        ],
        explanation:
          "Standard use of BPT connecting segments on sides with a line parallel to the third side.",
      },
      {
        id: "math-tri-hpq-3",
        subject: "Maths",
        topic: "Triangles",
        subtopic: "Area of similar triangles",
        concept: "Area ratio = square of sides ratio",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Analysing",
        question:
          "Two similar triangles have corresponding sides in the ratio 3 : 5. Find the ratio of their areas and explain your reasoning.",
        answer: "Ratio of areas = 9 : 25",
        solutionSteps: [
          "If two triangles are similar, ratio of their areas equals square of the ratio of corresponding sides.",
          "Given side ratio = 3 : 5.",
          "Therefore area ratio = 3² : 5² = 9 : 25.",
        ],
        explanation:
          "Area of similar triangles relation is a favourite conceptual 3-mark question.",
      },
    ],
  },

  // -------------------- Science: Periodic Classification of Elements --------------------
  {
    topic: "Periodic Classification of Elements",
    subject: "Science",
    stream: "Chemistry",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-pce-hpq-1",
        subject: "Science",
        stream: "Chemistry",
        topic: "Periodic Classification of Elements",
        subtopic: "Modern periodic table",
        concept: "Definition & trend",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "In the modern periodic table, elements are arranged in the increasing order of: (A) Atomic mass (B) Atomic number (C) Valency (D) Number of neutrons",
        answer: "Atomic number",
        explanation:
          "Henry Moseley’s modern periodic law states that properties of elements are periodic functions of atomic number.",
      },
      {
        id: "sci-pce-hpq-2",
        subject: "Science",
        stream: "Chemistry",
        topic: "Periodic Classification of Elements",
        subtopic: "Trends",
        concept: "Valency & size across period",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "How does atomic size change on moving from left to right across a period in the modern periodic table? Give reason.",
        answer:
          "Atomic size decreases from left to right across a period because effective nuclear charge increases while the number of shells remains the same.",
        explanation:
          "Explaining trends (atomic radius, valency, metallic character) is common in 2-mark questions.",
      },
      {
        id: "sci-pce-hpq-3",
        subject: "Science",
        stream: "Chemistry",
        topic: "Periodic Classification of Elements",
        subtopic: "Position of metals/non-metals",
        concept: "Metals, non-metals and metalloids",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Applying",
        question:
          "State any three differences between metals and non-metals on the basis of their position and properties in the modern periodic table.",
        answer:
          "Metals: generally on left and centre, form cations, are good conductors, etc. Non-metals: on right, form anions, are poor conductors, etc. (Any three well-explained points).",
        explanation:
          "Board frequently asks comparison-type questions tying periodic table position to properties.",
      },
    ],
  },

  // -------------------- Science: Control and Coordination --------------------
  {
    topic: "Control and Coordination",
    subject: "Science",
    stream: "Biology",
    defaultTier: "must-crack",
    questions: [
      {
        id: "sci-cc-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "Control and Coordination",
        subtopic: "Plant hormones",
        concept: "Auxin, gibberellin, cytokinin, etc.",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "must-crack",
        bloomSkill: "Remembering",
        question:
          "Which plant hormone is responsible for cell elongation in stem? (A) Auxin (B) Cytokinin (C) Ethylene (D) Abscisic acid",
        answer: "Auxin",
        explanation:
          "Auxin promotes cell elongation and is concentrated on the shaded side of a plant shoot.",
      },
      {
        id: "sci-cc-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "Control and Coordination",
        subtopic: "Human nervous system",
        concept: "Reflex arc",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "must-crack",
        bloomSkill: "Understanding",
        question:
          "What is a reflex action? Draw the pathway of a simple reflex arc.",
        answer:
          "Reflex action is an automatic, rapid response to a stimulus, controlled by the spinal cord. Diagram should show receptor → sensory neuron → spinal cord → motor neuron → effector.",
        explanation:
          "Short theory + labelled diagram on reflex arc is a favourite 2-mark pattern.",
      },
      {
        id: "sci-cc-hpq-3",
        subject: "Science",
        stream: "Biology",
        topic: "Control and Coordination",
        subtopic: "Endocrine system",
        concept: "Role of hormones",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "must-crack",
        bloomSkill: "Applying",
        question:
          "Name any three endocrine glands in human beings and write one function of each.",
        answer:
          "Pituitary – master gland, controls other glands and growth; Thyroid – secretes thyroxine, regulates metabolism; Pancreas – secretes insulin, maintains blood sugar (any three correct pairs).",
        explanation:
          "Board often tests understanding of hormone–gland–function mapping.",
      },
    ],
  },

  // -------------------- Science: Heredity and Evolution --------------------
  {
    topic: "Heredity and Evolution",
    subject: "Science",
    stream: "Biology",
    defaultTier: "high-roi",
    questions: [
      {
        id: "sci-he-hpq-1",
        subject: "Science",
        stream: "Biology",
        topic: "Heredity and Evolution",
        subtopic: "Mendel’s experiments",
        concept: "Monohybrid cross",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "high-roi",
        bloomSkill: "Remembering",
        question:
          "In Mendel’s monohybrid cross of tall and dwarf pea plants, F₁ generation had: (A) all tall plants (B) all dwarf plants (C) 3 tall : 1 dwarf (D) 1 tall : 3 dwarf",
        answer: "all tall plants",
        explanation:
          "Tallness is dominant over dwarfness, so all F₁ plants are tall.",
      },
      {
        id: "sci-he-hpq-2",
        subject: "Science",
        stream: "Biology",
        topic: "Heredity and Evolution",
        subtopic: "Sex determination",
        concept: "XX–XY mechanism",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "high-roi",
        bloomSkill: "Understanding",
        question:
          "How is the sex of a child determined in humans? Explain briefly.",
        answer:
          "Mother always contributes X chromosome. Father contributes either X or Y. XX combination gives girl, XY gives boy. Hence the father determines the sex of the child.",
        explanation:
          "Short conceptual explanation of XX–XY mechanism is often asked for 2 marks.",
      },
      {
        id: "sci-he-hpq-3",
        subject: "Science",
        stream: "Biology",
        topic: "Heredity and Evolution",
        subtopic: "Evolution evidence",
        concept: "Homologous and analogous organs",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium-High",
        tier: "high-roi",
        bloomSkill: "Analysing",
        question:
          "Differentiate between homologous and analogous organs with one example of each. What do homologous organs indicate?",
        answer:
          "Homologous organs: same basic structure but different functions (e.g. forelimb of humans and wings of birds), indicating common ancestry. Analogous organs: different structure but same function (e.g. wings of butterfly and bird).",
        explanation:
          "This question links morphology to evidence for evolution – high-yield concept.",
      },
    ],
  },

  // -------------------- Science: Sources of Energy --------------------
  {
    topic: "Sources of Energy",
    subject: "Science",
    stream: "Physics",
    defaultTier: "good-to-do",
    questions: [
      {
        id: "sci-soe-hpq-1",
        subject: "Science",
        stream: "Physics",
        topic: "Sources of Energy",
        subtopic: "Characteristics of good fuel",
        concept: "Ideal fuel properties",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "good-to-do",
        bloomSkill: "Remembering",
        question:
          "Which of the following is NOT a characteristic of an ideal fuel? (A) High calorific value (B) Easy availability (C) Produces lots of smoke (D) Easy to store and transport",
        answer: "Produces lots of smoke",
        explanation: "Ideal fuel should burn without smoke and pollution.",
      },
      {
        id: "sci-soe-hpq-2",
        subject: "Science",
        stream: "Physics",
        topic: "Sources of Energy",
        subtopic: "Renewable vs non-renewable",
        concept: "Definitions",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "Medium-High",
        tier: "good-to-do",
        bloomSkill: "Understanding",
        question:
          "Differentiate between renewable and non-renewable sources of energy with one example of each.",
        answer:
          "Renewable: can be replenished in a short time (e.g. solar energy). Non-renewable: get exhausted over time and cannot be quickly replenished (e.g. coal, petroleum).",
        explanation:
          "Short definition + examples is a frequent 2-mark eco-concept.",
      },
      {
        id: "sci-soe-hpq-3",
        subject: "Science",
        stream: "Physics",
        topic: "Sources of Energy",
        subtopic: "Environmental impact",
        concept: "Fossil fuel problems",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium",
        tier: "good-to-do",
        bloomSkill: "Evaluating",
        question:
          "State any three disadvantages of using fossil fuels as a source of energy.",
        answer:
          "Burning fossil fuels causes air pollution, contributes to greenhouse effect and global warming, and they are non-renewable so will eventually be exhausted (any three valid points).",
        explanation:
          "Linking energy use to environment and sustainability fits NEP-style questions.",
      },
    ],
  },

  // -------------------- Science: Our Environment --------------------
  {
    topic: "Our Environment",
    subject: "Science",
    stream: "General",
    defaultTier: "good-to-do",
    questions: [
      {
        id: "sci-env-hpq-1",
        subject: "Science",
        stream: "General",
        topic: "Our Environment",
        subtopic: "Food chains & webs",
        concept: "Trophic levels",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "Very High",
        tier: "good-to-do",
        bloomSkill: "Remembering",
        question:
          "In a food chain, green plants are: (A) Primary consumers (B) Secondary consumers (C) Producers (D) Decomposers",
        answer: "Producers",
        explanation:
          "Green plants prepare food by photosynthesis and form the first trophic level.",
      },
      {
        id: "sci-env-hpq-2",
        subject: "Science",
        stream: "General",
        topic: "Our Environment",
        subtopic: "Ozone layer",
        concept: "Ozone depletion",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "High",
        tier: "good-to-do",
        bloomSkill: "Understanding",
        question:
          "What is ozone hole? Name one group of chemicals responsible for ozone depletion.",
        answer:
          "The thinning of ozone layer over the Antarctic region is called ozone hole. Chlorofluorocarbons (CFCs) are mainly responsible.",
        explanation:
          "Concept questions on ozone depletion club environment + chemistry.",
      },
      {
        id: "sci-env-hpq-3",
        subject: "Science",
        stream: "General",
        topic: "Our Environment",
        subtopic: "Biodegradable & non-biodegradable",
        concept: "Waste management",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium",
        tier: "good-to-do",
        bloomSkill: "Analysing",
        question:
          "Differentiate between biodegradable and non-biodegradable waste with two examples of each. Why is non-biodegradable waste a cause of concern?",
        answer:
          "Biodegradable: decomposed by microorganisms (e.g. vegetable peels, paper). Non-biodegradable: not easily decomposed (e.g. plastics, metals). Non-biodegradable waste accumulates, pollutes soil and water and enters food chains.",
        explanation:
          "Board links waste classification with long-term environmental impact.",
      },
    ],
  },

  // -------------------- Science: Management of Natural Resources --------------------
  {
    topic: "Management of Natural Resources",
    subject: "Science",
    stream: "General",
    defaultTier: "good-to-do",
    questions: [
      {
        id: "sci-mnr-hpq-1",
        subject: "Science",
        stream: "General",
        topic: "Management of Natural Resources",
        subtopic: "5 Rs",
        concept: "Sustainable use",
        section: "A",
        type: "MCQ",
        difficulty: "Easy",
        marks: 1,
        likelihood: "High",
        tier: "good-to-do",
        bloomSkill: "Remembering",
        question:
          "Which of the following is NOT one of the 5 Rs of waste management? (A) Refuse (B) Reuse (C) Recycle (D) React",
        answer: "React",
        explanation:
          "The 5 Rs are Refuse, Reduce, Reuse, Repurpose and Recycle.",
      },
      {
        id: "sci-mnr-hpq-2",
        subject: "Science",
        stream: "General",
        topic: "Management of Natural Resources",
        subtopic: "Forests and wildlife",
        concept: "Conservation",
        section: "B",
        type: "VeryShort",
        difficulty: "Medium",
        marks: 2,
        likelihood: "Medium-High",
        tier: "good-to-do",
        bloomSkill: "Understanding",
        question:
          "Why should we conserve forests and wildlife? Give any two reasons.",
        answer:
          "They maintain ecological balance and biodiversity; provide many resources like timber, medicines and raw materials; and protect soil and water (any two well-explained reasons).",
        explanation:
          "Conceptual 2-mark questions stress value-based reasoning on conservation.",
      },
      {
        id: "sci-mnr-hpq-3",
        subject: "Science",
        stream: "General",
        topic: "Management of Natural Resources",
        subtopic: "Water resources",
        concept: "Dams & social issues",
        section: "C",
        type: "Short",
        difficulty: "Hard",
        marks: 3,
        likelihood: "Medium",
        tier: "good-to-do",
        bloomSkill: "Evaluating",
        question:
          "Large dams have both advantages and disadvantages. State any two advantages and two disadvantages of constructing large dams.",
        answer:
          "Advantages: store water for irrigation and drinking; generate hydroelectric power; help in flood control. Disadvantages: submerge large areas and displace people; can cause ecological imbalance and loss of biodiversity (any two each).",
        explanation:
          "Value-based case questions on dams connect science, society and environment.",
      },
    ],
  },
];

// ✅ Final HPQ bank (seed + append-only additions), merged safely by topic
// so the HPQ page doesn't show duplicate topic cards when additions contain
// buckets for chapters already present in the seed.
const _rawHpqBuckets: HPQTopicBucket[] = [
  ...highlyProbableQuestionsSeed,
  ...hpqAdditions,
];

export const highlyProbableQuestions: HPQTopicBucket[] = [
  ...mergeBucketsByTopic("Maths", _rawHpqBuckets),
  ...mergeBucketsByTopic("Science", _rawHpqBuckets),
];

function normalizeTopicLabel(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const allowedScienceTopicLabels = new Set(
  Object.values(class10ScienceTopicTrends.topics).map((topic) =>
    normalizeTopicLabel(topic.topicName)
  )
);

// ----------------------- Safe, typed helpers (UI-neutral) -----------------------

/**
 * Return HPQ buckets filtered by subject and (optionally) Science stream.
 * Keeps order and structure intact to avoid any UI/UX regression.
 */
export function getHighlyProbableQuestions(
  subject?: HPQSubject,
  stream?: HPQStream
): HPQTopicBucket[] {
  const subj = subject ?? "Maths";
  const filtered = highlyProbableQuestions.filter((b) => {
    const bSubject: HPQSubject = (b.subject as HPQSubject) ?? "Maths";
    if (bSubject !== subj) return false;
    if (
      subj === "Science" &&
      !allowedScienceTopicLabels.has(normalizeTopicLabel(b.topic))
    ) {
      return false;
    }
    if (subj === "Science" && stream) {
      return (b.stream as HPQStream | undefined) === stream;
    }
    return true;
  });
  return filtered.map((bucket) => ({
    ...bucket,
    questions: bucket.questions.map((question) => ({
      ...question,
      ...deriveHPQConfidence({
        subject: subj,
        topic: bucket.topic,
        question,
      }),
    })),
  }));
}

/**
 * Quick map for tabs like: dataBySubject["Maths"] or dataBySubject["Science"].
 * For Science you can further filter by stream with the helper above.
 */
export const dataBySubject: Record<HPQSubject, HPQTopicBucket[]> = {
  Maths: getHighlyProbableQuestions("Maths"),
  Science: getHighlyProbableQuestions("Science"),
};
