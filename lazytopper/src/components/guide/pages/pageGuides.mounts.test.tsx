/**
 * GUIDE-PAGES-1 — the MOUNTS: each real host renders Byte where the student needs help, with the
 * right copy, in the right place (guide arm), and renders exactly today's page in the control arm.
 *
 *   FairUseLimitPanel (inline panel + trial-day dialog) · the Practice Hub Chapter Test chooser ·
 *   ChapterTestPage setup · FullMockPage setup · WorksheetGenerator build view · ExamTrendsRanked hero
 *
 * RED on trunk: none of these hosts renders a `page-guide-*` / `guide-m7-slot` node there.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { onboarding } = vi.hoisted(() => ({ onboarding: vi.fn() }));
vi.mock("../../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../analytics/analytics")>();
  return { ...actual, trackOnboardingEvent: onboarding };
});
vi.mock("../../../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../../../services/firebaseClient", () => ({
  firestoreDb: null,
  authClient: { currentUser: { uid: "student-1", isAnonymous: false }, onAuthStateChanged: () => () => {} },
}));
vi.mock("../../../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../../usage/useFairUse", () => ({
  useFairUse: () => ({
    limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false,
    blockPaperStart: () => false, planGrade: () => ({ action: "go" }), showLimit: () => {}, snapshot: null,
  }),
}));
vi.mock("../../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => [] };
});
vi.mock("../../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));

import FairUseLimitPanel from "../../usage/FairUseLimitPanel";
import { m7DialogLine } from "./m7Copy";
import { ChapterTestPicker } from "../../practice/ChapterTestPicker";
import ChapterTestPage from "../../../pages/ChapterTestPage";
import FullMockPage from "../../../pages/FullMockPage";
import ExamTrendsRanked from "../../../pages/ExamTrendsRanked";
import WorksheetGenerator from "../../worksheet/WorksheetGenerator";
import { __resetBankChaptersForTest } from "../../../data/bankChapters/loader";
import { __setGuideAbForTests } from "../guideVariant";
import { __resetMascotsForTests, hideMascots } from "../mascotsMute";
import { __resetGuideUidForTests, __resetPageGuidesForTests } from "./pageGuides";
import { ENTRY_COPY, M7_COPY, TRENDS_COPY } from "./pageGuidesChunk";
import { PreTestSlot, registerPreTestMoment } from "./preTestSlot";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { LimitState } from "../../usage/fairUseGate";

const firstLine = () => screen.getAllByTestId("page-guide-line")[0].textContent;

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  __resetMascotsForTests();
  __resetPageGuidesForTests();
  __resetGuideUidForTests();
  __resetBankChaptersForTest();
  onboarding.mockReset();
  __setGuideAbForTests(true, "guide");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  __setGuideAbForTests(null);
});

/* ── M7: the limit panel and the trial-day dialog ─────────────────────────────────────────── */

const TRIAL_PAPER: LimitState = { tier: "trial", scope: "chapter-test", resetAt: null, window: null, allowance: 1 };
const TRIAL_CHECKS: LimitState = {
  tier: "trial",
  scope: "checks",
  resetAt: new Date(Date.now() + 3 * 3600_000).toISOString(),
  window: null,
  allowance: 5,
};

function Panel({ limit }: { limit: LimitState }) {
  return (
    <MemoryRouter>
      <FairUseLimitPanel limit={limit} onDismiss={() => {}} />
    </MemoryRouter>
  );
}

