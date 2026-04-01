/**
 * Defines TypeScript interfaces for the `/api/mentor` backend contract.
 *
 * This version aligns the mode names with the front‑end (plan, solve,
 * explain, coach, mindset) and introduces an optional persona property
 * on requests so that a unified mentor persona can be specified.  Each
 * mode corresponds to a different interaction style and may share
 * payload/response definitions.
 */

/**
 * Supported modes for the mentor endpoint.  Each mode corresponds to a
 * persona:
 *  - `plan`     → Study Planner (chapter‑wise plan generation)
 *  - `solve`    → Question Solver (step‑by‑step solutions)
 *  - `explain`  → Concept Explainer (summaries & examples)
 *  - `coach`    → Exam Coach (time management & mindset tips)
 *  - `mindset`  → Mindset Mentor (confidence & resilience)
 */
/**
 * Supported modes for the mentor endpoint.  Each mode corresponds to a
 * persona or conversation style.  In addition to the existing modes
 * (plan, solve, explain, coach, mindset), we include topic‑level modes
 * for TopicHub/Trends flows:
 *
 * - `topic_explain`: Explain a chapter or topic from basics.
 * - `topic_exam_tips`: Provide concise guidance on how to score 95+ in
 *   the specified topic/unit, including study strategy and exam tips.
 */
export type MentorMode =
  | 'plan'
  | 'solve'
  | 'explain'
  | 'coach'
  | 'mindset'
  | 'topic_explain'
  | 'topic_exam_tips'
  | 'solve_with_me'
  | 'board_steps_ms'
  | 'learn_teach'
  | 'learn_proof'
  | 'learn_mindmap';

export type MentorImageMimeType = 'image/jpeg' | 'image/png';
export type { LazytopperDiagramBlock } from "../diagrams/diagramIntelligence";

export type UnknownRecord = Record<string, unknown>;

export const isRecord = (v: unknown): v is UnknownRecord =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Configuration for a single mentor mode.  Defines how the backend should
 * behave when this mode is active, including the system prompt and
 * example prompts for users.
 */
export interface MentorModeConfig {
  id: MentorMode;
  label: string;
  description: string;
  systemPrompt: string;
  exampleUserPrompts?: string[];
}

/**
 * A persona aggregates global rules and mode-specific configurations for the
 * AI mentor.  It defines the tone, behaviour and available modes.
 */
export interface MentorPersona {
  id: string;
  name: string;
  tagline: string;
  styleNotes: string;
  coreRules: string[];
  modes: MentorModeConfig[];
}

/**
 * Base structure for all mentor requests.  The `mode` selects the persona
 * and the `payload` carries the data required for that mode.  When using
 * a unified persona system, an optional `persona` can be provided to
 * override global defaults on the backend.
 */
export interface MentorRequest<TPayload> {
  mode: MentorMode;
  payload: TPayload;
  persona?: MentorPersona;
}

/* ------------------------------------------------------------------ */
/* Planner (plan) mode types                                          */
/* ------------------------------------------------------------------ */

/**
 * Input payload for `plan` mode.  The Study Planner uses these
 * parameters to construct a study plan.
 */
export interface PlannerPayload {
  grade: string;
  subject: 'Maths' | 'Science';
  daysLeft: number;
  /**
   * Target percentage for the chosen subject.  Influences the level of
   * detail and pace of the plan.
   */
  targetPercent: number;
  /**
   * Hours available per day.  The total hours and a per‑subject breakdown
   * allow for differential pacing of Maths and Science.
   */
  hoursPerDay: {
    total: number;
    maths?: number;
    science?: number;
  };
  /** List of chapters or topics the student considers weak (optional). */
  weakChapters?: string[];
  /** Chapters to cover only if time permits (optional). */
  optionalChapters?: string[];
}

/**
 * Response structure for `plan` mode.  It includes a high‑level plan,
 * chapter‑wise hours allocation and a day‑by‑day schedule, along with
 * optional metadata such as source links.  All hour values are integers.
 */
