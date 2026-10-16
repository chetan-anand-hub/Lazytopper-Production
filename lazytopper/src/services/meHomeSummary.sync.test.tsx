// @vitest-environment jsdom
/**
 * MI-HOME-SYNC — G3-style consistency: for the SAME fixture student, Home's Mistake Intelligence
 * card, the sidebar MI panel and Quick Practice's "My weak areas" card print EXACTLY the numbers
 * and the Practise hrefs Me/Progress RENDERS. Three fixtures:
 *   - MCQ-ONLY (the owner's live case): two Quick Practice MCQ sets graded — marks on the table,
 *     no mistake type anywhere ("no reason recorded" in Me);
 *   - TYPED: the same plus typed mistakes — Home's four tiles carry Me's split;
 *   - EMPTY: no graded work — every surface keeps today's empty state.
 *
 * Only the CLOUD streams are mocked (attempts, session records, the mistake history, the bank
 * index); the read model, Me's derivations and the summary are REAL.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry } from "./mistakeLogService";
import { istDayStartMs } from "./progressStore";

configure({ asyncUtilTimeout: 8000 });

const HOUR = 60 * 60 * 1000;
const NOW = Date.now();
const TODAY_SPAN_MS = Math.min(HOUR, NOW - istDayStartMs(NOW));
const at = (h: number) => (h < 1 ? h * TODAY_SPAN_MS : h * HOUR);

const H = vi.hoisted(() => ({
  uid: "u-sync",
  attempts: [] as PracticeAttempt[],
  mistakes: [] as MistakeLogEntry[],
}));

vi.mock("./practiceInsights", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./practiceInsights")>()),
  // Fresh objects per read, as Firestore returns them.
  getAttemptsFromCloud: async (_uid: string, { start }: { start?: number } = {}) =>
    H.attempts.filter((a) => start === undefined || a.timestamp >= start).map((a) => ({ ...a })),
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
// The bank index is REAL (not mocked): Me fires its two reads CONCURRENTLY, and in vitest a
// concurrent `import()` of a vi.mock'ed module can resolve the ORIGINAL module for the second
// caller — which silently emptied Me's concept rows in this harness. Real served bank ids are
// picked in beforeAll instead.
vi.mock("../components/subscription/UpgradeSheet", () => ({ UpgradeSheet: () => null }));
vi.mock("../hooks/useIsDesktop", () => ({ useIsDesktop: () => true }));
vi.mock("../hooks/useSubscription", () => ({ useSubscription: () => ({ isPremium: true }) }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: H.uid, displayName: "Asha Rao" }, loading: false, mistakeLogsHydrated: 0 }),
}));

import MeProgressPage from "../pages/MeProgressPage";
import { MistakeIntelligenceCard } from "../pages/desktop/DesktopHome";
import { MistakeIntelCard } from "../components/desktop/MistakeIntelCard";
import { QuickPracticePresets, QP_PRESETS, weakAreasCardFrom } from "../components/practice/QuickPracticePresets";
import { loadMeConceptRows, loadMeHome, resetMeHomeMemo, type MeHomeSummary } from "./meHomeSummary";
import { zeroMarksLost } from "../lib/mistakeDisplay";
import { loadExamConceptResolvers } from "./mistakeConcept";
import { conceptForQuestionId } from "./progressBankIndex";
import { bankIndexEntries } from "../data/bankChapters/bankIdIndex";

/* ───────────────────────────── fixtures ───────────────────────────── */

let n = 0;
/** Served Real Numbers bank ids that resolve to ONE Exam Trends concept (picked in beforeAll). */
let CONCEPT_IDS: string[] = [];

/** A Quick Practice MCQ pick: 1 mark, right or wrong; mode "mcq" (no mistake type, no MI entry).
 *  `inBank` → a real served id on the fixture concept; else an id the bank does not know. */
function mcq(agoMs: number, scored: 0 | 1, inBank: boolean): PracticeAttempt {
  n += 1;
  const questionId = inBank ? CONCEPT_IDS[n % CONCEPT_IDS.length] : `not-in-bank-${n}`;
  return {
    id: `a${n}`,
    timestamp: NOW - agoMs,
    subject: "maths",
    topicKey: "real-numbers",
    topicName: "Real Numbers",
    questionId,
    marksScored: scored,
    marksAvailable: 1,
    mode: "mcq",
  } as unknown as PracticeAttempt;
}

