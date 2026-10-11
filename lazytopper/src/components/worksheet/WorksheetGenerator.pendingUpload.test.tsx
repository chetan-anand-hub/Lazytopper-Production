// PENDING-UPLOAD-1 PR-2 (option B, DECISION 50a) - a downloaded Worksheet can be uploaded later.
// Pins: download writes ONE pending record (id = code) + a server snapshot and never replaces a
// graded record; a pending history row / banner opens the SAME paper's upload step from this
// device's copy, else the server snapshot; neither -> an honest message.

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: USER }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));
// The panel is a light stub in the routing tests; the "upload immediately" pin turns the REAL one on.
const panel = vi.hoisted(() => ({ real: false }));
vi.mock("./WorksheetGradePanel", async (importOriginal) => {
  const Real = (await importOriginal<typeof import("./WorksheetGradePanel")>()).default;
  return {
    default: (props: { ws: PersistedWorksheet }) =>
      panel.real ? <Real {...props} /> : <div data-testid="grade-panel">{props.ws.code}</div>,
  };
});
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
// The QR hand-off fills the SAME state the file input fills - the shortest honest way to put a file on the panel.
vi.mock("../qr/QrAnswerHandoff", () => ({
  default: ({ onImageReceived }: { onImageReceived: (v: { imageBase64: string; imageMimeType: string }) => void }) => (
    <button type="button" onClick={() => onImageReceived({ imageBase64: "JVBERi0xLjQ=", imageMimeType: "application/pdf" })}>
      qr-deliver
    </button>
  ),
}));
vi.mock("./worksheetPdfExport", () => ({ exportWorksheetPdf: async () => {}, exportGradedWorksheetPdf: async () => {} }));
const gradeCalls = vi.hoisted(() => ({ reqs: [] as Array<{ worksheetId: string; questions: Array<{ qNumber: number; marks: number }> }> }));
vi.mock("../../ai/aiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ai/aiClient")>();
  return {
    ...actual,
    gradeWorksheet: async (req: { worksheetId: string; questions: Array<{ qNumber: number; marks: number }> }) => {
      gradeCalls.reqs.push(req);
      return {
        ok: true,
        worksheetId: req.worksheetId,
        results: req.questions.map((q) => ({
          qNumber: q.qNumber, ok: true, couldNotRead: false, totalMarks: q.marks, marksAwarded: q.marks, percentage: 100,
          annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
        })),
        totalQuestions: req.questions.length, gradedCount: req.questions.length, pendingCount: 0,
        gradedMarksAwarded: req.questions.reduce((a, q) => a + q.marks, 0),
        gradedMarksTotal: req.questions.reduce((a, q) => a + q.marks, 0),
        worksheetTotalMarks: req.questions.reduce((a, q) => a + q.marks, 0),
      };
    },
  };
});

const fs = vi.hoisted(() => ({
  docs: {} as Record<string, unknown>,
  failRecordRead: false,
  fromCache: false,
  writes: [] as Array<{ path: string; data: unknown }>,
  deleted: [] as string[],
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async (ref: { path: string }, data: unknown) => {
    fs.writes.push({ path: ref.path, data });
  }),
  getDoc: vi.fn(async (ref: { path: string }) => {
    if (fs.failRecordRead && ref.path.includes("/records/")) throw new Error("offline");
    const d = fs.docs[ref.path];
    return { exists: () => d != null, data: () => d, metadata: { fromCache: fs.fromCache } };
  }),
  deleteDoc: vi.fn(async (ref: { path: string }) => {
    fs.deleted.push(ref.path);
  }),
}));
const cloud = vi.hoisted(() => ({ list: [] as unknown[], mirrorOnRead: false }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return {
    ...actual,
    // Like the real one: a successful cloud read refreshes the device mirror.
    getSessionRecordsFromCloud: async (uid?: string | null) => {
      if (cloud.mirrorOnRead) for (const r of cloud.list as SessionRecord[]) actual.writeSessionRecord({ uid: uid ?? "", isLocalSession: false } as never, r);
      return cloud.list;
    },
  };
});

