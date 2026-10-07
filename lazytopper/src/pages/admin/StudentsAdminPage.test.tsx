// STUDENT-ACTIVITY-1 PR-2 — the admin "Students" page (the browser half).
//
// The page holds no student data: it renders what the admin-gated API returns. These tests
// drive it with a fake fetch and pin: a non-admin (401/403) sees "Not authorised" and NO
// student data; the list renders masked emails with a per-row reveal, IST times and
// honest coverage labels ("—", never 0, for a pre-coverage student); filters refetch; an
// empty filter result says so; a row click opens the merged timeline.
//
// Clock-independent: every timestamp in the fixtures is a fixed instant, and nothing in
// the page reads "now".

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import StudentsAdminPage from "./StudentsAdminPage";
import { coveredCount, formatInr, formatIstDateTime, maskEmail, maskPhone } from "./studentsAdminModel";

const getToken = vi.fn<() => Promise<string | null>>();
// ★ A NEW getToken IDENTITY ON EVERY RENDER, on purpose: the page must not refetch in a
// loop when the auth context hands out a fresh function (found by the screenshot harness).
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

const CREATED = Date.parse("2026-10-05T04:30:00.000Z"); // 10:00 IST

function row(uid: string, extra: Record<string, unknown> = {}) {
  return {
    uid,
    email: `${uid}@example.com`,
    phone: null,
    emailVerified: true,
    disabled: false,
    signInMethods: ["google"],
    createdMs: CREATED,
    lastSignInMs: CREATED,
    plan: { kind: "trial", trialEndsAtMs: CREATED + 7 * 86400000, daysLeft: 4 },
    activity: { source: "activityLog", coverage: "full", daysActive: 3, lastActiveMs: CREATED + 86400000 },
    answerChecks: { source: "sessionRecords", coverage: "full", count: 2 },
    testsTaken: { source: "sessionRecords", coverage: "full", count: 1 },
    ...extra,
  };
}

function listBody(rows: unknown[]) {
  return {
    ok: true,
    generatedAtMs: CREATED,
    period: "all",
    plan: "all",
    page: 1,
    pageSize: 50,
    total: rows.length,
    totalPages: 1,
    rows,
    sources: SOURCES,
    limits: { authUsersScanned: rows.length, authTruncated: false, planScanTruncated: false, maxPlanScan: 1000 },
  };
}

const SUMMARY = {
  ok: true,
  generatedAtMs: CREATED,
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

const DETAIL = {
  ok: true,
  generatedAtMs: CREATED,
  student: { ...row("stu1"), activity: undefined },
  timeline: [
    {
      day: "2026-10-05",
      dayNumber: 1,
      activity: null,
      ai: null,
      sessions: [],
      practice: null,
      mocks: [],
      plan: [{ kind: "signed-up", atMs: CREATED }, { kind: "trial-started", atMs: CREATED + 1000 }],
    },
    {
      day: "2026-10-06",
      dayNumber: 2,
      activity: { firstSeenMs: CREATED + 86400000, lastSeenMs: CREATED + 90000000, sections: { "check-improve": 3 }, events: { check_graded: 1 } },
      ai: { calls: 4, costInr: 1.23, checks: 1, chapterTests: 0, mocks: 0, worksheets: 0 },
      sessions: [{ surface: "chapter-test", subject: "science", topics: ["electricity"], marksAwarded: 7, marksTotal: 10, status: "graded", atMs: CREATED + 86400000 }],
      practice: { attempts: 2, correct: 1, marksScored: 3, marksAvailable: 4 },
      mocks: [{ subject: "Maths", totalMarks: 52, maxMarks: 80, percent: 65, atMs: CREATED + 86400000 }],
      plan: [],
    },
  ],
  sources: SOURCES,
  reads: { activityLog: "complete", usageLedger: "complete", sessionRecords: "complete", practiceAttempts: "complete", mockEntries: "complete", payments: "complete", subscription: "complete" },
  limits: {},
};

type Route = (url: string) => { status: number; body: unknown };
let routeFn: Route;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  const r = routeFn(url);
  void init;
  return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body } as Response;
});

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

