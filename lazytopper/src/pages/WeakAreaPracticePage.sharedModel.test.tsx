// @vitest-environment jsdom
/**
 * ME-ENGINE-1 PR-2b — OWNER RULING 2026-10-06 (OWNER_RULINGS_B18_ME.md Round 2), Weak Area Practice:
 *   > remove every mastery display … stop choosing difficulty from mastery; base it on the
 *   > student's graded marks lost in that topic from the shared model; make Accuracy and Attempts
 *   > come from the shared, synced read model (the same numbers on every device; the same honesty
 *   > threshold as Me; nothing shown below it). Pin it: no student-facing render contains
 *   > "mastery" or a fake 0%.
 *
 * Only the CLOUD streams are mocked (attempts, session records, mistake history, Tutor turns);
 * the read model is REAL. ME-CONCEPT-1 PR-B: the weak-area LIST now comes from that model too
 * (`weakAreasFromModel`), so the device-local `getWeakAreas` mock this file used to carry is gone
 * (the page no longer imports it); "device A / B" differ only in their local storage.
 *
 * Mutations this file turns RED: A1 — a mastery label comes back; A2 — a 0% is shown below the
 * threshold (the old `area.accuracy` with no evidence); A3 — Accuracy/Attempts read the
 * device-local weak-area figures again; A4 — difficulty from mastery again.
 *
 * ME-ENGINE-1 PR-2c [WEAKAREA-EMPTY-PRAISE] — an empty list never praises, and its copy follows
 * the gate of the paper ON SCREEN (an "empty list above the gate" is now a window whose graded
 * answers lost no mark — the model lists no chapter):
 *   E1 — drop the gate (always the above-gate line) → the 0-graded + below-gate pins;
 *   E2 — the subject tab judged on the BOTH-papers gate again → the Science-tab pin;
 *   E3 — the old praise comes back above the gate → the "no praise in any state" pin.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PracticeAttempt } from "../services/practiceInsights";

const HOUR = 60 * 60 * 1000;
const NOW = Date.now();

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  navigate: [] as string[],
  path: null as unknown,
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
vi.mock("../services/progressBankIndex", () => ({ conceptForQuestionId: () => null }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-wa" }, loading: false, mistakeLogsHydrated: 0 }),
}));
/** Device A carries a device-local marker; device B is fresh. ME-CONCEPT-1 PR-B: the page reads no
 *  device-local weak-area source at all (the old `getWeakAreas` mock is gone with its import). */
const DEVICE_KEY = "test.device";
vi.mock("../services/spacedRepetitionEngine", () => ({
  getDueReviews: () => [],
  getSRStats: () => ({ total: 0, newCount: 0, learning: 0, review: 0, mastered: 0, dueToday: 0 }),
}));
vi.mock("../services/learningPathGenerator", () => ({
  generateLearningPath: () => null,
  loadLearningPath: () => H.path,
  markDayCompleted: () => undefined,
  checkAndAdaptPath: () => null,
}));

import WeakAreaPracticePage, {
  areaEvidence,
  areaStatus,
  difficultyFromMarksLost,
  emptyListGateMet,
  weakAreasFromModel,
} from "./WeakAreaPracticePage";
import {
  ME_DEFAULT_WINDOW,
  modelNamesWeakness,
  readStudyModel,
  rungNamesWeakness,
  subjectRungOf,
} from "../services/progressReadModel";

let n = 0;
function attempt(agoMs: number, scored: number, available: number): PracticeAttempt {
  n += 1;
  return {
    id: `a${n}`,
    timestamp: NOW - agoMs,
    subject: "maths",
    topicKey: "arithmetic-progression",
    topicName: "Arithmetic Progression",
    questionId: `q${n}`,
    marksScored: scored,
    marksAvailable: available,
    mode: "graded",
  } as unknown as PracticeAttempt;
}

function device(name: "A" | "B"): void {
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY, name);
}

async function renderPage(): Promise<string> {
  render(
    <MemoryRouter>
      <WeakAreaPracticePage />
    </MemoryRouter>,
  );
  await screen.findByText("Arithmetic Progression");
  return document.body.textContent ?? "";
}

beforeEach(() => {
  cleanup();
  n = 0;
  H.navigate = [];
  H.path = null;
});

