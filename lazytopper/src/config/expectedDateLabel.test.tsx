// PHASE2-DATE-1 — owner ruling 5 (2026-09-28): every exact board / phase-2 day a student
// sees says it is EXPECTED while it is predicted ("17 Feb 2027 (expected)"); a date from
// CBSE's notice or the admin override (`source: "official"`) shows bare. Drop the label
// from `formatExpectedCbseDate` in `src/config/cbseDates.ts` and this file turns red.

import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatCbseDate, formatExpectedCbseDate, cbseDates } from "./cbseDates";
import type { CbseExamDateResult } from "../services/cbseExamDate";

const fetchMock = vi.hoisted(() => ({
  result: null as CbseExamDateResult | null,
}));

vi.mock("../services/cbseExamDate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/cbseExamDate")>();
  return {
    ...actual,
    fetchCbseExamDate: vi.fn(async () => fetchMock.result as CbseExamDateResult),
  };
});
vi.mock("../context/ProfileContext", () => ({
  useProfile: () => ({ loadingProfile: false, setProfileAndCompute: vi.fn() }),
}));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("../data/highlyProbableQuestions", () => ({ getHighlyProbableQuestions: () => [] }));

import { CBSE_PHASE2_DATE } from "../services/cbseExamDate";
import Onboarding from "../pages/Onboarding";
import { SprintDashboard } from "../components/dashboard/SprintDashboard";

/** Onboarding's own headline format (en-IN, 2-digit day, short month). */
function headline(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${iso}T00:00:00`),
  );
}

afterEach(() => {
  fetchMock.result = null;
});

describe("formatExpectedCbseDate — the label follows the date's source", () => {
  it("a predicted date carries '(expected)' after the date", () => {
    expect(formatExpectedCbseDate("2027-02-17", "predicted")).toBe(`${formatCbseDate("2027-02-17")} (expected)`);
    expect(formatExpectedCbseDate("2027-05-15", "predicted")).toMatch(/2027 \(expected\)$/);
  });

  it("no source = the synchronous predictor = always expected", () => {
    expect(formatExpectedCbseDate("2027-02-17")).toBe(`${formatCbseDate("2027-02-17")} (expected)`);
  });

  it("an official / admin-override date shows WITHOUT the label", () => {
    expect(formatExpectedCbseDate("2027-02-17", "official")).toBe(formatCbseDate("2027-02-17"));
    expect(formatExpectedCbseDate("2027-02-17", "official")).not.toMatch(/expected/i);
  });

  it("an unknown date stays 'TBD' — never 'TBD (expected)'", () => {
    expect(formatExpectedCbseDate(null)).toBe("TBD");
    expect(formatExpectedCbseDate("not-a-date", "predicted")).toBe("TBD");
  });
});

describe("SprintDashboard — predictor-only rows are always labelled expected", () => {
  it("phase 1 and phase 2 both render '<date> (expected)'", () => {
    render(<SprintDashboard daysLeft={30} navigate={vi.fn()} gradeNum="10" />);
    expect(screen.getByText(`${formatCbseDate(cbseDates.class10.phase1)} (expected)`)).toBeInTheDocument();
    expect(screen.getByText(`${formatCbseDate(CBSE_PHASE2_DATE)} (expected)`)).toBeInTheDocument();
  });
});

describe("Onboarding — the headline date and Phase 1 row are source-aware; Phase 2 is predicted", () => {
  it("predicted: the headline says 'Expected exam date' and both phase rows carry '(expected)'", async () => {
    fetchMock.result = { studentClass: "10", examDate: "2027-02-17", source: "predicted", phase: "phase1" };
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );
    expect(await screen.findByText(headline("2027-02-17"))).toBeInTheDocument();
    expect(screen.getByText("Expected exam date")).toBeInTheDocument();
    expect(screen.queryByText("Official exam date")).toBeNull();

    fireEvent.click(screen.getByText("CBSE 2025-26: Two-Exam System"));
    expect(screen.getByText(`${formatCbseDate("2027-02-17")} (expected)`)).toBeInTheDocument();
    expect(screen.getByText(`${formatCbseDate(CBSE_PHASE2_DATE)} (expected)`)).toBeInTheDocument();
  });

  it("official (CBSE notice or admin override): the headline date shows WITHOUT 'expected'", async () => {
    fetchMock.result = { studentClass: "10", examDate: "2027-02-20", source: "official", phase: "phase1" };
    render(
      <MemoryRouter>
        <Onboarding />
      </MemoryRouter>,
    );
    const date = await screen.findByText(headline("2027-02-20"));
    expect(date.textContent).not.toMatch(/expected/i);
    expect(screen.getByText("Official exam date")).toBeInTheDocument();
    expect(screen.queryByText("Expected exam date")).toBeNull();

    // the Phase 1 row follows the fetched official date, bare; Phase 2 is still predicted
    fireEvent.click(screen.getByText("CBSE 2025-26: Two-Exam System"));
    // headline + Phase 1 row: the same bare date twice (both formatters print "20 Feb 2027")
    expect(screen.getAllByText(formatCbseDate("2027-02-20"))).toHaveLength(2);
    expect(screen.queryByText(`${formatCbseDate("2027-02-20")} (expected)`)).toBeNull();
    expect(screen.getByText(`${formatCbseDate(CBSE_PHASE2_DATE)} (expected)`)).toBeInTheDocument();
  });
});
