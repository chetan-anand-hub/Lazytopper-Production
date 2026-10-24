/**
 * MeProgressPage — DPDP REACHABILITY.
 *
 * ★★ MOUNT != LIVE, AND THIS FILE IS THE MOUNT HALF OF THE ANSWER.
 *
 * `POST /api/account/erase` (#638) and `GET /api/account/export` (#645) shipped as
 * authenticated routes with NO CALLER. The failure this lane exists to end is a
 * settings surface that renders in a test and that no student can navigate to, so the
 * one assertion that matters is not "AccountDataControls works" — its own suite covers
 * that — but "AccountDataControls IS ON THE PAGE A STUDENT ALREADY VISITS".
 *
 * SETTINGS-1 (24 Oct 2026): the controls moved from /me into the avatar menu's Settings
 * window. This file now pins that /me no longer carries them; where they ARE reachable is
 * pinned in components/account/SettingsModal.test.tsx. The route half below is unchanged.
 *
 * ★ The routing half of reachability cannot be proven from here (App.tsx is globally
 * FORBIDDEN and untouched by this lane), so it is pinned by the route-shape assertion
 * at the bottom, which reads the real App.tsx source.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/* ── the page's data reads are stubbed; the page and the DPDP controls are REAL ── */

// ★ getRecentSessions and getActivitySummary are SYNCHRONOUS and device-local. Mocking
// them as async returns a Promise where the page expects an array, and the page throws
// `sessions.map is not a function` — which is the shape of the very error this file is
// meant to detect, so getting these wrong would have produced a FALSE reachability red.
vi.mock("../services/progressStore", async (importOriginal) => ({
  // ME-ENGINE-1 PR-1 — the page reads the REAL shared read model (services/progressReadModel),
  // which uses the REAL window / canonicaliser helpers; only the cloud aggregation is mocked.
  ...(await importOriginal<typeof import("../services/progressStore")>()),
  // the full WindowedProgress shape — a partial one makes the page throw on
  // `data?.sections.length` and would again produce a FALSE reachability red
  getWindowedProgress: vi.fn(async () => ({
    window: "month",
    subjects: [],
    topics: [],
    concepts: [],
    sections: [],
    mistakeTypes: [],
    activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 },
    activitySpanDays: 30,
    mistakeLog: { loggedInWindow: 0 },
  })),
  getRecentSessions: vi.fn(() => []),
  getActivitySummary: vi.fn(() => ({
    worksheets: 0,
    chapterTests: 0,
    fullMocks: 0,
    practiceAttempts: 0,
  })),
  getTopicTrendFromCloud: vi.fn(async () => ({ window: "month", trend: null, points: [] })),
  isShortSpan: () => false,
}));
vi.mock("../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/mistakeLogService")>()),
  getMistakeLogHistoryFromCloud: vi.fn(async () => ({ entries: [], complete: true })),
}));
vi.mock("../services/mistakeInsightsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/mistakeInsightsService")>()),
  summarizeCareless: () => ({
    calculationCount: 0,
    sillyCount: 0,
    count: 0,
    marksLost: 0,
    hasData: false,
  }),
}));
vi.mock("../services/adaptivePracticeEngine", () => ({ getWrongConceptsForTopic: () => [] }));
vi.mock("../components/progress/ProgressWindowArc", () => ({
  ProgressWindowArc: () => <div data-testid="progress-window-arc" />,
  progressArcStateKind: () => "rungs",
}));
vi.mock("../components/subscription/UpgradeSheet", () => ({
  UpgradeSheet: () => <div data-testid="upgrade-sheet" />,
}));

let mockIsDesktop = false;
vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => mockIsDesktop }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));

let mockUser: { uid: string; displayName?: string } | null = { uid: "u-1", displayName: "Asha" };
vi.mock("../context/AuthContext", () => ({
  // ★ NOTE the omitted `logout` — this mirrors the ~25 suites that replace this module
  // with a partial factory. AccountDataControls must not throw when it is missing.
  useAuth: () => ({ user: mockUser, loading: false, mistakeLogsHydrated: true }),
}));

import MeProgressPage from "./MeProgressPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <MeProgressPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  mockUser = { uid: "u-1", displayName: "Asha" };
  mockIsDesktop = false;
});

describe("SETTINGS-1 · DPDP controls moved OFF /me (owner ruling 24 Oct 2026)", () => {
  // Their new home is SettingsModal, opened from the avatar menu; reachability from
  // there is pinned in components/account/SettingsModal.test.tsx and the two menu tests.
  it("★★ a signed-in student's /me shows NEITHER download nor delete, at mobile width", async () => {
    mockIsDesktop = false;
    renderPage();
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^download$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete my account/i })).toBeNull();
    expect(screen.queryByRole("region", { name: /your data and your account/i })).toBeNull();
    expect(screen.queryByTestId("mascots-setting")).toBeNull();
  });

  it("★ ... and at DESKTOP width", async () => {
    mockIsDesktop = true;
    renderPage();
    expect(await screen.findByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /delete my account/i })).toBeNull();
    expect(screen.queryByRole("region", { name: /your data and your account/i })).toBeNull();
    expect(screen.queryByTestId("mascots-setting")).toBeNull();
  });
});

describe("the route half of reachability", () => {
  /**
   * ★ Reads the REAL App.tsx. This lane does not modify it — it is globally FORBIDDEN
   * — so this asserts the pre-existing wiring that makes the section reachable, and
   * fails loudly if a later PR unroutes /me and silently strands the DPDP surface.
   */
  const appSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "..", "App.tsx"),
    "utf8"
  );

  it("★★ /me is a real route that renders MeProgressPage behind RequireAuth", () => {
    expect(appSource).toContain('path="/me"');
    expect(appSource).toContain("<MeProgressPage />");
    // the /me <Route> block, from its path to the close of its element prop
    const block = appSource.slice(appSource.indexOf('path="/me"'));
    const meRoute = block.slice(0, block.indexOf("/>"));
    expect(meRoute).toContain("RequireAuth");
  });

  it("★★ a student can NAVIGATE there — the nav triggers exist", () => {
    // mobile BottomNav profile icon, and the desktop header avatar
    expect(appSource).toContain('go("/me")');
    expect(appSource).toContain('navigate("/me")');
  });

  it("★ /profile redirects to /me, so the old account URL still lands on this surface", () => {
    expect(appSource).toContain('path="/profile"');
    expect(appSource).toContain('<Navigate to="/me" replace />');
  });

  it("★ CONTROL: these assertions can fail — a route that does not exist is not found", () => {
    // /settings was RETIRED. If the probe above matched anything, this would too.
    expect(appSource).not.toContain('path="/settings"');
  });
});