import WorksheetGenerator from "./WorksheetGenerator";
import { saveWorksheetSession } from "../../services/worksheetSessionStore";
import {
  buildWorksheetSessionRecord,
  loadLocalSessionRecords,
  writeSessionRecord,
  type SessionRecord,
} from "../../services/sessionRecords";
import { recordWorksheetDownload, reapGradedWorksheetSnapshots } from "../../services/worksheetPaperStore";
import { bankIndexEntries } from "../../data/bankChapters/bankIdIndex";

function paper(id: string, code: string): PersistedWorksheet {
  return {
    worksheetId: id,
    createdAt: "2026-10-10",
    title: `Real Numbers ${code}`,
    subject: "Maths",
    grade: "10",
    sectionFilter: "All",
    totalMarks: 4,
    code,
    name: `Worksheet ${code}`,
    questions: [
      { qNumber: 1, id: `${id}-a`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "q1", options: ["1", "2"], answer: "1" },
      { qNumber: 2, id: `${id}-c`, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "C", marks: 3, questionText: "q2", solutionSteps: ["a"] },
    ],
  };
}
const gradedResponse = (p: PersistedWorksheet) => ({
  ok: true as const,
  worksheetId: p.worksheetId,
  results: p.questions.map((q) => ({
    qNumber: q.qNumber,
    ok: true,
    totalMarks: q.marks,
    marksAwarded: q.marks,
    percentage: 100,
    annotatedSteps: [],
    mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    teacherNote: "",
  })),
  totalQuestions: 2,
  gradedCount: 2,
  pendingCount: 0,
  gradedMarksAwarded: 4,
  gradedMarksTotal: 4,
  worksheetTotalMarks: 4,
});

beforeEach(() => {
  localStorage.clear();
  fs.docs = {};
  fs.failRecordRead = false;
  fs.fromCache = false;
  cloud.mirrorOnRead = false;
  fs.writes = [];
  fs.deleted = [];
  cloud.list = [];
  panel.real = false;
  gradeCalls.reqs = [];
});
afterEach(() => cleanup());

async function seedPending(p: PersistedWorksheet) {
  await recordWorksheetDownload(USER as never, p, { code: p.code!, name: p.name! });
}

describe("PENDING-UPLOAD-1 PR-2 · download writes the pending record + snapshot", () => {
  it("★ one pending record (id = code, nothing graded) and a snapshot under worksheetPapers/{code}", async () => {
    const p = paper("ws-1", "WS-M-REALNUMBERS-01");
    await seedPending(p);
    const rec = loadLocalSessionRecords("student-1").filter((r) => r.surface === "worksheet");
    expect(rec).toHaveLength(1);
    expect(rec[0]).toMatchObject({ id: "WS-M-REALNUMBERS-01", worksheetId: "ws-1", status: "pending-upload", marksAwarded: 0 });
    expect(fs.writes.map((w) => w.path).filter((x) => x.includes("worksheetPapers"))).toEqual(["sessionRecords/student-1/worksheetPapers/WS-M-REALNUMBERS-01"]);
    await seedPending(p); // a re-download overwrites, never duplicates
    expect(loadLocalSessionRecords("student-1").filter((r) => r.surface === "worksheet")).toHaveLength(1);
  });

  it("★ a record that already carries a grade is NEVER replaced by a re-download", async () => {
    const p = paper("ws-2", "WS-M-REALNUMBERS-02");
    const graded = buildWorksheetSessionRecord(p, gradedResponse(p) as never, { code: p.code! }, "student-1") as SessionRecord;
    fs.docs[`sessionRecords/student-1/records/${p.code}`] = graded;
    writeSessionRecord(USER as never, graded);
    await seedPending(p);
    expect(loadLocalSessionRecords("student-1").find((r) => r.id === p.code)?.status).toBe("graded");
    expect(fs.writes.filter((w) => w.path.includes("worksheetPapers"))).toHaveLength(0);
  });

  it("★ a STALE local mirror cannot overwrite a grade made on another device: the graded cloud doc wins, and an unreadable doc writes nothing", async () => {
    const p = paper("ws-5", "WS-M-REALNUMBERS-05");
    const graded = buildWorksheetSessionRecord(p, gradedResponse(p) as never, { code: p.code! }, "student-1") as SessionRecord;
    // this device's mirror still says "pending"; the cloud (the other device's grade) says graded
    writeSessionRecord(USER as never, buildWorksheetSessionRecord(p, { ...gradedResponse(p), gradedCount: 0, pendingCount: 2 } as never, { code: p.code! }, "student-1") as SessionRecord);
    fs.docs[`sessionRecords/student-1/records/${p.code}`] = graded;
    const before = fs.writes.length;
    await seedPending(p);
    expect(fs.writes.length).toBe(before);
    fs.docs = {};
    fs.failRecordRead = true; // offline: cannot prove there is no grade -> write nothing
    await seedPending(p);
    expect(fs.writes.length).toBe(before);
    fs.failRecordRead = false;
    fs.fromCache = true; // a cache-only (offline) answer proves nothing either
    await seedPending(p);
    expect(fs.writes.length).toBe(before);
  });

  it("signed-out / local sessions write nothing; a graded worksheet's snapshot is reaped", async () => {
    await recordWorksheetDownload({ uid: "x", isLocalSession: true } as never, paper("ws-3", "WS-M-X-01"), { code: "WS-M-X-01", name: "n" });
    expect(loadLocalSessionRecords("x")).toHaveLength(0);
    const p = paper("ws-4", "WS-M-REALNUMBERS-04");
    await seedPending(p);
    const graded = buildWorksheetSessionRecord(p, gradedResponse(p) as never, { code: p.code! }, "student-1") as SessionRecord;
    reapGradedWorksheetSnapshots(USER as never, [graded]);
    expect(fs.deleted).toContain("sessionRecords/student-1/worksheetPapers/WS-M-REALNUMBERS-04");
  });
});

