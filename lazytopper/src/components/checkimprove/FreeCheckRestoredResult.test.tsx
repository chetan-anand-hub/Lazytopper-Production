/**
 * ACT-FREECHECK-1 — the saved free result, shown again after sign-up: exactly as graded,
 * one honest "saved" line, one purchase line (Board Pass + CBQ Pack from the catalogue),
 * events on show and on the buy tap, and an honest fallback when it cannot be recovered.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const track = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackNamedEvent: (...a: unknown[]) => track(...a) };
});

import { boardPassPriceDisplay } from "../../config/pricing";
import { FreeCheckRestoredResult, FREE_CHECK_RESTORED_COPY, freeCheckBuyCopy } from "./FreeCheckRestoredResult";
import type { PendingMultiFreeCheck, PendingSingleFreeCheck } from "../../services/freeCheckClient";

const SINGLE: PendingSingleFreeCheck = {
  v: 1,
  kind: "single",
  gradedAt: 1_700_000_000_000,
  subject: "Maths",
  topicName: "Real Numbers",
  topicSlug: "real-numbers",
  topicTouched: false,
  question: "Prove root 2 is irrational.",
  marksSource: "stated",
  detectionOverride: null,
  graded: {
    ok: true,
    totalMarks: 3,
    marksAwarded: 1,
    percentage: 33,
    annotatedSteps: [
      {
        stepNumber: 1,
        description: "Assume root 2 is rational",
        studentWork: "root 2 = p/q",
        status: "correct",
        marksAwarded: 1,
        marksDeducted: 0,
        teacherAnnotation: "Good start.",
        mistakeType: null,
        correctedWorking: null,
      },
      {
        stepNumber: 2,
        description: "Square both sides",
        studentWork: "2 = p/q",
        status: "incorrect",
        marksAwarded: 0,
        marksDeducted: 1,
        teacherAnnotation: "You forgot to square p/q.",
        mistakeType: "conceptual",
        correctedWorking: "2q^2 = p^2",
      },
    ],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "Revise the contradiction method.",
  },
};

const mount = (result: PendingSingleFreeCheck | null, showBuy = true) =>
  render(
    <MemoryRouter>
      <FreeCheckRestoredResult result={result} showBuy={showBuy} />
    </MemoryRouter>,
  );

beforeEach(() => {
  track.mockReset();
  vi.stubEnv("VITE_PACKS_ENABLED", "1");
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("FreeCheckRestoredResult", () => {
  it("shows marks, every step with its status and mistake type, the note, and the saved line", () => {
    const { container } = mount(SINGLE);
    const text = (container.querySelector(".lt-fr")?.textContent ?? "").replace(/\.lt-fr[\s\S]*?\(max-width: 480px\)[^}]*\}[^}]*\}/, "");
    expect(text).toContain(FREE_CHECK_RESTORED_COPY.saved);
    expect(text).toContain("1/3 marks");
    expect(screen.getAllByTestId("free-check-restored-step")).toHaveLength(2);
    expect(text).toContain("Correct");
    expect(text).toContain("Incorrect");
    expect(text).toContain("Concept gap");
    expect(text).toContain("Revise the contradiction method.");
  });

  it("fires free_check_result_restored once when shown", () => {
    mount(SINGLE);
    expect(track.mock.calls.filter(([n]) => n === "free_check_result_restored")).toHaveLength(1);
  });

  it("purchase line: Board Pass to /pricing, CBQ Pack to /packs?pack=cbq, prices from config, tap fires the event", () => {
    const { container } = mount(SINGLE);
    const buy = freeCheckBuyCopy(Date.now(), true);
    expect(buy.boardPassLink).toContain(boardPassPriceDisplay());
    expect(buy.packLink).toContain("199");
    expect(screen.getByTestId("free-check-restored-buy-pass").getAttribute("href")).toBe("/pricing");
    const pack = screen.getByTestId("free-check-restored-buy-pack");
    expect(pack.getAttribute("href")).toBe("/packs?pack=cbq");
    expect(screen.getByTestId("free-check-restored-buy").textContent).not.toMatch(/599|999|save \d+%/i);
    fireEvent.click(pack);
    expect(track).toHaveBeenCalledWith("free_check_result_restored_buy_click");
  });

  it("no purchase line for a student who already holds a paid pass", () => {
    mount(SINGLE, false);
    expect(screen.queryByTestId("free-check-restored-buy")).toBeNull();
  });

  it("when the result cannot be recovered it says so, shows no buy line and fires no 'restored' event", () => {
    mount(null);
    expect(screen.getByText(FREE_CHECK_RESTORED_COPY.unavailable)).toBeTruthy();
    expect(screen.queryByTestId("free-check-restored-buy")).toBeNull();
    expect(track).not.toHaveBeenCalled();
  });
});

describe("FreeCheckRestoredResult — a whole paper (kind: multi)", () => {
  const step = (n: number, status: string) => ({
    stepNumber: n, description: `d${n}`, studentWork: "", status, marksAwarded: 1, marksDeducted: 0,
    teacherAnnotation: "", mistakeType: null, correctedWorking: null,
  });
  const MULTI = {
    v: 1, kind: "multi", gradedAt: 1, subject: "Science", topicName: "", topicSlug: "", topicTouched: false,
    questions: [{ questionNumber: 1, questionText: "a" }, { questionNumber: 2, questionText: "b" }, { questionNumber: 3, questionText: "c" }],
    response: {
      ok: true,
      results: [
        { qNumber: 1, couldNotRead: false, totalMarks: 2, ok: true, marksAwarded: 1, percentage: 50, annotatedSteps: [step(1, "correct"), step(2, "withdrawn")], mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 }, teacherNote: "n1" },
        { qNumber: 2, couldNotRead: true, totalMarks: 3, note: "unreadable" },
        // a graded question with NO steps, summary or note: must not crash
        { qNumber: 3, couldNotRead: false, totalMarks: 1, ok: true, marksAwarded: 1, percentage: 100 },
      ],
      totalQuestions: 3, gradedCount: 2, pendingCount: 1, gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 6,
    },
  } as unknown as PendingMultiFreeCheck;

  it("one 'Question N' heading per question; an unreadable one says so; withdrawn work is not marked; missing parts do not crash", () => {
    render(
      <MemoryRouter>
        <FreeCheckRestoredResult result={MULTI} showBuy />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Question 1", "Question 2", "Question 3"]);
    expect(screen.getByText("2/3 marks")).toBeTruthy();
    expect(screen.getAllByTestId("free-check-restored-step")).toHaveLength(1); // the withdrawn step is not drawn as marked
    expect(screen.getByText(/couldn.t read/i)).toBeTruthy();
    expect(screen.getByText("n1")).toBeTruthy();
  });

  it("a multi result with no results array does not crash", () => {
    const bad = { ...MULTI, response: { ...MULTI.response, results: undefined } } as unknown as PendingMultiFreeCheck;
    expect(() => render(<MemoryRouter><FreeCheckRestoredResult result={bad} showBuy={false} /></MemoryRouter>)).not.toThrow();
  });
});
