/**
 * GRADE-MARKS-1 - the Worksheet panel renders the model's paper summary; a score it states is
 * replaced by the FINAL (clamped) marks, the same rule as the Answer Checker (finalMarksSummary).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
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
  summary: "You scored 3 out of 3 marks. Write the general term before substituting.",
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

describe("Worksheet panel summary", () => {
  it("states the final marks (2 out of 3), never the model's 3 out of 3; the coaching prose stays", async () => {
    await mount("", false);
    const el = await waitFor(() => {
      const s = document.querySelector(".lt-wg__summary");
      expect(s).not.toBeNull();
      return s as Element;
    });
    expect(el.textContent).toContain("You scored 2 out of 3 marks on the questions we graded.");
    expect(el.textContent).not.toContain("3 out of 3");
    expect(el.textContent).toContain("Write the general term before substituting.");
  });
});
