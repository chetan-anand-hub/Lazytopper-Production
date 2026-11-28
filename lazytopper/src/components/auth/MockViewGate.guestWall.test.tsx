import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// FREE-TS-WEEKLY: this file pins TODAY's daily gate / copy, which the kill switch VITE_FREE_TS_WEEKLY_DISABLED=1 restores exactly.
vi.hoisted(() => vi.stubEnv("VITE_FREE_TS_WEEKLY_DISABLED", "1"));
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

/**
 * GUEST-WALL (owner rulings 26 Nov 2026, 22:43 IST):
 *   1. the signed-out wall reads "Sign in to open 3 papers a day. Your first test is free, marking included." with the same Sign in
 *      link and safe redirect;
 *   4. the re-judge gap (review of #1899): a COUNTED mount was never re-judged when the route moved to another paper on the same
 *      <Route> without a remount, so a guest who opened a non-sample chapter test (1 of 1) could then reach CT-M01 and CT-S01 by in-app
 *      navigation and Start both. Every different paper is now judged exactly as a fresh mount; the same paper (?review= / ?upload=
 *      rewrites) is never re-counted; nothing of the new paper paints before its decision.
 * The tests read the local day through the gate's counter (registered in scripts/testClock/date-sensitive-tests.json).
 */

type TestUser = { uid: string; isLocalSession?: boolean } | null;
let currentUser: TestUser = null;
let premium = false;

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: currentUser, loading: false }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: premium ? "premium" : "free",
    isPremium: premium,
    isTrialActive: false,
    isTrialExpired: !premium,
    daysLeftInTrial: 0,
    status: { tier: premium ? "premium" : "free" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));
vi.mock("./paperCapOwner", () => ({
  readTestSeriesOwner: () => Promise.resolve(false),
  isKnownTestSeriesOwner: () => false,
}));

import { MockViewGate, claimNewPaperView, paperSignInPath, SIGNED_OUT_WALL_LINE } from "./MockViewGate";

const WALL = "Sign in to open 3 papers a day. Your first test is free, marking included.";
const NON_SAMPLE = "/chapter-test/10/Maths/polynomials";
const CT_M01 = "/chapter-test/10/Maths/real-numbers?series=1";
const CT_S01 = "/chapter-test/10/Science/chemical-reactions-and-equations?series=1";

/** Every route the gated child was ever rendered on (a paint of the paper page). */
let painted: string[] = [];
function Paper() {
  const loc = useLocation();
  painted.push(`${loc.pathname}${loc.search}`);
  return <div data-testid="paper">paper {loc.pathname}{loc.search}</div>;
}
function Nav({ to }: { to: string[] }) {
  const navigate = useNavigate();
  return (
    <>
      {to.map((t) => (
        <button key={t} type="button" onClick={() => navigate(t)}>
          go {t}
        </button>
      ))}
    </>
  );
}
function mountOnRoute(first: string, to: string[]) {
  return render(
    <MemoryRouter initialEntries={[first]}>
      <Nav to={to} />
      <Routes>
        <Route path="/chapter-test/:grade/:subject/:topicKey" element={<MockViewGate><Paper /></MockViewGate>} />
      </Routes>
    </MemoryRouter>,
  );
}
const go = (t: string) => fireEvent.click(screen.getByText(`go ${t}`));
const onScreen = () => screen.queryByTestId("paper") !== null;
function viewsToday(): number {
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || "";
    if (k.startsWith("lazytopper.dailyMockViews:")) return JSON.parse(localStorage.getItem(k) || "{}").count ?? 0;
  }
  return 0;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  currentUser = null;
  premium = false;
  painted = [];
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

describe("GUEST-WALL 1 · the signed-out wall", () => {
  it("★ the exact line, the Sign in link with the safe redirect, and no new trial claim", () => {
    expect(SIGNED_OUT_WALL_LINE).toBe(WALL);
    render(
      <MemoryRouter initialEntries={["/full-mock/10/Maths?paper=2"]}>
        <MockViewGate><Paper /></MockViewGate>
      </MemoryRouter>,
    );
    cleanup();
    render(
      <MemoryRouter initialEntries={["/full-mock/10/Science?paper=3"]}>
        <MockViewGate><Paper /></MockViewGate>
      </MemoryRouter>,
    );
    const text = document.body.textContent || "";
    expect(text).toContain(WALL);
    expect(text).not.toMatch(/7-day|trial/i);
    const link = screen.getByRole("link", { name: /sign in/i });
    expect(link.getAttribute("href")).toBe(`/login?reason=login&redirect=${encodeURIComponent("/full-mock/10/Science?paper=3")}`);
  });
  it("paperSignInPath never sends an off-site return", () => {
    expect(paperSignInPath("/full-mock/10/Maths", "?paper=1")).toBe("/login?reason=login&redirect=%2Ffull-mock%2F10%2FMaths%3Fpaper%3D1");
    expect(paperSignInPath("//evil.example", "")).toBe("/login?reason=login&redirect=%2F");
    expect(paperSignInPath("evil.example/x", "")).toBe("/login?reason=login&redirect=%2F");
  });
});

