// ASK-FIX-1 - the trial-ended screen as a student meets it, and the countdown bar.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
vi.mock("../feedback/feedbackPromptHost", () => ({ requestFeedbackPrompt: vi.fn(), notifyPaywallDismissed: vi.fn() }));
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return {
    ...actual,
    trackTrialEndScreen: vi.fn(),
    trackPaywallAction: vi.fn(),
    trackTrialBannerShown: vi.fn(),
    trackTrialBannerClick: vi.fn(),
  };
});

import TrialEndScreen from "./TrialEndScreen";
import TrialCountdownBar, { trialCountdownRouteAllowed, trialCountdownText } from "./TrialCountdownBar";
import { __resetTrialEndScreenForTests, readTrialEndScreen } from "./trialEndScreenModel";
import { trialAskRouteAllowed } from "./trialAskRoutes";
import * as svc from "../../services/subscriptionService";
import * as records from "../../services/sessionRecords";
import * as analytics from "../../analytics/analytics";
import * as host from "../feedback/feedbackPromptHost";
import type { SubscriptionStatus } from "../../services/subscriptionService";
import type { SessionRecord } from "../../services/sessionRecords";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const readRecords = records.getSessionRecordsFromCloud as unknown as ReturnType<typeof vi.fn>;
const trackScreen = analytics.trackTrialEndScreen as unknown as ReturnType<typeof vi.fn>;
const trackShown = analytics.trackTrialBannerShown as unknown as ReturnType<typeof vi.fn>;
const feedback = host.requestFeedbackPrompt as unknown as ReturnType<typeof vi.fn>;

const HOUR = 60 * 60 * 1000;
const ist = (y: number, mo: number, d: number, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi) - 5.5 * HOUR;
const START = ist(2026, 6, 1, 10, 0);
const status = (tier: "trial" | "free" | "premium"): SubscriptionStatus => ({
  tier,
  plan: tier === "premium" ? "premium_monthly" : "trial_7day", // an expired trial keeps its trial plan
  trialStartDate: new Date(START).toISOString(),
  trialEndDate: null,
  premiumSince: null,
} as SubscriptionStatus);
const rec = (id: string, surface: SessionRecord["surface"], gradedAt: number) =>
  ({ id, surface, gradedAt, status: "graded" }) as SessionRecord;

function renderAt(path: string, ui = <TrialEndScreen />) {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(ist(2026, 6, 9, 12)); // the day after the trial ended
  localStorage.clear();
  sessionStorage.clear();
  __resetTrialEndScreenForTests();
  auth.user = { uid: "u1" };
  hydrate.mockReset();
  readRecords.mockReset();
  readRecords.mockResolvedValue([]);
  trackScreen.mockClear();
  trackShown.mockClear();
  feedback.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("TrialEndScreen", () => {
  it("shows on the first visit after the end - on a page that is NOT Home - with real counts, the Board Pass alone (PRICE-FIXED-1: month pass hidden)", async () => {
    hydrate.mockResolvedValue(status("free"));
    readRecords.mockResolvedValue([rec("a", "check-improve", START + HOUR), rec("old", "worksheet", START - HOUR)]);
    renderAt("/check-improve");
    expect(await screen.findByRole("heading", { name: "Your free week is over" })).toBeInTheDocument();
    expect(screen.getByTestId("trial-end-screen-activity")).toHaveTextContent("In your free week: 1 answer checked.");
    const lead = screen.getByTestId("trial-end-screen-lead");
    expect(lead).toHaveTextContent("Board Pass");
    expect(lead).toHaveTextContent("₹1,917");
    expect(lead).toHaveTextContent("one payment till your boards");
    expect(screen.getByTestId("trial-end-screen").textContent).not.toMatch(/599|999|for a month/);
    expect(screen.getByTestId("trial-end-screen-second")).toHaveTextContent(/^Everything unlocked/);
    expect(lead.compareDocumentPosition(screen.getByTestId("trial-end-screen-second")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue with Basic" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See plans" })).toHaveAttribute("href", "/pricing?source=trial-end&returnTo=" + encodeURIComponent("/check-improve"));
    expect(trackScreen).toHaveBeenCalledWith("shown");
    expect(readTrialEndScreen("u1")?.k).toBe(new Date(START).toISOString());
    expect(feedback).not.toHaveBeenCalled(); // the feedback card waits for "Continue with Basic"
  });

  it("says zero as zero", async () => {
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    expect(await screen.findByTestId("trial-end-screen-activity")).toHaveTextContent(
      "In your free week you didn't check an answer or take a test.",
    );
  });

  it("Continue with Basic closes it, counts it, and asks the feedback card to follow", async () => {
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    fireEvent.click(await screen.findByRole("button", { name: "Continue with Basic" }));
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    expect(trackScreen).toHaveBeenCalledWith("basic");
    expect(feedback).toHaveBeenCalledWith("trial_end", { uid: "u1", trialKey: new Date(START).toISOString() });
  });

  it("is once per student per device: a second mount in a later load shows nothing", async () => {
    hydrate.mockResolvedValue(status("free"));
    const first = renderAt("/browse");
    await screen.findByTestId("trial-end-screen");
    first.unmount();
    __resetTrialEndScreenForTests(); // a new page load
    renderAt("/browse");
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    expect(trackScreen.mock.calls.filter(([k]) => k === "shown")).toHaveLength(1);
  });

  it.each([
    ["an active trial", "trial" as const],
    ["a paid Premium", "premium" as const],
  ])("never shows for %s", async (_n, tier) => {
    hydrate.mockResolvedValue(status(tier));
    renderAt("/browse");
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
  });

  it("never tells a student whose PAID pass ran out that their free week is over", async () => {
    hydrate.mockResolvedValue({ ...status("free"), plan: "pass_month", premiumSince: new Date(START).toISOString(), passEnd: new Date(START + 30 * 24 * HOUR).toISOString() } as unknown as SubscriptionStatus);
    renderAt("/browse");
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
  });

  it.each(["/chapter-test/10/Maths/x", "/full-mock", "/tutor/abc", "/legal/privacy", "/sign-up", "/contact", "/for-parents", "/u/x"])(
    "never covers %s",
    async (path) => {
      hydrate.mockResolvedValue(status("free"));
      renderAt(path);
      await waitFor(() => expect(hydrate).toHaveBeenCalled());
      await Promise.resolve();
      expect(screen.queryByTestId("trial-end-screen")).toBeNull();
      expect(trialAskRouteAllowed(path)).toBe(false);
    },
  );

  it("Pay carries a safe returnTo to the current page", async () => {
    hydrate.mockResolvedValue(status("free"));
    renderAt("/practice?x=1");
    const pay = await screen.findByRole("link", { name: "See plans" });
    expect(pay).toHaveAttribute("href", "/pricing?source=trial-end&returnTo=" + encodeURIComponent("/practice?x=1"));
  });

  it("locks page scroll while open, traps Tab inside the dialog, and closes on the back button", async () => {
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    await screen.findByTestId("trial-end-screen");
    expect(document.body.style.overflow).toBe("hidden");
    const basic = screen.getByRole("button", { name: "Continue with Basic" });
    basic.focus();
    fireEvent.keyDown(document, { key: "Tab" }); // last control -> wraps to the first
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "See plans" }));
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true }); // first -> wraps to last
    expect(document.activeElement).toBe(basic);
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => expect(screen.queryByTestId("trial-end-screen")).toBeNull());
    expect(document.body.style.overflow).toBe("");
    expect(trackScreen).toHaveBeenCalledWith("basic");
  });

  it("never shows signed out, or on /pricing", async () => {
    hydrate.mockResolvedValue(status("free"));
    auth.user = null;
    renderAt("/browse");
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    cleanup();
    auth.user = { uid: "u1" };
    renderAt("/pricing");
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
  });
});

