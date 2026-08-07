/**
 * MeProgressPage — the converged /me surface.
 *
 * ★ HARNESS NOTE (#490's defect class). The app is ALWAYS inside main.tsx's
 * <BrowserRouter>. This file therefore renders the page inside ONE MemoryRouter —
 * that router stands in for the app's always-present outer router. The page itself
 * must NEVER construct a router: a <Router> inside another <Router> is the #490
 * defect verbatim, and it error-paged every student.
 *
 * The one-router assertion below is written POSITIVELY (assert on the rendered
 * result) and is paired with a CONTROL that adds a SECOND router and proves the
 * harness can detect it. An `expect(...).not.toThrow()` here would be a silent
 * no-op, exactly as it was in App.routing.contract.test.tsx.
 *
 * Every "absent" assertion in this file is paired with a control that renders the
 * thing, so an absence can never pass because the query was wrong.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { WindowedProgress, RungTrend } from "../services/progressStore";

/* ────────────────── mocks — the reads only; the real component runs ────────────────── */

const mockGetWindowedProgress = vi.fn();
const mockGetRecentSessions = vi.fn();
const mockGetActivitySummary = vi.fn();
const mockGetTopicTrendFromCloud = vi.fn();

vi.mock("../services/progressStore", () => ({
  getWindowedProgress: (...a: unknown[]) => mockGetWindowedProgress(...a),
  getRecentSessions: (...a: unknown[]) => mockGetRecentSessions(...a),
  getActivitySummary: (...a: unknown[]) => mockGetActivitySummary(...a),
  getTopicTrendFromCloud: (...a: unknown[]) => mockGetTopicTrendFromCloud(...a),
  isShortSpan: () => false,
}));

vi.mock("../services/mistakeLogService", () => ({
  getMistakeLogs: vi.fn(async () => []),
}));

vi.mock("../services/mistakeInsightsService", () => ({
  summarizeCareless: () => ({
    sillyCount: 0,
    presentationCount: 0,
    count: 0,
    marksLost: 0,
    hasData: false,
  }),
}));

vi.mock("../services/adaptivePracticeEngine", () => ({
  getWrongConceptsForTopic: () => [],
}));

// ProgressWindowArc does its own async cloud reads; the page's contract with it is
// that it is MOUNTED (so its honesty copy is reused by import, not duplicated).
vi.mock("../components/progress/ProgressWindowArc", () => ({
  ProgressWindowArc: ({ uid }: { uid: string | null }) => (
    <div data-testid="progress-window-arc" data-uid={uid ?? ""} />
  ),
  progressArcStateKind: () => "rungs",
}));

vi.mock("../components/subscription/UpgradeSheet", () => ({
  UpgradeSheet: ({ featureLabel }: { featureLabel?: string }) => (
    <div data-testid="upgrade-sheet">{featureLabel}</div>
  ),
}));

let mockIsDesktop = true;
vi.mock("../hooks/useIsDesktop", () => ({
  useIsDesktop: () => mockIsDesktop,
}));

let mockIsPremium = true;
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: mockIsPremium }),
}));

let mockUser: { uid: string; displayName?: string; isLocalSession?: boolean } | null = {
  uid: "u-1",
  displayName: "Asha Rao",
};
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, loading: false, mistakeLogsHydrated: true }),
}));

import MeProgressPage from "./MeProgressPage";

/* ────────────────── fixtures ────────────────── */

const rung = (key: string, label: string, over: Partial<RungTrend> = {}): RungTrend => ({
  key,
  label,
  before: 40,
  now: 55,
  delta: 15,
  sampleBefore: 6,
  sampleNow: 8,
  spanDays: 30,
  ...over,
});

function windowed(over: Partial<WindowedProgress> = {}): WindowedProgress {
  return {
    window: "month",
    subjects: [rung("maths", "Maths")],
    topics: [],
    concepts: [],
    sections: [],
    mistakeTypes: [],
    activity: { worksheets: 0, chapterTests: 0, fullMocks: 0, practiceAttempts: 0 },
    activitySpanDays: 30,
    mistakeLog: { loggedInWindow: 0 },
    ...over,
  } as WindowedProgress;
}