describe("StudentsAdminPage — non-admin sees nothing", () => {
  for (const status of [401, 403]) {
    it(`a ${status} from the API renders "Not authorised" and no student data`, async () => {
      routeFn = () => ({ status, body: { ok: false, error: "Forbidden: not an admin uid" } });
      const { container } = render(<StudentsAdminPage />);
      expect(await screen.findByTestId("sa-not-authorised")).toBeTruthy();
      expect(screen.getByText("Not authorised")).toBeTruthy();
      expect(screen.queryByTestId("sa-row")).toBeNull();
      expect(screen.queryByTestId("sa-summary")).toBeNull();
      expect(container.textContent).not.toMatch(/@example\.com|Students/);
    });
  }

  it("with no ID token it never calls the API and shows Not authorised", async () => {
    getToken.mockResolvedValue(null);
    routeFn = () => ({ status: 200, body: listBody([row("stu1")]) });
    render(<StudentsAdminPage />);
    expect(await screen.findByTestId("sa-not-authorised")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("every request carries the Bearer token and goes only to the admin API — exactly one list + one summary call", async () => {
    routeFn = (url) => ({ status: 200, body: url.includes("/summary") ? SUMMARY : listBody([row("stu1")]) });
    render(<StudentsAdminPage />);
    await screen.findAllByTestId("sa-row");
    await screen.findByTestId("sa-summary");
    await new Promise((r) => setTimeout(r, 50));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/^\/api\/admin\/students/);
      expect((init as RequestInit).headers).toEqual({ Authorization: "Bearer admin-token" });
    }
  });
});

describe("StudentsAdminPage — list", () => {
  it("renders masked email with a per-row reveal, IST sign-up time, plan and counts", async () => {
    routeFn = (url) => ({ status: 200, body: url.includes("/summary") ? SUMMARY : listBody([row("stu1"), row("stu2")]) });
    render(<StudentsAdminPage />);
    const rows = await screen.findAllByTestId("sa-row");
    expect(rows).toHaveLength(2);
    const first = within(rows[0]);
    expect(first.queryByText("stu1@example.com")).toBeNull();
    expect(first.getByText(maskEmail("stu1@example.com"))).toBeTruthy();
    fireEvent.click(first.getByRole("button", { name: "Reveal email" }));
    expect(first.getByText("stu1@example.com")).toBeTruthy();
    // Reveal is per row: the second row stays masked.
    expect(within(rows[1]).queryByText("stu2@example.com")).toBeNull();
    expect(first.getByText(formatIstDateTime(CREATED))).toBeTruthy();
    expect(formatIstDateTime(CREATED)).toMatch(/IST$/);
    expect(formatIstDateTime(CREATED)).toMatch(/10:00/);
    expect(first.getByText("Trial · 4 days left")).toBeTruthy();
    expect(first.getByText("Google")).toBeTruthy();
    // Summary cards
    const cards = await screen.findByTestId("sa-summary");
    expect(within(cards).getByText("Active students")).toBeTruthy();
    expect(within(cards).getAllByText(/2 Oct 2026/).length).toBeGreaterThan(0);
  });

  it("★ HONEST DATA: a pre-coverage student shows '—' with 'No data before 2 Oct 2026', never 0", async () => {
    const vet = row("vet1", {
      createdMs: Date.parse("2026-06-01T05:00:00Z"),
      activity: { source: "activityLog", coverage: "partial", daysActive: 0, lastActiveMs: null },
      answerChecks: { source: "sessionRecords", coverage: "partial", count: 0 },
      testsTaken: { source: "sessionRecords", coverage: "partial", count: 2 },
    });
    routeFn = (url) => ({ status: 200, body: url.includes("/summary") ? SUMMARY : listBody([vet]) });
    render(<StudentsAdminPage />);
    const [r] = await screen.findAllByTestId("sa-row");
    const cells = r.querySelectorAll("td");
    expect(cells[4].textContent).toBe("—No data before 2 Oct 2026");
    expect(cells[5].textContent).toBe("—No data before 6 Jul 2026");
    expect(cells[6].textContent).toBe("2since 6 Jul 2026");
    expect(cells[7].textContent).toBe("— (no data before 2 Oct 2026)");
    expect(coveredCount(0, "full", "2026-10-02").text).toBe("0"); // a FULL-coverage zero is a real zero
  });

  it("filters refetch with period and plan; an empty result says so", async () => {
    routeFn = (url) => {
      if (url.includes("/summary")) return { status: 200, body: SUMMARY };
      if (url.includes("plan=premium")) return { status: 200, body: listBody([]) };
      return { status: 200, body: listBody([row("stu1")]) };
    };
    render(<StudentsAdminPage />);
    await screen.findAllByTestId("sa-row");
    fireEvent.change(screen.getByLabelText("Signed up"), { target: { value: "7" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes("period=7&plan=all&page=1"))).toBe(true));
    expect(fetchMock.mock.calls.some(([u]) => String(u) === "/api/admin/students/summary?period=7")).toBe(true);
    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "premium" } });
    expect(await screen.findByTestId("sa-empty")).toBeTruthy();
    expect(screen.getByText("No students match these filters.")).toBeTruthy();
  });

  it("503 says the admin allowlist is not configured", async () => {
    routeFn = () => ({ status: 503, body: { ok: false, error: "Admin endpoints disabled" } });
    render(<StudentsAdminPage />);
    expect(await screen.findByText(/not configured on the server/)).toBeTruthy();
    expect(screen.queryByTestId("sa-row")).toBeNull();
  });
});

