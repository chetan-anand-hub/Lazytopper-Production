// @vitest-environment jsdom
/**
 * ME-CONCEPT-1 PR-B ([FU-B18-WEAKAREA-LOCAL-LIST]) — WEAK AREA PRACTICE READS THE SHARED MODEL.
 *
 * The list, its ORDER, "Start Targeted Session" and the Learning Path come from `readStudyModel`
 * (the chapters Me lists, with their weakest Exam Trends concepts, at Me's gate) — never from the
 * device-local `getWeakAreas`. Only the CLOUD streams are mocked; the read model, progressStore,
 * the REAL served bank id index and the REAL concept map (through the app's one resolver,
 * `mistakeConcept.loadExamConceptResolvers`) all run. Every bank id below is DISCOVERED from the
 * served index through that resolver — none is typed by hand.
 *
 * Decisions pinned (each RED once on the unfixed tree — see the PR report):
 *   D1 — a second device (device-local storage cleared / seeded differently) shows the SAME list
 *        as Me: same chapters, same concepts, same order;
 *   D2 — below Me's gate: the honest empty state, and NO Learning Path is built or saved;
 *   D3 — the targeted session's ids = the chosen concept's served rows first, then the chapter's;
 *   D4 — no mastery figure is rendered, above or below the gate, on the list or the path;
 *   D5 — the Learning Path's difficulty is the chapter's marks-lost difficulty, never mastery's.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PracticeAttempt } from "../services/practiceInsights";

const HOUR = 60 * 60 * 1000;
const NOW = Date.now();
const UID = "u-model-list";

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  navigate: [] as string[],
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useNavigate: () => (to: string) => H.navigate.push(to),
}));
vi.mock("../services/practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.attempts.filter((a) => start === undefined || a.timestamp >= start),
}));
vi.mock("../services/sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/sessionRecords")>()),
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("../services/mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async () => ({ entries: [], complete: true }),
}));
vi.mock("../services/tutorSessionStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/tutorSessionStore")>()),
  getTutorTurnsFromCloud: async () => ({ events: [], complete: true }),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: UID }, loading: false, mistakeLogsHydrated: 0 }),
}));
vi.mock("../services/spacedRepetitionEngine", () => ({
  getDueReviews: () => [],
  getSRStats: () => ({ total: 0, newCount: 0, learning: 0, review: 0, mastered: 0, dueToday: 0 }),
}));
// The learning-path generator is REAL (D2/D5 read what it saves); only its Firestore write is inert.
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/studentProgressStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../services/studentProgressStore")>()),
  getActiveProgressUser: () => UID,
}));

import WeakAreaPracticePage, * as Page from "./WeakAreaPracticePage";
import { ME_DEFAULT_WINDOW, readStudyModel, type StudyReadModel } from "../services/progressReadModel";
import { loadExamConceptResolvers, type ExamConceptResolvers } from "../services/mistakeConcept";
import { bankIndexEntries, type BankRowMeta } from "../data/bankChapters/bankIdIndex";
import { buildChapters, viewRowsFrom } from "./MeProgressPage";
import { recordWrongAnswer } from "../services/adaptivePracticeEngine";

const AP = "arithmetic-progression";
const QE = "quadratic-equations";
const TRI = "triangles";

let R: ExamConceptResolvers;
let entries: Array<[string, BankRowMeta]>;
/** Exam Trends concept groups per chapter, discovered through the app's resolver. */
const groups = new Map<string, Array<{ key: string; label: string; ids: string[] }>>();

function conceptGroups(chapter: string): Array<{ key: string; label: string; ids: string[] }> {
  const cached = groups.get(chapter);
  if (cached) return cached;
  const byKey = new Map<string, { key: string; label: string; ids: string[] }>();
  for (const [id, meta] of entries) {
    if (String(meta.topicKey).trim().toLowerCase() !== chapter) continue;
    const ref = R.conceptRowForBankQuestionId(id);
    if (!ref || !ref.examConcept) continue;
    const g = byKey.get(ref.key) ?? { key: ref.key, label: ref.label, ids: [] };
    g.ids.push(id);
    byKey.set(ref.key, g);
  }
  const out = [...byKey.values()].sort((a, b) => b.ids.length - a.ids.length || a.key.localeCompare(b.key));
  groups.set(chapter, out);
  return out;
}

