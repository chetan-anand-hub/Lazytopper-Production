// PREVIEW-1 — the "Guide preview (this browser)" panel on /admin/students.
//
// Shown ONLY once the admin API answered OK (the server's ADMIN_FIREBASE_UIDS gate); never on
// 401 / 403 / 503 or a failed load. Off / Show Byte / Show control write or remove the ONE
// device key `lazytopper.guidePreview`, and the panel says what is set and until when.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import StudentsAdminPage, { GUIDE_AB_ENDED_LABEL, GUIDE_PREVIEW_HELP } from "./StudentsAdminPage";
import { formatIstDateTime } from "./studentsAdminModel";
import { GUIDE_PREVIEW_KEY, GUIDE_PREVIEW_MS } from "../../components/guide/guideVariant";

const getToken = vi.fn<() => Promise<string | null>>();
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ getToken: () => getToken() }),
}));

const NOW = 1_792_400_000_000; // a fixed instant (the panel's "now")

const LIST = {
  ok: true,
  generatedAtMs: NOW,
  period: "all",
  plan: "all",
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
  rows: [],
  sources: {
    activityLog: { since: "2026-10-02", pr: 893 },
    usageLedger: { since: "2026-09-27", pr: 842 },
    sessionRecords: { since: "2026-07-06", pr: 338 },
    practiceAttempts: { since: "2026-07-01", pr: 321 },
    mockEntries: { since: "2026-07-01", pr: 321 },
  },
  limits: { authUsersScanned: 0, authTruncated: false, planScanTruncated: false, maxPlanScan: 1000 },
};

const SUMMARY = {
  ok: true,
  generatedAtMs: NOW,
  period: "all",
  signUps: 0,
  studentsMeasured: 0,
  trialStarts: { count: 0, unknown: 0, source: "subscriptions" },
  activeStudents: { count: 0, unknown: 0, source: "activityLog", since: "2026-10-02" },
  returnedDay2: { returned: 0, eligible: 0, unknown: 0, source: "activityLog", since: "2026-10-02" },
  returnedWithin7Days: { returned: 0, eligible: 0, unknown: 0, source: "activityLog", since: "2026-10-02" },
  sources: LIST.sources,
  limits: { authUsersScanned: 0, authTruncated: false, summaryTruncated: false, maxSummaryStudents: 500 },
};

let status = 200;
const fetchMock = vi.fn(async (url: string) => {
  const s = status;
  // Only the list + summary bodies matter here; any other admin call (grader health) fails soft.
  const body = s !== 200 ? { ok: false } : url.includes("/summary") ? SUMMARY : url.startsWith("/api/admin/students") ? LIST : { ok: false };
  return { status: s, ok: s >= 200 && s < 300, json: async () => body } as Response;
});

beforeEach(() => {
  getToken.mockReset().mockResolvedValue("admin-token");
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(Date, "now").mockReturnValue(NOW);
  window.localStorage.clear();
  status = 200;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PREVIEW-1 · who sees the panel", () => {
  for (const s of [401, 403, 503, 500]) {
    it(`★★ a ${s} from the admin API: NO panel`, async () => {
      status = s;
      render(<StudentsAdminPage />);
      // wait for the refusal to land
      await screen.findByText(/Not authorised|not configured|could not be loaded/);
      expect(screen.queryByTestId("guide-preview")).toBeNull();
    });
  }

  it("★★ no ID token (never calls the API): NO panel", async () => {
    getToken.mockResolvedValue(null);
    render(<StudentsAdminPage />);
    await screen.findByTestId("sa-not-authorised");
    expect(screen.queryByTestId("guide-preview")).toBeNull();
  });

  it("★★ while loading: NO panel; once the admin API answered OK: the panel, Off by default", async () => {
    render(<StudentsAdminPage />);
    expect(screen.queryByTestId("guide-preview")).toBeNull();
    const panel = await screen.findByTestId("guide-preview");
    expect(panel.textContent).toContain("Guide preview (this browser)");
    expect(panel.textContent).toContain(GUIDE_PREVIEW_HELP);
    expect(GUIDE_PREVIEW_HELP).toBe("Applies to any account signed in on this browser for 7 days. Students never see this.");
    expect(screen.getByTestId("guide-preview-off").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("guide-preview-state").textContent).toContain("off");
  });

  it("★★ GUIDE-ALL-1: the panel says the A/B ended (22 Oct 2026) and that every student is on the guide", async () => {
    render(<StudentsAdminPage />);
    await screen.findByTestId("guide-preview");
    expect(GUIDE_AB_ENDED_LABEL).toBe("A/B ended 22 Oct 2026 — all students on guide");
    expect(screen.getByTestId("guide-ab-ended").textContent).toBe(GUIDE_AB_ENDED_LABEL);
    expect(screen.getByTestId("guide-preview-state").textContent).toContain("sees Byte, like every student");
    // the preview can still force control
    expect(screen.getByTestId("guide-preview-control")).toBeTruthy();
  });
});

describe("PREVIEW-1 · the three choices", () => {
  it("★★ Show Byte / Show control write { arm, until: now + 7 days } and show the expiry; Off removes the key", async () => {
    render(<StudentsAdminPage />);
    await screen.findByTestId("guide-preview");
    const until = NOW + GUIDE_PREVIEW_MS;

    fireEvent.click(screen.getByTestId("guide-preview-guide"));
    expect(JSON.parse(window.localStorage.getItem(GUIDE_PREVIEW_KEY)!)).toEqual({ arm: "guide", until });
    expect(screen.getByTestId("guide-preview-guide").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("guide-preview-state").textContent).toBe(
      `Now: showing Byte on this browser until ${formatIstDateTime(until)}.`,
    );

    fireEvent.click(screen.getByTestId("guide-preview-control"));
    expect(JSON.parse(window.localStorage.getItem(GUIDE_PREVIEW_KEY)!)).toEqual({ arm: "control", until });
    expect(screen.getByTestId("guide-preview-state").textContent).toContain("showing control");

    fireEvent.click(screen.getByTestId("guide-preview-off"));
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
    expect(screen.getByTestId("guide-preview-off").getAttribute("aria-checked")).toBe("true");
  });

  it("★ the panel reads what is already set on this browser; an expired value reads as Off and is removed", async () => {
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "control", until: NOW + 1000 }));
    render(<StudentsAdminPage />);
    await screen.findByTestId("guide-preview");
    expect(screen.getByTestId("guide-preview-control").getAttribute("aria-checked")).toBe("true");
    cleanup();
    window.localStorage.setItem(GUIDE_PREVIEW_KEY, JSON.stringify({ arm: "control", until: NOW - 1 }));
    render(<StudentsAdminPage />);
    await screen.findByTestId("guide-preview");
    expect(screen.getByTestId("guide-preview-off").getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(GUIDE_PREVIEW_KEY)).toBeNull();
  });

  it("the panel makes NO server call of its own (only the page's existing admin calls)", async () => {
    render(<StudentsAdminPage />);
    await screen.findByTestId("guide-preview");
    const before = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByTestId("guide-preview-guide"));
    fireEvent.click(screen.getByTestId("guide-preview-off"));
    expect(fetchMock.mock.calls.length).toBe(before);
  });
});
