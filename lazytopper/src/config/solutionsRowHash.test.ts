import { describe, expect, it } from "vitest";
import { rowHash, type Row } from "../../scripts/solutions/selectSolutions";

const base = {
  questionText: "Solve x + y = 5 and x - y = 1.",
  options: undefined,
  answer: "x = 3, y = 2",
  finalAnswer: "x = 3, y = 2",
  ncertRef: "NCERT Ex 3.1",
  solutionSteps: ["Add the equations: 2x = 6.", "So x = 3 and y = 2."],
} as unknown as Row;
const withSteps = (solutionSteps: string[]) => ({ ...base, solutionSteps }) as Row;

describe("rowHash ignores the mark scheme, not the solution", () => {
  it("a prefixed and an unprefixed copy hash equal (decimal, plural and the half glyph)", () => {
    expect(rowHash(withSteps(["[1 mark] Add the equations: 2x = 6.", "[1 marks] So x = 3 and y = 2."]))).toBe(rowHash(base));
    expect(rowHash(withSteps(["[0.5 mark] Add the equations: 2x = 6.", "[1.5 marks] So x = 3 and y = 2."]))).toBe(rowHash(base));
    expect(rowHash(withSteps(["[½ mark] Add the equations: 2x = 6.", "So x = 3 and y = 2."]))).toBe(rowHash(base));
  });
  it("re-cutting a step at the same words does not change the hash", () => {
    expect(rowHash(withSteps(["Add the equations:", "2x = 6.", "So x = 3", "and y = 2."]))).toBe(rowHash(base));
    expect(rowHash(withSteps(["Add the equations: 2x = 6. So x = 3 and y = 2."]))).toBe(rowHash(base));
  });
  it("any change to the words, the key or the question still changes it", () => {
    expect(rowHash(withSteps(["[1 mark] Add the equations: 2x = 8.", "[1 mark] So x = 4 and y = 3."]))).not.toBe(rowHash(base));
    expect(rowHash({ ...base, answer: "x = 4, y = 1" } as Row)).not.toBe(rowHash(base));
    expect(rowHash({ ...base, questionText: "Solve x + y = 6 and x - y = 1." } as Row)).not.toBe(rowHash(base));
  });
});
