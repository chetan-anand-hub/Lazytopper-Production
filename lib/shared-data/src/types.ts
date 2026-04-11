export type LTSubjectKey = "Maths" | "Science";
export type TopicTier = "must-crack" | "high-roi" | "good-to-do";

export interface MathTopicTrendEntry {
  topicKey: string;
  weightagePercent: number;
  tier: TopicTier;
  summary: string;
  conceptWeightage: Record<string, number>;
}

export interface ScienceConceptTrend {
  name: string;
  sharePercent: number;
  question_types: string[];
  summary_and_exam_tips: string;
}

export interface ScienceTopicTrendEntry {
  topicKey: string;
  topicName: string;
  tier: TopicTier;
  weightagePercent: number;
  concepts: ScienceConceptTrend[];
}

export interface SubscriptionStatus {
  tier: "free" | "trial" | "premium";
  plan: "none" | "trial_7day" | "premium_monthly" | "premium_yearly";
  trialStartDate: string | null;
  trialEndDate: string | null;
}

export type DifficultyLevel = "Easy" | "Medium" | "Hard";

export type BloomLevel =
  | "Remembering"
  | "Understanding"
  | "Applying"
  | "Analysing"
  | "Evaluating"
  | "Creating";

export type QuestionFormat =
  | "MCQ"
  | "Short"
  | "Assertion-Reasoning"
  | "Case-Based"
  | "Long"
  | "VSA";

export type SectionKey = "A" | "B" | "C" | "D" | "E";

export interface CanonicalQuestion {
  id: string;
  subject: LTSubjectKey;
  topicKey: string;
  subtopic: string;
  section: string;
  marks: number;
  format: QuestionFormat;
  difficulty: DifficultyLevel;
  bloomSkill: BloomLevel;
  questionText: string;
  options?: string[];
  answer?: string;
  explanation?: string;
  solutionSteps?: string[];
  finalAnswer?: string;
  strategyHint?: string;
  predictionScore?: number;
  predictionStrength?: string;
  blueprintSlotId?: string;
  pastBoardYear?: string;
  policyTag?: string;
  pyqYear?: string;
  pyqSet?: string;
  ncertRef?: string;
  isCompetencyBased?: boolean;
}

export interface ExamQuestion {
  id: string;
  subject: LTSubjectKey;
  topicKey: string;
  subtopic: string;
  section: string;
  marks: number;
  format: QuestionFormat;
  difficulty: DifficultyLevel;
  questionText: string;
  options?: string[];
  orAlternative?: ExamQuestion;
}

export interface HPQQuestion {
  id: string;
  subject: LTSubjectKey;
  topic: string;
  subtopic: string;
  text: string;
  marks: number;
  difficulty: DifficultyLevel;
  confidencePercent: number;
  rationale: string;
}
