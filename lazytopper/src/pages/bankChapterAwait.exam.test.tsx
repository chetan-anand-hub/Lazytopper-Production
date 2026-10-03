// BANK-SPLIT-1 PR-2 (L4) — route await guard: Exam Simulation.
//
// "Generate & Start Exam" builds a paper from every chapter of the subject. On a cold
// cache the click must await those chapters first. Remove the await and generation reads
// unloaded chapters, throws BankChapterNotLoadedError, no paper appears: RED.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));

import ExamSimulationPage from "./ExamSimulationPage";
import {
  __resetBankChaptersForTest,
  bankChaptersForSubject,
  isBankChapterLoaded,
} from "../data/bankChapters/loader";

beforeEach(() => {
  window.localStorage.clear();
  __resetBankChaptersForTest();
});
afterEach(() => {
  cleanup();
});

describe("L4 route await — Exam Simulation", () => {
  it("★ a cold click loads the subject's chapters, then generates a real paper", async () => {
    render(
      <MemoryRouter initialEntries={["/exam-simulation?subject=Science"]}>
        <Routes>
          <Route path="/exam-simulation" element={<ExamSimulationPage />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Generate & Start Exam/ }));
    // The breathing moment appears only once a paper exists (generatePaper sets it).
    expect(await screen.findByRole("button", { name: /Skip/ }, { timeout: 60000 })).toBeInTheDocument();
    expect(bankChaptersForSubject("Science").every(isBankChapterLoaded)).toBe(true);
    expect(bankChaptersForSubject("Maths").some(isBankChapterLoaded)).toBe(false);
  }, 90000);
});