/** The owner's case: two 10-question MCQ sets on Real Numbers, most picks real bank questions on
 *  one concept, a few the bank cannot place ("not yet traced to a concept" in Me). */
function mcqOnlyStudent(): PracticeAttempt[] {
  const hours = [0.2, 0.3, 0.4, 0.5, 20, 21, 22, 23, 24, 25, 50, 51, 52, 53, 54, 70, 71, 72, 100, 130];
  return hours.map((h, i) => mcq(at(h), i % 3 === 0 ? 0 : 1, i % 5 !== 4));
}

function typedMistake(id: string, agoMs: number, m: Partial<ReturnType<typeof zeroMarksLost>>, marksLost: number): MistakeLogEntry {
  return {
    id,
    timestamp: new Date(NOW - agoMs).toISOString(),
    questionText: "Q",
    topic: "Real Numbers",
    subject: "Maths",
    totalMarks: 3,
    marksLost,
    mistakeCounts: { conceptual: 0, calculation: 0, silly: 0, presentation: 0 },
    stepDetails: [],
    marksLostByType: { ...zeroMarksLost(), ...m },
    marksLostByTypeVersion: 1,
  } as unknown as MistakeLogEntry;
}

/* ───────────────────────────── Me's rendered numbers ───────────────────────────── */

interface MeRendered {
  title: string;
  firstChapter: { label: string; marks: string; practise: string } | null;
  firstConcept: { label: string; marks: string; practise: string } | null;
  legend: number[];
}

async function renderMe(): Promise<MeRendered> {
  const { container, unmount } = render(
    <MemoryRouter>
      <MeProgressPage />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByTestId("me-booting")).toBeNull());
  const title = container.querySelector(".lt-me__title")?.textContent ?? "";
  // Me settles on its paper (a second scoped read) — wait for the start-here list, when it has one.
  const drill = await screen.findByTestId("me-drill-topics").catch(() => null);
  let firstChapter: MeRendered["firstChapter"] = null;
  if (drill) {
    const card = drill.querySelector("li")!;
    firstChapter = {
      label: card.querySelector(".lt-me__chapter-name")!.textContent ?? "",
      marks: card.querySelector(".lt-me__worth")!.textContent ?? "",
      practise: card.querySelector('a[data-testid^="me-cta-practise-"]')!.getAttribute("href") ?? "",
    };
  }
  await screen.findAllByTestId(/^me-practise-concept-/, {}, { timeout: drill ? 8000 : 50 }).catch(() => null);
  const conceptLink = container.querySelector('a[data-testid^="me-practise-concept-"]');
  const conceptRow = conceptLink ? conceptLink.closest("li") : null;
  const firstConcept = conceptRow
    ? {
        label: (conceptRow.querySelector(".lt-me__row-name")!.firstChild?.textContent ?? "").trim(),
        marks: conceptRow.querySelector(".lt-me__row-marks")!.textContent ?? "",
        practise: conceptRow.querySelector('a[data-testid^="me-practise-concept-"]')!.getAttribute("href") ?? "",
      }
    : null;
  const legend = Array.from(container.querySelectorAll(".lt-me__legend b")).map((b) =>
    Number((b.textContent ?? "").match(/[\d.]+/)?.[0] ?? NaN),
  );
  unmount();
  return { title, firstChapter, firstConcept, legend };
}

async function summary(): Promise<MeHomeSummary> {
  return (await loadMeHome(H.uid)).summary;
}

