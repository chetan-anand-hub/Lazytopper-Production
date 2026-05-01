/**
 * PR-K0 Learning Signal contract.
 *
 * Contract-only. No fake data. No persistence. No UI changes.
 */

export type LearningSignalSource =
  | "practice"
  | "worksheet"
  | "check-improve"
  | "hpq"
  | "mock"
  | "chapter-test"
  | "timed-drill"
  | "topic-hub"
  | "solution";

export type LearningSignalKind =
  | "question_answered"
  | "answer_checked"
  | "self_assessed"
  | "solution_viewed"
  | "worksheet_generated"
  | "worksheet_saved"
  | "answer_uploaded"
  | "mistake_logged"
  | "next_action_clicked";

export type LearningSignalEvidenceType =
  | "learner_action"
  | "system_check"
  | "system_generation"
  | "system_save"
  | "navigation";

export type LearningSignalMode =
  | "quick-practice"
  | "timed-drill"
  | "chapter-test"
  | "practice-paper"
  | "worksheet"
  | "more-like-this"
  | "solution-reveal"
  | "check-improve"
  | "hpq"
  | "mock"
  | "topic-hub";

export type LearningSignalConsumer =
  | "mistake-intel"
  | "me-progress"
  | "next-action"
  | "saved-worksheets"
  | "activity-history";

export type LearningSignalSubject = "Maths" | "Science";

export type LearningSignalDifficulty = "easy" | "medium" | "hard";

export type LearningSignalSection = "A" | "B" | "C" | "D" | "E";

export type LearningSignalPersistence = "local-only" | "saved";

export interface LearningSignal {
  id: string;
  kind: LearningSignalKind;
  source: LearningSignalSource;
  evidenceType: LearningSignalEvidenceType;
  isLocalOnly: boolean;
  createdAt: string;

  userId?: string;
  sessionId?: string;

  subject?: LearningSignalSubject;
  topicSlug?: string;
  topicSlugs?: string[];

  mode?: LearningSignalMode;

  questionId?: string;
  worksheetId?: string;
  attemptId?: string;

  marksAvailable?: number;
  marksAwarded?: number;

  difficulty?: LearningSignalDifficulty;
  section?: LearningSignalSection;

  skillTags?: string[];
  mistakeTags?: string[];

  sourceRoute?: string;
  returnTo?: string;
}

export interface LearningSignalEmitterContext {
  source: LearningSignalSource;
  mode?: LearningSignalMode;
  subject?: LearningSignalSubject;
  topicSlug?: string;
  topicSlugs?: string[];
  sourceRoute?: string;
  returnTo?: string;
  userId?: string;
  sessionId?: string;
  isSignedIn: boolean;
}

export interface LearningSignalHonestyRule {
  kind: LearningSignalKind;
  summary: string;
  countsAsMastery: boolean;
  countsAsMistakeEvidence: boolean;
  canBeLocalOnly: boolean;
  requiresSavedSignalForDurableUse: boolean;
}

export const LEARNING_SIGNAL_SOURCES: readonly LearningSignalSource[] = [
  "practice",
  "worksheet",
  "check-improve",
  "hpq",
  "mock",
  "chapter-test",
  "timed-drill",
  "topic-hub",
  "solution",
] as const;

export const LEARNING_SIGNAL_KINDS: readonly LearningSignalKind[] = [
  "question_answered",
  "answer_checked",
  "self_assessed",
  "solution_viewed",
  "worksheet_generated",
  "worksheet_saved",
  "answer_uploaded",
  "mistake_logged",
  "next_action_clicked",
] as const;

export const LEVEL_3_MODE_SIGNAL_KINDS: Record<
  LearningSignalMode,
  readonly LearningSignalKind[]
> = {
  "quick-practice": [
    "question_answered",
    "self_assessed",
    "solution_viewed",
    "next_action_clicked",
  ],
  "timed-drill": [
    "question_answered",
    "self_assessed",
    "solution_viewed",
    "next_action_clicked",
  ],
  "chapter-test": [
    "question_answered",
    "self_assessed",
    "answer_checked",
    "solution_viewed",
    "next_action_clicked",
  ],
  "practice-paper": [
    "question_answered",
    "self_assessed",
    "answer_checked",
    "solution_viewed",
    "next_action_clicked",
  ],
  worksheet: [
    "worksheet_generated",
    "worksheet_saved",
    "answer_uploaded",
    "next_action_clicked",
  ],
  "more-like-this": [
    "question_answered",
    "solution_viewed",
    "next_action_clicked",
  ],
  "solution-reveal": [
    "solution_viewed",
    "next_action_clicked",
  ],
  "check-improve": [
    "answer_uploaded",
    "answer_checked",
    "mistake_logged",
  ],
  hpq: [
    "question_answered",
    "self_assessed",
    "solution_viewed",
    "next_action_clicked",
  ],
  mock: [
    "question_answered",
    "answer_checked",
    "solution_viewed",
    "next_action_clicked",
  ],
  "topic-hub": [
    "next_action_clicked",
  ],
};

