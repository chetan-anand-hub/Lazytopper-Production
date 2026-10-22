// COST-1 — per-student AI cost + the AI spend summary on /admin/students (the browser half).
//
// Pins: the list's "AI cost (30 days, INR)" column shows 2 decimals and "—" (never ₹0.00) for
// a missing or unreadable ledger; the summary card fetches NOTHING until the admin presses
// "Load AI cost", then shows total / students / average / median / top 10 / plan split / the
// read count, and says signed-out spend is not recorded; a non-admin sees no card; the student
// detail lists per-day cost for the last 30 days, says the ledger has no per-feature breakdown,
// and names the Firestore code when the ledger could not be read.
//
// Clock-independent: every timestamp is a fixed instant and nothing here reads "now".

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import StudentsAdminPage from "./StudentsAdminPage";
import StudentDetailPanel from "./StudentDetailPanel";
import { AI_COST_NOTE, formatCostInr, formatDayKey, maskEmail, rowCostCell } from "./studentsAdminModel";

const getToken = vi.fn<() => Promise<string | null>>();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ getToken: () => getToken() }),
}));

const SOURCES = {
  activityLog: { since: "2026-10-02", pr: 893 },
  usageLedger: { since: "2026-09-27", pr: 842 },
  sessionRecords: { since: "2026-07-06", pr: 338 },
  practiceAttempts: { since: "2026-07-01", pr: 321 },
  mockEntries: { since: "2026-07-01", pr: 321 },
};
const NOW = Date.parse("2026-11-20T09:30:00.000Z"); // 20 Nov 2026, 15:00 IST
const CREATED = Date.parse("2026-10-05T04:30:00.000Z");

function row(uid: string, aiCost?: Record<string, unknown>) {
  return {
    uid,
    email: `${uid}@example.com`,
    phone: null,
    emailVerified: true,
    disabled: false,
    signInMethods: ["google"],
    createdMs: CREATED,
    lastSignInMs: CREATED,
    plan: { kind: "basic" },
    activity: { source: "activityLog", coverage: "full", daysActive: 3, lastActiveMs: CREATED + 86400000 },
    answerChecks: { source: "sessionRecords", coverage: "full", count: 2 },
    testsTaken: { source: "sessionRecords", coverage: "full", count: 1 },
    ...(aiCost ? { aiCost } : {}),
  };
}
const cost = (costInr: number | null, extra: Record<string, unknown> = {}) => ({
  source: "usageLedger",
  days: 30,
  coverage: "full",
  costInr,
  readFailed: false,
  ...extra,
});

function listBody(rows: unknown[]) {
  return {
    ok: true,
    generatedAtMs: NOW,
    period: "all",
    plan: "all",
    page: 1,
    pageSize: 50,
    total: rows.length,
    totalPages: 1,
    rows,
    sources: SOURCES,
    limits: { authUsersScanned: rows.length, authTruncated: false, planScanTruncated: false, maxPlanScan: 1000, ledgerDayReads: 30 * rows.length },
  };
}

const SUMMARY = {
  ok: true,
  generatedAtMs: NOW,
  period: "all",
  signUps: 2,
  studentsMeasured: 2,
  trialStarts: { count: 1, unknown: 0, source: "subscriptions" },
  activeStudents: { count: 1, unknown: 0, source: "activityLog", since: "2026-10-02" },
  returnedDay2: { returned: 1, eligible: 1, unknown: 0, source: "activityLog", since: "2026-10-02" },
  returnedWithin7Days: { returned: 0, eligible: 0, unknown: 0, source: "activityLog", since: "2026-10-02" },
  sources: SOURCES,
  limits: { authUsersScanned: 2, authTruncated: false, summaryTruncated: false, maxSummaryStudents: 500 },
};

