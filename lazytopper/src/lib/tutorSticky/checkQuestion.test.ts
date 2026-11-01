// TUTOR-STICKY-1 — the one-tap check: objective, key-resolving, same concept when possible, deterministic.
import { describe, expect, it } from "vitest";
import { gradeCheckPick, selectCheckQuestion, type CheckBankRow } from "./checkQuestion";

const mcq = (id: string, subtopic: string, over: Partial<CheckBankRow> = {}): CheckBankRow => ({
  id,
  format: "MCQ",
  subtopic,
  questionText: `Question ${id}?`,
  options: ["alpha", "beta", "gamma", "delta"],
  answer: "gamma",
  ...over,
});

describe("selectCheckQuestion", () => {
  it("prefers the same concept and says so", () => {
    const q = selectCheckQuestion({ rows: [mcq("a", "Ohm's law"), mcq("b", "Resistance")], concept: "Resistance" });
    expect(q?.id).toBe("b");
    expect(q?.sameConcept).toBe(true);
  });

  it("falls back to the chapter and does not claim the concept", () => {
    const q = selectCheckQuestion({ rows: [mcq("a", "Ohm's law")], concept: "Resistance" });
    expect(q?.id).toBe("a");
    expect(q?.sameConcept).toBe(false);
  });

  it("only offers an objective whose key resolves, with no figure, never an excluded id", () => {
    const rows = [
      mcq("short", "x", { format: "Short" }),
      mcq("fig", "x", { requiresDiagram: true }),
      mcq("fig2", "x", { questionText: "In the figure shown, find the angle" }),
      mcq("badkey", "x", { answer: "not an option" }),
      mcq("one", "x", { options: ["only"] }),
      mcq("seen", "x"),
      mcq("ok", "x"),
    ];
    expect(selectCheckQuestion({ rows, excludeIds: ["seen"] })?.id).toBe("ok");
  });

  it("returns null when the bank has nothing honest to ask", () => {
    expect(selectCheckQuestion({ rows: [mcq("a", "x", { answer: "zzz" })] })).toBeNull();
    expect(selectCheckQuestion({ rows: [] })).toBeNull();
  });

  it("is deterministic and rotates with how many were offered", () => {
    const rows = [mcq("a", "x"), mcq("b", "x")];
    expect(selectCheckQuestion({ rows })?.id).toBe("a");
    expect(selectCheckQuestion({ rows })?.id).toBe("a");
    expect(selectCheckQuestion({ rows, excludeIds: ["zzz"] })?.id).toBe("b");
  });
});

describe("gradeCheckPick", () => {
  it("grades 0-or-full on the key alone", () => {
    const q = selectCheckQuestion({ rows: [mcq("a", "x")] })!;
    expect(q.correctIndex).toBe(2);
    expect(gradeCheckPick(q, 2)).toBe(true);
    expect(gradeCheckPick(q, 0)).toBe(false);
    expect(gradeCheckPick(q, 9)).toBe(false);
  });
});
