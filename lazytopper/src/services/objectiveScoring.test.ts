// @vitest-environment node
//
// Pure unit tests for the single-source objective-scoring module
// (server/routes/objectiveScoring.cjs) — the SINGLE place the invariant
// "an OBJECTIVE question scores 0 or FULL, never fractional / step-distributed;
// working is analysed ONLY to classify the mistake type" lives. No network, no LLM.
//
// Answer-key shape (verified against the banks): `answer` is the correct OPTION TEXT
// (matching one of `options`), NOT a letter — but a student's handwritten pick may be a
// LETTER ("(b)") or the text, so the compare bridges both via `options`.
import { describe, expect, it } from "vitest";
// CJS module imported into the ESM test via Vite interop.
import * as O from "../../server/routes/objectiveScoring.cjs";

const step = (o: Record<string, unknown> = {}) => ({
  description: "x",
  studentWork: "",
  status: "incorrect",
  marksAwarded: 0,
  marksDeducted: 0,
  teacherAnnotation: "",
  mistakeType: null,
  correctedWorking: null,
  ...o,
});

describe("normaliseOption", () => {
  it('collapses "(a)", "A", "a", "a." to the same token', () => {
    expect(O.normaliseOption("(a)")).toBe("a");
    expect(O.normaliseOption("A")).toBe("a");
    expect(O.normaliseOption("a")).toBe("a");
    expect(O.normaliseOption("a.")).toBe("a");
  });
  it("makes punctuation/whitespace/case drift compare equal", () => {
    expect(O.normaliseOption("1 : 2")).toBe(O.normaliseOption("1:2"));
    expect(O.normaliseOption("Coincident")).toBe(O.normaliseOption("coincident"));
  });
});

describe("resolveOptionIndex", () => {
  const opts = ["0", "7", "14", "1"];
  it("resolves option TEXT to its index", () => {
    expect(O.resolveOptionIndex("7", opts)).toBe(1);
  });
  it("resolves a LETTER to its index", () => {
    expect(O.resolveOptionIndex("(b)", opts)).toBe(1);
    expect(O.resolveOptionIndex("B", opts)).toBe(1);
  });
  it("returns -1 when it cannot resolve (no options / garbage)", () => {
    expect(O.resolveOptionIndex("xyz", [])).toBe(-1);
  });
  it("does NOT let a 1-char option match inside unrelated garbage text", () => {
    // "a) 1 1" (corrupt key) must NOT match the single-char option "1".
    expect(O.resolveOptionIndex("a) 1 1", opts)).toBe(-1);
  });
});

describe("scoreObjective — 0 or FULL, never a fraction", () => {
  const opts = ["0", "7", "14", "1"];
  const optsTxt = ["Basic solution", "Acidic solution", "Neutral solution", "Salt solution"];

  it("key + correct pick (text) -> full", () => {
    expect(O.scoreObjective({ answerKey: "7", studentPick: "7", options: opts, totalMarks: 1 }))
      .toEqual({ marksAwarded: 1, correct: true, resolved: true });
  });
  it("key + wrong pick (text) -> 0", () => {
    expect(O.scoreObjective({ answerKey: "7", studentPick: "14", options: opts, totalMarks: 1 }))
      .toEqual({ marksAwarded: 0, correct: false, resolved: true });
  });
  it('bridges a LETTER pick to the option TEXT key ("(b)" == "Acidic solution")', () => {
    expect(O.scoreObjective({ answerKey: "Acidic solution", studentPick: "(b)", options: optsTxt, totalMarks: 1 }))
      .toEqual({ marksAwarded: 1, correct: true, resolved: true });
    expect(O.scoreObjective({ answerKey: "Acidic solution", studentPick: "(a)", options: optsTxt, totalMarks: 1 }))
      .toEqual({ marksAwarded: 0, correct: false, resolved: true });
  });
  it("bare-letter bank (answer + options both letters) compares correctly", () => {
    const L = ["A", "B", "C", "D"];
    expect(O.scoreObjective({ answerKey: "A", studentPick: "A", options: L, totalMarks: 1 }).correct).toBe(true);
    expect(O.scoreObjective({ answerKey: "A", studentPick: "B", options: L, totalMarks: 1 }).correct).toBe(false);
  });
  it("two clean letters compare directly even with NO options", () => {
    expect(O.scoreObjective({ answerKey: "(a)", studentPick: "(b)", options: [], totalMarks: 1 }))
      .toEqual({ marksAwarded: 0, correct: false, resolved: true });
    expect(O.scoreObjective({ answerKey: "(a)", studentPick: "A", options: [], totalMarks: 1 }))
      .toEqual({ marksAwarded: 1, correct: true, resolved: true });
  });
  it("corrupt answer key (matches no option) -> UNRESOLVED (defer to model, no false 0)", () => {
    expect(O.scoreObjective({ answerKey: "a) 1 1", studentPick: "(b)", options: opts, totalMarks: 1 }))
      .toEqual({ marksAwarded: 0, correct: false, resolved: false });
  });
  it("assertion-reason full-text key with NO options + letter pick -> UNRESOLVED", () => {
    expect(O.scoreObjective({
      answerKey: "Both A and R are true, and R is the correct explanation of A.",
      studentPick: "(a)", options: [], totalMarks: 1,
    })).toEqual({ marksAwarded: 0, correct: false, resolved: false });
  });
  it("missing key or pick -> UNRESOLVED", () => {
    expect(O.scoreObjective({ answerKey: "7", studentPick: "", options: opts, totalMarks: 1 }).resolved).toBe(false);
  });
});

