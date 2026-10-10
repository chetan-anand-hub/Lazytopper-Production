import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import { WorksheetPrintDoc } from "./WorksheetPrintDoc";
import { WorksheetGradedPrintDoc } from "./WorksheetGradedPrintDoc";
import { waitForImages } from "./worksheetPdfExport";
import { renderPrintSolutionFigure } from "../../diagrams/printSolutionFigure";
import { getFiguresForQuestion } from "../../data/visualConceptRegistry";
import { loadKatex } from "../question/MathText";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";
import type { WorksheetGradeResponse } from "../../ai/aiClient";

// FIGURES-ALL-SURFACES-1 PR-2 — a printed / PDF worksheet carries the question's official figure (and, in the
// answer key and the graded sheet, the solution figure). Before this lane the print documents dropped both, so
// a printed "in the given figure" question had no figure. These cases pin the DECISION: a bound figure is on the
// sheet, an unbound question gets nothing (honest empty state), and the exporter waits for images before capture.

await loadKatex();
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const BOUND_Q = "APQ-M-ARC-003"; // official crop bound in the figure registry (C3 PR-D1)
const SOLUTION_Q = "2026-TRI-P1-B-005"; // computed solution figure (triangleBpt)

function ws(): PersistedWorksheet {
  return {
    worksheetId: "ws-fig",
    createdAt: "2026-10-10T00:00:00Z",
    title: "Areas related to circles",
    subject: "Maths",
    grade: "10",
    sectionFilter: "All sections (A–E)",
    totalMarks: 2,
    questions: [
      { qNumber: 1, id: BOUND_Q, subject: "Maths", topicKey: "areas-related-to-circles", topicLabel: "Areas", section: "A", marks: 1, questionText: "Find the area of the shaded segment.", options: ["a", "b", "c", "d"], solutionSteps: ["Step one"], finalAnswer: "a" },
      { qNumber: 2, id: "q-without-figure", subject: "Maths", topicKey: "areas-related-to-circles", topicLabel: "Areas", section: "A", marks: 1, questionText: "Find 2 + 2.", options: ["1", "2", "3", "4"], solutionSteps: ["Add"], finalAnswer: "4" },
    ],
  } as unknown as PersistedWorksheet;
}

describe("print documents carry the bound question figure", () => {
  it("the questions sheet draws the official figure for a bound question, and nothing for an unbound one", () => {
    const bound = getFiguresForQuestion(BOUND_Q);
    expect(bound.length).toBeGreaterThan(0); // the premise: this id really has a bound figure
    const { container } = render(<WorksheetPrintDoc ws={ws()} kind="questions" />);
    const imgs = Array.from(container.querySelectorAll<HTMLImageElement>(".lt-pfig__img"));
    expect(imgs).toHaveLength(bound.length);
    expect(imgs[0].getAttribute("src")).toContain(bound[0].filePath);
    expect(imgs[0].getAttribute("alt")).toBe(bound[0].title);
    expect(imgs[0].getAttribute("loading")).toBeNull(); // html2canvas cannot capture a lazy image
    // CONTROL: the unbound question has no figure block at all.
    expect(container.querySelectorAll(`.lt-pfig[data-question-id="q-without-figure"]`)).toHaveLength(0);
  });

  it("the answer key draws the injected solution figure under that question only", () => {
    const render1 = vi.fn((id: string) => (id === BOUND_Q ? <span data-testid="sol-fig">SOLFIG</span> : null));
    render(<WorksheetPrintDoc ws={ws()} kind="answers" renderSolutionFigure={render1} />);
    expect(screen.getAllByTestId("sol-fig")).toHaveLength(1);
    expect(render1).toHaveBeenCalledWith(BOUND_Q);
    expect(render1).toHaveBeenCalledWith("q-without-figure");
  });

  it("the graded sheet draws the question figure and the model-answer solution figure", () => {
    const response = { ok: true, results: [{ qNumber: 1, couldNotRead: false, totalMarks: 1, marksAwarded: 1 }], totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 1, gradedMarksTotal: 1, worksheetTotalMarks: 1 } as unknown as WorksheetGradeResponse;
    const { container } = render(
      <WorksheetGradedPrintDoc ws={ws()} response={response} name="S" code="WS-1" coaching="c" renderSolutionFigure={() => <span data-testid="sol-fig">SOLFIG</span>} />,
    );
    expect(container.querySelectorAll(".lt-pfig__img").length).toBe(getFiguresForQuestion(BOUND_Q).length);
    expect(screen.getAllByTestId("sol-fig")).toHaveLength(1);
  });
});

describe("the solution figure for the PDF", () => {
  it("a question with a computed solution figure gets an inline SVG; one without gets null", () => {
    const node = renderPrintSolutionFigure(SOLUTION_Q);
    expect(node).not.toBeNull();
    const { container } = render(<>{node}</>);
    expect(container.querySelector('figure[data-figure-kind="computed"] svg')).not.toBeNull();
    expect(renderPrintSolutionFigure("q-without-figure")).toBeNull(); // honest empty state
  });
});

describe("the exporter waits for images before it rasterises", () => {
  function hostWith(n: number): { host: HTMLDivElement; imgs: HTMLImageElement[] } {
    const host = document.createElement("div");
    const imgs = Array.from({ length: n }, () => host.appendChild(document.createElement("img")));
    return { host, imgs };
  }

  it("does not resolve until every pending image has loaded (or failed), then resolves", async () => {
    const { host, imgs } = hostWith(2);
    let done = false;
    const p = waitForImages(host, 60_000).then(() => { done = true; });
    imgs[0].dispatchEvent(new Event("load"));
    await Promise.resolve();
    await Promise.resolve();
    expect(done).toBe(false); // one image still pending: capturing now would drop it
    imgs[1].dispatchEvent(new Event("error")); // a broken image must not hang the download
    await p;
    expect(done).toBe(true);
  });

  it("gives up after the timeout so a stalled image can never block the PDF", async () => {
    vi.useFakeTimers();
    const { host } = hostWith(1);
    let done = false;
    const p = waitForImages(host, 5000).then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(4999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(2);
    await p;
    expect(done).toBe(true);
  });

  it("resolves immediately when there are no images", async () => {
    await expect(waitForImages(document.createElement("div"))).resolves.toBeUndefined();
  });
});

describe("the diagrams registry stays out of the worksheet chunk", () => {
  it("only the on-demand module imports it; the print docs, the figure helper and the exporter do not", async () => {
    const fs = await import("node:fs");
    const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
    const eager = ["./WorksheetPrintDoc.tsx", "./WorksheetGradedPrintDoc.tsx", "./printFigures.tsx", "./worksheetPdfExport.ts"];
    for (const f of eager) {
      const src = read(f).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(/from\s+["'][./]+\/diagrams\//.test(src.replace(/import\(["'][^"']*["']\)/g, "")), `${f} must not statically import src/diagrams`).toBe(false);
    }
    // CONTROL: the on-demand module does import it, so the check above can fail.
    expect(read("../../diagrams/printSolutionFigure.tsx")).toMatch(/from "\.\/registry"/);
  });
});
