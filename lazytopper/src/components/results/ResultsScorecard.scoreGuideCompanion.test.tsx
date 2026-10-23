/**
 * GUIDE-SCORE-1 × COMPANION-1 — the scorecard's two scenes are COMPANION-1's own duet
 * (`CompanionScoreSlot`), shown in the scorecard's character slot only when the shared guard
 * (`sceneGuard.canShowScene`) allows a scene; otherwise the one-character sequence plays.
 *   low score (< 40 %)                       → the comfort scene
 *   improvement (the card's own ▲, ≥ 10 pts) → the high-five scene
 * CompanionScoreSlot is stubbed here to record what the scorecard hands it (its own drawing and
 * its markSceneShown are COMPANION-1's, tested in its lane).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

const { slotProps } = vi.hoisted(() => ({ slotProps: [] as Array<Record<string, unknown>> }));
vi.mock("../guide/companion/companion", async (orig) => {
  const React = await import("react");
  const { noteMascotHost } = await import("../guide/mascotPresence");
  /** Draws like the duet: a registered companion character (lt-cmp__char) and its Close. */
  function StubDuet() {
    const [closed, setClosed] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
      const el = ref.current;
      if (!el) return undefined;
      noteMascotHost(el, true);
      return () => noteMascotHost(el, false);
    }, [closed]);
    if (closed) return null;
    return (
      <div data-testid="companion-score-slot">
        <div ref={ref} className="lt-cmp__char" />
        <button type="button" data-testid="duet-close" onClick={() => setClosed(true)}>
          Close
        </button>
      </div>
    );
  }
  return {
    ...(await orig<typeof import("../guide/companion/companion")>()),
    CompanionScoreSlot: (p: Record<string, unknown>) => {
      slotProps.push(p);
      return <StubDuet />;
    },
  };
});
const { auth } = vi.hoisted(() => ({ auth: { currentUser: { uid: "u-companion", isAnonymous: false } as null | { uid: string; isAnonymous: boolean } } }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));

import ResultsScorecard from "./ResultsScorecard";
import { chapterTestDeltaLine, fullMockScorecardVariant, type ScorecardVariant } from "./scorecardVariants";
import { chapterTestScorecardVariant } from "./scorecardBankLenses";
import type { WorksheetGradeResponse } from "../../ai/aiClient";
import { __setGuideAbForTests } from "../guide/guideVariant";
import { SCENE_SESSION_KEY, __resetSceneGuardForTests } from "../guide/sceneGuard";
import { __resetStageForTests, stageHeld } from "../guide/scoreGuideStage";
import { SCENE_DRAW_TIMEOUT_MS, registerScoreScene } from "../guide/lazyGuide";
import { COMPANION_PRIORITY, claimStage, releaseStage } from "../guide/companion/companionModel";
import { __resetMascotHostsForTests } from "../guide/mascotPresence";

const ML = (o: Record<string, number>) => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...o });
function paper(rows: Array<{ total: number; awarded: number; lost?: Record<string, number> }>): WorksheetGradeResponse {
  const awarded = rows.reduce((s, r) => s + r.awarded, 0);
  const total = rows.reduce((s, r) => s + r.total, 0);
  return {
    ok: true,
    results: rows.map((r, i) => ({ qNumber: i + 1, couldNotRead: false, totalMarks: r.total, marksAwarded: r.awarded, ...(r.lost ? { marksLostByType: ML(r.lost) } : {}) })),
    totalQuestions: rows.length,
    gradedCount: rows.length,
    pendingCount: 0,
    gradedMarksAwarded: awarded,
    gradedMarksTotal: total,
    worksheetTotalMarks: total,
  } as unknown as WorksheetGradeResponse;
}
const LOW_CT = (): ScorecardVariant => ({
  ...chapterTestScorecardVariant({
    name: "Light · Test #1", code: "CT-S-LIGHT-01", phase: "full",
    response: paper([{ total: 5, awarded: 1, lost: { calculation: 4 } }, { total: 5, awarded: 2, lost: { silly: 3 } }]),
  }),
  guideTarget: { to: "/practice/10/science?topic=light", chapter: "Light" },
});
const wait = (ms: number) => act(async () => new Promise((r) => setTimeout(r, ms)));
async function open(v: ScorecardVariant) {
  render(
    <MemoryRouter>
      <ResultsScorecard variant={v} onClose={() => {}} />
    </MemoryRouter>,
  );
  await wait(30);
}

beforeEach(() => {
  auth.currentUser = { uid: "u-companion", isAnonymous: false };
  slotProps.length = 0;
  window.sessionStorage.clear();
  window.localStorage.clear();
  __resetSceneGuardForTests();
  setMatchMediaMatches(false); // wide enough for two characters
  __setGuideAbForTests(true, "guide");
});
afterEach(() => {
  cleanup();
  __setGuideAbForTests(null);
  __resetStageForTests();
  __resetMascotHostsForTests();
});

