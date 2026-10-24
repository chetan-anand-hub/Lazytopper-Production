// TUTOR-Q-1 (B) — "Ask the tutor" then BACK returns to the SAME Quick Practice set, on the REAL page over the
// REAL bank (the same harness as PracticePage.freshSetQp.test.tsx).
//
// Without this lane a Quick Practice set is drawn fresh on every mount, so the tutor's back arrow (or the
// browser's) landed the student on different questions with their answers gone. Here the student builds a
// Board mix, picks two MCQ answers, opens the steps on one, taps "Ask the tutor about this concept", and
// comes back both ways:
//   · the displayed ids are the SAME and in the SAME order; both picks and the open steps are back; the
//     question they asked about is scrolled into view;
//   · NOTHING is recorded as served again (recordServed spy), and the snapshot is taken ONCE (a later visit
//     is a fresh draw);
//   · an expired snapshot, and one for another URL, are ignored and removed — the visit is a normal fresh one;
//   · a normal visit with no snapshot still gets a fresh set (CONTROL).
// CLOCK: Date is faked and advanced a minute per arrival; timers stay real. No Math.random in the code under test.

import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

const auth = vi.hoisted(() => ({ user: null as null | { uid: string; isLocalSession: boolean; email: string } }));
const STEP_TEXT = "Restored step: use Euclid's division lemma.";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: auth.user, loading: false, getToken: async () => "tok" }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "free" } }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => "recorded",
}));
vi.mock("../services/adaptivePracticeEngine", async (importActual) => {
  const actual = await importActual<typeof import("../services/adaptivePracticeEngine")>();
  return { ...actual, getWrongConceptsForTopic: () => [] };
});
vi.mock("../services/quickPracticeSessionService", async (importActual) => {
  const actual = await importActual<typeof import("../services/quickPracticeSessionService")>();
  return { ...actual, persistQuickPracticeSession: () => {} };
});
// The step solution is fetched once, on the tap that opens the steps; a restore must NOT fetch it again.
vi.mock("../ai/aiClient", async (importActual) => {
  const actual = await importActual<typeof import("../ai/aiClient")>();
  return {
    ...actual,
    fetchStepSolution: vi.fn(async () => ({
      totalMarks: 1,
      steps: [{ stepNumber: 1, description: "Restored step: use Euclid's division lemma.", working: "a = bq + r", marks: 1 }],
    })),
  };
});
vi.mock("../lib/practice/servedHistory", async (importActual) => {
  const actual = await importActual<typeof import("../lib/practice/servedHistory")>();
  return { ...actual, recordServed: vi.fn(actual.recordServed) };
});

import PracticePage from "./PracticePage";
import { fetchStepSolution } from "../ai/aiClient";
import { recordServed } from "../lib/practice/servedHistory";
import { PRACTICE_RETURN_KEY, PRACTICE_RETURN_TTL_MS } from "../lib/practice/practiceReturnSnapshot";
import { PRACTICE_ASK_KEY } from "./tutor/practiceTutorAsk";
import { ensureBankChapters } from "../data/bankChapters/loader";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";

const SLUG = "real-numbers";
const START = `/practice/10/maths?source=practice&topic=${SLUG}`;
const scrolled: string[] = [];

beforeAll(async () => {
  await ensureBankChapters([practiceTopicLabel("Maths", SLUG)]);
}, 120000);

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  auth.user = null;
  scrolled.length = 0;
  vi.mocked(recordServed).mockClear();
  vi.mocked(fetchStepSolution).mockClear();
  Element.prototype.scrollIntoView = function scrollIntoView(this: Element) {
    scrolled.push(this.getAttribute("data-question-id") ?? "");
  };
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-24T06:00:00.000Z"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function TutorStub() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  return (
    <div data-testid="tutor-stub" data-q={sp.get("q") ?? ""} data-source={sp.get("source") ?? ""}>
      <Link to={sp.get("returnTo") ?? "/"}>tutor back arrow</Link>
      <button type="button" onClick={() => navigate(-1)}>browser back</button>
    </div>
  );
}

function mount(url: string) {
  setMatchMediaMatches(true);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="/tutor/:grade/:subject/:topicKey" element={<TutorStub />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function settledCards(): Promise<HTMLElement[]> {
  await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 300));
  await waitFor(() => expect(screen.queryByText(/Preparing your questions/)).toBeNull(), { timeout: 60000 });
  return screen.getAllByTestId("practice-question-card");
}
const idsOf = (cards: HTMLElement[]) => cards.map((c) => c.getAttribute("data-question-id") ?? "");

/** A new arrival from the hub chooser: Board mix -> Start. Returns the displayed cards. */
async function arriveBoardMix(): Promise<HTMLElement[]> {
  cleanup();
  vi.setSystemTime(new Date(Date.now() + 60_000));
  mount(START);
  fireEvent.click(await screen.findByRole("button", { name: /Board mix/i }, { timeout: 60000 }));
  fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
  return settledCards();
}

/** Picks option `oi` on the first `n` MCQ cards; returns { id -> picked option index }. */
function pickOnMcqCards(cards: HTMLElement[], picks: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  let used = 0;
  for (const card of cards) {
    if (used >= picks.length) break;
    const options = card.querySelectorAll<HTMLButtonElement>("button[aria-pressed]");
    if (options.length < 2) continue;
    fireEvent.click(options[picks[used]]);
    out[card.getAttribute("data-question-id") ?? ""] = picks[used];
    used += 1;
  }
  expect(used, "the Board mix holds at least two MCQs").toBe(picks.length);
  return out;
}

