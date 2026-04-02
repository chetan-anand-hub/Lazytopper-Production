import { useEffect, useRef } from "react";
import { TeachFlow, type ConceptContext } from "./TeachFlow";

export interface ConceptTeachContext {
  topicKey: string;
  subject: string;
  questionText: string;
  marks?: number;
  subtopic?: string;
  concept?: string;
}

interface ConceptTeachDrawerProps {
  open: boolean;
  onClose: () => void;
  context: ConceptTeachContext;
}

export default function ConceptTeachDrawer({ open, onClose, context }: ConceptTeachDrawerProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const topicLabel = context.subtopic || context.concept || context.topicKey
    .replace(/^(MATH|SCI)-/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const conceptCtx: ConceptContext = {
    questionText: context.questionText,
    marks: context.marks,
    subtopic: context.subtopic,
    concept: context.concept,
  };

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(2,6,23,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "conceptDrawerFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes conceptDrawerFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes conceptDrawerScaleIn { from { opacity: 0; transform: scale(0.96) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
      <div
        style={{
          width: "min(820px, 96vw)",
          maxHeight: "92vh",
          background: "#ffffff",
          borderRadius: 20,
          boxShadow: "0 24px 80px rgba(2,6,23,0.3), 0 4px 24px rgba(2,6,23,0.1)",
          display: "flex",
          flexDirection: "column",
          animation: "conceptDrawerScaleIn 0.25s ease",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
              Teach Me: {topicLabel}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
              {context.subject} &middot; Learn the concept step by step
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: "0.82rem",
              color: "#475569",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
          <TeachFlow
            topicKey={context.topicKey}
            subject={context.subject}
            grade="10"
            nodeId={context.subtopic || context.concept || undefined}
            onComplete={onClose}
            conceptContext={conceptCtx}
          />
        </div>
      </div>
    </div>
  );
}
