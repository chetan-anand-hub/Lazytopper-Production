import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, act } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import {
  createMemoryRouter,
  RouterProvider,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { QuickPracticePresets, QP_PRESETS } from "./QuickPracticePresets";
import {
  deriveArrivedTargeted,
  shouldShowPresetEntry,
  shouldResetBuiltOnPop,
  QP_BUILT_PARAM,
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

  // Back-nav: built set → [browser back] → preset chooser → [back] → hub.
  it("shouldResetBuiltOnPop: built marker ABSENT while built → drop to chooser; not a trap, not for auto-build", () => {
    // Built set on screen, back popped to the entry BELOW (built marker gone) → drop to chooser.
    expect(shouldResetBuiltOnPop(true, false, false)).toBe(true);
    // Still ON the built entry (marker present) → do NOT reset (this is the build itself).
    expect(shouldResetBuiltOnPop(true, false, true)).toBe(false);
    // Already at the chooser (not built) → nothing to reset; the SECOND back reaches the hub.
    expect(shouldResetBuiltOnPop(false, false, false)).toBe(false);
    // Auto-build (tutor/targeted) NEVER added the marker → never intercepted → back goes to hub.
    expect(shouldResetBuiltOnPop(true, true, false)).toBe(false);
    expect(shouldResetBuiltOnPop(true, true, true)).toBe(false);
  });
});