describe("PENDING-UPLOAD-1 PR-2 · history row -> the same paper's upload step", () => {
  async function mountWithTwoPending() {
    const a = paper("ws-a", "WS-M-REALNUMBERS-0A");
    const b = paper("ws-b", "WS-M-REALNUMBERS-0B");
    await seedPending(a);
    await seedPending(b);
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    return { a, b };
  }
  const openRow = async (b: PersistedWorksheet) => {
    fireEvent.click(await screen.findByRole("button", { name: /See all 2/ }));
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(`Re-open the ${b.title}`) }));
  };

  it("★ >=2 pending: a row opens the upload step on that paper, from this device's copy", async () => {
    const { b } = await mountWithTwoPending();
    saveWorksheetSession(b);
    await openRow(b);
    await waitFor(() => expect(screen.getByTestId("grade-panel").textContent).toBe(b.code));
  });

  it("★ this device's copy is gone -> the server snapshot opens the SAME paper and re-seeds the device", async () => {
    const { b } = await mountWithTwoPending();
    fs.docs[`sessionRecords/student-1/worksheetPapers/${b.code}`] = { code: b.code, name: b.name, paper: b, savedAt: 1 };
    await openRow(b);
    await waitFor(() => expect(screen.getByTestId("grade-panel").textContent).toBe(b.code));
    expect(JSON.parse(localStorage.getItem("lazytopper.worksheets.v1") ?? "[]")[0].worksheetId).toBe("ws-b");
  });

  it("★ a PARTIAL row with no copy anywhere keeps its read-only stored scorecard (its marks stay reachable)", async () => {
    const p = paper("ws-p", "WS-M-REALNUMBERS-0P");
    const part = buildWorksheetSessionRecord(p, { ...gradedResponse(p), gradedCount: 1, pendingCount: 1, gradedMarksAwarded: 1, gradedMarksTotal: 1 } as never, { code: p.code! }, "student-1") as SessionRecord;
    expect(part.status).toBe("partial");
    const other = paper("ws-q", "WS-M-REALNUMBERS-0Q");
    writeSessionRecord(USER as never, part);
    await seedPending(other);
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /See all 2/ }));
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(`Re-open the ${p.title}`) }));
    await screen.findByRole("button", { name: "Done" }); // the read-only stored scorecard
    expect(document.body.textContent).not.toContain("couldn’t find the saved copy");
  });

  it("★ second device: a pending record that exists only in the cloud shows up (the mirror is refreshed on arrival)", async () => {
    const p = paper("ws-c", "WS-M-REALNUMBERS-0C");
    cloud.list = [buildWorksheetSessionRecord(p, { ...gradedResponse(p), gradedCount: 0, pendingCount: 2 } as never, { code: p.code! }, "student-1")];
    cloud.mirrorOnRead = true;
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/1 worksheet is awaiting your answer sheet/)).toBeInTheDocument();
  });

  it("★ neither copy -> the honest message, no paper opened", async () => {
    const { b } = await mountWithTwoPending();
    await openRow(b);
    await waitFor(() => expect(document.body.textContent).toContain("We couldn’t find the saved copy of this worksheet"));
    expect(screen.queryByTestId("grade-panel")).toBeNull();
  });
});

