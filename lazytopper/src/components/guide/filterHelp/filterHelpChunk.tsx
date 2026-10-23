/**
 * GUIDE-FILTER-1 — everything the Quick Practice filter guide DRAWS and SAYS, in ONE lazily loaded
 * chunk (Vite emits `assets/filterHelpChunk-<hash>.js` + CSS). Reached only through the dynamic
 * import in ./filterHelp.tsx, so the practice page's first load carries none of it.
 *
 *   FilterHelpPanel — the "?" explainer (one line per filter value) and, in `nudge` mode, the one
 *                     line Byte says when a greyed chip is tapped. Byte is drawn only when the host
 *                     says so (`withCharacter`: guide arm, mascots not hidden); otherwise the SAME
 *                     words render as plain text — the filters are always explained.
 *   FilterEmptyLine — Ziggy's one line beside the existing filters-empty state (0 results).
 *
 * Every line below is derived from the CODED rule in ../../practice/practiceFilters.ts
 * (`questionMatchesFilters`, `isProofOrDerivation`, `isHotsRow`, `sourceBucketOf`, `isCbq`);
 * filterHelp.test.tsx pins each line against that rule. Display only: nothing here reads or
 * changes a filter, a count, a grade or a mark.
 */
import { useEffect, useRef, useState } from "react";
import BlobCharacter from "../BlobCharacter";
import { prefersReducedMotion } from "../rig";
import { guidePreviewActive, trackGuideEvent } from "../guideVariant";
import { MASCOTS_TOAST_COPY, hideMascotsWithUndo } from "../moments/mascotsToast";
import { FILTER_GROUP_LABEL, type FilterGroup } from "./filterHelpTypes";
import "../guide.css";
import "./filterHelp.css";

export { FILTER_GROUP_LABEL };
export type { FilterGroup };

export interface FilterHelpEntry {
  group: FilterGroup;
  /** The chip's token (practiceFilters.ts *_FILTER_VALUES). */
  value: string;
  /** The chip's visible label (PracticeControls *_OPTIONS — pinned equal by the test). */
  label: string;
  /** What the filter keeps, in plain words. 22 words or fewer. */
  line: string;
}

/**
 * THE copy table (owner approval in the PR body). One line per chip value; "All" is covered by
 * the combining line.
 */
export const FILTER_HELP_LINES: readonly FilterHelpEntry[] = [
  // Marks — section A / 1 mark / MCQ / Assertion-Reason; B or C / 2 or 3 marks; D / 5; E / exactly 4.
  { group: "marks", value: "1", label: "1 mark", line: "One-mark questions: MCQs and Assertion-Reason, like Section A of the paper." },
  { group: "marks", value: "23", label: "2-3 marks", line: "Short answers worth 2 or 3 marks, like Sections B and C." },
  { group: "marks", value: "5", label: "5 marks", line: "Long answers worth 5 marks, like Section D." },
  { group: "marks", value: "4", label: "Case-based (4)", line: "Questions worth exactly 4 marks, like the Section E case studies at the end of the paper." },
  // Style
  {
    group: "style",
    value: "proof",
    label: "Proof / Derivation",
    line: "Maths: prove or show that a result is true. Science: derive an expression or formula, plus Physics \"show that\" questions.",
  },
  { group: "style", value: "ar", label: "Assertion-Reason", line: "Two statements, an Assertion and a Reason. You decide if each is true, and if the Reason explains it." },
  { group: "style", value: "hots", label: "HOTS", line: "Higher-order thinking: questions that make you analyse, judge or explain why. Medium or Hard only." },
  { group: "style", value: "case", label: "Case-based", line: "A short passage, table or real-life situation with questions on it, including every Section E case study." },
  { group: "style", value: "cbq", label: "CBQ (competency)", line: "Competency-based: use what you know in a real-life situation, as CBSE's new pattern asks. Any mark value." },
  // Source — exactly one bucket per question (sourceBucketOf).
  { group: "source", value: "pyq", label: "Board exam (PYQ)", line: "Real questions from past CBSE board exam papers." },
  { group: "source", value: "ncert", label: "NCERT / Exemplar", line: "Questions from your NCERT textbook and the NCERT Exemplar book." },
  {
    group: "source",
    value: "others",
    label: "Others",
    line: "Not from a board paper or NCERT: questions LazyTopper made, including our CBQs, and other practice questions.",
  },
  // Difficulty — the question's own tag, exactly.
  { group: "diff", value: "Easy", label: "Easy", line: "Questions we tagged Easy. Good for a warm-up." },
  { group: "diff", value: "Medium", label: "Medium", line: "Questions we tagged Medium. A few steps of thinking." },
  { group: "diff", value: "Hard", label: "Hard", line: "Questions we tagged Hard. Pick these when you want a stretch." },
];

/** Every filter is an AND: each chosen row must match (questionMatchesFilters returns false on the first miss). */
export const FILTER_COMBINE_LINE = "Every filter you pick must match, so each one makes the set smaller. \"All\" means no filter on that row.";

export const FILTER_HELP_COPY = {
  byteIntro: "Here's what each filter means.",
  plainTitle: "What the filters mean",
  close: "Close filter help",
  adminPreview: "Admin preview",
  /** Ziggy, beside the filters-empty state (owner's words, 22 Oct 2026). */
  emptyZiggy: "Nothing matches all of these. Try removing one filter.",
} as const;

