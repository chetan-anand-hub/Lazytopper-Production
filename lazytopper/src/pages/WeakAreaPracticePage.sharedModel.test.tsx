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
 * the read model is REAL. The weak-area LIST (`getWeakAreas`) is mocked to carry DEVICE-LOCAL
 * figures that differ per "device" (and a mastery of 0), so any read of them shows up.
 *
 * Mutations this file turns RED: A1 — a mastery label comes back; A2 — a 0% is shown below the
 * threshold (the old `area.accuracy` with no evidence); A3 — Accuracy/Attempts read the
 * device-local weak-area figures again; A4 — difficulty from mastery again.
 *
 * ME-ENGINE-1 PR-2c [WEAKAREA-EMPTY-PRAISE] — an empty list never praises (the list is still
 * device-local: FU-B18-WEAKAREA-LOCAL-LIST), and its copy follows the gate of the paper ON SCREEN:
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
  emptyList: false,
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
/** Device-local figures: device A has some, device B (fresh) has none — mastery is always 0. */
const DEVICE_KEY = "test.device";
vi.mock("../services/weakAreaAggregator", () => ({
  getWeakAreas: () => {
    if (H.emptyList) return { weakAreas: [], totalWeak: 0, closedThisWeek: 0, overallMasteryPercent: 0 };
    const deviceA = window.localStorage.getItem("test.device") === "A";
    const area = {
      topicKey: "arithmetic-progression",
      topicName: "Arithmetic Progression",
      subject: "Maths" as const,
      confidenceScore: 30,
      accuracy: deviceA ? 13 : 0,
      totalAttempts: deviceA ? 2 : 0,
      wrongCount: 2,
      masteryPercent: 0,
      masteryState: "unseen",
      lastPracticedAt: 0,
      weakConcepts: [],
    };
    return { weakAreas: [area], totalWeak: 1, closedThisWeek: 0, overallMasteryPercent: 0 };
  },
}));
vi.mock("../services/spacedRepetitionEngine", () => ({
  getDueReviews: () => [],
  getSRStats: () => ({ total: 0, newCount: 0, learning: 0, review: 0, mastered: 0, dueToday: 0 }),
}));
vi.mock("../services/learningPathGenerator", () => ({
  generateLearningPath: () => null,
  loadLearningPath: () => null,
  markDayCompleted: () => undefined,
  checkAndAdaptPath: () => null,
}));

import WeakAreaPracticePage, { areaEvidence, difficultyFromMarksLost, emptyListGateMet } from "./WeakAreaPracticePage";
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
  H.emptyList = false;
});

describe("Weak Area Practice — no mastery, and Accuracy/Attempts from the shared model (OWNER RULING 2026-10-06)", () => {
  it("★ below Me's threshold (2 graded answers): no 'mastery', no 0%, no number — an honest line instead", async () => {
    H.attempts = [attempt(0.5 * HOUR, 0, 2), attempt(0.5 * HOUR, 0, 2)];
    for (const d of ["A", "B"] as const) {
      device(d);
      const text = await renderPage();
      await waitFor(() => expect(screen.getByTestId("weak-area-evidence-thin")).toBeTruthy());
      expect(text).not.toMatch(/mastery/i);
      expect(document.body.textContent).not.toMatch(/(^|[^\d.])0%/);
      expect(screen.queryByTestId("weak-area-evidence")).toBeNull();
      // No evidence → the targeted start, Easy (never a retired figure).
      fireEvent.click(screen.getByRole("button", { name: "Practice Now" }));
      expect(H.navigate.at(-1)).toMatch(/difficulty=Easy/);
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
    H.emptyList = true;
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
    H.emptyList = true;
    H.attempts = [attempt(0.5 * HOUR, 2, 2), attempt(0.5 * HOUR, 2, 2)];
    device("B");
    await renderEmpty();
    await settle();
    expect(screen.queryByTestId("weak-area-empty-thin")).not.toBeNull();
    expect(document.body.textContent).not.toMatch(PRAISE);
  });

  it("★ above the gate with no weak topic listed: a NEUTRAL line — no praise in any state", async () => {
    H.emptyList = true;
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
    H.emptyList = true;
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
