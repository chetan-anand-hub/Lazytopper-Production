/**
 * LIMITS-1 PR-2 — the Worksheet panel's OWN per-question results obey the same server lock as the
 * scorecard (same kind + key). Closing the scorecard must not reveal what it withheld.
 * MUTATION: render the section list when detailLock !== "open" -> "locked" test RED.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const GRADED = {
  ok: true,
  results: [
    {
      qNumber: 1, couldNotRead: false, ok: true, totalMarks: 3, marksAwarded: 2, percentage: 66,
      annotatedSteps: [{ stepNumber: 1, studentWork: "a=3", status: "correct", marksAwarded: 1, marksDeducted: 0 }],
      mistakeSummary: { conceptual: 0, calculation: 1, silly: 0, presentation: 0 },
    },
  ],
  totalQuestions: 1, gradedCount: 1, pendingCount: 0, gradedMarksAwarded: 2, gradedMarksTotal: 3, worksheetTotalMarks: 3,
};

vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "test-uid", isLocalSession: false } }) }));
vi.mock("../../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: false }) }));
vi.mock("../../ai/paidCallHeaders", () => ({
  paidJsonHeaders: async () => ({ "Content-Type": "application/json", "X-Lazytopper-Uid": "test-uid", Authorization: "Bearer t" }),
}));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false }),
}));
vi.mock("../../services/worksheetGradeService", () => ({ gradeWorksheetAndRecord: vi.fn() }));
vi.mock("../../services/worksheetSessionStore", () => ({
  getWorksheetGrade: () => GRADED,
  listStoredWorksheetsLite: () => [],
}));

import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const WS = {
  worksheetId: "ws-1", createdAt: "2026-10-04T00:00:00.000Z", title: "AP worksheet", subject: "Maths", grade: "10",
  sectionFilter: "All", totalMarks: 3,
  questions: [{ qNumber: 1, id: "q1", subject: "Maths", topicKey: "arithmetic-progressions", topicLabel: "AP", section: "C", marks: 3, questionText: "Find the 10th term" }],
} as PersistedWorksheet;

function jsonRes(body: unknown): Response {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) } as unknown as Response;
}

async function mount(flag: "1" | "", unlocked: boolean) {
  vi.resetModules();
  vi.stubEnv("VITE_LIMITS_ENABLED", flag);
  const f = vi.fn().mockResolvedValue(jsonRes({ ok: true, enforced: true, unlocked }));
  vi.stubGlobal("fetch", f);
  const { default: Panel } = await import("./WorksheetGradePanel");
  render(
    <MemoryRouter>
      <Panel ws={WS} />
    </MemoryRouter>,
  );
  return f;
}

beforeEach(() => cleanup());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Worksheet panel body", () => {
  it("locked: score stays, per-question list and graded-sheet download are withheld, the locked card shows", async () => {
    await mount("1", false);
    await screen.findByTestId("scorecard-locked-detail");
    expect(document.querySelector(".lt-wg__totscore")?.textContent).toBe("2/3");
    expect(document.querySelector(".lt-wg__seclist")).toBeNull();
    expect(screen.queryByText(/Download graded sheet/)).toBeNull();
    expect(screen.getByText("Practise this topic")).toBeInTheDocument();
  });
  it("unlocked (the free first of the kind): everything shows", async () => {
    await mount("1", true);
    await screen.findByText(/Download graded sheet/);
    expect(document.querySelector(".lt-wg__seclist")).not.toBeNull();
    expect(screen.queryByTestId("scorecard-locked-detail")).toBeNull();
  });
  it("pending: nothing is shown until the server answers (no flash)", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_LIMITS_ENABLED", "1");
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    const { default: Panel } = await import("./WorksheetGradePanel");
    render(<MemoryRouter><Panel ws={WS} /></MemoryRouter>);
    await screen.findByText("Practise this topic");
    expect(document.querySelector(".lt-wg__seclist")).toBeNull();
    expect(screen.queryByText(/Download graded sheet/)).toBeNull();
  });
  it("DARK (flag off): unchanged, no request", async () => {
    const f = await mount("", false);
    await screen.findByText(/Download graded sheet/);
    expect(document.querySelector(".lt-wg__seclist")).not.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });
});
