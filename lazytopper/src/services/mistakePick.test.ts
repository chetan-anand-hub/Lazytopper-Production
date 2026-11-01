import { describe, it, expect, vi, beforeEach } from "vitest";
import { describeOption, wrongPickFields, briefPickOf } from "./mistakePick";

// TUTOR-MEM-1 (FU-TUTOR-PICK-HISTORY) - the pick helper, and the two writers that store it.
const logMistakesSpy = vi.fn(async () => {});
vi.mock("./mistakeLogService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./mistakeLogService")>();
  return { ...actual, logMistakes: (...a: unknown[]) => logMistakesSpy(...(a as [])) };
});
vi.mock("./adaptivePracticeEngine", () => ({ recordWrongAnswer: vi.fn() }));

import { recordMistake } from "./mistakeIntelligence";
import { recordAttempt, loadInsights } from "./practiceInsights";

const OPTS = ["3", "7", "9", "11"];
const T0 = Date.UTC(2026, 9, 30, 6, 0); // fixed, so the test never reads the clock
const USER = { uid: "u-pick", isLocalSession: false } as never;

function gradedWrong(totalMarks = 1, awarded = 0) {
  return {
    ok: true,
    totalMarks,
    marksAwarded: awarded,
    annotatedSteps: [
      { stepNumber: 1, description: "Pick", studentWork: "b", status: "incorrect", marksAwarded: 0, marksDeducted: 0, teacherAnnotation: "x", mistakeType: "conceptual", correctedWorking: "c" },
    ],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  } as never;
}
const ctx = (extra: Record<string, unknown> = {}) => ({
  subject: "Maths", topic: "Real Numbers", topicKey: "real-numbers", question: "Q", questionId: "bank-pick-1",
  surface: "quick-practice", submissionId: "S1", gradedAt: T0, ...extra,
});
const logged = () => (logMistakesSpy.mock.calls[logMistakesSpy.mock.calls.length - 1] as unknown[])[1] as Record<string, unknown>;

beforeEach(() => {
  logMistakesSpy.mockClear();
  localStorage.clear();
});

describe("mistakePick helper", () => {
  it("names the option by letter and trims it", () => {
    expect(describeOption(OPTS, "7")).toBe("(b) 7");
    expect(describeOption(OPTS, "  9 ")).toBe("(c) 9");
    expect(describeOption(OPTS, "x".repeat(90))).toHaveLength(40 + 0);
    expect(describeOption(OPTS, "")).toBe("");
  });
  it("a wrong pick carries both; a right pick, no pick or an unnamed key carries nothing / no key", () => {
    expect(wrongPickFields(OPTS, "7", "9")).toEqual({ pickedOption: "(b) 7", keyOption: "(c) 9" });
    expect(wrongPickFields(OPTS, "9", "9")).toEqual({});
    expect(wrongPickFields(OPTS, "", "9")).toEqual({});
    expect(wrongPickFields(OPTS, null, "9")).toEqual({});
    expect(wrongPickFields(OPTS, "7", "")).toEqual({ pickedOption: "(b) 7" });
  });
  it("the brief string", () => {
    expect(briefPickOf({ pickedOption: "(b) 7", keyOption: "(c) 9" })).toBe("(b) 7; key (c) 9");
    expect(briefPickOf({ pickedOption: "(b) 7" })).toBe("(b) 7");
    expect(briefPickOf({})).toBe("");
  });
});

describe("recordMistake stores the wrong tap (Quick Practice)", () => {
  it("a wrong objective answer with a pick writes pickedOption + keyOption", async () => {
    const res = await recordMistake(USER, gradedWrong(), ctx({ ...wrongPickFields(OPTS, "7", "9") }));
    expect(res.outcome).toBe("logged");
    expect(logged()).toMatchObject({ pickedOption: "(b) 7", keyOption: "(c) 9" });
  });
  it("no pick supplied -> the entry has neither key (older shape, byte-identical)", async () => {
    await recordMistake(USER, gradedWrong(), ctx());
    expect("pickedOption" in logged()).toBe(false);
    expect("keyOption" in logged()).toBe(false);
  });
  it("a pick on a question that lost nothing is never stored", async () => {
    const habit = { ...(gradedWrong(1, 1) as object) } as never;
    await recordMistake(USER, habit, ctx({ ...wrongPickFields(OPTS, "7", "9") }));
    if (logMistakesSpy.mock.calls.length) expect("pickedOption" in logged()).toBe(false);
  });
});

describe("recordAttempt stores the wrong tap", () => {
  const base = { subject: "maths", topic: "Real Numbers", question: "Q", marksAvailable: 1, mode: "mcq" as const, surface: "practice-card", questionId: "bank-pick-2", timestamp: T0 };
  const stored = (): Array<Record<string, unknown>> =>
    (loadInsights().attempts as unknown as Array<Record<string, unknown>>).filter((x) => x.questionId === "bank-pick-2");
  it("a wrong tap keeps the pick; a right tap does not", () => {
    recordAttempt(USER, { ...base, marksScored: 0, ...wrongPickFields(OPTS, "7", "9") });
    expect(stored().some((a) => a.pickedOption === "(b) 7" && a.keyOption === "(c) 9")).toBe(true);
    localStorage.clear();
    recordAttempt(USER, { ...base, marksScored: 1, pickedOption: "(c) 9", keyOption: "(c) 9" });
    expect(stored().every((a) => !("pickedOption" in a))).toBe(true);
  });
});
