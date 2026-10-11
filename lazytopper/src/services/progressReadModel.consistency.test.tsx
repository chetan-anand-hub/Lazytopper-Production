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
 * ★ The Tutor brief JOINED in ME-ENGINE-1 PR-2: for every window × paper and every chapter, the
 *   brief == Me's numbers == the model (`briefFromModel`), and a Tutor doubt is counted.
 * ★ The sidebar MI widget JOINED in ME-ENGINE-1 PR-2b (OWNER RULING 2026-10-06, Round 2 — the CI
 *   ops gate MIC (H3) lines that pinned its OLD source were amended under the four standing
 *   conditions): widget == Me == brief == the model, the last slot filled.
 * ★ ME-CONCEPT-1 extended it to CONCEPTS: the brief's named concepts are the model's Exam Trends
 *   concepts (each mistake resolved through its questionId), and Me's rendered Concepts tab prints
 *   the model's rows and their per-concept notes.
 *
 * Mutations this file turns RED: M3 — a reader with its own canonicaliser (Me's chapter list
 * grouping mistakes by `normalizeTopicKey` again, the topicAliasMap vocabulary); PR-2 W — the
 * brief reading a different window than the one it is asked for (e.g. its old fixed 120 days);
 * PR-2b G — the brief names concept labels without Me's weakness gate (`weaknessNamingRung`).
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, waitFor, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { PracticeAttempt } from "./practiceInsights";
import type { SessionRecord } from "./sessionRecords";
import type { MistakeLogEntry } from "./mistakeLogService";
import type { TutorTurnEvent } from "./tutorSessionStore";
import { istDayStartMs } from "./progressStore";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** One clock for the whole fixture (the test clock when LT_TEST_CLOCK is set). */
const NOW = Date.now();
/**
 * [FU-ME-PROGRESS-CONSISTENCY-IST-MIDNIGHT] — the fixture's "today" activity (everything under
 * an hour old) must fall INSIDE the current IST calendar day, which `today` and Tutor sessions
 * are keyed on (by design: progressStore.windowRange / tutorSessionStore.istDayKey). The old
 * fixture put it 6–24 minutes before NOW, so in the first ~24 minutes after an IST midnight
 * (18:30–18:54Z) it landed on YESTERDAY and the pin failed — a TEST defect; the code's IST
 * boundaries are right. Sub-hour offsets are now scaled into the part of the IST day that has
 * elapsed (at most an hour), so their order is kept and they stay "today" at every instant.
 */
const TODAY_SPAN_MS = Math.min(60 * 60 * 1000, NOW - istDayStartMs(NOW));

const H = vi.hoisted(() => ({
  attempts: [] as PracticeAttempt[],
  records: [] as SessionRecord[],
  mistakes: [] as MistakeLogEntry[],
  turns: [] as TutorTurnEvent[],
  // ME-CONCEPT-1 — the served bank rows two mistakes point at (every other id resolves to nothing).
  bank: {
    "b-rn-hcf": { subtopic: "HCF and LCM", section: "B", topicKey: "real-numbers" },
    "b-her-alleles": { subtopic: "Alleles", section: "A", topicKey: "heredity" },
  } as Record<string, { subtopic: string; section: string; topicKey: string }>,
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
vi.mock("./tutorSessionStore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tutorSessionStore")>()),
  getTutorTurnsFromCloud: async (_uid: string, startMs: number) => ({
    events: H.turns.filter((e) => e.at >= startMs),
    complete: true,
  }),
}));
vi.mock("./progressBankIndex", () => ({
  conceptForQuestionId: (id: string | null | undefined) => (id ? H.bank[String(id)] ?? null : null),
}));
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
  topLossGroup,
  type ReadSubject,
  type StudyReadModel,
} from "./progressReadModel";
import MeProgressPage, { buildChapters, conceptMistakesNote, splitPaperMarks } from "../pages/MeProgressPage";
import { MistakeIntelCard, computeMiCardSummary } from "../components/desktop/MistakeIntelCard";
import { assembleTutorBrief, briefFromModel } from "../pages/tutor/tutorContextBrief";
import { mistakeGroupByKey } from "../lib/mistakeDisplay";
import { zeroMarksLost } from "../lib/mistakeDisplay";
import { loadExamConceptResolvers, type ExamConceptResolvers } from "./mistakeConcept";

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

