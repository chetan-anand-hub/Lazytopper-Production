// @vitest-environment jsdom
//
// HOME-PENDING-1 — Home's "Waiting for your answers" card replaces "Jump straight in" on desktop
// AND mobile. Every "absent" assertion is paired with a CONTROL in which the thing renders.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMatchMediaMatches } from "../../test/setup";

vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: vi.fn(async (uid?: string | null) => actual.loadLocalSessionRecords(uid)),
    getAllSessionPerQuestionFromCloud: vi.fn(async () => []),
    cloudHasAnySessionRecord: async () => true,
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
vi.mock("../../services/mistakeLogService", () => ({ getMistakeLogs: vi.fn(async () => []) }));
vi.mock("../../services/useMeHomeSummary", () => ({
  useMeHome: () => ({ status: "idle", read: null }),
  useMeConceptRows: () => ({ status: "idle", rows: [] }),
}));
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import PendingPapersCard, { __resetPendingCardShownForTests } from "./PendingPapersCard";
import { __resetPendingPapersForTests, QP_LOCAL_KEY_PREFIX } from "./pendingPapers";
import DesktopHome from "../../pages/desktop/DesktopHome";
import MobileHome from "../../pages/app/MobileHome";
import type { SessionRecord } from "../../services/sessionRecords";
import type { QuickPracticePaperSnapshot } from "../../services/quickPracticePaperStore";

