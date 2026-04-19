
import type { DifficultyChoice } from "./practiceQuestionBuilder";
import { MIN_QUESTION_COUNT, MAX_QUESTION_COUNT } from "./practiceQuestionBuilder";
import { WORKSHEET_MAX_QUESTIONS } from "./worksheetGenerator";

export interface PracticeControlsProps {
  difficulty: DifficultyChoice;
  onSetDifficulty: (d: DifficultyChoice) => void;
  sectionFilter: string;
  onSetSectionFilter: (s: string) => void;
  questionCount: number;
  onSetQuestionCount: (n: number) => void;
  onRegenerate: () => void;
  onDownloadWorksheet?: () => void;
  onCopyLink?: () => void;
  linkCopied?: boolean;
  hasQuestions?: boolean;
  visibleQuestionCount?: number;
}

export function PracticeControls({
  difficulty, onSetDifficulty,
  sectionFilter, onSetSectionFilter,
  questionCount, onSetQuestionCount,
  onRegenerate,
  onDownloadWorksheet,
  onCopyLink,
  linkCopied = false,
  hasQuestions,
  visibleQuestionCount = 0,
}: PracticeControlsProps) {
  const willTruncate = visibleQuestionCount > WORKSHEET_MAX_QUESTIONS;
  return (
    <>
      <section
        className="practice-controls-root"
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
          {onCopyLink && hasQuestions && (
            <button
              type="button"
              onClick={onCopyLink}
              title="Copy a shareable link to this exact question set"
              style={{
                borderRadius: 999, padding: "5px 12px",
                border: linkCopied ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(99,102,241,0.7)",
                backgroundColor: "var(--bg-card)",
                color: linkCopied ? "#4ade80" : "#818cf8",
                fontSize: "0.78rem", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
                transition: "color 0.2s, border-color 0.2s",
              }}
            >
              {linkCopied ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              )}
              {linkCopied ? "Link copied!" : "Copy link"}
            </button>
          )}
          {onDownloadWorksheet && hasQuestions && (
            <button
              type="button"
              onClick={onDownloadWorksheet}
              title={
                willTruncate
                  ? `PDF will include first ${WORKSHEET_MAX_QUESTIONS} of ${visibleQuestionCount} questions`
                  : "Download printable worksheet (PDF)"
              }
              style={{
                borderRadius: 999, padding: "5px 12px",
                border: "1px solid rgba(99,102,241,0.7)",
                backgroundColor: "var(--bg-card)", color: "#818cf8",
                fontSize: "0.78rem", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {willTruncate
                ? `Download PDF (first ${WORKSHEET_MAX_QUESTIONS})`
                : "Download PDF"}
            </button>
          )}
        </div>
      </section>

    </>
  );
}