describe("Weak Area Practice — no mastery, and Accuracy/Attempts from the shared model (OWNER RULING 2026-10-06)", () => {
  it("★ below Me's threshold (2 graded answers): no 'mastery', no 0%, no number — and (PR-2d) no topic named", async () => {
    H.attempts = [attempt(0.5 * HOUR, 0, 2), attempt(0.5 * HOUR, 0, 2)];
    for (const d of ["A", "B"] as const) {
      device(d);
      render(
        <MemoryRouter>
          <WeakAreaPracticePage />
        </MemoryRouter>,
      );
      await screen.findByTestId("weak-area-empty-thin");
      await new Promise((r) => setTimeout(r, 30));
      expect(screen.queryByTestId("weak-area-empty-thin")).not.toBeNull();
      expect(document.body.textContent).not.toMatch(/Arithmetic Progression/);
      expect(document.body.textContent).not.toMatch(/mastery/i);
      expect(document.body.textContent).not.toMatch(/(^|[^\d.])0%/);
      expect(screen.queryByTestId("weak-area-evidence")).toBeNull();
      cleanup();
    }
  });

  it("above the Maths gate, a chapter with no rung of its own is NOT listed (ME-CONCEPT-1 PR-B: no device-local stand-in)", async () => {
    // 8 graded answers on ANOTHER chapter — the Maths paper passes, the AP chapter has no rung.
    // Before PR-B the device-local list still named AP here (with no number); now the list is the
    // model's, so only the chapter with graded evidence (Triangles) is named.
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => ({
      ...attempt(h * HOUR, i % 2 ? 2 : 0, 2),
      topicKey: "triangles",
      topicName: "Triangles",
    }));
    const model = await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW });
    expect(emptyListGateMet(model, "All")).toBe(true); // precondition
    expect(areaEvidence(model, "arithmetic-progression")).toBeNull(); // precondition
    for (const d of ["A", "B"] as const) {
      device(d);
      render(
        <MemoryRouter>
          <WeakAreaPracticePage />
        </MemoryRouter>,
      );
      await screen.findByText("Triangles");
      expect(document.body.textContent).not.toMatch(/Arithmetic Progression/);
      expect(screen.queryByTestId("weak-area-evidence-thin")).toBeNull();
      expect(document.body.textContent).not.toMatch(/(^|[^\d.])0%/);
      fireEvent.click(screen.getByRole("button", { name: "Practice Now" }));
      // 8 of 16 marks lost → half lost → Medium (graded marks lost, never mastery).
      expect(H.navigate.at(-1)).toMatch(/topic=triangles&.*difficulty=Medium/);
      cleanup();
    }
  });

  it("★ above the threshold: the SAME Accuracy/Attempts on two devices, equal to the read model", async () => {
    // 8 graded answers over the window (both halves measurable): 8 of 16 marks scored.
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2 ? 2 : 0, 2));
    const model = await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW });
    const evidence = areaEvidence(model, "arithmetic-progression");
    expect(evidence).not.toBeNull();
    expect(evidence!.attempts).toBe(8);
    expect(evidence!.accuracy).toBe(50);

    const seen: string[] = [];
    for (const d of ["A", "B"] as const) {
      device(d);
      await renderPage();
      const row = await screen.findByTestId("weak-area-evidence");
      expect(row.textContent).toBe(`Accuracy: ${evidence!.accuracy}%Attempts: ${evidence!.attempts}`);
      expect(document.body.textContent).not.toMatch(/mastery/i);
      seen.push(row.textContent ?? "");
      fireEvent.click(screen.getByRole("button", { name: "Practice Now" }));
      // 8 of 16 marks lost → half lost → Medium.
      expect(H.navigate.at(-1)).toMatch(/difficulty=Medium/);
      cleanup();
    }
    expect(seen[0]).toBe(seen[1]);
  });

  it("difficulty follows graded marks lost (most lost → Easy · a third or more → Medium · little → Hard)", () => {
    const ev = (lostShare: number) => ({ accuracy: Math.round((1 - lostShare) * 100), attempts: 8, marksLost: lostShare * 16, lostShare });
    expect(difficultyFromMarksLost(null)).toBe("Easy");
    expect(difficultyFromMarksLost(ev(0.75))).toBe("Easy");
    expect(difficultyFromMarksLost(ev(0.5))).toBe("Medium");
    expect(difficultyFromMarksLost(ev(0.1))).toBe("Hard");
  });
});

