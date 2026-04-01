// src/data/questionGenerator.ts
// Unified Maths + Science practice question generator.
// ---------------------------------------------------
// This sits *on top of* the curated prediction banks and small
// per-topic generators (like scienceQuestionGenerator.ts).
//
// Design goals:
// - Single entry point for TopicHub / practice modes.
// - Works for BOTH subjects with the same API.
// - Can mix curated bank questions + templated generated questions.
// - Preserves difficulty, section and Bloom tags for downstream UI.

import type { Class10TopicKey } from "./class10MathTopicTrends";
import type { Class10ScienceTopicKey } from "./class10ScienceTopicTrends";

import type {
  PredictedQuestion,
  DifficultyKey,
  BloomSkill,
  SectionKey,
} from "./predictedQuestions";
import { predictedQuestions } from "./predictedQuestions";
import { predictedQuestionsAdditions } from "./predictedQuestionsAdditions";

import type {
  PredictedQuestionScience,
} from "./predictedQuestionsScience";
import { predictedQuestionsScience } from "./predictedQuestionsScience";

import {
  generateScienceQuestionsForPractice,
  type ScienceGeneratorRequest,
  type GeneratedScienceQuestion,
} from "./scienceQuestionGenerator";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type SubjectKey = "Maths" | "Science";

export type UnifiedTopicKey = Class10TopicKey | Class10ScienceTopicKey;

export interface UnifiedPracticeQuestion {
  // Unique ID in the context of the generated set
  id: string;

  subject: SubjectKey;
  topicKey: UnifiedTopicKey;
  subtopic?: string;

  section: SectionKey;
  marks: number;
  difficulty: DifficultyKey;
  bloomSkill: BloomSkill;

  questionText: string;
  options?: string[];

  // Solution metadata
  answer?: string;
  finalAnswer?: string;
  explanation?: string;
  solutionSteps?: string[];

  // Where did this question come from?
  source: "bank" | "generated";
  // For bank questions we keep a pointer to the original id
  bankId?: string;
}

export type MixMode =
  | "bank-first"
  | "generated-first"
  | "only-bank"
  | "only-generated";

export interface UnifiedGeneratorRequest {
  subject: SubjectKey;
  topicKey: UnifiedTopicKey;
  count: number;

  section?: SectionKey;
  difficulty?: DifficultyKey;
  bloomSkill?: BloomSkill;

  mixMode?: MixMode;
}

// ✅ Single source of truth for Maths bank questions (seed + append-only additions)
const ALL_MATHS_BANK_QUESTIONS: PredictedQuestion[] = [
  ...predictedQuestions,
  ...predictedQuestionsAdditions,
];

// ---------------------------------------------------------------------------
// Internal helpers – random sampling
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffledCopy<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sampleMany<T>(items: readonly T[], count: number): T[] {
  if (count <= 0 || items.length === 0) return [];
  if (count >= items.length) return [...items];
  return shuffledCopy(items).slice(0, count);
}

// ---------------------------------------------------------------------------
// Internal helpers – bank → unified mapping
// ---------------------------------------------------------------------------

function mapMathsBankQuestion(q: PredictedQuestion): UnifiedPracticeQuestion {
  return {
    id: `MATHS-BANK-${q.id}`,
    subject: "Maths",
    topicKey: q.topicKey,
    subtopic: q.subtopic,
    section: q.section,
    marks: q.marks,
    difficulty: q.difficulty,
    bloomSkill: q.bloomSkill,
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    finalAnswer: q.finalAnswer,
    explanation: q.explanation,
    solutionSteps: q.solutionSteps,
    source: "bank",
    bankId: q.id,
  };
}

