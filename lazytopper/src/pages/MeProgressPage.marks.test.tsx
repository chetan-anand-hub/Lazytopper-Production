/**
 * MeProgressPage — SCORECARD-MI-1 PR-2 (B7) + OR-LIVE finding L5 (binding).
 *
 *   B7  the hero split reads an MI entry's v2 MARKS when it carries them (knowledge =
 *       conceptual, technique = presentation, careless = calculation + silly, not attempted =
 *       unattempted), and today's step deductions when it does not — never inventing marks.
 *   L5  the remainder row says ONLY what is true. "The grader took these marks without naming a
 *       mistake type" was false for marks that were simply not attempted (unanswered MCQs).
 *       Not-attempted marks known from v2 entries get their OWN row and bar segment.
 *
 * Harness mirrors MeProgressPage.v7.test.tsx: the reads are mocked, the page is real.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { WindowedProgress, RungTrend } from "../services/progressStore";
import type { MistakeLogEntry } from "../services/mistakeLogService";
import { zeroMarksLost } from "../lib/mistakeDisplay";

const mockGetWindowedProgress = vi.fn();
const mockGetMistakeLogs = vi.fn();

vi.mock("../services/progressStore", async (importOriginal) => ({
  // ME-ENGINE-1 PR-1 — the page reads the REAL shared read model (services/progressReadModel),
  // which uses the REAL window / canonicaliser helpers; only the cloud aggregation is mocked.
  ...(await importOriginal<typeof import("../services/progressStore")>()),
  getWindowedProgress: (...a: unknown[]) => mockGetWindowedProgress(...a),
  getRecentSessions: () => [],
  getActivitySummary: () => ({ worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 }),
  getTopicTrendFromCloud: vi.fn(async () => ({ window: "month", trend: null, points: [] })),
  isShortSpan: () => false,
}));
vi.mock("../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/mistakeLogService")>()),
  getMistakeLogHistoryFromCloud: async (uid: string, startMs: number) => ({
    entries: (await mockGetMistakeLogs(uid, startMs)) ?? [],
    complete: true,
  }),
}));
vi.mock("../components/subscription/UpgradeSheet", () => ({
  UpgradeSheet: () => <div data-testid="upgrade-sheet" />,
}));
vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => true }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-1", displayName: "Asha Rao" }, loading: false, mistakeLogsHydrated: true }),
}));

import MeProgressPage, { remainderSentence, splitPaperMarks } from "./MeProgressPage";

/* ── fixtures ── */

const marksRung = (key: string, label: string, available: number, scored: number): RungTrend => ({
  key,
  label,
  before: 40,
  now: 55,
  delta: 15,
  sampleBefore: 6,
  sampleNow: 8,
  spanDays: 30,
  marksAvailable: available,
  marksScored: scored,
});

/** The Maths paper: 100 graded, 70 secured → 30 marks on the table. */
const MATHS = marksRung("maths", "Maths", 100, 70);
const WINDOWED = {
  window: "month",
  subjects: [MATHS],
  topics: [],
  concepts: [],
  sections: [],
  mistakeTypes: [],
  activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 },
  activitySpanDays: 30,
  mistakeLog: { loggedInWindow: 0 },
} as unknown as WindowedProgress;

let seq = 0;
const countOnly = (stepDetails: MistakeLogEntry["stepDetails"]): MistakeLogEntry => {
  seq += 1;
  return {
    id: `m-${seq}`,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    questionText: "q",
    topic: "Real Numbers",
    subject: "maths",
    totalMarks: 5,
    marksLost: 3,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails,
  };
};
const v2 = (marks: Partial<ReturnType<typeof zeroMarksLost>>, stepDetails: MistakeLogEntry["stepDetails"] = []): MistakeLogEntry => ({
  ...countOnly(stepDetails),
  marksLostByType: { ...zeroMarksLost(), ...marks },
  marksLostByTypeVersion: 1,
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/me"]}>
      <MeProgressPage />
    </MemoryRouter>,
  );
}

const segmentsOf = (bar: HTMLElement) =>
  Array.from(bar.querySelectorAll("[data-segment]")).map((el) => el.getAttribute("data-segment"));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  seq = 0;
  mockGetWindowedProgress.mockResolvedValue(WINDOWED);
  mockGetMistakeLogs.mockResolvedValue([]);
});

/* ══════════════ B7 — the split reads MARKS from v2 entries, counts-path otherwise ══════════════ */

