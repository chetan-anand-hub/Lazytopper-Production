// @vitest-environment jsdom
//
// HOME-PENDING-1 (rework) — the header bell: a badge with the pending count, a small accessible
// popover with the same list, the same read as the Home strip (no extra network read), inert when
// signed out. Mounted in DesktopShell's header and in mobile Home's brand bar.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
const cloud = vi.hoisted(() => ({ sessionReads: 0 }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: vi.fn(async (uid?: string | null) => {
      cloud.sessionReads += 1;
      return actual.loadLocalSessionRecords(uid);
    }),
    getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
    cloudHasAnySessionRecord: async () => true,
  };
});
const qp = vi.hoisted(() => ({ reads: 0 }));
vi.mock("../../services/quickPracticePaperStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/quickPracticePaperStore")>();
  return {
    ...actual,
    listQuickPracticePapers: vi.fn(async () => {
      qp.reads += 1;
      return [];
    }),
  };
});
const authState = vi.hoisted(() => ({
  user: null as null | { uid: string; displayName?: string | null; email?: string; isLocalSession?: boolean },
  logout: vi.fn(async () => {}),
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user, logout: authState.logout }),
}));
vi.mock("../../hooks/useSubscription", () => ({
  useSubscription: () => ({ tier: "free", isTrialActive: false, isPremium: false, isTrialExpired: false, daysLeftInTrial: 0 }),
}));
vi.mock("../desktop/MistakeIntelCard", () => ({ MistakeIntelCard: () => null }));
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import PendingBell from "./PendingBell";
import PendingPapersStrip from "./PendingPapersStrip";
import { usePendingPapers, __resetPendingShownForTests } from "./usePendingPapers";
import { __resetPendingPapersForTests } from "./pendingPapers";
import { PENDING_CSS } from "./pendingPapersUi";
import { DesktopShell } from "../desktop/DesktopShell";
import MobileHome from "../../pages/app/MobileHome";
import type { SessionRecord } from "../../services/sessionRecords";

const UID = "student-1";
const USER = { uid: UID, isLocalSession: false };
const T0 = Date.UTC(2026, 9, 15, 6, 30);

