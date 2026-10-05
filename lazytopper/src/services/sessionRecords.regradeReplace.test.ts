// @vitest-environment jsdom
/**
 * N5 (verifier, controller fix round 2026-10-05; owner ruling "re-grade replaces") — a session
 * record (and its per-question payload) is written as a FULL replace. With `{ merge: true }` an
 * optional field of an earlier write — e.g. the versioned `marksLostByType` — survived a re-grade
 * that no longer carries it, and the tutor's return opener (tutorRoundTrip `dominantLoss`) read the
 * stale marks instead of the re-grade. The fake Firestore below honours `merge` exactly as Firestore
 * does (merge = keep the fields the write omits; no merge = replace the document).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, Record<string, unknown>>();
vi.mock("./firebaseClient", () => ({ firestoreDb: { __fake: true } }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
    const prev = store.get(ref.path);
    store.set(ref.path, opts?.merge && prev ? { ...prev, ...data } : { ...data });
  },
  getDocs: async (col: { path: string }) => ({
    docs: [...store.entries()]
      .filter(([p]) => p.startsWith(`${col.path}/`) && !p.slice(col.path.length + 1).includes("/"))
      .map(([, d]) => ({ data: () => d })),
  }),
  getDoc: async (ref: { path: string }) => ({ exists: () => store.has(ref.path), data: () => store.get(ref.path) }),
}));

import { getSessionRecordsFromCloud, writeSessionRecord, type SessionRecord } from "./sessionRecords";
import { composeReturnOpener } from "../pages/tutor/tutorRoundTrip";
import { setActiveProgressUser } from "./studentProgressStore";

const user = { uid: "u-n5", isLocalSession: false } as never;
const lost = (m: Record<string, number>) => ({ conceptual: 0, calculation: 0, silly: 0, presentation: 0, unattempted: 0, untyped: 0, ...m });
const base: SessionRecord = {
  id: "CI-M-REAL-09",
  worksheetId: "ci:CI-M-REAL-09",
  surface: "check-improve",
  title: "Real Numbers",
  subject: "maths",
  topicKeys: ["real-numbers"],
  questionIds: [],
  marksAwarded: 3,
  marksTotal: 5,
  status: "graded",
  fourType: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
  sectionBreakdown: null,
  gradedAt: 1000,
  perQuestionRef: "ci:CI-M-REAL-09",
  dedupKey: "u-n5::CI-M-REAL-09",
};

beforeEach(() => {
  store.clear();
  localStorage.clear();
  setActiveProgressUser("u-n5");
});

describe("N5 — a re-grade FULLY replaces the stored record (no stale optional field survives)", () => {
  it("★ the first grade carried versioned marks; the re-grade carries none → the cloud record has none, and the tutor's opener reads the re-grade", async () => {
    // the first grade: a knowledge-gap loss, in marks
    writeSessionRecord(user, { ...base, marksLostByType: lost({ conceptual: 2 }), marksLostByTypeVersion: 1 });
    expect(composeReturnOpener({ ...base, marksLostByType: lost({ conceptual: 2 }), marksLostByTypeVersion: 1 }, "Real Numbers").text).toMatch(/method itself/);
    // the re-grade of the SAME paper: count-only (no marks), and its loss is careless
    writeSessionRecord(user, { ...base, fourType: { conceptual: 0, calculation: 2, silly: 0, presentation: 0 }, gradedAt: 2000 });
    await Promise.resolve();
    localStorage.clear(); // read the CLOUD copy, as another device (or a cleared browser) would
    const [rec] = await getSessionRecordsFromCloud("u-n5");
    expect(rec.gradedAt).toBe(2000);
    expect(rec.marksLostByType).toBeUndefined();
    expect(rec.marksLostByTypeVersion).toBeUndefined();
    const opener = composeReturnOpener(rec, "Real Numbers").text;
    expect(opener).toMatch(/slipped in the working/);
    expect(opener).not.toMatch(/method itself/);
  });

  it("CONTROL — fields the re-grade DOES carry are written as usual", async () => {
    writeSessionRecord(user, base);
    writeSessionRecord(user, { ...base, marksLostByType: lost({ calculation: 2 }), marksLostByTypeVersion: 1, gradedAt: 3000 });
    await Promise.resolve();
    localStorage.clear();
    const [rec] = await getSessionRecordsFromCloud("u-n5");
    expect(rec.marksLostByType).toEqual(lost({ calculation: 2 }));
  });
});
