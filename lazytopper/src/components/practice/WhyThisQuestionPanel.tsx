import type { QuestionMeta, LearningObject } from "../../data/contentStrategy/types";

export interface WhyThisQuestionPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  activeQuestionNumber: number | null;
  meta: QuestionMeta | null;
  learningObjects: LearningObject[];
  commonMistakes: string[];
  boardWritingTip: string;
}

export function WhyThisQuestionPanel({
  isOpen,
  onToggle,
  activeQuestionNumber,
  meta,
  learningObjects,
  commonMistakes,
  boardWritingTip,
}: WhyThisQuestionPanelProps) {
  return (
    <section
      data-testid="practice-why-panel"
      style={{
        marginBottom: 12,
        borderRadius: 16,
        border: "1px solid rgba(28,176,246,0.28)",
        background: "rgba(59,130,246,0.06)",
        boxShadow: "0 8px 22px rgba(0,0,0,0.3)",
        overflow: "hidden",
      }}
    >
      <button
        data-testid="practice-why-panel-toggle"
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          border: "none",
          borderBottom: isOpen ? "1px solid rgba(28,176,246,0.2)" : "none",
          background: "rgba(28,176,246,0.08)",
          color: "#1e3a8a",
          padding: "10px 12px",
          cursor: "pointer",
          fontWeight: 800,
          fontSize: "0.84rem",
          textAlign: "left",
        }}
        aria-expanded={isOpen}
      >
        <span>
          Why this question?
          {activeQuestionNumber ? ` (Q${activeQuestionNumber})` : ""}
        </span>
        <span style={{ fontSize: "0.76rem" }}>{isOpen ? "Hide" : "Show"}</span>
      </button>

      {isOpen && (
        <div style={{ padding: "12px 12px 10px" }}>
          {meta ? (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {meta.skillFamily && (
                  <span style={{
                    fontSize: "0.73rem", borderRadius: 999, padding: "3px 9px",
                    background: "rgba(28,176,246,0.12)", color: "#60a5fa",
                    border: "1px solid rgba(28,176,246,0.2)",
                  }}>
                    Skill: {meta.skillFamily}
                  </span>
                )}
                {meta.cbseFormat && (
                  <span style={{
                    fontSize: "0.73rem", borderRadius: 999, padding: "3px 9px",
                    background: "rgba(88,204,2,0.12)", color: "#155e75",
                    border: "1px solid rgba(88,204,2,0.2)",
                  }}>
                    CBSE format: {meta.cbseFormat}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                    Learning objects
                  </div>
                  {learningObjects.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.45 }}>
                      {learningObjects.map((lo) => (
                        <li key={lo.loId}>
                          <strong>{lo.title}:</strong> {lo.description}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Learning objects are being mapped for this question.
                    </div>
                  )}
                </div>

                {commonMistakes.length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                      Common mistakes
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.45 }}>
                      {commonMistakes.map((mistake) => (
                        <li key={mistake}>{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {boardWritingTip && (
                  <div style={{
                    borderRadius: 10, border: "1px solid rgba(88,204,2,0.2)",
                    background: "rgba(59,130,246,0.06)", padding: "8px 10px",
                    fontSize: "0.78rem", color: "#164e63", lineHeight: 1.45,
                  }}>
                    <strong>Board writing tip:</strong> {boardWritingTip}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              This question isn&apos;t tagged yet. Practice normally.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
