// src/data/class10ContentConfig.ts

export type Class10SubjectKey = "Maths" | "Science";
export type Class10StreamKey = "Physics" | "Chemistry" | "Biology";

export type Priority = "must-do" | "should-do" | "good-to-know";

// Trends tiers
export type TopicTier = "must-crack" | "high-roi" | "good-to-do";

export interface TopicSectionConfig {
  id: string; // A / B / C / D / E
  label: string; // section label
  marksLabel: string; // "1 mark", "2 marks" etc.
  blurb: string;
}

// --- Rich content helpers ---------------------------------------

export interface ConceptCard {
  id: string;
  title: string;
  summary: string; // mini note, 2–4 lines
  examTip?: string; // “Board tip”
}

export interface BoardExample {
  id: string;
  title: string;
  question: string;
  patternTag?: string; // e.g. "HCF using Euclid"
}

export interface RichMistake {
  id: string;
  title: string;
  whatGoesWrong: string;
  fix: string;
}

export interface RecommendedVideo {
  title: string;
  url: string;
  channel?: string;
  meta?: string; // “2 hr one-shot | NCERT + PYQ”
}

// --- Main config type -------------------------------------------

export interface TopicContentConfig {
  topicKey: string;
  topicName: string;
  subjectKey: Class10SubjectKey;
  tier: TopicTier;
  weightagePercent: number;

  heroTagline: string;

  examLinkCaption: string;
  examSections: TopicSectionConfig[];

  quickRevisionRoadmap: string[]; // bullet points
  keyConceptsSummary: string;
  boardExamplesSummary: string;

  // YouTube / video
  recommendedVideoSummary: string;
  recommendedVideoUrl?: string;
  recommendedVideo?: RecommendedVideo;

  // Deep content – optional (TopicHub falls back gracefully)
  conceptNotes?: ConceptCard[];
  boardExamples?: BoardExample[];
  commonMistakes?: Array<string | RichMistake>;

  howToUseSteps: string[];
}

// Tiny placeholder so any legacy imports keep working.
// TopicHub should use getTopicContent instead.
export const class10ContentConfig: Record<string, never> = {};
export default class10ContentConfig;

// ----------------------------------------------------------------
// Generic builder – safe default for any topic
// ----------------------------------------------------------------

type GenericArgs = {
  subjectKey: Class10SubjectKey;
  topicKey: string;
  topicName: string;
  tier?: TopicTier;
  weightagePercent?: number;
};

export function buildGenericTopicConfig({
  subjectKey,
  topicKey,
  topicName,
  tier,
  weightagePercent,
}: GenericArgs): TopicContentConfig {
  const safeTier: TopicTier = tier ?? "high-roi";
  const safeWeight = weightagePercent ?? 5;

  return {
    topicKey,
    topicName,
    subjectKey,
    tier: safeTier,
    weightagePercent: safeWeight,

    heroTagline:
      subjectKey === "Maths"
        ? `Fast-track your ${topicName} prep with a single scroll-friendly page.`
        : `Revision-friendly ${topicName} notes so you can cover Science without burnout.`,

    examLinkCaption:
      "See how this topic shows up across CBSE sections. Focus on the sections tagged in the Trends and Predict tabs.",

    examSections: [
      {
        id: "A",
        label: "MCQs / Objective",
        marksLabel: "1 mark",
        blurb: "Concept checks & quick facts.",
      },
      {
        id: "B",
        label: "Very short answer",
        marksLabel: "2 marks",
        blurb: "One small calculation / reason.",
      },
      {
        id: "C",
        label: "Short answer",
        marksLabel: "3 marks",
        blurb: "3–4 line working with steps.",
      },
      {
        id: "D",
        label: "Long answer",
        marksLabel: "4–5 marks",
        blurb: "Full derivation / application.",
      },
      {
        id: "E",
        label: "Case-based",
        marksLabel: "4 marks",
        blurb: "Data / graph / passage based.",
      },
    ],

    quickRevisionRoadmap: [
      `Step 1: Skim all NCERT examples for ${topicName} and mark anything that feels tricky.`,
      "Step 2: Solve last 3–5 years of PYQs only from this chapter and star questions that took time.",
      "Step 3: Build 1–2 mini-mocks using LazyTopper’s Predict / HPQ tabs and time yourself.",
      "Step 4: For every wrong or slow question, write one-line reason: “Where did I get stuck?”",
    ],

    keyConceptsSummary:
      `We’re curating detailed concept cards for ${topicName}. For now, keep a small list in your notebook: (1) core definitions, (2) formulas / key results, (3) 2–3 most common PYQ patterns.`,

    boardExamplesSummary:
      `Full board-style examples for ${topicName} are coming soon. Till then, open Highly Probable Questions, filter by this chapter and do at least 5 questions in one sitting.`,

    recommendedVideoSummary:
      `Pick ONE good “${topicName} class 10 one-shot” video on YouTube. Watch at 1.25× speed but pause at every example and try it yourself first.`,

    recommendedVideoUrl: undefined,
    recommendedVideo: undefined,

    commonMistakes: [
      `Skipping NCERT examples in ${topicName} and jumping straight to random coaching sheets.`,
      "Not analysing exactly where marks were lost in mocks – was it concept, formula, or silly slip?",
    ],

    howToUseSteps: [
      "Skim this page once before starting PYQs / mocks for this topic.",
      "After every mock, come back and match your mistakes with this ‘Common mistakes’ list.",
      "Turn repeated mistakes into tiny flashcards / notes and revise them 2–3 times before boards.",
    ],
  };
}

// =================================================================
// HAND-CRAFTED TOPIC CONFIGS
// These are the “hero” topics with real content, not just directions.
// =================================================================

// -----------------------------------------------------------------
// MATHS: REAL NUMBERS
// -----------------------------------------------------------------

const realNumbersBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "real-numbers",
  topicName: "Real Numbers",
  tier: "high-roi",
  weightagePercent: 5,
});