describe("GUIDE-PAGES-1 M7 · FairUseLimitPanel", () => {
  it("inline panel: Byte inside the panel with BOTH lines in the first commit, above the unchanged actions", () => {
    render(<Panel limit={TRIAL_PAPER} />);
    const panel = screen.getByTestId("fair-use-limit-panel");
    const row = screen.getByTestId("guide-moment-m7"); // synchronous: present with the panel itself
    expect(panel.contains(row)).toBe(true);
    expect(screen.getByTestId("guide-m7-hit").textContent).toBe(M7_COPY.trialHit["chapter-test"]);
    expect(screen.getByTestId("guide-m7-still").textContent).toBe(M7_COPY.still);
    const plans = screen.getByTestId("fair-use-see-plans");
    expect(row.compareDocumentPosition(plans) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Byte never SAYS Premium; the panel's own first line already mentions it, exactly once
    expect(row.textContent ?? "").not.toMatch(/Premium/);
    expect((panel.textContent ?? "").match(/Premium removes/g)?.length).toBe(1);
  });

  it("Hide mascots: Byte goes; the panel is today's panel", () => {
    hideMascots();
    render(<Panel limit={TRIAL_PAPER} />);
    expect(screen.queryByTestId("guide-moment-m7")).toBeNull();
    expect(screen.getByTestId("fair-use-limit-panel")).toBeTruthy();
  });

  it("trial-day dialog: Byte AFTER the actions (they keep their place); ONE companion line, nothing repeated", () => {
    render(<Panel limit={TRIAL_CHECKS} />);
    const dialog = screen.getByRole("dialog");
    const row = screen.getByTestId("guide-moment-m7");
    expect(dialog.contains(row)).toBe(true);
    expect(row.getAttribute("data-variant")).toBe("dialog");
    // every existing action precedes Byte's row
    const actions = dialog.querySelector(".lt-usage__actions") as HTMLElement;
    expect(actions.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(actions.contains(row)).toBe(false);
    // the panel's own count (allowance 5): companion value, not a repeat of the dialog's lines
    expect(screen.getByTestId("guide-m7-dialog").textContent).toBe(m7DialogLine(TRIAL_CHECKS));
    expect(screen.getByTestId("guide-m7-dialog").textContent).toContain("You checked 5 answers today.");
    expect(screen.queryByTestId("guide-m7-hit")).toBeNull();
    expect(screen.queryByTestId("guide-m7-still")).toBeNull();
    expect(row.textContent ?? "").not.toMatch(/Premium|used up|comes back/);
    expect((dialog.textContent ?? "").match(/Premium removes/g)?.length).toBe(1);
    // the dialog's own Close is still the first focus target
    expect(document.activeElement?.hasAttribute("data-dialog-close")).toBe(true);
  });

  it("premium refusal: no Premium line", () => {
    render(<Panel limit={{ tier: "premium", scope: "checks", resetAt: null, window: "week" }} />);
    expect(screen.getByTestId("guide-m7-hit").textContent).toBe("You've reached Premium's week fair-use limit.");
    expect(screen.getByTestId("fair-use-limit-panel").textContent ?? "").not.toMatch(/Premium removes/);
  });

  it("admin 'Show control' preview arm: today's panel exactly — no Byte", async () => {
    __setGuideAbForTests(true, "control");
    render(<Panel limit={TRIAL_PAPER} />);
    expect(screen.getByTestId("fair-use-limit-panel")).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId("guide-moment-m7")).toBeNull());
  });
});

/* ── the entry pages ──────────────────────────────────────────────────────────────────────── */

describe("GUIDE-PAGES-1 · Chapter Test chooser (Practice Hub)", () => {
  it("the '?' sits in the chooser's heading; the first open shows the chooser copy", async () => {
    render(
      <MemoryRouter>
        <ChapterTestPicker open onClose={() => {}} />
      </MemoryRouter>,
    );
    const door = await screen.findByTestId("page-guide-ct_entry");
    expect(door.closest("h2")?.textContent).toContain("Chapter Tests");
    expect(door.getAttribute("data-step")).toBe("chooser");
    await screen.findByTestId("page-guide-pop-ct_entry");
    expect(firstLine()).toBe(ENTRY_COPY.ct_entry.chooser.what);
  });
});

