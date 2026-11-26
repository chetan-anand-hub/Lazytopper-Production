import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

/**
 * TS-SAMPLE-OPEN (owner ruling 26 Nov 2026, 22:08 IST) - signed out, OPENING one of the four sample papers (CT-M01, CT-S01, FM-M1,
 * FM-S1) is not the day's free paper; pressing Start is. The pages' signed-out Start calls `claimNewPaperView(path, null, false,
 * search)` - these tests drive the gate and that exact call.
 *
 * Seen live 26 Nov 22:00: open CT-M01, go back, open FM-S1 -> "You've opened your free paper for today." That must not happen;
 * but once a sample has been STARTED, the existing rule applies (another paper walls at open).
 */

type TestUser = { uid: string; isLocalSession?: boolean } | null;
let currentUser: TestUser = null;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: currentUser, loading: false }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "free",
    isPremium: false,
    isTrialActive: false,
    isTrialExpired: true,
    daysLeftInTrial: 0,
    status: { tier: "free" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));
vi.mock("./paperCapOwner", () => ({
  readTestSeriesOwner: () => Promise.resolve(false),
  isKnownTestSeriesOwner: () => false,
}));

import { MockViewGate, claimNewPaperView } from "./MockViewGate";
import { SIGNED_OUT_ATTEMPT_KEY, sampleOpensUncounted, signedOutSampleForRoute } from "../../lib/testSeries/signedOutAttempt";

const PAPER = "the paper start screen";
const CT_M01 = ["/chapter-test/10/Maths/real-numbers", "?series=1"] as const;
const CT_S01 = ["/chapter-test/10/Science/chemical-reactions-and-equations", "?series=1"] as const;
const FM_M1 = ["/full-mock/10/Maths", "?paper=1"] as const;
const FM_S1 = ["/full-mock/10/Science", "?paper=1"] as const;

let lastScreen = "";
function visit([path, search]: readonly [string, string]): boolean {
  const view = render(
    <MemoryRouter initialEntries={[`${path}${search}`]}>
      <MockViewGate><div>{PAPER}</div></MockViewGate>
    </MemoryRouter>,
  );
  const rendered = screen.queryByText(PAPER) !== null;
  lastScreen = document.body.textContent || "";
  view.unmount();
  return rendered;
}
/** The page's signed-out Start (ChapterTestPage / FullMockPage `startTest`, signedOutSitting branch). */
function start([path, search]: readonly [string, string]): boolean {
  return claimNewPaperView(path, null, false, search);
}
function viewsToday(): number {
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || "";
    if (k.startsWith("lazytopper.dailyMockViews:")) return JSON.parse(localStorage.getItem(k) || "{}").count ?? 0;
  }
  return 0;
}
const WALL = "You’ve opened your free paper for today";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  currentUser = null;
  lastScreen = "";
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

describe("TS-SAMPLE-OPEN · route matching", () => {
  it("only the four exact sample shapes are samples", () => {
    expect(signedOutSampleForRoute(...CT_M01)).toBe("CT-M01");
    expect(signedOutSampleForRoute("/chapter-test/10/maths/real-numbers/", "?series=1&paper=1")).toBe("CT-M01");
    expect(signedOutSampleForRoute(...CT_S01)).toBe("CT-S01");
    expect(signedOutSampleForRoute(...FM_M1)).toBe("FM-M1");
    expect(signedOutSampleForRoute("/full-mock/10/science", "?paper=1")).toBe("FM-S1");
    // not samples: the non-series test of the same chapter, paper 2, another chapter, another full-length paper, a focus set
    expect(signedOutSampleForRoute("/chapter-test/10/Maths/real-numbers", "")).toBeNull();
    expect(signedOutSampleForRoute("/chapter-test/10/Maths/real-numbers", "?series=1&paper=2")).toBeNull();
    expect(signedOutSampleForRoute("/chapter-test/10/Maths/polynomials", "?series=1")).toBeNull();
    expect(signedOutSampleForRoute("/full-mock/10/Science", "?paper=2")).toBeNull();
    expect(signedOutSampleForRoute("/full-mock/10/Science", "")).toBeNull();
    expect(signedOutSampleForRoute("/full-mock/10/Science", "?focus=FS-S-LA-1")).toBeNull();
  });
  it("the page's own switches turn it off: Test Series off, signed-out sitting off", () => {
    expect(sampleOpensUncounted(...FM_S1)).toBe(true);
    vi.stubEnv("VITE_TEST_SERIES_DISABLED", "1");
    expect(sampleOpensUncounted(...FM_S1)).toBe(false);
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_TS_FREE_SIGNEDOUT_DISABLED", "1");
    expect(sampleOpensUncounted(...FM_S1)).toBe(false);
  });
});

