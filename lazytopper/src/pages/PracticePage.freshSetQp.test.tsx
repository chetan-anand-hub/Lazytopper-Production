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

const cloud = vi.hoisted(() => ({
  enabled: false,
  readDelayMs: 0,
  docs: new Map<string, unknown>(),
}));
const auth = vi.hoisted(() => ({
  user: null as null | { uid: string; isLocalSession: boolean; email: string },
}));

const trace = vi.hoisted(() => ({
  attempts: [] as Array<{ questionId: string; topicKey: string; topicName?: string; timestamp: number }>,
  weakConcepts: [] as Array<{ conceptKey: string }>,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: false, getToken: async () => "tok" }),
}));
// The cloud: only the served-history docs are real; every other Firestore read is empty.
vi.mock("../services/firestoreSdk", () => {
  const fs: Record<string, unknown> = new Proxy(
    {
      doc: (_db: unknown, ...path: string[]) => path.join("/"),
      getDoc: async (path: string) => {
        await new Promise((r) => setTimeout(r, cloud.readDelayMs));
        return { exists: () => cloud.docs.has(path), data: () => cloud.docs.get(path), id: path };
      },
      setDoc: async (path: string, data: unknown) => {
        cloud.docs.set(path, data);
      },
      runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          get: async (path: string) => {
            await new Promise((r) => setTimeout(r, cloud.readDelayMs));
            return { exists: () => cloud.docs.has(path), data: () => cloud.docs.get(path), id: path };
          },
          set: (path: string, data: unknown) => {
            cloud.docs.set(path, data);
          },
        }),
      getDocs: async () => ({ docs: [], empty: true, size: 0, forEach: () => {} }),
      onSnapshot: () => () => {},
    } as Record<string, unknown>,
    { get: (t, k: string) => (k in t ? t[k] : () => ({})) },
  );
  const handle = { db: {}, fs };
  return {
    isFirestoreEnabled: () => cloud.enabled,
    withFirestore: async (use: (h: unknown) => unknown) => use(handle),
    getFirestore: async () => handle,
    __setFirestoreSdkLoaderForTests: () => {},
  };
});
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
  auth.user = null;
  cloud.enabled = false;
  cloud.readDelayMs = 0;
  cloud.docs.clear();
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

  it("★ only Section E ran out → the count line, never 'seen every question' (#1330 review)", async () => {
    let t = Date.now() - 86_400_000;
    for (const q of poolOf(RN.slug).filter((p) => sectionOf(p) === "E")) {
      trace.attempts.push({ questionId: String(q.id), topicKey: RN.slug, timestamp: t++ });
    }
    const ids = await arriveBoardMix(RN);
    expect(ids).toHaveLength(8);
    const note = await screen.findByTestId("qp-repeats-note");
    expect(note.textContent).toBe("1 question repeats — the unseen ones in this section ran out.");
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

describe("FRESH-SET-QP · a COLD device of a signed-in student (#1330 review)", () => {
  it("★ cloud history + empty device: the auto-served first set avoids the cloud-served ids, and the cloud is unioned, not overwritten", async () => {
    const url = `/practice/10/maths?topic=${RN.slug}&targeted=1&targetMistakeType=conceptual`;
    // Another device served set A (recorded signed out here only to learn the set the bank draws first).
    mount(url);
    const setA = await settledIds();
    cleanup();
    window.localStorage.clear(); // a COLD device: nothing on this one
    const path = `practiceInsights/u1/servedHistory/${RN.slug}`;
    const before = Date.now() - 3_600_000;
    cloud.docs.set(path, { entries: setA.map((id, i) => ({ id, at: before + i })) });
    cloud.enabled = true;
    cloud.readDelayMs = 300; // slower than the page's own build, inside the 1.5 s bound
    auth.user = { uid: "u1", isLocalSession: false, email: "s@x.com" };

    vi.setSystemTime(new Date(Date.now() + 60_000));
    mount(url); // AUTO-SERVED: no tap, the draw starts at mount
    const setB = await settledIds();
    expect(setB.length).toBeGreaterThan(0);
    expect(overlap(setB, setA), `first set on the cold device repeats the cloud's: [${setB.join(", ")}]`).toBe(0);

    await waitFor(() => {
      const stored = ((cloud.docs.get(path) as { entries?: Array<{ id: string }> })?.entries ?? []).map((e) => e.id);
      expect(stored, "the cloud history was overwritten").toEqual(expect.arrayContaining([...setA, ...setB]));
    }, { timeout: 10000 });
  }, 240000);
});

describe("FRESH-SET-QP · a WARM device never waits for the cloud (#1330 re-review)", () => {
  async function timedArrival(url: string): Promise<{ ms: number; ids: string[] }> {
    cleanup();
    vi.setSystemTime(new Date(Date.now() + 60_000));
    const t0 = performance.now();
    mount(url);
    await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
    await waitFor(() => expect(screen.queryByText(/Preparing your questions/)).toBeNull(), { timeout: 60000 });
    const ms = performance.now() - t0;
    const ids = screen.getAllByTestId("practice-question-card").map((c) => c.getAttribute("data-question-id") ?? "");
    return { ms, ids };
  }

  it("★ warm signed-in MI arrival with a 1.2 s cloud ≈ the signed-out baseline; a cold one waits", async () => {
    const url = `/practice/10/maths?topic=${RN.slug}&targeted=1&targetMistakeType=conceptual`;
    await timedArrival(url); // warm the bank chunk / module graph so both timings compare like for like
    const baseline = await timedArrival(url); // signed out: no cloud at all

    const path = `practiceInsights/u1/servedHistory/${RN.slug}`;
    cloud.enabled = true;
    cloud.readDelayMs = 1200;
    auth.user = { uid: "u1", isLocalSession: false, email: "s@x.com" };
    // WARM: this device already holds served history for the chapter.
    window.localStorage.setItem(
      `lt:qpServed:v1:u1:${RN.slug}`,
      JSON.stringify(baseline.ids.map((id, i) => ({ id, at: Date.now() - 3_600_000 + i }))),
    );
    cloud.docs.set(path, { entries: [] });
    const warm = await timedArrival(url);
    // eslint-disable-next-line no-console
    console.log(`[TIMING] signed-out ${Math.round(baseline.ms)} ms · warm signed-in (1.2 s cloud) ${Math.round(warm.ms)} ms`);
    expect(warm.ms, "a warm device waited for the cloud").toBeLessThan(baseline.ms + 700);
    expect(overlap(warm.ids, baseline.ids)).toBe(0); // and it still used its own history

    // CONTROL: a COLD device (nothing local) does wait for the cloud read (≥ ~1.2 s, ≤ the bound).
    window.localStorage.clear();
    const cold = await timedArrival(url);
    // eslint-disable-next-line no-console
    console.log(`[TIMING] cold signed-in (1.2 s cloud) ${Math.round(cold.ms)} ms`);
    expect(cold.ms).toBeGreaterThan(baseline.ms + 900);
  }, 240000);
});