const realNumbersConfig: TopicContentConfig = {
  ...realNumbersBase,
  heroTagline:
    "Small chapter but guaranteed proof + reasoning questions – pure bonus marks if you revise once properly.",

  quickRevisionRoadmap: [
    "1️⃣ Revise Euclid’s Division Algorithm: a = bq + r, 0 ≤ r < b. Practise 3 HCF questions using repeated division.",
    "2️⃣ Do 4–5 sums on Fundamental Theorem of Arithmetic – write any integer as product of primes and use it to find HCF/LCM.",
    "3️⃣ Learn the decimal expansion rule: in lowest form p/q, if q = 2^m × 5^n ⇒ terminating; otherwise non-terminating recurring. Solve mixed PYQs.",
    "4️⃣ Practise 2–3 ‘prove √2, √3 type numbers are irrational’ questions with clean step-wise reasoning.",
  ],

  keyConceptsSummary:
    "Lock these three: (i) Euclid’s Division Algorithm for HCF, (ii) Fundamental Theorem of Arithmetic (unique prime factorisation), (iii) decimal expansion criteria for rational numbers. For each, know the statement, one standard proof idea, and 2–3 question patterns: HCF/LCM using Euclid, “express as product of primes”, and terminating vs non-terminating decimals. These alone cover most board questions from this chapter.",

  boardExamplesSummary:
    "Typical PYQs: prove √2 or √3 is irrational; use Euclid to find HCF of two numbers; decide whether a rational number has terminating or non-terminating decimal expansion; express a given decimal as p/q and comment on its type. Keep one solved example of each pattern in your notebook.",

  recommendedVideoSummary:
    "Choose a 30–40 min ‘Real Numbers one-shot’ that slowly explains all proofs. One focused watch + written notes > 5 random reels.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=_0ooaKrdubI",
  recommendedVideo: {
    title: "Real Numbers Class 10 Maths | Full Chapter One-Shot",
    url: "https://www.youtube.com/watch?v=_0ooaKrdubI",
    channel: "Shobhit Nirwan",
    meta: "≈1 hr one-shot • Proofs + PYQs",
  },

  conceptNotes: [
    {
      id: "euclid-division",
      title: "Euclid’s Division Algorithm & HCF",
      summary:
        "For integers a, b (b > 0), we can write a = bq + r. Repeating this on (b, r) gives HCF(a, b). Board questions use this to find HCF or prove facts like “HCF of two consecutive integers is 1”.",
      examTip:
        "Always mention “by Euclid’s Division Algorithm, we have…” and show at least 2–3 steps of division.",
    },
    {
      id: "fta",
      title: "Fundamental Theorem of Arithmetic",
      summary:
        "Every composite number can be written as a unique product of primes (apart from order). Used to compute HCF/LCM and to prove irrationality results.",
      examTip:
        "When proving irrationality, express numbers using their prime factorisation and reach a contradiction like “2 divides p but also p is odd”.",
    },
    {
      id: "decimal-expansion",
      title: "Decimal expansion of rational numbers",
      summary:
        "If p/q is in lowest form and q = 2^m × 5^n, the decimal of p/q terminates. If q has any other prime factor, the decimal is non-terminating recurring.",
      examTip:
        "For ‘type of decimal’ questions, always reduce to lowest form before checking prime factors of the denominator.",
    },
  ],

  commonMistakes: [
    "Forgetting to write “a = bq + r, 0 ≤ r < b” while using Euclid’s division algorithm.",
    "Not reducing the fraction to lowest form before applying the terminating / non-terminating rule.",
    "Writing proofs of irrational numbers without clearly stating the contradiction (e.g., ‘2 divides p but p is odd’).",
  ],

  boardExamples: [
    {
      id: "rn-ex1",
      title: "Terminating or not?",
      question:
        "Without dividing, determine whether 13/3125 has a terminating or non-terminating recurring decimal expansion.",
      patternTag: "Decimal expansion test",
    },
    {
      id: "rn-ex2",
      title: "HCF using Euclid",
      question:
        "Use Euclid’s Division Algorithm to find the HCF of 455 and 42 and verify it using prime factorisation.",
      patternTag: "Euclid HCF",
    },
    {
      id: "rn-ex3",
      title: "Irrational root proof",
      question: "Prove that √3 is irrational.",
      patternTag: "Irrational proof",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: PAIR OF LINEAR EQUATIONS IN TWO VARIABLES
// -----------------------------------------------------------------

const pleBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "pair-of-linear-equations",
  topicName: "Pair of Linear Equations in Two Variables",
  tier: "must-crack",
  weightagePercent: 11,
});

const pleConfig: TopicContentConfig = {
  ...pleBase,
  heroTagline:
    "Master elimination / substitution once and you’ve already locked in multiple 3–4 mark questions.",

  quickRevisionRoadmap: [
    "1️⃣ Write equations in standard form ax + by + c = 0. Practise converting word problems into equations.",
    "2️⃣ Solve 5–6 questions each by elimination and substitution. Check your answers by back-substitution.",
    "3️⃣ Practise 3–4 questions on nature of solutions using a1/a2, b1/b2, c1/c2 (unique, infinite, or no solution).",
    "4️⃣ Do at least 2 recent case-study questions where data is given in tables / graphs and you have to form and solve equations.",
  ],

  keyConceptsSummary:
    "Three big ideas: (i) solving a pair of linear equations algebraically (elimination, substitution, cross-multiplication), (ii) graphical meaning of solutions and the condition for lines to intersect / coincide / be parallel, (iii) word problems – mixture, numbers, money, geometry stories. Comfort with translating real-world data into equations is what turns this topic into a marks-machine.",

  boardExamplesSummary:
    "A classic 3-mark PYQ: “Form a pair of linear equations for this situation and solve it”. Another type asks you to change a condition so that the system has infinitely many or no solution. Case-based questions usually combine a small table of values or a short story with 2–3 subparts.",

  recommendedVideoSummary:
    "Choose a ‘PLE in 1 shot’ video that solves LOTS of word problems. Focus only on the types you find tricky to save time.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=EXAkGQGpP7E",
  recommendedVideo: {
    title:
      "Pair of Linear Equations in Two Variables | Class 10 Full Chapter One-Shot",
    url: "https://www.youtube.com/watch?v=EXAkGQGpP7E",
    channel: "Vedantu 9&10",
    meta: "≈2 hr one-shot • Word problems + graphs",
  },

  conceptNotes: [
    {
      id: "ple-methods",
      title: "Algebraic methods (elimination & substitution)",
      summary:
        "In elimination, make coefficients of one variable equal (or opposite), subtract/add to remove it, then back-substitute. In substitution, write one variable in terms of the other and plug into the second equation.",
      examTip:
        "Show clear steps, especially when multiplying equations. Marks are for the method as much as for the answer.",
    },
    {
      id: "ple-nature",
      title: "Nature of solutions via ratios",
      summary:
        "Compare a1/a2, b1/b2 and c1/c2. If a1/a2 ≠ b1/b2 ⇒ unique solution; if a1/a2 = b1/b2 = c1/c2 ⇒ infinitely many solutions; if a1/a2 = b1/b2 ≠ c1/c2 ⇒ no solution.",
      examTip:
        "Always write the three ratios clearly and then state the condition used. Don’t just directly write ‘No solution’.",
    },
    {
      id: "ple-word",
      title: "Translating word problems",
      summary:
        "Identify the two unknowns first, write equations line by line from the statements, then solve and interpret the result (units / meaning).",
      examTip:
        "Under exam pressure, do a quick unit sanity check: does your answer make sense for age / money / tickets etc.?",
    },
  ],

  commonMistakes: [
    "Dropping minus signs while multiplying equations to make coefficients equal.",
    "Not writing the ratio test properly for nature of solutions; writing only one ratio instead of three.",
    "Forming wrong equations from word problems by mixing up ‘more than’, ‘less than’, or total amounts.",
  ],

  boardExamples: [
    {
      id: "ple-ex1",
      title: "Tickets story problem",
      question:
        "The sum of the digits of a two-digit number is 9. When the digits are interchanged, the new number is 27 greater than the original number. Find the number using a pair of linear equations.",
      patternTag: "Number story",
    },
    {
      id: "ple-ex2",
      title: "Nature of solutions",
      question:
        "Find the value of k for which the system (k – 3)x + 3y = k and (k – 1)x + (k – 2)y = 2k – 1 has (i) no solution, (ii) infinitely many solutions.",
      patternTag: "Ratio condition",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: QUADRATIC EQUATIONS
// -----------------------------------------------------------------

const quadraticBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "quadratic-equations",
  topicName: "Quadratic Equations",
  tier: "must-crack",
  weightagePercent: 7,
});

const quadraticConfig: TopicContentConfig = {
  ...quadraticBase,
  heroTagline:
    "Roots, discriminant, and word problems – once these are solid you can farm easy 3–4 mark questions.",

  quickRevisionRoadmap: [
    "1️⃣ Standard form: ax² + bx + c = 0 (a ≠ 0). Practise reducing simple equations to this form.",
    "2️⃣ Solve 4–5 equations each by factorisation and quadratic formula: x = [-b ± √(b² – 4ac)] / 2a.",
    "3️⃣ Drill discriminant logic: D = b² – 4ac > 0 (two distinct real roots), = 0 (equal roots), < 0 (no real roots).",
    "4️⃣ Do 4–5 word problems: numbers, area, speed–distance, roots with given sum/product, and questions where ‘no real solution’ gives a condition on a parameter.",
  ],

  keyConceptsSummary:
    "Key skills: (i) forming a quadratic equation from conditions on roots, (ii) solving by factorisation or formula, (iii) using D to decide number of real roots, (iv) converting word problems into quadratic equations. Many 3-mark questions are just ‘form equation + solve’ with neat, short working.",

  boardExamplesSummary:
    "Popular patterns: roots with given sum and product, geometry problems where length × breadth gives area, speed problems leading to quadratic time equations, and parameter-based conditions using D ≥ 0. In almost every paper there is at least one direct ‘solve the quadratic’ question.",

  recommendedVideoSummary:
    "Take one solid ‘Quadratic Equations one-shot’ and add it to your notes: formula derivation + lots of word problems.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=_6wk9WVvdKw",
  recommendedVideo: {
    title: "Quadratic Equations Class 10 | Full Chapter in One Shot",
    url: "https://www.youtube.com/watch?v=_6wk9WVvdKw",
    channel: "Vedantu 9&10",
    meta: "≈2 hr one-shot • Formula + word problems",
  },

  conceptNotes: [
    {
      id: "quad-forms",
      title: "Standard form & forming equations",
      summary:
        "Any quadratic in x can be written as ax² + bx + c = 0. Board questions often give conditions on roots and ask you to form the equation using (x – α)(x – β) = 0.",
      examTip:
        "If roots are p and q, equation is x² – (p + q)x + pq = 0 (assuming leading coefficient 1).",
    },
    {
      id: "quad-discriminant",
      title: "Discriminant and nature of roots",
      summary:
        "D = b² – 4ac decides the number and nature of real roots. Use it to check whether a word problem has a valid solution or to find parameter ranges.",
      examTip:
        "Whenever the question says ‘real roots’ or ‘equal roots’, immediately think of D ≥ 0 or D = 0.",
    },
    {
      id: "quad-word",
      title: "Word problems → quadratic",
      summary:
        "Look for squares (areas, products, speed × time) and conditions like ‘sum/product of roots’. Translate to algebra slowly; once equation is ready, solving is mechanical.",
      examTip:
        "Write a short concluding sentence in words, e.g., “Therefore, the required numbers are …”.",
    },
  ],

  commonMistakes: [
    "Forgetting to take all terms on one side to make ax² + bx + c = 0 before comparing a, b, c.",
    "Sign errors while substituting into the quadratic formula, especially with negative b.",
    "Using wrong condition on D (e.g., writing D > 0 when the question needs equal roots).",
  ],

  boardExamples: [
    {
      id: "quad-ex1",
      title: "Number problem",
      question:
        "The product of two consecutive positive integers is 156. Form a quadratic equation and find the integers.",
      patternTag: "Consecutive numbers",
    },
    {
      id: "quad-ex2",
      title: "Parameter using D",
      question:
        "For what values of k will the equation 2x² + kx + 3 = 0 have equal roots?",
      patternTag: "Equal roots via D = 0",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: TRIGONOMETRY (Introduction + basic identities)
// -----------------------------------------------------------------

const trigBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "trigonometry",
  topicName: "Trigonometry",
  tier: "must-crack",
  weightagePercent: 10,
});

const trigConfig: TopicContentConfig = {
  ...trigBase,
  heroTagline:
    "Standard values + identities + height & distance – once these are on your fingertips, trig becomes free marks.",

  quickRevisionRoadmap: [
    "1️⃣ Memorise sin, cos, tan values for 0°, 30°, 45°, 60°, 90° in a tiny table. Also know that tan θ = sin θ / cos θ.",
    "2️⃣ Revise basic identities: sin²θ + cos²θ = 1, 1 + tan²θ = sec²θ, 1 + cot²θ = cosec²θ and their rearranged forms.",
    "3️⃣ Solve 6–8 simplification proofs where you convert everything to sin and cos and use the identities.",
    "4️⃣ Practise 4–5 height & distance problems with one or two right-angled triangles – trees, towers, angles of elevation/depression.",
  ],

  keyConceptsSummary:
    "Core pieces: (i) definition of trig ratios in a right triangle, (ii) standard values table, (iii) Pythagorean identities, (iv) use of complementary angles (sin(90° – θ) = cos θ etc.), and (v) application to height & distance. Almost every board paper has at least one simplification / identity proof and one application question.",

  boardExamplesSummary:
    "Question types: prove two expressions are equal using identities; evaluate an expression by substituting standard values; find height of tower / distance between points given angle(s) and one length. Draw neat triangles with all markings – this alone picks up ½–1 mark.",

  recommendedVideoSummary:
    "Use a single well-taught ‘Trigonometry in one shot’ video to drill the values table, identities, and 8–10 solved examples.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=wdaBwIv7Jso",
  recommendedVideo: {
    title: "Trigonometry Class 10 | One Shot Revision",
    url: "https://www.youtube.com/watch?v=wdaBwIv7Jso",
    channel: "Vedantu 9&10",
    meta: "≈2 hr one-shot • Identities + H&D",
  },

  conceptNotes: [
    {
      id: "trig-values",
      title: "Standard trig values",
      summary:
        "For 0°, 30°, 45°, 60°, 90° learn the exact values of sin θ, cos θ, and tan θ. Others (cosec, sec, cot) are reciprocals.",
      examTip:
        "Write the mini table on rough sheet at the start of the paper so you never blank out under pressure.",
    },
    {
      id: "trig-identities",
      title: "Key identities",
      summary:
        "sin²θ + cos²θ = 1 is the mother identity. Divide by cos²θ to get 1 + tan²θ = sec²θ and by sin²θ to get 1 + cot²θ = cosec²θ.",
      examTip:
        "In proofs, convert everything to sin and cos first, simplify, and then reconvert to required ratio if needed.",
    },
    {
      id: "trig-application",
      title: "Heights & distances",
      summary:
        "Draw the situation, mark angle of elevation/depression, form right-angled triangles, and write tan θ = opposite/adjacent etc. Usually only one equation is needed per unknown.",
      examTip:
        "Always write a concluding line: “Therefore, the height of the tower is … m.” Don’t forget units.",
    },
  ],

  commonMistakes: [
    "Mixing up sin and cos values for 30° and 60°.",
    "Using wrong identity (e.g., writing tan²θ + sec²θ = 1).",
    "Placing angle of elevation at the wrong point in height & distance diagrams.",
  ],

  boardExamples: [
    {
      id: "trig-ex1",
      title: "Simplification",
      question:
        "Prove that (1 – tan²A) / (1 + tan²A) = cos 2A, for 0° < A < 45°.",
      patternTag: "Identity proof",
    },
    {
      id: "trig-ex2",
      title: "Tower question",
      question:
        "The angle of elevation of the top of a tower from a point on the ground is 30°. On moving 20 m closer, it becomes 45°. Find the height of the tower.",
      patternTag: "Height & distance",
    },
  ],
};
// -----------------------------------------------------------------
// MATHS: POLYNOMIALS
// -----------------------------------------------------------------

const polynomialsBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "polynomials",
  topicName: "Polynomials",
  tier: "high-roi",
  weightagePercent: 5,
});

const polynomialsConfig: TopicContentConfig = {
  ...polynomialsBase,
  heroTagline:
    "Short, high-scoring chapter – zeros, factorisation and graphs can give you near free marks.",

  quickRevisionRoadmap: [
    "1️⃣ Revise definitions: constant, linear, quadratic, cubic polynomials and degree.",
    "2️⃣ Practise finding zeros and verifying the relationship between zeros and coefficients for quadratic polynomials.",
    "3️⃣ Do 4–5 questions using factor theorem: check if a given number is a zero and factorise accordingly.",
    "4️⃣ Practise quick sketches of graphs of linear and quadratic polynomials (shape + number of zeros).",
  ],

  keyConceptsSummary:
    "Focus on: (i) classification by degree, (ii) zeros of a polynomial, (iii) relationship between zeros and coefficients for quadratics, (iv) factor theorem and remainder theorem, and (v) simple graph interpretation. Questions are usually clean, 1–3 mark and very formula-based.",

  boardExamplesSummary:
    "Common PYQs: find zeros of a given quadratic and verify the relations; use factor theorem to factorise; identify number of zeros from a graph. Many questions combine algebraic manipulation with a small reasoning line.",

  recommendedVideoSummary:
    "Take a single ‘Polynomials in one shot’ video and add 1 page of notes: definitions, formulas and 5 solved examples.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=BYIm1xQtxh0",
  recommendedVideo: {
    title: "Polynomials Class 10 | Chapter Revision",
    url: "https://www.youtube.com/watch?v=BYIm1xQtxh0",
    channel: "Maths Infinity",
    meta: "Compact revision • Zeros + graphs",
  },

  conceptNotes: [
    {
      id: "poly-zeros",
      title: "Zeros of a polynomial",
      summary:
        "If P(x) is a polynomial, any value of x that makes P(x) = 0 is called a zero (or root). Degree 2 ⇒ at most 2 zeros; degree 3 ⇒ at most 3 zeros.",
      examTip:
        "Write P(α) = 0 clearly when checking whether α is a zero. Show one line of substitution.",
    },
    {
      id: "poly-relations",
      title: "Relationship between zeros & coefficients",
      summary:
        "For ax² + bx + c with zeros α, β: α + β = −b/a and αβ = c/a. Useful to form polynomials when sum and product of zeros are known.",
      examTip:
        "Memorise the pattern: sign of b is flipped for sum; sign of c stays same for product.",
    },
    {
      id: "poly-factor",
      title: "Factor theorem",
      summary:
        "If P(a) = 0, then (x − a) is a factor of P(x). Used to factorise higher degree polynomials by testing simple values.",
      examTip:
        "Try x = 1, −1, 2, −2 etc. quickly. Once you get zero, divide by (x − a) to get remaining factor.",
    },
  ],

  commonMistakes: [
    "Confusing coefficients with zeros while using α + β and αβ formulas.",
    "Not checking whether a suggested number is really a zero before declaring (x − a) a factor.",
    "Misreading graphs and counting intersection points incorrectly as zeros.",
  ],

  boardExamples: [
    {
      id: "poly-ex1",
      title: "Zeros and relations",
      question:
        "Find the zeros of the polynomial 2x² − 7x + 3 and verify the relationship between zeros and coefficients.",
      patternTag: "Zeros + coefficient relation",
    },
    {
      id: "poly-ex2",
      title: "Forming polynomial",
      question:
        "Form a quadratic polynomial whose zeros are 3 and −2. Verify the relationship between zeros and coefficients.",
      patternTag: "Form polynomial from zeros",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: ARITHMETIC PROGRESSIONS
// -----------------------------------------------------------------

const apBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "arithmetic-progression",
  topicName: "Arithmetic Progressions",
  tier: "high-roi",
  weightagePercent: 7,
});

const apConfig: TopicContentConfig = {
  ...apBase,
  heroTagline:
    "AP is formula heaven – once nth term and sum formulas are clear, numericals are almost mechanical.",

  quickRevisionRoadmap: [
    "1️⃣ Revise definition: AP, common difference d, nth term aₙ = a + (n − 1)d.",
    "2️⃣ Practise 5–6 numericals on finding n, a or d using the nth term formula.",
    "3️⃣ Solve 5 questions using sum formulas: Sₙ = n/2 [2a + (n − 1)d] or Sₙ = n/2 (first term + last term).",
    "4️⃣ Do 3–4 word problems: money saving, seats in rows, staircases, and other realistic AP situations.",
  ],

  keyConceptsSummary:
    "Key tools: nth term formula, sum of first n terms, and recognising when a situation forms an AP. Most board questions are straightforward and need only one or two algebra steps + formula substitution.",

  boardExamplesSummary:
    "Popular patterns: find which term of an AP is a given number, compare terms, find the sum of given number of terms, or find n when Sₙ is given. Many word problems are directly from NCERT exemplars.",

  recommendedVideoSummary:
    "Pick one AP revision video that drills at least 15 numericals – reducing your silly mistakes here is pure marks gain.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=fXntK8cJv4c",
  recommendedVideo: {
    title: "Arithmetic Progressions | Class 10 One Shot",
    url: "https://www.youtube.com/watch?v=fXntK8cJv4c",
    channel: "Vedantu 9&10",
    meta: "Formulas + mixed numericals",
  },

  conceptNotes: [
    {
      id: "ap-nth",
      title: "Nth term of an AP",
      summary:
        "If a is first term and d is common difference, nth term aₙ = a + (n − 1)d. Used to find any term or to solve for n when aₙ is known.",
      examTip:
        "Write down a, d and n clearly before substitution to avoid sign mistakes.",
    },
    {
      id: "ap-sum",
      title: "Sum of first n terms",
      summary:
        "Sₙ = n/2 [2a + (n − 1)d] or Sₙ = n/2 (first term + last term). Both are the same formula in different clothes.",
      examTip:
        "In word problems, decide whether you know the last term or not before selecting which form of the formula to use.",
    },
  ],

  commonMistakes: [
    "Using n instead of (n − 1) in the nth term formula.",
    "Forgetting to multiply by n/2 in the sum formula.",
    "Mixing up ‘term number’ with ‘term value’ while forming equations.",
  ],

  boardExamples: [
    {
      id: "ap-ex1",
      title: "Which term?",
      question:
        "Which term of the AP 3, 8, 13, 18, … is 78? Also find the sum of the first n terms up to this term.",
      patternTag: "Find n from aₙ",
    },
    {
      id: "ap-ex2",
      title: "Word problem",
      question:
        "The sum of the first n terms of an AP is 3n² + 5n. Find its nth term. Which term is 164?",
      patternTag: "Sum given → nth term",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: TRIANGLES
// -----------------------------------------------------------------

const trianglesBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "triangles",
  topicName: "Triangles",
  tier: "must-crack",
  weightagePercent: 9,
});

const trianglesConfig: TopicContentConfig = {
  ...trianglesBase,
  heroTagline:
    "Similarity + BPT + proof writing form one clean runway for board geometry.",

  quickRevisionRoadmap: [
    "1️⃣ Revise similarity criteria: AAA, SAS, SSS and their statements.",
    "2️⃣ Practise 5–6 questions on BPT (Basic Proportionality Theorem) and its converse.",
    "3️⃣ Solve questions where areas of similar triangles are compared via the square of corresponding sides.",
    "4. Do 3-4 theorem-choice and proof-setup questions anchored in clean board-style figures.",
  ],

  keyConceptsSummary:
    "Important: similarity criteria and their applications, BPT and its converse, and ratio-based reasoning inside similar triangles. Many questions are proof-based, so stepwise reasoning + correct statements is critical.",

  boardExamplesSummary:
    "Standard PYQs: prove two triangles similar using a given condition and then find a ratio of sides/areas; BPT-based segment division; and one proof where the theorem choice must be stated clearly.",

  recommendedVideoSummary:
    "Choose a ‘Triangles full chapter’ video that focuses heavily on proofs and writing reasons – that’s where students lose marks.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=eU44z9K6x5I",
  recommendedVideo: {
    title: "Triangles Class 10 | Theorem + Proof Revision",
    url: "https://www.youtube.com/watch?v=eU44z9K6x5I",
    channel: "Magnet Brains",
    meta: "Theorems + PYQs",
  },

  conceptNotes: [
    {
      id: "tri-similarity",
      title: "Similarity of triangles",
      summary:
        "Two triangles are similar if their corresponding angles are equal and corresponding sides are in proportion. Use AAA, SAS or SSS to prove similarity.",
      examTip:
        "Clearly mark corresponding vertices and write the ratio of corresponding sides in the same order.",
    },
    {
      id: "tri-bpt",
      title: "Basic Proportionality Theorem (BPT)",
      summary:
        "If a line is drawn parallel to one side of a triangle to intersect the other two sides, then it divides those sides in the same ratio.",
      examTip:
        "In proofs, explicitly use the ‘∥’ symbol and mention ‘by BPT’ when you equate side ratios.",
    },
    {
      id: "tri-area-ratio",
      title: "Area of similar triangles",
      summary:
        "For similar triangles, ratio of areas = square of ratio of corresponding sides. Often used after proving similarity.",
      examTip:
        "Write area(ΔABC)/area(ΔDEF) = (AB/DE)² clearly, then substitute known side lengths.",
    },
  ],

  commonMistakes: [
    "Matching wrong corresponding sides when writing ratios.",
    "Skipping reasons like ‘corresponding angles are equal’ or ‘alternate interior angles’ in proofs.",
    "Forgetting to square the side ratio when comparing areas of similar triangles.",
  ],

  boardExamples: [
    {
      id: "tri-ex1",
      title: "BPT-based proof",
      question:
        "In ΔABC, DE ∥ BC with D on AB and E on AC. Prove that AD/DB = AE/EC.",
      patternTag: "BPT standard proof",
    },
    {
      id: "tri-ex2",
      title: "Similar triangle ratio",
      question:
        "In ΔABC and ΔDEF, ∠A = ∠D, ∠B = ∠E and AB/DE = AC/DF. Prove that ΔABC ~ ΔDEF and hence find the ratio of their areas.",
      patternTag: "Similarity + area",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: COORDINATE GEOMETRY
// -----------------------------------------------------------------

const coordBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "coordinate-geometry",
  topicName: "Coordinate Geometry",
  tier: "high-roi",
  weightagePercent: 6,
});

const coordConfig: TopicContentConfig = {
  ...coordBase,
  heroTagline:
    "Distance, section formula and area of triangle – three formulas unlock almost all questions.",

  quickRevisionRoadmap: [
    "1️⃣ Memorise distance formula: d = √[(x₂ − x₁)² + (y₂ − y₁)²] and do 5–6 direct numericals.",
    "2️⃣ Revise section formula (internal division) and solve 3–4 questions on finding coordinates of a point dividing a line segment in a given ratio.",
    "3️⃣ Practise area of triangle formula using coordinates and check if three points are collinear.",
    "4️⃣ Do a couple of mixed PYQs combining distance + section + area checks.",
  ],

  keyConceptsSummary:
    "Key formulas: distance between two points, section formula, and area of a triangle using coordinates. Also, idea of collinearity via zero area. Board questions are formula-based with simple substitution, but accuracy matters.",

  boardExamplesSummary:
    "Popular questions: find distance between given points, coordinates of point dividing a line segment in a given ratio, or check if three points are collinear using triangle area.",

  recommendedVideoSummary:
    "Spend one sitting revising all three formulas and then solve a block of 15 numericals back-to-back for speed and confidence.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=f5F5lWv7Z0I",
  recommendedVideo: {
    title: "Coordinate Geometry | Distance, Section & Area",
    url: "https://www.youtube.com/watch?v=f5F5lWv7Z0I",
    channel: "Vedantu 9&10",
    meta: "Formulas + exam numericals",
  },

  conceptNotes: [
    {
      id: "cg-distance",
      title: "Distance formula",
      summary:
        "Distance between points (x₁, y₁) and (x₂, y₂) is √[(x₂ − x₁)² + (y₂ − y₁)²]. Used for length of a segment, side of triangle or checking equal distances.",
      examTip:
        "Write the formula first, then substitute values with brackets to avoid sign mistakes.",
    },
    {
      id: "cg-section",
      title: "Section formula (internal division)",
      summary:
        "If P divides AB in ratio m:n, with A(x₁, y₁), B(x₂, y₂), then P(m+n) = ( (mx₂ + nx₁)/(m+n), (my₂ + ny₁)/(m+n) ).",
      examTip:
        "Be consistent about which point corresponds to m and which to n. Most mistakes are just swapped terms.",
    },
    {
      id: "cg-area",
      title: "Area of triangle using coordinates",
      summary:
        "Area = ½ |x₁(y₂ − y₃) + x₂(y₃ − y₁) + x₃(y₁ − y₂)|. Zero area ⇒ collinear points.",
      examTip:
        "Organise the terms in a mini-table or write them clearly in one line before simplifying.",
    },
  ],

  commonMistakes: [
    "Sign errors while subtracting coordinates in distance formula.",
    "Swapping m and n with the wrong points in section formula.",
    "Forgetting the ½ or modulus in area formula leading to wrong magnitude.",
  ],

  boardExamples: [
    {
      id: "cg-ex1",
      title: "Section formula application",
      question:
        "Find the coordinates of the point which divides the line segment joining A(2, −3) and B(5, 6) in the ratio 2:3 internally.",
      patternTag: "Section formula",
    },
    {
      id: "cg-ex2",
      title: "Collinearity via area",
      question:
        "Verify whether the points (1, 5), (2, 3) and (3, 1) are collinear.",
      patternTag: "Area = 0 test",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: CIRCLES
// -----------------------------------------------------------------

const circlesBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "circles",
  topicName: "Circles",
  tier: "high-roi",
  weightagePercent: 6,
});

const circlesConfig: TopicContentConfig = {
  ...circlesBase,
  heroTagline:
    "Tangent theorems + simple reasoning Qs – learn the statements properly and most answers flow naturally.",

  quickRevisionRoadmap: [
    "1️⃣ Revise basic tangent properties: tangent is perpendicular to radius at point of contact.",
    "2️⃣ Learn and write statements of key theorems: equal tangents from a point, angle subtended by chord at centre vs at remaining part of circle (recap from previous classes).",
    "3️⃣ Practise 4–5 proof questions using these theorems in a stepwise manner.",
    "4️⃣ Do a couple of reasoning-type questions mixing properties of triangles with circle tangents.",
  ],

  keyConceptsSummary:
    "Focus: tangent–radius perpendicularity, equal tangents from external point, and simple angle-chasing using circle theorems. Most questions are 2–3 mark reasoning problems with a clean figure.",

  boardExamplesSummary:
    "Regular PYQs: prove that tangents from an external point are equal; angle-based reasoning using tangent–radius properties; and small proofs combining triangle congruence with circle theorems.",

  recommendedVideoSummary:
    "Take a short ‘Circles theorem revision’ video and pause after each theorem to re-derive it yourself quickly.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=0laQGVDExi4",
  recommendedVideo: {
    title: "Circles Class 10 | Theorems in One Shot",
    url: "https://www.youtube.com/watch?v=0laQGVDExi4",
    channel: "Maths Infinity",
    meta: "Theorems + typical proofs",
  },

  conceptNotes: [
    {
      id: "circle-tangent-radius",
      title: "Tangent–radius theorem",
      summary:
        "The tangent at any point of a circle is perpendicular to the radius through the point of contact.",
      examTip:
        "Mark right angles clearly on the figure and use them for congruence/angle sum arguments.",
    },
    {
      id: "circle-equal-tangents",
      title: "Equal tangents from an external point",
      summary:
        "From a point outside a circle, the lengths of the two tangents drawn to the circle are equal.",
      examTip:
        "Use congruent triangles sharing common radius segments to prove equality of tangents.",
    },
  ],

  commonMistakes: [
    "Forgetting to mark the 90° angle between tangent and radius.",
    "Skipping the congruence reasoning and directly writing tangent lengths are equal.",
    "Not labelling the figure clearly leading to confusion in angles and sides.",
  ],

  boardExamples: [
    {
      id: "cir-ex1",
      title: "Equal tangents proof",
      question:
        "Prove that the lengths of tangents drawn from an external point to a circle are equal.",
      patternTag: "Standard tangent theorem",
    },
    {
      id: "cir-ex2",
      title: "Angle reasoning",
      question:
        "From an external point P, tangents PA and PB are drawn to a circle with centre O. Prove that ∠APB = 2∠AOB.",
      patternTag: "Angle at centre vs circle",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: CONSTRUCTIONS
// -----------------------------------------------------------------

const constructionsBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "constructions",
  topicName: "Constructions",
  tier: "good-to-do",
  weightagePercent: 3,
});

const constructionsConfig: TopicContentConfig = {
  ...constructionsBase,
  heroTagline:
    "Low-volume but pattern-based: learn 3–4 standard constructions and steps, and this chapter becomes easy marks.",

  quickRevisionRoadmap: [
    "1️⃣ Revise basic construction tools: perpendicular bisectors, angle bisectors and parallel lines using compass and ruler.",
    "2️⃣ Practise construction of division of a line segment in a given ratio.",
    "3️⃣ Practise constructing a triangle similar to a given triangle as per required scale factor.",
    "4️⃣ Do 2–3 mixed board-style questions and write full steps of construction for each.",
  ],

  keyConceptsSummary:
    "Main tasks: divide a line segment in given ratio, construct tangents to a circle, and construct similar triangles. Marks come from clear diagrams + stepwise explanations, not just the final picture.",

  boardExamplesSummary:
    "Standard questions: divide a line segment internally in ratio m:n; draw a triangle similar to a given one with a specified scale; and construct tangents to a circle from an external point.",

  recommendedVideoSummary:
    "Follow a slow-paced ‘Constructions’ video and physically construct each figure with compass and scale while watching.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=5g4MUiYFsZc",
  recommendedVideo: {
    title: "Constructions Class 10 | Full Chapter",
    url: "https://www.youtube.com/watch?v=5g4MUiYFsZc",
    channel: "Vedantu 9&10",
    meta: "Live compass + ruler demo",
  },

  conceptNotes: [
    {
      id: "cons-divide-segment",
      title: "Dividing a line segment in ratio m:n",
      summary:
        "Draw a ray at an acute angle from one end, mark m + n equal parts, join the last point to the other end and draw a parallel line through the m-th point.",
      examTip:
        "In steps, always mention ‘draw a ray making an acute angle’ and ‘mark equal segments on the ray’.",
    },
    {
      id: "cons-similar-triangle",
      title: "Constructing similar triangles",
      summary:
        "Scale factor k is used to extend or shrink sides using ray markings and parallel lines, then join back to form the required triangle.",
      examTip:
        "State the factor clearly (e.g., 3/2) and mark the segments on the auxiliary ray accordingly.",
    },
  ],

  commonMistakes: [
    "Not using equal spacing on the auxiliary ray while dividing segments.",
    "Missing or unclear steps of construction in the written part.",
    "Figure not neat or labelled → teacher struggles to check work and marks may drop.",
  ],

  boardExamples: [
    {
      id: "cons-ex1",
      title: "Segment division",
      question:
        "Construct a line segment AB of length 8 cm. Using ruler and compass, divide it in the ratio 3:5. Write steps of construction.",
      patternTag: "Divide segment",
    },
    {
      id: "cons-ex2",
      title: "Similar triangle construction",
      question:
        "Construct a ΔABC similar to a given ΔPQR with scale factor 3/2. Write all steps of construction.",
      patternTag: "Triangle similarity construction",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: AREAS RELATED TO CIRCLES
// -----------------------------------------------------------------

const areasCirclesBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "areas-related-to-circles",
  topicName: "Areas Related to Circles",
  tier: "good-to-do",
  weightagePercent: 4,
});

const areasCirclesConfig: TopicContentConfig = {
  ...areasCirclesBase,
  heroTagline:
    "A small formula toolkit – area of circles, sectors and segments – used in composite figure questions.",

  quickRevisionRoadmap: [
    "1️⃣ Revise formulas: area of circle πr², circumference 2πr.",
    "2️⃣ Learn area of sector formula θ/360° × πr² and length of arc θ/360° × 2πr.",
    "3️⃣ Understand how to get area of segment = area of sector − area of triangle (basic cases).",
    "4️⃣ Practise 4–5 composite figure questions involving semicircles, quadrants and shaded regions.",
  ],

  keyConceptsSummary:
    "Main focus is on using circle area, sector and segment formulas in composite shapes. Most questions are 2–3 mark direct substitution if you draw neat figures and mark radii and angles clearly.",

  boardExamplesSummary:
    "Frequent PYQs: find shaded area in designs made of circles and squares/rectangles; compute length of arc or area of sector; evaluate area left unshaded in patterns.",

  recommendedVideoSummary:
    "Pick one chapter revision that does at least 10 shaded-region problems back-to-back – this is the fastest way to get comfortable.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=ZsCkHgNsx3c",
  recommendedVideo: {
    title: "Areas Related to Circles | Class 10",
    url: "https://www.youtube.com/watch?v=ZsCkHgNsx3c",
    channel: "Magnet Brains",
    meta: "Composite figures + PYQs",
  },

  conceptNotes: [
    {
      id: "arc-sector",
      title: "Sector & arc length",
      summary:
        "For a circle of radius r and central angle θ°, area of sector = (θ/360°)πr² and length of arc = (θ/360°)2πr.",
      examTip:
        "Always convert angle into fraction of 360° first; this keeps formulas consistent in your head.",
    },
    {
      id: "segment",
      title: "Area of a segment",
      summary:
        "Segment area is obtained by subtracting area of triangle from area of sector in basic questions.",
      examTip:
        "Draw the radius lines to form a triangle, then calculate triangle area using ½ab sin C or simple base × height.",
    },
  ],

  commonMistakes: [
    "Using wrong value of π or rounding too early.",
    "Confusing diameter with radius while substituting.",
    "Forgetting to subtract the unshaded part or double-counting overlapping regions.",
  ],

  boardExamples: [
    {
      id: "area-circ-ex1",
      title: "Shaded design",
      question:
        "Four quadrants of circles of radius 7 cm are drawn in the four corners of a square of side 14 cm. Find the area of the shaded region inside the square but outside the quadrants.",
      patternTag: "Composite figure",
    },
    {
      id: "area-circ-ex2",
      title: "Sector problem",
      question:
        "Find the area of a sector of a circle with radius 6 cm and angle 120°. Also find the length of the corresponding arc.",
      patternTag: "Sector + arc length",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: SURFACE AREAS AND VOLUMES
// -----------------------------------------------------------------

const savBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "surface-areas-and-volumes",
  topicName: "Surface Areas and Volumes",
  tier: "high-roi",
  weightagePercent: 8,
});

const savConfig: TopicContentConfig = {
  ...savBase,
  heroTagline:
    "Cylinder, cone, sphere and their combos – a formula-rich but very scoring chapter if practised well.",

  quickRevisionRoadmap: [
    "1️⃣ Make a mini formula sheet: CSA, TSA and volume of cuboid, cube, cylinder, cone, sphere and hemisphere.",
    "2️⃣ Practise 5–6 questions on single solids (e.g., CSA of cylinder, volume of cone).",
    "3️⃣ Do 5 composite shape questions: ice-cream cone (sphere + cone), solid formed/removed, etc.",
    "4️⃣ Practise 3–4 word problems where liquid level rises/falls or metal is recast into new shapes.",
  ],

  keyConceptsSummary:
    "Core: surface areas and volumes of standard solids and combination problems (joining, removing, reshaping). Most mistakes are unit or formula slips – once those are controlled, marks are very high.",

  boardExamplesSummary:
    "Common PYQs: find surface area or volume of a composite solid; calculate height of water level rise in a vessel; volume comparison during recasting of metal.",

  recommendedVideoSummary:
    "Use a ‘Surface Areas & Volumes’ revision that spends most time on word problems – simple formula questions you can self-practise.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=bxG52qKjI4E",
  recommendedVideo: {
    title: "Surface Areas and Volumes | Class 10",
    url: "https://www.youtube.com/watch?v=bxG52qKjI4E",
    channel: "Vedantu 9&10",
    meta: "Solids + combos + PYQs",
  },

  conceptNotes: [
    {
      id: "sav-formulas",
      title: "Key solid formulas",
      summary:
        "CSA(cylinder) = 2πrh, TSA(cylinder) = 2πr(h + r); volume(cylinder) = πr²h. Volume(cone) = ⅓πr²h; volume(sphere) = 4/3 πr³; TSA(sphere) = 4πr².",
      examTip:
        "Keep one page in formula notebook only for this chapter and revise it every few days till boards.",
    },
    {
      id: "sav-combo",
      title: "Composite solids",
      summary:
        "Figures often combine solids (like cylinder + hemisphere). Total volume = sum of individual volumes; surface area depends on exposed surfaces only.",
      examTip:
        "Sketch the figure and shade the ‘visible’ surfaces to correctly decide which areas to include.",
    },
  ],

  commonMistakes: [
    "Using TSA when only CSA is needed or vice-versa.",
    "Forgetting to convert units (e.g., cm to m) before volume comparison.",
    "Miscounting which surfaces are exposed in combination problems.",
  ],

  boardExamples: [
    {
      id: "sav-ex1",
      title: "Ice-cream cone type",
      question:
        "An ice-cream is in the form of a hemisphere of radius 3.5 cm placed on a cone of same radius and height 7 cm. Find the total volume of ice-cream.",
      patternTag: "Sphere + cone",
    },
    {
      id: "sav-ex2",
      title: "Recasting metal",
      question:
        "A solid metallic sphere of radius 6 cm is melted and recast into smaller solid cones each of radius 2 cm and height 3 cm. Find the number of cones formed.",
      patternTag: "Recasting volume",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: STATISTICS
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// MATHS: PROBABILITY
// -----------------------------------------------------------------


// -----------------------------------------------------------------
// SCIENCE: CHEMICAL REACTIONS & EQUATIONS
// -----------------------------------------------------------------

const chemReactionsBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "chemical-reactions-equations",
  topicName: "Chemical Reactions & Equations",
  tier: "must-crack",
  weightagePercent: 8,
});

const chemReactionsConfig: TopicContentConfig = {
  ...chemReactionsBase,
  heroTagline:
    "Balancing, types of reactions and everyday observations – this chapter shows up every single year.",

  quickRevisionRoadmap: [
    "1️⃣ Practise balancing at least 15–20 equations till it feels automatic.",
    "2️⃣ Revise types of reactions with 2 examples each: combination, decomposition, displacement, double displacement, redox.",
    "3️⃣ Go through NCERT activities on colour change, gas evolution and precipitates; make a ‘reaction → observation’ table.",
    "4️⃣ Read short notes on corrosion and rancidity and learn 3–4 prevention points.",
  ],

  keyConceptsSummary:
    "Core ideas: chemical changes vs physical changes, writing and balancing equations, types of chemical reactions, oxidation–reduction, and everyday implications like corrosion and rancidity. Board questions are mostly reasoning and short numericals around these ideas.",

  boardExamplesSummary:
    "Common PYQs: balance a given equation and name the type of reaction; identify oxidising/reducing agents; explain corrosion of iron and its prevention; give examples of rancidity and ways to slow it down.",

  recommendedVideoSummary:
    "Pick one ‘Chemical Reactions & Equations class 10 one-shot’ on YouTube and actively pause to balance each equation yourself before the teacher does.",
  recommendedVideoUrl: undefined,
  recommendedVideo: undefined,

  conceptNotes: [
    {
      id: "chem-balancing",
      title: "Balancing equations",
      summary:
        "Number of atoms of each element must be equal on both sides. Use hit-and-trial for simple equations, then practise till you can balance by inspection.",
      examTip:
        "Write pencil tallies under each element while practising; in the exam you’ll then do it mentally but more safely.",
    },
    {
      id: "chem-types",
      title: "Types of chemical reactions",
      summary:
        "Combination, decomposition, displacement, double displacement and redox. Many ‘name the type’ questions directly come from NCERT examples.",
      examTip:
        "Make a micro-table with heading: type → pattern → one example. Revise it 2–3 times before boards.",
    },
    {
      id: "chem-redox",
      title: "Oxidation–reduction & everyday life",
      summary:
        "Oxidation: gain of oxygen / loss of hydrogen / loss of electrons. Reduction: opposite. Corrosion and rancidity are slow redox processes.",
      examTip:
        "Underline the species being oxidised and reduced in at least 3–4 sample equations while revising.",
    },
  ],

  commonMistakes: [
    "Balancing atoms on one side and forgetting to re-check the other elements.",
    "Writing skeletal (unbalanced) equations in answers where fully balanced equations are expected.",
    "Getting confused about which species is oxidised/reduced vs which is oxidising/reducing agent.",
  ],

  boardExamples: [
    {
      id: "chem-ex1",
      title: "Balance + classify",
      question:
        "Balance the following chemical equation and identify the type of reaction: Na₂CO₃ + HCl → NaCl + H₂O + CO₂",
      patternTag: "Balancing + type",
    },
    {
      id: "chem-ex2",
      title: "Corrosion reasoning",
      question:
        "What is corrosion? Explain why iron articles are painted. Mention two methods to prevent corrosion of iron.",
      patternTag: "Corrosion application",
    },
  ],
};

// -----------------------------------------------------------------
// SCIENCE: ACIDS, BASES & SALTS
// -----------------------------------------------------------------

const acidsBasesBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "acids-bases-salts",
  topicName: "Acids, Bases & Salts",
  tier: "high-roi",
  weightagePercent: 7,
});

const acidsBasesConfig: TopicContentConfig = {
  ...acidsBasesBase,
  heroTagline:
    "Indicators, pH and important salts – very conceptual but extremely scoring if revised smartly.",

  quickRevisionRoadmap: [
    "1️⃣ Revise definitions of acids and bases (Arrhenius + general idea of H⁺ and OH⁻).",
    "2️⃣ Make a small table of indicators (litmus, phenolphthalein, methyl orange) and their colour changes.",
    "3️⃣ Understand pH scale, strong vs weak acids/bases with examples from daily life.",
    "4️⃣ Learn preparation, uses and reactions of important salts like baking soda, washing soda and Plaster of Paris.",
  ],

  keyConceptsSummary:
    "Important ideas: how acids and bases behave in water, the meaning of pH, role of indicators, and a few ‘star salts’ with preparations and uses. Many questions are direct NCERT lines and experiments.",

  boardExamplesSummary:
    "Common patterns: reasons for using dilute acids, explaining pH of saliva/soil/milk of magnesia, writing reactions for preparation of salts, and simple reasoning about daily life situations involving acids and bases.",

  recommendedVideoSummary:
    "Choose a concept-driven ‘Acids, Bases & Salts’ video and especially focus on the experiments and diagrams – examiners love those.",
  recommendedVideoUrl: undefined,
  recommendedVideo: undefined,

  conceptNotes: [
    {
      id: "abs-pH",
      title: "pH and everyday life",
      summary:
        "pH is a measure of hydrogen ion concentration. Very low pH → strong acid, very high pH → strong base. Human body systems work optimally in narrow pH ranges.",
      examTip:
        "Keep 3–4 real-life pH examples ready: stomach acid, toothpaste, soil pH, etc.",
    },
    {
      id: "abs-salts",
      title: "Important salts",
      summary:
        "Sodium carbonate, sodium hydrogen carbonate and Plaster of Paris are top-priority salts. Learn formulas, preparation, and uses.",
      examTip:
        "Underline the formula and common name together in your notes, e.g., NaHCO₃ – baking soda.",
    },
  ],

  commonMistakes: [
    "Mixing up properties of strong/weak acids with concentrated/dilute.",
    "Forgetting balanced equations while writing reactions of salts.",
    "Confusing colour changes for different indicators.",
  ],

  boardExamples: [
    {
      id: "abs-ex1",
      title: "Indicator reasoning",
      question:
        "Explain why a solution of sodium hydroxide turns phenolphthalein pink but has no effect on methyl orange.",
      patternTag: "Indicators",
    },
    {
      id: "abs-ex2",
      title: "Salt application",
      question:
        "Write the chemical formula of Plaster of Paris. How is it prepared from gypsum? State one of its uses.",
      patternTag: "Salt – POP",
    },
  ],
};

// -----------------------------------------------------------------
// SCIENCE: METALS & NON-METALS
// -----------------------------------------------------------------

const metalsBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "metals-non-metals",
  topicName: "Metals & Non-metals",
  tier: "high-roi",
  weightagePercent: 6,
});

const metalsConfig: TopicContentConfig = {
  ...metalsBase,
  heroTagline:
    "Properties, reactivity series and basic extraction ideas – a classic chapter with predictable questions.",

  quickRevisionRoadmap: [
    "1️⃣ Revise physical and chemical properties of metals and non-metals with examples.",
    "2️⃣ Learn the reactivity series and displacement reactions (metal + salt solution).",
    "3️⃣ Skim basic ideas of ore, mineral, gangue and steps of extraction for important metals.",
    "4️⃣ Revise corrosion of metals and its prevention in 4–5 crisp bullet points.",
  ],

  keyConceptsSummary:
    "Focus on properties, reactivity trends and simple extraction logic. Most questions are reasoning: ‘why does X happen’ or ‘predict the product’ based on reactivity series and properties.",

  boardExamplesSummary:
    "Frequent questions: explain why metals are malleable and ductile; predict the outcome of metal displacement reactions; describe corrosion and prevention; basic ore-to-metal flowchart.",

  recommendedVideoSummary:
    "Pick a short visual-heavy video that shows reactivity series tricks and simple animations of extraction steps.",
  recommendedVideoUrl: undefined,
  recommendedVideo: undefined,

  conceptNotes: [
    {
      id: "met-physical",
      title: "Physical properties of metals/non-metals",
      summary:
        "Metals are generally lustrous, malleable, ductile and good conductors; non-metals are the opposite, with key exceptions (like graphite, iodine).",
      examTip:
        "Memorise at least two exceptions; they make easy 1-mark questions.",
    },
    {
      id: "met-reactivity",
      title: "Reactivity series and displacement",
      summary:
        "More reactive metals displace less reactive metals from their salts in solution. The series helps predict these reactions.",
      examTip:
        "Write the reactivity series once daily for a week – it then stays in memory for the whole year.",
    },
  ],

  commonMistakes: [
    "Forgetting exceptions like mercury being liquid metal.",
    "Writing wrong products in displacement reactions (e.g., incorrect salt formation).",
    "Confusing ore names and their corresponding metals.",
  ],

  boardExamples: [
    {
      id: "met-ex1",
      title: "Displacement prediction",
      question:
        "What happens when an iron nail is placed in a copper sulphate solution? Write the balanced chemical equation.",
      patternTag: "Displacement reaction",
    },
    {
      id: "met-ex2",
      title: "Corrosion concept",
      question:
        "What is corrosion? Why is aluminium used to make aircraft bodies despite being a reactive metal?",
      patternTag: "Corrosion + reasoning",
    },
  ],
};

// -----------------------------------------------------------------
// SCIENCE: CARBON & ITS COMPOUNDS
// -----------------------------------------------------------------

const carbonBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "carbon-and-its-compounds",
  topicName: "Carbon & its Compounds",
  tier: "must-crack",
  weightagePercent: 8,
});

const carbonConfig: TopicContentConfig = {
  ...carbonBase,
  heroTagline:
    "Covalent bonding, homologous series and nomenclature – once clear, most questions become straightforward.",

  quickRevisionRoadmap: [
    "1️⃣ Revise covalent bonding using dot structures for CH₄, H₂O, CO₂, etc.",
    "2️⃣ Learn homologous series and functional groups (–OH, –CHO, –COOH, –Cl, etc.).",
    "3️⃣ Practise naming straight-chain compounds (IUPAC) with 10–15 examples.",
    "4️⃣ Skim simple reactions of hydrocarbons and ethanol/ethanoic acid with a tiny reaction map.",
  ],

  keyConceptsSummary:
    "Core: tetravalency of carbon, catenation, covalent bonding, homologous series, functional groups and basic organic reactions. Board papers love nomenclature and reasoning questions based on properties.",

  boardExamplesSummary:
    "Typical questions: draw structures, name compounds, explain properties like boiling point trends, and simple reactions such as combustion, substitution and oxidation.",

  recommendedVideoSummary:
    "Take one organic-chemistry-friendly ‘Carbon & its Compounds’ session and pause often to redraw structural formulas yourself.",
  recommendedVideoUrl: undefined,
  recommendedVideo: undefined,

  conceptNotes: [
    {
      id: "carb-covalent",
      title: "Covalent bonding & tetravalency",
      summary:
        "Carbon forms four covalent bonds by sharing electrons. This leads to a huge variety of compounds due to catenation.",
      examTip:
        "Practise electron-dot structures neatly – these diagrams often carry easy marks.",
    },
    {
      id: "carb-homologous",
      title: "Homologous series & functional groups",
      summary:
        "A homologous series is a family of compounds with the same functional group and general formula, differing by CH₂ units.",
      examTip:
        "Make a small card: ‘functional group → suffix/prefix → common example’. This helps in fast nomenclature.",
    },
  ],

  commonMistakes: [
    "Wrong or incomplete structural formulas in nomenclature.",
    "Forgetting to number the longest carbon chain while naming.",
    "Mixing functional groups (e.g., confusing alcohols and carboxylic acids).",
  ],

  boardExamples: [
    {
      id: "carb-ex1",
      title: "Name the compound",
      question:
        "Write the IUPAC name of the compound: CH₃–CH₂–CH₂–CH₂–OH. Also name the functional group present.",
      patternTag: "Nomenclature",
    },
    {
      id: "carb-ex2",
      title: "Dot structure",
      question:
        "Draw the electron-dot structure of methane and carbon dioxide molecules.",
      patternTag: "Covalent bonding diagram",
    },
  ],
};

// -----------------------------------------------------------------
// SCIENCE: LIFE PROCESSES
// -----------------------------------------------------------------

const lifeBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "life-processes",
  topicName: "Life Processes",
  tier: "must-crack",
  weightagePercent: 10,
});

const lifeConfig: TopicContentConfig = {
  ...lifeBase,
  heroTagline:
    "Nutrition, respiration, circulation and excretion – top-weight Bio chapter with diagrams and case-based questions.",

  quickRevisionRoadmap: [
    "1️⃣ Revise modes of nutrition in plants and humans with neat labelled diagrams.",
    "2️⃣ Learn human respiratory system and mechanism of breathing (with simple diagrams).",
    "3️⃣ Revise structure of heart, double circulation and concept of lymph.",
    "4️⃣ Skim excretory system in humans and basic functioning of nephron.",
  ],

  keyConceptsSummary:
    "Focus: how living organisms obtain and use energy and how waste is removed – through nutrition, respiration, circulation and excretion. Case-based questions frequently mix diagrams with reasoning.",

  boardExamplesSummary:
    "Typical PYQs: draw and label diagrams of heart, nephron or human alimentary canal; explain double circulation; compare aerobic and anaerobic respiration.",

  recommendedVideoSummary:
    "Choose one Life Processes one-shot and pause to redraw each diagram as the teacher draws it – this alone boosts your marks a lot.",
  recommendedVideoUrl: undefined,
  recommendedVideo: undefined,

  conceptNotes: [
    {
      id: "life-nutrition",
      title: "Nutrition in organisms",
      summary:
        "Autotrophic vs heterotrophic nutrition, human digestive system and associated glands. Many questions come from diagrams and enzyme roles.",
      examTip:
        "Practise labelling at least once before exam day; half-done diagrams cost silly marks.",
    },
    {
      id: "life-heart",
      title: "Heart & double circulation",
      summary:
        "Four-chambered heart ensures separation of oxygenated and deoxygenated blood; double circulation passes blood through heart twice per cycle.",
      examTip:
        "Use arrows in your diagram to clearly show direction of blood flow and colour-code (pencil shading) oxygenated vs deoxygenated.",
    },
  ],

  commonMistakes: [
    "Incorrect labelling (left/right mix-up) in heart diagrams.",
    "Confusing pulmonary artery and pulmonary vein roles.",
    "Forgetting key steps in nephron functioning in excretion answers.",
  ],

  boardExamples: [
    {
      id: "life-ex1",
      title: "Heart diagram",
      question:
        "Draw a labelled diagram of the human heart and explain the route of blood circulation.",
      patternTag: "Heart + double circulation",
    },
    {
      id: "life-ex2",
      title: "Respiration comparison",
      question:
        "Differentiate between aerobic and anaerobic respiration in plants and animals on the basis of (i) end products, (ii) energy released, (iii) site of occurrence.",
      patternTag: "Table comparison",
    },
  ],
};

// -----------------------------------------------------------------
// SCIENCE: HOW DO ORGANISMS REPRODUCE?
// -----------------------------------------------------------------

const reproduceBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "how-do-organisms-reproduce",
  topicName: "How do Organisms Reproduce?",
  tier: "high-roi",
  weightagePercent: 7,
});

