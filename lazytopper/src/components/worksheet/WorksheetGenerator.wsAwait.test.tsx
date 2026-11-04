// WS-AWAIT-1 - a downloaded worksheet can always be uploaded later (like Chapter Test / Full Mock).
// Pins: the pending save waits for auth, retries once, never overwrites a graded record, and says so
// when it still fails; a re-download recreates a missing pending record; the ready screen carries the
// code card + reminders and an Upload entry next to Download; `?upload=<code>` opens that paper's
// upload; the PDF names the place. NO grading behaviour is touched (the panel is a stub here).

import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { PersistedWorksheet } from "../../services/worksheetSessionStore";

const USER = { uid: "student-1", isLocalSession: false, email: "s@x.com" };
const auth = vi.hoisted(() => ({ user: null as unknown, loading: false }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: auth.user, loading: auth.loading }) }));
vi.mock("../../hooks/useSubjectContext", () => ({ useSubjectContext: () => ({ subject: "Maths" }) }));
vi.mock("../auth/RequireAuth", () => ({
  RequirePremium: ({ children }: { children: React.ReactNode }) => children,
  RequireAuth: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./WorksheetGradePanel", () => ({
  default: (props: { ws: PersistedWorksheet }) => <div data-testid="grade-panel">{props.ws.code}</div>,
}));
vi.mock("../usage/useFairUse", () => ({
  useFairUse: () => ({ limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false, blockPaperStart: () => false }),
}));
const pdf = vi.hoisted(() => ({ calls: [] as Array<{ id: string; kind: string; code?: string }> }));
vi.mock("./worksheetPdfExport", () => ({
  exportWorksheetPdf: async (ws: { worksheetId: string }, kind: string, code?: string) => {
    pdf.calls.push({ id: ws.worksheetId, kind, code });
  },
  exportGradedWorksheetPdf: async () => {},
}));

const fs = vi.hoisted(() => ({
  docs: {} as Record<string, unknown>,
  recordReadFailures: 0,
  snapshotWriteFailures: 0,
  readCalls: 0,
  fromCache: false,
  // inject `doc` at `path` once the Nth read of a /records/ doc happens (a second tab landing in between)
  inject: null as null | { atRead: number; path: string; doc: unknown },
  writes: [] as Array<{ path: string; data: unknown }>,
}));
vi.mock("../../services/firebaseClient", () => ({ firestoreDb: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join("/") }),
  setDoc: vi.fn(async (ref: { path: string }, data: unknown) => {
    if (ref.path.includes("worksheetPapers") && fs.snapshotWriteFailures > 0) {
      fs.snapshotWriteFailures--;
      throw new Error("write failed");
    }
    fs.writes.push({ path: ref.path, data });
  }),
  getDoc: vi.fn(async (ref: { path: string }) => {
    if (ref.path.includes("/records/")) {
      fs.readCalls++;
      if (fs.inject && fs.readCalls === fs.inject.atRead) fs.docs[fs.inject.path] = fs.inject.doc;
      if (fs.recordReadFailures > 0) {
        fs.recordReadFailures--;
        throw new Error("read failed");
      }
    }
    const d = fs.docs[ref.path];
    return { exists: () => d != null, data: () => d, metadata: { fromCache: fs.fromCache } };
  }),
  deleteDoc: vi.fn(async () => {}),
}));
const cloud = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => cloud.list };
});

import WorksheetGenerator from "./WorksheetGenerator";
import { WorksheetPrintDoc } from "./WorksheetPrintDoc";
import { saveWorksheetSession } from "../../services/worksheetSessionStore";
import {
  buildWorksheetSessionRecord,
  loadLocalSessionRecords,
  writeSessionRecord,
  type SessionRecord,
} from "../../services/sessionRecords";
import { recordWorksheetDownload, mintUniqueWorksheetCode, WorksheetCodeCheckError } from "../../services/worksheetPaperStore";

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
    qNumber: q.qNumber, ok: true, totalMarks: q.marks, marksAwarded: q.marks, percentage: 100,
    annotatedSteps: [], mistakeSummary: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 }, teacherNote: "",
  })),
  totalQuestions: 2, gradedCount: 2, pendingCount: 0, gradedMarksAwarded: 4, gradedMarksTotal: 4, worksheetTotalMarks: 4,
});

