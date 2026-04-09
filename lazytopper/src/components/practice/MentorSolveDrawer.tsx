/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DiagramBlock } from "../DiagramBlock";
import { HumanGradeCoachView } from "../mentor/HumanGradeCoachView";
import {
  navigateToPractice,
  type PracticeSectionFilter,
} from "../../navigation/practiceNavigation";
import {
  canUseMentorServer,
  isMentorNetworkFailure,
  markMentorServerUnavailable,
} from "../../services/mentorServerGate";
import type { StudentMentorIntent } from "../../types/studentMentorIntent";
import type { MentorStructured } from "../../types/mentor";
import {
  createMentorImageAttachment,
  getMentorImageErrorMessage,
  revokeMentorImagePreview,
  type MentorImageAttachment,
} from "../../utils/mentorImage";
import {
  extractMentorDiagramBlock,
  getMentorTutorObject,
  getMentorTutorText,
  parseMentorStructuredText,
} from "../../utils/mentorStructured";
import boardSteps_2025_26 from "../../data/boardSteps";
import type { SubjectKey } from "./practiceQuestionBuilder";

const PRACTICE_MENTOR_LABELS: Record<StudentMentorIntent, string> = {
  hint: "Hint / Next step",
  explain: "Explain",
  check_cbse: "Check my solution (CBSE)",
};
const PRACTICE_CBSE_IMAGE_ONLY_PROMPT =
  "Please check the attached handwritten solution photo in CBSE marking-scheme style.";

type MentorChatMsg = {
  role: "user" | "assistant";
  content: string;
  structured?: MentorStructured;
};
type MentorHybridReply = { text: string; structured?: MentorStructured };
const MENTOR_HYBRID_TIMEOUT_MS = 9_000;

