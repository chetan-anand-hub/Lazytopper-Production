// @vitest-environment jsdom
//
// HOME-PENDING-1 (rework, owner ruling 17 Oct ~07:20) — "Jump straight in" stays removed; a
// compact ACTION STRIP sits at the TOP of Home (desktop + mobile), above the Start-here heroes,
// only when signed in AND >= 1 paper waits. Every "absent" assertion has a CONTROL.

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
// The two other top-of-Home banners as probes, so their order against the strip is assertable.
vi.mock("../cbse/CbseBanner", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", { "data-testid": "cbse-banner-probe" }) };
});
vi.mock("../auth/LinkPhoneNudge", async () => {
  const { createElement } = await import("react");
  return { default: () => createElement("div", { "data-testid": "phone-nudge-probe" }) };
});
const onboarding = vi.hoisted(() => vi.fn());
vi.mock("../../analytics/analytics", async (orig) => ({
  ...(await orig<typeof import("../../analytics/analytics")>()),
  trackOnboardingEvent: onboarding,
}));

import PendingPapersStrip from "./PendingPapersStrip";
import { __resetPendingPapersForTests, QP_LOCAL_KEY_PREFIX, readPendingPapersLocal } from "./pendingPapers";
import { __resetPendingShownForTests } from "./usePendingPapers";
import DesktopHome from "../../pages/desktop/DesktopHome";
import MobileHome from "../../pages/app/MobileHome";
import type { SessionRecord } from "../../services/sessionRecords";
import type { QuickPracticePaperSnapshot } from "../../services/quickPracticePaperStore";

const UID = "student-1";
const T0 = Date.UTC(2026, 9, 15, 6, 30); // 15 Oct 2026, midday IST
const DAY = 24 * 60 * 60 * 1000;
const FOLLOWING = 4; // Node.DOCUMENT_POSITION_FOLLOWING

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
function renderStrip() {
  return render(
    <MemoryRouter>
      <PendingPapersStrip papers={readPendingPapersLocal(UID)} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  authState.user = null;
  onboarding.mockReset();
  __resetPendingPapersForTests();
  __resetPendingShownForTests();
});
afterEach(() => {
  cleanup();
  setMatchMediaMatches(false);
});

describe("PendingPapersStrip — one compact row", () => {
  it("★ count + the newest paper's code and title + 'Upload answers →' to the NEWEST paper's deep link", () => {
    seedRecords([rec({ id: "WS-M-TRI-01", gradedAt: T0 })]);
    seedQp([qpSnap()]); // saved a day later -> newest
    renderStrip();
    expect(screen.getByTestId("pending-strip-count").textContent).toBe("2 papers waiting for your answers");
    expect(screen.getByTestId("pending-strip-newest").textContent).toBe(
      "QP-M-AP-1234abcd · Arithmetic Progressions · Practice set",
    );
    const go = screen.getByTestId("pending-strip-upload");
    expect(go.textContent).toBe("Upload answers →");
    expect(go.getAttribute("href")).toBe(
      "/practice/10/Maths?topic=arithmetic-progressions&review=QP-M-AP-1234abcd&source=home&returnTo=%2F",
    );
  });

  it("singular copy for one paper; the list stays closed until the disclosure is opened", () => {
    seedRecords([rec({})]);
    renderStrip();
    expect(screen.getByTestId("pending-strip-count").textContent).toBe("1 paper waiting for your answers");
    const toggle = screen.getByTestId("pending-strip-toggle");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId("pending-paper-row")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(1);
  });

  it("the expanded list shows max 3, then 'See all (N)' — CONTROL: exactly 3 has no 'See all'", () => {
    seedRecords([1, 2, 3, 4, 5].map((n) => rec({ id: `WS-${n}`, gradedAt: T0 + n })));
    renderStrip();
    fireEvent.click(screen.getByTestId("pending-strip-toggle"));
    expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(3);
    fireEvent.click(screen.getByTestId("pending-papers-see-all"));
    expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(5);
    cleanup();
    seedRecords([1, 2, 3].map((n) => rec({ id: `WS-${n}`, gradedAt: T0 + n })));
    renderStrip();
    fireEvent.click(screen.getByTestId("pending-strip-toggle"));
    expect(screen.getAllByTestId("pending-paper-row")).toHaveLength(3);
    expect(screen.queryByTestId("pending-papers-see-all")).toBeNull();
  });

  it("★ AWAIT-1 (#1218): a DOWNLOADED Chapter Test / Full Mock (pending-upload, 0 of 0 marks) is listed with its deep link", () => {
    seedRecords([
      rec({ id: "CT-M-TRI-03", surface: "chapter-test", title: "Trigonometry · Test #3", marksTotal: 0, gradedAt: T0 + 2 }),
      rec({ id: "FM-S-02", surface: "full-mock", subject: "science", title: "Science · Mock #2", topicKeys: [], marksTotal: 0, gradedAt: T0 + 1 }),
    ]);
    renderStrip();
    fireEvent.click(screen.getByTestId("pending-strip-toggle"));
    const links = screen.getAllByTestId("pending-paper-upload").map((a) => a.getAttribute("href"));
    expect(links).toEqual([
      "/chapter-test/10/Maths/trigonometry?review=CT-M-TRI-03&source=home&returnTo=%2F",
      "/full-mock/10/Science?source=home&returnTo=%2F",
    ]);
  });

  it("renders nothing for an empty list", () => {
    const { container } = render(
      <MemoryRouter>
        <PendingPapersStrip papers={[]} />
      </MemoryRouter>,
    );
    expect(container.textContent).toBe("");
  });

  it("analytics: pending_card_shown {placement:'strip'} once per tab; taps carry surface + placement", () => {
    seedRecords([rec({ id: "CT-M-TRI-02", surface: "chapter-test", status: "partial" })]);
    renderStrip();
    cleanup();
    renderStrip();
    expect(onboarding.mock.calls.filter((c) => c[0] === "pending_card_shown")).toEqual([
      ["pending_card_shown", { count: 1, placement: "strip" }],
    ]);
    fireEvent.click(screen.getByTestId("pending-strip-upload"));
    expect(onboarding).toHaveBeenLastCalledWith("pending_upload_tap", { surface: "chapter_test", placement: "strip" });
    fireEvent.click(screen.getByTestId("pending-strip-toggle"));
    fireEvent.click(screen.getByTestId("pending-paper-upload"));
    expect(onboarding).toHaveBeenLastCalledWith("pending_upload_tap", { surface: "chapter_test", placement: "strip" });
  });
});