const reproduceConfig: TopicContentConfig = {
  ...reproduceBase,
  heroTagline:
    "Asexual vs sexual reproduction and human reproductive system – conceptual, diagram-rich and very scoring.",

  quickRevisionRoadmap: [
    "1️⃣ Revise asexual reproduction modes: fission, budding, spore formation, regeneration, vegetative propagation.",
    "2️⃣ Learn sexual reproduction in flowering plants with diagram of flower structure.",
    "3️⃣ Revise human male and female reproductive systems with neat labelled diagrams.",
    "4️⃣ Understand basic ideas of contraception and STD awareness in respectful, exam-oriented language.",
  ],

  keyConceptsSummary:
    "The chapter explains how organisms create new individuals: from simple asexual methods to complex human reproduction. Many questions are diagram/definition based and quite predictable.",

  boardExamplesSummary:
    "Usual questions: definitions of various asexual methods, labelled diagrams of flower or reproductive organs, reasoning questions about contraception and population control.",

  recommendedVideoSummary:
    "Use one reproduction chapter video that treats the content sensitively and clearly; focus on diagrams and processes step-by-step.",
  recommendedVideoUrl: undefined,
  recommendedVideo: undefined,

  conceptNotes: [
    {
      id: "repr-asexual",
      title: "Asexual reproduction",
      summary:
        "Involves a single parent with identical offspring: binary fission in Amoeba, budding in Hydra/yeast, spore formation in fungi, vegetative propagation in plants.",
      examTip:
        "Make a 1-page summary with one diagram and 1–2 lines for each method. This alone covers multiple 1–3 mark questions.",
    },
    {
      id: "repr-human",
      title: "Human reproductive system",
      summary:
        "Covers male and female reproductive organs, gamete formation and fertilisation. Answers must be clear and respectful.",
      examTip:
        "In exam, focus on scientific language and clear diagrams; avoid slang or vague words.",
    },
  ],

  commonMistakes: [
    "Mixing up names and positions of reproductive organs in diagrams.",
    "Writing casual or non-scientific language in sensitive answers.",
    "Confusing vegetative propagation (potato, Bryophyllum) with other asexual modes.",
  ],

  boardExamples: [
    {
      id: "repr-ex1",
      title: "Asexual method",
      question:
        "Explain binary fission in Amoeba with the help of labelled diagrams.",
      patternTag: "Binary fission diagram",
    },
    {
      id: "repr-ex2",
      title: "Human reproduction",
      question:
        "Draw a labelled diagram of the human female reproductive system and explain the role of ovary and uterus.",
      patternTag: "Female system",
    },
  ],
};

