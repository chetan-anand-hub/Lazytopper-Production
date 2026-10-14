import { describe, it, expect, vi, beforeEach } from "vitest";

// GRADER-CONSEQUENTIAL-1 (D242) — Mistake Intelligence records an ERROR once.
//
// The grader now says which later steps' lost marks FOLLOW FROM an earlier typed error
// (`consequentialOf`) and counts those marks under that error's type in `marksLostByType`. It does
// NOT give the later steps a type of their own, so the question still writes ONE entry with ONE
// step detail and ONE conceptual count — while its marks are the full 2.5 and nothing is untyped.
// This pins exactly that: a consequential step creates no second MI entry for the same question and type.

const logMistakesSpy = vi.fn(async () => {});

vi.mock("./mistakeLogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeLogService")>();
  return { ...actual, logMistakes: (...a: unknown[]) => logMistakesSpy(...(a as [])) };
});
vi.mock("./adaptivePracticeEngine", () => ({ recordWrongAnswer: vi.fn() }));

import { recordMistake } from "./mistakeIntelligence";
import type { MistakeLogEntry } from "./mistakeLogService";

const USER = { uid: "u-conseq", isLocalSession: false } as never;
const step = (n: number, o: Record<string, unknown>) => ({
  stepNumber: n, description: "d", studentWork: "w", status: "correct", marksAwarded: 0, marksDeducted: 0,
  teacherAnnotation: "t", mistakeType: null, correctedWorking: null, part: null, ...o,
});

/** The owner's CI-M-POLY-03 Q4 as the grader now returns it (v2). */
function ownersQ4(withConsequentialPointers = true) {
  return {
    ok: true, totalMarks: 5, marksAwarded: 2.5, objective: false,
    annotatedSteps: [
      step(1, { marksAwarded: 2, marksAvailable: 2 }),
      step(2, { status: "partial", marksAwarded: 0.5, marksDeducted: 0.5, marksAvailable: 1, mistakeType: "conceptual" }),
      step(3, { status: "incorrect", marksDeducted: 1.5, marksAvailable: 1.5, ...(withConsequentialPointers ? { consequentialOf: 2 } : {}) }),
      step(4, { status: "incorrect", marksDeducted: 0.5, marksAvailable: 0.5, ...(withConsequentialPointers ? { consequentialOf: 2 } : {}) }),
    ],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0, departure: 0 },
    marksLostByType: { conceptual: 2.5, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0 },
  } as never;
}

const loggedEntries = () => logMistakesSpy.mock.calls.map((c) => (c as unknown[])[1] as Omit<MistakeLogEntry, "id">);
// gradedAt is passed so the entry never reads the clock (CLOCK_GUARD)
const CTX = { subject: "Maths", topic: "Arithmetic Progressions", topicKey: "arithmetic-progressions", question: "Find the sum of the first 20 terms", questionId: "ws:ws-1:q4", gradedAt: 1_760_000_000_000 };

beforeEach(() => { logMistakesSpy.mockClear(); localStorage.clear(); });

describe("recordMistake — a consequential step is not a second mistake", () => {
  it("★ the owner's Q4 writes ONE entry, ONE step detail (the origin), ONE conceptual count, and the full 2.5 marks under conceptual", async () => {
    const res = await recordMistake(USER, ownersQ4(), CTX);
    expect(res.outcome).toBe("logged");
    const entries = loggedEntries();
    expect(entries).toHaveLength(1);
    const e = entries[0];
    expect(e.stepDetails.map((s) => s.stepNumber)).toEqual([2]);
    expect(e.mistakeCounts).toEqual({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 });
    expect(e.marksLostByType).toMatchObject({ conceptual: 2.5, untyped: 0 });
    expect(e.marksLost).toBe(2.5);
  });

  it("CONTROL — the entry is identical with or without the consequentialOf pointers (the field is display-only for MI)", async () => {
    // two question ids, so MI's identity dedup does not swallow the second write; the id is the only difference
    await recordMistake(USER, ownersQ4(true), CTX);
    const a = { ...loggedEntries()[0], questionId: "x" };
    logMistakesSpy.mockClear();
    await recordMistake(USER, ownersQ4(false), { ...CTX, questionId: "ws:ws-2:q4" });
    expect(loggedEntries()).toHaveLength(1);
    const b = { ...loggedEntries()[0], questionId: "x" };
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
