import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
// Import the strategy plan helper.  Use a relative import since this file
// sits at the project root alongside planStorage.ts.
// We no longer persist plan drafts from within the MentorPanel.  Plan
// persistence is handled in the Planner flow (e.g. AiMentorPage) where
// the structured study plan is generated and saved.  Removing this
// import avoids unused variable errors and mismatched argument counts.
// import { saveStrategyPlan } from "../services/planStorage";
import { callMentor } from "../ai/aiClient";
import { getHintVariant } from "../services/abFlags";
import { logActivity } from "../services/sessionLogger";
import { HumanGradeCoachView } from "./mentor/HumanGradeCoachView";
import { DiagramBlock } from "./DiagramBlock";
import { isRecord } from "../types/mentor";
import {
  extractMentorDiagramBlock,
  getMentorTutorObject,
  getMentorTutorText,
} from "../utils/mentorStructured";
import type {
  MentorMode,
  MentorMessage,
  MentorRequest,
  PageContext,
  StudentState,
  MentorPersona,
  MentorStructured,
  BoardStepsStructured,
  SolveWithMeStructured,
} from "../types/MentorRequest";
import type { MentorPayload } from "../ai/aiClient";
import type { MentorImageMimeType, TutorBlock } from "../types/mentor";
import type { LazytopperDiagramBlock } from "../diagrams/diagramIntelligence";
import type { StudentMentorIntent } from "../types/studentMentorIntent";
import { navigateToPractice, type PracticeSectionFilter } from "../navigation/practiceNavigation";
import {
  createMentorImageAttachment,
  getMentorImageErrorMessage,
  revokeMentorImagePreview,
  type MentorImageAttachment,
} from "../utils/mentorImage";

/**
 * MentorPanel
 *
 * This component powers the interactive AI mentor experience.  It supports
 * multiple mentor modes (solve, explain, plan, coach, mindset) via a single
 * unified persona.  When `showModes` is enabled, users can switch between
 * modes using the chips; otherwise it defaults to planner functionality.
 * A `persona` prop can optionally be provided to forward persona metadata to
 * the backend.  The UI remains largely unchanged from the original version -
 * subject/chapter selectors, plan preview bubble and tweak input are all
 * preserved.
 */
interface MentorPanelProps {
  pageContext: PageContext;
  initialStudentState: StudentState;
  /** initial mentor mode (defaults to "plan"). */
  defaultMode?: MentorMode;
  /** initial prompt to auto-generate a plan when landing on the page. */
  autoFirstPrompt?: string;
  /** whether to display mode chips for switching between solve/explain/plan/etc. */
  showModes?: boolean;
  /** callback fired when the plan preview text updates. */
  onPlanUpdated?: (planText: string | null) => void;
  /** optional persona definition forwarded to the backend. */
  persona?: MentorPersona;
  /** student view hides internal modes; advanced view allows opt-in full mode selector. */
  uiPreset?: "student" | "advanced";
  /** optional student-first intent default for the current context/question. */
  defaultIntent?: StudentMentorIntent;
}

const MODES: { key: MentorMode; label: string }[] = [
  { key: "solve", label: "Solve" },
  { key: "explain", label: "Explain" },
  { key: "plan", label: "Plan" },
  { key: "coach", label: "Coach" },
  { key: "mindset", label: "Mindset" },
  { key: "topic_explain", label: "Topic Explain" },
  { key: "topic_exam_tips", label: "Topic Exam Tips" },
  { key: "solve_with_me", label: "Solve With Me" },
  { key: "board_steps_ms", label: "Board Steps" },
  { key: "learn_teach", label: "Learn Teach" },
  { key: "learn_proof", label: "Learn Proof" },
  { key: "learn_mindmap", label: "Learn Mindmap" },
];

const STUDENT_INTENT_TO_MODE: Record<StudentMentorIntent, MentorMode> = {
  hint: "solve_with_me",
  explain: "learn_teach",
  check_cbse: "board_steps_ms",
};

const STUDENT_ACTIONS: Array<{ key: StudentMentorIntent; label: string }> = [
  { key: "hint", label: "Hint / Next step" },
  { key: "explain", label: "Explain" },
  { key: "check_cbse", label: "Check my solution (CBSE)" },
];

const STUDENT_SUBTITLES: Record<StudentMentorIntent, string> = {
  hint: "I'll guide you step-by-step (hints first).",
  explain: "I'll teach the concept simply + a short example.",
  check_cbse: "I'll format your answer like CBSE marking-scheme steps.",
};

const CHECK_CBSE_PREFIX =
  "Use CBSE marking scheme style. Give stepwise solution with marks allocation if possible. Box the final answer.";
const CHECK_CBSE_IMAGE_ONLY_PROMPT =
  "Please check the attached handwritten solution photo in CBSE marking-scheme style.";

const resolveIntentFromMode = (initialMode: MentorMode): StudentMentorIntent => {
  if (initialMode === "solve" || initialMode === "solve_with_me") return "hint";
  if (initialMode === "explain" || initialMode === "topic_explain") return "explain";
  return "explain";
};

// Full-ish CBSE Class 10 chapter lists for now
const CHAPTERS_BY_SUBJECT: Record<"Maths" | "Science", string[]> = {
  Maths: [
    "All Chapters",
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Applications of Trigonometry",
    "Circles",
    "Constructions",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
  ],
  Science: [
    "All Chapters",
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-Metals",
    "Carbon and Its Compounds",
    "Periodic Classification of Elements",
    "Life Processes",
    "Control and Coordination",
    "How do Organisms Reproduce?",
    "Heredity and Evolution",
    "Light - Reflection and Refraction",
    "The Human Eye and the Colourful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Our Environment",
    "Sustainable Management of Natural Resources",
  ],
};

