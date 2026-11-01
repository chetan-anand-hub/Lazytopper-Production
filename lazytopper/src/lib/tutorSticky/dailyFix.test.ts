// TUTOR-STICKY-1 — the daily-fix picks: real, unresolved mistakes only; at most 3; IST-day reset.
import { beforeEach, describe, expect, it } from "vitest";
import {
  DAILY_FIX_MAX,
  dailyFixHeading,
  dominantTypeOf,
  istDay,
  markFixCleared,
  nextFix,
  readClearedFixes,
  selectDailyFixes,
} from "./dailyFix";
import type { MistakeLogEntry } from "../../services/mistakeLogService";

const HOUR = 3600_000;
// Tue 3 Nov 2026, 10:00 IST.
const NOW = Date.UTC(2026, 10, 3, 4, 30);

function entry(over: Partial<MistakeLogEntry> & { id: string }): MistakeLogEntry {
  return {
    timestamp: new Date(NOW - HOUR).toISOString(),
    questionText: "q",
    topic: "electricity",
    subject: "Science",
    totalMarks: 3,
    marksLost: 0.5,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 },
    stepDetails: [],
    marksLostByType: { conceptual: 0, calculation: 0, silly: 0.5, presentation: 0, unattempted: 0, untyped: 0 },
    marksLostByTypeVersion: 1,
    questionId: "SCI-ELEC-1",
    concept: "Ohm's law",
    ...over,
  } as MistakeLogEntry;
}

beforeEach(() => localStorage.clear());

describe("selectDailyFixes", () => {
  it("says nothing without a real mistake", () => {
    expect(selectDailyFixes([], NOW)).toEqual([]);
  });

  it("names the chapter, the kind and the real marks, and anchors the tutor URL on the first", () => {
    const [a] = selectDailyFixes([entry({ id: "m1" })], NOW);
    expect(a.line).toBe("Electricity — silly slip, 0.5 marks");
    expect(a.path).toContain("/tutor/10/Science/electricity?");
    const q = new URLSearchParams(a.path.split("?")[1]);
    expect(q.get("q")).toBe("SCI-ELEC-1");
    expect(q.get("fix")).toBe("m1");
    expect(q.get("concept")).toBe("Ohm's law");
    expect(q.get("returnTo")).toBe("/");
  });

  it("takes at most three, newest first as given, one per question", () => {
    const rows = [1, 2, 3, 4, 5].map((n) => entry({ id: `m${n}`, questionId: `Q${n}` }));
    rows.push(entry({ id: "dup", questionId: "Q1" }));
    expect(selectDailyFixes(rows, NOW).map((i) => i.key)).toEqual(["m1", "m2", "m3"]);
    expect(DAILY_FIX_MAX).toBe(3);
  });

  it("skips a won-back, a re-graded, a habit-only, a not-attempted and a zero-mark entry", () => {
    const rows = [
      entry({ id: "won", resolvedAt: new Date(NOW).toISOString(), resolvedBy: "later-correct-attempt" }),
      entry({ id: "regrade", resolvedAt: new Date(NOW).toISOString(), resolvedBy: "re-grade" }),
      entry({ id: "habit", habitOnly: true }),
      entry({
        id: "blank",
        marksLostByType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0.5, untyped: 0 },
      }),
      entry({ id: "zero", marksLost: 0 }),
      entry({ id: "good" }),
    ];
    expect(selectDailyFixes(rows, NOW).map((i) => i.key)).toEqual(["good"]);
  });

  it("never guesses a chapter or a paper, and never uses a paper's synthetic id as a bank id", () => {
    const rows = [
      entry({ id: "nochapter", topic: "not-a-chapter" }),
      entry({ id: "nopaper", subject: "" }),
      entry({ id: "ws", questionId: "ws:abc:q2" }),
    ];
    const out = selectDailyFixes(rows, NOW);
    expect(out.map((i) => i.key)).toEqual(["ws"]);
    expect(out[0].questionId).toBeNull();
    expect(out[0].path).not.toContain("q=");
  });

  it("resets daily (IST): cleared today stays ticked, cleared earlier is gone", () => {
    const rows = [entry({ id: "a", questionId: "QA" }), entry({ id: "b", questionId: "QB" }), entry({ id: "c", questionId: "QC" })];
    const out = selectDailyFixes(rows, NOW, { a: istDay(NOW), b: "2026-11-02" });
    expect(out.map((i) => [i.key, i.done])).toEqual([["a", true], ["c", false]]);
    expect(nextFix(out)?.key).toBe("c");
    expect(nextFix(out, "c")).toBeNull();
    expect(dailyFixHeading(out)).toBe("Fix 1 lost mark today");
  });

  it("an IST midnight rolls the day, not a UTC one", () => {
    expect(istDay(Date.UTC(2026, 10, 3, 18, 29))).toBe("2026-11-03");
    expect(istDay(Date.UTC(2026, 10, 3, 18, 31))).toBe("2026-11-04");
  });
});

describe("dominantTypeOf", () => {
  it("reads the costliest typed bucket; a count-only entry uses the grader's own counts", () => {
    expect(dominantTypeOf(entry({ id: "x" }))).toBe("silly");
    const legacy = entry({ id: "y", marksLostByType: undefined, marksLostByTypeVersion: undefined, mistakeCounts: { conceptual: 2, calculation: 1, silly: 0, presentation: 0 } });
    expect(dominantTypeOf(legacy)).toBe("conceptual");
  });
});

describe("the cleared-fix record", () => {
  it("round-trips per uid and tolerates junk", () => {
    markFixCleared("u1", "a", "2026-11-03");
    expect(readClearedFixes("u1")).toEqual({ a: "2026-11-03" });
    expect(readClearedFixes("u2")).toEqual({});
    localStorage.setItem("lazytopper.tutorDailyFix.v1.u3", "{not json");
    expect(readClearedFixes("u3")).toEqual({});
  });
});
