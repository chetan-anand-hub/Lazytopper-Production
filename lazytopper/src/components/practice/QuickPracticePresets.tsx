// src/components/practice/QuickPracticePresets.tsx
//
// The Quick Practice progressive-disclosure preset picker (owner-approved prototype v4).
// PRESENTATION-ONLY: a preset is a bundle of the EXISTING PracticePage setCommitted*
// setters + setIsBuilt(true) (see PracticePage.applyPreset) — same shape as
// WorksheetGenerator's PRESETS. This component only SELECTS + renders; PracticePage owns
// the setter bundle and the build. No engine, no filter logic, no persistence, no MI here.
//
// ONE responsive component — the 2-col grid becomes a mobile swipe carousel purely in CSS
// (QP_ENTRY_CSS @media 640px), no useIsDesktop. Class-driven styling (§7): every value
// string below is a REAL PracticeControls.tsx filter value ("1" | "23" | "5" | "4" |
// "all" | "case" ...), verified against its MARKS/STYLE/SOURCE/DIFFICULTY options and the
// STYLE_COMPAT / DIFF_COMPAT_BY_MARKS matrices — never an invented mode.

import { useCallback, useEffect, useRef, useState } from "react";
import type { DifficultyChoice } from "./practiceQuestionBuilder";

/** The committed-filter bundle a preset applies. Every field is a real PracticeControls
 *  value. `committedDifficulty` is intentionally "all" on every preset: the coarse
 *  single-select cannot express a 2-level band (Easy-Medium / Medium-Hard), and an exact
 *  match risks starving a thin topic bank — the MARKS bucket already carries the band
 *  (DIFF_COMPAT_BY_MARKS: "1"->Easy/Medium, "4" & "5"->Medium/Hard). `engineDifficulty`
 *  stays "All" so the adaptive draw / board blueprint keeps a healthy, board-shaped mix. */
export interface QpPresetFilters {
  /** committed marks token — single bucket or comma SET ("23,5"). */
  marks: string;
  /** committed style — "all" | "proof" | "ar" | "hots" | "case". */
  style: string;
  /** committed source — "all" | "pyq" | "ncert" | "others". */
  source: string;
  /** committed (client) difficulty — "all" on every preset (see interface note). */
  committedDifficulty: string;
  /** engine difficulty — "All" on every preset (keeps the adaptive / blueprint mix). */
  engineDifficulty: DifficultyChoice;
  /** how many questions the set commits to. */
  count: number;
}

export interface QpPresetConfig {
  key: string;
  label: string;
  icon: string;
  accentClass: string; // qp-quick | qp-board | qp-comp | qp-high
  desc: string;
  chips: Array<{ text: string; accent?: boolean }>;
  cbse: string;
  startNote: string;
  /** Absent on the gated "My weak areas" card (no build). */
  filters?: QpPresetFilters;
  /** Always-gated card (the 5th, [FU-QP-WEAK-AREAS-PRESET] stays gated). */
  gated?: boolean;
}

/**
 * The four live presets + the gated 5th. Each `filters` bundle maps to REAL
 * PracticeControls.tsx value strings (verified vs its option arrays + compat matrices):
 *
 *  · Quick drill — marks "1" (Section A, the 20% objective/MCQ+AR tier). style "all":
 *    there is no "MCQ"/"objective" STYLE value, and the 1-mark bucket IS the objective
 *    tier (STYLE_COMPAT["1"] = {all, ar}). difficulty "all" == Easy-Medium here, because
 *    DIFF_COMPAT_BY_MARKS["1"] = {Easy, Medium} (a 1-mark set has no Hard to admit).
 *  · Board mix (default) — marks "all" triggers PracticePage's board blueprint fan-out
 *    (A30/B20/C20/D20/E10 — the ~50/20/30 competency-inclusive shape). engine "All"
 *    keeps the real paper's difficulty spread; a Medium-exact filter would GUT the
 *    blueprint by dropping the Easy Section-A and Hard Section-D items.
 *  · Competency — marks "4" (Section E case-based, the largest CBQ chunk) + style "case".
 *    The single-select cannot express "case + assertion-reason" (AR is a 1-mark Section-A
 *    format, a different bucket); case-based is the closest single value the engine
 *    supports (the documented limitation). Gated per topic against the live bank.
 *  · High-marks — marks "23,5" (the comma SET: 2-3-mark short + 5-mark long = the ~30%
 *    descriptive tier). style "all": there is no "long-answer" STYLE value; the 5+23
 *    buckets carry the descriptive character (STYLE_COMPAT of both admits {all,proof,hots}).
 */
