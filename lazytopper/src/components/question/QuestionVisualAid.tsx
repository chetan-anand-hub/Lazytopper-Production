import React, { useState } from "react";
import { createPortal } from "react-dom";
import { getFiguresForQuestion } from "../../data/visualConceptRegistry";
import type { VisualConcept } from "../../data/visualConceptRegistry";

export interface QuestionVisualAidProps {
  subject?: string;
  topicKey?: string;
  questionText?: string;
  kind?: string;
  marks?: number;
  // When set and the question has bound RASTER source figure(s) (extracted exam
  // diagrams/tables/photos), those are rendered as <img> in source order and take
  // priority. No binding → nothing is drawn (see the end of QuestionVisualAid).
  questionId?: string;
}

const FIG_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
function figureSrc(filePath: string): string {
  if (/^(blob:|https?:)/.test(filePath)) return filePath;
  return filePath.startsWith("/") ? `${FIG_BASE}${filePath}` : filePath;
}

// Renders the bound raster source figure(s) for a question, in order, as plain
// images (a real exam figure — not a synthetic aid). Click an image to enlarge.
function SourceFigures({ figures }: { figures: VisualConcept[] }): React.ReactElement {
  const [zoomed, setZoomed] = useState<string | null>(null);
  return (
    <div className="qva-container" style={{ maxWidth: 360, margin: "6px auto 8px" }}>
      <div style={{ fontSize: "0.72rem", color: "#475569", marginBottom: 4 }}>
        {figures.length > 1 ? "Figures from the question paper" : "Figure from the question paper"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {figures.map((fig) => (
          <button
            key={fig.id}
            type="button"
            onClick={() => setZoomed(fig.filePath)}
            title="Tap to enlarge"
            style={{
              padding: 6, border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12,
              background: "#ffffff", cursor: "zoom-in", lineHeight: 0, width: "100%",
            }}
          >
            <img
              src={figureSrc(fig.filePath)}
              alt={fig.title}
              loading="lazy"
              style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
            />
          </button>
        ))}
      </div>
      {/* The overlay is PORTALLED to document.body. Rendered in place, `position: fixed`
          resolves against the nearest transformed ancestor (the mobile shell's
          main.animate-float-up keeps an identity transform), so at phone width the
          enlarged figure was centred in a 20,000px-tall box, off-screen. */}
      {zoomed && typeof document !== "undefined" && createPortal(
        <div
          onClick={() => setZoomed(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(15,23,42,0.82)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out",
          }}
        >
          <img
            src={figureSrc(zoomed)}
            alt="Enlarged figure"
            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 8, background: "#fff" }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}

const QVA_STYLE_ID = "qva-responsive-style";
function ensureResponsiveStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(QVA_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = QVA_STYLE_ID;
  style.textContent = `@media(max-width:480px){.qva-container{max-width:260px!important}}`;
  document.head.appendChild(style);
}

export function QuestionVisualAid(props: QuestionVisualAidProps): React.ReactElement | null {
  ensureResponsiveStyle();

  // A bound RASTER source figure (a real extracted exam diagram/table/photo) is
  // authoritative — show it.
  const boundFigures = getFiguresForQuestion(props.questionId);
  if (boundFigures.length > 0) {
    return <SourceFigures figures={boundFigures} />;
  }

  // FIGURE-HONESTY-1 PR-1 — no bound figure means DRAW NOTHING: "Exact, id-keyed,
  // and never heuristic: a wrong figure is worse than none" (visualConceptRegistry).
  // 2026-10-11 HARDEN-1 PR-1 (D75/D8): the synthetic-SVG / AI-diagram heuristic that
  // used to sit below this line was dead at runtime behind a constant-true flag and
  // has been deleted. Return value unchanged: no binding → null.
  return null;
}