const AI_COST = {
  ok: true,
  generatedAtMs: NOW,
  period: "all",
  window: { from: "2026-10-22", to: "2026-11-20", capped: true, maxDays: 30 },
  totalInr: 12.5,
  studentsWithCost: 3,
  averageInr: 4.17,
  medianInr: 3.5,
  top: [
    { uid: "topA", email: "topa@example.com", phone: null, plan: { kind: "premium", premiumUntilMs: null }, costInr: 7 },
    { uid: "topB", email: "topb@example.com", phone: null, plan: { kind: "trial", trialEndsAtMs: null, daysLeft: null }, costInr: 3.5 },
    { uid: "topC", email: null, phone: "+919876543210", plan: { kind: "basic" }, costInr: 2 },
  ],
  byPlan: {
    trial: { costInr: 3.5, studentsWithCost: 1 },
    premium: { costInr: 7, studentsWithCost: 1 },
    basic: { costInr: 2, studentsWithCost: 1 },
    unknown: { costInr: 0, studentsWithCost: 0 },
  },
  signedOut: { ledgered: false },
  studentsScanned: 40,
  studentsUnknown: 1,
  studentsPartialCoverage: 0,
  reads: { subscriptions: 40, ledgerDays: 812, total: 852 },
  readErrors: { usageLedger: "unavailable" },
  limits: { authUsersScanned: 40, authTruncated: false, studentsTruncated: false, maxStudents: 500, maxDays: 30 },
};

function detailBody(extra: Record<string, unknown> = {}) {
  const ai = (calls: number, costInr: number, providerSpendInr: number | null) => ({ calls, costInr, providerSpendInr, checks: 0, chapterTests: 0, mocks: 0, worksheets: 0 });
  const day = (d: string, a: unknown) => ({ day: d, dayNumber: null, activity: null, ai: a, sessions: [], practice: null, mocks: [], plan: [] });
  return {
    ok: true,
    generatedAtMs: NOW,
    student: { ...row("stu1"), activity: undefined },
    timeline: [day("2026-10-01", ai(9, 9, null)), day("2026-11-18", ai(2, 0.5, null)), day("2026-11-20", ai(3, 1.234, 2))],
    sources: SOURCES,
    reads: { activityLog: "complete", usageLedger: "complete", sessionRecords: "complete", practiceAttempts: "complete", mockEntries: "complete", payments: "complete", subscription: "complete" },
    limits: {},
    aiCost30d: { source: "usageLedger", days: 30, from: "2026-10-22", to: "2026-11-20", coverage: "full", costInr: 1.73, gradingFullCostInr: 2, calls: 5, readFailed: false, breakdown: "not-recorded" },
    readErrors: {},
    ...extra,
  };
}

type Route = (url: string) => { status: number; body: unknown };
let routeFn: Route;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const r = routeFn(url);
  void init;
  return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body } as Response;
});
const urls = () => fetchMock.mock.calls.map(([u]) => String(u));

