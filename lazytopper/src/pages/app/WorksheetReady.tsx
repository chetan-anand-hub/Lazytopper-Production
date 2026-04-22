import { useState } from "react";
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
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    if (!opts) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadWorksheet(opts);
    } catch {
      setDownloadError("Download failed — please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <MobileShell
      title="Worksheet Ready"
      showBack
      onBack={() => navigate("/app/practice/worksheets")}
      showNav
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 32 }}>

        {/* ── Success indicator ───────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "24px 0 8px",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--mob-success-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mob-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.15rem", color: "var(--mob-fg)", marginBottom: 4 }}>
            Worksheet ready
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--mob-fg-muted)" }}>
            {opts ? `${opts.questions.length} question${opts.questions.length !== 1 ? "s" : ""}` : "Questions generated"}
          </div>
        </div>

        {/* ── Summary card ──────────────────────────────────────── */}
        {opts && (
          <div className="card-soft" style={{ padding: "16px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "var(--mob-fg-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.7rem" }}>
              Summary
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Subject"    value={opts.subjectKey} />
              <Row label="Topic"      value={opts.topicLabel} />
              <Row label="Difficulty" value={opts.difficulty === "All" ? "All levels" : opts.difficulty} />
              <Row label="Section"    value={opts.sectionFilter === "All" ? "All sections (A–E)" : `Section ${opts.sectionFilter}`} />
              <Row label="Questions"  value={String(opts.questions.length)} />
            </div>
          </div>
        )}

        {/* ── Download error ────────────────────────────────────── */}
        {downloadError && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--mob-danger-soft)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--mob-danger)",
              fontSize: "0.82rem",
            }}
          >
            {downloadError}
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────── */}
        <button
          onClick={handleDownload}
          disabled={!opts || downloading}
          style={{
            width: "100%",
            height: 52,
            borderRadius: 14,
            border: "none",
            background: opts && !downloading ? "var(--mob-primary)" : "rgba(26,58,92,0.3)",
            color: "#ffffff",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "0.95rem",
            cursor: opts && !downloading ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {downloading ? (
            "Preparing PDF…"
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PDF
            </>
          )}
        </button>

        <button
          onClick={() => navigate(`/practice/10/${subject}`)}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 14,
            border: `1px solid var(--mob-card-border)`,
            background: "var(--mob-card)",
            color: "var(--mob-fg)",
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
            color: "var(--mob-fg-muted)",
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
      <span style={{ fontSize: "0.78rem", color: "var(--mob-fg-muted)" }}>{label}</span>
      <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--mob-fg)" }}>{value}</span>
    </div>
  );
}
