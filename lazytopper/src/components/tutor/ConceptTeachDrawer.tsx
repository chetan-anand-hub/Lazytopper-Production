import { useEffect, useRef } from "react";
import { TeachFlow } from "./TeachFlow";

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

  return (
    <div
      ref={backdropRef}
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "flex-end",
        animation: "conceptDrawerFadeIn 0.2s ease",
      }}
    >
      <style>{`
        @keyframes conceptDrawerFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes conceptDrawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
      <div
        style={{
          width: "min(480px, 92vw)",
          height: "100%",
          background: "#ffffff",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          display: "flex",
          flexDirection: "column",
          animation: "conceptDrawerSlideIn 0.25s ease",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
            background: "linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b" }}>
              Teach Me: {topicLabel}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>
              {context.subject} &middot; Learn the concept step by step
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "1px solid #cbd5e1",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: "0.78rem",
              color: "#64748b",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "16px 18px" }}>
          <TeachFlow
            topicKey={context.topicKey}
            subject={context.subject}
            grade="10"
            nodeId={context.subtopic || context.concept || undefined}
            onComplete={onClose}
          />
        </div>
      </div>
    </div>
  );
}