describe("GUIDE-SCORE-1 × COMPANION-1 — the scorecard's scenes", () => {
  it("★★ low score (< 40 %) + the guard allows a scene → COMPANION-1's comfort duet in the slot, with the card's own numbers and fix route", async () => {
    await open(LOW_CT()); // 3 / 10 = 30 %
    expect(screen.getByTestId("companion-score-slot")).toBeTruthy();
    expect(screen.queryByTestId("score-guide")).toBeNull(); // never alongside the solo sequence
    expect(slotProps.at(-1)).toMatchObject({
      uid: "u-companion",
      pct: 30,
      previousPct: null,
      fixTo: "/practice/10/science?topic=light",
      busy: false,
    });
    expect(stageHeld("scorecard")).toBe(true); // the sidebar voice steps aside for the scene too
  });

  it("★★ improvement (the card's own ▲, ≥ 10 points) → the high-five duet with the previous percentage", async () => {
    const v = chapterTestScorecardVariant({
      name: "Light · Test #2", code: "CT-S-LIGHT-02", phase: "full",
      deltaLine: chapterTestDeltaLine(
        { code: "CT-S-LIGHT-02", awarded: 8, total: 10 },
        [{ id: "CT-S-LIGHT-01", status: "graded", marksAwarded: 5, marksTotal: 10 }],
        "Light",
      ),
      response: paper([{ total: 5, awarded: 4, lost: { calculation: 1 } }, { total: 5, awarded: 4, lost: { silly: 1 } }]),
    });
    await open(v);
    expect(slotProps.at(-1)).toMatchObject({ pct: 80, previousPct: 50 });
    // Full Mock: the same rule over its own ▲ line.
    cleanup();
    __resetSceneGuardForTests();
    window.sessionStorage.clear();
    slotProps.length = 0;
    await open(
      fullMockScorecardVariant({
        name: "Maths · Mock #4", code: "FM-M-04", phase: "full", deltaLine: "▲ 9 marks vs Maths · Mock #3",
        response: paper([{ total: 40, awarded: 30, lost: { conceptual: 10 } }, { total: 40, awarded: 34, lost: { silly: 6 } }]),
      }),
    );
    expect(slotProps.at(-1)).toMatchObject({ pct: 80, previousPct: 69 }); // 64/80 vs 55/80
  });

  it("★★ the guard says no (a scene already shown this session) → the normal Ziggy-then-Byte sequence", async () => {
    window.sessionStorage.setItem(SCENE_SESSION_KEY, "comfort");
    await open(LOW_CT());
    expect(screen.queryByTestId("companion-score-slot")).toBeNull();
    expect((await screen.findByTestId("score-guide")).getAttribute("data-kind")).toBe("ziggy");
  });

  it("★ a narrow phone (< 360 px: solo poses only) → the normal sequence, never a squeezed duet", async () => {
    setMatchMediaMatches((q) => q.includes("max-width"));
    await open(LOW_CT());
    expect(screen.queryByTestId("companion-score-slot")).toBeNull();
    expect(await screen.findByTestId("score-guide")).toBeTruthy();
  });

  it("★★ A · a GUEST with a low score (no uid): no duet, no empty slot — the one-character sequence", async () => {
    auth.currentUser = null;
    await open(LOW_CT());
    expect(slotProps).toHaveLength(0); // CompanionScoreSlot (which draws nothing without a uid) is never mounted
    const g = await screen.findByTestId("score-guide");
    expect(g.getAttribute("data-kind")).toBe("ziggy");
    expect(screen.getByTestId("score-guide-slot").getAttribute("data-mode")).toBe("every");
    expect(window.sessionStorage.getItem(SCENE_SESSION_KEY)).toBeNull(); // the session's scene is not spent
  });

  it("★★ A · the companion's own stage is held by a higher priority (the late-night note): the sequence, never a blank slot", async () => {
    claimStage("lateNight", COMPANION_PRIORITY.lateNight);
    try {
      await open(LOW_CT());
      expect(slotProps).toHaveLength(0);
      expect(await screen.findByTestId("score-guide")).toBeTruthy();
    } finally {
      releaseStage("lateNight");
    }
  });

  it("★★ A · Close on the duet: the slot collapses and the stage is released (the sidebar voice may return)", async () => {
    await open(LOW_CT());
    expect(screen.getByTestId("companion-score-slot")).toBeTruthy();
    expect(stageHeld("scorecard")).toBe(true);
    fireEvent.click(screen.getByTestId("duet-close"));
    await wait(30);
    expect(screen.queryByTestId("score-guide-slot")).toBeNull();
    expect(screen.queryByTestId("score-guide")).toBeNull();
    expect(stageHeld("scorecard")).toBe(false);
  });

  it("★ A · the duet never draws (its chunk fails): after the wait, the one-character sequence plays", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      // A plan whose scene renderer draws nothing (no registered character).
      registerScoreScene({ canShowScene: () => true, markSceneShown: () => {}, Scene: () => null, watchDrawn: true });
      await open(LOW_CT());
      expect(screen.queryByTestId("score-guide")).toBeNull();
      // GUIDE-SCORE-2: the reserved slot sits blank for this wait, so it is about one second.
      expect(SCENE_DRAW_TIMEOUT_MS).toBeLessThanOrEqual(1000);
      await act(async () => {
        vi.advanceTimersByTime(SCENE_DRAW_TIMEOUT_MS + 50);
      });
      expect(await screen.findByTestId("score-guide")).toBeTruthy();
    } finally {
      registerScoreScene(null);
      vi.useRealTimers();
    }
  });

  it("★ a middling result (no scene) never asks for one", async () => {
    await open({
      ...chapterTestScorecardVariant({
        name: "Light · Test #4", code: "CT-S-LIGHT-04", phase: "full",
        response: paper([{ total: 5, awarded: 3, lost: { calculation: 2 } }, { total: 5, awarded: 3, lost: { silly: 2 } }]),
      }),
    });
    expect(screen.queryByTestId("companion-score-slot")).toBeNull();
    expect(await screen.findByTestId("score-guide")).toBeTruthy();
  });
});