beforeEach(() => {
  localStorage.clear();
  fs.docs = {};
  fs.recordReadFailures = 0;
  fs.snapshotWriteFailures = 0;
  fs.readCalls = 0;
  fs.fromCache = false;
  fs.inject = null;
  pdf.calls = [];
  fs.writes = [];
  cloud.list = [];
  auth.user = USER;
  auth.loading = false;
});
afterEach(() => cleanup());

const FAST = { retryDelayMs: 1 };
const snapshotWrites = () => fs.writes.filter((w) => w.path.includes("worksheetPapers"));

describe("WS-AWAIT-1 - the pending save is reliable", () => {
  it("a failed read is retried once and then saves", async () => {
    const p = paper("ws-1", "WS-M-REALNUMBERS-01");
    fs.recordReadFailures = 1;
    const out = await recordWorksheetDownload(USER as never, p, { code: p.code!, name: p.name! }, FAST);
    expect(out).toBe("saved");
    // two for the pending-card check (one failed, one retried) + one from RECORD-SAFE-1's write guard
    expect(fs.readCalls).toBe(3);
    expect(loadLocalSessionRecords("student-1").find((r) => r.id === p.code)?.status).toBe("pending-upload");
    expect(snapshotWrites()).toHaveLength(1);
  });

  it("a read that fails twice writes nothing and says 'failed'", async () => {
    const p = paper("ws-2", "WS-M-REALNUMBERS-02");
    fs.recordReadFailures = 2;
    const out = await recordWorksheetDownload(USER as never, p, { code: p.code!, name: p.name! }, FAST);
    expect(out).toBe("failed");
    expect(loadLocalSessionRecords("student-1")).toHaveLength(0);
    expect(fs.writes).toHaveLength(0);
  });

  it("a snapshot write that fails once is retried; failing twice says 'failed'", async () => {
    const p = paper("ws-3", "WS-M-REALNUMBERS-03");
    fs.snapshotWriteFailures = 1;
    expect(await recordWorksheetDownload(USER as never, p, { code: p.code!, name: p.name! }, FAST)).toBe("saved");
    expect(snapshotWrites()).toHaveLength(1);
    const q = paper("ws-4", "WS-M-REALNUMBERS-04");
    fs.snapshotWriteFailures = 2;
    expect(await recordWorksheetDownload(USER as never, q, { code: q.code!, name: q.name! }, FAST)).toBe("failed");
  });

  it("a graded record is never overwritten ('kept')", async () => {
    const p = paper("ws-5", "WS-M-REALNUMBERS-05");
    fs.docs[`sessionRecords/student-1/records/${p.code}`] = buildWorksheetSessionRecord(p, gradedResponse(p) as never, { code: p.code! }, "student-1");
    expect(await recordWorksheetDownload(USER as never, p, { code: p.code!, name: p.name! }, FAST)).toBe("kept");
    expect(fs.writes).toHaveLength(0);
  });

  it("re-downloading recreates a pending record that is missing", async () => {
    const p = paper("ws-6", "WS-M-REALNUMBERS-06");
    expect(await recordWorksheetDownload(USER as never, p, { code: p.code!, name: p.name! }, FAST)).toBe("saved");
    localStorage.removeItem(Object.keys(localStorage).find((k) => k.includes("sessionRecords")) ?? "x");
    fs.docs = {};
    fs.writes = [];
    expect(await recordWorksheetDownload(USER as never, p, { code: p.code!, name: p.name! }, FAST)).toBe("saved");
    expect(loadLocalSessionRecords("student-1").find((r) => r.id === p.code)?.status).toBe("pending-upload");
    expect(fs.writes.some((w) => w.path.endsWith(`/records/${p.code}`))).toBe(true);
  });
});

