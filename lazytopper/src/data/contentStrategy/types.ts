import type {
  DiagramVisualPriority,
  LazytopperDiagramBlock,
  LazytopperDiagramType,
} from "../../diagrams/diagramIntelligence";

export type CbseFormat = "A" | "B" | "C" | "D" | "E";

export interface LearningObject {
  loId: string;
  title: string;
  description: string;
  prerequisites?: string[];
  commonMistakes?: string[];
  boardWritingTip?: string;
  masteryRule?: { attempts: number; accuracy: number };
}

export interface QuestionTypeTile {
  qtypeId: string;
  title: string;
  cbseFormat: CbseFormat;
  skillFamily: string;
  typicalMarks?: number[];
  loIds: string[];
}

export interface QuestionMeta {
  questionId: string;
  cbseFormat?: CbseFormat;
  skillFamily?: string;
  loIds: string[];
  mistakeTags?: string[];
  scopeGuard?: string[];
  msAlignment?: "template" | "partial-credit" | "final-only";
  reviewTags?: string[];
}

export interface QuestionFamilyOverlay {
  familyId: string;
  qtypeId?: string;
  studentLabel: string;
  tutorMeaning: string;
  weakStudentCue: string;
  advancedStudentShortcut: string;
  commonConfusion: string;
  recommendedNextAction: string;
  theoremFamily: string;
  skillFamily: string;
  boardPayoff: string;
  practiceHint?: string;
  focusBankIds?: string[];
  sectionFilter?: CbseFormat;
  mentorPrompt: string;
  mentorModeHint?: "explain" | "solve_with_me" | "board_steps";
  mentorSolveStyle?: "socratic" | "board";
  tutorNodeId?: string;
  diagramRequired?: boolean;
  recommendedDiagramType?: LazytopperDiagramType;
  visualPriority?: DiagramVisualPriority;
  diagram?: LazytopperDiagramBlock;
}
