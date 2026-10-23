/**
 * MI-CARELESS-1 — careless marks (Me's easy-marks card) and a chapter's gap type are read from
 * the entry's own v2 marks (`marksLostByType`), falling back to the step deductions ONLY for a
 * count-only legacy entry. Read side only: grading, the objective clamp and every mark are
 * untouched.
 *
 * Why: the per-step deductions UNDER-state a v2 loss —
 *   - a wrong MCQ / 1-mark answer WITH working, typed by the grader: the objective clamp keeps
 *     the step's type but strips its marks (0), while the 1 mark lost is typed in the v2 split
 *     (owner rule, 23 Oct: it belongs under its category; the score never changes);
 *   - a consequential slip: inherited marks are typed only in the v2 split;
 *   - departure-zeroed work: the typed step carries 0.
 * So Me's "Take these marks back" card (shown only when careless marks > 0) could stay hidden,
 * breaking the Act leg of the loop for careless mistakes, and a concept-gap chapter lost its tag.
 */
import { describe, it, expect } from "vitest";
import { summarizeCareless } from "./mistakeInsightsService";
import { buildChapters } from "./meHomeSummary";
import { mistakeLossByGroup } from "./progressReadModel";
import type { MistakeLogEntry } from "./mistakeLogService";
import type { RungTrend } from "./progressStore";
import { zeroMarksLost, type MarksLostByType } from "../lib/mistakeDisplay";

let n = 0;
function entry(v2: Partial<MarksLostByType> | null, steps: Array<[string, number]>, topic = "Real Numbers"): MistakeLogEntry {
  n += 1;
  const m = v2 ? { ...zeroMarksLost(), ...v2 } : null;
  const counts = { conceptual: 0, calculation: 0, silly: 0, presentation: 0 } as Record<string, number>;
  for (const [t] of steps) if (t in counts) counts[t] += 1;
  return {
    id: `e${n}`,
    timestamp: "2026-10-20T06:00:00.000Z",
    questionText: `q${n}`,
    topic,
    subject: "Maths",
    totalMarks: 3,
    marksLost: m ? Object.values(m).reduce((s, v) => s + v, 0) : steps.reduce((s, [, d]) => s + d, 0),
    mistakeCounts: counts,
    stepDetails: steps.map(([mistakeType, marksDeducted], i) => ({ stepNumber: i + 1, mistakeType, marksDeducted })),
    ...(m ? { marksLostByType: m, marksLostByTypeVersion: 1 } : {}),
  } as unknown as MistakeLogEntry;
}

