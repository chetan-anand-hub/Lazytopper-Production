// @vitest-environment jsdom
/**
 * ME-ENGINE-1 PR-2 — Tutor activity is RECORDED and COUNTED (G8), and a SECOND DEVICE shows the
 * same (G11): two device stores (localStorage, cleared between "devices"), ONE cloud (an in-memory
 * Firestore that behaves like it where it matters: setDoc / getDoc / getDocs with `where >=`).
 *
 * REAL here: `useTutorSession` (the doubt a student sends), `tutorSessionStore`, the read model, the
 * Tutor brief, the wrong-answer log and the mock history, and the sign-in hydration
 * (`hydrateMistakeLogsFromCloud`). Mocked: the model call, the progress streams the counts do
 * not depend on, the bank chunk.
 *
 * Mutations this file turns RED:
 *   T — drop the Tutor turn write (`recordTutorTurn` in useTutorSession.runModel) → the count pin;
 *   F — record the doubt BEFORE the reply (back in `send`) → the failed-reply pins (a doubt the
 *       Tutor never answered is not Tutor activity; #970 live check, TUTOR-DOUBT-COUNTED-ON-FAILURE);
 *   D — the brief reads device-local weak areas again → the brief parity pin;
 *   P — the sign-in hydration skips the wrong-answer log / mock history → the second-device pins.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const H = vi.hoisted(() => ({ store: new Map<string, Record<string, unknown>>(), modelCalls: 0, failNext: 0 }));

vi.mock("firebase/firestore", () => {
  type Ref = { __kind: "col" | "doc"; path: string };
  type Clause = { t: string; a?: unknown; b?: unknown; c?: unknown };
  type Q = { __kind: "query"; col: Ref; clauses: Clause[] };
  const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const join = (segs: unknown[]) => segs.map(String).join("/");
  const collection = (_db: unknown, ...segs: unknown[]): Ref => ({ __kind: "col", path: join(segs) });
  const doc = (_db: unknown, ...segs: unknown[]): Ref => ({ __kind: "doc", path: join(segs) });
  const snap = (p: string, data: Record<string, unknown> | undefined) => ({
    id: p.split("/").pop() as string,
    ref: { path: p },
    exists: () => data !== undefined,
    data: () => clone(data),
  });
  return {
    collection,
    doc,
    query: (col: Ref, ...clauses: Clause[]): Q => ({ __kind: "query", col, clauses }),
    where: (a: unknown, b: unknown, c: unknown) => ({ t: "where", a, b, c }),
    orderBy: (a: unknown, b: unknown) => ({ t: "orderBy", a, b }),
    limit: (a: unknown) => ({ t: "limit", a }),
    // Firestore semantics that matter here: `merge` deep-merges maps and applies `arrayUnion`;
    // `mergeFields` REPLACES just the named top-level fields; neither touches other fields.
    arrayUnion: (...items: unknown[]) => ({ __arrayUnion: items }),
    setDoc: async (ref: Ref, data: Record<string, unknown>, opts?: { merge?: boolean; mergeFields?: string[] }) => {
      const deep = (prev: unknown, next: unknown): unknown => {
        if (next && typeof next === "object" && "__arrayUnion" in (next as object)) {
          const base = Array.isArray(prev) ? [...prev] : [];
          for (const it of (next as { __arrayUnion: unknown[] }).__arrayUnion) if (!base.includes(it)) base.push(it);
          return base;
        }
        if (next && typeof next === "object" && !Array.isArray(next)) {
          const out: Record<string, unknown> = prev && typeof prev === "object" && !Array.isArray(prev) ? { ...(prev as object) } : {};
          for (const [k, v] of Object.entries(next)) out[k] = deep(out[k], v);
          return out;
        }
        return clone(next);
      };
      const prev = H.store.get(ref.path) ?? {};
      if (opts?.mergeFields) {
        const out = { ...prev };
        for (const f of opts.mergeFields) out[f] = clone(data[f]);
        H.store.set(ref.path, out);
      } else if (opts?.merge) H.store.set(ref.path, deep(prev, data) as Record<string, unknown>);
      else H.store.set(ref.path, deep({}, data) as Record<string, unknown>);
    },
    getDoc: async (ref: Ref) => snap(ref.path, H.store.get(ref.path)),
    getDocs: async (qOrCol: Ref | Q) => {
      const q: Q = (qOrCol as Q).__kind === "query" ? (qOrCol as Q) : { __kind: "query", col: qOrCol as Ref, clauses: [] };
      const prefix = q.col.path + "/";
      let rows = [...H.store.entries()].filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"));
      for (const c of q.clauses) {
        if (c.t === "where" && c.b === ">=") rows = rows.filter(([, d]) => d[String(c.a)] !== undefined && (d[String(c.a)] as number) >= (c.c as number));
        if (c.t === "limit") rows = rows.slice(0, Number(c.a));
      }
      const docs = rows.map(([p, d]) => snap(p, d));
      return { empty: docs.length === 0, size: docs.length, docs };
    },
  };
});
vi.mock("./firebaseClient", () => ({ firestoreDb: { __fake: true } }));
vi.mock("../ai/tutorClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../ai/tutorClient")>()),
  callTutor: async () => {
    H.modelCalls += 1;
    if (H.failNext > 0) {
      H.failNext -= 1;
      throw new Error("The tutor request failed."); // what callTutor throws on a 500
    }
    return { reply: "ok" };
  },
}));
vi.mock("../data/bankChapters/loader", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../data/bankChapters/loader")>()),
  ensureBankChapters: async () => undefined,
}));
vi.mock("../pages/tutor/tutorDemoQuestion", () => ({ selectTutorDemoQuestion: () => null }));
vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  getAttemptsFromCloud: async () => [],
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("./progressBankIndex", () => ({ conceptForQuestionId: () => null }));

import { useTutorSession } from "../pages/tutor/useTutorSession";
import { READ_WINDOWS, readStudyModel } from "./progressReadModel";
import { assembleTutorBrief } from "../pages/tutor/tutorContextBrief";
import { hydrateMistakeLogsFromCloud } from "./mistakeLogService";
import { loadWrongAnswerLog, recordWrongAnswer } from "./adaptivePracticeEngine";
import { getMockScoresForSubject, saveMockScore } from "./mockScoreHistory";
import type { AuthUser } from "../context/AuthContext";

const UID = "u-tutor";
const USER = { uid: UID, isLocalSession: false } as unknown as AuthUser;
const ACTIVE_UID_KEY = "lazytopper.progress.active_uid.v1";

/** A fresh browser on the same account: nothing on the device, the cloud untouched. */
function newDevice(): void {
  window.localStorage.clear();
  window.localStorage.setItem(ACTIVE_UID_KEY, UID);
}
/** Every doubt time stored in the cloud for the student, by "<paper>:<chapter>". */
const doubtsAt = (): Record<string, number[]> =>
  ((H.store.get(`tutorSessions/${UID}`) ?? {}) as { doubtsAt?: Record<string, number[]> }).doubtsAt ?? {};
