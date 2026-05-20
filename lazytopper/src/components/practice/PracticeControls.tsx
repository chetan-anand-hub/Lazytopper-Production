
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
  // PR-K2H-8c — optional Question Type + PYQ filters.
  questionType?: string;
  onSetQuestionType?: (t: string) => void;
  pyqOnly?: boolean;
  onSetPyqOnly?: (v: boolean) => void;
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
  questionType,
  onSetQuestionType,
  pyqOnly,
  onSetPyqOnly,
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
          display: "flex", flexDirection: "column", gap: 14,
          marginBottom: 18,
          padding: 18,
          borderRadius: 14,
          background: "#ffffff",
          border: "1px solid hsl(220, 18%, 90%)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.12rem",
                fontWeight: 600,
                color: "hsl(220, 25%, 12%)",
                letterSpacing: "-0.01em",
                margin: "0 0 4px",
              }}
            >
              Build this set
            </h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "hsl(220, 15%, 42%)", lineHeight: 1.55 }}>
              Adjust level, type, and count without leaving the workspace.
            </p>
          </div>
        </div>

        <div
          style={{
            paddingTop: 14,
            borderTop: "1px solid hsl(220, 18%, 90%)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              minWidth: 110,
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "hsl(220, 15%, 42%)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Question level
            </span>
            {(["All", "Easy", "Medium", "Hard"] as DifficultyChoice[]).map((level) => {
              const active = difficulty === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => onSetDifficulty(level)}
                  style={{
                    borderRadius: 999,
                    padding: "5px 11px",
                    border: active ? "1px solid hsl(152, 55%, 45%)" : "1px solid hsl(220, 18%, 90%)",
                    backgroundColor: active ? "hsl(152, 55%, 95%)" : "#ffffff",
                    color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
                    fontSize: "0.76rem",
                    cursor: "pointer",
                    fontWeight: active ? 700 : 600,
                  }}
                >
                  {level === "All" ? "All levels" : level}
                </button>
              );
            })}
          </div>

          {/* PR-K2H-8c — Section row (chips replace the old <select> dropdown). */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              minWidth: 110,
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "hsl(220, 15%, 42%)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Section
            </span>
            {([
              { value: "ALL", label: "All" },
              { value: "A",   label: "A · 1mk" },
              { value: "B",   label: "B · 2mk" },
              { value: "C",   label: "C · 3mk" },
              { value: "D",   label: "D · 5mk" },
              { value: "E",   label: "E · Case (4mk)" },
            ]).map(({ value, label }) => {
              const active = sectionFilter === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSetSectionFilter(value)}
                  style={{
                    borderRadius: 999,
                    padding: "5px 11px",
                    border: active ? "1px solid hsl(152, 55%, 45%)" : "1px solid hsl(220, 18%, 90%)",
                    backgroundColor: active ? "hsl(152, 55%, 95%)" : "#ffffff",
                    color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
                    fontSize: "0.76rem",
                    cursor: "pointer",
                    fontWeight: active ? 700 : 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* PR-K2H-8c — Question Type row (optional, only when handler provided). */}
          {onSetQuestionType && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{
                minWidth: 110,
                fontSize: "0.74rem",
                fontWeight: 800,
                color: "hsl(220, 15%, 42%)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}>
                Type
              </span>
              {([
                { value: "All",         label: "All types" },
                { value: "MCQ",         label: "MCQ" },
                { value: "Proof",       label: "Proof" },
                { value: "Competency",  label: "Competency" },
                { value: "AR",          label: "Assertion-Reason" },
                { value: "Case",        label: "Case-based" },
              ]).map(({ value, label }) => {
                const active = (questionType ?? "All") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSetQuestionType(value)}
                    style={{
                      borderRadius: 999,
                      padding: "5px 11px",
                      border: active ? "1px solid hsl(152, 55%, 45%)" : "1px solid hsl(220, 18%, 90%)",
                      backgroundColor: active ? "hsl(152, 55%, 95%)" : "#ffffff",
                      color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
                      fontSize: "0.76rem",
                      cursor: "pointer",
                      fontWeight: active ? 700 : 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              minWidth: 110,
              fontSize: "0.74rem",
              fontWeight: 800,
              color: "hsl(220, 15%, 42%)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              Questions
            </span>
            {/* PR-K2H-8c — Count presets. Number input still available for custom counts. */}
            {[5, 10, 15, 20].map((n) => {
              const active = questionCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSetQuestionCount(n)}
                  style={{
                    borderRadius: 999,
                    padding: "5px 11px",
                    border: active ? "1px solid hsl(152, 55%, 45%)" : "1px solid hsl(220, 18%, 90%)",
                    backgroundColor: active ? "hsl(152, 55%, 95%)" : "#ffffff",
                    color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
                    fontSize: "0.76rem",
                    cursor: "pointer",
                    fontWeight: active ? 700 : 600,
                  }}
                >
                  {n}
                </button>
              );
            })}
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
                border: "1px solid hsl(220, 18%, 90%)", padding: "7px 10px",
                fontSize: "0.85rem",
                background: "#ffffff", color: "hsl(220, 25%, 12%)",
                marginTop: 0,
                marginBottom: 0,
              }}
            />
            <button
              type="button"
              onClick={onRegenerate}
              style={{
                borderRadius: 8, padding: "8px 14px",
                border: "1px solid hsl(152, 55%, 45%)",
                backgroundColor: "hsl(152, 55%, 45%)", color: "#ffffff",
                fontSize: "0.78rem", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontWeight: 800,
              }}
            >
              Build new set
            </button>
            {onCopyLink && hasQuestions && (
            <button
              type="button"
              onClick={onCopyLink}
              title="Copy a shareable link to this exact question set"
              style={{
                borderRadius: 8, padding: "8px 12px",
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
                borderRadius: 8, padding: "8px 12px",
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

          {/* PR-K2H-8c — PYQ toggle (optional, only when handler provided). */}
          {onSetPyqOnly && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <label style={{
                display: "flex", alignItems: "center", gap: 8,
                cursor: "pointer", userSelect: "none",
              }}>
                <input
                  type="checkbox"
                  checked={pyqOnly ?? false}
                  onChange={(e) => onSetPyqOnly(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "hsl(152, 55%, 45%)", cursor: "pointer" }}
                />
                <span style={{
                  fontSize: "0.80rem", fontWeight: 700,
                  color: "hsl(220, 25%, 12%)",
                }}>
                  Previous Year Questions only
                </span>
              </label>
              {pyqOnly && (
                <span style={{
                  fontSize: "0.72rem",
                  color: "hsl(152, 55%, 32%)",
                  background: "hsl(152, 55%, 95%)",
                  border: "1px solid hsl(152, 55%, 80%)",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontWeight: 700,
                }}>
                  PYQ
                </span>
              )}
            </div>
          )}
        </div>
      </section>

    </>
  );
}