describe("easy marks (summarizeCareless) — the entry's own marks, the SAME rule as Me's hero split", () => {
  it("★ a wrong MCQ WITH working, typed silly: the step is clamped to 0, the 1 mark still counts as careless", () => {
    const s = summarizeCareless([entry({ silly: 1 }, [["silly", 0]])]);
    expect(s.marksLost).toBe(1);
    // The card's own condition (MeProgressPage: careless.hasData && careless.marksLost > 0).
    expect(s.hasData && s.marksLost > 0).toBe(true);
  });

  it("★ a consequential slip: one step deducts 1, the v2 split types 3 → 3 careless marks", () => {
    expect(summarizeCareless([entry({ calculation: 3 }, [["calculation", 1]])]).marksLost).toBe(3);
  });

  it("★ departure-zeroed slips (typed steps carrying 0) still count by their v2 marks", () => {
    expect(summarizeCareless([entry({ silly: 1, calculation: 2 }, [["silly", 0], ["calculation", 0]])]).marksLost).toBe(3);
  });

  it("★ equals Me's hero 'careless' figure for the same entries (one rule, two readers)", () => {
    const entries = [
      entry({ silly: 1 }, [["silly", 0]]),
      entry({ calculation: 3 }, [["calculation", 1]]),
      entry({ conceptual: 2, untyped: 1 }, [["conceptual", 2]]),
      entry({ presentation: 1, unattempted: 1 }, [["presentation", 1]]),
    ];
    expect(summarizeCareless(entries).marksLost).toBe(mistakeLossByGroup(entries).careless);
    expect(summarizeCareless(entries).marksLost).toBe(4);
  });

  it("CONTROL — not-careless losses never count: concept, presentation, not attempted, reason not recorded", () => {
    expect(summarizeCareless([entry({ conceptual: 2, presentation: 1, unattempted: 1, untyped: 1 }, [["conceptual", 2], ["presentation", 1]])]).marksLost).toBe(0);
  });

  it("CONTROL — a count-only LEGACY entry keeps today's rule: its careless step deductions, as stored", () => {
    expect(summarizeCareless([entry(null, [["calculation", 1.5], ["silly", 0.5], ["conceptual", 2]])]).marksLost).toBe(2);
  });

  // MI-CARELESS-1 review — the LEGACY step path follows the split's rule exactly (mistakeLossByGroup).
  it("★ legacy: a step type in another case ('Silly', ' Calculation ') is still careless — as in Me's split", () => {
    const entries = [entry(null, [["Silly", 1], [" Calculation ", 0.5]])];
    expect(summarizeCareless(entries).marksLost).toBe(1.5);
    expect(summarizeCareless(entries).marksLost).toBe(mistakeLossByGroup(entries).careless);
  });

  it("★ legacy: a negative or non-numeric deduction never subtracts or counts — as in Me's split", () => {
    const entries = [entry(null, [["silly", -2], ["calculation", Number.NaN], ["silly", 1]])];
    expect(summarizeCareless(entries).marksLost).toBe(1);
    expect(summarizeCareless(entries).marksLost).toBe(mistakeLossByGroup(entries).careless);
  });

  it("★ an entry without mistakeCounts still counts its MARKS (as in Me's split) — and adds no count", () => {
    const bare = { ...entry({ silly: 1 }, [["silly", 0]]) } as unknown as Record<string, unknown>;
    delete bare.mistakeCounts;
    const entries = [bare as unknown as MistakeLogEntry];
    const s = summarizeCareless(entries);
    expect(s.marksLost).toBe(1);
    expect(s.marksLost).toBe(mistakeLossByGroup(entries).careless);
    expect(s.count).toBe(0);
  });

  it("CONTROL — the counts are unchanged (they come from mistakeCounts, never from marks)", () => {
    const s = summarizeCareless([entry({ silly: 1 }, [["silly", 0]]), entry({ calculation: 3 }, [["calculation", 1]])]);
    expect({ calculationCount: s.calculationCount, sillyCount: s.sillyCount, count: s.count }).toEqual({ calculationCount: 1, sillyCount: 1, count: 2 });
  });
});

describe("a chapter's gap type (buildChapters) — from the entry's own marks", () => {
  const rung = (lostAvail = 10): RungTrend[] => [{
    key: "real-numbers", label: "Real Numbers", before: 50, now: 50, delta: 0, sampleBefore: 3, sampleNow: 3, spanDays: 5,
    marksScored: lostAvail / 2, marksAvailable: lostAvail,
  }];
  const gapOf = (entries: MistakeLogEntry[]) => buildChapters(rung(), "Maths", { "real-numbers": entries })[0].gapType;

  it("★ departure-zeroed concept gaps (typed steps carrying 0) tag the chapter 'conceptual'", () => {
    expect(gapOf([entry({ conceptual: 2 }, [["conceptual", 0]]), entry({ conceptual: 1 }, [["conceptual", 0]])])).toBe("conceptual");
  });

  it("★ a consequential slip that outweighs the concept gap leaves the chapter untagged (slips never name a chapter)", () => {
    // Steps alone say conceptual 2 vs calculation 1 (tagged); the v2 marks say calculation 3 dominates.
    expect(gapOf([entry({ conceptual: 2 }, [["conceptual", 2]]), entry({ calculation: 3 }, [["calculation", 1]])])).toBeNull();
  });

  it("CONTROL — a count-only legacy chapter keeps today's rule (step deductions)", () => {
    expect(gapOf([entry(null, [["conceptual", 2]]), entry(null, [["calculation", 1]])])).toBe("conceptual");
    expect(gapOf([entry(null, [["conceptual", 1]]), entry(null, [["calculation", 2]])])).toBeNull();
  });
});
