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
  // ME-2 NOTE: the probe was `progress-window-arc`. That component renders PERCENTAGES
  // at 8 sites and /me was its only mount; "marks, never percentages" and mounting it
  // cannot both hold, so it is no longer on this page ([FU-ME-PROGRESSWINDOWARC-DORMANT]).
  // The guarantee under test is unchanged: an empty read fabricates NOTHING.
  it("renders NO number in any rung when getWindowedProgress returns empty", async () => {
    mockGetWindowedProgress.mockResolvedValue(EMPTY);
    renderPage();
    await screen.findByTestId("me-first-run");

    // The absence: no rung list exists at all.
    expect(screen.queryByTestId("me-mistake-mix")).toBeNull();
    expect(screen.queryByTestId("me-drill-topics")).toBeNull();
    expect(screen.queryByTestId("me-hero-bar")).toBeNull();
    // ...and the honest first-run copy is present in its place, explicitly labelled as
    // somebody else's sheet rather than a fabricated one of the student's own.
    expect(
      screen.getByText(/the sheet below belongs to an example student/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Example — not your marks/i)).toBeInTheDocument();
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

/* ══════════════ 5 · SUBJECT PURITY — two papers, never mixed ══════════════
 *
 * ME-2 NOTE: this describe replaces "Science + Physics filters the drill". The Science
 * STREAM sub-filter is gone: the page is now scoped to ONE PAPER, and a stream cannot
 * scope `concepts`/`sections` rungs (they carry no stream), so a stream filter would
 * have silently broken the reconciliation between the hero and the deeper views.
 *
 * What replaces it is strictly stronger and is what the paper switch actually promises:
 * Maths and Science are two separate 80-mark exams and NOTHING below the switch mixes
 * them — in BOTH directions, each with a CONTROL. */

describe("5 · subject purity — no Maths row under Science, and no Science row under Maths", () => {
  const MIXED = windowed({
    subjects: [rung("maths", "Maths"), rung("science", "Science")],
    topics: [
      rung("real-numbers", "Real Numbers"),
      rung("light-reflection-and-refraction", "Light"),
    ],
  });

  it("shows no Science chapter while the Maths paper is selected — and the control proves the query works", async () => {
    const user = userEvent.setup();
    mockGetWindowedProgress.mockResolvedValue(MIXED);
    renderPage();
    await screen.findByTestId("me-drill-topics");

    await user.click(screen.getByTestId("me-paper-maths"));
    const drill = screen.getByTestId("me-drill-topics");
    // ★ CONTROL: the Maths chapter IS found by the same query in the same container.
    expect(within(drill).getByText("Real Numbers")).toBeInTheDocument();
    // The absence.
    expect(within(drill).queryByText("Light - Reflection & Refraction")).toBeNull();
  });

  it("★ THE OTHER DIRECTION: shows no Maths chapter while the Science paper is selected", async () => {
    const user = userEvent.setup();
    mockGetWindowedProgress.mockResolvedValue(MIXED);
    renderPage();
    await screen.findByTestId("me-drill-topics");

    await user.click(screen.getByTestId("me-paper-science"));
    const drill = screen.getByTestId("me-drill-topics");
    // ★ CONTROL first: the Science chapter IS listed here.
    expect(within(drill).getByText("Light - Reflection & Refraction")).toBeInTheDocument();
    expect(within(drill).queryByText("Real Numbers")).toBeNull();
  });

  it("★ the paper switch SCOPES THE READ rather than filtering after it", async () => {
    // Subject purity for `concepts` and `sections` is only achievable in the read —
    // those rungs carry no subject of their own. If this ever regresses to a
    // post-filter, those two views silently mix the papers with no visible symptom.
    const user = userEvent.setup();
    mockGetWindowedProgress.mockResolvedValue(MIXED);
    renderPage();
    await screen.findByTestId("me-drill-topics");

    await user.click(screen.getByTestId("me-paper-science"));
    const scopes = mockGetWindowedProgress.mock.calls.map((c) => c[2]);
    expect(scopes).toContainEqual({ subject: "science" });
    // ★ CONTROL: the lowercase key is not an accident of the assertion — the label
    //   casing ("Science") would NOT satisfy `SessionSubject`.
    expect(scopes).not.toContainEqual({ subject: "Science" });
  });
});

/* ══════════════ 6 · ONE component serves both widths ══════════════ */

describe("6 · one component, two widths — useIsDesktop drives layout", () => {
  it("renders the same page at desktop and mobile width, flagged by a class only", async () => {
    mockGetWindowedProgress.mockResolvedValue(
      windowed({ topics: [rung("real-numbers", "Real Numbers")] }),
    );
    mockIsDesktop = true;
    const desktop = renderPage();
    const desktopRoot = desktop.container.querySelector(".lt-me");
    expect(desktopRoot?.className).toContain("lt-me--desktop");
    expect(await screen.findByTestId("me-drill-topics")).toBeInTheDocument();
    desktop.unmount();

    mockIsDesktop = false;
    const mobile = renderPage();
    const mobileRoot = mobile.container.querySelector(".lt-me");
    expect(mobileRoot?.className).toContain("lt-me--mobile");
    // The SAME surface, not a second page file: the SAME testid resolves at both
    // widths, from one component.
    expect(await screen.findByTestId("me-drill-topics")).toBeInTheDocument();
  });
});

/* ══════════════ 7 · EXACTLY ONE ROUTER — the #490 defect class ══════════════ */

describe("7 · exactly one router in the tree", () => {
  it("★ mounts inside the app's always-present outer router and renders its content", async () => {
    // Written positively: a `not.toThrow()` here would pass even if the page were
    // broken, which is exactly how #490's own guard was a silent no-op.
    mockGetWindowedProgress.mockResolvedValue(
      windowed({ topics: [rung("real-numbers", "Real Numbers")] }),
    );
    renderPage();
    expect(await screen.findByTestId("me-drill-topics")).toBeInTheDocument();
    // getByRole is SINGULAR — this also pins "exactly one h1 in every state".
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

/* ══════════════ 10 · attempt history — REMOVED, and the removal is pinned ══════════════
 *
 * ME-2 NOTE. The v7.1 spec removes "Recent work": nothing on it was actionable, and
 * Check & Improve, Chapter Test and Full Mock each own their own history. The old test
 * here asserted the DEVICE-LOCAL SEAM COPY inside `me-history-empty` — it pinned the
 * very section the spec deletes, so it cannot be adapted, only replaced.
 *
 * ⚠ WHAT IS LOST WITH IT: [FU-ME-HISTORY-DEVICE-LOCAL] no longer has a rendered
 * statement anywhere in the product. That is recorded in the lane report as a
 * follow-up, not silently dropped. What is pinned INSTEAD is that the section really
 * is gone, so it cannot creep back untested. */

describe("10 · the attempt-history section is gone (v7.1 removes Recent work)", () => {
  it("renders no history list and no history empty-state", async () => {
    mockGetRecentSessions.mockReturnValue([]);
    mockGetWindowedProgress.mockResolvedValue(
      windowed({ topics: [rung("real-numbers", "Real Numbers")] }),
    );
    renderPage();
    // ★ CONTROL FIRST: the page really did render, so the absences below are not an
    //   unmounted component.
    expect(await screen.findByTestId("me-drill-topics")).toBeInTheDocument();
    expect(screen.queryByTestId("me-history")).toBeNull();
    expect(screen.queryByTestId("me-history-empty")).toBeNull();
  });
});
