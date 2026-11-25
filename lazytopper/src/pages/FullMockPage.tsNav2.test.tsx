// TS-NAV-2 (owner, 25 Nov 2026) — ONE name per paper on the Full Mock page.
//   - a series paper `?paper=2` is titled "Maths · Full-Length Test 2" (eyebrow "Test Series · Maths"), not the student's personal
//     attempt count "Maths · Mock #3"; the record it saves carries that same name (the FM code is unchanged);
//   - a non-series mock keeps "Maths · Mock #N";
//   - "Your mocks · 2 · 1 awaiting" has a separator between the count and the awaiting pill;
//   - kill switch VITE_TS_NAV2_DISABLED restores the personal name, the old eyebrow and no separator.
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PersistedWorksheet } from "../services/worksheetSessionStore";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "student-1", isLocalSession: false, email: "s@x.com" }, loading: false }),
}));
vi.mock("../hooks/useSubscription", () => ({
  useSubscription: () => ({
    tier: "premium", isPremium: true, isTrialActive: false, isTrialExpired: false, daysLeftInTrial: 0,
    status: { tier: "premium", plan: "pass_till_boards" }, hydrated: true, startTrial: () => {}, upgradeToPremium: () => {},
  }),
}));
vi.mock("../services/firebaseClient", () => ({ firestoreDb: null }));
vi.mock("../services/uxTelemetry", () => ({ trackUxEvent: () => {} }));
vi.mock("../services/packs", async (orig) => {
  const actual = await orig<typeof import("../services/packs")>();
  return { ...actual, fetchMyPacks: async () => ({ packs: [], licensee: { name: "", email: "" }, boardPassCredit: null }) };
});
vi.mock("../components/usage/useFairUse", () => ({
  useFairUse: () => ({
    limit: null, clearLimit: () => {}, noteGraded: () => {}, handleRefusal: async () => false,
    blockPaperStart: () => false, planGrade: () => ({ action: "go" }), showLimit: () => {},
  }),
}));
const records = vi.hoisted(() => ({ list: [] as unknown[] }));
vi.mock("../services/sessionRecords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/sessionRecords")>();
  return { ...actual, getSessionRecordsFromCloud: async () => records.list, getSessionPerQuestion: async () => null };
});
const writes = vi.hoisted(() => ({ calls: [] as Array<{ paper: PersistedWorksheet; code: string }> }));
vi.mock("../services/fullMockGradeService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/fullMockGradeService")>();
  return {
    ...actual,
    writeFullMockPartialRecord: vi.fn(async (args: { paper: PersistedWorksheet; code: string }) => {
      writes.calls.push(args);
      return args.code;
    }),
  };
});

import FullMockPage from "./FullMockPage";
import { buildFullMockSessionRecord } from "../services/sessionRecords";
import { resetTestSeriesOwnershipForTests } from "../components/testSeries/testSeriesOwnership";
import { resetOwnedPacksCache } from "../components/packs/useOwnedPacks";

function mount(entry: string) {
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/full-mock/:grade/:subject" element={<FullMockPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Two earlier Maths mocks, one of them awaiting its answer sheet -> the next personal number is #3. */
const TWO_MOCKS = [
  { id: "FM-M-01", surface: "full-mock", subject: "maths", status: "graded", title: "Maths · Mock #1", gradedAt: Date.parse("2026-11-20T10:00:00+05:30"), worksheetId: "fm-a", marksAwarded: 40, marksTotal: 80 },
  { id: "FM-M-02", surface: "full-mock", subject: "maths", status: "partial", title: "Maths · Mock #2", gradedAt: Date.parse("2026-11-21T10:00:00+05:30"), worksheetId: "fm-b", marksAwarded: 10, marksTotal: 20 },
];

const title = async () => {
  const h1 = await screen.findByTestId("fm-title", {}, { timeout: 60000 });
  await waitFor(() => expect(h1.textContent).not.toBe("Maths · Mock"), { timeout: 60000 });
  return h1;
};

async function sitAndSubmit() {
  fireEvent.click(await screen.findByRole("button", { name: /Start the mock/ }, { timeout: 60000 }));
  await waitFor(() => expect(document.querySelector(".lt-ct__exit")).not.toBeNull());
  fireEvent.click(screen.getAllByRole("button", { name: /Submit & exit →/ })[0]);
  fireEvent.click(await screen.findByRole("button", { name: /Submit now →/ }));
  await waitFor(() => expect(writes.calls.length).toBe(1), { timeout: 30000 });
  return writes.calls[0];
}

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  records.list = [...TWO_MOCKS];
  writes.calls = [];
  resetTestSeriesOwnershipForTests();
  resetOwnedPacksCache();
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ enforced: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("TS-NAV-2 · one name per paper on the Full Mock page", () => {
  it("series paper 2: h1 'Maths · Full-Length Test 2', eyebrow 'Test Series · Maths'; the NEW record carries that name, code unchanged", async () => {
    mount("/full-mock/10/Maths?paper=2");
    const h1 = await title();
    await waitFor(() => expect(h1.textContent).toBe("Maths · Full-Length Test 2"), { timeout: 60000 });
    expect(screen.getByTestId("fm-series-label").textContent).toBe("Test Series · Maths");
    expect(document.body.textContent).not.toContain("Mock #3");
    const call = await sitAndSubmit();
    expect(call.code).toBe("FM-M-03");
    expect(call.paper.name).toBe("Maths · Full-Length Test 2");
    const rec = buildFullMockSessionRecord({ paper: call.paper, code: call.code, subject: "maths", response: { ok: true, results: [] } as never, uid: "student-1" });
    expect(rec.title).toBe("Maths · Full-Length Test 2");
    expect(rec.id).toBe("FM-M-03");
  }, 300000);

  it("a non-series mock is unchanged: 'Maths · Mock #3' on the page and on the record", async () => {
    mount("/full-mock/10/Maths");
    const h1 = await title();
    await waitFor(() => expect(h1.textContent).toBe("Maths · Mock #3"), { timeout: 60000 });
    expect(screen.queryByTestId("fm-series-label")).toBeNull();
    const call = await sitAndSubmit();
    expect(call.paper.name).toBe("Maths · Mock #3");
  }, 300000);

  it("'Your mocks · 2 · 1 awaiting': a separator between the count and the awaiting pill", async () => {
    mount("/full-mock/10/Maths?paper=2");
    await title();
    const sep = await screen.findByTestId("fm-hctl-sep", {}, { timeout: 60000 });
    const btn = sep.closest("button")!;
    expect((btn.textContent ?? "").replace(/\s+/g, " ")).toContain("· 2 · 1 awaiting");
  }, 300000);

  it("kill switch VITE_TS_NAV2_DISABLED: the personal name, the old eyebrow, no separator", async () => {
    vi.stubEnv("VITE_TS_NAV2_DISABLED", "1");
    mount("/full-mock/10/Maths?paper=2");
    const h1 = await title();
    await waitFor(() => expect(h1.textContent).toBe("Maths · Mock #3"), { timeout: 60000 });
    expect(screen.getByTestId("fm-series-label").textContent).toContain("Test Series · Full-Length Test 2 of ");
    expect(screen.queryByTestId("fm-hctl-sep")).toBeNull();
    const call = await sitAndSubmit();
    expect(call.paper.name).toBe("Maths · Mock #3");
  }, 300000);
});