function seedPendingRecord(p: PersistedWorksheet) {
  const rec = buildWorksheetSessionRecord(
    p,
    {
      ok: true, worksheetId: p.worksheetId,
      results: p.questions.map((q) => ({ qNumber: q.qNumber, couldNotRead: true, totalMarks: q.marks, note: "x" })),
      totalQuestions: 2, gradedCount: 0, pendingCount: 2, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 4,
    } as never,
    { code: p.code! },
    "student-1",
  ) as SessionRecord;
  writeSessionRecord(USER as never, rec);
  cloud.list = [rec];
  return rec;
}

function mount(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorksheetGenerator />
    </MemoryRouter>,
  );
}

describe("WS-AWAIT-1 - ?upload=<code> opens that paper's upload", () => {
  it("opens the paper's grade panel on the right code and does not open another", async () => {
    const a = paper("ws-a", "WS-M-REALNUMBERS-0A");
    const b = paper("ws-b", "WS-M-REALNUMBERS-0B");
    seedPendingRecord(a);
    saveWorksheetSession(a);
    saveWorksheetSession(b);
    cloud.list = [...cloud.list, { ...seedPendingRecord(b) }];
    mount(`/practice/worksheets?subject=Maths&scope=full-subject&upload=${b.code}`);
    await waitFor(() => expect(screen.getByTestId("grade-panel").textContent).toBe(b.code));
  });

  it("an unknown code gives an honest line, not a wrong paper", async () => {
    mount("/practice/worksheets?subject=Maths&scope=full-subject&upload=WS-M-NOPE-99");
    expect(await screen.findByText(/couldn.t find that worksheet in your list/i)).toBeTruthy();
    expect(screen.queryByTestId("grade-panel")).toBeNull();
  });
});

describe("WS-AWAIT-1 - the ready screen after a download", () => {
  async function openReady(p: PersistedWorksheet) {
    seedPendingRecord(p);
    saveWorksheetSession(p);
    mount(`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`);
    await screen.findByTestId("grade-panel");
  }
  const dl = () => screen.findByRole("button", { name: /Worksheet \(questions\)/ });

  it("shows Upload next to Download and the copy says to upload for marking", async () => {
    const p = paper("ws-r", "WS-M-REALNUMBERS-0R");
    await openReady(p);
    expect(screen.getByTestId("ws-upload-jump")).toBeTruthy();
    expect(screen.getByText(/upload your answers here for step-by-step marking/i)).toBeTruthy();
  });

  it("after Download: the code card + calendar/WhatsApp reminders render", async () => {
    const p = paper("ws-n", "WS-M-REALNUMBERS-0N");
    await openReady(p);
    fireEvent.click(await dl());
    const note = await screen.findByTestId("ws-paper-note");
    expect(note.textContent).toContain(p.code!);
    expect(note.textContent).toMatch(/Write this code on top of your answer sheet\. Upload your answers here when done\./);
    expect(screen.getByTestId("paper-reminder-actions")).toBeTruthy();
    const wa = screen.getByRole("link", { name: /Remind me on WhatsApp/ }) as HTMLAnchorElement;
    expect(decodeURIComponent(wa.href)).toContain(`upload=${p.code}`);
  });

  it("a save that cannot land shows the honest line with the code", async () => {
    const p = paper("ws-f", "WS-M-REALNUMBERS-0F");
    await openReady(p);
    fs.recordReadFailures = 99;
    fireEvent.click(await dl());
    const line = await screen.findByTestId("ws-paper-save-failed", undefined, { timeout: 5000 });
    expect(line.textContent).toContain("We couldn’t save this paper to your list");
    expect(line.textContent).toContain(p.code!);
    expect(line.textContent).toContain("Worksheets → History");
    expect(screen.queryByTestId("ws-paper-note")).toBeNull();
  });

  it("a tap while auth is still resolving waits and then saves under the resolved user", async () => {
    const p = paper("ws-w", "WS-M-REALNUMBERS-0W");
    seedPendingRecord(p);
    saveWorksheetSession(p);
    const view = mount(`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`);
    await screen.findByTestId("grade-panel");
    // auth is "resolving again": no user yet, loading
    auth.user = null;
    auth.loading = true;
    view.rerender(<MemoryRouter initialEntries={[`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`]}><WorksheetGenerator /></MemoryRouter>);
    fs.docs = {};
    fs.writes = [];
    fireEvent.click(await dl());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(fs.writes).toHaveLength(0); // still waiting, nothing silently dropped
    auth.user = USER;
    auth.loading = false;
    view.rerender(<MemoryRouter initialEntries={[`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`]}><WorksheetGenerator /></MemoryRouter>);
    await waitFor(() => expect(fs.writes.some((w) => w.path.endsWith(`/records/${p.code}`))).toBe(true), { timeout: 4000 });
  });
});

