// @vitest-environment node
import { describe, it, expect } from "vitest";
import { stripOptionLabel, stripSourceTag } from "./worksheetPrintText";

describe("stripOptionLabel: the option's own letter is removed only when it is its position", () => {
  it.each([
    ["(A) 77/6 cm²", 0, "77/6 cm²"],
    ["A) 77/6 cm²", 0, "77/6 cm²"],
    ["B. Carpel", 1, "Carpel"],
    ["(c) 49/6", 2, "49/6"],
    ["  (D)  98/6 cm²", 3, "98/6 cm²"],
  ])("%s at %i -> %s", (o, i, want) => expect(stripOptionLabel(o as string, i as number)).toBe(want));

  it("CONTROLS: content that merely starts with a letter is kept", () => {
    expect(stripOptionLabel("E. coli bacteria", 0)).toBe("E. coli bacteria"); // E is not position 0
    expect(stripOptionLabel("A tangent to the circle", 0)).toBe("A tangent to the circle"); // no ) or .
    expect(stripOptionLabel("(A+B)² = A²+2AB+B²", 0)).toBe("(A+B)² = A²+2AB+B²"); // not a standalone label
    expect(stripOptionLabel("(B) 154/6", 0)).toBe("(B) 154/6"); // letter does not match position: left alone
    expect(stripOptionLabel("77/6 cm²", 0)).toBe("77/6 cm²");
    expect(stripOptionLabel("", 0)).toBe("");
  });
});

describe("stripSourceTag: a printed question does not name its source paper", () => {
  it.each([
    ["Why does it take food? [All India 2017]", "Why does it take food?"],
    ["Name the pathway. [Delhi 2019]", "Name the pathway."],
    ["What is X? [Foreign 2016] Explain.", "What is X? Explain."],
  ])("%s", (t, want) => expect(stripSourceTag(t)).toBe(want));

  it("CONTROLS: brackets that are content stay", () => {
    expect(stripSourceTag("Find x [2]")).toBe("Find x [2]");
    expect(stripSourceTag("Solve [x + 1] = 3")).toBe("Solve [x + 1] = 3");
    expect(stripSourceTag("In 2019 the population [in millions] grew")).toBe("In 2019 the population [in millions] grew");
  });
});
