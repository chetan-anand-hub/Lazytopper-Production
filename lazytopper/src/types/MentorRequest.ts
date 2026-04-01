/**
 * Supported mentor modes.  These modes determine which system prompt and
 * backend behaviour are applied when handling a request.  We extend the
 * original set (solve, explain, plan, coach, mindset) with topic‑level
 * modes used in TopicHub and Trends flows:
 *
 * - `topic_explain`: Explain an entire chapter or topic from scratch.
 * - `topic_exam_tips`: Provide exam preparation strategy and tips on how
 *   to score 95+ from a specific unit.
 */
export type MentorMode =
  | "solve"
  | "explain"
  | "plan"
  | "coach"
  | "mindset"
  | "topic_explain"
  | "topic_exam_tips"
  | "solve_with_me"
  | "board_steps_ms"
  | "learn_teach"
  | "learn_proof"
  | "learn_mindmap";

export interface PageContext {
  grade: "Class 10";
  subject: "Maths" | "Science";
  chapter?: string;
  topic?: string;
  topicKey?: string;
  questionId?: string;
  marks?: number;
  difficulty?: "Easy" | "Medium" | "Hard";
  questionFamilyId?: string;
  questionFamilyLabel?: string;
  questionTypeId?: string;
  chapterStep?: string;
  practiceSectionFilter?: "A" | "B" | "C" | "D" | "E";
  suggestedPracticeIds?: string[];
  theoremFocus?: string[];
  recommendedDiagramType?: string;
}

export interface StudentState {
  studentId?: string;

  // Overall planner info
  daysLeft?: number;
  targetScore?: number; // overall target %
  hoursPerDayOverall?: number; // total hours per day (Maths + Science)
  subjects?: ("Maths" | "Science")[];

  // Subject-wise splits
  mathTargetScore?: number;
  scienceTargetScore?: number;
  mathHoursPerDay?: number;
  scienceHoursPerDay?: number;

  // Other state we can fill later
  completedChapters?: string[];
  weakChapters?: string[];
  confidenceLevel?: "low" | "medium" | "high";
  mood?: "stressed" | "okay" | "confident" | "burnt-out" | "anxious";
  studentProfile?:
    | "anxious"
    | "weak_foundation"
    | "boards_focused"
    | "doubt_heavy"
    | "advanced_value_seeking";
}

export interface MentorMessage {
  role: "user" | "assistant";
  content: string;
  mode?: MentorMode;
}

/**
 * Configuration for a single mentor mode.  Defines how the backend should
 * behave when this mode is active, including the system prompt and
 * example prompts for users.
 */
export interface MentorModeConfig {
  /** The mode identifier (solve, explain, plan, coach, mindset). */
  id: MentorMode;
  /** Human‑readable label shown in the UI. */
  label: string;
  /** Short description of what this mode does. */
  description: string;
  /** System prompt used by the backend when this mode is active. */
  systemPrompt: string;
  /** Example prompts that can be shown to the user. */
  exampleUserPrompts?: string[];
}

/**
 * A persona aggregates global rules and mode-specific configurations for the
 * AI mentor.  It defines the tone, behaviour and available modes.  See
 * src/mentors/centralPersona.ts for an example.
 */
export interface MentorPersona {
  /** Unique identifier for the persona (e.g. "lazy-topper-central-mentor"). */
  id: string;
  /** Display name for the persona. */
  name: string;
  /** Short tagline describing the persona’s mission. */
  tagline: string;
  /** High‑level style guidance (tone, formality, etc.). */
  styleNotes: string;
  /** A list of core rules that always apply regardless of mode. */
  coreRules: string[];
  /** Mode configurations specific to this persona. */
  modes: MentorModeConfig[];
}

/**
 * Client-facing mentor request.  A unified structure for sending
 * messages to the mentor backend.  Includes the active mode, the
 * user’s message, context about the question or plan, the student’s
 * state, optional chat history, and an optional persona definition.
 */
export interface MentorRequest {
  /** The active mode for the request.  Determines which system prompt
   * and behaviours are applied. */
  mode: MentorMode;
  /** The raw user message to process. */
  message: string;
  /** Context about the question or plan (grade, subject, chapter, etc.). */
  pageContext: PageContext;
  /** Current state of the student, including targets and hours per day. */
  studentState: StudentState;
  /** Chat history to maintain context across turns (optional). */
  history?: MentorMessage[];
  /** Optional raw base64 image for a one-off mentor request. */
  imageBase64?: string;
  /** Optional mime type for an attached mentor image. */
  imageMimeType?: import("./mentor").MentorImageMimeType;
  /** Optional display name for an attached mentor image. */
  imageName?: string;
  /** Optional persona configuration to override defaults on the backend. */
  persona?: MentorPersona;
}

// Re-export structured protocol types so UI code can import from one place.
export type {
  MentorStructured,
  MentorGatewayData,
  BoardStepsStructured,
  SolveWithMeStructured,
} from "./mentor";
