/**
 * GUIDE-SCORE-1 — a failed guide-chunk load (offline, a stale deploy) renders NOTHING on the
 * scorecard AND releases the stage the slot took, so the sidebar's MI voice character is not
 * hidden for nothing. The chunk is made to fail by a throwing module factory.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../guide/guideChunk", () => {
  throw new Error("chunk load failed");
});
vi.mock("../../services/firebaseClient", () => ({ authClient: { currentUser: null } }));

import ResultsScorecard from "./ResultsScorecard";
import { worksheetScorecardVariant } from "./scorecardVariants";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { __setGuideAbForTests } from "../guide/guideVariant";
import { __resetStageForTests, stageHeld } from "../guide/scoreGuideStage";

afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
  __resetStageForTests();
});

describe("GUIDE-SCORE-1 · the guide chunk fails to load", () => {
  it("★★ nothing renders, the slot collapses, and the stage is released", async () => {
    __setGuideAbForTests(true, "guide");
    const response = {
      ok: true,
      results: [{ qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 3 }],
      totalQuestions: 1,
      gradedCount: 1,
      pendingCount: 0,
      gradedMarksAwarded: 3,
      gradedMarksTotal: 5,
      worksheetTotalMarks: 5,
    } as unknown as WorksheetGradeResponse;
    render(
      <MemoryRouter>
        <ResultsScorecard
          variant={worksheetScorecardVariant({ name: "W", code: "WS-M-QE-01", downloading: false, onRead: () => {}, onDownload: () => {}, response })}
          onClose={() => {}}
        />
      </MemoryRouter>,
    );
    expect(stageHeld("scorecard")).toBe(true); // taken before paint
    await act(async () => new Promise((r) => setTimeout(r, 50)));
    expect(screen.queryByTestId("score-guide")).toBeNull();
    expect(screen.queryByTestId("score-guide-slot")).toBeNull();
    expect(stageHeld("scorecard")).toBe(false);
  });
});
