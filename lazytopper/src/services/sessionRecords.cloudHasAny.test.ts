import { describe, it, expect, vi, beforeEach } from "vitest";

const { getDocs, limit, query, collection, fb } = vi.hoisted(() => ({
  getDocs: vi.fn(),
  limit: vi.fn((n: number) => ({ limit: n })),
  query: vi.fn((...a: unknown[]) => ({ q: a })),
  collection: vi.fn((...a: unknown[]) => ({ c: a })),
  fb: { firestoreDb: {} as unknown },
}));
vi.mock("firebase/firestore", () => ({ getDocs, limit, query, collection, doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn() }));
vi.mock("./firebaseClient", () => ({
  get firestoreDb() {
    return fb.firestoreDb;
  },
}));

import { cloudHasAnySessionRecord } from "./sessionRecords";

// START-HERE-1 — the zero-graded check asks the cloud ONE question, cheaply, and never turns
// "could not tell" into "no records".
beforeEach(() => {
  getDocs.mockReset();
  fb.firestoreDb = {};
});

describe("cloudHasAnySessionRecord", () => {
  it("reads ONE document (limit 1), not the collection", async () => {
    getDocs.mockResolvedValue({ empty: false });
    expect(await cloudHasAnySessionRecord("u1")).toBe(true);
    expect(limit).toHaveBeenCalledWith(1);
  });
  it("an empty collection is a real false", async () => {
    getDocs.mockResolvedValue({ empty: true });
    expect(await cloudHasAnySessionRecord("u1")).toBe(false);
  });
  it("★ any error is null (could not tell), never false", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));
    expect(await cloudHasAnySessionRecord("u1")).toBeNull();
  });
  it("★ no Firestore, or no uid, is null and makes no read", async () => {
    fb.firestoreDb = null;
    expect(await cloudHasAnySessionRecord("u1")).toBeNull();
    fb.firestoreDb = {};
    expect(await cloudHasAnySessionRecord(null)).toBeNull();
    expect(getDocs).not.toHaveBeenCalled();
  });
});
