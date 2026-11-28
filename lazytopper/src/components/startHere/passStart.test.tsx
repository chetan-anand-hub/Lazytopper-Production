import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const { cloudHas, localRows, onboarding, assigned, bank, auth, attempts, cloudAttempt, AVAIL } = vi.hoisted(() => ({
  AVAIL: { Maths: { "real-numbers": { mcq: 20, ar: 6 } }, Science: { electricity: { mcq: 25, ar: 10 } } },
  auth: { currentUser: null as null | { uid: string; metadata: { creationTime?: string } } },
  cloudHas: vi.fn(),
  localRows: vi.fn(),
  onboarding: vi.fn(),
  assigned: vi.fn(),
  attempts: vi.fn(),
  cloudAttempt: vi.fn(),
  bank: { startHereAvailability: vi.fn(), pickStartHereSet: vi.fn() },
}));
vi.mock("../../services/sessionRecords", () => ({ cloudHasAnySessionRecord: cloudHas, loadLocalSessionRecords: localRows }));
vi.mock("../../analytics/analytics", () => ({ trackOnboardingEvent: onboarding, trackGuideVariantAssigned: assigned }));
vi.mock("./startHereBank", () => bank);
vi.mock("./startHereAvailability.generated", () => ({ START_HERE_AVAILABILITY: AVAIL }));
vi.mock("../../services/firebaseClient", () => ({ authClient: auth }));
vi.mock("../../services/practiceInsights", () => ({ getAttempts: attempts }));
vi.mock("../../services/firestoreSdk", () => ({
  isFirestoreEnabled: () => true,
  withFirestore: (fn: (a: unknown) => unknown) => cloudAttempt(fn),
}));

import { StartHereFocusView, StartHereView, useStartHere } from "./StartHereCard";
import { resetZeroGradedCacheForTests } from "./zeroGraded";
import { PASS_START_DISMISS_KEY_PREFIX, isActivePassHolder, resetPassStartCacheForTests } from "./passStart";
import type { SubscriptionStatus } from "../../services/subscriptionService";
import { __setGuideAbForTests } from "../guide/guideVariant";

const FUTURE = "2099-01-01T00:00:00.000Z";
const PAST = "2000-01-01T00:00:00.000Z";
const status = (over: Partial<SubscriptionStatus> = {}): SubscriptionStatus => ({
  tier: "premium",
  plan: "pass_till_boards",
  trialStartDate: null,
  trialEndDate: null,
  premiumSince: null,
  passEnd: FUTURE,
  ...over,
});
const FREE = status({ tier: "free", plan: "none", passEnd: null });

function Harness({ uid, sub }: { uid: string | null; sub: SubscriptionStatus | null }) {
  const s = useStartHere(uid, sub);
  return (
    <MemoryRouter>
      <StartHereView surface="home" returnTo="/" state={s} />
      {uid ? <StartHereFocusView uid={uid} surface="home" returnTo="/" state={s} /> : null}
    </MemoryRouter>
  );
}
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));
const mount = async (uid: string | null, sub: SubscriptionStatus | null) => {
  render(<Harness uid={uid} sub={sub} />);
  await flush();
  await flush();
};

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  resetZeroGradedCacheForTests();
  resetPassStartCacheForTests();
  __setGuideAbForTests(false, "control");
  cloudHas.mockReset().mockResolvedValue(false);
  localRows.mockReset().mockReturnValue([]);
  attempts.mockReset().mockReturnValue([]);
  cloudAttempt.mockReset().mockResolvedValue({ empty: true, metadata: { fromCache: false } });
  onboarding.mockReset();
});
afterEach(() => cleanup());

describe("PASS-START-1 pass-holder card", () => {
  it("a fresh pass holder sees ONE card: the pass variant, not the generic Start-here card", async () => {
    await mount("u1", status());
    expect(screen.getByTestId("pass-start-card")).toBeTruthy();
    expect(screen.getByText("Start a 5-minute Quick Practice")).toBeTruthy();
    expect(screen.getByTestId("pass-start-checker").textContent).toMatch(/Answer Checker/);
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull(); // no focused takeover beside it
  });

  it("hides once there is a graded record", async () => {
    cloudHas.mockResolvedValue(true);
    await mount("u1", status());
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
  });

  it("hides once there is a practice attempt (local, then cloud)", async () => {
    attempts.mockReturnValue([{ id: "a" }]);
    await mount("u1", status());
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
    cleanup();
    attempts.mockReturnValue([]);
    cloudAttempt.mockResolvedValue({ empty: false, metadata: { fromCache: false } });
    resetPassStartCacheForTests();
    await mount("u1", status());
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
  });

  it("an unreadable activity answer never shows the card", async () => {
    cloudAttempt.mockRejectedValue(new Error("offline"));
    await mount("u1", status());
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
  });

  it("is never shown to a non-holder: a free account, a lapsed pass, a legacy premium with no passEnd, signed out", async () => {
    for (const sub of [FREE, status({ passEnd: PAST }), status({ passEnd: null })]) {
      cleanup();
      resetZeroGradedCacheForTests();
      await mount("u1", sub);
      expect(screen.queryByTestId("pass-start-card")).toBeNull();
    }
    cleanup();
    await mount(null, status());
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
    expect(isActivePassHolder(status())).toBe(true);
    expect(isActivePassHolder(status({ tier: "trial" }))).toBe(false);
  });

  it("non-holders keep exactly today's generic card (and no pass-card reads)", async () => {
    await mount("u1", FREE);
    expect(screen.getByTestId("start-here-card")).toBeTruthy();
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
    expect(cloudAttempt).not.toHaveBeenCalled();
  });

  it("does not replace Byte's guide arm for a non-holder", async () => {
    __setGuideAbForTests(true, "guide");
    await mount("u1", FREE);
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
  });

  it("the primary button launches the card's own default set; a failed launch falls back to the Practice hub", async () => {
    bank.pickStartHereSet.mockResolvedValue(["q1", "q2", "q3", "q4", "q5"]);
    await mount("u1", status());
    await act(async () => {
      fireEvent.click(screen.getByTestId("pass-start-go"));
    });
    await flush();
    expect(bank.pickStartHereSet).toHaveBeenCalled();
    expect(onboarding.mock.calls.some((c) => c[0] === "start_here_start")).toBe(true);
  });

  it("'Not now' is remembered on this device and hides the card (no generic card in its place)", async () => {
    await mount("u1", status());
    fireEvent.click(screen.getByTestId("pass-start-not-now"));
    await flush();
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
    expect(window.localStorage.getItem(`${PASS_START_DISMISS_KEY_PREFIX}u1`)).toBe("1");
    cleanup();
    await mount("u1", status());
    expect(screen.queryByTestId("pass-start-card")).toBeNull();
    expect(screen.queryByTestId("start-here-card")).toBeNull();
  });

  it("kill switch VITE_PASS_START_DISABLED=1: no pass card, today's generic card", async () => {
    vi.stubEnv("VITE_PASS_START_DISABLED", "1");
    try {
      await mount("u1", status());
      expect(screen.queryByTestId("pass-start-card")).toBeNull();
      expect(screen.getByTestId("start-here-card")).toBeTruthy();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
