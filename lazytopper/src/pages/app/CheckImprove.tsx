import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import {
  checkSolutionImage,
  detectQuestion,
  gradeWorksheet,
  type CheckSolutionResponse,
  type CheckSolutionAnnotatedStep,
  type DetectedQuestion,
  type WorksheetGradeResponse,
  type WorksheetQuestionGrade,
} from "../../ai/aiClient";
import { useAuth } from "../../context/AuthContext";
import { recordMistake } from "../../services/mistakeIntelligence";
import { recordAttempt, type DetectionOverrideLog } from "../../services/practiceInsights";
import { desktopTopicsBySubject } from "../../lib/desktop/topics";
import type { DesktopSubject } from "../../lib/desktop/navigation";
import {
  buildConfirmedDetection,
  clampDetectedMarks,
  SHOW_DETECTION_META,
  type ConfirmedDetection,
} from "../../utils/checkImproveDetection";

// Persistence (entry building + policy + dedup + the weak-area bridge) now lives
// behind the single front door `recordMistake`. The old local buildMobileLogEntry
// (a hand-kept mirror of desktop's buildLogEntry) was removed so the two surfaces
// can no longer diverge.
//
// Claim 2: the student no longer picks marks/subject/topic — the grader determines
// them from the question (`detectMarks: true`). We pass the canonical topics.ts
// vocabulary so the detected topic is a real key (was a free-text dropdown that
// produced non-canonical labels like "Light" — exactly the keys Fix A had to alias).
const CANONICAL_TOPIC_VOCAB = [
  ...desktopTopicsBySubject("Maths"),
  ...desktopTopicsBySubject("Science"),
].map((t) => ({ slug: t.slug, name: t.name, subject: t.subject }));

type View = "upload" | "graded";
type Tab  = "upload" | "type";

/* ──────────── multi-question (Check & Improve) helpers ──────────── */
// Mirror of the desktop helpers (kept inline — this PR is scoped to exactly these
// page files + the detect test, so no shared module is added).

