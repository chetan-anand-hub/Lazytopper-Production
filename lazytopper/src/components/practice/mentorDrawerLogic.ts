import type { StudentMentorIntent } from "../../types/studentMentorIntent";
import type { MentorStructured } from "../../types/mentor";
import {
  canUseMentorServer,
  isMentorNetworkFailure,
  markMentorServerUnavailable,
} from "../../services/mentorServerGate";
import {
  getMentorTutorText,
  parseMentorStructuredText,
} from "../../utils/mentorStructured";

export type MentorChatMsg = {
  role: "user" | "assistant";
  content: string;
  structured?: MentorStructured;
};

export type MentorHybridReply = { text: string; structured?: MentorStructured };

export const MENTOR_HYBRID_TIMEOUT_MS = 9_000;

export const PRACTICE_MENTOR_LABELS: Record<StudentMentorIntent, string> = {
  hint: "Hint / Next step",
  explain: "Explain",
  check_cbse: "Check my solution (CBSE)",
};

export const PRACTICE_CBSE_IMAGE_ONLY_PROMPT =
  "Please check the attached handwritten solution photo in CBSE marking-scheme style.";

export interface MentorSeedConfig {
  title: string;
  questionId: string;
  question: string;
  marks?: number;
  section?: string;
  defaultIntent?: StudentMentorIntent;
  strategyContextHeader?: string;
  rubricContextHeader?: string;
  questionFamilyId?: string;
  questionFamilyLabel?: string;
  questionTypeId?: string;
  chapterStep?: string;
  practiceSectionFilter?: string;
  suggestedPracticeIds?: string[];
  theoremFocus?: string[];
  recommendedDiagramType?: string;
}

export function applyMentorContext(
  message: string,
  seed: MentorSeedConfig | null,
  resolvedIntent: StudentMentorIntent
): string {
  const contextHeader = String(seed?.strategyContextHeader || "").trim();
  const rubricHeader =
    resolvedIntent === "check_cbse"
      ? String(seed?.rubricContextHeader || "").trim()
      : "";
  const headerParts = [contextHeader, rubricHeader].filter(Boolean);
  const trimmedMessage = String(message || "").trim();
  if (headerParts.length === 0) return trimmedMessage;
  const fullHeader = headerParts.join("\n\n");
  if (!trimmedMessage) return fullHeader;
  return `${fullHeader}\n\n${trimmedMessage}`;
}

