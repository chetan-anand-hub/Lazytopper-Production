import { useNavigate, useLocation } from "react-router-dom";
import MobileShell from "../../components/mobile/MobileShell";
import { useSubjectContext } from "../../hooks/useSubjectContext";
import { downloadWorksheet } from "../../components/practice/worksheetGenerator";
import type { WorksheetOptions } from "../../components/practice/worksheetGenerator";

export default function WorksheetReady() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subject } = useSubjectContext();

  const opts: WorksheetOptions | undefined = (location.state as { opts?: WorksheetOptions })?.opts;

  async function handleDownload() {
    if (!opts) return;
    await downloadWorksheet(opts);
  }

  return (
    <MobileShell
      title="Worksheet Ready"
      showBack
      onBack={() => navigate("/app/practice/worksheets")}
      showNav
    >
      <div className="screen-pad animate-float-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Summary card ──────────────────────────────────────── */}
        <div className="card-soft" style={{ padding: "20px 16px" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: "1.1rem",
              marginBottom: 12,
            }}
          >
            Your worksheet is ready
          </div>

          {opts ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Row label="Subject" value={opts.subjectKey} />
              <Row label="Topic" value={opts.topicLabel} />
              <Row label="Difficulty" value={opts.difficulty || "All levels"} />
              <Row label="Section" value={opts.sectionFilter === "All" ? "All sections (A–E)" : `Section ${opts.sectionFilter}`} />
              <Row label="Questions" value={String(opts.questions.length)} />
            </div>
          ) : (
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Worksheet generated. Download below.
            </div>
          )}
        </div>

        {/* ── Actions ────────────────────────────────────────────── */}
        <button
          onClick={handleDownload}
          disabled={!opts}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "none",
            background: "hsl(142,71%,45%)",
            color: "#000",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: opts ? "pointer" : "not-allowed",
            opacity: opts ? 1 : 0.5,
          }}
        >
          Download PDF
        </button>

        <button
          onClick={() => navigate(`/practice/10/${subject}`)}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 14,
            border: "1px solid hsla(255,100%,100%,0.12)",
            background: "transparent",
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Practice with this worksheet
        </button>

        <button
          onClick={() => navigate("/app/practice/worksheets")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            cursor: "pointer",
            textDecoration: "underline",
            padding: "4px 0",
          }}
        >
          Back to generator
        </button>
      </div>
    </MobileShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
