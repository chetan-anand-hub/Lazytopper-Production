// FRESH-SET-QP — "Every time a student comes to a Quick Practice set, he is given a unique set"
// (owner requirement), on the REAL page over the REAL bank.
//
// Each test mounts the page the way the student arrives (the hub's preset chooser, a Topic Hub concept
// card, a Mistake Intelligence targeted link) and reads the set the page DISPLAYS (every rendered card's
// `data-question-id`), after the build has SETTLED (a preset click paints the previous pool for one
// frame before its own build lands; reading that frame measures the wrong set).
//
// RED on trunk cd05b95a (measured with this file):
//   · re-entry without answering → the IDENTICAL Board-mix set every time (8/8 overlap, Defect A);
//   · re-entry after answering → from the 3rd set the same ANSWERED Real Numbers rows (Z3-RN-001,
//     Z3-RN-006, RNSD-003) come back while unseen rows of their sections remain (Defect B);
//   · "Edit filters" → "Build new set" with no change → the identical set (Defect C);
//   · Topic Hub "HCF × LCM = product" → the same rows on every arrival;
//   · there is no honest line for a set of repeats.
// Signed out (useAuth → null): the served history lives on the device only — the honest default.
// CLOCK: Date is faked (the page's session identity and the served times read it) and advanced one
// minute per arrival; timers stay real. No Math.random in the code under test (CLAUDE.md §7).

import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const trace = vi.hoisted(() => ({
  attempts: [] as Array<{ questionId: string; topicKey: string; topicName?: string; timestamp: number }>,
  weakConcepts: [] as Array<{ conceptKey: string }>,
}));

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "free" } }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => trace.attempts,
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
// Mistake Intelligence's weak concepts for the topic: none, except in the targeted-arrival test.
vi.mock("../services/adaptivePracticeEngine", async (importActual) => {
  const actual = await importActual<typeof import("../services/adaptivePracticeEngine")>();
  return { ...actual, getWrongConceptsForTopic: () => trace.weakConcepts };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, persistQuickPracticeSession: () => {} };
});

import PracticePage from "./PracticePage";
import { buildChapterServedPool, type SubjectKey } from "../components/practice/practiceQuestionBuilder";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";
import { ensureBankChapters } from "../data/bankChapters/loader";
import { inferBoardPatternFromQuestion } from "../data/practiceSetGenerator";
import { buildActionableDesktopTopicHubContent } from "../lib/desktop/topicHubContent";
import { buildDesktopConceptPracticePath } from "../lib/desktop/navigation";
import type { PracticeQuestion } from "../data/predictionDataService";

const RN: { subject: SubjectKey; slug: string } = { subject: "Maths", slug: "real-numbers" };
const LIFE: { subject: SubjectKey; slug: string } = { subject: "Science", slug: "life-processes" };

const pools = new Map<string, PracticeQuestion[]>();
const poolOf = (slug: string) => pools.get(slug) ?? [];
const sectionOf = (q: PracticeQuestion) => inferBoardPatternFromQuestion(q) ?? "";

beforeAll(async () => {
  await ensureBankChapters([practiceTopicLabel("Maths", RN.slug), practiceTopicLabel("Science", LIFE.slug)]);
  for (const c of [RN, LIFE]) {
    pools.set(c.slug, buildChapterServedPool({ subjectKey: c.subject, topicKey: practiceTopicLabel(c.subject, c.slug) }));
  }
}, 120000);

