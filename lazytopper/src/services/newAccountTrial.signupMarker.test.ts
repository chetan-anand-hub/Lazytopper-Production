/**
 * FRICTION-FIX-1 · F5 (FU-SIGNUP-CONFIRMATION-SESSION-ONLY) — the "trial started at
 * sign-up" marker survives a reload of the tab, and is display-only.
 *
 * A RELOAD is modelled as a FRESH MODULE INSTANCE (vi.resetModules + re-import): the
 * in-memory Set starts empty exactly as it does after a real reload, while this tab's
 * sessionStorage keeps what was written. Mutation this file turns RED: remove the
 * sessionStorage read from wasTrialStartedAtSignUp (the reload cases).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const sub = vi.hoisted(() => ({
  activateTrial: vi.fn(),
  loadSubscription: vi.fn(),
}));

vi.mock("./subscriptionService", () => ({
  activateTrial: (uid: string) => sub.activateTrial(uid),
  loadSubscription: (uid: string) => sub.loadSubscription(uid),
}));
vi.mock("../analytics/analytics", () => ({ trackNamedEvent: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo: () => ({ isNewUser: true }) }));

type Mod = typeof import("./newAccountTrial");

/** A fresh module instance: what a reload of the tab gives the page. */
async function reload(): Promise<Mod> {
  vi.resetModules();
  return import("./newAccountTrial");
}

beforeEach(() => {
  window.sessionStorage.clear();
  sub.activateTrial.mockReset();
  sub.loadSubscription.mockReset();
  sub.loadSubscription.mockReturnValue({ tier: "free", trialStartDate: null });
  sub.activateTrial.mockReturnValue({ tier: "trial", trialStartDate: "2026-10-03T06:00:00.000Z" });
});

describe("F5 — the sign-up marker survives a reload", () => {
  it("a sign-up writes the uid-keyed mirror into this tab's sessionStorage", async () => {
    const m = await reload();
    expect(m.startTrialForNewAccount("u-1")).toBe(true);
    expect(window.sessionStorage.getItem(`${m.SIGNUP_TRIAL_MARKER_PREFIX}u-1`)).toBe("1");
    expect(m.wasTrialStartedAtSignUp("u-1")).toBe(true);
  });

  it("★ after a reload (fresh module, empty memory) the marker is read back from sessionStorage", async () => {
    const first = await reload();
    first.startTrialForNewAccount("u-2");
    const afterReload = await reload();
    expect(afterReload.wasTrialStartedAtSignUp("u-2")).toBe(true);
  });

  it("keyed by uid: another student in the same tab is not marked", async () => {
    (await reload()).startTrialForNewAccount("u-3");
    const afterReload = await reload();
    expect(afterReload.wasTrialStartedAtSignUp("u-other")).toBe(false);
    expect(afterReload.wasTrialStartedAtSignUp(null)).toBe(false);
    expect(afterReload.wasTrialStartedAtSignUp(undefined)).toBe(false);
  });

  it("CONTROL — with nothing in sessionStorage a fresh module reports no marker", async () => {
    (await reload()).startTrialForNewAccount("u-4");
    window.sessionStorage.clear();
    expect((await reload()).wasTrialStartedAtSignUp("u-4")).toBe(false);
  });

  it("continuing clears it: memory and storage, so a later reload shows nothing", async () => {
    const m = await reload();
    m.startTrialForNewAccount("u-5");
    window.sessionStorage.setItem("unrelated.key", "keep");
    m.clearTrialStartedAtSignUp();
    expect(m.wasTrialStartedAtSignUp("u-5")).toBe(false);
    expect(window.sessionStorage.getItem(`${m.SIGNUP_TRIAL_MARKER_PREFIX}u-5`)).toBeNull();
    expect(window.sessionStorage.getItem("unrelated.key")).toBe("keep");
    expect((await reload()).wasTrialStartedAtSignUp("u-5")).toBe(false);
  });

  it("no trial started (refused by activateTrial) → no marker written", async () => {
    sub.loadSubscription.mockReturnValue({ tier: "free", trialStartDate: "2026-09-01T00:00:00.000Z" });
    sub.activateTrial.mockReturnValue({ tier: "free", trialStartDate: "2026-09-01T00:00:00.000Z" });
    const m = await reload();
    expect(m.startTrialForNewAccount("u-6")).toBe(false);
    expect(window.sessionStorage.getItem(`${m.SIGNUP_TRIAL_MARKER_PREFIX}u-6`)).toBeNull();
  });
});

describe("F5 — display-only, and storage failure never costs the sign-up", () => {
  it("reading or clearing the marker never touches the subscription", async () => {
    window.sessionStorage.setItem("lazytopper.trialStartedAtSignUp:u-7", "1");
    const m = await reload();
    expect(m.wasTrialStartedAtSignUp("u-7")).toBe(true);
    m.clearTrialStartedAtSignUp();
    expect(sub.activateTrial).not.toHaveBeenCalled();
    expect(sub.loadSubscription).not.toHaveBeenCalled();
  });

  it("a throwing sessionStorage: the trial still starts, the in-memory marker still works, nothing throws", async () => {
    const m = await reload();
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    try {
      expect(m.startTrialForNewAccount("u-8")).toBe(true);
      expect(m.wasTrialStartedAtSignUp("u-8")).toBe(true);
      expect(m.wasTrialStartedAtSignUp("u-9")).toBe(false);
      expect(() => m.clearTrialStartedAtSignUp()).not.toThrow();
    } finally {
      set.mockRestore();
      get.mockRestore();
    }
  });
});
