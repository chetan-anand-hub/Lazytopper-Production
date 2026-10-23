// @vitest-environment jsdom
/**
 * MI-HOME-SYNC — G3-style consistency: for the SAME fixture student, Home's Mistake Intelligence
 * card, the sidebar MI panel and Quick Practice's "My weak areas" card print EXACTLY the numbers
 * and the Practise hrefs Me/Progress RENDERS. Four fixtures:
 *   - MCQ-ONLY (the owner's live case): two Quick Practice MCQ sets graded — marks on the table,
 *     no mistake type anywhere ("no reason recorded" in Me);
 *   - TYPED: the same plus typed mistakes — Home's four tiles carry Me's split;
 *   - EMPTY: no graded work — every surface keeps today's empty state;
 *   - THIN: two graded answers, below Me's weakness-naming gate — Quick Practice names nothing.
 * Plus unit pins: hasTyped follows typed entries, and useMeHome resets its read on a uid change.
 *
 * Only the CLOUD streams are mocked (attempts, session records, the mistake history, the bank
 * index); the read model, Me's derivations and the summary are REAL.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, renderHook, screen, waitFor, cleanup, configure } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PracticeAttempt } from "./practiceInsights";
import type { MistakeLogEntry } from "./mistakeLogService";
import { istDayStartMs, type RungTrend } from "./progressStore";
import type { StudyReadModel } from "./progressReadModel";

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
// MI-CONSISTENCY-1 — Home renders the ONE MI card (MiCardHost); the sidebar renders the same card.
import { MiCardHost } from "../components/mi/MiCardHost";
import { MistakeIntelCard } from "../components/desktop/MistakeIntelCard";
import { MI_CARD_COPY, MiCard } from "../components/mi/MiCard";
import { selectMiCard } from "../lib/mi/miCardSummary";
import { resetMiScopeForTests, setMiScope } from "../lib/mi/miScope";
import { within } from "@testing-library/react";
import { QuickPracticePresets, QP_PRESETS } from "../components/practice/QuickPracticePresets";
import { weakAreasCardFrom } from "../components/practice/weakAreasCard";
import {
  computeMeHomeSummary,
  loadMeConceptRows,
  loadMeHome,
  resetMeHomeMemo,
  type MeHomeReader,
  type MeHomeSummary,
} from "./meHomeSummary";
import { useMeHome } from "./useMeHomeSummary";
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

/** `emptyTitle` — the student has no graded work: wait for Me's settled empty hero instead of a
 *  start-here list that will never render (waiting on it only ran the async timeout out). */
