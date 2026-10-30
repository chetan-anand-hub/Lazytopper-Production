import { describe, it, expect } from "vitest";
import { sourceLabelOf, buildAnchorQuestion } from "./tutorAnchorQuestion";

describe("sourceLabelOf (real tag shapes from the banks)", () => {
  it.each([
    [{ id: "CHEM-EXMPLR-1-MCQ-002", ncertRef: "Exemplar Ex 1.1 Q2 (MCQ)" }, "NCERT Exemplar Ex 1.1 Q2"],
    [{ id: "X", ncertRef: "NCERT Ex 4.2 Q3" }, "NCERT Ex 4.2 Q3"],
    [{ id: "X", ncertRef: "Exercise Q3" }, "NCERT Exercise Q3"],
    [{ id: "PYQ-S-2024-CTRL-001", ncertRef: "PYQ 31/4/1 Q7", pyqYear: "2024" }, "CBSE 2024 board paper"],
    [{ id: "CFPQ-S-CARB-001", ncertRef: "CBSE CFPQ Science Class 10 Ch.4 - x" }, "CBSE competency-focus practice question"],
    [{ id: "LTG-M-AP-001" }, "LazyTopper practice question"],
    [{ id: "LTG-M-AP-002", pyqYear: "2023" }, "LazyTopper practice question"],
    [{ id: "PYQ-M-2", pyqYear: "2023", sourceOverride: "others" }, "LazyTopper practice question"],
    [{ id: "SCQ-S-CARB-020", ncertRef: "cbjesccq04 Q1" }, "LazyTopper practice question"],
    [{ id: "METAL-EXMPLR-1-MCQ-003" }, "NCERT Exemplar"],
    [{ id: "WHO-KNOWS" }, "LazyTopper practice question"],
  ])("%j -> %s", (row, label) => {
    expect(sourceLabelOf(row)).toBe(label);
  });
  it("rides the anchor", () => {
    expect(buildAnchorQuestion({ id: "A", questionText: "q", ncertRef: "Exemplar Ex 1.1 Q2" })?.source).toBe("NCERT Exemplar Ex 1.1 Q2");
  });
});