describe("TrialCountdownBar", () => {
  it("wording uses the real days left", () => {
    expect(trialCountdownText(3, "Board Pass X till boards")).toBe("3 days left of your free week · Board Pass X till boards");
    expect(trialCountdownText(1, "P")).toBe("1 day left of your free week · P");
    expect(trialCountdownText(0, "P")).toBe("Last day of your free week · P");
  });

  it("from day 4, on a non-Home page, without waiting for any activity read; links to /pricing", async () => {
    vi.setSystemTime(ist(2026, 6, 4, 12)); // trial day 4
    hydrate.mockResolvedValue(status("trial"));
    readRecords.mockReturnValue(new Promise(() => {})); // never resolves: must not matter
    renderAt("/practice", <TrialCountdownBar />);
    const bar = await screen.findByTestId("trial-countdown-bar");
    expect(bar).toHaveTextContent(/4 days left of your free week · Board Pass ₹1,917 till boards/);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pricing?source=trial-bar");
    expect(trackShown).toHaveBeenCalled();
  });

  it("not before day 4", async () => {
    vi.setSystemTime(ist(2026, 6, 3, 12));
    hydrate.mockResolvedValue(status("trial"));
    renderAt("/practice", <TrialCountdownBar />);
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await Promise.resolve();
    expect(screen.queryByTestId("trial-countdown-bar")).toBeNull();
  });

  it("'Not today' hides it for the rest of the IST day only", async () => {
    vi.setSystemTime(ist(2026, 6, 5, 12));
    hydrate.mockResolvedValue(status("trial"));
    const r = renderAt("/practice", <TrialCountdownBar />);
    fireEvent.click(await screen.findByRole("button", { name: "Not today" }));
    expect(screen.queryByTestId("trial-countdown-bar")).toBeNull();
    r.unmount();
    renderAt("/practice", <TrialCountdownBar />);
    await waitFor(() => expect(hydrate).toHaveBeenCalledTimes(2));
    await Promise.resolve();
    expect(screen.queryByTestId("trial-countdown-bar")).toBeNull();
    cleanup();
    vi.setSystemTime(ist(2026, 6, 6, 12)); // next day
    renderAt("/practice", <TrialCountdownBar />);
    expect(await screen.findByTestId("trial-countdown-bar")).toBeInTheDocument();
  });

  it("Home keeps the richer strip from day 5 but shows the bar on day 4", () => {
    expect(trialCountdownRouteAllowed("/browse", 4)).toBe(true);
    expect(trialCountdownRouteAllowed("/browse", 5)).toBe(false);
    expect(trialCountdownRouteAllowed("/", 6)).toBe(false);
    expect(trialCountdownRouteAllowed("/practice", 6)).toBe(true);
    expect(trialCountdownRouteAllowed("/pricing", 6)).toBe(false);
    for (const p of ["/chapter-test/10/Maths/x", "/full-mock", "/tutor", "/legal/terms", "/sign-up", "/contact", "/for-parents"]) {
      expect(trialCountdownRouteAllowed(p, 4)).toBe(false);
    }
  });
});
