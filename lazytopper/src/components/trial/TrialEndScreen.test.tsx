// ASK-FIX-1 - the trial-ended screen as a student meets it, and the countdown bar.
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

/**
 * TRIAL-CLOCK-1 — wait until the mount's hydration has LANDED and every effect it triggers has
 * run, inside act. The old checks waited only for hydrate to be CALLED plus one microtask, so a
 * "never shows" assertion could run before the screen had any chance to appear and pass falsely.
 * Showing the screen always begins with the session-records read, so after this settles a
 * "never shows" test asserts that read never started; a positive control below proves this
 * helper does reach the read when the screen applies.
 */
async function settleHydration(): Promise<void> {
  await waitFor(() => expect(hydrate).toHaveBeenCalled());
  const pending = hydrate.mock.results.map((r) => r.value as Promise<unknown>);
  await act(async () => {
    await Promise.all(pending);
    for (let i = 0; i < 5; i += 1) await Promise.resolve();
  });
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

  it("TRIAL-END-OFFER-1: with nothing real to report there is NO activity line (no invented or negative stats)", async () => {
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    await screen.findByTestId("trial-end-screen");
    expect(screen.queryByTestId("trial-end-screen-activity")).toBeNull();
    cleanup();
    __resetTrialEndScreenForTests();
    localStorage.clear();
    readRecords.mockRejectedValue(new Error("offline")); // unreadable records: also no line
    renderAt("/browse");
    await screen.findByTestId("trial-end-screen");
    expect(screen.queryByTestId("trial-end-screen-activity")).toBeNull();
  });

  it("TRIAL-END-OFFER-1: sells the Board Pass - founding line, whole days left, the shared star features, packs line, no 'Premium'", async () => {
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    await screen.findByTestId("trial-end-screen");
    // 9 Jun 2026 (the test clock) is inside the founding window: 30 Nov is a long way off, so the count is a plain integer.
    expect(screen.getByTestId("trial-end-screen-deadline")).toHaveTextContent("Founding price ₹1,917 till 30 Nov — ₹2,499 from 1 Dec");
    expect(screen.getByTestId("trial-end-screen-days")).toHaveTextContent(/^\d+ days left at this price$/);
    const ticks = screen.getByTestId("trial-end-screen-ticks");
    expect(ticks).toHaveTextContent("Answer Checker");
    expect(ticks).toHaveTextContent("Mistake Intelligence");
    expect(ticks).toHaveTextContent("AI tutor");
    expect(ticks).toHaveTextContent("graded");
    expect(screen.getByTestId("trial-end-screen-packs")).toHaveAttribute("href", "/pricing#packs");
    expect(screen.getByTestId("trial-end-screen-packs")).toHaveTextContent(/PDF packs from ₹49/);
    const text = screen.getByTestId("trial-end-screen").textContent ?? "";
    expect(text).not.toMatch(/premium/i);
    expect(text).not.toMatch(/refund/i);
    // Continue with Basic is the last, smallest control.
    const controls = Array.from(screen.getByTestId("trial-end-screen").querySelectorAll("a[href], button"));
    expect(controls[controls.length - 1]).toBe(screen.getByTestId("trial-end-screen-basic"));
  });

  it("TRIAL-END-OFFER-1: after the founding deadline the founding line and the day count are gone; the current price stays", async () => {
    vi.setSystemTime(ist(2026, 12, 2, 12));
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    await screen.findByTestId("trial-end-screen");
    expect(screen.queryByTestId("trial-end-screen-deadline")).toBeNull();
    expect(screen.queryByTestId("trial-end-screen-days")).toBeNull();
    expect(screen.queryByTestId("trial-end-screen-founding-label")).toBeNull();
    expect(screen.getByTestId("trial-end-screen-lead")).toHaveTextContent("₹2,499");
  });

  it("TRIAL-END-OFFER-1: on 30 November it says 1 day left", async () => {
    vi.setSystemTime(ist(2026, 11, 30, 20));
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    await screen.findByTestId("trial-end-screen");
    expect(screen.getByTestId("trial-end-screen-days")).toHaveTextContent("1 day left at this price");
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
    await settleHydration();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    expect(readRecords).toHaveBeenCalledTimes(1); // the first mount's read only
    expect(trackScreen.mock.calls.filter(([k]) => k === "shown")).toHaveLength(1);
  });

  it.each([
    ["an active trial", "trial" as const],
    ["a paid Premium", "premium" as const],
  ])("never shows for %s", async (_n, tier) => {
    hydrate.mockResolvedValue(status(tier));
    renderAt("/browse");
    await settleHydration();
    expect(readRecords).not.toHaveBeenCalled();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
  });

  it("never tells a student whose PAID pass ran out that their free week is over", async () => {
    hydrate.mockResolvedValue({ ...status("free"), plan: "pass_month", premiumSince: new Date(START).toISOString(), passEnd: new Date(START + 30 * 24 * HOUR).toISOString() } as unknown as SubscriptionStatus);
    renderAt("/browse");
    await settleHydration();
    expect(readRecords).not.toHaveBeenCalled();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
  });

  it.each(["/chapter-test/10/Maths/x", "/full-mock", "/tutor/abc", "/legal/privacy", "/sign-up", "/contact", "/for-parents", "/u/x"])(
    "never covers %s",
    async (path) => {
      hydrate.mockResolvedValue(status("free"));
      renderAt(path);
      await settleHydration();
      expect(readRecords).not.toHaveBeenCalled();
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
    // FLAKY-1: the scroll lock, the Tab trap and the back-button listener are all passive effects of the commit that paints the
    // screen. findByTestId can resolve on that paint before React flushes them (seen under CI load: overflow was still ''), so
    // wait for the lock itself; once it is set, every effect of that commit has run.
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    const basic = screen.getByRole("button", { name: "Continue with Basic" });
    basic.focus();
    fireEvent.keyDown(document, { key: "Tab" }); // last control -> wraps to the first
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "See plans" }));
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true }); // first -> wraps to last
    expect(document.activeElement).toBe(basic);
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() => expect(screen.queryByTestId("trial-end-screen")).toBeNull());
    expect(document.body.style.overflow).toBe("");
    expect(trackScreen).toHaveBeenCalledWith("basic");
  });

  it("positive control: settleHydration reaches the records read when the screen applies", async () => {
    hydrate.mockResolvedValue(status("free"));
    readRecords.mockReturnValue(new Promise(() => {})); // hold the screen at the read
    renderAt("/browse");
    await settleHydration();
    expect(readRecords).toHaveBeenCalledTimes(1);
  });

  // TRIAL-CLOCK-1 — the live defect: a day-1 student on a phone whose clock runs slow. The
  // record the client held was tier "free" over a server start "in the future"; tier alone
  // must never put "Your free week is over" in front of them.
  it.each([
    ["a day behind", 24 * HOUR],
    ["18 hours behind", 18 * HOUR],
  ])("never shows on day 1 when the device clock is %s the server start", async (_n, behind) => {
    vi.setSystemTime(START - behind);
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    await settleHydration();
    expect(readRecords).not.toHaveBeenCalled();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    expect(trackScreen).not.toHaveBeenCalled();
  });

  it("never shows on day 6 of 7 even if the tier reads free", async () => {
    vi.setSystemTime(START + 6 * 24 * HOUR);
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    await settleHydration();
    expect(readRecords).not.toHaveBeenCalled();
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
  });

  it("still shows for a genuinely ended trial (start 8 days ago)", async () => {
    vi.setSystemTime(START + 8 * 24 * HOUR);
    hydrate.mockResolvedValue(status("free"));
    renderAt("/browse");
    expect(await screen.findByTestId("trial-end-screen")).toBeInTheDocument();
  });

  it("never shows signed out, or on /pricing", async () => {
    hydrate.mockResolvedValue(status("free"));
    auth.user = null;
    renderAt("/browse");
    expect(screen.queryByTestId("trial-end-screen")).toBeNull();
    cleanup();
    auth.user = { uid: "u1" };
    renderAt("/pricing");
    await settleHydration();
    expect(readRecords).not.toHaveBeenCalled();
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
    // FLAKY-1: "shown" is a passive effect of the paint findByTestId just saw; wait for it rather than race it.
    await waitFor(() => expect(trackShown).toHaveBeenCalled());
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

describe("BUY-PATH-1 · one-tap pay with payments on", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("trial-end screen: Pay opens the Board Pass checkout (/pricing?buy=board_pass), not plain /pricing", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    hydrate.mockResolvedValue(status("free"));
    renderAt("/practice?x=1");
    const pay = await screen.findByTestId("trial-end-screen-buy");
    expect(pay).toHaveAttribute("href", "/pricing?buy=board_pass&source=trial-end&returnTo=" + encodeURIComponent("/practice?x=1"));
    // TRIAL-END-OFFER-1: the primary action names the Board Pass and its price, and counts as the same "pay" tap as before.
    expect(pay).toHaveTextContent("Get the Board Pass · ₹1,917");
    fireEvent.click(pay);
    expect(analytics.trackPaywallAction).toHaveBeenCalledWith("pay", "trial_end");
  });

  it("TRIAL-END-OFFER-1: with payments and parent-pay on, 'Forward link to parents' sits under the primary action (no QR button)", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.stubEnv("VITE_PARENT_PAY_ENABLED", "1");
    hydrate.mockResolvedValue(status("free"));
    renderAt("/practice");
    expect(await screen.findByTestId("paywall-forward")).toHaveTextContent("Forward link to parents");
    expect(screen.queryByTestId("paywall-qr")).toBeNull();
    expect(screen.queryByTestId("paywall-pay")).toBeNull(); // the screen's own primary button is the only buy button
    expect(screen.getByTestId("trial-end-screen-buy")).toBeInTheDocument();
  });

  it("countdown bar: with payments on the bar opens the Board Pass checkout; CONTROL dark: plain /pricing (above)", async () => {
    vi.stubEnv("VITE_PAYMENTS_ENABLED", "1");
    vi.setSystemTime(ist(2026, 6, 4, 12));
    hydrate.mockResolvedValue(status("trial"));
    renderAt("/practice", <TrialCountdownBar />);
    await screen.findByTestId("trial-countdown-bar");
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pricing?buy=board_pass&source=trial-bar");
  });
});
