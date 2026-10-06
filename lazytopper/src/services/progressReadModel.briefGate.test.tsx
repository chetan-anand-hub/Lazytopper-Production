// @vitest-environment jsdom
/**
 * ME-ENGINE-1 PR-2b — [FU-ME2-BRIEF-CONCEPTS-BELOW-GATE]: ONE gate for NAMING a weakness.
 *
 * The OR-LIVE student after #968: two graded Maths answers (Arithmetic Progression, 0/2 each), two
 * synced mistakes whose recorded concepts are "Identification of AP" and "Sum of n Terms". Me said
 * "We will not name a weakness from one or two questions" while the Tutor brief sent both labels.
 * Here, for the SAME student and window (Month, Me's default and the brief's):
 *   - at 2 graded answers Me's RENDERED page withholds and the brief names nothing — no concept,
 *     no figure, no mistake group;
 *   - above the gate (8 graded answers) Me names (its hero split renders) and the brief names the
 *     same student's real recorded concepts and Me's "marks on the table".
 *
 * Mutation this file turns RED: G — `briefFromModel` names concepts without asking
 * `weaknessNamingRung` (the #968 rule).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry } from "./mistakeLogService";

const HOUR = 60 * 60 * 1000;
const NOW = Date.now();

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  mistakes: [] as MistakeLogEntry[],
}));

vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.attempts.filter((a) => start === undefined || a.timestamp >= start),
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  getSessionRecordsFromCloud: async () => [],
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.mistakes.filter((e) => Date.parse(e.timestamp) >= startMs),
    complete: true,
  }),
}));
vi.mock("./tutorSessionStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tutorSessionStore")>()),
  getTutorTurnsFromCloud: async () => ({ events: [], complete: true }),
}));
vi.mock("./progressBankIndex", () => ({ conceptForQuestionId: () => null }));
vi.mock("../components/subscription/UpgradeSheet", () => ({ UpgradeSheet: () => null }));
vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => true }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-gate", displayName: "Asha Rao" }, loading: false, mistakeLogsHydrated: 0 }),
}));

import { readStudyModel, subjectRungOf, weaknessNamingRung } from "./progressReadModel";
import MeProgressPage, { splitPaperMarks } from "../pages/MeProgressPage";
import { assembleTutorBrief, briefFromModel, TUTOR_BRIEF_WINDOW } from "../pages/tutor/tutorContextBrief";
import { zeroMarksLost } from "../lib/mistakeDisplay";

const UID = "u-gate";
const CHAPTER = "arithmetic-progression";
const WITHHOLD = /We will not name a weakness from one or two questions/;

let n = 0;
function attempt(agoMs: number, scored: number, available: number): PracticeAttempt {
  n += 1;
  return {
    id: `a${n}`,
    timestamp: NOW - agoMs,
    subject: "maths",
    topicKey: CHAPTER,
    topicName: "Arithmetic Progression",
    questionId: `q${n}`,
    marksScored: scored,
    marksAvailable: available,
    mode: "graded",
  } as unknown as PracticeAttempt;
}
function mistake(id: string, agoMs: number, concept: string): MistakeLogEntry {
  return {
    id,
    timestamp: new Date(NOW - agoMs).toISOString(),
    questionText: "Q",
    topic: "Arithmetic Progression",
    subject: "Maths",
    totalMarks: 2,
    marksLost: 2,
    concept,
    mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    marksLostByType: { ...zeroMarksLost(), conceptual: 2 },
    marksLostByTypeVersion: 1,
  } as MistakeLogEntry;
}
const MISTAKES = () => [
  mistake("quick-practice::AP1::AP-N-EXEM-5-VSA-001", 0.5 * HOUR, "Identification of AP"),
  mistake("quick-practice::AP1::AP-E16", 0.5 * HOUR, "Sum of n Terms"),
];

async function renderMe(): Promise<void> {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/me"]}>
      <MeProgressPage />
    </MemoryRouter>,
  );
  await user.click(await screen.findByTestId("me-paper-maths"));
}

beforeEach(() => {
  cleanup();
  n = 0;
});

describe("[FU-ME2-BRIEF-CONCEPTS-BELOW-GATE] Me and the Tutor brief share ONE gate for naming a weakness", () => {
  it("★ 2 graded answers (the OR-LIVE student): Me withholds, and the brief names NOTHING", async () => {
    H.attempts = [attempt(0.5 * HOUR, 0, 2), attempt(0.5 * HOUR, 0, 2)];
    H.mistakes = MISTAKES();

    const m = await readStudyModel(UID, { window: TUTOR_BRIEF_WINDOW, subject: "maths", nowMs: NOW });
    // Precondition (not vacuous): the chapter HAS two live mistakes with real recorded concepts.
    expect((m.mistakes.byChapter[CHAPTER] ?? []).map((e) => e.concept).sort()).toEqual(["Identification of AP", "Sum of n Terms"]);
    // Me's gate: no hero split → Me names no weakness.
    const both = await readStudyModel(UID, { window: TUTOR_BRIEF_WINDOW, nowMs: NOW });
    expect(splitPaperMarks(subjectRungOf(both.progress, "maths"), m.mistakes.entries)).toBeNull();
    expect(weaknessNamingRung(m)).toBeNull();

    const brief = await assembleTutorBrief({ uid: UID, topicKey: CHAPTER, subject: "maths", nowMs: NOW });
    expect(brief.topic.weakConcepts).toBeUndefined();
    expect(brief.mistakes).toEqual({});
    expect(brief).toEqual(briefFromModel(m, CHAPTER));

    // The RENDERED Me says so.
    await renderMe();
    await waitFor(() => expect(screen.getByText(WITHHOLD)).toBeTruthy());
    cleanup();
  });

  it("★ above the gate (8 graded answers): Me names, and the brief names the same student's real concepts and Me's figure", async () => {
    H.attempts = [0.2, 0.4, 20, 30, 50, 70, 100, 130].map((h, i) => attempt(h * HOUR, i % 2, 2));
    H.mistakes = MISTAKES();

    const m = await readStudyModel(UID, { window: TUTOR_BRIEF_WINDOW, subject: "maths", nowMs: NOW });
    const both = await readStudyModel(UID, { window: TUTOR_BRIEF_WINDOW, nowMs: NOW });
    const split = splitPaperMarks(subjectRungOf(both.progress, "maths"), m.mistakes.entries);
    expect(split).not.toBeNull();
    expect(weaknessNamingRung(m)).not.toBeNull();

    const brief = await assembleTutorBrief({ uid: UID, topicKey: CHAPTER, subject: "maths", nowMs: NOW });
    expect(brief.topic.weakConcepts).toEqual(["Identification of AP", "Sum of n Terms"]);
    expect(brief.mistakes.marksLostRecent).toBe(split!.lost);
    expect(brief.mistakes.topType).toBe("knowledge gap");

    await renderMe();
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent ?? "").toMatch(/on the table/));
    expect(screen.queryByText(WITHHOLD)).toBeNull();
    cleanup();
  });
});