// ── 1b · Back-nav in a REAL router (the #484 regression: the entry must be POPPABLE) ──
// The pure helper above is necessary but NOT sufficient — it's what let #484 ship broken:
// it proves "IF back pops off a built entry, reset fires" but never that the entry gets
// CREATED. #484 pushed via navigate(samePath+search, {state}) — RR treats that as a
// replace/no-op, so no chooser entry existed and back skipped to the hub. This mounts a
// real createMemoryRouter and asserts the built entry is genuinely pushed and poppable.
//
// The harness MIRRORS PracticePage's exact wiring (search-param push + transition-guarded
// reset via the real shouldResetBuiltOnPop, plus the breadcrumb handler) so it validates the
// mechanism, not a mock. `arrivedTargeted` models a tutor/auto-build entry (starts built,
// never a chooser step). `practiceBackTo` is where the breadcrumb goes when NOT built.
function BackNavHarness({
  arrivedTargeted = false,
  practiceBackTo = "/hub",
}: { arrivedTargeted?: boolean; practiceBackTo?: string }) {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const builtParam = sp.get(QP_BUILT_PARAM) === "1";
  const [isBuilt, setIsBuilt] = useState(arrivedTargeted); // auto-build lands already built
  const prev = useRef(builtParam);
  useEffect(() => {
    const wasBuilt = prev.current;
    prev.current = builtParam;
    if (arrivedTargeted) return;
    if (wasBuilt && shouldResetBuiltOnPop(isBuilt, arrivedTargeted, builtParam)) {
      setIsBuilt(false);
      return;
    }
    if (!isBuilt && builtParam) {
      const n = new URLSearchParams(sp);
      n.delete(QP_BUILT_PARAM);
      setSp(n, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builtParam, isBuilt]);
  const build = () => {
    setIsBuilt(true); // set BEFORE the push (mirrors PracticePage) so the strip can't fire
    const n = new URLSearchParams(sp);
    n.set(QP_BUILT_PARAM, "1");
    setSp(n, { replace: false });
  };
  const breadcrumbBack = () => {
    if (isBuilt && !arrivedTargeted) {
      setIsBuilt(false);
      if (builtParam) {
        const n = new URLSearchParams(sp);
        n.delete(QP_BUILT_PARAM);
        setSp(n, { replace: true });
      }
      return;
    }
    navigate(practiceBackTo);
  };
  return (
    <div>
      <div>{isBuilt ? "RUNNER" : "CHOOSER"}</div>
      <button onClick={build}>build</button>
      <button onClick={breadcrumbBack}>breadcrumb</button>
    </div>
  );
}

describe("back-nav wiring — the built entry is a real, poppable history step", () => {
  it("hub → build → [back] → chooser (same URL, marker gone) → [back] → hub", async () => {
    const router = createMemoryRouter(
      [
        { path: "/hub", element: <div>HUB</div> },
        { path: "/practice/:grade/:subject", element: <BackNavHarness /> },
      ],
      { initialEntries: ["/hub", "/practice/10/Maths?source=practice&topic=polynomials"], initialIndex: 1 },
    );
    render(<RouterProvider router={router} />);

    // 1) Landed on the chooser; no built marker yet.
    expect(screen.getByText("CHOOSER")).toBeTruthy();
    expect(router.state.location.search).not.toContain(`${QP_BUILT_PARAM}=1`);

    // 2) Build → runner, and the URL now carries built=1 (a genuinely different URL → PUSH).
    await act(async () => {
      fireEvent.click(screen.getByText("build"));
    });
    expect(screen.getByText("RUNNER")).toBeTruthy();
    expect(router.state.location.search).toContain(`${QP_BUILT_PARAM}=1`);
    expect(router.state.location.pathname).toBe("/practice/10/Maths");

    // 3) Browser BACK → the PRESET CHOOSER (same topic), NOT the hub. If the push had been
    //    a replace/no-op (#484), this back would land on /hub — this assertion catches it.
    await act(async () => {
      router.navigate(-1);
    });
    expect(screen.getByText("CHOOSER")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/practice/10/Maths");
    expect(router.state.location.search).toContain("topic=polynomials"); // scope preserved
    expect(router.state.location.search).not.toContain(`${QP_BUILT_PARAM}=1`);

    // 4) A SECOND back leaves for the hub (no trap).
    await act(async () => {
      router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe("/hub");
  });

  // The in-app breadcrumb "Back" CTA (top-left) — a SEPARATE path from the browser-back
  // history logic (why #485 fixed the gesture but the CTA still hard-jumped to the hub).
  it("breadcrumb CTA: built set → chooser (marker gone, same topic), NOT the hub", async () => {
    const router = createMemoryRouter(
      [
        { path: "/hub", element: <div>HUB</div> },
        { path: "/practice/:grade/:subject", element: <BackNavHarness practiceBackTo="/hub" /> },
      ],
      { initialEntries: ["/hub", "/practice/10/Maths?source=practice&topic=polynomials"], initialIndex: 1 },
    );
    render(<RouterProvider router={router} />);

    await act(async () => fireEvent.click(screen.getByText("build")));
    expect(screen.getByText("RUNNER")).toBeTruthy();
    expect(router.state.location.search).toContain(`${QP_BUILT_PARAM}=1`);

    // Breadcrumb from a built set → the CHOOSER (marker stripped), still on /practice.
    await act(async () => fireEvent.click(screen.getByText("breadcrumb")));
    expect(screen.getByText("CHOOSER")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/practice/10/Maths");
    expect(router.state.location.search).not.toContain(`${QP_BUILT_PARAM}=1`);
    expect(router.state.location.search).toContain("topic=polynomials"); // scope preserved

    // Breadcrumb again from the chooser → the hub (as before).
    await act(async () => fireEvent.click(screen.getByText("breadcrumb")));
    expect(router.state.location.pathname).toBe("/hub");
  });

  it("breadcrumb CTA: tutor/targeted auto-build → straight to the hub (no chooser step), byte-identical", async () => {
    const router = createMemoryRouter(
      [
        { path: "/hub", element: <div>HUB</div> },
        { path: "/practice/:grade/:subject", element: <BackNavHarness arrivedTargeted practiceBackTo="/hub" /> },
      ],
      { initialEntries: ["/hub", "/practice/10/Maths?source=tutor&topic=polynomials"], initialIndex: 1 },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByText("RUNNER")).toBeTruthy(); // auto-build lands already built
    // Breadcrumb on an auto-build entry → the hub directly (no chooser to return to).
    await act(async () => fireEvent.click(screen.getByText("breadcrumb")));
    expect(router.state.location.pathname).toBe("/hub");
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
