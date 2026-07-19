import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";

import { QuickPracticePresets, QP_PRESETS } from "./QuickPracticePresets";
import {
  deriveArrivedTargeted,
  shouldShowPresetEntry,
  selectInRangeFromPool,
  questionMatchesFilters,
} from "../../pages/PracticePage";
import type { PracticeQuestion } from "../../data/predictionDataService";

/**
 * ACCEPTANCE — Quick Practice A1 (progressive disclosure). Pins the four §3 invariants:
 *   1. presets BYPASS on tutor/targeted entry (direct-visit only),
 *   2. every preset is a real-value setCommitted* bundle (Source survives),
 *   3. the rotation engine is untouched (selectInRangeFromPool byte-behaviour),
 *   4. the Competency card gates HONESTLY per topic (never a fabricated build).
 * Presentation-only: no engine/persistence/grader assertions change here.
 */

afterEach(cleanup);

// ── 1 · Presets are DIRECT-VISIT only — bypassed on tutor/targeted entry ──────
describe("entry gate — presets bypass on tutor/targeted entry", () => {
  it("deriveArrivedTargeted: source discriminates — hub (source=practice) → presets, tutor/CTAs → auto-build", () => {
    // THE FIX — the hub Quick-Practice CTA carries source=practice AND a topic, yet
    // must land on the preset chooser (arrivedTargeted=false), not auto-build.
    expect(deriveArrivedTargeted("polynomials", false, "practice")).toBe(false);
    // Hub full-subject (source=practice, no topic) → presets too.
    expect(deriveArrivedTargeted("", false, "practice")).toBe(false);
    // THE ADDITIVE GUARANTEE — the tutor hand-off (source=tutor) still auto-builds,
    // byte-identical; it carries a topic and is NOT source=practice.
    expect(deriveArrivedTargeted("trigonometry", false, "tutor")).toBe(true);
    // Every other topic-bearing CTA (Topic Hub source=topicHub, weak-area/Me source=me,
    // Dashboard/HPQ/Chapter-Test with no source) keeps auto-building.
    expect(deriveArrivedTargeted("trigonometry", false, "me")).toBe(true);
    expect(deriveArrivedTargeted("trigonometry", false, null)).toBe(true);
    // Fix-My-Mistakes targeted=1 ALWAYS auto-builds — a scoped drill is never trapped
    // behind the chooser (precedence 1), even in the impossible source=practice combo.
    expect(deriveArrivedTargeted("", true, null)).toBe(true);
    expect(deriveArrivedTargeted("trigonometry", true, "practice")).toBe(true);
    // generic sentinel / bare deep-link → presets (the closest thing to a direct visit).
    expect(deriveArrivedTargeted("GENERIC", false, null)).toBe(false);
    expect(deriveArrivedTargeted("", false, null)).toBe(false);
  });

  it("shouldShowPresetEntry: ONLY a direct visit in preset mode shows presets", () => {
    // Direct visit, nothing built yet, preset mode → presets show.
    expect(shouldShowPresetEntry(false, false, "preset")).toBe(true);
    // Tutor/targeted entry → BYPASS even before the build flips (arrivedTargeted=true).
    expect(shouldShowPresetEntry(false, true, "preset")).toBe(false);
    // Already built → no presets (summary bar / question list).
    expect(shouldShowPresetEntry(true, false, "preset")).toBe(false);
    // Customise drawer open → the full filter, not presets.
    expect(shouldShowPresetEntry(false, false, "custom")).toBe(false);
  });
});

// ── 2 · Each preset is a bundle of REAL PracticeControls values ───────────────
// Mirrors of the compat matrices in PracticeControls.tsx (kept in sync by this test):
// an invalid marks+style combo would be silently reset by PracticeControls' auto-reset.
const STYLE_COMPAT: Record<string, string[]> = {
  all: ["all", "proof", "ar", "hots", "case"],
  "1": ["all", "ar"],
  "23": ["all", "proof", "hots"],
  "5": ["all", "proof", "hots"],
  "4": ["all", "case"],
};
const MARKS_COMPAT_BY_STYLE: Record<string, string[]> = {
  all: ["all", "1", "23", "5", "4"],
  proof: ["all", "23", "5"],
  ar: ["all", "1"],
  hots: ["all", "23", "5"],
  case: ["all", "4"],
};
const VALID_MARKS = new Set(["all", "1", "23", "5", "4"]);
const VALID_STYLE = new Set(["all", "proof", "ar", "hots", "case"]);
const VALID_SOURCE = new Set(["all", "pyq", "ncert", "others"]);