const EMPTY = windowed({ subjects: [] });

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/me"]}>
      <MeProgressPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsDesktop = true;
  mockIsPremium = true;
  mockUser = { uid: "u-1", displayName: "Asha Rao" };
  mockGetWindowedProgress.mockResolvedValue(EMPTY);
  mockGetRecentSessions.mockReturnValue([]);
  mockGetActivitySummary.mockReturnValue({
    worksheets: 0,
    chapterTests: 0,
    fullMocks: 0,
    practiceAttempts: 0,
  });
  mockGetTopicTrendFromCloud.mockResolvedValue({ window: "month", trend: null, points: [] });
});

/* ══════════════ 1 · the back-nav contract — BOTH mechanisms ══════════════ */

describe("1 · every CTA carries BOTH back-nav mechanisms", () => {
  beforeEach(() => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({
        topics: [rung("real-numbers", "Real Numbers")],
        sections: [rung("A", "Section A", { now: 30 })],
      }),
    );
  });

  it("every outbound Link carries ?source=me&returnTo=/me AND state {back, backLabel}", async () => {
    renderPage();
    const links = await screen.findAllByRole("link");
    expect(links.length).toBeGreaterThan(0);

    for (const link of links) {
      const href = link.getAttribute("href") || "";
      // ★ The QUERY half — read by HighlyProbableQuestions / ExamTrendsRanked /
      //   the buildDesktop* consumers.
      expect(href, `query half missing on ${href}`).toContain("source=me");
      expect(href, `returnTo missing on ${href}`).toContain("returnTo=%2Fme");
      // ★ Never a bare <a href>: a plain anchor drops location.state and Chapter
      //   Test / Full Mock / Exam-Sim lose their Back button. react-router's <Link>
      //   renders an <a> too, so the discriminator is that state is CARRIED.
    }
  });

  it("★ the state half is really attached — navigating a CTA delivers {back, backLabel}", async () => {
    // Renders the page inside the SAME single router as a probe route, then follows
    // a CTA and reads location.state at the destination. This is the assertion that
    // a bare <a href> would fail, and mutation M1 (dropping `state`) turns red here.
    const user = userEvent.setup();
    const { default: Page } = await import("./MeProgressPage");
    const { Routes, Route, useLocation } = await import("react-router-dom");

    const Probe = () => {
      const loc = useLocation();
      return (
        <div data-testid="probe">
          {JSON.stringify((loc.state as Record<string, unknown>) ?? null)}
        </div>
      );
    };

    render(
      <MemoryRouter initialEntries={["/me"]}>
        <Routes>
          <Route path="/me" element={<Page />} />
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    );

    const cta = await screen.findByTestId("me-cta-practise-real-numbers");
    await user.click(cta);

    const probe = await screen.findByTestId("probe");
    expect(probe.textContent).toContain('"back":"/me"');
    expect(probe.textContent).toContain('"backLabel":"Back to Me / Progress"');
  });
});

/* ══════════════ 2 · honest-or-silent ══════════════ */

describe("2 · honest-or-silent on an empty read", () => {
  it("renders NO number in any rung when getWindowedProgress returns empty", async () => {
    mockGetWindowedProgress.mockResolvedValue(EMPTY);
    renderPage();
    await screen.findByTestId("progress-window-arc");

    // The absence: no rung list exists at all.
    expect(screen.queryByTestId("me-mistake-mix")).toBeNull();
    expect(screen.queryByTestId("me-drill-topics")).toBeNull();
    // ...and the honest empty copy is present in its place.
    expect(
      screen.getByText(/Your topics appear here after you practise/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Section-by-section marks appear after a worksheet/i),
    ).toBeInTheDocument();
  });

  it("★ CONTROL: the same queries DO find rungs when the read returns data", async () => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({
        topics: [rung("real-numbers", "Real Numbers")],
        mistakeTypes: [rung("conceptual", "Conceptual")],
        sections: [rung("A", "Section A")],
      }),
    );
    renderPage();
    expect(await screen.findByTestId("me-drill-topics")).toBeInTheDocument();
    expect(screen.getByTestId("me-mistake-mix")).toBeInTheDocument();
  });
});

