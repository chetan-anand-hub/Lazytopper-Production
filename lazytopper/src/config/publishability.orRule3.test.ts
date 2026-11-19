import { describe, expect, it } from "vitest";
import { isPublishable } from "../../scripts/seo/publishability";

const noAi = new Set<string>();
const unbound = { hasBoundFigure: () => false };
const row = (marks: number, steps: string[]) => ({ id: `OR-R3-${marks}-${steps.length}`, questionText: "Solve.", marks, solutionSteps: steps });
const v = (marks: number, steps: string[]) => isPublishable(row(marks, steps), noAi, unbound);

describe("Rule 3 is OR-aware: the main route carries the marks, the OR alternative is not added on top", () => {
  it("an OR question whose main route sums to the marks publishes (both routes summed would be 6 on 4)", () => {
    expect(v(4, ["[1 mark] (a) x", "[1 mark] (b) y", "[2 marks] (c) (i) z", "[2 marks] OR (c) (ii) w"])).toEqual({ ok: true });
    expect(v(3, ["[1 mark] a", "[1 mark] b", "[1 mark] c", "[1 mark] OR: d", "[2 marks] OR Part ii: e"])).toEqual({ ok: true });
  });
  it("an OR question whose main route misses the marks is still rejected", () => {
    expect(v(4, ["[1 mark] (a) x", "[1 mark] (b) y", "[1 mark] (c) (i) z", "[2 marks] OR (c) (ii) w"])).toMatchObject({
      ok: false,
      reason: "marks-do-not-sum",
    });
  });
  it("without an OR step the plain sum rule is unchanged", () => {
    expect(v(2, ["[1 mark] a", "[1 mark] b", "[1 mark] c"])).toMatchObject({ ok: false, reason: "marks-do-not-sum" });
    expect(v(2, ["[1 mark] a", "[1 mark] b"])).toEqual({ ok: true });
  });
  it('"OR = ..." names a segment and is not an alternative', () => {
    expect(v(2, ["[1 mark] a", "[1 mark] OR = √x", "[1 mark] c"])).toMatchObject({ ok: false, reason: "marks-do-not-sum" });
  });
});