// The app's own Exam Trends concept resolver, loaded once up front (as the G3 pin does), so the
// FIRST render's concept rows do not race the lazy concept-map chunk in jsdom.
beforeAll(async () => {
  const { conceptRowOf } = await loadExamConceptResolvers();
  // The Real Numbers concept with the most served questions, and its ids.
  const byConcept = new Map<string, string[]>();
  for (const [id] of bankIndexEntries()) {
    const row = conceptRowOf(conceptForQuestionId(id));
    if (!row || !row.examConcept || row.chapter !== "real-numbers") continue;
    byConcept.set(row.key, [...(byConcept.get(row.key) ?? []), id]);
  }
  CONCEPT_IDS = [...byConcept.values()].sort((a, b) => b.length - a.length)[0] ?? [];
  expect(CONCEPT_IDS.length).toBeGreaterThan(0);
});

beforeEach(() => {
  resetMeHomeMemo();
  H.attempts = [];
  H.mistakes = [];
});
afterEach(() => cleanup());

/* ───────────────────────────── MCQ-only (the owner's case) ───────────────────────────── */

describe("MI-HOME-SYNC — MCQ-only (owner's live case): Home == sidebar == Me", () => {
  beforeEach(() => {
    H.uid = "u-mcq";
    H.attempts = mcqOnlyStudent();
  });

  it("★★ Home shows Me's marks on the table, Me's biggest win, Me's top concept and Me's Practise href", async () => {
    const me = await renderMe();
    const s = await summary();
    expect(s.lost).toBeGreaterThan(0);
    expect(s.hasTyped).toBe(false);
    // Me's hero sentence is "<name>, there are <N> marks on the table."
    expect(me.title).toContain(`${s.lost} marks on the table`);
    expect(me.firstChapter).not.toBeNull();
    expect(me.firstConcept).not.toBeNull();

    render(
      <MemoryRouter>
        <MistakeIntelligenceCard summary={s} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("home-mi-card").getAttribute("data-state")).toBe("untyped");
    expect(screen.getByTestId("home-mi-lost").textContent).toBe(`${s.lost} marks on the table`);
    expect(screen.getByTestId("home-mi-top-chapter").textContent).toContain(me.firstChapter!.label);
    expect(screen.getByTestId("home-mi-top-chapter").textContent).toContain(me.firstChapter!.marks);
    expect(screen.getByTestId("home-mi-top-concept").textContent).toContain(me.firstConcept!.label);
    expect(screen.getByTestId("home-mi-top-concept").textContent).toContain(me.firstConcept!.marks);
    // The SAME href Me's start-here Practise button carries.
    expect(screen.getByTestId("home-mi-practise").getAttribute("href")).toBe(me.firstChapter!.practise);
    // No type is invented: all four tiles "—"; the honest line points at Check & Improve.
    for (const tile of screen.getAllByTestId("home-mi-bucket")) {
      expect(tile.querySelector(".lt-n")!.textContent).toBe("—");
    }
    expect(screen.getByTestId("home-mi-check").getAttribute("href")).toMatch(/^\/check-improve/);
    expect(screen.getByTestId("home-mi-check").textContent).toBe("Check a written answer to see why you lose them");
    expect(screen.queryByText("Practise a set to see your mistakes.")).toBeNull();
  });

  it("★★ the sidebar says Me's marks on the table and Me's top concept — never 'No mistake patterns yet'", async () => {
    const me = await renderMe();
    const s = await summary();
    render(
      <MemoryRouter>
        <MistakeIntelCard />
      </MemoryRouter>,
    );
    const line = await screen.findByTestId("mi-card-untyped");
    expect(line.textContent).toContain(`${s.lost} marks on the table`);
    expect(screen.getByTestId("mi-card-untyped-top").textContent).toBe(me.firstConcept!.label);
    expect(screen.getByTestId("mi-card-check").getAttribute("href")).toBe("/check-improve");
    expect(screen.queryByText(/No mistake patterns yet/)).toBeNull();
  });

  it("★★ B — Quick Practice 'My weak areas' is LIVE on Me's top concept, with Me's concept Practise href", async () => {
    const me = await renderMe();
    const rows = await loadMeConceptRows(H.uid, "Maths");
    const card = weakAreasCardFrom(true, rows);
    expect(card.kind).toBe("live");
    if (card.kind !== "live") return;
    expect(card.href).toBe(me.firstConcept!.practise);
    expect(card.concepts[0].label).toBe(me.firstConcept!.label);
    render(
      <MemoryRouter>
        <QuickPracticePresets
          presets={QP_PRESETS}
          selectedKey="board"
          onSelect={() => {}}
          competencyAvailable
          onStart={() => {}}
          onCustomise={() => {}}
          timerEnabled={false}
          onToggleTimer={() => {}}
          weakAreas={card}
        />
      </MemoryRouter>,
    );
    const live = screen.getByTestId("qp-weak-live");
    expect(live.getAttribute("href")).toBe(me.firstConcept!.practise);
    expect(screen.getByTestId("qp-weak-top").textContent).toContain(me.firstConcept!.label);
    expect(live.textContent).not.toMatch(/Soon/);
  });
});