function mapScienceBankQuestion(
  q: PredictedQuestionScience
): UnifiedPracticeQuestion {
  return {
    id: `SCI-BANK-${q.id}`,
    subject: "Science",
    topicKey: q.topicKey,
    subtopic: q.subtopic,
    section: q.section,
    marks: q.marks,
    difficulty: q.difficulty,
    bloomSkill: q.bloomSkill,
    questionText: q.questionText,
    options: q.options,
    answer: q.answer,
    finalAnswer: q.finalAnswer,
    explanation: q.explanation,
    solutionSteps: q.solutionSteps,
    source: "bank",
    bankId: q.id,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers – template generators for Maths
// ---------------------------------------------------------------------------

export interface MathsGeneratedQuestion {
  id: string;
  topicKey: Class10TopicKey;
  subtopic?: string;
  section: SectionKey;
  marks: number;
  difficulty: DifficultyKey;
  bloomSkill: BloomSkill;
  questionText: string;
  answer: string;
  explanation: string;
  solutionSteps?: string[];
}

export interface MathsGeneratorRequest {
  topicKey: Class10TopicKey;
  subtopicHint?: string;
  section?: SectionKey;
  difficulty?: DifficultyKey;
  count: number;
}

/**
 * Entry point for Maths-only generation. For now this supports
 * a couple of core chapters (AP, Quadratic Equations) with
 * clean CBSE-style numericals. We can grow this gradually.
 */
function generateMathsQuestionsForPractice(
  req: MathsGeneratorRequest
): MathsGeneratedQuestion[] {
  const { topicKey } = req;

  if (topicKey === "Arithmetic Progression") {
    return generateApNumericals(req);
  }

  if (topicKey === "Quadratic Equations") {
    return generateQuadraticRootQuestions(req);
  }

  // Default: no generator yet for this topic.
  return [];
}

// --- Arithmetic Progression template ---------------------------------------

function generateApNumericals(
  req: MathsGeneratorRequest
): MathsGeneratedQuestion[] {
  const results: MathsGeneratedQuestion[] = [];
  const count = Math.max(1, req.count);

  for (let i = 0; i < count; i++) {
    const a = randomInt(1, 15); // first term
    const d = randomInt(2, 9); // common difference
    const n = randomInt(6, 12); // number of terms

    const an = a + (n - 1) * d;
    const Sn = (n / 2) * (2 * a + (n - 1) * d);

    const questionText = `The first term of an AP is ${a} and its common difference is ${d}. Find (i) the ${n}th term and (ii) the sum of the first ${n} terms.`;

    const answer = `a_${n} = ${an},  S_${n} = ${Sn}`;

    const explanation =
      "Use a_n = a + (n − 1)d to obtain the nth term, then S_n = n/2 [2a + (n − 1)d] to compute the sum of the first n terms.";

    const solutionSteps: string[] = [
      "Write the given values: first term a and common difference d; identify n.",
      "Use a_n = a + (n − 1)d and substitute the values of a, d, n to find a_n.",
      "Use S_n = n/2 [2a + (n − 1)d] and substitute to get the sum S_n.",
      "Simplify both expressions and present the final values of a_n and S_n.",
    ];

    results.push({
      id: `MATHS-GEN-AP-${Date.now()}-${i}`,
      topicKey: "Arithmetic Progression",
      subtopic: "AP Formulas & Numericals (Generated)",
      section: req.section ?? "C",
      marks: 3,
      difficulty: req.difficulty ?? "Medium",
      bloomSkill: "Applying",
      questionText,
      answer,
      explanation,
      solutionSteps,
    });
  }

  return results;
}

// --- Quadratic Equations template ------------------------------------------

// --- Quadratic Equations template ------------------------------------------

function generateQuadraticRootQuestions(
  req: MathsGeneratorRequest
): MathsGeneratedQuestion[] {
  const results: MathsGeneratedQuestion[] = [];
  const count = Math.max(1, req.count);

  // Difficulty comes from your prediction engine (Option C)
  const difficulty = req.difficulty ?? "Medium";

  // Small helper: avoid 0 too often
  const pickNonZeroInt = (min: number, max: number, fallback: number) => {
    const v = randomInt(min, max);
    return v === 0 ? fallback : v;
  };

  for (let i = 0; i < count; i++) {
    // 1. Choose roots – same “nice” integer style for all difficulties
    const r1 = pickNonZeroInt(-6, 6, 2);
    const r2 = pickNonZeroInt(-6, 6, 3);

    // 2. Choose 'a' based on difficulty (CBSE-ish control)
    //    Easy  → usually a = 1 (monic, very standard)
    //    Medium → sometimes a = 2 or 3
    //    Hard   → a can be 2, 3, 4, or 5
    let a = 1;
    if (difficulty === "Medium") {
      a = randomInt(1, 3); // allows 1, 2, 3
    } else if (difficulty === "Hard") {
      a = randomInt(2, 5); // strictly non-monic
    }

    // 3. Use the general form: a(x − α)(x − β) = 0
    const sum = r1 + r2;
    const product = r1 * r2;

    const b = -a * sum;
    const c = a * product;

    const leadingPart = a === 1 ? "x²" : `${a}x²`;
    const bxPart = b >= 0 ? ` + ${b}x` : ` - ${-b}x`;
    const cPart = c >= 0 ? ` + ${c}` : ` - ${-c}`;

    const quadraticText = `${leadingPart}${bxPart}${cPart} = 0`;

    const questionText = `Form a quadratic equation in x whose roots are ${r1} and ${r2}. Then verify that ${r1} and ${r2} are indeed the roots of the equation.`;

    const answer = `One such quadratic is ${quadraticText}. Substituting x = ${r1} and x = ${r2} each makes the left-hand side 0, so both are roots of the equation.`;

    const explanation =
      "If α and β are roots of a quadratic, any equation of the form a(x − α)(x − β) = 0, with a ≠ 0, will have α and β as its roots. " +
      "Expanding gives ax² − a(α + β)x + aαβ = 0, which is in the standard form ax² + bx + c = 0. " +
      "Here we choose a simple integer value for a and then compute b and c using the sum and product of the roots.";

    const solutionSteps: string[] = [
      "Let the required quadratic be a(x − α)(x − β) = 0, where a ≠ 0 and α, β are the given roots.",
      "Expand: a(x − α)(x − β) = ax² − a(α + β)x + aαβ, so the quadratic in standard form is ax² + bx + c = 0 with b = −a(α + β) and c = aαβ.",
      `Substitute α = ${r1}, β = ${r2} and a = ${a} to obtain specific integer values of b and c.`,
      `Write the quadratic as ${quadraticText}.`,
      `Verify by substituting x = ${r1} and x = ${r2} to check that the left-hand side becomes 0 in each case.`,
    ];

    results.push({
      id: `MATHS-GEN-QE-${Date.now()}-${i}`,
      topicKey: "Quadratic Equations",
      subtopic: "Quadratic from Given Roots (Generated)",
      section: req.section ?? "C",
      marks: 3,
      difficulty: difficulty,
      bloomSkill: "Applying",
      questionText,
      answer,
      explanation,
      solutionSteps,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Mapping of generated → unified
// ---------------------------------------------------------------------------

function mapMathsGeneratedQuestion(
  q: MathsGeneratedQuestion
): UnifiedPracticeQuestion {
  return {
    id: q.id,
    subject: "Maths",
    topicKey: q.topicKey,
    subtopic: q.subtopic,
    section: q.section,
    marks: q.marks,
    difficulty: q.difficulty,
    bloomSkill: q.bloomSkill,
    questionText: q.questionText,
    options: undefined,
    answer: q.answer,
    finalAnswer: undefined,
    explanation: q.explanation,
    solutionSteps: q.solutionSteps,
    source: "generated",
    bankId: undefined,
  };
}

function mapScienceGeneratedQuestion(
  q: GeneratedScienceQuestion
): UnifiedPracticeQuestion {
  return {
    id: q.id,
    subject: "Science",
    topicKey: q.topicKey,
    subtopic: q.subtopic,
    section: q.section,
    marks: q.marks,
    difficulty: q.difficulty,
    bloomSkill: q.bloomSkill,
    questionText: q.questionText,
    options: undefined,
    answer: q.answer,
    finalAnswer: undefined,
    explanation: q.explanation,
    solutionSteps: q.solutionSteps,
    source: "generated",
    bankId: undefined,
  };
}

// ---------------------------------------------------------------------------
// Public API – unified generator
// ---------------------------------------------------------------------------

export function generateUnifiedPracticeQuestions(
  req: UnifiedGeneratorRequest
): UnifiedPracticeQuestion[] {
  const mixMode: MixMode = req.mixMode ?? "generated-first";
  const count = Math.max(1, req.count);

  const wantsGenerated = mixMode !== "only-bank";
  const wantsBank = mixMode !== "only-generated";

  const results: UnifiedPracticeQuestion[] = [];

  let remaining = count;

  // 1) Generated questions (optional)
  if (wantsGenerated) {
    if (req.subject === "Science") {
      const sciReq: ScienceGeneratorRequest = {
        topicKey: req.topicKey as Class10ScienceTopicKey,
        subtopicHint: undefined,
        section: req.section,
        difficulty: req.difficulty,
        count: remaining,
      };
      const generatedSci = generateScienceQuestionsForPractice(sciReq).map(
        mapScienceGeneratedQuestion
      );
      results.push(...generatedSci);
      remaining -= generatedSci.length;
    } else if (req.subject === "Maths") {
      const mathsReq: MathsGeneratorRequest = {
        topicKey: req.topicKey as Class10TopicKey,
        subtopicHint: undefined,
        section: req.section,
        difficulty: req.difficulty,
        count: remaining,
      };
      const generatedMaths = generateMathsQuestionsForPractice(mathsReq).map(
        mapMathsGeneratedQuestion
      );
      results.push(...generatedMaths);
      remaining -= generatedMaths.length;
    }
  }

  // 2) Bank questions (optional, used to top up if needed)
  if (wantsBank && remaining > 0) {
    if (req.subject === "Science") {
      const pool = predictedQuestionsScience.filter((q) => {
        if (q.topicKey !== (req.topicKey as Class10ScienceTopicKey)) return false;
        if (req.section && q.section !== req.section) return false;
        if (req.difficulty && q.difficulty !== req.difficulty) return false;
        return true;
      });

      const picked = sampleMany(pool, remaining).map(mapScienceBankQuestion);
      if (mixMode === "bank-first") {
        results.unshift(...picked);
      } else {
        results.push(...picked);
      }
    } else if (req.subject === "Maths") {
      const pool = ALL_MATHS_BANK_QUESTIONS.filter((q) => {
        if (q.topicKey !== (req.topicKey as Class10TopicKey)) return false;
        if (req.section && q.section !== req.section) return false;
        if (req.difficulty && q.difficulty !== req.difficulty) return false;
        return true;
      });

      const picked = sampleMany(pool, remaining).map(mapMathsBankQuestion);
      if (mixMode === "bank-first") {
        results.unshift(...picked);
      } else {
        results.push(...picked);
      }
    }
  }

  return results;
}
