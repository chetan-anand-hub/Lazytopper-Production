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
    navigate(`/mock-paper/${paper.slug}`);
  };

  const startExamSimulation = (subject: "Maths" | "Science") => {
    navigate(`/exam-simulation?subject=${subject}`, {
      state: { back: "/predictive-papers", backLabel: "Back to papers" },
    });
  };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingBottom: 60,
      }}
    >
      <header
        style={{
          borderRadius: 32,
          padding: "22px 22px 24px",
          background:
            "linear-gradient(135deg,rgba(88,204,2,0.98),rgba(28,176,246,0.95))",
          color: "rgba(255,255,255,0.6)",
          boxShadow: "0 26px 70px rgba(88,204,2,0.3)",
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
          Class 10 • Maths & Science • Prediction Engine
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "2.1rem",
            lineHeight: 1.2,
          }}
        >
          Predictive Papers Hub
        </h1>
        <p
          style={{
            marginTop: 10,
            marginBottom: 0,
            fontSize: "0.95rem",
            maxWidth: 760,
          }}
        >
          Curated AI-assisted <strong>80-mark mock papers</strong> plus{" "}
          <strong>unlimited exam simulations</strong> with a 3-hour timer,
          section navigation, internal choice, and deep analytics.
        </p>
      </header>

      <div style={{
        display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap",
      }}>
        <button
          onClick={() => startExamSimulation("Maths")}
          style={{
            flex: "1 1 240px", padding: "20px 24px", borderRadius: 20,
            background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
            color: "#fff", border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
            Exam Simulation
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 6 }}>
            Maths — Unlimited Mock
          </div>
          <div style={{ fontSize: "0.82rem", opacity: 0.8 }}>
            80 marks · 3hr timer · Internal choice · Auto-submit · Deep analytics
          </div>
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#58cc02", fontWeight: 600 }}>
            Start Mock →
          </div>
        </button>

        <button
          onClick={() => startExamSimulation("Science")}
          style={{
            flex: "1 1 240px", padding: "20px 24px", borderRadius: 20,
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
            color: "#fff", border: "none", cursor: "pointer", textAlign: "left",
            boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          }}
        >
          <div style={{ fontSize: "0.68rem", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.7, marginBottom: 4 }}>
            Exam Simulation
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: 6 }}>
            Science — Unlimited Mock
          </div>
          <div style={{ fontSize: "0.82rem", opacity: 0.8 }}>
            80 marks · 3hr timer · Internal choice · Auto-submit · Deep analytics
          </div>
          <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#38bdf8", fontWeight: 600 }}>
            Start Mock →
          </div>
        </button>
      </div>

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
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer",
                boxShadow: "0 18px 40px rgba(0,0,0,0.08)",
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
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                Paper {paper.id.replace("P", "")}
              </div>
              <div
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {paper.title}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {paper.vibe}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {paper.tagline}
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding: "8px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.6)",
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
                  color: "#1cb0f6",
                  fontWeight: 500,
                }}
              >
                Start Mock →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PredictivePapersPage;