// -----------------------------------------------------------------
// SCIENCE: HUMAN EYE & COLOURFUL WORLD
// -----------------------------------------------------------------

const eyeBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "human-eye-colourful-world",
  topicName: "Human Eye & Colourful World",
  tier: "high-roi",
  weightagePercent: 6,
});

const eyeConfig: TopicContentConfig = {
  ...eyeBase,
  heroTagline:
    "Structure of eye, defects and colour effects like dispersion and scattering – a neat conceptual chapter.",

  quickRevisionRoadmap: [
    "1️⃣ Revise structure and working of the human eye with labelled diagram.",
    "2️⃣ Learn myopia and hypermetropia – causes and corrections with ray diagrams.",
    "3️⃣ Understand dispersion of light through a prism, formation of rainbow, and scattering (Tyndall effect, blue sky, red sunset).",
    "4️⃣ Practise at least 4 reasoning questions from NCERT examples and intext questions.",
  ],

  keyConceptsSummary:
    "This chapter connects optics to human vision and natural phenomena. Examiners love conceptual ‘why’ questions and neat diagrams.",

  boardExamplesSummary:
    "Expected questions: draw labelled eye diagram, explain defects and corrections, describe dispersion through prism, account for blue colour of sky and reddish appearance of sun at sunrise/sunset.",

  recommendedVideoSummary:
    "Watch a short concept video that shows animations of dispersion, rainbow formation and scattering – these visuals make answers easier to recall.",
  recommendedVideoUrl: undefined,
  recommendedVideo: undefined,

  conceptNotes: [
    {
      id: "eye-structure",
      title: "Structure of the human eye",
      summary:
        "Important parts: cornea, iris, pupil, lens, retina, ciliary muscles, optic nerve. Accommodation allows focusing on near and far objects.",
      examTip:
        "Practise one clean diagram with all labels – this can directly appear for 3–4 marks.",
    },
    {
      id: "eye-defects",
      title: "Eye defects & their correction",
      summary:
        "Myopia → difficulty seeing distant objects → corrected with concave lens. Hypermetropia → difficulty seeing nearby objects → corrected with convex lens.",
      examTip:
        "Always mention cause, effect on image position, and corrective lens with a ray diagram.",
    },
  ],

  commonMistakes: [
    "Missing labels in the eye diagram or mislabelling lens/retina.",
    "Confusing which lens corrects which defect.",
    "Giving vague explanations for blue sky / red sunset without mentioning scattering of light.",
  ],

  boardExamples: [
    {
      id: "eye-ex1",
      title: "Eye defect question",
      question:
        "What is hypermetropia? State its two causes. How is it corrected? Draw a ray diagram to show its correction.",
      patternTag: "Hypermetropia",
    },
    {
      id: "eye-ex2",
      title: "Blue sky reasoning",
      question:
        "Why does the sky appear blue to us? Why does it appear reddish during sunrise and sunset?",
      patternTag: "Scattering explanation",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: STATISTICS
// -----------------------------------------------------------------

const statisticsBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "statistics",
  topicName: "Statistics",
  tier: "must-crack",
  weightagePercent: 11,
});

const statisticsConfig: TopicContentConfig = {
  ...statisticsBase,
  heroTagline:
    "Mean, median, mode of grouped data and graphs – one of the highest weight, most predictable chapters.",

  quickRevisionRoadmap: [
    "1️⃣ Revise formulas for mean of grouped data (including step-deviation method).",
    "2️⃣ Practise 4–5 questions each on median and mode of grouped frequency distribution.",
    "3️⃣ Draw at least one ogive and practise reading median/percentiles from the graph.",
    "4️⃣ Do 3–4 case-study or interpretation questions based on data tables and graphs.",
  ],

  keyConceptsSummary:
    "The chapter is about summarising large data using averages and graphs. You must be comfortable handling class intervals, midpoints, cumulative frequencies and using them in formulas.",

  boardExamplesSummary:
    "Typical PYQs: calculate mean/median/mode from grouped data tables; draw ogive to find median; compare two data sets; read information off a given graph.",

  recommendedVideoSummary:
    "Choose a chapter video that slowly walks through 2–3 full tables for each of mean, median and mode, including all working columns.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=E23D8tPLX0o",
  recommendedVideo: {
    title: "Statistics Class 10 | Mean, Median, Mode & Ogive",
    url: "https://www.youtube.com/watch?v=E23D8tPLX0o",
    channel: "Any trusted Class 10 Maths channel",
    meta: "≈1.5 hr • Full chapter",
  },

  conceptNotes: [
    {
      id: "stat-mean",
      title: "Mean of grouped data",
      summary:
        "Use xᵢ as midpoints of class intervals and fᵢ as frequencies. Direct, assumed mean and step-deviation methods simplify calculations.",
      examTip:
        "In long questions, prefer step-deviation to reduce arithmetic and avoid mistakes.",
    },
    {
      id: "stat-median",
      title: "Median of grouped data",
      summary:
        "Median class is the one where cumulative frequency just crosses N/2. Use formula with lower boundary, class size, frequency and cumulative frequency before it.",
      examTip:
        "Write a small CF column every time – this prevents mis-identifying the median class.",
    },
    {
      id: "stat-mode",
      title: "Mode of grouped data",
      summary:
        "Modal class is the one with highest frequency. Use the formula involving frequencies of modal, previous and next class.",
      examTip:
        "Underline the three relevant frequencies f₁, f₀, f₂ in the table before substituting.",
    },
  ],

  commonMistakes: [
    "Using wrong midpoints or forgetting to add frequency column correctly.",
    "Mixing up class boundaries and limits in median formula.",
    "Picking wrong class as modal class when two have nearly equal frequency.",
  ],

  boardExamples: [
    {
      id: "stat-ex1",
      title: "Mean via step-deviation",
      question:
        "The following table shows marks obtained by 40 students in a test. Find the mean using step-deviation method. (Give a small sample table in actual paper.)",
      patternTag: "Grouped mean",
    },
    {
      id: "stat-ex2",
      title: "Median from ogive",
      question:
        "The ogive given represents the marks of 100 students. Use it to find the median marks.",
      patternTag: "Graph-based median",
    },
  ],
};

// -----------------------------------------------------------------
// MATHS: PROBABILITY
// -----------------------------------------------------------------

const probabilityBase = buildGenericTopicConfig({
  subjectKey: "Maths",
  topicKey: "probability",
  topicName: "Probability",
  tier: "must-crack",
  weightagePercent: 8,
});

const probabilityConfig: TopicContentConfig = {
  ...probabilityBase,
  heroTagline:
    "Simple experiments like coins, dice and cards – probability is pure logic plus counting outcomes.",

  quickRevisionRoadmap: [
    "1️⃣ Revise the classical definition: P(E) = favourable outcomes / total outcomes, with all outcomes equally likely.",
    "2️⃣ Practise problems on single and double coin tosses, single and double dice throws.",
    "3️⃣ Do 4–5 questions on drawing cards from a standard deck, with and without replacement.",
    "4️⃣ Solve case-based questions that combine probability with simple data interpretation.",
  ],

  keyConceptsSummary:
    "You mostly work with simple experiments where total outcomes are easy to list. The skill is translating words into events, counting correctly and simplifying fractions.",

  boardExamplesSummary:
    "Common PYQs: probability of getting particular numbers on dice; selecting certain types of cards from a pack; probability of events like “at least one head” or “not a prime number”; word problems around defective items or survey data.",

  recommendedVideoSummary:
    "Use a short but dense video full of mixed problems – your understanding will mainly come from doing 25–30 questions yourself.",
  recommendedVideoUrl: "https://www.youtube.com/watch?v=1bH3xZ94ktA",
  recommendedVideo: {
    title: "Probability Class 10 | Full Chapter Revision",
    url: "https://www.youtube.com/watch?v=1bH3xZ94ktA",
    channel: "Any trusted Class 10 Maths channel",
    meta: "≈1 hr • Coins, dice, cards, word problems",
  },

  conceptNotes: [
    {
      id: "prob-basic",
      title: "Basic probability ideas",
      summary:
        "For experiment with equally likely outcomes, P(E) = n(E)/n(S) and 0 ≤ P(E) ≤ 1. Also, P(E) + P(not E) = 1.",
      examTip:
        "Check whether question is actually asking for complement – that is often easier to compute.",
    },
    {
      id: "prob-coins-dice",
      title: "Coins and dice",
      summary:
        "For one fair die, sample space has 6 outcomes; for two dice, 36 ordered pairs. For tossing coins, outcomes are HH, HT, TH, TT etc.",
      examTip:
        "Write sample space once on rough sheet and mark favourable outcomes cleanly.",
    },
    {
      id: "prob-cards",
      title: "Playing cards essentials",
      summary:
        "Know that a standard deck has 52 cards, 4 suits, 13 cards per suit, 26 red and 26 black, 12 face cards, 4 aces etc.",
      examTip:
        "Before solving card questions, quickly recall these counts to avoid mistakes.",
    },
  ],

  commonMistakes: [
    "Confusing the total number of outcomes (e.g., forgetting that two dice → 36 outcomes).",
    "Adding probabilities when events are not mutually exclusive.",
    "Simplifying fractions incorrectly at the end.",
  ],

  boardExamples: [
    {
      id: "prob-ex1",
      title: "At least one head",
      question:
        "Two coins are tossed simultaneously. Find the probability of getting at least one head.",
      patternTag: "Complement event",
    },
    {
      id: "prob-ex2",
      title: "Card selection",
      question:
        "One card is drawn from a well-shuffled pack of 52 playing cards. Find the probability that it is (i) a king, (ii) a red card, (iii) not an ace.",
      patternTag: "Standard card question",
    },
  ],
};

// =================================================================
// REGISTRY – what TopicHub actually reads
// =================================================================
const mathsContentRegistry: Record<string, TopicContentConfig> = {
  // Real Numbers
  "real-numbers": realNumbersConfig,
  "Real Numbers": realNumbersConfig,

  // Polynomials
  polynomials: polynomialsConfig,
  Polynomials: polynomialsConfig,

  // Pair of Linear Equations
  "pair-of-linear-equations": pleConfig,
  "Pair of Linear Equations": pleConfig,
  "Pair of Linear Equations in Two Variables": pleConfig,

  // Quadratic Equations
  "quadratic-equations": quadraticConfig,
  "Quadratic Equations": quadraticConfig,

  // Arithmetic Progression
  "arithmetic-progression": apConfig,
  "Arithmetic Progressions": apConfig,
  "Arithmetic Progression": apConfig,

  // Triangles
  triangles: trianglesConfig,
  Triangles: trianglesConfig,

 "coordinate-geometry": coordConfig,
  "Coordinate Geometry": coordConfig,

  // Circles
  circles: circlesConfig,
  Circles: circlesConfig,

  // Areas Related to Circles
  "areas-related-to-circles": areasCirclesConfig,
  "Areas Related to Circles": areasCirclesConfig,

  // Surface Areas and Volumes
  "surface-areas-and-volumes": savConfig,
  "Surface Areas and Volumes": savConfig,
// Constructions
  constructions: constructionsConfig,
  Constructions: constructionsConfig,
  
  // Statistics
  Sstatistics: statisticsConfig,
  Statistics: statisticsConfig,

  // Probability
  probability: probabilityConfig,
  Probability: probabilityConfig,


  // Trigonometry
  trigonometry: trigConfig,
  "Introduction to Trigonometry": trigConfig,
  "Trigonometry (Introduction + Applications)": trigConfig,
  Trigonometry: trigConfig,
};

// -----------------------------------------------------------------
// SCIENCE: MAGNETIC EFFECTS OF ELECTRIC CURRENT
// -----------------------------------------------------------------

const magneticBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "magnetic-effects-of-electric-current",
  topicName: "Magnetic Effects of Electric Current",
  tier: "must-crack",
  weightagePercent: 8,
});

