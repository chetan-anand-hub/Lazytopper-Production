/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DiagramBlock } from "../DiagramBlock";
import { HumanGradeCoachView } from "../mentor/HumanGradeCoachView";
import {
  navigateToPractice,
  type PracticeSectionFilter,
} from "../../navigation/practiceNavigation";
import type { StudentMentorIntent } from "../../types/studentMentorIntent";
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
import {
  type MentorChatMsg,
  type MentorHybridReply,
  type MentorSeedConfig,
  PRACTICE_MENTOR_LABELS,
  PRACTICE_CBSE_IMAGE_ONLY_PROMPT,
  buildLocalMentorReply,
  requestMentorHybrid,
} from "./mentorDrawerLogic";

export function MentorSolveDrawer(props: {
  open: boolean;
  onClose: () => void;
  seed: MentorSeedConfig | null;
  solveStyle: "socratic" | "board";
  grade: number;
  subjectTitle: string;
  topicKey: string;
}) {
  const { open, onClose, seed, solveStyle, grade, subjectTitle, topicKey } = props;
  const navigate = useNavigate();

  const resolvedIntent: StudentMentorIntent =
    seed?.defaultIntent ?? (solveStyle === "board" ? "check_cbse" : "hint");
  const mentorTitle = PRACTICE_MENTOR_LABELS[resolvedIntent];
  const showSolutionImageUpload = resolvedIntent === "check_cbse";

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

  const [messages, setMessages] = useState<MentorChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<MentorImageAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const attachedImageRef = useRef<MentorImageAttachment | null>(null);

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

  const handleImageFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
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

  const renderAssistantContent = useCallback((raw: string) => {
    const obj: any = parseMentorStructuredText(raw);
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
        lines.push("", `${idx + 1}) [${m}] ${text}`);
        if (s?.whyThisGetsMarks) lines.push(`   - Why: ${String(s.whyThisGetsMarks)}`);
        if (s?.commonMistake) lines.push(`   - Common mistake: ${String(s.commonMistake)}`);
      });
      if (obj.finalAnswer) lines.push("", `Final Answer: ${String(obj.finalAnswer)}`);
      return lines.join("\n");
    }
    const lines: string[] = [];
    if (obj.kind === "hint") lines.push("Hint:");
    if (obj.kind === "final") lines.push("Final:");
    lines.push(String(obj.tutor || ""));
    if (obj.mcq && typeof obj.mcq === "object") {
      const opts = ["A", "B", "C", "D"].filter((k) => obj.mcq && obj.mcq[k]).map((k) => `${k}. ${obj.mcq[k]}`);
      if (opts.length) { lines.push(""); lines.push(...opts); }
    }
    if (obj.answerFormat) { lines.push(""); lines.push(`Answer format: ${obj.answerFormat}`); }
    if (obj.kind === "final") {
      if (obj.finalAnswer) { lines.push(""); lines.push(`Final Answer: ${obj.finalAnswer}`); }
      if (obj.boardWriteup) { lines.push(""); lines.push("Board Write-up:"); lines.push(obj.boardWriteup); }
    }
    return lines.join("\n");
  }, []);

  const doMentorRequest = useCallback(
    async (history: MentorChatMsg[], imageForRequest?: MentorImageAttachment | null): Promise<MentorHybridReply> => {
      if (!seed) return { text: "" };
      return requestMentorHybrid({
        history,
        seed,
        resolvedIntent,
        mentorStudentProfile,
        mentorHelpMode,
        subjectTitle,
        grade,
        topicKey,
        imageBase64: imageForRequest?.base64,
        imageMimeType: imageForRequest?.mimeType,
        imageName: imageForRequest?.name,
        renderAssistantContent,
      });
    },
    [grade, mentorHelpMode, mentorStudentProfile, renderAssistantContent, resolvedIntent, seed, subjectTitle, topicKey]
  );

  const doLocalFallback = useCallback(
    (history: MentorChatMsg[]): MentorHybridReply => {
      return buildLocalMentorReply(history, resolvedIntent, seed, topicKey, mentorHelpMode, mentorStudentProfile);
    },
    [mentorHelpMode, mentorStudentProfile, resolvedIntent, seed, topicKey]
  );

  const kickoff = useCallback(async () => {
    if (!seed) return;
    setErrorText(null);
    setLoading(true);
    setInput("");
    const firstUser: MentorChatMsg = { role: "user", content: `Problem (${seed.title}): ${seed.question}` };
    setMessages([firstUser]);
    try {
      let reply: MentorHybridReply;
      try {
        reply = await doMentorRequest([firstUser], null);
      } catch {
        reply = doLocalFallback([firstUser]);
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
  }, [seed, doMentorRequest, doLocalFallback]);

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
    const userContent = trimmed || (imageForRequest ? "Uploaded a solution photo for CBSE checking." : PRACTICE_CBSE_IMAGE_ONLY_PROMPT);
    const nextHistory: MentorChatMsg[] = [...messages, { role: "user", content: userContent }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    let nextError: string | null = null;
    try {
      let reply: MentorHybridReply;
      try {
        reply = await doMentorRequest(nextHistory, imageForRequest);
      } catch {
        reply = doLocalFallback(nextHistory);
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
  }, [attachedImage, doLocalFallback, doMentorRequest, input, loading, messages, showSolutionImageUpload]);

  const handlePracticeNext = useCallback(
    (practiceNext: { family_label?: string; section_filter?: string; focus_question_ids?: string[] }) => {
      if (!seed) return;
      navigateToPractice(navigate, {
        grade: String(grade),
        subject: subjectTitle as SubjectKey,
        topicKey, topicName: topicKey,
        backPath: `${window.location.pathname}${window.location.search}`,
        backLabel: "Back to Practice",
        subtopicHint: String(practiceNext.family_label || seed.questionFamilyLabel || "").trim() || undefined,
        sectionFilter: (practiceNext.section_filter || seed.practiceSectionFilter || undefined) as PracticeSectionFilter | undefined,
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

  const getOfflineBoardSteps = () => {
    const subj = String(subjectTitle || "").trim() as any;
    const subjectKey = (subj === "Maths" || subj === "Science") ? subj : "Maths";
    const rawSection = String(seed?.section || "").trim().toUpperCase();
    const marks = Number((seed as any)?.marks);
    const inferredSection = marks === 1 ? "A" : marks === 2 ? "B" : marks === 3 ? "C" : marks === 4 ? "D" : marks >= 5 ? "E" : "C";
    const section =
      (rawSection === "A" || rawSection === "B" || rawSection === "C" || rawSection === "D" || rawSection === "E")
        ? rawSection : inferredSection;
    const tpl = (boardSteps_2025_26 as any)?.[subjectKey]?.[section];
    return { subjectKey, section, tpl };
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 60, display: "flex", alignItems: "flex-end",
        justifyContent: "center", padding: 16,
      }}
      onClick={onClose}
    >
      <div
        data-testid="practice-mentor-drawer"
        data-mentor-intent={resolvedIntent}
        style={{
          width: "min(920px, 100%)", maxHeight: "92vh", overflow: "hidden",
          borderRadius: 22, background: "rgba(255,255,255,0.92)",
          border: "1px solid rgba(255,255,255,0.35)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DrawerHeader
          mentorTitle={mentorTitle}
          seed={seed}
          loading={loading}
          onReset={() => { clearAttachedImage(); void kickoff(); }}
          onClose={onClose}
        />

        <div style={{ padding: 14, overflow: "auto" }}>
          {solveStyle === "board" && <OfflineBoardStepsPanel getSteps={getOfflineBoardSteps} />}
          <div style={{ fontWeight: 900, marginBottom: 8 }}>{seed.question}</div>

          {messages
            .filter((m) => m.role === "assistant")
            .map((m, i) => (
              <MentorAssistantMessage
                key={i}
                msg={m}
                seed={seed}
                renderAssistantContent={renderAssistantContent}
                onPracticeNext={handlePracticeNext}
              />
            ))}

          {loading && <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>Thinking...</div>}
          {errorText && (
            <div style={{
              marginTop: 10, padding: 10, borderRadius: 12,
              background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.18)", fontSize: 13,
            }}>{errorText}</div>
          )}

          {showSolutionImageUpload && (
            <ImageUploadPanel
              fileInputRef={fileInputRef}
              attachedImage={attachedImage}
              onImageChange={handleImageFileChange}
              onRemoveImage={() => clearAttachedImage()}
            />
          )}

          {solveStyle === "socratic" ? (
            <SocraticInput input={input} loading={loading} onSetInput={setInput} onSend={sendStudentMessage} />
          ) : (
            <BoardCheckInput
              input={input} loading={loading} attachedImage={attachedImage}
              onSetInput={setInput} onSend={sendStudentMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DrawerHeader({ mentorTitle, seed, loading, onReset, onClose }: {
  mentorTitle: string; seed: MentorSeedConfig; loading: boolean;
  onReset: () => void; onClose: () => void;
}) {
  return (
    <div style={{
      padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.08)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <div style={{ display: "grid", gap: 2 }}>
        <div style={{ fontWeight: 950, fontSize: 14 }}>{mentorTitle} - {seed.title}</div>
        {seed.questionFamilyLabel && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>Family: {seed.questionFamilyLabel}</div>
        )}
        {seed.strategyContextHeader && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Strategy context is being used for this question.</div>
        )}
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button onClick={onReset} disabled={loading} style={{
          borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)", fontWeight: 900, cursor: loading ? "not-allowed" : "pointer",
        }} title="Reset">Reset</button>
        <button onClick={onClose} style={{
          borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)", fontWeight: 900, cursor: "pointer",
        }} title="Close">-</button>
      </div>
    </div>
  );
}

function OfflineBoardStepsPanel({ getSteps }: { getSteps: () => { subjectKey: string; section: string; tpl: any } }) {
  const { subjectKey, section, tpl } = getSteps();
  if (!tpl) return null;
  return (
    <div data-testid="practice-board-steps-panel" style={{
      marginBottom: 12, padding: 12, borderRadius: 16,
      background: "rgba(59,130,246,0.06)", border: "1px solid rgba(28,176,246,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ fontWeight: 950 }}>CBSE Board Steps (Offline) - {subjectKey} - Section {section}</div>
        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.8 }}>{tpl.marksTotal} marks template</div>
      </div>
      {Array.isArray(tpl.notes) && tpl.notes.length > 0 && (
        <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.9 }}>
          {tpl.notes.map((n: string, i: number) => <div key={i}>- {n}</div>)}
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {tpl.steps.map((s: any) => (
          <div key={s.id} style={{
            padding: 10, borderRadius: 14, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <div style={{ fontWeight: 950 }}>{s.title}</div>
              <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.75 }}>~{s.marks} marks</div>
            </div>
            <ul style={{ margin: "8px 0 0 18px", fontSize: 13, lineHeight: 1.55 }}>
              {s.whatToWrite.map((w: string, i: number) => <li key={i}>{w}</li>)}
            </ul>
            {Array.isArray(s.commonMistakes) && s.commonMistakes.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                <div style={{ fontWeight: 900 }}>Common mistakes:</div>
                <ul style={{ margin: "6px 0 0 18px" }}>
                  {s.commonMistakes.map((m: string, i: number) => <li key={i}>{m}</li>)}
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
}

function MentorAssistantMessage({ msg, seed, renderAssistantContent, onPracticeNext }: {
  msg: MentorChatMsg; seed: MentorSeedConfig;
  renderAssistantContent: (raw: string) => string;
  onPracticeNext: (p: any) => void;
}) {
  const tutorObj = getMentorTutorObject(msg.structured);
  const diagram = extractMentorDiagramBlock(msg.structured, `${seed.questionFamilyLabel || seed.title} mentor figure`);
  const bodyText = getMentorTutorText(msg.structured) || renderAssistantContent(msg.content);
  return (
    <div style={{
      display: "grid", gap: 10, padding: 12, borderRadius: 16,
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {bodyText && (
        <div style={{
          whiteSpace: "pre-wrap",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontSize: 13, lineHeight: 1.55,
        }}>{bodyText}</div>
      )}
      {diagram && <DiagramBlock diagram={diagram} />}
      {tutorObj && <HumanGradeCoachView tutorObj={tutorObj} hintLevel={1} compact onPracticeNext={onPracticeNext} />}
    </div>
  );
}

function ImageUploadPanel({ fileInputRef, attachedImage, onImageChange, onRemoveImage }: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  attachedImage: MentorImageAttachment | null;
  onImageChange: React.ChangeEventHandler<HTMLInputElement>;
  onRemoveImage: () => void;
}) {
  return (
    <div style={{
      marginTop: 12, padding: 12, borderRadius: 14,
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={onImageChange} style={{ display: "none" }} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={() => fileInputRef.current?.click()} style={{
          borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)", fontWeight: 900, cursor: "pointer",
        }}>Upload solution photo</button>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{attachedImage ? attachedImage.name : "Accepts JPG or PNG up to 3 MB."}</div>
        {attachedImage && (
          <button type="button" onClick={onRemoveImage} style={{
            borderRadius: 999, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)", fontWeight: 900, cursor: "pointer",
          }}>Remove</button>
        )}
      </div>
      {attachedImage?.previewUrl && (
        <img src={attachedImage.previewUrl} alt="Solution preview" style={{
          marginTop: 10, maxWidth: 180, maxHeight: 180, display: "block",
          borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", objectFit: "cover",
        }} />
      )}
    </div>
  );
}

function SocraticInput({ input, loading, onSetInput, onSend }: {
  input: string; loading: boolean; onSetInput: (v: string) => void; onSend: () => void;
}) {
  return (
    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
      <input value={input} onChange={(e) => onSetInput(e.target.value)}
        placeholder="Answer mentor's question..."
        onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
        style={{
          flex: 1, borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 12px", fontSize: 14, outline: "none", background: "rgba(255,255,255,0.03)",
        }} disabled={loading} />
      <button onClick={onSend} disabled={loading || !input.trim()} style={{
        borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px",
        fontSize: 14, fontWeight: 900, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
        background: loading || !input.trim() ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
      }}>Send</button>
    </div>
  );
}

function BoardCheckInput({ input, loading, attachedImage, onSetInput, onSend }: {
  input: string; loading: boolean; attachedImage: MentorImageAttachment | null;
  onSetInput: (v: string) => void; onSend: () => void;
}) {
  return (
    <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
      <textarea value={input} onChange={(e) => onSetInput(e.target.value)}
        placeholder="Paste your working or add a short note for CBSE checking..." rows={4}
        style={{
          width: "100%", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)",
          padding: "10px 12px", fontSize: 14, outline: "none",
          background: "rgba(255,255,255,0.03)", color: "#fff", resize: "vertical",
        }} disabled={loading} />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={onSend} disabled={loading || (!input.trim() && !attachedImage)} style={{
          borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px",
          fontSize: 14, fontWeight: 900,
          cursor: loading || (!input.trim() && !attachedImage) ? "not-allowed" : "pointer",
          background: loading || (!input.trim() && !attachedImage) ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        }}>{loading ? "Sending..." : "Send for CBSE check"}</button>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          Tip: Copy this step-pattern in your answer sheet - that's how marks are awarded.
        </div>
      </div>
    </div>
  );
}
