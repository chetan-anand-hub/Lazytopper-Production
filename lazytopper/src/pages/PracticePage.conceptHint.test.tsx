// QP-CONCEPT-1 — a concept entry serves the concept, on the REAL page with the REAL engine.
//
// The Tutor's "Practise this", HPQ's "More like this" and a Topic Hub card without `conceptKeys` land on
// Quick Practice with the concept in `focus` / `subtopicHint`. On trunk the hint only reordered the
// engine's count-sized draw, so the concept was served only where the draw happened to hold it (live,
// 23 Oct, signed in: the Real Numbers "Irrationality of √2, √3, √5" card served 10 HCF / prime-factor
// questions, 0 irrationality proofs).
//
// Each test mounts the page at the URL the surface really builds and reads the set the page DISPLAYS
// through its own "copy a shareable link to this exact question set" control (the displayed ids, in
// order). RED on trunk 6fe85765: the three surface tests fail (on-concept short of the count).
// The default board set is pinned by PracticePage.strictFocusExact.test.tsx's CONTROL (unchanged here).

import { describe, it, expect, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: false, status: { tier: "free" } }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/adaptivePracticeEngine", () => ({
  computeAdaptiveDifficultyMix: () => undefined,
  getWrongConceptsForTopic: () => [],
}));
vi.mock("../services/guidedJourneyService", () => ({ recordDetour: () => {} }));
vi.mock("../services/practiceInsights", () => ({
  getAttempts: () => [],
  getAttemptsFromCloud: async () => [],
  recordAttempt: () => {},
}));

import PracticePage from "./PracticePage";
import { ensureBankChapters } from "../data/bankChapters/loader";
import { buildChapterServedPool } from "../components/practice/practiceQuestionBuilder";
import { practiceTopicLabel } from "../components/practice/cbqAvailability";
import { conceptForSubtopic } from "../data/concepts/conceptLabelMap";
import { buildQuickPracticeRoundTripHref } from "./tutor/tutorRoundTrip";

const FIXED_NOW = new Date("2026-10-23T00:00:00Z");
let copied: string[] = [];

// Every served row (bank + predicted rows) of the three chapters: id -> subtopic, marks.
const rows = new Map<string, { subtopic: string; marks: number }>();
const conceptOf = (slug: string, id: string) => conceptForSubtopic(slug, (rows.get(id)?.subtopic ?? "").trim());

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

/** The ids the page DISPLAYS, in order (via its own copy-link control). */
async function displayedIds(): Promise<string[]> {
  const before = copied.length;
  const copy = await screen.findByTitle("Copy a shareable link to this exact question set", undefined, { timeout: 60000 });
  fireEvent.click(copy);
  await waitFor(() => expect(copied.length).toBeGreaterThan(before));
  const link = new URL(copied[copied.length - 1]);
  return (link.searchParams.get("focusBankIds") ?? "").split(",").filter(Boolean);
}

beforeAll(async () => {
  await ensureBankChapters(["real-numbers", "trigonometry", "arithmetic-progression", "life-processes"]);
  for (const slug of ["real-numbers", "trigonometry", "arithmetic-progression"]) {
    for (const q of buildChapterServedPool({ subjectKey: "Maths", topicKey: practiceTopicLabel("Maths", slug) })) {
      rows.set(String(q.id), { subtopic: String(q.subtopic ?? ""), marks: Number(q.marks) });
    }
  }
}, 120000);
beforeEach(() => {
  window.localStorage.clear();
  copied = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FIXED_NOW);
  let seed = 20261023;
  vi.spyOn(Math, "random").mockImplementation(() => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648));
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (s: string) => { copied.push(s); } },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("QP-CONCEPT-1 · a concept entry serves the concept on the real page", () => {
  it("★ Topic Hub card (the live URL): 10 irrationality proofs, all 2–3 marks", async () => {
    mount(
      "/practice/10/Maths?topic=real-numbers&focus=Irrationality+of+%E2%88%9A2%2C+%E2%88%9A3%2C+%E2%88%9A5+by+contradiction" +
        "&subtopicHint=Prove+a+surd+is+irrational+using+the+coprime+assumption+and+FTA.&marksMin=2&marksMax=3&source=topicHub",
    );
    const ids = await displayedIds();
    expect(ids).toHaveLength(10);
    expect(ids.filter((id) => conceptOf("real-numbers", id) !== "Irrationality Proofs"), "off-concept rows").toEqual([]);
    for (const id of ids) {
      const m = rows.get(id)?.marks ?? NaN;
      expect(m >= 2 && m <= 3, `${id} marks ${m}`).toBe(true);
    }
  }, 120000);

  it("★ Tutor 'Practise this' (Trig Identities/Proofs, count 3): all 3 on the concept; Refresh keeps it", async () => {
    mount(
      buildQuickPracticeRoundTripHref({
        returnTo: "/tutor/10/maths/trigonometry",
        subject: "maths",
        topicKey: "trigonometry",
        concept: "Trig Identities/Proofs",
        count: 3,
      }),
    );
    const first = await displayedIds();
    expect(first).toHaveLength(3);
    expect(first.filter((id) => conceptOf("trigonometry", id) !== "Trig Identities/Proofs")).toEqual([]);

    fireEvent.click(screen.getByRole("button", { name: /^Refresh set$/i }));
    await waitFor(async () => {
      const next = await displayedIds();
      expect(next).not.toEqual(first);
    }, { timeout: 60000 });
    const next = await displayedIds();
    expect(next).toHaveLength(3);
    expect(next.filter((id) => conceptOf("trigonometry", id) !== "Trig Identities/Proofs")).toEqual([]);
  }, 180000);

  it("★ HPQ 'More like this' (AP · 'Sum of n terms', count 10): all 10 on 'Sum of n Terms'; no focusBankIds sent", async () => {
    const p = new URLSearchParams({ topic: "Arithmetic Progressions", subtopicHint: "Sum of n terms", count: "10" });
    mount(`/practice/10/Maths?${p}`);
    const ids = await displayedIds();
    expect(ids).toHaveLength(10);
    expect(ids.filter((id) => conceptOf("arithmetic-progression", id) !== "Sum of n Terms")).toEqual([]);
  }, 120000);
});

describe("QP-CONCEPT-2 (F2) · a short concept set says so instead of padding silently", () => {
  it("★ Tutor 'Practise this' (Excretion in Plants, count 10): the honest note follows the on-concept rows", async () => {
    mount(
      buildQuickPracticeRoundTripHref({
        returnTo: "/tutor/10/science/life-processes",
        subject: "science",
        topicKey: "life-processes",
        concept: "Excretion in Plants",
        count: 10,
      }),
    );
    const ids = await displayedIds();
    expect(ids).toHaveLength(10);
    const note = await screen.findByTestId("qp-concept-end", undefined, { timeout: 60000 });
    expect(note.textContent).toBe(
      "That's every question we have on Excretion in Plants for now — the rest are from the same chapter.",
    );
  }, 120000);
});