/** Build a set, answer two MCQs, open the steps on the first, ask the tutor about it. */
async function askFromAFreshSet() {
  const cards = await arriveBoardMix();
  const savedIds = idsOf(cards);
  const picks = pickOnMcqCards(cards, [0, 1]);
  const askedId = Object.keys(picks)[0];
  const askedCard = cards.find((c) => c.getAttribute("data-question-id") === askedId)!;
  fireEvent.click(within(askedCard).getByTestId("practice-mentor-cta"));
  await within(askedCard).findByText(STEP_TEXT, undefined, { timeout: 20000 });
  fireEvent.click(within(askedCard).getByText(/Ask the tutor about this concept/));
  await screen.findByTestId("tutor-stub");
  return { savedIds, picks, askedId };
}

function expectRestored(cards: HTMLElement[], s: { savedIds: string[]; picks: Record<string, number>; askedId: string }) {
  expect(idsOf(cards)).toEqual(s.savedIds); // same ids, same order
  for (const [id, oi] of Object.entries(s.picks)) {
    const card = cards.find((c) => c.getAttribute("data-question-id") === id)!;
    const opts = card.querySelectorAll<HTMLButtonElement>("button[aria-pressed]");
    expect(opts[oi].getAttribute("aria-pressed"), `pick ${oi} on ${id}`).toBe("true");
  }
  const asked = cards.find((c) => c.getAttribute("data-question-id") === s.askedId)!;
  expect(within(asked).getByText(STEP_TEXT)).toBeTruthy();
  expect(within(asked).getByText("Hide steps")).toBeTruthy();
}

describe("TUTOR-Q-1 · Ask the tutor, then back, returns to the SAME set", () => {
  it("★★ the tutor URL carries the question id and the one-shot names its number, pick and verdict", async () => {
    const { askedId, savedIds, picks } = await askFromAFreshSet();
    const stub = screen.getByTestId("tutor-stub");
    expect(stub.getAttribute("data-q")).toBe(askedId);
    expect(stub.getAttribute("data-source")).toBe("practice");
    const ask = JSON.parse(sessionStorage.getItem(PRACTICE_ASK_KEY)!);
    expect(ask.q).toBe(askedId);
    expect(ask.qNumber).toBe(savedIds.indexOf(askedId) + 1);
    expect(typeof ask.pick).toBe("string");
    expect(typeof ask.correct).toBe("boolean");
    expect(Object.keys(ask).sort()).toEqual(["at", "correct", "pick", "q", "qNumber"]);
    expect(picks[askedId]).toBe(0);
  }, 300000);

  it("★★ the tutor's back arrow: same ids in the same order, picks and open steps back, question scrolled to, nothing re-recorded", async () => {
    const s = await askFromAFreshSet();
    vi.mocked(recordServed).mockClear();
    vi.mocked(fetchStepSolution).mockClear();
    fireEvent.click(screen.getByText("tutor back arrow"));
    const cards = await settledCards();
    expectRestored(cards, s);
    await waitFor(() => expect(scrolled).toContain(s.askedId));
    // A restore is not a new set: no served record, no second fetch of the step solution.
    expect(recordServed).not.toHaveBeenCalled();
    expect(fetchStepSolution).not.toHaveBeenCalled();
    // Taken once: the snapshot is gone.
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
  }, 300000);

  it("★★ the browser back button lands on the same URL and restores the same set", async () => {
    const s = await askFromAFreshSet();
    vi.mocked(recordServed).mockClear();
    fireEvent.click(screen.getByText("browser back"));
    const cards = await settledCards();
    expectRestored(cards, s);
    expect(recordServed).not.toHaveBeenCalled();
  }, 300000);

  it("★ taken ONCE: the next visit to that URL is a normal fresh set", async () => {
    const s = await askFromAFreshSet();
    fireEvent.click(screen.getByText("tutor back arrow"));
    await settledCards();
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
    const url = s.savedIds.length ? START : START;
    cleanup();
    vi.setSystemTime(new Date(Date.now() + 60_000));
    mount(url);
    fireEvent.click(await screen.findByRole("button", { name: /Board mix/i }, { timeout: 60000 }));
    fireEvent.click(screen.getByRole("button", { name: /Start practising/i }));
    const next = idsOf(await settledCards());
    expect(next.filter((id) => s.savedIds.includes(id))).toEqual([]);
  }, 300000);

  it("★★ an EXPIRED snapshot is ignored and removed: the visit is a normal fresh one", async () => {
    const s = await askFromAFreshSet();
    const raw = JSON.parse(sessionStorage.getItem(PRACTICE_RETURN_KEY)!);
    vi.setSystemTime(new Date(raw.at + PRACTICE_RETURN_TTL_MS + 1000));
    vi.mocked(recordServed).mockClear();
    fireEvent.click(screen.getByText("tutor back arrow"));
    // The chooser, not a restored set: an expired snapshot opens nothing built.
    await screen.findByRole("button", { name: /Board mix/i }, { timeout: 60000 });
    expect(screen.queryAllByTestId("practice-question-card")).toHaveLength(0);
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
    expect(s.savedIds.length).toBeGreaterThan(0);
  }, 300000);

  it("★★ a snapshot for ANOTHER URL is ignored and removed", async () => {
    await askFromAFreshSet();
    cleanup();
    mount(`/practice/10/maths?source=practice&topic=triangles`);
    await screen.findByRole("button", { name: /Board mix/i }, { timeout: 60000 });
    expect(screen.queryAllByTestId("practice-question-card")).toHaveLength(0);
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
  }, 300000);

  it("★ CONTROL: with no snapshot, a normal visit is built fresh and IS recorded as served", async () => {
    const cards = await arriveBoardMix();
    expect(cards.length).toBeGreaterThan(0);
    await waitFor(() => expect(recordServed).toHaveBeenCalled());
    expect(sessionStorage.getItem(PRACTICE_RETURN_KEY)).toBeNull();
  }, 300000);
});