describe("Weak Area Practice — an empty list never praises, and follows the gate of the paper on screen (PR-2c)", () => {
  const PRAISE = /looking strong|No Weak Areas|great job|well done|keep it up/i;
  async function renderEmpty(): Promise<void> {
    render(
      <MemoryRouter>
        <WeakAreaPracticePage />
      </MemoryRouter>,
    );
    await screen.findByText("Fix My Weak Areas");
  }
  /** Let the shared read model resolve and the page re-render. */
  const settle = () => new Promise((r) => setTimeout(r, 30));
  const aboveGateMaths = () => [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h) => attempt(h * HOUR, 2, 2));

  it("★ 0 graded answers: no praise — the honest 'not enough graded yet' state, pointing to Practice", async () => {
    H.attempts = [];
    device("B");
    await renderEmpty();
    await screen.findByTestId("weak-area-empty-thin");
    await settle();
    const thin = screen.getByTestId("weak-area-empty-thin");
    expect(thin.textContent).toMatch(/Not enough of your answers have been graded yet to suggest a topic/);
    expect(document.body.textContent).not.toMatch(PRAISE);
    fireEvent.click(screen.getByRole("button", { name: "Go to Practice" }));
    expect(H.navigate.at(-1)).toBe("/practice-hub");
  });

  it("below the gate (2 graded answers): still 'not enough graded yet', no praise", async () => {
    H.attempts = [attempt(0.5 * HOUR, 2, 2), attempt(0.5 * HOUR, 2, 2)];
    device("B");
    await renderEmpty();
    await settle();
    expect(screen.queryByTestId("weak-area-empty-thin")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(PRAISE);
  });

  it("★ above the gate with no weak topic listed: a NEUTRAL line — no praise in any state", async () => {
    H.attempts = aboveGateMaths();
    expect(modelNamesWeakness(await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW }))).toBe(true); // precondition
    device("B");
    await renderEmpty();
    const none = await screen.findByTestId("weak-area-empty-none");
    expect(none.textContent).toMatch(/No Topic to Suggest Right Now/);
    expect(screen.queryByTestId("weak-area-empty-thin")).toBeNull();
    expect(document.body.textContent).not.toMatch(PRAISE);
    // …and on the Maths tab (its own rung passes) too.
    fireEvent.click(screen.getByRole("button", { name: /^Maths/ }));
    await settle();
    expect(screen.queryByTestId("weak-area-empty-none")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(PRAISE);
  });

  it("★ Maths above the gate, Science tab with 0 Science answers → the Science paper's own gate: 'not enough graded yet'", async () => {
    H.attempts = aboveGateMaths(); // every attempt is maths
    const model = await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW });
    expect(modelNamesWeakness(model)).toBe(true); // precondition: the both-papers gate PASSES
    expect(rungNamesWeakness(subjectRungOf(model.progress, "science"))).toBe(false); // …the Science rung does not
    device("B");
    await renderEmpty();
    await screen.findByTestId("weak-area-empty-none"); // "All" tab: the gate is met
    fireEvent.click(screen.getByRole("button", { name: /^Science/ }));
    await settle();
    expect(screen.queryByTestId("weak-area-empty-thin")).not.toBeNull();
    expect(screen.queryByTestId("weak-area-empty-none")).toBeNull();
    expect(document.body.textContent).not.toMatch(PRAISE);
  });

  it("emptyListGateMet: no model → false; 'All' = every paper with answers; a tab = that paper's rung", async () => {
    expect(emptyListGateMet(null, "All")).toBe(false);
    H.attempts = aboveGateMaths();
    const model = await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW });
    expect(emptyListGateMet(model, "All")).toBe(true);
    expect(emptyListGateMet(model, "Maths")).toBe(true);
    expect(emptyListGateMet(model, "Science")).toBe(false);
  });
});

/*
 * ME-ENGINE-1 PR-2d — honesty follow-ups from live #970-L1 (2026-10-07). Mutations this block
 * turns RED:
 *   W1 — the list ignores the gate again (`weakAreasFromModel` skips its gate) → the ★ below-gate
 *        pins on All AND Maths (a topic named from ONE miss, the header "1 Weak Areas");
 *   W2 — the Learning Path shows its "0% complete" / "0 weak areas targeted" again;
 *   W3 — the status label reads the DEVICE-LOCAL `confidenceScore` again → the two-device pin.
 */