const doubtCount = () => Object.values(doubtsAt()).reduce((n, a) => n + a.length, 0);
const CLOUD_LOG = () => (H.store.get(`learnerProfiles/${UID}`) as { wrongAnswerLog?: { entries?: object; updatedAt: number } } | undefined)?.wrongAnswerLog;
const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  H.store.clear();
  H.modelCalls = 0;
  H.failNext = 0;
  newDevice();
});

function mountTutor(user: AuthUser | null) {
  return renderHook(() =>
    useTutorSession({
      user,
      topicKey: "triangles",
      topicLabel: "Triangles",
      subject: "maths",
      language: "en",
      selfHref: "/tutor/10/maths/triangles",
    }),
  );
}

describe("G8 — a doubt sent to the Tutor is recorded (synced) and counted", () => {
  it("★ one doubt → one synced event → counted as one doubt, one session, in EVERY window", async () => {
    const { result } = mountTutor(USER);
    act(() => result.current.send("Why are these triangles similar?"));
    await waitFor(() => expect(H.modelCalls).toBe(1));
    await waitFor(() => expect(doubtCount()).toBe(1));
    expect(Object.keys(doubtsAt())).toEqual(["maths:triangles"]);
    expect(doubtsAt()["maths:triangles"]).toHaveLength(1);
    expect(typeof doubtsAt()["maths:triangles"][0]).toBe("number"); // a send time — no text, no grade
    expect(JSON.stringify(H.store.get(`tutorSessions/${UID}`))).not.toContain("similar");
    for (const window of READ_WINDOWS) {
      const m = await readStudyModel(UID, { window });
      expect(m.activity.tutor, window).toEqual({ doubts: 1, sessions: 1, complete: true });
      expect((await readStudyModel(UID, { window, subject: "science" })).activity.tutor.doubts).toBe(0);
      expect((await readStudyModel(UID, { window, topicKey: "Triangles" })).activity.tutor.doubts).toBe(1);
    }
  });

  it("two doubts on the same chapter and day = two doubts, ONE session; a retry adds nothing", async () => {
    const { result } = mountTutor(USER);
    act(() => result.current.send("First doubt"));
    await waitFor(() => expect(H.modelCalls).toBe(1));
    act(() => result.current.send("Second doubt"));
    await waitFor(() => expect(H.modelCalls).toBe(2));
    await waitFor(() => expect(doubtCount()).toBe(2));
    const m = await readStudyModel(UID, { window: "today" });
    expect(m.activity.tutor).toEqual({ doubts: 2, sessions: 1, complete: true });
  });

  it("★ a FAILED reply (500) → no doubt written, nothing counted; the successful retry → exactly one", async () => {
    H.failNext = 1;
    const { result } = mountTutor(USER);
    act(() => result.current.send("Why are these triangles similar?"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(H.modelCalls).toBe(1); // precondition: the model WAS called, and it failed
    await settle();
    expect(H.store.has(`tutorSessions/${UID}`)).toBe(false);
    expect((await readStudyModel(UID, { window: "today" })).activity.tutor.doubts).toBe(0);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(H.modelCalls).toBe(2);
    await waitFor(() => expect(doubtCount()).toBe(1));
    await settle();
    expect(doubtCount()).toBe(1); // one doubt, answered once — never two
    expect((await readStudyModel(UID, { window: "today" })).activity.tutor).toEqual({ doubts: 1, sessions: 1, complete: true });
  });

  it("CONTROL — signed out / a local session sends a doubt → nothing recorded, nothing counted", async () => {
    const out = mountTutor(null);
    act(() => out.result.current.send("hello"));
    await waitFor(() => expect(H.modelCalls).toBe(1));
    const local = mountTutor({ uid: "local-1", isLocalSession: true } as unknown as AuthUser);
    act(() => local.result.current.send("hello"));
    await waitFor(() => expect(H.modelCalls).toBe(2));
    expect(H.store.has(`tutorSessions/${UID}`)).toBe(false);
    expect(H.store.has("tutorSessions/local-1")).toBe(false);
  });

  it("★ SECOND DEVICE — the count is the same on a fresh browser (it is read from the cloud)", async () => {
    const { result } = mountTutor(USER);
    act(() => result.current.send("A doubt on device A"));
    await waitFor(() => expect(H.modelCalls).toBe(1));
    await waitFor(() => expect(doubtCount()).toBe(1));
    const a = await readStudyModel(UID, { window: "week" });
    newDevice();
    const b = await readStudyModel(UID, { window: "week" });
    expect(b.activity).toEqual(a.activity);
    expect(b.activity.tutor.doubts).toBe(1);
  });
});

describe("G11 — the wrong-answer log and the mock history reach a second device", () => {
  it("★ device A records a wrong answer and a mock → device B, after sign-in hydration, reads the same", async () => {
    recordWrongAnswer("q-1", "triangles", "Similarity criteria", "Medium", 2);
    recordWrongAnswer("q-2", "real-numbers", "HCF", "Easy");
    saveMockScore({ subject: "Maths", totalMarks: 52, maxMarks: 80, percent: 65, topicBreakdown: { triangles: { scored: 3, maxPossible: 8 } } });
    await waitFor(() => expect(Object.keys(CLOUD_LOG()?.entries ?? {})).toHaveLength(2));
    await settle();
    const aLog = loadWrongAnswerLog().entries;
    const aMocks = getMockScoresForSubject("Maths");
    expect(Object.keys(aLog)).toHaveLength(2);
    expect(aMocks).toHaveLength(1);

    newDevice();
    expect(Object.keys(loadWrongAnswerLog().entries)).toHaveLength(0); // precondition: B starts empty
    expect(getMockScoresForSubject("Maths")).toHaveLength(0);
    await hydrateMistakeLogsFromCloud(UID);

    expect(loadWrongAnswerLog().entries).toEqual(aLog);
    expect(getMockScoresForSubject("Maths")).toEqual(aMocks);
  });

  it("the newer copy wins — a stale device does not overwrite a newer cloud log", async () => {
    recordWrongAnswer("q-1", "triangles", "Similarity criteria", "Medium");
    await waitFor(() => expect(CLOUD_LOG()).toBeDefined());
    const cloud = CLOUD_LOG()!;
    // A stale device copy (older stamp, different content).
    newDevice();
    window.localStorage.setItem(
      `lazytopper.wrongAnswerLog.v1:${UID}`,
      JSON.stringify({ version: 1, entries: {}, updatedAt: cloud.updatedAt - 1000 }),
    );
    await hydrateMistakeLogsFromCloud(UID);
    expect(Object.keys(loadWrongAnswerLog().entries)).toEqual(["triangles::Similarity criteria"]);
  });
});

describe("G2 × G11 — the Tutor brief is the same on both devices (it never reads the device)", () => {
  it("★ device A holds a device-only wrong-answer log; the brief on A == the brief on B == the model", async () => {
    // Device A: a wrong-answer log that never reached the cloud (as before PR-2 or a failed sync)
    // — exactly the device-local input the old brief's weak areas were built from.
    window.localStorage.setItem(
      `lazytopper.wrongAnswerLog.v1:${UID}`,
      JSON.stringify({
        version: 1,
        updatedAt: Date.now(),
        entries: {
          "triangles::Similarity criteria": { questionId: "q-1", topicKey: "triangles", conceptKey: "Similarity criteria", difficulty: "Medium", timestamp: Date.now(), count: 3 },
        },
      }),
    );
    const onA = await assembleTutorBrief({ uid: UID, topicKey: "triangles", subject: "maths" });
    newDevice();
    const onB = await assembleTutorBrief({ uid: UID, topicKey: "triangles", subject: "maths" });
    expect(onA).toEqual(onB);
    expect(onA.topic.weakConcepts).toBeUndefined(); // the synced history holds no mistake here
  });
});

describe("G11 — the synced log is ONE field of the profile document, replaced whole", () => {
  it("a cleared entry stays cleared in the cloud, and the other profile fields are untouched", async () => {
    H.store.set(`learnerProfiles/${UID}`, { goal: "board exam" });
    recordWrongAnswer("q-1", "triangles", "Similarity criteria", "Medium");
    recordWrongAnswer("q-2", "real-numbers", "HCF", "Easy");
    await waitFor(() => expect(Object.keys(CLOUD_LOG()?.entries ?? {})).toHaveLength(2));
    const { clearWrongAnswer } = await import("./adaptivePracticeEngine");
    clearWrongAnswer("real-numbers", "HCF");
    await waitFor(() => expect(Object.keys(CLOUD_LOG()?.entries ?? {})).toEqual(["triangles::Similarity criteria"]));
    expect((H.store.get(`learnerProfiles/${UID}`) as { goal?: string }).goal).toBe("board exam");
  });
});
