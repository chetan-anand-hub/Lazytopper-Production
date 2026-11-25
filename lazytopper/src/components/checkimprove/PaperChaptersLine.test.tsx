// CI-READ-TOPICS-1 — each question's own chapter at "Read the question" (never the first question's).
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import PaperChaptersLine, { CHAPTER_NOT_SURE, groupQuestionsByChapter } from "./PaperChaptersLine";
import { questionSetSignature, type PerQuestionTopic } from "../../utils/checkImproveDetection";

const t = (qNumber: number, topicName: string, subject: "Maths" | "Science" | "" = "Maths"): PerQuestionTopic => ({
  qNumber,
  topicSlug: topicName ? topicName.toLowerCase().replace(/\s+/g, "-") : "",
  topicName,
  subject,
});

describe("groupQuestionsByChapter", () => {
  it("groups by each question's OWN chapter, in paper order", () => {
    const g = groupQuestionsByChapter([1, 2, 3, 4], [t(1, "Trigonometry"), t(2, "Light"), t(3, "Trigonometry"), t(4, "Light")]);
    expect(g).toEqual([
      { label: "Trigonometry", questions: [1, 3] },
      { label: "Light", questions: [2, 4] },
    ]);
  });
  it("an unplaced question is 'chapter not sure' — never another question's chapter", () => {
    const g = groupQuestionsByChapter([5, 6, 7], [t(5, "Trigonometry"), t(6, ""), { qNumber: 7, topicSlug: "", topicName: "Stale", subject: "" }]);
    expect(g).toEqual([
      { label: "Trigonometry", questions: [5] },
      { label: CHAPTER_NOT_SURE, questions: [6, 7] },
    ]);
  });
  it("a question with no lookup result at all is 'chapter not sure'", () => {
    expect(groupQuestionsByChapter([1, 2], [t(1, "Polynomials")])).toEqual([
      { label: "Polynomials", questions: [1] },
      { label: CHAPTER_NOT_SURE, questions: [2] },
    ]);
  });
});

describe("PaperChaptersLine", () => {
  it("no lookup for this read (free check) keeps the at-grade line", () => {
    render(<PaperChaptersLine questionNumbers={[1, 2]} topics={undefined} />);
    expect(screen.getByTestId("ci-chapters-at-grade").textContent).toMatch(/read when it is graded/);
  });
  it("a running lookup says so", () => {
    render(<PaperChaptersLine questionNumbers={[1, 2]} topics={null} />);
    expect(screen.getByTestId("ci-chapters-loading").textContent).toMatch(/Finding each question.s chapter/);
  });
  it("one chapter for the whole paper reads 'Chapter: X'", () => {
    render(<PaperChaptersLine questionNumbers={[5, 6, 7, 8]} topics={[5, 6, 7, 8].map((n) => t(n, "Trigonometry"))} />);
    expect(screen.getByTestId("ci-chapters").textContent).toBe("Chapter: Trigonometry");
  });
  it("a mixed paper names each chapter with its questions", () => {
    render(<PaperChaptersLine questionNumbers={[1, 2, 3]} topics={[t(1, "Trigonometry"), t(2, "Light", "Science"), t(3, "")]} />);
    expect(screen.getByTestId("ci-chapters").textContent).toBe(
      "Chapters: Trigonometry (Q1)Light (Q2)chapter not sure (Q3)",
    );
  });
  it("a paper where nothing was placed never claims a chapter", () => {
    render(<PaperChaptersLine questionNumbers={[1, 2]} topics={[t(1, ""), t(2, "")]} />);
    expect(screen.getByTestId("ci-chapters").textContent).toBe("Chapters: chapter not sure (Q1, Q2)");
  });
});

describe("questionSetSignature", () => {
  it("ignores marks (a marks edit keeps the lookup) but not text or numbering", () => {
    const a = [{ questionNumber: 1, questionText: "Find x.", marks: 2 }];
    const b = [{ questionNumber: 1, questionText: "Find x.", marks: 3 }];
    expect(questionSetSignature(a)).toBe(questionSetSignature(b));
    expect(questionSetSignature(a)).not.toBe(questionSetSignature([{ ...a[0], questionText: "Find y." }]));
    expect(questionSetSignature(a)).not.toBe(questionSetSignature([{ ...a[0], questionNumber: 2 }]));
    expect(questionSetSignature(null)).toBe("");
  });
});

describe("page wiring (source guard)", () => {
  const src = readFileSync(join(__dirname, "../../pages/desktop/DesktopCheckImprovePage.tsx"), "utf8");
  it("the read starts the lookup for a paid whole paper only", () => {
    expect(src).toMatch(/if \(!freeCallOpts && readQs && readQs\.length > 1\) \{[\s\S]{0,200}resolvePerQuestionGradeTopics\(/);
  });
  it("the grade reuses the lookup only for the SAME question set", () => {
    expect(src).toMatch(/readTopicsRef\.current\.sig === questionSetSignature\(detectedQuestions\)/);
  });
  it("the chip shows the chapter line, not a paper-level chapter", () => {
    expect(src).toMatch(/<PaperChaptersLine/);
    expect(src).not.toMatch(/questions detected<\/strong> · \{confirmed\.subject\}/);
  });
});
