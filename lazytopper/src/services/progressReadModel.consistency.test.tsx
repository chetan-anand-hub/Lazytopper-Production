// @vitest-environment jsdom
/**
 * ME-ENGINE-1 PR-1 — THE G3 CONSISTENCY PIN.
 *
 * ONE fixture student. For EVERY window (today, 7, 14, 30, 120 days) and EVERY subject scope
 * (Maths, Science, both), the numbers Me/Progress derives and the shared read model's own output
 * are IDENTICAL — and the RENDERED page prints them.
 *
 * Only the CLOUD streams are mocked (attempts, session records, the synced mistake history);
 * `getWindowedProgress`, the read model and Me's derivations are REAL.
 *
 * ★ TWO NAMED SLOTS at the end (`it.todo`): the sidebar MI widget (its switch is HELD — the CI ops
 *   gate `check_improve_convergence_acceptance.mjs` MIC (H3) pins the card's OLD data source and
 *   may only be amended with the owner's words; the ready patch is recorded in the PR) and the
 *   Tutor brief (ME-ENGINE-1 PR-2).
 *
 * Mutation this file turns RED: M3 — a reader with its own canonicaliser (Me's chapter list
 * grouping mistakes by `normalizeTopicKey` again, the topicAliasMap vocabulary).
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { PracticeAttempt } from "./practiceInsights";
import type { SessionRecord } from "./sessionRecords";
import type { MistakeLogEntry } from "./mistakeLogService";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** One clock for the whole fixture — far enough from an IST midnight that `today` is stable. */
const NOW = Date.now();

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  records: [] as SessionRecord[],
  mistakes: [] as MistakeLogEntry[],
}));

vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.attempts.filter((a) => start === undefined || a.timestamp >= start),
}));
vi.mock("./sessionRecords", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./sessionRecords")>()),
  getSessionRecordsFromCloud: async () => H.records,
  getAllSessionPerQuestionFromCloud: async () => [],
}));
vi.mock("./mistakeLogService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./mistakeLogService")>()),
  getMistakeLogs: async () => [],
  getMistakeLogHistoryFromCloud: async (_uid: string, startMs: number) => ({
    entries: H.mistakes.filter(
      (e) => Date.parse(e.timestamp) >= startMs || (e.resolvedAt ? Date.parse(e.resolvedAt) >= startMs : false),
    ),
    complete: true,
  }),
}));
vi.mock("./progressBankIndex", () => ({ conceptForQuestionId: () => null }));
vi.mock("../components/subscription/UpgradeSheet", () => ({ UpgradeSheet: () => null }));
vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => true }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "u-g3", displayName: "Asha Rao" }, loading: false, mistakeLogsHydrated: 0 }),
}));

import {
  READ_WINDOWS,
  readStudyModel,
  subjectRungOf,
  type ReadSubject,
  type StudyReadModel,
} from "./progressReadModel";
import MeProgressPage, { buildChapters, splitPaperMarks } from "../pages/MeProgressPage";
import { zeroMarksLost } from "../lib/mistakeDisplay";

const UID = "u-g3";

/* ────────────────────────────── the fixture student ────────────────────────────── */

let n = 0;
function attempt(agoMs: number, subject: "maths" | "science", topicKey: string, scored: number, available: number, mode = "graded"): PracticeAttempt {
  n += 1;
  return { id: `a${n}`, timestamp: NOW - agoMs, subject, topicKey, topicName: topicKey, questionId: `q${n}`, marksScored: scored, marksAvailable: available, mode } as unknown as PracticeAttempt;
}
function mistake(id: string, agoMs: number, over: Partial<MistakeLogEntry>): MistakeLogEntry {
  return {
    id,
    timestamp: new Date(NOW - agoMs).toISOString(),
    questionText: "Q",
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: 3,
    marksLost: 1,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    ...over,
  };
}
const v2 = (m: Partial<ReturnType<typeof zeroMarksLost>>) => ({
  marksLostByType: { ...zeroMarksLost(), ...m },
  marksLostByTypeVersion: 1,
});