const magneticConfig: TopicContentConfig = {
  ...magneticBase,
  heroTagline:
    "Field lines + right-hand rules + Fleming’s rules – once these pictures are clear, most questions become automatic.",

  quickRevisionRoadmap: [
    "1️⃣ Revise magnetic field lines: direction (N → S outside, S → N inside), properties, and field due to a straight conductor and solenoid.",
    "2️⃣ Practise right-hand thumb rule, right-hand grip rule, and Fleming’s left-hand rule for force on a current-carrying conductor.",
    "3️⃣ Learn the principle, construction and working of an electric motor with a clean labelled diagram.",
    "4️⃣ Skim the difference between motor and generator; note which rule is used where.",
  ],

  keyConceptsSummary:
    "Core ideas: (i) current-carrying conductors produce magnetic fields, (ii) field lines represent strength and direction of the field, (iii) direction rules: thumb rules and Fleming’s left-hand rule, (iv) construction and working of electric motor and simple ideas of electromagnetic induction & generator. Most questions are reasoning or diagram based.",

  boardExamplesSummary:
    "Common patterns: draw and label field lines around a bar magnet or straight conductor, state right-hand thumb rule, explain the working of an electric motor with a diagram, or distinguish between motor and generator. 2-mark questions often ask you to predict the direction of force or current using Fleming’s rules.",
};

