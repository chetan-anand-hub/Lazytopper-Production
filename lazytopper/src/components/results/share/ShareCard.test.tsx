import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import ShareCard from "./ShareCard";
import { buildShareCardModel } from "./shareCardModel";
import type { ScorecardVariant } from "../scorecardVariants";

/** SHARE-SCORE-1 - the image card shows the score and brand, and NOTHING personal or worked. */
afterEach(cleanup);

function variant(over: Partial<ScorecardVariant> = {}): ScorecardVariant {
  return {
    surface: "worksheet",
    title: "Real Numbers · Worksheet 3",
    subtitle: "WS-M-RN-03 · graded just now",
    score: { kind: "marks", awarded: 17.5, total: 20 },
    message: "SECRET-MESSAGE",
    gradedAnswers: [
      {
        label: "Q1",
        awarded: 1,
        available: 2,
        verdict: "SECRET-VERDICT",
        lostDetail: "SECRET-WORKING",
        steps: [
          {
            stepNumber: 1,
            description: "SECRET-STEP",
            studentWork: "SECRET-STUDENT-WORK",
            status: "incorrect",
            marksAwarded: 0,
            marksDeducted: 1,
          } as never,
        ],
      },
    ],
    wrongAnswers: [{ label: "Q2", yourAnswer: "SECRET-YOUR-ANSWER", correctAnswer: "B", steps: ["SECRET-SOLUTION"] }],
    actions: [{ label: "SECRET-ACTION", tone: "primary", onClick: () => {} }],
    ...over,
  };
}

const typedMarks = {
  byType: { conceptual: 1, calculation: 0, silly: 0, presentation: 1.5, unattempted: 0, untyped: 0 },
  lost: 2.5,
  unsplitCount: 0,
};

function renderCard(v: ScorecardVariant) {
  const model = buildShareCardModel(v, "17 Oct 2026");
  if (!model) throw new Error("expected a shareable variant");
  return render(<ShareCard model={model} />);
}

describe("ShareCard", () => {
  it("renders score, surface, chapter, date and the footer", () => {
    const { container } = renderCard(variant());
    const text = container.textContent ?? "";
    expect(text).toContain("17.5");
    expect(text).toContain("/ 20");
    expect(text).toContain("Worksheet");
    expect(text).toContain("Real Numbers");
    expect(text).toContain("17 Oct 2026");
    expect(text).toContain("Check your own answers free - lazytopper.com");
    expect(text).toContain("LazyTopper");
  });

  it("renders NO code, answers, working, verdicts or actions", () => {
    const { container } = renderCard(variant({ marksLost: typedMarks }));
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/SECRET/);
    expect(text).not.toContain("WS-M-RN-03");
    expect(container.querySelector("button, a, input, img")).toBeNull();
  });

  it("shows the mistake split in marks only when typed marks exist", () => {
    const withSplit = renderCard(variant({ marksLost: typedMarks }));
    expect(withSplit.container.querySelector("[data-testid='share-split']")).not.toBeNull();
    expect(withSplit.container.textContent).toContain("Knowledge gap");
    cleanup();
    const countOnly = renderCard(variant({ marksLost: null, fourType: { conceptual: 3, calculation: 0, silly: 0, presentation: 0 } }));
    expect(countOnly.container.querySelector("[data-testid='share-split']")).toBeNull();
  });

  it("is a fixed 1080 x 1350 card", () => {
    const { container } = renderCard(variant());
    const card = container.querySelector(".lt-share");
    expect(card).not.toBeNull();
    const css = container.querySelector("style")?.textContent ?? "";
    expect(css).toMatch(/\.lt-share\s*\{[^}]*width:\s*1080px;[^}]*height:\s*1350px;/);
  });
});
