// src/pages/PredictivePapers.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import {
  predictivePapers,
  type PredictivePaper,
} from "../data/predictivePapers";

const PredictivePapersPage: React.FC = () => {
  const navigate = useNavigate();

  const openPaper = (paper: PredictivePaper) => {
    // Navigate using slug in the URL so MockPaper can read it via useParams
    navigate(`/mock-paper/${paper.slug}`);
  };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingBottom: 60,
      }}
    >
      {/* Hero */}
      <header
        style={{
          borderRadius: 32,
          padding: "22px 22px 24px",
          background:
            "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(37,99,235,0.95))",
          color: "#e5e7eb",
          boxShadow: "0 26px 70px rgba(15,23,42,0.7)",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            opacity: 0.85,
            marginBottom: 6,
          }}
        >
          Class 10 • Maths • Prediction Engine
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "2.1rem",
            lineHeight: 1.2,
          }}
        >
          Predictive Papers hub
        </h1>
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            fontSize: "0.95rem",
            maxWidth: 760,
          }}
        >
          Ten AI-assisted <strong>80-mark mock papers</strong>, built from your
          high-probability question pool. Pick a paper, launch it into the{" "}
          <strong>Auto-mock Paper</strong> view, and print or attempt it like a
          real CBSE board paper.
        </p>
      </header>

      {/* Cards grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 16,
        }}
      >
        {predictivePapers.map((paper) => {
          const { A = 0, B = 0, C = 0, D = 0, E = 0 } = paper.sectionMarks;

          return (
            <button
              key={paper.id}
              type="button"
              onClick={() => openPaper(paper)}
              style={{
                textAlign: "left",
                borderRadius: 24,
                padding: "14px 14px 16px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                cursor: "pointer",
                boxShadow: "0 18px 40px rgba(148,163,184,0.3)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: "0.8rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#6b7280",
                }}
              >
                Paper {paper.id.replace("P", "")}
              </div>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                {paper.title}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#4b5563",
                }}
              >
                {paper.vibe}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                }}
              >
                {paper.tagline}
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding: "8px 10px",
                  borderRadius: 999,
                  background: "#0f172a",
                  color: "#e5e7eb",
                  fontSize: "0.8rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span>{paper.markTotal} marks</span>
                <span
                  style={{
                    opacity: 0.85,
                  }}
                >
                  A:{A} · B:{B} · C:{C} · D:{D} · E:{E}
                </span>
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: "0.8rem",
                  color: "#2563eb",
                  fontWeight: 500,
                }}
              >
                Launch paper → Auto-mock view
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PredictivePapersPage;
