import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * CT-RESUME-2 — the daily paper gate counts only NEW papers.
 *
 * Before: every page load of /chapter-test/... or /full-mock/... by a non-premium student was a
 * counted "paper view". A reload mid-test spent one of the day's papers, and a student on their
 * LAST paper who reloaded hit the wall and could not get back to the paper they were sitting.
 *
 * Now: a load that is a RESUME of a saved in-progress paper (the page's own autosave for that
 * route) neither counts nor blocks; a genuinely new paper still counts and still blocks; and a
 * student who sets the saved paper aside to start a NEW one on that visit is counted then.
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
    isTrialExpired: true,
    daysLeftInTrial: 0,
    status: { tier: premium ? "premium" : "free" },
    startTrial: () => {},
    upgradeToPremium: () => {},
  }),
}));

import { MockViewGate, claimNewPaperView } from "./MockViewGate";

const PAPER = "the paper body";
const CT_ROUTE = "/chapter-test/10/science/carbon-and-its-compounds";
const FM_ROUTE = "/full-mock/10/science";
const UID = "student-1";

function visit(path: string): boolean {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <MockViewGate><div>{PAPER}</div></MockViewGate>
    </MemoryRouter>,
  );
  const rendered = screen.queryByText(PAPER) !== null;
  view.unmount();
  return rendered;
}

/** Today's counted views for the signed-in student (the gate's own record). */
function viewsToday(): number {
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i) || "";
    if (k.startsWith("lazytopper.dailyMockViews:")) return JSON.parse(localStorage.getItem(k) || "{}").count ?? 0;
  }
  return 0;
}

const savedPaper = { worksheetId: "ct-1", questions: [{ qNumber: 1, id: "q1", section: "A", marks: 1 }] };

/** What ChapterTestPage's autosave writes while a test is being taken (CT-RELOAD-1 + CT-RESUME-2). */
function saveCtProgress(route = CT_ROUTE) {
  sessionStorage.setItem(
    "lazytopper.ct.progress.CT-S-CAIC-02",
    JSON.stringify({ answers: { 1: "x" }, flags: [], elapsed: 60, currentQNumber: 2, timerEnabled: true, paper: savedPaper, route }),
  );
}
/** What fullMockSession's autosave writes while a mock is being taken. */
function saveFmSession(subject: "Maths" | "Science" = "Science", phase = "taking") {
  localStorage.setItem(
    `lazytopper.fm.session.v1.${UID}.FM-S-02`,
    JSON.stringify({ code: "FM-S-02", subject, phase, paper: savedPaper, startedAt: 1, durationMs: 1, answers: {}, flags: [], updatedAt: 1 }),
  );
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  currentUser = { uid: UID };
  premium = false;
});
afterEach(() => cleanup());

/** Spend today's 3 papers on three NEW chapter tests. */
function spendAllThree() {
  expect(visit("/chapter-test/10/maths/real-numbers")).toBe(true);
  expect(visit("/chapter-test/10/maths/polynomials")).toBe(true);
  expect(visit(CT_ROUTE)).toBe(true);
  expect(viewsToday()).toBe(3);
}

describe("CT-RESUME-2 · the daily paper gate counts only NEW papers", () => {
  it("★★ a student at 3/3 papers reloads their Chapter Test and gets back to it — not counted, not blocked", () => {
    spendAllThree();
    saveCtProgress(); // they were part-way through the Carbon test when they reloaded
    expect(visit(CT_ROUTE)).toBe(true);
    expect(viewsToday()).toBe(3);
  });

  it("★★ a NEW paper still blocks at 3/3 (another chapter, no saved progress)", () => {
    spendAllThree();
    saveCtProgress(); // a saved Carbon test does not open a different chapter
    expect(visit("/chapter-test/10/maths/trigonometry")).toBe(false);
    expect(viewsToday()).toBe(3);
  });

  it("★★ a reload mid-test does not spend a paper (2 of 3 used stays 2)", () => {
    expect(visit("/chapter-test/10/maths/real-numbers")).toBe(true);
    expect(visit(CT_ROUTE)).toBe(true);
    expect(viewsToday()).toBe(2);
    saveCtProgress();
    expect(visit(CT_ROUTE)).toBe(true);
    expect(visit(CT_ROUTE)).toBe(true);
    expect(viewsToday()).toBe(2);
  });

  it("★★ Full Mock: a saved mock for THIS subject resumes at 3/3; the other subject is a new paper", () => {
    spendAllThree();
    saveFmSession("Science");
    expect(visit(FM_ROUTE)).toBe(true);
    expect(visit("/full-mock/10/maths")).toBe(false);
    expect(viewsToday()).toBe(3);
  });

  it("★ a submitted (awaiting-upload) mock is not an in-progress paper", () => {
    spendAllThree();
    saveFmSession("Science", "awaiting-upload");
    expect(visit(FM_ROUTE)).toBe(false);
  });

  it("★★ setting the saved paper aside for a NEW one on that visit is counted then — or refused at the limit", () => {
    // At 3/3: the resume visit is let through, but a new paper is refused.
    spendAllThree();
    saveCtProgress();
    expect(visit(CT_ROUTE)).toBe(true);
    expect(claimNewPaperView(CT_ROUTE, UID)).toBe(false);
    expect(viewsToday()).toBe(3);

    // Under the limit: the new paper is counted once, and only once.
    localStorage.clear();
    sessionStorage.clear();
    expect(visit("/chapter-test/10/maths/real-numbers")).toBe(true);
    saveCtProgress();
    expect(visit(CT_ROUTE)).toBe(true);
    expect(viewsToday()).toBe(1);
    expect(claimNewPaperView(CT_ROUTE, UID)).toBe(true);
    expect(viewsToday()).toBe(2);
    expect(claimNewPaperView(CT_ROUTE, UID)).toBe(true);
    expect(viewsToday()).toBe(2);
  });

  it("★ a visit that WAS counted never counts again when the page starts its paper", () => {
    expect(visit(CT_ROUTE)).toBe(true);
    expect(claimNewPaperView(CT_ROUTE, UID)).toBe(true);
    expect(viewsToday()).toBe(1);
  });

  it("★ premium is unlimited and never marked", () => {
    premium = true;
    saveCtProgress();
    expect(visit(CT_ROUTE)).toBe(true);
    expect(sessionStorage.getItem("lazytopper.dailyMockViews.uncounted")).toBeNull();
  });
});
