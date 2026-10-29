import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { WorksheetQuestionGrade } from "../../ai/aiClient";
import { TutorText, splitBold } from "./TutorText";
import { scorecardPickOf } from "./tutorRoundTrip";

/** TUTOR-MIND-2 F5 (bold in the tutor bubble) and F6 (the from= opener's pick). */
describe("splitBold", () => {
  it("splits **bold** from plain text and drops the asterisks", () => {
    expect(splitBold("**Step 6: Check** then done")).toEqual([
      { text: "Step 6: Check", bold: true },
      { text: " then done", bold: false },
    ]);
    expect(splitBold("no markup here")).toEqual([{ text: "no markup here", bold: false }]);
  });
  it("leaves a lone ** or an unclosed pair alone", () => {
    expect(splitBold("2 ** 3 and **open")).toEqual([{ text: "2 ** 3 and **open", bold: false }]);
  });
  it("never splits a ** that sits inside an open math span", () => {
    const t = "Take \\(a ** b ** c\\) now";
    expect(splitBold(t)).toEqual([{ text: t, bold: false }]);
  });
});

describe("TutorText", () => {
  it("renders **bold** as <strong> with no literal asterisks", () => {
    const { container } = render(<TutorText text="**Step 6: Verify** the answer" />);
    expect(container.querySelector("strong")?.textContent).toBe("Step 6: Verify");
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).toContain("the answer");
  });
  it("is not an HTML injection path: markup in the text stays text", () => {
    const { container } = render(<TutorText text={'**<img src=x onerror=alert(1)>**'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("strong")?.textContent).toBe("<img src=x onerror=alert(1)>");
  });
  it("plain text renders unchanged", () => {
    const { container } = render(<TutorText text="Just words." />);
    expect(container.querySelector("strong")).toBeNull();
    expect(container.textContent).toBe("Just words.");
  });
});

describe("scorecardPickOf (F6)", () => {
  const mcq = (o: Record<string, unknown>) => ({ qNumber: 2, couldNotRead: false, ok: true, totalMarks: 1, marksAwarded: 0, percentage: 0, pickedOption: " 4 ", ...o }) as unknown as WorksheetQuestionGrade;
  it("a lost tap answer with a stored pick -> the pick and a wrong verdict, exactly what the opener quotes", () => {
    expect(scorecardPickOf(mcq({}))).toEqual({ pick: "4", correct: false });
  });
  it("full marks, no stored pick, or no result -> nothing is stored", () => {
    expect(scorecardPickOf(mcq({ marksAwarded: 1 }))).toBeNull();
    expect(scorecardPickOf(mcq({ pickedOption: undefined }))).toBeNull();
    expect(scorecardPickOf(null)).toBeNull();
  });
});