function chapterIds(chapter: string): string[] {
  return entries.filter(([, m]) => String(m.topicKey).trim().toLowerCase() === chapter).map(([id]) => id);
}

let seq = 0;
const SPREAD = [0.2, 0.4, 20, 30, 50, 70, 100, 130];
/** Eight graded answers over Me's window (both halves measurable), cycling through `ids`. */
function eight(ids: string[], chapter: string, scored: (i: number) => number): PracticeAttempt[] {
  return SPREAD.map((h, i) => {
    seq += 1;
    return {
      id: `a${seq}`,
      timestamp: NOW - h * HOUR,
      subject: "maths",
      topicKey: chapter,
      topicName: chapter,
      questionId: ids[i % ids.length],
      marksScored: scored(i),
      marksAvailable: 2,
      correct: scored(i) >= 2,
      mode: "graded",
    } as unknown as PracticeAttempt;
  });
}

/** AP: its biggest concept loses everything (16), its second loses half (8) → AP lost 24.
 *  QE: one concept, half its answers wrong (8). Triangles: all full marks (lost 0, not listed). */
function aboveGateFixture(): { apWeak: string; apSecond: string; qeWeak: string } {
  const [ca, cb] = conceptGroups(AP);
  const [cq] = conceptGroups(QE);
  H.attempts = [
    ...eight(ca.ids, AP, () => 0),
    ...eight(cb.ids, AP, () => 1),
    ...eight(cq.ids, QE, (i) => (i % 2 ? 2 : 0)),
    ...eight(chapterIds(TRI), TRI, () => 2),
  ];
  return { apWeak: ca.key, apSecond: cb.key, qeWeak: cq.key };
}

/** Two graded answers: Maths is below Me's gate. */
function belowGateFixture(): void {
  const [ca] = conceptGroups(AP);
  H.attempts = eight(ca.ids, AP, () => 0).slice(0, 2);
}

function device(name: "A" | "B"): void {
  window.localStorage.clear();
  if (name === "A") {
    // Device A carries DEVICE-LOCAL weak-area evidence the model does not have (Triangles wrongs);
    // the old `getWeakAreas` list would have named Triangles here, and nothing on device B.
    for (let i = 0; i < 4; i += 1) recordWrongAnswer(`tri-local-${i}`, TRI, "Similarity", "Easy");
  }
}

const settle = () => new Promise((r) => setTimeout(r, 40));

async function renderPage(): Promise<void> {
  render(
    <MemoryRouter>
      <WeakAreaPracticePage />
    </MemoryRouter>,
  );
  await screen.findByText("Fix My Weak Areas");
  await settle();
}

/** The chapter cards on screen, in order (from the DOM, not from the page's helpers). */
function listedChapters(): string[] {
  return screen.queryAllByRole("button", { name: "Practice Now" }).map((b) => {
    const nameDiv = b.parentElement?.firstElementChild?.firstElementChild?.firstElementChild;
    return nameDiv?.textContent ?? "";
  });
}

/** Me's chapter list + concept rows for the Maths paper (Me's own builders over Me's own read). */
async function meView(): Promise<{ chapters: string[]; conceptsOf: (chapterKey: string) => string[] }> {
  const scoped: StudyReadModel = await readStudyModel(UID, { window: ME_DEFAULT_WINDOW, subject: "maths" });
  const chapters = buildChapters(scoped.progress.topics, "Maths", scoped.mistakes.byChapter).filter((c) => c.lost > 0);
  const rows = viewRowsFrom(scoped.progress.concepts);
  const meta = new Map(scoped.progress.concepts.map((c) => [c.key, c]));
  return {
    chapters: chapters.map((c) => c.label),
    conceptsOf: (chapterKey) =>
      rows
        .filter((r) => meta.get(r.key)?.examConcept === true && meta.get(r.key)?.chapter === chapterKey)
        .slice(0, 3)
        .map((r) => r.label),
  };
}

