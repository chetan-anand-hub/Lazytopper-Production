
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
          alignItems: "center", justifyContent: "space-between",
          marginBottom: 18,
          padding: "14px",
          borderRadius: 14,
          background: "#ffffff",
          border: "1px solid hsl(220, 18%, 90%)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "hsl(220, 15%, 42%)", marginRight: 4, fontWeight: 700 }}>
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
                  border: active ? "1px solid hsl(152, 55%, 45%)" : "1px solid hsl(220, 18%, 90%)",
                  backgroundColor: active ? "hsl(152, 55%, 95%)" : "#ffffff",
                  color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 25%, 12%)",
                  fontSize: "0.75rem", cursor: "pointer",
                  fontWeight: active ? 700 : 600,
                }}
              >
                {level === "All" ? "All levels" : level}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", color: "hsl(220, 15%, 42%)", fontWeight: 700 }}>Type:</span>
          <select
            value={sectionFilter}
            onChange={(e) => onSetSectionFilter(e.target.value)}
            style={{
              borderRadius: 10, border: "1px solid hsl(220, 18%, 90%)",
              padding: "4px 10px", fontSize: "0.78rem",
              background: "#ffffff", color: "hsl(220, 25%, 12%)", cursor: "pointer",
              width: "auto",
              margin: 0,
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
          <label style={{ fontSize: "0.78rem", color: "hsl(220, 15%, 42%)", fontWeight: 700, margin: 0 }}>
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
                width: 58, borderRadius: 10,
                border: "1px solid hsl(220, 18%, 90%)", padding: "3px 8px",
                fontSize: "0.78rem", marginLeft: 4,
                background: "#ffffff", color: "hsl(220, 25%, 12%)",
                marginTop: 0,
                marginBottom: 0,
              }}
            />
          </label>
          <button
            type="button"
            onClick={onRegenerate}
            style={{
              borderRadius: 10, padding: "7px 12px",
              border: "1px solid hsl(152, 55%, 45%)",
              backgroundColor: "hsl(152, 55%, 45%)", color: "#ffffff",
              fontSize: "0.78rem", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontWeight: 700,
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
                borderRadius: 10, padding: "7px 12px",
                border: linkCopied ? "1px solid hsl(152, 55%, 45%)" : "1px solid hsl(220, 18%, 82%)",
                backgroundColor: linkCopied ? "hsl(152, 55%, 95%)" : "#ffffff",
                color: linkCopied ? "hsl(152, 55%, 28%)" : "hsl(220, 25%, 12%)",
                fontSize: "0.78rem", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
                transition: "color 0.2s, border-color 0.2s",
                fontWeight: 600,
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
                borderRadius: 10, padding: "7px 12px",
                border: "1px solid hsl(220, 18%, 82%)",
                backgroundColor: "#ffffff", color: "hsl(220, 25%, 12%)",
                fontSize: "0.78rem", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
                fontWeight: 600,
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