// -----------------------------------------------------------------
// SCIENCE: ELECTRICITY
// -----------------------------------------------------------------

const electricityBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "electricity",
  topicName: "Electricity",
  tier: "must-crack",
  weightagePercent: 10,
});

const electricityConfig: TopicContentConfig = {
  ...electricityBase,
  heroTagline:
    "Ohm’s law, series/parallel combinations, and power numericals – this chapter is a guaranteed marks booster.",

  quickRevisionRoadmap: [
    "1️⃣ Revise basic quantities: potential difference (V), current (I), resistance (R) and Ohm’s law V = IR.",
    "2️⃣ Practise finding equivalent resistance in series and parallel combinations using simple circuits.",
    "3️⃣ Solve numericals on electrical energy, power (P = VI = I²R = V²/R) and heating effect of current.",
    "4️⃣ Do 4–5 mixed PYQs where you have to first simplify the circuit, then calculate current / potential drop / power.",
  ],

  keyConceptsSummary:
    "Key ideas: Ohm’s law and its graph, factors affecting resistance (length, area, material), series and parallel combinations of resistors, Joule’s law of heating, and electrical power. Most questions are numerical with straightforward substitution once the circuit is simplified.",

  boardExamplesSummary:
    "Popular PYQs: draw V–I graph and find resistance from slope; calculate current in each branch of a network; compute heat produced in a resistor; compare power consumed in two bulbs. Many case-based questions revolve around practical circuits and domestic electricity use.",
};