/** The other rows a greyed chip depends on, in the order the panel shows them. */
const OTHER_ROWS: Record<FilterGroup, string> = {
  marks: "Style, Source or Difficulty",
  style: "Marks, Source or Difficulty",
  source: "Marks, Style or Difficulty",
  diff: "Marks, Style or Source",
};

/**
 * Byte's one line for a greyed chip. True by construction: a chip greys out when the pool holds 0
 * questions for it WITH THE OTHER ROWS AS THEY STAND (chipCounts); with every other row on "All"
 * its count is the pool's own, so a chip still grey then has none here.
 */
export function greyedChipLine(group: FilterGroup, label: string): string {
  return `"${label}" has nothing with your other picks. Set ${OTHER_ROWS[group]} to All. Still grey? None here.`;
}

/** Words in a line, as the 22-word rule counts them. */
export const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

function HideButton() {
  return (
    <button type="button" className="lt-fh__hide" data-testid="mascots-hide" onClick={hideMascotsWithUndo}>
      {MASCOTS_TOAST_COPY.hide}
    </button>
  );
}

export interface FilterHelpPanelProps {
  /** "help" = the full explainer; "nudge" = one greyed chip's line. */
  mode: "help" | "nudge";
  /** nudge mode: the greyed chip. */
  chip?: { group: FilterGroup; label: string };
  /** Draw Byte (guide arm, mascots not hidden). False → the same words as plain text. */
  withCharacter: boolean;
  onClose: () => void;
}

export function FilterHelpPanel({ mode, chip, withCharacter, onClose }: FilterHelpPanelProps) {
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());
  const nudgeLine = mode === "nudge" && chip ? greyedChipLine(chip.group, chip.label) : null;

  // guide_moment_shown — once per shown line, only when Byte is drawn (guide-arm events only).
  useEffect(() => {
    if (withCharacter) trackGuideEvent("guide_moment_shown", { moment: "filter_help" });
  }, [withCharacter, nudgeLine]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups: FilterGroup[] = ["marks", "style", "source", "diff"];

  return (
    <div
      className={`lt-fh lt-fh--${mode}${withCharacter ? " lt-fh--byte" : " lt-fh--plain"}`}
      data-testid={mode === "help" ? "filter-help-panel" : "filter-help-nudge"}
      data-character={withCharacter ? "byte" : "none"}
      role="region"
      aria-label={mode === "help" ? FILTER_HELP_COPY.plainTitle : "Filter tip"}
    >
      <button type="button" className="lt-fh__x" aria-label={FILTER_HELP_COPY.close} data-testid="filter-help-close" onClick={onClose}>
        ✕
      </button>
      <div className="lt-fh__head">
        {withCharacter ? (
          <BlobCharacter
            key={mode}
            kind="byte"
            pose={mode === "help" ? "explain" : "point"}
            className="lt-fh__char"
            still={reduce.current || undefined}
          />
        ) : null}
        <div className="lt-fh__headtext">
          {withCharacter && preview ? (
            <span className="lt-fh__admin" data-testid="guide-admin-preview">
              {FILTER_HELP_COPY.adminPreview}
            </span>
          ) : null}
          {nudgeLine ? (
            <p className="lt-fh__say" aria-live="polite" data-testid="filter-help-nudge-line">
              {nudgeLine}
            </p>
          ) : (
            <p className="lt-fh__say" data-testid="filter-help-title">
              {withCharacter ? FILTER_HELP_COPY.byteIntro : FILTER_HELP_COPY.plainTitle}
            </p>
          )}
          {withCharacter ? <HideButton /> : null}
        </div>
      </div>
      {mode === "help" ? (
        <div className="lt-fh__body">
          {groups.map((g) => (
            <section key={g} className="lt-fh__group" aria-label={FILTER_GROUP_LABEL[g]}>
              <h3 className="lt-fh__group-h">{FILTER_GROUP_LABEL[g]}</h3>
              <dl className="lt-fh__list">
                {FILTER_HELP_LINES.filter((e) => e.group === g).map((e) => (
                  <div key={e.value} className="lt-fh__row" data-testid={`filter-help-line-${g}-${e.value}`}>
                    <dt className="lt-fh__term">{e.label}</dt>
                    <dd className="lt-fh__def">{e.line}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          <p className="lt-fh__combine" data-testid="filter-help-combine">
            {FILTER_COMBINE_LINE}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Ziggy's one line beside the filters-empty state. The host renders it ONLY at 0 results. */
export function FilterEmptyLine() {
  const reduce = useRef(prefersReducedMotion());
  const [preview] = useState(() => guidePreviewActive());
  useEffect(() => {
    trackGuideEvent("guide_moment_shown", { moment: "filter_empty" });
  }, []);
  return (
    <div className="lt-fe" data-testid="filter-empty-ziggy" role="group" aria-label="Ziggy">
      <BlobCharacter kind="ziggy" pose="detective" className="lt-fe__char" still={reduce.current || undefined} />
      <div className="lt-fe__bub">
        {preview ? (
          <span className="lt-fh__admin" data-testid="guide-admin-preview">
            {FILTER_HELP_COPY.adminPreview}
          </span>
        ) : null}
        <p className="lt-fe__say" data-testid="filter-empty-ziggy-line">
          {FILTER_HELP_COPY.emptyZiggy}
        </p>
        <HideButton />
      </div>
    </div>
  );
}