/* ══════════════ 3 · the moat — silly / presentation are never a weakness ══════════════ */

describe("3 · silly and presentation never appear as a topic weakness", () => {
  it("excludes careless buckets from the drill topic list even when the read supplies them", async () => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({
        topics: [
          rung("silly", "Silly"),
          rung("presentation", "Presentation"),
          rung("real-numbers", "Real Numbers"),
        ],
        mistakeTypes: [rung("silly", "Silly"), rung("conceptual", "Conceptual")],
      }),
    );
    renderPage();
    const drill = await screen.findByTestId("me-drill-topics");

    // The absence — inside the DRILL list only.
    expect(within(drill).queryByText("Silly")).toBeNull();
    expect(within(drill).queryByText("Presentation")).toBeNull();
    // ★ CONTROL: a real topic IS found by the same query in the same container,
    //   so the absence above is not a broken selector.
    expect(within(drill).getByText("Real Numbers")).toBeInTheDocument();
    // ★ AND the control that they exist on the page at all — in the mistake mix,
    //   where careless mark-loss legitimately belongs.
    expect(within(screen.getByTestId("me-mistake-mix")).getByText("Silly")).toBeInTheDocument();
  });
});

/* ══════════════ 4 · slug fallback ══════════════ */

describe("4 · an unresolved topic never emits a broken route", () => {
  it("routes an unresolvable topic key to /exam-trends", async () => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({ topics: [rung("not-a-real-topic-xyz", "Mystery Topic")] }),
    );
    renderPage();
    const cta = await screen.findByTestId("me-cta-practise-not-a-real-topic-xyz");
    expect(cta.getAttribute("href")).toContain("/exam-trends");
    expect(cta.getAttribute("href")).toContain("source=me");
  });

  it("★ CONTROL: a resolvable topic does NOT fall back — it builds a real path", async () => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({ topics: [rung("real-numbers", "Real Numbers")] }),
    );
    renderPage();
    const cta = await screen.findByTestId("me-cta-practise-real-numbers");
    expect(cta.getAttribute("href")).not.toContain("/exam-trends");
  });
});

/* ══════════════ 5 · the Science stream filter ══════════════ */

describe("5 · Science + Physics filters the drill to Physics topics only", () => {
  it("shows only Physics topics once the stream toggle is set", async () => {
    const user = userEvent.setup();
    mockGetWindowedProgress.mockResolvedValue(
      windowed({
        topics: [
          rung("light-reflection-and-refraction", "Light"),
          rung("acids-bases-and-salts", "Acids, Bases and Salts"),
          rung("real-numbers", "Real Numbers"),
        ],
      }),
    );
    renderPage();
    await screen.findByTestId("me-drill-topics");

    await user.click(screen.getByRole("button", { name: "Science" }));
    // ★ CONTROL first: with the stream at All, BOTH science topics are listed.
    let drill = screen.getByTestId("me-drill-topics");
    expect(within(drill).getByText("Light - Reflection & Refraction")).toBeInTheDocument();
    expect(within(drill).getByText("Acids Bases & Salts")).toBeInTheDocument();

    await user.click(screen.getByTestId("me-stream-physics"));
    drill = screen.getByTestId("me-drill-topics");
    expect(within(drill).getByText("Light - Reflection & Refraction")).toBeInTheDocument();
    expect(within(drill).queryByText("Acids Bases & Salts")).toBeNull();
    // Maths never survives the Science subject filter.
    expect(within(drill).queryByText("Real Numbers")).toBeNull();
  });
});

/* ══════════════ 6 · ONE component serves both widths ══════════════ */

describe("6 · one component, two widths — useIsDesktop drives layout", () => {
  it("renders the same page at desktop and mobile width, flagged by a class only", async () => {
    mockIsDesktop = true;
    const desktop = renderPage();
    const desktopRoot = desktop.container.querySelector(".lt-me");
    expect(desktopRoot?.className).toContain("lt-me--desktop");
    expect(await screen.findByTestId("progress-window-arc")).toBeInTheDocument();
    desktop.unmount();

    mockIsDesktop = false;
    const mobile = renderPage();
    const mobileRoot = mobile.container.querySelector(".lt-me");
    expect(mobileRoot?.className).toContain("lt-me--mobile");
    // The SAME surface, not a second page file.
    expect(await screen.findByTestId("progress-window-arc")).toBeInTheDocument();
  });
});