// -----------------------------------------------------------------
// SCIENCE: LIGHT – REFLECTION & REFRACTION
// -----------------------------------------------------------------

const lightBase = buildGenericTopicConfig({
  subjectKey: "Science",
  topicKey: "light-reflection-refraction",
  topicName: "Light – Reflection and Refraction",
  tier: "high-roi",
  weightagePercent: 9,
});

const lightConfig: TopicContentConfig = {
  ...lightBase,
  heroTagline:
    "Mirror/lens formula + ray diagrams + sign convention – nail these and the rest of the chapter feels easy.",

  quickRevisionRoadmap: [
    "1️⃣ Learn mirror formula 1/f = 1/v + 1/u and lens formula 1/f = 1/v – 1/u with the new Cartesian sign convention.",
    "2️⃣ Practise drawing ray diagrams for image formation by concave mirror and convex/concave lenses for key positions.",
    "3️⃣ Solve numericals on image distance, focal length and magnification (m = v/u or hʹ/h).",
    "4️⃣ Revise real-life applications: mirrors in headlights, side mirrors, lenses in spectacles, camera, and eye defects (myopia + hypermetropia).",
  ],

  keyConceptsSummary:
    "Important ideas: reflection and refraction laws, refractive index, mirror and lens formulae with sign convention, magnification, and eye defects with their correction. In the exam, you almost always get one ray diagram + one numerical + one reasoning/application question.",

  boardExamplesSummary:
    "Frequent PYQs: use of convex/concave mirrors in daily life, numerical on image position using mirror/lens formula, drawing ray diagram for image formation, listing the nature/size of image, and short questions on power of lens or refractive index.",
};