beforeAll(() => {
  const at = (h: number) => h * HOUR;
  H.attempts = [
    // Maths, Real Numbers — recent (some within the last hour = "today" in any time zone)
    attempt(at(0.2), "maths", "real-numbers", 1, 3),
    attempt(at(0.4), "maths", "real-numbers", 2, 3),
    attempt(at(20), "maths", "real-numbers", 0, 2),
    attempt(at(30), "maths", "real-numbers", 3, 3),
    attempt(at(50), "maths", "real-numbers", 1, 2),
    attempt(at(70), "maths", "real-numbers", 2, 5),
    attempt(at(100), "maths", "real-numbers", 1, 1),
    attempt(at(130), "maths", "polynomials", 0, 3),
    // Maths, older
    attempt(10 * DAY, "maths", "polynomials", 1, 2),
    attempt(20 * DAY, "maths", "polynomials", 2, 4),
    attempt(60 * DAY, "maths", "polynomials", 1, 3),
    attempt(100 * DAY, "maths", "polynomials", 0, 2),
    // Science — Heredity (7) and Reproduction (6) inside a week, so both chapters have a rung
    ...[0.3, 5, 25, 45, 65, 90, 120].map((h) => attempt(at(h), "science", "heredity", 1, 3)),
    ...[1, 10, 35, 55, 80, 110].map((h) => attempt(at(h), "science", "how-do-organisms-reproduce", 2, 3)),
    attempt(at(2), "science", "heredity", 0, 1, "mcq"), // an MCQ click — not a checked answer
    attempt(40 * DAY, "science", "electricity", 1, 5),
  ];
  H.records = [];
  H.mistakes = [
    // Maths — "Mathematics" is the same paper (one subject split)
    mistake("quick-practice::M1::q1", at(0.2), { subject: "Mathematics", marksLost: 2, ...v2({ conceptual: 1, calculation: 0.5, untyped: 0.5 }) }),
    mistake("1727000000000-legacy1", at(20), { marksLost: 2, mistakeCounts: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 }, stepDetails: [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 1 }] }),
    mistake("quick-practice::M2::q8", at(130), { topic: "Polynomials", marksLost: 3, ...v2({ presentation: 1, conceptual: 2 }) }),
    // re-graded away — history only, never a live number
    mistake("quick-practice::M3::q4", at(30), { marksLost: 3, ...v2({ conceptual: 3 }), resolvedAt: new Date(NOW - at(29)).toISOString(), resolvedBy: "re-grade" }),
    // Science — the topic LABELS are the spellings a second canonicaliser splits differently
    mistake("quick-practice::S1::q13", at(0.3), { subject: "Science", topic: "Heredity and Evolution", marksLost: 2, ...v2({ conceptual: 2 }) }),
    mistake("1727000000000-legacy2", at(10), { subject: "Science", topic: "How do Organisms Reproduce", marksLost: 1, mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 1 }] }),
    // won back later — still a live mistake where it happened, and counted as won back
    mistake("quick-practice::S2::q14", at(25), { subject: "Science", topic: "Heredity", marksLost: 2, ...v2({ calculation: 2 }), resolvedAt: new Date(NOW - at(2)).toISOString(), resolvedBy: "later-correct-attempt" }),
  ];
});

const SCOPES: Array<ReadSubject | null> = ["maths", "science", null];
const PAPER_LABEL = { maths: "Maths", science: "Science" } as const;

async function model(window: (typeof READ_WINDOWS)[number], subject: ReadSubject | null): Promise<StudyReadModel> {
  return readStudyModel(UID, { window, ...(subject ? { subject } : {}), nowMs: NOW });
}

/* ───────────────────────────── the pin, every window × scope ───────────────────────────── */

