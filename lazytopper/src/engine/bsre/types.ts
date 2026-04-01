export interface RubricStep {
  stepId: string;
  description: string;
  requiredKeywords?: string[];
  requiredIdeas?: string[];
  allowedVariants?: string[];
  marks: number;
}

export interface CommonMistake {
  id: string;
  description: string;
}

export interface FeedbackTemplate {
  id: string;
  condition: string;
  text: string;
}

export interface Rubric {
  id: string;
  title: string;
  totalMarks: number;
  criteria?: Array<{ description: string; weight: number }>;
  steps: RubricStep[];
  commonMistakes?: CommonMistake[];
  feedbackTemplates?: FeedbackTemplate[];
  misconceptionTags?: string[];
}

export interface RubricsFile {
  rubrics: Rubric[];
}

export interface FixtureExpectedStep {
  stepId: string;
  passed: boolean;
}

export interface FixtureExpected {
  score: number;
  stepResults: FixtureExpectedStep[];
  misconceptionTags: string[];
  feedback: string;
}

export interface Fixture {
  id: string;
  rubricId: string;
  studentAnswer: string;
  expected: FixtureExpected;
}

export interface StepEvaluation {
  stepId: string;
  passed: boolean;
  marks: number;
}

export interface EvaluationResult {
  rubricId: string;
  score: number;
  stepResults: StepEvaluation[];
  misconceptionTags: string[];
  shortFeedback: string;
  hintSuggestions: string[];
}
