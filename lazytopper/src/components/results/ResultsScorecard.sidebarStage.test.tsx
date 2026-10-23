// @vitest-environment jsdom
/**
 * GUIDE-SCORE-2 — ONE character on screen: the desktop sidebar's MI voice (MiVoiceRow, drawn by
 * MistakeIntelCard in the shell) and a scorecard's character slot, rendered TOGETHER.
 *
 * Owner live test (23 Oct, desktop): Ziggy stayed visible in the sidebar behind the dimmed
 * scorecard. The slot took the stage only once its mode was decided, so for the whole "deciding"
 * wait (the first-result check, ~1.5 s; a duet's uid check) the sidebar's character kept drawing.
 * The slot now holds the stage from its first frame.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { auth, localRows } = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; isAnonymous: boolean } },
  localRows: vi.fn(),
}));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));
vi.mock("../../services/sessionRecords", async (orig) => ({
  ...(await orig<typeof import("../../services/sessionRecords")>()),
  loadLocalSessionRecords: localRows,
}));
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: () => {},
}));

import type { WorksheetGradeResponse } from "../../ai/aiClient";
import ResultsScorecard from "./ResultsScorecard";
import { worksheetScorecardVariant } from "./scorecardVariants";
import { MiVoiceRow } from "../guide/mi/MiVoiceRow";
import { __setGuideAbForTests } from "../guide/guideVariant";
import { __resetMiVoiceShownForTests } from "../guide/mi/miVoiceShown";
import { __resetFeedbackHostForTests } from "../feedback/feedbackPromptHost";
import { ZIGGY_CHECK_DELAY_MS, __resetZiggyShownForTests, registerScoreScene } from "../guide/lazyGuide";
import { SCORE_GUIDE_BEAT_MS } from "../guide/guideChunk";
import { __resetMascotsForTests } from "../guide/mascotsMute";
import { __resetStageForTests } from "../guide/scoreGuideStage";

const noop = () => {};
const NO_SCENE = { canShowScene: () => false, markSceneShown: noop, Scene: () => null };
const wait = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)));

function variant() {
  const results = [
    { qNumber: 1, couldNotRead: false, totalMarks: 5, marksAwarded: 3,
      marksLostByType: { conceptual: 0, calculation: 2, silly: 0, presentation: 0, unattempted: 0, untyped: 0 } },
    { qNumber: 2, couldNotRead: false, totalMarks: 5, marksAwarded: 5 },
  ];
  return worksheetScorecardVariant({
    name: "Quadratic Equations - Mixed Worksheet", code: "WS-M-QE-07", downloading: false, onRead: noop, onDownload: noop,
    response: {
      ok: true, results, totalQuestions: 2, gradedCount: 2, pendingCount: 0,
      gradedMarksAwarded: 8, gradedMarksTotal: 10, worksheetTotalMarks: 10,
    } as unknown as WorksheetGradeResponse,
  });
}

/** Characters drawn OUTSIDE the scorecard's slot (the sidebar's). */
const sidebarBlobs = () =>
  Array.from(document.querySelectorAll('[data-testid="mi-voice-slot"] [data-testid^="blob-"]'));
const slotBlobs = () =>
  Array.from(document.querySelectorAll('[data-testid="score-guide-slot"] [data-testid^="blob-"]'));

const realOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetStageForTests();
  __resetMiVoiceShownForTests();
  __resetZiggyShownForTests();
  __resetFeedbackHostForTests();
  registerScoreScene(NO_SCENE);
  __setGuideAbForTests(true, "guide");
  auth.currentUser = { uid: "stage-u1", isAnonymous: false };
  // Not the first graded result (so the slot plays Ziggy then Byte after the check).
  localRows.mockReset().mockReturnValue([
    { id: "r3", status: "graded", gradedAt: 1_760_000_000_000 },
    { id: "r2", status: "graded", gradedAt: 1_759_000_000_000 },
  ]);
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} });
  Object.defineProperty(HTMLElement.prototype, "offsetParent", { configurable: true, get() { return this.parentElement; } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (realOffsetParent) Object.defineProperty(HTMLElement.prototype, "offsetParent", realOffsetParent);
  registerScoreScene(null);
  __setGuideAbForTests(null);
  __resetStageForTests();
});

describe("GUIDE-SCORE-2 · the sidebar's character steps aside for the WHOLE life of a scorecard's slot", () => {
  it("★★ from the first frame (the 'deciding' wait included) to Byte's line: no sidebar character", async () => {
    render(
      <MemoryRouter>
        <MiVoiceRow uid="stage-u1" input={{ kind: "no-data" }} hydrated />
      </MemoryRouter>,
    );
    // The sidebar draws its character first (the page before the result).
    await screen.findByTestId(/^blob-/, undefined, { timeout: 3000 });
    expect(sidebarBlobs()).toHaveLength(1);

    render(
      <MemoryRouter>
        <ResultsScorecard variant={variant()} onClose={noop} askFirstFeedback />
      </MemoryRouter>,
    );
    // The slot is deciding (the first-result check waits ZIGGY_CHECK_DELAY_MS): reserved, empty.
    await wait(200);
    expect(screen.getByTestId("score-guide-slot").getAttribute("data-mode")).toBe("deciding");
    expect(sidebarBlobs()).toHaveLength(0);
    expect(screen.getByTestId("mi-voice-line").textContent).not.toBe(""); // the line itself stays

    // Ziggy's reaction, then Byte's step: always exactly ONE character on screen — the slot's.
    await wait(ZIGGY_CHECK_DELAY_MS + 100);
    expect(slotBlobs()).toHaveLength(1);
    expect(sidebarBlobs()).toHaveLength(0);
    await wait(SCORE_GUIDE_BEAT_MS + 100);
    expect(screen.getByTestId("score-guide").getAttribute("data-kind")).toBe("byte");
    expect(slotBlobs()).toHaveLength(1);
    expect(sidebarBlobs()).toHaveLength(0);

    // The scorecard closes → the sidebar's character comes back.
    cleanup();
    render(
      <MemoryRouter>
        <MiVoiceRow uid="stage-u1" input={{ kind: "no-data" }} hydrated />
      </MemoryRouter>,
    );
    await screen.findByTestId(/^blob-/, undefined, { timeout: 3000 });
  }, 20_000);
});