/**
 * Call the backend API.  This function sends the request payload to the
 * mentor API running on port 3001 and returns a string representation of
 * the response.  For plan mode, it formats the study plan into a readable
 * preview.  For other modes, it simply stringifies the returned data.
 */
/**
 * Mentor responses sometimes contain a protocol JSON blob (e.g. board_steps_ms / solve_with_me),
 * accidentally mixed with plain text. We sanitize the display so students never see raw JSON.
 * This is UI-only hardening; backend can still be strict, but we defend here too.
 */
function stripCodeFences(raw: string): string {
  const t = String(raw || "");
  return t.replace(/```[a-zA-Z0-9_-]*\n?/g, "").replace(/```/g, "").trim();
}

function extractAllJsonObjects(raw: string): Array<{ start: number; end: number; text: string }> {
  const t = stripCodeFences(raw ?? "");
  const out: Array<{ start: number; end: number; text: string }> = [];
  const len = t.length;

  for (let i = 0; i < len; i++) {
    if (t[i] !== "{") continue;

    const startIdx = i;
    let depth = 0;
    let inString = false;
    let esc = false;

    for (; i < len; i++) {
      const ch = t[i];

      if (esc) {
        esc = false;
        continue;
      }

      if (ch === "\\") {
        if (inString) esc = true;
        continue;
      }

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) {
          const endIdx = i + 1;
          out.push({ start: startIdx, end: endIdx, text: t.slice(startIdx, endIdx) });
          break;
        }
      }
    }
  }

  return out;
}

function repairJsonForParse(raw: string): string {
  let t = String(raw || "").trim();
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // Remove trailing commas like {"a":1,} or [1,2,]
  t = t.replace(/,\s*([}\]])/g, "$1");

  // Quote unquoted keys: {foo: 1} -> {"foo": 1}
  t = t.replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":');

  // Convert single-quoted strings to double-quoted strings (best-effort)
  t = t.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner) => {
    const safeInner = String(inner).replace(/"/g, '\\"');
    return `"${safeInner}"`;
  });

  return t;
}

function safeJsonParse(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(repairJsonForParse(text));
    } catch {
      return null;
    }
  }
}

function isBoardSteps(obj: unknown): obj is BoardStepsStructured {
  return (
    isRecord(obj) &&
    obj.kind === "board_steps_ms" &&
    typeof obj.totalMarks === "number" &&
    Array.isArray(obj.steps)
  );
}

function isSolveWithMe(obj: unknown): obj is SolveWithMeStructured {
  return (
    isRecord(obj) &&
    (obj.kind === "question" || obj.kind === "hint" || obj.kind === "final") &&
    (typeof obj.tutor === "string" || (isRecord(obj.tutor) && Boolean(obj.tutor)))
  );
}

function getTutorObject(structured: MentorStructured | undefined): TutorBlock | null {
  return getMentorTutorObject(structured);
}

function getTutorText(structured: MentorStructured | undefined): string {
  return getMentorTutorText(structured);
}

function extractStructuredDiagram(
  structured: MentorStructured | undefined,
  fallbackTitle = "Mentor diagram"
): LazytopperDiagramBlock | null {
  return extractMentorDiagramBlock(structured, fallbackTitle);
}

function inferStudentProfileFromState(
  mode: MentorMode,
  message: string,
  studentState: StudentState
): NonNullable<StudentState["studentProfile"]> {
  if (studentState.studentProfile) return studentState.studentProfile;

  const mood = String(studentState.mood || "").toLowerCase();
  const confidence = String(studentState.confidenceLevel || "").toLowerCase();
  const text = String(message || "").toLowerCase();

  if (mood === "anxious" || mood === "burnt-out" || /(panic|overwhelm|scared|blank)/i.test(text)) {
    return "anxious";
  }
  if (/(fast|shortcut|efficient|high[- ]value|just the key step)/i.test(text)) {
    return "advanced_value_seeking";
  }
  if (mode === "board_steps_ms") return "boards_focused";
  if (/(why|reason|doubt|how)/i.test(text)) return "doubt_heavy";
  if (confidence === "low" || mood === "stressed") return "weak_foundation";
  return "weak_foundation";
}

function inferHelpModeFromMode(mode: MentorMode): string {
  if (mode === "board_steps_ms" || mode === "learn_proof") return "proof_check";
  if (mode === "learn_teach" || mode === "learn_mindmap" || mode === "explain") return "explain";
  if (mode === "solve_with_me" || mode === "solve") return "next_step";
  return "hint";
}

function formatBoardSteps(obj: unknown): string {
  const total = isRecord(obj) && typeof obj.totalMarks === "number" ? obj.totalMarks : 0;
  const steps = isRecord(obj) && Array.isArray(obj.steps) ? obj.steps : [];
  const lines: string[] = [];

  lines.push(`Board Steps (${total} mark${total === 1 ? "" : "s"}):`);

  steps.forEach((s, idx: number) => {
    const stepText = isRecord(s) ? String(s.text ?? "").trim() : "";
    const marks = isRecord(s) && typeof s.marks === "number" ? s.marks : 0;
    if (!stepText) return;
    lines.push(`Step ${idx + 1} (${marks}m): ${stepText}`);
  });

  return lines.join("\n");
}

function formatBoardStepsBlock(block: unknown): string {
  if (!isRecord(block)) return "";
  const total = Number(block.total_marks) || 0;
  const steps = Array.isArray(block.steps) ? block.steps : [];
  const lines: string[] = [];
  lines.push(`Board Steps (${total} mark${total === 1 ? "" : "s"}):`);
  steps.forEach((s, idx: number) => {
    const line = isRecord(s) ? String(s.line ?? "").trim() : "";
    const marks = isRecord(s) ? Number(s.marks) || 0 : 0;
    if (!line) return;
    lines.push(`Step ${idx + 1} (${marks}m): ${line}`);
  });
  return lines.join("\n");
}