describe("B7 · splitPaperMarks — v2 entries by their marks, count-only entries as before", () => {
  it("★ a v2 entry is split by its marksLostByType (its stepDetails are NOT re-read)", () => {
    // stepDetails would say 9 conceptual; the grader's v2 marks say 6 — marks win.
    const e = v2({ conceptual: 6, presentation: 1, calculation: 1.5, silly: 0.5, unattempted: 4, untyped: 1 }, [
      { stepNumber: 1, mistakeType: "conceptual", marksDeducted: 9 },
    ]);
    const s = splitPaperMarks(MATHS, [e])!;
    expect(s.knowledge).toBe(6);
    expect(s.technique).toBe(1);
    expect(s.careless).toBe(2); // calculation 1.5 + silly 0.5, grouped by lib/mistakeDisplay
    expect(s.notAttempted).toBe(4);
    // untyped (1) stays in the remainder with whatever else the log does not name: 30-6-1-2-4
    expect(s.unclassified).toBe(17);
    expect(s.splitKnown).toBe(true);
  });

  it("G5 — a count-only entry keeps today's step-deduction rule and gets NO not-attempted figure", () => {
    const e = countOnly([
      { stepNumber: 1, mistakeType: "conceptual", marksDeducted: 2 },
      { stepNumber: 2, mistakeType: "silly", marksDeducted: 1 },
    ]);
    const s = splitPaperMarks(MATHS, [e])!;
    expect(s).toMatchObject({ knowledge: 2, careless: 1, technique: 0, notAttempted: 0, unclassified: 27, splitKnown: true });
  });

  it("MIXED — each entry by its own kind, summed; the count-only entry is not converted", () => {
    const s = splitPaperMarks(MATHS, [
      v2({ conceptual: 3, unattempted: 2 }),
      countOnly([{ stepNumber: 1, mistakeType: "presentation", marksDeducted: 1 }]),
    ])!;
    expect(s).toMatchObject({ knowledge: 3, technique: 1, careless: 0, notAttempted: 2, unclassified: 24 });
  });

  it("an UNVERSIONED marksLostByType is count-only (never read as marks)", () => {
    const e = { ...countOnly([]), marksLostByType: { ...zeroMarksLost(), conceptual: 5, unattempted: 5 } } as MistakeLogEntry;
    expect(splitPaperMarks(MATHS, [e])).toMatchObject({ knowledge: 0, notAttempted: 0, unclassified: 30 });
  });

  it("splitKnown:false still shows only what was lost when v2 marks over-attribute", () => {
    const s = splitPaperMarks(MATHS, [v2({ conceptual: 20, unattempted: 15 })])!;
    expect(s).toMatchObject({ knowledge: 0, technique: 0, careless: 0, notAttempted: 0, unclassified: 30, splitKnown: false });
  });
});

/* ══════════════ L5 — the remainder says only what is true; Not attempted is its own row ══════════════ */

describe("OR-LIVE L5 · the remainder row and the Not attempted row", () => {
  it("★ a v2 not-attempted entry renders a separate 'Not attempted' row and bar segment", async () => {
    mockGetMistakeLogs.mockResolvedValue([v2({ conceptual: 6, unattempted: 4 })]);
    renderPage();
    const bar = await screen.findByTestId("me-hero-bar");
    expect(segmentsOf(bar)).toEqual(["secured", "knowledge", "not-attempted", "unclassified"]);
    const row = screen.getByTestId("me-not-attempted");
    expect(row.textContent).toContain("4 marks");
    expect(row.textContent).toContain("Not attempted");
    expect(row.textContent).toMatch(/not counted as a mistake/);
    // never folded into a mistake group: the knowledge row holds ONLY the conceptual 6
    expect(screen.getByText(/6 marks/, { selector: "b" })).toBeInTheDocument();
    expect(bar.getAttribute("aria-label")).toContain("4 marks not attempted (not counted as a mistake)");
  });

  it("CONTROL — count-only entries never produce a Not attempted row (nothing invented)", async () => {
    mockGetMistakeLogs.mockResolvedValue([countOnly([{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 6 }])]);
    renderPage();
    const bar = await screen.findByTestId("me-hero-bar");
    expect(segmentsOf(bar)).toEqual(["secured", "knowledge", "unclassified"]);
    expect(screen.queryByTestId("me-not-attempted")).toBeNull();
  });

  it("★ the remainder sentence never claims 'The grader took these marks' and names no unknown cause", async () => {
    mockGetMistakeLogs.mockResolvedValue([countOnly([{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 6 }])]);
    renderPage();
    const bar = await screen.findByTestId("me-hero-bar");
    const row = screen.getByTestId("me-remainder-reason");
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/The grader took these marks/);
    expect(text).not.toMatch(/not yet classified/);
    expect(within(row).getByText(/no reason recorded/)).toBeInTheDocument();
    expect(row.textContent).toContain(
      "No mistake type is recorded for these marks — some may be questions you did not attempt — so we will not guess one.",
    );
    // the hero bar's accessible name is honest too
    const label = bar.getAttribute("aria-label") || "";
    expect(label).toContain("24 marks lost with no reason recorded.");
    expect(label).not.toMatch(/not yet classified|grader took/i);
  });

  it("the withheld split keeps its own honest sentence and label", async () => {
    mockGetMistakeLogs.mockResolvedValue([v2({ conceptual: 40 })]);
    renderPage();
    await screen.findByTestId("me-hero-bar");
    const row = screen.getByTestId("me-remainder-reason");
    expect(row.textContent).toContain("reason not shown");
    expect(row.textContent).toContain("We can see which marks went, but not yet why, so we are not going to guess.");
  });

  it("remainderSentence — both branches are claim-free", () => {
    for (const splitKnown of [true, false]) {
      expect(remainderSentence({ splitKnown })).not.toMatch(/grader took|one-mark/i);
    }
  });
});
