// @vitest-environment jsdom
//
// QP-UPLOAD-LATER — the Quick Practice "Upload later" snapshot store: device round-trip,
// photos never kept, signed-out / local sessions keep nothing, delete clears.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./firebaseClient", () => ({ firestoreDb: null }));

const store = await import("./quickPracticePaperStore");
type Snap = Parameters<typeof store.saveQuickPracticePaper>[1];
type User = Parameters<typeof store.saveQuickPracticePaper>[0];

const USER = { uid: "student-1", isLocalSession: false } as unknown as User;
const LOCAL = { uid: "local-1", isLocalSession: true } as unknown as User;

const snap = (code = "QP-M-AP-1234abcd"): Snap => ({
  code,
  worksheetId: "qp-ws-1",
  subject: "Maths",
  persist: {
    title: "Arithmetic Progressions · Practice set",
    subject: "maths",
    topicSlug: "arithmetic-progressions",
    filterSignature: "sig",
    startedAt: 1_700_000_000_000,
  },
  entries: [
    { questionId: "b1", marks: 1, mcq: "correct" },
    { questionId: "b2", marks: 3 },
  ],
  pending: [
    {
      questionId: "b2",
      qNumber: 2,
      marks: 3,
      questionText: "Find the 10th term.",
      imageBase64: "AAAA",
      imageMimeType: "image/jpeg",
      textAnswer: "a10 = 29",
    },
  ],
});

beforeEach(() => {
  window.localStorage.clear();
});

describe("quickPracticePaperStore", () => {
  it("round-trips a snapshot on this device (load + list)", async () => {
    expect(store.saveQuickPracticePaper(USER, snap())).toBe(true);
    const back = await store.loadQuickPracticePaper(USER, "QP-M-AP-1234abcd");
    expect(back?.worksheetId).toBe("qp-ws-1");
    expect(back?.entries).toHaveLength(2);
    expect(back?.pending.map((p) => p.qNumber)).toEqual([2]);
    const list = await store.listQuickPracticePapers(USER);
    expect(list.map((s) => s.code)).toEqual(["QP-M-AP-1234abcd"]);
  });

  it("never keeps an answer photo (a typed draft stays)", async () => {
    store.saveQuickPracticePaper(USER, snap());
    const back = await store.loadQuickPracticePaper(USER, "QP-M-AP-1234abcd");
    expect(back?.pending[0].imageBase64).toBeNull();
    expect(back?.pending[0].imageMimeType).toBeNull();
    expect(back?.pending[0].textAnswer).toBe("a10 = 29");
    expect(window.localStorage.getItem("lazytopper.qp.papers.v1.student-1")).not.toContain("AAAA");
  });

  it("keeps nothing for a signed-out or local session", async () => {
    expect(store.saveQuickPracticePaper(null, snap())).toBe(false);
    expect(store.saveQuickPracticePaper(LOCAL, snap())).toBe(false);
    expect(await store.listQuickPracticePapers(LOCAL)).toEqual([]);
    expect(window.localStorage.length).toBe(0);
  });

  it("re-saving the same code replaces it; delete clears it", async () => {
    store.saveQuickPracticePaper(USER, snap());
    store.saveQuickPracticePaper(USER, { ...snap(), pending: [] });
    // A snapshot with nothing waiting is not listed.
    expect(await store.listQuickPracticePapers(USER)).toEqual([]);
    store.saveQuickPracticePaper(USER, snap());
    store.deleteQuickPracticePaper(USER, "QP-M-AP-1234abcd");
    expect(await store.loadQuickPracticePaper(USER, "QP-M-AP-1234abcd")).toBeNull();
  });
});
