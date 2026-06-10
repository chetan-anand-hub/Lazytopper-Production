import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import {
  checkSolutionImage,
  type CheckSolutionResponse,
  type CheckSolutionAnnotatedStep,
} from "../../ai/aiClient";
import { useAuth } from "../../context/AuthContext";
import { logMistakes, type MistakeLogEntry } from "../../services/mistakeLogService";

/**
 * buildMobileLogEntry — mirror of DesktopCheckImprovePage.tsx `buildLogEntry`.
 * Maps a grader response to the SHARED MistakeLogEntry schema so a mobile grade
 * persists to the SAME pipeline desktop uses (`logMistakes` → localStorage +
 * Firestore `learnerProfiles/{uid}/mistakeLogs`) and surfaces in mobile + desktop
 * Me. Do NOT diverge this from desktop's mapping — keep the two unified.
 */
function buildMobileLogEntry(
  subject: string,
  topic: string,
  question: string,
  result: CheckSolutionResponse,
): Omit<MistakeLogEntry, "id"> {
  const summary = result.mistakeSummary ?? {
    conceptual: 0,
    calculation: 0,
    silly: 0,
    presentation: 0,
  };
  const marksLost = Math.max(0, result.totalMarks - result.marksAwarded);
  const stepDetails = (result.annotatedSteps ?? [])
    .filter((s) => s.mistakeType && s.marksDeducted > 0)
    .map((s) => ({
      stepNumber: s.stepNumber,
      mistakeType: String(s.mistakeType),
      marksDeducted: s.marksDeducted,
    }));
  return {
    timestamp: new Date().toISOString(),
    questionText: question,
    topic,
    subject,
    totalMarks: result.totalMarks,
    marksLost,
    mistakeCounts: {
      conceptual: summary.conceptual ?? 0,
      calculation: summary.calculation ?? 0,
      silly: summary.silly ?? 0,
      presentation: summary.presentation ?? 0,
    },
    stepDetails,
  };
}

const MATHS_TOPICS = [
  "Real Numbers", "Polynomials", "Linear Equations", "Quadratic Equations",
  "Arithmetic Progression", "Triangles", "Coordinate Geometry", "Circles",
  "Surface Areas & Volumes", "Trigonometry", "Statistics", "Probability",
];
const SCIENCE_TOPICS = [
  "Chemical Reactions", "Acids, Bases & Salts", "Metals & Non-Metals",
  "Carbon Compounds", "Life Processes", "Control & Coordination",
  "Reproduction", "Heredity & Evolution", "Light", "Electricity",
  "Magnetic Effects", "Our Environment",
];

const MARKS_OPTIONS = [1, 2, 3, 4, 5];

type View = "upload" | "graded";
type Tab  = "upload" | "type";

export default function CheckImprove() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [view, setView]               = useState<View>("upload");
  const [tab, setTab]                 = useState<Tab>("upload");
  const [fileBase64, setFileBase64]   = useState<string | null>(null);
  const [fileMime, setFileMime]       = useState<string>("image/jpeg");
  const [fileLoaded, setFileLoaded]   = useState(false);
  const [textAnswer, setTextAnswer]   = useState("");
  const [subject, setSubject]         = useState<"Maths" | "Science">("Maths");
  const [topic, setTopic]             = useState(MATHS_TOPICS[0]);
  const [question, setQuestion]       = useState("");
  const [marks, setMarks]             = useState(3);
  const [grading, setGrading]         = useState(false);
  const [gradeResult, setGradeResult] = useState<CheckSolutionResponse | null>(null);
  const [gradeError, setGradeError]   = useState<string | null>(null);
  const [saved, setSaved]             = useState<"idle" | "saved" | "no-user">("idle");

  const hasContent = tab === "upload" ? fileLoaded : textAnswer.trim().length > 10;
  const canGrade   = hasContent && question.trim().length > 0;

  function switchSubject(s: "Maths" | "Science") {
    setSubject(s);
    setTopic(s === "Maths" ? MATHS_TOPICS[0] : SCIENCE_TOPICS[0]);
  }

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

  async function handleGrade() {
    setGradeError(null);
    setSaved("idle");
    setGrading(true);
    try {
      const req = {
        subject,
        topic,
        question: question.trim(),
        marks,
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
      // Persist to the SAME pipeline desktop uses (mirror, don't reinvent):
      // logMistakes writes localStorage synchronously + Firestore
      // `learnerProfiles/{uid}/mistakeLogs` fire-and-forget. Keyed on uid, so the
      // graded mistake surfaces in BOTH mobile Me and desktop Me. Only persists
      // when signed in (no fabricated/anonymous history).
      if (user) {
        setSaved("saved");
        void logMistakes(
          user.uid,
          buildMobileLogEntry(subject, topic, question.trim(), result),
        );
      } else {
        setSaved("no-user");
      }
    } catch {
      setGradeError("Grading unavailable — please try again.");
    } finally {
      setGrading(false);
    }
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

  const topicList = subject === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;

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
              accept="image/*"
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

        {/* ── Subject & topic ───────────────────────────────────── */}
        <div className="card-soft" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Subject & topic
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["Maths", "Science"] as const).map((s) => (
              <button
                key={s}
                onClick={() => switchSubject(s)}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: subject === s ? "none" : `1px solid var(--mob-card-border)`,
                  background: subject === s ? "var(--mob-primary)" : "var(--mob-muted)",
                  color: subject === s ? "#ffffff" : "var(--mob-fg-muted)",
                  fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              width: "100%", height: 40, borderRadius: 10,
              border: `1px solid var(--mob-card-border)`,
              background: "var(--mob-muted)", color: "var(--mob-fg)",
              fontFamily: "var(--font-body)", fontSize: "0.85rem", padding: "0 10px",
            }}
          >
            {topicList.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* ── Question + marks ─────────────────────────────────── */}
        <div className="card-soft" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Question (brief description)
          </div>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Prove Pythagoras theorem"
            style={{
              width: "100%", height: 40, borderRadius: 10,
              border: `1px solid var(--mob-card-border)`,
              background: "var(--mob-muted)", color: "var(--mob-fg)",
              fontFamily: "var(--font-body)", fontSize: "0.85rem",
              padding: "0 12px", boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: "0.72rem", color: "var(--mob-fg-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Marks
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {MARKS_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMarks(m)}
                className="pill tap"
                style={{
                  flex: 1,
                  border: marks === m ? "none" : `1px solid var(--mob-card-border)`,
                  background: marks === m ? "var(--mob-primary)" : "var(--mob-muted)",
                  color: marks === m ? "#ffffff" : "var(--mob-fg-muted)",
                  fontWeight: marks === m ? 700 : 400,
                  cursor: "pointer",
                  textAlign: "center",
                  padding: "6px 0",
                }}
              >
                {m}
              </button>
            ))}
          </div>
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
            {!hasContent ? "Upload or type an answer first" : "Add a question description to continue"}
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
