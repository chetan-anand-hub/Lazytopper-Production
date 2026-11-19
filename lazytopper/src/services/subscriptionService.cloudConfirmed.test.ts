// GATE-QP-1 F2 - a Board Pass holder is never walled off a cache/default guess: the flag is true only after a
// SUCCESSFUL cloud read (record found, or confirmed absent), false after an error.
import { beforeEach, expect, it, vi } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: { __fakeDb: true } }));
const getDocMock = vi.fn((..._args: unknown[]): Promise<unknown> => Promise.resolve(undefined));
vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => ({ __ref: args }),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: () => ({ __sentinel: true }),
}));

import { hydrateSubscriptionFromCloud, isCloudConfirmed } from "./subscriptionService";

const DAY = 86400000;
const stamp = (ms: number) => ({ toDate: () => new Date(ms), seconds: Math.floor(ms / 1000) });
const snap = (data: Record<string, unknown> | null) => ({ exists: () => data !== null, data: () => data, metadata: {} });

beforeEach(() => {
  getDocMock.mockReset();
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "test-project");
});

it("cloud error on a new device: free default, NOT confirmed (no wall)", async () => {
  getDocMock.mockRejectedValue(new Error("offline"));
  const s = await hydrateSubscriptionFromCloud("u-err");
  expect(s.tier).toBe("free");
  expect(isCloudConfirmed("u-err")).toBe(false);
});

it("successful read, record absent: free and confirmed (wall applies)", async () => {
  getDocMock.mockResolvedValue(snap(null));
  const s = await hydrateSubscriptionFromCloud("u-free");
  expect(s.tier).toBe("free");
  expect(isCloudConfirmed("u-free")).toBe(true);
});

it("successful read, Board Pass found: premium and confirmed (no wall by tier)", async () => {
  getDocMock.mockResolvedValue(snap({
    tier: "trial", plan: "trial_7day", trialStartDate: stamp(Date.now() - DAY), passType: "till_boards",
    passEnd: stamp(Date.now() + 90 * DAY), lastPaymentRef: "pay_1", pricePaidInr: 1917,
  }));
  const s = await hydrateSubscriptionFromCloud("u-pass");
  expect(s.tier).toBe("premium");
  expect(isCloudConfirmed("u-pass")).toBe(true);
});

it("a later error after a success clears the flag (fail open)", async () => {
  getDocMock.mockResolvedValueOnce(snap(null));
  await hydrateSubscriptionFromCloud("u-x");
  expect(isCloudConfirmed("u-x")).toBe(true);
  getDocMock.mockRejectedValue(new Error("boom"));
  await hydrateSubscriptionFromCloud("u-x");
  expect(isCloudConfirmed("u-x")).toBe(false);
});
