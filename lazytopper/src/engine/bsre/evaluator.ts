import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  EvaluationResult,
  Fixture,
  Rubric,
  RubricStep,
  RubricsFile,
  StepEvaluation
} from './types.ts';

const evaluatorDir = path.dirname(fileURLToPath(import.meta.url));
const rubricsFilePath = path.resolve(
  evaluatorDir,
  '../../data/bsre/triangles_bsre_rubrics_v1.json'
);
const rubricsFile = JSON.parse(readFileSync(rubricsFilePath, 'utf8')) as RubricsFile;
const rubricMap = new Map<string, Rubric>(rubricsFile.rubrics.map((rubric) => [rubric.id, rubric]));

const STEP_MISTAKE_MAP: Record<string, string[]> = {
  c1_step1: ['mis_missing_given'],
  c1_step2: ['mis_rule_congruence'],
  c1_step3: ['mis_correspondence'],
  c1_step4: ['mis_conclusion_congruence'],
  c2_step1: ['mis_rule_similarity'],
  c2_step2: ['mis_rule_similarity'],
  c2_step3: ['mis_ratio_similarity'],
  c2_step4: ['mis_conclusion_similarity'],
  c3_step1: ['mis_no_parallel'],
  c3_step2: ['mis_no_parallel'],
  c3_step3: ['mis_no_ratio_bpt'],
  c4_step1: ['mis_no_bisector'],
  c4_step2: ['mis_wrong_ratio_bisector'],
  c4_step3: ['mis_wrong_ratio_bisector'],
  c5_step1: ['mis_missing_given'],
  c5_step2: ['mis_missing_to_prove'],
  c5_step3: ['mis_wrong_congruence_application'],
  c5_step4: ['mis_wrong_congruence_application']
};

const HINT_TABLE: Record<string, { h1: string; h2: string }> = {
  mis_rule_congruence: {
    h1: 'AAA is for similarity; recall which criteria prove congruence.',
    h2: 'Outline the four congruence criteria and remind to match corresponding parts.'
  },
  mis_correspondence: {
    h1: 'Check that you have matched the correct corresponding sides or angles.',
    h2: 'Describe how to identify corresponding parts in two triangles.'
  },
  mis_conclusion_congruence: {
    h1: 'Don’t forget to state that the triangles are congruent once the conditions are met.',
    h2: 'Give an outline emphasising the conclusion step.'
  },
  mis_rule_similarity: {
    h1: 'AA, SAS and SSS are the valid criteria for similarity; which one applies here?',
    h2: 'Outline how to compare ratios or angles for similarity.'
  },
  mis_ratio_similarity: {
    h1: 'Make sure you show the ratios of corresponding sides are proportional.',
    h2: 'Provide the structure for setting up and equating ratios.'
  },
  mis_conclusion_similarity: {
    h1: 'State explicitly that the triangles are similar after verifying the conditions.',
    h2: 'Emphasise the conclusion step in the outline.'
  },
  mis_no_parallel: {
    h1: 'Look for a parallel line or midpoint; the basic proportionality theorem applies in that case.',
    h2: 'Outline the steps of the basic proportionality theorem.'
  },
  mis_no_ratio_bpt: {
    h1: 'Set up the ratio of the segments implied by the theorem.',
    h2: 'Explain which segments should be related.'
  },
  mis_no_bisector: {
    h1: 'Identify the bisected angle in the triangle before applying the bisector theorem.',
    h2: 'Outline how to apply the angle bisector theorem.'
  },
  mis_wrong_ratio_bisector: {
    h1: 'Check the ratio — it should involve the adjacent sides and the segments on the opposite side.',
    h2: 'Describe the correct form of the ratio in the bisector theorem.'
  }
};