describe("PENDING-UPLOAD-1 PR-2 · D56a pin: generate -> download -> upload IMMEDIATELY -> graded on the SAME code", () => {
  // RED if the WorksheetGradePanel mount is removed from the generated view (no 'Grade my answers'), or if
  // gradeWorksheetAndRecord stops writing the record (the pending record never becomes graded).
  it("★★ the student who does not 'upload later' grades through the real panel and the record the download wrote becomes graded under the SAME code and worksheetId", async () => {
    panel.real = true;
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.queryByText("Loading questions…")).toBeNull(), { timeout: 60000 });
    const preview = screen.getAllByRole("button", { name: /Preview worksheet/i })[0];
    await waitFor(() => expect(preview).not.toBeDisabled());
    fireEvent.click(preview);
    fireEvent.click(await screen.findByRole("button", { name: /Generate worksheet/i }, { timeout: 60000 }));
    fireEvent.click(await screen.findByRole("button", { name: /Worksheet \(questions\)/ }));
    // the download wrote the pending record under the frozen code
    let code = "";
    await waitFor(() => {
      const rec = loadLocalSessionRecords("student-1").filter((r) => r.surface === "worksheet");
      expect(rec).toHaveLength(1);
      expect(rec[0].status).toBe("pending-upload");
      code = rec[0].id;
    }, { timeout: 20000 });
    const worksheetId = loadLocalSessionRecords("student-1").find((r) => r.id === code)!.worksheetId;

    // ...and the student uploads straight away, through the panel mounted in the generated view
    fireEvent.click(await screen.findByRole("button", { name: "qr-deliver" }));
    fireEvent.click(await screen.findByRole("button", { name: /Grade my answers/ }));
    await waitFor(() => {
      const rec = loadLocalSessionRecords("student-1").filter((r) => r.surface === "worksheet");
      expect(rec).toHaveLength(1); // the SAME record, not a second one
      expect(rec[0].id).toBe(code);
      expect(rec[0].status).toBe("graded");
      expect(rec[0].marksAwarded).toBeGreaterThan(0);
    }, { timeout: 30000 });
    expect(gradeCalls.reqs).toHaveLength(1);
    expect(gradeCalls.reqs[0].worksheetId).toBe(worksheetId);
  }, 120000);
});