export const QP_PRESETS: QpPresetConfig[] = [
  {
    key: "quick",
    label: "Quick drill",
    icon: "⚡",
    accentClass: "qp-quick",
    desc: "Five fast one-markers to warm up and build momentum.",
    chips: [{ text: "5 questions", accent: true }, { text: "1 mark" }, { text: "Objective" }],
    cbse: "The 20% objective tier — the easiest marks to secure.",
    startNote: "Quick drill · 5 one-mark questions",
    filters: { marks: "1", style: "all", source: "all", committedDifficulty: "all", engineDifficulty: "All", count: 5 },
  },
  {
    key: "board",
    label: "Board mix",
    icon: "📋",
    accentClass: "qp-board",
    desc: "A realistic cross-section — objective, competency and long-answer, in the proportion the real paper uses.",
    chips: [{ text: "8 questions", accent: true }, { text: "Mixed marks" }, { text: "Includes competency", accent: true }],
    cbse: "Mirrors the actual board blueprint — competency, objective and descriptive in the real proportion.",
    startNote: "Board mix · 8 questions across all tiers",
    filters: { marks: "all", style: "all", source: "all", committedDifficulty: "all", engineDifficulty: "All", count: 8 },
  },
  {
    key: "comp",
    label: "Competency",
    icon: "🧩",
    accentClass: "qp-comp",
    desc: "Case-based application questions — the competency tier where the most marks are won and lost.",
    chips: [{ text: "Case-based", accent: true }, { text: "4 marks" }, { text: "5 questions" }],
    cbse: "Half the CBSE paper (40/80 marks) is competency-based — the tier students lose the most on.",
    startNote: "Competency · 5 case-based questions",
    filters: { marks: "4", style: "case", source: "all", committedDifficulty: "all", engineDifficulty: "All", count: 5 },
  },
  {
    key: "high",
    label: "High-marks",
    icon: "🎯",
    accentClass: "qp-high",
    desc: "Heavier short- and long-answer questions — where method and presentation marks are won or lost.",
    chips: [{ text: "4 questions", accent: true }, { text: "2-3 & 5 marks" }, { text: "Descriptive" }],
    cbse: "The ~30% descriptive tier — step-wise marking rewards clear method.",
    startNote: "High-marks · 4 descriptive questions",
    filters: { marks: "23,5", style: "all", source: "all", committedDifficulty: "all", engineDifficulty: "All", count: 4 },
  },
  {
    key: "weak",
    label: "My weak areas",
    icon: "📊",
    accentClass: "qp-comp",
    desc: "Questions targeted at the concepts you've been losing marks on.",
    chips: [{ text: "Personalised" }],
    cbse: "Unlocks after a few graded sessions — powered by Mistake Intelligence.",
    startNote: "",
    gated: true,
  },
];

export interface QuickPracticePresetsProps {
  presets: QpPresetConfig[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /** false → the Competency card renders gated ("coming soon for this chapter"). */
  competencyAvailable: boolean;
  onStart: () => void;
  onCustomise: () => void;
  timerEnabled: boolean;
  onToggleTimer: () => void;
}

export function QuickPracticePresets({
  presets,
  selectedKey,
  onSelect,
  competencyAvailable,
  onStart,
  onCustomise,
  timerEnabled,
  onToggleTimer,
}: QuickPracticePresetsProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeDot, setActiveDot] = useState(0);

  // Track the active carousel dot on mobile. No-op on desktop (the scroller doesn't
  // overflow and the dots are display:none via @media) — presentation-only.
  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || presets.length === 0) return;
    const idx = Math.round(el.scrollLeft / (el.scrollWidth / presets.length));
    setActiveDot(Math.max(0, Math.min(presets.length - 1, idx)));
  }, [presets.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const selected = presets.find((p) => p.key === selectedKey && !p.gated);
  const isGated = (p: QpPresetConfig) =>
    Boolean(p.gated) || (p.key === "comp" && !competencyAvailable);

  return (
    <section className="qp-entry" aria-label="Choose a practice set">
      <div className="qp-eyebrow">Quick Practice</div>
      <h2 className="qp-title">What shall we practise?</h2>
      <p className="qp-lede">
        Pick a set and start — or customise the details yourself. Each set reshuffles, so you
        never get the same questions twice.
      </p>

      <div className="qp-presets" ref={scrollerRef}>
        {presets.map((p) => {
          const gated = isGated(p);
          const selectedNow = !gated && p.key === selectedKey;
          const compComingSoon = p.key === "comp" && !competencyAvailable;
          return (
            <button
              type="button"
              key={p.key}
              className={`qp-preset ${p.accentClass}${gated ? " gated" : ""}${selectedNow ? " sel" : ""}`}
              aria-pressed={selectedNow}
              aria-disabled={gated}
              disabled={gated}
              onClick={() => { if (!gated) onSelect(p.key); }}
            >
              {selectedNow && <span className="qp-sel-check" aria-hidden="true">✓</span>}
              {p.gated && <span className="qp-soon-tag">Soon</span>}
              {compComingSoon && <span className="qp-soon-tag">Soon</span>}
              <div className="qp-p-top">
                <div className="qp-p-ic" aria-hidden="true">{p.icon}</div>
                <div className="qp-p-name">{p.label}</div>
              </div>
              <p className="qp-p-desc">
                {compComingSoon
                  ? "Competency questions coming soon for this chapter."
                  : p.desc}
              </p>
              {!compComingSoon && (
                <div className="qp-p-meta">
                  {p.chips.map((c, i) => (
                    <span key={i} className={`qp-chip${c.accent ? " a" : ""}`}>{c.text}</span>
                  ))}
                </div>
              )}
              <div className="qp-cbse">{p.cbse}</div>
            </button>
          );
        })}
      </div>

      <div className="qp-dots" aria-hidden="true">
        {presets.map((_, i) => (
          <div key={i} className={`qp-dot${i === activeDot ? " on" : ""}`} />
        ))}
      </div>
      <div className="qp-swipe-hint" aria-hidden="true">← swipe to see all sets →</div>

      <div className="qp-optrow">
        <button type="button" className="qp-customise" onClick={onCustomise}>
          ⚙ Customise <span className="qp-cv">— set the details yourself</span>
        </button>
        <button
          type="button"
          className="qp-timer-toggle"
          aria-pressed={timerEnabled}
          onClick={onToggleTimer}
        >
          <span className={`qp-switch${timerEnabled ? " on" : ""}`} aria-hidden="true" />
          Timer <span className="qp-timer-muted">(optional)</span>
        </button>
      </div>

      <div className="qp-start">
        <button type="button" className="qp-start-btn" onClick={onStart}>
          Start practising →
        </button>
        {selected?.startNote && <span className="qp-start-note">{selected.startNote}</span>}
      </div>
    </section>
  );
}

export default QuickPracticePresets;