/** ME-CONCEPT-1 — the app's own Exam Trends resolver (loaded once, as the app loads it). */
let resolvers: ExamConceptResolvers;

beforeAll(async () => {
  resolvers = await loadExamConceptResolvers();
  // Sub-hour offsets are "today" activity — kept inside the current IST day (see TODAY_SPAN_MS).
  const at = (h: number) => (h < 1 ? h * TODAY_SPAN_MS : h * HOUR);
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
  // ME-CONCEPT-1 — the Real Numbers answers are bank questions labelled "HCF and LCM" (the concept
  // map rolls that up to "Fundamental Theorem of Arithmetic"), so Me's Concepts tab has a row.
  // COFOUNDER DECISION 61a (the STRICT brief: a concept is named only if Me has its row) — the
  // seven graded Heredity answers are likewise bank questions labelled "Alleles" (the S1 mistake's
  // own bank row, which the concept map rolls up to "Mendel's Experiments & Ratios"), so Me's
  // Concepts tab has that row (≥ MIN_HALF_SAMPLE per half) in every window where the brief names it.
  // The MCQ click stays off the bank — it is not a checked answer.
  for (const a of H.attempts) {
    if (a.topicKey === "real-numbers") H.bank[a.questionId] = { subtopic: "HCF and LCM", section: "B", topicKey: "real-numbers" };
    if (a.topicKey === "heredity" && a.mode === "graded") H.bank[a.questionId] = { subtopic: "Alleles", section: "A", topicKey: "heredity" };
  }
  H.records = [];
  H.mistakes = [
    // Maths — "Mathematics" is the same paper (one subject split)
    mistake("quick-practice::M1::q1", at(0.2), { subject: "Mathematics", marksLost: 2, concept: "Euclid's division lemma", questionId: "b-rn-hcf", mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, ...v2({ conceptual: 1, calculation: 0.5, untyped: 0.5 }) }),
    mistake("1727000000000-legacy1", at(20), { marksLost: 2, mistakeCounts: { conceptual: 0, calculation: 0, silly: 1, presentation: 0 }, stepDetails: [{ stepNumber: 1, mistakeType: "silly", marksDeducted: 1 }] }),
    mistake("quick-practice::M2::q8", at(130), { topic: "Polynomials", marksLost: 3, ...v2({ presentation: 1, conceptual: 2 }) }),
    // re-graded away — history only, never a live number
    mistake("quick-practice::M3::q4", at(30), { marksLost: 3, ...v2({ conceptual: 3 }), resolvedAt: new Date(NOW - at(29)).toISOString(), resolvedBy: "re-grade" }),
    // Science — the topic LABELS are the spellings a second canonicaliser splits differently
    mistake("quick-practice::S1::q13", at(0.3), { subject: "Science", topic: "Heredity and Evolution", marksLost: 2, concept: "Mendel's contribution", questionId: "b-her-alleles", ...v2({ conceptual: 2 }) }),
    mistake("1727000000000-legacy2", at(10), { subject: "Science", topic: "How do Organisms Reproduce", marksLost: 1, mistakeCounts: { conceptual: 1, calculation: 0, silly: 0, presentation: 0 }, stepDetails: [{ stepNumber: 1, mistakeType: "conceptual", marksDeducted: 1 }] }),
    // won back later — still a live mistake where it happened, and counted as won back
    mistake("quick-practice::S2::q14", at(25), { subject: "Science", topic: "Heredity", marksLost: 2, ...v2({ calculation: 2 }), resolvedAt: new Date(NOW - at(2)).toISOString(), resolvedBy: "later-correct-attempt" }),
  ];
  // Tutor doubts: two today on Real Numbers (ONE session), one 3 days ago on Heredity, one
  // 50 days ago on Polynomials.
  const turn = (agoMs: number, topicKey: string, subject: "maths" | "science"): TutorTurnEvent => ({
    at: NOW - agoMs,
    topicKey,
    subject,
  });
  H.turns = [
    turn(at(0.1), "real-numbers", "maths"),
    turn(at(0.15), "real-numbers", "maths"),
    turn(3 * DAY, "heredity", "science"),
    turn(50 * DAY, "polynomials", "maths"),
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
      }, { timeout: 8000 });
      return v;
    };
    // The expected figure is read ONCE per step (not inside every waitFor poll) and the wait is
    // given room: under a loaded runner (the IST-midnight pin runs this file in child processes)
    // the old per-poll model read made the default 1 s wait time out — a flake, not a mismatch.
    const WAIT = { timeout: 8000 };
    await user.click(await screen.findByTestId("me-paper-maths"));
    const monthMaths = (await readStudyModel(UID, { window: "month", subject: "maths" })).progress.totals!.marksLost;
    expect(await heroLost()).toBe(monthMaths);
    await user.click(screen.getByRole("button", { name: "Week" }));
    const weekMaths = (await readStudyModel(UID, { window: "week", subject: "maths" })).progress.totals!.marksLost;
    await waitFor(async () => expect(await heroLost()).toBe(weekMaths), WAIT);
    await user.click(screen.getByTestId("me-paper-science"));
    const weekScience = (await readStudyModel(UID, { window: "week", subject: "science" })).progress.totals!.marksLost;
    await waitFor(async () => expect(await heroLost()).toBe(weekScience), WAIT);
    cleanup();
  });

  it("★ ME-CONCEPT-1 — Me's Concepts tab prints the model's Exam Trends rows and each row's per-concept note", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/me"]}>
        <MeProgressPage />
      </MemoryRouter>,
    );
    await user.click(await screen.findByTestId("me-paper-maths"));
    // Me opens on Month (Me's default) — the model for the same read.
    const m = await readStudyModel(UID, { window: "month", subject: "maths" });
    const row = m.progress.concepts.find((r) => r.key === "real-numbers|Fundamental Theorem of Arithmetic");
    expect(row, "precondition: the fixture has the FTA concept row").toBeDefined();
    expect(row!.mistakes).toEqual(m.mistakes.byConcept[row!.key]);
    const note = conceptMistakesNote(row!.mistakes);
    expect(note).toBe("Concept gap 1");
    const view = await screen.findByTestId("me-view-concepts", {}, { timeout: 8000 });
    await waitFor(() => expect(within(view).getByTestId(`me-concept-note-${row!.key}`).textContent).toBe(note), { timeout: 8000 });
    expect(within(view).getByText("Fundamental Theorem of Arithmetic")).toBeTruthy();
    expect(within(view).queryByText("HCF and LCM")).toBeNull(); // the bank label is not shown
    // == the brief: the chapter's weakest Exam Trends concept is the row Me prints.
    expect(briefFromModel(m, "real-numbers").topic.weakConcepts).toEqual(["Fundamental Theorem of Arithmetic"]);
    cleanup();
  });
});

