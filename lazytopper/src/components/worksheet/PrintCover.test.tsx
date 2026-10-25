import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { PrintCover } from "./PrintCover";

afterEach(cleanup);

describe("PrintCover", () => {
  const base = { kicker: "Maths · Chapter Pack", title: "Real Numbers", subtitle: "Every question, in board order.", edition: "25 Oct 2026",
    stats: [{ value: "37", label: "questions, sections A to E" }, { value: "2", label: "chapter tests" }, { value: "1", label: "worksheet" }] };

  it("renders the kicker, title, subtitle, every stat and the edition", () => {
    const { container } = render(<PrintCover {...base} />);
    const t = container.textContent ?? "";
    for (const s of ["Maths · Chapter Pack", "Real Numbers", "Every question, in board order.", "37", "questions, sections A to E", "chapter tests", "worksheet", "Edition 25 Oct 2026"]) expect(t).toContain(s);
    expect(container.querySelectorAll(".lt-cover__stat")).toHaveLength(3);
  });
  it("shows the licensee box only when a line is given", () => {
    const line = "Licensed to A · a@b.in · Order o1 — personal use only";
    expect(render(<PrintCover {...base} licenseeLine={line} />).container.textContent).toContain(line);
    cleanup();
    expect(render(<PrintCover {...base} />).container.querySelector(".lt-cover__lic")).toBeNull();
  });
  it("a long chapter title uses a smaller size class so it stays on the page", () => {
    const { container } = render(<PrintCover {...base} title="Electricity and the Magnetic Effects of Electric Current" />);
    expect(container.querySelector(".lt-cover__title")?.className).toContain("--s");
  });
});