export const LEARNING_SIGNAL_CONSUMER_ALLOWED_KINDS: Record<
  LearningSignalConsumer,
  readonly LearningSignalKind[]
> = {
  "mistake-intel": [
    "answer_checked",
    "mistake_logged",
  ],
  "me-progress": LEARNING_SIGNAL_KINDS,
  "next-action": LEARNING_SIGNAL_KINDS,
  "saved-worksheets": [
    "worksheet_saved",
  ],
  "activity-history": LEARNING_SIGNAL_KINDS,
};

export const LEARNING_SIGNAL_HONESTY_RULES: Record<
  LearningSignalKind,
  LearningSignalHonestyRule
> = {
  question_answered: {
    kind: "question_answered",
    summary: "Activity evidence only. Not mastery or mistake evidence by itself.",
    countsAsMastery: false,
    countsAsMistakeEvidence: false,
    canBeLocalOnly: true,
    requiresSavedSignalForDurableUse: true,
  },
  answer_checked: {
    kind: "answer_checked",
    summary: "Feedback from a real checking path. May feed progress when saved.",
    countsAsMastery: false,
    countsAsMistakeEvidence: true,
    canBeLocalOnly: true,
    requiresSavedSignalForDurableUse: true,
  },
  self_assessed: {
    kind: "self_assessed",
    summary: "Learner self-rating. Lower confidence than Check & Improve.",
    countsAsMastery: false,
    countsAsMistakeEvidence: false,
    canBeLocalOnly: true,
    requiresSavedSignalForDurableUse: true,
  },
  solution_viewed: {
    kind: "solution_viewed",
    summary: "Learning event only. Not mastery or mistake evidence.",
    countsAsMastery: false,
    countsAsMistakeEvidence: false,
    canBeLocalOnly: true,
    requiresSavedSignalForDurableUse: true,
  },
  worksheet_generated: {
    kind: "worksheet_generated",
    summary: "Content event only. Not progress or mastery.",
    countsAsMastery: false,
    countsAsMistakeEvidence: false,
    canBeLocalOnly: true,
    requiresSavedSignalForDurableUse: false,
  },
  worksheet_saved: {
    kind: "worksheet_saved",
    summary: "Saved content. Not mastery by itself.",
    countsAsMastery: false,
    countsAsMistakeEvidence: false,
    canBeLocalOnly: false,
    requiresSavedSignalForDurableUse: true,
  },
  answer_uploaded: {
    kind: "answer_uploaded",
    summary: "Input event only until a real check occurs.",
    countsAsMastery: false,
    countsAsMistakeEvidence: false,
    canBeLocalOnly: true,
    requiresSavedSignalForDurableUse: true,
  },
  mistake_logged: {
    kind: "mistake_logged",
    summary: "Real checking or grading path logged a mistake.",
    countsAsMastery: false,
    countsAsMistakeEvidence: true,
    canBeLocalOnly: false,
    requiresSavedSignalForDurableUse: true,
  },
  next_action_clicked: {
    kind: "next_action_clicked",
    summary: "Journey evidence only. Not performance evidence.",
    countsAsMastery: false,
    countsAsMistakeEvidence: false,
    canBeLocalOnly: true,
    requiresSavedSignalForDurableUse: false,
  },
};

export function getLearningSignalPersistence(
  context: Pick<LearningSignalEmitterContext, "isSignedIn">,
): LearningSignalPersistence {
  return context.isSignedIn ? "saved" : "local-only";
}

export function shouldCreateLocalOnlySignal(
  context: Pick<LearningSignalEmitterContext, "isSignedIn">,
): boolean {
  return !context.isSignedIn;
}

export function getAllowedSignalKindsForMode(
  mode: LearningSignalMode,
): readonly LearningSignalKind[] {
  return LEVEL_3_MODE_SIGNAL_KINDS[mode];
}

export function getAllowedSignalKindsForConsumer(
  consumer: LearningSignalConsumer,
): readonly LearningSignalKind[] {
  return LEARNING_SIGNAL_CONSUMER_ALLOWED_KINDS[consumer];
}

export function canConsumerUseLearningSignal(
  consumer: LearningSignalConsumer,
  signal: Pick<LearningSignal, "kind" | "isLocalOnly">,
): boolean {
  const allowedKinds = LEARNING_SIGNAL_CONSUMER_ALLOWED_KINDS[consumer];

  if (!allowedKinds.includes(signal.kind)) {
    return false;
  }

  if (consumer === "next-action" || consumer === "activity-history") {
    return true;
  }

  return !signal.isLocalOnly;
}

export function isLearningSignalPerformanceEvidence(
  kind: LearningSignalKind,
): boolean {
  return LEARNING_SIGNAL_HONESTY_RULES[kind].countsAsMastery;
}

export function isLearningSignalMistakeEvidence(
  kind: LearningSignalKind,
): boolean {
  return LEARNING_SIGNAL_HONESTY_RULES[kind].countsAsMistakeEvidence;
}

export function assertLearningSignalKindForMode(
  mode: LearningSignalMode,
  kind: LearningSignalKind,
): boolean {
  return LEVEL_3_MODE_SIGNAL_KINDS[mode].includes(kind);
}