describe("Weak Area Practice — nothing named, counted or labelled before there is evidence (PR-2d)", () => {
  const settle = () => new Promise((r) => setTimeout(r, 30));
  const oneMiss = () => [attempt(0.5 * HOUR, 1, 2), attempt(0.5 * HOUR, 0.5, 2)]; // the live 2 graded answers
  async function renderAndSettle(): Promise<void> {
    render(
      <MemoryRouter>
        <WeakAreaPracticePage />
      </MemoryRouter>,
    );
    await screen.findByText("Fix My Weak Areas");
    await settle();
  }

  it("★ W1 — below the gate, All AND Maths tabs name no topic: 'Not Enough Graded Yet', no count, no targeted session", async () => {
    H.attempts = oneMiss();
    const model = await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW });
    expect(rungNamesWeakness(subjectRungOf(model.progress, "maths"))).toBe(false); // precondition: below
    for (const d of ["A", "B"] as const) {
      device(d);
      await renderAndSettle();
      for (const tab of ["All", "Maths"] as const) {
        if (tab !== "All") fireEvent.click(screen.getByRole("button", { name: /^Maths/ }));
        await settle();
        expect(screen.queryByTestId("weak-area-empty-thin")).not.toBeNull();
        const text = document.body.textContent ?? "";
        expect(text).not.toMatch(/Arithmetic Progression/);
        expect(text).not.toMatch(/Start Targeted Session|, starting with /);
        expect(text).not.toMatch(/Weak Areas\s*\(1\)|1Weak Areas/);
        expect(screen.queryByRole("button", { name: "Generate Learning Path" })).toBeNull();
      }
      cleanup();
    }
  });

  it("★ CONTROL: above the gate the SAME list names the topic, with its count", async () => {
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2 ? 2 : 0, 2));
    device("B");
    await renderAndSettle();
    await screen.findByText("Arithmetic Progression");
    // DECISION 61b — "Practise {chapter}, starting with {concept}": no count, no difficulty order.
    const start = screen.getByRole("button", { name: /^Practise Arithmetic Progression(, starting with [^()]+)?$/ });
    expect(start.textContent).toMatch(/^Practise Arithmetic Progression(, starting with [^()]+)?$/);
    expect(document.body.textContent ?? "").not.toMatch(/\b15 questions\b|\(\d+ questions\)|Easy\s*(→|->)\s*Hard/);
    expect(document.body.textContent).toMatch(/1Weak Areas/);
  });

  it("weakAreasFromModel (ME-CONCEPT-1 PR-B): no model → none; below the paper's gate → none; above → the chapters that lost marks", async () => {
    expect(weakAreasFromModel(null, "All")).toEqual([]);
    H.attempts = oneMiss();
    expect(weakAreasFromModel(await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW }), "All")).toEqual([]);
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2 ? 2 : 0, 2));
    const above = await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW });
    expect(weakAreasFromModel(above, "All")).toEqual([
      { topicKey: "arithmetic-progression", topicName: "Arithmetic Progression", subject: "Maths", marksLost: 8, weakConcepts: [] },
    ]);
    // …the Science tab names nothing (no Science answer: its own rung is below the gate)
    expect(weakAreasFromModel(above, "Science")).toEqual([]);
    // above the gate with no mark lost → no chapter to name
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h) => attempt(h * HOUR, 2, 2));
    expect(weakAreasFromModel(await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW }), "All")).toEqual([]);
  });

  it("★ W1 — below the gate the Learning Path tab names no topic either", async () => {
    H.attempts = oneMiss();
    H.path = {
      id: "lp", createdAt: "", updatedAt: "", totalDays: 14, daysCompleted: 0, weakAreasAtStart: 1, status: "active",
      days: [{ day: 1, date: "2099-01-01", topics: [{ topicKey: "arithmetic-progression", topicName: "Arithmetic Progression", subject: "Maths", targetQuestions: 5, difficulty: "Easy", focusConcepts: [] }], reviewTopics: [], estimatedMinutes: 60, isMilestone: false }],
    };
    device("B");
    await renderAndSettle();
    fireEvent.click(screen.getByRole("button", { name: /^Learning Path/ }));
    await settle();
    expect(screen.queryByTestId("wap-path-thin")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/Arithmetic Progression/);
    expect(document.body.textContent).not.toMatch(/\d%/);
  });

  it("★ W2 — above the gate, a path with no day done shows no '0% complete' and no '0 weak areas targeted'", async () => {
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2 ? 2 : 0, 2));
    H.path = {
      id: "lp", createdAt: "", updatedAt: "", totalDays: 14, daysCompleted: 0, weakAreasAtStart: 0, status: "active",
      days: [{ day: 1, date: "2099-01-01", topics: [], reviewTopics: [], estimatedMinutes: 30, isMilestone: false }],
    };
    device("B");
    await renderAndSettle();
    fireEvent.click(screen.getByRole("button", { name: /^Learning Path/ }));
    await settle();
    expect(screen.getByText("Day 1 of 14")).toBeTruthy(); // precondition: the path view IS on screen
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/0%/);
    expect(text).not.toMatch(/complete/);
    expect(text).not.toMatch(/0 weak areas? targeted/);
    expect(screen.queryByTestId("wap-path-not-started")).not.toBeNull();
    cleanup();
    // CONTROL: real progress shows its real percent and count.
    H.path = { ...(H.path as object), daysCompleted: 7, weakAreasAtStart: 2 };
    await renderAndSettle();
    fireEvent.click(screen.getByRole("button", { name: /^Learning Path/ }));
    await settle();
    expect(screen.getByTestId("wap-path-progress").textContent).toMatch(/50%/);
    expect(screen.getByTestId("wap-path-targeted").textContent).toBe("2 weak areas targeted");
  });

  it("★ W3 — two devices, one cloud: the SAME status label, from the shared model (never device-local)", async () => {
    // 8 graded AP answers: 8 of 16 marks lost → half lost → "Needs Work" on every device.
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2 ? 2 : 0, 2));
    const model = await readStudyModel("u-wa", { window: ME_DEFAULT_WINDOW });
    const expected = areaStatus(areaEvidence(model, "arithmetic-progression"));
    expect(expected).toBe("Needs Work");
    const seen: string[] = [];
    for (const d of ["A", "B"] as const) {
      device(d); // A's local score is 5 (old "Review"), B's is 20 (old "Needs Work")
      await renderPage();
      const status = await screen.findByTestId("weak-area-status");
      seen.push(status.textContent ?? "");
      cleanup();
    }
    expect(seen).toEqual([expected, expected]);
  });

  it("areaStatus: no evidence → no status; otherwise by the share of graded marks lost", () => {
    const ev = (lostShare: number) => ({ accuracy: 0, attempts: 8, marksLost: 0, lostShare });
    expect(areaStatus(null)).toBeNull();
    expect(areaStatus(ev(0.75))).toBe("Critical");
    expect(areaStatus(ev(0.5))).toBe("Needs Work");
    expect(areaStatus(ev(0.1))).toBe("Review");
  });
});

