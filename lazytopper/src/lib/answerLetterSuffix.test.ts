import { describe, expect, it } from "vitest";
import { stripAnswerLetter } from "./answerLetterSuffix";

describe("stripAnswerLetter", () => {
  it("removes the trailing key letter", () => {
    expect(stripAnswerLetter("Area = πr² = 154 cm². Answer: (D)")).toBe("Area = πr² = 154 cm².");
  });
  it("leaves other text alone", () => {
    expect(stripAnswerLetter("Use the formula A = πr²")).toBe("Use the formula A = πr²");
    expect(stripAnswerLetter("Answer: (D) comes first here, then more")).toBe("Answer: (D) comes first here, then more");
  });
});