describe("TS-SAMPLE-OPEN · signed out, opening a sample is not the day's paper", () => {
  it("★★ the live report: open CT-M01, go back, open FM-S1 -> no wall; nothing counted", () => {
    expect(visit(CT_M01)).toBe(true);
    expect(viewsToday()).toBe(0);
    expect(visit(FM_S1)).toBe(true);
    expect(lastScreen).not.toContain(WALL);
    expect(viewsToday()).toBe(0);
    // every sample's start screen opens, as often as they like
    expect(visit(CT_S01)).toBe(true);
    expect(visit(FM_M1)).toBe(true);
    expect(visit(CT_M01)).toBe(true);
    expect(viewsToday()).toBe(0);
  });

  it("★★ Start is what counts: start CT-M01 -> 1 of 1; FM-S1 then walls at open (the existing sign-in wall)", () => {
    expect(visit(CT_M01)).toBe(true);
    expect(start(CT_M01)).toBe(true);
    expect(viewsToday()).toBe(1);
    expect(visit(FM_S1)).toBe(false);
    expect(lastScreen).toContain(WALL);
    expect(viewsToday()).toBe(1);
    // and another sample is walled too
    expect(visit(CT_S01)).toBe(false);
  });

  it("★★ a second Start with two start screens opened first: the second Start is refused (the page's 'today's papers' line)", () => {
    expect(visit(CT_M01)).toBe(true);
    expect(visit(FM_S1)).toBe(true);
    expect(start(CT_M01)).toBe(true);
    expect(viewsToday()).toBe(1);
    expect(start(FM_S1)).toBe(false);
    expect(viewsToday()).toBe(1);
  });

  it("★ a Start is counted once, never twice", () => {
    expect(visit(FM_S1)).toBe(true);
    expect(start(FM_S1)).toBe(true);
    expect(start(FM_S1)).toBe(true);
    expect(viewsToday()).toBe(1);
  });

  it("★★ resume: the sample started today reopens (a reload of its kept sitting) - not counted, not blocked", () => {
    expect(visit(CT_M01)).toBe(true);
    expect(start(CT_M01)).toBe(true);
    // what the page keeps in this tab while the visitor sits it signed out
    sessionStorage.setItem(
      SIGNED_OUT_ATTEMPT_KEY,
      JSON.stringify({ v: 1, surface: "chapter-test", path: `${CT_M01[0]}${CT_M01[1]}`, ids: ["q1"], answers: {}, flags: [], currentQNumber: 1, elapsedMs: 1000, savedAt: Date.now() }),
    );
    expect(visit(CT_M01)).toBe(true);
    expect(viewsToday()).toBe(1);
    // (the page carries a kept sitting on WITHOUT a claim - ChapterTestPage `!signedOutRestored && claim`, FullMockPage `!soKept && claim` -
    // so the resume is never refused. A NEW paper instead of it, at the limit, is refused: CT-RESUME-2's existing rule.)
    expect(start(CT_M01)).toBe(false);
    expect(viewsToday()).toBe(1);
    // another paper still walls
    expect(visit(FM_S1)).toBe(false);
  });

  it("★★ the free open never carries over: CT-M01 start screen -> (same <Route>, no remount) another chapter test is judged afresh", () => {
    function Hop() {
      const navigate = useNavigate();
      return (
        <>
          <button type="button" onClick={() => navigate("/chapter-test/10/Maths/polynomials")}>hop</button>
          <button type="button" onClick={() => navigate("/chapter-test/10/Science/chemical-reactions-and-equations?series=1")}>sample</button>
        </>
      );
    }
    render(
      <MemoryRouter initialEntries={[`${CT_M01[0]}${CT_M01[1]}`]}>
        <Hop />
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<MockViewGate><div>{PAPER}</div></MockViewGate>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByText(PAPER)).not.toBeNull();
    expect(viewsToday()).toBe(0);
    fireEvent.click(screen.getByText("sample")); // another sample: still free to open
    expect(screen.queryByText(PAPER)).not.toBeNull();
    expect(viewsToday()).toBe(0);
    fireEvent.click(screen.getByText("hop")); // a non-sample paper: counted at open, as before
    expect(screen.queryByText(PAPER)).not.toBeNull();
    expect(viewsToday()).toBe(1);
  });

  it("★ crawler safety holds: a fresh context renders a sample, and a non-sample", () => {
    expect(visit(FM_S1)).toBe(true);
    localStorage.clear();
    sessionStorage.clear();
    expect(visit(["/full-mock/10/Science", ""])).toBe(true);
  });
});

describe("TS-SAMPLE-OPEN · everything else unchanged", () => {
  it("★★ non-sample, signed out: opening counts and the next paper walls (today's rule)", () => {
    expect(visit(["/full-mock/10/Science", "?paper=2"])).toBe(true);
    expect(viewsToday()).toBe(1);
    expect(visit(FM_S1)).toBe(false); // a sample after a counted paper: walled at open, as before
    localStorage.clear();
    sessionStorage.clear();
    expect(visit(["/chapter-test/10/Maths/real-numbers", ""])).toBe(true); // the non-series test sharing CT-M01's route key
    expect(viewsToday()).toBe(1);
    expect(visit(["/chapter-test/10/Maths/polynomials", "?series=1"])).toBe(false);
  });

  it("★★ signed in: opening a sample counts at open, exactly as before", () => {
    currentUser = { uid: "student-1" };
    expect(visit(CT_M01)).toBe(true);
    expect(viewsToday()).toBe(1);
    expect(claimNewPaperView(CT_M01[0], "student-1", false, CT_M01[1])).toBe(true);
    expect(viewsToday()).toBe(1);
  });

  it("★★ kill switch VITE_TS_SAMPLE_OPEN_FREE_DISABLED=1: opening a sample counts again (the live report's wall)", () => {
    vi.stubEnv("VITE_TS_SAMPLE_OPEN_FREE_DISABLED", "1");
    expect(sampleOpensUncounted(...CT_M01)).toBe(false);
    expect(visit(CT_M01)).toBe(true);
    expect(viewsToday()).toBe(1);
    expect(visit(FM_S1)).toBe(false);
    expect(lastScreen).toContain(WALL);
  });

  it("★ the kill switch accepts only \"1\"", () => {
    for (const v of ["true", "0", "", "yes"]) {
      vi.stubEnv("VITE_TS_SAMPLE_OPEN_FREE_DISABLED", v);
      expect(sampleOpensUncounted(...CT_M01)).toBe(true);
    }
  });
});
