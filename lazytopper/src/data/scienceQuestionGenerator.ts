// src/data/scienceQuestionGenerator.ts
// Tiny skeleton for a Science practice generator.
// This does *not* replace the curated predictive bank.
// Instead, it can be used by TopicHub / practice modes
// to generate extra exam-pattern questions on demand.

import type { Class10ScienceTopicKey } from "./class10ScienceTopicTrends";
import type {
  DifficultyKey,
  BloomSkill,
  SectionKey,
} from "./predictedQuestionsScience";

/**
 * Minimal shape for a generated practice question.
 * Closely mirrors SciencePredictedQuestion, but kept separate
 * so we can evolve generator behaviour without touching the
 * curated predictive bank types.
 */
export interface GeneratedScienceQuestion {
  id: string;
  topicKey: Class10ScienceTopicKey;
  subtopic: string;
  section: SectionKey;
  marks: number;
  difficulty: DifficultyKey;
  bloomSkill: BloomSkill;
  questionText: string;
  answer: string;
  explanation: string;
  solutionSteps?: string[];
}

export interface ScienceGeneratorRequest {
  topicKey: Class10ScienceTopicKey;
  subtopicHint?: string;
  section?: SectionKey;
  difficulty?: DifficultyKey;
  count: number;
}

/**
 * Simple utility for integer sampling in a closed range.
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Entry point for generating additional practice questions.
 * For now this only supports a small numeric template for
 * Light (mirror / lens formula). We will grow this gradually
 * topic by topic.
 */
export function generateScienceQuestionsForPractice(
  req: ScienceGeneratorRequest
): GeneratedScienceQuestion[] {
  const { topicKey } = req;

  if (topicKey === "Light") {
    return generateLightNumericals(req);
  }

  // Default: no generator for this topic yet.
  return [];
}

/**
 * Very small starter: generates convex lens numericals of the form
 * "given f and u, find v and magnification". All questions are tagged
 * as 3-mark, Applying-level, Section C.
 */
function generateLightNumericals(
  req: ScienceGeneratorRequest
): GeneratedScienceQuestion[] {
  const results: GeneratedScienceQuestion[] = [];
  const count = Math.max(1, req.count);

  for (let i = 0; i < count; i++) {
    // Sample focal length between +10 cm and +25 cm (convex lens)
    const f = randomInt(10, 25);
    // Sample object distance between 20 cm and 60 cm
    const uMag = randomInt(20, 60);
    const u = -uMag; // negative by sign convention

    // Compute v using lens formula: 1/f = 1/v − 1/u
    const oneOverV = 1 / f + 1 / u;
    const v = 1 / oneOverV;

    const m = v / u;

    const id = `GEN-LIGHT-LENS-${Date.now()}-${i}`;

    const questionText =
      `A convex lens of focal length ${f} cm forms an image of an object ` +
      `placed at ${uMag} cm on the left of the lens. ` +
      `Using the lens formula, find the position of the image and the magnification produced.`;

    const answer =
      `Given f = +${f} cm, u = ${u} cm. ` +
      `Using 1/f = 1/v − 1/u, we get 1/v = 1/${f} + 1/${u}. ` +
      `Solving gives v ≈ ${v.toFixed(1)} cm. ` +
      `Magnification m = v / u ≈ ${m.toFixed(
        2
      )}. Sign of m shows image is ${m < 0 ? "real and inverted" : "virtual and erect"}.`;

    const explanation =
      "Apply the lens formula 1/f = 1/v − 1/u with proper sign convention " +
      "(object distance negative, real image positive). Then compute magnification m = v / u " +
      "to interpret the nature and size of the image.";

    const steps: string[] = [
      "Write the known values of f and u with proper signs.",
      "Use the lens formula 1/f = 1/v − 1/u and substitute the values.",
      "Rearrange to find 1/v and then v.",
      "Compute magnification m = v / u and comment on sign and magnitude.",
    ];

    results.push({
      id,
      topicKey: "Light",
      subtopic: "Lens Formula & Numericals (Generated)",
      section: "C",
      marks: 3,
      difficulty: req.difficulty ?? "Medium",
      bloomSkill: "Applying",
      questionText,
      answer,
      explanation,
      solutionSteps: steps,
    });
  }

  return results;
}
