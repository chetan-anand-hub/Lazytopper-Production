/**
 * BRIDGE-PANEL-1 round 2 - the panel's reads: only PACK-paper records (a `PK-` range query, not the whole collection, once per tab),
 * the server tier decides the paid pass before the cache does not, and an unknown entitlement is reported as unknown.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fsCalls = vi.hoisted(() => ({ where: [] as unknown[][], getDocs: 0, docs: [] as unknown[], fail: false }));
vi.mock("../../services/firestoreSdk", () => ({
  isFirestoreEnabled: () => true,
  withFirestore: async (use: (h: unknown) => unknown) =>
    use({
      db: {},
      fs: {
        collection: (...a: unknown[]) => ({ path: a.slice(1).join("/") }),
        where: (...a: unknown[]) => {
          fsCalls.where.push(a);
          return a;
        },
        query: (...a: unknown[]) => a,
        getDocs: async () => {
          fsCalls.getDocs += 1;
          if (fsCalls.fail) throw new Error("offline");
          return { docs: fsCalls.docs.map((d) => ({ data: () => d })) };
        },
      },
    }),
}));
const sub = vi.hoisted(() => ({ hydrate: vi.fn() }));
vi.mock("../../services/subscriptionService", () => ({
  hydrateSubscriptionFromCloud: (...a: unknown[]) => sub.hydrate(...a),
  isPaidPremium: (s: { tier?: string } | null) => s?.tier === "premium",
}));
const lim = vi.hoisted(() => ({ on: true, body: null as unknown, status: 200 }));
vi.mock("../../services/limitsClient", () => ({ LIMITS_ENDPOINT: "/api/usage/limits", MINT_TIMEOUT_MS: 4000, isLimitsClientEnabled: () => lim.on }));
vi.mock("../../ai/paidCallHeaders", () => ({ paidJsonHeaders: async () => ({ "X-Lazytopper-Uid": "u1" }) }));

import { __resetBridgeReadsForTests, prepareBridgeData, readPackRecords } from "./useMyPacksBridge";

const pk = (id: string) => ({ id, surface: "chapter-test", gradedAt: 1, status: "graded", topicKeys: [], questionIds: [] });

beforeEach(() => {
  __resetBridgeReadsForTests();
  fsCalls.where = [];
  fsCalls.getDocs = 0;
  fsCalls.docs = [];
  fsCalls.fail = false;
  sub.hydrate.mockReset();
  sub.hydrate.mockResolvedValue({ tier: "free" });
  lim.on = true;
  lim.status = 200;
  lim.body = { enforced: true, tier: "free", grade: { "chapter-test": { firstFreeAvailable: true } } };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: lim.status === 200, text: async () => JSON.stringify(lim.body) })));
  localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("readPackRecords", () => {
  it("queries ONLY the PK- range of the student's records, once per tab, merged with this device's pack records", async () => {
    fsCalls.docs = [pk("PK-M-RN-CT1"), { id: "CT-xyz", surface: "chapter-test", gradedAt: 1 }];
    localStorage.setItem("lazytopper.user.u1.sessionRecords.v1", JSON.stringify([{ ...pk("PK-M-RN-WS"), surface: "worksheet" }, { ...pk("WS-1"), surface: "worksheet" }]));
    const a = await readPackRecords("u1");
    expect(fsCalls.where).toEqual([["id", ">=", "PK-"], ["id", "<", "PK."]]);
    expect(a.map((r) => r.id).sort()).toEqual(["PK-M-RN-CT1", "PK-M-RN-WS"]);
    await readPackRecords("u1");
    expect(fsCalls.getDocs).toBe(1);
  });
  it("a failed cloud query keeps the device list and is asked again next time", async () => {
    fsCalls.fail = true;
    expect(await readPackRecords("u1")).toEqual([]);
    fsCalls.fail = false;
    await readPackRecords("u1");
    expect(fsCalls.getDocs).toBe(2);
  });
});

describe("prepareBridgeData - entitlement", () => {
  it("server tier free -> known, not paid (no subscription read)", async () => {
    const d = await prepareBridgeData({ uid: "u1" }, false);
    expect(d).toMatchObject({ paidPass: false, entitlementKnown: true });
    expect(d?.allowance?.firstFree).toEqual({ "chapter-test": true });
    expect(sub.hydrate).not.toHaveBeenCalled();
  });
  it("server tier premium wins over a stale Basic cache (no Board Pass card for a pass holder on a new device)", async () => {
    lim.body = { enforced: true, tier: "premium" };
    expect(await prepareBridgeData({ uid: "u1" }, false)).toMatchObject({ paidPass: true, entitlementKnown: true });
  });
  it("server tier unknown -> the cloud subscription decides; a failure -> unknown", async () => {
    lim.on = false;
    sub.hydrate.mockResolvedValue({ tier: "premium" });
    expect(await prepareBridgeData({ uid: "u1" }, false)).toMatchObject({ paidPass: true, entitlementKnown: true });
    sub.hydrate.mockRejectedValue(new Error("x"));
    expect(await prepareBridgeData({ uid: "u1" }, false)).toMatchObject({ paidPass: false, entitlementKnown: false });
  });
  it("signed out / local session -> null", async () => {
    expect(await prepareBridgeData(null, false)).toBeNull();
    expect(await prepareBridgeData({ uid: "u1", isLocalSession: true }, false)).toBeNull();
  });
});
