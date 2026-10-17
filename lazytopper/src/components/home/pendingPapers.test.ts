// @vitest-environment jsdom
//
// HOME-PENDING-1 — the read behind Home's "Waiting for your answers" card: which papers are
// listed, where "Upload answers" goes, and what it costs to read.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../services/firebaseClient", () => ({ firestoreDb: null }));

const cloud = vi.hoisted(() => ({
  sessionReads: 0,
  qpReads: 0,
  qp: [] as unknown[],
}));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    getSessionRecordsFromCloud: vi.fn(async (uid?: string | null) => {
      cloud.sessionReads += 1;
      return actual.loadLocalSessionRecords(uid);
    }),
  };
});
vi.mock("../../services/quickPracticePaperStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/quickPracticePaperStore")>();
  return {
    ...actual,
    listQuickPracticePapers: vi.fn(async () => {
      cloud.qpReads += 1;
      return cloud.qp;
    }),
  };
});

import {
  __resetPendingPapersForTests,
  loadPendingPapers,
  mergePendingPapers,
  pendingFromQuickPracticePapers,
  pendingFromSessionRecords,
  pendingPaperHref,
  QP_LOCAL_KEY_PREFIX,
  readPendingPapersLocal,
} from "./pendingPapers";
import { saveQuickPracticePaper, type QuickPracticePaperSnapshot } from "../../services/quickPracticePaperStore";
import type { SessionRecord } from "../../services/sessionRecords";

const UID = "student-1";
const USER = { uid: UID, isLocalSession: false };
const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 15, 6, 30); // 15 Oct 2026, midday IST

function rec(over: Partial<SessionRecord>): SessionRecord {
  return {
    id: "WS-M-TRI-01",
    worksheetId: "ws-1",
    surface: "worksheet",
    title: "Trigonometry worksheet",
    subject: "maths",
    topicKeys: ["trigonometry"],
    questionIds: ["q1"],
    marksAwarded: 0,
    marksTotal: 10,
    status: "pending-upload",
    fourType: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    sectionBreakdown: null,
    gradedAt: T0,
    perQuestionRef: "ref",
    dedupKey: "k",
    ...over,
  };
}

function qpSnap(over: Partial<QuickPracticePaperSnapshot> = {}): QuickPracticePaperSnapshot {
  return {
    code: "QP-M-AP-1234abcd",
    worksheetId: "qp-ws-1",
    subject: "Maths",
    persist: {
      title: "Arithmetic Progressions · Practice set",
      subject: "maths",
      topicSlug: "arithmetic-progressions",
      filterSignature: "sig",
      startedAt: T0 - DAY,
    },
    entries: [{ questionId: "b2", marks: 3 } as never],
    pending: [{ questionId: "b2", qNumber: 2, marks: 3, questionText: "Find a10." } as never],
    savedAt: T0 + DAY,
    ...over,
  };
}

function seedRecords(list: SessionRecord[]): void {
  window.localStorage.setItem(`lazytopper.user.${UID}.sessionRecords.v1`, JSON.stringify(list));
}
function seedQp(list: QuickPracticePaperSnapshot[]): void {
  window.localStorage.setItem(QP_LOCAL_KEY_PREFIX + UID, JSON.stringify(list));
}

beforeEach(() => {
  window.localStorage.clear();
  cloud.sessionReads = 0;
  cloud.qpReads = 0;
  cloud.qp = [];
  __resetPendingPapersForTests();
});

describe("which papers are waiting", () => {
  it("lists Worksheet / Chapter Test / Full Mock records that are pending-upload or partial", () => {
    const rows = pendingFromSessionRecords([
      rec({ id: "WS-1", surface: "worksheet", status: "pending-upload" }),
      rec({ id: "CT-M-TRI-02", surface: "chapter-test", status: "partial", title: "Trigonometry · Test #2" }),
      rec({ id: "FM-S-03", surface: "full-mock", status: "pending-upload", subject: "science", title: "Science · Mock #3" }),
    ]);
    expect(rows.map((r) => [r.surface, r.code, r.subject])).toEqual([
      ["worksheet", "WS-1", "maths"],
      ["chapter-test", "CT-M-TRI-02", "maths"],
      ["full-mock", "FM-S-03", "science"],
    ]);
  });

  it("CONTROL: graded papers, Check & Improve and Quick Practice records are never listed", () => {
    const rows = pendingFromSessionRecords([
      rec({ id: "WS-G", status: "graded" }),
      rec({ id: "CI-1", surface: "check-improve", status: "partial" }),
      rec({ id: "QP-1", surface: "quick-practice", status: "graded" }),
      rec({ id: "WS-P", status: "pending-upload" }),
    ]);
    expect(rows.map((r) => r.code)).toEqual(["WS-P"]);
  });

  it("a QP set saved with Upload later is listed while written questions wait, and not once none do", () => {
    expect(pendingFromQuickPracticePapers([qpSnap()]).map((r) => [r.surface, r.code, r.title])).toEqual([
      ["quick-practice", "QP-M-AP-1234abcd", "Arithmetic Progressions · Practice set"],
    ]);
    expect(pendingFromQuickPracticePapers([qpSnap({ pending: [] })])).toEqual([]);
  });

  it("merge: one row per paper, newest first", () => {
    const a = pendingFromSessionRecords([rec({ id: "WS-OLD", gradedAt: T0 - DAY })]);
    const b = pendingFromSessionRecords([rec({ id: "WS-NEW", gradedAt: T0 + DAY })]);
    expect(mergePendingPapers(a, b, a).map((r) => r.code)).toEqual(["WS-NEW", "WS-OLD"]);
  });
});