describe("preset → setter bundle uses real values and cannot be auto-reset", () => {
  const live = QP_PRESETS.filter((p) => !p.gated);

  it("has the four live presets + one gated card", () => {
    expect(live.map((p) => p.key)).toEqual(["quick", "board", "comp", "high"]);
    expect(QP_PRESETS.filter((p) => p.gated).map((p) => p.key)).toEqual(["weak"]);
  });

  it("every live preset carries a full five-value bundle (Source NOT dropped)", () => {
    for (const p of live) {
      const f = p.filters!;
      expect(f, p.key).toBeTruthy();
      // marks may be a comma SET ("23,5"); every bucket must be a real value.
      for (const b of f.marks.split(",")) expect(VALID_MARKS.has(b), `${p.key} marks ${b}`).toBe(true);
      expect(VALID_STYLE.has(f.style), `${p.key} style`).toBe(true);
      expect(VALID_SOURCE.has(f.source), `${p.key} source`).toBe(true); // Source survives
      // The documented invariant: single-select can't express the difficulty BAND, so the
      // committed (client) filter stays "all" and the marks bucket carries the band; the
      // engine stays "All" to keep the adaptive / blueprint mix.
      expect(f.committedDifficulty, `${p.key} committedDifficulty`).toBe("all");
      expect(f.engineDifficulty, `${p.key} engineDifficulty`).toBe("All");
      expect(f.count, `${p.key} count`).toBeGreaterThanOrEqual(3);
    }
  });

  it("pins the exact verified mapping (guards silent drift)", () => {
    const byKey = Object.fromEntries(live.map((p) => [p.key, p.filters!]));
    expect(byKey.quick).toMatchObject({ marks: "1", style: "all", count: 5 });
    expect(byKey.board).toMatchObject({ marks: "all", style: "all", count: 8 });
    expect(byKey.comp).toMatchObject({ marks: "4", style: "case", count: 5 });   // case-based (not AR)
    expect(byKey.high).toMatchObject({ marks: "23,5", style: "all", count: 4 }); // comma SET
  });

  it("every preset's marks+style is compat-VALID (never auto-wiped by PracticeControls)", () => {
    for (const p of live) {
      const { marks, style } = p.filters!;
      const compatStyles = STYLE_COMPAT[marks] ?? STYLE_COMPAT.all; // set fallback, as in the UI
      expect(compatStyles.includes(style), `${p.key}: style ${style} vs marks ${marks}`).toBe(true);
      const compatMarks = MARKS_COMPAT_BY_STYLE[style] ?? MARKS_COMPAT_BY_STYLE.all;
      for (const b of marks === "all" ? [] : marks.split(",")) {
        expect(compatMarks.includes(b), `${p.key}: marks ${b} vs style ${style}`).toBe(true);
      }
    }
  });
});

// ── 3 · Rotation engine untouched — selectInRangeFromPool byte-behaviour ──────
describe("rotation/no-repeat engine is untouched (presentation-only PR)", () => {
  const q = (id: string): PracticeQuestion =>
    ({ id, section: "A", marks: 1, format: "mcq", questionText: id } as unknown as PracticeQuestion);
  const pool = [q("a"), q("b"), q("c"), q("d")];

  it("orders UNSEEN-first, then rotates — a seen question is deprioritised", () => {
    const seen = new Set(["a", "b"]);
    const out = selectInRangeFromPool(pool, "all", "all", "all", "all", null, 4, seen, 0);
    expect(out.available).toBe(4);          // available counts the POOL, never shrinks
    expect(out.displayed.slice(0, 2).map((x) => String(x.id))).toEqual(["c", "d"]); // unseen first
  });

  it("no seen-set + no offset → today's exact slice (no-regression default)", () => {
    const out = selectInRangeFromPool(pool, "all", "all", "all", "all", null, 2);
    expect(out.displayed.map((x) => String(x.id))).toEqual(["a", "b"]);
  });
});

// ── 4 · Presentation + honest competency gating ───────────────────────────────
function renderPicker(overrides: Partial<React.ComponentProps<typeof QuickPracticePresets>> = {}) {
  const props = {
    presets: QP_PRESETS,
    selectedKey: "board",
    onSelect: vi.fn(),
    competencyAvailable: true,
    onStart: vi.fn(),
    onCustomise: vi.fn(),
    timerEnabled: false,
    onToggleTimer: vi.fn(),
    ...overrides,
  };
  render(<QuickPracticePresets {...props} />);
  return props;
}

describe("picker render — selection, gating, timer, bypass of gated cards", () => {
  it("renders four live preset labels + the Customise entry to the full filter", () => {
    renderPicker();
    for (const label of ["Quick drill", "Board mix", "Competency", "High-marks"]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText(/Customise/)).toBeTruthy();
  });

  it("Competency GATES honestly when the topic has none (coming soon, not selectable)", () => {
    const { onSelect } = renderPicker({ competencyAvailable: false });
    expect(screen.getByText(/Competency questions coming soon for this chapter/)).toBeTruthy();
    const compCard = screen.getByText("Competency").closest("button")!;
    expect(compCard.hasAttribute("disabled")).toBe(true);
    fireEvent.click(compCard);
    expect(onSelect).not.toHaveBeenCalled(); // gated → click is a no-op
  });

  it("Competency is selectable when the topic HAS case-based questions", () => {
    const { onSelect } = renderPicker({ competencyAvailable: true });
    fireEvent.click(screen.getByText("Competency").closest("button")!);
    expect(onSelect).toHaveBeenCalledWith("comp");
  });

  it("the 5th 'My weak areas' card stays gated (Soon) and never selects", () => {
    const { onSelect } = renderPicker();
    const weak = screen.getByText("My weak areas").closest("button")!;
    expect(weak.hasAttribute("disabled")).toBe(true);
    fireEvent.click(weak);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("Start / Customise / Timer wire to their callbacks", () => {
    const { onStart, onCustomise, onToggleTimer } = renderPicker();
    fireEvent.click(screen.getByText(/Start practising/));
    expect(onStart).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/Customise/));
    expect(onCustomise).toHaveBeenCalled();
    fireEvent.click(screen.getByText(/^Timer/));
    expect(onToggleTimer).toHaveBeenCalled();
  });
});