describe("WS-AWAIT-1 - the PDF names the place", () => {
  it("the questions sheet says where to upload, with the code", () => {
    const p = paper("ws-pdf", "WS-M-REALNUMBERS-0P");
    const { container } = render(<WorksheetPrintDoc ws={p} kind="questions" code={p.code} />);
    const text = container.textContent || "";
    expect(text).toContain("Upload your answers at lazytopper.com → Worksheets → Upload answers (code WS-M-REALNUMBERS-0P)");
  });
});

// The owner's real case (4 Nov): a graded WS-M-MIX-02 from July (a DIFFERENT worksheet) already
// exists; the new board-exam-mix worksheet's count-based mint is ALSO WS-M-MIX-02.
describe("WS-AWAIT-1 - a code collision never skips, never grades into the old record", () => {
  function mixPaper(): PersistedWorksheet {
    const p = paper("ws-new-mix", "");
    delete (p as { code?: string }).code;
    delete (p as { name?: string }).name;
    p.title = "Board exam mix";
    p.createdAt = "2026-11-03";
    p.questions = [
      { ...p.questions[0], topicKey: "real-numbers" },
      { ...p.questions[1], topicKey: "polynomials", topicLabel: "Polynomials" },
    ];
    return p;
  }
  const oldPaper = () => ({ ...paper("ws-old-july", "WS-M-MIX-02"), title: "Real Numbers — Custom filters" });
  // one earlier MIX worksheet in the count => the naive mint is WS-M-MIX-02
  const prevMix = [{ worksheetId: "ws-prev", subject: "Maths", createdAt: "2026-10-01", title: "Mix", topicKeys: ["real-numbers", "polynomials"] }];
  async function seedOldGraded() {
    const old = oldPaper();
    const rec = buildWorksheetSessionRecord(old, gradedResponse(old) as never, { code: "WS-M-MIX-02" }, "student-1") as SessionRecord;
    fs.docs["sessionRecords/student-1/records/WS-M-MIX-02"] = rec;
    writeSessionRecord(USER as never, rec);
    // an earlier genuine MIX worksheet in the student's records => the count-based mint is MIX-02
    const prev = { ...mixPaper(), worksheetId: "ws-prev", title: "Mix", createdAt: "2026-10-01", code: "WS-M-MIX-01" };
    writeSessionRecord(USER as never, buildWorksheetSessionRecord(prev, gradedResponse(prev) as never, { code: "WS-M-MIX-01" }, "student-1") as SessionRecord);
    await new Promise((r) => setTimeout(r, 0)); // RECORD-SAFE-1: the seeding writes read the doc first, so they land a tick later
    fs.writes = [];
    return rec;
  }

  it("the naive mint is WS-M-MIX-02 (guards the scenario), the unique mint is the next free code", async () => {
    await seedOldGraded();
    const { worksheetNomenclature } = await import("./worksheetNaming");
    expect(worksheetNomenclature(mixPaper() as never, prevMix).code).toBe("WS-M-MIX-02");
    saveWorksheetSession(mixPaper());
    const nomen = await mintUniqueWorksheetCode(mixPaper(), USER as never, prevMix);
    expect(nomen.code).toBe("WS-M-MIX-03");
    expect(nomen.name).toMatch(/Worksheet 3$/);
    // frozen: the PDF code, the pending record and the later grade all read the same one
    const again = await mintUniqueWorksheetCode({ ...mixPaper(), code: nomen.code }, USER as never, prevMix);
    expect(again.code).toBe("WS-M-MIX-03");
    expect(JSON.parse(localStorage.getItem("lazytopper.worksheets.v1") ?? "[]")[0].code).toBe("WS-M-MIX-03");
  });

  it("a pending record is written under the NEW code and the old graded record is untouched", async () => {
    const oldRec = await seedOldGraded();
    saveWorksheetSession(mixPaper());
    const nomen = await mintUniqueWorksheetCode(mixPaper(), USER as never, prevMix);
    expect(await recordWorksheetDownload(USER as never, mixPaper(), nomen, FAST)).toBe("saved");
    const mine = loadLocalSessionRecords("student-1").find((r) => r.id === "WS-M-MIX-03");
    expect(mine?.status).toBe("pending-upload");
    expect(mine?.worksheetId).toBe("ws-new-mix");
    const old = loadLocalSessionRecords("student-1").find((r) => r.id === "WS-M-MIX-02");
    expect(old?.status).toBe("graded");
    expect(old?.worksheetId).toBe("ws-old-july");
    expect(fs.writes.some((w) => w.path.endsWith("/records/WS-M-MIX-02"))).toBe(false);
    expect(fs.docs["sessionRecords/student-1/records/WS-M-MIX-02"]).toBe(oldRec);
  });

  it("backstop: a colliding code handed straight to the save is refused, never 'kept'", async () => {
    await seedOldGraded();
    const out = await recordWorksheetDownload(USER as never, mixPaper(), { code: "WS-M-MIX-02", name: "n" }, FAST);
    expect(out).toBe("collision");
    expect(fs.writes).toHaveLength(0);
  });

  it("a paper opened with an already-colliding frozen code is re-coded on the ready screen", async () => {
    await seedOldGraded();
    const stale = { ...mixPaper(), code: "WS-M-MIX-02", name: "Maths Mixed · Worksheet 2" };
    const rec = buildWorksheetSessionRecord(stale, gradedResponse(stale) as never, { code: "WS-M-MIX-02" }, "student-1") as SessionRecord;
    // no record for the new paper exists (that is the owner's state); open it from the device copy
    saveWorksheetSession(stale);
    cloud.list = [{ ...rec, id: "WS-M-OTHER-77", status: "pending-upload", worksheetId: "ws-new-mix" }];
    mount("/practice/worksheets?subject=Maths&scope=full-subject&upload=WS-M-OTHER-77");
    await waitFor(() => expect(screen.getByTestId("grade-panel").textContent).toBe("WS-M-MIX-03"), { timeout: 4000 });
  });
});