// PAPER-REBUILD-1 (cofounder D102/D103b-c): a pending worksheet with NO copy on this device or online
// is rebuilt from its record's own questionIds — exactly those ids, in that order, through the
// generator's own bank-row map — and both stores are seeded. One id that no longer resolves -> the
// honest message, never a partial paper. A snapshot, when present, still wins.
describe("PAPER-REBUILD-1 · a pending worksheet with no saved copy", () => {
  /** Real served Real Numbers ids, deliberately NOT in bank order (the rebuild must keep the record's order). */
  function realIds(n: number): string[] {
    const ids: string[] = [];
    for (const [id, meta] of bankIndexEntries()) {
      if (meta.topicKey === "real-numbers") ids.push(id);
      if (ids.length >= n) break;
    }
    return ids.reverse();
  }
  /** The record an old download wrote, with its paper on NO store (pre-#1062 / failed snapshot write). */
  function writeOrphanPending(code: string, wsId: string, ids: string[]): SessionRecord {
    const p: PersistedWorksheet = {
      ...paper(wsId, code),
      questions: ids.map((id, i) => ({ qNumber: i + 1, id, subject: "Maths", topicKey: "real-numbers", topicLabel: "Real Numbers", section: "A", marks: 1, questionText: "x" })),
    };
    const rec = buildWorksheetSessionRecord(
      p,
      { ...gradedResponse(p), gradedCount: 0, pendingCount: ids.length, gradedMarksAwarded: 0, gradedMarksTotal: 0 } as never,
      { code },
      "student-1",
    ) as SessionRecord;
    expect(rec.status).toBe("pending-upload");
    writeSessionRecord(USER as never, rec);
    return rec;
  }
  async function openFromHistory(title: string) {
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=topic&topic=real-numbers"]}>
        <WorksheetGenerator />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /See all 2/ }));
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(`Re-open the ${title}`) }));
  }
  const seededPaper = () => JSON.parse(localStorage.getItem("lazytopper.worksheets.v1") ?? "[]")[0] as PersistedWorksheet | undefined;
  const snapshotWrites = () => fs.writes.filter((w) => w.path.includes("worksheetPapers"));

  it("★ (b) rebuilt EXACTLY from the record's ids (same ids, same order), opens on the SAME code, and seeds both stores", async () => {
    const ids = realIds(4);
    expect(ids).toHaveLength(4);
    const rec = writeOrphanPending("WS-M-REALNUMBERS-0R", "ws-r", ids);
    writeOrphanPending("WS-M-REALNUMBERS-0S", "ws-s", realIds(2));
    await openFromHistory(rec.title);
    await waitFor(() => expect(screen.getByTestId("grade-panel").textContent).toBe(rec.id));
    const seeded = seededPaper();
    expect(seeded?.worksheetId, "the SAME worksheetId, so the grade attaches to the same record").toBe("ws-r");
    expect(seeded?.code).toBe(rec.id);
    expect(seeded?.questions.map((q) => q.id), "exact ids, record order").toEqual(ids);
    expect(seeded?.questions.map((q) => q.qNumber)).toEqual([1, 2, 3, 4]);
    expect(seeded?.questions.every((q) => q.questionText && q.questionText !== "x"), "today's bank text").toBe(true);
    expect(snapshotWrites().map((w) => w.path)).toEqual([`sessionRecords/student-1/worksheetPapers/${rec.id}`]);
    expect(((snapshotWrites()[0].data as { paper: PersistedWorksheet }).paper.questions).map((q) => q.id)).toEqual(ids);
  });

  it("★ (c) one id that no longer resolves -> the honest message, NO paper, nothing seeded", async () => {
    const ids = [...realIds(3), "RETIRED-OR-WITHHELD-ID"];
    const rec = writeOrphanPending("WS-M-REALNUMBERS-0U", "ws-u", ids);
    writeOrphanPending("WS-M-REALNUMBERS-0V", "ws-v", realIds(2));
    await openFromHistory(rec.title);
    await waitFor(() => expect(document.body.textContent).toContain("We couldn’t find the saved copy of this worksheet"));
    expect(screen.queryByTestId("grade-panel")).toBeNull();
    expect(snapshotWrites()).toHaveLength(0);
    expect(seededPaper()).toBeUndefined();
  });

  it("★ (d) CONTROL: when a snapshot exists it wins — the rebuild is not used", async () => {
    const ids = realIds(3);
    const rec = writeOrphanPending("WS-M-REALNUMBERS-0W", "ws-w", ids);
    writeOrphanPending("WS-M-REALNUMBERS-0X", "ws-x", realIds(2));
    const snapPaper = { ...paper("ws-w", rec.id) }; // the sat paper (its own two questions)
    fs.docs[`sessionRecords/student-1/worksheetPapers/${rec.id}`] = { code: rec.id, name: "n", paper: snapPaper, savedAt: 1 };
    await openFromHistory(rec.title);
    await waitFor(() => expect(screen.getByTestId("grade-panel").textContent).toBe(rec.id));
    expect(seededPaper()?.questions.map((q) => q.id)).toEqual(snapPaper.questions.map((q) => q.id));
    expect(snapshotWrites()).toHaveLength(0);
  });
});