export function MentorSolveDrawer(props: {
  open: boolean;
  onClose: () => void;
  seed: {
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
    practiceSectionFilter?: PracticeSectionFilter;
    suggestedPracticeIds?: string[];
    theoremFocus?: string[];
    recommendedDiagramType?: string;
  } | null;
  solveStyle: "socratic" | "board";
  grade: number;
  subjectTitle: string;
  topicKey: string;
}) {
  const { open, onClose, seed, solveStyle, grade, subjectTitle, topicKey } = props;
  const navigate = useNavigate();
  void grade;
  void topicKey;

  const getOfflineBoardSteps = () => {
    const subj = String(subjectTitle || "").trim() as any;
    const subjectKey = (subj === "Maths" || subj === "Science") ? subj : "Maths";

    const rawSection = String(seed?.section || "").trim().toUpperCase();

    const marks = Number((seed as any)?.marks);
    const inferredSection =
      marks === 1 ? "A" :
      marks === 2 ? "B" :
      marks === 3 ? "C" :
      marks === 4 ? "D" :
      marks >= 5 ? "E" : "C";

    const section =
      (rawSection === "A" || rawSection === "B" || rawSection === "C" || rawSection === "D" || rawSection === "E")
        ? rawSection
        : inferredSection;

    const tpl = (boardSteps_2025_26 as any)?.[subjectKey]?.[section];
    return { subjectKey, section, tpl };
  };

  const [messages, setMessages] = useState<MentorChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<MentorImageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachedImageRef = useRef<MentorImageAttachment | null>(null);
  const resolvedIntent: StudentMentorIntent =
    seed?.defaultIntent ?? (solveStyle === "board" ? "check_cbse" : "hint");
  const mentorTitle = PRACTICE_MENTOR_LABELS[resolvedIntent];
  const showSolutionImageUpload = resolvedIntent === "check_cbse";

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
    setErrorText(nextError);
  };

  const handleImageFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    event
  ) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setErrorText(null);
    try {
      const nextImage = await createMentorImageAttachment(file);
      setAttachedImage((prev) => {
        if (prev?.previewUrl && prev.previewUrl !== nextImage.previewUrl) {
          revokeMentorImagePreview(prev.previewUrl);
        }
        return nextImage;
      });
    } catch (error) {
      setErrorText(getMentorImageErrorMessage(error));
    }
  };

  const applyMentorContext = useCallback(
    (message: string) => {
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
    },
    [resolvedIntent, seed]
  );

  const parseMentorJson = (raw: string) => parseMentorStructuredText(raw) as any;

  const renderAssistantContent = useCallback((raw: string) => {
    const obj: any = parseMentorJson(raw);
    if (!obj) return raw;

    const tutorText = getMentorTutorText(obj);
    if (tutorText.trim()) return tutorText;

    if (obj.kind === "board_steps_ms") {
      const total = Number(obj.totalMarks) || undefined;
      const steps = Array.isArray(obj.steps) ? obj.steps : [];
      const lines: string[] = [];
      lines.push(`Board Steps + Marking Scheme${total ? ` (Total: ${total} marks)` : ""}`);
      steps.forEach((s: any, idx: number) => {
        const m = s && s.marks != null ? Number(s.marks) : 0;
        const text = s && s.text ? String(s.text) : "";
        lines.push("");
        lines.push(`${idx + 1}) [${m}] ${text}`);
        if (s?.whyThisGetsMarks) lines.push(`   - Why: ${String(s.whyThisGetsMarks)}`);
        if (s?.commonMistake) lines.push(`   - Common mistake: ${String(s.commonMistake)}`);
      });
      if (obj.finalAnswer) {
        lines.push("");
        lines.push(`Final Answer: ${String(obj.finalAnswer)}`);
      }
      return lines.join("\n");
    }

    const lines: string[] = [];
    if (obj.kind === "hint") lines.push("Hint:");
    if (obj.kind === "final") lines.push("Final:");
    lines.push(String(obj.tutor || ""));
    if (obj.mcq && typeof obj.mcq === "object") {
      const opts = ["A", "B", "C", "D"]
        .filter((k) => obj.mcq && obj.mcq[k])
        .map((k) => `${k}. ${obj.mcq[k]}`);
      if (opts.length) {
        lines.push("");
        lines.push(...opts);
      }
    }
    if (obj.answerFormat) {
      lines.push("");
      lines.push(`Answer format: ${obj.answerFormat}`);
    }
    if (obj.kind === "final") {
      if (obj.finalAnswer) {
        lines.push("");
        lines.push(`Final Answer: ${obj.finalAnswer}`);
      }
      if (obj.boardWriteup) {
        lines.push("");
        lines.push("Board Write-up:");
        lines.push(obj.boardWriteup);
      }
    }
    return lines.join("\n");
  }, []);

  const mentorStudentProfile =
    resolvedIntent === "check_cbse"
      ? "boards_focused"
      : resolvedIntent === "explain"
        ? "doubt_heavy"
        : "weak_foundation";
  const mentorHelpMode =
    resolvedIntent === "check_cbse"
      ? "proof_check"
      : resolvedIntent === "explain"
        ? "explain"
        : "next_step";

  const buildLocalMentorReply = useCallback(
    (history: MentorChatMsg[]): MentorHybridReply => {
      const lastUser = [...history].reverse().find((m) => m.role === "user");
      const studentText = String(lastUser?.content || "").trim();
      const familyLabel = String(seed?.questionFamilyLabel || seed?.title || "this question family");
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
            family_id: seed?.questionFamilyId,
            family_label: seed?.questionFamilyLabel || seed?.title,
            qtype_id: seed?.questionTypeId,
            theorem_focus: seed?.theoremFocus,
            confusion_type:
              resolvedIntent === "check_cbse"
                ? "board_answer_weakness"
                : resolvedIntent === "explain"
                  ? "concept_confusion"
                  : "next_step_unclear",
            help_mode: mentorHelpMode,
            student_profile: mentorStudentProfile,
            diagram_needed: Boolean(seed?.recommendedDiagramType),
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
                  total_marks: Number(seed?.marks || 3) || 3,
                  steps: [
                    { line: "Write the given data and target clearly.", marks: 1 },
                    { line: "State the correct theorem or criterion before the relation.", marks: 1 },
                    { line: "Close with the exact required conclusion line.", marks: 1 },
                  ],
                  deductions: [
                    {
                      reason: "Missing theorem/criterion line or weak conclusion.",
                      marks_lost: 1,
                    },
                  ],
                  examiner_note:
                    "Board marks depend on method order, not just the final result.",
                }
              : undefined,
          board_tip: {
            title: "Board-smart note",
            summary:
              resolvedIntent === "check_cbse"
                ? "Check the opening theorem line and the final conclusion line first."
                : "Keep the theorem choice visible before any ratio or algebra.",
            mark_cut_risk: "Jumping straight to the answer can lose method marks.",
            question_style: seed?.section ? `Section ${seed.section}` : "board-style question",
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
            chapter_step: seed?.chapterStep,
          },
          practice_next: {
            cta: "Practice this family",
            topic_key: topicKey,
            family_id: seed?.questionFamilyId,
            family_label: familyLabel,
            qtype_id: seed?.questionTypeId,
            chapter_step: seed?.chapterStep,
            reason: `Stay in ${familyLabel} for one more question before switching.`,
            section_filter: seed?.practiceSectionFilter,
            focus_question_ids: seed?.suggestedPracticeIds,
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
          diagramRequired: Boolean(seed?.recommendedDiagramType),
          diagramType: seed?.recommendedDiagramType,
        },
      };

      return {
        text: getMentorTutorText(structured) || "",
        structured,
      };
    },
    [mentorHelpMode, mentorStudentProfile, resolvedIntent, seed, topicKey]
  );

  const requestMentorHybrid = useCallback(
    async (history: MentorChatMsg[], imageForRequest?: MentorImageAttachment | null): Promise<MentorHybridReply> => {
      if (!seed) return { text: "" };
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
          resolvedIntent === "check_cbse"
            ? "board_steps_ms"
            : resolvedIntent === "explain"
              ? "learn_teach"
              : "solve_with_me";
        const lastUser = [...history].reverse().find((m) => m.role === "user");
        const body = {
          mode: modeApi,
          payload: {
            subject: subjectTitle,
            grade: Number(grade),
            topicKey,
            chapter: topicKey,
            selectedMode: modeApi,
            solveStyle: resolvedIntent === "check_cbse" ? "board" : "socratic",
            studentIntent: resolvedIntent,
            studentProfile: mentorStudentProfile,
            mentorHelpMode,
            questionText: String(seed.question || ""),
            studentQuestion: applyMentorContext(String(lastUser?.content || "").trim()),
            cardTitle: seed.title,
            cardSection: seed.section,
            marks: Number(seed.marks || 0) || undefined,
            questionFamilyId: seed.questionFamilyId,
            questionFamilyLabel: seed.questionFamilyLabel,
            questionTypeId: seed.questionTypeId,
            chapterStep: seed.chapterStep,
            practiceSectionFilter: seed.practiceSectionFilter,
            suggestedPracticeIds: seed.suggestedPracticeIds,
            theoremFocus: seed.theoremFocus,
            recommendedDiagramType: seed.recommendedDiagramType,
            ...(imageForRequest
              ? {
                  imageBase64: imageForRequest.base64,
                  imageMimeType: imageForRequest.mimeType,
                  imageName: imageForRequest.name,
                }
              : {}),
          },
          messages: history.map((m) => ({
            role: m.role,
            content: m.role === "user" ? applyMentorContext(m.content) : m.content,
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
        let payload: any = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          payload = {
            data: { text: raw },
            message: raw,
          };
        }
        if (!res.ok) {
          if (res.status >= 500) {
            markMentorServerUnavailable();
          }
          const errMsg =
            (typeof payload?.error === "string" && payload.error) ||
            (typeof payload?.message === "string" && payload.message) ||
            `Mentor request failed (${res.status}).`;
          throw new Error(errMsg);
        }
        const data = payload?.data || {};
        if (data && typeof data === "object") {
          if (data.structured && typeof data.structured === "object") {
            return {
              text:
                getMentorTutorText(data.structured as MentorStructured) ||
                (typeof data.text === "string" ? data.text.trim() : ""),
              structured: data.structured as MentorStructured,
            };
          }
          if (typeof data.text === "string" && data.text.trim()) {
            return {
              text: renderAssistantContent(data.text.trim()),
              structured: parseMentorStructuredText(data.text.trim()) || undefined,
            };
          }
        }
        if (typeof payload?.message === "string" && payload.message.trim()) {
          return {
            text: renderAssistantContent(payload.message.trim()),
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
    },
    [
      applyMentorContext,
      grade,
      mentorHelpMode,
      mentorStudentProfile,
      renderAssistantContent,
      resolvedIntent,
      seed,
      subjectTitle,
      topicKey,
    ]
  );

  const kickoff = useCallback(async () => {
    if (!seed) return;

    setErrorText(null);
    setLoading(true);
    setInput("");

    const firstUser: MentorChatMsg = {
      role: "user",
      content: `Problem (${seed.title}): ${seed.question}`,
    };

    setMessages([firstUser]);

    try {
      let reply: MentorHybridReply;
      try {
        reply = await requestMentorHybrid([firstUser], null);
      } catch (serverErr: any) {
        console.warn("Mentor server unavailable, using fallback", serverErr);
        reply = buildLocalMentorReply([firstUser]);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text || "...", structured: reply.structured },
      ]);
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : "Failed to load mentor response.");
    } finally {
      setLoading(false);
    }
  }, [seed, buildLocalMentorReply, requestMentorHybrid]);

  useEffect(() => {
    if (open) kickoff();
    else {
      setMessages([]);
      setInput("");
      setErrorText(null);
      setLoading(false);
      clearAttachedImage();
    }
  }, [open, seed, solveStyle, kickoff]);

  const sendStudentMessage = useCallback(async () => {
    const trimmed = input.trim();
    const imageForRequest = showSolutionImageUpload ? attachedImage : null;
    if ((!trimmed && !imageForRequest) || loading) return;

    setErrorText(null);
    const userContent =
      trimmed ||
      (imageForRequest
        ? "Uploaded a solution photo for CBSE checking."
        : PRACTICE_CBSE_IMAGE_ONLY_PROMPT);
    const nextHistory: MentorChatMsg[] = [...messages, { role: "user", content: userContent }];
    setMessages(nextHistory);
    setInput("");

    setLoading(true);
    let nextError: string | null = null;
    try {
      let reply: MentorHybridReply;
      try {
        reply = await requestMentorHybrid(nextHistory, imageForRequest);
      } catch (serverErr: any) {
        console.warn("Mentor server unavailable, using fallback", serverErr);
        reply = buildLocalMentorReply(nextHistory);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.text || "...", structured: reply.structured },
      ]);
    } catch (err) {
      nextError = err instanceof Error ? err.message : "Failed to send.";
      setErrorText(nextError);
    } finally {
      if (imageForRequest) clearAttachedImage(nextError);
      setLoading(false);
    }
  }, [
    attachedImage,
    buildLocalMentorReply,
    input,
    loading,
    messages,
    requestMentorHybrid,
    showSolutionImageUpload,
  ]);

  const handlePracticeNext = useCallback(
    (practiceNext: {
      family_label?: string;
      section_filter?: string;
      focus_question_ids?: string[];
    }) => {
      if (!seed) return;
      navigateToPractice(navigate, {
        grade: String(grade),
        subject: subjectTitle as SubjectKey,
        topicKey,
        topicName: topicKey,
        backPath: `${window.location.pathname}${window.location.search}`,
        backLabel: "Back to Practice",
        subtopicHint: String(practiceNext.family_label || seed.questionFamilyLabel || "").trim() || undefined,
        sectionFilter:
          (practiceNext.section_filter || seed.practiceSectionFilter || undefined) as
            | PracticeSectionFilter
            | undefined,
        focusBankIds:
          (Array.isArray(practiceNext.focus_question_ids) && practiceNext.focus_question_ids.length > 0
            ? practiceNext.focus_question_ids
            : seed.suggestedPracticeIds) || undefined,
        strictFocus: true,
        recommendedCount: 8,
        difficultyPreset: "All",
        source: "mentor_practice_next",
      });
    },
    [grade, navigate, seed, subjectTitle, topicKey]
  );

  if (!open || !seed) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        data-testid="practice-mentor-drawer"
        data-mentor-intent={resolvedIntent}
        style={{
          width: "min(920px, 100%)",
          maxHeight: "92vh",
          overflow: "hidden",
          borderRadius: 22,
          background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ display: "grid", gap: 2 }}>
            <div style={{ fontWeight: 950, fontSize: 14 }}>
              {mentorTitle} - {seed.title}
            </div>
            {seed.questionFamilyLabel ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
                Family: {seed.questionFamilyLabel}
              </div>
            ) : null}
            {seed.strategyContextHeader && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                Strategy context is being used for this question.
              </div>
            )}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                clearAttachedImage();
                void kickoff();
              }}
              disabled={loading}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              title="Reset"
            >
              Reset
            </button>
            <button
              onClick={onClose}
              style={{
                borderRadius: 999,
                padding: "6px 10px",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Close"
            >
              -
            </button>
          </div>
        </div>

        <div style={{ padding: 14, overflow: "auto" }}>
          {solveStyle === "board" && seed && (() => {
            const { subjectKey, section, tpl } = getOfflineBoardSteps();
            if (!tpl) return null;

            return (
              <div
                data-testid="practice-board-steps-panel"
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 16,
                  background: "rgba(59,130,246,0.06)",
                  border: "1px solid rgba(28,176,246,0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontWeight: 950 }}>
                    CBSE Board Steps (Offline) - {subjectKey} - Section {section}
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>
                    {tpl.marksTotal} marks template
                  </div>
                </div>

                {Array.isArray(tpl.notes) && tpl.notes.length > 0 && (
                  <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.9 }}>
                    {tpl.notes.map((n: string, i: number) => (
                      <div key={i}>- {n}</div>
                    ))}
                  </div>
                )}

                <div style={{ display: "grid", gap: 10 }}>
                  {tpl.steps.map((s: any) => (
                    <div
                      key={s.id}
                      style={{
                        padding: 10,
                        borderRadius: 14,
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                        <div style={{ fontWeight: 950 }}>{s.title}</div>
                        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>
                          ~{s.marks} marks
                        </div>
                      </div>
                      <ul style={{ margin: "8px 0 0 18px", fontSize: 13, lineHeight: 1.55 }}>
                        {s.whatToWrite.map((w: string, i: number) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                      {Array.isArray(s.commonMistakes) && s.commonMistakes.length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                          <div style={{ fontWeight: 900 }}>Common mistakes:</div>
                          <ul style={{ margin: "6px 0 0 18px" }}>
                            {s.commonMistakes.map((m: string, i: number) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Tip: You can still hit "Reset" to ask the mentor for a question-specific marking breakdown.
                </div>
              </div>
            );
          })()}
          <div style={{ fontWeight: 900, marginBottom: 8 }}>{seed.question}</div>

          {messages
            .filter((m) => m.role === "assistant")
            .map((m, i) => (
              (() => {
                const tutorObj = getMentorTutorObject(m.structured);
                const diagram = extractMentorDiagramBlock(
                  m.structured,
                  `${seed.questionFamilyLabel || seed.title} mentor figure`
                );
                const bodyText =
                  getMentorTutorText(m.structured) || renderAssistantContent(m.content);

                return (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gap: 10,
                      padding: 12,
                      borderRadius: 16,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {bodyText ? (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                          fontSize: 13,
                          lineHeight: 1.55,
                        }}
                      >
                        {bodyText}
                      </div>
                    ) : null}
                    {diagram ? <DiagramBlock diagram={diagram} /> : null}
                    {tutorObj ? (
                      <HumanGradeCoachView
                        tutorObj={tutorObj}
                        hintLevel={1}
                        compact
                        onPracticeNext={handlePracticeNext}
                      />
                    ) : null}
                  </div>
                );
              })()
            ))}

          {loading && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>Thinking...</div>}

          {errorText && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,0,0,0.06)",
                border: "1px solid rgba(255,0,0,0.18)",
                fontSize: 13,
              }}
            >
              {errorText}
            </div>
          )}

          {showSolutionImageUpload && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
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
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(255,255,255,0.03)",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Upload solution photo
                </button>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {attachedImage ? attachedImage.name : "Accepts JPG or PNG up to 3 MB."}
                </div>
                {attachedImage && (
                  <button
                    type="button"
                    onClick={() => clearAttachedImage()}
                    style={{
                      borderRadius: 999,
                      padding: "6px 10px",
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              {attachedImage?.previewUrl && (
                <img
                  src={attachedImage.previewUrl}
                  alt="Solution preview"
                  style={{
                    marginTop: 10,
                    maxWidth: 180,
                    maxHeight: 180,
                    display: "block",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    objectFit: "cover",
                  }}
                />
              )}
            </div>
          )}

          {solveStyle === "socratic" ? (
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"Answer mentor's question..."}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendStudentMessage();
                }}
                style={{
                  flex: 1,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "10px 12px",
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(255,255,255,0.03)",
                }}
                disabled={loading}
              />
              <button
                onClick={sendStudentMessage}
                disabled={loading || !input.trim()}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                  background: loading || !input.trim() ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
                }}
              >
                Send
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your working or add a short note for CBSE checking..."
                rows={4}
                style={{
                  width: "100%",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "10px 12px",
                  fontSize: 14,
                  outline: "none",
                  background: "rgba(255,255,255,0.03)",
                  color: "#fff",
                  resize: "vertical",
                }}
                disabled={loading}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={sendStudentMessage}
                  disabled={loading || (!input.trim() && !attachedImage)}
                  style={{
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.06)",
                    padding: "10px 12px",
                    fontSize: 14,
                    fontWeight: 900,
                    cursor:
                      loading || (!input.trim() && !attachedImage)
                        ? "not-allowed"
                        : "pointer",
                    background:
                      loading || (!input.trim() && !attachedImage)
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.03)",
                  }}
                >
                  {loading ? "Sending..." : "Send for CBSE check"}
                </button>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Tip: Copy this step-pattern in your answer sheet - that's how marks are awarded.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
