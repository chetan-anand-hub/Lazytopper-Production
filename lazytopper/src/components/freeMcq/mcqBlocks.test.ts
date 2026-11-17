import { describe, expect, it } from "vitest";
import { dollarMathToParen, optionLabel, parseMcqBlocks } from "./mcqBlocks";

describe("mcqBlocks", () => {
  it("$..$ becomes \\(..\\), text without $ is unchanged", () => {
    expect(dollarMathToParen("a $x^2$ b $y$")).toBe("a \\(x^2\\) b \\(y\\)");
    expect(dollarMathToParen("2$^{nd}$ term")).toBe("2\\(^{nd}\\) term");
    expect(dollarMathToParen("plain")).toBe("plain");
  });

  it("a markdown table between two paragraphs becomes text, table, text", () => {
    const blocks = parseMcqBlocks("Look at the table:\n\n| Class | 35-45 | 45-55 |\n|---|---|---|\n| Frequency | 8 | 12 |\n\nThe median is:");
    expect(blocks).toEqual([
      { kind: "text", text: "Look at the table:" },
      { kind: "table", head: ["Class", "35-45", "45-55"], rows: [["Frequency", "8", "12"]] },
      { kind: "text", text: "The median is:" },
    ]);
  });

  it("an empty header cell and a lettered first column are kept; numbered lines stay as text with their line breaks", () => {
    const [t] = parseMcqBlocks("| | Bacteria | Fungi |\n|---|---|---|\n| (a) | no | yes |");
    expect(t).toEqual({ kind: "table", head: ["", "Bacteria", "Fungi"], rows: [["(a)", "no", "yes"]] });
    expect(parseMcqBlocks("Stem:\n1. One.\n2. Two.\nThe correct option is:")).toEqual([{ kind: "text", text: "Stem:\n1. One.\n2. Two.\nThe correct option is:" }]);
  });

  it("a pipe line that is not a table (no separator row) stays text", () => {
    expect(parseMcqBlocks("a | b")).toEqual([{ kind: "text", text: "a | b" }]);
    expect(parseMcqBlocks("| not a table |")).toEqual([{ kind: "text", text: "| not a table |" }]);
  });

  it("an option that already opens with its own label gets no second one", () => {
    expect(optionLabel("a", "(a) Bacteria: no")).toBe("");
    expect(optionLabel("a", "(a)")).toBe("");
    expect(optionLabel("b", "(B) and (D).")).toBe("(b)"); // statements named A-D, not a label
    expect(optionLabel("a", "(i) and (ii)")).toBe("(a)");
    expect(optionLabel("c", "57.5")).toBe("(c)");
  });
});
