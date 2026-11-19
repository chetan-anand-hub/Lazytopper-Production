// VALIDITY-FEB27 - the CLOCK test. Date-sensitive: it moves "now" across 28 Feb 2027 and asserts both products
// (the Board Pass and the Test Series) are valid up to the last millisecond and EXPIRED + OFFERED AGAIN after it.
// Registered in scripts/testClock/date-sensitive-tests.json.

import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/firebaseClient", () => ({ firestoreDb: { __fakeDb: true } }));
vi.mock("firebase/firestore", () => ({
  doc: (...args: unknown[]) => ({ __ref: args }),
  getDoc: () => Promise.resolve({ exists: () => false, data: () => undefined }),
  setDoc: () => Promise.resolve(),
  serverTimestamp: () => ({ __serverTimestampSentinel: true }),
}));

import { loadSubscription, isPremiumAccess } from "../services/subscriptionService";
import { endedPackMessage } from "../lib/packs/packEnded";
import { VALIDITY_END_MS, VALIDITY_LABEL } from "./validity";

const require = createRequire(import.meta.url);
const { deriveEffectiveTier } = require("../../server/services/entitlement.cjs") as {
  deriveEffectiveTier: (doc: unknown, nowMs: number) => { tier: string; passEndsAtMs?: number };
};
const { coveredTillBoards } = require("../../server/routes/parentPay.cjs") as { coveredTillBoards: (s: unknown, n: number) => boolean };
const { isRedownloadOpen } = require("../../server/services/packTerms.cjs") as { isRedownloadOpen: (p: unknown, n: number) => boolean };
const { validityEndMsFor } = require("../../server/services/validityWindow.cjs") as { validityEndMsFor: (n: number) => number };

const UID = "u-validity";
const KEY = `lazytopper.subscription.v1:${UID}`;
const ist = (iso: string) => Date.parse(`${iso}+05:30`);
const LAST_MS = VALIDITY_END_MS; // 28 Feb 2027 23:59:59.999 IST
const OLD_END_ISO = new Date(ist("2027-02-17T23:59:59.999")).toISOString();

function cacheBoardPass(passEndIso: string): void {
  localStorage.setItem(KEY, JSON.stringify({ tier: "premium", plan: "pass_till_boards", passEnd: passEndIso, passType: "till_boards", lastPaymentRef: "pay_x" }));
}
const stored = (endMs: number) => ({ tier: "premium", plan: "pass_till_boards", passType: "till_boards", passEnd: { toMillis: () => endMs, toDate: () => new Date(endMs) }, lastPaymentRef: "p", pricePaidInr: 1917 });

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("VALIDITY-FEB27 - the Board Pass across 28 Feb 2027 (client, on the device clock)", () => {
  it("a pass stored to 17 Feb 2027 is premium through the Science exam and up to the last ms of 28 Feb, then free", () => {
    for (const at of ["2027-02-17T20:00:00", "2027-02-22T09:00:00", "2027-02-28T23:59:59.998"]) {
      vi.setSystemTime(ist(at));
      cacheBoardPass(OLD_END_ISO);
      const s = loadSubscription(UID);
      expect(isPremiumAccess(s), at).toBe(true);
      expect(new Date(s.passEnd as string).getTime(), at).toBe(LAST_MS);
    }
    vi.setSystemTime(LAST_MS + 1);
    cacheBoardPass(OLD_END_ISO);
    expect(isPremiumAccess(loadSubscription(UID))).toBe(false);
    expect(loadSubscription(UID).tier).toBe("free");
  });

  it("a pass stored LATER than 28 Feb is never shortened", () => {
    const later = new Date(ist("2027-04-30T23:59:59.999")).toISOString();
    vi.setSystemTime(ist("2027-03-15T12:00:00"));
    cacheBoardPass(later);
    const s = loadSubscription(UID);
    expect(isPremiumAccess(s)).toBe(true);
    expect(s.passEnd).toBe(later);
  });
});

describe("VALIDITY-FEB27 - the Board Pass and the Test Series across 28 Feb 2027 (server, on the clock)", () => {
  it("up to the last ms the pass is premium and 'covered'; from 1 Mar it is free and the Board Pass is OFFERED AGAIN", () => {
    const doc = stored(ist("2027-02-17T23:59:59.999")); // an existing holder
    vi.setSystemTime(ist("2027-02-25T12:00:00"));
    expect(deriveEffectiveTier(doc, Date.now()).tier).toBe("premium");
    expect(coveredTillBoards(doc, Date.now())).toBe(true);
    vi.setSystemTime(ist("2027-03-01T09:00:00"));
    expect(deriveEffectiveTier(doc, Date.now()).tier).toBe("free");
    expect(coveredTillBoards(doc, Date.now()), "expired: nothing blocks buying it again").toBe(false);
  });

  it("a Board Pass bought after 28 Feb is not born expired: it runs to 28 Feb the next year", () => {
    vi.setSystemTime(ist("2027-03-10T12:00:00"));
    expect(validityEndMsFor(Date.now())).toBe(ist("2028-02-28T23:59:59.999"));
  });

  it("the Test Series is owned until 28 Feb 23:59:59.999 and expired from 1 Mar (and the ended message says so)", () => {
    const pack = { packId: "test_series:all", sku: "test_series", target: "all", paidAt: ist("2026-11-20T12:00:00") };
    vi.setSystemTime(ist("2027-02-28T23:59:59.000"));
    expect(isRedownloadOpen(pack, Date.now())).toBe(true);
    vi.setSystemTime(ist("2027-03-01T00:00:00"));
    expect(isRedownloadOpen(pack, Date.now())).toBe(false);
    expect(endedPackMessage("Test Series", { sku: "test_series", redownloadUntil: VALIDITY_LABEL })).toBe("Your Test Series was valid till 28 Feb 2027 and has ended.");
  });
});