export interface PlannerResponse {
  seasonPlan: {
    phase: string;
    durationDays: number;
    focus: string;
  }[];
  chapterHours: {
    chapter: string;
    tier: 'must-crack' | 'high-roi' | 'good-to-do';
    recommendedHours: number;
    weightagePercent: number;
    remarks?: string;
  }[];
  dailySchedule: {
    dayNumber: number;
    hours: {
      Maths?: number;
      Science?: number;
    };
    actions: string[];
  }[];
  meta?: {
    sources?: {
      chapter: string;
      topicHubUrl?: string;
      hpqUrl?: string;
    }[];
    version?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Solve mode types                                                   */
/* ------------------------------------------------------------------ */

export interface SolvePayload {
  grade: string;
  subject: 'Maths' | 'Science';
  /**
   * An optional identifier if the question originates from the HPQ bank
   * or mock builder.
   */
  questionId?: string;
  /** The actual question text to solve. */
  questionText: string;
  /** Chapter or topic context for better answers. */
  topic?: string;
  /** Additional context such as difficulty or marks. */
  context?: {
    difficulty?: 'Easy' | 'Medium' | 'Hard';
    marks?: number;
  };
}

export interface SolveResponse {
  steps: {
    stepNumber: number;
    description: string;
    explanation?: string;
  }[];
  finalAnswer: string;
  commonMistakes?: string[];
  followUpLinks?: {
    topicHubUrl?: string;
    similarHpqUrl?: string;
  };
  meta?: {
    version?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Explain mode types                                                 */
/* ------------------------------------------------------------------ */

export interface ExplainPayload {
  grade: string;
  subject: 'Maths' | 'Science';
  /** Chapter or topic name. */
  topic: string;
  /** Optional concept identifier. */
  conceptId?: string;
}

export interface ExplainResponse {
  summary: string;
  keyPoints: string[];
  examples?: {
    question: string;
    solution: string;
  }[];
  links?: {
    topicHubUrl?: string;
    hpqUrl?: string;
  };
  meta?: {
    version?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Coach & Mindset mode types                                         */
/* ------------------------------------------------------------------ */

/**
 * Input payload for `coach` or `mindset` modes.  The Exam Coach / Mindset
 * Mentor provides time management, micro‑habits and mindset tips based
 * on available time and recent performance.
 */
export interface ExamCoachPayload {
  grade: string;
  daysLeft: number;
  hoursPerDay: number;
  /** Recent mock scores by subject; used for personalised advice. */
  recentScores?: Record<'Maths' | 'Science', number>;
  /** Number of consecutive study days, to encourage streaks. */
  streakDays?: number;
}

/**
 * Response structure for `coach` or `mindset` modes.  Presents time allocation,
 * micro‑habits and mindset tips to prepare for the exam.
 */
export interface ExamCoachResponse {
  timeAllocation: Record<string, string>;
  microHabits: string[];
  mindsetTips: string[];
  meta?: {
    version?: string;
  };
}

/* ------------------------------------------------------------------ */
/* Unified response type                                              */
/* ------------------------------------------------------------------ */

export type MentorResponse =
  | { mode: 'plan'; data: PlannerResponse; meta?: PlannerResponse['meta'] }
  | { mode: 'solve'; data: SolveResponse; meta?: SolveResponse['meta'] }
  | { mode: 'explain'; data: ExplainResponse; meta?: ExplainResponse['meta'] }
  | { mode: 'coach'; data: ExamCoachResponse; meta?: ExamCoachResponse['meta'] }
  | { mode: 'mindset'; data: ExamCoachResponse; meta?: ExamCoachResponse['meta'] };
// ---------------------------------------------------------------------------
// Protocol-mode structured payloads (gateway returns these under data.structured)
// ---------------------------------------------------------------------------

/**
 * Solve-With-Me is an interactive tutoring protocol. The gateway returns one turn at a time.
 * The frontend expects { kind: "question" | "hint" | "final", tutor: string, ... }.
 */
export type SolveWithMeKind = 'question' | 'hint' | 'final';
/**
 * Diagram spec contract (v1).
 * Backend sends a *spec*, frontend renders the diagram (no SVG strings).
 *
 * - type: high-level diagram category (currently triangles-first)
 * - templateId: specific renderer template to use
 * - payload: template-specific parameters (kept flexible for iteration)
 */
export type MentorDiagramType = 'triangle' | (string & {});

/** Known triangle templates (expand over time). */
export type MentorTriangleTemplateId = 'triangle-basic' | (string & {});

export interface MentorDiagramSpec {
  /** Contract version for forward compatibility. */
  version: 1;
  type: MentorDiagramType;
  templateId: MentorTriangleTemplateId;
  /** Template-specific payload (e.g., vertices, given values, annotations). */
  payload: Record<string, unknown>;
}

/**
 * Anchors map tutor references ("side AB", "angle A", "point C") to stable ids
 * that the renderer can highlight.
 */
export type MentorDiagramAnchorKind = 'point' | 'side' | 'angle';

export interface MentorDiagramAnchor {
  id: string;
  kind: MentorDiagramAnchorKind;
  /**
   * Renderer target key (e.g., "A", "B", "C", "AB", "BC", "CA", "angleA").
   * Keep this aligned with the diagram template's internal naming.
   */
  target: string;
  /** Optional display label override (e.g., "∠A", "AB"). */
  label?: string;
}

/**
 * Optional mapping between solution steps and diagram highlights.
 * stepId is intentionally a string to support both numbered ("1") and named steps ("given").
 */
export interface MentorDiagramStepLink {
  stepId: string;
  highlightAnchorIds: string[];
}

/* ------------------------------------------------------------------ */
/* Human-grade loop blocks (nested under structured.tutor.*)            */
/* ------------------------------------------------------------------ */

export type TutorBlock = {
  text?: string;
  diagnosis?: unknown;
  socratic?: unknown;
  hint_ladder?: unknown;
  board_steps_ms?: unknown;
  next?: unknown;
  [k: string]: unknown;
};

export type MentorStructured = {
  kind?: string;
  finalAnswer?: string;
  tutor?: TutorBlock | string;
  [k: string]: unknown;
};

export type MentorStudentProfile =
  | "anxious"
  | "weak_foundation"
  | "boards_focused"
  | "doubt_heavy"
  | "advanced_value_seeking";

export type MentorConfusionType =
  | "theorem_choice_confusion"
  | "concept_confusion"
  | "proof_structure_confusion"
  | "calculation_mistake"
  | "diagram_interpretation_issue"
  | "board_answer_weakness"
  | "next_step_unclear";

export type MentorHelpMode =
  | "hint"
  | "next_step"
  | "explain"
  | "full_solve"
  | "proof_check"
  | "show_figure"
  | "practice_route";

export interface MentorTutorDiagnosis {
  mistake_tags?: string[];
  misconception_summary?: string;
  confidence?: "low" | "med" | "high" | string;
  chapter?: string;
  family_id?: string;
  family_label?: string;
  qtype_id?: string;
  theorem_focus?: string[];
  confusion_type?: MentorConfusionType | string;
  help_mode?: MentorHelpMode | string;
  student_profile?: MentorStudentProfile | string;
  diagram_needed?: boolean;
  summary_line?: string;
}

export interface MentorTutorSocratic {
  question?: string;
  expected_thought?: string;
}

export interface MentorTutorHintLadder {
  level?: number;
  hint?: string;
  next_action?: string;
}

export interface MentorTutorBoardSteps {
  steps?: Array<{ line?: string; marks?: number }>;
  total_marks?: number;
  deductions?: Array<{ reason?: string; marks_lost?: number }>;
  examiner_note?: string;
}

export interface MentorTutorBoardTip {
  title?: string;
  summary?: string;
  mark_cut_risk?: string;
  question_style?: string;
}

export interface MentorTutorCommonMistake {
  title?: string;
  summary?: string;
  fix?: string;
  mark_risk?: string;
}

export interface MentorTutorPracticeNext {
  cta?: string;
  topic_key?: string;
  family_id?: string;
  family_label?: string;
  qtype_id?: string;
  chapter_step?: string;
  reason?: string;
  section_filter?: string;
  focus_question_ids?: string[];
}

export interface MentorTutorAdaptiveStyle {
  profile?: MentorStudentProfile | string;
  tone?: string;
  depth?: string;
  pacing?: string;
  rationale?: string;
}

export interface MentorTutorNext {
  micro_drill?: string;
  revision_hook?: string;
  suggested_practice_ids?: string[];
  chapter_step?: string;
  practice_next_label?: string;
  practice_next_reason?: string;
  practice_next_section?: string;
  practice_next_qtype_id?: string;
}

export interface MentorTutorObject {
  text?: string;
  rawText?: string;
  items?: string[];
  diagnosis?: MentorTutorDiagnosis;
  socratic?: MentorTutorSocratic;
  hint_ladder?: MentorTutorHintLadder;
  board_steps_ms?: MentorTutorBoardSteps;
  next?: MentorTutorNext;
  board_tip?: MentorTutorBoardTip;
  common_mistake?: MentorTutorCommonMistake;
  practice_next?: MentorTutorPracticeNext;
  adaptive_style?: MentorTutorAdaptiveStyle;
  diagramRequired?: boolean;
  diagramType?: string;
  diagramSpec?: unknown;
  diagramLabels?: Record<string, string> | string[];
}


export interface SolveWithMeStructured {
  kind: SolveWithMeKind;
  tutor: string | MentorTutorObject;
  /** Optional small title or tag (e.g., "Step 2") */
  label?: string;
  /** Optional problem restatement / working line */
  prompt?: string;
  /** Optional multiple choice options (future-ready) */
  options?: string[];
  /** Optional short final answer if kind === 'final' */
  answer?: string;

  /** Optional diagram type for lightweight frontend rendering. */
  diagramType?: string;
  /** Optional label map for the diagram. */
  diagramLabels?: Record<string, string>;

  /** Optional diagram spec for visual explanation (frontend renders). */
  diagram?: MentorDiagramSpec;
  /** Optional runtime-ready diagram block for direct frontend rendering. */
  diagramBlock?: import("../diagrams/diagramIntelligence").LazytopperDiagramBlock;
  /** Optional anchors for stable highlighting in the diagram renderer. */
  anchors?: MentorDiagramAnchor[];
  /** Optional step→highlight mapping to sync with tutor steps. */
  diagramSteps?: MentorDiagramStepLink[];

}

/**
 * Board steps protocol for CBSE-style marking scheme.
 */
export interface BoardStepLine {
  stepNo: number;
  text: string;
  marks: number;
}

export interface BoardStepsStructured {
  kind: 'board_steps_ms';
  totalMarks: number;
  steps: BoardStepLine[];
  /** Optional final answer line */
  finalAnswer?: string;

  /** Optional diagram type for lightweight frontend rendering. */
  diagramType?: string;
  /** Optional label map for the diagram. */
  diagramLabels?: Record<string, string>;

  /** Optional diagram spec for visual explanation (frontend renders). */
  diagram?: MentorDiagramSpec;
  /** Optional runtime-ready diagram block for direct frontend rendering. */
  diagramBlock?: import("../diagrams/diagramIntelligence").LazytopperDiagramBlock;
  /** Optional anchors for stable highlighting in the diagram renderer. */
  anchors?: MentorDiagramAnchor[];
  /** Optional step→highlight mapping to sync with tutor steps. */
  diagramSteps?: MentorDiagramStepLink[];

}

/**
 * Learn-tab teaching payload for key definitions.
 */
export interface LearnTeachStructured {
  kind: 'learn_teach';
  teach: {
    simpleExplanation: string[];
    cbseExamSentence: string[];
  };
  workedExamples: Array<{
    title: string;
    question: string;
    steps: Array<{ text: string; marks: number }>;
    totalMarks: number;
    finalAnswer: string;
  }>;
  commonMistakes: string[];
  checkQuestion: string;
  diagramType?: string;
  diagramLabels?: Record<string, string>;
  diagram?: MentorDiagramSpec;
  diagramBlock?: import("../diagrams/diagramIntelligence").LazytopperDiagramBlock;
  anchors?: MentorDiagramAnchor[];
  diagramSteps?: MentorDiagramStepLink[];
}

/**
 * Learn-tab proof writing payload for CBSE format.
 */
export interface LearnProofStructured {
  kind: 'learn_proof';
  given: string[];
  toProve: string[];
  construction: string[];
  proofSteps: Array<{ statement: string; reason: string; mark: number }>;
  conclusion: string[];
  totalMarks: number;
  diagramType?: string;
  diagramLabels?: Record<string, string>;
  diagram?: MentorDiagramSpec;
  diagramBlock?: import("../diagrams/diagramIntelligence").LazytopperDiagramBlock;
  anchors?: MentorDiagramAnchor[];
  diagramSteps?: MentorDiagramStepLink[];
}

export interface LearnMindmapStructured {
  kind: 'learn_mindmap';
  conceptBullets: string[];
  examLines: string[];
  workedExample: { question: string; steps: string[]; finalAnswer: string };
  commonError: string;
  commonFix: string;
  checkQuestion: string;
  diagramType?: string;
  diagramLabels?: Record<string, string>;
  diagram?: MentorDiagramSpec;
  diagramBlock?: import("../diagrams/diagramIntelligence").LazytopperDiagramBlock;
  anchors?: MentorDiagramAnchor[];
  diagramSteps?: MentorDiagramStepLink[];
}

/**
 * Minimal envelope returned by the gateway for nested tutor payloads.
 * Keeps backwards compatibility with older "tutor: string" shapes.
 */
export interface MentorTutorEnvelope {
  kind: string;
  tutor?: string | MentorTutorObject;
  finalAnswer?: string;
}

/**
 * Union of all structured protocols we currently support.
 * (Other modes generally return plain text only.)
 */
export type MentorStructuredProtocol =
  | SolveWithMeStructured
  | BoardStepsStructured
  | LearnTeachStructured
  | LearnProofStructured
  | LearnMindmapStructured
  | MentorTutorEnvelope;

/**
 * Mentor gateway response data payload.
 */
export interface MentorGatewayData {
  text: string;
  structured?: MentorStructured;
}
