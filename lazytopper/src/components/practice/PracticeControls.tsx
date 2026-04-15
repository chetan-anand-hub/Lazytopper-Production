
import type { DifficultyChoice } from "./practiceQuestionBuilder";
import { MIN_QUESTION_COUNT, MAX_QUESTION_COUNT } from "./practiceQuestionBuilder";

export interface PracticeControlsProps {
  difficulty: DifficultyChoice;
  onSetDifficulty: (d: DifficultyChoice) => void;
  sectionFilter: string;
  onSetSectionFilter: (s: string) => void;
  questionCount: number;
  onSetQuestionCount: (n: number) => void;
  onRegenerate: () => void;
}

export function PracticeControls({
  difficulty, onSetDifficulty,
  sectionFilter, onSetSectionFilter,
  questionCount, onSetQuestionCount,
  onRegenerate,
}: PracticeControlsProps) {
  return (
    <>
      <section
        style={{
          display: "flex", flexWrap: "wrap", gap: 10,
          alignItems: "center", justifyContent: "space-between", marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: 4 }}>
            Difficulty:
          </span>
          {(["All", "Easy", "Medium", "Hard"] as DifficultyChoice[]).map((level) => {
            const active = difficulty === level;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onSetDifficulty(level)}
                style={{
                  borderRadius: 999, padding: "4px 10px",
                  border: active ? "1px solid rgba(28,176,246,0.85)" : "1px solid var(--bg-card-border)",
                  backgroundColor: active ? "#3b82f6" : "var(--bg-card)",
                  color: active ? "#f9fafb" : "var(--text)",
                  fontSize: "0.75rem", cursor: "pointer",
                  boxShadow: active ? "0 6px 16px rgba(28,176,246,0.3)" : "none",
                }}
              >
                {level === "All" ? "All levels" : level}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Type:</span>
          <select
            value={sectionFilter}
            onChange={(e) => onSetSectionFilter(e.target.value)}
            style={{
              borderRadius: 999, border: "1px solid var(--bg-card-border)",
              padding: "4px 10px", fontSize: "0.78rem",
              background: "var(--bg-card)", color: "var(--text)", cursor: "pointer",
            }}
          >
            <option value="ALL">All</option>
            <option value="A">A (1m)</option>
            <option value="B">B (2m)</option>
            <option value="C">C (3m)</option>
            <option value="D">D (5m)</option>
            <option value="E">E (Case, 4m)</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Questions:{" "}
            <input
              type="number"
              min={MIN_QUESTION_COUNT}
              max={MAX_QUESTION_COUNT}
              value={questionCount}
              onChange={(e) =>
                onSetQuestionCount(
                  Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, Number(e.target.value) || 0))
                )
              }
              style={{
                width: 56, borderRadius: 999,
                border: "1px solid var(--bg-card-border)", padding: "3px 8px",
                fontSize: "0.78rem", marginLeft: 4,
                background: "var(--bg)", color: "var(--text)",
              }}
            />
          </label>
          <button
            type="button"
            onClick={onRegenerate}
            style={{
              borderRadius: 999, padding: "5px 12px",
              border: "1px solid rgba(88,204,2,0.8)",
              backgroundColor: "#22c55e", color: "#052e16",
              fontSize: "0.78rem", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            Regenerate set
          </button>
          <button
            type="button"
            onClick={() =>
              onSetQuestionCount(
                Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, questionCount + 10))
              )
            }
            style={{
              borderRadius: 999, padding: "5px 12px",
              border: "1px solid rgba(28,176,246,0.6)",
              backgroundColor: "rgba(59,130,246,0.12)",
              color: "var(--text)", fontSize: "0.78rem", cursor: "pointer",
            }}
            title="Demand 10 more questions for this topic"
          >
            +10 more
          </button>
        </div>
      </section>

      <section style={{ marginBottom: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Fast drill presets:</span>
        {[10, 20, 40, 60, 100].map((count) => (
          <button
            key={count}
            type="button"
            className="lt-pill"
            style={{ padding: "4px 10px", fontSize: "0.74rem" }}
            onClick={() => onSetQuestionCount(Math.max(MIN_QUESTION_COUNT, Math.min(MAX_QUESTION_COUNT, count)))}
          >
            {count}Q
          </button>
        ))}
        <span className="lt-desktop-only" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          Shortcut: Alt+1/2/3/4/5 and Alt+R.
        </span>
      </section>
    </>
  );
}
