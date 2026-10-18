// TRIAL-END-1 — the banner as a student meets it: only an ACTIVE, HYDRATED trial on days 5-7,
// real counts, the zero state, once-per-IST-day dismissal, and the analytics events.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string; isLocalSession?: boolean } | null }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));

vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn(), activateTrial: vi.fn() };
});
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: vi.fn() };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackTrialBannerShown: vi.fn(), trackTrialBannerClick: vi.fn() };
});

import { TrialEndBannerView, TRIAL_BANNER_HIDDEN_KEY_PREFIX, useTrialEndBanner } from "./TrialEndBanner";
import * as svc from "../../services/subscriptionService";
import * as records from "../../services/sessionRecords";
import * as analytics from "../../analytics/analytics";
import type { SubscriptionStatus } from "../../services/subscriptionService";
import type { SessionRecord } from "../../services/sessionRecords";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const activate = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;
const readRecords = records.getSessionRecordsFromCloud as unknown as ReturnType<typeof vi.fn>;
const trackShown = analytics.trackTrialBannerShown as unknown as ReturnType<typeof vi.fn>;
const trackClick = analytics.trackTrialBannerClick as unknown as ReturnType<typeof vi.fn>;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ist = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 5.5 * HOUR;
// Trial started Mon 1 Jun 2026 10:00 am IST -> ends Mon 8 Jun 10:00 am IST.
const START = ist(2026, 6, 1, 10, 0);
const trial = (startMs = START): SubscriptionStatus => ({
  tier: "trial",
  plan: "trial_7day",
  trialStartDate: new Date(startMs).toISOString(),
  trialEndDate: null,
  premiumSince: null,
});

function Harness() {
  const model = useTrialEndBanner();
  return <TrialEndBannerView model={model} />;
}
function renderBanner() {
  return render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  );
}
function setNow(ms: number) {
  vi.setSystemTime(ms);
}
const rec = (id: string, surface: SessionRecord["surface"], gradedAt: number) =>
  ({ id, surface, gradedAt, status: "graded" }) as SessionRecord;
const shownDays = () => trackShown.mock.calls.map(([day]) => day);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  localStorage.clear();
  sessionStorage.clear();
  auth.user = { uid: "u1" };
  hydrate.mockReset();
  readRecords.mockReset();
  readRecords.mockResolvedValue([]);
  trackShown.mockClear();
  trackClick.mockClear();
  activate.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TrialEndBanner — who sees it", () => {
  it("day 6 of an active trial: headline with the real end, real counts, See plans", async () => {
    setNow(ist(2026, 6, 6, 12));
    hydrate.mockResolvedValue(trial());
    readRecords.mockResolvedValue([rec("a", "check-improve", START + HOUR), rec("b", "worksheet", START + 2 * HOUR)]);
    renderBanner();
    expect(await screen.findByTestId("trial-end-banner-headline")).toHaveTextContent(
      "Your Premium trial ends in 2 days, on Mon 8 Jun at 10:00 am.",
    );
    expect(screen.getByTestId("trial-end-banner-activity")).toHaveTextContent("In your trial so far: 1 answer check · 1 test taken.");
    const plans = screen.getByRole("link", { name: "See plans" });
    expect(plans).toHaveAttribute("href", "/pricing");
    expect(screen.queryByRole("link", { name: "Check an answer" })).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull(); // nothing pre-ticked, nothing to tick
    expect(activate).not.toHaveBeenCalled(); // never starts or touches a trial
  });

  it("zero activity: says so and offers Check an answer", async () => {
    setNow(ist(2026, 6, 7, 9));
    hydrate.mockResolvedValue(trial());
    renderBanner();
    expect(await screen.findByTestId("trial-end-banner-activity")).toHaveTextContent(
      "You haven't checked an answer yet. Check one before your trial ends.",
    );
    expect(screen.getByTestId("trial-end-banner-headline")).toHaveTextContent("Your Premium trial ends tomorrow at 10:00 am.");
    const check = screen.getByRole("link", { name: "Check an answer" });
    expect(check).toHaveAttribute("href", "/check-improve");
    fireEvent.click(check);
    expect(trackClick).toHaveBeenCalledWith("check");
  });

  it.each([
    ["day 4 (too early)", trial(), ist(2026, 6, 4, 12)],
    ["an ended trial", trial(), ist(2026, 6, 9, 12)],
    ["premium", { ...trial(), tier: "premium", plan: "pass_month" } as SubscriptionStatus, ist(2026, 6, 6, 12)],
    // Review nit 5: a premium pass bought DURING the trial, on a banner day — paid, so no banner.
    ["premium bought mid-trial (on a banner day)", { ...trial(), tier: "premium", plan: "pass_till_boards", premiumSince: new Date(START + 3 * DAY).toISOString(), passEnd: new Date(START + 200 * DAY).toISOString() } as SubscriptionStatus, ist(2026, 6, 7, 9)],
    // Review nit 5: an EXPIRED trial as the record stores it (free + trial_7day + an old start).
    ["an expired trial (free + trial_7day, start 10 days ago)", { tier: "free", plan: "trial_7day", trialStartDate: new Date(START).toISOString(), trialEndDate: null, premiumSince: null } as SubscriptionStatus, ist(2026, 6, 11, 12)],
    ["free", { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null } as SubscriptionStatus, ist(2026, 6, 6, 12)],
    // ADMIN-EXTEND-1 (#1249): an extension is stored as tier premium + plan pass_extension + passEnd,
    // with the trial start KEPT. On a banner day it is premium -> no "your trial ends" banner.
    ["an admin extension (pass_extension, running)", { tier: "premium", plan: "pass_extension", trialStartDate: new Date(START).toISOString(), trialEndDate: null, premiumSince: null, passEnd: new Date(START + 14 * DAY).toISOString() } as SubscriptionStatus, ist(2026, 6, 7, 9)],
    // ...and once that extension's passEnd has passed it is free (not a trial) -> still nothing.
    ["an admin extension that has ended", { tier: "premium", plan: "pass_extension", trialStartDate: new Date(START).toISOString(), trialEndDate: null, premiumSince: null, passEnd: new Date(START + 5 * DAY).toISOString() } as SubscriptionStatus, ist(2026, 6, 7, 9)],
  ])("says nothing for %s", async (_label, status, now) => {
    setNow(now);
    hydrate.mockResolvedValue(status);
    renderBanner();
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("trial-end-banner")).toBeNull();
  });

  it("says nothing before the cloud subscription has hydrated (a stale cache can never raise it)", async () => {
    setNow(ist(2026, 6, 6, 12));
    localStorage.setItem("lazytopper.subscription.v1:u1", JSON.stringify(trial()));
    hydrate.mockReturnValue(new Promise(() => {})); // never resolves
    renderBanner();
    await act(async () => {});
    expect(screen.queryByTestId("trial-end-banner")).toBeNull();
  });

  it("says nothing signed out or in a local session", async () => {
    setNow(ist(2026, 6, 6, 12));
    hydrate.mockResolvedValue(trial());
    auth.user = { uid: "local", isLocalSession: true };
    renderBanner();
    await act(async () => {});
    expect(screen.queryByTestId("trial-end-banner")).toBeNull();
    cleanup();
    auth.user = null;
    renderBanner();
    await act(async () => {});
    expect(screen.queryByTestId("trial-end-banner")).toBeNull();
  });
});

