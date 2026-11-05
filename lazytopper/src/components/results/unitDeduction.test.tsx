import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { isUnitDeductionNote, UNIT_DEDUCTION_NOTE } from "./unitDeduction";
import { UnitDeductionNote } from "./UnitDeductionNote";
import { StepAnnotation } from "./StepAnnotation";

// UNIT-LABEL-1 - strings below are the grader's real outputs (rules.cjs unitComment() and the
// golden/eval fixtures: W, V, Ohm, cm3), plus the lines that must NOT be labelled.
const REAL = [
  "−½: write the unit (cm³) with your final answer.",
  "−½: write the unit (W) with your final answer.",
  "−½: write the unit (V) with your final answer.",
  "−½: write the unit (Ω) with your final answer.",
  "−½: write the unit (m/s²) with your final answer. Also check the sign.",
  "✓ −½: write the unit (J) with your final answer.",
];
const NOT = [
  "No mark is lost for a unit here: this answer is a pure number, so it has no unit.",
  "The unit was already charged once in this question, so no further mark is lost here.",
  "Remember to write the unit (cm³) with your final volume.",
  "Take g = 9.8 m/s² and write the unit.",
  "−½: write the conclusion line.",
  "−½: units digit is wrong",
  "", null, undefined, 5,
];

describe("isUnitDeductionNote", () => {
  it("matches the grader's canonical unit-deduction comment", () => {
    for (const t of REAL) expect(isUnitDeductionNote(t), t).toBe(true);
  });
  it("does not match given-back lines, advice or other deductions", () => {
    for (const t of NOT) expect(isUnitDeductionNote(t), String(t)).toBe(false);
  });
  it("the matcher agrees with the grader's own unitComment() for every unit it names", () => {
    const rules = createRequire(import.meta.url)("../../../server/grading/rules.cjs") as { unitComment: (u: string) => string };
    for (const u of ["cm\u00B3", "W", "V", "\u03A9", "m/s\u00B2", "kg", "\u00B0C", "km/h", "Rs."]) {
      expect(isUnitDeductionNote(rules.unitComment(u)), u).toBe(true);
    }
  });
  it("matches the unit comments stored in the golden fixtures, and only those", () => {
    const dir = resolve(__dirname, "../../../server/eval/golden");
    const lines: string[] = [];
    for (const f of ["truth/repins.json", "truth/rulings-a17.json", "controller-papers/paper-01/key.json"]) {
      const txt = readFileSync(resolve(dir, f), "utf8");
      for (const m of txt.matchAll(/"((?:[^"\\]|\\.)*write the unit(?:[^"\\]|\\.)*)"/g)) lines.push(JSON.parse(`"${m[1]}"`));
    }
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      const canonical = /^\s*\u2212\u00BD: write the unit \(/.test(l);
      expect(isUnitDeductionNote(l), l).toBe(canonical);
    }
  });
});

describe("UnitDeductionNote", () => {
  it("renders the honest line for a unit deduction and nothing otherwise", () => {
    const on = renderToStaticMarkup(<UnitDeductionNote annotation={REAL[0]} />);
    expect(on).toContain("lt-unitnote");
    expect(on).toContain(UNIT_DEDUCTION_NOTE);
    expect(on).not.toContain("style=");
    expect(/refund|give back|returned/i.test(UNIT_DEDUCTION_NOTE)).toBe(false);
    expect(renderToStaticMarkup(<UnitDeductionNote annotation={NOT[0]} />)).toBe("");
    expect(renderToStaticMarkup(<UnitDeductionNote annotation={undefined} />)).toBe("");
  });
  it("StepAnnotation draws it only when given the unit comment as `annotation`", () => {
    const withIt = renderToStaticMarkup(<StepAnnotation tone="bad" annotation={REAL[1]}>{REAL[1]}</StepAnnotation>);
    expect(withIt).toContain(UNIT_DEDUCTION_NOTE);
    const other = renderToStaticMarkup(<StepAnnotation tone="bad" annotation="Check the formula.">Check the formula.</StepAnnotation>);
    expect(other).not.toContain("lt-unitnote");
    const omitted = renderToStaticMarkup(<StepAnnotation tone="bad">{REAL[1]}</StepAnnotation>);
    expect(omitted).not.toContain("lt-unitnote");
  });
});
