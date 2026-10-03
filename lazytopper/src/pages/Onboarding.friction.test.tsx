// FRICTION-FIX-1 · F1 (P4-P6) — Onboarding no longer promises the retired study plan and
// no longer names a hard-coded session. The session in the box title is DERIVED from the
// board-date config (cbseDates.class10.boardExam); with "now" pinned to 3 Oct 2026 the
// predictor yields a Feb 2027 board exam, so the title reads the 2026-27 session.
//
// Mutations this file turns RED: re-insert "study plan" into the page (rendered-output pin);
// type a session literal back into the page (source pin); hard-code the title (clock pin).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CbseExamDateResult } from "../services/cbseExamDate";

vi.mock("../services/cbseExamDate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/cbseExamDate")>();
  return {
    ...actual,
    fetchCbseExamDate: vi.fn(
      async (): Promise<CbseExamDateResult> => ({
        studentClass: "10",
        examDate: actual.predictCbseExamDate("10"),
        source: "predicted",
        phase: "phase1",
      }),
    ),
  };
});
vi.mock("../context/ProfileContext", () => ({
  useProfile: () => ({ loadingProfile: false, setProfileAndCompute: vi.fn() }),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));

import Onboarding from "./Onboarding";

const SOURCE = readFileSync(resolve(process.cwd(), "src/pages/Onboarding.tsx"), "utf8");

function renderPage() {
  return render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Onboarding — F1 source pins", () => {
  it("the page source carries no session-year literal (e.g. 20XX-YY)", () => {
    expect(SOURCE).not.toMatch(/20\d\d[-\u2013]\d\d/);
  });

  it("the page source still derives the title from the board-date config", () => {
    expect(SOURCE).toMatch(/cbseDates\.class10\.boardExam/);
  });
});

describe("Onboarding — F1 rendered copy", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-03T06:00:00.000Z"), toFake: ["Date"] });
  });

  it("heading line, button and the derived 2026-27 session title", async () => {
    const { container } = renderPage();
    expect(screen.getByText("We'll pace your preparation from this.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start preparing" })).toBeInTheDocument();
    const title = await screen.findByText("CBSE 2026-27: Two-Exam System");
    // expand the box so every rendered string is on screen for the pin below
    fireEvent.click(title);
    expect(container.textContent || "").toMatch(/Phase 1 \(Compulsory\)/);
  });

  it("★ the rendered page never says 'study plan' (any case)", async () => {
    const { container } = renderPage();
    fireEvent.click(await screen.findByText(/^CBSE .*Two-Exam System$/));
    expect(container.textContent || "").not.toMatch(/study plan/i);
    expect(container.textContent || "").not.toMatch(/Build My Study Plan/i);
  });

  it("the session rolls over with the config: pinned to Oct 2029 it reads 2029-30", async () => {
    vi.setSystemTime(new Date("2029-10-03T06:00:00.000Z"));
    renderPage();
    expect(await screen.findByText("CBSE 2029-30: Two-Exam System")).toBeInTheDocument();
  });
});