// Review round: an unverifiable code is never frozen or printed; a bump reaches the grade path;
// a collision found at save time re-mints; a record with no worksheetId is never "ours".
describe("WS-AWAIT-1 review - unknown checks, state sync, races", () => {
  const WS_KEY = "lazytopper.worksheets.v1";
  const storedCode = (id: string) => (JSON.parse(localStorage.getItem(WS_KEY) ?? "[]") as PersistedWorksheet[]).find((w) => w.worksheetId === id)?.code;
  function newMix(): PersistedWorksheet {
    const p = paper("ws-nm", "");
    delete (p as { code?: string }).code;
    delete (p as { name?: string }).name;
    p.title = "Board exam mix";
    p.createdAt = "2026-11-03";
    p.questions = [{ ...p.questions[0], topicKey: "real-numbers" }, { ...p.questions[1], topicKey: "polynomials", topicLabel: "Polynomials" }];
    return p;
  }
  const otherGraded = (code: string, withId = true) => {
    const old = { ...paper("ws-old-july", code), title: "Real Numbers — Custom filters" };
    const rec = buildWorksheetSessionRecord(old, gradedResponse(old) as never, { code }, "student-1") as SessionRecord;
    if (!withId) delete (rec as { worksheetId?: string }).worksheetId;
    return rec;
  };
  // an earlier genuine MIX worksheet (local mirror only) => the count-based mint is MIX-02
  const seedPrevMix = () => {
    const prev = { ...newMix(), worksheetId: "ws-prev", title: "Mix", createdAt: "2026-10-01", code: "WS-M-MIX-01" };
    writeSessionRecord(USER as never, buildWorksheetSessionRecord(prev, gradedResponse(prev) as never, { code: "WS-M-MIX-01" }, "student-1") as SessionRecord);
    fs.writes = [];
  };

  it("1. a read error on the code check freezes NOTHING (no -02), and mint throws", async () => {
    fs.docs["sessionRecords/student-1/records/WS-M-MIX-02"] = otherGraded("WS-M-MIX-02");
    seedPrevMix();
    saveWorksheetSession(newMix());
    fs.recordReadFailures = 99;
    await expect(mintUniqueWorksheetCode(newMix(), USER as never, [], { retryDelayMs: 1 })).rejects.toBeInstanceOf(WorksheetCodeCheckError);
    expect(storedCode("ws-nm")).toBeUndefined();
  });

  it("1. a cache-only (offline) answer is 'unknown' too: nothing frozen", async () => {
    fs.docs["sessionRecords/student-1/records/WS-M-MIX-02"] = otherGraded("WS-M-MIX-02");
    seedPrevMix();
    saveWorksheetSession(newMix());
    fs.fromCache = true;
    await expect(mintUniqueWorksheetCode(newMix(), USER as never, [], { retryDelayMs: 1 })).rejects.toBeInstanceOf(WorksheetCodeCheckError);
    expect(storedCode("ws-nm")).toBeUndefined();
  });

  it("1. UI: with the check failing, Download prints nothing, stores nothing, says so, and stays retryable", async () => {
    const p = paper("ws-u", "WS-M-REALNUMBERS-34");
    const rec = buildWorksheetSessionRecord(p, { ok: true, worksheetId: "ws-u", results: [], totalQuestions: 2, gradedCount: 0, pendingCount: 2, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 4 } as never, { code: p.code! }, "student-1") as SessionRecord;
    writeSessionRecord(USER as never, rec);
    cloud.list = [rec];
    saveWorksheetSession(p);
    mount(`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`);
    await screen.findByTestId("grade-panel");
    localStorage.removeItem(Object.keys(localStorage).find((k) => k.includes("sessionRecords")) ?? "x");
    fs.writes = [];
    fs.recordReadFailures = 99;
    fireEvent.click(await screen.findByRole("button", { name: /Worksheet \(questions\)/ }));
    expect(await screen.findByText(/couldn.t check your saved papers/i, undefined, { timeout: 5000 })).toBeTruthy();
    expect(pdf.calls).toHaveLength(0);
    expect(fs.writes).toHaveLength(0);
    expect((screen.getByRole("button", { name: /Worksheet \(questions\)/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("2/3. a bumped code reaches the grade panel, the PDF and the stored pending record (written BEFORE the PDF)", async () => {
    // the paper opens fine; ANOTHER device then grades a different worksheet under the same code
    const p = paper("ws-b", "WS-M-REALNUMBERS-14");
    const rec = buildWorksheetSessionRecord(p, { ok: true, worksheetId: "ws-b", results: [], totalQuestions: 2, gradedCount: 0, pendingCount: 2, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 4 } as never, { code: p.code! }, "student-1") as SessionRecord;
    writeSessionRecord(USER as never, rec);
    cloud.list = [rec];
    saveWorksheetSession(p);
    mount(`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`);
    await screen.findByTestId("grade-panel");
    expect(screen.getByTestId("grade-panel").textContent).toBe("WS-M-REALNUMBERS-14");
    // drop the local mirror (this device never saw it) and let a foreign graded record take the code in the cloud
    localStorage.removeItem(Object.keys(localStorage).find((k) => k.includes("sessionRecords")) ?? "x");
    fs.docs["sessionRecords/student-1/records/WS-M-REALNUMBERS-14"] = otherGraded("WS-M-REALNUMBERS-14");
    fs.writes = [];
    fireEvent.click(await screen.findByRole("button", { name: /Worksheet \(questions\)/ }));
    await waitFor(() => expect(pdf.calls).toHaveLength(1), { timeout: 5000 });
    const bumped = pdf.calls[0].code!;
    expect(bumped).not.toBe("WS-M-REALNUMBERS-14");
    expect(bumped).toBe("WS-M-REALNUMBERS-15");
    expect(screen.getByTestId("grade-panel").textContent).toBe(bumped); // the grade path gets the bumped code
    expect(storedCode("ws-b")).toBe(bumped);
    expect(fs.writes.some((w) => w.path.endsWith(`/records/${bumped}`))).toBe(true); // stored == printed
    expect(fs.writes.some((w) => w.path.endsWith("/records/WS-M-REALNUMBERS-14"))).toBe(false); // old record untouched
  });

  it("3. a collision that lands between the check and the save re-mints the next free code (two-tab race)", async () => {
    const p = paper("ws-r", "WS-M-REALNUMBERS-24");
    const rec = buildWorksheetSessionRecord(p, { ok: true, worksheetId: "ws-r", results: [], totalQuestions: 2, gradedCount: 0, pendingCount: 2, gradedMarksAwarded: 0, gradedMarksTotal: 0, worksheetTotalMarks: 4 } as never, { code: p.code! }, "student-1") as SessionRecord;
    writeSessionRecord(USER as never, rec);
    cloud.list = [rec];
    saveWorksheetSession(p);
    mount(`/practice/worksheets?subject=Maths&scope=full-subject&upload=${p.code}`);
    await screen.findByTestId("grade-panel");
    localStorage.removeItem(Object.keys(localStorage).find((k) => k.includes("sessionRecords")) ?? "x");
    fs.writes = [];
    fs.readCalls = 0;
    // read 1 = the check of -0R (free); the other tab's graded record lands before read 2 = the save's own read
    fs.inject = { atRead: 2, path: "sessionRecords/student-1/records/WS-M-REALNUMBERS-24", doc: otherGraded("WS-M-REALNUMBERS-24") };
    fireEvent.click(await screen.findByRole("button", { name: /Worksheet \(questions\)/ }));
    await waitFor(() => expect(pdf.calls).toHaveLength(1), { timeout: 6000 });
    expect(pdf.calls[0].code).toBe("WS-M-REALNUMBERS-25");
    expect(fs.writes.some((w) => w.path.endsWith("/records/WS-M-REALNUMBERS-25"))).toBe(true);
    expect(fs.writes.some((w) => w.path.endsWith("/records/WS-M-REALNUMBERS-24"))).toBe(false);
    expect(screen.getByTestId("grade-panel").textContent).toBe("WS-M-REALNUMBERS-25");
    expect(screen.getByTestId("ws-paper-note").textContent).toContain("WS-M-REALNUMBERS-25");
  });

  it("4. a record with no worksheetId is never 'ours': the save backstop refuses it and the mint bumps past it", async () => {
    const p = newMix();
    fs.docs["sessionRecords/student-1/records/WS-M-MIX-01"] = otherGraded("WS-M-MIX-01", false);
    expect(await recordWorksheetDownload(USER as never, p, { code: "WS-M-MIX-01", name: "n" }, FAST)).toBe("collision");
    expect(fs.writes).toHaveLength(0);
    saveWorksheetSession(p);
    const nomen = await mintUniqueWorksheetCode(p, USER as never, [], { retryDelayMs: 1 });
    expect(nomen.code).toBe("WS-M-MIX-02");
  });

  it("5. signed out: ?upload= is kept in the URL for the trip through login", async () => {
    auth.user = null;
    let search = "";
    const Probe = () => {
      search = useLocation().search;
      return null;
    };
    render(
      <MemoryRouter initialEntries={["/practice/worksheets?subject=Maths&scope=full-subject&upload=WS-M-X-01"]}>
        <WorksheetGenerator />
        <Probe />
      </MemoryRouter>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });
    expect(search).toContain("upload=WS-M-X-01");
  });
});