describe.each([
  { name: "DesktopHome", el: () => <DesktopHome />, desktop: true, mi: "home-mi-card", hero: "home-hero" },
  { name: "MobileHome", el: () => <MobileHome />, desktop: false, mi: "mobile-home-mistake-panel", hero: "mobile-home-destination" },
] as const)("$name · the strip at the TOP", ({ el, desktop, mi, hero }) => {
  it("★ nothing waiting: no strip, 'Jump straight in' still gone (CONTROL: page rendered, phone nudge + CBSE banner mount as before)", async () => {
    setMatchMediaMatches(desktop);
    signIn();
    seedRecords([rec({ id: "WS-G", status: "graded" })]);
    render(<MemoryRouter>{el()}</MemoryRouter>);
    await screen.findByTestId(mi);
    expect(screen.getAllByTestId(hero).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("pending-strip")).toBeNull();
    expect(screen.queryByText(/Jump straight in/i)).toBeNull();
    expect(screen.queryByTestId("home-quick-tile")).toBeNull();
    expect(screen.queryByTestId("mobile-home-quick-link")).toBeNull();
    expect(screen.getByTestId("cbse-banner-probe")).toBeTruthy();
    expect(screen.getByTestId("phone-nudge-probe")).toBeTruthy();
  });

  it("★ signed OUT never sees it, even with papers on the device (CONTROL: signed in does)", async () => {
    setMatchMediaMatches(desktop);
    seedRecords([rec({})]);
    render(<MemoryRouter>{el()}</MemoryRouter>);
    expect(screen.getAllByTestId(hero).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("pending-strip")).toBeNull();
    cleanup();
    signIn();
    render(<MemoryRouter>{el()}</MemoryRouter>);
    expect(await screen.findByTestId("pending-strip")).toBeTruthy();
  });

  it("★ a pending paper: the strip comes FIRST (before the CBSE banner), ABOVE the heroes and the MI card; no third banner", async () => {
    setMatchMediaMatches(desktop);
    signIn();
    seedRecords([rec({ id: "WS-G", status: "graded" }), rec({ id: "WS-M-TRI-01" })]);
    render(<MemoryRouter>{el()}</MemoryRouter>);
    const strip = await screen.findByTestId("pending-strip");
    const miCard = await screen.findByTestId(mi);
    expect(strip.compareDocumentPosition(screen.getByTestId("cbse-banner-probe")) & FOLLOWING).toBe(FOLLOWING);
    expect(strip.compareDocumentPosition(screen.getAllByTestId(hero)[0]) & FOLLOWING).toBe(FOLLOWING);
    expect(strip.compareDocumentPosition(miCard) & FOLLOWING).toBe(FOLLOWING);
    // never more than these two stacked: the one-time phone nudge waits for a visit without the strip
    expect(screen.queryByTestId("phone-nudge-probe")).toBeNull();
    expect(screen.getAllByTestId("pending-strip")).toHaveLength(1);
  });
});

describe("MobileHome · the strip sits under the greeting", () => {
  it("greeting → strip → CBSE banner → heroes", async () => {
    setMatchMediaMatches(false);
    signIn();
    seedRecords([rec({})]);
    render(<MemoryRouter><MobileHome /></MemoryRouter>);
    const strip = await screen.findByTestId("pending-strip");
    const greeting = screen.getByText("Welcome back");
    expect(greeting.compareDocumentPosition(strip) & FOLLOWING).toBe(FOLLOWING);
    expect(strip.compareDocumentPosition(screen.getByTestId("cbse-banner-probe")) & FOLLOWING).toBe(FOLLOWING);
    await waitFor(() => expect(screen.getAllByTestId("cbse-banner-probe")).toHaveLength(1));
  });
});