function savedPaths(): string[] {
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const k = window.localStorage.key(i) ?? "";
    if (/learningPath/i.test(k)) out.push(k);
  }
  return out;
}

beforeAll(async () => {
  R = await loadExamConceptResolvers();
  entries = [...bankIndexEntries()];
});

beforeEach(() => {
  cleanup();
  seq = 0;
  H.navigate = [];
  H.attempts = [];
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe("fixture preconditions (the real served index, through the app's resolver)", () => {
  it("AP has ≥ 2 Exam Trends concept groups and QE ≥ 1; Triangles has served rows", () => {
    expect(conceptGroups(AP).length).toBeGreaterThanOrEqual(2);
    expect(conceptGroups(QE).length).toBeGreaterThanOrEqual(1);
    expect(chapterIds(TRI).length).toBeGreaterThan(0);
  });
});

describe("D1 — a second device shows the SAME list as Me (chapters, concepts, order)", () => {
  it("★ device A (local wrongs seeded) and device B (storage cleared) show Me's list, in Me's order, with Me's concepts", async () => {
    aboveGateFixture();
    const me = await meView();
    expect(me.chapters).toEqual(["Arithmetic Progression", "Quadratic Equations"]); // precondition (Me itself)
    const seen: Array<{ chapters: string[]; concepts: string[] }> = [];
    for (const d of ["A", "B"] as const) {
      device(d);
      await renderPage();
      await waitFor(() => expect(listedChapters().length).toBeGreaterThan(0));
      const concepts = screen.queryAllByTestId("weak-area-concept").map((el) => el.textContent ?? "");
      seen.push({ chapters: listedChapters(), concepts });
      cleanup();
    }
    const expected = {
      chapters: me.chapters,
      concepts: [...me.conceptsOf(AP), ...me.conceptsOf(QE)],
    };
    expect(expected.concepts.length).toBeGreaterThanOrEqual(3); // precondition: concepts ARE named
    expect(seen).toEqual([expected, expected]);
  });

  const table: Array<[string, "All" | "Maths" | "Science", string[]]> = [
    ["All", "All", [AP, QE]],
    ["Maths tab", "Maths", [AP, QE]],
    ["Science tab (no Science answer: its rung is below the gate)", "Science", []],
  ];
  for (const [name, tab, keys] of table) {
    it(`weakAreasFromModel — ${name}: ${keys.join(", ") || "none"}`, async () => {
      const fx = aboveGateFixture();
      const model = await readStudyModel(UID, { window: ME_DEFAULT_WINDOW });
      const areas = Page.weakAreasFromModel(model, tab);
      expect(areas.map((a) => a.topicKey)).toEqual(keys);
      if (keys.length) {
        expect(areas[0].weakConcepts.map((c) => c.key)).toEqual([fx.apWeak, fx.apSecond]);
        expect(areas[1].weakConcepts.map((c) => c.key)).toEqual([fx.qeWeak]);
      }
    });
  }
});

describe("D2 — below Me's gate: the honest empty state, and NO Learning Path built or saved", () => {
  it("★ the list is the 'Not Enough Graded Yet' state; opening the Learning Path tab builds and saves nothing", async () => {
    belowGateFixture();
    for (const d of ["A", "B"] as const) {
      device(d);
      await renderPage();
      expect(screen.queryByTestId("weak-area-empty-thin")).not.toBeNull();
      expect(listedChapters()).toEqual([]);
      fireEvent.click(screen.getByRole("button", { name: /^Learning Path/ }));
      await settle();
      expect(screen.queryByTestId("wap-path-thin")).not.toBeNull();
      expect(screen.queryByText(/Day 1 of/)).toBeNull();
      expect(savedPaths()).toEqual([]);
      cleanup();
    }
  });

  it("CONTROL — above the gate the same click DOES build and save a path (the instrument sees one)", async () => {
    aboveGateFixture();
    device("B");
    await renderPage();
    await waitFor(() => expect(listedChapters().length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: /^Learning Path/ }));
    await settle();
    expect(screen.getByText("Day 1 of 14")).toBeTruthy();
    expect(savedPaths().length).toBe(1);
  });
});

describe("D3 — the targeted session: the chosen concept's served rows first, then the chapter's", () => {
  /** The 2026-27 banned sub-topics, read from the guard file itself (never from memory). */
  function bannedSubtopics(): Set<string> {
    const src = readFileSync(resolve(process.cwd(), "../scripts/src/syllabusGuard.ts"), "utf8");
    const out = new Set<string>();
    for (const block of src.matchAll(/bannedSubtopics:\s*\[([\s\S]*?)\]/g)) {
      for (const m of block[1].matchAll(/"([^"]+)"/g)) out.add(m[1]);
    }
    return out;
  }

  it("★ Start Targeted Session navigates with focusBankIds = the weakest concept's rows, then the chapter's — all served, guard-clean", async () => {
    const fx = aboveGateFixture();
    device("B");
    await renderPage();
    // DECISION 61b — the exact label: chapter + weakest concept, no count, no difficulty order.
    const weakLabel = conceptGroups(AP).find((g) => g.key === fx.apWeak)!.label;
    const button = await screen.findByRole("button", { name: `Practise Arithmetic Progression, starting with ${weakLabel}` });
    expect(button.textContent).toBe(`Practise Arithmetic Progression, starting with ${weakLabel}`);
    expect(document.body.textContent ?? "").not.toMatch(/\b15 questions\b|\(\d+ questions\)|Easy\s*(→|->)\s*Hard|Start Targeted Session/);
    fireEvent.click(button);
    await waitFor(() => expect(H.navigate.length).toBe(1));
    const url = new URL(H.navigate[0], "https://x.test");
    expect(url.pathname).toBe("/practice/10/Maths");
    expect(url.searchParams.get("topic")).toBe(AP);
    expect(url.searchParams.get("strictFocus")).toBe("true");
    expect(url.searchParams.get("count")).toBe("15");
    const ids = (url.searchParams.get("focusBankIds") ?? "").split(",").filter(Boolean);
    expect(ids.length).toBe(15);

    const conceptRows = conceptGroups(AP).find((g) => g.key === fx.apWeak)!.ids;
    const head = Math.min(15, conceptRows.length);
    expect(ids.slice(0, head)).toEqual(conceptRows.slice(0, head));
    const served = new Map(entries);
    const banned = bannedSubtopics();
    expect(banned.size).toBeGreaterThan(20); // precondition: the guard list was read
    for (const id of ids) {
      const meta = served.get(id);
      expect(meta, `${id} is a served row`).toBeTruthy();
      expect(String(meta!.topicKey).trim().toLowerCase()).toBe(AP);
      expect(banned.has(String(meta!.subtopic).trim())).toBe(false);
    }
    for (const id of ids.slice(head)) expect(R.conceptRowForBankQuestionId(id)?.key).not.toBe(fx.apWeak);
  });

  it("pickTargetedIds over the real index: for EVERY chapter's every Exam Trends concept, its rows first, then the chapter's, ≤ 15", () => {
    const rows: Array<[string, string]> = [];
    const chapters = [...new Set(entries.map(([, m]) => String(m.topicKey).trim().toLowerCase()))];
    expect(chapters.length).toBeGreaterThanOrEqual(26); // precondition: the whole served index
    for (const ch of chapters) for (const g of conceptGroups(ch)) rows.push([ch, g.key]);
    expect(rows.length).toBeGreaterThan(26); // precondition: concepts resolved across the index
    for (const [ch, key] of rows) {
      const own = conceptGroups(ch).find((g) => g.key === key)!.ids;
      const ids = Page.pickTargetedIds(entries, ch, key, R.conceptRowForBankQuestionId);
      const head = Math.min(15, own.length);
      expect(ids.length).toBe(Math.min(15, chapterIds(ch).length));
      expect(ids.slice(0, head)).toEqual(own.slice(0, head));
      for (const id of ids.slice(head)) {
        expect(own.includes(id)).toBe(false);
        expect(chapterIds(ch).includes(id)).toBe(true);
      }
    }
  });

  it("TOP-UP — a concept with only 5 served rows (the real index with the rest of that concept left out): its 5 first, then 10 chapter rows", () => {
    // Every Exam Trends concept in today's served index has ≥ 15 rows, so the top-up branch is
    // exercised on a SUBSET of the real index (real ids, real resolver), not on invented rows.
    const [ca] = conceptGroups(AP);
    const keep = new Set(ca.ids.slice(0, 5));
    const subset = entries.filter(([id]) => !ca.ids.includes(id) || keep.has(id));
    const ids = Page.pickTargetedIds(subset, AP, ca.key, R.conceptRowForBankQuestionId);
    expect(ids.length).toBe(15);
    expect(ids.slice(0, 5)).toEqual(ca.ids.slice(0, 5));
    for (const id of ids.slice(5)) {
      expect(R.conceptRowForBankQuestionId(id)?.key).not.toBe(ca.key);
      expect(chapterIds(AP).includes(id)).toBe(true);
    }
  });

  it("no concept → the chapter's rows; an unknown chapter → none", () => {
    expect(Page.pickTargetedIds(entries, AP, null, R.conceptRowForBankQuestionId)).toEqual(chapterIds(AP).slice(0, 15));
    expect(Page.pickTargetedIds(entries, "", null, R.conceptRowForBankQuestionId)).toEqual([]);
  });
});

describe("D4 — no mastery figure rendered, in any state", () => {
  const states: Array<[string, () => void]> = [
    ["0 graded answers", () => { H.attempts = []; }],
    ["below the gate", belowGateFixture],
    ["above the gate", () => { aboveGateFixture(); }],
  ];
  for (const [name, arrange] of states) {
    it(`★ ${name}: neither the list nor the Learning Path says 'mastery'`, async () => {
      arrange();
      device("A");
      await renderPage();
      expect(document.body.textContent).not.toMatch(/mastery|mastered/i);
      fireEvent.click(screen.getByRole("button", { name: /^Learning Path/ }));
      await settle();
      expect(document.body.textContent).not.toMatch(/mastery|mastered/i);
    });
  }
});

describe("D5 — the Learning Path's difficulty is marks-lost, never mastery", () => {
  it("★ each planned chapter carries difficultyFromMarksLost(areaEvidence) from the model (AP lost 24/32 → Easy; QE 8/16 → Medium)", async () => {
    aboveGateFixture();
    const model = await readStudyModel(UID, { window: ME_DEFAULT_WINDOW });
    const expected = new Map(
      [AP, QE].map((k) => [k, Page.difficultyFromMarksLost(Page.areaEvidence(model, k))] as const),
    );
    expect([...expected.values()]).toEqual(["Easy", "Medium"]); // precondition: they differ
    device("B");
    await renderPage();
    await waitFor(() => expect(listedChapters().length).toBeGreaterThan(0));
    fireEvent.click(screen.getByRole("button", { name: "Generate Learning Path" }));
    await settle();
    const [key] = savedPaths();
    const path = JSON.parse(window.localStorage.getItem(key) ?? "null") as {
      days: Array<{ topics: Array<{ topicKey: string; difficulty: string }>; reviewTopics: string[] }>;
    };
    const planned = path.days.flatMap((d) => d.topics);
    expect(planned.map((t) => t.topicKey).sort()).toEqual([AP, QE]);
    for (const t of planned) expect(t.difficulty).toBe(expected.get(t.topicKey));
    // Device-local due reviews are not in the model: no review day is invented.
    expect(path.days.every((d) => d.reviewTopics.length === 0)).toBe(true);
  });

  it("the generator source reads no mastery, no device-local weak areas and no due reviews", () => {
    const code = readFileSync(resolve(process.cwd(), "src/services/learningPathGenerator.ts"), "utf8")
      .split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    expect(code).not.toMatch(/masteryPercent|getWeakAreas|weakAreaAggregator|getDueReviews|spacedRepetitionEngine/);
    expect(code).toMatch(/difficulty: area\.difficulty/); // CONTROL: the line the rule lives on
  });
});