function formatSolveWithMe(obj: unknown): string {
  const tutor =
    isRecord(obj) && typeof obj.tutor === "string"
      ? String(obj.tutor ?? "").trim()
      : isRecord(obj) && isRecord(obj.tutor)
        ? String(obj.tutor.text ?? obj.tutor.rawText ?? "").trim()
        : "";
  if (!tutor) return "";
  if (!isRecord(obj) || obj.kind !== "final") return tutor;

  const parts: string[] = [tutor];
  const finalAnswer = String(obj.finalAnswer ?? "").trim();
  const boardWriteup = String(obj.boardWriteup ?? "").trim();

  if (finalAnswer) parts.push("", "Final Answer:", finalAnswer);
  if (boardWriteup) parts.push("", "Board Write-up:", boardWriteup);

  return parts.join("\n");
}

function sanitizeMentorOutput(raw: string): string {
  const stripped = stripCodeFences(raw ?? "");
  const candidates = extractAllJsonObjects(stripped);

  // 1) Try to parse a protocol object (board_steps_ms / solve_with_me)
  let protocol: unknown | null = null;
  for (const c of candidates) {
    const obj = safeJsonParse(c.text);
    if (isBoardSteps(obj) || isSolveWithMe(obj)) {
      protocol = obj;
      break;
    }
  }

  // 2) Remove any JSON blobs from the leftover text
  let leftover = stripped;
  for (const c of candidates) {
    leftover = leftover.replace(c.text, "");
  }
  leftover = leftover.trim();

  // 3) Format protocol object (if any)
  const formatted =
    protocol && isBoardSteps(protocol)
      ? formatBoardSteps(protocol)
      : protocol && isSolveWithMe(protocol)
        ? formatSolveWithMe(protocol)
        : "";

  if (leftover && formatted) return `${leftover}\n\n${formatted}`;
  if (formatted) return formatted;
  return leftover || stripped;
}

type MentorReply = {
  text: string;
  structured?: MentorStructured;
};

type MentorRequestWithHints = MentorRequest & {
  hintLevel?: number;
  requestNextHint?: boolean;
};

const getStringProp = (obj: unknown, key: string): string | undefined =>
  isRecord(obj) && typeof obj[key] === "string" ? String(obj[key]) : undefined;

const getStringArrayProp = (obj: unknown, key: string): string[] | undefined => {
  if (!isRecord(obj) || !Array.isArray(obj[key])) return undefined;
  const list = obj[key]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return list.length > 0 ? list : undefined;
};

