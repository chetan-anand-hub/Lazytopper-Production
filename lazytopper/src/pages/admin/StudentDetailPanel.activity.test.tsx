// ACTIVITY-DETAIL-1 F3 — the admin detail's "Pages visited" table and "Activity" feed.
//
// Drives StudentDetailPanel with a fake fetch returning the admin API's shape. Pins: both
// views render per day in plain words with IST clock times; the feed is in time order;
// "Pages visited" is most-visits first; a day recorded before this change (no pages / no
// feed — the B-7 shape) shows "— (not recorded)", never "none"; a truncated day says so.
//
// Clock-independent: every timestamp is a fixed instant; the panel never reads "now".

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import StudentDetailPanel from "./StudentDetailPanel";
import { activityEventLabel, feedItemLabel, orderedFeed, pageLabel, pageRows } from "./activityDetailModel";
import { ACTIVITY_PAGE_KEYS } from "../../services/activityPages";
import { ACTIVITY_EVENTS } from "../../services/activityClient";

// 2026-11-20 10:00:00 IST
const T0 = Date.parse("2026-11-20T04:30:00.000Z");
const SOURCES = {
  activityLog: { since: "2026-10-02", pr: 893 },
  usageLedger: { since: "2026-09-27", pr: 842 },
  sessionRecords: { since: "2026-07-06", pr: 338 },
  practiceAttempts: { since: "2026-07-01", pr: 321 },
  mockEntries: { since: "2026-07-01", pr: 321 },
};
const EMPTY_DAY = { ai: null, sessions: [], practice: null, mocks: [], plan: [] };

function detail() {
  return {
    ok: true,
    generatedAtMs: T0 + 86_400_000,
    student: {
      uid: "stu1",
      email: "student@example.com",
      phone: null,
      createdMs: T0 - 2 * 86_400_000,
      lastSignInMs: T0,
      signInMethods: ["google"],
      plan: { kind: "trial", daysLeft: 3, trialEndsAtMs: null },
    },
    timeline: [
      {
        day: "2026-11-19",
        dayNumber: 2,
        ...EMPTY_DAY,
        // A B-7-shaped day: no pages, no feed (the API returns null for both).
        activity: { firstSeenMs: T0 - 86_400_000, lastSeenMs: T0 - 86_000_000, sections: { home: 1 }, events: {}, pages: null, feed: null, feedTruncated: false },
      },
      {
        day: "2026-11-20",
        dayNumber: 3,
        ...EMPTY_DAY,
        activity: {
          firstSeenMs: T0,
          lastSeenMs: T0 + 600_000,
          sections: { notes: 3, "check-improve": 1 },
          events: { check_graded: 1 },
          pages: { "check-improve": 1, "notes~trigonometry": 3 },
          // Stored out of time order on purpose: the view must sort by time.
          feed: [
            { t: T0 + 120_000, k: "page", n: "check-improve" },
            { t: T0, k: "page", n: "notes~trigonometry" },
            { t: T0 + 180_000, k: "event", n: "check_graded" },
          ],
          feedTruncated: true,
        },
      },
    ],
    sources: SOURCES,
    reads: { activityLog: "complete", usageLedger: "complete", sessionRecords: "complete", practiceAttempts: "complete", mockEntries: "complete", payments: "complete", subscription: "complete" },
    limits: {},
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => detail() })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StudentDetailPanel — Pages visited + Activity (F3)", () => {
  it("★ renders both views for a recorded day: pages most-visits first, feed in time order with IST clock times and plain words", async () => {
    render(<StudentDetailPanel uid="stu1" getToken={async () => "admin-token"} onBack={() => {}} />);
    const day = await screen.findByTestId("sa-day-2026-11-20");
    expect(within(day).getByText("Pages visited")).toBeTruthy();
    expect(within(day).getByText("Activity")).toBeTruthy();

    const rows = within(within(day).getByTestId("sa-pages")).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual(["Notes → Trigonometry3", "Check & Improve1"]);

    const items = within(within(day).getByTestId("sa-feed")).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      "10:00 amOpened Notes → Trigonometry",
      "10:02 amOpened Check & Improve",
      "10:03 amChecked an answer",
    ]);
    expect(within(day).getByText(/Only the first 3 entries of this day are listed/)).toBeTruthy();
  });

  it("★★ OLD SHAPE: a day recorded before pages/feed existed shows '— (not recorded)' for both, never 'none' or an empty table", async () => {
    render(<StudentDetailPanel uid="stu1" getToken={async () => "admin-token"} onBack={() => {}} />);
    const day = await screen.findByTestId("sa-day-2026-11-19");
    expect(within(day).getAllByText("— (not recorded)")).toHaveLength(2);
    expect(within(day).queryByTestId("sa-pages")).toBeNull();
    expect(within(day).queryByTestId("sa-feed")).toBeNull();
    expect(within(day).getByText("home ×1")).toBeTruthy(); // the B-7 rows are unchanged
  });

  it("an older server (no pages/feed fields at all) is treated as not recorded too", async () => {
    const d = detail();
    const a = d.timeline[1].activity as Record<string, unknown>;
    delete a.pages;
    delete a.feed;
    delete a.feedTruncated;
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => d })));
    render(<StudentDetailPanel uid="stu1" getToken={async () => "admin-token"} onBack={() => {}} />);
    const day = await screen.findByTestId("sa-day-2026-11-20");
    expect(within(day).getAllByText("— (not recorded)")).toHaveLength(2);
  });
});

describe("activityDetailModel — labels", () => {
  it("every allowlisted page key and every event has a plain-words label (none falls back to the raw key)", () => {
    for (const k of ACTIVITY_PAGE_KEYS) {
      const label = pageLabel(k);
      expect(label).not.toContain("~");
      expect(label).not.toBe(k.replace(/~/g, "/"));
    }
    for (const e of ACTIVITY_EVENTS) expect(activityEventLabel(e)).not.toBe(e);
  });

  it("the owner's examples read exactly", () => {
    expect(feedItemLabel({ t: 0, k: "page", n: "notes~trigonometry" })).toBe("Opened Notes → Trigonometry");
    expect(feedItemLabel({ t: 0, k: "event", n: "check_graded" })).toBe("Checked an answer");
    expect(pageLabel("topic-hub~electricity")).toBe("Topic Hub → Electricity");
    expect(pageLabel("practice~maths")).toBe("Quick practice → Maths");
  });

  it("orderedFeed is a stable time sort; pageRows is most-visits first", () => {
    const f = [
      { t: 5, k: "page" as const, n: "home" },
      { t: 1, k: "page" as const, n: "pricing" },
      { t: 5, k: "event" as const, n: "check_graded" },
    ];
    expect(orderedFeed(f).map((e) => e.n)).toEqual(["pricing", "home", "check_graded"]);
    expect(pageRows({ home: 1, pricing: 4, me: 0 }).map((r) => r.key)).toEqual(["pricing", "home"]);
  });
});