describe("TrialEndBanner — once-per-IST-day dismissal and analytics", () => {
  it("Not today hides it for the rest of that IST day; it returns after IST midnight", async () => {
    setNow(ist(2026, 6, 6, 23, 0));
    hydrate.mockResolvedValue(trial());
    renderBanner();
    fireEvent.click(await screen.findByRole("button", { name: "Hide until tomorrow" }));
    expect(screen.queryByTestId("trial-end-banner")).toBeNull();
    expect(localStorage.getItem(`${TRIAL_BANNER_HIDDEN_KEY_PREFIX}u1`)).toBe("2026-06-06");

    // Same IST day, later (11:59 pm IST): still hidden.
    cleanup();
    setNow(ist(2026, 6, 6, 23, 59));
    renderBanner();
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByTestId("trial-end-banner")).toBeNull();

    // 12:00 am IST next day — a new IST day (still 6 Jun in UTC): back, with tomorrow's wording.
    cleanup();
    setNow(ist(2026, 6, 7, 0, 0));
    renderBanner();
    expect(await screen.findByTestId("trial-end-banner-headline")).toHaveTextContent("ends tomorrow at 10:00 am");
  });

  it("dismissal is per student: another uid on the same device still sees it", async () => {
    setNow(ist(2026, 6, 6, 12));
    localStorage.setItem(`${TRIAL_BANNER_HIDDEN_KEY_PREFIX}someone-else`, "2026-06-06");
    hydrate.mockResolvedValue(trial());
    renderBanner();
    expect(await screen.findByTestId("trial-end-banner")).toBeInTheDocument();
  });

  it("reports shown with the IST day key only when it is actually on screen (dedupe per day: analytics.trialBanner.test.ts)", async () => {
    setNow(ist(2026, 6, 6, 12));
    hydrate.mockResolvedValue(trial());
    renderBanner();
    await screen.findByTestId("trial-end-banner");
    expect(shownDays()).toEqual(["2026-06-06"]);
    cleanup();
    trackShown.mockClear();
    setNow(ist(2026, 6, 4, 12)); // day 4: not on screen -> not reported
    renderBanner();
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await act(async () => {});
    expect(shownDays()).toEqual([]);
  });

  it("See plans sends trial_banner_click with cta plans", async () => {
    setNow(ist(2026, 6, 5, 9));
    hydrate.mockResolvedValue(trial());
    readRecords.mockResolvedValue([rec("q", "quick-practice", START + DAY)]);
    renderBanner();
    fireEvent.click(await screen.findByRole("link", { name: "See plans" }));
    expect(trackClick).toHaveBeenCalledWith("plans");
  });
});