async function renderMe(emptyTitle?: string): Promise<MeRendered> {
  const { container, unmount } = render(
    <MemoryRouter>
      <MeProgressPage />
    </MemoryRouter>,
  );
  await waitFor(() => expect(screen.queryByTestId("me-booting")).toBeNull());
  if (emptyTitle !== undefined) {
    await waitFor(() => expect(container.querySelector(".lt-me__title")?.textContent).toBe(emptyTitle));
  }
  const title = container.querySelector(".lt-me__title")?.textContent ?? "";
  // Me settles on its paper (a second scoped read) — wait for the start-here list, when it has one.
  const drill = emptyTitle !== undefined ? null : await screen.findByTestId("me-drill-topics").catch(() => null);
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
  // Me is paper-scoped: the cards are read on Me's paper (Maths in every fixture here).
  resetMiScopeForTests();
  setMiScope("maths");
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

  it("★★ Home and the sidebar print Me's marks on the table — every one of them a wrong tap, no type invented", async () => {
    const me = await renderMe();
    const s = await summary();
    expect(s.lost).toBeGreaterThan(0);
    expect(s.hasTyped).toBe(false);
    // Me's hero sentence is "<name>, there are <N> marks on the table."
    expect(me.title).toContain(`${s.lost} marks on the table`);
    render(
      <MemoryRouter>
        <MiCardHost uid={H.uid} gen={0} returnTo="/" />
        <MistakeIntelCard />
      </MemoryRouter>,
    );
    for (const id of ["home-mi-card", "sidebar-mi-card"]) {
      await waitFor(() => expect(screen.getByTestId(id).getAttribute("data-state")).toBe("ready"));
      const card = within(screen.getByTestId(id));
      expect(card.getByTestId("mi-card-lost").textContent).toBe(`${s.lost} marks lost`);
      const tile = (k: string) => Number(card.getAllByTestId("mi-card-tile").find((t) => t.getAttribute("data-row") === k)!.querySelector(".lt-micard__n")!.textContent);
      // MCQ picks are attempt-only: their whole loss is the wrong-tap tile; no type is invented.
      expect(tile("wrongTap")).toBe(s.lost);
      for (const k of ["conceptual", "calculation", "silly", "presentation"]) expect(tile(k)).toBe(0);
      // The honest action: check a written answer.
      expect(card.getByTestId("mi-card-check").getAttribute("href")).toMatch(/^\/check-improve/);
      expect(card.queryByText(MI_CARD_COPY.emptyTitle)).toBeNull();
    }
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
        <MiCardHost uid={H.uid} gen={0} returnTo="/" />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByTestId("home-mi-card").getAttribute("data-state")).toBe("ready"));
    expect(screen.getByTestId("mi-card-lost").textContent).toBe(`${s.lost} marks lost`);
    const tile = (k: string) => Number(screen.getAllByTestId("mi-card-tile").find((t) => t.getAttribute("data-row") === k)!.querySelector(".lt-micard__n")!.textContent);
    expect(tile("conceptual")).toBe(knowledge);
    expect(tile("presentation")).toBe(technique);
    expect(tile("calculation") + tile("silly")).toBe(careless);
    expect(tile("blank")).toBe(s.split!.notAttempted);
    // Me's remainder is split HONESTLY into wrong taps (attempt-only picks) and no reason recorded.
    expect(Math.round((tile("wrongTap") + tile("unrecorded")) * 10) / 10).toBe(s.split!.unclassified);
    expect(tile("conceptual")).toBe(1);
    expect(tile("silly")).toBe(1);
    // A type is named: the chance is the biggest type (a tie goes to concept gap first).
    expect(screen.getByTestId("mi-card-chance").getAttribute("data-type")).toBe("conceptual");
  });
});

/* ───────────────────────────── empty ───────────────────────────── */

describe("MI-HOME-SYNC — no graded work: every surface keeps today's empty state", () => {
  beforeEach(() => {
    H.uid = "u-empty";
  });

  it("★ Home empty state unchanged, sidebar 'No mistake patterns yet', Quick Practice card locked", async () => {
    const me = await renderMe("This is where your marks will show up.");
    expect(me.title).toBe("This is where your marks will show up.");
    expect(me.firstChapter).toBeNull();
    expect(me.firstConcept).toBeNull();
    const s = await summary();
    expect(s.lost).toBe(0);
    render(
      <MemoryRouter>
        <MiCardHost uid={H.uid} gen={0} returnTo="/" />
        <MistakeIntelCard />
      </MemoryRouter>,
    );
    for (const id of ["home-mi-card", "sidebar-mi-card"]) {
      await waitFor(() => expect(screen.getByTestId(id).getAttribute("data-state")).toBe("empty"));
      expect(within(screen.getByTestId(id)).getByText(MI_CARD_COPY.emptyTitle)).toBeTruthy();
      expect(within(screen.getByTestId(id)).queryAllByTestId("mi-card-tile")).toHaveLength(0);
    }
    expect(weakAreasCardFrom(true, await loadMeConceptRows(H.uid, "Maths"))).toEqual({ kind: "locked" });
  });
});

/* ───────────────────────────── thin: below Me's weakness-naming gate ───────────────────────────── */

