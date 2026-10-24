/**
 * MOMENTS-3 A — the director: at most three UNPROMPTED appearances per session.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  APPEARANCE_PRIORITY as P,
  MASCOT_BUDGET_KEY,
  MAX_UNPROMPTED_PER_SESSION,
  NoteShown,
  __resetMascotBudgetForTests,
  __setMascotBudgetForTests,
  appearanceHeld,
  decideAppearance,
  noteShown,
  releaseAppearance,
  requestAppearance,
  shownThisSession,
  unpromptedShownCount,
  useAppearance,
} from "./mascotBudget";
import { GUIDE_PREVIEW_KEY } from "./guideVariant";
import { __resetMascotsForTests, hideMascots } from "./mascotsMute";
import { STUDENT_DATA_MAP } from "../../services/studentDataMap";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetMascotsForTests();
  __resetMascotBudgetForTests();
  __setMascotBudgetForTests(true);
});
afterEach(() => {
  cleanup();
  __resetMascotBudgetForTests();
  __resetMascotsForTests();
  window.localStorage.clear();
});

function show(kind: string, priority: number = P.explainer): boolean {
  const ok = requestAppearance(kind, priority);
  if (ok) noteShown(kind);
  return ok;
}

describe("the pure decision", () => {
  it("grants while a slot is free, refuses the 4th", () => {
    const holds = new Map<string, number>();
    expect(decideAppearance({ shown: 2, holds }, "c", 1).grant).toBe(true);
    expect(decideAppearance({ shown: 3, holds }, "d", 999).grant).toBe(false);
  });
  it("a higher priority takes the lowest unrendered reservation; an equal one does not", () => {
    const holds = new Map([["low", 100], ["mid", 200]]);
    expect(decideAppearance({ shown: 1, holds }, "late", 400)).toEqual({ grant: true, evict: "low" });
    expect(decideAppearance({ shown: 1, holds }, "same", 100)).toEqual({ grant: false, evict: null });
  });
  it("the same occurrence (known / already holding) is granted even when full", () => {
    expect(decideAppearance({ shown: 3, holds: new Map(), known: true }, "a", 1).grant).toBe(true);
    expect(decideAppearance({ shown: 2, holds: new Map([["a", 1], ["b", 1]]) }, "a", 1).grant).toBe(true);
  });
});

describe("the budget", () => {
  it("the 4th unprompted request is refused", () => {
    expect(show("a")).toBe(true);
    expect(show("b")).toBe(true);
    expect(show("c")).toBe(true);
    expect(unpromptedShownCount()).toBe(MAX_UNPROMPTED_PER_SESSION);
    expect(requestAppearance("d", P.lateNight)).toBe(false);
    expect(appearanceHeld("d")).toBe(false);
  });

  it("scorecards count like everything else (Home -> practice -> scorecard -> a 4th is suppressed)", () => {
    expect(show("companion:home-welcomeBack", P.companion)).toBe(true);
    expect(show("moment:m3", P.explainer)).toBe(true);
    expect(show("score:WS-1", P.scorecard)).toBe(true);
    expect(requestAppearance("companion:home-rhythm", P.companion)).toBe(false);
  });

  it("the SAME occurrence key that already showed continues (a re-render / StrictMode double mount is not a 4th)", () => {
    show("a");
    show("b");
    show("c");
    expect(requestAppearance("b", P.companion)).toBe(true);
    expect(unpromptedShownCount()).toBe(3);
  });

  it("a request alone spends nothing; release gives the slot back", () => {
    expect(requestAppearance("a", P.explainer)).toBe(true);
    expect(requestAppearance("b", P.explainer)).toBe(true);
    expect(requestAppearance("c", P.explainer)).toBe(true);
    expect(unpromptedShownCount()).toBe(0);
    expect(requestAppearance("d", P.explainer)).toBe(false);
    releaseAppearance("c");
    expect(requestAppearance("d", P.explainer)).toBe(true);
  });

  it("priority: late night > scorecard > explainer > companion pre-empts a reservation that has not rendered", () => {
    show("done", P.explainer);
    expect(requestAppearance("comp", P.companion)).toBe(true);
    expect(requestAppearance("exp", P.explainer)).toBe(true); // slots: done(shown) + comp + exp
    expect(requestAppearance("score", P.scorecard)).toBe(true); // takes comp's slot
    expect(appearanceHeld("comp")).toBe(false);
    expect(requestAppearance("night", P.lateNight)).toBe(true); // takes exp's slot (lowest left)
    expect(appearanceHeld("exp")).toBe(false);
    expect(appearanceHeld("score")).toBe(true);
    // a LOWER priority never displaces a higher one
    expect(requestAppearance("another", P.companion)).toBe(false);
  });

  it("a shown appearance can never be displaced", () => {
    show("a", P.companion);
    show("b", P.companion);
    show("c", P.companion);
    expect(requestAppearance("night", P.lateNight)).toBe(false);
  });

  it("prompted appearances never touch the budget (they simply do not call it)", () => {
    show("a");
    show("b");
    show("c");
    // The "?" door opens its card without requestAppearance; the budget is unchanged by that.
    expect(unpromptedShownCount()).toBe(3);
    expect(requestAppearance("a", P.explainer)).toBe(true);
  });

  it("is per session: stored in this tab's sessionStorage and registered in studentDataMap", () => {
    show("moment:m5");
    expect(JSON.parse(window.sessionStorage.getItem(MASCOT_BUDGET_KEY) ?? "{}")).toEqual({ v: 1, shown: ["moment:m5"] });
    const local = STUDENT_DATA_MAP.find((l) => l.id === "local-storage")!;
    expect(local.holds).toContain("`lazytopper.mascotBudget`");
  });

  it("breathe-style once-per-session: shownThisSession", () => {
    expect(shownThisSession("x")).toBe(false);
    show("x");
    expect(shownThisSession("x")).toBe(true);
  });

  it("hidden mascots: nothing is granted, nothing is counted", () => {
    hideMascots();
    expect(requestAppearance("a", P.lateNight)).toBe(false);
    noteShown("a");
    expect(unpromptedShownCount()).toBe(0);
    expect(appearanceHeld("a")).toBe(false);
  });

  it("admin preview bypasses the budget and counts nothing", () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "guide", until: Date.now() + 60_000 }));
    for (const k of ["a", "b", "c", "d", "e"]) {
      expect(requestAppearance(k, P.companion)).toBe(true);
      noteShown(k);
    }
    expect(unpromptedShownCount()).toBe(0);
    expect(shownThisSession("a")).toBe(false);
  });

  it("is off by default under Vitest (existing suites keep their behaviour)", () => {
    __setMascotBudgetForTests(null);
    for (const k of ["a", "b", "c", "d"]) expect(requestAppearance(k, P.companion)).toBe(true);
  });
});

describe("useAppearance / NoteShown", () => {
  function Door({ kind, priority = P.explainer }: { kind: string; priority?: number }) {
    const key = useAppearance(kind, priority);
    return key ? (
      <div data-testid={`door-${kind}`}>
        <NoteShown kind={key} />
      </div>
    ) : null;
  }

  it("draws the first three and renders nothing for the 4th", () => {
    render(
      <>
        <Door kind="a" />
        <Door kind="b" />
        <Door kind="c" />
        <Door kind="d" />
      </>,
    );
    expect(screen.queryByTestId("door-a")).not.toBeNull();
    expect(screen.queryByTestId("door-c")).not.toBeNull();
    expect(screen.queryByTestId("door-d")).toBeNull();
    expect(unpromptedShownCount()).toBe(3);
  });

  it("a higher-priority door takes the slot of a lower one that has not rendered yet", () => {
    show("x", P.explainer);
    show("y", P.explainer);
    function Low() {
      const key = useAppearance("low", P.companion);
      return key ? <div data-testid="low" /> : null; // reserves but never notes shown
    }
    const { rerender } = render(<Low />);
    expect(screen.queryByTestId("low")).not.toBeNull();
    rerender(
      <>
        <Low />
        <Door kind="night" priority={P.lateNight} />
      </>,
    );
    expect(screen.queryByTestId("door-night")).not.toBeNull();
    expect(screen.queryByTestId("low")).toBeNull();
  });

  it("hiding the mascots removes a door at once", () => {
    render(<Door kind="a" />);
    expect(screen.queryByTestId("door-a")).not.toBeNull();
    act(() => hideMascots());
    expect(screen.queryByTestId("door-a")).toBeNull();
  });
});

describe("MOMENTS-3 review rulings: occurrences, held slots, the probe", () => {
  function Door({ kind, priority = P.explainer, onShown }: { kind: string; priority?: number; onShown?: (k: string) => void }) {
    const key = useAppearance(kind, priority);
    return key ? (
      <div data-testid={`door-${kind}`}>
        <Shown k={key} onShown={onShown} />
        <NoteShown kind={key} />
      </div>
    ) : null;
  }
  function Shown({ k, onShown }: { k: string; onShown?: (k: string) => void }) {
    useEffect(() => {
      onShown?.(k);
    }, [k, onShown]);
    return null;
  }

  it("noteShown spends only a slot the key HOLDS (a refused / never-requested key spends nothing)", () => {
    show("a");
    show("b");
    show("c");
    expect(requestAppearance("late", P.explainer)).toBe(false);
    noteShown("late");
    noteShown("never-requested");
    expect(unpromptedShownCount()).toBe(3);
    expect(JSON.parse(window.sessionStorage.getItem(MASCOT_BUDGET_KEY)!).shown).toEqual(["a", "b", "c"]);
  });

  it("★ BELOW the cap: a door that never reserved spends nothing (fails if noteShown loses its hold check)", () => {
    expect(requestAppearance("held#1", P.explainer)).toBe(true);
    noteShown("held#1"); // the door that reserved: one slot
    noteShown("never-reserved#1"); // a door that skipped the reservation: nothing
    expect(unpromptedShownCount()).toBe(1);
    expect(JSON.parse(window.sessionStorage.getItem(MASCOT_BUDGET_KEY)!).shown).toEqual(["held"]);
    expect(requestAppearance("next#1", P.explainer)).toBe(true); // 2 slots remain, not 1
    expect(requestAppearance("next2#1", P.explainer)).toBe(true);
    expect(requestAppearance("next3#1", P.explainer)).toBe(false);
  });

  it("★ a kind that already showed gets NO free re-show: a second mount (a new occurrence) is counted", () => {
    const { unmount } = render(<Door kind="moment:m5" />);
    expect(unpromptedShownCount()).toBe(1);
    unmount();
    render(<Door kind="moment:m5" />); // m5 on a second grading
    expect(unpromptedShownCount()).toBe(2);
    expect(JSON.parse(window.sessionStorage.getItem(MASCOT_BUDGET_KEY)!).shown).toEqual(["moment:m5", "moment:m5"]);
  });

  it("★ the SAME occurrence is de-duplicated: a re-render and StrictMode's double mount count once", () => {
    const { rerender } = render(
      <StrictMode>
        <Door kind="moment:m3" />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <Door kind="moment:m3" />
      </StrictMode>,
    );
    expect(screen.queryByTestId("door-moment:m3")).not.toBeNull();
    expect(unpromptedShownCount()).toBe(1);
  });

  it("★★ THE PROBE: 4 companion doors + 1 scorecard door in ONE commit -> the scorecard shown, only 2 companions, no 'shown' effect for a refused or evicted door", () => {
    const shown: string[] = [];
    const onShown = (k: string) => shown.push(k);
    render(
      <>
        <Door kind="companion:c1" priority={P.companion} onShown={onShown} />
        <Door kind="companion:c2" priority={P.companion} onShown={onShown} />
        <Door kind="companion:c3" priority={P.companion} onShown={onShown} />
        <Door kind="companion:c4" priority={P.companion} onShown={onShown} />
        <Door kind="score:WS-1" priority={P.scorecard} onShown={onShown} />
      </>,
    );
    expect(screen.queryByTestId("door-score:WS-1")).not.toBeNull();
    const companions = ["c1", "c2", "c3", "c4"].filter((c) => screen.queryByTestId(`door-companion:${c}`));
    expect(companions).toHaveLength(2);
    expect(unpromptedShownCount()).toBe(3);
    // every 'shown' effect that ran belongs to a door that is on screen and was counted
    expect(shown.map((k) => k.split("#")[0]).sort()).toEqual(
      ["score:WS-1", ...companions.map((c) => `companion:${c}`)].sort(),
    );
    expect(JSON.parse(window.sessionStorage.getItem(MASCOT_BUDGET_KEY)!).shown.sort()).toEqual(
      ["score:WS-1", ...companions.map((c) => `companion:${c}`)].sort(),
    );
  });
});