describe("StudentsAdminPage — detail", () => {
  it("a row click opens the merged day-by-day timeline", async () => {
    routeFn = (url) => {
      if (url.includes("/summary")) return { status: 200, body: SUMMARY };
      if (url === "/api/admin/students/stu1") return { status: 200, body: DETAIL };
      return { status: 200, body: listBody([row("stu1")]) };
    };
    render(<StudentsAdminPage />);
    const [r] = await screen.findAllByTestId("sa-row");
    fireEvent.click(r);
    const day2 = await screen.findByTestId("sa-day-2026-10-06");
    expect(within(day2).getByText("Day 2")).toBeTruthy();
    expect(within(day2).getByText("check-improve ×3")).toBeTruthy();
    expect(within(day2).getByText("check_graded ×1")).toBeTruthy();
    // HARDEN-1 PR-2: the meter is now labelled; this fixture day has no spend field -> "not recorded".
    expect(day2.textContent).toMatch(/4 AI calls · usage meter \(graded\) ₹1\.23 · actual AI spend not recorded/);
    expect(day2.textContent).toMatch(/Chapter test · science · 7\/10/);
    // GA-33 (SCORECARD-MI-1) — the label says exactly what is counted: graded answers from
    // every surface, and "full marks" rather than a vaguer "fully correct".
    expect(day2.textContent).toMatch(/2 graded answers \(all surfaces\) · 3\/4 marks · 1 full marks/);
    expect(day2.textContent).toMatch(/Maths 52\/80 \(65%\)/);
    const day1 = screen.getByTestId("sa-day-2026-10-05");
    expect(day1.textContent).toMatch(/Signed up/);
    expect(day1.textContent).toMatch(/Trial started/);
    expect(screen.getByText(/Plan history is not stored/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "← All students" }));
    expect(await screen.findAllByTestId("sa-row")).toHaveLength(1);
  });
});

describe("studentsAdminModel helpers", () => {
  it("masks email and phone", () => {
    expect(maskEmail("priya.sharma@gmail.com")).toBe("pr••••••••@gmail.com");
    expect(maskEmail("ab@x.com")).toBe("a•••@x.com");
    expect(maskPhone("+919876543210")).toBe("+91•••••••210");
    expect(maskEmail(null)).toBe("—");
  });
});

/* ── HARDEN-1 PR-2 · the read-only Grader health card + the two spend numbers ── */

const GH_URL = "/api/admin/token-telemetry?view=grader-health";

function ghWindow(over: Record<string, unknown> = {}) {
  return {
    records: 4,
    questions: 9,
    gradesByModel: { "gemini-3.8-flash": 3, "gemini-2.5-flash": 1 },
    notCompleted: {
      timeout: { count: 1, charged: 0 },
      unreadable: { count: 2, charged: 0 },
      error: { count: 0, charged: 0 },
      interrupted: { count: 0, charged: 0 },
    },
    answerMismatches: 1,
    ...over,
  };
}