describe("MI-HOME-SYNC — thin student (2 graded answers, below Me's gate): nothing names a weak area", () => {
  beforeEach(() => {
    H.uid = "u-thin";
    H.attempts = [mcq(at(0.2), 0, true), mcq(at(0.3), 0, true)];
  });

  it("★ Home has no split, and Quick Practice 'My weak areas' is NOT live (locked, honest copy)", async () => {
    const s = await summary();
    expect(s.split).toBeNull();
    const rows = await loadMeConceptRows(H.uid, "Maths");
    expect(rows).toEqual([]);
    const card = weakAreasCardFrom(true, rows);
    expect(card).toEqual({ kind: "locked" });
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
    expect(screen.queryByTestId("qp-weak-live")).toBeNull();
    expect(screen.getByText("Unlocks once a few answers are graded")).toBeTruthy();
  });

  it("★ a concept row with marks lost is NOT named while the paper's rung is below Me's gate", async () => {
    const concept = { key: "real-numbers::hcf", label: "HCF and LCM", marksAvailable: 4, marksScored: 1 };
    const model = (paperRung: Record<string, unknown>) =>
      ({ progress: { subjects: [paperRung], concepts: [concept], topics: [] } }) as unknown as StudyReadModel;
    // Below the gate: the subject rung carries no marks base (Me: "We will not name a weakness").
    const below: MeHomeReader = async () => model({ key: "maths", label: "Maths" });
    expect(await loadMeConceptRows("u-gate-below", "Maths", 0, below)).toEqual([]);
    // Above the gate: the same concept row is named, with Me's concept Practise href.
    const above: MeHomeReader = async () => model({ key: "maths", label: "Maths", marksAvailable: 12, marksScored: 6 });
    const rows = await loadMeConceptRows("u-gate-above", "Maths", 0, above);
    expect(rows.map((r) => [r.label, r.lost])).toEqual([["HCF and LCM", 3]]);
  });
});

/* ───────────────────────────── hasTyped / uid change (unit) ───────────────────────────── */

describe("MI-HOME-SYNC — hasTyped follows the typed entries, not the split's splitKnown", () => {
  it("★ typed entries that over-attribute (splitKnown false) still count as typed: no 'Check a written answer' prompt", () => {
    const rung = { key: "maths", label: "Maths", marksAvailable: 10, marksScored: 8 } as unknown as RungTrend;
    const entries = [typedMistake("quick-practice::T1::q1", at(0.3), { conceptual: 5 }, 5)];
    const s = computeMeHomeSummary(
      { progress: { subjects: [rung] } as unknown as StudyReadModel["progress"] },
      "Maths",
      { topics: [], concepts: [] },
      { entries, byChapter: {} },
    );
    expect(s.split?.splitKnown).toBe(false); // precondition: the log names more than was lost
    expect(s.lost).toBe(2);
    expect(s.hasTyped).toBe(true);
    // MI-CONSISTENCY-1 — the ONE card, over the same withheld split: the whole loss is "no reason
    // recorded" and the card says Me's own sentence instead of asking for a written answer.
    const model = {
      progress: { subjects: [rung], subjectTotals: { maths: { answers: 6 } } },
      mistakes: { entries, complete: true },
      range: { start: NOW - 30 * 86400000, end: NOW },
    } as unknown as StudyReadModel;
    const card = selectMiCard(model, "maths", { source: "home", returnTo: "/" }, 0);
    expect(card.splitWithheld).toBe(true);
    expect(card.rows.find((r) => r.key === "unrecorded")!.marks).toBe(2);
    render(
      <MemoryRouter>
        <MiCard variant="light" status="ok" summary={card} scope="maths" onScope={() => {}} meHref="/me" checkHref="/check-improve" />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("mi-card-split-withheld")).toBeTruthy();
    expect(screen.queryByTestId("mi-card-check")).toBeNull();
  });
});

describe("MI-HOME-SYNC — useMeHome never shows one student's read under another uid", () => {
  it("★ a uid change resets `read` to null while the new uid loads", async () => {
    H.uid = "u-mcq";
    H.attempts = mcqOnlyStudent();
    // uid A reads through the real read model; uid B's read never settles (still loading).
    const pending: MeHomeReader = () => new Promise(() => {});
    const { result, rerender } = renderHook(
      ({ uid, reader }: { uid: string; reader?: MeHomeReader }) => useMeHome(uid, 0, reader),
      { initialProps: { uid: "u-mcq" } as { uid: string; reader?: MeHomeReader } },
    );
    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.read).not.toBeNull();
    rerender({ uid: "u-other", reader: pending });
    await waitFor(() => expect(result.current.status).toBe("loading"));
    expect(result.current.read).toBeNull();
  });
});