/* ───────────────────────────── the Tutor brief (PR-2) ───────────────────────────── */

/** The chapter's live mistakes' EXAM TRENDS concepts by marks lost (≤ 3) — the brief's rule above
 *  the gate (ME-CONCEPT-1), recomputed here through the app's own resolver from each mistake's
 *  questionId (this fixture has no later correct answers, so nothing is won back). */
function liveConcepts(m: StudyReadModel, chapter: string): string[] {
  const by = new Map<string, number>();
  for (const e of m.mistakes.byChapter[chapter] ?? []) {
    const c = resolvers.examConceptForBankQuestionId(e.questionId) ?? "";
    if (c) by.set(c, (by.get(c) ?? 0) + Math.max(0, Number(e.marksLost) || 0));
  }
  return [...by.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([c]) => c);
}

const CHAPTERS = ["real-numbers", "polynomials", "heredity", "how-do-organisms-reproduce", "electricity"];

describe("G3 — the Tutor brief joins the pin: Me == brief == the model, every window × paper × chapter", () => {
  for (const window of READ_WINDOWS) {
    for (const subject of ["maths", "science"] as const) {
      it(`${window} · ${subject}`, async () => {
        const m = await model(window, subject);
        // Me's numbers for the paper, from Me's own (exported) derivations.
        const both = await model(window, null);
        const split = splitPaperMarks(subjectRungOf(both.progress, subject), m.mistakes.entries);
        for (const chapter of CHAPTERS) {
          const brief = await assembleTutorBrief({ uid: UID, topicKey: chapter, subject, window, nowMs: NOW });
          // The read-model API, the same read: the brief IS the model's figures.
          expect(brief).toEqual(briefFromModel(m, chapter));
          // == Me: "marks on the table" and the hero's biggest group, or nothing below Me's gate.
          if (split) {
            expect(brief.mistakes.marksLostRecent).toBe(split.lost);
            const groups = (["knowledge", "technique", "careless"] as const).filter((g) => split[g] > 0);
            const top = groups.reduce<(typeof groups)[number] | null>((best, g) => (best && split[best] >= split[g] ? best : g), null);
            expect(brief.mistakes.topType ?? null).toBe(top ? mistakeGroupByKey(top).label.toLowerCase() : null);
          } else {
            expect(brief.mistakes).toEqual({});
          }
          // == Me's chapter list: the trend only where the model has the chapter's rung (the rung
          // Me's chapter list is built from); named concepts only from the chapter's live mistakes.
          const rung = m.progress.topics.find((r) => r.key === chapter);
          expect(Boolean(brief.topic.trend)).toBe(Boolean(rung));
          // PR-2b — ONE gate for NAMING a weakness: below Me's (no hero split) the brief names
          // no concept either; above it, exactly the chapter's live recorded concepts by marks.
          if (!split) {
            expect(brief.topic.weakConcepts).toBeUndefined();
          } else {
            expect(brief.topic.weakConcepts ?? []).toEqual(liveConcepts(m, chapter));
          }
          if (brief.topic.weakConcepts) {
            // ME-CONCEPT-1 — every named concept is one of the model's per-concept rows for the chapter.
            const live = new Set(Object.values(m.mistakes.byConcept).filter((r) => r.chapter === chapter).map((r) => r.label));
            for (const c of brief.topic.weakConcepts) expect(live.has(c)).toBe(true);
            const meChapter = buildChapters(m.progress.topics, PAPER_LABEL[subject], m.mistakes.byChapter).find((c) => c.key === chapter);
            if (meChapter) expect(meChapter.retryEntry).not.toBeNull();
          }
        }
      });
    }
  }

  it("★ PRECONDITIONS — the brief carries real figures in the week (the pin is not vacuous)", async () => {
    const maths = await assembleTutorBrief({ uid: UID, topicKey: "real-numbers", subject: "maths", window: "week", nowMs: NOW });
    expect(maths.mistakes.marksLostRecent).toBeGreaterThan(0);
    expect(maths.mistakes.topType).toBeTruthy();
    expect(maths.topic.trend).toBeTruthy();
    expect(maths.topic.weakConcepts).toEqual(["Fundamental Theorem of Arithmetic"]);
    const science = await assembleTutorBrief({ uid: UID, topicKey: "Heredity and Evolution", subject: "science", window: "week", nowMs: NOW });
    expect(science.topic.weakConcepts).toEqual(["Mendel's Experiments & Ratios"]);
    // The window is honoured: today has no gated rung, so no trend and no hero figure.
    const today = await assembleTutorBrief({ uid: UID, topicKey: "real-numbers", subject: "maths", window: "today", nowMs: NOW });
    expect(today.topic.trend).toBeUndefined();
    expect(today.mistakes).toEqual({});
    // PR-2b — today the chapter HAS a live mistake with a recorded concept, but Me names no
    // weakness (no hero split), so the brief names no concept (the gate is not vacuous here).
    const todayModel = await model("today", "maths");
    expect(liveConcepts(todayModel, "real-numbers")).toEqual(["Fundamental Theorem of Arithmetic"]);
    expect(splitPaperMarks(subjectRungOf((await model("today", null)).progress, "maths"), todayModel.mistakes.entries)).toBeNull();
    expect(today.topic.weakConcepts).toBeUndefined();
  });
});