/* ───────────────────────────── typed mistakes ───────────────────────────── */

describe("MI-HOME-SYNC — typed mistakes: Home's tiles carry Me's split", () => {
  beforeEach(() => {
    H.uid = "u-typed";
    H.attempts = mcqOnlyStudent();
    H.mistakes = [
      typedMistake("quick-practice::T1::q1", at(0.3), { conceptual: 1 }, 1),
      typedMistake("quick-practice::T2::q2", at(22), { silly: 1 }, 1),
    ];
  });

  it("★★ tiles == Me's legend: Concept gap = knowledge, Presentation = technique, Calculation + Silly = careless", async () => {
    const me = await renderMe();
    const s = await summary();
    expect(s.hasTyped).toBe(true);
    expect(s.split).not.toBeNull();
    // Me's legend order: secured, knowledge, technique, careless, [not attempted], remainder.
    const [secured, knowledge, technique, careless] = me.legend;
    expect(secured).toBe(s.split!.secured);
    expect(knowledge).toBe(s.split!.knowledge);
    expect(technique).toBe(s.split!.technique);
    expect(careless).toBe(s.split!.careless);
    expect(me.title).toContain(`${s.lost} marks on the table`);

    render(
      <MemoryRouter>
        <MistakeIntelligenceCard summary={s} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("home-mi-card").getAttribute("data-state")).toBe("typed");
    expect(screen.getByTestId("home-mi-lost").textContent).toBe(`${s.lost} marks on the table`);
    const tile = (k: string) => {
      const el = screen.getAllByTestId("home-mi-bucket").find((t) => t.getAttribute("data-type") === k)!;
      const v = el.querySelector(".lt-n")!.textContent ?? "";
      return v === "—" ? 0 : Number(v);
    };
    expect(tile("conceptual")).toBe(knowledge);
    expect(tile("presentation")).toBe(technique);
    expect(tile("calculation") + tile("silly")).toBe(careless);
    expect(tile("conceptual")).toBe(1);
    expect(tile("silly")).toBe(1);
    // No "why" line once Me names a type.
    expect(screen.queryByTestId("home-mi-check")).toBeNull();
    expect(screen.getByTestId("home-mi-practise").getAttribute("href")).toBe(me.firstChapter!.practise);
  });
});

/* ───────────────────────────── empty ───────────────────────────── */

describe("MI-HOME-SYNC — no graded work: every surface keeps today's empty state", () => {
  beforeEach(() => {
    H.uid = "u-empty";
  });

  it("★ Home empty state unchanged, sidebar 'No mistake patterns yet', Quick Practice card locked", async () => {
    const me = await renderMe();
    expect(me.title).toBe("This is where your marks will show up.");
    const s = await summary();
    expect(s.lost).toBe(0);
    render(
      <MemoryRouter>
        <MistakeIntelligenceCard summary={s} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("home-mi-card").getAttribute("data-state")).toBe("empty");
    expect(screen.getByText("Your mistake patterns will show here")).toBeTruthy();
    expect(screen.getByText("Practise a set to see your mistakes.")).toBeTruthy();
    expect(screen.getByTestId("home-mi-first-set")).toBeTruthy();
    cleanup();
    render(
      <MemoryRouter>
        <MistakeIntelCard />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No mistake patterns yet/)).toBeTruthy();
    expect(weakAreasCardFrom(true, await loadMeConceptRows(H.uid, "Maths"))).toEqual({ kind: "locked" });
  });
});
