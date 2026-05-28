
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WORKSHEET_MAX_QUESTIONS } from "./worksheetGenerator";

const MARKS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "1", label: "1 mark" },
  { value: "23", label: "2-3 marks" },
  { value: "5", label: "5 marks" },
  { value: "4", label: "Case-based (4)" },
];

const STYLE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "proof", label: "Proof / Identity" },
  { value: "ar", label: "Assertion-Reason" },
  { value: "hots", label: "HOTS" },
  { value: "case", label: "Case-based" },
];

const SOURCE_OPTIONS = [
  { value: "all", label: "All questions" },
  { value: "pyq", label: "Board exam (PYQ)" },
  { value: "ncert", label: "NCERT / Exemplar" },
  { value: "others", label: "Others" },
];

const DIFFICULTY_OPTIONS = [
  { value: "all", label: "All levels" },
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
];

const COUNT_PRESETS = [5, 10, 15, 20];
const COUNT_SOFT_MAX = 20;

const SOURCE_NOTES: Record<string, string> = {
  pyq: "Exactly as appeared in CBSE question papers.",
  ncert: "From official NCERT textbooks and Exemplar - the syllabus source.",
  others:
    "Practice questions from AI generation and reference books (RD Sharma, PW etc.) - useful when PYQ and NCERT run short.",
};

const STYLE_COMPAT: Record<string, Set<string>> = {
  all: new Set(["all", "proof", "ar", "hots", "case"]),
  "1": new Set(["all", "ar"]),
  "23": new Set(["all", "proof", "hots"]),
  "5": new Set(["all", "proof", "hots"]),
  "4": new Set(["all", "case"]),
};
// Reverse direction: given a Style selection, which Marks chips are compatible?
// Mirrors STYLE_COMPAT so chips grey out symmetrically in both directions.
const MARKS_COMPAT_BY_STYLE: Record<string, Set<string>> = {
  all: new Set(["all", "1", "23", "5", "4"]),
  proof: new Set(["all", "23", "5"]),
  ar: new Set(["all", "1"]),
  hots: new Set(["all", "23", "5"]),
  case: new Set(["all", "4"]),
};
const DIFF_COMPAT_BY_MARKS: Record<string, Set<string>> = {
  all: new Set(["all", "Easy", "Medium", "Hard"]),
  "1": new Set(["all", "Easy", "Medium"]),
  "23": new Set(["all", "Easy", "Medium", "Hard"]),
  "5": new Set(["all", "Medium", "Hard"]),
  "4": new Set(["all", "Medium", "Hard"]),
};

export interface PracticeControlsProps {
  // Pending state — drives chip UI and the live "N available" hint.
  pendingMarks: string;
  pendingStyle: string;
  pendingSource: string;
  pendingDifficulty: string;
  pendingCount: number;
  availableCount: number;

  onSetMarks: (v: string) => void;
  onSetStyle: (v: string) => void;
  onSetSource: (v: string) => void;
  onSetDifficulty: (v: string) => void;
  onSetCount: (v: number) => void;
  onClearFilters: () => void;

  // Committed state — drives the summary bar shown after Build.
  committedMarks: string;
  committedStyle: string;
  committedSource: string;
  committedDifficulty: string;
  committedCount: number;

  onBuildSet: () => void;
  isBuilt: boolean;
  onEditFilters: () => void;

  hasQuestions: boolean;
  visibleQuestionCount: number;
  linkCopied: boolean;
  onCopyLink: () => void;
  onDownloadPdf: () => void;
  onRegenerate?: () => void;
}

function chipStyle(
  active: boolean,
  disabled: boolean,
): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "5px 11px",
    border: active
      ? "1px solid hsl(152, 55%, 45%)"
      : "1px solid hsl(220, 18%, 90%)",
    backgroundColor: active ? "hsl(152, 55%, 95%)" : "#ffffff",
    color: active ? "hsl(152, 55%, 28%)" : "hsl(220, 15%, 42%)",
    fontSize: "0.76rem",
    cursor: disabled ? "default" : "pointer",
    fontWeight: active ? 700 : 600,
    whiteSpace: "nowrap",
    opacity: disabled ? 0.3 : 1,
    pointerEvents: disabled ? "none" : "auto",
  };
}