export function buildLocalMentorReply(
  history: MentorChatMsg[],
  resolvedIntent: StudentMentorIntent,
  seed: MentorSeedConfig | null,
  topicKey: string,
  mentorHelpMode: string,
  mentorStudentProfile: string,
): MentorHybridReply {
  if (!seed) return { text: "" };
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const studentText = String(lastUser?.content || "").trim();
  const familyLabel = String(seed.questionFamilyLabel || seed.title || "this question family");
  const structured: MentorStructured = {
    kind: "tutor",
    tutor: {
      text:
        resolvedIntent === "check_cbse"
          ? "I will check the structure first, then point to the exact board-risk line."
          : resolvedIntent === "explain"
            ? `Let's clarify the idea behind ${familyLabel} before you solve the next one.`
            : studentText
              ? `Good attempt. I will keep the next move inside ${familyLabel}.`
              : `Let's start with the first safe step for ${familyLabel}.`,
      diagnosis: {
        chapter: topicKey,
        family_id: seed.questionFamilyId,
        family_label: seed.questionFamilyLabel || seed.title,
        qtype_id: seed.questionTypeId,
        theorem_focus: seed.theoremFocus,
        confusion_type:
          resolvedIntent === "check_cbse"
            ? "board_answer_weakness"
            : resolvedIntent === "explain"
              ? "concept_confusion"
              : "next_step_unclear",
        help_mode: mentorHelpMode,
        student_profile: mentorStudentProfile,
        diagram_needed: Boolean(seed.recommendedDiagramType),
        summary_line:
          resolvedIntent === "check_cbse"
            ? "Check theorem line, order, and final conclusion before rewriting."
            : resolvedIntent === "explain"
              ? "Clarify the rule first, then use one short example."
              : "Take one next step, not the whole solution at once.",
      },
      hint_ladder:
        resolvedIntent === "check_cbse"
          ? undefined
          : {
              level: 1,
              hint:
                studentText ||
                `Name the theorem or relation that controls ${familyLabel} before calculating.`,
              next_action: "Write one justified line, then ask for the next step.",
            },
      board_steps_ms:
        resolvedIntent === "check_cbse"
          ? {
              total_marks: Number(seed.marks || 3) || 3,
              steps: [
                { line: "Write the given data and target clearly.", marks: 1 },
                { line: "State the correct theorem or criterion before the relation.", marks: 1 },
                { line: "Close with the exact required conclusion line.", marks: 1 },
              ],
              deductions: [
                { reason: "Missing theorem/criterion line or weak conclusion.", marks_lost: 1 },
              ],
              examiner_note: "Board marks depend on method order, not just the final result.",
            }
          : undefined,
      board_tip: {
        title: "Board-smart note",
        summary:
          resolvedIntent === "check_cbse"
            ? "Check the opening theorem line and the final conclusion line first."
            : "Keep the theorem choice visible before any ratio or algebra.",
        mark_cut_risk: "Jumping straight to the answer can lose method marks.",
        question_style: seed.section ? `Section ${seed.section}` : "board-style question",
      },
      common_mistake: {
        title: "Common mistake",
        summary:
          resolvedIntent === "check_cbse"
            ? "The maths can be right but the board-writing order can still lose marks."
            : "Students often start calculating before identifying the correct family.",
        fix:
          resolvedIntent === "check_cbse"
            ? "Rewrite the theorem line, then the justified step, then the conclusion."
            : "Say the theorem/criterion first, then write one linked step.",
        mark_risk: "Weak structure reduces scoring confidence.",
      },
      next: {
        micro_drill:
          resolvedIntent === "check_cbse"
            ? "Rewrite just the first two proof lines cleanly."
            : `Do one more ${familyLabel} question with the same trigger.`,
        revision_hook: "Keep the criterion and conclusion line together in revision.",
        chapter_step: seed.chapterStep,
      },
      practice_next: {
        cta: "Practice this family",
        topic_key: topicKey,
        family_id: seed.questionFamilyId,
        family_label: familyLabel,
        qtype_id: seed.questionTypeId,
        chapter_step: seed.chapterStep,
        reason: `Stay in ${familyLabel} for one more question before switching.`,
        section_filter: seed.practiceSectionFilter,
        focus_question_ids: seed.suggestedPracticeIds,
      },
      adaptive_style: {
        profile: mentorStudentProfile,
        tone:
          mentorStudentProfile === "boards_focused"
            ? "examiner-aware"
            : mentorStudentProfile === "doubt_heavy"
              ? "reason-first"
              : "stepwise and calm",
        depth:
          mentorStudentProfile === "boards_focused"
            ? "mark-safe"
            : mentorStudentProfile === "doubt_heavy"
              ? "explain why"
              : "one step at a time",
        pacing: mentorStudentProfile === "boards_focused" ? "direct" : "scaffolded",
        rationale: "Keep the next move obvious and chapter-specific.",
      },
      diagramRequired: Boolean(seed.recommendedDiagramType),
      diagramType: seed.recommendedDiagramType,
    },
  };

  return {
    text: getMentorTutorText(structured) || "",
    structured,
  };
}