function ghBody(records: unknown) {
  return {
    ok: true,
    view: "grader-health",
    generatedAtMs: CREATED,
    timeZone: "Asia/Kolkata",
    todayKey: "2026-10-05",
    windowStartKey: "2026-09-29",
    windowDays: 7,
    models: { configured: "gemini-3.8-flash", fallback: "gemini-2.5-flash" },
    records,
    counters: { uptimeSeconds: 7260, gradingModelFallback: 5, signInRefreshDenials: 2 },
  };
}

const GH_RECORDS = {
  available: true,
  today: ghWindow({ gradesByModel: { "gemini-3.8-flash": 1 }, answerMismatches: 0 }),
  last7Days: ghWindow(),
  oldestRecordMs: CREATED - 86400000,
  studentsInWindow: 3,
  studentsScanned: 3,
  studentsTruncated: false,
  studentsWithRecordsTruncated: 0,
  perStudentLimit: 100,
  readsFailed: 0,
  authTruncated: false,
};

function ghRoute(card: { status: number; body: unknown }): Route {
  return (url) => {
    if (url === GH_URL) return card;
    if (url.includes("/summary")) return { status: 200, body: SUMMARY };
    return { status: 200, body: listBody([row("stu1")]) };
  };
}

async function openCard() {
  render(<StudentsAdminPage />);
  await screen.findAllByTestId("sa-row");
  const card = screen.getByTestId("grader-health");
  // Read-only and on request: nothing was fetched for the card before the click.
  expect(fetchMock.mock.calls.some(([u]) => String(u) === GH_URL)).toBe(false);
  fireEvent.click(within(card).getByRole("button", { name: "Load grader health" }));
  return card;
}