const ROW_LABEL_STYLE: React.CSSProperties = {
  minWidth: 110,
  fontSize: "0.74rem",
  fontWeight: 800,
  color: "hsl(220, 15%, 42%)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const ROW_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
};

const NOTE_STYLE: React.CSSProperties = {
  marginLeft: 118,
  fontSize: "0.72rem",
  color: "hsl(220, 15%, 42%)",
  fontStyle: "italic",
};

function labelFor(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function PracticeControls({
  pendingMarks,
  pendingStyle,
  pendingSource,
  pendingDifficulty,
  pendingCount,
  availableCount,
  onSetMarks,
  onSetStyle,
  onSetSource,
  onSetDifficulty,
  onSetCount,
  onClearFilters,
  committedMarks,
  committedStyle,
  committedSource,
  committedDifficulty,
  committedCount,
  onBuildSet,
  isBuilt,
  onEditFilters,
  hasQuestions,
  visibleQuestionCount,
  linkCopied,
  onCopyLink,
  onDownloadPdf,
  onRegenerate,
}: PracticeControlsProps) {
  const willTruncate = visibleQuestionCount > WORKSHEET_MAX_QUESTIONS;
  const navigate = useNavigate();

  const compatibleStyles = STYLE_COMPAT[pendingMarks] ?? STYLE_COMPAT.all;
  const compatibleMarks = MARKS_COMPAT_BY_STYLE[pendingStyle] ?? MARKS_COMPAT_BY_STYLE.all;
  // HOTS overrides the marks-based difficulty rules — only "Hard" is allowed.
  const compatibleDiffs = pendingStyle === "hots"
    ? new Set(["Hard"])
    : (DIFF_COMPAT_BY_MARKS[pendingMarks] ?? DIFF_COMPAT_BY_MARKS.all);

  // Auto-reset style/marks/difficulty when current selection becomes incompatible.
  useEffect(() => {
    if (pendingStyle !== "all" && !compatibleStyles.has(pendingStyle)) {
      onSetStyle("all");
    }
    if (pendingMarks !== "all" && !compatibleMarks.has(pendingMarks)) {
      onSetMarks("all");
    }
    if (pendingDifficulty !== "all" && !compatibleDiffs.has(pendingDifficulty)) {
      onSetDifficulty(pendingStyle === "hots" ? "Hard" : "all");
    }
  }, [pendingMarks, pendingStyle, pendingDifficulty, compatibleStyles, compatibleMarks, compatibleDiffs, onSetStyle, onSetMarks, onSetDifficulty]);

  if (isBuilt) {
    const badges: { key: string; label: string }[] = [
      { key: "count", label: `${committedCount} questions` },
    ];
    if (committedMarks !== "all") badges.push({ key: "marks", label: labelFor(MARKS_OPTIONS, committedMarks) });
    if (committedStyle !== "all") badges.push({ key: "style", label: labelFor(STYLE_OPTIONS, committedStyle) });
    if (committedSource !== "all") badges.push({ key: "source", label: labelFor(SOURCE_OPTIONS, committedSource) });
    if (committedDifficulty !== "all") badges.push({ key: "diff", label: labelFor(DIFFICULTY_OPTIONS, committedDifficulty) });
    const allDefault =
      committedMarks === "all" && committedStyle === "all" &&
      committedSource === "all" && committedDifficulty === "all";

    return (
      <section
        className="practice-controls-root"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
          padding: "12px 16px",
          borderRadius: 14,
          background: "#ffffff",
          border: "1px solid hsl(220, 18%, 90%)",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {badges.map((b) => (
            <span
              key={b.key}
              style={{
                fontSize: "0.76rem",
                fontWeight: 700,
                color: "hsl(152, 55%, 28%)",
                background: "hsl(152, 55%, 95%)",
                border: "1px solid hsl(152, 55%, 80%)",
                borderRadius: 999,
                padding: "4px 10px",
              }}
            >
              {b.label}
            </span>
          ))}
          {allDefault && (
            <span
              style={{
                fontSize: "0.76rem",
                fontWeight: 600,
                color: "hsl(220, 15%, 42%)",
                background: "hsl(210, 33%, 96%)",
                border: "1px solid hsl(220, 18%, 90%)",
                borderRadius: 999,
                padding: "4px 10px",
              }}
            >
              All questions - mixed
            </span>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {onCopyLink && hasQuestions && (
            <button
              type="button"
              onClick={onCopyLink}
              title="Copy a shareable link to this exact question set"
              style={{
                borderRadius: 8,
                padding: "7px 11px",
                border: linkCopied ? "1px solid hsl(152, 55%, 45%)" : "1px solid hsl(220, 18%, 82%)",
                backgroundColor: linkCopied ? "hsl(152, 55%, 95%)" : "#ffffff",
                color: linkCopied ? "hsl(152, 55%, 28%)" : "hsl(220, 25%, 12%)",
                fontSize: "0.76rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {linkCopied ? "Link copied!" : "Copy link"}
            </button>
          )}
          {hasQuestions && (
            <button
              type="button"
              onClick={onDownloadPdf}
              title={
                willTruncate
                  ? `PDF will include first ${WORKSHEET_MAX_QUESTIONS} of ${visibleQuestionCount} questions`
                  : "Download printable worksheet (PDF)"
              }
              style={{
                borderRadius: 8,
                padding: "7px 11px",
                border: "1px solid hsl(220, 18%, 82%)",
                backgroundColor: "#ffffff",
                color: "hsl(220, 25%, 12%)",
                fontSize: "0.76rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {willTruncate
                ? `Download PDF (first ${WORKSHEET_MAX_QUESTIONS})`
                : "Download PDF"}
            </button>
          )}
          {onRegenerate && hasQuestions && (
            <button
              type="button"
              onClick={onRegenerate}
              style={{
                borderRadius: 8,
                padding: "7px 11px",
                border: "1px solid hsl(220, 18%, 82%)",
                backgroundColor: "#ffffff",
                color: "hsl(220, 25%, 12%)",
                fontSize: "0.76rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Refresh set
            </button>
          )}
          <button
            type="button"
            onClick={onEditFilters}
            style={{
              borderRadius: 8,
              padding: "8px 14px",
              border: "1px solid hsl(152, 55%, 45%)",
              backgroundColor: "hsl(152, 55%, 45%)",
              color: "#ffffff",
              fontSize: "0.78rem",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Edit filters
          </button>
        </div>
      </section>
    );
  }

  const showStyleConstraintNote =
    pendingMarks !== "all" &&
    STYLE_OPTIONS.some((o) => !compatibleStyles.has(o.value));
  const showMarksConstraintNote =
    pendingStyle !== "all" &&
    MARKS_OPTIONS.some((o) => !compatibleMarks.has(o.value));

  return (
    <FilterPanel
      pendingMarks={pendingMarks}
      pendingStyle={pendingStyle}
      pendingSource={pendingSource}
      pendingDifficulty={pendingDifficulty}
      pendingCount={pendingCount}
      availableCount={availableCount}
      compatibleStyles={compatibleStyles}
      compatibleMarks={compatibleMarks}
      compatibleDiffs={compatibleDiffs}
      showStyleConstraintNote={showStyleConstraintNote}
      showMarksConstraintNote={showMarksConstraintNote}
      onSetMarks={onSetMarks}
      onSetStyle={onSetStyle}
      onSetSource={onSetSource}
      onSetDifficulty={onSetDifficulty}
      onSetCount={onSetCount}
      onClearFilters={onClearFilters}
      onBuildSet={onBuildSet}
      onOpenWorksheet={() => navigate("/practice/worksheets")}
    />
  );
}

interface FilterPanelProps {
  pendingMarks: string;
  pendingStyle: string;
  pendingSource: string;
  pendingDifficulty: string;
  pendingCount: number;
  availableCount: number;
  compatibleStyles: Set<string>;
  compatibleMarks: Set<string>;
  compatibleDiffs: Set<string>;
  showStyleConstraintNote: boolean;
  showMarksConstraintNote: boolean;
  onSetMarks: (v: string) => void;
  onSetStyle: (v: string) => void;
  onSetSource: (v: string) => void;
  onSetDifficulty: (v: string) => void;
  onSetCount: (v: number) => void;
  onClearFilters: () => void;
  onBuildSet: () => void;
  onOpenWorksheet: () => void;
}

function FilterPanel({
  pendingMarks,
  pendingStyle,
  pendingSource,
  pendingDifficulty,
  pendingCount,
  availableCount,
  compatibleStyles,
  compatibleMarks,
  compatibleDiffs,
  showStyleConstraintNote,
  showMarksConstraintNote,
  onSetMarks,
  onSetStyle,
  onSetSource,
  onSetDifficulty,
  onSetCount,
  onClearFilters,
  onBuildSet,
  onOpenWorksheet,
}: FilterPanelProps) {
  const isHots = pendingStyle === "hots";
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const handleLocalClear = () => {
    setNudgeVisible(false);
    onClearFilters();
  };

  return (
    <section
      className="practice-controls-root"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        marginBottom: 18,
        padding: 18,
        borderRadius: 14,
        background: "#ffffff",
        border: "1px solid hsl(220, 18%, 90%)",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
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
          Filters are optional - tap Build for a balanced mixed set, or narrow down by marks, style or source.
        </p>
      </div>

      <div
        style={{
          paddingTop: 14,
          borderTop: "1px solid hsl(220, 18%, 90%)",
          display: "grid",
          gap: 10,
        }}
      >
        {/* MARKS row */}
        <div style={ROW_STYLE}>
          <span style={ROW_LABEL_STYLE}>Marks</span>
          {MARKS_OPTIONS.map((opt) => {
            const active = pendingMarks === opt.value;
            const disabled = !compatibleMarks.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSetMarks(opt.value)}
                style={chipStyle(active, disabled)}
                aria-disabled={disabled}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {showMarksConstraintNote && (
          <div style={NOTE_STYLE}>
            Greyed chips not available for selected style
          </div>
        )}

        {/* STYLE row */}
        <div style={ROW_STYLE}>
          <span style={ROW_LABEL_STYLE}>Style</span>
          {STYLE_OPTIONS.map((opt) => {
            const active = pendingStyle === opt.value;
            const disabled = !compatibleStyles.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSetStyle(opt.value)}
                style={chipStyle(active, disabled)}
                aria-disabled={disabled}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {showStyleConstraintNote && (
          <div style={NOTE_STYLE}>
            Greyed chips not available for selected marks
          </div>
        )}

        {/* SOURCE row */}
        <div style={ROW_STYLE}>
          <span style={ROW_LABEL_STYLE}>Source</span>
          {SOURCE_OPTIONS.map((opt) => {
            const active = pendingSource === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSetSource(opt.value)}
                style={chipStyle(active, false)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {SOURCE_NOTES[pendingSource] && (
          <div style={NOTE_STYLE}>{SOURCE_NOTES[pendingSource]}</div>
        )}

        {/* DIFFICULTY row */}
        <div style={ROW_STYLE}>
          <span style={ROW_LABEL_STYLE}>Difficulty</span>
          {DIFFICULTY_OPTIONS.map((opt) => {
            const active = pendingDifficulty === opt.value;
            const disabled = !compatibleDiffs.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSetDifficulty(opt.value)}
                style={chipStyle(active, disabled)}
                aria-disabled={disabled}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {isHots && (
          <div style={NOTE_STYLE}>HOTS questions are always Hard difficulty</div>
        )}

        {/* QUESTIONS row */}
        <div
          style={{
            ...ROW_STYLE,
            paddingTop: 6,
            borderTop: "1px dashed hsl(220, 18%, 92%)",
            marginTop: 4,
          }}
        >
          <span style={ROW_LABEL_STYLE}>Questions</span>
          <CountChip
            value={pendingCount}
            onSetCount={onSetCount}
            onOverflowChange={setNudgeVisible}
          />
          <span
            style={{
              fontSize: "0.74rem",
              fontWeight: 600,
              color: "hsl(220, 15%, 42%)",
            }}
          >
            {availableCount} available
          </span>
        </div>

        {nudgeVisible && (
          <div
            style={{
              marginTop: 4,
              padding: 12,
              borderRadius: 10,
              background: "hsl(0, 78%, 97%)",
              border: "1px solid hsl(0, 78%, 88%)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "hsl(220, 25%, 12%)", lineHeight: 1.5 }}>
              Quick practice works best up to 20 questions. For larger sets - download,
              solve on paper and get AI feedback against the CBSE marking scheme - use
              the worksheet generator.
            </div>
            <button
              type="button"
              onClick={onOpenWorksheet}
              style={{
                alignSelf: "flex-start",
                borderRadius: 8,
                padding: "6px 12px",
                border: "1px solid hsl(152, 55%, 45%)",
                backgroundColor: "hsl(152, 55%, 45%)",
                color: "#ffffff",
                fontSize: "0.76rem",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Open worksheet generator
            </button>
          </div>
        )}

        {/* Actions row: Clear filters + Build new set */}
        <div style={{ ...ROW_STYLE, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleLocalClear}
            style={{
              fontSize: "0.78rem",
              color: "hsl(220, 15%, 42%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0 12px",
              textDecoration: "underline",
              textUnderlineOffset: "2px",
            }}
          >
            Clear filters
          </button>
          <button
            type="button"
            onClick={onBuildSet}
            style={{
              borderRadius: 8,
              padding: "8px 16px",
              border: "1px solid hsl(152, 55%, 45%)",
              backgroundColor: "hsl(152, 55%, 45%)",
              color: "#ffffff",
              fontSize: "0.82rem",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Build new set
          </button>
        </div>
      </div>
    </section>
  );
}

interface CountChipProps {
  value: number;
  onSetCount: (n: number) => void;
  onOverflowChange: (overflow: boolean) => void;
}

function CountChip({ value, onSetCount, onOverflowChange }: CountChipProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(String(value));
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const draftNum = Number(draft);
  const draftValid = Number.isFinite(draftNum) && draftNum >= 1;
  const overSoftMax = draftValid && draftNum >= COUNT_SOFT_MAX;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (buttonRef.current?.contains(t)) return;
      if (dropdownRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setDraft(String(value));
    if (buttonRef.current) {
      setAnchorRect(buttonRef.current.getBoundingClientRect());
    }
    setOpen(true);
  };

  const handlePreset = (n: number) => {
    onOverflowChange(false);
    onSetCount(n);
    setDraft(String(n));
    setOpen(false);
  };

  const handleSet = () => {
    if (!draftValid) return;
    if (overSoftMax) {
      onOverflowChange(true);
      setOpen(false);
      return;
    }
    onOverflowChange(false);
    onSetCount(Math.max(1, Math.min(COUNT_SOFT_MAX - 1, Math.floor(draftNum))));
    setOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        style={{
          borderRadius: 999,
          padding: "5px 12px",
          border: "1px solid hsl(152, 55%, 45%)",
          backgroundColor: "hsl(152, 55%, 95%)",
          color: "hsl(152, 55%, 28%)",
          fontSize: "0.78rem",
          cursor: "pointer",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {value} questions
        <span style={{ fontSize: "0.7rem" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && anchorRect && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: anchorRect.bottom + 6,
            left: anchorRect.left,
            zIndex: 1000,
            width: 280,
            background: "#ffffff",
            border: "1px solid hsl(220, 18%, 88%)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "hsl(220, 15%, 42%)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Presets
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {COUNT_PRESETS.map((n) => {
              const active = value === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => handlePreset(n)}
                  style={chipStyle(active, false)}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.76rem", color: "hsl(220, 15%, 42%)" }}>Or type:</span>
            <input
              type="number"
              min={1}
              value={draft}
              onChange={(e) => {
                const v = e.target.value;
                setDraft(v);
                const n = Number(v);
                const overflow = Number.isFinite(n) && n >= COUNT_SOFT_MAX;
                onOverflowChange(overflow);
                if (overflow) setOpen(false);
              }}
              style={{
                width: 70,
                borderRadius: 8,
                border: overSoftMax
                  ? "1px solid #E24B4A"
                  : "1px solid hsl(220, 18%, 88%)",
                padding: "6px 8px",
                fontSize: "0.82rem",
                background: "#ffffff",
                color: "hsl(220, 25%, 12%)",
              }}
            />
            <button
              type="button"
              onClick={handleSet}
              disabled={!draftValid}
              style={{
                borderRadius: 8,
                padding: "6px 12px",
                border: "1px solid hsl(152, 55%, 45%)",
                backgroundColor: !draftValid ? "hsl(220, 18%, 90%)" : "hsl(152, 55%, 45%)",
                color: !draftValid ? "hsl(220, 15%, 42%)" : "#ffffff",
                fontSize: "0.76rem",
                cursor: !draftValid ? "not-allowed" : "pointer",
                fontWeight: 800,
              }}
            >
              Set
            </button>
          </div>
        </div>
      )}
    </>
  );
}
