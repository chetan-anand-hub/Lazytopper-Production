// TUTOR-STICKY-1 — the trial-ending tutor summary: real counts only, last 2 trial days, honest offer.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { uid: "u1" } as { uid: string; isLocalSession?: boolean } | null }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: false }) }));
vi.mock("../../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/subscriptionService")>();
  return { ...actual, hydrateSubscriptionFromCloud: vi.fn(), activateTrial: vi.fn() };
});
vi.mock("../../services/tutorSessionStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/tutorSessionStore")>();
  return { ...actual, getTutorTurnsFromCloud: vi.fn() };
});
vi.mock("../../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../analytics/analytics")>();
  return { ...actual, trackTutorSticky: vi.fn() };
});

import TrialTutorSummary from "./TrialTutorSummary";
import * as svc from "../../services/subscriptionService";
import * as store from "../../services/tutorSessionStore";
import * as analytics from "../../analytics/analytics";
import type { SubscriptionStatus } from "../../services/subscriptionService";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const readTurns = store.getTutorTurnsFromCloud as unknown as ReturnType<typeof vi.fn>;
const track = analytics.trackTutorSticky as unknown as ReturnType<typeof vi.fn>;

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const START = Date.UTC(2026, 10, 1, 4, 30); // 1 Nov 10:00 IST
const trial = (): SubscriptionStatus => ({
  tier: "trial",
  plan: "trial_7day",
  trialStartDate: new Date(START).toISOString(),
  trialEndDate: null,
  premiumSince: null,
});
const events = [
  { at: START + HOUR, topicKey: "electricity", subject: "science" as const },
  { at: START + 2 * HOUR, topicKey: "electricity", subject: "science" as const },
  { at: START + DAY, topicKey: "polynomials", subject: "maths" as const },
];

function mount() {
  return render(
    <MemoryRouter>
      <TrialTutorSummary surface="home" />
    </MemoryRouter>,
  );
}
function setNow(ms: number) {
  vi.setSystemTime(ms);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  localStorage.clear();
  sessionStorage.clear();
  auth.user = { uid: "u1" };
  hydrate.mockReset();
  readTurns.mockReset();
  readTurns.mockResolvedValue({ events, complete: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  track.mockClear();
});

describe("TrialTutorSummary", () => {
  it("shows the real counts and the Board Pass offer on the last trial days", async () => {
    setNow(START + 5 * DAY + HOUR); // day 6: 2 days left
    hydrate.mockResolvedValue(trial());
    mount();
    const line = await screen.findByTestId("trial-tutor-summary-line");
    expect(line.textContent).toBe("During your trial the tutor helped you with 3 questions across 2 chapters.");
    const plans = screen.getByTestId("trial-tutor-summary-plans");
    expect(plans.textContent).toMatch(/^Board Pass ₹[\d,]+ →$/);
    expect(plans.getAttribute("href")).toBe("/pricing?source=tutor-trial-summary");
    expect(screen.getByText(/Founding member offer ends 30 November\. From 1 December: ₹2,499\./)).toBeTruthy();
    expect(screen.getByText(/₹1,917 once, till your boards/)).toBeTruthy();
    expect(track).toHaveBeenCalledWith("trial_summary_shown", { surface: "home" }, expect.any(String));
    fireEvent.click(plans);
    expect(track).toHaveBeenCalledWith("trial_summary_tap", { surface: "home", cta: "plans" });
  });

  it("shows nothing when the tutor was never used", async () => {
    setNow(START + 5 * DAY + HOUR);
    hydrate.mockResolvedValue(trial());
    readTurns.mockResolvedValue({ events: [], complete: true });
    const { container } = mount();
    await waitFor(() => expect(readTurns).toHaveBeenCalled());
    expect(container.innerHTML).toBe("");
  });

  it("shows nothing on a partial read, early in the trial, or for a signed-out visitor", async () => {
    hydrate.mockResolvedValue(trial());
    setNow(START + 5 * DAY + HOUR);
    readTurns.mockResolvedValue({ events, complete: false });
    let r = mount();
    await waitFor(() => expect(readTurns).toHaveBeenCalled());
    expect(r.container.innerHTML).toBe("");
    cleanup();

    readTurns.mockReset();
    readTurns.mockResolvedValue({ events, complete: true });
    setNow(START + 2 * DAY);
    r = mount();
    await Promise.resolve();
    expect(r.container.innerHTML).toBe("");
    expect(readTurns).not.toHaveBeenCalled();
    cleanup();

    auth.user = null;
    setNow(START + 5 * DAY + HOUR);
    r = mount();
    expect(r.container.innerHTML).toBe("");
  });

  it("'Not today' hides it until the next IST day", async () => {
    setNow(START + 5 * DAY + HOUR);
    hydrate.mockResolvedValue(trial());
    mount();
    await screen.findByTestId("trial-tutor-summary-line");
    fireEvent.click(screen.getByText("Not today"));
    expect(screen.queryByTestId("trial-tutor-summary-line")).toBeNull();
    cleanup();
    mount();
    await waitFor(() => expect(readTurns).toHaveBeenCalled());
    expect(screen.queryByTestId("trial-tutor-summary-line")).toBeNull();
  });
});