describe("deep links — each surface's own existing entry", () => {
  it("Worksheet: the generator with review=<code> (reopens the paper on its upload step)", () => {
    expect(pendingPaperHref("worksheet", { code: "WS-M-TRI-01", subject: "maths" })).toBe(
      "/practice/worksheets?review=WS-M-TRI-01&source=home&returnTo=%2F",
    );
  });
  it("Chapter Test: the chapter's test page with review=<code> (openStored -> openPendingUpload)", () => {
    expect(pendingPaperHref("chapter-test", { code: "CT-S-LIG-01", subject: "science", topicKeys: ["light-reflection"] })).toBe(
      "/chapter-test/10/Science/light-reflection?review=CT-S-LIG-01&source=home&returnTo=%2F",
    );
  });
  it("Full Mock: the mock page (its awaiting banner carries the Upload button — no direct URL exists)", () => {
    expect(pendingPaperHref("full-mock", { code: "FM-M-01", subject: "maths" })).toBe(
      "/full-mock/10/Maths?source=home&returnTo=%2F",
    );
  });
  it("Quick Practice: the practice page with review=<code> (the scorecard offers 'Upload written answers')", () => {
    expect(
      pendingPaperHref("quick-practice", { code: "QP-M-AP-1234abcd", subject: "maths", topicKeys: ["arithmetic-progressions"] }),
    ).toBe("/practice/10/Maths?topic=arithmetic-progressions&review=QP-M-AP-1234abcd&source=home&returnTo=%2F");
  });
});

describe("reads", () => {
  it("the QP device key is the store's own: a set saved by saveQuickPracticePaper is read back", () => {
    const { savedAt: _ignored, ...snap } = qpSnap();
    void _ignored;
    expect(saveQuickPracticePaper(USER as never, snap)).toBe(true);
    expect(readPendingPapersLocal(UID).map((r) => r.code)).toEqual(["QP-M-AP-1234abcd"]);
  });

  it("signed-out / local sessions read nothing (and touch no store)", async () => {
    seedRecords([rec({})]);
    expect(await loadPendingPapers(null)).toEqual([]);
    expect(await loadPendingPapers({ uid: UID, isLocalSession: true })).toEqual([]);
    expect(cloud.sessionReads + cloud.qpReads).toBe(0);
  });

  it("★ read cost: ONE hydration per tab — a second Home mount reads the cloud zero more times", async () => {
    seedRecords([rec({ id: "WS-1" })]);
    seedQp([qpSnap()]);
    expect((await loadPendingPapers(USER)).map((r) => r.code).sort()).toEqual(["QP-M-AP-1234abcd", "WS-1"]);
    expect([cloud.sessionReads, cloud.qpReads]).toEqual([1, 1]);
    await loadPendingPapers(USER);
    await loadPendingPapers(USER);
    expect([cloud.sessionReads, cloud.qpReads]).toEqual([1, 1]);
  });

  it("another device's QP set (cloud only) is listed", async () => {
    cloud.qp = [qpSnap({ code: "QP-M-AP-other999" })];
    expect((await loadPendingPapers(USER)).map((r) => r.code)).toEqual(["QP-M-AP-other999"]);
  });

  it("★ a QP set uploaded on THIS device after hydration does not come back from the stale cloud list", async () => {
    seedQp([qpSnap()]);
    cloud.qp = [qpSnap()];
    expect((await loadPendingPapers(USER)).map((r) => r.code)).toEqual(["QP-M-AP-1234abcd"]);
    // Graded here: the store deletes the device copy (and the server copy).
    seedQp([]);
    cloud.qp = [];
    expect(await loadPendingPapers(USER)).toEqual([]);
    expect(cloud.qpReads).toBe(2); // the device ring changed -> one refresh, not one per mount
  });
});
