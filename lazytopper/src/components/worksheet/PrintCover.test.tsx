import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PrintCover, BOARD_EXAM_YEAR } from "./PrintCover";
import { CBQ_MIN_PER_CHAPTER, CBQ_MIN_PER_SUBJECT, CBQ_QUESTION_TYPES } from "../../lib/packs/packLabels";

afterEach(cleanup);

describe("PrintCover", () => {
  const base = { kicker: "Maths · Chapter Pack", title: "Real Numbers", subtitle: "Every question, in board order.", edition: "25 Oct 2026",
    stats: [{ value: "37", label: "questions, sections A to E" }, { value: "2", label: "chapter tests" }, { value: "1", label: "worksheet" }] };

  it("renders the kicker, title, subtitle, every stat and the edition", () => {
    const { container } = render(<PrintCover {...base} />);
    const t = container.textContent ?? "";
    for (const s of ["Maths · Chapter Pack", "Real Numbers", "Every question, in board order.", "37", "questions, sections A to E", "chapter tests", "worksheet", "Edition 25 Oct 2026"]) expect(t).toContain(s);
    // first stat is the large figure, the other two sit beside it
    expect(container.querySelector(".lt-cover__bv")?.textContent).toBe("37");
    expect(container.querySelectorAll(".lt-cover__sm")).toHaveLength(2);
  });
  it("a Chapter Pack has no headline count and no question-types row", () => {
    const { container } = render(<PrintCover {...base} />);
    expect(container.textContent).not.toContain("1,400");
    expect(container.textContent).not.toContain("Question types");
    expect(container.querySelector(".lt-cover__types")).toBeNull();
  });
  it("a cover with no stats has no fact strip", () => {
    expect(render(<PrintCover {...base} stats={[]} />).container.querySelector(".lt-cover__facts")).toBeNull();
  });
  it("a CBQ pack shows 1,400+ CBQs, its chapters, 100+ per chapter and its question types from the pack constants", () => {
    const { container } = render(
      <PrintCover
        {...base}
        kicker="SCIENCE CBQ PACK · SCIENCE"
        headline={{ value: `${CBQ_MIN_PER_SUBJECT.toLocaleString("en-IN")}+`, label: "CBQs", note: "competency-based questions" }}
        stats={[{ value: "13", label: "chapters" }, { value: `${CBQ_MIN_PER_CHAPTER}+`, label: "in every chapter" }, { value: String(CBQ_QUESTION_TYPES.length), label: "question types" }]}
        types={CBQ_QUESTION_TYPES}
      />,
    );
    expect(container.querySelector(".lt-cover__bv")?.textContent).toBe("1,400+");
    const t = container.textContent ?? "";
    for (const s of ["CBQs", "competency-based questions", "13", "chapters", "100+", "in every chapter", "question types", "Question types", ...CBQ_QUESTION_TYPES]) expect(t).toContain(s);
    expect(container.querySelectorAll(".lt-cover__chip")).toHaveLength(CBQ_QUESTION_TYPES.length);
    expect(container.querySelectorAll(".lt-cover__sm")).toHaveLength(3);
  });
  it("names the board exam year, the Answer Checker how-to, and never the old Check & Improve name", () => {
    const t = render(<PrintCover {...base} licenseeLine="Licensed to A · a@b.in · Order o1 — personal use only" />).container.textContent ?? "";
    expect(t).toContain(`For CBSE Board Exam ${BOARD_EXAM_YEAR}`);
    for (const s of ["How to use this pack", "Attempt", "Check", "Mark", "Upload your answers to the Answer Checker for CBSE step marking.", "lazytopper.com"]) expect(t).toContain(s);
    expect(t).not.toMatch(/check\s*(&|and)\s*improve/i);
    expect(t).not.toContain("2026-27");
  });
  it("carries the exact IITian trust badge", () => {
    const { container } = render(<PrintCover {...base} />);
    expect(container.querySelector(".lt-cover__iit")?.textContent).toBe("Made by an IITian (IIT Kanpur)");
  });
  it("shows the licensee box only when a line is given", () => {
    const line = "Licensed to A · a@b.in · Order o1 — personal use only";
    expect(render(<PrintCover {...base} licenseeLine={line} />).container.textContent).toContain(line);
    expect(render(<PrintCover {...base} licenseeLine={line} />).container.textContent).toContain("Download again any time until 31 May 2027");
    expect(render(<PrintCover {...base} licenseeLine={line} />).container.textContent).toContain("Please do not share or resell this file.");
    expect(render(<PrintCover {...base} licenseeLine="Licensed to Asha Rao · +91 98*****948 · Order o2 — personal use only" />).container.textContent).toContain("Asha Rao · +91 98*****948");
    cleanup();
    expect(render(<PrintCover {...base} />).container.querySelector(".lt-cover__lic")).toBeNull();
  });
  it("a long chapter title uses a smaller size class so it stays on the page", () => {
    const { container } = render(<PrintCover {...base} title="Electricity and the Magnetic Effects of Electric Current" />);
    expect(container.querySelector(".lt-cover__title")?.className).toContain("--s");
  });
});
