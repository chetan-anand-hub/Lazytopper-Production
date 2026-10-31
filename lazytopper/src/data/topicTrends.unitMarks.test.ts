import { describe, expect, it } from "vitest";
import { class10MathTopicTrends } from "./class10MathTopicTrends";
import { class10ScienceTopicTrends } from "./class10ScienceTopicTrends";

// WEIGHTAGE-1: each unit's chapter weightage sums to CBSE 2026-27 unit marks / 80 x 100.
const m = class10MathTopicTrends.topics as Record<string, { weightagePercent: number }>;
const s = class10ScienceTopicTrends.topics as unknown as Record<string, { weightagePercent: number }>;
const sum = (o: Record<string, { weightagePercent: number }>, keys: string[]) =>
  keys.reduce((a, k) => { expect(o[k], k).toBeDefined(); return a + o[k].weightagePercent; }, 0);
const pct = (marks: number) => (marks / 80) * 100;

describe("Exam Trends weightage = CBSE 2026-27 unit marks", () => {
  const maths: Array<[string, string[], number]> = [
    ["Number Systems", ["Real Numbers"], 6],
    ["Algebra", ["Polynomials", "Pair of Linear Equations", "Quadratic Equations", "Arithmetic Progression"], 20],
    ["Coordinate Geometry", ["Coordinate Geometry"], 6],
    ["Geometry", ["Triangles", "Circles"], 15],
    ["Trigonometry", ["Trigonometry"], 12],
    ["Mensuration", ["Areas Related to Circles", "Surface Areas and Volumes"], 10],
    ["Statistics and Probability", ["Statistics", "Probability"], 11],
  ];
  it.each(maths)("Maths %s", (_n, keys, marks) => {
    expect(Math.abs(sum(m, keys) - pct(marks))).toBeLessThanOrEqual(0.05);
  });
  it("Maths sums to 100", () => {
    expect(Math.abs(sum(m, Object.keys(m)) - 100)).toBeLessThanOrEqual(0.05);
  });
  const sci: Array<[string, string[], number]> = [
    ["Chemical Substances", ["ChemicalReactions", "AcidsBasesSalts", "MetalsNonMetals", "CarbonCompounds"], 25],
    ["World of Living", ["LifeProcesses", "ControlAndCoordination", "Reproduction", "HeredityEvolution"], 25],
    ["Natural Phenomena", ["Light", "HumanEyeAndColourfulWorld"], 12],
    ["Effects of Current", ["Electricity", "MagneticEffects"], 13],
    ["Natural Resources", ["OurEnvironment"], 5],
  ];
  it.each(sci)("Science %s", (_n, keys, marks) => {
    expect(Math.abs(sum(s, keys) - pct(marks))).toBeLessThanOrEqual(0.05);
  });
  it("Science sums to 100", () => {
    expect(Math.abs(sum(s, Object.keys(s)) - 100)).toBeLessThanOrEqual(0.05);
  });
});