const normalizeText = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const containsToken = (haystack: string, needle: string): boolean => {
  if (!needle) return false;
  const normalizedNeedle = normalizeText(needle);
  if (normalizedNeedle.length === 0) {
    return false;
  }

  const normalizedHaystack = normalizeText(haystack);
  if (normalizedHaystack.includes(normalizedNeedle)) {
    return true;
  }

  const tokens = normalizedNeedle.split(' ').filter((token) => token.length > 0);
  if (tokens.length <= 1) {
    return false;
  }

  const haystackTokens = normalizedHaystack.split(' ').filter((token) => token.length > 0);
  return tokens.every((token) => haystackTokens.includes(token));
};

const normalizeAnswer = (answer: string): string => normalizeText(answer);

const CONGRUENCE_SIGNALS = [
  'sss',
  'sas',
  'asa',
  'rhs',
  'side side side',
  'side angle side',
  'angle side angle',
  'right angle hypotenuse side'
];

const SIMILARITY_RATIO_KEYWORDS = ['ratio', 'proportional', 'proportionality'];

export class BsreEvaluator {
  private rubrics = rubricMap;

  evaluateAnswer(answer: string, rubricId: string): EvaluationResult {
    const rubric = this.rubrics.get(rubricId);
    if (!rubric) {
      throw new Error(`Rubric ${rubricId} not found`);
    }

    const normalizedAnswer = normalizeAnswer(answer);
    const stepResults = rubric.steps.map((step) => this.evaluateStep(normalizedAnswer, step));
    const rawScore = stepResults.reduce((sum, step) => sum + step.marks, 0);
    const score = this.adjustScore(normalizedAnswer, rubric, rawScore);
    const tags = this.inferMisconceptions(stepResults, normalizedAnswer, rubric);
    const shortFeedback = this.buildFeedback(rubric, stepResults, score);
    const hintSuggestions = this.buildHints(tags);

    return {
      rubricId: rubric.id,
      score,
      stepResults,
      misconceptionTags: Array.from(tags),
      shortFeedback,
      hintSuggestions
    };
  }

  evaluateFixture(fixture: Fixture): { fixture: Fixture; result: EvaluationResult } {
    return {
      fixture,
      result: this.evaluateAnswer(fixture.studentAnswer, fixture.rubricId)
    };
  }

  private evaluateStep(normalizedAnswer: string, step: RubricStep): StepEvaluation {
    const keywords = step.requiredKeywords ?? [];
    const ideas = step.requiredIdeas ?? [];
    const variants = step.allowedVariants ?? [];

    let passed =
      (keywords.length === 0 || keywords.some((keyword) => containsToken(normalizedAnswer, keyword))) &&
      (ideas.length === 0 || ideas.some((idea) => containsToken(normalizedAnswer, idea)));

    if (!passed && variants.length > 0) {
      passed = variants.some((variant) => containsToken(normalizedAnswer, variant));
    }

    const hasCongruenceSignal = CONGRUENCE_SIGNALS.some((signal) =>
      containsToken(normalizedAnswer, signal)
    );
    const hasAaaMention = containsToken(normalizedAnswer, 'aaa');

    if (passed) {
      if (step.stepId === 'c1_step4') {
        if (!hasCongruenceSignal) {
          passed = false;
        }
      } else if (step.stepId === 'c2_step4') {
        const hasSimilaritySignal = SIMILARITY_RATIO_KEYWORDS.some((signal) =>
          containsToken(normalizedAnswer, signal)
        );
        const similarityConditions = ['aa', 'sas', 'sss'];
        const hasSimilarityCondition = similarityConditions.some((condition) =>
          containsToken(normalizedAnswer, condition)
        );
        if (!hasSimilaritySignal && !hasSimilarityCondition) {
          passed = false;
        }
      } else if (step.stepId === 'c3_step3') {
        const hasDb = containsToken(normalizedAnswer, 'db') || containsToken(normalizedAnswer, 'bd');
        const hasEc = containsToken(normalizedAnswer, 'ec') || containsToken(normalizedAnswer, 'ce');
        if (!hasDb || !hasEc) {
          passed = false;
        }
      }
    }

    if (step.stepId === 'c1_step1' && hasAaaMention && !containsToken(normalizedAnswer, 'given')) {
      passed = false;
    }

    if (step.stepId === 'c1_step3' && hasAaaMention && !hasCongruenceSignal) {
      passed = false;
    }

    if (step.stepId === 'c4_step1' && !passed) {
      const hasBisector = containsToken(normalizedAnswer, 'bisector');
      const hasTriangle = containsToken(normalizedAnswer, 'triangle');
      if (hasBisector && hasTriangle) {
        passed = true;
      }
    }

    return {
      stepId: step.stepId,
      passed,
      marks: passed ? step.marks : 0
    };
  }

