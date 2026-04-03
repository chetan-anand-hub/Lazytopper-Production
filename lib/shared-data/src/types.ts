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

export type QuestionFormat =
  | "MCQ"
  | "Short"
  | "Assertion-Reasoning"
  | "Case-Based"
  | "Long"
  | "VSA";

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