describe("StudentsAdminPage — Grader health card (HARDEN-1 PR-2)", () => {
  it("★ loads on request with the Bearer token, states IST day boundaries, and shows today / 7 days by model", async () => {
    routeFn = ghRoute({ status: 200, body: ghBody(GH_RECORDS) });
    const card = await openCard();
    await within(card).findByTestId("gh-table");
    const ghCall = fetchMock.mock.calls.find(([u]) => String(u) === GH_URL)!;
    expect((ghCall[1] as RequestInit).headers).toEqual({ Authorization: "Bearer admin-token" });
    expect(card.textContent).toMatch(/Day boundaries are IST \(midnight Asia\/Kolkata\)/);
    const configured = within(card).getByTestId("gh-model-gemini-3.8-flash");
    expect(configured.textContent).toMatch(/configured grading model/);
    expect([...configured.querySelectorAll("td")].slice(1).map((td) => td.textContent)).toEqual(["1", "3"]);
    const fallback = within(card).getByTestId("gh-model-gemini-2.5-flash");
    expect(fallback.textContent).toMatch(/fallback/);
    expect([...fallback.querySelectorAll("td")].slice(1).map((td) => td.textContent)).toEqual(["0", "1"]);
    expect(within(card).getByTestId("gh-mismatch").textContent).toMatch(/Answer–question mismatches01$/);
    const counters = within(card).getByTestId("gh-counters");
    expect(counters.textContent).toMatch(/grading\.model_fallback5/);
    expect(counters.textContent).toMatch(/Sign-in refresh denials2/);
    expect(card.textContent).toMatch(/since the server last started \(2 h 1 min ago\)/);
    // Read-only: the card's only control is the load / refresh button.
    expect(within(card).getAllByRole("button").map((b) => b.textContent)).toEqual(["Refresh"]);
  });

  it("★ every grades-not-completed row (timeout / couldn't read / error / interrupted) carries charged: 0", async () => {
    routeFn = ghRoute({ status: 200, body: ghBody(GH_RECORDS) });
    const card = await openCard();
    await within(card).findByTestId("gh-table");
    for (const [reason, label, today, week] of [
      ["timeout", "Timed out", "1", "1"],
      ["unreadable", "Couldn't read", "2", "2"],
      ["error", "Error", "0", "0"],
      ["interrupted", "Interrupted", "0", "0"],
    ]) {
      const tr = within(card).getByTestId(`gh-not-completed-${reason}`);
      expect(tr.textContent).toContain(`Not completed: ${label}`);
      expect(tr.textContent).toContain("charged: 0");
      expect([...tr.querySelectorAll("td")].slice(1).map((td) => td.textContent)).toEqual([today, week]);
    }
  });

  it("★ a non-admin (403) on the card sees 'Not authorised.' and no numbers", async () => {
    routeFn = ghRoute({ status: 403, body: { ok: false, error: "Forbidden: not an admin uid" } });
    const card = await openCard();
    expect(await within(card).findByTestId("gh-refused")).toBeTruthy();
    expect(card.textContent).toMatch(/Not authorised\./);
    expect(within(card).queryByTestId("gh-table")).toBeNull();
    expect(within(card).queryByTestId("gh-counters")).toBeNull();
  });

  it("honest empty states: no stored records -> 'No data yet'; unreadable records -> says so, never zeros in a table", async () => {
    routeFn = ghRoute({ status: 200, body: ghBody({ ...GH_RECORDS, today: ghWindow({ records: 0, gradesByModel: {} }), last7Days: ghWindow({ records: 0, gradesByModel: {} }), oldestRecordMs: null }) });
    let card = await openCard();
    expect((await within(card).findByTestId("gh-empty")).textContent).toMatch(/No data yet/);
    expect(within(card).queryByTestId("gh-table")).toBeNull();
    cleanup();
    fetchMock.mockClear();
    routeFn = ghRoute({ status: 200, body: ghBody({ available: false }) });
    card = await openCard();
    expect((await within(card).findByTestId("gh-records-unavailable")).textContent).toMatch(/could not be read/);
    expect(within(card).queryByTestId("gh-table")).toBeNull();
  });

  it("states an undercount when a read limit was hit", async () => {
    routeFn = ghRoute({ status: 200, body: ghBody({ ...GH_RECORDS, studentsTruncated: true, studentsInWindow: 900, studentsScanned: 500, readsFailed: 2 }) });
    const card = await openCard();
    const limits = await within(card).findByTestId("gh-limits");
    expect(limits.textContent).toMatch(/only 500 of 900 active students were read/);
    expect(limits.textContent).toMatch(/2 students' records could not be read/);
  });
});

describe("StudentDetailPanel — usage meter (graded) vs actual AI spend (FU-A17-ADMIN-SPEND-FIELD)", () => {
  async function openDay(ai: Record<string, unknown>) {
    const detail = { ...DETAIL, timeline: [{ ...DETAIL.timeline[1], ai }] };
    routeFn = (url) => {
      if (url.includes("/summary")) return { status: 200, body: SUMMARY };
      if (url === "/api/admin/students/stu1") return { status: 200, body: detail };
      return { status: 200, body: listBody([row("stu1")]) };
    };
    render(<StudentsAdminPage />);
    const [r] = await screen.findAllByTestId("sa-row");
    fireEvent.click(r);
    return screen.findByTestId("sa-day-2026-10-06");
  }

  it("★ two labelled numbers, ₹ with 2 dp, never swapped", async () => {
    const day = await openDay({ calls: 4, costInr: 1.2, providerSpendInr: 4.56, checks: 0, chapterTests: 0, mocks: 0, worksheets: 0 });
    expect(within(day).getByTestId("sa-usage-meter").textContent).toBe(" · usage meter (graded) ₹1.20");
    expect(within(day).getByTestId("sa-actual-spend").textContent).toBe(" · actual AI spend ₹4.56");
  });

  it("★ a pre-#957 day shows 'not recorded' for actual AI spend — never ₹0.00 and never the meter's value", async () => {
    const day = await openDay({ calls: 4, costInr: 1.23, providerSpendInr: null, checks: 0, chapterTests: 0, mocks: 0, worksheets: 0 });
    expect(within(day).getByTestId("sa-actual-spend").textContent).toBe(" · actual AI spend not recorded");
    expect(within(day).getByTestId("sa-usage-meter").textContent).toBe(" · usage meter (graded) ₹1.23");
    expect(formatInr(undefined)).toBe("not recorded");
    expect(formatInr(0)).toBe("₹0.00"); // a recorded zero is a real zero
  });
});