beforeEach(() => {
  getToken.mockReset();
  getToken.mockResolvedValue("admin-token");
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pageRoutes(rows: unknown[], detail: unknown = detailBody()): Route {
  return (url) => {
    if (url.includes("/summary")) return { status: 200, body: SUMMARY };
    if (url.includes("/ai-cost")) return { status: 200, body: AI_COST };
    if (url.startsWith("/api/admin/students/")) return { status: 200, body: detail };
    return { status: 200, body: listBody(rows) };
  };
}

describe("COST-1 · list column 'AI cost (30 days, INR)'", () => {
  it("★ 2 decimals; a missing ledger, an unreadable ledger and an old server all show '—', never ₹0.00; a recorded 0 is ₹0.00", async () => {
    routeFn = pageRoutes([
      row("stu1", cost(1.234)),
      row("stu2", cost(null)),
      row("stu3", cost(null, { readFailed: true })),
      row("stu4"),
      row("stu5", cost(0)),
    ]);
    render(<StudentsAdminPage />);
    const cells = await screen.findAllByTestId("sa-ai-cost");
    expect(screen.getByRole("columnheader", { name: "AI cost (30 days, INR)" })).toBeTruthy();
    expect(cells.map((c) => c.textContent)).toEqual(["₹1.23", "—Not recorded", "—Could not be read", "—Not recorded", "₹0.00"]);
    expect(screen.getByTestId("sa-cost-note").textContent).toContain(AI_COST_NOTE);
  });

  it("rowCostCell: partial coverage carries its 'since' date", () => {
    expect(rowCostCell(cost(2, { coverage: "partial" }) as never, "2026-09-27")).toEqual({ text: "₹2.00", note: `since ${formatDayKey("2026-09-27")}` });
  });
});

describe("COST-1 · AI cost summary card", () => {
  it("★ fetches nothing until 'Load AI cost' is pressed, then shows every number from the server", async () => {
    routeFn = pageRoutes([row("stu1", cost(1))]);
    render(<StudentsAdminPage />);
    const card = await screen.findByTestId("ai-cost-summary");
    await new Promise((r) => setTimeout(r, 30));
    expect(urls().some((u) => u.includes("/ai-cost"))).toBe(false);
    expect(within(card).getByTestId("ai-cost-note").textContent).toContain(AI_COST_NOTE);

    fireEvent.click(within(card).getByTestId("ai-cost-load"));
    expect(await within(card).findByTestId("ai-cost-total")).toBeTruthy();
    expect(urls()).toContain("/api/admin/students/ai-cost?period=all");
    expect(within(card).getByTestId("ai-cost-total").textContent).toBe("₹12.50");
    expect(within(card).getByTestId("ai-cost-students").textContent).toBe("3");
    expect(within(card).getByTestId("ai-cost-average").textContent).toBe("₹4.17");
    expect(within(card).getByTestId("ai-cost-median").textContent).toBe("₹3.50");

    const top = within(card).getByTestId("ai-cost-top");
    const items = within(top).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain(maskEmail("topa@example.com"));
    expect(items[0].textContent).toContain("₹7.00");
    expect(top.textContent).not.toContain("topa@example.com"); // masked, like the list

    const plans = within(card).getByTestId("ai-cost-by-plan");
    expect(within(plans).getByText("Premium")).toBeTruthy();
    expect(within(plans).queryByText("Plan could not be read")).toBeNull(); // no unknown-plan spend
    expect(within(card).getByTestId("ai-cost-signed-out").textContent).toBe("— (not recorded in the ledger)");
    expect(within(card).getByTestId("ai-cost-reads").textContent).toMatch(/read 852 Firestore documents \(40 plan records \+ 812 ledger days\)/);
    expect(within(card).getByTestId("ai-cost-unknown").textContent).toMatch(/1 student's ledger could not be read \(unavailable\)/);
    expect(within(card).getByText(/capped to the last 30 days/)).toBeTruthy();
  });

  it("once loaded it follows the period; a top student opens their detail", async () => {
    routeFn = pageRoutes([row("stu1", cost(1))]);
    render(<StudentsAdminPage />);
    const card = await screen.findByTestId("ai-cost-summary");
    fireEvent.click(within(card).getByTestId("ai-cost-load"));
    await within(card).findByTestId("ai-cost-total");
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "7" } });
    await waitFor(() => expect(urls()).toContain("/api/admin/students/ai-cost?period=7"));
    const top = await within(await screen.findByTestId("ai-cost-summary")).findByTestId("ai-cost-top");
    fireEvent.click(within(top).getAllByRole("button")[0]);
    await waitFor(() => expect(urls()).toContain("/api/admin/students/topA"));
    // Back to the list: the loaded summary is shown again WITHOUT re-reading the ledger.
    fireEvent.click(await screen.findByRole("button", { name: "← All students" }));
    expect(await within(await screen.findByTestId("ai-cost-summary")).findByTestId("ai-cost-total")).toBeTruthy();
    expect(urls().filter((u) => u === "/api/admin/students/ai-cost?period=7")).toHaveLength(1);
  });

  it("a failed summary says so (never ₹0)", async () => {
    const base = pageRoutes([row("stu1", cost(1))]);
    routeFn = (url) => (url.includes("/ai-cost") ? { status: 500, body: { ok: false } } : base(url));
    render(<StudentsAdminPage />);
    const card = await screen.findByTestId("ai-cost-summary");
    fireEvent.click(within(card).getByTestId("ai-cost-load"));
    expect(await within(card).findByTestId("ai-cost-failed")).toBeTruthy();
    expect(card.textContent).not.toContain("₹0.00");
  });

  it("★ a null total and null plan costs (nothing could be read / recorded) render '—', never ₹0.00", async () => {
    const empty = {
      ...AI_COST,
      totalInr: null,
      studentsWithCost: 0,
      averageInr: null,
      medianInr: null,
      top: [],
      byPlan: {
        trial: { costInr: null, studentsWithCost: 0 },
        premium: { costInr: null, studentsWithCost: 0 },
        basic: { costInr: null, studentsWithCost: 0 },
        unknown: { costInr: null, studentsWithCost: 0 },
      },
    };
    const base = pageRoutes([row("stu1", cost(1))]);
    routeFn = (url) => (url.includes("/ai-cost") ? { status: 200, body: empty } : base(url));
    render(<StudentsAdminPage />);
    const card = await screen.findByTestId("ai-cost-summary");
    fireEvent.click(within(card).getByTestId("ai-cost-load"));
    expect((await within(card).findByTestId("ai-cost-total")).textContent).toBe("—");
    const plans = within(card).getByTestId("ai-cost-by-plan");
    expect(within(plans).getAllByRole("row").slice(1, 4).map((r) => r.lastElementChild?.textContent)).toEqual(["—", "—", "—"]);
    expect(card.textContent).not.toContain("₹0.00");
    expect(within(card).getByTestId("ai-cost-top-empty")).toBeTruthy();
  });

  it("a non-admin (403) never sees the card", async () => {
    routeFn = () => ({ status: 403, body: { ok: false, error: "Forbidden: not an admin uid" } });
    render(<StudentsAdminPage />);
    expect(await screen.findByTestId("sa-not-authorised")).toBeTruthy();
    expect(screen.queryByTestId("ai-cost-summary")).toBeNull();
  });
});

