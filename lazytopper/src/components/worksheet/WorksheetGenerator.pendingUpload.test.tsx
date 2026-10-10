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
vi.mock("./WorksheetGradePanel", () => ({
  default: ({ ws }: { ws: PersistedWorksheet }) => <div data-testid="grade-panel">{ws.code}</div>,
}));

const fs = vi.hoisted(() => ({
  docs: {} as Record<string, unknown>,
  failRecordRead: false,
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
    return { exists: () => d != null, data: () => d };
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
  cloud.mirrorOnRead = false;
  fs.writes = [];
  fs.deleted = [];
  cloud.list = [];
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
