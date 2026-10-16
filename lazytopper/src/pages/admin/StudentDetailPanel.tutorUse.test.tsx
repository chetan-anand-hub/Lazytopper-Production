// TUTOR-FIX-2 T8 — tutor use on the admin student detail.
// Pins: an account whose usage ledger read fine but holds no AI day says "No tutor use yet"
// (never "could not be read"); a real read failure still says "could not be read"; a day with the
// trial tutor counter shows "N tutor messages"; a day without it shows no tutor count (not 0).
// Clock-independent: fixed instants; the panel never reads "now".

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import StudentDetailPanel from "./StudentDetailPanel";

const T0 = Date.parse("2026-11-20T04:30:00.000Z");
const SOURCES = {
  activityLog: { since: "2026-10-02", pr: 893 },
  usageLedger: { since: "2026-09-27", pr: 842 },
  sessionRecords: { since: "2026-07-06", pr: 338 },
  practiceAttempts: { since: "2026-07-01", pr: 321 },
  mockEntries: { since: "2026-07-01", pr: 321 },
};
const READS = { activityLog: "complete", usageLedger: "complete", sessionRecords: "complete", practiceAttempts: "complete", mockEntries: "complete", payments: "complete", subscription: "complete" };
const EMPTY_DAY = { activity: null, ai: null, sessions: [], practice: null, mocks: [], plan: [] };
const AI = { calls: 3, costInr: 0, providerSpendInr: 0.5, checks: 0, chapterTests: 0, mocks: 0, worksheets: 0 };

function detail(timeline: unknown[], reads: Record<string, string> = READS) {
  return {
    ok: true,
    generatedAtMs: T0,
    student: { uid: "stu1", email: "student@example.com", phone: null, createdMs: T0 - 86_400_000, lastSignInMs: T0, signInMethods: ["google"], plan: { kind: "trial", daysLeft: 3, trialEndsAtMs: null } },
    timeline,
    sources: SOURCES,
    reads,
    limits: {},
  };
}

function serve(body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => body })));
  render(<StudentDetailPanel uid="stu1" getToken={async () => "admin-token"} onBack={() => {}} />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StudentDetailPanel — tutor use (TUTOR-FIX-2 T8)", () => {
  it("ledger read fine, no AI day at all -> 'No tutor use yet', no 'could not be read'", async () => {
    serve(detail([{ day: "2026-11-20", dayNumber: 2, ...EMPTY_DAY, plan: [{ kind: "signed-up", atMs: T0 }] }]));
    expect((await screen.findByTestId("sa-no-tutor-use")).textContent).toContain("No tutor use yet");
    expect(screen.queryByText(/usageLedger: could not be read/)).toBeNull();
  });

  it("a real read failure still says 'could not be read' and never 'No tutor use yet'", async () => {
    serve(detail([], { ...READS, usageLedger: "unavailable" }));
    expect(await screen.findByText("usageLedger: could not be read")).toBeTruthy();
    expect(screen.queryByTestId("sa-no-tutor-use")).toBeNull();
  });

  it("tutor messages per day from the ledger day; a day without the counter shows none (not 0)", async () => {
    serve(
      detail([
        { day: "2026-11-19", dayNumber: 1, ...EMPTY_DAY, ai: { ...AI, tutorMessages: 4 } },
        { day: "2026-11-20", dayNumber: 2, ...EMPTY_DAY, ai: { ...AI, tutorMessages: null } },
      ]),
    );
    const d1 = await screen.findByTestId("sa-day-2026-11-19");
    expect(within(d1).getByTestId("sa-tutor-messages").textContent).toContain("4 tutor messages");
    const d2 = screen.getByTestId("sa-day-2026-11-20");
    expect(within(d2).queryByTestId("sa-tutor-messages")).toBeNull();
    expect(screen.queryByTestId("sa-no-tutor-use")).toBeNull();
  });
});