beforeEach(() => {
  window.localStorage.clear();
  trace.attempts.length = 0;
  trace.weakConcepts.length = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T06:00:00.000Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function mount(url: string) {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** The ids on screen once the build has settled. */
async function settledIds(): Promise<string[]> {
  await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 300));
  await waitFor(() => expect(screen.queryByText(/Preparing your questions/)).toBeNull(), { timeout: 60000 });
  return screen.getAllByTestId("practice-question-card").map((c) => c.getAttribute("data-question-id") ?? "");
}

/** A NEW visit (a new mount, one minute later) → Board mix → Start. */
async function arriveBoardMix(c: { subject: SubjectKey; slug: string }): Promise<string[]> {
  cleanup();
  vi.setSystemTime(new Date(Date.now() + 60_000));
  mount(`/practice/10/${c.subject.toLowerCase()}?source=practice&topic=${c.slug}`);
  fireEvent.click(await screen.findByRole("button", { name: /Board mix/i }, { timeout: 60000 }));
  fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
  return settledIds();
}

function answerAll(ids: string[], slug: string) {
  for (const id of ids) trace.attempts.push({ questionId: id, topicKey: slug, timestamp: Date.now() });
}

const overlap = (a: string[], b: string[]) => a.filter((id) => b.includes(id)).length;

describe("FRESH-SET-QP · a new Quick Practice set on every arrival", () => {
  for (const c of [RN, LIFE]) {
    it(`★ ${c.slug}: 6 re-entries WITHOUT answering → 0 overlap with any earlier set (Defect A)`, async () => {
      const sets: string[][] = [];
      for (let i = 0; i < 6; i++) {
        const ids = await arriveBoardMix(c);
        expect(ids).toHaveLength(8);
        expect(overlap(ids, sets.flat()), `set ${i + 1} repeats an earlier set: [${ids.join(", ")}]`).toBe(0);
        sets.push(ids);
      }
    }, 300000);
  }

  it("★ Real Numbers: 6 sets, every question answered → never an answered repeat while unseen rows of its section remain (Defect B)", async () => {
    const pool = poolOf(RN.slug);
    const sets: string[][] = [];
    for (let i = 0; i < 6; i++) {
      const ids = await arriveBoardMix(RN);
      const met = new Set(sets.flat());
      const answered = new Set(trace.attempts.map((a) => a.questionId));
      const bad = ids.filter((id) => {
        if (!answered.has(id)) return false;
        const q = pool.find((p) => String(p.id) === id);
        const sec = q ? sectionOf(q) : "";
        return pool.some((p) => sectionOf(p) === sec && !met.has(String(p.id)) && !ids.includes(String(p.id)));
      });
      expect(bad, `set ${i + 1}: answered repeats while unseen same-section rows remain`).toEqual([]);
      expect(overlap(ids, sets.flat())).toBe(0);
      sets.push(ids);
      answerAll(ids, RN.slug);
    }
    // The three rows that came back in every set from the 3rd on (trunk) are served at most once.
    for (const id of ["Z3-RN-001", "Z3-RN-006", "RNSD-003"]) {
      expect(sets.flat().filter((x) => x === id).length, id).toBeLessThanOrEqual(1);
    }
  }, 300000);

  it("★ same visit: Board mix → Back to quick practice → Board mix again → a different set", async () => {
    const first = await arriveBoardMix(RN);
    fireEvent.click(screen.getByRole("button", { name: /Back to quick practice/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Board mix/i }, { timeout: 60000 }));
    fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
    const second = await settledIds();
    expect(second).toHaveLength(8);
    expect(overlap(second, first)).toBe(0);
  }, 180000);

  it("★ Defect C: Edit filters → Build new set with NO change → a different set", async () => {
    const first = await arriveBoardMix(LIFE);
    fireEvent.click(screen.getByRole("button", { name: /Edit filters/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Build new set/i }, { timeout: 60000 }));
    const second = await settledIds();
    expect(second).toHaveLength(8);
    expect(overlap(second, first)).toBe(0);
  }, 180000);

  it("CONTROL (already working, kept): Refresh set → 0 overlap", async () => {
    const first = await arriveBoardMix(RN);
    fireEvent.click(screen.getByRole("button", { name: /^Refresh set$/i }));
    const second = await settledIds();
    expect(second).toHaveLength(8);
    expect(overlap(second, first)).toBe(0);
  }, 180000);
});

describe("FRESH-SET-QP · a Topic Hub concept link (no exact id list) rotates", () => {
  it("★ 'HCF × LCM = product': 4 arrivals, answering each set → no question repeats", async () => {
    const card = (buildActionableDesktopTopicHubContent(RN.slug)?.boardEssentials ?? []).find((c) =>
      c.name.startsWith("HCF × LCM"),
    );
    expect(card, "the Topic Hub card").toBeTruthy();
    const url =
      buildDesktopConceptPracticePath({
        subject: "Maths",
        topic: RN.slug,
        focus: card!.name,
        subtopicHint: card!.oneLineUse || card!.name,
        markBand: card!.marks,
      }) + "&source=topicHub";
    expect(url).not.toContain("focusBankIds");
    const sets: string[][] = [];
    for (let i = 0; i < 4; i++) {
      cleanup();
      vi.setSystemTime(new Date(Date.now() + 60_000));
      mount(url);
      const ids = await settledIds();
      expect(ids.length).toBeGreaterThan(0);
      expect(overlap(ids, sets.flat()), `arrival ${i + 1}: [${ids.join(", ")}]`).toBe(0);
      sets.push(ids);
      answerAll(ids, RN.slug);
    }
  }, 300000);
});

describe("FRESH-SET-QP · honest when the pool is exhausted", () => {
  it("★ every Real Numbers question already answered → the set says so", async () => {
    let t = Date.now() - 86_400_000;
    for (const q of poolOf(RN.slug)) trace.attempts.push({ questionId: String(q.id), topicKey: RN.slug, timestamp: t++ });
    const ids = await arriveBoardMix(RN);
    expect(ids).toHaveLength(8);
    const note = await screen.findByTestId("qp-repeats-note");
    expect(note.textContent).toBe("You've seen every question here — some repeats are mixed in.");
  }, 180000);

  it("CONTROL: a student with no history sees no repeats line", async () => {
    await arriveBoardMix(RN);
    expect(screen.queryByTestId("qp-repeats-note")).toBeNull();
  }, 180000);
});

describe("FRESH-SET-QP · Mistake Intelligence targeted arrivals still auto-serve the weak topic", () => {
  it("★ targeted=1 on Real Numbers with a weak concept: served without a tap, holds the weak concept, and the next arrival is new", async () => {
    const pool = poolOf(RN.slug);
    // The weak concept: the subtopic with the most Real Numbers rows (MI keys on the row's subtopic).
    const counts = new Map<string, number>();
    for (const q of pool) counts.set(String(q.subtopic ?? ""), (counts.get(String(q.subtopic ?? "")) ?? 0) + 1);
    const weak = [...counts.entries()].filter(([k]) => k).sort((a, b) => b[1] - a[1])[0][0];
    trace.weakConcepts.push({ conceptKey: weak });
    const isWeak = (id: string) => String(pool.find((q) => String(q.id) === id)?.subtopic ?? "") === weak;
    const url = `/practice/10/maths?topic=${RN.slug}&targeted=1&targetMistakeType=conceptual`;

    const sets: string[][] = [];
    for (let i = 0; i < 2; i++) {
      cleanup();
      vi.setSystemTime(new Date(Date.now() + 60_000));
      mount(url);
      const ids = await settledIds();
      // No preset chooser: the set is served on arrival.
      expect(screen.queryByRole("button", { name: /Start practising/i })).toBeNull();
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.some(isWeak), `arrival ${i + 1} holds the weak concept '${weak}'`).toBe(true);
      expect(ids.every((id) => pool.some((q) => String(q.id) === id)), "only this chapter's bank rows").toBe(true);
      expect(overlap(ids, sets.flat())).toBe(0);
      sets.push(ids);
    }
  }, 240000);
});