describe("G3 — ONE fixture student: Me/Progress == the read model, every window and subject", () => {
  for (const window of READ_WINDOWS) {
    for (const subject of SCOPES) {
      it(`${window} · ${subject ?? "both papers"}`, async () => {
        const m = await model(window, subject);
        if (!subject) {
          // Both papers: the model's ungated total is exactly the two papers' totals summed.
          const maths = m.progress.subjectTotals.maths?.marksLost ?? 0;
          const science = m.progress.subjectTotals.science?.marksLost ?? 0;
          expect(m.progress.totals?.marksLost ?? 0).toBeCloseTo(maths + science, 5);
          return;
        }
        // Me's numbers for the same paper — from Me's own (exported) derivations.
        const both = await model(window, null);
        const rung = subjectRungOf(both.progress, subject);
        const split = splitPaperMarks(rung, m.mistakes.entries);
        if (rung) {
          expect(split).not.toBeNull();
          // Me's "marks on the table" == the model's ungated total, scoped and unscoped.
          expect(split!.lost).toBe(m.progress.totals!.marksLost);
          expect(split!.lost).toBe(both.progress.subjectTotals[subject]!.marksLost);
          expect(split!.splitKnown).toBe(true);
          // Me's hero groups == the model's ONE group split.
          expect(split!.knowledge).toBe(m.mistakes.byGroup.knowledge);
          expect(split!.technique).toBe(m.mistakes.byGroup.technique);
          expect(split!.careless).toBe(m.mistakes.byGroup.careless);
        } else {
          // Below the existing gate Me shows NO number (the threshold is not lowered).
          expect(split).toBeNull();
        }

        // Me's chapter list attributes mistakes through the model's ONE canonicaliser.
        const chapters = buildChapters(m.progress.topics, PAPER_LABEL[subject], m.mistakes.byChapter);
        for (const c of chapters) {
          expect(c.retryEntry?.id ?? null).toBe(m.mistakes.byChapter[c.key]?.[0]?.id ?? null);
        }
      });
    }
  }

  it("★ PRECONDITIONS the pin depends on (so it cannot pass vacuously)", async () => {
    const week = await model("week", "science");
    const chapters = buildChapters(week.progress.topics, "Science", week.mistakes.byChapter);
    // Both chapters whose LABELS another canonicaliser spells differently carry a retry entry.
    expect(chapters.find((c) => c.key === "heredity")?.retryEntry?.id).toBe("quick-practice::S1::q13");
    expect(chapters.find((c) => c.key === "how-do-organisms-reproduce")?.retryEntry?.id).toBe("1727000000000-legacy2");
    // A gated subject rung exists for both papers in the week, and NOT today.
    const both = await model("week", null);
    expect(subjectRungOf(both.progress, "maths")).not.toBeNull();
    expect(subjectRungOf(both.progress, "science")).not.toBeNull();
    // The "Mathematics" entry and the legacy one are Maths mistakes; the re-graded one is not live.
    const maths = await model("week", "maths");
    expect(maths.mistakes.entries.map((e) => e.id)).toEqual(["quick-practice::M1::q1", "1727000000000-legacy1", "quick-practice::M2::q8"]);
    expect(maths.mistakes.legacyCount).toBe(1);
    // Won back this week — the later-correct attempt.
    expect(week.mistakes.wonBack).toMatchObject({ count: 1, marks: 2 });
  });
});

/* ───────────────────────────── the RENDERED surfaces print them ───────────────────────────── */

describe("G3 — the rendered surfaces print the model's numbers", () => {
  it("★ Me/Progress — the hero for the chosen paper, Month then Week, Maths then Science", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/me"]}>
        <MeProgressPage />
      </MemoryRouter>,
    );
    const heroLost = async (): Promise<number> => {
      let v = NaN;
      await waitFor(() => {
        const t = screen.getByRole("heading", { level: 1 }).textContent || "";
        const hit = t.match(/(\d+(?:\.\d+)?) marks? on the table/);
        expect(hit).toBeTruthy();
        v = Number(hit![1]);
      });
      return v;
    };
    await user.click(await screen.findByTestId("me-paper-maths"));
    expect(await heroLost()).toBe((await readStudyModel(UID, { window: "month", subject: "maths" })).progress.totals!.marksLost);
    await user.click(screen.getByRole("button", { name: "Week" }));
    await waitFor(async () =>
      expect(await heroLost()).toBe((await readStudyModel(UID, { window: "week", subject: "maths" })).progress.totals!.marksLost),
    );
    await user.click(screen.getByTestId("me-paper-science"));
    await waitFor(async () =>
      expect(await heroLost()).toBe((await readStudyModel(UID, { window: "week", subject: "science" })).progress.totals!.marksLost),
    );
    cleanup();
  });
});

/* ───────────────────────────── the Tutor slot (PR-2) ───────────────────────────── */

describe("G3 — the surfaces that join this pin next", () => {
  // ★ NAMED SLOT — the sidebar MI widget. HELD: `scripts/ops/check_improve_convergence_acceptance.mjs`
  // MIC (H3) pins `getAttemptsFromCloud(` / `a.mode === "graded"` / `aggregateEntryMarks(entries)` /
  // `groupMarks(marks)` in MistakeIntelCard.tsx, so the card cannot read this model until the owner
  // approves amending those gate lines. Then: `computeMiCardSummary(readStudyModel(uid, { window:
  // "week" }))` and assert checkedCount / marks lost / biggest loss == the model, every window and scope.
  it.todo("[FU-ME1-WIDGET-GATE] · the sidebar MI widget reads readStudyModel and joins this pin");
  // ★ NAMED HOOK for ME-ENGINE-1 PR-2: switch `assembleTutorBrief` to `readStudyModel(uid,
  // { window, subject, topicKey })` and assert, for the same fixture, window and subject, that the
  // brief's figures equal the model's (and so Me's).
  it.todo("ME-ENGINE-1 PR-2 · the Tutor brief reads readStudyModel and joins this pin");
});