describe("G3 — activity: a Tutor doubt is counted in every window, by the model's one read", () => {
  const expected: Record<(typeof READ_WINDOWS)[number], { doubts: number; sessions: number }> = {
    today: { doubts: 2, sessions: 1 },
    week: { doubts: 3, sessions: 2 },
    "2wk": { doubts: 3, sessions: 2 },
    month: { doubts: 3, sessions: 2 },
    "4mo": { doubts: 4, sessions: 3 },
  };
  for (const window of READ_WINDOWS) {
    it(`${window} — doubts and sessions, both papers and per paper`, async () => {
      const all = await model(window, null);
      expect(all.activity.tutor).toEqual({ ...expected[window], complete: true });
      const maths = await model(window, "maths");
      const science = await model(window, "science");
      expect(maths.activity.tutor.doubts + science.activity.tutor.doubts).toBe(all.activity.tutor.doubts);
      // The other activity counts are the progress read's own, one rule.
      expect(all.activity.practice).toBe(all.progress.activity.practiceAttempts);
      expect(all.activity.answersChecked).toBe(all.progress.activity.gradedAnswers);
    });
  }
});

describe("G3 — the sidebar MI widget joins the pin: widget == Me == brief == the model (OWNER RULING 2026-10-06)", () => {
  // OWNER RULING 2026-10-06 (OWNER_RULINGS_B18_ME.md Round 2): the convergence-gate amendment is
  // approved; "the widget's 'marks lost' = the graded stream, the same as Me". The card reads
  // `readStudyModel(uid, { window: "week" })`, both papers — so for the week: its checked answers
  // are the model's graded answers, and its marks lost are the model's graded-stream total, which
  // is Me's "marks on the table" for Maths plus Science, and the brief's figure for each paper.
  it("★ week, both papers — the pure summary and the RENDERED card print the model's numbers", async () => {
    const all = await model("week", null);
    const card = computeMiCardSummary(all);
    expect(card.checkedCount).toBe(all.progress.activity.gradedAnswers);
    expect(card.checkedCount).toBeGreaterThan(0);
    expect(card.totalMarksLost).toBe(all.progress.totals!.marksLost);

    // == Me, per paper (both papers are above Me's gate in the week — asserted, not assumed).
    let meSum = 0;
    for (const subject of ["maths", "science"] as const) {
      const m = await model("week", subject);
      const split = splitPaperMarks(subjectRungOf(all.progress, subject), m.mistakes.entries);
      expect(split).not.toBeNull();
      meSum += split!.lost;
      // == the brief for the same paper and window.
      const brief = await assembleTutorBrief({ uid: UID, topicKey: "real-numbers", subject, window: "week", nowMs: NOW });
      expect(brief.mistakes.marksLostRecent).toBe(split!.lost);
    }
    expect(card.totalMarksLost).toBeCloseTo(meSum, 5);
    // The biggest loss is the model's ONE group split, in marks.
    expect(card.topLoss?.basis).toBe("marks");
    expect(card.topLoss?.group).toBe(topLossGroup(all.mistakes.byGroup));

    render(
      <MemoryRouter>
        <MistakeIntelCard />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("mi-card-checked").textContent).toBe(`${card.checkedCount} checked answers`),
    );
    expect(screen.getByTestId("mi-card-summary").textContent).toContain(`${card.totalMarksLost} marks lost`);
    cleanup();
  });
});