async function callMentorAPI(payload: MentorRequestWithHints): Promise<MentorReply> {
  // Build a compact MentorPayload-style object from the richer MentorRequest.
  // This keeps all the planner logic here, while delegating the actual HTTP
  // call + error handling to src/ai/aiClient.ts.
  const pageContextTopicKey = getStringProp(payload.pageContext, "topicKey");
  const pageContextTopic = getStringProp(payload.pageContext, "topic");
  const topicKey =
    pageContextTopicKey ??
    pageContextTopic ??
    payload.pageContext.chapter ??
    undefined;
  const studentProfile = inferStudentProfileFromState(
    payload.mode,
    payload.message,
    payload.studentState
  );
  const sharedMentorFields = {
    topicKey,
    studentIntent:
      payload.mode === "board_steps_ms"
        ? "check_cbse"
        : payload.mode === "learn_teach" || payload.mode === "explain"
          ? "explain"
          : "hint",
    studentProfile,
    mentorHelpMode: inferHelpModeFromMode(payload.mode),
    questionFamilyId: getStringProp(payload.pageContext, "questionFamilyId"),
    questionFamilyLabel: getStringProp(payload.pageContext, "questionFamilyLabel"),
    questionTypeId: getStringProp(payload.pageContext, "questionTypeId"),
    chapterStep: getStringProp(payload.pageContext, "chapterStep"),
    practiceSectionFilter: getStringProp(payload.pageContext, "practiceSectionFilter"),
    suggestedPracticeIds: getStringArrayProp(payload.pageContext, "suggestedPracticeIds"),
    theoremFocus: getStringArrayProp(payload.pageContext, "theoremFocus"),
    recommendedDiagramType: getStringProp(payload.pageContext, "recommendedDiagramType"),
  };
  const mentorPayload: MentorPayload & Record<string, unknown> =
    payload.mode === "plan"
      ? {
          subject: payload.pageContext.subject,
          daysLeft: payload.studentState.daysLeft ?? 90,
          targetPercent: payload.studentState.targetScore ?? 80,
          // Total focussed study time per day across Maths + Science.
          hoursPerDay:
            (payload.studentState.mathHoursPerDay ?? 0) +
            (payload.studentState.scienceHoursPerDay ?? 0),
          ...sharedMentorFields,
          // Keep weak chapters for future prompt tuning (gateway ignores unknown keys safely).
          weakChapters: payload.studentState.weakChapters,
          optionalChapters: [],
          extraNotes: undefined,
        }
      : payload.mode === "solve"
      ? {
          grade: String(payload.pageContext.grade),
          subject: payload.pageContext.subject,
          ...sharedMentorFields,
          questionText: payload.message,
          marks: payload.pageContext.marks,
        }
      : payload.mode === "explain"
      ? {
          grade: String(payload.pageContext.grade),
          subject: payload.pageContext.subject,
          ...sharedMentorFields,
          questionText: payload.message,
        }
      : {
          grade: String(payload.pageContext.grade),
          subject: payload.pageContext.subject,
          daysLeft: payload.studentState.daysLeft ?? 90,
          ...sharedMentorFields,
          extraNotes: payload.message,
        };

  const hintLevel = payload.hintLevel;
  const requestNextHint = payload.requestNextHint;
  if (hintLevel != null) mentorPayload.hintLevel = hintLevel;
  if (requestNextHint != null) mentorPayload.requestNextHint = requestNextHint;
  if (payload.imageBase64 && payload.imageMimeType) {
    mentorPayload.imageBase64 = payload.imageBase64;
    mentorPayload.imageMimeType = payload.imageMimeType as MentorImageMimeType;
    if (payload.imageName) mentorPayload.imageName = payload.imageName;
  }

  const result = await callMentor(
    payload.mode,
    mentorPayload,
    payload.persona
  );
// Prefer the plain text if present, otherwise attempt to format a study plan.
  const { mode, data } = result;

  const rawText = data && typeof data.text === "string" ? String(data.text) : "";
  const text = rawText.trim();
  const structured: MentorStructured | undefined = data?.structured;
  const tutorObj = getTutorObject(structured);
  const tutorText = getTutorText(structured);

  // Mode-first: Prefer structured protocol returned by the gateway (more reliable than regex extraction).
  if (mode === "board_steps_ms" && structured && isBoardSteps(structured)) {
    return { text: formatBoardSteps(structured), structured };
  }
  if (mode === "solve_with_me" && structured && isSolveWithMe(structured)) {
    return { text: formatSolveWithMe(structured), structured };
  }
  if (mode === "board_steps_ms" && tutorObj?.board_steps_ms) {
    const formatted = formatBoardStepsBlock(tutorObj.board_steps_ms);
    if (formatted) return { text: formatted, structured };
  }

  if (tutorText.trim().length > 0) {
    return { text: tutorText.trim(), structured };
  }
  if (text.length > 0) {
    return { text: sanitizeMentorOutput(text), structured };
  }
  if (mode === "plan") {
    const lines: string[] = [];

    if (isRecord(data) && Array.isArray(data.seasonPlan)) {
      lines.push("Study phases:");
      data.seasonPlan.forEach((phase) => {
        if (!isRecord(phase)) return;
        lines.push(
          `- ${phase.phase} - ${phase.durationDays} days: ${phase.focus}`
        );
      });
      lines.push("");
    }

    if (isRecord(data) && Array.isArray(data.chapterHours)) {
      lines.push("Chapter allocation:");
      data.chapterHours.forEach((ch) => {
        if (!isRecord(ch)) return;
        lines.push(
          `- ${ch.chapter} [${ch.tier}] - ${ch.recommendedHours} hrs (${ch.weightagePercent}% weightage)`
        );
      });
      lines.push("");
    }

    if (isRecord(data) && Array.isArray(data.dailySchedule)) {
      lines.push("First few days schedule:");
      data.dailySchedule.forEach((d) => {
        if (!isRecord(d)) return;
        const parts: string[] = [];
        if (isRecord(d.hours)) {
          if (d.hours.Maths) parts.push(`Maths: ${d.hours.Maths}h`);
          if (d.hours.Science) parts.push(`Science: ${d.hours.Science}h`);
        }
        lines.push(`- Day ${d.dayNumber}: ${parts.join(", ")}`);
      });
    }

    if (lines.length > 0) {
      return { text: lines.join("\n"), structured };
    }
  }

  // Fallback: pretty-print whatever data we received
  return { text: JSON.stringify(result.data ?? {}, null, 2), structured };
}

type MentorMessageView = MentorMessage & { structured?: MentorStructured };

