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
import type { PendingSingleFreeCheck } from "../../services/freeCheckClient";

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
