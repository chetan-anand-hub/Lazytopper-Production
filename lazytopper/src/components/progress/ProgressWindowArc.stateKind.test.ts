import { describe, it, expect } from "vitest";
import { progressArcStateKind } from "./ProgressWindowArc";
import type { WindowedProgress, RungTrend } from "../../services/progressStore";

// A data-backed marks rung fixture.
function rung(key: string): RungTrend {
  return { key, label: key, before: 40, now: 55, delta: 15, sampleBefore: 3, sampleNow: 4 };
}

function wp(overrides: Partial<WindowedProgress> = {}): WindowedProgress {
  return {
    window: "month",
    subjects: [],
    topics: [],
    concepts: [],
    sections: [],
    mistakeTypes: [],
    activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 },
    mistakeLog: { loggedInWindow: 0 },
    ...overrides,
  };
}

describe("progressArcStateKind — honest empty-state decision (arc PR-4 §B window-UX fix)", () => {
  it("null data → empty", () => {
    expect(progressArcStateKind(null)).toBe("empty");
  });

  it("no rungs AND no in-window practice → empty (genuinely nothing yet)", () => {
    expect(progressArcStateKind(wp())).toBe("empty");
  });

  it("no rungs BUT in-window practice exists → lopsided (the honest 'both halves' state, NOT a broken 'no data')", () => {
    // This is the confusing case the §B fix targets: a wider window can put all the
    // recent practice on one side of the midpoint → every rung is silent even though
    // there IS practice. It must read as 'lopsided', not the bare 'no data' message.
    expect(progressArcStateKind(wp({ activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 7 } }))).toBe(
      "lopsided",
    );
  });

  it("a subject rung → rungs", () => {
    expect(progressArcStateKind(wp({ subjects: [rung("maths")] }))).toBe("rungs");
  });

  it("only a mistake-type composition rung → rungs", () => {
    expect(progressArcStateKind(wp({ mistakeTypes: [rung("conceptual")], activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 } }))).toBe(
      "rungs",
    );
  });

  it("any of section / topic / concept rungs → rungs", () => {
    expect(progressArcStateKind(wp({ sections: [rung("A")] }))).toBe("rungs");
    expect(progressArcStateKind(wp({ topics: [rung("real-numbers")] }))).toBe("rungs");
    expect(progressArcStateKind(wp({ concepts: [rung("Euclid's lemma")] }))).toBe("rungs");
  });
});
