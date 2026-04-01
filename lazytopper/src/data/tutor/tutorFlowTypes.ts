export type TutorPathStatus = "deep" | "partial" | "seed";
export type TutorStepType =
  | "start"
  | "concept"
  | "misconception"
  | "example"
  | "practice"
  | "hpq"
  | "mentor"
  | "next-step";
export type TutorSourceOfTruthState =
  | "authoritative"
  | "supporting"
  | "not-used"
  | "not-yet-available";
export type TutorSourceRefKind = "file" | "topicKey" | "questionId" | "stringSearch";
export type TutorMentorSupportStatus = "deep" | "guided" | "generic" | "not-available";
export type TutorQtfSupportStatus = "full" | "partial" | "none";

export interface TutorSourceRef {
  kind: TutorSourceRefKind;
  path: string;
  value?: string;
  label: string;
  note?: string;
}

export interface TutorStep {
  id: string;
  title: string;
  studentGoal: string;
  stepType: TutorStepType;
  sourceRefs: TutorSourceRef[];
  recommendedCTA: string;
  expectedStudentOutcome: string;
  mentorModeHint?: string;
  cognitiveLoadNote?: string;
}

export interface TutorSourceMap {
  topicHubV2: TutorSourceOfTruthState;
  topicHubEnrichment: TutorSourceOfTruthState;
  predictedQuestions: TutorSourceOfTruthState;
  highlyProbableQuestions: TutorSourceOfTruthState;
  qtfOverlay: TutorSourceOfTruthState;
  canonicalQuestionBank: TutorSourceOfTruthState;
  mentorAssets: TutorSourceOfTruthState;
}

export interface TutorMentorSupport {
  status: TutorMentorSupportStatus;
  surfaces: string[];
  note: string;
}

export interface TutorQtfSupport {
  status: TutorQtfSupportStatus;
  strategyTopicKey?: string;
  note: string;
}

export interface ChapterTutorPath {
  topicKey: string;
  canonicalTopicKey: string;
  subject: "Maths" | "Science";
  status: TutorPathStatus;
  studentJourney: TutorStep[];
  sourceOfTruth: TutorSourceMap;
  mentorSupport: TutorMentorSupport;
  qtfSupport: TutorQtfSupport;
  gapFlags: string[];
  nextExpansionNotes: string[];
}
