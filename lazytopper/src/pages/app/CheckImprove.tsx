import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import {
  checkSolutionImage,
  type CheckSolutionResponse,
  type CheckSolutionAnnotatedStep,
} from "../../ai/aiClient";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const [view, setView]                 = useState<View>("upload");
  const [tab, setTab]                   = useState<Tab>("upload");
  const [fileBase64, setFileBase64]     = useState<string | null>(null);
  const [fileMime, setFileMime]         = useState<string>("image/jpeg");
  const [fileLoaded, setFileLoaded]     = useState(false);
  const [textAnswer, setTextAnswer]     = useState("");
  const [subject, setSubject]           = useState<"Maths" | "Science">("Maths");
  const [topic, setTopic]               = useState(MATHS_TOPICS[0]);
  const [question, setQuestion]         = useState("");
  const [marks, setMarks]               = useState(3);
  const [grading, setGrading]           = useState(false);
  const [gradeResult, setGradeResult]   = useState<CheckSolutionResponse | null>(null);
  const [gradeError, setGradeError]     = useState<string | null>(null);

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
    setGrading(true);
    try {
      const req = {
        subject,
        topic,
        question: question.trim() || "Answer from uploaded sheet",
        marks,
        ...(tab === "upload" && fileBase64
          ? { imageBase64: fileBase64, imageMimeType: fileMime }
          : { textAnswer: textAnswer.trim() }),
      };
      const result = await checkSolutionImage(req);
      if (!result.ok && result.error) {
        setGradeError("Grading unavailable — please try again.");
      } else {
        setGradeResult(result);
        setView("graded");
      }
    } catch {
      setGradeError("Grading unavailable — please try again.");
    } finally {
      setGrading(false);
    }
  }

  if (view === "graded" && gradeResult) {
    return <GradedResult result={gradeResult} onBack={() => setView("upload")} navigate={navigate} />;
  }

  const topicList = subject === "Maths" ? MATHS_TOPICS : SCIENCE_TOPICS;

  return (
    <MobileShell
      title="Check & Improve"
      subtitle="Board-style examiner grading"
      showNav
    >
      <div
        className="screen-pad animate-float-up"
        style={{ paddingBottom: 136, display: "flex", flexDirection: "column", gap: 14 }}
      >

        {/* ── How it works info panel ──────────────────────────── */}
        <div
          className="card-soft"
          style={{ padding: "14px 16px", background: "hsla(142,71%,45%,0.06)", border: "1px solid hsla(142,71%,45%,0.18)" }}
        >
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.88rem", marginBottom: 8, color: "hsl(142,71%,55%)" }}>
            How this works
          </div>
          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            Upload a photo of your written answer. Our AI examiner grades it against the CBSE marking scheme and shows exactly where you lost marks.
          </div>
        </div>

        {/* ── Upload / Type tab toggle ──────────────────────────── */}
        <div style={{ display: "flex", background: "var(--bg-card)", borderRadius: 12, padding: 4, gap: 4 }}>
          {(["upload", "type"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 9,
                border: "none",
                background: tab === t ? "hsla(255,100%,100%,0.1)" : "transparent",
                color: tab === t ? "var(--text)" : "var(--text-muted)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
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
                  ? "2px solid hsl(142,71%,45%)"
                  : "2px dashed hsla(255,100%,100%,0.15)",
                background: fileLoaded ? "hsla(142,71%,45%,0.08)" : "var(--bg-card)",
                cursor: "pointer",
                gap: 10,
                transition: "border 0.2s, background 0.2s",
              }}
            >
              {fileLoaded ? (
                <>
                  {/* CheckCircle */}
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(142,71%,55%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span style={{ fontSize: "0.82rem", color: "hsl(142,71%,55%)", fontWeight: 600 }}>Image loaded</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Tap to change</span>
                </>
              ) : (
                <>
                  {/* Upload SVG */}
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Tap to upload a photo</span>
                </>
              )}
            </button>

            {/* Camera / files buttons */}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute("capture", "environment");
                    fileRef.current.click();
                  }
                }}
                className="card-soft tap"
                style={{
                  flex: 1, height: 40, border: "none", cursor: "pointer",
                  fontSize: "0.78rem", color: "var(--text-muted)", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 6, background: "var(--bg-card)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Camera
              </button>
              <button
                onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.removeAttribute("capture");
                    fileRef.current.click();
                  }
                }}
                className="card-soft tap"
                style={{
                  flex: 1, height: 40, border: "none", cursor: "pointer",
                  fontSize: "0.78rem", color: "var(--text-muted)", display: "flex",
                  alignItems: "center", justifyContent: "center", gap: 6, background: "var(--bg-card)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
                Files
              </button>
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
              border: "1px solid hsla(255,100%,100%,0.1)",
              background: "var(--bg-card)",
              color: "var(--text)",
              fontFamily: "var(--font-body)",
              fontSize: "0.88rem",
              padding: "14px",
              resize: "vertical",
              boxSizing: "border-box",
              lineHeight: 1.6,
            }}
          />
        )}

        {/* ── Subject & topic selector ─────────────────────────── */}
        <div className="card-soft" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Subject & topic
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["Maths", "Science"] as const).map((s) => (
              <button
                key={s}
                onClick={() => switchSubject(s)}
                style={{
                  flex: 1, height: 36, borderRadius: 10,
                  border: subject === s ? "none" : "1px solid hsla(255,100%,100%,0.1)",
                  background: subject === s ? "hsl(142,71%,45%)" : "transparent",
                  color: subject === s ? "#000" : "var(--text-muted)",
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
              border: "1px solid hsla(255,100%,100%,0.1)",
              background: "var(--bg)", color: "var(--text)",
              fontFamily: "var(--font-body)", fontSize: "0.85rem", padding: "0 10px",
            }}
          >
            {topicList.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* ── Question + marks brief ───────────────────────────── */}
        <div className="card-soft" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Question (brief description)
          </div>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Prove Pythagoras theorem"
            style={{
              width: "100%", height: 40, borderRadius: 10,
              border: "1px solid hsla(255,100%,100%,0.1)",
              background: "var(--bg)", color: "var(--text)",
              fontFamily: "var(--font-body)", fontSize: "0.85rem",
              padding: "0 12px", boxSizing: "border-box",
            }}
          />
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Marks
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {MARKS_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setMarks(m)}
                className="pill tap"
                style={{
                  flex: 1, border: marks === m ? "none" : "1px solid hsla(255,100%,100%,0.1)",
                  background: marks === m ? "hsl(217,91%,60%)" : "var(--bg-card)",
                  color: marks === m ? "#000" : "var(--text-muted)",
                  fontWeight: marks === m ? 700 : 400, cursor: "pointer",
                  textAlign: "center", padding: "6px 0",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tip card ─────────────────────────────────────────── */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "hsla(217,91%,60%,0.07)", border: "1px solid hsla(217,91%,60%,0.15)", fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "hsl(217,91%,65%)" }}>Tip:</strong> Clear lighting + flat paper = better grading. Include your working steps, not just the final answer.
        </div>

        {/* Error state */}
        {gradeError && (
          <div style={{ padding: "12px 14px", borderRadius: 12, background: "hsla(0,72%,51%,0.1)", border: "1px solid hsla(0,72%,51%,0.25)", color: "hsl(0,72%,65%)", fontSize: "0.82rem" }}>
            {gradeError}
          </div>
        )}
      </div>

      {/* ── Sticky Grade CTA ─────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: 68,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          borderTop: "1px solid hsla(255,100%,100%,0.07)",
          background: "hsla(0,0%,7%,0.96)",
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
            background: canGrade && !grading ? "hsl(280,70%,60%)" : "hsla(280,70%,60%,0.3)",
            color: canGrade && !grading ? "#fff" : "hsla(255,100%,100%,0.4)",
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
          <div style={{ textAlign: "center", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6 }}>
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
    correct:   { label: "Correct",   color: "hsl(142,71%,45%)",  bg: "hsla(142,71%,45%,0.12)" },
    partial:   { label: "Partial",   color: "hsl(38,92%,50%)",   bg: "hsla(38,92%,50%,0.12)" },
    incorrect: { label: "Incorrect", color: "hsl(0,72%,55%)",    bg: "hsla(0,72%,51%,0.12)" },
    missing:   { label: "Missing",   color: "hsl(0,72%,55%)",    bg: "hsla(0,72%,51%,0.12)" },
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
  onBack,
  navigate,
}: {
  result: CheckSolutionResponse;
  onBack: () => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const correct   = result.annotatedSteps.filter((s) => s.status === "correct").length;
  const partial   = result.annotatedSteps.filter((s) => s.status === "partial").length;
  const incorrect = result.annotatedSteps.filter((s) => s.status === "incorrect" || s.status === "missing").length;
  const lost      = result.annotatedSteps.filter((s) => s.status !== "correct");

  return (
    <MobileShell
      title="Your Result"
      showBack
      onBack={onBack}
      showNav
    >
      <div className="screen-pad animate-float-up" style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 }}>

        {/* ── Score card ───────────────────────────────────────── */}
        <div
          className="shadow-elev"
          style={{
            borderRadius: 20,
            overflow: "hidden",
            border: "1px solid hsla(255,100%,100%,0.07)",
          }}
        >
          {/* Dark header */}
          <div
            style={{
              background: "var(--bg-card)",
              padding: "20px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 4 }}>Score</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "2rem", lineHeight: 1 }}>
                {result.marksAwarded}
                <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 400 }}>
                  /{result.totalMarks}
                </span>
              </div>
            </div>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: `4px solid ${result.percentage >= 70 ? "hsl(142,71%,45%)" : result.percentage >= 40 ? "hsl(38,92%,50%)" : "hsl(0,72%,55%)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1.1rem",
                color: result.percentage >= 70 ? "hsl(142,71%,55%)" : result.percentage >= 40 ? "hsl(38,92%,50%)" : "hsl(0,72%,65%)",
              }}
            >
              {Math.round(result.percentage)}%
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              borderTop: "1px solid hsla(255,100%,100%,0.06)",
            }}
          >
            {[
              { label: "Correct", count: correct, color: "hsl(142,71%,55%)" },
              { label: "Partial", count: partial,  color: "hsl(38,92%,50%)" },
              { label: "Wrong",   count: incorrect, color: "hsl(0,72%,65%)" },
            ].map(({ label, count: c, color }) => (
              <div key={label} style={{ textAlign: "center", padding: "12px 8px" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color }}>{c}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Where you lost marks ──────────────────────────────── */}
        {lost.length > 0 && (
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Where you lost marks
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lost.map((step) => (
                <div key={step.stepNumber} className="card-soft" style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Step {step.stepNumber}</span>
                    <StatusBadge status={step.status} />
                  </div>
                  <div style={{ fontSize: "0.8rem", lineHeight: 1.5, marginBottom: 4 }}>{step.description}</div>
                  {step.teacherAnnotation && (
                    <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", fontStyle: "italic" }}>{step.teacherAnnotation}</div>
                  )}
                  {step.marksDeducted > 0 && (
                    <div style={{ fontSize: "0.68rem", color: "hsl(0,72%,65%)", marginTop: 4 }}>
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
            style={{ padding: "14px 16px", background: "hsla(217,91%,60%,0.07)", border: "1px solid hsla(217,91%,60%,0.15)" }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.82rem", marginBottom: 6, color: "hsl(217,91%,65%)" }}>Examiner insight</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6 }}>{result.teacherNote}</div>
          </div>
        )}

        {/* ── Recommended next ─────────────────────────────────── */}
        <div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Recommended next
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={() => navigate("/app/topic-hub")}
              style={{
                width: "100%", height: 48, borderRadius: 14,
                border: "1px solid hsla(255,100%,100%,0.12)",
                background: "transparent", color: "var(--text)",
                fontFamily: "var(--font-body)", fontWeight: 600,
                fontSize: "0.88rem", cursor: "pointer",
              }}
            >
              Revise topic →
            </button>
            <button
              onClick={() => navigate("/app/practice/worksheets")}
              style={{
                width: "100%", height: 48, borderRadius: 14,
                border: "1px solid hsla(255,100%,100%,0.12)",
                background: "transparent", color: "var(--text)",
                fontFamily: "var(--font-body)", fontWeight: 600,
                fontSize: "0.88rem", cursor: "pointer",
              }}
            >
              Generate targeted worksheet →
            </button>
          </div>
        </div>

        {/* ── See progress link ─────────────────────────────────── */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => navigate("/app/me")}
            style={{
              background: "none", border: "none",
              color: "var(--text-muted)", fontSize: "0.8rem",
              cursor: "pointer", textDecoration: "underline",
            }}
          >
            See full progress in Me →
          </button>
        </div>
      </div>
    </MobileShell>
  );
}