export async function requestMentorHybrid(args: {
  history: MentorChatMsg[];
  seed: MentorSeedConfig;
  resolvedIntent: StudentMentorIntent;
  mentorStudentProfile: string;
  mentorHelpMode: string;
  subjectTitle: string;
  grade: number;
  topicKey: string;
  imageBase64?: string;
  imageMimeType?: string;
  imageName?: string;
  renderAssistantContent: (raw: string) => string;
}): Promise<MentorHybridReply> {
  if (!canUseMentorServer()) {
    throw new Error("Mentor server temporarily unavailable.");
  }
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, MENTOR_HYBRID_TIMEOUT_MS);
  try {
    const modeApi =
      args.resolvedIntent === "check_cbse"
        ? "board_steps_ms"
        : args.resolvedIntent === "explain"
          ? "learn_teach"
          : "solve_with_me";
    const lastUser = [...args.history].reverse().find((m) => m.role === "user");
    const body = {
      mode: modeApi,
      payload: {
        subject: args.subjectTitle,
        grade: args.grade,
        topicKey: args.topicKey,
        chapter: args.topicKey,
        selectedMode: modeApi,
        solveStyle: args.resolvedIntent === "check_cbse" ? "board" : "socratic",
        studentIntent: args.resolvedIntent,
        studentProfile: args.mentorStudentProfile,
        mentorHelpMode: args.mentorHelpMode,
        questionText: String(args.seed.question || ""),
        studentQuestion: applyMentorContext(String(lastUser?.content || "").trim(), args.seed, args.resolvedIntent),
        cardTitle: args.seed.title,
        cardSection: args.seed.section,
        marks: Number(args.seed.marks || 0) || undefined,
        questionFamilyId: args.seed.questionFamilyId,
        questionFamilyLabel: args.seed.questionFamilyLabel,
        questionTypeId: args.seed.questionTypeId,
        chapterStep: args.seed.chapterStep,
        practiceSectionFilter: args.seed.practiceSectionFilter,
        suggestedPracticeIds: args.seed.suggestedPracticeIds,
        theoremFocus: args.seed.theoremFocus,
        recommendedDiagramType: args.seed.recommendedDiagramType,
        ...(args.imageBase64
          ? {
              imageBase64: args.imageBase64,
              imageMimeType: args.imageMimeType,
              imageName: args.imageName,
            }
          : {}),
      },
      messages: args.history.map((m) => ({
        role: m.role,
        content: m.role === "user" ? applyMentorContext(m.content, args.seed, args.resolvedIntent) : m.content,
      })),
    };
    let res: Response;
    try {
      res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (isMentorNetworkFailure(error)) {
        markMentorServerUnavailable();
      }
      throw error;
    }
    const raw = await res.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      payload = { data: { text: raw }, message: raw };
    }
    if (!res.ok) {
      if (res.status >= 500) markMentorServerUnavailable();
      const errMsg =
        (typeof payload?.error === "string" && payload.error) ||
        (typeof payload?.message === "string" && payload.message) ||
        `Mentor request failed (${res.status}).`;
      throw new Error(errMsg);
    }
    const rawData = payload?.data || {};
    const data = rawData as Record<string, unknown>;
    if (data && typeof data === "object") {
      if (data.structured && typeof data.structured === "object") {
        return {
          text:
            getMentorTutorText(data.structured as MentorStructured) ||
            (typeof data.text === "string" ? (data.text as string).trim() : ""),
          structured: data.structured as MentorStructured,
        };
      }
      if (typeof data.text === "string" && (data.text as string).trim()) {
        return {
          text: args.renderAssistantContent((data.text as string).trim()),
          structured: parseMentorStructuredText((data.text as string).trim()) || undefined,
        };
      }
    }
    if (typeof payload?.message === "string" && payload.message.trim()) {
      return {
        text: args.renderAssistantContent(payload.message.trim()),
        structured: parseMentorStructuredText(payload.message.trim()) || undefined,
      };
    }
    throw new Error("Mentor response incomplete. Please retry.");
  } catch (err) {
    if (timedOut) {
      markMentorServerUnavailable();
      throw new Error("Mentor request timed out.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