describe("GUIDE-PAGES-1 · Exam Trends", () => {
  it("the '?' sits in the hero's corner; the first visit opens the explainer with every item", async () => {
    render(
      <MemoryRouter initialEntries={["/exam-trends"]}>
        <ExamTrendsRanked />
      </MemoryRouter>,
    );
    const door = await screen.findByTestId("page-guide-trends_help");
    expect(door.closest(".lt-et-hero")).toBeTruthy();
    expect(door.className).toContain("lt-pg-door--corner");
    await screen.findByTestId("page-guide-pop-trends_help");
    expect(firstLine()).toBe(TRENDS_COPY.intro);
    expect(screen.getAllByTestId(/^trends-help-/)).toHaveLength(TRENDS_COPY.items.length);
  });
});

describe("GUIDE-PAGES-1 · Chapter Test / Full Mock / Worksheet entry pages", () => {
  it("Chapter Test per-chapter page: the '?' in the page bar; page copy", async () => {
    render(
      <MemoryRouter initialEntries={["/chapter-test/10/maths/real-numbers"]}>
        <Routes>
          <Route path="/chapter-test/:grade/:subject/:topicKey" element={<ChapterTestPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const door = await screen.findByTestId("page-guide-ct_entry", undefined, { timeout: 30000 });
    expect(door.closest(".lt-ct__pagebar")).toBeTruthy();
    expect(door.getAttribute("data-step")).toBe("page");
    await screen.findByTestId("page-guide-pop-ct_entry");
    expect(firstLine()).toBe(ENTRY_COPY.ct_entry.page.what);
  }, 60000);

  it("Full Mock start page: the '?' in the page bar; Full Mock copy", async () => {
    render(
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const door = await screen.findByTestId("page-guide-fm_entry", undefined, { timeout: 30000 });
    expect(door.closest(".lt-ct__pagebar")).toBeTruthy();
    await screen.findByTestId("page-guide-pop-fm_entry");
    expect(firstLine()).toBe(ENTRY_COPY.fm_entry.page.what);
  }, 60000);

  it("Worksheet builder (/practice/worksheets): the '?' in the title block's reserved corner; worksheet copy", async () => {
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=triangles"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    const door = await screen.findByTestId("page-guide-ws_entry", undefined, { timeout: 30000 });
    expect(door.closest(".lt-ws__headtx--guide")).toBeTruthy();
    await screen.findByTestId("page-guide-pop-ws_entry");
    expect(firstLine()).toBe(ENTRY_COPY.ws_entry.page.what);
  }, 60000);

  it("COMPANION-1's reserved pre-test slot: empty today; a registered moment renders; both pages mount it right above the start row", () => {
    // empty until a moment is registered (the companion module registers its Breathe on import: take it out first)
    registerPreTestMoment(null);
    const v = render(<PreTestSlot surface="chapter_test" />);
    expect(v.container.innerHTML).toBe("");
    v.unmount();
    registerPreTestMoment(({ surface }) => <div data-testid="pretest-breathe" data-surface={surface} />);
    try {
      render(<PreTestSlot surface="full_mock" />);
      expect(screen.getByTestId("pretest-breathe").getAttribute("data-surface")).toBe("full_mock");
    } finally {
      registerPreTestMoment(null);
    }
    // Where it sits (source pins: the start row only exists once a paper is drawn, which is slow under load).
    const src = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");
    expect(src("src/pages/ChapterTestPage.tsx")).toMatch(/<PreTestSlot surface="chapter_test" \/>\s*<div className="lt-ct__startrow">/);
    expect(src("src/pages/FullMockPage.tsx")).toMatch(/<PreTestSlot surface="full_mock" \/>\s*<div className="lt-ct__startrow">/);
  });

  it("control arm: none of the entry pages draws a door", async () => {
    __setGuideAbForTests(true, "control");
    render(
      <MemoryRouter initialEntries={["/full-mock/10/maths"]}>
        <Routes>
          <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const title = await screen.findByText("Full Mock", { selector: ".lt-ct__pagetitle" }, { timeout: 30000 });
    await act(async () => {});
    expect(title.parentElement?.querySelector("[data-testid='page-guide-fm_entry']")).toBeNull();
    expect(screen.queryByTestId("page-guide-fm_entry")).toBeNull();
  }, 60000);
});