const scienceContentRegistry: Record<string, TopicContentConfig> = {
  // Chemical Reactions & Equations
  "chemical-reactions-equations": chemReactionsConfig,
  "Chemical Reactions & Equations": chemReactionsConfig,

  // Acids, Bases & Salts
  "acids-bases-salts": acidsBasesConfig,
  "Acids, Bases & Salts": acidsBasesConfig,

  // Metals & Non-metals
  "metals-non-metals": metalsConfig,
  "Metals & Non-metals": metalsConfig,

  // Carbon & its Compounds
  "carbon-and-its-compounds": carbonConfig,
  "Carbon & its Compounds": carbonConfig,

  // Life Processes
  "life-processes": lifeConfig,
  "Life Processes": lifeConfig,

  // How do Organisms Reproduce?
  "how-do-organisms-reproduce": reproduceConfig,
  "How do Organisms Reproduce?": reproduceConfig,

  // Light – Reflection & Refraction
  "light-reflection-refraction": lightConfig,
  "Light – Reflection and Refraction": lightConfig,
  "Light – Reflection & Refraction": lightConfig,

  // Human Eye & Colourful World
  "human-eye-colourful-world": eyeConfig,
  "Human Eye & Colourful World": eyeConfig,

  // Electricity
  electricity: electricityConfig,
  Electricity: electricityConfig,

  // Magnetic Effects of Electric Current
  "magnetic-effects-of-electric-current": magneticConfig,
  "Magnetic Effects of Electric Current": magneticConfig,
};

// -----------------------------------------------------------------
// Public helper – TopicHub calls this
// -----------------------------------------------------------------

export function getTopicContent(
  subjectKey: Class10SubjectKey,
  rawTopicKey: string | undefined
): TopicContentConfig {
  const topicKey = rawTopicKey ?? "generic-topic";

  const registry =
    subjectKey === "Science" ? scienceContentRegistry : mathsContentRegistry;

  // 1. Direct hit
  const existing = registry[topicKey];
  if (existing) return existing;

  // 2. Case-insensitive fallback (so “real numbers” also works)
  const ciMatch = Object.entries(registry).find(
    ([key]) => key.toLowerCase() === topicKey.toLowerCase()
  );
  if (ciMatch) return ciMatch[1];

  // 3. Generic fallback
  const normalisedName =
    topicKey === "generic-topic"
      ? "Topic"
      : topicKey
          .replace(/-/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/\b\w/g, (ch) => ch.toUpperCase());

  return buildGenericTopicConfig({
    subjectKey,
    topicKey,
    topicName: normalisedName,
  });
}