function rec(over: Partial<SessionRecord>): SessionRecord {
  return {
    id: "WS-M-TRI-01",
    worksheetId: "ws-1",
    surface: "worksheet",
    title: "Trigonometry worksheet",
    subject: "maths",
    topicKeys: ["trigonometry"],
    questionIds: ["q1"],
    marksAwarded: 0,
    marksTotal: 10,
    status: "pending-upload",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: T0,
    perQuestionRef: "ref",
    dedupKey: "k",
    ...over,
  };
}
function seedRecords(list: SessionRecord[]): void {
  window.localStorage.setItem(`lazytopper.user.${UID}.sessionRecords.v1`, JSON.stringify(list));
}
function renderBell(user: { uid: string; isLocalSession?: boolean } | null = USER) {
  return render(
    <MemoryRouter>
      <PendingBell user={user} />
      <button type="button">outside</button>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  authState.user = null;
  cloud.sessionReads = 0;
  qp.reads = 0;
  onboarding.mockReset();
  __resetPendingPapersForTests();
  __resetPendingShownForTests();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe("PendingBell", () => {
  it("★ badge = the pending count — CONTROL: no badge when nothing is waiting", async () => {
    seedRecords([rec({ id: "WS-1" }), rec({ id: "CT-M-TRI-02", surface: "chapter-test", status: "partial" })]);
    renderBell();
    expect((await screen.findByTestId("pending-bell-badge")).textContent).toBe("2");
    expect(screen.getByTestId("pending-bell").getAttribute("aria-label")).toBe(
      "Notifications: 2 papers waiting for your answers",
    );
    cleanup();
    seedRecords([rec({ id: "WS-G", status: "graded" })]);
    __resetPendingPapersForTests();
    renderBell();
    await waitFor(() => expect(cloud.sessionReads).toBeGreaterThan(0));
    expect(screen.getByTestId("pending-bell")).toBeTruthy();
    expect(screen.queryByTestId("pending-bell-badge")).toBeNull();
  });

  it("★ opens a popover listing the same items (aria-expanded); Escape closes it and returns focus to the bell", async () => {
    seedRecords([rec({ id: "WS-1" })]);
    renderBell();
    const bell = await screen.findByTestId("pending-bell");
    expect(bell.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(bell);
    expect(bell.getAttribute("aria-expanded")).toBe("true");
    const pop = screen.getByTestId("pending-bell-popover");
    expect(pop.getAttribute("id")).toBe(bell.getAttribute("aria-controls"));
    expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(1);
    expect(screen.getByTestId("pending-paper-upload").getAttribute("href")).toBe(
      "/practice/worksheets?review=WS-1&source=home&returnTo=%2F",
    );
    screen.getByTestId("pending-paper-upload").focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("pending-bell-popover")).toBeNull();
    expect(document.activeElement).toBe(bell);
    expect(bell.getAttribute("aria-expanded")).toBe("false");
  });

  it("an outside click closes the popover; tapping Upload closes it too", async () => {
    seedRecords([rec({ id: "WS-1" })]);
    renderBell();
    fireEvent.click(await screen.findByTestId("pending-bell"));
    fireEvent.mouseDown(screen.getByText("outside"));
    expect(screen.queryByTestId("pending-bell-popover")).toBeNull();
    fireEvent.click(screen.getByTestId("pending-bell"));
    fireEvent.click(screen.getByTestId("pending-paper-upload"));
    expect(screen.queryByTestId("pending-bell-popover")).toBeNull();
    expect(onboarding).toHaveBeenLastCalledWith("pending_upload_tap", { surface: "worksheet", placement: "bell" });
  });

  it("★ focus leaving the bell + popover closes it — CONTROL: focus moving inside it does not", async () => {
    seedRecords([rec({ id: "WS-1" })]);
    renderBell();
    const bell = await screen.findByTestId("pending-bell");
    fireEvent.click(bell);
    const link = screen.getByTestId("pending-paper-upload");
    fireEvent.blur(bell, { relatedTarget: link });
    expect(screen.getByTestId("pending-bell-popover")).toBeTruthy();
    fireEvent.blur(link, { relatedTarget: screen.getByText("outside") });
    expect(screen.queryByTestId("pending-bell-popover")).toBeNull();
  });

  it("★ 390 / 360 px: below 480 px the popover is pinned to the viewport (fixed, 12 px gutters, scrolls)", () => {
    const m = PENDING_CSS.match(/@media \(max-width: 480px\) \{([\s\S]*)\}\s*$/);
    expect(m).not.toBeNull();
    const rule = (m![1].match(/\.lt-pbell-pop \{([^}]*)\}/) ?? [])[1] ?? "";
    expect(rule).toContain("position: fixed");
    expect(rule).toContain("left: 12px");
    expect(rule).toContain("right: 12px");
    expect(rule).toContain("max-height:");
    expect(rule).toContain("overflow-y: auto");
    // CONTROL: the wide-screen rule is the anchored, absolutely placed popover
    expect(PENDING_CSS).toMatch(/\.lt-pbell-pop \{ position: absolute;/);
  });

  it("★ an account switch never shows the previous account's papers, not even for a frame", async () => {
    seedRecords([rec({ id: "WS-A" })]);
    const seen: string[][] = [];
    function Probe({ uid }: { uid: string }) {
      const { papers } = usePendingPapers({ uid, isLocalSession: false });
      seen.push(papers.map((p) => p.code));
      return null;
    }
    const view = render(<Probe uid={UID} />);
    await waitFor(() => expect(cloud.sessionReads).toBe(1));
    await waitFor(() => expect(seen[seen.length - 1]).toEqual(["WS-A"]));
    seen.length = 0;
    view.rerender(<Probe uid="student-2" />);
    expect(seen.length).toBeGreaterThan(0);
    for (const frame of seen) expect(frame).not.toContain("WS-A");
  });

  it("signed in with nothing waiting: the popover says so honestly (no invented items)", async () => {
    renderBell();
    fireEvent.click(await screen.findByTestId("pending-bell"));
    expect(screen.getByTestId("pending-bell-empty").textContent).toBe("No papers are waiting for your answers.");
    expect(screen.queryByTestId("pending-paper-row")).toBeNull();
  });

  it("★ signed OUT: inert-but-harmless — no badge, no popover, no read (CONTROL: the button renders)", async () => {
    seedRecords([rec({})]);
    renderBell(null);
    const bell = screen.getByTestId("pending-bell");
    expect(bell.getAttribute("aria-expanded")).toBeNull();
    fireEvent.click(bell);
    expect(screen.queryByTestId("pending-bell-popover")).toBeNull();
    expect(screen.queryByTestId("pending-bell-badge")).toBeNull();
    expect(cloud.sessionReads + qp.reads).toBe(0);
  });

  it("analytics: pending_card_shown {placement:'bell'} once per tab, when the popover opens with items", async () => {
    seedRecords([rec({ id: "WS-1" })]);
    renderBell();
    const bell = await screen.findByTestId("pending-bell");
    await screen.findByTestId("pending-bell-badge");
    expect(onboarding.mock.calls.filter((c) => c[0] === "pending_card_shown")).toEqual([]);
    fireEvent.click(bell);
    fireEvent.click(bell);
    fireEvent.click(bell);
    expect(onboarding.mock.calls.filter((c) => c[0] === "pending_card_shown")).toEqual([
      ["pending_card_shown", { count: 1, placement: "bell" }],
    ]);
  });

  it("★ the strip and the bell share ONE read: both mounted -> one cloud read of each store", async () => {
    seedRecords([rec({ id: "WS-1" })]);
    function Page() {
      const { papers } = usePendingPapers(USER);
      return (
        <>
          <PendingBell user={USER} />
          <PendingPapersStrip papers={papers} />
        </>
      );
    }
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );
    await screen.findByTestId("pending-strip");
    await screen.findByTestId("pending-bell-badge");
    await waitFor(() => expect(cloud.sessionReads).toBe(1));
    expect(qp.reads).toBe(1);
  });
});

describe("where the bell is mounted", () => {
  it("★ DesktopShell's header bell carries the badge and opens the popover (signed in)", async () => {
    authState.user = { uid: UID, displayName: "Asha Rao", email: "asha@example.com", isLocalSession: false };
    seedRecords([rec({ id: "WS-1" })]);
    render(
      <MemoryRouter>
        <DesktopShell>
          <div>page</div>
        </DesktopShell>
      </MemoryRouter>,
    );
    const bells = screen.getAllByTestId("pending-bell");
    expect(bells).toHaveLength(1);
    expect(bells[0].closest("header")).not.toBeNull();
    expect((await screen.findByTestId("pending-bell-badge")).textContent).toBe("1");
    fireEvent.click(bells[0]);
    expect(screen.getByTestId("pending-bell-popover")).toBeTruthy();
  });

  it("DesktopShell signed out: the bell is still there, inert, with no badge", () => {
    render(
      <MemoryRouter>
        <DesktopShell>
          <div>page</div>
        </DesktopShell>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("pending-bell").getAttribute("title")).toBe("Notifications");
    expect(screen.queryByTestId("pending-bell-badge")).toBeNull();
  });

  it("★ mobile Home's brand bar carries the bell with the badge (signed in)", async () => {
    setMatchMediaMatches(false);
    authState.user = { uid: UID, displayName: "Asha Rao", email: "asha@example.com", isLocalSession: false };
    seedRecords([rec({ id: "WS-1" })]);
    render(
      <MemoryRouter>
        <MobileHome />
      </MemoryRouter>,
    );
    const bell = screen.getByTestId("pending-bell");
    expect(bell.closest("header")).not.toBeNull();
    expect((await screen.findByTestId("pending-bell-badge")).textContent).toBe("1");
  });
});
