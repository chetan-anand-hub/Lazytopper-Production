// @vitest-environment node
//
// C&I PR-1 — the session persistence seam. Runs in CI/Codespaces vitest; NOT in the
// Windows-local quality-gate matrix. Firestore + the active-uid resolver are mocked
// (the sessionRecords pattern) so the CONTRACT logic — provenance derivation, the
// single→unified response adaptation, and the honest persist gates — is asserted
// in isolation.

import { describe, it, expect, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: null }));
vi.mock("./studentProgressStore", () => ({ getActiveProgressUser: () => null }));

import {
  toSessionSubject,
  deriveTopicSource,
  singleCheckToWorksheetResponse,
  persistCheckImproveSession,
} from "./checkImproveGradeService";
import type { CheckSolutionResponse, WorksheetGradeResponse } from "../ai/aiClient";

const USER = { uid: "u1", isLocalSession: false } as never;

function csr(over: Partial<CheckSolutionResponse> = {}): CheckSolutionResponse {
  return {
    ok: true,
    totalMarks: 3,
    marksAwarded: 2,
    percentage: 67,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "Good working.",
    ...over,
  };
}

function wsResponse(over: Partial<WorksheetGradeResponse> = {}): WorksheetGradeResponse {
  return {
    ok: true,
    results: [
      {
        qNumber: 1,
        couldNotRead: false,
        ok: true,
        totalMarks: 3,
        marksAwarded: 2,
        percentage: 67,
        annotatedSteps: [],
        mistakeSummary: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
        teacherNote: "",
      },
    ],
    totalQuestions: 1,
    gradedCount: 1,
    pendingCount: 0,
    gradedMarksAwarded: 2,
    gradedMarksTotal: 3,
    worksheetTotalMarks: 3,
    ...over,
  };
}

describe("toSessionSubject", () => {
  it("maps the page's DesktopSubject onto the record store's subject", () => {
    expect(toSessionSubject("Maths")).toBe("maths");
    expect(toSessionSubject("Science")).toBe("science");
    expect(toSessionSubject("")).toBe("maths");
  });
});

describe("deriveTopicSource — provenance from the EXISTING detect-then-confirm flow", () => {
  it("no single topic resolved → mixed (never a majority guess)", () => {
    expect(deriveTopicSource("", false)).toBe("mixed");
    expect(deriveTopicSource("", true)).toBe("mixed");
    expect(deriveTopicSource("   ", false)).toBe("mixed");
  });
  it("student touched the topic correction → confirmed", () => {
    expect(deriveTopicSource("real-numbers", true)).toBe("confirmed");
  });
  it("accepted without touching → inferred", () => {
    expect(deriveTopicSource("real-numbers", false)).toBe("inferred");
  });
  // "bank-matched" is intentionally RESERVED: no writer emits it in PR-1 (C&I has
  // no bank-match path). This derivation can never produce it — by design.
});

describe("singleCheckToWorksheetResponse — the inverse of multiQuestionToCsr", () => {
  it("adapts the single grade into a one-question unified response, numbers untouched", () => {
    const r = singleCheckToWorksheetResponse(csr());
    expect(r.totalQuestions).toBe(1);
    expect(r.gradedCount).toBe(1);
    expect(r.pendingCount).toBe(0);
    expect(r.gradedMarksAwarded).toBe(2);
    expect(r.gradedMarksTotal).toBe(3);
    expect(r.worksheetTotalMarks).toBe(3);
    expect(r.results).toHaveLength(1);
    expect(r.results[0].marksAwarded).toBe(2);
    expect(r.results[0].mistakeSummary).toEqual({ conceptual: 1, calculation: 0, silly: 0, presentation: 0 });
  });
});

describe("persistCheckImproveSession — honest persist gates", () => {
  const args = {
    code: "CI-M-REAL-01",
    title: "Real Numbers · Paper #1",
    subject: "maths" as const,
    topicSlug: "real-numbers",
    topicSource: "inferred" as const,
  };

  it("nothing graded → NO record (no grade, no fabricated history entry)", () => {
    const empty = wsResponse({
      results: [{ qNumber: 1, couldNotRead: true, totalMarks: 3, note: "unreadable" }],
      gradedCount: 0,
      pendingCount: 1,
      gradedMarksAwarded: 0,
      gradedMarksTotal: 0,
    });
    expect(persistCheckImproveSession({ ...args, user: USER, response: empty })).toBe(
      "skipped-nothing-graded",
    );
  });

  it("signed-out / local sessions never persist", () => {
    expect(persistCheckImproveSession({ ...args, user: null, response: wsResponse() })).toBe(
      "skipped-no-user",
    );
    expect(
      persistCheckImproveSession({
        ...args,
        user: { uid: "u1", isLocalSession: true } as never,
        response: wsResponse(),
      }),
    ).toBe("skipped-no-user");
  });

  it("records a graded session for a real signed-in user", () => {
    expect(persistCheckImproveSession({ ...args, user: USER, response: wsResponse() })).toBe(
      "recorded",
    );
  });
});
