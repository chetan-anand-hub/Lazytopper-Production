// @vitest-environment node
import { describe, it, expect } from "vitest";
import { stripOptionLabels, stripSourceTag } from "./worksheetPrintText";

describe("stripOptionLabels: a question's own labels are removed only when EVERY option carries its positional label", () => {
  it.each([
    [["(A) 77/6 cm²", "(B) 154/6 cm²", "(C) 49/6 cm²", "(D) 98/6 cm²"], ["77/6 cm²", "154/6 cm²", "49/6 cm²", "98/6 cm²"]],
    [["A) 77/6", "B) 154/6", "C) 49/6", "D) 98/6"], ["77/6", "154/6", "49/6", "98/6"]],
    [["A. Two unequal cells", "B. Two identical cells", "C. Four cells", "D. Many cells"], ["Two unequal cells", "Two identical cells", "Four cells", "Many cells"]],
    [["  (a)  one", "(b) two"], ["one", "two"]],
  ])("%j", (opts, want) => expect(stripOptionLabels(opts as string[])).toEqual(want));

  it("CONTROL (found by the verifier): a statement-combination MCQ keeps its options whole", () => {
    const opts = ["(a) and (b)", "(a) and (c)", "(a), (b) and (c)", "all"];
    expect(stripOptionLabels(opts)).toEqual(opts);
  });

  it("CONTROLS: unlabelled, partly labelled, wrong-position and content-that-starts-with-a-letter options are unchanged", () => {
    expect(stripOptionLabels(["77/6 cm²", "154/6 cm²"])).toEqual(["77/6 cm²", "154/6 cm²"]);
    expect(stripOptionLabels(["(A) one", "two", "(C) three"])).toEqual(["(A) one", "two", "(C) three"]);
    expect(stripOptionLabels(["(B) one", "(A) two"])).toEqual(["(B) one", "(A) two"]);
    expect(stripOptionLabels(["E. coli", "B. subtilis"])).toEqual(["E. coli", "B. subtilis"]);
    expect(stripOptionLabels(["A tangent", "B point"])).toEqual(["A tangent", "B point"]);
    expect(stripOptionLabels([])).toEqual([]);
  });
});

describe("stripSourceTag: a printed question or answer does not name its source paper", () => {
  it.each([
    ["Why does it take food? [All India 2017]", "Why does it take food?"],
    ["Name the pathway. [Delhi 2019]", "Name the pathway."],
    ["What is X? [Foreign 2016] Explain.", "What is X? Explain."],
    ["Find the mean. [CBSE 2016-17]", "Find the mean."],
    ["Prove it. [Delhi 2017, CBSE 2014]", "Prove it."],
    ["Solve. [CBSE 2011 C]", "Solve."],
  ])("%s", (t, want) => expect(stripSourceTag(t)).toBe(want));

  it("CONTROLS: brackets that are content stay", () => {
    expect(stripSourceTag("Find x [2]")).toBe("Find x [2]");
    expect(stripSourceTag("Solve [x + 1] = 3")).toBe("Solve [x + 1] = 3");
    expect(stripSourceTag("In 2019 the population [in millions] grew")).toBe("In 2019 the population [in millions] grew");
    expect(stripSourceTag("The CBSE board [2 marks] asks")).toBe("The CBSE board [2 marks] asks");
  });
});