describe("GUEST-WALL 4 · a different paper on the same <Route> is judged like a fresh mount", () => {
  it("★★ the review's case: non-sample (counted 1 of 1) -> CT-M01 -> CT-S01 by in-app navigation: neither opens, so neither can Start", () => {
    mountOnRoute(NON_SAMPLE, [CT_M01, CT_S01]);
    expect(onScreen()).toBe(true);
    expect(viewsToday()).toBe(1);
    go(CT_M01);
    expect(onScreen()).toBe(false);
    expect(document.body.textContent).toContain(WALL);
    go(CT_S01);
    expect(onScreen()).toBe(false);
    expect(document.body.textContent).toContain(WALL);
    expect(viewsToday()).toBe(1);
    // the render guard: the paper page never painted either sample's route
    expect(painted.some((p) => p.includes("real-numbers") || p.includes("chemical-reactions"))).toBe(false);
    // and no uncounted mark was left for either sample, so nothing marks them startable for free
    expect(sessionStorage.getItem("lazytopper.dailyMockViews.uncounted")).toBeNull();
  });

  it("★★ samples first, then one Started: the other sample, reached on the same Route, walls (one Start a day)", () => {
    mountOnRoute(CT_M01, [CT_S01]);
    expect(onScreen()).toBe(true);
    expect(viewsToday()).toBe(0);
    expect(claimNewPaperView("/chapter-test/10/Maths/real-numbers", null, false, "?series=1")).toBe(true); // the page's Start
    expect(viewsToday()).toBe(1);
    go(CT_S01);
    expect(onScreen()).toBe(false);
    expect(viewsToday()).toBe(1);
  });

  it("★★ the same paper is never re-judged or re-counted: ?review= and ?upload= rewrites keep the paper on screen", () => {
    const review = `${NON_SAMPLE}?review=rec-1`;
    const upload = `${NON_SAMPLE}?upload=CT-123`;
    mountOnRoute(NON_SAMPLE, [review, upload, NON_SAMPLE]);
    expect(viewsToday()).toBe(1);
    const before = painted.length;
    go(review);
    expect(onScreen()).toBe(true);
    go(upload);
    expect(onScreen()).toBe(true);
    go(NON_SAMPLE);
    expect(onScreen()).toBe(true);
    expect(viewsToday()).toBe(1);
    // every rewrite painted straight away (no loading card in between)
    expect(painted.length).toBeGreaterThan(before);
    expect(screen.queryByText("Loading...")).toBeNull();
  });

  it("★★ signed in: each different paper on the same Route is counted, and the 4th walls", async () => {
    currentUser = { uid: "student-1" };
    const papers = ["/chapter-test/10/Maths/real-numbers", "/chapter-test/10/Maths/quadratic-equations", "/chapter-test/10/Maths/triangles"];
    mountOnRoute(NON_SAMPLE, papers);
    expect(viewsToday()).toBe(1);
    go(papers[0]);
    expect(onScreen()).toBe(true);
    go(papers[1]);
    expect(onScreen()).toBe(true);
    expect(viewsToday()).toBe(3);
    go(papers[2]);
    // at the limit the gate asks (lazily) whether they own the Test Series: the loading card, never the 4th paper, meanwhile
    expect(onScreen()).toBe(false);
    expect(await screen.findByText(/used your 3 papers for today/)).toBeTruthy();
    expect(onScreen()).toBe(false);
    expect(painted.some((p) => p.includes("triangles"))).toBe(false);
    expect(viewsToday()).toBe(3);
  });

  it("★ premium: navigating between papers is never judged or held on a loading card", () => {
    currentUser = { uid: "student-p" };
    premium = true;
    mountOnRoute(NON_SAMPLE, [CT_M01, CT_S01]);
    go(CT_M01);
    expect(onScreen()).toBe(true);
    go(CT_S01);
    expect(onScreen()).toBe(true);
    expect(viewsToday()).toBe(0);
  });

  it("★ crawler safety: a fresh context renders the first paper (sample and non-sample)", () => {
    mountOnRoute(NON_SAMPLE, []);
    expect(onScreen()).toBe(true);
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    mountOnRoute(CT_M01, []);
    expect(onScreen()).toBe(true);
  });
});


beforeEach(() => {
  vi.stubEnv("VITE_FREE_TS_WEEKLY_DISABLED", "1");
});
