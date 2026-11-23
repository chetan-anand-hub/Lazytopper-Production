import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdditionalUserInfo, setDoc } = vi.hoisted(() => ({ getAdditionalUserInfo: vi.fn(), setDoc: vi.fn() }));
vi.mock("firebase/auth", () => ({ getAdditionalUserInfo }));
vi.mock("../services/activityClient", () => ({ recordActivity: vi.fn() }));
vi.mock("../services/firebaseClient", () => ({ authClient: { currentUser: { uid: "u-expired" } } }));
vi.mock("../services/firestoreSdk", () => ({ withFirestore: setDoc, getFirestoreSdk: setDoc }));
vi.mock("../lib/packs/myPacksCache", () => ({ peekOwnsAnyPack: () => null }));

import { buyerScoreNote } from "./buyerScore";
import { peekPaidPremium } from "../services/subscriptionService";

/** BUYER-SCORE-1 - the customer check must be a pure read: an expired cached trial is never saved back, locally or to Firestore. */
const T0 = Date.parse("2026-11-20T03:30:00Z");

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setDoc.mockClear();
});

describe("existing-customer check is read-only", () => {
  it("an expired cached trial: no localStorage write to the subscription key, no Firestore call; still a prospect", () => {
    const key = "lazytopper.subscription.v1:u-expired";
    const expired = JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date(T0 - 30 * 86400000).toISOString() });
    window.localStorage.setItem(key, expired);
    const writes: string[] = [];
    const orig = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k: string, v: string) {
      writes.push(k);
      return orig.call(this, k, v);
    });
    try {
      expect(peekPaidPremium("u-expired")).toBe(false);
      buyerScoreNote({ kind: "page", path: "/packs" }, T0);
    } finally {
      spy.mockRestore();
    }
    expect(writes.filter((k) => k !== "lazytopper.buyerScore")).toEqual([]);
    expect(window.localStorage.getItem(key)).toBe(expired);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("a cached live pass reads as paid; a cached trial does not", () => {
    window.localStorage.setItem("lazytopper.subscription.v1:u-expired", JSON.stringify({ tier: "premium", plan: "pass_month", passEnd: new Date(Date.now() + 5 * 86400000).toISOString() }));
    expect(peekPaidPremium("u-expired")).toBe(true);
    window.localStorage.setItem("lazytopper.subscription.v1:u-expired", JSON.stringify({ tier: "trial", plan: "trial_7day", trialStartDate: new Date().toISOString() }));
    expect(peekPaidPremium("u-expired")).toBe(false);
  });
});