/*
 * ME-ENGINE-1 PR-2d (controller addition) — "Closed This Week" was computed from the RETIRED mastery
 * score (`computeTopicMastery`, a store with no writer), so it could only ever be 0: a figure that
 * can never be real. The tile and the "N weak areas closed this week!" banner are removed. The pin
 * used to feed a NON-ZERO closure count (2) through the device-local `getWeakAreas` mock; since
 * ME-CONCEPT-1 PR-B the page reads no such source (the read model has no closure figure at all), so
 * the pin now asserts the tile's ABSENCE in every state, with the CONTROL below proving the stat row
 * renders. Mutation this block turns RED: C1 — put the tile back (any text matching CLOSURE).
 */
describe("Weak Area Practice — no mastery-based closure figure in any state (PR-2d)", () => {
  const settle = () => new Promise((r) => setTimeout(r, 30));
  const CLOSURE = /closed this week/i;
  const states: Array<[string, () => void]> = [
    ["0 graded answers, empty list", () => { H.attempts = []; }],
    ["below the gate, one weak area", () => { H.attempts = [attempt(0.5 * HOUR, 1, 2), attempt(0.5 * HOUR, 0.5, 2)]; }],
    ["above the gate, one weak area", () => { H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2 ? 2 : 0, 2)); }],
    ["above the gate, empty list", () => { H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h) => attempt(h * HOUR, 2, 2)); }],
  ];
  for (const [name, arrange] of states) {
    it(`★ ${name}: no 'Closed This Week' tile, no closure banner`, async () => {
      arrange();
      device("B");
      render(
        <MemoryRouter>
          <WeakAreaPracticePage />
        </MemoryRouter>,
      );
      await screen.findByText("Fix My Weak Areas");
      await settle();
      expect(document.body.textContent).not.toMatch(CLOSURE);
    });
  }

  it("★ CONTROL: above the gate the stat row IS on screen (so the absence above is not an absent row)", async () => {
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2 ? 2 : 0, 2));
    device("B");
    render(
      <MemoryRouter>
        <WeakAreaPracticePage />
      </MemoryRouter>,
    );
    await screen.findByText("Arithmetic Progression");
    expect(document.body.textContent).toMatch(/1Weak Areas/);
  });
});