export const MentorPanel: React.FC<MentorPanelProps> = ({
  pageContext,
  initialStudentState,
  defaultMode = "plan",
  autoFirstPrompt,
  showModes = false,
  onPlanUpdated,
  persona,
  uiPreset = "student",
  defaultIntent,
}) => {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<StudentMentorIntent>(() =>
    defaultIntent ?? resolveIntentFromMode(defaultMode)
  );
  const [advancedMode, setAdvancedMode] = useState<MentorMode>(defaultMode);
  const [showAdvancedModes, setShowAdvancedModes] = useState(false);
  const [messages, setMessages] = useState<MentorMessageView[]>([]);
  const [planPreview, setPlanPreview] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [studentState] = useState<StudentState>(initialStudentState);
  const [subject, setSubject] = useState<"Maths" | "Science">(
    pageContext.subject
  );
  const [chapter, setChapter] = useState<string>(
    pageContext.chapter ?? "All Chapters"
  );
  const [hasAutoPrompted, setHasAutoPrompted] = useState(false);
  const [hintLevels, setHintLevels] = useState<Record<number, number>>({});
  const [hintLoading, setHintLoading] = useState<Record<number, boolean>>({});
  const [hintWarnings, setHintWarnings] = useState<Record<number, string>>({});
  const [hintFallback, setHintFallback] = useState<Record<number, boolean>>({});
  const [hintVariant] = useState(() => getHintVariant());
  const userTouchedIntentRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachedImageRef = useRef<MentorImageAttachment | null>(null);
  const isDev = Boolean(import.meta?.env?.DEV);
  const canUseAdvanced = uiPreset === "advanced" && showModes;
  const usingAdvancedMode = canUseAdvanced && showAdvancedModes;
  const resolvedMode: MentorMode = usingAdvancedMode
    ? advancedMode
    : STUDENT_INTENT_TO_MODE[intent];
  const showSolutionImageUpload =
    uiPreset === "student" && !usingAdvancedMode && intent === "check_cbse";
  const [attachedImage, setAttachedImage] = useState<MentorImageAttachment | null>(null);
  const [imageErrorText, setImageErrorText] = useState<string | null>(null);

  const effectivePageContext: PageContext = {
    ...pageContext,
    subject,
    chapter,
    topicKey: pageContext.topicKey ?? pageContext.topic ?? chapter,
  };
  const chaptersForSubject = CHAPTERS_BY_SUBJECT[subject] ?? ["All Chapters"];
  const effectiveTopicKey =
    effectivePageContext.topicKey ??
    effectivePageContext.topic ??
    effectivePageContext.chapter ??
    "";
  const gradeNumber = String(effectivePageContext.grade || "Class 10").replace(/\D/g, "") || "10";

  useEffect(() => {
    attachedImageRef.current = attachedImage;
  }, [attachedImage]);

  useEffect(
    () => () => {
      revokeMentorImagePreview(attachedImageRef.current?.previewUrl);
    },
    []
  );

  const clearAttachedImage = (nextError: string | null = null) => {
    setAttachedImage((prev) => {
      if (prev?.previewUrl) revokeMentorImagePreview(prev.previewUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setImageErrorText(nextError);
  };

  useEffect(() => {
    if (!showSolutionImageUpload && (attachedImage || imageErrorText)) {
      clearAttachedImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSolutionImageUpload]);

  useEffect(() => {
    setAdvancedMode(defaultMode);
    if (uiPreset !== "student") {
      setIntent(resolveIntentFromMode(defaultMode));
      return;
    }
    if (userTouchedIntentRef.current) return;
    setIntent(defaultIntent ?? resolveIntentFromMode(defaultMode));
  }, [defaultMode, defaultIntent, uiPreset]);

  useEffect(() => {
    if (!canUseAdvanced) setShowAdvancedModes(false);
  }, [canUseAdvanced]);

  const resetConversation = () => {
    setMessages([]);
    setPlanPreview(null);
    clearAttachedImage();
  };

  const handleImageFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setImageErrorText(null);
    try {
      const nextImage = await createMentorImageAttachment(file);
      setAttachedImage((prev) => {
        if (prev?.previewUrl && prev.previewUrl !== nextImage.previewUrl) {
          revokeMentorImagePreview(prev.previewUrl);
        }
        return nextImage;
      });
    } catch (error) {
      setImageErrorText(getMentorImageErrorMessage(error));
    }
  };

  const handleAssistantReply = (reply: MentorReply, requestMode: MentorMode) => {
    const assistantMsg: MentorMessageView = {
      role: "assistant",
      content: reply.text,
      mode: requestMode,
      structured: reply.structured,
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setPlanPreview(reply.text);
    if (onPlanUpdated) onPlanUpdated(reply.text);

    // Persist plan drafts in plan mode so the dashboard can load a
    // strategy plan later.  We save only when mode is "plan" and the
    // reply is nonempty.  The context contains grade and subject
    // information, which we forward to the storage helper.  Saving
    // plans helps bridge the mentor and dashboard flows.
    if (requestMode === "plan" && reply.text && reply.text.trim().length > 0) {
      try {
        // grade is stored as e.g. "Class 10", remove non-digits for route convenience
        const _gradeNum = String(
          (effectivePageContext.grade || "Class 10").replace(/\D/g, "")
        ) || "10";
        // Persist a deep link to the study plan page so the dashboard can
        // later load the plan.  We compute a route of the form
        // `/study-plan/{gradeNum}/{subject}` where subject is lower-case.
        // The actual plan text is saved via the strategy engine in the
        // dedicated planner flow; this call only stores the link.
        const subjectKey = (effectivePageContext.subject || "Maths").toLowerCase();
        const planDeepLink = `/study-plan/${_gradeNum}/${subjectKey}`;
        try {
          window.localStorage.setItem('lazytopper.lastPlanDeepLink', planDeepLink);
        } catch {
          // Ignore localStorage errors (e.g. quota exceeded)
        }
      } catch (err) {
        console.warn("Failed to persist strategy plan", err);
      }
    }
  };

  const sendPrompt = async (prompt: string) => {
    const trimmedPrompt = prompt.trim();
    const imageForRequest = showSolutionImageUpload ? attachedImage : null;
    if (!trimmedPrompt && !imageForRequest) return;
    const requestMode = resolvedMode;
    const userPrompt =
      trimmedPrompt ||
      (imageForRequest ? CHECK_CBSE_IMAGE_ONLY_PROMPT : "");
    const requestMessage =
      !usingAdvancedMode && intent === "check_cbse"
        ? `${CHECK_CBSE_PREFIX}\n\n${userPrompt}`
        : userPrompt;
    const userMsgContent =
      trimmedPrompt ||
      (imageForRequest
        ? "Uploaded a solution photo for CBSE checking."
        : userPrompt);
    const userMsg: MentorMessage = { role: "user", content: userMsgContent, mode: requestMode };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);
    setImageErrorText(null);
    const payload: MentorRequest = {
      mode: requestMode,
      message: requestMessage,
      pageContext: effectivePageContext,
      studentState,
      history: newHistory,
      persona,
    };
    let nextInlineError: string | null = null;
    if (imageForRequest) {
      payload.imageBase64 = imageForRequest.base64;
      payload.imageMimeType = imageForRequest.mimeType;
      payload.imageName = imageForRequest.name;
    }
    try {
      const reply = await callMentorAPI(payload);
      handleAssistantReply(reply, requestMode);
    } catch (error) {
      const inlineError =
        error instanceof Error && error.message.trim()
          ? error.message.trim()
          : "";
      if (imageForRequest && inlineError) {
        nextInlineError = inlineError;
        setImageErrorText(inlineError);
      } else {
        handleAssistantReply({
          text: "Hmm, something glitched while talking to your mentor. Try again in a few seconds.",
        }, requestMode);
      }
    } finally {
      if (imageForRequest) clearAttachedImage(nextInlineError);
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if ((!trimmed && !attachedImage) || isLoading) return;
    setInput("");
    await sendPrompt(trimmed);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (
    e
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-generate first plan using homepage inputs, but only in plan mode.
  useEffect(() => {
    if (!autoFirstPrompt || hasAutoPrompted || resolvedMode !== "plan") return;
    setHasAutoPrompted(true);
    setIsLoading(true);
    const requestMode = resolvedMode;
    const run = async () => {
      const payload: MentorRequest = {
        mode: requestMode,
        message: autoFirstPrompt,
        pageContext: effectivePageContext,
        studentState,
        history: [],
        persona,
      };
      try {
        const reply = await callMentorAPI(payload);
        handleAssistantReply(reply, requestMode);
      } catch {
        handleAssistantReply({
          text: "I couldn't auto-generate your plan. Try typing a quick tweak and I'll rebuild it.",
        }, requestMode);
      } finally {
        setIsLoading(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFirstPrompt, hasAutoPrompted, resolvedMode]);

  // Simple descriptions per mode for the header subtitle.
  const MODE_DESCRIPTIONS: Partial<Record<MentorMode, string>> = {
    solve: "Solve mode: I will walk through a question step-by-step.",
    explain: "Explain mode: I will break concepts into exam-ready understanding.",
    plan: "Planner mode: I will build a realistic daily roadmap.",
    coach: "Coach mode: I will give strategy and execution feedback.",
    mindset: "Mindset mode: I will help with consistency and confidence.",
    topic_explain: "Topic explain mode: chapter-first explanation with key ideas.",
    topic_exam_tips: "Topic exam tips mode: scoring strategy and writing tips.",
    solve_with_me: "Hint mode: I will nudge your next step without over-revealing.",
    board_steps_ms:
      "CBSE check mode: stepwise board-style solution with marks-aware structure.",
    learn_teach: "Explain mode: focused teaching with checkpoints and examples.",
    learn_proof: "Proof mode: structured logic with complete justification.",
    learn_mindmap: "Mindmap mode: concept links and quick memory hooks.",
  };

  // Placeholders for the input box depending on the active mode.  This helps
  // users understand what to type when not in planner mode.
  const INPUT_PLACEHOLDERS: Partial<Record<MentorMode, string>> = {
    solve: "Type your question here...",
    explain: "Type the topic or concept you want explained...",
    plan:
      "Want tweaks? Tell me what to adjust, for example more revision days.",
    coach: "Tell me your study challenge or ask for exam tips...",
    mindset: "Share your concern for mindset guidance...",
    topic_explain: "Ask for chapter-level explanation or concept breakdown...",
    topic_exam_tips: "Ask for scoring strategy, pitfalls, and revision method...",
    solve_with_me: "Share your current step and ask for the next hint...",
    board_steps_ms: "Paste your attempt and ask for CBSE stepwise checking...",
    learn_teach: "Ask to explain a concept with checkpoints and examples...",
    learn_proof: "Ask for proof structure and justification checks...",
    learn_mindmap: "Ask for concept map, links, and recall cues...",
  };

  const logHintEvent = (event: string, level: number) => {
    try {
      logActivity({
        type: "mentor",
        topicKey:
          effectivePageContext.chapter ?? effectivePageContext.topic ?? resolvedMode,
        questionIds: [event, hintVariant],
        score: level,
      });
    } catch {
      // Ignore logging failures.
    }
    if (isDev) {
      console.log("hint_event", { event, level, variant: hintVariant });
    }
  };

  const refreshHint = async (msgIdx: number, targetLevel: number) => {
    if (hintLoading[msgIdx]) return;
    setHintLoading((prev) => ({ ...prev, [msgIdx]: true }));
    setHintWarnings((prev) => ({ ...prev, [msgIdx]: "" }));

    const prompt = (() => {
      for (let i = msgIdx - 1; i >= 0; i -= 1) {
        const msg = messages[i];
        if (msg && msg.role === "user" && msg.content) return String(msg.content);
      }
      return "";
    })();

    const hintPrompt = prompt
      ? `${prompt}

Give me hint level ${targetLevel} only (keep it short).`
      : `Give me hint level ${targetLevel} only (keep it short).`;

    const payload: MentorRequestWithHints = {
      mode: resolvedMode,
      message: hintPrompt,
      pageContext: effectivePageContext,
      studentState,
      history: messages,
      persona,
    };
    payload.hintLevel = targetLevel;
    payload.requestNextHint = true;

    try {
      const reply = await callMentorAPI(payload);
      if (!reply.structured) throw new Error("No structured hint received");
      setMessages((prev) =>
        prev.map((m, i) => (i === msgIdx ? { ...m, structured: reply.structured } : m))
      );
      setHintLevels((prev) => ({ ...prev, [msgIdx]: targetLevel }));
      setHintFallback((prev) => ({ ...prev, [msgIdx]: false }));
      logHintEvent("hint_level_reached", targetLevel);
    } catch {
      setHintWarnings((prev) => ({
        ...prev,
        [msgIdx]: "Hint refresh failed; showing local hint.",
      }));
      setHintLevels((prev) => ({ ...prev, [msgIdx]: targetLevel }));
      setHintFallback((prev) => ({ ...prev, [msgIdx]: true }));
      logHintEvent("hint_refresh_failed", targetLevel);
    } finally {
      setHintLoading((prev) => ({ ...prev, [msgIdx]: false }));
    }
  };

  const handlePracticeNext = (practiceNext: {
    topic_key?: string;
    family_label?: string;
    section_filter?: string;
    focus_question_ids?: string[];
  }) => {
    const topicKey = String(practiceNext.topic_key || effectiveTopicKey || "").trim();
    if (!topicKey) return;
    navigateToPractice(navigate, {
      grade: gradeNumber,
      subject,
      topicKey,
      topicName: chapter !== "All Chapters" ? chapter : topicKey,
      backPath: `${window.location.pathname}${window.location.search}`,
      backLabel: "Back to Mentor",
      subtopicHint: String(practiceNext.family_label || "").trim() || undefined,
      sectionFilter: (practiceNext.section_filter || undefined) as PracticeSectionFilter | undefined,
      focusBankIds: Array.isArray(practiceNext.focus_question_ids)
        ? practiceNext.focus_question_ids.map((id) => String(id || "").trim()).filter(Boolean)
        : undefined,
      strictFocus: Array.isArray(practiceNext.focus_question_ids) && practiceNext.focus_question_ids.length > 0,
      recommendedCount: 8,
      difficultyPreset: "All",
      source: "mentor_practice_next",
    });
  };


  const buildCoachViewProps = (msg: MentorMessageView, idx: number) => {
    const tutorObj = getTutorObject(msg.structured);
    if (!tutorObj) return null;

    const hint = tutorObj.hint_ladder;
    const hintRecord = isRecord(hint) ? hint : null;
    const hints = Array.isArray(hintRecord?.hints) ? hintRecord.hints : [];
    const baseLevel = Number.isFinite(Number(hintRecord?.level)) ? Number(hintRecord?.level) : 1;
    const maxHintLevel = hints.length ? Math.min(3, hints.length) : 3;
    const localLevel = hintLevels[idx] ?? baseLevel;
    const displayLevel = Math.min(maxHintLevel, localLevel);
    const hintTextRaw = typeof hintRecord?.hint === "string" ? hintRecord.hint : "";
    const hintFromList = hints.length ? String(hints[Math.max(0, displayLevel - 1)] || "") : "";
    const effectiveVariant =
      hintVariant === "C_REFRESH" && hintFallback[idx] ? "B_LOCAL" : hintVariant;
    const displayHint =
      effectiveVariant === "B_LOCAL" && hints.length
        ? hintFromList
        : hintTextRaw || hintFromList;
    const showSingleHintNote =
      effectiveVariant === "B_LOCAL" && !hints.length && Boolean(hintTextRaw);
    const hintBusy = Boolean(hintLoading[idx]);
    const hintWarning = hintWarnings[idx];
    const canAdvance =
      effectiveVariant === "C_REFRESH"
        ? displayLevel < 3 && !hintBusy
        : hints.length > 1 && displayLevel < maxHintLevel;

    const coachTutorObj = hintRecord
      ? {
          ...tutorObj,
          hint_ladder: {
            ...hintRecord,
            hint: displayHint,
            _warning: hintWarning,
            _busy: hintBusy,
            _single_hint_note: showSingleHintNote,
            _can_advance: canAdvance,
          },
        }
      : tutorObj;

    const onNextHint = hintRecord
      ? () => {
          const nextLevel = Math.min(maxHintLevel, displayLevel + 1);
          logHintEvent("next_hint_clicked", nextLevel);
          if (effectiveVariant === "C_REFRESH") {
            void refreshHint(idx, nextLevel);
          } else if (hints.length > 1) {
            setHintLevels((prev) => ({
              ...prev,
              [idx]: nextLevel,
            }));
            logHintEvent("hint_level_reached", nextLevel);
          }
        }
      : undefined;

    return {
      tutorObj: coachTutorObj,
      hintLevel: displayLevel,
      onNextHint,
      onPracticeNext: handlePracticeNext,
      variantLabel: isDev ? hintVariant : undefined,
      compact: true,
    };
  };


  return (
    <div
      className="mentor-panel"
      data-testid="mentor-panel"
      data-mentor-intent={intent}
      data-advanced-mode={usingAdvancedMode ? "true" : "false"}
    >
      {/* HEADER */}
      <div className="mentor-panel__header">
        <div className="mentor-panel__header-text">
          <h3 className="mentor-panel__title">Your AI Mentor</h3>
          <p className="mentor-panel__subtitle">
            {usingAdvancedMode
              ? (MODE_DESCRIPTIONS[resolvedMode] ?? "")
              : STUDENT_SUBTITLES[intent]}
          </p>
        </div>
        {/* AI avatar */}
        <div className="mentor-panel__avatar">
          <div className="mentor-panel__avatar-glow" />
          <div className="mentor-panel__avatar-face">
            <div className="mentor-panel__avatar-eyes">
              <span className="mentor-panel__eye mentor-panel__eye--left" />
              <span className="mentor-panel__eye mentor-panel__eye--right" />
            </div>
            <div className="mentor-panel__avatar-mouth" />
          </div>
        </div>
      </div>
      {/* Student-first action chips. */}
      <div className="mentor-panel__modes" data-testid="mentor-student-actions">
        {STUDENT_ACTIONS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              userTouchedIntentRef.current = true;
              setIntent(key);
              setShowAdvancedModes(false);
            }}
            className={
              "mentor-panel__mode-chip" +
              (!usingAdvancedMode && key === intent
                ? " mentor-panel__mode-chip--active"
                : "")
            }
          >
            {label}
          </button>
        ))}
        {canUseAdvanced && (
          <button
            type="button"
            onClick={() => setShowAdvancedModes((prev) => !prev)}
            className={
              "mentor-panel__mode-chip" +
              (usingAdvancedMode ? " mentor-panel__mode-chip--active" : "")
            }
          >
            {usingAdvancedMode ? "Hide Advanced" : "Advanced"}
          </button>
        )}
        <button
          type="button"
          onClick={resetConversation}
          className="mentor-panel__mode-chip"
        >
          New chat
        </button>
      </div>
      {showSolutionImageUpload && (
        <div
          data-testid="mentor-check-cbse-helper"
          style={{
            marginTop: -4,
            marginBottom: 10,
            padding: 10,
            borderRadius: 14,
            border: "1px solid rgba(148,163,184,0.3)",
            background: "rgba(248,250,252,0.92)",
          }}
        >
          <div
            style={{
              marginBottom: 8,
              fontSize: 12,
              color: "#334155",
            }}
          >
            Tip: Paste your full working. I'll check it like CBSE and tell where marks may be cut.
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={handleImageFileChange}
            style={{ display: "none" }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="mentor-panel__mode-chip"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload solution photo
            </button>
            <div style={{ fontSize: 12, color: "#475569" }}>
              {attachedImage ? attachedImage.name : "Accepts JPG or PNG up to 3 MB."}
            </div>
            {attachedImage && (
              <button
                type="button"
                className="mentor-panel__mode-chip"
                onClick={() => clearAttachedImage()}
              >
                Remove
              </button>
            )}
          </div>
          {attachedImage?.previewUrl && (
            <div style={{ marginTop: 10 }}>
              <img
                src={attachedImage.previewUrl}
                alt="Solution preview"
                style={{
                  maxWidth: 180,
                  maxHeight: 180,
                  display: "block",
                  borderRadius: 12,
                  border: "1px solid rgba(148,163,184,0.35)",
                  objectFit: "cover",
                }}
              />
            </div>
          )}
          {imageErrorText && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#b91c1c",
              }}
            >
              {imageErrorText}
            </div>
          )}
        </div>
      )}

      {canUseAdvanced && showAdvancedModes && (
        <div className="mentor-panel__modes">
          {MODES.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setAdvancedMode(key);
                resetConversation();
              }}
              className={
                "mentor-panel__mode-chip" +
                (key === advancedMode
                  ? " mentor-panel__mode-chip--active"
                  : "")
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {/* SUBJECT + CHAPTER PICKER */}
      <div className="mentor-panel__subject-row">
        <div className="mentor-panel__subject-toggle">
          <button
            type="button"
            className={
              "mentor-panel__subject-chip" +
              (subject === "Maths" ? " mentor-panel__subject-chip--active" : "")
            }
            onClick={() => setSubject("Maths")}
          >
            Maths
          </button>
          <button
            type="button"
            className={
              "mentor-panel__subject-chip" +
              (subject === "Science"
                ? " mentor-panel__subject-chip--active"
                : "")
            }
            onClick={() => setSubject("Science")}
          >
            Science
          </button>
        </div>
        <select
          className="mentor-panel__chapter-select"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
        >
          {chaptersForSubject.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
      </div>
      {/* CONTEXT TAGS */}
      <div className="mentor-panel__context">
        <span className="mentor-panel__tag">
          {subject} · {effectivePageContext.grade}
        </span>
        {chapter && <span className="mentor-panel__tag">{chapter}</span>}
      </div>
      {/* CONVERSATION & PLAN PREVIEW */}
      <div className="mentor-panel__messages">
        {/* If there are any chat messages, render them as a conversation thread. */}
        {messages.length > 0 &&
          messages.map((msg, idx) => (
            (() => {
              const messageDiagram =
                msg.role === "assistant"
                  ? extractStructuredDiagram(msg.structured, `${msg.mode || "mentor"} diagram`)
                  : null;

              return (
                <div
                  key={idx}
                  className={
                    "mentor-panel__message " +
                    (msg.role === "user"
                      ? "mentor-panel__message--user"
                      : "mentor-panel__message--assistant")
                  }
                >
                  <div className="mentor-panel__bubble">
                    {sanitizeMentorOutput(msg.content).split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                  {messageDiagram ? (
                    <div style={{ marginTop: 10 }}>
                      <DiagramBlock diagram={messageDiagram} />
                    </div>
                  ) : null}
                  {msg.role === "assistant"
                    ? (() => {
                        const coachProps = buildCoachViewProps(msg, idx);
                        return coachProps ? <HumanGradeCoachView {...coachProps} /> : null;
                      })()
                    : null}
                </div>
              );
            })()
          ))}
        {/* If no conversation yet and we're in plan mode with a plan preview, show the plan preview bubble. */}
        {messages.length === 0 && planPreview && resolvedMode === "plan" && (
          <div className="mentor-panel__message mentor-panel__message--assistant">
            <div className="mentor-panel__bubble">
              {planPreview.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        )}
        {/* When there's no plan preview and no messages, display a friendly placeholder. */}
        {messages.length === 0 && !planPreview && !isLoading && (
          <div className="mentor-panel__message mentor-panel__message--assistant">
            <div className="mentor-panel__bubble mentor-panel__bubble--placeholder">
              I'll use your Maths &amp; Science targets and hours from the left to build a
              roadmap preview here. Once you're happy, tap <strong>"Show my study plan"</strong>
              to see the full schedule.
            </div>
          </div>
        )}
        {/* Loading indicator when waiting for the mentor to reply. */}
        {isLoading && (
          <div className="mentor-panel__message mentor-panel__message--assistant">
            <div className="mentor-panel__bubble mentor-panel__bubble--loading">
              Typing...
            </div>
          </div>
        )}
      </div>
      {/* INPUT AREA */}
      <div className="mentor-panel__input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={INPUT_PLACEHOLDERS[resolvedMode] ?? ""}
          /* Provide more space by default; let the textarea grow as needed. */
          rows={3}
          style={{ resize: "vertical" }}
        />
        <button
          type="button"
          className="mentor-panel__send-btn"
          onClick={handleSend}
          disabled={isLoading || (!input.trim() && !attachedImage)}
        >
          {/* Change the button label based on the mode.  In plan mode we update
              the plan; in other modes we simply send the query. */}
          {resolvedMode === "plan"
            ? isLoading
              ? "Updating..."
              : "Update plan"
            : isLoading
            ? "Sending..."
            : "Send"}
        </button>
      </div>
    </div>
  );
};