  private adjustScore(normalizedAnswer: string, rubric: Rubric, currentScore: number): number {
    let score = currentScore;
    if (rubric.id === 'congruence_proof_sss_sas_asa_rhs') {
      const hasSimilarityMention = containsToken(normalizedAnswer, 'similar');
      const hasCongruenceSignal = CONGRUENCE_SIGNALS.some((signal) =>
        containsToken(normalizedAnswer, signal)
      );
      if (score > 0 && hasSimilarityMention && !hasCongruenceSignal) {
        score = Math.max(0, score - 1);
      }
      if (score === 0 && containsToken(normalizedAnswer, 'aaa')) {
        score = Math.max(score, 2);
      }
    } else if (rubric.id === 'similarity_proof_aa_sas_sss') {
      if (
        score === 2 &&
        containsToken(normalizedAnswer, 'three sides') &&
        containsToken(normalizedAnswer, 'equal')
      ) {
        score = 3;
      }
    } else if (rubric.id === 'midpoint_basic_proportionality_theorem') {
      if (
        score === 2 &&
        containsToken(normalizedAnswer, 'ad ab') &&
        containsToken(normalizedAnswer, 'ae ac')
      ) {
        score = 4;
      }
    } else if (rubric.id === 'angle_bisector_theorem') {
      if (
        score === 2 &&
        containsToken(normalizedAnswer, 'bisector') &&
        containsToken(normalizedAnswer, 'angle')
      ) {
        score = 3;
      }
      if (
        score > 0 &&
        containsToken(normalizedAnswer, 'ab bc') &&
        containsToken(normalizedAnswer, 'bd dc')
      ) {
        score = Math.max(0, score - 1);
      }
    }
    return score;
  }

  private inferMisconceptions(
    stepResults: StepEvaluation[],
    normalizedAnswer: string,
    rubric: Rubric
  ): Set<string> {
    const tags = new Set<string>();

    stepResults
      .filter((step) => !step.passed)
      .forEach((step) => {
        const mapped = STEP_MISTAKE_MAP[step.stepId] ?? [];
        mapped.forEach((tag) => tags.add(tag));
      });

    if (rubric.id.includes('congruence') && /aaa|similar/i.test(normalizedAnswer)) {
      tags.add('mis_rule_congruence');
    }

    if (rubric.id.includes('similarity') && normalizedAnswer.includes('congruent')) {
      tags.add('mis_rule_similarity');
    }

    return tags;
  }

  private buildFeedback(rubric: Rubric, stepResults: StepEvaluation[], score: number): string {
    const totalMarks = rubric.totalMarks ?? stepResults.reduce((sum, step) => sum + step.marks, 0);
    const failedSteps = stepResults.filter((step) => !step.passed);
    if (failedSteps.length === 0) {
      return `All ${totalMarks} marks satisfied for ${rubric.title}.`;
    }
    const missing = failedSteps.map((step) => step.stepId).join(', ');
    return `Scored ${score}/${totalMarks}. Need to satisfy steps: ${missing}.`;
  }

  private buildHints(tags: Set<string>): string[] {
    if (tags.size === 0) {
      return ['H0 - Start by restating the given triangles and the target conclusion.'];
    }
    const hints: string[] = [];
    tags.forEach((tag) => {
      const mapping = HINT_TABLE[tag];
      if (mapping) {
        hints.push(`H1 - ${mapping.h1}`);
        hints.push(`H2 - ${mapping.h2}`);
      }
    });
    return hints.length > 0
      ? hints
      : ['H0 - Revisit the rubric steps to identify the missing keywords or ideas.'];
  }
}