const CI_MULTI_SEQ_KEY = "lt:ci-multi-seq";
function nextCiMultiSequence(): number {
  try {
    const n = parseInt(localStorage.getItem(CI_MULTI_SEQ_KEY) || "0", 10);
    const next = (Number.isFinite(n) && n > 0 ? n : 0) + 1;
    localStorage.setItem(CI_MULTI_SEQ_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}
function ciTopicToken(slug: string): string {
  const t = String(slug || "").replace(/[^a-z]/gi, "").slice(0, 4).toUpperCase();
  return t || "MIX";
}
function buildCiSessionCode(subject: string, topicSlug: string): string {
  const s = /sci/i.test(String(subject || "")) ? "S" : "M";
  return `CI-${s}-${ciTopicToken(topicSlug)}-${String(nextCiMultiSequence()).padStart(2, "0")}`;
}
function multiQuestionToCsr(g: WorksheetQuestionGrade): CheckSolutionResponse {
  return {
    ok: true,
    totalMarks: Number(g.totalMarks) || 0,
    marksAwarded: Number(g.marksAwarded) || 0,
    percentage: Number(g.percentage) || 0,
    annotatedSteps: g.annotatedSteps ?? [],
    mistakeSummary: g.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: g.teacherNote ?? "",
  };
}

function detectionSourceLabel(
  source: "stated" | "inferred" | "fallback" | "user" | null,
): string {
  switch (source) {
    case "stated": return "read from the question";
    case "inferred": return "estimated from the question";
    case "user": return "you set this";
    default: return "";
  }
}

export default function CheckImprove() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const qFileRef = useRef<HTMLInputElement>(null);

  const [view, setView]               = useState<View>("upload");
  const [tab, setTab]                 = useState<Tab>("upload");
  const [fileBase64, setFileBase64]   = useState<string | null>(null);
  const [fileMime, setFileMime]       = useState<string>("image/jpeg");
  const [fileLoaded, setFileLoaded]   = useState(false);
  const [textAnswer, setTextAnswer]   = useState("");

  // Question input (type/paste OR a photo of the QUESTION) + detect-then-confirm.
  const [question, setQuestion]       = useState("");
  const [questionTab, setQuestionTab] = useState<"type" | "upload">("type");
  const [qImageBase64, setQImageBase64] = useState<string | null>(null);
  const [qImageMime, setQImageMime]   = useState<string>("image/jpeg");
  const [qImageName, setQImageName]   = useState<string>("");
  const [detecting, setDetecting]     = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detected, setDetected]       = useState<ConfirmedDetection | null>(null);
  const [confirmed, setConfirmed]     = useState<ConfirmedDetection | null>(null);
  const [editing, setEditing]         = useState(false);

  const [grading, setGrading]         = useState(false);
  const [gradeResult, setGradeResult] = useState<CheckSolutionResponse | null>(null);
  const [gradeError, setGradeError]   = useState<string | null>(null);
  const [saved, setSaved]             = useState<"idle" | "saved" | "no-user">("idle");

  // ── multi-question detect (additive; single-question path untouched) ──
  const [detectedQuestions, setDetectedQuestions] = useState<DetectedQuestion[] | null>(null);
  const [wsResult, setWsResult] = useState<WorksheetGradeResponse | null>(null);
  const [ciCode, setCiCode]     = useState<string | null>(null);

  const hasContent = tab === "upload" ? fileLoaded : textAnswer.trim().length > 10;
  const hasQuestion = questionTab === "type" ? question.trim().length > 0 : Boolean(qImageBase64);
  const isMultiQuestion = Boolean(detectedQuestions && detectedQuestions.length > 1);
  // Multi-question grading requires an uploaded answer sheet (image or PDF).
  const canGrade   = Boolean(confirmed) && (isMultiQuestion ? fileLoaded : hasContent);

  function handleFileChange(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [prefix, b64] = result.split(",");
      const mime = prefix.match(/:(.*?);/)?.[1] || "image/jpeg";
      setFileBase64(b64);
      setFileMime(mime);
      setFileLoaded(true);
    };
    reader.readAsDataURL(file);
  }

  function clearDetection() {
    setDetected(null);
    setConfirmed(null);
    setEditing(false);
    setDetectError(null);
    // A new question read starts a fresh session (new CI sequence on next grade).
    setDetectedQuestions(null);
    setWsResult(null);
    setCiCode(null);
  }

  function handleQuestionFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [prefix, b64] = result.split(",");
      const mime = prefix.match(/:(.*?);/)?.[1] || "image/jpeg";
      setQImageBase64(b64);
      setQImageMime(mime);
      setQImageName(file.name);
      clearDetection();
    };
    reader.readAsDataURL(file);
  }

  async function handleReadQuestion() {
    if (detecting) return;
    const q = question.trim();
    if (questionTab === "type" && !q) return;
    if (questionTab === "upload" && !qImageBase64) return;
    setDetecting(true);
    setDetectError(null);
    try {
      const d = await detectQuestion({
        question: q || undefined,
        ...(questionTab === "upload" && qImageBase64
          ? { imageBase64: qImageBase64, imageMimeType: qImageMime }
          : {}),
        topicVocabulary: CANONICAL_TOPIC_VOCAB,
      });
      if (!d || d.ok === false) {
        setDetectError(d?.error ?? "We couldn't read the question — please try again.");
        return;
      }
      const cd = buildConfirmedDetection(d);
      setDetected(cd);
      setConfirmed(cd);
      setEditing(false);
      setDetectedQuestions(d.questions && d.questions.length > 0 ? d.questions : null);
    } catch {
      setDetectError("We couldn't read the question — please try again.");
    } finally {
      setDetecting(false);
    }
  }

  function correctSubject(next: DesktopSubject) {
    const first = CANONICAL_TOPIC_VOCAB.find((t) => t.subject === next);
    setConfirmed((c) =>
      c ? { ...c, subject: next, topicSlug: first?.slug ?? "", topicName: first?.name ?? "" } : c,
    );
  }
  function correctTopic(slug: string) {
    const t = CANONICAL_TOPIC_VOCAB.find((x) => x.slug === slug);
    setConfirmed((c) =>
      c
        ? {
            ...c,
            topicSlug: t?.slug ?? "",
            topicName: t?.name ?? "",
            subject: (t?.subject as DesktopSubject) ?? c.subject,
          }
        : c,
    );
  }
  function correctMarks(m: number) {
    setConfirmed((c) => (c ? { ...c, marks: clampDetectedMarks(m), marksSource: "user" } : c));
  }

  // Multi-question grade: grade the WHOLE detected paper in one structured call,
  // then fan each legible result through Mistake Intelligence (worksheet parity).
  async function gradeMultiQuestion() {
    if (!confirmed || !detectedQuestions || !fileBase64) return;
    setGradeError(null);
    setSaved("idle");
    setGrading(true);

    const sessionCode = ciCode ?? buildCiSessionCode(confirmed.subject, confirmed.topicSlug);
    if (!ciCode) setCiCode(sessionCode);

    try {
      const response = await gradeWorksheet({
        worksheetId: `ci:${sessionCode}`,
        subject: confirmed.subject,
        questions: detectedQuestions.map((q) => ({
          qNumber: q.questionNumber,
          marks: q.marks,
          topic: confirmed.topicName || undefined,
          topicLabel: confirmed.topicName || undefined,
          questionText: q.questionText,
        })),
        imageBase64: fileBase64,
        imageMimeType: fileMime,
      });
      if (!response || response.ok === false) {
        setGradeError("Grading unavailable — please try a clearer scan, or try again.");
        return;
      }

      setWsResult(response);
      setView("graded");

      let anyRecorded = false;
      for (const g of response.results) {
        if (g.couldNotRead) continue;
        const csr = multiQuestionToCsr(g);
        const questionId = `ci:${sessionCode}:q${g.qNumber}`;
        const qText =
          detectedQuestions.find((q) => q.questionNumber === g.qNumber)?.questionText ||
          `${sessionCode} · Q${g.qNumber}`;
        // eslint-disable-next-line no-await-in-loop
        const rec = await recordMistake(user, csr, {
          subject: confirmed.subject,
          topic: confirmed.topicName,
          topicKey: confirmed.topicSlug,
          question: qText,
          questionId,
        });
        recordAttempt(user, {
          subject: confirmed.subject,
          topic: confirmed.topicName,
          topicKey: confirmed.topicSlug,
          question: qText,
          questionId,
          marksScored: csr.marksAwarded,
          marksAvailable: csr.totalMarks,
          mode: "graded",
        });
        if (rec.outcome === "logged" || rec.outcome === "duplicate" || rec.outcome === "skipped-clean") {
          anyRecorded = true;
        }
      }
      setSaved(anyRecorded ? "saved" : "no-user");
    } catch {
      setGradeError("Grading unavailable — please try again.");
    } finally {
      setGrading(false);
    }
  }

  async function handleGrade() {
    if (!confirmed) return;
    if (isMultiQuestion) {
      void gradeMultiQuestion();
      return;
    }
    setGradeError(null);
    setSaved("idle");
    setGrading(true);
    try {
      const trimmedQuestion = question.trim();
      // Detect-then-confirm: grade against the CONFIRMED (possibly corrected)
      // marks/subject/topic via the trusted-marks path (no re-detection at grade time).
      const req = {
        question: trimmedQuestion || confirmed.topicName || "Submitted question",
        subject: confirmed.subject,
        topic: confirmed.topicName,
        marks: confirmed.marks,
        ...(tab === "upload" && fileBase64
          ? { imageBase64: fileBase64, imageMimeType: fileMime }
          : { textAnswer: textAnswer.trim() }),
      };
      const result = await checkSolutionImage(req);
      // Mirror desktop's guard: a failed grade (no result, or ok === false) must
      // render as an ERROR — never as a valid score. The old permissive check
      // (`!result.ok && result.error`) let an `ok:false` response with an empty
      // `error` fall through to the else branch and render as a real grade.
      if (!result || result.ok === false) {
        setGradeError(
          result?.error
            ? `Grading unavailable — ${result.error}`
            : "Grading unavailable — please try again.",
        );
        return;
      }
      setGradeResult(result);
      setView("graded");

      const detectedSubject = confirmed.subject;
      const detectedTopicName = confirmed.topicName;
      const detectedTopicSlug = confirmed.topicSlug;
      const overrideLog: DetectionOverrideLog | null =
        detected &&
        (detected.marks !== confirmed.marks ||
          detected.subject !== confirmed.subject ||
          detected.topicSlug !== confirmed.topicSlug)
          ? {
              detected: { marks: detected.marks, subject: detected.subject, topicKey: detected.topicSlug },
              confirmed: { marks: confirmed.marks, subject: confirmed.subject, topicKey: confirmed.topicSlug },
            }
          : null;
      // Persist to the SAME pipeline desktop uses (mirror, don't reinvent):
      // logMistakes writes localStorage synchronously + Firestore
      // `learnerProfiles/{uid}/mistakeLogs` fire-and-forget. Keyed on uid, so the
      // graded mistake surfaces in BOTH mobile Me and desktop Me. Only persists
      // when signed in (no fabricated/anonymous history).
      if (user) {
        const rec = await recordMistake(user, result, {
          subject: detectedSubject,
          topic: detectedTopicName,
          topicKey: detectedTopicSlug,
          question: trimmedQuestion,
        });
        // Score-twin: persist the graded score as an attempt so it feeds the
        // (shared) Me scorecard / accuracy alongside the mistake log.
        recordAttempt(user, {
          subject: detectedSubject,
          topic: detectedTopicName,
          topicKey: detectedTopicSlug,
          question: trimmedQuestion,
          marksScored: result.marksAwarded,
          marksAvailable: result.totalMarks,
          mode: "graded",
          marksSource: confirmed.marksSource ?? undefined,
          detectionOverride: overrideLog,
        });
        // logged / duplicate (already saved) / skipped-clean (graded, no mistake
        // to save) all read as success; signed-out / local / error read as
        // "not saved — sign in".
        const ok =
          rec.outcome === "logged" ||
          rec.outcome === "duplicate" ||
          rec.outcome === "skipped-clean";
        setSaved(ok ? "saved" : "no-user");
      } else {
        setSaved("no-user");
      }
    } catch {
      setGradeError("Grading unavailable — please try again.");
    } finally {
      setGrading(false);
    }
  }

  // Multi-question (whole-paper) result — compact per-question list + CI code.
  if (wsResult) {
    const ws = wsResult;
    return (
      <MobileShell title="Check & Improve" subtitle="Graded paper" showNav>
        <div style={{ paddingBottom: 120, display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={() => { setView("upload"); setWsResult(null); }}
            style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--mob-fg-muted)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
          >
            ← Grade another
          </button>

          <div className="card-soft" style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {ciCode ?? "Graded paper"} · {ws.gradedCount}/{ws.totalQuestions} graded
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.6rem", color: "var(--mob-fg)", marginTop: 4 }}>
              {ws.gradedMarksAwarded}
              <span style={{ fontSize: "0.95rem", color: "var(--mob-fg-muted)", fontWeight: 500 }}>/{ws.gradedMarksTotal}</span>
            </div>
            {ws.pendingCount > 0 && (
              <div style={{ fontSize: "0.72rem", color: "var(--mob-warning, #b45309)", marginTop: 6, lineHeight: 1.5 }}>
                {ws.pendingCount} page{ws.pendingCount === 1 ? "" : "s"} couldn&rsquo;t be read — re-upload to grade. Not scored 0.
              </div>
            )}
            {ws.summary && (
              <p style={{ margin: "8px 0 0", fontSize: "0.78rem", color: "var(--mob-fg)", lineHeight: 1.55 }}>{ws.summary}</p>
            )}
          </div>

          {ws.results.map((g) => {
            const m = g.mistakeSummary ?? { conceptual: 0, calculation: 0, silly: 0, presentation: 0 };
            const knowledge = m.conceptual + m.calculation;
            const careless = m.silly + m.presentation;
            return (
              <div key={g.qNumber} className="card-soft" style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--mob-fg)" }}>Q{g.qNumber}</span>
                  {g.couldNotRead ? (
                    <span style={{ fontSize: "0.72rem", color: "var(--mob-warning, #b45309)" }}>Couldn&rsquo;t read — re-upload</span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {knowledge > 0 && <span style={{ fontSize: "0.68rem", color: "var(--mob-danger, #dc2626)", fontWeight: 600 }}>Knowledge gap ×{knowledge}</span>}
                      {careless > 0 && <span style={{ fontSize: "0.68rem", color: "var(--mob-warning, #b45309)", fontWeight: 600 }}>Careless ×{careless}</span>}
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "var(--mob-fg)" }}>
                        {g.marksAwarded}<span style={{ fontSize: "0.78rem", color: "var(--mob-fg-muted)", fontWeight: 500 }}>/{g.totalMarks}</span>
                      </span>
                    </span>
                  )}
                </div>
                {!g.couldNotRead && g.teacherNote && (
                  <p style={{ margin: "8px 0 0", fontSize: "0.74rem", color: "var(--mob-fg-muted)", lineHeight: 1.5 }}>{g.teacherNote}</p>
                )}
              </div>
            );
          })}

          {saved === "no-user" && (
            <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)" }}>Sign in to save these mistakes to your progress.</div>
          )}
        </div>
      </MobileShell>
    );
  }

  if (view === "graded" && gradeResult) {
    return (
      <GradedResult
        result={gradeResult}
        saved={saved}
        onBack={() => { setView("upload"); setGradeResult(null); }}
        navigate={navigate}
      />
    );
  }

  return (
    <MobileShell
      title="Check & Improve"
      subtitle="Board-style examiner grading"
      showNav
    >
      <div style={{ paddingBottom: 120, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── How it works panel ───────────────────────────────── */}
        <div
          className="card-soft"
          style={{
            padding: "14px 16px",
            background: "var(--mob-success-soft)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", marginBottom: 6, color: "var(--mob-success)" }}>
            How this works
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--mob-fg-muted)", lineHeight: 1.6 }}>
            Upload a photo of your written answer. Our AI examiner grades it against the CBSE marking scheme and shows exactly where you lost marks.
          </div>
        </div>

        {/* ── Upload / Type tab toggle ──────────────────────────── */}
        <div style={{ display: "flex", background: "var(--mob-muted)", borderRadius: 12, padding: 4, gap: 4, border: `1px solid var(--mob-card-border)` }}>
          {(["upload", "type"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9,
                border: "none",
                background: tab === t ? "var(--mob-card)" : "transparent",
                color: tab === t ? "var(--mob-fg)" : "var(--mob-fg-muted)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
                transition: "background 0.15s",
              }}
            >
              {t === "upload" ? "Upload photo" : "Type answer"}
            </button>
          ))}
        </div>

        {/* ── Drop zone (upload tab) ────────────────────────────── */}
        {tab === "upload" && (
          <div>
            <input
              ref={fileRef}
              type="file"
              /* Multi-question answers are a whole sheet — accept a PDF too;
                 single-question stays image-only (byte-identical). */
              accept={isMultiQuestion ? "image/*,application/pdf" : "image/*"}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                minHeight: 140,
                borderRadius: 16,
                border: fileLoaded
                  ? `2px solid var(--mob-success)`
                  : `2px dashed var(--mob-card-border)`,
                background: fileLoaded ? "var(--mob-success-soft)" : "var(--mob-muted)",
                cursor: "pointer",
                gap: 10,
                transition: "border 0.2s, background 0.2s",
              }}
            >
              {fileLoaded ? (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--mob-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span style={{ fontSize: "0.82rem", color: "var(--mob-success)", fontWeight: 600 }}>Image loaded</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)" }}>Tap to change</span>
                </>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--mob-fg-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span style={{ fontSize: "0.82rem", color: "var(--mob-fg-muted)" }}>Tap to upload a photo</span>
                </>
              )}
            </button>

            {/* Camera / files buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {[
                {
                  label: "Camera",
                  action: () => { if (fileRef.current) { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); } },
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
                },
                {
                  label: "Files",
                  action: () => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); } },
                  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
                },
              ].map(({ label, action, icon }) => (
                <button
                  key={label}
                  onClick={action}
                  className="card-soft tap"
                  style={{
                    flex: 1, height: 40, border: `1px solid var(--mob-card-border)`,
                    cursor: "pointer", fontSize: "0.78rem",
                    color: "var(--mob-fg-muted)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    gap: 6, background: "var(--mob-card)",
                  }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Text answer (type tab) ────────────────────────────── */}
        {tab === "type" && (
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Type your answer here… (minimum 10 characters)"
            style={{
              width: "100%",
              minHeight: 140,
              borderRadius: 14,
              border: `1px solid var(--mob-card-border)`,
              background: "var(--mob-card)",
              color: "var(--mob-fg)",
              fontFamily: "var(--font-body)",
              fontSize: "0.88rem",
              padding: "14px",
              resize: "vertical",
              boxSizing: "border-box",
              lineHeight: 1.6,
            }}
          />
        )}

        {/* ── The question — type / paste / photo, then "Read the question" ── */}
        <div className="card-soft" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            The question
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["type", "upload"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setQuestionTab(t); clearDetection(); }}
                style={{
                  flex: 1, height: 32, borderRadius: 9,
                  border: questionTab === t ? "none" : `1px solid var(--mob-card-border)`,
                  background: questionTab === t ? "var(--mob-fg)" : "var(--mob-muted)",
                  color: questionTab === t ? "#ffffff" : "var(--mob-fg-muted)",
                  fontWeight: 600, fontSize: "0.78rem", cursor: "pointer",
                }}
              >
                {t === "type" ? "Type / paste" : "Upload question(s)"}
              </button>
            ))}
          </div>

          {questionTab === "type" ? (
            <input
              type="text"
              value={question}
              onChange={(e) => { setQuestion(e.target.value); clearDetection(); }}
              placeholder="e.g. Find the 10th term of the AP 3, 7, 11, … [3]"
              style={{
                width: "100%", height: 40, borderRadius: 10,
                border: `1px solid var(--mob-card-border)`,
                background: "var(--mob-muted)", color: "var(--mob-fg)",
                fontFamily: "var(--font-body)", fontSize: "0.85rem",
                padding: "0 12px", boxSizing: "border-box",
              }}
            />
          ) : (
            <>
              <input
                ref={qFileRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuestionFile(f); }}
              />
              <button
                onClick={() => qFileRef.current?.click()}
                style={{
                  width: "100%", minHeight: 40, borderRadius: 10,
                  border: `1px dashed var(--mob-card-border)`, background: "var(--mob-muted)",
                  color: "var(--mob-fg)", fontFamily: "var(--font-body)", fontSize: "0.82rem",
                  padding: "8px 12px", cursor: "pointer",
                }}
              >
                {qImageName ? `Question file: ${qImageName}` : "Upload question paper (image or PDF)"}
              </button>
              <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", lineHeight: 1.5 }}>
                Upload a photo or PDF of your question paper. We&rsquo;ll read all questions. Then upload your answer below.
              </div>
            </>
          )}

          <button
            onClick={handleReadQuestion}
            disabled={!hasQuestion || detecting}
            style={{
              alignSelf: "flex-start", minHeight: 36, borderRadius: 10, padding: "0 16px",
              border: "none", background: "hsl(280,60%,50%)", color: "#ffffff",
              fontWeight: 700, fontSize: "0.82rem",
              opacity: !hasQuestion || detecting ? 0.5 : 1,
              cursor: !hasQuestion || detecting ? "not-allowed" : "pointer",
            }}
          >
            {detecting ? "Reading…" : confirmed ? "Re-read the question" : "Read the question →"}
          </button>
          {detectError && (
            <div style={{ fontSize: "0.78rem", color: "var(--mob-danger, #d4351c)" }}>{detectError}</div>
          )}

          {confirmed && isMultiQuestion && detectedQuestions && (
            <div
              style={{
                background: "var(--mob-muted)", border: `1px solid var(--mob-card-border)`,
                borderRadius: 10, padding: "10px 12px", fontSize: "0.82rem", color: "var(--mob-fg)", lineHeight: 1.5,
              }}
            >
              <strong>{detectedQuestions.length} questions detected</strong> · {confirmed.subject}
              {confirmed.topicName ? ` · ${confirmed.topicName}` : ""}
              <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: "0 12px" }}>
                {detectedQuestions.map((q) => (
                  <span key={q.questionNumber}>
                    Q{q.questionNumber} · {q.marks} {q.marks === 1 ? "mark" : "marks"}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", marginTop: 4 }}>
                Upload your answer sheet (image or PDF) below to grade all {detectedQuestions.length}.
              </div>
            </div>
          )}

          {confirmed && !isMultiQuestion && (
            <div
              style={{
                background: "var(--mob-muted)", border: `1px solid var(--mob-card-border)`,
                borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8,
              }}
            >
              <div style={{ fontSize: "0.82rem", color: "var(--mob-fg)", lineHeight: 1.5 }}>
                <strong>Detected:</strong> {confirmed.subject}
                {confirmed.topicName ? ` · ${confirmed.topicName}` : ""} · {confirmed.marks} mark
                {confirmed.marks === 1 ? "" : "s"}
                {SHOW_DETECTION_META && detectionSourceLabel(confirmed.marksSource)
                  ? <span style={{ color: "var(--mob-fg-muted)" }}> ({detectionSourceLabel(confirmed.marksSource)})</span>
                  : null}
              </div>
              {!editing ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: "0.76rem", color: "var(--mob-fg-muted)" }}>Looks right?</span>
                  <button
                    onClick={() => setEditing(true)}
                    style={{ background: "none", border: "none", padding: 0, color: "hsl(280,60%,50%)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["Maths", "Science"] as DesktopSubject[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => correctSubject(s)}
                        style={{
                          flex: 1, height: 30, borderRadius: 8,
                          border: confirmed.subject === s ? "none" : `1px solid var(--mob-card-border)`,
                          background: confirmed.subject === s ? "var(--mob-fg)" : "var(--mob-muted)",
                          color: confirmed.subject === s ? "#ffffff" : "var(--mob-fg-muted)",
                          fontWeight: 600, fontSize: "0.76rem", cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <select
                    value={confirmed.topicSlug}
                    onChange={(e) => correctTopic(e.target.value)}
                    style={{
                      width: "100%", height: 38, borderRadius: 9,
                      border: `1px solid var(--mob-card-border)`, background: "var(--mob-muted)",
                      color: "var(--mob-fg)", fontFamily: "var(--font-body)", fontSize: "0.82rem", padding: "0 10px",
                    }}
                  >
                    <option value="">(no specific topic)</option>
                    {CANONICAL_TOPIC_VOCAB.filter((t) => t.subject === confirmed.subject).map((t) => (
                      <option key={t.slug} value={t.slug}>{t.name}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 3, 4, 5, 6].map((m) => (
                      <button
                        key={m}
                        onClick={() => correctMarks(m)}
                        style={{
                          flex: 1, height: 30, borderRadius: 8,
                          border: confirmed.marks === m ? "none" : `1px solid var(--mob-card-border)`,
                          background: confirmed.marks === m ? "hsl(280,60%,50%)" : "var(--mob-muted)",
                          color: confirmed.marks === m ? "#ffffff" : "var(--mob-fg-muted)",
                          fontWeight: 700, fontSize: "0.76rem", cursor: "pointer",
                        }}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setEditing(false)}
                    style={{ alignSelf: "flex-start", minHeight: 30, borderRadius: 8, padding: "0 14px", border: `1px solid var(--mob-card-border)`, background: "var(--mob-muted)", color: "var(--mob-fg)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tip card ─────────────────────────────────────────── */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "rgba(59,130,246,0.06)",
            border: "1px solid rgba(59,130,246,0.14)",
            fontSize: "0.74rem",
            color: "var(--mob-fg-muted)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "hsl(217,76%,45%)" }}>Tip:</strong> Clear lighting + flat paper = better grading. Include your working steps, not just the final answer.
        </div>

        {/* Error */}
        {gradeError && (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--mob-danger-soft)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--mob-danger)", fontSize: "0.82rem" }}>
            {gradeError}
          </div>
        )}
      </div>

      {/* ── Sticky Grade CTA ─────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "var(--mob-nav-height)",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 440,
          borderTop: `1px solid var(--mob-card-border)`,
          background: "rgba(245,245,247,0.97)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "12px 20px",
          boxSizing: "border-box",
          zIndex: 30,
        }}
      >
        <button
          onClick={handleGrade}
          disabled={!canGrade || grading}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "none",
            background: canGrade && !grading ? "hsl(280,60%,50%)" : "rgba(139,92,246,0.25)",
            color: canGrade && !grading ? "#ffffff" : "rgba(0,0,0,0.3)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "1rem",
            cursor: canGrade && !grading ? "pointer" : "not-allowed",
            transition: "background 0.15s",
          }}
        >
          {grading ? "Grading…" : "Grade my answers →"}
        </button>
        {!canGrade && !grading && (
          <div style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--mob-fg-muted)", marginTop: 6 }}>
            {!confirmed ? "Read the question first" : "Upload or type an answer first"}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

/* ── GradedResult sub-component ───────────────────────────────── */
function StatusBadge({ status }: { status: CheckSolutionAnnotatedStep["status"] }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    correct:   { label: "Correct",   color: "var(--mob-success)",  bg: "var(--mob-success-soft)" },
    partial:   { label: "Partial",   color: "var(--mob-warning)",  bg: "var(--mob-warning-soft)" },
    incorrect: { label: "Incorrect", color: "var(--mob-danger)",   bg: "var(--mob-danger-soft)" },
    missing:   { label: "Missing",   color: "var(--mob-danger)",   bg: "var(--mob-danger-soft)" },
  };
  const s = map[status] ?? map.incorrect;
  return (
    <span style={{ padding: "2px 8px", borderRadius: 6, background: s.bg, color: s.color, fontSize: "0.68rem", fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function GradedResult({
  result,
  saved,
  onBack,
  navigate,
}: {
  result: CheckSolutionResponse;
  saved: "idle" | "saved" | "no-user";
  onBack: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const correct   = result.annotatedSteps.filter((s) => s.status === "correct").length;
  const partial   = result.annotatedSteps.filter((s) => s.status === "partial").length;
  const incorrect = result.annotatedSteps.filter((s) => s.status === "incorrect" || s.status === "missing").length;
  const lost      = result.annotatedSteps.filter((s) => s.status !== "correct");

  const pct = Math.round(result.percentage);
  const ringColor = pct >= 70 ? "var(--mob-success)" : pct >= 40 ? "var(--mob-warning)" : "var(--mob-danger)";

  return (
    <MobileShell title="Your Result" showBack onBack={onBack} showNav>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 }}>

        {/* ── Score card ───────────────────────────────────────── */}
        <div className="card-soft" style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", marginBottom: 4 }}>Score</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem", lineHeight: 1, color: "var(--mob-fg)" }}>
                {result.marksAwarded}
                <span style={{ fontSize: "1rem", color: "var(--mob-fg-muted)", fontWeight: 400 }}>
                  /{result.totalMarks}
                </span>
              </div>
            </div>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: `4px solid ${ringColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.1rem",
                color: ringColor,
              }}
            >
              {pct}%
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: `1px solid var(--mob-card-border)` }}>
            {[
              { label: "Correct", count: correct,   color: "var(--mob-success)" },
              { label: "Partial", count: partial,   color: "var(--mob-warning)" },
              { label: "Wrong",   count: incorrect, color: "var(--mob-danger)" },
            ].map(({ label, count: c, color }) => (
              <div key={label} style={{ textAlign: "center", padding: "12px 8px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color }}>{c}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--mob-fg-muted)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Save status (honest) — graded answer persisted to your progress
             (the SAME pipeline as desktop; surfaces in mobile + desktop Me) ── */}
        {saved === "saved" ? (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--mob-success-soft)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "var(--mob-success)",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            ✓ Saved to your progress — view it in Me
          </div>
        ) : saved === "no-user" ? (
          <button
            onClick={() => navigate("/login?reason=open-progress&redirect=%2Fcheck-improve")}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1.5px dashed var(--mob-card-border)",
              background: "transparent",
              color: "var(--mob-fg-muted)",
              fontSize: "0.78rem",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            Sign in to save this to your progress →
          </button>
        ) : null}

        {/* ── Where you lost marks ──────────────────────────────── */}
        {lost.length > 0 && (
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Where you lost marks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lost.map((step) => (
                <div key={step.stepNumber} className="card-soft" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)" }}>Step {step.stepNumber}</span>
                    <StatusBadge status={step.status} />
                  </div>
                  <div style={{ fontSize: "0.8rem", lineHeight: 1.5, marginBottom: 4, color: "var(--mob-fg)" }}>{step.description}</div>
                  {step.teacherAnnotation && (
                    <div style={{ fontSize: "0.74rem", color: "var(--mob-fg-muted)", fontStyle: "italic" }}>{step.teacherAnnotation}</div>
                  )}
                  {step.marksDeducted > 0 && (
                    <div style={{ fontSize: "0.68rem", color: "var(--mob-danger)", marginTop: 4 }}>
                      −{step.marksDeducted} mark{step.marksDeducted !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Teacher note ─────────────────────────────────────── */}
        {result.teacherNote && (
          <div
            className="card-soft"
            style={{ padding: "14px 16px", background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 6, color: "hsl(217,76%,45%)" }}>Examiner insight</div>
            <div style={{ fontSize: "0.78rem", color: "var(--mob-fg-muted)", lineHeight: 1.6 }}>{result.teacherNote}</div>
          </div>
        )}

        {/* ── Recommended next ─────────────────────────────────── */}
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Recommended next
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => navigate("/topic-hub")}
              style={{
                width: "100%", height: 48, borderRadius: 14,
                border: `1px solid var(--mob-card-border)`,
                background: "var(--mob-card)", color: "var(--mob-fg)",
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
              }}
            >
              Revise topic →
            </button>
            <button
              onClick={() => navigate("/practice/worksheets")}
              style={{
                width: "100%", height: 48, borderRadius: 14,
                border: `1px solid var(--mob-card-border)`,
                background: "var(--mob-card)", color: "var(--mob-fg)",
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer",
              }}
            >
              Generate targeted worksheet →
            </button>
          </div>
        </div>

        {/* ── See progress link ─────────────────────────────────── */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => navigate("/profile")}
            style={{ background: "none", border: "none", color: "var(--mob-fg-muted)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline" }}
          >
            See full progress in Me →
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