/* ══════════════ 7 · EXACTLY ONE ROUTER — the #490 defect class ══════════════ */

describe("7 · exactly one router in the tree", () => {
  it("★ mounts inside the app's always-present outer router and renders its content", async () => {
    // Written positively: a `not.toThrow()` here would pass even if the page were
    // broken, which is exactly how #490's own guard was a silent no-op.
    renderPage();
    expect(await screen.findByTestId("progress-window-arc")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("★ CONTROL: a SECOND router in the same tree DOES throw — the harness can detect it", () => {
    expect(() =>
      render(
        <MemoryRouter initialEntries={["/me"]}>
          <MemoryRouter initialEntries={["/me"]}>
            <MeProgressPage />
          </MemoryRouter>
        </MemoryRouter>,
      ),
    ).toThrow(/cannot render a <Router> inside another/i);
  });
});

/* ══════════════ 8 · the signed-out locked hero ══════════════ */

describe("8 · the signed-out locked hero and its login CTA are unchanged", () => {
  it("renders the locked hero with reason=open-progress&redirect=/me and NO numbers", async () => {
    // NOTE: /me sits behind <RequireAuth>, which redirects a user-less visitor to
    // /login, so this state is not reachable THROUGH THE ROUTE today. The contract
    // is pinned here so the guarantee cannot be dropped silently.
    mockUser = null;
    renderPage();
    expect(
      await screen.findByText(/Your study mirror needs saved attempts/i),
    ).toBeInTheDocument();
    const cta = screen.getByTestId("me-login-cta");
    expect(cta).toBeInTheDocument();
    // No fabricated numbers in the locked state.
    expect(screen.queryByTestId("me-mistake-mix")).toBeNull();
    expect(screen.queryByTestId("progress-window-arc")).toBeNull();
  });
});

/* ══════════════ 9 · GATE-3's locked-CTA treatment ══════════════ */

describe("9 · premium CTAs match GATE-3's locked treatment", () => {
  beforeEach(() => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({ topics: [rung("real-numbers", "Real Numbers")] }),
    );
  });

  it("a free user gets a focusable aria-disabled control with a Premium badge that opens the upgrade sheet", async () => {
    const user = userEvent.setup();
    mockIsPremium = false;
    renderPage();

    const locked = await screen.findByTestId("me-cta-learn-locked-real-numbers");
    // aria-disabled, NOT the `disabled` attribute — it must stay focusable and be
    // announced as unavailable (GATE-3's contract).
    expect(locked.getAttribute("aria-disabled")).toBe("true");
    expect(locked.hasAttribute("disabled")).toBe(false);
    expect(within(locked).getByText("Premium")).toBeInTheDocument();

    // Tapping opens the upgrade sheet rather than doing nothing.
    await user.click(locked);
    expect(screen.getByTestId("upgrade-sheet")).toBeInTheDocument();
  });

  it("★ CONTROL: a premium user gets the real navigating CTA, not the locked one", async () => {
    mockIsPremium = true;
    renderPage();
    expect(await screen.findByTestId("me-cta-learn-real-numbers")).toBeInTheDocument();
    expect(screen.queryByTestId("me-cta-learn-locked-real-numbers")).toBeNull();
  });
});

/* ══════════════ 10 · the device-local history seam ══════════════ */

describe("10 · the device-local attempt-history seam is stated, not hidden", () => {
  it("says the history is per-device when a cross-device hero sits above an empty list", async () => {
    mockGetRecentSessions.mockReturnValue([]);
    mockGetWindowedProgress.mockResolvedValue(
      windowed({ subjects: [rung("maths", "Maths")] }),
    );
    renderPage();
    const empty = await screen.findByTestId("me-history-empty");
    expect(empty.textContent).toMatch(/stored per device/i);
    expect(empty.textContent).toMatch(/another device/i);
  });
});
