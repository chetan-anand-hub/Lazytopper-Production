/**
 * TRIAL-CTA-1 · T1 — the sign-in door honours the trial intent ONCE.
 *
 * `reason=start-trial` (Pricing's signed-out "Start 7-day trial", the mobile Home chip)
 * used to be read for a back-link label and then dropped: the student came back with
 * no trial. The door now calls the one existing API, useSubscription().startTrial(),
 * right after a successful sign-in — once, and only for an account the EXISTING rule
 * says is eligible — then continues to the (safe) redirect.
 *
 * The REAL useSubscription hook and the REAL activateTrial run here; only the cloud
 * read is stubbed, and it answers with what the device has cached — which is what
 * the cloud holds after a real start. So "a refresh does not start it twice" is
 * proven against the actual local record, not against a mock that remembers.
 *
 * Every successful auth method (Google popup, email sign-in, email sign-up, phone
 * OTP, the /sign-up door, the post-verification re-run) ends by setting the context
 * `user`; the door has ONE effect that reacts to it. The "signs in on the door" case
 * below drives exactly that transition.
 *
 * T5: every date is derived from Date.now() at run time — no calendar date is baked
 * in — so this file passes at any CI clock instant.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { AuthUser } from "../context/AuthContext";
import type { SubscriptionStatus } from "../services/subscriptionService";

const authState: { user: AuthUser | null } = { user: null };

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: authState.user,
    signInWithGoogle: vi.fn(async () => {}),
    signInWithEmailPassword: vi.fn(async () => {}),
    signUpWithEmailPassword: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(async () => {}),
    initPhoneRecaptcha: vi.fn(async () => {}),
    sendPhoneOtp: vi.fn(async () => {}),
    verifyPhoneOtp: vi.fn(async () => {}),
    logout: vi.fn(async () => {}),
  }),
}));
vi.mock("../services/referralService", () => ({ creditPendingReferral: vi.fn() }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: vi.fn() }));
vi.mock("firebase/auth", () => ({
  sendEmailVerification: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  verifyBeforeUpdateEmail: vi.fn(async () => {}),
  reauthenticateWithCredential: vi.fn(async () => {}),
  EmailAuthProvider: { credential: vi.fn(() => ({})) },
}));
vi.mock("../services/subscriptionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/subscriptionService")>();
  return {
    ...actual,
    activateTrial: vi.fn((uid: string) => actual.activateTrial(uid)),
    hydrateSubscriptionFromCloud: vi.fn(),
  };
});
vi.mock("../analytics/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analytics/analytics")>();
  return { ...actual, trackNamedEvent: vi.fn() };
});

import Login, { TRIAL_INTENT_HYDRATION_WAIT_MS } from "./Login";
import * as svc from "../services/subscriptionService";
import * as analytics from "../analytics/analytics";

const hydrate = svc.hydrateSubscriptionFromCloud as unknown as ReturnType<typeof vi.fn>;
const activate = svc.activateTrial as unknown as ReturnType<typeof vi.fn>;
const track = analytics.trackNamedEvent as unknown as ReturnType<typeof vi.fn>;

const UID = "uid-trial-1";
const STORAGE_KEY = `lazytopper.subscription.v1:${UID}`;
const DAY = 24 * 60 * 60 * 1000;

const VERIFIED: AuthUser = {
  uid: UID,
  email: "ananya@example.com",
  phoneNumber: null,
  displayName: "Ananya",
  providerIds: ["password"],
  emailVerified: true,
} as AuthUser;

function status(over: Partial<SubscriptionStatus>): SubscriptionStatus {
  return { tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, ...over };
}
const FREE = status({});
const TRIAL_USED = status({ trialStartDate: new Date(Date.now() - 10 * DAY).toISOString() });
const PREMIUM = status({ tier: "premium", plan: "premium_monthly", premiumSince: new Date(Date.now() - DAY).toISOString() });
const PASS_ENDED = status({ plan: "pass_month", passEnd: new Date(Date.now() - DAY).toISOString() });

/** The cloud answers with `cloud`, and — like the real hydration — caches it. */
function cloudHolds(cloud: SubscriptionStatus) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
  hydrate.mockImplementation(async () => cloud);
}
/** After a real start, the cloud holds what the device holds. */
function cloudEchoesDevice() {
  hydrate.mockImplementation(async (uid: string) => svc.loadSubscription(uid));
}

function renderDoorAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pricing" element={<div>LANDED ON PRICING</div>} />
        <Route path="/" element={<div>LANDED ON HOME</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const trialStarts = () => track.mock.calls.filter(([name]) => name === "trial_start").length;
const INTENT_URL = "/login?reason=start-trial&redirect=%2Fpricing";

beforeEach(() => {
  authState.user = null;
  localStorage.clear();
  hydrate.mockReset();
  activate.mockClear();
  track.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("T1 — the trial intent survives sign-in and starts the trial once", () => {
  it("★ an eligible student who signs in on the door gets the trial, once, and lands on the redirect", async () => {
    cloudEchoesDevice();
    const view = renderDoorAt(INTENT_URL);
    // Signed out: the door waits; nothing starts.
    expect(activate).not.toHaveBeenCalled();

    // Sign-in completes (every method ends by setting the context user).
    authState.user = VERIFIED;
    view.rerender(
      <MemoryRouter initialEntries={[INTENT_URL]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<div>LANDED ON PRICING</div>} />
          <Route path="/" element={<div>LANDED ON HOME</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    expect(activate).toHaveBeenCalledTimes(1);
    expect(activate).toHaveBeenCalledWith(UID);
    expect(trialStarts()).toBe(1);
    // The REAL write happened: the device record is a started trial.
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SubscriptionStatus;
    expect(stored.tier).toBe("trial");
    expect(stored.plan).toBe("trial_7day");
    expect(stored.trialStartDate).toBeTruthy();
  });

  it("★ a REFRESH of the same intent URL does not start it a second time", async () => {
    cloudEchoesDevice();
    authState.user = VERIFIED;
    renderDoorAt(INTENT_URL);
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    const firstStart = (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SubscriptionStatus).trialStartDate;
    expect(firstStart).toBeTruthy();

    // The page is reloaded on the very same URL (or reached again via history).
    cleanup();
    renderDoorAt(INTENT_URL);
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();

    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(1);
    const after = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as SubscriptionStatus;
    expect(after.trialStartDate).toBe(firstStart);
  });

  it("waits for THIS account's cloud record before deciding — nothing starts on the cache", async () => {
    let answer: (s: SubscriptionStatus) => void = () => {};
    hydrate.mockImplementation(() => new Promise<SubscriptionStatus>((r) => { answer = r; }));
    authState.user = VERIFIED;
    renderDoorAt(INTENT_URL);
    await act(async () => {});
    // Still on the door, nothing started, while the record is unknown.
    expect(screen.queryByText("LANDED ON PRICING")).toBeNull();
    expect(activate).not.toHaveBeenCalled();

    await act(async () => { answer(FREE); });
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    expect(activate).toHaveBeenCalledTimes(1);
    expect(trialStarts()).toBe(1);
  });

  it("a cloud read that never answers does not strand the student: bounded wait, then on, no start", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    hydrate.mockImplementation(() => new Promise<SubscriptionStatus>(() => {}));
    authState.user = VERIFIED;
    renderDoorAt(INTENT_URL);
    await act(async () => {});
    expect(screen.queryByText("LANDED ON PRICING")).toBeNull();
    await act(async () => { vi.advanceTimersByTime(TRIAL_INTENT_HYDRATION_WAIT_MS); });
    expect(screen.getByText("LANDED ON PRICING")).toBeTruthy();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
  });

  it("the redirect stays a SAFE internal path: an off-site redirect lands on home (trial still honoured)", async () => {
    cloudEchoesDevice();
    authState.user = VERIFIED;
    renderDoorAt("/login?reason=start-trial&redirect=https%3A%2F%2Fevil.example.com%2Fx");
    expect(await screen.findByText("LANDED ON HOME")).toBeTruthy();
    expect(activate).toHaveBeenCalledTimes(1);
  });
});

describe("T1 — an ineligible account is not changed", () => {
  it.each([
    ["trial already used", TRIAL_USED],
    ["premium", PREMIUM],
    ["a pass that has ended (never trialled)", PASS_ENDED],
  ] as const)("%s → no startTrial, no trial_start, the record untouched, still lands on the redirect", async (_label, cloud) => {
    cloudHolds(cloud);
    const before = localStorage.getItem(STORAGE_KEY);
    authState.user = VERIFIED;
    renderDoorAt(INTENT_URL);
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  it("CONTROL — without the intent, an eligible student signs in and NO trial starts", async () => {
    cloudHolds(FREE);
    authState.user = VERIFIED;
    renderDoorAt("/login?reason=login&redirect=%2Fpricing");
    expect(await screen.findByText("LANDED ON PRICING")).toBeTruthy();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
  });

  it("an address still awaiting verification is held at the gate — nothing starts before sign-up is finished", async () => {
    cloudHolds(FREE);
    authState.user = { ...VERIFIED, emailVerified: false } as AuthUser;
    renderDoorAt(INTENT_URL);
    await waitFor(() => expect(hydrate).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByText("LANDED ON PRICING")).toBeNull();
    expect(activate).not.toHaveBeenCalled();
    expect(trialStarts()).toBe(0);
  });
});