describe("COST-1 · student detail — AI cost per day, last 30 days", () => {
  function renderDetail(body: unknown) {
    routeFn = () => ({ status: 200, body });
    render(<StudentDetailPanel uid="stu1" getToken={() => Promise.resolve("admin-token")} onBack={() => {}} />);
  }

  it("★ newest day first, only days inside the 30-day window, total in the heading, no per-feature breakdown claimed", async () => {
    renderDetail(detailBody());
    const table = await screen.findByTestId("sa-ai-cost-table");
    expect(within(table).getByTestId("sa-ai-cost-total").textContent).toContain(formatCostInr(1.73));
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.getAttribute("data-testid"))).toEqual(["sa-ai-cost-2026-11-20", "sa-ai-cost-2026-11-18"]); // 1 Oct is outside
    expect(rows[0].textContent).toContain("₹1.23");
    expect(rows[0].textContent).toContain("₹2.00");
    expect(rows[1].textContent).toContain("—"); // grading full cost not recorded that day
    expect(table.textContent).toMatch(/does not record cost per feature/);
    expect(table.textContent).toContain(AI_COST_NOTE);
  });

  it("no ledger day in the window -> an honest empty line, never ₹0.00", async () => {
    renderDetail(detailBody({ timeline: [], aiCost30d: { ...detailBody().aiCost30d, costInr: null, gradingFullCostInr: null, calls: 0 } }));
    const table = await screen.findByTestId("sa-ai-cost-table");
    expect(within(table).getByTestId("sa-ai-cost-none")).toBeTruthy();
    expect(within(table).getByTestId("sa-ai-cost-total").textContent).toContain("—");
    expect(table.textContent).not.toContain("₹0.00");
  });

  it("★ an unreadable ledger names its Firestore code and shows no cost", async () => {
    renderDetail(
      detailBody({
        reads: { ...detailBody().reads, usageLedger: "unavailable" },
        readErrors: { usageLedger: "permission-denied" },
        timeline: [],
        aiCost30d: { ...detailBody().aiCost30d, costInr: null, readFailed: true },
      }),
    );
    expect(await screen.findByText("usageLedger: could not be read (Firestore: permission-denied)")).toBeTruthy();
    const table = screen.getByTestId("sa-ai-cost-table");
    expect(within(table).getByTestId("sa-ai-cost-unreadable")).toBeTruthy();
    expect(within(table).queryByTestId("sa-ai-cost-total")).toBeNull();
  });
});