describe("objectiveHasWorking — bare pick vs real reasoning", () => {
  const opts = ["0", "7", "14", "1"];
  const optsTxt = ["Basic solution", "Acidic solution", "Neutral solution", "Salt solution"];
  it("a bare option letter is NOT working", () => {
    expect(O.objectiveHasWorking("(d)", opts)).toBe(false);
  });
  it("a bare option text is NOT working", () => {
    expect(O.objectiveHasWorking("Acidic solution", optsTxt)).toBe(false);
  });
  it("empty is NOT working", () => {
    expect(O.objectiveHasWorking("", opts)).toBe(false);
  });
  it("substantive reasoning IS working", () => {
    expect(O.objectiveHasWorking("I chose d because the reaction is exothermic", opts)).toBe(true);
  });
});

describe("clampObjectiveResult — 0/full verdict, per-step marks stripped", () => {
  const opts = ["0", "7", "14", "1"];

  it("key + correct: full marks, step stripped, status aligned correct (overrides a 0.5 model award)", () => {
    const steps = [step({ studentWork: "7", status: "incorrect", marksAwarded: 0.5, marksDeducted: 0.5, mistakeType: "calculation" })];
    const r = O.clampObjectiveResult({ section: "A", answer: "7", options: opts }, steps, 1);
    expect(r).toEqual({ marksAwarded: 1, correct: true });
    expect([steps[0].marksAwarded, steps[0].marksDeducted, steps[0].status]).toEqual([0, 0, "correct"]);
  });

  it("key + wrong: 0, overrides a model that (wrongly) said correct", () => {
    const steps = [step({ studentWork: "14", status: "correct", marksAwarded: 1, marksDeducted: 0 })];
    const r = O.clampObjectiveResult({ section: "A", answer: "7", options: opts }, steps, 1);
    expect(r).toEqual({ marksAwarded: 0, correct: false });
    expect([steps[0].marksAwarded, steps[0].marksDeducted, steps[0].status]).toEqual([0, 0, "incorrect"]);
  });

  it("NO key + model returns 0.5 (incorrect) -> clamped to 0 (model binary verdict)", () => {
    const steps = [step({ studentWork: "(d)", status: "incorrect", marksAwarded: 0.5, marksDeducted: 0.5 })];
    const r = O.clampObjectiveResult({ section: "A" }, steps, 1);
    expect(r).toEqual({ marksAwarded: 0, correct: false });
    expect([steps[0].marksAwarded, steps[0].marksDeducted]).toEqual([0, 0]);
  });

  it("NO key + model says correct -> clamped to full", () => {
    const steps = [step({ studentWork: "(a)", status: "correct", marksAwarded: 0.5, marksDeducted: 0 })];
    expect(O.clampObjectiveResult({ section: "A" }, steps, 1)).toEqual({ marksAwarded: 1, correct: true });
  });
});

describe("applyObjectiveMistakeGuard — MI honesty + the feature", () => {
  const opts = ["0", "7", "14", "1"];

  it("objective + key + WORKING + wrong -> 0 marks AND a NON-null mistakeType (MI learns)", () => {
    const steps = [step({ studentWork: "I picked d because refraction bends toward — wrong reasoning", status: "incorrect", mistakeType: "conceptual" })];
    O.clampObjectiveResult({ section: "A", answer: "7", options: opts }, steps, 1); // -> 0, status incorrect
    const nulled = O.applyObjectiveMistakeGuard(steps, { objective: true, options: opts });
    expect(steps[0].mistakeType).toBe("conceptual"); // KEPT — the point of the feature
    expect(nulled).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
  });

  it("objective + wrong BARE pick -> mistakeType nulled (undiagnosable)", () => {
    const steps = [step({ studentWork: "(d)", status: "incorrect", mistakeType: "conceptual" })];
    O.clampObjectiveResult({ section: "A", answer: "7", options: opts }, steps, 1);
    const nulled = O.applyObjectiveMistakeGuard(steps, { objective: true, options: opts });
    expect(steps[0].mistakeType).toBeNull();
    expect(nulled).toEqual({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 });
  });

  it("SUBJECTIVE unchanged: a wrong worked answer keeps its type AND its step marks", () => {
    const steps = [step({ studentWork: "used F=ma (wrong)", status: "incorrect", marksAwarded: 0, marksDeducted: 3, mistakeType: "conceptual" })];
    const nulled = O.applyObjectiveMistakeGuard(steps, { objective: false });
    expect(steps[0].mistakeType).toBe("conceptual");
    expect([steps[0].marksAwarded, steps[0].marksDeducted]).toEqual([0, 3]); // NOT stripped
    expect(nulled).toEqual({ conceptual: 0, calculation: 0, silly: 0, presentation: 0 });
  });

  it("SUBJECTIVE no-working (empty) -> type nulled (mirror of the legacy guard)", () => {
    const steps = [step({ studentWork: "", status: "incorrect", mistakeType: "conceptual" })];
    const nulled = O.applyObjectiveMistakeGuard(steps, { objective: false });
    expect(steps[0].mistakeType).toBeNull();
    expect(nulled).toEqual({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 });
  });
});

describe("isObjective", () => {
  it("classifies via section A / MCQ / assertion-reason, false for subjective", () => {
    expect(O.isObjective({ section: "A" })).toBe(true);
    expect(O.isObjective({ format: "MCQ" })).toBe(true);
    expect(O.isObjective({ qType: "assertionreason" })).toBe(true);
    expect(O.isObjective({ section: "C", format: "Short" })).toBe(false);
    expect(O.isObjective(null)).toBe(false);
  });
});
