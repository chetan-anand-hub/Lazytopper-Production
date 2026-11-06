// SPEED-HUB-2 review (#1592 HOLD, defect 1) — an arrival serves ONE set. The URL / filter
// clean-ups that run once the chapter is ready (the dropped-filter clean-up, the `built=1`
// strip) must land BEFORE the build commits, so the student never sees one set swapped for
// another and `recordServed` (device + cloud no-repeat history) is written exactly once, with
// one id set. Every case runs on a COLD chapter (fresh module graph: no scoring memo, no
// warm-up done) at phone and desktop width — the condition the CBQ chapter tap hits.
//
// The magnetic-effects `style=proof` link: on TRUNK (0d46ad3e) its dropped-filter clean-up
// re-records the SAME ten ids once more, in a new order (2 calls, one id set — measured in this
// test against trunk's PracticePage, and in Chromium as two identical device writes). That is
// pre-existing and does not grow the no-repeat history; what this lane must not do is serve a
// DIFFERENT set, so that case asserts one id set and at most trunk's two calls.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { setMatchMediaMatches } from "../test/setup";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { uid: "student-1", isLocalSession: false, email: "s@x.com" },
    loading: false,
    getToken: async () => "tok",
  }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({ isPremium: true, status: { tier: "premium" }, loading: false }),
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
vi.mock("../lib/practice/servedHistory", async (importActual) => {
  const actual = await importActual<typeof import("../lib/practice/servedHistory")>();
  return { ...actual, recordServed: vi.fn(actual.recordServed) };
});

afterEach(() => {
  cleanup();
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom storage unavailable */
  }
});

const URLS = [
  "/practice/10/Science?topic=electricity&preset=comp&built=1",
  "/practice/10/Maths?topic=triangles&preset=comp&built=1",
  "/practice/10/Science?topic=magnetic-effects-of-electric-current&count=10&style=proof",
] as const;

async function arrive(url: string, desktop: boolean) {
  vi.resetModules();
  const { default: PracticePage } = await import("./PracticePage");
  const { recordServed } = await import("../lib/practice/servedHistory");
  vi.mocked(recordServed).mockClear();
  setMatchMediaMatches(desktop);
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/practice/:grade/:subject" element={<PracticePage />} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findAllByTestId("practice-question-card", {}, { timeout: 60000 });
  await waitFor(() => expect(vi.mocked(recordServed).mock.calls.length).toBeGreaterThan(0), { timeout: 10000 });
  // Give any second build (a clean-up landing after the first set) time to commit.
  await new Promise((r) => setTimeout(r, 2500));
  return vi.mocked(recordServed).mock.calls.map((c) => c[0].ids.map(String));
}

describe("SPEED-HUB-2 — one arrival, one served set (cold chapter)", () => {
  for (const url of URLS) {
    for (const desktop of [false, true]) {
      it(`${desktop ? "desktop" : "360 px"} · ${url}`, async () => {
        const writes = await arrive(url, desktop);
        const shown = screen.getAllByTestId("practice-question-card").length;
        const sets = new Set(writes.map((ids) => [...ids].sort().join("|")));
        expect(sets.size, JSON.stringify(writes)).toBe(1);
        expect(writes[0].length).toBe(shown);
        expect(new Set(writes[0]).size).toBe(writes[0].length);
        if (url.includes("style=proof")) expect(writes.length).toBeLessThanOrEqual(2);
        else expect(writes, JSON.stringify(writes)).toHaveLength(1);
      }, 120_000);
    }
  }
});