const UID = "student-1";
const T0 = Date.UTC(2026, 9, 15, 6, 30); // 15 Oct 2026, midday IST
const DAY = 24 * 60 * 60 * 1000;

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
function qpSnap(over: Partial<QuickPracticePaperSnapshot> = {}): QuickPracticePaperSnapshot {
  return {
    code: "QP-M-AP-1234abcd",
    worksheetId: "qp-ws-1",
    subject: "Maths",
    persist: {
      title: "Arithmetic Progressions · Practice set",
      subject: "maths",
      topicSlug: "arithmetic-progressions",
      filterSignature: "sig",
      startedAt: T0 - DAY,
    },
    entries: [{ questionId: "b2", marks: 3 } as never],
    pending: [{ questionId: "b2", qNumber: 2, marks: 3, questionText: "Find a10." } as never],
    savedAt: T0 + DAY,
    ...over,
  };
}
function seedRecords(list: SessionRecord[]): void {
  window.localStorage.setItem(`lazytopper.user.${UID}.sessionRecords.v1`, JSON.stringify(list));
}
function seedQp(list: QuickPracticePaperSnapshot[]): void {
  window.localStorage.setItem(QP_LOCAL_KEY_PREFIX + UID, JSON.stringify(list));
}
function signIn() {
  authState.user = { uid: UID, displayName: "Asha Rao", email: "asha@example.com", isLocalSession: false };
}
function renderCard(user = authState.user) {
  return render(
    <MemoryRouter>
      <PendingPapersCard user={user} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  authState.user = null;
  onboarding.mockReset();
  __resetPendingPapersForTests();
  __resetPendingCardShownForTests();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe("PendingPapersCard", () => {
  it("★ hidden when nothing is waiting — CONTROL: one pending worksheet renders it", async () => {
    signIn();
    seedRecords([rec({ id: "WS-G", status: "graded" })]);
    const { container, unmount } = renderCard();
    await waitFor(() => expect(container.querySelector("[data-testid='pending-papers-card']")).toBeNull());
    expect(container.textContent).toBe("");
    unmount();

    seedRecords([rec({ id: "WS-G", status: "graded" }), rec({ id: "WS-M-TRI-01" })]);
    __resetPendingPapersForTests();
    renderCard();
    expect(await screen.findByTestId("pending-papers-card")).toBeTruthy();
    expect(screen.getByText("Waiting for your answers")).toBeTruthy();
  });

  it("★ signed-out and local sessions never see it — CONTROL: the same device data signed in does", async () => {
    seedRecords([rec({})]);
    renderCard(null);
    renderCard({ uid: UID, isLocalSession: true } as never);
    await waitFor(() => expect(screen.queryByTestId("pending-papers-card")).toBeNull());
    cleanup();
    signIn();
    renderCard();
    expect(await screen.findByTestId("pending-papers-card")).toBeTruthy();
  });

  it("★ a pending Worksheet and a QP 'Upload later' set: one row each, code + title + surface + date + Upload link", async () => {
    signIn();
    seedRecords([rec({ id: "WS-M-TRI-01", gradedAt: T0 })]);
    seedQp([qpSnap()]);
    renderCard();
    await waitFor(() => expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(2));
    const rows = screen.getAllByTestId("pending-paper-row");
    // newest first: the QP set was saved a day after the worksheet
    expect(rows.map((r) => r.getAttribute("data-surface"))).toEqual(["quick-practice", "worksheet"]);
    expect(rows[1].textContent).toContain("WS-M-TRI-01");
    expect(rows[1].textContent).toContain("Trigonometry worksheet");
    expect(rows[1].textContent).toContain("Worksheet · Maths · Saved 15 Oct");
    expect(rows[0].textContent).toContain("QP-M-AP-1234abcd");
    expect(rows[0].textContent).toContain("Quick Practice · Maths · Saved 16 Oct");
    const links = screen.getAllByTestId("pending-paper-upload");
    expect(links.map((a) => a.textContent)).toEqual(["Upload answers", "Upload answers"]);
    expect(links[1].getAttribute("href")).toBe("/practice/worksheets?review=WS-M-TRI-01&source=home&returnTo=%2F");
    expect(links[0].getAttribute("href")).toBe(
      "/practice/10/Maths?topic=arithmetic-progressions&review=QP-M-AP-1234abcd&source=home&returnTo=%2F",
    );
  });

  it("Chapter Test / Full Mock awaiting records (submit-time partial or download-time pending) get rows and links", async () => {
    signIn();
    seedRecords([
      rec({ id: "CT-M-TRI-02", surface: "chapter-test", status: "partial", title: "Trigonometry · Test #2", gradedAt: T0 }),
      rec({ id: "FM-S-01", surface: "full-mock", status: "pending-upload", subject: "science", title: "Science · Mock #1", topicKeys: [], gradedAt: T0 - DAY }),
    ]);
    renderCard();
    await waitFor(() => expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(2));
    const [ct, fm] = screen.getAllByTestId("pending-paper-upload");
    expect(ct.getAttribute("href")).toBe("/chapter-test/10/Maths/trigonometry?review=CT-M-TRI-02&source=home&returnTo=%2F");
    expect(fm.getAttribute("href")).toBe("/full-mock/10/Science?source=home&returnTo=%2F");
    expect(screen.getAllByTestId("pending-paper-row")[1].textContent).toContain("Full Mock · Science");
  });

  it("at most 3 rows, then 'See all (N)' opens the rest in place — CONTROL: 3 papers show no 'See all'", async () => {
    signIn();
    seedRecords([1, 2, 3, 4, 5].map((n) => rec({ id: `WS-${n}`, gradedAt: T0 + n })));
    renderCard();
    await waitFor(() => expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(3));
    expect(screen.getByTestId("pending-papers-count").textContent).toBe("5 waiting");
    const all = screen.getByTestId("pending-papers-see-all");
    expect(all.textContent).toBe("See all (5)");
    fireEvent.click(all);
    expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(5);
    cleanup();

    seedRecords([1, 2, 3].map((n) => rec({ id: `WS-${n}`, gradedAt: T0 + n })));
    __resetPendingPapersForTests();
    renderCard();
    await waitFor(() => expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(3));
    expect(screen.queryByTestId("pending-papers-see-all")).toBeNull();
  });

  it("analytics: pending_card_shown ONCE per tab; pending_upload_tap carries the surface only", async () => {
    signIn();
    seedRecords([rec({ id: "CT-M-TRI-02", surface: "chapter-test", status: "partial" })]);
    renderCard();
    await screen.findByTestId("pending-papers-card");
    cleanup();
    renderCard();
    await screen.findByTestId("pending-papers-card");
    expect(onboarding.mock.calls.filter((c) => c[0] === "pending_card_shown")).toEqual([["pending_card_shown", { count: 1 }]]);
    fireEvent.click(screen.getByTestId("pending-paper-upload"));
    expect(onboarding).toHaveBeenLastCalledWith("pending_upload_tap", { surface: "chapter_test" });
  });
});

describe.each([
  { name: "DesktopHome", el: () => <DesktopHome />, desktop: true, mi: "home-mi-card", hero: "home-hero" },
  { name: "MobileHome", el: () => <MobileHome />, desktop: false, mi: "mobile-home-mistake-panel", hero: "mobile-home-destination" },
] as const)("$name · 'Jump straight in' is replaced by the pending card", ({ el, desktop, mi, hero }) => {
  it("★ 'Jump straight in' and its shortcuts are gone (CONTROL: the page rendered — heroes + MI card)", async () => {
    setMatchMediaMatches(desktop);
    signIn();
    seedRecords([rec({ id: "WS-G", status: "graded" })]);
    render(<MemoryRouter>{el()}</MemoryRouter>);
    await screen.findByTestId(mi);
    expect(screen.getAllByTestId(hero).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Jump straight in/i)).toBeNull();
    expect(screen.queryByTestId("home-quick-tile")).toBeNull();
    expect(screen.queryByTestId("mobile-home-quick-link")).toBeNull();
    expect(screen.queryByText(/shortcuts/i)).toBeNull();
    // nothing waiting -> no card either
    expect(screen.queryByTestId("pending-papers-card")).toBeNull();
  });

  it("★ a pending paper puts the card in the old slot: after the heroes and the MI card", async () => {
    setMatchMediaMatches(desktop);
    signIn();
    seedRecords([rec({ id: "WS-G", status: "graded" }), rec({ id: "WS-M-TRI-01" })]);
    seedQp([qpSnap()]);
    render(<MemoryRouter>{el()}</MemoryRouter>);
    const card = await screen.findByTestId("pending-papers-card");
    await waitFor(() => expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(2));
    const miCard = await screen.findByTestId(mi);
    // Node.DOCUMENT_POSITION_FOLLOWING === 4
    expect(screen.getAllByTestId(hero)[0].compareDocumentPosition(card) & 4).toBe(4);
    expect(miCard.compareDocumentPosition(card) & 4).toBe(4);
  });
});
