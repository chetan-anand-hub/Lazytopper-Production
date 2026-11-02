// PAY-PHONE-1 review fix 1 — the sign-up trial write and a claimed Board Pass race on a NEW phone account.
// (a) the trial write re-reads the record and never lands on a paid one; (b) if it already landed (the race the read
// cannot close), a stored trial carrying a complete server grant record is read as the paid pass; (c) the claim waits.
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fakeDb: true } }));
const getDocMock = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(undefined));
const setDocMock = vi.fn((..._args: unknown[]): Promise<void> => Promise.resolve());
vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => ({ __ref: args }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => ({ __sentinel: true }),
}));

import { activateTrial, hydrateSubscriptionFromCloud, whenTrialWriteSettled } from "./subscriptionService";

const DAY = 86400000;
const stamp = (ms: number) => ({ toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) });
const snap = (data: Record<string, unknown> | null) => ({ exists: () => data !== null, data: () => data, metadata: {} });

beforeEach(() => {
  getDocMock.mockReset();
  setDocMock.mockReset();
  setDocMock.mockResolvedValue(undefined);
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "test-project");
});

it("the trial write is skipped when the cached record already carries a paid pass", async () => {
  localStorage.setItem("lazytopper.subscription.v1:u-new", JSON.stringify({ tier: "free", plan: "none", trialStartDate: null, trialEndDate: null, premiumSince: null, passEnd: "2027-03-31T18:29:59.000Z" }));
  activateTrial("u-new");
  await whenTrialWriteSettled("u-new");
  expect(setDocMock).not.toHaveBeenCalled();
});

it("a fresh record still gets its trial", async () => {
  getDocMock.mockResolvedValue(snap(null));
  activateTrial("u-fresh");
  await whenTrialWriteSettled("u-fresh");
  expect(setDocMock).toHaveBeenCalledTimes(1);
  expect((setDocMock.mock.calls[0][1] as Record<string, unknown>).tier).toBe("trial");
});

it("the trial write landed AFTER the grant: still Premium (the paid pass outranks the trial)", async () => {
  getDocMock.mockResolvedValue(
    snap({
      tier: "trial",
      plan: "trial_7day",
      trialStartDate: stamp(Date.now() - DAY),
      passType: "till_boards",
      passEnd: stamp(Date.now() + 90 * DAY),
      lastPaymentRef: "pay_1",
      pricePaidInr: 1917,
    }),
  );
  const status = await hydrateSubscriptionFromCloud("u-raced");
  expect(status.tier).toBe("premium");
  expect(status.plan).toBe("pass_till_boards");
  // ...and no downgrade is written back (a pass record is server-owned).
  expect(setDocMock).not.toHaveBeenCalled();
});

it("a trial with only a stray passEnd (no grant record) is NOT upgraded", async () => {
  getDocMock.mockResolvedValue(snap({ tier: "trial", plan: "trial_7day", trialStartDate: stamp(Date.now() - 30 * DAY), passType: "till_boards", passEnd: stamp(Date.now() + 90 * DAY) }));
  const status = await hydrateSubscriptionFromCloud("u-forged");
  expect(status.tier).not.toBe("premium");
});
